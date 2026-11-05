// Read-only conclusions over saved execution, acceptance and completion evidence.
import { createHash } from 'node:crypto'
import { conforms, laneOf, lastJson } from './lane.ts'
import { organReceipts, organsRequired } from './organs.ts'
import type { Item, Store } from './store.ts'
export { invalidatedAt } from './work-boundary.ts'
type Reader=Pick<Store['Service'],'events'|'call'>
export const parsedOutput=(raw:string|null|undefined):unknown|null=>raw?.trim()?lastJson(raw)??{text:raw}:null
export interface Provenance {state:'linked'|'unavailable'|'ambiguous';acceptanceEvent:number|null;executionCall:number|null;repairCall:number|null;invocation:string|null;eventSeqs:number[];reason:string|null}
export interface WorkEvidence {
 job:string;configured:boolean;state:'yes'|'no'|'unknown'|'blocked';complete:boolean;reason:string|null;schemaDiagnostic:string|null;input:unknown|null;output:unknown|null;acceptedOutput:unknown|null;eventSeqs:number[];provenance:Provenance
 laterAttempts:{entries:Array<{event:number;at:string;kind:string;outcome:string;call:number|null;invocation:string|null;evidence:string}>;total:number;omitted:number;trace:string}
}
const hash=(value:unknown)=>createHash('sha256').update((JSON.stringify(value)??'null')).digest('hex')
export function workEvidenceOf(store:Reader,item:Item){
 const events=store.events(item.id),lane=laneOf(item.pack),discovery=item.flow?.loop==='discovery',steps=lane[discovery?'discovery':'delivery'],jobs:Record<string,WorkEvidence>={}
 for(const step of steps){
  const raw=step.track&&step.track!=='main'?item.flow?.tracks?.[step.track]?.outputs[step.job]:item.outputs[step.job],output=parsedOutput(raw)
  const receipts=events.filter(e=>['function-accepted','accepted'].includes(e.kind)&&e.data.job===step.job),receipt=receipts.findLast(e=>e.data.outputHash===hash(raw)),acceptedOutput=parsedOutput(typeof receipt?.data.output==='string'?receipt.data.output:null)
  const start=events.findLast(e=>e.kind==='function-started'&&e.data.invocation===receipt?.data.invocation),end=events.findLast(e=>e.kind==='function-returned'&&e.data.invocation===receipt?.data.invocation)
  const link=events.findLast(e=>e.kind==='trace-call'&&e.data.job===step.job&&(!start||e.seq>start.seq)&&(!receipt||e.seq<receipt.seq)),call=typeof link?.data.call==='number'?store.call(link.data.call):undefined
  const diagnostic=output&&step.output?conforms(step.output,output).join('; ')||null:null
  const organ=organReceipts(store,{...item,outputs:{...item.outputs,...(step.track?item.flow?.tracks?.[step.track]?.outputs:{})}}).findLast(r=>r.job===step.job)
  const complete=!!raw&&!!receipt&&!diagnostic&&!!item.flow?.accepted.includes(step.job)&&(!organsRequired(item)||!!organ)
  const provenance:Provenance={state:receipt&&(start&&end||step.children)?'linked':'unavailable',acceptanceEvent:receipt?.seq??null,executionCall:call?.id??null,repairCall:null,invocation:typeof receipt?.data.invocation==='string'?receipt.data.invocation:null,eventSeqs:[start?.seq,end?.seq,receipt?.seq].filter((n):n is number=>n!==undefined),reason:receipt?null:'Invocation or acceptance not recorded.'}
  const later=events.filter(e=>e.data.job===step.job&&e.seq>(receipt?.seq??0)&&['function-returned','function-failed','function-rewound','trace-finished'].includes(e.kind))
  const reason=complete?null:diagnostic??(raw?'Saved output lacks current acceptance or mandatory preparation.':'No current accepted output is recorded.')
  jobs[step.job]={job:step.job,configured:true,state:complete?'yes':item.hold&&item.job===step.job?'blocked':'no',complete,reason,schemaDiagnostic:diagnostic,input:start?.data.input??null,output,acceptedOutput,eventSeqs:receipts.map(e=>e.seq),provenance,laterAttempts:{entries:later.slice(-10).map(e=>({event:e.seq,at:e.at,kind:e.kind,outcome:'unaccepted',call:null,invocation:typeof e.data.invocation==='string'?e.data.invocation:null,evidence:`/api/v1/items/${item.id}/evidence?kind=event&ref=${e.seq}`})),total:later.length,omitted:Math.max(0,later.length-10),trace:`/api/trace/${item.id}?lens=ax`}}
 }
 const configuredComplete=steps.length>0&&steps.every(s=>jobs[s.job]?.complete),completion=item.completion
 const producerStep=steps.find(s=>s.job===item.pack?.completion?.resultJob),producerOutput=producerStep?.track&&producerStep.track!=='main'?item.flow?.tracks?.[producerStep.track]?.outputs[producerStep.job]:item.outputs[item.pack?.completion?.resultJob??'']
 const verificationCurrent=completion?.kind==='automated'&&completion.conditionHash===item.conditionHash&&events.some(e=>e.kind==='completed'&&e.data.conditionHash===item.conditionHash&&e.data.producerOutputHash===hash(producerOutput))
 const delivered=item.status==='completed'&&!!completion&&completion.conditionHash===item.conditionHash&&(completion.kind!=='automated'||verificationCurrent)||discovery&&item.status==='discovered'&&configuredComplete
 return {jobs,configuredComplete,verificationCurrent:!!verificationCurrent,delivered,noWorkPerformed:steps.length===0,reason:delivered?null:steps.length===0?'No configured automation was performed.':'Current acceptance is incomplete.',historical:{status:item.status,verification:item.verification??null,shipment:item.shipped??null,completion:completion??null}}
}
export function workEvidenceSummaryOf(evidence:ReturnType<typeof workEvidenceOf>,item:number){
 const preview=(s:string|null)=>s===null?null:Array.from(s).slice(0,120).join(''),detail=`/api/trace/${item}?lens=ax`
 return {configuredComplete:evidence.configuredComplete,verificationCurrent:evidence.verificationCurrent,delivered:evidence.delivered,noWorkPerformed:evidence.noWorkPerformed,reason:preview(evidence.reason),detail,jobs:Object.values(evidence.jobs).map((j,ordinal)=>({key:`job:${ordinal}`,job:preview(j.job),labelTruncated:j.job.length>120,configured:j.configured,state:j.state,complete:j.complete,reason:preview(j.reason),reasonTruncated:(j.reason?.length??0)>120,provenance:{state:j.provenance.state,acceptanceEvent:j.provenance.acceptanceEvent,executionCall:j.provenance.executionCall,repairCall:null},laterAttempts:{total:j.laterAttempts.total,detail},evidence:{detail,acceptance:j.provenance.acceptanceEvent?`/api/v1/items/${item}/evidence?kind=event&ref=${j.provenance.acceptanceEvent}`:null,call:j.provenance.executionCall?`/api/call/${j.provenance.executionCall}`:null,repair:null}}))}
}
