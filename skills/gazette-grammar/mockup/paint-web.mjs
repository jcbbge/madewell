#!/usr/bin/env node
// The web painter: reads the blazon and the tinctures, writes sheet.html. It draws nothing the blazon does not name.
// Usage: node paint-web.mjs [blazon.json] > sheet.html
import { readFileSync } from 'node:fs'
import { DISC, SPAN, VIEW, pt, ringRadii, stepArc } from './geometry.mjs'

const B = JSON.parse(readFileSync(process.argv[2] ?? new URL('blazon.json', import.meta.url)))
const T = JSON.parse(readFileSync(new URL('../tinctures.json', import.meta.url)))
const TINCT = { ...T.grounds, ...T.inks, ...T.reserve }
// each ink is drawn with its hatching, so meaning never rests on colour alone
const HATCH = { vertical: 'M2 0V6', 'vertical-sparse': 'M3 0V12', horizontal: 'M0 2H6', diagonal: 'M0 0L6 6M-3 3L3 9M3 -3L9 3', dots: 'M2 2h.01' }
const SIZE = { 'vertical-sparse': 12 }
const hatches = () => Object.entries(T.hatch).filter(([k]) => k !== '_').map(([k, h]) => { const s = SIZE[h] ?? 6; return `<pattern id="h-${k}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><rect width="${s}" height="${s}" fill="${TINCT[k]}"/><path d="${HATCH[h]}" stroke="${TINCT.ink}" stroke-width="${h === 'dots' ? 1.6 : .55}" stroke-linecap="round" opacity=".55"/></pattern>` }).join('')
const paint = (n) => (T.hatch[n] ? `url(#h-${n})` : ink(n))
const ink = (n) => TINCT[n] ?? (() => { throw new Error(`blazon names an unknown tincture: ${n}`) })()
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const xy = (r, a) => pt(r, a).map((v) => v.toFixed(2)).join(' ')
const KEY = 1.6 // the shadow-side keyline, in view units

const arc = (r, a0, a1, sweep = 1) => `A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${sweep} ${xy(r, a1)}`
const sector = (r0, r1, a0, a1) => `M${xy(r1, a0)} ${arc(r1, a0, a1)} L${xy(r0, a1)} ${arc(r0, a1, a0, 0)} Z`

