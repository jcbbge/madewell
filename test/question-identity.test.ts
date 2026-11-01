import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { AGENT_JOBS, type Card, type Prescriptions } from '../src/cards.ts'
import { drive } from '../src/engine.ts'
import type { Pack } from '../src/lane.ts'
import { answerHistory, questionKey, questionResolved, type WorkQuestion } from '../src/nq-obligations.ts'
import { openStore, Store } from '../src/store.ts'
import { Worker, type WorkerRequest } from '../src/worker.ts'

const card: Card = { harness: 'codex', provider: 'fixture', account: 'fixture', model: 'scripted', effort: 'low' }
const prescriptions: Prescriptions = {
	tiers: { deep: [card], coding: [card], intake: [card] },
	jobs: { ...Object.fromEntries(AGENT_JOBS.map(job => [job, { tier: 'deep', access: 'none', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } } } as Prescriptions['jobs'],
}
const clear = { understanding: 'The exact question and its settled answer are clear.', unclear: [], ambiguous: [], missing: [], notes: [] }
function fixture(questions: string[], explicitAliasAt = -1) {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-question-identity-'))), home = join(root, 'home')
	mkdirSync(home)
	const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^MW_/i.test(key)))
	for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]
	process.env.MW_HOME = home; process.env.MW_STORE = join(home, 'work.db'); process.env.MW_AUTORUN = '0'
	const jobs = questions.map((_question, index) => `step-${index + 1}`)
	const pack: Pack = { name: 'literal-question-identity', runtime: 'functions', discovery: [], delivery: jobs.map(job => ({ cartridge: job, steps: [{ job, profile: 'ideator', access: 'none', duty: 'Settle this exact question before returning the fixed result.', output: { type: 'object', properties: { result: { type: 'number' } }, required: ['result'] } }] })) }
	const path = process.env.MW_STORE
	let store = openStore(path)
	const item = store.create({ title: 'Preserve literal question meaning', objective: 'Resolve distinct questions independently and retain explicit aliases', source: 'Comparison operators, quoted literals and case are meaningful parts of each question.', workspace: root, pack, job: jobs[0], flow: { loop: 'delivery', accepted: [] }, autonomy: 'full' })
	const calls: WorkerRequest[] = [], reusedIds: string[] = []
	const worker = Layer.succeed(Worker, { run: req => Effect.sync(() => {
		calls.push(req)
		const index = jobs.indexOf(req.job), packet = JSON.parse(req.prompt)
		assert.ok(index >= 0)
		let output: Record<string, unknown>
		if (req.kind === 'intake') {
			if (packet.earlierTurns?.length) output = clear
			else if (index === explicitAliasAt) {
				const saved = packet.answeredBefore.find((answer: { question: string }) => answer.question === questions[0])
				assert.ok(saved, 'the explicit alias uses a real saved answer from this packet')
				reusedIds.push(saved.id)
				output = { ...clear, reuse: [{ question: questions[index], answerId: saved.id }] }
			} else output = { ...clear, unclear: [questions[index]] }
		} else if (req.kind === 'originator') output = { answer: `Settled ${jobs[index]}: ${questions[index]}`, needsOperator: false }
		else { assert.equal(req.kind, 'execute'); output = { result: index + 1 } }
		return { ok: true as const, output: JSON.stringify(output) }
	}) })
	const run = () => Effect.runPromise(drive(item.id, { prescriptions }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	return { item, jobs, calls, reusedIds, run, get store() { return store }, restart() { store.close(); store = openStore(path) }, clean() { store.close(); for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]; for (const [key, value] of Object.entries(inherited)) if (value !== undefined) process.env[key] = value; rmSync(root, { recursive: true, force: true }) } }
}

