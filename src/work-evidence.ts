// Read-only conclusions over durable receipts. Acceptance and invocation capture are separate facts.
import { laneOf, lastJson, malformed, stepOf } from './lane.ts'
import { invalidatedAt } from './work-boundary.ts'
import { organReceipts, organsRequired } from './organs.ts'
import { quote } from './errors.ts'
import { gateRule, hasFunctionFenceProof, type GateReceipt, type RumenRule } from './rumen.ts'
import type { Event, Item, Store } from './store.ts'

type Reader = Pick<Store['Service'], 'events' | 'call'>
export const parsedOutput = (raw: string | null | undefined): unknown | null => raw?.trim() ? lastJson(raw) ?? { text: raw } : null
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export { invalidatedAt } from './work-boundary.ts'
export interface Provenance {
	state: 'linked' | 'unavailable' | 'ambiguous'; acceptanceEvent: number | null; executionCall: number | null; repairCall: number | null; invocation: string | null; eventSeqs: number[]; reason: string | null
}
export interface WorkEvidence {
	job: string; configured: boolean; state: 'yes' | 'no' | 'unknown' | 'blocked'; complete: boolean; reason: string | null; schemaDiagnostic: string | null
	input: unknown | null; output: unknown | null; acceptedOutput: unknown | null; eventSeqs: number[]; provenance: Provenance
	laterAttempts: { entries: Array<{ event: number; at: string; kind: string; outcome: string; call: number | null; invocation: string | null; evidence: string }>; total: number; omitted: number; trace: string }
}

