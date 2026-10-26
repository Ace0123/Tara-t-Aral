/* ================= 11. VIEWS ================= */
const switchHTML=(k,label,desc)=>{const on=cfg[k]!==false;return`<div class="flex items-start gap-3 mt-4"><button type="button" role="switch" aria-checked="${on}" onclick="toggleCfg('${k}')" class="relative shrink-0 w-11 h-6 rounded-full ${on?'bg-indigo-600':'bg-slate-300'}"><span class="absolute top-0.5 ${on?'left-5':'left-0.5'} w-5 h-5 bg-white rounded-full"></span></button><div><p class="text-sm font-medium">${label}: ${on?'ON':'OFF'}</p><p class="text-xs text-slate-500">${desc}</p></div></div>`};
const settingsHTML=()=>{const sel=(k,opts)=>`<select onchange="saveCfg('${k}',this.value)" class="border rounded-lg px-3 py-2 text-sm bg-white w-full">${opts.map(([v,l])=>`<option value="${v}" ${cfg[k]==v?'selected':''}>${l}</option>`).join('')}</select>`;
 return`<div class="grid sm:grid-cols-3 gap-3"><label class="text-xs text-slate-500">Study mode${sel('mode',[['all','Everything'],['quiz','Quiz first'],['flashcards','Flashcards first'],['notes','Notes first']])}</label>
 <label class="text-xs text-slate-500">Difficulty${sel('diff',[['easy','Easy (recognize terms)'],['medium','Medium (mixed)'],['hard','Hard (recall definitions)']])}</label>
 <label class="text-xs text-slate-500">Questions / cards (1–50)<input type="number" min="1" max="50" value="${cfg.count}" onchange="saveCfg('count',this.value);this.value=cfg.count" class="border rounded-lg px-3 py-2 text-sm w-full"></label></div>
 ${switchHTML('skipFront','Ignore instructions, contents and study tips','ON: lines like "How to use this reviewer", the contents list, "Study tip: …" and directions such as "Read…" or "Memorize…" are not turned into notes or questions (recommended).')}
 ${switchHTML('skipChoice','Skip multiple-choice-looking passages','ON: passages that already contain A) B) C) choices are not turned into notes or fill-in-the-blank questions (recommended).')}
 <p class="text-xs text-slate-500 mt-2">Both settings apply to the next file you upload. OFF means that text is processed like normal study content.</p>`};
const listHTML=()=>S.reviewers.length?S.reviewers.map(r=>`<div class="bg-white border rounded-xl p-3 flex items-center justify-between gap-2 mb-2"><div class="min-w-0"><p class="font-medium truncate">${esc(r.name)}</p><p class="text-xs text-slate-500">${new Date(r.date).toLocaleString()} · ${r.questions.length} questions · ${r.cards.length} cards</p></div>
 <div class="flex gap-2 text-sm shrink-0"><button onclick="S.q=S.fc=null;go('reviewer','${r.id}','notes')" class="text-indigo-600">Open</button><button onclick="delReviewer('${r.id}')" class="text-red-600">Delete</button></div></div>`).join(''):'<p class="text-slate-500 text-sm">Nothing saved yet. Upload a file on the Dashboard.</p>';
