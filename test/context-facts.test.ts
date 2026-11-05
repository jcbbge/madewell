import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contextFact } from '../src/engine.ts'
import { contextFactsFor } from '../src/context-facts.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('standing facts stay on explicit ancestry rather than installation location',async()=>{const t=regressionFixture();try{const owner=await t.create(),other=await t.create();await t.run(contextFact(owner.id,{requestId:'fixture-context-1',operation:'set',revision:0,key:'intent',text:'Keep exact source',jobs:['produce'],scope:'descendants',enteredBy:{kind:'operator',label:'Fixture'},source:{reference:'source'},nonsecret:true}));assert.equal(contextFactsFor(t.store,owner,'produce',Date.now()).length,1);assert.equal(contextFactsFor(t.store,other,'produce',Date.now()).length,0)}finally{t.close()}})
