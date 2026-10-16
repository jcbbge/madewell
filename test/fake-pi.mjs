#!/usr/bin/env node
// A scripted stand-in for `pi --print --mode json`. Scenario + call log live in FAKE_PI_STATE.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const argv = process.argv.slice(2), arg = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
const system = arg('--append-system-prompt') ?? '';
let prompt = '';
for await (const chunk of process.stdin) prompt += chunk;
const path = process.env.FAKE_PI_STATE, state = JSON.parse(readFileSync(path, 'utf8'));
const originator = (system.match(/^You are ([\w-]+), who handed over this work\./) ?? [])[1] ?? null;
const role = /You are the assigned worker in (?:read-only )?intake/.test(system) ? 'intake'
  : originator ? 'originator'
  : /You are the Arbiter/.test(system) ? 'arbiter'
  : (system.match(/^You are (\w+)\./) ?? [])[1] ?? 'unknown';
const take = key => { const list = state[key] ?? []; const value = list.length > 1 ? list.shift() : list[0]; return value; };
state.calls = (state.calls ?? 0) + 1;
appendFileSync(path + '.log', JSON.stringify({ n: state.calls, role, sessionId: arg('--session-id'), tools: arg('--tools'), as: originator, prompt, continued: /You were interrupted/.test(prompt), worker: process.env.PI_DURABLE_WORKER ?? null }) + '\n');

let text;
if (role === 'intake') {
  const q = take('intakeQuestions');
  text = JSON.stringify({ intent: 'understood', questions: q ? [q] : [], ambiguities: [] });
} else if (role === 'originator') text = JSON.stringify(take('originator') ?? { answer: 'Use the source.', unresolvedAuthority: false });
else if (role === 'arbiter') text = JSON.stringify(take('arbiter') ?? { cause: 'undetermined', answer: 'unclear', evidence: '' });
else if (role === 'Aldebaran') {
  const outcome = take('verify') ?? 'pass';
  text = `ran tests\n${JSON.stringify({ outcome, summary: outcome, failures: outcome === 'pass' ? [] : [{ test: 't1', expected: 'ok', observed: 'boom' }] })}`;
} else {
  if (state.hang?.[role] > 0) { state.hang[role]--; writeFileSync(path, JSON.stringify(state)); appendFileSync(path + '.log', JSON.stringify({ hanging: role, pid: process.pid }) + '\n'); setInterval(() => {}, 1000); await new Promise(() => {}); }
  text = `${role} done${/You were interrupted/.test(prompt) ? ' (continued)' : ''}`;
}
writeFileSync(path, JSON.stringify(state));
const out = e => process.stdout.write(JSON.stringify(e) + '\n');
out({ type: 'session', id: arg('--session-id') ?? 'none' });
if (role === 'Sirius' && process.env.PI_DURABLE_ATTEMPT) {
  out({ type: 'tool_execution_start', toolCallId: 'p1', toolName: 'durable_progress', args: { deliverable: 'parser', evidence: 'src/parser.js' } });
  out({ type: 'tool_execution_end', toolCallId: 'p1', toolName: 'durable_progress', isError: false, result: { details: { durableProgress: { attemptId: process.env.PI_DURABLE_ATTEMPT, deliverable: 'parser', evidence: 'src/parser.js' } } } });
}
out({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text }], stopReason: 'stop' } });
out({ type: 'agent_settled' });
