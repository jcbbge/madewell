#!/usr/bin/env node
// `mw`: Made Well's one command, built for the agent driving it. `mw` alone prints the manual: every
// command with its input and output schemas, every error code with its context shape, and the current
// state. `mw next` names the one action to take now. Results go to stdout as JSON; errors go to stderr as
// {error, message, context, cause?, next} with exit code 1. The manual is generated from COMMANDS, so it
// cannot drift from what the commands accept and return.
//
// Reading never creates anything: a command opens the store only if it exists, except `start` and
// `discover`, which create it once their input is known to be good.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { constants as osConstants } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { Clock, Effect, Fiber, Layer, Schema } from 'effect'
import { loadPrescriptions } from './cards.ts'
import { itemHome } from './change.ts'
import { answer, drop, go, nextFor, promote, retry, runQueue, stuck } from './engine.ts'
import { ERRORS, MadeWellError, Next, condense, errorJson, quote } from './errors.ts'
import { EvalReport, JOBS, evaluate } from './eval.ts'
import { laneOf, loadPack, Pack, SOFTWARE, stepOf } from './lane.ts'
import { Gate, Project, alertHolds, openHolds, projectFor, projectsPath, readProjects, saveProject, type OpenHold } from './project.ts'
import { DEFAULT_AUTONOMY, Store, defaultStorePath, storeLayer, type Autonomy, type Item } from './store.ts'
import { harnessWorker } from './harness.ts'
import { exportItem } from './export.ts'
import { stats } from './telemetry.ts'
import { lensOf } from './trace.ts'
import { serve, service, staticPage, thisHost, watch } from './ui.ts'
import { Worker, commandWorker } from './worker.ts'

const storePath = defaultStorePath()
const registry = projectsPath(storePath)
const prescriptionsPath = () => process.env.MW_PRESCRIPTIONS ?? new URL('../prescriptions.json', import.meta.url).pathname

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

const Nq = Schema.Struct({ from: Schema.String, status: Schema.String, turns: Schema.Int }).annotate({ description: 'the open NQ exchange: who handed off, whose move it is, and turns answered' })
const ItemView = Schema.Struct({
	id: Schema.Int, title: Schema.String, status: Schema.String, stage: Schema.String, job: Schema.String, profile: Schema.String,
	kind: Schema.optionalKey(Schema.String), discovery: Schema.optionalKey(Schema.Int),
	nq: Schema.optionalKey(Nq),
	tracks: Schema.optionalKey(Schema.Record(Schema.String, Schema.Struct({ done: Schema.Boolean, nq: Schema.optionalKey(Nq) })).annotate({ description: 'after planning: the implementer\'s and the test architect\'s parallel tracks' })),
	round: Schema.Int, waitsOn: Schema.optionalKey(Schema.Int),
	after: Schema.optionalKey(Schema.Array(Schema.Int).annotate({ description: 'the items it builds on; it starts once they have shipped' })), resumesAt: Schema.optionalKey(Schema.String),
	hold: Schema.optionalKey(Schema.Struct({ code: Schema.String, message: Schema.String, context: Fact })),
	shipped: Schema.optionalKey(Schema.Struct({ command: Schema.String, output: Schema.String })),
	next: Schema.Array(Next),
}).annotate({ identifier: 'Item' })

const HoldView = Schema.Struct({
	item: Schema.Int, title: Schema.String, workspace: Schema.String, code: Schema.String, message: Schema.String, context: Fact,
	since: Schema.String, alerted: Schema.NullOr(Schema.Struct({ at: Schema.String, exitCode: Schema.Int })), next: Schema.Array(Next),
}).annotate({ identifier: 'Hold' })

const Board = Schema.Struct({ summary: Schema.String, items: Schema.Array(ItemView), next: Schema.Array(Next) }).annotate({ identifier: 'Board' })

const ServiceView = Schema.Struct({
	service: Schema.String.annotate({ description: 'the unit (Linux) or label (macOS)' }), platform: Schema.String,
	installed: Schema.Boolean, running: Schema.Boolean.annotate({ description: 'as the service manager reports it' }), answering: Schema.Boolean.annotate({ description: 'its address answered /api/mark just now' }),
	address: Schema.NullOr(Schema.String), unit: Schema.optionalKey(Schema.String.annotate({ description: 'the unit or plist file' })), execStart: Schema.optionalKey(Schema.String.annotate({ description: 'the command line the service runs: the build that installed it' })),
	pid: Schema.optionalKey(Schema.NullOr(Schema.Int)), changed: Schema.optionalKey(Schema.Boolean), wrote: Schema.optionalKey(Schema.Array(Schema.String)), removed: Schema.optionalKey(Schema.Array(Schema.String)),
	linger: Schema.optionalKey(Schema.String.annotate({ description: 'Linux: whether the user\'s services may run with no login, and what loginctl said' })),
	next: Schema.Array(Next),
}).annotate({ identifier: 'Service' })

