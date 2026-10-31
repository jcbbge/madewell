import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { AGENT_JOBS, type Card, type Prescriptions } from '../src/cards.ts'
import { drive, go } from '../src/engine.ts'
import { MadeWellError } from '../src/errors.ts'
import { requestPackUpdate } from '../src/functions.ts'
import { auditJumpDiscovery } from '../src/jump-pack-audit.ts'
import { JUMP_SLOTS, loadJumpPack, resolveJumpPacks, type JumpPack } from '../src/jump-packs.ts'
import { laneOf, validate } from '../src/lane.ts'
import { openStore, Store } from '../src/store.ts'
import { Worker } from '../src/worker.ts'

const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'"
const jsonCommand = (value: unknown) => `${quote(process.execPath)} -e ${quote(`console.log(${JSON.stringify(JSON.stringify(value))})`)}`
const ordinary = { result: 'Actual local result', evidence: ['Trusted command returned this value'], unknowns: [] }
const generic = (): JumpPack => ({ name: 'generic', version: '1', methods: Object.fromEntries(JUMP_SLOTS.map((s) => [s.id, { id: `generic-${s.id}`, fallback: true, run: jsonCommand(ordinary) }])) })
const problem = (run: () => unknown, text: RegExp) => assert.throws(run, (error: unknown) => {
	assert.ok(error instanceof MadeWellError)
	assert.equal(error.code, 'cartridges_invalid')
	assert.match(JSON.stringify(error.context), text)
	assert.ok(error.next.length > 0)
	return true
})

test('composition chooses one method but retains every domain requirement with its own provenance', () => {
	const base = generic()
	const software: JumpPack = { name: 'software', version: '9', methods: { planning: { id: 'repo-plan', run: jsonCommand(ordinary) } }, requirements: {
		planning: [{ id: 'grounding', text: 'Inspect the actual repository.', constraints: { preserveData: true } }],
	} }
	const sales: JumpPack = { name: 'sales', version: '3', methods: { planning: { id: 'proposal-plan', run: jsonCommand(ordinary) } }, requirements: {
		planning: [{ id: 'grounding', text: 'Retain the agreed customer outcome.', constraints: { preserveData: true, externalSend: false } }],
	} }
	const database: JumpPack = { name: 'database', version: '2', requirements: {
		planning: [{ id: 'rows', text: 'Record before/after row counts.', constraints: { maxDroppedRows: 0 } }],
	} }
	const first = resolveJumpPacks([software, base, database, sales], { planning: 'software' })
	const second = resolveJumpPacks([sales, database, base, software], { planning: 'software' })
	assert.deepEqual(second, first, 'input ordering does not change the resolved contract')
	assert.equal(first.bindings.length, 11)
	const planning = first.bindings.find((b) => b.slot === 'planning')!
	assert.deepEqual(planning.method, { pack: 'software', version: '9', id: 'repo-plan' })
	assert.deepEqual(planning.availableMethods.map((m) => m.pack), ['generic', 'sales', 'software'])
	assert.deepEqual(planning.requirements.map((r) => [r.pack, r.version, r.id, r.text]), [
		['database', '2', 'rows', 'Record before/after row counts.'],
		['sales', '3', 'grounding', 'Retain the agreed customer outcome.'],
		['software', '9', 'grounding', 'Inspect the actual repository.'],
	])
	assert.deepEqual({ ...planning.constraints }, { maxDroppedRows: 0, preserveData: true, externalSend: false })
	const node = laneOf(first.pack).delivery.find((n) => n.job === 'planning')!
	const contract = node.args!.contract as Record<string, unknown>
	assert.deepEqual(contract.requirements, planning.requirements)
	assert.deepEqual(contract.method, planning.method)
	assert.equal(contract.availableMethods, undefined, 'losing methods remain console metadata rather than extra executable inputs')
	assert.deepEqual(first.selected.map((p) => p.name), ['database', 'generic', 'sales', 'software'])
	assert.deepEqual(base, generic(), 'composition never mutates its source packs')
})

