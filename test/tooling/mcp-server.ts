// Development fixture only: no product MCP entrypoint, Store, Worker, or network listener.
import { closeSync, openSync, writeSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { parseArgs } from 'node:util'
import { context, metrics as telemetryMetrics, trace, SpanKind, SpanStatusCode, type Attributes, type Span } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { PeriodicExportingMetricReader, type PushMetricExporter } from '@opentelemetry/sdk-metrics'
import { AlwaysOnSampler, SimpleSpanProcessor, type SpanExporter } from '@opentelemetry/sdk-trace'
import { Effect } from 'effect'
import { z } from 'zod'
import { inspectComposition } from '../../src/composition.ts'
import { MadeWellError, errorJson } from '../../src/errors.ts'

const next = [{ run: 'npm run smoke:mcp', why: 'exercise the local development fixture with disposable material' }]
const diagnostic = (cause: unknown) => cause instanceof MadeWellError ? errorJson(cause) : errorJson(new MadeWellError({
	code: 'portable_invalid', message: 'Local MCP fixture failed.', context: { reason: String(cause) }, next,
}))

let shutdown: (() => Promise<void>) | undefined
try {
	const { values } = parseArgs({ options: { root: { type: 'string' }, 'telemetry-file': { type: 'string' } } })
	const root = values.root
	const file = values['telemetry-file']
	if (!root || !isAbsolute(root) || (file !== undefined && !isAbsolute(file))) throw new MadeWellError({
		code: 'portable_invalid', message: 'Supply --root and any --telemetry-file as absolute paths.', context: { root, file }, next,
	})
	// This fixture is deliberately local. Ignore env-driven exporters, resource detectors,
	// sampling and diagnostics rather than letting an inherited OTEL_* value enable I/O.
	for (const key of Object.keys(process.env)) if (key.startsWith('OTEL_')) delete process.env[key]
	const fd = file === undefined ? 2 : openSync(file, 'a', 0o600)
	const emit = (record: unknown) => { writeSync(fd, JSON.stringify(record) + '\n') }
	const spans: SpanExporter = {
		export(batch, done) {
			try {
				for (const span of batch) emit({ kind: 'span', name: span.name, scope: span.instrumentationScope,
					...span.spanContext(), attributes: span.attributes, status: span.status, duration: span.duration })
				done({ code: 0 })
			} catch (cause) { done({ code: 1, error: cause instanceof Error ? cause : undefined }); process.exitCode = 1 }
		},
		async shutdown() {},
	}
	const metrics: PushMetricExporter = {
		export(batch, done) {
			try { emit({ kind: 'metrics', scopeMetrics: batch.scopeMetrics }); done({ code: 0 }) }
			catch (cause) { done({ code: 1, error: cause instanceof Error ? cause : undefined }); process.exitCode = 1 }
		},
		async forceFlush() {},
		async shutdown() {},
	}
	const reader = new PeriodicExportingMetricReader({ exporter: metrics, exportIntervalMillis: 1_000 })
	const sdk = new NodeSDK({
		serviceName: 'madewell-local-mcp-fixture', autoDetectResources: false,
		spanProcessors: [new SimpleSpanProcessor({ exporter: spans })], metricReaders: [reader],
		logRecordProcessors: [], textMapPropagator: null, sampler: new AlwaysOnSampler(),
	})
	sdk.start()
	let closing: Promise<void> | undefined
	const scope = 'madewell.local-mcp-fixture'
	const tracer = trace.getTracer(scope, '0.0.0')
	const duration = telemetryMetrics.getMeter(scope, '0.0.0').createHistogram('mcp.server.operation.duration', { unit: 's' })
	const pending = new Map<string | number, { span: Span; start: number; attributes: Attributes }>()
	const finish = (id: string | number, error?: string) => {
		const request = pending.get(id)
		if (!request) return
		pending.delete(id)
		if (error) {
			request.attributes['error.type'] = error
			request.span.setAttribute('error.type', error).setStatus({ code: SpanStatusCode.ERROR })
		}
		duration.record((performance.now() - request.start) / 1_000, request.attributes)
		request.span.end()
	}
	shutdown = () => closing ??= (async () => {
		for (const id of pending.keys()) finish(id, 'connection_closed')
		try { await sdk.shutdown() } finally { if (fd !== 2) closeSync(fd) }
	})()
	// Pinned MCP 2.4.0 does not implement the telemetry advertised by current docs.
	// Observe actual request/response dispatch through public transport callbacks.
	const { McpServer } = await import('@modelcontextprotocol/server')
	const { StdioServerTransport } = await import('@modelcontextprotocol/server/stdio')
	const server = new McpServer({ name: 'madewell-local-inspection-fixture', version: '0.0.0' })
	server.registerTool('inspect_composition', {
		description: 'Inspect the portable composition within the explicit startup root. Does not execute methods or open storage.',
		inputSchema: z.object({ component: z.string().optional() }).strict(),
		annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
	}, async ({ component }) => {
		return await Effect.runPromise(inspectComposition({ root, component }).pipe(Effect.match({
			onSuccess: value => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: { ...value } }),
			onFailure: error => ({ isError: true, content: [{ type: 'text' as const, text: JSON.stringify(errorJson(error)) }] }),
		})))
	})
	const transport = new StdioServerTransport()
	const start = transport.start.bind(transport)
	transport.start = async () => {
		const receive = transport.onmessage
		transport.onmessage = message => {
			if (!('method' in message) || !('id' in message)) { receive?.(message); return }
			const attributes: Attributes = { 'mcp.method.name': message.method, 'jsonrpc.request.id': message.id }
			const tool = message.method === 'tools/call' && message.params?.name === 'inspect_composition' ? 'inspect_composition' : undefined
			if (tool) attributes['gen_ai.tool.name'] = tool
			const span = tracer.startSpan(message.method + (tool ? ` ${tool}` : ''), { kind: SpanKind.SERVER, attributes })
			// Request IDs identify spans, but never become high-cardinality metric labels.
			const { 'jsonrpc.request.id': _id, ...dimensions } = attributes
			pending.set(message.id, { span, start: performance.now(), attributes: dimensions })
			context.with(trace.setSpan(context.active(), span), () => receive?.(message))
		}
		await start()
	}
	const send = transport.send.bind(transport)
	transport.send = async message => {
		try { await send(message) }
		catch (cause) { if ('id' in message && message.id !== null && message.id !== undefined) finish(message.id, 'send_failed'); throw cause }
		if (!('method' in message) && 'id' in message && message.id !== null && message.id !== undefined) {
			finish(message.id, 'error' in message ? String(message.error.code) : message.result.isError === true ? 'tool_error' : undefined)
			if (!closing) await reader.forceFlush()
		}
	}
	server.server.onclose = () => { void shutdown!().catch(cause => {
		process.stderr.write(JSON.stringify(diagnostic(cause)) + '\n'); process.exitCode = 1
	}) }
	for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
		void server.close().then(() => shutdown!()).catch(cause => {
			process.stderr.write(JSON.stringify(diagnostic(cause)) + '\n'); process.exitCode = 1
		})
	})
	await server.connect(transport)
} catch (cause) {
	process.stderr.write(JSON.stringify(diagnostic(cause)) + '\n')
	process.exitCode = 1
	await shutdown?.()
}
