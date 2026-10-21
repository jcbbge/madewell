import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { Effect, Fiber, Layer } from 'effect'
import { TestClock } from 'effect/testing'
import type { Card, Prescriptions } from '../src/cards.ts'
import { answer, BRIEF, drive, nextFor, promote, retry } from '../src/engine.ts'
import { NEUTRAL_HOST } from '../src/harness.ts'
import type { Job } from '../src/lane.ts'
import { openStore, Store } from '../src/store.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'
import { worktreesRoot } from '../src/workspace.ts'

const card = (harness: string, account: string, model: string): Card => ({ harness, provider: account, account, model, effort: 'low' })
const OPUS = card('claude', 'anthropic', 'opus')
const ASTRA = card('codex', 'openai', 'astra')
const SONNET = card('claude', 'anthropic', 'sonnet')
const HAIKU = card('claude', 'anthropic', 'haiku')
const JOBS: Job[] = ['discover', 'ideate', 'challenge', 'plan', 'test-plan', 'implement', 'verify', 'arbitrate']
const prescriptions: Prescriptions = {
	tiers: { deep: [OPUS, ASTRA], coding: [SONNET, card('codex', 'openai', 'sol')], intake: [HAIKU, card('codex', 'openai', 'luna')] },
	jobs: Object.fromEntries(JOBS.map((job) => [job, { tier: job === 'implement' ? 'coding' : 'deep', access: job === 'implement' ? 'make' : job === 'test-plan' ? 'checks' : job === 'arbitrate' ? 'run' : 'read', budget: { minutes: 1 } }])) as Prescriptions['jobs'],
}
const config = { prescriptions }

