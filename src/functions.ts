// Execution-2 ordered cartridges. All state changes use Store's transactional revision boundary.
import { createHash, randomUUID } from 'node:crypto'
import { Clock, Effect, Result } from 'effect'
import { conforms, laneOf, lastJson, problemsOf, rewindJobs, type Pack, type Step } from './lane.ts'
import { Store, type Item } from './store.ts'
import { revisionOf } from './legacy.ts'
import { ownArtifactHistory } from './artifact-evidence.ts'
import { conditionsOf, conditionHashOf, text, ledgerError, validateEvidence, validateFiles } from './ledger.ts'
import { answerHistory, decisionProblem, recordPhaseDecisions } from './nq-obligations.ts'
import { checkIncomingPreparation, organRules, childOrgans, compositionPreparation, inspectPreparation, organPacket, organsRequired, saveOrganReceipt } from './organs.ts'
import { checkPrerequisites } from './prerequisites.ts'
import { executionEnv, scratch, fingerprint, teardown } from './workspace.ts'
import { gateRule }  from './rumen.ts'
import { validateDiscoveryContribution } from './discovery-contract.ts'
import { observe } from './trace.ts'
import { runGroup } from './worker.ts'

export const functionInput=(item:Item,step:Step,store?:Pick<Store['Service'],'get'|'events'>)=>{
 const track=step.track??'main',privateOutputs=track==='main'?item.outputs:{...item.outputs,...item.flow?.tracks?.[track]?.outputs}
 const scoped={...item,outputs:privateOutputs}
 const history=store?answerHistory(store,scoped,step.job):undefined
 return {item:{id:item.id,title:item.title,objective:item.objective,source:item.source,conditions:item.conditions,conditionHash:item.conditionHash},args:step.args??{},bindings:{inputs:item.settings.inputs.filter(i=>!i.jobs||i.jobs.includes(step.job)),destinations:item.settings.destinations.filter(d=>step.writes?.includes(d.id))},received:Object.fromEntries(step.receives.map(j=>[j,lastJson(privateOutputs[j]??'')])),...(store&&organsRequired(item)?{organs:organPacket(store,scoped,step.job,item.settings)}:{}),...(history?.answers.length?{answeredBefore:history.packetAnswers()}:{}),...(store&&['implementer','test architect'].includes(step.profile)?{ownArtifactHistory:ownArtifactHistory(store.events(item.id),item.id,step.profile==='implementer'?'implement':'test-plan',true)}:{}),...(item.rework?{rework:item.rework}:{}),...(item.steer?{operatorNote:item.steer}:{})}
}
const outputOf=(item:Item,job:string)=>{const step=[...laneOf(item.pack).discovery,...laneOf(item.pack).delivery].find(s=>s.job===job);return step?.track&&step.track!=='main'?item.flow?.tracks?.[step.track]?.outputs[job]:item.outputs[job]}
const transition=(store:Store['Service'],id:number,kind:string,data:Record<string,unknown>,fn:(i:Item)=>Item)=>{const item=store.get(id)!;return store.transition(id,revisionOf(item),kind,data,fn)}
const itemAcceptanceBinding=(item:Item,step:Step,store:Pick<Store['Service'],'events'>)=>{
 const resultJob=item.pack?.completion?.resultJob
 if(item.pack?.completion?.acceptanceJob!==step.job||!resultJob)return {}
 const started=store.events(item.id).findLast(e=>e.kind==='function-started'&&e.data.invocation===item.flow?.pending?.invocation)
 const received=(started?.data.input as ReturnType<typeof functionInput>|undefined)?.received[resultJob]
 return {conditionHash:item.conditionHash,producerOutputHash:revisionOf(received)}
}
export function acceptFunction(store:Store['Service'],id:number,step:Step,output:string){
 const current=store.get(id)!,flow=current.flow!,track=step.track??'main'
 return store.request(`function:${flow.pending?.invocation??'compose:'+step.job+':'+store.events(id).filter(e=>e.kind==='function-accepted'&&e.data.job===step.job).length}:accepted`,'function-accepted',id,{job:step.job,track,outputHash:revisionOf(output)},()=>transition(store,id,'function-accepted',{track,job:step.job,invocation:flow.pending?.invocation,outputHash:revisionOf(output),output,...(itemAcceptanceBinding(current,step,store))},item=>{
  const order=laneOf(item.pack)[item.flow!.loop].map(s=>s.job),accepted=[...new Set([...item.flow!.accepted,step.job])].sort((a,b)=>order.indexOf(a)-order.indexOf(b))
  const privateTrack=item.flow!.tracks?.[track]??{accepted:[],outputs:{}}
  return {...item,rework:undefined,exchange:undefined,outputs:track==='main'?{...item.outputs,[step.job]:output}:item.outputs,flow:{...item.flow!,accepted,pending:undefined,frozen:[...new Set([...(item.flow!.frozen??[]),step.job])],...(track!=='main'?{tracks:{...item.flow!.tracks,[track]:{accepted:[...privateTrack.accepted,step.job],outputs:{...privateTrack.outputs,[step.job]:output}}}}:{})}}
 }))
}
export const checkFunction=Effect.fn('mw.checkFunction')(function*(item:Item,step:Step,output:Record<string,unknown>,cwd:string,raw:string){
 const store=yield* Store
 if(step.check){const {result}=yield* observe(store,item.id,{job:step.job,kind:'acceptance',args:{command:step.check,input:functionInput(item,step,store),output}},onOutput=>runGroup({command:'sh',args:['-c',step.check!],cwd,env:executionEnv(item.id,step.job,item.flow!.pending!.invocation,cwd),input:JSON.stringify({input:functionInput(item,step,store),output}),budget:step.budget??{minutes:30},onOutput}));if(result.code!==0||result.overBudget) return {ok:false as const,reason:`Check exited ${result.overBudget?124:result.code}.`}}
 const rule=step.check?gateRule({id:step.job,run:step.check}):undefined
 store.note(item.id,'function-fences',{job:step.job,outputHash:createHash('sha256').update(raw).digest('hex'),gateReceipts:rule?[{id:step.job,rule:rule.id,definitionHash:rule.definitionHash,template:step.check,command:step.check,files:[],outcome:'passed',exitCode:0,sourceBefore:[],sourceAfter:[]}]:[]})
 return {ok:true as const}
})
export function failFunction(store:Store['Service'],id:number,step:Step,reason:string,outputHash:string){
 const item=store.get(id)!,pending=item.flow?.pending,track=step.track??'main',rule=step.onFailure??{target:'hold'},key=`${track}:${step.job}`,count=item.flow?.corrections?.[key]??0
 return store.atomic(()=>{
  store.note(id,'function-failed',{track,job:step.job,attempt:pending?.attempt??1,invocation:pending?.invocation??null,outputHash,reason})
  if(rule.target==='hold'||count>=(rule.maxCorrections??0)){
   const code=rule.target==='hold'?'function_failed':'function_corrections_exhausted'
   return transition(store,id,'held',{track,job:step.job,reason},i=>({...i,status:'held',hold:{code,message:reason,context:{track,job:step.job,target:rule.target,maxCorrections:rule.maxCorrections??null,corrections:count,reason,invocation:pending?.invocation},next:[{run:`mw trace ${id} --lens ax`,why:'inspect the failed return'},{run:`mw retry ${id}`,why:'grant one new attempt without resetting the count'}]},flow:{...i.flow!,pending:undefined}}))
  }
  const steps=laneOf(item.pack)[item.flow!.loop],target=steps.find(s=>s.job===rule.target)!
  const jobs=rewindJobs(steps,target,step)
  const superseded=[...jobs].flatMap(job=>{const s=steps.find(s=>s.job===job)!,raw=s.track==='main'?item.outputs[job]:item.flow?.tracks?.[s.track!]?.outputs[job];return raw?[{track:s.track??'main',job,outputHash:revisionOf(raw),output:raw,acceptedEvent:store.events(id).findLast(e=>e.kind==='function-accepted'&&e.data.job===job&&e.data.outputHash===revisionOf(raw))?.seq??null}]:[]})
  return transition(store,id,'function-rewound',{track,from:step.job,to:target.job,superseded,corrections:count+1,maxCorrections:rule.maxCorrections,invocation:pending?.invocation},i=>({...i,status:'queued',job:target.job,rework:{cause:'function-check',answer:reason},outputs:Object.fromEntries(Object.entries(i.outputs).filter(([j])=>!jobs.has(j))),flow:{...i.flow!,pending:undefined,accepted:i.flow!.accepted.filter(j=>!jobs.has(j)),corrections:{...i.flow!.corrections,[key]:count+1},superseded:[...(i.flow!.superseded??[]),...superseded],tracks:Object.fromEntries(Object.entries(i.flow!.tracks??{}).map(([t,v])=>[t,{...v,...(t===track||steps.some(s=>s.track===t&&jobs.has(s.job))?{pending:undefined,exchange:undefined}:{}),accepted:v.accepted.filter(j=>!jobs.has(j)),outputs:Object.fromEntries(Object.entries(v.outputs).filter(([j])=>!jobs.has(j)))}]))}}))
 })
}
export function requestPackUpdate(store:Store['Service'],id:number,pack:Pack){
 const item=store.get(id)!,problems=problemsOf(pack)
 if(problems.length) throw ledgerError('cartridges_invalid','Invalid cartridge update.',{problems})
 const old=laneOf(item.pack),next=laneOf(pack),frozen=new Set([...(item.flow?.frozen??[]),...(item.flow?.accepted??[]),...(item.flow?.pending?[item.flow.pending.job]:[])])
 for(const step of [...old.discovery,...old.delivery].toReversed()) if(frozen.has(step.job)&&step.parent) frozen.add(step.parent)
 for(const loop of ['discovery','delivery'] as const) for(const step of old[loop]){
  const high=Math.max(-1,...old[loop].filter(s=>s.track===step.track&&frozen.has(s.job)).map(s=>s.position??0))
  if((step.position??0)<=high&&JSON.stringify(step)!==JSON.stringify(next[loop].find(s=>s.job===step.job))) throw ledgerError('cartridges_invalid','An attempted, accepted or superseded prefix is frozen.',{job:step.job,track:step.track})
 }
 return transition(store,id,'cartridges-applied',{from:item.pack,to:pack},i=>({...i,pack}))
}
function validateDependencies(candidates:ReadonlyArray<Record<string,unknown>>){
 const invalid=candidates.flatMap((c,i)=>{const after=c.after??[];return !Array.isArray(after)?[{position:i+1,field:'after'}]:after.flatMap((n,j)=>!Number.isInteger(n)||n<1||n>=i+1||after.indexOf(n)!==j?[{position:i+1,field:`after[${j}]`,value:n}]:[])})
 if(invalid.length) throw ledgerError('discovery_dependency_invalid','Dependencies must be distinct earlier 1-based positions.',{locations:invalid})
}
function publishDiscovery(store:Store['Service'],item:Item,output:Record<string,unknown>,at:string){
 if(!Array.isArray(output.items)) throw ledgerError('discovery_dependency_invalid','Discovery must return items.',{id:item.id})
 const candidates=output.items as Record<string,unknown>[]
 validateDependencies(candidates)
 return store.atomic(()=>{
  const ids:number[]=[]
  for(const c of candidates){const conditions=conditionsOf(c.conditions,String(c.objective));const after=(c.after as number[]??[]).map(n=>ids[n-1]!);const child=store.create({...item,id:undefined as never,title:String(c.title),objective:String(c.objective),source:item.source,status:'candidate',job:'',outputs:{discover:JSON.stringify(c)},parent:undefined,discovery:item.id,kind:c.kind===undefined?undefined:text(c.kind,'candidate.kind'),conditions,conditionHash:conditionHashOf(conditions),relationships:{discovery:item.id,after},after,autonomy:item.settings.autonomy,execution:{mode:item.settings.deliveryPack?'cartridge':'external',owner:'operator'},pack:item.settings.deliveryPack??undefined,flow:{loop:'delivery',accepted:[]},completion:undefined,hold:undefined,blockers:[],organs:childOrgans(item,item.flow!.accepted.at(-1)!,item.outputs[item.flow!.accepted.at(-1)!]!,'delivery'),progress:{remaining:String(c.objective),nextAction:'Select this work',owner:'operator'},created:at,updated:at});ids.push(child.id)}
  return transition(store,item.id,'discovered',{candidates:ids},i=>({...i,status:'discovered',progress:{...i.progress,remaining:'None',nextAction:'Select work to carry out'}}))
 })
}
export type AgentExecutor=(item:Item,step:Step,cwd:string,input:ReturnType<typeof functionInput>)=>Effect.Effect<string,import('./errors.ts').MadeWellError,import('./worker.ts').Worker|Store>
/** Project one private track over the shared transaction owner. Siblings are never packet inputs. */
function trackStore(owner:Store['Service'],id:number,track:string):Store['Service']{
 const project=(item:Item):Item=>{const local=item.flow?.tracks?.[track];return {...item,job:local?.job??item.job,exchange:local?.exchange,rework:local?.rework,outputs:{...item.outputs,...local?.outputs},flow:{...item.flow!,pending:local?.pending}}}
 return {...owner,get:(n:number)=>{const item=owner.get(n);return item&&n===id?project(item):item},transition:(n,expected,kind,data,change)=>{
  if(n!==id)return owner.transition(n,expected,kind,data,change)
  const current=owner.get(id)!,view=project(current)
  if(revisionOf(view)!==expected)throw ledgerError('revision_conflict','Private track changed.',{id,track})
  const saved=owner.transition(id,revisionOf(current),kind,{...data,track},actual=>{
   const next=change(project(actual)),local=next.flow?.tracks?.[track]??{accepted:[],outputs:{}}
   return {...next,outputs:actual.outputs,exchange:actual.exchange,rework:actual.rework,flow:{...next.flow!,pending:actual.flow?.pending,tracks:{...next.flow?.tracks,[track]:{...local,job:next.job,exchange:next.exchange,rework:next.rework,pending:next.flow?.pending}}}}
  })
  return project(saved)
 }}
}
export const advanceFunctions:(id:number,agent?:AgentExecutor,privateTrack?:string)=>Effect.Effect<void,import('./errors.ts').MadeWellError,Store|import('./worker.ts').Worker>=Effect.fn('mw.advanceFunctions')(function*(id:number,agent?:AgentExecutor,privateTrack?:string){
 const store=yield* Store
 let item=store.get(id)!
 if(item.blockers.some(b=>!b.resolvedAt)||item.hold) return
 const problems=problemsOf(item.pack!)
 if(problems.length) return yield* ledgerError('cartridges_invalid','Cannot run historical or invalid cartridge contracts.',{problems})
 const flow=item.flow!,steps=laneOf(item.pack)[flow.loop],step=steps.find(s=>(!privateTrack||s.track===privateTrack)&&!flow.accepted.includes(s.job))
 if(!step&&privateTrack)return
 if(!step){
  const last=lastJson(item.outputs[flow.accepted.at(-1)!]??'')??{},at=new Date(yield* Clock.currentTimeMillis).toISOString()
  if(flow.loop==='discovery') {publishDiscovery(store,item,last,at);return}
  const pair=item.pack!.completion
  if(!pair){transition(store,id,'awaiting-recorded-completion',{},i=>({...i,status:'open',execution:{mode:'external',owner:i.execution.owner},progress:{...i.progress,nextAction:'Record completion with evidence'}}));return}
  const accepted=lastJson(outputOf(item,pair.acceptanceJob)??'')?.acceptance as Record<string,unknown>|undefined,result=lastJson(outputOf(item,pair.resultJob)??'')
  if(!accepted||accepted.verdict!=='passed'||accepted.conditionHash!==item.conditionHash||!result) return yield* ledgerError('completion_invalid','Independent acceptance is unavailable or stale.',{id})
  const binding=store.events(id).findLast(e=>e.kind==='function-accepted'&&e.data.job===pair.acceptanceJob&&e.data.outputHash===revisionOf(outputOf(item,pair.acceptanceJob)))
  if(binding?.data.conditionHash!==item.conditionHash||binding.data.producerOutputHash!==revisionOf(result)) return yield* ledgerError('completion_invalid','Acceptance is not bound to the current producer output.',{id})
  const files=validateFiles(item,result.files,steps.find(s=>s.job===pair.resultJob)!.writes??[],store.path),evidence=validateEvidence(item,accepted.evidence)
  if(item.autonomy!=='full'&&item.passed!=='completion'){transition(store,id,'paused',{code:'checkpoint',message:'Review the saved result before completion.'},i=>({...i,status:'paused',hold:{code:'checkpoint',message:'Review the saved result before completion.',context:{boundary:'completion'}}}));return}
  transition(store,id,'completed',{acceptanceJob:pair.acceptanceJob,producerOutputHash:revisionOf(outputOf(item,pair.resultJob)),conditionHash:item.conditionHash},i=>({...i,status:'completed',completion:{kind:'automated',result,files,evidence,conditionHash:i.conditionHash,acceptedBy:{kind:'agent',label:pair.acceptanceJob},at},progress:{...i.progress,remaining:'None',nextAction:'Inspect accepted result'}}));return
 }
 const parent=steps.find(s=>s.mode==='parallel'&&step.track?.startsWith(s.job+'#'))
 if(!privateTrack&&parent){
  const tracks=[...new Set(steps.filter(s=>s.track?.startsWith(parent.job+'#')).map(s=>s.track!).filter(t=>t!=='main'))]
  yield* Effect.forEach(tracks,track=>Effect.gen(function*(){
   const isolated=trackStore(store,id,track)
   for(;;){const current=isolated.get(id)!;if(current.hold||current.blockers.some(b=>!b.resolvedAt)||!steps.some(s=>s.track===track&&!current.flow!.accepted.includes(s.job)))return
    yield* advanceFunctions(id,agent,track).pipe(Effect.provideService(Store,isolated))
   }
  }),{concurrency:'unbounded'})
  return
 }
 if(step.children){
  const childOutputs=Object.fromEntries(step.children.map(j=>{const child=steps.find(s=>s.job===j)!;return[j,child.track==='main'?item.outputs[j]:item.flow?.tracks?.[child.track!]?.outputs[j]]}))
  const received=Object.fromEntries(Object.entries(childOutputs).map(([j,raw])=>[j,lastJson(raw??'')]))
  const output={...received,...(organsRequired(item)?{organPreparation:compositionPreparation(item,step.job,item.settings)}:{})}
  const composed={...item,outputs:{...item.outputs,...childOutputs}}
  const incoming=checkIncomingPreparation(store,composed,step.job,'',item.settings,step.children);if(!incoming.ok)return yield* ledgerError('function_failed','Child preparation is unavailable.',{id,job:step.job,incoming})
  const inspected=inspectPreparation(composed,step.job,output,JSON.stringify(output),'',item.settings,[],organRules(item,step.job,item.settings));if(!inspected.ok) return yield* ledgerError('function_failed',inspected.reason,{id,job:step.job})
  store.atomic(()=>{acceptFunction(store,id,step,JSON.stringify(output));saveOrganReceipt(store,item,inspected.receipt,randomUUID())});return
 }
 if(flow.pending&&flow.pending.job===step.job&&flow.pending.pendingReturn===undefined){
  if(flow.pending.replay==='explicit'){transition(store,id,'held',{invocation:flow.pending.invocation},i=>({...i,status:'held',hold:{code:'execution_uncertain',message:'Interrupted explicit execution needs a resolution.',context:{invocation:flow.pending!.invocation},next:[{run:`mw resolve-execution ${id} --input-file <file>`,why:'authorize one replay or switch to external work'}]}}));return}
  transition(store,id,'function-recovered',{invocation:flow.pending.invocation},i=>({...i,flow:{...i.flow!,pending:undefined}}));item=store.get(id)!
 }
 const pendingReturn=item.flow?.pending?.pendingReturn
 const invocation=item.flow?.pending?.invocation??randomUUID(),attempt=store.events(id).filter(e=>e.kind==='function-started'&&e.data.job===step.job).length+1,input=functionInput(item,step,store)
 if(step.input){const problems=conforms(step.input,input);if(problems.length)return yield* ledgerError('function_failed','Function input does not satisfy its contract.',{id,job:step.job,problems})}
 if(pendingReturn===undefined) item=transition(store,id,'function-started',{invocation,job:step.job,track:step.track,attempt,input,replayOf:flow.replayOf??null},i=>({...i,status:'running',job:step.job,flow:{...i.flow!,frozen:[...new Set([...(i.flow!.frozen??[]),step.job])],replayOf:undefined,pending:{invocation,job:step.job,track:step.track??'main',attempt,nodeHash:revisionOf(step),inputHash:revisionOf(input),replay:step.replay!}}}))
 yield* Effect.scoped(Effect.gen(function*(){
  const cwd=yield* scratch(store.path,id,step.job,invocation,removed=>{const records=store.get(id)!.provisioned?.filter(r=>r.invocation===invocation).map(r=>({resource:r,record:r.torn??null}))??[];store.note(id,'teardown',{invocation,job:step.job,track:step.track??'main',scratch:removed?'removed':'failed',records,ok:removed&&records.every(r=>r.record?.exitCode===0)})}),env=executionEnv(id,step.job,invocation,cwd)
  let raw=pendingReturn
  if(raw===undefined){
   const inputs=checkPrerequisites(item.settings.inputs,step.job,cwd),incoming=checkIncomingPreparation(store,item,step.job,cwd,item.settings,step.receives)
   store.note(id,'inputs-checked',{job:step.job,inputs});store.note(id,'ground-checked',{job:step.job,...incoming})
   if(inputs.some(i=>!i.ok)||!incoming.ok) return yield* ledgerError('function_failed','Required material unavailable.',{id,job:step.job,inputs,incoming})
   const before=fingerprint([cwd,...item.settings.inputs.filter(i=>!i.jobs||i.jobs.includes(step.job)).map(i=>i.path)])
   if(step.run){const {result}=yield* observe(store,id,{job:step.job,kind:'function',args:{invocation,input,node:step}},onOutput=>runGroup({command:'sh',args:['-c',step.run!],cwd,env,input:JSON.stringify(input),budget:step.budget??{minutes:30},onOutput}));if(result.code!==0||result.overBudget) return yield* ledgerError('function_failed','Command execution failed.',{id,job:step.job,exitCode:result.code});raw=result.stdout}
   else {if(!agent) return yield* ledgerError('function_failed','No agent executor available.',{id});raw=yield* agent(item,step,cwd,input)}
   // Returned bytes are durable before validation, advancement or scratch cleanup.
   transition(store,id,'function-returned',{invocation,job:step.job,outputHash:revisionOf(raw)},i=>({...i,flow:{...i.flow!,pending:{...i.flow!.pending!,pendingReturn:raw}}}))
   if((step.access??'none')==='read'&&before!==fingerprint([cwd,...item.settings.inputs.filter(i=>!i.jobs||i.jobs.includes(step.job)).map(i=>i.path)])) return yield* ledgerError('workspace_written','Read-only execution changed declared material.',{id,job:step.job})
  }
  const output=lastJson(raw!)
  const resources=Array.isArray(output?.provisioned)?output.provisioned.filter((r:Record<string,unknown>)=>r&&['kind','id','teardown'].every(k=>typeof r[k]==='string'&&String(r[k]).trim())).map((r:Record<string,unknown>)=>({kind:String(r.kind),id:String(r.id),teardown:String(r.teardown),cwd,job:step.job,invocation})):[]
  if(resources.length){
   const fresh=resources.filter(r=>!store.get(id)!.provisioned?.some(saved=>saved.invocation===invocation&&saved.kind===r.kind&&saved.id===r.id))
   if(fresh.length)transition(store,id,'provisioned',{invocation,resources:fresh},i=>({...i,provisioned:[...(i.provisioned??[]),...fresh]}))
   yield* Effect.addFinalizer(()=>Effect.forEach(store.get(id)!.provisioned?.filter(r=>r.invocation===invocation&&!r.torn)??[],r=>Effect.gen(function*(){
    store.note(id,'teardown-attempt',{resource:r,cwd:r.cwd})
    const result=yield* Effect.result(teardown(r)),at=new Date(yield* Clock.currentTimeMillis).toISOString(),record=Result.isSuccess(result)?result.success:{at,exitCode:1,output:result.failure.message}
    transition(store,id,'torn-down',{resource:r,record},i=>({...i,provisioned:i.provisioned?.map(saved=>saved.invocation===r.invocation&&saved.id===r.id&&saved.kind===r.kind?{...saved,torn:record}:saved)}))
   }),{discard:true}))
  }
  if(store.get(id)!.blockers.some(b=>!b.resolvedAt)||store.get(id)!.hold) return
  if(typeof output?.blocked==='string'){transition(store,id,'held',{job:step.job,invocation,partial:output},i=>({...i,status:'held',hold:{code:'function_failed',message:output.blocked as string,context:{job:step.job,invocation}},flow:{...i.flow!,pending:undefined}}));return}
  if(flow.loop==='discovery'&&steps.at(-1)?.job===step.job&&Array.isArray(output?.items))validateDependencies(output.items)
  let reason=!output?'Output is not an object.':conforms(step.output!,output).join('; ')
  if(!reason&&output&&flow.loop==='discovery'&&['declare','look-first','classify','lenses','one-thing','route','discover'].includes(step.job)) {
   const accepted=Object.fromEntries(Object.entries(item.outputs).map(([j,v])=>[j,lastJson(v??'')]))
   const problem=validateDiscoveryContribution(step.job as import('./discovery-contract.ts').DiscoveryJob,output,accepted as import('./discovery-contract.ts').AcceptedDiscovery,{handoff:true})
   if(!problem.ok) reason=problem.reason
  }
  if(!reason&&output){
   const check=yield* checkFunction(store.get(id)!,step,output,cwd,raw!);if(!check.ok) reason=check.reason
   if(!reason) {const files=yield* Effect.result(Effect.try({try:()=>validateFiles(item,output.files,step.writes??[],store.path),catch:e=>e instanceof Error?e.message:String(e)}));if(Result.isFailure(files)) reason=files.failure;else store.note(id,'file-results-observed',{job:step.job,invocation,files:files.success})}
   if(item.pack!.completion?.acceptanceJob===step.job){const acceptance=output.acceptance as Record<string,unknown>|undefined;if(acceptance?.verdict==='failed') reason='Independent acceptance failed.';else if(acceptance?.verdict!=='passed') reason='Independent acceptance verdict must be passed or failed.';else if(acceptance?.conditionHash!==item.conditionHash) reason='Acceptance condition hash differs from current conditions.';else {const binding=itemAcceptanceBinding(store.get(id)!,step,store),producer=lastJson(outputOf(item,item.pack!.completion!.resultJob)??'');if(binding.producerOutputHash!==revisionOf(producer))reason='Acceptance producer output is stale.';else {try{validateEvidence(item,acceptance.evidence)}catch(e){reason=e instanceof Error?e.message:String(e)}}}}
  }
  if(reason){failFunction(store,id,step,reason,revisionOf(raw));return}
  const scoped=step.track==='main'?item:{...item,outputs:{...item.outputs,...item.flow?.tracks?.[step.track!]?.outputs}}
  const preparation=inspectPreparation(scoped,step.job,output!,raw!,cwd,item.settings,[],organRules(item,step.job,item.settings))
  if(!preparation.ok){failFunction(store,id,step,preparation.reason,revisionOf(raw));return}
  const unresolved=decisionProblem(store,scoped,step.job,output!,answerHistory(store,scoped,step.job).answers)
  if(unresolved){failFunction(store,id,step,unresolved,revisionOf(raw));return}
  const acceptedAt=new Date(yield* Clock.currentTimeMillis).toISOString()
  store.atomic(()=>{const accepted=acceptFunction(store,id,step,raw!);saveOrganReceipt(store,item,preparation.receipt,invocation);recordPhaseDecisions(store,store.get(id)!,step.job,invocation,output!);if(flow.loop==='discovery'&&steps.at(-1)?.job===step.job)publishDiscovery(store,accepted,output!,acceptedAt)})
 }))
})
