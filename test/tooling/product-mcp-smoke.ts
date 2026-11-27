import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { fileURLToPath } from 'node:url'
import { Client, DEFAULT_NEGOTIATED_PROTOCOL_VERSION } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { defaultSettings } from '../../src/settings.ts'
import { openReadOnlyStore, openStore } from '../../src/store.ts'
import { resultPack } from '../fixtures/prepared-output.ts'

// Public-wire acceptance helpers, shared by brainstorm.test.ts. Never import the new maker services.
export type Value = Record<string, unknown>
export const repository = resolve(import.meta.dirname, '../..')
export const actor = { kind: 'operator', label: 'operator — source owner 雪' } as const
export const reporter = { kind: 'agent', label: 'ideator — reported, not independently accepted' } as const
export const roughSource = '  fragment: 鳥 / café / e\u0301 / 😀\r\nKeep the library open.\r\n  Settled: no ticket gate.  \r\n'
export const reportedResult = {
	artifact: '# Opening — 鳥\r\nA shared shelf, not a checkout queue.  \r\n',
	sources: ['source: operator fragment; no external research performed'],
	decisions: ['Keep the library open; do not reopen the settled no-ticket decision.'],
	unknowns: ['Whether a staffed shelf is available is unobserved.'],
	alternatives: ['A staffed shelf', 'An unstaffed exchange — still live'],
	nextMove: 'Ask which shelf can be observed without contacting anyone.', performedEffort: 'light',
} as const
export const tools = ['catalog_brainstorm', 'capture_brainstorm', 'inspect_brainstorm', 'prepare_brainstorm', 'record_brainstorm', 'capture_work', 'inspect_work', 'prepare_work', 'record_work', 'preview_work', 'promote_work', 'replace_work', 'inspect_composition']
const milliseconds = 30000, byteLimit = 16 * 1024 * 1024

