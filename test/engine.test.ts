import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Fiber, Layer } from 'effect'
import { TestClock } from 'effect/testing'
import type { Prescriptions } from '../src/cards.ts'
import { answer, drive, nextFor, promote, retry } from '../src/engine.ts'
import type { Job } from '../src/lane.ts'
import { openStore, Store } from '../src/store.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'

const card = (account: string) => ({ harness: 'claude' as const, provider: account, account, model: `${account}-model`, effort: 'low' as const })
const JOBS: Job[] = ['discover', 'ideate', 'challenge', 'plan', 'test-plan', 'implement', 'verify', 'arbitrate']
const prescriptions: Prescriptions = {
	tiers: { all: [card('anthropic'), card('openai')] },
	jobs: Object.fromEntries(JOBS.map((job) => [job, { tier: 'all', access: 'read' }])) as Prescriptions['jobs'],
}
const PASS = 'All checks ran.\n{"outcome":"pass","summary":"2/2 passed"}'
const FAIL = 'One check failed.\n{"outcome":"fail","summary":"1/2 passed"}'
const ruling = (cause: string) => `{"cause":"${cause}","answer":"fix it this way","evidence":"log line 3"}`
const ok = (output = 'done'): WorkerResult => ({ ok: true, output })
const clear = ok('I understand.\n{"understanding":"I see the job","questions":[],"notes":[]}')
const ask = (...questions: string[]) => ok(JSON.stringify({ understanding: 'Mostly clear', questions, notes: [] }))
const reply = (text: string, needsOperator = false) => ok(JSON.stringify({ answer: text, needsOperator }))

type Script = (req: WorkerRequest, n: number) => WorkerResult | undefined

/**
 * A store in a temp workspace whose project ships by writing SHIPPED. `script` answers calls; n counts calls
 * of the same kind and job. Unscripted intakes confirm, unscripted originators answer, unscripted
 * executions return a deliverable (verify passes).
 */
