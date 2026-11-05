// One journaled cutover shared by the CLI and in-process callers. No legacy command is executed.
import { createHash, randomUUID } from 'node:crypto'
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync, readFileSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'
import { Clock, Context, Effect, Layer } from 'effect'
import { Store } from './store.ts'
import { MadeWellError } from './errors.ts'
import { decodeLegacy, legacyDisposition, legacyRegistryPath, revisionOf } from './legacy.ts'
import type { Actor } from './ledger.ts'
export type MigrationPhase='snapshot-saved'|'items-saved'|'registry-removed'|'complete'
export type MigrationBoundary=MigrationPhase|'registry-unlinked'
export interface MigrationReceipt {
 version:1;migrationId:string;token:string;phase:'complete';registry:{path:string;sha256:string|null;bytes:number;alreadyMissing:boolean};items:ReadonlyArray<{id:number;revisionBefore:string;revisionAfter:string;disposition:string}>;diagnostics:ReadonlyArray<string>;attestation:{writersStopped:true;actor:Actor;at:string};startedAt:string;completedAt:string
}
export interface MigrationJournal {
 id:string;token:string;phase:MigrationPhase;started:string;updated:string;doc:{registry:{path:string;present:boolean;base64:string;sha256:string|null;bytes:number;dev:number|null;ino:number|null};items:ReadonlyArray<{id:number;doc:string}>;dispositions:MigrationPreview['items'];diagnostics:ReadonlyArray<string>;attestation:MigrationReceipt['attestation'];receipt:MigrationReceipt|null}
}
export interface MigrationPreview {version:1;required:boolean;token:string;registry:{path:string;present:boolean;sha256:string|null;bytes:number;diagnostics:ReadonlyArray<string>};items:ReadonlyArray<{id:number;revision:string;disposition:string}>;runner:ReturnType<Store['Service']['runner']>;cutoverRequired:true}
export interface MigrationStatus {version:1;required:boolean;registry:{path:string;present:boolean};journal:null|{migrationId:string;token:string;phase:MigrationPhase;startedAt:string;updatedAt:string};receipt:MigrationReceipt|null}
export interface BoundaryContext {migrationId:string;token:string;durablePhase:MigrationPhase;registryPresent:boolean;registrySha256:string|null;itemIds:ReadonlyArray<number>}
export class MigrationControl extends Context.Service<MigrationControl,{afterBoundary(boundary:MigrationBoundary,context:BoundaryContext):Effect.Effect<void,MadeWellError>}>()('madewell/MigrationControl') {}
export const MigrationControlNoop=Layer.succeed(MigrationControl,{afterBoundary:()=>Effect.void})
const failure=(code:'migration_conflict'|'migration_in_progress'|'migration_required'|'migration_token_stale'|'migration_not_required'|'migration_attestation_missing',context:Record<string,unknown>={})=>new MadeWellError({code,message:code.replaceAll('_',' '),context,next:[{run:'mw migrate --status',why:'inspect the durable migration journal'},{run:'mw migrate --preview',why:'review the current source before applying'}]})
const present=(path:string)=>{try{lstatSync(path);return true}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return false;throw e}}
const sha=(body:Buffer)=>createHash('sha256').update(body).digest('hex')
function registry(path:string) {
 try {
  const stat=lstatSync(path)
  if(stat.isSymbolicLink()||!stat.isFile()) throw failure('migration_conflict',{path,expectedSha256:null,observed:'non-regular registry'})
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW)
  try {const opened=fstatSync(fd);if(opened.dev!==stat.dev||opened.ino!==stat.ino) throw failure('migration_conflict',{path,observed:'registry replaced while opening'});const body=readFileSync(fd);return {path,present:true,base64:body.toString('base64'),sha256:sha(body),bytes:body.length,dev:opened.dev,ino:opened.ino}}finally{closeSync(fd)}
 }catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT') return {path,present:false,base64:'',sha256:null,bytes:0,dev:null,ino:null};throw e}
}
const previewOf=(store:Store['Service']):MigrationPreview=>{
 const r=registry(legacyRegistryPath(store.path)),raw=store.rawItems(),diagnostics:string[]=[]
 if(r.present) {try {const entries=JSON.parse(Buffer.from(r.base64,'base64').toString('utf8'));if(!Array.isArray(entries)) diagnostics.push('Registry is not an array.');else {const seen=new Set<string>();entries.forEach((e,i)=>{if(!e||typeof e.path!=='string') diagnostics.push(`Registry entry ${i} is malformed.`);else if(seen.has(e.path)) diagnostics.push(`Registry entry ${i} duplicates ${e.path}.`);else seen.add(e.path)})}}catch{diagnostics.push('Registry is malformed JSON; exact bytes retained.')}}
 const items=raw.map(i=>({id:i.id,revision:revisionOf(JSON.parse(i.doc)),disposition:legacyDisposition(JSON.parse(i.doc))}))
 const token=revisionOf({registry:{path:r.path,present:r.present,base64:r.base64,sha256:r.sha256,bytes:r.bytes},items:raw,settings:store.settings(),schema:'ledger-2'})
 return {version:1,required:r.present||items.some(i=>i.disposition!=='current'),token,registry:{path:r.path,present:r.present,sha256:r.sha256,bytes:r.bytes,diagnostics},items,runner:store.runner(),cutoverRequired:true}
}
export const previewMigration=Effect.fn('mw.previewMigration')(function*(){const store=yield* Store;return yield* Effect.try({try:()=>previewOf(store),catch:e=>e instanceof MadeWellError?e:failure('migration_conflict',{observed:String(e)})})})
export const migrationStatus=Effect.fn('mw.migrationStatus')(function*():Effect.fn.Return<MigrationStatus,MadeWellError,Store>{
 const store=yield* Store,j=store.migrationJournal(),path=legacyRegistryPath(store.path)
 return {version:1,required:j?j.phase!=='complete':present(path)||store.rawItems().some(i=>JSON.parse(i.doc).schemaVersion!==2),registry:{path,present:present(path)},journal:j?{migrationId:j.id,token:j.token,phase:j.phase,startedAt:j.started,updatedAt:j.updated}:null,receipt:j?.doc.receipt??null}
})
export const assertWritable=Effect.fn('mw.assertWritable')(function*(){
 const store=yield* Store,j=store.migrationJournal()
 if(j&&j.phase!=='complete') return yield* failure('migration_in_progress',{migrationId:j.id,token:j.token,phase:j.phase})
 if(!j&&(yield* previewMigration()).required) return yield* failure('migration_required')
})
export const applyMigration=Effect.fn('mw.applyMigration')(function*(input:{token:string;writersStopped:boolean;actor:Actor}){
 // This check must precede even resolving Store: a missing attestation touches no state.
 if(input.writersStopped!==true) return yield* failure('migration_attestation_missing')
 const store=yield* Store
 yield* store.claimRunner({exclusive:true})
 return yield* Effect.gen(function*(){
  const control=yield* MigrationControl
  let j=store.migrationJournal()
  if(j?.phase==='complete'&&j.token===input.token) return j.doc.receipt!
  if(j&&j.phase!=='complete'&&j.token!==input.token) return yield* failure('migration_in_progress',{migrationId:j.id,token:j.token,phase:j.phase})
  if(!j||j.phase==='complete') {
   const preview=yield* previewMigration()
   if(!preview.required) return yield* failure('migration_not_required')
   if(input.token!==preview.token) return yield* failure('migration_token_stale',{given:input.token,current:preview.token})
   const at=new Date(yield* Clock.currentTimeMillis).toISOString(),r=registry(preview.registry.path)
   j={id:randomUUID(),token:input.token,phase:'snapshot-saved',started:at,updated:at,doc:{registry:r,items:store.rawItems(),dispositions:preview.items,diagnostics:preview.registry.diagnostics,attestation:{writersStopped:true,actor:input.actor,at},receipt:null}}
   if(previewOf(store).token!==input.token) return yield* failure('migration_token_stale',{given:input.token,current:previewOf(store).token})
   store.migrationBegin(j)
   yield* control.afterBoundary('snapshot-saved',{migrationId:j.id,token:j.token,durablePhase:j.phase,registryPresent:r.present,registrySha256:r.sha256,itemIds:j.doc.items.map(i=>i.id)})
  }
  const boundary=(name:MigrationBoundary,durablePhase:MigrationPhase)=>{const observed=registry(j!.doc.registry.path);return control.afterBoundary(name,{migrationId:j!.id,token:j!.token,durablePhase,registryPresent:observed.present,registrySha256:observed.sha256,itemIds:j!.doc.items.map(i=>i.id)})}
  if(j.phase==='snapshot-saved') {
   const at=new Date(yield* Clock.currentTimeMillis).toISOString()
   const items=j.doc.items.map(i=>decodeLegacy(JSON.parse(i.doc),at))
   store.migrationSaveItems(j.id,items,items.map(i=>({item:i.id,kind:'legacy-migrated',data:{migrationId:j!.id,disposition:legacyDisposition(JSON.parse(j!.doc.items.find(r=>r.id===i.id)!.doc)),acceptanceCoverage:'unavailable'},at})))
   j=store.migrationJournal()!
   yield* boundary('items-saved','items-saved')
  }
  const saved=j.doc.registry
  let alreadyMissing=!present(saved.path)
  const unlink=()=>{
   const observed=registry(saved.path)
   if(observed.present&&(observed.sha256!==saved.sha256||observed.dev!==saved.dev||observed.ino!==saved.ino||!saved.present)) throw failure('migration_conflict',{path:saved.path,expectedSha256:saved.sha256,observed:observed.sha256})
   if(observed.present) unlinkSync(saved.path)
   const fd=openSync(dirname(saved.path),constants.O_RDONLY)
   try{fsyncSync(fd)}finally{closeSync(fd)}
  }
  if(j.phase==='items-saved') {
   yield* Effect.try({try:unlink,catch:e=>e instanceof MadeWellError?e:failure('migration_conflict',{path:saved.path,expectedSha256:saved.sha256,observed:String(e)})})
   yield* boundary('registry-unlinked','items-saved')
   store.migrationPhase(j.id,'registry-removed');j=store.migrationJournal()!
   yield* boundary('registry-removed','registry-removed')
  }
  if(present(saved.path)) return yield* failure('migration_conflict',{path:saved.path,expectedSha256:saved.sha256,observed:'registry reappeared'})
  const receipt:MigrationReceipt={version:1,migrationId:j.id,token:j.token,phase:'complete',registry:{path:saved.path,sha256:saved.sha256,bytes:saved.bytes,alreadyMissing},items:j.doc.dispositions.map(d=>({id:d.id,revisionBefore:d.revision,revisionAfter:revisionOf(store.get(d.id)),disposition:d.disposition})),diagnostics:j.doc.diagnostics,attestation:j.doc.attestation,startedAt:j.started,completedAt:new Date(yield* Clock.currentTimeMillis).toISOString()}
  store.migrationPhase(j.id,'complete',receipt)
  yield* boundary('complete','complete')
  return receipt
 }).pipe(Effect.ensuring(Effect.sync(()=>store.releaseRunner())),Effect.catchDefect(e=>Effect.fail(e instanceof MadeWellError?e:failure('migration_conflict',{observed:String(e)}))))
})
