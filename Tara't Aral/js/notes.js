/* ================= 9. NOTES + EXPORTS ================= */
function notesBody(r){const n=r.notes,q=S.search.toLowerCase(),m=s=>!q||s.toLowerCase().includes(q);
 const sec=(t,items)=>items.length?`<h3 class="font-semibold mt-4 mb-1">${t}</h3><ul class="list-disc pl-5 text-sm space-y-1">${items.join('')}</ul>`:'';
 const html=sec('Topics',n.topics.filter(m).map(t=>`<li>${esc(t)}</li>`))+sec('Definitions',n.defs.filter(d=>m(d.term+d.def)).map(d=>`<li><b>${esc(d.term)}</b>: ${esc(d.def)}</li>`))
 +sec('Important terms',n.terms.filter(m).map(t=>`<li>${esc(t)}</li>`))+sec('Key facts',n.facts.filter(m).map(t=>`<li>${esc(t)}</li>`));
 return html||'<p class="text-slate-500 text-sm mt-4">Nothing matches (or nothing was detected in this file).</p>'}
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

