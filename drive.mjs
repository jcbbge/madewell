import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS, provisionPacket, CAUSES, DISPATCHER, SUBAGENT_RULE } from './work.mjs';
import { ARBITER } from './pi-runtime.mjs';
import { callCard } from './pi-call.mjs';
import { parseResponse } from './pi-stream.mjs';
import { currentExchange, findExchange } from './nq.mjs';
import { loadPrescriptions, cardsFor, pickCard, installed } from './cards.mjs';

const home = dirname(fileURLToPath(import.meta.url));
const MAX_LAUNCHES = 3;
const UNKNOWN_RESET_MS = 60 * 60_000; // a limit with no reset time is treated as out for an hour
const MIN_OUT_MS = 5 * 60_000; // a reported reset in the past or 'in ~0 min' still keeps the account out briefly
const guidance = {
  discover: 'Inspect the supplied source and workspace. Identify the requested deliverable, scope, uncertainties and acceptance conditions. Do not implement.',
  ideate: 'Use the accepted discovery. Shape the outcome and bounded options. Recommend the smallest useful approach across developer, user and agentic experience. Do not implement.',
  challenge: 'Challenge the accepted idea against the actual workspace. Name concrete defects, missing constraints and unnecessary scope; recommend a bounded correction or explain why the approach holds. Do not implement.',
  plan: 'Inspect the workspace and the accepted discovery, idea and challenge. Produce an executable specification: Making / Not making / Done when / Waits on, exact paths, instructions, dependencies and what must be verified. Resolve every design choice here: the implementer and the verifier only execute. Do not implement.',
  'test-plan': 'From the accepted plan, independently of implementation, write the checks for this work unit only (files in the workspace) and the exact commands that run them with their expected results. The checks prove the intent of the plan, not only that code runs. Do not write product code. If something already broken in the workspace, or a wrong plan, stops you from doing your step as written, do not work around it and do not hand it to the operator: stop, change nothing more, and end your answer with ONLY a JSON object on its own: {"blocked":string} saying exactly what stops you. The Arbiter decides whose it is.',
  implement: 'Execute the accepted plan exactly as written. You execute: you do not design, plan or improvise, and you never change the plan, its scope or the tests. Report changed paths and what you checked. If the plan is wrong or a step cannot be done as written, stop, change nothing more, and end your answer with ONLY a JSON object on its own: {"blocked":string} saying exactly what stops you.',
  verify: 'Run only the commands named in the accepted test plan for this work unit, in order: never the whole suite. You execute: you do not fix, retry, broaden or invent commands, and never edit product code or tests. End your answer with ONLY a JSON object on its own: {"outcome":"pass"|"fail","summary":string,"failures":[{"test":string,"expected":string,"observed":string}]}.',
};

class QuotaOut extends Error {
  constructor(job, resetsAt) {
    super(`${job}: every account on its cards is out of quota${Number.isFinite(resetsAt) ? ` until ${new Date(resetsAt).toISOString()}` : ''}`);
    this.resetsAt = resetsAt;
  }
}

// `--model provider/model` is an explicit override: every job runs on pi with that one model, no swap.
function overrideCard(model) {
  const slash = model.indexOf('/');
  if (slash <= 0) throw new Error('--model must be provider/model');
  return { harness: 'pi', provider: model.slice(0, slash), account: 'override', model: model.slice(slash + 1), effort: 'medium' };
}

