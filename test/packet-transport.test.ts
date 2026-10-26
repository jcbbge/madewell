import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { Effect } from 'effect'
import { harnessOf, loadPrescriptions, type Access, type Card } from '../src/cards.ts'
import { buildLaunch, HARNESSES, harnessWorker, type Harness } from '../src/harness.ts'
import { Worker, type WorkerRequest, type WorkerResult } from '../src/worker.ts'

const card = (harness = 'codex'): Card => ({ harness, provider: 'local', account: 'local', model: 'fixture', effort: 'low' })
const you = {
	profile: 'test architect', call: 'execute', job: 'test-plan',
	duty: 'Write the checks from the accepted plan, blind to implementation.',
	task: 'Read the accepted plan and produce independently runnable checks.',
	replyFormat: { type: 'object', required: ['checks'], properties: { checks: { type: 'array', items: { type: 'object', required: ['id', 'run'] } } } },
}
const packet = {
	you, item: { id: 31, title: 'Preserve the complete handoff', source: `SOURCE-BEGIN ${'source 雪 λ ".\n'.repeat(12_000)} SOURCE-END` },
	received: { plan: { steps: ['Read the contract', 'Write checks'], doneWhen: ['Every decision remains available'] } },
	snapshot: { files: `SNAPSHOT-BEGIN ${'original file bytes λ\n'.repeat(20_000)} SNAPSHOT-END` },
	exchange: { turns: [], notes: ['Use saved decisions.'] },
	answeredBefore: [{ id: '12:0', question: 'Which contract?', answer: 'The accepted plan.', by: 'planner', job: 'plan' }],
	round: 2, customEvidence: { keep: ['unknown fields also survive', null, false, 0] },
}
// Deliberately noncanonical whitespace and Unicode: transport must not reserialize the payload.
const prompt = ` \n${JSON.stringify(packet, null, '\t')}\n\t`
const call = { system: 'The original system brief.', prompt, title: 'mw #31 test-plan', dir: '/call with spaces/λ' }
const digest = (text: string) => createHash('sha256').update(text).digest('hex')
const strings = (value: unknown): string[] => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []

function assertBootstrap(input: string, path: string) {
	const bootstrap = JSON.parse(input) as { you: unknown; item: { id: number; title: string } }
	assert.deepEqual(bootstrap.you, you, 'the entire duty/task/reply schema stays visible before any tool call')
	assert.equal(bootstrap.item.id, packet.item.id)
	assert.equal(bootstrap.item.title, packet.item.title)
	assert.ok(strings(bootstrap).includes(path), 'the exact packet filename is discoverable in the bootstrap')
	for (const key of Object.keys(packet)) assert.ok(input.includes(key), `the complete packet field ${key} is discoverable`)
	assert.match(input, /read/i, 'the recipient is instructed to read the full packet')
	assert.match(input, /field|section/i, 'the recipient can select bounded packet fields')
	assert.ok(input.length < 12_000, 'large evidence does not fill the initial prompt again')
	assert.ok(!input.includes('SOURCE-BEGIN'))
	assert.ok(!input.includes('SNAPSHOT-BEGIN'))
}

test('built-in Codex transports every tool-enabled object packet as exact bytes with a small actionable bootstrap', () => {
	assert.equal(HARNESSES.codex!.packet, 'file', 'the built-in recipe explicitly selects file transport')
	for (const access of ['read', 'checks', 'make', 'run'] as const) {
		const launch = buildLaunch(card(), access, call)
		const path = join(call.dir, 'packet.json')
		assert.deepEqual(launch.files, { [path]: prompt }, 'the entire original packet exists exactly once among per-call files')
		assertBootstrap(launch.input, path)
		assert.deepEqual(launch.args.slice(launch.args.indexOf('mcp_servers={}') + 1, -1), HARNESSES.codex!.tools[access], 'transport never changes tool grants')
		assert.ok(!launch.args.some((arg) => arg.includes('SOURCE-BEGIN') || arg.includes('SNAPSHOT-BEGIN')), 'bulk packet is not duplicated in argv')
		assert.ok(launch.args.includes(`developer_instructions=${JSON.stringify(call.system)}`), 'the system brief is preserved')
	}
	assert.equal(call.prompt, prompt, 'building a launch does not mutate the caller packet')
})

