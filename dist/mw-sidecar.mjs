#!/usr/bin/env node

// src/sidecar.ts
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
var exec = promisify(execFile);
var mw = fileURLToPath(new URL("../dist/mw.mjs", import.meta.url));
var hints = ["TMUX KEYS  Ctrl-b, then", "c   new tab/window", "&   close tab/window", "%   pane to the right", '"   pane below', "x   close pane"];
var clean = (s) => s.replace(/[\x00-\x1f\x7f\x1b]/g, " ");
var wrap = (s, width) => {
  let text = clean(s);
  const lines = [];
  while (text.length > width) {
    const space = text.lastIndexOf(" ", width);
    const split = space > 0 ? space : width;
    lines.push(text.slice(0, split));
    text = text.slice(split).trimStart();
  }
  return [...lines, text];
};
function render(board, width, height) {
  width = Math.max(1, width);
  const lines = ["MADE WELL", board.summary, ""];
  const holds = board.items.filter((i) => i.status === "held");
  if (holds.length) {
    lines.push(`NEEDS YOU  ${holds.length}`);
    for (const item of holds) {
      lines.push(`#${item.id}  ${item.title}`, item.hold?.message ?? "Waiting for your decision.");
      for (const step of item.next) lines.push(`  ${step.run}`);
      lines.push("");
    }
  }
  const running = board.items.filter((i) => ["running", "waiting-quota", "waiting-prerequisite"].includes(i.status));
  lines.push(`NOW  ${running.length}`);
  for (const item of running) {
    lines.push(`#${item.id}  ${item.title}`, `  ${item.stage} / ${item.job} \xB7 ${item.profile}`);
    if (item.card) lines.push(`  ${item.card.harness} / ${item.card.model}`);
    if (item.nq) lines.push(`  NQ: ${item.nq.status} \xB7 turn ${item.nq.turns}`);
    if (item.waitsOn !== void 0) lines.push(`  Waiting for #${item.waitsOn}`);
    if (item.resumesAt) lines.push(`  Quota resets ${item.resumesAt}`);
    if (item.next[0]?.run === "mw run") lines.push("  Stopped: mw run to resume");
  }
  if (!running.length) lines.push("  Nothing running.");
  lines.push("");
  const todo = board.items.filter((i) => ["candidate", "queued", "discovered"].includes(i.status));
  lines.push(`TO-DO  ${todo.length}`);
  for (const item of todo.slice(0, 4)) {
    lines.push(`#${item.id}  ${item.title}`);
    if (item.next[0]) lines.push(`  ${item.next[0].run}`);
  }
  if (todo.length > 4) lines.push(`  +${todo.length - 4} more`);
  if (!todo.length) lines.push("  No work waiting to start.");
  const today = board.items.filter((i) => i.status === "shipped" && i.updated && new Date(i.updated).toDateString() === (/* @__PURE__ */ new Date()).toDateString());
  lines.push("", `SHIPPED TODAY  ${today.length}`);
  for (const item of today.slice(0, 3)) lines.push(`#${item.id}  ${item.title}`);
  const footer = ["", ...hints];
  const bodyLines = lines.flatMap((s) => wrap(s, width));
  if (height !== void 0) {
    const body = bodyLines.slice(0, Math.max(0, height - footer.length));
    if (body.length < bodyLines.length && body.length) body[body.length - 1] = "\u2026 more: enlarge pane".slice(0, width);
    return [...body, ...Array(Math.max(0, height - footer.length - body.length)).fill(""), ...footer].slice(0, height).map((s) => s.slice(0, width)).join("\n");
  }
  return [...bodyLines, ...footer.flatMap((s) => wrap(s, width))].join("\n");
}
async function status(workspace) {
  const { stdout } = await exec(process.execPath, [mw, "status"], { timeout: 8e3, maxBuffer: 4 * 1024 * 1024 });
  const board = JSON.parse(stdout);
  if (workspace) {
    board.items = board.items.filter((item) => item.workspace === resolve(workspace));
    const count = (status2) => board.items.filter((item) => item.status === status2).length;
    board.summary = `${count("held")} need you, ${count("candidate")} candidates, ${count("running") + count("waiting-quota") + count("waiting-prerequisite")} in progress, ${count("queued")} queued, ${count("shipped")} shipped`;
  }
  await Promise.all(board.items.filter((i) => i.status === "running").map(async (item) => {
    try {
      const result = await exec(process.execPath, [mw, "show", String(item.id)], { timeout: 8e3, maxBuffer: 4 * 1024 * 1024 });
      const events = JSON.parse(result.stdout).events;
      const current = events.findLastIndex((e) => e.kind === "running");
      item.card = events.slice(current + 1).findLast((e) => e.kind !== "launch-failed" && e.data?.card)?.data?.card;
    } catch {
    }
  }));
  return board;
}
async function run({ once = false, width, workspace } = {}) {
  let busy = false, previous = "";
  const output = process.stdout;
  const draw = async () => {
    if (busy) return;
    busy = true;
    try {
      let frame;
      try {
        frame = render(await status(workspace), width ?? output.columns ?? 80, once ? void 0 : output.rows);
        if (!once && output.isTTY && !process.env.NO_COLOR) frame = frame.replace(/^NEEDS YOU.*$/m, "\x1B[31m$&\x1B[0m");
      } catch (error) {
        frame = `MADE WELL
Cannot read status: ${error instanceof Error ? error.message : String(error)}`;
      }
      if (frame !== previous) {
        previous = frame;
        output.write((once ? "" : "\x1B[H\x1B[2J") + frame + (once ? "\n" : ""));
      }
    } finally {
      busy = false;
    }
  };
  if (once) {
    await draw();
    return;
  }
  if (output.isTTY) output.write("\x1B[?1049h\x1B[?25l");
  const timer = setInterval(() => {
    void draw();
  }, 2e3);
  const resize = () => {
    previous = "";
    void draw();
  };
  output.on("resize", resize);
  const input = process.stdin;
  if (input.isTTY) {
    input.setRawMode(true);
    input.resume();
  }
  await draw();
  await new Promise((resolve2) => {
    const stop = () => resolve2();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    if (input.isTTY) input.on("data", (data) => {
      if (["q", "Q", ""].includes(data.toString())) stop();
    });
  });
  clearInterval(timer);
  output.off("resize", resize);
  if (input.isTTY) {
    input.setRawMode(false);
    input.pause();
  }
  if (output.isTTY) output.write("\x1B[?25h\x1B[?1049l");
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const index = args.indexOf("--width");
  const scope = args.indexOf("--workspace");
  const valid = args.every((arg, i) => arg === "--once" || arg === "--width" || arg === "--workspace" || index !== -1 && i === index + 1 || scope !== -1 && i === scope + 1) && (index === -1 || /^[1-9]\d*$/.test(args[index + 1] ?? "")) && (scope === -1 || Boolean(args[scope + 1]));
  if (!valid) {
    process.stderr.write("Usage: mw-sidecar [--workspace DIR] [--once] [--width N]\n");
    process.exitCode = 2;
  } else void run({ once: args.includes("--once"), width: index === -1 ? void 0 : Number(args[index + 1]), workspace: scope === -1 ? void 0 : args[scope + 1] }).catch((error) => {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  });
}
export {
  render,
  run
};
