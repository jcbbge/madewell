// Model → blazon: the one place that decides what the Delivery sheet says. It reads GET /api/model (and the live
// output of running steps) and writes a blazon shaped like skills/gazette-grammar/mockup/blazon.json. Every plain
// word, every choice of charge and every choice of ink is made here; the painter adds nothing.
//
// Inks on this sheet, one meaning each (GRAMMAR.md, law 7):
//   sage        a step that is done
//   vermilion   waits on you (a stopped step, the count, the one primary action)
//   slate-blue  moving by itself now
//   ochre       done, then set aside (the finished steps of a dropped item)

/** Each job's step name, in plain words. */
export const STEP_WORDS = { ideate: 'Idea', challenge: 'Questioned', plan: 'Plan', implement: 'Build', 'test-plan': 'Checks', arbitrate: 'Ruling', verify: 'Verify', ship: 'Ship', discover: 'Discover' }
/** What a step is doing, for a sentence. */
const DOING = { ideate: 'shaping the idea', challenge: 'questioning the idea', plan: 'planning', implement: 'building', 'test-plan': 'writing the checks', arbitrate: 'ruling on a failed check', verify: 'verifying', ship: 'shipping' }
const INK = { done: 'sage', waits: 'vermilion', moving: 'slate-blue', aside: 'ochre' }
const LEGEND = { sage: 'step done', vermilion: 'waits on you', 'slate-blue': 'moving by itself', ochre: 'done, then set aside' }
const MAX_RINGS = 8

const titleCase = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`
/** Cut a line to `n` characters at a word boundary, with an ellipsis. */
export const clip = (s, n) => {
	const t = String(s ?? '').replace(/\s+/g, ' ').trim()
	if (t.length <= n) return t
	const cut = t.slice(0, n - 1)
	return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 12))}…`
}
const agentTime = (ms) => (ms < 60_000 ? `${Math.round(ms / 1000)} seconds` : ms < 3_600_000 ? plural(Math.round(ms / 60_000), 'minute') : `${(ms / 3_600_000).toFixed(1)} hours`)

/**
 * Every time on the sheet names its zone. The sheet keeps the clock the CLI prints, UTC, so a time read here and a time
 * read in a terminal agree; `zone` is another IANA zone only for a painter that must show local time, and the label
 * follows it.
 */
