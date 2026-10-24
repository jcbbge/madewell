import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { Effect, Fiber, Layer } from 'effect'
import { TestClock } from 'effect/testing'
import type { Card, Prescriptions } from '../src/cards.ts'
import { answer, BRIEF, drive, drop, go, nextFor, promote, retry, runQueue } from '../src/engine.ts'
import { NEUTRAL_HOST } from '../src/harness.ts'
import { deliverableShape, laneOf, problemsOf, SOFTWARE, type Job, type Pack } from '../src/lane.ts'
import { openStore, Store, type Autonomy } from '../src/store.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'
import { worktreesRoot } from '../src/workspace.ts'

const card = (harness: string, account: string, model: string): Card => ({ harness, provider: account, account, model, effort: 'low' })
const OPUS = card('claude', 'anthropic', 'opus')
const ASTRA = card('codex', 'openai', 'astra')
const SONNET = card('claude', 'anthropic', 'sonnet')
const HAIKU = card('claude', 'anthropic', 'haiku')
const JOBS: Job[] = ['discover', 'ideate', 'challenge', 'plan', 'test-plan', 'implement', 'arbitrate']
const prescriptions: Prescriptions = {
	tiers: { deep: [OPUS, ASTRA], coding: [SONNET, card('codex', 'openai', 'sol')], intake: [HAIKU, card('codex', 'openai', 'luna')] },
	jobs: {
		...Object.fromEntries(JOBS.map((job) => [job, { tier: job === 'implement' ? 'coding' : 'deep', access: job === 'implement' ? 'make' : job === 'test-plan' ? 'checks' : job === 'arbitrate' ? 'run' : 'read', budget: { minutes: 1 } }])),
		verify: { budget: { minutes: 1 } },
	} as Prescriptions['jobs'],
}
const config = { prescriptions }

const PLAN = {
	making: 'A CSV export script', notMaking: ['PDF export'], scope: ['src/export.sh'], follows: [{ path: 'src/export.sh', follows: 'src/app.sh' }],
	steps: ['Create src/export.sh printing a,b'], doneWhen: [{ id: 'D1', text: 'sh src/export.sh prints a,b' }],
	decisions: [{ question: 'Which separator?', decision: 'Comma', why: 'every spreadsheet opens it' }],
}
const CHECK = 'out=$(sh src/export.sh 2>&1); [ "$out" = "a,b" ] || { echo "expected a,b, got $out"; exit 1; }'

type Value = WorkerResult | string | Record<string, unknown> | undefined
type Reply = Value | Promise<Value>
type Script = (req: WorkerRequest, n: number) => Reply

const write = (req: WorkerRequest, path: string, content: string) => {
	mkdirSync(dirname(join(req.cwd, path)), { recursive: true })
	writeFileSync(join(req.cwd, path), content)
}
const implement = (req: WorkerRequest, body = 'echo a,b', extra: Record<string, unknown> = {}) => (write(req, 'src/export.sh', `${body}\n`), { summary: 'Created src/export.sh', ...extra })
const checks = (req: WorkerRequest, body = CHECK) => (write(req, 'checks/export.check.sh', `${body}\n`), { checks: [{ id: 'C1', doneWhen: 'D1', run: 'sh checks/export.check.sh' }] })
const ruling = (cause: string) => ({ cause, answer: 'fix it this way', evidence: 'the check output' })
const clear = { understanding: 'I see the job', unclear: [], ambiguous: [], missing: [], notes: [] }
const ask = (...questions: string[]) => ({ understanding: 'Mostly clear', unclear: questions, ambiguous: [], missing: [], notes: [] })
const reply = (text: string, needsOperator = false) => ({ answer: text, needsOperator })

/** The deliverable each job returns when the script does not say otherwise. Makers write their files into their worktree. */
function standard(req: WorkerRequest): Reply {
	if (req.kind === 'intake') return clear
	if (req.kind === 'originator') return reply('Here is what I meant.')
	switch (req.job) {
		case 'ideate': return { outcome: 'CSV export', approach: 'a shell script', decisions: [{ question: 'Format?', decision: 'CSV', why: 'the operator asked for it' }] }
		case 'challenge': return { findings: [{ finding: 'No header row needed', resolution: 'none' }], decisions: [] }
		case 'plan': return PLAN
		case 'test-plan': return checks(req)
		case 'implement': return implement(req)
		case 'arbitrate': return ruling('implementation')
		default: return 'unscripted'
	}
}

const git = (dir: string, ...args: string[]) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim()

/**
 * A product repo with one commit, Made Well's home beside it (store, registry, worktrees), and a scripted
 * worker. The project ships by logging the merged commit. `script` answers calls; n counts calls of the same
 * kind and job of the same item; anything it leaves undefined gets the standard answer.
 */