test('none access keeps the exact inline packet and disabled Codex shell, even when file transport is selected', () => {
	const launch = buildLaunch(card(), 'none', call)
	assert.equal(launch.input, prompt)
	assert.deepEqual(launch.files, {})
	assert.deepEqual(launch.args.slice(-5), ['-s', 'read-only', '-c', 'features.shell_tool=false', '-'])
})

test('nonobject or malformed prompts stay inline at every access level', () => {
	for (const value of ['', 'ordinary text', '{broken', 'null', '[]', '[{"you":{}}]', '42', 'true', '"a JSON string"']) {
		for (const access of ['none', 'read', 'checks', 'make', 'run'] as const) {
			const launch = buildLaunch(card(), access, { ...call, prompt: value })
			assert.equal(launch.input, value, `${access} ${value}`)
			assert.deepEqual(launch.files, {}, `${access} ${value}`)
		}
	}
})

test('other built-ins and overriding custom recipes keep their existing inline stdin behavior', () => {
	for (const name of ['amp', 'claude', 'pi']) {
		const launch = buildLaunch(card(name), 'checks', call)
		assert.equal(launch.input, name === 'amp' ? `${call.system}\n\n---\n\nYour packet:\n${prompt}` : prompt)
		assert.ok(!Object.keys(launch.files).some((path) => path.endsWith('/packet.json')))
	}
	// Replacing a built-in recipe must not inherit its transport by the card's name.
	const custom: Harness = { command: ['node', '-e', ''], stdin: '{system}\n{prompt}', output: 'text', tools: { none: [], read: ['read'], checks: ['read', 'write'], make: ['write'], run: ['run'] }, limit: { pattern: 'OUT_OF_QUOTA' } }
	const launch = buildLaunch(card(), 'checks', call, custom)
	assert.equal(launch.input, `${call.system}\n${prompt}`)
	assert.deepEqual(launch.files, {})
})

// A real local subprocess observes the call directory while alive. No paid harness is invoked.
const probe = `
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const input = fs.readFileSync(0, 'utf8');
const settings = process.argv[1];
const dir = path.dirname(settings);
const file = path.join(dir, 'packet.json');
const hasPacket = fs.existsSync(file);
const bytes = hasPacket ? fs.readFileSync(file) : null;
console.log(JSON.stringify({ dir, physicalDir: fs.realpathSync(dir), cwd: process.cwd(), file, files: fs.readdirSync(dir).sort(), input: hasPacket ? input : '', inputHash: crypto.createHash('sha256').update(input).digest('hex'), packetHash: bytes && crypto.createHash('sha256').update(bytes).digest('hex'), packetBytes: bytes && bytes.length, tools: process.argv[3] }));
if (process.argv[2] === 'exit') process.exit(7);
if (process.argv[2] === 'budget') setInterval(() => {}, 1000);
`
const recipe = (mode = 'ok', file = true): Harness => ({
	command: [process.execPath, '-e', probe, '{settings}', mode, '{tools}'],
	...(file ? { packet: 'file' as const } : {}),
	stdin: '{prompt}', settings: { tools: '{tools}' }, version: ['--version'], output: 'text',
	tools: { none: [], read: ['read'], checks: ['read', 'write-checks'], make: ['read', 'write'], run: ['read', 'run'] },
	limit: { pattern: 'OUT_OF_QUOTA' },
})
const run = (harness: Harness, access: Access = 'checks', minutes = 1) => Effect.runPromise(Effect.gen(function* () {
	return yield* (yield* Worker).run({ kind: 'execute', item: 31, job: 'test-plan', profile: 'test architect', card: card('local-probe'), access, system: call.system, prompt, cwd: import.meta.dirname, harness, budget: { minutes } } satisfies WorkerRequest)
}).pipe(Effect.provide(harnessWorker)))
type Observation = { dir: string; physicalDir: string; cwd: string; file: string; files: string[]; input: string; inputHash: string; packetHash: string | null; packetBytes: number | null; tools: string }
const observed = (result: WorkerResult): Observation => {
	assert.ok(result.raw, 'the subprocess recorded its observation before returning')
	return JSON.parse(result.raw.trim().split('\n')[0]!) as Observation
}

