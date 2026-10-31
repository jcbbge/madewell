// A foreground demonstration over the real Made Well store, worker, queue and UI.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { Cause, Effect, Exit, Layer } from 'effect'
import { loadPrescriptions } from '../../src/cards.ts'
import { go, nextFor, promote, retry, runQueue } from '../../src/engine.ts'
import { MadeWellError, quote } from '../../src/errors.ts'
import { GRAMMAR_PACK, grammarOf } from '../../src/grammar.ts'
import { harnessWorker } from '../../src/harness.ts'
import { Store, openStore } from '../../src/store.ts'
import { investigateEvidence } from '../../src/switch-evidence.ts'
import { serveForeground } from './foreground.ts'

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
	root: { type: 'string', default: '.demo' },
	'source-file': { type: 'string' },
	prescriptions: { type: 'string' },
	autonomy: { type: 'string', default: 'checkpoints' },
	port: { type: 'string', default: '4758' },
	item: { type: 'string' },
	'decision-model': { type: 'string' },
} })
const command = positionals[0] ?? 'status'
const root = resolve(values.root!)
const configPath = join(root, 'demo.json')
const print = (value: unknown) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
const fail = (message: string, next = 'npm run demo -- init') => new MadeWellError({ code: 'usage', message, context: { command }, next: [{ run: next, why: 'run the isolated demonstration explicitly' }] })
const sample = `Deliver two independent, small TypeScript changes in this sandbox application:
1. Add src/add.ts exporting add(a: number, b: number), returning their sum.
2. Add src/multiply.ts exporting multiply(a: number, b: number), returning their product.
For each operation, accept finite numbers and throw TypeError for non-numbers or non-finite inputs. Zero and negative numbers must work. Each task needs independently authored Node tests covering valid and invalid input. Use node --test test/*.test.ts. Follow src/example.ts for module style. Preserve existing code. These changes have no dependency on one another and can run in parallel. No external services, new dependencies, UI, or production access are needed. Completion requires actual executed checks and a local sandbox release. This is demonstration input, not an operator production request.`

