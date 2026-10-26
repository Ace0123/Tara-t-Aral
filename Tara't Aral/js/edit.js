/* ================= 8b. EDIT QUESTIONS, ANSWERS & FLASHCARDS ================= */
const $id=id=>document.getElementById(id);
function tabBody(r){
 if(S.tab==='notes')return notesHTML(r);
 if(S.tab==='typing')return typingHTML(r);
 const q=S.tab==='quiz';
 if(S.edit)return q?qEditHTML(r):cEditHTML(r);
 return`<div class="text-right mb-2 noprint"><button onclick="S.edit=true;render()" class="text-xs text-indigo-600 border rounded-lg px-3 py-1 bg-white">✏️ Edit ${q?'questions &amp; answers':'flashcards'}</button></div>`+(q?quizHTML(r):cardsHTML(r))}
async function cancelEdit(){S.edit=false;const f=(await DB.all('reviewers')).find(x=>x.id===S.rid);if(f)S.reviewers=S.reviewers.map(x=>x.id===f.id?f:x);render()}
const editBar=(add,save)=>`<div class="flex flex-wrap gap-2 sticky bottom-2 bg-slate-50/90 py-2 text-sm"><button onclick="${add}()" class="border rounded-lg px-3 py-2 bg-white">+ Add</button><button onclick="${save}()" class="bg-indigo-600 text-white rounded-lg px-4 py-2">Save changes</button><button onclick="cancelEdit()" class="border rounded-lg px-3 py-2 bg-white">Cancel</button></div>`;
// --- questions ---
function qEditHTML(r){
 const miss=r.questions.filter(x=>x.a===null).length;
 return`${miss?keyBox(miss):''}<p class="text-xs text-slate-500 mb-3">Edit the question, the choices and the explanation. Questions with "No answer set" are skipped in quizzes. Click Save changes when done.</p>
 ${r.questions.map((x,i)=>`<div class="bg-white border rounded-lg p-3 mb-3 text-sm"><div class="flex justify-between mb-1"><span class="text-xs text-slate-500">Question ${i+1}</span><button onclick="delQ(${i})" class="text-xs text-red-600">Delete</button></div>
  <textarea id="eq-${i}" rows="2" placeholder="Question" class="w-full border rounded p-2 mb-2">${esc(x.q)}</textarea>
  <p class="text-xs text-slate-500 mb-1">Select the circle next to the correct answer:</p>
  ${x.opts.map((o,k)=>`<label class="optrow flex items-center gap-2 mb-1 px-1 py-0.5"><input type="radio" name="ea-${i}" value="${k}" ${x.a===k?'checked':''}><span class="text-xs text-slate-500 w-4">${'ABCDEF'[k]}</span><input id="eo-${i}-${k}" value="${esc(o)}" placeholder="Choice" class="flex-1 border rounded px-2 py-1"><button type="button" onclick="delOpt(${i},${k})" title="Remove this choice" class="text-slate-400 hover:text-red-600 px-1">✕</button></label>`).join('')}
  ${x.opts.length<6?`<button type="button" onclick="addOpt(${i})" class="text-xs text-indigo-600 mb-2">+ Add choice</button>`:''}
  <label class="flex items-center gap-2 text-xs text-slate-500 mb-2"><input type="radio" name="ea-${i}" value="-1" ${x.a===null?'checked':''}> No answer set</label>
  <input id="ee-${i}" value="${esc(x.expl||'')}" placeholder="Explanation (optional)" class="w-full border rounded px-2 py-1 text-xs"></div>`).join('')||'<p class="text-slate-500 text-sm mb-3">No questions yet. Use "+ Add".</p>'}
 ${editBar('addQ','saveQ')}`}
function collectQ(){cur().questions.forEach((x,i)=>{if(!$id('eq-'+i))return;
 x.q=$id('eq-'+i).value.trim();x.opts=x.opts.map((_,k)=>$id(`eo-${i}-${k}`).value.trim());
 const c=document.querySelector(`input[name="ea-${i}"]:checked`);x.a=c&&+c.value>=0?+c.value:null;x.expl=$id('ee-'+i).value.trim()})}
function addOpt(i){collectQ();const x=cur().questions[i];if(x.opts.length<6)x.opts.push('');render()}
function delOpt(i,k){collectQ();const x=cur().questions[i];if(x.opts.length<=2)return toast('A question needs at least 2 choices.',true);
 x.opts.splice(k,1);if(x.a===k)x.a=null;else if(x.a!==null&&x.a>k)x.a--;render()}
function addQ(){collectQ();cur().questions.push({num:null,q:'',opts:['','','',''],a:null,expl:'',unc:false,imported:true});render()}
function delQ(i){collectQ();if(!confirm('Delete this question?'))return;cur().questions.splice(i,1);render()}
async function saveQ(){collectQ();const r=cur();
 for(const[i,x]of r.questions.entries())if(!x.q||x.opts.some(o=>!o))return toast(`Question ${i+1}: fill in the question and every choice (or delete it).`,true);
 r.questions.forEach(x=>{x.unc=false;if(x.a!==null&&!x.expl)x.expl='Answer set by you.'});
 // Keep flashcards (and the typing quiz) in step with answered questions
 r.questions.forEach(x=>{if(!x.qid)x.qid=uid();
  let c=r.cards.find(c=>c.qid===x.qid)||r.cards.find(c=>!c.qid&&c.q===x.q);
  if(x.a===null){if(c&&c.qid)r.cards.splice(r.cards.indexOf(c),1);return}
  const ans=x.opts[x.a];if(c){c.q=x.q;c.a=ans;c.qid=x.qid}else r.cards.push({q:x.q,a:ans,unc:false,qid:x.qid})});
 r.cards=r.cards.filter(c=>!c.qid||r.questions.some(x=>x.qid===c.qid)); // drop cards of deleted questions
 S.fc=S.ty=null;
 await DB.put('reviewers',r);S.q=null;S.edit=false;toast('Questions saved.');render()}
// --- flashcards ---
function cEditHTML(r){
 return`<p class="text-xs text-slate-500 mb-3">Edit the front (question) and back (answer) of each card.</p>
 ${r.cards.map((c,i)=>`<div class="bg-white border rounded-lg p-3 mb-3 text-sm"><div class="flex justify-between mb-1"><span class="text-xs text-slate-500">Card ${i+1}</span><button onclick="delC(${i})" class="text-xs text-red-600">Delete</button></div>
  <textarea id="ecq-${i}" rows="2" placeholder="Front / question" class="w-full border rounded p-2 mb-2">${esc(c.q)}</textarea>
  <textarea id="eca-${i}" rows="2" placeholder="Back / answer" class="w-full border rounded p-2">${esc(c.a)}</textarea></div>`).join('')||'<p class="text-slate-500 text-sm mb-3">No cards yet. Use "+ Add".</p>'}
 ${editBar('addC','saveC')}`}
function collectC(){cur().cards.forEach((c,i)=>{if(!$id('ecq-'+i))return;c.q=$id('ecq-'+i).value.trim();c.a=$id('eca-'+i).value.trim()})}
function addC(){collectC();cur().cards.push({q:'',a:'',unc:false});render()}
function delC(i){collectC();if(!confirm('Delete this card?'))return;cur().cards.splice(i,1);render()}
async function saveC(){collectC();const r=cur();
 for(const[i,c]of r.cards.entries())if(!c.q||!c.a)return toast(`Card ${i+1}: fill in both sides (or delete it).`,true);
 r.cards.forEach(c=>c.unc=false);await DB.put('reviewers',r);S.fc=null;S.ty=null;S.edit=false;toast('Flashcards saved.');render()}

