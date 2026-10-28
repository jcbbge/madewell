// The one record. Every work item, for every project, lives in one SQLite file; every change to an
// item is saved together with an event describing it. Nothing else holds state. The record is also the
// trace: each call keeps its tool events, tokens and rule-break flags, and the console reads it live.
// With MW_TELEMETRY set, every event and call also goes to this machine's telemetry file, written only
// once its transaction commits.
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Context, Effect, Layer } from 'effect'
import type { Card } from './cards.ts'
import { MadeWellError, type Next } from './errors.ts'
import { laneOf, type Check, type Cause, type Job, type Maker, type Pack } from './lane.ts'
import type { Resource, TeardownRecord } from './workspace.ts'
import { debugLayer, flagsFor, telemetry, tokensOf, toolEvents, type Facts, type Flag, type Tokens, type ToolEvent } from './telemetry.ts'
import type { QaAccepted, QaCase, QaCaseRevision, QaCommand, QaConflict, QaLink, QaLinkView, QaObservation, QaOutcome, QaQuery, QaReadResult, QaRun, QaSnapshot } from './qa.ts'

type Status = 'candidate' | 'queued' | 'running' | 'waiting-quota' | 'waiting-prerequisite' | 'held' | 'paused' | 'shipped' | 'completed' | 'discovered' | 'dropped'

/**
 * How involved the operator is (FOUNDATION, ruling 17). full: no stops, and what would go to the operator is decided by the
 * delegating agent by the rubric. checkpoints: stops after discovery and before each item ships. steps: also between the
 * cartridges of a loop. Absent means checkpoints.
 */
export type Autonomy = 'full' | 'checkpoints' | 'steps'
/** New operators start watching every checkpoint; they hand over more once they trust the machine (ruling 17). */
export const DEFAULT_AUTONOMY: Autonomy = 'checkpoints'

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
	readonly outputs: Readonly<Partial<Record<Job, string>>>
	/** An open failure waiting for the arbiter. */
	readonly failure?: string
	/** The arbiter's (or operator's) ruling, assigned to the job it routed the work back to. */
	readonly rework?: { readonly cause: Cause; readonly answer: string }
	/** Set after a quota swap: the next card is picking up an interrupted job. */
	readonly pickingUp?: string
	readonly rejected?: string
	/** The product repo's branch and its commit when the item (or its current round) started. */
	readonly base?: { readonly ref: string; readonly commit: string }
	/** The project's conventions when the base was recorded: the plan must hold the change to each one. */
	readonly conventions?: ReadonlyArray<string>
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
	/** The cartridge pack it runs, from its project; absent for the default software pack. Candidates and fix items inherit it. */
	readonly pack?: Pack
	/** Function packs retain their exact accepted prefix and apply updates only between nodes. */
	readonly flow?: { readonly loop: 'discovery' | 'delivery'; readonly accepted: ReadonlyArray<string>; readonly update?: number }
	readonly completion?: { readonly output: Record<string, unknown>; readonly nodes: number }
	/** How involved the operator is with it; candidates and fix items inherit it. Absent means checkpoints. */
	readonly autonomy?: Autonomy
	/** The checkpoint the operator last let it pass, so it does not stop there twice. */
	readonly passed?: string
	/** The operator's word at a checkpoint, for the next hand-off. */
	readonly steer?: string
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

/** One agent call, recorded in full: brief, packet, answer and raw stream, for replay, export and evals. */
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

/** A call without its texts, with their sizes: what a live view polls. */
export type CallHead = Pick<Call, 'id' | 'item' | 'kind' | 'job' | 'profile' | 'card' | 'outcome' | 'error' | 'started' | 'ms' | 'tokens' | 'flags'> & {
	readonly systemBytes: number
	readonly packetBytes: number
	readonly answerBytes: number | null
	readonly rawBytes: number | null
	readonly toolCount: number
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

const qaFailure = (status: number, reason: string, facts: Record<string, unknown> = {}) => new MadeWellError({
	code: 'qa_request', message: `Manual QA request refused: ${reason}. Keep the draft and retry identity until the outcome is known.`, context: { status, reason, facts },
	next: [{ run: typeof facts.refresh === 'string' ? facts.refresh : 'mw qa-cases', why: 'inspect saved history before a new request; conflicts require explicit review and a new request ID' }],
})
const qaGuard = <A>(run: () => A): A => {
	try { return run() } catch (cause) {
		if (cause instanceof MadeWellError) throw cause
		const busy = cause instanceof Error && /(?:SQLITE_BUSY|database is locked|database table is locked)/i.test(cause.message)
		throw qaFailure(busy ? 503 : 500, busy ? 'store_busy' : 'storage_failed')
	}
}
const qaCanonical = (value: unknown): unknown => Array.isArray(value) ? value.map(qaCanonical) : value && typeof value === 'object'
	? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, qaCanonical(child)])) : value

