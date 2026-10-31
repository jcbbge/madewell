import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { AGENT_JOBS, type Card, type Prescriptions } from '../src/cards.ts'
import { promote, runQueue } from '../src/engine.ts'
import type { Pack } from '../src/lane.ts'
import { openStore, Store, type Item } from '../src/store.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'

const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'"
const jsonCommand = (value: unknown) => `${quote(process.execPath)} -e ${quote(`console.log(${JSON.stringify(JSON.stringify(value))})`)}`
const object = { type: 'object' }
const source = 'Raw source for the selected work.\r\nKeep the exact handoff.  '
const clear = { understanding: 'The local work function is clear.', unclear: [], ambiguous: [], missing: [], notes: [] }
const card: Card = { harness: 'codex', provider: 'test', account: 'test', model: 'scripted', effort: 'low' }
const prescriptions: Prescriptions = { tiers: { deep: [card], intake: [card] }, jobs: {
	...Object.fromEntries(AGENT_JOBS.map((job) => [job, { tier: 'deep', access: 'none', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } },
} as Prescriptions['jobs'], parallel: 2 }
const agentPack: Pack = { name: 'driver work', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [{ job: 'perform', profile: 'implementer', duty: 'Perform this selected local fixture action.', output: object }] }] }
const commandPack: Pack = { name: 'queue command', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [{ job: 'perform', run: jsonCommand({ finished: true }), output: object }] }] }

