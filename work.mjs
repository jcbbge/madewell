import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, writeFile, rename, unlink, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as nq from './nq.mjs';
import { STEPS, ARBITER, stepIndex, progressExtension } from './pi-runtime.mjs';
import { runCard } from './pi-call.mjs';
import { buildLaunch } from './cards.mjs';
import { LABELS, FORMAT, checkDeliverable } from './deliverable.mjs';
import { publishWork } from './observe.mjs';
import { sendAlert } from './alert.mjs';
import { BACKGROUND_CONTEXT as context } from '@earendil-works/chord/context';
import { createModels } from '@earendil-works/pi-ai/models';
import { Harness, createRegistry, defineDoc, defineExtension, defineTask } from '@earendil-works/pi-durable';
import { openNodeSqliteStorage } from '@earendil-works/pi-durable/storage/sqlite/node';

export { STEPS };
export const hash = text => createHash('sha256').update(text).digest('hex');
// A worker whose tools can start a sub-agent anyway originates an NQ exchange and answers for it.
export const SUBAGENT_RULE = 'If your tools can start another agent anyway, that is an NQ exchange you originate and answer for: give it a complete brief, have it state its understanding and questions before it works, answer them yourself, stop and report after three turns with questions still open, and put its understanding, your answers and its result in your report.';
export const CAUSES = ['pre-existing', 'implementation', 'test'];
// Whoever handed the work over: the person or concierge that dispatched it, before any phase has handed off.
export const DISPATCHER = 'dispatcher';
// A failed test is answered by: test → test architect (Orion), implementation → planner (Cassiopeia),
// pre-existing → a linked prerequisite thread. Undetermined → the human.
export const MAX_CORRECTIONS = 3;
// A pre-existing defect inside a prerequisite opens another prerequisite; past this depth the work holds for the human.
export const MAX_PREREQUISITE_DEPTH = 2;
const requireText = (text, name) => { if (typeof text !== 'string' || !text.trim()) throw new Error(`${name} must be nonempty`); return text; };
// threads: every thread in creation order. first: discovery runs the operator put first, most recent first.
const Catalog = defineDoc({ kind: 'work.catalog', version: 1, scope: 'conversation', history: 'latest', fork: 'initial', initial: () => ({ threads: [], first: [] }) });
const Work = defineDoc({ kind: 'work.thread', version: 1, scope: 'conversation', history: 'rewindable', fork: 'asOf', initial: () => ({}) });
const terminal = result => ({ status: 'terminal', outcome: { status: 'completed', result } });
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };

// The store owns one SQLite file. Exactly one process owns it at a time.
export async function openStore(directory, { checkInMs = 300_000, resume = false, accountsFile = null } = {}) {
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
  // A hold alerts the human once: the record says which hold was alerted, so a redriven or repeated drive sends nothing twice.
  let alerts = Promise.resolve();
  const alertIfNew = id => (alerts = alerts.then(async () => {
    const w = await harness.snapshot(Work, id, context);
    if (!w?.hold || w.events.some(e => e.type === 'alerted' && e.holdAt === w.hold.at)) return;
    const sent = await sendAlert({ threadId: id, workspace: w.cwd, objective: w.objective, hold: w.hold }, process.env);
    await harness.commit(async tx => { event(await tx.doc(Work, id), 'alerted', { holdAt: w.hold.at, channel: sent.channel, ok: sent.ok }); }, context);
    await publish(id);
  }).catch(e => console.error(`alert not recorded (work is committed): ${e.message}`)));
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
        const launch = buildLaunch(card, { access: prior.askRestate ? 'read' : prior.access, sessionDir: join(directory, 'sessions', attemptId),
          sessionId: card.harness === 'codex' ? (continuing ? prior.harnessSession : undefined) : prior.harnessSession ?? prior.sessionId,
          resume: continuing, progressExtension: card.harness === 'pi' ? progressExtension : undefined, readDirs: [directory],
          system: `You are ${step.role}. ${step.duty} The input is your complete work packet. Do not delegate or change scope. ${SUBAGENT_RULE}` });
        // After a swap the new card starts fresh: transcripts don't cross harnesses, the workspace and record do.
        const last = prior.swaps?.at(-1);
        const pickup = last
          ? `\n\nPicking up: this step was started on ${last.from.harness} · ${last.from.model} and stopped at a usage limit. ` +
            `The workspace is as it left it${last.workspace?.head ? ` (HEAD ${last.workspace.head})` : ''}` +
            `${last.workspace?.uncommitted?.length ? `; uncommitted: ${last.workspace.uncommitted.join(', ')}` : ''}. ` +
            'Inspect the workspace and your step\'s task list first; continue the assignment and do not redo finished parts.'
          : '';
        const prompt = prior.askRestate
          ? restatePrompt(prior.step, prior.askRestate, { continuing, output: prior.revisions.at(-1).output })
          : prior.askVerdict && continuing
          ? 'Your answer had no verdict. Do not run anything again. Reply with ONLY the JSON verdict for the checks you already ran: {"outcome":"pass"|"fail","summary":string,"failures":[{"test":string,"expected":string,"observed":string}]}.'
          : continuing
          ? 'You were interrupted mid-assignment. Continue the same assignment from where you stopped. Inspect the workspace first; do not redo finished parts.'
          : await provisionPacket(directory, attemptId, prior.packet) + pickup;
        let queue = Promise.resolve(), timer;
        const checkIn = () => {
          clearTimeout(timer);
          timer = setTimeout(() => { queue = queue.then(async () => {
            const question = { id: randomUUID(), attemptId, text: `No deliverable reported for ${Math.round(checkInMs / 60_000)} minutes. What prevents the next deliverable, and what support do you need?` };
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
          if (a.askRestate && result.ok) {
            // The restated deliverable answers the receiving step's question; a human answer is confirmed by the receiver's own intake.
            const rx = w.exchanges.find(x => x.id === a.askRestate.exchangeId);
            if (!a.askRestate.human && rx?.status === 'awaiting-originator') nq.originatorReply(w, rx.id, a.role, `Restated in full as revision ${a.revisions.length} of attempt ${a.id}; the restated deliverable is the hand-off.`);
            a.restatedFor = rx.turns.length; a.askRestate = null;
          }
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
    await alertIfNew(id);
    return result;
  };
  const step = w => { const s = STEPS[w.position]; if (!s) throw new Error('Thread is complete'); return s; };
  const fresh = (objective, source, cwd, extra = {}) => ({ objective, source, cwd, position: 0, round: 0, briefs: {}, briefHistory: [],
    exchanges: [], asked: [], attempts: [], failures: [], notes: [], hold: null, waitsOn: null, parentId: null, kind: 'discovery', completion: null, events: [], ...extra });
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
    // A question carried across hand-offs survives a rewind only if the ruling itself carries it.
    w.asked = (w.asked ?? []).filter(e => nq.norm(ruling.answer).includes(nq.norm(e.text)));
    const question = `Test failure ${failure.id}. Verifier report:\n${failure.report}\n\nRuling (${ruling.cause}, by ${ruling.by}):\n${ruling.answer}`;
    if (ruling.cause === 'test') rewind(w, stepIndex('test-plan'), { to: 'Orion', failureId: failure.id, text: question });
    else if (ruling.cause === 'implementation') rewind(w, stepIndex('plan'), { to: 'Cassiopeia', failureId: failure.id, text: question });
    else if (ruling.cause === 'pre-existing' && (w.depth ?? 0) >= MAX_PREREQUISITE_DEPTH) {
      failure.status = 'held';
      w.hold = { kind: 'failure', ref: failure.id, at: new Date().toISOString(), cause: 'depth', originator: null, receiver: ARBITER.role, refs: [],
        reason: `Another pre-existing defect ${(w.depth ?? 0) + 1} prerequisites deep: something upstream is wrong. ${ruling.answer}`.trim() };
      event(w, 'prerequisite-depth', { failureId: failure.id, depth: w.depth });
      return { cause: 'held' };
    }
    else if (ruling.cause === 'pre-existing') {
      const child = await createIn(tx, fresh(`Fix the pre-existing defect blocking thread ${w.id}: ${ruling.answer.slice(0, 400)}`,
        `${w.source}\n\n## Prerequisite of thread ${w.id}\nAuthorized (operator rule, 2026-10-16): the Arbiter's pre-existing ruling authorizes this repair inside the workspace, with reversible changes and no new dependencies. Anything destructive, irreversible, touching production, money, credentials or anything outside the workspace is still the operator's.\nScope: fix only this defect. Thread ${w.id} is unfinished and waits for this fix, so its own checks are expected to fail: this unit's checks test only this fix and must not run or depend on thread ${w.id}'s checks.\n\n${question}`, w.cwd, { position: stepIndex('plan'), parentId: w.id, depth: (w.depth ?? 0) + 1, kind: 'fix' }));
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
    alertPending: alertIfNew,
    async close() { await views; await alerts; try { await harness.close(context); } finally { await lock.close(); await unlink(lockPath).catch(() => {}); } },
    async list() { return (await harness.snapshot(Catalog, root.id, context))?.threads ?? []; },
    async get(id) { const w = await harness.snapshot(Work, id, context); if (!w?.id) throw new Error(`Unknown thread ${id}`); return w; },
    // kind 'discovery' (the default): discovery splits into delivery items that join the queue.
    // kind 'delivery': one item, every phase in this thread.
    async create(objective, source, cwd, { delivery = false, kind = delivery ? 'delivery' : 'discovery' } = {}) {
      requireText(objective, 'Objective'); requireText(source, 'Source'); cwd = await realpath(cwd);
      if (!['discovery', 'delivery'].includes(kind)) throw new Error('kind is discovery or delivery');
      const id = await harness.commit(tx => createIn(tx, fresh(objective, source, cwd, { kind })), context);
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
    async answer(id, exchangeId, actor, text, same = []) { return change(id, w => nq.originatorReply(w, exchangeId, actor, text, same)); },
    // A failed check or a blocked maker hands its question to the Arbiter: an NQ exchange the failing attempt's role originates.
    async delegateFailure(id, failureId, worker) {
      return change(id, w => {
        const f = w.failures.find(f => f.id === failureId);
        if (!f) throw new Error('Unknown failure');
        return nq.delegate(w, 'arbitrate', w.attempts.find(a => a.id === f.attemptId).role, worker, { kind: 'failure', id: failureId });
      });
    },
    // The originator said only the operator can authorize something: the dispatcher, who holds the operator's source, is consulted.
    async delegateAuthority(id, parentId, originatorRole, worker, handoff) {
      return change(id, w => {
        const parent = w.exchanges.find(x => x.id === parentId);
        if (!parent) throw new Error('Unknown exchange');
        return nq.delegate(w, 'authority', originatorRole, worker, { kind: 'authority', parent: parentId, turn: parent.turns.length, handoff });
      });
    },
    async failurePacket(id, failureId, purpose = 'originator') { return failurePacket(await this.get(id), failureId, purpose); },
    async authorityPacket(id, axId, purpose = 'originator') { return authorityPacket(await this.get(id), axId, purpose); },
    // A judgment call (intake, originator, Arbiter) on the timeline, with its latency.
    async note(id, type, details) { return change(id, w => { event(w, type, details); }); },
    async holdQuestion(id, exchangeId, reason, cause = 'authority') {
      return change(id, w => {
        const x = w.exchanges.find(x => x.id === exchangeId);
        if (x?.status !== 'awaiting-originator') throw new Error('No originator question is due');
        x.status = 'human-hold';
        w.hold = { kind: 'nq', ref: x.id, at: new Date().toISOString(), cause, originator: x.originator, receiver: x.worker, questionId: null, refs: [x.id],
          reason: requireText(reason, 'Hold reason'), questions: x.turns.at(-1)?.questions ?? [] };
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
    // The check runner reported without a verdict: continue its own session and ask only for the verdict.
    async askVerdict(id, attemptId) {
      return change(id, async (w, tx) => {
        const a = w.attempts.find(a => a.id === attemptId);
        if (a?.step !== 'verify' || a.status !== 'reported') throw new Error('Only a reported verify step is asked for its verdict');
        Object.assign(a, { status: 'running', askVerdict: true });
        a.taskId = await tx.createTask(Attempt, { workId: id, attemptId }, { ownership: { kind: 'conversation' }, conversationId: id });
        event(w, 'verdict-asked', { attemptId });
      });
    },
    // A hand-off missing its required parts opens the receiving step's own exchange early; the receiving step's agent asks.
    async refuse(id, attemptId, worker, missing) {
      return change(id, w => {
        const a = w.attempts.find(a => a.id === attemptId), s = step(w);
        if (!a || a.step !== s.name || a.round !== w.round || a.status !== 'reported' || !STEPS[w.position + 1]) throw new Error('Only the current reported step can be refused');
        const id = nq.delegate(w, STEPS[w.position + 1].name, s.role, worker, { kind: 'step', id: attemptId });
        event(w, 'handoff-refused', { attemptId, step: a.step, missing });
        return id;
      });
    },
    async refusalPacket(id, attemptId) { return refusalPacket(await this.get(id), attemptId); },
    // The receiving step asked the reporting worker for what its report lacks: continue its own session, read-only, for the restated deliverable.
    async askRestate(id, attemptId) {
      return change(id, async (w, tx) => {
        const a = w.attempts.find(a => a.id === attemptId), rx = nq.findExchange(w, x => nq.isStep(x) && x.subject?.id === attemptId);
        if (!a || !LABELS[a.step] && a.step !== 'test-plan' || a.status !== 'reported' || !rx) throw new Error('Only a reported plan, test-plan or implement hand-off with a refusal is asked to restate');
        const missing = checkDeliverable(a.step, a.output ?? '', w.cwd).missing, last = rx.turns.at(-1);
        a.revisions = [...(a.revisions ?? []), { output: a.output, at: new Date().toISOString(), missing }];
        Object.assign(a, { status: 'running', askRestate: { exchangeId: rx.id, questions: rx.turns.findLast(t => t.type === 'worker')?.questions ?? [], human: last?.type === 'human' ? last.text : null, missing } });
        a.taskId = await tx.createTask(Attempt, { workId: id, attemptId }, { ownership: { kind: 'conversation' }, conversationId: id });
        event(w, 'restate-asked', { attemptId, missing });
      });
    },
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
        if (LABELS[a.step] || a.step === 'test-plan') {
          const { missing, testPlan } = checkDeliverable(a.step, a.output ?? '', w.cwd);
          if (missing.length) throw new Error(`A hand-off missing its required parts is refused: ${missing.join('; ')}`);
          if (testPlan) a.testPlan = testPlan;
        }
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
          w.hold = { kind: 'failure', ref: failure.id, at: failure.at, cause: 'corrections', originator: null, receiver: ARBITER.role, refs: [], reason: `Tests still failing after ${corrections} corrections` };
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
          w.hold = { kind: 'failure', ref: f.id, at: new Date().toISOString(), cause: 'undetermined', originator: null, receiver: ARBITER.role, refs: [], reason: `Arbiter could not determine the cause: ${ruling.answer ?? ''}`.trim() };
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
    // Discovery is handed off as its items: each becomes a delivery item in this run's bucket, in order,
    // starting at ideation with the discovery report as its handoff.
    async split(id, attemptId, items) {
      const ids = await change(id, async (w, tx) => {
        const a = w.attempts.find(a => a.id === attemptId);
        if (w.kind !== 'discovery' || STEPS[w.position]?.name !== 'discover' || a?.status !== 'reported') throw new Error('Only a reported discovery is split');
        if (!items.length) throw new Error('Discovery found no items');
        a.status = 'accepted'; w.position++;
        w.items = [];
        for (const [i, item] of items.entries()) {
          const handoff = `Discovered item ${i + 1} of ${items.length}: ${item.title}\n\n${item.text}\n\nThe whole discovery report:\n${a.output ?? ''}`;
          w.items.push(await createIn(tx, fresh(item.objective, w.source, w.cwd, { kind: 'delivery', from: w.id, position: stepIndex('ideate'),
            discovered: { role: a.role, attemptId: a.id, output: handoff }, events: [{ at: new Date().toISOString(), type: 'created', pid: process.pid, from: w.id }] })));
        }
        w.completion = 'discovered';
        event(w, 'discovered', { attemptId, items: w.items });
        return w.items;
      });
      for (const item of ids) await publish(item);
      return ids;
    },
    // Delivery items waiting to run, in order: buckets the operator put first, then oldest bucket first;
    // within a bucket, in the order discovery found them.
    async queue() {
      const catalog = await harness.snapshot(Catalog, root.id, context), first = catalog?.first ?? [];
      const items = [];
      for (const id of catalog?.threads ?? []) { const w = await this.get(id); if (w.kind === 'delivery' && !w.completion) items.push(w); }
      const rank = w => { const i = first.indexOf(w.from); return i < 0 ? first.length : i; };
      return items.sort((a, b) => rank(a) - rank(b) || (a.from ?? a.id) - (b.from ?? b.id) || a.id - b.id).map(w => w.id);
    },
    // Put a discovery run's bucket first. `ref` is the discovery thread or any item in it.
    async first(ref) {
      const w = await this.get(ref), bucket = w.kind === 'discovery' ? w.id : w.from;
      if (!bucket) throw new Error(`Thread ${ref} is not in a discovery bucket`);
      await harness.commit(async tx => { const c = await tx.doc(Catalog, root.id); c.first = [bucket, ...(c.first ?? []).filter(b => b !== bucket)]; }, context);
      return bucket;
    },
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
  // A delivery item was handed over by the discovery that found it.
  if (w.discovered && !w.attempts.some(a => a.status === 'accepted')) return { role: w.discovered.role, basis: 'handoff', step: 'discover', attemptId: w.discovered.attemptId, handoff: w.discovered.output };
  // A prerequisite thread was handed over by the Arbiter's ruling, which its source carries.
  if (w.parentId && !w.attempts.some(a => a.status === 'accepted')) return { role: ARBITER.role, basis: 'source' };
  return { role: DISPATCHER, basis: 'source' };
}
const describe = ({ handoff, ...o }) => o;

function makePacket(w, s, b, purpose) {
  const accepted = STEPS.slice(0, w.position).map(p => w.attempts.findLast(a => a.step === p.name && a.status === 'accepted')
    ?? (p.name === 'discover' && w.discovered ? { step: 'discover', role: w.discovered.role, round: 0, output: w.discovered.output } : null)).filter(Boolean)
    .map(a => ({ step: a.step, role: a.role, round: a.round, output: a.output }));
  const x = nq.currentExchange(w, s.name);
  // A step that runs again gets its own last accepted deliverable, to restate with the changes applied.
  const own = LABELS[s.name] || s.name === 'test-plan' ? w.attempts.findLast(a => a.step === s.name && a.status === 'accepted') : null;
  const plan = s.name === 'verify' ? w.attempts.findLast(a => a.step === 'test-plan' && a.status === 'accepted') : null;
  return JSON.stringify({ purpose, threadId: w.id, workspace: w.cwd, objective: w.objective, source: w.source, step: s, round: w.round,
    brief: b.text, accepted,
    ...(own ? { previous: { round: own.round, output: own.output } } : {}),
    ...(s.name === 'verify' ? { testPlan: plan?.testPlan ? { attemptId: plan.id, round: plan.round, scripts: plan.testPlan.scripts, evidence: plan.testPlan.evidence } : null } : {}),
    questionsForYou: w.notes.filter(n => n.to === s.role && n.round === w.round),
    // The whole NQ exchange travels with the work: intake and execution both read it.
    originator: describe(originatorOf(w)), exchange: x?.turns ?? [],
    instruction: purpose === 'nq'
      ? 'Read the exchange, including the originator\'s or the operator\'s answers to your earlier questions. Return ONLY JSON {intent:string, questions:string[], notes:string[]}. questions: only what blocks you from executing and cannot be settled from the packet, the workspace or the answers already in the exchange; never repeat a question the exchange has answered. notes: your assumptions and anything already settled; notes never block. An empty questions array confirms readiness. Do not do the work yet.'
      : 'Execute only this step. The exchange is your intake: your questions and the answers from whoever handed you this work (or the operator). Those answers bind this execution. Inspect the workspace first. Report tangible results and evidence, not a claim of completion.'
        + (own ? ' Your previous accepted deliverable is in "previous": your report is the complete current deliverable with every required part, never a report of what changed.' : '') }, null, 2);
}

// The restate re-ask: only the missing parts are asked for, so the step is never re-run.
export function restatePrompt(step, ask, { continuing, output }) {
  return [`Your report was refused at hand-off: it lacks required parts (${ask.missing.join('; ')}).`,
    ask.human ? `The operator answered: ${ask.human}` : ask.questions?.length ? `The receiving step asks:\n${ask.questions.map(q => `- ${q}`).join('\n')}` : null,
    `Do not run, write or change anything: reply only. Restate your complete deliverable in full, with the changes you already made applied, never a report of what changed. ${FORMAT[step]}`,
    continuing ? null : `Your refused report:\n${output}`].filter(Boolean).join('\n\n');
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
    // What earlier hand-offs already answered, so a question repeated in other words can be recognised.
    carried: (w.asked ?? []).map(({ id, text, turns }) => ({ id, text, turns })),
    instruction: o.handoff === undefined
      ? (o.role === ARBITER.role ? 'Your ruling created this prerequisite work; it is in the source. Answer from it.' : 'You dispatched this work. Answer from the objective and source only.')
      : 'Answer from your own handoff (and the source). Do not change your handoff or the work; clarify what you meant.' }, null, 2);
}

// The receiving step asks the reporting worker for what its report lacks; it sees the report and the list, never the brief.
function refusalPacket(w, attemptId) {
  const a = w.attempts.find(a => a.id === attemptId), rx = nq.findExchange(w, x => nq.isStep(x) && x.subject?.id === attemptId);
  if (!a || !rx) throw new Error('No refused hand-off');
  return JSON.stringify({ purpose: 'refusal', threadId: w.id, workspace: w.cwd, objective: w.objective, source: w.source,
    reportingStep: STEPS[stepIndex(a.step)], receivingStep: STEPS[stepIndex(a.step) + 1], round: w.round,
    required: LABELS[a.step] ?? [FORMAT['test-plan']], missing: checkDeliverable(a.step, a.output ?? '', w.cwd).missing,
    handoff: a.output, exchange: rx.turns,
    instruction: 'The handoff file is the report you are about to receive. Ask the reporting worker, as questions, for exactly what the missing list names. Return ONLY JSON {intent:string, questions:string[], notes:string[]}.' }, null, 2);
}

// The Arbiter's question goes back to whoever's failed step raised it: the check runner, or the maker or check designer that was blocked.
function failurePacket(w, failureId, purpose) {
  const f = w.failures.find(f => f.id === failureId), fx = nq.findExchange(w, x => x.subject?.kind === 'failure' && x.subject.id === failureId);
  if (!f || !fx) throw new Error('No failure exchange');
  const a = w.attempts.find(a => a.id === f.attemptId);
  return JSON.stringify({ purpose, threadId: w.id, workspace: w.cwd, objective: w.objective, source: w.source, failingStep: f.step, round: w.round,
    originator: { role: fx.originator, basis: 'failure', step: f.step }, handoff: a?.output || f.report, exchange: fx.turns, questions: fx.turns.at(-1)?.questions ?? [],
    instruction: 'The Arbiter is ruling on a failure of your step and asked questions. Answer from your own report (the handoff file) and the source. Do not change your report or the work; clarify what you meant.' }, null, 2);
}

// The dispatcher's question goes back to the agent that said only the operator could authorize something.
function authorityPacket(w, axId, purpose) {
  const ax = w.exchanges.find(x => x.id === axId);
  if (ax?.subject?.kind !== 'authority') throw new Error('No authority exchange');
  return JSON.stringify({ purpose, threadId: w.id, workspace: w.cwd, objective: w.objective, source: w.source, round: w.round,
    originator: { role: ax.originator, basis: 'authority' }, handoff: ax.subject.handoff, exchange: ax.turns, questions: ax.turns.at(-1)?.questions ?? [],
    instruction: 'You said only the operator can authorize something. The dispatcher, who holds the operator\'s source, asked what you meant. Answer from your own handoff (the handoff file) and the source. Do not change your handoff or the work.' }, null, 2);
}

// The model reads files, not a pasted transcript that a transport may truncate.
export async function provisionPacket(directory, key, serialized) {
  if (!/^[a-zA-Z0-9-]+$/.test(key)) throw new Error('Invalid packet key');
  const packet = JSON.parse(serialized), folder = join(directory, 'packets', key);
  await mkdir(folder, { recursive: true });
  const save = async (name, text) => { const path = join(folder, name); await writeFile(path, text); return path; };
  const accepted = [];
  for (const [i, c] of (packet.accepted ?? []).entries()) accepted.push({ step: c.step, role: c.role, path: await save(`ACCEPTED-${i}-${c.step}.md`, c.output ?? '') });
  const { source, brief, handoff, previous, accepted: _a, ...rest } = packet;
  const files = { source: await save('SOURCE.md', source) };
  if (brief !== undefined) files.brief = await save('BRIEF.md', brief);
  if (handoff !== undefined) files.handoff = await save('HANDOFF.md', handoff);
  if (previous !== undefined) files.previous = await save('PREVIOUS.md', previous.output ?? '');
  return JSON.stringify({ ...rest, ...files, ...(previous !== undefined ? { previousRound: previous.round } : {}), accepted,
    read: `Read the ${Object.keys(files).join(', ')}${accepted.length ? ' and the accepted contributions' : ''} at these paths before you respond.` }, null, 2);
}
