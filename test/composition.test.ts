import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { Effect } from 'effect'
import { inspectComposition } from '../src/composition.ts'
import { MadeWellError } from '../src/errors.ts'

const material = 'madewell.material.v1'
const token = 'fixture.token.v1'
const leaf = (id: string, input = token, output = token) => ({ id, purpose: `Fixture ${id}`, input, output })
const group = (id: string, children: ReturnType<typeof leaf>[], input = token, output = token) => ({
	...leaf(id, input, output), children,
	wiring: { inputs: Object.fromEntries(children.map((child, i) => [child.id, i ? children[i - 1]!.id : '$input'])), output: children.at(-1)!.id },
})
const binding = (skill: string, input = token, output = token) => ({ skill, input, output })
const inspect = (options: Parameters<typeof inspectComposition>[0]) => Effect.runPromise(inspectComposition(options))
type Inventory = Awaited<ReturnType<typeof inspect>>
type Node = Inventory['root']

function all(node: Node): Node[] { return [node, ...(node.children ?? []).flatMap(all)] }
function at(node: Node, address: string): Node {
	const found = all(node).find(n => n.address === address)
	assert.ok(found, `resolved occurrence ${address}`)
	return found
}
function fixture() {
	const root = mkdtempSync(join(tmpdir(), 'mw-composition-'))
	const put = (path: string, value: unknown) => {
		mkdirSync(dirname(join(root, path)), { recursive: true })
		writeFileSync(join(root, path), typeof value === 'string' ? value : JSON.stringify(value))
	}
	const skill = (directory: string, name = directory.split('/').at(-1)!) => {
		put(`${directory}/SKILL.md`, `---\nname: ${name}\ndescription: Ordinary fixture method, not business acceptance.\nallowed-tools: Bash Read\n---\n\n# ${name}\nPreserve declared input and output.\n`)
	}
	return { root, put, skill, inspect: (options: Omit<Parameters<typeof inspectComposition>[0], 'root'> = {}) => inspect({ root, ...options }), close: () => rmSync(root, { recursive: true, force: true }) }
}

async function refuses(options: Parameters<typeof inspectComposition>[0], code: 'portable_invalid' | 'portable_unreadable' = 'portable_invalid') {
	const refused = await Effect.runPromise(inspectComposition(options).pipe(Effect.match({
		onSuccess: () => false,
		onFailure: error => {
			assert.ok(error instanceof MadeWellError)
			assert.equal(error.code, code)
			assert.ok(error.message)
			assert.ok(Object.keys(error.context).length > 0, 'factual context, not a silent fallback')
			assert.ok(error.next.length > 0)
			for (const next of error.next) { assert.ok(next.run); assert.ok(next.why) }
			return true
		},
	})))
	assert.equal(refused, true, 'invalid selection must fail, not return partial/default success')
}

