import assert from 'node:assert/strict'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, test } from 'node:test'

const root = mkdtempSync(join(tmpdir(), 'mw-cli-'))
after(() => rmSync(root, { recursive: true, force: true }))
const cli = join(import.meta.dirname, '../src/cli.ts')
// `mw` on PATH, so `next` commands can be run exactly as written.
const bin = join(root, 'bin')
mkdirSync(bin)
writeFileSync(join(bin, 'mw'), `#!/bin/sh\nexec "${process.execPath}" "${cli}" "$@"\n`, { mode: 0o755 })

/** A fresh Made Well home and a product repo with one commit on main, which is the working directory. */
function setup(extra: Record<string, string> = {}) {
	const dir = mkdtempSync(join(root, 'case-'))
	const home = join(dir, 'home')
	const repo = join(dir, 'repo')
	mkdirSync(repo)
	const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
	git('init', '-q', '-b', 'main')
	git('-c', 'user.name=Operator', '-c', 'user.email=op@example.com', 'commit', '-q', '--allow-empty', '-m', 'first')
	git('config', 'user.name', 'Operator')
	git('config', 'user.email', 'op@example.com')
	const env: Record<string, string | undefined> = { ...process.env, MW_HOME: home, MW_WORKER_COMMAND: `${process.execPath} ${join(import.meta.dirname, 'fixtures/scripted-worker.ts')}`, FAKE_LOG: join(dir, 'calls.log'), PATH: `${bin}:${process.env.PATH}`, ...extra }
	delete env.MW_STORE
	const parse = (r: ReturnType<typeof spawnSync>) => ({ code: r.status, out: r.stdout.length ? JSON.parse(String(r.stdout)) : null, err: r.stderr.length ? JSON.parse(String(r.stderr)) : null })
	const mw = (...args: string[]) => parse(spawnSync(process.execPath, [cli, ...args], { env, cwd: repo }))
	const sh = (command: string) => parse(spawnSync('sh', ['-c', command], { env, cwd: repo }))
	return { dir, home, repo, env, mw, sh, git }
}

const COMMANDS = ['next', 'init', 'discover', 'promote', 'start', 'run', 'status', 'show', 'holds', 'answer', 'retry', 'replay', 'export', 'eval']

test('mw alone prints the manual from the command table, and reading creates nothing', () => {
	const t = setup()
	const manual = t.mw()
	assert.equal(manual.code, 0)
	assert.deepEqual(manual.out.commands.map((c: { name: string }) => c.name), COMMANDS)
	assert.equal(manual.out.commands.find((c: { name: string }) => c.name === 'answer').usage, 'mw answer <id> <text...> [--cause <cause>]')
	assert.deepEqual(manual.out.commands.find((c: { name: string }) => c.name === 'answer').input.required, ['id', 'text'])
	assert.equal(manual.out.errors.store_locked.context.properties.owner.properties.pid.type, 'integer')
	// Every command in the manual is one the dispatcher knows, and rejects a bad option as that command.
	for (const name of COMMANDS) assert.deepEqual([name, t.mw(name, '--bogus').err.context], [name, { command: name }])
	assert.deepEqual(t.mw('deploy').err.context, { command: 'deploy' })

	const next = manual.out.state.next
	assert.equal(next.action, 'relay')
	assert.equal(next.then[0].run, `mw init --workspace ${t.repo} --ship "<the operator's command that deploys what is on main>"`)
	assert.deepEqual(t.mw('next').out, next)
	assert.deepEqual(t.mw('holds').out, { holds: [], next: [] })
	assert.equal(t.mw('status', '3').err.error, 'item_not_found')
	// A relay's command run before the operator's words replace its slot is refused.
	const unfilled = t.sh(next.then[0].run)
	assert.equal(unfilled.err.error, 'usage')
	assert.match(unfilled.err.message, /placeholder/)
	assert.equal(existsSync(t.home), false, 'reading the manual or state creates nothing')
})