export function object(value: unknown): Value {
	assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value), 'expected an object')
	return value as Value
}
export function array(value: unknown): unknown[] { assert.ok(Array.isArray(value)); return value }
export function text(value: unknown): string { assert.equal(typeof value, 'string'); return value as string }
export function nodes(value: unknown): unknown[] {
	return [value, ...(Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === 'object' ? Object.values(value).flatMap(nodes) : [])]
}
export function retains(value: unknown, expected: unknown, why: string) {
	assert.ok(nodes(value).some(node => { try { assert.deepEqual(node, expected); return true } catch { return false } }), why)
}
export function retainsText(value: unknown, expected: string, why: string) {
	assert.ok(nodes(value).some(node => typeof node === 'string' && node.includes(expected)), why)
}
export function handle(value: unknown) {
	const result = object(value)
	assert.ok(Number.isSafeInteger(result.itemId) && Number(result.itemId) > 0)
	assert.ok(text(result.revision).length > 0)
	return { itemId: result.itemId as number, revision: result.revision as string }
}
export function handoff(value: unknown) {
	const result = object(object(value).handoff)
	assert.ok(text(result.id).length > 0)
	return result
}
export function light(value: unknown) {
	assert.equal(handoff(value).effectiveEffort, 'light', 'explicit effective Light, not a mention inside instruction prose')
}
function objectOrEmpty(value: unknown): Value { return value && typeof value === 'object' && !Array.isArray(value) ? value as Value : {} }
export const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
// Independent immutable upstream byte anchors, not hashes supplied by the resolver under test.
const seedHashes: Record<string, string> = {
	brainstorm: 'a97b15eb85a7ae9bcf6499567077cd002ddd14f28f61b08eb97345342bf051b6',
	'ambitious-collaboration': 'd50fbba68c3fb2dcdea9454b898a9482961608050ff10535ef25a4901b108231',
	nonconvergence: '786824408fe92b019a471227e9b2430d7a96f89928aa6d2057c3743528cea758',
}
export function seed(name: string): string {
	const bytes = readFileSync(join(repository, 'brainstorm/skills', name, 'SKILL.md'))
	if (seedHashes[name]) assert.equal(digest(bytes), seedHashes[name], `approved upstream ${name} bytes`)
	return bytes.toString('utf8')
}
export function selectedBodies(value: unknown, specialist = false) {
	const expected = ['brainstorm', 'ambitious-collaboration', ...(specialist ? ['nonconvergence'] : [])]
	const packages = array(object(value).packages).map(object)
	assert.deepEqual(packages.map(pkg => pkg.name).sort(), [...expected].sort(), 'only the selected entry, posture and specialist packages reach the host')
	for (const name of expected) {
		retains(value, seed(name), `${name}: complete exact selected SKILL.md reaches the host`)
		const pkg = packages.find(pkg => pkg.name === name)!
		assert.equal(pkg.instructions, seed(name))
		assert.ok(text(pkg.identity))
		const manifest = array(pkg.manifest).map(object), contents = array(pkg.files).map(object)
		const inventory = object(JSON.parse(readFileSync(join(repository, 'brainstorm/PROVENANCE.json'), 'utf8')))
		assert.equal(inventory.revision, '9addbffae9d600f40dd334ad97bb24c6b0a0c7b7', 'explicit approved agent-core seed identity')
		assert.deepEqual(contents.map(file => file.path).sort(), manifest.map(file => file.path).sort())
		for (const file of contents) {
			const path = text(file.path)
			assert.ok(!isAbsolute(path) && !path.split('/').includes('..'))
			assert.ok(!path.startsWith('evals/'), 'eval scenarios are not runtime context')
			const expectedBytes = readFileSync(join(repository, 'brainstorm/skills', name, path))
			const upstream = array(inventory.files).map(object).find(entry => entry.path === `skills/${name}/${path}`)
			assert.ok(upstream, 'support is declared in the explicit upstream seed inventory')
			assert.equal(digest(expectedBytes), upstream.sha256)
			assert.deepEqual(Buffer.from(text(file.content), 'utf8'), expectedBytes, 'supporting content preserves exact source bytes')
			const entry = manifest.find(entry => entry.path === path)!
			assert.equal(file.sha256, digest(expectedBytes)); assert.equal(file.bytes, expectedBytes.length)
			assert.equal(entry.sha256, digest(expectedBytes)); assert.equal(entry.bytes, expectedBytes.length)
		}
	}
	const catalog = readdirSync(join(repository, 'brainstorm/skills'))
	for (const name of catalog.filter(name => !['brainstorm', 'ambitious-collaboration', ...(specialist ? ['nonconvergence'] : [])].includes(name))) {
		assert.ok(!nodes(value).some(node => typeof node === 'string' && node.includes(seed(name))), `unselected ${name} instruction body is not loaded into the handoff`)
	}
}
export function decoded(result: unknown): Value {
	const wire = object(result)
	const first = object(array(wire.content)[0])
	assert.equal(first.type, 'text')
	return object(JSON.parse(text(first.text)))
}
export function success(result: unknown): Value {
	assert.notEqual(object(result).isError, true, JSON.stringify(result))
	const parsed = decoded(result)
	assert.deepEqual(object(result).structuredContent, parsed, 'JSON text and structuredContent agree')
	if (parsed.itemId !== undefined) {
		assert.equal(parsed.executionAuthorized, false)
		assert.equal(parsed.promotionAuthorized, false)
	}
	return parsed
}
export function failure(result: unknown, reason: RegExp): Value {
	assert.equal(object(result).isError, true, 'service failure must not look like a successful receipt')
	const error = decoded(result)
	assert.ok(text(error.error).length > 0, 'MadeWellError serializes the code as error')
	assert.ok(text(error.message).length > 0)
	assert.ok(Object.keys(object(error.context)).length > 0, 'factual error context')
	assert.ok(array(error.next).length > 0, 'actionable refusal')
	for (const next of array(error.next)) { assert.ok(text(object(next).run)); assert.ok(text(object(next).why)) }
	assert.match(JSON.stringify(error), reason)
	return error
}
export async function bounded<A>(promise: Promise<A>, label: string): Promise<A> {
	let timer: NodeJS.Timeout | undefined
	try {
		return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds) })])
	} finally { clearTimeout(timer) }
}
export function files(root: string, prefix = ''): Record<string, string> {
	return Object.fromEntries(readdirSync(join(root, prefix)).sort().flatMap(name => {
		const path = prefix ? `${prefix}/${name}` : name, stat = lstatSync(join(root, path))
		assert.equal(stat.isSymbolicLink(), false, 'fixture snapshot does not follow symlinks')
		return stat.isDirectory() ? [[`${path}/`, ''], ...Object.entries(files(root, path))] : [[path, readFileSync(join(root, path)).toString('base64')]]
	}))
}
function telemetry(body: string, exchanges: { id: unknown; method: string; tool?: string; failed?: boolean }[]) {
	const records = body.split('\n').filter(line => line.trim()).map(line => object(JSON.parse(line)))
	assert.ok(records.length > 0)
	assert.ok(records.every(record => record.kind === 'span' || record.kind === 'metrics'), 'telemetry channel is JSONL, never logs/protocol')
	const spans = records.filter(record => record.kind === 'span')
	for (const span of spans) {
		assert.match(text(span.traceId), /^(?!0{32}$)[a-f\d]{32}$/i)
		assert.match(text(span.spanId), /^(?!0{16}$)[a-f\d]{16}$/i)
		assert.ok(text(object(span.scope).name))
		assert.notEqual(object(span.scope).name, 'madewell.local-mcp-fixture', 'product telemetry is not the development fixture')
	}
	for (const exchange of exchanges.filter(exchange => ['tools/list', 'tools/call'].includes(exchange.method))) {
		const correlated = spans.filter(span => object(span.attributes)['jsonrpc.request.id'] === exchange.id)
		assert.equal(correlated.length, 1, `one actual span for ${exchange.method}/${exchange.tool ?? ''} id=${exchange.id}`)
		const span = correlated[0]!, attributes = object(span.attributes)
		assert.equal(attributes['mcp.method.name'], exchange.method)
		if (exchange.tool && tools.includes(exchange.tool)) assert.equal(attributes['gen_ai.tool.name'], exchange.tool)
		else if (exchange.tool) assert.equal(Object.hasOwn(attributes, 'gen_ai.tool.name'), false, 'unknown tools never create arbitrary-cardinality tool labels')
		if (exchange.failed) assert.equal(object(span.status).code, 2)
		else assert.notEqual(object(span.status).code, 2)
	}
	const metrics = records.filter(record => record.kind === 'metrics').flatMap(record => array(record.scopeMetrics)).flatMap(scope => array(object(scope).metrics)).map(object)
	assert.ok(metrics.some(metric => /duration/.test(text(object(metric.descriptor).name)) && array(metric.dataPoints).some(value => {
		const point = object(value), histogram = objectOrEmpty(point.value)
		return object(point.attributes)['mcp.method.name'] === 'tools/call' && (typeof point.value === 'number' ? Number.isFinite(point.value) && point.value >= 0 : Number(histogram.count) > 0 && Number(histogram.sum) >= 0)
	})), 'real request-duration samples include the MCP method')
}

