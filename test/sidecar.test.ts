import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { render } from '../src/sidecar.ts'

test('sidecar puts durable holds and their real next command before running and queued work', () => {
 const board = {
  summary: '1 need you, 0 candidates, 1 in progress, 1 queued, 0 shipped',
  next: [],
  items: [
   { id: 1, title: 'Build it', status: 'running', stage: 'implementation', job: 'implement', profile: 'implementer', next: [{ run: 'mw status 1', why: 'check' }] },
   { id: 2, title: 'Needs decision', status: 'held', stage: 'verification', job: 'arbitrate', profile: 'arbiter', hold: { message: 'Which cause?' }, next: [{ run: 'mw answer 2 --cause test correction', why: 'release' }] },
   { id: 3, title: 'Next item', status: 'queued', stage: 'ideation', job: 'ideate', profile: 'ideator', next: [{ run: 'mw run', why: 'deliver' }] },
  ],
 }
 const frame = render(board, 80)
 assert.ok(frame.indexOf('NEEDS YOU') < frame.indexOf('NOW'))
 assert.ok(frame.indexOf('NOW') < frame.indexOf('TO-DO'))
 assert.match(frame, /mw answer 2 --cause test correction/)
 assert.match(frame, /mw run/)
 assert.match(frame, /TMUX KEYS  Ctrl-b, then/)
 const narrow = render(board, 26, 24).split('\n')
 assert.equal(narrow.length, 24)
 assert.ok(narrow.every(line => line.length <= 26))
 assert.equal(narrow.at(-1), 'x   close pane')
})

test('sidecar --once reads an empty Made Well home without creating it', () => {
 const home = mkdtempSync(join(tmpdir(), 'mw-sidecar-'))
 try {
  const missing = join(home, 'missing')
  const r = spawnSync(process.execPath, [join(import.meta.dirname, '../dist/mw-sidecar.mjs'), '--once', '--width', '60'], { encoding: 'utf8', env: { ...process.env, MW_HOME: missing } })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /MADE WELL/)
  assert.match(r.stdout, /0 need you/)
  assert.equal(existsSync(missing), false)
  const scoped = spawnSync(process.execPath, [join(import.meta.dirname, '../dist/mw-sidecar.mjs'), '--once', '--workspace', home], { encoding: 'utf8', env: { ...process.env, MW_HOME: missing } })
  assert.equal(scoped.status, 0, scoped.stderr)
  assert.match(scoped.stdout, /0 need you/)
  assert.equal(existsSync(missing), false)
 } finally { rmSync(home, { recursive: true, force: true }) }
})
