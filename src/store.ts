// The one record. Every work item, for every project, lives in one SQLite file; every change to an
// item is saved together with an event describing it. Nothing else holds state.
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Context, Effect, Layer } from 'effect'
import type { Card } from './cards.ts'
import { MadeWellError } from './errors.ts'
import type { Cause, Job } from './lane.ts'

export type Status = 'candidate' | 'queued' | 'running' | 'waiting-quota' | 'waiting-prerequisite' | 'held' | 'shipped' | 'discovered'

export interface Hold {
	readonly code: string
	readonly message: string
	readonly context: Record<string, unknown>
}

/** Who handed the work to the current job: the dispatcher (the operator's request), an earlier job, or the operator. */
export type Origin = { readonly kind: 'dispatcher' } | { readonly kind: 'job'; readonly job: Job } | { readonly kind: 'operator' }

/** One NQ turn: the receiver's questions, then the originator's (or operator's) answer. */
export interface Turn {
	readonly understanding: string
	readonly questions: ReadonlyArray<string>
	readonly answer?: string
	readonly by?: 'originator' | 'operator'
}

/** The NQ exchange for the current hand-off. The receiving agent executes only once it is clear. */
export interface Exchange {
	readonly from: Origin
	readonly handoff: string
	readonly status: 'awaiting-receiver' | 'awaiting-originator' | 'clear'
	readonly turns: ReadonlyArray<Turn>
	readonly understanding?: string
	readonly notes?: ReadonlyArray<string>
	/** The receiver's card. A different card is a different agent, and goes through NQ again. */
	readonly card?: Card
}

export interface Item {
	readonly id: number
	readonly title: string
	readonly objective: string
	readonly source: string
	readonly workspace: string
	readonly status: Status
	/** The job that runs next. */
	readonly job: Job
	readonly round: number
	readonly corrections: number
	/** Consecutive failed launches of the current job. */
	readonly launches: number
	readonly from: Origin
	/** The NQ exchange of the current hand-off; absent until the hand-off starts. */
	readonly exchange?: Exchange
	/** Accepted outputs of the current round, by job: each job's packet. */
	readonly outputs: Partial<Record<Job, string>>
	/** An open failure waiting for the arbiter. */
	readonly failure?: string
	/** The arbiter's (or operator's) ruling, assigned to the job it routed the work back to. */
	readonly rework?: { readonly cause: Cause; readonly answer: string }
	/** Set after a quota swap: the next card is picking up an interrupted job. */
	readonly pickingUp?: string
	readonly parent?: number
	/** For a candidate: the discovery run that found it. */
	readonly discovery?: number
	readonly kind?: 'feature' | 'fix' | 'chore'
	readonly waitsOn?: number
	readonly resetsAt?: number
	readonly hold?: Hold
	readonly shipped?: { readonly command: string; readonly output: string }
	readonly created: string
	readonly updated: string
}

export interface Event {
	readonly seq: number
	readonly item: number
	readonly at: string
	readonly kind: string
	readonly data: Record<string, unknown>
}

/** One agent call, recorded in full: the glass the whole flow is replayed through. */
export interface Call {
	readonly id: number
	readonly item: number
	readonly kind: string
	readonly job: string
	readonly profile: string
	readonly card: Card
	readonly system: string
	readonly prompt: string
	readonly outcome: 'ok' | 'limit' | 'error'
	readonly output: string | null
	readonly error: string | null
	readonly raw: string | null
	readonly started: string
	readonly ms: number
}

export const defaultStorePath = () => process.env.MW_STORE ?? join(process.env.MW_HOME ?? join(homedir(), '.local', 'share', 'madewell'), 'madewell.db')

const alive = (pid: number) => {
	try {
		process.kill(pid, 0)
		return true
	} catch (e) {
		return (e as NodeJS.ErrnoException).code !== 'ESRCH'
	}
}

