// The Gazette sheet and the service that keeps it up. The blazon is written from a recorded model (test/fixtures/
// gazette-model.json, GET /api/model on hive, 2026-10-25); the service is installed into a temporary home on a
// scripted host, so neither systemd nor launchd is touched.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { installService, serviceStatus, servicePaths, uninstallService, type Host } from '../src/ui.ts'
// @ts-ignore: the page's own modules are plain JavaScript
import { blazonOf, lineWords, stampOf, tailWords } from '../ui/gazette/blazon.mjs'
// @ts-ignore
import { painter } from '../ui/gazette/paint.mjs'

const root = mkdtempSync(join(tmpdir(), 'mw-gazette-'))
after(() => rmSync(root, { recursive: true, force: true }))
const T = JSON.parse(readFileSync(join(import.meta.dirname, '../skills/gazette-grammar/tinctures.json'), 'utf8'))
const model = () => JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/gazette-model.json'), 'utf8'))
const cli = join(import.meta.dirname, '../src/cli.ts')

test('the Delivery sheet is written from the model: one ring per item, inks by state, one notice per wait with its exact commands, and one vermilion stamp', () => {
	const b = blazonOf(model(), { zone: 'UTC' })
	assert.deepEqual([b.sheet.masthead.name, b.sheet.masthead.number, b.sheet.masthead.date, b.sheet.sealed], ['Made Well', 102, '25 October 2026', false])
	assert.deepEqual(b.principal.steps, ['Idea', 'Questioned', 'Plan', 'Build', 'Checks', 'Verify', 'Ship'])
	// what waits on you comes first, then what was set aside
	assert.deepEqual(b.principal.rings.map((r: { item: number }) => r.item), [3, 4, 1, 2])
	assert.deepEqual(b.principal.rings[0].fills, ['sage', 'sage', 'sage', 'vermilion', null, null, null], 'done steps are sage; the stopped step is vermilion')
	assert.deepEqual(b.principal.rings[3].fills, ['ochre', 'ochre', 'ochre', null, null, null, null], 'a dropped item\'s done steps are ochre')
	assert.deepEqual(b.principal.centre, { charge: 'disc', ink: 'vermilion', value: '2', words: 'wait on you' })
	assert.equal(b.notices.length, 2)
	const [first, second] = b.notices
	assert.deepEqual([first.item, first.says, first.quote, first.since], [3, 'It stopped at a checkpoint before building, for you to look.', 'Browser verification fixture seeded; inspect the Trace tab.', 'Waiting since 24 Oct, 21:25'])
	assert.deepEqual(first.actions, [
		{ words: 'Let it go on', run: 'mw go 3', weight: 'primary' },
		{ words: 'Say what should change', run: 'mw answer 3 "<what should change>"', weight: 'plain' },
		{ words: 'Drop it', run: 'mw drop 3', weight: 'quiet' },
	])
	assert.deepEqual([second.says, second.actions[0]], ['It could not start: the folder it works in has no branch checked out.', { words: 'Check out main', run: 'git -C /home/jrg/madewell-three-lens switch main', weight: 'plain' }])
	assert.equal(b.notices.flatMap((n: { actions: { weight: string }[] }) => n.actions).filter((a: { weight: string }) => a.weight === 'primary').length, 1)
	assert.deepEqual(b.legend.map((l: { ink: string }) => l.ink), ['sage', 'vermilion', 'ochre'], 'the legend names only the inks on the sheet')
	assert.match(b.colophon, /^From the Made Well record on hive; last entry 24 Oct, 21:57\. 4 items, 19 agent calls, 755,579 tokens, 6 minutes of agent time\. Not sealed: nothing has shipped\.$/)
	// The sheet's own words carry no Made Well jargon; titles and Made Well's messages are quoted as they are.
	const own = JSON.stringify([b.sheet, b.principal.steps, b.principal.centre, b.notices.map((n: { says: string; since: string; actions: { words: string }[] }) => [n.says, n.since, n.actions.map((a) => a.words)]), b.legend, b.colophon])
	for (const word of ['UX', 'DX', 'AX', 'lens', 'cartridge', 'profile', 'NQ', 'hold', 'runner']) assert.doesNotMatch(own, new RegExp(`\\b${word}\\b`), `no "${word}" on the sheet`)
})

