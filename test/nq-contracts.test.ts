import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Schema } from 'effect'
import { discoveryContributionShape, parseDiscoveryContribution, validateDiscoveryConfirmation, validateDiscoveryContribution, type AcceptedDiscovery, type DiscoveryValidation } from '../src/discovery-contract.ts'
import { checkPrerequisites, prerequisiteForReference, Prerequisite } from '../src/prerequisites.ts'
import { Project } from '../src/project.ts'
import { answerHistory, decisionProblem, recordPhaseDecisions } from '../src/nq-obligations.ts'
import { problemsOf, type Pack } from '../src/lane.ts'
import { openStore } from '../src/store.ts'

const handoff = { handoff: true }
const envelope = () => ({ discoveryContract: '1' as const, result: 'Exact retained explanation.\r\nCafé λ  ', sources: ['capture:original'], unknowns: [], decisions: [], evidence: [], questions: [] })
const sourced = (id: string, text: string) => ({ id, text, sources: ['raw'] })

function discovery() {
	const first = { key: 'csv', title: 'Provide CSV', kind: 'feature' as const, objective: 'Export the report as CSV', text: 'Provide a CSV report using the existing shell application.', requirementIds: ['R-csv'], questionRefs: ['Q-format'], artifacts: [{ id: 'A-csv', description: 'The delivered CSV export', sources: ['raw'] }] }
	const candidate = structuredClone(first)
	const prefix = {
		declare: { ...envelope(), evidence: [{ id: 'raw', ref: 'capture:original#L1-L3' }], intent: [{ ...sourced('I-csv', 'Export a CSV report'), authority: 'explicit' }, { ...sourced('I-lab', 'Use the supplied laboratory infrastructure'), authority: 'explicit' }], questions: [{ ...sourced('Q-format', 'Which delimiter should the CSV use?'), ownerRole: 'planner', blockingRole: 'planner' }, { ...sourced('Q-note', 'Could there be a later optional format?'), ownerRole: 'ideator', blockingRole: null }] },
		'look-first': { ...envelope(), observations: [sourced('F-shell', 'An existing shell application is supplied.')] },
		classify: { ...envelope(), requirements: [{ ...sourced('R-csv', 'Provide the CSV export'), kind: 'outcome', origin: 'explicit', intentIds: ['I-csv'] }], intentDispositions: [{ intentId: 'I-lab', kind: 'provided', reason: 'The laboratory is supplied, not new product scope.', sources: ['raw'] }] },
		lenses: { ...envelope(), tradeoffs: [] },
		'one-thing': { ...envelope(), candidates: [first] },
		route: { ...envelope(), dependencies: [], preparation: [] },
	} satisfies AcceptedDiscovery
	const confirmation = { ...envelope(), items: [{ ...candidate, after: [] as number[] }], dependencyIds: [], preparationIds: [], questionIds: ['Q-format', 'Q-note'] }
	return { prefix, confirmation }
}

function rejects(result: DiscoveryValidation<unknown>, code: string) {
	assert.equal(result.ok, false, `Expected ${code}; the defective contribution was accepted.`)
	if (!result.ok) assert.ok(result.issues.some(issue => issue.code === code), result.reason)
}

function files() {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-nq-inputs-')))
	mkdirSync(join(root, 'fixtures'))
	writeFileSync(join(root, 'fixtures/data.txt'), 'Café λ\r\nExact fixture  ')
	writeFileSync(join(root, 'tool.sh'), '#!/bin/sh\nexit 0\n')
	chmodSync(join(root, 'tool.sh'), 0o700)
	return { root, clean: () => rmSync(root, { recursive: true, force: true }) }
}

function obligations() {
	const f = files(), store = openStore(join(f.root, 'questions.db'))
	const output = { type: 'object' }
	const pack: Pack = { name: 'Handoff-only discovery', runtime: 'functions', contracts: { handoff: '1' }, discovery: [{ cartridge: 'discovery', steps: [
		{ job: 'declare', profile: 'declarer', run: "echo '{}'", output }, { job: 'finalize', run: "echo '{}'", output },
	] }], delivery: [{ cartridge: 'delivery', steps: [
		{ job: 'resolve-choice', profile: 'planner', run: "echo '{}'", output }, { job: 'execute-task', profile: 'implementer', run: "echo '{}'", output },
	] }] }
	assert.deepEqual(problemsOf(pack), [])
	const item = store.create({ title: 'Discovery', objective: 'Produce executable tasks', source: 'Raw intended outcome', workspace: f.root, pack, status: 'running', job: 'finalize', flow: { loop: 'discovery', accepted: ['declare'] }, outputs: { declare: JSON.stringify({ questions: [] }) } })
	const question = { id: 'Q-format', text: 'Which source format is authoritative?', ownerRole: 'declarer', blockingRole: 'planner' as string | null }
	const candidate = { key: 'export', title: 'Export', objective: 'Deliver the export', questionRefs: [question.id] }
	return { store, item, question, candidate, clean() { store.close(); f.clean() } }
}

