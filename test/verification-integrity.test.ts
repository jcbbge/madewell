import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { Effect, Layer } from 'effect'
import { AGENT_JOBS, type Card, type Prescriptions } from '../src/cards.ts'
import { drive, go } from '../src/engine.ts'
import { quote } from '../src/errors.ts'
import { SOFTWARE } from '../src/lane.ts'
import { openStore, Store } from '../src/store.ts'
import { workEvidenceOf } from '../src/work-evidence.ts'
import { Worker, type WorkerRequest } from '../src/worker.ts'

const card: Card = { harness: 'codex', provider: 'fixture', account: 'fixture', model: 'scripted', effort: 'low' }
const prescriptions: Prescriptions = {
	tiers: { deep: [card], coding: [card], intake: [card] },
	jobs: { ...Object.fromEntries(AGENT_JOBS.map(job => [job, { tier: 'deep', access: job === 'implement' ? 'make' : job === 'test-plan' ? 'checks' : 'read', budget: { minutes: 1 } }])), verify: { budget: { minutes: 1 } } } as Prescriptions['jobs'],
}
const assertExport = 'actual=$(sh src/export.sh)\n[ "$actual" = "a,b" ] || { echo "wrong export: $actual"; exit 1; }\nprintf "tested:%s\\n" "$actual"\n'
function fixture(commands: string[], staleGeneratedOutput = false) {
	const root = realpathSync(mkdtempSync(join(tmpdir(), 'mw-verification-integrity-'))), repo = join(root, 'repo'), home = join(root, 'home')
	mkdirSync(join(repo, 'src'), { recursive: true }); mkdirSync(join(repo, 'scripts')); mkdirSync(home)
	const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
	git('init', '-q', '-b', 'main'); git('config', 'user.name', 'Independent verification acceptance'); git('config', 'user.email', 'verification@localhost')
	writeFileSync(join(repo, '.gitignore'), 'build/\n')
	writeFileSync(join(repo, 'src/app.sh'), 'echo app\n')
	writeFileSync(join(repo, 'src/value.txt'), 'old\n')
	writeFileSync(join(repo, 'src/export.sh'), 'echo old\n')
	writeFileSync(join(repo, 'scripts/build.sh'), 'printf \'echo %s\\n\' "$(cat src/value.txt)" > src/export.sh\n')
	git('add', '.'); git('commit', '-qm', 'Seed generated product and build script')
	const base = git('rev-parse', 'HEAD')
	const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^MW_/i.test(key)))
	for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]
	process.env.MW_HOME = home; process.env.MW_STORE = join(home, 'work.db'); process.env.MW_AUTORUN = '0'
	const shipped = join(root, 'shipped.log')
	writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: repo, ship: `git rev-parse HEAD >> ${quote(shipped)}` }]))
	const store = openStore(process.env.MW_STORE)
	const item = store.create({ title: 'Update the CSV export', objective: 'The delivered export prints a,b', source: 'Update the CSV source and its generated export. Verify the delivered bytes.', workspace: repo, pack: SOFTWARE, autonomy: 'checkpoints' })
	const calls: WorkerRequest[] = []
	const write = (req: WorkerRequest, path: string, content: string) => { mkdirSync(dirname(join(req.cwd, path)), { recursive: true }); writeFileSync(join(req.cwd, path), content) }
	const worker = Layer.succeed(Worker, { run: req => Effect.sync(() => {
		calls.push(req)
		let output: Record<string, unknown>
		if (req.kind === 'intake') output = { understanding: 'Complete the fixed task and verify the actual candidate.', unclear: [], ambiguous: [], missing: [], notes: [] }
		else if (req.kind === 'originator') output = { answer: 'Use the fixed local export contract.', needsOperator: false }
		else if (req.job === 'ideate') output = { outcome: 'Export a,b as CSV.', approach: 'Update the source and its generated script.', decisions: [] }
		else if (req.job === 'challenge') output = { findings: [], decisions: [] }
		else if (req.job === 'plan') output = { making: 'The CSV export source and generated script', notMaking: ['Other formats'], scope: ['src/value.txt', 'src/export.sh'], follows: [], steps: ['Update the source and regenerate the existing export script.'], doneWhen: [{ id: 'D-export', text: 'The delivered src/export.sh prints a,b.' }], decisions: [] }
		else if (req.job === 'implement') { write(req, 'src/value.txt', 'a,b\n'); if (!staleGeneratedOutput) write(req, 'src/export.sh', 'echo a,b\n'); output = { summary: 'Updated the fixed CSV source.' } }
		else if (req.job === 'test-plan') {
			commands.forEach((command, index) => write(req, `checks/check-${index + 1}.sh`, command))
			output = { checks: commands.map((_command, index) => ({ id: `C${index + 1}`, doneWhen: 'D-export', run: `sh checks/check-${index + 1}.sh` })) }
		} else { assert.equal(req.job, 'arbitrate'); output = { cause: 'undetermined', answer: 'Keep the failed candidate stopped for inspection.', evidence: 'The engine-owned verification results are the evidence.' } }
		return { ok: true as const, output: JSON.stringify(output) }
	}) })
	const run = <A, E>(effect: Effect.Effect<A, E, Store | Worker>) => Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store, store), worker))))
	return { repo, base, item, store, calls, git, run, shipped, clean() { store.close(); for (const key of Object.keys(process.env)) if (/^MW_/i.test(key)) delete process.env[key]; for (const [key, value] of Object.entries(inherited)) if (value !== undefined) process.env[key] = value; rmSync(root, { recursive: true, force: true }) } }
}

