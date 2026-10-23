// The console: one live view of everything Made Well records, read straight from the store. `mw ui` serves it
// as a web page on this machine (a browser, an orb portal, or an SSH tunnel reaches it); `mw watch` draws the
// same state in a terminal, or streams it as JSON lines when an agent reads it. Both only read: the store
// stays the one record, and nothing here is saved.
import { closeSync, existsSync, fstatSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { basename, dirname, join } from 'node:path'
import { Effect } from 'effect'
import { CONSOLE } from './console.ts'
import { MadeWellError } from './errors.ts'
import { stepOf, type Job } from './lane.ts'
import { openHolds } from './project.ts'
import { openStore, spansPath, type Event, type Item } from './store.ts'

type StoreService = ReturnType<typeof openStore>
/** The `mw status` board, from the CLI, so the console shows exactly what the operator's command prints. */
export type BoardOf = (store: StoreService) => unknown

export type Actor = 'operator' | 'agent' | 'made well' | 'runner'

/** Who moved: the operator's commands, an agent's call, the runner's lifecycle, or Made Well's own code. */
export const actorOf = (e: Event): Actor => {
	const d = e.data
	if (e.kind.startsWith('runner-')) return 'runner'
	if (['promoted', 'retried', 'dropped', 'nq-corrected'].includes(e.kind)) return 'operator'
	if (e.kind === 'nq-answer') return d.originator === 'operator' ? 'operator' : 'agent'
	if (e.kind === 'ruling') return d.by === 'operator' ? 'operator' : 'agent'
	if (e.kind === 'created') return d.discovery == null ? 'operator' : 'agent'
	if (['call-started', 'call-finished', 'nq-question', 'nq-clear', 'accepted'].includes(e.kind)) return 'agent'
	return 'made well'
}

const secs = (ms: number) => (ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60_000)}m${String(Math.round((ms % 60_000) / 1000)).padStart(2, '0')}s`)
const short = (s: unknown, n = 160) => {
	const t = String(s ?? '').replace(/\s+/g, ' ').trim()
	return t.length > n ? `${t.slice(0, n - 1)}…` : t
}
const cardOf = (c: unknown) => {
	const card = c as { harness?: string; model?: string; effort?: string } | undefined
	return card ? [card.harness, card.model, card.effort].filter(Boolean).join(' · ') : ''
}
const jobs = (j: unknown) => (Array.isArray(j) ? j.join(' + ') : String(j ?? ''))

/** One plain sentence for an event: what happened, with the facts that matter. */
export const sayOf = (e: Event, title?: string): string => {
	const d = e.data as Record<string, any>
	switch (e.kind) {
		case 'created': return d.job === 'discover' ? `Discovery run started: ${title ?? ''}` : d.discovery != null ? `Candidate found by discovery #${d.discovery}: ${title ?? ''}` : `Work item created: ${title ?? ''}`
		case 'running': return `Running ${d.job}`
		case 'base': return `Starts from ${d.ref} at ${String(d.main).slice(0, 12)}`
		case 'handoff': return `${d.from} hands ${d.job} to the ${d.to}`
		case 'nq-question': return `The ${d.receiver} asks the ${d.originator} ${d.questions?.length ?? 0} question${d.questions?.length === 1 ? '' : 's'}${d.error ? ' about an error' : ''}: ${short((d.questions ?? []).join(' · '), 220)}`
		case 'nq-answer': return `The ${d.originator} answers the ${d.job} hand-off${d.answer ? `: ${short(d.answer, 200)}` : ''}`
		case 'nq-corrected': return `The operator corrects the ${d.job} hand-off: ${short(d.answer, 200)}`
		case 'nq-clear': return `The ${d.profile} is clear on ${d.job} and starts on ${cardOf(d.card)}`
		case 'nq-replacement': return `A new agent takes ${d.job}; it goes through intake again`
		case 'call-started': return `The ${d.profile} starts ${d.kind === 'execute' ? 'the job' : d.kind} for ${d.job} on ${cardOf(d.card)} (${d.access} access, ${d.budget?.minutes ?? '?'} min budget)`
		case 'call-finished': return `The ${d.profile}'s ${d.kind === 'execute' ? d.job : `${d.kind} for ${d.job}`} call ended ${d.outcome} after ${secs(d.ms ?? 0)}${d.error ? `: ${short(d.error, 200)}` : ''}`
		case 'accepted': return `Made Well accepts the ${e.data.job ?? ''} deliverable`
		case 'launch-failed': return `The ${d.job} call failed (${cardOf(d.card)}): ${short(d.error, 220)}`
		case 'quota-swap': return `${cardOf(d.from)} hit a usage limit; the ${d.job} call moves to another card`
		case 'waiting-quota': return `Every card for ${d.job} is out of quota; waits until ${d.resetsAt}`
		case 'handed-off': return `${jobs(d.from)} → ${jobs(d.to)}`
		case 'failure': return `${d.conflict ? `The ${d.conflict} patch no longer applies` : d.results ? `${(d.results as any[]).filter((r) => r.exitCode !== 0).length} of ${(d.results as any[]).length} checks failed` : `${jobs(d.from)} could not finish`}; the arbiter decides whose it is`
		case 'ruling': return d.prerequisite ? `The ${d.by} rules it a pre-existing defect; fix #${d.prerequisite} goes first` : `The ${d.by} rules the cause ${d.cause}; back to ${d.to}${d.answer ? `: ${short(d.answer, 160)}` : ''}`
		case 'prepare-started': return `The project's prepare command runs for ${d.job}: ${short(d.command, 120)}`
		case 'prepared': return `Prepare for ${d.job} exited ${d.exitCode}${d.provisioned?.length ? `, provisioned ${d.provisioned.map((p: any) => `${p.kind} ${p.id}`).join(', ')}` : ''}`
		case 'verify-started': return `Made Well runs ${d.gates?.length ?? 0} gate${d.gates?.length === 1 ? '' : 's'} and ${d.checks?.length ?? 0} check${d.checks?.length === 1 ? '' : 's'} on the change`
		case 'verified': return `All ${d.results?.length ?? 0} gates and checks passed on ${String(d.on).slice(0, 12)}${d.fixed?.length ? ` (gates fixed ${d.fixed.length} files)` : ''}`
		case 'main-moved': return 'The branch moved since the checks ran; they run again'
		case 'merged': return `Merged onto ${d.ref} at ${String(d.main).slice(0, 12)}`
		case 'ship-started': return `The ship command runs: ${short(d.command, 120)}`
		case 'shipped': return `Shipped. ${short(String(d.output ?? '').trim().split('\n').pop(), 160)}`
		case 'held': return `Held for the operator: ${d.code}: ${short(d.message, 240)}`
		case 'alerted': return `Alert sent for ${d.code} (exit ${d.exitCode})`
		case 'retried': return `The operator retries ${d.job}`
		case 'promoted': return `The operator promotes it into delivery`
		case 'discovered': return `Discovery finished with ${d.candidates?.length ?? 0} candidates`
		case 'dropped': return `The operator drops it (was ${d.from})`
		case 'prerequisite-shipped': return `Prerequisite #${d.prerequisite} shipped; verification runs again`
		case 'replan': return `Planned again: ${d.reason}`
		case 'torn-down': return `Torn down: ${(d.records ?? []).map((r: any) => `${r.kind} ${r.id} (exit ${r.exitCode})`).join(', ')}`
		case 'worktree-leftovers': return `The ${d.job} call left files behind: ${(d.files ?? []).join(', ')}`
		case 'runner-started': return `Runner started (pid ${d.pid}${d.replaced ? `, replacing ${d.replaced}` : ''})`
		case 'runner-reloaded': return `Runner swapped in a new build (pid ${d.pid})`
		case 'runner-stopped': return `Runner stopped (pid ${d.pid})`
		case 'runner-lost': return `Runner ${d.pid} died while on ${d.item ? `#${d.item}` : 'no item'}`
		case 'pruned': return `Pruned finished work before ${d.before}`
		default: return `${e.kind} ${short(JSON.stringify(d), 200)}`
	}
}