// Walks one thread through its phases until it is done or a human is needed.
// Every job runs on the card its prescription picks; a usage limit moves it to another provider account.
export async function drive(store, id, { delivery = false, model = '', prescriptions = loadPrescriptions(), call = callCard, log = console.log } = {}) {
  const foundation = await readFile(join(home, 'FOUNDATION.md'), 'utf8');
  const record = name => join(store.directory, 'calls', `${name}-${randomUUID()}`);
  // Only cards whose harness is installed here count; a tier with none installed is a clear error, not a hang.
  const cardsOf = (job, fromJob) => {
    if (model) return [overrideCard(model)];
    const all = cardsFor(prescriptions, job, { fromJob }), here = all.filter(card => installed(card));
    if (!here.length) throw new Error(`${job}: none of its cards' harnesses is installed (${[...new Set(all.map(c => c.harness))].join(', ')}). Install one, or edit prescriptions.json.`);
    return here;
  };
  const accessOf = job => prescriptions.jobs[job]?.access ?? 'read';
  // The first card whose account has quota. `avoid`: accounts that just hit a limit here, never picked again
  // for this job whatever their reported reset says, so a swap always changes provider account.
  const pick = async (job, fromJob, avoid = []) => {
    const exhausted = { ...await store.exhausted() };
    for (const account of avoid) exhausted[account] = Infinity;
    const { card, resetsAt } = pickCard(cardsOf(job, fromJob), { exhausted });
    if (!card) throw new QuotaOut(job, Number.isFinite(resetsAt) ? resetsAt : null);
    return card;
  };
  // Marks the account out, measured from when the limit was hit, so a re-read limit never extends it.
  const outOf = async (limit, where, at = Date.now()) => {
    const reported = Number.isFinite(limit.resetsAt) ? limit.resetsAt : at + UNKNOWN_RESET_MS;
    const resetsAt = Math.max(reported, at + MIN_OUT_MS);
    await store.markExhausted(limit.account, resetsAt);
    await store.note(id, 'quota', { account: limit.account, resetsAt, message: limit.message, where });
    log(`${where}: ${limit.account} is out of quota until ${new Date(resetsAt).toISOString()}`);
  };
  // Every judgment call lands on the timeline with who, what, on which card and how long.
  const timed = async (kind, stepName, options) => {
    const startedAt = Date.now(), rec = options.record, card = `${options.card.harness} · ${options.card.model}`;
    try {
      const result = await call(options);
      await store.note(id, 'call', { kind, step: stepName, card, startedAt, endedAt: Date.now(), ms: Date.now() - startedAt, ok: !result.limit, limit: Boolean(result.limit), record: rec });
      return result;
    } catch (error) {
      await store.note(id, 'call', { kind, step: stepName, card, startedAt, endedAt: Date.now(), ms: Date.now() - startedAt, ok: false, error: error.message, record: rec });
      throw error;
    }
  };
  // A judgment call on its job's card. A usage limit swaps to the next card on another account.
  const judge = async (kind, stepName, job, fromJob, { name, ...options }) => {
    const avoid = [];
    for (;;) {
      const card = await pick(job, fromJob, avoid);
      const result = await timed(kind, stepName, { ...options, record: record(name), card, access: accessOf(job), readDirs: [store.directory] });
      if (!result.limit) return result.output;
      await outOf(result.limit, `${kind} for ${stepName}`);
      avoid.push(result.limit.account, card.account);
    }
  };
  const finish = async (status, reason) => {
    const path = join(store.directory, 'exports', `thread-${id}.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(await store.get(id), null, 2));
    log(`${status}: ${reason}`);
    return { status, reason, threadId: id, export: path };
  };
  try {
    while (true) {
      let w = await store.get(id);
      if (w.completion) {
        if (!w.parentId) return finish('complete', 'All phases handed off; tests pass.');
        log(`prerequisite ${id} complete; returning to thread ${w.parentId}`);
        await store.release(w.parentId); id = w.parentId; continue;
      }
      if (w.waitsOn) { log(`thread ${id} waits on prerequisite ${w.waitsOn}`); id = w.waitsOn; continue; }
      if (w.hold) { await store.alertPending(id); return finish('held', w.hold.reason); }

      const open = w.failures.find(f => f.status === 'open');
      if (open) {
        // The failure is a hand-off from the failing step to the Arbiter: an NQ exchange, with the same three turns.
        const fx = findExchange(w, x => x.subject?.kind === 'failure' && x.subject.id === open.id);
        if (!fx) { await store.delegateFailure(id, open.id, `Arbiter-${randomUUID()}`); continue; }
        if (fx.status === 'awaiting-originator') {
          const failed = w.attempts.find(a => a.id === open.attemptId);
          const reply = parseResponse(await judge('originator', 'arbitrate', 'originator', open.step, { cwd: w.cwd, name: 'arbitrate-originator',
            system: originatorSystem(fx.originator), prompt: await provisionPacket(store.directory, randomUUID(), await store.failurePacket(id, open.id)) }));
          log(`arbiter: ${failed?.role ?? fx.originator} answers the Arbiter's questions`);
          await store.answer(id, fx.id, fx.originator, reply.answer);
          continue;
        }
        if (fx.status === 'awaiting-worker' || fx.status === 'clear') {
          const verdict = fx.status === 'clear' ? { ...(fx.turns.at(-1)?.ruling ?? { cause: 'undetermined', answer: 'The ruling was lost.', evidence: '' }) }
            : await arbitrate(w, open, fx.turns, { ask: options => judge('arbiter', 'verify', 'arbitrate', undefined, options) });
          if (verdict.questions) {
            await store.nq(id, fx.id, { intent: 'Arbiter intake', questions: verdict.questions }, fx.worker);
            log('arbiter: asks the failing step a question');
            continue;
          }
          if (fx.status === 'awaiting-worker') await store.nq(id, fx.id, { intent: `ruling: ${verdict.cause}`, questions: [], ruling: verdict }, fx.worker);
          const routed = await store.rule(id, open.id, verdict);
          log(`arbiter: ${routed.cause}${routed.prerequisite ? ` → prerequisite thread ${routed.prerequisite}` : ''}`);
          continue;
        }
        return finish('question', `arbitrate: exchange ${fx.id} is ${fx.status}`);
      }

      const step = STEPS[w.position];
      if (delivery && !w.delivery) { await store.authorize(id); continue; }
      if (step.name !== 'discover' && !w.delivery) return finish('delivery-authorization-required', 'Discovery is done. Delivery needs explicit authorization (--delivery).');
      if (!w.briefs[step.name]) {
        await store.brief(id, `${step.role}: ${guidance[step.name]}\n\nThe objective and source in the packet define the request; accepted contributions are your dossier. If questionsForYou is not empty, answering it is your assignment this round. Honor the workspace's own instructions. No deployment, commits or new services without authority in the source. Report tangible results and evidence. ${SUBAGENT_RULE}\n\nGoverning foundation:\n${foundation}`);
        continue;
      }
      const attempt = w.attempts.findLast(a => a.step === step.name && a.round === w.round);
      if (attempt && ['queued', 'running'].includes(attempt.status)) { log(`${step.name}: resuming ${attempt.id}`); await store.execute(id, attempt.id); continue; }
      if (attempt?.status === 'failed' && attempt.limit) {
        await outOf(attempt.limit, step.name, attempt.endedAt ?? Date.now());
        const card = await pick(step.name, undefined, [attempt.limit.account, attempt.card.account]);
        await store.swap(id, attempt.id, card);
        log(`${step.name}: continuing on ${card.harness} · ${card.model}`);
        await store.execute(id, attempt.id); continue;
      }
      if (attempt?.status === 'failed') {
        if ((attempt.launches ?? 0) >= MAX_LAUNCHES) return finish('worker-failing', `${step.name}: worker failed ${attempt.launches} times: ${attempt.error}`);
        log(`${step.name}: redriving ${attempt.id} (${attempt.error})`);
        await store.redrive(id, attempt.id); await store.execute(id, attempt.id); continue;
      }
      if (attempt?.status === 'reported') {
        if (['implement', 'test-plan'].includes(step.name)) {
          let report = null;
          try { report = parseResponse(attempt.output); } catch {}
          if (typeof report?.blocked === 'string' && report.blocked.trim()) { await store.openFailure(id, attempt.id, `${step.role} (${step.name}) could not do the step as written: ${report.blocked}`); log(`${step.name}: blocked → question for the Arbiter`); continue; }
        }
        if (step.name === 'verify') {
          let verdict;
          try { verdict = parseResponse(attempt.output); } catch {}
          // No verdict is a malformed handoff, not a failed check: ask the same session for it.
          if (!['pass', 'fail'].includes(verdict?.outcome)) {
            if ((attempt.launches ?? 0) >= MAX_LAUNCHES) return finish('worker-failing', 'verify: the check runner gave no verdict');
            await store.askVerdict(id, attempt.id); log('verify: no verdict → asking the runner for it'); await store.execute(id, attempt.id); continue;
          }
          if (verdict.outcome !== 'pass') { await store.openFailure(id, attempt.id, attempt.output); log('verify: test failed → question for the Arbiter'); continue; }
        }
        await store.accept(id, attempt.id);
        log(`${step.name}: handed off`);
        continue;
      }

      // NQ before execution: the worker states its understanding; whoever handed it the work answers.
      let x = currentExchange(w, step.name);
      if (!x || w.attempts.some(a => a.actor === x.worker && a.round === w.round && a.step === step.name)) {
        await store.delegate(id, `${step.role}-${randomUUID()}`);
        continue;
      }
      if (x.status === 'awaiting-worker') {
        const reply = await judge('intake', step.name, 'intake', step.name, { cwd: w.cwd, name: `${step.name}-nq`,
          system: 'You are the assigned worker for this step, in read-only intake before you execute. Do not infer your execution tools from the limited tools in this intake: test-plan execution has bash/write/edit; verify execution has bash. The coordinator handles reassignment, not the worker. Return ONLY JSON {intent:string, questions:string[], notes:string[]}. questions: only what blocks you from executing and cannot be settled from the packet, the workspace or the answers already in the exchange; never repeat a question the exchange has answered. notes: your assumptions and anything already settled; notes never block. An empty questions array confirms readiness.',
          prompt: await provisionPacket(store.directory, randomUUID(), await store.packet(id, 'nq')) });
        await store.nq(id, x.id, parseResponse(reply), x.worker);
        continue;
      }
      if (x.status === 'awaiting-originator') {
        // The dispatcher's consult on authority, if one is open for this question: an NQ exchange the originator answers for.
        const ax = findExchange(w, e => e.subject?.kind === 'authority' && e.subject.parent === x.id && e.subject.turn === x.turns.length);
        if (!ax) {
          // A fresh headless call plays the party that made this handoff, on that party's own card.
          const o = await store.originator(id);
          const fromJob = o.step ?? (o.role === ARBITER.role ? 'arbitrate' : 'discover');
          const reply = parseResponse(await judge('originator', step.name, 'originator', fromJob, { cwd: w.cwd, name: `${step.name}-originator`,
            system: originatorSystem(x.originator, true),
            prompt: await provisionPacket(store.directory, randomUUID(), await store.packet(id, 'originator')) }));
          if (reply.unresolvedAuthority) {
            // Only the operator holds authority, but the operator's source is on hand: the dispatcher reads it
            // first. The work holds for the operator only when the source cannot settle it.
            if (x.originator === DISPATCHER) await store.holdQuestion(id, x.id, reply.answer, 'authority');
            else await store.delegateAuthority(id, x.id, x.originator, `dispatcher-${randomUUID()}`, reply.answer);
            continue;
          }
          await store.answer(id, x.id, x.originator, reply.answer, reply.same);
          continue;
        }
        if (ax.status === 'awaiting-worker') {
          const ruled = parseResponse(await judge('authority', step.name, 'originator', 'discover', {
            cwd: w.cwd, name: `${step.name}-authority`, system: AUTHORITY_SYSTEM,
            prompt: await provisionPacket(store.directory, randomUUID(), JSON.stringify({ purpose: 'authority', threadId: w.id, workspace: w.cwd,
              objective: w.objective, source: w.source, questions: x.turns.at(-1)?.questions ?? [], handoff: ax.subject.handoff, exchange: ax.turns,
              instruction: 'The handoff file holds what the originator said. Decide from the objective and source only. If you cannot decide without asking the originator what it meant, return ONLY JSON {"questions":[string]}.' })) }));
          if (Array.isArray(ruled.questions) && ruled.questions.some(q => typeof q === 'string' && q.trim())) await store.nq(id, ax.id, { intent: 'Dispatcher intake', questions: ruled.questions }, ax.worker);
          else await store.nq(id, ax.id, { intent: `ruling: ${ruled.unresolvedAuthority ? 'the operator decides' : 'authorized by the source'}`, questions: [], ruling: ruled }, ax.worker);
          continue;
        }
        if (ax.status === 'awaiting-originator') {
          // The dispatcher's question goes back to the originator, on the originator's own card.
          const o = await store.originator(id);
          const reply = parseResponse(await judge('originator', step.name, 'originator', o.step ?? 'discover', { cwd: w.cwd, name: `${step.name}-originator`,
            system: originatorSystem(ax.originator), prompt: await provisionPacket(store.directory, randomUUID(), await store.authorityPacket(id, ax.id)) }));
          // Nothing escalates further: if this answer also needs the operator, the parent hand-off holds.
          if (reply.unresolvedAuthority) await store.holdQuestion(id, x.id, reply.answer, 'authority');
          else await store.answer(id, ax.id, ax.originator, reply.answer);
          continue;
        }
        const ruling = ax.turns.at(-1)?.ruling ?? { answer: '', unresolvedAuthority: true };
        if (ruling.unresolvedAuthority) { await store.holdQuestion(id, x.id, ruling.answer, 'authority'); continue; }
        await store.answer(id, x.id, x.originator, `${ax.subject.handoff}\n\nAuthority, settled by the dispatcher from the operator's source: ${ruling.answer}`);
        continue;
      }
      if (x.status !== 'clear') return finish('question', `${step.name}: exchange ${x.id} is ${x.status}`);
      const card = await pick(step.name);
      const attemptId = await store.begin(id, x.worker, card, accessOf(step.name));
      log(`${step.name}: ${step.role} working on ${card.harness} · ${card.model} (${attemptId})`);
      await store.execute(id, attemptId);
    }
  } catch (error) {
    if (error instanceof QuotaOut) return finish('out-of-quota', error.message);
    throw error;
  }
}

