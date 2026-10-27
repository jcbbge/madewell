// The terminal companion is a read-only projection, never a scheduler or a second store.
import { existsSync, realpathSync } from 'node:fs'
import { basename, resolve, sep } from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { emitKeypressEvents } from 'node:readline'
import { Effect } from 'effect'
import { MadeWellError, quote } from './errors.ts'
import { machineSampler, type Machine } from './machine.ts'
import { openStore, type Item } from './store.ts'
import { lensOf } from './trace.ts'
import { actorOf, modelOf, sayOf, type Model, type NextOf } from './ui.ts'

type Store = ReturnType<typeof openStore>
export interface Navigation { selected?: number; depth: number; offset: number; all: boolean; machine: boolean; help?: boolean }
const terminal = '\x1b['
// Records contain arbitrary agent/tool text. Never execute escape sequences from that text.
export const clean = (text: string) => stripVTControlCharacters(text).replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '')
const duration = (ms: number) => `${Math.floor(ms / 60_000)}m${Math.floor(ms / 1000) % 60}s`
const number = (n: number) => n.toLocaleString('en-US')
const gib = (n: number) => `${(n / 2 ** 30).toFixed(1)} GiB`
const stateMark: Record<string, string> = { done: '✓', active: '>', held: '!', failed: 'x', waiting: '~', todo: '·', skipped: '-' }
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const width = (s: string) => /[\p{Emoji_Presentation}\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff\uff01-\uff60]/u.test(s) ? 2 : 1
export const wrap = (text: string, cols: number): string[] => {
	const out: string[] = []
	for (const line of clean(text).split('\n')) {
		let current = '', used = 0
		for (const { segment } of segmenter.segment(line.replaceAll('\t', '  '))) {
			const n = width(segment)
			if (used + n > cols && current) { out.push(current); current = ''; used = 0 }
			current += segment; used += n
		}
		out.push(current)
	}
	return out
}

const canonical = (path: string) => { try { return realpathSync(path) } catch { return resolve(path) } }

/** A subdirectory belongs to the longest recorded workspace ancestor, never a sibling prefix. */
export const workspaceAt = (items: readonly Item[], cwd: string) => {
	const path = canonical(cwd)
	return [...new Set(items.map(i => resolve(i.workspace)))].filter(p => path === canonical(p) || path.startsWith(canonical(p) + sep)).sort((a, b) => canonical(b).length - canonical(a).length)[0] ?? path
}

/** Filtering the store before projecting also scopes counts, time, tokens, holds and activity. */
export const scoped = (store: Store, workspace?: string): Store => {
	if (!workspace) return store
	const items = store.list().filter(i => canonical(i.workspace) === canonical(workspace))
	const ids = new Set(items.map(i => i.id))
	return { ...store, list: () => items, get: id => ids.has(id) ? store.get(id) : undefined,
		allEvents: () => store.allEvents().filter(e => e.item === 0 || ids.has(e.item)),
		callHeads: () => store.callHeads().filter(c => ids.has(c.item)),
		calls: (id, call) => store.calls(id, call).filter(c => ids.has(c.item)),
	}
}

export const groupsOf = (m: Model) => {
	const discovery = m.items.filter(i => i.kind === 'discovery')
	const delivery = m.items.filter(i => i.kind !== 'discovery')
	return [
		{ title: 'DISCOVERY LANE', items: discovery.filter(i => !['discovered', 'dropped'].includes(i.status)) },
		{ title: 'STAGING · awaiting promotion', items: delivery.filter(i => i.status === 'candidate') },
		{ title: 'DELIVERY · ready / queued', items: delivery.filter(i => i.status === 'queued' && i.after.every(d => d.status === 'shipped')) },
		{ title: 'DELIVERY · waiting / held / checkpoints', items: delivery.filter(i => ['held', 'paused', 'waiting-quota', 'waiting-prerequisite'].includes(i.status) || i.status === 'queued' && i.after.some(d => d.status !== 'shipped')) },
		{ title: 'DELIVERY · active work queue', items: delivery.filter(i => i.status === 'running') },
		{ title: 'DELIVERED · shipping proof', items: delivery.filter(i => i.status === 'shipped') },
		{ title: 'DISCOVERY · completed', items: discovery.filter(i => i.status === 'discovered') },
		{ title: 'DROPPED · retained history', items: m.items.filter(i => i.status === 'dropped') },
	]
}

