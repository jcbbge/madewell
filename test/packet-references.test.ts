import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { referenceDiscovery } from '../src/packet-references.ts'
test('exact raw bytes and candidate stay in the same packet once, with verifiable pointers', () => {
	const source = 'Raw café\r\nVoice input  '.repeat(100), candidate = { text: 'plant details  '.repeat(100) }, received = { discover: candidate }
	const context = { source, candidate, outputs: { declare: 'unchanged accepted output' } }
	const before = { item: { source }, received, discoveryContext: context }
	const result = referenceDiscovery(context, source, received)
	const after = { ...before, discoveryContext: result }
	assert.equal(result.source, undefined); assert.equal(result.candidate, undefined)
	const resolve = (pointer: string): unknown => pointer.split('/').slice(1).reduce((value, key) => (value as Record<string, unknown>)[key], after as unknown)
	for (const [name, expected] of [['source', source], ['candidate', candidate]] as const) {
		const ref = result[`${name}Reference`] as { pointer: string; sha256: string }
		const value = resolve(ref.pointer)
		assert.deepEqual(value, expected)
		assert.equal(createHash('sha256').update(JSON.stringify(value)).digest('hex'), ref.sha256)
	}
	assert.equal(source, context.source); assert.deepEqual(result.outputs, context.outputs)
	assert(Buffer.byteLength(JSON.stringify(after)) < Buffer.byteLength(JSON.stringify(before)), 'compare the same full packet, with no artificial source expansion')
	const originator = referenceDiscovery(context, source)
	assert.deepEqual(originator.candidate, candidate, 'No alias is made to an absent received field')
})
