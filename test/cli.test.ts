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

const COMMANDS = ['next', 'init', 'discover', 'promote', 'start', 'run', 'status', 'show', 'holds', 'answer', 'retry', 'drop', 'replay', 'export', 'stats', 'eval', 'prune']

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
	assert.equal(t.mw('drop', String(started.out.item.id)).err.error, 'not_droppable', 'a shipped item is on main: there is nothing to drop')
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

test('an item that will never ship is dropped: it leaves the holds and next, keeps its record, and dropping twice drops once', () => {
	const t = setup({ FAKE_ASK: 'plan' })
	t.mw('init', '--ship', 'true')
	const id = t.mw('start', '--objective', 'Export reports', '--source', 'operator: export reports').out.item.id
	assert.equal(t.mw('run').out.items[0].hold.code, 'authority')
	const dropped = t.mw('drop', String(id))
	assert.deepEqual([dropped.out.item.status, dropped.out.item.next], ['dropped', []])
	assert.deepEqual(t.mw('drop', String(id)).out, dropped.out)
	assert.deepEqual(t.mw('holds').out.holds, [])
	assert.equal(t.mw('next').out.hold, undefined, 'next no longer relays it')
	assert.equal(t.mw('show', String(id)).out.events.filter((e: { kind: string }) => e.kind === 'dropped').length, 1, 'its record stays')
	assert.equal(t.mw('answer', String(id), 'CSV').err.error, 'not_held')
	assert.equal(t.mw('drop', '99').err.error, 'item_not_found')
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
	assert.deepEqual(t.mw('init', '--gates', '[{"run": "npx eslint {files}", "glob": "*.ts"}]').out.project, { path: t.repo, ship: 'true', gates: [{ run: 'npx eslint {files}', glob: '*.ts' }] }, 'gates join the project\'s config, which keeps its ship command')
	assert.equal(t.mw('init', '--gates', '[{"glob": "*.ts"}]').err.error, 'usage', 'a gate needs a command')
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

	const stale = t.mw('status').out
	assert.match(stale.summary, /1 in progress with no runner/, 'status reads the runner as gone, though the item still says running')
	assert.deepEqual([stale.items[0].status, stale.items[0].next.map((n: { run: string }) => n.run), stale.next.map((n: { run: string }) => n.run)], ['running', ['mw run'], ['mw run']])
	assert.ok(!t.mw('show', '1').out.events.some((e: { kind: string }) => e.kind === 'runner-lost'), 'reading records nothing')
	assert.equal(t.mw('next').out.run, 'mw run', 'a dead runner\'s work is picked up by a new run')
	assert.ok(t.mw('show', '1').out.events.some((e: { kind: string }) => e.kind === 'runner-lost'), 'next takes over the dead claim and records the loss against the item')
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

test('with MW_TELEMETRY, every machine writes its own file there, and stats reads them all together', () => {
	const telemetry = mkdtempSync(join(root, 'telemetry-'))
	// The second machine writes metrics only. On both, the planner asks once and the operator answers.
	const machines = [setup({ MW_TELEMETRY: telemetry, FAKE_ASK: 'plan' }), setup({ MW_TELEMETRY: telemetry, MW_TELEMETRY_LEVEL: 'metrics', FAKE_ASK: 'plan' })]
	for (const t of machines) {
		t.mw('init', '--ship', 'true')
		const id = t.mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export').out.item.id
		assert.equal(t.mw('run').out.items[0].hold.code, 'authority')
		t.mw('answer', String(id), 'CSV only')
		assert.equal(t.mw('run').out.items[0].status, 'shipped')
	}
	const files = readdirSync(telemetry)
	assert.equal(files.length, 2, 'one file per store')
	const lines = files.flatMap((f) => readFileSync(join(telemetry, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l)))
	const [full, metrics] = machines.map((t) => lines.filter((l) => l.store === lines.find((x) => x.workspace === t.repo).store))
	assert.equal(new Set(lines.map((l) => l.build)).size, 1, 'every line names the build that wrote it')
	assert.match(lines[0].build, /^[0-9a-f]{12}$/)
	const call = full!.find((l) => l.t === 'call' && l.kind === 'execute' && l.job === 'implement')
	assert.ok(call.prompt && call.system && call.output && call.workspace, 'a call goes out in full: brief, packet and answer')
	assert.equal(call.harnessVersion, 'scripted 1', 'with the version of the harness that ran it')
	assert.ok(full!.some((l) => l.t === 'span' && l.name === 'mw.drive'), 'the engine\'s spans go out too')

	// Metrics only: counts, timings, cards and outcomes, and no free text from the operator, the agents or the repo.
	const counted = metrics!.find((l) => l.t === 'call' && l.kind === 'execute' && l.job === 'implement')
	assert.deepEqual([typeof counted.prompt, typeof counted.output, counted.outcome, counted.card, counted.harnessVersion], ['number', 'number', 'ok', call.card, 'scripted 1'])
	assert.deepEqual(metrics!.find((l) => l.kind === 'nq-question').data.questions, ['CSV or PDF?'.length])
	assert.ok(metrics!.some((l) => l.t === 'span' && l.name === 'mw.drive'))
	assert.ok(!JSON.stringify(metrics).includes('CSV'), 'no objective, packet, answer, question or hold message')

	// A third machine with two stores on one project, written elsewhere and collected here. Its records are dated after
	// the two live machines', whenever the test runs, so they are the latest the report reads. Item ids repeat across
	// stores. Store 1a2b3c4d: items 1-3 ship after 40, 120 and 10 minutes; item 4 holds, its alert follows, and its
	// store's last record is at 10:05. Store 5e6f7a8b: its item 1 ships after 30 minutes, later than everything else.
	// Item 1's implement job: an intake, an originator answer, a call refused afterwards; plan: an intake and a call.
	const card = { harness: 'codex', provider: 'openai', account: 'openai', model: 'sol', effort: 'high' }
	const vps = (store: string) => ({ host: 'vps', store, workspace: '/srv/app' })
	const vpsEvent = (store: string, item: number, at: string, kind: string, data = {}) => ({ t: 'event', ...vps(store), item, at: `2099-10-22T${at}:00.000Z`, kind, data })
	const vpsCall = (id: number, kind: string, job: string, started: string, ms: number, extra = {}) => ({ t: 'call', ...vps('1a2b3c4d'), id, item: 1, kind, job, card, outcome: 'ok', started: `2099-10-22T${started}:00.000Z`, ms, tokens: null, flags: [], ...extra })
	writeFileSync(join(telemetry, 'vps-1a2b3c4d.jsonl'), [
		vpsEvent('1a2b3c4d', 1, '08:00', 'created', { job: 'ideate', status: 'queued' }),
		vpsEvent('1a2b3c4d', 2, '08:05', 'created', { job: 'ideate', status: 'queued' }),
		vpsEvent('1a2b3c4d', 3, '08:10', 'created', { job: 'ideate', status: 'queued' }),
		vpsEvent('1a2b3c4d', 4, '08:30', 'created', { job: 'ideate', status: 'queued' }),
		vpsEvent('1a2b3c4d', 3, '08:20', 'shipped'),
		vpsCall(5, 'intake', 'implement', '08:00', 30_000),
		vpsCall(6, 'originator', 'implement', '08:00', 60_000),
		vpsCall(7, 'execute', 'implement', '08:01', 90_000, { tokens: { input: 1000, output: 200, cacheRead: 0, cacheWrite: 0 }, flags: [{ rule: 'out-of-scope', evidence: 'README.md' }] }),
		{ t: 'rejected', ...vps('1a2b3c4d'), call: 7, at: '2099-10-22T08:02:00.000Z', reason: 'out of scope' },
		vpsCall(8, 'intake', 'plan', '08:03', 60_000),
		vpsCall(9, 'execute', 'plan', '08:04', 120_000),
		vpsEvent('1a2b3c4d', 1, '08:40', 'shipped'),
		vpsEvent('1a2b3c4d', 4, '09:00', 'held'),
		vpsEvent('1a2b3c4d', 4, '09:01', 'alerted'),
		vpsEvent('1a2b3c4d', 2, '10:05', 'shipped'),
	].map((l) => JSON.stringify(l)).join('\n') + '\n{"t":"call","host":"vps"')
	writeFileSync(join(telemetry, 'vps-5e6f7a8b.jsonl'), [
		// A discovered candidate waits an hour for the operator; its lead time starts when it is promoted.
		vpsEvent('5e6f7a8b', 1, '10:00', 'created', { job: 'ideate', status: 'candidate' }),
		vpsEvent('5e6f7a8b', 1, '11:00', 'promoted', { discovery: 9 }),
		vpsEvent('5e6f7a8b', 1, '11:30', 'shipped'),
	].map((l) => JSON.stringify(l)).join('\n') + '\n')

	const report = machines[0]!.mw('stats').out
	assert.equal(report.files.length, 4)
	assert.equal(report.to, '2099-10-22T11:30:00.000Z')
	const [a, b, srv] = [...machines.map((t) => report.projects.find((p: { workspace: string }) => p.workspace === t.repo)), report.projects.find((p: { host: string }) => p.host === 'vps')]
	for (const p of [a, b]) {
		assert.deepEqual([p.items, p.nq.questions, p.refused], [{ created: 1, shipped: 1, held: 1 }, 1, 0])
		assert.ok(p.nq.intakes > 0 && p.jobs.implement.calls === 2 && p.calls === Object.values(p.jobs as Record<string, { calls: number }>).reduce((n, j) => n + j.calls, 0))
		assert.deepEqual([p.leadTime.shipped.length, p.leadTime.open], [1, []])
	}
	// Timings and store ids differ between the two machines; every count must match.
	const numbers = (p: object) => JSON.parse(JSON.stringify(p, (k, v) => (['workspace', 'minutes', 'kinds', 'share', 'median', 'store'].includes(k) ? undefined : v)))
	assert.deepEqual(numbers(b), numbers(a), 'stats reads the same numbers at either level')
	assert.deepEqual(srv, {
		host: 'vps', workspace: '/srv/app', calls: 5, minutes: 6, tokens: 1200, refused: 1,
		kinds: { intake: 1.5, originator: 1, execute: 3.5 },
		items: { created: 5, shipped: 4, held: 1 }, nq: { intakes: 2, questions: 0, share: 0.42 }, flags: { 'out-of-scope': 1 },
		leadTime: {
			median: 35, slowest: { item: 2, store: '1a2b3c4d', minutes: 120 },
			shipped: [{ item: 2, store: '1a2b3c4d', minutes: 120 }, { item: 1, store: '1a2b3c4d', minutes: 40 }, { item: 1, store: '5e6f7a8b', minutes: 30 }, { item: 3, store: '1a2b3c4d', minutes: 10 }],
			open: [{ item: 4, store: '1a2b3c4d', status: 'held', minutes: 95 }],
		},
		jobs: {
			implement: { calls: 3, minutes: 3, tokens: 1200, refused: 1, kinds: { intake: 0.5, originator: 1, execute: 1.5 } },
			plan: { calls: 2, minutes: 3, tokens: 0, refused: 0, kinds: { intake: 1, originator: 0, execute: 2 } },
		},
		cards: { 'codex · sol · high': { calls: 5, minutes: 6, tokens: 1200, refused: 1 } },
	}, 'a half-written last line is skipped; the refusal after its call counts against it; item ids are told apart by store; an open item is aged to its own store\'s last record; a candidate\'s lead time starts at its promotion')
	assert.equal(setup().mw('stats').err.error, 'usage', 'without MW_TELEMETRY or --dir there is nothing to read')
})

test('prune removes finished work before the cutoff with its record and files, and keeps what work in flight needs', () => {
	const t = setup()
	t.mw('init', '--ship', 'true')
	const discovery = t.mw('discover', '--source', 'raw notes: two things').out.item.id
	t.mw('run')
	const [first, second] = [discovery + 1, discovery + 2]
	t.mw('promote', String(discovery), String(first))
	t.mw('run')
	// The scripted implementer makes one change per repo, so each further delivery gets its own project.
	const project = (name: string) => {
		const dir = join(t.dir, name)
		mkdirSync(dir)
		execFileSync('git', ['-C', dir, 'init', '-q', '-b', 'main'])
		execFileSync('git', ['-C', dir, '-c', 'user.name=Operator', '-c', 'user.email=op@example.com', 'commit', '-q', '--allow-empty', '-m', 'first'])
		t.mw('init', '--workspace', dir, '--ship', 'true')
		return dir
	}
	const start = (workspace: string, objective: string) => t.mw('start', '--workspace', workspace, '--objective', objective, '--source', `operator: ${objective}`).out.item.id
	const old = start(project('old'), 'Add CSV export')
	t.mw('run')
	const busy = project('busy')
	const last = start(busy, 'Add PDF export')
	t.mw('run')
	t.env.FAKE_ASK = 'plan'
	const held = start(busy, 'Add XLS export')
	t.mw('run')
	delete t.env.FAKE_ASK
	assert.equal(t.mw('eval', 'plan', '--card', 'intake', '--item', String(old)).code, 0)
	t.mw('export', String(old))
	t.mw('export', String(last))
	t.mw('replay')
	const board = t.mw('status').out
	assert.deepEqual(board.items.map((i: { id: number; status: string }) => [i.id, i.status]), [[discovery, 'discovered'], [first, 'shipped'], [second, 'candidate'], [old, 'shipped'], [last, 'shipped'], [held, 'held']])

	const none = t.mw('prune', '--before', '2000-01-01').out
	assert.deepEqual([none.items, none.kept, none.records], [[], [], { events: 0, calls: 0, toolEvents: 0, evals: 0, evalCalls: 0 }], 'nothing finished before the cutoff')

	const kept = [
		{ id: discovery, status: 'discovered', why: `#${second} (candidate) needs it` },
		{ id: first, status: 'shipped', why: `#${second} (candidate) needs it` },
		{ id: last, status: 'shipped', why: `the last merge into ${busy}, which its in-flight items check the branch against` },
	]
	const exported = join(t.home, 'exports', String(old))
	const dry = t.mw('prune', '--before', '2999-01-01', '--dry-run').out
	assert.deepEqual([dry.items, dry.kept, dry.files, dry.freed], [[old], kept, [exported, join(t.home, 'replay.html')], null])
	assert.ok(dry.records.calls > 0 && dry.records.evals === 1 && dry.records.evalCalls > 0, JSON.stringify(dry.records))
	assert.equal(dry.next[0].run, `mw prune --before ${dry.before}`)
	assert.ok(Date.parse(dry.before) <= Date.now(), 'a cutoff in the future counts as now')
	assert.deepEqual(t.mw('status').out, board, 'a dry run changes nothing')
	assert.ok(existsSync(exported))

	// Another live process holds the runner: prune refuses, and its dry run still answers.
	const db = () => new DatabaseSync(join(t.home, 'madewell.db'))
	const lock = db()
	lock.prepare('INSERT INTO runner (id, pid, since) VALUES (1, ?, ?)').run(process.pid, '2026-10-21T14:02:11Z')
	const locked = t.mw('prune', '--before', dry.before)
	assert.deepEqual([locked.err.error, locked.err.next[0].run], ['store_locked', `mw prune --before ${dry.before}`])
	assert.equal(t.mw('prune', '--before', dry.before, '--dry-run').code, 0)
	lock.prepare('DELETE FROM runner').run()
	lock.close()

	const pruned = t.mw('prune', '--before', dry.before)
	assert.equal(pruned.code, 0, JSON.stringify(pruned.err))
	assert.deepEqual([pruned.out.dryRun, pruned.out.items, pruned.out.kept, pruned.out.files, pruned.out.records], [false, [old], kept, dry.files, dry.records])
	assert.ok(pruned.out.freed > 0)
	assert.deepEqual(t.mw('status').out.items, board.items.filter((i: { id: number }) => i.id !== old), 'every other item is as it was')
	assert.equal(t.mw('show', String(old)).err.error, 'item_not_found')
	assert.deepEqual([existsSync(exported), existsSync(join(t.home, 'exports', String(last))), existsSync(join(t.home, 'replay.html'))], [false, true, false])
	assert.doesNotMatch(readFileSync(join(t.home, 'glass.html'), 'utf8'), /Add CSV export/, 'the glass is rewritten without it')
	const after = db()
	const count = (sql: string) => (after.prepare(sql).get(old) as { n: number }).n
	assert.deepEqual([count('SELECT COUNT(*) AS n FROM events WHERE item = ?'), count('SELECT COUNT(*) AS n FROM calls WHERE item = ?'), count('SELECT COUNT(*) AS n FROM tool_events WHERE call NOT IN (SELECT id FROM calls) AND ? > 0')], [0, 0, 0])
	assert.deepEqual([count('SELECT COUNT(*) AS n FROM evals WHERE ? > 0'), count('SELECT COUNT(*) AS n FROM eval_calls WHERE ? > 0')], [0, 0])
	assert.equal(count("SELECT COUNT(*) AS n FROM events WHERE item = 0 AND kind = 'pruned' AND json_extract(data, '$.ids[0]') = ?"), 1)
	after.close()

	const again = t.mw('prune', '--before', pruned.out.before).out
	assert.deepEqual([again.items, again.kept, again.files, again.records], [[], kept, [], none.records], 'a repeat removes nothing more')
})
