import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerHistory } from '../src/nq-obligations.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('saved answers and explicit aliases resolve through the same durable answer history',async()=>{const t=regressionFixture();try{const i=await t.create();t.store.note(i.id,'nq-answer',{job:'produce',originator:'operator',questions:['Which format?'],answer:'Plain text.'});const history=answerHistory(t.store,i,'produce');assert.equal(history.answers[0]?.answer,'Plain text.');assert.equal(history.packetAnswers()[0]?.answer,'Plain text.')}finally{t.close()}})
