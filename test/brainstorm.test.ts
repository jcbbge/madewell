import assert from 'node:assert/strict'
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { Effect } from 'effect'
import { ManagedEffortAccess } from '../src/managed-effort.ts'
import { PortableWork, portableWorkLayer } from '../src/portable-work.ts'
import { loadSkillPackage, readSkillFile } from '../src/skill-package.ts'
import { Store, openStore } from '../src/store.ts'
import {
	actor, array, bounded, conversation, decoded, digest, failure, handle, handoff, light, nodes, object, observesUpdatedSeed,
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

test('M5: default Delivery ordinary instructions and exact reported result survive MCP restart and receipt recovery', async () => {
	const f = await productFixture()
	const source = '  Selected task — 雪 / e\u0301 / 🦉\r\nKeep the settled outcome.  \r\n'
	const context = '  Existing answer — β\r\nNo permission to execute.  \r\n'
	const result = { artifact: '# Reported approach — 鳥\r\n  Not independently verified.  \r\n', sources: ['operator source'], decisions: ['Keep settled outcome'], unknowns: ['Actual availability'], performedEffort: 'light' }
	const work = async (name: string, input: Value) => {
		const response = object(await f.call(name, input)), value = decoded(response)
		assert.notEqual(response.isError, true, JSON.stringify(response))
		assert.deepEqual(response.structuredContent, value)
		assert.equal(value.executionAuthorized, false)
		return value
	}
	try {
		await f.connect({ file: true })
		const captured = await work('capture_work', { requestId: 'default-delivery', actor, source, component: '/delivery' })
		const prepared = await work('prepare_work', { requestId: 'default-ideation', ...handle(captured), actor, context })
		const packet = handoff(prepared), node = object(packet.node), method = object(node.method), pkg = object(method.package)
		assert.equal(node.address, '/delivery/ideation')
		assert.equal(node.input, 'madewell.candidates.v1'); assert.equal(node.output, 'madewell.delivery.ideation.output.v1')
		assert.equal(method.kind, 'skill'); assert.equal(pkg.name, 'madewell-ideating')
		assert.equal(pkg.instructions, readFileSync(join(text(pkg.origin), 'SKILL.md'), 'utf8'))
		assert.equal(packet.source, source); assert.equal(packet.context, context)
		assert.equal(packet.effectiveEffort, 'light'); assert.equal(packet.contributionSchema, null)
		const recordInput = { requestId: 'default-ideation-record', ...handle(prepared), actor: reporter, handoffId: text(packet.id), result }
		const recorded = await work('record_work', recordInput)
		assert.deepEqual(object(recorded.recorded).result, result)
		assert.equal(object(recorded.recorded).validation, 'contract-accepted-not-independently-verified')
		await f.disconnect()
		await f.connect({ file: true })
		const inspected = await work('inspect_work', { itemId: handle(captured).itemId })
		assert.equal(inspected.source, source); assert.equal(inspected.revision, recorded.revision)
		assert.deepEqual(object(inspected.portable).selection, object(captured.portable).selection)
		retains(inspected, packet, 'restart preserves exact canonical method pin, source and context')
		retains(inspected, result, 'restart preserves the natural reported artifact without treating it as acceptance')
		const beforeReplay = f.snapshot()
		assert.deepEqual(await work('record_work', recordInput), recorded)
		assert.deepEqual(f.snapshot(), beforeReplay, 'exact retry recovers the receipt without another transition')
		const next = await work('prepare_work', { requestId: 'default-planning', ...handle(inspected), actor })
		const successor = handoff(next), successorNode = object(successor.node)
		assert.equal(successorNode.address, '/delivery/planning')
		assert.equal(object(object(successorNode.method).package).name, 'madewell-planning')
		retains(successor.priorResults, result, 'next selected canonical consumer receives the actual accepted prefix')
		f.assertNoExecution()
	} finally { await f.close() }
})

test('canonical effort adapter: trusted Focused planner and cumulative Deep pin source, declaration and receipts without new authority', async () => {
	const f = await productFixture({ existingStore: false })
	let store = openStore(f.storePath), allowed = true, decisions = 0
	const access: ManagedEffortAccess['Service'] = { decide: binding => {
		decisions++
		return allowed ? { allowed: true, provenance: 'independent-canonical-effort-host/v1', binding } : { allowed: false, reason: 'Trusted host unavailable' }
	} }
	const invoke = (operation: 'capture' | 'prepare' | 'record' | 'inspect', input: unknown) => Effect.runPromise(Effect.gen(function* () {
		return yield* (yield* PortableWork)[operation](input)
	}).pipe(Effect.provide(portableWorkLayer({ root: f.project })), Effect.provideService(Store, store), Effect.provideService(ManagedEffortAccess, access)))
	const source = '  Fixed approach — 雪 / e\u0301 / 🦉\r\nNo execution or publication.  \r\n'
	const context = '  Keep settled C-1; proof unavailable is unknown.  \r\n'
	// Compare the entire JSON value across the Store serialization boundary;
	// YAML's intentionally null-prototype maps are not wire-level distinctions.
	const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value))
	try {
		// This is the pre-fix positive: host access is genuinely provisioned, but
		// the old default resolver supplies no authored non-Light recipe.
		const captured = object(await invoke('capture', { requestId: 'canonical-capture', actor, source, component: '/delivery/planning' }))
		const prepareInput = { requestId: 'canonical-focused', ...handle(captured), actor, effort: 'focused', context, outputLength: 'short' }
		const prepared = object(await invoke('prepare', prepareInput)), packet = handoff(prepared), recipe = object(packet.recipe)
		const method = object(object(packet.node).method), pkg = object(method.package)
		const body = readFileSync(join(repository, 'skills/method-library/madewell-planning/SKILL.md'), 'utf8')
		const inventory = object(JSON.parse(readFileSync(join(repository, 'skills/method-library/PROVENANCE.json'), 'utf8')))
		const pin = array(inventory.files).map(object).find(file => file.path === 'madewell-planning/SKILL.md')!
		assert.equal(pin.sha256, digest(body)); assert.equal(pin.bytes, Buffer.byteLength(body))
		assert.ok(text(method.bindingOrigin).includes(text(inventory.revision)))
		assert.equal(recipe.sourceIdentity, `method-library:effort/1@${text(inventory.revision)}`)
		assert.equal(object(packet.node).address, '/delivery/planning'); assert.equal(pkg.name, 'madewell-planning')
		assert.equal(pkg.instructions, body); assert.equal(recipe.instructionBytes, body)
		assert.equal(packet.source, source); assert.equal(packet.context, context); assert.equal(packet.outputLength, 'short')
		assert.equal(packet.requestedEffort, 'focused'); assert.equal(packet.effectiveEffort, 'focused'); assert.equal(recipe.classification, 'protected')
		assert.ok(text(recipe.instructions).includes('settle the smallest feasible fixed brief with all scope, inputs, conditions, proof owners/availability and recovery obligations.'))
		assert.ok(text(recipe.instructions).includes('additionally inspect affected consumers and a material sequencing/contingency seam; show how actual findings change or support the brief.'))
		assert.ok(!text(recipe.instructions).includes('additionally resolve difficult dependencies'), 'Focused is not Deep')
		assert.ok(!text(recipe.instructions).includes('compare a material feasible alternative'), 'planner must not receive Ideation work')
		assert.equal(recipe.declarationDigest, digest(text(recipe.declaration)))
		const declaration = object(JSON.parse(text(recipe.declaration))), variants = object(declaration.variants)
		assert.equal(declaration.version, 1); assert.equal(declaration.default, 'light')
		assert.equal(object(variants.focused).instructions, recipe.instructions)
		const args = object(method.args), raw = args.effortRecipes
		assert.deepEqual(json(typeof raw === 'string' ? JSON.parse(raw) : raw), json(declaration), 'prepared recipe derives from captured explicit declaration')
		assert.equal(recipe.methodIdentity, method.identity); assert.equal(recipe.occurrence, '/delivery/planning')
		const authorization = object(packet.effortAuthorization), bound = object(authorization.binding)
		assert.equal(authorization.provenance, 'independent-canonical-effort-host/v1')
		assert.equal(bound.recipeDigest, recipe.digest); assert.equal(bound.sourceIdentity, recipe.sourceIdentity)
		assert.equal(bound.methodIdentity, method.identity); assert.equal(bound.revision, captured.revision)
		assert.equal(prepared.executionAuthorized, false); assert.ok(decisions > 0)
		const saved = structuredClone(prepared), count = decisions
		allowed = false; store.close(); store = openStore(f.storePath)
		assert.deepEqual(json(await invoke('prepare', prepareInput)), json(saved), 'restart/outage recovers exact receipt before policy')
		assert.equal(decisions, count)
		const result = { artifact: 'Partial fixed brief — C-1\r\nNo checks run; proof owner still owes evidence.\r\n', sources: ['C-1'], decisions: [], unknowns: ['Live proof'], performedEffort: 'focused' }
		const recordInput = { requestId: 'canonical-record', ...handle(prepared), actor: reporter, handoffId: packet.id, result }
		const recorded = object(await invoke('record', recordInput))
		assert.equal(object(recorded.recorded).validation, 'contract-accepted-not-independently-verified')
		assert.deepEqual(json(object(recorded.recorded).result), json(result))
		assert.deepEqual(json(await invoke('record', recordInput)), json(recorded))
		const inspected = object(await invoke('inspect', { itemId: handle(captured).itemId }))
		assert.deepEqual(json(object(inspected.portable).selection), json(object(captured.portable).selection))
		retains(inspected, packet, 'accepted record never retrofits the prepared source/declaration/authorization')
		assert.equal(decisions, count, 'record and receipts do not reauthorize already prepared work')
		const deepCapture = object(await invoke('capture', { requestId: 'canonical-deep-capture', actor, source, component: '/delivery/planning' }))
		const deepInput = { requestId: 'canonical-deep', ...handle(deepCapture), actor, effort: 'deep', outputLength: 'short' }
		await assert.rejects(invoke('prepare', deepInput), /access|protected|unavailable/i)
		assert.deepEqual(json(await invoke('inspect', { itemId: handle(deepCapture).itemId })), json(deepCapture), 'refusal evidence changes neither revision nor accepted selection/handoffs')
		allowed = true
		await assert.rejects(invoke('prepare', deepInput), /access|protected|unavailable/i, 'the saved denied receipt remains denied after host access changes')
		const deep = handoff(await invoke('prepare', { ...deepInput, requestId: 'canonical-deep-authorized' })), deepRecipe = object(deep.recipe)
		assert.equal(deep.effectiveEffort, 'deep'); assert.equal(deep.outputLength, 'short')
		for (const wording of ['settle the smallest feasible fixed brief', 'additionally inspect affected consumers', 'additionally resolve difficult dependencies using accessible primary material and concrete failure/recovery examples before freezing the brief. Missing inputs remain owned gaps rather than fictional resolution.']) assert.ok(text(deepRecipe.instructions).includes(wording))
		assert.equal(deepRecipe.instructionBytes, body); assert.equal(deepRecipe.declaration, recipe.declaration)
		assert.notEqual(deepRecipe.digest, recipe.digest)
		assert.deepEqual(json(await invoke('prepare', prepareInput)), json(saved), 'a later Deep preparation never rewrites a historical Focused receipt')
		f.assertNoExecution()
	} finally { store.close(); await f.close() }
})