export async function productFixture(options: { entry?: string; copyRuntime?: boolean; existingStore?: boolean } = {}) {
	const root = mkdtempSync(join(tmpdir(), 'mw-product-mcp-'))
	const project = join(root, 'granted'), other = join(root, 'other-root'), caller = join(root, 'unrelated-caller'), storePath = join(root, 'ledger/record.db')
	for (const directory of [project, other, caller]) mkdirSync(directory)
	let entry = options.entry ?? join(repository, 'src/mcp.ts')
	let copiedRuntime: string | undefined
	if (options.copyRuntime) {
		copiedRuntime = join(root, 'disposable-runtime'); mkdirSync(copiedRuntime)
		cpSync(join(repository, 'src'), join(copiedRuntime, 'src'), { recursive: true })
		cpSync(join(repository, 'brainstorm'), join(copiedRuntime, 'brainstorm'), { recursive: true })
		writeFileSync(join(copiedRuntime, 'package.json'), '{"type":"module"}\n')
		symlinkSync(join(repository, 'node_modules'), join(copiedRuntime, 'node_modules'), 'dir')
		entry = join(copiedRuntime, 'src/mcp.ts')
	}
	const marker = join(root, 'unexpected-execution'), absentHome = join(root, 'absent-home'), poison = join(root, 'do-not-open.db')
	const inheritedTelemetry = join(root, 'unrelated-inherited-telemetry.jsonl')
	writeFileSync(inheritedTelemetry, 'UNRELATED TELEMETRY FILE — never append or truncate.\n')
	writeFileSync(poison, 'Not SQLite. Explicit --store must win.\n')
	if (options.existingStore !== false) {
		const store = openStore(storePath)
		try { store.saveSettings({ ...defaultSettings(), deliveryPack: resultPack(), autonomy: 'full', alert: { run: `touch ${marker}`, cwd: project } }, '2026-11-27T00:00:00.000Z') } finally { store.close() }
	}
	const snapshot = () => {
		if (!existsSync(storePath)) return null
		const store = openReadOnlyStore(storePath)
		try { return structuredClone({ items: store.list(), rawItems: store.rawItems(), events: store.allEvents(), settings: store.settings(), runner: store.runner(), calls: store.callHeads() }) } finally { store.close() }
	}
	const initial = snapshot(), projectFiles = files(project), callerFiles = files(caller)
	const connections: string[] = []
	const tripwire = createServer(socket => { connections.push('unexpected exporter/provider connection'); socket.destroy() })
	await bounded(new Promise<void>((fulfill, reject) => { tripwire.once('error', reject); tripwire.listen(0, '127.0.0.1', fulfill) }), 'tripwire setup')
	const address = tripwire.address(); assert.ok(address && typeof address !== 'string')
	const endpoint = `http://127.0.0.1:${address.port}`
	const env: Record<string, string> = {
		PATH: process.env.PATH ?? '', HOME: caller, TMPDIR: root, MW_HOME: absentHome, MW_STORE: poison, MW_DEBUG: '0', MW_AUTORUN: '1',
		MW_TELEMETRY: inheritedTelemetry,
		MW_PRESCRIPTIONS: join(root, 'missing-prescriptions.json'),
		MW_WORKER_COMMAND: `${JSON.stringify(process.execPath)} -e ${JSON.stringify(`require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed')`)}`,
		OPENAI_BASE_URL: endpoint, ANTHROPIC_BASE_URL: endpoint, OPENAI_API_KEY: 'disposable-not-a-credential', ANTHROPIC_API_KEY: 'disposable-not-a-credential',
		OTEL_TRACES_EXPORTER: 'otlp', OTEL_METRICS_EXPORTER: 'otlp', OTEL_LOGS_EXPORTER: 'otlp', OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
		OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: `${endpoint}/v1/traces`, OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: `${endpoint}/v1/metrics`, OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: `${endpoint}/v1/logs`,
		OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf', OTEL_METRIC_EXPORT_INTERVAL: '1', OTEL_SDK_DISABLED: 'true', OTEL_TRACES_SAMPLER: 'always_off',
	}
	let active: { client: Client; transport: StdioClientTransport; initialized: boolean; stderr: () => string; finish: () => void; file?: string; exchanges: { id: unknown; method: string; tool?: string; failed?: boolean }[] } | undefined
	let sessions = 0
	const disconnect = async () => {
		if (!active) return
		const session = active; active = undefined
		try { await bounded(session.client.close(), 'SDK clean EOF close') } catch (error) {
			const pid = session.transport.pid
			if (pid) try { process.kill(pid, 'SIGKILL') } catch (cause) { if ((cause as NodeJS.ErrnoException).code !== 'ESRCH') throw cause }
			await bounded(session.transport.close(), 'SDK forced reap')
			throw error
		}
		session.finish()
		const stderr = session.stderr()
		if (!session.initialized) {
			// A source-root mismatch may safely refuse at startup rather than per work operation.
			const errors = stderr.split('\n').filter(line => line.trim()).map(line => object(JSON.parse(line))).filter(record => typeof record.error === 'string')
			assert.equal(errors.length, 1, 'startup refusal is an explicit MadeWellError, not a crash or timeout')
			return errors[0]!
		}
		if (session.file) assert.equal(stderr, '', 'explicit local telemetry file keeps normal stderr empty')
		telemetry(session.file ? readFileSync(session.file, 'utf8') : stderr, session.exchanges)
	}
	const connect = async (settings: { grantedRoot?: string; file?: boolean; preload?: string } = {}) => {
		await disconnect()
		const file = settings.file ? join(root, `telemetry-${++sessions}.jsonl`) : undefined
		const transport = new StdioClientTransport({ command: process.execPath, args: [...(settings.preload ? ['--import', settings.preload] : []), entry, '--root', settings.grantedRoot ?? project, '--store', storePath, ...(file ? ['--telemetry-file', file] : [])], cwd: caller, env, stderr: 'pipe' })
		const client = new Client({ name: 'madewell-independent-product-acceptance', version: '1.0.0' })
		const exchanges: { id: unknown; method: string; tool?: string; failed?: boolean }[] = []
		const send = transport.send.bind(transport)
		transport.send = message => {
			const wire = object(message)
			if (wire.id !== undefined && typeof wire.method === 'string') exchanges.push({ id: wire.id, method: wire.method, ...(wire.method === 'tools/call' ? { tool: text(object(wire.params).name) } : {}) })
			return send(message)
		}
		let stderr = '', overflow = false
		const decoder = new StringDecoder('utf8')
		transport.stderr!.on('data', (bytes: Buffer) => {
			if (overflow) return
			stderr += decoder.write(bytes)
			if (Buffer.byteLength(stderr) > byteLimit) { overflow = true; void transport.close().catch(() => {}) }
		})
		active = { client, transport, initialized: false, file, exchanges, stderr: () => stderr, finish: () => { stderr += decoder.end(); assert.equal(overflow, false) } }
		const session = active
		await bounded(client.connect(transport), 'SDK initialize')
		session.initialized = true
		const receive = transport.onmessage!
		transport.onmessage = message => {
			const wire = object(message), exchange = exchanges.find(exchange => exchange.id === wire.id)
			if (exchange && ('result' in wire || 'error' in wire)) exchange.failed = wire.error !== undefined || objectOrEmpty(wire.result).isError === true
			receive(message)
		}
		return client
	}
	const call = async (name: string, args: Value) => {
		assert.ok(active, 'connect before making calls')
		return bounded(active.client.callTool({ name, arguments: args }), name)
	}
	const assertNoExecution = () => {
		const state = snapshot()
		if (initial) assert.deepEqual(state?.settings ?? null, initial.settings, 'installed runnable defaults were not rewritten')
		assert.deepEqual(state?.runner ?? null, initial?.runner ?? null, 'no runner claim or takeover')
		assert.deepEqual(state?.calls ?? [], [], 'no provider/worker calls are recorded')
		for (const item of state?.items ?? []) {
			assert.equal(item.execution.mode, 'external')
			assert.equal(item.status, 'open', 'recorded exploratory output is not queued or completed work')
			assert.equal(item.completion, undefined, 'no recorded or automated business completion')
			assert.equal(item.launches, 0)
		}
		assert.ok(!(state?.events ?? []).some(event => /runner-|launch|promot|completed|accepted-work/.test(event.kind)), 'no execution, promotion or completion events')
		assert.deepEqual(files(project), projectFiles)
		assert.deepEqual(files(caller), callerFiles)
		assert.equal(existsSync(marker), false)
		assert.equal(existsSync(absentHome), false)
		assert.equal(readFileSync(poison, 'utf8'), 'Not SQLite. Explicit --store must win.\n')
		assert.equal(readFileSync(inheritedTelemetry, 'utf8'), 'UNRELATED TELEMETRY FILE — never append or truncate.\n', 'inherited MW_TELEMETRY cannot redirect product or Store telemetry')
		assert.deepEqual(connections, [], 'no connections to configured OTLP/provider destinations')
	}
	return { root, project, other, caller, storePath, entry, copiedRuntime, env, initial, snapshot, connect, disconnect, call, assertNoExecution,
		close: async () => {
			const errors: unknown[] = []
			try { await disconnect() } catch (error) { errors.push(error) }
			try { assertNoExecution() } catch (error) { errors.push(error) }
			try { await bounded(new Promise<void>((fulfill, reject) => tripwire.close(error => error ? reject(error) : fulfill())), 'tripwire close') } catch (error) { errors.push(error) }
			try { rmSync(root, { recursive: true, force: true }) } catch (error) { errors.push(error) }
			if (errors.length) throw new AggregateError(errors, 'product fixture cleanup/invariants')
		},
	}
}
export type ProductFixture = Awaited<ReturnType<typeof productFixture>>

