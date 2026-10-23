// The console page `mw ui` serves: one self-contained document (no network beyond its own server) that polls
// the store's mark every second and redraws when anything moved. Written with String.raw, so its script keeps
// its backslashes; the script uses no template literals.
export const CONSOLE = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Made Well · console</title>
<style>
:root { --ink:#111827; --mute:#6b7280; --faint:#9ca3af; --line:#e5e7eb; --bg:#f5f6f8; --card:#fff;
  --blue:#2563eb; --blue-bg:#eff4ff; --green:#15803d; --green-bg:#ecfdf3; --red:#b91c1c; --red-bg:#fef2f2;
  --amber:#b45309; --amber-bg:#fffbeb; --violet:#7c3aed; --violet-bg:#f5f3ff; --gray-bg:#f3f4f6;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
* { box-sizing:border-box }
body { margin:0; font:14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color:var(--ink); background:var(--bg) }
.top { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:14px; padding:10px 22px; background:#fff; border-bottom:1px solid var(--line) }
.top h1 { font-size:15px; margin:0; font-weight:650 } .top .path { color:var(--mute); font:12px var(--mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0 }
.top .grow { flex:1 }
.pill { display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:2px 10px; border-radius:999px; white-space:nowrap; font-weight:500 }
.pill.ok { color:var(--green); background:var(--green-bg) } .pill.warn { color:var(--amber); background:var(--amber-bg) } .pill.bad { color:var(--red); background:var(--red-bg) } .pill.mute { color:var(--mute); background:var(--gray-bg) }
.dot { width:7px; height:7px; border-radius:50%; background:currentColor }
.dot.pulse { animation:pulse 1.4s infinite } @keyframes pulse { 50% { opacity:.25 } }
main { max-width:1440px; margin:0 auto; padding:18px 22px 60px; display:grid; gap:16px }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:18px 20px; min-width:0 }
.card > h2 { margin:0 0 12px; font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); font-weight:600; display:flex; gap:8px; align-items:baseline }
.card > h2 .sub { text-transform:none; letter-spacing:0; font-weight:400; color:var(--faint) }
button { font:inherit; font-weight:500; padding:7px 14px; border:1px solid var(--line); background:#fff; border-radius:8px; cursor:pointer; color:var(--ink) }
button:hover { border-color:#9ca3af } button.primary { background:var(--blue); color:#fff; border-color:var(--blue) } button.on { background:var(--blue-bg); border-color:var(--blue); color:var(--blue) }
button.small { padding:2px 8px; font-size:12px }
.controls { display:flex; gap:8px; align-items:center; flex-wrap:wrap } .controls .pos { margin-left:auto; font:13px var(--mono); color:var(--mute) }
.bar { margin-top:14px; height:6px; background:var(--gray-bg); border-radius:99px; cursor:pointer; position:relative } .bar > div { height:100%; background:var(--blue); border-radius:99px }
.now { display:grid; grid-template-columns:auto 1fr; gap:6px 14px; align-items:baseline }
.badge { font:600 11px var(--mono); letter-spacing:.06em; text-transform:uppercase; padding:3px 8px; border-radius:6px; white-space:nowrap }
.a-operator { color:var(--violet); background:var(--violet-bg) } .a-agent { color:var(--blue); background:var(--blue-bg) } .a-made { color:var(--green); background:var(--green-bg) } .a-runner { color:var(--mute); background:var(--gray-bg) }
.now .head { font-size:19px; font-weight:600 } .now .last { font-size:14px } .now .why { color:var(--mute); margin-bottom:8px } .now code { font:12px var(--mono); background:var(--gray-bg); padding:1px 6px; border-radius:5px }
.flights { margin-top:14px; display:grid; gap:8px }
.flight { border:1px solid #c7d7fe; background:var(--blue-bg); border-radius:10px; padding:10px 12px; cursor:pointer }
.flight.cut { border-color:#fcd34d; background:var(--amber-bg) }
.flight .l1 { display:flex; gap:10px; align-items:baseline; flex-wrap:wrap } .flight .t { font:13px var(--mono); margin-left:auto; color:var(--blue) } .flight.cut .t { color:var(--amber) }
.flight .l2 { font:12px var(--mono); color:#374151; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.lanes { display:grid; grid-template-columns: 1.15fr .85fr 3.2fr .7fr; gap:12px }
.lane { border:1px dashed #d1d5db; border-radius:10px; padding:12px; min-width:0 }
.lane h3 { margin:0 0 10px; font-size:13px; font-weight:650; letter-spacing:.02em } .lane.op h3 { color:var(--violet) }
.stages { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:8px }
.stage { border:1px solid var(--line); border-radius:10px; padding:10px; min-height:120px; min-width:0 } .stage.hot { border:2px solid var(--blue); padding:9px }
.stage b { display:block; font-size:14px } .stage .jobs { font:12px var(--mono); color:var(--mute); margin:2px 0 8px }
.steps { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px }
.step { font-size:12px; border:1px solid #bbf7d0; color:var(--green); background:var(--green-bg); padding:2px 8px; border-radius:6px }
.lane.op .step { border-color:#ddd6fe; color:var(--violet); background:var(--violet-bg) }
.chips { display:flex; flex-wrap:wrap; gap:6px }
.chip { font:12px var(--mono); padding:3px 8px; border-radius:6px; cursor:pointer; border:1px solid transparent; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.chip:hover { border-color:currentColor }
.s-running, .s-queued { color:var(--blue); background:var(--blue-bg) } .s-held { color:var(--red); background:var(--red-bg) } .s-shipped, .s-discovered { color:var(--green); background:var(--green-bg) }
.s-candidate, .s-waiting-quota, .s-waiting-prerequisite { color:var(--amber); background:var(--amber-bg) } .s-dropped { color:var(--faint); background:var(--gray-bg); text-decoration:line-through }
.chip.live { animation:ring 1.4s infinite } @keyframes ring { 0%, 100% { box-shadow:0 0 0 2px var(--blue) inset } 50% { box-shadow:0 0 0 2px #93b4fb inset } }
.done-n { font-size:32px; font-weight:700; color:var(--green); text-align:center; margin:6px 0 }
.row3 { display:grid; grid-template-columns: 1fr 1.15fr 1.15fr; gap:16px }
.term { background:#fbfbfc; border:1px solid var(--line); border-radius:10px; padding:14px 16px; font:13px/1.65 var(--mono); white-space:pre-wrap; word-break:break-word; max-height:560px; overflow:auto }
.term .g { color:var(--green) } .term .m { color:var(--mute) } .term .r { color:var(--red) } .term .b { color:var(--blue) }
table { border-collapse:collapse; width:100% } th { text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); font-weight:600; padding:6px 8px; border-bottom:1px solid var(--line) }
td { padding:8px; border-bottom:1px solid #f1f2f4; vertical-align:top } tr.click { cursor:pointer } tr.click:hover td { background:#fafbff }
td.num, th.num { text-align:right; font-variant-numeric:tabular-nums } .id { font:13px var(--mono); color:var(--mute) } .meta { font-size:12px; color:var(--mute) }
.state { font:600 11px var(--mono); padding:2px 7px; border-radius:5px; text-transform:uppercase; white-space:nowrap }
.tiles { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px }
.tile { border:1px solid var(--line); border-radius:10px; padding:10px 12px } .tile .v { font:600 22px var(--mono) } .tile .k { font-size:12px; color:var(--mute) }
.tile.bad .v { color:var(--red) } .tile.ok .v { color:var(--green) }
.mins { margin-top:14px; display:grid; grid-template-columns: 110px 1fr 64px; gap:6px 10px; align-items:center; font-size:13px }
.mins .track { height:9px; background:var(--gray-bg); border-radius:99px; overflow:hidden } .mins .fill { height:100%; background:var(--blue) } .mins .fill.wait { background:var(--violet) } .mins .fill.quota { background:var(--amber) }
.mins .n { text-align:right; font:12px var(--mono); color:var(--mute) }
.log { max-height:520px; overflow:auto } .log td { font-size:13px } .log td.t { font:12px var(--mono); color:var(--mute); white-space:nowrap } .log tr.cur td { background:var(--blue-bg) } .log tr.future td { opacity:.35 }
.filter { display:flex; gap:8px; margin:-4px 0 10px } .filter input { flex:1; font:inherit; padding:6px 10px; border:1px solid var(--line); border-radius:8px }
.rule-ok { color:var(--green) } .rule-bad { color:var(--red); font-weight:600 }
.drawer { position:fixed; top:0; right:0; bottom:0; width:min(760px, 96vw); background:#fff; border-left:1px solid var(--line); box-shadow:-12px 0 32px rgba(17,24,39,.08); z-index:10; display:none; flex-direction:column }
.drawer.open { display:flex } .drawer header { display:flex; gap:10px; align-items:center; padding:14px 18px; border-bottom:1px solid var(--line) } .drawer header h3 { margin:0; font-size:16px; flex:1; min-width:0 }
.drawer .body { overflow:auto; padding:16px 18px 40px }
.drawer h4 { margin:18px 0 6px; font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute) }
.kv { display:grid; grid-template-columns:130px 1fr; gap:4px 12px; font-size:13px } .kv > div:nth-child(odd) { color:var(--mute) } .kv > div { min-width:0; overflow-wrap:anywhere }
pre { white-space:pre-wrap; word-break:break-word; background:#f8fafc; border:1px solid var(--line); border-radius:8px; padding:10px 12px; font:12px/1.5 var(--mono); max-height:460px; overflow:auto; margin:4px 0 }
details summary { cursor:pointer; color:var(--blue); margin:8px 0; font-size:13px }
.hold { border:1px solid #fecaca; background:var(--red-bg); border-radius:10px; padding:12px 14px } .hold b { color:var(--red) }
.cmd { display:flex; gap:8px; align-items:baseline; margin-top:6px } .cmd code { font:12px var(--mono); background:#fff; border:1px solid var(--line); padding:3px 8px; border-radius:6px; overflow-wrap:anywhere } .cmd span { font-size:12px; color:var(--mute) }
.span { display:grid; grid-template-columns: 1fr 70px; gap:8px; font:12px var(--mono); padding:2px 0 } .span .bar2 { height:6px; background:var(--blue); border-radius:3px; margin-top:6px; min-width:2px } .span.err { color:var(--red) } .span.err .bar2 { background:var(--red) }
.stream { font:12px/1.5 var(--mono); background:#0f172a; color:#e2e8f0; border-radius:8px; padding:10px 12px; max-height:520px; overflow:auto; white-space:pre-wrap; word-break:break-word }
.stream .k { color:#93c5fd } .stream .x { color:#94a3b8 }
.empty { color:var(--faint); font-size:13px }
@media (max-width: 1100px) { .lanes, .row3 { grid-template-columns:1fr } .stages { grid-template-columns:repeat(2, minmax(0,1fr)) } }
</style></head><body>
<div class="top"><h1>Made Well</h1><span class="path" id="path"></span><span class="grow"></span><span id="runner"></span><span id="conn" class="pill mute"><span class="dot"></span>connecting</span></div>
<main>
  <section class="card">
    <div class="controls">
      <button id="back">◀ Back</button><button id="step" class="primary">Step ▶</button><button id="play">Play</button><button id="live" class="on">● Live</button><button id="over">Start over</button>
      <span class="pos" id="pos"></span>
    </div>
    <div class="bar" id="bar"><div id="fill" style="width:0"></div></div>
  </section>
  <section class="card"><h2>Happening now <span class="sub" id="nowsub"></span></h2><div class="now" id="now"></div><div class="flights" id="flights"></div></section>
  <section class="card"><h2>Where the work is <span class="sub" id="lanesub"></span></h2><div class="lanes" id="lanes"></div></section>
  <div class="row3">
    <section class="card"><h2>What the operator sees <span class="sub">mw status</span></h2><div class="term" id="term"></div></section>
    <section class="card"><h2>The one list <span class="sub" id="listsub"></span></h2><div id="list"></div></section>
    <section class="card"><h2>Telemetry</h2><div class="tiles" id="tiles"></div><div class="mins" id="mins"></div></section>
  </div>
  <section class="card"><h2>Rules checked on this run <span class="sub">every agent call is checked against each rule; a break links to its call</span></h2><div id="rules"></div></section>
  <section class="card"><h2>Event log <span class="sub" id="logsub"></span></h2>
    <div class="filter"><input id="q" placeholder="Filter: an item (#3), a job, an actor, any word"></div>
    <div class="log" id="log"></div></section>
</main>
<aside class="drawer" id="drawer"><header><h3 id="dtitle"></h3><button class="small" id="dclose">Close ✕</button></header><div class="body" id="dbody"></div></aside>
<script>
var S = null, MARK = '', pos = -1, follow = true, timer = null, open = null, liveTail = null, lastOk = 0;
var LIVE_MS = 1000;
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function num(n) { return Number(n || 0).toLocaleString('en-US'); }
function clock(iso) { return iso ? new Date(iso).toLocaleTimeString('en-GB', { hour12: false }) : ''; }
function dur(ms) { ms = Math.max(0, ms); if (ms < 60000) return (ms / 1000).toFixed(1) + 's'; var m = Math.floor(ms / 60000); return m < 60 ? m + 'm ' + String(Math.round((ms % 60000) / 1000)).padStart(2, '0') + 's' : Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm'; }
function mins(m) { return m < 1 ? (m * 60).toFixed(0) + 's' : m < 90 ? m.toFixed(m < 10 ? 1 : 0) + ' min' : (m / 60).toFixed(1) + ' h'; }
function tok(t) { return t ? t.input + t.output + t.cacheRead + t.cacheWrite : 0; }
function actorClass(a) { return a === 'operator' ? 'a-operator' : a === 'agent' ? 'a-agent' : a === 'runner' ? 'a-runner' : 'a-made'; }
var STAGE_OF = { discover: 'discovery', ideate: 'ideation', challenge: 'ideation', plan: 'planning', 'test-plan': 'planning', implement: 'implementation', verify: 'verification', arbitrate: 'verification' };
var PROFILE = { discover: 'ideator', ideate: 'ideator', challenge: 'ideation peer', plan: 'planner', 'test-plan': 'test architect', implement: 'implementer', verify: 'made well', arbitrate: 'arbiter' };
var STAGES = [['ideation', 'Ideation', 'ideate · challenge'], ['planning', 'Planning', 'plan · test-plan'], ['implementation', 'Implementation', 'implement'], ['verification', 'Verification', 'verify · arbitrate']];
var RULES = {
  'write-under-read': 'A read-only call wrote nothing in its checkout',
  'head-moved': 'No call moved the branch head; only Made Well\'s ship does',
  'out-of-scope': 'A making call touched only the files its plan declared',
  'over-budget': 'Each call stayed inside its time and token budget',
  'tool-not-allowed': 'Each call used only the tools its access allows',
  'missing-fields': 'Each answer carried every field its schema requires'
};
function item(id) { return S && S.items.find(function (i) { return i.id === id; }); }
function last() { return S ? S.events.length - 1 : -1; }

// The state of every item after step n, read from the events alone (the live end uses the record itself).
function stateAt(n) {
  var st = {};
  if (!S) return st;
  if (n >= last()) { S.items.forEach(function (i) { st[i.id] = { status: i.status, job: i.job, hold: i.hold && i.hold.code }; }); return st; }
  for (var k = 0; k <= n; k++) {
    var e = S.events[k], d = e.data; if (!e.item) continue;
    var it = st[e.item] || (st[e.item] = { status: 'queued', job: 'ideate' });
    if (e.kind === 'created') { it.status = d.status || 'queued'; it.job = d.job; }
    else if (e.kind === 'handed-off') { it.job = Array.isArray(d.to) ? 'implement' : d.to; }
    else if (e.kind === 'call-started' || e.kind === 'running' || e.kind === 'retried') { if (d.job) it.job = d.job; it.status = 'running'; }
    else if (e.kind === 'failure') { it.job = 'arbitrate'; }
    else if (e.kind === 'ruling') { if (d.to) it.job = d.to; it.status = d.prerequisite ? 'waiting-prerequisite' : 'running'; }
    else if (e.kind === 'verify-started' || e.kind === 'prerequisite-shipped') { it.job = 'verify'; it.status = 'running'; }
    else if (e.kind === 'held') { it.status = 'held'; it.hold = d.code; }
    else if (e.kind === 'shipped' || e.kind === 'discovered' || e.kind === 'dropped' || e.kind === 'waiting-quota') { it.status = e.kind; }
    else if (e.kind === 'promoted' || e.kind === 'nq-corrected' || (e.kind === 'nq-answer' && d.originator === 'operator')) { it.status = 'queued'; it.hold = null; }
  }
  return st;
}
// What was in flight at step n: started and not finished by then.
function flightsAt(n) {
  if (n >= last()) return S.flights;
  var open = {}, ends = { 'call-finished': 'call-started', prepared: 'prepare-started', verified: 'verify-started', shipped: 'ship-started' };
  for (var k = 0; k <= n; k++) {
    var e = S.events[k], d = e.data, key;
    if (/-started$/.test(e.kind) && !/^runner-/.test(e.kind)) { key = e.item + ':' + e.kind + ':' + (d.job || '') + ':' + (d.kind || '') + ':' + (d.name || ''); open[key] = { item: e.item, what: e.kind === 'call-started' ? (d.kind === 'execute' ? 'job' : d.kind) + ' · ' + d.job : e.kind.replace('-started', ''), who: d.profile || 'made well', since: e.at, card: d.card ? [d.card.harness, d.card.model, d.card.effort].join(' · ') : '', live: d.live }; }
    var start = ends[e.kind] || ((e.kind === 'failure' || e.kind === 'held') ? 'verify-started' : null);
    if (start) Object.keys(open).forEach(function (x) { if (x.indexOf(e.item + ':' + start + ':') === 0 && (start !== 'call-started' || x.indexOf(':' + d.job + ':' + d.kind + ':') > 0) && (start !== 'prepare-started' || x.slice(-(':' + d.name).length) === ':' + d.name)) delete open[x]; });
    if (e.kind === 'runner-started' || e.kind === 'runner-stopped' || e.kind === 'runner-lost') open = {};
  }
  return Object.keys(open).map(function (x) { return open[x]; });
}

function render() {
  if (!S) return;
  if (follow || pos > last()) pos = last();
  var n = S.events.length, cur = S.events[pos];
  $('pos').textContent = n ? clock(cur && cur.at) + ' · step ' + (pos + 1) + ' of ' + n : 'no steps yet';
  $('fill').style.width = n ? ((pos + 1) / n * 100) + '%' : '0';
  $('live').className = follow ? 'on' : '';
  renderNow(cur); renderLanes(); renderTerm(); renderList(); renderTiles(); renderRules(); renderLog();
  if (open && open.type === 'item') drawItem(open.id, true);
}

function renderNow(cur) {
  var at = pos >= last();
  $('nowsub').textContent = at ? 'live' : 'at step ' + (pos + 1) + ', ' + clock(cur && cur.at);
  var fl = flightsAt(pos);
  if (!cur) { $('now').innerHTML = '<div class="empty">Nothing recorded yet. Start with <code>mw discover --source-file notes.md</code> or <code>mw start --objective "…"</code> in a registered project.</div>'; }
  else {
    var it = item(cur.item), html = '';
    // At the live end with nothing running, what matters is what stands still and why.
    if (at && !fl.filter(function (f) { return !f.cutOff; }).length) {
      var held = S.items.filter(function (i) { return i.status === 'held'; }), moving = S.items.filter(function (i) { return ['queued', 'running', 'waiting-quota', 'waiting-prerequisite'].indexOf(i.status) >= 0; });
      if (held.length) html += '<span class="badge a-operator">you</span><span class="head">' + held.length + ' item' + (held.length === 1 ? ' waits' : 's wait') + ' on you</span><span></span><span class="why">' +
        held.map(function (i) { var v = (S.board.items || []).find(function (x) { return x.id === i.id; }) || {}; return '<a href="#" data-item="' + i.id + '">#' + i.id + '</a> ' + esc(i.hold.code) + ': ' + esc(i.hold.message) + ((v.next || [])[0] ? ' <code>' + esc(v.next[0].run) + '</code>' : ''); }).join('<br>') + '</span>';
      else if (moving.length && !S.runner) html += '<span class="badge a-runner">stopped</span><span class="head">' + moving.length + ' item' + (moving.length === 1 ? '' : 's') + ' can move, but no runner is driving</span><span></span><span class="why">Run <code>mw run</code>; every item resumes where it stopped.</span>';
      else if (!moving.length) html += '<span class="badge a-made">idle</span><span class="head">Nothing is moving and nothing waits on you</span><span></span><span class="why">' + esc((S.board.summary || '')) + '</span>';
    }
    html += '<span class="badge ' + actorClass(cur.actor) + '">' + esc(cur.actor) + '</span><span class="' + (html ? 'last' : 'head') + '">' + (html ? 'Last: ' : '') + esc(cur.say) + '</span><span></span><span class="why">' +
      (it ? '<a href="#" data-item="' + it.id + '">#' + it.id + '</a> ' + esc(it.title) + ' · ' : '') + esc(cur.kind) + ' · ' + clock(cur.at) + ' · <a href="#" data-ev="' + cur.seq + '">every variable</a></span>';
    $('now').innerHTML = html;
  }
  $('flights').innerHTML = fl.map(function (f, i) {
    var it = item(f.item), cut = at && f.cutOff;
    return '<div class="flight' + (cut ? ' cut' : '') + '" data-fl="' + i + '"><div class="l1"><b>#' + f.item + ' ' + esc(f.what) + '</b><span class="meta">' + esc(f.who) + (f.card ? ' · ' + esc(f.card) : '') + '</span><span class="meta">' + esc(it ? it.title : '') + '</span>' +
      '<span class="t" data-since="' + esc(f.since) + '" data-cut="' + (cut ? 1 : 0) + '">' + (cut ? 'cut off · no runner' : at ? dur(Date.now() - Date.parse(f.since)) : 'running') + '</span></div>' +
      (f.live && at ? '<div class="l2" data-tail="' + esc(f.live.split('/').pop()) + '">waiting for output…</div>' : '') + '</div>';
  }).join('');
  if (at) fl.forEach(function (f) { if (f.live) peek(f.live.split('/').pop()); });
}

var peeks = {};
function peek(name) {
  if (peeks[name] && Date.now() - peeks[name].t < 1500) return show();
  fetch('api/live/' + encodeURIComponent(name) + '?from=0').then(function (r) { return r.json(); }).then(function (d) { peeks[name] = { t: Date.now(), line: lastLine(d.text) }; show(); }).catch(function () {});
  function show() { document.querySelectorAll('[data-tail="' + name + '"]').forEach(function (el) { el.textContent = peeks[name] ? (peeks[name].line || 'no output yet') : ''; }); }
}
function lastLine(text) {
  var lines = (text || '').split('\n').filter(function (l) { return l.trim(); });
  for (var i = lines.length - 1; i >= 0; i--) { var s = streamText(lines[i]); if (s) return s; }
  return '';
}
function streamText(line) {
  var t = line.trim();
  if (t[0] !== '{') return t;
  try { var m = JSON.stringify(JSON.parse(t)).match(/"(?:text|content|message|result|command|delta)":"((?:[^"\\]|\\.){2,})"/); return m ? m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').slice(0, 400) : ''; } catch (e) { return t; }
}

function chip(i, st, live) {
  var s = st[i.id]; if (!s) return '';
  var label = '#' + i.id + (s.status === 'held' ? ' held ' + (s.hold || '') : s.status === 'candidate' ? ' ' + i.title : s.status === 'shipped' || s.status === 'discovered' ? '' : ' ' + s.job);
  return '<span class="chip s-' + s.status + (live ? ' live' : '') + '" data-item="' + i.id + '" title="' + esc(i.title + ' · ' + s.status + ' · ' + s.job) + '">' + esc(label) + '</span>';
}
function renderLanes() {
  var st = stateAt(pos), fl = flightsAt(pos), flying = {};
  fl.forEach(function (f) { flying[f.item] = true; });
  $('lanesub').textContent = pos >= last() ? 'live' : 'as it was at step ' + (pos + 1);
  var its = S.items.filter(function (i) { return st[i.id]; });
  var gone = function (s) { return ['held', 'candidate', 'shipped', 'dropped', 'discovered'].indexOf(s.status) >= 0; };
  var disc = its.filter(function (i) { return i.job === 'discover'; });
  var op = its.filter(function (i) { return st[i.id].status === 'held' || st[i.id].status === 'candidate'; });
  var done = its.filter(function (i) { return st[i.id].status === 'shipped'; });
  var dropped = its.filter(function (i) { return st[i.id].status === 'dropped'; });
  var html = '<div class="lane"><h3>DISCOVERY</h3><div class="steps"><span class="step">raw input</span><span class="step">discover</span><span class="step">candidates</span></div><div class="chips">' +
    (disc.length ? disc.map(function (i) { return chip(i, st, flying[i.id]) + (st[i.id].status === 'discovered' ? ' <span class="meta">→ ' + S.items.filter(function (c) { return c.discovery === i.id; }).length + ' candidates</span>' : ''); }).join('') : '<span class="empty">no discovery runs</span>') + '</div></div>';
  html += '<div class="lane op"><h3>OPERATOR</h3><div class="steps"><span class="step">promote</span><span class="step">answer</span><span class="step">retry · drop</span></div><div class="chips">' + (op.length ? op.map(function (i) { return chip(i, st); }).join('') : '<span class="empty">nothing needs you</span>') + '</div></div>';
  html += '<div class="lane"><h3>DELIVERY</h3><div class="stages">' + STAGES.map(function (sg) {
    var here = its.filter(function (i) { return i.job !== 'discover' && !gone(st[i.id]) && STAGE_OF[st[i.id].job] === sg[0]; });
    var hot = here.some(function (i) { return flying[i.id]; });
    return '<div class="stage' + (hot ? ' hot' : '') + '"><b>' + sg[1] + '</b><div class="jobs">' + sg[2] + '</div><div class="chips">' + here.map(function (i) { return chip(i, st, flying[i.id]); }).join('') + '</div></div>';
  }).join('') + '</div></div>';
  html += '<div class="lane"><h3>DONE</h3><div class="done-n">' + done.length + '</div><div class="chips">' + done.map(function (i) { return chip(i, st); }).join('') + '</div>' + (dropped.length ? '<div class="meta" style="margin-top:8px">dropped</div><div class="chips">' + dropped.map(function (i) { return chip(i, st); }).join('') + '</div>' : '') + '</div>';
  $('lanes').innerHTML = html;
}

function renderTerm() {
  var b = S.board || {}, items = b.items || [];
  var g = function (f) { return items.filter(f); };
  var now = g(function (i) { return ['running', 'waiting-quota', 'waiting-prerequisite'].indexOf(i.status) >= 0; });
  var held = g(function (i) { return i.status === 'held'; }), todo = g(function (i) { return i.status === 'queued' || i.status === 'candidate'; }), done = g(function (i) { return i.status === 'shipped'; });
  var line = function (i, extra) { return '  <span class="m">#' + i.id + '</span> ' + esc(i.title) + (extra ? ' <span class="m">' + esc(extra) + '</span>' : ''); };
  var ws = S.items.length ? S.items[S.items.length - 1].workspace.split('/').filter(Boolean).pop() : 'madewell';
  var out = '<b>' + esc(ws) + '</b>  ' + (held.length ? '<span class="r">' + held.length + ' need' + (held.length === 1 ? 's' : '') + ' you</span>' : '<span class="g">nothing needs you</span>') + '\n<span class="m">' + esc(b.summary || '') + '</span>\n\n';
  out += 'NOW ' + now.length + '\n' + (now.map(function (i) { return line(i, '▸ ' + i.stage + ' · ' + i.job + ' · ' + i.profile + (S.runner ? '' : ' · no runner')); }).join('\n') || '  <span class="m">—</span>') + '\n\n';
  if (held.length) out += '<span class="r">NEEDS YOU ' + held.length + '</span>\n' + held.map(function (i) { return line(i, (i.hold ? i.hold.code : '') + ' · ' + i.job) + (i.next || []).slice(0, 1).map(function (n) { return '\n    <span class="b">' + esc(n.run) + '</span>'; }).join(''); }).join('\n') + '\n\n';
  out += 'TO-DO ' + todo.length + '\n' + (todo.map(function (i) { return line(i, i.status === 'candidate' ? 'candidate' : 'queued'); }).join('\n') || '  <span class="m">—</span>') + '\n\n';
  out += '<span class="g">DONE ' + done.length + '</span>' + (done.length ? ' ' + done.map(function (i) { return '#' + i.id; }).join(' ') : '') + '\n';
  if ((b.next || []).length) out += '\nNEXT\n' + b.next.slice(0, 4).map(function (n) { return '  <span class="b">' + esc(n.run) + '</span>\n  <span class="m">' + esc(n.why) + '</span>'; }).join('\n');
  $('term').innerHTML = out;
}

function renderList() {
  var rows = S.items.slice().reverse();
  $('listsub').textContent = rows.length + ' items';
  $('list').innerHTML = rows.length ? '<table><tr><th>#</th><th>Item</th><th>State</th></tr>' + rows.map(function (i) {
    var where = i.job === 'discover' ? 'discovery' : 'delivery · ' + (STAGE_OF[i.job] || '') + ' · ' + i.job + ' · ' + (PROFILE[i.job] || '');
    var from = i.discovery ? ' · from #' + i.discovery : i.parent ? ' · fix for #' + i.parent : '';
    return '<tr class="click" data-item="' + i.id + '"><td class="id">#' + i.id + '</td><td>' + esc(i.title) + '<div class="meta">' + esc(where + from) + (i.hold ? ' · <span style="color:var(--red)">' + esc(i.hold.code) + '</span>' : '') + '</div></td><td><span class="state s-' + i.status + '">' + esc(i.status) + '</span></td></tr>';
  }).join('') + '</table>' : '<div class="empty">No items yet.</div>';
}

function renderTiles() {
  var c = function (s) { return S.items.filter(function (i) { return s.indexOf(i.status) >= 0; }).length; };
  var held = S.events.filter(function (e) { return e.kind === 'held'; }).length;
  var wait = 0, totals = {};
  Object.keys(S.minutes).forEach(function (id) { var m = S.minutes[id]; Object.keys(m).forEach(function (k) { totals[k] = (totals[k] || 0) + m[k]; }); });
  wait = totals['operator wait'] || 0;
  var pass = 0, fail = 0;
  S.items.forEach(function (i) { (i.verification ? i.verification.results : []).forEach(function (r) { if (r.exitCode === 0) pass++; else fail++; }); });
  var tokens = S.calls.reduce(function (n, x) { return n + tok(x.tokens); }, 0), agentMs = S.calls.reduce(function (n, x) { return n + x.ms; }, 0);
  var breaks = S.calls.reduce(function (n, x) { return n + x.flags.length; }, 0), failed = S.calls.filter(function (x) { return x.outcome !== 'ok'; }).length;
  var t = [[c(['candidate', 'queued']), 'to-do'], [c(['running', 'waiting-quota', 'waiting-prerequisite']), 'in progress'], [c(['shipped']), 'shipped', 'ok'],
    [c(['held']), 'need you now', c(['held']) ? 'bad' : ''], [held, 'operator stops'], [mins(wait), 'waited on operator'],
    [pass + '/' + (pass + fail), 'checks passed', fail ? '' : pass ? 'ok' : ''], [fail, 'checks failed', fail ? 'bad' : ''], [S.calls.length, 'agent calls'],
    [failed, 'calls failed or refused', failed ? 'bad' : ''], [mins(agentMs / 60000), 'agent time'], [tokens >= 1e6 ? (tokens / 1e6).toFixed(1) + 'M' : tokens >= 1e3 ? Math.round(tokens / 1e3) + 'k' : tokens, 'tokens'],
    [breaks, 'rule breaks', breaks ? 'bad' : 'ok'], [S.flights.length, 'steps running'], [S.spans ? (S.spans / 1024).toFixed(0) + ' KB' : '0', 'traces recorded']];
  $('tiles').innerHTML = t.map(function (x) { return '<div class="tile ' + (x[2] || '') + '"><div class="v">' + esc(x[0]) + '</div><div class="k">' + esc(x[1]) + '</div></div>'; }).join('');
  var rows = ['discovery', 'ideation', 'planning', 'implementation', 'verification', 'operator wait', 'quota wait'];
  var max = Math.max.apply(null, rows.map(function (r) { return totals[r] || 0; }).concat([0.0001]));
  $('mins').innerHTML = '<div class="meta" style="grid-column:1/-1">Time per stage, every item</div>' + rows.map(function (r) {
    var v = totals[r] || 0;
    return '<div>' + r[0].toUpperCase() + r.slice(1) + '</div><div class="track"><div class="fill' + (r === 'operator wait' ? ' wait' : r === 'quota wait' ? ' quota' : '') + '" style="width:' + (v / max * 100) + '%"></div></div><div class="n">' + mins(v) + '</div>';
  }).join('');
}

function renderRules() {
  var checked = S.calls.length;
  var html = '<table><tr><th>Rule</th><th class="num">Calls checked</th><th class="num">Breaks</th><th>Where</th></tr>' + Object.keys(RULES).map(function (r) {
    var bad = S.calls.filter(function (c) { return c.flags.some(function (f) { return f.rule === r; }); });
    return '<tr><td><span class="' + (bad.length ? 'rule-bad' : 'rule-ok') + '">' + (bad.length ? '✕' : '✓') + '</span> ' + esc(RULES[r]) + ' <span class="meta">' + r + '</span></td><td class="num">' + checked + '</td><td class="num">' + bad.length + '</td><td>' +
      bad.slice(0, 8).map(function (c) { return '<span class="chip s-held" data-call="' + c.id + '">#' + c.item + ' ' + esc(c.kind + ' ' + c.job) + '</span>'; }).join(' ') + '</td></tr>';
  }).join('') + '</table>';
  $('rules').innerHTML = html;
}

function renderLog() {
  var q = $('q').value.trim().toLowerCase();
  var rows = S.events.map(function (e, k) { return [e, k]; }).filter(function (x) {
    if (!q) return true; var e = x[0];
    if (/^#\d+$/.test(q)) return e.item === Number(q.slice(1));
    return (e.actor + ' ' + e.kind + ' ' + e.say + ' #' + e.item).toLowerCase().indexOf(q) >= 0;
  });
  $('logsub').textContent = S.events.length + ' events, newest first';
  var el = $('log'), keep = el.scrollTop;
  el.innerHTML = '<table>' + rows.reverse().slice(0, 1500).map(function (x) {
    var e = x[0], k = x[1];
    return '<tr class="click' + (k === pos ? ' cur' : k > pos ? ' future' : '') + '" data-pos="' + k + '"><td class="t">' + clock(e.at) + '</td><td><span class="badge ' + actorClass(e.actor) + '">' + esc(e.actor) + '</span></td><td class="id">' + (e.item ? '#' + e.item : '') + '</td><td>' + esc(e.say) + '</td></tr>';
  }).join('') + '</table>';
  el.scrollTop = keep;
}

// ── The drawer: everything about one item, call, event or running step ──
function drawer(title, html, keep) { var y = $('dbody').scrollTop; $('dtitle').innerHTML = title; $('dbody').innerHTML = html; $('dbody').scrollTop = keep ? y : 0; $('drawer').classList.add('open'); }
function closeDrawer() { $('drawer').classList.remove('open'); open = null; liveTail = null; }
function json(v) { return '<pre>' + esc(JSON.stringify(v, null, 2)) + '</pre>'; }
// A hold's facts, shown as they are: questions as a list, text as text, anything else as JSON.
function factList(ctx) {
  return '<div class="kv" style="margin-top:10px">' + Object.keys(ctx || {}).map(function (k) {
    var v = ctx[k];
    var body = Array.isArray(v) && v.every(function (x) { return typeof x === 'string'; }) ? '<ol style="margin:0;padding-left:18px">' + v.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>'
      : typeof v === 'string' ? (v.length > 160 || v.indexOf('\n') >= 0 ? '<pre>' + esc(v) + '</pre>' : esc(v)) : typeof v === 'number' || typeof v === 'boolean' || v == null ? esc(String(v)) : '<pre>' + esc(JSON.stringify(v, null, 2)) + '</pre>';
    return '<div>' + esc(k) + '</div><div>' + body + '</div>';
  }).join('') + '</div>';
}
function nextCmds(list) { return (list || []).map(function (n) { return '<div class="cmd"><code>' + esc(n.run) + '</code><span>' + esc(n.why) + '</span></div>'; }).join(''); }

function drawItem(id, refresh) {
  var i = item(id); if (!i) return;
  open = { type: 'item', id: id };
  var view = (S.board.items || []).find(function (v) { return v.id === id; }) || {};
  var evs = S.events.filter(function (e) { return e.item === id; }), calls = S.calls.filter(function (c) { return c.item === id; });
  var m = S.minutes[id] || {};
  var opened = {}; $('dbody').querySelectorAll('details[open]').forEach(function (d) { opened[d.dataset.k] = true; });
  var det = function (k, label, body) { return '<details data-k="' + k + '"' + (opened[k] ? ' open' : '') + '><summary>' + label + '</summary>' + body + '</details>'; };
  var html = '<div class="kv"><div>status</div><div><span class="state s-' + i.status + '">' + esc(i.status) + '</span></div><div>where</div><div>' + esc((STAGE_OF[i.job] || '') + ' · ' + i.job + ' · ' + (PROFILE[i.job] || '')) + '</div>' +
    '<div>round</div><div>' + i.round + ' · corrections ' + i.corrections + ' · failed launches ' + i.launches + '</div><div>workspace</div><div>' + esc(i.workspace) + '</div>' +
    (i.base ? '<div>base</div><div>' + esc(i.base.ref + ' @ ' + i.base.commit.slice(0, 12)) + '</div>' : '') + (i.merged ? '<div>merged</div><div>' + esc(i.merged.ref + ' @ ' + i.merged.commit.slice(0, 12)) + '</div>' : '') +
    '<div>created</div><div>' + esc(i.created) + '</div><div>updated</div><div>' + esc(i.updated) + '</div></div>';
  if (i.hold) html += '<h4>Needs you</h4><div class="hold"><b>' + esc(i.hold.code) + '</b> ' + esc(i.hold.message) + factList(i.hold.context) + nextCmds(view.next) + '</div>';
  else if ((view.next || []).length) html += '<h4>Next</h4>' + nextCmds(view.next);
  if (i.exchange) html += '<h4>NQ exchange</h4>' + json(i.exchange);
  html += '<h4>Objective</h4><pre>' + esc(i.objective) + '</pre>' + det('src', 'operator\'s source', '<pre>' + esc(i.source) + '</pre>');
  html += '<h4>Time per stage</h4><div class="mins">' + Object.keys(m).map(function (k) { return '<div>' + esc(k) + '</div><div class="track"><div class="fill' + (k === 'operator wait' ? ' wait' : '') + '" style="width:' + (m[k] / Math.max.apply(null, Object.values(m).concat([0.0001])) * 100) + '%"></div></div><div class="n">' + mins(m[k]) + '</div>'; }).join('') + '</div>';
  html += '<h4>Agent calls (' + calls.length + ')</h4>' + (calls.length ? '<table><tr><th>#</th><th>Call</th><th>Card</th><th class="num">Time</th><th class="num">Tokens</th><th>Outcome</th></tr>' + calls.map(function (c) {
    return '<tr class="click" data-call="' + c.id + '"><td class="id">' + c.id + '</td><td>' + esc(c.profile) + '<div class="meta">' + esc(c.kind + ' · ' + c.job) + '</div></td><td class="meta">' + esc(c.card.harness + ' · ' + c.card.model) + '</td><td class="num">' + dur(c.ms) + '</td><td class="num">' + num(tok(c.tokens)) + '</td><td>' + esc(c.outcome) + (c.flags.length ? ' <span class="state s-held">' + c.flags.length + ' break</span>' : '') + '</td></tr>';
  }).join('') + '</table>' : '<div class="empty">none yet</div>');
  html += '<h4>Every event (' + evs.length + ')</h4><table class="log">' + evs.map(function (e) { return '<tr class="click" data-ev="' + e.seq + '"><td class="t">' + clock(e.at) + '</td><td><span class="badge ' + actorClass(e.actor) + '">' + esc(e.actor) + '</span></td><td>' + esc(e.say) + '</td></tr>'; }).join('') + '</table>';
  html += '<h4>Deliverables</h4>' + (Object.keys(i.outputs || {}).map(function (j) { return det('out-' + j, esc(j), '<pre>' + esc(i.outputs[j]) + '</pre>'); }).join('') || '<div class="empty">none accepted yet</div>');
  if (i.verification) html += '<h4>Verification</h4>' + i.verification.results.map(function (r) { return det('chk-' + r.id, (r.exitCode === 0 ? '✓ ' : '✕ ') + esc(r.id + ' · ' + r.run) + ' <span class="meta">exit ' + r.exitCode + ' · ' + dur(r.ms) + '</span>', '<pre>' + esc(r.output) + '</pre>'); }).join('');
  html += '<h4>Trace</h4><div id="spans"><span class="empty">loading spans…</span></div>';
  html += det('rec', 'full record', json(i));
  drawer('#' + i.id + ' ' + esc(i.title), html, refresh);
  fetch('api/spans?item=' + id).then(function (r) { return r.json(); }).then(function (spans) { var el = $('spans'); if (el) el.innerHTML = spanTree(spans); });
}
function spanTree(spans) {
  if (!spans.length) return '<div class="empty">No spans for this item yet. Spans are written beside the store while Made Well runs (MW_DEBUG=0 turns them off).</div>';
  var by = {}, roots = [], max = Math.max.apply(null, spans.map(function (s) { return s.ms; }).concat([1]));
  spans.forEach(function (s) { by[s.span] = s; s.kids = []; });
  spans.forEach(function (s) { if (s.parent && by[s.parent]) by[s.parent].kids.push(s); else roots.push(s); });
  var out = '', walk = function (s, d) {
    out += '<div class="span' + (s.outcome === 'error' ? ' err' : '') + '" title="' + esc(JSON.stringify(s.attributes)) + '"><div style="padding-left:' + (d * 14) + 'px">' + esc(s.name) + ' <span class="meta">' + clock(s.start) + (s.attributes.job ? ' · ' + esc(s.attributes.job) : '') + '</span><div class="bar2" style="width:' + Math.max(1, s.ms / max * 100) + '%"></div></div><div class="meta" style="text-align:right">' + dur(s.ms) + '</div></div>';
    s.kids.sort(function (a, b) { return a.start < b.start ? -1 : 1; }).forEach(function (k) { walk(k, d + 1); });
  };
  roots.sort(function (a, b) { return a.start < b.start ? -1 : 1; }).slice(-40).forEach(function (r) { walk(r, 0); });
  return out;
}
function drawCall(id) {
  open = { type: 'call', id: id };
  fetch('api/call/' + id).then(function (r) { return r.json(); }).then(function (c) {
    if (!c) return;
    var html = '<div class="kv"><div>item</div><div><a href="#" data-item="' + c.item + '">#' + c.item + '</a></div><div>card</div><div>' + esc([c.card.harness, c.card.provider, c.card.model, c.card.effort, c.card.account].filter(Boolean).join(' · ')) + '</div>' +
      '<div>outcome</div><div>' + esc(c.outcome) + '</div><div>started</div><div>' + esc(c.started) + ' · ' + dur(c.ms) + '</div>' +
      '<div>tokens</div><div>' + (c.tokens ? num(tok(c.tokens)) + ' <span class="meta">' + num(c.tokens.input) + ' in · ' + num(c.tokens.output) + ' out · ' + num(c.tokens.cacheRead) + ' cache read · ' + num(c.tokens.cacheWrite) + ' cache write</span>' : '<span class="meta">not reported by the harness</span>') + '</div></div>';
    if (c.error) html += '<h4>Error</h4><pre>' + esc(c.error) + '</pre>';
    html += '<h4>Rules</h4>' + (c.flags.length ? c.flags.map(function (f) { return '<div class="hold" style="margin-bottom:6px"><b>' + esc(f.rule) + '</b> ' + esc(RULES[f.rule] || '') + json(f.evidence) + '</div>'; }).join('') : '<div class="rule-ok">✓ no rule broken' + (c.facts ? '' : ' (no facts recorded)') + '</div>');
    html += '<h4>Tool calls (' + c.tools.length + ')</h4>' + (c.tools.length ? '<table><tr><th>#</th><th>Tool</th><th>Input</th><th class="num">In</th><th class="num">Out</th><th class="num">ms</th></tr>' + c.tools.map(function (t) { return '<tr' + (t.error ? ' style="color:var(--red)"' : '') + '><td class="id">' + t.seq + '</td><td>' + esc(t.tool) + '</td><td class="meta" style="font-family:var(--mono)">' + esc(t.digest) + '</td><td class="num">' + num(t.inputBytes) + '</td><td class="num">' + num(t.outputBytes) + '</td><td class="num">' + (t.ms == null ? '' : num(t.ms)) + '</td></tr>'; }).join('') + '</table>' : '<div class="empty">none</div>');
    html += '<h4>Answer</h4><pre>' + esc(c.output || '(none)') + '</pre>';
    html += '<details><summary>Packet the agent was given (' + num((c.prompt || '').length) + ' chars)</summary><pre>' + esc(c.prompt) + '</pre></details>';
    html += '<details><summary>Brief (system prompt)</summary><pre>' + esc(c.system) + '</pre></details>';
    html += '<details><summary>Facts the rules were checked against</summary>' + json(c.facts) + '</details>';
    html += '<details><summary>Raw stream (' + num((c.raw || '').length) + ' bytes)</summary><div class="stream">' + streamHtml(c.raw || '') + '</div></details>';
    drawer(esc(c.profile) + ' · ' + esc(c.kind) + ' · ' + esc(c.job) + ' <span class="meta">call ' + c.id + '</span>', html);
  });
}
function streamHtml(text) {
  return text.split('\n').filter(function (l) { return l.trim(); }).map(function (l) {
    var t = l.trim(); if (t[0] !== '{') return esc(t);
    try { var v = JSON.parse(t), said = streamText(t); return '<span class="k">' + esc(v.type || v.event || v.kind || '·') + '</span> ' + (said ? esc(said) : '<span class="x">' + esc(t.length > 600 ? t.slice(0, 600) + '…' : t) + '</span>'); } catch (e) { return esc(t); }
  }).join('\n');
}
function drawFlight(f) {
  var name = f.live ? f.live.split('/').pop() : null;
  open = { type: 'flight' };
  var html = '<div class="kv"><div>item</div><div><a href="#" data-item="' + f.item + '">#' + f.item + '</a></div><div>who</div><div>' + esc(f.who) + '</div>' + (f.card ? '<div>card</div><div>' + esc(f.card) + '</div>' : '') + '<div>since</div><div>' + esc(f.since) + '</div><div>output</div><div>' + esc(f.live || 'none streamed') + '</div></div>' +
    '<h4>Live output</h4><div class="stream" id="tail">' + (name ? 'waiting for output…' : 'This step streams no output.') + '</div>';
  drawer('#' + f.item + ' ' + esc(f.what) + ' <span class="meta">running</span>', html);
  liveTail = name ? { name: name, from: 0, text: '' } : null;
  tail();
}
function tail() {
  if (!liveTail) return;
  var t = liveTail;
  fetch('api/live/' + encodeURIComponent(t.name) + '?from=' + t.from).then(function (r) { return r.json(); }).then(function (d) {
    if (liveTail !== t) return;
    if (d.gone) { $('tail').innerHTML += '\n<span class="k">— the step ended; its record is in the item\'s calls —</span>'; liveTail = null; return; }
    t.from = d.next; t.text = (t.text + d.text).slice(-400000);
    var el = $('tail'), stick = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
    el.innerHTML = streamHtml(t.text) || 'waiting for output…';
    if (stick) el.scrollTop = el.scrollHeight;
  }).catch(function () {});
}
function drawEvent(seq) {
  var e = S.events.find(function (x) { return x.seq === seq; }); if (!e) return;
  open = { type: 'event' };
  drawer(esc(e.kind) + ' <span class="meta">event ' + e.seq + '</span>', '<div class="kv"><div>when</div><div>' + esc(e.at) + '</div><div>who</div><div><span class="badge ' + actorClass(e.actor) + '">' + esc(e.actor) + '</span></div><div>item</div><div>' + (e.item ? '<a href="#" data-item="' + e.item + '">#' + e.item + '</a>' : 'the runner') + '</div></div><h4>What happened</h4><p>' + esc(e.say) + '</p><h4>Every variable</h4>' + json(e.data) +
    (e.kind === 'call-finished' && e.data.call ? '<p><a href="#" data-call="' + e.data.call + '">open the call: packet, answer, tools, raw stream →</a></p>' : ''));
}

// ── Wiring ──
document.addEventListener('click', function (ev) {
  var t = ev.target.closest('[data-item],[data-call],[data-ev],[data-pos],[data-fl]'); if (!t) return;
  if (t.tagName === 'A') ev.preventDefault();
  if (t.dataset.call) return drawCall(Number(t.dataset.call));
  if (t.dataset.item) return drawItem(Number(t.dataset.item));
  if (t.dataset.ev) return drawEvent(Number(t.dataset.ev));
  if (t.dataset.fl) return drawFlight(flightsAt(pos)[Number(t.dataset.fl)]);
  if (t.dataset.pos) { go(Number(t.dataset.pos)); drawEvent(S.events[Number(t.dataset.pos)].seq); }
});
function go(n) { if (!S) return; pos = Math.max(0, Math.min(last(), n)); follow = pos === last() && follow; render(); }
$('back').onclick = function () { follow = false; go(pos - 1); };
$('step').onclick = function () { follow = false; go(pos + 1); };
$('over').onclick = function () { follow = false; stop(); go(0); };
$('live').onclick = function () { follow = true; stop(); render(); };
$('play').onclick = function () { if (timer) return stop(); follow = false; $('play').textContent = 'Pause'; if (pos >= last()) pos = -1; timer = setInterval(function () { if (pos >= last()) { stop(); follow = true; render(); return; } go(pos + 1); }, 700); };
function stop() { if (timer) clearInterval(timer); timer = null; $('play').textContent = 'Play'; }
$('bar').onclick = function (ev) { var r = this.getBoundingClientRect(); follow = false; go(Math.round((ev.clientX - r.left) / r.width * (S.events.length - 1))); };
$('q').oninput = function () { if (S) renderLog(); };
$('dclose').onclick = closeDrawer;
document.addEventListener('keydown', function (ev) { if (ev.target.tagName === 'INPUT') return; if (ev.key === 'ArrowLeft') $('back').click(); if (ev.key === 'ArrowRight') $('step').click(); if (ev.key === 'Escape') closeDrawer(); if (ev.key === 'l') $('live').click(); });

function header() {
  $('path').textContent = S ? S.store : '';
  $('runner').innerHTML = !S ? '' : S.runner ? '<span class="pill ok"><span class="dot pulse"></span>runner ' + S.runner.pid + (S.runner.item ? ' on #' + S.runner.item : '') + ' since ' + clock(S.runner.since) + '</span>' : '<span class="pill warn"><span class="dot"></span>no runner · nothing moves until <code>mw run</code></span>';
}
function poll() {
  fetch('api/mark').then(function (r) { return r.json(); }).then(function (m) {
    lastOk = Date.now();
    if (m.store === null) { S = null; $('path').textContent = m.path; $('now').innerHTML = '<div class="empty">No store yet at ' + esc(m.path) + '. It appears with the first <code>mw discover</code> or <code>mw start</code>; this page picks it up by itself.</div>'; return; }
    var key = JSON.stringify(m);
    if (key === MARK) return tick();
    MARK = key;
    return fetch('api/state').then(function (r) { return r.json(); }).then(function (s) { S = s; header(); render(); });
  }).catch(function () {}).then(function () {
    var ok = Date.now() - lastOk < 4000;
    $('conn').className = 'pill ' + (ok ? 'ok' : 'bad'); $('conn').innerHTML = '<span class="dot' + (ok ? ' pulse' : '') + '"></span>' + (ok ? 'live' : 'disconnected: is mw ui still running?');
    tail();
  });
}
function tick() {
  document.querySelectorAll('[data-since]').forEach(function (el) { if (el.dataset.cut !== '1' && pos >= last()) el.textContent = dur(Date.now() - Date.parse(el.dataset.since)); });
  if (S && pos >= last()) S.flights.forEach(function (f) { if (f.live) peek(f.live.split('/').pop()); });
}
poll(); setInterval(poll, LIVE_MS);
</script></body></html>`