function fixture(script: (req: WorkerRequest) => Promise<WorkerResult> | WorkerResult = () => ({ ok: true, output: JSON.stringify({ finished: true }) })) {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-foreground-')))
	const workspace = join(root, 'workspace')
	mkdirSync(workspace)
	const path = join(root, 'record.db')
	let store = openStore(path)
	const requests: WorkerRequest[] = []
	const worker = Layer.succeed(Worker, { run: (req) => Effect.promise(async () => {
		requests.push(req)
		return req.kind === 'intake' ? { ok: true as const, output: JSON.stringify(clear) } : await script(req)
	}) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	const create = (title: string, pack = commandPack, fields: Partial<Pick<Item, 'status' | 'after' | 'autonomy' | 'job' | 'flow'>> = {}) => store.create({ title, objective: `Complete ${title}`, source, workspace, pack, autonomy: 'full', ...fields })
	return { root, workspace, path, requests, run, create, get store() { return store }, reopen() { store.close(); store = openStore(path) }, clean() { store.close(); rmSync(root, { recursive: true, force: true }) } }
}

const savedRecord = (store: ReturnType<typeof openStore>, id: number) => ({ item: store.get(id), events: store.events(id), calls: store.calls(id) })

for (const autonomy of ['full', 'checkpoints'] as const) test(`scoped queue drives ${autonomy} discovery and selected children concurrently while honoring dependencies`, async () => {
	let t: ReturnType<typeof fixture>
	let releasePair!: () => void
	const pair = new Promise<void>((resolve) => { releasePair = resolve })
	const active = new Set<number>()
	const started = new Set<string>()
	const violations: string[] = []
	let maxActive = 0
	t = fixture(async (req) => {
		const title = JSON.parse(req.prompt).item.title as string
		active.add(req.item)
		maxActive = Math.max(maxActive, active.size)
		started.add(title)
		if (title === 'A' || title === 'B') {
			if (started.has('A') && started.has('B')) releasePair()
			await pair
		}
		if (title === 'C') {
			const predecessors = t.store.list().filter((item) => item.title === 'A' || item.title === 'B')
			if (!predecessors.every((item) => item.status === 'completed')) violations.push('dependent started before its prerequisites completed')
			if (!predecessors.every((item) => existsSync(join(t.workspace, `${item.id}.json`)))) violations.push('dependent started before prerequisite artifacts existed')
		}
		writeFileSync(join(t.workspace, `${req.item}.json`), JSON.stringify({ item: req.item, title }))
		active.delete(req.item)
		return { ok: true, output: JSON.stringify({ finished: true, artifact: `${req.item}.json` }) }
	})
	try {
		const historical = [t.create('Historical queued'), t.create('Historical held', commandPack, { status: 'held' }), t.create('Historical candidate', commandPack, { status: 'candidate' })]
		const history = historical.map((item) => savedRecord(t.store, item.id))
		const pack: Pack = { ...agentPack, discovery: [{ cartridge: 'discovery', steps: [{ job: 'discover-local', run: jsonCommand({ items: [
			{ title: 'A', objective: 'Make independent artifact A' }, { title: 'B', objective: 'Make independent artifact B' },
			{ title: 'C', objective: 'Use both prior artifacts', after: [1, 2] }, { title: 'Unselected option', objective: 'A separately selectable possibility' },
		] }), output: object }] }] }
		const root = t.create('Selected discovery', pack, { autonomy, job: 'discover-local', flow: { loop: 'discovery', accepted: [] } })
		let result = await t.run(runQueue({ prescriptions }, { roots: [root.id] }).pipe(Effect.timeout('8 seconds')))
		const children = t.store.list().filter((item) => item.discovery === root.id)
		assert.equal(children.length, 4)
		assert.equal(t.store.get(root.id)!.status, 'discovered')
		if (autonomy === 'checkpoints') {
			assert.ok(children.every((item) => item.status === 'candidate'))
			assert.equal(t.requests.length, 0, 'discovery never promotes unselected tasks')
			const target = children.find((item) => item.title === 'C')!
			const selected = await t.run(promote(root.id, [target.id]))
			assert.deepEqual(selected.map((item) => item.title), ['A', 'B', 'C'])
			t.reopen()
			result = await t.run(runQueue({ prescriptions }, { roots: [target.id] }).pipe(Effect.timeout('8 seconds')))
			assert.equal(t.store.get(children.find((item) => item.title === 'Unselected option')!.id)!.status, 'candidate')
			assert.equal(started.has('Unselected option'), false)
		}
		assert.deepEqual(violations, [])
		assert.equal(maxActive, 2, 'the existing queue executes independent selected children concurrently')
		assert.ok(['A', 'B', 'C'].every((title) => started.has(title)))
		assert.ok(children.filter((item) => item.title !== 'Unselected option' || autonomy === 'full').every((item) => t.store.get(item.id)!.status === 'completed'))
		assert.ok(result.items.every((item) => item.id === root.id || children.some((child) => child.id === item.id)))
		for (const [index, item] of historical.entries()) assert.deepEqual(savedRecord(t.store, item.id), history[index], 'scope cannot touch unrelated historical records')
		assert.equal(t.store.runner(), null)
		const baseline = await t.run(runQueue({ prescriptions }))
		assert.ok(baseline.items.some((item) => item.id === historical[0]!.id && item.status === 'completed'), 'default queue still drives unrelated ready work')
		assert.equal(t.store.get(historical[1]!.id)!.status, 'held')
		assert.equal(t.store.get(historical[2]!.id)!.status, 'candidate')
	} finally { releasePair(); t.clean() }
})

test('an explicit empty scope performs no queued work and callback scopes read their current root selection', async () => {
	const t = fixture()
	try {
		const first = t.create('First')
		const second = t.create('Second')
		assert.deepEqual((await t.run(runQueue({ prescriptions }, { roots: [] }))).items, [])
		assert.equal(t.store.get(first.id)!.status, 'queued')
		let roots = [second.id]
		assert.deepEqual((await t.run(runQueue({ prescriptions }, { roots: () => roots }))).items.map((item) => item.id), [second.id])
		roots = [first.id]
		assert.deepEqual((await t.run(runQueue({ prescriptions }, { roots: () => roots }))).items.map((item) => item.id), [first.id])
	} finally { t.clean() }
})

// Test-only harness for the real foreground server. Worker pauses on a filesystem signal;
// Store observations go to stdout after their real transactions commit.
const foregroundScript = `
import { Effect, Layer } from 'effect';
import { existsSync, readFileSync, watch } from 'node:fs';
import { join } from 'node:path';
import { Store, openStore } from './src/store.ts';
import { Worker } from './src/worker.ts';
import { serveForeground } from './examples/switch-demo/foreground.ts';
const emit = value => process.stdout.write(JSON.stringify(value)+'\\n');
const store = openStore(process.argv[1]), prescriptions = JSON.parse(readFileSync(process.argv[2],'utf8'));
const save = store.save.bind(store);
store.save = (...args) => { const result=save(...args); if(result.status==='completed')emit({kind:'completed',item:result.id}); return result; };
const worker = Layer.succeed(Worker,{run:req=>req.kind==='intake'
 ? Effect.succeed({ok:true,output:JSON.stringify(${JSON.stringify(clear)})})
 : Effect.callback(resume=>{
   emit({kind:'worker-started',item:req.item}); let returned=false;
   const permit=join(req.cwd,'permit');
   const ready=()=>{if(!returned&&existsSync(permit)){returned=true;watcher.close();resume(Effect.succeed({ok:true,output:JSON.stringify({finished:true})}));}};
   const watcher=watch(req.cwd,ready); ready();
   return Effect.sync(()=>{watcher.close();if(!returned)emit({kind:'worker-cancelled',item:req.item});});
 })});
const stop=new AbortController();process.once('SIGTERM',()=>stop.abort());process.once('SIGINT',()=>stop.abort());
try { await Effect.runPromise(serveForeground(prescriptions,'127.0.0.1',0).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store,store),worker))),{signal:stop.signal}); }
catch(error){if(!stop.signal.aborted){console.error(error);process.exitCode=1;}}
finally{emit({kind:'shutdown'});store.close();}
`

function foreground(path: string, prescriptionsPath: string) {
	const child = spawn(process.execPath, ['--input-type=module', '-e', foregroundScript, path, prescriptionsPath], { cwd: join(import.meta.dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] })
	const messages: Record<string, any>[] = []
	const listeners = new Set<() => void>()
	let stderr = '', pending = ''
	child.stderr.on('data', (chunk) => { stderr += String(chunk) })
	child.stdout.on('data', (chunk) => {
		pending += String(chunk)
		for (let newline; (newline = pending.indexOf('\n')) >= 0;) {
			const line = pending.slice(0, newline); pending = pending.slice(newline + 1)
			try { messages.push(JSON.parse(line)) } catch {}
		}
		for (const listener of listeners) listener()
	})
	child.once('exit', () => { for (const listener of listeners) listener() })
	const wait = (matches: (message: Record<string, any>) => boolean, timeout = 8000) => new Promise<Record<string, any>>((resolve, reject) => {
		const finish = () => {
			const message = messages.find(matches)
			if (message) { clearTimeout(timer); listeners.delete(finish); resolve(message) }
			else if (child.exitCode !== null || child.signalCode !== null) { clearTimeout(timer); listeners.delete(finish); reject(new Error(`Foreground exited: ${stderr}`)) }
		}
		const timer = setTimeout(() => { listeners.delete(finish); reject(new Error(`Foreground observation timed out: ${stderr}`)) }, timeout)
		listeners.add(finish); finish()
	})
	const close = async () => {
		if (child.exitCode !== null || child.signalCode !== null) return
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`Foreground did not stop: ${stderr}`)) }, 5000)
			child.once('exit', () => { clearTimeout(timer); resolve() })
			child.kill('SIGTERM')
		})
	}
	return { child, messages, wait, close }
}

