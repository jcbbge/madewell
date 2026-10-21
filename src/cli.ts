#!/usr/bin/env node
// `mw`: Made Well's one command, built for the agent driving it. `mw` alone prints the manual: every
// command with its input and output schemas, every error code with its context shape, and the current
// state. `mw next` names the one action to take now. Results go to stdout as JSON; errors go to stderr as
// {error, message, context, cause?, next} with exit code 1. The manual is generated from COMMANDS, so it
// cannot drift from what the commands accept and return.
//
// Reading never creates anything: a command opens the store only if it exists, except `start` and
// `discover`, which create it once their input is known to be good.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { Clock, Effect, Layer, Schema } from 'effect'
import { loadPrescriptions } from './cards.ts'
import { answer, nextFor, promote, retry, runQueue } from './engine.ts'
import { ERRORS, MadeWellError, Next, errorJson, quote } from './errors.ts'
import { stepOf } from './lane.ts'
import { Project, alertHolds, openHolds, projectFor, projectsPath, readProjects, saveProject, type OpenHold } from './project.ts'
import { Store, defaultStorePath, storeLayer, type Item } from './store.ts'
import { harnessWorker } from './harness.ts'
import { exportItem, replayHtml, snapshot } from './replay.ts'
import { Worker, commandWorker } from './worker.ts'

const storePath = defaultStorePath()
const registry = projectsPath(storePath)
const prescriptionsPath = () => process.env.MW_PRESCRIPTIONS ?? new URL('../prescriptions.json', import.meta.url).pathname
const SHIP_SLOT = '"<the operator\'s command that merges to main and deploys>"'

// MW_WORKER_COMMAND plugs in any harness; otherwise the built-in Claude Code, Codex and pi workers run.
const workerLayer = Layer.unwrap(Effect.sync(() => (process.env.MW_WORKER_COMMAND ? commandWorker(process.env.MW_WORKER_COMMAND) : harnessWorker)))

const usageError = (command: string | null, message: string) =>
	new MadeWellError({ code: 'usage', message, context: { command }, next: [{ run: 'mw', why: 'read the manual: every command and its input schema' }] })

// ── Schemas: the inputs and outputs the manual prints ──────────────────────────────────────────────────

const Id = Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int.check(Schema.isGreaterThan(0)))).annotate({ description: 'a work item number' })
const optional = (description: string) => Schema.optionalKey(Schema.String.annotate({ description }))
const Workspace = optional('the project directory; defaults to the current directory')
const Source = { source: optional('the operator\'s own words; or give --source-file'), 'source-file': optional('a file holding the operator\'s own words') }
const Fact = Schema.Record(Schema.String, Schema.Unknown)

const ItemView = Schema.Struct({
	id: Schema.Int, title: Schema.String, status: Schema.String, stage: Schema.String, job: Schema.String, profile: Schema.String,
	kind: Schema.optionalKey(Schema.String), discovery: Schema.optionalKey(Schema.Int),
	nq: Schema.optionalKey(Schema.Struct({ from: Schema.String, status: Schema.String, turns: Schema.Int })),
	round: Schema.Int, waitsOn: Schema.optionalKey(Schema.Int), resumesAt: Schema.optionalKey(Schema.String),
	hold: Schema.optionalKey(Schema.Struct({ code: Schema.String, message: Schema.String, context: Fact })),
	shipped: Schema.optionalKey(Schema.Struct({ command: Schema.String, output: Schema.String })),
	next: Schema.Array(Next),
}).annotate({ identifier: 'Item' })

const HoldView = Schema.Struct({
	item: Schema.Int, title: Schema.String, workspace: Schema.String, code: Schema.String, message: Schema.String, context: Fact,
	since: Schema.String, alerted: Schema.NullOr(Schema.Struct({ at: Schema.String, exitCode: Schema.Int })), next: Schema.Array(Next),
}).annotate({ identifier: 'Hold' })

const Board = Schema.Struct({ summary: Schema.String, items: Schema.Array(ItemView), next: Schema.Array(Next) }).annotate({ identifier: 'Board' })

