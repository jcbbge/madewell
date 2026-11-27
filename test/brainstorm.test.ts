import assert from 'node:assert/strict'
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { loadSkillPackage, readSkillFile } from '../src/skill-package.ts'
import {
	actor, array, bounded, conversation, decoded, failure, handle, handoff, light, nodes, object, observesUpdatedSeed,
	productFixture, reportedResult, reporter, repository, retains, retainsText, roughSource, seed,
	selectedBodies, startupAliasCases, startupAliasRefusal, success, text, tools, type ProductFixture, type Value,
} from './tooling/product-mcp-smoke.ts'

// B01–B05/B11/B12: deterministic local plumbing, not evaluation of generated brainstorm quality.
async function capture(f: ProductFixture, requestId = 'capture', source = roughSource) {
	return success(await f.call('capture_brainstorm', { requestId, source, actor }))
}
async function prepare(f: ProductFixture, captured: Value, requestId = 'prepare', extra: Value = {}) {
	return success(await f.call('prepare_brainstorm', { requestId, ...handle(captured), actor, ...extra }))
}
async function rejectedInput(f: ProductFixture, name: string, args: Value, pattern: RegExp) {
	let response: unknown
	try { response = await f.call(name, args) } catch (error) {
		assert.ok(error instanceof Error)
		assert.match(error.message, pattern, 'SDK protocol failure must explain the rejected shape')
		return
	}
	assert.equal(object(response).isError, true)
	assert.match(JSON.stringify(response), pattern)
}

// Requires the existing tooling expected-tools list to add inspect_composition.
test('W4: product inspection honors explicit ordinary selection before capture without a Store or execution', async () => {
	const f = await productFixture({ existingStore: false })
	const directory = join(f.project, 'local-methods')
	try {
		const material = 'madewell.material.v1'
		const instructions = (name: string) => `---\r\nname: ${name}\r\ndescription: Explicit local ordinary fixture.\r\nallowed-tools: Bash Read\r\n---\r\n# ${name} — 雪 / e\u0301 / 🦉\r\n  Keep exact bytes.  \r\n`
		for (const name of ['note-a', 'note-b']) {
			mkdirSync(join(directory, name, 'scripts'), { recursive: true })
			writeFileSync(join(directory, name, 'SKILL.md'), instructions(name))
			writeFileSync(join(directory, name, 'scripts/tripwire.cjs'), `require('node:fs').writeFileSync(${JSON.stringify(join(directory, 'EXECUTED'))}, 'forbidden');\r\n`)
		}
		const bind = (name: string) => ({ schemaVersion: 1, bindings: { '/brainstorm': { skill: `./${name}`, input: material, output: material } } })
		writeFileSync(join(directory, 'config.json'), JSON.stringify(bind('note-a')))
		writeFileSync(join(directory, 'override.json'), JSON.stringify(bind('note-b')))
		const client = await f.connect({ file: true })
		const inspect = async (override?: string) => {
			const wire = await f.call('inspect_composition', {
				component: '/brainstorm', config: 'local-methods/config.json', ...(override ? { override } : {}),
			})
			assert.notEqual(object(wire).isError, true)
			const result = decoded(wire)
			assert.deepEqual(object(wire).structuredContent, result)
			assert.equal(result.schemaVersion, 1)
			assert.equal(result.complete, true)
			assert.deepEqual(result.diagnostics, [])
			const root = object(result.root), method = object(root.method), pkg = object(method.package)
			assert.equal(root.address, '/brainstorm')
			assert.equal(root.input, material)
			assert.equal(root.output, material)
			assert.equal(method.kind, 'skill')
			assert.equal(pkg.instructions, instructions(override ? 'note-b' : 'note-a'))
			assert.equal(method.bindingOrigin, join(directory, override ? 'override.json' : 'config.json'))
			assert.deepEqual(method.companions ?? [], [])
			return result
		}
		const first = await inspect()
		const second = await inspect('local-methods/override.json')
		assert.notEqual(first.identity, second.identity)
		assert.deepEqual(await inspect(), first)
		assert.ok((await bounded(client.listTools(), 'product tools')).tools.some(tool => tool.name === 'inspect_composition'))
		await f.disconnect()
		assert.equal(existsSync(join(directory, 'EXECUTED')), false)
		assert.equal(existsSync(dirname(f.storePath)), false)
		assert.equal(f.snapshot(), null)
	} finally {
		rmSync(directory, { recursive: true, force: true })
		await f.close()
	}
})

test('B11: approved entry/posture remain ordinary independently readable skill packages, without MCP or a subscription', () => {
	const root = join(repository, 'brainstorm')
	for (const name of ['brainstorm', 'ambitious-collaboration', 'nonconvergence']) {
		const directory = join(root, 'skills', name), pkg = loadSkillPackage(root, directory)
		assert.equal(pkg.name, name)
		assert.equal(pkg.frontmatter.name, name)
		assert.equal(pkg.instructions, seed(name))
		assert.deepEqual(readSkillFile(root, pkg, 'SKILL.md'), Buffer.from(seed(name)))
	}
	const pkg = loadSkillPackage(root, join(root, 'skills/brainstorm'))
	assert.deepEqual(readSkillFile(root, pkg, 'references/effort.md'), readFileSync(join(root, 'skills/brainstorm/references/effort.md')))
})

