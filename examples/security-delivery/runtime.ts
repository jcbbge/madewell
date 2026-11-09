// Trusted execution-2 commands, not another scheduler or an agent self-check.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Effect } from 'effect'
import { runGroup } from '../../src/worker.ts'
import { MadeWellError, errorJson } from '../../src/errors.ts'

interface Rule { id: string; file: string; line: number; kind: 'law' | 'measure' | 'audit'; standard?: string }
export interface Catalog { files: { file: string; sha256: string }[]; rules: Rule[]; sha256: string }
interface Accounting { id: string; disposition: 'addressed' | 'not-applicable'; evidence: string }
interface Applicability { surfaces: string[]; evidence: string }
interface Security { applicability?: Applicability; accounting: Accounting[] }
export interface Check { id: string; run?: string; verdict?: 'N/A' | 'UNKNOWN'; evidence?: string }
interface Output { security?: Security; catalog?: Catalog; checks?: Check[]; result?: unknown }
export interface Packet {
 item: { id: number; objective: string; conditionHash: string; conditions: { id: string; text: string }[] }
 args: { securityJob?: string }
 bindings: { inputs: { id: string; path: string }[] }
 received: Record<string, Output & Record<string, Output>>
 organs: { rules: { id: string; kind: string }[]; nextJobs: string[] }
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const nonblank = (value: unknown): value is string => typeof value === 'string' && !!value.trim()
function requireThat(condition: unknown, message: string): asserts condition {
 if (!condition) throw new Error(message)
}
function binding(packet: Packet, id: string) {
 const input = packet.bindings.inputs.find(i => i.id === id)
 requireThat(input, `Missing declared input:${id}`)
 return input.path
}

/** Retain identities/pointers only. Source text stays in agent-core; malformed catalogs fail closed. */
export function readCatalog(packet: Packet): Catalog {
 const root = binding(packet, 'secure-build'), audit = binding(packet, 'security-audit')
 const paths = [join(root, 'SKILL.md'), ...readdirSync(join(root, 'standards')).filter(f => f.endsWith('.md')).sort().map(f => join(root, 'standards', f)), join(audit, 'SKILL.md')]
 const rules: Rule[] = [], files: Catalog['files'] = []
 for (const file of paths) {
  const bytes = readFileSync(file, 'utf8'), lines = bytes.split('\n')
  files.push({ file, sha256: hash(bytes) })
  if (file === paths[0]) {
   const start = lines.findIndex(l => l.startsWith('## Laws')), end = lines.findIndex(l => l.startsWith('## Standards'))
   requireThat(start >= 0 && end > start, 'secure-build Laws/Standards structure is unavailable.')
   for (let i = start; i < end; i++) if (/^\d+\. /.test(lines[i]!)) rules.push({ id: `law:${lines[i]!.match(/^\d+/)![0]}`, file, line: i + 1, kind: 'law' })
  } else if (file === paths.at(-1)) {
   let layer = '', ordinal = 0
   for (const [i, line] of lines.entries()) {
    const heading = line.match(/^\*\*(\d+)\./)
    if (heading) { layer = heading[1]!; ordinal = 0 }
    if (line.startsWith('- [ ] ')) { requireThat(layer, 'Audit checklist lacks a numbered layer.'); rules.push({ id: `audit:${layer}.${++ordinal}`, file, line: i + 1, kind: 'audit' }) }
   }
  } else {
   const standard = basename(file, '.md')
   let ordinal = 0
   for (const [i, line] of lines.entries()) if (line.includes('*Measure:*')) rules.push({ id: `${standard}:measure:${++ordinal}`, file, line: i + 1, kind: 'measure', standard })
   requireThat(ordinal > 0, `No Measure lines in ${file}; source format needs review.`)
  }
 }
 requireThat(rules.some(r => r.kind === 'law') && rules.some(r => r.kind === 'audit'), 'Security laws/checklist are unavailable.')
 requireThat(new Set(rules.map(r => r.id)).size === rules.length, 'Duplicate security rule identities.')
 return { files, rules, sha256: hash(JSON.stringify({ files, rules })) }
}
function currentCatalog(packet: Packet) {
 const catalog = packet.received['security-source']?.catalog
 requireThat(catalog && catalog.sha256 === readCatalog(packet).sha256, 'Security source changed or is missing. Re-ground in a new task; historical evidence is retained.')
 return catalog
}
export function selectedRules(catalog: Catalog, applicability: Applicability): Rule[] {
 const allowed = ['api', 'database', 'auth', 'webhooks', 'mcp-server', 'credential', 'port', 'role']
 requireThat(applicability && Array.isArray(applicability.surfaces) && nonblank(applicability.evidence), 'Explicit surface applicability and evidence are required.')
 requireThat(new Set(applicability.surfaces).size === applicability.surfaces.length && applicability.surfaces.every(s => allowed.includes(s)), 'Unknown or repeated surface; resolve applicability in planning.')
 if (!applicability.surfaces.length) return []
 const selected = new Set(applicability.surfaces)
 selected.add('telemetry-and-switches')
 if (selected.has('webhooks')) selected.add('api')
 if (selected.has('credential') || selected.has('role')) selected.add('auth')
 if (selected.has('mcp-server')) for (const s of ['api', 'database', 'auth']) selected.add(s)
 for (const standard of selected) if (!['credential', 'port', 'role'].includes(standard)) requireThat(catalog.rules.some(r => r.standard === standard), `UNKNOWN: required standard ${standard} has no measures in the catalog.`)
 return catalog.rules.filter(r => r.kind !== 'measure' || selected.has(r.standard!))
}
function applicabilityFor(packet: Packet, output?: Output): Applicability {
 const own = ['ideate', 'plan'].includes(packet.args.securityJob ?? '')
 const applicability = (own ? output : packet.received.plan)?.security?.applicability
 requireThat(applicability, 'The phase needs an explicit applicability record from ideation/planning.')
 return applicability
}
function coverage(actual: string[], expected: string[], label: string) {
 requireThat(new Set(actual).size === actual.length && actual.length === expected.length && expected.every(id => actual.includes(id)), `${label} must cover each selected identity exactly once. Missing or extra: ${expected.filter(id => !actual.includes(id)).join(', ')} / ${actual.filter(id => !expected.includes(id)).join(', ')}`)
}
export function validateOutput(packet: Packet, output: Output) {
 const catalog = currentCatalog(packet), applicability = applicabilityFor(packet, output), rules = selectedRules(catalog, applicability)
 const expected = rules.length ? rules.map(r => r.id) : ['security:not-applicable']
 const accounting = output.security?.accounting
 requireThat(Array.isArray(accounting), 'Security rule accounting is required.')
 coverage(accounting.map(a => a.id), expected, 'Security accounting')
 requireThat(accounting.every(a => ['addressed', 'not-applicable'].includes(a.disposition) && nonblank(a.evidence)), 'Every rule needs a disposition and evidence.')
 requireThat(rules.filter(r => r.kind === 'law').every(r => accounting.find(a => a.id === r.id)?.disposition === 'addressed'), 'The secure-build laws apply to every selected surface; they cannot be waived.')
 if (!rules.length) requireThat(accounting[0]!.disposition === 'not-applicable', 'No touched surface requires explicit not-applicable accounting.')
 if (packet.args.securityJob === 'test-plan') validateChecks(packet, rules, output.checks)
 if (packet.args.securityJob === 'implement') requireThat(output.result !== undefined && output.result !== null, 'Implementation must return a result.')
}
function validateChecks(packet: Packet, rules: Rule[], checks: Check[] | undefined): asserts checks is Check[] {
 requireThat(Array.isArray(checks), 'The independent test architect must supply checks.')
 const expected = [...rules.filter(r => r.kind !== 'law').map(r => r.id), ...packet.item.conditions.map(c => `condition:${c.id}`)]
 coverage(checks.map(c => c.id), expected, 'Independent checks')
 for (const check of checks) {
  requireThat(nonblank(check.run) ? check.verdict === undefined : ['N/A', 'UNKNOWN'].includes(check.verdict ?? '') && nonblank(check.evidence), `Check ${check.id} needs a command or an explicit N/A/UNKNOWN finding with evidence.`)
  if (check.id.startsWith('condition:')) requireThat(nonblank(check.run), 'Task conditions require executed checks, not applicability exemptions.')
 }
}
function preparation(packet: Packet, job: string) {
 return {
  ground: { intent: packet.item.objective, sources: [{ ref: 'source', finding: 'This command serves the recorded task.' }, ...['secure-build', 'security-audit'].map(id => ({ ref: `input:${id}`, finding: 'File content hashes and rule pointers are retained in the security catalog; directory readiness alone is not content proof.' }))] },
  rumen: packet.organs.rules.map(rule => ({ rule: rule.id, disposition: 'addressed', evidence: 'Engine command retains source identities and actual execution outcomes; no worker assertion supplies a passing check.' })),
  next: packet.organs.nextJobs.map(jobNext => ({ job: jobNext, brief: `Use the saved ${job} output and its current external source identities.`, requires: [`output:${job}`] })),
 }
}
export const verify = Effect.fn('mw.securityDelivery.verify')(function* (packet: Packet) {
 const catalog = currentCatalog(packet), applicability = applicabilityFor(packet), rules = selectedRules(catalog, applicability)
 const makers = packet.received.makers!, checks = makers?.['test-plan']?.checks
 validateChecks(packet, rules, checks)
 const result = packet.received.candidate?.result
 requireThat(result !== undefined && result !== null, 'No implementation result to check.')
 const report: { id: string; verdict: 'PASS' | 'FAIL' | 'N/A' | 'UNKNOWN'; evidence: string; run?: string; exitCode?: number | null; stdout?: string; stderr?: string }[] = []
 const record = (entry: typeof report[number]) => {
  report.push(entry)
  // The outer engine captures stderr fragments while this command runs, including interrupted partials.
  writeSync(2, JSON.stringify({ securityCheck: entry }) + '\n')
 }
 if (!rules.length) record({ id: 'security:not-applicable', verdict: 'N/A', evidence: applicability.evidence })
 for (const check of checks) {
  if (!check.run) { record({ id: check.id, verdict: check.verdict!, evidence: check.evidence! }); continue }
  const executed = yield* Effect.result(runGroup({ command: 'sh', args: ['-c', check.run], cwd: process.cwd(), env: process.env, input: JSON.stringify({ item: packet.item, result }), budget: { minutes: 1 } }))
  if (executed._tag === 'Failure') { record({ id: check.id, verdict: 'UNKNOWN', run: check.run, evidence: executed.failure.message }); continue }
  const observed = executed.success
  let evidence: string | undefined
  try { const value = JSON.parse(observed.stdout); if (nonblank(value.evidence)) evidence = value.evidence } catch { /* An unstructured or missing measurement is UNKNOWN, never PASS. */ }
  record({ id: check.id, verdict: observed.code !== 0 || observed.overBudget ? 'FAIL' : evidence ? 'PASS' : 'UNKNOWN', run: check.run, exitCode: observed.code, stdout: observed.stdout, stderr: observed.stderr, evidence: evidence ?? `No structured measurement. stdout=${observed.stdout}; stderr=${observed.stderr}` })
 }
 // A source edit during checks invalidates the report as well as the next producer packet.
 if (readCatalog(packet).sha256 !== catalog.sha256) record({ id: 'security:source-changed', verdict: 'UNKNOWN', evidence: 'External standards changed while checks ran.' })
 const passed = report.every(r => r.verdict === 'PASS' || r.verdict === 'N/A')
 return { securityAudit: { mode: 'change', catalogHash: catalog.sha256, applicability, report }, acceptance: {
  verdict: passed ? 'passed' : 'failed', conditionHash: packet.item.conditionHash,
  evidence: packet.item.conditions.map(c => ({ conditionId: c.id, detail: report.find(r => r.id === `condition:${c.id}`)?.evidence ?? 'UNKNOWN', refs: ['output:candidate'] })),
 }, organPreparation: preparation(packet, 'verify') }
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
 try {
  const value = JSON.parse(readFileSync(0, 'utf8'))
  const mode = process.argv[2]
  if (mode === 'validate') { validateOutput(value.input, value.output); process.stdout.write(JSON.stringify({ valid: true }) + '\n') }
  else if (mode === 'catalog') process.stdout.write(JSON.stringify({ catalog: readCatalog(value), organPreparation: preparation(value, 'security-source') }) + '\n')
  else if (mode === 'candidate') process.stdout.write(JSON.stringify({ result: value.received.makers.implement.result, organPreparation: preparation(value, 'candidate') }) + '\n')
  else if (mode === 'verify') process.stdout.write(JSON.stringify(await Effect.runPromise(verify(value))) + '\n')
  else throw new Error('Expected catalog, validate, candidate or verify.')
 } catch (cause) {
  process.stdout.write(JSON.stringify(errorJson(new MadeWellError({ code: 'function_failed', message: cause instanceof Error ? cause.message : String(cause), context: { id: Number(process.env.MW_ITEM ?? 0), job: process.env.MW_JOB ?? 'security-delivery', reason: String(cause) }, next: [] }))) + '\n')
  process.exitCode = 1
 }
}