test('prescriptions preserve an explicit file-transport opt-in and reject invalid transport settings', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'mw-transport-prescriptions-'))
	try {
		const path = join(dir, 'prescriptions.json')
		const shipped = JSON.parse(readFileSync(join(import.meta.dirname, '../prescriptions.json'), 'utf8'))
		writeFileSync(path, JSON.stringify({ ...shipped, harnesses: { local: recipe() } }))
		const loaded = await Effect.runPromise(loadPrescriptions(path))
		const harness = harnessOf(loaded, 'local')!
		assert.equal(harness.packet, 'file', 'the schema must not silently discard the opt-in')
		assert.equal(buildLaunch(card('local'), 'read', call, harness).files[join(call.dir, 'packet.json')], prompt)
		for (const value of ['inline', 'unknown', true, {}]) {
			writeFileSync(path, JSON.stringify({ ...shipped, harnesses: { local: { ...recipe(), packet: value } } }))
			const failure = await Effect.runPromise(Effect.flip(loadPrescriptions(path)))
			assert.equal(failure.code, 'prescriptions_invalid')
		}
	} finally { rmSync(dir, { recursive: true, force: true }) }
})

test('a real recipe sees the exact packet once and its per-call files disappear after successful return', async () => {
	const result = await run(recipe())
	assert.equal(result.ok, true)
	const observation = observed(result)
	assert.equal(observation.packetHash, digest(prompt))
	assert.equal(observation.packetBytes, Buffer.byteLength(prompt))
	assert.deepEqual(observation.files, ['packet.json', 'settings.json'])
	assert.equal(observation.tools, 'read,write-checks')
	assertBootstrap(observation.input, observation.file)
	assert.equal(observation.cwd, import.meta.dirname, 'tool-enabled calls retain the assigned checkout')
	assert.equal(existsSync(observation.dir), false, 'all per-call files are removed')
})

test('real none-access and non-opted-in recipes receive inline bytes without a packet file', async () => {
	for (const [harness, access] of [[recipe(), 'none'], [recipe('ok', false), 'checks']] as const) {
		const result = await run(harness, access)
		assert.equal(result.ok, true)
		const observation = observed(result)
		assert.equal(observation.inputHash, digest(prompt))
		assert.equal(observation.packetHash, null)
		assert.deepEqual(observation.files, ['settings.json'])
		if (access === 'none') {
			assert.equal(observation.tools, '')
			assert.equal(observation.cwd, observation.physicalDir, 'none remains isolated from the workspace')
		} else assert.equal(observation.cwd, import.meta.dirname)
		assert.equal(existsSync(observation.dir), false)
	}
})

test('packet files are removed after subprocess failure and budget interruption', async () => {
	for (const mode of ['exit', 'budget']) {
		const result = await run(recipe(mode), 'checks', mode === 'budget' ? 0.025 : 1)
		assert.equal(result.ok, false)
		const observation = observed(result)
		assert.equal(observation.packetHash, digest(prompt), 'the failing call still received complete evidence')
		assert.equal(existsSync(observation.file), false)
		assert.equal(existsSync(dirname(observation.file)), false)
		assert.ok(!result.ok && 'error' in result)
		if (mode === 'budget') assert.equal(result.overBudget?.exceeded, 'minutes')
		else assert.match(result.error, /exited 7/)
	}
})

test('simultaneous file-transport calls receive distinct temporary packet paths and both are cleaned', async () => {
	const results = await Promise.all([run(recipe()), run(recipe(), 'read')])
	for (const result of results) assert.equal(result.ok, true)
	const observations = results.map(observed)
	assert.notEqual(observations[0]!.file, observations[1]!.file)
	for (const observation of observations) {
		assert.equal(observation.packetHash, digest(prompt))
		assert.equal(existsSync(observation.dir), false)
	}
})
