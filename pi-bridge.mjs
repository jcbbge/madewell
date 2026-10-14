import { realpath } from 'node:fs/promises';
import { openStore, STEPS } from './work.mjs';
import { dataDirectory } from './config.mjs';

// Short-lived calls from the pi extension. SQLite is the only work authority.
export async function request(input, directory = dataDirectory()) {
  const store = await openStore(directory);
  try {
    if (input.action === 'create') {
      if (typeof input.source !== 'string' || !input.source.trim()) throw new Error('Nonempty source required');
      const cwd = await realpath(input.workspace), marker = `pi-intake:${input.requestId}`;
      for (const id of await store.list()) {
        const w = await store.get(id);
        if (w.source.endsWith(`\n\n${marker}`)) return { id, reused: true }; // a retried tool call is the same work
      }
      return { id: await store.create(input.objective, `${input.source}\n\n${marker}`, cwd, { delivery: input.delivery === true }) };
    }
    const w = await store.get(input.id);
    if (input.action === 'inspect') return {
      id: w.id, objective: w.objective, workspace: w.cwd, step: STEPS[w.position]?.name ?? w.completion, round: w.round,
      hold: w.hold, waitsOn: w.waitsOn, failures: w.failures.filter(f => f.status !== 'answered'), lastReport: w.attempts.at(-1)?.output ?? null,
    };
    if (input.action === 'answer') return store.human(input.id, { actor: 'operator', text: input.text, cause: input.cause ?? null });
    throw new Error(`Unsupported action ${input.action}`);
  } finally { await store.close(); }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    let text = '';
    for await (const chunk of process.stdin) text += chunk;
    console.log(JSON.stringify(await request(JSON.parse(text))));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