export const startupAliasCases = ['fresh-parent-symlink', 'existing-hardlink', 'existing-parent-symlink'] as const
export async function startupAliasRefusal(kind: typeof startupAliasCases[number], entry?: string) {
	const fresh = kind === 'fresh-parent-symlink'
	const f = await productFixture({ entry, existingStore: !fresh })
	try {
		const data = dirname(f.storePath)
		mkdirSync(data, { recursive: true })
		let telemetryFile: string
		if (kind === 'existing-hardlink') {
			telemetryFile = join(f.root, 'telemetry-hardlink.jsonl')
			linkSync(f.storePath, telemetryFile)
		} else {
			const alias = join(f.root, 'telemetry-parent-alias')
			symlinkSync(data, alias, 'dir')
			assert.equal(lstatSync(alias).isSymbolicLink(), true)
			telemetryFile = join(alias, basename(f.storePath))
		}
		assert.notEqual(resolve(telemetryFile), resolve(f.storePath), 'negative control uses distinct path spellings')
		if (fresh) {
			assert.equal(existsSync(f.storePath), false)
			assert.equal(existsSync(telemetryFile), false)
		} else {
			assert.equal(statSync(telemetryFile).dev, statSync(f.storePath).dev)
			assert.equal(statSync(telemetryFile).ino, statSync(f.storePath).ino, 'alias actually identifies the existing SQLite file')
		}
		const beforeState = f.snapshot(), before = files(data)
		const child = spawn(process.execPath, [f.entry, '--root', f.project, '--store', f.storePath, '--telemetry-file', telemetryFile], { cwd: f.caller, env: f.env, stdio: 'pipe', detached: true })
		const kill = () => { if (child.pid) try { process.kill(-child.pid, 'SIGKILL') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error } }
		let stdout = '', stderr = '', processFailure: unknown
		const finished = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(fulfill => { child.once('close', (code, signal) => fulfill({ code, signal })) })
		const timer = setTimeout(() => { processFailure = new Error('startup alias refusal timed out'); kill() }, milliseconds)
		child.once('error', error => { processFailure = error })
		child.stdin.on('error', error => { if ((error as NodeJS.ErrnoException).code !== 'EPIPE') processFailure = error })
		child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8')
		const collect = (destination: 'stdout' | 'stderr', chunk: string) => {
			if (destination === 'stdout') stdout += chunk; else stderr += chunk
			if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > byteLimit) { processFailure = new Error('startup alias output exceeded bound'); kill() }
		}
		child.stdout.on('data', (chunk: string) => collect('stdout', chunk))
		child.stderr.on('data', (chunk: string) => collect('stderr', chunk))
		try {
			child.stdin.end() // No initialize request: this must fail before exposing the protocol.
			const exit = await bounded(finished, 'startup alias refusal')
			assert.equal(processFailure, undefined)
			assert.equal(exit.signal, null, 'a timeout or process signal is not a structured startup refusal')
			assert.ok(exit.code !== null && exit.code !== 0)
			assert.equal(stdout, '', 'startup refusal emits no JSON-RPC or other stdout')
			const diagnostics = stderr.split('\n').filter(line => line.trim()).map(line => object(JSON.parse(line)))
			assert.equal(diagnostics.length, 1, 'one structured diagnostic and no telemetry/log bytes on stderr')
			assert.equal(diagnostics[0]!.error, 'mcp_failed')
			failure({ isError: true, content: [{ type: 'text', text: JSON.stringify(diagnostics[0]) }] }, /alias|same|store|ledger|telemetry|symbolic|link|identity/i)
			assert.deepEqual(files(data), before, 'all raw SQLite/sidecar bytes remain unchanged; nonexistent DB stays absent')
			assert.deepEqual(f.snapshot(), beforeState, 'startup refusal does not acquire or mutate Store/settings/runner')
			if (fresh) assert.equal(existsSync(telemetryFile), false, 'telemetry must not create the nonexistent DB through its parent alias')
		} finally { clearTimeout(timer); kill(); await bounded(finished, 'startup alias child reap') }
	} finally { await f.close() }
}

