import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { API_SCHEMAS, contextOf, createApi } from '../src/api.ts'
import { answer, drive, go } from '../src/engine.ts'
import { quote } from '../src/errors.ts'
import { exportItem } from '../src/export.ts'
import { GRAMMAR_PACK } from '../src/grammar.ts'
import { conforms, lastJson, problemsOf, type Job, type Pack } from '../src/lane.ts'
import { openStore, Store, type Autonomy, type Item } from '../src/store.ts'
import { workEvidenceOf } from '../src/work-evidence.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'
import type { Card, Prescriptions } from '../src/cards.ts'

const card: Card = { harness: 'codex', provider: 'fixture', account: 'fixture', model: 'scripted', effort: 'low' }
const jobs: Job[] = ['discover', 'ideate', 'challenge', 'plan', 'implement', 'test-plan', 'arbitrate']
const prescriptions: Prescriptions = { tiers: { deep: [card], coding: [card], intake: [card] }, jobs: { ...Object.fromEntries(jobs.map(job => [job, { tier: job === 'implement' ? 'coding' : 'deep', access: job === 'implement' ? 'make' : job === 'test-plan' ? 'checks' : job === 'arbitrate' ? 'run' : 'read', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } } } as Prescriptions['jobs'], parallel: 2 }
const config = { prescriptions }
const evidenceDir = process.env.MW_ORGANS_EVIDENCE_DIR
const command = (code: string) => `${quote(process.execPath)} -e ${quote(code)}`
const jsonCommand = (value: unknown) => command(`console.log(${JSON.stringify(JSON.stringify(value))})`)
const clear = { understanding: 'I will complete my fixed phase and prepare its configured successor on this same task.', unclear: [], ambiguous: [], missing: [], notes: [] }
const expectedNext: Record<string, string[]> = { ideate: ['challenge'], challenge: ['plan'], plan: ['implement', 'test-plan'], implement: ['verify'], 'test-plan': ['verify'], arbitrate: [] }
const intent = 'Deliver the requested CSV export through the same durable task.'
const source = '  Export the report as CSV, using the existing shell application.\r\nPreserve this exact source.  '
const object = { type: 'object' }
type Json = Record<string, unknown>
type Rule = { id: string; kind: string; definitionHash: string; text: string }
type Preparation = { ground: { intent: string; sources: { ref: string; finding: string }[] }; rumen: { rule: string; disposition: string; evidence: string }[]; next: { job: string; brief: string; requires: string[] }[] }
type Packet = { organs: { version: string; rules: Rule[]; nextJobs: string[]; incoming: { from: string; job: string; brief: string; requires: { ref: string; sha256: string }[] }[] }; received?: Record<string, unknown> }
const packetOf = (req: WorkerRequest) => JSON.parse(req.prompt) as Packet
const write = (req: WorkerRequest, path: string, text: string) => { mkdirSync(dirname(join(req.cwd, path)), { recursive: true }); writeFileSync(join(req.cwd, path), text) }
function prepare(req: WorkerRequest): Preparation {
  const packet = packetOf(req)
  assert.equal(packet.organs?.version, '1', 'every pinned execution receives the mandatory console-owned organ contract')
  if (req.job !== 'arbitrate') assert.deepEqual([...packet.organs.nextJobs].sort(), [...(expectedNext[req.job] ?? [])].sort(), 'software successor obligations follow the actual fixed lane')
  return {
    ground: { intent, sources: [{ ref: 'source', finding: 'The raw request requires CSV and the same task through all delivery functions.' }, { ref: 'file:src/app.sh', finding: 'The existing application uses POSIX shell; extend its established format.' }] },
    rumen: packet.organs.rules.map(rule => ({ rule: rule.id, disposition: 'addressed', evidence: rule.kind === 'fence' ? 'Carry this mechanical fence to the engine-owned candidate verification; no worker pass is claimed.' : `Account for ${rule.text} within this fixed phase.` })),
    next: (expectedNext[req.job] ?? []).map(job => ({ job, brief: `${req.job} prepared ${job}: preserve CSV output and use the accepted result.`, requires: [`output:${req.job}`] })),
  }
}
function standard(req: WorkerRequest): Json {
  if (req.kind === 'intake') return clear
  if (req.kind === 'originator') return { answer: 'Use the current fixed assignment and supplied references. The producer must repair its missing preparation; do not bypass it.', needsOperator: false }
  if (req.kind === 'repair') return JSON.parse((JSON.parse(req.prompt) as { yourAnswer: string }).yourAnswer) as Json
  let result: Json
  if (req.job === 'ideate') result = { outcome: 'Make the requested CSV export available.', approach: 'Extend the existing shell application.', decisions: [] }
  else if (req.job === 'challenge') result = { findings: [], decisions: [] }
  else if (req.job === 'plan') result = { making: 'The CSV export', notMaking: ['Other formats'], scope: ['src/export.sh'], follows: [{ path: 'src/export.sh', follows: 'src/app.sh' }], steps: ['Create src/export.sh printing exactly a,b followed by a newline.'], doneWhen: [{ id: 'D-csv', text: 'The report prints a,b.' }], decisions: [] }
  else if (req.job === 'implement') { write(req, 'src/export.sh', 'echo a,b\n'); result = { summary: 'Implemented the fixed CSV plan.' } }
  else if (req.job === 'test-plan') { write(req, 'checks/export.sh', 'actual=$(sh src/export.sh)\n[ "$actual" = "a,b" ] || { echo "wrong CSV: $actual"; exit 1; }\n'); result = { checks: [{ id: 'C-csv', doneWhen: 'D-csv', run: 'sh checks/export.sh' }] } }
  else result = { cause: 'undetermined', answer: 'The deliberate fixture block needs a decision.', evidence: 'This is a bounded blocked-output control.' }
  return { ...result, preparation: prepare(req) }
}
type Script = (req: WorkerRequest, answer: Json, attempt: number) => Json | undefined | Promise<Json | undefined>
function fixture(script: Script = () => undefined, options: { autonomy?: Autonomy; externalSymlink?: boolean; durableSymlink?: boolean; generatedSymlink?: boolean; symlinkChain?: 'tracked' | 'ignored'; legacy?: boolean; project?: Json } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-organs-'))), repo = join(root, 'product'), home = join(root, 'home')
  mkdirSync(join(repo, 'src'), { recursive: true }); mkdirSync(home)
  const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
  git('init', '-q', '-b', 'main'); git('config', 'user.name', 'Independent organ acceptance'); git('config', 'user.email', 'organs@localhost')
  writeFileSync(join(repo, 'src/app.sh'), 'echo app\n'); writeFileSync(join(repo, '.gitignore'), '.fixtures/\n')
  if (options.externalSymlink) { writeFileSync(join(root, 'outside.txt'), 'outside material\n'); symlinkSync(join(root, 'outside.txt'), join(repo, 'src/external')) }
  if (options.durableSymlink) symlinkSync('app.sh', join(repo, 'src/alias.sh'))
  if (options.generatedSymlink) { mkdirSync(join(repo, '.fixtures'), { recursive: true }); writeFileSync(join(repo, '.fixtures/generated.sh'), 'echo generated\n'); symlinkSync('../.fixtures/generated.sh', join(repo, 'src/generated.sh')) }
  if (options.symlinkChain === 'tracked') { symlinkSync('intermediate.sh', join(repo, 'src/chain.sh')); symlinkSync('app.sh', join(repo, 'src/intermediate.sh')) }
  if (options.symlinkChain === 'ignored') { mkdirSync(join(repo, '.fixtures'), { recursive: true }); symlinkSync('../src/app.sh', join(repo, '.fixtures/intermediate.sh')); symlinkSync('../.fixtures/intermediate.sh', join(repo, 'src/chain.sh')) }
  git('add', 'src', '.gitignore'); git('commit', '-qm', 'Seed the real Ground and Rumen acceptance product')
  const inherited = { ...process.env }
  for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]
  process.env.MW_HOME = home; process.env.MW_STORE = join(home, 'work.db'); process.env.MW_AUTORUN = '0'
  const path = process.env.MW_STORE
  let store = openStore(path)
  const pack: Pack = { ...GRAMMAR_PACK, name: 'mandatory-organs-acceptance', contracts: { handoff: '1' } }
  const bare = store.create({ title: 'CSV export', objective: intent, source, workspace: repo, pack, autonomy: options.autonomy ?? 'full' })
  const item = options.legacy ? bare : store.save({ ...bare, organs: { version: '1' } } as Item, 'fixture-organs-pinned', {})
  const project = (extra: Json = {}) => writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: repo, ship: `printf '%s\\n' "$MW_ITEM" >> ${quote(join(root, 'shipped.log'))}`, ...extra }]))
  project(options.project)
  const calls: WorkerRequest[] = []
  const worker = Layer.succeed(Worker, { run: req => Effect.promise(async (): Promise<WorkerResult> => {
    calls.push(req)
    const attempt = calls.filter(call => call.item === req.item && call.kind === req.kind && call.job === req.job).length
    const answer = standard(req)
    const selected = await script(req, answer, attempt)
    return { ok: true, output: JSON.stringify(selected ?? answer) }
  }) })
  const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
  const of = (kind: string, job: string) => calls.filter(call => call.kind === kind && call.job === job)
  return { root, repo, home, path, item, calls, git, project, of, run, get store() { return store }, restart() { store.close(); store = openStore(path) }, clean() { store.close(); for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]; for (const [key, value] of Object.entries(inherited)) if (/^MW_/i.test(key)) process.env[key] = value; rmSync(root, { recursive: true, force: true }) } }
}
async function finish(t: ReturnType<typeof fixture>) {
  let item = await t.run(drive(t.item.id, config))
  for (let count = 0; count < 8 && item.status === 'paused'; count++) { await t.run(go(item.id)); item = await t.run(drive(item.id, config)) }
  return item
}
const producer = (req: WorkerRequest, job: string) => ['execute', 'repair'].includes(req.kind) && req.job === job
const preparationOf = (answer: Json) => answer.preparation as Preparation
const rejections = (t: ReturnType<typeof fixture>, job: string) => t.store.calls(t.item.id).filter(call => call.job === job && call.outcome === 'rejected').map(call => call.error ?? '').join('\n')
function assertStoppedBefore(t: ReturnType<typeof fixture>, job: string, successor: string, reason: RegExp) {
  assert.equal(t.store.get(t.item.id)!.status, 'held')
  assert.equal(t.of('execute', successor).length, 0, 'a missing producer obligation must not be shifted to a downstream worker')
  assert.match(rejections(t, job) + JSON.stringify(t.store.get(t.item.id)!.hold), reason)
  assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'organs-accepted' && event.data.job === job).length, 0)
}