test('a running step is a slate-blue notice with its live output in plain words; a lost connection is a warning on the same sheet', () => {
	const m = model()
	m.runner = { pid: 1 }
	m.items[2].status = 'running'
	m.items[2].steps[3].state = 'active'
	m.running = [{ item: 3, kind: 'execute', job: 'implement', who: 'implementer', since: '2026-10-25T18:00:00.000Z', live: '/x/live/item-3-implement-execute.log', title: m.items[2].title, activity: [] }]
	m.needs = m.needs.filter((n: { item: number }) => n.item !== 3)
	const stream = [
		'{"type":"user","message":{"content":[{"type":"text","text":"the prompt"}]}}',
		'{"type":"assistant","message":{"content":[{"type":"text","text":"Reading the plan first."}]}}',
		'{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"npm test"}}]}}',
		'{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{"file_path":"/w/worktrees/x/src/a.ts"}}]}}',
	].join('\n')
	assert.deepEqual(tailWords(stream), ['Reading the plan first.', '$ npm test', 'Read src/a.ts'])
	assert.equal(lineWords('plain text line'), 'plain text line')
	const b = blazonOf(m, { zone: 'UTC', live: { 'item-3-implement-execute.log': stream } })
	assert.deepEqual(b.principal.rings.map((r: { item: number }) => r.item), [4, 3, 1, 2], 'what waits on you comes before what moves')
	assert.deepEqual(b.principal.rings[1].fills.slice(0, 4), ['sage', 'sage', 'sage', 'slate-blue'])
	const running = b.notices.find((n: { ink: string }) => n.ink === 'slate-blue')
	assert.deepEqual([running.item, running.since, running.output], [3, 'Running since 25 Oct, 18:00', ['Reading the plan first.', '$ npm test', 'Read src/a.ts']])
	assert.deepEqual(b.legend.map((l: { ink: string }) => l.ink), ['sage', 'vermilion', 'slate-blue', 'ochre'])
	const stale = blazonOf(m, { zone: 'UTC', stale: '2026-10-25T18:30:00.000Z' })
	assert.equal(stale.sheet.warning, 'Made Well has not answered since 25 Oct, 18:30. This is the sheet as it was then.')
	assert.deepEqual(stampOf({ run: 'mw something 9', why: 'look at it, then decide' }), { words: 'Look at it', run: 'mw something 9', weight: 'plain' })
})

