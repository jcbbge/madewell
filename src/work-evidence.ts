// Read-only conclusions over durable receipts. Acceptance and invocation capture are separate facts.
import { laneOf, lastJson, malformed, stepOf, type Pack } from './lane.ts'
import type { Event, Item, Store } from './store.ts'

type Reader = Pick<Store['Service'], 'events' | 'call'>
export const parsedOutput = (raw: string | null | undefined): unknown | null => raw?.trim() ? lastJson(raw) ?? { text: raw } : null
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export const invalidatedAt = (events: readonly Event[], job: string): number => Math.max(0, ...events.filter(e => {
	if (e.kind === 'cartridges-applied') {
		const before = e.data.from as Pack | undefined, after = e.data.to as Pack | undefined
		return !!before && !!after && !equal(stepOf(laneOf(before), job), stepOf(laneOf(after), job))
	}
	if (job === 'verify') return ['main-moved', 'replan', 'rebased', 'ruling'].includes(e.kind)
	if (['plan', 'implement', 'test-plan'].includes(job) && ['replan', 'rebased'].includes(e.kind)) return true
	return e.kind === 'ruling' && (e.data.cause === 'implementation' && ['plan', 'implement', 'test-plan'].includes(job) || e.data.cause === 'test' && job === 'test-plan')
}).map(e => e.seq))
export interface Provenance {
	state: 'linked' | 'unavailable' | 'ambiguous'; acceptanceEvent: number | null; executionCall: number | null; repairCall: number | null; invocation: string | null; eventSeqs: number[]; reason: string | null
}
export interface WorkEvidence {
	job: string; configured: boolean; state: 'yes' | 'no' | 'unknown' | 'blocked'; complete: boolean; reason: string | null
	input: unknown | null; output: unknown | null; acceptedOutput: unknown | null; eventSeqs: number[]; provenance: Provenance
	laterAttempts: { entries: Array<{ event: number; at: string; kind: string; outcome: string; call: number | null; invocation: string | null; evidence: string }>; total: number; omitted: number; trace: string }
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
		const complete = output !== null && !problem && !shapeProblem && valid && matches && artifacts && structured
		if (functions && !complete) prefix = false
		const attempts = events.filter(e => e.seq > (receipt?.seq ?? 0) && e.data.job === job && (e.kind === 'call-finished' && e.data.kind === 'execute' || e.kind === 'trace-finished' && ['function', 'compose'].includes(String(e.data.kind)))).reverse()
		const laterAttempts = { entries: attempts.slice(0, 10).map(e => ({ event: e.seq, at: e.at, kind: String(e.data.kind), outcome: e.data.outcome === 'ok' || e.data.status === 'returned' ? 'unaccepted' : String(e.data.outcome ?? e.data.status ?? 'unknown'), call: typeof e.data.call === 'number' ? e.data.call : null, invocation: typeof e.data.invocation === 'string' ? e.data.invocation : null, evidence: `/api/v1/items/${item.id}/evidence?kind=event&ref=${e.seq}` })), total: attempts.length, omitted: Math.max(0, attempts.length - 10), trace: `/api/trace/${item.id}?lens=ax` }
		const reason = complete ? null : problem ?? shapeProblem ?? (!receipt ? 'An output is retained, but no accepted execution evidence establishes this function.' : !valid ? 'Earlier acceptance is retained as history; correction or a changed contract requires this function again.' : !matches ? 'The retained output differs from its accepted execution evidence.' : !structured ? 'The configured accepted prefix or this node’s structured receipt is incomplete.' : !artifacts ? 'Required software maker artifacts are absent.' : 'No completed output is accepted for this function.')
		jobs[job] = { job, configured: true, state: complete ? 'yes' : problem ? 'blocked' : 'no', complete, reason, input: source.input, output, acceptedOutput: acceptedOutput ?? null, eventSeqs: receipts.map(e => e.seq), provenance: source.provenance, laterAttempts }
	}
	const verification = item.verification, proof = events.findLast(e => e.kind === 'verified'), checks = item.checks?.checks ?? []
	const verificationStart = events.findLast(e => e.kind === 'verify-started')
	const recordedGates = Array.isArray(verificationStart?.data.gates) ? verificationStart.data.gates as string[] : []
	const receiptResults = Array.isArray(proof?.data.results) ? proof.data.results as Array<Record<string, unknown>> : []
	const makerConfigured = lane.delivery.some(s => s.job === 'test-plan')
	const verificationCurrent = !functions && !!verification?.passed && !!verification.commit && proof?.data.commit === verification.commit && proof.data.on === verification.on && proof.seq > invalidatedAt(events, 'verify') && (!makerConfigured || !!jobs['test-plan']?.complete && checks.length > 0) && verification.results.length > 0 && verification.results.every(r => r.exitCode === 0 && receiptResults.some(saved => saved.id === r.id && saved.doneWhen === r.doneWhen && saved.exitCode === 0)) && recordedGates.every(run => verification.results.some(r => r.run === run && r.exitCode === 0)) && checks.every(c => verification.results.some(r => r.id === c.id && r.doneWhen === c.doneWhen && r.run === c.run && r.exitCode === 0))
	if (!functions && jobs.verify) { jobs.verify.complete = verificationCurrent; jobs.verify.state = verificationCurrent ? 'yes' : 'no'; jobs.verify.reason = verificationCurrent ? null : 'No current passing verification is recorded.' }
	const configuredComplete = steps.length > 0 && steps.every(s => jobs[s.job]?.complete)
	const final = events.findLast(e => e.kind === (discovery ? 'discovered' : 'completed'))
	const completionMatches = !!item.completion && item.completion.nodes === steps.length && equal(item.completion.output, parsedOutput(item.outputs[steps.at(-1)?.job ?? ''])) && !!final && (discovery || final.data.nodes === steps.length && equal(final.data.output, item.completion.output))
	const delivered = configuredComplete && (functions ? completionMatches : discovery ? events.some(e => e.kind === 'discovered') : verificationCurrent && !!item.shipped && events.some(e => e.kind === 'shipped'))
	return { jobs, configuredComplete, verificationCurrent, delivered, noWorkPerformed: steps.length === 0, reason: steps.length === 0 ? 'No work was performed.' : delivered ? null : 'Current evidence incomplete.', historical: { status: item.status, verification: item.verification ?? null, shipment: item.shipped ?? null, completion: item.completion ?? null } }
}
