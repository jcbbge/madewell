import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPrescriptions, validatePrescriptions, cardsFor, pickCard, buildLaunch, parseRun, clockToEpoch, installed } from '../cards.mjs';
import { buildPiArgs, progressExtension } from '../pi-runtime.mjs';

const rx = loadPrescriptions();
const card = (harness, over = {}) => ({ ...rx.tiers.deep.find(c => c.harness === harness), ...over });
const flag = (args, name) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const lines = (...events) => events.map(e => JSON.stringify(e)).join('\n') + '\n';
const NOW = Date.UTC(2026, 9, 16, 12, 0, 0); // Fri 2026-10-16 12:00 UTC

test('prescriptions: the repo file loads and every tier is Claude, then Codex, then pi', async () => {
  for (const [tier, cards] of Object.entries(rx.tiers)) {
    assert.equal(cards[0].harness, 'claude', tier);
    assert.equal(cards[1].harness, 'codex', tier);
    if (cards[2]) assert.equal(cards[2].harness, 'pi', tier);
    for (const c of cards) assert.equal(c.account, c.harness === 'claude' ? 'anthropic' : 'openai');
  }
  assert.deepEqual(rx.jobs.implement, { tier: 'coding', access: 'make' });
  const dir = await mkdtemp(join(tmpdir(), 'mpd-rx-')), path = join(dir, 'rx.json');
  await writeFile(path, JSON.stringify({ tiers: { only: [card('pi')] }, jobs: { verify: { tier: 'only', access: 'run' } } }));
  process.env.PI_DURABLE_PRESCRIPTIONS = path;
  try { assert.deepEqual(Object.keys(loadPrescriptions().tiers), ['only']); } finally { delete process.env.PI_DURABLE_PRESCRIPTIONS; }
  await writeFile(path, '{nope');
  assert.throws(() => loadPrescriptions(path), /not JSON/);
  assert.throws(() => loadPrescriptions(join(dir, 'missing.json')), /cannot read \(ENOENT\)/);
});

test('prescriptions: validation names what is wrong', () => {
  const base = () => structuredClone(rx);
  const bad = (mutate, pattern) => { const p = base(); mutate(p); assert.throws(() => validatePrescriptions(p), pattern); };
  bad(p => { delete p.jobs; }, /"jobs" must be an object/);
  bad(p => { p.tiers.deep = []; }, /tier "deep" must be a non-empty list/);
  bad(p => { p.tiers.deep[0].harness = 'opencode'; }, /tier "deep" card 1: harness must be one of claude, codex, pi/);
  bad(p => { delete p.tiers.fast[2].account; }, /tier "fast" card 3: "account" is required/);
  bad(p => { p.tiers.coding[1].effort = 'ultra'; }, /effort must be one of/);
  bad(p => { p.tiers.deep[0].provider = 'openai'; }, /harness claude only reaches provider "anthropic"/);
  bad(p => { p.tiers.deep[1].provider = 'anthropic'; }, /harness codex only reaches provider "openai"/);
  bad(p => { p.jobs.verify.tier = 'slow'; }, /job "verify": unknown tier "slow"/);
  bad(p => { p.jobs.verify.access = 'write'; }, /job "verify": access must be one of read, checks, make, run/);
  bad(p => { p.tiers.inherit = p.tiers.deep; }, /"inherit" is reserved/);
  const pi = base(); pi.tiers.deep[2].provider = 'anthropic';
  assert.doesNotThrow(() => validatePrescriptions(pi), 'pi may use any provider');
});

test('cardsFor: tier order, and "inherit" takes the tier of the job that handed off', () => {
  assert.deepEqual(cardsFor(rx, 'implement').map(c => `${c.harness}:${c.model}:${c.effort}`),
    ['claude:claude-sonnet-5-5:low', 'codex:gpt-6.1-sol:low', 'pi:gpt-6.1-sol:low']);
  assert.deepEqual(cardsFor(rx, 'originator', { fromJob: 'verify' }), rx.tiers.fast);
  assert.deepEqual(cardsFor(rx, 'originator', { fromJob: 'plan' }), rx.tiers.deep);
  assert.throws(() => cardsFor(rx, 'originator'), /fromJob is required/);
  assert.throws(() => cardsFor(rx, 'originator', { fromJob: 'originator' }), /inherits too/);
  assert.throws(() => cardsFor(rx, 'nope'), /No prescription for job "nope"/);
  const copy = cardsFor(rx, 'plan'); copy[0].model = 'changed';
  assert.equal(rx.tiers.deep[0].model, 'claude-opus-5-5', 'returned cards are copies');
});

