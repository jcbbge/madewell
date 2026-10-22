import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, test } from 'node:test'
import { Effect, Layer } from 'effect'
import type { Card, Prescriptions } from '../src/cards.ts'
import type { MadeWellError } from '../src/errors.ts'
import { evaluate, JOBS } from '../src/eval.ts'
import { openStore, Store } from '../src/store.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'

const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-eval-')))
after(() => rmSync(root, { recursive: true, force: true }))

const card = (model: string): Card => ({ harness: 'claude', provider: 'anthropic', account: model, model, effort: 'low' })
const prescriptions: Prescriptions = {
	tiers: { all: [card('big')], candidates: [card('cheap'), card('flaggy'), card('mid'), card('big'), card('limited')] },
	jobs: { ...Object.fromEntries(JOBS.map((job) => [job, { tier: 'all', access: 'read' }])), verify: {} } as Prescriptions['jobs'],
}
/** A Claude Code stream that used `tools` and spent `tokens`. */
const raw = (tokens: number, tools: string[] = []) => [
	...tools.map((name, i) => ({ type: 'assistant', message: { id: `m${i}`, content: [{ type: 'tool_use', id: `t${i}`, name, input: { file_path: 'x' } }] } })),
	{ type: 'result', subtype: 'success', is_error: false, result: 'x', usage: { input_tokens: tokens, output_tokens: 0 } },
].map((e) => JSON.stringify(e)).join('\n')
const INTAKE = '{"understanding":"clear","unclear":[],"ambiguous":[],"missing":[],"notes":[]}'
const ARBITRATED = 'Read the logs.\n{"cause":"test","answer":"The check expects the old header.","evidence":"check.log line 3"}'

/** A product repo with one commit, Made Well's home beside it, a store there, and one item on the repo. */
function setup(name: string) {
	const dir = join(root, name)
	const repo = join(dir, 'product')
	mkdirSync(repo, { recursive: true })
	const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-C', repo, ...args], { encoding: 'utf8' }).trim()
	git('init', '-q', '-b', 'main')
	writeFileSync(join(repo, 'a.txt'), 'one\n')
	git('add', '.')
	git('commit', '-qm', 'first')
	const home = join(dir, 'home')
	process.env.MW_HOME = home
	const store = openStore(join(home, 'madewell.db'))
	const item = store.create({ title: 'Add export', objective: 'CSV export', source: 'operator: add CSV export', workspace: repo })
	const record = (kind: 'intake' | 'originator' | 'execute', job: string, c: Card, output: string, tokens: number) =>
		store.recordCall({ item: item.id, kind, job, profile: 'p', card: c, system: `recorded ${kind} brief`, prompt: JSON.stringify({ item: { workspace: repo } }), outcome: 'ok', output, error: null, raw: raw(tokens), started: '2026-10-21T12:00:00.000Z', ms: 1000 })
	const requests: WorkerRequest[] = []
	const run = (script: (req: WorkerRequest) => WorkerResult, options: { card?: string; brief?: string; job?: (typeof JOBS)[number] } = {}) => {
		const worker = Layer.succeed(Worker, { run: (req) => Effect.sync(() => (requests.push(req), script(req))) })
		return evaluate({ job: options.job ?? 'arbitrate', card: options.card, brief: options.brief, prescriptions, prescriptionsPath: '/etc/prescriptions.json' }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker)))
	}
	const db = () => new DatabaseSync(store.path, { readOnly: true })
	const untouched = () => {
		assert.equal(git('status', '--porcelain', '--ignored'), '', 'the product repo has no new or changed files')
		assert.equal(git('worktree', 'list').split('\n').length, 1, 'no worktree is left registered')
		assert.deepEqual(readdirSync(join(home, 'worktrees')), [], 'no worktree is left on disk')
	}
	return { dir, repo, home, store, item, record, requests, run, db, untouched }
}

