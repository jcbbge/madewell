import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contextOf } from '../src/api.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('browser actions expose only supported external lifecycle operations',async()=>{const t=regressionFixture();try{const i=await t.create(),c=contextOf(t.store,i.id),names=c.next.map(a=>a.href);assert.ok(names.includes(`/api/v1/items/${i.id}/progress`));assert.ok(names.includes(`/api/v1/items/${i.id}/complete`));assert.equal(c.answer.allowed,false);assert.equal(t.requests.length,0)}finally{t.close()}})
