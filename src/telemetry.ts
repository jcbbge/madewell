// What a call did, read back from its harness's own event stream: each tool it used and the tokens it
// spent. The rule-break flags are computed from those and the facts the engine passes in, so the same
// record always yields the same flags.
//
// With MW_TELEMETRY=<dir>, every record the store keeps (events, calls in full, Effect spans) is also appended
// to this machine's own file in that directory, one JSON line each. Point it at a folder that is synced,
// mounted or collected, and the files from every machine read together; `mw stats` reads them. Each line names
// the Made Well build that wrote it. MW_TELEMETRY_LEVEL=metrics keeps the numbers and drops the free text.
import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { hostname } from 'node:os'
import { dirname, join, matchesGlob, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Effect, Layer, Tracer } from 'effect'
import type { Access, Card } from './cards.ts'
import { lastJson } from './lane.ts'

export interface ToolEvent {
	readonly seq: number
	readonly tool: string
	/** sha256 of the tool's input, first 16 hex characters: the same input always has the same digest. */
	readonly digest: string
	readonly inputBytes: number
	readonly outputBytes: number
	/** Output tokens of the model step that issued the call, on that step's first tool; null if the harness does not say. */
	readonly tokens: number | null
	/** When the call was issued and how long until its result came back, if the stream is timestamped. */
	readonly at: string | null
	readonly ms: number | null
	readonly error: boolean
}

/** `input` is uncached input; cache reads and writes are counted apart. */
export interface Tokens {
	readonly input: number
	readonly output: number
	readonly cacheRead: number
	readonly cacheWrite: number
}

/** What the engine knows about a call beyond its stream. Every field is optional: a rule without its facts is not checked. */
export interface Facts {
	readonly access?: Access
	readonly head?: { readonly before: string; readonly after: string }
	/** Workspace-relative paths changed during the call. */
	readonly changed?: ReadonlyArray<string>
	/** Declared scope: paths, directories (`src/`) or globs (`test/*.ts`). */
	readonly scope?: ReadonlyArray<string>
	readonly budget?: { readonly tokens?: number; readonly ms?: number }
	readonly allowlist?: ReadonlyArray<string>
	/** Fields the answer's final JSON object must carry. */
	readonly required?: ReadonlyArray<string>
}

export interface Flag {
	readonly rule: 'write-under-read' | 'head-moved' | 'out-of-scope' | 'over-budget' | 'tool-not-allowed' | 'missing-fields'
	readonly evidence: Record<string, unknown>
}

/** Every harness's own editing tools: Claude Code, Amp, Codex and pi. */
const WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'edit_file', 'create_file', 'undo_edit', 'file_change', 'edit', 'write']

const lines = (raw: string) => raw.split('\n').flatMap((l) => {
	try {
		const e = JSON.parse(l)
		return e && typeof e === 'object' ? [e as Record<string, any>] : []
	} catch {
		return []
	}
})
const bytes = (v: unknown) => (v === undefined || v === null ? 0 : Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v)))
const digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v ?? null)).digest('hex').slice(0, 16)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
/** A line's time: `mw_at` (epoch ms, stamped by the worker on arrival), else the harness's own timestamp. */
const timeOf = (e: Record<string, any>): number | null => {
	const t = e.mw_at ?? e.timestamp ?? e.message?.timestamp
	const ms = typeof t === 'number' ? t : typeof t === 'string' ? Date.parse(t) : NaN
	return Number.isFinite(ms) ? ms : null
}

const CODEX_TOOLS: Record<string, (i: Record<string, any>) => { tool: string; input: unknown; output: unknown }> = {
	command_execution: (i) => ({ tool: 'command_execution', input: i.command, output: i.aggregated_output }),
	file_change: (i) => ({ tool: 'file_change', input: i.changes, output: null }),
	mcp_tool_call: (i) => ({ tool: `${i.server}.${i.tool}`, input: i.arguments, output: i.result ?? i.error }),
	web_search: (i) => ({ tool: 'web_search', input: i.query, output: null }),
}