test('canonical effort adapter: default stdio denies protected methods, Land stays Light and project names/prose cannot mint recipes', async () => {
	const f = await productFixture(), local = join(f.project, 'canonical-spoof')
	const work = async (name: string, input: Value) => {
		const response = object(await f.call(name, input)), value = decoded(response)
		assert.notEqual(response.isError, true, JSON.stringify(response)); assert.deepEqual(response.structuredContent, value)
		assert.equal(value.executionAuthorized, false); assert.equal(value.independentlyVerified, false)
		return value
	}
	try {
		await f.connect({ file: true })
		for (const component of ['/delivery/planning', '/discovery/declare', '/landing']) {
			const captured = await work('capture_work', { requestId: `deny-capture-${component}`, actor, source: roughSource, component })
			for (const effort of ['focused', 'deep']) {
				const before = f.snapshot()
				const error = failure(await f.call('prepare_work', { requestId: `deny-${component}-${effort}`, ...handle(captured), actor, effort }), component === '/landing' ? /does not author|requested effort|availableEffort/i : /protected|access|entitle|unavailable/i)
				assert.equal(error.error, component === '/landing' ? 'portable_invalid' : 'brainstorm_entitlement_unavailable', 'authored-but-denied must differ from unsupported Landing effort')
				assert.deepEqual(f.snapshot()!.items, before!.items, 'refused drafts/receipts may be retained, but never change accepted work or create a handoff')
			}
			const free = handoff(await work('prepare_work', { requestId: `free-${component}`, ...handle(captured), actor }))
			assert.equal(free.effectiveEffort, 'light'); assert.equal(object(free.recipe).classification, 'free-light')
			assert.equal(object(free.effortAuthorization).provenance, 'builtin:free-light/1')
		}
		const ordinary = readFileSync(join(repository, 'skills/method-library/madewell-planning/SKILL.md'), 'utf8')
		for (const [name, body] of [['madewell-planning', ordinary], ['third-party', ordinary.replaceAll('madewell-planning', 'third-party')]]) {
			mkdirSync(join(local, name!), { recursive: true })
			writeFileSync(join(local, name!, 'SKILL.md'), body!)
			const config = `canonical-spoof/${name}.json`
			writeFileSync(join(f.project, config), JSON.stringify({ schemaVersion: 1, bindings: { '/delivery/planning': { skill: `./${name}`, input: 'madewell.delivery.ideation.output.v1', output: 'madewell.delivery.planning.output.v1' } } }))
			const captured = await work('capture_work', { requestId: `spoof-${name}`, actor, source: roughSource, component: '/delivery/planning', config })
			for (const effort of ['focused', 'deep']) {
				const before = f.snapshot()
				const error = failure(await f.call('prepare_work', { requestId: `spoof-${name}-${effort}`, ...handle(captured), actor, effort }), /does not author|requested effort|availableEffort/i)
				assert.equal(error.error, 'portable_invalid', 'ordinary prose has no variants even before access is considered')
				assert.deepEqual(f.snapshot()!.items, before!.items, 'refusal evidence never advances the accepted ordinary selection')
			}
			const prepared = await work('prepare_work', { requestId: `spoof-free-${name}`, ...handle(captured), actor })
			assert.equal(object(handoff(prepared).recipe).declaration, null)
			assert.equal(object(object(object(handoff(prepared).node).method).package).instructions, body)
		}
		rmSync(local, { recursive: true, force: true })
		f.assertNoExecution()
	} finally { rmSync(local, { recursive: true, force: true }); await f.close() }
})

