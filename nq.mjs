import { randomUUID } from 'node:crypto';
// NQ: before a worker executes, it states its understanding and asks its questions.
// The originating agent (whoever handed the work over) answers from its own handoff.
// Three answered rounds with questions still open = the handoff is ambiguous or wrong: human hold.
const text = (v, name) => { if (typeof v !== 'string' || !v.trim()) throw new Error(`${name} must be nonempty`); };

export function noHold(work) { if (work.hold) throw new Error(`Human hold: ${work.hold.reason}`); }
const current = (work, step) => (work.exchanges ?? []).findLast(x => x.step === step && x.round === work.round);

export function delegate(work, step, originator, worker) {
  text(originator, 'Originator'); text(worker, 'Worker'); noHold(work);
  if (originator === worker) throw new Error('Originator and worker must differ');
  const open = current(work, step);
  if (open && open.status !== 'clear') throw new Error('Resolve the existing exchange first');
  const x = { id: randomUUID(), step, round: work.round, originator, worker, status: 'awaiting-worker', rounds: 0, turns: [], createdAt: new Date().toISOString() };
  work.exchanges.push(x);
  return x.id;
}

const find = (work, id) => { const x = work.exchanges.find(e => e.id === id); if (!x) throw new Error('Unknown exchange'); return x; };

export function workerReply(work, id, actor, response) {
  noHold(work);
  const x = find(work, id);
  if (x.worker !== actor) throw new Error('Only the delegated worker can answer intake');
  if (x.status !== 'awaiting-worker') throw new Error('No worker response is due');
  text(response?.intent, 'Understanding');
  // Only questions block. Assumptions and points already answered are notes: they travel, they don't count as a round.
  const strings = list => (Array.isArray(list) ? list : []).filter(q => typeof q === 'string' && q.trim());
  const questions = strings(response.questions), notes = [...strings(response.notes), ...strings(response.ambiguities)];
  const clear = questions.length === 0;
  x.turns.push({ type: 'worker', actor, at: new Date().toISOString(), intent: response.intent, questions, notes, clear });
  if (clear) x.status = 'clear';
  else if (x.rounds >= 3 || x.humanAnswered) {
    x.status = 'human-hold';
    work.hold = { kind: 'nq', ref: x.id, at: new Date().toISOString(), reason: x.humanAnswered ? `${x.step}: worker still has questions after the human answer`
      : `${x.step}: the handoff from ${x.originator} is ambiguous or wrong: questions remain after three answers`, questions };
  } else x.status = 'awaiting-originator';
  return { exchangeId: id, status: x.status, rounds: x.rounds };
}

export function originatorReply(work, id, actor, answer) {
  noHold(work); text(answer, 'Originator answer');
  const x = find(work, id);
  if (x.originator !== actor) throw new Error('Only the originator of this handoff can answer');
  if (x.status !== 'awaiting-originator') throw new Error('No originator answer is due');
  x.rounds++;
  x.turns.push({ type: 'originator', actor, at: new Date().toISOString(), round: x.rounds, text: answer });
  x.status = 'awaiting-worker';
  return { exchangeId: id, status: x.status, rounds: x.rounds };
}

// A human answers a held exchange. The worker must still confirm it understands.
export function humanAnswer(work, id, human, answer) {
  text(human, 'Human'); text(answer, 'Human answer');
  const x = find(work, id);
  if (work.hold?.kind !== 'nq' || work.hold.ref !== id) throw new Error('No matching human hold');
  x.turns.push({ type: 'human', actor: human, at: new Date().toISOString(), text: answer });
  x.status = 'awaiting-worker'; x.humanAnswered = true;
  work.hold = null;
  return { exchangeId: id, status: x.status };
}

export function readyExchange(work, step, actor) {
  noHold(work);
  const x = current(work, step);
  if (!x || x.status !== 'clear' || x.worker !== actor) throw new Error('NQ must clear for this worker before execution');
  return x;
}
export { current as currentExchange };
