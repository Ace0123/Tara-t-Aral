/* ================= TYPING QUIZ ================= */
// You type the answer from memory. The app suggests whether it matches, and you can overrule it.
// Uses the reviewer's flashcards (edit them in the Flashcards tab).
const tyNorm=s=>s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const TY_STOP=new Set('the and for with that this from into are was were has have its their than then them they your about which what when where'.split(' '));
// Approximate check: exact match, or at least 70% of the answer's key words appear in what you typed.
function tyJudge(typed,ans){
 const t=tyNorm(typed),a=tyNorm(ans);if(!t||!a)return false;if(t===a)return true;
 const key=a.split(' ').filter(w=>w.length>2&&!TY_STOP.has(w));if(!key.length)return false;
 const typedWords=t.split(' ');
 const hit=key.filter(w=>typedWords.some(x=>x===w||(x.length>3&&w.length>3&&(x.startsWith(w.slice(0,-1))||w.startsWith(x.slice(0,-1)))))).length;
 return hit/key.length>=0.7}

function startTyping(onlyMissed){
 const r=cur();
 const src=onlyMissed&&S.ty?S.ty.missed:r.cards;
 const items=src.map(c=>({q:c.q,a:c.a}));if(!items.length)return;
 S.ty={rid:r.id,items:shuffle(items),i:0,res:null,score:0,missed:[],done:false};render();
 setTimeout(()=>{const e=$id('tyin');if(e)e.focus()},0)}
function tyCheck(){
 const t=S.ty,v=$id('tyin').value.trim();if(!v)return toast('Type an answer first, or press "I don\'t know".',true);
 const ok=tyJudge(v,t.items[t.i].a);t.res={typed:v,auto:ok,final:ok};render()}
function tyGiveUp(){S.ty.res={typed:'',auto:false,final:false};render()}
function tyOverride(v){S.ty.res.final=v;render()}
async function tyNext(){
 const t=S.ty,it=t.items[t.i];
 if(t.res.final)t.score++;else t.missed.push({q:it.q,a:it.a,typed:t.res.typed});
 t.res=null;t.i++;
 if(t.i>=t.items.length){t.done=true;
  await DB.put('history',{id:uid(),rid:t.rid,name:cur().name,mode:'typing',date:Date.now(),score:t.score,total:t.items.length,wrong:t.missed});
  S.history=await DB.all('history')}
 render();setTimeout(()=>{const e=$id('tyin');if(e)e.focus()},0)}

function typingHTML(r){
 if(S.ty&&S.ty.rid!==r.id)S.ty=null;
 if(!r.cards.length)return'<p class="text-slate-500">No flashcards to practice with yet. Add some in the Flashcards tab (✏️ Edit flashcards), then come back.</p>';
 const t=S.ty;
 if(!t)return`<div class="text-center py-10"><p class="mb-1 text-slate-600">${r.cards.length} cards ready for typing practice.</p><p class="text-xs text-slate-500 mb-4 max-w-md mx-auto">You type each answer from memory. The app checks it approximately, and you can overrule the result. Edit the cards in the Flashcards tab.</p><button onclick="startTyping()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg">Start typing quiz</button></div>`;
 if(t.done)return`<div class="text-center py-6"><div class="text-4xl font-bold text-indigo-600">${t.score}/${t.items.length}</div><p class="text-slate-500 mb-4">${Math.round(t.score/t.items.length*100)}% correct · saved to Quiz History</p>
  <div class="flex justify-center gap-2 text-sm"><button onclick="startTyping()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Retake all</button>${t.missed.length?'<button onclick="startTyping(true)" class="border rounded-lg px-4 py-2 bg-white">Retry missed only</button>':''}</div></div>
  ${t.missed.length?'<h3 class="font-semibold mb-2">Review missed answers</h3>'+t.missed.map(m=>`<div class="border rounded-lg p-3 mb-2 bg-white text-sm"><p class="font-medium">${esc(m.q)}</p><p class="text-red-600">Your answer: ${esc(m.typed||'(no answer)')}</p><p class="text-green-700">Correct: ${esc(m.a)}</p></div>`).join(''):'<p class="text-center text-green-600">Perfect score!</p>'}`;
 const it=t.items[t.i],res=t.res;
 const head=`<div class="h-2 bg-slate-200 rounded"><div class="h-2 bg-indigo-600 rounded" style="width:${t.i/t.items.length*100}%"></div></div><p class="text-xs text-slate-500 mt-1">Question ${t.i+1} of ${t.items.length} · Score ${t.score}</p>
  <div class="max-w-xl mx-auto text-center my-6"><p class="text-lg font-medium mb-4">${esc(it.q)}</p>`;
 if(!res)return head+`<textarea id="tyin" rows="3" placeholder="Type your answer…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();tyCheck()}" class="w-full border rounded-lg p-3 text-sm text-left"></textarea>
  <div class="flex justify-center gap-2 mt-3 text-sm"><button onclick="tyCheck()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg">Check answer</button><button onclick="tyGiveUp()" class="border rounded-lg px-4 py-2 bg-white">I don't know</button></div><p class="text-xs text-slate-400 mt-2">Enter to check · Shift+Enter for a new line</p></div>`;
 return head+`<div class="text-left space-y-2 text-sm"><p class="border rounded-lg p-3 bg-white"><span class="text-xs text-slate-500">Your answer</span><br>${esc(res.typed||'(no answer)')}</p>
  <p class="border border-green-300 rounded-lg p-3 bg-green-50"><span class="text-xs text-slate-500">Correct answer</span><br>${esc(it.a)}</p></div>
  <p class="mt-3 text-sm ${res.final?'text-green-700':'text-red-600'}">${res.final?'✓ Counted as correct':'✗ Counted as incorrect'} <span class="text-xs text-slate-500">(${res.auto?'auto-check: looks like a match':'auto-check: no clear match'}. The check is approximate, so you decide.)</span></p>
  <div class="flex flex-wrap justify-center gap-2 mt-3 text-sm"><button onclick="tyOverride(${!res.final})" class="border rounded-lg px-4 py-2 bg-white">Mark as ${res.final?'incorrect':'correct'}</button><button onclick="tyNext()" class="bg-indigo-600 text-white px-5 py-2 rounded-lg">${t.i+1>=t.items.length?'Finish':'Next'}</button></div></div>`}
