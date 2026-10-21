// Made Well's control of the product workspace. The law is enforced here, not requested of agents:
// each job gets its own git worktree, read-only calls are proved read-only, branches are watched, the
// change is held to its declared scope, and everything a job leaves behind is found and torn down.
import { execFile } from 'node:child_process'
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { Effect } from 'effect'
import { MadeWellError, type Next } from './errors.ts'

/** Files a harness reads as instructions from the working directory and every directory above it. */
const GUIDANCE = ['AGENTS.md', 'AGENT.md', 'CLAUDE.md', 'CLAUDE.local.md', 'GEMINI.md', '.cursorrules']
const TEARDOWN_TIMEOUT_MS = 5 * 60_000

/** Where job worktrees live: under Made Well's home, never inside a product repo. */
export const worktreesRoot = () => join(process.env.MW_HOME ?? join(homedir(), '.local', 'share', 'madewell'), 'worktrees')

const fail = (code: string, message: string, context: Record<string, unknown>, next: Next[], cause?: string) =>
	new MadeWellError({ code, message, context, next, ...(cause ? { cause } : {}) })

const exec = (command: string, args: string[], cwd: string, timeout = 0) =>
	Effect.promise(() => new Promise<{ code: number; stdout: string; stderr: string }>((done) =>
		execFile(command, args, { cwd, timeout, maxBuffer: 256 * 1024 * 1024 }, (error, stdout, stderr) =>
			done({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout, stderr }))))

// --no-optional-locks: reading never refreshes the index, so Made Well's own probes leave nothing behind.
const git = (dir: string, ...args: string[]) =>
	exec('git', ['--no-optional-locks', '-C', dir, ...args], dir).pipe(Effect.flatMap(({ code, stdout, stderr }) =>
		code === 0 ? Effect.succeed(stdout) : Effect.fail(fail('git_failed', `git ${args[0]} failed in ${dir}.`, { dir, args, exitCode: code, stderr: stderr.trim() }, [{ run: `git -C ${dir} ${args.join(' ')}`, why: 'run it yourself to see the full error' }]))))
const lines = (out: string) => out.split('\0').filter(Boolean)

export interface Worktree {
	readonly path: string
	readonly repo: string
	/** The full commit the worktree was made from. */
	readonly base: string
}

/**
 * A fresh detached worktree of `repo` at `base`, for one job. It is removed when the scope closes, on
 * success, failure or interruption. A worktree of the same name left by a crash is replaced, never reused.
 * Commits made in it stay reachable by hash after removal; read HEAD before the scope closes.
 */
export const worktree = Effect.fn('mw.worktree')(function* (repo: string, base: string, name: string) {
	const root = worktreesRoot()
	const path = join(root, name)
	if (!/^[\w.-]+$/.test(name)) return yield* fail('bad_worktree_name', `Worktree name "${name}" must be letters, digits, ".", "_" or "-".`, { name }, [])
	const above: string[] = []
	for (let dir = root; ; dir = dirname(dir)) {
		above.push(...GUIDANCE.map((f) => join(dir, f)).filter((f) => existsSync(f)))
		if (dirname(dir) === dir) break
	}
	const inside = !relative(resolve(repo), root).startsWith('..')
	if (above.length || inside) {
		return yield* fail('worktree_root_unclean', `Job worktrees under ${root} would inherit instructions that are not the product's.`, { root, repo, guidanceAbove: above, insideRepo: inside },
			[{ run: 'MW_HOME=<a directory with no guidance files above it and outside the repo> mw run', why: 'put Made Well\'s home where agents read only the product\'s own guidance' }])
	}
	const commit = (yield* git(repo, 'rev-parse', '--verify', '--quiet', `${base}^{commit}`).pipe(Effect.mapError(() =>
		fail('base_not_found', `${base} is not a commit in ${repo}.`, { repo, base }, [{ run: `git -C ${repo} log --oneline -5`, why: 'find the commit the item should start from' }])))).trim()
	return yield* Effect.acquireRelease(
		Effect.gen(function* () {
			yield* removeWorktree(repo, path)
			yield* git(repo, 'worktree', 'add', '--detach', '--quiet', path, commit)
			return { path, repo, base: commit } satisfies Worktree
		}),
		() => removeWorktree(repo, path),
	)
})

