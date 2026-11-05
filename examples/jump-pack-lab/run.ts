// Foreground-only execution-2 experiment using declared bindings and independent acceptance.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { Effect, Layer } from 'effect'
import { AUTONOMY_PACK } from '../../src/autonomy-pack.ts'
import { loadPrescriptions } from '../../src/cards.ts'
import { nextFor, runQueue } from '../../src/engine.ts'
import { errorJson, MadeWellError } from '../../src/errors.ts'
import { createLedgerWork } from '../../src/ledger.ts'
import { harnessWorker } from '../../src/harness.ts'
import { defaultStorePath, openStore, Store } from '../../src/store.ts'
const {positionals,values}=parseArgs({allowPositionals:true,options:{item:{type:'string'},'source-file':{type:'string'},prescriptions:{type:'string'}}}),command=positionals[0]??'status',store=openStore(defaultStorePath())
const run=<A,E>(effect:Effect.Effect<A,E,Store|import('../../src/worker.ts').Worker>)=>Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store,store),harnessWorker))))
try{
 let output:unknown
 if(command==='capture'){
  const sourceFile=values['source-file']?resolve(values['source-file']):null
  const item=await run(createLedgerWork({title:'Declared-input work experiment',objective:'Produce and independently accept a structured result from the exact supplied source.',source:sourceFile?readFileSync(sourceFile,'utf8'):'Fictional Calm Inbox workshop: free, 45 minutes, independent designers, date TBD. Produce text only. Send nothing.',settings:{deliveryPack:AUTONOMY_PACK,inputs:sourceFile?[{id:'source',path:sourceFile,kind:'file'}]:[]}}))
  store.note(item.id,'lab-case',{kind:'live-model',hypothesis:'Explicit input and independent result acceptance require no project setup.',expected:['saved structured result','condition-bound independent acceptance']});output=item
 }else if(command==='run'){
  if(!values.item)throw new MadeWellError({code:'usage',message:'Supply --item to select this experiment root.',context:{command},next:[]})
  output=await run(runQueue({prescriptions:await Effect.runPromise(loadPrescriptions(resolve(values.prescriptions??'prescriptions.json')))},{roots:[Number(values.item)]}))
 }else output=store.list().filter(i=>store.events(i.id).some(e=>e.kind==='lab-case')).map(i=>({id:i.id,status:i.status,result:i.completion?.result,next:nextFor(i)}))
 process.stdout.write(JSON.stringify(output??null)+'\n')
}catch(e){process.stdout.write(JSON.stringify(errorJson(e instanceof MadeWellError?e:new MadeWellError({code:'usage',message:String(e),context:{command},next:[]})))+'\n');process.exitCode=1}finally{store.close()}