test('method ambiguity and contradictory scalar requirements cannot resolve silently', () => {
	const software: JumpPack = { name: 'software', version: '1', methods: { planning: { id: 'code', run: jsonCommand(ordinary) } } }
	const database: JumpPack = { name: 'database', version: '1', methods: { planning: { id: 'migration', run: jsonCommand(ordinary) } } }
	problem(() => resolveJumpPacks([generic(), software, database]), /planning: choose one method explicitly from database, software/)
	problem(() => resolveJumpPacks([generic(), software], { planning: 'missing' }), /planning: selected pack missing provides no method/)
	for (const value of [false, 'true', 1]) {
		const left: JumpPack = { name: 'left', version: '1', requirements: { verification: [{ id: 'retention', text: 'Keep all data.', constraints: { preserve: true } }] } }
		const right: JumpPack = { name: 'right', version: '1', requirements: { verification: [{ id: 'destruction', text: 'Contradict preservation.', constraints: { preserve: value } }] } }
		problem(() => resolveJumpPacks([generic(), left, right]), /verification: constraint preserve conflicts between left\/retention and right\/destruction/)
	}
	const losing: JumpPack = { ...database, requirements: { planning: [{ id: 'conflict', text: 'A losing method still contributes obligations.', constraints: { destructive: true } }] } }
	const chosen: JumpPack = { ...software, requirements: { planning: [{ id: 'preserve', text: 'Selected method must preserve records.', constraints: { destructive: false } }] } }
	problem(() => resolveJumpPacks([generic(), chosen, losing], { planning: 'software' }), /constraint destructive conflicts/)
})

test('missing obligations and malformed packs are actionable refusals rather than executable partial flows', async () => {
	problem(() => resolveJumpPacks([]), /declare: no method supplies this required obligation/)
	const incomplete = generic()
	delete (incomplete.methods as Record<string, unknown>).verification
	problem(() => resolveJumpPacks([incomplete]), /verification: no method supplies this required obligation/)
	for (const bad of [
		{ name: 'unknown-slot', version: '1', requirements: { invisible: [{ id: 'R1', text: 'Cannot be ignored.' }] } },
		{ name: 'extra-field', version: '1', requiredAuthority: 'ship' },
		{ name: 'duplicate-rule', version: '1', requirements: { planning: [{ id: 'same', text: 'One' }, { id: 'same', text: 'Two' }] } },
		{ name: 'reserved', version: '1', methods: { planning: { id: 'inject', run: 'echo {}', args: { contract: { pack: 'forged' } } } } },
		{ name: 'both', version: '1', methods: { planning: { id: 'ambiguous', run: 'echo {}', profile: 'planner', duty: 'Two implementations.' } } },
		{ name: 'no-method', version: '1', methods: { planning: { id: 'missing' } } },
		{ name: 'bad-budget', version: '1', methods: { planning: { id: 'infinite', run: 'echo {}', budget: { minutes: Infinity } } } },
	]) problem(() => resolveJumpPacks([generic(), bad as JumpPack]), /jump-pack|unknown function|duplicate requirement|reserved|provide either/)
	problem(() => resolveJumpPacks([generic(), generic()]), /Duplicate selected pack generic/)
	problem(() => resolveJumpPacks([generic()], { unknown: 'generic' } as never), /unknown function unknown/)
	const root = mkdtempSync(join(tmpdir(), 'mw-jump-loader-'))
	try {
		const path = join(root, 'pack.json')
		writeFileSync(path, '{broken JSON')
		const invalid = await Effect.runPromise(Effect.flip(loadJumpPack(path)))
		assert.equal(invalid.code, 'cartridges_invalid')
		assert.equal((await Effect.runPromise(Effect.flip(loadJumpPack(join(root, 'missing.json'))))).code, 'cartridges_unreadable')
		writeFileSync(path, JSON.stringify(generic()))
		assert.deepEqual(await Effect.runPromise(loadJumpPack(path)), generic())
	} finally { rmSync(root, { recursive: true, force: true }) }
})

