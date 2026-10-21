// The glass: one page that replays the whole flow from the record, from raw input through discovery to
// every item shipped. Every event and every agent call is a step; each call shows its full system
// prompt, packet, answer and the harness's raw transcript. `mw serve` keeps it live; `mw replay` writes it out.
import type { openStore } from './store.ts'

export const snapshot = (store: ReturnType<typeof openStore>) => ({ items: store.list(), events: store.allEvents(), calls: store.calls(), at: new Date().toISOString() })

export const replayHtml = (data: ReturnType<typeof snapshot>, live: boolean) => `<!doctype html>
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
details summary { cursor:pointer; color:var(--mute); margin:8px 0 } .kv { display:grid; grid-template-columns:120px 1fr; gap:4px 12px } .kv div:nth-child(odd) { color:var(--mute) }
</style></head><body>
<header><h1>Made Well · the glass</h1><span class="mute" id="meta"></span>
<button id="first">⏮</button><button id="prev">◀</button><button id="play">▶ Play</button><button id="next">▶</button><button id="last">⏭ Now</button>
<input type="range" id="slider" min="0" value="0"><span id="pos" class="mute"></span></header>
<main><div id="steps"></div><div id="right"><div class="board" id="board"></div><div class="detail" id="detail"></div></div></main>
<script>
let DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')};
const LIVE = ${live};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LANE = ['discover','ideate','challenge','plan','test-plan','implement','verify','arbitrate'];
let steps = [], pos = 0, follow = true, timer = null, selected = null;
function build() {
  steps = [...DATA.events.map((e) => ({ t: e.at, type: 'event', e })), ...DATA.calls.map((c) => ({ t: c.started, type: 'call', c }))]
    .sort((a, b) => a.t.localeCompare(b.t) || (a.type === 'call' ? -1 : 1));
}
function stateAt(n) {
  const s = {};
  for (const st of steps.slice(0, n + 1)) {
    if (st.type !== 'event') continue;
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
function label(st) {
  if (st.type === 'call') { const c = st.c; return '<b>' + esc(c.profile) + '</b> · ' + esc(c.kind) + ' ' + esc(c.job) + ' <span class="mute">#' + c.item + ' · ' + esc(c.card.harness + ' ' + c.card.model) + ' · ' + (c.ms / 1000).toFixed(1) + 's</span>' + (c.outcome !== 'ok' ? ' <span class="pill status-held">' + esc(c.outcome) + '</span>' : ''); }
  const e = st.e, d = e.data; let extra = '';
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
  document.getElementById('meta').textContent = DATA.items.length + ' items · ' + shipped + ' shipped · ' + DATA.calls.length + ' agent calls' + (LIVE ? ' · live' : ' · recorded ' + new Date(DATA.at).toLocaleString());
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
      '<div class="kv"><div>card</div><div>' + esc(c.card.harness + ' · ' + c.card.provider + ' · ' + c.card.model + ' · ' + c.card.effort) + '</div><div>outcome</div><div>' + esc(c.outcome) + '</div><div>started</div><div>' + esc(c.started) + ' (' + (c.ms / 1000).toFixed(1) + 's)</div></div>' +
      (c.output ? '<h3>Answer</h3><pre>' + esc(c.output) + '</pre>' : '') + (c.error ? '<h3>Error</h3><pre>' + esc(c.error) + '</pre>' : '') +
      '<details><summary>Packet (prompt)</summary><pre>' + esc(c.prompt) + '</pre></details><details><summary>System prompt</summary><pre>' + esc(c.system) + '</pre></details>' +
      (c.raw ? '<details><summary>Raw harness transcript (' + c.raw.length + ' bytes)</summary><pre>' + esc(c.raw) + '</pre></details>' : '');
  }
  return '<h2 style="margin:0 0 8px;font-size:16px">' + esc(st.e.kind) + ' <span class="mute">item #' + st.e.item + ' · ' + esc(st.e.at) + '</span></h2><pre>' + esc(JSON.stringify(st.e.data, null, 2)) + '</pre>';
}
function itemDetail(id) {
  const i = itemById(id); if (!i) return '';
  return '<h2 style="margin:0 0 8px;font-size:16px">#' + i.id + ' ' + esc(i.title) + ' <button onclick="selected=null;render()">close</button></h2><div class="kv"><div>status now</div><div>' + esc(i.status) + '</div><div>objective</div><div>' + esc(i.objective) + '</div>' + (i.shipped ? '<div>shipped</div><div>' + esc(i.shipped.command) + '</div>' : '') + (i.hold ? '<div>hold</div><div>' + esc(i.hold.code + ': ' + i.hold.message) + '</div>' : '') + '</div>' +
    Object.entries(i.outputs || {}).map(([job, out]) => '<details><summary>' + esc(job) + ' deliverable</summary><pre>' + esc(out) + '</pre></details>').join('') + '<details><summary>Record</summary><pre>' + esc(JSON.stringify(i, null, 2)) + '</pre></details>';
}
const go = (i) => { pos = Math.max(0, Math.min(steps.length - 1, i)); follow = pos === steps.length - 1; selected = null; render(); };
document.getElementById('steps').onclick = (ev) => { const el = ev.target.closest('.step'); if (el) go(+el.dataset.i); };
document.getElementById('board').onclick = (ev) => { const el = ev.target.closest('.card'); if (el) { selected = +el.dataset.item; render(); } };
document.getElementById('slider').oninput = (ev) => go(+ev.target.value);
document.getElementById('first').onclick = () => go(0); document.getElementById('last').onclick = () => go(steps.length - 1);
document.getElementById('prev').onclick = () => go(pos - 1); document.getElementById('next').onclick = () => go(pos + 1);
document.getElementById('play').onclick = () => { if (timer) { clearInterval(timer); timer = null; document.getElementById('play').textContent = '▶ Play'; return; } document.getElementById('play').textContent = '⏸ Pause'; timer = setInterval(() => { if (pos >= steps.length - 1) { clearInterval(timer); timer = null; document.getElementById('play').textContent = '▶ Play'; } else go(pos + 1); }, 700); };
document.onkeydown = (ev) => { if (ev.key === 'ArrowRight') go(pos + 1); if (ev.key === 'ArrowLeft') go(pos - 1); };
build(); pos = Math.max(0, steps.length - 1); render();
if (LIVE) setInterval(async () => { try { const d = await (await fetch('data.json', { cache: 'no-store' })).json(); if (d.events.length + d.calls.length !== DATA.events.length + DATA.calls.length || d.items.some((x, k) => DATA.items[k]?.updated !== x.updated)) { DATA = d; build(); if (follow) pos = steps.length - 1; render(); } } catch {} }, 2000);
</script></body></html>`