/** The stage a job belongs to, for placing an item on the board. */
const stageOf = (job: Job) => stepOf(job).stage

/** A step in flight: started and not yet finished. With no live runner, it was cut off. */
interface Flight { readonly item: number; readonly what: string; readonly job: string; readonly who: string; readonly since: string; readonly seq: number; readonly live?: string; readonly card?: string }

const ENDS: Record<string, ReadonlyArray<string>> = {
	'call-started': ['call-finished'],
	'prepare-started': ['prepared'],
	'verify-started': ['verified', 'failure', 'held'],
	'ship-started': ['shipped', 'held'],
}

/** Every step started and not yet finished, read from the events alone. */
export const inFlight = (events: ReadonlyArray<Event>): Flight[] => {
	const open = new Map<string, Flight>()
	for (const e of events) {
		const d = e.data as Record<string, any>
		const key = (kind: string) => `${e.item}:${kind}:${kind === 'call-started' ? `${d.job}:${d.kind}` : kind === 'prepare-started' ? d.name : ''}`
		if (ENDS[e.kind]) {
			const what = e.kind === 'call-started' ? `${d.kind === 'execute' ? 'job' : d.kind} · ${d.job}` : e.kind.replace('-started', '')
			const who = e.kind === 'call-started' ? d.profile : 'made well'
			open.set(key(e.kind), { item: e.item, what, job: d.job ?? e.kind.replace('-started', ''), who, since: e.at, seq: e.seq, ...(d.live ? { live: d.live } : {}), ...(d.card ? { card: cardOf(d.card) } : {}) })
		}
		for (const [start, ends] of Object.entries(ENDS)) if (ends.includes(e.kind)) {
			if (start === 'call-started') open.delete(key(start))
			else if (start === 'prepare-started') open.delete(`${e.item}:${start}:${d.name}`)
			else open.delete(key(start))
		}
		if (e.kind === 'runner-started' || e.kind === 'runner-reloaded' || e.kind === 'runner-lost' || e.kind === 'runner-stopped') {
			// A runner that stopped or died took its steps with it; the next one starts them again.
			if (e.kind !== 'runner-reloaded') open.clear()
		}
	}
	return [...open.values()]
}