test('HTTP wake returns before work finishes, persists scope across restart, and foreground shutdown cancels workers', async () => {
	const t = fixture()
	let server: ReturnType<typeof foreground> | undefined
	try {
		const historical = [t.create('Historical queued'), t.create('Historical held', commandPack, { status: 'held' }), t.create('Historical candidate', commandPack, { status: 'candidate' })]
		const before = historical.map((item) => savedRecord(t.store, item.id))
		const packPath = join(t.root, 'pack.json')
		writeFileSync(packPath, JSON.stringify(agentPack))
		writeFileSync(join(t.root, 'projects.json'), JSON.stringify([{ path: t.workspace, cartridges: packPath, autonomy: 'full' }]))
		const prescriptionsPath = join(t.root, 'prescriptions.json')
		writeFileSync(prescriptionsPath, JSON.stringify(prescriptions))
		server = foreground(t.path, prescriptionsPath)
		const url = (await server.wait((message) => typeof message.ui === 'string')).ui as string
		const session = await (await fetch(`${url}api/v1/session`)).json() as { csrfToken: string }
		const response = await fetch(`${url}api/v1/items`, { method: 'POST', signal: AbortSignal.timeout(1500), headers: { Origin: url.slice(0, -1), 'Content-Type': 'application/json', 'X-MW-CSRF': session.csrfToken }, body: JSON.stringify({ requestId: randomUUID(), workspace: t.workspace, title: 'Browser selected work', objective: 'Finish the selected local action', source }) })
		assert.equal(response.status, 201)
		const receipt = await response.json() as { receipt: { item: number }; warnings: string[] }
		assert.deepEqual(receipt.warnings, [])
		const id = receipt.receipt.item
		assert.notEqual(t.store.get(id)!.status, 'completed', 'the HTTP response does not wait on the paused worker')
		await server.wait((message) => message.kind === 'worker-started' && message.item === id)
		assert.equal(t.store.get(id)!.status, 'running')
		assert.ok(t.store.events(id).some((event) => event.kind === 'demo-foreground-wake'), 'the explicit selection is durable before execution')
		await server.close()
		assert.ok(server.messages.some((message) => message.kind === 'worker-cancelled' && message.item === id), 'foreground cancellation reaches the running worker')
		assert.equal(server.child.exitCode, 0)
		t.reopen()
		assert.equal(t.store.runner(), null)
		assert.equal(t.store.get(id)!.status, 'running', 'shutdown cannot invent completion for interrupted work')
		assert.ok(t.store.events(id).some((event) => event.kind === 'trace-finished' && event.data.status === 'interrupted'))
		for (const [index, item] of historical.entries()) assert.deepEqual(savedRecord(t.store, item.id), before[index])
		writeFileSync(join(t.workspace, 'permit'), 'Resume the selected work after restart.')
		server = foreground(t.path, prescriptionsPath)
		await server.wait((message) => typeof message.ui === 'string')
		await server.wait((message) => message.kind === 'completed' && message.item === id)
		assert.equal(t.store.get(id)!.status, 'completed', 'restart reloads the saved root without another submission or wake')
		assert.equal(t.store.list().length, historical.length + 1)
		for (const [index, item] of historical.entries()) assert.deepEqual(savedRecord(t.store, item.id), before[index])
		await server.close()
		assert.equal(server.child.exitCode, 0)
		assert.equal(t.store.runner(), null)
	} finally { await server?.close(); t.clean() }
})