export async function observesUpdatedSeed(f: ProductFixture, changed: string) {
	const fresh = await f.call('capture_brainstorm', { requestId: 'fresh-after-library-update', source: 'Fresh selection sees updated asset or a visible integrity refusal.', actor })
	if (object(fresh).isError === true) failure(fresh, /seed|source|hash|digest|stale|content|upstream|changed/i)
	else {
		const prepared = await f.call('prepare_brainstorm', { requestId: 'fresh-updated-prepare', ...handle(success(fresh)), actor })
		if (object(prepared).isError === true) failure(prepared, /seed|source|hash|digest|stale|content|upstream|changed/i)
		else retains(handoff(success(prepared)), changed, 'fresh selection must use this runtime’s changed asset, not the untouched source checkout')
	}
}

export async function conversation(f: ProductFixture) {
	const client = await f.connect()
	const listed = await bounded(client.listTools(), 'tools/list')
	assert.deepEqual(listed.tools.map(tool => tool.name).sort(), [...tools].sort())
	const catalog = success(await f.call('catalog_brainstorm', {}))
	for (const name of ['brainstorm', 'ambitious-collaboration', 'nonconvergence']) retainsText(catalog, name, 'catalog is discoverable')
	const captureInput = { requestId: 'capture-replay', source: roughSource, actor }
	const captured = success(await f.call('capture_brainstorm', captureInput)), first = handle(captured)
	const prepareInput = { requestId: 'prepare-replay', ...first, actor }
	const prepared = success(await f.call('prepare_brainstorm', prepareInput)), second = handle(prepared), packet = handoff(prepared)
	assert.notEqual(second.revision, first.revision)
	light(prepared); selectedBodies(packet); retains(packet, roughSource, 'rough source survives exact Unicode, CRLF and spacing')
	const recordInput = { requestId: 'record-replay', ...second, actor: reporter, handoffId: packet.id, result: reportedResult }
	const recorded = success(await f.call('record_brainstorm', recordInput)), third = handle(recorded)
	assert.equal(object(recorded.recorded).validation, 'shape-accepted-not-independently-verified')
	assert.deepEqual(object(recorded.recorded).actor, reporter)
	assert.deepEqual(object(recorded.recorded).result, reportedResult)
	assert.notEqual(third.revision, second.revision)
	const beforeRestart = f.snapshot()
	await f.disconnect()
	await f.connect({ file: true })
	for (const [tool, input, expected] of [
		['capture_brainstorm', captureInput, captured], ['prepare_brainstorm', prepareInput, prepared], ['record_brainstorm', recordInput, recorded],
	] as const) assert.deepEqual(success(await f.call(tool, input)), expected, 'durable receipt replay precedes stale-revision validation')
	assert.deepEqual(f.snapshot(), beforeRestart, 'retry has no duplicate events or results')
	const resumed = success(await f.call('inspect_brainstorm', { itemId: first.itemId }))
	assert.deepEqual(handle(resumed), third)
	retains(resumed, roughSource, 'resumption retains exact original material')
	retains(resumed, reportedResult, 'resumption retains exact complete exploratory result, not a summary')
	retains(resumed, reporter, 'resumption retains the reporting actor')
	const next = success(await f.call('prepare_brainstorm', { requestId: 'prepare-next', ...third, actor }))
	retains(handoff(next), reportedResult, 'next authorized handoff carries earlier decisions and exact result')
	selectedBodies(handoff(next))
	const beforeRefusal = f.snapshot()
	failure(await f.call('prepare_brainstorm', { requestId: 'no-paid-upgrade', ...handle(next), actor, effort: 'deep', outputLength: 'short' }), /access|unavailable|entitle|paid/i)
	assert.deepEqual(f.snapshot(), beforeRefusal)
	f.assertNoExecution()
	return { itemId: first.itemId, handoffId: packet.id, tools: listed.tools.map(tool => tool.name) }
}

