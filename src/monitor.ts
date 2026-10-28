// A plain-language work view, with the complete durable trace one disclosure away.
// Both operator notebooks use these actual styles, including their font-derived tokens.
export const NOTEBOOK_STYLE = String.raw`
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:100 700;font-display:swap;src:url('/fonts/ibm-plex-sans-latin.woff2') format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/ibm-plex-mono-latin.woff2') format('woff2')}
:root{
 color-scheme:light;
 --font-text:'IBM Plex Sans',system-ui,sans-serif;
 --font-system:'IBM Plex Mono',ui-monospace,monospace;
 --text-body:1rem;--text-small:.875rem;--text-code:.8125rem;--text-section:1.25rem;--text-title:2rem;
 --line:1.5rem;--unit:calc(var(--line)/4);
 --space-1:var(--unit);--space-2:calc(var(--unit)*2);--space-3:calc(var(--unit)*3);
 --space-4:var(--line);--space-6:calc(var(--line)*1.5);--space-8:calc(var(--line)*2);--space-12:calc(var(--line)*3);
 --paper:#fff;--side:#f5f7f6;--ink:#26332e;--muted:#59665f;--line-color:#d9e1dc;
 --accent:#225e48;--selected:#e4eee8;--hover:#edf2ee;--warning:#81500d;--warning-bg:#fbf2e1;
 --error:#963d30;--error-bg:#fbefed;--radius:var(--space-1);
 font:var(--text-body)/var(--line) var(--font-text);color:var(--ink);background:var(--paper);
}
*{box-sizing:border-box}body{margin:0}button,a,summary{-webkit-tap-highlight-color:transparent}
::selection{background:#cce1d3;color:var(--ink)}a{color:var(--accent);text-underline-offset:.2em}
button:focus-visible,summary:focus-visible,a:focus-visible,pre:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.skip{position:fixed;top:var(--space-2);left:var(--space-2);transform:translateY(-200%);z-index:3;background:var(--paper);padding:var(--space-2)}.skip:focus{transform:none}
.app-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;padding:var(--space-4) var(--space-8);border-bottom:1px solid var(--line-color);background:var(--paper)}
h1{font-size:var(--text-section);line-height:var(--line);font-weight:600;margin:0}.app-title{color:var(--muted)}
#connection{margin-left:auto;font:var(--text-small)/var(--line) var(--font-system);color:var(--muted);max-width:56ch}
#connection.error{color:var(--error)}
.workspace{display:grid;grid-template-columns:19.5rem minmax(0,1fr);min-height:calc(100vh - var(--space-12))}
.work-list{padding:var(--space-6) var(--space-4);background:var(--side);border-right:1px solid var(--line-color)}
.work-list h2{font-size:var(--text-body);line-height:var(--line);margin:0 var(--space-2) var(--space-1);font-weight:600}
#list-summary{margin:0 var(--space-2) var(--space-4);font-size:var(--text-small);color:var(--muted)}
nav button{width:100%;display:block;text-align:left;color:inherit;font:inherit;border:1px solid transparent;border-radius:var(--radius);background:transparent;padding:var(--space-2);margin-bottom:var(--space-1);cursor:pointer;transition:background-color 160ms ease-out,border-color 160ms ease-out}
nav button:hover{background:var(--hover)}nav button:active{background:var(--selected)}nav button[aria-current=true]{background:var(--selected);border-color:#b5cec0}
.task-name{display:block;font-weight:500;overflow-wrap:anywhere}.task-state{display:block;font:var(--text-small)/var(--line) var(--font-system);color:var(--muted);margin-top:var(--space-1)}
article{padding:var(--space-8);min-width:0;max-width:66rem;scroll-margin-top:var(--space-12)}
h2{font-size:var(--text-title);line-height:calc(var(--line)*1.5);font-weight:500;letter-spacing:-.02em;margin:0 0 var(--space-3);text-wrap:balance;overflow-wrap:anywhere}
h3{font-size:var(--text-section);line-height:var(--line);font-weight:500;margin:var(--space-6) 0 var(--space-3)}
p{margin:0 0 var(--space-2);max-width:68ch;text-wrap:pretty;overflow-wrap:anywhere}.muted{color:var(--muted)}
.system{font:var(--text-small)/var(--line) var(--font-system);font-weight:400;color:var(--muted);font-variant-numeric:tabular-nums}
.status{display:inline-block;margin:0 0 var(--space-4);font:var(--text-small)/var(--line) var(--font-system);color:var(--accent)}
.status.attention{color:var(--warning)}.status.quiet{color:var(--muted)}
.notice{margin:var(--space-4) 0;padding:var(--space-3) var(--space-4);background:var(--warning-bg);color:var(--warning);border-radius:var(--radius)}
.notice p:last-child{margin-bottom:0}.notice .system{color:inherit}.notice h3{font:500 var(--text-body)/var(--line) var(--font-text);margin:0 0 var(--space-1)}
.steps{list-style:none;margin:0;padding:0}.steps .steps{margin-left:var(--space-4)}
.step{display:flex;align-items:baseline;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--line-color)}
.step-name{overflow-wrap:anywhere;min-width:0}.step-state{margin-left:auto;text-align:right;flex-shrink:0;font:var(--text-small)/var(--line) var(--font-system);color:var(--muted)}
.step-state.done{color:var(--accent)}.step-state.attention{color:var(--warning)}
.technical{margin-top:var(--space-8);border-top:1px solid var(--line-color)}
details{border-bottom:1px solid var(--line-color)}summary{padding:var(--space-3) var(--space-1);cursor:pointer;overflow-wrap:anywhere;transition:background-color 160ms ease-out}
summary:hover{background:var(--side)}summary:active{background:var(--hover)}summary::marker{color:var(--muted)}
summary .hint{display:block;margin-left:var(--space-3);font:var(--text-small)/var(--line) var(--font-text);color:var(--muted)}
.technical>summary{font-weight:500}.disclosure-body{padding:0 var(--space-1) var(--space-4);min-width:0}
.disclosure-body h3{font-size:var(--text-body);margin:var(--space-4) 0 var(--space-2)}
pre{margin:0 0 var(--space-3);padding:var(--space-3);white-space:pre-wrap;overflow-wrap:anywhere;max-height:24rem;overflow:auto;background:var(--side);font:var(--text-code)/calc(var(--unit)*3) var(--font-system);font-variant-numeric:tabular-nums;tab-size:2}
pre.error{color:var(--error);background:var(--error-bg)}
.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-3) var(--space-4);margin:var(--space-3) 0 var(--space-4)}
.metrics dt{color:var(--muted);font-size:var(--text-small)}.metrics dd{margin:0;font:var(--text-body)/var(--line) var(--font-system)}
.empty{padding-top:var(--space-8)}.empty h2{max-width:24ch}.read-note{margin:var(--space-6) 0 0;font-size:var(--text-small);color:var(--muted)}
.action{font:inherit;color:var(--accent);background:var(--paper);border:1px solid var(--accent);border-radius:var(--radius);padding:var(--space-1) var(--space-3);cursor:pointer;transition:background-color 160ms ease-out}
.action:hover{background:var(--hover)}.action:active{background:var(--selected)}.action:disabled{color:var(--muted);border-color:var(--line-color);background:var(--side);cursor:not-allowed}
.action.primary{color:var(--paper);background:var(--accent)}.action.primary:hover{background:#194b39}.action.primary:disabled{color:var(--muted);background:var(--side)}
.conversation,.composer{max-width:68ch}.conversation{margin-top:var(--space-8)}.messages{list-style:none;padding:0;margin:0}.message{padding:var(--space-3) 0;border-bottom:1px solid var(--line-color)}
.message p,.returned-text{white-space:pre-wrap;overflow-wrap:anywhere}.message .system{margin-bottom:var(--space-1)}.message details{border:0}.message summary{padding-left:0}
.field{display:block;margin:var(--space-3) 0}.field label{display:block;font-weight:500;margin-bottom:var(--space-1)}
input,textarea,select{width:100%;min-width:0;font:inherit;color:var(--ink);background:var(--paper);border:1px solid #8a9a91;border-radius:var(--radius);padding:var(--space-2);caret-color:var(--accent)}
textarea{min-height:9rem;resize:vertical}input:read-only,textarea:read-only,select:disabled{background:var(--side)}
.actions{display:flex;flex-wrap:wrap;gap:var(--space-2);margin:var(--space-3) 0}.feedback{margin:var(--space-3) 0}.feedback.error{color:var(--error)}.feedback.success{color:var(--accent)}
.draft-note{font-size:var(--text-small);color:var(--muted)}[hidden]{display:none!important}
@media(max-width:48rem){
 .app-header{padding:var(--space-3) var(--space-4);gap:var(--space-2) var(--space-3)}#connection{margin-left:0;width:100%}
 .workspace{display:block}.work-list{padding:var(--space-4);border-right:0;border-bottom:1px solid var(--line-color)}
 nav{max-height:12rem;overflow:auto;scroll-padding:var(--space-2)}article{padding:var(--space-6) var(--space-4)}
 h2{font-size:1.5rem;line-height:calc(var(--line)*1.25)}.step{flex-wrap:wrap;gap:0 var(--space-2)}
 .step-state{flex-shrink:1}.steps .steps{margin-left:var(--space-2)}.technical{margin-top:var(--space-6)}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
`

