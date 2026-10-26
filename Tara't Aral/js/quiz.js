/* ================= 7. QUIZ ================= */
function startQuiz(){const r=cur(),ok=r.questions.filter(x=>x.a!==null);if(!ok.length)return;S.q={qs:shuffle(ok),i:0,sel:null,wrong:[],score:0,done:false};render()}
function pick(k){const q=S.q;if(q.sel!==null)return;q.sel=k;const x=q.qs[q.i];if(k===x.a)q.score++;else q.wrong.push({...x,chosen:k});render()}
async function applyKey(){if(S.edit)collectQ();const r=cur(),map=parseKey(document.getElementById('keytxt').value);let n=0;
 r.questions.forEach(x=>{if(x.a===null&&map[x.num]!==undefined&&map[x.num]<x.opts.length){x.a=map[x.num];x.expl='Answer taken from the answer key you provided.';n++;r.cards.push({q:x.q,a:x.opts[x.a],unc:false})}});
 if(!n)return toast('No matching answers found. Use a format like 1-B, 2-A, 3-C.',true);
 if(!S.edit)await DB.put('reviewers',r); // in edit mode, Save changes stores it
 S.q=S.fc=null;toast(`Applied ${n} answers.`+(S.edit?' Click Save changes to keep them.':''));render()}
const keyBox=m=>`<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm"><p class="font-medium text-amber-900">${m} question(s) have no answer key</p><p class="text-xs text-amber-800 mb-2">Your file has the questions and choices but not the answers. I can't tell which choice is correct, and I won't guess. Paste your answer key (for example: 1-B, 2-A, 3-C, or one per line like "1. B").</p><textarea id="keytxt" rows="3" class="w-full border rounded-lg p-2 text-xs"></textarea><button onclick="applyKey()" class="mt-2 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs">Apply answer key</button></div>`;
async function nextQ(){const q=S.q;q.i++;q.sel=null;
 if(q.i>=q.qs.length){q.done=true;
  await DB.put('history',{id:uid(),rid:S.rid,name:cur().name,date:Date.now(),score:q.score,total:q.qs.length,wrong:q.wrong});S.history=await DB.all('history')}
 render()}
function quizHTML(r){
 if(!r.questions.length&&r.manual)return'<p class="text-slate-500">No questions yet. Click ✏️ Edit questions &amp; answers to write your own.</p>';
 if(!r.questions.length)return'<p class="text-slate-500">No questions could be generated from this file. Try a file with definitions (e.g. "Term: meaning" or "X is …") or repeated key terms.</p>';
 const miss=r.questions.filter(x=>x.a===null).length,ready=r.questions.length-miss;
 const q=S.q;if(!q)return`${miss?keyBox(miss):''}<div class="text-center py-10"><p class="mb-4 text-slate-600">${ready} question(s) ready${miss?` · ${miss} waiting for an answer key`:''}.</p>${ready?'<button onclick="startQuiz()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg">Start quiz</button>':''}</div>`;
 if(q.done)return`<div class="text-center py-6"><div class="text-4xl font-bold text-indigo-600">${q.score}/${q.qs.length}</div><p class="text-slate-500 mb-4">${Math.round(q.score/q.qs.length*100)}% correct · saved to Quiz History</p>
  <button onclick="startQuiz()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Retake</button></div>
  ${q.wrong.length?'<h3 class="font-semibold mb-2">Review incorrect answers</h3>'+q.wrong.map(w=>wrongHTML(w)).join(''):'<p class="text-center text-green-600">Perfect score!</p>'}`;
 const x=q.qs[q.i];
 return`<div class="h-2 bg-slate-200 rounded"><div class="h-2 bg-indigo-600 rounded" style="width:${q.i/q.qs.length*100}%"></div></div>
 <p class="text-xs text-slate-500 mt-1">Question ${q.i+1} of ${q.qs.length} · Score ${q.score}</p>
 <div class="max-w-xl mx-auto text-center my-6"><p class="text-lg font-medium mb-1">${esc(x.q)}</p>${x.unc?'<p class="text-xs text-amber-600 mb-2">⚠ Auto-generated with lower confidence — check against your source</p>':''}
 <div class="space-y-2 mt-4 text-left">${x.opts.map((o,k)=>{let c='border-slate-200 hover:border-indigo-400';
  if(q.sel!==null)c=k===x.a?'border-green-500 bg-green-50':k===q.sel?'border-red-500 bg-red-50':'border-slate-200 opacity-60';
  return`<button onclick="pick(${k})" class="w-full border rounded-lg px-4 py-3 text-sm bg-white ${c}">${'ABCDEF'[k]}. ${esc(o)}</button>`}).join('')}</div>
 ${q.sel!==null?`<p class="text-sm text-slate-600 mt-4 bg-slate-100 rounded-lg p-3 text-left">${esc(x.expl)}</p><button onclick="nextQ()" class="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg">${q.i+1>=q.qs.length?'Finish':'Next'}</button>`:''}</div>`}
const wrongHTML=w=>`<div class="border rounded-lg p-3 mb-2 bg-white text-sm"><p class="font-medium">${esc(w.q)}</p><p class="text-red-600">Your answer: ${esc(w.opts[w.chosen])}</p><p class="text-green-700">Correct: ${esc(w.opts[w.a])}</p><p class="text-slate-500">${esc(w.expl)}</p></div>`;

