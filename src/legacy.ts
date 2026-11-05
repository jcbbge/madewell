// Historical documents and registry bytes are evidence, never execution authority.
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import type { Item } from './store.ts'
import { defaultSettings } from './settings.ts'
export const legacyRegistryPath = (storePath:string) => join(dirname(storePath),'projects.json')
export const itemHome = (storePath:string,id:number) => join(dirname(storePath),'items',String(id))
export const patchPath = (home:string,name:string) => join(home,`${name}.patch`)
export const revisionOf = (item:unknown) => createHash('sha256').update((JSON.stringify(item)??'null')).digest('hex')
export const legacyDisposition = (raw: Record<string,unknown>) => raw.schemaVersion===2 ? 'current' : ['discovered','dropped'].includes(String(raw.status)) ? String(raw.status) : (['shipped','merged','completed'].includes(String(raw.status))||!!raw.merged) ? 'completed-legacy' : 'legacy_execution'
export function decodeLegacy(raw: Record<string,unknown>, at:string): Item {
 if(raw.schemaVersion===2) return raw as unknown as Item
 const disposition=legacyDisposition(raw), objective=String(raw.objective??''), conditionHash=revisionOf([{id:'A1',text:objective}])
 const successful=disposition==='completed-legacy'
 return {...raw,schemaVersion:2,kind:typeof raw.kind==='string'?raw.kind:undefined,relationships:{...(typeof raw.parent==='number'?{parent:raw.parent}:{}),...(typeof raw.discovery==='number'?{discovery:raw.discovery}:{}),after:raw.after??[]},
 settings:defaultSettings(), execution:{mode:'external',owner:'operator'}, conditions:[{id:'A1',text:objective}],conditionHash,
 progress:{remaining:successful?'None':objective,nextAction:successful?'Inspect recorded result':'Configure this historical work before continuing',owner:'operator'},blockers:[],
 status:successful?'completed':disposition==='legacy_execution'?'held':raw.status,
 ...(disposition==='legacy_execution'?{hold:{code:'legacy_execution',message:'Historical execution is inert. Configure work explicitly.',context:{originalStatus:raw.status}}}:{}),
 ...(successful?{completion:{kind:'legacy',result:raw.shipped??raw.completion??raw.verification??{historical:true},files:[],conditionHash,evidence:[],acceptedBy:{kind:'agent',label:'legacy migration'},at,coverage:'acceptance coverage unavailable'}}:{}),
 legacy:{original:raw,acceptanceCoverage:'unavailable',settings:'inert provenance',cleanup:'pending'},updated:at,
 } as unknown as Item
}