for (const [first, second] of [
	['Should the boundary use x <= 5?', 'Should the boundary use x >= 5?'],
	['Should the accepted literal be "CSV"?', 'Should the accepted literal be "csv"?'],
	['Should the expression be a + b?', 'Should the expression be a - b?'],
] as const) test(`question identity: the engine separately clarifies ${JSON.stringify(first)} and ${JSON.stringify(second)}`, { timeout: 30_000 }, async () => {
	const t = fixture([first, second])
	try {
		const result = await t.run()
		assert.equal(result.status, 'completed', JSON.stringify(result.hold))
		assert.deepEqual(t.calls.filter(call => call.kind === 'originator').map(call => call.job), t.jobs, 'a different operator or literal cannot inherit the earlier answer')
		const answered = t.store.events(result.id).filter(event => event.kind === 'nq-answer')
		assert.deepEqual(answered.map(event => event.data.questions), [[first], [second]])
		assert.notEqual(answered[0]!.data.answer, answered[1]!.data.answer)
		assert.equal(t.store.events(result.id).some(event => event.kind === 'nq-reused'), false)
		const execute = t.calls.find(call => call.kind === 'execute' && call.job === t.jobs[1])!
		assert.deepEqual(JSON.parse(execute.prompt).exchange.turns[0].questions, [second])
	} finally { t.clean() }
})

test('question identity: exact repeats reuse automatically while explicitly linked paraphrases become durable aliases', { timeout: 30_000 }, async () => {
	const original = 'Should the boundary use x <= 5?', paraphrase = 'Should values at most five be included?'
	const t = fixture([original, `  ${original}\r\n`, paraphrase, paraphrase], 2)
	try {
		const result = await t.run()
		assert.equal(result.status, 'completed')
		assert.deepEqual(t.calls.filter(call => call.kind === 'originator').map(call => call.job), [t.jobs[0]])
		const originalEvent = t.store.events(result.id).find(event => event.kind === 'nq-answer')!
		assert.deepEqual(t.reusedIds, [`${originalEvent.seq}:0`], 'paraphrase reuse names the validated saved answer identity')
		const reused = t.store.events(result.id).filter(event => event.kind === 'nq-reused')
		assert.deepEqual(reused.map(event => event.data.job), t.jobs.slice(1))
		assert.deepEqual(reused.map(event => event.data.questions), [[`  ${original}\r\n`], [paraphrase], [paraphrase]])
		t.restart()
		const history = answerHistory(t.store, t.store.get(result.id)!, t.jobs.at(-1)!)
		assert.ok(history.answers.some(answer => answer.question === paraphrase && answer.answer === `Settled step-1: ${original}`))
		assert.equal(history.packetAnswers().length, 1, 'aliases reference the same answer body after reopening SQLite')
		assert.ok(history.packetAnswers()[0]!.aliases!.some(alias => alias.question === paraphrase))
	} finally { t.clean() }
})

test('question identity: obligation matching preserves comparison signs, literal case, punctuation and interior spacing', () => {
	const pairs = [
		['Use x <= 5?', 'Use x >= 5?'], ['Use x = 5?', 'Use x != 5?'],
		['Use "CSV"?', 'Use "csv"?'], ['Use /api/A?', 'Use /api/a?'],
		['Use a+b?', 'Use a-b?'], ['Keep "a b"?', 'Keep "a  b"?'],
	]
	for (const [first, second] of pairs) {
		assert.notEqual(questionKey(first!), questionKey(second!))
		const question: WorkQuestion = { id: 'Q-literal', text: second!, ownerRole: 'planner', blockingRole: 'planner' }
		assert.equal(questionResolved(question, [{ question: first! }]), false, `${first} cannot settle ${second}`)
		assert.equal(questionResolved(question, [], [{ question: first!, decision: 'Use the first spelling.', why: 'It applies only to that spelling.' }]), false)
		assert.equal(questionResolved(question, [{ question: ` \n${second}\t` }]), true, 'outer whitespace does not invent a new question')
		assert.equal(questionResolved(question, [], [{ questionId: question.id, question: 'Explicitly identified question', decision: 'Use the requested spelling.', why: 'The exact durable question id is supplied.' }]), true)
		assert.equal(questionResolved(question, [], [{ questionId: 'Q-other', question: second!, decision: 'A different obligation.', why: 'This id does not identify the question.' }]), false)
	}
})
