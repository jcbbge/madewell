import { test } from 'node:test'
import assert from 'node:assert/strict'
import { acceptanceProblem } from '../src/acceptance-contract.ts'

const valid = () => ({ doneWhen: [{ id: 'D1', text: 'The saved photograph is served', evidence: {
	evaluator: 'candidate-check', availableAfter: 'implementation',
	inputs: [{ kind: 'candidate', ref: 'HTTP/photo/SQLite fixture' }, { kind: 'environment', ref: 'browser capability manifest' }],
} }] })
test('legacy conditions remain readable; strict plans require a concrete evaluator and inputs', () => {
	assert.equal(acceptanceProblem({ doneWhen: [{ id: 'D1', text: 'saved' }] }), undefined)
	assert.match(acceptanceProblem({ doneWhen: [{ id: 'D1', text: 'saved' }] }, true)!, /name the evaluator/)
	assert.equal(acceptanceProblem(valid(), true), undefined)
})
test('future shipment and report cycles cannot be assigned to candidate checks', () => {
	for (const availableAfter of ['shipment', 'manual-qa', 'verification-report']) {
		const plan = valid(); plan.doneWhen[0]!.evidence.availableAfter = availableAfter
		assert.match(acceptanceProblem(plan, true)!, /cannot require future shipment/)
	}
})
test('repository checks cannot attest private maker execution history or operator verdicts', () => {
	for (const kind of ['execution-history', 'implementation-report', 'operator-verdict']) {
		const plan = valid(); plan.doneWhen[0]!.evidence.inputs = [{ kind, ref: 'unavailable' }]
		assert.match(acceptanceProblem(plan, true)!, /not candidate inputs/)
	}
	const plan = valid(); plan.doneWhen[0]!.evidence.evaluator = 'implementer'
	assert.match(acceptanceProblem(plan, true)!, /not the candidate check evaluator/)
})
