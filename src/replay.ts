// The glass: one static page that replays the whole flow from the record, from raw input through discovery
// to every item shipped. Every event and every agent call is a step; each call shows its tool calls, tokens,
// rule-break flags, system prompt, packet and answer. The store rewrites it beside itself after every saved
// transition; `mw replay` writes a copy. `mw export <item>` writes one folder per call, raw stream included:
// the replay, the postmortem and the eval dataset.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { MadeWellError } from './errors.ts'
import type { Call, Event, Item } from './store.ts'

interface Source {
	list(): Item[]
	get(id: number): Item | undefined
	events(id: number): Event[]
	allEvents(): Event[]
	calls(item?: number): Call[]
}

/** Raw streams stay out of the glass, which is rewritten on every transition; `mw export` carries them. */
export const snapshot = (store: Source) => ({ items: store.list(), events: store.allEvents(), calls: store.calls().map(({ raw, ...c }) => ({ ...c, rawBytes: raw?.length ?? 0 })), at: new Date().toISOString() })

/** One folder per call of one item: brief, packet, answer, raw stream, tool events and flags. */
export const exportItem = Effect.fn('mw.export')(function* (store: Source, id: number, dir: string) {
	const item = store.get(id)
	if (!item) return yield* new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list every work item' }] })
	const calls = store.calls(id)
	yield* Effect.try({
		try: () => {
			mkdirSync(dir, { recursive: true })
			writeFileSync(join(dir, 'item.json'), JSON.stringify({ item, events: store.events(id) }, null, 2))
			calls.forEach((c, i) => {
				const folder = join(dir, `${String(i + 1).padStart(3, '0')}-${c.kind}-${c.job}`)
				mkdirSync(folder, { recursive: true })
				const { system, prompt, output, raw, tools, flags, ...meta } = c
				const files: [string, string][] = [['call.json', JSON.stringify(meta, null, 2)], ['brief.txt', system], ['packet.txt', prompt], ['answer.txt', output ?? ''], ['raw.jsonl', raw ?? ''], ['tools.json', JSON.stringify(tools, null, 2)], ['flags.json', JSON.stringify(flags, null, 2)]]
				for (const [name, text] of files) writeFileSync(join(folder, name), text)
			})
		},
		catch: (e) => new MadeWellError({ code: 'export_failed', message: `Cannot write the export of item #${id} to ${dir}.`, context: { id, dir, reason: String(e) }, next: [{ run: `mw export ${id} --out <writable dir>`, why: 'export somewhere writable' }] }),
	})
	return { dir, calls: calls.length }
})

