/* ================= 1. HELPERS ================= */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const trunc=(s,n)=>s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,'')+'…':s;
function toast(m,bad){const t=document.getElementById('toast');t.textContent=m;t.style.background=bad?'#b91c1c':'#1e293b';t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4500)}
function download(name,type,content){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

/* ================= 2. INDEXEDDB ================= */
const DB={db:null,
 open(){return new Promise((ok,no)=>{const r=indexedDB.open('studybuddy',1);
  r.onupgradeneeded=()=>['reviewers','history'].forEach(s=>r.result.createObjectStore(s,{keyPath:'id'}));
  r.onsuccess=()=>{this.db=r.result;ok()};r.onerror=()=>no(r.error)})},
 run(s,mode,fn){return new Promise((ok,no)=>{const t=this.db.transaction(s,mode),q=fn(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)})},
 all(s){return this.run(s,'readonly',o=>o.getAll())},put(s,v){return this.run(s,'readwrite',o=>o.put(v))},
 del(s,id){return this.run(s,'readwrite',o=>o.delete(id))},clear(s){return this.run(s,'readwrite',o=>o.clear())}};

/* ================= 3. TEXT EXTRACTION (all local) ================= */
async function extract(file,say){
 const ext=file.name.split('.').pop().toLowerCase();
 if(file.size>25*1024*1024)throw new Error('File is over 25 MB. Split it into smaller files.');
 if(ext==='txt')return{text:await file.text()};
 if(ext==='pdf'){
  if(!window.pdfjsLib)throw new Error('PDF.js failed to load (check internet connection).');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let t='';
  for(let i=1;i<=pdf.numPages;i++){say(`Reading PDF page ${i}/${pdf.numPages}…`);
   const c=await(await pdf.getPage(i)).getTextContent();t+=c.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('')+'\n\n'}
  return{text:t};}
 if(['jpg','jpeg','png','webp'].includes(ext)){
  if(!window.Tesseract)throw new Error('Tesseract.js failed to load (check internet connection).');
  say('Running OCR (first run downloads language data)…');
  const r=await Tesseract.recognize(file,'eng',{logger:m=>m.status==='recognizing text'&&say('OCR '+Math.round(m.progress*100)+'%')});
  return{text:r.data.text,ocr:true};}
 if(ext==='docx'){
  const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return{text:r.value};}
 if(ext==='pptx'){
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>a.match(/\d+/)[0]-b.match(/\d+/)[0]);
  let t='';for(const n of names){say('Reading '+n.split('/').pop());
   t+=(await zip.files[n].async('string')).replace(/<\/a:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")+'\n\n'}
  return{text:t};}
 if(['doc','ppt'].includes(ext))throw new Error('Old .doc/.ppt formats are not supported. Save as .docx/.pptx.');
 throw new Error('Unsupported file type ".'+ext+'".');
}

/* ================= 4. STUDY MATERIAL GENERATION (no AI) ================= */
const STOP=new Set('about above after again against also because been before being between both could during each every from have having here into itself just more most other should since some such than that their them then there these they this those through under until very were what when where which while will with would your'.split(' '));
const BAD_SUBJ=/^(This|That|It|There|These|Those|He|She|They|What|Which|Who|We|You|I|Here)\b/;
const DEF_IS=/^(?:The |An? )?([A-Z][A-Za-z0-9\- ]{1,40}?) (?:is|are|refers to|means|is defined as|are defined as|can be defined as|is known as) (?:the |an? )?(.{15,})$/;
const DEF_COLON=/^([A-Z][A-Za-z0-9\- ]{1,40}):\s+(.{15,})$/;

function clean(t){return t.replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()}

function generate(text,cfg,ocr){
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
 const sents=text.replace(/\n/g,' ').split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(s=>s.trim()).filter(s=>s.length>25&&s.length<320);
 // Topics: short heading-like lines
 const topics=[...new Set(lines.filter(l=>l.length<70&&l.split(' ').length<=8&&!/[.?!,;]$/.test(l)&&/^(\d+[.)]\s*)?[A-Z0-9]/.test(l)&&!DEF_COLON.test(l)))].slice(0,25);
 // Definitions
 const defs=[],seen=new Set();
 const addDef=(t,d,src)=>{t=t.trim();const k=t.toLowerCase();
  if(BAD_SUBJ.test(t)||t.split(' ').length>5||seen.has(k))return;seen.add(k);
  d=d.replace(/[.\s]+$/,'');defs.push({term:t,def:d,src,unc:d.length>150||ocr})};
 lines.forEach(l=>{const m=l.match(DEF_COLON);if(m)addDef(m[1],m[2],l)});
 sents.forEach(s=>{const m=s.match(DEF_IS);if(m)addDef(m[1],m[2],s)});
 // Existing questions: a line ending in "?" followed by a non-question line
 const found=[];lines.forEach((l,i)=>{if(/\?$/.test(l)&&l.length>10&&lines[i+1]&&!/\?$/.test(lines[i+1])&&lines[i+1].length<300)
  found.push({q:l.replace(/^\d+[.)]\s*/,''),a:lines[i+1].replace(/^(answer|ans|a)\s*[:.-]\s*/i,''),unc:true,detected:true})});
 // Frequent keywords
 const freq={};(text.toLowerCase().match(/[a-z]{7,}/g)||[]).forEach(w=>{if(!STOP.has(w))freq[w]=(freq[w]||0)+1});
 const keywords=Object.keys(freq).filter(w=>freq[w]>=2).sort((a,b)=>freq[b]-freq[a]).slice(0,40);
 // Key facts: sentences with numbers or cue words, not already definitions
 const facts=sents.filter(s=>!defs.some(d=>d.src===s)&&(/\d/.test(s)||/\b(important|because|therefore|causes?|results? in|consists? of|includes?|must|always|never|first|main)\b/i.test(s))).slice(0,30);

 // ---- Multiple-choice questions ----
 const seenQ=new Set(),qs=[];
 const mk=(q,ans,pool,expl,unc)=>{
  const dis=shuffle(pool.filter(p=>p.toLowerCase()!==ans.toLowerCase())).slice(0,3);
  if(dis.length<3||seenQ.has(q))return null;seenQ.add(q);
  const opts=shuffle([ans,...dis]);return{q,opts,a:opts.indexOf(ans),expl,unc:!!unc}};
 const termPool=defs.map(d=>d.term);
 const A=defs.map(d=>mk(`Which term is described as: "${trunc(d.def,160)}"?`,d.term,termPool,`${d.term} — ${trunc(d.src,220)}`,d.unc)).filter(Boolean);
 const B=defs.map(d=>mk(`What is "${d.term}"?`,trunc(d.def,110),defs.map(x=>trunc(x.def,110)),`${d.term} — ${trunc(d.src,220)}`,d.unc||d.def.length>110)).filter(Boolean);
 let main=cfg.diff==='easy'?A:cfg.diff==='hard'?[...B,...A]:A.flatMap((x,i)=>B[i]?[x,B[i]]:[x]);
 qs.push(...main);
 // Fill-in-the-blank from key facts (always flagged for review: distractors are keywords)
 for(const f of facts){if(qs.length>=cfg.count*2)break;
  const w=keywords.filter(k=>new RegExp('\\b'+k+'\\b','i').test(f)).sort((a,b)=>b.length-a.length)[0];if(!w)continue;
  const q=mk('Fill in the blank: '+f.replace(new RegExp('\\b'+w+'\\b','i'),'_____'),w,keywords.filter(k=>!new RegExp('\\b'+k+'\\b','i').test(f)),`Source: ${trunc(f,220)}`,true);
  if(q)qs.push(q)}
 const questions=qs.slice(0,cfg.count);

 // ---- Flashcards ----
 const cards=[...defs.map(d=>({q:`What is ${d.term}?`,a:d.def,unc:d.unc})),...found.map(f=>({q:f.q,a:f.a,unc:true})),
  ...questions.filter(x=>x.q.startsWith('Fill')).map(x=>({q:x.q,a:x.opts[x.a],unc:true}))].slice(0,cfg.count);

 const warnings=[];
 if(ocr)warnings.push('Text came from OCR and may contain errors. Check items before relying on them.');
 if(questions.length<cfg.count)warnings.push(`Only ${questions.length} of ${cfg.count} requested questions could be built from this content (needs definitions or repeated key terms).`);
 if(!cards.length)warnings.push('No flashcards could be built: no definitions or question/answer pairs were detected.');
 return{notes:{topics,defs:defs.map(d=>({term:d.term,def:d.def})),terms:keywords.slice(0,15),facts},questions,cards,warnings,preview:text.slice(0,1500)};
}

