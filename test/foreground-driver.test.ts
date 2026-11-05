import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runQueue } from '../src/engine.ts'
import { regressionFixture, regressionPrescriptions, resultPack } from './fixtures/prepared-output.ts'
test('foreground selection does not drive unrelated historical examples',async()=>{const t=regressionFixture();try{const chosen=await t.create(resultPack()),other=await t.create(resultPack());await t.run(runQueue({prescriptions:regressionPrescriptions},{roots:[chosen.id]}));assert.equal(t.store.get(chosen.id)?.status,'completed');assert.equal(t.store.get(other.id)?.status,'queued');assert.equal(t.store.events(other.id).some(e=>e.kind==='function-started'),false)}finally{t.close()}})