export const replayHtml = (data: ReturnType<typeof snapshot>) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Made Well · the glass</title>
<style>
:root { --ink:#16181d; --mute:#6b7280; --line:#e5e7eb; --bg:#fafaf9; --ok:#15803d; --warn:#b45309; --bad:#b91c1c; --run:#1d4ed8; }
* { box-sizing:border-box } body { margin:0; font:14px/1.45 ui-sans-serif,system-ui,sans-serif; color:var(--ink); background:var(--bg) }
header { padding:14px 20px; border-bottom:1px solid var(--line); display:flex; gap:16px; align-items:center; flex-wrap:wrap; background:#fff; position:sticky; top:0; z-index:2 }
h1 { font-size:15px; margin:0 } .mute { color:var(--mute) } button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:6px; cursor:pointer } button:hover { border-color:var(--ink) }
input[type=range] { flex:1; min-width:200px } .pill { font-size:12px; padding:1px 8px; border-radius:999px; border:1px solid currentColor; white-space:nowrap }
main { display:grid; grid-template-columns: 340px 1fr; height: calc(100vh - 58px) }
#steps { overflow:auto; border-right:1px solid var(--line); background:#fff } .step { padding:7px 14px; border-bottom:1px solid #f3f4f6; cursor:pointer; display:grid; grid-template-columns:44px 1fr; gap:8px }
.step.on { background:#eef2ff } .step.future { opacity:.35 } .step .n { color:var(--mute); font-variant-numeric:tabular-nums } .step b { font-weight:600 }
#right { overflow:auto; padding:18px 22px } .board { display:grid; grid-template-columns: 1.3fr repeat(7, minmax(0, 1fr)); gap:8px; align-items:stretch }
.col { min-width:0; background:#fff; border:1px solid var(--line); border-radius:10px; padding:10px } .col h3 { margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:.03em; color:var(--mute); overflow-wrap:anywhere }
.card { border:1px solid var(--line); border-radius:8px; padding:7px 9px; margin-bottom:6px; cursor:pointer; background:#fff } .card.sel { outline:2px solid var(--run) }
.status-shipped { color:var(--ok) } .status-held { color:var(--bad) } .status-running,.status-queued { color:var(--run) } .status-waiting-quota,.status-waiting-prerequisite,.status-candidate { color:var(--warn) } .status-discovered { color:var(--ok) }
.card div { overflow-wrap:anywhere } .detail { margin-top:18px; background:#fff; border:1px solid var(--line); border-radius:10px; padding:14px 16px }
pre { white-space:pre-wrap; word-break:break-word; background:#f8fafc; border:1px solid var(--line); border-radius:8px; padding:10px; max-height:420px; overflow:auto; font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace }
table.tools { border-collapse:collapse; width:100%; font-size:12px; margin:6px 0 12px } .tools th, .tools td { text-align:left; padding:3px 8px; border-bottom:1px solid var(--line); font-variant-numeric:tabular-nums } .tools th { color:var(--mute); font-weight:500 } .tools td.num, .tools th.num { text-align:right } .tools tr.err td { color:var(--bad) }
.flag { color:var(--bad); background:#fef2f2 } ul.flags { margin:6px 0 12px; padding-left:18px } ul.flags li { margin:3px 0 } code { font:12px ui-monospace,SFMono-Regular,Menlo,monospace }
details summary { cursor:pointer; color:var(--mute); margin:8px 0 } .kv { display:grid; grid-template-columns:120px 1fr; gap:4px 12px } .kv div:nth-child(odd) { color:var(--mute) }
</style></head><body>
<header><h1>Made Well · the glass</h1><span class="mute" id="meta"></span>
<button id="first">⏮</button><button id="prev">◀</button><button id="play">▶ Play</button><button id="next">▶</button><button id="last">⏭ Now</button>
<input type="range" id="slider" min="0" value="0"><span id="pos" class="mute"></span></header>
<main><div id="steps"></div><div id="right"><div class="board" id="board"></div><div class="detail" id="detail"></div></div></main>
<script>
const DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LANE = ['discover','ideate','challenge','plan','test-plan','implement','verify','arbitrate'];
let steps = [], pos = 0, timer = null, selected = null;
function build() {
  steps = [...DATA.events.map((e) => ({ t: e.at, type: 'event', e })), ...DATA.calls.map((c) => ({ t: c.started, type: 'call', c }))]
    .sort((a, b) => a.t.localeCompare(b.t) || (a.type === 'call' ? -1 : 1));
}
function stateAt(n) {
  const s = {};
  for (const st of steps.slice(0, n + 1)) {
    if (st.type !== 'event') continue;
    if (!itemById(st.e.item)) continue;
    const e = st.e, d = e.data, it = (s[e.item] ??= { status: 'queued', job: 'ideate' });
    if (e.kind === 'created') { it.status = d.status ?? 'queued'; it.job = d.job; }
    else if (e.kind === 'handed-off') it.job = d.to;
    else if (e.kind === 'failure') it.job = 'arbitrate';
    else if (e.kind === 'ruling') { if (d.to) it.job = d.to; if (d.prerequisite) it.status = 'waiting-prerequisite'; else it.status = 'running'; }
    else if (e.kind === 'prerequisite-shipped') { it.job = 'verify'; it.status = 'running'; }
    else if (['held','shipped','discovered','running','waiting-quota'].includes(e.kind)) it.status = e.kind;
    else if (['retried','promoted'].includes(e.kind) || (e.kind === 'nq-answer' && d.originator === 'operator')) it.status = 'queued';
  }
  return s;
}
const itemById = (id) => DATA.items.find((i) => i.id === id);
const total = (t) => (t ? t.input + t.output + t.cacheRead + t.cacheWrite : 0);
const num = (n) => Number(n).toLocaleString('en-US');
const flagPills = (c) => c.flags.map((f) => ' <span class="pill flag">' + esc(f.rule) + '</span>').join('');
function label(st) {
  if (st.type === 'call') { const c = st.c; return '<b>' + esc(c.profile) + '</b> · ' + esc(c.kind) + ' ' + esc(c.job) + ' <span class="mute">#' + c.item + ' · ' + esc(c.card.harness + ' ' + c.card.model) + ' · ' + (c.ms / 1000).toFixed(1) + 's · ' + c.tools.length + ' tools' + (c.tokens ? ' · ' + num(total(c.tokens)) + ' tok' : '') + '</span>' + (c.outcome !== 'ok' ? ' <span class="pill status-held">' + esc(c.outcome) + '</span>' : '') + flagPills(c); }
  const e = st.e, d = e.data; let extra = '';
  if (e.kind.startsWith('runner-')) return '<b>' + esc(e.kind) + '</b> <span class="mute">pid ' + esc(d.pid) + (e.item ? ' · #' + e.item : '') + '</span>';
  if (e.kind === 'handoff') extra = esc(d.from) + ' → ' + esc(d.to);
  else if (e.kind === 'handed-off') extra = esc(d.from) + ' → ' + esc(d.to);
  else if (e.kind === 'nq-question') extra = esc(d.receiver) + ' asks ' + esc(d.originator) + ': ' + esc((d.questions || []).join(' · ')).slice(0, 140);
  else if (e.kind === 'nq-clear') extra = esc(d.profile) + ' is clear';
  else if (e.kind === 'shipped') extra = esc((d.output || '').trim().split('\\n').pop());
  else if (e.kind === 'held' || e.kind === 'ruling') extra = esc(d.code || d.cause || '');
  else if (e.kind === 'discovered') extra = (d.candidates || []).length + ' candidates';
  else if (e.kind === 'created') extra = esc(itemById(e.item)?.title || '');
  return '<b>' + esc(e.kind) + '</b> <span class="mute">#' + e.item + '</span> ' + extra;
}
function render() {
  const n = steps.length; document.getElementById('slider').max = Math.max(0, n - 1); document.getElementById('slider').value = pos;
  document.getElementById('pos').textContent = n ? (pos + 1) + ' / ' + n + ' · ' + new Date(steps[pos].t).toLocaleTimeString() : 'no steps yet';
  const shipped = DATA.items.filter((i) => i.status === 'shipped').length;
  const flagged = DATA.calls.filter((c) => c.flags.length).length, tokens = DATA.calls.reduce((n, c) => n + total(c.tokens), 0);
  document.getElementById('meta').textContent = DATA.items.length + ' items · ' + shipped + ' shipped · ' + DATA.calls.length + ' agent calls · ' + num(tokens) + ' tokens · ' + flagged + ' flagged · written ' + new Date(DATA.at).toLocaleString();
  document.getElementById('steps').innerHTML = steps.map((st, i) => '<div class="step' + (i === pos ? ' on' : '') + (i > pos ? ' future' : '') + '" data-i="' + i + '"><span class="n">' + (i + 1) + '</span><span>' + label(st) + '</span></div>').join('');
  const on = document.querySelector('.step.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  const s = stateAt(pos), cur = steps[pos], curItem = cur ? (cur.type === 'call' ? cur.c.item : cur.e.item) : null;
  const disc = DATA.items.filter((i) => i.job === 'discover' && s[i.id]);
  const cards = (list) => list.map((i) => '<div class="card' + (i.id === curItem ? ' sel' : '') + '" data-item="' + i.id + '"><div><b>#' + i.id + '</b> ' + esc(i.title) + '</div><span class="pill status-' + s[i.id].status + '">' + esc(s[i.id].status) + '</span> <span class="mute">' + esc(s[i.id].job) + '</span></div>').join('') || '<div class="mute">—</div>';
  const delivery = DATA.items.filter((i) => i.job !== 'discover' && s[i.id] && s[i.id].status !== 'candidate');
  const raw = disc[0]?.source || '';
  document.getElementById('board').innerHTML =
    '<div class="col"><h3>Raw input</h3><pre style="max-height:160px">' + esc(raw.slice(0, 1500)) + '</pre></div>' +
    '<div class="col"><h3>Discovery</h3>' + cards(disc) + '</div>' +
    '<div class="col"><h3>Queue</h3>' + cards(DATA.items.filter((i) => i.job !== 'discover' && (s[i.id]?.status === 'candidate' || (s[i.id]?.status === 'queued' && s[i.id].job === 'ideate')))) + '</div>' +
    ['ideation','planning','implementation','verification'].map((stage) => {
      const jobs = { ideation: ['ideate','challenge'], planning: ['plan','test-plan'], implementation: ['implement'], verification: ['verify','arbitrate'] }[stage];
      return '<div class="col"><h3>' + stage + '</h3>' + cards(delivery.filter((i) => jobs.includes(s[i.id].job) && !['shipped','queued'].includes(s[i.id].status))) + '</div>';
    }).join('') +
    '<div class="col"><h3>Shipped</h3>' + cards(delivery.filter((i) => s[i.id].status === 'shipped')) + '</div>';
  document.getElementById('detail').innerHTML = selected ? itemDetail(selected) : cur ? stepDetail(cur) : '<span class="mute">Waiting for the first step…</span>';
}
function stepDetail(st) {
  if (st.type === 'call') {
    const c = st.c;
    return '<h2 style="margin:0 0 8px;font-size:16px">' + esc(c.profile) + ' · ' + esc(c.kind) + ' · ' + esc(c.job) + ' <span class="mute">item #' + c.item + '</span></h2>' +
      '<div class="kv"><div>card</div><div>' + esc(c.card.harness + ' · ' + c.card.provider + ' · ' + c.card.model + ' · ' + c.card.effort) + '</div><div>outcome</div><div>' + esc(c.outcome) + '</div><div>started</div><div>' + esc(c.started) + ' (' + (c.ms / 1000).toFixed(1) + 's)</div>' +
      '<div>tokens</div><div>' + (c.tokens ? num(total(c.tokens)) + ' <span class="mute">= ' + num(c.tokens.input) + ' in · ' + num(c.tokens.output) + ' out · ' + num(c.tokens.cacheRead) + ' cache read · ' + num(c.tokens.cacheWrite) + ' cache write</span>' : '<span class="mute">not reported</span>') + '</div>' +
      '<div>raw stream</div><div>' + num(c.rawBytes) + ' bytes <span class="mute">· <code>mw export ' + c.item + '</code></span></div></div>' +
      '<h3>Rule breaks</h3>' + (c.flags.length ? '<ul class="flags">' + c.flags.map((f) => '<li><span class="pill flag">' + esc(f.rule) + '</span> <code>' + esc(JSON.stringify(f.evidence)) + '</code></li>').join('') + '</ul>' : '<div class="mute">' + (c.facts ? 'none' : 'not checked: no facts recorded') + '</div>') +
      '<h3>Tool calls (' + c.tools.length + ')</h3>' + (c.tools.length ? '<table class="tools"><tr><th class="num">#</th><th>tool</th><th>input digest</th><th class="num">in bytes</th><th class="num">out bytes</th><th class="num">tokens</th><th>at</th><th class="num">ms</th></tr>' + c.tools.map((t) => '<tr' + (t.error ? ' class="err"' : '') + '><td class="num">' + t.seq + '</td><td>' + esc(t.tool) + (t.error ? ' (error)' : '') + '</td><td><code>' + esc(t.digest) + '</code></td><td class="num">' + num(t.inputBytes) + '</td><td class="num">' + num(t.outputBytes) + '</td><td class="num">' + (t.tokens ?? '—') + '</td><td>' + esc(t.at ? new Date(t.at).toLocaleTimeString() : '—') + '</td><td class="num">' + (t.ms ?? '—') + '</td></tr>').join('') + '</table>' : '<div class="mute">none</div>') +
      (c.output ? '<h3>Answer</h3><pre>' + esc(c.output) + '</pre>' : '') + (c.error ? '<h3>Error</h3><pre>' + esc(c.error) + '</pre>' : '') +
      (c.facts ? '<details><summary>Facts</summary><pre>' + esc(JSON.stringify(c.facts, null, 2)) + '</pre></details>' : '') +
      '<details><summary>Packet (prompt)</summary><pre>' + esc(c.prompt) + '</pre></details><details><summary>System prompt</summary><pre>' + esc(c.system) + '</pre></details>';
  }
  return '<h2 style="margin:0 0 8px;font-size:16px">' + esc(st.e.kind) + ' <span class="mute">' + (st.e.item ? 'item #' + st.e.item : 'the runner') + ' · ' + esc(st.e.at) + '</span></h2><pre>' + esc(JSON.stringify(st.e.data, null, 2)) + '</pre>';
}
function itemDetail(id) {
  const i = itemById(id); if (!i) return '';
  return '<h2 style="margin:0 0 8px;font-size:16px">#' + i.id + ' ' + esc(i.title) + ' <button onclick="selected=null;render()">close</button></h2><div class="kv"><div>status now</div><div>' + esc(i.status) + '</div><div>objective</div><div>' + esc(i.objective) + '</div>' + (i.shipped ? '<div>shipped</div><div>' + esc(i.shipped.command) + '</div>' : '') + (i.hold ? '<div>hold</div><div>' + esc(i.hold.code + ': ' + i.hold.message) + '</div>' : '') + '</div>' +
    Object.entries(i.outputs || {}).map(([job, out]) => '<details><summary>' + esc(job) + ' deliverable</summary><pre>' + esc(out) + '</pre></details>').join('') + '<details><summary>Record</summary><pre>' + esc(JSON.stringify(i, null, 2)) + '</pre></details>';
}
const go = (i) => { pos = Math.max(0, Math.min(steps.length - 1, i)); selected = null; render(); };
document.getElementById('steps').onclick = (ev) => { const el = ev.target.closest('.step'); if (el) go(+el.dataset.i); };
document.getElementById('board').onclick = (ev) => { const el = ev.target.closest('.card'); if (el) { selected = +el.dataset.item; render(); } };
document.getElementById('slider').oninput = (ev) => go(+ev.target.value);
document.getElementById('first').onclick = () => go(0); document.getElementById('last').onclick = () => go(steps.length - 1);
document.getElementById('prev').onclick = () => go(pos - 1); document.getElementById('next').onclick = () => go(pos + 1);
document.getElementById('play').onclick = () => { if (timer) { clearInterval(timer); timer = null; document.getElementById('play').textContent = '▶ Play'; return; } document.getElementById('play').textContent = '⏸ Pause'; timer = setInterval(() => { if (pos >= steps.length - 1) { clearInterval(timer); timer = null; document.getElementById('play').textContent = '▶ Play'; } else go(pos + 1); }, 700); };
document.onkeydown = (ev) => { if (ev.key === 'ArrowRight') go(pos + 1); if (ev.key === 'ArrowLeft') go(pos - 1); };
build(); pos = Math.max(0, steps.length - 1); render();
</script></body></html>`