test('Ground and Rumen: the same task carries accepted preparation through all four delivery functions and SQLite reopen', { timeout: 60_000 }, async () => {
  const t = fixture(() => undefined, { autonomy: 'steps' })
  try {
    let item = await t.run(drive(t.item.id, config))
    assert.equal(item.status, 'paused'); assert.equal(item.job, 'plan')
    const before = t.store.events(item.id).filter(event => event.kind === 'organs-accepted')
    assert.deepEqual(before.map(event => event.data.job), ['ideate', 'challenge'])
    t.restart()
    await t.run(go(item.id)); item = await finish(t)
    assert.equal(item.status, 'shipped'); assert.equal(item.id, t.item.id); assert.equal(item.source, source)
    assert.equal(t.store.list().length, 1, 'phase changes never mint replacement work identities')
    assert.equal(readFileSync(join(t.repo, 'src/export.sh'), 'utf8'), 'echo a,b\n')
    const events = t.store.events(item.id), organs = events.filter(event => event.kind === 'organs-accepted')
    for (const job of ['ideate', 'challenge', 'plan', 'implement', 'test-plan', 'verify']) {
      const receipt = organs.find(event => event.data.job === job)
      assert.ok(receipt, `${job} has an accepted work-owned organ receipt`)
      const data = receipt.data.receipt as { version: string; job: string; outputHash: string; ground: { sources: { ref: string; sha256: string }[] }; rumen: unknown[]; next: unknown[] }
      assert.equal(data.version, '1'); assert.equal(data.job, job)
      assert.match(data.outputHash, /^[a-f0-9]{64}$/)
      assert.ok(data.ground.sources.every(entry => /^[a-f0-9]{64}$/.test(entry.sha256)))
      assert.deepEqual(data.rumen, [], 'no declared rules means an explicit empty inventory, not absent Rumen')
    }
    assert.ok(events.some(event => event.kind === 'ground-checked' && event.data.ok === true && Array.isArray(event.data.checked) && event.data.checked.length === 0), 'entry grounding explicitly records an empty incoming requirement set')
    assert.ok(events.some(event => event.kind === 'inputs-checked' && Array.isArray(event.data.inputs) && event.data.inputs.length === 0), 'resource readiness explicitly records no required resources')
    for (const job of ['implement', 'test-plan']) {
      const packet = packetOf(t.of('execute', job)[0]!)
      assert.deepEqual(Object.keys(packet.received ?? {}), ['plan'])
      assert.ok(packet.organs.incoming.some(entry => entry.from === 'plan' && entry.job === job && entry.brief.includes(`prepared ${job}`)))
      assert.ok(packet.organs.incoming.every(entry => entry.from !== (job === 'implement' ? 'test-plan' : 'implement')), 'the opposing maker never contributes private organ evidence to this receiver')
    }
    assert.equal(workEvidenceOf(t.store, item).delivered, true)
    const context = contextOf(t.store, item.id)
    assert.equal(context.organs.required, true); assert.equal(context.organs.legacy, false)
    assert.ok(context.organs.phases.some(phase => phase.job === 'verify' && phase.ground && phase.rumen && phase.nextPrepared))
    assert.ok(context.organs.phases.every(phase => phase.currentAvailability === 'unknown'), 'saved acceptance is not a claim that resources are still available now')
    assert.deepEqual(conforms(API_SCHEMAS.Context, context), [])
    if (evidenceDir) {
      const out = join(resolve(evidenceDir), 'same-task-reopen')
      await t.run(exportItem(t.store, item.id, out))
      writeFileSync(join(out, 'acceptance.json'), JSON.stringify({ kind: 'Independent scripted-worker engine acceptance; real Git, SQLite and candidate check', item: item.id, status: item.status, organs: organs.map(event => ({ event: event.seq, ...event.data })), limitation: 'This proves machinery and handoff propagation, not live-model semantic judgment.' }, null, 2))
    }
  } finally { t.clean() }
})

