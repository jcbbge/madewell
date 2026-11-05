// Two independent structured-result tasks, with explicit independent acceptance.
import { readFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { Effect, Layer } from 'effect'
import { AUTONOMY_PACK } from '../../src/autonomy-pack.ts'
import { loadPrescriptions } from '../../src/cards.ts'
import { drive, go, nextFor, promote, retry, runQueue } from '../../src/engine.ts'
import { MadeWellError, errorJson } from '../../src/errors.ts'
import { createLedgerWork } from '../../src/ledger.ts'
import { harnessWorker } from '../../src/harness.ts'
import { openStore, Store } from '../../src/store.ts'
import { settingsOf, updateSettings } from '../../src/settings.ts'
import { serveForeground } from './foreground.ts'

const {positionals,values}=parseArgs({allowPositionals:true,options:{root:{type:'string',default:'.demo'},item:{type:'string'},prescriptions:{type:'string'},'source-file':{type:'string'},port:{type:'string',default:'4747'}}})
const command=positionals[0]??'status',root=resolve(values.root!),home=join(root,'home'),path=join(home,'madewell.db')
mkdirSync(home,{recursive:true});process.env.MW_AUTORUN='0';process.env.MW_STORE=path
const store=openStore(path),layer=Layer.mergeAll(Layer.succeed(Store,store),harnessWorker)
const run=<A,E>(effect:Effect.Effect<A,E,Store|import('../../src/worker.ts').Worker>)=>Effect.runPromise(effect.pipe(Effect.provide(layer)))
try{
 let output:unknown
 if(command==='init'){
  await run(updateSettings({requestId:'demo-settings-v2',revision:store.settings()?.revision??'0',settings:{...settingsOf(store),deliveryPack:AUTONOMY_PACK}}))
  output=await Promise.all([
   run(createLedgerWork({requestId:'demo-invitation-v2',title:'Workshop invitation',objective:'Produce an invitation as a structured text result.',source:'Fictional example: invite independent designers to a free 45-minute Calm Inbox workshop. Date/time TBD. Reply for updates; invent no URL and send nothing.',settings:{deliveryPack:AUTONOMY_PACK}})),
   run(createLedgerWork({requestId:'demo-agenda-v2',title:'Workshop agenda',objective:'Produce a 45-minute workshop agenda as a structured result.',source:'Fictional independent task: a 45-minute Calm Inbox agenda for independent designers. Keep timings summing to 45 minutes. No publication or contact.',settings:{deliveryPack:AUTONOMY_PACK}})),
  ])
 }else if(command==='discover'){
  if(!values['source-file']) throw new MadeWellError({code:'usage',message:'Supply --source-file.',context:{command},next:[]})
  output=await run(createLedgerWork({title:'Raw input discovery',objective:'Turn exact input into useful candidate work.',source:readFileSync(resolve(values['source-file']),'utf8'),discovery:true}))
 }else if(command==='serve'){
  const prescriptions=await Effect.runPromise(loadPrescriptions(resolve(values.prescriptions??'prescriptions.json')))
  output=await run(serveForeground(prescriptions,'127.0.0.1',Number(values.port)))
 }else if(command==='run'){
  const prescriptions=await Effect.runPromise(loadPrescriptions(resolve(values.prescriptions??'prescriptions.json')))
  const roots=values.item?[Number(values.item)]:store.list().filter(i=>i.source.startsWith('Fictional')).map(i=>i.id)
  output=await run(runQueue({prescriptions},{roots}))
 }else if(['retry','go','drive','promote'].includes(command)){
  const id=Number(values.item??positionals[1]);if(!Number.isSafeInteger(id)||id<1)throw new MadeWellError({code:'usage',message:'Supply --item.',context:{command},next:[]})
  output=command==='promote'?await run(promote(id,positionals.slice(2).map(Number))):command==='retry'?await run(retry(id)):command==='go'?await run(go(id)):await run(drive(id,{prescriptions:await Effect.runPromise(loadPrescriptions(resolve(values.prescriptions??'prescriptions.json')))}))
 }else output={store:path,items:store.list().map(i=>({id:i.id,title:i.title,status:i.status,result:i.completion?.result,next:nextFor(i)}))}
 process.stdout.write(JSON.stringify(output??null)+'\n')
}catch(error){process.stdout.write(JSON.stringify(errorJson(error instanceof MadeWellError?error:new MadeWellError({code:'usage',message:String(error),context:{command},next:[]})))+'\n');process.exitCode=1}finally{store.close()}
