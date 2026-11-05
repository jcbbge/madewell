// Migration replaces repository delivery at this existing regression seam.
import assert from 'node:assert/strict'
import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect } from 'effect'
import { applyMigration, previewMigration, migrationStatus, MigrationControlNoop } from '../src/migration.ts'
import { regressionFixture } from './fixtures/prepared-output.ts'
test('supported migration removes only its exact registry and returns a durable receipt',async()=>{const t=regressionFixture();try{const registry=join(t.root,'projects.json');writeFileSync(registry,'[]');const preview=await t.run(previewMigration());const receipt=await t.run(applyMigration({token:preview.token,writersStopped:true,actor:{kind:'operator',label:'Fixture migration'}}).pipe(Effect.provide(MigrationControlNoop)));assert.equal(existsSync(registry),false);assert.deepEqual((await t.run(migrationStatus())).receipt,receipt);const replay=await t.run(applyMigration({token:preview.token,writersStopped:true,actor:{kind:'operator',label:'Fixture migration'}}).pipe(Effect.provide(MigrationControlNoop)));assert.deepEqual(replay,receipt)}finally{t.close()}})
