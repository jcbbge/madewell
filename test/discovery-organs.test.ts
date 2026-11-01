import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import type { Card, Prescriptions } from '../src/cards.ts'
import type { AcceptedDiscovery, DiscoveryJob } from '../src/discovery-contract.ts'
import { drive } from '../src/engine.ts'
import { conforms, deliverableShape, laneOf, lastJson } from '../src/lane.ts'
import { checkIncomingPreparation, createWork, inspectPreparation, organOutputShape, organPacket, organReceipts, type OrganReceipt, type Preparation } from '../src/organs.ts'
import { resolvePackSelection } from '../src/pack-selection.ts'
import { openStore, Store } from '../src/store.ts'
import { Worker, type WorkerRequest } from '../src/worker.ts'

const jobs = ['declare', 'look-first', 'classify', 'lenses', 'one-thing', 'route', 'discover'] as const
const expectedNext: Record<DiscoveryJob, string[]> = {
	declare: ['look-first'], 'look-first': ['classify'], classify: ['lenses'], lenses: ['one-thing'],
	'one-thing': ['route'], route: ['discover'], discover: ['delivery'],
}
const source = '  Prepare the report data, then export it as CSV.\r\nCafé λ: preserve the source exactly.  '
const objective = 'Discover the data prerequisite and its CSV export consumer.'
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const envelope = () => ({ discoveryContract: '1' as const, result: 'Source-grounded discovery.\r\nKeep this exact contribution.  ', sources: ['raw'], unknowns: [], decisions: [], evidence: [], questions: [] })
const sourced = (id: string, text: string) => ({ id, text, sources: ['raw'] })

// Deliberately local fixture: acceptance must not depend on extracting another test's source.
function discovery() {
	const data = { key: 'report-data', title: 'Prepare report data', kind: 'feature' as const, objective: 'Deliver the report dataset', text: 'Deliver reusable report data before the CSV consumer.', requirementIds: ['R-data'], questionRefs: [], artifacts: [{ id: 'A-data', description: 'The prepared report dataset', sources: ['raw'] }] }
	const csv = { key: 'csv-export', title: 'Export CSV', kind: 'feature' as const, objective: 'Export the prepared report as CSV', text: 'Consume the delivered report dataset and export it as CSV.', requirementIds: ['R-csv'], questionRefs: ['Q-format'], artifacts: [{ id: 'A-csv', description: 'The CSV export', sources: ['raw'] }] }
	return {
		declare: { ...envelope(), evidence: [{ id: 'raw', ref: 'capture:original#L1-L2' }], intent: [{ ...sourced('I-data', 'Prepare report data'), authority: 'explicit' }, { ...sourced('I-csv', 'Export the prepared report as CSV'), authority: 'explicit' }], questions: [{ ...sourced('Q-format', 'Which delimiter should the CSV use?'), ownerRole: 'planner', blockingRole: 'planner' }] },
		'look-first': { ...envelope(), observations: [sourced('F-repo', 'The supplied repository contains README.md.')] },
		classify: { ...envelope(), requirements: [{ ...sourced('R-data', 'Provide the report dataset'), kind: 'outcome', origin: 'explicit', intentIds: ['I-data'] }, { ...sourced('R-csv', 'Export the report as CSV'), kind: 'outcome', origin: 'explicit', intentIds: ['I-csv'] }], intentDispositions: [] },
		lenses: { ...envelope(), tradeoffs: [] },
		'one-thing': { ...envelope(), candidates: [data, csv] },
		route: { ...envelope(), dependencies: [{ id: 'E-data', producer: data.key, consumer: csv.key, reason: 'The CSV export consumes the delivered dataset.', artifactId: 'A-data', readiness: 'task-delivered', sources: ['raw'] }], preparation: [{ id: 'P-data', candidate: data.key, before: csv.key, reason: 'Make the report dataset available before its consumer starts.', sources: ['raw'] }] },
		discover: { ...envelope(), items: [{ ...structuredClone(data), after: [] as number[] }, { ...structuredClone(csv), after: [1] }], dependencyIds: ['E-data'], preparationIds: ['P-data'], questionIds: ['Q-format'] },
	} satisfies AcceptedDiscovery
}