const AUTHORITY_SYSTEM = `You are the ${DISPATCHER}, who dispatched this work for the operator. An agent said only the operator can authorize something. You hold the operator's own words: the objective and source. If they authorize it, explicitly or as a necessary part of what they ask for, say so and what is authorized. If they forbid it, say so. If they leave it genuinely open, or it is destructive, irreversible, touches production, money, credentials or anything outside this workspace, it is the operator's: set unresolvedAuthority:true and state the decision in one sentence with your recommendation. Never invent authority. Return ONLY JSON {answer:string, unresolvedAuthority:boolean}. If you cannot decide without asking the originator what it meant, return ONLY JSON {"questions":[string]} instead: the originator answers, then you decide.`;

const originatorSystem = (role, carried = false) => `You are ${role}, who handed over this work. ${role === DISPATCHER
  ? 'You dispatched it on behalf of the person who asked for it: answer from the objective and source only.'
  : role === ARBITER.role ? 'Your ruling on a failed test sent it here: answer from that ruling and the verifier report.'
  : 'Your accepted handoff output is in the packet: answer from it and the source.'} The receiving worker asked questions before executing. Clarify what you handed over; never change your handoff or the work, and never invent operator authority. Return ONLY JSON {answer:string, unresolvedAuthority:boolean}. If only the operator can answer, set unresolvedAuthority:true and say what is needed.${carried ? ' If a question repeats one in the packet\'s "carried" list in meaning, in any wording, also list it in "same":[{"question":<the question exactly as asked now>,"id":<the carried id>}].' : ''}`;