const Pruned = Schema.Struct({
	before: Schema.String.annotate({ description: 'the cutoff applied, ISO; a later time than now counts as now' }),
	dryRun: Schema.Boolean,
	summary: Schema.String,
	items: Schema.Array(Schema.Int).annotate({ description: 'the items removed; with --dry-run, the items it would remove' }),
	records: Schema.Struct({ events: Schema.Int, calls: Schema.Int, toolEvents: Schema.Int, evals: Schema.Int, evalCalls: Schema.Int }).annotate({ description: 'rows removed with them; events include the runner\'s own from before the cutoff' }),
	files: Schema.Array(Schema.String).annotate({ description: 'removed beside the store: their exports/<id> and items/<id> folders, and replay.html, which holds their record' }),
	kept: Schema.Array(Schema.Struct({ id: Schema.Int, status: Schema.String, why: Schema.String })).annotate({ description: 'finished items older than the cutoff that stay, because work still in flight needs them' }),
	freed: Schema.NullOr(Schema.Int).annotate({ description: 'bytes given back to the disk: the store shrinking and the files removed; null on a dry run' }),
	next: Schema.Array(Next),
}).annotate({ identifier: 'Pruned' })

const Action = Schema.Union([
	Schema.Struct({
		action: Schema.Literal('relay'), say: Schema.String.annotate({ description: 'what to tell the operator' }),
		hold: Schema.optionalKey(HoldView),
		candidates: Schema.optionalKey(Schema.Array(Schema.Struct({ id: Schema.Int, title: Schema.String, kind: Schema.String, objective: Schema.String }))),
		then: Schema.Array(Next).annotate({ description: 'run the one that fits the operator\'s reply, with their words in place of the <...> slot' }),
	}),
	Schema.Struct({ action: Schema.Literal('wait'), until: Schema.String.annotate({ description: 'ISO time' }), why: Schema.String, then: Schema.Literal('mw next') }),
]).annotate({ identifier: 'Action', description: 'relay to the operator, or wait until a time; Made Well never asks anyone else to drive it' })

const Created = Schema.Struct({ item: ItemView, next: Schema.Array(Next) })

const Tally = Schema.Struct({ calls: Schema.Int, minutes: Schema.Number, tokens: Schema.Number, refused: Schema.Int })
const Kinds = Schema.Record(Schema.String, Schema.Number).annotate({ description: 'agent minutes by call kind: intake, originator (NQ) and execute' })
const ItemRef = Schema.Struct({ item: Schema.Int, store: Schema.String, minutes: Schema.Number })
const Stats = Schema.Struct({
	dir: Schema.String, files: Schema.Array(Schema.String), lines: Schema.Int, from: Schema.NullOr(Schema.String), to: Schema.NullOr(Schema.String),
	projects: Schema.Array(Schema.Struct({
		host: Schema.String, workspace: Schema.String, ...Tally.fields, kinds: Kinds,
		items: Schema.Struct({ created: Schema.Int, shipped: Schema.Int, held: Schema.Int }),
		nq: Schema.Struct({ intakes: Schema.Int, questions: Schema.Int, share: Schema.Number.annotate({ description: 'intake and originator minutes over all agent minutes' }) }),
		leadTime: Schema.Struct({
			median: Schema.NullOr(Schema.Number), slowest: Schema.NullOr(ItemRef),
			shipped: Schema.Array(ItemRef).annotate({ description: 'minutes from created to shipped, slowest first' }),
			open: Schema.Array(Schema.Struct({ ...ItemRef.fields, status: Schema.Literals(['candidate', 'running', 'held']) })).annotate({ description: 'not shipped yet: minutes from created to its store\'s latest record, oldest first' }),
		}).annotate({ description: 'delivery items, by store and item id (ids are unique per store)' }),
		flags: Schema.Record(Schema.String, Schema.Int),
		jobs: Schema.Record(Schema.String, Schema.Struct({ ...Tally.fields, kinds: Kinds })),
		cards: Schema.Record(Schema.String, Tally).annotate({ description: 'keyed "harness · model · effort"' }),
	})),
	next: Schema.Array(Next),
}).annotate({ identifier: 'Stats' })

// ── Views ──────────────────────────────────────────────────────────────────────────────────────────────

const nqOf = (item: Item, x: Item['exchange']) =>
	x && x.status !== 'clear' ? { nq: { from: x.from.kind === 'job' ? stepOf(laneOf(item.pack), x.from.job).profile : x.from.kind, status: x.status, turns: x.turns.filter((t) => t.answer !== undefined).length } } : {}

/** `driven`: a live runner holds the store. Without one, an item marked running is not moving until `mw run`. */
const view = (item: Item, driven = true): typeof ItemView.Type => ({
	id: item.id,
	title: item.title,
	status: item.status,
	stage: stepOf(laneOf(item.pack), item.job).cartridge,
	job: item.job,
	profile: stepOf(laneOf(item.pack), item.job).profile,
	...(item.kind ? { kind: item.kind } : {}),
	...(item.discovery !== undefined ? { discovery: item.discovery } : {}),
	...nqOf(item, item.exchange),
	...(item.split ? { tracks: Object.fromEntries(Object.entries(item.split).map(([job, t]) => [job, { done: t?.done === true, ...nqOf(item, t?.exchange) }])) } : {}),
	round: item.round,
	...(item.waitsOn !== undefined ? { waitsOn: item.waitsOn } : {}),
	...(item.after?.length ? { after: item.after } : {}),
	...(item.resetsAt !== undefined ? { resumesAt: new Date(item.resetsAt).toISOString() } : {}),
	...(item.hold ? { hold: item.hold } : {}),
	...(item.shipped ? { shipped: item.shipped } : {}),
	next: item.status === 'held' || item.status === 'paused' ? nextFor(item) : item.status === 'candidate' ? [{ run: `mw promote ${item.discovery} ${item.id}`, why: 'send it into delivery' }] : item.status === 'discovered' ? [{ run: `mw promote ${item.id}`, why: 'send every candidate into delivery' }] : ['shipped', 'dropped'].includes(item.status) ? [] : item.status === 'queued' ? (driven || process.env.MW_AUTORUN !== '0' ? [{ run: `mw status ${item.id}`, why: 'queued: the machine picks it up by itself' }] : [{ run: 'mw run', why: 'deliver it' }]) : !driven ? [{ run: 'mw run', why: 'no runner is driving it: it resumes where it stopped' }] : [{ run: `mw status ${item.id}`, why: 'check on it later; it continues on its own' }],
})