test('Ground and Rumen: missing producer preparation is rejected before a successor can execute', { timeout: 30_000 }, async () => {
  const t = fixture((req, answer) => { if (producer(req, 'ideate')) { const { preparation: _omitted, ...rest } = answer; return rest } })
  try { await finish(t); assertStoppedBefore(t, 'ideate', 'challenge', /preparation/i) } finally { t.clean() }
})

for (const ref of ['file:does-not-exist.txt', 'file:../outside.txt', 'file:src/external']) test(`Ground and Rumen: unresolvable or escaping evidence ${ref} cannot become an accepted handoff`, { timeout: 30_000 }, async () => {
  const t = fixture((req, answer) => {
    if (producer(req, 'ideate')) { const prep = preparationOf(answer); prep.ground.sources.push({ ref, finding: 'Deliberately invalid evidence control.' }); return answer }
  }, { externalSymlink: true })
  try { await finish(t); assertStoppedBefore(t, 'ideate', 'challenge', /ground|reference|worktree|source|material|unavailable/i) } finally { t.clean() }
})

test('Ground and Rumen: a read-phase file that disappears with its checkout cannot prepare the next phase', { timeout: 30_000 }, async () => {
  const t = fixture((req, result) => {
    if (producer(req, 'ideate')) { write(req, 'notes/only-in-this-checkout.txt', 'Undelivered ephemeral material.\n'); preparationOf(result).next[0]!.requires.push('file:notes/only-in-this-checkout.txt'); return result }
  })
  try { await finish(t); assertStoppedBefore(t, 'ideate', 'challenge', /durable|disposable|tracked|ephemeral|prepared|survive/i) } finally { t.clean() }
})

test('Ground and Rumen: an unretained read-phase modification of a tracked file cannot prepare the next phase', { timeout: 30_000 }, async () => {
  const t = fixture((req, result) => {
    if (producer(req, 'ideate')) { write(req, 'src/app.sh', 'echo modified-only-in-read-checkout\n'); preparationOf(result).next[0]!.requires.push('file:src/app.sh'); return result }
  })
  try {
    await finish(t); assertStoppedBefore(t, 'ideate', 'challenge', /durable|disposable|tracked|modified|prepared|survive/i)
    assert.equal(readFileSync(join(t.repo, 'src/app.sh'), 'utf8'), 'echo app\n')
  } finally { t.clean() }
})

for (const path of ['notes/newly-committed.txt', 'src/app.sh']) test(`Ground and Rumen: a read worker local commit of ${path} cannot publish its required next input`, { timeout: 30_000 }, async () => {
  const t = fixture((req, result) => {
    if (req.kind === 'execute' && req.job === 'ideate') {
      write(req, path, 'This exists only on the unpublished worker commit.\n')
      execFileSync('git', ['-C', req.cwd, 'add', path]); execFileSync('git', ['-C', req.cwd, 'commit', '-qm', 'Deliberate unpublished read-phase commit control'])
      preparationOf(result).next[0]!.requires.push(`file:${path}`)
      return result
    }
  })
  try {
    const main = t.git('rev-parse', 'main')
    await finish(t); assertStoppedBefore(t, 'ideate', 'challenge', /immutable|unpublished|commit|durable|HEAD|tracked|prepared/i)
    assert.equal(t.git('rev-parse', 'main'), main)
  } finally { t.clean() }
})

test('Ground and Rumen: a tracked symlink cannot pass an ignored disposable target as durable next-step material', { timeout: 30_000 }, async () => {
  const t = fixture((req, result) => {
    if (producer(req, 'ideate')) { preparationOf(result).next[0]!.requires.push('file:src/generated.sh'); return result }
  }, { generatedSymlink: true })
  try {
    const prepare = join(t.root, 'prepare-generated-symlink.mjs')
    writeFileSync(prepare, "import {mkdirSync,writeFileSync} from 'node:fs';mkdirSync('.fixtures',{recursive:true});writeFileSync('.fixtures/generated.sh','echo generated\\n');\n")
    t.project({ prepare: `${quote(process.execPath)} ${quote(prepare)}` })
    await finish(t); assertStoppedBefore(t, 'ideate', 'challenge', /durable|tracked|target|ignored|prepared/i)
  } finally { t.clean() }
})

test('Ground and Rumen: a tracked symlink to a tracked durable target survives the prepared handoff', { timeout: 60_000 }, async () => {
  const t = fixture((req, result) => {
    if (producer(req, 'ideate')) {
      preparationOf(result).ground.sources.push({ ref: 'file:src/alias.sh', finding: 'This tracked alias resolves to the existing tracked application.' })
      preparationOf(result).next[0]!.requires.push('file:src/alias.sh')
      return result
    }
  }, { durableSymlink: true })
  try {
    assert.equal((await finish(t)).status, 'shipped')
    const accepted = t.store.events(t.item.id).find(event => event.kind === 'organs-accepted' && event.data.job === 'ideate')!
    const receipt = accepted.data.receipt as { next: { requires: { ref: string; path?: string }[] }[] }
    assert.equal(receipt.next[0]!.requires.find(source => source.ref === 'file:src/alias.sh')!.path, 'src/app.sh')
  } finally { t.clean() }
})

test('Ground and Rumen: a tracked alias cannot hide an ignored intermediate symlink before a tracked target', { timeout: 30_000 }, async () => {
  const t = fixture((req, result) => {
    if (producer(req, 'ideate')) { preparationOf(result).next[0]!.requires.push('file:src/chain.sh'); return result }
  }, { symlinkChain: 'ignored' })
  try {
    const prepare = join(t.root, 'prepare-intermediate-link.mjs')
    writeFileSync(prepare, "import {mkdirSync,symlinkSync,existsSync} from 'node:fs';mkdirSync('.fixtures',{recursive:true});if(!existsSync('.fixtures/intermediate.sh'))symlinkSync('../src/app.sh','.fixtures/intermediate.sh');\n")
    t.project({ prepare: `${quote(process.execPath)} ${quote(prepare)}` })
    await finish(t); assertStoppedBefore(t, 'ideate', 'challenge', /durable|tracked|target|ignored|prepared|intermediate/i)
  } finally { t.clean() }
})

test('Ground and Rumen: an entirely tracked symlink chain remains usable with its full retained path identity', { timeout: 60_000 }, async () => {
  const t = fixture((req, result) => {
    if (producer(req, 'ideate')) {
      preparationOf(result).ground.sources.push({ ref: 'file:src/chain.sh', finding: 'Each alias and the final application are retained tracked material.' })
      preparationOf(result).next[0]!.requires.push('file:src/chain.sh')
      return result
    }
  }, { symlinkChain: 'tracked' })
  try {
    assert.equal((await finish(t)).status, 'shipped')
    const accepted = t.store.events(t.item.id).find(event => event.kind === 'organs-accepted' && event.data.job === 'ideate')!
    const receipt = accepted.data.receipt as { next: { requires: { ref: string; path?: string; paths?: string[] }[] }[] }
    const source = receipt.next[0]!.requires.find(source => source.ref === 'file:src/chain.sh')!
    assert.equal(source.path, 'src/app.sh')
    assert.deepEqual(source.paths, ['src/chain.sh', 'src/intermediate.sh', 'src/app.sh'])
  } finally { t.clean() }
})

