// Shared deterministic preparation for scripted workers and trusted CLI command fixtures.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface PreparationPacket {
	item: { objective: string; source: string }
	organs?: { rules: { id: string; kind: string; text: string }[]; nextJobs: string[] }
}

export function preparedOutput(packet: PreparationPacket, job: string, output: Record<string, unknown>, files: string[] = []): Record<string, unknown> {
	// Legacy packets remain explicit: only newly pinned work supplies this contract.
	if (!packet.organs) return output
	return { ...output, organPreparation: {
		ground: { intent: packet.item.objective, sources: [
			{ ref: 'source', finding: `The fixture received this raw request: ${packet.item.source}` },
			...files.map(path => ({ ref: `file:${path}`, finding: `The fixture inspected ${path}: ${readFileSync(path, 'utf8')}` })),
		] },
		rumen: packet.organs.rules.map(rule => ({ rule: rule.id, disposition: 'addressed', evidence: rule.kind === 'fence'
			? 'Carry this fence to engine-owned verification; the fixture does not claim a gate pass.'
			: `Carry the supplied rule through this phase: ${rule.text}` })),
		next: packet.organs.nextJobs.map(consumer => ({ job: consumer, brief: `${job} prepared ${consumer} to use its recorded result for ${packet.item.objective}.`, requires: [`output:${job}`] })),
	} }
}

// Trusted function commands receive the same packet on stdin, without a worker-result wrapper.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const packet = JSON.parse(readFileSync(0, 'utf8')) as PreparationPacket
	process.stdout.write(JSON.stringify(preparedOutput(packet, process.argv[2]!, JSON.parse(process.argv[3]!))))
}

// Existing regression fixture: plain directories, one Store and a scripted Worker.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Effect, Layer } from 'effect'
import { Store, openStore } from '../../src/store.ts'
import { Worker, type WorkerRequest } from '../../src/worker.ts'
import { createLedgerWork } from '../../src/ledger.ts'
import type { Pack } from '../../src/lane.ts'
import type { Prescriptions } from '../../src/cards.ts'
export const regressionPrescriptions:Prescriptions={tiers:{deep:[{harness:'codex',provider:'fixture',account:'fixture',model:'scripted',effort:'low'}]},jobs:{},parallel:1}
export const resultPack=(names=['produce','accept']):Pack=>({name:'structured-regression',version:'2',runtime:'functions',contracts:{execution:'2'},discovery:[],delivery:[{cartridge:'work',steps:names.map((job,index)=>({job,profile:index?'test architect':'implementer',duty:index?'Independently compare the result with recorded conditions.':'Produce only the declared structured result.',output:index?{type:'object',required:['acceptance'],properties:{acceptance:{type:'object'}}}:{type:'object',required:['result'],properties:{result:{type:'string'}}},receives:index?[names[0]!]:[],replay:'safe',writes:[]}))}],...(names.length>1?{completion:{resultJob:names[0]!,acceptanceJob:names[1]!}}:{})})
export function regressionFixture(script?:(request:WorkerRequest)=>Record<string,unknown>){
 const root=mkdtempSync(join(tmpdir(),'mw-ledger-regression-')),path=join(root,'record.db');let store=openStore(path)
 const requests:WorkerRequest[]=[]
 const worker=Layer.succeed(Worker,{run:(request)=>Effect.sync(()=>{
  requests.push(request);const packet=JSON.parse(request.prompt)
  const value=request.kind==='intake'?{understanding:'The fixed function is clear.',unclear:[],ambiguous:[],missing:[],notes:[]}:request.kind==='originator'?{answer:'Use the declared result.',needsOperator:false}:script?.(request)??(request.job==='accept'?{acceptance:{verdict:'passed',conditionHash:packet.item.conditionHash,evidence:packet.item.conditions.map((c:{id:string})=>({conditionId:c.id,detail:'Compared the received result.',refs:['output:produce']}))}}:{result:'Prepared result'})
  return {ok:true as const,output:JSON.stringify(request.kind==='execute'?preparedOutput(packet,request.job,value):value)}
 })})
 const run=<A,E>(effect:Effect.Effect<A,E,Store|Worker>)=>Effect.runPromise(effect.pipe(Effect.provide(Layer.mergeAll(Layer.succeed(Store,store),worker))))
 return {root,path,requests,run,get store(){return store},create:(pack?:Pack)=>run(createLedgerWork({title:'Fixture work',objective:'Produce the recorded result.',source:'Exact source\r\n  😀  ',...(pack?{settings:{deliveryPack:pack,autonomy:'full',alert:{run:'true',cwd:root}}}:{})})),reopen:()=>{store.close();store=openStore(path)},close:()=>{store.close();rmSync(root,{recursive:true,force:true})}}
}
