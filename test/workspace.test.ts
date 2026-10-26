import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect } from 'effect'
import type { MadeWellError } from '../src/errors.ts'
import { capture, headGuard, leftovers, readOnly, scopeCheck, snapshot, teardown, worktree, worktreesRoot } from '../src/workspace.ts'

/** A product repo with two commits, and Made Well's home beside it; both deleted by cleanup. */
function setup() {
	const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'mw-ws-')))
	const repo = join(tmp, 'product')
	mkdirSync(repo)
	const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-C', repo, ...args], { encoding: 'utf8' }).trim()
	git('init', '-q', '-b', 'main')
	writeFileSync(join(repo, '.gitignore'), '.amp/\n')
	writeFileSync(join(repo, 'a.txt'), 'one\n')
	git('add', '.')
	git('commit', '-qm', 'first')
	const first = git('rev-parse', 'HEAD')
	mkdirSync(join(repo, 'src'))
	writeFileSync(join(repo, 'src', 'b.ts'), 'export {}\n')
	git('add', '.')
	git('commit', '-qm', 'second')
	const home = process.env.MW_HOME
	process.env.MW_HOME = join(tmp, 'home')
	const cleanup = () => {
		if (home === undefined) delete process.env.MW_HOME
		else process.env.MW_HOME = home
		rmSync(tmp, { recursive: true, force: true })
	}
	return { tmp, repo, git, first, head: git('rev-parse', 'HEAD'), cleanup }
}

const run = <A>(effect: Effect.Effect<A, MadeWellError>) => Effect.runPromise(effect)
const error = (effect: Effect.Effect<unknown, MadeWellError>) => Effect.runPromise(Effect.flip(effect)) as Promise<MadeWellError & { context: Record<string, any> }>

test('a job worktree starts at the base commit outside the product repo and leaves no trace, even when the job fails', async () => {
	const t = setup()
	try {
		const before = { refs: t.git('for-each-ref'), status: t.git('status', '--porcelain', '--ignored'), files: readdirSync(join(t.repo, '.git')).sort() }
		const seen = await run(Effect.scoped(Effect.gen(function* () {
			const ws = yield* worktree(t.repo, 'HEAD~1', 'item-7-implement')
			return { ...ws, files: execFileSync('git', ['-C', ws.path, 'ls-files'], { encoding: 'utf8' }).trim(), exists: existsSync(ws.path) }
		})))
		assert.equal(seen.base, t.first)
		assert.equal(seen.files, '.gitignore\na.txt', 'the worktree holds the base commit, not HEAD')
		assert.ok(seen.exists && seen.path.startsWith(worktreesRoot()) && !seen.path.startsWith(t.repo))
		assert.ok(!existsSync(seen.path), 'removed after the job')

		const failed = await error(Effect.scoped(Effect.gen(function* () {
			const ws = yield* worktree(t.repo, t.head, 'item-7-verify')
			writeFileSync(join(ws.path, 'probe.txt'), 'x')
			return yield* Effect.fail({ code: 'job_failed' } as unknown as MadeWellError)
		})))
		assert.equal(failed.code as string, 'job_failed')
		assert.deepEqual(readdirSync(worktreesRoot()), [], 'removed after a failed job too')
		assert.deepEqual({ refs: t.git('for-each-ref'), status: t.git('status', '--porcelain', '--ignored'), files: readdirSync(join(t.repo, '.git')).sort() }, before, 'no ref, file or worktree record left in the product repo')
		assert.equal(t.git('worktree', 'list').split('\n').length, 1)

		// A crash left a directory of the same name: the job gets a fresh worktree, not the stale one.
		mkdirSync(join(worktreesRoot(), 'item-8-plan'), { recursive: true })
		writeFileSync(join(worktreesRoot(), 'item-8-plan', 'stale.txt'), 'x')
		const fresh = await run(Effect.scoped(Effect.map(worktree(t.repo, 'main', 'item-8-plan'), (ws) => existsSync(join(ws.path, 'stale.txt')))))
		assert.equal(fresh, false)

		assert.equal((await error(Effect.scoped(worktree(t.repo, 'no-such-ref', 'item-9-plan')))).code, 'base_not_found')
	} finally {
		t.cleanup()
	}
})

