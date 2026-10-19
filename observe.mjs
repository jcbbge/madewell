import { mkdir, writeFile, rename, readFile, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { STEPS } from './pi-runtime.mjs';
import { isStep } from './nq.mjs';
import { delegatedView } from './delegated.mjs';
import { stateAt } from './view.mjs';

const cardView = c => c ? { ...c } : null;
const exchangeView = x => x ? { id: x.id, status: x.status, originator: x.originator, worker: x.worker, answered: x.rounds ?? x.answered ?? 0, subject: x.subject } : null;

// A rebuildable read-only view written after each commit. Never a second authority.
export async function publishWork(directory, w) {
  const folder = join(directory, 'observability');
  if (w.archived) {
    await unlink(join(folder, `thread-${w.id}.json`)).catch(e => { if (e.code !== 'ENOENT') throw e; });
    return;
  }
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const current = STEPS[w.position] ?? null;
  const a = current && w.attempts.findLast(a => a.step === current.name && a.round === w.round);
  const x = current && (w.exchanges ?? []).findLast(x => isStep(x) && x.step === current.name && x.round === w.round);
  const failure = w.failures.findLast(f => ['open', 'held'].includes(f.status));
  const alerted = w.hold && w.events.findLast(e => e.type === 'alerted' && e.holdAt === w.hold.at);
  let state = 'ready', next = 'Drive the work.', owner = 'driver';
  if (w.completion === 'discovered') { state = 'done'; next = `Discovered ${w.items?.length ?? 0} item(s); they run in turn.`; owner = null; }
  else if (w.completion) { state = 'done'; next = 'Complete: every phase handed off and the tests pass.'; owner = null; }
  else if (w.hold) { state = 'human-hold'; next = w.hold.kind === 'failure' ? 'Answer the failed test: pre-existing | implementation | test, with instructions.' : 'Answer the worker\'s questions.'; owner = 'human'; }
  else if (w.waitsOn) { state = 'waiting-on-prerequisite'; next = `Prerequisite thread ${w.waitsOn} must finish; then the tests re-run.`; owner = `thread ${w.waitsOn}`; }
  else if (failure) { state = 'test-failed'; next = 'The Arbiter decides whose question the failure is.'; owner = 'Arbiter'; }
  else if (a && ['queued', 'running'].includes(a.status)) { state = 'working'; next = `${a.role} is working.`; owner = a.role; }
  else if (a?.status === 'failed') { state = 'worker-failed'; next = 'Drive again to redrive the same worker session.'; owner = 'driver'; }
  else if (x?.status === 'awaiting-originator') { state = 'question'; next = `${x.originator}, who handed over this work, answers the worker's questions.`; owner = x.originator; }
  else if (x?.status === 'awaiting-worker') { state = 'intake'; next = 'The worker confirms understanding or asks.'; owner = current.role; }
  else if (w.kind === 'delivery' && w.from && !a && !x) { state = 'queued'; next = 'Waits its turn in the delivery queue.'; owner = 'runner'; }
  const offset = w.kind === 'delivery' && w.from ? 1 : 0;
  const applicable = w.kind === 'discovery' || w.completion === 'discovered' ? STEPS.slice(0, 1) : STEPS.slice(offset);
  const view = w.kind === 'delegated' ? delegatedView(directory, w) : {
    schema: 'pi-durable.work-view.v2', threadId: w.id, kind: w.kind ?? null, from: w.from ?? null, items: w.items ?? null, workspace: w.cwd, objective: w.objective.slice(0, 300), projectedAt: new Date().toISOString(),
    done: Boolean(w.completion), state, next, owner, current, position: w.position, round: w.round, parentId: w.parentId, waitsOn: w.waitsOn, depth: w.depth ?? 0,
    progress: { accepted: w.completion ? applicable.length : Math.max(0, w.position - offset), total: applicable.length },
    checklist: applicable.map((s, i) => ({ name: s.name, role: s.role, state: i + offset < w.position || w.completion ? 'done' : i + offset === w.position ? state : 'pending' })),
    questions: w.hold?.questions ?? (x?.status === 'awaiting-originator' ? x.turns.at(-1)?.questions ?? [] : []),
    hold: w.hold, failure: failure ? { id: failure.id, status: failure.status, report: failure.report.slice(-1500) } : null,
    lastRuling: w.failures.findLast(f => f.ruling)?.ruling ?? null,
    exchange: exchangeView(x),
    // The alert sent for the hold that stands now, or null: the record's own `alerted` event.
    alert: alerted ? { holdAt: alerted.holdAt, channel: alerted.channel, ok: alerted.ok } : null,
    attempt: a ? { id: a.id, role: a.role, state: a.status, launches: a.launches ?? 0, progress: a.progress, error: a.error || null } : null,
    lastEvent: w.events.at(-1) ?? null, ownerPid: w.events.at(-1)?.pid ?? null,
    // The full timeline for the dashboard: everything that happened, minus packet and source text.
    record: {
      createdAt: w.events[0]?.at ?? null, kind: w.kind, from: w.from, delivery: w.kind !== 'discovery', completion: w.completion,
      calls: w.calls ?? [], activeCall: w.activeCall ?? null, operations: w.operations ?? [],
      discovered: w.discovered ?? null, items: w.items ?? null, quota: w.quota ?? null,
      attempts: w.attempts.map(a => ({ id: a.id, step: a.step, role: a.role, round: a.round, actor: a.actor, status: a.status, launches: a.launches ?? 0,
        callId: a.callId ?? null, where: a.where ?? null, sessionId: a.harnessSession ?? a.sessionId ?? null,
        runs: a.runs ?? [], createdAt: a.createdAt, startedAt: a.startedAt ?? null, endedAt: a.endedAt ?? null, progress: a.progress, checkIns: a.checkIns,
        error: a.error || null, exitCode: a.exitCode ?? null, outputHead: (a.output ?? '').slice(0, 800),
        card: a.card ? cardView(a.card) : null,
        swaps: (a.swaps ?? []).map(s => ({ from: cardView(s.from), to: cardView(s.to), at: s.at, account: s.limit?.account ?? null, resetsAt: s.limit?.resetsAt ?? null })) })),
      exchanges: (w.exchanges ?? []).map(({ rounds, ...x }) => ({ ...x, answered: rounds ?? x.answered ?? 0,
        subject: x.subject ?? { kind: 'step' }, turns: x.turns ?? [] })),
      failures: w.failures.map(f => ({ id: f.id, status: f.status, at: f.at, round: f.round, ruling: f.ruling ?? null, prerequisite: f.prerequisite ?? null, report: f.report.slice(-1200) })),
      notes: w.notes.map(n => ({ to: n.to, round: n.round, at: n.at, failureId: n.failureId })),
      events: w.events,
    },
    evidence: { store: join(directory, 'work.sqlite'), export: join(directory, 'exports', `thread-${w.id}.json`) },
  };
  if (w.kind !== 'delegated') {
    const derived = stateAt(view, Date.now());
    view.state = derived.state; view.done = derived.done;
    if (['quota-wait', 'queued', 'selected'].includes(derived.state)) {
      view.owner = 'runner'; view.next = derived.state === 'quota-wait' ? 'Waits for provider quota; the runner resumes it.' : derived.state === 'selected' ? 'Selected by the runner; no worker start recorded yet.' : 'Waits its turn in the delivery queue.';
    }
    if (derived.exchange) {
      view.exchange = exchangeView(derived.exchange);
      if (derived.exchangeState === 'question') {
        view.owner = derived.exchange.originator; view.next = `${view.owner} answers the receiving agent's questions.`;
        view.questions = derived.exchange.turns.filter(t => t.type === 'worker').at(-1)?.questions ?? [];
      } else if (derived.exchangeState === 'intake') {
        view.owner = derived.exchange.worker; view.next = `${view.owner} confirms understanding or asks.`;
      }
    }
    if (derived.call) {
      view.owner = derived.call.actor ?? derived.call.job ?? 'UNKNOWN';
      view.next = `${derived.call.job ?? derived.call.kind ?? 'Agent call'} is ${derived.call.outcome}.`;
      view.exchange = exchangeView(derived.exchange);
      view.questions = derived.exchangeState === 'question' ? derived.exchange?.turns.at(-1)?.questions ?? [] : view.questions;
    }
  }
  const path = join(folder, `thread-${w.id}.json`), temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(view), { mode: 0o600 });
  await rename(temp, path);
}