function setup(script: Script = () => undefined, autonomy?: Autonomy) {
	const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'mw-engine-')))
	const home = join(tmp, 'home')
	const repo = join(tmp, 'product')
	mkdirSync(join(repo, 'src'), { recursive: true })
	git(repo, 'init', '-q', '-b', 'main')
	git(repo, 'config', 'user.name', 'Operator')
	git(repo, 'config', 'user.email', 'operator@example.com')
	writeFileSync(join(repo, 'src', 'app.sh'), 'echo app\n')
	git(repo, 'add', '.')
	git(repo, 'commit', '-qm', 'first')
	const was = process.env.MW_HOME
	process.env.MW_HOME = home
	mkdirSync(home)
	writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: repo, ship: `echo "$MW_ITEM $MW_COMMIT" >> ${tmp}/shipped.log` }]))
	const store = openStore(join(home, 'mw.db'))
	const calls: WorkerRequest[] = []
	const answerFor = (req: WorkerRequest): Promise<WorkerResult> => {
		calls.push(req)
		const n = calls.filter((c) => c.kind === req.kind && c.job === req.job && c.item === req.item).length
		const settle = async (r: Reply): Promise<WorkerResult> => {
			const v: Value = await r
			if (v === undefined) return settle(standard(req))
			if (typeof v === 'string') return { ok: true, output: v }
			return 'ok' in v ? (v as WorkerResult) : { ok: true, output: `Done.\n${JSON.stringify(v)}` }
		}
		return settle(script(req, n))
	}
	const worker = Layer.succeed(Worker, { run: (req) => Effect.promise(() => answerFor(req)) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	const create = (title = 'Add CSV export') => store.create({ title, objective: 'Users can export a report as CSV', source: 'operator: please add CSV export', workspace: repo, ...(autonomy ? { autonomy } : {}) })
	const item = create()
	const of = (kind: string, job: Job, id = item.id) => calls.filter((c) => c.kind === kind && c.job === job && c.item === id)
	const packet = (kind: string, job: Job, i = 0) => JSON.parse(of(kind, job)[i]!.prompt)
	const shipped = () => (existsSync(join(tmp, 'shipped.log')) ? readFileSync(join(tmp, 'shipped.log'), 'utf8').trim().split('\n') : [])
	const cleanup = () => {
		store.close()
		if (was === undefined) delete process.env.MW_HOME
		else process.env.MW_HOME = was
		rmSync(tmp, { recursive: true, force: true })
	}
	return { tmp, home, repo, store, calls, run, item, create, of, packet, shipped, cleanup }
}

/** Nothing of the item is left: no worktree, no worktree record, no stray file in the product repo, no checks in Made Well's home. */
function assertNoTrace(t: ReturnType<typeof setup>, id = t.item.id) {
	assert.deepEqual(existsSync(worktreesRoot()) ? readdirSync(worktreesRoot()) : [], [], 'every worktree is removed')
	assert.equal(git(t.repo, 'worktree', 'list').split('\n').length, 1, 'git keeps no worktree record')
	assert.equal(git(t.repo, 'status', '--porcelain', '--ignored'), '', 'the product checkout is clean')
	assert.ok(!existsSync(join(t.home, 'items', String(id))), 'the item\'s checks are gone once it ships')
}

test('an item passes through six profiles, splits after planning, and ships when Made Well\'s own run of its checks passes', async () => {
	const t = setup()
	try {
		const start = git(t.repo, 'rev-parse', 'main')
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		assert.deepEqual(t.calls.filter((c) => !['implement', 'test-plan'].includes(c.job)).map((c) => `${c.kind} ${c.job} ${c.profile}`), [
			'intake ideate ideator', 'execute ideate ideator',
			'intake challenge ideation peer', 'execute challenge ideation peer',
			'intake plan planner', 'execute plan planner',
		], 'no verifier: nothing after the makers calls an agent')
		for (const job of ['implement', 'test-plan'] as const) assert.deepEqual(t.calls.filter((c) => c.job === job).map((c) => c.kind), ['intake', 'execute'])

		// The verified change is on main, the checks are not, and the ship command saw the commit.
		const main = git(t.repo, 'rev-parse', 'main')
		assert.equal(git(t.repo, 'rev-parse', 'main~1'), start)
		assert.equal(git(t.repo, 'show', 'main:src/export.sh'), 'echo a,b')
		assert.deepEqual(git(t.repo, 'show', '--name-only', '--format=', 'main').split('\n'), ['src/export.sh'], 'the check files never ship')
		assert.equal(git(t.repo, 'log', '-1', '--format=%an %s', 'main'), 'Operator Add CSV export', 'committed as the product\'s own author, no agent trailer')
		assert.equal(readFileSync(join(t.repo, 'src', 'export.sh'), 'utf8'), 'echo a,b\n', 'the operator\'s checkout follows main')
		assert.deepEqual(t.shipped(), [`${t.item.id} ${main}`])
		assert.equal(done.shipped?.main, main)
		assert.deepEqual(done.verification?.results.map((r) => [r.id, r.doneWhen, r.exitCode]), [['C1', 'D1', 0]], 'done-when ids thread from the plan through the checks to the results')
		assertNoTrace(t)

		// Every call ran in its own worktree, never in the product checkout; intake on the cheapest card.
		assert.ok(t.calls.every((c) => c.cwd.startsWith(worktreesRoot() + '/')))
		assert.ok(t.calls.filter((c) => c.kind === 'intake').every((c) => c.card.model === 'haiku' && c.access === 'none'), 'intake judges the packet alone, with no tools')
		assert.equal(t.of('execute', 'test-plan')[0]!.card.harness, 'codex', 'the test architect runs on a runtime other than the implementer\'s')
		assert.equal(t.of('execute', 'implement')[0]!.card.harness, 'claude')
		assert.ok(t.calls.every((c) => c.budget?.minutes === 1 && c.harness !== undefined), 'each call carries its job\'s budget and harness entry')

		// One brief for every call: the rubric's questions, the neutral host, no trace, the product's conventions.
		assert.ok(t.calls.every((c) => c.system === BRIEF))
		assert.ok(BRIEF.includes(NEUTRAL_HOST) && BRIEF.includes('Honor the conventions the project\'s repository already has.'))
		for (const q of ['What moves us toward a 10× better experience of developing, understanding, inspecting, and recovering the work?', 'What moves us toward a 10× better experience for the person the resulting system serves?', 'What makes agent execution clearer, more efficient, better grounded, and more reliably bounded?']) assert.ok(BRIEF.includes(q))
		assert.match(t.packet('intake', 'plan').you.task, /What is unclear\? What is ambiguous\? Do I have everything I need to proceed\?/)
		assert.match(t.packet('intake', 'plan').you.task, /no tools and no checkout in this call, by design[\s\S]*Never a question: a decision your own job settles/)
		assert.equal(t.packet('intake', 'plan').you.where, 'Made Well\'s delivery lane (planning)')
		// Every call names its reply's schema under you.replyFormat, and no packet key is called "answer": an
		// agent told to reply with the shape under "answer" wrapped its reply in that key.
		for (const c of t.calls) {
			const you = JSON.parse(c.prompt).you
			assert.ok(you.replyFormat && typeof you.replyFormat === 'object', `${c.kind} ${c.job} names its reply format`)
			assert.equal(you.answer, undefined, `${c.kind} ${c.job} has no "answer" key`)
		}
		assert.match(BRIEF, /ONLY one JSON object that matches you\.replyFormat/)

		// Packets run stable to volatile, and each job receives only what the static table gives it.
		const impl = t.packet('execute', 'implement')
		assert.deepEqual(Object.keys(impl).slice(0, 4), ['item', 'received', 'snapshot', 'you'])
		assert.deepEqual(Object.keys(impl.received), ['plan'])
		assert.deepEqual(impl.snapshot.contents, { 'src/export.sh': null, 'src/app.sh': 'echo app\n' }, 'the makers receive the existing file the new one follows')
		assert.deepEqual(Object.keys(t.packet('execute', 'test-plan').received), ['plan'])
		assert.deepEqual(Object.keys(t.packet('execute', 'plan').received), ['ideate', 'challenge'])
		assert.equal(impl.exchange.from, 'planner')
		assert.equal(impl.exchange.handoff, 'The planner\'s deliverable, under received.plan.')
		const challenge = t.packet('execute', 'challenge').received
		assert.deepEqual(t.packet('execute', 'plan').received.ideate, challenge.ideate, 'a later packet repeats an earlier one\'s prefix')

		// Every call is on the record with the facts its flags are judged by.
		const recorded = t.store.calls(t.item.id)
		assert.equal(recorded.length, t.calls.length)
		const made = recorded.find((c) => c.kind === 'execute' && c.job === 'implement')!
		assert.deepEqual(made.facts?.scope, PLAN.scope)
		assert.deepEqual(made.facts?.changed, ['src/export.sh'])
		assert.equal(made.facts?.access, 'make')
		assert.deepEqual(made.facts?.budget, { ms: 60_000 })
		assert.deepEqual(made.flags, [])
		assert.deepEqual(made.facts?.allowlist, ['Read', 'Grep', 'Glob', 'Bash', 'Edit', 'Write'])
		const checked = recorded.find((c) => c.kind === 'execute' && c.job === 'test-plan')!
		assert.deepEqual([checked.card.harness, checked.facts?.allowlist], ['codex', undefined], 'Codex takes sandbox flags, not tool names: there is no allowlist to judge its tools by')
		assert.deepEqual(recorded.find((c) => c.kind === 'execute' && c.job === 'plan')!.facts?.required, ['making', 'notMaking', 'scope', 'steps', 'doneWhen', 'decisions'])
	} finally {
		t.cleanup()
	}
})

test('the implementer and the test architect run at the same time, and neither ever sees the other\'s output', async () => {
	let release: () => void
	const both = new Promise<void>((r) => (release = r))
	let started = 0
	const meet = async (r: Value) => {
		if (++started === 2) release()
		await Promise.race([both, new Promise((_, no) => setTimeout(() => no(new Error('the makers did not overlap')), 5000))])
		return r
	}
	const verdicts = ['echo wrong', 'echo a,b']
	const t = setup((req, n) => {
		if (req.kind !== 'execute') return undefined
		if (req.job === 'implement') return n === 1 ? meet(implement(req, verdicts.shift()!, { note: 'IMPLEMENTER-SECRET' })) : implement(req, verdicts.shift()!)
		if (req.job === 'test-plan') return n === 1 ? meet({ ...checks(req), note: 'ARCHITECT-SECRET' }) : checks(req)
		return undefined
	})
	try {
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		// The first round failed (implementation) and was replanned, so round 2's makers had round 1's outputs on record.
		assert.equal(t.of('execute', 'implement').length, 2)
		for (const c of t.calls.filter((c) => c.job === 'implement' || (c.kind !== 'originator' && c.job === 'plan'))) assert.ok(!c.prompt.includes('ARCHITECT-SECRET'), `${c.kind} ${c.job} never sees the checks`)
		for (const c of t.calls.filter((c) => c.job === 'test-plan')) assert.ok(!c.prompt.includes('IMPLEMENTER-SECRET'), `${c.kind} ${c.job} never sees the implementation`)
		const arbiter = t.packet('execute', 'arbitrate')
		assert.ok(arbiter.received.implement && arbiter.received['test-plan'], 'only the arbiter receives both')
	} finally {
		t.cleanup()
	}
})

test('a check that fails once and passes on its second run ships without reaching the arbiter, and is recorded as flaky', async () => {
	const t = setup((req) => (req.kind === 'execute' && req.job === 'test-plan' ? checks(req, `[ -f .tried ] || { touch .tried; exit 1; }; ${CHECK}`) : undefined))
	try {
		await t.run(drive(t.item.id, config))
		assert.equal(t.store.get(t.item.id)!.status, 'shipped')
		assert.equal(t.of('execute', 'arbitrate').length, 0)
		assert.deepEqual(t.store.events(t.item.id).find((e) => e.kind === 'verified')!.data.flaky, ['C1'])
	} finally {
		t.cleanup()
	}
})

test('a failing check goes to the arbiter with its logs; a bad test is rewritten and run again, a bad implementation is replanned', async () => {
	let seen = ''
	const t = setup((req, n) => {
		if (req.kind === 'intake' && req.job === 'arbitrate' && n === 1) return ask('Did the check fail before this change?')
		if (req.kind === 'execute' && req.job === 'test-plan' && req.item === 1) return checks(req, n === 1 ? 'echo "expected a;b"; exit 1' : CHECK)
		if (req.kind === 'execute' && req.job === 'arbitrate' && req.item === 1) {
			seen = readFileSync(join(req.cwd, 'src/export.sh'), 'utf8') + git(req.cwd, 'log', '-1', '--format=%s') + readFileSync(join(req.cwd, 'checks/export.check.sh'), 'utf8')
			return ruling('test')
		}
		if (req.kind === 'execute' && req.job === 'implement' && req.item === 2) return implement(req, n === 1 ? 'echo nope' : 'echo a,b # second')
		return undefined
	})
	try {
		await t.run(drive(t.item.id, config))
		assert.equal(t.store.get(t.item.id)!.status, 'shipped')
		assert.equal(t.of('execute', 'implement').length, 1, 'a bad test is corrected; the valid implementation is not rebuilt')
		assert.equal(t.of('execute', 'test-plan').length, 2)
		const arbiter = t.packet('execute', 'arbitrate')
		assert.match(arbiter.exchange.handoff, /1 of 1 checks failed[\s\S]*Check C1 \(done-when D1\) exited 1[\s\S]*expected a;b[\s\S]*ran it again on the same candidate: exited 1/)
		assert.match(arbiter.exchange.handoff, /Environment: [\s\S]*no prepare command[\s\S]*main has not moved since/, 'the arbiter gets the environment\'s evidence')
		assert.equal(arbiter.verification.results[0].doneWhen, 'D1')
		assert.equal(seen, 'echo a,b\nAdd CSV exportecho "expected a;b"; exit 1\n', 'the arbiter works on the candidate: the change committed, the checks applied')
		// Its intake judges the same packet: the same run of the checks, and the snapshot of the candidate, not of main.
		const intake = t.packet('intake', 'arbitrate')
		assert.deepEqual(intake.verification, arbiter.verification)
		assert.deepEqual([intake.change, intake.checks], [arbiter.change, arbiter.checks])
		assert.equal(intake.snapshot.contents['src/export.sh'], 'echo a,b\n', 'the snapshot shows the implementer\'s change')
		assert.deepEqual(intake.snapshot.contents, arbiter.snapshot.contents, 'intake and job see the same candidate tree')
		assert.equal(t.of('originator', 'arbitrate')[0]!.profile, 'test architect', 'the checks\' author answers the arbiter\'s questions')
		const rework = t.packet('execute', 'test-plan', 1)
		assert.equal(rework.exchange.from, 'arbiter')
		assert.match(rework.exchange.handoff, /^Ruling \(test\): fix it this way/)
		assert.deepEqual(rework.yourPreviousDeliverable.checks[0].id, 'C1')

		const second = t.create('second')
		t.calls.length = 0
		await t.run(drive(second.id, config))
		assert.equal(t.store.get(second.id)!.status, 'shipped')
		const jobs = t.calls.filter((c) => c.kind === 'execute').map((c) => c.job)
		assert.deepEqual(jobs.slice(5, 7), ['arbitrate', 'plan'], 'a bad implementation goes back to the planner')
		assert.deepEqual(jobs.slice(7).sort(), ['implement', 'test-plan'], 'then both makers again')
		assert.equal(git(t.repo, 'show', 'main:src/export.sh'), 'echo a,b # second')
	} finally {
		t.cleanup()
	}
})

test('a read call that writes and an answer that breaks its contract are refused: each is the receiver\'s question to its originator; malformed JSON is only re-asked', async () => {
	// The first ideate answer is JSON that does not parse and starts with "{": reading it must neither hang nor cost an NQ turn.
	const broken = '{"outcome": "CSV export", "approach": "a script" "decisions": []}'
	const t = setup((req, n) => {
		if (req.kind === 'execute' && req.job === 'plan' && n === 1) return (write(req, 'notes.md', 'my plan'), PLAN)
		if (req.kind === 'execute' && req.job === 'ideate' && n === 1) return broken
		if (req.kind === 'execute' && req.job === 'test-plan' && n === 1) return (write(req, 'checks/x.sh', 'true'), { checks: [{ id: 'C1', doneWhen: 'D9', run: 'true' }] })
		return undefined
	})
	try {
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		const outcomes = (job: Job, kind = 'execute') => t.store.calls(t.item.id).filter((c) => c.kind === kind && c.job === job).map((c) => c.outcome)
		assert.deepEqual([outcomes('ideate'), outcomes('ideate', 'repair')], [['rejected'], ['ok']], 'the malformed answer was repaired by one call, and the job did not run again')
		const repair = t.of('repair', 'ideate')[0]!
		assert.deepEqual([repair.access, repair.card.model, JSON.parse(repair.prompt).yourAnswer], ['none', t.of('execute', 'ideate')[0]!.card.model, broken], 'same card, no tools, its own answer')
		assert.match(t.store.get(t.item.id)!.outputs.ideate!, /"approach":"a shell script"/, 'the repaired answer is the deliverable')
		assert.deepEqual(outcomes('plan'), ['rejected', 'ok'])
		assert.deepEqual(outcomes('test-plan'), ['rejected', 'ok'])
		const plan = t.store.calls(t.item.id).find((c) => c.job === 'plan' && c.outcome === 'rejected')!
		assert.match(plan.error!, /changed its read-only checkout: notes\.md/)
		assert.deepEqual(plan.flags.map((f) => f.rule), ['write-under-read'])
		assert.match(t.packet('execute', 'test-plan', 1).yourLastAnswerWasRefused, /D9[\s\S]*without a check: D1/)
		const asked = t.store.events(t.item.id).filter((e) => e.kind === 'nq-question' && e.data.error)
		assert.deepEqual(asked.map((e) => e.data.job), ['plan', 'test-plan'], 'each refusal of content went to the originator as a question')
		assert.match(String((asked[1]!.data.questions as string[])[0]), /D1/)
		assert.deepEqual(t.of('originator', 'plan').map((c) => c.profile), ['ideation peer'], 'the one who handed over the work answers')
		assertNoTrace(t)
	} finally {
		t.cleanup()
	}
})

test('a plan that creates a kind of file the repo already has must name the existing one it follows; a refusal after three answered turns holds the item before anything is made', async () => {
	const plans = [
		{ ...PLAN, scope: ['src/export.sh', 'tools/gen.py'], follows: [] },
		{ ...PLAN, follows: [{ path: 'src/export.sh', follows: 'src/missing.sh' }] },
		{ ...PLAN, follows: [{ path: 'src/export.sh', follows: 'notes.txt' }] },
		{ ...PLAN, follows: [{ path: 'src/export.sh', follows: 'notes.txt' }] },
	]
	const t = setup((req, n) => (req.kind === 'execute' && req.job === 'plan' ? plans[n - 1] : undefined), 'checkpoints')
	try {
		writeFileSync(join(t.repo, 'notes.txt'), 'notes\n')
		git(t.repo, 'add', '.')
		git(t.repo, 'commit', '-qm', 'notes')
		const item = await t.run(drive(t.item.id, config))
		const refused = t.store.calls(t.item.id).filter((c) => c.kind === 'execute' && c.job === 'plan').map((c) => [c.outcome, c.error])
		assert.equal(refused.length, 4, 'three refusals answered by the ideation peer, and a fourth that holds')
		assert.equal(t.of('originator', 'plan').length, 3)
		assert.ok(refused.every(([outcome]) => outcome === 'rejected'))
		assert.match(refused[0]![1]!, /src\/export\.sh is new: name the existing \.sh file it follows/)
		assert.doesNotMatch(refused[0]![1]!, /gen\.py/, 'the repo has no .py file yet: nothing is settled for it to follow')
		assert.match(refused[1]![1]!, /follows src\/missing\.sh, which is not a file in the repo/)
		assert.match(refused[2]![1]!, /follows notes\.txt, which is a different kind of file/)
		assert.equal(item.hold?.code, 'nq_turns')
		assert.equal(item.hold?.context.job, 'plan')
		assert.ok(String((item.hold?.context.questions as string[])[0]).endsWith(refused[3]![1]!), 'the hold names the last refusal as the open question')
		assert.deepEqual(t.calls.filter((c) => c.job === 'implement' || c.job === 'test-plan'), [], 'nothing is made from an ungrounded plan')
	} finally {
		t.cleanup()
	}
})

test('the project\'s conventions travel with the item; a plan that does not hold the change to each one is refused, and the checks then prove it', async () => {
	const TOKENS = 'Colours come from the design tokens in src/tokens.css'
	const t = setup((req, n) => {
		if (req.kind !== 'execute') return undefined
		if (req.job === 'plan') {
			const D2 = { id: 'D2', text: 'src/export.sh uses no raw colour values' }
			return n === 1 ? PLAN : n === 2 ? { ...PLAN, conventions: [{ convention: TOKENS, doneWhen: 'D9' }] } : { ...PLAN, doneWhen: [...PLAN.doneWhen, D2], conventions: [{ convention: ` ${TOKENS}`, doneWhen: 'D2' }, { convention: 'Every script is POSIX sh', doesNotApply: 'nothing new to check beyond D1' }] }
		}
		if (req.job === 'test-plan') return (write(req, 'checks/export.check.sh', `${CHECK}\n`), { checks: [{ id: 'C1', doneWhen: 'D1', run: 'sh checks/export.check.sh' }, { id: 'C2', doneWhen: 'D2', run: '! grep -q "#[0-9a-f]\\{6\\}" src/export.sh' }] })
		return undefined
	}, 'full')
	writeFileSync(join(t.home, 'projects.json'), JSON.stringify([{ path: t.repo, conventions: [TOKENS, 'Every script is POSIX sh'] }]))
	try {
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		assert.deepEqual(t.packet('execute', 'ideate').item.conventions, [TOKENS, 'Every script is POSIX sh'], 'every job sees the rules the work follows')
		assert.match(t.packet('execute', 'plan', 1).yourLastAnswerWasRefused, /conventions[\s\S]*"Colours come from the design tokens in src\/tokens\.css", "Every script is POSIX sh"/)
		assert.match(t.packet('execute', 'plan', 2).yourLastAnswerWasRefused, /"Colours come from[^,]*", "Every script is POSIX sh"\.$/, 'a done-when id the plan does not have holds nothing')
		assert.deepEqual(done.verification?.results.map((r) => [r.id, r.exitCode]), [['C1', 0], ['C2', 0]])
	} finally {
		t.cleanup()
	}
})

test('another session pushing to the product repo while a read call runs is not the agent\'s write', async () => {
	const t = setup((req) => {
		if (req.kind === 'execute' && req.job === 'plan') git(t.repo, 'branch', 'chore/upgrade')
		return undefined
	})
	try {
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		const plan = t.store.calls(t.item.id).filter((c) => c.kind === 'execute' && c.job === 'plan')
		assert.deepEqual(plan.map((c) => [c.outcome, c.flags]), [['ok', []]], 'the shared refs moved, the checkout did not')
	} finally {
		t.cleanup()
	}
})

test('an implementer that strays outside the plan\'s scope is refused, and the next call picks up its work to revert the stray file', async () => {
	let carried = false
	const t = setup((req, n) => {
		if (req.kind !== 'execute' || req.job !== 'implement') return undefined
		if (n === 1) return (write(req, 'README.md', 'unplanned'), implement(req))
		carried = existsSync(join(req.cwd, 'src/export.sh')) && existsSync(join(req.cwd, 'README.md'))
		rmSync(join(req.cwd, 'README.md'))
		return { summary: 'Reverted README.md' }
	})
	try {
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		assert.ok(carried, 'the second call\'s checkout holds the first call\'s work')
		assert.match(t.packet('execute', 'implement', 1).yourLastAnswerWasRefused, /outside the plan's scope: README\.md/)
		assert.deepEqual(git(t.repo, 'show', '--name-only', '--format=', 'main').split('\n'), ['src/export.sh'])
		assertNoTrace(t)
	} finally {
		t.cleanup()
	}
})

test('an implementer that commits to main holds the item before anything ships; one that leaves a file in the product repo, or edits its shared git excludes, holds it too', async () => {
	const t = setup((req) => {
		if (req.kind === 'execute' && req.job === 'implement' && req.item === 1) {
			writeFileSync(join(t.repo, 'early.txt'), 'x')
			git(t.repo, 'add', 'early.txt')
			git(t.repo, 'commit', '-qm', 'implementer committed before verification')
			return implement(req)
		}
		if (req.kind === 'execute' && req.job === 'implement' && req.item === 2) return (writeFileSync(join(t.repo, 'probe.log'), 'x'), implement(req))
		if (req.kind === 'execute' && req.job === 'implement' && req.item === 3) {
			// From its own worktree: the excludes file is shared with the product repo, so this would outlive the worktree.
			appendFileSync(resolve(req.cwd, git(req.cwd, 'rev-parse', '--git-common-dir'), 'info', 'exclude'), '/.scratch/\n')
			return implement(req)
		}
		return undefined
	})
	try {
		const first = await t.run(drive(t.item.id, config))
		assert.equal(first.hold?.code, 'branch_moved')
		assert.deepEqual((first.hold?.context.landed as string[]).map((l) => l.split(' ').slice(1).join(' ')), ['implementer committed before verification'])
		assert.ok(nextFor(first).some((n) => n.run.includes('reset --keep')))
		assert.deepEqual(t.shipped(), [])
		assert.equal(t.store.calls(t.item.id).find((c) => c.job === 'implement' && c.kind === 'execute')!.outcome, 'rejected')

		git(t.repo, 'reset', '-q', '--hard', 'HEAD~1')
		const second = t.create('second')
		const held = await t.run(drive(second.id, config))
		assert.equal(held.hold?.code, 'leftovers')
		assert.deepEqual(held.hold?.context.files, ['probe.log'])
		const [clean, keep] = nextFor(held).map((n) => n.run)
		assert.match(clean!, /clean -fdx -- "probe.log"$/)
		assert.equal(keep, `mw retry ${second.id}`, 'the files may be the operator\'s own: keeping them is the other choice')

		const third = await t.run(drive(t.create('third').id, config))
		assert.deepEqual([third.hold?.code, third.hold?.context.files], ['leftovers', ['.git/info/exclude']])
	} finally {
		t.cleanup()
	}
})

test('what a maker provisions is torn down once; a failed teardown holds, and a retry repeats only the one that failed', async () => {
	const t = setup((req) => {
		if (req.kind === 'execute' && req.job === 'implement') {
			return implement(req, 'echo a,b', { provisioned: [{ kind: 'server', id: 's1', teardown: 'echo s1 >> "$MW_TORN"' }, { kind: 'database-branch', id: 'db1', teardown: '[ -f "$MW_TORN.ok" ] && echo db1 >> "$MW_TORN"' }] })
		}
		return undefined
	})
	const was = process.env.MW_TORN
	process.env.MW_TORN = join(t.tmp, 'torn.log')
	try {
		const first = await t.run(drive(t.item.id, config))
		assert.equal(first.hold?.code, 'teardown_failed')
		assert.equal(readFileSync(join(t.tmp, 'torn.log'), 'utf8'), 's1\n')

		writeFileSync(join(t.tmp, 'torn.log.ok'), '')
		await t.run(retry(t.item.id))
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		assert.equal(readFileSync(join(t.tmp, 'torn.log'), 'utf8'), 's1\ndb1\n', 'each torn down once')
		assert.deepEqual(done.provisioned?.map((p) => [p.id, p.torn?.exitCode]), [['s1', 0], ['db1', 0]])
		assertNoTrace(t)
	} finally {
		if (was === undefined) delete process.env.MW_TORN
		else process.env.MW_TORN = was
		t.cleanup()
	}
})

test('items in parallel: another item\'s ship mid-flight trips no guard, and checks run again on the main that ship left', async () => {
	const t = setup((req) => {
		if (req.item === 2 && req.kind === 'execute' && req.job === 'implement') {
			// Item 2 makes its change while item 1 ships: the branch moves under it.
			return (async () => {
				while (!t.store.get(1)?.merged) await new Promise((r) => setTimeout(r, 10))
				return implement(req)
			})()
		}
		if (req.item === 1 && req.kind === 'execute' && req.job === 'plan') return { ...PLAN, scope: ['src/other.sh'], follows: [{ path: 'src/other.sh', follows: 'src/app.sh' }], doneWhen: [{ id: 'D1', text: 'other prints b' }] }
		if (req.item === 1 && req.kind === 'execute' && req.job === 'implement') return (write(req, 'src/other.sh', 'echo b\n'), { summary: 'other' })
		if (req.item === 1 && req.kind === 'execute' && req.job === 'test-plan') return (write(req, 'checks/other.check.sh', '[ "$(sh src/other.sh)" = b ]\n'), { checks: [{ id: 'C1', doneWhen: 'D1', run: 'sh checks/other.check.sh' }] })
		if (req.item === 2 && req.kind === 'execute' && req.job === 'test-plan') return (write(req, 'checks/export.check.sh', `[ -f src/other.sh ] && ${CHECK}\n`), { checks: [{ id: 'C1', doneWhen: 'D1', run: 'sh checks/export.check.sh' }] })
		return undefined
	})
	try {
		const second = t.create('Second')
		const [a, b] = await t.run(Effect.all([drive(t.item.id, config), drive(second.id, config)], { concurrency: 2 }))
		assert.deepEqual([a.status, b.status], ['shipped', 'shipped'])
		assert.equal(b.verification?.on, a.shipped?.main, 'the second item\'s checks ran on the main the first one\'s ship left')
		assert.equal(git(t.repo, 'rev-parse', 'main~1'), a.shipped?.main)
		assert.equal(git(t.repo, 'rev-parse', 'main'), b.shipped?.main)
		assert.equal(git(t.repo, 'show', 'main:src/other.sh') + git(t.repo, 'show', 'main:src/export.sh'), 'echo becho a,b')
		assertNoTrace(t, 1)
		assertNoTrace(t, 2)
	} finally {
		t.cleanup()
	}
})

test('items in parallel on the same file: when another item\'s ship leaves a change that no longer applies, the planner plans again from the branch as it is now, with no arbiter', async () => {
	const plan = (id: string) => ({ ...PLAN, scope: ['src/app.sh'], follows: [], doneWhen: [{ id: 'D1', text: `app prints ${id}` }] })
	const check = (req: WorkerRequest, word: string) => (write(req, `checks/${word}.check.sh`, `sh src/app.sh | grep -qx ${word}\n`), { checks: [{ id: 'C1', doneWhen: 'D1', run: `sh checks/${word}.check.sh` }] })
	const t = setup((req, n) => {
		const word = req.item === 1 ? 'one' : 'two'
		if (req.kind === 'execute' && req.job === 'plan') return plan(word)
		if (req.kind === 'execute' && req.job === 'test-plan') return check(req, word)
		if (req.item === 1 && req.kind === 'execute' && req.job === 'implement') return (write(req, 'src/app.sh', 'echo app\necho one\n'), { summary: 'one' })
		if (req.item === 2 && req.kind === 'execute' && req.job === 'implement') {
			if (n > 1) return (write(req, 'src/app.sh', `${readFileSync(join(req.cwd, 'src/app.sh'), 'utf8')}echo two\n`), { summary: 'two, again' })
			// The first change is made on the old branch while item 1 ships the same lines.
			return (async () => {
				while (!t.store.get(1)?.merged) await new Promise((r) => setTimeout(r, 10))
				return (write(req, 'src/app.sh', 'echo app\necho two\n'), { summary: 'two' })
			})()
		}
		return undefined
	})
	try {
		const second = t.create('Second')
		const [a, b] = await t.run(Effect.all([drive(t.item.id, config), drive(second.id, config)], { concurrency: 2 }))
		assert.deepEqual([a.status, b.status], ['shipped', 'shipped'])
		assert.equal(git(t.repo, 'show', 'main:src/app.sh'), 'echo app\necho one\necho two', 'both changes are on main')
		assert.deepEqual(t.store.events(2).filter((e) => e.kind === 'rebased').map((e) => e.data.conflict), ['implement'])
		assert.equal(t.calls.filter((c) => c.job === 'arbitrate').length, 0, 'no arbiter: nobody failed')
		assert.equal(t.store.list().length, 2, 'no fix item')
		assert.deepEqual(['plan', 'test-plan', 'implement'].map((j) => t.of('execute', j as Job, 2).length), [2, 2, 2], 'planned again, and both makers worked from the new plan')
		const replan = JSON.parse(t.of('execute', 'plan', 2)[1]!.prompt)
		assert.match(replan.pickingUp, /no longer apply[\s\S]*Plan again from the branch as it is now/, 'the planner is told why it plans again')
		assert.equal(b.base?.commit, a.shipped?.main, 'the item started again from the branch the first ship left')
		assertNoTrace(t, 1)
		assertNoTrace(t, 2)
	} finally {
		t.cleanup()
	}
})

test('an item ideated before a sibling ships is planned on the branch the ship left, so its change applies with no replan', async () => {
	const plan = (id: string) => ({ ...PLAN, scope: ['src/app.sh'], follows: [], doneWhen: [{ id: 'D1', text: `app prints ${id}` }] })
	const check = (req: WorkerRequest, word: string) => (write(req, `checks/${word}.check.sh`, `sh src/app.sh | grep -qx ${word}\n`), { checks: [{ id: 'C1', doneWhen: 'D1', run: `sh checks/${word}.check.sh` }] })
	const t = setup((req) => {
		const word = req.item === 1 ? 'one' : 'two'
		if (req.kind === 'execute' && req.job === 'plan') return plan(word)
		if (req.kind === 'execute' && req.job === 'test-plan') return check(req, word)
		if (req.kind === 'execute' && req.job === 'implement') return (write(req, 'src/app.sh', `${readFileSync(join(req.cwd, 'src/app.sh'), 'utf8')}echo ${word}\n`), { summary: word })
		// The second item's idea is challenged while the first ships.
		if (req.item === 2 && req.kind === 'execute' && req.job === 'challenge') {
			return (async () => {
				while (!t.store.get(1)?.shipped) await new Promise((r) => setTimeout(r, 10))
				return undefined
			})()
		}
		return undefined
	})
	try {
		const second = t.create('Second')
		const [a, b] = await t.run(Effect.all([drive(t.item.id, config), drive(second.id, config)], { concurrency: 2 }))
		assert.deepEqual([a.status, b.status], ['shipped', 'shipped'])
		assert.equal(git(t.repo, 'show', 'main:src/app.sh'), 'echo app\necho one\necho two', 'both changes are on main')
		assert.equal(t.store.events(2).filter((e) => e.kind === 'rebased').length, 0, 'no stale plan to throw away')
		assert.equal(t.of('execute', 'plan', 2).length, 1)
		assert.equal(b.base?.commit, a.shipped?.main, 'planned on the branch the first ship left')
	} finally {
		t.cleanup()
	}
})

test('mw run drives no more items at once than the prescriptions allow', async () => {
	const t = setup((req) => {
		if (req.item === 2 && req.kind === 'execute' && req.job === 'plan') return { ...PLAN, scope: ['src/other.sh'], follows: [{ path: 'src/other.sh', follows: 'src/app.sh' }] }
		if (req.item === 2 && req.kind === 'execute' && req.job === 'implement') return (write(req, 'src/other.sh', 'echo b\n'), { summary: 'other' })
		if (req.item === 2 && req.kind === 'execute' && req.job === 'test-plan') return (write(req, 'checks/other.check.sh', '[ "$(sh src/other.sh)" = b ]\n'), { checks: [{ id: 'C1', doneWhen: 'D1', run: 'sh checks/other.check.sh' }] })
		return undefined
	})
	try {
		t.create('Second')
		const { items } = await t.run(runQueue({ prescriptions: { ...prescriptions, parallel: 1 } }))
		assert.deepEqual(items.map((i) => [i.id, i.status]), [[1, 'shipped'], [2, 'shipped']])
		const order = t.calls.map((c) => c.item)
		assert.deepEqual(order, [...order].sort(), 'item 2 makes no call until item 1 is done')
	} finally {
		t.cleanup()
	}
})

test('a ship that lands between another item\'s check run and its merge sends that item\'s checks round again', async () => {
	const t = setup((req) => {
		// Item 1's checks wait until item 2 has shipped; item 2 waits for item 1's checks to start.
		if (req.item === 1 && req.kind === 'execute' && req.job === 'test-plan') return checks(req, `[ -f ${t.tmp}/first-round ] || { touch ${t.tmp}/first-round; while [ ! -s ${t.tmp}/shipped.log ]; do sleep 0.02; done; }; ${CHECK}`)
		if (req.item === 2 && req.kind === 'intake' && req.job === 'ideate') {
			return (async () => {
				while (!existsSync(join(t.tmp, 'first-round'))) await new Promise((r) => setTimeout(r, 10))
				return clear
			})()
		}
		if (req.item === 2 && req.kind === 'execute' && req.job === 'plan') return { ...PLAN, scope: ['src/other.sh'], follows: [{ path: 'src/other.sh', follows: 'src/app.sh' }] }
		if (req.item === 2 && req.kind === 'execute' && req.job === 'implement') return (write(req, 'src/other.sh', 'echo b\n'), { summary: 'other' })
		if (req.item === 2 && req.kind === 'execute' && req.job === 'test-plan') return (write(req, 'checks/other.check.sh', '[ "$(sh src/other.sh)" = b ]\n'), { checks: [{ id: 'C1', doneWhen: 'D1', run: 'sh checks/other.check.sh' }] })
		return undefined
	})
	try {
		const second = t.create('Second')
		const [a, b] = await t.run(Effect.all([drive(t.item.id, config), drive(second.id, config)], { concurrency: 2 }))
		assert.deepEqual([a.status, b.status], ['shipped', 'shipped'])
		assert.equal(t.store.events(1).filter((e) => e.kind === 'main-moved').length, 1)
		assert.equal(t.store.events(1).filter((e) => e.kind === 'verified').length, 2)
		assert.equal(a.verification?.on, b.shipped?.main)
		assert.deepEqual(t.shipped().map((l) => l.split(' ')[0]), ['2', '1'])
	} finally {
		t.cleanup()
	}
})

test('a receiver\'s questions go to whoever handed the work over; in the split each maker asks the planner on its own track', async () => {
	const t = setup((req, n) => {
		if (req.kind === 'intake' && req.job === 'ideate' && n === 1) return ask('Which report?')
		if (req.kind === 'originator' && req.job === 'ideate') return reply('The monthly sales report.')
		// The fourth question waits for the other maker to finish, so its track is seen to run on its own.
		if (req.kind === 'intake' && req.job === 'implement' && n === 4) return (async () => {
			while (!t.store.get(1)?.split?.['test-plan']?.done) await new Promise((r) => setTimeout(r, 10))
			return ask('Question 4?')
		})()
		if (req.kind === 'intake' && req.job === 'implement' && n < 4) return ask(`Question ${n}?`)
		if (req.kind === 'intake' && req.job === 'test-plan' && n === 1) return { ...clear, ambiguous: ['Is an empty export an error?'] }
		if (req.kind === 'originator' && req.job === 'test-plan') return reply('No: it prints an empty line.')
		return undefined
	}, 'checkpoints')
	try {
		let item = await t.run(drive(t.item.id, config))
		assert.equal(item.hold?.code, 'nq_turns')
		assert.equal(item.hold?.context.job, 'implement')
		assert.deepEqual(item.hold?.context.questions, ['Question 4?'])
		assert.equal(item.split?.['test-plan']?.done, true, 'the other maker\'s track finished on its own')
		assert.deepEqual(t.calls.filter((c) => c.kind === 'originator').map((c) => `${c.job} ${c.profile}`).sort(), ['ideate dispatcher', 'implement planner', 'implement planner', 'implement planner', 'test-plan planner'])
		assert.deepEqual(JSON.parse(t.of('originator', 'test-plan')[0]!.prompt).questions, ['Is an empty export an error?'])
		assert.deepEqual(t.packet('execute', 'test-plan').exchange.turns, [{ understanding: 'I see the job', questions: ['Is an empty export an error?'], answer: 'No: it prints an empty line.', by: 'originator' }])

		await t.run(answer(item.id, 'Only CSV; nothing else.'))
		item = await t.run(drive(item.id, config))
		assert.equal(item.status, 'paused', 'at checkpoints, the verified change waits for the operator before it ships')
		await t.run(go(item.id))
		item = await t.run(drive(item.id, config))
		assert.equal(item.status, 'shipped')
		// Three turns were spent: the operator's answer corrects the hand-off, and a new exchange starts from turn one.
		const corrected = t.packet('execute', 'implement').exchange
		assert.deepEqual(corrected.turns, [], 'no fourth turn')
		assert.match(corrected.handoff, /operator's correction[\s\S]*- Question 4\?[\s\S]*Only CSV; nothing else\.$/)
		assert.equal(t.of('execute', 'test-plan').length, 1, 'the finished track is not redone')
	} finally {
		t.cleanup()
	}
})

test('the same question carried across hand-offs counts once: raised a fourth time in any wording of case or punctuation, it holds', async () => {
	const wordings: Partial<Record<Job, string>> = { ideate: 'Is an empty export an error?', challenge: 'is an empty export an error', plan: 'Is an empty export an ERROR?!', implement: 'Is an empty export, an error?' }
	const t = setup((req, n) => (req.kind === 'intake' && n === 1 && wordings[req.job] ? ask(wordings[req.job]!) : undefined), 'checkpoints')
	try {
		const item = await t.run(drive(t.item.id, config))
		assert.equal(item.hold?.code, 'nq_turns')
		assert.equal(item.hold?.context.job, 'implement')
		assert.deepEqual(item.hold?.context.repeated, ['Is an empty export, an error?'])
		assert.match(item.hold!.message, /asks again what was already asked 3 times across hand-offs/)
	} finally {
		t.cleanup()
	}
})

test('an originator that says only the operator can decide goes to the dispatcher, who answers from the operator\'s source; only what the source leaves open holds', async () => {
	const asks = (dispatcher: ReturnType<typeof reply>) => setup((req, n) => {
		if (req.kind === 'intake' && req.job === 'challenge' && n === 1) return ask('May we drop PDF export?')
		if (req.kind === 'originator' && req.job === 'challenge') return req.profile === 'dispatcher' ? dispatcher : reply('Dropping a format is the operator\'s call.', true)
		return undefined
	})
	const settled = asks(reply('The source asks for CSV export only, so PDF is not part of it.'))
	try {
		const item = await settled.run(drive(settled.item.id, config))
		assert.equal(item.status, 'shipped', 'the source settled it, so nothing waited on the operator')
		const sent = JSON.parse(settled.calls.find((c) => c.profile === 'dispatcher')!.prompt)
		assert.deepEqual([sent.questions, sent.originator.says, sent.item.source], [['May we drop PDF export?'], 'Dropping a format is the operator\'s call.', settled.item.source], 'the dispatcher reads the question, the originator\'s claim and the operator\'s source')
		assert.deepEqual(settled.packet('execute', 'challenge').exchange.turns.map((t: { answer: string }) => t.answer), ['The source asks for CSV export only, so PDF is not part of it.'])
	} finally {
		settled.cleanup()
	}
	const open = asks(reply('The source does not say, and dropping a shipped format is irreversible for its users.', true))
	try {
		const item = await open.run(drive(open.item.id, config))
		assert.equal(item.hold?.code, 'authority')
		assert.deepEqual([item.hold?.context.questions, item.hold?.context.originator, item.hold?.context.dispatcherSays], [['May we drop PDF export?'], 'ideator', 'The source does not say, and dropping a shipped format is irreversible for its users.'])
	} finally {
		open.cleanup()
	}
})

test('a usage limit mid-job hands the job and its unfinished work to an agent on another account; when every account is out the item waits and continues', async () => {
	const t0 = Date.now()
	let carried = false
	const t = setup((req, n) => {
		if (req.kind !== 'execute' || req.job !== 'implement') return undefined
		if (n === 1) return (write(req, 'src/export.sh', 'echo a\n'), { ok: false, limit: { account: 'anthropic', resetsAt: null, message: 'You\'ve hit your limit' } })
		if (n === 2) return { ok: false, limit: { account: 'openai', resetsAt: t0 + 10 * 60_000, message: 'usage limit reached' } }
		carried = readFileSync(join(req.cwd, 'src/export.sh'), 'utf8') === 'echo a\n'
		return implement(req)
	})
	const single: Prescriptions = { ...prescriptions, tiers: { deep: [OPUS, ASTRA], coding: [SONNET, card('codex', 'openai', 'sol')] } }
	try {
		const done = await t.run(Effect.gen(function* () {
			yield* TestClock.setTime(t0)
			const fiber = yield* Effect.forkChild(drive(t.item.id, { prescriptions: single }))
			while (t.store.get(t.item.id)!.status !== 'waiting-quota') yield* Effect.promise(() => new Promise((r) => setTimeout(r, 5)))
			assert.equal(t.store.get(t.item.id)!.resetsAt, t0 + 10 * 60_000, 'waits for openai (10 min), not anthropic (unknown reset → 1 h)')
			yield* TestClock.adjust('10 minutes')
			return yield* Fiber.join(fiber)
		}).pipe(Effect.provide(TestClock.layer())))
		assert.equal(done.status, 'shipped')
		assert.deepEqual(t.calls.filter((c) => c.job === 'implement').map((c) => `${c.kind} ${c.card.account}`), ['intake anthropic', 'execute anthropic', 'intake openai', 'execute openai', 'intake openai', 'execute openai'])
		assert.match(t.packet('execute', 'implement', 1).pickingUp, /usage limit[\s\S]*your checkout holds the work/)
		assert.ok(carried, 'the unfinished work moved to the next card\'s checkout')
		assert.equal(t.store.events(t.item.id).filter((e) => e.kind === 'nq-replacement').length, 2)
	} finally {
		t.cleanup()
	}
})

test('a pre-existing defect becomes its own item from planning; the original waits, then runs its checks again and ships', async () => {
	const t = setup((req) => {
		if (req.item === 1 && req.kind === 'execute' && req.job === 'test-plan') return checks(req, `[ -f src/fixed.sh ] && ${CHECK}`)
		if (req.item === 1 && req.kind === 'execute' && req.job === 'arbitrate') return ruling('pre-existing')
		if (req.item === 2 && req.kind === 'execute' && req.job === 'plan') return { ...PLAN, scope: ['src/fixed.sh'], follows: [{ path: 'src/fixed.sh', follows: 'src/app.sh' }] }
		if (req.item === 2 && req.kind === 'execute' && req.job === 'implement') return (write(req, 'src/fixed.sh', 'true\n'), { summary: 'fixed' })
		if (req.item === 2 && req.kind === 'execute' && req.job === 'test-plan') return (write(req, 'checks/fixed.sh', '[ -f src/fixed.sh ]\n'), { checks: [{ id: 'C1', doneWhen: 'D1', run: 'sh checks/fixed.sh' }] })
		return undefined
	})
	try {
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		const pre = t.store.list().find((i) => i.parent === t.item.id)!
		assert.equal(pre.status, 'shipped')
		assert.equal(JSON.parse(t.of('intake', 'plan', pre.id)[0]!.prompt).handoff.from, 'arbiter')
		assert.equal(t.store.events(t.item.id).filter((e) => e.kind === 'verified').length, 1)
		assert.equal(done.verification?.on, pre.shipped?.main, 'the original\'s checks ran again on the main that holds the fix')
		assert.deepEqual(t.shipped().map((l) => l.split(' ')[0]), [String(pre.id), String(t.item.id)])
	} finally {
		t.cleanup()
	}
})

test('a pre-existing defect found inside a fix that is already two prerequisites deep holds for the operator', async () => {
	const t = setup((req) => {
		if (req.kind === 'execute' && req.job === 'test-plan') return checks(req, 'exit 1')
		if (req.kind === 'execute' && req.job === 'arbitrate') return ruling('pre-existing')
		return undefined
	})
	try {
		await t.run(drive(t.item.id, config))
		const [, first, second] = t.store.list()
		assert.deepEqual([first!.parent, second!.parent, t.store.list().length], [t.item.id, first!.id, 3], 'two fixes deep, and no third')
		assert.equal(second!.hold?.code, 'prerequisite_too_deep')
		assert.deepEqual(nextFor(second!).map((n) => n.run.split(' ').slice(0, 5).join(' ')), [`mw answer ${second!.id} --cause implementation`, `mw answer ${second!.id} --cause test`, `mw answer ${second!.id} --cause pre-existing`])
	} finally {
		t.cleanup()
	}
})

test('dropping a prerequisite fix releases the item waiting on it: its checks run again on the branch as it is now', async () => {
	const t = setup((req, n) => {
		if (req.item === 1 && req.kind === 'execute' && req.job === 'test-plan') return checks(req, `[ -f ${t.tmp}/settled ] && ${CHECK}`)
		if (req.item === 1 && req.kind === 'execute' && req.job === 'arbitrate' && n === 1) return ruling('pre-existing')
		if (req.item === 2 && req.kind === 'intake') return ask('Is this really a defect?')
		return undefined
	})
	try {
		let item = await t.run(drive(t.item.id, config))
		assert.equal(item.status, 'waiting-prerequisite')
		assert.equal(t.store.get(2)?.hold?.code, 'nq_turns')
		await t.run(drop(2))
		writeFileSync(join(t.tmp, 'settled'), '')
		const { items } = await t.run(runQueue(config))
		item = items.find((i) => i.id === t.item.id)!
		assert.equal(item.status, 'shipped', 'mw run picks the item up: it no longer waits on a fix that will never ship')
		assert.deepEqual(t.store.events(t.item.id).filter((e) => e.kind === 'prerequisite-dropped').map((e) => e.data.prerequisite), [2])
	} finally {
		t.cleanup()
	}
})

test('holds stop only that item, name their next commands, and release on an answer or retry; over-budget evidence reaches the hold', async () => {
	const over = { exceeded: 'minutes' as const, budget: { minutes: 1 }, ms: 61_000, tokens: null }
	let failImplement = 4
	const t = setup((req) => {
		if (req.kind === 'execute' && req.job === 'implement' && failImplement-- > 0) return { ok: false, error: 'claude went over its budget', overBudget: over }
		if (req.kind === 'execute' && req.job === 'test-plan') return checks(req, 'exit 1')
		if (req.kind === 'execute' && req.job === 'arbitrate') return ruling('undetermined')
		return undefined
	}, 'checkpoints')
	try {
		let item = await t.run(drive(t.item.id, config))
		assert.equal(item.hold?.code, 'nq_turns', 'each failed call was a question to the planner; the fourth holds')
		assert.equal(item.hold?.context.job, 'implement')
		assert.deepEqual(item.hold?.context.overBudget, over)
		assert.equal(t.of('originator', 'implement').length, 3)
		assert.equal(nextFor(item)[0]!.run, `mw answer ${item.id} "<your answer to context.questions>"`)

		await t.run(answer(item.id, 'The budget is fine; finish the change.'))
		item = await t.run(drive(item.id, config))
		assert.equal(item.hold?.code, 'arbiter_undetermined')
		assert.equal(nextFor(item).length, 3)
		assert.equal((await t.run(Effect.flip(retry(item.id)))).code, 'answer_required')
		assert.equal((await t.run(Effect.flip(answer(item.id, 'no cause given')))).code, 'cause_required')
		assert.deepEqual(t.shipped(), [])
	} finally {
		t.cleanup()
	}
})

test('the project\'s gates run on the change\'s own files before the checks: a formatter\'s fix ships, a failing gate goes to the arbiter and the dispatcher answers for it', async () => {
	const t = setup((req, n) => {
		if (req.item === 2 && req.kind === 'execute' && req.job === 'implement') return implement(req, 'echo a,b # bad')
		if (req.item === 2 && req.kind === 'intake' && req.job === 'arbitrate' && n === 1) return ask('Who wrote this gate?')
		if (req.item === 2 && req.kind === 'execute' && req.job === 'arbitrate') return ruling('undetermined')
		return undefined
	}, 'checkpoints')
	try {
		const log = join(t.tmp, 'gates.log')
		writeFileSync(join(t.home, 'projects.json'), JSON.stringify([{
			path: t.repo, ship: `echo "$MW_ITEM $MW_COMMIT" >> ${t.tmp}/shipped.log`,
			gates: [
				{ run: `echo "format {files}" >> ${log}; for f in {files}; do { echo '# formatted'; cat "$f"; } > "$f.tmp" && mv "$f.tmp" "$f"; done`, glob: '*.sh' },
				{ run: `echo css >> ${log}`, glob: '*.css' },
				{ run: `echo "lint {files}" >> ${log}; if grep -q bad {files}; then echo "lint: bad in {files}"; exit 1; fi` },
			],
		}]))
		assert.equal((await t.run(drive(t.item.id, config))).status, 'paused')
		await t.run(go(t.item.id))
		const first = await t.run(drive(t.item.id, config))
		assert.equal(first.status, 'shipped')
		assert.equal(git(t.repo, 'show', 'main:src/export.sh'), '# formatted\necho a,b', 'the formatter\'s fix ships with the change')
		assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n'), ['format src/export.sh', 'lint src/export.sh'], 'a gate whose glob matches nothing never runs, and no gate sees the check files')
		assert.deepEqual(first.verification?.results.map((r) => r.id), ['G1', 'G3', 'C1'])
		assert.deepEqual(t.store.events(t.item.id).find((e) => e.kind === 'verified')?.data.fixed, ['src/export.sh'])

		const second = t.create('Second')
		const main = git(t.repo, 'rev-parse', 'main')
		const held = await t.run(drive(second.id, config))
		assert.equal(held.hold?.code, 'arbiter_undetermined')
		assert.equal(git(t.repo, 'rev-parse', 'main'), main, 'a failing gate keeps the change off main')
		const arbiter = JSON.parse(t.of('execute', 'arbitrate', second.id)[0]!.prompt)
		assert.match(arbiter.exchange.handoff, /^1 of 3 gates and checks failed[\s\S]*The project's gate G3 exited 1[\s\S]*lint: bad in src\/export\.sh/)
		assert.deepEqual(t.of('originator', 'arbitrate', second.id).map((c) => c.profile), ['dispatcher'], 'the gates are the operator\'s: the dispatcher answers for them, not the test architect')
	} finally {
		t.cleanup()
	}
})

test('the project\'s prepare command stocks every worktree an agent or the checks work in, before the job; what it provisions is torn down once; a failing prepare holds before the job runs', async () => {
	let seen = ''
	const t = setup((req) => {
		if (req.item === 1 && req.kind === 'execute' && req.job === 'implement') return (seen = readFileSync(join(req.cwd, '.env.local'), 'utf8'), implement(req))
		if (req.item === 1 && req.kind === 'execute' && req.job === 'test-plan') return checks(req, `grep -q 'db=item-1-verify' .env.local && ${CHECK}`)
		return undefined
	})
	try {
		writeFileSync(join(t.repo, '.gitignore'), '.env.local\n')
		git(t.repo, 'add', '.')
		git(t.repo, 'commit', '-qm', 'ignore env')
		const [prepared, torn] = [join(t.tmp, 'prepared.log'), join(t.tmp, 'torn.log')]
		const project = (prepare: string) => writeFileSync(join(t.home, 'projects.json'), JSON.stringify([{ path: t.repo, ship: `echo "$MW_ITEM $MW_COMMIT" >> ${t.tmp}/shipped.log`, prepare }]))
		project(`echo "$MW_NAME $MW_JOB" >> ${prepared}; echo "db=$MW_NAME" > .env.local; printf '{"provisioned": [{"kind": "database-branch", "id": "%s", "teardown": "echo %s >> ${torn}"}]}\\n' "$MW_NAME" "$MW_NAME"`)
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		assert.equal(seen, 'db=item-1-implement-execute\n', 'the implementer\'s worktree was stocked for it alone')
		const names = readFileSync(prepared, 'utf8').trim().split('\n')
		assert.ok(names.includes('item-1-verify verify'), 'the checks ran in a prepared worktree')
		assert.ok(!names.some((n) => n.includes('intake')), 'intake never sees a worktree, so it gets nothing prepared')
		assert.deepEqual(readFileSync(torn, 'utf8').trim().split('\n').sort(), [...new Set(names.map((n) => n.split(' ')[0]))].sort(), 'everything prepare stood up came down, each once')
		assertNoTrace(t)

		project('echo "no database login" >&2; exit 3')
		const second = t.create('Second')
		const held = await t.run(drive(second.id, config))
		assert.deepEqual([held.hold?.code, held.hold?.context.job, held.hold?.context.exitCode], ['prepare_failed', 'ideate', 3])
		assert.match(String(held.hold?.context.stderr), /no database login/)
		assert.deepEqual(t.calls.filter((c) => c.item === second.id).map((c) => c.kind), ['intake'], 'no job runs in an unprepared worktree')
	} finally {
		t.cleanup()
	}
})

test('without a ship command, shipping pushes main to its upstream, or is done once the change is on main; the commit says why', async () => {
	const t = setup()
	try {
		writeFileSync(join(t.home, 'projects.json'), JSON.stringify([{ path: t.repo }]))
		execFileSync('git', ['init', '-q', '--bare', '-b', 'main', join(t.tmp, 'up.git')])
		git(t.repo, 'remote', 'add', 'origin', join(t.tmp, 'up.git'))
		git(t.repo, 'push', '-q', '-u', 'origin', 'main')
		const item = await t.run(drive(t.item.id, config))
		assert.equal(item.status, 'shipped')
		assert.equal(item.shipped?.command, `git push origin refs/heads/main:refs/heads/main`)
		assert.equal(git(join(t.tmp, 'up.git'), 'rev-parse', 'main'), git(t.repo, 'rev-parse', 'main'), 'main reached its upstream')
		const message = git(t.repo, 'log', '-1', '--format=%B', 'main')
		assert.equal(message.split('\n')[0], 'Add CSV export')
		for (const part of ['Users can export a report as CSV', 'Done when:\n- sh src/export.sh prints a,b', '- Format? CSV (the operator asked for it)', '- Which separator? Comma (every spreadsheet opens it)']) assert.ok(message.includes(part), `the commit carries: ${part}\n${message}`)
		assert.doesNotMatch(message, /Made Well|Amp|agent/i, 'nothing in it names who did the work')
	} finally {
		t.cleanup()
	}
	const bare = setup()
	try {
		writeFileSync(join(bare.home, 'projects.json'), JSON.stringify([{ path: bare.repo }]))
		const item = await bare.run(drive(bare.item.id, config))
		assert.equal(item.status, 'shipped', 'no upstream: on main is shipped')
		assert.equal(item.shipped?.command, '')
		assert.equal(git(bare.repo, 'show', 'main:src/export.sh'), 'echo a,b')
	} finally {
		bare.cleanup()
	}
})

test('discovery turns raw input into candidates that wait for promotion; each promoted item is handed over by discovery and ships', async () => {
	const items = [
		{ title: 'Plant list with photos', kind: 'feature', objective: 'Upload a photo per plant', text: 'Each plant has a photo and a name.' },
		{ title: 'Watering schedule', kind: 'feature', objective: 'Set a schedule per plant', text: 'Days of the week per plant.' },
		{ title: 'Untitled' },
	]
	const t = setup((req) => (req.kind === 'execute' && req.job === 'discover' ? { items } : undefined))
	try {
		const run = t.store.create({ title: 'Discovery', objective: 'Turn the raw input into candidate work items.', source: 'raw notes: plants, photos, watering', workspace: t.repo, job: 'discover', autonomy: 'checkpoints' })
		const found = await t.run(drive(run.id, config))
		assert.equal(found.status, 'discovered')
		const candidates = t.store.list().filter((i) => i.discovery === run.id)
		assert.deepEqual(candidates.map((c) => [c.title, c.status]), [['Plant list with photos', 'candidate'], ['Watering schedule', 'candidate']], 'an item without an objective is not a candidate')
		const intake = JSON.parse(t.of('intake', 'discover', run.id)[0]!.prompt)
		assert.equal(intake.handoff.from, 'dispatcher')
		assert.equal(intake.you.where, 'Made Well\'s discovery (discovery)')

		assert.equal((await t.run(Effect.flip(promote(run.id, [999])))).code, 'not_a_candidate')
		await t.run(promote(run.id, [candidates[1]!.id]))
		assert.deepEqual(t.store.list().filter((i) => i.discovery === run.id).map((c) => c.status), ['candidate', 'queued'])

		assert.equal((await t.run(drive(candidates[1]!.id, config))).status, 'paused', 'a candidate inherits its discovery\'s checkpoints')
		await t.run(go(candidates[1]!.id))
		const shipped = await t.run(drive(candidates[1]!.id, config))
		assert.equal(shipped.status, 'shipped')
		const first = JSON.parse(t.of('intake', 'ideate', candidates[1]!.id)[0]!.prompt)
		assert.equal(first.handoff.from, 'ideator')
		assert.equal(first.received.discover.title, 'Watering schedule')
		assert.equal(first.handoff.content, 'The ideator\'s deliverable, under received.discover.')
	} finally {
		t.cleanup()
	}
})

test('a cartridge pack replaces the software lane: discovery runs two cartridges, delivery runs its own thinking step, testing unplugged, and the item ships', async () => {
	const pack: Pack = {
		name: 'writing',
		brief: 'The work is writing in a repository of plain files.',
		discovery: [
			{ cartridge: 'sorting', steps: [{ job: 'sort', profile: 'editor', duty: 'Group the raw notes into themes. Do not write.', output: { type: 'object', properties: { themes: { type: 'array', items: { type: 'string' } } }, required: ['themes'] } }] },
			{ cartridge: 'discovery', steps: [{ job: 'discover' }] },
		],
		delivery: [
			{ cartridge: 'research', steps: [{ job: 'research', profile: 'researcher', duty: 'Find what the piece must say. Do not write it.', output: { type: 'object', properties: { findings: { type: 'array', items: { type: 'string' } } }, required: ['findings'] } }] },
			{ cartridge: 'planning', steps: [{ job: 'plan' }] },
			{ cartridge: 'making', steps: [{ job: 'implement' }] },
			{ cartridge: 'verification', steps: [{ job: 'verify' }] },
		],
	}
	assert.deepEqual(problemsOf(pack), [], 'the pack plugs in')
	const t = setup((req, n) => {
		if (req.kind === 'execute' && req.job === 'sort') return { themes: ['export'] }
		if (req.kind === 'execute' && req.job === 'discover') return { items: [{ title: 'CSV export', kind: 'feature', objective: 'Users can export a report as CSV', text: 'a,b' }] }
		// The first answer misses its required field: Made Well re-asks for the corrected JSON, no NQ turn.
		if (req.kind === 'execute' && req.job === 'research') return n === 1 ? { notes: 'forgot the shape' } : undefined
		if (req.kind === 'repair' && req.job === 'research') return { findings: ['a,b is the whole format'] }
		return undefined
	})
	try {
		const run = t.store.create({ title: 'Discovery', objective: 'Turn the raw input into candidate work items.', source: 'notes: export as csv', workspace: t.repo, job: 'sort', pack })
		assert.equal((await t.run(drive(run.id, config))).status, 'discovered')
		assert.deepEqual(t.calls.filter((c) => c.item === run.id).map((c) => `${c.kind} ${c.job}`), ['intake sort', 'execute sort', 'intake discover', 'execute discover'])
		assert.deepEqual(JSON.parse(t.of('execute', 'discover', run.id)[0]!.prompt).received, { sort: { themes: ['export'] } }, 'discover receives the earlier cartridge\'s deliverable')
		const [candidate] = t.store.list().filter((i) => i.discovery === run.id)
		assert.equal(candidate!.job, 'research', 'a candidate starts at its pack\'s first delivery step')

		await t.run(promote(run.id))
		const done = await t.run(drive(candidate!.id, config))
		assert.equal(done.status, 'shipped')
		const mine = t.calls.filter((c) => c.item === candidate!.id)
		assert.deepEqual([...new Set(mine.map((c) => c.job))], ['research', 'plan', 'implement'], 'no ideate, challenge or test-plan: the pack has none')
		const research = JSON.parse(t.of('execute', 'research', candidate!.id)[0]!.prompt)
		assert.deepEqual(research.you.replyFormat, pack.delivery[0]!.steps[0]!.output, 'a thinking step answers in its cartridge\'s own shape')
		assert.equal(research.you.where, 'Made Well\'s delivery lane (research)')
		assert.ok(mine.every((c) => c.system.includes('The work is writing in a repository of plain files.')), 'the pack\'s brief reaches every call')
		assert.deepEqual(Object.keys(JSON.parse(t.of('execute', 'plan', candidate!.id)[0]!.prompt).received), ['discover', 'research'])
		assert.equal(t.store.events(candidate!.id).filter((e) => e.kind === 'repaired').length, 1, 'the malformed research answer was re-asked once')
		assert.deepEqual(done.verification?.results, [], 'with testing unplugged, verification runs only the project\'s gates, and there are none')
		assert.equal(t.shipped().length, 1)
	} finally {
		t.cleanup()
	}
})

test('a pack that breaks the console\'s contract is refused with every problem named', () => {
	const bad: Pack = {
		name: 'broken',
		discovery: [{ cartridge: 'discovery', steps: [{ job: 'sort', profile: 'editor', duty: 'Sort.' }] }],
		delivery: [
			{ cartridge: 'making', steps: [{ job: 'implement' }] },
			{ cartridge: 'planning', steps: [{ job: 'plan', output: { type: 'object' } }, { job: 'review', profile: 'reviewer', duty: 'Review.', output: { type: 'object' }, receives: ['later'] }] },
		],
	}
	assert.deepEqual(problemsOf(bad), [
		'discovery step sort: a thinking step needs an "output" JSON Schema of {"type": "object", ...}.',
		'delivery step plan: a slot\'s deliverable is the console\'s own contract; remove "output".',
		'delivery step review: it receives "later", which is not an earlier step of delivery or "discover".',
		'discovery: its last step is "discover", which returns the candidates.',
		'delivery: its last step is "verify", Made Well\'s run of the checks, merge and ship.',
	])
	assert.deepEqual(problemsOf(SOFTWARE), [], 'the default pack plugs in')
})

test('full autonomy runs A to Z: discovery sends every candidate into delivery, and a question out of turns is decided by the delegating agent by the rubric', async () => {
	const decided = 'Use commas; a header row is not part of it.'
	const t = setup((req) => {
		if (req.kind === 'execute' && req.job === 'discover') return { items: [{ title: 'CSV export', kind: 'feature', objective: 'Users can export a report as CSV', text: 'a,b' }] }
		// The implementer asks until the planner's rubric decision reaches its hand-off.
		if (req.kind === 'intake' && req.job === 'implement') return req.prompt.includes(decided) ? undefined : ask('Header row or not?')
		if (req.kind === 'originator' && req.job === 'implement') return req.prompt.includes('nobody else will answer') ? reply(decided) : reply('See the plan.')
		return undefined
	})
	try {
		const run = t.store.create({ title: 'Discovery', objective: 'Turn the raw input into candidate work items.', source: 'notes: csv export', workspace: t.repo, job: 'discover' })
		await t.run(drive(run.id, config))
		const [candidate] = t.store.list().filter((i) => i.discovery === run.id)
		assert.equal(candidate!.status, 'queued', 'no promotion step: the candidate goes straight into delivery')
		assert.equal(t.store.events(run.id).find((e) => e.kind === 'discovered')?.data.promoted, true)

		const done = await t.run(drive(candidate!.id, config))
		assert.equal(done.status, 'shipped', 'nothing waited on the operator')
		const kinds = t.store.events(candidate!.id).map((e) => e.kind)
		assert.ok(kinds.includes('nq-deciding') && kinds.includes('nq-decided') && !kinds.includes('held'))
		const deciding = JSON.parse(t.of('originator', 'implement', candidate!.id).at(-1)!.prompt)
		assert.match(deciding.you.task, /full autonomy[\s\S]*a choice that satisfies two of the three is the answer/)
		assert.match(JSON.parse(t.of('execute', 'implement', candidate!.id)[0]!.prompt).exchange.handoff, /decided these by the rubric[\s\S]*- Header row or not\?[\s\S]*Use commas; a header row is not part of it\.$/)
		const arbiterShape = deliverableShape(laneOf(), 'arbitrate', true) as { properties: { cause: { enum: string[] } } }
		assert.deepEqual(arbiterShape.properties.cause.enum, ['pre-existing', 'implementation', 'test', 'environment'], 'in full autonomy the arbiter must name a cause')
	} finally {
		t.cleanup()
	}
})

test('every step: the item stops between cartridges and before it ships; the operator goes on or steers, and the next step hears the steer', async () => {
	const t = setup(() => undefined, 'steps')
	try {
		const stops: string[] = []
		let item = await t.run(drive(t.item.id, config))
		while (item.status === 'paused') {
			stops.push(`${item.hold!.context.after} → ${item.hold!.context.next}`)
			assert.deepEqual(nextFor(item).map((n) => n.run.split(' ').slice(0, 2).join(' ')), ['mw go', 'mw answer', 'mw drop'])
			if (item.job === 'plan' && !t.store.events(item.id).some((e) => e.kind === 'steered')) await t.run(answer(item.id, 'Keep the script under ten lines.'))
			else await t.run(go(item.id))
			item = await t.run(drive(item.id, config))
		}
		assert.equal(item.status, 'shipped')
		assert.deepEqual(stops, ['ideation → plan', 'planning → implement', 'implementation → verify', 'verification → ship'])
		assert.match(JSON.parse(t.of('intake', 'plan')[0]!.prompt).handoff.content, /The operator's word at the checkpoint before this step: Keep the script under ten lines\.$/)
		await t.run(go(item.id))
		assert.equal(t.store.events(item.id).filter((e) => e.kind === 'go').length, 3, 'a repeated go changes nothing')
		assert.equal((await t.run(Effect.flip(go(t.create('Other').id)))).code, 'not_held', 'an item that never stopped has no checkpoint to pass')
	} finally {
		t.cleanup()
	}
})
