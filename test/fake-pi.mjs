#!/usr/bin/env node
// A scripted stand-in for `pi --print --mode json`. Scenario + call log live in FAKE_PI_STATE.
import { readFileSync, writeFileSync, appendFileSync, renameSync } from 'node:fs';

const argv = process.argv.slice(2), arg = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
const system = arg('--append-system-prompt') ?? '';
let prompt = '';
for await (const chunk of process.stdin) prompt += chunk;
const path = process.env.FAKE_PI_STATE;
// Work items driven in parallel share this file: read tolerantly, write by atomic rename.
const read = () => { for (let i = 0; ; i++) { try { return JSON.parse(readFileSync(path, 'utf8')); } catch (e) { if (i > 50) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); } } };
const save = s => { const tmp = `${path}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(s)); renameSync(tmp, path); };
const state = read();
const packet = (() => { try { return JSON.parse(prompt); } catch { return {}; } })();
const originator = (system.match(/^You are ([\w-]+), who handed over this work\./) ?? [])[1] ?? null;
const role = /You are the assigned worker[^.]*intake/.test(system) ? 'intake'
  : /^You are the dispatcher, who dispatched this work for the operator/.test(system) ? 'authority'
  : originator ? 'originator'
  : /You are the Arbiter/.test(system) ? 'arbiter'
  : (system.match(/^You are (\w+)\./) ?? [])[1] ?? 'unknown';
const take = key => { const list = state[key] ?? []; const value = list.length > 1 ? list.shift() : list[0]; return value; };
state.calls = (state.calls ?? 0) + 1;
// A scripted usage limit: state.limitOnce[role] = n makes the next n calls for that role on account "a" hit it.
const model = arg('--model'), limited = state.limitOnce?.[role] > 0 && model?.startsWith('a/');
if (limited) state.limitOnce[role]--;
appendFileSync(path + '.log', JSON.stringify({ n: state.calls, role, model, thinking: arg('--thinking'), limited, sessionId: arg('--session-id'), tools: arg('--tools'), as: originator, system, threadId: packet.threadId ?? null, prompt, continued: /You were interrupted/.test(prompt), worker: process.env.PI_DURABLE_WORKER ?? null }) + '\n');

let text;
if (limited) {
  save(state);
  process.stdout.write(JSON.stringify({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: `You have hit your ChatGPT usage limit (pro plan). Try again in ~${state.limitMinutes ?? 30} min.` }], stopReason: 'error' } }) + '\n');
  process.exit(1);
}
if (role === 'intake') {
  // askByThread[threadId]: that work item asks the same question at every intake (safe when items run in parallel).
  const q = state.askByThread?.[packet.threadId] ?? take('intakeQuestions');
  text = JSON.stringify({ intent: 'understood', questions: q ? [q] : [], notes: state.intakeNotes ?? [] });
} else if (role === 'authority') text = JSON.stringify(take('authority') ?? { answer: 'The source does not settle it.', unresolvedAuthority: true });
else if (role === 'originator') {
  const reply = { ...(take('originator') ?? { answer: 'Use the source.', unresolvedAuthority: false }) };
  // same: { "<question as asked now>": "<text of a question the packet carries>" } tags a reworded re-raise.
  if (state.same) {
    const tags = (packet.questions ?? []).flatMap(q => {
      const was = state.same[q], hit = was && (packet.carried ?? []).find(c => c.text === was);
      return hit ? [{ question: q, id: hit.id }] : [];
    });
    if (tags.length) reply.same = tags;
  }
  // sameInvalid: tags the store must ignore: an unknown id, and a known id under a question not asked this turn.
  if (state.sameInvalid) reply.same = [...(packet.questions ?? []).map(q => ({ question: q, id: 'not-a-ledger-id' })),
    ...(packet.carried ?? []).map(c => ({ question: 'a question nobody asked this turn', id: c.id }))];
  appendFileSync(path + '.log', JSON.stringify({ originatorSaw: { carried: packet.carried ?? null, questions: packet.questions ?? null }, same: reply.same ?? null }) + '\n');
  text = JSON.stringify(reply);
}
else if (role === 'arbiter') text = JSON.stringify(take('arbiter') ?? { cause: 'undetermined', answer: 'unclear', evidence: '' });
else if (role === 'Aldebaran') {
  const outcome = take('verify') ?? 'pass';
  if (state.noVerdictOnce > 0 && !/had no verdict/.test(prompt)) { state.noVerdictOnce--; save(state); text = "Verification passed: all named checks came back as expected. I changed nothing."; }
  else
  text = `ran tests\n${JSON.stringify({ outcome, summary: outcome, failures: outcome === 'pass' ? [] : [{ test: 't1', expected: 'ok', observed: 'boom' }] })}`;
} else {
  if (state.hang?.[role] > 0) { state.hang[role]--; save(state); appendFileSync(path + '.log', JSON.stringify({ hanging: role, pid: process.pid }) + '\n'); setInterval(() => {}, 1000); await new Promise(() => {}); }
  if (state.blockedOnce?.[role] > 0) { state.blockedOnce[role]--; text = `${role} stopped\n${JSON.stringify({ blocked: 'npm test cannot load the test folder' })}`; }
  else text = `${role} done${/You were interrupted/.test(prompt) ? ' (continued)' : ''}`;
}
save(state);
const out = e => process.stdout.write(JSON.stringify(e) + '\n');
out({ type: 'session', id: arg('--session-id') ?? 'none' });
if (role === 'Sirius' && process.env.PI_DURABLE_ATTEMPT) {
  out({ type: 'tool_execution_start', toolCallId: 'p1', toolName: 'durable_progress', args: { deliverable: 'parser', evidence: 'src/parser.js' } });
  out({ type: 'tool_execution_end', toolCallId: 'p1', toolName: 'durable_progress', isError: false, result: { details: { durableProgress: { attemptId: process.env.PI_DURABLE_ATTEMPT, deliverable: 'parser', evidence: 'src/parser.js' } } } });
}
out({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text }], stopReason: 'stop' } });
out({ type: 'agent_settled' });
