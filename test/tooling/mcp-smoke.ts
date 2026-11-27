import assert from 'node:assert/strict'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { fileURLToPath } from 'node:url'
import { Client, DEFAULT_NEGOTIATED_PROTOCOL_VERSION } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { Effect } from 'effect'
import { defaultSettings } from '../../src/settings.ts'
import { regressionFixture, resultPack } from '../fixtures/prepared-output.ts'

// Exercise public transports and wire results, not the fixture's implementation or private SDK state.
type ObjectValue = Record<string, unknown>
const directory = dirname(fileURLToPath(import.meta.url))
const serverFile = join(directory, 'mcp-server.ts')
const repository = resolve(directory, '../..')
const inspectorFile = join(repository, 'node_modules/@modelcontextprotocol/inspector/clients/launcher/build/index.js')
const timeoutMs = 30000
const limit = 8 * 1024 * 1024
let stage = 'setup'

function object(value: unknown): ObjectValue {
	assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value))
	return value as ObjectValue
}
function array(value: unknown): unknown[] { assert.ok(Array.isArray(value)); return value }
function string(value: unknown): string { assert.equal(typeof value, 'string'); return value as string }
function jsonLines(text: string): ObjectValue[] {
	return text.split('\n').filter(line => line.trim()).map(line => object(JSON.parse(line)))
}
function files(root: string, prefix = ''): Record<string, string> {
	return Object.fromEntries(readdirSync(join(root, prefix)).sort().flatMap(name => {
		const path = prefix ? `${prefix}/${name}` : name
		return lstatSync(join(root, path)).isDirectory()
			? [[`${path}/`, ''], ...Object.entries(files(root, path))]
			: [[path, readFileSync(join(root, path)).toString('base64')]]
	}))
}
async function bounded<A>(promise: Promise<A>, label: string): Promise<A> {
	let timer: NodeJS.Timeout | undefined
	try {
		return await Promise.race([promise, new Promise<never>((_, reject) => {
			timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
		})])
	} finally { clearTimeout(timer) }
}

const children = new Map<ChildProcessWithoutNullStreams, Promise<unknown>>()
function signalGroup(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals) {
	if (!child.pid) return
	try { process.kill(-child.pid, signal) } catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
	}
}
function launch(args: string[], cwd: string, env: Record<string, string>) {
	const child = spawn(process.execPath, args, { cwd, env, stdio: 'pipe', detached: true })
	let stdout = '', stderr = '', failure: Error | undefined
	const timer = setTimeout(() => { failure = new Error('Child process timed out'); signalGroup(child, 'SIGKILL') }, timeoutMs)
	const collect = (destination: 'stdout' | 'stderr', text: string) => {
		if (destination === 'stdout') stdout += text
		else stderr += text
		if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > limit) {
			failure = new Error('Child output exceeded the smoke bound')
			signalGroup(child, 'SIGKILL')
		}
	}
	// Decoders preserve multibyte UTF-8 split across data events.
	child.stdout.setEncoding('utf8')
	child.stderr.setEncoding('utf8')
	child.stdout.on('data', (text: string) => collect('stdout', text))
	child.stderr.on('data', (text: string) => collect('stderr', text))
	child.stdin.on('error', error => { failure ??= error })
	const finished = new Promise<{ code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }>((fulfill, reject) => {
		child.on('error', error => { failure = error })
		child.once('close', (code, signal) => {
			clearTimeout(timer)
			try { signalGroup(child, 'SIGKILL') } catch (error) { failure ??= error as Error }
			children.delete(child)
			if (failure) reject(failure)
			else fulfill({ code, signal, stdout, stderr })
		})
	})
	// A request can fail before the caller reaches finished; keep that rejection observed.
	void finished.catch(() => {})
	children.set(child, finished)
	return { child, finished }
}

