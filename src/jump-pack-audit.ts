// Link validation is deterministic; faithful interpretation still needs a separate semantic review.
export function auditJumpDiscovery(declared: unknown, final: unknown) {
	const issues: string[] = []
	const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
	const list = (v: unknown): unknown[] => Array.isArray(v) ? v : []
	const key = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
	const initial = object(declared), result = object(final)
	const outcomes = list(initial.outcomes).map(object)
	const items = list(result.items).map(object)
	const coverage = list(result.coverage).map(object)
	if (!outcomes.length) issues.push('No intended outcome was recorded by Declare().')
	if (!Array.isArray(result.items)) issues.push('Candidate items must be an array.')
	if (!Array.isArray(result.coverage)) issues.push('Coverage must be an array.')
	if (result.intentChanges !== undefined && !Array.isArray(result.intentChanges)) issues.push('Intent changes must be an array when supplied.')
	const initialIds = outcomes.map((o) => o.id)
	const itemIds = items.map((i) => i.id)
	if (initialIds.some((id) => !key(id)) || new Set(initialIds).size !== initialIds.length) issues.push('Declared outcome identities are missing or duplicated.')
	if (itemIds.some((id) => !key(id)) || new Set(itemIds).size !== itemIds.length) issues.push('Candidate identities are missing or duplicated.')
	const finalOutcomes = list(result.outcomes).map(object)
	const finalIds = finalOutcomes.map((o) => o.id)
	if (finalIds.some((id) => !key(id)) || new Set(finalIds).size !== finalIds.length || initialIds.some((id) => !finalIds.includes(id))) issues.push('Final outcomes do not retain the declared identities.')
	const additions = finalOutcomes.filter((outcome) => !initialIds.includes(outcome.id))
	const changes = list(result.intentChanges).map(object)
	for (const added of additions) {
		const entries = changes.filter((change) => change.id === added.id)
		const refs = list(entries[0]?.sourceRefs)
		if (entries.length !== 1 || !refs.length || refs.some((ref) => !key(ref)) || !key(entries[0]?.rationale)) issues.push(`New outcome ${String(added.id)} needs source references and a rationale in intentChanges.`)
	}
	for (const change of changes) if (!additions.some((added) => added.id === change.id)) issues.push(`Intent change ${String(change.id)} does not identify a new outcome.`)
	const accounted = [...outcomes, ...additions]
	const outcomeIds = accounted.map((o) => o.id)
	for (const row of coverage) if (!outcomeIds.includes(row.outcome)) issues.push(`Coverage names unknown outcome ${String(row.outcome)}.`)
	for (const outcome of accounted) {
		const id = outcome.id
		const rows = coverage.filter((c) => c.outcome === id)
		if (rows.length !== 1) { issues.push(`Outcome ${String(id)} needs exactly one coverage disposition.`); continue }
		const row = rows[0]!
		if (!['represented', 'unresolved', 'declined'].includes(String(row.disposition))) issues.push(`Outcome ${String(id)} has an invalid disposition.`)
		if (row.disposition === 'declined') {
			if (!key(row.reason)) issues.push(`Declining ${String(id)} needs an explicit reason.`)
			continue
		}
		const ids = list(row.candidates)
		const linked = ids.map((id) => items.find((i) => i.id === id))
		if (!ids.length || ids.some((id) => !key(id)) || new Set(ids).size !== ids.length || linked.some((i) => !i)) issues.push(`Outcome ${String(id)} has missing or invalid candidate references.`)
		if (!linked.some((i) => i?.kind === 'outcome')) issues.push(`Outcome ${String(id)} is represented by preparation only.`)
		for (const item of linked) if (item && !list(item.outcomeRefs).includes(id)) issues.push(`Candidate ${String(item.id)} does not point back to outcome ${String(id)}.`)
	}
	for (const [index, item] of items.entries()) {
		if (!['outcome', 'prerequisite', 'research', 'decision'].includes(String(item.kind))) issues.push(`Candidate ${index + 1} has an invalid kind.`)
		if (!Array.isArray(item.outcomeRefs) || list(item.outcomeRefs).some((id) => !outcomeIds.includes(id))) issues.push(`Candidate ${index + 1} has invalid outcome references.`)
		if (!Array.isArray(item.after)) issues.push(`Candidate ${index + 1} prerequisites must be an array.`)
		for (const position of list(item.after)) if (typeof position !== 'number' || !Number.isSafeInteger(position) || position < 1 || position > index) issues.push(`Candidate ${index + 1} has an invalid prerequisite position.`)
	}
	return { passed: issues.length === 0, issues, evidence: 'Outcome links, explicit additions and candidate kinds; cited sources and interpretation still require semantic review.' }
}
