// A stand-in harness for MW_WORKER_COMMAND: reads the job request on stdin, answers every job,
// confirms every hand-off, passes verification, and logs "<kind> <job> <profile>" lines to $FAKE_LOG.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const request = JSON.parse(readFileSync(0, 'utf8')) as { kind: string; job: string; profile: string; prompt: string }
appendFileSync(process.env.FAKE_LOG!, `${request.kind} ${request.job} ${request.profile}\n`)
// FAKE_HANG=<job>:<marker file>: hang the first time that job runs, so a test can kill the runner mid-job.
const [hangJob, marker] = (process.env.FAKE_HANG ?? '').split(':')
if (request.kind === 'execute' && request.job === hangJob && marker && !existsSync(marker)) {
	writeFileSync(marker, '')
	setInterval(() => {}, 1000)
	await new Promise(() => {})
}
const discovered = JSON.stringify({ items: [{ title: 'First piece', kind: 'feature', objective: 'Do the first thing', text: 'details' }, { title: 'Second piece', kind: 'chore', objective: 'Do the second thing', text: 'details' }] })
// FAKE_ASK=<job>: that job's receiver asks until the operator has answered, and its originator defers to the operator.
const asks = request.job === process.env.FAKE_ASK && !request.prompt.includes('"by": "operator"')
const output = asks && request.kind === 'intake' ? '{"understanding":"mostly","questions":["CSV or PDF?"],"notes":[]}' : asks && request.kind === 'originator' ? '{"answer":"Only the operator can choose the format.","needsOperator":true}'
	: request.kind === 'intake' ? '{"understanding":"clear","questions":[],"notes":[]}' : request.job === 'discover' ? `Found two pieces.\n${discovered}` : request.job === 'verify' ? 'Ran the checks.\n{"outcome":"pass","summary":"1/1 passed"}' : `${request.job} deliverable`
process.stdout.write(JSON.stringify({ ok: true, output }))
