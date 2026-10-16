import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPiArgs, progressExtension as defaultProgressExtension } from './pi-runtime.mjs';
import { summarizePi } from './pi-stream.mjs';

// A card is [harness][provider][model] + effort. `account` is the quota pool a swap must leave:
// pi on openai-codex and codex both draw on the same ChatGPT account, so both are "openai".
export const HARNESSES = ['claude', 'codex', 'pi'];
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
export const ACCESS = ['read', 'checks', 'make', 'run'];
const HARNESS_PROVIDER = { claude: 'anthropic', codex: 'openai' }; // pi takes any provider

export const defaultPrescriptions = fileURLToPath(new URL('./prescriptions.json', import.meta.url));

export function loadPrescriptions(path = process.env.PI_DURABLE_PRESCRIPTIONS || defaultPrescriptions) {
  let text;
  try { text = readFileSync(path, 'utf8'); } catch (error) { throw new Error(`Prescriptions ${path}: cannot read (${error.code ?? error.message})`); }
  let parsed;
  try { parsed = JSON.parse(text); } catch (error) { throw new Error(`Prescriptions ${path}: not JSON (${error.message})`); }
  return validatePrescriptions(parsed, path);
}

const isText = v => typeof v === 'string' && v.trim() !== '';

export function validatePrescriptions(p, where = 'prescriptions') {
  const fail = message => { throw new Error(`Prescriptions ${where}: ${message}`); };
  if (!p || typeof p !== 'object' || Array.isArray(p)) fail('must be an object with "tiers" and "jobs"');
  if (!p.tiers || typeof p.tiers !== 'object' || Array.isArray(p.tiers)) fail('"tiers" must be an object of tier name → cards');
  if (!p.jobs || typeof p.jobs !== 'object' || Array.isArray(p.jobs)) fail('"jobs" must be an object of job name → {tier, access}');
  for (const [tier, cards] of Object.entries(p.tiers)) {
    if (tier === 'inherit') fail('"inherit" is reserved and cannot name a tier');
    if (!Array.isArray(cards) || cards.length === 0) fail(`tier "${tier}" must be a non-empty list of cards`);
    cards.forEach((card, i) => {
      const at = `tier "${tier}" card ${i + 1}`;
      if (!card || typeof card !== 'object') fail(`${at} must be an object`);
      if (!HARNESSES.includes(card.harness)) fail(`${at}: harness must be one of ${HARNESSES.join(', ')} (got ${JSON.stringify(card.harness)})`);
      for (const key of ['provider', 'account', 'model']) if (!isText(card[key])) fail(`${at}: "${key}" is required`);
      if (!EFFORTS.includes(card.effort)) fail(`${at}: effort must be one of ${EFFORTS.join(', ')} (got ${JSON.stringify(card.effort)})`);
      const only = HARNESS_PROVIDER[card.harness];
      if (only && card.provider !== only) fail(`${at}: harness ${card.harness} only reaches provider "${only}" (got "${card.provider}")`);
    });
  }
  for (const [job, rx] of Object.entries(p.jobs)) {
    if (!rx || typeof rx !== 'object') fail(`job "${job}" must be {tier, access}`);
    if (rx.tier !== 'inherit' && !Object.hasOwn(p.tiers, rx.tier)) fail(`job "${job}": unknown tier ${JSON.stringify(rx.tier)}`);
    if (!ACCESS.includes(rx.access)) fail(`job "${job}": access must be one of ${ACCESS.join(', ')} (got ${JSON.stringify(rx.access)})`);
  }
  return p;
}

// Ordered cards for a job. "inherit" uses the tier of the job that made the handoff.
export function cardsFor(prescriptions, job, { fromJob } = {}) {
  const rx = prescriptions.jobs[job];
  if (!rx) throw new Error(`No prescription for job "${job}"`);
  let tier = rx.tier;
  if (tier === 'inherit') {
    if (!fromJob) throw new Error(`Job "${job}" inherits its card: fromJob is required`);
    const from = prescriptions.jobs[fromJob];
    if (!from) throw new Error(`No prescription for job "${fromJob}" (inherited by "${job}")`);
    if (from.tier === 'inherit') throw new Error(`Job "${job}" cannot inherit from "${fromJob}", which inherits too`);
    tier = from.tier;
  }
  return prescriptions.tiers[tier].map(card => ({ ...card }));
}

// exhausted: {[account]: resetsAtEpochMs}. A null reset means "out, reset time unknown".
export function pickCard(cards, { exhausted = {}, now = Date.now() } = {}) {
  const out = account => Object.hasOwn(exhausted, account) && (exhausted[account] == null || exhausted[account] > now);
  const card = cards.find(c => !out(c.account));
  if (card) return { card, resetsAt: null };
  const resets = cards.map(c => exhausted[c.account]).filter(Number.isFinite);
  return { card: null, resetsAt: resets.length ? Math.min(...resets) : null };
}