const Action = Schema.Union([
	Schema.Struct({ action: Schema.Literal('run'), run: Schema.String, why: Schema.String }),
	Schema.Struct({
		action: Schema.Literal('relay'), say: Schema.String.annotate({ description: 'what to tell the operator' }),
		hold: Schema.optionalKey(HoldView),
		candidates: Schema.optionalKey(Schema.Array(Schema.Struct({ id: Schema.Int, title: Schema.String, kind: Schema.String, objective: Schema.String }))),
		then: Schema.Array(Next).annotate({ description: 'run the one that fits the operator\'s reply, with their words in place of the <...> slot' }),
	}),
	Schema.Struct({ action: Schema.Literal('wait'), until: Schema.String.annotate({ description: 'ISO time' }), why: Schema.String, then: Schema.Literal('mw next') }),
]).annotate({ identifier: 'Action', description: 'run a command, relay to the operator, or wait until a time' })

const Created = Schema.Struct({ item: ItemView, next: Schema.Array(Next) })

// ── Views ──────────────────────────────────────────────────────────────────────────────────────────────

const view = (item: Item): typeof ItemView.Type => ({
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

const holdView = (store: Store['Service'], h: OpenHold): typeof HoldView.Type => ({ ...h, next: nextFor(store.get(h.item)!) })

const board = (store: Store['Service']): typeof Board.Type => {
	const items = store.list()
	const count = (s: Item['status']) => items.filter((i) => i.status === s).length
	const held = items.filter((i) => i.status === 'held')
	return {
		summary: `${count('held')} need you, ${count('candidate')} candidates, ${count('running') + count('waiting-quota') + count('waiting-prerequisite')} in progress, ${count('queued')} queued, ${count('shipped')} shipped`,
		items: items.map(view),
		next: held.length ? held.flatMap(nextFor) : count('queued') ? [{ run: 'mw run', why: 'deliver queued items' }] : [],
	}
}

const found = (store: Store['Service'], id: number) => {
	const item = store.get(id)
	return item ? Effect.succeed(item) : Effect.fail(new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list every work item' }] }))
}

/** The workspace, if it is a registered project with a ship command. */
const registered = Effect.fn('mw.registered')(function* (workspace: string | undefined) {
	const path = resolve(workspace ?? '.')
	const projects = yield* readProjects(registry)
	if (projectFor(projects, path)?.ship) return path
	return yield* new MadeWellError({
		code: 'project_not_found', message: `${path} is not a registered project with a ship command.`, context: { workspace: path, projects: projects.map((p) => p.path) },
		next: [{ run: `mw init --workspace ${quote(path)} --ship ${SHIP_SLOT}`, why: 'register it with how it ships, then run this command again' }],
	})
})

const readSource = (input: { source?: string; 'source-file'?: string }) => {
	if (!input['source-file']) return Effect.succeed(input.source)
	const path = resolve(input['source-file'])
	return Effect.try({
		try: () => readFileSync(path, 'utf8'),
		catch: () => new MadeWellError({ code: 'source_unreadable', message: `Cannot read --source-file ${path}.`, context: { path }, next: [{ run: `ls -l ${quote(path)}`, why: 'check the file exists and is readable' }] }),
	})
}

/** One item per request: a repeated `start` or `discover` returns the item the first one created. */
const createOnce = (store: Store['Service'], fields: Parameters<Store['Service']['create']>[0]) =>
	store.list().find((i) => i.parent === undefined && i.discovery === undefined && i.title === fields.title && i.objective === fields.objective && i.source === fields.source && i.workspace === fields.workspace)
	?? store.create(fields)

/** The live runner's owner, or null. Asking takes and gives back the runner claim, so it is only asked when work can move. */
const runner = (store: Store['Service']) =>
	store.claimRunner().pipe(
		Effect.map(() => (store.releaseRunner(), null)),
		Effect.catchIf((e) => e.code === 'store_locked', (e) => Effect.succeed((e.context as typeof ERRORS.store_locked.context.Type).owner)),
	)

const MOVING: ReadonlyArray<Item['status']> = ['queued', 'running', 'waiting-quota', 'waiting-prerequisite']

/** The one action to take now. Work that can move without the operator comes first, then holds, then decisions. */
const nextAction = Effect.fn('mw.next')(function* (): Effect.fn.Return<typeof Action.Type, MadeWellError, Store> {
	const store = yield* Store
	const items = store.list()
	const moving = items.filter((i) => i.parent === undefined && MOVING.includes(i.status))
	const owner = moving.length ? yield* runner(store) : null
	if (moving.length && !owner) {
		return { action: 'run', run: 'mw run', why: `${moving.length} item(s) can move without the operator. It returns once every item has shipped or holds for the operator, and it is safe to repeat.` }
	}
	const [hold] = openHolds(store)
	if (hold) {
		const questions = Array.isArray(hold.context.questions) ? ` Questions: ${hold.context.questions.join(' ')}` : ''
		return { action: 'relay', say: `Item #${hold.item} (${hold.title}) is waiting on you: ${hold.message}${questions}`, hold: holdView(store, hold), then: nextFor(store.get(hold.item)!) }
	}
	if (owner) {
		const now = yield* Clock.currentTimeMillis
		const quota = items.filter((i) => i.status === 'waiting-quota' && i.resetsAt !== undefined)
		const busy = items.some((i) => i.status === 'running' || i.status === 'queued')
		const until = busy || !quota.length ? now + 60_000 : Math.max(now, Math.min(...quota.map((i) => i.resetsAt!)))
		const on = owner.item ? ` on #${owner.item.id} (${owner.item.job})` : ''
		return { action: 'wait', until: new Date(until).toISOString(), why: busy || !quota.length ? `The runner (pid ${owner.pid}) is working${on}.` : 'Every account is at its usage limit; the runner continues by itself at the earliest reset.', then: 'mw next' }
	}
	const run = items.find((i) => i.status === 'discovered' && items.some((c) => c.discovery === i.id && c.status === 'candidate'))
	if (run) {
		const candidates = items.filter((c) => c.discovery === run.id && c.status === 'candidate')
		return {
			action: 'relay', say: `Discovery #${run.id} found ${candidates.length} candidate work item(s). Which should Made Well deliver?`,
			candidates: candidates.map((c) => ({ id: c.id, title: c.title, kind: c.kind ?? 'feature', objective: c.objective })),
			then: [{ run: `mw promote ${run.id}`, why: 'deliver every candidate' }, ...candidates.map((c) => ({ run: `mw promote ${run.id} ${c.id}`, why: `deliver "${c.title}"; name several ids to deliver several` }))],
		}
	}
	const cwd = process.cwd()
	const project = projectFor(yield* readProjects(registry), cwd)
	if (!project?.ship) {
		const init = `mw init --workspace ${quote(project?.path ?? cwd)} --ship ${SHIP_SLOT}`
		return {
			action: 'relay', say: `Made Well delivers work items to production for a registered project. How does ${project?.path ?? cwd} ship: what command merges to main and deploys?`,
			then: [{ run: init, why: 'register the project with how it ships' }, { run: `${init} --alert "<a command that notifies the operator>"`, why: 'also say how to reach the operator when an item holds' }],
		}
	}
	const at = quote(project.path)
	return {
		action: 'relay', say: 'Nothing is moving and nothing waits on you. What should Made Well work on next?',
		then: [
			{ run: `mw discover --workspace ${at} --source "<the operator's raw notes>"`, why: 'turn raw notes, transcripts or meetings into candidate work items' },
			{ run: `mw start --workspace ${at} --objective "<one line>" --source "<the operator's own words>"`, why: 'deliver one work item straight away' },
		],
	}
})

// ── The command table ──────────────────────────────────────────────────────────────────────────────────

interface Command<S extends Schema.Struct<Schema.Struct.Fields>, O extends Schema.Top, P> {
	readonly name: string
	readonly summary: string
	/** Input fields taken from positional arguments, in order; a trailing `...` collects the rest. */
	readonly args?: ReadonlyArray<string>
	readonly input: S
	readonly output: O
	/** Repeating the command gives the same result and makes no further change. */
	readonly idempotent?: boolean
	/** Checks the input before the store opens; only commands with a `prepare` may create the store. */
	readonly prepare?: (input: S['Type']) => Effect.Effect<P, MadeWellError>
	readonly run: (input: S['Type'], prepared: P) => Effect.Effect<O['Type'], MadeWellError, Store | Worker>
}
type AnyCommand = Command<Schema.Struct<Schema.Struct.Fields>, Schema.Top, any>
const command = <S extends Schema.Struct<Schema.Struct.Fields>, O extends Schema.Top, P = void>(c: Command<S, O, P>) => c as unknown as AnyCommand

const COMMANDS: ReadonlyArray<AnyCommand> = [
	command({
		name: 'next',
		summary: 'The one action to take now: a command to run, something to relay to the operator, or a time to wait until. Do it, then run `mw next` again.',
		input: Schema.Struct({}),
		output: Action,
		idempotent: true,
		run: () => nextAction(),
	}),
	command({
		name: 'init',
		summary: 'Register a project, or update its config. The config lives in Made Well\'s home, never in the project. Items held for a missing ship command go on.',
		input: Schema.Struct({
			workspace: Workspace,
			ship: optional('shell command run in the workspace after every check passes: merge to main and deploy. Required the first time.'),
			alert: optional('shell command run once per hold, with the hold as JSON on stdin and MW_ITEM, MW_TITLE, MW_HOLD, MW_MESSAGE set'),
		}),
		output: Schema.Struct({ project: Project, released: Schema.Array(ItemView), next: Schema.Array(Next) }),
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const store = yield* Store
			const path = resolve(input.workspace ?? '.')
			if (!existsSync(path)) return yield* new MadeWellError({ code: 'workspace_missing', message: `There is no directory ${path}.`, context: { workspace: path }, next: [{ run: 'pwd', why: 'run mw init from the project directory, or pass its path with --workspace' }] })
			const projects = yield* readProjects(registry)
			if (!input.ship && !projects.find((p) => p.path === path)?.ship) return yield* usageError('init', `${path} is not registered yet: init needs --ship, the command that merges to main and deploys.`)
			const project = yield* saveProject(registry, { path, ...(input.ship ? { ship: input.ship } : {}), ...(input.alert ? { alert: input.alert } : {}) })
			const updated = yield* readProjects(registry)
			const waiting = openHolds(store).filter((h) => h.code === 'no_ship_command' && projectFor(updated, h.workspace)?.path === path)
			for (const h of waiting) yield* retry(h.item)
			return { project, released: waiting.map((h) => view(store.get(h.item)!)), next: [{ run: 'mw next', why: 'see what to do now' }] }
		}),
	}),
	command({
		name: 'discover',
		summary: 'Turn raw input (notes, transcripts, meetings) into candidate work items, which wait for the operator to promote them.',
		input: Schema.Struct({ ...Source, workspace: Workspace, title: optional('a title for the discovery run') }),
		output: Created,
		idempotent: true,
		prepare: (input) => Effect.gen(function* () {
			const source = yield* readSource(input)
			if (!source) return yield* usageError('discover', 'discover needs the raw input: --source "<text>" or --source-file <file>.')
			return { source, workspace: yield* registered(input.workspace) }
		}),
		run: (input, { source, workspace }) => Effect.gen(function* () {
			const title = input.title ?? `Discovery of ${input['source-file'] ? basename(input['source-file']) : 'raw input'}`
			const item = createOnce(yield* Store, { title, objective: 'Turn the raw input into candidate work items.', source, workspace, job: 'discover' })
			return { item: view(item), next: [{ run: 'mw run', why: 'run discovery; its candidates wait for promotion' }] }
		}),
	}),
	command({
		name: 'promote',
		summary: 'Send a discovery run\'s candidates into delivery: all of them, or the ones named.',
		args: ['discovery', 'ids...'],
		input: Schema.Struct({ discovery: Id.annotate({ description: 'the discovery run' }), ids: Schema.Array(Id).annotate({ description: 'the candidates to promote; none means all' }) }),
		output: Schema.Struct({ promoted: Schema.Array(ItemView), next: Schema.Array(Next) }),
		idempotent: true,
		run: (input) => promote(input.discovery, input.ids).pipe(Effect.map((promoted) => ({ promoted: promoted.map(view), next: [{ run: 'mw run', why: 'deliver them, oldest first' }] }))),
	}),
	command({
		name: 'start',
		summary: 'Add one work item straight to the delivery queue.',
		input: Schema.Struct({ objective: Schema.String.annotate({ description: 'one line: what done means' }), ...Source, workspace: Workspace, title: optional('defaults to the objective') }),
		output: Created,
		idempotent: true,
		prepare: (input) => Effect.gen(function* () {
			const source = yield* readSource(input)
			if (!source) return yield* usageError('start', 'start needs the operator\'s own words: --source "<text>" or --source-file <file>.')
			return { source, workspace: yield* registered(input.workspace) }
		}),
		run: (input, { source, workspace }) => Effect.gen(function* () {
			const item = createOnce(yield* Store, { title: input.title ?? input.objective, objective: input.objective, source, workspace })
			return { item: view(item), next: [{ run: 'mw run', why: 'deliver it; it moves through all four stages and ships on a passing check' }] }
		}),
	}),
	command({
		name: 'run',
		summary: 'Deliver every item that can move, oldest first, and alert each new hold once. Returns once every item has shipped or holds; --watch keeps waiting for new work.',
		input: Schema.Struct({ watch: Schema.optionalKey(Schema.Boolean.annotate({ description: 'keep running and pick up new work as it arrives' })) }),
		output: Board,
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const prescriptions = yield* loadPrescriptions(prescriptionsPath())
			// The first sweep waits until runQueue holds the runner claim, so only the runner ever alerts.
			yield* Effect.forkScoped(Effect.forever(Effect.andThen(Effect.sleep('2 seconds'), alertHolds(registry))))
			yield* runQueue({ prescriptions }, { watch: input.watch })
			yield* alertHolds(registry)
			return board(yield* Store)
		}).pipe(Effect.scoped),
	}),
	command({
		name: 'status',
		summary: 'Every item and what moves it; or one item.',
		args: ['id'],
		input: Schema.Struct({ id: Schema.optionalKey(Id) }),
		output: Schema.Union([Board, ItemView]),
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const store = yield* Store
			return input.id === undefined ? board(store) : view(yield* found(store, input.id))
		}),
	}),
	command({
		name: 'show',
		summary: 'One item with its full record and event history.',
		args: ['id'],
		input: Schema.Struct({ id: Id }),
		output: Schema.Struct({ ...ItemView.fields, item: Fact, events: Schema.Array(Fact) }),
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const store = yield* Store
			const item = yield* found(store, input.id)
			return { ...view(item), item: { ...item }, events: store.events(item.id).map((e) => ({ ...e })) }
		}),
	}),
	command({
		name: 'holds',
		summary: 'Every open hold, oldest first: what the operator must answer or fix, and whether its alert went out.',
		input: Schema.Struct({}),
		output: Schema.Struct({ holds: Schema.Array(HoldView), next: Schema.Array(Next) }),
		idempotent: true,
		run: () => Effect.gen(function* () {
			const store = yield* Store
			const holds = openHolds(store).map((h) => holdView(store, h))
			return { holds, next: holds.flatMap((h) => h.next) }
		}),
	}),
	command({
		name: 'answer',
		summary: 'Answer a held item: an agent\'s open questions, or, with --cause, a failed check.',
		args: ['id', 'text...'],
		input: Schema.Struct({
			id: Id,
			text: Schema.NonEmptyString.annotate({ description: 'the operator\'s answer' }),
			cause: Schema.optionalKey(Schema.Literals(['implementation', 'test', 'pre-existing']).annotate({ description: 'for a failed check: the new code is wrong, the check is wrong, or the defect predates this work' })),
		}),
		output: Created,
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			yield* answer(input.id, input.text, input.cause)
			return { item: view((yield* Store).get(input.id)!), next: [{ run: 'mw run', why: 'continue delivering it' }] }
		}),
	}),
	command({
		name: 'retry',
		summary: 'Run a held item again from where it stopped.',
		args: ['id'],
		input: Schema.Struct({ id: Id }),
		output: Created,
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			yield* retry(input.id)
			return { item: view((yield* Store).get(input.id)!), next: [{ run: 'mw run', why: 'continue delivering it' }] }
		}),
	}),
	command({
		name: 'replay',
		summary: 'Write the replay of the whole flow to one self-contained page, beside the store unless --out names a file.',
		input: Schema.Struct({ out: optional('defaults to replay.html beside the store') }),
		output: Schema.Struct({ replay: Schema.String, next: Schema.Array(Next) }),
		run: (input) => Effect.gen(function* () {
			const out = resolve(input.out ?? resolve(dirname(storePath), 'replay.html'))
			writeFileSync(out, replayHtml(snapshot(yield* Store)))
			return { replay: out, next: [{ run: `open ${quote(out)}`, why: 'step through the whole flow' }] }
		}),
	}),
	command({
		name: 'export',
		summary: 'One folder per agent call of an item: brief, packet, answer, raw stream, tool events and flags. Written beside the store unless --out names a directory.',
		args: ['id'],
		input: Schema.Struct({ id: Id, out: optional('defaults to exports/<id> beside the store') }),
		output: Schema.Struct({ export: Schema.String, calls: Schema.Number, next: Schema.Array(Next) }),
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const exported = yield* exportItem(yield* Store, input.id, resolve(input.out ?? resolve(dirname(storePath), 'exports', String(input.id))))
			return { export: exported.dir, calls: exported.calls, next: [{ run: `ls ${quote(exported.dir)}`, why: 'one folder per call: brief, packet, answer, raw stream, tools.json and flags.json' }] }
		}),
	}),
]

