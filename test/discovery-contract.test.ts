import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	DISCOVERY_CONTRIBUTION_SCHEMAS, parseDiscoveryContribution, usesDiscoveryContract,
	validateDiscoveryConfirmation, validateDiscoveryContribution, type AcceptedDiscovery, type DiscoveryValidation,
} from '../src/discovery-contract.ts'
import { GRAMMAR_PACK } from '../src/grammar.ts'
import { laneOf, validate } from '../src/lane.ts'

const envelope = () => ({ discoveryContract: '1' as const, result: 'Retained explanation.\r\nExact prose remains available.  ', sources: ['raw-input'], unknowns: [], decisions: [], evidence: [], questions: [] })
const raw = { id: 'raw', ref: 'capture:original#L1-L8' }
const claim = (id: string, text: string) => ({ id, text, sources: ['raw'] })
const candidate = (key: string, requirementIds: string[], artifact?: string) => ({
	key, title: key, kind: 'feature' as const, objective: `Deliver ${key}`, text: `Inspect and deliver ${key}.`, requirementIds,
	artifacts: artifact ? [{ id: artifact, description: `Accepted ${artifact}`, sources: ['raw'] }] : [],
})

/** Preparation is concrete delivered work. Both roots can start, and integration consumes their artifacts. */
function fixture() {
	const design = candidate('design-contract', ['R-style', 'R-stack'], 'visual-specimen')
	const care = candidate('care-research', ['R-care', 'R-stack'], 'care-contract')
	const app = candidate('app', ['R-style', 'R-care', 'R-stack'])
	const dependencies = [
		{ id: 'E-design', producer: design.key, consumer: app.key, artifactId: 'visual-specimen' as string | null, readiness: 'task-delivered', reason: 'App presentation consumes the accepted visual specimen.', sources: ['raw'] },
		{ id: 'E-care', producer: care.key, consumer: app.key, artifactId: 'care-contract', readiness: 'task-delivered', reason: 'App guidance consumes the accepted care contract.', sources: ['raw'] },
	]
	const accepted = {
		declare: { ...envelope(), evidence: [raw], intent: [{ ...claim('I-app', 'A useful, playful app.'), authority: 'explicit' }] },
		'look-first': { ...envelope(), evidence: [{ id: 'repo', ref: 'workspace:README.md#L4' }], observations: [{ id: 'F-base', text: 'The application is a bootstrap.', sources: ['repo'] }] },
		classify: { ...envelope(), requirements: [
			{ ...claim('R-style', 'A memorable, playful presentation.'), kind: 'outcome', origin: 'explicit' },
			{ ...claim('R-care', 'Plant-specific care guidance.'), kind: 'outcome', origin: 'explicit' },
			{ ...claim('R-stack', 'Use plain browser JavaScript.'), kind: 'constraint', origin: 'explicit' },
		], questions: [{ ...claim('Q-guidance', 'What guidance sources are trustworthy?'), ownerRole: 'care researcher', blockingRole: 'planner' }] },
		lenses: { ...envelope(), tradeoffs: [{ ...claim('T-care', 'Avoid rewarding excessive intervention.'), requirementIds: ['R-care'] }] },
		'one-thing': { ...envelope(), candidates: [design, care, app] },
		route: { ...envelope(), dependencies, preparation: [
			{ id: 'P-design', candidate: design.key, before: app.key, reason: 'Design must be available before app presentation is fixed.', sources: ['raw'] },
			{ id: 'P-care', candidate: care.key, before: app.key, reason: 'Care research can begin independently.', sources: ['raw'] },
		] },
	} satisfies AcceptedDiscovery
	const confirmed = { ...envelope(), items: [{ ...design, after: [] as number[] }, { ...care, after: [] as number[] }, { ...app, after: [1, 2] }], dependencyIds: ['E-design', 'E-care'], preparationIds: ['P-design', 'P-care'], questionIds: ['Q-guidance'] }
	return { accepted, confirmed: structuredClone(confirmed) }
}