/* ================= 5. STATE ================= */
let cfg={mode:'all',diff:'medium',count:10};
try{Object.assign(cfg,JSON.parse(localStorage.getItem('sb_cfg')||'{}'))}catch(e){}
let S={view:'dashboard',rid:null,tab:'notes',reviewers:[],history:[],busy:'',q:null,fc:null,search:''};
const cur=()=>S.reviewers.find(r=>r.id===S.rid);
const go=(v,rid,tab)=>{S.view=v;if(rid)S.rid=rid;if(tab)S.tab=tab;render()};
function saveCfg(k,v){cfg[k]=k==='count'?Math.max(1,Math.min(50,+v||10)):v;try{localStorage.setItem('sb_cfg',JSON.stringify(cfg))}catch(e){}}

/* ================= 6. UPLOAD FLOW ================= */
async function handleFiles(files){
 for(const f of files){
  try{
   S.busy='Reading '+f.name+'…';render();
   const{text,ocr}=await extract(f,m=>{const e=document.getElementById('busy');if(e)e.textContent=m});
   const t=clean(text||'');
   if(t.length<40)throw new Error(/\.pdf$/i.test(f.name)?'No selectable text found (likely a scanned PDF). Save pages as images and upload those for OCR.':'No usable text found in this file.');
   const g=generate(t,cfg,ocr);
   const r={id:uid(),name:f.name,date:Date.now(),chars:t.length,ocr:!!ocr,cfg:{...cfg},...g};
   await DB.put('reviewers',r);S.reviewers.unshift(r);S.rid=r.id;
   S.tab=cfg.mode==='quiz'?'quiz':cfg.mode==='flashcards'?'cards':'notes';S.q=null;S.fc=null;S.view='reviewer';
   toast(`Generated ${r.questions.length} questions, ${r.cards.length} cards from ${f.name}`);
  }catch(e){toast(f.name+': '+e.message,true)}
 }
 S.busy='';render();
}