test('NQ contract: intent coverage begins at Declare while explicit supplied context does not become product work', () => {
	const { prefix, confirmation } = discovery()
	const accepted: AcceptedDiscovery = {}
	for (const job of ['declare', 'look-first', 'classify', 'lenses', 'one-thing', 'route'] as const) {
		const result = validateDiscoveryContribution(job, prefix[job], accepted, handoff)
		assert.equal(result.ok, true, result.ok ? '' : result.reason)
		Object.assign(accepted, { [job]: prefix[job] })
	}
	assert.equal(validateDiscoveryConfirmation(confirmation, accepted, handoff).ok, true)
	assert.equal(confirmation.items.length, 1, 'supplied infrastructure requires a disposition, not an invented delivery task')
	assert.equal(prefix.declare.result, 'Exact retained explanation.\r\nCafé λ  ')
})

test('NQ contract: a missing declared intent cannot hide behind complete later requirement ownership', () => {
	const { prefix, confirmation } = discovery()
	prefix.classify.intentDispositions = []
	rejects(validateDiscoveryContribution('classify', prefix.classify, prefix, handoff), 'lost-intent')
	rejects(validateDiscoveryConfirmation(confirmation, prefix, handoff), 'lost-intent')
	assert.equal(validateDiscoveryContribution('classify', prefix.classify, prefix).ok, true, 'the existing pinned v1 contract retains its prior meaning')
})

test('NQ contract: intent bindings and dispositions reject invented IDs, duplicate disposal and contradictory coverage', () => {
	const invented = discovery()
	invented.prefix.classify.requirements[0]!.intentIds = ['I-never-declared']
	rejects(validateDiscoveryConfirmation(invented.confirmation, invented.prefix, handoff), 'unknown-reference')
	const double = discovery()
	double.prefix.classify.intentDispositions.push(structuredClone(double.prefix.classify.intentDispositions[0]!))
	rejects(validateDiscoveryConfirmation(double.confirmation, double.prefix, handoff), 'duplicate-identity')
	const conflict = discovery()
	conflict.prefix.classify.intentDispositions.push({ intentId: 'I-csv', kind: 'provided', reason: 'Incorrectly dispose the requested feature.', sources: ['raw'] })
	rejects(validateDiscoveryConfirmation(conflict.confirmation, conflict.prefix, handoff), 'conflicting-intent-disposition')
	const unsourced = discovery()
	unsourced.prefix.classify.intentDispositions[0]!.sources = ['source-that-does-not-exist']
	rejects(validateDiscoveryConfirmation(unsourced.confirmation, unsourced.prefix, handoff), 'unknown-reference')
	const blank = discovery()
	blank.prefix.classify.intentDispositions[0]!.reason = ' '
	rejects(validateDiscoveryConfirmation(blank.confirmation, blank.prefix, handoff), 'missing-disposition-reason')
})

test('NQ contract: the opt-in schema communicates intent bindings without changing the v1 output shape', () => {
	const { prefix } = discovery()
	const old = { ...prefix.classify, requirements: prefix.classify.requirements.map(({ intentIds: _ids, ...requirement }) => requirement) }
	delete (old as { intentDispositions?: unknown }).intentDispositions
	assert.equal(parseDiscoveryContribution('classify', old).ok, true)
	rejects(parseDiscoveryContribution('classify', old, handoff), 'shape')
	assert.match(JSON.stringify(discoveryContributionShape('classify', handoff)), /intentIds/)
	assert.doesNotMatch(JSON.stringify(discoveryContributionShape('classify')), /intentDispositions/)
})

test('NQ contract: every blocking question reaches a task; nonblocking notes remain nonblocking', () => {
	const normal = discovery()
	assert.equal(validateDiscoveryConfirmation(normal.confirmation, normal.prefix, handoff).ok, true, 'Q-note is deliberately not assigned to a task')
	const lost = discovery()
	lost.prefix['one-thing'].candidates[0]!.questionRefs = []
	lost.confirmation.items[0]!.questionRefs = []
	rejects(validateDiscoveryContribution('one-thing', lost.prefix['one-thing'], lost.prefix, handoff), 'lost-blocking-question')
	rejects(validateDiscoveryConfirmation(lost.confirmation, lost.prefix, handoff), 'lost-blocking-question')
	const unknown = discovery()
	unknown.confirmation.items[0]!.questionRefs.push('Q-made-up')
	rejects(validateDiscoveryConfirmation(unknown.confirmation, unknown.prefix, handoff), 'unknown-reference')
})

