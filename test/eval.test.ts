import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluate } from '../src/eval.ts'
import { regressionFixture, regressionPrescriptions } from './fixtures/prepared-output.ts'
test('eval reports unavailable evidence rather than inventing an invocation',async()=>{const t=regressionFixture();try{await t.create();await assert.rejects(t.run(evaluate({job:'produce',prescriptions:regressionPrescriptions,prescriptionsPath:'fixture'})));assert.equal(t.requests.length,0)}finally{t.close()}})
