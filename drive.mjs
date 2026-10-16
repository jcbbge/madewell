import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS, provisionPacket, CAUSES, DISPATCHER } from './work.mjs';
import { ARBITER } from './pi-runtime.mjs';
import { callCard } from './pi-call.mjs';
import { parseResponse } from './pi-stream.mjs';
import { currentExchange } from './nq.mjs';
import { loadPrescriptions, cardsFor, pickCard } from './cards.mjs';

const home = dirname(fileURLToPath(import.meta.url));
const MAX_LAUNCHES = 3;
const UNKNOWN_RESET_MS = 60 * 60_000; // a limit with no reset time is treated as out for an hour
const guidance = {
  discover: 'Inspect the supplied source and workspace. Identify the requested deliverable, scope, uncertainties and acceptance conditions. Do not implement.',
  ideate: 'Use the accepted discovery. Shape the outcome and bounded options. Recommend the smallest useful approach across developer, user and agentic experience. Do not implement.',
  challenge: 'Challenge the accepted idea against the actual workspace. Name concrete defects, missing constraints and unnecessary scope; recommend a bounded correction or explain why the approach holds. Do not implement.',
  plan: 'Inspect the workspace and the accepted discovery, idea and challenge. Produce an executable specification: Making / Not making / Done when / Waits on, exact paths, instructions, dependencies and what must be verified. Resolve every design choice here: the implementer and the verifier only execute. Do not implement.',
  'test-plan': 'From the accepted plan, independently of implementation, write the checks for this work unit only (files in the workspace) and the exact commands that run them with their expected results. The checks prove the intent of the plan, not only that code runs. Do not write product code.',
  implement: 'Execute the accepted plan exactly as written. You execute: you do not design, plan or improvise, and you never change the plan, its scope or the tests. If the plan is wrong or a step cannot be done as written, stop and report it. Report changed paths and what you checked.',
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
  const cardsOf = (job, fromJob) => model ? [overrideCard(model)] : cardsFor(prescriptions, job, { fromJob });
  const accessOf = job => prescriptions.jobs[job]?.access ?? 'read';
  const pick = async (job, fromJob) => {
    const { card, resetsAt } = pickCard(cardsOf(job, fromJob), { exhausted: await store.exhausted() });
    if (!card) throw new QuotaOut(job, resetsAt);
    return card;
  };
  const outOf = async (limit, where) => {
    const resetsAt = Number.isFinite(limit.resetsAt) ? limit.resetsAt : Date.now() + UNKNOWN_RESET_MS;
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
  const judge = async (kind, stepName, job, fromJob, options) => {
    for (;;) {
      const card = await pick(job, fromJob);
      const result = await timed(kind, stepName, { ...options, card, access: accessOf(job), readDirs: [store.directory] });
      if (!result.limit) return result.output;
      await outOf(result.limit, `${kind} for ${stepName}`);
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
      if (w.hold) return finish('held', w.hold.reason);

      const open = w.failures.find(f => f.status === 'open');
      if (open) {
        const verdict = await arbitrate(w, open, { ask: options => judge('arbiter', 'verify', 'arbitrate', undefined, options), record });
        const routed = await store.rule(id, open.id, verdict);
        log(`arbiter: ${routed.cause}${routed.prerequisite ? ` → prerequisite thread ${routed.prerequisite}` : ''}`);
        continue;
      }

      const step = STEPS[w.position];
      if (delivery && !w.delivery) { await store.authorize(id); continue; }
      if (step.name !== 'discover' && !w.delivery) return finish('delivery-authorization-required', 'Discovery is done. Delivery needs explicit authorization (--delivery).');
      if (!w.briefs[step.name]) {
        await store.brief(id, `${step.role}: ${guidance[step.name]}\n\nThe objective and source in the packet define the request; accepted contributions are your dossier. If questionsForYou is not empty, answering it is your assignment this round. Honor the workspace's own instructions. No deployment, commits or new services without authority in the source. Report tangible results and evidence.\n\nGoverning foundation:\n${foundation}`);
        continue;
      }
      const attempt = w.attempts.findLast(a => a.step === step.name && a.round === w.round);
      if (attempt && ['queued', 'running'].includes(attempt.status)) { log(`${step.name}: resuming ${attempt.id}`); await store.execute(id, attempt.id); continue; }
      if (attempt?.status === 'failed' && attempt.limit) {
        await outOf(attempt.limit, step.name);
        const card = await pick(step.name);
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
        if (step.name === 'verify') {
          let verdict;
          try { verdict = parseResponse(attempt.output); } catch { verdict = { outcome: 'fail', summary: 'Verifier did not return a verdict', raw: attempt.output }; }
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
        const reply = await judge('intake', step.name, 'intake', undefined, { cwd: w.cwd, record: record(`${step.name}-nq`),
          system: 'You are the assigned worker in read-only intake, not execution. Do not infer your execution tools from the limited tools in this intake: test-plan execution has bash/write/edit; verify execution has bash. The coordinator handles reassignment, not the worker. Return ONLY JSON {intent:string, questions:string[], ambiguities:string[]}. Empty arrays confirm readiness. Ask only about material missing information or authority that the accepted dossier and workspace cannot settle.',
          prompt: await provisionPacket(store.directory, randomUUID(), await store.packet(id, 'nq')) });
        await store.nq(id, x.id, parseResponse(reply), x.worker);
        continue;
      }
      if (x.status === 'awaiting-originator') {
        // A fresh headless call plays the party that made this handoff, on that party's own card.
        const o = await store.originator(id);
        const fromJob = o.step ?? (o.role === ARBITER.role ? 'arbitrate' : 'discover');
        const reply = parseResponse(await judge('originator', step.name, 'originator', fromJob, { cwd: w.cwd, record: record(`${step.name}-originator`),
          system: originatorSystem(x.originator),
          prompt: await provisionPacket(store.directory, randomUUID(), await store.packet(id, 'originator')) }));
        if (reply.unresolvedAuthority) { await store.holdQuestion(id, x.id, reply.answer); continue; }
        await store.answer(id, x.id, x.originator, reply.answer);
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

const originatorSystem = role => `You are ${role}, who handed over this work. ${role === DISPATCHER
  ? 'You dispatched it on behalf of the person who asked for it: answer from the objective and source only.'
  : role === ARBITER.role ? 'Your ruling on a failed test sent it here: answer from that ruling and the verifier report.'
  : 'Your accepted handoff output is in the packet: answer from it and the source.'} The receiving worker asked questions before executing. Clarify what you handed over; never change your handoff or the work, and never invent operator authority. Return ONLY JSON {answer:string, unresolvedAuthority:boolean}. If only the operator can answer, set unresolvedAuthority:true and say what is needed.`;

// A failed test is a question. The Arbiter decides whose question it is.
async function arbitrate(w, failure, { ask, record }) {
  const byStep = name => w.attempts.findLast(a => a.step === name && a.status === 'accepted')?.output ?? '(none)';
  const prompt = JSON.stringify({ objective: w.objective, workspace: w.cwd, failure: failure.report,
    plan: byStep('plan'), testPlan: byStep('test-plan'), implementation: byStep('implement'),
    priorRulings: w.failures.filter(f => f.ruling).map(f => f.ruling) }, null, 2);
  try {
    const verdict = parseResponse(await ask({ cwd: w.cwd, record: record('arbiter'), prompt,
      system: `You are the ${ARBITER.role}. ${ARBITER.duty} Inspect the actual code, tests and history; you may run the tests. Decide exactly one cause: "pre-existing" (a defect that existed before this work), "implementation" (the new code is wrong), "test" (the test is wrong). If the evidence does not decide it, answer "undetermined". Return ONLY JSON {"cause":"pre-existing"|"implementation"|"test"|"undetermined","answer":string,"evidence":string}. The answer is what the responsible party must do.` }));
    return { cause: CAUSES.includes(verdict.cause) ? verdict.cause : 'undetermined', answer: verdict.answer ?? '', evidence: verdict.evidence ?? '', by: ARBITER.role };
  } catch (error) {
    if (error instanceof QuotaOut) throw error;
    return { cause: 'undetermined', answer: `Arbiter could not rule: ${error.message}`, evidence: '', by: ARBITER.role };
  }
}