test('canonical effort continuation: Implementation Deep retains an honestly lower report without relabeling authorization or inventing third-party ordering', async () => {
	const f = await productFixture({ existingStore: false }), local = join(f.project, 'performed-effort')
	let store = openStore(f.storePath), decisions = 0, allowed = true
	const access: ManagedEffortAccess['Service'] = { decide: binding => {
		decisions++
		return allowed ? { allowed: true, provenance: 'independent-performed-effort-host/v1', binding } : { allowed: false, reason: 'Trusted access now unavailable' }
	} }
	const invoke = (operation: 'capture' | 'prepare' | 'record' | 'inspect', input: unknown) => Effect.runPromise(Effect.gen(function* () {
		return yield* (yield* PortableWork)[operation](input)
	}).pipe(Effect.provide(portableWorkLayer({ root: f.project })), Effect.provideService(Store, store), Effect.provideService(ManagedEffortAccess, access)))
	const source = '  Fixed brief B-1 — 雪\r\nDraft two supplied lines only. No intermediate checkpoints, difficult transformation or failure/recovery exercise is included. Do not add work or publish.  \r\n'
	const result = { artifact: 'First supplied line.\r\nSecond supplied line.\r\n', sources: ['B-1'], decisions: ['Follow B-1 without added exercises'], unknowns: ['No independent verification performed'], performedEffort: 'light', performedWork: 'Completed B-1 drafting only. No Focused checkpoints or Deep transformation/recovery exercise was included in B-1 or performed; no additional deeper work is established for this brief.' }
	try {
		const captured = object(await invoke('capture', { requestId: 'performed-capture', actor, source, component: '/delivery/implementation' }))
		const prepareInput = { requestId: 'performed-deep', ...handle(captured), actor, effort: 'deep' }
		const prepared = object(await invoke('prepare', prepareInput)), packet = handoff(prepared)
		assert.equal(object(object(object(packet.node).method).package).name, 'madewell-implementing')
		assert.equal(packet.requestedEffort, 'deep'); assert.equal(packet.effectiveEffort, 'deep')
		assert.ok(text(object(packet.recipe).instructions).includes('Otherwise no distinct Deep implementation recipe exists'))
		const originalPacketBytes = JSON.stringify(packet), originalSelectionBytes = JSON.stringify(object(prepared.portable).selection)
		const recordInput = { requestId: 'performed-light-report', ...handle(prepared), actor: reporter, handoffId: packet.id, result }
		const recorded = object(await invoke('record', recordInput))
		assert.equal(JSON.stringify(object(recorded.recorded).result), JSON.stringify(result), 'honest actual work and explicit missing deeper work remain attributed reports')
		assert.equal(object(recorded.recorded).validation, 'contract-accepted-not-independently-verified')
		assert.equal(recorded.independentlyVerified, false); assert.equal(recorded.executionAuthorized, false)
		assert.equal(JSON.stringify(array(object(recorded.portable).handoffs)[0]), originalPacketBytes, 'requested/effective/declaration/authorization bytes are never downgraded to the reported Light')
		assert.equal(JSON.stringify(object(recorded.portable).selection), originalSelectionBytes)
		const count = decisions, recordBytes = JSON.stringify(recorded), preparedBytes = JSON.stringify(prepared)
		allowed = false; store.close(); store = openStore(f.storePath)
		assert.equal(JSON.stringify(await invoke('record', recordInput)), recordBytes, 'exact record receipt survives restart and access outage')
		assert.equal(JSON.stringify(await invoke('prepare', prepareInput)), preparedBytes)
		const inspected = object(await invoke('inspect', { itemId: handle(captured).itemId }))
		assert.equal(JSON.stringify(array(object(inspected.portable).handoffs)[0]), originalPacketBytes)
		assert.equal(JSON.stringify(array(object(inspected.portable).results)[0]), JSON.stringify(recorded.recorded))
		assert.equal(decisions, count, 'reporting lower actual work is not a new preparation, grant or billing decision')
		allowed = true
		for (const [effective, performed] of [['focused', 'light'], ['deep', 'focused']] as const) {
			const brief = performed === 'focused' ? 'Fixed brief B-2: draft the supplied two lines and retain its specified intermediate checkpoint after line one. No difficult transformation or recovery exercise is included.' : source
			const lowerResult = { ...result, performedEffort: performed, ...(performed === 'focused' ? { sources: ['B-2'], decisions: ['Follow only the B-2 specified checkpoint'], performedWork: 'Drafted both lines; retained the B-2 line-one intermediate checkpoint. No Deep transformation or failure/recovery exercise was specified or performed.' } : {}) }
			const capture = object(await invoke('capture', { requestId: `lower-capture-${effective}`, actor, source: brief, component: '/delivery/implementation' }))
			const ready = object(await invoke('prepare', { requestId: `lower-prepare-${effective}`, ...handle(capture), actor, effort: effective }))
			const accepted = object(await invoke('record', { requestId: `lower-record-${effective}`, ...handle(ready), actor: reporter, handoffId: handoff(ready).id, result: lowerResult }))
			assert.equal(object(object(accepted.recorded).result).performedEffort, performed)
			assert.equal(JSON.stringify(array(object(accepted.portable).handoffs)[0]), JSON.stringify(handoff(ready)))
			assert.equal(JSON.stringify(object(accepted.portable).selection), JSON.stringify(object(ready.portable).selection))
			assert.equal(accepted.executionAuthorized, false); assert.equal(accepted.independentlyVerified, false)
		}
		for (const [effective, stronger] of [['light', 'focused'], ['focused', 'deep'], ['deep', 'invented-preset']] as const) {
			const capture = object(await invoke('capture', { requestId: `stronger-capture-${effective}`, actor, source, component: '/delivery/implementation' }))
			const prepared = object(await invoke('prepare', { requestId: `stronger-prepare-${effective}`, ...handle(capture), actor, effort: effective }))
			const before = JSON.stringify(object(prepared.portable))
			await assert.rejects(invoke('record', { requestId: `stronger-record-${effective}`, ...handle(prepared), actor: reporter, handoffId: handoff(prepared).id, result: { ...result, performedEffort: stronger } }), /performed|effort|supported|stronger/i)
			const after = object(await invoke('inspect', { itemId: handle(prepared).itemId }))
			assert.equal(after.revision, prepared.revision); assert.equal(JSON.stringify(after.portable), before)
		}
		// An explicit ordinary binding may author identical preset labels (or even
		// identical upstream source/declaration), but it authors no preset ordering.
		const body = readFileSync(join(repository, 'skills/method-library/madewell-implementing/SKILL.md'), 'utf8')
		const recipes = JSON.parse(text(object(packet.recipe).declaration))
		for (const name of ['third-party', 'madewell-implementing']) {
			mkdirSync(join(local, name), { recursive: true })
			writeFileSync(join(local, name, 'SKILL.md'), body.replaceAll('madewell-implementing', name))
			writeFileSync(join(local, `${name}.json`), JSON.stringify({ schemaVersion: 1, bindings: { '/delivery/implementation': { skill: `./${name}`, input: 'madewell.delivery.planning.output.v1', output: 'madewell.delivery.implementation.output.v1', args: { effortRecipes: recipes } } } }))
			const capture = object(await invoke('capture', { requestId: `ordinary-capture-${name}`, actor, source, component: '/delivery/implementation', config: `performed-effort/${name}.json` }))
			const prepared = object(await invoke('prepare', { requestId: `ordinary-prepare-${name}`, ...handle(capture), actor, effort: 'deep' }))
			await assert.rejects(invoke('record', { requestId: `ordinary-lower-${name}`, ...handle(prepared), actor: reporter, handoffId: handoff(prepared).id, result }), /performed|effort|supported/i)
			const after = object(await invoke('inspect', { itemId: handle(prepared).itemId }))
			assert.equal(after.revision, prepared.revision); assert.equal(JSON.stringify(after.portable), JSON.stringify(prepared.portable))
			const exact = object(await invoke('record', { requestId: `ordinary-exact-${name}`, ...handle(prepared), actor: reporter, handoffId: handoff(prepared).id, result: { ...result, performedEffort: 'deep' } }))
			assert.equal(object(object(exact.recorded).result).performedEffort, 'deep', 'control: the ordinary method can record its exact selected label')
		}
		rmSync(local, { recursive: true, force: true }); f.assertNoExecution()
	} finally { store.close(); rmSync(local, { recursive: true, force: true }); await f.close() }
})

