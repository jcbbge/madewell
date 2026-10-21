import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, test } from 'node:test'

const dir = mkdtempSync(join(tmpdir(), 'mw-cli-'))
after(() => rmSync(dir, { recursive: true, force: true }))
const cli = join(import.meta.dirname, '../src/cli.ts')
const env = {
	...process.env,
	MW_STORE: join(dir, 'mw.db'),
	MW_WORKER_COMMAND: `${process.execPath} ${join(import.meta.dirname, 'fixtures/scripted-worker.ts')}`,
	FAKE_LOG: join(dir, 'calls.log'),
}
const mw = (...args: string[]) => {
	const r = spawnSync(process.execPath, [cli, ...args], { env, cwd: dir, encoding: 'utf8' })
	return { code: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr ? JSON.parse(r.stderr) : null }
}

test('start → run ships through the CLI, and every answer names its next command', () => {
	writeFileSync(join(dir, 'madewell.json'), JSON.stringify({ ship: 'touch SHIPPED' }))
	const started = mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export to reports')
	assert.equal(started.code, 0)
	assert.equal(started.out.item.status, 'queued')
	assert.deepEqual(started.out.next.map((n: { run: string }) => n.run), ['mw run'])

	const ran = mw('run')
	assert.equal(ran.code, 0, JSON.stringify(ran.err))
	assert.equal(ran.out.items[0].status, 'shipped')
	assert.deepEqual(readFileSync(join(dir, 'calls.log'), 'utf8').trim().split('\n').filter((l) => l.startsWith('execute')), ['execute ideate ideator', 'execute challenge ideation peer', 'execute plan planner', 'execute test-plan test architect', 'execute implement implementer', 'execute verify verifier'])
	assert.match(mw('status').out.summary, /0 need you, 0 in progress, 0 queued, 1 shipped/)
})

test('errors are JSON on stderr with context and next commands', () => {
	const missing = mw('status', '99')
	assert.equal(missing.code, 1)
	assert.equal(missing.out, null)
	assert.equal(missing.err.error, 'item_not_found')
	assert.deepEqual(missing.err.next[0].run, 'mw status')

	// Another live process holds the runner: this test process.
	const db = new DatabaseSync(env.MW_STORE)
	db.prepare('INSERT INTO runner (id, pid, since, item) VALUES (1, ?, ?, 1)').run(process.pid, '2026-10-21T14:02:11Z')
	db.close()
	const locked = mw('run')
	assert.equal(locked.code, 1)
	assert.equal(locked.err.error, 'store_locked')
	assert.equal(locked.err.context.owner.pid, process.pid)
	assert.equal(locked.err.context.owner.item.title, 'Add CSV export')
	assert.deepEqual(locked.err.next.map((n: { run: string }) => n.run), ['mw status 1', `kill ${process.pid} && mw run`])
})

test('a runner killed mid-job is replaced: the next run resumes at that job without repeating earlier ones', async () => {
	const home = mkdtempSync(join(tmpdir(), 'mw-crash-'))
	after(() => rmSync(home, { recursive: true, force: true }))
	writeFileSync(join(home, 'madewell.json'), JSON.stringify({ ship: 'touch SHIPPED' }))
	const crashEnv = { ...env, MW_STORE: join(home, 'mw.db'), FAKE_LOG: join(home, 'calls.log'), FAKE_HANG: `implement:${join(home, 'hung')}` }
	const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { env: crashEnv, cwd: home, encoding: 'utf8' })
	run('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export')

	const { spawn } = await import('node:child_process')
	const runner = spawn(process.execPath, [cli, 'run'], { env: crashEnv, cwd: home, detached: true, stdio: 'ignore' })
	const log = () => (existsSync(join(home, 'calls.log')) ? readFileSync(join(home, 'calls.log'), 'utf8') : '')
	while (!log().includes('execute implement')) await new Promise((r) => setTimeout(r, 20))
	process.kill(-runner.pid!, 'SIGKILL') // the runner and its hung worker, as in a crash
	await new Promise((r) => runner.once('exit', r))

	const resumed = run('run')
	assert.equal(resumed.status, 0, resumed.stderr)
	assert.equal(JSON.parse(resumed.stdout).items[0].status, 'shipped')
	const calls = readFileSync(join(home, 'calls.log'), 'utf8').trim().split('\n')
	assert.deepEqual(calls.filter((l) => l.startsWith('execute')), ['execute ideate ideator', 'execute challenge ideation peer', 'execute plan planner', 'execute test-plan test architect', 'execute implement implementer', 'execute implement implementer', 'execute verify verifier'])
	// The resumed implementer was clear before the crash and keeps the same card: no new intake.
	assert.equal(calls.filter((l) => l === 'intake implement implementer').length, 1)
})
