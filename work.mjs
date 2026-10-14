import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, writeFile, rename, unlink, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import * as nq from './nq.mjs';
import { STEPS, stepIndex, buildPiArgs } from './pi-runtime.mjs';
import { runPi } from './pi-call.mjs';
import { publishWork } from './observe.mjs';
import { BACKGROUND_CONTEXT as context } from '@earendil-works/chord/context';
import { createModels } from '@earendil-works/pi-ai/models';
import { Harness, createRegistry, defineDoc, defineExtension, defineTask } from '@earendil-works/pi-durable';
import { openNodeSqliteStorage } from '@earendil-works/pi-durable/storage/sqlite/node';

export { STEPS };
export const hash = text => createHash('sha256').update(text).digest('hex');
export const CAUSES = ['pre-existing', 'implementation', 'test'];
// A failed test is answered by: test → test architect (Orion), implementation → planner (Cassiopeia),
// pre-existing → a linked prerequisite thread. Undetermined → the human.
export const MAX_CORRECTIONS = 3;
const requireText = (text, name) => { if (typeof text !== 'string' || !text.trim()) throw new Error(`${name} must be nonempty`); return text; };
const Catalog = defineDoc({ kind: 'work.catalog', version: 1, scope: 'conversation', history: 'latest', fork: 'initial', initial: () => ({ threads: [] }) });
const Work = defineDoc({ kind: 'work.thread', version: 1, scope: 'conversation', history: 'rewindable', fork: 'asOf', initial: () => ({}) });
const terminal = result => ({ status: 'terminal', outcome: { status: 'completed', result } });
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };

// The store owns one SQLite file. Exactly one process owns it at a time.
export async function openStore(directory, { checkInMs = 1_800_000, resume = false } = {}) {
  directory = resolve(directory);
  await mkdir(directory, { recursive: true });
  const lockPath = join(directory, 'owner.lock');
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const { pid } = JSON.parse(await readFile(lockPath, 'utf8').catch(() => '{}'));
    if (Number.isSafeInteger(pid) && alive(pid)) throw new Error(`Store is owned by live process ${pid}`);
    await unlink(lockPath).catch(() => {}); // previous owner is dead: its pending work is redriven below
    lock = await open(lockPath, 'wx');
  }
  await lock.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  let harness;
  // One queue for every view write: each reads the newest committed state when it runs, so an older
  // snapshot can never land after a newer one.
  let views = Promise.resolve();
  const publish = id => (views = views.then(async () => {
    const w = await harness.snapshot(Work, id, context);
    if (w?.id) await publishWork(directory, w);
  }).catch(e => console.error(`view not refreshed (work is committed): ${e.message}`)));
  const event = (w, type, details = {}) => { w.events.push({ at: new Date().toISOString(), type, pid: process.pid, ...details }); };

  const Attempt = defineTask({
    name: 'work.execute', version: 1, initial: () => ({ phase: 'execute' }),
    phases: {
      // Runs once, and again after any crash: harness.resume() re-enters this phase and the
      // worker continues its own pi session. No reconciliation layer: pi-durable + pi own it.
      execute: async (task, runtime, ctx) => {
        const { workId, attemptId } = task.input;
        const saved = await harness.snapshot(Work, workId, ctx), prior = saved.attempts.find(a => a.id === attemptId);
        if (!['queued', 'running'].includes(prior.status)) return terminal({ status: prior.status });
        const resumed = prior.status === 'running';
        await runtime.commit(async tx => {
          const w = await tx.doc(Work, workId), a = w.attempts.find(a => a.id === attemptId);
          a.status = 'running'; a.startedAt ??= Date.now(); a.launches = (a.launches ?? 0) + 1;
          a.runs = [...(a.runs ?? []), { n: a.launches, startedAt: Date.now(), endedAt: null, pid: null, exit: null, record: join('attempts', attemptId, `launch-${a.launches}`) }];
          event(w, resumed ? 'redriven' : 'started', { attemptId, step: a.step });
          return { status: 'running', checkpoint: { phase: 'execute' } };
        }, ctx);
        await publish(workId);
        const channel = join(directory, 'attempts', attemptId), inbox = join(channel, 'check-in.json');
        await mkdir(channel, { recursive: true });
        const step = STEPS[stepIndex(prior.step)];
        const args = buildPiArgs({ step: prior.step, model: prior.model, progress: true,
          sessionDir: join(directory, 'sessions', attemptId), sessionId: prior.sessionId,
          system: `You are ${step.role}. ${step.duty} The input is your complete work packet. Do not delegate or change scope.` });
        const prompt = resumed
          ? 'You were interrupted mid-assignment. Continue the same assignment from where you stopped. Inspect the workspace first; do not redo finished parts.'
          : await provisionPacket(directory, attemptId, prior.packet);
        let queue = Promise.resolve(), timer;
        const checkIn = () => {
          clearTimeout(timer);
          timer = setTimeout(() => { queue = queue.then(async () => {
            const question = { id: randomUUID(), attemptId, text: 'No deliverable reported for 30 minutes. What prevents the next deliverable, and what support do you need?' };
            await runtime.commit(async tx => { const w = await tx.doc(Work, workId); w.attempts.find(a => a.id === attemptId).checkIns.push({ ...question, at: Date.now() }); event(w, 'check-in', { attemptId }); return { status: 'running', checkpoint: { phase: 'execute' } }; }, ctx);
            await writeFile(inbox + '.tmp', JSON.stringify(question)); await rename(inbox + '.tmp', inbox);
            checkIn();
          }); }, checkInMs);
          timer.unref?.();
        };
        const onLine = entry => {
          const p = entry.type === 'tool_execution_end' && entry.toolName === 'durable_progress' && !entry.isError ? entry.result?.details?.durableProgress : null;
          if (!p || p.attemptId !== attemptId) return;
          queue = queue.then(() => runtime.commit(async tx => {
            const w = await tx.doc(Work, workId);
            w.attempts.find(a => a.id === attemptId).progress.push({ deliverable: p.deliverable, evidence: p.evidence, at: Date.now() });
            event(w, 'progress', { attemptId, deliverable: p.deliverable });
            return { status: 'running', checkpoint: { phase: 'execute' } };
          }, ctx)).then(() => publish(workId));
          checkIn();
        };
        checkIn();
        let result;
        try {
          result = await runPi({ cwd: saved.cwd, args, prompt, record: join(channel, `launch-${(prior.launches ?? 0) + 1}`), onLine, signal: ctx.abortSignal,
            env: { WORK_DATA: directory, PI_DURABLE_ATTEMPT: attemptId, PI_DURABLE_CHECKIN: inbox },
            onSpawn: pid => runtime.commit(async tx => { const a = (await tx.doc(Work, workId)).attempts.find(a => a.id === attemptId); a.pid = pid; a.runs = a.runs.map((r, i) => i === a.runs.length - 1 ? { ...r, pid } : r); return { status: 'running', checkpoint: { phase: 'execute' } }; }, ctx).then(() => publish(workId)) });
        } finally { clearTimeout(timer); }
        await queue;
        await runtime.commit(async tx => {
          const w = await tx.doc(Work, workId), a = w.attempts.find(a => a.id === attemptId);
          a.endedAt = Date.now(); a.exitCode = result.code; a.output = result.summary.output;
          a.runs = a.runs.map((r, i) => i === a.runs.length - 1 ? { ...r, endedAt: a.endedAt, exit: result.signal ?? result.code, toolCalls: result.summary.toolCalls } : r);
          a.status = result.ok ? 'reported' : 'failed';
          a.error = result.ok ? '' : (result.signal ?? result.summary.error ?? result.error) || `pi exited ${result.code}`;
          event(w, a.status, { attemptId, step: a.step });
          return terminal({ status: a.status });
        }, ctx);
        await publish(workId);
      },
    },
    abort: async (task, runtime, ctx) => {
      await runtime.commit(async tx => {
        const w = await tx.doc(Work, task.input.workId), a = w.attempts.find(a => a.id === task.input.attemptId);
        if (['queued', 'running'].includes(a.status)) a.status = 'failed', a.error = 'aborted';
        return { status: 'terminal', outcome: { status: 'aborted' } };
      }, ctx);
    },
  });

  const registry = createRegistry();
  registry.install(defineExtension({ name: 'work', tasks: [Attempt] }));
  try { harness = await Harness.open(await openNodeSqliteStorage(join(directory, 'work.sqlite')), { models: createModels(), registry }, context); }
  catch (e) { await lock.close(); await unlink(lockPath); throw e; }
  const root = await harness.root(context);
  const change = async (id, fn) => {
    const result = await harness.commit(async tx => {
      const w = await tx.doc(Work, id);
      if (!w.id) throw new Error(`Unknown thread ${id}`);
      const r = await fn(w, tx);
      return r === undefined ? undefined : JSON.parse(JSON.stringify(r));
    }, context);
    await publish(id);
    return result;
  };
  const step = w => { const s = STEPS[w.position]; if (!s) throw new Error('Thread is complete'); return s; };
  const fresh = (objective, source, cwd, extra = {}) => ({ objective, source, cwd, position: 0, round: 0, briefs: {}, briefHistory: [],
    exchanges: [], attempts: [], failures: [], notes: [], hold: null, waitsOn: null, parentId: null, delivery: false, completion: null, events: [], ...extra });
  const createIn = async (tx, fields) => {
    const c = await tx.createConversation({ ownership: { kind: 'ownerless' } });
    Object.assign(await tx.doc(Work, c.id), { id: c.id, ...fields });
    (await tx.doc(Catalog, root.id)).threads.push(c.id);
    return c.id;
  };
  // Send the work back to `to` for a new round: later briefs are retired, history is kept.
  const rewind = (w, to, note) => {
    w.round++;
    for (const s of STEPS.slice(to)) if (w.briefs[s.name]) { w.briefHistory.push({ step: s.name, ...w.briefs[s.name] }); delete w.briefs[s.name]; }
    w.position = to;
    if (note) w.notes.push({ ...note, round: w.round, at: new Date().toISOString() });
  };
  const route = async (w, tx, failure, ruling) => {
    failure.ruling = ruling; failure.status = 'answered';
    const question = `Test failure ${failure.id}. Verifier report:\n${failure.report}\n\nRuling (${ruling.cause}, by ${ruling.by}):\n${ruling.answer}`;
    if (ruling.cause === 'test') rewind(w, stepIndex('test-plan'), { to: 'Orion', failureId: failure.id, text: question });
    else if (ruling.cause === 'implementation') rewind(w, stepIndex('plan'), { to: 'Cassiopeia', failureId: failure.id, text: question });
    else if (ruling.cause === 'pre-existing') {
      const child = await createIn(tx, fresh(`Fix the pre-existing defect blocking thread ${w.id}: ${ruling.answer.slice(0, 400)}`,
        `${w.source}\n\n## Prerequisite of thread ${w.id}\n${question}`, w.cwd, { position: stepIndex('plan'), parentId: w.id, delivery: true }));
      w.waitsOn = child; failure.prerequisite = child;
      rewind(w, stepIndex('verify'), { to: 'Aldebaran', failureId: failure.id, text: `Prerequisite thread ${child} fixed the pre-existing defect. Re-run the original tests.` });
    } else throw new Error(`Unknown cause ${ruling.cause}`);
    event(w, 'failure-routed', { failureId: failure.id, cause: ruling.cause, by: ruling.by });
    return { cause: ruling.cause, prerequisite: failure.prerequisite ?? null };
  };

  if (resume) harness.resume(); // redrive: any step a dead process left running continues now
  return {
    directory,
    async close() { await views; try { await harness.close(context); } finally { await lock.close(); await unlink(lockPath).catch(() => {}); } },
    async list() { return (await harness.snapshot(Catalog, root.id, context))?.threads ?? []; },
    async get(id) { const w = await harness.snapshot(Work, id, context); if (!w?.id) throw new Error(`Unknown thread ${id}`); return w; },
    async create(objective, source, cwd, { delivery = false } = {}) {
      requireText(objective, 'Objective'); requireText(source, 'Source'); cwd = await realpath(cwd);
      const id = await harness.commit(tx => createIn(tx, fresh(objective, source, cwd, { delivery: delivery === true })), context);
      await change(id, w => { event(w, 'created'); });
      return id;
    },
    async brief(id, text) {
      requireText(text, 'Brief');
      return change(id, w => {
        nq.noHold(w);
        const s = step(w);
        if (w.briefs[s.name]) throw new Error('Brief is sealed for this round');
        w.briefs[s.name] = { text, hash: hash(text), round: w.round };
        event(w, 'brief-sealed', { step: s.name, round: w.round });
      });
    },
    async delegate(id, manager, worker) { return change(id, w => nq.delegate(w, step(w).name, manager, worker)); },
    async nq(id, exchangeId, response, actor) { return change(id, w => nq.workerReply(w, exchangeId, actor, response)); },
    async answer(id, exchangeId, actor, text) { return change(id, w => nq.managerReply(w, exchangeId, actor, text)); },
    // A judgment call (intake, manager, Arbiter) on the timeline, with its latency.
    async note(id, type, details) { return change(id, w => { event(w, type, details); }); },
    async holdQuestion(id, exchangeId, reason) {
      return change(id, w => {
        const x = w.exchanges.find(x => x.id === exchangeId);
        if (x?.status !== 'awaiting-manager') throw new Error('No manager question is due');
        x.status = 'human-hold';
        w.hold = { kind: 'nq', ref: x.id, at: new Date().toISOString(), reason: requireText(reason, 'Hold reason'), questions: x.turns.at(-1)?.questions ?? [] };
      });
    },
    async packet(id, purpose = 'execute') {
      const w = await this.get(id), s = step(w), b = w.briefs[s.name];
      if (!b) throw new Error(`Seal a brief for ${s.name} first`);
      return makePacket(w, s, b, purpose);
    },
    async begin(id, actor, model = '') {
      requireText(actor, 'Actor');
      return change(id, async (w, tx) => {
        const s = step(w), b = w.briefs[s.name];
        if (!b) throw new Error(`Seal a brief for ${s.name} first`);
        nq.readyExchange(w, s.name, actor);
        if (w.attempts.some(a => a.step === s.name && a.round === w.round && ['queued', 'running'].includes(a.status))) throw new Error('A worker is already on this step');
        const a = { id: randomUUID(), step: s.name, role: s.role, round: w.round, actor, model, sessionId: randomUUID(), status: 'queued',
          packet: makePacket(w, s, b, 'execute'), progress: [], checkIns: [], createdAt: Date.now() };
        a.taskId = await tx.createTask(Attempt, { workId: id, attemptId: a.id }, { ownership: { kind: 'conversation' }, conversationId: id });
        w.attempts.push(a);
        event(w, 'assigned', { attemptId: a.id, actor, step: s.name });
        return a.id;
      });
    },
    // A failed worker is redriven on the same pi session: same step, same packet.
    async redrive(id, attemptId) {
      return change(id, async (w, tx) => {
        const a = w.attempts.find(a => a.id === attemptId);
        if (a?.status !== 'failed') throw new Error('Only a failed attempt is redriven');
        a.status = 'running'; // 'running' makes the task continue the existing pi session, not start over
        a.taskId = await tx.createTask(Attempt, { workId: id, attemptId }, { ownership: { kind: 'conversation' }, conversationId: id });
        event(w, 'redrive', { attemptId });
      });
    },
    async execute(id, attemptId) {
      const a = (await this.get(id)).attempts.find(a => a.id === attemptId);
      if (!a) throw new Error('Unknown attempt');
      const done = await harness.waitForTask(a.taskId, context);
      const outcome = done?.state?.outcome;
      if (outcome && outcome.status !== 'completed') {
        // The task itself died (a code fault, not the worker): surface it as a failed attempt, never a silent spin.
        await change(id, w => {
          const x = w.attempts.find(x => x.id === attemptId);
          if (['queued', 'running'].includes(x.status)) { x.status = 'failed'; x.error = `task ${outcome.status}: ${outcome.error?.message ?? 'unknown'}`; event(w, 'task-fault', { attemptId, error: x.error }); }
        });
      }
      return (await this.get(id)).attempts.find(a => a.id === attemptId);
    },
    // Handoff is acceptance: the next phase belongs to a different agent.
    async accept(id, attemptId) {
      return change(id, w => {
        const a = w.attempts.find(a => a.id === attemptId), s = step(w);
        if (!a || a.step !== s.name || a.round !== w.round || a.status !== 'reported') throw new Error('Only the current reported step can be handed off');
        a.status = 'accepted'; w.position++;
        event(w, 'handoff', { attemptId, from: s.name, to: STEPS[w.position]?.name ?? 'complete' });
        if (w.position === STEPS.length) { w.completion = 'verified'; event(w, 'complete'); }
      });
    },
    // A failed test is a question. The Arbiter rules whose question it is.
    async openFailure(id, attemptId, report) {
      requireText(report, 'Failure report');
      return change(id, w => {
        const a = w.attempts.find(a => a.id === attemptId);
        if (!a || a.step !== 'verify' || a.status !== 'reported') throw new Error('A failure comes from a reported verify step');
        a.status = 'failed-test';
        const failure = { id: randomUUID(), attemptId, report, status: 'open', round: w.round, at: new Date().toISOString() };
        w.failures.push(failure);
        const corrections = w.failures.filter(f => f.status !== 'withdrawn').length - 1;
        if (corrections >= MAX_CORRECTIONS) {
          failure.status = 'held';
          w.hold = { kind: 'failure', ref: failure.id, at: failure.at, reason: `Tests still failing after ${corrections} corrections` };
        }
        event(w, 'test-failed', { failureId: failure.id, corrections });
        return failure;
      });
    },
    async rule(id, failureId, ruling) {
      return change(id, async (w, tx) => {
        const f = w.failures.find(f => f.id === failureId);
        if (f?.status !== 'open') throw new Error('No open failure question');
        if (!CAUSES.includes(ruling.cause)) {
          f.status = 'held';
          f.ruling = { ...ruling, cause: 'undetermined' };
          w.hold = { kind: 'failure', ref: f.id, at: new Date().toISOString(), reason: `Arbiter could not determine the cause: ${ruling.answer ?? ''}`.trim() };
          event(w, 'failure-undetermined', { failureId });
          return { cause: 'undetermined' };
        }
        return route(w, tx, f, ruling);
      });
    },
    // The human answers: either a held failure (with its cause) or a held NQ exchange.
    async human(id, { actor = 'operator', text, cause = null }) {
      requireText(text, 'Answer');
      return change(id, async (w, tx) => {
        if (!w.hold) throw new Error('Nothing is waiting on a human');
        if (w.hold.kind === 'nq') return nq.humanAnswer(w, w.hold.ref, actor, text);
        if (!CAUSES.includes(cause)) throw new Error(`A failed test needs the cause: ${CAUSES.join(' | ')}`);
        const f = w.failures.find(f => f.id === w.hold.ref);
        w.hold = null; f.status = 'open';
        return route(w, tx, f, { cause, answer: text, by: actor });
      });
    },
    // The operator authorized building, not just discovery. Recorded on the work, so every later drive honors it.
    async authorize(id) { return change(id, w => { if (!w.delivery) { w.delivery = true; event(w, 'delivery-authorized'); } }); },
    // A prerequisite finished: its parent stops waiting and re-runs its tests.
    async release(id) {
      return change(id, w => {
        if (!w.waitsOn) return false;
        event(w, 'prerequisite-done', { child: w.waitsOn });
        w.waitsOn = null;
        return true;
      });
    },
  };
}

