import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drive, nextFor } from '../src/engine.ts'
import { contextOf } from '../src/api.ts'
import { lensOf } from '../src/trace.ts'
import { regressionFixture, regressionPrescriptions, resultPack } from './fixtures/prepared-output.ts'
test('context and trace retain project-free owner, action and accepted result',async()=>{const t=regressionFixture();try{const item=await t.create(resultPack());await t.run(drive(item.id,{prescriptions:regressionPrescriptions}));const current=t.store.get(item.id)!,context=contextOf(t.store,item.id),trace=lensOf(t.store,item.id,'ux',nextFor(current));assert.equal(context.position.status,'completed');assert.equal(context.work.completion?.kind,'automated');assert.equal(trace.item,item.id);assert.ok(JSON.stringify(trace).includes('Prepared result'));assert.equal(context.item.source,item.source)}finally{t.close()}})
