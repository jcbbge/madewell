#!/usr/bin/env node
import { readFile, mkdir, writeFile, open, realpath } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, STEPS, CAUSES } from './work.mjs';
import { drive } from './drive.mjs';
import { submit, runQueue, runnerAlive } from './queue.mjs';
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
  run [--background]               the runner: discoveries as they come, then delivery items one at a time
  create <objective.txt> <source.txt> <workspace>
  list | show <id> | report <id> | export <id>
  status [id] [--json] | watch [id] [--json]
  drive <id> [--model provider/model] [--background]
  drive-all <ids...> [--model provider/model] [--background]
  answer <id> <answer.txt> [${CAUSES.join('|')}]   human answer to whatever is held; the runner continues it
  serve [--port 7788] [--host 127.0.0.1]   live dashboard: states, transitions, agents, latency
  sidecar [--once] [--width N]   terminal view for a pane: what waits on you, what is running
  demo                             one example run stepped through the sidecar: → step, ← back, Enter decides, p plays
  doctor [--json]                  what can run here: harnesses, sign-in, cards per tier, front doors
  provision [--yes]                install each installed harness's front door (--yes replaces changed files)
  provision --host                 make Made Well how every agent session on this machine works (each harness's global instructions)

  --workspace <dir> on any command uses that workspace's store (the one pi uses there).

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
  const o = { objective: '', source: null, sourceFile: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--delivery') continue; // no longer needed: delivery follows discovery on its own
    else if (args[i] === '--objective') o.objective = args[++i] ?? '';
    else if (args[i] === '--source') o.source = args[++i] ?? '';
    else if (args[i] === '--source-file') o.sourceFile = args[++i] ?? '';
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
  if (command === '--version' || command === 'version') console.log(JSON.parse(await readFile(join(home, 'package.json'), 'utf8')).version);
  else if (!command || ['help', '--help'].includes(command)) console.log(usage);
  else if (command === 'serve') {
    const opt = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
    await serve({ port: Number(opt('--port') ?? 7788), host: opt('--host') ?? '127.0.0.1' });
    await new Promise(() => {});
  }
  else if (command === 'sidecar') {
    const i = args.indexOf('--width'), width = i < 0 ? undefined : Number(args[i + 1]);
    if (width !== undefined && !(width > 0)) throw new Error('--width needs a positive number of columns');
    if (args.includes('--once')) console.log(renderSidecar(await sidecarSnapshot(), { width: width ?? process.stdout.columns ?? 80, color: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR }));
    else await runSidecar({ width });
  }
  else if (command === 'demo') await (await import('./demo.mjs')).runDemo();
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
    const result = await submit(directory, { type: 'create', objective: o.objective, source, cwd }, { accountsFile: accountsFile() });
    const where = byWorkspace ? ` --workspace ${JSON.stringify(cwd)}` : '', id = result.id;
    console.log(JSON.stringify({ ...result, workspace: cwd, store: directory, runner: await ensureRunner(),
      ...(id ? { status: `pi-durable status ${id}${where}`, watch: `pi-durable watch ${id}${where}`, inspect: `pi-durable show ${id}${where}` } : { note: 'The runner is busy; it takes this request between steps.' }) }, null, 2));
  }
  else if (command === 'first' || command === 'answer') {
    const id = Number(args[0]);
    if (!Number.isSafeInteger(id) || id <= 0 || (command === 'answer' && !args[1])) throw new Error(usage);
    const request = command === 'first' ? { type: 'first', id } : { type: 'answer', id, text: await readFile(args[1], 'utf8'), cause: args[2] ?? null };
    console.log(JSON.stringify({ ...await submit(directory, request, { accountsFile: accountsFile() }), runner: await ensureRunner() }, null, 2));
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
      case 'create': console.log(await store.create(await readFile(args[0], 'utf8'), await readFile(args[1], 'utf8'), args[2])); break;
      case 'list': console.log(JSON.stringify(await store.list())); break;
      case 'show': {
        const w = await store.get(id);
        console.log(JSON.stringify({ id: w.id, objective: w.objective, step: STEPS[w.position]?.name ?? w.completion, round: w.round, hold: w.hold, waitsOn: w.waitsOn,
          attempts: w.attempts.map(a => ({ id: a.id, step: a.step, role: a.role, round: a.round, status: a.status, launches: a.launches, error: a.error || undefined })),
          failures: w.failures, exchanges: w.exchanges, events: w.events }, null, 2));
        break;
      }
      case 'report': { const a = (await store.get(id)).attempts.at(-1); console.log(a?.output ?? 'No output yet'); break; }
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