for (const [name, output] of [
	['common result redefinition', { type: 'object', properties: { result: { type: 'number' } } }],
	['root alternatives bypass', { type: 'object', anyOf: [{ type: 'object' }, { type: 'string' }] }],
	['unsupported unenforced keyword', { type: 'object', additionalProperties: false }],
	['non-object root', { type: 'string' }],
	['malformed property', { type: 'object', properties: { proof: null } }],
	['malformed required', { type: 'object', required: 'proof' }],
	['nested alternatives skipping proof siblings', { type: 'object', properties: { proof: { type: 'object', required: ['passed'], properties: { passed: { type: 'boolean', enum: [true] } }, anyOf: [{}] } } }],
	['array item alternatives skipping enum siblings', { type: 'object', properties: { proof: { type: 'array', items: { type: 'string', enum: ['accepted'], anyOf: [{}] } } } }],
] as const) test(`method output extension rejects ${name}`, () => {
	const specialized = { name: 'specialized', version: '1', methods: { verification: { id: 'custom', run: jsonCommand(ordinary), output } } } as unknown as JumpPack
	problem(() => resolveJumpPacks([generic(), specialized]), /output|schema/)
})

test('a future method update keeps the accepted prefix byte-for-byte stable through the real engine', async () => {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-jump-update-')))
	const workspace = join(root, 'workspace')
	mkdirSync(workspace)
	let store = openStore(join(root, 'record.db'))
	const card: Card = { harness: 'codex', provider: 'test', account: 'test', model: 'scripted', effort: 'low' }
	const prescriptions: Prescriptions = { tiers: { deep: [card], intake: [card] }, jobs: {
		...Object.fromEntries(AGENT_JOBS.map((job) => [job, { tier: 'deep', access: 'none', budget: { minutes: 1 } }])),
		verify: { budget: { minutes: 1 } },
	} as Prescriptions['jobs'] }
	const worker = Layer.succeed(Worker, { run: () => Effect.die('Commands must not call a model') })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	try {
		const baseline = generic()
		const future = (version: string): JumpPack => ({ name: 'future', version, methods: { verification: { id: `verify-${version}`, run: jsonCommand({ ...ordinary, result: `Verification ${version}` }) } } })
		const old = resolveJumpPacks([baseline, future('1')])
		const next = resolveJumpPacks([baseline, future('2')])
		assert.deepEqual(laneOf(old.pack).delivery.slice(0, 3), laneOf(next.pack).delivery.slice(0, 3))
		assert.notDeepEqual(laneOf(old.pack).delivery[3], laneOf(next.pack).delivery[3])
		const item = store.create({ title: 'Replace future method', objective: 'Retain earlier accepted work', source: 'Version two is selected', workspace, pack: old.pack, autonomy: 'steps' })
		assert.equal((await run(drive(item.id, { prescriptions }))).status, 'paused')
		const accepted = store.get(item.id)!.outputs.ideation
		const rewritten = structuredClone(next.pack)
		const first = rewritten.delivery[0]!.steps[0]!
		;(first as { args: unknown }).args = { ...first.args, changedPastInput: true }
		assert.equal((await run(Effect.flip(requestPackUpdate(item.id, rewritten)))).code, 'cartridges_invalid', 'replacement may not rewrite an accepted invocation')
		await run(requestPackUpdate(item.id, next.pack))
		store.close()
		store = openStore(join(root, 'record.db'))
		let current = store.get(item.id)!
		while (current.status === 'paused') {
			await run(go(item.id))
			current = await run(drive(item.id, { prescriptions }))
		}
		assert.equal(current.status, 'completed')
		assert.equal(current.outputs.ideation, accepted)
		assert.equal(JSON.parse(current.outputs.verification!).result, 'Verification 2')
		assert.equal(store.events(item.id).filter((e) => e.kind === 'trace-started' && e.data.job === 'ideation').length, 1)
		assert.equal(store.events(item.id).filter((e) => e.kind === 'cartridges-applied').length, 1)
		assert.equal(current.shipped, undefined, 'generic verification is not implicit software shipment')
		for (const includesCommon of [false, true]) {
			const specialized: JumpPack = { name: 'proof', version: '1', methods: { implementation: { id: 'additional-proof',
				run: jsonCommand({ ...(includesCommon ? ordinary : {}), proof: true }),
				output: { type: 'object', properties: { proof: { type: 'boolean' } }, required: ['proof'] },
			} } }
			const resolved = resolveJumpPacks([generic(), specialized])
			const check = store.create({ title: 'Common output obligations', objective: 'Additional proof cannot replace the common contract', source: 'Keep evidence and unknowns explicit', workspace, pack: resolved.pack, autonomy: 'full' })
			const result = await run(drive(check.id, { prescriptions }))
			assert.equal(result.status, includesCommon ? 'completed' : 'held')
			if (!includesCommon) {
				assert.equal(result.hold?.code, 'function_failed')
				assert.deepEqual(result.flow?.accepted, ['ideation', 'planning'])
				assert.equal(result.outputs.implementation, undefined)
				assert.match(JSON.stringify(result.hold), /result.*missing|evidence.*missing|unknowns.*missing/)
			} else assert.equal(JSON.parse(result.outputs.implementation!).proof, true)
		}
	} finally { store.close(); rmSync(root, { recursive: true, force: true }) }
})

