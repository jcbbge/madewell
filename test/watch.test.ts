import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { Effect } from 'effect'
import { problemsOf, snapshotPack, SOFTWARE } from '../src/lane.ts'
import { openStore } from '../src/store.ts'
import { lensOf, observe } from '../src/trace.ts'
import { modelOf } from '../src/ui.ts'
import { clean, groupsOf, scoped, screen, workspaceAt, wrap, type Navigation } from '../src/watch.ts'

const fixture = () => {
	const root = mkdtempSync(join(tmpdir(), 'mw-watch-'))
	const path = join(root, 'state.db')
	const store = openStore(path)
	return { root, path, store, close: () => { store.close(); rmSync(root, { recursive: true, force: true }) } }
}
const fields = (workspace: string, title = 'work') => ({ workspace, title, objective: 'one thing delivered', source: 'operator words' })

test('default and custom lane definitions, outputs, tracks, links and structure survive process death', () => {
	const t = fixture()
	try {
		const writer = `
		import { openStore } from './src/store.ts';
		const s = openStore(${JSON.stringify(t.path)});
		const discovery = s.create({...${JSON.stringify(fields(t.root))}, job:'discover'});
		const child = s.create({...${JSON.stringify(fields(t.root, 'child'))}, discovery: discovery.id});
		s.save({...child, job:'implement', status:'running', outputs:{plan:'accepted exact plan'}, split:{implement:{launches:1,done:true},'test-plan':{launches:2}}}, 'split');
		s.note(child.id, 'trace-output', {invocation:'attempt-before-kill',text:'unreturned output'});
		process.kill(process.pid, 'SIGKILL');`
		const result = spawnSync(process.execPath, ['--input-type=module', '-e', writer], { cwd: resolve(import.meta.dirname, '..') })
		assert.equal(result.signal, 'SIGKILL')
		const reader = openStore(t.path, { readOnly: true })
		try {
			const child = reader.get(2)!
			assert.deepEqual(child.pack, snapshotPack())
			assert.deepEqual(problemsOf(child.pack!), [])
			assert.equal(child.pack!.discovery[0].steps[0].profile, 'ideator')
			assert.ok(child.pack!.discovery[0].steps[0].duty)
			assert.equal(child.outputs.plan, 'accepted exact plan')
			assert.equal(child.split?.implement?.done, true)
			assert.equal(child.split?.['test-plan']?.launches, 2)
			assert.equal(reader.events(2).at(-1)?.data.text, 'unreturned output')
			const trace = lensOf(reader, 2, 'dx', [])
			assert.ok('structure' in trace)
			assert.equal(trace.structure.parent, 1)
			assert.deepEqual(trace.structure.lanes.map(l => l.name), ['discovery', 'delivery'])
			assert.equal(trace.structure.lanes[1]!.stages[2]!.steps.length, 2)
			assert.equal(trace.structure.definition, 'saved-pack')
			assert.throws(() => reader.note(2, 'viewer-wrote', {}), /readonly/i)
		} finally { reader.close() }
		const custom = { ...structuredClone(SOFTWARE), name: 'custom' }
		const item = t.store.create({ ...fields(t.root), pack: custom })
		custom.name = 'mutated externally'
		assert.equal(t.store.get(item.id)!.pack!.name, 'custom')
	} finally { t.close() }
})

test('legacy missing definitions stay explicitly unknown when inspected; watch never fabricates or writes history', () => {
	const t = fixture()
	try {
		const item = t.store.create(fields(t.root))
		const db = new DatabaseSync(t.path)
		const { pack: _, ...legacy } = item
		db.prepare('UPDATE items SET doc = ? WHERE id = ?').run(JSON.stringify(legacy), item.id)
		db.close()
		const before = t.store.mark()
		const view = lensOf(t.store, item.id, 'dx', [])
		assert.ok('structure' in view)
		assert.equal(view.structure.definition, 'legacy-default-unknown')
		assert.deepEqual(t.store.mark(), before)
		assert.equal(t.store.get(item.id)?.pack, undefined)
	} finally { t.close() }
})

test('project scope applies before metrics and respects path boundaries; each item belongs to one queue', () => {
	const t = fixture()
	try {
		const home = join(t.root, 'project'), sibling = home + '-other'
		const discovery = t.store.create({ ...fields(home, 'discover'), job: 'discover', status: 'discovered' })
		for (const status of ['candidate', 'queued', 'running', 'held', 'paused', 'waiting-quota', 'waiting-prerequisite', 'shipped', 'dropped'] as const) t.store.create({ ...fields(home, status), status, discovery: discovery.id })
		t.store.create({ ...fields(home, 'dependency'), status: 'queued', after: [2] })
		t.store.create({ ...fields(sibling, 'outside'), status: 'shipped' })
		assert.equal(workspaceAt(t.store.list(), join(home, 'src')), home)
		assert.equal(workspaceAt(t.store.list(), sibling), sibling)
		const m = modelOf(scoped(t.store, home), () => [])
		assert.equal(m.summary.shipped, 1)
		assert.equal(m.items.some(i => i.title === 'outside'), false)
		const groups = groupsOf(m)
		assert.equal(groups.flatMap(g => g.items).length, m.items.length)
		assert.equal(new Set(groups.flatMap(g => g.items.map(i => i.id))).size, m.items.length)
		assert.equal(groups.find(g => g.title.includes('active work'))!.items.length, 1)
		assert.equal(groups.find(g => g.title.includes('ready / queued'))!.items.length, 1)
		assert.equal(groups.find(g => g.title.includes('waiting / held'))!.items.length, 5)
	} finally { t.close() }
})