test('pickCard: an exhausted account skips every card on it, returns after reset, else null + earliest reset', () => {
  const cards = cardsFor(rx, 'plan');
  assert.equal(pickCard(cards, { now: NOW }).card.harness, 'claude');
  assert.equal(pickCard(cards, { exhausted: { anthropic: NOW + 1000 }, now: NOW }).card.harness, 'codex');
  const openaiOut = pickCard(cardsFor(rx, 'implement').reverse(), { exhausted: { openai: NOW + 1000 }, now: NOW });
  assert.equal(openaiOut.card.harness, 'claude', 'codex and pi share the openai account, so both are skipped');
  assert.equal(pickCard(cards, { exhausted: { anthropic: NOW - 1 }, now: NOW }).card.harness, 'claude', 'back after reset');
  assert.deepEqual(pickCard(cards, { exhausted: { anthropic: NOW + 5000, openai: NOW + 2000 }, now: NOW }), { card: null, resetsAt: NOW + 2000 });
  assert.deepEqual(pickCard(cards, { exhausted: { anthropic: null, openai: null }, now: NOW }), { card: null, resetsAt: null });
  assert.deepEqual(pickCard(cards, { exhausted: { anthropic: null, openai: NOW + 3000 }, now: NOW }), { card: null, resetsAt: NOW + 3000 });
});

test('buildLaunch pi: today\'s buildPiArgs plus --thinking, for every access level', () => {
  const sessionDir = '/tmp/s', steps = { read: 'discover', checks: 'test-plan', make: 'implement', run: 'verify' };
  for (const [access, step] of Object.entries(steps)) {
    const launch = buildLaunch(card('pi'), { access, system: 'You are Vega.', sessionDir, sessionId: 'abc', progressExtension: true });
    const today = buildPiArgs({ step, system: 'You are Vega.', model: 'openai-codex/gpt-6-astra', sessionDir, sessionId: 'abc', progress: true });
    assert.deepEqual(launch.args, [...today, '--thinking', 'high'], access);
    assert.equal(launch.command, process.env.PI_DURABLE_PI || 'pi');
  }
  const read = buildLaunch(card('pi'), { access: 'read', sessionDir }).args;
  assert.equal(flag(read, '--tools'), 'read,grep,find,ls');
  assert.equal(flag(read, '--model'), 'openai-codex/gpt-6-astra');
  assert.ok(!read.includes('--extension') && !read.includes('--session-id'));
  assert.equal(flag(buildLaunch(card('pi'), { access: 'make', sessionDir }).args, '--tools'), undefined, 'make: every tool');
  assert.equal(flag(buildLaunch(card('pi'), { access: 'run', sessionDir }).args, '--tools'), 'read,grep,find,ls,bash');
  const custom = buildLaunch(card('pi'), { access: 'make', sessionDir, progressExtension: '/x/progress.mjs' }).args;
  assert.equal(flag(custom, '--extension'), '/x/progress.mjs');
  assert.ok(!custom.includes(progressExtension));
  assert.throws(() => buildLaunch(card('pi'), { access: 'read', sessionDir: 'rel' }), /Absolute sessionDir/);
  assert.throws(() => buildLaunch(card('pi'), { access: 'write', sessionDir }), /Unknown access/);
});