/**
 * Minutes each item spent in each stage, and waiting on the operator, from its events: the time between two
 * events belongs to where the item was after the first.
 */
export const minutesOf = (events: ReadonlyArray<Event>, items: ReadonlyArray<Item>, now: number) => {
	const per: Record<number, Record<string, number>> = {}
	const where = new Map<number, string>()
	const last = new Map<number, number>()
	const add = (id: number, until: number) => {
		const from = last.get(id)
		const at = where.get(id)
		if (from === undefined || at === undefined) return
		const m = (per[id] ??= {})
		m[at] = (m[at] ?? 0) + Math.max(0, until - from) / 60_000
	}
	for (const e of events) {
		if (!e.item) continue
		const t = Date.parse(e.at)
		add(e.item, t)
		last.set(e.item, t)
		const d = e.data as Record<string, any>
		const cur = where.get(e.item)
		if (e.kind === 'created') where.set(e.item, d.status === 'candidate' ? 'operator wait' : stageOf(d.job))
		else if (e.kind === 'held') where.set(e.item, 'operator wait')
		else if (e.kind === 'waiting-quota') where.set(e.item, 'quota wait')
		else if (['shipped', 'dropped', 'discovered'].includes(e.kind)) where.delete(e.item)
		else if (e.kind === 'handed-off') where.set(e.item, stageOf((Array.isArray(d.to) ? d.to[0] : d.to) as Job))
		else if (e.kind === 'failure') where.set(e.item, 'verification')
		else if (e.kind === 'ruling' && d.to) where.set(e.item, stageOf(d.to as Job))
		else if ((e.kind === 'call-started' || e.kind === 'running' || e.kind === 'retried') && d.job) where.set(e.item, stageOf(d.job as Job))
		else if (e.kind === 'promoted') where.set(e.item, 'ideation')
		else if (cur === undefined && e.kind !== 'alerted') where.set(e.item, stageOf((items.find((i) => i.id === e.item)?.job ?? 'ideate') as Job))
	}
	for (const i of items) if (!['shipped', 'dropped', 'discovered'].includes(i.status)) add(i.id, now)
	return per
}

const liveDir = (path: string) => join(dirname(path), 'live')

/** The live output files of steps running now (or cut off), newest first. */
const liveFiles = (path: string) => {
	try {
		return readdirSync(liveDir(path)).filter((f) => f.endsWith('.log')).map((f) => {
			const s = statSync(join(liveDir(path), f))
			return { name: f, bytes: s.size, at: new Date(s.mtimeMs).toISOString() }
		}).sort((a, b) => b.at.localeCompare(a.at))
	} catch {
		return []
	}
}

