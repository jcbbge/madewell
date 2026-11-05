// Removed change-glob gates are replaced by declared destination acceptance.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { validateFiles } from '../src/ledger.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('file results reject traversal, symlinks and changed bytes',async()=>{const t=regressionFixture();try{const i=await t.create(),destination=join(t.root,'results');mkdirSync(destination);writeFileSync(join(destination,'result.txt'),'value');const item={...i,settings:{...i.settings,destinations:[{id:'out',path:destination}]}},file={destination:'out',path:'result.txt',sha256:createHash('sha256').update('value').digest('hex'),bytes:5};assert.deepEqual(validateFiles(item,[file],['out'],t.path),[file]);assert.throws(()=>validateFiles(item,[{...file,path:'../result.txt'}],['out'],t.path));symlinkSync('result.txt',join(destination,'link'));assert.throws(()=>validateFiles(item,[{...file,path:'link'}],['out'],t.path));writeFileSync(join(destination,'result.txt'),'other');assert.throws(()=>validateFiles(item,[file],['out'],t.path))}finally{t.close()}})