test('no-config inventory preserves the complete settled defaults with canonical ordinary methods without implying execution', async () => {
	const f = fixture()
	try {
		const inventory = await f.inspect()
		assert.equal(inventory.schemaVersion, 1)
		assert.equal(inventory.root.address, '/')
		assert.equal(inventory.root.id, 'work')
		assert.deepEqual(inventory.root.children?.map(n => n.id), ['brainstorm', 'discovery', 'delivery', 'landing'])
		assert.deepEqual(at(inventory.root, '/delivery').children?.map(n => n.id), ['ideation', 'planning', 'implementation', 'verification'])
		const discovery = ['declare', 'look-first', 'classify', 'lenses', 'one-thing', 'route', 'confirm']
		assert.deepEqual(at(inventory.root, '/discovery').children?.map(n => n.id), discovery)
		for (const [address, input, output] of [
			['/brainstorm', material, material], ['/discovery', material, 'madewell.candidates.v1'],
			['/delivery', 'madewell.candidates.v1', 'madewell.result.v1'], ['/landing', 'madewell.result.v1', 'madewell.result.v1'],
		]) {
			assert.equal(at(inventory.root, address!).input, input)
			assert.equal(at(inventory.root, address!).output, output)
		}
		const selected = [
			['/discovery/declare', 'declaring-intent', material, 'madewell.discovery.declare.output.v1'],
			['/discovery/look-first', 'looking-first', 'madewell.discovery.declare.output.v1', 'madewell.discovery.look-first.output.v1'],
			['/discovery/classify', 'classifying', 'madewell.discovery.look-first.output.v1', 'madewell.discovery.classify.output.v1'],
			['/discovery/lenses', 'applying-lenses', 'madewell.discovery.classify.output.v1', 'madewell.discovery.lenses.output.v1'],
			['/discovery/one-thing', 'shaping-candidates', 'madewell.discovery.lenses.output.v1', 'madewell.discovery.one-thing.output.v1'],
			['/discovery/route', 'routing', 'madewell.discovery.one-thing.output.v1', 'madewell.discovery.route.output.v1'],
			['/discovery/confirm', 'confirming', 'madewell.discovery.route.output.v1', 'madewell.candidates.v1'],
			['/delivery/ideation', 'ideating', 'madewell.candidates.v1', 'madewell.delivery.ideation.output.v1'],
			['/delivery/planning', 'planning', 'madewell.delivery.ideation.output.v1', 'madewell.delivery.planning.output.v1'],
			['/delivery/implementation', 'implementing', 'madewell.delivery.planning.output.v1', 'madewell.delivery.implementation.output.v1'],
			['/delivery/verification', 'verifying', 'madewell.delivery.implementation.output.v1', 'madewell.result.v1'],
			['/landing', 'landing', 'madewell.result.v1', 'madewell.result.v1'],
		] as const
		for (const [address, name, input, output] of selected) {
			const node = at(inventory.root, address), method = node.method
			assert.equal(node.input, input); assert.equal(node.output, output)
			assert.equal(method?.kind, 'skill', `${address} must not fall back to a legacy builtin`)
			assert.ok(method?.origin); assert.ok(method?.identity)
			if (method?.kind === 'skill') {
				assert.equal(method.package.name, `madewell-${name}`)
				assert.equal(method.package.frontmatter.name, `madewell-${name}`)
				const directory = join(import.meta.dirname, '../skills/method-library', `madewell-${name}`)
				assert.equal(method.package.origin, directory)
				assert.equal(method.package.instructions, readFileSync(join(directory, 'SKILL.md'), 'utf8'), 'full unmodified ordinary instructions, not embedded legacy job briefs')
				assert.ok(method.package.manifest.some(file => file.path === 'SKILL.md'))
				assert.ok(method.package.manifest.every(file => !/^(?:evals|reviews)\//.test(file.path)))
			}
		}
		assert.equal(at(inventory.root, '/discovery').method, undefined, 'entry guide must not hide the seven child occurrences')
		assert.equal(at(inventory.root, '/delivery').method, undefined, 'entry guide must not hide the four child occurrences')
		assert.equal(inventory.complete, true, 'all selected methods are available; inventory is not a claim of method execution')
		const brainstorm = at(inventory.root, '/brainstorm').method
		assert.equal(brainstorm?.kind, 'skill')
		if (brainstorm?.kind === 'skill') {
			assert.equal(brainstorm.package.name, 'brainstorm')
			assert.equal(brainstorm.package.instructions, readFileSync(new URL('../brainstorm/skills/brainstorm/SKILL.md', import.meta.url), 'utf8'))
			assert.deepEqual(brainstorm.companions?.map(skill => skill.name), ['ambitious-collaboration'])
			assert.equal(brainstorm.companions?.[0]?.instructions, readFileSync(new URL('../brainstorm/skills/ambitious-collaboration/SKILL.md', import.meta.url), 'utf8'))
		}
		const standalone = await f.inspect({ component: '/brainstorm' })
		assert.equal(standalone.complete, true, 'shipped Brainstorm is usable without local configuration')
		assert.deepEqual(standalone.diagnostics, [])
		const landing = await f.inspect({ component: '/landing' })
		assert.equal(landing.complete, true, 'Landing is independently selectable, not a fifth Delivery child')
		assert.deepEqual(landing.root, at(inventory.root, '/landing'))
		assert.deepEqual(landing.diagnostics, [])
		assert.deepEqual(inventory.diagnostics, [])
		assert.ok(inventory.identity)
		assert.deepEqual(await f.inspect(), inventory)
	} finally { f.close() }
})

test('project binding makes brainstorm standalone complete and leaves every unselected branch identical', async () => {
	const f = fixture()
	try {
		const baseline = await f.inspect()
		f.skill('.madewell/skills/ordinary')
		f.put('.madewell/config.json', { schemaVersion: 1, bindings: { '/brainstorm': { ...binding('./skills/ordinary', material, material), args: { audience: '雪 😀', depth: 2 } } } })
		const full = await f.inspect()
		assert.notEqual(full.identity, baseline.identity)
		for (const address of ['/discovery', '/delivery', '/landing']) assert.deepEqual(at(full.root, address), at(baseline.root, address))
		const selected = await f.inspect({ component: '/brainstorm' })
		assert.equal(selected.root.address, '/brainstorm')
		assert.equal(selected.complete, true)
		assert.deepEqual(selected.diagnostics, [])
		assert.deepEqual(selected.root, at(full.root, '/brainstorm'))
		const method = selected.root.method
		assert.equal(method?.kind, 'skill')
		if (method?.kind === 'skill') {
			assert.equal(method.package.name, 'ordinary')
			assert.deepEqual(method.companions ?? [], [], 'explicit replacement does not retain the default posture')
			assert.deepEqual(method.args, { audience: '雪 😀', depth: 2 })
			assert.ok(method.origin)
			assert.ok(method.bindingOrigin)
			assert.ok(method.identity)
		}
		assert.equal(full.complete, true, 'ordinary Brainstorm replacement preserves the available canonical Landing')
		assert.deepEqual(full.diagnostics, [])
	} finally { f.close() }
})

test('selected subtree reads selected packages only, not an invalid sibling skill body', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		f.put('broken/SKILL.md', 'not a skill and must not be parsed for brainstorm')
		f.put('config.json', { schemaVersion: 1, bindings: {
			'/brainstorm': binding('./ordinary', material, material),
			'/landing': binding('./broken', 'madewell.result.v1', 'madewell.result.v1'),
		} })
		assert.equal((await f.inspect({ config: 'config.json', component: '/brainstorm' })).complete, true)
		await refuses({ root: f.root, config: 'config.json' })
	} finally { f.close() }
})