test('terminal projection scrolls all rows and full detail, fits narrow panes and strips terminal commands', () => {
	const t = fixture()
	try {
		for (let n = 0; n < 35; n++) t.store.create(fields(t.root, `item ${n} 界 🌱 \x1b]52;c;SECRET\x07`))
		const m = modelOf(t.store, () => [])
		const nav: Navigation = { selected: 35, depth: 0, offset: 0, all: false, machine: false }
		const rendered = screen(m, nav, 33, 12, t.root, null)
		assert.ok(rendered.split('\n').length <= 12)
		assert.ok(rendered.split('\n').every(l => Array.from(l).length <= 33))
		assert.equal(rendered.includes('\x1b'), false)
		nav.depth = 2
		let found = false
		for (let offset = 0; offset < 200; offset += 4) {
			nav.offset = offset
			const page = screen(m, nav, 33, 12, t.root, null, 'EXACT_DETAIL_END')
			if (page.includes('EXACT_DETAIL_END')) found = true
		}
		assert.ok(found, 'the end of exact evidence is reachable')
		assert.equal(clean('\x1b[31mtext\x1b[0m\x1b]52;c;PAYLOAD\x07'), 'text')
		assert.equal(/[\x00-\x1f\x7f-\x9f]/.test(clean('\u009d52;c;abc\u009c\u0085HELLO')), false)
		assert.deepEqual(wrap('界界ab', 4), ['界界', 'ab'])
	} finally { t.close() }
})

test('non-TTY watch keeps JSON compatibility and explicit workspace scopes the stream', () => {
	const t = fixture()
	try {
		t.store.create(fields(t.root, 'inside'))
		t.store.create(fields(t.root + '-other', 'outside'))
		const cli = resolve(import.meta.dirname, '../dist/mw.mjs')
		const run = (...args: string[]) => spawnSync(process.execPath, [cli, 'watch', '--once', ...args], { env: { ...process.env, MW_STORE: t.path, MW_DEBUG: '0' }, encoding: 'utf8' })
		const global = run()
		assert.equal(global.status, 0, global.stderr)
		assert.equal(global.stdout.trim().split('\n').map(l => JSON.parse(l)).filter(l => l.event).length, 2)
		const local = run('--workspace', t.root)
		assert.equal(local.status, 0, local.stderr)
		const events = local.stdout.trim().split('\n').map(l => JSON.parse(l)).filter(l => l.event)
		assert.equal(events.length, 1)
		assert.equal(events[0].event.item, 1)
		assert.ok(local.stdout.trim().split('\n').map(l => JSON.parse(l)).at(-1).next[0].run.includes(`--workspace ${t.root}`))
		assert.ok(JSON.parse(run('--all').stdout.trim().split('\n').at(-1)!).next[0].run.endsWith(' --all'))
		assert.equal(run('--workspace', t.root, '--all').status, 1)
	} finally { t.close() }
})

test('watch never opens a writable store layer, migrates the database or emits telemetry', () => {
	const t = fixture()
	const db = new DatabaseSync(t.path)
	try {
		t.store.create(fields(t.root))
		db.exec('BEGIN IMMEDIATE')
		const telemetry = join(t.root, 'telemetry')
		const result = spawnSync(process.execPath, [resolve(import.meta.dirname, '../dist/mw.mjs'), 'watch', '--once'], {
			env: { ...process.env, MW_STORE: t.path, MW_TELEMETRY: telemetry }, encoding: 'utf8', timeout: 2000,
		})
		assert.equal(result.status, 0, result.stderr)
		assert.equal(result.error, undefined, 'a read-only viewer must not wait for the write lock')
		assert.equal(existsSync(telemetry), false)
	} finally { db.exec('ROLLBACK'); db.close(); t.close() }
})

test('host observations are durable invocation evidence, not viewer-owned history', async () => {
	const t = fixture()
	try {
		const item = t.store.create(fields(t.root))
		await Effect.runPromise(observe(t.store, item.id, { job: 'ideate', kind: 'execute', args: {} }, onOutput => Effect.gen(function* () {
			onOutput('stdout', 'real captured bytes\n')
			yield* Effect.sleep(5100)
			return { output: 'returned' }
		})))
		const reopened = openStore(t.path, { readOnly: true })
		try {
			const start = reopened.events(item.id).find(e => e.kind === 'trace-started')!
			const machine = start.data.machine as { host: string; cores: number; memoryTotal: number; cpuPercent: number | null }
			assert.ok(machine.host)
			assert.ok(machine.cores > 0)
			assert.ok(machine.memoryTotal > 0)
			assert.equal(machine.cpuPercent, null, 'first sample does not invent a utilization rate')
			const heartbeat = reopened.events(item.id).find(e => e.kind === 'trace-heartbeat')!
			assert.ok(heartbeat)
			assert.equal(typeof (heartbeat.data.machine as typeof machine).cpuPercent, 'number')
			assert.equal(reopened.events(item.id).find(e => e.kind === 'trace-output')!.data.text, 'real captured bytes\n')
		} finally { reopened.close() }
	} finally { t.close() }
})
