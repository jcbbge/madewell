// `mw export <item>` writes one folder per agent call, raw stream included: the postmortem and the eval dataset.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { MadeWellError } from './errors.ts'
import type { Call, Event, Item } from './store.ts'

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