test('leaf replacement adds recursive components and repeated local IDs/skill packages remain separate occurrences', async () => {
	const f = fixture()
	try {
		const baseline = await f.inspect()
		f.skill('ordinary')
		const replacement = group('brainstorm', [group('draft', [leaf('reflect', material, material)], material, material), group('revise', [leaf('reflect', material, material), leaf('extra', material, material)], material, material)], material, material)
		f.put('config.json', { schemaVersion: 1, replacements: { '/brainstorm': replacement }, bindings: {
			'/brainstorm/draft/reflect': binding('./ordinary', material, material),
			'/brainstorm/revise/reflect': binding('./ordinary', material, material),
			'/brainstorm/revise/extra': binding('./ordinary', material, material),
		} })
		const inventory = await f.inspect({ config: 'config.json', component: '/brainstorm' })
		assert.equal(inventory.complete, true)
		assert.deepEqual(at(inventory.root, '/brainstorm/revise').children?.map(n => n.id), ['reflect', 'extra'])
		const first = at(inventory.root, '/brainstorm/draft/reflect'), second = at(inventory.root, '/brainstorm/revise/reflect')
		assert.notEqual(first.identity, second.identity)
		assert.equal(first.method?.kind, 'skill')
		assert.equal(second.method?.kind, 'skill')
		if (first.method?.kind === 'skill' && second.method?.kind === 'skill') assert.equal(first.method.package.identity, second.method.package.identity)
		const full = await f.inspect({ config: 'config.json' })
		for (const address of ['/discovery', '/delivery', '/landing']) assert.deepEqual(at(full.root, address), at(baseline.root, address))
		for (const changed of [{ ...replacement, id: 'renamed' }, { ...replacement, input: 'wrong.v1' }, { ...replacement, output: 'wrong.v1' }]) {
			f.put('bad.json', { schemaVersion: 1, replacements: { '/brainstorm': changed } })
			await refuses({ root: f.root, config: 'bad.json' })
		}
	} finally { f.close() }
})

test('any occurrence including groups can select one method; hidden descendant bindings are refused', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		const base = await f.inspect(), discovery = at(base.root, '/discovery'), child = at(base.root, '/discovery/declare')
		f.put('config.json', { schemaVersion: 1, bindings: { '/discovery': binding('./ordinary', discovery.input, discovery.output) } })
		const selected = await f.inspect({ config: 'config.json', component: '/discovery' })
		assert.equal(selected.complete, true)
		assert.equal(selected.root.method?.kind, 'skill')
		f.put('config.json', { schemaVersion: 1, bindings: {
			'/discovery': binding('./ordinary', discovery.input, discovery.output),
			'/discovery/declare': binding('./ordinary', child.input, child.output),
		} })
		await refuses({ root: f.root, config: 'config.json', component: '/discovery' })
	} finally { f.close() }
})

test('a group skill method cannot shadow nonempty descendant constraints, even when an ancestor contradicts them', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		const bindings = { '/discovery': binding('./ordinary', material, 'madewell.candidates.v1') }
		f.put('config.json', { schemaVersion: 1, bindings, constraints: { '/discovery/declare': {} } })
		const empty = await f.inspect({ config: 'config.json', component: '/discovery' })
		assert.equal(empty.complete, true, 'an empty descendant constraint declaration does not obstruct a group method')
		assert.equal(empty.root.method?.kind, 'skill')
		for (const constraints of [
			{ '/discovery/declare': { network: false } },
			{ '/discovery/declare': { network: false }, '/discovery': { network: true } },
		]) {
			f.put('config.json', { schemaVersion: 1, bindings, constraints })
			await refuses({ root: f.root, config: 'config.json', component: '/discovery' })
			await refuses({ root: f.root, config: 'config.json' })
		}
	} finally { f.close() }
})

test('defaults < shared < project < override; same-level competing bindings need an explicit higher selection', async () => {
	const f = fixture()
	try {
		for (const name of ['shared-one', 'shared-two', 'project', 'override']) f.skill(`skills/${name}`)
		for (const name of ['shared-one', 'shared-two']) f.put(`${name}.json`, { schemaVersion: 1, bindings: { '/brainstorm': binding(`./skills/${name}`, material, material) } })
		for (const uses of [['shared-one.json', 'shared-two.json'], ['shared-two.json', 'shared-one.json']]) {
			f.put('config.json', { schemaVersion: 1, uses })
			await refuses({ root: f.root, config: 'config.json' })
			f.put('config.json', { schemaVersion: 1, uses, bindings: { '/brainstorm': binding('./skills/project', material, material) } })
			const project = await f.inspect({ config: 'config.json', component: '/brainstorm' })
			assert.equal(project.root.method?.kind, 'skill')
			if (project.root.method?.kind === 'skill') assert.equal(project.root.method.package.name, 'project')
			f.put('override.json', { schemaVersion: 1, bindings: { '/brainstorm': binding('./skills/override', material, material) } })
			const overridden = await f.inspect({ config: 'config.json', override: 'override.json', component: '/brainstorm' })
			if (overridden.root.method?.kind === 'skill') assert.equal(overridden.root.method.package.name, 'override')
			assert.notEqual(overridden.root.identity, project.root.identity)
		}
		f.put('config.json', { schemaVersion: 1, uses: ['shared-one.json'] })
		const shared = await f.inspect({ config: 'config.json', component: '/brainstorm' })
		assert.equal(shared.complete, true)
		if (shared.root.method?.kind === 'skill') assert.equal(shared.root.method.package.name, 'shared-one')
	} finally { f.close() }
})