function rejects(result: DiscoveryValidation<unknown>, code: string) {
	assert.equal(result.ok, false, `Expected ${code}; validation accepted the adversarial output.`)
	if (!result.ok) assert.ok(result.issues.some((i) => i.code === code), result.reason)
}

test('negative control: the legacy nonempty result envelope accepts semantically broken routing', () => {
	const legacy = validate(laneOf(GRAMMAR_PACK), 'route', JSON.stringify({ result: 'All work may prepare in parallel, but every later task waits for all earlier shipment.', sources: [], unknowns: ['No owner assigned.'], decisions: [] }))
	assert.equal(legacy.ok, true, 'This records the actual legacy contract boundary, not strict semantic acceptance.')
	assert.equal(usesDiscoveryContract({ result: 'Legacy evidence remains valid.' }), false)
	rejects(parseDiscoveryContribution('route', { result: 'done', sources: [], unknowns: [], decisions: [] }), 'shape')
})

test('function-specific schemas preserve genuine independent roots, prior identities, prose and evidence', () => {
	const { accepted, confirmed } = fixture()
	const prefix: Partial<Record<keyof typeof accepted, unknown>> = {}
	for (const job of Object.keys(accepted) as (keyof typeof accepted)[]) {
		const checked = validateDiscoveryContribution(job, accepted[job], prefix)
		assert.equal(checked.ok, true, !checked.ok ? checked.reason : '')
		prefix[job] = accepted[job]
	}
	const rich = { ...confirmed, fullEvidence: { raw: 'exact\r\noperator source  ', attachment: 'capture:blob/1' } }
	const result = validateDiscoveryConfirmation(rich, accepted)
	assert.equal(result.ok, true, !result.ok ? result.reason : '')
	if (result.ok) assert.deepEqual(result.value, rich, 'No normalization may delete prose, evidence or original source bytes.')
	assert.deepEqual(confirmed.items.slice(0, 2).map((c) => c.after), [[], []])
	assert.ok(DISCOVERY_CONTRIBUTION_SCHEMAS.classify.properties)
	assert.notDeepEqual(DISCOVERY_CONTRIBUTION_SCHEMAS.classify, DISCOVERY_CONTRIBUTION_SCHEMAS.route)
})

test('a dropped constraint and invented requirement cannot hide behind complete candidate prose', () => {
	const { accepted, confirmed } = fixture()
	for (const item of confirmed.items) item.requirementIds = item.requirementIds.filter((id) => id !== 'R-stack')
	rejects(validateDiscoveryConfirmation(confirmed, accepted), 'lost-requirement')
	const invented = fixture()
	invented.confirmed.items[0]!.requirementIds.push('R-paid-identification')
	rejects(validateDiscoveryConfirmation(invented.confirmed, invented.accepted), 'unknown-reference')
	const source = fixture()
	source.accepted.classify.requirements[0]!.sources = ['invented-source']
	rejects(validateDiscoveryConfirmation(source.confirmed, source.accepted), 'unknown-reference')
})

test('ownerless and dropped uncertainty are rejected; known questions remain references', () => {
	const { accepted, confirmed } = fixture()
	accepted.classify.questions[0]!.ownerRole = ' '
	rejects(validateDiscoveryConfirmation(confirmed, accepted), 'ownerless-question')
	const dropped = fixture()
	dropped.confirmed.questionIds = []
	rejects(validateDiscoveryConfirmation(dropped.confirmed, dropped.accepted), 'lost-question')
	const orphan = fixture()
	orphan.confirmed.questionIds.push('Q-never-asked')
	rejects(validateDiscoveryConfirmation(orphan.confirmed, orphan.accepted), 'unknown-reference')
})

test('confirmation may record new owned uncertainty without discarding accepted questions', () => {
	const { accepted, confirmed } = fixture()
	const revised = { ...confirmed, questions: [{ ...claim('Q-new', 'Which reference can be redistributed?'), ownerRole: 'designer', blockingRole: 'implementer' }], questionIds: [...confirmed.questionIds, 'Q-new'] }
	assert.equal(validateDiscoveryConfirmation(revised, accepted).ok, true)
})

