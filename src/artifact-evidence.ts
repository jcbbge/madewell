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
	const last = store.events(item.id).findLast(e => e.kind === 'artifact-saved' && e.data.role === role)
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

/** An unchanged fixed contract can resume only its own role's bytes on the same base. */
export function ownArtifact(store: Pick<EvidenceStore, 'events'>, item: Item, role: SavedArtifact['role'], base: string, explicitlyCarried?: string) {
	const plan = contentHash(item.outputs.plan ?? '')
	return savedArtifacts(store.events(item.id)).findLast(a => a.role === role && a.base === base && (explicitlyCarried ? a.sha256 === explicitlyCarried : a.plan === plan))
}
