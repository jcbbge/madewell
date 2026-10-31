// Opt-in discovery identities and conservation; task completion remains the scheduler's only readiness boundary.
import { Result, Schema } from 'effect'
import { Decision } from './decision.ts'

export const DISCOVERY_CONTRACT_VERSION = '1'
const jobs = ['declare', 'look-first', 'classify', 'lenses', 'one-thing', 'route', 'discover'] as const
export type DiscoveryJob = typeof jobs[number]
const Text = Schema.NonEmptyString
const Refs = Schema.Array(Text)
const SourceRefs = Refs.annotate({ description: 'Evidence identities: use evidence[].id values declared in this contribution or an earlier accepted contribution. Do not put file paths, URLs, line locators or evidence[].ref strings here. Declare each actual locator under evidence:[{id,ref}] and cite its id here.' })
const Evidence = Schema.Struct({ id: Text, ref: Text })
const Question = Schema.Struct({ id: Text, text: Text, ownerRole: Text, blockingRole: Schema.NullOr(Text), sources: SourceRefs })
const Claim = { id: Text, text: Text, sources: SourceRefs }
const Artifact = Schema.Struct({ id: Text, description: Text, sources: SourceRefs })
const Candidate = {
	key: Text, title: Text, kind: Schema.Literals(['feature', 'fix', 'chore']), objective: Text, text: Text,
	requirementIds: Refs, artifacts: Schema.Array(Artifact),
}
const Dependency = Schema.Struct({
	id: Text, producer: Text, consumer: Text, reason: Text, sources: SourceRefs, artifactId: Schema.NullOr(Text),
	readiness: Schema.Literals(['task-delivered', 'within-task']).annotate({ description: 'Only task-delivered is executable. Split an early artifact into its own task; within-task readiness is unsupported.' }),
})
const Preparation = Schema.Struct({ id: Text, candidate: Text, before: Text, reason: Text, sources: SourceRefs })
const Requirement = { ...Claim, kind: Schema.Literals(['outcome', 'constraint']), origin: Schema.Literals(['explicit', 'interpretation']) }
const IntentDisposition = Schema.Struct({ intentId: Text, kind: Schema.Literals(['provided', 'context', 'deferred', 'superseded']), reason: Text, sources: SourceRefs })
const QuestionRefs = Refs.annotate({ description: 'IDs from accepted questions that this candidate must carry into delivery. Keep earlier bindings at confirmation; new route/confirmation questions can be added. Use [] when none apply.' })
const common = {
	discoveryContract: Schema.Literal(DISCOVERY_CONTRACT_VERSION), result: Text,
	sources: Refs, unknowns: Schema.Array(Schema.String), decisions: Schema.Array(Decision),
	evidence: Schema.Array(Evidence), questions: Schema.Array(Question),
}
const schemas = {
	declare: Schema.Struct({ ...common, intent: Schema.Array(Schema.Struct({ ...Claim, authority: Schema.Literals(['explicit', 'interpretation']) })) }),
	'look-first': Schema.Struct({ ...common, observations: Schema.Array(Schema.Struct(Claim)) }),
	classify: Schema.Struct({ ...common, requirements: Schema.Array(Schema.Struct(Requirement)) }),
	lenses: Schema.Struct({ ...common, tradeoffs: Schema.Array(Schema.Struct({ ...Claim, requirementIds: Refs })) }),
	'one-thing': Schema.Struct({ ...common, candidates: Schema.Array(Schema.Struct(Candidate)) }),
	route: Schema.Struct({ ...common, dependencies: Schema.Array(Dependency), preparation: Schema.Array(Preparation) }),
	discover: Schema.Struct({ ...common, items: Schema.Array(Schema.Struct({ ...Candidate, after: Schema.Array(Schema.Int) })), dependencyIds: Refs, preparationIds: Refs, questionIds: Refs }),
} as const
const handoffSchemas = {
	...schemas,
	classify: Schema.Struct({ ...common, requirements: Schema.Array(Schema.Struct({ ...Requirement, intentIds: Refs.annotate({ description: 'One or more Declare.intent[].id values accounted for by this requirement.' }) })), intentDispositions: Schema.Array(IntentDisposition).annotate({ description: 'Explicitly account for declared intents that do not become requirements, with a reason and evidence IDs. Use [] when all intents map to requirements.' }) }),
	'one-thing': Schema.Struct({ ...common, candidates: Schema.Array(Schema.Struct({ ...Candidate, questionRefs: QuestionRefs })) }),
	discover: Schema.Struct({ ...common, items: Schema.Array(Schema.Struct({ ...Candidate, questionRefs: QuestionRefs, after: Schema.Array(Schema.Int) })), dependencyIds: Refs, preparationIds: Refs, questionIds: Refs }),
} as const
export interface DiscoveryContractOptions { readonly handoff?: boolean }
export type DiscoveryContributions = { readonly [J in DiscoveryJob]: typeof schemas[J]['Type'] }
export type DiscoveryContribution = DiscoveryContributions[DiscoveryJob]
export type AcceptedDiscovery = Readonly<Partial<Record<DiscoveryJob, unknown>>>
export interface DiscoveryIssue { readonly code: string; readonly at: string; readonly message: string }
export type DiscoveryValidation<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string; readonly issues: ReadonlyArray<DiscoveryIssue> }