function preparation(job: DiscoveryJob, rules: ReadonlyArray<{ id: string }> = []): Preparation {
	return {
		ground: { intent: objective, sources: [{ ref: 'source', finding: 'The raw source requests a dataset prerequisite and a CSV consumer.' }] },
		rumen: rules.map(rule => ({ rule: rule.id, disposition: 'addressed', evidence: 'Retain the selected project vocabulary in this contribution.' })),
		next: expectedNext[job].map(next => ({ job: next, brief: `${job} prepared ${next}: retain accepted discovery identities.`, requires: [`output:${job}`] })),
	}
}

const card: Card = { harness: 'codex', provider: 'fixture', account: 'fixture', model: 'scripted', effort: 'low' }
const prescriptions: Prescriptions = {
	tiers: { deep: [card], coding: [card], intake: [card] },
	jobs: { ...Object.fromEntries(['discover', 'ideate', 'challenge', 'plan', 'implement', 'test-plan', 'arbitrate'].map(job => [job, { tier: 'deep', access: 'read', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } } } as Prescriptions['jobs'],
	parallel: 2,
}
type Packet = { you: { replyFormat: Record<string, unknown> }; organs: { version: string; rules: { id: string }[]; nextJobs: string[]; incoming: { from: string; job: string }[] } }

async function fixture() {
	const selected = await Effect.runPromise(resolvePackSelection('builtin:grammar'))
	assert.ok(selected.pack)
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-discovery-organs-'))), repo = join(root, 'repo'), home = join(root, 'home')
	mkdirSync(repo); mkdirSync(home)
	const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
	git('init', '-q', '-b', 'main'); git('config', 'user.name', 'Independent discovery acceptance'); git('config', 'user.email', 'discovery@localhost')
	writeFileSync(join(repo, 'README.md'), 'Repository material for isolated discovery acceptance.\n')
	git('add', 'README.md'); git('commit', '-qm', 'Seed discovery acceptance repository')
	const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^MW_/i.test(key)))
	for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]
	process.env.MW_HOME = home; process.env.MW_STORE = join(home, 'work.db'); process.env.MW_AUTORUN = '0'
	writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: repo, rumen: [{ id: 'csv-language', kind: 'lexicon', text: 'Call the requested export CSV.' }] }]))
	const path = process.env.MW_STORE
	let store = openStore(path)
	const item = createWork(store, { title: 'Discover the CSV work', objective, source, workspace: repo, pack: selected.pack, job: 'declare', autonomy: 'checkpoints' })
	const contributions = discovery(), calls: WorkerRequest[] = [], outputs = new Map<string, string>()
	const worker = Layer.succeed(Worker, { run: req => Effect.sync(() => {
		calls.push(req)
		if (req.kind === 'intake') return { ok: true as const, output: JSON.stringify({ understanding: 'Complete this fixed discovery contribution and prepare its configured successor.', unclear: [], ambiguous: [], missing: [], notes: [] }) }
		assert.equal(req.kind, 'execute', 'valid discovery needs no repair or originator intervention')
		assert.ok(jobs.includes(req.job as DiscoveryJob), `Unexpected downstream job ${req.job}`)
		const job = req.job as DiscoveryJob, packet = JSON.parse(req.prompt) as Packet
		assert.equal(packet.organs.version, '1')
		assert.deepEqual(packet.organs.nextJobs, expectedNext[job])
		assert.deepEqual(packet.organs.rules.map(rule => rule.id), ['guidance:csv-language'])
		assert.ok((packet.you.replyFormat.required as string[]).includes('organPreparation'))
		if (job !== 'declare') assert.ok(packet.organs.incoming.some(entry => entry.from === jobs[jobs.indexOf(job) - 1] && entry.job === job), 'the successor receives the accepted producer preparation')
		const value = { ...structuredClone(contributions[job]), organPreparation: preparation(job, packet.organs.rules) }
		assert.deepEqual(conforms(packet.you.replyFormat, value), [], 'the actual advertised output shape accepts both independent contracts')
		const output = `Accepted ${job}.\r\n${JSON.stringify(value, null, 2)}\n`
		outputs.set(job, output)
		return { ok: true as const, output }
	}) })
	const run = () => Effect.runPromise(drive(item.id, { prescriptions }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	return {
		item, repo, selected, contributions, calls, outputs, run, get store() { return store },
		restart() { store.close(); store = openStore(path) },
		clean() { store.close(); for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]; for (const [key, value] of Object.entries(inherited)) if (value !== undefined) process.env[key] = value; rmSync(root, { recursive: true, force: true }) },
	}
}