const machineLines = (machine: Machine) => machine ? [
	`HOST ${machine.host} · ${machine.cores} CPU cores · CPU ${machine.cpuPercent === null ? 'sampling' : machine.cpuPercent.toFixed(0) + '%'} · load ${machine.load.map(n => n.toFixed(2)).join(' / ')}`,
	`Memory ${gib(machine.memoryFree)} free / ${gib(machine.memoryTotal)} total · uptime ${duration(machine.uptimeSeconds * 1000)} · viewer RSS ${gib(machine.observerRss)}`,
	'Host-wide live sample, not work progress. Invocation start/heartbeat samples are saved in the trace.',
] : ['Host measurements unavailable.']

export const screen = (m: Model, nav: Navigation, cols: number, rows: number, scope: string, machine: Machine, detail?: string) => {
	cols = Math.max(1, cols); rows = Math.max(3, rows)
	const groups = groupsOf(m)
	const ordered = groups.flatMap(g => g.items)
	if (!ordered.some(i => i.id === nav.selected)) nav.selected = ordered[0]?.id
	const selected = m.items.find(i => i.id === nav.selected)
	const header = [
		`MADE WELL · ${m.runner ? 'runner ' + m.runner.pid : 'NO RUNNER'} · ${basename(scope)} · ${m.at.slice(11, 19)}`,
		`Discovery ${groups[0]!.items.length} · Staging ${m.summary.candidates} · Delivery ${groups[4]!.items.length} open / ${groups[2]!.items.length} ready / ${groups[3]!.items.length} waiting · Delivered ${m.summary.shipped}`,
		`${number(m.summary.calls)} calls · ${number(m.summary.tokens)} tokens · ${duration(m.summary.agentMs)} agent time · ${duration(m.summary.nqMs)} NQ · ${m.summary.questions} questions`,
	]
	const body: string[] = []
	if (nav.machine) body.push(...machineLines(machine), '')
	if (nav.help) {
		body.push(`Scope: ${scope}`, 'KEYS · watch never changes delivery state', 'j / k or arrows: select next / previous item and inspect it', 'Enter / Tab: overview, pipeline, full evidence', '0 / Escape: overview', 'Page Up / Page Down / Space: scroll', 'g / G: first / last page', 'p / c: parent / first child; j/k visits other items', 'm: host measurements', 'a: current project / all projects', '? : close this help', 'q / Ctrl-C: quit and restore terminal')
	} else if (nav.depth === 0) {
		body.push(`Scope: ${scope} · ${m.running.length} live calls`, ...groups.map(g => `${g.items.length.toString().padStart(3)}  ${g.title}`), '')
		for (const n of m.needs) body.push(`NEEDS YOU ${n.item ? '#' + n.item : ''}: ${n.message}`, ...n.next.map(c => `  ${c.run} — ${c.why}`), '')
		for (const group of groups) {
			body.push(`${group.title} (${group.items.length})`)
			if (!group.items.length) body.push('  —')
			for (const item of group.items) {
				body.push(`${nav.selected === item.id ? '>' : ' '} #${item.id} ${item.title} [${item.status}]`, `  ${item.doing}`)
				const stages = [...new Set(item.steps.map(s => s.cartridge))].map(stage => {
					const steps = item.steps.filter(s => s.cartridge === stage)
					const parallel = steps.some(s => s.job === 'implement') && steps.some(s => s.job === 'test-plan')
					return `${stage}: ${steps.map(s => `${stateMark[s.state === 'active' && !m.runner ? 'waiting' : s.state]}${s.job}`).join(parallel ? ' || ' : ' → ')}`
				})
				body.push('  ' + stages.join(' | '))
				if (item.commit) body.push(`  commit ${item.commit} · checks ${item.checks ? item.checks.passed + '/' + item.checks.total : 'not recorded'}`)
			}
			body.push('')
		}
		body.push('ACTIVITY · recent durable events')
		for (const e of m.events.slice(-12)) body.push(`${e.at.slice(11, 19)} #${e.item} ${e.actor}: ${e.say}`)
	} else if (selected) {
		body.push(`#${selected.id} ${selected.title}`, `${selected.status} · ${selected.doing}`, `Next move owed by: ${selected.owes || 'nobody'}`,
			`Round ${selected.round} · ${duration(selected.agentMs)} · ${number(selected.tokens)} tokens · ${selected.calls} calls`,
			`Discovery: ${selected.discovery ?? '—'} · prerequisite parent: ${selected.parent ?? '—'} · waits on: ${selected.waitsOn ?? '—'}`, '')
		for (const s of selected.steps) body.push(`${stateMark[s.state === 'active' && !m.runner ? 'waiting' : s.state]} ${s.cartridge} / ${s.job} [${s.state === 'active' && !m.runner ? 'waiting for runner' : s.state}] · ${s.who}`, `  ${duration(s.agentMs)} agent · ${duration(s.ms)} elapsed span · ${s.calls} calls · ${number(s.tokens)} tokens · ${s.questions} questions`)
		body.push('', nav.depth === 1 ? 'PIPELINE · persisted state and diagnostics' : 'EVIDENCE · full inputs, outputs, invocations and tools', detail ?? 'No detail on record.')
	} else body.push('No items in this project. Use a for all projects; opening watch does not start work.')
	const flat = body.flatMap(l => wrap(l, cols))
	const top = header.map(l => wrap(l, cols)[0]!).slice(0, Math.max(0, rows - 3))
	const room = Math.max(1, rows - top.length - 2)
	nav.offset = Math.max(0, Math.min(nav.offset, Math.max(0, flat.length - room)))
	const footer = `? help · q quit · j/k item · Enter depth ${nav.depth}/2 · PgUp/Dn scroll · p/c parent/child · m host · a all [${nav.offset + 1}-${Math.min(nav.offset + room, flat.length)}/${flat.length}]`
	return [...top, ...flat.slice(nav.offset, nav.offset + room), '', wrap(footer, cols)[0]!].slice(0, rows).join('\n')
}