test('same-level competing compositions and replacements are order-independent conflicts with higher-layer resolution', async () => {
	const f = fixture()
	try {
		for (const field of ['composition', 'replacements'] as const) {
			const a = field === 'composition' ? group('custom', [leaf('first')]) : group('brainstorm', [leaf('first', material, material)], material, material)
			const b = field === 'composition' ? group('custom', [leaf('second')]) : group('brainstorm', [leaf('second', material, material)], material, material)
			const value = (component: typeof a) => field === 'composition' ? component : { '/brainstorm': component }
			f.put('a.json', { schemaVersion: 1, [field]: value(a) })
			f.put('b.json', { schemaVersion: 1, [field]: value(b) })
			for (const uses of [['a.json', 'b.json'], ['b.json', 'a.json']]) {
				f.put('config.json', { schemaVersion: 1, uses })
				await refuses({ root: f.root, config: 'config.json' })
				f.put('config.json', { schemaVersion: 1, uses, [field]: value(a) })
				const inventory = await f.inspect({ config: 'config.json' })
				assert.equal((field === 'composition' ? inventory.root : at(inventory.root, '/brainstorm')).children?.[0]?.id, 'first')
			}
		}
	} finally { f.close() }
})

test('higher composition selection settles shared conflicts before applying dependent child replacements', async () => {
	const f = fixture()
	try {
		const nominal = 'token.v1'
		const composition = group('custom', [leaf('draft', nominal, nominal)], nominal, nominal)
		const revised = { ...leaf('draft', nominal, nominal), purpose: 'Revised draft' }
		f.put('b.json', { schemaVersion: 1, composition: leaf('custom', nominal, nominal) })
		let first: Node | undefined
		for (const uses of [['a.json', 'b.json'], ['b.json', 'a.json']]) {
			f.put('a.json', { schemaVersion: 1, composition, replacements: { '/draft': revised } })
			f.put('project.json', { schemaVersion: 1, uses })
			await refuses({ root: f.root, config: 'project.json' })
			f.put('project.json', { schemaVersion: 1, uses, composition })
			const inventory = await f.inspect({ config: 'project.json' })
			assert.equal(inventory.root.id, 'custom')
			assert.equal(at(inventory.root, '/draft').purpose, 'Revised draft')
			assert.equal(at(inventory.root, '/draft').input, nominal)
			assert.equal(at(inventory.root, '/draft').output, nominal)
			assert.equal(inventory.complete, false, 'structural resolution does not invent a missing skill')
			assert.deepEqual(inventory.diagnostics.map(d => [d.code, d.address]), [['method_unavailable', '/draft']])
			if (first) assert.deepEqual(inventory.root, first, 'uses order cannot change the resolved composition')
			else first = inventory.root
			f.put('a.json', { schemaVersion: 1, composition, replacements: { '/draft': { ...revised, input: 'wrong.v1' } } })
			await refuses({ root: f.root, config: 'project.json' })
			f.put('a.json', { schemaVersion: 1, composition, replacements: { '/missing': revised } })
			await refuses({ root: f.root, config: 'project.json' })
		}
	} finally { f.close() }
})

test('higher parent replacement selection settles shared conflicts before applying a dependent child replacement', async () => {
	const f = fixture()
	try {
		const nominal = 'token.v1'
		const composition = group('custom', [leaf('phase', nominal, nominal)], nominal, nominal)
		const parent = group('phase', [leaf('draft', nominal, nominal)], nominal, nominal)
		const revised = { ...leaf('draft', nominal, nominal), purpose: 'Revised nested draft' }
		f.put('a.json', { schemaVersion: 1, composition, replacements: { '/phase/draft': revised, '/phase': parent } })
		f.put('b.json', { schemaVersion: 1, replacements: { '/phase': leaf('phase', nominal, nominal) } })
		let first: Node | undefined
		for (const uses of [['a.json', 'b.json'], ['b.json', 'a.json']]) {
			f.put('project.json', { schemaVersion: 1, uses })
			await refuses({ root: f.root, config: 'project.json' })
			f.put('project.json', { schemaVersion: 1, uses, replacements: { '/phase': parent } })
			const inventory = await f.inspect({ config: 'project.json' })
			assert.deepEqual(at(inventory.root, '/phase').children?.map(n => n.id), ['draft'])
			assert.equal(at(inventory.root, '/phase/draft').purpose, 'Revised nested draft')
			assert.equal(inventory.complete, false)
			assert.deepEqual(inventory.diagnostics.map(d => [d.code, d.address]), [['method_unavailable', '/phase/draft']])
			if (first) assert.deepEqual(inventory.root, first, 'uses order cannot change the resolved replacement')
			else first = inventory.root
			f.put('project.json', { schemaVersion: 1, uses, replacements: { '/phase': { ...parent, output: 'wrong.v1' } } })
			await refuses({ root: f.root, config: 'project.json' })
			f.put('project.json', { schemaVersion: 1, uses, replacements: { '/phase': parent, '/phase/missing': revised } })
			await refuses({ root: f.root, config: 'project.json' })
		}
	} finally { f.close() }
})

test('diamond shared reuse is not a cycle; import loops are refused', async () => {
	const f = fixture()
	try {
		f.put('shared.json', { schemaVersion: 1, constraints: { '/brainstorm': { audience: 'operator', depth: 2, exact: true } } })
		f.put('a.json', { schemaVersion: 1, uses: ['shared.json'] })
		f.put('b.json', { schemaVersion: 1, uses: ['shared.json'] })
		f.put('config.json', { schemaVersion: 1, uses: ['a.json', 'b.json'] })
		const forward = await f.inspect({ config: 'config.json' })
		const constraints = at(forward.root, '/brainstorm').constraints
		assert.equal(constraints.audience?.value, 'operator')
		assert.equal(constraints.depth?.value, 2)
		assert.equal(constraints.exact?.value, true)
		assert.ok(constraints.audience!.origins.length > 0)
		f.put('config.json', { schemaVersion: 1, uses: ['b.json', 'a.json'] })
		const reverse = await f.inspect({ config: 'config.json' })
		assert.equal(reverse.identity, forward.identity)
		assert.deepEqual(reverse.root, forward.root)
		f.put('shared.json', { schemaVersion: 1, uses: ['a.json'] })
		await refuses({ root: f.root, config: 'config.json' })
		f.put('self.json', { schemaVersion: 1, uses: ['self.json'] })
		await refuses({ root: f.root, config: 'self.json' })
	} finally { f.close() }
})

