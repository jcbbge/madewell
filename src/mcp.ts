#!/usr/bin/env node
// Product stdio boundary: official SDK hosting; Effect owns services and scopes.
import { realpathSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { Cause, Effect, Layer } from 'effect'
import { z } from 'zod'
import { McpServer, ResourceTemplate, ResourceNotFoundError } from '@modelcontextprotocol/server'
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import {
	Brainstorm, brainstormLayer, CatalogBrainstormInput, CaptureBrainstormInput,
	InspectBrainstormInput, PrepareBrainstormInput, RecordBrainstormInput,
	BrainstormActor, BrainstormResult, pinPackage,
} from './brainstorm.ts'
import {
	PortableWork, portableWorkLayer, CapturePortableInput, InspectPortableInput, PreparePortableInput,
	RecordPortableInput, ExchangePortableInput, PreviewPortableInput, PromotePortableInput, ReplacePortableInput,
	PortableResult,
} from './portable-work.ts'
import { Exchange } from './portable-exchange.ts'
import { MadeWellError, errorJson } from './errors.ts'
import { inspectComposition } from './composition.ts'
import { assertTelemetryStoreSeparation, localMcpTelemetry } from './mcp-telemetry.ts'
import { acquireBrainstormSkills } from './mcp-skills.ts'
import { openReadOnlyStore, openStore, Store } from './store.ts'
import { validateGrantedRoot } from './skill-package.ts'
import { currentManagedEffortAccess, ManagedEffortAccess, ResolvedEffort } from './managed-effort.ts'

export interface McpConfiguration { readonly root: string; readonly store: string; readonly telemetryFile?: string; readonly skills?: boolean }
const configurationRecovery = [{ run: 'node src/mcp.ts --root <ABSOLUTE_ROOT> --store <EXISTING_SELECTED_STORE>',
	why: 'Inspect and correct the explicit root/Store selection and filesystem access before reconnecting (or use dist/mcp.mjs for the bundle). For existing work select its original Store; a read never initializes a missing Store. Keep any telemetry destination separate. Preserve pending mutation requestId/body and inspect current work before deciding how to recover uncertain effects; do not automatically create work or retry with a new ID.',
}]
const failure = (cause: unknown): MadeWellError => cause instanceof MadeWellError ? cause : new MadeWellError({
	code: 'mcp_failed', message: 'The local Made Well MCP adapter failed.', context: { reason: String(cause) }, next: configurationRecovery,
})
const report = (error: MadeWellError) => {
	process.stderr.write(JSON.stringify(errorJson(error)) + '\n')
	process.exitCode = 1
}
const trySync = <A>(run: () => A) => Effect.try({ try: run, catch: failure })
const tryPromise = <A>(run: () => Promise<A>) => Effect.tryPromise({ try: run, catch: failure })

/** Lazy per-call acquisition: listing/reconnecting/catalog never create a Store. */
const requestStoreLayer = (path: string, readOnly: boolean, assertStoreSeparation: () => void) => Layer.effect(Store, Effect.acquireRelease(
	Effect.clockWith(clock => trySync(() => {
		if (readOnly) return openReadOnlyStore(path)
		assertStoreSeparation()
		return openStore(path, { now: () => clock.currentTimeMillisUnsafe() })
	})),
	store => trySync(() => store.close()).pipe(Effect.catch(error => Effect.sync(() => report(error)))),
))

// Type continuity identities and result data, while preserving open natural artifacts.
const ItemId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const Revision = z.string().regex(/^[a-f0-9]{64}$/)
const BrainstormCatalogOutput = z.object({
	schemaVersion: z.literal(1), root: z.string(), component: z.literal('/brainstorm'),
	defaultMethods: z.array(z.string()), defaultEffort: z.literal('light'),
	methods: z.array(z.object({ name: z.string(), default: z.boolean(), availability: z.literal('validated-on-selection') })),
	effort: z.object({ light: z.literal('free'), focused: z.literal('trusted-policy-required'), deep: z.literal('trusted-policy-required') }),
	accessPolicy: z.string(),
	configuration: z.string(), resource: z.literal('madewell://brainstorm/catalog'),
	capabilities: z.object({ materialRoot: z.string(), materialAccess: z.literal('captured-source-and-pinned-selected-packages-only'),
		managedEffort: z.array(z.string()), execution: z.literal(false), promotion: z.literal(false), workerLaunch: z.literal(false),
		network: z.literal(false), arbitraryFileRead: z.literal(false), providerInference: z.literal(false), nativeSkills: z.literal(false),
	}),
})
const ResourceOutput = z.object({ uri: z.string(), mimeType: z.string() }).passthrough()
const FileOutput = z.object({ path: z.string(), bytes: z.number().int().nonnegative(), sha256: Revision, content: z.string() }).passthrough()
const PriorInputOutput = z.object({ handoffId: z.string(), actor: BrainstormActor, context: z.string() })
const BrainstormPackageOutput = z.object({ name: z.string(), identity: Revision, origin: z.string(), instructions: z.string(),
	manifest: z.array(FileOutput.omit({ content: true })), files: z.array(FileOutput), frontmatter: z.record(z.string(), z.unknown()),
}).passthrough()
const BrainstormRecordedOutput = z.object({ id: z.string(), handoffId: z.string(), at: z.string(), actor: BrainstormActor,
	validation: z.literal('shape-accepted-not-independently-verified'), result: BrainstormResult,
})
const EffortAuthorizationOutput = z.object({ allowed: z.literal(true), provenance: z.string(), binding: z.object({
	root: z.string(), storeScope: z.string(), revision: Revision, occurrence: z.string(), methodIdentity: z.string(), sourceIdentity: z.string(), recipeDigest: Revision,
}) })
const BrainstormHandoffOutput = z.object({ id: z.string(), itemId: ItemId, at: z.string(), actor: BrainstormActor, component: z.literal('/brainstorm'),
	source: z.string(), context: z.string().nullable(), title: z.string(), objective: z.string(), methods: z.array(z.string()),
	packages: z.array(BrainstormPackageOutput), priorInputs: z.array(PriorInputOutput), priorResults: z.array(BrainstormRecordedOutput),
	requestedEffort: z.unknown(), effectiveEffort: z.string(), outputLength: z.string().nullable(),
	recipe: ResolvedEffort.optional(), effortAuthorization: EffortAuthorizationOutput.optional(),
}).passthrough()
const ComponentOutput = z.object({ address: z.string(), id: z.string(), identity: Revision, input: z.string(), output: z.string() }).passthrough()
const SkillSelectionOutput = z.object({ name: z.string(), identity: Revision, origin: z.string(), instructions: z.string(),
	frontmatter: z.record(z.string(), z.unknown()), manifest: z.array(FileOutput.omit({ content: true })), scope: z.literal('runtime').optional(),
})
const ResolvedComponentOutput = ComponentOutput.extend({
	purpose: z.string(), origin: z.string(),
	constraints: z.record(z.string(), z.object({ value: z.union([z.string(), z.number(), z.boolean()]), origins: z.array(z.string()) })),
	method: z.discriminatedUnion('kind', [
		z.object({ kind: z.literal('builtin'), origin: z.string(), identity: Revision, definition: z.record(z.string(), z.unknown()) }),
		z.object({ kind: z.literal('skill'), origin: z.string(), bindingOrigin: z.string(), identity: Revision, package: SkillSelectionOutput,
			companions: z.array(SkillSelectionOutput).optional(), args: z.record(z.string(), z.unknown()),
		}),
	]).optional(),
	get children(): z.ZodOptional<z.ZodArray<typeof ResolvedComponentOutput>> { return z.array(ResolvedComponentOutput).optional() },
	wiring: z.object({ inputs: z.record(z.string(), z.string()), output: z.string() }).optional(),
})
const CompositionInspectionOutput = z.object({ schemaVersion: z.literal(1), identity: Revision, complete: z.boolean(), root: ResolvedComponentOutput,
	effort: ResolvedEffort.shape.expansions,
	diagnostics: z.array(z.object({ code: z.literal('method_unavailable'), address: z.string(), message: z.string() })),
})
const PortablePackagesOutput = z.record(z.string(), z.array(FileOutput.extend({ encoding: z.enum(['utf8', 'base64']) })))
const PortableRecordedOutput = z.object({ id: z.string(), handoffId: z.string(), at: z.string(), actor: BrainstormActor, address: z.string(), output: z.string(),
	validation: z.literal('contract-accepted-not-independently-verified'), result: PortableResult,
})
const PortableHandoffOutput = z.object({ id: z.string(), at: z.string(), actor: BrainstormActor, node: ComponentOutput, source: z.string(), context: z.string().nullable(),
	priorInputs: z.array(PriorInputOutput), priorResults: z.array(PortableRecordedOutput), packages: PortablePackagesOutput,
	priorExchanges: z.array(Exchange).optional(),
	requestedEffort: z.unknown(), effectiveEffort: z.string(), outputLength: z.string().nullable(),
	recipe: ResolvedEffort.optional(), effortAuthorization: EffortAuthorizationOutput.optional(),
	contributionSchema: z.record(z.string(), z.unknown()).nullable(), framing: z.string(),
})
const SnapshotFields = { itemId: ItemId, revision: Revision, root: z.string(), source: z.string(), title: z.string(), objective: z.string(), status: z.string(),
	owner: z.string(), resources: z.array(ResourceOutput), executionAuthorized: z.literal(false) }
export const BrainstormSnapshotOutput = z.object({
	...SnapshotFields, promotionAuthorized: z.literal(false),
	brainstorm: z.object({ version: z.literal(1), root: z.string(), source: z.string(), title: z.string(), objective: z.string(), capturedBy: BrainstormActor,
		packages: z.array(BrainstormPackageOutput), handoffs: z.array(BrainstormHandoffOutput), results: z.array(BrainstormRecordedOutput),
	}),
}).passthrough()
export const PortableSnapshotOutput = z.object({
	...SnapshotFields, independentlyVerified: z.literal(false), activity: z.literal('not-running'), nextAction: z.string(),
	portable: z.object({ version: z.literal(1), root: z.string(),
		selection: z.object({ schemaVersion: z.literal(1), identity: Revision, complete: z.boolean(), root: ComponentOutput,
			effort: ResolvedEffort.shape.expansions,
			diagnostics: z.array(z.object({ code: z.literal('method_unavailable'), address: z.string(), message: z.string() })),
		}), packages: PortablePackagesOutput, handoffs: z.array(PortableHandoffOutput), results: z.array(PortableRecordedOutput), candidates: z.array(ItemId),
		exchanges: z.record(z.string(), Exchange).optional(),
	}),
}).passthrough()
const PromotionOutput = z.object({ selected: z.array(z.object({ itemId: ItemId, revision: Revision, title: z.string(),
	prerequisites: z.array(z.object({ itemId: ItemId, selected: z.boolean(), completed: z.boolean() })),
})), executionAuthorized: z.literal(false), implicitPrerequisites: z.literal(false) })

export const serveMcp = Effect.fn('mw.serveMcp')(function*(configuration: McpConfiguration) {
	const config = yield* trySync(() => {
		if (!isAbsolute(configuration.root) || !isAbsolute(configuration.store) || (configuration.telemetryFile !== undefined && !isAbsolute(configuration.telemetryFile))) {
			throw new MadeWellError({ code: 'mcp_failed', message: 'Supply explicit absolute --root, --store and optional --telemetry-file paths.', context: {}, next: configurationRecovery })
		}
		assertTelemetryStoreSeparation(configuration.store, configuration.telemetryFile)
		return { ...configuration, root: validateGrantedRoot(configuration.root) }
	})
	const telemetry = yield* localMcpTelemetry(config.store, config.telemetryFile)
	// Capture only Effect-provided host authority, never a CLI flag or client field.
	const policy = yield* currentManagedEffortAccess
	const skills = config.skills ? yield* acquireBrainstormSkills(pinPackage) : undefined
	const active = new Set<Promise<unknown>>()
	let accepting = true
	const run = <A, E>(effect: Effect.Effect<A, E>) => {
		const promise = Effect.runPromise(effect)
		active.add(promise)
		void promise.then(() => active.delete(promise), () => active.delete(promise))
		return promise
	}
	const service = Layer.merge(brainstormLayer({ root: config.root }), portableWorkLayer({ root: config.root }))
	const execute = <A, E>(effect: Effect.Effect<A, E, Brainstorm | PortableWork | Store>, access: 'read' | 'write') =>
		Effect.suspend(() => accepting
			? Effect.scoped(effect.pipe(Effect.provide(service), Effect.provide(requestStoreLayer(config.store, access === 'read', telemetry.assertStoreSeparation)), Effect.provideService(ManagedEffortAccess, policy)))
			: Effect.fail(failure('The stdio connection is closing; no Store was acquired.')))
	const respond = <A extends object, E>(effect: Effect.Effect<A, E>) =>
		run(effect.pipe(Effect.catchCause(cause => Effect.fail(failure(Cause.squash(cause)))), Effect.match({
			onSuccess: value => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: { ...value } }),
			onFailure: error => ({ isError: true, content: [{ type: 'text' as const, text: JSON.stringify(errorJson(error)) }] }),
		})))
	const tool = <A extends object, E>(effect: Effect.Effect<A, E, Brainstorm | PortableWork | Store>, access: 'read' | 'write') => respond(execute(effect, access))
	const makeServer = () => {
		const server = new McpServer({ name: 'madewell', version: '0.0.0' }, {
			cacheHints: { 'resources/read': { ttlMs: 0, cacheScope: 'private' } },
		})
		server.server.onerror = error => { process.stderr.write(JSON.stringify(errorJson(failure(error))) + '\n') }
		server.registerTool('inspect_composition', {
			description: 'Resolve the live selected composition before capture within the explicit startup root. Optional component/config/override use the existing resolver; no caller root override or Store access. Returns selected instructions, origins, contracts and full source manifests, not durable-runtime payloads or execution/activation/acceptance. Missing canonical methods remain visible diagnostics.',
			inputSchema: CapturePortableInput.pick({ component: true, config: true, override: true }).partial(), outputSchema: CompositionInspectionOutput,
			annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
		}, input => respond(inspectComposition({ ...input, root: config.root })))
		server.registerTool('catalog_brainstorm', {
			description: 'List selectable shipped Brainstorm methods and actual local capabilities without loading every instruction body or opening storage.',
			inputSchema: CatalogBrainstormInput, outputSchema: BrainstormCatalogOutput,
			annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
		}, input => respond(Effect.flatMap(Brainstorm, service => service.catalog(input)).pipe(Effect.provide(service))))
		server.registerTool('capture_brainstorm', {
			description: 'Save exact rough source as external Brainstorm work and pin the default entrypoint/posture. No intake questionnaire, worker or execution. Reuse requestId and exact input after an uncertain response.',
			inputSchema: CaptureBrainstormInput, outputSchema: BrainstormSnapshotOutput,
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, input => tool(Effect.flatMap(Brainstorm, service => service.capture(input)), 'write'))
		server.registerTool('inspect_brainstorm', {
			description: 'Read exact source, pinned packages, handoff/input history and attributed results for Brainstorm work in the startup root. Does not advance work.',
			inputSchema: InspectBrainstormInput, outputSchema: BrainstormSnapshotOutput,
			annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
		}, input => tool(Effect.flatMap(Brainstorm, service => service.inspect(input)), 'read'))
		server.registerTool('prepare_brainstorm', {
			description: 'Save a pinned Brainstorm recipe at the supplied revision. Effort defaults to free Light; authored Focused/Deep require current trusted host access, unavailable by default. Context retains exact turn material. Omitted methods/outputLength retain prior selections; explicit methods add specialists to the default pair. No execution or purchase.',
			inputSchema: PrepareBrainstormInput, outputSchema: BrainstormSnapshotOutput.extend({ handoff: BrainstormHandoffOutput }),
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, input => tool(Effect.flatMap(Brainstorm, service => service.prepare(input)), 'write'))
		server.registerTool('record_brainstorm', {
			description: 'Save the exact artifact and attributed performed work for the latest prepared handoff, bounded by its authorized recipe. Recording stays available after managed access changes. Shape acceptance is not independent verification, completion, promotion or execution authority.',
			inputSchema: RecordBrainstormInput, outputSchema: BrainstormSnapshotOutput.extend({ recorded: BrainstormRecordedOutput }),
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, input => tool(Effect.flatMap(Brainstorm, service => service.record(input)), 'write'))
		server.registerTool('capture_work', {
			description: 'Capture exact source and explicitly selected component/configuration as non-executing external work. Pin selected method instructions and supporting files, including the canonical Landing return when selected. Missing methods fail visibly. Reuse requestId and exact body after an uncertain response.',
			inputSchema: CapturePortableInput, outputSchema: PortableSnapshotOutput,
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, input => tool(Effect.flatMap(PortableWork, service => service.capture(input)), 'write'))
		server.registerTool('inspect_work', {
			description: 'Read root-scoped saved portable work, exact source, method selection, handoffs, attributed results and candidate IDs. Does not advance work or establish independent acceptance.',
			inputSchema: InspectPortableInput, outputSchema: PortableSnapshotOutput,
			annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
		}, input => tool(Effect.flatMap(PortableWork, service => service.inspect(input)), 'read'))
		server.registerTool('prepare_work', {
			description: 'Save the next selected occurrence with its pinned authored effort recipe, exact context and wired prior results. Non-Light managed recipes require trusted host access, unavailable by default. A method without declared variants gains none. Preparation freezes the occurrence; recover pending handoffs rather than duplicating them. No performer or external action is invoked.',
			inputSchema: PreparePortableInput, outputSchema: PortableSnapshotOutput.extend({ handoff: PortableHandoffOutput }),
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, input => tool(Effect.flatMap(PortableWork, service => service.prepare(input)), 'write'))
		server.registerTool('exchange_work', {
			description: 'Save attributed recipient questions, sender answers or confirmation for the pending fixed handoff. Each answered sender batch counts once; unresolved questions after three answers hold for explicit operator resolution and recipient confirmation. Labels are local attribution, not authentication. No performer, external action or other blocker release.',
			inputSchema: ExchangePortableInput, outputSchema: PortableSnapshotOutput.extend({ exchange: Exchange }),
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, input => tool(Effect.flatMap(PortableWork, service => service.exchange(input)), 'write'))
		server.registerTool('record_work', {
			description: 'Retain an attributed artifact for the pending handoff. Declared Discovery contracts enforce contribution conservation; confirm creates candidates, never selects or executes them. Contract acceptance is not semantic truth, independent verification or task completion.',
			inputSchema: RecordPortableInput, outputSchema: PortableSnapshotOutput.extend({ recorded: PortableRecordedOutput }),
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, input => tool(Effect.flatMap(PortableWork, service => service.record(input)), 'write'))
		server.registerTool('preview_work', {
			description: 'Preview exactly the explicit candidate IDs, their current revisions and prerequisite status. Never adds prerequisites, selects work or grants execution permission.',
			inputSchema: PreviewPortableInput, outputSchema: PortableSnapshotOutput.extend({ promotion: PromotionOutput }),
			annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
		}, input => tool(Effect.flatMap(PortableWork, service => service.preview(input)), 'read'))
		server.registerTool('promote_work', {
			description: 'Select exactly the explicit candidate IDs using current parent and candidate revisions. Selected work remains external and non-dispatching even when executable defaults exist. No implicit prerequisites or execution.',
			inputSchema: PromotePortableInput, outputSchema: PortableSnapshotOutput.extend({ promotion: PromotionOutput }),
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, input => tool(Effect.flatMap(PortableWork, service => service.promote(input)), 'write'))
		server.registerTool('replace_work', {
			description: 'Explicitly re-resolve compatible structure before any preparation, or compatible never-prepared future methods or subtrees afterward, using selected configuration/override and a saved reason. Prepared occurrences, enclosing contracts/wiring, prior handoffs and results cannot be rewritten. No silent library refresh.',
			inputSchema: ReplacePortableInput, outputSchema: PortableSnapshotOutput,
			annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, input => tool(Effect.flatMap(PortableWork, service => service.replace(input)), 'write'))
		const read = async (uri: URL) => {
			const effect: Effect.Effect<object, MadeWellError> = uri.href === 'madewell://brainstorm/catalog'
				? Effect.flatMap(Brainstorm, service => service.catalog()).pipe(Effect.provide(service))
				: uri.href.startsWith('madewell://work/')
				? execute(Effect.flatMap(PortableWork, service => service.readResource(uri.href)), 'read')
				: execute(Effect.flatMap(Brainstorm, service => service.readResource(uri.href)), 'read')
			const result = await run(effect.pipe(Effect.catchCause(cause => Effect.fail(failure(Cause.squash(cause)))), Effect.match({
				onSuccess: value => ({ ok: true as const, value }), onFailure: error => ({ ok: false as const, error }),
			})))
			if (!result.ok) throw new ResourceNotFoundError(uri.href, JSON.stringify(errorJson(result.error)))
			return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(result.value) }] }
		}
		server.registerResource('brainstorm-catalog', 'madewell://brainstorm/catalog', { mimeType: 'application/json', description: 'Shipped method names and actual capabilities, not native Skills activation.' }, read)
		server.registerResource('brainstorm-saved-material', new ResourceTemplate('madewell://brainstorm/items/{itemId}/{kind}', { list: undefined }), {
			mimeType: 'application/json', description: 'Root-scoped saved source, handoffs, results or packages; kind is exactly source, handoffs, results or packages.',
		}, read)
		server.registerResource('brainstorm-saved-entry', new ResourceTemplate('madewell://brainstorm/items/{itemId}/{kind}/{identity}', { list: undefined }), {
			mimeType: 'application/json', description: 'Root-scoped handoffs/{handoffId} or packages/{packageIdentity}, including saved supporting files. No filesystem path reads.',
		}, read)
		server.registerResource('work-saved-material', new ResourceTemplate('madewell://work/items/{itemId}/{kind}', { list: undefined }), {
			mimeType: 'application/json', description: 'Root-scoped saved source, selection, handoffs, results, packages, exchanges or refusals. Exact retained material only; no live filesystem reads.',
		}, read)
		skills?.attach(server)
		return server
	}
	// Completion belongs to the wire, not a disposable SDK discovery-probe instance.
	let closed = false
	let complete: (() => void) | undefined
	const finish = () => { closed = true; complete?.() }
	yield* Effect.acquireRelease(trySync(() => {
		process.once('SIGINT', finish)
		process.once('SIGTERM', finish)
	}), () => Effect.sync(() => {
		process.removeListener('SIGINT', finish)
		process.removeListener('SIGTERM', finish)
	}))
	const transport = yield* trySync(() => new StdioServerTransport())
	const closeTransport = transport.close.bind(transport), startTransport = transport.start.bind(transport)
	transport.close = async () => { try { await closeTransport() } finally { finish() } }
	transport.start = async () => { try { await startTransport() } catch (cause) { finish(); throw cause } }
	yield* trySync(() => telemetry.instrument(transport))
	yield* Effect.acquireRelease(
		trySync(() => serveStdio(makeServer, { transport, onerror: error => { process.stderr.write(JSON.stringify(errorJson(failure(error))) + '\n') } })),
		handle => tryPromise(async () => {
			accepting = false
			try { await handle.close() } finally { await Promise.allSettled([...active]) }
		}).pipe(Effect.catch(error => Effect.sync(() => report(error)))),
	)
	yield* Effect.callback<void>(resume => {
		complete = () => resume(Effect.void)
		if (closed) complete()
	})
})

export const mcpMain = Effect.fn('mw.mcpMain')(function*(args: ReadonlyArray<string> = process.argv.slice(2)) {
	const configuration = yield* trySync(() => {
		const { values } = parseArgs({ args: [...args], options: { root: { type: 'string' }, store: { type: 'string' }, 'telemetry-file': { type: 'string' }, skills: { type: 'boolean', default: false } }, allowPositionals: false, strict: true })
		if (!values.root || !values.store) throw failure('Both --root ABSOLUTE and --store ABSOLUTE are required.')
		return { root: values.root, store: values.store, telemetryFile: values['telemetry-file'], skills: values.skills }
	})
	yield* serveMcp(configuration)
})

// Resolve npm bin symlinks as well as direct node src/dist invocations.
await Effect.runPromise(Effect.scoped(Effect.gen(function*() {
	const entry = yield* trySync(() => process.argv[1] !== undefined && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url))
	if (entry) yield* mcpMain()
})).pipe(Effect.matchCause({
		onSuccess: () => undefined,
		onFailure: cause => report(failure(Cause.squash(cause))),
	})))
