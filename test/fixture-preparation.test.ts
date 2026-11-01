import assert from 'node:assert/strict'
import { test } from 'node:test'
import { preparedOutput } from './fixtures/prepared-output.ts'

test('fixture preparation preserves cartridge promises and accounts for the actual packet rules', () => {
	const preparation = [{ task: 'candidate', needs: 'A cartridge-owned promise.' }]
	const value = { preparation, items: [{ title: 'Candidate' }] }
	const packet = { item: { objective: 'Keep the supplied intent.', source: 'Exact raw input.' }, organs: {
		rules: [{ id: 'mechanical', kind: 'fence', text: 'Run the independent check.' }, { id: 'language', kind: 'sign', text: 'Preserve the operator vocabulary.' }],
		nextJobs: ['first-consumer', 'second-consumer'],
	} }
	const result = preparedOutput(packet, 'producer', value) as typeof value & { organPreparation: { ground: { intent: string; sources: { ref: string; finding: string }[] }; rumen: { rule: string; evidence: string }[]; next: { job: string; requires: string[] }[] } }
	assert.deepEqual(result.preparation, preparation)
	assert.equal(result.organPreparation.ground.intent, packet.item.objective)
	assert.match(result.organPreparation.ground.sources[0]!.finding, /Exact raw input/)
	assert.deepEqual(result.organPreparation.rumen.map(rule => rule.rule), ['mechanical', 'language'])
	assert.match(result.organPreparation.rumen[0]!.evidence, /does not claim a gate pass/)
	assert.deepEqual(result.organPreparation.next.map(next => [next.job, next.requires]), [['first-consumer', ['output:producer']], ['second-consumer', ['output:producer']]])
	assert.deepEqual(preparedOutput({ item: packet.item }, 'producer', value), value, 'an explicit legacy packet does not invent organ evidence')
})
