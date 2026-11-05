import assert from 'node:assert/strict'
import { test } from 'node:test'
import { grammarOf } from '../src/grammar.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('external records have no invented discovery phases',async()=>{const t=regressionFixture();try{const item=await t.create();const view=grammarOf(t.store,item.id);assert.ok(view===undefined||view.discovery.completedStepCount===0);assert.equal(t.store.get(item.id)?.execution.mode,'external')}finally{t.close()}})