test('Ground and Rumen: newly extracted implementation and check files remain valid required inputs for verification', { timeout: 60_000 }, async () => {
  const t = fixture((req, result) => {
    if (producer(req, 'implement')) { preparationOf(result).next[0]!.requires.push('file:src/export.sh'); return result }
    if (producer(req, 'test-plan')) { preparationOf(result).next[0]!.requires.push('file:checks/export.sh'); return result }
  })
  try {
    const done = await finish(t)
    assert.equal(done.status, 'shipped'); assert.equal(done.verification?.passed, true)
    const checks = t.store.events(done.id).filter(event => event.kind === 'ground-checked' && event.data.job === 'verify')
    for (const ref of ['file:src/export.sh', 'file:checks/export.sh']) assert.ok(checks.some(event => event.data.ok === true && JSON.stringify(event.data).includes(ref)), `${ref} survives extraction and is actually rechecked in the verifier's checkout`)
  } finally { t.clean() }
})

test('Ground and Rumen: a software plan cannot claim grounding using only the raw source when tracked code exists', { timeout: 30_000 }, async () => {
  const t = fixture((req, answer) => { if (producer(req, 'plan')) { preparationOf(answer).ground.sources = [{ ref: 'source', finding: 'The request exists, but no implementation was examined.' }]; return answer } })
  try { await finish(t); assertStoppedBefore(t, 'plan', 'implement', /file|repository|tracked|ground/i); assert.equal(t.of('execute', 'test-plan').length, 0) } finally { t.clean() }
})

test('Ground and Rumen: planning must prepare both independent makers', { timeout: 30_000 }, async () => {
  const t = fixture((req, answer) => { if (producer(req, 'plan')) { preparationOf(answer).next = preparationOf(answer).next.filter(entry => entry.job !== 'test-plan'); return answer } })
  try { await finish(t); assertStoppedBefore(t, 'plan', 'implement', /test-plan|successor|next/i); assert.equal(t.of('execute', 'test-plan').length, 0) } finally { t.clean() }
})

test('Ground and Rumen: a producer cannot pass a private or unreceived output directly to its consumer', { timeout: 30_000 }, async () => {
  const t = fixture((req, result) => {
    if (producer(req, 'plan')) { preparationOf(result).next.find(entry => entry.job === 'implement')!.requires.push('output:challenge'); return result }
  })
  try {
    await finish(t); assertStoppedBefore(t, 'plan', 'implement', /challenge|consumer|permitted|receive/i)
    assert.equal(t.of('execute', 'test-plan').length, 0)
  } finally { t.clean() }
})

test('Ground and Rumen: the same declared directory input stays usable across disposable producer and receiver worktrees', { timeout: 60_000 }, async () => {
  const t = fixture((req, result) => {
    if (producer(req, 'ideate')) { preparationOf(result).next[0]!.requires.push('input:shared-directory'); return result }
  })
  try {
    const prepare = join(t.root, 'prepare-directory.mjs')
    writeFileSync(prepare, "import {mkdirSync} from 'node:fs';mkdirSync('.fixtures/shared',{recursive:true});\n")
    t.project({ prepare: `${quote(process.execPath)} ${quote(prepare)}`, inputs: [{ id: 'shared-directory', path: '.fixtures/shared', kind: 'directory', jobs: ['ideate', 'challenge'] }] })
    const done = await finish(t); assert.equal(done.status, 'shipped')
    const observations = t.store.events(done.id).filter(event => event.kind === 'inputs-checked' && ['ideate', 'challenge'].includes(String(event.data.job)))
    const paths = observations.flatMap(event => (event.data.inputs as { id: string; path: string; ok: boolean }[]).filter(input => input.id === 'shared-directory').map(input => { assert.equal(input.ok, true); return input.path }))
    assert.ok(new Set(paths).size > 1, 'the input was actually provisioned beneath distinct disposable roots')
    const receiver = t.store.events(done.id).find(event => event.kind === 'ground-checked' && event.data.job === 'challenge' && Array.isArray(event.data.checked) && event.data.checked.some((value: { ref?: string }) => value.ref === 'input:shared-directory'))
    assert.ok(receiver); assert.equal(receiver.data.ok, true)
  } finally { t.clean() }
})

test('Ground and Rumen: unavailable declared resources stop execution and remain failure evidence', { timeout: 30_000 }, async () => {
  const t = fixture(() => undefined, { project: { inputs: [{ id: 'missing-fixture', path: '.fixtures/missing.csv', kind: 'file', jobs: ['plan'] }] } })
  try {
    const stopped = await finish(t)
    assert.equal(stopped.status, 'held'); assert.equal(t.of('execute', 'plan').length, 0)
    const observations = t.store.events(t.item.id).filter(event => event.kind === 'inputs-checked' && event.data.job === 'plan')
    assert.ok(observations.length > 0); assert.ok(observations.every(event => (event.data.inputs as { ok: boolean }[]).some(input => input.ok === false)))
    assert.match(JSON.stringify(observations) + JSON.stringify(stopped.hold), /missing-fixture.*ENOENT|ENOENT.*missing-fixture/s)
    assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'organs-accepted' && event.data.job === 'plan').length, 0)
  } finally { t.clean() }
})

test('Ground and Rumen: every selected rule is accounted for exactly once and a taste rule remains guidance', { timeout: 60_000 }, async () => {
  const t = fixture((req, answer) => {
    if (req.kind === 'execute') {
      const rules = packetOf(req).organs.rules
      assert.ok(rules.some(rule => rule.kind === 'sign' && rule.text.includes('homey')))
      assert.ok(rules.some(rule => rule.kind === 'lexicon' && rule.text.includes('report')))
    }
    return answer
  }, { project: { rumen: [{ id: 'homey-tone', kind: 'sign', text: 'Prefer a homey voice when the task includes user-facing copy.' }, { id: 'report-word', kind: 'lexicon', text: 'Call the exported artifact a report.' }] } })
  try { assert.equal((await finish(t)).status, 'shipped') } finally { t.clean() }
})

for (const mapped of [false, true]) test(`Ground and Rumen: typed judgment guidance ${mapped ? 'maps to a real acceptance condition' : 'cannot bypass the plan acceptance mapping'}`, { timeout: 60_000 }, async () => {
  const convention = 'The report must use a comma delimiter.'
  const t = fixture((req, result) => {
    if (producer(req, 'plan') && mapped) return { ...result, conventions: [{ convention, doneWhen: 'D-csv' }] }
  }, { project: { rumen: [{ id: 'csv-delimiter', kind: 'judge', text: convention, jobs: ['plan'] }] } })
  try {
    const result = await finish(t)
    if (mapped) { assert.equal(result.status, 'shipped'); assert.ok(result.conventions?.includes(convention)); assert.ok(result.verification?.results.some(check => check.doneWhen === 'D-csv' && check.exitCode === 0)) }
    else { assertStoppedBefore(t, 'plan', 'implement', /convention|comma delimiter|done.when|account/i); assert.equal(t.of('execute', 'test-plan').length, 0) }
  } finally { t.clean() }
})

for (const defect of ['missing', 'duplicate', 'fence-self-pass', 'fence-opt-out'] as const) test(`Ground and Rumen: ${defect} rule accounting is refused before the next phase`, { timeout: 30_000 }, async () => {
  const t = fixture((req, answer) => {
    if (producer(req, 'ideate')) {
      const prep = preparationOf(answer)
      assert.ok(prep.rumen.length > 0)
      if (defect === 'missing') prep.rumen = []
      else if (defect === 'duplicate') prep.rumen.push({ ...prep.rumen[0]! })
      else prep.rumen[0]!.disposition = defect === 'fence-opt-out' ? 'not-applicable' : 'passed'
      return answer
    }
  }, { project: { gates: [{ id: 'shell-fence', run: 'test -f src/export.sh', glob: '*.sh' }] } })
  try { await finish(t); assertStoppedBefore(t, 'ideate', 'challenge', /rumen|rule|disposition|fence/i) } finally { t.clean() }
})