async function rawProtocol(entry: string) {
	const f = await productFixture({ entry, existingStore: false })
	const child = spawn(process.execPath, [entry, '--root', f.project, '--store', f.storePath], { cwd: f.caller, env: f.env, stdio: 'pipe', detached: true })
	const kill = () => { if (child.pid) try { process.kill(-child.pid, 'SIGKILL') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error } }
	let stdout = '', stderr = '', pendingText = '', protocolFailure: unknown, id = 0
	const pending = new Map<number, (message: Value) => void>()
	child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8')
	const finished = new Promise<void>((fulfill, reject) => { child.once('error', reject); child.once('close', code => code === 0 && !protocolFailure ? fulfill() : reject(protocolFailure ?? new Error(`raw server exit ${code}: ${stderr}`))) })
	void finished.catch(() => {})
	const timer = setTimeout(() => { protocolFailure = new Error('raw product MCP timed out'); kill() }, milliseconds)
	child.stdin.on('error', error => { protocolFailure = error; kill() })
	child.stderr.on('data', (chunk: string) => { stderr += chunk; if (Buffer.byteLength(stderr) > byteLimit) { protocolFailure = new Error('raw stderr exceeded bound'); kill() } })
	child.stdout.on('data', (chunk: string) => {
		stdout += chunk; pendingText += chunk
		try {
			assert.ok(Buffer.byteLength(stdout) < byteLimit)
			let newline: number
			while ((newline = pendingText.indexOf('\n')) !== -1) {
				const line = pendingText.slice(0, newline); pendingText = pendingText.slice(newline + 1)
				const message = object(JSON.parse(line)); assert.equal(message.jsonrpc, '2.0'); assert.equal(message.kind, undefined)
				if (typeof message.id === 'number') { pending.get(message.id)?.(message); pending.delete(message.id) }
			}
		} catch (error) { protocolFailure = error; kill() }
	})
	const exchanges: { id: unknown; method: string; tool?: string; failed?: boolean }[] = []
	const request = async (method: string, params?: Value) => {
		const requestId = ++id, exchange = { id: requestId, method, ...(method === 'tools/call' ? { tool: text(params?.name) } : {}), failed: false }
		exchanges.push(exchange)
		const response = await bounded(new Promise<Value>(fulfill => { pending.set(requestId, fulfill); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, ...(params ? { params } : {}) }) + '\n') }), `raw ${method}`)
		exchange.failed = response.error !== undefined || objectOrEmpty(response.result).isError === true
		assert.equal(response.error, undefined, JSON.stringify(response))
		return response.result
	}
	try {
		await request('initialize', { protocolVersion: DEFAULT_NEGOTIATED_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'independent-raw-product', version: '1.0.0' } })
		child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
		assert.deepEqual(array(object(await request('tools/list')).tools).map(tool => object(tool).name).sort(), [...tools].sort())
		success(await request('tools/call', { name: 'catalog_brainstorm', arguments: {} }))
		const resources = object(await request('resources/list'))
		assert.ok(array(resources.resources).some(resource => object(resource).uri === 'madewell://brainstorm/catalog'))
		await request('resources/read', { uri: 'madewell://brainstorm/catalog' })
		assert.equal(f.snapshot(), null, 'initialization/list/catalog do not create the explicit Store')
		assert.equal(existsSync(dirname(f.storePath)), false, 'R8 resource reads leave the Store parent absent')
		failure(await request('tools/call', { name: 'inspect_brainstorm', arguments: { itemId: 927362 } }), /store|unavailable|unreadable|not.found|no work|item/i)
		assert.equal(existsSync(dirname(f.storePath)), false, 'R8 inspect refusal does not create storage')
		const captured = success(await request('tools/call', { name: 'capture_brainstorm', arguments: { requestId: 'raw-capture', source: roughSource, actor } }))
		failure(await request('tools/call', { name: 'prepare_brainstorm', arguments: { requestId: 'raw-focused', ...handle(captured), actor, effort: 'focused' } }), /access|unavailable|entitle|paid/i)
		child.stdin.end(); await bounded(finished, 'raw EOF flush')
		assert.equal(pendingText, '', 'no partial/nonprotocol stdout')
		telemetry(stderr, exchanges)
	} finally { clearTimeout(timer); kill(); await bounded(finished.catch(() => {}), 'raw reap'); await f.close() }
}

