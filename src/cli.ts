#!/usr/bin/env node
// `mw`: one command, plain verbs, JSON out. Results go to stdout; errors go to stderr as
// {error, message, context, cause, next} with exit code 1. Every answer names its next commands.
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { Effect, Layer } from 'effect'
import { loadPrescriptions } from './cards.ts'
import { answer, nextFor, promote, retry, runQueue } from './engine.ts'
import { MadeWellError, errorJson, type Next } from './errors.ts'
import { stepOf, type Cause } from './lane.ts'
import { Store, storeLayer, type Item } from './store.ts'
import { harnessWorker } from './harness.ts'
import { exportItem, replayHtml, snapshot } from './replay.ts'
import { commandWorker } from './worker.ts'

const USAGE: Next[] = [
	{ run: 'mw discover --source-file <raw notes> [--workspace <dir>]', why: 'turn raw input into candidate work items' },
	{ run: 'mw promote <discovery id> [item ids...]', why: 'send all (or the named) candidates into delivery' },
	{ run: 'mw start --objective "<one line>" --source-file <file> [--workspace <dir>]', why: 'add one work item straight to the delivery queue' },
	{ run: 'mw run [--watch]', why: 'deliver queued items, oldest first' },
	{ run: 'mw status [id]', why: 'what is running, what waits on you, what shipped' },
	{ run: 'mw show <id>', why: 'one item with its full event history' },
	{ run: 'mw answer <id> "<answer>"', why: 'answer an agent\'s open questions on a held item' },
	{ run: 'mw answer <id> --cause implementation|test|pre-existing "<answer>"', why: 'rule on a held failed check' },
	{ run: 'mw retry <id>', why: 'run a held item again from where it stopped' },
	{ run: 'mw replay [--out <file.html>]', why: 'write the replay of the whole flow to one self-contained page' },
	{ run: 'mw export <id> [--out <dir>]', why: 'one folder per agent call: brief, packet, answer, raw stream, tool events and flags' },
]

const usageError = (message: string, context: Record<string, unknown> = {}) => new MadeWellError({ code: 'usage', message, context, next: USAGE })

const prescriptionsPath = () => process.env.MW_PRESCRIPTIONS ?? new URL('../prescriptions.json', import.meta.url).pathname

// MW_WORKER_COMMAND plugs in any harness; otherwise the built-in Claude Code, Codex and pi workers run.
const workerLayer = Layer.unwrap(Effect.sync(() => (process.env.MW_WORKER_COMMAND ? commandWorker(process.env.MW_WORKER_COMMAND) : harnessWorker)))

const view = (item: Item) => ({
	id: item.id,
	title: item.title,
	status: item.status,
	stage: stepOf(item.job).stage,
	job: item.job,
	profile: stepOf(item.job).profile,
	...(item.kind ? { kind: item.kind } : {}),
	...(item.discovery !== undefined ? { discovery: item.discovery } : {}),
	...(item.exchange && item.exchange.status !== 'clear' ? { nq: { from: item.exchange.from.kind === 'job' ? stepOf(item.exchange.from.job).profile : item.exchange.from.kind, status: item.exchange.status, turns: item.exchange.turns.filter((t) => t.answer !== undefined).length } } : {}),
	round: item.round,
	...(item.waitsOn !== undefined ? { waitsOn: item.waitsOn } : {}),
	...(item.resetsAt !== undefined ? { resumesAt: new Date(item.resetsAt).toISOString() } : {}),
	...(item.hold ? { hold: item.hold } : {}),
	...(item.shipped ? { shipped: item.shipped } : {}),
	next: item.status === 'held' ? nextFor(item) : item.status === 'candidate' ? [{ run: `mw promote ${item.discovery} ${item.id}`, why: 'send it into delivery' }] : item.status === 'discovered' ? [{ run: `mw promote ${item.id}`, why: 'send every candidate into delivery' }] : ['shipped'].includes(item.status) ? [] : item.status === 'queued' ? [{ run: 'mw run', why: 'deliver it' }] : [{ run: `mw status ${item.id}`, why: 'check on it later; it continues on its own' }],
})

const number = (value: string | undefined) => {
	const id = Number(value)
	return Number.isInteger(id) && id > 0 ? Effect.succeed(id) : Effect.fail(usageError(`Expected a work item number, got ${JSON.stringify(value ?? null)}.`))
}