/* ================= 7. QUIZ ================= */
function startQuiz(){const r=cur();if(!r.questions.length)return;S.q={qs:shuffle(r.questions),i:0,sel:null,wrong:[],score:0,done:false};render()}
function pick(k){const q=S.q;if(q.sel!==null)return;q.sel=k;const x=q.qs[q.i];if(k===x.a)q.score++;else q.wrong.push({...x,chosen:k});render()}
async function nextQ(){const q=S.q;q.i++;q.sel=null;
 if(q.i>=q.qs.length){q.done=true;
  await DB.put('history',{id:uid(),rid:S.rid,name:cur().name,date:Date.now(),score:q.score,total:q.qs.length,wrong:q.wrong});S.history=await DB.all('history')}
 render()}
function quizHTML(r){
 if(!r.questions.length)return'<p class="text-slate-500">No questions could be generated from this file. Try a file with definitions (e.g. "Term: meaning" or "X is …") or repeated key terms.</p>';
 const q=S.q;if(!q)return`<div class="text-center py-10"><p class="mb-4 text-slate-600">${r.questions.length} questions ready.</p><button onclick="startQuiz()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg">Start quiz</button></div>`;
 if(q.done)return`<div class="text-center py-6"><div class="text-4xl font-bold text-indigo-600">${q.score}/${q.qs.length}</div><p class="text-slate-500 mb-4">${Math.round(q.score/q.qs.length*100)}% correct · saved to Quiz History</p>
  <button onclick="startQuiz()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Retake</button></div>
  ${q.wrong.length?'<h3 class="font-semibold mb-2">Review incorrect answers</h3>'+q.wrong.map(w=>wrongHTML(w)).join(''):'<p class="text-center text-green-600">Perfect score!</p>'}`;
 const x=q.qs[q.i];
 return`<div class="h-2 bg-slate-200 rounded"><div class="h-2 bg-indigo-600 rounded" style="width:${q.i/q.qs.length*100}%"></div></div>
 <p class="text-xs text-slate-500 mt-1">Question ${q.i+1} of ${q.qs.length} · Score ${q.score}</p>
 <div class="max-w-xl mx-auto text-center my-6"><p class="text-lg font-medium mb-1">${esc(x.q)}</p>${x.unc?'<p class="text-xs text-amber-600 mb-2">⚠ Auto-generated with lower confidence — check against your source</p>':''}
 <div class="space-y-2 mt-4 text-left">${x.opts.map((o,k)=>{let c='border-slate-200 hover:border-indigo-400';
  if(q.sel!==null)c=k===x.a?'border-green-500 bg-green-50':k===q.sel?'border-red-500 bg-red-50':'border-slate-200 opacity-60';
  return`<button onclick="pick(${k})" class="w-full border rounded-lg px-4 py-3 text-sm bg-white ${c}">${'ABCD'[k]}. ${esc(o)}</button>`}).join('')}</div>
 ${q.sel!==null?`<p class="text-sm text-slate-600 mt-4 bg-slate-100 rounded-lg p-3 text-left">${esc(x.expl)}</p><button onclick="nextQ()" class="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg">${q.i+1>=q.qs.length?'Finish':'Next'}</button>`:''}</div>`}