/** Removes a worktree and git's record of it. Never fails: whatever git cannot remove is deleted. */
const removeWorktree = (repo: string, path: string) =>
	Effect.gen(function* () {
		yield* Effect.ignore(git(repo, 'worktree', 'remove', '--force', '--force', path))
		rmSync(path, { recursive: true, force: true })
		yield* Effect.ignore(git(repo, 'worktree', 'prune'))
	})

/** What a packet carries about the workspace: HEAD, every tracked path, and the named files in full (null if absent). */
export const snapshot = Effect.fn('mw.snapshot')(function* (dir: string, files: ReadonlyArray<string>) {
	const outside = files.filter((f) => isAbsolute(f) || relative(dir, resolve(dir, f)).startsWith('..'))
	if (outside.length) return yield* fail('path_outside_workspace', 'A snapshot can only read files inside the workspace.', { dir, outside }, [])
	const head = (yield* git(dir, 'rev-parse', 'HEAD')).trim()
	const tracked = lines(yield* git(dir, 'ls-files', '-z'))
	const contents = Object.fromEntries(files.map((f) => {
		const p = join(dir, f)
		return [f, existsSync(p) && statSync(p).isFile() ? readFileSync(p, 'utf8') : null]
	}))
	return { head, files: tracked, contents }
})

/**
 * The workspace's state: HEAD, every ref, and a fingerprint of every file in the working tree (tracked,
 * untracked and ignored) and of git's own control files (.git/config, .git/info/*, .git/hooks/*).
 */
export interface State {
	readonly dir: string
	readonly head: string
	readonly refs: Readonly<Record<string, string>>
	readonly files: Readonly<Record<string, string>>
}

export const capture = Effect.fn('mw.capture')(function* (dir: string) {
	const head = (yield* git(dir, 'rev-parse', 'HEAD')).trim()
	const refs = Object.fromEntries((yield* git(dir, 'for-each-ref', '--format=%(refname) %(objectname)')).split('\n').filter(Boolean).map((l) => l.split(' ')))
	const common = resolve(dir, (yield* git(dir, 'rev-parse', '--git-common-dir')).trim())
	const files: Record<string, string> = {}
	walk(dir, '', files)
	for (const part of ['config', 'info', 'hooks']) walk(common, part, files, '.git/')
	return { dir, head, refs, files } satisfies State
})

// Stat, not content: cheap enough to run around every call, even with node_modules present.
function walk(root: string, rel: string, into: Record<string, string>, label = '') {
	const p = join(root, rel)
	let s
	try {
		s = lstatSync(p, { bigint: true })
	} catch {
		return
	}
	if (s.isDirectory()) {
		for (const name of readdirSync(p)) if (name !== '.git') walk(root, rel ? `${rel}/${name}` : name, into, label)
	} else if (rel) {
		into[label + rel] = `${s.mode}:${s.size}:${s.mtimeNs}${s.isSymbolicLink() ? `:${readlinkSync(p)}` : ''}`
	}
}

export interface Changes {
	readonly head?: { readonly from: string; readonly to: string }
	readonly refs: ReadonlyArray<{ readonly ref: string; readonly from: string | null; readonly to: string | null }>
	readonly added: ReadonlyArray<string>
	readonly removed: ReadonlyArray<string>
	readonly modified: ReadonlyArray<string>
}

/** Exactly what changed between two states, or undefined when nothing did. */
export function changes(before: State, after: State): Changes | undefined {
	const keys = (a: object, b: object) => [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
	const refs = keys(before.refs, after.refs).filter((ref) => before.refs[ref] !== after.refs[ref]).map((ref) => ({ ref, from: before.refs[ref] ?? null, to: after.refs[ref] ?? null }))
	const paths = keys(before.files, after.files)
	const added = paths.filter((p) => !(p in before.files))
	const removed = paths.filter((p) => !(p in after.files))
	const modified = paths.filter((p) => p in before.files && p in after.files && before.files[p] !== after.files[p])
	const head = before.head === after.head ? undefined : { from: before.head, to: after.head }
	return head || refs.length || added.length || removed.length || modified.length ? { ...(head ? { head } : {}), refs, added, removed, modified } : undefined
}

/** Runs `effect` and proves it left the workspace exactly as it found it. */
export const readOnly = <A, E, R>(dir: string, effect: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const before = yield* capture(dir)
		const result = yield* effect
		const changed = changes(before, yield* capture(dir))
		if (changed) {
			return yield* fail('workspace_written', `A read-only call changed ${dir}.`, { dir, changes: changed },
				[{ run: `git -C ${dir} status --ignored`, why: 'see the changes in context.changes; a read-only job gets no write access, so its result is not accepted' }])
		}
		return result
	}).pipe(Effect.withSpan('mw.readOnly', { attributes: { dir } }))