/** One call's raw stream → its tool events, in the order they were issued. */
export function toolEvents(harness: Card['harness'], raw: string | null): ToolEvent[] {
	type Open = { -readonly [K in keyof ToolEvent]: ToolEvent[K] } & { t: number | null }
	const open = new Map<string, Open>()
	const issue = (id: string, tool: string, input: unknown, t: number | null, tokens: number | null) => {
		if (!open.has(id)) open.set(id, { seq: open.size + 1, tool, digest: digest(input), inputBytes: bytes(input), outputBytes: 0, tokens, at: t === null ? null : new Date(t).toISOString(), ms: null, error: false, t })
	}
	const finish = (id: string, output: unknown, t: number | null, error: boolean) => {
		const e = open.get(id)
		if (!e) return
		e.outputBytes = bytes(output)
		e.error = error
		if (e.t !== null && t !== null) e.ms = t - e.t
	}
	const seen = new Set<string>()
	const stepTokens = new Map<string, number>()
	for (const e of lines(raw ?? '')) {
		const t = timeOf(e)
		if (harness === 'claude' || harness === 'amp') {
			const blocks = Array.isArray(e.message?.content) ? (e.message.content as Record<string, any>[]) : []
			if (e.type === 'assistant') {
				// Claude Code repeats a message's usage on each of its content blocks; Amp sends one event per message.
				let fresh = !e.message.id || !seen.has(e.message.id)
				if (e.message.id) seen.add(e.message.id)
				for (const b of blocks.filter((b) => b.type === 'tool_use')) {
					issue(b.id, b.name, b.input, t, fresh ? num(e.message.usage?.output_tokens) : null)
					fresh = false
				}
			} else if (e.type === 'user') {
				for (const b of blocks.filter((b) => b.type === 'tool_result')) finish(b.tool_use_id, b.content, t, b.is_error === true)
			}
		} else if (harness === 'codex') {
			const item = e.item as Record<string, any> | undefined
			const shape = item && CODEX_TOOLS[item.type]
			if (!shape || (e.type !== 'item.started' && e.type !== 'item.completed')) continue
			const { tool, input, output } = shape(item)
			// An item reported only on completion (file changes) has no duration.
			const started = open.has(item.id)
			issue(item.id, tool, input, t, null)
			if (e.type === 'item.completed') finish(item.id, output, started ? t : null, item.status === 'failed' || num(item.exit_code) !== 0)
		} else if (e.type === 'message_end' && e.message?.role === 'assistant') {
			const first = (e.message.content ?? []).find((c: Record<string, any>) => c.type === 'toolCall')
			if (first) stepTokens.set(first.id, num(e.message.usage?.output))
		} else if (e.type === 'tool_execution_start') {
			issue(e.toolCallId, e.toolName, e.args, t, stepTokens.get(e.toolCallId) ?? null)
		} else if (e.type === 'tool_execution_end') {
			finish(e.toolCallId, e.result, t, e.isError === true)
		}
	}
	return [...open.values()].map(({ t: _, ...event }) => event)
}

/** One call's raw stream → the tokens it spent, or null when the harness reported none. */
export function tokensOf(harness: Card['harness'], raw: string | null): Tokens | null {
	const evs = lines(raw ?? '')
	const sum = (usages: Record<string, any>[], pick: (u: Record<string, any>) => Tokens) =>
		usages.length ? usages.map(pick).reduce((a, b) => ({ input: a.input + b.input, output: a.output + b.output, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite })) : null
	if (harness === 'claude' || harness === 'amp') {
		const anthropic = (u: Record<string, any>) => ({ input: num(u.input_tokens), output: num(u.output_tokens), cacheRead: num(u.cache_read_input_tokens), cacheWrite: num(u.cache_creation_input_tokens) })
		const total = evs.findLast((e) => e.type === 'result' && e.usage)
		if (total) return anthropic(total.usage)
		const seen = new Set<string>()
		const steps = evs.filter((e) => {
			if (e.type !== 'assistant' || !e.message?.usage) return false
			if (!e.message.id) return true
			if (seen.has(e.message.id)) return false
			seen.add(e.message.id)
			return true
		})
		return sum(steps.map((e) => e.message.usage), anthropic)
	}
	if (harness === 'codex') {
		return sum(evs.filter((e) => e.type === 'turn.completed' && e.usage).map((e) => e.usage), (u) => ({ input: Math.max(0, num(u.input_tokens) - num(u.cached_input_tokens)), output: num(u.output_tokens), cacheRead: num(u.cached_input_tokens), cacheWrite: num(u.cache_write_input_tokens) }))
	}
	return sum(evs.filter((e) => e.type === 'message_end' && e.message?.role === 'assistant' && e.message.usage).map((e) => e.message.usage), (u) => ({ input: num(u.input), output: num(u.output), cacheRead: num(u.cacheRead), cacheWrite: num(u.cacheWrite) }))
}

export const totalTokens = (t: Tokens | null) => (t ? t.input + t.output + t.cacheRead + t.cacheWrite : 0)

