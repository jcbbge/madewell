import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, writeFile, rename, unlink, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as nq from './nq.mjs';
import { STEPS, ARBITER, stepIndex, progressExtension } from './pi-runtime.mjs';
import { runCard } from './pi-call.mjs';
import { buildLaunch } from './cards.mjs';
import { publishWork } from './observe.mjs';
import { BACKGROUND_CONTEXT as context } from '@earendil-works/chord/context';
import { createModels } from '@earendil-works/pi-ai/models';
import { Harness, createRegistry, defineDoc, defineExtension, defineTask } from '@earendil-works/pi-durable';
import { openNodeSqliteStorage } from '@earendil-works/pi-durable/storage/sqlite/node';

export { STEPS };
export const hash = text => createHash('sha256').update(text).digest('hex');
export const CAUSES = ['pre-existing', 'implementation', 'test'];
// Whoever handed the work over: the person or concierge that dispatched it, before any phase has handed off.
export const DISPATCHER = 'dispatcher';
// A failed test is answered by: test → test architect (Orion), implementation → planner (Cassiopeia),
// pre-existing → a linked prerequisite thread. Undetermined → the human.
export const MAX_CORRECTIONS = 3;
// A pre-existing defect inside a prerequisite opens another prerequisite; past this depth the work holds for the human.
export const MAX_PREREQUISITE_DEPTH = 2;
const requireText = (text, name) => { if (typeof text !== 'string' || !text.trim()) throw new Error(`${name} must be nonempty`); return text; };
const Catalog = defineDoc({ kind: 'work.catalog', version: 1, scope: 'conversation', history: 'latest', fork: 'initial', initial: () => ({ threads: [] }) });
const Work = defineDoc({ kind: 'work.thread', version: 1, scope: 'conversation', history: 'rewindable', fork: 'asOf', initial: () => ({}) });
const terminal = result => ({ status: 'terminal', outcome: { status: 'completed', result } });
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };

// The store owns one SQLite file. Exactly one process owns it at a time.
export async function openStore(directory, { checkInMs = 1_800_000, resume = false, accountsFile = null } = {}) {
  directory = resolve(directory);
  accountsFile = accountsFile ? resolve(accountsFile) : join(directory, 'accounts.json');
  let marks = Promise.resolve();
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
          a.runs = [...(a.runs ?? []), { n: a.launches, startedAt: Date.now(), endedAt: null, pid: null, exit: null, record: join('attempts', attemptId, launchName(a)) }];
          event(w, resumed ? 'redriven' : 'started', { attemptId, step: a.step });
          return { status: 'running', checkpoint: { phase: 'execute' } };
        }, ctx);
        await publish(workId);
        const channel = join(directory, 'attempts', attemptId), inbox = join(channel, 'check-in.json');
        await mkdir(channel, { recursive: true });
        const step = STEPS[stepIndex(prior.step)], card = prior.card;
        if (!card) throw new Error(`Attempt ${attemptId} has no card`);
        // Same card: continue its own session. Codex can only continue a session it has already named.
        const continuing = resumed && (card.harness !== 'codex' || Boolean(prior.harnessSession));
        const launch = buildLaunch(card, { access: prior.access, sessionDir: join(directory, 'sessions', attemptId),
          sessionId: card.harness === 'codex' ? (continuing ? prior.harnessSession : undefined) : prior.harnessSession ?? prior.sessionId,
          resume: continuing, progressExtension: card.harness === 'pi' ? progressExtension : undefined, readDirs: [directory],
          system: `You are ${step.role}. ${step.duty} The input is your complete work packet. Do not delegate or change scope.` });
        // After a swap the new card starts fresh: transcripts don't cross harnesses, the workspace and record do.
        const last = prior.swaps?.at(-1);
        const pickup = last
          ? `\n\nPicking up: this step was started on ${last.from.harness} · ${last.from.model} and stopped at a usage limit. ` +
            `The workspace is as it left it${last.workspace?.head ? ` (HEAD ${last.workspace.head})` : ''}` +
            `${last.workspace?.uncommitted?.length ? `; uncommitted: ${last.workspace.uncommitted.join(', ')}` : ''}. ` +
            'Inspect the workspace and your step\'s task list first; continue the assignment and do not redo finished parts.'
          : '';
        const prompt = continuing
          ? 'You were interrupted mid-assignment. Continue the same assignment from where you stopped. Inspect the workspace first; do not redo finished parts.'
          : await provisionPacket(directory, attemptId, prior.packet) + pickup;
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
          // Codex names its session only once it starts: keep it now, so a crash can still continue it.
          if (card.harness === 'codex' && entry.type === 'thread.started' && entry.thread_id) {
            queue = queue.then(() => runtime.commit(async tx => {
              (await tx.doc(Work, workId)).attempts.find(a => a.id === attemptId).harnessSession = entry.thread_id;
              return { status: 'running', checkpoint: { phase: 'execute' } };
            }, ctx));
            return;
          }
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
          result = await runCard({ card, launch, cwd: saved.cwd, prompt, record: join(channel, launchName({ ...prior, launches: (prior.launches ?? 0) + 1 })), onLine, signal: ctx.abortSignal,
            env: { WORK_DATA: directory, PI_DURABLE_ATTEMPT: attemptId, PI_DURABLE_CHECKIN: inbox },
            onSpawn: pid => runtime.commit(async tx => { const a = (await tx.doc(Work, workId)).attempts.find(a => a.id === attemptId); a.pid = pid; a.runs = a.runs.map((r, i) => i === a.runs.length - 1 ? { ...r, pid } : r); return { status: 'running', checkpoint: { phase: 'execute' } }; }, ctx).then(() => publish(workId)) });
        } finally { clearTimeout(timer); }
        await queue;
        await runtime.commit(async tx => {
          const w = await tx.doc(Work, workId), a = w.attempts.find(a => a.id === attemptId);
          a.endedAt = Date.now(); a.exitCode = result.code; a.output = result.output;
          a.harnessSession = result.sessionId ?? a.harnessSession ?? null;
          a.runs = a.runs.map((r, i) => i === a.runs.length - 1 ? { ...r, endedAt: a.endedAt, exit: result.signal ?? result.code, toolCalls: result.toolCalls, card: `${card.harness} · ${card.model}` } : r);
          a.limit = result.limit ?? null;
          a.status = result.ok ? 'reported' : 'failed';
          a.error = result.ok ? '' : result.limit ? `usage limit: ${result.limit.message}`
            : (result.signal ?? result.error) || `${card.harness} exited ${result.code}`;
          event(w, a.status, { attemptId, step: a.step, ...(result.limit ? { limit: result.limit } : {}) });
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
    else if (ruling.cause === 'pre-existing' && (w.depth ?? 0) >= MAX_PREREQUISITE_DEPTH) {
      failure.status = 'held';
      w.hold = { kind: 'failure', ref: failure.id, at: new Date().toISOString(),
        reason: `Another pre-existing defect ${(w.depth ?? 0) + 1} prerequisites deep: something upstream is wrong. ${ruling.answer}`.trim() };
      event(w, 'prerequisite-depth', { failureId: failure.id, depth: w.depth });
      return { cause: 'held' };
    }
    else if (ruling.cause === 'pre-existing') {
      const child = await createIn(tx, fresh(`Fix the pre-existing defect blocking thread ${w.id}: ${ruling.answer.slice(0, 400)}`,
        `${w.source}\n\n## Prerequisite of thread ${w.id}\nScope: fix only this defect. Thread ${w.id} is unfinished and waits for this fix, so its own checks are expected to fail: this unit's checks test only this fix and must not run or depend on thread ${w.id}'s checks.\n\n${question}`, w.cwd, { position: stepIndex('plan'), parentId: w.id, depth: (w.depth ?? 0) + 1, delivery: true }));
      w.waitsOn = child; failure.prerequisite = child;
      // Back to where the defect stopped the work: the making (a blocked maker) or the checks.
      const back = STEPS[stepIndex(failure.step ?? 'verify')];
      rewind(w, stepIndex(back.name), { to: back.role, failureId: failure.id, text: back.name === 'verify'
        ? `Prerequisite thread ${child} fixed the pre-existing defect. Re-run the original tests.`
        : `Prerequisite thread ${child} fixed the pre-existing defect that blocked you. Execute the accepted plan.` });
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
    // The answering party is never chosen by the caller: it is whoever made this handoff.
    async delegate(id, worker) { return change(id, w => nq.delegate(w, step(w).name, originatorOf(w).role, worker)); },
    async originator(id) { const w = await this.get(id); step(w); return originatorOf(w); },
    async nq(id, exchangeId, response, actor) { return change(id, w => nq.workerReply(w, exchangeId, actor, response)); },
    async answer(id, exchangeId, actor, text) { return change(id, w => nq.originatorReply(w, exchangeId, actor, text)); },
    // A judgment call (intake, originator, Arbiter) on the timeline, with its latency.
    async note(id, type, details) { return change(id, w => { event(w, type, details); }); },
    async holdQuestion(id, exchangeId, reason) {
      return change(id, w => {
        const x = w.exchanges.find(x => x.id === exchangeId);
        if (x?.status !== 'awaiting-originator') throw new Error('No originator question is due');
        x.status = 'human-hold';
        w.hold = { kind: 'nq', ref: x.id, at: new Date().toISOString(), reason: requireText(reason, 'Hold reason'), questions: x.turns.at(-1)?.questions ?? [] };
      });
    },
    async packet(id, purpose = 'execute') {
      const w = await this.get(id), s = step(w), b = w.briefs[s.name];
      if (purpose === 'originator') return originatorPacket(w, s);
      if (!b) throw new Error(`Seal a brief for ${s.name} first`);
      return makePacket(w, s, b, purpose);
    },
    // card: the harness + provider + model this step's prescription picked; access: what it may change.
    async begin(id, actor, card, access) {
      requireText(actor, 'Actor');
      if (!card?.harness || !card?.model) throw new Error('A card (harness, provider, model) is required');
      return change(id, async (w, tx) => {
        const s = step(w), b = w.briefs[s.name];
        if (!b) throw new Error(`Seal a brief for ${s.name} first`);
        nq.readyExchange(w, s.name, actor);
        if (w.attempts.some(a => a.step === s.name && a.round === w.round && ['queued', 'running'].includes(a.status))) throw new Error('A worker is already on this step');
        const a = { id: randomUUID(), step: s.name, role: s.role, round: w.round, actor, card, access, model: `${card.harness} · ${card.provider}/${card.model}`,
          sessionId: randomUUID(), harnessSession: null, swaps: [], status: 'queued',
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
    // A usage limit stopped this worker: the same step continues on another card, in the same workspace,
    // with a fresh session (transcripts don't cross harnesses). The swap stays on the record.
    async swap(id, attemptId, card) {
      if (!card?.harness || !card?.model) throw new Error('A card is required');
      return change(id, async (w, tx) => {
        const a = w.attempts.find(a => a.id === attemptId);
        if (a?.status !== 'failed' || !a.limit) throw new Error('Only an attempt stopped by a usage limit is swapped');
        // What the successor needs: the outgoing session, the limit, and the workspace as it was left.
        a.swaps.push({ from: a.card, to: card, limit: a.limit, session: a.harnessSession ?? a.sessionId,
          workspace: workspaceState(w.cwd), lastOutput: (a.output ?? '').slice(-2000), at: new Date().toISOString() });
        event(w, 'swapped', { attemptId, step: a.step, from: `${a.card.harness} · ${a.card.model}`, to: `${card.harness} · ${card.model}`, account: a.limit.account });
        Object.assign(a, { card, model: `${card.harness} · ${card.provider}/${card.model}`, sessionId: randomUUID(), harnessSession: null,
          limit: null, error: '', launches: 0, status: 'queued' });
        a.taskId = await tx.createTask(Attempt, { workId: id, attemptId }, { ownership: { kind: 'conversation' }, conversationId: id });
      });
    },
    // Quota belongs to the provider account: {account: resetsAt epoch ms}. The file can be shared by
    // every workspace's store (accountsFile), so one limit is learned once. Writes are serialized here
    // and land by atomic rename; a mark only ever moves a reset later.
    async exhausted() {
      try { return JSON.parse(await readFile(accountsFile, 'utf8')); } catch { return {}; }
    },
    async markExhausted(account, resetsAt) {
      requireText(account, 'Account');
      if (!Number.isFinite(resetsAt)) throw new Error('A reset time is required');
      return (marks = marks.then(async () => {
        const all = await this.exhausted();
        all[account] = Math.max(all[account] ?? 0, resetsAt);
        const tmp = `${accountsFile}.${process.pid}.${randomUUID()}.tmp`;
        await writeFile(tmp, JSON.stringify(all, null, 2));
        await rename(tmp, accountsFile);
        return all;
      }));
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
        // A failed check (verify), or a maker or check designer that could not do its step as written: all are questions.
        if (!a || !['verify', 'implement', 'test-plan'].includes(a.step) || a.status !== 'reported') throw new Error('A failure comes from a reported verify, implement or test-plan step');
        a.status = a.step === 'verify' ? 'failed-test' : 'blocked';
        const failure = { id: randomUUID(), attemptId, step: a.step, report, status: 'open', round: w.round, at: new Date().toISOString() };
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

// Who handed this step its work, and what that handoff was. The originator answers intake questions.
// - after a failure ruling rewound the work here: the Arbiter, from its ruling;
// - otherwise the previous step's role, from its latest accepted output;
// - before any handoff (discover): the dispatcher, from the objective and source only.
export function originatorOf(w) {
  const s = STEPS[w.position];
  const ruled = w.notes.findLast(n => n.round === w.round && n.failureId && n.to === s.role);
  if (ruled) {
    const f = w.failures.find(f => f.id === ruled.failureId);
    return { role: ARBITER.role, basis: 'ruling', failureId: f.id,
      handoff: `Verifier report:\n${f.report}\n\nRuling (${f.ruling.cause}, by ${f.ruling.by}):\n${f.ruling.answer}\n\nEvidence:\n${f.ruling.evidence || '(none)'}` };
  }
  const prev = STEPS[w.position - 1], a = prev && w.attempts.findLast(a => a.step === prev.name && a.status === 'accepted');
  if (a) return { role: prev.role, basis: 'handoff', step: prev.name, attemptId: a.id, handoff: a.output ?? '' };
  // A prerequisite thread was handed over by the Arbiter's ruling, which its source carries.
  if (w.parentId && !w.attempts.some(a => a.status === 'accepted')) return { role: ARBITER.role, basis: 'source' };
  return { role: DISPATCHER, basis: 'source' };
}
const describe = ({ handoff, ...o }) => o;

function makePacket(w, s, b, purpose) {
  const accepted = STEPS.slice(0, w.position).map(p => w.attempts.findLast(a => a.step === p.name && a.status === 'accepted')).filter(Boolean)
    .map(a => ({ step: a.step, role: a.role, round: a.round, output: a.output }));
  const x = nq.currentExchange(w, s.name);
  return JSON.stringify({ purpose, threadId: w.id, workspace: w.cwd, objective: w.objective, source: w.source, step: s, round: w.round,
    brief: b.text, accepted, questionsForYou: w.notes.filter(n => n.to === s.role && n.round === w.round),
    // The whole NQ exchange travels with the work: intake and execution both read it.
    originator: describe(originatorOf(w)), exchange: x?.turns ?? [],
    instruction: purpose === 'nq'
      ? 'Read the exchange, including the originator\'s or the operator\'s answers to your earlier questions. Return ONLY JSON {intent:string, questions:string[], notes:string[]}. questions: only what blocks you from executing and cannot be settled from the packet, the workspace or the answers already in the exchange; never repeat a question the exchange has answered. notes: your assumptions and anything already settled; notes never block. An empty questions array confirms readiness. Do not do the work yet.'
      : 'Execute only this step. The exchange is your intake: your questions and the answers from whoever handed you this work (or the operator). Those answers bind this execution. Inspect the workspace first. Report tangible results and evidence, not a claim of completion.' }, null, 2);
}

// One transcript file per card and launch: a swap never appends to the outgoing harness's stream.
const launchName = a => `launch-${a.swaps?.length ? `s${a.swaps.length}-` : ''}${a.launches}`;

// The workspace as a worker left it: HEAD and uncommitted paths (stay on disk; a swap keeps the workspace).
function workspaceState(cwd) {
  const git = args => { const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', timeout: 5000 }); return r.status === 0 ? r.stdout.trim() : null; };
  return { head: git(['rev-parse', 'HEAD']), uncommitted: git(['status', '--porcelain'])?.split('\n').filter(Boolean).slice(0, 50) ?? null };
}

// The originator sees what it handed over, the source, and the questions: never the receiving step's own brief or later work.
function originatorPacket(w, s) {
  const o = originatorOf(w), x = nq.currentExchange(w, s.name);
  if (!x || x.originator !== o.role) throw new Error('No exchange awaits this originator');
  return JSON.stringify({ purpose: 'originator', threadId: w.id, workspace: w.cwd, objective: w.objective, source: w.source,
    receivingStep: s, round: w.round, originator: describe(o), handoff: o.handoff, exchange: x.turns, questions: x.turns.at(-1)?.questions ?? [],
    instruction: o.handoff === undefined
      ? (o.role === ARBITER.role ? 'Your ruling created this prerequisite work; it is in the source. Answer from it.' : 'You dispatched this work. Answer from the objective and source only.')
      : 'Answer from your own handoff (and the source). Do not change your handoff or the work; clarify what you meant.' }, null, 2);
}

// The model reads files, not a pasted transcript that a transport may truncate.
export async function provisionPacket(directory, key, serialized) {
  if (!/^[a-zA-Z0-9-]+$/.test(key)) throw new Error('Invalid packet key');
  const packet = JSON.parse(serialized), folder = join(directory, 'packets', key);
  await mkdir(folder, { recursive: true });
  const save = async (name, text) => { const path = join(folder, name); await writeFile(path, text); return path; };
  const accepted = [];
  for (const [i, c] of (packet.accepted ?? []).entries()) accepted.push({ step: c.step, role: c.role, path: await save(`ACCEPTED-${i}-${c.step}.md`, c.output ?? '') });
  const { source, brief, handoff, accepted: _a, ...rest } = packet;
  const files = { source: await save('SOURCE.md', source) };
  if (brief !== undefined) files.brief = await save('BRIEF.md', brief);
  if (handoff !== undefined) files.handoff = await save('HANDOFF.md', handoff);
  return JSON.stringify({ ...rest, ...files, accepted,
    read: `Read the ${Object.keys(files).join(', ')}${accepted.length ? ' and the accepted contributions' : ''} at these paths before you respond.` }, null, 2);
}
