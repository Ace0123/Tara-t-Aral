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