/** New gate claims require their full inventory; legacy receipts retain their narrower historical meaning. */
function gatesComplete(item: Item, events: readonly Event[], start: Event | undefined, proof: Event | undefined): boolean {
	const verification = item.verification
	if (!verification) return false
	const templates = Array.isArray(start?.data.gates) ? start.data.gates : []
	const receipts = verification.gateReceipts, saved = proof?.data.gateReceipts, definitions = start?.data.gateRules
	const required = item.organs !== undefined || receipts !== undefined || saved !== undefined || definitions !== undefined
	if (required) {
		if (!Array.isArray(receipts) || !Array.isArray(saved) || !Array.isArray(definitions) || !equal(receipts, saved) || receipts.length !== definitions.length || receipts.length !== templates.length) return false
		return receipts.every((receipt: GateReceipt, index: number) => {
			const definition = definitions[index] as RumenRule | undefined
			if (!receipt || !definition || typeof definition.run !== 'string' || definition.kind !== 'fence' || definition.glob !== undefined && typeof definition.glob !== 'string') return false
			if (receipt.id !== `G${index + 1}` || receipt.rule !== definition.id || receipt.definitionHash !== definition.definitionHash || definition.definitionHash !== gateRule({ run: definition.run, ...(definition.glob === undefined ? {} : { glob: definition.glob }) }).definitionHash || receipt.template !== definition.run || receipt.template !== templates[index]) return false
			if (!Array.isArray(receipt.files) || receipt.files.some(file => typeof file !== 'string') || new Set(receipt.files).size !== receipt.files.length || !Array.isArray(receipt.sourceBefore) || !Array.isArray(receipt.sourceAfter)) return false
			const result = verification.results.find(run => run.id === receipt.id && run.doneWhen === '(gate)')
			if (receipt.outcome === 'not-applicable') return receipt.files.length === 0 && receipt.command === null && receipt.exitCode === null && receipt.sourceBefore.length === 0 && receipt.sourceAfter.length === 0 && result === undefined
			const bound = (sources: GateReceipt['sourceBefore']) => sources.length === receipt.files.length && sources.every((source, at) => source?.path === receipt.files[at] && typeof source.sha256 === 'string' && /^[a-f0-9]{64}$/.test(source.sha256))
			return receipt.outcome === 'passed' && receipt.files.length > 0 && receipt.exitCode === 0 && receipt.command === receipt.template.replaceAll('{files}', receipt.files.map(quote).join(' ')) && result?.exitCode === 0 && result.run === receipt.command && bound(receipt.sourceBefore) && bound(receipt.sourceAfter)
		})
	}
	// Old engines did not save non-applicability or definition identities. Confirm their actual gate runs
	// by ordinal and invocation where available; an expanded {files} command is not its template.
	return templates.every((template, index) => {
		if (typeof template !== 'string') return false
		const id = `G${index + 1}`, result = verification.results.find(run => run.id === id && run.doneWhen === '(gate)')
		const invocations = events.filter(event => event.kind === 'trace-started' && event.data.kind === 'gate' && event.seq > (start?.seq ?? 0) && event.seq < (proof?.seq ?? Infinity) && (event.data.args as Record<string, unknown> | undefined)?.id === id)
		if (!result) return invocations.length === 0
		return result.exitCode === 0 && (template === result.run || template.includes('{files}') && invocations.some(event => (event.data.args as Record<string, unknown>).run === result.run))
	})
}
function sourceOf(store: Reader, item: Item, events: readonly Event[], job: string, receipt: Event | undefined) {
	const provenance: Provenance = { state: 'unavailable', acceptanceEvent: receipt?.seq ?? null, executionCall: null, repairCall: null, invocation: null, eventSeqs: receipt ? [receipt.seq] : [], reason: 'Invocation not recorded.' }
	const missing = (reason: string, ambiguous = false) => { provenance.reason = reason; provenance.state = ambiguous ? 'ambiguous' : 'unavailable'; return { provenance, input: null, effective: undefined as unknown } }
	if (!receipt) return missing('No acceptance boundary is recorded.')
	const lower = Math.max(invalidatedAt(events.filter(e => e.seq < receipt.seq), job), ...events.filter(e => e.seq < receipt.seq && (e.kind === 'accepted' && e.data.job === job || e.kind === 'handed-off' && e.data.from === job)).map(e => e.seq), 0)
	const interval = events.filter(e => e.seq > lower && e.seq < receipt.seq && e.data.job === job)
	const step = stepOf(laneOf(item.pack), job)
	if (step.run || step.children) {
		const starts = interval.filter(e => e.kind === 'trace-started' && e.data.kind === (step.children ? 'compose' : 'function'))
		const start = starts.at(-1)
		if (!start) return missing('Invocation not recorded.')
		const ends = interval.filter(e => e.kind === 'trace-finished' && e.data.invocation === start.data.invocation)
		if (ends.length !== 1) return missing('Invocation return is missing or ambiguous.', ends.length > 1)
		const end = ends[0]!, result = end.data.result as Record<string, unknown> | null
		if (end.data.status !== 'returned' || !result || !equal(result.value, receipt.data.output)) return missing('The nearest invocation contradicts the accepted result.', true)
		provenance.state = 'linked'; provenance.reason = null; provenance.invocation = String(start.data.invocation); provenance.eventSeqs.push(start.seq, end.seq)
		return { provenance, input: (start.data.args as Record<string, unknown> | undefined)?.input ?? null, effective: result.value }
	}
	const finished = interval.findLast(e => e.kind === 'call-finished' && e.data.kind === 'execute')
	const call = typeof finished?.data.call === 'number' ? store.call(finished.data.call) : undefined
	if (!call) return missing('Invocation not recorded.')
	if (call.item !== item.id || call.job !== job || call.kind !== 'execute') return missing('Saved call ownership contradicts the receipt.', true)
	provenance.executionCall = call.id; provenance.eventSeqs.push(finished!.seq)
	const repairs = interval.filter(e => e.kind === 'repaired' && e.seq > finished!.seq && e.data.call === call.id && e.data.ok === true)
	const repair = repairs.at(-1)
	const repairCall = typeof repair?.data.repair === 'number' ? store.call(repair.data.repair) : undefined
	if (repair && (!repairCall || repairCall.item !== item.id || repairCall.job !== job || repairCall.kind !== 'repair' || repairCall.outcome !== 'ok')) return missing('Repair linkage contradicts the execution.', true)
	const effective = parsedOutput((repairCall ?? call).output)
	if ((!repairCall && call.outcome !== 'ok') || 'output' in receipt.data && !equal(effective, receipt.data.output)) return missing('The nearest execution contradicts the accepted result.', true)
	provenance.state = 'linked'; provenance.reason = null
	if (repair && repairCall) { provenance.repairCall = repairCall.id; provenance.eventSeqs.push(repair.seq) }
	return { provenance, effective, input: { call: call.id, started: call.started, outcome: call.outcome, packet: parsedOutput(call.prompt), returnedOutput: parsedOutput(call.output), effectiveOutput: effective, repair: repair ? { event: repair.seq, call: repairCall!.id, record: `/api/call/${repairCall!.id}` } : null, record: `/api/call/${call.id}` } }
}