test('B01/B03: discoverable local tools and catalog reads need neither Store creation nor all method bodies', async () => {
	const f = await productFixture({ existingStore: false })
	try {
		const client = await f.connect({ file: true })
		const list = await bounded(client.listTools(), 'list local tools')
		assert.deepEqual(list.tools.map(tool => tool.name).sort(), [...tools].sort())
		for (const tool of list.tools) {
			assert.equal(tool.inputSchema.type, 'object')
			assert.equal(object(tool.inputSchema.properties ?? {}).root, undefined, 'tool arguments cannot widen startup root')
			assert.equal(object(tool.inputSchema.properties ?? {}).store, undefined, 'tool arguments cannot select another ledger')
		}
		const catalog = success(await f.call('catalog_brainstorm', {}))
		for (const method of ['brainstorm', 'ambitious-collaboration', 'nonconvergence']) retainsText(catalog, method, 'public method catalog')
		assert.ok(!nodes(catalog).some(node => typeof node === 'string' && node.includes(seed('nonconvergence'))), 'catalog metadata does not inject every specialist body')
		const resources = await bounded(client.listResources(), 'list resources without Store')
		assert.ok(resources.resources.some(resource => resource.uri === 'madewell://brainstorm/catalog'))
		const catalogResource = await bounded(client.readResource({ uri: 'madewell://brainstorm/catalog' }), 'catalog resource without Store')
		retainsText(catalogResource, 'nonconvergence', 'ordinary resource fallback exposes the catalog')
		assert.equal(existsSync(f.storePath), false)
		assert.equal(existsSync(dirname(f.storePath)), false, 'R8: all catalog/list/resource operations leave Store parent absent')
		failure(await f.call('inspect_brainstorm', { itemId: 927362 }), /store|unavailable|unreadable|not.found|no work|item/i)
		assert.equal(existsSync(f.storePath), false)
		assert.equal(existsSync(dirname(f.storePath)), false, 'R8: inspect refusal cannot initialize a missing Store')
		await f.disconnect()
		assert.equal(f.snapshot(), null, 'initialize/list/catalog/EOF are read-only even with hostile installed env')
	} finally { await f.close() }
})

for (const kind of startupAliasCases) test(`startup telemetry/Store alias refuses before protocol or file writes: ${kind}`, async () => {
	await startupAliasRefusal(kind)
})

test('telemetry guard preserves every public request span when a regular SQLite sidecar appears after realpath ENOENT, but still refuses a dangling sidecar', async () => {
	const preload = join(repository, 'test/tooling/telemetry-sidecar-preload.mjs')
	const sidecarContent = 'TEST-OWNED REGULAR SIDECAR — 雪 / 🦉\r\nCreated after real ENOENT, before the following lookup.  \r\n'
	for (const state of ['absent', 'existing', 'appearing', 'dangling'] as const) {
		const f = await productFixture({ existingStore: false })
		try {
			mkdirSync(dirname(f.storePath), { recursive: true })
			const sidecar = f.storePath + '-wal', observed = f.storePath + '.observed-sidecar-interleaving.json'
			const missingTarget = join(f.root, 'never-created-sidecar-target')
			if (state === 'existing') writeFileSync(sidecar, sidecarContent, { flag: 'wx' })
			if (state === 'dangling') {
				symlinkSync(missingTarget, sidecar)
				assert.equal(lstatSync(sidecar).isSymbolicLink(), true)
				let refused = false
				try { await f.connect({ file: true, preload }) } catch (error) {
					assert.ok(error instanceof Error)
					const diagnostic = await f.disconnect()
					assert.ok(diagnostic, 'protocol failure alone cannot establish a safe dangling-symlink refusal')
					assert.equal(diagnostic.error, 'mcp_failed')
					failure({ isError: true, content: [{ type: 'text', text: JSON.stringify(diagnostic) }] }, /alias|sidecar|symbolic|symlink|link|destination/i)
					refused = true
				}
				assert.equal(refused, true, 'a genuine dangling symlink is not a newly appeared regular file')
				assert.equal(readlinkSync(sidecar), missingTarget)
				assert.equal(existsSync(missingTarget), false)
				const telemetryFile = join(f.root, 'telemetry-1.jsonl')
				if (existsSync(telemetryFile)) assert.equal(readFileSync(telemetryFile).length, 0, 'unsafe startup writes no telemetry bytes')
			} else {
				const client = await f.connect({ file: true, preload })
				const listed = await bounded(client.listTools(), `${state}: sidecar catalog tool discovery`)
				assert.deepEqual(listed.tools.map(tool => tool.name).sort(), [...tools].sort())
				success(await f.call('catalog_brainstorm', {}))
				assert.equal(existsSync(f.storePath), false, 'startup/list/catalog must not initialize SQLite')
				const missing = failure(await f.call('inspect_brainstorm', { itemId: 927362 }), /store|unavailable|unreadable|not.found|no work|item/i)
				const missingReason = text(object(missing.context).reason)
				assert.match(missingReason, /unable to open database file/i, 'refusal reports the factual missing-Store failure, independent of the adapter error-code taxonomy')
				assert.doesNotMatch(missingReason, /telemetry|alias|collision|destination/i, 'missing Store must not be misreported as a telemetry destination or alias failure')
				if (state === 'appearing') writeFileSync(f.storePath + '.arm-sidecar-interleaving', 'Keep independent asynchronous lookup interleavings armed through clean shutdown.\n', { flag: 'wx' })
				success(await f.call('catalog_brainstorm', {}))
				// Neither armed request acquires a Store: any lost request span is an export
				// failure, not a competing missing-Store refusal from the inspection operation.
				await rejectedInput(f, 'not_a_product_tool', {}, /unknown|not.found|not_a_product_tool/i)
				// Clean EOF validates the unchanged exact-one-span correlation for every request,
				// including the final failed call, plus its exact ERROR status and duration metrics.
				await f.disconnect()
				if (state === 'appearing') {
					const evidence = object(JSON.parse(readFileSync(observed, 'utf8')))
					const interleavings = array(evidence.interleavings).map(object)
					assert.equal(evidence.count, interleavings.length)
					assert.ok(interleavings.length >= 2, 'independently rearmed interleavings cannot be consumed permanently by one metric export')
					for (const [index, interleaving] of interleavings.entries()) {
						assert.deepEqual({ ...interleaving, lookup: undefined }, { sequence: index + 1, event: 'regular-sidecar-after-realpath-ENOENT', path: sidecar, lookup: undefined, originalError: 'ENOENT', regular: true, symlink: false })
						assert.ok(['realpathSync', 'realpathSync.native'].includes(text(interleaving.lookup)), 'each recorded interleaving is a genuine failed filesystem lookup, not a private exporter assertion')
					}
				} else assert.equal(existsSync(observed), false, 'absent/existing controls do not inject a failed lookup')
				if (state === 'absent') assert.equal(existsSync(sidecar), false)
				else assert.equal(readFileSync(sidecar, 'utf8'), sidecarContent, 'catalog/telemetry neither overwrite nor append to the unrelated regular sidecar')
			}
			assert.equal(existsSync(f.storePath), false, `${state}: read-only protocol operations and refusals create no Store`)
			assert.equal(existsSync(f.storePath + '-shm'), false)
			assert.equal(existsSync(f.storePath + '-journal'), false)
			assert.equal(f.snapshot(), null)
		} finally { await f.close() }
	}
})

