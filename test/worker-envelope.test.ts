import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect } from 'effect'
import { quote } from '../src/errors.ts'
import { openStore } from '../src/store.ts'
import { commandWorker, Worker } from '../src/worker.ts'

const cli = join(import.meta.dirname, '../src/cli.ts')
const card = { harness: 'claude', provider: 'fixture', account: 'fixture', model: 'fixture', effort: 'low' as const }
const run = (value: unknown) => Effect.runPromise(Effect.gen(function* () {
	return yield* (yield* Worker).run({ kind: 'execute', item: 1, job: 'ideate', profile: 'ideator', card, access: 'none', system: '', prompt: '{}', cwd: import.meta.dirname, budget: { minutes: 1 } })
}).pipe(Effect.provide(commandWorker(`cat >/dev/null; printf %s ${quote(JSON.stringify(value))}`))))

test('command workers validate every result branch and keep malformed JSON envelopes as ordinary failures', async () => {
	const malformed = [null, true, 1, 'fixture', [], {}, { ok: true }, { ok: true, output: 1 }, { ok: false }, { ok: false, error: 1 },
		{ ok: false, limit: null }, { ok: false, limit: {} }, { ok: false, limit: { account: 'fixture', resetsAt: 'later', message: 'quota' } },
		{ ok: true, output: 'fixture', raw: {} }, { ok: true, output: 'fixture', version: 1 }, { ok: false, error: 'fixture', overBudget: {} }]
	for (const value of malformed) {
		const result = await run(value)
		assert.equal(result.ok, false, JSON.stringify(value))
		assert.ok('error' in result)
		assert.match(result.error, /invalid WorkerResult/)
		assert.equal(result.raw, JSON.stringify(value), 'keep the actual adapter output as evidence')
	}
	for (const value of [
		{ ok: true, output: '' }, { ok: true, output: 'fixture', raw: 'transcript', version: 'fixture-v1' },
		{ ok: false, error: 'A bounded failure.' }, { ok: false, limit: { account: 'fixture', resetsAt: null, message: 'quota' } },
		{ ok: false, limit: { account: 'fixture', resetsAt: 1234, message: 'quota' }, raw: 'transcript' },
		{ ok: false, error: 'budget', overBudget: { exceeded: 'tokens', budget: { minutes: 1, tokens: 10 }, ms: 4, tokens: 11 } },
	]) assert.deepEqual(await run(value), value)
})

test('malformed command results finish their CLI invocations and leave an actionable held item', { timeout: 45_000 }, () => {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-envelope-')))
	try {
		for (const [index, value] of [null, true, {}, { ok: true }].entries()) {
			const repo = join(root, `repo-${index}`), home = join(root, `home-${index}`), path = join(home, 'work.db')
			mkdirSync(repo)
			const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('MW_')))
			Object.assign(env, { MW_HOME: home, MW_STORE: path, MW_AUTORUN: '0', MW_DEBUG: '0', MW_WORKER_COMMAND: `cat >/dev/null; printf %s ${quote(JSON.stringify(value))}` })
			const mw = (...args: string[]) => {
				const result = spawnSync(process.execPath, [cli, ...args], { cwd: repo, env, encoding: 'utf8', timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 2 << 20 })
				assert.equal(result.error, undefined, `CLI ${args.join(' ')} failed to return: ${result.error}`)
				assert.equal(result.signal, null, result.stderr)
				assert.equal(result.status, 0, result.stderr)
				return JSON.parse(result.stdout)
			}
			mw('settings')
			const id = mw('start', '--objective', 'Check the command boundary', '--source', 'Isolated malformed-envelope fixture.').item.id
			mw('run')
			const store = openStore(path)
			try {
				const item = store.get(id)!
				assert.equal(item.status, 'held')
				assert.equal(item.hold?.code, 'worker_failing')
				assert.match(String(item.hold?.context.lastError), /invalid WorkerResult/)
				const events = store.events(id)
				const started = events.filter(e => e.kind === 'trace-started')
				const finished = events.filter(e => e.kind === 'trace-finished')
				assert.ok(started.length > 0)
				assert.deepEqual(finished.map(e => e.data.invocation).sort(), started.map(e => e.data.invocation).sort(), 'no invocation is stranded')
				assert.ok(store.calls(id).every(call => call.outcome === 'error' && /invalid WorkerResult/.test(call.error ?? '')))
				assert.equal(store.runner(), null)
			} finally { store.close() }
		}
	} finally { rmSync(root, { recursive: true, force: true }) }
})