const declared = () => ({ outcomes: [{ id: 'O1', description: 'Ship the requested application result.' }] })
const confirmed = () => ({ outcomes: declared().outcomes, items: [{ id: 'C1', title: 'Requested outcome', objective: 'Deliver the result', kind: 'outcome', outcomeRefs: ['O1'], after: [] }], coverage: [{ outcome: 'O1', candidates: ['C1'], disposition: 'represented', reason: 'Directly represented' }] })

test('discovery audit detects preparation-only coverage and broken identity/dependency links', () => {
	const valid = auditJumpDiscovery(declared(), confirmed())
	assert.equal(valid.passed, true)
	assert.match(valid.evidence, /still require semantic review/)
	const invalid: Array<[string, unknown, unknown]> = []
	const add = (name: string, mutate: (d: any, f: any) => void) => { const d = declared(), f = confirmed(); mutate(d, f); invalid.push([name, d, f]) }
	add('preparation only', (_d, f) => { f.items[0].kind = 'research' })
	add('missing candidate ID', (_d, f) => { delete f.items[0].id })
	add('duplicate candidate ID', (_d, f) => { f.items.push(structuredClone(f.items[0])) })
	add('missing declared ID', (d, _f) => { delete d.outcomes[0].id })
	add('duplicate declared ID', (d, _f) => { d.outcomes.push(structuredClone(d.outcomes[0])) })
	add('lost final identities', (_d, f) => { f.outcomes = [] })
	add('missing coverage row', (_d, f) => { f.coverage = [] })
	add('duplicate coverage row', (_d, f) => { f.coverage.push(structuredClone(f.coverage[0])) })
	add('dangling coverage outcome', (_d, f) => { f.coverage.push({ outcome: 'O404', candidates: ['C1'], disposition: 'represented' }) })
	add('dangling candidate', (_d, f) => { f.coverage[0].candidates = ['C404'] })
	add('duplicate candidate link', (_d, f) => { f.coverage[0].candidates = ['C1', 'C1'] })
	add('missing reverse outcome link', (_d, f) => { f.items[0].outcomeRefs = [] })
	add('dangling reverse outcome link', (_d, f) => { f.items[0].outcomeRefs.push('O404') })
	add('self dependency', (_d, f) => { f.items[0].after = [1] })
	add('noninteger dependency', (_d, f) => { f.items.push({ ...f.items[0], id: 'C2', after: [1.5] }) })
	add('unrecognized disposition', (_d, f) => { f.coverage[0].disposition = 'approved' })
	for (const [name, d, f] of invalid) {
		const audit = auditJumpDiscovery(d, f)
		assert.equal(audit.passed, false, name)
		assert.ok(audit.issues.length > 0, name)
	}
})