test('Ground and Rumen: changing a rule definition during execution cannot stamp the old response with new evidence', { timeout: 30_000 }, async () => {
  let t: ReturnType<typeof fixture>
  t = fixture((req, result, attempt) => {
    if (req.kind === 'execute' && req.job === 'ideate') {
      const supplied = packetOf(req).organs.rules.find(rule => rule.text.includes('rule revision'))!
      assert.ok(supplied)
      t.project({ rumen: [{ id: 'stable-guidance-id', kind: 'sign', text: `Use rule revision ${attempt}; this changed after the packet was supplied.` }] })
      return result
    }
  }, { project: { rumen: [{ id: 'stable-guidance-id', kind: 'sign', text: 'Use rule revision initial before the call.' }] } })
  try { await finish(t); assertStoppedBefore(t, 'ideate', 'challenge', /rule|rumen|inventory|definition/i) } finally { t.clean() }
})

test('Ground and Rumen: stale required material is rechecked after a checkpoint and prevents the receiver from executing', { timeout: 30_000 }, async () => {
  const t = fixture((req, answer) => {
    if (producer(req, 'challenge')) { preparationOf(answer).next[0]!.requires.push('file:src/app.sh'); return answer }
  }, { autonomy: 'steps' })
  try {
    const paused = await t.run(drive(t.item.id, config)); assert.equal(paused.status, 'paused'); assert.equal(paused.job, 'plan')
    writeFileSync(join(t.repo, 'src/app.sh'), 'echo changed-after-preparation\n'); t.git('add', 'src/app.sh'); t.git('commit', '-qm', 'Change the required material after handoff preparation')
    t.restart(); await t.run(go(paused.id))
    const stopped = await t.run(drive(paused.id, config))
    assert.equal(stopped.status, 'held'); assert.equal(t.of('execute', 'plan').length, 0)
    const failed = t.store.events(paused.id).filter(event => event.kind === 'ground-checked' && event.data.job === 'plan' && event.data.ok === false)
    assert.ok(failed.length > 0); assert.match(JSON.stringify(failed), /src\/app\.sh/)
    assert.match(JSON.stringify(failed) + JSON.stringify(stopped.hold), /stale|changed|fingerprint|identity|match/i)
    assert.equal(t.store.get(paused.id)!.id, t.item.id)
  } finally { t.clean() }
})

for (const damage of ['missing', 'mismatched'] as const) test(`Ground and Rumen: ${damage} accepted predecessor evidence fails closed at the next phase`, { timeout: 30_000 }, async () => {
  const t = fixture(() => undefined, { autonomy: 'steps' })
  try {
    const paused = await t.run(drive(t.item.id, config)); assert.equal(paused.status, 'paused'); assert.equal(paused.job, 'plan')
    const receipt = t.store.events(paused.id).findLast(event => event.kind === 'organs-accepted' && event.data.job === 'challenge')!
    assert.ok(receipt, 'the control first establishes a real accepted producer receipt')
    const db = new (await import('node:sqlite')).DatabaseSync(t.path)
    if (damage === 'missing') db.prepare('DELETE FROM events WHERE seq=?').run(receipt.seq)
    else db.prepare("UPDATE events SET data=json_set(data, '$.receipt.outputHash', ?) WHERE seq=?").run('0'.repeat(64), receipt.seq)
    db.close(); t.restart(); await t.run(go(paused.id))
    const stopped = await t.run(drive(paused.id, config))
    assert.equal(stopped.status, 'held'); assert.equal(t.of('execute', 'plan').length, 0)
    const failures = t.store.events(paused.id).filter(event => event.kind === 'ground-checked' && event.data.job === 'plan' && event.data.ok === false)
    assert.ok(failures.length > 0)
    assert.match(JSON.stringify(failures) + JSON.stringify(stopped.hold), /challenge|predecessor|receipt|accepted/i)
    assert.equal(workEvidenceOf(t.store, stopped).jobs.challenge?.complete, false, 'the read model must not award completion after its mandatory receipt is unavailable')
    assert.equal(contextOf(t.store, stopped.id).organs.phases.some(phase => phase.job === 'challenge'), false)
    assert.equal(t.store.get(paused.id)!.id, t.item.id)
  } finally { t.clean() }
})

test('Ground and Rumen: a worker cannot use its opposing maker output as Ground evidence', { timeout: 30_000 }, async () => {
  const t = fixture((req, answer) => {
    if (producer(req, 'implement')) { preparationOf(answer).ground.sources.push({ ref: 'output:test-plan', finding: 'Deliberately unauthorized opposing-maker reference.' }); return answer }
  })
  try {
    const stopped = await finish(t)
    assert.notEqual(stopped.status, 'shipped')
    assert.match(rejections(t, 'implement') + JSON.stringify(stopped.hold), /test-plan|allowed|permitted|receive|private/i)
    assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'organs-accepted' && event.data.job === 'implement').length, 0)
  } finally { t.clean() }
})

test('Ground and Rumen: a blocked maker preserves its partial without fabricating a completed preparation claim', { timeout: 30_000 }, async () => {
  const t = fixture((req, answer) => producer(req, 'implement') ? { blocked: 'The fixed implementation needs a missing sender-owned decision; retain this partial for inspection.' } : answer, { autonomy: 'checkpoints' })
  try {
    const stopped = await finish(t)
    assert.equal(stopped.status, 'held'); assert.equal(stopped.hold?.code, 'arbiter_undetermined', JSON.stringify({ hold: stopped.hold, calls: t.store.calls(t.item.id).filter(call => call.outcome !== 'ok').map(call => ({ kind: call.kind, job: call.job, error: call.error })) }))
    assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'organs-accepted' && event.data.job === 'implement').length, 0)
    const partial = join(t.home, 'items', String(t.item.id), 'implement.partial.patch')
    assert.ok(existsSync(partial)); assert.match(readFileSync(partial, 'utf8'), /echo a,b/)
    assert.match(t.store.get(t.item.id)!.outputs.implement!, /missing sender-owned decision/)
    assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'shipped').length, 0)
  } finally { t.clean() }
})