test('contradictory constraints are errors even with a higher-layer attempted selection', async () => {
	const f = fixture()
	try {
		f.put('a.json', { schemaVersion: 1, constraints: { '/brainstorm': { depth: 1 } } })
		f.put('b.json', { schemaVersion: 1, constraints: { '/brainstorm': { depth: 2 } } })
		f.put('override.json', { schemaVersion: 1, constraints: { '/brainstorm': { depth: 3 } } })
		for (const uses of [['a.json', 'b.json'], ['b.json', 'a.json']]) {
			f.put('config.json', { schemaVersion: 1, uses, constraints: { '/brainstorm': { depth: 2 } } })
			await refuses({ root: f.root, config: 'config.json', override: 'override.json' })
		}
		f.put('config.json', { schemaVersion: 1, uses: ['a.json'], constraints: { '/brainstorm': { depth: 2 } } })
		await refuses({ root: f.root, config: 'config.json' })
		f.put('config.json', { schemaVersion: 1, uses: ['a.json'] })
		await refuses({ root: f.root, config: 'config.json', override: 'override.json' })
	} finally { f.close() }
})

test('selected descendants retain enclosing constraints and refuse ancestor/descendant contradictions', async () => {
	const f = fixture()
	try {
		f.put('config.json', { schemaVersion: 1, constraints: {
			'/': { exact: true }, '/discovery': { depth: 2 }, '/discovery/declare': { audience: 'operator' },
		} })
		const full = await f.inspect({ config: 'config.json' })
		const selected = await f.inspect({ config: 'config.json', component: '/discovery/declare' })
		assert.equal(selected.complete, true)
		assert.deepEqual(selected.root.constraints, at(full.root, '/discovery/declare').constraints)
		assert.equal(selected.root.constraints.exact?.value, true)
		assert.equal(selected.root.constraints.depth?.value, 2)
		assert.equal(selected.root.constraints.audience?.value, 'operator')
		for (const key of ['exact', 'depth', 'audience']) assert.ok(selected.root.constraints[key]!.origins.length > 0)
		f.put('config.json', { schemaVersion: 1, constraints: {
			'/': { depth: 1 }, '/discovery': { depth: 2 },
		} })
		await refuses({ root: f.root, config: 'config.json', component: '/discovery/declare' })
		await refuses({ root: f.root, config: 'config.json' })
	} finally { f.close() }
})

test('explicit composition and replacement reuse of builtin addresses does not silently inherit builtin methods', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		const original = at((await f.inspect()).root, '/discovery/declare')
		assert.equal(original.method?.kind, 'skill', 'control: the untouched default has its canonical ordinary method')
		if (original.method?.kind === 'skill') assert.equal(original.method.package.name, 'madewell-declaring-intent')
		const replacement = leaf('declare', original.input, original.output)
		const composition = group('work', [group('discovery', [replacement], original.input, original.output)], original.input, original.output)
		for (const selection of [{ composition }, { replacements: { '/discovery/declare': replacement } }]) {
			f.put('config.json', { schemaVersion: 1, ...selection })
			const selected = await f.inspect({ config: 'config.json', component: '/discovery/declare' })
			assert.equal(selected.root.method, undefined)
			assert.equal(selected.complete, false)
			assert.deepEqual(selected.diagnostics.map(d => [d.code, d.address]), [['method_unavailable', '/discovery/declare']])
			f.put('config.json', { schemaVersion: 1, ...selection, bindings: {
				'/discovery/declare': binding('./ordinary', original.input, original.output),
			} })
			const bound = await f.inspect({ config: 'config.json', component: '/discovery/declare' })
			assert.equal(bound.root.method?.kind, 'skill')
			if (bound.root.method?.kind === 'skill') assert.equal(bound.root.method.package.name, 'ordinary', 'explicit binding wins, rather than inheriting the canonical default')
			assert.equal(bound.complete, true)
			assert.deepEqual(bound.diagnostics, [])
		}
	} finally { f.close() }
})

