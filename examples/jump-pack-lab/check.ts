// Trusted, independently inspectable fixture operations. No publishing, upstream or real database access.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

let raw = ''
for await (const part of process.stdin) raw += part
const input = JSON.parse(raw)
const phase = process.argv[2]!
const mode = process.argv[3]!
const result = (text: string, evidence: string[], extra = {}) => console.log(JSON.stringify({ result: text, evidence, unknowns: [], ...extra }))
try {
	if (mode === 'campaign') {
		assert.equal(phase, 'verification')
		const draft = readFileSync('draft.md', 'utf8')
		assert.match(draft, /Calm Inbox/)
		assert.match(draft, /independent designers/i)
		assert.match(draft, /45[ -]minute/i)
		assert.match(draft, /free/i)
		assert.match(draft, /TBD|to be (?:confirmed|determined)/i)
		assert.match(draft, /reply/i)
		assert.doesNotMatch(draft, /https?:\/\//i)
		assert.doesNotMatch(draft, /(?:guarantee|proven to|double your|\b\d{1,2}:\d{2}\b)/i)
		result('Local campaign draft meets the explicit fixture checks. It has not been sent or published.', ['Read draft.md', `sha256:${createHash('sha256').update(draft).digest('hex')}`, 'Title, audience, duration, free offer, unresolved date, reply CTA and no invented URL checked'], { verdict: 'passed', artifact: 'draft.md' })
	} else if (mode === 'database') {
		if (phase === 'implementation') {
			const db = new DatabaseSync('fixture.db')
			try { db.exec('ALTER TABLE people RENAME COLUMN name TO full_name') } finally { db.close() }
			result('Renamed the sandbox column.', ['ALTER TABLE people RENAME COLUMN name TO full_name'])
		} else if (phase === 'verification') {
			const db = new DatabaseSync('fixture.db', { readOnly: true })
			try {
				assert.deepEqual(db.prepare('SELECT id, full_name FROM people ORDER BY id').all().map((r) => ({ ...r })), [{ id: 1, full_name: 'Ada' }, { id: 2, full_name: 'Lin' }])
				assert.equal(db.prepare('PRAGMA table_info(people)').all().some((r) => r.name === 'name'), false)
				result('Sandbox migration verified against actual stored rows.', ['Both original rows and identifiers preserved', 'full_name readable; old column absent'], { verdict: 'passed' })
			} finally { db.close() }
		} else result(phase === 'ideation' ? 'Preserve the two rows while renaming their name field.' : 'Rename the column, then independently query values and schema.', ['Deterministic fixture method; not a live agent judgment'])
	} else {
		if (phase === 'implementation' && mode !== 'missing-proof') writeFileSync('receipt.json', JSON.stringify({ made: true, source: input.item.source }))
		if (phase === 'verification') {
			assert.ok(existsSync('receipt.json'), 'Required artifact receipt.json is missing')
			const receipt = JSON.parse(readFileSync('receipt.json', 'utf8'))
			assert.equal(receipt.made, true)
			assert.equal(receipt.source, input.item.source)
		}
		result(`${phase} performed by ${mode}.`, ['Deterministic structural experiment'], { ...(phase === 'verification' ? { verdict: 'passed' } : {}) })
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error))
	process.exitCode = 1
}
