/* ================= BACKUP & RESTORE ================= */
// Saves ALL your reviewers and quiz history to one file, and loads them back (e.g. on a new phone).
function normReviewer(r){ // check and tidy one reviewer from a backup file
 if(!r||typeof r.id!=='string'||typeof r.name!=='string')return null;
 const arr=a=>Array.isArray(a)?a:[],n=r.notes||{};
 const questions=arr(r.questions).filter(x=>x&&typeof x.q==='string'&&Array.isArray(x.opts)&&x.opts.length>=2&&x.opts.every(o=>typeof o==='string'))
  .map(x=>({...x,a:Number.isInteger(x.a)&&x.a>=0&&x.a<x.opts.length?x.a:null}));
 const cards=arr(r.cards).filter(c=>c&&typeof c.q==='string'&&typeof c.a==='string');
 return{...r,date:+r.date||Date.now(),chars:+r.chars||0,ocr:!!r.ocr,questions,cards,warnings:arr(r.warnings).map(String),preview:typeof r.preview==='string'?r.preview:'',
  notes:{topics:arr(n.topics).map(String),defs:arr(n.defs).filter(d=>d&&typeof d.term==='string'&&typeof d.def==='string'),terms:arr(n.terms).map(String),facts:arr(n.facts).map(String)}}}
async function exportBackup(){
 try{
  const reviewers=await DB.all('reviewers'),history=await DB.all('history');
  if(!reviewers.length&&!history.length)return toast('Nothing to back up yet.',true);
  download(`studybuddy-backup-${new Date().toISOString().slice(0,10)}.json`,'application/json',
   JSON.stringify({app:'StudyBuddy-backup',v:1,date:new Date().toISOString(),reviewers,history}));
  try{localStorage.setItem('sb_last_backup',String(Date.now()))}catch(e){}
  toast(`Backup saved: ${reviewers.length} reviewer(s), ${history.length} history entr${history.length===1?'y':'ies'}.`);render()
 }catch(e){toast('Backup failed: '+e.message,true)}}
async function importBackup(input){
 const f=input.files[0];input.value='';if(!f)return;
 try{
  if(f.size>200e6)throw new Error('File is too large.');
  let d;try{d=JSON.parse(await f.text())}catch(e){throw new Error('This is not a valid backup file.')}
  if(!d||d.app!=='StudyBuddy-backup'||!Array.isArray(d.reviewers))throw new Error('This is not a StudyBuddy backup file.');
  const revs=d.reviewers.map(normReviewer).filter(Boolean);
  const hist=(Array.isArray(d.history)?d.history:[]).filter(h=>h&&typeof h.id==='string'&&typeof h.rid==='string')
   .map(h=>({...h,name:String(h.name||''),date:+h.date||Date.now(),score:+h.score||0,total:+h.total||0,wrong:Array.isArray(h.wrong)?h.wrong:[]}));
  if(!revs.length&&!hist.length)throw new Error('The backup is empty.');
  const have=new Set(S.reviewers.map(r=>r.id)),haveH=new Set(S.history.map(h=>h.id));
  const newR=revs.filter(r=>!have.has(r.id)),newH=hist.filter(h=>!haveH.has(h.id));
  if(!newR.length&&!newH.length)return toast('Everything in this backup is already in the app.');
  if(!confirm(`Add ${newR.length} reviewer(s) and ${newH.length} history entr${newH.length===1?'y':'ies'} from this backup?\n${revs.length-newR.length} reviewer(s) already here will be skipped.`))return;
  for(const r of newR)await DB.put('reviewers',r);
  for(const h of newH)await DB.put('history',h);
  S.reviewers=(await DB.all('reviewers')).sort((a,b)=>b.date-a.date);S.history=await DB.all('history');
  toast(`Restored ${newR.length} reviewer(s) and ${newH.length} history entr${newH.length===1?'y':'ies'}.`);render()
 }catch(e){toast('Could not restore: '+e.message,true)}}
function lastBackupText(){let t=null;try{t=+localStorage.getItem('sb_last_backup')}catch(e){}
 return t?'Last backup: '+new Date(t).toLocaleString():'You have not made a backup yet.'}
function backupNudge(){ // gentle reminder on the Dashboard
 let t=0;try{t=+localStorage.getItem('sb_last_backup')||0}catch(e){}
 if(!S.reviewers.length||Date.now()-t<30*864e5)return'';
 return`<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4 text-sm flex flex-wrap items-center gap-2"><span class="text-amber-800 mr-auto">${t?'Your last backup is over 30 days old.':'Your quizzes are only stored in this browser.'} Save a backup so you don't lose them.</span><button onclick="exportBackup()" class="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs">Back up now</button></div>`}
// Ask the browser not to delete this app's data when storage is low (it may or may not agree)
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