export const MONITOR = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Made Well · Your work</title>
<link rel="preload" href="/fonts/ibm-plex-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>${NOTEBOOK_STYLE}</style></head><body>
<a class="skip" href="#detail">Skip to task</a>
<header class="app-header"><h1>Made Well</h1><a href="/" aria-current="page">Work</a><a href="/qa">Manual QA</a><button class="action" id="new-work" type="button">New work</button><span id="connection" role="status">Connecting to your work…</span></header>
<div class="workspace"><aside class="work-list"><h2>Your tasks</h2><p id="list-summary">Loading…</p><nav aria-label="Your tasks" id="runs"></nav></aside><main><article id="detail" tabindex="-1"><p class="system">Loading your work…</p></article></main></div>
<script>
const list=document.querySelector('#runs'),detail=document.querySelector('#detail'),connection=document.querySelector('#connection'),listSummary=document.querySelector('#list-summary');
let selected=Number(location.hash.slice(1))||null,composing=location.hash==='#new',fetching=false,listKey='',renderKey='';
let newWorkView=null;
const drafts=new Map(),conversations=new Map();
const expanded=new Set();
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const json=x=>JSON.stringify(x,null,2);
const duration=ms=>ms<1000?Math.round(ms)+' ms':ms<60000?(ms/1000).toFixed(1)+' s':(ms/60000).toFixed(1)+' min';
const time=at=>new Date(at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const labels={candidate:'Ready to review',queued:'Not started',running:'In progress',held:'Needs attention',paused:'Ready to continue',completed:'Completed',shipped:'Delivered',discovered:'Tasks ready',dropped:'Stopped','waiting-quota':'Waiting for capacity','waiting-prerequisite':'Waiting for another task'};
const friendly=job=>({ideate:'Shape the idea',challenge:'Review the idea',plan:'Plan the work',implement:'Do the work','test-plan':'Prepare the checks',verify:'Check the result',verification:'Check the result',discover:'Find the tasks',arbitrate:'Review the problem',ship:'Deliver the work'}[job]??job.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase()));
async function get(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('Could not load saved work (HTTP '+r.status+'). Try again.');return r.json()}
function draftFor(key){
 if(drafts.has(key))return drafts.get(key);
 let d={fields:{},phase:'draft'},storageError='';
 try{const saved=localStorage.getItem('mw:operator-draft:v1:'+key);if(saved)d=JSON.parse(saved)}catch{storageError='Draft storage is unavailable. Keep this page open and copy your text before leaving. Sending is disabled until the draft can be saved.'}
 if(d.phase==='sending')d.phase='uncertain';d.storageError=storageError;drafts.set(key,d);return d;
}
function saveDraft(key,d){
 try{localStorage.setItem('mw:operator-draft:v1:'+key,JSON.stringify({...d,storageError:''}));d.storageError='';return true}
 catch{d.storageError='Could not save your draft in this browser. Copy your text before leaving. Free browser storage and try again; nothing new will be sent without a saved request ID.';return false}
}
function action(text,run,primary=false){const b=el('button',text,'action'+(primary?' primary':''));b.type='button';b.onclick=run;return b}
function message(parent,m,key){
 const li=el('li',undefined,'message');li.append(el('p',(m.kind==='source'?'Original request':m.kind==='question'?'Question':'Answer')+' · '+m.role+(m.at?' · '+time(m.at):''),'system'));
 const long=m.text.length>600||m.truncated;
 li.append(el('p',long?m.text.slice(0,600)+'…':m.text));
 if(long)disclosure(li,'message:'+key+':'+m.id,'Read full message',async b=>{
  if(!m.truncated){b.append(el('p',m.text));return}
  const load=async()=>{b.replaceChildren(el('p','Loading the saved message…','system'));try{
   const page=await get('/api/v1/items/'+key+'/conversation'+(m.kind==='source'?'':'?after='+Math.max(0,m.event-1)));
   const full=page.messages.find(x=>x.id===m.id);if(!full)throw new Error('The saved message is no longer available.');b.replaceChildren(el('p',full.text));
  }catch(e){b.replaceChildren(el('p',e.message,'feedback error'),action('Try again',load))}};await load();
 });parent.append(li);
}
// A pending request is immutable until acceptance or a definite rejection is known.
// Drafts are local only; all accepted messages and work state belong to the API.
function composer(key,isNew=false){
 const d=draftFor(key),root=el('section',undefined,'composer'),form=el('form'),policy=el('p',undefined,'muted'),feedback=el('div',undefined,'feedback'),storage=el('p',undefined,'feedback error');
 let context=null,projects=[],feedbackKey='';const controls={};
 feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');storage.setAttribute('role','alert');
 const field=(name,label,tag='textarea')=>{const box=el('div',undefined,'field'),l=el('label',label),input=el(tag);input.id='draft-'+key+'-'+name;l.htmlFor=input.id;input.name=name;input.value=d.fields[name]??'';controls[name]=input;
  input.addEventListener(tag==='select'?'change':'input',()=>{d.fields[name]=input.value;if(d.phase==='accepted'){d.phase='draft';d.notice=''}if(!isNew&&!d.revision&&context)d.revision=context.revision;saveDraft(key,d);update()});box.append(l,input);form.append(box);return input};
 if(isNew){field('workspace','Workspace','select').required=true;field('objective','Short objective','input').required=true;field('source','Describe the work').required=true}
 else{root.append(el('h3','Your reply'));field('text','Answer or direction for this task').required=true;field('cause','What caused the problem?','select')}
 const note=el('p','Drafts are saved in this browser on this device. Your exact text is sent only when you submit.','draft-note');
 const buttons=el('div',undefined,'actions'),send=action(isNew?'Submit work':'Send reply',()=>{},true),review=action('Review and edit draft',async()=>{
  if(!isNew&&!context)return;
  if(!isNew&&d.reviewRevision!==context.revision){review.disabled=true;try{const latest=await get('/api/v1/items/'+key);d.reviewRevision=latest.revision;conversation(Number(key),latest);d.notice='Read the latest conversation above, then confirm your review. Your draft has not changed.';saveDraft(key,d)}catch(e){d.problem={detail:e.message}}finally{review.disabled=false;update()}return}
  d.pending=null;d.phase='draft';d.problem=null;d.notice='Draft kept. Review your text, then send when ready.';d.revision=context?.revision;d.reviewRevision=undefined;saveDraft(key,d);update();(controls.text??controls.source).focus();
 });send.type='submit';
 buttons.append(send,review);form.append(note,buttons);root.append(policy,feedback,storage,form);
 function update(next){
  if(next)context=next;
  const pending=!!d.pending,busy=d.phase==='sending',stale=!isNew&&!!d.revision&&!!context&&d.revision!==context.revision;
  const allowed=isNew?projects.some(p=>p.workspace===controls.workspace.value):context?.answer.allowed===true;
  policy.textContent=isNew?'Choose a registered workspace. Its configured steps will handle the work.':context?.answer.reason??'Loading the task’s answer policy…';
  form.hidden=!isNew&&!allowed&&!pending;
  if(!isNew){
   const cause=controls.cause,causes=context?.answer.causes??[];
   if(json([...cause.options].map(o=>o.value))!==json(['',...causes])){cause.replaceChildren(new Option('Choose a cause',''),...causes.map(c=>new Option(friendly(c),c)));cause.value=d.fields.cause??''}
   cause.closest('.field').hidden=!context?.answer.causeRequired&&!d.pending?.body.cause;cause.required=!!context?.answer.causeRequired;
  }
  for(const input of Object.values(controls)){if(input.tagName==='SELECT')input.disabled=pending;else input.readOnly=pending}
  send.disabled=busy||d.phase==='rejected'||(!pending&&(!allowed||stale))||(!pending&&!isNew&&!context);
  send.textContent=busy?'Sending…':pending?'Retry same request':isNew?'Submit work':'Send reply';
  review.hidden=busy||!(d.phase==='rejected'||(!pending&&stale));
  review.textContent=isNew?'Review and edit draft':d.reviewRevision===context?.revision?'I reviewed the latest task · keep my draft':'Review latest task';
  storage.textContent=d.storageError??'';
  const state=json([d.phase,d.problem,d.notice,stale,allowed,d.fields.text,form.hidden]);
  if(state!==feedbackKey){feedbackKey=state;feedback.replaceChildren();feedback.className='feedback'+(d.problem?' error':d.phase==='accepted'?' success':'');
   if(busy)feedback.append(el('p','Sending your exact text. Please wait…','system'));
   else if(d.problem){feedback.append(el('p',d.problem.detail??'Your message could not be sent.'));disclosure(feedback,'problem:'+key,'Error details',b=>section(b,'Server response',d.problem,true))}
   else if(d.notice)feedback.append(el('p',d.notice));
   if(isNew&&d.phase==='accepted'&&d.receipt){const link=el('a','Open task #'+d.receipt.item);link.href='#'+d.receipt.item;feedback.append(link)}
   if(d.phase==='uncertain')feedback.append(el('p','Acceptance is not confirmed. Your text and request ID are saved. Retry the same request to check or finish it; do not submit it as new work.'));
   if(stale&&!pending)feedback.append(el('p','This task changed while your draft was open. Read the latest conversation, then confirm your review before sending.'));
   if(form.hidden&&d.fields.text)disclosure(feedback,'saved-draft:'+key,'Your saved reply draft',b=>b.append(el('p',d.fields.text,'returned-text')));
  }
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(d.phase==='sending'||d.phase==='rejected')return;
  if(!d.pending){
   if(!isNew&&(!context?.answer.allowed||(d.revision&&d.revision!==context.revision)))return;
   const fields=d.fields;
   const limits=isNew?{workspace:4096,objective:2000,source:32768}:{text:32768};
   for(const [name,max]of Object.entries(limits))if(!fields[name]?.trim()||Array.from(fields[name]).length>max){d.problem={detail:'Enter '+(name==='source'?'a description':name==='text'?'a reply':name)+' of no more than '+max.toLocaleString()+' characters. Your draft is kept.'};update();controls[name].focus();return}
   if(!isNew&&context.answer.causeRequired&&!context.answer.causes.includes(fields.cause)){d.problem={detail:'Choose the cause of this problem before sending.'};update();controls.cause.focus();return}
   const body=isNew?{requestId:crypto.randomUUID(),workspace:fields.workspace,objective:fields.objective,source:fields.source}:{requestId:crypto.randomUUID(),revision:d.revision??context.revision,text:fields.text,...(context.answer.causeRequired?{cause:fields.cause}:{})};
   if(new TextEncoder().encode(JSON.stringify(body)).length>65536){d.problem={detail:'This message is too large to send (64 KiB JSON limit). Shorten it; the draft is still here.'};update();return}
   d.pending={url:'/api/v1/items'+(isNew?'':'/'+key+'/answers'),body};
  }
  d.phase='sending';d.problem=null;d.notice='';if(!saveDraft(key,d)){d.phase='uncertain';update();return}update();
  try{
   const post=async()=>{const session=await get('/api/v1/session');const r=await fetch(d.pending.url,{method:'POST',headers:{'Content-Type':'application/json','X-MW-CSRF':session.csrfToken},body:JSON.stringify(d.pending.body),signal:AbortSignal.timeout(15000)});return {r,data:await r.json()}};
   let response=await post();if(response.r.status===403&&response.data.reason==='csrf_required')response=await post();
   const {r,data}=response;
   if(!r.ok){d.problem=data;d.phase=r.status>=500||r.status===408||r.status===403||data.reason==='request_id_conflict'?'uncertain':'rejected';if(data.task)context=data.task;saveDraft(key,d);update();return}
   if(data.accepted!==true||data.requestId!==d.pending.body.requestId)throw new Error('Acceptance could not be confirmed.');
   d.phase='accepted';d.notice='Accepted · '+(isNew?'Task #'+data.receipt.item+' was created.':'Your reply was saved.')+(data.warnings?.length?' '+data.warnings.join(' '):'');d.receipt=data.receipt;d.pending=null;d.fields={};d.revision=undefined;d.problem=null;
   for(const control of Object.values(controls))control.value='';saveDraft(key,d);if(data.context)context=data.context;update();
   if(isNew){const reply=draftFor(String(data.receipt.item));reply.notice=d.notice;reply.phase='accepted';saveDraft(String(data.receipt.item),reply);if(composing)location.hash=String(data.receipt.item)}
   renderKey='';refresh();
  }catch(e){d.phase='uncertain';d.problem={detail:'Connection interrupted. '+e.message};saveDraft(key,d);update()}
 });
 const setProjects=values=>{projects=values;const input=controls.workspace;input.replaceChildren(new Option('Choose a workspace',''),...values.map(p=>new Option(p.workspace,p.workspace)));input.value=d.fields.workspace??'';
  if(!input.value&&values.length===1&&!d.fields.workspace){input.value=values[0].workspace;d.fields.workspace=input.value;saveDraft(key,d)}update()};
 update();return {root,update,setProjects};
}
function conversation(id,context){
 if(!conversations.has(id)){
  const root=el('section',undefined,'conversation'),messages=el('ol',undefined,'messages'),history=el('div'),reply=composer(String(id));root.append(el('h3','Conversation'),messages,history,reply.root);
  disclosure(history,'history:'+id,'Browse the full conversation',b=>{
   const items=el('ol',undefined,'messages'),status=el('p',undefined,'system');let after=null;
   const load=async()=>{more.disabled=true;status.textContent='Loading saved messages…';try{const page=await get('/api/v1/items/'+id+'/conversation'+(after===null?'':'?after='+after));for(const m of page.messages)message(items,m,id);after=page.nextAfter;more.hidden=!page.hasMore;status.textContent=page.hasMore?'More messages are available.':'You have reached the latest saved message.'}catch(e){status.textContent=e.message}finally{more.disabled=false}};
   const more=action('Load more messages',load);b.append(items,status,more);load();
  },'Original request and every recorded question and answer');
  conversations.set(id,{id,root,messages,reply,key:''});
 }
 const view=conversations.get(id),k=json([context.item.source,context.item.sourceTruncated,context.conversation,context.conversationTruncated]);
 if(view.key!==k){view.key=k;view.messages.replaceChildren();message(view.messages,{id:'source:'+id,kind:'source',role:'operator',text:context.item.source,truncated:context.item.sourceTruncated},id);for(const m of context.conversation)message(view.messages,m,id);
  if(context.conversationTruncated)view.messages.append(el('li','Showing recent messages. Open the full conversation for earlier evidence.','draft-note'))}
 view.reply.update(context);return view.root;
}
function showNewWork(){
 if(newWorkView?.root.isConnected)return;
 if(newWorkView){detail.className='';detail.replaceChildren(newWorkView.root);renderKey='';return}
 const root=el('section'),c=composer('new',true),status=el('p',undefined,'system');root.append(el('h2','New work'),el('p','Tell Made Well what you want done. The description becomes the original request, exactly as you write it.'),status,c.root);
 const load=async()=>{status.textContent='Loading registered workspaces…';retry.hidden=true;try{const data=await get('/api/v1/projects');c.setProjects(data.projects);status.textContent=data.projects.length?'':'No workspaces are registered yet. Ask your agent to register a workspace before submitting work.'}catch(e){status.textContent=e.message;retry.hidden=false}};
 const retry=action('Reload workspaces',load);root.append(retry);newWorkView={root};detail.className='';detail.replaceChildren(root);renderKey='';load();
}
function section(parent,title,value,error=false){const p=el('pre',typeof value==='string'?value:json(value),error?'error':undefined);p.tabIndex=0;p.setAttribute('aria-label',title);parent.append(el('h3',title),p)}
function disclosure(parent,key,title,fill,hint){
 const d=el('details'),s=el('summary',title),b=el('div',undefined,'disclosure-body');let filled=false;
 d.dataset.key=key;d.open=expanded.has(key);if(hint)s.append(el('span',hint,'hint'));d.append(s,b);
 const populate=()=>{if(!filled){fill(b);filled=true}};if(d.open)populate();
 d.addEventListener('toggle',()=>{if(!d.isConnected)return;if(d.open){expanded.add(key);populate()}else expanded.delete(key)});parent.append(d);return d;
}
function overview(v){
 const status=v.itemRecord.status;
 if(status==='completed')return {title:'Completed',text:v.proof.completion?.nodes===0?'No steps were set up, so no work was performed.':'The steps for this task are finished. Only the work listed below is included.',tone:v.proof.completion?.nodes===0?'quiet':''};
 if(status==='shipped')return {title:'Delivered',text:'The work was delivered. Its recorded checks and delivery details are available below.'};
 if(status==='discovered')return {title:'Tasks ready',text:'The input has been turned into tasks.',next:'Ask your agent to help you review the task list.'};
 if(status==='candidate')return {title:'Ready to review',text:'This task has not started.',next:'Tell your agent whether you want to go ahead.'};
 if(status==='paused')return {title:'Ready to continue',text:'Work has reached a review point. Your progress is saved.',next:'Review the conversation below for what comes next.',tone:'attention'};
 if(status==='held')return {title:'Needs attention',text:'A step could not continue. Your progress is saved.',next:'Review the conversation below for what needs attention.',tone:'attention'};
 if(status==='dropped')return {title:'Stopped',text:'This task was stopped. Its previous activity is still available below.',tone:'quiet'};
 if(v.state==='not-running')return {title:'Not running',text:'Made Well is not running this task right now. It is not complete.',next:'Ask your agent for the command to continue from the saved progress.',tone:'attention'};
 if(status==='waiting-quota')return {title:'Waiting for capacity',text:'The available accounts are busy or at their limits. Work resumes when capacity becomes available.',tone:'quiet'};
 if(status==='waiting-prerequisite')return {title:'Waiting for another task',text:'Another task needs to finish before this one can continue.',tone:'quiet'};
 if(v.state==='working')return {title:'In progress',text:'Made Well is working through the steps for this task.'};
 return {title:'Not started',text:'This task is waiting for its turn.',tone:'quiet'};
}
function render(v,context){
 const key=json([v,context]);if(key===renderKey)return;renderKey=key;
 const focused=document.activeElement,focus=focused?.closest('details')?.dataset.key,preFocus=focused?.tagName==='PRE'?focused.getAttribute('aria-label'):null;
 const scroll=new Map([...detail.querySelectorAll('details')].map(d=>[d.dataset.key,[...d.querySelectorAll('pre')].map(p=>[p.scrollTop,p.scrollLeft])]));
 const head=el('section'),tail=el('div'),view=overview(v);head.append(el('h2',v.title),el('p',view.title,'status '+(view.tone??'')));
 if(v.objective&&v.objective!==v.title)head.append(el('p',v.objective));
 head.append(el('p',view.text,'muted'));if(view.next)head.append(el('p',view.next));
 const returned=v.proof.completion?.output?.result;
 if(v.itemRecord.status==='completed'&&v.pack.runtime==='functions'&&typeof returned==='string'){head.append(el('h3','Result'));const result=el('div',undefined,'message');result.append(el('p',returned.length>1200?returned.slice(0,1200)+'…':returned,'returned-text'));if(returned.length>1200)disclosure(result,'result:'+v.item,'Read the full result',b=>b.append(el('p',returned,'returned-text')));head.append(result)}
 const active=v.invocations.filter(i=>i.status==='running'||i.status==='lost');
 if(!v.done&&active.length){
  const quiet=active.some(i=>i.signals.some(s=>['no-output','no-progress','repeated-output','repeated-operation'].includes(s.data.code)));
  const lost=active.some(i=>i.stale||i.status==='lost');
  if(quiet||lost){const notice=el('section',undefined,'notice');notice.append(el('h3',lost?'Updates may have stopped':'No recent progress confirmed'),el('p',lost?'The latest activity may be out of date. Ask your agent to check whether work is still running.':'This step is quiet or repeating activity. That alone does not mean it is stuck.'));head.append(notice)}
  const last=active.map(i=>i.heartbeat?.at??i.started).sort().at(-1);head.append(el('p','Last activity at '+time(last),'system'));
 }
 head.append(el('h3','Steps'));
 const nodes=el('ol',undefined,'steps');
 function node(n,parent){
  const li=el('li'),row=el('div',undefined,'step');
  const done=Object.hasOwn(v.itemRecord.outputs,n.job)||(v.pack.runtime!=='functions'&&n.job==='verify'&&v.proof.verification?.passed===true);
  const current=n.job===v.job||active.some(i=>i.job===n.job);
  const state=done?'Done':current?(v.hold?'Needs attention':v.state==='working'?'In progress':'Not started'):'Not started';
  row.append(el('span',friendly(n.job),'step-name'),el('span',state,'step-state '+(done?'done':current&&v.hold?'attention':'')));li.append(row);
  if(n.children?.length){const children=el('ol',undefined,'steps');for(const child of n.children)node(child,children);li.append(children)}parent.append(li);
 }
 for(const c of v.pack[v.itemRecord.flow?.loop??v.phase]??[])for(const n of c.steps??[])node(n,nodes);
 if(nodes.children.length)head.append(nodes);else head.append(el('p','No steps have been set up for this task.','muted'));
 const thread=conversation(v.item,context);
 const tech=disclosure(tail,'technical:'+v.item,'Activity & technical details',b=>{
  const m=el('dl',undefined,'metrics');for(const [name,value]of [['Calls recorded',v.metrics.invocations],['Failed calls',v.metrics.failed],['Total call time',duration(v.metrics.ms)],['Reported tokens',v.metrics.tokens===null?'Not reported':v.metrics.tokens.toLocaleString()]]){const pair=el('div');pair.append(el('dt',name),el('dd',String(value)));m.append(pair)}b.append(m);
  if(v.metrics.tokens!==null&&v.metrics.unreportedUsage)b.append(el('p','Token usage is missing for '+v.metrics.unreportedUsage+' calls; this is a partial total.','system'));
  b.append(el('p','Task #'+v.item+' · '+v.lane+(v.pack.version?' @ '+v.pack.version:''),'system'),el('p',v.runner?'Runner process '+v.runner.pid:'No runner process owns the work queue.','system'));
  if(v.hold)section(b,'Recorded reason',v.hold.message,true);
  if(v.next.length)section(b,'Commands for your agent',v.next);
  b.append(el('h3','Calls · newest first'));
  if(!v.invocations.length)b.append(el('p','No calls recorded yet.','muted'));
  for(const i of [...v.invocations].reverse())disclosure(b,'call:'+i.id,i.job+' / '+i.kind+' · '+i.status+' · '+duration(i.ms),body=>{
   body.append(el('p','Started '+i.started+(i.heartbeat?' · heartbeat '+i.heartbeat.at:''),'system'));
   if(i.error)section(body,'Error',i.error,true);
   if(i.signals.length)section(body,'Observed signals',i.signals.map(s=>({at:s.at,...s.data})));
   section(body,'Input / effective arguments',i.args);section(body,'Returned output',i.result??'No return recorded');
   section(body,'Logs / intermediate values',i.entries.filter(e=>['trace-output','trace-tool','trace-value'].includes(e.kind)).map(e=>({at:e.at,kind:e.kind,...e.data})));
   if(i.call)section(body,'Agent call / prompt / response',i.call);
  });
  disclosure(b,'pack:'+v.item,'Setup & changes',body=>{section(body,'Pinned configuration',v.pack);section(body,'Update history',v.updates)});
  disclosure(b,'events:'+v.item,'Full record & completion evidence',body=>{section(body,'Completion evidence',v.proof);section(body,'Events',v.events)});
  const link=el('a','Open the full technical console');link.href='/console';b.append(el('p'));b.lastElementChild.append(link);
 },'Calls, timing, inputs, outputs and logs');tech.className='technical';
 tail.append(el('p','New work and replies are your instructions to Made Well. Progress and conversation come from the saved work record.','read-note'));
 detail.className='';
 // Never detach the live composer during polling: selection, IME and focus stay native.
 if(thread.parentElement===detail){detail.firstElementChild.replaceWith(head);detail.lastElementChild.replaceWith(tail)}
 else detail.replaceChildren(head,thread,tail);
 for(const d of detail.querySelectorAll('details')){const saved=scroll.get(d.dataset.key);if(saved)[...d.querySelectorAll('pre')].forEach((p,i)=>{if(saved[i]){p.scrollTop=saved[i][0];p.scrollLeft=saved[i][1]}})}
 if(focused!==document.body&&focused?.isConnected)focused.focus({preventScroll:true});
 else if(focus){const d=[...detail.querySelectorAll('details')].find(d=>d.dataset.key===focus);const target=preFocus?[...d?.querySelectorAll('pre')??[]].find(p=>p.getAttribute('aria-label')===preFocus):d?.querySelector('summary');target?.focus({preventScroll:true})}
}
async function refresh(){if(fetching)return;fetching=true;try{
 const board=await get('/api/runs');
 if(!composing&&selected===null&&board.items.length)selected=(board.items.find(i=>i.status==='held'||i.status==='paused')??board.items[0]).id;
 const key=json([selected,composing,board.items]);if(key!==listKey){const focused=document.activeElement?.dataset.item;list.replaceChildren();listKey=key;
  const attention=board.items.filter(i=>i.status==='held'||i.status==='paused').length;listSummary.textContent=board.items.length+' '+(board.items.length===1?'task':'tasks')+(attention?' · '+attention+' '+(attention===1?'needs':'need')+' attention':'');
  for(const i of board.items){const b=el('button');b.dataset.item=String(i.id);b.setAttribute('aria-current',String(!composing&&selected===i.id));b.append(el('span',i.title,'task-name'),el('span',labels[i.status]??i.status,'task-state'));b.onclick=()=>{composing=false;selected=i.id;location.hash=String(i.id);refresh()};list.append(b);if(focused===String(i.id))b.focus({preventScroll:true})}
 }
 if(composing)showNewWork();
 else if(!board.items.length){detail.className='empty';detail.replaceChildren(el('h2','A place for your next task.'),el('p','Choose New work to describe what you want done. Follow its progress here, from the first step to the result.','muted'));renderKey=''}
 else if(!board.items.some(i=>i.id===selected)){detail.replaceChildren(el('h2','That task is not available.'),el('p','Choose another task from your list.'));renderKey=''}
 else{const id=selected;const [v,context]=await Promise.all([get('/api/trace/'+id+'?lens=ax'),get('/api/v1/items/'+id)]);if(selected===id&&!composing)render(v,context)}
 connection.textContent='Up to date · '+time(new Date());connection.className='';connection.removeAttribute('title');
 }catch(e){connection.textContent='Connection lost · Showing the last saved view';connection.className='error';connection.title=e.message}finally{fetching=false}}
document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();detail.focus();detail.scrollIntoView({block:'start'})});
document.querySelector('#new-work').addEventListener('click',()=>{composing=true;location.hash='new';showNewWork();detail.focus();detail.scrollIntoView({block:'start'});refresh()});
window.addEventListener('hashchange',()=>{composing=location.hash==='#new';selected=Number(location.hash.slice(1))||null;renderKey='';if(composing)showNewWork();refresh()});if(composing)showNewWork();refresh();setInterval(refresh,2000);
</script></body></html>`