test('Landing: selected canonical bytes fail visibly on live corruption while captured ordinary pins and natural closure survive restart', async () => {
	const original = join(repository, 'skills/method-library')
	const body = readFileSync(join(original, 'madewell-landing/SKILL.md'))
	const provenance = object(JSON.parse(readFileSync(join(original, 'PROVENANCE.json'), 'utf8')))
	const f = await productFixture({ copyRuntime: true })
	assert.ok(f.copiedRuntime)
	const library = join(f.copiedRuntime, 'skills/method-library'), landing = join(library, 'madewell-landing')
	const pin = array(provenance.files).map(object).find(file => file.path === 'madewell-landing/SKILL.md')
	const source = '  Unit return — 雪 / e\u0301\r\nRetain the history, no publication.  \r\n'
	const result = { artifact: '# Land — U-paper\r\nDELTA: accepted card A2, not posted.\r\nLEARNED: none.\r\nPROPAGATED: printing owed to print-owner, ref debt-7.\r\nTAX: unknown, no correction measurement.\r\nWARNING: no version label; not a new gate.\r\n', sources: ['A2', 'debt-7'], decisions: ['No automatic promotion or publication'], unknowns: ['Correction measurement'], performedEffort: 'light' }
	const work = async (name: string, input: Value) => {
		const response = object(await f.call(name, input)), value = decoded(response)
		assert.notEqual(response.isError, true, JSON.stringify(response)); assert.deepEqual(response.structuredContent, value)
		assert.equal(value.executionAuthorized, false)
		return value
	}
	try {
		cpSync(join(repository, 'skills'), join(f.copiedRuntime, 'skills'), { recursive: true })
		assert.ok(pin, 'Landing bytes are declared in the distribution source inventory')
		assert.match(text(provenance.revision), /^[a-f0-9]{40}$/)
		assert.equal(pin.sourcePath, 'primitives/skills/madewell-landing/SKILL.md')
		assert.equal(pin.bytes, body.length); assert.equal(pin.sha256, digest(body))
		await f.connect({ file: true })
		const inspected = decoded(await f.call('inspect_composition', { component: '/landing' }))
		assert.equal(inspected.complete, true); assert.deepEqual(inspected.diagnostics, [])
		const live = object(object(object(inspected.root).method).package)
		assert.equal(live.name, 'madewell-landing'); assert.equal(live.instructions, body.toString('utf8'))
		assert.ok(JSON.stringify(inspected).includes(text(provenance.revision)), 'binding provenance identifies the actual published source revision')
		const captured = await work('capture_work', { requestId: 'landing-capture', actor, source, component: '/landing' })
		// Only a disposable runtime copy is damaged; the selected sibling control
		// distinguishes a selected-package failure from an eager whole-library scan.
		writeFileSync(join(landing, 'SKILL.md'), Buffer.concat([body, Buffer.from('\nUNPINNED SOURCE CHANGE\n')]))
		failure(await f.call('inspect_composition', { component: '/landing' }), /stale|digest|hash|integrity|changed|pin|provenance/i)
		assert.equal(decoded(await f.call('inspect_composition', { component: '/discovery' })).complete, true)
		rmSync(join(landing, 'SKILL.md'))
		failure(await f.call('inspect_composition', { component: '/landing' }), /missing|unreadable|absent|file|ENOENT|integrity|The selected skill package has no SKILL\.md\./i)
		const beforeMissing = f.snapshot()!
		failure(await f.call('capture_work', { requestId: 'missing-landing', actor, source, component: '/landing' }), /missing|unreadable|absent|file|ENOENT|integrity|The selected skill package has no SKILL\.md\./i)
		assert.deepEqual(f.snapshot()!.items, beforeMissing.items, 'missing canonical source never falls back or creates placeholder work')
		await f.disconnect()
		await f.connect({ file: true })
		const prepared = await work('prepare_work', { requestId: 'landing-prepare', ...handle(captured), actor })
		const packet = handoff(prepared), pkg = object(object(object(packet.node).method).package)
		assert.equal(object(packet.node).address, '/landing'); assert.equal(packet.contributionSchema, null)
		assert.equal(packet.source, source); assert.equal(packet.effectiveEffort, 'light')
		assert.equal(pkg.identity, live.identity); assert.equal(pkg.instructions, body.toString('utf8'))
		assert.equal(pkg.manifestScope, 'retained-runtime'); assert.equal(Object.hasOwn(pkg, 'scope'), false)
		assert.equal(live.scope, 'runtime'); assert.equal(Object.hasOwn(live, 'manifestScope'), false)
		assert.deepEqual(pkg.manifest, live.manifest)
		const input = { requestId: 'landing-record', ...handle(prepared), actor: reporter, handoffId: packet.id, result }
		const recorded = await work('record_work', input)
		assert.deepEqual(object(recorded.recorded).result, result)
		assert.equal(object(recorded.recorded).validation, 'contract-accepted-not-independently-verified')
		await f.disconnect()
		const client = await f.connect({ file: true })
		const saved = await work('inspect_work', { itemId: handle(captured).itemId })
		assert.deepEqual(object(saved.portable).selection, object(captured.portable).selection)
		retains(saved, packet, 'prepared source and package pins remain exact after live-source loss')
		retains(saved, result, 'closure is attributed, not independently verified or task completion')
		const uri = `madewell://work/items/${handle(captured).itemId}/packages`
		const resource = await bounded(client.readResource({ uri }), 'retained Landing package resource')
		const resourceValue = object(JSON.parse(text(object(resource.contents[0]).text)))
		const files = array(object(resourceValue.packages)[text(pkg.identity)]).map(object)
		assert.deepEqual(files.map(file => file.path).sort(), array(pkg.manifest).map(file => object(file).path).sort())
		for (const file of files) {
			assert.ok(file.encoding === 'utf8' || file.encoding === 'base64')
			const bytes = Buffer.from(text(file.content), file.encoding)
			assert.deepEqual(bytes, readFileSync(join(original, 'madewell-landing', text(file.path))))
			assert.equal(file.bytes, bytes.length); assert.equal(file.sha256, digest(bytes))
		}
		const beforeReplay = f.snapshot()
		assert.deepEqual(await work('record_work', input), recorded)
		assert.deepEqual(f.snapshot(), beforeReplay, 'Land receipt replay neither deletes history nor promotes owed work')
		f.assertNoExecution()
	} finally { await f.close() }
})

