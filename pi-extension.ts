import { Type } from '@earendil-works/pi-ai';
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { mkdir, realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspaceDataDirectory } from './config.mjs';
import { observe } from './observe.mjs';
import { serve } from './serve.mjs';

const home = dirname(fileURLToPath(import.meta.url));
const CAUSES = ['pre-existing', 'implementation', 'test'];
const PORT = Number(process.env.PI_DURABLE_PORT ?? 7788);
const hint = 'durable_work is available: for multi-phase work that must survive crashes and run through separate agents (discover → ideate → challenge → plan → test-plan → implement → verify), start it with durable_work. Everything else, work normally.';

function invoke(file: string, args: string[], input: unknown, directory: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(home, file), ...args], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, WORK_DATA: directory } });
    let out = '', err = '';
    child.stdout.on('data', c => { out += c; });
    child.stderr.on('data', c => { err += c; });
    child.on('error', reject);
    child.stdin.on('error', () => {});
    child.on('close', code => {
      if (code !== 0) return reject(new Error(err.trim() || out.trim() || `pi-durable exited ${code}`));
      try { resolve(JSON.parse(out)); } catch { reject(new Error(`Invalid pi-durable response: ${out.slice(0, 500)}`)); }
    });
    child.stdin.end(input === undefined ? undefined : JSON.stringify(input));
  });
}
// A hold names who handed the work over, who asked and why, and what alert the person got; it goes to them as it is.
const compact = (w: any) => ({ id: w.threadId, state: w.state, done: w.done, step: w.current?.name, role: w.current?.role, round: w.round,
  progress: w.progress, next: w.next, owner: w.owner, questions: w.questions, failure: w.failure, lastRuling: w.lastRuling, waitsOn: w.waitsOn, driverAlive: w.driverAlive,
  hold: w.hold ? { cause: w.hold.cause, reason: w.hold.reason, originator: w.hold.originator, receiver: w.hold.receiver, questions: w.hold.questions } : null, alert: w.alert ?? null });