test('buildLaunch claude: print + stream-json, model, effort, permissions per access', () => {
  const base = ['-p', '--verbose', '--output-format', 'stream-json', '--model', 'claude-opus-5-5', '--effort', 'high', '--permission-prompts', 'none'];
  const args = access => buildLaunch(card('claude'), { access }).args;
  assert.deepEqual(args('read'), [...base, '--permission-mode', 'dontAsk', '--tools', 'Read,Grep,Glob']);
  assert.deepEqual(args('checks'), [...base, '--permission-mode', 'acceptEdits', '--tools', 'Read,Grep,Glob,Bash,Edit,Write', '--allowedTools', 'Bash']);
  assert.deepEqual(args('make'), [...base, '--dangerously-skip-permissions']);
  assert.deepEqual(args('run'), [...base, '--permission-mode', 'dontAsk', '--tools', 'Read,Grep,Glob,Bash', '--allowedTools', 'Bash']);
  const id = '361cb67f-abf6-44f6-b0ba-1dc7635e9bc6';
  const full = buildLaunch(card('claude'), { access: 'read', system: 'You are Vega.', sessionId: id, progressExtension: true });
  assert.equal(flag(full.args, '--append-system-prompt'), 'You are Vega.');
  assert.equal(flag(full.args, '--session-id'), id);
  assert.equal(flag(buildLaunch(card('claude'), { access: 'read', sessionId: id, resume: true }).args, '--resume'), id);
  assert.match(full.notes.join('\n'), /pi-only/);
  assert.match(buildLaunch(card('claude'), { access: 'run' }).notes.join('\n'), /Bash can still write/);
  process.env.PI_DURABLE_CLAUDE = '/fake/claude';
  try { assert.equal(buildLaunch(card('claude'), { access: 'read' }).command, '/fake/claude'); } finally { delete process.env.PI_DURABLE_CLAUDE; }
});

test('buildLaunch codex: exec --json, model, reasoning effort, sandbox per access, prompt on stdin', () => {
  const sandbox = { read: 'read-only', checks: 'danger-full-access', make: 'danger-full-access', run: 'danger-full-access' };
  for (const [access, mode] of Object.entries(sandbox)) {
    assert.deepEqual(buildLaunch(card('codex'), { access }).args, ['exec', '--json', '--skip-git-repo-check', '-m', 'gpt-6-astra',
      '-c', 'model_reasoning_effort="high"', '-c', 'approval_policy="never"', '-s', mode, '-'], access);
  }
  const sys = buildLaunch(card('codex'), { access: 'read', system: 'Say "hi"\nthen stop.' }).args;
  assert.ok(sys.includes('developer_instructions="Say \\"hi\\"\\nthen stop."'));
  const resumed = buildLaunch(card('codex'), { access: 'make', sessionId: '01a145d5-c83d-7200-b2ce-14f19c1ec0b2' }).args;
  assert.deepEqual(resumed.slice(0, 3), ['exec', 'resume', '--json']);
  assert.ok(resumed.includes('sandbox_mode="danger-full-access"') && !resumed.includes('-s'));
  assert.deepEqual(resumed.slice(-2), ['01a145d5-c83d-7200-b2ce-14f19c1ec0b2', '-']);
  assert.match(buildLaunch(card('codex'), { access: 'run' }).notes.join('\n'), /no OS sandbox/);
  process.env.PI_DURABLE_CODEX = '/fake/codex';
  try { assert.equal(buildLaunch(card('codex'), { access: 'read' }).command, '/fake/codex'); } finally { delete process.env.PI_DURABLE_CODEX; }
});

// Success fixtures are trimmed from real runs on this machine (2026-10-16): claude 2.1.301,
// codex 0.159.2, pi 1.2.0. Limit fixtures follow the dossier's documented records and texts.
const CLAUDE_OK = lines(
  { type: 'system', subtype: 'init', session_id: '361cb67f-abf6-44f6-b0ba-1dc7635e9bc6', model: 'claude-haiku-5-5', permissionMode: 'dontAsk' },
  { type: 'assistant', message: { model: 'claude-haiku-5-5', content: [{ type: 'text', text: 'ok' }] }, session_id: '361cb67f-abf6-44f6-b0ba-1dc7635e9bc6' },
  { type: 'rate_limit_event', rate_limit_info: { status: 'allowed', resetsAt: 1792180200, rateLimitType: 'five_hour' }, session_id: '361cb67f-abf6-44f6-b0ba-1dc7635e9bc6' },
  { type: 'result', subtype: 'success', is_error: false, result: 'ok', session_id: '361cb67f-abf6-44f6-b0ba-1dc7635e9bc6' });
const CODEX_OK = lines(
  { type: 'thread.started', thread_id: '01a145d5-c83d-7200-b2ce-14f19c1ec0b2' },
  { type: 'turn.started' },
  { type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text: 'ok' } },
  { type: 'turn.completed', usage: { input_tokens: 19267, output_tokens: 7 } });
const PI_OK = lines(
  { type: 'session', id: '01a145d5-f88b-7022-8c17-ee76c55ae802' },
  { type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }], stopReason: 'stop', model: 'gpt-6-luna' } },
  { type: 'agent_settled' });