test('NQ contract: confirmation retains assigned questions and can attach a genuinely new late question', () => {
	const dropped = discovery()
	dropped.confirmation.items[0]!.questionRefs = []
	rejects(validateDiscoveryConfirmation(dropped.confirmation, dropped.prefix, handoff), 'changed-question-ownership')
	const late = discovery()
	const question = { ...sourced('Q-late', 'Which upstream field is authoritative?'), ownerRole: 'planner', blockingRole: 'planner' }
	const route = { ...late.prefix.route, questions: [question] }
	const prefix = { ...late.prefix, route }
	late.confirmation.questionIds.push('Q-late')
	rejects(validateDiscoveryConfirmation(late.confirmation, prefix, handoff), 'lost-blocking-question')
	late.confirmation.items[0]!.questionRefs.push('Q-late')
	assert.equal(validateDiscoveryConfirmation(late.confirmation, prefix, handoff).ok, true)
})

test('NQ contract: clarification may change accidental prose while durable task and obligation bindings remain fixed', () => {
	const { prefix, confirmation } = discovery()
	confirmation.items[0]!.title = 'Make the CSV report available'
	confirmation.items[0]!.objective = 'Let the user obtain the requested report as CSV'
	confirmation.items[0]!.text = 'Provide the same CSV report from the existing shell application; wording clarified through the handoff.'
	confirmation.items[0]!.artifacts[0]!.description = 'The accepted CSV report export'
	const result = validateDiscoveryConfirmation(confirmation, prefix, handoff)
	assert.equal(result.ok, true, result.ok ? '' : result.reason)
	if (result.ok) assert.deepEqual(result.value, confirmation, 'validation does not normalize away the clarification')
	assert.equal(prefix['one-thing'].candidates[0]!.title, 'Provide CSV', 'accepted predecessor remains unchanged')
	rejects(validateDiscoveryConfirmation(confirmation, prefix), 'changed-candidate')
	const wrong = discovery()
	wrong.confirmation.items[0]!.artifacts[0]!.id = 'A-different-output'
	rejects(validateDiscoveryConfirmation(wrong.confirmation, wrong.prefix, handoff), 'changed-artifact')
})

test('NQ handoff contract: a final candidate cannot strand a new question in a discovery phase that has already passed', () => {
	const t = obligations()
	try {
		const question = { ...t.question, blockingRole: 'declare' }
		const problem = decisionProblem(t.store, t.item, 'finalize', { questions: [question], items: [t.candidate] }, [])
		assert.match(problem!, /outside its delivery.*Q-format: declare/)
		const child = t.store.create({ title: 'Export', objective: 'Deliver the export', source: t.item.source, workspace: t.item.workspace, pack: t.item.pack, discovery: t.item.id, job: 'execute-task', outputs: { discover: JSON.stringify(t.candidate) } })
		t.store.save({ ...t.item, outputs: { declare: JSON.stringify({ questions: [question] }) } }, 'fixture-past-question', {})
		assert.match(decisionProblem(t.store, child, 'execute-task', {}, [])!, /unconfigured receiving phase.*Q-format: declare/)
	} finally { t.clean() }
})

test('NQ handoff contract: a previously accepted discovery decision can accompany its task through delivery', () => {
	const t = obligations()
	try {
		const question = { ...t.question, blockingRole: 'declare' }
		const decision = { questionId: question.id, question: question.text, decision: 'Use the supplied CSV source.', why: 'It is the source explicitly attached to this task.', verdict: 'at-least-two', legs: [
			{ leg: 'DX', pass: true, gets: 'Existing parser', costs: 'No new format', why: 'Uses the supplied interface.' },
			{ leg: 'UX', pass: true, gets: 'Requested export', costs: 'No configuration', why: 'Preserves the raw intended outcome.' },
			{ leg: 'AX', pass: false, gets: 'Fixed source', costs: 'No new capability', why: 'No additional automation is required.' },
		] }
		const accepted = t.store.save({ ...t.item, outputs: { declare: JSON.stringify({ questions: [question], decisions: [decision] }) } }, 'accepted', { job: 'declare' })
		recordPhaseDecisions(t.store, accepted, 'declare', 1, { decisions: [decision] })
		const history = answerHistory(t.store, accepted, 'finalize')
		assert.equal(history.answers.length, 1)
		assert.equal(decisionProblem(t.store, accepted, 'finalize', { items: [t.candidate] }, history.answers), undefined)
		const child = t.store.create({ title: 'Export', objective: 'Deliver the export', source: t.item.source, workspace: t.item.workspace, pack: t.item.pack, discovery: t.item.id, job: 'execute-task', outputs: { discover: JSON.stringify(t.candidate) } })
		assert.equal(decisionProblem(t.store, child, 'execute-task', {}, answerHistory(t.store, child, 'execute-task').answers), undefined)
	} finally { t.clean() }
})