test('portable scoped wiring: transitive predecessor and non-last group output exclude unequal sibling results and contexts across restart', async () => {
	const f = await productFixture(), local = join(f.project, 'lineage-contract')
	const token = 'fixture.lineage.v1', source = '  Root — 雪\r\nNo public names.  \r\n'
	const leaf = (id: string) => ({ id, purpose: `Fixture ${id}`, input: token, output: token })
	const branch = { ...leaf('branch'), children: [leaf('alpha'), leaf('kept'), leaf('decoy')], wiring: { inputs: { alpha: '$input', kept: 'alpha', decoy: '$input' }, output: 'kept' } }
	const config = { schemaVersion: 1, composition: { ...leaf('root'), children: [branch, leaf('private'), leaf('consumer'), leaf('explicit')], wiring: { inputs: { branch: '$input', private: '$input', consumer: 'branch', explicit: 'branch' }, output: 'explicit' } }, bindings: Object.fromEntries(['/branch/alpha', '/branch/kept', '/branch/decoy', '/private', '/consumer', '/explicit'].map(address => [address, { skill: './ordinary', input: token, output: token }])) }
	const contexts = ['ALPHA context — α\r\n', 'KEPT context — β\r\n', 'DECOY PRIVATE context — 716\r\n', 'SIBLING PRIVATE context — 923\r\n', 'CONSUMER context — 雪\r\n', 'EXPLICIT CONSUMER context — Ω\r\n']
	const artifacts = ['ALPHA accepted — 19\r\n', 'KEPT group output — 37\r\n', 'DECOY NOT GROUP OUTPUT — 716\r\n', 'SIBLING NOT PREDECESSOR — 923\r\n', 'CONSUMER attributed result\r\n', 'EXPLICIT CONSUMER attributed result\r\n']
	const addresses = ['/branch/alpha', '/branch/kept', '/branch/decoy', '/private', '/consumer', '/explicit']
	const lengths = [null, 'KEEP-LENGTH-13', null, 'BETA-PRIVATE-LENGTH-89', 'KEEP-LENGTH-13', 'EXPLICIT-LENGTH-41']
	const records: unknown[] = [], priorInputs: Value[] = [], preparedPackets: Value[] = []
	const work = async (name: string, input: Value) => {
		const response = object(await f.call(name, input)), value = decoded(response)
		assert.notEqual(response.isError, true, JSON.stringify(response)); assert.deepEqual(response.structuredContent, value)
		assert.equal(value.executionAuthorized, false)
		return value
	}
	try {
		mkdirSync(join(local, 'ordinary'), { recursive: true })
		writeFileSync(join(local, 'ordinary/SKILL.md'), '---\nname: ordinary\ndescription: Inert scoped continuity fixture.\n---\nReturn only declared material.\n')
		writeFileSync(join(local, 'config.json'), JSON.stringify(config))
		await f.connect({ file: true })
		let current = await work('capture_work', { requestId: 'lineage-capture', actor, source, component: '/', config: 'lineage-contract/config.json' })
		const selection = object(current.portable).selection
		for (const [index, address] of addresses.entries()) {
			if (index === 4) { await f.disconnect(); await f.connect({ file: true }); current = await work('inspect_work', { itemId: handle(current).itemId }) }
			const prepareInput = { requestId: `lineage-prepare-${index}`, ...handle(current), actor, context: contexts[index], ...([1, 3, 5].includes(index) ? { outputLength: lengths[index] } : {}) }
			current = await work('prepare_work', prepareInput)
			const packet = handoff(current)
			assert.equal(object(packet.node).address, address); assert.equal(packet.source, source)
			assert.equal(packet.outputLength, lengths[index], 'omitted preference follows declared lineage; fresh $input has none; explicit value wins')
			if (index >= 4) assert.ok(!JSON.stringify(packet).includes('BETA-PRIVATE-LENGTH-89'), 'scan the whole consumer handoff, not just priorResults/context')
			const lineage = index === 1 ? [0] : index >= 4 ? [0, 1] : []
			assert.deepEqual(packet.priorResults, lineage.map(i => records[i]), 'exact result list is transitive declared lineage, not every prior occurrence')
			assert.deepEqual(packet.priorInputs, lineage.map(i => priorInputs[i]), 'only predecessor contexts and original attribution accompany results')
			for (const excluded of [2, 3]) if (excluded !== index) {
				assert.ok(!JSON.stringify(packet).includes(contexts[excluded]!.trim()))
				assert.ok(!JSON.stringify(packet).includes(artifacts[excluded]!.trim()))
			}
			if (index === 0) {
				const before = await work('inspect_work', { itemId: handle(current).itemId })
				const changed = structuredClone(config), changedBranch = { ...branch, wiring: { ...branch.wiring, output: 'decoy' } }
				changed.composition.children[0] = changedBranch
				writeFileSync(join(local, 'changed-wiring.json'), JSON.stringify(changed))
				failure(await f.call('replace_work', { requestId: 'lineage-freeze-wiring', ...handle(current), actor, reason: 'Cannot rewrite attempted enclosing wiring', config: 'lineage-contract/changed-wiring.json' }), /frozen|prepar|attempt|wiring|structure|changed/i)
				mkdirSync(join(local, 'other'), { recursive: true })
				writeFileSync(join(local, 'other/SKILL.md'), '---\nname: other\ndescription: Different attempted method.\n---\nDo not rewrite a prepared pin.\n')
				const changedMethod = structuredClone(config); changedMethod.bindings['/branch/alpha']!.skill = './other'
				writeFileSync(join(local, 'changed-method.json'), JSON.stringify(changedMethod))
				failure(await f.call('replace_work', { requestId: 'lineage-freeze-method', ...handle(current), actor, reason: 'Prepared method cannot change', config: 'lineage-contract/changed-method.json' }), /frozen|prepar|attempt|method|changed/i)
				const after = await work('inspect_work', { itemId: handle(current).itemId })
				assert.equal(after.revision, before.revision)
				for (const key of ['selection', 'handoffs', 'results']) assert.deepEqual(object(after.portable)[key], object(before.portable)[key])
				const snapshot = f.snapshot()
				assert.deepEqual(await work('prepare_work', prepareInput), current)
				assert.deepEqual(f.snapshot(), snapshot, 'exact attempted handoff replays despite a separate refused replacement')
			}
			preparedPackets.push(structuredClone(packet))
			priorInputs.push({ handoffId: packet.id, actor, context: contexts[index] })
			const result = { artifact: artifacts[index], sources: [address], decisions: [`Decision ${address}`], unknowns: [], performedEffort: 'light' }
			current = await work('record_work', { requestId: `lineage-record-${index}`, ...handle(current), actor: reporter, handoffId: packet.id, result })
			records.push(current.recorded)
		}
		assert.deepEqual(object(current.portable).selection, selection, 'scoped traversal never rewrites its captured composition')
		assert.deepEqual(object(current.portable).handoffs, preparedPackets, 'later scoped preparation must not retroactively sanitize historical handoffs')
		assert.deepEqual(object(current.portable).results, records, 'private sibling history is retained for the owner, not erased to hide leakage')
	} finally { rmSync(local, { recursive: true, force: true }); await f.close() }
})

