import assert from 'node:assert/strict'
import { test } from 'node:test'
import { stats } from '../src/telemetry.ts'
test('telemetry retains location-free work keyed by store and item',()=>{const lines=[{host:'fixture',store:'/ledger/a.db',t:'event',item:1,at:'2026-01-01T00:00:00Z',kind:'created',data:{status:'open'}},{host:'fixture',store:'/ledger/a.db',t:'event',item:1,at:'2026-01-01T00:01:00Z',kind:'completed',data:{}}].map(x=>JSON.stringify(x)),result=stats(lines);assert.equal(result.stores.length,1);assert.equal(result.stores[0]?.items.completed,1);assert.equal(result.stores[0]?.store,'/ledger/a.db')})
