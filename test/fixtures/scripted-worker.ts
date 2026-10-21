// A stand-in harness for MW_WORKER_COMMAND: reads the job request on stdin, answers every job with its
// deliverable, confirms every hand-off, reports its version as "scripted 1", and logs "<kind> <job> <profile>"
// lines to $FAKE_LOG. The makers write their files into their worktree (the working directory), so Made
// Well's own check run passes.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const request = JSON.parse(readFileSync(0, 'utf8')) as { kind: string; job: string; profile: string; prompt: string }
appendFileSync(process.env.FAKE_LOG!, `${request.kind} ${request.job} ${request.profile}\n`)
// FAKE_HANG=<job>:<marker file>: hang the first time that job runs, so a test can kill the runner mid-job.
const [hangJob, marker] = (process.env.FAKE_HANG ?? '').split(':')
if (request.kind === 'execute' && request.job === hangJob && marker && !existsSync(marker)) {
	writeFileSync(marker, '')
	setInterval(() => {}, 1000)
	await new Promise(() => {})
}
const write = (path: string, content: string) => {
	mkdirSync(path.split('/').slice(0, -1).join('/') || '.', { recursive: true })
	writeFileSync(path, content)
}
const deliverables: Record<string, () => unknown> = {
	discover: () => ({ items: [{ title: 'First piece', kind: 'feature', objective: 'Do the first thing', text: 'details' }, { title: 'Second piece', kind: 'chore', objective: 'Do the second thing', text: 'details', after: [1, 2, 7] }] }),
	ideate: () => ({ outcome: 'CSV export', approach: 'a script', decisions: [] }),
	challenge: () => ({ findings: [], decisions: [] }),
	plan: () => ({ making: 'export', notMaking: [], scope: ['src/export.sh'], steps: ['write src/export.sh'], doneWhen: [{ id: 'D1', text: 'it prints a,b' }], decisions: [] }),
	'test-plan': () => (write('checks/export.check.sh', '[ "$(sh src/export.sh)" = a,b ]\n'), { checks: [{ id: 'C1', doneWhen: 'D1', run: 'sh checks/export.check.sh' }] }),
	implement: () => (write('src/export.sh', 'echo a,b\n'), { summary: 'wrote src/export.sh' }),
	arbitrate: () => ({ cause: 'undetermined', answer: 'unscripted', evidence: '' }),
}
// FAKE_ASK=<job>: that job's receiver asks until the operator has answered, and its originator defers to the operator.
const asks = request.job === process.env.FAKE_ASK && !request.prompt.includes('"by": "operator"')
const answer = request.kind === 'intake' ? { understanding: asks ? 'mostly' : 'clear', unclear: asks ? ['CSV or PDF?'] : [], ambiguous: [], missing: [], notes: [] }
	: request.kind === 'originator' ? (asks ? { answer: 'Only the operator can choose the format.', needsOperator: true } : { answer: 'as planned', needsOperator: false })
	: deliverables[request.job]!()
process.stdout.write(JSON.stringify({ ok: true, output: JSON.stringify(answer), version: 'scripted 1' }))
