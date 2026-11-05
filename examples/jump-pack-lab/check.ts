// Explicit trusted structured-result fixture. It never publishes or uses external services.
import { readFileSync } from 'node:fs'
import { preparedOutput } from '../../test/fixtures/prepared-output.ts'
const input=JSON.parse(readFileSync(0,'utf8')),job=process.argv[2]??'implementation'
const result=job==='implementation'?'A fictional 45-minute Calm Inbox workshop agenda; details remain a local structured result.':`Fixture ${job} result.`
const output=job==='verification'?{result:'Checked the declared structured result.',evidence:[],unknowns:[],acceptance:{verdict:typeof input.received.implementation?.result==='string'?'passed':'failed',conditionHash:input.item.conditionHash,evidence:input.item.conditions.map((c:{id:string})=>({conditionId:c.id,detail:'Compared the explicitly received structured result to the fixture condition.',refs:['output:implementation']}))}}:{result,evidence:[],unknowns:[]}
process.stdout.write(JSON.stringify(preparedOutput(input,job,output)))
