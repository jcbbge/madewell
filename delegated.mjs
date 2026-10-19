import { createHash, randomUUID } from 'node:crypto';
import * as nq from './nq.mjs';

const text = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} must be nonempty`);
  return value;
};
const participant = (value, name) => {
  if (!value || typeof value !== 'object') throw new Error(`${name} is required`);
  for (const key of ['actor', 'job', 'harness', 'provider', 'model']) text(value[key], `${name}.${key}`);
  return structuredClone(value);
};
const digest = value => createHash('sha256').update(value).digest('hex');
const stamp = () => new Date().toISOString();

// Delegation is a Work document in the same Pi Durable catalog and SQLite file as runner work.
// These are committed transitions, not a second scheduler or a second telemetry store.
export function delegatedFields(input) {
  const sender = participant(input.sender, 'Sender'), worker = participant(input.worker, 'Worker');
  if (sender.actor === worker.actor) throw new Error('Sender and worker must differ');
  const brief = text(input.brief, 'Brief');
  const w = { kind: 'delegated', objective: text(input.objective, 'Objective'), source: brief,
    parentId: input.parentId ?? null, sender, worker, where: input.where ?? null,
    step: input.step ?? worker.job, delegationState: 'intake', activeCall: null, calls: [],
    report: null, acceptance: null, closedAt: null, handoffId: randomUUID(), briefHash: digest(brief),
    createdAt: stamp(), exchanges: [], asked: [], round: 0, hold: null };
  openExchange(w, sender, worker, 'assignment', brief);
  return w;
}

function openExchange(w, sender, receiver, kind, brief) {
  const id = nq.delegate(w, w.step, sender.actor, receiver.actor);
  const x = w.exchanges.find(x => x.id === id);
  Object.assign(x, { parent: w.exchangeId ?? null, handoffId: w.handoffId,
    subject: { kind: 'step', handoff: kind, id: w.handoffId },
    sender, receiver, briefHash: digest(brief), brief });
  w.exchangeId = id;
  return x;
}

export function transitionDelegated(w, action, input = {}) {
  if (w.kind !== 'delegated') throw new Error('Not delegated work');
  if (w.closedAt) throw new Error('Work is closed');
  const x = w.exchanges.find(x => x.id === w.exchangeId);
  const actor = text(input.actor, 'Actor');
  const receiver = () => { if (actor !== x.worker) throw new Error('Only the receiving agent can do this'); };
  const originator = () => { if (actor !== x.originator) throw new Error('Only the originating agent can do this'); };
  const body = () => text(input.text, 'Text');
  const endCall = outcome => {
    const c = w.calls.find(c => c.id === w.activeCall);
    if (c) Object.assign(c, { endedAt: stamp(), outcome, result: w.report });
    w.activeCall = null;
  };
  if (action === 'dead') {
    if (actor !== w.sender.actor) throw new Error('Only the assigning agent can record worker death');
    if (x.subject.handoff !== 'assignment') throw new Error('A reported result must go through its return exchange');
    nq.noHold(w); body();
    endCall('dead'); w.closedAt = stamp(); w.delegationState = 'dead';
    // Terminated is not accepted or completed. Preserve the unfinished work and NQ evidence.
  } else if (action === 'human') {
    if (actor !== 'human') throw new Error('Human answer must name human');
    nq.humanAnswer(w, x.id, actor, body()); w.delegationState = 'intake';
  } else {
    nq.noHold(w);
    if (action === 'started' || action === 'clear') {
      receiver();
      if (x.status !== 'awaiting-worker') throw new Error('No receiving confirmation is due');
      nq.workerReply(w, x.id, actor, { intent: body(), questions: [] });
      if (x.subject.handoff === 'report') w.delegationState = 'reported';
      else {
        w.delegationState = 'working';
        if (!w.activeCall) {
          const c = { id: randomUUID(), parent: w.parentId, source: w.handoffId, subject: x.subject,
            exchangeId: x.id, turn: x.turns.length, job: w.step, actor, card: w.worker,
            sessionId: input.sessionId ?? w.worker.sessionId ?? null, briefHash: w.briefHash,
            startedAt: stamp(), endedAt: null, outcome: null, result: null, where: w.where, runs: [] };
          w.calls.push(c); w.activeCall = c.id;
        }
      }
    } else if (action === 'question') {
      receiver();
      if (x.status === 'clear' && ['working', 'reported'].includes(w.delegationState)) x.status = 'awaiting-worker';
      nq.workerReply(w, x.id, actor, { intent: input.intent ?? body(), questions: input.questions ?? [body()] });
      w.delegationState = w.hold ? 'human-hold' : 'question';
    } else if (action === 'answered') {
      originator(); nq.originatorReply(w, x.id, actor, body()); w.delegationState = 'intake';
    } else if (action === 'reported') {
      if (actor !== w.worker.actor) throw new Error('Only the assigned worker can report');
      if (w.delegationState !== 'working' || x.status !== 'clear') throw new Error('Clear the assignment before reporting');
      w.report = { text: body(), evidence: input.evidence ?? null, at: stamp(), actor };
      endCall('reported');
      openExchange(w, w.worker, w.sender, 'report', w.report.text);
      w.delegationState = 'reported';
    } else if (action === 'accepted') {
      receiver();
      if (x.subject.handoff !== 'report' || !w.report) throw new Error('No report to accept');
      if (x.status === 'awaiting-worker') nq.workerReply(w, x.id, actor, { intent: body(), questions: [] });
      if (x.status !== 'clear') throw new Error('Resolve report questions before acceptance');
      w.acceptance = { actor, text: body(), at: stamp(), reportAt: w.report.at };
      w.delegationState = 'accepted'; w.completion = 'accepted';
    } else if (action === 'sent-back') {
      if (actor !== w.sender.actor || x.subject.handoff !== 'report') throw new Error('Only the assigning agent can send a report back');
      if (x.status !== 'clear') throw new Error('Clear the report exchange before sending back');
      w.round++; w.handoffId = randomUUID(); w.briefHash = digest(body()); w.completion = null; w.acceptance = null;
      openExchange(w, w.sender, w.worker, 'assignment', body()); w.delegationState = 'sent-back';
    } else if (action === 'closed') {
      if (actor !== w.sender.actor || w.delegationState !== 'accepted') throw new Error('Only accepted work can close, by its sender');
      w.closedAt = stamp(); w.delegationState = 'closed';
    } else throw new Error(`Unknown delegated action ${action}`);
  }
  const at = stamp();
  w.events.push({ type: `delegated-${action}`, at, actor, exchangeId: x.id, callId: w.activeCall,
    state: w.delegationState, step: w.step, text: input.text ?? null,
    hold: w.hold ? JSON.parse(JSON.stringify(w.hold)) : null, completion: w.completion,
    exchange: { id: w.exchangeId, status: w.exchanges.at(-1).status },
    acceptance: w.acceptance, report: w.report });
  return { id: w.id, state: w.delegationState, exchangeId: w.exchangeId, hold: w.hold };
}

// Disposable projection, rebuilt only from the committed Work snapshot.
export function delegatedView(directory, w) {
  const x = w.exchanges.find(x => x.id === w.exchangeId);
  return { schema: 'pi-durable.work-view.v2', kind: w.kind, threadId: w.id, workspace: w.cwd,
    objective: w.objective, projectedAt: stamp(), done: Boolean(w.acceptance), state: w.delegationState,
    parentId: w.parentId, current: { name: w.step, role: w.worker.job }, round: w.round,
    sender: w.sender, worker: w.worker, where: w.where, hold: w.hold,
    owner: w.hold ? 'human' : w.delegationState === 'dead' ? w.sender.actor : x.status === 'awaiting-originator' ? x.originator : x.worker,
    questions: w.hold?.questions ?? (x.status === 'awaiting-originator' ? x.turns.at(-1)?.questions ?? [] : []),
    exchange: x, lastEvent: w.events.at(-1), next: w.delegationState,
    record: { kind: w.kind, createdAt: w.createdAt, sender: w.sender, worker: w.worker, where: w.where,
      step: w.step, parentId: w.parentId, handoffId: w.handoffId, briefHash: w.briefHash,
      activeCall: w.activeCall, calls: w.calls, exchanges: w.exchanges, events: w.events,
      report: w.report, acceptance: w.acceptance, closedAt: w.closedAt, completion: w.completion,
      attempts: [], failures: [], notes: [] },
    evidence: { store: `${directory}/work.sqlite` } };
}
