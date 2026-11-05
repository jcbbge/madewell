// Project constraints and engine-owned evidence. Rule identity is separate from an expanded shell command.
import { createHash } from 'node:crypto'
import type { WorkSettings } from './settings.ts'
type Gate={id?:string;run:string;glob?:string}
import type { Event } from './store.ts'

export type RumenKind = 'fence' | 'judge' | 'sign' | 'lexicon'
export interface RumenRule {
	readonly id: string
	readonly kind: RumenKind
	readonly text: string
	readonly definitionHash: string
	readonly evidenceOwner: 'engine' | 'independent-review' | 'operator' | 'project'
	readonly run?: string
	readonly glob?: string
}

export interface GateSource {
	readonly path: string
	readonly sha256: string | null
	/** Only a captured staged deletion which was physically absent at this observation. */
	readonly deleted?: true
}

/** Missing content is known only when the receipt explicitly records a declared deletion. */
export const gateSourceAvailable = (source: GateSource): boolean => source.deleted === true
	? source.sha256 === null
	: source.deleted === undefined && typeof source.sha256 === 'string' && /^[a-f0-9]{64}$/.test(source.sha256)

/** These fingerprints describe this gate's actual before/after material, not every later formatter's result. */
export interface GateReceipt {
	readonly id: string
	readonly rule: string
	readonly definitionHash: string
	readonly template: string
	readonly command: string | null
	readonly files: ReadonlyArray<string>
	readonly outcome: 'passed' | 'failed' | 'not-applicable' | 'unavailable'
	readonly exitCode: number | null
	readonly sourceBefore: ReadonlyArray<GateSource>
	readonly sourceAfter: ReadonlyArray<GateSource>
}

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

export function gateRule(gate: Gate): RumenRule {
	const definitionHash = hash({ kind: 'fence', run: gate.run, glob: gate.glob ?? null })
	return {
		id: `gate:${gate.id ?? definitionHash}`, kind: 'fence', text: gate.run, definitionHash, evidenceOwner: 'engine',
		run: gate.run, ...(gate.glob === undefined ? {} : { glob: gate.glob }),
	}
}

/** No rules is an explicit empty inventory. Guidance never becomes a shell gate by its presence here. */
export function rumenRules(project: Pick<WorkSettings,'conventions'|'rumen'> | undefined, job: string): RumenRule[] {
	const gates: RumenRule[] = []
	const conventions: RumenRule[] = [...new Set(project?.conventions ?? [])].map(text => ({
		id: `convention:${hash(text)}`, kind: 'judge', text, definitionHash: hash({ kind: 'judge', text }), evidenceOwner: 'independent-review',
	}))
	const guidance: RumenRule[] = (project?.rumen ?? []).filter(rule => rule.jobs === undefined || rule.jobs.includes(job)).map(rule => ({
		id: `guidance:${rule.id}`, kind: rule.kind, text: rule.text,
		definitionHash: hash({ kind: rule.kind, text: rule.text, jobs: rule.jobs === undefined ? null : [...rule.jobs].sort() }),
		evidenceOwner: rule.kind === 'judge' ? 'independent-review' : rule.kind === 'sign' ? 'operator' : 'project',
	}))
	// Legacy projects may intentionally repeat an identical gate command. It is one rule with multiple
	// execution receipts; the per-run G# identity remains distinct.
	return [...new Map([...gates, ...conventions, ...guidance].map(rule => [rule.id, rule])).values()]
}

/** Terminal function completion requires engine-owned fence proof, including an explicit empty inventory. */
export function hasFunctionFenceProof(events: ReadonlyArray<Event>, job: string, output: string, rules: ReadonlyArray<RumenRule>): boolean {
	const proof = events.findLast(event => event.kind === 'function-fences' && event.data.job === job)
	const receipts = Array.isArray(proof?.data.gateReceipts) ? proof.data.gateReceipts as GateReceipt[] : undefined
	const fences = rules.filter(rule => rule.kind === 'fence')
	return !!receipts && proof!.data.outputHash === createHash('sha256').update(output).digest('hex')
		&& fences.every(rule => receipts.some(receipt => receipt.rule === rule.id && receipt.definitionHash === rule.definitionHash && receipt.command === rule.run && receipt.outcome === 'passed' && receipt.exitCode === 0))
		&& receipts.every(receipt => fences.some(rule => rule.id === receipt.rule && rule.definitionHash === receipt.definitionHash) && receipt.outcome === 'passed' && receipt.exitCode === 0)
}
