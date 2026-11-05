import assert from 'node:assert/strict'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect } from 'effect'
import { scratch, fingerprint, executionEnv } from '../src/workspace.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('scratch is removed after success and interruption while external material survives',async()=>{const t=regressionFixture();let cwd='';try{await Effect.runPromise(Effect.scoped(Effect.gen(function*(){cwd=yield* scratch(t.path,1,'work','fixture');writeFileSync(join(cwd,'temporary'),'x');assert.ok(existsSync(cwd))})));assert.equal(existsSync(cwd),false);await Effect.runPromise(Effect.scoped(Effect.gen(function*(){cwd=yield* scratch(t.path,1,'work','interrupted');return yield* Effect.interrupt}))).catch(()=>{});assert.equal(existsSync(cwd),false)}finally{t.close()}})
test('fingerprints cover content and execution identity names scratch',()=>{const t=regressionFixture();try{const p=join(t.root,'input');writeFileSync(p,'one');const before=fingerprint([p]);writeFileSync(p,'two');assert.notEqual(fingerprint([p]),before);const env=executionEnv(1,'work','call',t.root);assert.equal(env.MW_SCRATCH,t.root);assert.equal(env.MW_ITEM,'1')}finally{t.close()}})
