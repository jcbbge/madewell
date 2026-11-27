// Explicit local exporters only; never inherit network or console exporters.
import { closeSync, constants, fstatSync, lstatSync, openSync, realpathSync, statSync, writeSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { context, metrics, trace, ROOT_CONTEXT, SpanKind, SpanStatusCode, type Attributes, type Span } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { PeriodicExportingMetricReader, type PushMetricExporter } from '@opentelemetry/sdk-metrics'
import { AlwaysOnSampler, SimpleSpanProcessor, type SpanExporter } from '@opentelemetry/sdk-trace'
import type { Transport } from '@modelcontextprotocol/server'
import { Effect } from 'effect'
import { MadeWellError } from './errors.ts'

const recovery = [{ run: 'node src/mcp.ts --root <ABSOLUTE_ROOT> --store <SELECTED_STORE> --telemetry-file <SEPARATE_LOCAL_JSONL>',
	why: 'Correct the explicit paths before restarting (or use dist/mcp.mjs for the bundle). Keep telemetry separate from the Store and SQLite sidecars, including symlink/hardlink aliases, with an existing writable telemetry parent. Preserve the original Store and pending requestId/body; do not automatically resubmit mutations.',
}]
const failure = (cause: unknown) => cause instanceof MadeWellError ? cause : new MadeWellError({ code: 'mcp_failed', message: 'Local MCP telemetry failed.', context: { reason: String(cause) }, next: recovery })

const missing = (cause: unknown) => typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 'ENOENT'
type FileIdentity = { readonly dev: bigint; readonly ino: bigint }
const sameFile = (left: FileIdentity, right: FileIdentity) => left.dev === right.dev && left.ino === right.ino

/** Resolve existing aliases without creating missing directories or destination files. */
function canonicalDestination(path: string): string {
	let existing = resolve(path)
	const remaining: string[] = []
	let appearanceRetries = 0
	for (;;) {
		try { return resolve(realpathSync(existing), ...remaining) }
		catch (cause) {
			if (!missing(cause)) throw cause
			let present = false, symlink = false
			try { const entry = lstatSync(existing); present = true; symlink = entry.isSymbolicLink() }
			catch (error) { if (!missing(error)) throw error }
			// An unresolved symlink remains unsafe. A regular SQLite sidecar may
			// instead have appeared after ENOENT: resolve it again, never skip it.
			if (symlink) throw failure(`Cannot resolve the selected destination alias: ${existing}`)
			if (present) {
				if (appearanceRetries++ < 3) continue
				throw failure(`The selected destination did not stabilize during resolution: ${existing}`)
			}
			const parent = dirname(existing)
			if (parent === existing) throw cause
			remaining.unshift(basename(existing))
			existing = parent
		}
	}
}
function identityAt(path: string): FileIdentity | undefined {
	try { return statSync(path, { bigint: true }) }
	catch (cause) { if (missing(cause)) return undefined; throw cause }
}

/** Includes SQLite sidecars at both the selected spelling and resolved DB location. */
export function assertTelemetryStoreSeparation(storePath: string, file?: string, fd?: number) {
	const storeCanonical = canonicalDestination(storePath)
	const telemetryCanonical = file === undefined ? undefined : canonicalDestination(file)
	const telemetryIdentity = fd === undefined ? file === undefined ? undefined : identityAt(file) : fstatSync(fd, { bigint: true })
	const targets = new Set([storePath, storeCanonical].flatMap(path => ['', '-wal', '-shm', '-journal'].map(suffix => path + suffix)))
	for (const target of targets) {
		const targetCanonical = canonicalDestination(target), targetIdentity = identityAt(target)
		if (telemetryCanonical === targetCanonical || (telemetryIdentity && targetIdentity && sameFile(telemetryIdentity, targetIdentity))) {
			throw new MadeWellError({ code: 'mcp_failed', message: 'Telemetry must not share the selected Store or a SQLite sidecar destination.',
				context: { reason: 'telemetry_store_collision', store: storePath, telemetryFile: file ?? 'stderr', conflictingDestination: target }, next: recovery })
		}
	}
	return { storeCanonical, telemetryCanonical }
}

async function openTelemetry(storePath: string, file: string | undefined, now: () => number) {
	// Check before O_CREAT, then bind the opened descriptor to the same selection.
	const selected = assertTelemetryStoreSeparation(storePath, file)
	const fd = file === undefined ? 2 : openSync(file, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600)
	let sdk: NodeSDK | undefined
	try {
		if (file !== undefined && !fstatSync(fd).isFile()) throw failure('The telemetry destination must be a regular file.')
		const assertStoreSeparation = () => {
			const current = assertTelemetryStoreSeparation(storePath, file, fd)
			const pathIdentity = file === undefined ? undefined : identityAt(file)
			if (current.storeCanonical !== selected.storeCanonical || current.telemetryCanonical !== selected.telemetryCanonical ||
				(file !== undefined && (!pathIdentity || !sameFile(pathIdentity, fstatSync(fd, { bigint: true }))))) {
				throw new MadeWellError({ code: 'mcp_failed', message: 'A selected Store or telemetry destination changed; no further telemetry or writable Store acquisition is allowed.',
					context: { reason: 'destination_changed', store: storePath, telemetryFile: file ?? 'stderr' }, next: recovery })
			}
		}
		assertStoreSeparation()
		const emit = (record: unknown) => { assertStoreSeparation(); writeSync(fd, JSON.stringify(record) + '\n') }
		const spans: SpanExporter = {
			export(batch, done) {
				try {
					for (const span of batch) emit({ kind: 'span', name: span.name, scope: span.instrumentationScope,
						...span.spanContext(), parentSpanId: span.parentSpanContext?.spanId, attributes: span.attributes, status: span.status, duration: span.duration })
					done({ code: 0 })
				} catch (cause) { done({ code: 1, error: cause instanceof Error ? cause : undefined }) }
			},
			async shutdown() {},
		}
		const exporter: PushMetricExporter = {
			export(batch, done) {
				try { emit({ kind: 'metrics', scopeMetrics: batch.scopeMetrics }); done({ code: 0 }) }
				catch (cause) { done({ code: 1, error: cause instanceof Error ? cause : undefined }) }
			},
			async forceFlush() {}, async shutdown() {},
		}
		const reader = new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 1_000 })
		sdk = new NodeSDK({ serviceName: 'madewell-mcp', autoDetectResources: false,
			spanProcessors: [new SimpleSpanProcessor({ exporter: spans })], metricReaders: [reader],
			logRecordProcessors: [], textMapPropagator: null, sampler: new AlwaysOnSampler(),
		})
		sdk.start()
		const tracer = trace.getTracer('madewell.mcp', '1')
		const duration = metrics.getMeter('madewell.mcp', '1').createHistogram('mcp.server.operation.duration', { unit: 's' })
		const pending = new Map<string | number, { span: Span; start: number; dimensions: Attributes }>()
		let closing = false
		const finish = (id: string | number, error?: string) => {
			const request = pending.get(id)
			if (!request) return
			pending.delete(id)
			if (error) {
				request.dimensions['error.type'] = error
				request.span.setAttribute('error.type', error).setStatus({ code: SpanStatusCode.ERROR })
			}
			duration.record(Math.max(0, now() - request.start) / 1_000, request.dimensions)
			request.span.end()
		}
		return {
			assertStoreSeparation,
			instrument(transport: Transport) {
				const start = transport.start.bind(transport)
				transport.start = async () => {
					const receive = transport.onmessage
					transport.onmessage = (message, extra) => {
						if (!('method' in message) || !('id' in message)) { receive?.(message, extra); return }
						// Bounded names only. Never collect source, artifacts, paths or actor labels.
						const method = ['initialize', 'server/discover', 'ping', 'tools/list', 'tools/call', 'resources/list', 'resources/templates/list', 'resources/read', 'skills/list', 'skills/get'].includes(message.method) ? message.method : 'other'
						const requestedTool = message.method === 'tools/call' ? message.params?.name : undefined
						const tool = typeof requestedTool === 'string' && ['catalog_brainstorm', 'capture_brainstorm', 'inspect_brainstorm', 'prepare_brainstorm', 'record_brainstorm', 'capture_work', 'inspect_work', 'prepare_work', 'record_work', 'preview_work', 'promote_work', 'replace_work', 'inspect_composition', 'exchange_work'].includes(requestedTool) ? requestedTool : undefined
						const dimensions: Attributes = { 'mcp.method.name': method, ...(tool ? { 'gen_ai.tool.name': tool } : {}) }
						// Only valid W3C version-00 trace identity crosses this boundary.
						// Never extract baggage, tracestate or arbitrary private metadata.
						const parent = message.params?._meta?.traceparent
						const matched = typeof parent === 'string' ? /^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/.exec(parent) : null
						const parentContext = matched && !/^0+$/.test(matched[1]!) && !/^0+$/.test(matched[2]!)
							? trace.setSpanContext(ROOT_CONTEXT, { traceId: matched[1]!, spanId: matched[2]!, traceFlags: Number.parseInt(matched[3]!, 16) & 1, isRemote: true })
							: ROOT_CONTEXT
						const span = tracer.startSpan(method + (tool ? ` ${tool}` : ''), { kind: SpanKind.SERVER, attributes: { ...dimensions, 'jsonrpc.request.id': message.id } }, parentContext)
						if (pending.has(message.id)) finish(message.id, 'duplicate_protocol_id')
						pending.set(message.id, { span, start: now(), dimensions })
						context.with(trace.setSpan(context.active(), span), () => receive?.(message, extra))
					}
					await start()
				}
				const send = transport.send.bind(transport)
				transport.send = async (message, options) => {
					try { await send(message, options) }
					catch (cause) {
						if ('id' in message && message.id !== null && message.id !== undefined) finish(message.id, 'send_failed')
						throw cause
					}
					if (!('method' in message) && 'id' in message && message.id !== null && message.id !== undefined) {
						finish(message.id, 'error' in message ? 'protocol_error' : message.result.isError === true ? 'tool_error' : undefined)
						if (!closing) await reader.forceFlush()
					}
				}
			},
			async close() {
				closing = true
				for (const id of pending.keys()) finish(id, 'connection_closed')
				try { await sdk!.shutdown() } finally { if (file !== undefined) closeSync(fd) }
			},
		}
	} catch (cause) {
		// A failed acquire must release both the SDK and the descriptor it opened.
		try { await sdk?.shutdown() } finally { if (file !== undefined) closeSync(fd) }
		throw cause
	}
}

export const localMcpTelemetry = (storePath: string, file?: string) => Effect.gen(function*() {
	// Scope the environment override as well as the SDK. Store's legacy full trace
	// sink is disabled here without changing legacy Store defaults for other callers.
	yield* Effect.acquireRelease(Effect.sync(() => {
		const saved = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('OTEL_') || key === 'MW_TELEMETRY'))
		for (const key of Object.keys(saved)) delete process.env[key]
		return saved
	}), saved => Effect.sync(() => {
		for (const key of Object.keys(process.env)) if (key.startsWith('OTEL_') || key === 'MW_TELEMETRY') delete process.env[key]
		Object.assign(process.env, saved)
	}))
	return yield* Effect.acquireRelease(
		Effect.clockWith(clock => Effect.tryPromise({ try: () => openTelemetry(storePath, file, () => clock.currentTimeMillisUnsafe()), catch: failure })),
		telemetry => Effect.tryPromise({ try: () => telemetry.close(), catch: failure }).pipe(Effect.catch(error => Effect.sync(() => {
			process.stderr.write(JSON.stringify({ error: error.code, message: error.message, context: error.context, next: error.next }) + '\n')
			process.exitCode = 1
		}))),
	)
})
