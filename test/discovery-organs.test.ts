import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GENERAL_DISCOVERY, AUTONOMY_PACK } from '../src/autonomy-pack.ts'
import { laneOf, problemsOf } from '../src/lane.ts'
import { resolvePackSelection } from '../src/pack-selection.ts'
import { Effect } from 'effect'
test('general discovery keeps seven obligations and builtin grammar pins neutral delivery',async()=>{assert.equal(laneOf(GENERAL_DISCOVERY).discovery.length,7);assert.equal(GENERAL_DISCOVERY.delivery.length,0);assert.deepEqual(problemsOf(GENERAL_DISCOVERY),[]);assert.equal((await Effect.runPromise(resolvePackSelection('builtin:grammar'))).pack?.version,'2');assert.equal(AUTONOMY_PACK.completion?.acceptanceJob,'verification');assert.equal(laneOf().delivery.length,0)})
