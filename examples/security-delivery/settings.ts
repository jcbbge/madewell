// Software-specific wiring; the general ledger and external work keep their defaults.
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Pack } from '../../src/lane.ts'
import type { WorkSettings } from '../../src/settings.ts'
import { MadeWellError, errorJson } from '../../src/errors.ts'

const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`
const jobs = ['security-source', 'ideate', 'plan', 'implement', 'test-plan', 'makers', 'candidate', 'verify']
const thinkers = ['ideate', 'plan', 'implement', 'test-plan']
export const standards = ['api', 'database', 'auth', 'webhooks', 'mcp-server', 'telemetry-and-switches'] as const

/** Call at configuration time with an explicit local agent-core checkout, never an inferred home. */
export function securitySettings(agentCore: string): Pick<WorkSettings, 'deliveryPack' | 'inputs' | 'rumen' | 'conventions'> {
 const runtime = fileURLToPath(new URL('./runtime.ts', import.meta.url))
 const command = (mode: string) => `${quote(process.execPath)} ${quote(runtime)} ${mode}`
 const schema = { type: 'object' }
 const agent = (job: string, profile: string, duty: string, receives: string[]) => ({
  job, profile, duty, receives, output: schema, replay: 'safe' as const, writes: [], access: 'read' as const,
  check: command('validate'), args: { securityJob: job }, onFailure: { target: 'hold' },
 })
 const pack: Pack = {
  name: 'secure-software-delivery', version: '1', runtime: 'functions', contracts: { execution: '2' }, discovery: [],
  brief: 'Software security is scoped per task, not inferred from job names. Read the declared agent-core sources. No maker runs checks. Report standards conflicts through NQ. Every worker returns security.accounting: [{id, disposition: addressed|not-applicable, evidence}]. The ideator and planner additionally return security.applicability: {surfaces: [api|database|auth|webhooks|mcp-server|credential|port|role], evidence}. Empty surfaces requires explicit no-surface evidence. The accepted plan fixes applicability for both private makers. For nonempty surfaces, account for all catalog laws, measures of selected standards (always telemetry; MCP also API/database/auth), and audit checklist entries. For empty surfaces account only for security:not-applicable. Each applicable measure or audit line needs a test-architect check {id, run}, or {id, verdict: N/A, evidence}; UNKNOWN is allowed as {id, verdict: UNKNOWN, evidence} but blocks completion. Commands receive {item, result} JSON on stdin and return {evidence: nonblank string} JSON after probing the running candidate; exit zero alone is UNKNOWN. Also author one command per task condition with id condition:<id>. Commands must be bounded, replay-safe and leave product material unchanged; no secret may enter output. Rumen accounting never claims executed proof.',
  delivery: [{ cartridge: 'software', steps: [
   { job: 'security-source', run: command('catalog'), receives: [], output: schema, replay: 'safe', writes: [], access: 'read' },
   agent('ideate', 'ideator', 'Ground and shape this task; identify touched surfaces with evidence, or explicitly record security not applicable. Read the current catalog pointers and source bytes.', ['security-source']),
   agent('plan', 'planner', 'Settle the fixed implementation brief and completion conditions. Record final surface applicability, invariants and conflicts. Prepare both private makers. Do not author independent acceptance checks.', ['security-source', 'ideate']),
   { job: 'makers', mode: 'parallel', receives: ['security-source', 'plan'], children: [
    agent('implement', 'implementer', 'Carry out only the accepted plan within declared destinations. Return result and security accounting. Never run checks, typechecks, or acceptance. Missing authority or material is an NQ question.', ['security-source', 'plan']),
    agent('test-plan', 'test architect', 'Independently author checks for every selected catalog measure/audit line and condition. Use current source pointers and the plan, never sibling output. Return checks and security accounting. Do not run them. Explicit N/A needs evidence; unmeasured is UNKNOWN.', ['security-source', 'plan']),
   ] },
   { job: 'candidate', run: command('candidate'), receives: ['makers'], output: schema, replay: 'safe', writes: [], access: 'read' },
   { job: 'verify', run: command('verify'), receives: ['security-source', 'plan', 'makers', 'candidate'], output: schema, replay: 'safe', writes: [], access: 'run', budget: { minutes: 30 }, onFailure: { target: 'hold' } },
  ] }], completion: { resultJob: 'candidate', acceptanceJob: 'verify' },
 }
 return {
  deliveryPack: pack,
  inputs: [
   { id: 'secure-build', path: resolve(agentCore, 'primitives/skills/secure-build'), kind: 'dir', jobs },
   { id: 'security-audit', path: resolve(agentCore, 'primitives/skills/security-audit'), kind: 'dir', jobs },
  ],
  rumen: [
   { id: 'security:applicability', kind: 'judge', text: 'Record touched surfaces in security.applicability with evidence; no surface means explicit security:not-applicable. Follow SKILL.md in input:security-audit, change mode. UNKNOWN blocks automated completion.', jobs: thinkers },
   ...Array.from({ length: 10 }, (_, i) => ({ id: `secure-build:law:${i + 1}`, kind: 'judge' as const, text: `When security applies, follow SKILL.md in input:secure-build, Laws ${i + 1}. Account for it; execution proof belongs to the engine.`, jobs: thinkers })),
   ...standards.map(id => ({ id: `secure-build:${id}`, kind: 'judge' as const, text: `For this surface follow standards/${id}.md in input:secure-build; resolve each rule and Measure through the current security-source catalog. Explicitly justify non-applicability.`, jobs: thinkers })),
   { id: 'security:verdicts', kind: 'lexicon', text: 'PASS means an executed measure with evidence; FAIL means a failed check; N/A needs explicit applicability evidence; missing measurement is UNKNOWN, never PASS. See SKILL.md in input:security-audit.', jobs: thinkers },
  ],
  conventions: ['Security standards remain in declared agent-core inputs, not this repository. Conflicts return through NQ. Neither maker executes checks; Made Well owns execution and independent acceptance.'],
 }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
 if (!process.argv[2]) {
  process.stdout.write(JSON.stringify(errorJson(new MadeWellError({ code: 'usage', message: 'Supply the absolute agent-core checkout path.', context: { command: 'security-settings' }, next: [] }))) + '\n')
  process.exitCode = 1
 } else process.stdout.write(JSON.stringify({ requestId: crypto.randomUUID(), revision: '0', settings: securitySettings(process.argv[2]) }) + '\n')
}
