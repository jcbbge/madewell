import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextFor } from '../src/engine.ts'
import { modelOf, itemDetail } from '../src/ui.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('read models retain external work without a project picker',async()=>{const t=regressionFixture();try{const i=await t.create(),model=modelOf(t.store,nextFor),detail=itemDetail(t.store,nextFor,i.id);assert.equal(model.summary.open,1);assert.ok(detail);assert.equal(model.items.length,1);assert.equal('projects' in model,false)}finally{t.close()}})
