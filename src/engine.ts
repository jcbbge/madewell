// The durable work runner. Cartridge names carry no control-flow authority.
import { Clock, Effect, Queue } from 'effect'
import { dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { resourceAdmission, type ResourceAdmission } from './resources.ts'
import { DEFAULT_PARALLEL, budgetFor, cardsFor, forLane, harnessOf, pickCard, prescriptionOf, type Card, type Prescriptions } from './cards.ts'
import { resolveDecision, RUBRIC, type DecisionProviders } from './decision.ts'
import { MadeWellError, type Next } from './errors.ts'
import { advanceFunctions, functionInput } from './functions.ts'
import { INTAKE, ORIGINATOR, decode, deliverableShape, laneOf, shapeOf, type Step } from './lane.ts'
import { Store, type Item } from './store.ts'
import { revisionOf } from './legacy.ts'
import { executionRefusal, isTerminal, ledgerError, readiness } from './ledger.ts'
import { assertWritable } from './migration.ts'
import { alertHolds } from './settings.ts'
import { answerHistory, questionKey } from './nq-obligations.ts'
import type { PacketAnswer } from './handoff-history.ts'
import { contextFactRecords, changeContextFact, contextFactsFor, decodeContextFactCommand } from './context-facts.ts'
import { organOutputShape } from './organs.ts'
import { observe } from './trace.ts'
import { killOrphans, Worker, type UsageLimit, type WorkerRequest } from './worker.ts'
export interface EngineConfig {readonly prescriptions:Prescriptions;readonly decisionProviders?:DecisionProviders;readonly pollMs?:number;readonly resourceAdmission?:(directory:string)=>ResourceAdmission;readonly reloading?:()=>boolean}
export type RunConfig=EngineConfig
export const BRIEF=`You are an agent in Made Well: capture input, generate tasks, complete tasks. Execute only your configured function. Ground findings, account for Rumen and prepare each next consumer. The durable work belongs to the ledger. Return only the requested JSON.\n${RUBRIC}`
const change=(store:Store['Service'],id:number,kind:string,data:Record<string,unknown>,fn:(i:Item)=>Item)=>store.transition(id,revisionOf(store.get(id)),kind,data,fn)
const found=(store:Store['Service'],id:number)=>{const item=store.get(id);if(!item) throw ledgerError('item_not_found',`No work item #${id}.`,{id});return item}
const hold=(store:Store['Service'],id:number,code:string,message:string,context:Record<string,unknown>={})=>change(store,id,'held',{code,message,context},i=>({...i,status:'held',hold:{code,message,context}}))
export const contextFact=Effect.fn('mw.contextFact')(function*(id:number,input:unknown){yield* assertWritable();const store=yield* Store;return changeContextFact(store,id,decodeContextFactCommand(input,id))})
export const contextFacts=Effect.fn('mw.contextFacts')(function*(id:number){const store=yield* Store;found(store,id);return contextFactRecords(store,id)})

const pick=Effect.fn('mw.pickCard')(function*(id:number,cards:ReadonlyArray<Card>){
 const store=yield* Store
 for(;;){const now=yield* Clock.currentTimeMillis,picked=pickCard(cards,store.exhausted(),now)
  if(picked.card) {
   if(store.get(id)?.status==='waiting-quota') change(store,id,'running',{},i=>({...i,status:'running',resetsAt:undefined}))
   return picked.card
  }
  change(store,id,'waiting-quota',{resetsAt:picked.resetsAt},i=>({...i,status:'waiting-quota',resetsAt:picked.resetsAt}))
  yield* Effect.sleep(Math.max(1,picked.resetsAt-now))
 }
})
const invoke=Effect.fn('mw.invoke')(function*(id:number,step:Step,cwd:string,kind:WorkerRequest['kind'],card:Card,config:EngineConfig,packet:Record<string,unknown>,replyFormat:Record<string,unknown>){
 const store=yield* Store,worker=yield* Worker,p=config.prescriptions
 const started=new Date(yield* Clock.currentTimeMillis).toISOString(),begin=yield* Clock.currentTimeMillis
 const prompt=JSON.stringify({...packet,you:{profile:kind==='originator'?'dispatcher':step.profile,job:step.job,call:kind,duty:step.duty,task:step.task,replyFormat}})
 const access=kind==='intake'?'none':kind==='originator'?'read':prescriptionOf(p,step.job)?.access??step.access??'none'
 const {result,invocation}=yield* observe(store,id,{job:step.job,kind,profile:step.profile,harness:card.harness,args:{packet:JSON.parse(prompt),cwd}},onOutput=>worker.run({invocation:store.get(id)?.flow?.pending?.invocation,item:id,job:step.job,kind,profile:step.profile,card,access,system:BRIEF,prompt,cwd,budget:budgetFor(p,step.job),harness:harnessOf(p,card.harness),onOutput}))
 const call=store.recordCall({item:id,job:step.job,kind,profile:step.profile,card,system:BRIEF,prompt,outcome:result.ok?'ok':'limit' in result?'limit':'error',output:result.ok?result.output:null,error:result.ok?null:'error' in result?result.error:result.limit.message,raw:result.raw??null,started,ms:(yield* Clock.currentTimeMillis)-begin})
 store.note(id,'trace-call',{invocation,job:step.job,kind,call})
 store.note(id,'call-finished',{invocation,job:step.job,kind,call,profile:step.profile,outcome:result.ok?'ok':'limit' in result?'limit':'error'})
 if(!result.ok) return yield* Effect.fail('limit' in result?result.limit:ledgerError('function_failed',result.error,{id,harness:true}))
 return result.output
})
const recordLimit=Effect.fn('mw.recordLimit')(function*(id:number,job:string,card:Card,limit:UsageLimit,kind:WorkerRequest['kind']){
 const store=yield* Store,at=yield* Clock.currentTimeMillis,resetsAt=Math.max(limit.resetsAt??at+3600000,at+300000)
 for(const account of new Set([limit.account,card.account])) store.markExhausted(account,resetsAt)
 change(store,id,'quota-swap',{kind,job,from:card,account:limit.account,resetsAt:new Date(resetsAt).toISOString(),message:limit.message},i=>i)
})
const agent= (config:EngineConfig) => Effect.fn('mw.executeAgent')(function*(item:Item,step:Step,cwd:string,input:ReturnType<typeof functionInput>){
 const store=yield* Store,p=yield* forLane(config.prescriptions,laneOf(item.pack)),effective={...config,prescriptions:p},id=item.id
 let errors=0
 for(;;){
  const current=found(store,id),card=yield* pick(id,cardsFor(p,step.job))
  let exchange=current.exchange
  if(!exchange||current.job!==step.job){exchange={from:current.from,handoff:`Complete ${step.job} from its declared input.`,status:'awaiting-receiver',turns:[],card};change(store,id,'nq-started',{job:step.job,track:step.track},i=>({...i,job:step.job,exchange}))}
  else if(exchange.card&&JSON.stringify(exchange.card)!==JSON.stringify(card)){exchange={...exchange,card};change(store,id,'card-swapped',{job:step.job},i=>({...i,exchange}))}
  const history=answerHistory(store,{...current,outputs:step.track==='main'?current.outputs:current.flow?.tracks?.[step.track!]?.outputs??{}},step.job)
  const packet={...input,contextFacts:contextFactsFor(store,current,step.job,yield* Clock.currentTimeMillis),answeredBefore:history.packetAnswers(),exchange,round:current.round}
  if(exchange!.status!=='clear'){
   const originator=exchange!.status==='awaiting-originator',kind=originator?'originator':'intake'
   const cheap=originator?card:pickCard(p.tiers.intake??[],store.exhausted(),yield* Clock.currentTimeMillis).card??card
   const result=yield* Effect.result(invoke(id,step,cwd,kind,cheap,effective,packet,shapeOf(originator?ORIGINATOR:INTAKE)))
   if(result._tag==='Failure'){
    if('account' in result.failure){yield* recordLimit(id,step.job,cheap,result.failure,kind);continue}
    if(++errors<3) continue
    hold(store,id,'worker_failing',result.failure.message,{job:step.job});return yield* result.failure
   }
   if(originator){
    const reply=decode(ORIGINATOR,result.success);if(!reply.ok){if(++errors<3) continue;return yield* ledgerError('function_failed',reply.reason,{id,harness:true})}
    if(reply.value.needsOperator){hold(store,id,'authority',reply.value.answer,{job:step.job,questions:exchange!.turns.at(-1)?.questions});return yield* ledgerError('function_failed','Operator input required.',{id,nq:true})}
    const turns=exchange!.turns.map((t,i)=>i===exchange!.turns.length-1?{...t,answer:reply.value.answer,by:'originator' as const}:t)
    change(store,id,'nq-answer',{job:step.job,originator:'dispatcher',questions:exchange!.turns.at(-1)?.questions,answer:reply.value.answer,reuse:reply.value.reuse??[]},i=>({...i,exchange:{...exchange!,status:'awaiting-receiver',turns}}));continue
   }
   const reply=decode(INTAKE,result.success);if(!reply.ok){if(++errors<3) continue;return yield* ledgerError('function_failed',reply.reason,{id,harness:true})}
   const {understanding,unclear,ambiguous,missing,notes,reuse=[]}=reply.value
   const known=new Map(history.answers.map(a=>[questionKey(a.question),a]))
   for(const r of reuse){const answer=history.packetAnswers().find((a:PacketAnswer)=>a.id===r.answerId||a.aliases?.some(alias=>alias.id===r.answerId));if(!answer) return yield* ledgerError('function_failed','Unknown saved answer reuse.',{id,harness:true});known.set(questionKey(r.question),answer)}
   const asking=[...new Set([...unclear,...ambiguous,...missing])],questions=asking.filter(q=>!known.has(questionKey(q)))
   const recalled=asking.filter(q=>known.has(questionKey(q))).map(question=>({question,answerId:known.get(questionKey(question))!.id}))
   if(recalled.length) store.note(id,'nq-reused',{job:step.job,reuse:recalled,questions:recalled.map(r=>r.question),answer:'Saved answer references'})
   if(!questions.length){change(store,id,'nq-clear',{job:step.job,understanding,card},i=>({...i,exchange:{...exchange!,status:'clear',understanding,notes,card}}));continue}
   if(exchange!.turns.filter(t=>t.answer!==undefined).length>=3){hold(store,id,'nq_turns','Three answered turns left questions open: repair the specification.',{job:step.job,questions});return yield* ledgerError('function_failed','NQ specification defect.',{id,nq:true})}
   const turns=[...exchange!.turns,{understanding,questions}]
   change(store,id,'nq-question',{job:step.job,receiver:step.profile,questions},i=>({...i,exchange:{...exchange!,status:'awaiting-originator',turns}}));continue
  }
  const guidance=yield* resolveDecision({item:{id,title:current.title,objective:current.objective,source:current.source},mode:'forward',job:step.job,stage:step.cartridge,profile:step.profile,question:'Settle choices owed by this fixed function.',context:{input},repoIntent:{purpose:'Capture input, generate tasks, complete tasks.'},rubric:RUBRIC,constraints:{scope:[],authority:step.duty,nonGoals:[],operatorEscalationPermitted:false}},p.decisionModel,config.decisionProviders)
  const result=yield* Effect.result(invoke(id,step,cwd,'execute',card,effective,{...packet,decisionResolution:guidance},organOutputShape(current,deliverableShape(laneOf(current.pack),step.job))!))
  if(result._tag==='Success') return result.success
  if('account' in result.failure){yield* recordLimit(id,step.job,card,result.failure,'execute');continue}
  if(++errors>=3){hold(store,id,'worker_failing',result.failure.message,{job:step.job});return yield* result.failure}
 }
})
export const drive=Effect.fn('mw.drive')(function*(id:number,config:EngineConfig){
 yield* assertWritable();const store=yield* Store
 for(;;){const item=found(store,id)
  if(!readiness(store,item,yield* Clock.currentTimeMillis).ready) return item
  const result=yield* Effect.result(advanceFunctions(id,agent(config)).pipe(Effect.catchDefect(e=>Effect.fail(e instanceof MadeWellError?e:ledgerError('function_failed',String(e),{id})))))
  if(result._tag==='Failure'){const current=found(store,id);if(!current.hold) hold(store,id,result.failure.code==='discovery_dependency_invalid'?'discovery_dependency_invalid':'worker_failing',result.failure.message,{error:result.failure});return found(store,id)}
  const next=found(store,id);if(next.status==='open'||next.hold||next.blockers.some(b=>!b.resolvedAt)||isTerminal(next)) return next
  if(item.autonomy==='steps'&&item.flow?.accepted.length!==next.flow?.accepted.length){hold(store,id,'checkpoint','A function finished. Continue when ready.',{job:next.job});return found(store,id)}
 }
})
export const stuck=(store:Store['Service'],item:Item)=>!readiness(store,item).ready
export function nextFor(item:Item):Next[]{
 if(item.schemaVersion!==2)return [{run:'mw migrate --preview',why:'historical work needs the supported cutover before changes'}]
 if(item.hold?.code==='execution_uncertain') return [{run:`mw resolve-execution ${item.id} --input-file <file>`,why:'explicitly authorize one replay or switch to external work'}]
 if(item.hold?.code==='legacy_execution') return [{run:`mw configure-work ${item.id} --input-file <file>`,why:'choose current work settings without adopting historical commands'}]
 if(item.status==='candidate') return [{run:`mw promote ${item.discovery} ${item.id}`,why:'select this task'}]
 if(item.status==='held'||item.status==='paused') return [{run:`mw answer ${item.id} --input-file <file>`,why:'answer the recorded question'},{run:`mw retry ${item.id}`,why:'resume after correcting the recorded failure'}]
 if(isTerminal(item)) return [{run:`mw context ${item.id}`,why:'inspect retained evidence'}]
 return ['progress','block',...(item.blockers?.some(b=>!b.resolvedAt)?['unblock']:[]),...(item.execution?.mode==='external'?['complete']:[])].map(op=>({run:`mw ${op} ${item.id} --input-file <file>`,why:`Record ${op} on this work`}))
}
export const answer=Effect.fn('mw.answer')(function*(id:number,text:string,_cause?:string){
 yield* assertWritable();const store=yield* Store,item=found(store,id)
 if(item.hold?.code==='execution_uncertain') return yield* executionRefusal({ ...item, hold: item.hold })
 if(item.hold?.code==='legacy_execution') return yield* ledgerError('not_answerable','Use the explicit resolution command.',{id,hold:item.hold})
 if(!item.hold) return yield* ledgerError('not_held','No held question.',{id,status:item.status,job:item.job})
 const turns=item.exchange?.turns.map((t,i)=>i===item.exchange!.turns.length-1?{...t,answer:text,by:'operator' as const}:t)
 return change(store,id,'nq-answer',{job:item.job,by:'operator',questions:item.exchange?.turns.at(-1)?.questions??[],answer:text},i=>({...i,status:'queued',hold:undefined,...(i.exchange?{exchange:{...i.exchange,status:'awaiting-receiver',turns:turns!}}:{}),steer:text}))
})
export const promote=Effect.fn('mw.promote')(function*(discovery:number,ids:ReadonlyArray<number>=[]){
 yield* assertWritable();const store=yield* Store,parent=found(store,discovery)
 if(parent.status!=='discovered') return yield* ledgerError('not_discovered','Discovery is not finished.',{id:discovery,status:parent.status,job:parent.job})
 const all=store.list().filter(i=>i.discovery===discovery&&i.status==='candidate'),chosen=ids.length?ids:all.map(i=>i.id),select=new Set(chosen)
 for(const id of chosen) if(!all.some(i=>i.id===id)) return yield* ledgerError('not_a_candidate','Unknown candidate.',{discovery,unknown:[id],candidates:all.map(i=>({id:i.id,title:i.title}))})
 const add=(id:number)=>{const item=found(store,id);for(const n of item.after??[]) if(!select.has(n)){select.add(n);add(n)}};for(const id of chosen) add(id)
 return store.atomic(()=>[...select].map(id=>change(store,id,'promoted',{discovery},i=>({...i,status:i.settings.deliveryPack?'queued':'open',pack:i.settings.deliveryPack??undefined,execution:{mode:i.settings.deliveryPack?'cartridge':'external',owner:i.execution.owner},progress:{...i.progress,nextAction:'Carry out the recorded work'}}))))
})
export const retry=Effect.fn('mw.retry')(function*(id:number,_options:{replan?:string}={}){
 yield* assertWritable();const store=yield* Store,item=found(store,id)
 if(item.hold?.code==='execution_uncertain') return yield* executionRefusal({ ...item, hold: item.hold })
 if(item.hold?.code==='legacy_execution') return yield* ledgerError('not_answerable','Use the explicit resolution command.',{id,hold:item.hold})
 if(!item.hold) return yield* ledgerError('not_held','No held work.',{id,status:item.status,job:item.job})
 return change(store,id,['function_failed','function_corrections_exhausted'].includes(item.hold.code)?'function-retry':'retried',{},i=>({...i,status:i.execution.mode==='external'?'open':'queued',hold:undefined,...(i.hold?.code==='checkpoint'?{passed:i.hold.context.boundary==='completion'?'completion':i.passed}:{}),launches:0,exchange:undefined}))
})
export const go=retry
export const drop=Effect.fn('mw.drop')(function*(id:number){yield* assertWritable();const store=yield* Store,item=found(store,id);if(isTerminal(item)) return yield* ledgerError('work_terminal','Terminal work cannot be dropped.',{id});return change(store,id,'dropped',{},i=>({...i,status:'dropped'}))})
export const runQueue = (config: EngineConfig, options: { watch?: boolean; keepClaim?: () => boolean; roots?: ReadonlyArray<number> | (() => ReadonlyArray<number>) } = {}) =>
	Effect.gen(function* () {
		yield* assertWritable()
		const store = yield* Store
		yield* store.claimRunner()
		yield* Effect.addFinalizer(() => Effect.sync(() => (options.keepClaim?.() ? undefined : store.releaseRunner())))
		yield* Effect.sync(killOrphans)
		const finished = yield* Queue.unbounded<Item>()
		const running = new Set<number>()
		const results: Item[] = []
		const parallel = config.prescriptions.parallel ?? DEFAULT_PARALLEL
		let lastResourceWait: string | undefined
		for (;;) {
			const reloading = config.reloading?.() ?? false
			yield* alertHolds()
			const items = store.list()
			const selected = options.roots === undefined ? undefined : new Set(typeof options.roots === 'function' ? options.roots() : options.roots)
			if (selected) {
				// Scope follows the work's own links; it neither promotes candidates nor selects unrelated queue entries.
				let expanded = true
				while (expanded) {
					const before = selected.size
					for (const item of items) {
						if (item.discovery !== undefined && selected.has(item.discovery) || item.parent !== undefined && selected.has(item.parent)) selected.add(item.id)
						if (selected.has(item.id)) {
							for (const dependency of item.after ?? []) selected.add(dependency)
							if (item.waitsOn !== undefined) selected.add(item.waitsOn)
						}
					}
					expanded = selected.size !== before
				}
			}
			let resourceWait = false
			let quotaWait = false
			for (const i of reloading ? [] : items) {
				if (typeof parallel === 'number' && running.size >= parallel) break
				if (selected && !selected.has(i.id)) continue
				if(i.status==='waiting-quota'&&i.resetsAt&&i.resetsAt>(yield* Clock.currentTimeMillis)) quotaWait=true
				if (!['queued','running','waiting-quota','waiting-prerequisite'].includes(i.status) || running.has(i.id) || !readiness(store,i,yield* Clock.currentTimeMillis).ready || readiness(store, i).waitingOn.length) continue
				if (parallel === 'resources') {
					const admission = (config.resourceAdmission ?? resourceAdmission)(store.path === ':memory:' ? tmpdir() : dirname(store.path))
					if (!admission.allowed) {
						const key = `${i.id}:${admission.reason}`
						if (key !== lastResourceWait) store.note(i.id, 'resource-wait', { ...admission })
						lastResourceWait = key
						resourceWait = true
						break
					}
					store.note(i.id, 'resource-admitted', { ...admission })
					lastResourceWait = undefined
				}
				running.add(i.id)
				yield* Effect.forkScoped(drive(i.id, config).pipe(
					Effect.catchTag('MadeWellError', () => Effect.sync(() => store.get(i.id)!)),
					Effect.flatMap((item) => Queue.offer(finished, item)),
				))
				// Yield so the newly started item can allocate before the next live sample.
				if (parallel === 'resources') break
			}
			if (!running.size) {
				store.runnerOn(null)
				if (reloading) return { items: results, reload: true }
				if (!options.watch && !resourceWait && !quotaWait) return { items: results, reload: false }
				yield* Effect.sleep(config.pollMs ?? 2000)
				continue
			}
			const done = options.watch || config.reloading || parallel === 'resources' ? yield* Effect.raceFirst(Queue.take(finished), Effect.as(Effect.sleep(config.pollMs ?? 2000), undefined)) : yield* Queue.take(finished)
			if (done) {
				running.delete(done.id)
				results.push(done)
			}
		}
	}).pipe(Effect.scoped)
