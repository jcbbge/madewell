import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { AGENT_JOBS, type Card, type Prescriptions } from '../src/cards.ts'
import type { AcceptedDiscovery } from '../src/discovery-contract.ts'
import { runQueue } from '../src/engine.ts'
import { quote } from '../src/errors.ts'
import { conforms, lastJson } from '../src/lane.ts'
import { createWork, organReceipts, type Preparation } from '../src/organs.ts'
import { resolvePackSelection } from '../src/pack-selection.ts'
import { openStore, Store } from '../src/store.ts'
import { workEvidenceOf } from '../src/work-evidence.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'

const source = '  Export the report as CSV using the existing shell application.\r\nThe delivered command must print a,b followed by a newline.  '
const discoveryJobs = ['declare', 'look-first', 'classify', 'lenses', 'one-thing', 'route', 'discover'] as const
const deliveryJobs = ['ideate', 'challenge', 'plan', 'implement', 'test-plan', 'verify']
const expectedNext: Record<string, string[]> = {
	declare: ['look-first'], 'look-first': ['classify'], classify: ['lenses'], lenses: ['one-thing'],
	'one-thing': ['route'], route: ['discover'], discover: ['delivery'],
	ideate: ['challenge'], challenge: ['plan'], plan: ['implement', 'test-plan'], implement: ['verify'], 'test-plan': ['verify'],
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const card = (harness: string, account: string): Card => ({ harness, provider: 'fixture', account, model: 'scripted', effort: 'low' })
const prescriptions: Prescriptions = {
	tiers: { deep: [card('codex', 'thinking')], intake: [card('codex', 'intake')], coding: [card('codex', 'implementation')], checking: [card('claude', 'independent-checks')] },
	jobs: { ...Object.fromEntries(AGENT_JOBS.map(job => [job, { tier: job === 'implement' ? 'coding' : job === 'test-plan' ? 'checking' : 'deep', access: job === 'implement' ? 'make' : job === 'test-plan' ? 'checks' : 'read', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } } } as Prescriptions['jobs'],
	parallel: 2,
}
const candidate = { key: 'csv-export', title: 'Provide the CSV export', kind: 'feature' as const, objective: 'Deliver a report command that prints a,b followed by a newline', text: 'Extend the supplied shell application with the requested CSV command. Keep the command output exactly a,b and one newline.', requirementIds: ['R-csv'], questionRefs: [], artifacts: [{ id: 'A-csv', description: 'The delivered CSV command', sources: ['raw'] }] }
function discovery() {
	const envelope = () => ({ discoveryContract: '1' as const, result: 'Preserve the source and the single requested CSV outcome.', sources: ['raw'], unknowns: [], decisions: [], evidence: [], questions: [] })
	return {
		declare: { ...envelope(), evidence: [{ id: 'raw', ref: 'capture:original#L1-L2' }], intent: [{ id: 'I-csv', text: 'Export the report as CSV using the existing application', authority: 'explicit', sources: ['raw'] }] },
		'look-first': { ...envelope(), observations: [{ id: 'F-app', text: 'src/app.sh is the existing shell application.', sources: ['raw'] }] },
		classify: { ...envelope(), requirements: [{ id: 'R-csv', text: 'The delivered report command prints a,b and one newline.', kind: 'outcome', origin: 'explicit', intentIds: ['I-csv'], sources: ['raw'] }], intentDispositions: [] },
		lenses: { ...envelope(), tradeoffs: [] },
		'one-thing': { ...envelope(), candidates: [structuredClone(candidate)] },
		route: { ...envelope(), dependencies: [], preparation: [] },
		discover: { ...envelope(), items: [{ ...structuredClone(candidate), after: [] as number[] }], dependencyIds: [], preparationIds: [], questionIds: [] },
	} satisfies AcceptedDiscovery
}
type Packet = {
	item: { id: number; source: string }, you: { replyFormat: Record<string, unknown> }, received: Record<string, unknown>, discoveryContext?: unknown,
	organs: { version: string; rules: { id: string; kind: string }[]; nextJobs: string[]; incoming: { from: string; fromItem?: number; job: string; requires: { ref: string; sha256: string }[] }[] },
}
function preparation(req: WorkerRequest, packet: Packet): Preparation {
	assert.equal(packet.organs.version, '1')
	assert.deepEqual([...packet.organs.nextJobs].sort(), [...expectedNext[req.job]!].sort())
	return {
		ground: { intent: 'Deliver the exact requested CSV through this durable work item.', sources: [{ ref: 'source', finding: 'The original input asks for the CSV command with exact output.' }, { ref: 'file:src/app.sh', finding: 'The supplied application establishes the shell script format.' }] },
		rumen: packet.organs.rules.map(rule => ({ rule: rule.id, disposition: 'addressed', evidence: rule.kind === 'fence' ? 'Carry the syntax fence to engine-owned candidate verification; this worker awards no pass.' : 'Preserve the selected project rule in this phase.' })),
		next: expectedNext[req.job]!.map(job => ({ job, brief: `${req.job} prepared ${job}: use the accepted CSV work.`, requires: [`output:${req.job}`] })),
	}
}

test('pipeline delivery: the actual builtin grammar carries one raw input through strict discovery, independent makers and verified local shipment', { timeout: 60_000 }, async context => {
	const selected = await Effect.runPromise(resolvePackSelection('builtin:grammar'))
	assert.ok(selected.pack)
	assert.equal(selected.pack.name, 'made-well-autonomy-lab')
	assert.equal(selected.pack.version, '1.3')
	assert.deepEqual(selected.pack.contracts, { discovery: '1', acceptance: '1', handoff: '1' })
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-pipeline-delivery-'))), repo = join(root, 'repo'), home = join(root, 'home')
	mkdirSync(join(repo, 'src'), { recursive: true }); mkdirSync(home)
	const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
	git('init', '-q', '-b', 'main'); git('config', 'user.name', 'Independent pipeline acceptance'); git('config', 'user.email', 'pipeline@localhost')
	writeFileSync(join(repo, 'src/app.sh'), 'echo app\n')
	git('add', 'src/app.sh'); git('commit', '-qm', 'Seed the actual shell application')
	const originalHead = git('rev-parse', 'HEAD'), inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^MW_/i.test(key)))
	for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]
	process.env.MW_HOME = home; process.env.MW_STORE = join(home, 'work.db'); process.env.MW_AUTORUN = '0'
	const shipped = join(root, 'shipped.log')
	const ship = `sh src/export.sh\ngit rev-parse HEAD >> ${quote(shipped)}`
	writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: repo, gates: [{ id: 'shell-syntax', glob: '*.sh', run: 'sh -n {files}' }], ship }]))
	const path = process.env.MW_STORE
	let store = openStore(path)
	const unrelated = store.create({ title: 'Unselected work', objective: 'Remain queued', source: 'This independent work was not selected.', workspace: repo, pack: selected.pack, autonomy: 'full' })
	const parent = createWork(store, { title: 'Discover the requested CSV task', objective: 'Generate the single CSV task from the exact raw input', source, workspace: repo, pack: selected.pack, job: 'declare', autonomy: 'full' })
	const contributions = discovery(), calls: WorkerRequest[] = [], returned = new Map<string, string>(), makerStarts = new Set<string>()
	let releaseMakers!: () => void
	const makerBarrier = new Promise<void>(resolve => { releaseMakers = resolve })
	let makersInFlight = 0, maxMakersInFlight = 0
	const started = performance.now()
	const worker = Layer.succeed(Worker, { run: req => Effect.promise(async (): Promise<WorkerResult> => {
		calls.push(req)
		assert.notEqual(req.item, unrelated.id, 'the queue is scoped to the selected root and its generated work')
		const packet = JSON.parse(req.prompt) as Packet
		assert.equal(packet.item.id, req.item)
		assert.equal(packet.item.source, source, 'the same exact raw source reaches every worker')
		if (req.kind === 'intake') return { ok: true, output: JSON.stringify({ understanding: 'Complete this fixed phase, ground it in the actual materials and prepare its configured successor.', unclear: [], ambiguous: [], missing: [], notes: [] }) }
		assert.equal(req.kind, 'execute', 'the complete fixed fixture needs no originator, repair or arbitration')
		assert.deepEqual(packet.organs.rules.map(rule => rule.id), ['gate:shell-syntax'])
		let result: Record<string, unknown>
		if (req.item === parent.id) {
			assert.ok(discoveryJobs.includes(req.job as typeof discoveryJobs[number]))
			result = structuredClone(contributions[req.job as keyof typeof contributions])
		} else {
			const child = store.get(req.item)!
			assert.equal(child.discovery, parent.id)
			assert.deepEqual(child.pack, parent.pack)
			if (req.job === 'ideate') {
				assert.equal(store.get(parent.id)!.status, 'discovered')
				assert.ok(packet.organs.incoming.some(incoming => incoming.from === 'discover' && incoming.fromItem === parent.id && incoming.job === 'ideate' && incoming.requires.some(source => source.ref === 'output:discover' && source.sha256 === hash(store.get(parent.id)!.outputs.discover!))), 'the parent preparation is resolved before the first delivery execution')
				assert.ok(store.events(req.item).some(event => event.kind === 'ground-checked' && event.data.job === 'ideate' && event.data.ok === true), 'the engine rechecked the inherited handoff before execution')
				result = { outcome: 'Provide the requested CSV command.', approach: 'Follow the existing shell application.', decisions: [] }
			} else if (req.job === 'challenge') result = { findings: [], decisions: [] }
			else if (req.job === 'plan') result = {
				making: 'The CSV command', notMaking: ['Other export formats'], scope: ['src/export.sh'], follows: [{ path: 'src/export.sh', follows: 'src/app.sh' }], steps: ['Create src/export.sh printing exactly a,b and one newline.'],
				doneWhen: [{ id: 'D-csv', text: 'The delivered command prints a,b and one newline.', evidence: { evaluator: 'candidate-check', availableAfter: 'implementation', inputs: [{ kind: 'candidate', ref: 'src/export.sh' }] } }], decisions: [],
			}
			else {
				assert.ok(['implement', 'test-plan'].includes(req.job), `Unexpected delivery worker ${req.job}`)
				assert.deepEqual(Object.keys(packet.received), ['plan'])
				assert.equal(packet.discoveryContext, undefined, 'the makers retain their fixed-plan boundary')
				assert.equal(req.prompt.includes(req.job === 'implement' ? 'CHECKER-PRIVATE-RETURN' : 'IMPLEMENT-PRIVATE-RETURN'), false)
				assert.equal(existsSync(join(req.cwd, req.job === 'implement' ? 'checks/export.sh' : 'src/export.sh')), false, 'the other maker has supplied no private files to this checkout')
				makersInFlight++; maxMakersInFlight = Math.max(maxMakersInFlight, makersInFlight); makerStarts.add(req.job)
				if (makerStarts.size === 2) releaseMakers()
				await makerBarrier
				if (req.job === 'implement') { writeFileSync(join(req.cwd, 'src/export.sh'), 'echo a,b\n'); result = { summary: 'IMPLEMENT-PRIVATE-RETURN: completed the fixed CSV command.' } }
				else {
					const check = join(req.cwd, 'checks/export.sh'); mkdirSync(dirname(check), { recursive: true })
					writeFileSync(check, 'actual=$(sh src/export.sh)\n[ "$actual" = "a,b" ] || { echo "wrong CSV: $actual"; exit 1; }\n[ "$(sh src/export.sh | wc -c | tr -d \' \')" = "4" ] || { echo "wrong output length"; exit 1; }\nprintf "checked:a,b\\n"\n')
					result = { checks: [{ id: 'C-csv', doneWhen: 'D-csv', run: 'sh checks/export.sh' }], note: 'CHECKER-PRIVATE-RETURN: independent fixed-plan check.' }
				}
				makersInFlight--
			}
		}
		const value = { ...result, organPreparation: preparation(req, packet) }
		assert.deepEqual(conforms(packet.you.replyFormat, value), [], 'the actual advertised strict contract accepts this phase output')
		const output = `Accepted ${req.job}.\r\n${JSON.stringify(value)}\n`
		returned.set(`${req.item}:${req.job}`, output)
		return { ok: true, output }
	}) })
	try {
		const queue = await Effect.runPromise(runQueue({ prescriptions }, { roots: [parent.id] }).pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
		const discovered = store.get(parent.id)!, children = store.list().filter(item => item.discovery === parent.id)
		assert.equal(discovered.status, 'discovered', JSON.stringify(discovered.hold))
		assert.equal(children.length, 1, JSON.stringify(queue.items.map(item => ({ id: item.id, status: item.status, job: item.job, hold: item.hold }))))
		const child = children[0]!
		assert.equal(child.status, 'shipped', JSON.stringify(child.hold))
		assert.deepEqual(queue.items.map(item => [item.id, item.status]), [[parent.id, 'discovered'], [child.id, 'shipped']])
		assert.deepEqual(store.get(unrelated.id), unrelated, 'scoped driving leaves unrelated queued work untouched')
		assert.equal(child.source, source)
		assert.deepEqual(lastJson(child.outputs.discover!), candidate)
		assert.deepEqual(child.organs?.origin, { item: parent.id, job: 'discover', outputHash: hash(discovered.outputs.discover!), target: 'delivery' })
		assert.deepEqual(calls.filter(call => call.kind === 'execute' && call.item === parent.id).map(call => call.job), discoveryJobs)
		assert.deepEqual(lastJson(discovered.outputs.route!)!.preparation, [])
		assert.equal(organReceipts(store, discovered).length, 7)
		assert.deepEqual(organReceipts(store, discovered).map(receipt => receipt.job), discoveryJobs)
		assert.deepEqual(organReceipts(store, child).map(receipt => receipt.job).sort(), [...deliveryJobs].sort())
		for (const item of [discovered, child]) for (const receipt of organReceipts(store, item)) assert.equal(receipt.outputHash, hash(item.outputs[receipt.job]!))
		for (const job of deliveryJobs.filter(job => job !== 'verify')) {
			assert.equal(calls.filter(call => call.kind === 'execute' && call.job === job && call.item === child.id).length, 1, `${job} executes once on the same generated task`)
			assert.equal(child.outputs[job], returned.get(`${child.id}:${job}`))
			assert.ok(lastJson(child.outputs[job]!)!.organPreparation)
		}
		const implementation = calls.find(call => call.kind === 'execute' && call.job === 'implement')!, checker = calls.find(call => call.kind === 'execute' && call.job === 'test-plan')!
		assert.notEqual(implementation.cwd, checker.cwd)
		assert.notEqual(implementation.card.harness, checker.card.harness)
		assert.equal(maxMakersInFlight, 2, 'both independent makers execute before either return is accepted')
		assert.equal(child.verification?.passed, true)
		assert.deepEqual(child.verification!.results.map(result => [result.id, result.exitCode]), [['G1', 0], ['C-csv', 0]])
		assert.match(child.verification!.results.find(result => result.id === 'C-csv')!.output, /checked:a,b/)
		assert.notEqual(child.verification!.commit, originalHead)
		assert.equal(child.verification!.commit, child.merged!.commit)
		assert.equal(child.verification!.commit, child.shipped!.main)
		assert.equal(child.verification!.commit, git('rev-parse', 'HEAD'))
		assert.equal(readFileSync(shipped, 'utf8'), `${child.verification!.commit}\n`)
		assert.match(child.shipped!.output, /^a,b\n/)
		assert.equal(execFileSync('sh', ['src/export.sh'], { cwd: repo, encoding: 'utf8' }), 'a,b\n')
		assert.equal(workEvidenceOf(store, discovered).delivered, true)
		assert.equal(workEvidenceOf(store, child).delivered, true)
		assert.equal(git('worktree', 'list', '--porcelain').split('\n').filter(line => line.startsWith('worktree ')).length, 1)
		assert.equal(git('diff', '--name-only', 'HEAD'), '')
		assert.equal(git('ls-files', '--others', '--exclude-standard'), '')
		const savedCalls = [...store.calls(parent.id), ...store.calls(child.id)]
		assert.equal(savedCalls.length, 24)
		assert.equal(savedCalls.filter(call => call.kind === 'intake').length, 12)
		assert.equal(savedCalls.filter(call => call.kind === 'execute').length, 12)
		assert.ok(savedCalls.every(call => call.outcome === 'ok'))
		const proof = { parent: discovered, child, parentReceipts: organReceipts(store, discovered), childReceipts: organReceipts(store, child), parentEvents: store.events(parent.id), childEvents: store.events(child.id) }
		store.close(); store = openStore(path)
		assert.deepEqual(store.get(parent.id), proof.parent)
		assert.deepEqual(store.get(child.id), proof.child)
		assert.deepEqual(organReceipts(store, store.get(parent.id)!), proof.parentReceipts)
		assert.deepEqual(organReceipts(store, store.get(child.id)!), proof.childReceipts)
		assert.deepEqual(store.events(parent.id), proof.parentEvents)
		assert.deepEqual(store.events(child.id), proof.childEvents)
		assert.equal(workEvidenceOf(store, store.get(parent.id)!).delivered, true)
		assert.equal(workEvidenceOf(store, store.get(child.id)!).delivered, true)
		assert.equal(store.calls(child.id).length, 10)
		context.diagnostic(JSON.stringify({ kind: 'independent scripted-worker strict pipeline acceptance', pack: { selector: selected.source, name: selected.pack.name, version: selected.pack.version, contracts: selected.pack.contracts }, parent: parent.id, child: child.id, statuses: [discovered.status, child.status], counters: { calls: savedCalls.length, intakes: 12, executions: 12, discoveryReceipts: proof.parentReceipts.length, deliveryReceipts: proof.childReceipts.length, independentMakersInFlight: maxMakersInFlight, gates: 1, candidateChecks: 1, shipments: 1 }, elapsedMs: performance.now() - started, recordedAgentMs: savedCalls.reduce((total, call) => total + call.ms, 0), calls: savedCalls.map(call => ({ item: call.item, kind: call.kind, job: call.job, ms: call.ms, outcome: call.outcome })), verifiedCommit: child.verification!.commit, shippedHead: git('rev-parse', 'HEAD'), actualOutput: 'a,b\n', sqliteReopen: true, deliveredEvidence: true, limitations: 'Scripted inference proves the integrated machinery with real Git, SQLite, gates, checks and a local ship command; it does not measure live model quality or production deployment.' }))
	} finally {
		store.close()
		for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]
		for (const [key, value] of Object.entries(inherited)) if (value !== undefined) process.env[key] = value
		rmSync(root, { recursive: true, force: true })
	}
})
