// The work ledger's public transitions. These functions never load a worker or prescriptions.
import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, isAbsolute, join, sep } from 'node:path'
import { Clock, Effect } from 'effect'
import { Store, type Hold, type Item } from './store.ts'
import { MadeWellError } from './errors.ts'
import { settingsOf, validateSettings, type WorkSettings } from './settings.ts'
import { revisionOf } from './legacy.ts'
import { assertWritable } from './migration.ts'
import { laneOf } from './lane.ts'
import { isTerminal, problemsOf } from './readiness.ts'
export { isTerminal } from './readiness.ts'

export type Actor = {readonly kind:'operator'|'agent';readonly label:string}
export interface Condition {readonly id:string;readonly text:string}
export interface FileResult {readonly destination:string;readonly path:string;readonly sha256:string;readonly bytes:number}
export interface Evidence {readonly conditionId:string;readonly detail:string;readonly refs:ReadonlyArray<string>}
export interface Completion {readonly kind:'recorded'|'automated'|'legacy';readonly result:unknown;readonly files:ReadonlyArray<FileResult>;readonly conditionHash:string;readonly evidence:ReadonlyArray<Evidence>;readonly acceptedBy:Actor;readonly at:string}
export interface Blocker {readonly id:string;readonly reason:string;readonly owner:string;readonly nextAction:string;readonly createdAt:string;readonly resolvedAt?:string;readonly resolution?:string}
export interface LedgerFields {
 readonly schemaVersion:2;readonly settings:WorkSettings;readonly execution:{readonly mode:'external'|'cartridge';readonly owner:string};readonly relationships:{readonly parent?:number;readonly discovery?:number;readonly after:ReadonlyArray<number>};readonly conditions:ReadonlyArray<Condition>;readonly conditionHash:string;readonly progress:{readonly remaining:string;readonly nextAction:string;readonly owner:string};readonly blockers:ReadonlyArray<Blocker>
}
export const ledgerError = (code:string,message:string,context:Record<string,unknown>={}) => new MadeWellError({code:code as 'work_invalid',message,context,next:[{run:typeof context.id==='number'?`mw context ${context.id}`:'mw status',why:'review the saved work and keep the rejected draft'}]})
export const executionRefusal = (item:Item & { readonly hold: Hold }) => new MadeWellError({code:'not_answerable',message:'Use the explicit resolution command.',context:{id:item.id,hold:item.hold},next:[{run:`mw resolve-execution ${item.id} --input-file <file>`,why:'explicitly authorize one replay or switch to external work'}]})
export const text = (v:unknown,name:string):string => {if(typeof v!=='string'||!v.trim()||v.includes('\0')) throw ledgerError('work_invalid',`${name} must be nonblank text.`,{field:name});return v}
export const conditionsOf = (v:unknown,objective:string):ReadonlyArray<Condition> => {
 const list=v===undefined?[{id:'A1',text:objective}]:v
 if(!Array.isArray(list)||!list.length) throw ledgerError('work_invalid','Conditions must be a nonempty array.')
 const result=list.map((c,i)=>({id:text(c.id,`conditions[${i}].id`),text:text(c.text,`conditions[${i}].text`)}))
 if(new Set(result.map(c=>c.id)).size!==result.length) throw ledgerError('work_invalid','Condition ids must be unique.')
 return result
}
export const conditionHashOf=(conditions:ReadonlyArray<Condition>)=>revisionOf(conditions)
export { readiness } from './readiness.ts'
export const quiescent=(item:Item)=>!['running','waiting-quota'].includes(item.status)&&!item.flow?.pending&&!Object.values(item.flow?.tracks??{}).some(t=>t.pending)
export function validateEvidence(item:Item,value:unknown):ReadonlyArray<Evidence> {
 if(!Array.isArray(value)) throw ledgerError('completion_invalid','Evidence must cover every condition exactly once.',{id:item.id})
 const evidence=value.map(e=>({conditionId:text(e.conditionId,'conditionId'),detail:text(e.detail,'detail'),refs:Array.isArray(e.refs)?e.refs.map((r:unknown)=>text(r,'ref')):(()=>{throw ledgerError('completion_invalid','refs must be an array.')})()}))
 if(evidence.length!==item.conditions.length||item.conditions.some(c=>evidence.filter(e=>e.conditionId===c.id).length!==1)) throw ledgerError('completion_invalid','Evidence must cover every current condition exactly once.',{id:item.id})
 return evidence
}
const within=(root:string,path:string)=>path===root||path.startsWith(root+sep)
export function validateDestinationRootsUnsafe(storePath:string,roots:WorkSettings['destinations']):void {
 for(const [i,root] of roots.entries()) {
  if(!isAbsolute(root.path)||!lstatSync(root.path).isDirectory()||lstatSync(root.path).isSymbolicLink()||realpathSync(root.path)!==root.path) throw ledgerError('file_result_invalid','Destination must be an existing absolute directory without symlink components.',{root})
  const forbidden=['scratch','live','calls','worker-calls'].map(n=>join(dirname(storePath),n))
  if(forbidden.some(p=>within(p,root.path)||within(root.path,p))||roots.some((r,j)=>j!==i&&(within(r.path,root.path)||within(root.path,r.path)))) throw ledgerError('file_result_invalid','Destination roots must not overlap each other or transient storage.',{root})
 }
}
function validateFilesUnsafe(item:Item,files:unknown,writes:ReadonlyArray<string>,storePath:string):ReadonlyArray<FileResult> {
 if(files===undefined) files=[]
 if(!Array.isArray(files)) throw ledgerError('file_result_invalid','files must be an array.',{id:item.id})
 const roots=item.settings.destinations
 validateDestinationRootsUnsafe(storePath,roots)
 return files.map(f=>{
  const root=roots.find(d=>d.id===f.destination)
  if(!root||!writes.includes(f.destination)||typeof f.path!=='string'||isAbsolute(f.path)||f.path.includes('\0')||f.path.split('/').some((s:string)=>!s||s==='.'||s==='..')||f.path.includes('\\')||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256)) throw ledgerError('file_result_invalid','Invalid or unauthorized file reference.',{file:f})
  const target=join(root.path,f.path)
  if(!within(root.path,target)) throw ledgerError('file_result_invalid','File escaped its destination.',{file:f})
  let cursor=root.path
  for(const part of f.path.split('/')) {cursor=join(cursor,part);if(lstatSync(cursor).isSymbolicLink()) throw ledgerError('file_result_invalid','Symlink components are forbidden.',{file:f})}
  const fd=openSync(target,constants.O_RDONLY|constants.O_NOFOLLOW)
  try {const stat=fstatSync(fd),body=readFileSync(fd);if(!stat.isFile()||stat.size!==f.bytes||createHash('sha256').update(body).digest('hex')!==f.sha256) throw ledgerError('file_result_invalid','File bytes changed or are not regular.',{file:f})} finally {closeSync(fd)}
  return {destination:f.destination,path:f.path,sha256:f.sha256,bytes:f.bytes}
 })
}
export function validateFiles(item:Item,files:unknown,writes:ReadonlyArray<string>,storePath:string):ReadonlyArray<FileResult>{
 try{return validateFilesUnsafe(item,files,writes,storePath)}catch(e){if(e instanceof MadeWellError)throw e;throw ledgerError('file_result_invalid','The declared result could not be observed.',{id:item.id,reason:String(e)})}
}
export interface Mutation {requestId:string;revision:string;actor:Actor;[key:string]:unknown}
export const mutateWork=Effect.fn('mw.mutateWork')(function*(operation:string,id:number,input:Mutation){
 yield* assertWritable()
 const store=yield* Store,at=new Date(yield* Clock.currentTimeMillis).toISOString()
 text(input.requestId,'requestId');if(!input.actor||!['operator','agent'].includes(input.actor.kind)) throw ledgerError('work_invalid','actor.kind is required.')
 text(input.actor.label,'actor.label')
 const data:{actor:Actor;input:Mutation;original?:Item}={actor:input.actor,input}
 return yield* Effect.try({try:()=>store.request(input.requestId,operation,id,input,()=>store.transition(id,input.revision,operation,data,item=>{
  if(isTerminal(item)) throw ledgerError('work_terminal','Terminal work cannot be changed.',{id,status:item.status})
  let next={...item}
  switch(operation){
   case 'progress': {
    const p=input.progress as Record<string,unknown>??input
    const conditions=p.conditions===undefined?item.conditions:conditionsOf(p.conditions,item.objective)
    if(p.conditions!==undefined&&(item.execution.mode!=='external'||!quiescent(item))) throw ledgerError('work_busy','Conditions can change only on quiescent external work.',{id})
    next={...next,progress:{remaining:text(p.remaining,'remaining'),nextAction:text(p.nextAction,'nextAction'),owner:text(p.owner,'owner')},conditions,conditionHash:conditionHashOf(conditions),...(p.conditions!==undefined?{completion:undefined}:{})};break
   }
   case 'block':{
    const b=input.blocker as Record<string,unknown>
    if(!b) throw ledgerError('work_invalid','blocker is required.',{id})
    const blocker={id:text(b.id,'blocker.id'),reason:text(b.reason,'blocker.reason'),owner:text(b.owner,'blocker.owner'),nextAction:text(b.nextAction,'blocker.nextAction'),createdAt:at}
    if(item.blockers.some(b=>b.id===blocker.id&&!b.resolvedAt)) throw ledgerError('blocker_exists','An active blocker already has this id.',{id})
    next={...next,blockers:[...item.blockers,blocker]};break
   }
   case 'unblock':{
    if(item.hold?.code==='execution_uncertain') throw executionRefusal({ ...item, hold: item.hold })
    const b=item.blockers.find(b=>b.id===input.blockerId&&!b.resolvedAt)
    if(!b) throw ledgerError('blocker_not_found','Unknown or already resolved blocker.',{id,blockerId:input.blockerId})
    next={...next,blockers:item.blockers.map(x=>x===b?{...b,resolvedAt:at,resolution:text(input.resolution,'resolution')}:x)};break
   }
   case 'complete':{
    if(item.execution.mode!=='external'||!quiescent(item)||item.hold||item.blockers.some(b=>!b.resolvedAt)||(item.after??[]).some(n=>store.get(n)?.status!=='completed')) throw ledgerError('completion_invalid','Completion requires quiescent external work without unresolved blockers, holds or prerequisites.',{id})
    if(input.result===undefined||input.result===null) throw ledgerError('completion_invalid','result must be non-null JSON.',{id})
    const files=validateFiles(item,input.files,item.settings.destinations.map(d=>d.id),store.path),evidence=validateEvidence(item,input.evidence)
    next={...next,status:'completed',completion:{kind:'recorded',result:input.result,files,evidence,conditionHash:item.conditionHash,acceptedBy:input.actor,at},progress:{...item.progress,remaining:'None',nextAction:'Inspect recorded result'}};break
   }
   case 'configure-work':{
    if(!quiescent(item)||item.hold?.code==='execution_uncertain') throw ledgerError('work_busy','Configure only quiescent work.',{id})
    text(input.reason,'reason')
    const execution=input.execution as Item['execution']
    if(!execution||!['external','cartridge'].includes(execution.mode)) throw ledgerError('work_invalid','execution is required.',{id})
    text(execution.owner,'execution.owner')
    const settings=validateSettings({...item.settings,...input.settings as object},store.path),pack=settings.deliveryPack
    const autonomy=(input.settings as Partial<WorkSettings>|undefined)?.autonomy===undefined?item.autonomy:settings.autonomy
    data.original=item
    if(execution.mode==='cartridge'&&autonomy==='full'&&!settings.alert) throw ledgerError('settings_invalid','Unattended cartridge work requires a pinned alert.',{id});
    if(execution.mode==='cartridge'&&(!pack||problemsOf(pack).length||(item.provisioned??[]).some(r=>r.torn?.exitCode!==0))) throw ledgerError('work_invalid','Cartridge execution needs a valid pinned pack and no pending cleanup.',{id})
    const conditions=conditionsOf(input.conditions,item.objective)
    next={...next,execution,settings,autonomy,pack:execution.mode==='cartridge'?pack!:undefined,conditions,conditionHash:conditionHashOf(conditions),hold:item.hold?.code==='legacy_execution'?undefined:item.hold,status:execution.mode==='external'?'open':'queued',flow:{loop:'delivery',accepted:[]}};break
   }
   case 'resolve-execution':{
    const pending=item.flow?.pending
    const p=pending?.invocation===input.invocation?pending:Object.values(item.flow?.tracks??{}).map(t=>t.pending).find(p=>p?.invocation===input.invocation)
    if(item.hold?.code!=='execution_uncertain'||!p||input.invocation!==p.invocation) throw ledgerError('execution_uncertain','The named uncertain invocation is required.',{id})
    text(input.reason,'reason')
    if(input.action==='replay'&&input.authorizeReplay===true) next={...next,status:'queued',hold:undefined,flow:{...item.flow!,pending:item.flow?.pending?.invocation===p.invocation?undefined:item.flow?.pending,tracks:Object.fromEntries(Object.entries(item.flow?.tracks??{}).map(([key,t])=>[key,{...t,pending:t.pending?.invocation===p.invocation?undefined:t.pending}])),replayOf:p.invocation}}
    else if(input.action==='external'&&input.authorizeReplay===undefined) next={...next,status:'open',hold:undefined,execution:{mode:'external',owner:input.actor.label},flow:{...item.flow!,pending:undefined,tracks:Object.fromEntries(Object.entries(item.flow?.tracks??{}).map(([key,t])=>[key,{...t,pending:undefined}]))}}
    else throw ledgerError('work_invalid','Choose replay with authorizeReplay:true or external without authorizeReplay.',{id})
    break
   }
   default: throw ledgerError('work_invalid','Unknown work transition.',{operation})
  }
  return {...next,updated:at}
 })),catch:e=>e instanceof MadeWellError?e:ledgerError('work_invalid',String(e),{id})})
})
export const createLedgerWork=Effect.fn('mw.createLedgerWork')(function*(input:{title:string;objective:string;source:string;kind?:string;conditions?:ReadonlyArray<Condition>;settings?:Partial<WorkSettings>;requestId?:string;discovery?:boolean}){
 yield* assertWritable()
 const store=yield* Store,at=new Date(yield* Clock.currentTimeMillis).toISOString()
 const create=()=>{
  const settings=validateSettings({...settingsOf(store),...input.settings},store.path),conditions=conditionsOf(input.conditions,input.objective),pack=input.discovery?settings.discoveryPack:settings.deliveryPack
  if(pack&&pack.contracts?.execution!=='2') throw ledgerError('cartridges_invalid','Execution contract 2 is required.');
  if(pack&&settings.autonomy==='full'&&!settings.alert) throw ledgerError('settings_invalid','Unattended cartridge work requires a pinned alert.');
  text(input.title,'title');text(input.objective,'objective');if(typeof input.source!=='string') throw ledgerError('work_invalid','source must be exact text.')
  if(input.kind!==undefined) text(input.kind,'kind')
  return store.create({title:input.title,objective:input.objective,source:input.source,...(input.kind?{kind:input.kind}:{}),schemaVersion:2,settings,conditions,conditionHash:conditionHashOf(conditions),execution:{mode:pack?'cartridge':'external',owner:'operator'},relationships:{after:[]},progress:{remaining:input.objective,nextAction:'Carry out the recorded work',owner:'operator'},blockers:[],status:pack?'queued':'open',...(pack?{pack,job:laneOf(pack)[input.discovery?'discovery':'delivery'][0]?.job??''}:{}),flow:{loop:input.discovery?'discovery':'delivery',accepted:[]},autonomy:settings.autonomy,organs:{version:'1'},created:at,updated:at})
 }
 const canonical={title:input.title,objective:input.objective,source:input.source,kind:input.kind,conditions:input.conditions,settings:input.settings??{},discovery:input.discovery===true}
 return yield* Effect.try({try:()=>input.requestId?store.request(input.requestId,'create',null,canonical,create):create(),catch:e=>e instanceof MadeWellError?e:ledgerError('work_invalid',String(e))})
})
