import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS, identity, CAUSES, DISPATCHER, SUBAGENT_RULE, WORKER_CHANNEL_GUIDE } from './work.mjs';
import { ARBITER } from './pi-runtime.mjs';
import { parseResponse } from './pi-stream.mjs';
import { currentExchange, findExchange, isStep } from './nq.mjs';
import { loadPrescriptions, cardsFor, pickCard, installed } from './cards.mjs';
import { checkDeliverable, FORMAT } from './deliverable.mjs';

const home = dirname(fileURLToPath(import.meta.url));
const MAX_LAUNCHES = 3;
const UNKNOWN_RESET_MS = 60 * 60_000; // a limit with no reset time is treated as out for an hour
const MIN_OUT_MS = 5 * 60_000; // a reported reset in the past or 'in ~0 min' still keeps the account out briefly
const deliverable = step => ` Your answer is your complete current deliverable every time, never a report of what changed: if your packet has a previous deliverable, restate it in full with the changes applied. ${FORMAT[step]}`;
const guidance = {
  discover: 'Inspect the supplied source and workspace. Identify the requested deliverable, scope, uncertainties and acceptance conditions, and distill the source into its separate pieces of work, in the order they should be delivered. Do not implement. End your answer with ONLY a JSON object on its own: {"items":[{"title":string,"objective":string,"text":string}]}: each item one coherent piece of work; text carries its purpose, scope and what done means.',
  ideate: 'Use the accepted discovery. Shape the outcome and bounded options. Recommend the smallest useful approach across developer, user and agentic experience. Do not implement.',
  challenge: 'Challenge the accepted idea against the actual workspace. Name concrete defects, missing constraints and unnecessary scope; recommend a bounded correction or explain why the approach holds. Do not implement.',
  plan: 'Inspect the workspace and the accepted discovery, idea and challenge. Produce an executable specification: Making / Not making / Done when / Waits on, exact paths, instructions, dependencies and what must be verified. Resolve every design choice here: the implementer and the verifier only execute. Do not implement.' + deliverable('plan'),
  'test-plan': 'From the accepted plan, independently of implementation, write the checks for this work unit only (files in the workspace, or at absolute paths outside it such as your packet folder; list every one) and the exact commands that run them with their expected results. The checks prove the intent of the plan, not only that code runs. Do not write product code. If something already broken in the workspace, or a wrong plan, stops you from doing your step as written, do not work around it and do not hand it to the operator: stop, change nothing more, and end your answer with ONLY a JSON object on its own: {"blocked":string} saying exactly what stops you. The Arbiter decides whose it is.' + deliverable('test-plan'),
  implement: 'Execute the accepted plan exactly as written. You execute: you do not design, plan or improvise, and you never change the plan, its scope or the tests. Report changed paths and what you checked. If the plan is wrong or a step cannot be done as written, stop, change nothing more, and end your answer with ONLY a JSON object on its own: {"blocked":string} saying exactly what stops you.' + deliverable('implement'),
  verify: 'Run only the commands in your packet\'s testPlan.scripts, in order, from the workspace; before each, check its file\'s sha256 against the packet and report a mismatch as a failure for this work unit, in order: never the whole suite. You execute: you do not fix, retry, broaden or invent commands, and never edit product code or tests. End your answer with ONLY a JSON object on its own: {"outcome":"pass"|"fail","summary":string,"failures":[{"test":string,"expected":string,"observed":string}]}.',
};