// Access → the pi step whose TOOLS ceiling already expresses it, so pi keeps today's exact args.
const PI_STEP = { read: 'discover', checks: 'test-plan', make: 'implement', run: 'verify' };
const CLAUDE_ACCESS = {
  read: ['--permission-mode', 'dontAsk', '--tools', 'Read,Grep,Glob'],
  checks: ['--permission-mode', 'acceptEdits', '--tools', 'Read,Grep,Glob,Bash,Edit,Write', '--allowedTools', 'Bash'],
  make: ['--dangerously-skip-permissions'],
  run: ['--permission-mode', 'dontAsk', '--tools', 'Read,Grep,Glob,Bash', '--allowedTools', 'Bash'],
};
const CODEX_SANDBOX = { read: 'read-only', checks: 'workspace-write', make: 'workspace-write', run: 'workspace-write' };
const NOTES = {
  claude: { run: ['run: no Edit/Write tools, but Bash can still write files; the brief forbids edits'] },
  codex: {
    run: ['run: codex has no "tests only" mode; workspace-write lets the model edit, so the brief forbids edits'],
    checks: ['checks: workspace-write allows any edit inside the workspace; the trade write rule is checked elsewhere'],
  },
  pi: { run: ['run: bash can still write files; the brief forbids edits'] },
};

export const binaryFor = harness => ({
  pi: process.env.PI_DURABLE_PI || 'pi',
  claude: process.env.PI_DURABLE_CLAUDE || 'claude',
  codex: process.env.PI_DURABLE_CODEX || 'codex',
})[harness];

// One headless run of a card. The prompt always goes on stdin: `claude -p` and `pi --print`
// read it when no prompt argument is given, and `codex exec ... -` reads it explicitly.
// sessionId: pi continues or creates it; claude creates it (must be a UUID) unless resume is true;
// codex cannot choose an id up front, so a sessionId always means `codex exec resume <id>`.
// sessionDir and progressExtension apply to pi only; claude and codex keep sessions in their own homes.
export function buildLaunch(card, { access, system, sessionDir, sessionId, resume = false, progressExtension } = {}) {
  if (!HARNESSES.includes(card?.harness)) throw new TypeError(`Unknown harness ${card?.harness}`);
  if (!ACCESS.includes(access)) throw new TypeError(`Unknown access ${access}`);
  const notes = [...(NOTES[card.harness][access] ?? [])];
  let args;
  if (card.harness === 'pi') {
    if (typeof sessionDir !== 'string' || !isAbsolute(sessionDir)) throw new TypeError('Absolute sessionDir required');
    const progress = Boolean(progressExtension);
    args = buildPiArgs({ step: PI_STEP[access], system, model: `${card.provider}/${card.model}`, sessionDir, sessionId, progress });
    if (typeof progressExtension === 'string' && progressExtension !== defaultProgressExtension) {
      args[args.indexOf(defaultProgressExtension)] = progressExtension;
    }
    args.push('--thinking', card.effort);
  } else if (card.harness === 'claude') {
    // stream-json under --print requires --verbose (observed: claude 2.1.301 exits 1 without it).
    args = ['-p', '--verbose', '--output-format', 'stream-json', '--model', card.model, '--effort', card.effort,
      '--permission-prompts', 'none', ...CLAUDE_ACCESS[access]];
    if (system) args.push('--append-system-prompt', system);
    if (sessionId) args.push(resume ? '--resume' : '--session-id', sessionId);
    if (progressExtension) notes.push('progress: the durable_progress extension is pi-only');
  } else {
    // codex exec has no system-prompt flag; developer_instructions is the config key it reads.
    // TOML basic strings accept JSON string escapes, so JSON.stringify quotes the value.
    const config = [
      '-c', `model_reasoning_effort="${card.effort}"`,
      '-c', 'approval_policy="never"',
      ...(system ? ['-c', `developer_instructions=${JSON.stringify(system)}`] : []),
    ];
    const sandbox = CODEX_SANDBOX[access];
    args = sessionId
      // `codex exec resume` takes no -s; the sandbox goes through its config key instead.
      ? ['exec', 'resume', '--json', '--skip-git-repo-check', '-m', card.model, ...config, '-c', `sandbox_mode="${sandbox}"`, sessionId, '-']
      : ['exec', '--json', '--skip-git-repo-check', '-m', card.model, ...config, '-s', sandbox, '-'];
    if (progressExtension) notes.push('progress: the durable_progress extension is pi-only');
  }
  return { command: binaryFor(card.harness), args, env: {}, notes };
}

const events = text => text.split('\n').filter(l => l.trim()).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
const strings = value => typeof value === 'string' ? [value]
  : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
