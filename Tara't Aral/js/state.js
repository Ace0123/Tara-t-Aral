/* ================= 5. STATE ================= */
let cfg={mode:'all',diff:'medium',count:10,skipChoice:true,skipFront:true};
try{Object.assign(cfg,JSON.parse(localStorage.getItem('sb_cfg')||'{}'))}catch(e){}
let S={edit:false,view:'dashboard',rid:null,tab:'notes',reviewers:[],history:[],busy:'',q:null,fc:null,search:''};
const cur=()=>S.reviewers.find(r=>r.id===S.rid);
const go=(v,rid,tab)=>{S.edit=false;S.view=v;if(rid)S.rid=rid;if(tab)S.tab=tab;render()};
function toggleCfg(k){saveCfg(k,cfg[k]===false);render()} // flips an ON/OFF setting
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

/* ================= 10. DELETE / CLEAR ================= */
async function delReviewer(id){if(!confirm('Delete this reviewer and its quiz history?'))return;
 await DB.del('reviewers',id);for(const h of S.history.filter(h=>h.rid===id))await DB.del('history',h.id);
 S.reviewers=S.reviewers.filter(r=>r.id!==id);S.history=S.history.filter(h=>h.rid!==id);S.rid=null;S.q=S.fc=null;go('reviewers')}
async function clearHistory(){if(!confirm('Clear all quiz history?'))return;await DB.clear('history');S.history=[];render()}
async function clearAll(){if(!confirm('Delete ALL saved reviewers, flashcards and history?'))return;
 await DB.clear('reviewers');await DB.clear('history');S.reviewers=[];S.history=[];S.rid=S.q=S.fc=null;go('dashboard');toast('All data cleared.')}