for (const scenario of [
	{ name: 'a passing build regenerates tracked product bytes', commands: [`sh scripts/build.sh\n${assertExport}`], stale: true },
	{ name: 'a passing check changes candidate HEAD', commands: [`git -c user.name=Check -c user.email=check@localhost commit --quiet --allow-empty -m 'Check moved HEAD'\n${assertExport}`] },
	{ name: 'a later passing check restores an earlier tracked mutation', commands: ["printf '# mutation between commands\\n' >> src/export.sh\n", `git restore --source=HEAD --worktree -- src/export.sh\n${assertExport}`] },
	{ name: 'a passing check stages a tracked product mutation', commands: ["printf 'echo changed\\n' > src/export.sh\ngit add src/export.sh\n"] },
] as const) test(`verification integrity: ${scenario.name} cannot attest or ship the original candidate`, { timeout: 30_000 }, async () => {
	const t = fixture([...scenario.commands], 'stale' in scenario && scenario.stale)
	try {
		const result = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(result.status, 'held', JSON.stringify(result))
		assert.equal(result.verification?.passed, false)
		const failure = result.verification!.results.find(check => check.id === 'candidate-integrity')
		assert.ok(failure, 'a zero exit code cannot hide candidate identity changes')
		assert.notEqual(failure.exitCode, 0)
		assert.ok(result.verification!.results.filter(check => check.id.startsWith('C')).every(check => check.exitCode === 0), 'the refusal comes from candidate integrity despite passing check commands')
		assert.equal(t.git('rev-parse', 'main'), t.base)
		assert.equal(result.merged, undefined)
		assert.equal(result.shipped, undefined)
		assert.equal(existsSync(t.shipped), false)
		assert.equal(readFileSync(join(t.repo, 'src/export.sh'), 'utf8'), 'echo old\n')
		assert.equal(workEvidenceOf(t.store, result).verificationCurrent, false)
	} finally { t.clean() }
})

test('verification integrity: ignored and untracked build products preserve passing candidate evidence and shipment', { timeout: 30_000 }, async () => {
	const t = fixture([`mkdir -p build\nprintf 'compiled output\\n' > build/bundle.js\nprintf 'temporary output\\n' > scratch-output.txt\n${assertExport}`])
	try {
		let result = await t.run(drive(t.item.id, { prescriptions }))
		assert.equal(result.status, 'paused', JSON.stringify(result.hold))
		assert.equal(result.verification?.passed, true)
		assert.equal(result.verification!.results.some(check => check.id === 'candidate-integrity'), false)
		assert.match(result.verification!.results[0]!.output, /tested:a,b/)
		assert.equal(workEvidenceOf(t.store, result).verificationCurrent, true)
		await t.run(go(result.id)); result = await t.run(drive(result.id, { prescriptions }))
		assert.equal(result.status, 'shipped')
		assert.equal(t.git('rev-parse', 'main'), result.verification!.commit)
		assert.equal(readFileSync(t.shipped, 'utf8').trim(), result.verification!.commit)
		assert.equal(execFileSync('sh', ['src/export.sh'], { cwd: t.repo, encoding: 'utf8' }).trim(), 'a,b')
		assert.equal(existsSync(join(t.repo, 'scratch-output.txt')), false)
		assert.equal(existsSync(join(t.repo, 'build/bundle.js')), false)
		assert.equal(workEvidenceOf(t.store, result).delivered, true)
	} finally { t.clean() }
})