test('NQ handoff contract: final discovery must bind unresolved questions to a receiving task', () => {
	const t = obligations()
	try {
		for (const items of [[], [{ ...t.candidate, questionRefs: [] }], [{ title: 'Unrelated task', objective: 'Different outcome' }]]) {
			assert.match(decisionProblem(t.store, t.item, 'finalize', { questions: [t.question], items }, [])!, /no receiving task.*Q-format/)
		}
		assert.equal(decisionProblem(t.store, t.item, 'finalize', { questions: [t.question], items: [t.candidate] }, []), undefined)
		assert.equal(decisionProblem(t.store, t.item, 'finalize', { questions: [{ ...t.question, blockingRole: null }], items: [] }, []), undefined)
	} finally { t.clean() }
})

test('NQ handoff contract: malformed custom discovery output returns an actionable refusal instead of throwing', () => {
	const t = obligations()
	try {
		const cases: [string, Record<string, unknown>, RegExp][] = [
			['null question', { questions: [null] }, /questions need an ID/],
			['omitted blocker', { questions: [{ id: 'Q', text: 'Question', ownerRole: 'planner' }] }, /explicit blocking role or null/],
			['blank blocker', { questions: [{ ...t.question, blockingRole: ' ' }] }, /explicit blocking role or null/],
			['nonarray questions', { questions: {} }, /questions need an ID/],
			['null candidate', { items: [null] }, /candidates must be objects/],
			['array candidate', { items: [[]] }, /candidates must be objects/],
			['null references', { items: [{ ...t.candidate, questionRefs: null }] }, /questionRefs must contain/],
			['nonarray references', { items: [{ ...t.candidate, questionRefs: 'Q-format' }] }, /questionRefs must contain/],
			['nonstrings in references', { items: [{ ...t.candidate, questionRefs: [null] }] }, /questionRefs must contain/],
			['invented reference', { items: [t.candidate] }, /question absent from this discovery/],
		]
		for (const [label, value, expected] of cases) {
			let problem: string | undefined
			assert.doesNotThrow(() => { problem = decisionProblem(t.store, t.item, 'finalize', value, []) }, label)
			assert.match(problem!, expected, label)
		}
		const legacy = { ...t.item, pack: { ...t.item.pack!, contracts: undefined } }
		assert.equal(decisionProblem(t.store, legacy, 'finalize', { questions: [null], items: [null] }, []), undefined, 'the handoff opt-in does not reinterpret a legacy custom pack')
	} finally { t.clean() }
})

test('NQ prerequisites: actual bytes, executable access and directories are checked for the receiving role', () => {
	const f = files()
	try {
		const digest = createHash('sha256').update(readFileSync(join(f.root, 'fixtures/data.txt'))).digest('hex')
		const inputs: Prerequisite[] = [{ id: 'fixture', path: 'fixtures/data.txt', kind: 'file', sha256: digest.toUpperCase(), jobs: ['test-plan'] }, { id: 'fixtures', path: 'fixtures', kind: 'directory', jobs: ['test-plan'] }, { id: 'tool', path: 'tool.sh', kind: 'executable', jobs: ['test-plan'] }]
		const checks = checkPrerequisites(inputs, 'test-plan', f.root)
		assert.equal(checks.length, 3)
		assert.ok(checks.every(check => check.ok && check.reason === null))
		assert.equal(checks[0]!.sha256, digest)
		assert.deepEqual(checkPrerequisites(inputs, 'implement', f.root), [], 'a checker-only input is not silently supplied to the implementer')
		writeFileSync(join(f.root, 'fixtures/data.txt'), 'changed fixture')
		assert.match(checkPrerequisites(inputs, 'test-plan', f.root)[0]!.reason!, /do not match/)
	} finally { f.clean() }
})