test('discovery audit rejects malformed JSON data without throwing', () => {
	const malformed: unknown[] = [null, [], 'garbage', 17, true, {}, { outcomes: {}, items: null, coverage: 'text' }]
	for (const value of malformed) {
		assert.doesNotThrow(() => auditJumpDiscovery(value, value))
		assert.equal(auditJumpDiscovery(value, value).passed, false)
	}
	for (const [field, value] of [['after', 1], ['after', {}], ['after', '1'], ['outcomeRefs', {}], ['outcomeRefs', null], ['kind', {}]] as const) {
		const final: any = confirmed()
		final.items[0][field] = value
		assert.doesNotThrow(() => auditJumpDiscovery(declared(), final), `${field}=${JSON.stringify(value)}`)
		assert.equal(auditJumpDiscovery(declared(), final).passed, false, `${field}=${JSON.stringify(value)}`)
	}
})

test('declining and claiming an outcome are explicit structural claims, not semantic verification', () => {
	const declined = { outcomes: declared().outcomes, items: [], coverage: [{ outcome: 'O1', candidates: [], disposition: 'declined', reason: 'Operator explicitly postponed the release.' }] }
	const audit = auditJumpDiscovery(declared(), declined)
	assert.equal(audit.passed, true)
	assert.match(audit.evidence, /still require semantic review/)
	assert.equal(auditJumpDiscovery(declared(), { ...declined, coverage: [{ ...declined.coverage[0], reason: '  ' }] }).passed, false)
	const claimed = confirmed()
	claimed.items[0]!.title = 'Only investigate how to ship'
	assert.equal(auditJumpDiscovery(declared(), claimed).passed, true, 'declared kind is inspectable evidence, not a semantic classifier of the title')
	assert.match(auditJumpDiscovery(declared(), claimed).evidence, /still require semantic review/)
})

function emerged() {
	const final = confirmed()
	return { ...final,
		outcomes: [...final.outcomes, { id: 'O2', description: 'Retain a newly surfaced accessibility outcome.' }],
		items: [{ ...final.items[0]!, outcomeRefs: ['O1', 'O2'] }],
		coverage: [...final.coverage, { outcome: 'O2', candidates: ['C1'], disposition: 'represented', reason: 'The same coherent task can fulfill both outcomes.' }],
		intentChanges: [{ id: 'O2', sourceRefs: ['test-fixture/raw-input:8-12', 'test-fixture/route:observation-2'], rationale: 'The accumulated discovery evidence surfaced an additional outcome.' }],
	}
}

test('discovery can refine original descriptions and add sourced outcomes without a fixed outcome or task count', () => {
	const original = declared()
	const final = emerged()
	final.outcomes[0]!.description = 'A clarified account of the same original outcome, with its stable identity.'
	const before = structuredClone({ original, final })
	const audit = auditJumpDiscovery(original, final)
	assert.equal(audit.passed, true, JSON.stringify(audit.issues))
	assert.deepEqual(audit.issues, [])
	assert.match(audit.evidence, /cited sources and interpretation still require semantic review/, 'structural acceptance does not certify the cited sources or interpretation')
	assert.deepEqual({ original, final }, before, 'audit does not rewrite source intent or its refinement')
	const expanded = { ...final, items: [...final.items,
		{ ...final.items[0]!, id: 'C2', title: 'Independent useful result', after: [] },
		{ ...final.items[0]!, id: 'C3', title: 'Dependent useful result', after: [1] },
	], coverage: final.coverage.map((row) => ({ ...row, candidates: ['C1', 'C2', 'C3'] })) }
	assert.equal(auditJumpDiscovery(original, expanded).passed, true, 'one or several linked candidate tasks may represent the refined outcomes')
	assert.equal(auditJumpDiscovery(original, confirmed()).passed, true, 'existing conforming discovery needs no intentChanges field')
})