/** Everything the console shows, at one moment. Texts of calls stay out; `callOf` returns them one at a time. */
export const stateOf = (store: StoreService, boardOf: BoardOf) => {
	const now = Date.now()
	const items = store.list()
	const events = store.allEvents()
	const runner = store.runner()
	const titles = new Map(items.map((i) => [i.id, i.title]))
	return {
		at: new Date(now).toISOString(),
		store: store.path,
		runner,
		board: boardOf(store),
		items,
		events: events.map((e) => ({ ...e, actor: actorOf(e), say: sayOf(e, titles.get(e.item)) })),
		calls: store.callHeads(),
		holds: openHolds(store),
		flights: inFlight(events).map((f) => ({ ...f, cutOff: runner === null })),
		minutes: minutesOf(events, items, now),
		live: liveFiles(store.path),
		spans: existsSync(spansPath(store.path)) ? statSync(spansPath(store.path)).size : 0,
	}
}
export type State = ReturnType<typeof stateOf>

/** Up to `max` bytes of a file from `from`, and where the next read starts. A file that shrank is read from the start. */
export const readFrom = (file: string, from: number, max = 256 * 1024) => {
	try {
		const fd = openSync(file, 'r')
		try {
			const size = fstatSync(fd).size
			const start = from > size ? 0 : Math.max(from, size - max)
			const buf = Buffer.alloc(size - start)
			readSync(fd, buf, 0, buf.length, start)
			return { text: buf.toString('utf8'), next: size, skipped: start > from ? start - from : 0 }
		} finally {
			closeSync(fd)
		}
	} catch {
		return { text: '', next: 0, skipped: 0, gone: true }
	}
}

/** The spans of one item's steps, from the spans file; with no item, the newest spans. */
const spansOf = (path: string, item?: number) => {
	const file = spansPath(path)
	if (!existsSync(file)) return []
	const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean)
	const all = lines.flatMap((l) => {
		try {
			return [JSON.parse(l) as { trace: string; span: string; parent: string | null; name: string; start: string; ms: number; outcome: string; attributes: Record<string, unknown> }]
		} catch {
			return []
		}
	})
	if (item === undefined) return all.slice(-500)
	const mine = all.filter((s) => s.attributes.item === item)
	const traces = new Set(mine.map((s) => s.trace))
	const keep = new Set(mine.map((s) => s.span))
	// The steps above an item's own spans (the run, the queue) show where in the run they happened.
	for (let grew = true; grew;) {
		grew = false
		for (const s of all) if (traces.has(s.trace) && !keep.has(s.span) && all.some((c) => keep.has(c.span) && c.parent === s.span)) (keep.add(s.span), (grew = true))
	}
	return all.filter((s) => keep.has(s.span)).slice(-2000)
}

/** Opens the store when it exists, and again whenever it was created since; a console never creates one. */
const storeWatcher = (path: string) => {
	let store: StoreService | undefined
	return () => {
		if (!store && existsSync(path)) store = openStore(path)
		return store
	}
}

const json = (res: import('node:http').ServerResponse, body: unknown, code = 200) => {
	res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
	res.end(JSON.stringify(body))
}

/** Serves the console until interrupted. Prints one JSON line with its address first, so an agent can hand it on. */
export const serve = (path: string, boardOf: BoardOf, host: string, port: number) =>
	Effect.callback<never, MadeWellError>((resume) => {
		const open = storeWatcher(path)
		const server = createServer((req, res) => {
			const url = new URL(req.url ?? '/', 'http://console')
			const store = open()
			try {
				if (url.pathname === '/') {
					res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
					return res.end(CONSOLE)
				}
				if (!store) return json(res, { store: null, path, at: new Date().toISOString() })
				if (url.pathname === '/api/mark') {
					const r = store.runner()
					return json(res, { ...store.mark(), runner: r?.pid ?? null, live: liveFiles(path).map((f) => `${f.name}:${f.bytes}`).join(','), spans: existsSync(spansPath(path)) ? statSync(spansPath(path)).size : 0 })
				}
				if (url.pathname === '/api/state') return json(res, stateOf(store, boardOf))
				const call = /^\/api\/call\/(\d+)$/.exec(url.pathname)
				if (call) return json(res, store.call(Number(call[1])) ?? null, store.call(Number(call[1])) ? 200 : 404)
				const live = /^\/api\/live\/([\w.-]+\.log)$/.exec(url.pathname)
				if (live) return json(res, readFrom(join(liveDir(path), basename(live[1]!)), Number(url.searchParams.get('from') ?? 0)))
				if (url.pathname === '/api/spans') return json(res, spansOf(path, url.searchParams.has('item') ? Number(url.searchParams.get('item')) : undefined))
				json(res, { error: 'not_found', path: url.pathname }, 404)
			} catch (e) {
				json(res, { error: 'console_failed', message: String(e) }, 500)
			}
		})
		server.on('error', (e) => resume(Effect.fail(new MadeWellError({
			code: 'ui_unavailable', message: `The console cannot listen on ${host}:${port}: ${e.message}`, context: { host, port, reason: e.message },
			next: [{ run: `mw ui --port ${port + 1}`, why: 'serve it on another port' }],
		}))))
		server.listen(port, host, () => {
			const bound = (server.address() as import('node:net').AddressInfo).port
			const url = `http://${host.includes(':') ? `[${host}]` : host}:${bound}/`
			process.stdout.write(JSON.stringify({
				ui: url, store: path,
				next: [
					{ run: `open ${url}`, why: 'watch every lane, step, call and hold live; it updates as the run moves' },
					{ run: `ssh -L ${bound}:localhost:${bound} <this machine>`, why: 'from another computer, then open the same address there' },
					{ run: 'mw watch', why: 'the same view in a terminal' },
				],
			}) + '\n')
		})
		return Effect.sync(() => void server.close())
	})