export function openStore(path: string) {
	mkdirSync(dirname(path), { recursive: true })
	const db = new DatabaseSync(path)
	db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
		CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, doc TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, item INTEGER NOT NULL, at TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS operator_requests (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, receipt TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS calls (id INTEGER PRIMARY KEY AUTOINCREMENT, item INTEGER NOT NULL, kind TEXT NOT NULL, job TEXT NOT NULL, profile TEXT NOT NULL, card TEXT NOT NULL, system TEXT NOT NULL, prompt TEXT NOT NULL, outcome TEXT NOT NULL, output TEXT, error TEXT, raw TEXT, started TEXT NOT NULL, ms INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS tool_events (call INTEGER NOT NULL, seq INTEGER NOT NULL, tool TEXT NOT NULL, digest TEXT NOT NULL, input_bytes INTEGER NOT NULL, output_bytes INTEGER NOT NULL, tokens INTEGER, at TEXT, ms INTEGER, error INTEGER NOT NULL, PRIMARY KEY (call, seq));
		CREATE TABLE IF NOT EXISTS accounts (account TEXT PRIMARY KEY, resets_at INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS runner (id INTEGER PRIMARY KEY CHECK (id = 1), pid INTEGER NOT NULL, since TEXT NOT NULL, item INTEGER);`)
	qaGuard(() => {
		// Refuse an incompatible existing table; never backfill, drop or rewrite QA history.
		const tables = {
			qa_cases: 'id INTEGER PRIMARY KEY AUTOINCREMENT, work_item INTEGER NOT NULL, workspace TEXT NOT NULL, current_revision INTEGER NOT NULL, created_at TEXT NOT NULL',
			qa_case_revisions: 'case_id INTEGER NOT NULL, revision INTEGER NOT NULL, doc TEXT NOT NULL, PRIMARY KEY(case_id,revision)',
			qa_runs: 'id INTEGER PRIMARY KEY AUTOINCREMENT, work_item INTEGER NOT NULL, workspace TEXT NOT NULL, doc TEXT NOT NULL',
			qa_observations: 'id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER NOT NULL, case_id INTEGER NOT NULL, case_revision INTEGER NOT NULL, entry_revision INTEGER NOT NULL, doc TEXT NOT NULL, UNIQUE(run_id,case_id,entry_revision)',
			qa_requests: 'id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, outcome TEXT NOT NULL',
		}
		for (const [name, definition] of Object.entries(tables)) {
			const expected = definition.split(', ').filter((part) => !part.startsWith('PRIMARY ') && !part.startsWith('UNIQUE(')).map((part) => {
				const [column, type] = part.split(' ')
				return { name: column, type, notnull: part.includes('NOT NULL') ? 1 : 0, pk: name === 'qa_case_revisions' ? ['case_id', 'revision'].indexOf(column!) + 1 : part.includes('PRIMARY KEY') ? 1 : 0 }
			})
			const existing = db.prepare(`PRAGMA table_info(${name})`).all() as { name: string; type: string; notnull: number; pk: number }[]
			if (existing.length && JSON.stringify(existing.map(({ name, type, notnull, pk }) => ({ name, type: type.toUpperCase(), notnull, pk }))) !== JSON.stringify(expected)) throw qaFailure(500, 'storage_failed', { table: name, reason: 'incompatible_schema; stop for a migration brief' })
			if (existing.length && name === 'qa_observations') {
				const indexes = db.prepare('PRAGMA index_list(qa_observations)').all() as { name: string; unique: number }[]
				const unique = indexes.some((index) => index.unique && JSON.stringify((db.prepare('SELECT name FROM pragma_index_info(?) ORDER BY seqno').all(index.name) as { name: string }[]).map((c) => c.name)) === JSON.stringify(['run_id', 'case_id', 'entry_revision']))
				if (!unique) throw qaFailure(500, 'storage_failed', { table: name, reason: 'incompatible_schema; missing entry uniqueness' })
			}
		}
		db.exec('BEGIN IMMEDIATE')
		try {
			for (const [name, definition] of Object.entries(tables)) db.exec(`CREATE TABLE IF NOT EXISTS ${name} (${definition})`)
			db.exec('CREATE INDEX IF NOT EXISTS qa_cases_work ON qa_cases(work_item); CREATE INDEX IF NOT EXISTS qa_runs_work ON qa_runs(work_item); CREATE INDEX IF NOT EXISTS qa_observations_entry ON qa_observations(run_id,case_id,id); COMMIT')
		} catch (cause) { db.exec('ROLLBACK'); throw cause }
	})
	const sink = telemetry(path)
	let pending: [string, Record<string, unknown>][] | undefined
	/** Inside a transaction, held until it commits; a rolled-back record never reaches the telemetry file. */
	const emit = (t: string, record: Record<string, unknown>) => (pending ? pending.push([t, record]) : sink?.write(t, record))
	const tx = <T>(fn: () => T): T => {
		// A synchronous operator command can create/save several records and its receipt atomically.
		if (pending) return fn()
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
	const event = (item: number, kind: string, data: Record<string, unknown>, at = new Date().toISOString()) => {
		const { lastInsertRowid } = db.prepare('INSERT INTO events (item, at, kind, data) VALUES (?, ?, ?, ?)').run(item, at, kind, JSON.stringify(data))
		emit('event', { seq: Number(lastInsertRowid), item, workspace: read(item)?.workspace ?? null, at, kind, data })
		return Number(lastInsertRowid)
	}
	const read = (id: number): Item | undefined => {
		const row = db.prepare('SELECT doc FROM items WHERE id = ?').get(id) as { doc: string } | undefined
		return row && JSON.parse(row.doc)
	}

	const qaCaseRow = (caseId: number): QaCase => {
		const row = db.prepare('SELECT id, work_item AS workItem, workspace, current_revision AS currentRevision, created_at AS createdAt FROM qa_cases WHERE id = ?').get(caseId) as QaCase | undefined
		if (!row) throw qaFailure(404, 'not_found', { caseId, refresh: 'mw qa-cases' })
		return { ...row }
	}
	const qaRevisionRow = (caseId: number, revision: number): QaCaseRevision => {
		const row = db.prepare('SELECT doc FROM qa_case_revisions WHERE case_id = ? AND revision = ?').get(caseId, revision) as { doc: string } | undefined
		if (!row) throw qaFailure(404, 'not_found', { caseId, revision, refresh: `mw qa-case ${caseId}` })
		return JSON.parse(row.doc)
	}
	const qaRunRow = (runId: number): QaRun => {
		const row = db.prepare('SELECT doc FROM qa_runs WHERE id = ?').get(runId) as { doc: string } | undefined
		if (!row) throw qaFailure(404, 'not_found', { runId, refresh: 'mw qa-runs' })
		return JSON.parse(row.doc)
	}
	const qaHistory = (runId: number, caseId: number): QaObservation[] => (db.prepare('SELECT doc FROM qa_observations WHERE run_id = ? AND case_id = ? ORDER BY id').all(runId, caseId) as { doc: string }[]).map((r) => JSON.parse(r.doc))
	const qaEntry = (run: QaRun, caseId: number) => {
		const pin = run.cases.find((p) => p.caseId === caseId)
		if (!pin) throw qaFailure(409, 'case_not_in_run', { runId: run.id, caseId, refresh: `mw qa-run ${run.id}` })
		return pin
	}
	const qaAnchor = (workItem: number, workspace: string) => {
		const item = read(workItem)
		if (!item) throw new MadeWellError({ code: 'item_not_found', message: `No work item #${workItem}. Select an existing work anchor; QA never creates one.`, context: { id: workItem }, next: [{ run: 'mw status', why: 'select existing work or separately use the authorized work interface' }] })
		if (item.workspace !== workspace) throw qaFailure(409, 'workspace_mismatch', { workItem, workspace, expected: item.workspace, refresh: `mw context ${workItem}` })
	}
	const qaRetained = (): number[] => (db.prepare('SELECT work_item AS id FROM qa_cases UNION SELECT work_item AS id FROM qa_runs ORDER BY id').all() as { id: number }[]).map((r) => r.id)
	const qaLinks = (): QaLink[] => (db.prepare("SELECT seq, at, data FROM events WHERE kind = 'qa-linkObservation' ORDER BY seq").all() as { seq: number; at: string; data: string }[]).map((row) => {
		const data = JSON.parse(row.data) as { requestId: string; association: Pick<QaLink, 'enteredBy' | 'source' | 'target'> }
		return { event: row.seq, at: row.at, requestId: data.requestId, ...data.association }
	})
	const qaProjection = (query: QaQuery): QaReadResult => {
		const page = <T extends { id: number }>(rows: T[], filters: { after?: number; limit?: number }) => {
			const selected = rows.filter((row) => row.id > (filters.after ?? 0))
			const items = selected.slice(0, filters.limit ?? 50)
			const hasMore = selected.length > items.length
			return { apiVersion: '1' as const, items, nextAfter: hasMore ? items.at(-1)!.id : null, hasMore }
		}
		if (query.kind === 'cases') {
			const f = query.filters
			const cases = (db.prepare('SELECT id FROM qa_cases ORDER BY id').all() as { id: number }[]).map(({ id }) => qaCaseRow(id))
			const rows = cases.filter((c) => (f.workspace === undefined || c.workspace === f.workspace) && (f.workItem === undefined || c.workItem === f.workItem)).flatMap((c) => {
				const i = qaRevisionRow(c.id, c.currentRevision).instructions
				if (f.area !== undefined && i.area !== f.area) return []
				if (f.q !== undefined && ![i.title, i.area, i.change].some((value) => value.toLowerCase().includes(f.q!.toLowerCase()))) return []
				return [{ ...c, title: i.title, area: i.area }]
			})
			return page(rows, f)
		}
		if (query.kind === 'case') { const c = qaCaseRow(query.caseId); return { apiVersion: '1', case: c, revision: qaRevisionRow(c.id, query.filters.revision ?? c.currentRevision) } }
		if (query.kind === 'runs') {
			const f = query.filters
			const runs = (db.prepare('SELECT doc FROM qa_runs ORDER BY id').all() as { doc: string }[]).map((r): QaRun => JSON.parse(r.doc))
			return page(runs.filter((r) => (f.workspace === undefined || r.workspace === f.workspace) && (f.workItem === undefined || r.workItem === f.workItem) && (f.caseId === undefined || r.cases.some((p) => p.caseId === f.caseId))).map((r) => ({ id: r.id, workItem: r.workItem, workspace: r.workspace, application: r.application, environment: r.environment, version: r.version, startedAt: r.startedAt, caseCount: r.cases.length })), f)
		}
		if (query.kind === 'export') {
			// Reuse the original seam inside this same qaRead transaction, not several public reads.
			const snapshot = qaProjection({ kind: 'snapshot', runId: query.runId }) as QaSnapshot
			const links = qaLinks()
			return { schemaVersion: 1, selection: query.selection, externalEvidence: 'unavailable-reference-only', run: snapshot.run,
				entries: snapshot.entries.filter((entry) => query.selection === 'all' || entry.status === 'failed' || entry.status === 'needs-refinement').map((entry) => {
					const c = qaCaseRow(entry.caseId)
					const conflicts = (db.prepare("SELECT seq, item, at, data FROM events WHERE kind = 'qa-conflict' AND item IN (?, ?) ORDER BY seq").all(c.workItem, snapshot.run.workItem) as { seq: number; item: number; at: string; data: string }[]).flatMap((row): QaConflict[] => {
						const data = JSON.parse(row.data) as QaConflict & { target: { runId?: number; caseId: number } }
						if (data.target.caseId !== c.id) return []
						if (data.operation === 'reviseCase' ? row.item !== c.workItem : !['observeCase', 'recordVerdict', 'linkObservation'].includes(data.operation) || row.item !== snapshot.run.workItem || data.target.runId !== snapshot.run.id) return []
						return [{ event: row.seq, workItem: row.item, at: row.at, operation: data.operation, requestId: data.requestId, runId: data.operation === 'reviseCase' ? null : snapshot.run.id, caseId: c.id, expected: data.expected, actual: data.actual, input: data.input } as QaConflict]
					})
					const views = links.filter((link) => (link.source.runId === snapshot.run.id && link.source.caseId === c.id) || (link.target.kind === 'retest' && link.target.run.id === snapshot.run.id && link.target.caseId === c.id)).map((link): QaLinkView => ({ link, targetAvailability: link.target.kind === 'reference' ? 'not-checked' : link.target.kind === 'work-item' ? read(link.target.workItem) ? 'present' : 'unavailable' : 'present' }))
					return { ...entry, case: c, currentCaseRevision: c.currentRevision, outdated: c.currentRevision !== entry.caseRevision, latestVerdictId: entry.observations.findLast((o) => o.kind === 'manual-verdict')?.id ?? null, links: views, conflicts }
				}),
			}
		}
		const run = qaRunRow(query.runId)
		if (query.kind === 'observations') {
			if (query.filters.caseId !== undefined) qaEntry(run, query.filters.caseId)
			const rows = (db.prepare('SELECT doc FROM qa_observations WHERE run_id = ? ORDER BY id').all(run.id) as { doc: string }[]).map((r): QaObservation => JSON.parse(r.doc)).filter((o) => query.filters.caseId === undefined || o.caseId === query.filters.caseId)
			return page(rows, query.filters)
		}
		const entries = run.cases.map((pin) => {
			const instructions = qaRevisionRow(pin.caseId, pin.caseRevision)
			const observations = qaHistory(run.id, pin.caseId)
			const latestVerdict = observations.findLast((o) => o.kind === 'manual-verdict')
			return { ...pin, instructions, entryRevision: observations.at(-1)?.entryRevision ?? 0, status: latestVerdict?.verdict ?? 'untested' as const, observations, latestVerdictId: latestVerdict?.id ?? null }
		})
		if (query.kind === 'snapshot') return { schemaVersion: 1, run, entries: entries.map(({ latestVerdictId: _, ...entry }) => entry) }
		return { apiVersion: '1', run, entries: entries.map(({ instructions, observations: _, ...entry }) => {
			const currentCaseRevision = qaCaseRow(entry.caseId).currentRevision
			return { ...entry, title: instructions.instructions.title, area: instructions.instructions.area, currentCaseRevision, outdated: currentCaseRevision !== entry.caseRevision, instructionsHref: `/api/v1/qa/cases/${entry.caseId}?revision=${entry.caseRevision}`, observationsHref: `/api/v1/qa/runs/${run.id}/observations?caseId=${entry.caseId}` }
		}) }
	}

	const store = {
		path,
		qaRetained,
		qaRead(query: QaQuery): QaReadResult {
			return qaGuard(() => {
				if (pending) return qaProjection(query)
				db.exec('BEGIN')
				try { const result = qaProjection(query); db.exec('COMMIT'); return result }
				catch (cause) { db.exec('ROLLBACK'); throw cause }
			})
		},
		qaWrite(command: QaCommand, at: string): QaOutcome {
			return qaGuard(() => tx((): QaOutcome => {
				const { operation, input } = command
				const fingerprint = JSON.stringify(qaCanonical(command))
				const prior = db.prepare('SELECT fingerprint, outcome FROM qa_requests WHERE id = ?').get(input.requestId) as { fingerprint: string; outcome: string } | undefined
				if (prior) {
					if (prior.fingerprint !== fingerprint) throw qaFailure(409, 'request_id_conflict', { requestId: input.requestId })
					const outcome = JSON.parse(prior.outcome) as QaOutcome
					return outcome.accepted ? { accepted: true, value: { ...outcome.value, receipt: { ...outcome.value.receipt, replayed: true } } } : outcome
				}
				const save = (outcome: QaOutcome): QaOutcome => {
					const saved = outcome.accepted ? { accepted: true, value: { ...outcome.value, receipt: Object.fromEntries(Object.entries(outcome.value.receipt).filter(([key]) => key !== 'replayed')) } } : outcome
					db.prepare('INSERT INTO qa_requests (id, fingerprint, outcome) VALUES (?, ?, ?)').run(input.requestId, fingerprint, JSON.stringify(saved))
					return outcome
				}
				const target = { ...('runId' in command ? { runId: command.runId } : {}), ...('caseId' in command ? { caseId: command.caseId } : {}) }
				const stale = (workItem: number, expected: number, actual: number): QaOutcome => {
					const refresh = 'runId' in command ? `mw qa-run ${command.runId}` : `mw qa-case ${'caseId' in command ? command.caseId : ''}`
					const readLink = 'runId' in command ? `/api/v1/qa/runs/${command.runId}` : `/api/v1/qa/cases/${'caseId' in command ? command.caseId : ''}`
					const conflictEvent = event(workItem, 'qa-conflict', { operation, requestId: input.requestId, target, input, before: actual, after: actual, expected, actual, read: readLink }, at)
					return save({ accepted: false, error: { status: 409, reason: 'stale_revision', facts: { ...target, workItem, expected, actual, expectedRevision: expected, actualRevision: actual, requestId: input.requestId, conflictEvent, read: readLink, refresh } } })
				}
				const accepted = (workItem: number, resource: QaAccepted['receipt']['resource'], id: number, caseId: number | null, before: number, revision: number, association?: Pick<QaLink, 'enteredBy' | 'source' | 'target'>): QaOutcome => {
					const links = { read: resource === 'case' ? `/api/v1/qa/cases/${id}` : `/api/v1/qa/runs/${id}`, workItem: `/api/v1/items/${workItem}` }
					const receipt = { operation, resource, id, caseId, revision, at }
					const seq = event(workItem, `qa-${operation}`, { operation, requestId: input.requestId, target: resource === 'case' ? { caseId: id } : { runId: id, ...(caseId === null ? {} : { caseId }) }, input, before, after: revision, receipt, links, ...(association ? { association } : {}) }, at)
					return save({ accepted: true, value: { apiVersion: '1', accepted: true, requestId: input.requestId, receipt: { ...receipt, event: seq, replayed: false }, links } })
				}
				if (command.operation === 'createCase') {
					const i = command.input
					qaAnchor(i.workItem, i.workspace)
					const id = Number(db.prepare('INSERT INTO qa_cases (work_item, workspace, current_revision, created_at) VALUES (?, ?, 1, ?)').run(i.workItem, i.workspace, at).lastInsertRowid)
					const revision: QaCaseRevision = { caseId: id, revision: 1, at, enteredBy: i.enteredBy, instructions: i.instructions }
					db.prepare('INSERT INTO qa_case_revisions (case_id, revision, doc) VALUES (?, 1, ?)').run(id, JSON.stringify(revision))
					return accepted(i.workItem, 'case', id, null, 0, 1)
				}
				if (command.operation === 'reviseCase') {
					const c = qaCaseRow(command.caseId)
					qaAnchor(c.workItem, c.workspace)
					if (command.input.revision !== c.currentRevision) return stale(c.workItem, command.input.revision, c.currentRevision)
					const revision: QaCaseRevision = { caseId: c.id, revision: c.currentRevision + 1, at, enteredBy: command.input.enteredBy, instructions: command.input.instructions }
					if (!Number.isSafeInteger(revision.revision)) throw qaFailure(400, 'invalid_input', { caseId: c.id, reason: 'revision_exhausted' })
					db.prepare('INSERT INTO qa_case_revisions (case_id, revision, doc) VALUES (?, ?, ?)').run(c.id, revision.revision, JSON.stringify(revision))
					db.prepare('UPDATE qa_cases SET current_revision = ? WHERE id = ?').run(revision.revision, c.id)
					return accepted(c.workItem, 'case', c.id, null, c.currentRevision, revision.revision)
				}
				if (command.operation === 'startRun') {
					const i = command.input
					qaAnchor(i.workItem, i.workspace)
					for (const pin of i.cases) {
						const c = qaCaseRow(pin.caseId)
						qaAnchor(c.workItem, c.workspace)
						if (c.workspace !== i.workspace) throw qaFailure(409, 'workspace_mismatch', { caseId: c.id, workspace: i.workspace, expected: c.workspace, refresh: `mw qa-case ${c.id}` })
						qaRevisionRow(c.id, pin.caseRevision)
					}
					const id = Number(db.prepare('INSERT INTO qa_runs (work_item, workspace, doc) VALUES (?, ?, ?)').run(i.workItem, i.workspace, '{}').lastInsertRowid)
					const { requestId: _, ...fields } = i
					const run: QaRun = { ...fields, id, startedAt: at }
					db.prepare('UPDATE qa_runs SET doc = ? WHERE id = ?').run(JSON.stringify(run), id)
					return accepted(i.workItem, 'run', id, null, 0, 0)
				}
				const run = qaRunRow(command.runId)
				qaAnchor(run.workItem, run.workspace)
				const pin = qaEntry(run, command.caseId)
				const current = qaHistory(run.id, pin.caseId).at(-1)?.entryRevision ?? 0
				if (command.input.revision !== current) return stale(run.workItem, command.input.revision, current)
				if (command.operation === 'linkObservation') {
					const i = command.input
					const refresh = `mw qa-export ${run.id} --selection all --format json`
					const facts = { runId: run.id, caseId: pin.caseId, observationId: i.observationId, target: i.target, refresh }
					const row = db.prepare('SELECT doc FROM qa_observations WHERE id = ?').get(i.observationId) as { doc: string } | undefined
					const observation: QaObservation | undefined = row && JSON.parse(row.doc)
					if (!observation || observation.runId !== run.id || observation.caseId !== pin.caseId || observation.caseRevision !== pin.caseRevision) throw qaFailure(404, 'not_found', facts)
					qaRevisionRow(pin.caseId, pin.caseRevision)
					const duplicate = qaLinks().find((link) => {
						if (link.source.observationId !== i.observationId) return false
						const target = i.target
						return target.kind === 'work-item' ? link.target.kind === 'work-item' && link.target.workItem === target.workItem
							: target.kind === 'retest' ? link.target.kind === 'retest' && link.target.run.id === target.runId
							: link.target.kind === 'reference' && link.target.reference.label === target.reference.label && link.target.reference.ref === target.reference.ref
					})
					if (duplicate) return save({ accepted: false, error: { status: 409, reason: 'link_exists', facts: { ...facts, requestId: i.requestId, existingEvent: duplicate.event } } })
					let linkedTarget: QaLink['target']
					try {
						if (i.target.kind === 'work-item') {
							qaAnchor(i.target.workItem, run.workspace)
							const { id, workspace, title, objective, source, status, updated } = read(i.target.workItem)!
							linkedTarget = { kind: 'work-item', workItem: id, snapshot: { id, workspace, title, objective, source, status, updated } }
						} else if (i.target.kind === 'reference') linkedTarget = i.target
						else {
							const retest = qaRunRow(i.target.runId)
							if (retest.workspace !== run.workspace) throw qaFailure(409, 'workspace_mismatch', { ...facts, workspace: run.workspace, expected: retest.workspace })
							if (retest.id <= run.id || retest.application !== run.application) throw qaFailure(409, 'invalid_retest', { ...facts, reason: retest.id <= run.id ? 'not_later_run' : 'different_application' })
							const targetPin = qaEntry(retest, pin.caseId)
							qaRevisionRow(targetPin.caseId, targetPin.caseRevision)
							linkedTarget = { kind: 'retest', run: retest, ...targetPin }
						}
					} catch (cause) {
						if (cause instanceof MadeWellError && cause.code === 'qa_request') {
							const context = cause.context as { status: number; reason: string; facts: Record<string, unknown> }
							throw qaFailure(context.status, context.reason, { ...context.facts, ...facts })
						}
						if (cause instanceof MadeWellError && cause.code === 'item_not_found' && i.target.kind === 'work-item') throw new MadeWellError({ code: 'item_not_found', message: cause.message, context: { id: i.target.workItem }, next: [{ run: refresh, why: 'inspect source evidence and choose an existing same-workspace target' }] })
						throw cause
					}
					return accepted(run.workItem, 'run-entry', run.id, pin.caseId, current, current, { enteredBy: i.enteredBy, source: { runId: run.id, ...pin, observationId: i.observationId }, target: linkedTarget })
				}
				if (!Number.isSafeInteger(current + 1)) throw qaFailure(400, 'invalid_input', { runId: run.id, caseId: pin.caseId, reason: 'revision_exhausted' })
				const i = command.input
				const id = Number(db.prepare('INSERT INTO qa_observations (run_id, case_id, case_revision, entry_revision, doc) VALUES (?, ?, ?, ?, ?)').run(run.id, pin.caseId, pin.caseRevision, current + 1, '{}').lastInsertRowid)
				const observation: QaObservation = {
					id, runId: run.id, ...pin, entryRevision: current + 1, at, enteredBy: i.enteredBy, actual: i.actual, reproduction: i.reproduction, notes: i.notes, evidence: i.evidence,
					...(command.operation === 'recordVerdict' ? { kind: 'manual-verdict' as const, claimedVerifier: command.input.enteredBy, observedAt: at, reportedResult: null, verdict: command.input.verdict } : { kind: command.input.kind, claimedVerifier: command.input.claimedVerifier, observedAt: command.input.observedAt, reportedResult: command.input.reportedResult, verdict: null }),
				}
				db.prepare('UPDATE qa_observations SET doc = ? WHERE id = ?').run(JSON.stringify(observation), id)
				return accepted(run.workItem, 'run-entry', run.id, pin.caseId, current, current + 1)
			}))
		},
		/** Synchronous only: the command, its engine transitions and receipt share one SQLite lock/commit.
		 * Receipts survive item pruning so retrying an old submission can never recreate deleted work. */
		operatorRequest(id: string, fingerprint: string, run: () => { item: number; revision: string; event: number }) {
			return tx(() => {
				const prior = db.prepare('SELECT fingerprint, receipt FROM operator_requests WHERE id = ?').get(id) as { fingerprint: string; receipt: string } | undefined
				if (prior) {
					if (prior.fingerprint !== fingerprint) throw new MadeWellError({
						code: 'api_request', message: 'This request ID was already used with different input. Keep the original request for an uncertain retry; use a new ID for a new message.',
						context: { status: 409, reason: 'request_id_conflict', facts: { requestId: id } }, next: [{ run: 'mw status', why: 'inspect accepted work before submitting a different request' }],
					})
					return { ...JSON.parse(prior.receipt) as { item: number; revision: string; event: number }, replayed: true }
				}
				const receipt = run()
				db.prepare('INSERT INTO operator_requests (id, fingerprint, receipt) VALUES (?, ?, ?)').run(id, fingerprint, JSON.stringify(receipt))
				return { ...receipt, replayed: false }
			})
		},
		create(fields: Pick<Item, 'title' | 'objective' | 'source' | 'workspace'> & Partial<Pick<Item, 'job' | 'parent' | 'from' | 'rework' | 'status' | 'discovery' | 'kind' | 'outputs' | 'after' | 'pack' | 'autonomy' | 'flow'>>): Item {
			const created = tx(() => {
				const now = new Date().toISOString()
				const { lastInsertRowid } = db.prepare('INSERT INTO items (doc) VALUES (?)').run('{}')
				const item: Item = { job: laneOf(fields.pack).delivery[0]?.job ?? '', from: { kind: 'dispatcher' }, status: 'queued', outputs: {}, ...fields, id: Number(lastInsertRowid), round: 1, corrections: 0, launches: 0, created: now, updated: now }
				db.prepare('UPDATE items SET doc = ? WHERE id = ?').run(JSON.stringify(item), item.id)
				event(item.id, 'created', { title: item.title, job: item.job, status: item.status, parent: item.parent ?? null, discovery: item.discovery ?? null })
				return item
			})
			return created
		},
		get(id: number) {
			return read(id)
		},
		/** Records an event that changes nothing on the item: a step starting or finishing, so it is visible while it runs. */
		note(id: number, kind: string, data: Record<string, unknown> = {}, at?: string) {
			tx(() => event(id, kind, data, at))
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
		calls(item?: number, id?: number): Call[] {
			const where = id !== undefined ? 'WHERE id = ?' : item !== undefined ? 'WHERE item = ?' : ''
			const rows = db.prepare(`SELECT * FROM calls ${where} ORDER BY id`).all(...(id !== undefined ? [id] : item !== undefined ? [item] : [])) as (Omit<Call, 'card' | 'tools' | 'tokens' | 'facts' | 'flags'> & { card: string; tokens: string | null; facts: string | null; flags: string })[]
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
		/** Every call without its texts (brief, packet, answer, raw stream), which `call` returns: what a live view polls. */
		callHeads(): CallHead[] {
			const rows = db.prepare('SELECT id, item, kind, job, profile, card, outcome, error, started, ms, tokens, flags, length(system) AS systemBytes, length(prompt) AS packetBytes, length(output) AS answerBytes, length(raw) AS rawBytes, (SELECT COUNT(*) FROM tool_events t WHERE t.call = calls.id) AS toolCount FROM calls ORDER BY id').all() as (Omit<CallHead, 'card' | 'tokens' | 'flags'> & { card: string; tokens: string | null; flags: string })[]
			return rows.map((r) => ({ ...r, card: JSON.parse(r.card), tokens: r.tokens ? JSON.parse(r.tokens) : null, flags: JSON.parse(r.flags) }))
		},
		call(id: number): Call | undefined {
			return store.calls(undefined, id)[0]
		},
		/** The newest event and call: a view looks again only when either moved. */
		mark() {
			return db.prepare('SELECT (SELECT COALESCE(MAX(seq), 0) FROM events) AS events, (SELECT COALESCE(MAX(id), 0) FROM calls) AS calls').get() as { events: number; calls: number }
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
					// The same pid already holding the claim is this runner's new build, swapped in by reload.
					event(0, row?.pid === process.pid ? 'runner-reloaded' : 'runner-started', { pid: process.pid, ...(process.env.MW_BUILD ? { build: process.env.MW_BUILD } : {}), ...(row && row.pid !== process.pid ? { replaced: row.pid } : {}) })
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
		/**
		 * Retention: removes these items and everything recorded about them (events, calls, tool events, and the
		 * evals of those calls), with the runner's own events from before the cutoff, then gives the space back.
		 * Returns what each table lost; a dry run only counts. The caller holds the runner claim.
		 */
		prune(ids: ReadonlyArray<number>, before: string, dryRun: boolean, beforeDelete?: () => void) {
			const protect = () => {
				const retained = qaRetained().filter((id) => ids.includes(id))
				if (retained.length) throw qaFailure(409, 'retention_changed', { ids: retained, refresh: `mw prune --before ${new Date(before).toISOString()} --dry-run` })
			}
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
			if (dryRun) return qaGuard(() => { protect(); return each((t) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n) })
			const removed = qaGuard(() => tx(() => {
				// Recheck under BEGIN IMMEDIATE before even the first filesystem deletion.
				protect()
				beforeDelete?.()
				const r = each((t) => Number(db.prepare(`DELETE FROM ${t}`).run().changes))
				if (Object.values(r).some(Boolean)) event(0, 'pruned', { before, ...r, ids })
				return r
			}))
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
		},
		close() {
			db.close()
		},
	}
	return store
}

export class Store extends Context.Service<Store, ReturnType<typeof openStore>>()('madewell/Store') {}

/** The store, and its spans: to spans.jsonl beside the store, and to the telemetry file with MW_TELEMETRY (MW_DEBUG=0 turns them off). */
export const spansPath = (path: string) => join(dirname(path), 'spans.jsonl')
export const storeLayer = (path = defaultStorePath()) =>
	Layer.mergeAll(
		Layer.effect(Store, Effect.acquireRelease(Effect.sync(() => openStore(path)), (s) => Effect.sync(() => s.close()))),
		debugLayer(path === ':memory:' ? ':memory:' : spansPath(path), telemetry(path)),
	)