export function openStore(path: string) {
	mkdirSync(dirname(path), { recursive: true })
	const db = new DatabaseSync(path)
	db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
		CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, doc TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, item INTEGER NOT NULL, at TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS calls (id INTEGER PRIMARY KEY AUTOINCREMENT, item INTEGER NOT NULL, kind TEXT NOT NULL, job TEXT NOT NULL, profile TEXT NOT NULL, card TEXT NOT NULL, system TEXT NOT NULL, prompt TEXT NOT NULL, outcome TEXT NOT NULL, output TEXT, error TEXT, raw TEXT, started TEXT NOT NULL, ms INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS accounts (account TEXT PRIMARY KEY, resets_at INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS runner (id INTEGER PRIMARY KEY CHECK (id = 1), pid INTEGER NOT NULL, since TEXT NOT NULL, item INTEGER);`)

	const tx = <T>(fn: () => T): T => {
		db.exec('BEGIN IMMEDIATE')
		try {
			const r = fn()
			db.exec('COMMIT')
			return r
		} catch (e) {
			db.exec('ROLLBACK')
			throw e
		}
	}
	const event = (item: number, kind: string, data: Record<string, unknown>) =>
		db.prepare('INSERT INTO events (item, at, kind, data) VALUES (?, ?, ?, ?)').run(item, new Date().toISOString(), kind, JSON.stringify(data))
	const read = (id: number): Item | undefined => {
		const row = db.prepare('SELECT doc FROM items WHERE id = ?').get(id) as { doc: string } | undefined
		return row && JSON.parse(row.doc)
	}

	return {
		path,
		create(fields: Pick<Item, 'title' | 'objective' | 'source' | 'workspace'> & Partial<Pick<Item, 'job' | 'parent' | 'from' | 'rework' | 'status' | 'discovery' | 'kind' | 'outputs'>>): Item {
			return tx(() => {
				const now = new Date().toISOString()
				const { lastInsertRowid } = db.prepare('INSERT INTO items (doc) VALUES (?)').run('{}')
				const item: Item = { job: 'ideate', from: { kind: 'dispatcher' }, status: 'queued', outputs: {}, ...fields, id: Number(lastInsertRowid), round: 1, corrections: 0, launches: 0, created: now, updated: now }
				db.prepare('UPDATE items SET doc = ? WHERE id = ?').run(JSON.stringify(item), item.id)
				event(item.id, 'created', { title: item.title, job: item.job, status: item.status, parent: item.parent ?? null, discovery: item.discovery ?? null })
				return item
			})
		},
		get(id: number) {
			return read(id)
		},
		/** Saves the new state of an item together with the event that explains it. */
		save(item: Item, kind: string, data: Record<string, unknown> = {}): Item {
			const next = { ...item, updated: new Date().toISOString() }
			tx(() => {
				db.prepare('UPDATE items SET doc = ? WHERE id = ?').run(JSON.stringify(next), item.id)
				event(item.id, kind, data)
			})
			return next
		},
		list(): Item[] {
			return (db.prepare('SELECT doc FROM items ORDER BY id').all() as { doc: string }[]).map((r) => JSON.parse(r.doc))
		},
		events(id: number): Event[] {
			return (db.prepare('SELECT * FROM events WHERE item = ? ORDER BY seq').all(id) as { seq: number; item: number; at: string; kind: string; data: string }[]).map((r) => ({ ...r, data: JSON.parse(r.data) }))
		},
		recordCall(call: Omit<Call, 'id'>): number {
			const { lastInsertRowid } = db
				.prepare('INSERT INTO calls (item, kind, job, profile, card, system, prompt, outcome, output, error, raw, started, ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
				.run(call.item, call.kind, call.job, call.profile, JSON.stringify(call.card), call.system, call.prompt, call.outcome, call.output, call.error, call.raw, call.started, call.ms)
			return Number(lastInsertRowid)
		},
		calls(): Call[] {
			return (db.prepare('SELECT * FROM calls ORDER BY id').all() as (Omit<Call, 'card'> & { card: string })[]).map((r) => ({ ...r, card: JSON.parse(r.card) }))
		},
		allEvents(): Event[] {
			return (db.prepare('SELECT * FROM events ORDER BY seq').all() as { seq: number; item: number; at: string; kind: string; data: string }[]).map((r) => ({ ...r, data: JSON.parse(r.data) }))
		},
		exhausted(): Record<string, number> {
			return Object.fromEntries((db.prepare('SELECT account, resets_at FROM accounts').all() as { account: string; resets_at: number }[]).map((r) => [r.account, r.resets_at]))
		},
		markExhausted(account: string, resetsAt: number) {
			db.prepare('INSERT INTO accounts (account, resets_at) VALUES (?, ?) ON CONFLICT (account) DO UPDATE SET resets_at = MAX(resets_at, excluded.resets_at)').run(account, resetsAt)
		},
		/** One runner drives the store at a time. A dead runner's claim is taken over. */
		claimRunner(): Effect.Effect<void, MadeWellError> {
			return Effect.suspend(() => {
				const owner = tx(() => {
					const row = db.prepare('SELECT pid, since, item FROM runner WHERE id = 1').get() as { pid: number; since: string; item: number | null } | undefined
					if (row && row.pid !== process.pid && alive(row.pid)) return row
					db.prepare('INSERT INTO runner (id, pid, since) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET pid = excluded.pid, since = excluded.since, item = NULL').run(process.pid, new Date().toISOString())
					return undefined
				})
				if (!owner) return Effect.void
				const busy = owner.item === null ? undefined : read(owner.item)
				return Effect.fail(new MadeWellError({
					code: 'store_locked',
					message: 'Another live runner owns this Made Well store.',
					context: { store: path, owner: { pid: owner.pid, since: owner.since, item: busy ? { id: busy.id, title: busy.title, job: busy.job, status: busy.status } : null } },
					cause: 'One runner drives a store at a time, so two runners never work the same item.',
					next: [
						{ run: busy ? `mw status ${busy.id}` : 'mw status', why: 'see what the running owner is doing; queued work will reach it automatically' },
						{ run: `kill ${owner.pid} && mw run`, why: 'only if that runner is hung: work resumes at the job that was interrupted' },
					],
				}))
			})
		},
		runnerOn(item: number | null) {
			db.prepare('UPDATE runner SET item = ? WHERE id = 1 AND pid = ?').run(item, process.pid)
		},
		releaseRunner() {
			db.prepare('DELETE FROM runner WHERE id = 1 AND pid = ?').run(process.pid)
		},
		close() {
			db.close()
		},
	}
}

export class Store extends Context.Service<Store, ReturnType<typeof openStore>>()('madewell/Store') {}

export const storeLayer = (path = defaultStorePath()) =>
	Layer.effect(Store, Effect.acquireRelease(Effect.sync(() => openStore(path)), (s) => Effect.sync(() => s.close())))