/** JSON schemas describe the opt-in outputs; richer prose and original evidence stay on the saved output. */
export const DISCOVERY_CONTRIBUTION_SCHEMAS = Object.fromEntries(jobs.map((job) => [job, Schema.toJsonSchemaDocument(schemas[job]).schema])) as Record<DiscoveryJob, Record<string, unknown>>
const handoffShapes = Object.fromEntries(jobs.map((job) => [job, Schema.toJsonSchemaDocument(handoffSchemas[job]).schema])) as Record<DiscoveryJob, Record<string, unknown>>
export const discoveryContributionShape = (job: DiscoveryJob, options: DiscoveryContractOptions = {}): Record<string, unknown> => options.handoff ? handoffShapes[job] : DISCOVERY_CONTRIBUTION_SCHEMAS[job]
export const usesDiscoveryContract = (value: unknown): boolean => !!value && typeof value === 'object' && 'discoveryContract' in value
const failed = (issues: ReadonlyArray<DiscoveryIssue>): DiscoveryValidation<never> => ({ ok: false, reason: issues.map((i) => `${i.at}: ${i.message}`).join(' '), issues })

/** Parses only structure. Validation against the accepted prefix is a separate, mandatory conservation step. */
export function parseDiscoveryContribution<J extends DiscoveryJob>(job: J, value: unknown, options: DiscoveryContractOptions = {}): DiscoveryValidation<DiscoveryContributions[J]> {
	const parsed = Schema.decodeUnknownResult((options.handoff ? handoffSchemas : schemas)[job])(value, { errors: 'all' })
	return Result.isFailure(parsed)
		? failed([{ code: 'shape', at: job, message: String(parsed.failure) }])
		: { ok: true, value: value as DiscoveryContributions[J] }
}

