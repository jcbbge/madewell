import { randomUUID } from 'node:crypto';
// NQ: every agent-to-agent hand-off is an exchange. The receiver states its understanding and asks its questions;
// the sender answers from what it handed over. An answered turn is one turn, whoever answers (the sender or the human).
// Three turns with questions still open = the spec or the receiver's scope is wrong: that work item holds and the human is alerted.
const text = (v, name) => { if (typeof v !== 'string' || !v.trim()) throw new Error(`${name} must be nonempty`); };

export function noHold(work) { if (work.hold) throw new Error(`Human hold: ${work.hold.reason}`); }
// Phase hand-offs have no subject (older stores) or { kind: 'step' }; failures and authority consults carry their own.
export const isStep = x => !x.subject || x.subject.kind === 'step';
const current = (work, step) => (work.exchanges ?? []).findLast(x => isStep(x) && x.step === step && x.round === work.round);
export const findExchange = (work, pred) => (work.exchanges ?? []).findLast(pred);
const sameSubject = (a, b) => JSON.stringify([a?.kind ?? 'step', a?.id ?? null, a?.parent ?? null, a?.turn ?? null]) === JSON.stringify([b?.kind ?? 'step', b?.id ?? null, b?.parent ?? null, b?.turn ?? null]);
// The same question in any casing, punctuation or spacing.
export const norm = s => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

export function delegate(work, step, originator, worker, subject = { kind: 'step' }) {
  text(originator, 'Originator'); text(worker, 'Worker'); noHold(work);
  if (originator === worker) throw new Error('Originator and worker must differ');
  const open = (work.exchanges ?? []).findLast(x => x.step === step && x.round === work.round && sameSubject(x.subject, subject));
  if (open && open.status !== 'clear') throw new Error('Resolve the existing exchange first');
  if (subject.kind === 'step') {
    // A question is carried only across consecutive hand-offs: keep what the previous hand-off carried.
    const previous = work.exchanges.findLast(isStep);
    work.asked = (work.asked ?? []).filter(e => previous && e.exchanges.includes(previous.id));
  }
  const x = { id: randomUUID(), step, round: work.round, originator, worker, subject, status: 'awaiting-worker', rounds: 0, turns: [], createdAt: new Date().toISOString() };
  work.exchanges.push(x);
  return x.id;
}

const find = (work, id) => { const x = work.exchanges.find(e => e.id === id); if (!x) throw new Error('Unknown exchange'); return x; };

const holdReason = (x, cause) => cause === 'after-human'
  ? `${x.step}: questions remain after the human's answer`
  : `${x.step}: questions remain after three turns on the handoff from ${x.originator}: its spec or the receiver's scope is wrong or unclear`;
// Every hold names the hand-off, who handed the work over, who asked, and why.
const hold = (work, x, { cause, questions, questionId = null, refs = [x.id], reason = holdReason(x, cause) }) => {
  x.status = 'human-hold';
  work.hold = { kind: 'nq', ref: x.id, at: new Date().toISOString(), cause, originator: x.originator, receiver: x.worker, questionId, refs, questions, reason };
};

export function workerReply(work, id, actor, response) {
  noHold(work);
  const x = find(work, id);
  if (x.worker !== actor) throw new Error('Only the delegated worker can answer intake');
  if (x.status !== 'awaiting-worker') throw new Error('No worker response is due');
  text(response?.intent, 'Understanding');
  // Only questions block. Assumptions and points already answered are notes: they travel, they don't count as a turn.
  const strings = list => (Array.isArray(list) ? list : []).filter(q => typeof q === 'string' && q.trim());
  const questions = strings(response.questions), notes = [...strings(response.notes), ...strings(response.ambiguities)];
  const clear = questions.length === 0, step = isStep(x);
  work.asked ??= [];
  // The ledger entry each question matches, by its text; null when it is new.
  const asked = questions.map(q => work.asked.find(e => norm(e.text) === norm(q))?.id ?? null);
  const turn = { type: 'worker', actor, at: new Date().toISOString(), intent: response.intent, questions, notes, clear };
  if (step) turn.asked = asked;
  if (response.ruling && typeof response.ruling === 'object') turn.ruling = response.ruling;
  x.turns.push(turn);
  if (clear) x.status = 'clear';
  else {
    // The same question already answered three times across hand-offs holds at once.
    const spent = step ? work.asked.find(e => e.turns >= 3 && asked.includes(e.id)) : null;
    if (spent) hold(work, x, { cause: 'turns', questions: questions.filter((q, i) => asked[i] === spent.id), questionId: spent.id, refs: [...spent.exchanges] });
    else if (x.rounds >= 3) {
      const last = x.turns.findLast(t => t.type !== 'worker');
      hold(work, x, { cause: last?.type === 'human' ? 'after-human' : 'turns', questions });
    } else x.status = 'awaiting-originator';
  }
  return { exchangeId: id, status: x.status, rounds: x.rounds };
}

// `same`: [{question, id}] from the originator: a question of this turn that repeats a carried one in other words.
export function originatorReply(work, id, actor, answer, same = []) {
  noHold(work); text(answer, 'Originator answer');
  const x = find(work, id);
  if (x.originator !== actor) throw new Error('Only the originator of this handoff can answer');
  if (x.status !== 'awaiting-originator') throw new Error('No originator answer is due');
  const asked = x.turns.at(-1)?.asked, questions = x.turns.at(-1)?.questions ?? [];
  if (isStep(x) && asked) {
    work.asked ??= [];
    const tags = Array.isArray(same) ? same : [];
    // Each question's entry: the one its text matched, a valid tag from the originator, or a new entry.
    const targets = questions.map((q, i) => {
      if (asked[i]) return asked[i];
      const tag = tags.find(t => t && t.question === q && work.asked.some(e => e.id === t.id));
      return tag ? tag.id : null;
    });
    const spent = work.asked.find(e => e.turns >= 3 && targets.includes(e.id));
    if (spent) {
      hold(work, x, { cause: 'turns', questions: questions.filter((q, i) => targets[i] === spent.id), questionId: spent.id, refs: [...spent.exchanges] });
      return { exchangeId: id, status: x.status, rounds: x.rounds };
    }
    for (const [i, q] of questions.entries()) {
      let entry = work.asked.find(e => e.id === targets[i]);
      if (!entry) { entry = { id: randomUUID(), text: q, turns: 0, exchanges: [], originator: x.originator, receiver: x.worker, step: x.step }; work.asked.push(entry); targets[i] = entry.id; }
    }
    for (const entryId of new Set(targets)) {
      const entry = work.asked.find(e => e.id === entryId);
      entry.turns++;
      if (!entry.exchanges.includes(x.id)) entry.exchanges.push(x.id);
    }
  }
  x.rounds++;
  x.turns.push({ type: 'originator', actor, at: new Date().toISOString(), round: x.rounds, text: answer });
  x.status = 'awaiting-worker';
  return { exchangeId: id, status: x.status, rounds: x.rounds };
}

// A human answers a held exchange. The answer is a turn; the worker must still confirm it understands or ask.
export function humanAnswer(work, id, human, answer) {
  text(human, 'Human'); text(answer, 'Human answer');
  const x = find(work, id);
  if (work.hold?.kind !== 'nq' || work.hold.ref !== id) throw new Error('No matching human hold');
  x.rounds++;
  x.turns.push({ type: 'human', actor: human, at: new Date().toISOString(), round: x.rounds, text: answer });
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
