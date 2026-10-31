import { GRAMMAR_PACK } from './grammar.ts'
import { discoveryContributionShape, type DiscoveryJob } from './discovery-contract.ts'
import type { Pack } from './lane.ts'

/** Experimental strict contracts, leaving existing runs and the established grammar unchanged. */
export const AUTONOMY_PACK: Pack = {
	...GRAMMAR_PACK, name: 'made-well-autonomy-lab', version: '1.2',
	contracts: { discovery: '1', acceptance: '1', handoff: '1' },
	brief: [
		GRAMMAR_PACK.brief,
		'NQ governs every handoff of the same durable task. The receiver identifies what is unclear, ambiguous or missing; the sender clarifies, and the receiver confirms. Reuse recorded answers. Thinking phases make their own decisions; implementation follows the fixed plan. No separate task is created for a phase or a clarification.',
		'Classify accounts for every Declare intent through requirements[].intentIds or a sourced intentDispositions entry (provided, context, deferred or superseded). Candidate questionRefs assign later questions to the tasks that must settle them. A planner starts planning to resolve its own choices and records decisions with questionId; accepted decisions become reusable NQ answers before implementation receives that output.',
		'Discovery contributions use discoveryContract:"1". Put actual source locators in evidence:[{id,ref}]. Nested sources arrays cite those evidence IDs from this or earlier accepted contributions, never raw paths or locators. Keep exact source references and distinguish explicit requirements from interpretations. Each function contributes new structured findings; earlier records remain addressable. Questions are new entries with an owner and blocking role, not copies of earlier questions. If yourLastRefusedDeliverable is present, it is your receiving job’s exact previous attempt, not accepted work; correct the stated defect from that input rather than asking someone to paste it again.',
		'Task decomposition must publish useful prerequisites early. Useful prerequisite artifacts can be delivered independently before the integrated work that depends on them. Every artifact task retains ideation, planning, implementation and independent verification. Bound their depth and scope. Do not create tasks that compete for the same files or force all preparatory work to wait for final shipment.',
		'Every route edge names a genuine delivered artifact or prerequisite. Only task-delivered readiness exists. Record preparation promises that the actual after graph honors; never promise within-task parallelism the scheduler cannot express. Confirm preserves all accepted requirement, candidate, artifact, dependency, preparation and question identities.',
		'Product checks, engine execution provenance, final live checks and operator manual judgment have separate evidence owners. Product doneWhen entries declare evidence:{evaluator:"candidate-check",availableAfter:"implementation",inputs:[{kind:"candidate"|"plan"|"environment",ref:"available input"}]}. Environment references use input:<id> from projectInputs and are checked after preparation before the receiving executor runs. No private maker report, future shipment or proof of historical nonexecution is a candidate checker input. Missing input returns through NQ; never invent availability.',
		'On correction, diagnose failed conditions individually in arbiter dispositions. The planner may explicitly retain a maker’s own compatible artifact with resume:[{role,sha256}] from continuationOptions; a changed plan otherwise starts clean. Repair the named conditions without rebuilding unaffected work. Independent checks still all run on the final candidate. For a bounded artifact, keep thinking concise and proportional; a function obligation does not require a new committee or a long essay.',
		'DX/UX/AX decisions describe predicted gains/costs and the observable result that would test them. Do not present the prediction itself as measured success. Domain-specific methods and artifact requirements come from explicit cartridges or raw task context.',
	].filter(Boolean).join('\n\n'),
	discovery: GRAMMAR_PACK.discovery.map(c => ({ ...c, steps: c.steps.map(s => ({
		...s,
		...(s.job === 'discover' ? {} : { output: discoveryContributionShape(s.job as DiscoveryJob, { handoff: true }) }),
		task: [s.task, 'Return this function’s discoveryContract:"1" contribution. Preserve earlier accepted identities through references. At confirm(), emit the exact executable after edges accepted by route; no silent filtering or reconstruction.'].filter(Boolean).join('\n\n'),
	})) })),
}