// ── The manual and the dispatcher, both read from COMMANDS ─────────────────────────────────────────────

const fieldsOf = (c: AnyCommand) => Object.entries(c.input.fields)
const positional = (c: AnyCommand) => (c.args ?? []).map((a) => a.replace('...', ''))
const isOptional = (f: Schema.Constraint) => f.ast.context?.isOptional === true

const usageOf = (c: AnyCommand) => {
	const fields = c.input.fields
	const args = (c.args ?? []).map((a) => {
		const name = a.replace('...', '')
		const rest = a.endsWith('...') ? '...' : ''
		return isOptional(fields[name]!) || fields[name]!.ast._tag === 'Arrays' ? `[${name}${rest}]` : `<${name}${rest}>`
	})
	const options = fieldsOf(c).filter(([k]) => !positional(c).includes(k)).map(([k, f]) => {
		const flag = f.ast._tag === 'Boolean' ? `--${k}` : `--${k} <${k}>`
		return isOptional(f) ? `[${flag}]` : flag
	})
	return ['mw', c.name, ...args, ...options].join(' ')
}

// Defaults every JSON Schema reader assumes anyway; dropping them halves the manual.
const DEFAULTS: Record<string, unknown> = { additionalProperties: true, minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER }
const $defs: Record<string, unknown> = {}
const jsonSchema = (schema: Schema.Top) => {
	const doc = JSON.parse(JSON.stringify(Schema.toJsonSchemaDocument(schema), (k, v) => (DEFAULTS[k] === v ? undefined : v)))
	Object.assign($defs, doc.definitions)
	return doc.schema
}

