// Explicit boundary updates preserve every attempted/accepted/superseded prefix.
import { readFileSync } from 'node:fs'
import { Effect } from 'effect'
import { requestPackUpdate } from '../../src/functions.ts'
import { errorJson, MadeWellError } from '../../src/errors.ts'
import { assertWritable } from '../../src/migration.ts'
import { defaultStorePath, openStore, Store } from '../../src/store.ts'
const store=openStore(defaultStorePath()),[id,file]=process.argv.slice(2)
try{await Effect.runPromise(assertWritable().pipe(Effect.provideService(Store,store)));const input=JSON.parse(readFileSync(file!,'utf8'));process.stdout.write(JSON.stringify(store.request(input.requestId,'pack-update',Number(id),input,()=>requestPackUpdate(store,Number(id),input.pack)))+'\n')}catch(e){process.stdout.write(JSON.stringify(errorJson(e instanceof MadeWellError?e:new MadeWellError({code:'usage',message:String(e),context:{command:'pack-update'},next:[]})))+'\n');process.exitCode=1}finally{store.close()}