export function workEvidenceOf(store: Reader, item: Item) {
	const events = [...store.events(item.id)], lane = laneOf(item.pack), functions = lane.pack.runtime === 'functions'
	const discovery = item.flow?.loop === 'discovery' || item.discovery === undefined && lane.discovery.some(s => s.job === item.job)
	const steps = discovery ? lane.discovery : lane.delivery
	const jobs: Record<string, WorkEvidence> = {}
	let prefix = true
	for (const [index, step] of steps.entries()) {
		const job = step.job, output = parsedOutput(item.outputs[job])
		const receipts = events.filter(e => e.kind === 'accepted' && e.data.job === job || !functions && (e.kind === 'handed-off' && e.data.from === job || job === 'discover' && e.kind === 'discovered'))
		const receipt = receipts.at(-1), source = sourceOf(store, item, events, job, receipt)
		const acceptedOutput = receipt && 'output' in receipt.data ? receipt.data.output : source.effective
		const problem = output && typeof output === 'object' && 'blocked' in output ? String(output.blocked) : null
		const shapeProblem = discovery && output !== null && !problem ? malformed(lane, job, item.outputs[job]!) : undefined
		const valid = !!receipt && receipt.seq > invalidatedAt(events, job)
		const matches = acceptedOutput === undefined || equal(acceptedOutput, output)
		const artifacts = functions || (job !== 'implement' || !!item.change) && (job !== 'test-plan' || !!item.checks?.checks.length)
		const structured = !functions || !!receipt && 'output' in receipt.data && item.flow?.accepted[index] === job && prefix
		const organ = organReceipts(store, item).findLast(receipt => receipt.job === job)
		const terminalProof = !functions || discovery || index !== steps.length - 1 || !organsRequired(item) || hasFunctionFenceProof(events, job, item.outputs[job] ?? '', organ?.rumen ?? [])
		const organComplete = !organsRequired(item) || !!organ && terminalProof
		const complete = organComplete && output !== null && !problem && !shapeProblem && valid && matches && artifacts && structured
		if (functions && !complete) prefix = false
		const attempts = events.filter(e => e.seq > (receipt?.seq ?? 0) && e.data.job === job && (e.kind === 'call-finished' && e.data.kind === 'execute' || e.kind === 'trace-finished' && ['function', 'compose'].includes(String(e.data.kind)))).reverse()
		const laterAttempts = { entries: attempts.slice(0, 10).map(e => ({ event: e.seq, at: e.at, kind: String(e.data.kind), outcome: e.data.outcome === 'ok' || e.data.status === 'returned' ? 'unaccepted' : String(e.data.outcome ?? e.data.status ?? 'unknown'), call: typeof e.data.call === 'number' ? e.data.call : null, invocation: typeof e.data.invocation === 'string' ? e.data.invocation : null, evidence: `/api/v1/items/${item.id}/evidence?kind=event&ref=${e.seq}` })), total: attempts.length, omitted: Math.max(0, attempts.length - 10), trace: `/api/trace/${item.id}?lens=ax` }
		const reason = complete ? null : !organComplete ? 'Mandatory Ground, Rumen and next-step preparation are not accepted for this output.' : problem ?? (!receipt ? output === null ? 'No output or accepted execution evidence is recorded for this function.' : 'An output is retained, but no accepted execution evidence establishes this function.' : !valid ? 'Earlier acceptance is retained as history; correction or a changed contract requires this function again.' : !matches ? 'The retained output differs from its accepted execution evidence.' : shapeProblem ?? (!structured ? 'The configured accepted prefix or this node’s structured receipt is incomplete.' : !artifacts ? 'Required software maker artifacts are absent.' : 'No completed output is accepted for this function.'))
		jobs[job] = { job, configured: true, state: complete ? 'yes' : problem ? 'blocked' : 'no', complete, reason, schemaDiagnostic: shapeProblem ?? null, input: source.input, output, acceptedOutput: acceptedOutput ?? null, eventSeqs: receipts.map(e => e.seq), provenance: source.provenance, laterAttempts }
	}
	const verification = item.verification, proof = events.findLast(e => e.kind === 'verified'), checks = item.checks?.checks ?? []
	const verificationStart = events.findLast(e => e.kind === 'verify-started')
	const receiptResults = Array.isArray(proof?.data.results) ? proof.data.results as Array<Record<string, unknown>> : []
	const makerConfigured = lane.delivery.some(s => s.job === 'test-plan')
	const verificationCurrent = (!organsRequired(item) || organReceipts(store, item).some(receipt => receipt.job === 'verify')) && !functions && !!verification?.passed && !!verification.commit && proof?.data.commit === verification.commit && proof.data.on === verification.on && proof.seq > invalidatedAt(events, 'verify') && (!makerConfigured || !!jobs['test-plan']?.complete && checks.length > 0) && verification.results.length > 0 && verification.results.every(r => r.exitCode === 0 && receiptResults.some(saved => saved.id === r.id && saved.doneWhen === r.doneWhen && saved.exitCode === 0)) && gatesComplete(item, events, verificationStart, proof) && checks.every(c => verification.results.some(r => r.id === c.id && r.doneWhen === c.doneWhen && r.run === c.run && r.exitCode === 0))
	if (!functions && jobs.verify) { jobs.verify.complete = verificationCurrent; jobs.verify.state = verificationCurrent ? 'yes' : 'no'; jobs.verify.reason = verificationCurrent ? null : 'No current passing verification is recorded.' }
	const configuredComplete = steps.length > 0 && steps.every(s => jobs[s.job]?.complete)
	const final = events.findLast(e => e.kind === (discovery ? 'discovered' : 'completed'))
	const completionMatches = !!item.completion && item.completion.nodes === steps.length && equal(item.completion.output, parsedOutput(item.outputs[steps.at(-1)?.job ?? ''])) && !!final && (discovery || final.data.nodes === steps.length && equal(final.data.output, item.completion.output))
	const delivered = configuredComplete && (functions ? completionMatches : discovery ? events.some(e => e.kind === 'discovered') : verificationCurrent && !!item.shipped && events.some(e => e.kind === 'shipped'))
	return { jobs, configuredComplete, verificationCurrent, delivered, noWorkPerformed: steps.length === 0, reason: steps.length === 0 ? 'No work was performed.' : delivered ? null : 'Current evidence incomplete.', historical: { status: item.status, verification: item.verification ?? null, shipment: item.shipped ?? null, completion: item.completion ?? null } }
}