// ── The terminal ───────────────────────────────────────────────────────────────────────────────────────

const ESC = '\x1b['
const paint = (code: string, s: string) => `${ESC}${code}m${s}${ESC}0m`
const dim = (s: string) => paint('2', s)
const bold = (s: string) => paint('1', s)
const COLOR: Record<string, string> = { held: '31', shipped: '32', running: '34', queued: '36', candidate: '33', discovered: '32', 'waiting-quota': '33', 'waiting-prerequisite': '33', dropped: '2' }
const ACTOR: Record<Actor, string> = { operator: '35', agent: '34', 'made well': '32', runner: '2' }
const visible = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '')
const fit = (s: string, w: number) => {
	if (visible(s).length <= w) return s
	let out = ''
	let n = 0
	for (const part of s.split(/(\x1b\[[0-9;]*m)/)) {
		if (part.startsWith('\x1b[')) out += part
		else for (const ch of part) {
			if (n === w - 1) return `${out}…${ESC}0m`
			out += ch
			n++
		}
	}
	return out
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour12: false })

/** The last line of a live file worth showing: for a JSON stream, its text, else the line itself. */
const lastLine = (file?: string) => {
	if (!file) return ''
	const { text } = readFrom(file, 0, 16 * 1024)
	const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
	for (const l of lines.reverse()) {
		try {
			const v = JSON.parse(l)
			const s = JSON.stringify(v).match(/"(?:text|content|message|result|command)":"((?:[^"\\]|\\.){4,})"/)?.[1]
			if (s) return short(s.replace(/\\n/g, ' ').replace(/\\"/g, '"'), 200)
			continue
		} catch {
			return short(l, 200)
		}
	}
	return ''
}

const STAGE_ROWS: ReadonlyArray<[string, (i: Item) => boolean]> = [
	['DISCOVERY', (i) => i.job === 'discover' && i.status !== 'discovered'],
	['OPERATOR', (i) => i.status === 'held' || i.status === 'candidate'],
	['IDEATION', (i) => !['held', 'candidate', 'shipped', 'dropped', 'discovered'].includes(i.status) && stageOf(i.job) === 'ideation'],
	['PLANNING', (i) => !['held', 'candidate', 'shipped', 'dropped', 'discovered'].includes(i.status) && stageOf(i.job) === 'planning'],
	['IMPLEMENTATION', (i) => !['held', 'candidate', 'shipped', 'dropped', 'discovered'].includes(i.status) && stageOf(i.job) === 'implementation'],
	['VERIFICATION', (i) => !['held', 'candidate', 'shipped', 'dropped', 'discovered'].includes(i.status) && stageOf(i.job) === 'verification'],
	['DONE', (i) => i.status === 'shipped' || i.status === 'discovered'],
]

