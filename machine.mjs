import { execFile } from 'node:child_process';
import { readFile, statfs } from 'node:fs/promises';
import { cpus, hostname, loadavg, uptime } from 'node:os';
import { promisify } from 'node:util';

// The machine the work runs on: CPU, memory, swap, disk, load and the busiest processes, read from /proc
// and the filesystem, with a short history kept in memory for the board's graphs. Read-only.

const run = promisify(execFile);
const HISTORY = 90;
let previous = null;
const history = [];

async function cpuTimes() {
  const line = (await readFile('/proc/stat', 'utf8').catch(() => '')).split('\n')[0];
  const f = line.trim().split(/\s+/).slice(1).map(Number);
  return f.length >= 4 ? { idle: f[3] + (f[4] || 0), total: f.reduce((a, b) => a + b, 0) } : null;
}

async function memory() {
  const kb = {};
  for (const line of (await readFile('/proc/meminfo', 'utf8').catch(() => '')).split('\n')) {
    const m = /^(\w+):\s+(\d+)/.exec(line); if (m) kb[m[1]] = Number(m[2]) * 1024;
  }
  return { mem: kb.MemTotal ? { used: kb.MemTotal - (kb.MemAvailable ?? kb.MemFree ?? 0), total: kb.MemTotal } : null,
    swap: kb.SwapTotal ? { used: kb.SwapTotal - (kb.SwapFree ?? 0), total: kb.SwapTotal } : null };
}

async function busiest() {
  const out = await run('ps', ['-eo', 'pcpu,rss,comm', '--sort=-pcpu', '--no-headers'], { timeout: 2000 }).then(r => r.stdout).catch(() => '');
  return out.split('\n').map(l => l.trim().split(/\s+/)).filter(p => p.length >= 3)
    .map(([cpu, rss, ...name]) => ({ name: name.join(' '), cpu: Number(cpu), mem: Number(rss) * 1024 })).slice(0, 3);
}

// One sample. CPU busy is the share of time not idle since the last sample; the first call measures a short interval.
export async function machineSample() {
  let now = await cpuTimes();
  if (!previous && now) { previous = now; await new Promise(r => setTimeout(r, 250)); now = await cpuTimes(); }
  const cpu = now && previous && now.total > previous.total ? 100 * (1 - (now.idle - previous.idle) / (now.total - previous.total)) : null;
  if (now) previous = now;
  const { mem, swap } = await memory();
  const fs = await statfs('/').catch(() => null);
  const disk = fs ? { used: (fs.blocks - fs.bfree) * fs.bsize, total: (fs.blocks - fs.bfree + fs.bavail) * fs.bsize } : null;
  const sample = { at: Date.now(), host: hostname().split('.')[0], cores: cpus().length, load: loadavg(), uptime: uptime(), cpu, mem, swap, disk, top: await busiest() };
  history.push({ at: sample.at, cpu, mem: mem ? 100 * mem.used / mem.total : null });
  if (history.length > HISTORY) history.shift();
  return { ...sample, history: [...history] };
}