test('B01/B02/B03/B12: rough input defaults to exact seeded Light without an intake gate or execution', async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const captured = await capture(f)
		assert.equal(f.snapshot()!.items.length, 1, 'one capture creates one existing-ledger work item')
		const prepared = await prepare(f, captured)
		light(prepared); selectedBodies(handoff(prepared))
		assert.equal(handoff(prepared).requestedEffort, null, 'implicit Light is distinct from an explicit paid request')
		assert.equal(handoff(prepared).component, '/brainstorm')
		retains(handoff(prepared), roughSource, 'exact raw Unicode and CRLF material reaches the handoff')
		const state = f.snapshot()!, item = state.items[0]!
		assert.equal(item.id, handle(captured).itemId)
		assert.equal(item.source, roughSource)
		assert.equal(state.rawItems.length, 1, 'the existing Store, not a second work ledger, owns this record')
		assert.ok(state.events.some(event => event.item === item.id), 'capture and preparation are actual durable transitions')
		assert.ok(nodes(state.events).some(node => node === handoff(prepared).id), 'handoff identity is committed before returning')
		f.assertNoExecution()
	} finally { await f.close() }
})

test('portable-work MCP: local ordinary method preserves exact source, typed handoff, reported artifact and pins across restart without execution', async () => {
	const f = await productFixture(), local = join(f.project, 'local-contract')
	const source = '  Durable source — 雪 / café / e\u0301 / 🦉\r\nKeep both outcomes.  \r\n'
	const instructions = '---\nname: local-note\ndescription: Ordinary local regression method, not business acceptance.\n---\n# Note — 雪\r\nRead [context](references/context.md). Do not execute anything.  \r\n'
	const support = '  Retained reference — 鳥 / e\u0301\r\nExact support bytes.  \r\n'
	const context = '  Caller context — β\r\nNo permission to contact anyone.  \r\n'
	const result = { artifact: '# Reported note — 雪 / e\u0301\r\n  Both outcomes remain.  \r\n', sources: ['operator source'], decisions: ['Keep both outcomes'], unknowns: ['Availability is unobserved'], performedEffort: 'light' }
	// Generic snapshots do not promise Brainstorm's promotionAuthorized field.
	const work = async (name: string, input: Value) => {
		const response = object(await f.call(name, input)), value = decoded(response)
		assert.notEqual(response.isError, true, JSON.stringify(response))
		assert.deepEqual(response.structuredContent, value)
		assert.equal(value.executionAuthorized, false)
		return value
	}
	try {
		mkdirSync(join(local, 'local-note/references'), { recursive: true })
		writeFileSync(join(local, 'local-note/SKILL.md'), instructions)
		writeFileSync(join(local, 'local-note/references/context.md'), support)
		writeFileSync(join(local, 'config.json'), JSON.stringify({ schemaVersion: 1,
			composition: { id: 'note', purpose: 'Return a natural note', input: 'fixture.material', output: 'fixture.note' },
			bindings: { '/': { skill: './local-note', input: 'fixture.material', output: 'fixture.note' } },
		}))
		await f.connect({ file: true })
		const captured = await work('capture_work', { requestId: 'local-work-capture', actor, source, component: '/', config: 'local-contract/config.json' })
		assert.equal(captured.source, source)
		const prepared = await work('prepare_work', { requestId: 'local-work-prepare', ...handle(captured), actor, context })
		const packet = handoff(prepared), node = object(packet.node)
		assert.equal(node.address, '/'); assert.equal(node.input, 'fixture.material'); assert.equal(node.output, 'fixture.note')
		assert.equal(packet.source, source); assert.equal(packet.context, context); assert.equal(packet.effectiveEffort, 'light')
		assert.equal(packet.contributionSchema, null, 'ordinary contracts do not infer Discovery business validation')
		retains(packet, instructions, 'handoff contains the selected ordinary instructions')
		retains(packet, support, 'handoff contains the selected reference bytes')
		const recordInput = { requestId: 'local-work-record', ...handle(prepared), actor: reporter, handoffId: text(packet.id), result }
		const recorded = await work('record_work', recordInput)
		assert.deepEqual(object(recorded.recorded).result, result)
		assert.equal(object(recorded.recorded).validation, 'contract-accepted-not-independently-verified')
		await f.disconnect()
		writeFileSync(join(local, 'local-note/SKILL.md'), instructions + '\nUPDATED-METHOD — not the retained pin\n')
		const client = await f.connect({ file: true })
		const inspected = await work('inspect_work', { itemId: handle(captured).itemId })
		assert.equal(inspected.source, source); assert.equal(inspected.revision, recorded.revision)
		assert.deepEqual(object(inspected.portable).selection, object(captured.portable).selection)
		retains(inspected, packet, 'restart preserves the exact prepared handoff')
		retains(inspected, result, 'restart preserves the exact reported artifact and other result fields')
		const uri = `madewell://work/items/${handle(captured).itemId}/packages`
		retains(inspected, uri, 'saved package resource is discoverable')
		const packages = await bounded(client.readResource({ uri }), 'read retained ordinary packages after restart')
		const bodies = packages.contents.map(content => { assert.equal(content.uri, uri); return JSON.parse(text(object(content).text)) as unknown })
		retains(bodies, instructions, 'saved packages retain original instructions after the local method changes')
		retains(bodies, support, 'saved packages retain exact supporting bytes')
		assert.ok(!JSON.stringify(bodies).includes('UPDATED-METHOD'))
		const beforeReplay = f.snapshot()
		assert.deepEqual(await work('record_work', recordInput), recorded)
		assert.deepEqual(f.snapshot(), beforeReplay, 'restart receipt replay does not repeat the record transition')
	} finally {
		rmSync(local, { recursive: true, force: true })
		await f.close() // Existing fixture checks no worker/runner/network/installation/promotion and restores granted-root invariants.
	}
})

