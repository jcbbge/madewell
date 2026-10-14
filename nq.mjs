import { randomUUID } from 'node:crypto';
// NQ: before a worker executes, it states its understanding and asks its questions.
// The manager answers. Three answered rounds with questions still open = human hold.
const text = (v, name) => { if (typeof v !== 'string' || !v.trim()) throw new Error(`${name} must be nonempty`); };

export function noHold(work) { if (work.hold) throw new Error(`Human hold: ${work.hold.reason}`); }
const current = (work, step) => (work.exchanges ?? []).findLast(x => x.step === step && x.round === work.round);

export function delegate(work, step, manager, worker) {
  text(manager, 'Manager'); text(worker, 'Worker'); noHold(work);
  if (manager === worker) throw new Error('Manager and worker must differ');
  const open = current(work, step);
  if (open && open.status !== 'clear') throw new Error('Resolve the existing exchange first');
  const x = { id: randomUUID(), step, round: work.round, manager, worker, status: 'awaiting-worker', rounds: 0, turns: [], createdAt: new Date().toISOString() };
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
  const questions = [...(response.questions ?? []), ...(response.ambiguities ?? [])].filter(q => typeof q === 'string' && q.trim());
  const clear = questions.length === 0;
  x.turns.push({ type: 'worker', actor, at: new Date().toISOString(), intent: response.intent, questions, clear });
  if (clear) x.status = 'clear';
  else if (x.rounds >= 3 || x.humanAnswered) {
    x.status = 'human-hold';
    work.hold = { kind: 'nq', ref: x.id, at: new Date().toISOString(), reason: `${x.step}: worker still has questions after ${x.humanAnswered ? 'the human answer' : 'three answers'}`, questions };
  } else x.status = 'awaiting-manager';
  return { exchangeId: id, status: x.status, rounds: x.rounds };
}

export function managerReply(work, id, actor, answer) {
  noHold(work); text(answer, 'Manager answer');
  const x = find(work, id);
  if (x.manager !== actor) throw new Error('Only this exchange manager can answer');
  if (x.status !== 'awaiting-manager') throw new Error('No manager answer is due');
  x.rounds++;
  x.turns.push({ type: 'manager', actor, at: new Date().toISOString(), round: x.rounds, text: answer });
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