// A failed test is a question. The Arbiter decides whose question it is.
async function arbitrate(w, failure, exchange, { ask }) {
  const byStep = name => w.attempts.findLast(a => a.step === name && a.status === 'accepted')?.output ?? '(none)';
  const prompt = JSON.stringify({ objective: w.objective, workspace: w.cwd, failure: failure.report,
    plan: byStep('plan'), testPlan: byStep('test-plan'), implementation: byStep('implement'),
    priorRulings: w.failures.filter(f => f.ruling).map(f => f.ruling), exchange }, null, 2);
  try {
    const verdict = parseResponse(await ask({ cwd: w.cwd, name: 'arbiter', prompt,
      system: `You are the ${ARBITER.role}. ${ARBITER.duty} Inspect the actual code, tests and history; you may run the tests. The failure is a failed check, or a maker or check designer that could not do its step as written. Decide exactly one cause: "pre-existing" (a defect that existed before this work), "implementation" (the new code or the plan it follows is wrong), "test" (the test is wrong). If the evidence does not decide it, answer "undetermined". Return ONLY JSON {"cause":"pre-existing"|"implementation"|"test"|"undetermined","answer":string,"evidence":string}. The answer is what the responsible party must do. If you cannot decide without asking the failing step a question, return ONLY JSON {"questions":[string]} instead: it answers, then you rule.` }));
    if (Array.isArray(verdict.questions) && verdict.questions.some(q => typeof q === 'string' && q.trim())) return { questions: verdict.questions.filter(q => typeof q === 'string' && q.trim()) };
    return { cause: CAUSES.includes(verdict.cause) ? verdict.cause : 'undetermined', answer: verdict.answer ?? '', evidence: verdict.evidence ?? '', by: ARBITER.role };
  } catch (error) {
    if (error instanceof QuotaOut) throw error;
    return { cause: 'undetermined', answer: `Arbiter could not rule: ${error.message}`, evidence: '', by: ARBITER.role };
  }
}
