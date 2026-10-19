import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS, provisionPacket, CAUSES, DISPATCHER } from './work.mjs';
import { ARBITER } from './pi-runtime.mjs';
import { callCard } from './pi-call.mjs';
import { parseResponse } from './pi-stream.mjs';
import { currentExchange } from './nq.mjs';
import { loadPrescriptions, cardsFor, pickCard, installed } from './cards.mjs';

const home = dirname(fileURLToPath(import.meta.url));
const MAX_LAUNCHES = 3;
const UNKNOWN_RESET_MS = 60 * 60_000; // a limit with no reset time is treated as out for an hour
const MIN_OUT_MS = 5 * 60_000; // a reported reset in the past or 'in ~0 min' still keeps the account out briefly
const guidance = {
  discover: 'Inspect the supplied source and workspace. Identify the requested deliverable, scope, uncertainties and acceptance conditions, and distill the source into its separate pieces of work, in the order they should be delivered. Do not implement. End your answer with ONLY a JSON object on its own: {"items":[{"title":string,"objective":string,"text":string}]}: each item one coherent piece of work; text carries its purpose, scope and what done means.',
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
export async function drive(store, id, { model = '', prescriptions = loadPrescriptions(), call = callCard, log = console.log } = {}) {
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
      if (w.completion === 'discovered') return finish('discovered', `Discovery found ${w.items.length} item(s); they wait their turn for delivery.`);
      if (w.completion) {
        if (!w.parentId) return finish('complete', 'All phases handed off; tests pass.');
        log(`prerequisite ${id} complete; returning to thread ${w.parentId}`);
        await store.release(w.parentId); id = w.parentId; continue;
      }
      if (w.waitsOn) { log(`thread ${id} waits on prerequisite ${w.waitsOn}`); id = w.waitsOn; continue; }
      if (w.hold) return finish('held', w.hold.reason);

      const open = w.failures.find(f => f.status === 'open');
      if (open) {
        const verdict = await arbitrate(w, open, { ask: options => judge('arbiter', 'verify', 'arbitrate', undefined, options) });
        const routed = await store.rule(id, open.id, verdict);
        log(`arbiter: ${routed.cause}${routed.prerequisite ? ` → prerequisite thread ${routed.prerequisite}` : ''}`);
        continue;
      }

      const step = STEPS[w.position];
      if (!w.briefs[step.name]) {
        await store.brief(id, `${step.role}: ${guidance[step.name]}\n\nThe objective and source in the packet define the request; accepted contributions are your dossier. If questionsForYou is not empty, answering it is your assignment this round. Honor the workspace's own instructions. No deployment, commits or new services without authority in the source. Report tangible results and evidence.\n\nGoverning foundation:\n${foundation}`);
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
        if (step.name === 'discover' && w.kind === 'discovery') {
          const items = discoveredItems(w, attempt);
          await store.split(id, attempt.id, items);
          log(`discover: ${items.length} item(s) found, queued for delivery`);
          continue;
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
        // A fresh headless call plays the party that made this handoff, on that party's own card.
        const o = await store.originator(id);
        const fromJob = o.step ?? (o.role === ARBITER.role ? 'arbitrate' : 'discover');
        const reply = parseResponse(await judge('originator', step.name, 'originator', fromJob, { cwd: w.cwd, name: `${step.name}-originator`,
          system: originatorSystem(x.originator),
          prompt: await provisionPacket(store.directory, randomUUID(), await store.packet(id, 'originator')) }));
        // The originator always answers. Only three rounds with questions still open reach the human (nq.mjs).
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
    if (error instanceof QuotaOut) return { ...await finish('out-of-quota', error.message), resetsAt: error.resetsAt };
    throw error;
  }
}

const originatorSystem = role => `You are ${role}, who handed over this work. ${role === DISPATCHER
  ? 'You dispatched it on behalf of the person who asked for it: answer from the objective and source only.'
  : role === ARBITER.role ? 'Your ruling on a failed test sent it here: answer from that ruling and the verifier report.'
  : 'Your accepted handoff output is in the packet: answer from it and the source.'} The receiving worker asked questions before executing. Answer every question from what you handed over and the source; never change your handoff or the work. Return ONLY JSON {answer:string}.`;

// The items a discovery report ends with. A report without them is one item: the whole request.
function discoveredItems(w, attempt) {
  let report = null;
  try { report = parseResponse(attempt.output); } catch {}
  const items = (Array.isArray(report?.items) ? report.items : [])
    .filter(i => typeof i?.objective === 'string' && i.objective.trim())
    .map(i => ({ title: String(i.title ?? i.objective).trim(), objective: i.objective.trim(), text: String(i.text ?? '').trim() }));
  return items.length ? items : [{ title: w.objective, objective: w.objective, text: 'Discovery named no separate items: this is the whole request.' }];
}

// A failed test is a question. The Arbiter decides whose question it is.
async function arbitrate(w, failure, { ask }) {
  const byStep = name => w.attempts.findLast(a => a.step === name && a.status === 'accepted')?.output ?? '(none)';
  const prompt = JSON.stringify({ objective: w.objective, workspace: w.cwd, failure: failure.report,
    plan: byStep('plan'), testPlan: byStep('test-plan'), implementation: byStep('implement'),
    priorRulings: w.failures.filter(f => f.ruling).map(f => f.ruling) }, null, 2);
  try {
    const verdict = parseResponse(await ask({ cwd: w.cwd, name: 'arbiter', prompt,
      system: `You are the ${ARBITER.role}. ${ARBITER.duty} Inspect the actual code, tests and history; you may run the tests. The failure is a failed check, or a maker or check designer that could not do its step as written. Decide exactly one cause: "pre-existing" (a defect that existed before this work), "implementation" (the new code or the plan it follows is wrong), "test" (the test is wrong). If the evidence does not decide it, answer "undetermined". Return ONLY JSON {"cause":"pre-existing"|"implementation"|"test"|"undetermined","answer":string,"evidence":string}. The answer is what the responsible party must do.` }));
    return { cause: CAUSES.includes(verdict.cause) ? verdict.cause : 'undetermined', answer: verdict.answer ?? '', evidence: verdict.evidence ?? '', by: ARBITER.role };
  } catch (error) {
    if (error instanceof QuotaOut) throw error;
    return { cause: 'undetermined', answer: `Arbiter could not rule: ${error.message}`, evidence: '', by: ARBITER.role };
  }
}