test('ordered wiring validates exact nominal contracts, not schema guesses or names', async () => {
	const f = fixture()
	try {
		const valid = group('custom', [leaf('declare'), leaf('renamed')])
		f.skill('ordinary')
		f.put('valid.json', { schemaVersion: 1, composition: valid, bindings: { '/declare': binding('./ordinary'), '/renamed': binding('./ordinary') } })
		const inventory = await f.inspect({ config: 'valid.json' })
		assert.equal(inventory.root.address, '/', 'root id is not an address prefix')
		assert.equal(inventory.complete, true, 'ordinary method named declare has no inferred runtime discovery checks')
		for (const invalid of [
			{ ...valid, children: [] },
			{ ...valid, wiring: undefined },
			{ ...valid, children: [leaf('same'), leaf('same')] },
			{ ...valid, wiring: { inputs: { declare: 'renamed', renamed: 'declare' }, output: 'renamed' } },
			{ ...valid, wiring: { inputs: { declare: 'declare', renamed: 'declare' }, output: 'renamed' } },
			{ ...valid, wiring: { inputs: { declare: 'missing', renamed: 'declare' }, output: 'renamed' } },
			{ ...valid, wiring: { inputs: { declare: '$input' }, output: 'renamed' } },
			{ ...valid, wiring: { inputs: { declare: '$input', renamed: 'declare', ghost: '$input' }, output: 'renamed' } },
			{ ...valid, wiring: { ...valid.wiring, output: 'missing' } },
			{ ...valid, output: 'fixture.other.v1' },
			{ ...valid, children: [leaf('declare', 'fixture.other.v1'), leaf('renamed')] },
			{ ...valid, children: [leaf('declare', token, 'fixture.other.v1'), leaf('renamed')] },
			{ ...valid, input: { type: 'string' } },
		]) {
			f.put('invalid.json', { schemaVersion: 1, composition: invalid })
			await refuses({ root: f.root, config: 'invalid.json' })
		}
		for (const bad of [binding('./ordinary', 'fixture.other.v1'), binding('./ordinary', token, 'fixture.other.v1')]) {
			f.put('invalid.json', { schemaVersion: 1, composition: valid, bindings: { '/declare': bad } })
			await refuses({ root: f.root, config: 'invalid.json' })
		}
	} finally { f.close() }
})

test('renaming a declared discovery-contract occurrence neither strips its contract nor adds runtime checks to ordinary declare', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		const original = at((await f.inspect()).root, '/discovery/declare')
		for (const component of [leaf('renamed', original.input, original.output), leaf('declare')]) {
			f.put('config.json', { schemaVersion: 1, composition: component, bindings: { '/': binding('./ordinary', component.input, component.output) } })
			const inventory = await f.inspect({ config: 'config.json' })
			assert.equal(inventory.complete, true)
			assert.equal(inventory.root.id, component.id)
			assert.equal(inventory.root.input, component.input)
			assert.equal(inventory.root.output, component.output)
			f.put('bad.json', { schemaVersion: 1, composition: component, bindings: { '/': binding('./ordinary', `${component.input}.wrong`, component.output) } })
			await refuses({ root: f.root, config: 'bad.json' })
		}
	} finally { f.close() }
})

test('unknown/unsupported fields, versions, malformed IDs and addresses are refused instead of ignored', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		for (const config of [
			{ schemaVersion: 2 }, { schemaVersion: 1, typo: true }, { schemaVersion: 1, effort: 'deep' },
			{ schemaVersion: 1, composition: { ...leaf('custom'), run: 'touch executed' } },
			{ schemaVersion: 1, composition: { ...leaf('custom'), schema: { type: 'object' } } },
			{ schemaVersion: 1, composition: { ...leaf('custom'), effort: 'deep' } },
			{ schemaVersion: 1, composition: leaf('UpperCase') },
			{ schemaVersion: 1, composition: leaf('has/slash') },
			{ schemaVersion: 1, bindings: { '/brainstorm': { ...binding('./ordinary', material, material), run: 'touch executed' } } },
			{ schemaVersion: 1, constraints: { '/brainstorm': { invalid: { nested: true } } } },
		]) {
			f.put('invalid.json', config)
			await refuses({ root: f.root, config: 'invalid.json' })
		}
		for (const address of ['brainstorm', '/work/brainstorm', '/brainstorm/../landing', '//brainstorm', '/missing']) {
			await refuses({ root: f.root, component: address })
			f.put('invalid.json', { schemaVersion: 1, bindings: { [address]: binding('./ordinary', material, material) } })
			await refuses({ root: f.root, config: 'invalid.json' })
		}
	} finally { f.close() }
})

test('only granted-root config is auto-read; explicit unreadable/escaped/symlink overrides never fall back', async () => {
	const f = fixture()
	try {
		mkdirSync(join(f.root, 'selected'))
		f.put('.madewell/config.json', 'invalid parent config')
		f.put('selected/unselected.json', 'invalid unrelated JSON')
		const defaults = await inspect({ root: join(f.root, 'selected') })
		assert.equal(defaults.root.id, 'work')
		await refuses({ root: join(f.root, 'selected'), override: 'missing.json' }, 'portable_unreadable')
		await refuses({ root: join(f.root, 'selected'), config: 'missing.json' }, 'portable_unreadable')
		await refuses({ root: join(f.root, 'selected'), override: '../.madewell/config.json' })
		f.put('selected/invalid.json', '{broken')
		await refuses({ root: join(f.root, 'selected'), override: 'invalid.json' })
		symlinkSync(join(f.root, '.madewell/config.json'), join(f.root, 'selected/link.json'))
		await refuses({ root: join(f.root, 'selected'), override: 'link.json' })
		assert.equal(existsSync(join(f.root, 'selected/.madewell')), false)
	} finally { f.close() }
})