const zoneLabel = (d, zone) => new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? zone
/** "24 Oct, 21:25 UTC". */
export const when = (iso, zone = 'UTC') => {
	const d = new Date(iso)
	return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: zone })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone })} ${zoneLabel(d, zone)}`
}
const longDate = (iso, zone = 'UTC') => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: zone })

// ── Words for Made Well's commands ──────────────────────────────────────────────────────────────────────

const WORDS = [
	[/^mw go \d+$/, () => 'Let it go on'],
	[/^mw answer \d+ /, () => 'Say what should change'],
	[/^mw drop \d+$/, () => 'Drop it', 'quiet'],
	[/^mw retry \d+$/, () => 'Run it again'],
	[/^mw show \d+$/, () => 'Read what happened', 'quiet'],
	[/^mw promote \d+$/, () => 'Deliver every candidate'],
	[/^mw promote \d+ /, () => 'Deliver only some'],
	[/^mw run/, () => 'Start the machine'],
	[/^git -C \S+ switch (\S+)$/, (m) => `Check out ${m[1]}`],
	[/^kill /, () => 'Stop that process', 'quiet'],
]
/** A `next` command as a stamp: plain words on it, the exact command behind it. */
export const stampOf = (next) => {
	for (const [re, words, weight] of WORDS) {
		const m = re.exec(next.run)
		if (m) return { words: words(m), run: next.run, weight: weight ?? 'plain' }
	}
	return { words: clip(titleCase(next.why.split(/[;:,]/)[0]), 36), run: next.run, weight: 'plain' }
}

// ── What a running agent is doing, from its stream ──────────────────────────────────────────────────────

const rel = (p) => String(p ?? '').replace(/^.*\/worktrees\/[^/]+\//, '')
const toolWords = (name, input = {}) => {
	const path = input.path ?? input.file_path ?? input.filePath
	if (input.command ?? input.cmd) return `$ ${clip(input.command ?? input.cmd, 160)}`
	if (path) return `${name} ${rel(path)}`
	if (input.pattern ?? input.query) return `${name} ${clip(input.pattern ?? input.query, 100)}`
	return name
}
/** One line of a live file as a person would say it, or nothing for prompt echoes and tool results. */
export const lineWords = (line) => {
	const t = line.trim()
	if (!t) return undefined
	if (t[0] !== '{') return clip(t, 200)
	try {
		const v = JSON.parse(t)
		if (v.type === 'user' || v.type === 'system') return undefined
		if (v.type === 'result') return v.is_error ? `Error: ${clip(v.result ?? v.error, 200)}` : undefined
		const parts = Array.isArray(v.message?.content) ? v.message.content : []
		for (const p of [...parts].reverse()) {
			if (p.type === 'tool_use') return toolWords(p.name ?? 'tool', p.input)
			if (p.type === 'toolCall') return toolWords(p.name ?? 'tool', p.arguments)
			if (p.type === 'text' && p.text?.trim()) return clip(p.text, 200)
		}
		if (v.type === 'tool_execution_start') return toolWords(v.toolName, v.args)
		if (v.item?.type === 'command_execution' && v.type === 'item.started') return `$ ${clip(v.item.command, 160)}`
		if (v.item?.type === 'agent_message' && v.item.text) return clip(v.item.text, 200)
		return undefined
	} catch {
		return clip(t, 200)
	}
}
/** The last `n` things a stream shows. */
export const tailWords = (text, n = 6) => {
	const out = []
	for (const l of String(text ?? '').split('\n').reverse()) {
		const w = lineWords(l)
		if (w) out.unshift(w)
		if (out.length >= n) break
	}
	return out
}

// ── The sheet ──────────────────────────────────────────────────────────────────────────────────────────

/** The ink of one step of one item, or null for a step not reached. */
const inkOf = (item, step, driven) => {
	if (item.status === 'dropped') return step.state === 'done' ? INK.aside : null
	switch (step.state) {
		case 'done': return INK.done
		case 'held': case 'failed': return INK.waits
		case 'waiting': return item.status === 'paused' || item.status === 'held' ? INK.waits : INK.moving
		case 'active': return driven ? INK.moving : INK.waits
		default: return null
	}
}

/** Why an item stopped, in plain words; Made Well's own message is quoted beside it. */
const saysOf = (need, item) => {
	if (need.what === 'promote') return 'Discovery found candidates. Choose the ones to deliver.'
	if (need.what === 'runner') return 'Work can move, but nothing is driving it.'
	const waiting = item?.steps.find((s) => s.state === 'waiting')
	switch (need.code) {
		case 'checkpoint': return `It stopped at a checkpoint${waiting ? ` before ${DOING[waiting.job] ?? waiting.job}` : ''}, for you to look.`
		case 'no_branch': return 'It could not start: the folder it works in has no branch checked out.'
		case 'questions': case 'spec_defect': return 'It asked questions that only you can answer.'
		default: return need.questions?.length ? 'It asked questions that only you can answer.' : `It stopped and waits for you (${String(need.code).replaceAll('_', ' ')}).`
	}
}

/** An item that is still open: it has a ring whatever its number, because it is where the work is. */
const open = (item) => !['shipped', 'dropped', 'discovered'].includes(item.status)

/**
 * The items the rings draw: every open item, then the newest finished ones until MAX_RINGS, all in item order. Order
 * is fixed by the item number, outermost first, so a repaint never moves a ring: a new item becomes the innermost
 * ring and the others stay where they were.
 */
const ringItems = (delivery) => {
	const kept = delivery.filter(open)
	for (const item of [...delivery].filter((i) => !open(i)).sort((a, b) => b.id - a.id)) if (kept.length < MAX_RINGS) kept.push(item)
	return kept.sort((a, b) => a.id - b.id)
}

/**
 * The Delivery sheet, written from the model. `opts.zone` is the zone every time is shown in (UTC unless a painter
 * says otherwise); `opts.live` maps a running step's live file name to its text, fetched from /api/live; `opts.stale`
 * is when the record was last reached if it cannot be reached now; `opts.warning` is one sentence to print under the
 * masthead.
 */
export const blazonOf = (model, opts = {}) => {
	const zone = opts.zone ?? 'UTC'
	const driven = model.runner != null
	const delivery = model.items.filter((i) => i.kind !== 'discovery')
	const shown = ringItems(delivery)
	const steps = shown.reduce((longest, i) => (i.steps.length > longest.length ? i.steps.map((s) => s.job) : longest), [])
	const rings = shown.map((item) => {
		const fills = steps.map((job) => {
			const step = item.steps.find((s) => s.job === job)
			return step ? inkOf(item, step, driven) : null
		})
		return { item: item.id, name: item.title, status: item.status, fills }
	})
	const inksUsed = new Set(rings.flatMap((r) => r.fills).filter(Boolean))

	const waits = model.needs.length
	const notices = model.needs.map((need, k) => {
		const item = model.items.find((i) => i.id === need.item)
		const actions = need.next.map(stampOf)
		if (k === 0 && actions[0]) actions[0] = { ...actions[0], weight: 'primary' }
		return {
			item: need.item, ink: INK.waits, name: need.title, says: saysOf(need, item), quote: need.message,
			questions: need.questions ?? [], since: `Waiting since ${when(need.since, zone)}`, actions,
		}
	})
	if (notices.length) inksUsed.add(INK.waits)
	// One notice per running item, with one block of live output per running call: a build and its checks running
	// side by side are one card with two blocks.
	const byItem = new Map()
	for (const r of model.running) (byItem.get(r.item) ?? byItem.set(r.item, []).get(r.item)).push(r)
	for (const [id, calls] of byItem) {
		const item = model.items.find((i) => i.id === id)
		const outputs = calls.map((r) => {
			const file = r.live ? r.live.slice(r.live.lastIndexOf('/') + 1) : undefined
			const lines = file && opts.live?.[file] != null ? tailWords(opts.live[file]) : r.activity.map((a) => a.text)
			return { step: STEP_WORDS[r.job] ?? titleCase(r.job), since: `since ${when(r.since, zone)}`, lines }
		})
		const since = calls.map((r) => r.since).sort()[0]
		notices.push({
			item: id, ink: INK.moving, name: calls[0].title, says: item?.doing ?? `The ${calls[0].who} is working on ${calls[0].job}.`,
			since: `Running since ${when(since, zone)}`, actions: [], outputs,
		})
		inksUsed.add(INK.moving)
	}


	const s = model.summary
	const last = s.last ? when(s.last, zone) : 'none yet'
	const sealed = s.shipped > 0
	const notDrawn = delivery.length - shown.length
	const colophon = `From the Made Well record on ${model.host ?? 'this machine'}; last entry ${last}. ${plural(delivery.length, 'item')}, ${plural(s.calls, 'agent call')}, ${s.tokens.toLocaleString('en-GB')} tokens, ${agentTime(s.agentMs)} of agent time.` +
		(sealed ? ` Sealed: ${plural(s.shipped, 'item has', 'items have')} shipped.` : ' Not sealed: nothing has shipped.') +
		(notDrawn ? ` The rings draw every open item and the newest finished ones; ${notDrawn} older finished ${notDrawn === 1 ? 'item is' : 'items are'} not drawn.` : '')

	return {
		about: `Made Well, delivery, from GET /api/model at ${model.at}.`,
		sheet: {
			ground: 'paper', around: 'slate', frame: 'double',
			masthead: { name: 'Made Well', number: model.eventCount, date: longDate(model.at, zone), subtitle: 'Delivery: what waits on you' },
			sealed,
			...(opts.stale ? { warning: `Made Well has not answered since ${when(opts.stale, zone)}. This is the sheet as it was then.` } : opts.warning ? { warning: opts.warning } : {}),
			updated: `Sheet updated ${when(model.at, zone)}: ${waits === 1 ? 'one thing waits' : `${waits} things wait`} on you.`,
		},
		principal: {
			charge: 'rings',
			steps: steps.map((job) => STEP_WORDS[job] ?? titleCase(job)),
			rings,
			centre: waits ? { charge: 'disc', ink: INK.waits, value: String(waits), words: waits === 1 ? 'waits on you' : 'wait on you' } : { charge: 'disc', ink: 'paper', value: '0', words: 'wait on you' },
		},
		notices,
		legend: Object.entries(LEGEND).filter(([ink]) => inksUsed.has(ink)).map(([ink, words]) => ({ ink, words })),
		colophon,
	}
}