test('Ground and Rumen: a replacement maker receives its ruling preparation without its accepted sibling private evidence', { timeout: 60_000 }, async () => {
  const secret = 'PRIVATE-CHECK-AUTHOR-GROUNDING-ONLY', resumeBrief = 'Resume this implementer from its own preserved partial in a fresh prepared checkout.'
  const t = fixture((req, result, attempt) => {
    if (producer(req, 'implement') && attempt === 1) return { blocked: 'The prepared implementation environment needs a fresh worktree; retain this partial.' }
    if (producer(req, 'test-plan')) { preparationOf(result).ground.sources[0]!.finding += ` ${secret}`; return result }
    if (producer(req, 'arbitrate')) {
      const preparation = preparationOf(result)
      preparation.next = [{ job: 'implement', brief: resumeBrief, requires: ['output:arbitrate'] }]
      return { ...result, cause: 'environment', answer: 'The actual preserved implementation partial is valid; retry only its environment.', preparation }
    }
    return result
  }, { autonomy: 'checkpoints' })
  try {
    const done = await finish(t)
    const sibling = t.store.events(t.item.id).find(event => event.kind === 'organs-accepted' && event.data.job === 'test-plan')!
    const ruling = t.store.events(t.item.id).find(event => event.kind === 'ruling' && event.data.cause === 'environment')!
    assert.ok(sibling && ruling && sibling.seq < ruling.seq, 'the sibling has already left private accepted evidence before replacement')
    assert.equal(done.status, 'shipped'); assert.equal(done.id, t.item.id)
    assert.equal(t.of('execute', 'test-plan').length, 1, 'unaffected accepted sibling work is reused')
    assert.equal(t.of('execute', 'implement').length, 2)
    const replacement = t.of('execute', 'implement')[1]!, packet = packetOf(replacement)
    assert.equal(replacement.prompt.includes(secret), false, 'complete recording must not grant the replacement access to its opposing maker')
    assert.deepEqual(Object.keys(packet.received ?? {}), ['plan'])
    assert.ok(packet.organs.incoming.some(entry => entry.from === 'arbitrate' && entry.job === 'implement' && entry.brief === resumeBrief), 'the authorized correction handoff carries its producer preparation')
  } finally { t.clean() }
})

for (const damage of ['missing', 'mismatched'] as const) test(`Ground and Rumen: ${damage} arbiter preparation cannot authorize a replacement maker`, { timeout: 45_000 }, async () => {
  let t: ReturnType<typeof fixture>
  t = fixture((req, result, attempt) => {
    if (producer(req, 'implement') && attempt === 1) return { blocked: 'Retain this partial, and have the arbiter resolve its environment.' }
    if (producer(req, 'arbitrate')) {
      preparationOf(result).next = [{ job: 'implement', brief: 'Resume this specific maker from the retained evidence.', requires: ['output:arbitrate'] }]
      return { ...result, cause: 'environment', answer: 'Retry the blocked implementer in a fresh prepared environment.' }
    }
    if (req.kind === 'intake' && req.job === 'implement' && attempt === 2) {
      const receipt = t.store.events(t.item.id).findLast(event => event.kind === 'organs-accepted' && event.data.job === 'arbitrate')!
      assert.ok(receipt)
      const db = new DatabaseSync(t.path)
      if (damage === 'missing') db.prepare('DELETE FROM events WHERE seq=?').run(receipt.seq)
      else db.prepare("UPDATE events SET data=json_set(data, '$.receipt.outputHash', ?) WHERE seq=?").run('0'.repeat(64), receipt.seq)
      db.close()
    }
    return result
  })
  try {
    const stopped = await finish(t)
    assert.equal(stopped.status, 'held'); assert.equal(t.of('execute', 'implement').length, 1, 'the initial blocked attempt is the only implementation execution')
    assert.ok(t.store.events(t.item.id).some(event => event.kind === 'ground-checked' && event.data.job === 'implement' && event.data.ok === false && JSON.stringify(event.data).includes('arbitrate')))
    assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'shipped').length, 0)
  } finally { t.clean() }
})

test('Ground and Rumen: organ acceptance and output advancement roll back together on a real SQLite failure', { timeout: 60_000 }, async () => {
  const t = fixture()
  try {
    const db = new (await import('node:sqlite')).DatabaseSync(t.path)
    db.exec("CREATE TRIGGER refuse_organ_acceptance BEFORE INSERT ON events WHEN NEW.kind='organs-accepted' BEGIN SELECT RAISE(ABORT,'independent-organ-atomic-control'); END;")
    db.close()
    await assert.rejects(t.run(drive(t.item.id, config)), /independent-organ-atomic-control|SQLITE_CONSTRAINT_TRIGGER|constraint/i)
    assert.equal(t.store.get(t.item.id)!.outputs.ideate, undefined)
    assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'organs-accepted').length, 0)
    assert.equal(t.of('execute', 'challenge').length, 0)
    const clearTrigger = new (await import('node:sqlite')).DatabaseSync(t.path); clearTrigger.exec('DROP TRIGGER refuse_organ_acceptance'); clearTrigger.close()
    t.restart()
    assert.equal((await finish(t)).status, 'shipped')
    assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'organs-accepted' && event.data.job === 'ideate').length, 1)
  } finally { t.clean() }
})

test('Ground and Rumen: unmatched and expanded gates remain truthful candidate-bound evidence', { timeout: 60_000 }, async () => {
  const t = fixture(() => undefined, { project: { gates: [{ id: 'shell-format', run: 'test -n "{files}" && test -f {files}', glob: '*.sh' }, { id: 'css-only', run: 'exit 93', glob: '*.css' }] } })
  try {
    const item = await finish(t)
    assert.equal(item.status, 'shipped')
    assert.equal(workEvidenceOf(t.store, item).verificationCurrent, true, 'templates and unmatched gates must not produce a false incomplete view')
    const receipts = item.verification?.gateReceipts
    assert.equal(receipts?.length, 2)
    assert.deepEqual(receipts!.map(entry => entry.outcome), ['passed', 'not-applicable'])
    assert.match(receipts![0]!.template, /\{files\}/)
    assert.ok(receipts![0]!.command && !receipts![0]!.command.includes('{files}'))
    assert.equal(receipts![1]!.command, null); assert.equal(receipts![1]!.exitCode, null)
    assert.deepEqual(receipts![1]!.files, [])
    assert.deepEqual(item.verification!.results.map(result => result.id), ['G1', 'C-csv'])
    const tampered = { ...item, verification: { ...item.verification!, gateReceipts: receipts!.map((entry, index) => index === 0 ? { ...entry, definitionHash: '0'.repeat(64) } : entry) } }
    assert.equal(workEvidenceOf(t.store, tampered).verificationCurrent, false, 'changed rule identity cannot inherit the old attestation')
  } finally { t.clean() }
})

test('Ground and Rumen: a failing mechanical fence remains a failure and keeps the candidate off main', { timeout: 30_000 }, async () => {
  const t = fixture(() => undefined, { autonomy: 'checkpoints', project: { gates: [{ id: 'reject-candidate', run: 'printf "deliberate-fence-control\\n"; exit 73', glob: '*.sh' }] } })
  try {
    const main = t.git('rev-parse', 'main'), stopped = await finish(t)
    assert.equal(stopped.status, 'held'); assert.equal(stopped.verification?.passed, false)
    const receipt = stopped.verification?.gateReceipts?.[0]
    assert.ok(receipt); assert.equal(receipt.outcome, 'failed'); assert.equal(receipt.exitCode, 73)
    assert.ok(stopped.verification?.results.some(result => result.id === 'G1' && result.exitCode === 73 && result.output.includes('deliberate-fence-control')))
    assert.equal(t.git('rev-parse', 'main'), main); assert.equal(existsSync(join(t.repo, 'src/export.sh')), false)
    assert.equal(workEvidenceOf(t.store, stopped).verificationCurrent, false)
  } finally { t.clean() }
})