test('confirmation cannot drop candidates, accepted routing or artifact deliverables', () => {
	const rewritten = fixture()
	rewritten.confirmed.items[0]!.objective = 'A different outcome with the same key'
	rejects(validateDiscoveryConfirmation(rewritten.confirmed, rewritten.accepted), 'changed-candidate')
	const dropped = fixture()
	dropped.confirmed.items.splice(1, 1)
	rejects(validateDiscoveryConfirmation(dropped.confirmed, dropped.accepted), 'lost-candidate')
	const edge = fixture()
	edge.confirmed.dependencyIds = ['E-design']
	rejects(validateDiscoveryConfirmation(edge.confirmed, edge.accepted), 'lost-dependency')
	const changed = fixture()
	changed.confirmed.items[2]!.after = [1]
	rejects(validateDiscoveryConfirmation(changed.confirmed, changed.accepted), 'changed-dependency')
	const artifact = fixture()
	artifact.confirmed.items[0] = { ...artifact.confirmed.items[0]!, artifacts: [] }
	rejects(validateDiscoveryConfirmation(artifact.confirmed, artifact.accepted), 'changed-artifact')
})

test('cycles, unknown producers, forward positions and unowned artifact prerequisites fail visibly', () => {
	const cyclic = fixture()
	cyclic.accepted.route.dependencies.push({ ...cyclic.accepted.route.dependencies[0]!, id: 'E-cycle', producer: 'app', consumer: 'design-contract', artifactId: null })
	rejects(validateDiscoveryConfirmation(cyclic.confirmed, cyclic.accepted), 'cyclic-dependency')
	const missing = fixture()
	missing.accepted.route.dependencies[0]!.producer = 'missing'
	rejects(validateDiscoveryConfirmation(missing.confirmed, missing.accepted), 'unknown-reference')
	const artifact = fixture()
	artifact.accepted.route.dependencies[0]!.artifactId = 'care-contract'
	rejects(validateDiscoveryConfirmation(artifact.confirmed, artifact.accepted), 'unknown-artifact')
	const forward = fixture()
	forward.confirmed.items[0]!.after = [2]
	rejects(validateDiscoveryConfirmation(forward.confirmed, forward.accepted), 'invalid-after')
})

test('preparation promises cannot collapse into a prefix chain, including through transitive edges', () => {
	const chain = fixture()
	chain.accepted.route.preparation = [{ id: 'P-care', candidate: 'app', before: 'design-contract', reason: 'App definition can start before design shipment.', sources: ['raw'] }]
	rejects(validateDiscoveryConfirmation(chain.confirmed, chain.accepted), 'serialized-preparation')
	const transitive = fixture()
	const bridge = { ...transitive.accepted.route.dependencies[0]!, id: 'E-care-after-design', consumer: 'care-research' }
	transitive.accepted.route.dependencies = [transitive.accepted.route.dependencies[1]!, bridge]
	transitive.accepted.route.preparation = [{ id: 'P-care', candidate: 'app', before: 'design-contract', reason: 'Independent definition.', sources: ['raw'] }]
	rejects(validateDiscoveryConfirmation(transitive.confirmed, transitive.accepted), 'serialized-preparation')
	const dropped = fixture()
	dropped.confirmed.preparationIds = []
	rejects(validateDiscoveryConfirmation(dropped.confirmed, dropped.accepted), 'lost-preparation')
})

test('within-task artifact readiness is explicitly unsupported, rather than silently lowered to shipment', () => {
	const { accepted, confirmed } = fixture()
	accepted.route.dependencies[0]!.readiness = 'within-task'
	rejects(validateDiscoveryConfirmation(confirmed, accepted), 'unsupported-readiness')
})

test('unknown versions and incomplete accepted prefixes never receive conservation acceptance', () => {
	const { accepted, confirmed } = fixture()
	assert.equal(usesDiscoveryContract({ discoveryContract: 'future' }), true)
	rejects(parseDiscoveryContribution('discover', { ...confirmed, discoveryContract: 'future' }), 'shape')
	rejects(validateDiscoveryConfirmation(confirmed, { classify: accepted.classify }), 'missing-contribution')
})
