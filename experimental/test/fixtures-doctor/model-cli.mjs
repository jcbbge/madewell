// Synthetic CLI responses only. No account files or external services are used.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [harness, encoded, ...args] = process.argv.slice(2);
const options = JSON.parse(encoded);
const emit = value => console.log(JSON.stringify(value));
if (args.includes('--version')) {
  console.log(harness === 'claude' ? '9.9.9 (Claude Code)' : `${harness === 'codex' ? 'codex-cli ' : ''}9.9.9`);
} else if (args[0] === 'auth' || args[0] === 'login') {
  if (harness === 'claude') emit({ loggedIn: options.signedIn !== false });
  else if (harness === 'codex') console.log(options.signedIn === false ? 'Not logged in' : 'Logged in using ChatGPT');
  else emit({ status: 'ready', provider: args[args.indexOf('--provider') + 1] });
} else if (args.includes('exec') || args.includes('-p') || args.includes('--print')) {
  const prompt = args.includes('Reply with OK.') ? 'Reply with OK.' : readFileSync(0, 'utf8').trim();
  const env = Object.fromEntries(['HOME', 'CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'PI_CODING_AGENT_DIR',
    'PI_DURABLE_WORKER', 'WORK', 'WORK_TOKEN', 'WORKER_ID', 'CONSTELLATION_PIECE', 'DOCTOR_ACCOUNT_MARKER'].map(k => [k, process.env[k] ?? null]));
  if (process.env.DOCTOR_FAKE_RECORD_URL) {
    const r = await fetch(process.env.DOCTOR_FAKE_RECORD_URL, { method: 'POST', body: JSON.stringify({ harness, args, prompt, env, cwd: process.cwd() }), signal: AbortSignal.timeout(2000) });
    if (!r.ok) throw new Error('test invocation recorder failed');
  }
  if (options.model === 'credential-write') writeFileSync(join(process.env.HOME, 'credential-must-not-change'), 'changed');
  if (options.model === 'timeout') await new Promise(() => { setInterval(() => {}, 1000); });
  const messages = {
    rejected: 'The model fixture-default is not supported when using Codex with a ChatGPT account',
    authentication: 'Authentication failed: invalid API key',
    quota: 'Rate limit exceeded: usage_limit_reached',
    transport: 'Connection failed: ECONNRESET',
    interference: 'Hook blocked model request',
  };
  if (options.model !== 'accepted') {
    const message = messages[options.model] ?? 'Unclassified diagnostic error';
    if (harness === 'codex') { emit({ type: 'error', message }); emit({ type: 'turn.failed', error: { message } }); }
    else emit({ type: 'result', subtype: 'error_during_execution', is_error: true, errors: [message] });
    process.exitCode = 1;
  } else if (harness === 'claude') {
    emit({ type: 'result', subtype: 'success', is_error: false, result: 'OK', model: 'fixture-default', usage: { input_tokens: 1, output_tokens: 1 } });
  } else {
    emit({ type: 'thread.started', thread_id: 'fixture-session' });
    emit({ type: 'item.completed', item: { type: 'agent_message', text: 'OK' } });
    emit({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } });
  }
} else {
  // Unknown discovery commands must not accidentally look like a successful model request.
  console.error('unsupported fake CLI invocation');
  process.exitCode = 3;
}