test('parseRun: a normal successful run for each harness', () => {
  assert.deepEqual(parseRun('claude', CLAUDE_OK), { output: 'ok', ok: true, sessionId: '361cb67f-abf6-44f6-b0ba-1dc7635e9bc6', limit: null });
  assert.deepEqual(parseRun('codex', CODEX_OK), { output: 'ok', ok: true, sessionId: '01a145d5-c83d-7200-b2ce-14f19c1ec0b2', limit: null });
  assert.deepEqual(parseRun('pi', PI_OK), { output: 'ok', ok: true, sessionId: '01a145d5-f88b-7022-8c17-ee76c55ae802', limit: null });
  assert.equal(parseRun('codex', lines({ type: 'thread.started', thread_id: 't' }, { type: 'turn.failed', error: { message: 'boom' } })).ok, false);
  assert.equal(parseRun('claude', lines({ type: 'result', subtype: 'error_during_execution', is_error: true, result: '' })).ok, false);
  assert.throws(() => parseRun('opencode', ''), /Unknown harness/);
});

test('parseRun claude: rate_limit record with quotaLimits.resetsAt (Unix seconds) and the limit text', () => {
  const record = { type: 'assistant', message: { model: '<synthetic>', content: [{ type: 'text', text: "You've hit your weekly limit · resets 4pm (UTC)" }] },
    quotaLimits: { status: 'rejected', resetsAt: 1790784000, rateLimitType: 'seven_day' }, error: 'rate_limit', isApiErrorMessage: true, apiErrorStatus: 429 };
  const r = parseRun('claude', lines(record, { type: 'result', subtype: 'success', is_error: true, result: "You've hit your weekly limit · resets 4pm (UTC)" }), { now: NOW });
  assert.equal(r.ok, false);
  assert.deepEqual(r.limit, { account: 'anthropic', resetsAt: 1790784000 * 1000, message: "You've hit your weekly limit · resets 4pm (UTC)" });
  // Text only: the reset clock time becomes the next such moment.
  const text = parseRun('claude', lines({ type: 'result', subtype: 'success', is_error: false, result: "You've hit your session limit · resets 7:10am (UTC)" }), { now: NOW });
  assert.equal(text.limit.resetsAt, Date.UTC(2026, 9, 17, 7, 10));
  assert.equal(text.ok, false);
  const weekly = parseRun('claude', lines({ type: 'result', result: "You've hit your weekly limit · resets Mon 12:00am (UTC)" }), { now: NOW });
  assert.equal(weekly.limit.resetsAt, Date.UTC(2026, 9, 19, 0, 0));
  const event = parseRun('claude', lines({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1792180200, rateLimitType: 'five_hour' } }), { now: NOW });
  assert.deepEqual(event.limit, { account: 'anthropic', resetsAt: 1792180200 * 1000, message: 'rate limit five_hour' });
});

test('parseRun codex: usage_limit_reached / rate_limit_reached_type / "hit your usage limit … try again at"', () => {
  const text = "You've hit your usage limit. Visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at 9:45 PM.";
  const r = parseRun('codex', lines({ type: 'thread.started', thread_id: 't1' }, { type: 'error', message: text }, { type: 'turn.failed', error: { message: text } }), { now: NOW });
  assert.equal(r.ok, false);
  assert.equal(r.sessionId, 't1');
  assert.equal(r.limit.account, 'openai');
  const local = new Date(NOW); local.setHours(21, 45, 0, 0); if (local.getTime() <= NOW) local.setDate(local.getDate() + 1);
  assert.equal(r.limit.resetsAt, local.getTime());
  assert.match(r.limit.message, /hit your usage limit/);
  const machine = parseRun('codex', lines({ type: 'event_msg', payload: { type: 'token_count', rate_limits: { limit_id: 'codex',
    primary: { used_percent: 100, window_minutes: 10080, resets_at: 1791046824 }, secondary: null, plan_type: 'pro', rate_limit_reached_type: 'primary' } } }), { now: NOW });
  assert.deepEqual(machine.limit, { account: 'openai', resetsAt: 1791046824 * 1000, message: 'usage limit reached (primary)' });
  const code = parseRun('codex', lines({ type: 'error', error: { code: 'usage_limit_reached' } }), { now: NOW });
  assert.equal(code.limit.resetsAt, null);
  const fine = parseRun('codex', lines({ type: 'event_msg', payload: { rate_limits: { primary: { used_percent: 18, resets_at: 1791046824 }, rate_limit_reached_type: null } } }));
  assert.equal(fine.limit, null, 'rate_limits with nothing reached is not a limit');
});