test('B02/B05/B12: existing-project goal/decisions and a selected nonconvergence method preserve independent short-output Light', async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const objective = 'Preserve access to an existing community library — do not redesign membership.'
		const source = 'Existing project.\r\nSettled decision: no ticket gate.\r\nKeep two shelf ideas live.  \r\n'
		const captured = success(await f.call('capture_brainstorm', { requestId: 'existing-project', title: 'Existing library', objective, source, actor }))
		const outputLength = 'one concise paragraph; acceptance preference 雪'
		const prepared = await prepare(f, captured, 'selected-method', { methods: ['nonconvergence'], outputLength, effort: 'light' })
		light(prepared); selectedBodies(handoff(prepared), true)
		retains(handoff(prepared), source, 'existing-project decisions are not reduced to a summary')
		retains(handoff(prepared), objective, 'explicit settled goal survives selected specialist')
		retains(handoff(prepared), outputLength, 'answer length is pinned separately from effort/method')
		assert.equal(f.snapshot()!.items.length, 1)
		f.assertNoExecution()
	} finally { await f.close() }
})

test('B03/B04/B05: explicit unavailable method and Focused/Deep requests refuse without mutation or silent Light downgrade', async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const captured = await capture(f)
		for (const [requestId, extra, pattern] of [
			['unavailable-method', { methods: ['no-such-brainstorm-method'] }, /method|unknown|unavailable/i],
			['focused-short', { effort: 'focused', outputLength: 'short' }, /access|unavailable|entitle|paid/i],
			['deep-short', { effort: 'deep', outputLength: 'short' }, /access|unavailable|entitle|paid/i],
		] as const) {
			const before = f.snapshot()
			failure(await f.call('prepare_brainstorm', { requestId, ...handle(captured), actor, ...extra }), pattern)
			assert.deepEqual(f.snapshot(), before, 'refused explicit selection changes neither work nor events')
		}
		const free = await prepare(f, captured, 'still-free')
		light(free); selectedBodies(handoff(free))
		let current = free
		for (const requestId of ['unavailable-method', 'focused-short', 'deep-short']) {
			current = await prepare(f, current, requestId)
			light(current)
		}
		assert.equal(array(object(current.brainstorm).handoffs).length, 4, 'unavailable requests reserve neither a receipt nor a hidden handoff; their IDs remain reusable for permitted input')
	} finally { await f.close() }
})