const seconds = s => Number.isFinite(s) ? s * 1000 : null;

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
// "resets 4pm (UTC)", "resets Mon 12:00am", "try again at 9:45 PM" → the next such moment after now.
// No zone named means the machine's local time, which is where the harness formatted it (judged).
export function clockToEpoch(text, now = Date.now()) {
  const m = /(?:\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?\s+)?\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?(\s*\(UTC\))?/i.exec(text);
  if (!m) return null;
  const [, day, h, min = '0', ap, utc] = m;
  const hour = (Number(h) % 12) + (ap.toLowerCase() === 'p' ? 12 : 0);
  const d = new Date(now);
  const dayOf = () => (utc ? d.getUTCDay() : d.getDay());
  if (utc) d.setUTCHours(hour, Number(min), 0, 0); else d.setHours(hour, Number(min), 0, 0);
  const want = day ? DAYS.indexOf(day.toLowerCase()) : null;
  for (let i = 0; i < 8 && (d.getTime() <= now || (want !== null && dayOf() !== want)); i++) {
    if (utc) d.setUTCDate(d.getUTCDate() + 1); else d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

const CLAUDE_LIMIT = /You['’]ve hit your [^\n"]*?limit · resets [^\n"]+/;
const CODEX_LIMIT = /[Yy]ou['’]ve hit your usage limit[^\n"]*/;
const PI_LIMIT = /You have hit your ChatGPT usage limit(?: \([^)]*\))?\.(?: Try again in ~(\d+) min\.)?/;

// One harness run's stdout → output, success, session, and any usage limit with its reset time.
// The caller still owns the exit code; exit codes on a limit are undocumented for all three.
export function parseRun(harness, stdoutText, { now = Date.now(), account } = {}) {
  const evs = events(stdoutText);
  if (harness === 'claude') {
    const result = evs.findLast(e => e.type === 'result');
    const sessionId = evs.find(e => e.session_id)?.session_id ?? null;
    const output = typeof result?.result === 'string' ? result.result : '';
    let limit = null;
    const record = evs.find(e => e.error === 'rate_limit' && e.quotaLimits)
      ?? evs.find(e => e.type === 'rate_limit_event' && e.rate_limit_info?.status === 'rejected');
    const text = evs.flatMap(strings).find(s => CLAUDE_LIMIT.test(s));
    const message = text ? CLAUDE_LIMIT.exec(text)[0] : null;
    if (record || message) {
      const machine = seconds(record?.quotaLimits?.resetsAt ?? record?.rate_limit_info?.resetsAt);
      limit = { account: account ?? 'anthropic', resetsAt: machine ?? (message ? clockToEpoch(message.split('resets')[1], now) : null),
        message: message ?? `rate limit ${record?.quotaLimits?.rateLimitType ?? record?.rate_limit_info?.rateLimitType ?? ''}`.trim() };
    }
    return { output, ok: result?.subtype === 'success' && result.is_error === false && !limit && output.trim() !== '', sessionId, limit };
  }
  if (harness === 'codex') {
    const sessionId = evs.find(e => e.type === 'thread.started')?.thread_id ?? null;
    const output = evs.filter(e => e.type === 'item.completed' && e.item?.type === 'agent_message').map(e => e.item.text).at(-1) ?? '';
    const failed = evs.some(e => e.type === 'turn.failed' || e.type === 'error');
    const all = evs.flatMap(strings);
    const rateLimits = evs.map(function find(o) {
      if (!o || typeof o !== 'object') return null;
      if (o.rate_limits && typeof o.rate_limits === 'object') return o.rate_limits;
      for (const v of Object.values(o)) { const r = find(v); if (r) return r; }
      return null;
    }).filter(Boolean).at(-1);
    const text = all.find(s => CODEX_LIMIT.test(s));
    const message = text ? CODEX_LIMIT.exec(text)[0] : null;
    const reached = rateLimits?.rate_limit_reached_type != null || all.includes('usage_limit_reached');
    let limit = null;
    if (message || reached) {
      const machine = seconds(rateLimits?.primary?.resets_at) ?? seconds(rateLimits?.secondary?.resets_at);
      const at = message && /try again at\s+(.+)/i.exec(message);
      limit = { account: account ?? 'openai', resetsAt: machine ?? (at ? clockToEpoch(at[1], now) : null),
        message: message ?? `usage limit reached (${rateLimits?.rate_limit_reached_type ?? 'usage_limit_reached'})` };
    }
    return { output, ok: evs.some(e => e.type === 'turn.completed') && !failed && !limit && output.trim() !== '', sessionId, limit };
  }
  if (harness === 'pi') {
    const summary = summarizePi(stdoutText);
    const sessionId = evs.find(e => e.type === 'session')?.id ?? null;
    const text = evs.flatMap(strings).find(s => PI_LIMIT.test(s));
    let limit = null;
    if (text) {
      const [message, minutes] = PI_LIMIT.exec(text);
      // pi's ChatGPT limit is the openai-codex subscription: the same pool as Codex.
      limit = { account: account ?? 'openai', resetsAt: minutes == null ? null : now + Number(minutes) * 60_000, message };
    }
    return { output: summary.output, ok: summary.finalStopReason === 'stop' && summary.output.trim() !== '' && !limit, sessionId, limit };
  }
  throw new TypeError(`Unknown harness ${harness}`);
}