test('parseRun pi: "You have hit your ChatGPT usage limit (… plan). Try again in ~N min."', () => {
  const message = 'You have hit your ChatGPT usage limit (pro plan). Try again in ~42 min.';
  const r = parseRun('pi', lines({ type: 'session', id: 's1' },
    { type: 'message_end', message: { role: 'assistant', content: [], stopReason: 'error', errorMessage: message } },
    { type: 'auto_retry_end', success: false, attempt: 3, finalError: message }), { now: NOW });
  assert.deepEqual(r, { output: '', ok: false, sessionId: 's1', limit: { account: 'openai', resetsAt: NOW + 42 * 60_000, message } });
  const bare = parseRun('pi', lines({ type: 'message_end', message: { role: 'assistant', content: [], stopReason: 'error', errorMessage: 'You have hit your ChatGPT usage limit.' } }));
  assert.deepEqual(bare.limit, { account: 'openai', resetsAt: null, message: 'You have hit your ChatGPT usage limit.' });
});

test('clockToEpoch: next occurrence, UTC or local', () => {
  assert.equal(clockToEpoch('4pm (UTC)', NOW), Date.UTC(2026, 9, 16, 16, 0));
  assert.equal(clockToEpoch('11am (UTC)', NOW), Date.UTC(2026, 9, 17, 11, 0));
  assert.equal(clockToEpoch('Fri 12:00am (UTC)', NOW), Date.UTC(2026, 9, 23, 0, 0));
  assert.equal(clockToEpoch('no time here', NOW), null);
});

test('parseRun: limit text inside tool output is not a limit (a worker may read a file that quotes one)', () => {
  const quoted = 'You have hit your ChatGPT usage limit (pro plan). Try again in ~5 min.';
  const pi = parseRun('pi', lines(
    { type: 'tool_execution_end', toolCallId: 'r1', toolName: 'read', isError: false, result: { content: [{ type: 'text', text: quoted }] } },
    { type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'done' }], stopReason: 'stop' } }), { now: NOW });
  assert.equal(pi.limit, null); assert.equal(pi.ok, true);
  const claude = parseRun('claude', lines(
    { type: 'user', message: { content: [{ type: 'tool_result', content: "You've hit your weekly limit · resets 4pm (UTC)" }] } },
    { type: 'result', subtype: 'success', is_error: false, result: 'done', session_id: 's' }), { now: NOW });
  assert.equal(claude.limit, null); assert.equal(claude.ok, true);
  const codex = parseRun('codex', lines({ type: 'thread.started', thread_id: 't' },
    { type: 'item.completed', item: { type: 'command_execution', aggregated_output: "usage_limit_reached You've hit your usage limit" } },
    { type: 'item.completed', item: { type: 'agent_message', text: 'done' } }, { type: 'turn.completed' }), { now: NOW });
  assert.equal(codex.limit, null); assert.equal(codex.ok, true);
});

test('parseRun claude: a run that recovered from a rejected rate-limit event and finished is a success', () => {
  const r = parseRun('claude', lines({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1792180200 } },
    { type: 'result', subtype: 'success', is_error: false, result: 'the plan', session_id: 's' }), { now: NOW });
  assert.equal(r.ok, true); assert.equal(r.limit, null); assert.equal(r.output, 'the plan');
});

test('installed: a harness counts only if it can run here', () => {
  const pi = { harness: 'pi', provider: 'p', account: 'p', model: 'm', effort: 'low' };
  const was = process.env.PI_DURABLE_PI;
  try {
    process.env.PI_DURABLE_PI = '/bin/sh'; assert.equal(installed(pi), true, 'an executable path');
    process.env.PI_DURABLE_PI = '/nonexistent/pi'; assert.equal(installed(pi), false, 'a missing path');
    process.env.PI_DURABLE_PI = 'sh'; assert.equal(installed(pi), true, 'a command on PATH');
    assert.equal(installed(pi, { env: { PATH: '' } }), false, 'not on an empty PATH');
  } finally { if (was === undefined) delete process.env.PI_DURABLE_PI; else process.env.PI_DURABLE_PI = was; }
});