test('B02/B05: resumed user context retains exact attribution and earlier output-length preference without rewriting source', async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const captured = await capture(f)
		const outputLength = 'short; preserve both live alternatives'
		const first = await prepare(f, captured, 'initial-length', { outputLength })
		const recorded = success(await f.call('record_brainstorm', { requestId: 'record-opening', ...handle(first), actor: reporter, handoffId: handoff(first).id, result: reportedResult }))
		const context = '  RESUMED USER TURN — 漢字 / e\u0301 / 🦉\r\nSettled now: staffed shelf preferred, exchange still live.  \r\n'
		const resumedActor = { kind: 'operator', label: 'operator — resumed material owner 🦉' }
		const input = { requestId: 'resumed-context', ...handle(recorded), actor: resumedActor, context }
		const resumed = success(await f.call('prepare_brainstorm', input)), packet = handoff(resumed)
		assert.equal(packet.source, roughSource)
		assert.equal(packet.outputLength, outputLength, 'omitted length retains the earlier explicit preference')
		retains(packet, context, 'this-turn material is exact and distinct from original source')
		retains(packet, reportedResult, 'user context does not replace earlier attributed agent results')
		const afterContext = f.snapshot()
		await f.connect({ file: true })
		assert.deepEqual(success(await f.call('prepare_brainstorm', input)), resumed)
		assert.deepEqual(f.snapshot(), afterContext)
		failure(await f.call('prepare_brainstorm', { ...input, context: 'Different user material under the same request identity.' }), /request.*conflict|different input|already used/i)
		assert.deepEqual(f.snapshot(), afterContext, 'this-turn context participates in logical request identity')
		const recordedAgain = success(await f.call('record_brainstorm', { requestId: 'record-resumed', ...handle(resumed), actor: reporter, handoffId: packet.id, result: { ...reportedResult, artifact: 'Second distinct artifact — no new source bytes.\r\n' } }))
		const next = await prepare(f, recordedAgain, 'next-after-context')
		retains(handoff(next), context, 'previous handoff user context reaches the next preparation')
		assert.ok(nodes(handoff(next)).some(node => {
			if (!node || typeof node !== 'object' || Array.isArray(node)) return false
			const values = Object.values(node)
			return values.includes(context) && values.some(value => { try { assert.deepEqual(value, resumedActor); return true } catch { return false } })
		}), 'retained user-context record binds its exact material and reporting actor together')
		assert.equal(handoff(next).source, roughSource)
		assert.equal(handoff(next).outputLength, outputLength)
		assert.equal(f.snapshot()!.items[0]!.source, roughSource)
	} finally { await f.close() }
})

test('B02/B11/B12: capture/prepare/record receipts survive restart, exact results reach continuation, no duplicate result events', async () => {
	const f = await productFixture()
	try {
		const result = await conversation(f)
		const state = f.snapshot()!
		assert.equal(state.items.length, 1)
		assert.ok(state.events.some(event => event.item === result.itemId && nodes(event.data).some(node => {
			try { assert.deepEqual(node, reporter); return true } catch { return false }
		}) && nodes(event.data).some(node => {
			try { assert.deepEqual(node, reportedResult); return true } catch { return false }
		})), 'same durable result event binds exact reported artifact and its accountable actor')
		assert.ok(!state.items[0]!.completion, 'schema-valid result is not independent acceptance')
	} finally { await f.close() }
})

test('logical request conflicts cannot overwrite a prepared or recorded turn', async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const captured = await capture(f), prepared = await prepare(f, captured)
		const before = f.snapshot()
		failure(await f.call('capture_brainstorm', { requestId: 'capture', source: 'different logical source', actor }), /request.*conflict|different input|already used/i)
		assert.deepEqual(f.snapshot(), before)
		failure(await f.call('prepare_brainstorm', { requestId: 'prepare', ...handle(captured), actor, methods: ['nonconvergence'] }), /request.*conflict|different input|already used/i)
		assert.deepEqual(f.snapshot(), before)
		const input = { requestId: 'record', ...handle(prepared), actor: reporter, handoffId: handoff(prepared).id, result: reportedResult }
		const recorded = success(await f.call('record_brainstorm', input)), recordedState = f.snapshot()
		failure(await f.call('record_brainstorm', { ...input, result: { ...reportedResult, artifact: 'Conflicting rewrite' } }), /request.*conflict|different input|already used/i)
		assert.deepEqual(f.snapshot(), recordedState)
		assert.deepEqual(success(await f.call('record_brainstorm', input)), recorded)
		assert.deepEqual(f.snapshot(), recordedState)
	} finally { await f.close() }
})

