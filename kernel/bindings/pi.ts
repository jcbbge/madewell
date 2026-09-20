/** Optional Pi binding. The execution protocol and records do not depend on Pi. */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, watch, type FSWatcher } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const door = join(dirname(fileURLToPath(import.meta.url)), "../bin/mw-session.py");
const reads = new Set(["read", "grep", "find", "ls"]);

export function parseRequest(value: unknown): Record<string, unknown> {
  const request = typeof value === 'string' ? JSON.parse(value) : value;
  if (!request || Array.isArray(request) || typeof request !== 'object') throw new Error('Request must be an object');
  return request as Record<string, unknown>;
}

export default function (pi: ExtensionAPI) {
  let selected: string | undefined;
  let watcher: FSWatcher | undefined;
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const directory = (ctx: ExtensionContext) => join(ctx.cwd, ".madewell/sessions");
  const state = (ctx: ExtensionContext) => {
    if (!selected) return undefined;
    return JSON.parse(readFileSync(join(directory(ctx), `${selected}.json`), "utf8"));
  };
  const render = (ctx: ExtensionContext) => {
    if (deadlineTimer) clearTimeout(deadlineTimer);
    try {
      const selectedState = state(ctx);
      const inspected = selectedState && spawnSync('python3', [door, '--root', ctx.cwd,
        '--session', selectedState.id, '--actor', ctx.sessionManager.getSessionId()],
        { input: JSON.stringify({ op: 'show' }), encoding: 'utf8' });
      if (inspected && inspected.status !== 0) throw new Error(inspected.stdout || inspected.stderr);
      const value = inspected ? JSON.parse(inspected.stdout) : undefined;
      if (!value) {
        ctx.ui.setStatus("madewell", "Made Well: no session — execution locked");
        ctx.ui.setWidget("madewell", undefined);
        return;
      }
      const expired = Date.now() / 1000 >= value.deadline;
      if (!expired && value.status === "active") {
        deadlineTimer = setTimeout(() => render(ctx), Math.ceil(value.deadline * 1000 - Date.now()) + 1);
        deadlineTimer.unref();
      }
      const visible = value.phase === "plan" ? ["plan", "implement", "verify"] : [value.phase];
      const steps = visible.flatMap(phase => Object.entries(value.phases[phase].steps).map(([id, step]) => [`${phase}/${id}`, step])) as [string, any][];
      const currentStatus = !value.proof.valid ? "stale proof (" + value.status + ")" : value.status === "done" ? "done · fresh proof" : expired ? "expired" : value.status;
      ctx.ui.setStatus("madewell", `${value.id} · ${value.phase} · ${currentStatus}`);
      ctx.ui.setWidget("madewell", [
        `${value.phase} · ${currentStatus}`,
        `${value.goal} | actor: ${value.actor}`,
        ...steps.map(([id, s]) => `${s.status === "done" ? "✓" : s.status === "running" ? "▶" : "·"} ${id}: ${s.title} [${s.status}]${s.after.length ? ` after ${s.after.join(", ")}` : ""}`),
      ]);
    } catch (error) {
      ctx.ui.setStatus("madewell", `Made Well: state unavailable — ${String(error)}`);
    }
  };
  const observe = (ctx: ExtensionContext) => {
    watcher?.close();
    watcher = undefined;
    if (existsSync(directory(ctx))) {
      watcher = watch(directory(ctx), () => render(ctx));
      watcher.unref();
    }
    render(ctx);
  };
  const invoke = (ctx: ExtensionContext, id: string, request: object, signal?: AbortSignal) =>
    new Promise<any>((resolve, reject) => {
      if (signal?.aborted) { reject(new Error("Cancelled before execution")); return; }
      const child = spawn("python3", [door, "--root", ctx.cwd, "--session", id,
        "--actor", ctx.sessionManager.getSessionId()], { stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      const cancel = () => child.kill("SIGINT");
      signal?.addEventListener("abort", cancel, { once: true });
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", (error) => { signal?.removeEventListener("abort", cancel); reject(error); });
      child.stdin.on("error", () => { /* authoritative exit follows */ });
      child.on("close", (code) => {
        signal?.removeEventListener("abort", cancel);
        observe(ctx);
        try {
          const value = JSON.parse(stdout);
          if (code !== 0) reject(new Error(value.error ?? stderr ?? `exit ${code}`));
          else resolve(value);
        } catch (error) { reject(new Error(`Execution did not return a state: ${stderr || String(error)}`)); }
      });
      child.stdin.end(JSON.stringify({ ...request, supervisor: process.pid }));
    });

  pi.registerTool({
    name: "mw_session",
    label: "Made Well execution",
    description: "Durable ideate → plan → implement → verify. Use start, propose, record, advance, run, show, stop, recover, resume, retry, reconcile, move. Read kernel/bindings/SESSION.md (installed: .madewell/bindings/SESSION.md) for the JSON contract. All executable work goes through run, never raw shell tools.",
    parameters: Type.Object({ session: Type.String({ pattern: "^[a-zA-Z0-9_-]{1,80}$" }), request: Type.Union([Type.Object({}, { additionalProperties: true }), Type.String()], { description: "Structured request object (preferred), or legacy JSON string. Actor identity is assigned by this host." }) }),
    async execute(_id, params, signal, _update, ctx) {
      const request = parseRequest(params.request);
      selected = params.session;
      pi.appendEntry("madewell-binding", { session: selected });
      const result = await invoke(ctx, selected, request, signal);
      const summary = { id: result.id, phase: result.phase, status: result.status,
        actor: result.actor, phases: result.phases, proof: result.proof, piece: result.piece,
        record: `.madewell/sessions/${selected}.json` };
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }], details: summary };
    },
  });

  // Closed allowlist: unknown extension tools cannot quietly become an alternate write/spawn door.
  pi.on("tool_call", async (event, ctx) => {
    if (ctx) render(ctx);
    if (event.toolName === "mw_session" || reads.has(event.toolName)) return;
    if (event.toolName === 'intercom') {
      const input = event.input as Record<string, unknown>;
      const observing = ['list', 'list-cwd', 'pending', 'status'].includes(String(input.action));
      const replying = input.action === 'reply' && typeof input.replyTo === 'string' && input.replyTo.trim().length > 0;
      if ((observing || replying) && !input.openProjectPaneIfMissing && !input.retryOf && !input.supersedes) return;
    }
    return { block: true, reason: "Made Well execution gate: use mw_session. Commands are locked until ideate and plan finish; verification requires a different actor." };
  });
  pi.on("before_agent_start", async () => ({ message: {
    customType: "madewell-execution", display: false,
    content: "Made Well execution is active. Use mw_session to persist your goal, proposed checklist and results. Ideate and plan must finish before executing commands. Use read/grep/find/ls for inspection. No raw write/edit/bash or other mutating tools are available. A different native session must perform verification. Never claim a session complete unless the door returns status done.",
  } }));
  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getEntries();
    const entry = [...entries].reverse().find((e: any) => e.type === "custom" && e.customType === "madewell-binding") as any;
    selected = entry?.data?.session;
    observe(ctx);
  });
  pi.on("session_shutdown", async (event, ctx) => {
    watcher?.close();
    if (deadlineTimer) clearTimeout(deadlineTimer);
    if (event.reason === "reload" || !selected) return;
    const value = state(ctx);
    if (value?.status === "active" && value.actor === ctx.sessionManager.getSessionId()) {
      try { await invoke(ctx, selected, { op: "stop", reason: `Host session ${event.reason}` }); }
      catch (error) { ctx.ui.notify(`Made Well did not pause cleanly: ${String(error)}. Inspect/recover the record.`, "warning"); }
    }
    watcher?.close();
    if (deadlineTimer) clearTimeout(deadlineTimer);
  });
  pi.registerCommand("mw", {
    description: "Inspect a durable Made Well session: /mw <id>. With no argument, list session IDs.",
    handler: async (args, ctx) => {
      const id = args.trim();
      if (!id) {
        const ids = existsSync(directory(ctx)) ? readdirSync(directory(ctx)).filter((f) => f.endsWith(".json")) : [];
        ctx.ui.notify(ids.join(", ") || "No execution sessions yet.", "info");
        return;
      }
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error("Invalid session ID");
      selected = id;
      pi.appendEntry("madewell-binding", { session: id });
      await invoke(ctx, id, { op: "show" });
    },
  });
}
