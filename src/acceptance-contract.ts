/** Candidate-time evidence ownership. Legacy plans opt in through their pinned pack. */
export function acceptanceProblem(value: unknown, required = false): string | undefined {
	if (!value || typeof value !== 'object') return required ? 'The plan must declare candidate-time acceptance evidence.' : undefined
	const conditions = (value as { doneWhen?: unknown }).doneWhen
	if (!Array.isArray(conditions)) return required ? 'The plan must declare done-when conditions.' : undefined
	for (const condition of conditions) {
		if (!condition || typeof condition !== 'object') return 'An acceptance condition is not an object.'
		const c = condition as Record<string, unknown>
		const evidence = c.evidence
		const id = String(c.id)
		if (evidence === undefined && !required) continue
		if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return id + ': name the evaluator, evidence inputs and when they exist.'
		const e = evidence as Record<string, unknown>
		if (e.evaluator !== 'candidate-check') return id + ': ' + e.evaluator + ' is not the candidate check evaluator. Engine provenance, post-check reporting, live checks and operator verdicts need their own evidence producer; do not assign them to the independent candidate checker.'
		if (e.availableAfter !== 'implementation') return id + ': candidate checks need evidence available after implementation and before verification; they cannot require future shipment, their own completed report or operator QA.'
		if (!Array.isArray(e.inputs) || !e.inputs.length) return id + ': list the evidence inputs the independent checker can actually read.'
		for (const input of e.inputs) {
			if (!input || typeof input !== 'object') return id + ': an evidence input is invalid.'
			const i = input as Record<string, unknown>
			if (!['candidate', 'plan', 'environment'].includes(String(i.kind)) || typeof i.ref !== 'string' || !i.ref.trim()) return id + ': evidence inputs must name candidate, plan or provisioned environment references. Private maker reports, historical nonexecution, future release and manual verdicts are not candidate inputs.'
		}
	}
	return undefined
}