class ReplacementIntake extends Error {}
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
export async function drive(store, id, { model = '', prescriptions = loadPrescriptions(), call, log = console.log } = {}) {
  const foundation = await readFile(join(home, 'FOUNDATION.md'), 'utf8');
  let lastCallId = null;
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
  // Every judgment has a stable exchange/turn identity and a saved Pi Durable result.
  // Source answers prefer the actual sender card, not today's first card in its former tier.
  const judge = async (kind, stepName, job, fromJob, { name, exchangeId, ...options }) => {
    const w = await store.get(id), x = w.exchanges.find(x => x.id === exchangeId) ?? findExchange(w, x => x.step === stepName);
    if (!x) throw new Error(`No exchange for ${kind}`);
    const pinned = kind === 'originator' ? x.sender?.card : x.receiver?.card;
    const avoid = [];
    for (;;) {
      const exhausted = await store.exhausted();
      const card = pinned && !avoid.includes(pinned.account) && !(exhausted[pinned.account] > Date.now())
        ? pinned : await pick(job, fromJob, [...avoid, ...(pinned ? [pinned.account] : [])]);
      if (!installed(card)) throw new Error(`Recorded sender harness ${card.harness} is unavailable`);
      if (kind !== 'originator' && x.status === 'clear' && pinned && identity(card) !== identity(pinned)) {
        await store.replaceReceiver(id, x.id, card);
        throw new ReplacementIntake();
      }
      const key = `${x.id}:${x.turns.length}:${kind}:${identity(card)}`;
      const result = await store.call(id, { key, kind, step: stepName, job, actor: kind === 'originator' ? x.originator : x.worker,
        exchangeId: x.id, card, options: { ...options, access: accessOf(job), readDirs: [store.directory] } }, call);
      lastCallId = result.callId;
      if (result.needsIntake) throw new ReplacementIntake();
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
      if (w.archived) return finish('archived', w.archiveReason);
      if (w.hold) { await store.alertPending(id); return finish('held', w.hold.reason); }
      if (w.completion) {
        // Returning to the original dispatcher is a handoff, not another reviewer job.
        if (!w.parentId && !w.returnAccepted) {
          const rx = findExchange(w, x => x.subject?.kind === 'return');
          if (!rx) { await store.delegateReturn(id); continue; }
          if (rx.status === 'awaiting-worker') {
            const reply = parseResponse(await judge('return-intake', 'return', 'intake', 'discover', { cwd: w.cwd, exchangeId: rx.id, name: 'return',
              system: 'You are the dispatcher receiving the final report, in read-only intake. Return ONLY JSON {intent:string, questions:string[], notes:string[]}. Ask only unresolved questions about the delivered report against the source. Do not redo the work or invent more scope.',
              packet: await store.returnPacket(id) }));
            await store.returnReply(id, { action: reply.questions?.length ? 'question' : 'clear', actor: rx.worker, text: reply.intent,
              questions: reply.questions, notes: reply.notes }, lastCallId); continue;
          }
          if (rx.status === 'awaiting-originator') {
            const reply = parseResponse(await judge('originator', 'return', 'originator', rx.sender?.job ?? 'discover', { cwd: w.cwd, exchangeId: rx.id, name: 'return-answer',
              system: originatorSystem(rx.originator), packet: await store.returnPacket(id) }));
            await store.answer(id, rx.id, rx.originator, reply.answer, reply.same, lastCallId); continue;
          }
          if (rx.status === 'clear') { await store.returnReply(id, { action: 'accepted', actor: rx.worker }); continue; }
          return finish('question', `return: exchange ${rx.id} is ${rx.status}`);
        }
        if (w.completion === 'discovered') return finish('discovered', `Discovery found ${w.items.length} item(s); they wait their turn for delivery.`);
        if (!w.parentId) return finish('complete', 'All phases handed off; tests pass.');
        log(`prerequisite ${id} complete; returning to thread ${w.parentId}`);
        await store.release(w.parentId); id = w.parentId; continue;
      }
      if (w.waitsOn) { log(`thread ${id} waits on prerequisite ${w.waitsOn}`); id = w.waitsOn; continue; }

      const open = w.failures.find(f => f.status === 'open');
      if (open) {
        // The failure is a hand-off from the failing step to the Arbiter: an NQ exchange, with the same three turns.
        const fx = findExchange(w, x => x.subject?.kind === 'failure' && x.subject.id === open.id);
        if (!fx) { await store.delegateFailure(id, open.id, `Arbiter-${randomUUID()}`); continue; }
        if (fx.status === 'awaiting-originator') {
          const failed = w.attempts.find(a => a.id === open.attemptId);
          const reply = parseResponse(await judge('originator', 'arbitrate', 'originator', open.step, { cwd: w.cwd, exchangeId: fx.id, name: 'arbitrate-originator',
            system: originatorSystem(fx.originator), packet: await store.failurePacket(id, open.id) }));
          log(`arbiter: ${failed?.role ?? fx.originator} answers the Arbiter's questions`);
          await store.answer(id, fx.id, fx.originator, reply.answer, reply.same, lastCallId);
          continue;
        }
        if (fx.status === 'awaiting-worker') {
          const reply = parseResponse(await judge('arbiter-intake', 'arbitrate', 'intake', 'arbitrate', { cwd: w.cwd, exchangeId: fx.id, name: 'arbiter-intake',
            system: 'You are the Arbiter, in read-only intake before ruling. Do not run tests or decide the cause yet. Return ONLY JSON {intent:string, questions:string[], notes:string[]}.',
            packet: await store.failurePacket(id, open.id, 'nq') }));
          await store.nq(id, fx.id, reply, fx.worker, lastCallId); continue;
        }
        if (fx.status === 'clear') {
          const verdict = await arbitrate(w, open, fx.turns, { ask: options => judge('arbiter', 'arbitrate', 'arbitrate', undefined, { ...options, exchangeId: fx.id }) });
          if (verdict.questions) { await store.reopenQuestion(id, fx.id, verdict.questions, lastCallId); continue; }
          const routed = await store.rule(id, open.id, verdict, lastCallId);
          log(`arbiter: ${routed.cause}${routed.prerequisite ? ` → prerequisite thread ${routed.prerequisite}` : ''}`);
          continue;
        }
        return finish('question', `arbitrate: exchange ${fx.id} is ${fx.status}`);
      }

      const step = STEPS[w.position];
      if (!w.briefs[step.name]) {
        await store.brief(id, `${step.role}: ${guidance[step.name]}\n\nThe objective and source in the packet define the request; accepted contributions are your dossier. If questionsForYou is not empty, answering it is your assignment this round. Honor the workspace's own instructions. No deployment, commits or new services without authority in the source. Report tangible results and evidence. ${SUBAGENT_RULE} ${WORKER_CHANNEL_GUIDE}\n\nGoverning foundation:\n${foundation}`);
        continue;
      }
      const attempt = w.attempts.findLast(a => a.step === step.name && a.round === w.round);
      if (attempt?.status === 'replacement-intake' && currentExchange(w, step.name)?.status === 'clear') {
        await store.continueReplacement(id, attempt.id); continue;
      }
      if (attempt && ['queued', 'running'].includes(attempt.status)) { log(`${step.name}: resuming ${attempt.id}`); await store.execute(id, attempt.id); continue; }
      if (attempt?.status === 'failed' && attempt.limit) {
        await outOf(attempt.limit, step.name, attempt.endedAt ?? Date.now());
        const card = await pick(step.name, undefined, [attempt.limit.account, attempt.card.account]);
        await store.swap(id, attempt.id, card);
        log(`${step.name}: continuing on ${card.harness} · ${card.model}`);
        continue;
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
        if (['plan', 'test-plan', 'implement'].includes(step.name)) {
          // A hand-off missing its required parts is the receiving step's question; the reporting worker restates its whole deliverable.
          const { missing } = checkDeliverable(step.name, attempt.output ?? '', w.cwd);
          if (missing.length) {
            const rx = findExchange(w, x => isStep(x) && x.subject?.id === attempt.id), next = STEPS[w.position + 1];
            if (!rx) { await store.refuse(id, attempt.id, `${next.role}-${randomUUID()}`, missing); log(`${step.name}: hand-off refused (${missing.join('; ')}) → ${next.role} asks`); continue; }
            const restate = async () => { await store.askRestate(id, attempt.id); log(`${step.name}: asking ${step.role} to restate its deliverable`); await store.execute(id, attempt.id); };
            if (rx.status === 'awaiting-worker' && rx.turns.at(-1)?.type === 'human' && attempt.restatedFor !== rx.turns.length) { await restate(); continue; }
            if (rx.status === 'awaiting-worker') {
              const asked = parseResponse(await judge('refusal', next.name, 'intake', next.name, { cwd: w.cwd, name: `${next.name}-refusal`, system: REFUSAL_SYSTEM,
                exchangeId: rx.id, packet: await store.refusalPacket(id, attempt.id) }));
              const questions = (Array.isArray(asked.questions) ? asked.questions : []).filter(q => typeof q === 'string' && q.trim());
              await store.nq(id, rx.id, { intent: typeof asked.intent === 'string' && asked.intent.trim() ? asked.intent : 'The hand-off lacks required parts.',
                questions: questions.length ? questions : missing.map(m => `The hand-off lacks: ${m}. Restate the complete deliverable with it.`), notes: asked.notes }, rx.worker, lastCallId);
              continue;
            }
            if (rx.status === 'awaiting-originator') { await restate(); continue; }
            return finish('question', `${step.name}: exchange ${rx.id} is ${rx.status}`);
          }
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
      if (!x || w.attempts.some(a => a.actor === x.worker && a.round === w.round && a.step === step.name && a.status !== 'replacement-intake')) {
        await store.delegate(id, `${step.role}-${randomUUID()}`);
        continue;
      }
      if (x.status === 'awaiting-worker') {
        const reply = await judge('intake', step.name, 'intake', step.name, { cwd: w.cwd, name: `${step.name}-nq`,
          system: 'You are the assigned worker for this step, in read-only intake before you execute. Do not infer your execution tools from the limited tools in this intake: test-plan execution has bash/write/edit; verify execution has bash. The coordinator handles reassignment, not the worker. Return ONLY JSON {intent:string, questions:string[], notes:string[]}. questions: only what blocks you from executing and cannot be settled from the packet, the workspace or the answers already in the exchange; never repeat a question the exchange has answered. notes: your assumptions and anything already settled; notes never block. An empty questions array confirms readiness.',
          packet: await store.packet(id, 'nq') });
        await store.nq(id, x.id, parseResponse(reply), x.worker, lastCallId);
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
            packet: await store.packet(id, 'originator') }));
          if (reply.unresolvedAuthority) {
            // Only the operator holds authority, but the operator's source is on hand: the dispatcher reads it
            // first. The work holds for the operator only when the source cannot settle it.
            if (x.originator === DISPATCHER) await store.answer(id, x.id, x.originator, reply.answer, reply.same, lastCallId);
            else await store.delegateAuthority(id, x.id, x.originator, `dispatcher-${randomUUID()}`, reply.answer, lastCallId);
            continue;
          }
          await store.answer(id, x.id, x.originator, reply.answer, reply.same, lastCallId);
          continue;
        }
        if (ax.status === 'awaiting-worker') {
          const reply = parseResponse(await judge('authority-intake', step.name, 'intake', 'discover', { cwd: w.cwd, exchangeId: ax.id, name: 'authority-intake',
            system: 'You are the dispatcher, in read-only authority intake before deciding. Return ONLY JSON {intent:string, questions:string[], notes:string[]}. Do not decide authority yet.',
            packet: await store.authorityPacket(id, ax.id, 'nq') }));
          await store.nq(id, ax.id, reply, ax.worker, lastCallId); continue;
        }
        if (ax.status === 'clear' && !ax.decision) {
          const ruled = parseResponse(await judge('authority', step.name, 'originator', 'discover', { exchangeId: ax.id,
            cwd: w.cwd, name: `${step.name}-authority`, system: AUTHORITY_SYSTEM,
            packet: JSON.stringify({ purpose: 'authority', threadId: w.id, workspace: w.cwd,
              objective: w.objective, source: w.source, questions: x.turns.at(-1)?.questions ?? [], handoff: ax.subject.handoff, exchange: ax.turns,
              instruction: 'The handoff file holds what the originator said. Decide from the objective and source only. If you cannot decide without asking the originator what it meant, return ONLY JSON {"questions":[string]}.' }) }));
          if (Array.isArray(ruled.questions) && ruled.questions.some(q => typeof q === 'string' && q.trim())) await store.reopenQuestion(id, ax.id, ruled.questions, lastCallId);
          else await store.decision(id, ax.id, ruled, lastCallId);
          continue;
        }
        if (ax.status === 'awaiting-originator') {
          // The dispatcher's question goes back to the originator, on the originator's own card.
          const o = await store.originator(id);
          const reply = parseResponse(await judge('originator', step.name, 'originator', o.step ?? (o.role === ARBITER.role ? 'arbitrate' : 'discover'), { cwd: w.cwd, exchangeId: ax.id, name: `${step.name}-originator`,
            system: originatorSystem(ax.originator), packet: await store.authorityPacket(id, ax.id) }));
          // Nothing escalates further: if this answer also needs the operator, the parent hand-off holds.
          await store.answer(id, ax.id, ax.originator, reply.answer, reply.same, lastCallId);
          continue;
        }
        const ruling = ax.decision ?? { answer: '', unresolvedAuthority: true };
        if (ruling.unresolvedAuthority) { await store.answer(id, x.id, x.originator, `${ax.subject.handoff}\n\nNot authorized by the operator source: ${ruling.answer}`); continue; }
        await store.answer(id, x.id, x.originator, `${ax.subject.handoff}\n\nAuthority, settled by the dispatcher from the operator's source: ${ruling.answer}`);
        continue;
      }
      if (x.status !== 'clear') return finish('question', `${step.name}: exchange ${x.id} is ${x.status}`);
      const card = x.receiver?.card ?? await pick(step.name);
      const attemptId = await store.begin(id, x.worker, card, accessOf(step.name));
      log(`${step.name}: ${step.role} working on ${card.harness} · ${card.model} (${attemptId})`);
      await store.execute(id, attemptId);
    }
  } catch (error) {
    if (error instanceof ReplacementIntake) return drive(store, id, { model, prescriptions, call, log });
    if (error instanceof QuotaOut) return { ...await finish('out-of-quota', error.message), resetsAt: error.resetsAt };
    throw error;
  }
}

