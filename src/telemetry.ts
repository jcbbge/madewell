// What a call did, read back from its harness's own event stream: each tool it used and the tokens it
// spent. The rule-break flags are computed from those and the facts the engine passes in, so the same
// record always yields the same flags. With MW_DEBUG=1, every Effect span also goes to a local JSONL file.
import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, matchesGlob } from 'node:path'
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
export const WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'edit_file', 'create_file', 'undo_edit', 'file_change', 'edit', 'write']

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

const nanosToMs = (n: bigint) => Number(n / 1_000_000n)

/** Debug mode: with MW_DEBUG=1, each finished span is appended to `file` as one JSON line. Off by default; never printed. */
export const debugLayer = (file: string) =>
	Layer.unwrap(Effect.sync(() => {
		if (process.env.MW_DEBUG !== '1') return Layer.empty
		mkdirSync(dirname(file), { recursive: true })
		return Layer.succeed(Tracer.Tracer, Tracer.make({
			span(options) {
				const span = new Tracer.NativeSpan(options)
				const end = span.end.bind(span)
				span.end = (endTime, exit) => {
					end(endTime, exit)
					const parent = options.parent._tag === 'Some' ? options.parent.value.spanId : null
					const outcome = exit._tag === 'Success' ? 'ok' : 'error'
					appendFileSync(file, JSON.stringify({ name: span.name, trace: span.traceId, span: span.spanId, parent, start: new Date(nanosToMs(span.startTime)).toISOString(), ms: nanosToMs(endTime - span.startTime), outcome, attributes: Object.fromEntries(span.attributes) }, (_, v) => (typeof v === 'bigint' ? String(v) : v)) + '\n')
				}
				return span
			},
		}))
	}))
