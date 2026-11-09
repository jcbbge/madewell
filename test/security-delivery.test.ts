import assert from 'node:assert/strict'
import { cpSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { drive } from '../src/engine.ts'
import { createLedgerWork } from '../src/ledger.ts'
import { securitySettings } from '../examples/security-delivery/settings.ts'
import { selectedRules, type Packet } from '../examples/security-delivery/runtime.ts'
import { regressionFixture, regressionPrescriptions } from './fixtures/prepared-output.ts'

const probe = fileURLToPath(new URL('./fixtures/security-probe.ts', import.meta.url))
const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`
const probeCommand = (mode: string) => `${quote(process.execPath)} ${quote(probe)} ${mode}`
function skillInputs(root: string) {
 const core = join(root, 'agent-core'), skills = join(core, 'primitives/skills')
 mkdirSync(join(skills, 'secure-build/standards'), { recursive: true })
 mkdirSync(join(skills, 'security-audit'), { recursive: true })
 // Format fixtures, not a second copy of agent-core's standards. The optional real run binds a disposable copy.
 if (process.env.MW_SECURITY_AGENT_CORE) {
  for (const name of ['secure-build', 'security-audit']) cpSync(join(resolve(process.env.MW_SECURITY_AGENT_CORE), 'primitives/skills', name), join(skills, name), { recursive: true })
 } else {
  writeFileSync(join(skills, 'secure-build/SKILL.md'), '# Fixture\n## Laws\n1. Fixture invariant.\n## Standards\n')
  writeFileSync(join(skills, 'secure-build/standards/api.md'), '# Fixture API\n*Measure:* Refuse an unauthenticated read.\n')
  writeFileSync(join(skills, 'secure-build/standards/telemetry-and-switches.md'), '# Fixture telemetry\n*Measure:* Observe a denied request.\n')
  writeFileSync(join(skills, 'security-audit/SKILL.md'), '# Fixture audit\n**0. Fixture**\n- [ ] Check the read result.\n')
 }
 return core
}
function fixture(options: { surface?: boolean; fail?: boolean; missing?: boolean; unknown?: boolean; duplicate?: boolean; stale?: boolean } = {}) {
 const t = regressionFixture(req => {
  const packet = JSON.parse(req.prompt) as Packet
  const applicability = { surfaces: options.surface ? ['api'] : [], evidence: options.surface ? 'The fixed task adds an authenticated HTTP read endpoint.' : 'The fixed task produces a text label only; no endpoint, database, sign-in, webhook, credential, port or role changes.' }
  const catalog = packet.received['security-source']!.catalog!
  const rules = selectedRules(catalog, applicability)
  const accounting = rules.length ? rules.map(r => ({ id: r.id, disposition: 'addressed', evidence: `Inspected ${r.file}:${r.line}; carry this rule into the fixed brief and independent checks.` })) : [{ id: 'security:not-applicable', disposition: 'not-applicable', evidence: applicability.evidence }]
  const security = { ...(['ideate', 'plan'].includes(req.job) ? { applicability } : {}), accounting }
  if (options.stale && req.job === 'plan') appendFileSync(join(packet.bindings.inputs.find(i => i.id === 'secure-build')!.path, 'standards/api.md'), '\n*Measure:* Changed during this task.\n')
  if (req.job === 'implement') return { result: options.surface ? { source: `
import { createServer } from 'node:http';
const server = createServer((request, response) => {
 if (request.url !== '/read') { response.writeHead(404).end(); return; }
 if (${!options.fail} && request.headers.authorization !== 'Bearer disposable-fixture') {
  process.stderr.write('deny\\n'); response.writeHead(401).end(); return;
 }
 process.stderr.write('allow\\n'); response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({value:'hello'}));
});
server.listen(0, '127.0.0.1', () => process.stdout.write(JSON.stringify({url:'http://127.0.0.1:'+server.address().port+'/read'})+'\\n'));
process.on('SIGTERM', () => { server.closeAllConnections(); server.close(); });
` } : { value: 'hello' }, security }
  if (req.job === 'test-plan') {
   const real = !!process.env.MW_SECURITY_AGENT_CORE
   const checks = rules.filter(r => r.kind !== 'law').map(r => ({ id: r.id, ...(real && r.id !== 'api:measure:2' ? { verdict: 'UNKNOWN', evidence: 'This bounded machinery demonstration does not implement this production capability; a real deployment probe is still required.' } : { run: options.unknown ? `${quote(process.execPath)} -e ''` : probeCommand('endpoint') }) }))
   if (options.missing) checks.shift()
   if (options.duplicate) checks.push(checks[0]!)
   return { security, checks: [...checks, ...packet.item.conditions.map(c => ({ id: `condition:${c.id}`, run: probeCommand(options.surface ? 'endpoint' : 'text') }))] }
  }
  return { security, brief: 'Return hello; for the endpoint task require authentication before the read.' }
 })
 const core = skillInputs(t.root), settings = { ...securitySettings(core), autonomy: 'full' as const, alert: { run: 'true', cwd: t.root } }
 return { ...t, core, settings, createTask: () => t.run(createLedgerWork({ title: 'Security integration sample', objective: options.surface ? 'Add an authenticated read endpoint returning hello.' : 'Produce the text label hello.', source: options.surface ? 'An HTTP read endpoint; authentication required.' : 'Text only. No software or network surface is changed.', settings })), get currentStore() { return t.store } }
}
const eventsFor = (t: ReturnType<typeof fixture>, id: number) => t.currentStore.events(id)
const reportFor = (t: ReturnType<typeof fixture>, id: number) => {
 const events = eventsFor(t, id)
 const started = events.findLast(e => e.kind === 'trace-started' && e.data.job === 'verify' && e.data.kind === 'function')
 assert.ok(started, 'verification command ran')
 // Command outputs, including failed returns, live in durable trace fragments rather than agent calls.
 const raw = events.filter(e => e.kind === 'trace-output' && e.data.invocation === started.data.invocation && e.data.channel === 'stdout').map(e => e.data.text).join('')
 return JSON.parse(raw)
}

test('security pack: live checks, required phase accounting and private maker packets', async () => {
 const t = fixture({ surface: true })
 try {
  const item = await t.createTask(); await t.run(drive(item.id, { prescriptions: regressionPrescriptions }))
  const current = t.currentStore.get(item.id)!
  assert.equal(current.status, process.env.MW_SECURITY_AGENT_CORE ? 'held' : 'completed', JSON.stringify(current.hold))
  for (const job of ['ideate', 'plan', 'implement', 'test-plan']) {
   const request = t.requests.find(r => r.kind === 'execute' && r.job === job)!
   assert.ok(request, `${job} executed`)
   const packet = JSON.parse(request.prompt)
   assert.ok(packet.organs.rules.some((r: { id: string }) => r.id === 'guidance:secure-build:law:1'))
   assert.ok(packet.bindings.inputs.some((i: { id: string }) => i.id === 'secure-build'))
   assert.ok(packet.received['security-source'].catalog.rules.some((r: { kind: string }) => r.kind === 'measure'))
   assert.equal(packet.received[job === 'implement' ? 'test-plan' : 'implement'], undefined)
   const accepted = eventsFor(t, item.id).find(e => e.kind === 'organs-accepted' && e.data.job === job)!
   assert.ok(accepted)
   const receipt = accepted.data.receipt as { rumen: { id: string }[] }
   assert.deepEqual(receipt.rumen.map(r => r.id), packet.organs.rules.map((r: { id: string }) => r.id))
  }
  assert.ok(eventsFor(t, item.id).some(e => e.kind === 'function-returned' && e.data.job === 'verify'))
  const designed = t.requests.find(r => r.kind === 'execute' && r.job === 'test-plan')!
  const designPacket = JSON.parse(designed.prompt) as Packet
  const selected = selectedRules(designPacket.received['security-source']!.catalog!, designPacket.received.plan!.security!.applicability!)
  const report = reportFor(t, item.id).securityAudit.report as { id: string; verdict: string }[]
  assert.deepEqual(report.map(r => r.id).sort(), [...selected.filter(r => r.kind !== 'law').map(r => r.id), ...item.conditions.map(c => `condition:${c.id}`)].sort())
  if (process.env.MW_SECURITY_AGENT_CORE) {
   assert.equal(report.find(r => r.id === 'api:measure:2')?.verdict, 'PASS')
   assert.ok(report.some(r => r.verdict === 'UNKNOWN'))
  } else {
   const output = reportFor(t, item.id)
   assert.ok(output.securityAudit.report.every((r: { verdict: string }) => r.verdict === 'PASS'))
   assert.equal(current.completion?.kind, 'automated')
  }
 } finally { t.close() }
})

test('a deliberately failing running endpoint measure prevents completion and retains the report', async () => {
 const t = fixture({ surface: true, fail: true })
 try {
  const item = await t.createTask(); await t.run(drive(item.id, { prescriptions: regressionPrescriptions }))
  const current = t.currentStore.get(item.id)!
  assert.equal(current.status, 'held'); assert.equal(current.completion, undefined)
  assert.equal(current.hold?.message, 'Independent acceptance failed.')
  assert.ok(eventsFor(t, item.id).some(e => e.kind === 'function-returned' && e.data.job === 'verify'))
  assert.ok(reportFor(t, item.id).securityAudit.report.some((r: { verdict: string }) => r.verdict === 'FAIL'), 'saved command return contains the failed measurement')
 } finally { t.close() }
})

test('non-surface work records N/A, runs only its ordinary condition check, and completes', async () => {
 const t = fixture()
 try {
  const item = await t.createTask(); await t.run(drive(item.id, { prescriptions: regressionPrescriptions }))
  const current = t.currentStore.get(item.id)!
  assert.equal(current.status, 'completed', JSON.stringify(current.hold))
  const output = JSON.parse(current.outputs.verify!)
  assert.deepEqual(output.securityAudit.report.map((r: { verdict: string }) => r.verdict), ['N/A', 'PASS'])
  assert.equal(output.securityAudit.report[0].id, 'security:not-applicable')
 } finally { t.close() }
})

test('a standard edit changes the next task packet without a settings or Made Well edit', async () => {
 const t = fixture()
 try {
  const first = await t.createTask(); await t.run(drive(first.id, { prescriptions: regressionPrescriptions }))
  const before = JSON.parse(t.currentStore.get(first.id)!.outputs['security-source']!).catalog
  appendFileSync(join(t.core, 'primitives/skills/secure-build/standards/api.md'), '\n*Measure:* New disposable-fixture measure.\n')
  const second = await t.createTask(); await t.run(drive(second.id, { prescriptions: regressionPrescriptions }))
  const after = JSON.parse(t.currentStore.get(second.id)!.outputs['security-source']!).catalog
  assert.notEqual(before.sha256, after.sha256); assert.equal(after.rules.length, before.rules.length + 1)
  assert.deepEqual(first.settings, second.settings)
  const planner = t.requests.filter(r => r.job === 'plan' && r.kind === 'execute').at(-1)!
  assert.equal(JSON.parse(planner.prompt).received['security-source'].catalog.sha256, after.sha256)
 } finally { t.close() }
})

for (const mode of ['missing', 'unknown', 'duplicate', 'stale'] as const) test(`${mode} measurements cannot become PASS`, async () => {
 const t = fixture({ surface: true, [mode]: true })
 try {
  const item = await t.createTask(); await t.run(drive(item.id, { prescriptions: regressionPrescriptions }))
  assert.equal(t.currentStore.get(item.id)!.status, 'held')
  assert.equal(t.currentStore.get(item.id)!.completion, undefined)
  if (mode !== 'unknown') assert.equal(eventsFor(t, item.id).some(e => e.kind === 'function-started' && e.data.job === 'verify'), false)
  else assert.ok(reportFor(t, item.id).securityAudit.report.some((r: { verdict: string }) => r.verdict === 'UNKNOWN'))
 } finally { t.close() }
})
