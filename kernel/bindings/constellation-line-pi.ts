// constellation-line-pi — Pi's side of the status line. A one-line widget shows `constellation
// line` for the project Pi is in ('2 being made · 1 question for you', or 'all quiet'), and
// refreshes when a session starts, whenever the agent settles, and every thirty seconds.
// Nothing shows where there is no Constellation. Load it: pi -e ./.constellation/bindings/constellation-line-pi.ts
// @ts-nocheck
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const beside = join(dirname(fileURLToPath(import.meta.url)), "../bin/constellation");
const door = existsSync(beside) ? beside : "constellation";

export function line(cwd) {
  return new Promise((resolve) => {
    try {
      execFile(door, ["line"], { cwd, timeout: 15000 }, (err, stdout) => resolve(err ? "" : String(stdout ?? "").trim()));
    } catch { resolve(""); }
  });
}

export default function (pi) {
  let timer;
  const show = async (ctx) => {
    const text = await line(ctx.cwd);
    try { ctx.ui.setWidget("constellation", text ? [text] : undefined); } catch {}
  };
  pi.on("session_start", async (_event, ctx) => {
    await show(ctx);
    if (timer) clearInterval(timer);
    timer = setInterval(() => { show(ctx); }, 30000);
    timer.unref?.();
  });
  pi.on("agent_settled", async (_event, ctx) => { await show(ctx); });
  pi.on("session_shutdown", async () => { if (timer) clearInterval(timer); timer = undefined; });
}
