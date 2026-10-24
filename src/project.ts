// Projects and hold alerts. A project's config (how it ships, how its operator hears of a hold) lives in
// Made Well's home, next to the store, so the product repo carries no trace of Made Well.
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { Effect, Schema } from 'effect'
import { MadeWellError } from './errors.ts'
import { Store, type Hold, type Item } from './store.ts'

export const Gate = Schema.Struct({
	run: Schema.NonEmptyString.annotate({ description: 'shell command run from the repo root; {files} becomes the matched changed files, quoted. Exit 0 passes; files it rewrites among them (a formatter\'s fixes) are kept in the change.' }),
	glob: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'which changed files it runs on, such as "*.{ts,tsx}"; a glob without "/" matches the file name at any depth. Without it, every changed file. No match, no run.' })),
}).annotate({ identifier: 'Gate' })
export type Gate = typeof Gate.Type

export const Project = Schema.Struct({
	path: Schema.String.annotate({ description: 'the project\'s absolute workspace path' }),
	ship: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'shell command run in the workspace once Made Well has brought a passing item onto main: deploy it' })),
	alert: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'shell command run once per hold, with the hold as JSON on stdin and MW_ITEM, MW_TITLE, MW_HOLD, MW_MESSAGE set' })),
	prepare: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'shell command run in every fresh job worktree before the job, with MW_ITEM, MW_JOB, MW_NAME (unique per item and job, safe as a branch or database name), MW_WORKTREE, MW_PROJECT and MW_BASE set: it makes the worktree usable (dependencies, env, a database). Files it writes must be ignored by the repo. Its last JSON line may be {"provisioned": [{"kind", "id", "teardown"}]}: Made Well tears each down once. A failure holds the item before the job runs.' })),
	autonomy: Schema.optionalKey(Schema.Literals(['full', 'checkpoints', 'steps']).annotate({ description: 'how involved the operator is with new work: full (the default), checkpoints or steps; FOUNDATION ruling 17' })),
	cartridges: Schema.optionalKey(Schema.NonEmptyString.annotate({ description: 'the cartridge pack file this project\'s new work runs; without it, the default software pack' })),
	gates: Schema.optionalKey(Schema.Array(Gate).annotate({ description: 'the repo\'s own gates (linters, formatters), run by Made Well on each item\'s changed files before its checks; they replace a git hook manager such as lefthook' })),
}).annotate({ identifier: 'Project' })
export type Project = typeof Project.Type

const Registry = Schema.fromJsonString(Schema.Array(Project))

/** The registry sits beside the store: Made Well's home. */
export const projectsPath = (storePath: string) => join(dirname(storePath), 'projects.json')

/** Every registered project. A missing registry is an empty one; reading never creates anything. */
export const readProjects = Effect.fn('mw.readProjects')(function* (path: string) {
	if (!existsSync(path)) return [] as ReadonlyArray<Project>
	return yield* Schema.decodeUnknownEffect(Registry)(readFileSync(path, 'utf8')).pipe(
		Effect.mapError((e) => new MadeWellError({
			code: 'projects_invalid', message: `The project registry ${path} is not valid.`, context: { path, problems: String(e) },
			cause: 'It must be a JSON array of {path, ship?, alert?, prepare?, autonomy?, cartridges?, gates?: [{run, glob?}]}.',
			next: [{ run: `cat ${path}`, why: 'fix the entries named in context.problems' }],
		})),
	)
})

/** The project a workspace belongs to: the registered path it equals or sits inside, the deepest one first. */
export const projectFor = (projects: ReadonlyArray<Project>, workspace: string) =>
	projects.filter((p) => workspace === p.path || workspace.startsWith(p.path + sep)).sort((a, b) => b.path.length - a.path.length)[0]

/** Registers a project, or updates the fields given; `replace` writes the entry exactly as given. */
export const saveProject = Effect.fn('mw.saveProject')(function* (path: string, project: Project, replace = false) {
	const projects = yield* readProjects(path)
	const merged = replace ? project : { ...projects.find((p) => p.path === project.path), ...project }
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, JSON.stringify([...projects.filter((p) => p.path !== project.path), merged], null, 2) + '\n')
	return merged
})

export interface OpenHold extends Hold {
	readonly item: number
	readonly title: string
	readonly workspace: string
	readonly since: string
	readonly alerted: { readonly at: string; readonly exitCode: number } | null
}

/** Everything that waits on the operator, oldest first: every hold and every checkpoint, with when it began and whether its alert went out. */
export const openHolds = (store: Store['Service']): OpenHold[] =>
	store.list().filter((i): i is Item & { hold: Hold } => (i.status === 'held' || i.status === 'paused') && i.hold !== undefined).map((item) => {
		const events = store.events(item.id)
		const at = events.findLastIndex((e) => e.kind === 'held' || e.kind === 'paused')
		const alert = events.slice(at + 1).find((e) => e.kind === 'alerted')
		return {
			item: item.id, title: item.title, workspace: item.workspace, ...item.hold, since: events[at]?.at ?? item.updated,
			alerted: alert ? { at: alert.at, exitCode: alert.data.exitCode as number } : null,
		}
	}).sort((a, b) => a.since.localeCompare(b.since))

/**
 * Sends each hold's alert once: the project's alert command runs and the run is recorded against the hold.
 * Only the runner calls this, so two processes never alert the same hold; an alert lost to a crash goes out
 * on the next run. A failing alert command is recorded with its exit code and not repeated.
 */
export const alertHolds = (registry: string) =>
	Effect.gen(function* () {
		// The sweep runs every two seconds; only one that has an alert to send is a step worth a span.
		const holds = openHolds(yield* Store).filter((h) => !h.alerted)
		if (holds.length) yield* sendAlerts(registry, holds)
	})

const sendAlerts = Effect.fn('mw.alertHolds')(function* (registry: string, holds: ReadonlyArray<OpenHold>) {
	const store = yield* Store
	const projects = yield* readProjects(registry)
	for (const hold of holds) {
		const command = projectFor(projects, hold.workspace)?.alert
		if (!command) continue
		// Sending and recording are one step: an interrupt waits for it, so no alert goes out unrecorded.
		yield* Effect.uninterruptible(Effect.gen(function* () {
			const exitCode = yield* Effect.promise(() => new Promise<number>((done) => {
				const env = { ...process.env, MW_ITEM: String(hold.item), MW_TITLE: hold.title, MW_HOLD: hold.code, MW_MESSAGE: hold.message }
				const child = execFile('sh', ['-c', command], { cwd: dirname(registry), env }, (error) => done(error ? (typeof error.code === 'number' ? error.code : 1) : 0))
				child.stdin?.end(JSON.stringify(hold))
			}))
			store.save(store.get(hold.item)!, 'alerted', { code: hold.code, command, exitCode })
		}))
	}
})