test('a tier is replayed call by call, scored like the record, and the cheapest card that matches it is recommended', async () => {
	const t = setup('tier')
	t.record('intake', 'arbitrate', card('big'), INTAKE, 3000)
	t.record('execute', 'arbitrate', card('big'), ARBITRATED, 3000)
	t.record('execute', 'arbitrate', card('big'), ARBITRATED, 3000)
	t.record('execute', 'plan', card('big'), 'another job', 3000)

	const report = await Effect.runPromise(t.run((req) => {
		const answer = req.kind === 'intake' ? INTAKE : ARBITRATED
		switch (req.card.model) {
			case 'cheap': return { ok: true, output: req.kind === 'intake' ? '{"understanding":"clear"}' : 'The test is wrong.', raw: raw(50) }
			case 'flaggy': return { ok: true, output: answer, raw: raw(100, ['Edit']) }
			case 'mid': return { ok: true, output: answer, raw: raw(500) }
			case 'limited': return { ok: false, limit: { account: 'limited', resetsAt: null, message: 'You\'ve hit your limit' } }
			default: return { ok: true, output: answer, raw: raw(2000) }
		}
	}, { card: 'candidates' }))

	assert.deepEqual(report.recorded, { calls: 3, valid: 3, flags: 0, seconds: 3, tokens: 9000, cards: [card('big')] }, 'only the arbitrate job\'s calls are replayed')
	const by = Object.fromEntries(report.cards.map((r) => [r.card.model, r]))
	assert.deepEqual(Object.fromEntries(report.cards.map((r) => [r.card.model, [r.complete, r.matches, r.replay.valid, r.replay.flags, r.replay.tokens]])), {
		cheap: [true, false, 0, 0, 150],
		flaggy: [true, false, 3, 3, 300],
		mid: [true, true, 3, 0, 1500],
		big: [true, true, 3, 0, 6000],
		limited: [false, false, 0, 0, 0],
	})
	assert.deepEqual(by.cheap!.calls.map((c) => [c.kind, c.replay.parses, c.replay.valid, c.verdict]), [['intake', true, false, 'worse'], ['execute', false, false, 'worse'], ['execute', false, false, 'worse']])
	assert.match(by.cheap!.calls[0]!.replay.reason!, /unclear/, 'the reason is the engine\'s own: the intake schema\'s missing field')
	assert.deepEqual(by.flaggy!.calls[0]!.replay.flags, ['write-under-read'], 'a write tool under read access is a rule break')
	assert.equal(by.flaggy!.calls[0]!.verdict, 'worse')
	assert.ok(by.limited!.limited!.resetsAt > new Date().toISOString())
	assert.ok(t.store.exhausted().limited! > Date.now(), 'the limited account is out for delivery too')

	assert.deepEqual([report.recommendation?.card.model, report.recommendation?.tier, report.recommendation?.prescribed], ['mid', 'candidates', 'all'])
	assert.match(report.recommendation!.why, /1500 tokens .* vs 9000 tokens/)
	assert.equal(report.next[0]!.run, '$EDITOR /etc/prescriptions.json', 'it recommends; the operator edits the prescription')

	// Each replay ran in its own worktree, told that is its workspace, and left the product repo as it was.
	const replays = t.requests
	assert.equal(replays.length, 13)
	assert.ok(replays.every((r) => r.cwd !== t.repo && !existsSync(r.cwd) && JSON.parse(r.prompt).item.workspace === r.cwd))
	t.untouched()
	const db = t.db()
	assert.equal((db.prepare('SELECT COUNT(*) AS n FROM eval_calls WHERE eval = ?').get(report.eval) as { n: number }).n, 13, 'every replay, the limited one too, is in the store')
	assert.deepEqual(JSON.parse((db.prepare('SELECT report FROM evals WHERE id = ?').get(report.eval) as { report: string }).report), report)
	db.close()
	t.store.close()
})

test('each call is held to what its kind requires, and a new brief replays only the job\'s execute calls on their recorded cards', async () => {
	const t = setup('brief')
	t.record('intake', 'plan', card('big'), INTAKE, 10)
	t.record('originator', 'plan', card('mid'), '{"answer":"CSV","needsOperator":false}', 10)
	t.record('execute', 'plan', card('big'), 'The plan, in prose.', 10)
	const script = (req: WorkerRequest): WorkerResult => ({ ok: true, output: req.kind === 'intake' ? '{"understanding":"clear","unclear":"none","ambiguous":[],"missing":[]}' : req.kind === 'originator' ? 'I cannot say.' : 'A better plan.', raw: raw(5) })

	const replayed = await Effect.runPromise(t.run(script, { job: 'plan' }))
	assert.deepEqual(replayed.cards.map((r) => [r.card.model, r.calls.map((c) => [c.kind, c.recorded.valid, c.replay.valid, c.verdict])]), [
		['big', [['intake', true, false, 'worse'], ['execute', false, false, 'same']]],
		['mid', [['originator', true, false, 'worse']]],
	], 'without --card, each call replays on its recorded card, held to the engine\'s schemas: a plan in prose is refused')
	assert.equal(replayed.recommendation, null, 'no card matched the record')
	assert.equal(replayed.next[0]!.run, 'mw eval plan --card <a tier, or a card as JSON>')

	const brief = join(t.dir, 'brief.txt')
	writeFileSync(brief, 'You are the planner. Be brief.')
	t.requests.length = 0
	const briefed = await Effect.runPromise(t.run(script, { job: 'plan', brief }))
	assert.deepEqual(t.requests.map((r) => [r.kind, r.card.model, r.system]), [['execute', 'big', 'You are the planner. Be brief.']])
	assert.deepEqual([briefed.brief, briefed.recommendation?.card.model], [brief, 'big'])
	t.untouched()
	t.store.close()
})

