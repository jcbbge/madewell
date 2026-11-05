import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drive } from '../src/engine.ts'
import { regressionFixture, regressionPrescriptions, resultPack } from './fixtures/prepared-output.ts'
test('each configured agent confirms its own handoff before execution',async()=>{const t=regressionFixture();try{const i=await t.create(resultPack());await t.run(drive(i.id,{prescriptions:regressionPrescriptions}));for(const job of ['produce','accept']){const mine=t.requests.filter(r=>r.job===job);assert.equal(mine[0]?.kind,'intake');assert.equal(mine.at(-1)?.kind,'execute')}const consumer=JSON.parse(t.requests.find(r=>r.job==='accept'&&r.kind==='execute')!.prompt);assert.equal(consumer.received.produce.result,'Prepared result')}finally{t.close()}})
