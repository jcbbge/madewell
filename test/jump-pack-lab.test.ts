import assert from 'node:assert/strict'
import { test } from 'node:test'
import { jumpPackLab } from '../src/jump-pack-lab.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('lab read projection never declares an external open task complete',async()=>{const t=regressionFixture();try{const i=await t.create();t.store.note(i.id,'lab-case',{kind:'deterministic',hypothesis:'Read saved work only'});const lab=jumpPackLab(t.store);assert.equal(lab.cases[0]?.done,false);assert.equal(lab.cases[0]?.tasks[0]?.status,'open');assert.equal(t.requests.length,0)}finally{t.close()}})