test('an agent following next delivers a work item through commands run as written, leaving no trace in the product repo', () => {
	const t = setup()
	const init = t.mw('init', '--ship', 'touch ../shipped')
	assert.deepEqual(init.out.project, { path: t.repo, ship: 'touch ../shipped' })
	assert.ok(existsSync(join(t.home, 'projects.json')))

	const started = t.mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export to reports')
	assert.equal(started.out.item.status, 'queued')
	assert.deepEqual(t.mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export to reports').out, started.out, 'a repeated start returns the same item')

	const next = t.mw('next').out
	assert.deepEqual([next.action, next.run], ['run', 'mw run'])
	const ran = t.sh(next.run)
	assert.equal(ran.code, 0, JSON.stringify(ran.err))
	assert.deepEqual(ran.out.items.map((i: { id: number; status: string }) => [i.id, i.status]), [[started.out.item.id, 'shipped']])
	assert.deepEqual(t.sh('mw run').out, ran.out, 'a repeated run gives the same result')
	const executed = readFileSync(join(t.dir, 'calls.log'), 'utf8').trim().split('\n').filter((l) => l.startsWith('execute'))
	assert.deepEqual(executed.slice(0, 3), ['execute ideate ideator', 'execute challenge ideation peer', 'execute plan planner'])
	assert.deepEqual(executed.slice(3).sort(), ['execute implement implementer', 'execute test-plan test architect'], 'the makers split after planning; no agent verifies')

	const idle = t.mw('next').out
	assert.equal(idle.action, 'relay')
	assert.match(idle.then[0].run, new RegExp(`^mw discover --workspace ${t.repo} --source "<`))
	assert.ok(existsSync(join(t.dir, 'shipped')))
	assert.equal(t.git('show', 'main:src/export.sh'), 'echo a,b', 'Made Well brought the change onto main')
	assert.deepEqual([t.git('status', '--porcelain', '--ignored'), readdirSync(t.repo).sort().join(' ')], ['', '.git src'], 'nothing of Made Well is left in the product repo')
})

test('discovery candidates are relayed for promotion, and promoting twice promotes once', () => {
	const t = setup()
	t.mw('init', '--ship', 'true')
	const discovery = t.mw('discover', '--source', 'raw notes: two things').out.item.id
	assert.deepEqual(t.mw('discover', '--source', 'raw notes: two things').out.item.id, discovery)
	t.mw('run')

	const next = t.mw('next').out
	assert.equal(next.action, 'relay')
	assert.deepEqual(next.candidates.map((c: { title: string }) => c.title), ['First piece', 'Second piece'])
	const [all, first] = next.then.map((n: { run: string }) => n.run)
	assert.equal(all, `mw promote ${discovery}`)
	const once = t.sh(first)
	assert.deepEqual(t.sh(first).out, once.out)
	assert.deepEqual(once.out.promoted.map((i: { title: string; status: string }) => [i.title, i.status]), [['First piece', 'queued']])
	assert.deepEqual(t.sh(all).out.promoted.map((i: { status: string }) => i.status), ['queued', 'queued'])
	assert.deepEqual(t.sh(all).out.promoted.map((i: { status: string }) => i.status), ['queued', 'queued'])
	const promoted = t.mw('show', String(discovery + 1)).out.events.filter((e: { kind: string }) => e.kind === 'promoted')
	assert.equal(promoted.length, 1)
})

test('a candidate that builds on another starts once that one ships, and promoting it promotes what it builds on', () => {
	const t = setup()
	t.mw('init', '--ship', 'true')
	const discovery = t.mw('discover', '--source', 'raw notes: two things').out.item.id
	t.mw('run')
	const [first, second] = [discovery + 1, discovery + 2]
	assert.deepEqual(t.mw('status', String(second)).out.after, [first], 'only earlier items count: itself and unknown positions are dropped')
	assert.deepEqual(t.mw('promote', String(discovery), String(second)).out.promoted.map((i: { id: number }) => i.id), [first, second])

	assert.equal(t.mw('run').out.items.find((i: { id: number }) => i.id === first).status, 'shipped')
	const events = [first, second].flatMap((id) => t.mw('show', String(id)).out.events as { seq: number; item: number; kind: string }[])
	const shipped = events.find((e) => e.item === first && e.kind === 'shipped')!.seq
	assert.ok(events.filter((e) => e.item === second && e.kind === 'running').every((e) => e.seq > shipped), 'the second item made no move before the first shipped')
})

test('a hold is relayed by next and alerted once; answer and retry change nothing when repeated', () => {
	const t = setup({ FAKE_ASK: 'plan' })
	const alert = 'cat > ../alert.json; echo "$MW_ITEM $MW_HOLD" >> ../alerts.log'
	t.mw('init', '--ship', 'exit 3', '--alert', alert)
	const id = t.mw('start', '--objective', 'Export reports', '--source', 'operator: export reports').out.item.id
	assert.equal(t.mw('run').out.items[0].hold.code, 'authority')
	t.mw('run')
	const alerts = () => readFileSync(join(t.dir, 'alerts.log'), 'utf8').trim().split('\n')
	assert.deepEqual(alerts(), [`${id} authority`], 'one alert, though the runner ran twice')
	assert.equal(JSON.parse(readFileSync(join(t.dir, 'alert.json'), 'utf8')).message, 'Only the operator can settle what the planner asked.')

	const [hold] = t.mw('holds').out.holds
	assert.deepEqual([hold.item, hold.code, hold.alerted.exitCode], [id, 'authority', 0])
	const next = t.mw('next').out
	assert.deepEqual([next.action, next.hold.item], ['relay', id])
	assert.match(next.say, /CSV or PDF\?/)
	assert.equal(next.then[0].run, `mw answer ${id} "<your answer to context.questions>"`)

	const answered = t.mw('answer', String(id), 'CSV only')
	assert.equal(answered.out.item.status, 'queued')
	assert.deepEqual(t.mw('answer', String(id), 'CSV only').out, answered.out)
	assert.equal(t.mw('answer', String(id), 'PDF').err.error, 'not_held', 'a different answer is not a repeat')
	assert.equal(t.mw('show', String(id)).out.events.filter((e: { kind: string }) => e.kind === 'nq-answer').length, 1)

	assert.equal(t.mw('run').out.items[0].hold.code, 'ship_failed')
	assert.deepEqual(alerts(), [`${id} authority`, `${id} ship_failed`], 'a new hold alerts again')
	t.mw('init', '--ship', 'true')
	const retried = t.mw('retry', String(id))
	assert.deepEqual(t.mw('retry', String(id)).out, retried.out)
	assert.equal(t.mw('show', String(id)).out.events.filter((e: { kind: string }) => e.kind === 'retried').length, 1)
	assert.equal(t.mw('run').out.items[0].status, 'shipped')
})

test('status shows each maker\'s track after planning, with its open NQ exchange', () => {
	const t = setup({ FAKE_ASK: 'implement' })
	t.mw('init', '--ship', 'true')
	const id = t.mw('start', '--objective', 'Export reports', '--source', 'operator: export reports').out.item.id
	assert.equal(t.mw('run').out.items[0].hold.code, 'authority')
	assert.deepEqual(t.mw('status', String(id)).out.tracks, {
		implement: { done: false, nq: { from: 'planner', status: 'awaiting-originator', turns: 0 } },
		'test-plan': { done: true },
	})
})

test('an item held for a missing ship command goes on once mw init, filled in from next, registers one', () => {
	const t = setup()
	t.mw('init', '--ship', 'true')
	const id = t.mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export').out.item.id
	writeFileSync(join(t.home, 'projects.json'), '[]')
	assert.equal(t.mw('run').out.items[0].hold.code, 'no_ship_command')
	const next = t.mw('next').out
	const init = t.sh(next.then[0].run.replace(/"<[^>]+>"/, '"touch ../shipped"'))
	assert.deepEqual(init.out.released.map((i: { id: number; status: string }) => [i.id, i.status]), [[id, 'queued']])
	assert.equal(t.mw('run').out.items[0].status, 'shipped')
	assert.ok(existsSync(join(t.dir, 'shipped')))
})

test('errors are JSON on stderr with a listed code, the context of its shape, and next commands', () => {
	const t = setup()
	const unregistered = t.mw('start', '--objective', 'x', '--source', 'y')
	assert.equal(unregistered.code, 1)
	assert.equal(unregistered.out, null)
	assert.deepEqual([unregistered.err.error, unregistered.err.context], ['project_not_found', { workspace: t.repo, projects: [] }])
	assert.equal(existsSync(t.home), false, 'a refused start creates nothing')
	assert.equal(t.mw('init').err.error, 'usage', 'a new project needs its ship command')

	t.mw('init', '--ship', 'true')
	const id = t.mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export').out.item.id
	assert.deepEqual(t.mw('status', '99').err.context, { id: 99 })
	assert.equal(t.mw('status', 'x').err.error, 'usage')

	// Another live process holds the runner: this test process.
	const db = new DatabaseSync(join(t.home, 'madewell.db'))
	db.prepare('INSERT INTO runner (id, pid, since, item) VALUES (1, ?, ?, ?)').run(process.pid, '2026-10-21T14:02:11Z', id)
	db.close()
	const locked = t.mw('run')
	assert.equal(locked.err.error, 'store_locked')
	assert.equal(locked.err.context.owner.item.title, 'Add CSV export')
	assert.deepEqual(locked.err.next.map((n: { run: string }) => n.run), [`mw status ${id}`, `kill ${process.pid} && mw run`])
	const wait = t.mw('next').out
	assert.equal(wait.action, 'wait', 'with a live runner, next waits instead of starting another')
	assert.equal(wait.then, 'mw next')
})

test('a runner killed mid-job is replaced: the next run resumes at that job without repeating earlier ones', async () => {
	const t = setup()
	t.env.FAKE_HANG = `implement:${join(t.dir, 'hung')}`
	t.mw('init', '--ship', 'true')
	t.mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export')

	const runner = spawn(process.execPath, [cli, 'run'], { env: t.env, cwd: t.repo, detached: true, stdio: 'ignore' })
	const log = () => (existsSync(join(t.dir, 'calls.log')) ? readFileSync(join(t.dir, 'calls.log'), 'utf8') : '')
	while (!log().includes('execute implement')) await new Promise((r) => setTimeout(r, 20))
	process.kill(-runner.pid!, 'SIGKILL') // the runner and its hung worker, as in a crash
	await new Promise((r) => runner.once('exit', r))

	assert.equal(t.mw('next').out.run, 'mw run', 'a dead runner\'s work is picked up by a new run')
	const resumed = t.mw('run')
	assert.equal(resumed.code, 0, JSON.stringify(resumed.err))
	assert.equal(resumed.out.items[0].status, 'shipped')
	const calls = log().trim().split('\n')
	const executed = calls.filter((l) => l.startsWith('execute'))
	assert.deepEqual(executed.slice(0, 3), ['execute ideate ideator', 'execute challenge ideation peer', 'execute plan planner'])
	assert.equal(executed.filter((l) => l === 'execute implement implementer').length, 2, 'the interrupted job runs again; nothing before it does')
	assert.equal(t.git('status', '--porcelain', '--ignored'), '')
	// The resumed implementer was clear before the crash and keeps the same card: no new intake.
	assert.equal(calls.filter((l) => l === 'intake implement implementer').length, 1)
})
