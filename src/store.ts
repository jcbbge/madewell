// The one record. Every work item, for every project, lives in one SQLite file; every change to an
// item is saved together with an event describing it. Nothing else holds state. The record is also the
// trace: each call keeps its tool events, tokens and rule-break flags, and the glass beside the store is
// rewritten after every saved transition. With MW_TELEMETRY set, every event and call also goes to this
// machine's telemetry file, written only once its transaction commits.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Context, Effect, Layer } from 'effect'
import type { Card } from './cards.ts'
import { MadeWellError, type Next } from './errors.ts'
import type { Check, Cause, Job, Maker } from './lane.ts'
import type { Resource, TeardownRecord } from './workspace.ts'
import { replayHtml, snapshot } from './replay.ts'
import { debugLayer, flagsFor, telemetry, tokensOf, toolEvents, type Facts, type Flag, type Tokens, type ToolEvent } from './telemetry.ts'

type Status = 'candidate' | 'queued' | 'running' | 'waiting-quota' | 'waiting-prerequisite' | 'held' | 'shipped' | 'discovered' | 'dropped'

export interface Hold {
	readonly code: string
	readonly message: string
	readonly context: Record<string, unknown>
	/** Commands that resolve it, when the failure that caused it named them. */
	readonly next?: ReadonlyArray<Next>
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

/** One job's hand-off and attempts. The item carries one at its top level; after planning it carries two, one per maker. */
export interface Track {
	readonly from: Origin
	readonly exchange?: Exchange
	/** Consecutive failed launches of the job. */
	readonly launches: number
	/** Set after a quota swap: the next card is picking up an interrupted job. */
	readonly pickingUp?: string
	/** Why Made Well refused the job's last answer; the next call is told. */
	readonly rejected?: string
	/** The maker's deliverable is accepted. */
	readonly done?: boolean
}

/** One check's run by Made Well, threaded to the plan's done-when item. */
export interface CheckResult extends Check {
	readonly exitCode: number
	readonly ms: number
	readonly output: string
}

/** Something a job provisioned, and its teardown once it ran. */
export interface Provisioned extends Resource {
	readonly job: Job
	readonly torn?: TeardownRecord
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
	readonly rejected?: string
	/** The product repo's branch and its commit when the item (or its current round) started. */
	readonly base?: { readonly ref: string; readonly commit: string }
	/** After planning: the implementer's and the test architect's tracks, run in parallel. */
	readonly split?: Partial<Record<Maker, Track>>
	/** The implementer's change: its files; the patch lives in Made Well's home. */
	readonly change?: { readonly files: ReadonlyArray<string> }
	/** The test architect's checks; their files live in Made Well's home until the item ships. */
	readonly checks?: { readonly checks: ReadonlyArray<Check>; readonly files: ReadonlyArray<string> }
	/** Made Well's run of the checks: the main commit it ran on, the commit it built there, and every result. */
	readonly verification?: { readonly on: string; readonly commit: string; readonly results: ReadonlyArray<CheckResult>; readonly passed: boolean }
	/** The verified commit Made Well brought onto the branch. */
	readonly merged?: { readonly ref: string; readonly commit: string }
	readonly provisioned?: ReadonlyArray<Provisioned>
	readonly parent?: number
	/** For a candidate: the discovery run that found it. */
	readonly discovery?: number
	readonly kind?: 'feature' | 'fix' | 'chore'
	readonly waitsOn?: number
	/** For a candidate: the items it builds on. It starts once they have shipped. */
	readonly after?: ReadonlyArray<number>
	readonly resetsAt?: number
	readonly hold?: Hold
	readonly shipped?: { readonly command: string; readonly output: string; readonly main?: string }
	readonly created: string
	readonly updated: string
}

/** `item` 0 is the runner itself: its start and stop. A runner lost mid-item is recorded against that item. */
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
	/** rejected: the harness answered, but the engine refused the answer (for example, malformed). */
	readonly outcome: 'ok' | 'limit' | 'error' | 'rejected'
	readonly output: string | null
	readonly error: string | null
	readonly raw: string | null
	readonly started: string
	readonly ms: number
	/** Read from `raw` when the call is recorded. */
	readonly tools: ReadonlyArray<ToolEvent>
	readonly tokens: Tokens | null
	/** The facts the engine passed in, and the rule breaks they and the stream show. */
	readonly facts: Facts | null
	readonly flags: ReadonlyArray<Flag>
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
		CREATE TABLE IF NOT EXISTS tool_events (call INTEGER NOT NULL, seq INTEGER NOT NULL, tool TEXT NOT NULL, digest TEXT NOT NULL, input_bytes INTEGER NOT NULL, output_bytes INTEGER NOT NULL, tokens INTEGER, at TEXT, ms INTEGER, error INTEGER NOT NULL, PRIMARY KEY (call, seq));
		CREATE TABLE IF NOT EXISTS accounts (account TEXT PRIMARY KEY, resets_at INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS runner (id INTEGER PRIMARY KEY CHECK (id = 1), pid INTEGER NOT NULL, since TEXT NOT NULL, item INTEGER);`)
	const sink = telemetry(path)
	let pending: [string, Record<string, unknown>][] | undefined
	/** Inside a transaction, held until it commits; a rolled-back record never reaches the telemetry file. */
	const emit = (t: string, record: Record<string, unknown>) => (pending ? pending.push([t, record]) : sink?.write(t, record))
	const tx = <T>(fn: () => T): T => {
		db.exec('BEGIN IMMEDIATE')
		pending = []
		try {
			const r = fn()
			db.exec('COMMIT')
			const committed = pending
			pending = undefined
			for (const [t, record] of committed) sink?.write(t, record)
			return r
		} catch (e) {
			pending = undefined
			db.exec('ROLLBACK')
			throw e
		}
	}
	const glass = join(dirname(path), 'glass.html')
	const insertTools = (call: number, tools: ToolEvent[]) => {
		const insert = db.prepare('INSERT INTO tool_events (call, seq, tool, digest, input_bytes, output_bytes, tokens, at, ms, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
		for (const t of tools) insert.run(call, t.seq, t.tool, t.digest, t.inputBytes, t.outputBytes, t.tokens, t.at, t.ms, t.error ? 1 : 0)
	}
	tx(() => {
		const columns = (db.prepare('PRAGMA table_info(calls)').all() as { name: string }[]).map((c) => c.name)
		if (columns.includes('tokens')) return
		db.exec("ALTER TABLE calls ADD COLUMN tokens TEXT; ALTER TABLE calls ADD COLUMN facts TEXT; ALTER TABLE calls ADD COLUMN flags TEXT NOT NULL DEFAULT '[]'")
		// Calls recorded before the trace existed: read their tool events and tokens from their raw streams once.
		for (const c of db.prepare('SELECT id, card, raw FROM calls WHERE raw IS NOT NULL').all() as { id: number; card: string; raw: string }[]) {
			const harness = (JSON.parse(c.card) as Card).harness
			const tokens = tokensOf(harness, c.raw)
			db.prepare('UPDATE calls SET tokens = ? WHERE id = ?').run(tokens && JSON.stringify(tokens), c.id)
			insertTools(c.id, toolEvents(harness, c.raw))
		}
	})
	const event = (item: number, kind: string, data: Record<string, unknown>) => {
		const at = new Date().toISOString()
		const { lastInsertRowid } = db.prepare('INSERT INTO events (item, at, kind, data) VALUES (?, ?, ?, ?)').run(item, at, kind, JSON.stringify(data))
		emit('event', { seq: Number(lastInsertRowid), item, workspace: read(item)?.workspace ?? null, at, kind, data })
	}
	/** The glass is a view: rewritten after each transition, never read back. A failed write never stops the work. An in-memory store has none: its glass would land in the working directory, often a product repo. */
	const view = () => {
		if (path === ':memory:') return
		try {
			writeFileSync(`${glass}.tmp`, replayHtml(snapshot(store)))
			renameSync(`${glass}.tmp`, glass)
		} catch {}
	}
	const read = (id: number): Item | undefined => {
		const row = db.prepare('SELECT doc FROM items WHERE id = ?').get(id) as { doc: string } | undefined
		return row && JSON.parse(row.doc)
	}

	const store = {
		path,
		glass,
		create(fields: Pick<Item, 'title' | 'objective' | 'source' | 'workspace'> & Partial<Pick<Item, 'job' | 'parent' | 'from' | 'rework' | 'status' | 'discovery' | 'kind' | 'outputs' | 'after'>>): Item {
			const created = tx(() => {
				const now = new Date().toISOString()
				const { lastInsertRowid } = db.prepare('INSERT INTO items (doc) VALUES (?)').run('{}')
				const item: Item = { job: 'ideate', from: { kind: 'dispatcher' }, status: 'queued', outputs: {}, ...fields, id: Number(lastInsertRowid), round: 1, corrections: 0, launches: 0, created: now, updated: now }
				db.prepare('UPDATE items SET doc = ? WHERE id = ?').run(JSON.stringify(item), item.id)
				event(item.id, 'created', { title: item.title, job: item.job, status: item.status, parent: item.parent ?? null, discovery: item.discovery ?? null })
				return item
			})
			view()
			return created
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
			view()
			return next
		},
		list(): Item[] {
			return (db.prepare('SELECT doc FROM items ORDER BY id').all() as { doc: string }[]).map((r) => JSON.parse(r.doc))
		},
		events(id: number): Event[] {
			return (db.prepare('SELECT * FROM events WHERE item = ? ORDER BY seq').all(id) as { seq: number; item: number; at: string; kind: string; data: string }[]).map((r) => ({ ...r, data: JSON.parse(r.data) }))
		},
		/** Records one call with its tool events, tokens and rule-break flags, read from its raw stream and the engine's facts. The harness version goes only to telemetry. */
		recordCall(call: Omit<Call, 'id' | 'tools' | 'tokens' | 'facts' | 'flags'> & { readonly harnessVersion?: string | null }, facts?: Facts): number {
			const tools = toolEvents(call.card.harness, call.raw)
			const tokens = tokensOf(call.card.harness, call.raw)
			const flags = facts ? flagsFor(facts, { tools, tokens, ms: call.ms, output: call.output }) : []
			return tx(() => {
				const id = Number(db
					.prepare('INSERT INTO calls (item, kind, job, profile, card, system, prompt, outcome, output, error, raw, started, ms, tokens, facts, flags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
					.run(call.item, call.kind, call.job, call.profile, JSON.stringify(call.card), call.system, call.prompt, call.outcome, call.output, call.error, call.raw, call.started, call.ms, tokens && JSON.stringify(tokens), facts ? JSON.stringify(facts) : null, JSON.stringify(flags)).lastInsertRowid)
				insertTools(id, tools)
				const { system, prompt, output, raw, ...summary } = call
				emit('call', { id, ...summary, workspace: read(call.item)?.workspace ?? null, tokens, flags, facts: facts ?? null, tools, system, prompt, output, raw })
				return id
			})
		},
		/** The engine refused a call's answer: the call is on the record as rejected, with the reason. */
		rejectCall(id: number, reason: string) {
			db.prepare("UPDATE calls SET outcome = 'rejected', error = ? WHERE id = ?").run(reason, id)
			emit('rejected', { call: id, at: new Date().toISOString(), reason })
		},
		/** Every call, or one item's, oldest first. */
		calls(item?: number): Call[] {
			const rows = db.prepare(`SELECT * FROM calls ${item === undefined ? '' : 'WHERE item = ?'} ORDER BY id`).all(...(item === undefined ? [] : [item])) as (Omit<Call, 'card' | 'tools' | 'tokens' | 'facts' | 'flags'> & { card: string; tokens: string | null; facts: string | null; flags: string })[]
			const tools = db.prepare('SELECT seq, tool, digest, input_bytes AS inputBytes, output_bytes AS outputBytes, tokens, at, ms, error FROM tool_events WHERE call = ? ORDER BY seq')
			return rows.map((r): Call => ({
				...r,
				card: JSON.parse(r.card),
				tokens: r.tokens ? JSON.parse(r.tokens) : null,
				facts: r.facts ? JSON.parse(r.facts) : null,
				flags: JSON.parse(r.flags),
				tools: (tools.all(r.id) as (Omit<ToolEvent, 'error'> & { error: number })[]).map((t) => ({ ...t, error: t.error === 1 })),
			}))
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
		/** One runner drives the store at a time. A dead runner's claim is taken over, and its loss recorded against the item it was on. */
		claimRunner(): Effect.Effect<void, MadeWellError> {
			return Effect.suspend(() => {
				const owner = tx(() => {
					const row = db.prepare('SELECT pid, since, item FROM runner WHERE id = 1').get() as { pid: number; since: string; item: number | null } | undefined
					if (row && row.pid !== process.pid && alive(row.pid)) return row
					if (row && row.pid !== process.pid) event(row.item ?? 0, 'runner-lost', { pid: row.pid, since: row.since, item: row.item })
					db.prepare('INSERT INTO runner (id, pid, since) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET pid = excluded.pid, since = excluded.since, item = NULL').run(process.pid, new Date().toISOString())
					event(0, 'runner-started', { pid: process.pid, ...(row && row.pid !== process.pid ? { replaced: row.pid } : {}) })
					return undefined
				})
				if (!owner) return Effect.sync(view)
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
		/**
		 * Retention: removes these items and everything recorded about them (events, calls, tool events, and the
		 * evals of those calls), with the runner's own events from before the cutoff, then gives the space back.
		 * Returns what each table lost; a dry run only counts. The caller holds the runner claim.
		 */
		prune(ids: ReadonlyArray<number>, before: string, dryRun: boolean) {
			const items = `(${ids.join(',')})`
			const calls = `(SELECT id FROM calls WHERE item IN ${items})`
			const evals = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'evals'").get() !== undefined
			// In deletion order: what a later row is found through goes last.
			const from = {
				evals: evals && `evals WHERE NOT EXISTS (SELECT 1 FROM json_each(evals.calls) j JOIN calls c ON c.id = j.value WHERE c.item NOT IN ${items})`,
				evalCalls: evals && `eval_calls WHERE call IN ${calls}`,
				toolEvents: `tool_events WHERE call IN ${calls}`,
				calls: `calls WHERE item IN ${items}`,
				events: `events WHERE item IN ${items} OR (item = 0 AND at < '${new Date(before).toISOString()}')`,
				items: `items WHERE id IN ${items}`,
			}
			const each = (sql: (table: string) => number) => Object.fromEntries(Object.entries(from).map(([k, t]) => [k, t ? sql(t) : 0])) as Record<keyof typeof from, number>
			if (dryRun) return each((t) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n)
			const removed = tx(() => {
				const r = each((t) => Number(db.prepare(`DELETE FROM ${t}`).run().changes))
				if (Object.values(r).some(Boolean)) event(0, 'pruned', { before, ...r, ids })
				return r
			})
			view()
			// Deleted rows leave free pages; VACUUM gives them back, and the checkpoint empties the WAL it went through.
			if ((db.prepare('PRAGMA freelist_count').get() as { freelist_count: number }).freelist_count) db.exec('VACUUM')
			db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
			return removed
		},
		/** The live runner's claim, or null when there is none or its process is gone. Only reads: the next runner to claim records the loss. */
		runner() {
			const row = db.prepare('SELECT pid, since, item FROM runner WHERE id = 1').get() as { pid: number; since: string; item: number | null } | undefined
			return row && alive(row.pid) ? row : null
		},
		runnerOn(item: number | null) {
			db.prepare('UPDATE runner SET item = ? WHERE id = 1 AND pid = ?').run(item, process.pid)
		},
		releaseRunner() {
			tx(() => {
				if (db.prepare('DELETE FROM runner WHERE id = 1 AND pid = ?').run(process.pid).changes) event(0, 'runner-stopped', { pid: process.pid })
			})
			view()
		},
		close() {
			db.close()
		},
	}
	return store
}

export class Store extends Context.Service<Store, ReturnType<typeof openStore>>()('madewell/Store') {}

/** The store, and its spans: to the telemetry file with MW_TELEMETRY, else with MW_DEBUG=1 to debug.jsonl beside the store. */
export const storeLayer = (path = defaultStorePath()) =>
	Layer.mergeAll(
		Layer.effect(Store, Effect.acquireRelease(Effect.sync(() => openStore(path)), (s) => Effect.sync(() => s.close()))),
		debugLayer(join(dirname(path), 'debug.jsonl'), telemetry(path)),
	)