function toolList(value: unknown) {
	const tools = array(object(value).tools).map(object)
	assert.deepEqual(tools.map(tool => tool.name), ['inspect_composition'])
	const schema = object(tools[0]!.inputSchema)
	assert.equal(schema.type, 'object')
	assert.equal(object(object(schema.properties).component).type, 'string')
	assert.ok(!array(schema.required ?? []).includes('component'), 'component is optional')
	assert.equal(object(schema.properties).root, undefined, 'root is fixed at startup, not a tool argument')
}
function textContent(value: unknown): string {
	const first = object(array(object(value).content)[0])
	assert.equal(first.type, 'text')
	return string(first.text)
}
function inspection(value: unknown, component = '/') {
	const result = object(value)
	assert.notEqual(result.isError, true)
	const parsed = object(JSON.parse(textContent(result)))
	assert.deepEqual(result.structuredContent, parsed, 'text and structured content carry the same inspection')
	assert.equal(parsed.schemaVersion, 1)
	assert.equal(object(parsed.root).address, component)
	if (component === '/') {
		assert.equal(parsed.complete, true, 'all selected methods are available, not a claim of execution')
		assert.deepEqual(array(object(parsed.root).children).map(node => object(node).id), ['brainstorm', 'discovery', 'delivery', 'landing'])
		assert.deepEqual(parsed.diagnostics, [])
		const landing = object(array(object(parsed.root).children)[3])
		assert.equal(landing.address, '/landing', 'Landing is its own outer occurrence, not a fifth Delivery child')
		assert.equal(landing.input, 'madewell.result.v1'); assert.equal(landing.output, 'madewell.result.v1')
		const method = object(landing.method), pkg = object(method.package)
		assert.equal(method.kind, 'skill'); assert.equal(pkg.name, 'madewell-landing')
		const origin = join(repository, 'skills/method-library/madewell-landing')
		assert.equal(pkg.origin, origin)
		assert.equal(pkg.instructions, readFileSync(join(origin, 'SKILL.md'), 'utf8'), 'canonical ordinary Landing instructions, not a placeholder or legacy builtin')
	} else {
		assert.equal(parsed.complete, true)
		assert.deepEqual(parsed.diagnostics, [])
		assert.deepEqual(array(object(parsed.root).children).map(node => object(node).id), ['ideation', 'planning', 'implementation', 'verification'])
	}
	return parsed
}
function resolverFailure(value: unknown) {
	assert.equal(object(value).isError, true)
	const error = object(JSON.parse(textContent(value)))
	assert.equal(error.error, 'portable_invalid', 'Made Well serializes its code as error, not code')
	assert.ok(string(error.message).length > 0)
	assert.ok(Object.keys(object(error.context)).length > 0)
	assert.ok(array(error.next).length > 0)
	for (const next of array(error.next)) { assert.ok(string(object(next).run)); assert.ok(string(object(next).why)) }
}
async function sdkFailure(call: () => Promise<unknown>, pattern: RegExp) {
	let returned: unknown
	try { returned = await bounded(call(), 'SDK negative control') } catch (error) {
		assert.ok(error instanceof Error)
		assert.match(error.message, pattern, 'SDK protocol failure must explain the rejected input/tool')
		return
	}
	// McpServer 2.4 converts input-schema validation into isError tool results; unknown tools
	// can throw protocol errors instead. Neither is a Made Well resolver error envelope.
	assert.equal(object(returned).isError, true)
	assert.match(textContent(returned), pattern)
}
function attribute(attributes: unknown, key: RegExp, value: string): boolean {
	return Object.entries(object(attributes)).some(([name, actual]) => key.test(name) && actual === value)
}
function telemetry(text: string, unknownRequestId: unknown) {
	assert.ok(typeof unknownRequestId === 'string' || typeof unknownRequestId === 'number', 'capture the actual unknown-tool request ID, never assume SDK numbering')
	const records = jsonLines(text)
	assert.ok(records.length > 0, 'local telemetry is emitted even under hostile OTEL_* settings')
	assert.ok(records.every(record => record.kind === 'span' || record.kind === 'metrics'), 'telemetry channel contains JSONL records only')
	const spans = records.filter(record => record.kind === 'span')
	for (const span of spans) {
		assert.ok(string(span.name))
		const scope = object(span.scope)
		assert.equal(scope.name, 'madewell.local-mcp-fixture', 'explicit fixture request instrumentation, not automatic SDK telemetry')
		assert.equal(scope.version, '0.0.0')
		assert.match(string(span.traceId), /^(?!0{32}$)[a-f\d]{32}$/i)
		assert.match(string(span.spanId), /^(?!0{16}$)[a-f\d]{16}$/i)
		assert.equal(typeof object(span.status).code, 'number')
	}
	assert.ok(spans.some(span => attribute(span.attributes, /method/, 'tools/list') && object(span.status).code !== 2), 'actual successful tools/list request is instrumented')
	const calls = spans.filter(span => attribute(span.attributes, /method/, 'tools/call'))
	assert.ok(calls.some(span => attribute(span.attributes, /tool|name/, 'inspect_composition') && object(span.status).code !== 2), 'actual successful inspection call identifies the MCP method and tool')
	assert.ok(calls.some(span => attribute(span.attributes, /tool|name/, 'inspect_composition') && object(span.status).code === 2), 'failed inspection has exact OTel ERROR status, not synthetic success')
	const unknown = calls.filter(span => object(span.attributes)['jsonrpc.request.id'] === unknownRequestId)
	assert.equal(unknown.length, 1, 'exactly one tools/call span correlates to the controlled unknown-tool request')
	assert.equal(object(unknown[0]!.status).code, 2, 'unknown-tool response has exact OTel ERROR status')
	assert.equal(object(unknown[0]!.attributes)['error.type'], '-32602')
	assert.equal(Object.hasOwn(object(unknown[0]!.attributes), 'gen_ai.tool.name'), false, 'unknown tools have no recognized-tool name label')
	assert.ok(spans.every(span => !attribute(span.attributes, /tool|name/, 'not_a_tool')), 'arbitrary unknown-tool names do not become span labels')
	const metrics = records.filter(record => record.kind === 'metrics').flatMap(record => array(record.scopeMetrics)).flatMap(value => {
		const scope = object(value)
		assert.equal(object(scope.scope).name, 'madewell.local-mcp-fixture')
		assert.equal(object(scope.scope).version, '0.0.0')
		return array(scope.metrics).map(object)
	})
	assert.ok(metrics.every(metric => array(metric.dataPoints).every(value => !attribute(object(value).attributes, /tool|name/, 'not_a_tool'))), 'arbitrary unknown-tool names do not become metric labels')
	const durations = metrics.filter(metric => /duration/.test(string(object(metric.descriptor).name)))
	assert.ok(durations.some(metric => array(metric.dataPoints).some(value => {
		const point = object(value)
		if (!attribute(point.attributes, /method/, 'tools/call') || !attribute(point.attributes, /tool|name/, 'inspect_composition')) return false
		if (typeof point.value === 'number') return Number.isFinite(point.value) && point.value >= 0
		const histogram = object(point.value)
		return typeof histogram.count === 'number' && histogram.count > 0 && typeof histogram.sum === 'number' && histogram.sum >= 0
	})), 'duration metric has observed samples and MCP method/tool dimensions')
	return { spans: spans.length, durationMetrics: durations.length }
}

