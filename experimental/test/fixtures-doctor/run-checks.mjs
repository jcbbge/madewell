import { spawn } from 'node:child_process';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const mode = process.argv[2] ?? 'focused';
const directory = resolve('.madewell/doctor-thread70-orion');
await mkdir(directory, { recursive: true });
const commands = {
  focused: [[process.execPath, '--test', 'test/doctor.test.mjs', 'test/doctor-probes.test.mjs', 'test/provision.test.mjs']],
  suite: [['npm', 'test']],
  native: [[process.execPath, '--test', '--test-name-pattern=doctor native pi', 'test/doctor-probes.test.mjs']],
  budget: [[process.execPath, '--test', 'test/doctor-budget.test.mjs']],
};
if (mode === 'syntax') {
  async function files(path) {
    return (await Promise.all((await readdir(path, { withFileTypes: true })).map(entry =>
      entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)]))).flat();
  }
  commands.syntax = [...await files('test/fixtures/doctor'), 'test/doctor-probes.test.mjs', 'test/doctor-budget.test.mjs', 'test/doctor.test.mjs', 'test/harness-fakes.mjs']
    .filter(p => /\.(mjs|ts)$/.test(p)).map(p => [process.execPath, '--check', p]);
}
if (!commands[mode]) throw new Error('Use syntax, focused, suite, native or budget');
const env = { ...process.env, ...(mode === 'native' || mode === 'budget' ? { DOCTOR_REQUIRE_NATIVE: '1' } : {}),
  ...(mode === 'budget' ? { DOCTOR_TEST_BUDGETS: '1' } : {}) };
let output = '', exitCode = 0;
const started = new Date().toISOString();
for (const [command, ...args] of commands[mode]) {
  const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  const capture = chunk => { const text = String(chunk); output += text; process.stdout.write(text); };
  child.stdout.on('data', capture); child.stderr.on('data', capture);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  if (code !== 0) { exitCode = code ?? 1; break; }
}
const log = join(directory, `${mode}.log`);
await writeFile(log, output || 'All syntax checks exited 0.\n');
await writeFile(join(directory, `${mode}.json`), JSON.stringify({ mode, started, finished: new Date().toISOString(), exitCode, commands: commands[mode], log }, null, 2));
console.log(`Evidence: ${log}`);
process.exitCode = exitCode;
