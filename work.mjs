import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, writeFile, rename, unlink, realpath } from 'node:fs/promises';
import { join, resolve, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as nq from './nq.mjs';
import { STEPS, ARBITER, stepIndex, progressExtension } from './pi-runtime.mjs';
import { runCard } from './pi-call.mjs';
import { buildLaunch } from './cards.mjs';
import { parseResponse } from './pi-stream.mjs';
import { LABELS, FORMAT, checkDeliverable } from './deliverable.mjs';
import { publishWork } from './observe.mjs';
import { sendAlert } from './alert.mjs';
import { BACKGROUND_CONTEXT as context } from '@earendil-works/chord/context';
import { createModels } from '@earendil-works/pi-ai/models';
import { Harness, createRegistry, defineDoc, defineExtension, defineTask } from '@earendil-works/pi-durable';
import { openNodeSqliteStorage } from '@earendil-works/pi-durable/storage/sqlite/node';

export { STEPS };
export const hash = text => createHash('sha256').update(text).digest('hex');
// Identity is independent of a caller's object-key insertion order; source hashes remain byte-exact.
export const identity = value => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
// A worker whose tools can start a sub-agent anyway originates an NQ exchange and answers for it.
export const SUBAGENT_RULE = 'If your tools can start another agent anyway, that is an NQ exchange you originate and answer for: give it a complete brief, have it state its understanding and questions before it works, answer them yourself, stop and report after three turns with questions still open, and put its understanding, your answers and its result in your report.';
export const WORKER_CHANNEL_GUIDE = 'When a worker channel is available, use durable_dispatch (pi) or "$PI_DURABLE_NODE" "$PI_DURABLE_CHANNEL" dispatch <request.json> for any sanctioned nested agent: requestId, receiver (actor/job/card), brief, access. Do not launch an agent by another route. With shell access, report tangible progress using "$PI_DURABLE_NODE" "$PI_DURABLE_CHANNEL" progress <deliverable> <evidence>, and read pending support questions with "$PI_DURABLE_NODE" "$PI_DURABLE_CHANNEL" check-in. A held nested exchange stops only this work; report it, never work around it.';
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
    if (w?.id) {
      if (w.archived) await unlink(join(directory, 'observability', `thread-${id}.json`)).catch(e => { if (e.code !== 'ENOENT') throw e; });
      else await publishWork(directory, w);
    }
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
        if (saved.archived) return terminal({ status: 'archived' });
        if (!['queued', 'running'].includes(prior.status)) return terminal({ status: prior.status });
        const resumed = prior.status === 'running';
        await runtime.commit(async tx => {
          const w = await tx.doc(Work, workId), a = w.attempts.find(a => a.id === attemptId);
          if (resumed && a.runs?.at(-1) && !a.runs.at(-1).endedAt) Object.assign(a.runs.at(-1), { outcome: 'interrupted', interruptedAt: Date.now() });
          a.status = 'running'; a.startedAt ??= Date.now(); a.endedAt = null; a.launches = (a.launches ?? 0) + 1;
          a.runs = [...(a.runs ?? []), { n: a.launches, callId: a.callId, card: a.card, sessionId: a.harnessSession ?? a.sessionId,
            startedAt: Date.now(), endedAt: null, pid: null, exit: null, where: null, record: join('attempts', attemptId, launchName(a)) }];
          syncAttempt(w, a);
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
          system: `You are ${step.role}. ${step.duty} The input is your complete work packet. Do not delegate or change scope. ${SUBAGENT_RULE} ${WORKER_CHANNEL_GUIDE}` });
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
        const location = where => (queue = queue.then(() => runtime.commit(async tx => {
          const w = await tx.doc(Work, workId), a = w.attempts.find(a => a.id === attemptId);
          a.runs.at(-1).where = where; syncAttempt(w, a);
          return { status: 'running', checkpoint: { phase: 'execute' } };
        }, ctx)).then(() => publish(workId)));
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
          result = await runCard({ card, launch, cwd: saved.cwd, prompt, unit: workId, job: prior.step, record: join(channel, launchName({ ...prior, launches: (prior.launches ?? 0) + 1 })), onLine, signal: ctx.abortSignal,
            env: { WORK_DATA: directory, PI_DURABLE_ATTEMPT: attemptId, PI_DURABLE_CHECKIN: inbox },
            nestedDispatch: (input, callbacks) => store.nestedDispatch(workId, { ...input, parentCallId: prior.callId }, callbacks),
            onLaunch: where => location(where), onLocation: where => location(where),
            onSpawn: (pid, where) => runtime.commit(async tx => { const w = await tx.doc(Work, workId), a = w.attempts.find(a => a.id === attemptId); a.pid = pid; Object.assign(a.runs.at(-1), { pid, ...(where ? { where } : {}) }); syncAttempt(w, a); return { status: 'running', checkpoint: { phase: 'execute' } }; }, ctx).then(() => publish(workId)) });
        } finally { clearTimeout(timer); }
        await queue;
        await runtime.commit(async tx => {
          const w = await tx.doc(Work, workId), a = w.attempts.find(a => a.id === attemptId);
          a.endedAt = Date.now(); a.exitCode = result.code; a.output = result.output;
          a.harnessSession = result.sessionId ?? a.harnessSession ?? null;
          a.runs = a.runs.map((r, i) => i === a.runs.length - 1 ? { ...r, endedAt: a.endedAt, exit: result.signal ?? result.code, toolCalls: result.toolCalls, card, where: result.where ?? r.where } : r);
          a.limit = result.limit ?? null;
          a.status = result.ok ? 'reported' : 'failed';
          a.error = result.ok ? '' : result.limit ? `usage limit: ${result.limit.message}`
            : (result.signal ?? result.error) || `${card.harness} exited ${result.code}`;
          event(w, a.status, { attemptId, step: a.step, ...(result.limit ? { limit: result.limit } : {}) });
          const restated = Boolean(a.askRestate && result.ok);
          if (restated) {
            // The restated deliverable answers the receiving step's question; a human answer is confirmed by the receiver's own intake.
            const rx = w.exchanges.find(x => x.id === a.askRestate.exchangeId);
            if (!a.askRestate.human && rx?.status === 'awaiting-originator') nq.originatorReply(w, rx.id, a.role, `Restated in full as revision ${a.revisions.length} of attempt ${a.id}; the restated deliverable is the hand-off.`);
            a.restatedFor = rx.turns.length; a.askRestate = null;
          }
          syncAttempt(w, a);
          if (restated) applyCall(w, a.callId);
          if (a.step === 'discover' && !a.askRestate) finishOperation(w, 'scope-and-items', { attemptId: a.id, callId: a.callId, output: a.output, record: a.runs.at(-1).record }, a.status);
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

  // Intake, clarification and decisions are ordinary Pi Durable tasks, on this same Work document.
  // A saved output is a checkpoint: redrive applies it, never buys another answer.
  const callers = new Map();
  const Call = defineTask({
    name: 'work.call', version: 1, initial: () => ({ phase: 'call' }),
    phases: { call: async (task, runtime, ctx) => {
      const { workId, callId } = task.input;
      const saved = await harness.snapshot(Work, workId, ctx), prior = saved.calls.find(c => c.id === callId);
      if (saved.archived) return terminal({ outcome: 'archived' });
      if (prior.result || ['reported', 'limited', 'failed'].includes(prior.outcome)) return terminal({ outcome: prior.outcome });
      const resumed = prior.runs.length > 0, record = join(directory, 'calls', callId, `launch-${prior.runs.length + 1}`);
      await runtime.commit(async tx => {
        const w = await tx.doc(Work, workId), c = w.calls.find(c => c.id === callId);
        if (c.outcome === 'running' && c.runs.at(-1)) Object.assign(c.runs.at(-1), { outcome: 'interrupted', interruptedAt: Date.now() });
        c.outcome = 'running'; c.startedAt ??= Date.now(); c.endedAt = null; c.record = record; w.activeCall = c.id;
        c.runs.push({ n: c.runs.length + 1, card: c.card, sessionId: c.card.harness === 'codex' ? c.harnessSession ?? null : c.harnessSession ?? c.sessionId,
          startedAt: Date.now(), endedAt: null, pid: null, exit: null, record, where: null });
        event(w, 'call-started', { callId, kind: c.kind, step: c.step, card: c.card });
        return { status: 'running', checkpoint: { phase: 'call' } };
      }, ctx);
      await publish(workId);
      let queue = Promise.resolve();
      const checkpoint = fn => (queue = queue.then(() => runtime.commit(async tx => {
        const w = await tx.doc(Work, workId), c = w.calls.find(c => c.id === callId); fn(c, w);
        return { status: 'running', checkpoint: { phase: 'call' } };
      }, ctx)).then(() => publish(workId)));
      const location = where => checkpoint(c => { c.where = where; c.runs.at(-1).where = where; });
      const options = { ...prior.options, system: `${prior.options.system} ${WORKER_CHANNEL_GUIDE}`,
        card: prior.card, cwd: saved.cwd, record, unit: workId, job: prior.kind,
        prompt: prior.options.packet ? await provisionPacket(directory, callId, prior.options.packet) : prior.options.prompt,
        env: { ...prior.options.env, WORK_DATA: directory, PI_DURABLE_ATTEMPT: callId },
        sessionId: prior.card.harness === 'codex' ? prior.harnessSession ?? undefined : prior.harnessSession ?? prior.sessionId, sessionDir: join(directory, 'sessions', callId),
        resume: resumed && (prior.card.harness !== 'codex' || Boolean(prior.harnessSession)), signal: ctx.abortSignal,
        nestedDispatch: (input, callbacks) => store.nestedDispatch(workId, { ...input, parentCallId: callId }, callbacks),
        onSpawn: (pid, where) => checkpoint(c => { c.pid = pid; c.runs.at(-1).pid = pid; if (where) c.where = c.runs.at(-1).where = where; }),
        onLaunch: location, onLocation: location,
        onLine: entry => {
          if (entry.type === 'thread.started' && entry.thread_id) checkpoint(c => { c.harnessSession = c.runs.at(-1).sessionId = entry.thread_id; });
          const p = entry.type === 'tool_execution_end' && entry.toolName === 'durable_progress' && !entry.isError ? entry.result?.details?.durableProgress : null;
          if (p?.attemptId === callId) checkpoint((c, w) => {
            c.progress ??= [];
            c.progress.push({ deliverable: p.deliverable, evidence: p.evidence, at: Date.now() });
            event(w, 'progress', { callId, deliverable: p.deliverable });
          });
        } };
      if (resumed) {
        const instruction = 'Continue this same saved call from where it stopped. Inspect saved evidence; do not redo completed work. Return the required response shape.';
        try { options.prompt = JSON.stringify({ ...JSON.parse(options.prompt), resumeInstruction: instruction }); }
        catch { options.prompt = `${instruction}\n\n${options.prompt}`; }
      }
      let result;
      try {
        const caller = callers.get(callId);
        if (caller) result = await caller(options);
        else {
          const launch = buildLaunch(prior.card, { access: options.access, system: options.system,
            sessionId: options.sessionId, sessionDir: options.sessionDir, resume: options.resume, readDirs: [directory] });
          result = await runCard({ ...options, launch });
          if (!result.ok && !result.limit) throw new Error(`${prior.card.harness} call failed: ${result.error || result.code}`);
        }
        if (!result || !result.limit && typeof result.output !== 'string') throw new Error('Launcher must return output or a quota limit');
      } catch (error) { if (ctx.abortSignal.aborted) throw error; result = { error: error.message }; }
      await queue;
      await runtime.commit(async tx => {
        const w = await tx.doc(Work, workId), c = w.calls.find(c => c.id === callId);
        c.endedAt = Date.now(); c.result = JSON.parse(JSON.stringify(result));
        c.harnessSession = result.sessionId ?? c.harnessSession ?? null;
        if (c.harnessSession) c.runs.at(-1).sessionId = c.harnessSession;
        c.outcome = result.limit ? 'limited' : result.error ? 'failed' : 'reported';
        const r = c.runs.at(-1); r.endedAt = c.endedAt; r.exit = result.signal ?? result.code ?? (result.error ? -1 : 0);
        r.outcome = c.outcome; r.error = result.error ?? null; r.where = result.where ?? r.where; c.where = r.where;
        if (w.activeCall === c.id) w.activeCall = null;
        event(w, 'call', { callId, kind: c.kind, step: c.step, card: `${c.card.harness} · ${c.card.model}`,
          run: r.n, startedAt: r.startedAt, endedAt: r.endedAt, ms: r.endedAt - r.startedAt, ok: c.outcome === 'reported',
          limit: Boolean(result.limit), record: c.record });
        return terminal({ outcome: c.outcome });
      }, ctx);
      callers.delete(callId);
      await publish(workId);
    } },
  });
  const registry = createRegistry();
  registry.install(defineExtension({ name: 'work', tasks: [Attempt, Call] }));
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
  // Cancellation does not enable the scheduler. Mark every persisted task in archived conversations,
  // including tasks an older redrive stopped referencing. A later resume can only run their aborts.
  const cancelArchived = async ids => {
    const wanted = new Set(ids), tasks = (await harness.inspect(context)).tasks.map(t => t.record).filter(t => wanted.has(t.conversationId));
    for (const t of tasks) await harness.abortTask(t.id, context);
    for (const id of ids) {
      const receipts = [];
      for (const t of tasks.filter(t => t.conversationId === id)) {
        const saved = await harness.getTask(t.id, context);
        if (saved.state.status !== 'terminal' && !saved.abortRequested) throw new Error(`Archive did not cancel task ${t.id}`);
        receipts.push({ taskId: t.id, status: saved.state.status, abortRequested: saved.abortRequested });
      }
      if (receipts.length) await change(id, w => {
        w.archiveTasks = [...(w.archiveTasks ?? []).filter(r => !receipts.some(t => t.taskId === r.taskId)), ...receipts];
        event(w, 'history-tasks-cancelled', { taskIds: receipts.map(r => r.taskId) });
      });
    }
  };
  const step = w => { const s = STEPS[w.position]; if (w.completion || !s) throw new Error('Thread is complete'); return s; };
  const fresh = (objective, source, cwd, extra = {}) => ({ objective, source, cwd, position: 0, round: 0, briefs: {}, briefHistory: [],
    exchanges: [], asked: [], attempts: [], calls: [], activeCall: null, operations: [], failures: [], notes: [], hold: null, waitsOn: null, parentId: null, kind: 'discovery', completion: null, events: [], ...extra });
  const queueAttempt = async (tx, w, a, kind) => {
    const previousCall = w.calls?.find(c => c.id === a.callId);
    if (previousCall?.outcome === 'reported') applyCall(w, previousCall.id);
    a.callId = randomUUID();
    a.taskId = await tx.createTask(Attempt, { workId: w.id, attemptId: a.id, callId: a.callId }, { ownership: { kind: 'conversation' }, conversationId: w.id });
    const x = kind === 'restate' ? w.exchanges.find(x => x.id === a.askRestate.exchangeId) : nq.currentExchange(w, a.step);
    w.calls ??= [];
    w.calls.push({ id: a.callId, key: a.callId, taskId: a.taskId, kind, step: a.step, job: a.step, actor: a.actor,
      card: a.card, access: kind === 'restate' ? 'read' : a.access, sessionId: a.harnessSession ?? a.sessionId, parent: x?.parent ?? null, source: a.id,
      subject: x?.subject ?? null, exchangeId: x?.id ?? null, turn: x?.turns.length ?? null,
      briefHash: x?.briefHash ?? null, startedAt: null, endedAt: null, outcome: 'queued', result: null, runs: [], where: null, appliedAt: null });
    w.activeCall = a.callId;
  };
  const createIn = async (tx, fields) => {
    const c = await tx.createConversation({ ownership: { kind: 'ownerless' } });
    const w = await tx.doc(Work, c.id);
    Object.assign(w, { id: c.id, ...fields });
    if (w.kind === 'discovery') {
      startOperation(w, 'source-preserved', { hash: hash(w.source) });
      finishOperation(w, 'source-preserved', { hash: hash(w.source), field: 'source' });
    }
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
        `${w.source}\n\n## Prerequisite of thread ${w.id}\nAuthorized (operator rule, 2026-10-16): the Arbiter's pre-existing ruling authorizes this repair inside the workspace, with reversible changes and no new dependencies. Anything destructive, irreversible, touching production, money, credentials or anything outside the workspace is still the operator's.\nScope: fix only this defect. Thread ${w.id} is unfinished and waits for this fix, so its own checks are expected to fail: this unit's checks test only this fix and must not run or depend on thread ${w.id}'s checks.\n\n${question}`, w.cwd, { position: stepIndex('plan'), parentId: w.id, depth: (w.depth ?? 0) + 1, kind: 'fix', dispatcher: w.dispatcher, routedFrom: { sender: failure.sender ?? null, exchange: failure.exchange ?? null, workId: w.id, failureId: failure.id } }));
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

  // Projections are disposable: opening the authority repairs a lost post-commit publish.
  const reopening = (await harness.snapshot(Catalog, root.id, context))?.threads ?? [], archived = [];
  for (const id of reopening) {
    const w = await harness.snapshot(Work, id, context);
    if (w.archived) archived.push(id);
    await publish(id);
  }
  await cancelArchived(archived);
  if (resume) harness.resume(); // redrive: any step a dead process left running continues now
  const store = {
    directory,
    alertPending: alertIfNew,
    async close() { await views; await alerts; try { await harness.close(context); } finally { await lock.close(); await unlink(lockPath).catch(() => {}); } },
    async list() { return (await harness.snapshot(Catalog, root.id, context))?.threads ?? []; },
    async call(id, input, caller) {
      requireText(input.key, 'Call key');
      const exhausted = await this.exhausted();
      const callId = await change(id, async (w, tx) => {
        w.calls ??= [];
        const old = w.calls.find(c => c.key === input.key);
        if (old) { if (caller) callers.set(old.id, caller); return old.id; }
        nq.noHold(w);
        const x = w.exchanges.find(x => x.id === input.exchangeId);
        if (!x) throw new Error('A call must bind to its exchange');
        if (input.kind === 'originator') {
          if (x.status !== 'awaiting-originator' || input.actor !== x.originator) throw new Error('Only the bound sender can answer the pending question');
          if (x.sender?.card && identity(x.sender.card) !== identity(input.card)
            && (!(exhausted[x.sender.card.account] > Date.now()) || input.card.account === x.sender.card.account)) throw new Error('A sender card changes only for a recorded quota substitution');
        } else if (input.kind === 'intake' || input.kind.includes('intake') || input.kind === 'refusal') {
          if (x.status !== 'awaiting-worker' || input.actor !== x.worker) throw new Error('Only the bound receiver can do pending intake');
        } else {
          if (x.status !== 'clear' || input.actor !== x.worker) throw new Error('NQ must clear for this receiver before the call executes');
          if (x.receiver?.card && identity(x.receiver.card) !== identity(input.card)) throw new Error('A replacement receiver must confirm intake before execution');
        }
        const c = { id: randomUUID(), key: input.key, kind: input.kind, step: input.step, job: input.job,
          actor: input.actor, card: input.card, sessionId: randomUUID(), harnessSession: null,
          parent: x.parent, source: x.handoffId, subject: x.subject, exchangeId: x.id, turn: x.turns.length,
          briefHash: x.briefHash, startedAt: null, endedAt: null, outcome: 'queued', result: null,
          where: null, runs: [], appliedAt: null, options: input.options };
        c.record = join(directory, 'calls', c.id);
        if (caller) callers.set(c.id, caller);
        c.taskId = await tx.createTask(Call, { workId: id, callId: c.id }, { ownership: { kind: 'conversation' }, conversationId: id });
        w.calls.push(c); w.activeCall = c.id;
        const p = participant({ card: c.card, step: c.kind === 'originator' ? x.sender?.job ?? c.step : ['authority', 'return'].includes(x.step) ? 'dispatcher' : x.step, sessionId: c.sessionId }, c.actor);
        if (c.kind === 'originator') {
          if (x.sender?.card && identity(x.sender.card) !== identity(c.card)) {
            x.senderReplacements ??= [];
            x.senderReplacements.push({ from: x.sender, to: p, reason: 'quota', callId: c.id });
          }
        } else x.receiver = p;
        event(w, 'call-assigned', { callId: c.id, kind: c.kind, step: c.step, exchangeId: x.id });
        return c.id;
      });
      const c = (await this.get(id)).calls.find(c => c.id === callId);
      if (!['reported', 'limited', 'failed'].includes(c.outcome)) await harness.waitForTask(c.taskId, context);
      const done = (await this.get(id)).calls.find(c => c.id === callId);
      if (!done.result) throw new Error(`Call task did not return a result: ${done.id}`);
      if (done.result.error) {
        const x = (await this.get(id)).exchanges.find(x => x.id === done.exchangeId);
        if (done.card.harness === 'codex' && !done.harnessSession && x.status === 'clear' && done.kind !== 'originator'
          && (x.replacements ?? []).filter(r => r.reason === 'session-unavailable').length < 2) {
          await this.replaceReceiver(id, x.id, done.card, 'session-unavailable');
          return { needsIntake: true, callId: done.id };
        }
        if (done.runs.length < 3) {
          await change(id, async (w, tx) => {
            const c = w.calls.find(c => c.id === callId);
            c.taskIds ??= [c.taskId];
            c.outcome = 'queued'; c.result = null;
            c.taskId = await tx.createTask(Call, { workId: id, callId }, { ownership: { kind: 'conversation' }, conversationId: id });
            c.taskIds.push(c.taskId); w.activeCall = c.id;
            event(w, 'call-redrive', { callId, taskId: c.taskId });
          });
          return this.call(id, input, caller);
        }
        throw Object.assign(new Error(done.result.error), { callId });
      }
      return { ...done.result, callId: done.id };
    },
    async get(id) { const w = await harness.snapshot(Work, id, context); if (!w?.id) throw new Error(`Unknown thread ${id}`); return w; },
    async nestedDispatch(id, input, callbacks = {}) {
      requireText(input.requestId, 'Nested request ID'); requireText(input.brief, 'Nested brief');
      if (!input.receiver?.actor || !input.receiver?.job || !input.receiver?.card?.harness || !input.receiver.card.provider || !input.receiver.card.account || !input.receiver.card.model) throw new Error('Nested receiver needs an actor, job and full card');
      if (!['read', 'run', 'checks', 'make'].includes(input.access ?? 'read')) throw new Error('Unknown nested access');
      const fingerprint = hash(identity([input.parentCallId, input.receiver, input.brief, input.access ?? 'read']));
      await change(id, w => {
        w.nested ??= [];
        const old = w.nested.find(n => n.requestId === input.requestId);
        if (old) { if (old.fingerprint !== fingerprint) throw new Error('Nested request ID has different content'); return; }
        const parent = w.calls?.find(c => c.id === input.parentCallId);
        if (parent?.outcome !== 'running') throw new Error('Nested sender must be a running parent call');
        const allowed = { read: ['read'], run: ['read', 'run'], checks: ['read', 'run', 'checks'], make: ['read', 'run', 'checks', 'make'] };
        if (!(allowed[parent.access ?? parent.options?.access ?? 'read'] ?? []).includes(input.access ?? 'read')) throw new Error('Nested dispatch cannot grant more authority than its parent call');
        const sender = participant({ card: parent.card, step: parent.job, sessionId: parent.sessionId }, parent.actor);
        const exchangeId = bindExchange(w, nq.delegate(w, input.receiver.job, sender.actor, input.receiver.actor,
          { kind: 'nested', id: input.requestId, parent: parent.id }), { ...sender, role: sender.actor, handoff: input.brief }, input.brief);
        const x = w.exchanges.find(x => x.id === exchangeId); x.parent = parent.id; x.receiver = input.receiver;
        w.nested.push({ requestId: input.requestId, fingerprint, parentCallId: parent.id, sender, receiver: input.receiver,
          brief: input.brief, access: input.access ?? 'read', exchangeId, returnExchangeId: null, callId: null, result: null });
        event(w, 'nested-dispatched', { parentCallId: parent.id, exchangeId, requestId: input.requestId });
      });
      for (;;) {
        const w = await this.get(id), n = w.nested.find(n => n.requestId === input.requestId);
        if (n.acceptedAt) return { status: 'reported', exchangeId: n.exchangeId, callId: n.callId, output: n.result.output };
        if (w.hold) return { status: 'held', exchangeId: w.hold.ref, hold: w.hold };
        const x = w.exchanges.find(x => x.id === (n.returnExchangeId ?? n.exchangeId));
        const returning = Boolean(n.returnExchangeId);
        const invoke = async (kind, receiver, callback, system, prompt, access = 'read') => this.call(id, {
          key: `${input.requestId}:${x.id}:${x.turns.length}:${kind}`, kind, step: x.step, job: receiver.job,
          actor: receiver.actor, card: receiver.card, exchangeId: x.id,
          options: { access, system, packet: JSON.stringify(prompt), readDirs: [directory] },
        }, callback);
        const packet = { purpose: returning ? 'nested-return' : 'nested', threadId: id, workspace: w.cwd, source: w.source,
          brief: n.brief, handoff: returning ? n.result.output : n.brief, exchange: x.turns,
          sender: x.sender, receiver: x.receiver, parentCallId: n.parentCallId, protocol: WORKER_CHANNEL_GUIDE };
        if (x.status === 'awaiting-worker') {
          const result = await invoke(returning ? 'nested-return-intake' : 'nested-intake', returning ? n.sender : n.receiver,
            returning ? callbacks.receive : callbacks.intake,
            'You are the receiving agent in read-only intake before execution. Return ONLY JSON {intent:string, questions:string[], notes:string[]}.', packet);
          if (result.limit) return { status: 'limited', exchangeId: x.id, callId: result.callId };
          await this.nq(id, x.id, parseResponse(result.output), x.worker, result.callId); continue;
        }
        if (x.status === 'awaiting-originator') {
          const result = await invoke('originator', returning ? n.receiver : n.sender, callbacks.answer,
            'You originated this agent handoff. Answer only from your fixed brief and source; do not change scope. Return ONLY JSON {answer:string}.', packet);
          if (result.limit) return { status: 'limited', exchangeId: x.id, callId: result.callId };
          const reply = parseResponse(result.output);
          await this.answer(id, x.id, x.originator, reply.answer, reply.same, result.callId); continue;
        }
        if (x.status !== 'clear') return { status: 'held', exchangeId: x.id, hold: w.hold };
        if (returning) {
          await change(id, w => { const n = w.nested.find(n => n.requestId === input.requestId); n.acceptedAt = Date.now();
            w.activeCall = w.calls.find(c => c.id === n.parentCallId && c.outcome === 'running')?.id ?? null;
            event(w, 'nested-returned', { exchangeId: x.id, callId: n.callId }); });
          continue;
        }
        const result = await invoke('nested-execute', n.receiver, callbacks.execute,
          `You are ${n.receiver.job}. Execute only the cleared brief; preserve the complete NQ exchange.`, packet, n.access);
        if (result.limit) return { status: 'limited', exchangeId: x.id, callId: result.callId };
        if (result.needsIntake) continue;
        await change(id, w => {
          const n = w.nested.find(n => n.requestId === input.requestId), x = w.exchanges.find(x => x.id === n.exchangeId);
          if (x.status !== 'clear') throw new Error('Nested NQ must clear before execution result');
          n.result = { output: result.output }; n.callId = result.callId; applyCall(w, result.callId);
          n.returnExchangeId = bindExchange(w, nq.delegate(w, n.sender.job, n.receiver.actor, n.sender.actor,
            { kind: 'nested-return', id: input.requestId, parent: n.exchangeId }),
            { ...n.receiver, role: n.receiver.actor, handoff: result.output }, 'Receive the nested report against the assigned brief.');
          w.exchanges.find(x => x.id === n.returnExchangeId).receiver = n.sender;
        });
      }
    },
    async requestReceipt(requestId) {
      requireText(requestId, 'Request ID');
      return (await harness.snapshot(Catalog, root.id, context))?.requests?.[requestId]?.result ?? null;
    },
    async applyRequest(request) {
      requireText(request?.requestId, 'Request ID');
      const fingerprint = hash(identity(request));
      const receipt = (await harness.snapshot(Catalog, root.id, context))?.requests?.[request.requestId];
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) throw new Error('Request ID was already used for different content');
        return { ...receipt.result, reused: true };
      }
      // Filesystem validation is outside the transaction; the application and acknowledgement are not.
      let cwd;
      if (request.type === 'create') {
        requireText(request.objective, 'Objective'); requireText(request.source, 'Source');
        cwd = await realpath(request.cwd);
        if (!['discovery', 'delivery'].includes(request.kind ?? 'discovery')) throw new Error('kind is discovery or delivery');
      }
      const result = await harness.commit(async tx => {
        const catalog = await tx.doc(Catalog, root.id); catalog.requests ??= {};
        const old = catalog.requests[request.requestId];
        if (old) {
          if (old.fingerprint !== fingerprint) throw new Error('Request ID was already used for different content');
          return { ...old.result, reused: true };
        }
        let result;
        if (request.type === 'create') {
          const id = await createIn(tx, fresh(request.objective, request.source, cwd,
            { kind: request.kind ?? 'discovery', dispatcher: request.dispatcher ?? null, intake: { requestId: request.requestId, cwd } }));
          event(await tx.doc(Work, id), 'created', { requestId: request.requestId }); result = { id };
        } else {
          const w = await tx.doc(Work, request.id);
          if (!w.id) throw new Error('Unknown thread');
          if (request.type === 'first') {
            const bucket = w.kind === 'discovery' ? w.id : w.from;
            if (!bucket) throw new Error('Thread is not in a discovery bucket');
            catalog.first = [bucket, ...(catalog.first ?? []).filter(id => id !== bucket)]; result = { first: bucket };
          } else if (request.type === 'answer') {
            requireText(request.text, 'Answer');
            if (!w.hold) throw new Error('Nothing is waiting on a human');
            if (w.hold.kind === 'nq') nq.humanAnswer(w, w.hold.ref, request.actor ?? 'operator', request.text);
            else {
              if (!CAUSES.includes(request.cause)) throw new Error('A failed test needs its cause');
              const f = w.failures.find(f => f.id === w.hold.ref); w.hold = null; f.status = 'open';
              await route(w, tx, f, { cause: request.cause, answer: request.text, by: request.actor ?? 'operator' });
            }
            result = { answered: w.id };
          } else if (request.type === 'return') result = returnAction(w, request);
          else throw new Error('Unknown request type');
          event(w, 'request-applied', { requestId: request.requestId, requestType: request.type });
        }
        catalog.requests[request.requestId] = { fingerprint, result, acknowledgedAt: Date.now() };
        return result;
      }, context);
      // A failure here cannot un-acknowledge committed work; opening the store rebuilds views.
      for (const id of await this.list()) await publish(id);
      if (result.id ?? result.answered) await alertIfNew(result.id ?? result.answered);
      return result;
    },
    async relocateWorkspace(from, to) {
      if (!isAbsolute(from)) throw new Error('Source workspace must be absolute');
      from = resolve(from); to = await realpath(to);
      const ids = await harness.commit(async tx => {
        const ids = [], catalog = await tx.doc(Catalog, root.id);
        for (const id of catalog.threads) {
          const w = await tx.doc(Work, id), cwd = rebasePath(w.cwd, from, to);
          if (cwd === w.cwd) continue;
          w.cwd = cwd;
          if (w.intake?.cwd) w.intake.cwd = rebasePath(w.intake.cwd, from, to);
          for (const a of w.attempts ?? []) if (['queued', 'running', 'failed', 'replacement-intake'].includes(a.status)) {
            a.packetHistory ??= [];
            a.packetHistory.push({ packet: a.packet, at: Date.now(), reason: 'workspace-relocated' });
            a.packet = relocatePacket(a.packet, from, to);
          }
          for (const c of w.calls ?? []) if (['queued', 'running'].includes(c.outcome) && c.options) {
            c.packetHistory ??= [];
            c.packetHistory.push({ options: c.options, at: Date.now(), reason: 'workspace-relocated' });
            c.options = { ...c.options, cwd,
              ...(typeof c.options.prompt === 'string' ? { prompt: relocatePacket(c.options.prompt, from, to) } : {}),
              ...(c.options.packet ? { packet: relocatePacket(c.options.packet, from, to) } : {}) };
          }
          event(w, 'workspace-relocated', { from, to }); ids.push(id);
        }
        return ids;
      }, context);
      for (const id of ids) await publish(id);
      return { ids };
    },
    async archiveResolved(ids, { reason } = {}) {
      requireText(reason, 'Archive reason');
      const inspection = await harness.inspect(context);
      if (inspection.scheduling !== 'paused' && inspection.tasks.some(t => ids.includes(t.record.conversationId))) throw new Error('Cannot archive live work; open the stopped store without resume');
      await harness.commit(async tx => {
        for (const id of ids) {
          const w = await tx.doc(Work, id);
          if (!w.id) throw new Error('Unknown thread');
          const pending = (w.attempts ?? []).filter(a => ['queued', 'running'].includes(a.status));
          const calls = (w.calls ?? []).filter(c => ['queued', 'running'].includes(c.outcome));
          if ((pending.length || calls.length) && (resume || [...pending, ...calls].some(a => a.pid && alive(a.pid)))) throw new Error('Cannot archive live work; open the stopped store without resume');
          for (const a of pending) { a.priorStatus = a.status; a.status = 'archived'; }
          for (const c of calls) { c.priorOutcome = c.outcome; c.outcome = 'archived'; }
          w.activeCall = null;
          w.archived = true; w.archivedAt = Date.now(); w.archiveReason = reason;
          if (!Object.hasOwn(w, 'priorCompletion')) w.priorCompletion = w.completion;
          w.completion ||= 'archived';
          event(w, 'history-archived', { reason });
        }
      }, context);
      await cancelArchived(ids);
      for (const id of ids) await publish(id);
      return { ids };
    },
    // kind 'discovery' (the default): discovery splits into delivery items that join the queue.
    // kind 'delivery': one item, every phase in this thread.
    async create(objective, source, cwd, { delivery = false, kind = delivery ? 'delivery' : 'discovery', dispatcher = null } = {}) {
      requireText(objective, 'Objective'); requireText(source, 'Source'); cwd = await realpath(cwd);
      if (!['discovery', 'delivery'].includes(kind)) throw new Error('kind is discovery or delivery');
      const id = await harness.commit(tx => createIn(tx, fresh(objective, source, cwd, { kind, dispatcher })), context);
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
        const x = nq.currentExchange(w, s.name);
        if (x && x.brief == null) Object.assign(x, { brief: text, briefHash: hash(text) });
        event(w, 'brief-sealed', { step: s.name, round: w.round });
      });
    },
    // The answering party is never chosen by the caller: it is whoever made this handoff.
    async delegate(id, worker) { return change(id, w => {
      const s = step(w), o = originatorOf(w);
      return bindExchange(w, nq.delegate(w, s.name, o.role, worker), o, w.briefs[s.name]?.text);
    }); },
    async originator(id) { const w = await this.get(id); step(w); return originatorOf(w); },
    async nq(id, exchangeId, response, actor, callId) { return change(id, w => {
      if (w.calls?.find(c => c.id === callId)?.appliedAt) return;
      assertCall(w, callId, exchangeId);
      const result = nq.workerReply(w, exchangeId, actor, response); applyCall(w, callId);
      const x = w.exchanges.find(x => x.id === exchangeId);
      if (w.kind === 'discovery' && x.step === 'discover' && x.status === 'clear') {
        startOperation(w, 'understanding', { exchangeId }, Date.parse(x.createdAt));
        finishOperation(w, 'understanding', { exchangeId, callId: callId ?? null, intent: response.intent });
      }
      return result;
    }); },
    async answer(id, exchangeId, actor, text, same = [], callId) { return change(id, w => {
      if (w.calls?.find(c => c.id === callId)?.appliedAt) return;
      assertCall(w, callId, exchangeId);
      const result = nq.originatorReply(w, exchangeId, actor, text, same); applyCall(w, callId); return result;
    }); },
    async replaceReceiver(id, exchangeId, card, reason = 'quota') {
      return change(id, w => {
        nq.noHold(w);
        const x = w.exchanges.find(x => x.id === exchangeId);
        const outgoing = w.calls?.findLast(c => c.exchangeId === exchangeId && c.outcome === (reason === 'quota' ? 'limited' : 'failed'));
        if (!x || !outgoing || !['quota', 'session-unavailable'].includes(reason)) throw new Error('A receiver changes only for a recorded quota limit or unavailable session');
        x.replacements ??= [];
        x.replacements.push({ receiver: x.receiver, callId: outgoing.id, reason, at: Date.now() });
        x.pickup = { from: outgoing.card, session: outgoing.harnessSession ?? outgoing.sessionId, reason,
          lastOutput: outgoing.result?.output ?? '', limit: outgoing.result.limit ?? null, workspace: workspaceState(w.cwd),
          pendingQuestions: x.turns.findLast(t => t.type === 'worker')?.questions ?? [] };
        x.worker = `${x.receiver?.job ?? x.step}-${randomUUID()}`;
        x.receiver = participant({ card, step: x.step }, x.worker); x.status = 'awaiting-worker'; x.decision = null;
        const nested = w.nested?.find(n => n.exchangeId === x.id);
        if (nested) nested.receiver = { ...nested.receiver, actor: x.worker, card, sessionId: null };
        event(w, 'receiver-replaced', { exchangeId, from: outgoing.card, to: card });
      });
    },
    async reopenQuestion(id, exchangeId, questions, callId) {
      return change(id, w => {
        if (w.calls?.find(c => c.id === callId)?.appliedAt) return;
        const x = w.exchanges.find(x => x.id === exchangeId);
        assertCall(w, callId, exchangeId);
        nq.noHold(w);
        if (x?.status !== 'clear') throw new Error('Only a cleared receiver can raise an execution question');
        x.status = 'awaiting-worker'; x.decision = null;
        nq.workerReply(w, x.id, x.worker, { intent: 'New information encountered during execution.', questions });
        applyCall(w, callId);
      });
    },
    async decision(id, exchangeId, ruling, callId) {
      return change(id, w => {
        if (w.calls?.find(c => c.id === callId)?.appliedAt) return;
        assertCall(w, callId, exchangeId);
        const x = w.exchanges.find(x => x.id === exchangeId);
        nq.noHold(w);
        if (x?.status !== 'clear') throw new Error('NQ must clear before a decision');
        x.decision = { ...ruling, callId: callId ?? null, at: Date.now() }; applyCall(w, callId);
      });
    },
    async delegateReturn(id) { return change(id, finalReturn); },
    async returnPacket(id) {
      const w = await this.get(id), x = nq.findExchange(w, x => x.subject?.kind === 'return');
      if (!x) throw new Error('No final return exchange');
      return JSON.stringify({ purpose: 'return', threadId: id, workspace: w.cwd, objective: w.objective, source: w.source,
        sender: x.sender, receiver: w.dispatcher ?? x.receiver, exchange: x.turns, exchangeId: x.id,
        handoff: w.attempts.filter(a => a.status === 'accepted').map(a => `${a.step}:\n${a.output}`).join('\n\n'),
        items: w.items ?? [], instruction: 'Receive this final report against the source. State understanding and any unresolved questions; do not redo the work.' });
    },
    async returnReply(id, input, callId) { return change(id, w => {
      if (w.calls?.find(c => c.id === callId)?.appliedAt) return;
      const x = nq.findExchange(w, x => x.subject?.kind === 'return');
      assertCall(w, callId, x?.id);
      const result = returnAction(w, input); applyCall(w, callId); return result;
    }); },
    // A failed check or a blocked maker hands its question to the Arbiter: an NQ exchange the failing attempt's role originates.
    async delegateFailure(id, failureId, worker) {
      return change(id, w => {
        const f = w.failures.find(f => f.id === failureId);
        if (!f) throw new Error('Unknown failure');
        const a = w.attempts.find(a => a.id === f.attemptId);
        return bindExchange(w, nq.delegate(w, 'arbitrate', a.role, worker, { kind: 'failure', id: failureId }),
          { role: a.role, step: a.step, actor: a.actor, card: a.card, sessionId: a.harnessSession ?? a.sessionId, attemptId: a.id, handoff: a.output || f.report }, 'Inspect the failure handoff and confirm readiness before ruling.');
      });
    },
    // The originator said only the operator can authorize something: the dispatcher, who holds the operator's source, is consulted.
    async delegateAuthority(id, parentId, originatorRole, worker, handoff, callId) {
      return change(id, w => {
        const parent = w.exchanges.find(x => x.id === parentId);
        if (!parent) throw new Error('Unknown exchange');
        assertCall(w, callId, parentId); applyCall(w, callId);
        return bindExchange(w, nq.delegate(w, 'authority', originatorRole, worker, { kind: 'authority', parent: parentId, turn: parent.turns.length, handoff }),
          { ...parent.sender, role: originatorRole, handoff }, 'Read the operator source and confirm readiness before deciding authority.');
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
        if (x.rounds < 3) throw new Error('The originator must answer three turns before a human hold');
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
        if (w.waitsOn) throw new Error('Prerequisite completion and return intake are required before execution');
        if (!b) throw new Error(`Seal a brief for ${s.name} first`);
        const x = nq.readyExchange(w, s.name, actor);
        if (x.briefHash && x.briefHash !== b.hash) throw new Error('NQ clearance belongs to a different sealed brief');
        if (x.receiver?.card && identity(x.receiver.card) !== identity(card)) throw new Error('A replacement card must confirm intake before execution');
        if (w.attempts.some(a => a.step === s.name && a.round === w.round && ['queued', 'running', 'replacement-intake'].includes(a.status))) throw new Error('A worker is already on this step');
        const a = { id: randomUUID(), step: s.name, role: s.role, round: w.round, actor, card, access, model: `${card.harness} · ${card.provider}/${card.model}`,
          sessionId: randomUUID(), harnessSession: null, swaps: [], status: 'queued',
          packet: makePacket(w, s, b, 'execute'), progress: [], checkIns: [], createdAt: Date.now() };
        await queueAttempt(tx, w, a, 'execute');
        if (a.step === 'discover') startOperation(w, 'scope-and-items', { attemptId: a.id, callId: a.callId });
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
        await queueAttempt(tx, w, a, 'verdict');
        event(w, 'verdict-asked', { attemptId });
      });
    },
    // A hand-off missing its required parts opens the receiving step's own exchange early; the receiving step's agent asks.
    async refuse(id, attemptId, worker, missing) {
      return change(id, w => {
        const a = w.attempts.find(a => a.id === attemptId), s = step(w);
        if (!a || a.step !== s.name || a.round !== w.round || a.status !== 'reported' || !STEPS[w.position + 1]) throw new Error('Only the current reported step can be refused');
        applyCall(w, a.callId);
        const id = bindExchange(w, nq.delegate(w, STEPS[w.position + 1].name, s.role, worker, { kind: 'step', id: attemptId }),
          { role: a.role, actor: a.actor, step: a.step, card: a.card, sessionId: a.harnessSession ?? a.sessionId, attemptId: a.id, handoff: a.output });
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
        await queueAttempt(tx, w, a, 'restate');
        event(w, 'restate-asked', { attemptId, missing });
      });
    },
    async redrive(id, attemptId) {
      return change(id, async (w, tx) => {
        const a = w.attempts.find(a => a.id === attemptId);
        nq.noHold(w);
        if (a?.status !== 'failed' || a.step !== step(w).name || a.round !== w.round) throw new Error('Only the current failed attempt is redriven');
        if (a.card.harness === 'codex' && !a.harnessSession) {
          const x = nq.currentExchange(w, a.step);
          x.replacements ??= [];
          x.replacements.push({ actor: a.actor, receiver: x.receiver, callId: a.callId, at: Date.now() });
          x.pickup = { from: a.card, session: null, reason: 'session-unavailable', workspace: workspaceState(w.cwd),
            lastOutput: a.output ?? '', pendingQuestions: x.turns.findLast(t => t.type === 'worker')?.questions ?? [], taskList: a.progress };
          a.actor = `${a.role}-${randomUUID()}`; a.sessionId = randomUUID(); a.status = 'replacement-intake';
          x.worker = a.actor; x.receiver = participant({ card: a.card, step: a.step, sessionId: a.sessionId }, a.actor); x.status = 'awaiting-worker';
          event(w, 'receiver-replaced', { attemptId, exchangeId: x.id, reason: 'session-unavailable' });
          return;
        }
        a.status = 'running'; // 'running' makes the task continue the existing pi session, not start over
        await queueAttempt(tx, w, a, 'redrive');
        event(w, 'redrive', { attemptId });
      });
    },
    // A usage limit stopped this worker: the same step continues on another card, in the same workspace,
    // with a fresh session (transcripts don't cross harnesses). The swap stays on the record.
    async swap(id, attemptId, card) {
      if (!card?.harness || !card?.model) throw new Error('A card is required');
      return change(id, async (w, tx) => {
        const a = w.attempts.find(a => a.id === attemptId);
        nq.noHold(w);
        if (a?.status !== 'failed' || !a.limit || a.step !== step(w).name || a.round !== w.round) throw new Error('Only the current attempt stopped by a usage limit is swapped');
        // What the successor needs: the outgoing session, the limit, and the workspace as it was left.
        a.swaps.push({ from: a.card, to: card, limit: a.limit, session: a.harnessSession ?? a.sessionId,
          workspace: workspaceState(w.cwd), lastOutput: a.output ?? '', at: new Date().toISOString() });
        event(w, 'swapped', { attemptId, step: a.step, from: `${a.card.harness} · ${a.card.model}`, to: `${card.harness} · ${card.model}`, account: a.limit.account });
        Object.assign(a, { card, model: `${card.harness} · ${card.provider}/${card.model}`, sessionId: randomUUID(), harnessSession: null,
          limit: null, error: '', launches: 0, status: 'replacement-intake' });
        const x = nq.currentExchange(w, a.step);
        x.replacements ??= [];
        x.replacements.push({ actor: x.worker, receiver: x.receiver ?? null, callId: a.callId, at: Date.now() });
        a.actor = `${a.role}-${randomUUID()}`; x.worker = a.actor; x.receiver = participant({ card, step: a.step, sessionId: a.sessionId }, a.actor);
        x.status = 'awaiting-worker';
        x.pickup = { ...a.swaps.at(-1), pendingQuestions: x.turns.findLast(t => t.type === 'worker')?.questions ?? [], taskList: a.progress };
        a.packet = makePacket(w, step(w), w.briefs[a.step], 'execute');
      });
    },
    async continueReplacement(id, attemptId) {
      return change(id, async (w, tx) => {
        const a = w.attempts.find(a => a.id === attemptId);
        if (a?.status !== 'replacement-intake') throw new Error('No replacement awaits intake');
        nq.readyExchange(w, a.step, a.actor);
        a.packet = makePacket(w, step(w), w.briefs[a.step], 'execute'); a.status = 'queued';
        await queueAttempt(tx, w, a, 'replacement');
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
        applyCall(w, a.callId);
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
        if (!a || !['verify', 'implement', 'test-plan'].includes(a.step) || a.status !== 'reported' || a.step !== step(w).name || a.round !== w.round) throw new Error('A failure comes from a reported verify, implement or test-plan step');
        applyCall(w, a.callId);
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
    async rule(id, failureId, ruling, callId) {
      return change(id, async (w, tx) => {
        if (w.calls?.find(c => c.id === callId)?.appliedAt) return;
        const f = w.failures.find(f => f.id === failureId);
        if (f?.status !== 'open') throw new Error('No open failure question');
        nq.noHold(w);
        const fx = nq.findExchange(w, x => x.subject?.kind === 'failure' && x.subject.id === failureId);
        if (fx?.status !== 'clear') throw new Error('NQ must clear for the Arbiter before ruling');
        assertCall(w, callId, fx.id);
        fx.decision = { ...ruling, callId: callId ?? null, at: Date.now() };
        applyCall(w, callId);
        f.exchange = exchangeDossier(fx);
        f.sender = fx.receiver ?? null;
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
        if (w.kind !== 'discovery' || STEPS[w.position]?.name !== 'discover' || a?.status !== 'reported' || a.step !== 'discover' || a.round !== w.round) throw new Error('Only a reported discovery is split');
        if (!items.length) throw new Error('Discovery found no items');
        applyCall(w, a.callId);
        a.status = 'accepted'; w.position++;
        startOperation(w, 'split', { attemptId });
        w.items = [];
        for (const [i, item] of items.entries()) {
          const handoff = `Discovered item ${i + 1} of ${items.length}: ${item.title}\n\n${item.text}\n\nThe whole discovery report:\n${a.output ?? ''}`;
          w.items.push(await createIn(tx, fresh(item.objective, w.source, w.cwd, { kind: 'delivery', from: w.id, position: stepIndex('ideate'),
            dispatcher: w.dispatcher, discovered: { role: a.role, actor: a.actor, card: a.card, sessionId: a.harnessSession ?? a.sessionId, workId: w.id, attemptId: a.id, exchange: exchangeDossier(nq.currentExchange(w, 'discover')), output: handoff }, events: [{ at: new Date().toISOString(), type: 'created', pid: process.pid, from: w.id }] })));
        }
        w.completion = 'discovered';
        finishOperation(w, 'split', { items: w.items, attemptId });
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
      for (const id of catalog?.threads ?? []) { const w = await this.get(id); if (w.kind === 'delivery' && !w.completion && !w.archived) items.push(w); }
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
      return change(id, async (w, tx) => {
        if (!w.waitsOn) return false;
        const child = await tx.doc(Work, w.waitsOn);
        if (child.completion !== 'verified') throw new Error('Prerequisite must be verified before release');
        const a = child.attempts.findLast(a => a.status === 'accepted');
        w.prerequisiteReturn = { role: a.role, actor: a.actor, step: a.step, card: a.card,
          sessionId: a.harnessSession ?? a.sessionId, workId: child.id, attemptId: a.id, round: w.round,
          exchange: child.exchanges.map(exchangeDossier), handoff: `Prerequisite ${child.id} completed. Verified result:\n${a.output}\n\nAccepted work:\n${child.attempts.filter(a => a.status === 'accepted').map(a => a.output).join('\n\n')}` };
        event(w, 'prerequisite-done', { child: w.waitsOn, attemptId: a.id });
        w.waitsOn = null;
        return true;
      });
    },
  };
  return store;
}

// Who handed this step its work, and what that handoff was. The originator answers intake questions.
// - after a failure ruling rewound the work here: the Arbiter, from its ruling;
// - otherwise the previous step's role, from its latest accepted output;
// - before any handoff (discover): the dispatcher, from the objective and source only.
export function originatorOf(w) {
  const s = STEPS[w.position];
  if (w.prerequisiteReturn?.round === w.round) return { ...w.prerequisiteReturn, basis: 'return' };
  const ruled = w.notes.findLast(n => n.round === w.round && n.failureId && n.to === s.role);
  if (ruled) {
    const f = w.failures.find(f => f.id === ruled.failureId);
    return { role: ARBITER.role, ...f.sender, basis: 'ruling', step: 'arbitrate', failureId: f.id, exchange: f.exchange,
      handoff: `Verifier report:\n${f.report}\n\nRuling (${f.ruling.cause}, by ${f.ruling.by}):\n${f.ruling.answer}\n\nEvidence:\n${f.ruling.evidence || '(none)'}` };
  }
  const prev = STEPS[w.position - 1], a = prev && w.attempts.findLast(a => a.step === prev.name && a.status === 'accepted');
  if (a) return { role: prev.role, actor: a.actor, card: a.card, sessionId: a.harnessSession ?? a.sessionId,
    basis: 'handoff', step: prev.name, attemptId: a.id, exchange: exchangeDossier(nq.currentExchange(w, prev.name)), handoff: a.output ?? '' };
  // A delivery item was handed over by the discovery that found it.
  if (w.discovered && !w.attempts.some(a => a.status === 'accepted')) return { ...w.discovered, basis: 'handoff', step: 'discover', handoff: w.discovered.output };
  // A prerequisite thread was handed over by the Arbiter's ruling, which its source carries.
  if (w.parentId && !w.attempts.some(a => a.status === 'accepted')) return { role: ARBITER.role, ...w.routedFrom?.sender, step: 'arbitrate', exchange: w.routedFrom?.exchange, basis: 'source' };
  return { role: DISPATCHER, ...w.dispatcher, basis: 'source' };
}
const describe = ({ handoff, ...o }) => o;
const exchangeDossier = x => x ? Object.fromEntries(['id', 'parent', 'step', 'subject', 'originator', 'worker', 'sender', 'receiver', 'handoffId', 'handoffHash', 'briefHash', 'rounds', 'status', 'turns', 'decision'].map(k => [k, x[k] ?? null])) : null;
const participant = (o, actor = o?.actor ?? o?.role) => ({ actor: actor ?? null, job: o?.step ?? o?.job ?? o?.role ?? null,
  harness: o?.card?.harness ?? o?.harness ?? null, provider: o?.card?.provider ?? o?.provider ?? null,
  model: o?.card?.model ?? o?.model ?? null, card: o?.card ?? null, sessionId: o?.sessionId ?? null });
function bindExchange(w, id, o, brief = null) {
  const x = w.exchanges.find(x => x.id === id);
  Object.assign(x, { parent: o.exchange?.id ?? null, sourceWork: o.workId ?? w.id,
    handoffId: o.attemptId ?? o.failureId ?? hash(o.handoff ?? w.source), handoffHash: hash(o.handoff ?? w.source),
    briefHash: brief == null ? null : hash(brief), brief,
    sender: participant(o), receiver: participant({ step: x.step }, x.worker),
    priorExchange: o.exchange ?? null });
  return id;
}
const rebasePath = (value, from, to) => typeof value === 'string' && (value === from || value.startsWith(from + '/')) ? to + value.slice(from.length) : value;
function relocatePacket(serialized, from, to) {
  if (typeof serialized !== 'string') return serialized;
  let packet;
  try { packet = JSON.parse(serialized); } catch { return serialized; }
  const walk = value => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(walk);
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key,
      ['workspace', 'cwd', 'path'].includes(key) && typeof v === 'string' ? rebasePath(v, from, to)
        : ['source', 'handoff', 'brief', 'output', 'text'].includes(key) ? v : walk(v)]));
  };
  return JSON.stringify(walk(packet));
}
function syncAttempt(w, a) {
  const c = w.calls?.find(c => c.id === a.callId);
  if (!c) return;
  c.startedAt ??= Date.now(); c.endedAt = a.endedAt ?? null;
  c.outcome = a.status === 'running' ? 'running' : a.limit ? 'limited' : a.status;
  c.runs = a.runs.filter(r => r.callId === c.id); c.where = c.runs.at(-1)?.where ?? null;
  c.result = ['reported', 'failed'].includes(a.status) ? { output: a.output, error: a.error, limit: a.limit } : null;
  c.record = c.runs.at(-1)?.record ?? null;
  w.activeCall = a.status === 'running' ? c.id : w.activeCall === c.id ? null : w.activeCall;
}
function startOperation(w, name, evidence, startedAt = Date.now()) {
  if (w.kind !== 'discovery') return;
  const id = `${w.round}:${name}`;
  if ((w.operations ??= []).some(o => o.id === id)) return;
  w.operations.push({ id, name, startedAt, endedAt: null, outcome: 'running', evidence });
  w.events.push({ type: 'operation-started', at: new Date(startedAt).toISOString(), operationId: id, name });
}
function finishOperation(w, name, evidence, outcome = 'completed') {
  const o = w.operations?.find(o => o.id === `${w.round}:${name}`);
  if (!o) return;
  Object.assign(o, { endedAt: Date.now(), outcome, evidence });
  w.events.push({ type: 'operation-completed', at: new Date(o.endedAt).toISOString(), operationId: o.id, name, outcome });
}
function assertCall(w, callId, exchangeId) {
  if (!callId) return;
  const c = w.calls?.find(c => c.id === callId), x = w.exchanges.find(x => x.id === exchangeId);
  if (!c || c.outcome !== 'reported' || c.exchangeId !== exchangeId || c.turn !== x?.turns.length) throw new Error('Saved call result does not match this exchange turn');
}
function applyCall(w, callId) {
  if (!callId) return;
  const c = w.calls?.find(c => c.id === callId);
  if (!c || c.outcome !== 'reported') throw new Error('Call result must be committed before applying it');
  c.appliedAt ??= Date.now();
  const x = w.exchanges.find(x => x.id === c.exchangeId);
  if (x?.turns.length > c.turn) x.turns.at(-1).callId = c.id;
}
function finalReturn(w) {
  if (!w.completion || w.archived) throw new Error('Only completed work can return a report');
  const existing = nq.findExchange(w, x => x.subject?.kind === 'return');
  if (existing) return existing.id;
  const a = w.attempts.findLast(a => a.status === 'accepted');
  if (!a) throw new Error('No accepted report to return');
  const id = nq.delegate(w, 'return', a.role, w.dispatcher?.actor ?? DISPATCHER, { kind: 'return', id: a.id });
  bindExchange(w, id, { role: a.role, actor: a.actor, step: a.step, card: a.card,
    sessionId: a.harnessSession ?? a.sessionId, attemptId: a.id, handoff: a.output }, 'Receive the final report against the original request; ask only unresolved questions.');
  w.exchanges.find(x => x.id === id).receiver = participant(w.dispatcher ?? { step: 'dispatcher' }, w.dispatcher?.actor ?? DISPATCHER);
  return id;
}
function returnAction(w, input) {
  const id = finalReturn(w), x = w.exchanges.find(x => x.id === id), actor = requireText(input.actor, 'Actor');
  if (input.action === 'question' || input.action === 'clear') nq.workerReply(w, id, actor,
    { intent: requireText(input.text, 'Understanding'), questions: input.action === 'clear' ? [] : input.questions ?? [input.text], notes: input.notes });
  else if (input.action === 'answered') nq.originatorReply(w, id, actor, input.text);
  else if (input.action === 'human') nq.humanAnswer(w, id, actor, input.text);
  else if (input.action === 'accepted') {
    nq.noHold(w);
    if (x.status !== 'clear' || actor !== x.worker) throw new Error('The dispatcher must confirm the return before accepting it');
    w.returnAccepted = { at: Date.now(), actor, exchangeId: id };
  } else throw new Error('Unknown return action');
  return { id: w.id, exchangeId: id, status: x.status };
}

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
    originator: describe(originatorOf(w)), exchange: x?.turns ?? [], exchangeId: x?.id ?? null,
    handoffId: x?.handoffId ?? null, briefHash: x?.briefHash ?? null, pickup: x?.pickup ?? null,
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
  const { source, brief, handoff, previous, accepted: _a, pickup, ...rest } = packet;
  if (pickup) rest.pickup = { ...pickup,
    ...(pickup.lastOutput ? { lastOutput: await save('PICKUP-OUTPUT.md', pickup.lastOutput), lastOutputIsFile: true } : {}) };
  const files = { source: await save('SOURCE.md', source) };
  if (brief !== undefined) files.brief = await save('BRIEF.md', brief);
  if (handoff !== undefined) files.handoff = await save('HANDOFF.md', handoff);
  if (previous !== undefined) files.previous = await save('PREVIOUS.md', previous.output ?? '');
  return JSON.stringify({ ...rest, ...files, ...(previous !== undefined ? { previousRound: previous.round } : {}), accepted,
    read: `Read the ${Object.keys(files).join(', ')}${accepted.length ? ' and the accepted contributions' : ''} at these paths before you respond.` }, null, 2);
}