const wrongHTML=w=>`<div class="border rounded-lg p-3 mb-2 bg-white text-sm"><p class="font-medium">${esc(w.q)}</p><p class="text-red-600">Your answer: ${esc(w.opts[w.chosen])}</p><p class="text-green-700">Correct: ${esc(w.opts[w.a])}</p><p class="text-slate-500">${esc(w.expl)}</p></div>`;

/* ================= 8. FLASHCARDS ================= */
function startFC(only){const r=cur();if(!r.cards.length)return;let d=[...r.cards];
 if(only&&S.fc)d=S.fc.deck.filter((_,i)=>S.fc.known[i]!==1);
 S.fc={deck:d,i:0,flip:false,known:{}};render()}
const fcGo=d=>{const f=S.fc;f.i=Math.max(0,Math.min(f.deck.length-1,f.i+d));f.flip=false;render()};
const fcMark=v=>{const f=S.fc;f.known[f.i]=v;if(f.i<f.deck.length-1){f.i++;f.flip=false}render()};
const fcShuffle=()=>{S.fc.deck=shuffle(S.fc.deck);S.fc.i=0;S.fc.known={};S.fc.flip=false;render()};
function cardsHTML(r){
 if(!r.cards.length)return'<p class="text-slate-500">No flashcards could be generated from this file (no definitions or question/answer pairs detected).</p>';
 const f=S.fc;if(!f)return`<div class="text-center py-10"><p class="mb-4 text-slate-600">${r.cards.length} cards ready.</p><button onclick="startFC()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg">Start studying</button></div>`;
 const c=f.deck[f.i],k=Object.values(f.known).filter(v=>v===1).length,rv=Object.values(f.known).filter(v=>v===0).length;
 return`<p class="text-xs text-slate-500 mb-1">Card ${f.i+1} of ${f.deck.length} · Known ${k} · To review ${rv}</p>
 <div class="h-2 bg-slate-200 rounded"><div class="h-2 bg-indigo-600 rounded" style="width:${(f.i+1)/f.deck.length*100}%"></div></div>
 <div class="card3d max-w-md mx-auto my-6"><div onclick="S.fc.flip=!S.fc.flip;render()" class="flip cursor-pointer h-56 ${f.flip?'on':''}">
  <div class="face bg-white border rounded-xl flex items-center justify-center p-6 text-center font-medium">${esc(c.q)}${c.unc?'<span class="absolute bottom-2 text-xs text-amber-600 font-normal">⚠ check manually</span>':''}</div>
  <div class="face back bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center p-6 text-center text-sm overflow-auto">${esc(c.a)}</div></div>
 <p class="text-xs text-center text-slate-400 mt-2">Tap card to flip</p></div>
 <div class="flex flex-wrap justify-center gap-2 text-sm">
  <button onclick="fcGo(-1)" class="border rounded-lg px-3 py-2 bg-white">← Prev</button>
  <button onclick="fcMark(0)" class="border border-amber-300 text-amber-700 rounded-lg px-3 py-2 bg-white">Review Again</button>
  <button onclick="fcMark(1)" class="bg-green-600 text-white rounded-lg px-3 py-2">Know It</button>
  <button onclick="fcGo(1)" class="border rounded-lg px-3 py-2 bg-white">Next →</button></div>
 <div class="flex justify-center gap-4 mt-3 text-xs text-indigo-600"><button onclick="fcShuffle()">Shuffle</button><button onclick="startFC(true)">Only unknown cards</button></div>`}