const PLAN = {
	making: 'A CSV export script', notMaking: ['PDF export'], scope: ['src/export.sh', 'src/app.sh'],
	steps: ['Create src/export.sh printing a,b'], doneWhen: [{ id: 'D1', text: 'sh src/export.sh prints a,b' }],
	decisions: [{ question: 'Which separator?', decision: 'Comma', why: 'every spreadsheet opens it' }], waitsOn: [],
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
function setup(script: Script = () => undefined) {
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
	const create = (title = 'Add CSV export') => store.create({ title, objective: 'Users can export a report as CSV', source: 'operator: please add CSV export', workspace: repo })
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
		assert.ok(BRIEF.includes(NEUTRAL_HOST) && BRIEF.includes('Honor the product repo\'s coding conventions.'))
		for (const q of ['What moves us toward a 10× better experience of developing, understanding, inspecting, and recovering the work?', 'What moves us toward a 10× better experience for the person the resulting system serves?', 'What makes agent execution clearer, more efficient, better grounded, and more reliably bounded?']) assert.ok(BRIEF.includes(q))
		assert.match(t.packet('intake', 'plan').you.task, /What is unclear\? What is ambiguous\? Do I have everything I need to proceed\?/)
		assert.equal(t.packet('intake', 'plan').you.where, 'Made Well\'s delivery lane (planning)')

		// Packets run stable to volatile, and each job receives only what the static table gives it.
		const impl = t.packet('execute', 'implement')
		assert.deepEqual(Object.keys(impl).slice(0, 4), ['item', 'received', 'snapshot', 'you'])
		assert.deepEqual(Object.keys(impl.received), ['plan'])
		assert.deepEqual(impl.snapshot.contents, { 'src/export.sh': null, 'src/app.sh': 'echo app\n' })
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
		assert.deepEqual(recorded.find((c) => c.kind === 'execute' && c.job === 'plan')!.facts?.required, ['making', 'notMaking', 'scope', 'steps', 'doneWhen', 'decisions', 'waitsOn'])
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
		assert.match(arbiter.exchange.handoff, /1 of 1 checks failed[\s\S]*Check C1 \(done-when D1\) exited 1[\s\S]*expected a;b/)
		assert.equal(arbiter.verification.results[0].doneWhen, 'D1')
		assert.equal(seen, 'echo a,b\nAdd CSV exportecho "expected a;b"; exit 1\n', 'the arbiter works on the candidate: the change committed, the checks applied')
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

test('a read call that writes is refused and asked again; an answer off its schema is refused before it counts as a failed launch', async () => {
	const t = setup((req, n) => {
		if (req.kind === 'execute' && req.job === 'plan' && n === 1) return (write(req, 'notes.md', 'my plan'), PLAN)
		if (req.kind === 'execute' && req.job === 'ideate' && n === 1) return 'I think we should export CSV.'
		if (req.kind === 'execute' && req.job === 'test-plan' && n === 1) return (write(req, 'checks/x.sh', 'true'), { checks: [{ id: 'C1', doneWhen: 'D9', run: 'true' }] })
		return undefined
	})
	try {
		const done = await t.run(drive(t.item.id, config))
		assert.equal(done.status, 'shipped')
		const outcomes = (job: Job) => t.store.calls(t.item.id).filter((c) => c.kind === 'execute' && c.job === job).map((c) => c.outcome)
		assert.deepEqual(outcomes('ideate'), ['rejected', 'ok'])
		assert.deepEqual(outcomes('plan'), ['rejected', 'ok'])
		assert.deepEqual(outcomes('test-plan'), ['rejected', 'ok'])
		const plan = t.store.calls(t.item.id).find((c) => c.job === 'plan' && c.outcome === 'rejected')!
		assert.match(plan.error!, /changed its read-only checkout: notes\.md/)
		assert.deepEqual(plan.flags.map((f) => f.rule), ['write-under-read'])
		assert.match(t.packet('execute', 'ideate', 1).yourLastAnswerWasRefused, /did not end with a JSON object/)
		assert.match(t.packet('execute', 'test-plan', 1).yourLastAnswerWasRefused, /D9[\s\S]*without a check: D1/)
		assert.ok(t.store.events(t.item.id).some((e) => e.kind === 'launch-failed' && /D1/.test(String(e.data.error))))
		assertNoTrace(t)
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

test('an implementer that commits to main holds the item before anything ships; one that leaves a file in the product repo holds it too', async () => {
	const t = setup((req) => {
		if (req.kind === 'execute' && req.job === 'implement' && req.item === 1) {
			writeFileSync(join(t.repo, 'early.txt'), 'x')
			git(t.repo, 'add', 'early.txt')
			git(t.repo, 'commit', '-qm', 'implementer committed before verification')
			return implement(req)
		}
		if (req.kind === 'execute' && req.job === 'implement' && req.item === 2) return (writeFileSync(join(t.repo, 'probe.log'), 'x'), implement(req))
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
		assert.match(nextFor(held)[0]!.run, /clean -fdx -- "probe.log"/)
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
		if (req.item === 1 && req.kind === 'execute' && req.job === 'plan') return { ...PLAN, scope: ['src/other.sh'], doneWhen: [{ id: 'D1', text: 'other prints b' }] }
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
		if (req.item === 2 && req.kind === 'execute' && req.job === 'plan') return { ...PLAN, scope: ['src/other.sh'] }
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
	})
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
		assert.equal(item.status, 'shipped')
		assert.deepEqual(t.packet('execute', 'implement').exchange.turns.at(-1), { understanding: 'Mostly clear', questions: ['Question 4?'], answer: 'Only CSV; nothing else.', by: 'operator' })
		assert.equal(t.of('execute', 'test-plan').length, 1, 'the finished track is not redone')
	} finally {
		t.cleanup()
	}
})

test('an originator that says only the operator can decide holds the item for the operator', async () => {
	const t = setup((req) => {
		if (req.kind === 'intake' && req.job === 'challenge') return ask('May we drop PDF export?')
		if (req.kind === 'originator' && req.job === 'challenge') return reply('Dropping a format is the operator\'s call.', true)
		return undefined
	})
	try {
		const item = await t.run(drive(t.item.id, config))
		assert.equal(item.hold?.code, 'authority')
		assert.deepEqual(item.hold?.context.questions, ['May we drop PDF export?'])
		assert.equal(item.hold?.context.originator, 'ideator')
	} finally {
		t.cleanup()
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
	const t = setup((req, n) => {
		if (req.item === 1 && req.kind === 'execute' && req.job === 'test-plan') return checks(req, `[ -f src/fixed.sh ] && ${CHECK}`)
		if (req.item === 1 && req.kind === 'execute' && req.job === 'arbitrate') return ruling('pre-existing')
		if (req.item === 2 && req.kind === 'execute' && req.job === 'plan') return { ...PLAN, scope: ['src/fixed.sh'] }
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

test('holds stop only that item, name their next commands, and release on an answer or retry; over-budget evidence reaches the hold', async () => {
	const over = { exceeded: 'minutes' as const, budget: { minutes: 1 }, ms: 61_000, tokens: null }
	let failImplement = 3
	const t = setup((req) => {
		if (req.kind === 'execute' && req.job === 'implement' && failImplement-- > 0) return { ok: false, error: 'claude went over its budget', overBudget: over }
		if (req.kind === 'execute' && req.job === 'test-plan') return checks(req, 'exit 1')
		if (req.kind === 'execute' && req.job === 'arbitrate') return ruling('undetermined')
		return undefined
	})
	try {
		let item = await t.run(drive(t.item.id, config))
		assert.equal(item.hold?.code, 'worker_failing')
		assert.equal(item.hold?.context.job, 'implement')
		assert.deepEqual(item.hold?.context.overBudget, over)
		assert.deepEqual(nextFor(item).map((n) => n.run), [`mw show ${item.id}`, `mw retry ${item.id}`])

		await t.run(retry(item.id))
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

test('a passing item without a ship command holds before main moves, and ships once one is registered', async () => {
	const t = setup()
	try {
		const start = git(t.repo, 'rev-parse', 'main')
		writeFileSync(join(t.home, 'projects.json'), '[]')
		let item = await t.run(drive(t.item.id, config))
		assert.equal(item.hold?.code, 'no_ship_command')
		assert.match(nextFor(item)[0]!.run, new RegExp(`^mw init --workspace ${t.repo} --ship "<`))
		assert.equal(git(t.repo, 'rev-parse', 'main'), start, 'main does not move until the item can ship')

		writeFileSync(join(t.home, 'projects.json'), JSON.stringify([{ path: t.repo, ship: `echo "$MW_ITEM $MW_COMMIT" >> ${t.tmp}/shipped.log` }]))
		await t.run(retry(item.id))
		item = await t.run(drive(item.id, config))
		assert.equal(item.status, 'shipped')
		assert.equal(t.store.events(item.id).filter((e) => e.kind === 'verified').length, 1, 'the checks passed on this main already: not run again')
	} finally {
		t.cleanup()
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
		const run = t.store.create({ title: 'Discovery', objective: 'Turn the raw input into candidate work items.', source: 'raw notes: plants, photos, watering', workspace: t.repo, job: 'discover' })
		const found = await t.run(drive(run.id, config))
		assert.equal(found.status, 'discovered')
		const candidates = t.store.list().filter((i) => i.discovery === run.id)
		assert.deepEqual(candidates.map((c) => [c.title, c.status]), [['Plant list with photos', 'candidate'], ['Watering schedule', 'candidate']], 'an item without an objective is not a candidate')
		const intake = JSON.parse(t.of('intake', 'discover', run.id)[0]!.prompt)
		assert.equal(intake.handoff.from, 'dispatcher')
		assert.equal(intake.you.where, 'Made Well\'s discovery')

		assert.equal((await t.run(Effect.flip(promote(run.id, [999])))).code, 'not_a_candidate')
		await t.run(promote(run.id, [candidates[1]!.id]))
		assert.deepEqual(t.store.list().filter((i) => i.discovery === run.id).map((c) => c.status), ['candidate', 'queued'])

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
