// Installation defaults are data in the same ledger; every new task pins its resolved settings.
import { isAbsolute } from 'node:path'
import { Clock, Effect, Schema } from 'effect'
import { assertWritable } from './migration.ts'
import { resolvePackSelection } from './pack-selection.ts'
import { runGroup } from './worker.ts'
import { Store } from './store.ts'
import { MadeWellError } from './errors.ts'
import { GENERAL_DISCOVERY } from './autonomy-pack.ts'
import { Pack, problemsOf } from './lane.ts'
import { Prerequisite } from './prerequisites.ts'
import { ledgerError, validateDestinationRootsUnsafe } from './ledger.ts'
import { revisionOf } from './legacy.ts'

export const Text = Schema.NonEmptyString.check(Schema.makeFilter(s => !!s.trim() && !s.includes('\0'), { toJsonSchema: () => [{}, true] }))
export const RumenGuidance = Schema.Struct({ id: Text, kind: Schema.Literals(['judge', 'sign', 'lexicon']), text: Text, jobs: Schema.optionalKey(Schema.Array(Text)) })
export type RumenGuidance = typeof RumenGuidance.Type
export const WorkSettings = Schema.Struct({
 autonomy: Schema.Literals(['full', 'checkpoints', 'steps']), discoveryPack: Pack, deliveryPack: Schema.NullOr(Pack),
 alert: Schema.NullOr(Schema.Struct({run: Text, cwd: Text})), inputs: Schema.Array(Prerequisite),
 destinations: Schema.Array(Schema.Struct({id: Text, path: Text})), conventions: Schema.Array(Text), rumen: Schema.Array(RumenGuidance),
})
export type WorkSettings = typeof WorkSettings.Type
export const defaultSettings = (): WorkSettings => ({autonomy:'checkpoints',discoveryPack:GENERAL_DISCOVERY,deliveryPack:null,alert:null,inputs:[],destinations:[],conventions:[],rumen:[]})
export const settingsOf = (store: Store['Service']) => (store.settings()?.settings ?? defaultSettings()) as WorkSettings
export const validateSettings = (value: unknown, storePath:string): WorkSettings => {
 const v={...value as WorkSettings},defaults=defaultSettings()
 for(const key of Object.keys(defaults) as (keyof WorkSettings)[]) if(v[key]===null&&key!=='deliveryPack'&&key!=='alert') (v as Record<string,unknown>)[key]=defaults[key]
 for(const key of ['discoveryPack','deliveryPack'] as const) if(typeof v[key]==='string') {
  const resolved=Effect.runSync(resolvePackSelection(v[key] as unknown as string).pipe(Effect.match({onSuccess:r=>r.pack,onFailure:e=>{throw e}})))
  ;(v as Record<string,unknown>)[key]=resolved
 }
 let parsed:WorkSettings
 try{parsed=Schema.decodeUnknownSync(WorkSettings)(v)}catch(e){throw new MadeWellError({code:'settings_invalid',message:'Settings do not match WorkSettings.',context:{reason:String(e)},next:[]})}

 const problems = [ ...problemsOf(parsed.discoveryPack), ...(parsed.deliveryPack ? problemsOf(parsed.deliveryPack) : []) ]
 for(const [name, entries] of [['inputs', parsed.inputs], ['destinations', parsed.destinations]] as const) {
  if(new Set(entries.map(e=>e.id)).size!==entries.length) problems.push(`${name}: duplicate identities`)
  for(const e of entries) if(name==='inputs'&&!isAbsolute(e.path)) problems.push(`${name}.${e.id}.path must be absolute`)
 }
 if(parsed.alert && !isAbsolute(parsed.alert.cwd)) problems.push('alert.cwd must be absolute')
 if(problems.length) throw new MadeWellError({code:'settings_invalid',message:'Settings are invalid.',context:{problems},next:[{run:'mw settings',why:'inspect the current installation settings'}]})
 try{validateDestinationRootsUnsafe(storePath,parsed.destinations)}catch(e){if(e instanceof MadeWellError)throw e;throw ledgerError('file_result_invalid','The declared result could not be observed.',{reason:String(e)})}
 return parsed
}
export const updateSettings = Effect.fn('mw.updateSettings')(function* (input: {requestId:string; revision:string; settings:Partial<WorkSettings>}) {
 yield* assertWritable()
 const store = yield* Store, at = new Date(yield* Clock.currentTimeMillis).toISOString()
 return yield* Effect.try({try:()=>store.request(input.requestId,'settings',null,input,()=>{
  const current=store.settings(), revision=current?.revision ?? '0'
  if(input.revision!==revision) throw new MadeWellError({code:'revision_conflict',message:'Settings changed; retain your draft.',context:{expected:input.revision,actual:revision},next:[{run:'mw settings',why:'review current settings'}]})
  const settings=validateSettings({...settingsOf(store),...input.settings},store.path)
  return store.saveSettings(settings,at)
 }),catch:e=>e instanceof MadeWellError?e:new MadeWellError({code:'settings_invalid',message:String(e),context:{},next:[]})})
})

export interface OpenHold {readonly item:number;readonly title:string;readonly code:string;readonly message:string;readonly context:Record<string,unknown>;readonly since:string;readonly alerted:{at:string;exitCode:number}|null}
export const openHolds=(store:Store['Service']):OpenHold[]=>store.list().filter(i=>i.hold).map(i=>{const events=store.events(i.id),held=events.findLast(e=>e.kind==='held'||e.kind==='paused'),alert=events.filter(e=>e.seq>(held?.seq??0)).find(e=>e.kind==='alert-finished');return {item:i.id,title:i.title,...i.hold!,since:held?.at??i.updated,alerted:alert?{at:alert.at,exitCode:Number(alert.data.exitCode)}:null}})
export const alertHolds=Effect.fn('mw.alertHolds')(function*(){
 const store=yield* Store
 for(const hold of openHolds(store)){
  const events=store.events(hold.item),held=events.findLast(e=>e.kind==='held'||e.kind==='paused'),attempts=events.filter(e=>e.seq>(held?.seq??0)&&e.kind==='alert-attempt')
  if(attempts.length) {
   for(const attempt of attempts.filter(e=>e.data.status==='started')) {
    if(events.some(e=>e.kind==='alert-finished'&&(e.data.attempt===attempt.seq||e.data.attempt===undefined&&e.seq>attempt.seq))) continue
    store.transition(hold.item,revisionOf(store.get(hold.item)),'alert-finished',{attempt:attempt.seq,status:'uncertain',reason:'interrupted before its outcome was recorded'},item=>item)
   }
   continue // An uncertain attempt is evidence, never permission to resend.
  }
  const alert=store.get(hold.item)!.settings?.alert,at=new Date(yield* Clock.currentTimeMillis).toISOString()
  store.note(hold.item,'alert-attempt',{alert:alert??null,status:alert?'started':'missing'},at)
  if(!alert){store.note(hold.item,'alert-finished',{status:'missing',exitCode:null},at);continue}
  const result=yield* Effect.result(runGroup({command:'sh',args:['-c',alert.run],cwd:alert.cwd,env:{...process.env,MW_ITEM:String(hold.item),MW_TITLE:hold.title,MW_HOLD:hold.code,MW_MESSAGE:hold.message},input:JSON.stringify(hold),budget:{minutes:5}}))
  store.note(hold.item,'alert-finished',result._tag==='Success'?{status:result.success.code===0?'delivered':'failed',exitCode:result.success.code,output:result.success.stdout+result.success.stderr}:{status:'failed',exitCode:null,error:result.failure.message})
 }
})
