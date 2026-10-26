/* ================= SHARE A QUIZ ================= */
// Two ways, no server needed:
//  1) Share link: the quiz is compressed into the link itself (after the #). Works once your site is online.
//  2) Share file: a .json file the other person imports on their Dashboard.
// Only questions, answers and flashcards are shared. Your notes and extracted file text are NOT included.
const sharePayload=r=>({app:'StudyBuddy',v:1,name:r.name,
 questions:r.questions.map(({q,opts,a,expl})=>({q,opts,a,expl})),cards:r.cards.map(({q,a})=>({q,a}))});

// Check everything that comes from outside before saving it (links and files are untrusted).
function cleanShared(o){
 if(!o||o.app!=='StudyBuddy'||!Array.isArray(o.questions))throw new Error('This is not a StudyBuddy quiz.');
 const str=(s,n)=>String(s==null?'':s).slice(0,n);
 const questions=o.questions.slice(0,200).map(x=>{
  const opts=(Array.isArray(x.opts)?x.opts:[]).slice(0,6).map(t=>str(t,300));
  const a=Number.isInteger(x.a)&&x.a>=0&&x.a<opts.length?x.a:null;
  return{num:null,q:str(x.q,500),opts,a,expl:str(x.expl,500),unc:false,imported:true}
 }).filter(x=>x.q&&x.opts.length>=2&&x.opts.every(Boolean));
 const cards=(Array.isArray(o.cards)?o.cards:[]).slice(0,300).map(c=>({q:str(c.q,500),a:str(c.a,500),unc:false})).filter(c=>c.q&&c.a);
 if(!questions.length&&!cards.length)throw new Error('The quiz is empty or damaged.');
 return{name:str(o.name,80)||'Shared quiz',questions,cards}}
async function saveShared(o){
 const s=cleanShared(o);
 const r={id:uid(),name:s.name,date:Date.now(),chars:0,ocr:false,manual:true,shared:true,cfg:{...cfg},
  notes:{topics:[],defs:[],terms:[],facts:[]},questions:s.questions,cards:s.cards,warnings:[],preview:''};
 await DB.put('reviewers',r);S.reviewers.unshift(r);return r}

// --- compression helpers (built into modern browsers) ---
async function zipStr(s){const cs=new CompressionStream('deflate-raw'),w=cs.writable.getWriter();w.write(new TextEncoder().encode(s));w.close();return new Uint8Array(await new Response(cs.readable).arrayBuffer())}
async function unzipBytes(b){ // stops if the result is suspiciously large (2 MB)
 const ds=new DecompressionStream('deflate-raw'),w=ds.writable.getWriter();w.write(b).catch(()=>{});w.close().catch(()=>{});
 const rd=ds.readable.getReader(),parts=[];let n=0;
 for(;;){const{done,value}=await rd.read();if(done)break;n+=value.length;if(n>2e6){rd.cancel();throw new Error('Quiz is too large.')}parts.push(value)}
 return new TextDecoder().decode(await new Blob(parts).arrayBuffer())}
const b64e=u=>{let s='';u.forEach(c=>s+=String.fromCharCode(c));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const b64d=t=>{t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';return Uint8Array.from(atob(t),c=>c.charCodeAt(0))};

// --- sender side ---
async function shareLink(){
 const p=sharePayload(cur());
 if(!p.questions.length&&!p.cards.length)return toast('Nothing to share yet. Add questions first.',true);
 if(location.protocol==='file:')toast('Heads up: links only work for others once your site is online (e.g. on Vercel). Use "Share file" for now.',true);
 try{
  const url=location.href.split('#')[0]+'#q='+b64e(await zipStr(JSON.stringify(p)));
  const warn=(p.questions.some(x=>x.a===null)?' Some questions have no answer set.':'')+(url.length>4000?' The link is long; if a chat app cuts it, use Share file.':'');
  try{await navigator.clipboard.writeText(url);toast('Link copied.'+warn)}catch(e){prompt('Copy this link:',url)}
 }catch(e){toast('Could not create the link: '+e.message,true)}}
function shareFile(){
 const p=sharePayload(cur());
 if(!p.questions.length&&!p.cards.length)return toast('Nothing to share yet. Add questions first.',true);
 download(base()+'.studybuddy.json','application/json',JSON.stringify(p))}

// --- receiver side ---
async function importFile(input){
 const f=input.files[0];input.value='';if(!f)return;
 try{if(f.size>3e6)throw new Error('File is too large.');
  const r=await saveShared(JSON.parse(await f.text()));
  S.q=S.fc=S.ty=null;toast(`Imported "${r.name}".`);go('reviewer',r.id,'quiz')
 }catch(e){toast('Could not import: '+(e instanceof SyntaxError?'not a valid quiz file.':e.message),true)}}
async function importFromHash(){ // runs at startup: opens a quiz from a shared link
 const m=location.hash.match(/^#q=([\w-]+)$/);if(!m)return;
 try{const r=await saveShared(JSON.parse(await unzipBytes(b64d(m[1]))));
  S.rid=r.id;S.view='reviewer';S.tab='quiz';toast(`Imported shared quiz "${r.name}". It is saved in this browser.`)
 }catch(e){toast('Could not open the shared link: '+e.message,true)}
 try{history.replaceState(null,'',location.pathname+location.search)}catch(e){location.hash=''} // remove the long #q=… from the address bar
}
