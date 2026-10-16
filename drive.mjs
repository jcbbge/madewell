import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS, provisionPacket, CAUSES, DISPATCHER } from './work.mjs';
import { ARBITER } from './pi-runtime.mjs';
import { callPi } from './pi-call.mjs';
import { parseResponse } from './pi-stream.mjs';
import { currentExchange } from './nq.mjs';

const home = dirname(fileURLToPath(import.meta.url));
const MAX_LAUNCHES = 3;
const guidance = {
  discover: 'Inspect the supplied source and workspace. Identify the requested deliverable, scope, uncertainties and acceptance conditions. Do not implement.',
  ideate: 'Use the accepted discovery. Shape the outcome and bounded options. Recommend the smallest useful approach across developer, user and agentic experience. Do not implement.',
  challenge: 'Challenge the accepted idea against the actual workspace. Name concrete defects, missing constraints and unnecessary scope; recommend a bounded correction or explain why the approach holds. Do not implement.',
  plan: 'Inspect the workspace and the accepted discovery, idea and challenge. Produce an executable specification: Making / Not making / Done when / Waits on, exact paths, instructions, dependencies and what must be verified. Resolve ordinary design choices. Do not implement.',
  'test-plan': 'From the accepted plan, independently of implementation, write the tests (files in the workspace) and the exact commands that run them with their expected results. Do not write product code.',
  implement: 'Execute the accepted plan exactly. The tests define what done means; do not change them. Report changed paths and what you checked.',
  verify: 'Run the test commands from the accepted test plan against the implementation. Never edit product code or tests. End your answer with ONLY a JSON object on its own: {"outcome":"pass"|"fail","summary":string,"failures":[{"test":string,"expected":string,"observed":string}]}.',
};

// Walks one thread through its phases until it is done or a human is needed.
export async function drive(store, id, { delivery = false, model = '', call = callPi, log = console.log } = {}) {
  const foundation = await readFile(join(home, 'FOUNDATION.md'), 'utf8');
  const record = name => join(store.directory, 'calls', `${name}-${randomUUID()}`);
  // Every judgment call lands on the timeline with who, what and how long.
  const timed = async (threadId, kind, stepName, options) => {
    const startedAt = Date.now(), rec = options.record;
    try {
      const output = await call(options);
      await store.note(threadId, 'call', { kind, step: stepName, startedAt, endedAt: Date.now(), ms: Date.now() - startedAt, ok: true, record: rec });
      return output;
    } catch (error) {
      await store.note(threadId, 'call', { kind, step: stepName, startedAt, endedAt: Date.now(), ms: Date.now() - startedAt, ok: false, error: error.message, record: rec });
      throw error;
    }
  };
  const finish = async (status, reason) => {
    const path = join(store.directory, 'exports', `thread-${id}.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(await store.get(id), null, 2));
    log(`${status}: ${reason}`);
    return { status, reason, threadId: id, export: path };
  };
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
      const verdict = await arbitrate(store, w, open, { call: options => timed(id, 'arbiter', 'verify', options), model, record });
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
      const reply = await timed(id, 'intake', step.name, { cwd: w.cwd, model, step: 'intake', record: record(`${step.name}-nq`),
        system: 'You are the assigned worker in read-only intake, not execution. Do not infer your execution tools from the limited tools in this intake: test-plan execution has bash/write/edit; verify execution has bash. The coordinator handles reassignment, not the worker. Return ONLY JSON {intent:string, questions:string[], ambiguities:string[]}. Empty arrays confirm readiness. Ask only about material missing information or authority that the accepted dossier and workspace cannot settle.',
        prompt: await provisionPacket(store.directory, randomUUID(), await store.packet(id, 'nq')) });
      await store.nq(id, x.id, parseResponse(reply), x.worker);
      continue;
    }
    if (x.status === 'awaiting-originator') {
      // A fresh headless call plays the party that made this handoff, answering from its own handoff.
      const reply = parseResponse(await timed(id, 'originator', step.name, { cwd: w.cwd, model, step: 'originator', record: record(`${step.name}-originator`),
        system: originatorSystem(x.originator),
        prompt: await provisionPacket(store.directory, randomUUID(), await store.packet(id, 'originator')) }));
      if (reply.unresolvedAuthority) { await store.holdQuestion(id, x.id, reply.answer); continue; }
      await store.answer(id, x.id, x.originator, reply.answer);
      continue;
    }
    if (x.status !== 'clear') return finish('question', `${step.name}: exchange ${x.id} is ${x.status}`);
    const attemptId = await store.begin(id, x.worker, model);
    log(`${step.name}: ${step.role} working (${attemptId})`);
    await store.execute(id, attemptId);
  }
}

const originatorSystem = role => `You are ${role}, who handed over this work. ${role === DISPATCHER
  ? 'You dispatched it on behalf of the person who asked for it: answer from the objective and source only.'
  : role === ARBITER.role ? 'Your ruling on a failed test sent it here: answer from that ruling and the verifier report.'
  : 'Your accepted handoff output is in the packet: answer from it and the source.'} The receiving worker asked questions before executing. Clarify what you handed over; never change your handoff or the work, and never invent operator authority. Return ONLY JSON {answer:string, unresolvedAuthority:boolean}. If only the operator can answer, set unresolvedAuthority:true and say what is needed.`;

// A failed test is a question. The Arbiter decides whose question it is.
async function arbitrate(store, w, failure, { call, model, record }) {
  const byStep = name => w.attempts.findLast(a => a.step === name && a.status === 'accepted')?.output ?? '(none)';
  const prompt = JSON.stringify({ objective: w.objective, workspace: w.cwd, failure: failure.report,
    plan: byStep('plan'), testPlan: byStep('test-plan'), implementation: byStep('implement'),
    priorRulings: w.failures.filter(f => f.ruling).map(f => f.ruling) }, null, 2);
  try {
    const verdict = parseResponse(await call({ cwd: w.cwd, model, step: ARBITER.name, record: record('arbiter'), prompt,
      system: `You are the ${ARBITER.role}. ${ARBITER.duty} Inspect the actual code, tests and history; you may run the tests. Decide exactly one cause: "pre-existing" (a defect that existed before this work), "implementation" (the new code is wrong), "test" (the test is wrong). If the evidence does not decide it, answer "undetermined". Return ONLY JSON {"cause":"pre-existing"|"implementation"|"test"|"undetermined","answer":string,"evidence":string}. The answer is what the responsible party must do.` }));
    return { cause: CAUSES.includes(verdict.cause) ? verdict.cause : 'undetermined', answer: verdict.answer ?? '', evidence: verdict.evidence ?? '', by: ARBITER.role };
  } catch (error) {
    return { cause: 'undetermined', answer: `Arbiter could not rule: ${error.message}`, evidence: '', by: ARBITER.role };
  }
}