const inScope = (file: string, scope: ReadonlyArray<string>) => {
	const f = file.replace(/^\.\//, '')
	return scope.some((s) => {
		const p = s.replace(/^\.\//, '')
		return /[*?[{]/.test(p) ? matchesGlob(f, p) : f === p || f.startsWith(p.endsWith('/') ? p : `${p}/`)
	})
}

/** The rule breaks of one call, from its facts and what its stream shows. Deterministic: same inputs, same flags. */
export function flagsFor(facts: Facts, observed: { readonly tools: ReadonlyArray<ToolEvent>; readonly tokens: Tokens | null; readonly ms: number; readonly output: string | null }): Flag[] {
	const flags: Flag[] = []
	const used = [...new Set(observed.tools.map((t) => t.tool))]
	if (facts.access === 'read') {
		const tools = used.filter((t) => WRITE_TOOLS.includes(t))
		const files = facts.changed ?? []
		if (tools.length || files.length) flags.push({ rule: 'write-under-read', evidence: { tools, files } })
	}
	if (facts.head && facts.head.before !== facts.head.after) flags.push({ rule: 'head-moved', evidence: { ...facts.head } })
	if (facts.scope && facts.changed) {
		const files = facts.changed.filter((f) => !inScope(f, facts.scope!))
		if (files.length) flags.push({ rule: 'out-of-scope', evidence: { files, scope: facts.scope } })
	}
	if (facts.budget) {
		const tokens = totalTokens(observed.tokens)
		const over = { ...(facts.budget.tokens !== undefined && tokens > facts.budget.tokens ? { tokens } : {}), ...(facts.budget.ms !== undefined && observed.ms > facts.budget.ms ? { ms: observed.ms } : {}) }
		if (Object.keys(over).length) flags.push({ rule: 'over-budget', evidence: { ...over, budget: facts.budget } })
	}
	if (facts.allowlist) {
		const tools = used.filter((t) => !facts.allowlist!.includes(t))
		if (tools.length) flags.push({ rule: 'tool-not-allowed', evidence: { tools, allowlist: facts.allowlist } })
	}
	if (facts.required) {
		const answer = lastJson(observed.output ?? '') ?? {}
		const fields = facts.required.filter((f) => !(f in answer))
		if (fields.length) flags.push({ rule: 'missing-fields', evidence: { fields } })
	}
	return flags
}

let build: string | null | undefined
/**
 * The running build of Made Well: sha256 of the code beside this module, first 12 hex characters. Installed, that
 * is the one bundled file; in development, every source file. No release process: changed code is a new build.
 */
const buildOf = () => {
	if (build !== undefined) return build
	try {
		const here = dirname(fileURLToPath(import.meta.url))
		const hash = createHash('sha256')
		for (const f of readdirSync(here).filter((f) => /\.(ts|mjs)$/.test(f)).sort()) hash.update(f).update(readFileSync(join(here, f)))
		build = hash.digest('hex').slice(0, 12)
	} catch {
		build = null
	}
	return build
}

/** The strings a metrics-level line keeps as written: names, ids, commits, cards, outcomes and times. */
const KEEP = new Set(['kind', 'job', 'profile', 'harness', 'provider', 'account', 'model', 'effort', 'outcome', 'status', 'code', 'cause', 'rule', 'flags', 'tool', 'tools', 'allowlist', 'required', 'fields', 'access', 'digest', 'exceeded', 'verdict', 'tier', 'prescribed', 'from', 'to', 'by', 'receiver', 'originator', 'ref', 'main', 'on', 'commit', 'verifiedOn', 'conflict', 'before', 'after', 'id', 'doneWhen', 'name', 'trace', 'span', 'parent', 'at', 'started', 'start', 'since', 'resetsAt', 'workspace', 'harnessVersion'])
/** Every other string (prompts, answers, raw streams, errors, reasons, messages, questions, file paths) becomes its length. */
const metrics = (v: unknown, key = ''): unknown =>
	typeof v === 'string' ? (KEEP.has(key) ? v : v.length)
	: Array.isArray(v) ? v.map((x) => metrics(x, key))
	: v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, metrics(x, k)]))
	: v

/**
 * The telemetry sink for a store: with MW_TELEMETRY=<dir>, `<dir>/<host>-<store>.jsonl`, one writer per file so
 * any sync tool can carry it. Each line is {t, host, store, build, ...record}. With MW_TELEMETRY_LEVEL=metrics
 * (any level but full, so a typo never sends free text) the record keeps only its numbers and KEEP strings;
 * array lengths survive, so `mw stats` reads the same at either level. A failed write never stops the work.
 */
export function telemetry(storePath: string) {
	const dir = process.env.MW_TELEMETRY
	if (!dir || storePath === ':memory:') return undefined
	const host = hostname()
	const store = createHash('sha256').update(resolve(storePath)).digest('hex').slice(0, 8)
	const file = join(resolve(dir), `${host}-${store}.jsonl`)
	const full = [undefined, '', 'full'].includes(process.env.MW_TELEMETRY_LEVEL)
	return {
		file,
		write(t: string, record: Record<string, unknown>) {
			try {
				mkdirSync(dirname(file), { recursive: true })
				appendFileSync(file, JSON.stringify({ t, host, store, build: buildOf(), ...(full ? record : (metrics(record) as Record<string, unknown>)) }, (_, v) => (typeof v === 'bigint' ? String(v) : v)) + '\n')
			} catch {}
		},
	}
}
export type Telemetry = NonNullable<ReturnType<typeof telemetry>>

const nanosToMs = (n: bigint) => Number(n / 1_000_000n)

/** Each finished Effect span, as one line: to the telemetry sink when there is one, else with MW_DEBUG=1 to `file`. Never printed. */
export const debugLayer = (file: string, sink?: Telemetry) =>
	Layer.unwrap(Effect.sync(() => {
		if (!sink && process.env.MW_DEBUG !== '1') return Layer.empty
		const write = sink ? (span: Record<string, unknown>) => sink.write('span', span) : (span: Record<string, unknown>) => {
			mkdirSync(dirname(file), { recursive: true })
			appendFileSync(file, JSON.stringify(span, (_, v) => (typeof v === 'bigint' ? String(v) : v)) + '\n')
		}
		return Layer.succeed(Tracer.Tracer, Tracer.make({
			span(options) {
				const span = new Tracer.NativeSpan(options)
				const end = span.end.bind(span)
				span.end = (endTime, exit) => {
					end(endTime, exit)
					const parent = options.parent._tag === 'Some' ? options.parent.value.spanId : null
					const outcome = exit._tag === 'Success' ? 'ok' : 'error'
					write({ name: span.name, trace: span.traceId, span: span.spanId, parent, start: new Date(nanosToMs(span.startTime)).toISOString(), ms: nanosToMs(endTime - span.startTime), outcome, attributes: Object.fromEntries(span.attributes) })
				}
				return span
			},
		}))
	}))

interface Tally { calls: number; minutes: number; tokens: number; refused: number }
/** Agent minutes by call kind: intake and originator are NQ's share, execute is the work itself. */
type Kinds = Record<string, number>
interface ItemRef { item: number; store: string; minutes: number }
interface ProjectStats extends Tally {
	host: string
	workspace: string
	kinds: Kinds
	items: { created: number; shipped: number; held: number }
	nq: { intakes: number; questions: number; share: number }
	leadTime: { median: number | null; slowest: ItemRef | null; shipped: ItemRef[]; open: (ItemRef & { status: 'candidate' | 'running' | 'held' })[] }
	flags: Record<string, number>
	jobs: Record<string, Tally & { kinds: Kinds }>
	cards: Record<string, Tally>
}

/** Events that leave a hold in place; any other event after a hold means the item moved again. */
const WHILE_HELD = ['alerted', 'torn-down', 'worktree-leftovers']
const minutesBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 6_000) / 10

