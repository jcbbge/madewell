import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { mutateWork } from '../src/ledger.ts'
import { revisionOf } from '../src/legacy.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('recorded acceptance covers every current condition and remains an assertion',async()=>{const t=regressionFixture();try{let i=await t.create();const actor={kind:'operator',label:'Fixture operator'} as const;const request=(extra:Record<string,unknown>)=>({requestId:randomUUID(),revision:revisionOf(i),actor,...extra});await assert.rejects(t.run(mutateWork('complete',i.id,request({result:'done',evidence:[]}))));i=await t.run(mutateWork('block',i.id,request({blocker:{id:'B1',reason:'Missing evidence',owner:'operator',nextAction:'Supply evidence'}})));await assert.rejects(t.run(mutateWork('complete',i.id,request({result:'done',evidence:[{conditionId:'A1',detail:'Observed',refs:[]}]}))));i=await t.run(mutateWork('unblock',i.id,request({blockerId:'B1',resolution:'Material supplied'})));i=await t.run(mutateWork('complete',i.id,request({result:{done:true},evidence:[{conditionId:'A1',detail:'Operator assertion',refs:[]}]})));assert.equal(i.completion?.kind,'recorded');assert.deepEqual(i.completion?.result,{done:true})}finally{t.close()}})