function terminalPreparation(job: string, next: string[] = []): Preparation {
  return { ground: { intent: 'Return the bound function result.', sources: [{ ref: 'source', finding: 'The task requests this deterministic result.' }] }, rumen: [], next: next.map(target => ({ job: target, brief: `${job} prepared ${target}.`, requires: [`output:${job}`] })) }
}
function contractCommand(job: string, value: Json, capture?: string) {
  return command(`const fs=require('node:fs'),assert=require('node:assert/strict');const input=JSON.parse(fs.readFileSync(0,'utf8'));assert.equal(input.organs.version,'1');${capture ? `fs.writeFileSync(${JSON.stringify(capture)},JSON.stringify(input));` : ''}const preparation=${JSON.stringify(terminalPreparation(job))};preparation.rumen=input.organs.rules.map(rule=>({rule:rule.id,disposition:'addressed',evidence:'Carry the declared rule to its proper independent or engine-owned evidence; no worker pass is claimed.'}));console.log(JSON.stringify({...${JSON.stringify(value)},preparation}));`)
}
function functionTask(t: ReturnType<typeof fixture>, steps: Pack['delivery'][number]['steps']) {
  const pack: Pack = { name: 'mandatory-function-organs', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps }] }
  assert.deepEqual(problemsOf(pack), [])
  return t.store.save({ ...t.store.get(t.item.id)!, pack, job: '', status: 'queued', flow: { loop: 'delivery', accepted: [] } }, 'fixture-function-task', {})
}

for (const missing of [false, true]) test(`Ground and Rumen: trusted command ${missing ? 'cannot bypass missing preparation' : 'accepts and retains its complete preparation'}`, { timeout: 30_000 }, async () => {
  const t = fixture()
  try {
    const output = { result: 21, ...(!missing ? { preparation: terminalPreparation('produce') } : {}) }
    const item = functionTask(t, [{ job: 'produce', run: jsonCommand(output), output: object }])
    const result = await t.run(drive(item.id, config))
    assert.equal(result.status, missing ? 'held' : 'completed')
    assert.equal(t.calls.length, 0, 'trusted command execution does not create a mandatory worker')
    if (missing) { assert.equal(result.outputs.produce, undefined); assert.match(JSON.stringify(result.hold), /preparation/i) }
    else { assert.equal(lastJson(result.outputs.produce!)!.result, 21); assert.ok(t.store.events(item.id).some(event => event.kind === 'organs-accepted' && event.data.job === 'produce')) }
  } finally { t.clean() }
})

test('Ground and Rumen: composed groups derive their organ receipt from real accepted child output', { timeout: 30_000 }, async () => {
  const t = fixture()
  try {
    const item = functionTask(t, [{ job: 'compose', children: [{ job: 'child-result', run: jsonCommand({ result: 21, preparation: terminalPreparation('child-result', ['compose']) }), output: object }] }])
    const result = await t.run(drive(item.id, config))
    assert.equal(result.status, 'completed'); assert.equal(t.calls.length, 0)
    const receipts = t.store.events(item.id).filter(event => event.kind === 'organs-accepted')
    assert.deepEqual(receipts.map(event => event.data.job), ['child-result', 'compose'])
    const group = receipts[1]!.data.receipt as { ground: { sources: { ref: string; sha256: string }[] } }
    assert.ok(group.ground.sources.some(entry => entry.ref === 'output:child-result' && /^[a-f0-9]{64}$/.test(entry.sha256)))
  } finally { t.clean() }
})

for (const mode of ['passed', 'failed', 'unavailable'] as const) test(`Ground and Rumen: terminal function fences produce ${mode} evidence instead of an unverified completion`, { timeout: 30_000 }, async () => {
  const t = fixture()
  try {
    const marker = join(t.root, 'terminal-fence-ran.txt'), evidenceText = 'ran\n'
    const gate = { id: 'terminal-fence', run: command(`require('node:fs').appendFileSync(${JSON.stringify(marker)},${JSON.stringify(evidenceText)});${mode === 'failed' ? 'process.exitCode=71;' : ''}`), ...(mode === 'unavailable' ? { glob: '*.sh' } : {}) }
    t.project({ gates: [gate] })
    const item = functionTask(t, [{ job: 'produce', run: contractCommand('produce', { value: 21 }), output: object }])
    const result = await t.run(drive(item.id, config))
    assert.equal(result.status, mode === 'passed' ? 'completed' : 'held')
    assert.equal(existsSync(marker), mode !== 'unavailable')
    if (mode !== 'unavailable') assert.equal(readFileSync(marker, 'utf8'), evidenceText, 'the configured fence actually executes once')
    const evidence = t.store.events(item.id).find(event => event.kind === 'function-fences')
    assert.ok(evidence); assert.equal(evidence.data.job, 'produce'); assert.match(String(evidence.data.outputHash), /^[a-f0-9]{64}$/)
    const receipts = evidence.data.gateReceipts as { outcome: string; command: string | null; exitCode: number | null }[]
    assert.equal(receipts.length, 1); assert.equal(receipts[0]!.outcome, mode)
    assert.equal(receipts[0]!.exitCode, mode === 'passed' ? 0 : mode === 'failed' ? 71 : null)
    if (mode !== 'passed') { assert.equal(result.outputs.produce, undefined); assert.equal(t.store.events(item.id).some(event => event.kind === 'completed'), false) }
    else assert.equal(workEvidenceOf(t.store, result).delivered, true)
  } finally { t.clean() }
})

for (const damage of ['missing', 'mismatched'] as const) test(`Ground and Rumen: ${damage} terminal function fence proof cannot inherit a completion claim`, { timeout: 30_000 }, async () => {
  const t = fixture()
  try {
    t.project({ gates: [{ id: 'required-function-fence', run: 'true' }] })
    const item = functionTask(t, [{ job: 'produce', run: contractCommand('produce', { value: 21 }), output: object }])
    const done = await t.run(drive(item.id, config))
    assert.equal(done.status, 'completed'); assert.equal(workEvidenceOf(t.store, done).delivered, true)
    const proof = t.store.events(item.id).find(event => event.kind === 'function-fences')!
    assert.ok(proof)
    const db = new DatabaseSync(t.path)
    if (damage === 'missing') db.prepare('DELETE FROM events WHERE seq=?').run(proof.seq)
    else db.prepare("UPDATE events SET data=json_set(data, '$.outputHash', ?) WHERE seq=?").run('0'.repeat(64), proof.seq)
    db.close(); t.restart()
    const view = workEvidenceOf(t.store, t.store.get(item.id)!)
    assert.equal(view.delivered, false, 'actual fence proof is necessary, even when the accepted function prefix is retained')
    assert.equal(view.historical.status, 'completed', 'the reader preserves lifecycle history while refusing a current unsupported claim')
  } finally { t.clean() }
})

test('Ground and Rumen: discovery-created tasks inherit the mandatory organs and the prepared first delivery handoff', { timeout: 30_000 }, async () => {
  const t = fixture(() => undefined, { autonomy: 'checkpoints' })
  try {
    const captured = join(t.root, 'first-delivery-input.json')
    const pack: Pack = { name: 'discover-with-mandatory-organs', runtime: 'functions', discovery: [{ cartridge: 'discovery', steps: [{ job: 'extract', run: jsonCommand({ items: [{ title: 'Bound result', objective: 'Return a bound result', text: 'The selected durable work.' }], preparation: terminalPreparation('extract', ['delivery']) }), output: object }] }], delivery: [{ cartridge: 'delivery', steps: [{ job: 'return-result', run: contractCommand('return-result', { value: 21 }, captured), output: object }] }] }
    assert.deepEqual(problemsOf(pack), [])
    const parent = t.store.save({ ...t.item, pack, job: 'extract', flow: { loop: 'discovery', accepted: [] } }, 'fixture-discovery-task', {})
    const discovered = await t.run(drive(parent.id, config))
    assert.equal(discovered.status, 'discovered')
    const child = t.store.list().find(item => item.discovery === parent.id)!
    assert.ok(child); assert.equal(child.status, 'candidate'); assert.equal(child.organs?.version, '1'); assert.deepEqual(child.pack, pack)
    assert.deepEqual(child.organs?.origin, { item: parent.id, job: 'extract', outputHash: createHash('sha256').update(discovered.outputs.extract!).digest('hex'), target: 'delivery' })
    const selected = t.store.save({ ...child, status: 'queued' }, 'fixture-select-discovered-task', {})
    assert.equal((await t.run(drive(selected.id, config))).status, 'completed')
    const input = JSON.parse(readFileSync(captured, 'utf8')) as Packet
    assert.ok(input.organs.incoming.some(entry => entry.from === 'extract' && entry.job === 'return-result' && entry.brief === 'extract prepared delivery.'), 'the parent final-discovery preparation is resolved to the actual first delivery consumer')
  } finally { t.clean() }
})