const holdView = (store: Store['Service'], h: OpenHold): typeof HoldView.Type => ({ ...h, next: nextFor(store.get(h.item)!) })

const board = (store: Store['Service']): typeof Board.Type => {
	const items = store.list()
	const count = (s: Item['status']) => items.filter((i) => i.status === s).length
	const held = items.filter((i) => i.status === 'held' || i.status === 'paused')
	const driven = store.runner() !== null
	const moving = count('running') + count('waiting-quota') + count('waiting-prerequisite')
	return {
		summary: `${count('held') + count('paused')} need you, ${count('candidate')} candidates, ${moving} in progress${moving && !driven ? ' with no runner' : ''}, ${count('queued')} queued, ${count('shipped')} shipped`,
		items: items.map((i) => view(i, driven)),
		next: held.length ? held.flatMap(nextFor) : (count('queued') || moving) && !driven ? [{ run: 'mw run', why: 'deliver queued items and resume any whose runner stopped' }] : [],
	}
}

const found = (store: Store['Service'], id: number) => {
	const item = store.get(id)
	return item ? Effect.succeed(item) : Effect.fail(new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list every work item' }] }))
}

/** The workspace, if it is a registered project, with its project. */
const registered = Effect.fn('mw.registered')(function* (workspace: string | undefined) {
	const path = resolve(workspace ?? '.')
	const projects = yield* readProjects(registry)
	const project = projectFor(projects, path)
	if (project) return { path, project }
	return yield* new MadeWellError({
		code: 'project_not_found', message: `${path} is not a registered project.`, context: { workspace: path, projects: projects.map((p) => p.path) },
		next: [{ run: `mw init --workspace ${quote(path)}`, why: 'register it, then run this command again; add --ship "<command>" if shipping means more than pushing main' }],
	})
})

const AutonomyInput = Schema.optionalKey(Schema.Literals(['full', 'checkpoints', 'steps']).annotate({ description: 'how involved the operator is: checkpoints (the default: stop after discovery and before each ship), steps (also between cartridges), or full (no stops; questions decided by the rubric)' }))

/**
 * Ruling 17: a command that gives Made Well work starts the machine when no runner is alive, so turning the knob is the whole
 * act. MW_AUTORUN=0 leaves the runner to the operator. Returns what the operator should know next.
 */
const wake = Effect.fn('mw.wake')(function* (id?: number) {
	const store = yield* Store
	const watch: Next[] = [{ run: id === undefined ? 'mw status' : `mw status ${id}`, why: 'the machine is working on it by itself; this shows where it is' }, { run: 'mw ui', why: 'watch every step live' }]
	if (process.env.MW_AUTORUN === '0') return [{ run: 'mw run', why: 'deliver it: the operator starts the runner (MW_AUTORUN=0)' }]
	const movable = store.list().some((i) => i.parent === undefined && MOVING.includes(i.status) && !stuck(store, i))
	if (!movable || (yield* runner(store))) return watch
	const home = dirname(store.path)
	mkdirSync(home, { recursive: true })
	const log = openSync(join(home, 'runner.log'), 'a')
	spawn(process.execPath, [process.argv[1]!, 'run'], { detached: true, stdio: ['ignore', log, log], cwd: home, env: process.env }).unref()
	return watch
})

/** The cartridge pack a workspace's project plugs in, or undefined for the default software pack. */
const packFor = Effect.fn('mw.packFor')(function* (workspace: string) {
	const path = projectFor(yield* readProjects(registry), workspace)?.cartridges
	return path ? yield* loadPack(path) : undefined
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

/**
 * What prune removes: finished work (shipped and dropped items, and discovery runs) last changed before the cutoff. Every
 * other item is still moving or waits on the operator, and keeps what it builds on, waits on, was found by or
 * spawned; a missing one would block it for good. In a workspace with work in flight, the item merged last
 * stays too: in-flight items check the branch against its merge.
 */
const retention = (store: Store['Service'], before: string) => {
	const items = store.list()
	const live = items.filter((i) => i.status !== 'shipped' && i.status !== 'discovered' && i.status !== 'dropped')
	const links = (i: Item) => [i.waitsOn, i.parent, i.discovery, ...(i.after ?? [])]
	const lastMerge = new Map<string, { id: number; seq: number }>()
	for (const i of items.filter((i) => i.merged && live.some((l) => l.workspace === i.workspace))) {
		const seq = store.events(i.id).findLast((e) => e.kind === 'merged')?.seq ?? 0
		if (seq > (lastMerge.get(i.workspace)?.seq ?? 0)) lastMerge.set(i.workspace, { id: i.id, seq })
	}
	const old = items.filter((i) => !live.includes(i) && Date.parse(i.updated) < Date.parse(before))
	const why = (i: Item) => {
		const by = live.find((l) => links(l).includes(i.id) || links(i).includes(l.id))
		if (by) return `#${by.id} (${by.status}) needs it`
		if (lastMerge.get(i.workspace)?.id === i.id) return `the last merge into ${i.workspace}, which its in-flight items check the branch against`
	}
	const ids: number[] = []
	const kept: (typeof Pruned.Type)['kept'][number][] = []
	for (const i of old) {
		const w = why(i)
		if (w) kept.push({ id: i.id, status: i.status, why: w })
		else ids.push(i.id)
	}
	return { ids, kept }
}

/** Bytes on disk under a path. */
const sizeOf = (path: string): number => {
	if (!existsSync(path)) return 0
	const s = statSync(path)
	return s.isDirectory() ? readdirSync(path).reduce((n, f) => n + sizeOf(join(path, f)), 0) : s.size
}

/** The one action to take now. Work that can move without the operator comes first, then holds, then decisions. */
const nextAction = Effect.fn('mw.next')(function* (): Effect.fn.Return<typeof Action.Type, MadeWellError, Store> {
	const store = yield* Store
	const items = store.list()
	const moving = items.filter((i) => i.parent === undefined && MOVING.includes(i.status) && !stuck(store, i))
	const owner = moving.length ? yield* runner(store) : null
	if (moving.length && !owner) {
		// Nobody but the operator drives the machine (ruling 16): a stopped runner is the operator's to restart.
		return { action: 'relay', say: `The machine stopped with ${moving.length} item(s) it can move by itself. It starts again with any command that gives it work, or with \`mw run\`.`, then: [{ run: 'mw run', why: 'the operator restarts the machine; every item resumes where it stopped' }] }
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
	if (!project) {
		const init = `mw init --workspace ${quote(cwd)}`
		return {
			action: 'relay', say: `${cwd} is not a Made Well project yet. Register it, and shipping pushes main to its upstream; add a ship command if shipping means a deploy too.`,
			then: [{ run: init, why: 'register the project' }, { run: `${init} --ship "<the command that deploys what is on main>"`, why: 'register it with how it deploys' }],
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
			ship: optional('shell command run in the workspace once Made Well has brought a passing item onto main: deploy it. Without one, shipping pushes main to its upstream.'),
			autonomy: AutonomyInput,
			alert: optional('shell command run once per hold, with the hold as JSON on stdin and MW_ITEM, MW_TITLE, MW_HOLD, MW_MESSAGE set'),
			prepare: optional('shell command that makes a fresh job worktree usable (dependencies, env, a database), run in each one before the job; see the Project schema for its environment and output'),
			cartridges: optional('a cartridge pack file (JSON) that replaces the default software lane for this project\'s new work; "default" goes back to it. `mw cartridges` prints the default pack to start from.'),
			conventions: optional('the rules this repo\'s work follows that no gate catches, as a JSON array of strings, such as ["Colours come from the design tokens in src/tokens.css"]. Every plan turns each into a done-when item its checks prove, or says why it does not apply. Replaces the set given before; [] removes them.'),
			gates: optional('the repo\'s own gates as JSON: [{"run": "<command; {files} becomes the matched changed files>", "glob": "*.css"}]. Made Well runs them on each item\'s changed files before its checks, keeps the files they fix, and a failing one goes to the arbiter. Replaces the set given before; [] removes them. Migrating from lefthook: one entry per pre-commit job, {staged_files} written as {files}.'),
		}),
		output: Schema.Struct({ project: Project, next: Schema.Array(Next) }),
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const path = resolve(input.workspace ?? '.')
			if (!existsSync(path)) return yield* new MadeWellError({ code: 'workspace_missing', message: `There is no directory ${path}.`, context: { workspace: path }, next: [{ run: 'pwd', why: 'run mw init from the project directory, or pass its path with --workspace' }] })
			const gates = input.gates === undefined ? undefined : yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(Gate)))(input.gates).pipe(
				Effect.mapError((e) => usageError('init', `--gates must be a JSON array of {run, glob?}: ${e.message}`)),
			)
			const conventions = input.conventions === undefined ? undefined : yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(Schema.NonEmptyString)))(input.conventions).pipe(
				Effect.mapError((e) => usageError('init', `--conventions must be a JSON array of non-empty strings: ${e.message}`)),
			)
			// A pack is checked against the console's contract before it is registered, so no work ever starts on one that does not plug in.
			const cartridges = input.cartridges === undefined || input.cartridges === 'default' ? input.cartridges : resolve(input.cartridges)
			if (cartridges && cartridges !== 'default') yield* loadPack(cartridges)
			const saved = yield* saveProject(registry, { path, ...(input.ship ? { ship: input.ship } : {}), ...(input.alert ? { alert: input.alert } : {}), ...(input.prepare ? { prepare: input.prepare } : {}), ...(gates ? { gates } : {}), ...(conventions ? { conventions } : {}), ...(cartridges ? { cartridges } : {}), ...(input.autonomy ? { autonomy: input.autonomy } : {}) })
			const project = cartridges === 'default' ? yield* saveProject(registry, (({ cartridges: _, ...rest }) => rest)(saved), true) : saved
			return { project, next: [{ run: `mw discover --workspace ${quote(path)} --source-file <notes>`, why: 'put the raw notes in: Made Well discovers the work and delivers it' }, { run: `mw start --workspace ${quote(path)} --objective "<one line>" --source "<the operator's own words>"`, why: 'deliver one piece of work straight away' }] }
		}),
	}),
	command({
		name: 'cartridges',
		summary: 'The cartridge pack a project\'s work runs: discovery\'s and delivery\'s cartridges, each step\'s profile, duty, what it receives and the shape it returns. Without a pack of its own, the project runs the default software pack; save `.pack` to a file, change it, and plug it in with `mw init --cartridges <file>`. --check validates a pack file against the console\'s contract without registering it.',
		input: Schema.Struct({
			workspace: Workspace,
			check: optional('a cartridge pack file to validate instead'),
		}),
		output: Schema.Struct({
			source: Schema.String.annotate({ description: '"default", or the pack file' }),
			pack: Pack,
			lane: Schema.Struct({
				discovery: Schema.Array(Schema.String).annotate({ description: 'each step as "cartridge / job (profile)", in order' }),
				delivery: Schema.Array(Schema.String),
			}),
			next: Schema.Array(Next),
		}),
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const path = input.check ? resolve(input.check) : projectFor(yield* readProjects(registry), resolve(input.workspace ?? '.'))?.cartridges
			const pack = path ? yield* loadPack(path) : SOFTWARE
			const lane = laneOf(path ? pack : undefined)
			const line = (s: { cartridge: string; job: string; profile: string }) => `${s.cartridge} / ${s.job} (${s.job === 'verify' ? 'made well' : s.profile})`
			return {
				source: path ?? 'default', pack, lane: { discovery: lane.discovery.map(line), delivery: lane.delivery.map(line) },
				next: input.check ? [{ run: `mw init --cartridges ${quote(path!)}`, why: 'plug it into this project; new work runs it' }] : [{ run: 'mw cartridges | jq .pack > pack.json', why: 'start a pack of your own from this one' }],
			}
		}),
	}),
	command({
		name: 'discover',
		summary: 'Turn raw input (notes, transcripts, meetings) into candidate work items, which wait for the operator to promote them.',
		input: Schema.Struct({ ...Source, workspace: Workspace, title: optional('a title for the discovery run'), autonomy: AutonomyInput }),
		output: Created,
		idempotent: true,
		prepare: (input) => Effect.gen(function* () {
			const source = yield* readSource(input)
			if (!source) return yield* usageError('discover', 'discover needs the raw input: --source "<text>" or --source-file <file>.')
			return { source, ...(yield* registered(input.workspace)) }
		}),
		run: (input, { source, path: workspace, project }) => Effect.gen(function* () {
			const title = input.title ?? `Discovery of ${input['source-file'] ? basename(input['source-file']) : 'raw input'}`
			const pack = yield* packFor(workspace)
			const autonomy: Autonomy = input.autonomy ?? project.autonomy ?? DEFAULT_AUTONOMY
			const item = createOnce(yield* Store, { title, objective: 'Turn the raw input into candidate work items.', source, workspace, job: laneOf(pack).discovery[0]!.job, autonomy, ...(pack ? { pack } : {}) })
			return { item: view(item), next: yield* wake(item.id) }
		}),
	}),
	command({
		name: 'promote',
		summary: 'Send a discovery run\'s candidates into delivery: all of them, or the ones named.',
		args: ['discovery', 'ids...'],
		input: Schema.Struct({ discovery: Id.annotate({ description: 'the discovery run' }), ids: Schema.Array(Id).annotate({ description: 'the candidates to promote; none means all' }) }),
		output: Schema.Struct({ promoted: Schema.Array(ItemView), next: Schema.Array(Next) }),
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const promoted = yield* promote(input.discovery, input.ids)
			return { promoted: promoted.map((i) => view(i)), next: yield* wake() }
		}),
	}),
	command({
		name: 'start',
		summary: 'Add one work item straight to the delivery queue.',
		input: Schema.Struct({ objective: Schema.String.annotate({ description: 'one line: what done means' }), ...Source, workspace: Workspace, title: optional('defaults to the objective'), autonomy: AutonomyInput }),
		output: Created,
		idempotent: true,
		prepare: (input) => Effect.gen(function* () {
			const source = yield* readSource(input)
			if (!source) return yield* usageError('start', 'start needs the operator\'s own words: --source "<text>" or --source-file <file>.')
			return { source, ...(yield* registered(input.workspace)) }
		}),
		run: (input, { source, path: workspace, project }) => Effect.gen(function* () {
			const pack = yield* packFor(workspace)
			const autonomy: Autonomy = input.autonomy ?? project.autonomy ?? DEFAULT_AUTONOMY
			const item = createOnce(yield* Store, { title: input.title ?? input.objective, objective: input.objective, source, workspace, autonomy, ...(pack ? { pack } : {}) })
			return { item: view(item), next: yield* wake(item.id) }
		}),
	}),
	command({
		name: 'run',
		summary: 'Deliver every item that can move, oldest first, and alert each new hold once. Returns once every item has shipped or holds; --watch keeps waiting for new work. When Made Well is reinstalled or SIGHUP arrives, the runner finishes the steps in flight, starts nothing new, and replaces itself with the new build in the same process: it keeps the runner claim and carries on.',
		input: Schema.Struct({ watch: Schema.optionalKey(Schema.Boolean.annotate({ description: 'keep running and pick up new work as it arrives' })) }),
		output: Board,
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const prescriptions = yield* loadPrescriptions(prescriptionsPath())
			// The first sweep waits until runQueue holds the runner claim, so only the runner ever alerts.
			const sweep = yield* Effect.forkScoped(Effect.forever(Effect.andThen(Effect.sleep('2 seconds'), alertHolds(registry))))
			const reload = reloadWatch()
			const done = yield* runQueue({ prescriptions, reloading: reload.wanted }, { watch: input.watch, keepClaim: reload.wanted }).pipe(Effect.ensuring(Effect.sync(reload.stop)))
			// The last sweep runs alone: one still sending an alert would send it again.
			yield* Fiber.interrupt(sweep)
			yield* alertHolds(registry)
			// Every step in flight is saved: the new build takes this process, its pid and the runner claim, and redrives.
			if (done.reload) reload.exec()
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
			return input.id === undefined ? board(store) : view(yield* found(store, input.id), store.runner() !== null)
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
			return { ...view(item, store.runner() !== null), item: { ...item }, events: store.events(item.id).map((e) => ({ ...e })) }
		}),
	}),
	command({
		name: 'trace',
		summary: 'One durable and live trace at UX (done and proof), DX (pipeline diagnostics) or AX (full function tree) depth. Read-only.',
		args: ['id'],
		input: Schema.Struct({ id: Id, lens: Schema.optionalKey(Schema.Literals(['ux', 'dx', 'ax'])) }),
		output: Fact.annotate({ description: 'lens, depth, item, done, needsYou, state, next and proof; DX adds tracks, calls, live signals and diagnostics; AX adds inputs, outputs, streams and the function tree' }),
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const store = yield* Store
			const item = yield* found(store, input.id)
			return lensOf(store, item.id, input.lens ?? 'ux', nextFor(item))
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
		summary: 'Answer an item that waits on you: an agent\'s open questions, a failed check (with --cause), or, at a checkpoint, what should change.',
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
			return { item: view((yield* Store).get(input.id)!), next: yield* wake(input.id) }
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
			return { item: view((yield* Store).get(input.id)!), next: yield* wake(input.id) }
		}),
	}),
	command({
		name: 'go',
		summary: 'Let an item past the checkpoint it stopped at (autonomy checkpoints or steps): it goes on to its next step, or merges and ships. On a finished discovery run, sends every waiting candidate into delivery.',
		args: ['id'],
		input: Schema.Struct({ id: Id }),
		output: Created,
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			yield* go(input.id)
			return { item: view((yield* Store).get(input.id)!), next: yield* wake(input.id) }
		}),
	}),
	command({
		name: 'drop',
		summary: 'Abandon an item that will never ship (a duplicate, a mistake, work done another way): what it provisioned is torn down, its patches and checks are removed, an open prerequisite fix goes with it, and its record stays. Dropped items leave the holds and next; prune removes them like finished work. Holds the runner claim, so it waits while `mw run` is live.',
		args: ['id'],
		input: Schema.Struct({ id: Id }),
		output: Created,
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const store = yield* Store
			yield* Effect.acquireRelease(store.claimRunner(), () => Effect.sync(() => store.releaseRunner()))
			yield* drop(input.id)
			return { item: view(store.get(input.id)!), next: [{ run: 'mw next', why: 'see what to do now' }] }
		}).pipe(Effect.scoped),
	}),
	command({
		name: 'ui',
		summary: 'The web interface: a read-only page on this machine. At / is the Gazette sheet: what waits on the operator (each with the exact command to copy), every item\'s steps as rings, what runs now with its live output, repainted as the record moves. At /console is the full console: each item\'s pipeline with time, tokens and NQ questions per step, a timeline of every agent call, and each item\'s idea, plan, checks, diff, NQ exchanges and calls. Both read the JSON API under /api. Prints its address as one JSON line, then serves until interrupted; reach it from another computer with an SSH tunnel or a forwarded port. --install provisions it as an always-on background service of this user that starts at boot and restarts on failure (a systemd user unit on Linux, with lingering where allowed; a LaunchAgent on macOS), running this same build with the MW_* variables set now; running it again changes nothing. --status says whether it is installed, running and answering, and its address. --uninstall stops it and removes every file --install wrote.',
		input: Schema.Struct({
			port: Schema.optionalKey(Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 65535 })))).annotate({ description: 'defaults to 4747; 0 picks a free one' })),
			host: optional('the address to listen on; defaults to 127.0.0.1 (this machine only); 0.0.0.0 serves the network'),
			install: Schema.optionalKey(Schema.Boolean.annotate({ description: 'provision the always-on background service for this user and start it' })),
			uninstall: Schema.optionalKey(Schema.Boolean.annotate({ description: 'stop the service and remove every file --install wrote' })),
			status: Schema.optionalKey(Schema.Boolean.annotate({ description: 'whether the service is installed, running and answering, and its address' })),
		}),
		output: Schema.Union([Schema.Struct({ ui: Schema.String, store: Schema.String, next: Schema.Array(Next) }), ServiceView]),
		run: (input) => {
			const actions = (['install', 'uninstall', 'status'] as const).filter((a) => input[a])
			if (actions.length > 1) return usageError('ui', `Give one of --install, --uninstall or --status, not ${actions.map((a) => `--${a}`).join(' and ')}.`)
			if (actions[0]) return service(thisHost(), actions[0], { ...(input.port !== undefined ? { port: input.port } : {}), ...(input.host !== undefined ? { host: input.host } : {}) })
			return serve(storePath, nextFor, input.host ?? '127.0.0.1', input.port ?? 4747)
		},
	}),
	command({
		name: 'watch',
		summary: 'Follow the run. In a terminal: the console redrawn every second (what runs now with its latest output, where every item is, what needs you and the commands that resolve it, and the log); its first line shows the web interface\'s address when it is up, or `mw ui --install` when it is not, and `w` opens it in a browser here or prints the SSH port-forward line for a computer that has one. Read by a program: every event as one JSON line {event} with who acted and a plain sentence, and every agent call {call} once it ends, then each new one as it happens. --since <event seq> carries on from there; --once prints what there is and stops.',
		input: Schema.Struct({
			since: Schema.optionalKey(Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)))).annotate({ description: 'stream only events after this seq' })),
			once: Schema.optionalKey(Schema.Boolean.annotate({ description: 'print what there is now, then stop' })),
		}),
		output: Schema.Struct({ watched: Schema.String, next: Schema.Array(Next) }),
		idempotent: true,
		run: (input) => watch(storePath, nextFor, { tty: process.stdout.isTTY === true, since: input.since ?? 0, once: input.once ?? false }),
	}),
	command({
		name: 'replay',
		summary: 'Write the console as one self-contained page with the whole record inside it (every item, call, NQ exchange and event), readable with no server; beside the store unless --out names a file.',
		input: Schema.Struct({ out: optional('defaults to replay.html beside the store') }),
		output: Schema.Struct({ replay: Schema.String, next: Schema.Array(Next) }),
		run: (input) => Effect.gen(function* () {
			const out = resolve(input.out ?? resolve(dirname(storePath), 'replay.html'))
			writeFileSync(out, staticPage(yield* Store, nextFor))
			return { replay: out, next: [{ run: `open ${quote(out)}`, why: 'read the whole run: every item, its pipeline, calls and NQ exchanges' }] }
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
	command({
		name: 'stats',
		summary: 'Metrics from the telemetry files of every machine in a directory (MW_TELEMETRY, or --dir): per host and project, items created, shipped and held; lead time from creation to ship (median, slowest, each item) and the age of items still open; NQ intakes, questions and share of agent minutes; calls, agent minutes (split by call kind: intake, originator, execute), tokens and refusals per job and per card; rule-break flags. With MW_TELEMETRY=<dir> set, each machine appends every event, call (in full) and span to its own <host>-<store>.jsonl there. MW_TELEMETRY_LEVEL=metrics writes counts, timings, cards and outcomes but no prompts, answers or repo text; the numbers here are the same.',
		input: Schema.Struct({ dir: optional('the telemetry directory; defaults to MW_TELEMETRY') }),
		output: Stats,
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const dir = input.dir ?? process.env.MW_TELEMETRY
			if (!dir) return yield* usageError('stats', 'No telemetry directory: set MW_TELEMETRY=<dir> on every machine, or pass --dir <dir>.')
			const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort() : []
			const lines = files.flatMap((f) => readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean))
			return { dir: resolve(dir), files, lines: lines.length, ...stats(lines), next: files.length ? [] : [{ run: `export MW_TELEMETRY=${quote(resolve(dir))}`, why: 'set it on every machine that runs Made Well, so each writes its file there' }] }
		}),
	}),
	command({
		name: 'eval',
		summary: 'Replay a job\'s recorded calls on another card or brief through the worker, score record and replay deterministically (required JSON fields, rule-break flags, seconds, tokens), and recommend the cheapest card that matches or beats the record. Replays run in throwaway worktrees; results go only to the store; no file changes.',
		args: ['job'],
		input: Schema.Struct({
			job: Schema.NonEmptyString.annotate({ description: `the job whose recorded calls to replay: its intake, originator and execute calls (${JOBS.join(', ')}, or a cartridge's own job)` }),
			card: optional('a tier name (every card in it) or one card as JSON {harness, provider, account, model, effort}; defaults to each call\'s recorded card'),
			brief: optional('a file whose text replaces the job\'s brief; only execute calls are replayed'),
			item: optional('only calls of these work items, comma-separated: 3,5'),
			limit: Schema.optionalKey(Id.annotate({ description: 'replay at most this many calls, the most recent' })),
		}),
		output: EvalReport,
		run: (input) => Effect.gen(function* () {
			const prescriptions = yield* loadPrescriptions(prescriptionsPath())
			return yield* evaluate({ ...input, prescriptions, prescriptionsPath: prescriptionsPath() })
		}),
	}),
	command({
		name: 'prune',
		summary: 'Retention: remove finished work last changed before --before, with everything recorded about it, and give the space back. Finished means shipped, dropped, or a discovery run none of whose candidates still waits; work still moving or waiting on the operator stays, with each finished item it builds on or waits on. Goes with it: its events, calls, tool events and evals, its exports/<id> and items/<id> folders, and replay.html beside the store. Telemetry files are the operator\'s and stay. --dry-run shows what would go. Prune holds the runner claim, so it refuses while `mw run` is live.',
		input: Schema.Struct({
			before: Schema.String.annotate({ description: 'an ISO date or time: 2026-09-30 (its start, UTC) or 2026-09-30T12:00:00Z' }),
			'dry-run': Schema.optionalKey(Schema.Boolean.annotate({ description: 'report what would go and change nothing' })),
		}),
		output: Pruned,
		idempotent: true,
		run: (input) => Effect.gen(function* () {
			const at = Date.parse(input.before)
			if (!/^\d{4}-\d{2}-\d{2}/.test(input.before) || Number.isNaN(at)) return yield* usageError('prune', `--before "${input.before}" is not a date. Give an ISO date or time, such as 2026-09-30.`)
			// A cutoff in the future means everything finished so far, and nothing that finishes while prune works.
			const before = new Date(Math.min(at, yield* Clock.currentTimeMillis)).toISOString()
			const dryRun = input['dry-run'] === true
			const store = yield* Store
			if (!dryRun) {
				yield* Effect.acquireRelease(store.claimRunner(), () => Effect.sync(() => store.releaseRunner())).pipe(Effect.catchIf((e) => e.code === 'store_locked', (e) => {
					const context = e.context as typeof ERRORS.store_locked.context.Type
					return Effect.fail(new MadeWellError({
						code: 'store_locked', message: 'A live runner owns this Made Well store, so prune waits for it.', context,
						cause: 'Prune holds the runner claim while it works: giving space back locks the whole store, and a working runner must never wait on that.',
						next: [
							{ run: `mw prune --before ${before}`, why: 'once that runner has returned: `mw run` returns when every item has shipped or holds' },
							{ run: `mw prune --before ${before} --dry-run`, why: 'see now what it will remove; a dry run changes nothing and needs no claim' },
							{ run: `kill ${context.owner.pid} && mw prune --before ${before}`, why: 'only for a runner that never returns (`mw run --watch`); start it again afterwards, and its work resumes where it stopped' },
						],
					}))
				}))
			}
			const { ids, kept } = retention(store, before)
			// Files first, rows last: a prune stopped halfway selects the same items again and finishes.
			const home = dirname(storePath)
			const files = [...ids.flatMap((id) => [join(home, 'exports', String(id)), itemHome(storePath, id)]), ...(ids.length ? [join(home, 'replay.html')] : [])].filter(existsSync)
			const storeBytes = () => sizeOf(storePath) + sizeOf(`${storePath}-wal`)
			const start = storeBytes() + files.reduce((n, f) => n + sizeOf(f), 0)
			if (!dryRun) {
				for (const f of files) rmSync(f, { recursive: true, force: true })
				if (existsSync(join(home, 'exports')) && !readdirSync(join(home, 'exports')).length) rmSync(join(home, 'exports'), { recursive: true })
			}
			const { items: _, ...records } = store.prune(ids, before, dryRun)
			const what = `${ids.length} finished item(s) with ${records.events} events and ${records.calls} calls, and ${files.length} file(s)`
			const also = kept.length ? `; ${kept.length} older finished item(s) stay because work in flight needs them` : ''
			return {
				before, dryRun, summary: `${dryRun ? 'Would remove' : 'Removed'} ${what}${also}.`, items: ids, records, files, kept,
				freed: dryRun ? null : start - storeBytes(),
				next: dryRun && ids.length + records.events ? [{ run: `mw prune --before ${before}`, why: 'remove them; nothing still moving or waiting on the operator is touched' }] : [],
			}
		}).pipe(Effect.scoped),
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

/**
 * Hot reload for `mw run`. The installed build is this file: when it changes on disk (npm reinstalled Made Well),
 * or the runner gets SIGHUP, the runner stops starting work and, once the steps in flight are saved, execs the
 * build now on disk with the same arguments in the same process. Every step is saved before the next one, so the
 * new build redrives the queue from the store exactly as a restart would, with nothing stopped and no claim lost.
 */
function reloadWatch() {
	const self = fileURLToPath(import.meta.url)
	const stamp = () => {
		try {
			const s = statSync(self)
			return `${s.mtimeMs}:${s.size}:${s.ino}`
		} catch {
			return undefined
		}
	}
	const was = stamp()
	let wanted = false
	const want = () => void (wanted = true)
	process.on('SIGHUP', want)
	// npm replaces the file (a new inode) or rewrites it: either changes the stamp. A missing file mid-install waits.
	const timer = setInterval(() => {
		const now = stamp()
		if (now && now !== was) wanted = true
	}, 1000)
	timer.unref()
	return {
		wanted: () => wanted,
		stop: () => (clearInterval(timer), process.off('SIGHUP', want)),
		exec: () => process.execve!(process.execPath, [process.execPath, ...process.execArgv, realpathSync(process.argv[1]!), ...process.argv.slice(2)], { ...process.env, MW_BUILD: stamp() ?? '' }),
	}
}

// SIGINT and SIGTERM interrupt the work, so its finalizers kill agent process groups and release the runner.
const signalled = Effect.callback<{ out: unknown; code: number }>((resume) => {
	const on = (signal: NodeJS.Signals) => resume(Effect.succeed({ out: { interrupted: signal, next: [{ run: 'mw next', why: 'the interrupted work resumes where it stopped' }] }, code: 128 + osConstants.signals[signal] }))
	process.once('SIGINT', on).once('SIGTERM', on)
	return Effect.sync(() => process.off('SIGINT', on).off('SIGTERM', on))
})
const exit = await Effect.runPromise(Effect.raceFirst(program.pipe(Effect.match({ onSuccess: (out) => ({ out, code: 0 }), onFailure: (e) => ({ out: condense(errorJson(e)), code: 1 }) })), signalled))
const text = JSON.stringify(exit.out) + '\n'
if (exit.code) process.stderr.write(text)
else process.stdout.write(text)
process.exitCode = exit.code