const manual = Effect.gen(function* () {
	const store = yield* Store
	const items = store.list()
	const commands = COMMANDS.map((c) => ({ name: c.name, usage: usageOf(c), summary: c.summary, idempotent: c.idempotent ?? false, input: jsonSchema(Schema.toType(c.input)), output: jsonSchema(c.output) }))
	return {
		manual: 'mw',
		about: 'Made Well delivers software work items to production with coding agents: ideation, planning, implementation and verification, each a separate agent, shipping when every check passes. Discovery turns raw notes into candidate items; the operator promotes the ones to deliver.',
		use: 'Run `mw next` and do its action: run its command; or relay what it says to the operator and run the `then` command that fits their reply, with their words in place of the <...> slot; or wait until its time. Then run `mw next` again.',
		output: 'Every command prints JSON. Results go to stdout. Errors go to stderr as {error, message, context, cause?, next} with exit code 1; `error` is one of the codes below and `context` has that code\'s shape.',
		commands,
		errors: Object.fromEntries(Object.entries(ERRORS).map(([code, e]) => [code, { means: e.means, context: jsonSchema(e.context) }])),
		$defs,
		state: {
			home: dirname(registry),
			store: existsSync(storePath) ? storePath : null,
			projects: yield* readProjects(registry),
			items: Object.fromEntries([...new Set(items.map((i) => i.status))].map((s) => [s, items.filter((i) => i.status === s).length])),
			next: yield* nextAction(),
		},
	}
})