export const watch = (path: string, nextOf: NextOf, opts: { tty: boolean; since: number; once: boolean; workspace?: string; all?: boolean }) =>
	Effect.callback<{ watched: string; next: { run: string; why: string }[] }, MadeWellError>((resume) => {
		let store: Store | undefined
		let seq = opts.since, calls = 0, initialized = false
		const nav: Navigation = { depth: 0, offset: 0, all: opts.all ?? false, machine: false }
		const sample = machineSampler()
		let lastModel: Model | undefined
		let scope = opts.workspace ?? process.cwd()
		let last = '', finished = false, cleaned = false, entered = false, input = false
		let timer: ReturnType<typeof setInterval> | undefined
		const wasRaw = process.stdin.isRaw
		const cleanup = () => {
			if (cleaned) return
			cleaned = true
			clearInterval(timer); process.stdout.off('resize', tick); store?.close()
			if (entered) process.stdout.write(`${terminal}?25h${terminal}?1049l`)
			if (input) { process.stdin.off('keypress', onKey); process.stdin.setRawMode(wasRaw); process.stdin.pause() }
		}
		const done = () => { if (!finished) { finished = true; cleanup(); resume(Effect.succeed({ watched: path, next: [{ run: `mw watch --since ${seq}${nav.all ? ' --all' : opts.tty || opts.workspace ? ` --workspace ${quote(scope)}` : ''}`, why: 'carry on from here' }] })) } }
		const tick = () => {
			if (finished) return
			try {
				if (!store && existsSync(path)) store = openStore(path, { readOnly: true })
				if (store && !initialized) { calls = opts.since > 0 ? store.mark().calls : 0; initialized = true }
				if (!store) {
					if (opts.tty) process.stdout.write(`${terminal}H${terminal}2J${wrap(`MADE WELL · no store yet at ${path}. Watching does not start work. q quits.`, process.stdout.columns || 80).join('\n')}`)
					return
				}
				scope = workspaceAt(store.list(), opts.workspace ?? process.cwd())
				const source = scoped(store, nav.all || !opts.tty && !opts.workspace ? undefined : scope)
				if (opts.tty) {
					const m = lastModel = modelOf(source, nextOf)
					if (!m.items.some(i => i.id === nav.selected)) nav.selected = groupsOf(m).flatMap(g => g.items)[0]?.id
					const detail = nav.depth && nav.selected ? JSON.stringify(lensOf(source, nav.selected, nav.depth === 1 ? 'dx' : 'ax', nextOf(source.get(nav.selected)!)), null, 2) : undefined
					const text = screen(m, nav, process.stdout.columns || 120, process.stdout.rows || 40, nav.all ? 'ALL PROJECTS' : scope, sample(), detail)
					if (text !== last) process.stdout.write(`${terminal}H${terminal}2J${text}`)
					last = text
				} else {
					const titles = new Map(source.list().map(i => [i.id, i.title]))
					for (const e of source.allEvents().filter(e => e.seq > seq)) { process.stdout.write(JSON.stringify({ event: { ...e, actor: actorOf(e), say: sayOf(e, titles.get(e.item)) } }) + '\n'); seq = e.seq }
					for (const c of source.callHeads().filter(c => c.id > calls)) { process.stdout.write(JSON.stringify({ call: c }) + '\n'); calls = c.id }
				}
			} catch (cause) {
				finished = true
				cleanup()
				resume(Effect.fail(new MadeWellError({ code: 'usage', message: 'Watch could not read the record.', context: { command: 'watch' }, cause: String(cause), next: [{ run: 'mw status', why: 'inspect the store without starting delivery' }] })))
			}
		}
		const onKey = (_text: string | undefined, key: { sequence?: string }) => {
			if (finished) return
			const k = key.sequence ?? ''
			if (k === 'q' || k === '\x03') return done()
			const items = lastModel ? groupsOf(lastModel).flatMap(g => g.items) : []
			const index = items.findIndex(i => i.id === nav.selected)
			if (['j', '\x1b[B', 'k', '\x1b[A'].includes(k)) {
				const direction = k === 'j' || k === '\x1b[B' ? 1 : -1
				nav.selected = items[Math.max(0, Math.min(items.length - 1, index + direction))]?.id; nav.offset = 0
				// Selection always opens its pipeline, so a row off-screen remains reachable.
				nav.depth = Math.max(1, nav.depth)
			} else if (k === '\r' || k === '\t') { nav.depth = (nav.depth + 1) % 3; nav.offset = 0 }
			else if (k === '0' || k === '\x1b') { nav.depth = 0; nav.offset = 0 }
			else if (k === '\x1b[6~' || k === ' ') nav.offset += Math.max(1, (process.stdout.rows || 40) - 6)
			else if (k === '\x1b[5~') nav.offset -= Math.max(1, (process.stdout.rows || 40) - 6)
			else if (k === 'g') nav.offset = 0
			else if (k === 'G') nav.offset = Number.MAX_SAFE_INTEGER
			else if (k === 'a') { nav.all = !nav.all; nav.offset = 0; nav.selected = undefined }
			else if (k === 'm') { nav.machine = !nav.machine; nav.offset = 0 }
			else if (k === '?') { nav.help = !nav.help; nav.offset = 0 }
			else if (k === 'p' || k === 'c') {
				const current = items.find(i => i.id === nav.selected)
				const target = k === 'p' ? current?.parent ?? current?.discovery : items.find(i => i.parent === nav.selected || i.discovery === nav.selected)?.id
				if (items.some(i => i.id === target)) { nav.selected = target; nav.depth = 1; nav.offset = 0 }
			}
			tick()
		}
		if (opts.tty && !opts.once) {
			// Input must be ready before the first visible frame, including an immediate Ctrl-C.
			if (process.stdin.isTTY) { input = true; process.stdin.setRawMode(true); process.stdin.resume(); emitKeypressEvents(process.stdin); process.stdin.on('keypress', onKey) }
			entered = true; process.stdout.write(`${terminal}?1049h${terminal}?25l`)
		}
		tick()
		if (finished) return
		if (opts.once) { if (opts.tty) process.stdout.write('\n'); done(); return }
		process.stdout.on('resize', tick)
		timer = setInterval(tick, 1000)
		// Effect.callback's returned finalizer handles interruption, not successful resume.
		// Success and failure above must release these resources explicitly as well.
		return Effect.sync(cleanup)
	})
