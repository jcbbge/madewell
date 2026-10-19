// Fake claude / codex / pi binaries for doctor and provision tests, in a temp HOME. Never the real ones.
import { mkdtemp, mkdir, writeFile, chmod } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
export const repo = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');

const SCRIPTS = {
  claude: ({ signedIn = true, auth } = {}) => `case "$1" in
  --version) echo "9.9.9 (Claude Code)";;
  auth) ${auth ? `echo '${auth}'` : `echo '{"loggedIn": ${signedIn}}'`};;
  *) echo "fake claude: no model runs here" >&2; exit 3;;
esac`,
  codex: ({ signedIn = true } = {}) => `case "$1" in
  --version) echo "codex-cli 9.9.9";;
  login) ${signedIn ? 'echo "Logged in using ChatGPT"' : 'echo "Not logged in" >&2; exit 1'};;
  *) echo "fake codex: no model runs here" >&2; exit 3;;
esac`,
  pi: ({ ready = ['openai-codex'] } = {}) => `case "$1" in
  --version) echo "9.9.9";;
  auth) for p in ${ready.join(' ') || 'none'}; do [ "$4" = "$p" ] && { echo '{"status":"ready","provider":"'"$4"'"}'; exit 0; }; done
        echo '{"status":"not_ready","provider":"'"$4"'","reason":"credentials_not_configured"}';;
  *) echo "fake pi: no model runs here" >&2; exit 3;;
esac`,
};

// harnesses: { claude: {...options} | undefined, codex: ..., pi: ... }; an absent key means not installed.
export async function machine(harnesses = {}) {
  const root = await mkdtemp(join(tmpdir(), 'mpd-home-')), home = join(root, 'home'), bin = join(root, 'bin');
  await mkdir(home); await mkdir(bin);
  for (const [name, options] of Object.entries(harnesses)) {
    if (!options) continue;
    // Probe-enabled fakes speak the CLI protocol and record only synthetic data
    // to a test-owned loopback listener; model containment forbids home writes.
    const probe = fileURLToPath(new URL('./fixtures/doctor/model-cli.mjs', import.meta.url));
    const quote = s => `'${String(s).replaceAll("'", "'\\''")}'`;
    const script = options.model ? `exec ${quote(process.execPath)} ${quote(probe)} ${quote(name)} ${quote(JSON.stringify(options))} "$@"` : SCRIPTS[name](options);
    await writeFile(join(bin, name), `#!/bin/sh\n${script}\n`);
    await chmod(join(bin, name), 0o755);
  }
  const env = { HOME: home, PATH: `${bin}:/usr/bin:/bin`, XDG_DATA_HOME: join(root, 'data') };
  return { root, home, bin, env };
}

export function runCli(args, env, { cwd, timeout } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--no-warnings', cli, ...args], { env, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = timeout ? setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`CLI exceeded test watchdog (${timeout}ms)`));
    }, timeout) : null;
    let stdout = '', stderr = '';
    child.stdout.on('data', c => { stdout += c; });
    child.stderr.on('data', c => { stderr += c; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}
