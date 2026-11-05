#!/usr/bin/env node
// Results go to stdout as JSON; errors go to stderr as
// {error, message, context, cause?, next} with exit code 1.
// Read commands open SQLite without creating or migrating anything.
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { constants as osConstants } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { parseArgs } from 'node:util'
import { Clock, Effect } from 'effect'
import { contextOf } from './api.ts'
import { answer, contextFact, contextFacts, drop, go, nextFor, promote, retry, runQueue } from './engine.ts'
import { loadPrescriptions } from './cards.ts'
import { ERRORS, MadeWellError, errorJson, quote } from './errors.ts'
import { createLedgerWork, mutateWork, type Mutation } from './ledger.ts'
import { assertWritable, applyMigration, migrationStatus, previewMigration, MigrationControlNoop } from './migration.ts'
import { openHolds, settingsOf, updateSettings } from './settings.ts'
import { Store, defaultStorePath, readOnlyStoreLayer, storeLayer, type Item } from './store.ts'
import { harnessWorker } from './harness.ts'
import { commandWorker } from './worker.ts'
import { resolvePackSelection } from './pack-selection.ts'
import { laneOf } from './lane.ts'
import { requestPackUpdate } from './functions.ts'
import { lensOf } from './trace.ts'
import { exportItem } from './export.ts'
import { serve, watch, staticPage } from './ui.ts'
import { itemHome, revisionOf } from './legacy.ts'
import { evaluate } from './eval.ts'
import { stats } from './telemetry.ts'
import { qaCase, qaCases, qaCreateCase, qaExport, qaLink, qaObservations, qaObserve, qaReviseCase, qaRun, qaRuns, qaStartRun, qaStorageError, qaVerdict } from './qa.ts'

const usage=(message:string)=>new MadeWellError({code:'usage',message,context:{command:process.argv[2]??null},next:[{run:'mw',why:'read available commands'},{run:'mw settings',why:'configure installation defaults'},{run:'mw migrate --preview',why:'inspect historical storage cutover'}]})
export const COMMANDS=[
 ['discover','--source-file <file> | --source <text> [--request-id <id>]'],['start','--objective <text> --source-file <file> | --source <text> [--request-id <id>]'],['settings','[--input-file <file>]'],['migrate','--preview | --apply <token> --writers-stopped | --status'],
 ...['progress','block','unblock','complete','configure-work','resolve-execution'].map(name=>[name,'<id> --input-file <file>']),
 ['promote','<discovery> [candidate ids] [--input-file <file>]'],['answer','<id> <text...> [--cause implementation|test|pre-existing] | <id> --input-file <file>'],['drop','<id> [--input-file <file>]'],['retry','<id>'],['go','<id>'],['run','[--watch]'],['status','[id]'],['show','<id>'],['context','<id>'],['trace','<id> [--lens ux|dx|ax]'],['holds',''],['cartridges','[--check <selector> | --update <selector> --item <id>]'],['ui','[--host <host> --port <port>]'],['watch','[--once]'],['export','<id> --out <directory>'],['replay','[--out <file>]'],['stats','[--dir <directory>]'],['prune','--before <ISO timestamp> [--dry-run]'],['eval','<job> [--card <card>]'],['context-fact','<id> [--input-file <file>]'],
 ...['qa-cases','qa-case','qa-runs','qa-run','qa-observations','qa-export','qa-case-create','qa-case-revise','qa-run-start','qa-observe','qa-verdict','qa-link'].map(name=>[name,'[ids] [--input-file <file>]']),
].map(([name,input])=>({name,input,...(name==='answer'?{summary:"Answer an item that waits on you: an agent's open questions, a failed check (with --cause), or, at a checkpoint, what should change."}:name==='stats'?{summary:'Metrics from the telemetry files of every machine in a directory (MW_TELEMETRY, or --dir): per host and store, items created, completed and held; lead time, NQ, calls, tokens, refusals and rule-break flags.'}:{})}))
const view=(item:Item)=>({id:item.id,title:item.title,objective:item.objective,status:item.status,job:item.job,round:item.round,owner:item.progress.owner,progress:item.progress,conditions:item.conditions,blockers:item.blockers,execution:item.execution,...(item.kind?{kind:item.kind}:{}),...(item.discovery!==undefined?{discovery:item.discovery}:{}),...(item.hold?{hold:item.hold}:{}),...(item.completion?{completion:item.completion}:{}),next:nextFor(item)})
const retention = (store: Store['Service'], before: string) => {
	const items = store.list()
	const qaAnchors = new Set(store.qaRetained())
	const live = items.filter((i) => !['shipped', 'completed', 'discovered', 'dropped'].includes(i.status))
	const links = (i: Item) => [i.relationships?.parent, i.relationships?.discovery, ...(i.relationships?.after ?? []), i.waitsOn, i.parent, i.discovery, ...(i.after ?? [])]
	const old = items.filter((i) => !live.includes(i) && Date.parse(i.updated) < Date.parse(before))
	const why = (i: Item) => {
		if (qaAnchors.has(i.id)) return 'retained by manual QA history'
		const by = live.find((l) => links(l).includes(i.id) || links(i).includes(l.id))
		if (by) return `#${by.id} (${by.status}) needs it`
	}
	const ids: number[] = []
	const kept: {id:number;status:Item['status'];why:string}[] = []
	for (const i of old) {
		const w = why(i)
		if (w) kept.push({ id: i.id, status: i.status, why: w })
		else ids.push(i.id)
	}
	return { ids, kept }
}


