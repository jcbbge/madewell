// Read-only experiment receipts over the existing work record.
import { laneOf, lastJson } from './lane.ts'
import { functionProgress } from './function-progress.ts'
import { createHash } from 'node:crypto'
import { closeSync, openSync, readFileSync, readSync, realpathSync, statSync } from 'node:fs'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { Item, Store } from './store.ts'

type LabStore = Pick<Store['Service'], 'list' | 'get' | 'events' | 'callHeads' | 'call' | 'runner'>
const parsed = (raw: unknown) => typeof raw === 'string' ? lastJson(raw) ?? raw : raw ?? null
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const deliveryJobs = ['ideation', 'planning', 'implementation', 'verification']

/** Show the real small text artifact, and compare it with saved proof when a fingerprint exists. */
function workArtifact(item: Item, verification: Record<string, unknown>) {
	if (typeof verification.artifact !== 'string') return null
	const path = resolve(item.workspace, verification.artifact)
	const absent = (message: string) => ({ path, content: null as string | null, available: false, hashMatches: null as boolean | null, message })
	try {
		const root = realpathSync(item.workspace), actual = realpathSync(path), within = relative(root, actual)
		if (within === '..' || within.startsWith(`..${sep}`) || isAbsolute(within)) return absent('The recorded output is outside this task workspace; its content is unavailable here.')
		const expected = Array.isArray(verification.evidence) ? verification.evidence.find((entry) => typeof entry === 'string' && /^sha256:[a-f0-9]{64}$/.test(entry)) : undefined
		const previewable = ['.md', '.txt', '.json'].includes(extname(actual)) && statSync(actual).size <= 65536
		const bytes = previewable ? readFileSync(actual) : null
		let hashMatches: boolean | null = null
		if (typeof expected === 'string') {
			const hash = createHash('sha256')
			if (bytes) hash.update(bytes)
			else {
				const file = openSync(actual, 'r'), buffer = Buffer.alloc(65536)
				try { for (let size; (size = readSync(file, buffer)) > 0;) hash.update(buffer.subarray(0, size)) } finally { closeSync(file) }
			}
			hashMatches = hash.digest('hex') === expected.slice(7)
		}
		if (!previewable) return { path, content: null, available: true, hashMatches, message: hashMatches === false ? 'This output has changed since it was checked.' : 'The output exists. This view can only preview small text files.' }
		const content = bytes!.toString('utf8')
		return { path, content, available: true, hashMatches, message: hashMatches === true ? 'This is the actual output; it matches the saved verification.' : hashMatches === false ? 'This output has changed since it was checked.' : 'This is the current output; no saved fingerprint is available for comparison.' }
	} catch { return absent('The recorded output file is not available.') }
}

