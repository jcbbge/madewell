#!/usr/bin/env node
import { readFile, mkdir, writeFile, open, realpath } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, STEPS, CAUSES } from './work.mjs';
import { drive } from './drive.mjs';
import { submit, runQueue, runnerAlive, applyRequest, assertNotRelocating, relocateStore } from './queue.mjs';
import { dispatcherProvenance, inspectWork } from './pi-bridge.mjs';
import { observe, render, watchWork } from './observe.mjs';
import { dataDirectory, workspaceDataDirectory } from './config.mjs';
import { serve } from './serve.mjs';
import { renderSidecar, runSidecar, sidecarSnapshot } from './sidecar.mjs';
import { doctor, renderDoctor } from './doctor.mjs';
import { provision, provisionHost, renderProvision } from './provision.mjs';

const home = dirname(fileURLToPath(import.meta.url));
const [command, ...given] = process.argv.slice(2);
// --workspace <dir> selects that workspace's store, the same one pi uses for it (WORK_DATA still wins).
const at = given.indexOf('--workspace');
const workspace = at >= 0 ? given[at + 1] : command === 'start' ? process.cwd() : null;
const args = at >= 0 ? given.filter((_, i) => i !== at && i !== at + 1) : given;
const requestAt = args.indexOf('--request-id');
const requestId = requestAt < 0 ? randomUUID() : args[requestAt + 1];
if (requestAt >= 0) args.splice(requestAt, 2);
if (!requestId || requestId.startsWith('--')) { console.error('--request-id needs a stable ID'); process.exit(1); }
const byWorkspace = workspace !== null && process.env.WORK_DATA === undefined;
let directory;
try { directory = byWorkspace ? workspaceDataDirectory(realpathSync(workspace)) : dataDirectory(); }
catch (error) { console.error(`Workspace ${workspace}: ${error.code === 'ENOENT' ? 'no such folder' : error.message}`); process.exit(1); }
const backgroundRun = process.env.PI_DURABLE_RUN_ID;
delete process.env.PI_DURABLE_RUN_ID;
const usage = `pi-durable — Made Well work on Pi Durable. Work is durable; agents are pi.

  start --objective <text> (--source <text> | --source-file <path>) [--workspace <dir>]
                                   new work in that workspace (default: here): discovery splits it into items,
                                   which join the delivery queue and run on their own, oldest first
  first <id>                       deliver this discovery's items next (id: the discovery or any of its items)
  return <clear|question|answered|human|accepted> <id> <text.txt> --actor <actor>
                                   receive a final report through its NQ exchange (not another reviewer)
  delegate open <assignment.json>   record coordinator-delegated work; never starts an agent
  delegate <started|clear|question|answered|reported|accepted|sent-back|closed|human> <id> [text.txt] --actor <actor>
  run [--background]               the runner: discoveries as they come, then delivery items one at a time
  workspace relocate --from <old-absolute-path> --to <existing-new-path>
                                   rebind and move a stopped store; safe to retry after interruption
  create <objective.txt> <source.txt> <workspace>
  list | show <id> | report <id> | export <id>
  status [id] [--json] | watch [id] [--json]
  drive <id> [--model provider/model] [--background]
  drive-all <ids...> [--model provider/model] [--background]
  answer <id> <answer.txt> [${CAUSES.join('|')}]   human answer to whatever is held; the runner continues it
  serve [--workspace <dir> | --all] [--no-open] [--port 7788] [--host 127.0.0.1]   the run view in the browser
  sidecar [--workspace <dir>] [--once] [--width N]   terminal view for a pane: what waits on you, what is running
  demo                             one example run stepped through the sidecar: → step, ← back, Enter decides, p plays
  doctor [--json]                  what can run here: harnesses, sign-in, cards per tier, front doors
  provision [--yes]                install each installed harness's front door (--yes replaces changed files)
  provision --host                 make Made Well how every agent session on this machine works (each harness's global instructions)

  --workspace <dir> on any command uses that workspace's store (the one pi uses there).
  --request-id <id> reuses the same intake on a transport retry; never reuse it for a different request.
  start --dispatcher-file <json> records the sending actor, harness, provider, model, card and sessionId.
  Unknown dispatcher metadata stays null; it is never borrowed from the receiving worker.

Store: ${directory}
Phases: ${STEPS.map(s => `${s.name} (${s.role})`).join(' → ')}
A failed check is a question; the Arbiter rules who answers it. status shows anything that waits on you.`;