/* ================= 9. NOTES + EXPORTS ================= */
function notesBody(r){const n=r.notes,q=S.search.toLowerCase(),m=s=>!q||s.toLowerCase().includes(q);
 const sec=(t,items)=>items.length?`<h3 class="font-semibold mt-4 mb-1">${t}</h3><ul class="list-disc pl-5 text-sm space-y-1">${items.join('')}</ul>`:'';
 const html=sec('Topics',n.topics.filter(m).map(t=>`<li>${esc(t)}</li>`))+sec('Definitions',n.defs.filter(d=>m(d.term+d.def)).map(d=>`<li><b>${esc(d.term)}</b>: ${esc(d.def)}</li>`))
 +sec('Important terms',n.terms.filter(m).map(t=>`<li>${esc(t)}</li>`))+sec('Key facts',n.facts.filter(m).map(t=>`<li>${esc(t)}</li>`));
 return html||'<p class="text-slate-500 text-sm mt-4">Nothing matches (or nothing was detected in this file).</p>'}
function notesHTML(r){return`<input oninput="S.search=this.value;document.getElementById('nb').innerHTML=notesBody(cur())" value="${esc(S.search)}" placeholder="Search notes…" class="w-full border rounded-lg px-3 py-2 text-sm"><div id="nb">${notesBody(r)}</div>
 <details class="mt-4 text-sm"><summary class="cursor-pointer text-slate-500">Extracted text preview</summary><pre class="whitespace-pre-wrap bg-white border rounded-lg p-3 mt-2 text-xs">${esc(r.preview)}</pre></details>`}
function notesTXT(r){const n=r.notes,L=a=>a.map(x=>'- '+x).join('\n');
 return`STUDY NOTES: ${r.name}\n\nTOPICS\n${L(n.topics)}\n\nDEFINITIONS\n${L(n.defs.map(d=>d.term+': '+d.def))}\n\nIMPORTANT TERMS\n${L(n.terms)}\n\nKEY FACTS\n${L(n.facts)}\n`}
