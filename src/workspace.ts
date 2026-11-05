// Disposable execution directories. Durable outputs are declared references, never scratch contents.
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Clock, Effect } from 'effect'
import { MadeWellError } from './errors.ts'
import { runGroup } from './worker.ts'
export interface Resource {readonly kind:string;readonly id:string;readonly teardown:string;readonly cwd?:string}
export interface TeardownRecord {readonly at:string;readonly exitCode:number;readonly output:string}
export const scratchRoot=(storePath:string)=>join(dirname(storePath),'scratch')
export const scratch=Effect.fn('mw.scratch')(function*(storePath:string,item:number,job:string,invocation:string,onRelease?:(removed:boolean)=>void){
 return yield* Effect.acquireRelease(Effect.sync(()=>{const root=scratchRoot(storePath);mkdirSync(root,{recursive:true});return mkdtempSync(join(root,`${item}-${job}-${invocation}-`))}),path=>Effect.sync(()=>{let removed=false;try{rmSync(path,{recursive:true,force:true});removed=true}finally{onRelease?.(removed)}}))
})
export function fingerprint(paths:ReadonlyArray<string>):string {
 const entries:unknown[]=[]
 const visit=(path:string)=>{try{const s=lstatSync(path);if(s.isSymbolicLink()) entries.push([path,'link',readlinkSync(path)]);else if(s.isDirectory()){entries.push([path,'dir']);for(const child of readdirSync(path).sort()) visit(join(path,child))}else if(s.isFile()) entries.push([path,s.mode,createHash('sha256').update(readFileSync(path)).digest('hex')]);else entries.push([path,'special'])}catch{entries.push([path,'unavailable'])}}
 for(const path of paths) visit(path)
 return createHash('sha256').update(JSON.stringify(entries)).digest('hex')
}
export const executionEnv=(item:number,job:string,invocation:string,cwd:string)=>{
 const env={...process.env,MW_ITEM:String(item),MW_JOB:job,MW_INVOCATION:invocation,MW_SCRATCH:cwd}
 for(const key of ['MW_BASE','MW_BRANCH','MW_WORKTREE','MW_PROJECT']) delete (env as NodeJS.ProcessEnv)[key]
 return env
}
export const teardown=Effect.fn('mw.teardown')(function*(resource:Resource){
 if(!resource.cwd) return yield* new MadeWellError({code:'work_invalid',message:'Legacy teardown is inert; no execution directory is authorized.',context:{resource},next:[]})
 const r=yield* runGroup({command:'sh',args:['-c',resource.teardown],cwd:resource.cwd,env:process.env,input:'',budget:{minutes:5}})
 return {at:new Date(yield* Clock.currentTimeMillis).toISOString(),exitCode:r.code??1,output:r.stdout+r.stderr}
})
