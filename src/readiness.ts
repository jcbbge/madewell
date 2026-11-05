// Shared execution readiness and its pure contract helpers.
import type { Item, Store } from './store.ts'
import type { Pack, Step } from './lane.ts'

/** Compile ordered leaves with explicit private parallel tracks and composition nodes. */
export function functionSteps(pack:Pack,loop:'discovery'|'delivery'):Step[] {
 const steps:Step[]=[],positions=new Map<string,number>()
 const visit=(node:Pack['delivery'][number]['steps'][number],cartridge:string,track='main',parent?:string,parallel=false)=>{
  const position=positions.get(track)??0
  if(node.children){
   if(node.mode==='parallel') node.children.forEach((child,i)=>visit(child,cartridge,`${node.job}#${i}`,node.job,true))
   else for(const child of node.children) visit(child,cartridge,track,node.job,parallel)
   steps.push({...node,cartridge,loop,profile:'made well',duty:'Compose accepted child outputs.',receives:node.children.map(c=>c.job),children:node.children.map(c=>c.job),track,position,...(parent?{parent}:{})})
   if(node.mode==='parallel') positions.set(track,position+1)
  }else{
   steps.push({...node,children:undefined,cartridge,loop,profile:node.profile??'made well',duty:node.duty??'',receives:node.receives??steps.filter(s=>s.track===track&&!s.children).slice(-1).map(s=>s.job),track,position,...(parent?{parent}:{})})
   positions.set(track,position+1)
  }
 }
 for(const c of pack[loop]) for(const n of c.steps) visit(n,c.cartridge)
 return steps
}
export function problemsOf(pack:Pack):string[]{
 const problems:string[]=[]
 if(pack.runtime!=='functions'||pack.contracts?.execution!=='2') return ['runtime functions and contracts.execution 2 are required; historical packs are read-only.']
 const seen=new Set<string>()
 for(const loop of ['discovery','delivery'] as const){
  const steps=functionSteps(pack,loop),earlier=new Set<string>()
  for(const step of steps){
   const at=`${loop}.${step.job}`
   if(!/^[a-z][a-z0-9-]*$/.test(step.job)||seen.has(step.job)) problems.push(`${at}: invalid or duplicate job identity.`)
   seen.add(step.job)
   if(step.children){
    if(!step.mode) problems.push(`${at}.mode: group requires sequence or parallel.`)
    if(step.run||step.profile!=='made well'||step.task) problems.push(`${at}: a group cannot execute.`)
    if(step.mode==='parallel'&&step.track!=='main') problems.push(`${at}: nested parallel is refused.`)
   }else{
    if(!!step.run===!!(step.profile!=='made well'&&step.duty)) problems.push(`${at}: exactly one trusted command or agent with profile and duty is required.`)
    if(step.output?.type!=='object') problems.push(`${at}.output: an object schema is required.`)
    if(!step.replay) problems.push(`${at}.replay: safe or explicit is required.`)
    if(!step.writes) problems.push(`${at}.writes: declare destination ids, including an empty array.`)
    if(step.writes?.length&&step.replay!=='explicit') problems.push(`${at}: writing leaves require replay explicit.`)
    const failure=step.onFailure??{target:'hold'}
    if(failure.target==='hold'){if(failure.maxCorrections!==undefined) problems.push(`${at}.onFailure.maxCorrections: forbidden for hold.`)}
    else{
     const target=steps.find(s=>s.job===failure.target)
     if(!target||target.children||target.track!==step.track||target.position!>step.position!) problems.push(`${at}.onFailure.target: must name a same-track leaf at or before this leaf.`)
     else{
      const jobs=rewindJobs(steps,target,step),explicit=steps.some(s=>s.replay==='explicit'&&jobs.has(s.job))
      if(explicit) problems.push(`${at}.onFailure.target: rewind range contains an explicit leaf.`)
     }
     if(!Number.isInteger(failure.maxCorrections)||failure.maxCorrections!<1||failure.maxCorrections!>3) problems.push(`${at}.onFailure.maxCorrections: must be 1-3.`)
    }
    for(const received of step.receives) if(!earlier.has(received)||(steps.find(s=>s.job===received)?.track!==step.track&&!(step.track!=='main'&&steps.find(s=>s.job===received)?.track==='main'&&steps.findIndex(s=>s.job===received)<steps.findIndex(s=>s.parent===step.parent)))) problems.push(`${at}.receives: ${received} is not an earlier output in this track.`)
   }
   earlier.add(step.job)
  }
 }
 if(pack.completion){const steps=functionSteps(pack,'delivery'),{resultJob,acceptanceJob}=pack.completion,r=steps.find(s=>s.job===resultJob),a=steps.find(s=>s.job===acceptanceJob);if(!r||!a||r.children||a.children||steps.indexOf(a)<=steps.indexOf(r)||!a.receives.includes(resultJob)) problems.push('completion: acceptance must be a later distinct leaf explicitly receiving the result.')}
 return problems
}
/** Nodes invalidated by a same-track correction, including compositions that consumed them. */
export function rewindJobs(steps:ReadonlyArray<Step>,target:Step,failing:Step):Set<string> {
 const jobs=new Set(steps.filter(s=>s.track===failing.track&&(!s.children||s.mode==='parallel')&&s.position!>=target.position!&&s.position!<=failing.position!).map(s=>s.job))
 let expanded=true
 while(expanded){expanded=false;for(const step of steps)if(step.parent&&jobs.has(step.parent)&&!jobs.has(step.job)){jobs.add(step.job);expanded=true}}
 let changed=true
 while(changed){changed=false;for(const step of steps) if(step.children?.some(j=>jobs.has(j))&&!jobs.has(step.job)){jobs.add(step.job);changed=true}}
 return jobs
}

export const isTerminal=(item:Item)=>['completed','dropped','discovered'].includes(item.status)
export const readiness = (store:Pick<Store['Service'],'get'>,item:Item,now=Date.now()) => {
 const waiting=(item.after??item.relationships?.after??[]).filter(id=>store.get(id)?.status!=='completed')
 const reasons=[...(isTerminal(item)?['terminal']:[]),...(['candidate','paused','held'].includes(item.status)?['not selected or held']:[]),...(item.execution?.mode!=='cartridge'?['external work']:[]),...(!item.pack||problemsOf(item.pack).length?['execution contract unavailable']:[]),...(item.hold?[item.hold.code]:[]),...(item.blockers?.filter(b=>!b.resolvedAt).map(b=>b.reason)??[]),...(waiting.length?['prerequisites incomplete']:[]),...(item.resetsAt&&item.resetsAt>now?['waiting for quota']:[])]
 return {ready:!reasons.length,reasons,waitingOn:waiting}
}