const V={
 dashboard:()=>`<h1 class="text-2xl font-bold mb-4">Dashboard</h1>
 <label ondragover="event.preventDefault()" ondrop="event.preventDefault();handleFiles(event.dataTransfer.files)" class="block border-2 border-dashed border-indigo-300 bg-white rounded-xl p-10 text-center cursor-pointer hover:bg-indigo-50">
  <input type="file" multiple class="hidden" accept=".pdf,.txt,.docx,.pptx,.jpg,.jpeg,.png,.webp" onchange="handleFiles(this.files);this.value=''">
  <div class="text-3xl mb-2">⬆️</div><p class="font-medium">Drag &amp; drop a study file, or click to browse</p><p class="text-xs text-slate-500 mt-1">PDF, DOCX, PPTX, TXT, JPG, PNG, WEBP · processed in your browser</p>
  ${S.busy?`<p id="busy" class="text-indigo-600 text-sm mt-3">${esc(S.busy)}</p>`:''}</label>
 <div class="bg-white border rounded-xl p-4 mt-4">${settingsHTML()}</div>
 <div class="bg-white border rounded-xl p-4 mt-4"><p class="font-medium mb-1">Or create your own quiz</p><p class="text-xs text-slate-500 mb-3">No file needed. Write your own questions, choices and answers.</p>
 <div class="flex gap-2"><input id="newname" maxlength="80" placeholder="Quiz title (e.g. Biology Midterm)" onkeydown="if(event.key==='Enter')startManual()" class="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm"><button onclick="startManual()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">Create quiz</button></div>
 <p class="text-xs text-slate-500 mt-3">Got a quiz file from someone? <label class="text-indigo-600 cursor-pointer underline">Import it<input type="file" accept=".json,application/json" class="hidden" onchange="importFile(this)"></label> · Opened a shared link? It imports automatically.</p></div>
 <h2 class="font-semibold mt-6 mb-2">Recent reviewers</h2>${listHTML()}`,
 reviewers:()=>`<h1 class="text-2xl font-bold mb-4">My Reviewers</h1>${listHTML()}`,
 flashcards:()=>`<h1 class="text-2xl font-bold mb-4">Flashcards</h1>${S.reviewers.filter(r=>r.cards.length).map(r=>`<div class="bg-white border rounded-xl p-3 flex justify-between items-center mb-2"><span class="truncate">${esc(r.name)} <span class="text-xs text-slate-500">(${r.cards.length} cards)</span></span><button onclick="S.fc=null;go('reviewer','${r.id}','cards')" class="text-indigo-600 text-sm">Study</button></div>`).join('')||'<p class="text-slate-500 text-sm">No flashcards yet.</p>'}`,
 history:()=>`<div class="flex justify-between items-center mb-4"><h1 class="text-2xl font-bold">Quiz History</h1>${S.history.length?'<button onclick="clearHistory()" class="text-sm text-red-600">Clear history</button>':''}</div>
 ${[...S.history].sort((a,b)=>b.date-a.date).map(h=>`<div class="bg-white border rounded-xl p-3 mb-2 flex justify-between"><div><p class="font-medium">${esc(h.name)}${h.mode==='typing'?' <span class="text-xs text-indigo-600">· typing</span>':''}</p><p class="text-xs text-slate-500">${new Date(h.date).toLocaleString()} · ${h.wrong.length} missed</p></div><div class="font-bold text-indigo-600">${h.score}/${h.total}</div></div>`).join('')||'<p class="text-slate-500 text-sm">No quizzes taken yet.</p>'}`,
 settings:()=>`<h1 class="text-2xl font-bold mb-4">Settings</h1><div class="bg-white border rounded-xl p-4">${settingsHTML()}<p class="text-xs text-slate-500 mt-3">Settings apply to files uploaded next.</p></div>
 <div class="bg-white border rounded-xl p-4 mt-4"><p class="font-medium mb-2">Data</p><p class="text-sm text-slate-500 mb-3">Everything is stored only in this browser (IndexedDB).</p><button onclick="clearAll()" class="text-sm bg-red-600 text-white px-4 py-2 rounded-lg">Clear all data</button></div>`,
 reviewer:()=>{const r=cur();if(!r)return'<p>Reviewer not found.</p>';
  const tabs=[['notes','Notes'],['quiz','Quiz'],['cards','Flashcards'],['typing','Typing']];
  return`<div class="flex justify-between items-start gap-2 mb-2"><div class="min-w-0"><h1 class="text-xl font-bold truncate">${esc(r.name)}</h1><p class="text-xs text-slate-500">${r.shared?'Shared quiz':r.manual?'Created manually':r.chars.toLocaleString()+' characters extracted'}</p></div><button onclick="delReviewer('${r.id}')" class="text-sm text-red-600 noprint">Delete</button></div>
  ${r.warnings.map(w=>`<p class="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 mb-2">⚠ ${esc(w)}</p>`).join('')}
  <div class="flex gap-1 border-b mb-4 noprint">${tabs.map(([k,l])=>`<button onclick="S.tab='${k}';S.edit=false;render()" class="px-4 py-2 text-sm ${S.tab===k?'border-b-2 border-indigo-600 text-indigo-600 font-medium':'text-slate-500'}">${l}</button>`).join('')}</div>
  ${tabBody(r)}
  <div class="flex flex-wrap gap-2 mt-6 pt-4 border-t text-xs noprint"><span class="text-slate-500 self-center">Export:</span>
   ${[['txt','Notes TXT'],['qjson','Questions JSON'],['fcsv','Flashcards CSV'],['fjson','Flashcards JSON']].map(([k,l])=>`<button onclick="exp.${k}()" class="border rounded-lg px-3 py-1.5 bg-white">${l}</button>`).join('')}
   <button onclick="window.print()" class="border rounded-lg px-3 py-1.5 bg-white">Print</button>
   <span class="text-slate-300 self-center">|</span><span class="text-slate-500 self-center">Share:</span><button onclick="shareLink()" class="border border-indigo-300 text-indigo-700 rounded-lg px-3 py-1.5 bg-white">🔗 Link</button><button onclick="shareFile()" class="border border-indigo-300 text-indigo-700 rounded-lg px-3 py-1.5 bg-white">File</button></div>`}
};
function render(){
 const items=[['dashboard','Dashboard'],['reviewers','My Reviewers'],['flashcards','Flashcards'],['history','Quiz History'],['settings','Settings']];
 const active=S.view==='reviewer'?'reviewers':S.view;
 document.getElementById('nav').innerHTML=items.map(([k,l])=>`<button onclick="go('${k}')" class="whitespace-nowrap text-left px-3 py-2 rounded-lg ${active===k?'bg-indigo-50 text-indigo-700 font-medium':'text-slate-600 hover:bg-slate-100'}">${l}</button>`).join('');
 document.getElementById('app').innerHTML=V[S.view]();
}

