// `mw export <item>` writes one folder per agent call, raw stream included: the postmortem and the eval dataset.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { MadeWellError } from './errors.ts'
import type { Call, Event, Item } from './store.ts'
import type { QaActor, QaExportDocument, QaInstructions, QaRef, QaRun, QaVersion } from './qa.ts'

interface Source {
	get(id: number): Item | undefined
	events(id: number): Event[]
	calls(item?: number): Call[]
}

/** One folder per call of one item: brief, packet, answer, raw stream, tool events and flags. */
export const exportItem = Effect.fn('mw.export')(function* (store: Source, id: number, dir: string) {
	const item = store.get(id)
	if (!item) return yield* new MadeWellError({ code: 'item_not_found', message: `There is no work item #${id}.`, context: { id }, next: [{ run: 'mw status', why: 'list every work item' }] })
	const calls = store.calls(id)
	yield* Effect.try({
		try: () => {
			mkdirSync(dir, { recursive: true })
			writeFileSync(join(dir, 'item.json'), JSON.stringify({ item, events: store.events(id) }, null, 2))
			calls.forEach((c, i) => {
				const folder = join(dir, `${String(i + 1).padStart(3, '0')}-${c.kind}-${c.job}`)
				mkdirSync(folder, { recursive: true })
				const { system, prompt, output, raw, tools, flags, ...meta } = c
				const files: [string, string][] = [['call.json', JSON.stringify(meta, null, 2)], ['brief.txt', system], ['packet.txt', prompt], ['answer.txt', output ?? ''], ['raw.jsonl', raw ?? ''], ['tools.json', JSON.stringify(tools, null, 2)], ['flags.json', JSON.stringify(flags, null, 2)]]
				for (const [name, text] of files) writeFileSync(join(folder, name), text)
			})
		},
		catch: (e) => new MadeWellError({ code: 'export_failed', message: `Cannot write the export of item #${id} to ${dir}.`, context: { id, dir, reason: String(e) }, next: [{ run: `mw export ${id} --out <writable dir>`, why: 'export somewhere writable' }] }),
	})
	return { dir, calls: calls.length }
})

