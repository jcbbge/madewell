// Trusted WorkerRequest → WorkerResult fixture. It needs only its packet and scratch.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { preparedOutput } from './prepared-output.ts'
const request=JSON.parse(readFileSync(0,'utf8')),packet=JSON.parse(request.prompt)
if(process.env.FAKE_LOG)appendFileSync(process.env.FAKE_LOG,`${request.kind} ${request.job} ${request.profile}\n`)
const [hangJob,marker]=(process.env.FAKE_HANG??'').split(':')
if(request.kind==='execute'&&request.job===hangJob&&marker&&!existsSync(marker)){writeFileSync(marker,'started');await new Promise(()=>{})}
const [pauseJob,pauseFile]=(process.env.FAKE_PAUSE??'').split(':')
if(request.kind==='execute'&&request.job===pauseJob&&pauseFile){writeFileSync(pauseFile+'.started','');while(existsSync(pauseFile))await new Promise(r=>setTimeout(r,20))}
const output=request.kind==='intake'?{understanding:'The declared function is clear.',unclear:[],ambiguous:[],missing:[],notes:[]}:request.kind==='originator'?{answer:'Follow the fixed brief.',needsOperator:false}:preparedOutput(packet,request.job,request.job==='accept'||request.job==='verification'?{acceptance:{verdict:'passed',conditionHash:packet.item.conditionHash,evidence:packet.item.conditions.map((c:{id:string})=>({conditionId:c.id,detail:'Compared the explicitly received result.',refs:['source']}))}}:{result:'Scripted structured result'})
process.stdout.write(JSON.stringify({ok:true,output:JSON.stringify(output),version:'scripted 2'}))
