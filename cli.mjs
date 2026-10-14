#!/usr/bin/env node
import { readFile, mkdir, writeFile, open } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, STEPS, CAUSES } from './work.mjs';
import { drive } from './drive.mjs';
import { observe, render, watchWork } from './observe.mjs';
import { dataDirectory } from './config.mjs';
import { serve } from './serve.mjs';

const home = dirname(fileURLToPath(import.meta.url));
const directory = dataDirectory();
const [command, ...args] = process.argv.slice(2);
const backgroundRun = process.env.PI_DURABLE_RUN_ID;
delete process.env.PI_DURABLE_RUN_ID;
const usage = `pi-durable — Made Well work on Pi Durable. Work is durable; agents are pi.

  create <objective.txt> <source.txt> <workspace>
  list | show <id> | report <id> | export <id>
  status [id] [--json] | watch [id] [--json]
  drive <id> [--delivery] [--model provider/model] [--background]
  drive-all <ids...> [--delivery] [--model provider/model] [--background]
  answer <id> <answer.txt> [${CAUSES.join('|')}]   human answer to whatever is held
  serve [--port 7788] [--host 127.0.0.1]   live dashboard: states, transitions, agents, latency

Store: ${directory}
Phases: ${STEPS.map(s => `${s.name} (${s.role})`).join(' → ')}
A failed test is a question; the Arbiter rules who answers it; undetermined comes to you.`;

function driveOptions() {
  const ids = []; let delivery = false, model = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--delivery') delivery = true;
    else if (args[i] === '--background') continue;
    else if (args[i] === '--model') model = args[++i] ?? '';
    else if (args[i].startsWith('--')) throw new Error(`Unknown option ${args[i]}`);
    else ids.push(Number(args[i]));
  }
  if (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || (command === 'drive' && ids.length !== 1)) throw new Error('Supply positive thread IDs (one for drive)');
  return { ids, delivery, model };
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
  else if (command === 'status') {
    const id = args.find(a => a !== '--json'), works = await observe(directory, id ? Number(id) : null);
    console.log(args.includes('--json') ? JSON.stringify(works, null, 2) : render(works));
  }
  else if (command === 'watch') {
    const id = args.find(a => a !== '--json'), controller = new AbortController();
    process.once('SIGINT', () => controller.abort());
    await watchWork(directory, id ? Number(id) : null, { jsonOutput: args.includes('--json'), signal: controller.signal });
  }
  else if (['drive', 'drive-all'].includes(command) && args.includes('--background')) {
    const options = driveOptions(), runId = randomUUID(), runs = join(directory, 'runs');
    await mkdir(runs, { recursive: true, mode: 0o700 });
    const log = join(runs, `${runId}.log`), errors = join(runs, `${runId}.stderr`);
    const stdout = await open(log, 'a', 0o600), stderr = await open(errors, 'a', 0o600);
    let child;
    try {
      child = spawn(process.execPath, [fileURLToPath(import.meta.url), command, ...args.filter(a => a !== '--background')], {
        detached: true, stdio: ['ignore', stdout.fd, stderr.fd], env: { ...process.env, WORK_DATA: directory, PI_DURABLE_RUN_ID: runId } });
      await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
      child.unref();
    } finally { await stdout.close(); await stderr.close(); }
    const launch = { runId, pid: child.pid, threadIds: options.ids, log, errors, launchedAt: new Date().toISOString() };
    await writeFile(join(runs, `${runId}.launch.json`), JSON.stringify(launch, null, 2), { mode: 0o600 });
    console.log(JSON.stringify(launch, null, 2));
  }
  else {
    const need = { create: 3, list: 0, show: 1, report: 1, export: 1, drive: 1, 'drive-all': 1, answer: 2 };
    if (!(command in need) || args.length < need[command]) throw new Error(usage);
    store = await openStore(directory, { resume: ['drive', 'drive-all'].includes(command) });
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
      case 'answer': console.log(JSON.stringify(await store.human(id, { text: await readFile(args[1], 'utf8'), cause: args[2] ?? null }))); break;
      case 'drive': case 'drive-all': {
        const { ids, delivery, model } = driveOptions();
        const results = await Promise.all(ids.map(async threadId => {
          try { return await drive(store, threadId, { delivery, model, log: text => console.log(`[${threadId}] ${text}`) }); }
          catch (error) { console.error(`[${threadId}] ${error.stack ?? error.message}`); return { threadId, status: 'error', reason: error.message }; }
        }));
        console.log(JSON.stringify(results, null, 2));
        process.exitCode = results.some(r => r.status === 'error') ? 1 : results.every(r => ['complete', 'delivery-authorization-required'].includes(r.status)) ? 0 : 2;
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