// A detached driver; its output goes to runs/<id>.log. A --workspace store is found again by the child.
async function background(childArgs, threadIds) {
  const runId = randomUUID(), runs = join(directory, 'runs');
  await mkdir(runs, { recursive: true, mode: 0o700 });
  const log = join(runs, `${runId}.log`), errors = join(runs, `${runId}.stderr`);
  const stdout = await open(log, 'a', 0o600), stderr = await open(errors, 'a', 0o600);
  let child;
  try {
    child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...childArgs], {
      detached: true, stdio: ['ignore', stdout.fd, stderr.fd], env: { ...process.env, ...(byWorkspace ? {} : { WORK_DATA: directory }), PI_DURABLE_RUN_ID: runId } });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    child.unref();
  } finally { await stdout.close(); await stderr.close(); }
  const launch = { runId, pid: child.pid, threadIds, log, errors, launchedAt: new Date().toISOString() };
  await writeFile(join(runs, `${runId}.launch.json`), JSON.stringify(launch, null, 2), { mode: 0o600 });
  return launch;
}

function startOptions() {
  const o = { objective: '', source: null, sourceFile: null, dispatcherFile: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--delivery') continue; // no longer needed: delivery follows discovery on its own
    else if (args[i] === '--objective') o.objective = args[++i] ?? '';
    else if (args[i] === '--source') o.source = args[++i] ?? '';
    else if (args[i] === '--source-file') o.sourceFile = args[++i] ?? '';
    else if (args[i] === '--dispatcher-file') o.dispatcherFile = args[++i] ?? '';
    else throw new Error(`Unknown option ${args[i]}`);
  }
  if (!o.objective.trim()) throw new Error('start needs --objective <text>');
  if ((o.source === null) === (o.sourceFile === null)) throw new Error('start needs exactly one of --source <text> or --source-file <path>');
  return o;
}

function driveOptions() {
  const ids = []; let model = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--delivery') continue;
    else if (args[i] === '--background') continue;
    else if (args[i] === '--model') model = args[++i] ?? '';
    else if (args[i].startsWith('--')) throw new Error(`Unknown option ${args[i]}`);
    else ids.push(Number(args[i]));
  }
  if (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || (command === 'drive' && ids.length !== 1)) throw new Error('Supply positive thread IDs (one for drive)');
  return { ids, model };
}

const accountsFile = () => process.env.WORK_DATA === undefined ? join(dataDirectory(), 'accounts.json') : null;
// The runner, in the background, unless one is already working this store.
async function ensureRunner() {
  if (await runnerAlive(directory)) return { running: true };
  return background(['run', ...(byWorkspace ? ['--workspace', workspace] : [])], []);
}

