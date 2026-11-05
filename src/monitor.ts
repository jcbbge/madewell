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
  const inputKeys=new Set();for(const input of entry.inputs??[]){const o=input.observation,key=entry.key+':input:'+input.key;inputKeys.add(key);let row=[...card.children].find(n=>n.dataset.input===key);if(!row){row=evidenceNode('div');row.dataset.input=key;row.append(evidenceNode('p'));card.append(row)}evidenceText(row.firstElementChild,input.id+' · '+(o?'Observed '+(o.ok?'available':'unavailable')+' at '+o.at+' · '+o.job+' · '+(o.name??'unknown scratch')+' · '+(o.dir??'unknown directory'):input.state==='not-checked'?'Not checked':'Unknown')+' · Current availability unknown');exactEvidence(row,key+':detail','Recorded input evidence',input.evidence)}
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

export const MONITOR=String.raw`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Made Well · Work</title><style>${NOTEBOOK_STYLE}
main{display:grid;grid-template-columns:minmax(14rem,22rem) minmax(0,1fr);gap:var(--space-6);padding:var(--space-6)}nav button{display:block;width:100%;text-align:left;margin-bottom:var(--space-2)}article{max-width:68ch;min-width:0}textarea,input,select{max-width:100%;box-sizing:border-box}textarea{width:100%;min-height:6rem}label{display:block;margin-top:var(--space-3)}pre,p{overflow-wrap:anywhere}pre{white-space:pre-wrap}#composer{border-top:1px solid var(--line-color);margin-top:var(--space-6);padding-top:var(--space-3)}[hidden]{display:none!important}fieldset{border:0;padding:0}button{margin:var(--space-1)}@media(max-width:48rem){main{grid-template-columns:1fr}.app-header{position:static}}</style>
<a class="skip" href="#work">Skip to work</a><header class="app-header"><h1>Made Well</h1><a href="/grammar">Grammar</a><a href="/qa">Manual QA</a><span id="connection" role="status">Connecting…</span></header>
<main><nav aria-label="Work items"><button id="new" type="button">New work</button><div id="items"></div></nav><article id="work" tabindex="-1"><div id="summary"><h2>Your work</h2><p>Select a task or capture new input.</p></div><div id="steps"></div><div id="conversation"></div><form id="composer"><h3 id="form-title">New work</h3><div id="new-fields"><label>What needs to happen?<input id="objective"></label><label>Describe the work<textarea id="source"></textarea></label><label>Next step<select id="mode"><option value="discovery">Discover candidate tasks</option><option value="delivery">Record work to carry out</option></select></label></div><label id="action-label" hidden>Action<select id="action"></select></label><fieldset id="fields"></fieldset><button id="send" type="submit">Save work</button><button id="review" type="button" hidden>Review current record and make a new request</button><p id="message" role="status" aria-live="polite"></p></form><details id="technical"><summary>Activity &amp; technical details</summary><pre id="evidence" tabindex="0"></pre></details></article></main>
<script>${EVIDENCE_SCRIPT}
const $=id=>document.getElementById(id),nodes=new Map();let selected=null,context=null,busy=false,polling=false,storage=true,draft={fields:{},action:'',revision:null,pending:null},formKey='';
const key=()=> 'mw.work.'+(selected??'new');
const value=id=>$(id)?.value??'';
function save(){try{localStorage.setItem(key(),JSON.stringify(draft));storage=true}catch{storage=false;$('message').textContent='Browser storage is unavailable. Keep your draft; sending is disabled.'}$('send').disabled=!storage||busy}
function gather(){draft.objective=value('objective');draft.source=value('source');draft.mode=value('mode');draft.action=value('action');for(const e of $('fields').querySelectorAll('[data-field]'))draft.fields[e.dataset.field]=e.value;save()}
function load(){try{draft=JSON.parse(localStorage.getItem(key())||'null')||{fields:{},action:'',revision:context?.revision??null,pending:null};storage=true}catch{draft={fields:{},action:'',revision:null,pending:null};storage=false}draft.fields??={};$('objective').value=draft.objective??'';$('source').value=draft.source??'';$('mode').value=draft.mode??'discovery';formKey='';actions();lock()}
function field(name,label,multiline=false,initial=''){const l=document.createElement('label'),e=document.createElement(multiline?'textarea':'input');l.textContent=label;e.dataset.field=name;e.value=draft.fields[name]??initial;l.append(e);$('fields').append(l);return e}
function actionName(){return value('action').split('/').pop()}
function buildFields(){const op=actionName(),k=selected+':'+op;if(k===formKey)return;formKey=k;$('fields').replaceChildren();const p=context?.work?.progress??{};
 if(op==='progress'){field('remaining','What remains?',true,p.remaining??'');field('nextAction','Next action',false,p.nextAction??'');field('owner','Who owes the next action?',false,p.owner??'operator')}
 if(op==='block'){field('blockerId','Blocker identifier');field('reason','What blocks this work?',true);field('owner','Who can resolve it?');field('nextAction','Next action to resolve it')}
 if(op==='unblock'){const e=field('blockerId','Blocker identifier',false,(context?.work?.blockers??[]).find(b=>!b.resolvedAt)?.id??'');field('resolution','How was it resolved?',true)}
 if(op==='answers')field('text','Your answer',true);
 if(op==='complete'){field('result','What was accomplished?',true);for(const c of context.work.conditions){const h=document.createElement('p');h.textContent=c.id+': '+c.text;$('fields').append(h);field('evidence:'+c.id,'Evidence for '+c.id,true);field('refs:'+c.id,'Evidence references for '+c.id+' (one per line)',true)}}
 if(op==='configure-work'){field('reason','Why change execution?',true);const e=field('execution','Execution mode (external or cartridge)',false,'external');field('owner','Execution owner',false,'operator');const d=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Advanced work settings';d.append(summary);const l=document.createElement('label');l.textContent='Settings override (JSON, optional)';const t=document.createElement('textarea');t.dataset.field='settings';t.value=draft.fields.settings??'';l.append(t);d.append(l);$('fields').append(d)}
 if(op==='resolve-execution'){field('invocation','Uncertain invocation',false,context?.work?.pending?.invocation??'');const e=field('resolutionAction','Resolution (external or replay)',false,'external');field('reason','Reason for this resolution',true);const l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.id='authorizeReplay';c.checked=draft.fields.authorizeReplay==='true';l.append(c,document.createTextNode('Authorize exactly one new replay attempt'));$('fields').append(l)}
 lock();
}
function options(select,entries){const wanted=new Set(entries.map(x=>x[0]));for(const o of [...select.options])if(!wanted.has(o.value))o.remove();for(const [v,label]of entries){let o=[...select.options].find(o=>o.value===v);if(!o){o=document.createElement('option');o.value=v;select.append(o)}if(o.textContent!==label)o.textContent=label}}
function actions(){const entries=context?.next.filter(a=>a.method==='POST').map(a=>[a.href,a.reason])??[];options($('action'),entries);if(entries.some(e=>e[0]===draft.action))$('action').value=draft.action;$('action-label').hidden=!selected;$('new-fields').hidden=!!selected;if(selected)buildFields();else $('fields').replaceChildren();$('composer').hidden=!!selected&&!entries.length&&!draft.pending;$('form-title').textContent=selected?'Update this work':'New work'}
function lock(){const pending=!!draft.pending;for(const e of $('composer').querySelectorAll('input,textarea,select'))e.disabled=pending;$('send').textContent=pending?'Retry saved request':selected?'Save action':'Save work';$('send').disabled=busy||!storage;$('review').hidden=!pending}
async function read(url){const r=await fetch(url);if(!r.ok)throw new Error('Cannot read saved work.');return r.json()}
function render(){const i=context.item,p=context.work?.progress??{},root=document.createElement('div');root.id='summary';root.append(evidenceNode('h2',i.title),evidenceNode('p',i.objective),evidenceNode('p',context.position.status+' · '+(p.owner??i.owner),'system'),evidenceNode('p',p.nextAction??''));for(const b of context.work?.blockers??[])if(!b.resolvedAt)root.append(evidenceNode('p','Blocked: '+b.reason+' · '+b.owner+' · '+b.nextAction));const c=context.work?.completion;if(c){root.append(evidenceNode('h3','Accepted result'),evidenceNode(typeof c.result==='string'?'p':'pre',typeof c.result==='string'?c.result:JSON.stringify(c.result,null,2)),evidenceNode('p',c.kind==='recorded'?'Recorded assertion by '+c.acceptedBy.label:c.kind==='legacy'?'Historical result; acceptance coverage unavailable':'Independent automated acceptance','system'))}patchEvidence($('summary'),root);$('evidence').textContent=JSON.stringify(context,null,2);currentWork($('steps'),context.currentHandoff,i.id);workOrgans($('steps'),context.organs,i.id,context.organs?.phases.map(p=>p.job),context.position.node);const next=document.createElement('div');next.id='conversation';next.append(evidenceNode('h3','Conversation'));for(const m of context.conversation??[]){const row=evidenceNode('div');row.dataset.key=m.id;row.append(evidenceNode('p',m.role+' · '+m.kind,'system'),evidenceNode('p',m.text));next.append(row)}patchEvidence($('conversation'),next);actions()}
async function refresh(){if(polling)return;polling=true;const id=selected;try{const runs=await read('/api/runs');for(const i of runs.items){let b=nodes.get(i.id);if(!b){b=document.createElement('button');b.type='button';b.onclick=()=>select(i.id);nodes.set(i.id,b);$('items').append(b)}const text=i.title+' · '+i.status;if(b.textContent!==text)b.textContent=text}for(const [id,b]of nodes)if(!runs.items.some(i=>i.id===id)){b.remove();nodes.delete(id)}if(id){const c=await read('/api/v1/items/'+id);if(id===selected){context=c;render()}}$('connection').textContent='Connected'}catch{$('connection').textContent='Disconnected · saved drafts remain available'}finally{polling=false}}
async function select(id){if(busy)return;gather();selected=id;context=null;await refresh();load();$('work').focus({preventScroll:true})}
$('new').onclick=()=>select(null);$('composer').addEventListener('input',()=>{if($('authorizeReplay'))draft.fields.authorizeReplay=String($('authorizeReplay').checked);gather()});$('action').onchange=()=>{gather();formKey='';buildFields();save()};
function body(){const f=draft.fields,op=actionName(),out={requestId:crypto.randomUUID(),revision:draft.revision,actor:{kind:'operator',label:'Browser operator'}};if(!selected)return {requestId:out.requestId,title:value('objective'),objective:value('objective'),source:value('source'),mode:value('mode')};if(op==='progress')Object.assign(out,{progress:{remaining:f.remaining,nextAction:f.nextAction,owner:f.owner}});if(op==='block')out.blocker={id:f.blockerId,reason:f.reason,owner:f.owner,nextAction:f.nextAction};if(op==='unblock')Object.assign(out,{blockerId:f.blockerId,resolution:f.resolution});if(op==='answers'){out.text=f.text;delete out.actor}if(op==='complete')Object.assign(out,{result:f.result,evidence:context.work.conditions.map(c=>({conditionId:c.id,detail:f['evidence:'+c.id]??'',refs:(f['refs:'+c.id]??'').split('\n').filter(Boolean)}))});if(op==='configure-work')Object.assign(out,{reason:f.reason,execution:{mode:f.execution,owner:f.owner},...(f.settings?{settings:JSON.parse(f.settings)}:{})});if(op==='resolve-execution')Object.assign(out,{invocation:f.invocation,action:f.resolutionAction,reason:f.reason,...(f.resolutionAction==='replay'&&f.authorizeReplay==='true'?{authorizeReplay:true}:{})});return out}
$('composer').onsubmit=async e=>{e.preventDefault();if(busy||!storage)return;gather();if(!storage)return;if(!draft.pending){if(!draft.revision&&selected)draft.revision=context.revision;draft.pending={url:selected?value('action'):'/api/v1/items',body:body()};save();if(!storage){draft.pending=null;return}}busy=true;lock();try{const session=await read('/api/v1/session'),r=await fetch(draft.pending.url,{method:'POST',headers:{'Content-Type':'application/json','X-MW-CSRF':session.csrfToken},body:JSON.stringify(draft.pending.body)}),result=await r.json();if(!r.ok){$('message').textContent=result.detail??'Request refused; keep the draft.';$('evidence').textContent=JSON.stringify(result,null,2);return}const created=result.value?.id;localStorage.removeItem(key());draft={fields:{},action:'',revision:null,pending:null};$('message').textContent=(result.warnings??[]).join(' ')||'Saved.';if(!selected&&created){selected=created;await refresh();load()}else{await refresh();load()}}catch{$('message').textContent='Acceptance uncertain. Retry sends the exact saved request.'}finally{busy=false;lock()}};
$('review').onclick=async()=>{await refresh();draft.pending=null;draft.revision=context?.revision??null;save();lock();$('message').textContent='Review the latest record and preserved draft before making a new request.'};load();refresh();setInterval(refresh,3000);
</script></html>`
