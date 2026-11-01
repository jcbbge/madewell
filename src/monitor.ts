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
[data-current-work]{min-width:0;overflow-wrap:anywhere}[data-current-work] p{white-space:pre-wrap}[data-current-work] section{margin-bottom:var(--space-3)}
.work-organs{min-width:0;margin:var(--space-4) 0;overflow-wrap:anywhere}.work-organs>h3{margin-top:var(--space-3)}
.organ-checks{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-4);margin:var(--space-2) 0}.organ-checks p{margin:0;font-size:var(--text-small)}
.organ-state{font:var(--text-small)/var(--line) var(--font-system);margin-left:var(--space-1);color:var(--muted)}.organ-state[data-state=yes]{color:var(--accent)}.organ-state[data-state=unknown]{color:var(--warning)}
.organ-phases{list-style:none;margin:0;padding:0}.organ-phases>li{padding:var(--space-3) 0;border-bottom:1px solid var(--line-color)}.organ-phases>li:last-child{border:0}.organ-phase-title{font:var(--text-small)/var(--line) var(--font-system);margin:0}.organ-phases details{margin-top:var(--space-1)}
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
.conversation,.composer{max-width:68ch}.conversation{margin-top:var(--space-8)}.messages{list-style:none;padding:0;margin:0}.message{white-space:pre-wrap;padding:var(--space-3) 0;border-bottom:1px solid var(--line-color)}
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