export default function durable(pi: ExtensionAPI) {
  // Step workers are plain pi with this package installed too; the work tool is not theirs.
  if (process.env.PI_DURABLE_WORKER) return;
  let selected: number | undefined, directory = '', workspace = '', views: any[] = [], error = '';
  let watcher: ReturnType<typeof watch> | undefined, timer: ReturnType<typeof setTimeout> | undefined, context: ExtensionContext | undefined, notified = '';
  const stop = () => { watcher?.close(); watcher = undefined; clearTimeout(timer); };
  // The dashboard lives as long as this pi session. Port already taken = another session serves it.
  let server: any, guard: ReturnType<typeof setInterval> | undefined;
  const dashboard = async () => { if (server) return; try { server = await serve({ port: PORT, log: () => {} }); server.unref(); } catch {} };
  const attach = (id: number) => { selected = id; pi.appendEntry('pi-durable-link', { id, directory, workspace }); };
  const paint = () => {
    try {
      if (!context?.hasUI) return;
      const w = views.find(v => v.threadId === selected);
      context.ui.setStatus('pi-durable', error ? 'durable ✗ unavailable' : (w
        ? `durable #${w.threadId} · ${w.done ? 'done' : `${w.current?.name ?? ''} · ${w.state}`} · ${w.progress.accepted}/${w.progress.total}`
        : `durable ✓${views.length ? ` · ${views.filter(v => !v.done).length} open` : ''}`) + ` · localhost:${PORT}`);
    } catch (e: any) { if (/stale/.test(e.message)) stop(); }
  };
  async function refresh(notify = false) {
    try {
      views = (await observe(directory)).filter((w: any) => w.workspace === workspace || w.threadId === selected);
      if (!selected) { const open = views.filter(w => !w.done); if (open.length === 1) attach(open[0].threadId); }
      error = '';
      const w = views.find(v => v.threadId === selected);
      const key = w ? `${w.threadId}:${w.state}:${w.current?.name}:${w.round}` : '';
      if (notify && w && key !== notified && (w.done || ['human-hold', 'worker-failed', 'stopped'].includes(w.state))) {
        pi.sendMessage({ customType: 'pi-durable-update', content: `Pi Durable: ${JSON.stringify(compact(w))}`, display: true }, { triggerTurn: false });
      }
      notified = key;
    } catch (e: any) { error = e.message; }
    paint();
  }
  async function mount(target: string) {
    stop(); workspace = target; directory = workspaceDataDirectory(target); selected = undefined; views = []; error = '';
    const folder = join(directory, 'observability');
    await mkdir(folder, { recursive: true, mode: 0o700 });
    watcher = watch(folder, () => { clearTimeout(timer); timer = setTimeout(() => { void refresh(true); }, 100); });
    watcher.on('error', e => { error = e.message; paint(); });
    watcher.unref();
  }
  pi.on('session_start', async (_event, ctx) => {
    context = ctx;
    await dashboard();
    guard ??= setInterval(() => { void dashboard(); }, 10_000); guard.unref();
    try {
      const link: any = ctx.sessionManager.getBranch().findLast((e: any) => e.type === 'custom' && e.customType === 'pi-durable-link');
      await mount(await realpath(link?.data?.workspace ?? ctx.cwd));
      if (link?.data?.directory === directory && Number.isSafeInteger(link.data.id)) selected = link.data.id;
      await refresh();
    } catch (e: any) { error = e.message; paint(); }
  });
  pi.on('session_shutdown', () => { stop(); clearInterval(guard); guard = undefined; server?.close(); server = undefined; });
  pi.on('before_agent_start', async (_event, ctx) => {
    context = ctx; await refresh();
    const open = views.filter(w => !w.done);
    if (!open.length) return; // nothing durable here: add nothing to the context
    return { message: { customType: 'pi-durable-context', display: false, content: `${hint}\nOpen durable work here: ${JSON.stringify(open.map(compact))}` } };
  });
  pi.registerCommand('work', {
    description: 'Show durable work in this workspace',
    handler: async (_args, ctx) => {
      context = ctx; await refresh();
      pi.sendMessage({ customType: 'pi-durable-status', display: true,
        content: error || (views.length ? JSON.stringify(views.map(compact), null, 2) : 'No durable work in this workspace yet. Describe the work and ask for it to be run durably.') }, { triggerTurn: false });
    },
  });
  pi.registerTool({
    name: 'durable_work', label: 'Durable work',
    description: 'Run work through Made Well on Pi Durable: separate pi agents per phase (discover, ideate, challenge, plan, test-plan, implement, verify), state committed to SQLite, crash-proof. start: new work from the objective (delivery:true only when the user authorized building, not just discovery). resume: drive existing work again (also continues after a crash). status: current state. inspect: objective, step, holds, failures. answer: the human answer to a held question; for a failed test give cause = pre-existing | implementation | test. Starting launches a background driver; that is not completion.',
    parameters: Type.Object({
      action: Type.Union(['start', 'resume', 'status', 'inspect', 'answer'].map(x => Type.Literal(x))),
      id: Type.Optional(Type.Integer({ minimum: 1 })),
      objective: Type.Optional(Type.String()),
      workspace: Type.Optional(Type.String()),
      context: Type.Optional(Type.String({ description: 'Facts, paths, scope, constraints and done-when for the work.' })),
      delivery: Type.Optional(Type.Boolean({ description: 'True only when the user authorized implementation.' })),
      text: Type.Optional(Type.String({ description: 'answer: the user\'s answer, in their words.' })),
      cause: Type.Optional(Type.Union(CAUSES.map(x => Type.Literal(x)))),
    }),
    async execute(callId, params, _signal, _onUpdate, ctx) {
      context = ctx;
      if (!directory) throw new Error(error || 'Pi Durable is not initialized for this session');
      if (params.workspace) { const target = await realpath(params.workspace); if (target !== workspace) { await mount(target); await refresh(); } }
      let id = params.id ?? selected, result: any;
      // Each job's card comes from prescriptions.json, never from this chat's model.
      if (params.action === 'start') {
        if (!params.objective?.trim()) throw new Error('An objective is required');
        const turns = ctx.sessionManager.getBranch().filter((e: any) => e.type === 'message' && e.message?.role === 'user')
          .map((e: any) => typeof e.message.content === 'string' ? e.message.content : e.message.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n'));
        const intake = await invoke('pi-bridge.mjs', [], { action: 'create', workspace, objective: params.objective,
          source: `User conversation (verbatim):\n${turns.map((t: string, i: number) => `[User turn ${i + 1}]\n${t}`).join('\n\n')}\n\nContext:\n${params.context ?? '(none)'}\n\nDelivery authorized: ${params.delivery === true}`,
          requestId: `${ctx.sessionManager.getSessionId()}:${callId}`, delivery: params.delivery === true }, directory);
        id = intake.id; attach(id!);
      }
      if (params.action === 'start' || params.action === 'resume') {
        if (!id) throw new Error('No work selected; start one or pass id');
        attach(id);
        result = await invoke('cli.mjs', ['drive', String(id), '--background', ...(params.delivery ? ['--delivery'] : [])], undefined, directory);
        result = { id, launched: result, note: 'Driver running in the background. The footer shows progress; status reports it.' };
      } else if (params.action === 'status') {
        await refresh();
        result = views.filter(w => !params.id || w.threadId === params.id).sort((a, b) => Number(Boolean(b.hold)) - Number(Boolean(a.hold))).map(compact);
      } else {
        if (!id) throw new Error('No work selected');
        if (params.action === 'answer' && !params.text?.trim()) throw new Error('answer needs the user\'s text');
        result = await invoke('pi-bridge.mjs', [], { action: params.action, id, text: params.text, cause: params.cause }, directory);
        attach(id);
        // An answered hold continues on its own; no second instruction needed.
        if (params.action === 'answer') result = { answered: result, driver: await invoke('cli.mjs', ['drive', String(id), '--background'], undefined, directory) };
      }
      await refresh();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], details: { id, action: params.action, directory } };
    },
  });
}