export function jumpPackLab(store: LabStore) {
	const heads = store.callHeads()
	const items = store.list()
	const cases = items.flatMap((item) => {
		const events = store.events(item.id)
		const declaration = events.find((e) => e.kind === 'lab-case')
		if (!declaration) return []
		const receipt = events.findLast((e) => e.kind === 'lab-verdict')
		const resolved = events.findLast((e) => e.kind === 'lab-resolved')
		const conflict = events.findLast((e) => e.kind === 'lab-conflict')
		const context = record(events.findLast((e) => e.kind === 'lab-context')?.data)
		const nodes = (owner: Item) => {
			const history = store.events(owner.id)
			const lane = laneOf(owner.pack)
			return [...lane.discovery, ...lane.delivery].map((step) => {
				const accepted = history.findLast((e) => e.kind === 'accepted' && e.data.job === step.job)
				const call = heads.findLast((c) => c.item === owner.id && c.job === step.job && c.kind === 'execute')
				const start = history.findLast((e) => e.kind === 'trace-started' && e.data.job === step.job && ['execute', 'function', 'compose'].includes(String(e.data.kind)))
				const link = start ? history.findLast((e) => e.kind === 'trace-call' && e.data.invocation === start.data.invocation) : undefined
				const saved = link ? store.call(Number(link.data.call)) : !start && call ? store.call(call.id) : undefined
				const end = start ? history.findLast((e) => e.kind === 'trace-finished' && e.data.invocation === start.data.invocation) : undefined
				const contract = (step.args?.contract ?? {}) as Record<string, unknown>
				const current = owner.job === step.job
				const workReview = history.findLast((e) => e.kind === 'work-phase-review' && e.data.job === step.job)
				const coverageAudit = step.loop === 'discovery' && step.job === 'confirm' ? history.findLast((e) => e.kind === 'lab-coverage-audit') : undefined
				const rejectedWork = workReview?.data.done === false || coverageAudit?.data.passed === false
				return {
					job: step.job, label: String(contract.label ?? `${step.job}()`), loop: step.loop,
					state: rejectedWork ? 'blocked' : accepted && owner.outputs[step.job] !== undefined ? 'accepted' : current && owner.status === 'held' ? 'blocked' : current && owner.status === 'running' && store.runner() ? 'running' : 'pending',
					method: contract.method ?? null, requirements: contract.requirements ?? [],
					input: saved ? { call: saved.id, packet: parsed(saved.prompt), started: saved.started, outcome: saved.outcome } : start?.data.args ?? null,
					output: parsed(owner.outputs[step.job]),
					evidence: { acceptedEvent: accepted?.seq ?? null, workReview: workReview?.data ?? null, coverageAudit: coverageAudit?.data ?? null, commandInvocation: start?.data.invocation ?? null, commandResult: end?.data ?? null, hold: current ? owner.hold ?? null : null },
					trace: `/api/trace/${owner.id}?lens=ax`,
				}
			})
		}
		const completion = (owner: Item) => {
			const phases = nodes(owner).filter((node) => node.loop === 'delivery')
			const history = store.events(owner.id)
			const verification = record(parsed(owner.outputs.verification))
			const artifact = workArtifact(owner, verification)
			const check = phases.find((phase) => phase.job === 'verification')
			const command = laneOf(owner.pack).delivery.find((phase) => phase.job === 'verification')?.run
			const review = history.findLast((event) => event.kind === 'lab-semantic-review')
			const reviewed = review?.data.result === 'pass'
			const checked = verification.verdict === 'passed' && review?.data.result !== 'fail' && (reviewed || !!command && record(check?.evidence.commandResult).status === 'returned')
			const done = ['completed', 'shipped'].includes(owner.status) && deliveryJobs.every((job) => phases.some((phase) => phase.job === job && phase.state === 'accepted')) && checked && (!artifact || artifact.available && artifact.hashMatches !== false)
			return { phases, history, verification, artifact, review, done }
		}
		const task = (owner: Item) => {
			const { phases, history, verification, artifact, review, done } = completion(owner)
			const after = (owner.after ?? []).map((id) => { const prerequisite = store.get(id); return { id, title: prerequisite?.title ?? `Unrecorded task ${id}`, done: !!prerequisite && completion(prerequisite).done } })
			const enteredDelivery = history.some((event) => ['call-started', 'trace-started'].includes(event.kind) && deliveryJobs.includes(String(event.data.job)))
			let why = 'Work has not started.'
			if (done) why = typeof verification.result === 'string' ? verification.result : 'The task was completed and its result was checked.'
			else if (artifact?.hashMatches === false) why = artifact.message
			else if (owner.status === 'candidate') why = 'Not started. This is a proposed task; it has not been selected for delivery.'
			else if (owner.status === 'held') why = owner.hold?.message ?? 'Work stopped before completion.'
			else if (review?.data.result === 'fail') why = 'Independent review did not accept the result.'
			else if (owner.status === 'queued' && after.some((dependency) => !dependency.done)) why = `Waiting for: ${after.filter((dependency) => !dependency.done).map((dependency) => dependency.title).join('; ')}.`
			else if (owner.status === 'queued') why = 'Selected, but work has not started.'
			else if (owner.status === 'running') why = `Work is at ${owner.job}. Completion is not yet recorded.`
			else if (['completed', 'shipped'].includes(owner.status)) why = artifact && !artifact.available ? artifact.message : 'Work was reported complete, but sufficient verification is not recorded.'
			return { id: owner.id, title: owner.id === item.id && typeof context.workTitle === 'string' ? context.workTitle : owner.title, recordTitle: owner.title, objective: owner.objective, brief: owner.source, after, status: owner.status, enteredDelivery, done, why, nextAction: owner.pack?.runtime === 'functions' ? functionProgress(owner, store) : null, phases, result: typeof verification.result === 'string' ? verification.result : null, artifact }
		}
		const children = items.filter((c) => c.discovery === item.id)
		const mode = declaration.data.kind === 'deterministic' ? 'tool-check' : item.flow?.loop === 'discovery' ? 'discovery' : 'direct-delivery'
		const tasks = mode === 'discovery' ? children.map(task) : [task(item)]
		const declared = record(parsed(item.outputs.declare))
		const intent = Array.isArray(context.intent) ? context.intent : Array.isArray(declared.outcomes) ? declared.outcomes.map((outcome) => record(outcome).description).filter((description) => typeof description === 'string') : [item.objective]
		const discovery = nodes(item).filter((node) => node.loop === 'discovery')
		return [{
			id: item.id, title: item.title, kind: String(declaration.data.kind ?? 'deterministic'),
			hypothesis: String(declaration.data.hypothesis ?? ''), expected: declaration.data.expected ?? [],
			status: item.status, source: item.source,
			nextAction: item.pack?.runtime === 'functions' ? functionProgress(item, store) : null,
			objective: item.objective, category: mode === 'tool-check' ? 'tool-check' : 'work-example', mode,
			inputKey: createHash('sha256').update(item.source).digest('hex'),
			inputOrigin: typeof context.inputOrigin === 'string' ? context.inputOrigin : mode === 'tool-check' ? 'Input for a check of the tool itself' : 'Recorded example input',
			workTitle: typeof context.workTitle === 'string' ? context.workTitle : item.title,
			testQuestion: typeof context.testQuestion === 'string' ? context.testQuestion : String(declaration.data.hypothesis ?? ''),
			attemptLabel: typeof context.attemptLabel === 'string' ? context.attemptLabel : mode === 'discovery' ? `Discovery: ${tasks.length} proposed tasks` : `Direct task: ${tasks[0]?.done ? 'done' : 'not done'}`,
			intent, discoveryDone: item.status === 'discovered' && discovery.length > 0 && discovery.every((node) => node.state === 'accepted'), tasks, tasksDone: tasks.filter((work) => work.done).length, done: tasks.length > 0 && tasks.every((work) => work.done),
			composition: resolved ? { selected: resolved.data.selected ?? [], bindings: nodes(item).map((n) => ({ job: n.job, method: n.method, requirements: n.requirements })) } : null,
			verdict: receipt ? receipt.data : null, conflicts: conflict ? [String(conflict.data.message)] : [],
			nodes: nodes(item).filter((n) => n.loop === (item.flow?.loop ?? 'delivery')),
			children: children.map((c) => ({ id: c.id, title: c.title, status: c.status, nodes: nodes(c).filter((n) => n.loop === (c.flow?.loop ?? 'delivery')) })),
		}]
	})
	const runner = store.runner()
	return { observedAt: new Date().toISOString(), runner: { active: !!runner, pid: runner?.pid ?? null }, cases }
}