async function main() {
	const root = mkdtempSync(join(tmpdir(), 'mw-mcp-smoke-'))
	const project = join(root, 'project'), caller = join(root, 'caller')
	mkdirSync(project); mkdirSync(caller)
	const fixture = regressionFixture()
	const connections: string[] = []
	const tripwire = createServer(socket => { connections.push('unexpected exporter/provider connection'); socket.destroy() })
	let transport: StdioClientTransport | undefined
	try {
		await bounded(new Promise<void>((fulfill, reject) => { tripwire.once('error', reject); tripwire.listen(0, '127.0.0.1', fulfill) }), 'network tripwire setup')
		const address = tripwire.address()
		assert.ok(address && typeof address !== 'string')
		const endpoint = `http://127.0.0.1:${address.port}`
		await fixture.create()
		fixture.store.saveSettings({ ...defaultSettings(), deliveryPack: resultPack(), alert: { run: 'false', cwd: fixture.root } }, '2026-11-26T00:00:00.000Z')
		await Effect.runPromise(fixture.store.claimRunner())
		const state = () => structuredClone({ items: fixture.store.list(), settings: fixture.store.settings(), runner: fixture.store.runner(), events: fixture.store.allEvents() })
		const before = state(), storeFiles = files(fixture.root), projectFiles = files(project)
		assert.equal(before.runner?.pid, process.pid)
		const marker = join(project, 'unexpected-execution')
		const home = join(root, 'absent-mw-home'), absentStore = join(root, 'absent-store/record.db')
		const env: Record<string, string> = {
			PATH: process.env.PATH ?? '', HOME: caller, TMPDIR: root,
			MW_HOME: home, MW_STORE: fixture.path, MW_AUTORUN: '1', MW_DEBUG: '0',
			MW_PRESCRIPTIONS: join(root, 'missing-prescriptions.json'),
			MW_WORKER_COMMAND: `${JSON.stringify(process.execPath)} -e ${JSON.stringify(`require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed')`)}`,
			OPENAI_BASE_URL: endpoint, ANTHROPIC_BASE_URL: endpoint,
			OPENAI_API_KEY: 'inert-fixture-only', ANTHROPIC_API_KEY: 'inert-fixture-only',
			OTEL_TRACES_EXPORTER: 'otlp', OTEL_METRICS_EXPORTER: 'otlp', OTEL_LOGS_EXPORTER: 'otlp',
			OTEL_EXPORTER_OTLP_ENDPOINT: endpoint, OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: `${endpoint}/v1/traces`,
			OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: `${endpoint}/v1/metrics`, OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: `${endpoint}/v1/logs`,
			OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf', OTEL_METRIC_EXPORT_INTERVAL: '1',
			OTEL_SDK_DISABLED: 'true', OTEL_TRACES_SAMPLER: 'always_off',
		}
		stage = 'SDK stdio client, default stderr telemetry'
		transport = new StdioClientTransport({ command: process.execPath, args: [serverFile, '--root', project], cwd: caller, env, stderr: 'pipe' })
		let sdkUnknownRequestId: unknown
		const send = transport.send.bind(transport)
		// Observe and forward the public wire message unchanged; no private SDK counters.
		transport.send = message => {
			const wire = object(message)
			if (wire.method === 'tools/call' && object(wire.params).name === 'not_a_tool') sdkUnknownRequestId = wire.id
			return send(message)
		}
		let sdkStderr = ''
		let sdkOverflow = false
		const decoder = new StringDecoder('utf8')
		transport.stderr!.on('data', (bytes: Buffer) => {
			if (sdkOverflow) return
			sdkStderr += decoder.write(bytes)
			if (Buffer.byteLength(sdkStderr) > limit) {
				sdkOverflow = true
				void transport?.close().catch(() => {})
			}
		})
		const client = new Client({ name: 'madewell-independent-smoke', version: '1.0.0' })
		await bounded(client.connect(transport), 'SDK connect')
		toolList(await bounded(client.listTools(), 'SDK list'))
		inspection(await bounded(client.callTool({ name: 'inspect_composition', arguments: {} }), 'SDK default inspection'))
		inspection(await bounded(client.callTool({ name: 'inspect_composition', arguments: { component: '/delivery' } }), 'SDK subtree inspection'), '/delivery')
		resolverFailure(await bounded(client.callTool({ name: 'inspect_composition', arguments: { component: '/not-a-component' } }), 'SDK resolver negative control'))
		await sdkFailure(() => client.callTool({ name: 'inspect_composition', arguments: { component: 7 } }), /valid|argument|string|schema/i)
		await sdkFailure(() => client.callTool({ name: 'not_a_tool', arguments: {} }), /not.found|unknown|not_a_tool/i)
		await bounded(client.close(), 'SDK clean close')
		transport = undefined
		sdkStderr += decoder.end()
		assert.equal(sdkOverflow, false, 'SDK stderr stays within the smoke output bound')
		const stderrTelemetry = telemetry(sdkStderr, sdkUnknownRequestId)

		stage = 'raw JSON-RPC stdout, file telemetry, EOF flush'
		const telemetryFile = join(root, 'raw-telemetry.jsonl')
		const poison = join(root, 'poison.db')
		writeFileSync(poison, 'This is not an SQLite Store.\n')
		const raw = launch([serverFile, '--root', project, '--telemetry-file', telemetryFile], caller, { ...env, MW_STORE: poison })
		let pendingText = '', nextId = 0
		const pending = new Map<number, { fulfill: (value: ObjectValue) => void; reject: (error: Error) => void }>()
		raw.child.stdout.on('data', (chunk: string) => {
			pendingText += chunk
			let newline: number
			while ((newline = pendingText.indexOf('\n')) !== -1) {
				const line = pendingText.slice(0, newline); pendingText = pendingText.slice(newline + 1)
				try {
					const message = object(JSON.parse(line))
					assert.equal(message.jsonrpc, '2.0', 'raw stdout is protocol-only')
					assert.equal(message.kind, undefined, 'telemetry never enters stdout')
					if (typeof message.id === 'number' && pending.has(message.id)) {
						pending.get(message.id)!.fulfill(message); pending.delete(message.id)
					}
				} catch (error) {
					for (const request of pending.values()) request.reject(error as Error)
					pending.clear(); signalGroup(raw.child, 'SIGKILL')
				}
			}
		})
		void raw.finished.catch(error => { for (const request of pending.values()) request.reject(error); pending.clear() })
		const request = (method: string, params?: ObjectValue) => bounded(new Promise<ObjectValue>((fulfill, reject) => {
			const id = ++nextId
			pending.set(id, { fulfill, reject })
			raw.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }) + '\n')
		}), `raw ${method}`)
		const initialized = await request('initialize', { protocolVersion: DEFAULT_NEGOTIATED_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'raw-independent-smoke', version: '1.0.0' } })
		assert.ok(string(object(initialized.result).protocolVersion))
		raw.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')
		toolList((await request('tools/list')).result)
		inspection((await request('tools/call', { name: 'inspect_composition', arguments: {} })).result)
		inspection((await request('tools/call', { name: 'inspect_composition', arguments: { component: '/delivery' } })).result, '/delivery')
		resolverFailure((await request('tools/call', { name: 'inspect_composition', arguments: { component: '/missing' } })).result)
		let rawUnknownRequestId: unknown
		for (const [params, pattern] of [
			[{ name: 'inspect_composition', arguments: { component: false } }, /valid|argument|string|schema/i],
			[{ name: 'not_a_tool', arguments: {} }, /not.found|unknown|not_a_tool/i],
		] as const) {
			const response = await request('tools/call', params)
			if (params.name === 'not_a_tool') {
				rawUnknownRequestId = response.id
				assert.equal(object(response.error).code, -32602, 'unknown tool is a correlated JSON-RPC invalid-params failure')
			}
			if (response.error !== undefined) {
				assert.equal(typeof object(response.error).code, 'number')
				assert.match(string(object(response.error).message), pattern)
			} else {
				assert.equal(object(response.result).isError, true)
				assert.match(textContent(response.result), pattern)
			}
		}
		raw.child.stdin.end()
		const rawOutput = await bounded(raw.finished, 'raw EOF shutdown')
		assert.equal(rawOutput.code, 0, rawOutput.stderr)
		assert.equal(rawOutput.stderr, '', 'explicit telemetry file leaves normal stderr empty')
		assert.equal(pendingText, '', 'stdout has no partial or trailing nonprotocol output')
		for (const message of jsonLines(rawOutput.stdout)) { assert.equal(message.jsonrpc, '2.0'); assert.equal(message.kind, undefined) }
		const fileTelemetry = telemetry(readFileSync(telemetryFile, 'utf8'), rawUnknownRequestId)
		assert.equal(readFileSync(poison, 'utf8'), 'This is not an SQLite Store.\n')

		stage = 'Inspector CLI envelopes and exit codes'
		let inspectorRuns = 0
		const inspector = async (args: string[]) => {
			const file = join(root, `inspector-${++inspectorRuns}.jsonl`)
			const run = launch([inspectorFile, '--cli', process.execPath, serverFile, '--root', project, '--telemetry-file', file, '--format', 'json', ...args], caller, { ...env, MW_STORE: absentStore })
			return bounded(run.finished, 'Inspector CLI')
		}
		const listed = await inspector(['--method', 'tools/list'])
		assert.equal(listed.code, 0, listed.stderr)
		assert.equal(listed.stderr, '')
		toolList(object(JSON.parse(listed.stdout)).result)
		const called = await inspector(['--method', 'tools/call', '--tool-name', 'inspect_composition', '--tool-arg', 'component=/delivery'])
		assert.equal(called.code, 0, called.stderr)
		assert.equal(called.stderr, '')
		inspection(object(JSON.parse(called.stdout)).result, '/delivery')
		const refused = await inspector(['--method', 'tools/call', '--tool-name', 'inspect_composition', '--tool-arg', 'component=/missing'])
		assert.equal(refused.code, 5, refused.stderr)
		resolverFailure(object(JSON.parse(refused.stdout)).result)
		const inspectorError = object(object(JSON.parse(refused.stderr)).error)
		assert.equal(inspectorError.code, 'tool_is_error')
		assert.ok(string(inspectorError.message))
		const unknown = await inspector(['--method', 'tools/call', '--tool-name', 'not_a_tool'])
		assert.equal(unknown.code, 5, unknown.stderr)
		assert.equal(unknown.stdout, '')
		const missingTool = object(object(JSON.parse(unknown.stderr)).error)
		assert.equal(missingTool.code, 'tool_not_found')
		assert.ok(string(missingTool.message))

		stage = 'no-effects snapshots'
		assert.deepEqual(state(), before, 'Store work/settings/runner/events remain unchanged')
		assert.deepEqual(files(fixture.root), storeFiles, 'including Store sidecar bytes')
		assert.deepEqual(files(project), projectFiles, 'inspection does not write to the granted root')
		assert.equal(fixture.requests.length, 0)
		assert.equal(existsSync(home), false)
		assert.equal(existsSync(dirname(absentStore)), false)
		assert.equal(existsSync(marker), false)
		assert.deepEqual(connections, [], 'hostile OTLP/provider targets received zero connections')
		return { ok: true, sdk: '2.4.0', inspector: '2.16.0', stderrTelemetry, fileTelemetry, inspectorRuns,
			networkEvidence: 'Zero TCP connections to controlled exporter/provider endpoints; clean child environments contain no real credentials. Not a general syscall audit.',
		}
	} finally {
		const cleanupErrors: unknown[] = []
		try { if (transport) await bounded(transport.close(), 'SDK cleanup') } catch (error) { cleanupErrors.push(error) }
		const exits = [...children.values()]
		for (const child of children.keys()) {
			try { signalGroup(child, 'SIGKILL') } catch (error) { cleanupErrors.push(error) }
		}
		try { await bounded(Promise.allSettled(exits), 'child process cleanup') } catch (error) { cleanupErrors.push(error) }
		try { await bounded(new Promise<void>(fulfill => tripwire.close(() => fulfill())), 'network tripwire cleanup') } catch (error) { cleanupErrors.push(error) }
		try { fixture.close() } catch (error) { cleanupErrors.push(error) }
		try { rmSync(root, { recursive: true, force: true }) } catch (error) { cleanupErrors.push(error) }
		if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Smoke cleanup failed')
	}
}

try { process.stdout.write(JSON.stringify(await main()) + '\n') } catch (error) {
	process.stdout.write(JSON.stringify({ ok: false, stage, error: { message: error instanceof Error ? error.message : String(error) } }) + '\n')
	process.exitCode = 1
}
