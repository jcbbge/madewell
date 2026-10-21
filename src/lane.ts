// The delivery lane: one work item in, one shipped change out.
// Four stages, six agent profiles, each a separate job on its own card. The arbiter rules on failures.

export type Job = 'ideate' | 'challenge' | 'plan' | 'test-plan' | 'implement' | 'verify' | 'arbitrate'
export type Stage = 'ideation' | 'planning' | 'implementation' | 'verification'
export type Cause = 'pre-existing' | 'implementation' | 'test'

export interface Step {
	readonly job: Job
	readonly stage: Stage
	readonly profile: string
	readonly duty: string
}

export const DELIVERY: ReadonlyArray<Step> = [
	{ job: 'ideate', stage: 'ideation', profile: 'ideator', duty: 'Shape the outcome and bounded options; recommend the smallest useful approach. Do not implement.' },
	{ job: 'challenge', stage: 'ideation', profile: 'ideation peer', duty: 'Challenge the idea against the actual workspace: defects, missing constraints, unnecessary scope. Do not implement.' },
	{ job: 'plan', stage: 'planning', profile: 'planner', duty: 'Inspect the workspace and write the contract: Making / Not making / Done when / Waits on, with exact paths and instructions. Resolve every design choice. Do not implement.' },
	{ job: 'test-plan', stage: 'planning', profile: 'test architect', duty: 'From the plan alone, write the checks for this work item and the exact commands that run them. Do not write product code.' },
	{ job: 'implement', stage: 'implementation', profile: 'implementer', duty: 'Execute the plan exactly as written. Do not design, improvise or change the plan or the checks.' },
	{ job: 'verify', stage: 'verification', profile: 'verifier', duty: 'Run only this item\'s checks and report what you observed. Never repair, retry or broaden.' },
]

export const ARBITER: Step = {
	job: 'arbitrate',
	stage: 'verification',
	profile: 'arbiter',
	duty: 'A check failed or a step could not be done as written. Decide whose it is: a pre-existing bug, a bad implementation, or a bad test.',
}

export const stepOf = (job: Job): Step => (job === 'arbitrate' ? ARBITER : DELIVERY.find((s) => s.job === job)!)

/** What each job must end its answer with, as a JSON object on its own. */
export const ENDS_WITH: Partial<Record<Job, string>> = {
	'test-plan': '{"blocked": string} only if something stops you from doing the step as written',
	implement: '{"blocked": string} only if the plan is wrong or a step cannot be done as written',
	verify: '{"outcome": "pass"|"fail", "summary": string}',
	arbitrate: '{"cause": "pre-existing"|"implementation"|"test"|"undetermined", "answer": string, "evidence": string}',
}

/** Where the work goes after a job reports. Pure: the engine applies it. */
export type Route =
	| { readonly to: 'next'; readonly job: Job }
	| { readonly to: 'ship' }
	| { readonly to: 'arbitrate'; readonly failure: string }
	| { readonly to: 'rework'; readonly job: Job; readonly cause: Cause; readonly answer: string }
	| { readonly to: 'prerequisite'; readonly answer: string }
	| { readonly to: 'hold'; readonly code: string; readonly message: string }
	| { readonly to: 'malformed'; readonly expected: string }

export const MAX_CORRECTIONS = 3

export function route(job: Job, output: string, corrections: number): Route {
	const report = lastJson(output)
	if ((job === 'implement' || job === 'test-plan') && typeof report?.blocked === 'string' && report.blocked.trim()) {
		return { to: 'arbitrate', failure: `The ${stepOf(job).profile} (${job}) could not do the step as written: ${report.blocked}` }
	}
	if (job === 'verify') {
		if (report?.outcome === 'pass') return { to: 'ship' }
		if (report?.outcome === 'fail') return { to: 'arbitrate', failure: output }
		return { to: 'malformed', expected: ENDS_WITH.verify! }
	}
	if (job === 'arbitrate') {
		const cause = report?.cause
		const answer = typeof report?.answer === 'string' ? report.answer : ''
		if (cause !== 'pre-existing' && cause !== 'implementation' && cause !== 'test' && cause !== 'undetermined') {
			return { to: 'malformed', expected: ENDS_WITH.arbitrate! }
		}
		if (cause === 'undetermined') return { to: 'hold', code: 'arbiter_undetermined', message: `The arbiter could not decide whose failure this is: ${answer}` }
		if (corrections >= MAX_CORRECTIONS) return { to: 'hold', code: 'too_many_corrections', message: `${corrections} corrections have not made the checks pass. Last ruling: ${cause}: ${answer}` }
		if (cause === 'pre-existing') return { to: 'prerequisite', answer }
		return { to: 'rework', job: cause === 'test' ? 'test-plan' : 'plan', cause, answer }
	}
	const i = DELIVERY.findIndex((s) => s.job === job)
	return { to: 'next', job: DELIVERY[i + 1]!.job }
}

/** The last top-level JSON object in a worker's answer, or undefined. */
export function lastJson(text: string): Record<string, unknown> | undefined {
	for (let start = text.lastIndexOf('{'); start !== -1; start = text.lastIndexOf('{', start - 1)) {
		try {
			const value = JSON.parse(text.slice(start).trim())
			if (value && typeof value === 'object' && !Array.isArray(value)) return value
		} catch {}
	}
	return undefined
}