for (const operation of ['prepare', 'record'] as const) test(`§15.4: authorized stale ${operation} retains its exact rejected draft and refusal across restart without advancing accepted work`, async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const captured = await capture(f), prepared = await prepare(f, captured)
		const competing = await prepare(f, prepared, 'competing-accepted-handoff')
		const competingResult = { ...reportedResult, artifact: 'ACCEPTED COMPETING RESULT — amber telescope 802\r\nKeep this result, not the stale draft.  \r\n', decisions: ['The accepted turn keeps its amber telescope decision.'] }
		const accepted = success(await f.call('record_brainstorm', { requestId: 'competing-accepted-result', ...handle(competing), actor: reporter, handoffId: handoff(competing).id, result: competingResult }))
		const context = '  REJECTED CONTINUATION DRAFT — 漢字 / e\u0301 / 🦉\r\nPreserve the staffed shelf and exchange as separate branches.\r\nDo not regenerate my question: what observation distinguishes them?  \r\n'
		const result = {
			artifact: '# REJECTED RESULT DRAFT — 鳥 / e\u0301 / 🦉\r\nA copper orchard, deliberately unlike the accepted amber telescope.  \r\n',
			sources: ['Original operator source only — no external inspection.\r\n'],
			decisions: ['Retain this rejected copper-orchard decision for explicit recovery, not as accepted work.'],
			unknowns: ['Whether the orchard is accessible remains unobserved.'],
			alternatives: ['A staffed orchard', 'An unstaffed exchange — still a separate possibility'],
			nextMove: 'Ask for an authorized observation; launch nothing.\r\n', performedEffort: 'light',
		}
		const requestId = `retained-stale-${operation}`
		const input = operation === 'prepare'
			? { requestId, ...handle(prepared), actor, context }
			: { requestId, ...handle(prepared), actor: reporter, handoffId: handoff(prepared).id, result }
		const tool = `${operation}_brainstorm`
		const current = success(await f.call('inspect_brainstorm', { itemId: handle(accepted).itemId }))
		const before = f.snapshot()!
		const refused = failure(await f.call(tool, input), /revision|stale|changed/i)
		retains(refused.context, handle(prepared).revision, 'refusal identifies the exact stale expected revision')
		retains(refused.context, handle(accepted).revision, 'refusal identifies the actual current revision after the competing result')
		const retained = f.snapshot()!, added = retained.events.slice(before.events.length)
		assert.equal(added.length, 1, 'one rejected-draft/conflict event commits with the refusal receipt')
		assert.equal(added[0]!.kind, 'brainstorm-conflict', 'stale drafts are refusal evidence, not accepted preparation/record events')
		assert.equal(added[0]!.item, handle(accepted).itemId)
		retains(added, requestId, 'the retained event identifies this logical rejected request')
		retains([refused.context, added], operation === 'prepare' ? context : result, 'complete rejected material is recoverable without normalization or regeneration')
		retains([refused.context, added], input.actor, 'the recovered draft retains its reporting actor')
		assert.deepEqual(success(await f.call('inspect_brainstorm', { itemId: handle(accepted).itemId })), current, 'retention changes no work/composition revision, accepted handoff or result')
		retains(current, competingResult, 'the actual competing result remains the accepted recorded output')
		await f.connect({ file: true })
		assert.deepEqual(failure(await f.call(tool, input), /revision|stale|changed/i), refused, 'restart recovers the original refusal, including exact draft and expected/actual facts')
		assert.deepEqual(f.snapshot(), retained, 'refusal replay adds no duplicate conflict event or work mutation')
		const changed = operation === 'prepare'
			? { ...input, context: context + 'CHANGED LOGICAL BODY — not an authorized overwrite.\r\n' }
			: { ...input, result: { ...result, artifact: result.artifact + 'CHANGED LOGICAL BODY — not an authorized overwrite.\r\n' } }
		failure(await f.call(tool, changed), /request.*conflict|different input|already used/i)
		assert.deepEqual(f.snapshot(), retained, 'changed-body reuse cannot replace the rejected draft or append a second conflict event')
		assert.deepEqual(success(await f.call('inspect_brainstorm', { itemId: handle(accepted).itemId })), current)
	} finally { await f.close() }
})

test('two asymmetric works cannot borrow handoffs, overwrite peers, or contaminate continuation', async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const first = await capture(f, 'first'), second = await capture(f, 'second', 'PRIVATE SECOND WORK — maritime copper sailboats 719\r\n')
		const preparedA = await prepare(f, first, 'prepare-a'), preparedB = await prepare(f, second, 'prepare-b')
		assert.notEqual(handoff(preparedA).id, handoff(preparedB).id)
		const before = f.snapshot()
		failure(await f.call('record_brainstorm', { requestId: 'cross-work', ...handle(preparedB), actor: reporter, handoffId: handoff(preparedA).id, result: reportedResult }), /handoff|work|item|scope/i)
		assert.deepEqual(f.snapshot(), before)
		const recorded = success(await f.call('record_brainstorm', { requestId: 'correct-a', ...handle(preparedA), actor: reporter, handoffId: handoff(preparedA).id, result: reportedResult }))
		const next = await prepare(f, recorded, 'continue-a')
		retains(handoff(next), reportedResult, 'authorized same-work result reaches continuation')
		assert.ok(!JSON.stringify(next).includes('maritime copper sailboats 719'), 'unrelated exact source never reaches another work')
		const inspectB = success(await f.call('inspect_brainstorm', { itemId: handle(second).itemId }))
		assert.deepEqual(handle(inspectB), handle(preparedB), 'failed cross-work record did not advance the target')
		assert.ok(!JSON.stringify(inspectB).includes('A shared shelf'), 'peer work did not inherit another result')
		assert.equal(f.snapshot()!.items.length, 2, 'no synthesized discovery/delivery work')
	} finally { await f.close() }
})