test('portable Discovery: repeated independent prefixes conserve their own intents rather than borrowing an earlier sibling chain', async () => {
	const f = await productFixture(), local = join(f.project, 'discovery-lineage')
	const material = 'madewell.material.v1', outputs = ['madewell.discovery.declare.output.v1', 'madewell.discovery.look-first.output.v1', 'madewell.discovery.classify.output.v1']
	const chain = (id: string) => ({ id, purpose: `Independent ${id}`, input: material, output: outputs[2]!, children: ['seed', 'observe', 'account'].map((name, index) => ({ id: name, purpose: name, input: index ? outputs[index - 1]! : material, output: outputs[index]! })), wiring: { inputs: { seed: '$input', observe: 'seed', account: 'observe' }, output: 'account' } })
	const left = chain('left'), right = chain('right')
	const bindings = Object.fromEntries([left, right].flatMap(branch => branch.children.map(child => [`/${branch.id}/${child.id}`, { skill: './ordinary', input: child.input, output: child.output }])))
	const common = { discoveryContract: '2', result: 'Independent supplied contribution', sources: [], unknowns: [], decisions: [], evidence: [], questions: [] }
	const work = async (name: string, input: Value) => {
		const response = object(await f.call(name, input)), value = decoded(response)
		assert.notEqual(response.isError, true, JSON.stringify(response)); assert.deepEqual(response.structuredContent, value)
		assert.equal(value.executionAuthorized, false)
		return value
	}
	try {
		mkdirSync(join(local, 'ordinary'), { recursive: true })
		writeFileSync(join(local, 'ordinary/SKILL.md'), '---\nname: ordinary\ndescription: Declared-contract conservation fixture.\n---\nConserve supplied source identities.\n')
		writeFileSync(join(local, 'config.json'), JSON.stringify({ schemaVersion: 1, composition: { id: 'root', purpose: 'Independent Discovery chains', input: material, output: outputs[2], children: [left, right], wiring: { inputs: { left: '$input', right: '$input' }, output: 'right' } }, bindings }))
		await f.connect({ file: true })
		let current = await work('capture_work', { requestId: 'discovery-lineage-capture', actor, source: roughSource, component: '/', config: 'discovery-lineage/config.json' })
		for (const branch of [left, right]) {
			const evidence = `E-${branch.id}`, intent = `I-${branch.id}`, privacy = `I-private-${branch.id}`
			const claim = (id: string, wording: string) => ({ id, text: wording, sources: [evidence] })
			const declared = { ...common, evidence: [{ id: evidence, ref: `fixture:${branch.id}` }], intent: [{ ...claim(intent, `Actual ${branch.id} outcome`), authority: 'explicit' }, { ...claim(privacy, `Privacy obligation ${branch.id}`), authority: 'explicit' }] }
			const observed = { ...common, observations: [claim(`O-${branch.id}`, 'Available observation, not a private sibling source')] }
			const requirements = [{ ...claim(`R-${branch.id}`, 'Outcome'), kind: 'outcome', origin: 'explicit', intentIds: [intent] }, { ...claim(`R-private-${branch.id}`, 'Privacy'), kind: 'constraint', origin: 'explicit', intentIds: [privacy] }]
			const classified = { ...common, requirements, intentDispositions: [] }
			const accepted: unknown[] = []
			for (const [index, contribution] of [declared, observed, classified].entries()) {
				current = await work('prepare_work', { requestId: `${branch.id}-prepare-${index}`, ...handle(current), actor })
				const packet = handoff(current)
				assert.equal(object(packet.node).address, `/${branch.id}/${branch.children[index]!.id}`)
				assert.deepEqual(packet.priorResults, accepted, 'a new independent prefix starts empty and receives only its own actual records')
				assert.ok(packet.contributionSchema !== null && packet.contributionSchema !== undefined)
				const result = { artifact: `${branch.id} natural artifact ${index}\r\n`, sources: [evidence], decisions: [], unknowns: [], performedEffort: 'light', contribution }
				if (index === 2) {
					const before = await work('inspect_work', { itemId: handle(current).itemId })
					failure(await f.call('record_work', { requestId: `${branch.id}-lost-intent`, ...handle(current), actor: reporter, handoffId: packet.id, result: { ...result, contribution: { ...classified, requirements: requirements.slice(0, 1) } } }), /lost-intent/i)
					const after = await work('inspect_work', { itemId: handle(current).itemId })
					assert.equal(after.revision, before.revision)
					for (const key of ['selection', 'handoffs', 'results']) assert.deepEqual(object(after.portable)[key], object(before.portable)[key], 'conservation refusal cannot advance accepted lineage')
				}
				current = await work('record_work', { requestId: `${branch.id}-record-${index}`, ...handle(current), actor: reporter, handoffId: packet.id, result })
				accepted.push(current.recorded)
			}
		}
	} finally { rmSync(local, { recursive: true, force: true }); await f.close() }
})

