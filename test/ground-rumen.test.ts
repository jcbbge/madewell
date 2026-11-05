import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drive } from '../src/engine.ts'
import { organSummary } from '../src/organs.ts'
import { regressionFixture, regressionPrescriptions, resultPack } from './fixtures/prepared-output.ts'
test('every accepted phase retains Ground, Rumen and successor preparation',async()=>{const t=regressionFixture();try{const i=await t.create(resultPack());await t.run(drive(i.id,{prescriptions:regressionPrescriptions}));const summary=organSummary(t.store,t.store.get(i.id)!);assert.equal(summary.total,2);assert.ok(summary.phases.every(p=>p.ground&&p.rumen&&p.nextPrepared));assert.ok(t.requests.filter(r=>r.kind==='execute').every(r=>JSON.parse(r.prompt).organs.required))}finally{t.close()}})
