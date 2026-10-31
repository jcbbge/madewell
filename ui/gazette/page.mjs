// The live Gazette page, as the browser runs it. It polls GET /api/mark about once a second and, when the marker
// moves, fetches /api/model (and the live output of running steps), writes the blazon and repaints the sheet.
// Everything on screen comes from the blazon; the painter reads nothing else.
import T from '../../skills/gazette-grammar/tinctures.json'
import { blazonOf } from './blazon.mjs'
import { painter } from './paint.mjs'

const P = painter(T)
const main = document.getElementById('sheet')
let painted = ''
let mark = ''
let lastModel
let unreachedSince

const paint = (blazon) => {
	const html = P.sheet(blazon)
	if (html === painted) return
	const css = P.style(blazon.sheet)
	if (document.getElementById('style').textContent !== css) document.getElementById('style').textContent = css
	painted = html
	// A repaint keeps the reader's place: the stamp that had focus gets it back.
	const focused = document.activeElement?.dataset?.run
	main.innerHTML = html
	if (focused) main.querySelector(`[data-run="${CSS.escape(focused)}"]`)?.focus()
	document.getElementById('status').textContent = blazon.sheet.updated ?? ''
	document.title = `${blazon.sheet.masthead.name}: ${blazon.sheet.masthead.subtitle}`
}

const liveOf = async (model) => {
	const live = {}
	for (const r of model.running) {
		if (!r.live) continue
		const file = r.live.slice(r.live.lastIndexOf('/') + 1)
		try {
			const got = await (await fetch(`/api/live/${encodeURIComponent(file)}`)).json()
			live[file] = got.text ?? ''
		} catch {}
	}
	return live
}

const refetch = async () => {
	const model = await (await fetch('/api/model')).json()
	if (!model.items) return paint(blazonOf(EMPTY, { warning: 'Made Well has no record on this machine yet. It appears with the first mw start or mw discover.' }))
	lastModel = model
	paint(blazonOf(model, { live: await liveOf(model) }))
}

const tick = async () => {
	try {
		const m = await (await fetch('/api/mark', { cache: 'no-store' })).json()
		const now = JSON.stringify(m)
		unreachedSince = undefined
		if (now !== mark) {
			await refetch()
			mark = now
		}
	} catch {
		unreachedSince ??= new Date().toISOString()
		paint(blazonOf(lastModel ?? EMPTY, { stale: unreachedSince }))
		mark = ''
	}
}

/** A record with nothing in it yet, so the sheet still has a masthead and a colophon before the first item. */
const EMPTY = { at: new Date().toISOString(), host: location.hostname, runner: null, eventCount: 0, summary: { shipped: 0, calls: 0, tokens: 0, agentMs: 0, last: null }, needs: [], items: [], running: [] }

document.addEventListener('click', (e) => {
	const b = e.target.closest('[data-run]')
	if (!b) return
	const slip = b.closest('.notice').querySelector('.slip'), run = b.dataset.run
	const said = () => { slip.textContent = `Copied: ${run} (paste it into your terminal on ${lastModel?.host ?? 'the machine that runs Made Well'})` }
	navigator.clipboard.writeText(run).then(said, () => { slip.textContent = run; getSelection().selectAllChildren(slip) })
})

const poll = async () => {
	await tick()
	setTimeout(poll, 1000)
}
poll()
