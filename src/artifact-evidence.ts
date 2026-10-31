import { createHash } from 'node:crypto'
import type { Event, Item, Store } from './store.ts'

type EvidenceStore = Pick<Store['Service'], 'events' | 'note'>
export const contentHash = (text: string | Uint8Array) => createHash('sha256').update(text).digest('hex')
export interface SavedArtifact {
	readonly role: 'implement' | 'test-plan'
	readonly base: string
	readonly plan: string
	readonly sha256: string
	readonly bytes: number
	readonly patch: string
	readonly partial: boolean
}

/** Managed evidence survives disposable worktree and item-home cleanup. */
export function preserveArtifact(store: EvidenceStore, item: Item, role: SavedArtifact['role'], patch: string, base: string, partial = false): SavedArtifact {
	const artifact: SavedArtifact = { role, base, plan: contentHash(item.outputs.plan ?? ''), sha256: contentHash(patch), bytes: Buffer.byteLength(patch), patch, partial }
	const events = store.events(item.id)
	const last = events.findLast(e => e.seq > continuationBoundary(events) && e.kind === 'artifact-saved' && e.data.role === role)
	if (!last || ['sha256', 'base', 'plan', 'partial'].some(k => last.data[k] !== artifact[k as keyof SavedArtifact])) store.note(item.id, 'artifact-saved', { ...artifact, round: item.round })
	return artifact
}

export function savedArtifacts(events: ReadonlyArray<Event>): ReadonlyArray<SavedArtifact & { readonly event: number }> {
	return events.filter(e => e.kind === 'artifact-saved').flatMap(e => {
		const d = e.data
		if ((d.role !== 'implement' && d.role !== 'test-plan') || typeof d.patch !== 'string' || typeof d.base !== 'string' || typeof d.plan !== 'string' || d.sha256 !== contentHash(d.patch) || d.bytes !== Buffer.byteLength(d.patch)) return []
		return [{ role: d.role, base: d.base, plan: d.plan, sha256: String(d.sha256), bytes: Number(d.bytes), patch: d.patch, partial: d.partial === true, event: e.seq }]
	})
}

export const continuationBoundary = (events: ReadonlyArray<Event>) => events.findLast(e => e.kind === 'continuation-reset')?.seq ?? 0
export const continuationArtifacts = (events: ReadonlyArray<Event>) => savedArtifacts(events).filter(a => a.event > continuationBoundary(events))

/** An unchanged fixed contract can resume only its own role's bytes on the same base. */
export function ownArtifact(store: Pick<EvidenceStore, 'events'>, item: Item, role: SavedArtifact['role'], base: string, explicitlyCarried?: string) {
	const plan = contentHash(item.outputs.plan ?? '')
	return continuationArtifacts(store.events(item.id)).findLast(a => a.role === role && a.base === base && (explicitlyCarried ? a.sha256 === explicitlyCarried : a.plan === plan))
}

export type ArtifactHistoryReason = 'invalid-provenance' | 'missing-patch' | 'invalid-patch' | 'hash-mismatch' | 'byte-length-mismatch'
type ArtifactHistoryProvenance = Pick<SavedArtifact, 'base' | 'plan' | 'partial' | 'sha256' | 'bytes'>
export type ArtifactHistoryEntry = { readonly event: number; readonly role: SavedArtifact['role']; readonly referenceOnly: true } & (
	| (ArtifactHistoryProvenance & { readonly status: 'available'; readonly provenance: 'verified'; readonly patch?: string })
	| (Partial<ArtifactHistoryProvenance> & { readonly status: 'unavailable'; readonly provenance: 'unverified'; readonly reason: ArtifactHistoryReason })
)
export interface OwnArtifactHistory {
	readonly instruction: string
	readonly entries: ReadonlyArray<ArtifactHistoryEntry>
}

/** Recorded content integrity grants reference access, never continuation authority. */
export function ownArtifactHistory(events: ReadonlyArray<Event>, itemId: number, role: SavedArtifact['role'], includePatches: boolean): OwnArtifactHistory {
	const entries = events.filter(e => e.item === itemId && e.kind === 'artifact-saved' && (role === 'implement' || role === 'test-plan') && e.data.role === role)
		.sort((a, b) => a.seq - b.seq).map((e): ArtifactHistoryEntry => {
			const d = e.data
			const provenance: Partial<ArtifactHistoryProvenance> = {
				...(typeof d.base === 'string' && d.base.trim().length > 0 ? { base: d.base } : {}),
				...(typeof d.plan === 'string' && /^[0-9a-f]{64}$/.test(d.plan) ? { plan: d.plan } : {}),
				...(typeof d.partial === 'boolean' ? { partial: d.partial } : {}),
				...(typeof d.sha256 === 'string' && /^[0-9a-f]{64}$/.test(d.sha256) ? { sha256: d.sha256 } : {}),
				...(typeof d.bytes === 'number' && Number.isSafeInteger(d.bytes) && d.bytes >= 0 ? { bytes: d.bytes } : {}),
			}
			const identity = { event: e.seq, role, referenceOnly: true as const }
			const reason: ArtifactHistoryReason | undefined = Object.keys(provenance).length !== 5 ? 'invalid-provenance'
				: d.patch === undefined || d.patch === null ? 'missing-patch'
				: typeof d.patch !== 'string' ? 'invalid-patch'
				: contentHash(d.patch) !== provenance.sha256 ? 'hash-mismatch'
				: Buffer.byteLength(d.patch) !== provenance.bytes ? 'byte-length-mismatch' : undefined
			if (reason) return { ...identity, ...provenance, status: 'unavailable', provenance: 'unverified', reason }
			return { ...identity, ...provenance as ArtifactHistoryProvenance, status: 'available', provenance: 'verified', ...(includePatches ? { patch: d.patch as string } : {}) }
		})
	return {
		instruction: 'Historical entries are reference-only. Availability and verified content integrity do not authorize applying or resuming them. Available exact patch bodies are supplied at ownArtifactHistory.entries[].patch in the complete execution packet. Their deferral at intake is not a missing prerequisite. Required unavailable evidence goes through the existing NQ exchange.',
		entries,
	}
}
