#!/usr/bin/env node

// src/ui-server.ts
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
var host = process.env.MW_UI_HOST ?? "127.0.0.1";
var port = Number(process.env.MW_UI_PORT ?? process.argv.find((a) => a.startsWith("--port="))?.slice("--port=".length) ?? 4848);
var mw = process.env.MW_COMMAND ?? "mw";
var depths = ["overview", "details", "raw"];
var runJson = (args) => JSON.parse(execFileSync(mw, args, { encoding: "utf8", timeout: 1e4 }));
var clean = (s) => String(s ?? "").replace(/\bthree[- ]lens\b/gi, "item").replace(/\blenses\b/gi, "views").replace(/\blens\b/gi, "view").replace(/\bdial\b/gi, "control").replace(/\bghost\b/gi, "context").replace(/\bglass core\b/gi, "work view").replace(/\bchamber\b/gi, "lane").replace(/\brocket\b/gi, "delivery item").replace(/\bspecimen\b/gi, "item").replace(/\bmanifold\b/gi, "view").replace(/\bitem item\b/gi, "item");
var short = (s, n = 220) => {
  const t = clean(s).replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}\u2026` : t;
};
var firstCommand = (next) => next?.map((n) => n.run).find(Boolean);
var laneOf = (item) => {
  const base = item.item ?? item;
  if (item.kind === "discovery" || base.kind === "discovery" || item.job === "discover" || base.job === "discover" || item.status === "discovered") return "discovery";
  return "delivery";
};
var parentOf = (item) => item.item?.parent ?? item.parent ?? item.item?.discovery ?? item.discovery;
var childIdsOf = (item, items) => items.filter((candidate) => parentOf(candidate) === item.id || candidate.waitsOn === item.id || candidate.after?.includes(item.id)).map((candidate) => candidate.id);
var statusWord = (item, hold) => {
  if (item.status === "shipped" || item.status === "discovered") return "shipped";
  if (item.status === "dropped") return "dropped";
  if (item.status === "candidate") return "waiting on you";
  if (item.status === "held" || item.status === "paused") {
    const code = item.hold?.code ?? hold?.code;
    const commands = [...item.next ?? [], ...item.hold?.next ?? [], ...hold?.next ?? []].map((n) => n.run ?? "").join(" ");
    return code === "checkpoint" || commands.includes("mw answer") || commands.includes("mw go") ? "waiting on you" : "stuck";
  }
  if (item.status.startsWith("waiting-")) return "stuck";
  return "moving";
};
var rowLine = (item, hold) => {
  const message = item.hold?.message ?? hold?.message;
  const command = firstCommand(item.hold?.next) ?? firstCommand(hold?.next) ?? firstCommand(item.next);
  if (item.status === "candidate") return command ? `Waiting for promotion. Next: ${command}` : "Waiting for promotion.";
  if (!message) return void 0;
  return `${message}${command ? ` Next: ${command}` : ""}`;
};
var objectiveOf = (item) => clean(item.item?.objective ?? item.item?.title ?? item.title);
var rowOf = (item, items, hold) => {
  const word = statusWord(item, hold);
  return {
    id: item.id,
    lane: laneOf(item),
    objective: objectiveOf(item),
    stage: clean(item.stage ?? item.item?.job ?? item.job ?? "unknown"),
    status: word,
    childCount: childIdsOf(item, items).length,
    ...parentOf(item) !== void 0 ? { parent: parentOf(item) } : {},
    ...word === "waiting on you" || word === "stuck" ? { line: clean(rowLine(item, hold) ?? "") } : {}
  };
};
var eventSentence = (event) => {
  const data = event.data;
  const why = data?.message ?? data?.error ?? data?.job ?? data?.title ?? "";
  return `#${event.seq ?? ""} ${event.kind ?? "event"}${why ? `: ${short(why, 140)}` : ""}`;
};
var keyValues = (pairs) => pairs.filter(([, value]) => value !== void 0 && value !== null && value !== "").map(([label, value]) => ({ label, value: clean(typeof value === "object" ? JSON.stringify(value) : value) }));
var loadBoard = (nodeId, depth = "overview") => {
  const status = runJson(["status"]);
  const holds = runJson(["holds"]);
  const holdByItem = new Map(holds.holds.map((h) => [h.item, h]));
  const items = status.items.map((item) => {
    try {
      return runJson(["show", String(item.id)]);
    } catch {
      return item;
    }
  });
  const rows = items.map((item) => rowOf(item, items, holdByItem.get(item.id)));
  const rootRows = rows.filter((row) => row.parent === void 0);
  const focused = nodeId === void 0 ? void 0 : items.find((item) => item.id === nodeId);
  const laneRows = focused ? rows.filter((row) => row.parent === focused.id) : rootRows;
  const counts = (word) => rows.filter((row) => row.status === word).length;
  const node = focused ? nodeView(focused, items, rows, holdByItem.get(focused.id), depth) : void 0;
  return {
    counts: { moving: counts("moving"), waiting: counts("waiting on you"), stuck: counts("stuck"), shipped: counts("shipped"), dropped: counts("dropped") },
    rows: laneRows,
    allRows: rows,
    focus: node,
    depth,
    loadedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
};
var nodeView = (item, items, rows, hold, depth) => {
  const row = rowOf(item, items, hold);
  const parentId = parentOf(item);
  const children = childIdsOf(item, items).map((id) => rows.find((row2) => row2.id === id)).filter(Boolean);
  const next = [...item.next ?? [], ...item.hold?.next ?? [], ...hold?.next ?? []];
  const overview = {
    items: keyValues([
      ["State", row.status],
      ["Done", row.status === "shipped" ? "yes" : "no"],
      ["Needs you", row.status === "waiting on you" ? "yes" : "no"],
      ["Stage", row.stage],
      ["Next action", firstCommand(next) ?? "No operator action listed"]
    ]),
    sentence: `${row.objective}. It is ${row.status} at ${row.stage}.${row.line ? ` ${row.line}` : ""}`
  };
  const details = {
    items: keyValues([
      ["Item", item.id],
      ["Lane", row.lane],
      ["Status", item.status],
      ["Stage", item.stage],
      ["Job", item.job],
      ["Profile", item.profile],
      ["Round", item.round],
      ["Workspace", item.item?.workspace],
      ["Hold", item.hold?.code ?? hold?.code],
      ["Hold details", item.hold?.context ?? hold?.context],
      ["Parent", parentId],
      ["Children", children.map((child) => `#${child.id}`).join(", ")]
    ]),
    events: (item.events ?? []).slice(-8).map(eventSentence)
  };
  const raw = clean(JSON.stringify({ item: item.item ?? item, events: item.events ?? [], next }, null, 2));
  return { id: item.id, title: row.objective, row, parentId, children, next, overview, details, raw, depth };
};
var html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Made Well</title>
<style>
:root { color-scheme: light; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; background: #fff; }
body { margin: 0; padding: 24px; }
main { max-width: 1180px; margin: 0 auto; }
a, button { color: #111; }
header { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; margin-bottom: 18px; }
#counts { font-size: 20px; font-weight: 650; }
.updated { color: #666; font-size: 13px; }
.focus { border: 1px solid #ccc; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
.focus h1 { font-size: 18px; margin: 0 0 8px; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.controls a { border: 1px solid #ccc; border-radius: 6px; padding: 6px 9px; text-decoration: none; font-size: 13px; }
.controls a.active { background: #111; color: #fff; }
.columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
section { border: 1px solid #ddd; border-radius: 8px; background: #fff; }
h2 { font-size: 16px; margin: 0; padding: 12px 14px; border-bottom: 1px solid #ddd; }
.row { padding: 12px 14px; border-top: 1px solid #eee; }
.row:first-of-type { border-top: 0; }
.top { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: baseline; }
.objective { font-size: 15px; line-height: 1.35; }
.meta, .children { margin-top: 4px; color: #555; font-size: 13px; }
.status { font-size: 13px; white-space: nowrap; color: #111; }
.line { margin-top: 8px; color: #333; font-size: 13px; line-height: 1.35; }
.empty { padding: 14px; color: #666; font-size: 14px; }
dl { display: grid; grid-template-columns: 150px 1fr; gap: 6px 12px; margin: 10px 0 0; }
dt { color: #555; }
dd { margin: 0; }
ul { margin: 8px 0 0; padding-left: 20px; }
pre { background: #f6f6f6; border: 1px solid #ddd; border-radius: 6px; padding: 12px; overflow: auto; font-size: 12px; line-height: 1.35; }
.error { color: #9b1c1c; white-space: pre-wrap; }
@media (max-width: 760px) { body { padding: 16px; } .columns { grid-template-columns: 1fr; } header { display: block; } dl { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
<header><div id="counts">Loading\u2026</div><div class="updated" id="updated"></div></header>
<div id="focus"></div>
<div class="columns">
<section><h2>Delivery</h2><div id="delivery"></div></section>
<section><h2>Discovery</h2><div id="discovery"></div></section>
</div>
</main>
<script>
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params = () => new URLSearchParams(location.search);
const nodeId = () => params().get('node');
const depth = () => params().get('depth') || 'overview';
const href = (node, d = depth()) => node ? '?node=' + encodeURIComponent(node) + '&depth=' + encodeURIComponent(d) : '?depth=' + encodeURIComponent(d);
function renderRow(r) {
  return '<div class="row"><div class="top"><div><div class="objective"><a href="' + href(r.id) + '">' + esc(r.objective) + '</a></div><div class="meta">' + esc(r.stage) + '</div>' + (r.childCount ? '<div class="children">' + esc(r.childCount) + ' child item' + (r.childCount === 1 ? '' : 's') + '</div>' : '') + '</div><div class="status">' + esc(r.status) + '</div></div>' + (r.line ? '<div class="line">' + esc(r.line) + '</div>' : '') + '</div>';
}
function renderLane(id, rows) {
  document.getElementById(id).innerHTML = rows.length ? rows.map(renderRow).join('') : '<div class="empty">No items.</div>';
}
function list(items) { return items.length ? '<dl>' + items.map((i) => '<dt>' + esc(i.label) + '</dt><dd>' + esc(i.value) + '</dd>').join('') + '</dl>' : ''; }
function renderFocus(node, d) {
  const el = document.getElementById('focus');
  if (!node) { el.innerHTML = '<div class="focus"><h1>All work</h1><div class="controls"><a class="active" href="' + href(null, d) + '">All work</a></div><p>Open an item below to inspect it. Delivery and Discovery stay visible.</p></div>'; return; }
  const tabs = [['overview','Overview'], ['details','Details'], ['raw','Raw']].map(([key,label]) => '<a class="' + (d === key ? 'active' : '') + '" href="' + href(node.id, key) + '">' + label + '</a>').join('');
  const nav = '<a href="' + href(null, d) + '">Back to all work</a>' + (node.parentId ? '<a href="' + href(node.parentId, d) + '">Open parent</a>' : '');
  let body = '';
  if (d === 'details') body = list(node.details.items) + (node.details.events.length ? '<h2>Recent history</h2><ul>' + node.details.events.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '');
  else if (d === 'raw') body = '<pre>' + esc(node.raw) + '</pre>';
  else body = '<p>' + esc(node.overview.sentence) + '</p>' + list(node.overview.items);
  const kids = node.children.length ? '<h2>Child items</h2><ul>' + node.children.map((r) => '<li><a href="' + href(r.id, d) + '">' + esc(r.objective) + '</a> \u2014 ' + esc(r.status) + '</li>').join('') + '</ul>' : '<p class="empty">No child items.</p>';
  el.innerHTML = '<div class="focus"><h1>' + esc(node.title) + '</h1><div class="controls">' + nav + '</div><div class="controls">' + tabs + '</div>' + body + kids + '</div>';
}
async function refresh() {
  try {
    const q = new URLSearchParams();
    if (nodeId()) q.set('node', nodeId());
    q.set('depth', depth());
    const res = await fetch('/api/board?' + q.toString(), { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    const c = data.counts;
    document.getElementById('counts').textContent = c.moving + ' moving \xB7 ' + c.waiting + ' waiting on you \xB7 ' + c.stuck + ' stuck \xB7 ' + c.shipped + ' shipped' + (c.dropped ? ' \xB7 ' + c.dropped + ' dropped' : '');
    document.getElementById('updated').textContent = 'Updated ' + new Date(data.loadedAt).toLocaleTimeString();
    renderFocus(data.focus, data.depth);
    renderLane('delivery', data.rows.filter((r) => r.lane === 'delivery'));
    renderLane('discovery', data.rows.filter((r) => r.lane === 'discovery'));
  } catch (err) {
    document.getElementById('counts').innerHTML = '<span class="error">Cannot read Made Well: ' + esc(err.message) + '</span>';
  }
}
refresh();
setInterval(refresh, 2000);
</script>
</body>
</html>`;
var server = createServer((req, res) => {
  try {
    if (req.url?.startsWith("/api/board")) {
      const url = new URL(req.url, `http://${host}:${port}`);
      const node = url.searchParams.get("node");
      const depth = depths.includes(url.searchParams.get("depth")) ? url.searchParams.get("depth") : "overview";
      const body = JSON.stringify(loadBoard(node ? Number(node) : void 0, depth));
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(body);
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html);
  } catch (e) {
    res.writeHead(500, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  }
});
server.listen(port, host, () => {
  process.stdout.write(JSON.stringify({ ui: `http://${host}:${port}/`, next: [] }) + "\n");
});