function localCommand(command: string, args: string[], cwd: string, scratch = cwd) {
	const result = spawnSync(command, args, { cwd, env: { PATH: process.env.PATH ?? '', HOME: scratch, MW_DEBUG: '0', npm_config_cache: join(scratch, '.npm-cache'), npm_config_update_notifier: 'false', npm_config_audit: 'false' }, encoding: 'utf8', timeout: milliseconds, maxBuffer: byteLimit })
	assert.equal(result.error, undefined)
	assert.equal(result.status, 0, result.stdout + result.stderr)
	return result.stdout
}
async function packed(archive?: string) {
	const root = mkdtempSync(join(tmpdir(), 'mw-product-pack-'))
	try {
		let file = archive
		if (!file) {
			const result = JSON.parse(localCommand('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', root], repository, root)) as { filename: string }[]
			assert.equal(result.length, 1); file = join(root, result[0]!.filename)
		}
		assert.ok(isAbsolute(file), '--archive is an explicit absolute local npm-pack archive')
		const entries = localCommand('tar', ['-tzf', file], root).trim().split('\n')
		assert.ok(entries.every(path => path.startsWith('package/') && !path.split('/').includes('..')), 'archive entries remain in extraction grant')
		assert.ok(!entries.some(path => /(^|\/)(node_modules|test|evals|reviews)(\/|$)/.test(path)), 'no development tests/evals/reviews payloads')
		localCommand('tar', ['-xzf', file, '--no-same-owner', '-C', root], root)
		const packageRoot = join(root, 'package'), runtime = join(packageRoot, 'dist/mcp.mjs')
		assert.ok(existsSync(runtime), 'actual product stdio bundle is shipped')
		assert.ok(existsSync(join(packageRoot, 'THIRD_PARTY_NOTICES.md')))
		const suffix = 'skills/brainstorm/SKILL.md', entrypoints = entries.filter(path => path.endsWith('/' + suffix))
		assert.equal(entrypoints.length, 1, 'one shipped ordinary Brainstorm seed; asset prefix is not a fixed private path')
		const prefix = entrypoints[0]!.slice(0, -suffix.length), seedRoot = join(root, prefix)
		assert.ok(!entries.filter(path => path.startsWith(prefix)).some(path => /\/(SKILL-REVIEW\.json|pack-design\.json|HANDOFF\.md|EFFORT-AND-ACCESS\.md)$/.test(path)), 'Brainstorm design/review/handoff docs are not runtime material')
		const inventory = object(JSON.parse(readFileSync(join(repository, 'brainstorm/PROVENANCE.json'), 'utf8')))
		assert.equal(array(inventory.skills).length, 20, 'complete approved runtime library, not just the default two bodies')
		assert.ok(entries.filter(path => path.endsWith('/PROVENANCE.json')).some(path => digest(readFileSync(join(root, path))) === digest(readFileSync(join(repository, 'brainstorm/PROVENANCE.json')))), 'unchanged source provenance is shipped')
		assert.ok(entries.filter(path => path.endsWith('/LICENSE.agent-core')).some(path => digest(readFileSync(join(root, path))) === digest(readFileSync(join(repository, 'brainstorm/LICENSE.agent-core')))), 'unchanged MIT notice is shipped')
		for (const value of array(inventory.files)) {
			const item = object(value), path = text(item.path)
			if (!/^skills\/[^/]+\/(SKILL\.md|references\/|assets\/)/.test(path)) continue
			const body = readFileSync(join(seedRoot, path))
			assert.equal(digest(body), item.sha256, `${path}: independently hashed packed bytes match upstream inventory`)
			assert.equal(body.length, item.bytes)
		}
		// Runtime dependencies may be external. Install only the archive’s declared production
		// dependencies from a disposable copy of a prewarmed cache, never source node_modules.
		// The executor may supply MW_MCP_NPM_CACHE; no network fallback is permitted.
		const cache = process.env.MW_MCP_NPM_CACHE ?? join(process.env.HOME ?? tmpdir(), '.npm')
		if (existsSync(join(cache, '_cacache'))) cpSync(join(cache, '_cacache'), join(root, '.npm-cache/_cacache'), { recursive: true })
		localCommand('npm', ['install', '--offline', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false'], packageRoot, root)
		const f = await productFixture({ entry: runtime })
		try { await conversation(f) } finally { await f.close() }
		await rawProtocol(runtime)
		for (const kind of startupAliasCases) await startupAliasRefusal(kind, runtime)
		const changed = seed('brainstorm') + '\nPACKED-ASSET-ONLY SENTINEL 916 — 雪\n'
		writeFileSync(join(seedRoot, suffix), changed)
		const changedRuntime = await productFixture({ entry: runtime })
		try {
			try { await changedRuntime.connect({ file: true }) } catch {
				const refused = await changedRuntime.disconnect()
				assert.ok(refused, 'runtime failure alone is not an asset-isolation control')
				failure({ isError: true, content: [{ type: 'text', text: JSON.stringify(refused) }] }, /seed|source|hash|digest|stale|content|upstream|changed/i)
				return { archiveSha256: digest(readFileSync(file)), methods: array(inventory.skills).length, packagedAssetIsolation: 'visible startup integrity refusal' }
			}
			await observesUpdatedSeed(changedRuntime, changed)
		} finally { await changedRuntime.close() }
		return { archiveSha256: digest(readFileSync(file)), methods: array(inventory.skills).length, packagedAssetIsolation: 'changed package bytes or explicit integrity refusal; no source-checkout fallback' }
	} finally { rmSync(root, { recursive: true, force: true }) }
}

async function main() {
	const args = process.argv.slice(2)
	assert.ok(args.length === 0 || args.length === 2 && args[0] === '--archive', 'usage: node test/tooling/product-mcp-smoke.ts [--archive ABSOLUTE_TGZ]')
	const f = await productFixture()
	let source: unknown
	try { source = await conversation(f) } finally { await f.close() }
	await rawProtocol(join(repository, 'src/mcp.ts'))
	for (const kind of startupAliasCases) await startupAliasRefusal(kind)
	const distribution = await packed(args[1])
	process.stdout.write(JSON.stringify({ ok: true, client: '@modelcontextprotocol/client@2.4.0', transport: 'stdio', source, distribution,
		limits: ['local deterministic continuity, not model-quality or native Skills acceptance', 'network tripwire covers configured OTLP/provider destinations, not a universal syscall/egress audit', 'no paid authorization, billing, publication or installation claim'] }) + '\n')
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch(error => { process.stdout.write(JSON.stringify({ ok: false, error: { message: error instanceof Error ? error.message : String(error), ...(error instanceof AggregateError ? { causes: error.errors.map(String) } : {}) } }) + '\n'); process.exitCode = 1 })
}