test('concurrent distinct prepares with one expected revision commit exactly one handoff and refuse the stale competitor', async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const captured = await capture(f), initialEvents = f.snapshot()!.events.length
		const inputs = ['LEFT — 雪\r\n', 'RIGHT — 🦉\r\n'].map((context, index) => ({ requestId: `competing-${index}`, ...handle(captured), actor, context }))
		const responses = await Promise.all(inputs.map(input => f.call('prepare_brainstorm', input)))
		const winners = responses.filter(response => object(response).isError !== true), losers = responses.filter(response => object(response).isError === true)
		assert.equal(winners.length, 1); assert.equal(losers.length, 1)
		const winner = success(winners[0]), packet = handoff(winner)
		const refused = failure(losers[0], /revision|stale|changed/i)
		const losingInput = inputs[responses.indexOf(losers[0])]!
		retains(refused.context, handle(captured).revision, 'concurrent refusal reports expected revision')
		retains(refused.context, handle(winner).revision, 'concurrent refusal reports winning actual revision')
		const inspected = success(await f.call('inspect_brainstorm', { itemId: handle(captured).itemId }))
		assert.deepEqual(handle(inspected), handle(winner))
		assert.equal(array(object(inspected.brainstorm).handoffs).length, 1)
		retains(inspected, packet, 'the sole accepted packet is the saved handoff')
		assert.deepEqual(array(object(inspected.brainstorm).results), [], 'neither competing preparation fabricates a recorded result')
		const retained = f.snapshot()!, added = retained.events.slice(initialEvents)
		assert.deepEqual(added.map(event => event.kind).sort(), ['brainstorm-conflict', 'brainstorm-prepared'], 'exactly one accepted preparation and one retained stale refusal, with no other event types')
		const conflict = added.find(event => event.kind === 'brainstorm-conflict')!
		assert.equal(conflict.item, handle(captured).itemId)
		retains(conflict, losingInput.requestId, 'conflict event belongs to the actual losing request')
		retains([refused.context, conflict], losingInput.context, 'losing context is preserved without becoming an accepted handoff')
		const acceptedEvent = added.find(event => event.kind === 'brainstorm-prepared')!
		retains(acceptedEvent, packet.id, 'accepted event identifies only the winning handoff')
		await f.connect({ file: true })
		assert.deepEqual(failure(await f.call('prepare_brainstorm', losingInput), /revision|stale|changed/i), refused)
		assert.deepEqual(f.snapshot(), retained, 'concurrent loser retry recovers its durable refusal without a duplicate conflict event')
		assert.deepEqual(success(await f.call('inspect_brainstorm', { itemId: handle(captured).itemId })), inspected, 'loser replay does not advance the winner’s work revision')
	} finally { await f.close() }
})

test('B11: pinned seed and exact material survive a deliberate library update in a disposable runtime copy', async () => {
	const f = await productFixture({ copyRuntime: true })
	try {
		await f.connect()
		const captured = await capture(f), prepared = await prepare(f, captured)
		const packet = handoff(prepared), before = f.snapshot()
		await f.disconnect()
		assert.ok(f.copiedRuntime)
		const asset = join(f.copiedRuntime, 'brainstorm/skills/brainstorm/SKILL.md')
		const original = readFileSync(asset, 'utf8'), changed = original + '\nLIBRARY UPDATE SENTINEL — not the selected seed 413\n'
		writeFileSync(asset, changed)
		assert.notEqual(readFileSync(asset, 'utf8'), seed('brainstorm'), 'asymmetric control really changes library bytes, not a response hash')
		await f.connect({ file: true })
		const replay = success(await f.call('prepare_brainstorm', { requestId: 'prepare', ...handle(captured), actor }))
		assert.deepEqual(replay, prepared, 'receipt recovers original pin even when expected revision is old')
		assert.deepEqual(f.snapshot(), before)
		const inspected = success(await f.call('inspect_brainstorm', { itemId: handle(captured).itemId }))
		retains(inspected, original, 'saved inspection retains selected seed bytes after restart')
		assert.ok(!JSON.stringify(inspected).includes('LIBRARY UPDATE SENTINEL'))
		const recorded = success(await f.call('record_brainstorm', { requestId: 'after-library-change', ...handle(prepared), actor: reporter, handoffId: packet.id, result: reportedResult }))
		const resumed = await prepare(f, recorded, 'resume-pinned')
		selectedBodies(handoff(resumed)); retains(handoff(resumed), reportedResult, 'updated library cannot erase earlier decisions')
		assert.ok(!JSON.stringify(resumed).includes('LIBRARY UPDATE SENTINEL'))
		await observesUpdatedSeed(f, changed)
	} finally { await f.close() }
})

test('complete saved material/handoff resources are discoverable and refuse unknown URI and path-escape reads', async () => {
	const f = await productFixture()
	try {
		const client = await f.connect()
		const captured = await capture(f), prepared = await prepare(f, captured)
		const listed = await bounded(client.listResources(), 'list saved resources')
		const uris = [...new Set([...nodes(prepared), ...nodes(listed)].filter(node => node && typeof node === 'object' && !Array.isArray(node)).map(object).map(node => node.uri).filter((uri): uri is string => typeof uri === 'string'))]
		assert.ok(uris.length >= 2, 'source and saved handoff resource URIs are public/discoverable, not guessed private paths')
		const bodies: unknown[] = []
		for (const uri of uris) {
			const response = await bounded(client.readResource({ uri }), 'read scoped resource')
			for (const content of response.contents) {
				assert.equal(content.uri, uri)
				const body = text(object(content).text)
				try { bodies.push(JSON.parse(body)) } catch { bodies.push(body) }
			}
		}
		retains(bodies, roughSource, 'complete source is retrievable without whitespace normalization')
		retainsText(bodies, text(handoff(prepared).id), 'saved packet is retrievable by durable handoff identity')
		retains(bodies, seed('brainstorm'), 'resource supplies actual pinned instructions, not metadata alone')
		const secret = join(f.root, 'outside-grant.txt'), sentinel = 'PRIVATE-OUTSIDE-GRANT-489-雪'
		writeFileSync(secret, sentinel)
		const before = f.snapshot()
		for (const uri of ['file://' + secret, 'made-well://unknown/../../outside-grant.txt', `${uris[0]}/../../outside-grant.txt`, `${uris[0]}%2f..%2f..%2foutside-grant.txt`]) {
			let refused = false
			try {
				const response = await bounded(client.readResource({ uri }), 'refuse resource escape')
				assert.ok(!JSON.stringify(response).includes(sentinel), 'private bytes must not appear even in an error result')
				refused = object(response).isError === true
			} catch (error) {
				assert.ok(error instanceof Error)
				assert.ok(!error.message.includes(sentinel))
				assert.match(error.message, /resource|uri|unknown|invalid|scope|grant|not.found|path/i)
				refused = true
			}
			assert.equal(refused, true, 'an unrecognized resource cannot be a successful arbitrary file read')
		}
		assert.deepEqual(f.snapshot(), before, 'resource reads/refusals do not mutate saved work')
		assert.equal(readFileSync(secret, 'utf8'), sentinel)
	} finally { await f.close() }
})