// Shared literal-DOM evidence controls; stable nodes keep native focus and disclosure state.
export const EVIDENCE_SCRIPT = String.raw`
const evidenceNode=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const evidenceText=(n,text)=>{text=String(text??'');if(n.textContent!==text){const top=n.scrollTop,left=n.scrollLeft;n.textContent=text;n.scrollTop=top;n.scrollLeft=left}};
function exactEvidence(parent,key,label,url){
 let d=[...parent.children].find(n=>n.dataset.evidenceKey===key);
 if(d){d._updateEvidence(label,url);return d}
 d=evidenceNode('details');d.dataset.evidenceKey=key;d.dataset.key=key;
 const summary=evidenceNode('summary',label),body=evidenceNode('div');d.append(summary,body);
 let loaded=false,generation=0;
 const retry=(text)=>{const button=evidenceNode('button',text);button.type='button';button.onclick=()=>{loaded=true;void load()};body.append(button)};
 const load=async()=>{const version=generation,target=d._evidenceUrl;body.replaceChildren(evidenceNode('p','Loading saved evidence…'));try{const response=await fetch(target,{cache:'no-store'});if(version!==generation)return;if(!response.ok)throw new Error('Evidence unavailable (HTTP '+response.status+').');const value=await response.json();if(version!==generation)return;body.replaceChildren();if(!value.available){body.append(evidenceNode('p','Saved evidence unavailable or changed.'));retry('Refresh evidence');return}const data=value.data;const pre=evidenceNode('pre',data.answer!==undefined?data.answer:JSON.stringify(data,null,2));pre.tabIndex=0;pre.setAttribute('aria-label',d._evidenceLabel);body.append(pre)}catch(e){if(version!==generation)return;body.replaceChildren(evidenceNode('p',e.message));retry('Try again')}};
 d._updateEvidence=(nextLabel,nextUrl)=>{const changed=d._evidenceUrl!==undefined&&d._evidenceUrl!==nextUrl;d._evidenceUrl=nextUrl;d._evidenceLabel=nextLabel;d.dataset.evidenceUrl=nextUrl;d.dataset.evidenceLabel=nextLabel;evidenceText(summary,nextLabel);if(changed){generation++;loaded=false;body.replaceChildren(evidenceNode('p','Saved evidence changed.'));retry('Refresh evidence')}};
 d._updateEvidence(label,url);d.addEventListener('toggle',()=>{if(d.open&&!loaded){loaded=true;void load()}});parent.append(d);return d;
}
function currentWork(parent,summary,item){
 let root=[...parent.children].find(n=>n.dataset.currentWork===String(item));if(!root){root=evidenceNode('section');root.dataset.currentWork=String(item);root.append(evidenceNode('h3','Current work'));parent.append(root)}
 const entries=summary?.entries??[],keep=new Set(entries.map(e=>e.key));
 for(const n of [...root.children])if(n.dataset.handoff&&!keep.has(n.dataset.handoff))n.remove();
 let empty=root.querySelector('[data-no-handoff]');if(!entries.length){if(!empty){empty=evidenceNode('p');empty.dataset.noHandoff='';root.append(empty)}evidenceText(empty,summary?.entriesTotal?'Active handoffs omitted from this preview. Inspect full evidence.':'No current handoff.')}else empty?.remove();
 let summaryNote=root.querySelector('[data-summary-note]');if(!summaryNote){summaryNote=evidenceNode('p');summaryNote.dataset.summaryNote='';root.append(summaryNote)}
 evidenceText(summaryNote,(summary?.truncated?'Preview shortened. ':'')+(summary?.entriesOmitted?summary.entriesOmitted+' active handoffs omitted. ':'')+(summary?.questionsOmitted?summary.questionsOmitted+' questions omitted. ':''));
 if(summary?.evidence?.detail){let link=root.querySelector('[data-full-evidence]');if(!link){link=evidenceNode('a','Inspect full evidence');link.dataset.fullEvidence='';root.append(link)}if(link.getAttribute('href')!==summary.evidence.detail)link.href=summary.evidence.detail}
 for(const entry of entries){let card=[...root.children].find(n=>n.dataset.handoff===entry.key);if(!card){card=evidenceNode('section');card.dataset.handoff=entry.key;for(const key of ['role','duty','owed']){const p=evidenceNode('p');p.dataset.field=key;card.append(p)}root.append(card)}
  evidenceText(card.querySelector('[data-field=role]'),entry.profile+' · '+entry.job+' · '+(entry.mode==='configured-next'?'Configured next; handoff not established':entry.exchangeStatus));
  evidenceText(card.querySelector('[data-field=duty]'),entry.duty+(entry.dutyTruncated?'…':''));
  evidenceText(card.querySelector('[data-field=owed]'),entry.unresolvedCount+' outstanding obligation'+(entry.unresolvedCount===1?'':'s'));
  exactEvidence(card,entry.key+':output','Expected output & complete handoff',entry.expectedOutput.detail);
  const questionKeys=new Set();for(const state of entry.questionStates??[]){const q=(summary.questions??[]).find(q=>q.key===state.key);if(!q)continue;const key=entry.key+':question:'+q.key;questionKeys.add(key);let row=[...card.children].find(n=>n.dataset.question===key);if(!row){row=evidenceNode('div');row.dataset.question=key;row.append(evidenceNode('p'));card.append(row)}evidenceText(row.firstElementChild,q.text+(q.textTruncated?'…':'')+' · '+q.ownerRole+(q.blockingRole?' · needed by '+q.blockingRole:'')+' · '+state.resolution);
   const answers=new Set();for(const [i,r] of (state.resolutions??[]).entries()){const answerKey=key+':answer:'+i;answers.add(answerKey);exactEvidence(row,answerKey,'Saved resolution · '+r.by+' · '+r.answerId,r.detail)}if(state.resolutionsOmitted){answers.add(key+':more');exactEvidence(row,key+':more','All '+state.resolutionsTotal+' saved resolutions',entry.evidence.detail)}for(const disclosure of [...row.children])if(disclosure.dataset.evidenceKey&&!answers.has(disclosure.dataset.evidenceKey))disclosure.remove();
  }
  for(const row of [...card.children])if(row.dataset.question&&!questionKeys.has(row.dataset.question))row.remove();
  const inputKeys=new Set();for(const input of entry.inputs??[]){const o=input.observation,key=entry.key+':input:'+input.key;inputKeys.add(key);let row=[...card.children].find(n=>n.dataset.input===key);if(!row){row=evidenceNode('div');row.dataset.input=key;row.append(evidenceNode('p'));card.append(row)}evidenceText(row.firstElementChild,input.id+' · '+(o?'Observed '+(o.ok?'available':'unavailable')+' at '+o.at+' · '+o.job+' · '+(o.name??'unknown worktree')+' · '+(o.dir??'unknown directory'):input.state==='not-checked'?'Not checked':'Unknown')+' · Current availability unknown');exactEvidence(row,key+':detail','Recorded input evidence',input.evidence)}
  for(const row of [...card.children])if(row.dataset.input&&!inputKeys.has(row.dataset.input))row.remove();
  let omitted=card.querySelector('[data-omitted]');if(!omitted){omitted=evidenceNode('p');omitted.dataset.omitted='';card.append(omitted)}evidenceText(omitted,(entry.truncated?'Preview shortened. ':'')+(entry.declarationsKnown?'':'Input declarations unknown. ')+(entry.inputsOmitted?entry.inputsOmitted+' more recorded inputs. ':'')+(entry.questionsOmitted?entry.questionsOmitted+' more assigned questions. ':'')+'Exact details are available above.');
 }
 return root;
}
function workOrgans(parent,summary,item,jobs,currentJob){
 let root=[...parent.children].find(n=>n.dataset.workOrgans===String(item));
 if(!root){root=evidenceNode('section');root.className='work-organs';root.dataset.workOrgans=String(item);root.dataset.key='organs:'+item;
  const title=evidenceNode('h3','Ground, Rumen and preparation'),scope=evidenceNode('p'),checks=evidenceNode('div'),note=evidenceNode('p'),details=evidenceNode('details'),body=evidenceNode('div'),rows=evidenceNode('ol');
  scope.className=note.className='system';scope.dataset.organScope='';checks.className='organ-checks';checks.dataset.organChecks='';note.dataset.organNote='';
  for(const [key,label]of [['ground','Every step grounded?'],['rumen','Rules accounted for?'],['nextPrepared','Next steps prepared?']]){const p=evidenceNode('p',label),value=evidenceNode('strong');value.dataset.organCheck=key;value.className='organ-state';p.append(value);checks.append(p)}
  details.dataset.key='organs:'+item+':details';body.className='disclosure-body';rows.className='organ-phases';rows.dataset.organPhases='';body.append(evidenceNode('p','Ground records source identity and findings. Rule accounting is distinct from actual check execution; inspect verification for executed results.'),rows);details.append(evidenceNode('summary','Inspect each step and its accepted evidence'),body);root.append(title,scope,checks,note,details);parent.append(root);
 }
 const phases=Array.isArray(summary?.phases)?summary.phases:[],expected=[...new Set((jobs??[]).filter(job=>typeof job==='string'&&job))];
 if(typeof currentJob==='string'&&currentJob&&!expected.includes(currentJob))expected.push(currentJob);
 const legacy=summary?.legacy===true,recorded=summary?.required===true&&!legacy;
 const phaseFor=job=>phases.find(phase=>phase.job===job);
 const stateFor=(phase,key)=>!recorded?'unknown':phase?.[key]===true&&Number.isSafeInteger(phase.event)&&phase.event>0?'yes':'no';
 const setState=(value,state)=>{value.dataset.state=state;evidenceText(value,state==='yes'?'YES':state==='no'?'NO · pending':legacy?'UNKNOWN · legacy':'UNKNOWN · unavailable')};
 for(const value of root.querySelector('[data-organ-checks]').querySelectorAll('[data-organ-check]')){
  const key=value.dataset.organCheck,states=expected.map(job=>stateFor(phaseFor(job),key));setState(value,!states.length||states.includes('unknown')?'unknown':states.every(state=>state==='yes')?'yes':'no');
 }
 evidenceText(root.querySelector('[data-organ-scope]'),'Across all '+expected.length+' configured or active steps'+(currentJob?' · Current step: '+currentJob:'.'));
 evidenceText(root.querySelector('[data-organ-note]'),!summary?'Ground/Rumen evidence is unavailable. Current resource availability is unknown; no completion is inferred.':legacy?'This work predates mandatory organ receipts. Historical completion remains visible; Ground/Rumen evidence is unknown.':'Saved acceptance evidence. Current resource availability is unknown until execution rechecks it.'+(summary.omitted?' '+summary.omitted+' accepted receipts are outside this preview.':''));
 const all=[...new Set([...expected,...phases.map(phase=>phase.job)])],rows=root.querySelector('[data-organ-phases]'),keep=new Set(all);
 for(const row of [...rows.children])if(!keep.has(row.dataset.organJob))row.remove();
 for(const job of all){const phase=phaseFor(job);let row=[...rows.children].find(node=>node.dataset.organJob===job);
  if(!row){row=evidenceNode('li');row.dataset.organJob=job;row.dataset.key='organ-job:'+job;const title=evidenceNode('p'),checks=evidenceNode('div'),note=evidenceNode('p');title.className='organ-phase-title';title.dataset.organTitle='';checks.className='organ-checks';note.className='system';note.dataset.organDetail='';for(const [key,label]of [['ground','Ground'],['rumen','Rumen'],['nextPrepared','Next step']]){const p=evidenceNode('p',label),value=evidenceNode('strong');value.className='organ-state';value.dataset.organCheck=key;p.append(value);checks.append(p)}row.append(title,checks,note);rows.append(row)}
  evidenceText(row.querySelector('[data-organ-title]'),job+(job===currentJob?' · current':''));for(const value of row.querySelectorAll('[data-organ-check]'))setState(value,stateFor(phase,value.dataset.organCheck));
  evidenceText(row.querySelector('[data-organ-detail]'),phase?(phase.rules+' declared rules · '+(phase.next?.length?'Prepared for '+phase.next.join(', '):'No later step required')+' · Current availability unknown'):legacy?'No mandatory organ evidence was recorded.':'No current accepted preparation is recorded for this step.');
  const event=phase?.event,existing=[...row.children].find(node=>node.dataset.evidenceKey);
  if(recorded&&Number.isSafeInteger(event)&&event>0)exactEvidence(row,'organ-event:'+item+':'+job,'Read accepted Ground, Rumen and handoff evidence','/api/v1/items/'+item+'/evidence?kind=event&ref='+event);else existing?.remove();
 }
 let link=root.querySelector('[data-organ-record]');if(!link){link=evidenceNode('a','Inspect the same work record');link.dataset.organRecord='';root.lastElementChild.lastElementChild.append(link)}link.href=summary?.detail??'/api/trace/'+item+'?lens=ax';
 return root;
}
function patchEvidence(old,fresh){
 if(old.nodeType!==fresh.nodeType||old.nodeName!==fresh.nodeName){old.replaceWith(fresh);return fresh}
 if(old.nodeType===3){if(old.nodeValue!==fresh.nodeValue)old.nodeValue=fresh.nodeValue;return old}
 const top=old.scrollTop,left=old.scrollLeft;
 if(old.dataset.evidenceKey&&old.dataset.evidenceKey===fresh.dataset.evidenceKey){old._updateEvidence(fresh._evidenceLabel,fresh._evidenceUrl);return old}
 if(fresh._fill){old._fill=fresh._fill;old._filled=fresh._filled}
 for(const a of [...old.attributes])if(!fresh.hasAttribute(a.name)&&a.name!=='open')old.removeAttribute(a.name);
 for(const a of [...fresh.attributes])if(a.name!=='open'&&old.getAttribute(a.name)!==a.value)old.setAttribute(a.name,a.value);
 const key=n=>n.nodeType===1?(n.dataset.handoff||n.dataset.key||n.dataset.question||n.dataset.input||n.dataset.field||null):null;
 let cursor=old.firstChild;
 for(const child of [...fresh.childNodes]){const k=key(child);let existing=k?[...old.childNodes].find(n=>key(n)===k):cursor&& !key(cursor)?cursor:null;if(existing){if(existing!==cursor)old.insertBefore(existing,cursor);existing=patchEvidence(existing,child);cursor=existing.nextSibling}else{old.insertBefore(child,cursor)}}
 while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next}old.scrollTop=top;old.scrollLeft=left;return old;
}
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
${EVIDENCE_SCRIPT}
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
 let existing=[...parent.children].find(n=>n.dataset.message===m.id);const signature=json(m);if(existing?.dataset.signature===signature)return existing;
 const li=el('li',undefined,'message');li.dataset.message=m.id;li.dataset.signature=signature;li.append(el('p',(m.kind==='source'?'Original request':m.kind==='question'?'Question':m.kind==='decision'?'Decision':m.kind==='reuse'?'Reused answer':'Answer')+' · '+m.role+(m.at?' · '+time(m.at):''),'system'));
 const long=m.text.length>600||m.truncated;
 li.append(el('p',long?m.text.slice(0,600)+'…':m.text));
 if(long)disclosure(li,'message:'+key+':'+m.id,'Read full message',async b=>{
  if(!m.truncated){b.append(el('p',m.text));return}
  const load=async()=>{b.replaceChildren(el('p','Loading the saved message…','system'));try{
   const page=await get('/api/v1/items/'+key+'/conversation'+(m.kind==='source'?'':'?after='+Math.max(0,m.event-1)));
   const full=page.messages.find(x=>x.id===m.id);if(!full)throw new Error('The saved message is no longer available.');b.replaceChildren(el('p',full.text));
  }catch(e){b.replaceChildren(el('p',e.message,'feedback error'),action('Try again',load))}};await load();
 });
 for(const r of m.references??[]){li.append(el('p','Source: '+r.by+' · '+r.answerId+(r.resolved?'':' · unresolved'),'system'));exactEvidence(li,'answer:'+key+':'+r.answerId,'Read exact saved answer',r.detail)}
 if(m.evidence)exactEvidence(li,'event:'+key+':'+m.event,m.referencesOmitted?'All '+m.referencesTotal+' answer references':'Exact event evidence',m.evidence);
 if(existing)patchEvidence(existing,li);else parent.append(li);return existing??li;
}
// A pending request is immutable until acceptance or a definite rejection is known.
// Drafts are local only; all accepted messages and work state belong to the API.
function composer(key,isNew=false){
 const d=draftFor(key),root=el('section',undefined,'composer'),form=el('form'),policy=el('p',undefined,'muted'),feedback=el('div',undefined,'feedback'),storage=el('p',undefined,'feedback error');
 let context=null,projects=[],feedbackKey='';const controls={};
 feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');storage.setAttribute('role','alert');
 const field=(name,label,tag='textarea')=>{const box=el('div',undefined,'field'),l=el('label',label),input=el(tag);input.id='draft-'+key+'-'+name;l.htmlFor=input.id;input.name=name;input.value=d.fields[name]??'';controls[name]=input;
  input.addEventListener(tag==='select'?'change':'input',()=>{d.fields[name]=input.value;if(d.phase==='accepted'){d.phase='draft';d.notice=''}if(!isNew&&!d.revision&&context)d.revision=context.revision;saveDraft(key,d);update()});box.append(l,input);form.append(box);return input};
 if(isNew){const mode=field('mode','Start with','select');mode.replaceChildren(new Option('Raw notes → discover tasks','discovery'),new Option('A task already selected for delivery','delivery'));mode.value=d.fields.mode??'discovery';d.fields.mode=mode.value;field('workspace','Workspace','select').required=true;field('objective','Short objective','input');field('source','Notes, transcript or task description').required=true}
 else{root.append(el('h3','Your reply'));field('text','Answer or direction for this task').required=true;field('cause','What caused the problem?','select')}
 const note=el('p','Drafts are saved in this browser on this device. Your exact text is sent only when you submit.','draft-note');
 const buttons=el('div',undefined,'actions'),send=action(isNew?'Submit work':'Send reply',()=>{},true),review=action('Review and edit draft',async()=>{
  if(!isNew&&!context)return;
  if(!isNew&&d.reviewRevision!==context.revision){review.disabled=true;try{const latest=await get('/api/v1/items/'+key);d.reviewRevision=latest.revision;conversation(Number(key),latest);d.notice='Read the latest conversation above, then confirm your review. Your draft has not changed.';saveDraft(key,d)}catch(e){d.problem={detail:e.message}}finally{review.disabled=false;update()}return}
  d.pending=null;d.phase='draft';d.problem=null;d.notice='Draft kept. Review your text, then send when ready.';d.revision=context?.revision;d.reviewRevision=undefined;saveDraft(key,d);update();(controls.text??controls.source).focus();
 });send.type='submit';
 buttons.append(send,review);form.append(note,buttons);root.append(policy,feedback,storage,form);
 const starting=()=>!isNew&&(d.pending?.url?.endsWith('/start')||context?.next?.some(a=>a.href==='/api/v1/items/'+key+'/start'));
 function update(next){
  if(next)context=next;
  const pending=!!d.pending,busy=d.phase==='sending',stale=!isNew&&!!d.revision&&!!context&&d.revision!==context.revision;
  const allowed=isNew?projects.some(p=>p.workspace===controls.workspace.value):starting()||context?.answer.allowed===true;if(isNew){if(!controls.mode.value)controls.mode.value='discovery';controls.objective.required=controls.mode.value==='delivery';controls.objective.closest('.field').hidden=controls.mode.value!=='delivery'}
  policy.textContent=isNew?'Your input is saved once. Made Well carries it through the configured steps.':starting()?'Start this task and its prerequisites. The configured delivery steps use the saved discovery context.':context?.answer.reason??'Loading the task’s answer policy…';
  form.hidden=!isNew&&!allowed&&!pending;
  if(!isNew){controls.text.closest('.field').hidden=!!starting();controls.text.required=!starting();
   const cause=controls.cause,causes=context?.answer.causes??[];
   if(json([...cause.options].map(o=>o.value))!==json(['',...causes])){cause.replaceChildren(new Option('Choose a cause',''),...causes.map(c=>new Option(friendly(c),c)));cause.value=d.fields.cause??''}
   cause.closest('.field').hidden=!context?.answer.causeRequired&&!d.pending?.body.cause;cause.required=!!context?.answer.causeRequired;
  }
  for(const input of Object.values(controls)){if(input.tagName==='SELECT')input.disabled=pending;else input.readOnly=pending}
  send.disabled=busy||d.phase==='rejected'||(!pending&&(!allowed||stale))||(!pending&&!isNew&&!context);
  send.textContent=busy?'Sending…':pending?'Retry same request':isNew?(controls.mode.value==='discovery'?'Start discovery':'Submit task'):starting()?'Start task':'Send reply';
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
   if(!isNew&&(!(starting()||context?.answer.allowed)||(d.revision&&d.revision!==context.revision)))return;
   const fields=d.fields;
   const limits=isNew?(controls.mode.value==='discovery'?{workspace:4096,source:32768}:{workspace:4096,objective:2000,source:32768}):starting()?{}:{text:32768};
   for(const [name,max]of Object.entries(limits))if(!fields[name]?.trim()||Array.from(fields[name]).length>max){d.problem={detail:'Enter '+(name==='source'?'a description':name==='text'?'a reply':name)+' of no more than '+max.toLocaleString()+' characters. Your draft is kept.'};update();controls[name].focus();return}
   if(!isNew&&!starting()&&context.answer.causeRequired&&!context.answer.causes.includes(fields.cause)){d.problem={detail:'Choose the cause of this problem before sending.'};update();controls.cause.focus();return}
   const body=isNew?{requestId:crypto.randomUUID(),workspace:fields.workspace,mode:controls.mode.value,objective:controls.mode.value==='discovery'?'Turn the raw input into candidate work items.':fields.objective,source:fields.source,...(controls.mode.value==='discovery'?{title:fields.source.trim().split(/\r?\n/)[0].slice(0,300)}:{})}:starting()?{requestId:crypto.randomUUID(),revision:d.revision??context.revision}:{requestId:crypto.randomUUID(),revision:d.revision??context.revision,text:fields.text,...(context.answer.causeRequired?{cause:fields.cause}:{})};
   if(new TextEncoder().encode(JSON.stringify(body)).length>65536){d.problem={detail:'This message is too large to send (64 KiB JSON limit). Shorten it; the draft is still here.'};update();return}
   d.pending={url:'/api/v1/items'+(isNew?'':'/'+key+(starting()?'/start':'/answers')),body};
  }
  d.phase='sending';d.problem=null;d.notice='';if(!saveDraft(key,d)){d.phase='uncertain';update();return}update();
  try{
   const post=async()=>{const session=await get('/api/v1/session');const r=await fetch(d.pending.url,{method:'POST',headers:{'Content-Type':'application/json','X-MW-CSRF':session.csrfToken},body:JSON.stringify(d.pending.body),signal:AbortSignal.timeout(15000)});return {r,data:await r.json()}};
   let response=await post();if(response.r.status===403&&response.data.reason==='csrf_required')response=await post();
   const {r,data}=response;
   if(!r.ok){d.problem=data;d.phase=r.status>=500||r.status===408||r.status===403||data.reason==='request_id_conflict'?'uncertain':'rejected';if(data.task)context=data.task;saveDraft(key,d);update();return}
   if(data.accepted!==true||data.requestId!==d.pending.body.requestId)throw new Error('Acceptance could not be confirmed.');
   d.phase='accepted';d.notice='Accepted · '+(isNew?'Work #'+data.receipt.item+' was saved.':d.pending.url.endsWith('/start')?'The task and its prerequisites were queued.':'Your reply was saved.')+(data.warnings?.length?' '+data.warnings.join(' '):'');d.receipt=data.receipt;d.pending=null;d.fields={};d.revision=undefined;d.problem=null;
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
 if(view.key!==k){view.key=k;message(view.messages,{id:'source:'+id,kind:'source',role:'operator',text:context.item.source,truncated:context.item.sourceTruncated},id);for(const m of context.conversation)message(view.messages,m,id);
  const keep=new Set(['source:'+id,...context.conversation.map(m=>m.id)]);for(const n of [...view.messages.children])if(n.dataset.message&&!keep.has(n.dataset.message))n.remove();let note=view.messages.querySelector('.draft-note');if(context.conversationTruncated&&!note)view.messages.append(el('li','Showing recent messages. Open the full conversation for earlier evidence.','draft-note'));else if(!context.conversationTruncated)note?.remove()}
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
 const d=el('details'),s=el('summary',title),b=el('div',undefined,'disclosure-body');
 d.dataset.key=key;d._fill=fill;d._filled=false;d.open=expanded.has(key);if(hint)s.append(el('span',hint,'hint'));d.append(s,b);
 const populate=()=>{if(!d._filled){d._fill(d.lastElementChild);d._filled=true}};if(d.open)populate();
 d.addEventListener('toggle',()=>{if(!d.isConnected)return;if(d.open){expanded.add(key);populate()}else expanded.delete(key)});parent.append(d);return d;
}
function overview(v){
 const status=v.itemRecord.status;
 if(v.workEvidence?.noWorkPerformed)return {title:'No work performed',text:'No steps were set up, so no work was performed.',tone:'quiet'};
 if(['completed','shipped','discovered'].includes(status)&&!v.done)return {title:status==='shipped'?'Recorded as delivered; current evidence incomplete':'Recorded as completed; current evidence incomplete',text:'The saved lifecycle remains available in the evidence below.',tone:'attention'};
 if(status==='completed')return {title:'Completed',text:v.proof.completion?.nodes===0?'No steps were set up, so no work was performed.':'The steps for this task are finished. Only the work listed below is included.',tone:v.proof.completion?.nodes===0?'quiet':''};
 if(status==='shipped')return {title:'Delivered',text:'The work was delivered. Its recorded checks and delivery details are available below.'};
 if(status==='discovered')return {title:'Tasks ready',text:'The input has been turned into tasks.',next:'Open a proposed task to start its delivery.'};
 if(status==='candidate')return {title:'Ready to review',text:'This task has not started.',next:'Start this task below when you want it delivered.'};
 if(status==='paused')return {title:'Ready to continue',text:'Work has reached a review point. Your progress is saved.',next:'Review the conversation below for what comes next.',tone:'attention'};
 if(status==='held')return {title:'Needs attention',text:'A step could not continue. Your progress is saved.',next:'Review the conversation below for what needs attention.',tone:'attention'};
 if(status==='dropped')return {title:'Stopped',text:'This task was stopped. Its previous activity is still available below.',tone:'quiet'};
 if(v.state==='not-running')return {title:'Not running',text:'Made Well is not running this task right now. It is not complete.',next:'Your progress is saved. The driver resumes work selected through this page while the server is running.',tone:'attention'};
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
 const nodes=el('ol',undefined,'steps'),organJobs=[];
 function node(n,parent){
  organJobs.push(n.job);
  const li=el('li'),row=el('div',undefined,'step');
  const done=v.workEvidence?.jobs[n.job]?.complete===true;
  const current=n.job===v.job||active.some(i=>i.job===n.job);
  const state=done?'Done':current?(v.hold?'Needs attention':v.state==='working'?'In progress':'Not started'):'Not started';
  row.append(el('span',friendly(n.job),'step-name'),el('span',state,'step-state '+(done?'done':current&&v.hold?'attention':'')));li.append(row);
  const proof=v.workEvidence?.jobs[n.job];if(proof){disclosure(li,'accepted:'+v.item+':'+n.job,'Accepted result',b=>{section(b,'Accepted result',proof.acceptedOutput);section(b,'Retained output',proof.output);if(proof.provenance.state!=='linked')b.append(el('p','Invocation not recorded · '+proof.provenance.reason));section(b,'Recorded invocation input',proof.input);section(b,'Acceptance and provenance',proof.provenance)});for(const attempt of proof.laterAttempts.entries)exactEvidence(li,'later:'+v.item+':'+attempt.event,'Later attempt · '+attempt.outcome+' · '+attempt.at,attempt.evidence);if(proof.laterAttempts.omitted){const link=el('a','All '+proof.laterAttempts.total+' attempts');link.href=proof.laterAttempts.trace;li.append(link)}}
  if(n.children?.length){const children=el('ol',undefined,'steps');for(const child of n.children)node(child,children);li.append(children)}parent.append(li);
 }
 for(const c of v.pack[v.itemRecord.flow?.loop??v.phase]??[])for(const n of c.steps??[])node(n,nodes);
 if(nodes.children.length)head.append(nodes);else head.append(el('p','No steps have been set up for this task.','muted'));
 currentWork(head,v.currentHandoff,v.item);
 workOrgans(head,context.organs,v.item,organJobs,v.job);
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
 if(thread.parentElement===detail){patchEvidence(detail.firstElementChild,head);patchEvidence(detail.lastElementChild,tail)}
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
  for(const i of board.items){const b=el('button');b.dataset.item=String(i.id);b.setAttribute('aria-current',String(!composing&&selected===i.id));b.append(el('span',i.title,'task-name'),el('span',(['completed','shipped','discovered'].includes(i.status)&&!i.completion?(i.noWorkPerformed?'No work performed':'Recorded completion; evidence incomplete'):labels[i.status]??i.status),'task-state'));b.onclick=()=>{composing=false;selected=i.id;location.hash=String(i.id);refresh()};list.append(b);if(focused===String(i.id))b.focus({preventScroll:true})}
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