function rings(p) {
	const radii = ringRadii(p.rings.length), n = p.steps.length
	const keys = [], fills = [], rules = [], words = []
	p.rings.forEach((ring, k) => {
		const { r0, r1 } = radii[k]
		ring.fills.forEach((f, i) => {
			if (!f) return
			const [a0, a1] = stepArc(i, n), d = sector(r0, r1, a0, a1)
			keys.push(`<path d="${d}" transform="translate(${KEY} ${KEY})"/>`)
			fills.push(`<path d="${d}" fill="${paint(f)}"/>`)
		})
		// the ledger: the ring's track, its ends and a rule at every step boundary
		rules.push(`<path d="M${xy(r1, SPAN[0])} ${arc(r1, SPAN[0], SPAN[1])} M${xy(r0, SPAN[0])} ${arc(r0, SPAN[0], SPAN[1])}"/>`)
		for (let i = 0; i <= n; i++) { const a = stepArc(i, n)[0]; rules.push(`<path d="M${xy(r0, a)} L${xy(r1, a)}"/>`) }
		const rm = (r0 + r1) / 2 - 3.5
		words.push(`<path id="name${k}" d="M${xy(rm, SPAN[1] + 2)} ${arc(rm, SPAN[1] + 2, 360 + SPAN[0] - 2)}" fill="none"/>` +
			`<text class="ringname"><textPath href="#name${k}" startOffset="50%" text-anchor="middle">${esc(ring.item)} · ${esc(ring.name)}</textPath></text>`)
	})
	// step names follow the outermost ring; on the lower half the path runs backwards so they stay upright
	const outer = radii[0].r1
	p.steps.forEach((s, i) => {
		const [a0, a1] = stepArc(i, n), m = (a0 + a1) / 2, low = m > 90 && m < 270
		const r = outer + (low ? 21 : 10)
		const d = low ? `M${xy(r, m + 24)} ${arc(r, m + 24, m - 24, 0)}` : `M${xy(r, m - 24)} ${arc(r, m - 24, m + 24)}`
		words.push(`<path id="step${i}" d="${d}" fill="none"/><text class="stepname"><textPath href="#step${i}" startOffset="50%" text-anchor="middle">${esc(s)}</textPath></text>`)
	})
	const c = p.centre
	const centre = `<circle cx="${VIEW.cx + KEY * 1.4}" cy="${VIEW.cy + KEY * 1.4}" r="${DISC}" fill="${ink('ink')}"/>` +
		`<circle cx="${VIEW.cx}" cy="${VIEW.cy}" r="${DISC}" fill="${ink(c.ink)}" stroke="${ink('ink')}" stroke-width=".8"/>` +
		`<text class="centrevalue" x="${VIEW.cx}" y="${VIEW.cy + 14}" text-anchor="middle">${esc(c.value)}</text>` +
		`<text class="centrewords" x="${VIEW.cx}" y="${VIEW.cy + 38}" text-anchor="middle">${esc(c.words)}</text>`
	const label = p.rings.map((r) => `${r.item}, ${r.name}: ${r.fills.filter(Boolean).length} of ${n} steps`).join('; ')
	return `<svg viewBox="0 0 ${VIEW.w} ${VIEW.h}" role="img" aria-label="${esc(label)}">` +
		`<defs>${hatches()}</defs><g fill="${ink('ink')}">${keys.join('')}</g>${fills.join('')}` +
		`<g fill="none" stroke="${ink('ink')}" stroke-width=".8">${rules.join('')}</g>${words.join('')}${centre}</svg>`
}

const disc = (i, text = '') => `<span class="disc" style="background:${ink(i)}">${esc(text)}</span>`
const notice = (n) => `<section class="notice" aria-labelledby="n${n.item}">
  ${disc('vermilion', n.item)}
  <div>
    <h2 id="n${n.item}">${esc(n.name)}</h2>
    <p class="title">${esc(n.title)}</p>
    <p>${esc(n.says)} <span class="quote">Made Well says: “${esc(n.quote)}”</span></p>
    <p class="since">${esc(n.since)}.</p>
    <div class="actions">${n.actions.map((a) => `<button type="button" class="stamp ${a.weight}" data-run="${esc(a.run)}">${esc(a.words)}</button>`).join('')}</div>
    <p class="slip" aria-live="polite"></p>
  </div>
</section>`

const S = B.sheet, M = S.masthead
const primaries = B.notices.flatMap((n) => n.actions).filter((a) => a.weight === 'primary').length
if (primaries > 1) throw new Error(`the blazon gives ${primaries} primary actions; a sheet has at most one`)

