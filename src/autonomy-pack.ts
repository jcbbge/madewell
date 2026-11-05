import { GRAMMAR_PACK } from './grammar.ts'
import { discoveryContributionShape, type DiscoveryJob } from './discovery-contract.ts'
import type { Pack } from './lane.ts'

/** Experimental strict contracts, leaving existing runs and the established grammar unchanged. */
const discoveryBase: Pack = {
	...GRAMMAR_PACK, name: 'made-well-autonomy-lab', version: '2',
	contracts: {execution:'2', discovery: '2', acceptance: '2', handoff: '2' },
	brief: [
		GRAMMAR_PACK.brief,
		'NQ governs every handoff of the same durable task. The receiver identifies what is unclear, ambiguous or missing; the sender clarifies, and the receiver confirms. Reuse recorded answers. Thinking phases make their own decisions; implementation follows the fixed plan. No separate task is created for a phase or a clarification.',
		'Classify accounts for every Declare intent through requirements[].intentIds or a sourced intentDispositions entry (provided, context, deferred or superseded). Candidate questionRefs assign later questions to the tasks that must settle them. A planner starts planning to resolve its own choices and records decisions with questionId; accepted decisions become reusable NQ answers before implementation receives that output.',
		'Discovery contributions use discoveryContract:"2". Put actual source locators in evidence:[{id,ref}]. Nested sources arrays cite those evidence IDs from this or earlier accepted contributions, never raw paths or locators. Keep exact source references and distinguish explicit requirements from interpretations. Each function contributes new structured findings; earlier records remain addressable. Questions are new entries with an owner and blocking role, not copies of earlier questions. If yourLastRefusedDeliverable is present, it is your receiving job’s exact previous attempt, not accepted work; correct the stated defect from that input rather than asking someone to paste it again.',
		'Task decomposition must publish useful prerequisites early. Useful prerequisite artifacts can be delivered independently before the integrated work that depends on them. Every artifact task retains ideation, planning, implementation and independent verification. Bound their depth and scope. Do not create tasks that compete for the same files or force all preparatory work to wait for final completion.',
		'Every route edge names a genuine delivered artifact or prerequisite. Only task-delivered readiness exists. Record preparation promises that the actual after graph honors; never promise within-task parallelism the scheduler cannot express. Confirm preserves all accepted requirement, candidate, artifact, dependency, preparation and question identities.',
		'DX/UX/AX decisions describe predicted gains/costs and the observable result that would test them. Do not present the prediction itself as measured success. Domain-specific methods and artifact requirements come from explicit cartridges or raw task context.',
	].filter(Boolean).join('\n\n'),
	discovery: GRAMMAR_PACK.discovery.map(c => ({ ...c, steps: c.steps.map(s => ({
		...s,
		output: discoveryContributionShape(s.job as DiscoveryJob, { handoff: true }),receives:GRAMMAR_PACK.discovery.flatMap(c=>c.steps).slice(0,GRAMMAR_PACK.discovery.flatMap(c=>c.steps).findIndex(n=>n.job===s.job)).map(n=>n.job),
		task: [s.task, 'Return this function’s discoveryContract:"2" contribution. Preserve earlier accepted identities through references. At confirm(), emit the exact executable after edges accepted by route; no silent filtering or reconstruction.'].filter(Boolean).join('\n\n'),
	})) })),
}

/** Capture/discovery is useful with no delivery adapter installed. */
export const GENERAL_DISCOVERY:Pack={...discoveryBase,name:'general-discovery',delivery:[]}
export const AUTONOMY_PACK:Pack={...discoveryBase,delivery:[
 {cartridge:'ideation',steps:[{job:'ideation',profile:'ideator',duty:'Ground the intended outcome and settle the approach using the rubric.',output:{type:'object',required:['result'],properties:{result:{description:'Grounded approach and settled choices.'}}},replay:'safe',writes:[],receives:[]}]},
 {cartridge:'planning',steps:[{job:'planning',profile:'planner',duty:'Settle the fixed brief, conditions and evidence owners. Leave no implementation choice open.',output:{type:'object',required:['result'],properties:{result:{description:'The fixed brief and its evidence owners.'}}},replay:'safe',writes:[]}]},
 {cartridge:'implementation',steps:[{job:'implementation',profile:'implementer',duty:'Execute the accepted fixed brief. Never run checks or change the plan.',output:{type:'object',required:['result'],properties:{result:{description:'The result of executing the accepted fixed brief.'}}},replay:'safe',writes:[]}]},
 {cartridge:'verification',steps:[{job:'verification',profile:'test architect',duty:'Independently verify the producer result against every current condition. Return acceptance with verdict, conditionHash and evidence.',receives:['implementation'],output:{type:'object',required:['acceptance'],properties:{acceptance:{type:'object',required:['verdict','conditionHash','evidence'],properties:{verdict:{enum:['passed','failed']},conditionHash:{type:'string'},evidence:{type:'array'}}}}},replay:'safe',writes:[]}]},
],completion:{resultJob:'implementation',acceptanceJob:'verification'}}