/** Bytes on disk under a path. */
const sizeOf = (path: string): number => {
	if (!existsSync(path)) return 0
	const s = statSync(path)
	return s.isDirectory() ? readdirSync(path).reduce((n, f) => n + sizeOf(join(path, f)), 0) : s.size
}

const main=Effect.gen(function*(){
 const options:Record<string,{type:'string'|'boolean'}>={}
 for(const k of ['input-file','source-file','source','objective','title','request-id','autonomy','cartridges','check','update','item','lens','host','port','out','before','apply','card','brief','limit','selection','format','cause','dir']) options[k]={type:'string'}
 for(const k of ['preview','status','writers-stopped','watch','once','dry-run']) options[k]={type:'boolean'}
 const parsed=yield* Effect.try({try:()=>parseArgs({allowPositionals:true,options}),catch:e=>usage(String(e))})
 const [command,...args]=parsed.positionals,v=parsed.values as Record<string,string|boolean|undefined>,path=defaultStorePath()
 const file=()=>{if(typeof v['input-file']!=='string') throw usage('--input-file is required.');return JSON.parse(readFileSync(v['input-file'],'utf8'))}
 const id=()=>{const n=Number(args[0]??v.item);if(!Number.isSafeInteger(n)||n<1) throw usage('A positive work item id is required.');return n}
 if(command==='init') return yield* usage('Project registration has been removed. Use mw settings or mw migrate; no configuration was written.')
 if(!command) return {name:'Made Well',grammar:'capture input → generate tasks → complete tasks',commands:COMMANDS,store:path}
 if(command==='stats'){
  const dir=typeof v.dir==='string'?v.dir:process.env.MW_TELEMETRY
  if(!dir) return yield* usage('No telemetry directory: set MW_TELEMETRY=<dir> on every machine, or pass --dir <dir>.')
  const files=existsSync(dir)?readdirSync(dir).filter(f=>f.endsWith('.jsonl')).sort():[]
  const lines=files.flatMap(f=>readFileSync(join(dir,f),'utf8').split('\n').filter(Boolean))
  return {dir:resolve(dir),files,lines:lines.length,...stats(lines),next:files.length?[]:[{run:`export MW_TELEMETRY=${quote(resolve(dir))}`,why:'set it on every machine that runs Made Well, so each writes its file there'}]}
 }
 const read=['status','show','context','trace','holds','cartridges','context-fact','qa-cases','qa-case','qa-runs','qa-run','qa-observations','qa-export','replay','export'].includes(command)&&!v.update&&!v['input-file']||command==='settings'&&!v['input-file']||command==='migrate'&&!v.apply
 const missing=read&&!existsSync(path)
 if(missing&&command==='status'&&!args.length) return {store:path,exists:false,items:[]}
 const program:Effect.Effect<unknown,MadeWellError,Store>=Effect.gen(function*(){
  const store=yield* Store
  if(command==='migrate'){
   if(v.preview) return yield* previewMigration()
   if(v.status) return yield* migrationStatus()
   if(typeof v.apply==='string') return yield* applyMigration({token:v.apply,writersStopped:v['writers-stopped']===true,actor:{kind:'operator',label:'mw migrate'}}).pipe(Effect.provide(MigrationControlNoop))
   return yield* usage('Choose --preview, --status or --apply <token> --writers-stopped.')
  }
  if(!read&&command!=='ui'&&command!=='watch') yield* assertWritable()
  const found=(n:number)=>{const item=store.get(n);if(!item) throw new MadeWellError({code:'item_not_found',message:`There is no work item #${n}.`,context:{id:n},next:[{run:'mw status',why:'list every work item'}]});return item}
  if(command==='settings') return v['input-file']?yield* updateSettings(file()):{settings:settingsOf(store),revision:store.settings()?.revision??'0'}
  if(['start','discover'].includes(command)){
   const source=typeof v['source-file']==='string'?readFileSync(v['source-file'],'utf8'):v.source
   if(typeof source!=='string') return yield* usage('Provide exact source with --source or --source-file.')
   const objective=typeof v.objective==='string'?v.objective:command==='discover'?'Turn the raw input into candidate work items.':undefined
   if(!objective) return yield* usage('--objective is required.')
   const settings=v.cartridges?{[command==='discover'?'discoveryPack':'deliveryPack']:v.cartridges as never}:{}
   const input={title:String(v.title??objective),objective,source,discovery:command==='discover',settings:{...settings,...(v.autonomy?{autonomy:v.autonomy as 'full'}:{})}}
   const create=()=>{
    const item=Effect.runSync(createLedgerWork(input).pipe(Effect.provideService(Store,store)))
    const next=item.execution.mode==='external'?nextFor(item):process.env.MW_AUTORUN==='0'?[{run:'mw run',why:'deliver it: the operator starts the runner (MW_AUTORUN=0)'}]:[{run:`mw status ${item.id}`,why:'the machine is working on it by itself; this shows where it is'},{run:'mw ui',why:'watch every step live'}]
    return {item:view(item),next}
   }
   const response=typeof v['request-id']==='string'?store.request(v['request-id'],'create',null,{...input,kind:undefined,conditions:undefined},create):create()
   const created=store.get(response.item.id)
   if(created?.execution.mode==='cartridge'&&process.env.MW_AUTORUN!=='0'&&!store.runner()){const child=spawn(process.execPath,[process.argv[1]!,'run','--item',String(created.id)],{cwd:dirname(path),env:{...process.env,MW_STORE:path},detached:true,stdio:'ignore'});child.unref()}
   return response
  }
  if(['progress','block','unblock','complete','configure-work','resolve-execution'].includes(command)) return yield* mutateWork(command,id(),file() as Mutation)
  if(command==='run'){const prescriptions=yield* loadPrescriptions(process.env.MW_PRESCRIPTIONS??new URL('../prescriptions.json',import.meta.url).pathname);return yield* runQueue({prescriptions},{watch:v.watch===true,...(v.item?{roots:[Number(v.item)]}:{})}).pipe(Effect.provide(process.env.MW_WORKER_COMMAND?commandWorker(process.env.MW_WORKER_COMMAND):harnessWorker))}
  if(command==='status') return args.length?{item:found(id()),next:nextFor(found(id()))}: {items:store.list(),runner:store.runner(),migration:yield* migrationStatus()}
  if(command==='show') return {item:found(id()),events:store.events(id()),calls:store.calls(id())}
  if(command==='context') {found(id());return {...contextOf(store,id()),migration:yield* migrationStatus()}}
  if(command==='trace') return lensOf(store,id(),(v.lens??'ux') as 'ux',nextFor(found(id())))
  if(command==='holds') return openHolds(store)
  if(command==='cartridges') {
   if(v.update){const body=file(),input={...body,selection:String(v.update)};return store.request(body.requestId,'pack-update',id(),input,()=>{if(body.revision!==revisionOf(store.get(id()))) throw new MadeWellError({code:'revision_conflict',message:'Work changed.',context:{id:id()},next:[]});const resolved=Effect.runSync(resolvePackSelection(String(v.update)));return requestPackUpdate(store,id(),resolved.pack!)})}
   if(v.check) return yield* resolvePackSelection(String(v.check))
   return args.length||v.item?laneOf(found(id()).pack):settingsOf(store)
  }
  if(command==='context-fact') return v['input-file']?yield* contextFact(id(),file()):yield* contextFacts(id())
  if(command==='answer'){
   if(v['input-file']&&args.length>1) return yield* usage('Positional answer text and --input-file cannot be given together.')
   const body=v['input-file']?file():undefined,text=body?.text??args.slice(1).join(' '),cause=body?.cause??v.cause
   if(typeof text!=='string'||!text.trim()) return yield* usage('Provide positional answer text or --input-file with text.')
   if(cause!==undefined&&!['implementation','test','pre-existing'].includes(cause)) return yield* usage('--cause must be implementation, test or pre-existing.')
   const input={id:id(),text,...(cause!==undefined?{cause}:{})}
   const respond=()=>{
    const answered=Effect.runSync(answer(input.id,input.text,input.cause).pipe(Effect.provideService(Store,store),Effect.match({onSuccess:item=>({ok:true as const,item}),onFailure:error=>({ok:false as const,error})})))
    if(!answered.ok) throw answered.error
    const item=found(input.id)
    return {item:view(item),next:item.execution.mode==='external'?nextFor(item):process.env.MW_AUTORUN==='0'?[{run:'mw run',why:'deliver it: the operator starts the runner (MW_AUTORUN=0)'}]:[{run:`mw status ${item.id}`,why:'the machine is working on it by itself; this shows where it is'},{run:'mw ui',why:'watch every step live'}]}
   }
   const response=body?.requestId?store.request(body.requestId,'answer',input.id,body,()=>{
    if(body.revision!==revisionOf(store.get(input.id))) throw new MadeWellError({code:'revision_conflict',message:'Review current work before submitting a new request.',context:{id:input.id},next:[]})
    return respond()
   }):respond()
   const item=store.get(input.id)
   if(item?.execution.mode==='cartridge'&&process.env.MW_AUTORUN!=='0'&&!store.runner()){const child=spawn(process.execPath,[process.argv[1]!,'run','--item',String(item.id)],{cwd:dirname(path),env:{...process.env,MW_STORE:path},detached:true,stdio:'ignore'});child.unref()}
   return response
  }
  if(['promote','drop','retry','go'].includes(command)){
   const body=v['input-file']?file():undefined
   const effect=():Effect.Effect<unknown,MadeWellError,Store>=>command==='promote'?promote(id(),args.slice(1).map(Number)):command==='drop'?drop(id()):command==='retry'?retry(id()):go(id())
   const selected=command==='promote'?args.slice(1).map(Number):[],target=selected.length===1?selected[0]!:id(),input=command==='promote'?{...body,candidates:selected}:body
   if(body?.requestId) return store.request(body.requestId,command,target,input,()=>{if(body.revision!==revisionOf(store.get(target))) throw new MadeWellError({code:'revision_conflict',message:'Review current work before submitting a new request.',context:{id:id()},next:[]});return Effect.runSync(effect().pipe(Effect.provideService(Store,store)))})
   return yield* effect()
  }
  if(command==='export') {if(typeof v.out!=='string') return yield* usage('--out is required.');return yield* exportItem(store,id(),v.out)}
  if(command==='replay'){const out=resolve(typeof v.out==='string'?v.out:join(dirname(path),'replay.html'));writeFileSync(out,staticPage(store,nextFor));return {replay:out,next:[{run:`open ${quote(out)}`,why:'read the whole run: every item, its pipeline, calls and NQ exchanges'}]}}
  if(command==='ui') return yield* serve(path,nextFor,String(v.host??'127.0.0.1'),Number(v.port??4747))
  if(command==='watch') return yield* watch(path,nextFor,{tty:!!process.stdout.isTTY,since:0,once:v.once===true})
  if(command==='prune') return yield* Effect.gen(function*(){
			const at = Date.parse(String(v.before))
			if (!/^\d{4}-\d{2}-\d{2}/.test(String(v.before)) || Number.isNaN(at)) return yield* usage( `--before "${String(v.before)}" is not a date. Give an ISO date or time, such as 2026-09-30.`)
			// A cutoff in the future means everything finished so far, and nothing that finishes while prune works.
			const before = new Date(Math.min(at, yield* Clock.currentTimeMillis)).toISOString()
			const dryRun = v['dry-run'] === true
			if (!dryRun) {
				yield* Effect.acquireRelease(store.claimRunner(), () => Effect.sync(() => store.releaseRunner())).pipe(Effect.catchIf((e) => e.code === 'store_locked', (e) => {
					const context = e.context as typeof ERRORS.store_locked.context.Type
					return Effect.fail(new MadeWellError({
						code: 'store_locked', message: 'A live runner owns this Made Well store, so prune waits for it.', context,
						cause: 'Prune holds the runner claim while it works: giving space back locks the whole store, and a working runner must never wait on that.',
						next: [
							{ run: `mw prune --before ${before}`, why: 'once that runner has returned: `mw run` returns when every item has shipped or holds' },
							{ run: `mw prune --before ${before} --dry-run`, why: 'see now what it will remove; a dry run changes nothing and needs no claim' },
							{ run: `kill ${context.owner.pid} && mw prune --before ${before}`, why: 'only for a runner that never returns (`mw run --watch`); start it again afterwards, and its work resumes where it stopped' },
						],
					}))
				}))
			}
			const { ids, kept } = retention(store, before)
			// Files first, rows last: a prune stopped halfway selects the same items again and finishes.
			const home = dirname(path)
			const files = [...ids.flatMap((id) => [join(home, 'exports', String(id)), itemHome(path, id)]), ...(ids.length ? [join(home, 'replay.html')] : [])].filter(existsSync)
			const storeBytes = () => sizeOf(path) + sizeOf(`${path}-wal`)
			const start = storeBytes() + files.reduce((n, f) => n + sizeOf(f), 0)
			const { items: _, ...records } = yield* Effect.try({ try: () => store.prune(ids, before, dryRun, () => {
				for (const f of files) rmSync(f, { recursive: true, force: true })
				if (existsSync(join(home, 'exports')) && !readdirSync(join(home, 'exports')).length) rmSync(join(home, 'exports'), { recursive: true })
			}), catch: qaStorageError })
			const what = `${ids.length} finished item(s) with ${records.events} events and ${records.calls} calls, and ${files.length} file(s)`
			const qaKept = kept.filter((item) => item.why === 'retained by manual QA history').length
			const also = kept.length ? `; ${kept.length} older finished item(s) stay (${qaKept} retained by manual QA history; ${kept.length - qaKept} needed by work in flight)` : ''
			return {
				before, dryRun, summary: `${dryRun ? 'Would remove' : 'Removed'} ${what}${also}.`, items: ids, records, files, kept,
				freed: dryRun ? null : start - storeBytes(),
				next: dryRun && ids.length + records.events ? [{ run: `mw prune --before ${before}`, why: 'remove them; nothing still moving or waiting on the operator is touched' }] : [],
			}
  }).pipe(Effect.scoped)
  if(command==='eval'){const prescriptionsPath=process.env.MW_PRESCRIPTIONS??new URL('../prescriptions.json',import.meta.url).pathname,prescriptions=yield* loadPrescriptions(prescriptionsPath);return yield* evaluate({job:String(args[0]),prescriptions,prescriptionsPath,card:typeof v.card==='string'?v.card:undefined,brief:typeof v.brief==='string'?v.brief:undefined,item:typeof v.item==='string'?v.item:undefined,limit:typeof v.limit==='string'?Number(v.limit):undefined}).pipe(Effect.provide(process.env.MW_WORKER_COMMAND?commandWorker(process.env.MW_WORKER_COMMAND):harnessWorker))}
  if(command==='qa-cases') return yield* qaCases()
  if(command==='qa-case') return yield* qaCase(id())
  if(command==='qa-runs') return yield* qaRuns()
  if(command==='qa-run') return yield* qaRun(id())
  if(command==='qa-observations') return yield* qaObservations(id())
  if(command==='qa-export') return yield* qaExport(id(),{...(v.selection!==undefined?{selection:v.selection as 'all'|'follow-ups'}:{}),...(v.format!==undefined?{format:v.format as 'json'|'markdown'}:{})})
  if(command==='qa-case-create') return yield* qaCreateCase(file())
  if(command==='qa-case-revise') return yield* qaReviseCase(id(),file())
  if(command==='qa-run-start') return yield* qaStartRun(file())
  if(command==='qa-observe') return yield* qaObserve(id(),Number(args[1]),file())
  if(command==='qa-verdict') return yield* qaVerdict(id(),Number(args[1]),file())
  if(command==='qa-link') return yield* qaLink(id(),Number(args[1]),file())
  return yield* usage('Unknown command.')
 })
 return yield* program.pipe(Effect.provide(missing?storeLayer(':memory:'):read?readOnlyStoreLayer(path):storeLayer(path)))
})
export const serveForeground=(prescriptions:import('./cards.ts').Prescriptions,host:string,port:number)=>Effect.scoped(Effect.gen(function*(){
 const store=yield* Store,selected=new Set<number>()
 yield* Effect.forkScoped(runQueue({prescriptions},{watch:true,roots:()=>[...selected]}))
 return yield* serve(store.path,nextFor,host,port,undefined,async(_store,id)=>{selected.add(id)})
}))
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const signalled=Effect.callback<{out:unknown;code:number}>(resume=>{
  const on=(signal:NodeJS.Signals)=>resume(Effect.succeed({out:{interrupted:signal,next:[{run:'mw run',why:'the interrupted work resumes where it stopped'}]},code:128+osConstants.signals[signal]}))
  process.once('SIGINT',on).once('SIGTERM',on)
  return Effect.sync(()=>{process.off('SIGINT',on).off('SIGTERM',on)})
 })
 const exit=await Effect.runPromise(Effect.raceFirst(main.pipe(Effect.catchDefect(e=>Effect.fail(e instanceof MadeWellError?e:usage(String(e)))),Effect.match({onSuccess:out=>({out,code:0}),onFailure:e=>({out:errorJson(e),code:1})})),signalled))
 const text=JSON.stringify(exit.out)+'\n'
 if(exit.code) process.stderr.write(text)
 else process.stdout.write(text)
 process.exitCode=exit.code
}