function makePacket(w, s, b, purpose) {
  const accepted = STEPS.slice(0, w.position).map(p => w.attempts.findLast(a => a.step === p.name && a.status === 'accepted')).filter(Boolean)
    .map(a => ({ step: a.step, role: a.role, round: a.round, output: a.output }));
  return JSON.stringify({ purpose, threadId: w.id, workspace: w.cwd, objective: w.objective, source: w.source, step: s, round: w.round,
    brief: b.text, accepted, questionsForYou: w.notes.filter(n => n.to === s.role && n.round === w.round),
    exchange: purpose === 'nq' ? nq.currentExchange(w, s.name)?.turns ?? [] : undefined,
    instruction: purpose === 'nq'
      ? 'Read the exchange, including manager or human answers to your earlier questions. Return ONLY JSON {intent:string, questions:string[], ambiguities:string[]}. Empty arrays mean you understand and can execute. Do not do the work yet.'
      : 'Execute only this step. Inspect the workspace first. Report tangible results and evidence, not a claim of completion.' }, null, 2);
}

// The model reads files, not a pasted transcript that a transport may truncate.
export async function provisionPacket(directory, key, serialized) {
  if (!/^[a-zA-Z0-9-]+$/.test(key)) throw new Error('Invalid packet key');
  const packet = JSON.parse(serialized), folder = join(directory, 'packets', key);
  await mkdir(folder, { recursive: true });
  const save = async (name, text) => { const path = join(folder, name); await writeFile(path, text); return path; };
  const accepted = [];
  for (const [i, c] of packet.accepted.entries()) accepted.push({ step: c.step, role: c.role, path: await save(`ACCEPTED-${i}-${c.step}.md`, c.output ?? '') });
  const { source, brief, accepted: _a, ...rest } = packet;
  return JSON.stringify({ ...rest, source: await save('SOURCE.md', source), brief: await save('BRIEF.md', brief), accepted,
    read: 'Read the brief, the source and the accepted contributions at these paths before you respond.' }, null, 2);
}