async function main() {
	if (!['init', 'discover', 'run', 'promote', 'retry', 'go', 'status', 'serve', 'investigate'].includes(command)) throw fail('Use init, discover, run, promote, retry, go, status, serve or investigate.')
	if (command === 'init') {
		if (existsSync(root)) throw fail('The demo root already exists; use its existing record or choose a new --root. Nothing was reset.', 'npm run demo -- status')
		if (!['full', 'steps', 'checkpoints'].includes(values.autonomy!)) throw fail('Autonomy is checkpoints, steps or full.')
		const prescriptions = resolve(values.prescriptions ?? fileURLToPath(new URL('../../prescriptions.json', import.meta.url)))
		await Effect.runPromise(loadPrescriptions(prescriptions))
		if (values['source-file'] && !readFileSync(resolve(values['source-file']), 'utf8').trim()) throw fail('The raw input is empty.')
		mkdirSync(join(root, 'product', 'src'), { recursive: true })
		const product = realpathSync(join(root, 'product'))
		const git = (...args: string[]) => execFileSync('git', ['-C', product, ...args], { encoding: 'utf8' }).trim()
		writeFileSync(join(product, 'README.md'), '# Demonstration application\n\nTypeScript modules use named exports. Node executes tests with node --test test/*.test.ts. This repository is an isolated, disposable product, with no upstream or production connection.\n\nMade Well owns local release after independent checks pass and the candidate is merged. Its registered ship command exports the exact accepted commit to a local releases directory, executes the preserved identity module there, and records the release path, commit and smoke result. Future release evidence is not a prerequisite for the checks that precede it.\n')
		writeFileSync(join(product, 'package.json'), JSON.stringify({ name: 'made-well-demo-product', private: true, type: 'module' }, null, 2))
		writeFileSync(join(product, 'src/example.ts'), 'export function identity(value: number): number {\n\treturn value\n}\n')
		git('init', '-q', '-b', 'main')
		git('config', 'user.name', 'Made Well demo')
		git('config', 'user.email', 'demo@localhost')
		git('add', 'README.md', 'package.json', 'src/example.ts')
		git('commit', '-qm', 'Seed the isolated demonstration application')
		// Job worktrees must not inherit the Made Well checkout's instructions.
		const home = mkdtempSync(join(realpathSync(tmpdir()), 'made-well-grammar-'))
		const shipScript = fileURLToPath(new URL('./ship.ts', import.meta.url))
		writeFileSync(join(home, 'projects.json'), JSON.stringify([{ path: product, ship: `${quote(process.execPath)} ${quote(shipScript)}` }]))
		writeFileSync(configPath, JSON.stringify({ product, home, prescriptions, store: join(home, 'madewell.db') }, null, 2))
	}
	if (!existsSync(configPath)) throw fail('No demo has been initialized at this root.')
	const config = JSON.parse(readFileSync(configPath, 'utf8')) as { product: string; home: string; prescriptions: string; store: string }
	process.env.MW_HOME = config.home
	process.env.MW_AUTORUN = '0' // Foreground only. Never installs a service or starts an unattended runner.
	const store = openStore(config.store)
	try {
		const prescriptions = await Effect.runPromise(loadPrescriptions(values.prescriptions ? resolve(values.prescriptions) : config.prescriptions))
		const layer = Layer.mergeAll(Layer.succeed(Store, store), harnessWorker)
		const execute = <A, E>(effect: Effect.Effect<A, E, Store | import('../../src/worker.ts').Worker>) => Effect.runPromise(effect.pipe(Effect.provide(layer)))
		if (command === 'init' || command === 'discover') {
			if (!['full', 'steps', 'checkpoints'].includes(values.autonomy!)) throw fail('Autonomy is checkpoints, steps or full.')
			if (command === 'discover' && !values['source-file']) throw fail('Discovery needs --source-file. Its contents are preserved exactly.')
			const source = values['source-file'] ? readFileSync(resolve(values['source-file']), 'utf8') : sample
			if (!source.trim()) throw fail('The raw input is empty. Supply notes or a transcript; the original text will be preserved.')
			const item = store.create({ title: values['source-file'] ? 'Transcript discovery' : 'Two independent application changes', objective: 'Generate actionable tasks from the exact source, then deliver selected tasks through the prescribed grammar.', source, workspace: config.product, pack: GRAMMAR_PACK, autonomy: values.autonomy as 'full' | 'steps' | 'checkpoints', job: GRAMMAR_PACK.discovery[0]!.steps[0]!.job })
			print({ discovery: item.id, store: config.store, workspace: config.product, next: [`npm run demo -- run --root ${quote(root)}`, `npm run demo -- serve --root ${quote(root)}`] })
		} else if (command === 'run') {
			await execute(runQueue({ prescriptions }))
			print({ items: store.list().map((i) => ({ id: i.id, title: i.title, status: i.status, job: i.job, next: nextFor(i) })) })
		} else if (command === 'retry' || command === 'go') {
			const id = Number(values.item)
			if (!Number.isSafeInteger(id) || id < 1) throw fail('Retry/go needs --item <task id>.')
			await execute(command === 'retry' ? retry(id) : go(id))
			print({ item: id, status: store.get(id)?.status, next: nextFor(store.get(id)!) })
		} else if (command === 'promote') {
			const discovery = Number(values.item ?? positionals[1])
			if (!Number.isSafeInteger(discovery) || discovery < 1) throw fail('Promotion needs --item <discovery id>.')
			const selected = positionals.slice(values.item === undefined ? 2 : 1).map(Number)
			if (selected.some((id) => !Number.isSafeInteger(id) || id < 1)) throw fail('Selected task ids must be positive integers.')
			await execute(promote(discovery, selected))
			print({ discovery, promoted: store.list().filter((i) => i.discovery === discovery && i.status === 'queued').map((i) => i.id) })
		} else if (command === 'serve') {
			const port = Number(values.port)
			if (!Number.isInteger(port) || port < 0 || port > 65535) throw fail('Port must be an integer from 0 to 65535.')
			// Browser discovery uses the same seven-node pack as the demo's CLI entry.
			const registryPath = join(config.home, 'projects.json')
			const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as { path: string; cartridges?: string }[]
			if (registry.some(project => project.path === config.product && !project.cartridges)) {
				const packPath = join(mkdtempSync(join(config.home, 'browser-grammar-')), 'pack.json')
				writeFileSync(packPath, JSON.stringify(GRAMMAR_PACK, null, 2))
				writeFileSync(registryPath, JSON.stringify(registry.map(project => project.path === config.product && !project.cartridges ? { ...project, cartridges: packPath } : project), null, 2))
			}
			const stop = new AbortController()
			const interrupt = () => stop.abort()
			process.once('SIGINT', interrupt)
			process.once('SIGTERM', interrupt)
			try {
				const exit = await Effect.runPromiseExit(serveForeground(prescriptions, '127.0.0.1', port).pipe(Effect.provide(layer)), { signal: stop.signal })
				if (Exit.isFailure(exit) && !(stop.signal.aborted && Cause.hasInterruptsOnly(exit.cause))) await Effect.runPromise(Effect.failCause(exit.cause))
			}
			finally { process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt) }
		} else if (command === 'investigate') {
			if (!values['decision-model']) throw fail('Investigation requires --decision-model provider/model. The provider must already be configured.')
			const id = Number(values.item)
			if (!Number.isSafeInteger(id) || id < 1) throw fail('Investigation needs --item <task id>.')
			const { builtinModels } = await import('@earendil-works/pi-ai/providers/all')
			const { piAiDecider } = await import('@osolmaz/switch/models')
			const result = await investigateEvidence(store, id, piAiDecider(values['decision-model'], { registry: builtinModels(), timeoutMs: 30_000 }))
			print(result)
			if (result.ended !== 'done') process.exitCode = 1
		} else {
			const id = Number(values.item ?? store.list().findLast((i) => i.pack?.name === GRAMMAR_PACK.name && !i.discovery)?.id)
			print(grammarOf(store, id) ?? { discovery: null, message: 'No discovery record at the selected id.' })
		}
	} finally { store.close() }
}

main().catch((error: unknown) => {
	const problem = error instanceof MadeWellError ? error : fail(error instanceof Error ? error.message : String(error))
	process.stderr.write(`${JSON.stringify({ code: problem.code, message: problem.message, context: problem.context, next: problem.next })}\n`)
	process.exitCode = 1
})