const REFUSAL_SYSTEM = 'You receive this hand-off next. The driver checked the report you are about to receive and found required parts missing or invalid; they are listed in the packet. Read the report (the handoff file). Ask the reporting worker for what is missing, as questions, and nothing else. Return ONLY JSON {intent:string, questions:string[], notes:string[]}.';

const AUTHORITY_SYSTEM = `You are the ${DISPATCHER}, who dispatched this work for the operator. An agent said only the operator can authorize something. You hold the operator's own words: the objective and source. If they authorize it, explicitly or as a necessary part of what they ask for, say so and what is authorized. If they forbid it, say so. If they leave it genuinely open, or it is destructive, irreversible, touches production, money, credentials or anything outside this workspace, it is the operator's: set unresolvedAuthority:true and state the decision in one sentence with your recommendation. Never invent authority. Return ONLY JSON {answer:string, unresolvedAuthority:boolean}. If you cannot decide without asking the originator what it meant, return ONLY JSON {"questions":[string]} instead: the originator answers, then you decide.`;

const originatorSystem = (role, carried = false) => `You are ${role}, who handed over this work. ${role === DISPATCHER
  ? 'You dispatched it on behalf of the person who asked for it: answer from the objective and source only.'
  : role === ARBITER.role ? 'Your ruling on a failed test sent it here: answer from that ruling and the verifier report.'
  : 'Your accepted handoff output is in the packet: answer from it and the source.'} The receiving worker asked questions before executing. Clarify what you handed over; never change your handoff or the work, and never invent operator authority. Return ONLY JSON {answer:string, unresolvedAuthority:boolean}. If only the operator can answer, set unresolvedAuthority:true and say what is needed.${carried ? ' If a question repeats one in the packet\'s "carried" list in meaning, in any wording, also list it in "same":[{"question":<the question exactly as asked now>,"id":<the carried id>}].' : ''}`;

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
async function arbitrate(w, failure, exchange, { ask }) {
  const byStep = name => w.attempts.findLast(a => a.step === name && a.status === 'accepted')?.output ?? '(none)';
  const prompt = JSON.stringify({ objective: w.objective, workspace: w.cwd, failure: failure.report,
    plan: byStep('plan'), testPlan: byStep('test-plan'), testScripts: w.attempts.findLast(a => a.step === 'test-plan' && a.status === 'accepted')?.testPlan ?? null, implementation: byStep('implement'),
    priorRulings: w.failures.filter(f => f.ruling).map(f => f.ruling), exchange }, null, 2);
  try {
    const verdict = parseResponse(await ask({ cwd: w.cwd, name: 'arbiter', prompt,
      system: `You are the ${ARBITER.role}. ${ARBITER.duty} Inspect the actual code, tests and history; you may run the tests. The failure is a failed check, or a maker or check designer that could not do its step as written. Decide exactly one cause: "pre-existing" (a defect that existed before this work), "implementation" (the new code or the plan it follows is wrong), "test" (the test is wrong). If the evidence does not decide it, answer "undetermined". Return ONLY JSON {"cause":"pre-existing"|"implementation"|"test"|"undetermined","answer":string,"evidence":string}. The answer is what the responsible party must do. If you cannot decide without asking the failing step a question, return ONLY JSON {"questions":[string]} instead: it answers, then you rule.` }));
    if (Array.isArray(verdict.questions) && verdict.questions.some(q => typeof q === 'string' && q.trim())) return { questions: verdict.questions.filter(q => typeof q === 'string' && q.trim()) };
    return { cause: CAUSES.includes(verdict.cause) ? verdict.cause : 'undetermined', answer: verdict.answer ?? '', evidence: verdict.evidence ?? '', by: ARBITER.role };
  } catch (error) {
    if (error instanceof QuotaOut || error instanceof ReplacementIntake || error.callId) throw error;
    return { cause: 'undetermined', answer: `Arbiter could not rule: ${error.message}`, evidence: '', by: ARBITER.role };
  }
}
