import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

// util-linux script supplies a real PTY, including termios and split/coalesced input.
// The VPS is the launch target; macOS script uses a different CLI.
for (const input of ['q\r', '\x03']) test(`watch restores the real terminal and exits on ${JSON.stringify(input)}`, { skip: process.platform !== 'linux', timeout: 12_000 }, async () => {
	const root = mkdtempSync(join(tmpdir(), 'mw-terminal-'))
	const cli = resolve(import.meta.dirname, '../dist/mw.mjs')
	const shell = `before=$(stty -g); node '${cli}' watch; code=$?; after=$(stty -g); [ "$before" = "$after" ] || exit 9; echo TERMINAL_RESTORED; exit "$code"`
	const child = spawn('script', ['-q', '-e', '-c', shell, '/dev/null'], { env: { ...process.env, MW_STORE: join(root, 'absent.db'), MW_DEBUG: '0' }, stdio: ['pipe', 'pipe', 'pipe'] })
	let output = '', sent = false
	const timer = setTimeout(() => child.kill('SIGTERM'), 8000)
	try {
		child.stdout.on('data', (data: Buffer) => {
			output += data.toString()
			if (!sent && output.includes('MADE WELL')) { sent = true; child.stdin.write(input) }
		})
		const status = await new Promise<number | null>((done, fail) => { child.on('error', fail); child.on('close', done) })
		assert.equal(status, 0, output)
		assert.ok(output.includes('TERMINAL_RESTORED'), output)
		assert.ok(output.includes('\x1b[?25h'), 'cursor restored')
		assert.ok(output.includes('\x1b[?1049l'), 'alternate screen exited')
	} finally { clearTimeout(timer); if (child.exitCode === null) child.kill('SIGTERM'); rmSync(root, { recursive: true, force: true }) }
})
