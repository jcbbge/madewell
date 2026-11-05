import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { resolveJumpPacks, type JumpPack } from '../src/jump-packs.ts'
import { problemsOf } from '../src/lane.ts'
test('method composition emits explicit execution-2 replay and independent completion',()=>{const pack=JSON.parse(readFileSync(new URL('../examples/jump-pack-lab/packs/generic.json',import.meta.url),'utf8')) as JumpPack,resolved=resolveJumpPacks([pack]);assert.equal(resolved.pack.contracts?.execution,'2');assert.deepEqual(problemsOf(resolved.pack),[]);assert.equal(resolved.pack.completion?.resultJob,'implementation');assert.ok(resolved.pack.delivery.every(c=>c.steps.every(s=>s.replay==='safe'&&s.writes?.length===0)))})