test('trusted effort: prepared authority survives outage and exact receipt recovery, while new preparation rechecks access', async () => {
	const f = await productFixture({ existingStore: false }), local = join(f.project, 'trusted-effort')
	let store = openStore(f.storePath), allowed = true, decisions = 0
	const access: ManagedEffortAccess['Service'] = { decide: binding => {
		decisions++
		return allowed ? { allowed: true, provenance: 'independent-host-fixture/v1', binding } : { allowed: false, reason: 'Independent host authority unavailable' }
	} }
	const invoke = (operation: 'capture' | 'prepare' | 'record' | 'inspect', input: unknown) => Effect.runPromise(Effect.gen(function* () {
		const service = yield* PortableWork
		return yield* service[operation](input)
	}).pipe(Effect.provide(portableWorkLayer({ root: f.project })), Effect.provideService(Store, store), Effect.provideService(ManagedEffortAccess, access)))
	try {
		mkdirSync(join(local, 'ordinary'), { recursive: true })
		const instructions = '---\r\nname: ordinary\r\ndescription: Inert independently authored depth fixture.\r\n---\r\nKeep the exact source. 雪\r\n'
		writeFileSync(join(local, 'ordinary/SKILL.md'), instructions)
		const recipes = { version: 1, default: 'light', variants: {
			light: { instructions: 'Use supplied S1.', stopping: 'One useful lead.', evidence: 'Attribute S1.' },
			'inspect-seam': { instructions: 'Compare S1 and S2. 雪\r\n', stopping: 'One discriminating example or missing source.', evidence: 'Cite actual S1/S2 versions and observations.' },
		} }
		const token = 'fixture.effort.v1', leaf = (id: string) => ({ id, purpose: id, input: token, output: token })
		writeFileSync(join(local, 'config.json'), JSON.stringify({ schemaVersion: 1, composition: { ...leaf('root'), children: [leaf('first'), leaf('second')], wiring: { inputs: { first: '$input', second: 'first' }, output: 'second' } }, bindings: Object.fromEntries(['/first', '/second'].map(address => [address, { skill: './ordinary', input: token, output: token, args: { effortRecipes: JSON.stringify(recipes) } }])) }))
		const captured = object(await invoke('capture', { requestId: 'trusted-capture', actor, source: '  Planning only — 雪\r\n', component: '/', config: 'trusted-effort/config.json' }))
		const input = { requestId: 'trusted-prepare', ...handle(captured), actor, effort: 'inspect-seam', outputLength: 'short' }
		const prepared = object(await invoke('prepare', input)), packet = handoff(prepared), recipe = object(packet.recipe)
		assert.equal(recipe.effective, 'inspect-seam'); assert.equal(recipe.classification, 'protected')
		assert.equal(recipe.instructions, recipes.variants['inspect-seam'].instructions); assert.equal(recipe.instructionBytes, instructions)
		assert.equal(recipe.methodIdentity, object(object(packet.node).method).identity)
		assert.equal(recipe.sourceIdentity, object(object(packet.node).method).bindingOrigin)
		assert.equal(object(packet.effortAuthorization).allowed, true)
		const acceptedDecisions = decisions
		assert.ok(acceptedDecisions > 0)
		allowed = false; store.close(); store = openStore(f.storePath)
		assert.deepEqual(await invoke('prepare', input), prepared, 'receipt is recovered before authority is consulted again')
		assert.equal(decisions, acceptedDecisions)
		const result = { artifact: 'Partial comparison — 雪\r\n', sources: ['S1'], decisions: [], unknowns: ['S2 unavailable'], performedEffort: 'inspect-seam', performedWork: 'S1 inspected; S2 comparison remains unperformed.' }
		const recordInput = { requestId: 'trusted-record', ...handle(prepared), actor: reporter, handoffId: packet.id, result }
		const recorded = object(await invoke('record', recordInput))
		assert.deepEqual(object(recorded.recorded).result, result); assert.equal(decisions, acceptedDecisions)
		const before = object(await invoke('inspect', { itemId: handle(recorded).itemId }))
		await assert.rejects(invoke('prepare', { requestId: 'trusted-new-refused', ...handle(recorded), actor, effort: 'inspect-seam' }), /unavailable|denied|access|protected/i)
		assert.ok(decisions > acceptedDecisions, 'a genuinely new protected preparation rechecks current access')
		const after = object(await invoke('inspect', { itemId: handle(recorded).itemId }))
		assert.equal(after.revision, before.revision); assert.deepEqual(after.portable, before.portable)
		assert.deepEqual(await invoke('prepare', input), prepared)
		assert.deepEqual(await invoke('record', recordInput), recorded)
	} finally { store.close(); rmSync(local, { recursive: true, force: true }); await f.close() }
})