test('emerged outcomes require exactly one sourced rationale and complete coverage plus backlinks', () => {
	const invalid: Array<[string, unknown]> = []
	const add = (name: string, mutate: (final: any) => void) => { const final = emerged(); mutate(final); invalid.push([name, final]) }
	add('missing provenance', (final) => { delete final.intentChanges })
	add('empty provenance', (final) => { final.intentChanges = [] })
	add('duplicate provenance', (final) => { final.intentChanges.push(structuredClone(final.intentChanges[0])) })
	add('empty source references', (final) => { final.intentChanges[0].sourceRefs = [] })
	add('blank source reference', (final) => { final.intentChanges[0].sourceRefs = ['raw:1', ' \n\t'] })
	add('blank rationale', (final) => { final.intentChanges[0].rationale = '  ' })
	add('provenance names an old outcome', (final) => { final.intentChanges[0].id = 'O1' })
	add('provenance names an absent outcome', (final) => { final.intentChanges[0].id = 'O404' })
	add('unsupported extra change', (final) => { final.intentChanges.push({ id: 'O404', sourceRefs: ['raw:1'], rationale: 'No such new outcome exists.' }) })
	add('missing emerged-outcome coverage', (final) => { final.coverage.pop() })
	add('dangling emerged-outcome candidate', (final) => { final.coverage[1].candidates = ['C404'] })
	add('missing emerged-outcome backlink', (final) => { final.items[0].outcomeRefs = ['O1'] })
	add('silent original identity rename', (final) => {
		final.outcomes[0].id = 'renamed-O1'
		final.items[0].outcomeRefs = ['renamed-O1', 'O2']
		final.coverage[0].outcome = 'renamed-O1'
		final.intentChanges.push({ id: 'renamed-O1', sourceRefs: ['raw:1'], rationale: 'Adding provenance cannot silently erase the original anchor.' })
	})
	for (const [name, final] of invalid) {
		const audit = auditJumpDiscovery(declared(), final)
		assert.equal(audit.passed, false, name)
		assert.ok(audit.issues.length > 0, name)
		assert.match(audit.evidence, /still require semantic review/)
	}
})

test('malformed intent-change data fails safely rather than granting sourced emergence', () => {
	for (const value of [null, false, 7, 'invalid', {}, [null], [false], [{ id: 'O2', sourceRefs: 'raw:1', rationale: 'A reason' }], [{ id: 'O2', sourceRefs: ['raw:1', 7], rationale: 'A reason' }], [{ id: 'O2', sourceRefs: ['raw:1'], rationale: {} }]]) {
		const final = { ...emerged(), intentChanges: value }
		assert.doesNotThrow(() => auditJumpDiscovery(declared(), final), JSON.stringify(value))
		assert.equal(auditJumpDiscovery(declared(), final).passed, false, JSON.stringify(value))
	}
	for (const value of [null, false, 7, 'invalid', {}]) {
		const final = { ...confirmed(), intentChanges: value }
		assert.doesNotThrow(() => auditJumpDiscovery(declared(), final))
		assert.equal(auditJumpDiscovery(declared(), final).passed, false, 'a present malformed field is not an omitted optional field')
	}
})

test('the resolved confirmation schema keeps intentChanges optional and validates supplied provenance fields', () => {
	const resolved = resolveJumpPacks([generic()])
	const lane = laneOf(resolved.pack)
	const final = { result: 'Refined discovery output', unknowns: [], ...emerged() }
	final.items = final.items.map((item) => ({ ...item, text: 'Candidate purpose, boundaries and completion conditions.' }))
	assert.equal(validate(lane, 'confirm', JSON.stringify(final)).ok, true)
	const legacy: Record<string, unknown> = { result: 'Old conforming output', unknowns: [], ...confirmed() }
	legacy.items = (legacy.items as Record<string, unknown>[]).map((item) => ({ ...item, text: 'Candidate scope and completion evidence.' }))
	assert.equal(validate(lane, 'confirm', JSON.stringify(legacy)).ok, true)
	for (const intentChanges of ['wrong', [{ id: 'O2', sourceRefs: [7], rationale: 'A reason' }], [{ id: 'O2', sourceRefs: ['raw:1'] }]]) {
		assert.equal(validate(lane, 'confirm', JSON.stringify({ ...final, intentChanges })).ok, false)
	}
})