/** One screen of the console for a terminal `cols` wide and `rows` high. */
export const frame = (s: State, cols: number, rows: number) => {
	const out: string[] = []
	const now = Date.parse(s.at)
	const board = s.board as { summary?: string; next?: { run: string; why: string }[] }
	out.push(`${bold('MADE WELL')}  ${dim(s.store)}  ${s.runner ? paint('32', `● runner ${s.runner.pid}${s.runner.item ? ` on #${s.runner.item}` : ''} since ${clock(s.runner.since)}`) : paint('33', '○ no runner: nothing moves until `mw run`')}  ${dim(clock(s.at))}`)
	out.push(board.summary ?? '')
	out.push('')
	out.push(bold('NOW'))
	if (!s.flights.length) out.push(dim('  nothing running'))
	for (const f of s.flights) {
		const item = s.items.find((i) => i.id === f.item)
		out.push(`  ${bold(`#${f.item}`)} ${f.what} · ${f.who}${f.card ? dim(` · ${f.card}`) : ''}  ${f.cutOff ? paint('33', `cut off ${secs(now - Date.parse(f.since))} ago`) : paint('34', secs(now - Date.parse(f.since)))}  ${dim(short(item?.title ?? '', 60))}`)
		const line = lastLine(f.live)
		if (line) out.push(dim(`     │ ${line}`))
	}
	out.push('')
	out.push(bold('WHERE THE WORK IS'))
	for (const [name, test] of STAGE_ROWS) {
		const here = s.items.filter(test)
		const chips = here.map((i) => {
			const extra = i.status === 'held' ? ` ${i.hold?.code ?? ''}` : i.status === 'candidate' ? ' candidate' : name === 'DONE' ? '' : ` ${i.job}`
			return paint(COLOR[i.status] ?? '0', `#${i.id}${extra}`)
		})
		out.push(`  ${name.padEnd(15)}${chips.length ? chips.join('  ') : dim('—')}`)
	}
	if (s.holds.length) {
		out.push('')
		out.push(bold('NEEDS YOU'))
		for (const h of s.holds) {
			out.push(`  ${paint('31', `#${h.item} ${h.code}`)} ${short(h.message, 300)}`)
			const item = s.items.find((i) => i.id === h.item)
			const next = (board.next ?? []).filter((n) => n.run.includes(` ${h.item}`) || n.run.includes(`${h.item} `)).slice(0, 2)
			for (const n of next) out.push(`    ${paint('36', n.run)}  ${dim(n.why)}`)
			if (!next.length && item) out.push(dim(`    mw show ${item.id}`))
		}
	}
	out.push('')
	out.push(bold('LOG'))
	const room = Math.max(4, rows - out.length - 2)
	for (const e of s.events.slice(-room)) out.push(`  ${dim(clock(e.at))}  ${paint(ACTOR[e.actor], e.actor.padEnd(9))} ${e.item ? `#${e.item}`.padEnd(5) : '     '}${e.say}`)
	out.push(dim('Ctrl-C quits · mw ui opens the full console · mw show <id> for one item\'s record'))
	return out.map((l) => fit(l, cols)).join('\n')
}

/**
 * `mw watch`: in a terminal, the console redrawn every second; read by a program, every event as one JSON line
 * from `since` on, with each call's record once it ends, then every new one as it happens.
 */
export const watch = (path: string, boardOf: BoardOf, opts: { tty: boolean; since: number; once: boolean }) =>
	Effect.callback<{ watched: string; next: { run: string; why: string }[] }>((resume) => {
		const open = storeWatcher(path)
		let seq = opts.since
		// Carrying on from an event carries on from the calls recorded by then too.
		let calls = opts.since > 0 ? (open()?.mark().calls ?? 0) : 0
		let lastFrame = ''
		const tick = () => {
			const store = open()
			if (opts.tty) {
				const text = store ? frame(stateOf(store, boardOf), process.stdout.columns || 120, process.stdout.rows || 40) : `${bold('MADE WELL')}  no store yet at ${path}; it appears with the first \`mw discover\` or \`mw start\`.`
				if (text !== lastFrame) process.stdout.write(`${ESC}H${ESC}2J${text}\n`)
				lastFrame = text
				return
			}
			if (!store) return
			const titles = new Map(store.list().map((i) => [i.id, i.title]))
			for (const e of store.allEvents().filter((e) => e.seq > seq)) {
				process.stdout.write(JSON.stringify({ event: { ...e, actor: actorOf(e), say: sayOf(e, titles.get(e.item)) } }) + '\n')
				seq = e.seq
			}
			for (const c of store.callHeads().filter((c) => c.id > calls)) {
				process.stdout.write(JSON.stringify({ call: c }) + '\n')
				calls = c.id
			}
		}
		const done = () => resume(Effect.succeed({ watched: path, next: [{ run: `mw watch --since ${seq}`, why: 'carry on from here' }] }))
		tick()
		if (opts.once) {
			if (opts.tty) process.stdout.write('\n')
			done()
			return
		}
		if (opts.tty) process.stdout.write(`${ESC}?25l`)
		const timer = setInterval(tick, 1000)
		return Effect.sync(() => {
			clearInterval(timer)
			if (opts.tty) process.stdout.write(`${ESC}?25h`)
		})
	})