test('AC26 expansion: omitted selection is authored Light, explicit selection and declaration edits change identity', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		const base = { schemaVersion: 1, composition: leaf('root'), bindings: { '/': binding('./ordinary') } }
		f.put('plain.json', base)
		const plain = await f.inspect({ config: 'plain.json' })
		const declaration = { default: 'light', variants: {
			light: { composition: leaf('root'), bindings: { '/': binding('./ordinary') } },
			'compare-seam': { composition: group('root', [leaf('observe'), leaf('compare')]), bindings: { '/observe': binding('./ordinary'), '/compare': binding('./ordinary') } },
		} }
		f.put('config.json', { ...base, efforts: { '/': declaration } })
		const omitted = await f.inspect({ config: 'config.json' })
		assert.equal(omitted.complete, true)
		assert.equal(omitted.root.children, undefined)
		assert.equal(omitted.root.method?.kind, 'skill')
		assert.notEqual(omitted.identity, plain.identity)
		const records = (inventory: Inventory) => inventory.effort
		const saved = records(omitted)
		assert.ok(saved); assert.equal(saved.length, 1)
		assert.equal(saved[0]!.address, '/'); assert.equal(saved[0]!.requested, null); assert.equal(saved[0]!.effective, 'light')
		assert.ok(saved[0]!.origin)
		assert.deepEqual(JSON.parse(saved[0]!.declaration), declaration, 'inspection retains the full JSON declaration, including inactive variants')
		assert.ok(saved[0]!.declarationDigest)
		assert.equal(Object.hasOwn(plain, 'effort'), false, 'no-effort outputs do not acquire even an empty optional metadata field')
		f.put('config.json', { ...base, efforts: { '/': { ...declaration, selected: 'light' } } })
		const explicit = await f.inspect({ config: 'config.json' })
		assert.equal(records(explicit)?.[0]?.requested, 'light')
		assert.notEqual(explicit.identity, omitted.identity, 'selection is part of the pin, even when effective children are identical')
		f.put('config.json', { ...base, efforts: { '/': { ...declaration, variants: { ...declaration.variants, 'compare-seam': { ...declaration.variants['compare-seam'], composition: { ...declaration.variants['compare-seam'].composition, purpose: 'Changed inactive declaration — 雪\r\n' } } } } } })
		const edited = await f.inspect({ config: 'config.json' })
		assert.notEqual(edited.identity, omitted.identity, 'full declaration, not only selected package bytes, is pinned')
		assert.deepEqual(await f.inspect({ config: 'plain.json' }), plain, 'no-effort outputs remain exactly stable')
	} finally { f.close() }
})

test('AC26 expansion: parent before child, repeated local IDs, independent branches and non-last output remain ordinary wiring', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		const left = group('left', [leaf('probe'), leaf('tail')])
		left.wiring.output = 'probe'
		const expanded = group('probe', [leaf('reflect'), leaf('check')])
		f.put('config.json', { schemaVersion: 1, composition: group('root', [leaf('left'), leaf('right'), leaf('consumer')]), bindings: { '/consumer': binding('./ordinary') }, efforts: {
			'/left/probe': { default: 'light', selected: 'inspect-seam', variants: { light: { composition: leaf('probe'), bindings: { '/left/probe': binding('./ordinary') } }, 'inspect-seam': { composition: expanded, bindings: { '/left/probe/reflect': binding('./ordinary'), '/left/probe/check': binding('./ordinary') } } } },
			'/right': { default: 'light', variants: { light: { composition: group('right', [leaf('reflect')]), bindings: { '/right/reflect': binding('./ordinary') } } } },
			'/left': { default: 'light', selected: 'compare', variants: { light: { composition: leaf('left'), bindings: { '/left': binding('./ordinary') } }, compare: { composition: left, bindings: { '/left/probe': binding('./ordinary'), '/left/tail': binding('./ordinary') } } } },
		} })
		const inventory = await f.inspect({ config: 'config.json' })
		assert.equal(inventory.complete, true)
		assert.deepEqual(at(inventory.root, '/left').children?.map(node => node.id), ['probe', 'tail'])
		assert.equal(at(inventory.root, '/left').wiring?.output, 'probe')
		assert.deepEqual(at(inventory.root, '/left/probe').children?.map(node => node.id), ['reflect', 'check'])
		assert.notEqual(at(inventory.root, '/left/probe/reflect').identity, at(inventory.root, '/right/reflect').identity)
		assert.equal(at(inventory.root, '/left/probe').method, undefined, 'child expansion removes its old enclosing leaf binding')
		assert.equal(at(inventory.root, '/consumer').method?.kind, 'skill')
	} finally { f.close() }
})

test('AC26 expansion: explicit structural replacements precede effort expansion', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		f.put('config.json', { schemaVersion: 1, composition: leaf('root'), replacements: { '/': group('root', [leaf('new')]) }, efforts: {
			'/new': { default: 'light', variants: { light: { composition: group('new', [leaf('actual')]), bindings: { '/new/actual': binding('./ordinary') } } } },
		} })
		const inventory = await f.inspect({ config: 'config.json' })
		assert.equal(inventory.complete, true)
		assert.equal(at(inventory.root, '/new/actual').method?.kind, 'skill')
	} finally { f.close() }
})

test('AC26 expansion: competing declarations need a higher layer, never import order', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		const first = { default: 'light', variants: { light: { composition: leaf('root'), bindings: { '/': binding('./ordinary') } } } }
		const second = { ...first, variants: { light: { ...first.variants.light, composition: { ...leaf('root'), purpose: 'A different authored Light' } } } }
		f.put('a.json', { schemaVersion: 1, efforts: { '/': first } })
		f.put('b.json', { schemaVersion: 1, efforts: { '/': second } })
		for (const uses of [['a.json', 'b.json'], ['b.json', 'a.json']]) {
			f.put('config.json', { schemaVersion: 1, composition: leaf('root'), uses })
			await refuses({ root: f.root, config: 'config.json' })
			f.put('config.json', { schemaVersion: 1, composition: leaf('root'), uses, efforts: { '/': first } })
			assert.equal((await f.inspect({ config: 'config.json' })).root.purpose, leaf('root').purpose)
		}
		f.put('nested/choice.json', { schemaVersion: 1, efforts: { '/': { ...first, variants: { light: { composition: leaf('root'), bindings: { '/': binding('../ordinary') } } } } } })
		f.put('config.json', { schemaVersion: 1, composition: leaf('root'), uses: ['nested/choice.json'] })
		assert.equal((await f.inspect({ config: 'config.json' })).complete, true, 'variant packages resolve against declaration origin, not importer')
	} finally { f.close() }
})