// UX carries conclusions and locators, never invocation or historical bodies.
export function workEvidenceSummaryOf(evidence: ReturnType<typeof workEvidenceOf>, item: number) {
 const preview = (value: string | null) => value === null ? null : Array.from(value).slice(0, 120).join('')
 const detail = `/api/trace/${item}?lens=ax`
 return {
  configuredComplete: evidence.configuredComplete, verificationCurrent: evidence.verificationCurrent,
  delivered: evidence.delivered, noWorkPerformed: evidence.noWorkPerformed, reason: preview(evidence.reason), detail,
  jobs: Object.values(evidence.jobs).map((job, ordinal) => ({
   key: `job:${ordinal}`, job: preview(job.job), labelTruncated: Array.from(job.job).length > 120,
   configured: job.configured, state: job.state, complete: job.complete, reason: preview(job.reason),
   reasonTruncated: job.reason !== null && Array.from(job.reason).length > 120,
   provenance: { state: job.provenance.state, acceptanceEvent: job.provenance.acceptanceEvent, executionCall: job.provenance.executionCall, repairCall: job.provenance.repairCall },
   laterAttempts: { total: job.laterAttempts.total, detail },
   evidence: { detail, acceptance: job.provenance.acceptanceEvent === null ? null : `/api/v1/items/${item}/evidence?kind=event&ref=${job.provenance.acceptanceEvent}`, call: job.provenance.executionCall === null ? null : `/api/call/${job.provenance.executionCall}`, repair: job.provenance.repairCall === null ? null : `/api/call/${job.provenance.repairCall}` },
  })),
 }
}