test('a different startup source root cannot resume another root’s work or recover its logical receipt', async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const captured = await capture(f), prepared = await prepare(f, captured), before = f.snapshot()
		const crossRootDraft = 'UNAUTHORIZED ROOT DRAFT — 鳥 / 🦉\r\nThis must never become retained conflict evidence in another root.  \r\n'
		let connected = false
		try { await f.connect({ grantedRoot: f.other, file: true }); connected = true } catch {
			const refused = await f.disconnect()
			assert.ok(refused, 'connection failure alone is not proof of source-root authorization')
			failure({ isError: true, content: [{ type: 'text', text: JSON.stringify(refused) }] }, /root|scope|source|grant|permission/i)
			assert.ok(!JSON.stringify(refused).includes('no ticket gate'))
			assert.ok(!JSON.stringify(refused).includes(text(handoff(prepared).id)))
			assert.deepEqual(f.snapshot(), before)
		}
		if (connected) for (const [tool, input] of [
			['inspect_brainstorm', { itemId: handle(captured).itemId }],
			['prepare_brainstorm', { requestId: 'prepare', ...handle(captured), actor }],
			['prepare_brainstorm', { requestId: 'cross-root-rejected-draft', ...handle(captured), actor, context: crossRootDraft }],
			['capture_brainstorm', { requestId: 'capture', source: roughSource, actor }],
		] as const) {
			const response = await f.call(tool, input)
			failure(response, /root|scope|source|grant|conflict|permission/i)
			if (tool !== 'capture_brainstorm') assert.ok(!JSON.stringify(response).includes('no ticket gate'), 'refusal does not leak material not supplied in this request')
			assert.ok(!JSON.stringify(response).includes(text(handoff(prepared).id)), 'cross-root receipt does not leak saved handoff identity')
			assert.deepEqual(f.snapshot(), before)
		}
		await f.connect({ file: true })
		assert.deepEqual(success(await f.call('prepare_brainstorm', { requestId: 'prepare', ...handle(captured), actor })), prepared, 'original authorized root retains receipt recovery')
		const authorized = await prepare(f, prepared, 'cross-root-rejected-draft', { context: 'PERMITTED ROOT CONTEXT — accepted only after authorization.\r\n' })
		light(authorized)
		assert.ok(!nodes(f.snapshot()).includes(crossRootDraft), 'wrong-root material is not retained as a stale draft or event')
	} finally { await f.close() }
})

test('SDK schema/type/unknown-property controls do not create work, accept forged authority, or fake performed Deep', async () => {
	const f = await productFixture()
	try {
		await f.connect()
		const before = f.snapshot()
		await rejectedInput(f, 'capture_brainstorm', { requestId: 'bad-source', source: 7, actor }, /source|string|valid|schema/i)
		assert.deepEqual(f.snapshot(), before)
		await rejectedInput(f, 'not_a_product_tool', {}, /unknown|not.found|not_a_product_tool/i)
		assert.deepEqual(f.snapshot(), before)
		const captured = await capture(f), prepared = await prepare(f, captured), ready = f.snapshot()
		await rejectedInput(f, 'prepare_brainstorm', { requestId: 'forged-access', ...handle(prepared), actor, effort: 'deep', paid: true, entitlement: 'client-says-so' }, /unknown|unrecognized|paid|entitle|access|valid|schema/i)
		assert.deepEqual(f.snapshot(), ready)
		await rejectedInput(f, 'record_brainstorm', { requestId: 'false-deep', ...handle(prepared), actor: reporter, handoffId: handoff(prepared).id, result: { ...reportedResult, performedEffort: 'deep' } }, /light|effort|valid|schema/i)
		assert.deepEqual(f.snapshot(), ready)
		await f.connect({ file: true })
		const correctedRecord = success(await f.call('record_brainstorm', { requestId: 'false-deep', ...handle(prepared), actor: reporter, handoffId: handoff(prepared).id, result: reportedResult }))
		assert.deepEqual(object(correctedRecord.recorded).result, reportedResult, 'malformed results reserve no refusal receipt that would block a valid request under that unused ID')
		light(await prepare(f, correctedRecord, 'forged-access'))
		const correctedCapture = success(await f.call('capture_brainstorm', { requestId: 'bad-source', source: 'A valid source after an unretained schema refusal — 雪\r\n', actor }))
		assert.notEqual(handle(correctedCapture).itemId, handle(captured).itemId, 'schema-invalid capture does not reserve its request identity')
	} finally { await f.close() }
})
