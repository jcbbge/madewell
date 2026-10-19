import { realpath } from 'node:fs/promises';
import { openStore, STEPS } from './work.mjs';
import { dataDirectory, workspaceDataDirectory } from './config.mjs';
import { submit, assertNotRelocating } from './queue.mjs';
import { observe } from './observe.mjs';

// A shell front door cannot infer the calling agent's card. Unknown is not the worker's card.
export function dispatcherProvenance(input = {}) {
  return { actor: input.actor ?? 'dispatcher', job: 'dispatcher', harness: input.harness ?? null,
    provider: input.provider ?? null, model: input.model ?? null, card: input.card ?? null,
    sessionId: input.sessionId ?? null };
}

export async function restoreWorkLink(link, cwd, { resolveBinding, dataFor = workspaceDataDirectory } = {}) {
  resolveBinding ??= async binding => {
    return (await import('./config.mjs')).resolveWorkspaceBinding(binding);
  };
  const saved = link ? await resolveBinding({ workspace: link.workspace, directory: link.directory }) : null;
  const workspace = await realpath(saved?.workspace ?? cwd), directory = dataFor(workspace);
  if (saved && saved.directory !== directory) throw new Error('Saved work link belongs to another store; explicitly select the workspace to rebind');
  return { workspace, directory, id: link?.id, relocated: Boolean(saved && (saved.workspace !== link.workspace || saved.directory !== link.directory)) };
}

export async function inspectWork(directory, id, { open = openStore } = {}) {
  await assertNotRelocating(directory);
  let store;
  try { store = await open(directory); }
  catch (error) {
    if (!/^Store is owned by live process/.test(error.message)) throw error;
    const snapshot = (await observe(directory, id))[0];
    if (!snapshot) throw new Error(`Work ${id} has no published view yet; retry inspection`);
    return { id, readOnly: true, projectedAt: snapshot.projectedAt, ...snapshot };
  }
  try {
    const w = await store.get(id);
    return { ...w, workspace: w.cwd, step: w.step ?? STEPS[w.position]?.name ?? w.completion,
      lastReport: w.report ?? w.attempts?.at(-1)?.output ?? null };
  } finally { await store.close(); }
}

// All changes, busy or idle, use the same requestId and atomic store acknowledgement.
export async function request(input, directory = dataDirectory(), { submitRequest = submit, open = openStore } = {}) {
  const common = { requestId: input.requestId };
  if (input.action === 'create') {
    if (typeof input.objective !== 'string' || !input.objective.trim()) throw new Error('Nonempty objective required');
    if (typeof input.source !== 'string' || !input.source.trim()) throw new Error('Nonempty source required');
    return submitRequest(directory, { ...common, type: 'create', objective: input.objective,
      source: input.source, cwd: await realpath(input.workspace), dispatcher: dispatcherProvenance(input.dispatcher) });
  }
  if (!Number.isSafeInteger(input.id) || input.id <= 0) throw new Error('A positive work ID is required');
  if (input.action === 'first') return submitRequest(directory, { ...common, type: 'first', id: input.id });
  if (input.action === 'answer') return submitRequest(directory, { ...common, type: 'answer', id: input.id,
    actor: 'operator', text: input.text, cause: input.cause ?? null });
  if (input.action === 'return') return submitRequest(directory, { ...common, type: 'return', id: input.id,
    action: input.response, actor: input.actor, text: input.text, questions: input.questions });
  if (input.action === 'inspect') return inspectWork(directory, input.id, { open });
  throw new Error(`Unsupported action ${input.action}`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    let text = '';
    for await (const chunk of process.stdin) text += chunk;
    console.log(JSON.stringify(await request(JSON.parse(text))));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