let store;
try {
  if (!['workspace', 'status', 'watch', 'sidecar', 'serve', 'help', '--help', 'version', '--version', 'doctor', 'provision'].includes(command)) await assertNotRelocating(directory);
  if (command === '--version' || command === 'version') console.log(JSON.parse(await readFile(join(home, 'package.json'), 'utf8')).version);
  else if (!command || ['help', '--help'].includes(command)) console.log(usage);
  else if (command === 'serve') {
    const opt = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
    const port = Number(opt('--port') ?? 7788), host = opt('--host') ?? '127.0.0.1';
    // Scoped to one workspace: --workspace, else everything with --all, else the folder you are in.
    const scope = workspace ? await realpath(workspace) : args.includes('--all') ? null : await realpath(process.cwd());
    const url = `http://${host}:${port}/${scope ? `?workspace=${encodeURIComponent(scope)}` : ''}`;
    const show = () => {
      console.log(url);
      if (args.includes('--no-open') || !process.stdout.isTTY) return;
      const [cmd, ...rest] = process.platform === 'darwin' ? ['open', url] : process.platform === 'win32' ? ['cmd', '/c', 'start', '""', url] : ['xdg-open', url];
      try { spawn(cmd, rest, { detached: true, stdio: 'ignore' }).on('error', () => {}).unref(); } catch {}
    };
    try { await serve({ port, host }); show(); await new Promise(() => {}); }
    catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      const running = await fetch(`http://${host}:${port}/api/state`, { signal: AbortSignal.timeout(3000) }).then(r => r.json()).catch(() => null);
      if (!Array.isArray(running?.stores)) throw new Error(`Port ${port} is in use by something that is not the dashboard; try --port.`);
      console.log(`Using the dashboard already running on :${port}`);
      show();
    }
  }
  else if (command === 'sidecar') {
    const i = args.indexOf('--width'), width = i < 0 ? undefined : Number(args[i + 1]);
    if (width !== undefined && !(width > 0)) throw new Error('--width needs a positive number of columns');
    const scope = workspace ? await realpath(workspace) : null;
    if (args.includes('--once')) console.log(renderSidecar(await sidecarSnapshot({ workspace: scope }), { width: width ?? process.stdout.columns ?? 80, color: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR }));
    else await runSidecar({ width, workspace: scope });
  }
  else if (command === 'demo') await (await import('./demo.mjs')).runDemo();
  else if (command === 'workspace') {
    if (args.length !== 5 || args[0] !== 'relocate' || args[1] !== '--from' || args[3] !== '--to') throw new Error('workspace relocate needs --from <old-absolute-path> --to <existing-new-path>');
    console.log(JSON.stringify(await relocateStore(args[2], args[4]), null, 2));
  }
  else if (command === 'delegate') {
    const [verb, target, ...rest] = args;
    if (verb === 'open') {
      const input = JSON.parse(await readFile(target, 'utf8'));
      if (input.briefFile) input.brief = await readFile(input.briefFile, 'utf8');
      store = await openStore(directory);
      console.log(JSON.stringify({ id: await store.openDelegated(input), store: directory }));
    } else {
      const verbs = ['started', 'clear', 'question', 'answered', 'reported', 'accepted', 'sent-back', 'closed', 'human'];
      if (!verbs.includes(verb) || !Number.isSafeInteger(Number(target)) || Number(target) < 1) throw new Error('Supply a delegated action and positive work ID');
      const actorAt = rest.indexOf('--actor');
      if (actorAt < 0 || !rest[actorAt + 1]) throw new Error('--actor <actor> is required');
      const files = rest.filter((_, i) => i !== actorAt && i !== actorAt + 1);
      if (files.length !== (verb === 'closed' ? 0 : 1)) throw new Error('Supply one text file (none for closed)');
      const input = { actor: rest[actorAt + 1], ...(files[0] ? { text: await readFile(files[0], 'utf8'), evidence: files[0] } : {}) };
      store = await openStore(directory);
      console.log(JSON.stringify(await store.delegated(Number(target), verb, input)));
    }
  }
  else if (command === 'return') {
    const [action, target, file, flag, actor] = args;
    if (!['clear', 'question', 'answered', 'human', 'accepted'].includes(action) || !Number.isSafeInteger(Number(target)) || Number(target) < 1 || !file || flag !== '--actor' || !actor || args.length !== 5) throw new Error('return needs an action, positive ID, text file and --actor');
    const result = await submit(directory, { type: 'return', id: Number(target), action, actor, text: await readFile(file, 'utf8'), requestId }, { accountsFile: accountsFile() });
    console.log(JSON.stringify({ ...result, runner: await ensureRunner() }, null, 2));
  }
  else if (command === 'show' || command === 'report') {
    const id = Number(args[0]);
    if (!Number.isSafeInteger(id) || id <= 0 || args.length !== 1) throw new Error('Supply one positive work ID');
    const w = await inspectWork(directory, id);
    if (command === 'show') console.log(JSON.stringify(w, null, 2));
    else console.log(typeof w.lastReport === 'string' ? w.lastReport : JSON.stringify(w.lastReport ?? w.record?.report ?? { readOnly: true, evidence: w.evidence, note: 'No full report in the published snapshot; inspect its evidence.' }, null, 2));
  }
  else if (command === 'status') {
    const id = args.find(a => a !== '--json'), works = await observe(directory, id ? Number(id) : null);
    console.log(args.includes('--json') ? JSON.stringify(works, null, 2) : render(works));
  }
  else if (command === 'watch') {
    const id = args.find(a => a !== '--json'), controller = new AbortController();
    process.once('SIGINT', () => controller.abort());
    await watchWork(directory, id ? Number(id) : null, { jsonOutput: args.includes('--json'), signal: controller.signal });
  }
  else if (command === 'doctor') {
    const report = await doctor();
    console.log(args.includes('--json') ? JSON.stringify(report, null, 2) : renderDoctor(report));
    if (!report.ok) process.exitCode = 1;
  }
  else if (command === 'provision') console.log(renderProvision(args.includes('--host') ? await provisionHost() : await provision({ yes: args.includes('--yes') })));
  else if (command === 'start') {
    const o = startOptions(), cwd = await realpath(workspace);
    const source = o.source ?? await readFile(o.sourceFile, 'utf8');
    if (!source.trim()) throw new Error('The source is empty');
    const dispatcher = dispatcherProvenance(o.dispatcherFile ? JSON.parse(await readFile(o.dispatcherFile, 'utf8')) : undefined);
    const result = await submit(directory, { type: 'create', objective: o.objective, source, cwd, dispatcher, requestId }, { accountsFile: accountsFile() });
    const where = byWorkspace ? ` --workspace ${JSON.stringify(cwd)}` : '', id = result.id;
    console.log(JSON.stringify({ ...result, workspace: cwd, store: directory, runner: await ensureRunner(),
      ...(id ? { status: `pi-durable status ${id}${where}`, watch: `pi-durable watch ${id}${where}`, inspect: `pi-durable show ${id}${where}` } : { note: 'The runner is busy; it takes this request between steps.' }) }, null, 2));
  }
  else if (command === 'first' || command === 'answer') {
    const id = Number(args[0]);
    if (!Number.isSafeInteger(id) || id <= 0 || (command === 'answer' && !args[1])) throw new Error(usage);
    const request = command === 'first' ? { type: 'first', id } : { type: 'answer', id, text: await readFile(args[1], 'utf8'), cause: args[2] ?? null };
    console.log(JSON.stringify({ ...await submit(directory, { ...request, requestId }, { accountsFile: accountsFile() }), runner: await ensureRunner() }, null, 2));
  }
  else if (command === 'run') {
    if (args.includes('--background')) console.log(JSON.stringify(await ensureRunner(), null, 2));
    else console.log(JSON.stringify(await runQueue(directory, { accountsFile: accountsFile() }), null, 2));
  }
  else if (['drive', 'drive-all'].includes(command) && args.includes('--background')) {
    const options = driveOptions();
    const childArgs = [command, ...args.filter(a => a !== '--background'), ...(byWorkspace ? ['--workspace', workspace] : [])];
    console.log(JSON.stringify(await background(childArgs, options.ids), null, 2));
  }
  else {
    const need = { create: 3, list: 0, show: 1, report: 1, export: 1, drive: 1, 'drive-all': 1 };
    if (!(command in need) || args.length < need[command]) throw new Error(usage);
    // Usage limits belong to provider accounts, so every workspace's store shares one accounts file
    // (an explicit WORK_DATA store keeps its own).
    store = await openStore(directory, { resume: ['drive', 'drive-all'].includes(command),
      accountsFile: accountsFile() });
    const id = Number(args[0]);
    switch (command) {
      case 'create': {
        const result = await applyRequest(store, { type: 'create', objective: await readFile(args[0], 'utf8'), source: await readFile(args[1], 'utf8'), cwd: await realpath(args[2]), kind: 'delivery', dispatcher: dispatcherProvenance(), requestId });
        console.log(result.id); break;
      }
      case 'list': console.log(JSON.stringify(await store.list())); break;
      case 'export': {
        const path = join(directory, 'exports', `thread-${id}.json`);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, JSON.stringify(await store.get(id), null, 2)); console.log(path); break;
      }
      case 'drive': case 'drive-all': {
        const { ids, model } = driveOptions();
        const results = await Promise.all(ids.map(async threadId => {
          try { return await drive(store, threadId, { model, log: text => console.log(`[${threadId}] ${text}`) }); }
          catch (error) { console.error(`[${threadId}] ${error.stack ?? error.message}`); return { threadId, status: 'error', reason: error.message }; }
        }));
        console.log(JSON.stringify(results, null, 2));
        process.exitCode = results.some(r => r.status === 'error') ? 1 : results.every(r => ['complete', 'discovered'].includes(r.status)) ? 0 : 2;
        break;
      }
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (store) await store.close();
  if (backgroundRun && /^[a-f0-9-]{36}$/.test(backgroundRun)) {
    await writeFile(join(directory, 'runs', `${backgroundRun}.exit.json`), JSON.stringify({ runId: backgroundRun, pid: process.pid, exitCode: process.exitCode ?? 0, endedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
  }
}