test('Ground and Rumen: changed parent discovery requirements block the first child consumer before its command runs', { timeout: 30_000 }, async () => {
  const t = fixture(() => undefined, { autonomy: 'checkpoints' })
  try {
    const captured = join(t.root, 'must-not-run.json'), preparation = terminalPreparation('extract', ['delivery'])
    preparation.next[0]!.requires.push('file:src/app.sh')
    const pack: Pack = { name: 'stale-parent-material', runtime: 'functions', discovery: [{ cartridge: 'discovery', steps: [{ job: 'extract', run: jsonCommand({ items: [{ title: 'Bound child', objective: 'Use the prepared parent material' }], preparation }), output: object }] }], delivery: [{ cartridge: 'delivery', steps: [{ job: 'consume', run: contractCommand('consume', { value: 21 }, captured), output: object }] }] }
    const parent = t.store.save({ ...t.item, pack, job: 'extract', flow: { loop: 'discovery', accepted: [] } }, 'fixture-parent-requirements', {})
    assert.equal((await t.run(drive(parent.id, config))).status, 'discovered')
    const child = t.store.list().find(item => item.discovery === parent.id)!
    assert.ok(child)
    writeFileSync(join(t.repo, 'src/app.sh'), 'echo changed-after-discovery\n')
    t.store.save({ ...child, status: 'queued' }, 'fixture-select-discovered-task', {})
    const stopped = await t.run(drive(child.id, config))
    assert.equal(stopped.status, 'held'); assert.equal(existsSync(captured), false)
    assert.match(JSON.stringify(stopped.hold), /changed|stale|material|Ground/i)
    assert.ok(t.store.events(child.id).some(event => event.kind === 'ground-checked' && event.data.ok === false && JSON.stringify(event.data).includes('src/app.sh')))
  } finally { t.clean() }
})

test('Ground and Rumen: legacy read projections disclose missing organ evidence without inventing historical receipts', () => {
  const t = fixture(() => undefined, { legacy: true })
  try {
    t.restart()
    const context = contextOf(t.store, t.item.id)
    assert.equal(context.organs.legacy, true); assert.equal(context.organs.required, false); assert.equal(context.organs.version, null)
    assert.deepEqual(context.organs.phases, []); assert.deepEqual(conforms(API_SCHEMAS.Context, context), [])
    assert.equal(t.store.events(t.item.id).filter(event => event.kind === 'organs-accepted').length, 0)
  } finally { t.clean() }
})

test('Ground and Rumen: prerequisite fix work inherits the parent obligation without adding an agent identity', async () => {
  const t = fixture()
  try {
    t.store.save({ ...t.item, status: 'held', job: 'arbitrate', hold: { code: 'arbiter_undetermined', message: 'A pre-existing source defect needs its own task.', context: {} }, failure: 'The baseline source lacks the required fixture capability.' }, 'fixture-held-prerequisite', {})
    await t.run(answer(t.item.id, 'Repair the pre-existing source defect before retrying this task.', 'pre-existing'))
    const child = t.store.list().find(item => item.parent === t.item.id)!
    assert.ok(child); assert.equal(child.organs?.version, '1'); assert.equal(t.store.get(t.item.id)!.waitsOn, child.id)
    assert.equal(t.calls.length, 0, 'creating the prerequisite contract does not require a permanently living agent')
  } finally { t.clean() }
})

test('Ground and Rumen: public HTTP submission pins mandatory organs even for a custom pack and preserves them across reopen', { timeout: 30_000 }, async () => {
  const t = fixture()
  let server: ReturnType<typeof createServer> | undefined
  try {
    const pack: Pack = { name: 'no-opt-in-flag', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [{ job: 'return-result', run: jsonCommand({ result: 21, preparation: terminalPreparation('return-result') }), output: object }] }] }
    const path = join(t.root, 'custom-pack.json'); writeFileSync(path, JSON.stringify(pack)); t.project({ cartridges: path })
    const api = createApi({ path: t.path, open: () => t.store })
    server = createServer((req, res) => { void api(req, res) })
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    const session = await (await fetch(`${url}/api/v1/session`)).json() as { csrfToken: string }
    const requestId = randomUUID(), body = { requestId, workspace: t.repo, objective: 'Return a distinct bound result', source: 'Exact custom-pack raw input' }
    const response = await fetch(`${url}/api/v1/items`, { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json', 'X-MW-CSRF': session.csrfToken }, body: JSON.stringify(body) })
    assert.equal(response.status, 201, await response.text())
    const created = t.store.list().find(item => item.objective === body.objective)!
    assert.deepEqual(created.organs, { version: '1' }); assert.deepEqual(created.pack, pack)
    const rejectedOptOut = await fetch(`${url}/api/v1/items`, { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json', 'X-MW-CSRF': session.csrfToken }, body: JSON.stringify({ ...body, requestId: randomUUID(), organs: false }) })
    assert.equal(rejectedOptOut.status, 400, 'the public submission schema offers no organ opt-out')
    server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); server = undefined
    t.restart(); assert.deepEqual(t.store.get(created.id)!.organs, { version: '1' })
    assert.equal((await t.run(drive(created.id, config))).status, 'completed')
  } finally { if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())) }; t.clean() }
})

test('Ground and Rumen: public CLI start pins the default and a custom pack without global installation', { timeout: 30_000 }, () => {
  const t = fixture()
  try {
    const cli = resolve(import.meta.dirname, '../dist/mw.mjs')
    const custom = join(t.root, 'cli-custom-pack.json')
    writeFileSync(custom, JSON.stringify({ name: 'cli-custom', runtime: 'functions', discovery: [], delivery: [{ cartridge: 'work', steps: [{ job: 'one', run: jsonCommand({ value: 1, preparation: terminalPreparation('one') }), output: object }] }] } satisfies Pack))
    for (const choice of ['default', 'custom']) {
      const args = [cli, 'start', '--objective', `${choice} CLI task`, '--source', `Raw ${choice} input`, '--workspace', t.repo, ...(choice === 'custom' ? ['--cartridges', custom] : [])]
      const result = spawnSync(process.execPath, args, { cwd: t.repo, env: { ...process.env, MW_AUTORUN: '0' }, encoding: 'utf8', timeout: 10_000 })
      assert.equal(result.status, 0, result.stderr + result.stdout)
      const created = t.store.list().find(item => item.objective === `${choice} CLI task`)!
      assert.ok(created); assert.deepEqual(created.organs, { version: '1' })
    }
  } finally { t.clean() }
})