const program = Effect.gen(function* () {
	const { positionals, values } = yield* Effect.try({
		try: () => parseArgs({ allowPositionals: true, options: { out: { type: 'string' }, objective: { type: 'string' }, title: { type: 'string' }, source: { type: 'string' }, 'source-file': { type: 'string' }, workspace: { type: 'string' }, cause: { type: 'string' }, watch: { type: 'boolean' } } }),
		catch: (e) => usageError(String((e as Error).message)),
	})
	const [command, ...args] = positionals
	const store = yield* Store
	switch (command) {
		case 'start': {
			if (!values.objective) return yield* usageError('start needs --objective.')
			let source = values.source
			if (values['source-file']) {
				const path = resolve(values['source-file'])
				source = yield* Effect.try({ try: () => readFileSync(path, 'utf8'), catch: () => usageError(`Cannot read --source-file ${path}.`, { path }) })
			}
			if (!source) return yield* usageError('start needs the operator\'s own words: --source "<text>" or --source-file <file>.')
			const item = store.create({ title: values.title ?? values.objective, objective: values.objective, source, workspace: resolve(values.workspace ?? '.') })
			return { item: view(item), next: [{ run: 'mw run', why: 'deliver it; it moves through all four stages and ships on a passing check' }] }
		}
		case 'discover': {
			if (!values['source-file'] && !values.source) return yield* usageError('discover needs the raw input: --source-file <file> or --source "<text>".')
			const path = values['source-file'] && resolve(values['source-file'])
			const source = path ? yield* Effect.try({ try: () => readFileSync(path, 'utf8'), catch: () => usageError(`Cannot read --source-file ${path}.`, { path }) }) : values.source!
			const item = store.create({ title: values.title ?? `Discovery of ${path ? basename(path) : 'raw input'}`, objective: 'Turn the raw input into candidate work items.', source, workspace: resolve(values.workspace ?? '.'), job: 'discover' })
			return { item: view(item), next: [{ run: 'mw run', why: 'run discovery; its candidates wait for promotion' }] }
		}
		case 'promote': {
			const promoted = yield* promote(yield* number(args[0]), yield* Effect.all(args.slice(1).map(number)))
			return { promoted: promoted.map(view), next: [{ run: 'mw run', why: 'deliver them, oldest first' }] }
		}
		case 'replay': {
			const out = resolve(values.out ?? 'madewell-replay.html')
			writeFileSync(out, replayHtml(snapshot(store)))
			return { replay: out, next: [{ run: `open ${out}`, why: 'step through the whole flow' }] }
		}
		case 'export': {
			const id = yield* number(args[0])
			const exported = yield* exportItem(store, id, resolve(values.out ?? `madewell-export-${id}`))
			return { export: exported.dir, calls: exported.calls, next: [{ run: `ls ${exported.dir}`, why: 'one folder per call: brief, packet, answer, raw stream, tool events and flags' }] }
		}
		case 'run': {
			const prescriptions = yield* loadPrescriptions(prescriptionsPath())
			const items = yield* runQueue({ prescriptions }, { watch: values.watch })
			const held = items.filter((i) => i.status === 'held')
			return { summary: `${items.filter((i) => i.status === 'shipped').length} shipped, ${held.length} need you`, items: items.map(view), next: held.flatMap(nextFor) }
		}
		case 'status': {
			if (args[0]) {
				const item = store.get(yield* number(args[0]))
				if (!item) return yield* new MadeWellError({ code: 'item_not_found', message: `There is no work item #${args[0]}.`, context: { id: args[0] }, next: [{ run: 'mw status', why: 'list every work item' }] })
				return view(item)
			}
			const items = store.list()
			const count = (s: Item['status']) => items.filter((i) => i.status === s).length
			const held = items.filter((i) => i.status === 'held')
			return {
				summary: `${count('held')} need you, ${count('candidate')} candidates, ${count('running') + count('waiting-quota') + count('waiting-prerequisite')} in progress, ${count('queued')} queued, ${count('shipped')} shipped`,
				items: items.map(view),
				next: held.length ? held.flatMap(nextFor) : count('queued') ? [{ run: 'mw run', why: 'deliver queued items' }] : [],
			}
		}
		case 'show': {
			const id = yield* number(args[0])
			const item = store.get(id)
			if (!item) return yield* new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list every work item' }] })
			return { ...view(item), item, events: store.events(id) }
		}
		case 'answer': {
			const id = yield* number(args[0])
			const text = args.slice(1).join(' ').trim()
			if (!text) return yield* usageError('answer needs the answer text.')
			const cause = values.cause as Cause | undefined
			if (cause && !['implementation', 'test', 'pre-existing'].includes(cause)) return yield* usageError(`--cause must be implementation, test or pre-existing, got ${cause}.`)
			yield* answer(id, text, cause)
			return { item: view(store.get(id)!), next: [{ run: 'mw run', why: 'continue delivering it' }] }
		}
		case 'retry': {
			const id = yield* number(args[0])
			yield* retry(id)
			return { item: view(store.get(id)!), next: [{ run: 'mw run', why: 'continue delivering it' }] }
		}
		default:
			return yield* usageError(command ? `Unknown command "${command}".` : 'No command given.')
	}
})

const exit = await Effect.runPromise(
	program.pipe(
		Effect.provide(Layer.mergeAll(storeLayer(), workerLayer)),
		Effect.match({ onSuccess: (out) => ({ out, code: 0 }), onFailure: (e) => ({ out: errorJson(e), code: 1 }) }),
	),
)
const text = JSON.stringify(exit.out, null, 2) + '\n'
if (exit.code) process.stderr.write(text)
else process.stdout.write(text)
process.exitCode = exit.code