test('portable NQ over product MCP: settled identities cannot reset turns; explicit exchange gates record and holds after three answers', async () => {
	const f = await productFixture(), local = join(f.project, 'nq-contract')
	const recipient = { kind: 'agent', label: 'planner — bound recipient' }
	const result = { artifact: 'Attributed partial plan — 雪\r\n', sources: ['note-47'], decisions: ['No publication'], unknowns: ['No independent acceptance'], performedEffort: 'light' }
	const work = async (name: string, input: Value) => {
		const wire = object(await f.call(name, input)), value = decoded(wire)
		assert.notEqual(wire.isError, true, JSON.stringify(wire)); assert.deepEqual(wire.structuredContent, value); assert.equal(value.executionAuthorized, false)
		return value
	}
	try {
		mkdirSync(join(local, 'ordinary'), { recursive: true })
		writeFileSync(join(local, 'ordinary/SKILL.md'), '---\nname: ordinary\ndescription: Inert NQ fixture.\n---\nReturn only an attributed plan.\n')
		writeFileSync(join(local, 'config.json'), JSON.stringify({ schemaVersion: 1, composition: { id: 'note', purpose: 'Plan only', input: 'fixture.nq.v1', output: 'fixture.nq.v1' }, bindings: { '/': { skill: './ordinary', input: 'fixture.nq.v1', output: 'fixture.nq.v1' } } }))
		await f.connect({ file: true })
		let current = await work('capture_work', { requestId: 'nq-capture', actor, source: '  note-47 — 雪\r\nNo execution.\r\n', component: '/', config: 'nq-contract/config.json' })
		current = await work('prepare_work', { requestId: 'nq-prepare', ...handle(current), actor })
		const id = handoff(current).id as string
		const savedExchange = () => object(object(object(current.portable).exchanges)[id])
		const exchange = async (requestId: string, who: Value, action: Value) => { current = await work('exchange_work', { requestId, ...handle(current), actor: who, handoffId: id, action }) }
		const refuse = async (name: string, input: Value) => {
			const before = await work('inspect_work', { itemId: handle(current).itemId })
			failure(await f.call(name, input), /question|answer|exchange|ready|confirm|held|hold|turn|settled/i)
			const after = await work('inspect_work', { itemId: handle(current).itemId })
			assert.equal(after.revision, before.revision); assert.deepEqual(after.portable, before.portable)
		}
		for (let turn = 1; turn <= 3; turn++) {
			const question = { kind: 'question', understanding: `Unresolved bound ${turn}`, questions: [{ id: `q${turn}`, text: `Which bound ${turn}?`, owner: actor }] }
			await exchange(`nq-question-${turn}`, recipient, question)
			if (turn === 1) await refuse('record_work', { requestId: 'nq-unready-record', ...handle(current), actor: recipient, handoffId: id, result })
			const answer = { requestId: `nq-answer-${turn}`, ...handle(current), actor, handoffId: id, action: { kind: 'answer', answers: [{ questionId: `q${turn}`, text: `Owner answer ${turn} — 雪\r\n` }] } }
			current = await work('exchange_work', answer)
			assert.equal(savedExchange().answeredTurns, turn); assert.equal(savedExchange().status, 'waiting-confirmation')
			assert.deepEqual(await work('exchange_work', answer), current)
			if (turn === 1) {
				const saved = structuredClone(savedExchange())
				await refuse('exchange_work', { requestId: 'nq-settled-resubmission', ...handle(current), actor: recipient, handoffId: id, action: question })
				assert.deepEqual(savedExchange(), saved)
				await f.disconnect(); await f.connect({ file: true })
				assert.deepEqual(await work('exchange_work', answer), current, 'answer receipt and exact history survive restart')
			}
		}
		await exchange('nq-genuine-unresolved', recipient, { kind: 'question', understanding: 'Three real answers left an operator-owned gap.', questions: [{ id: 'start-event', text: 'Which operator start event?', owner: actor }] })
		assert.equal(savedExchange().status, 'held'); assert.equal(savedExchange().answeredTurns, 3)
		await refuse('exchange_work', { requestId: 'nq-no-fourth-agent-answer', ...handle(current), actor, handoffId: id, action: { kind: 'answer', answers: [{ questionId: 'start-event', text: 'No fourth ordinary round' }] } })
		await exchange('nq-operator-resolution', actor, { kind: 'resolve', reason: 'Operator supplies the missing start event, not execution approval.', answers: [{ questionId: 'start-event', text: 'Explicit owner approval of note-47.' }] })
		assert.equal(savedExchange().status, 'waiting-confirmation'); assert.equal(savedExchange().answeredTurns, 3)
		await refuse('record_work', { requestId: 'nq-unconfirmed-resolution', ...handle(current), actor: recipient, handoffId: id, result })
		await exchange('nq-recipient-confirms', recipient, { kind: 'confirm', understanding: 'The exact start event is settled; no execution authorized.' })
		assert.equal(savedExchange().status, 'ready')
		current = await work('record_work', { requestId: 'nq-ready-record', ...handle(current), actor: recipient, handoffId: id, result })
		assert.deepEqual(object(current.recorded).result, result)
	} finally { rmSync(local, { recursive: true, force: true }); await f.close() }
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

test('RC04: portable refusal discovery returns only exact owning-item events and recovers their inputs after restart', async () => {
	const f = await productFixture()
	const work = async (name: string, input: Value) => {
		const response = object(await f.call(name, input)), value = decoded(response)
		assert.notEqual(response.isError, true, JSON.stringify(response))
		assert.deepEqual(response.structuredContent, value, 'JSON text and structuredContent agree')
		assert.equal(value.executionAuthorized, false)
		assert.equal(value.independentlyVerified, false)
		assert.equal(value.activity, 'not-running')
		return value
	}
	try {
		let client = await f.connect({ file: true })
		const captured = await work('capture_work', { requestId: 'refusals-capture', actor, source: roughSource, component: '/delivery' })
		const peer = await work('capture_work', { requestId: 'refusals-peer', actor, source: 'PRIVATE PEER — no refusals', component: '/delivery' })
		const uri = (value: Value) => `madewell://work/items/${handle(value).itemId}/refusals`
		const read = async (value: Value) => {
			const response = await bounded(client.readResource({ uri: uri(value) }), 'public refusals resource')
			assert.equal(response.contents.length, 1)
			const content = object(response.contents[0])
			assert.equal(content.uri, uri(value)); assert.equal(content.mimeType, 'application/json')
			return object(JSON.parse(text(content.text)))
		}
		assert.deepEqual(await read(captured), { itemId: handle(captured).itemId, refusals: [] })
		const prepared = await work('prepare_work', { requestId: 'refusals-prepared', ...handle(captured), actor })
		const accepted = await work('inspect_work', { itemId: handle(captured).itemId })
		const oldDescriptors = array(accepted.resources).map(object)
		assert.deepEqual(oldDescriptors.at(-1), { uri: uri(captured), mimeType: 'application/json' })
		assert.ok(text(oldDescriptors.at(-2)!.uri).endsWith('/exchanges'))
		const errors: Value[] = []
		for (const [i, context] of ['FIRST REFUSED — 雪 / e\u0301\r\n  Preserve spaces.  \r\n', 'SECOND REFUSED — jade compass 309\r\n'].entries()) {
			const input = { requestId: `refusals-stale-${i}`, ...handle(captured), actor, context }
			const error = failure(await f.call('prepare_work', input), /revision|stale|changed/i)
			assert.deepEqual(object(error.context).draft, input, 'new authorized error returns the full exact validated input')
			errors.push(error)
		}
		assert.deepEqual(await work('inspect_work', { itemId: handle(captured).itemId }), accepted)
		const retained = f.snapshot()!
		const events = retained.events.filter(event => event.item === handle(captured).itemId && event.kind === 'portable-refused')
		assert.equal(events.length, 2)
		const expected = { itemId: handle(captured).itemId, refusals: events.map(event => ({ seq: event.seq, at: event.at, data: event.data })) }
		assert.deepEqual(await read(captured), expected, 'every seq/time/data field is the actual original event; no unrelated events or DB metadata')
		assert.deepEqual(await read(peer), { itemId: handle(peer).itemId, refusals: [] }, 'same-root peer does not inherit another work’s refused drafts')
		assert.deepEqual(f.snapshot(), retained, 'both event-backed resource reads are fully read-only')
		client = await f.connect({ file: true })
		const discovered = await read(captured)
		assert.deepEqual(discovered, expected)
		for (const [i, event] of array(discovered.refusals).entries()) {
			const input = object(object(object(event).data).input)
			assert.deepEqual(failure(await f.call('prepare_work', input), /revision|stale|changed/i), errors[i], 'recover body/identity from public resource, not client-held original')
		}
		assert.deepEqual(await work('prepare_work', { requestId: 'refusals-prepared', ...handle(captured), actor }), prepared)
		assert.deepEqual(await read(captured), expected)
		assert.deepEqual(f.snapshot(), retained, 'receipt replay preserves every item, event, setting and call')
	} finally { await f.close() }
})