process.stdout.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(M.name)}: ${esc(M.subtitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500;800&family=Alegreya+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
:root { ${Object.entries(TINCT).map(([k, v]) => `--${k}: ${v};`).join(' ')} color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; padding: 36px 16px; background: var(--${S.around}); color: var(--ink); font: 17px/1.5 "Alegreya Sans", system-ui, sans-serif; font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased; }
.sheet { max-width: 660px; margin: 0 auto; background: var(--${S.ground}); border: 3px solid var(--ink); outline: 1px solid var(--ink); outline-offset: -10px; box-shadow: 5px 5px 0 var(--ink); padding: 30px 38px 24px; }
header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: baseline; gap: 12px; }
header .date { font-size: 14px; }
header .no { font-size: 14px; text-align: right; }
h1 { font: 800 40px/1 Alegreya, Georgia, serif; margin: 0; letter-spacing: -.01em; }
.subtitle { text-align: center; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; margin: 10px 0 0; padding-bottom: 12px; border-bottom: 3px double var(--ink); }
svg { display: block; width: 100%; height: auto; margin: 14px 0 6px; }
.ringname { font: 700 11px "Alegreya Sans", sans-serif; letter-spacing: .02em; fill: var(--ink); }
.stepname { font: 700 10.5px "Alegreya Sans", sans-serif; letter-spacing: .12em; text-transform: uppercase; fill: var(--ink); }
.centrevalue { font: 800 58px Alegreya, Georgia, serif; fill: var(--ink); }
.centrewords { font: 700 12px "Alegreya Sans", sans-serif; letter-spacing: .1em; text-transform: uppercase; fill: var(--ink); }
.notice { display: grid; grid-template-columns: 34px 1fr; gap: 14px; padding: 18px 0; border-top: 1px solid var(--ink); }
.disc { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--ink); box-shadow: 2px 2px 0 var(--ink); font: 800 15px Alegreya, serif; }
h2 { font: 800 25px/1.15 Alegreya, Georgia, serif; margin: 2px 0 2px; }
.title { margin: 0 0 8px; font-size: 14px; font-style: italic; }
.notice p { margin: 0 0 6px; max-width: 34em; }
.quote { display: block; font-size: 14.5px; margin-top: 4px; }
.since { font-size: 14px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px 14px; align-items: center; margin-top: 12px; }
.stamp { font: 700 16px/1 "Alegreya Sans", sans-serif; color: var(--ink); background: var(--${S.ground}); border: 1.5px solid var(--ink); border-radius: 0; box-shadow: 3px 3px 0 var(--ink); padding: 10px 15px; min-height: 44px; cursor: pointer; }
.stamp.primary { background: var(--vermilion); font-size: 19px; }
.stamp.quiet { background: none; border: 0; box-shadow: none; padding: 10px 2px; text-decoration: underline; text-underline-offset: 3px; }
.stamp:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--ink); }
.stamp.quiet:active { transform: none; }
@media (hover: hover) { .stamp:not(.quiet):hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink); } }
:focus-visible { outline: 4px double var(--ink); outline-offset: 4px; }
.slip { font: 13.5px/1.4 ui-monospace, Menlo, monospace; min-height: 1.4em; margin-top: 10px !important; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 22px; justify-content: center; padding: 14px 0; border-top: 1px solid var(--ink); font-size: 14px; }
.legend .disc { width: 14px; height: 14px; box-shadow: 1.5px 1.5px 0 var(--ink); margin-right: 7px; vertical-align: -2px; }
footer { border-top: 3px double var(--ink); padding-top: 10px; font-size: 13px; text-align: center; }
@media (max-width: 560px) { .sheet { padding: 22px 20px 18px; outline-offset: -8px; } h1 { font-size: 32px; } header { grid-template-columns: 1fr; text-align: center; } header .no { text-align: center; } }
</style>
</head>
<body>
<main class="sheet">
<header><span class="date">${esc(M.date)}</span><h1>${esc(M.name)}</h1><span class="no">No. ${esc(M.number)}</span></header>
<p class="subtitle">${esc(M.subtitle)}</p>
${rings(B.principal)}
${B.notices.map(notice).join('\n')}
<div class="legend">${B.legend.map((l) => `<span>${disc(l.ink)}${esc(l.words)}</span>`).join('')}</div>
<footer>${esc(B.colophon)}</footer>
</main>
<script>
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-run]'); if (!b) return
  const slip = b.closest('.notice').querySelector('.slip'), run = b.dataset.run
  const said = () => { slip.textContent = 'Copied: ' + run + ' (paste it into your terminal on hive)' }
  navigator.clipboard.writeText(run).then(said, () => { slip.textContent = run; getSelection().selectAllChildren(slip) })
})
</script>
</body>
</html>
`)
