#!/usr/bin/env node
// The terminal painter: the same blazon, painted in character cells with 24-bit colour.
// Each cell is two pixels stacked (the upper half block), so the rings come out stepped.
// Usage: node paint-tty.mjs [blazon.json]
import { readFileSync } from 'node:fs'
import { DISC, SPAN, VIEW, polar, ringRadii, stepArc } from './geometry.mjs'

const B = JSON.parse(readFileSync(process.argv[2] ?? new URL('blazon.json', import.meta.url)))
const T = JSON.parse(readFileSync(new URL('../tinctures.json', import.meta.url)))
const TINCT = { ...T.grounds, ...T.inks, ...T.reserve }
const rgb = (n) => { const h = TINCT[n]; if (!h) throw new Error(`blazon names an unknown tincture: ${n}`); return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(';') }
const fg = (n) => `\x1b[38;2;${rgb(n)}m`, bg = (n) => `\x1b[48;2;${rgb(n)}m`, bold = '\x1b[1m', off = '\x1b[0m'

const W = 76                    // sheet width in cells, frame included
const PX = 44                   // the principal form, in pixels across (and down)
const S = B.sheet, P = B.principal, n = P.steps.length
const radii = ringRadii(P.rings.length)
const scale = 2 * (radii[0].r1 + 6) / PX

// What tincture fills a point of the form, or null for the ground.
function fill(x, y) {
	const { r, a } = polar(x, y)
	if (r <= DISC) return P.centre.ink
	for (const [k, { r0, r1 }] of radii.entries()) {
		if (r < r0 || r > r1 || a < SPAN[0] || a > SPAN[1]) continue
		const i = Math.min(n - 1, Math.floor((a - SPAN[0]) / ((SPAN[1] - SPAN[0]) / n)))
		const f = P.rings[k].fills[i]
		if (f) {
			// a rule between two touching inks: the law of tinctures
			const edge = stepArc(i, n)[0], next = P.rings[k].fills[i - 1]
			if (next && next !== f && (a - edge) * Math.PI / 180 * r < scale * .9) return 'ink'
			return f
		}
		// an empty step's hairline track is finer than a pixel here: dropped, never thickened
		return null
	}
	return null
}
const at = (px, py) => fill(VIEW.cx + (px + .5 - PX / 2) * scale, VIEW.cy + (py + .5 - PX / 2) * scale)
// the keyline falls on the shadow side: ground pixels whose upper-left neighbour is inked
// Hatching is also finer than a pixel here, so it is dropped and words carry the second cue (see the ring labels).
// Only filled inks cast the keyline; rules do not.
const casts = (px, py) => { const f = at(px, py); return f && f !== 'ink' }
const pixel = (px, py) => at(px, py) ?? (casts(px - 1, py - 1) ? 'ink' : S.ground)
const WORD = Object.fromEntries(B.legend.map((l) => [l.ink, l.words]))

// ── lines of the sheet, each exactly W - 4 visible cells, painted on the ground ──
const inner = W - 4
const vis = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').length
const cut = (t, w) => (t.length > w ? t.slice(0, w - 1) + '…' : t)
const pad = (s, align = 'left') => {
	const gap = Math.max(0, inner - vis(s)), l = align === 'center' ? Math.floor(gap / 2) : 0
	return ' '.repeat(l) + s + bg(S.ground) + fg('ink') + ' '.repeat(gap - l)
}
const wrap = (text, width = inner - 6) => text.split(' ').reduce((lines, w) => {
	const last = lines[lines.length - 1]
	if ((last + ' ' + w).trim().length > width) lines.push(w); else lines[lines.length - 1] = (last + ' ' + w).trim()
	return lines
}, [''])
const lines = []
const M = S.masthead
lines.push(pad(`${M.date}${' '.repeat(Math.max(1, inner - M.date.length - `No. ${M.number}`.length))}No. ${M.number}`))
lines.push(pad(bold + M.name.toUpperCase().split('').join(' ') + off + bg(S.ground) + fg('ink'), 'center'))
lines.push(pad(M.subtitle.toUpperCase(), 'center'))
lines.push(pad('═'.repeat(inner)))
// the form, with each ring's name set level with the top of its ring
const state = (ring) => WORD[ring.fills.includes('vermilion') ? 'vermilion' : ring.fills.filter(Boolean).at(-1)] ?? ''
const LABEL = inner - PX - 5
// the rings sit closer than two rows apart here, so their names stack in order, outermost first,
// starting level with the top of the outermost ring
const named = new Map()
let row = Math.floor((PX / 2 - radii[0].r1 / scale) / 2)
P.rings.forEach((ring, k) => {
	wrap(`${ring.item} ${ring.name}: ${state(ring)}`, LABEL - 2).forEach((l, j) => named.set(row++, (j ? '  ' : k ? '  ' : '◂ ') + l))
	row++
})
for (let row = 0; row < PX / 2; row++) {
	let s = '  '
	for (let c = 0; c < PX; c++) s += fg(pixel(c, row * 2)) + bg(pixel(c, row * 2 + 1)) + '▀'
	s += bg(S.ground) + fg('ink') + ' ' + cut(named.get(row) ?? '', LABEL)
	lines.push(pad(s))
}
for (const l of wrap(`Steps, clockwise from the top: ${P.steps.join(' · ')}`)) lines.push(pad(l, 'center'))
lines.push(pad(`${bold}${P.centre.value}${off}${bg(S.ground)}${fg('ink')} ${P.centre.words}`, 'center'))
for (const no of B.notices) {
	lines.push(pad('─'.repeat(inner)))
	lines.push(pad(`${bg('vermilion')}${bold} ${no.item} ${off}${bg(S.ground)}${fg('ink')}  ${bold}${no.name}${off}`))
	for (const l of wrap(no.title)) lines.push(pad('      ' + l))
	for (const l of wrap(no.says)) lines.push(pad('      ' + l))
	for (const l of wrap(`Made Well says: “${no.quote}”`)) lines.push(pad('      ' + l))
	lines.push(pad('      ' + no.since + '.'))
	for (const a of no.actions) {
		const stamp = a.weight === 'primary' ? `${bg('vermilion')}${bold} ${a.words} ${off}` : a.weight === 'plain' ? `${bold}[ ${a.words} ]${off}` : `\x1b[4m${a.words}${off}`
		lines.push(pad(`      ${stamp}${bg(S.ground)}${fg('ink')}`))
		lines.push(pad('        ' + cut(a.run, inner - 8)))
	}
}
lines.push(pad('─'.repeat(inner)))
lines.push(pad(B.legend.map((l) => `${fg(l.ink)}●${fg('ink')} ${l.words}`).join('   '), 'center'))
lines.push(pad('═'.repeat(inner)))
for (const l of wrap(B.colophon, inner - 2)) lines.push(pad(l, 'center'))

// the double frame
const F = (s) => bg(S.ground) + fg('ink') + s
const out = [F('╔' + '═'.repeat(W - 2) + '╗') + off, ...lines.map((l) => F('║ ') + l + F(' ║') + off), F('╚' + '═'.repeat(W - 2) + '╝') + off]
process.stdout.write(out.join('\n') + '\n')