const SLOT = /^<[^<>]+>$/

const program = Effect.gen(function* () {
	const [name, ...argv] = process.argv.slice(2)
	if (name === undefined) return { store: false, effect: manual }
	const c = COMMANDS.find((c) => c.name === name)
	if (!c) return yield* usageError(name, `Unknown command "${name}". The commands are: ${COMMANDS.map((c) => c.name).join(', ')}.`)
	const names = positional(c)
	const { positionals, values } = yield* Effect.try({
		try: () => parseArgs({
			args: argv, allowPositionals: true, strict: true,
			options: Object.fromEntries(fieldsOf(c).filter(([k]) => !names.includes(k)).map(([k, f]) => [k, { type: f.ast._tag === 'Boolean' ? 'boolean' as const : 'string' as const }])),
		}),
		catch: (e) => usageError(name, (e as Error).message),
	})
	const raw: Record<string, unknown> = { ...values }
	;(c.args ?? []).forEach((a, i) => {
		const field = a.replace('...', '')
		const value = a.endsWith('...') ? (c.input.fields[field]!.ast._tag === 'Arrays' ? positionals.slice(i) : positionals.slice(i).join(' ').trim() || undefined) : positionals[i]
		if (value !== undefined) raw[field] = value
	})
	if (positionals.length > names.length && !c.args?.at(-1)?.endsWith('...')) return yield* usageError(name, `Unexpected argument "${positionals[names.length]}". Usage: ${usageOf(c)}`)
	const slot = [...positionals, ...Object.values(values)].find((v) => typeof v === 'string' && SLOT.test(v.trim()))
	if (slot) return yield* usageError(name, `Replace the placeholder ${slot} with the real value before running the command.`)
	const input = yield* (Schema.decodeUnknownEffect(c.input)(raw) as Effect.Effect<any, Schema.SchemaError>).pipe(
		Effect.mapError((e) => usageError(name, `${e.message}\nUsage: ${usageOf(c)}`)),
	)
	if (!c.prepare) return { store: false, effect: c.run(input, undefined) }
	const prepared = yield* c.prepare(input)
	return { store: true, effect: c.run(input, prepared) }
}).pipe(
	Effect.flatMap(({ store, effect }) => (effect as Effect.Effect<unknown, MadeWellError, Store | Worker>).pipe(
		Effect.provide(Layer.mergeAll(storeLayer(store || existsSync(storePath) ? storePath : ':memory:'), workerLayer)),
	)),
)

const exit = await Effect.runPromise(program.pipe(Effect.match({ onSuccess: (out) => ({ out, code: 0 }), onFailure: (e) => ({ out: errorJson(e), code: 1 }) })))
const text = JSON.stringify(exit.out) + '\n'
if (exit.code) process.stderr.write(text)
else process.stdout.write(text)
process.exitCode = exit.code