/** Fails when `ref` no longer points at `recorded`: someone committed to it, or moved it, since. */
export const headGuard = Effect.fn('mw.headGuard')(function* (repo: string, ref: string, recorded: string) {
	const now = (yield* git(repo, 'rev-parse', '--verify', `${ref}^{commit}`)).trim()
	if (now === recorded) return
	const landed = yield* Effect.orElseSucceed(git(repo, 'log', '--format=%H %s', `${recorded}..${now}`), () => '')
	return yield* fail('branch_moved', `${ref} moved from ${recorded.slice(0, 12)} to ${now.slice(0, 12)}.`, { repo, ref, recorded, now, landed: landed.trim().split('\n').filter(Boolean) }, [
		{ run: `git -C ${repo} log --stat ${recorded}..${now}`, why: 'see what landed on the branch and who made it' },
		{ run: `git -C ${repo} reset --keep ${recorded}`, why: 'only if those commits are unverified agent work and were never pushed' },
	])
})

/** Every file the workspace changed since `base` (committed, uncommitted or new); fails on any outside `declared`. A declared entry ending in "/" or "/**" covers its directory. */
export const scopeCheck = Effect.fn('mw.scopeCheck')(function* (dir: string, base: string, declared: ReadonlyArray<string>) {
	const changed = [...new Set([...lines(yield* git(dir, 'diff', '--name-only', '--no-renames', '-z', base)), ...lines(yield* git(dir, 'ls-files', '--others', '--exclude-standard', '-z'))])].sort()
	const covers = (d: string, f: string) => (d.endsWith('/') || d.endsWith('/**') ? f.startsWith(d.replace(/\*\*$/, '')) : f === d)
	const outside = changed.filter((f) => !declared.some((d) => covers(d, f)))
	if (outside.length) {
		return yield* fail('out_of_scope', `${outside.length} changed file(s) are outside the declared scope.`, { dir, base, declared, outside, changed }, [{ run: `git -C ${dir} diff --stat ${base}`, why: 'see the whole change against its base' }])
	}
	return changed
})

/** Fails on untracked or ignored files that were not there in `before`: probes, logs, screenshots, build output. */
export const leftovers = Effect.fn('mw.leftovers')(function* (dir: string, before: State) {
	const created = lines(yield* git(dir, 'ls-files', '--others', '-z')).filter((f) => !(f in before.files)).sort()
	if (created.length) {
		return yield* fail('leftovers', `${created.length} file(s) were left in ${dir}.`, { dir, files: created }, [{ run: `git -C ${dir} clean -fdx -- ${created.map((f) => JSON.stringify(f)).join(' ')}`, why: 'remove exactly the files the job left behind' }])
	}
})

/** Something an agent reports it provisioned, with the shell command that removes it. */
export interface Resource {
	readonly kind: string
	readonly id: string
	readonly teardown: string
}

export interface TeardownRecord extends Resource {
	readonly exitCode: number
	readonly output: string
}

/** Tears down each resource once, last provisioned first, and records every run. Fails if any teardown failed, after running the rest. */
export const teardown = Effect.fn('mw.teardown')(function* (resources: ReadonlyArray<Resource>, cwd: string) {
	const unique = resources.filter((r, i) => resources.findIndex((o) => o.kind === r.kind && o.id === r.id) === i)
	const records: TeardownRecord[] = []
	for (const r of unique.toReversed()) {
		const { code, stdout, stderr } = yield* exec('sh', ['-c', r.teardown], cwd, TEARDOWN_TIMEOUT_MS)
		records.push({ kind: r.kind, id: r.id, teardown: r.teardown, exitCode: code, output: (stdout + stderr).slice(-4000) })
	}
	const failed = records.filter((r) => r.exitCode !== 0)
	if (failed.length) {
		return yield* fail('teardown_failed', `${failed.length} of ${records.length} provisioned resource(s) were not torn down.`, { cwd, failed, records },
			failed.map((r) => ({ run: `cd ${cwd} && ${r.teardown}`, why: `tear down ${r.kind} ${r.id} once context.failed shows why it failed` })))
	}
	return records
})
