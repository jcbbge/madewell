// The console page `mw ui` serves and `mw replay` writes: one self-contained document (no network beyond its own
// server). Live, it polls the store's mark every second and redraws when anything moved; written by `mw replay`, it
// carries the whole record in STATIC and reads nothing. Written with String.raw, so its script keeps its
// backslashes; the script uses no template literals.
export const CONSOLE = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Made Well</title>
<style>
:root { --ink:#0f172a; --ink2:#334155; --mute:#64748b; --faint:#94a3b8; --line:#e2e8f0; --line2:#f1f5f9; --bg:#f8fafc; --card:#fff;
  --blue:#2563eb; --blue-bg:#eff6ff; --blue-ln:#bfdbfe; --green:#15803d; --green-bg:#f0fdf4; --green-ln:#bbf7d0; --red:#dc2626; --red-bg:#fef2f2; --red-ln:#fecaca;
  --amber:#b45309; --amber-bg:#fffbeb; --amber-ln:#fde68a; --violet:#7c3aed; --violet-bg:#f5f3ff; --teal:#0f766e;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; --r:10px; }
* { box-sizing:border-box }
body { margin:0; font:14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color:var(--ink); background:var(--bg) }
a { color:var(--blue); text-decoration:none } a:hover { text-decoration:underline }
code, .mono { font-family:var(--mono); font-size:12.5px }
.top { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:14px; padding:10px 24px; background:rgba(255,255,255,.92); backdrop-filter:blur(6px); border-bottom:1px solid var(--line) }
.brand { font-weight:700; letter-spacing:-.01em; font-size:15px; display:flex; gap:8px; align-items:center } .brand i { width:10px; height:10px; border-radius:3px; background:linear-gradient(135deg,#2563eb,#15803d); display:inline-block }
.top .proj { color:var(--ink2); font-weight:500 } .top .path { color:var(--faint); font:12px var(--mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0 } .grow { flex:1 }
.pill { display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:3px 10px; border-radius:999px; white-space:nowrap; font-weight:500; border:1px solid transparent }
.pill.ok { color:var(--green); background:var(--green-bg); border-color:var(--green-ln) } .pill.warn { color:var(--amber); background:var(--amber-bg); border-color:var(--amber-ln) } .pill.bad { color:var(--red); background:var(--red-bg); border-color:var(--red-ln) } .pill.mute { color:var(--mute); background:var(--line2) }
.dot { width:7px; height:7px; border-radius:50%; background:currentColor } .pulse { animation:pulse 1.4s infinite } @keyframes pulse { 50% { opacity:.3 } }
main { max-width:1480px; margin:0 auto; padding:20px 24px 80px; display:grid; gap:18px }
.card { background:var(--card); border:1px solid var(--line); border-radius:var(--r); padding:16px 18px; min-width:0 }
h2 { margin:0 0 12px; font-size:12px; letter-spacing:.07em; text-transform:uppercase; color:var(--mute); font-weight:650; display:flex; gap:10px; align-items:baseline }
h2 .sub { text-transform:none; letter-spacing:0; font-weight:400; color:var(--faint) } h2 .right { margin-left:auto; text-transform:none; letter-spacing:0; font-weight:400 }
.hero { display:flex; gap:28px; align-items:center; flex-wrap:wrap }
.hero .big { font-size:30px; font-weight:700; letter-spacing:-.02em; line-height:1.1 } .hero .big small { font-size:15px; font-weight:500; color:var(--mute); letter-spacing:0 }
.hero .verdict { font-size:15px; color:var(--ink2); margin-top:4px; max-width:620px }
.stats { display:flex; gap:22px; flex-wrap:wrap; margin-left:auto }
.stat .v { font:650 19px var(--mono); letter-spacing:-.02em } .stat .k { font-size:12px; color:var(--mute) } .stat.bad .v { color:var(--red) } .stat.ok .v { color:var(--green) }
.needs { border:1px solid var(--red-ln); background:linear-gradient(0deg,#fff,#fff8f8); }
.needs h2 { color:var(--red) }
.need { padding:12px 0; border-top:1px solid var(--red-ln) } .need:first-of-type { border-top:0; padding-top:0 }
.need .msg { font-size:15px; font-weight:500 } .need ol { margin:6px 0 4px; padding-left:20px; color:var(--ink2) } .need li { margin:2px 0 }
.cmd { display:flex; gap:10px; align-items:center; margin-top:6px; flex-wrap:wrap } .cmd code { background:var(--ink); color:#e2e8f0; padding:5px 10px; border-radius:7px; overflow-wrap:anywhere }
.cmd button { font:inherit; font-size:12px; padding:3px 9px; border:1px solid var(--line); background:#fff; border-radius:6px; cursor:pointer; color:var(--ink2) } .cmd button:hover { border-color:var(--faint) } .cmd span { font-size:12.5px; color:var(--mute) }
.work { display:grid; gap:0 }
.row { display:grid; grid-template-columns: minmax(260px, 1fr) 590px 200px; gap:18px; align-items:center; padding:12px 6px; border-top:1px solid var(--line2); cursor:pointer; border-radius:8px }
.row:first-child { border-top:0 } .row:hover { background:#f8fbff }
.row .t { font-weight:600; font-size:14.5px; line-height:1.35 } .row .t .id { color:var(--faint); font:500 13px var(--mono); margin-right:6px }
.row .d { font-size:13px; color:var(--ink2); margin-top:3px; line-height:1.4 } .row .d b { font-weight:600 }
.row .m { font:12px var(--mono); color:var(--mute); text-align:right; line-height:1.6 } .row .m .owes { font-family:inherit; color:var(--ink2) }
.tag { display:inline-block; font:600 10.5px var(--mono); letter-spacing:.04em; text-transform:uppercase; padding:1px 6px; border-radius:4px; margin-left:6px; vertical-align:2px; background:var(--line2); color:var(--mute) }
.tag.fix { background:#fff1f2; color:#be123c } .tag.feature { background:var(--blue-bg); color:var(--blue) } .tag.chore { background:#f5f5f4; color:#57534e } .tag.discovery { background:var(--violet-bg); color:var(--violet) } .tag.prerequisite { background:var(--amber-bg); color:var(--amber) }
.tag.st-shipped { background:var(--green-bg); color:var(--green) } .tag.st-held { background:var(--red-bg); color:var(--red) } .tag.st-dropped { text-decoration:line-through }
.pipe { display:flex; align-items:center; gap:3px; justify-self:start }
.pipe .col { display:flex; flex-direction:column; gap:3px }
.seg { font-size:11px; font-weight:600; padding:3px 7px; border-radius:6px; border:1px solid var(--line); color:var(--faint); background:#fff; white-space:nowrap; min-width:62px; text-align:center; position:relative; line-height:1.3 }
.seg.done { background:var(--green-bg); border-color:var(--green-ln); color:var(--green) }
.seg.active { background:var(--blue-bg); border-color:var(--blue); color:var(--blue); box-shadow:0 0 0 3px rgba(37,99,235,.12) } .seg.active::after { content:''; position:absolute; top:-3px; right:-3px; width:7px; height:7px; border-radius:50%; background:var(--blue); animation:pulse 1.2s infinite }
.seg.held, .seg.failed { background:var(--red-bg); border-color:var(--red); color:var(--red) } .seg.waiting { background:var(--amber-bg); border-color:var(--amber-ln); color:var(--amber) }
.seg.skipped { border-style:dashed; color:#cbd5e1 } .seg .q { font:600 9.5px var(--mono); margin-left:3px; color:var(--amber) }
.arrow { color:#cbd5e1; font-size:11px }
.running { display:grid; grid-template-columns:repeat(auto-fill, minmax(420px, 1fr)); gap:12px }
.run { border:1px solid var(--blue-ln); background:linear-gradient(180deg,var(--blue-bg),#fff 60%); border-radius:var(--r); padding:12px 14px; cursor:pointer; min-width:0 }
.run.nq { border-color:var(--amber-ln); background:linear-gradient(180deg,var(--amber-bg),#fff 60%) } .run.mw { border-color:var(--green-ln); background:linear-gradient(180deg,var(--green-bg),#fff 60%) }
.run .h { display:flex; gap:8px; align-items:baseline; flex-wrap:wrap } .run .h b { font-size:14px } .run .h .tm { margin-left:auto; font:600 13px var(--mono); color:var(--blue) }
.run .rw { font-size:12.5px; color:var(--mute) } .run .it { font-size:12.5px; color:var(--ink2); margin:2px 0 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.act { font:12px/1.55 var(--mono); color:var(--ink2); border-left:2px solid var(--line); padding-left:9px; min-height:20px }
.act div { white-space:nowrap; overflow:hidden; text-overflow:ellipsis } .act .tool { color:#1e40af } .act .say { color:var(--ink2) } .act .error { color:var(--red) } .act div:last-child { color:var(--ink); font-weight:500 }
.tl { position:relative; overflow-x:auto } .tl-in { position:relative; min-width:900px }
.tl-axis { position:relative; height:22px; margin-left:220px; border-bottom:1px solid var(--line) } .tl-axis span { position:absolute; top:2px; font:11px var(--mono); color:var(--faint); transform:translateX(-50%) }
.tl-row { display:flex; align-items:stretch; border-bottom:1px solid var(--line2); min-height:30px; cursor:pointer } .tl-row:hover { background:#fafcff }
.tl-name { width:220px; flex:none; padding:5px 10px 5px 0; font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--ink2) } .tl-name b { font:500 12px var(--mono); color:var(--faint); margin-right:4px }
.tl-track { position:relative; flex:1 } .tl-grid { position:absolute; top:0; bottom:0; width:1px; background:var(--line2) }
.bar { position:absolute; height:9px; border-radius:3px; min-width:3px; cursor:pointer }
.bar:hover { outline:2px solid var(--ink); z-index:2 }
.bar.intake { background:#93c5fd } .bar.originator { background:#fbbf24 } .bar.execute { background:var(--blue) } .bar.verify { background:#22c55e } .bar.ship { background:var(--teal) }
.bar.arbitrate { background:var(--violet) } .bar.repair { background:#f472b6 } .bar.bad { background:repeating-linear-gradient(45deg,var(--red),var(--red) 3px,#fca5a5 3px,#fca5a5 6px) } .bar.live { animation:pulse 1.4s infinite }
.tl-now { position:absolute; top:0; bottom:0; width:2px; background:var(--red); opacity:.5 }
.legend { display:flex; gap:14px; font-size:12px; color:var(--mute); flex-wrap:wrap } .legend i { display:inline-block; width:14px; height:8px; border-radius:2px; margin-right:5px; vertical-align:0 }
.two { display:grid; grid-template-columns: 1.3fr 1fr; gap:18px }
.cost { display:grid; grid-template-columns: 96px 1fr 120px; gap:7px 12px; align-items:center; font-size:13px }
.cost .track { height:14px; background:var(--line2); border-radius:4px; overflow:hidden; display:flex } .cost .track div { height:100% } .cost .n { font:12px var(--mono); color:var(--mute); text-align:right }
.k-intake { background:#93c5fd } .k-originator { background:#fbbf24 } .k-execute { background:var(--blue) } .k-repair { background:#f472b6 }
.facts { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:10px }
.fact { border:1px solid var(--line); border-radius:8px; padding:10px 12px } .fact .v { font:650 17px var(--mono) } .fact .k { font-size:12px; color:var(--mute) } .fact.bad .v { color:var(--red) } .fact.ok .v { color:var(--green) }
.log { max-height:420px; overflow:auto } .ev { display:grid; grid-template-columns: 64px 82px 40px 1fr; gap:10px; padding:5px 4px; border-bottom:1px solid var(--line2); font-size:13px; align-items:baseline }
.ev .t { font:12px var(--mono); color:var(--faint) } .ev .i { font:12px var(--mono); color:var(--mute) }
.who { font:600 10.5px var(--mono); letter-spacing:.05em; text-transform:uppercase; padding:1px 6px; border-radius:4px; text-align:center }
.w-operator { color:var(--violet); background:var(--violet-bg) } .w-agent { color:var(--blue); background:var(--blue-bg) } .w-made { color:var(--green); background:var(--green-bg) } .w-runner { color:var(--mute); background:var(--line2) }
.filter { display:flex; gap:8px; margin:-4px 0 8px } .filter input { flex:1; font:inherit; padding:6px 10px; border:1px solid var(--line); border-radius:8px; background:#fff }
.empty { color:var(--faint); font-size:13px }
.drawer { position:fixed; inset:0 0 0 auto; width:min(1000px, 97vw); background:#fff; border-left:1px solid var(--line); box-shadow:-20px 0 40px rgba(15,23,42,.10); z-index:10; display:none; flex-direction:column }
.drawer.open { display:flex } .scrim { position:fixed; inset:0; background:rgba(15,23,42,.18); z-index:9; display:none } .scrim.open { display:block }
.dh { padding:16px 22px 0; border-bottom:1px solid var(--line) } .dh .x { float:right; font:inherit; font-size:13px; padding:4px 10px; border:1px solid var(--line); border-radius:7px; background:#fff; cursor:pointer }
.dh h3 { margin:0 0 4px; font-size:19px; letter-spacing:-.01em } .dh .sub { color:var(--ink2); font-size:13.5px; margin-bottom:10px }
.tabs { display:flex; gap:2px; margin-top:12px } .tabs button { font:inherit; font-size:13px; font-weight:500; padding:8px 12px; border:0; background:none; color:var(--mute); border-bottom:2px solid transparent; cursor:pointer } .tabs button.on { color:var(--ink); border-color:var(--ink) }
.tabs button .n { font:11px var(--mono); color:var(--faint); margin-left:4px }
.db { overflow:auto; padding:18px 22px 60px; flex:1 }
.db h4 { margin:20px 0 8px; font-size:12px; letter-spacing:.07em; text-transform:uppercase; color:var(--mute) } .db h4:first-child { margin-top:0 }
.prose { font-size:14px; color:var(--ink2); white-space:pre-wrap } .prose.lead { font-size:15px; color:var(--ink) }
.dec { border:1px solid var(--line); border-radius:8px; padding:9px 12px; margin:6px 0 } .dec .q { font-weight:600; font-size:13.5px } .dec .a { font-size:13.5px; margin-top:2px } .dec .y { font-size:12.5px; color:var(--mute); margin-top:4px }
.chips { display:flex; gap:6px; flex-wrap:wrap } .chip { font:12px var(--mono); padding:2px 8px; border-radius:6px; background:var(--line2); color:var(--ink2) }
ol.steps { padding-left:22px; margin:4px 0 } ol.steps li { margin:4px 0; font-size:13.5px }
.dw { display:grid; grid-template-columns: 54px 1fr; gap:6px 10px; font-size:13.5px } .dw .id { font:600 12px var(--mono); color:var(--mute) }
.turn { border-left:3px solid var(--amber-ln); padding:4px 0 4px 12px; margin:8px 0 } .turn .qh { font-size:12px; font-weight:600; color:var(--amber); text-transform:uppercase; letter-spacing:.05em }
.turn ol { margin:4px 0; padding-left:20px; font-size:13.5px } .turn .ans { background:var(--line2); border-radius:8px; padding:8px 11px; font-size:13.5px; white-space:pre-wrap; margin-top:6px } .turn .ans b { font-size:12px; color:var(--mute); display:block; margin-bottom:2px }
.turn.clear { border-color:var(--green-ln) } .turn.clear .qh { color:var(--green) }
.xch { border:1px solid var(--line); border-radius:var(--r); padding:12px 14px; margin:10px 0 } .xch .xh { font-weight:600; font-size:14px } .xch .xh span { color:var(--mute); font-weight:400; font-size:13px }
table { border-collapse:collapse; width:100% } th { text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); font-weight:600; padding:6px 8px; border-bottom:1px solid var(--line) }
td { padding:7px 8px; border-bottom:1px solid var(--line2); vertical-align:top; font-size:13px } tr.click { cursor:pointer } tr.click:hover td { background:#f8fbff } td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; font-family:var(--mono); font-size:12.5px }
.ok-t { color:var(--green); font-weight:600 } .bad-t { color:var(--red); font-weight:600 }
pre { white-space:pre-wrap; word-break:break-word; background:#f8fafc; border:1px solid var(--line); border-radius:8px; padding:10px 12px; font:12px/1.5 var(--mono); max-height:520px; overflow:auto; margin:4px 0 }
.diff { white-space:pre; overflow:auto; font:12px/1.5 var(--mono); border:1px solid var(--line); border-radius:8px; max-height:640px } .diff div { padding:0 10px } .diff .a { background:#ecfdf3; color:#166534 } .diff .r { background:#fef2f2; color:#991b1b } .diff .h { background:#f1f5f9; color:var(--mute) } .diff .f { background:#e2e8f0; font-weight:600 }
details summary { cursor:pointer; color:var(--blue); margin:6px 0; font-size:13px }
.hold { border:1px solid var(--red-ln); background:var(--red-bg); border-radius:var(--r); padding:12px 14px; margin-bottom:14px } .hold .c { font:600 12px var(--mono); color:var(--red) }
.bigpipe { display:flex; gap:4px; align-items:stretch; margin:4px 0 2px; flex-wrap:wrap }
.bp { flex:1; min-width:96px; border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-size:12px; color:var(--mute); background:#fff }
.bp b { display:block; font-size:13px; color:var(--ink) } .bp .w { font-size:11.5px } .bp.done { background:var(--green-bg); border-color:var(--green-ln) } .bp.active { background:var(--blue-bg); border-color:var(--blue) } .bp.held, .bp.failed { background:var(--red-bg); border-color:var(--red) } .bp.waiting { background:var(--amber-bg); border-color:var(--amber-ln) } .bp.skipped { border-style:dashed; opacity:.6 }
.tx { font:12.5px/1.55 var(--mono) } .tx > div { padding:5px 0; border-bottom:1px dashed var(--line2) } .tx .k { display:inline-block; min-width:62px; font-size:11px; font-weight:600; text-transform:uppercase; color:var(--faint) } .tx .tool { color:#1e40af } .tx .say { white-space:pre-wrap; font-family:ui-sans-serif, system-ui, sans-serif; font-size:13.5px; color:var(--ink) }
.span { display:grid; grid-template-columns: 1fr 74px; gap:8px; font:12px var(--mono); padding:2px 0 } .span .b2 { height:5px; background:var(--blue); border-radius:3px; margin-top:4px; min-width:2px } .span.err { color:var(--red) } .span.err .b2 { background:var(--red) }
.back { font-size:13px; margin-bottom:10px; display:inline-block }
@media (max-width: 1100px) { .row { grid-template-columns: 1fr } .row .m { text-align:left } .two { grid-template-columns: 1fr } .stats { margin-left:0 } }
</style></head><body>
<div class="top"><span class="brand"><i></i>Made Well</span><span class="proj" id="proj"></span><span class="path" id="path"></span><span class="grow"></span><span id="runner"></span><span id="conn" class="pill mute"><span class="dot"></span>connecting</span></div>
<main>
  <section class="card"><div class="hero" id="hero"><span class="empty">Loading…</span></div></section>
  <section class="card needs" id="needs" hidden></section>
  <section class="card"><h2>Work <span class="sub" id="worksub"></span><span class="right legend"><span>● each step: <span style="color:var(--green)">done</span> · <span style="color:var(--blue)">running</span> · <span style="color:var(--red)">held or failed</span> · <span style="color:var(--amber)">?</span> = NQ questions asked</span></span></h2><div class="work" id="work"></div></section>
  <section class="card" id="nowcard"><h2>Running now <span class="sub" id="nowsub"></span></h2><div class="running" id="running"></div></section>
  <section class="card"><h2>Timeline <span class="sub">every agent call and Made Well step; click a bar to open its call</span><span class="right legend"><span><i class="k-intake"></i>NQ intake</span><span><i class="k-originator"></i>originator answers</span><span><i class="k-execute"></i>the job</span><span><i style="background:var(--violet)"></i>arbiter</span><span><i class="k-repair"></i>JSON repair</span><span><i style="background:#22c55e"></i>verify</span><span><i style="background:var(--teal)"></i>ship</span><span><i style="background:var(--red)"></i>failed or refused</span></span></h2><div class="tl" id="tl"></div></section>
  <div class="two">
    <section class="card"><h2>Where the agent time goes <span class="sub">minutes by job: NQ intake, originator answers, the job itself</span></h2><div class="cost" id="cost"></div></section>
    <section class="card"><h2>Health</h2><div class="facts" id="facts"></div></section>
  </div>
  <section class="card"><h2>Event log <span class="sub" id="logsub"></span></h2><div class="filter"><input id="q" placeholder="Filter: #3, a job, an actor, any word"></div><div class="log" id="log"></div></section>
</main>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer"><div class="dh" id="dh"></div><div class="db" id="db"></div></aside>
<script>
var M = null, MARK = '', lastOk = 0, open = null, tab = 'story', liveTail = null, D = null;
var LIVE = typeof STATIC === 'undefined';
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function num(n) { return Number(n || 0).toLocaleString('en-US'); }
function clock(iso) { return iso ? new Date(iso).toLocaleTimeString('en-GB', { hour12: false }) : ''; }
function dur(ms) { ms = Math.max(0, ms || 0); if (ms < 60000) return (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + 's'; var m = Math.floor(ms / 60000); return m < 60 ? m + 'm ' + String(Math.round((ms % 60000) / 1000)).padStart(2, '0') + 's' : Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm'; }
function mins(ms) { var m = (ms || 0) / 60000; return m < 1 ? Math.round(m * 60) + 's' : m < 100 ? m.toFixed(1) + 'm' : Math.round(m) + 'm'; }
function tk(n) { n = n || 0; return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n); }
function tok(t) { return t ? t.input + t.output + t.cacheRead + t.cacheWrite : 0; }
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
function now() { return M ? (LIVE ? Date.now() : Date.parse(M.at)) : Date.now(); }
function whoClass(a) { return a === 'operator' ? 'w-operator' : a === 'agent' ? 'w-agent' : a === 'runner' ? 'w-runner' : 'w-made'; }
var PROFILE = { discover: 'ideator', ideate: 'ideator', challenge: 'ideation peer', plan: 'planner', 'test-plan': 'test architect', implement: 'implementer', verify: 'made well', arbitrate: 'arbiter', ship: 'made well' };
var JOBNAME = { discover: 'Discover', ideate: 'Ideate', challenge: 'Challenge', plan: 'Plan', 'test-plan': 'Checks', implement: 'Implement', verify: 'Verify', arbitrate: 'Arbiter', ship: 'Ship' };
function jobName(j) { return (M && M.jobs && M.jobs[j] && M.jobs[j].label) || JOBNAME[j] || j; }
function profileName(j) { return (M && M.jobs && M.jobs[j] && M.jobs[j].profile) || PROFILE[j] || j; }
var STATE_WORD = { done: 'done', active: 'running', held: 'held', failed: 'failed', waiting: 'waiting', todo: 'to do', skipped: 'skipped' };
function itemOf(id) { return M && M.items.find(function (i) { return i.id === id; }); }

// ── The page ──
function render() {
  if (!M) return;
  var s = M.summary;
  $('proj').textContent = M.projects.map(function (p) { return p.split('/').pop(); }).join(', ') || 'no project yet';
  $('path').textContent = M.projects.length === 1 ? M.projects[0] : M.store;
  $('runner').innerHTML = !LIVE ? '<span class="pill mute">replay written ' + esc(clock(M.at)) + '</span>' : M.runner ? '<span class="pill ok"><span class="dot pulse"></span>runner ' + M.runner.pid + '</span>' : '<span class="pill warn"><span class="dot"></span>no runner</span>';
  renderHero(); renderNeeds(); renderWork(); renderRunning(); renderTimeline(); renderCost(); renderFacts(); renderLog();
  if (open && open.type === 'item' && LIVE) loadItem(open.id, true);
}

function renderHero() {
  var s = M.summary, total = s.items, open_ = s.moving + s.queued + s.held + s.candidates;
  var verdict = !total && !M.items.length ? 'Nothing recorded yet. In a registered project: <code>mw discover --source-file notes.md</code> or <code>mw start --objective "…"</code>.'
    : s.held ? '<b style="color:var(--red)">' + plural(s.held, 'item waits', 'items wait') + ' on you.</b> Everything else keeps moving.'
    : s.candidates && !s.moving && !s.queued ? '<b style="color:var(--red)">' + plural(s.candidates, 'candidate waits', 'candidates wait') + ' for you to promote.</b> Nothing else is moving.'
    : !open_ ? 'All work is done: every item has shipped, been dropped, or waits for promotion.'
    : !M.runner && LIVE ? '<b style="color:var(--amber)">No runner is driving the store.</b> Run <code>mw run --watch</code>; every item resumes where it stopped.'
    : plural(s.moving, 'item') + ' moving, ' + s.queued + ' queued.' + (s.candidates ? ' ' + plural(s.candidates, 'candidate waits', 'candidates wait') + ' for you to promote.' : ' Nothing needs you.');
  var span = s.first ? (Date.parse(s.last) > Date.parse(s.first) ? (LIVE && open_ ? now() : Date.parse(s.last)) - Date.parse(s.first) : 0) : 0;
  var nq = s.agentMs ? Math.round(s.nqMs / s.agentMs * 100) : 0;
  $('hero').innerHTML = '<div><div class="big">' + s.shipped + ' <small>of ' + total + ' shipped</small></div><div class="verdict">' + verdict + '</div></div>' +
    '<div class="stats">' + [[dur(span), 'wall time'], [mins(s.agentMs), 'agent time'], [tk(s.tokens), 'tokens'], [s.calls, 'agent calls'], [nq + '%', 'of agent time in NQ', nq > 45 ? 'bad' : ''], [s.questions, 'NQ questions'], [s.held, 'need you', s.held ? 'bad' : '']].map(function (x) {
      return '<div class="stat ' + (x[2] || '') + '"><div class="v">' + esc(x[0]) + '</div><div class="k">' + esc(x[1]) + '</div></div>'; }).join('') + '</div>';
}

function cmd(n) { return '<div class="cmd"><code>' + esc(n.run) + '</code>' + (LIVE && navigator.clipboard ? '<button data-copy="' + esc(n.run) + '">Copy</button>' : '') + '<span>' + esc(n.why) + '</span></div>'; }
function renderNeeds() {
  var el = $('needs');
  el.hidden = !M.needs.length;
  if (!M.needs.length) return;
  el.innerHTML = '<h2>Needs you <span class="sub">' + plural(M.needs.length, 'thing') + ' only you can move</span></h2>' + M.needs.map(function (n) {
    return '<div class="need">' + (n.item ? '<div class="mono" style="color:var(--mute)"><a href="#" data-item="' + n.item + '">#' + n.item + ' ' + esc(n.title) + '</a> · ' + esc(n.code) + ' · since ' + esc(clock(n.since)) + '</div>' : '') +
      '<div class="msg">' + esc(n.message) + '</div>' + (n.questions.length ? '<ol>' + n.questions.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' : '') + n.next.map(cmd).join('') + '</div>';
  }).join('');
}

function seg(st) {
  return '<span class="seg ' + st.state + '" title="' + esc(jobName(st.job) + ': ' + STATE_WORD[st.state] + (st.calls ? ' · ' + plural(st.calls, 'call') + ' · ' + mins(st.agentMs) + ' agent time · ' + tk(st.tokens) + ' tokens' : '') + (st.questions ? ' · ' + plural(st.questions, 'NQ question') : '')) + '">' + esc(jobName(st.job) || st.label) + (st.questions ? '<span class="q">' + st.questions + '?</span>' : '') + '</span>';
}
function pipe(steps) {
  var out = [], i = 0;
  while (i < steps.length) {
    var st = steps[i];
    if (st.job === 'implement' && steps[i + 1] && steps[i + 1].job === 'test-plan') { out.push('<span class="col">' + seg(st) + seg(steps[i + 1]) + '</span>'); i += 2; }
    else { out.push(seg(st)); i++; }
  }
  return '<div class="pipe">' + out.join('<span class="arrow">›</span>') + '</div>';
}
function rowMeta(i) {
  var end = i.ended ? Date.parse(i.ended) : now();
  var bits = [];
  if (i.owes) bits.push('<span class="owes">next: <b>' + esc(i.owes) + '</b></span>');
  bits.push(i.status === 'candidate' || i.status === 'queued' ? 'waiting ' + dur(end - Date.parse(i.started)) : dur(end - Date.parse(i.started)) + (i.ended ? '' : ' so far'));
  bits.push(mins(i.agentMs) + ' agent · ' + tk(i.tokens) + ' tok');
  if (i.checks) bits.push('checks ' + i.checks.passed + '/' + i.checks.total);
  return bits.join('<br>');
}
function renderWork() {
  var items = M.items.filter(function (i) { return i.status !== 'dropped'; });
  var dropped = M.items.length - items.length;
  $('worksub').textContent = items.length ? plural(items.length, 'item') + (dropped ? ' · ' + dropped + ' dropped' : '') : '';
  // What needs a person first, then what moves, then what waits, then what is done.
  var rank = { held: 0, candidate: 1, running: 2, 'waiting-quota': 3, 'waiting-prerequisite': 3, queued: 4, discovered: 5, shipped: 6 };
  items.sort(function (a, b) { return (rank[a.status] - rank[b.status]) || a.id - b.id; });
  $('work').innerHTML = items.length ? items.map(function (i) {
    var tags = '<span class="tag ' + esc(i.kind) + '">' + esc(i.kind) + '</span>' + (i.status === 'shipped' || i.status === 'held' || i.status === 'candidate' ? '<span class="tag st-' + i.status + '">' + esc(i.status) + '</span>' : '') + (i.round > 1 ? '<span class="tag">round ' + i.round + '</span>' : '');
    return '<div class="row" data-item="' + i.id + '"><div><div class="t"><span class="id">#' + i.id + '</span>' + esc(i.title) + tags + '</div><div class="d">' + esc(i.doing) + '</div></div>' + pipe(i.steps) + '<div class="m">' + rowMeta(i) + '</div></div>';
  }).join('') : '<div class="empty">No work items yet.</div>';
}

function renderRunning() {
  var r = M.running;
  $('nowcard').hidden = !r.length && !M.cutOff.length;
  $('nowsub').textContent = r.length ? plural(r.length, 'step') + ' in flight' : '';
  $('running').innerHTML = r.map(function (f, k) {
    var cls = f.kind === 'intake' || f.kind === 'originator' ? 'nq' : f.who === 'made well' ? 'mw' : '';
    var what = f.kind === 'execute' ? jobName(f.job) : f.kind === 'intake' ? 'NQ intake for ' + f.job : f.kind === 'originator' ? 'answers questions on ' + f.job : f.kind;
    return '<div class="run ' + cls + '" data-run="' + k + '"><div class="h"><b>#' + f.item + ' · ' + esc(what) + '</b><span class="rw">' + esc(f.who) + (f.card ? ' · ' + esc(f.card) : '') + '</span><span class="tm" data-since="' + esc(f.since) + '">' + dur(now() - Date.parse(f.since)) + '</span></div>' +
      '<div class="it">' + esc(f.title) + '</div><div class="act">' + (f.activity.length ? f.activity.slice(-4).map(function (a) { return '<div class="' + a.kind + '">' + esc(a.text) + '</div>'; }).join('') : '<div class="say" style="color:var(--faint)">' + (f.who === 'made well' ? 'running…' : 'thinking… no output yet') + '</div>') + '</div></div>';
  }).join('') + (M.cutOff.length ? '<div class="empty">' + plural(M.cutOff.length, 'step was', 'steps were') + ' cut off when the runner stopped; they run again when it starts.</div>' : '');
}

function renderTimeline() {
  var bars = M.bars;
  if (!bars.length) { $('tl').innerHTML = '<div class="empty">No calls yet.</div>'; return; }
  var t0 = Math.min.apply(null, bars.map(function (b) { return Date.parse(b.start); }));
  var t1 = Math.max.apply(null, bars.map(function (b) { return b.end ? Date.parse(b.end) : now(); }).concat([LIVE && M.running.length ? now() : 0]));
  var span = Math.max(t1 - t0, 1000);
  var pct = function (t) { return ((t - t0) / span * 100).toFixed(3) + '%'; };
  var step = [15e3, 30e3, 60e3, 120e3, 300e3, 600e3, 900e3, 1800e3, 3600e3].find(function (s) { return span / s <= 12; }) || 7200e3;
  var ticks = [], grid = '';
  for (var t = 0; t <= span; t += step) { ticks.push('<span style="left:' + (t / span * 100) + '%">' + (step < 60e3 ? Math.round(t / 1000) + 's' : Math.round(t / 60000) + 'm') + '</span>'); grid += '<div class="tl-grid" style="left:' + (t / span * 100) + '%"></div>'; }
  var ids = []; bars.forEach(function (b) { if (ids.indexOf(b.item) < 0) ids.push(b.item); });
  ids.sort(function (a, b) { return a - b; });
  var rows = ids.map(function (id) {
    var it = itemOf(id), mine = bars.filter(function (b) { return b.item === id; });
    var lanes = mine.some(function (b) { return b.lane === 1; }) ? 2 : 1;
    var h = lanes === 2 ? 40 : 28;
    return '<div class="tl-row" data-item="' + id + '" style="height:' + h + 'px"><div class="tl-name"><b>#' + id + '</b>' + esc(it ? it.title : '') + '</div><div class="tl-track">' + grid + mine.map(function (b) {
      var s = Date.parse(b.start), e = b.end ? Date.parse(b.end) : now();
      var cls = b.kind === 'execute' && b.job === 'arbitrate' ? 'arbitrate' : b.kind;
      var bad = b.outcome && b.outcome !== 'ok' ? ' bad' : '';
      var top = lanes === 2 ? (b.lane === 1 ? 23 : 8) : 10;
      var tip = '#' + id + ' ' + (b.kind === 'execute' ? jobName(b.job) + ' (' + profileName(b.job) + ')' : b.kind + ' · ' + b.job) + ' · ' + dur(e - s) + (b.outcome ? ' · ' + b.outcome : ' · running');
      return '<div class="bar ' + cls + bad + (b.end ? '' : ' live') + '" style="left:' + pct(s) + ';width:calc(' + ((e - s) / span * 100).toFixed(3) + '% );top:' + top + 'px" title="' + esc(tip) + '"' + (b.call ? ' data-call="' + b.call + '"' : '') + '></div>';
    }).join('') + (LIVE && M.running.length ? '<div class="tl-now" style="left:' + pct(now()) + '"></div>' : '') + '</div></div>';
  }).join('');
  $('tl').innerHTML = '<div class="tl-in"><div class="tl-axis">' + ticks.join('') + '</div>' + rows + '</div>';
}

function renderCost() {
  var jobs = Object.keys(M.jobs || {}).filter(function (j) { return M.cost[j]; }).concat(Object.keys(M.cost).filter(function (j) { return !(M.jobs || {})[j]; }));
  var KINDS = ['intake', 'originator', 'execute', 'repair'];
  var tot = function (j) { var c = M.cost[j]; return KINDS.reduce(function (n, k) { return n + (c[k] ? c[k].ms : 0); }, 0); };
  var max = Math.max.apply(null, jobs.map(tot).concat([1]));
  $('cost').innerHTML = jobs.length ? jobs.map(function (j) {
    var c = M.cost[j], t = tot(j), toks = KINDS.reduce(function (n, k) { return n + (c[k] ? c[k].tokens : 0); }, 0);
    return '<div>' + esc(jobName(j)) + '</div><div class="track" title="' + esc(KINDS.filter(function (k) { return c[k]; }).map(function (k) { return k + ' ' + mins(c[k].ms) + ' in ' + plural(c[k].calls, 'call'); }).join(' · ')) + '">' +
      KINDS.map(function (k) { return c[k] ? '<div class="k-' + k + '" style="width:' + (c[k].ms / max * 100) + '%"></div>' : ''; }).join('') + '</div><div class="n">' + mins(t) + ' · ' + tk(toks) + '</div>';
  }).join('') + '<div></div><div class="legend" style="margin-top:4px"><span><i class="k-intake"></i>NQ intake</span><span><i class="k-originator"></i>originator answers</span><span><i class="k-execute"></i>the job</span></div><div></div>' : '<div class="empty">No agent calls yet.</div>';
}

function renderFacts() {
  var s = M.summary, breaks = M.rules.length;
  var ruleNames = {}; M.rules.forEach(function (r) { ruleNames[r.rule] = (ruleNames[r.rule] || 0) + 1; });
  var f = [[s.intakes ? (s.questions / s.intakes).toFixed(1) : '0', 'NQ questions per intake', s.intakes && s.questions / s.intakes > 1 ? 'bad' : 'ok'],
    [s.refused, 'calls failed or refused', s.refused ? 'bad' : 'ok'],
    [breaks, breaks ? 'rule breaks: ' + Object.keys(ruleNames).map(function (k) { return k + ' ×' + ruleNames[k]; }).join(', ') : 'rule breaks in ' + plural(s.calls, 'checked call'), breaks ? 'bad' : 'ok'],
    [s.calls ? tk(s.tokens / s.calls) : '0', 'tokens per call'],
    [s.calls ? dur(s.agentMs / s.calls) : '0s', 'mean call time'],
    [s.shipped ? mins(s.agentMs / s.shipped) : '—', 'agent time per shipped item']];
  $('facts').innerHTML = f.map(function (x) { return '<div class="fact ' + (x[2] || '') + '"><div class="v">' + esc(x[0]) + '</div><div class="k">' + esc(x[1]) + '</div></div>'; }).join('') +
    (breaks ? '<div style="grid-column:1/-1">' + M.rules.slice(0, 10).map(function (r) { return '<a href="#" data-call="' + r.call + '" class="chip" style="margin:2px">#' + r.item + ' ' + esc(r.kind + ' ' + r.job + ': ' + r.rule) + '</a>'; }).join('') + '</div>' : '');
}

function evRow(e) { return '<div class="ev"><span class="t">' + clock(e.at) + '</span><span class="who ' + whoClass(e.actor) + '">' + esc(e.actor) + '</span><span class="i">' + (e.item ? '<a href="#" data-item="' + e.item + '">#' + e.item + '</a>' : '') + '</span><span>' + esc(e.say) + (e.kind === 'call-finished' && e.data.call ? ' <a href="#" data-call="' + e.data.call + '">open call</a>' : '') + '</span></div>'; }
function renderLog() {
  var q = $('q').value.trim().toLowerCase();
  var rows = M.events.filter(function (e) { if (!q) return true; if (/^#\d+$/.test(q)) return e.item === Number(q.slice(1)); return (e.actor + ' ' + e.kind + ' ' + e.say + ' #' + e.item).toLowerCase().indexOf(q) >= 0; });
  $('logsub').textContent = M.eventCount > M.events.length ? 'the newest ' + M.events.length + ' of ' + M.eventCount + ' events; an item shows all of its own' : M.eventCount + ' events, newest first';
  var el = $('log'), keep = el.scrollTop;
  el.innerHTML = rows.slice().reverse().map(evRow).join('') || '<div class="empty">No events match.</div>';
  el.scrollTop = keep;
}

// ── The drawer: one item, one call, or one running step ──
function show(head, body, keep) { var y = $('db').scrollTop; $('dh').innerHTML = '<button class="x" id="dclose">Close ✕</button>' + head; $('db').innerHTML = body; $('db').scrollTop = keep ? y : 0; $('drawer').classList.add('open'); $('scrim').classList.add('open'); $('dclose').onclick = closeDrawer; }
function closeDrawer() { $('drawer').classList.remove('open'); $('scrim').classList.remove('open'); open = null; liveTail = null; }
function getJson(path) { return fetch(path).then(function (r) { return r.json(); }); }

function loadItem(id, refresh) {
  if (!refresh) tab = open && open.type === 'item' && open.id === id ? tab : 'story';
  open = { type: 'item', id: id };
  var p = LIVE ? getJson('api/item/' + id) : Promise.resolve(STATIC.details[id]);
  p.then(function (d) { if (d && open && open.type === 'item' && open.id === id) { D = d; drawItem(refresh); } });
}
var TABS = [['story', 'Story'], ['nq', 'Hand-offs'], ['checks', 'Checks'], ['change', 'Change'], ['calls', 'Calls'], ['log', 'Log'], ['trace', 'Trace']];
function drawItem(keep) {
  var v = D.view, it = D.item;
  var counts = { nq: D.exchanges.reduce(function (n, x) { return n + x.turns.length; }, 0), checks: D.checks.length, change: (it.change && it.change.files.length) || 0, calls: D.calls.length, log: D.events.length };
  var head = '<h3>#' + v.id + ' ' + esc(v.title) + ' <span class="tag ' + esc(v.kind) + '">' + esc(v.kind) + '</span><span class="tag st-' + v.status + '">' + esc(v.status) + '</span>' + (v.round > 1 ? '<span class="tag">round ' + v.round + '</span>' : '') + '</h3>' +
    '<div class="sub">' + esc(v.doing) + (v.owes ? ' · next: <b>' + esc(v.owes) + '</b>' : '') + '</div>' + bigPipe(v.steps) +
    '<div class="tabs">' + TABS.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + (counts[t[0]] ? '<span class="n">' + counts[t[0]] + '</span>' : '') + '</button>'; }).join('') + '</div>';
  var body = ({ story: storyTab, nq: nqTab, checks: checksTab, change: changeTab, calls: callsTab, log: logTab, trace: traceTab })[tab]();
  show(head, body, keep);
  if (tab === 'trace') loadTrace(v.id);
}
function bigPipe(steps) {
  return '<div class="bigpipe">' + steps.map(function (st) {
    return '<div class="bp ' + st.state + '"><b>' + esc(jobName(st.job) || st.label) + '</b><div class="w">' + esc(st.who) + ' · ' + STATE_WORD[st.state] + '</div><div class="w">' + (st.calls ? mins(st.agentMs) + ' · ' + tk(st.tokens) + ' tok' : '&nbsp;') + (st.questions ? ' · <span style="color:var(--amber)">' + st.questions + '?</span>' : '') + '</div></div>';
  }).join('') + '</div>';
}
function list(a) { return a && a.length ? '<ul style="margin:4px 0;padding-left:20px">' + a.map(function (x) { return '<li>' + esc(typeof x === 'string' ? x : JSON.stringify(x)) + '</li>'; }).join('') + '</ul>' : '<span class="empty">none</span>'; }
function decisions(ds) { return (ds || []).map(function (d) { return '<div class="dec"><div class="q">' + esc(d.question) + '</div><div class="a">→ ' + esc(d.decision) + '</div>' + (d.why ? '<div class="y">' + esc(d.why) + '</div>' : '') + '</div>'; }).join(''); }
var KNOWN_OUT = ['discover', 'ideate', 'challenge', 'plan', 'implement', 'test-plan', 'arbitrate'];
function jobOrder(j) { var k = Object.keys(M.jobs || {}); return k.indexOf(j) < 0 ? 99 : k.indexOf(j); }
function fieldsOf(v) {
  if (v == null) return '';
  if (typeof v !== 'object') return '<div class="prose">' + esc(String(v)) + '</div>';
  if (Array.isArray(v)) return v.length ? '<ul>' + v.map(function (x) { return '<li>' + (typeof x === 'object' ? fieldsOf(x) : esc(String(x))) + '</li>'; }).join('') + '</ul>' : '<div class="prose" style="color:var(--mute)">none</div>';
  return Object.keys(v).map(function (k) { return '<div style="margin-top:6px"><b style="font-size:13px">' + esc(k) + '</b>' + fieldsOf(v[k]) + '</div>'; }).join('');
}
function storyTab() {
  var v = D.view, it = D.item, o = D.deliverables, h = '';
  if (v.hold) h += '<div class="hold"><div class="c">' + esc(v.hold.code) + '</div><div style="font-size:15px;margin:4px 0">' + esc(v.hold.message) + '</div>' + (Array.isArray(v.hold.context.questions) ? '<ol>' + v.hold.context.questions.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' : '') + v.next.map(cmd).join('') + '<details><summary>every fact of the hold</summary><pre>' + esc(JSON.stringify(v.hold.context, null, 2)) + '</pre></details></div>';
  h += '<h4>Objective</h4><div class="prose lead">' + esc(it.objective) + '</div>';
  if (o.discover && o.discover.text) h += '<h4>From discovery #' + (v.discovery || '') + '</h4><div class="prose">' + esc(o.discover.text) + '</div>';
  if (o.discover && o.discover.items) h += '<h4>Candidates found</h4>' + D.related.map(function (r) { return '<div><a href="#" data-item="' + r.id + '">#' + r.id + ' ' + esc(r.title) + '</a> <span class="tag st-' + r.status + '">' + esc(r.status) + '</span></div>'; }).join('');
  h += '<details><summary>the operator\'s own words</summary><pre>' + esc(it.source) + '</pre></details>';
  if (o.ideate) h += '<h4>Idea · ideator</h4><div class="prose lead">' + esc(o.ideate.outcome) + '</div><div class="prose" style="margin-top:8px">' + esc(o.ideate.approach) + '</div>' + (o.ideate.decisions && o.ideate.decisions.length ? '<details><summary>' + plural(o.ideate.decisions.length, 'decision') + '</summary>' + decisions(o.ideate.decisions) + '</details>' : '');
  if (o.challenge) h += '<h4>Challenge · ideation peer</h4>' + (o.challenge.findings || []).map(function (f) { return '<div class="dec"><div class="q">' + esc(f.finding) + '</div><div class="a">→ ' + esc(f.resolution) + '</div></div>'; }).join('') + (o.challenge.decisions && o.challenge.decisions.length ? '<details><summary>' + plural(o.challenge.decisions.length, 'decision') + '</summary>' + decisions(o.challenge.decisions) + '</details>' : '');
  if (o.plan) {
    var p = o.plan;
    h += '<h4>Plan · planner</h4><div class="prose lead">' + esc(p.making) + '</div>';
    if (p.notMaking && p.notMaking.length) h += '<div style="margin-top:6px"><b style="font-size:13px">Not making</b>' + list(p.notMaking) + '</div>';
    h += '<div style="margin-top:8px"><b style="font-size:13px">Scope</b> <div class="chips">' + (p.scope || []).map(function (f) { return '<span class="chip">' + esc(f) + '</span>'; }).join('') + '</div></div>';
    if (p.follows && p.follows.length) h += '<div style="margin-top:6px;font-size:13px">' + p.follows.map(function (f) { return '<code>' + esc(f.path) + '</code> follows <code>' + esc(f.follows) + '</code>'; }).join('<br>') + '</div>';
    h += '<div style="margin-top:8px"><b style="font-size:13px">Steps</b><ol class="steps">' + (p.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
    h += '<div style="margin-top:8px"><b style="font-size:13px">Done when</b><div class="dw">' + (p.doneWhen || []).map(function (d) { return '<span class="id">' + esc(d.id) + '</span><span>' + esc(d.text) + '</span>'; }).join('') + '</div></div>';
    if (p.decisions && p.decisions.length) h += '<details><summary>' + plural(p.decisions.length, 'decision') + '</summary>' + decisions(p.decisions) + '</details>';
  }
  if (o.implement) h += '<h4>Implementer</h4><div class="prose">' + esc(o.implement.summary || o.implement.blocked || '') + '</div>';
  if (o['test-plan'] && o['test-plan'].blocked) h += '<h4>Test architect</h4><div class="prose">' + esc(o['test-plan'].blocked) + '</div>';
  // A cartridge's own steps: each deliverable drawn from its fields, in lane order.
  Object.keys(o).filter(function (j) { return KNOWN_OUT.indexOf(j) < 0; }).sort(function (a, b) { return jobOrder(a) - jobOrder(b); }).forEach(function (j) { h += '<h4>' + esc(jobName(j)) + ' · ' + esc(profileName(j)) + '</h4>' + fieldsOf(o[j]); });
  if (it.failure) h += '<h4>Open failure</h4><pre>' + esc(it.failure) + '</pre>';
  if (o.arbitrate) h += '<h4>Arbiter\'s ruling</h4><div class="dec"><div class="q">Cause: ' + esc(o.arbitrate.cause) + '</div><div class="a">' + esc(o.arbitrate.answer) + '</div><div class="y">' + esc(o.arbitrate.evidence) + '</div></div>';
  if (it.rework) h += '<h4>Round ' + it.round + ' works from this ruling</h4><div class="dec"><div class="q">' + esc(it.rework.cause) + '</div><div class="a">' + esc(it.rework.answer) + '</div></div>';
  if (v.commit) h += '<h4>Shipped</h4><div class="prose">' + esc(v.doing) + ' · <code>' + esc(v.commit) + '</code></div>';
  if (D.related.length && !(o.discover && o.discover.items)) h += '<h4>Related</h4>' + D.related.map(function (r) { return '<div><a href="#" data-item="' + r.id + '">#' + r.id + ' ' + esc(r.title) + '</a> <span class="tag st-' + r.status + '">' + esc(r.status) + '</span></div>'; }).join('');
  return h;
}
function nqTab() {
  if (!D.exchanges.length) return '<div class="empty">No hand-offs yet.</div>';
  return '<div class="prose" style="margin-bottom:6px;font-size:13px;color:var(--mute)">Every hand-off between agents is an NQ exchange: the receiver states what it understood and asks what is unclear; the one who handed over answers. Three answered turns with questions still open hold the item for you.</div>' + D.exchanges.map(function (x) {
    return '<div class="xch"><div class="xh">' + esc(x.from) + ' → ' + esc(x.to) + ' <span>· ' + esc(x.job) + ' · ' + (x.turns.length ? plural(x.turns.length, 'turn') : 'no questions') + '</span></div>' +
      x.turns.map(function (t, k) {
        return '<div class="turn"><div class="qh">Turn ' + (k + 1) + ' · ' + (t.error ? 'an error, asked as a question' : plural(t.questions.length, 'question')) + ' · ' + clock(t.at) + '</div>' + (t.understanding ? '<details><summary>what the ' + esc(x.to) + ' understood</summary><div class="prose" style="font-size:13px">' + esc(t.understanding) + '</div></details>' : '') +
          '<ol>' + t.questions.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' + (t.answer ? '<div class="ans"><b>' + esc(t.by === 'operator' ? 'you answered' : 'the ' + x.from + ' answered') + '</b>' + esc(t.answer) + '</div>' : t.by ? '<div class="ans"><b>answered by the ' + esc(t.by) + '</b></div>' : '<div class="ans"><b>waiting for an answer</b></div>') + '</div>';
      }).join('') + (x.clear ? '<div class="turn clear"><div class="qh">Clear · ' + clock(x.clear.at) + '</div>' + (x.clear.understanding ? '<div class="prose" style="font-size:13px">' + esc(x.clear.understanding) + '</div>' : '') + (x.clear.notes.length ? '<details><summary>' + plural(x.clear.notes.length, 'note') + ' that travel with the work</summary>' + list(x.clear.notes) + '</details>' : '') + '</div>' : '') + '</div>';
  }).join('');
}
function checksTab() {
  var plan = D.deliverables.plan, res = {}, h = '';
  (D.verification ? D.verification.results : []).forEach(function (r) { res[r.id] = r; });
  if (!D.checks.length && !D.verification) return '<div class="empty">No checks yet: the test architect writes them from the plan, blind to the change.</div>';
  if (D.verification) h += '<div class="prose" style="margin-bottom:10px">' + (D.verification.passed ? '<span class="ok-t">✓ Every check passed</span>' : '<span class="bad-t">✕ ' + D.verification.results.filter(function (r) { return r.exitCode !== 0; }).length + ' failed</span>') + ' when Made Well ran them on <code>' + esc(D.verification.on.slice(0, 12)) + '</code> with the implementer\'s change.</div>';
  var gates = (D.verification ? D.verification.results : []).filter(function (r) { return r.doneWhen === '(gate)'; });
  var groups = (plan && plan.doneWhen ? plan.doneWhen : []).map(function (d) { return { d: d, checks: D.checks.filter(function (c) { return c.doneWhen === d.id; }) }; });
  if (!groups.length) groups = [{ d: { id: '', text: '' }, checks: D.checks }];
  h += '<table><tr><th>Done when</th><th>Check</th><th class="num">Result</th></tr>' + groups.map(function (g) {
    return g.checks.map(function (c, k) {
      var r = res[c.id];
      return '<tr>' + (k === 0 ? '<td rowspan="' + g.checks.length + '" style="width:38%"><span class="mono" style="color:var(--mute)">' + esc(g.d.id) + '</span> ' + esc(g.d.text) + '</td>' : '') + '<td><span class="mono">' + esc(c.id) + '</span> <code>' + esc(c.run) + '</code>' + (r && r.exitCode !== 0 ? '<pre>' + esc(r.output) + '</pre>' : '') + '</td><td class="num">' + (r ? (r.exitCode === 0 ? '<span class="ok-t">✓</span> ' : '<span class="bad-t">✕ exit ' + r.exitCode + '</span> ') + dur(r.ms) : '<span class="empty">not run</span>') + '</td></tr>';
    }).join('') || '<tr><td>' + esc(g.d.id + ' ' + g.d.text) + '</td><td class="empty">no check</td><td></td></tr>';
  }).join('') + gates.map(function (r) { return '<tr><td><span class="mono" style="color:var(--mute)">gate</span> the project\'s own</td><td><code>' + esc(r.run) + '</code>' + (r.exitCode !== 0 ? '<pre>' + esc(r.output) + '</pre>' : '') + '</td><td class="num">' + (r.exitCode === 0 ? '<span class="ok-t">✓</span> ' : '<span class="bad-t">✕</span> ') + dur(r.ms) + '</td></tr>'; }).join('') + '</table>';
  if (D.diff.checks) h += '<h4>The check files</h4>' + diffHtml(D.diff.checks);
  return h;
}
function diffHtml(text) {
  return '<div class="diff">' + text.split('\n').map(function (l) { var c = /^(\+\+\+|---|diff |index )/.test(l) ? 'f' : l[0] === '+' ? 'a' : l[0] === '-' ? 'r' : l.slice(0, 2) === '@@' ? 'h' : ''; return '<div class="' + c + '">' + (esc(l) || ' ') + '</div>'; }).join('') + '</div>';
}
function changeTab() {
  var files = (D.item.change && D.item.change.files) || [];
  if (!files.length && !D.diff.change) return '<div class="empty">No change yet: the implementer makes it from the plan.</div>';
  return (files.length ? '<h4>' + plural(files.length, 'file') + '</h4><div class="chips">' + files.map(function (f) { return '<span class="chip">' + esc(f) + '</span>'; }).join('') + '</div>' : '') + (D.diff.change ? '<h4>' + (D.view.commit ? 'As shipped' : 'The patch waiting to ship') + '</h4>' + diffHtml(D.diff.change) : '');
}
function callsTab() {
  if (!D.calls.length) return '<div class="empty">No calls yet.</div>';
  var sum = D.calls.reduce(function (a, c) { a.ms += c.ms; a.t += tok(c.tokens); return a; }, { ms: 0, t: 0 });
  return '<div class="prose" style="font-size:13px;margin-bottom:8px">' + plural(D.calls.length, 'call') + ' · ' + mins(sum.ms) + ' of agent time · ' + tk(sum.t) + ' tokens</div><table><tr><th>#</th><th>Call</th><th>Card</th><th class="num">Time</th><th class="num">Tokens</th><th class="num">Tools</th><th>Outcome</th></tr>' + D.calls.map(function (c) {
    return '<tr class="click" data-call="' + c.id + '"><td class="num">' + c.id + '</td><td><b>' + esc(c.kind === 'execute' ? jobName(c.job) : c.kind) + '</b> <span style="color:var(--mute)">' + esc((c.kind === 'execute' ? '' : c.job + ' · ') + c.profile) + '</span></td><td class="mono" style="color:var(--mute)">' + esc(c.card.harness + ' · ' + c.card.model) + '</td><td class="num">' + dur(c.ms) + '</td><td class="num">' + tk(tok(c.tokens)) + '</td><td class="num">' + c.toolCount + '</td><td>' + (c.outcome === 'ok' ? '<span class="ok-t">ok</span>' : '<span class="bad-t">' + esc(c.outcome) + '</span>') + (c.flags.length ? ' <span class="bad-t">' + plural(c.flags.length, 'rule break') + '</span>' : '') + '</td></tr>';
  }).join('') + '</table>';
}
function logTab() { return '<div class="log" style="max-height:none">' + D.events.map(evRow).join('') + '</div>'; }
function traceTab() { return LIVE ? '<div id="spans" class="empty">Loading the trace…</div>' : '<div class="empty">The trace is read from spans.jsonl by the live console (<code>mw ui</code>).</div>'; }
function loadTrace(id) {
  getJson('api/spans/' + id).then(function (spans) {
    var el = $('spans'); if (!el) return;
    if (!spans.length) { el.innerHTML = 'No spans for this item. Spans are written to spans.jsonl beside the store while Made Well runs (MW_DEBUG=0 turns them off).'; return; }
    var by = {}, roots = [], max = Math.max.apply(null, spans.map(function (s) { return s.ms; }).concat([1]));
    spans.forEach(function (s) { by[s.span] = s; s.kids = []; });
    spans.forEach(function (s) { if (s.parent && by[s.parent]) by[s.parent].kids.push(s); else roots.push(s); });
    var out = '', walk = function (s, d) {
      out += '<div class="span' + (s.outcome === 'error' ? ' err' : '') + '" title="' + esc(JSON.stringify(s.attributes)) + '"><div style="padding-left:' + (d * 14) + 'px">' + esc(s.name) + ' <span style="color:var(--faint)">' + clock(s.start) + (s.attributes.job ? ' · ' + esc(s.attributes.job) : '') + '</span><div class="b2" style="width:' + Math.max(0.5, s.ms / max * 100) + '%"></div></div><div style="text-align:right;color:var(--mute)">' + dur(s.ms) + '</div></div>';
      s.kids.sort(function (a, b) { return a.start < b.start ? -1 : 1; }).forEach(function (k) { walk(k, d + 1); });
    };
    roots.sort(function (a, b) { return a.start < b.start ? -1 : 1; }).forEach(function (r) { walk(r, 0); });
    el.className = ''; el.innerHTML = out;
  });
}

function loadCall(id) {
  var back = open && open.type === 'item' ? open.id : null;
  open = { type: 'call', id: id, back: back };
  var p = LIVE ? getJson('api/call/' + id) : Promise.resolve(STATIC.calls[id]);
  p.then(function (c) { if (c && open && open.type === 'call' && open.id === id) drawCall(c, back); });
}
function pretty(text) { var j = null; try { var s = (text || '').replace(/^\s*\x60{3}(json)?/, '').replace(/\x60{3}\s*$/, ''); j = JSON.parse(s); } catch (e) {} return '<pre>' + esc(j ? JSON.stringify(j, null, 2) : text || '(none)') + '</pre>'; }
function drawCall(c, back) {
  var head = (back ? '<a href="#" class="back" data-item="' + back + '">← #' + back + '</a>' : '<a href="#" class="back" data-item="' + c.item + '">← #' + c.item + '</a>') +
    '<h3>' + esc(c.kind === 'execute' ? jobName(c.job) + ' · ' + c.profile : c.kind + ' · ' + c.job + ' · ' + c.profile) + ' <span class="tag">call ' + c.id + '</span>' + (c.outcome === 'ok' ? '' : '<span class="tag st-held">' + esc(c.outcome) + '</span>') + '</h3>' +
    '<div class="sub">' + esc([c.card.harness, c.card.model, c.card.effort].filter(function (x, k, a) { return x && a.indexOf(x) === k; }).join(' · ')) + ' · ' + esc(clock(c.started)) + ' · ' + dur(c.ms) + ' · ' + (c.tokens ? tk(tok(c.tokens)) + ' tokens (' + num(c.tokens.output) + ' out, ' + num(c.tokens.cacheRead) + ' cache read)' : 'tokens not reported') + (c.facts && c.facts.access ? ' · ' + esc(c.facts.access) + ' access' : '') + '</div>';
  var h = '';
  if (c.error) h += '<h4>' + (c.outcome === 'rejected' ? 'Refused by Made Well' : 'Error') + '</h4><pre>' + esc(c.error) + '</pre>';
  h += c.flags.length ? '<h4>Rule breaks</h4>' + c.flags.map(function (f) { return '<div class="hold"><div class="c">' + esc(f.rule) + '</div><pre>' + esc(JSON.stringify(f.evidence, null, 2)) + '</pre></div>'; }).join('') : '';
  h += '<h4>Answer</h4>' + pretty(c.output);
  h += '<h4>What the agent did · ' + plural(c.tools.length, 'tool call') + '</h4><div class="tx">' + transcript(c.raw || '', Date.parse(c.started), c.output) + '</div>';
  h += '<h4>Given</h4><details><summary>the packet (' + num((c.prompt || '').length) + ' characters)</summary>' + pretty(c.prompt) + '</details><details><summary>the brief every call shares</summary><pre>' + esc(c.system) + '</pre></details>';
  if (c.facts) h += '<details><summary>facts the rules were checked against</summary><pre>' + esc(JSON.stringify(c.facts, null, 2)) + '</pre></details>';
  show(head, h);
}
// The agent's stream as a person reads it: what it said, each tool it called with its input, and how big each result was.
function transcript(raw, t0, answer) {
  var out = [], results = {}, final = (answer || '').trim();
  var lines = raw.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { try { return JSON.parse(l); } catch (e) { return { type: 'text', text: l }; } });
  lines.forEach(function (v) { var p = v.message && Array.isArray(v.message.content) ? v.message.content : []; p.forEach(function (b) { if (b.type === 'tool_result') results[b.tool_use_id] = b; }); });
  t0 = t0 || (lines.length && lines[0].mw_at);
  lines.forEach(function (v) {
    var at = v.mw_at && t0 ? '<span style="color:var(--faint)">+' + ((v.mw_at - t0) / 1000).toFixed(0) + 's</span> ' : '';
    if (v.type === 'assistant' && v.message) (v.message.content || []).forEach(function (b) {
      if (b.type === 'text' && b.text && b.text.trim()) out.push('<div>' + at + '<span class="k">says</span>' + (final && b.text.trim() === final ? ' <span style="color:var(--faint)">its answer, shown above (' + num(final.length) + ' characters)</span>' : '<div class="say">' + esc(b.text.length > 3000 ? b.text.slice(0, 3000) + '…' : b.text) + '</div>') + '</div>');
      if (b.type === 'tool_use') { var r = results[b.id], size = r ? JSON.stringify(r.content || '').length : 0; out.push('<div>' + at + '<span class="k">' + esc(b.name) + '</span> <span class="tool">' + esc(toolLine(b.input)) + '</span>' + (r ? ' <span style="color:var(--faint)">→ ' + num(size) + ' chars' + (r.is_error ? ', error' : '') + '</span>' : '') + '</div>'); }
    });
    else if (v.type === 'item.started' && v.item && v.item.command) out.push('<div>' + at + '<span class="k">shell</span> <span class="tool">$ ' + esc(v.item.command) + '</span></div>');
    else if (v.type === 'item.completed' && v.item && v.item.type === 'agent_message') out.push('<div>' + at + '<span class="k">says</span><div class="say">' + esc(v.item.text) + '</div></div>');
    else if (v.type === 'tool_execution_start') out.push('<div>' + at + '<span class="k">' + esc(v.toolName) + '</span> <span class="tool">' + esc(toolLine(v.args)) + '</span></div>');
    else if (v.type === 'text') out.push('<div>' + esc(v.text) + '</div>');
  });
  return out.join('') || '<span class="empty">No stream recorded.</span>';
}
function toolLine(input) {
  input = input || {};
  var path = input.path || input.file_path || input.filePath;
  if (input.command || input.cmd) return '$ ' + (input.command || input.cmd);
  if (path) return String(path).replace(/^.*\/worktrees\/[^/]+\//, '') + (input.read_range ? ' ' + JSON.stringify(input.read_range) : '');
  var s = JSON.stringify(input); return s.length > 400 ? s.slice(0, 400) + '…' : s;
}
function drawRun(f) {
  open = { type: 'run' };
  var name = f.live ? f.live.split('/').pop() : null;
  show('<a href="#" class="back" data-item="' + f.item + '">← #' + f.item + '</a><h3>' + esc(f.kind === 'execute' ? jobName(f.job) : f.kind + ' · ' + f.job) + ' · ' + esc(f.who) + ' <span class="tag st-running">running</span></h3><div class="sub">' + esc(f.title) + (f.card ? ' · ' + esc(f.card) : '') + ' · since ' + esc(clock(f.since)) + '</div>',
    '<h4>Live</h4><div class="tx" id="tail">' + (name ? 'waiting for output…' : 'This step streams no output.') + '</div>');
  liveTail = name ? { name: name, from: 0, text: '' } : null;
  tail();
}
function tail() {
  if (!liveTail || !LIVE) return;
  var t = liveTail;
  getJson('api/live/' + encodeURIComponent(t.name) + '?from=' + t.from).then(function (d) {
    if (liveTail !== t) return;
    if (d.gone) { var el0 = $('tail'); if (el0) el0.innerHTML += '<div style="color:var(--green)">— the step ended; its record is in the item\'s calls —</div>'; liveTail = null; return; }
    t.from = d.next; t.text = (t.text + d.text).slice(-600000);
    var el = $('db'), stick = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    var tl = $('tail'); if (tl) tl.innerHTML = transcript(t.text) || 'waiting for output…';
    if (stick) el.scrollTop = el.scrollHeight;
  }).catch(function () {});
}

// ── Wiring ──
document.addEventListener('click', function (ev) {
  var c = ev.target.closest('[data-copy]');
  if (c) { navigator.clipboard.writeText(c.dataset.copy); c.textContent = 'Copied'; setTimeout(function () { c.textContent = 'Copy'; }, 1200); return; }
  var tb = ev.target.closest('[data-tab]');
  if (tb) { tab = tb.dataset.tab; drawItem(false); return; }
  var t = ev.target.closest('[data-item],[data-call],[data-run]'); if (!t) return;
  if (t.tagName === 'A') ev.preventDefault();
  if (t.dataset.call) { ev.stopPropagation(); return loadCall(Number(t.dataset.call)); }
  if (t.dataset.run) return drawRun(M.running[Number(t.dataset.run)]);
  if (t.dataset.item) return loadItem(Number(t.dataset.item));
});
$('scrim').onclick = closeDrawer;
$('q').oninput = function () { if (M) renderLog(); };
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeDrawer(); });

function poll() {
  getJson('api/mark').then(function (m) {
    lastOk = Date.now();
    if (m.store === null) { $('hero').innerHTML = '<div class="empty">No store yet at ' + esc(m.path) + '. It appears with the first <code>mw discover</code> or <code>mw start</code>; this page picks it up by itself.</div>'; return; }
    var key = JSON.stringify(m);
    if (key === MARK) return tick();
    MARK = key;
    return getJson('api/model').then(function (s) { M = s; render(); });
  }).catch(function () {}).then(function () {
    var ok = Date.now() - lastOk < 4000;
    $('conn').className = 'pill ' + (ok ? 'mute' : 'bad'); $('conn').innerHTML = ok ? '<span class="dot pulse" style="color:var(--green)"></span>live' : '<span class="dot"></span>disconnected: is mw ui still running?';
    tail();
  });
}
function tick() { document.querySelectorAll('[data-since]').forEach(function (el) { el.textContent = dur(now() - Date.parse(el.dataset.since)); }); }
if (LIVE) { poll(); setInterval(poll, 1000); }
else { M = STATIC.model; $('conn').hidden = true; render(); }
</script></body></html>`