test('discovery organs: builtin grammar retains route promises and accepts all seven producers through SQLite reopen', { timeout: 60_000 }, async () => {
	const t = await fixture()
	try {
		assert.equal(t.selected.source, 'builtin:grammar')
		assert.equal(t.item.pack!.name, 'made-well-autonomy-lab')
		assert.equal(t.item.pack!.version, '1.3')
		assert.deepEqual(t.item.pack!.contracts, { discovery: '1', acceptance: '1', handoff: '1' })
		assert.deepEqual(laneOf(t.item.pack).discovery.map(step => step.job), jobs)
		assert.deepEqual(t.item.organs, { version: '1' }, 'public creation pins the console obligation')
		const discovered = await t.run()
		assert.equal(discovered.status, 'discovered', JSON.stringify(discovered.hold))
		assert.deepEqual(t.calls.filter(call => call.kind === 'execute').map(call => call.job), jobs)
		assert.deepEqual(lastJson(discovered.outputs.route!)!.preparation, t.contributions.route.preparation)
		const events = t.store.events(discovered.id).filter(event => event.kind === 'organs-accepted')
		assert.deepEqual(events.map(event => event.data.job), jobs, 'each of the seven producers has its own durable receipt')
		for (const event of events) {
			const job = event.data.job as DiscoveryJob, receipt = event.data.receipt as OrganReceipt, raw = t.outputs.get(job)!
			assert.equal(discovered.outputs[job], raw, 'acceptance preserves the worker output bytes')
			assert.equal(t.store.call(event.data.call as number)!.output, raw)
			assert.equal(receipt.outputHash, hash(raw), 'receipts hash raw output, including prose, whitespace and the namespaced organ object')
			assert.equal(receipt.ground.sources[0]!.sha256, hash(source))
			assert.deepEqual(receipt.rumen.map(rule => rule.id), ['guidance:csv-language'])
			assert.deepEqual(receipt.next.map(next => next.job), expectedNext[job])
			assert.equal(receipt.next[0]!.requires[0]!.sha256, hash(raw))
		}
		assert.equal(t.store.events(discovered.id).some(event => event.kind === 'discovery-dropped'), false)
		t.restart()
		const reopened = t.store.get(discovered.id)!
		assert.deepEqual(reopened.outputs, discovered.outputs)
		assert.deepEqual(organReceipts(t.store, reopened).map(receipt => receipt.job), jobs)
		assert.deepEqual(lastJson(reopened.outputs.route!)!.preparation, t.contributions.route.preparation)
		assert.deepEqual(lastJson(reopened.outputs.route!)!.organPreparation, preparation('route', [{ id: 'guidance:csv-language' }]))
		const children = t.store.list().filter(item => item.discovery === reopened.id).sort((a, b) => a.id - b.id)
		assert.equal(children.length, 2)
		assert.deepEqual(children.map(child => lastJson(child.outputs.discover!)!.key), ['report-data', 'csv-export'])
		assert.deepEqual(children.map(child => lastJson(child.outputs.discover!)!.requirementIds), [['R-data'], ['R-csv']])
		assert.deepEqual(children.map(child => lastJson(child.outputs.discover!)!.artifacts), t.contributions.discover.items.map(item => item.artifacts))
		assert.deepEqual(children.map(child => lastJson(child.outputs.discover!)!.questionRefs), [[], ['Q-format']])
		assert.deepEqual(children.map(child => child.after ?? []), [[], [children[0]!.id]])
		for (const child of children) {
			assert.equal(child.status, 'candidate')
			assert.equal(child.source, source)
			assert.deepEqual(child.pack, reopened.pack)
			assert.deepEqual(child.organs, { version: '1', origin: { item: reopened.id, job: 'discover', outputHash: hash(reopened.outputs.discover!), target: 'delivery' } })
			const incoming = organPacket(t.store, child, 'ideate')!.incoming
			assert.equal(incoming.length, 1)
			assert.equal(incoming[0]!.from, 'discover')
			assert.equal(incoming[0]!.job, 'ideate')
			assert.equal(incoming[0]!.brief, 'discover prepared delivery: retain accepted discovery identities.')
			assert.deepEqual(incoming[0]!.requires, [{ ref: 'output:discover', sha256: hash(reopened.outputs.discover!) }])
			const checked = checkIncomingPreparation(t.store, child, 'ideate', t.repo)
			assert.equal(checked.ok, true)
			assert.deepEqual(checked.checked, [{ ref: 'output:discover', producer: 'discover', ok: true, reason: null }])
		}
	} finally { t.clean() }
})