test('AC26 expansion: only selected package grants load, and whole-subtree selection discards obsolete bindings', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		f.put('broken/SKILL.md', 'inactive malformed body must not load')
		const chosen = { composition: leaf('root'), bindings: { '/': binding('./ordinary') } }
		const declaration = { default: 'light', variants: { light: chosen, inactive: { composition: leaf('root'), bindings: { '/': binding('./broken') } }, escaped: { composition: leaf('root'), bindings: { '/': binding('../outside-grant') } } } }
		f.put('config.json', { schemaVersion: 1, composition: group('root', [leaf('obsolete')]), bindings: { '/obsolete': binding('./broken') }, efforts: { '/': declaration } })
		const inventory = await f.inspect({ config: 'config.json' })
		assert.equal(inventory.complete, true); assert.equal(inventory.root.children, undefined)
		for (const selected of ['inactive', 'escaped']) {
			f.put('bad.json', { schemaVersion: 1, composition: leaf('root'), efforts: { '/': { ...declaration, selected } } })
			await refuses({ root: f.root, config: 'bad.json' })
		}
		symlinkSync(join(f.root, 'ordinary'), join(f.root, 'alias'))
		f.put('bad.json', { schemaVersion: 1, composition: leaf('root'), efforts: { '/': { default: 'light', variants: { light: { ...chosen, bindings: { '/': binding('./alias') } } } } } })
		await refuses({ root: f.root, config: 'bad.json' })
		f.put('missing.json', { schemaVersion: 1, composition: leaf('root'), bindings: { '/': binding('./ordinary') }, efforts: { '/': { default: 'light', variants: { light: { composition: leaf('root') } } } } })
		assert.equal((await f.inspect({ config: 'missing.json' })).complete, false, 'selected variants do not inherit an old method binding')
	} finally { f.close() }
})

test('AC26 expansion: malformed declarations, unknown selections, incompatible target contracts and import cycles fail visibly', async () => {
	const f = fixture()
	try {
		f.skill('ordinary')
		const variant = { composition: leaf('root'), bindings: { '/': binding('./ordinary') } }
		for (const declaration of [
			{}, { default: 'deep', variants: { light: variant } }, { default: 'light', variants: {} },
			{ default: 'light', selected: '', variants: { light: variant } }, { default: 'light', selected: '  ', variants: { light: variant } },
			{ default: 'light', selected: 'focused', variants: { light: variant } },
			{ default: 'light', variants: { light: variant, ' ': variant } },
			...[{ id: 'renamed' }, { input: 'wrong.input' }, { output: 'wrong.output' }].map(change => ({ default: 'light', variants: { light: { ...variant, composition: { ...leaf('root'), ...change } } } })),
		]) {
			f.put('bad.json', { schemaVersion: 1, composition: leaf('root'), efforts: { '/': declaration } })
			await refuses({ root: f.root, config: 'bad.json' })
		}
		f.put('a.json', { schemaVersion: 1, uses: ['b.json'], efforts: { '/': { default: 'light', variants: { light: variant } } } })
		f.put('b.json', { schemaVersion: 1, uses: ['a.json'] })
		await refuses({ root: f.root, config: 'a.json' })
	} finally { f.close() }
})

test('AC26 expansion: imported variant bindings yield to compatible explicit project and override children', async () => {
	const f = fixture()
	try {
		f.skill('skill-a'); f.skill('skill-b')
		f.put('imported.json', { schemaVersion: 1, efforts: { '/': { default: 'light', variants: {
			light: { composition: group('root', [leaf('child')]), bindings: { '/child': binding('./skill-a') } },
		} } } })
		const project = { schemaVersion: 1, composition: leaf('root'), uses: ['imported.json'] }
		f.put('config.json', project)
		const imported = await f.inspect({ config: 'config.json' })
		assert.equal(imported.complete, true)
		const chosen = at(imported.root, '/child').method
		assert.equal(chosen?.kind, 'skill')
		if (chosen?.kind === 'skill') assert.equal(chosen.package.name, 'skill-a')
		for (const layer of ['project', 'override']) {
			const bindings = { '/child': binding('./skill-b') }
			f.put('config.json', layer === 'project' ? { ...project, bindings } : project)
			f.put('override.json', { schemaVersion: 1, bindings })
			const inventory = await f.inspect({ config: 'config.json', ...(layer === 'override' ? { override: 'override.json' } : {}) })
			assert.equal(inventory.complete, true)
			const method = at(inventory.root, '/child').method
			assert.equal(method?.kind, 'skill')
			if (method?.kind === 'skill') assert.equal(method.package.name, 'skill-b', `${layer} binding must not be erased by the imported expansion`)
		}
		f.put('config.json', { ...project, bindings: { '/obsolete': binding('./skill-b') } })
		await refuses({ root: f.root, config: 'config.json' })
	} finally { f.close() }
})