test('no worktree is made where a guidance file above it would reach the agent', async () => {
	const t = setup()
	try {
		mkdirSync(process.env.MW_HOME!, { recursive: true })
		writeFileSync(join(process.env.MW_HOME!, 'AGENTS.md'), 'not the product\'s guidance')
		const e = await error(Effect.scoped(worktree(t.repo, 'main', 'item-1-plan')))
		assert.equal(e.code, 'worktree_root_unclean')
		assert.deepEqual(e.context.guidanceAbove, [join(process.env.MW_HOME!, 'AGENTS.md')])
		process.env.MW_HOME = join(t.repo, 'mw')
		const inside = await error(Effect.scoped(worktree(t.repo, 'main', 'item-1-plan')))
		assert.equal(inside.context.insideRepo, true)
		assert.equal(t.git('worktree', 'list').split('\n').length, 1)
	} finally {
		t.cleanup()
	}
})

test('a snapshot carries HEAD, every tracked path and the named files in full', async () => {
	const t = setup()
	try {
		writeFileSync(join(t.repo, 'untracked.txt'), 'x')
		const s = await run(snapshot(t.repo, ['src/b.ts', 'src/new.ts']))
		assert.deepEqual(s, { head: t.head, files: ['.gitignore', 'a.txt', 'src/b.ts'], contents: { 'src/b.ts': 'export {}\n', 'src/new.ts': null } })
		assert.equal((await error(snapshot(t.repo, ['../outside.txt']))).code, 'path_outside_workspace')
	} finally {
		t.cleanup()
	}
})

test('a read-only call that writes in its checkout is caught with exactly what it changed; the refs and git settings it shares with the repo are not its own', async () => {
	const t = setup()
	try {
		writeFileSync(join(t.repo, 'a.txt'), 'dirty before the call\n')
		assert.equal(await run(readOnly(t.repo, Effect.sync(() => execFileSync('git', ['-C', t.repo, 'status'])).pipe(Effect.as('answer')))), 'answer', 'reading, git status included, passes')

		const e = await error(readOnly(t.repo, Effect.sync(() => {
			writeFileSync(join(t.repo, 'probe.txt'), 'x')
			appendFileSync(join(t.repo, 'a.txt'), 'more\n')
			mkdirSync(join(t.repo, '.amp', 'in'), { recursive: true })
			writeFileSync(join(t.repo, '.amp', 'in', 'check.sh'), 'x')
			rmSync(join(t.repo, 'src', 'b.ts'))
			// Any session in the repo moves these (a push, a fetch); the product repo's leftovers check guards its settings.
			appendFileSync(join(t.repo, '.git', 'info', 'exclude'), 'probe.txt\n')
			t.git('branch', 'scratch')
		})))
		assert.equal(e.code, 'workspace_written')
		const { head, refs, added, removed, modified } = e.context.changes as any
		assert.equal(head, undefined)
		assert.deepEqual(refs, [])
		assert.deepEqual(added, ['.amp/in/check.sh', 'probe.txt'])
		assert.deepEqual(removed, ['src/b.ts'])
		assert.deepEqual(modified, ['a.txt'])
	} finally {
		t.cleanup()
	}
})

test('the HEAD guard catches a commit to the branch since the recorded commit', async () => {
	const t = setup()
	try {
		await run(headGuard(t.repo, 'main', t.head))
		writeFileSync(join(t.repo, 'a.txt'), 'early\n')
		t.git('commit', '-qam', 'implementer committed before verification')
		const e = await error(headGuard(t.repo, 'main', t.head))
		assert.equal(e.code, 'branch_moved')
		assert.equal(e.context.now, t.git('rev-parse', 'HEAD'))
		assert.deepEqual(e.context.landed, [`${t.git('rev-parse', 'HEAD')} implementer committed before verification`])
	} finally {
		t.cleanup()
	}
})

test('the scope check names every changed file outside the declared scope', async () => {
	const t = setup()
	try {
		writeFileSync(join(t.repo, 'src', 'c.ts'), 'x')
		t.git('add', '.')
		t.git('commit', '-qm', 'committed in scope')
		writeFileSync(join(t.repo, 'a.txt'), 'uncommitted\n')
		mkdirSync(join(t.repo, 'docs'))
		writeFileSync(join(t.repo, 'docs', 'notes.md'), 'new, untracked')
		writeFileSync(join(t.repo, 'src', 'd.ts'), 'new, untracked')
		mkdirSync(join(t.repo, '.amp'))
		writeFileSync(join(t.repo, '.amp', 'ignored.log'), 'ignored: the leftover check owns it')

		assert.deepEqual(await run(scopeCheck(t.repo, t.head, ['src/', 'a.txt', 'docs/notes.md'])), ['a.txt', 'docs/notes.md', 'src/c.ts', 'src/d.ts'])
		const e = await error(scopeCheck(t.repo, t.head, ['src/**', 'a.tx']))
		assert.equal(e.code, 'out_of_scope')
		assert.deepEqual(e.context.outside, ['a.txt', 'docs/notes.md'])
	} finally {
		t.cleanup()
	}
})

