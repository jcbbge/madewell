// Sources: accepted plan §2–3; official hook references listed in checks.md.
// Options are fixture data, never production hook interpretation.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join, isAbsolute, relative } from 'node:path';
import { spawn } from 'node:child_process';
const opt = JSON.parse(Buffer.from(process.argv[2], 'base64url'));
const input = JSON.parse(readFileSync(0, 'utf8'));
if (opt.expectedArg !== undefined) assert.equal(process.argv[3], opt.expectedArg);
const reply = value => console.log(JSON.stringify(value));
const deny = () => reply({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'fixture refusal' } });
const inside = path => isAbsolute(path) && !relative(realpathSync(process.cwd()), realpathSync(path)).startsWith('..');
if (opt.mode === 'validate') {
  try {
    assert.equal(process.env.PI_DURABLE_WORKER, '1');
    assert.equal(process.env.WORK, undefined);
    assert.equal(process.env.WORK_TOKEN, undefined);
    for (const [key, value] of Object.entries(opt.environment ?? {})) assert.equal(process.env[key], value);
    assert.equal(realpathSync(input.cwd), realpathSync(process.cwd()));
    assert.ok(input.session_id);
    assert.equal(input.hook_event_name, opt.event);
    assert.ok(inside(input.transcript_path));
    assert.ok(inside(process.env.TMPDIR));
    assert.equal(readFileSync(join(process.env.HOME, 'readable-sentinel'), 'utf8'), 'read permitted');
    writeFileSync(join(process.cwd(), 'allowed-scratch-write'), 'temporary');
    if (opt.harness === 'codex') assert.equal(typeof input.model, 'string');
    if (opt.event === 'PreToolUse') {
      assert.ok(input.tool_use_id);
      if (opt.tool === 'Bash') assert.equal(input.tool_input.command, 'echo pi-durable-doctor');
      else if (opt.harness === 'codex') {
        assert.equal(input.tool_name, 'apply_patch');
        assert.match(input.tool_input.command, /\*\*\* Begin Patch/);
        assert.ok(input.tool_input.command.includes(process.cwd()));
      } else {
        assert.equal(input.tool_name, 'Write');
        assert.ok(isAbsolute(input.tool_input.file_path));
        assert.ok(!relative(process.cwd(), input.tool_input.file_path).startsWith('..'));
        assert.equal(typeof input.tool_input.content, 'string');
      }
    } else {
      assert.equal(input.tool_name, undefined, 'lifecycle must not receive a Bash envelope');
      if (opt.event === 'UserPromptSubmit') assert.equal(typeof input.prompt, 'string');
      if (opt.event === 'Stop' || opt.event === 'SubagentStop') assert.equal(typeof input.stop_hook_active, 'boolean');
      if (opt.event.startsWith('Subagent')) { assert.ok(input.agent_id); assert.equal(input.agent_type, 'tldraw-offline'); }
      if (opt.event === 'SessionStart') assert.equal(input.source, 'startup');
      if (opt.event === 'SessionEnd') assert.equal(typeof input.reason, 'string');
    }
    if (opt.harness === 'codex' && !['SessionStart', 'SessionEnd'].includes(opt.event)) assert.ok(input.turn_id);
    reply({});
  } catch { process.exitCode = 2; }
} else if (opt.mode === 'guarded') {
  if (process.env.PI_DURABLE_WORKER !== '1') deny();
  else reply({});
} else if (opt.mode === 'conditional') {
  if (process.env[opt.key]) { reply({ decision: 'block', reason: 'fixture continuation' }); }
  else reply({});
} else if (opt.mode === 'stop-active') {
  if (input.stop_hook_active === opt.active) reply({ decision: 'block', reason: 'fixture continuation' });
  else reply({});
} else if (opt.mode === 'deny') deny();
else if (opt.mode === 'response') { if (opt.stdout !== undefined) console.log(opt.stdout); else reply(opt.json); process.exitCode = opt.code ?? 0; }
else if (opt.mode === 'overflow') process.stdout.write('x'.repeat(300 * 1024));
else if (opt.mode === 'signal') process.kill(process.pid, 'SIGKILL');
else if (opt.mode === 'containment') {
  // Only test-owned paths and a test-owned loopback listener are targeted.
  let escaped = false;
  try { writeFileSync(opt.outside, 'escaped'); escaped = true; } catch {}
  try { await fetch(opt.url, { signal: AbortSignal.timeout(700) }); escaped = true; } catch {}
  writeFileSync(join(process.cwd(), 'inside-allowed'), 'ok');
  if (escaped) deny(); else reply({});
} else if (opt.mode === 'hang') {
  const marker = `doctor-child-${opt.tag}`;
  spawn(process.execPath, ['-e', 'process.on("SIGTERM",()=>{}); setInterval(()=>{},1000)', marker], { stdio: 'ignore' });
  process.on('SIGTERM', () => {});
  if (opt.cancelFile && existsSync(opt.cancelFile)) process.kill(Number(readFileSync(opt.cancelFile, 'utf8')), 'SIGINT');
  setInterval(() => {}, 1000);
}