/** A pure read rendering. All supplied text stays literal; JSON is the lossless transport. */
export const formatQaMarkdown = (document: QaExportDocument): string => {
	const lines: string[] = ['# Manual QA follow-up brief', '', `schemaVersion: ${document.schemaVersion}`, `selection: ${document.selection}`, '',
		'Recorded evidence is not repair authorization. Manual verdicts and reported results are different.',
		'External content is unavailable in this export: reference-only, not fetched (unavailable-reference-only).',
		'Missing fixtures and prerequisites are not invented. JSON is the authoritative lossless transport.',
		'The immutable run retains all original ordered pins; selected entries may be a subset.', '']
	const literal = (label: string, value: string | null) => {
		lines.push(`${label}:${value === null || value === '' ? ' not supplied' : ''}`, '')
		if (value === null) return
		let width = 3
		for (const match of value.matchAll(/`+/g)) width = Math.max(width, match[0].length + 1)
		const fence = '`'.repeat(width)
		// Exactly one framing newline; never trim, reindent or normalize the saved string.
		lines.push(`${fence}\n${value}\n${fence}`, '')
	}
	const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, canonical(child)])) : value
	const structured = (label: string, value: unknown) => literal(label, JSON.stringify(canonical(value), null, 2))
	const actor = (label: string, value: QaActor | null) => {
		if (!value) { lines.push(`${label}: not supplied`, ''); return }
		literal(`${label} kind`, value.kind); literal(`${label} label`, value.label)
	}
	const references = (label: string, values: readonly QaRef[]) => {
		lines.push(`${label}${values.length ? ':' : ': not supplied'}`, '')
		values.forEach((value, index) => { lines.push(`Reference ${index + 1}`, ''); literal('Label', value.label); literal('Reference (not fetched)', value.ref) })
	}
	const version = (value: QaVersion) => {
		lines.push(value.kind === 'unknown' ? 'Tested version: explicitly unknown' : 'Tested version: known with source', '')
		if (value.kind === 'known') { literal('Version value', value.value); references('Version source', [value.source]) }
	}
	const locations = (runId: number, caseId?: number, revision?: number) => {
		literal('CLI run read', `mw qa-run ${runId}`)
		literal('HTTP run read', `GET /api/v1/qa/runs/${runId}`)
		literal('CLI complete export', `mw qa-export ${runId} --selection all --format json`)
		literal('HTTP complete export', `GET /api/v1/qa/runs/${runId}/export?selection=all&format=json`)
		if (caseId !== undefined) {
			literal('CLI observations read (paginate to locate the observation ID)', `mw qa-observations ${runId} --case-id ${caseId}`)
			literal('HTTP observations read (paginate to locate the observation ID)', `GET /api/v1/qa/runs/${runId}/observations?caseId=${caseId}`)
			if (revision !== undefined) {
				literal('CLI pinned instructions read', `mw qa-case ${caseId} --revision ${revision}`)
				literal('HTTP pinned instructions read', `GET /api/v1/qa/cases/${caseId}?revision=${revision}`)
			}
		}
	}
	const run = (value: QaRun) => {
		lines.push(`Run ID: ${value.id}`, `Work item: ${value.workItem}`, '')
		literal('Workspace (recorded project identity)', value.workspace); literal('Application', value.application); literal('Environment', value.environment)
		literal('Started at', value.startedAt); actor('Run enteredBy', value.enteredBy); version(value.version)
		structured('Original ordered case pins', value.cases)
		locations(value.id)
	}
	const instructions = (value: QaInstructions) => {
		literal('Title', value.title); literal('Area', value.area); literal('Instruction change', value.change)
		references('Instruction sourceRefs', value.sourceRefs)
		literal('Prerequisites', value.prerequisites); literal('Test data', value.testData)
		lines.push('Ordered actions:', '')
		value.actions.forEach((action, index) => literal(`${index + 1}. Action`, action))
		literal('Expected behavior', value.expected)
	}
	// Rejected drafts have typed, schema-owned keys. Show raw string values as well as exact JSON,
	// since JSON escaping alone would hide original CRLF and multiline text from the literal brief.
	const rejectedText = (value: unknown, label = 'Rejected input') => {
		if (typeof value === 'string') literal(label, value)
		else if (Array.isArray(value)) value.forEach((child, index) => rejectedText(child, `${label} [${index + 1}]`))
		else if (value && typeof value === 'object') Object.keys(value).sort().forEach((key) => rejectedText((value as Record<string, unknown>)[key], `${label}.${key}`))
	}
	lines.push('## Run', '')
	run(document.run)
	if (!document.entries.length) lines.push('Selected entries: none.', '')
	for (const entry of document.entries) {
		lines.push(`## Case ${entry.caseId}`, '', `Pinned instruction revision: ${entry.caseRevision}`, `Current case revision: ${entry.currentCaseRevision}`, `Outdated: ${entry.outdated}`, `Case work item: ${entry.case.workItem}`, '')
		literal('Case workspace', entry.case.workspace); literal('Case created at', entry.case.createdAt)
		actor('Instruction author', entry.instructions.enteredBy); literal('Instruction at', entry.instructions.at)
		instructions(entry.instructions.instructions)
		lines.push(`Current manual status: ${entry.status}`, `Entry revision: ${entry.entryRevision}`, `Latest manual verdict ID: ${entry.latestVerdictId ?? 'not supplied'}`, '')
		locations(document.run.id, entry.caseId, entry.caseRevision)
		lines.push('### Observation history', '')
		if (!entry.observations.length) lines.push('Observations: none; manual status is untested.', '')
		for (const observation of entry.observations) {
			lines.push(`#### Observation ${observation.id}`, '', `Run ID: ${observation.runId}`, `Case ID: ${observation.caseId}`, `Pinned revision: ${observation.caseRevision}`, `Entry revision: ${observation.entryRevision}`, '')
			literal('Kind', observation.kind); actor('Entrant (enteredBy)', observation.enteredBy); actor('Claimed verifier (not authentication)', observation.claimedVerifier)
			literal('Server at', observation.at); literal('Historical observedAt', observation.observedAt)
			literal('Manual verdict', observation.verdict); literal('Reported result (not a manual verdict)', observation.reportedResult)
			literal('Actual behavior', observation.actual); literal('Reproduction', observation.reproduction); literal('Notes', observation.notes)
			references('Evidence (reference-only; unavailable in this export)', observation.evidence)
		}
		lines.push('### Recorded associations', '', 'A recorded fix reference does not resolve a manual failure. Retests have independent manual status.', '')
		if (!entry.links.length) lines.push('Associations: none.', '')
		for (const { link, targetAvailability } of entry.links) {
			lines.push(`#### Association event ${link.event}`, '', `Local targetAvailability: ${targetAvailability}`, `Source observation ID: ${link.source.observationId}`, '')
			literal('Association at', link.at); literal('Association request ID', link.requestId); actor('Association enteredBy', link.enteredBy)
			structured('Immutable source IDs', link.source); locations(link.source.runId, link.source.caseId, link.source.caseRevision)
			if (link.target.kind === 'work-item') {
				lines.push('Recorded fix reference: work item', '', `Target work item: ${link.target.workItem}`, '')
				const saved = link.target.snapshot
				literal('Captured workspace', saved.workspace); literal('Captured title', saved.title); literal('Captured objective', saved.objective); literal('Captured source', saved.source)
				literal('Status at association (not current resolution)', saved.status); literal('Captured updated time', saved.updated)
				literal('CLI target read (may be unavailable)', `mw context ${link.target.workItem}`); literal('HTTP target read (may be unavailable)', `GET /api/v1/items/${link.target.workItem}`)
			} else if (link.target.kind === 'reference') references('Recorded fix reference', [link.target.reference])
			else {
				lines.push('Retest: immutable target run; no verdict copied or inferred.', '', `Target case ID: ${link.target.caseId}`, `Target pinned revision: ${link.target.caseRevision}`, '')
				run(link.target.run); locations(link.target.run.id, link.target.caseId, link.target.caseRevision)
			}
		}
		lines.push('### Rejected drafts and conflicts', '', 'Rejected input was not applied and is not a verdict or pinned instruction.', '')
		if (!entry.conflicts.length) lines.push('Conflicts: none.', '')
		for (const conflict of entry.conflicts) {
			lines.push(`#### Conflict event ${conflict.event}`, '', `Owning work item: ${conflict.workItem}`, `Case ID: ${conflict.caseId}`, `Run ID: ${conflict.runId ?? 'case-wide'}`, `Expected counter: ${conflict.expected}`, `Actual counter: ${conflict.actual}`, '')
			if (conflict.operation === 'reviseCase') lines.push('Case-wide rejected instruction draft, not this run\'s pinned instructions.', '')
			literal('Operation', conflict.operation); literal('Request ID', conflict.requestId); literal('Server at', conflict.at)
			structured('Exact rejected input (JSON)', conflict.input); rejectedText(conflict.input)
			literal('CLI event record', `mw show ${conflict.workItem}`); literal('HTTP event record', `GET /api/item/${conflict.workItem}`)
		}
	}
	return lines.join('\n')
}