function setup(script: Script = () => undefined) {
	const dir = mkdtempSync(join(tmpdir(), 'mw-'))
	writeFileSync(join(dir, 'projects.json'), JSON.stringify([{ path: dir, ship: 'echo "$PWD" > SHIPPED' }]))
	const store = openStore(join(dir, 'mw.db'))
	const calls: WorkerRequest[] = []
	const answerFor = (req: WorkerRequest): WorkerResult => {
		calls.push(req)
		const scripted = script(req, calls.filter((c) => c.kind === req.kind && c.job === req.job && c.item === req.item).length)
		if (scripted) return scripted
		if (req.kind === 'intake') return clear
		if (req.kind === 'originator') return reply('Here is what I meant.')
		return ok(req.job === 'verify' ? PASS : `${req.job} deliverable`)
	}
	const worker = Layer.succeed(Worker, { run: (req) => Effect.sync(() => answerFor(req)) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	const item = store.create({ title: 'Add export button', objective: 'Users can export a report as CSV', source: 'operator: please add CSV export', workspace: dir })
	const executed = () => calls.filter((c) => c.kind === 'execute').map((c) => c.job)
	const cleanup = () => (store.close(), rmSync(dir, { recursive: true, force: true }))
	return { dir, store, calls, run, item, executed, cleanup }
}

test('an item passes through six profiles, each confirming its hand-off before executing, and ships on a passing check', async () => {
	const t = setup()
	try {
		const done = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(done.status, 'shipped')
		assert.deepEqual(t.calls.map((c) => `${c.kind} ${c.job} ${c.profile}`), [
			'intake ideate ideator', 'execute ideate ideator',
			'intake challenge ideation peer', 'execute challenge ideation peer',
			'intake plan planner', 'execute plan planner',
			'intake test-plan test architect', 'execute test-plan test architect',
			'intake implement implementer', 'execute implement implementer',
			'intake verify verifier', 'execute verify verifier',
		])
		assert.ok(t.calls.every((c) => c.kind !== 'intake' || c.access === 'read'), 'intake is read-only')
		assert.equal(readFileSync(join(t.dir, 'SHIPPED'), 'utf8').trim(), t.dir, 'the ship command runs in the item\'s workspace')

		const first = JSON.parse(t.calls[0]!.prompt)
		assert.equal(first.handoff.from, 'dispatcher')
		assert.match(first.handoff.content, /operator: please add CSV export/)
		const implement = JSON.parse(t.calls.find((c) => c.kind === 'execute' && c.job === 'implement')!.prompt)
		assert.deepEqual(Object.keys(implement.accepted), ['ideate', 'challenge', 'plan', 'test-plan'])
		assert.equal(implement.exchange.from, 'test architect')
		assert.equal(implement.exchange.handoff, 'test-plan deliverable')
	} finally {
		t.cleanup()
	}
})

test('answers that end in a fenced JSON block are read on the first call', async () => {
	const fenced = (json: string) => ok(`Here it is.\n\`\`\`json\n${json}\n\`\`\`\n`)
	const t = setup((req) =>
		req.kind === 'intake' ? fenced('{"understanding":"I see the job","questions":[],"notes":[]}')
		: req.job === 'verify' ? fenced('{"outcome":"pass","summary":"2/2 passed"}')
		: undefined)
	try {
		const done = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(done.status, 'shipped')
		assert.equal(t.calls.length, 12, 'no call is repeated')
	} finally {
		t.cleanup()
	}
})

test('a receiver\'s questions go to whoever handed the work over, and the whole exchange reaches the executing agent', async () => {
	const t = setup((req, n) => {
		if (req.kind === 'intake' && req.job === 'ideate' && n === 1) return ask('Which report?')
		if (req.kind === 'originator' && req.job === 'ideate') return reply('The monthly sales report.')
		if (req.kind === 'intake' && req.job === 'implement' && n === 1) return ask('Which file holds the export?')
		if (req.kind === 'originator' && req.job === 'implement') return reply('src/export.ts, as the plan says.')
		return undefined
	})
	try {
		await t.run(drive(t.item.id, { prescriptions }))
		const originators = t.calls.filter((c) => c.kind === 'originator')
		assert.deepEqual(originators.map((c) => `${c.job} ${c.profile}`), ['ideate dispatcher', 'implement test architect'])
		assert.deepEqual(JSON.parse(originators[1]!.prompt).questions, ['Which file holds the export?'])
		const implement = JSON.parse(t.calls.find((c) => c.kind === 'execute' && c.job === 'implement')!.prompt)
		assert.deepEqual(implement.exchange.turns, [{ understanding: 'Mostly clear', questions: ['Which file holds the export?'], answer: 'src/export.ts, as the plan says.', by: 'originator' }])
		assert.equal(t.store.get(t.item.id)!.status, 'shipped')
	} finally {
		t.cleanup()
	}
})

test('questions still open after three answered turns hold the item; the operator\'s answer goes to the receiver, which must confirm', async () => {
	const t = setup((req, n) => (req.kind === 'intake' && req.job === 'plan' && n <= 4 ? ask(`Question ${n}?`) : undefined))
	try {
		let item = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(item.hold?.code, 'nq_turns')
		assert.deepEqual(item.hold?.context.questions, ['Question 4?'])
		assert.equal(t.calls.filter((c) => c.kind === 'originator' && c.job === 'plan').length, 3)
		assert.ok(!t.executed().includes('plan'))
		assert.match(nextFor(item)[0]!.run, /^mw answer \d+ "/)

		await t.run(answer(item.id, 'Only the CSV format; nothing else.'))
		item = await t.run(drive(item.id, { prescriptions }))
		assert.equal(item.status, 'shipped')
		const plan = JSON.parse(t.calls.find((c) => c.kind === 'execute' && c.job === 'plan')!.prompt)
		assert.deepEqual(plan.exchange.turns.at(-1), { understanding: 'Mostly clear', questions: ['Question 4?'], answer: 'Only the CSV format; nothing else.', by: 'operator' })
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
		const item = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(item.hold?.code, 'authority')
		assert.deepEqual(item.hold?.context.questions, ['May we drop PDF export?'])
		assert.equal(item.hold?.context.originator, 'ideator')
	} finally {
		t.cleanup()
	}
})

test('a usage limit mid-job hands the job to an agent on another account through NQ; when every account is out the item waits and continues', async () => {
	const t0 = Date.now()
	const t = setup((req, n) => {
		if (req.kind !== 'execute' || req.job !== 'implement') return undefined
		if (n === 1) return { ok: false, limit: { account: 'anthropic', resetsAt: null, message: 'You\'ve hit your limit' } }
		if (n === 2) return { ok: false, limit: { account: 'openai', resetsAt: t0 + 10 * 60_000, message: 'usage limit reached' } }
		return ok('implemented')
	})
	try {
		const done = await t.run(Effect.gen(function* () {
			yield* TestClock.setTime(t0)
			const fiber = yield* Effect.forkChild(drive(t.item.id, { prescriptions }))
			while (t.store.get(t.item.id)!.status !== 'waiting-quota') yield* Effect.yieldNow
			assert.equal(t.store.get(t.item.id)!.resetsAt, t0 + 10 * 60_000, 'waits for openai (10 min), not anthropic (unknown reset → 1 h)')
			yield* TestClock.adjust('10 minutes')
			return yield* Fiber.join(fiber)
		}).pipe(Effect.provide(TestClock.layer())))
		assert.equal(done.status, 'shipped')
		const implement = t.calls.filter((c) => c.job === 'implement').map((c) => `${c.kind} ${c.card.account}`)
		assert.deepEqual(implement, ['intake anthropic', 'execute anthropic', 'intake openai', 'execute openai', 'intake openai', 'execute openai'])
		assert.match(JSON.parse(t.calls.filter((c) => c.kind === 'execute' && c.job === 'implement')[1]!.prompt).pickingUp, /usage limit/)
		assert.equal(t.store.events(t.item.id).filter((e) => e.kind === 'nq-replacement').length, 2)
	} finally {
		t.cleanup()
	}
})

test('a failure is handed to the arbiter through NQ; a bad test is rewritten and re-verified, a bad implementation is replanned', async () => {
	const verdicts = [FAIL, PASS, FAIL, PASS]
	const causes = ['test', 'implementation']
	const t = setup((req, n) => {
		if (req.kind === 'intake' && req.job === 'arbitrate' && n === 1) return ask('Did the check fail before this change?')
		if (req.kind === 'execute' && req.job === 'verify') return ok(verdicts.shift()!)
		if (req.kind === 'execute' && req.job === 'arbitrate') return ok(ruling(causes.shift()!))
		return undefined
	})
	try {
		await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(t.store.get(t.item.id)!.status, 'shipped')
		assert.deepEqual(t.executed().slice(5), ['verify', 'arbitrate', 'test-plan', 'verify'])
		const arbiterQuestion = t.calls.find((c) => c.kind === 'originator' && c.job === 'arbitrate')!
		assert.equal(arbiterQuestion.profile, 'verifier', 'the failing job answers the arbiter\'s questions')
		const rework = JSON.parse(t.calls.filter((c) => c.kind === 'execute' && c.job === 'test-plan')[1]!.prompt)
		assert.equal(rework.exchange.from, 'arbiter')
		assert.match(rework.exchange.handoff, /^Ruling \(test\): fix it this way/)
		assert.equal(rework.yourPreviousDeliverable, 'test-plan deliverable')

		const second = t.store.create({ title: 'second', objective: 'o', source: 's', workspace: t.dir })
		t.calls.length = 0
		await t.run(drive(second.id, { prescriptions }))
		assert.deepEqual(t.executed().slice(5), ['verify', 'arbitrate', 'plan', 'test-plan', 'implement', 'verify'])
	} finally {
		t.cleanup()
	}
})

test('a pre-existing defect becomes its own item from planning; the original waits, then re-verifies and ships', async () => {
	const verdicts = [FAIL, PASS, PASS]
	const t = setup((req) => {
		if (req.kind === 'execute' && req.job === 'verify') return ok(verdicts.shift()!)
		if (req.kind === 'execute' && req.job === 'arbitrate') return ok(ruling('pre-existing'))
		return undefined
	})
	try {
		const done = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(done.status, 'shipped')
		const pre = t.store.list().find((i) => i.parent === t.item.id)!
		assert.equal(pre.status, 'shipped')
		const executed = t.calls.filter((c) => c.kind === 'execute').map((c) => `${c.item} ${c.job}`)
		assert.deepEqual(executed.slice(6), [`${t.item.id} arbitrate`, `${pre.id} plan`, `${pre.id} test-plan`, `${pre.id} implement`, `${pre.id} verify`, `${t.item.id} verify`])
		const preIntake = JSON.parse(t.calls.find((c) => c.kind === 'intake' && c.item === pre.id)!.prompt)
		assert.equal(preIntake.handoff.from, 'arbiter')
		const reverify = t.calls.filter((c) => c.kind === 'intake' && c.item === t.item.id && c.job === 'verify')
		assert.equal(reverify.length, 2, 'the re-verification is handed over afresh')
	} finally {
		t.cleanup()
	}
})

test('holds stop only that item, name their next commands, and release on an answer or retry', async () => {
	let failImplement = 3
	const t = setup((req, n) => {
		if (req.kind === 'execute' && req.job === 'implement' && failImplement-- > 0) return { ok: false, error: 'harness crashed' }
		if (req.kind === 'execute' && req.job === 'verify') return ok(n === 1 ? FAIL : PASS)
		if (req.kind === 'execute' && req.job === 'arbitrate') return ok(ruling('undetermined'))
		return undefined
	})
	try {
		let item = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(item.hold?.code, 'worker_failing')
		assert.equal(item.job, 'implement')
		assert.deepEqual(nextFor(item).map((n) => n.run), [`mw show ${item.id}`, `mw retry ${item.id}`])

		await t.run(retry(item.id))
		item = await t.run(drive(item.id, { prescriptions }))
		assert.equal(item.hold?.code, 'arbiter_undetermined')
		assert.equal(nextFor(item).length, 3)
		assert.equal((await t.run(Effect.flip(retry(item.id)))).code, 'answer_required')
		assert.equal((await t.run(Effect.flip(answer(item.id, 'no cause given')))).code, 'cause_required')

		await t.run(answer(item.id, 'the date parser is wrong', 'implementation'))
		item = await t.run(drive(item.id, { prescriptions }))
		assert.equal(item.status, 'shipped')
		const replan = JSON.parse(t.calls.findLast((c) => c.kind === 'intake' && c.job === 'plan')!.prompt)
		assert.equal(replan.handoff.from, 'operator')
		assert.match(replan.handoff.content, /the date parser is wrong/)
	} finally {
		t.cleanup()
	}
})

test('a passing item without a ship command holds with the command that fixes it', async () => {
	const t = setup()
	try {
		rmSync(join(t.dir, 'projects.json'))
		const item = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(item.hold?.code, 'no_ship_command')
		assert.match(nextFor(item)[0]!.run, new RegExp(`^mw init --workspace ${t.dir} --ship "<`))
		assert.equal(existsSync(join(t.dir, 'SHIPPED')), false)
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
	const t = setup((req) => (req.kind === 'execute' && req.job === 'discover' ? ok(`Found two pieces of work.\n${JSON.stringify({ items })}`) : undefined))
	try {
		const run = t.store.create({ title: 'Discovery', objective: 'Turn the raw input into candidate work items.', source: 'raw notes: plants, photos, watering', workspace: t.dir, job: 'discover' })
		const found = await t.run(drive(run.id, { prescriptions }))
		assert.equal(found.status, 'discovered')
		const candidates = t.store.list().filter((i) => i.discovery === run.id)
		assert.deepEqual(candidates.map((c) => [c.title, c.status]), [['Plant list with photos', 'candidate'], ['Watering schedule', 'candidate']], 'an item without an objective is not a candidate')
		assert.equal(JSON.parse(t.calls.find((c) => c.kind === 'intake' && c.job === 'discover')!.prompt).handoff.from, 'dispatcher')

		const notCandidate = await t.run(Effect.flip(promote(run.id, [999])))
		assert.equal(notCandidate.code, 'not_a_candidate')
		await t.run(promote(run.id, [candidates[1]!.id]))
		assert.deepEqual(t.store.list().filter((i) => i.discovery === run.id).map((c) => c.status), ['candidate', 'queued'])

		t.calls.length = 0
		const shipped = await t.run(drive(candidates[1]!.id, { prescriptions }))
		assert.equal(shipped.status, 'shipped')
		const firstIntake = JSON.parse(t.calls[0]!.prompt)
		assert.equal(firstIntake.handoff.from, 'ideator')
		assert.match(firstIntake.handoff.content, /^feature: Watering schedule\nObjective: Set a schedule per plant/)
		assert.equal(t.store.calls().filter((c) => c.item === candidates[1]!.id).length, 12, 'every call is on the record')
	} finally {
		t.cleanup()
	}
})