const base=()=>cur().name.replace(/\.[^.]+$/,'');
const csv=s=>'"'+String(s).replace(/"/g,'""')+'"';
const exp={
 txt:()=>download(base()+'-notes.txt','text/plain',notesTXT(cur())),
 qjson:()=>cur().questions.length?download(base()+'-questions.json','application/json',JSON.stringify(cur().questions.map(q=>({question:q.q,choices:q.opts,answer:q.opts[q.a],explanation:q.expl,needsReview:q.unc})),null,2)):toast('No questions to export.',true),
 fjson:()=>cur().cards.length?download(base()+'-flashcards.json','application/json',JSON.stringify(cur().cards,null,2)):toast('No flashcards to export.',true),
 fcsv:()=>cur().cards.length?download(base()+'-flashcards.csv','text/csv','Question,Answer\n'+cur().cards.map(c=>csv(c.q)+','+csv(c.a)).join('\n')):toast('No flashcards to export.',true)};

/* ================= 10. DELETE / CLEAR ================= */
async function delReviewer(id){if(!confirm('Delete this reviewer and its quiz history?'))return;
 await DB.del('reviewers',id);for(const h of S.history.filter(h=>h.rid===id))await DB.del('history',h.id);
 S.reviewers=S.reviewers.filter(r=>r.id!==id);S.history=S.history.filter(h=>h.rid!==id);S.rid=null;S.q=S.fc=null;go('reviewers')}
async function clearHistory(){if(!confirm('Clear all quiz history?'))return;await DB.clear('history');S.history=[];render()}
async function clearAll(){if(!confirm('Delete ALL saved reviewers, flashcards and history?'))return;
 await DB.clear('reviewers');await DB.clear('history');S.reviewers=[];S.history=[];S.rid=S.q=S.fc=null;go('dashboard');toast('All data cleared.')}

/* ================= 11. VIEWS ================= */
const settingsHTML=()=>{const sel=(k,opts)=>`<select onchange="saveCfg('${k}',this.value)" class="border rounded-lg px-3 py-2 text-sm bg-white w-full">${opts.map(([v,l])=>`<option value="${v}" ${cfg[k]==v?'selected':''}>${l}</option>`).join('')}</select>`;
 return`<div class="grid sm:grid-cols-3 gap-3"><label class="text-xs text-slate-500">Study mode${sel('mode',[['all','Everything'],['quiz','Quiz first'],['flashcards','Flashcards first'],['notes','Notes first']])}</label>
 <label class="text-xs text-slate-500">Difficulty${sel('diff',[['easy','Easy (recognize terms)'],['medium','Medium (mixed)'],['hard','Hard (recall definitions)']])}</label>
 <label class="text-xs text-slate-500">Questions / cards (1–50)<input type="number" min="1" max="50" value="${cfg.count}" onchange="saveCfg('count',this.value);this.value=cfg.count" class="border rounded-lg px-3 py-2 text-sm w-full"></label></div>`};
const listHTML=()=>S.reviewers.length?S.reviewers.map(r=>`<div class="bg-white border rounded-xl p-3 flex items-center justify-between gap-2 mb-2"><div class="min-w-0"><p class="font-medium truncate">${esc(r.name)}</p><p class="text-xs text-slate-500">${new Date(r.date).toLocaleString()} · ${r.questions.length} questions · ${r.cards.length} cards</p></div>
 <div class="flex gap-2 text-sm shrink-0"><button onclick="S.q=S.fc=null;go('reviewer','${r.id}','notes')" class="text-indigo-600">Open</button><button onclick="delReviewer('${r.id}')" class="text-red-600">Delete</button></div></div>`).join(''):'<p class="text-slate-500 text-sm">Nothing saved yet. Upload a file on the Dashboard.</p>';
const V={
 dashboard:()=>`<h1 class="text-2xl font-bold mb-4">Dashboard</h1>
 <label ondragover="event.preventDefault()" ondrop="event.preventDefault();handleFiles(event.dataTransfer.files)" class="block border-2 border-dashed border-indigo-300 bg-white rounded-xl p-10 text-center cursor-pointer hover:bg-indigo-50">
  <input type="file" multiple class="hidden" accept=".pdf,.txt,.docx,.pptx,.jpg,.jpeg,.png,.webp" onchange="handleFiles(this.files);this.value=''">
  <div class="text-3xl mb-2">⬆️</div><p class="font-medium">Drag &amp; drop a study file, or click to browse</p><p class="text-xs text-slate-500 mt-1">PDF, DOCX, PPTX, TXT, JPG, PNG, WEBP · processed in your browser</p>
  ${S.busy?`<p id="busy" class="text-indigo-600 text-sm mt-3">${esc(S.busy)}</p>`:''}</label>
 <div class="bg-white border rounded-xl p-4 mt-4">${settingsHTML()}</div>
 <h2 class="font-semibold mt-6 mb-2">Recent reviewers</h2>${listHTML()}`,
 reviewers:()=>`<h1 class="text-2xl font-bold mb-4">My Reviewers</h1>${listHTML()}`,
 flashcards:()=>`<h1 class="text-2xl font-bold mb-4">Flashcards</h1>${S.reviewers.filter(r=>r.cards.length).map(r=>`<div class="bg-white border rounded-xl p-3 flex justify-between items-center mb-2"><span class="truncate">${esc(r.name)} <span class="text-xs text-slate-500">(${r.cards.length} cards)</span></span><button onclick="S.fc=null;go('reviewer','${r.id}','cards')" class="text-indigo-600 text-sm">Study</button></div>`).join('')||'<p class="text-slate-500 text-sm">No flashcards yet.</p>'}`,
 history:()=>`<div class="flex justify-between items-center mb-4"><h1 class="text-2xl font-bold">Quiz History</h1>${S.history.length?'<button onclick="clearHistory()" class="text-sm text-red-600">Clear history</button>':''}</div>
 ${[...S.history].sort((a,b)=>b.date-a.date).map(h=>`<div class="bg-white border rounded-xl p-3 mb-2 flex justify-between"><div><p class="font-medium">${esc(h.name)}</p><p class="text-xs text-slate-500">${new Date(h.date).toLocaleString()} · ${h.wrong.length} missed</p></div><div class="font-bold text-indigo-600">${h.score}/${h.total}</div></div>`).join('')||'<p class="text-slate-500 text-sm">No quizzes taken yet.</p>'}`,
 settings:()=>`<h1 class="text-2xl font-bold mb-4">Settings</h1><div class="bg-white border rounded-xl p-4">${settingsHTML()}<p class="text-xs text-slate-500 mt-3">Settings apply to files uploaded next.</p></div>
 <div class="bg-white border rounded-xl p-4 mt-4"><p class="font-medium mb-2">Data</p><p class="text-sm text-slate-500 mb-3">Everything is stored only in this browser (IndexedDB).</p><button onclick="clearAll()" class="text-sm bg-red-600 text-white px-4 py-2 rounded-lg">Clear all data</button></div>`,
 reviewer:()=>{const r=cur();if(!r)return'<p>Reviewer not found.</p>';
  const tabs=[['notes','Notes'],['quiz','Quiz'],['cards','Flashcards']];
  return`<div class="flex justify-between items-start gap-2 mb-2"><div class="min-w-0"><h1 class="text-xl font-bold truncate">${esc(r.name)}</h1><p class="text-xs text-slate-500">${r.chars.toLocaleString()} characters extracted</p></div><button onclick="delReviewer('${r.id}')" class="text-sm text-red-600 noprint">Delete</button></div>
  ${r.warnings.map(w=>`<p class="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 mb-2">⚠ ${esc(w)}</p>`).join('')}
  <div class="flex gap-1 border-b mb-4 noprint">${tabs.map(([k,l])=>`<button onclick="S.tab='${k}';render()" class="px-4 py-2 text-sm ${S.tab===k?'border-b-2 border-indigo-600 text-indigo-600 font-medium':'text-slate-500'}">${l}</button>`).join('')}</div>
  ${S.tab==='notes'?notesHTML(r):S.tab==='quiz'?quizHTML(r):cardsHTML(r)}
  <div class="flex flex-wrap gap-2 mt-6 pt-4 border-t text-xs noprint"><span class="text-slate-500 self-center">Export:</span>
   ${[['txt','Notes TXT'],['qjson','Questions JSON'],['fcsv','Flashcards CSV'],['fjson','Flashcards JSON']].map(([k,l])=>`<button onclick="exp.${k}()" class="border rounded-lg px-3 py-1.5 bg-white">${l}</button>`).join('')}
   <button onclick="window.print()" class="border rounded-lg px-3 py-1.5 bg-white">Print</button></div>`}
};
function render(){
 const items=[['dashboard','Dashboard'],['reviewers','My Reviewers'],['flashcards','Flashcards'],['history','Quiz History'],['settings','Settings']];
 const active=S.view==='reviewer'?'reviewers':S.view;
 document.getElementById('nav').innerHTML=items.map(([k,l])=>`<button onclick="go('${k}')" class="whitespace-nowrap text-left px-3 py-2 rounded-lg ${active===k?'bg-indigo-50 text-indigo-700 font-medium':'text-slate-600 hover:bg-slate-100'}">${l}</button>`).join('');
 document.getElementById('app').innerHTML=V[S.view]();
}

/* ================= 12. START ================= */
(async()=>{try{await DB.open();S.reviewers=(await DB.all('reviewers')).sort((a,b)=>b.date-a.date);S.history=await DB.all('history')}
 catch(e){toast('Local storage (IndexedDB) is unavailable. Nothing will be saved.',true)}render()})();
