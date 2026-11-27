import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drive, runQueue } from '../src/engine.ts'
import { regressionFixture, regressionPrescriptions, resultPack } from './fixtures/prepared-output.ts'
test('external work stays open and never invokes a worker',async()=>{const t=regressionFixture();try{const i=await t.create();await t.run(runQueue({prescriptions:regressionPrescriptions}));assert.equal(t.store.get(i.id)?.status,'open');assert.equal(t.requests.length,0)}finally{t.close()}})
test('a result and independent condition-bound acceptance complete work',async()=>{const t=regressionFixture();try{const i=await t.create(resultPack());await t.run(drive(i.id,{prescriptions:regressionPrescriptions}));assert.equal(t.store.get(i.id)?.status,'completed');assert.equal(t.store.get(i.id)?.completion?.kind,'automated');assert.equal(t.store.events(i.id).filter(e=>e.kind==='function-accepted').length,2)}finally{t.close()}})
test('resource admission preserves wait and admitted notes',async()=>{const t=regressionFixture();try{const i=await t.create(resultPack());let observed=0;await t.run(runQueue({prescriptions:{...regressionPrescriptions,parallel:'resources'},pollMs:1,resourceAdmission:()=>++observed===1?{allowed:false,reason:'memory'}:{allowed:true}},{roots:[i.id]}));assert.equal(t.store.get(i.id)?.status,'completed');assert.ok(t.store.events(i.id).some(e=>e.kind==='resource-wait'));assert.ok(t.store.events(i.id).some(e=>e.kind==='resource-admitted'))}finally{t.close()}})

test('Store: caught nested request failure rolls back its writes while a sibling refusal commits and replays after reopen', async () => {
	const t = regressionFixture()
	try {
		const anchor = await t.create()
		const before = structuredClone({ items: t.store.list(), events: t.store.allEvents() })
		const failedInput = { draft: 'FAILED-CALLBACK — 雪\r\n' }
		const refusalInput = { draft: 'Retained refusal — 鳥\r\n' }
		const receipt = { accepted: false, reason: 'test-owned refusal' }
		const failure = new Error('test-owned nested callback failure')
		t.store.atomic(() => {
			assert.throws(() => t.store.request('failed-callback', 'fixture', anchor.id, failedInput, () => {
				t.store.create({ title: 'FAILED-CALLBACK item', objective: 'Must roll back', source: failedInput.draft, status: 'open' })
				t.store.note(anchor.id, 'failed-callback-event', failedInput)
				throw failure
			}), error => error === failure)
			assert.deepEqual({ items: t.store.list(), events: t.store.allEvents() }, before, 'caught callback failure leaves no item or event inside the outer transaction')
			assert.deepEqual(t.store.request('committed-refusal', 'fixture-refusal', anchor.id, refusalInput, () => {
				t.store.note(anchor.id, 'explicit-refusal-retained', refusalInput)
				return receipt
			}), receipt)
		})
		t.reopen()
		assert.deepEqual(t.store.list(), before.items)
		const events = t.store.allEvents()
		assert.deepEqual(events.slice(0, before.events.length), before.events)
		assert.deepEqual(events.slice(before.events.length).map(({ item, kind, data }) => ({ item, kind, data })), [
			{ item: anchor.id, kind: 'explicit-refusal-retained', data: refusalInput },
		], 'only the explicit sibling refusal event survives commit and reopen')
		assert.deepEqual(t.store.request('committed-refusal', 'fixture-refusal', anchor.id, refusalInput, () => {
			assert.fail('committed request must recover its receipt without rerunning the callback')
		}), receipt)
		assert.deepEqual(t.store.allEvents(), events)
		assert.deepEqual(t.store.list(), before.items)
		assert.deepEqual(t.store.request('failed-callback', 'fixture', anchor.id, { draft: 'Corrected body after rollback' }, () => {
			t.store.note(anchor.id, 'corrected-callback', { corrected: true })
			return { accepted: true }
		}), { accepted: true }, 'rolled-back request ID remains reusable with a different body')
		assert.equal(t.store.events(anchor.id).filter(event => event.kind === 'corrected-callback').length, 1)
		assert.deepEqual(t.store.list(), before.items)
		assert.deepEqual(t.requests, [])
	} finally { t.close() }
})
