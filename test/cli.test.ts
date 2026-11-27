import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Effect } from 'effect'
import { defaultSettings } from '../src/settings.ts'
import { regressionFixture, resultPack } from './fixtures/prepared-output.ts'
const cli=join(import.meta.dirname,'../dist/mw.mjs')
test('plain-directory CLI capture, receipts and completion need no executable tools',()=>{const root=mkdtempSync(join(tmpdir(),'mw-cli-ledger-')),path=join(root,'record.db');try{const run=(...args:string[])=>{const r=spawnSync(process.execPath,[cli,...args],{cwd:root,env:{...process.env,MW_STORE:path,MW_AUTORUN:'0',MW_DEBUG:'0',PATH:''},encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);return JSON.parse(r.stdout)};const source='  exact\r\n😀  ',a=run('start','--objective','Deliver text','--source',source),b=run('start','--objective','Deliver text','--source',source);assert.notEqual(a.item.id,b.item.id);assert.equal(a.item.execution.mode,'external');const context=run('context',String(a.item.id));assert.equal(context.item.source,source);const input=join(root,'complete.json');writeFileSync(input,JSON.stringify({requestId:'complete-fixture-1',revision:context.revision,actor:{kind:'operator',label:'Fixture'},result:'Delivered text',evidence:[{conditionId:'A1',detail:'Recorded fixture assertion',refs:[]}]}));const completed=run('complete',String(a.item.id),'--input-file',input);assert.equal(completed.status,'completed');assert.deepEqual(run('complete',String(a.item.id),'--input-file',input),completed)}finally{rmSync(root,{recursive:true,force:true})}})
test('retired init and missing-store reads create no state',()=>{const root=mkdtempSync(join(tmpdir(),'mw-cli-read-')),path=join(root,'absent','record.db');try{const env={...process.env,MW_STORE:path,MW_DEBUG:'0',MW_AUTORUN:'0'};const r=spawnSync(process.execPath,[cli,'init'],{env,encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stderr).error,'usage');spawnSync(process.execPath,[cli,'status'],{env});assert.equal(existsSync(join(root,'absent')),false)}finally{rmSync(root,{recursive:true,force:true})}})

// Snapshot names and bytes, including SQLite sidecars: inspection must not even initialize a read store.
function inspectionFiles(root: string, prefix = ''): Record<string, string> {
	return Object.fromEntries(readdirSync(join(root, prefix)).sort().flatMap(name => {
		const relative = prefix ? `${prefix}/${name}` : name
		return lstatSync(join(root, relative)).isDirectory()
			? [[`${relative}/`, ''], ...Object.entries(inspectionFiles(root, relative))]
			: [[relative, readFileSync(join(root, relative)).toString('base64')]]
	}))
}

function inspectionSkill(root: string) {
	mkdirSync(join(root, 'ordinary/scripts'), { recursive: true })
	writeFileSync(join(root, 'ordinary/SKILL.md'), '---\r\nname: ordinary\r\ndescription: Ordinary local fixture skill.\r\nallowed-tools: Bash Read\r\n---\r\n\r\n# 雪 😀\r\n  Exact instructions.  \r\nRun scripts/probe.sh now.\r\n')
	writeFileSync(join(root, 'ordinary/scripts/probe.sh'), `#!/bin/sh\nprintf executed > '${join(root, 'executed')}'\n`, { mode: 0o755 })
	writeFileSync(join(root, 'config.json'), JSON.stringify({ schemaVersion: 1, bindings: {
		'/brainstorm': { skill: './ordinary', input: 'madewell.material.v1', output: 'madewell.material.v1' },
	} }))
}

function inspectionCommand(root: string, env: NodeJS.ProcessEnv, ...args: string[]) {
	return spawnSync(process.execPath, [cli, 'cartridges', ...args], {
		cwd: root, env: { ...process.env, ...env, MW_DEBUG: '0', PATH: '' }, encoding: 'utf8', timeout: 20000,
	})
}

test('CLI inspection and explicit skill selection create neither MW_HOME nor MW_STORE nor script effects', () => {
	const root = mkdtempSync(join(tmpdir(), 'mw-cli-inspect-'))
	try {
		inspectionSkill(root)
		const home = join(root, 'absent-home'), store = join(root, 'absent-store/record.db')
		const env = { MW_HOME: home, MW_STORE: store, MW_AUTORUN: '1', MW_PRESCRIPTIONS: join(root, 'missing-prescriptions.json') }
		const before = inspectionFiles(root)
		const defaults = inspectionCommand(root, env, '--inspect', '--root', root)
		assert.equal(defaults.status, 0, defaults.stdout + defaults.stderr)
		const inventory = JSON.parse(defaults.stdout)
		assert.equal(inventory.schemaVersion, 1)
		assert.equal(inventory.complete, false)
		assert.deepEqual(inventory.diagnostics.map((d: { address: string }) => d.address).sort(), ['/landing'])
		const selected = inspectionCommand(root, env, '--inspect', '--root', root, '--config', 'config.json', '--component', '/brainstorm')
		assert.equal(selected.status, 0, selected.stdout + selected.stderr)
		const result = JSON.parse(selected.stdout)
		assert.equal(result.complete, true)
		assert.equal(result.root.address, '/brainstorm')
		assert.equal(result.root.method.kind, 'skill')
		assert.equal(result.root.method.package.name, 'ordinary')
		assert.deepEqual(result.root.method.companions ?? [], [], 'explicit skill replaces the shipped entry and posture')
		assert.match(result.root.method.package.instructions, /# 雪 😀\r\n  Exact instructions\.  \r\n/)
		assert.deepEqual(inspectionFiles(root), before)
		assert.equal(existsSync(home), false)
		assert.equal(existsSync(join(root, 'absent-store')), false)
		assert.equal(existsSync(join(root, 'executed')), false)
		// Also exercise default Store selection when only MW_HOME, not MW_STORE, is set.
		const homeOnly: NodeJS.ProcessEnv = { ...env, MW_STORE: undefined }
		const noStore = inspectionCommand(root, homeOnly, '--inspect', '--root', root)
		assert.equal(noStore.status, 0, noStore.stdout + noStore.stderr)
		assert.deepEqual(inspectionFiles(root), before)
		// A plaintext file is not an SQLite Store. Success here requires bypassing Store open entirely.
		writeFileSync(join(root, 'poison.db'), 'This must never be opened as SQLite.\n')
		const poisonedFiles = inspectionFiles(root)
		const poisoned = inspectionCommand(root, { ...env, MW_STORE: join(root, 'poison.db') }, '--inspect', '--root', root)
		assert.equal(poisoned.status, 0, poisoned.stdout + poisoned.stderr)
		assert.equal(JSON.parse(poisoned.stdout).schemaVersion, 1)
		assert.deepEqual(inspectionFiles(root), poisonedFiles)
	} finally { rmSync(root, { recursive: true, force: true }) }
})

test('CLI inspection leaves existing disposable Store, settings, live runner claim and filesystem unchanged', async () => {
	const f = regressionFixture()
	try {
		inspectionSkill(f.root)
		await f.create()
		f.store.saveSettings({ ...defaultSettings(), deliveryPack: resultPack(), alert: { run: 'touch executed', cwd: f.root } }, '2026-11-26T00:00:00.000Z')
		await Effect.runPromise(f.store.claimRunner())
		const state = () => ({ items: f.store.list(), settings: f.store.settings(), runner: f.store.runner(), events: f.store.allEvents() })
		const before = structuredClone(state()), files = inspectionFiles(f.root)
		assert.equal(before.runner?.pid, process.pid, 'negative control: a real live claim exists')
		assert.ok(before.settings?.settings.deliveryPack, 'negative control: installation has executable delivery defaults')
		const env = { MW_HOME: join(f.root, 'unused-home'), MW_STORE: f.path, MW_AUTORUN: '1', MW_WORKER_COMMAND: 'touch executed' }
		for (const args of [['--inspect', '--root', f.root], ['--inspect', '--root', f.root, '--config', 'config.json', '--component', '/brainstorm']]) {
			const result = inspectionCommand(f.root, env, ...args)
			assert.equal(result.status, 0, result.stdout + result.stderr)
			assert.equal(JSON.parse(result.stdout).schemaVersion, 1)
			assert.deepEqual(structuredClone(state()), before)
			assert.deepEqual(inspectionFiles(f.root), files)
		}
		assert.equal(f.requests.length, 0)
		assert.equal(existsSync(join(f.root, 'executed')), false)
	} finally { f.close() }
})

test('CLI missing root and mixed inspection/action flags fail with usage and no writes', () => {
	const root = mkdtempSync(join(tmpdir(), 'mw-cli-inspect-usage-'))
	try {
		const env = { MW_HOME: join(root, 'absent-home'), MW_STORE: join(root, 'absent-store/record.db'), MW_AUTORUN: '1' }
		const before = inspectionFiles(root)
		for (const args of [
			['--inspect'],
			['--inspect', '--root', root, '--check', 'builtin:grammar'],
			['--inspect', '--root', root, '--update', 'builtin:grammar', '--item', '1'],
			['--inspect', '--root', root, '--item', '1'],
			['--inspect', '--root', root, '1'],
			['--inspect', '--root', root, '--input-file', 'missing.json'],
		]) {
			const result = inspectionCommand(root, env, ...args)
			assert.equal(result.status, 1, result.stdout + result.stderr)
			const error = JSON.parse(result.stderr)
			assert.equal(error.error, 'usage')
			assert.ok(error.message)
			assert.ok(Array.isArray(error.next))
			assert.deepEqual(inspectionFiles(root), before)
		}
		const unreadable = inspectionCommand(root, env, '--inspect', '--root', root, '--override', 'missing.json')
		assert.equal(unreadable.status, 1)
		const error = JSON.parse(unreadable.stderr)
		assert.equal(error.error, 'portable_unreadable')
		assert.ok(Object.keys(error.context).length > 0)
		assert.ok(error.next.length > 0)
		assert.deepEqual(inspectionFiles(root), before)
	} finally { rmSync(root, { recursive: true, force: true }) }
})

test('legacy cartridges --check builtin:grammar remains a pack check, not portable inspection', () => {
	const root = mkdtempSync(join(tmpdir(), 'mw-cli-cartridge-check-'))
	try {
		const env = { MW_HOME: join(root, 'absent-home'), MW_STORE: join(root, 'absent-store/record.db'), MW_AUTORUN: '0' }
		const checked = inspectionCommand(root, env, '--check', 'builtin:grammar')
		assert.equal(checked.status, 0, checked.stdout + checked.stderr)
		const result = JSON.parse(checked.stdout)
		assert.equal(result.source, 'builtin:grammar')
		assert.equal(result.pack.name, 'made-well-autonomy-lab')
		assert.equal(result.pack.runtime, 'functions')
		assert.equal(result.schemaVersion, undefined)
		assert.equal(existsSync(join(root, 'absent-store')), false)
		const invalid = inspectionCommand(root, env, '--check', 'builtin:not-a-pack')
		assert.equal(invalid.status, 1)
		assert.equal(JSON.parse(invalid.stderr).error, 'cartridges_invalid')
	} finally { rmSync(root, { recursive: true, force: true }) }
})
