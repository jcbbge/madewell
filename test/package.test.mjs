import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = (command, args, options) => new Promise((done, reject) => execFile(command, args, options,
  (error, stdout) => error ? reject(error) : done(stdout)));

test('distribution: npm packed file graph closes over runtime imports and entrypoints, not local state', async t => {
  const scratch = await mkdtemp(join(tmpdir(), 'madewell-pack-'));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  const output = await run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root, env: { ...process.env, npm_config_cache: join(scratch, 'cache') }, maxBuffer: 4 << 20,
  });
  const files = new Set(JSON.parse(output)[0].files.map(file => file.path));
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.equal(new Set(pkg.files).size, pkg.files.length, 'no repeated allowlist entries');
  for (const file of await readdir(root)) if (file.endsWith('.mjs')) assert.ok(files.has(file), `runtime module ${file} is packed`);
  for (const file of [pkg.bin['pi-durable'], ...pkg.pi.extensions.map(p => p.replace(/^\.\//, '')), 'DISPATCH.md', 'prescriptions.json', 'harness/claude/made-well/SKILL.md', 'harness/codex/made-well/SKILL.md']) assert.ok(files.has(file), file);
  for (const file of files) {
    assert.doesNotMatch(file, /^(?:node_modules|test|experimental|\.madewell|\.git|\.pi)\//, 'no local work or test state distributed');
    if (!/\.(?:mjs|ts)$/.test(file)) continue;
    const text = await readFile(join(root, file), 'utf8');
    for (const match of text.matchAll(/(?:from\s*|import\s*\(|new URL\()\s*['"](\.\.?\/[^'"]+)['"]/g)) {
      const dependency = posix.normalize(posix.join(dirname(file), match[1]));
      assert.ok(files.has(dependency), `${file} needs ${dependency} in packed release`);
    }
  }
});
