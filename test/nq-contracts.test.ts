import assert from 'node:assert/strict'
import { test } from 'node:test'
import { problemsOf } from '../src/lane.ts'
import { resultPack } from './fixtures/prepared-output.ts'
test('explicit nodes and writing ranges cannot rewind',()=>{const original=resultPack(),first=original.delivery[0]!.steps[0]!,second=original.delivery[0]!.steps[1]!;const pack={...original,delivery:[{cartridge:'work',steps:[{...first,replay:'explicit' as const},{...second,onFailure:{target:first.job,maxCorrections:1}}]}]};assert.ok(problemsOf(pack).some(p=>p.includes('explicit leaf')));const later={...original,delivery:[{cartridge:'work',steps:[{...first,onFailure:{target:second.job,maxCorrections:1}},second]}]};assert.ok(problemsOf(later).some(p=>p.includes('same-track')))})