test('a replay\'s writes stay in its worktree and are flagged; a replay that reaches the product repo stops the eval', async () => {
	const t = setup('trace')
	t.record('execute', 'plan', card('big'), 'The plan.', 10)
	const report = await Effect.runPromise(t.run((req) => (writeFileSync(join(req.cwd, 'notes.md'), 'scratch'), { ok: true, output: 'The plan.' }), { job: 'plan' }))
	assert.deepEqual(report.cards[0]!.calls[0]!.replay.flags, ['write-under-read'])
	const db = t.db()
	assert.deepEqual(JSON.parse((db.prepare('SELECT facts FROM eval_calls WHERE eval = ?').get(report.eval) as { facts: string }).facts).changed, ['notes.md'])
	db.close()
	t.untouched()

	const failed = await Effect.runPromise(Effect.flip(t.run(() => (writeFileSync(join(t.repo, 'stray.md'), 'oops'), { ok: true, output: 'The plan.' }), { job: 'plan' }))) as MadeWellError & { context: Record<string, any> }
	assert.equal(failed.code, 'workspace_written')
	assert.deepEqual(failed.context.changes.added, ['stray.md'])
	assert.deepEqual(readdirSync(join(t.home, 'worktrees')), [], 'the worktree is removed even when the eval stops')
	t.store.close()
})

test('mw eval replays a delivered item\'s calls through the worker command and prints the report as JSON, changing no file', () => {
	const t = setup('cli')
	t.store.close()
	rmSync(t.home, { recursive: true, force: true })
	const cli = join(import.meta.dirname, '../src/cli.ts')
	const env: NodeJS.ProcessEnv = { ...process.env, MW_HOME: t.home, MW_WORKER_COMMAND: `${process.execPath} ${join(import.meta.dirname, 'fixtures/scripted-worker.ts')}`, FAKE_LOG: join(t.dir, 'calls.log') }
	delete env.MW_STORE
	delete env.MW_PRESCRIPTIONS
	const mw = (...args: string[]) => {
		const r = spawnSync(process.execPath, [cli, ...args], { env, cwd: t.repo })
		return { code: r.status, out: r.stdout.length ? JSON.parse(String(r.stdout)) : null, err: r.stderr.length ? JSON.parse(String(r.stderr)) : null }
	}
	mw('init', '--ship', 'true')
	mw('start', '--objective', 'Add CSV export', '--source', 'operator: add CSV export')
	assert.equal(mw('run').out.items[0].status, 'shipped')

	const evaluated = mw('eval', 'plan', '--card', 'intake', '--limit', '5')
	assert.equal(evaluated.code, 0, JSON.stringify(evaluated.err))
	const report = evaluated.out
	assert.deepEqual(Object.keys(report), ['eval', 'job', 'brief', 'recorded', 'cards', 'recommendation', 'next'])
	assert.equal(report.recorded.calls, 2, 'the planner\'s intake and execute calls')
	assert.deepEqual(report.cards.map((r: { card: Card; matches: boolean }) => [r.card.model, r.matches]), [['claude-haiku-5-5', true], ['gpt-6-luna', true], ['gpt-6-luna', true]])
	assert.equal(report.cards[0].calls[1].replay.valid, true)
	assert.ok(report.recommendation.card)
	assert.equal(report.recommendation.prescribed, 'deep')
	assert.deepEqual(readdirSync(t.repo).sort(), ['.git', 'a.txt', 'src'], 'only the delivered change, which Made Well brought onto main')
	t.untouched()

	const bad = mw('eval', 'plan', '--card', 'nosuch')
	assert.deepEqual([bad.err.error, bad.err.context.tiers], ['eval_card_invalid', ['deep', 'coding', 'intake']])
	const none = mw('eval', 'arbitrate')
	assert.deepEqual([none.err.error, none.err.context.recorded.plan, none.err.next[0].run.startsWith('mw eval ')], ['eval_no_calls', 2, true])
	assert.deepEqual(mw('eval', 'plan', '--item', '2,3').err.context.items, [2, 3], 'only the named items\' calls are replayed')
	assert.equal(mw('eval', 'plan', '--item', '1,x').err.error, 'usage')
})
