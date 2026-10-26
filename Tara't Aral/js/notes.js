/* ================= 9. NOTES + EXPORTS ================= */
function notesBody(r){const n=r.notes,q=S.search.toLowerCase(),m=s=>!q||s.toLowerCase().includes(q);
 const x=(k,i)=>`<button onclick="delNote('${k}',${i})" title="Remove from notes" class="ml-1 text-slate-400 hover:text-red-600 noprint">✕</button>`;
 const sec=(t,k,arr,txt,fmt)=>{const li=arr.map((v,i)=>m(txt(v))?`<li>${fmt(v)}${x(k,i)}</li>`:'').join('');
  return li?`<h3 class="font-semibold mt-4 mb-1">${t}</h3><ul class="list-disc pl-5 text-sm space-y-1">${li}</ul>`:''};
 const html=sec('Topics','topics',n.topics,t=>t,esc)+sec('Definitions','defs',n.defs,d=>d.term+d.def,d=>`<b>${esc(d.term)}</b>: ${esc(d.def)}`)
 +sec('Important terms','terms',n.terms,t=>t,esc)+sec('Key facts','facts',n.facts,t=>t,esc);
 return html||'<p class="text-slate-500 text-sm mt-4">Nothing matches (or nothing was detected in this file).</p>'}
async function delNote(k,i){const r=cur();r.notes[k].splice(i,1);await DB.put('reviewers',r);document.getElementById('nb').innerHTML=notesBody(r)} // removes one note item (questions are not affected)
function notesHTML(r){return`<input oninput="S.search=this.value;document.getElementById('nb').innerHTML=notesBody(cur())" value="${esc(S.search)}" placeholder="Search notes…" class="w-full border rounded-lg px-3 py-2 text-sm"><div id="nb">${notesBody(r)}</div>
 ${r.preview?`<details class="mt-4 text-sm"><summary class="cursor-pointer text-slate-500">Extracted text preview</summary><pre class="whitespace-pre-wrap bg-white border rounded-lg p-3 mt-2 text-xs">${esc(r.preview)}</pre></details>`:''}`}
function notesTXT(r){const n=r.notes,L=a=>a.map(x=>'- '+x).join('\n');
 return`STUDY NOTES: ${r.name}\n\nTOPICS\n${L(n.topics)}\n\nDEFINITIONS\n${L(n.defs.map(d=>d.term+': '+d.def))}\n\nIMPORTANT TERMS\n${L(n.terms)}\n\nKEY FACTS\n${L(n.facts)}\n`}
const base=()=>cur().name.replace(/\.[^.]+$/,'');
const csv=s=>'"'+String(s).replace(/"/g,'""')+'"';
const exp={
 txt:()=>download(base()+'-notes.txt','text/plain',notesTXT(cur())),
 qjson:()=>cur().questions.length?download(base()+'-questions.json','application/json',JSON.stringify(cur().questions.map(q=>({question:q.q,choices:q.opts,answer:q.a===null?null:q.opts[q.a],explanation:q.expl,needsReview:q.unc})),null,2)):toast('No questions to export.',true),
 fjson:()=>cur().cards.length?download(base()+'-flashcards.json','application/json',JSON.stringify(cur().cards,null,2)):toast('No flashcards to export.',true),
 fcsv:()=>cur().cards.length?download(base()+'-flashcards.csv','text/csv','Question,Answer\n'+cur().cards.map(c=>csv(c.q)+','+csv(c.a)).join('\n')):toast('No flashcards to export.',true)};