const alive = pid => { if (!Number.isSafeInteger(pid)) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };

export async function observe(directory, id = null) {
  const folder = join(directory, 'observability');
  const files = await readdir(folder).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
  const lock = await readFile(join(directory, 'owner.lock'), 'utf8').then(JSON.parse).catch(() => null);
  const driverAlive = alive(lock?.pid);
  const result = [];
  for (const file of files.filter(f => /^thread-\d+\.json$/.test(f))) {
    const w = await readFile(join(folder, file), 'utf8').then(JSON.parse).catch(() => null);
    if (!w || (id !== null && w.threadId !== id)) continue;
    const stalled = w.kind !== 'delegated' && !w.done && ['working', 'intake', 'question', 'test-failed', 'limited', 'quota-wait'].includes(w.state) && !driverAlive;
    result.push({ ...w, driverAlive, state: stalled ? 'stopped' : w.state,
      next: stalled ? 'No driver is running. Drive again (or durable_work resume): unfinished work continues from its saved state.' : w.next });
  }
  return result.sort((a, b) => a.threadId - b.threadId);
}

// A hold is the first thing anyone reads: one line per held item, then held items ahead of the rest.
const holdLine = w => `HOLD #${w.threadId}: ${w.hold.reason} — alert: ${w.alert?.channel ? `${w.alert.channel} ${w.alert.ok ? 'ok' : 'failed'}` : 'not sent'}`;
export function render(works) {
  if (!works.length) return 'No work yet.';
  const held = works.filter(w => w.hold && !w.done);
  return [...(held.length ? [held.map(holdLine).join('\n')] : []), ...[...held, ...works.filter(w => !held.includes(w))].map(w => [
    `WORK ${w.threadId}${w.parentId ? ` (prerequisite of ${w.parentId})` : ''} — ${w.done ? 'DONE' : w.state.toUpperCase()} — round ${w.round}`,
    w.objective,
    ...(w.kind === 'delegated' ? [`Worker: ${w.worker.job} · ${w.worker.harness} · ${w.worker.provider} · ${w.worker.model}`, `Where: ${JSON.stringify(w.where)}`] : []),
    ...(w.checklist ?? []).map(s => `  ${s.state === 'done' ? '[x]' : '[ ]'} ${s.name} (${s.role})${s.state !== 'done' && s.state !== 'pending' ? ` — ${s.state}` : ''}`),
    `Next: ${w.next}`, `Responsible: ${w.owner ?? 'nobody; complete'}`,
    ...w.questions.map(q => `QUESTION: ${q}`),
    ...(w.failure ? [`FAILED TEST: ${w.failure.report.slice(0, 600)}`] : []),
    ...(w.lastRuling ? [`LAST RULING: ${w.lastRuling.cause} by ${w.lastRuling.by} — ${String(w.lastRuling.answer).slice(0, 400)}`] : []),
    ...(w.attempt?.error ? [`WORKER ERROR: ${w.attempt.error.slice(0, 400)}`] : []),
    `Store: ${w.evidence.store} | view ${w.projectedAt}`,
  ].join('\n'))].join('\n\n');
}

export async function watchWork(directory, id, { jsonOutput = false, output = process.stdout, signal } = {}) {
  await stat(directory);
  let previous = '';
  const redraw = async () => {
    const works = await observe(directory, id).catch(e => [{ error: e.message }]);
    const text = jsonOutput ? JSON.stringify(works) : works[0]?.error ? `Observation error: ${works[0].error}` : render(works);
    if (text === previous) return;
    previous = text;
    if (!jsonOutput && output.isTTY) output.write('\x1b[2J\x1b[H');
    output.write(text + '\n');
  };
  await redraw();
  const interval = setInterval(redraw, 1000);
  await new Promise(resolve => {
    const stop = () => { clearInterval(interval); resolve(); };
    if (signal?.aborted) stop(); else signal?.addEventListener('abort', stop, { once: true });
  });
}