/** An accepted prefix supplies identities, never a prose reconstruction or a fresh final graph. */
export function validateDiscoveryContribution<J extends DiscoveryJob>(job: J, value: unknown, accepted: AcceptedDiscovery = {}, options: DiscoveryContractOptions = {}): DiscoveryValidation<DiscoveryContributions[J]> {
	const current = parseDiscoveryContribution(job, value, options)
	if (!current.ok) return current
	const issues: DiscoveryIssue[] = []
	const issue = (code: string, at: string, message: string) => issues.push({ code, at, message })
	const prefix: Partial<{ [K in DiscoveryJob]: DiscoveryContributions[K] }> = {}
	for (const previous of jobs.slice(0, jobs.indexOf(job))) {
		if (accepted[previous] === undefined) { issue('missing-contribution', previous, 'An earlier accepted contribution is missing.'); continue }
		const parsed = parseDiscoveryContribution(previous, accepted[previous], options)
		if (!parsed.ok) issues.push(...parsed.issues)
		else Object.assign(prefix, { [previous]: parsed.value })
	}
	Object.assign(prefix, { [job]: current.value })
	const entries = jobs.flatMap((key) => prefix[key] ? [[key, prefix[key]!] as const] : [])
	const evidence = new Map<string, string>()
	const questionIds = new Set<string>()
	const questionJobs = new Map<string, DiscoveryJob>()
	const unique = (values: ReadonlyArray<string>, at: string) => {
		const seen = new Set<string>()
		for (const id of values) {
			if (!id.trim()) issue('empty-identity', at, 'An identity must contain visible text.')
			if (seen.has(id)) issue('duplicate-identity', at, `Identity ${id} repeats.`)
			seen.add(id)
		}
	}
	for (const [key, contribution] of entries) {
		unique(contribution.evidence.map((e) => e.id), `${key}.evidence`)
		for (const e of contribution.evidence) {
			if (evidence.has(e.id) && evidence.get(e.id) !== e.ref) issue('changed-source', `${key}.evidence`, `Source ${e.id} changes its accepted reference.`)
			evidence.set(e.id, e.ref)
		}
		unique(contribution.questions.map((q) => q.id), `${key}.questions`)
		for (const q of contribution.questions) {
			if (questionIds.has(q.id)) issue('changed-question', `${key}.questions`, `Question ${q.id} already exists; preserve its accepted identity by reference.`)
			questionIds.add(q.id)
			questionJobs.set(q.id, key)
			if (!q.ownerRole.trim() || q.blockingRole !== null && !q.blockingRole.trim()) issue('ownerless-question', `${key}.questions.${q.id}`, 'A question needs an owning role and an explicit blocking role or null.')
		}
	}
	const refs = (ids: ReadonlyArray<string>, at: string, universe: ReadonlySet<string> | ReadonlyMap<string, unknown>, required = false) => {
		unique(ids, at)
		if (required && !ids.length) issue('missing-reference', at, 'At least one accepted reference is required.')
		for (const id of ids) if (!universe.has(id)) issue('unknown-reference', at, `Unknown reference ${id}. Cite a declared identity, not its path or text.`)
	}
	for (const [key, contribution] of entries) for (const q of contribution.questions) refs(q.sources, `${key}.questions.${q.id}.sources`, evidence, true)
	const requirements = prefix.classify?.requirements ?? []
	const requiredIds = new Set(requirements.map((r) => r.id))
	unique(requirements.map((r) => r.id), 'classify.requirements')
	if (options.handoff && prefix.classify) {
		const intents = new Set((prefix.declare?.intent ?? []).map(intent => intent.id))
		const covered = new Set<string>()
		for (const requirement of requirements as ReadonlyArray<typeof requirements[number] & { intentIds: ReadonlyArray<string> }>) {
			refs(requirement.intentIds, `classify.requirements.${requirement.id}.intentIds`, intents, true)
			for (const id of requirement.intentIds) covered.add(id)
		}
		const dispositions = (prefix.classify as DiscoveryContributions['classify'] & { intentDispositions: ReadonlyArray<typeof IntentDisposition.Type> }).intentDispositions
		unique(dispositions.map(disposition => disposition.intentId), 'classify.intentDispositions')
		for (const disposition of dispositions) {
			refs([disposition.intentId], 'classify.intentDispositions.intentId', intents)
			refs(disposition.sources, `classify.intentDispositions.${disposition.intentId}.sources`, evidence, true)
			if (!disposition.reason.trim()) issue('missing-disposition-reason', `classify.intentDispositions.${disposition.intentId}`, 'An intent disposition needs its source-grounded reason.')
			if (covered.has(disposition.intentId)) issue('conflicting-intent-disposition', `classify.intentDispositions.${disposition.intentId}`, 'An intent cannot be both assigned to requirements and disposed of.')
			covered.add(disposition.intentId)
		}
		for (const id of intents) if (!covered.has(id)) issue('lost-intent', 'classify', `Declared intent ${id} needs a requirement or an explicit sourced disposition.`)
	}
	for (const [key, claims] of [
		['declare.intent', prefix.declare?.intent ?? []], ['look-first.observations', prefix['look-first']?.observations ?? []],
		['classify.requirements', requirements], ['lenses.tradeoffs', prefix.lenses?.tradeoffs ?? []],
	] as const) {
		unique(claims.map((c) => c.id), key)
		for (const c of claims) refs(c.sources, `${key}.${c.id}.sources`, evidence, true)
	}
	for (const tradeoff of prefix.lenses?.tradeoffs ?? []) refs(tradeoff.requirementIds, `lenses.tradeoffs.${tradeoff.id}.requirementIds`, requiredIds, true)
	const candidates = prefix['one-thing']?.candidates ?? []
	const candidateKeys = new Set(candidates.map((c) => c.key))
	const artifacts = new Map<string, string>()
	unique(candidates.map((c) => c.key), 'one-thing.candidates')
	const checkCandidates = (items: ReadonlyArray<DiscoveryContributions['one-thing']['candidates'][number]>, at: string) => {
		const covered = new Set<string>()
		for (const candidate of items) {
			refs(candidate.requirementIds, `${at}.${candidate.key}.requirementIds`, requiredIds, true)
			if (options.handoff) refs((candidate as typeof candidate & { questionRefs: ReadonlyArray<string> }).questionRefs, `${at}.${candidate.key}.questionRefs`, questionIds)
			candidate.requirementIds.forEach((id) => covered.add(id))
			unique(candidate.artifacts.map((a) => a.id), `${at}.${candidate.key}.artifacts`)
			for (const artifact of candidate.artifacts) refs(artifact.sources, `${at}.${candidate.key}.artifacts.${artifact.id}.sources`, evidence, true)
		}
		for (const id of requiredIds) if (!covered.has(id)) issue('lost-requirement', at, `Requirement ${id} has no candidate owner.`)
		if (options.handoff) {
			const bound = new Set(items.flatMap(candidate => (candidate as typeof candidate & { questionRefs: ReadonlyArray<string> }).questionRefs))
			const boundary = jobs.indexOf(at === 'one-thing.candidates' ? 'one-thing' : 'discover')
			for (const [key, contribution] of entries) if (jobs.indexOf(key) <= boundary) for (const question of contribution.questions) {
				if (question.blockingRole !== null && !bound.has(question.id)) issue('lost-blocking-question', at, `Blocking question ${question.id} needs at least one candidate to carry its resolution obligation.`)
			}
		}
	}
	if (prefix['one-thing']) checkCandidates(candidates, 'one-thing.candidates')
	for (const candidate of candidates) for (const artifact of candidate.artifacts) {
		if (artifacts.has(artifact.id)) issue('duplicate-artifact', 'one-thing.candidates', `Artifact ${artifact.id} has multiple producers.`)
		artifacts.set(artifact.id, candidate.key)
	}
	const dependencies = prefix.route?.dependencies ?? []
	const preparation = prefix.route?.preparation ?? []
	unique(dependencies.map((e) => e.id), 'route.dependencies')
	unique(preparation.map((p) => p.id), 'route.preparation')
	const predecessors = new Map<string, Set<string>>()
	for (const edge of dependencies) {
		refs([edge.producer], `route.dependencies.${edge.id}.producer`, candidateKeys)
		refs([edge.consumer], `route.dependencies.${edge.id}.consumer`, candidateKeys)
		refs(edge.sources, `route.dependencies.${edge.id}.sources`, evidence, true)
		if (!edge.reason.trim()) issue('missing-reason', `route.dependencies.${edge.id}`, 'A dependency needs a reason.')
		if (edge.readiness !== 'task-delivered') issue('unsupported-readiness', `route.dependencies.${edge.id}`, 'Within-task readiness is unsupported; make the prerequisite artifact a separately delivered task.')
		if (edge.artifactId !== null && artifacts.get(edge.artifactId) !== edge.producer) issue('unknown-artifact', `route.dependencies.${edge.id}.artifactId`, `Artifact ${edge.artifactId} is not produced by ${edge.producer}.`)
		const before = predecessors.get(edge.consumer) ?? new Set<string>()
		if (before.has(edge.producer)) issue('duplicate-dependency', `route.dependencies.${edge.id}`, 'This producer/consumer edge already exists.')
		before.add(edge.producer)
		predecessors.set(edge.consumer, before)
	}
	const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
		if (seen.has(from)) return false
		seen.add(from)
		return [...predecessors.get(from) ?? []].some((before) => before === target || reaches(before, target, seen))
	}
	for (const key of candidateKeys) if (reaches(key, key)) issue('cyclic-dependency', 'route.dependencies', `Candidate ${key} depends on itself through the routing graph.`)
	for (const promise of preparation) {
		refs([promise.candidate], `route.preparation.${promise.id}.candidate`, candidateKeys)
		refs([promise.before], `route.preparation.${promise.id}.before`, candidateKeys)
		refs(promise.sources, `route.preparation.${promise.id}.sources`, evidence, true)
		if (promise.candidate === promise.before || reaches(promise.candidate, promise.before)) issue('serialized-preparation', `route.preparation.${promise.id}`, `Promised preparation ${promise.candidate} waits for ${promise.before}. Split an early artifact into an independent task.`)
	}
	const confirmed = prefix.discover
	if (confirmed) {
		unique(confirmed.items.map((c) => c.key), 'discover.items')
		checkCandidates(confirmed.items, 'discover.items')
		const conserved = (actual: ReadonlyArray<string>, expected: ReadonlyArray<string>, at: string, code: string) => {
			refs(actual, at, new Set(expected))
			for (const id of expected) if (!actual.includes(id)) issue(code, at, `Accepted identity ${id} was dropped.`)
		}
		conserved(confirmed.items.map((c) => c.key), [...candidateKeys], 'discover.items', 'lost-candidate')
		conserved(confirmed.dependencyIds, dependencies.map((e) => e.id), 'discover.dependencyIds', 'lost-dependency')
		conserved(confirmed.preparationIds, preparation.map((p) => p.id), 'discover.preparationIds', 'lost-preparation')
		conserved(confirmed.questionIds, [...questionIds], 'discover.questionIds', 'lost-question')
		const positions = new Map(confirmed.items.map((c, index) => [c.key, index + 1]))
		for (const [index, candidate] of confirmed.items.entries()) {
			const prior = candidates.find((c) => c.key === candidate.key)
			if (prior) {
				const fixedFields = options.handoff ? ['kind'] : ['title', 'kind', 'objective', 'text']
				if (fixedFields.some(key => candidate[key as keyof typeof candidate] !== prior[key as keyof typeof prior])) issue('changed-candidate', `discover.items.${candidate.key}`, options.handoff ? 'The candidate kind changed at confirmation.' : 'The accepted candidate definition changed at confirmation; retain its title, kind, objective and text.')
				if ([...candidate.requirementIds].sort().join('\0') !== [...prior.requirementIds].sort().join('\0')) issue('changed-ownership', `discover.items.${candidate.key}`, 'Requirement ownership changed after synthesis.')
				if (options.handoff) {
					const before = (prior as typeof prior & { questionRefs: ReadonlyArray<string> }).questionRefs
					const after = (candidate as typeof candidate & { questionRefs: ReadonlyArray<string> }).questionRefs
					if (before.some(id => !after.includes(id)) || after.some(id => !before.includes(id) && jobs.indexOf(questionJobs.get(id)!) <= jobs.indexOf('one-thing'))) issue('changed-question-ownership', `discover.items.${candidate.key}.questionRefs`, 'Retain the candidate\'s accepted question bindings; only newly discovered questions may be added.')
				}
				const artifactIdentity = (items: typeof candidate.artifacts) => JSON.stringify(items.map((a) => [a.id, ...(options.handoff ? [] : [a.description]), [...a.sources].sort()]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))
				if (artifactIdentity(candidate.artifacts) !== artifactIdentity(prior.artifacts)) issue('changed-artifact', `discover.items.${candidate.key}`, 'Accepted artifact deliverables changed at confirmation.')
			}
			const expected = [...predecessors.get(candidate.key) ?? []].map((key) => positions.get(key)).filter((p): p is number => p !== undefined).sort((a, b) => a - b)
			if (candidate.after.some((position) => position < 1 || position > index) || new Set(candidate.after).size !== candidate.after.length) issue('invalid-after', `discover.items.${candidate.key}.after`, 'Dependencies must name distinct earlier candidate positions.')
			if (JSON.stringify([...candidate.after].sort((a, b) => a - b)) !== JSON.stringify(expected)) issue('changed-dependency', `discover.items.${candidate.key}.after`, 'The executable after graph differs from accepted routing.')
		}
	}
	return issues.length ? failed(issues) : current
}

export const validateDiscoveryConfirmation = (value: unknown, accepted: AcceptedDiscovery, options: DiscoveryContractOptions = {}): DiscoveryValidation<DiscoveryContributions['discover']> => validateDiscoveryContribution('discover', value, accepted, options)