async function pinnedItem() {
	const { pack } = await Effect.runPromise(resolvePackSelection('builtin:grammar'))
	const store = openStore(':memory:')
	const item = createWork(store, { title: 'Organ decoder control', objective, source, workspace: process.cwd(), pack, job: 'declare' })
	return { store, item }
}

test('discovery organs: shape advertising preserves the cartridge preparation array and blocked alternatives', async () => {
	const { store, item } = await pinnedItem()
	try {
		const original = deliverableShape(laneOf(item.pack), 'route')!, before = structuredClone(original)
		const advertised = organOutputShape(item, original)!
		const originalProperties = original.properties as Record<string, Record<string, unknown>>, properties = advertised.properties as Record<string, Record<string, unknown>>
		assert.equal(originalProperties.preparation!.type, 'array')
		assert.deepEqual(properties.preparation, originalProperties.preparation)
		assert.equal(properties.organPreparation!.type, 'object')
		assert.deepEqual(advertised.required, [...(original.required as string[]), 'organPreparation'])
		assert.deepEqual(original, before, 'advertising must not mutate the pinned cartridge shape')
		const blocked = { type: 'object', properties: { blocked: { type: 'string' } }, required: ['blocked'] }
		const branches = organOutputShape(item, { anyOf: [original, blocked] })!.anyOf as Record<string, unknown>[]
		assert.deepEqual(branches[0], advertised)
		assert.deepEqual(branches[1], blocked)
		assert.equal(organOutputShape({ ...item, organs: undefined }, original), original, 'legacy records retain their original advertised shape')
	} finally { store.close() }
})

test('discovery organs: a present invalid canonical value cannot fall back to valid legacy preparation', async () => {
	const { store, item } = await pinnedItem()
	try {
		const valid = preparation('declare')
		for (const organPreparation of [null, undefined, [], '', {}, { ...valid, ground: { ...valid.ground, sources: [] } }, { ...valid, next: [{ job: 'look-first', brief: 'Continue', requires: [] }] }]) {
			const value = { ...discovery().declare, preparation: valid, organPreparation }
			const result = inspectPreparation(item, 'declare', value, JSON.stringify(value), item.workspace, undefined, [], [])
			assert.equal(result.ok, false, `An explicitly invalid organPreparation was replaced by the legacy object: ${JSON.stringify(organPreparation)}`)
			if (!result.ok) assert.match(result.reason, /Ground, Rumen and next-step preparation are mandatory/)
		}
	} finally { store.close() }
})

test('discovery organs: valid legacy and canonical preparation use the same acceptance rules and retain raw hashes', async () => {
	const { store, item } = await pinnedItem()
	try {
		const valid = preparation('declare')
		for (const fields of [{ preparation: valid }, { organPreparation: valid }, { preparation: null, organPreparation: valid }]) {
			const value = { ...discovery().declare, ...fields }, raw = `Original bytes.\r\n${JSON.stringify(value, null, 2)}\n`
			const result = inspectPreparation(item, 'declare', value, raw, item.workspace, undefined, [], [])
			assert.equal(result.ok, true, result.ok ? '' : result.reason)
			if (result.ok) {
				assert.equal(result.receipt!.outputHash, hash(raw))
				assert.equal(result.receipt!.next[0]!.requires[0]!.sha256, hash(raw))
			}
		}
		for (const field of ['preparation', 'organPreparation']) {
			for (const defect of [{ ...valid, next: [] }, { ...valid, rumen: [{ rule: 'invented-rule', disposition: 'addressed', evidence: 'No selected rule has this identity.' }] }, { ...valid, ground: { ...valid.ground, sources: [{ ref: 'output:unavailable', finding: 'This output does not exist.' }] } }]) {
				const value = { ...discovery().declare, [field]: defect }, result = inspectPreparation(item, 'declare', value, JSON.stringify(value), item.workspace, undefined, [], [])
				assert.equal(result.ok, false, `${field} bypassed acceptance of the same invalid preparation`)
			}
		}
	} finally { store.close() }
})