test('scope declarations are exact paths or explicit directory suffixes, never implicit globs', async () => {
	const t = setup()
	try {
		mkdirSync(join(t.repo, 'src', 'nested'))
		const files = ['src/b.ts', 'src/b.ts.extra', 'src/nested/check.ts', 'src/*.ts']
		for (const file of files) writeFileSync(join(t.repo, file), 'changed\n')
		const changed = [...files].sort()
		for (const [declared, allowed] of [
			[['src/b.ts'], ['src/b.ts']], [['src/'], files], [['src/**'], files],
			[[], []], [['src'], []], [['src/*.ts'], ['src/*.ts']], [['src/b'], []],
		] as [string[], string[]][]) {
			const outside = changed.filter((file) => !allowed.includes(file))
			if (!outside.length) assert.deepEqual(await run(scopeCheck(t.repo, t.head, declared)), changed)
			else {
				const e = await error(scopeCheck(t.repo, t.head, declared))
				assert.equal(e.code, 'out_of_scope')
				assert.equal(e.message, `${outside.length} changed file(s) are outside the declared scope.`)
				assert.deepEqual(e.context, { dir: t.repo, base: t.head, declared, outside, changed })
			}
		}
	} finally { t.cleanup() }
})

test('the leftover check finds untracked and ignored files a job created, and only those', async () => {
	const t = setup()
	try {
		writeFileSync(join(t.repo, 'there-before.txt'), 'x')
		const before = await run(capture(t.repo))
		mkdirSync(join(t.repo, '.amp', 'in'), { recursive: true })
		writeFileSync(join(t.repo, '.amp', 'in', 'shot.png'), 'x')
		writeFileSync(join(t.repo, 'scope.sh'), 'x')
		writeFileSync(join(t.repo, 'a.txt'), 'a tracked edit is not a leftover\n')
		const e = await error(leftovers(t.repo, before))
		assert.equal(e.code, 'leftovers')
		assert.deepEqual(e.context.files, ['.amp/in/shot.png', 'scope.sh'])
		execFileSync('sh', ['-c', e.next[0]!.run])
		await run(leftovers(t.repo, before))
		assert.ok(existsSync(join(t.repo, 'there-before.txt')))
	} finally {
		t.cleanup()
	}
})

test('provisioned resources are each torn down once, last first, and a failure is reported after the rest run', async () => {
	const t = setup()
	try {
		const log = join(t.tmp, 'log')
		const ok = await run(teardown([
			{ kind: 'database-branch', id: 'db-1', teardown: `echo db-1 >> ${log}` },
			{ kind: 'server', id: '4100', teardown: `echo 4100 >> ${log}` },
			{ kind: 'server', id: '4100', teardown: `echo 4100 again >> ${log}` },
		], t.repo))
		assert.deepEqual(readFileSync(log, 'utf8'), '4100\ndb-1\n')
		assert.deepEqual(ok.map((r) => [r.id, r.exitCode]), [['4100', 0], ['db-1', 0]])

		rmSync(log)
		const e = await error(teardown([
			{ kind: 'dev-clone', id: 'clone-a', teardown: `echo clone-a >> ${log}` },
			{ kind: 'database-branch', id: 'db-2', teardown: 'echo branch is busy >&2; exit 3' },
		], t.repo))
		assert.equal(e.code, 'teardown_failed')
		assert.equal(readFileSync(log, 'utf8'), 'clone-a\n', 'the failure did not stop the rest')
		assert.deepEqual((e.context.failed as any[]).map((r) => [r.id, r.exitCode, r.output]), [['db-2', 3, 'branch is busy\n']])
		assert.equal((e.context.records as any[]).length, 2)
		assert.deepEqual(e.next.map((n) => n.run), [`cd ${t.repo} && echo branch is busy >&2; exit 3`])
	} finally {
		t.cleanup()
	}
})