test('the painter draws the blazon and nothing else: it refuses an unknown tincture and a second vermilion stamp', () => {
	const P = painter(T)
	const b = blazonOf(model(), { zone: 'UTC' })
	const html = P.sheet(b)
	assert.match(html, /<h1>Made Well<\/h1>/)
	assert.match(html, /No\. 102/)
	assert.equal((html.match(/class="stamp primary"/g) ?? []).length, 1)
	assert.match(html, /data-run="mw go 3"/)
	assert.match(html, /url\(#h-vermilion\)/, 'inks are painted with their hatching')
	assert.match(html, /aria-label="3, Three-lens browser verification trace fixture: 4 of 7 steps;/)
	assert.match(P.style(b.sheet), /--vermilion: #d56252;/)
	b.notices[1].actions[0].weight = 'primary'
	assert.throws(() => P.sheet(b), /2 primary actions/)
	const c = blazonOf(model(), { zone: 'UTC' })
	c.principal.rings[0].fills[0] = 'crimson'
	assert.throws(() => P.sheet(c), /unknown tincture: crimson/)
	assert.throws(() => P.style({ ground: 'paper', around: 'neon' }), /unknown tincture: neon/)
})

/** A host whose service manager is a script: every call is recorded, and `state` says what it answers. */
const scripted = (platform: NodeJS.Platform, env: NodeJS.ProcessEnv = {}) => {
	const calls: string[] = []
	const state = { active: false, loaded: false, linger: 'no' }
	const host: Host = {
		platform, home: mkdtempSync(join(root, `${platform}-`)), uid: 501, env, node: '/opt/node/bin/node', script: '/opt/mw/dist/mw.mjs',
		run: (file, args) => {
			const line = [file, ...args].join(' ')
			calls.push(line)
			if (line === 'systemctl --user is-active madewell-ui') return { code: state.active ? 0 : 3, out: state.active ? 'active\n' : 'inactive\n', err: '' }
			if (line.startsWith('systemctl --user show madewell-ui')) return { code: 0, out: `ActiveState=${state.active ? 'active' : 'inactive'}\nMainPID=${state.active ? 4242 : 0}\n`, err: '' }
			if (line.startsWith('systemctl --user enable --now') || line.startsWith('systemctl --user restart')) state.active = true
			if (line.startsWith('systemctl --user disable --now')) state.active = false
			if (line.startsWith('loginctl show-user')) return { code: 0, out: `${state.linger}\n`, err: '' }
			if (line === 'loginctl enable-linger') return state.linger === 'refused' ? { code: 1, out: '', err: 'Could not enable linger: Interactive authentication required.\n' } : ((state.linger = 'yes'), { code: 0, out: '', err: '' })
			if (line.startsWith('launchctl print')) return state.loaded ? { code: 0, out: `${host.platform}\n\tpid = 777\n\tstate = running\n`, err: '' } : { code: 113, out: '', err: 'Could not find service\n' }
			if (line.startsWith('launchctl bootstrap')) state.loaded = true
			if (line.startsWith('launchctl bootout')) state.loaded = false
			return { code: 0, out: '', err: '' }
		},
	}
	return { host, calls, state }
}

test('on Linux, --install writes one systemd user unit that runs this build with the MW_* variables, enables and starts it; again changes nothing; --uninstall removes it', () => {
	const { host, calls, state } = scripted('linux', { MW_STORE: '/data/mw/madewell.db', MW_TELEMETRY: '/data/tel', PATH: '/usr/bin', HOME: '/home/x' })
	assert.deepEqual(serviceStatus(host), { service: 'madewell-ui.service', platform: 'linux', installed: false, running: false, address: null, unit: join(host.home, '.config/systemd/user/madewell-ui.service'), next: [{ run: 'mw ui --install', why: 'provision the web interface as an always-on background service of this user' }] })
	assert.equal(calls.length, 0, 'status of nothing installed asks the manager nothing')

	const first = installService(host, { port: 4747 })
	const unit = servicePaths(host).unit
	assert.deepEqual([first.installed, first.running, first.changed, first.wrote, first.linger, first.pid, first.address], [true, true, true, [unit], 'enabled', 4242, 'http://127.0.0.1:4747/'])
	assert.equal(first.execStart, '/opt/node/bin/node /opt/mw/dist/mw.mjs ui --port 4747', 'the service runs the executable and script that provisioned it')
	const text = readFileSync(unit, 'utf8')
	assert.match(text, /^ExecStart="\/opt\/node\/bin\/node" "\/opt\/mw\/dist\/mw\.mjs" "ui" "--port" "4747"$/m)
	assert.match(text, /^Restart=on-failure$/m)
	assert.match(text, /^WantedBy=default\.target$/m)
	assert.match(text, /^Environment="MW_STORE=\/data\/mw\/madewell\.db"$/m)
	assert.match(text, /^Environment="MW_TELEMETRY=\/data\/tel"$/m)
	assert.doesNotMatch(text, /PATH=|HOME=/, 'only MW_* variables are carried')
	assert.deepEqual(calls, ['systemctl --user daemon-reload', 'systemctl --user is-active madewell-ui', 'systemctl --user enable --now madewell-ui', 'loginctl show-user 501 -p Linger --value', 'loginctl enable-linger', 'systemctl --user show madewell-ui -p ActiveState -p MainPID'])

	calls.length = 0
	const again = installService(host, { port: 4747 })
	assert.deepEqual([again.changed, again.wrote, again.linger, again.running], [false, [], 'already enabled', true])
	assert.equal(readFileSync(unit, 'utf8'), text, 'the unit is untouched')
	assert.ok(!calls.some((c) => c.includes('restart') || c.includes('--now')), 'nothing is restarted: ' + calls.join('; '))

	// A different port rewrites the unit and restarts the running service.
	const moved = installService(host, { port: 4800 })
	assert.deepEqual([moved.changed, moved.address, moved.execStart], [true, 'http://127.0.0.1:4800/', '/opt/node/bin/node /opt/mw/dist/mw.mjs ui --port 4800'])
	assert.ok(calls.includes('systemctl --user restart madewell-ui'))

	state.linger = 'refused'
	rmSync(unit)
	state.active = false
	const refused = installService(host, {})
	assert.match(refused.linger!, /^refused: Could not enable linger: Interactive authentication required\.; the service runs while you are logged in$/)
	assert.equal(refused.execStart, '/opt/node/bin/node /opt/mw/dist/mw.mjs ui')
	assert.deepEqual([refused.installed, refused.running, refused.address], [true, true, 'http://127.0.0.1:4747/'], 'a refused linger is reported, never an error')

	calls.length = 0
	const gone = uninstallService(host)
	assert.deepEqual([gone.installed, gone.running, gone.removed], [false, false, [unit]])
	assert.equal(existsSync(unit), false)
	assert.deepEqual(calls, ['systemctl --user disable --now madewell-ui', 'systemctl --user daemon-reload'])
	assert.deepEqual(uninstallService(host).removed, [], 'uninstalling nothing removes nothing')
	assert.equal(existsSync(join(host.home, '.config')), true, 'only the unit goes; the directory is the user\'s')
})

test('on macOS, --install writes one LaunchAgent and bootstraps it; again changes nothing; --uninstall boots it out and removes the plist and its log', () => {
	const { host, calls } = scripted('darwin', { MW_HOME: '/Users/x/Library/Application Support/madewell' })
	const first = installService(host, {})
	const { unit, log } = servicePaths(host)
	assert.equal(unit, join(host.home, 'Library/LaunchAgents/com.madewell.ui.plist'))
	assert.deepEqual([first.installed, first.running, first.changed, first.wrote, first.pid, first.address, first.linger], [true, true, true, [unit], 777, 'http://127.0.0.1:4747/', undefined])
	assert.equal(first.execStart, '/opt/node/bin/node /opt/mw/dist/mw.mjs ui')
	const text = readFileSync(unit, 'utf8')
	assert.match(text, /<key>Label<\/key><string>com\.madewell\.ui<\/string>/)
	assert.match(text, /<key>ProgramArguments<\/key><array><string>\/opt\/node\/bin\/node<\/string><string>\/opt\/mw\/dist\/mw\.mjs<\/string><string>ui<\/string><\/array>/)
	assert.match(text, /<key>MW_HOME<\/key><string>\/Users\/x\/Library\/Application Support\/madewell<\/string>/)
	assert.match(text, /<key>KeepAlive<\/key><true\/>/)
	assert.match(text, /<key>RunAtLoad<\/key><true\/>/)
	assert.deepEqual(calls, ['launchctl print gui/501/com.madewell.ui', `launchctl bootstrap gui/501 ${unit}`, 'launchctl print gui/501/com.madewell.ui'])

	calls.length = 0
	const again = installService(host, {})
	assert.deepEqual([again.changed, again.wrote], [false, []])
	assert.deepEqual(calls, ['launchctl print gui/501/com.madewell.ui', 'launchctl print gui/501/com.madewell.ui'], 'a loaded, unchanged agent is left alone')
	assert.deepEqual([serviceStatus(host).running, serviceStatus(host).execStart], [true, '/opt/node/bin/node /opt/mw/dist/mw.mjs ui'])

	calls.length = 0
	mkdirSync(join(log!, '..'), { recursive: true })
	writeFileSync(log!, 'served\n')
	const gone = uninstallService(host)
	assert.deepEqual([gone.installed, gone.removed], [false, [unit, log]])
	assert.deepEqual(calls, ['launchctl bootout gui/501/com.madewell.ui'])
	assert.deepEqual([existsSync(unit), existsSync(log!)], [false, false])
})

test('any other platform is refused with a Made Well error that names it; the CLI reports a service that is not installed and refuses two actions at once', () => {
	const { host } = scripted('win32')
	assert.throws(() => installService(host, {}), (e: { code: string; context: { platform: string; supported: string[] }; next: { run: string }[] }) => e.code === 'ui_unsupported' && e.context.platform === 'win32' && e.context.supported.includes('linux') && e.next[0].run === 'mw ui')
	assert.throws(() => uninstallService(host), (e: { code: string }) => e.code === 'ui_unsupported')
	assert.equal(serviceStatus(host).installed, false)

	const home = mkdtempSync(join(root, 'home-'))
	const env: Record<string, string | undefined> = { ...process.env, HOME: home, MW_HOME: join(home, 'mw') }
	delete env.MW_STORE
	const status = spawnSync(process.execPath, [cli, 'ui', '--status'], { env, encoding: 'utf8' })
	assert.equal(status.status, 0, status.stderr)
	const view = JSON.parse(status.stdout)
	assert.deepEqual([view.installed, view.running, view.answering, view.address, view.next[0].run], [false, false, false, null, 'mw ui --install'])
	const both = spawnSync(process.execPath, [cli, 'ui', '--install', '--status'], { env, encoding: 'utf8' })
	assert.equal(both.status, 1)
	assert.deepEqual([JSON.parse(both.stderr).error, JSON.parse(both.stderr).context], ['usage', { command: 'ui' }])
	assert.equal(existsSync(join(home, '.config')), false, 'status writes nothing')
})