test('NQ prerequisites: missing, wrong-type and non-executable resources return actionable failures', () => {
	const f = files()
	try {
		chmodSync(join(f.root, 'tool.sh'), 0o600)
		const checks = checkPrerequisites([{ id: 'missing', path: 'missing.txt', kind: 'file' }, { id: 'wrong-type', path: 'fixtures', kind: 'file' }, { id: 'tool', path: 'tool.sh', kind: 'executable' }], 'implement', f.root)
		assert.ok(checks.every(check => !check.ok))
		assert.match(checks[0]!.reason!, /implement.*ENOENT/)
		assert.match(checks[1]!.reason!, /different type/)
		assert.match(checks[2]!.reason!, /implement.*EACCES/)
	} finally { f.clean() }
})

test('NQ prerequisites: relative escape and duplicate bindings cannot masquerade as available inputs', () => {
	const f = files()
	try {
		const escaped = checkPrerequisites([{ id: 'escape', path: '../outside', kind: 'file' }], 'plan', f.root)
		assert.match(escaped[0]!.reason!, /leaves the receiving worktree/)
		const duplicates: Prerequisite[] = [{ id: 'same', path: 'fixtures/data.txt', kind: 'file' }, { id: 'same', path: 'tool.sh', kind: 'executable' }]
		assert.ok(checkPrerequisites(duplicates, 'plan', f.root).every(check => !check.ok && /multiple bindings/.test(check.reason!)))
		assert.throws(() => Schema.decodeUnknownSync(Project)({ path: f.root, inputs: duplicates }), /unique/)
	} finally { f.clean() }
})

test('NQ prerequisites: a named environment reference resolves only to an explicit binding for its consumer', () => {
	const f = files()
	try {
		const input: Prerequisite = { id: 'fixture', path: join(f.root, 'not-created-yet'), kind: 'file', jobs: ['test-plan'] }
		assert.equal(prerequisiteForReference([input], 'input:fixture', 'test-plan').ok, true, 'binding and physical availability are deliberately distinct checks')
		assert.equal(checkPrerequisites([input], 'test-plan', f.root)[0]!.ok, false)
		for (const ref of ['capture:original#L1', 'fixtures/data.txt', 'input:', 'input:unknown']) assert.equal(prerequisiteForReference([input], ref).ok, false, ref)
		assert.equal(prerequisiteForReference([input], 'input:fixture', 'implement').ok, false)
		assert.equal(prerequisiteForReference([input, input], 'input:fixture').ok, false)
	} finally { f.clean() }
})

test('NQ prerequisites: a relative symlink cannot escape the receiving worktree, while an explicit host binding can', () => {
	const f = files(), outside = realpathSync(mkdtempSync(join(tmpdir(), 'mw-nq-host-input-')))
	try {
		const hostFile = join(outside, 'fixture.txt')
		writeFileSync(hostFile, 'explicit host fixture')
		symlinkSync(hostFile, join(f.root, 'escaped-file'))
		symlinkSync(outside, join(f.root, 'escaped-directory'), 'dir')
		symlinkSync(join(f.root, 'fixtures/data.txt'), join(f.root, 'internal-file'))
		const checks = checkPrerequisites([{ id: 'file', path: 'escaped-file', kind: 'file' }, { id: 'directory', path: 'escaped-directory', kind: 'directory' }, { id: 'host', path: hostFile, kind: 'file' }, { id: 'internal', path: 'internal-file', kind: 'file' }], 'verify', f.root)
		assert.deepEqual(checks.map(check => check.ok), [false, false, true, true])
		assert.ok(checks.slice(0, 2).every(check => /resolves outside/.test(check.reason!)))
	} finally { f.clean(); rmSync(outside, { recursive: true, force: true }) }
})

test('NQ prerequisites: environment evidence defaults to the actual verification job, not only its test author', () => {
	const input: Prerequisite = { id: 'browser', path: process.execPath, kind: 'executable', jobs: ['test-plan'] }
	const absent = prerequisiteForReference([input], 'input:browser')
	assert.equal(absent.ok, false)
	if (!absent.ok) assert.match(absent.reason, /verify/)
	assert.equal(prerequisiteForReference([input], 'input:browser', 'test-plan').ok, true)
	assert.equal(prerequisiteForReference([{ ...input, jobs: ['test-plan', 'verify'] }], 'input:browser').ok, true)
})

test('NQ prerequisites: invalid checksum declarations fail schema validation and cannot turn a directory into a file proof', () => {
	for (const sha256 of ['', 'a'.repeat(63), 'z'.repeat(64)]) assert.throws(() => Schema.decodeUnknownSync(Prerequisite)({ id: 'bad', path: 'file', kind: 'file', sha256 }))
	assert.throws(() => Schema.decodeUnknownSync(Prerequisite)({ id: 'bad', path: 'directory', kind: 'directory', sha256: 'a'.repeat(64) }), /directory/)
})
