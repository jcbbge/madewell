// What Made Well itself does to the product repo: it records the branch an item starts from, takes each
// maker's work out of its worktree as a patch kept in Made Well's home, builds the candidate commit, runs
// the item's checks against it, and brings the verified commit onto the branch. No agent does any of it.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Effect } from 'effect'
import { MadeWellError } from './errors.ts'
import type { Check } from './lane.ts'
import type { CheckResult } from './store.ts'
import { git } from './workspace.ts'
import { runGroup, type Budget } from './worker.ts'

const lines = (out: string) => out.split('\0').filter(Boolean)
const tail = (s: string) => s.slice(-4000)

/** An item's own directory in Made Well's home, beside the store: its patches and checks until it ships. */
export const itemHome = (storePath: string, id: number) => join(dirname(storePath), 'items', String(id))

export const patchPath = (home: string, name: 'change' | 'checks' | 'implement.partial' | 'test-plan.partial') => join(home, `${name}.patch`)

export const writePatch = (path: string, patch: string) => {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, patch)
}

export const readPatch = (path: string) => {
	try {
		return readFileSync(path, 'utf8')
	} catch {
		return ''
	}
}

export const removeHome = (home: string) => rmSync(home, { recursive: true, force: true })

/** The branch checked out in the product repo and its commit: where the item starts and where it ships. */
export const branchOf = Effect.fn('mw.branchOf')(function* (repo: string) {
	const ref = (yield* Effect.orElseSucceed(git(repo, 'symbolic-ref', '-q', 'HEAD'), () => '')).trim()
	if (!ref) {
		return yield* new MadeWellError({ code: 'no_branch', message: `${repo} has no branch checked out.`, context: { repo }, next: [{ run: `git -C ${repo} switch main`, why: 'check out the branch items ship to, then retry' }] })
	}
	return { ref, commit: yield* revParse(repo, ref) }
})

export const revParse = (repo: string, ref: string) => Effect.map(git(repo, 'rev-parse', '--verify', `${ref}^{commit}`), (s) => s.trim())

/** Everything changed in `dir` since `base` (committed, staged, unstaged and new, ignored files excepted), as a binary patch. */
export const takeChange = Effect.fn('mw.takeChange')(function* (dir: string, base: string) {
	yield* git(dir, 'add', '-A')
	const files = lines(yield* git(dir, 'diff', '--cached', '--name-only', '--no-renames', '-z', base))
	const patch = files.length ? yield* git(dir, 'diff', '--cached', '--binary', '--no-renames', base) : ''
	return { files, patch }
})

/** Applies a patch file to the worktree and the index. An empty patch changes nothing. */
export const applyPatch = (dir: string, path: string) => (readPatch(path) ? Effect.asVoid(git(dir, 'apply', '--index', '--binary', path)) : Effect.void)

/** Commits what is staged, as the product repo's own author would, with no trailer and no hook. */
export const commit = Effect.fn('mw.commit')(function* (dir: string, message: string) {
	yield* git(dir, 'commit', '--quiet', '--no-verify', '--allow-empty', '-m', message)
	return yield* revParse(dir, 'HEAD')
})

/**
 * Moves `ref` from `from` to `to`, which must descend from it. If the product checkout has the branch
 * checked out, its working tree follows by a fast-forward merge; otherwise only the ref moves.
 */
export const bringOnto = Effect.fn('mw.bringOnto')(function* (repo: string, ref: string, from: string, to: string) {
	const checkedOut = (yield* Effect.orElseSucceed(git(repo, 'symbolic-ref', '-q', 'HEAD'), () => '')).trim() === ref
	if (checkedOut) yield* git(repo, 'merge', '--ff-only', '--quiet', to)
	else yield* git(repo, 'update-ref', ref, to, from)
})

/** Runs each check from the repo root in its own process group, under the budget, and records what it did. */
export const runChecks = Effect.fn('mw.runChecks')(function* (dir: string, checks: ReadonlyArray<Check>, budget: Budget, env: NodeJS.ProcessEnv) {
	const results: CheckResult[] = []
	for (const check of checks) {
		const started = Date.now()
		const r = yield* runGroup({ command: 'sh', args: ['-c', check.run], cwd: dir, env, input: '', budget })
		const over = r.overBudget ? `\n[made well] stopped after ${(r.overBudget.ms / 60_000).toFixed(1)} of ${budget.minutes} minutes` : ''
		results.push({ ...check, exitCode: r.overBudget ? 124 : (r.code ?? 1), ms: Date.now() - started, output: tail(r.stdout + r.stderr + over) })
	}
	return results
})