/**
 * Metrics from telemetry lines of any number of machines: per host and project, items created, shipped and
 * held; lead time from each delivery item's creation to its ship, and the age of those still open; NQ intakes,
 * questions and share of agent minutes; and calls, agent minutes (by call kind), tokens and refusals per job and per card.
 */
export function stats(lines: Iterable<string>) {
	const projects = new Map<string, ProjectStats>()
	const calls = new Map<string, { p: ProjectStats; job: string; card: string }>()
	/** Delivery items by host, store and id: ids are only unique within one store. */
	const items = new Map<string, { p: ProjectStats; item: number; store: string; created: string; shipped?: string; status: 'candidate' | 'running' | 'held' }>()
	/** Each store's latest record: an open item's age is measured to it. */
	const latest = new Map<string, string>()
	let from: string | null = null
	let to: string | null = null
	const tally = (): Tally => ({ calls: 0, minutes: 0, tokens: 0, refused: 0 })
	const kinds = (): Kinds => ({ intake: 0, originator: 0, execute: 0 })
	const project = (host: string, workspace: string) => {
		const key = `${host}\0${workspace}`
		if (!projects.has(key)) projects.set(key, { host, workspace, ...tally(), kinds: kinds(), items: { created: 0, shipped: 0, held: 0 }, nq: { intakes: 0, questions: 0, share: 0 }, leadTime: { median: null, slowest: null, shipped: [], open: [] }, flags: {}, jobs: {}, cards: {} })
		return projects.get(key)!
	}
	const refused = new Set<string>()
	for (const line of lines) {
		let r: Record<string, any>
		try {
			r = JSON.parse(line)
		} catch {
			continue // a line still being written
		}
		const at: string | undefined = r.at ?? r.started
		if (at) {
			if (!from || at < from) from = at
			if (!to || at > to) to = at
			const s = `${r.host}\0${r.store}`
			if (at > (latest.get(s) ?? '')) latest.set(s, at)
		}
		if (r.t === 'rejected') refused.add(`${r.host}\0${r.store}\0${r.call}`)
		if (!r.workspace) continue
		const p = project(r.host, r.workspace)
		if (r.t === 'event') {
			if (r.kind === 'created') p.items.created++
			if (r.kind === 'shipped') p.items.shipped++
			if (r.kind === 'held') p.items.held++
			if (r.kind === 'nq-question') p.nq.questions += r.data?.questions?.length ?? 0
			// A discovery run never ships: it ends with its candidates, which are tracked from their promotion.
			const key = `${r.host}\0${r.store}\0${r.item}`
			if (r.kind === 'created' && r.data?.job !== 'discover') items.set(key, { p, item: r.item, store: r.store, created: r.at, status: r.data?.status === 'candidate' ? 'candidate' : 'running' })
			const i = items.get(key)
			if (i && r.kind === 'shipped') i.shipped = r.at
			// Delivery starts at promotion: the operator's wait to promote is not Made Well's time.
			else if (i && r.kind === 'promoted') (i.created = r.at), (i.status = 'running')
			else if (i && r.kind === 'held') i.status = 'held'
			else if (i && r.kind !== 'created' && !WHILE_HELD.includes(r.kind)) i.status = 'running'
		}
		if (r.t === 'call') {
			const card = `${r.card.harness} · ${r.card.model} · ${r.card.effort}`
			const minutes = r.ms / 60_000
			const tokens = totalTokens(r.tokens)
			const job = (p.jobs[r.job] ??= { ...tally(), kinds: kinds() })
			for (const t of [p, job, (p.cards[card] ??= tally())]) {
				t.calls++
				t.minutes += minutes
				t.tokens += tokens
				if (r.outcome === 'rejected') t.refused++
			}
			for (const t of [p, job]) t.kinds[r.kind] = (t.kinds[r.kind] ?? 0) + minutes
			if (r.kind === 'intake') p.nq.intakes++
			for (const f of r.flags ?? []) p.flags[f.rule] = (p.flags[f.rule] ?? 0) + 1
			calls.set(`${r.host}\0${r.store}\0${r.id}`, { p, job: r.job, card })
		}
	}
	// A refusal comes after its call's line.
	for (const key of refused) {
		const c = calls.get(key)
		if (c) for (const t of [c.p, c.p.jobs[c.job]!, c.p.cards[c.card]!]) t.refused++
	}
	// Slowest first; open items oldest first, aged to their store's latest record.
	for (const i of items.values()) {
		const ref = { item: i.item, store: i.store }
		if (i.shipped) i.p.leadTime.shipped.push({ ...ref, minutes: minutesBetween(i.created, i.shipped) })
		else i.p.leadTime.open.push({ ...ref, status: i.status, minutes: minutesBetween(i.created, latest.get(`${i.p.host}\0${i.store}`)!) })
	}
	const tenth = (n: number) => Math.round(n * 10) / 10
	const round = (t: Tally & { kinds?: Kinds }) => {
		t.minutes = tenth(t.minutes)
		for (const k in t.kinds) t.kinds[k] = tenth(t.kinds[k]!)
		return t
	}
	return {
		from,
		to,
		projects: [...projects.values()].map((p) => {
			const lt = p.leadTime
			lt.shipped.sort((a, b) => b.minutes - a.minutes)
			lt.open.sort((a, b) => b.minutes - a.minutes)
			const n = lt.shipped.length
			lt.slowest = lt.shipped[0] ?? null
			lt.median = n ? tenth((lt.shipped[Math.floor((n - 1) / 2)]!.minutes + lt.shipped[Math.floor(n / 2)]!.minutes) / 2) : null
			p.nq.share = p.minutes ? Math.round(((p.kinds.intake! + p.kinds.originator!) / p.minutes) * 100) / 100 : 0
			round(p)
			Object.values(p.jobs).forEach(round)
			Object.values(p.cards).forEach(round)
			return p
		}),
	}
}
