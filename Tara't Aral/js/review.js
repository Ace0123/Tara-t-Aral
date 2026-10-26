/* ================= CHOOSE WHAT TO INCLUDE (before generating) ================= */
// After a file is read, you tick the sections that are real study material. Only ticked sections are used.
function splitSections(text){
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
 const isChoiceLine=l=>/^\(?[A-Fa-f][).]\s/.test(l);
 const strongHead=(l,i)=>{ // a line that clearly starts a new part of the document
  if(l.length>=80||/[.!?,;]$/.test(l)||isChoiceLine(l))return false;
  if(/^\d{1,3}[.)]\s/.test(l)&&isChoiceLine(lines[i+1]||''))return false; // a numbered question, not a heading
  return(isCapsHead(l)&&l.length>=6)||SECTION_LINE.test(l)||SKIP_HEAD.test(l)||(/^\d{1,2}[.)]\s+[A-Z]/.test(l)&&l.split(' ').length<=9)};
 const secs=[],seen=new Set();let cur=null;
 lines.forEach((l,i)=>{
  if(strongHead(l,i)){
   const dup=seen.has(l.toLowerCase());seen.add(l.toLowerCase());
   const endsSkip=cur&&SKIP_HEAD.test(cur.title)&&!SKIP_HEAD.test(l)&&isCapsHead(l);
   if(!cur||cur.body>0||dup||endsSkip){cur={title:l,lines:[l],body:0};secs.push(cur)}
   else cur.lines.push(l); // headings in a row (e.g. a contents list) stay together
  }else{
   if(!cur){cur={title:'Beginning of file',lines:[],body:0};secs.push(cur)}
   cur.lines.push(l);cur.body++}});
 if(secs.length<2){ // no headings found: split into blocks of 25 lines
  const out=[];let i=0;
  while(i<lines.length){let j=Math.min(i+25,lines.length);while(j<lines.length&&isChoiceLine(lines[j]))j++; // never cut a question away from its A) B) C) choices
   out.push({title:`Lines ${i+1}–${j}`,lines:lines.slice(i,j),body:25});i=j}
  return out}
 return secs}
// Suggested default: untick instructions / contents sections
function suggestOn(s){
 if(SKIP_HEAD.test(s.title))return false;
 const dir=s.lines.filter(l=>DIRECTIVE.test(l)&&!/\?$/.test(l)).length;
 return !(s.lines.length>=2&&dir/s.lines.length>=0.6)}
function askSections(name,text){
 return new Promise(res=>{
  const sections=splitSections(text).map(s=>({title:s.title,lines:s.lines,on:suggestOn(s)}));
  S.review={name,sections,autoOff:sections.filter(s=>!s.on).length,res};
  S.busy='';S.view='review';render();window.scrollTo(0,0)})}
const reviewCount=()=>{const rv=S.review,on=rv.sections.filter(s=>s.on);
 return`${on.length} of ${rv.sections.length} sections selected · ${on.reduce((n,s)=>n+s.lines.join('\n').length,0).toLocaleString()} characters`};
function reviewToggle(i,on){S.review.sections[i].on=on;$id('revcount').textContent=reviewCount()}
function reviewAll(v){S.review.sections.forEach(s=>s.on=v);render()}
function reviewReset(){S.review.sections.forEach(s=>s.on=suggestOn(s));render()}
function reviewConfirm(){
 const rv=S.review,on=rv.sections.filter(s=>s.on);
 if(!on.length)return toast('Tick at least one section.',true);
 S.review=null;rv.res({text:on.flatMap(s=>s.lines).join('\n'),used:on.length,total:rv.sections.length})}
function reviewCancel(){const rv=S.review;S.review=null;S.view='dashboard';render();rv.res(null)}
function reviewHTML(){
 const rv=S.review;if(!rv)return'<p class="text-slate-500">Nothing to review.</p>';
 return`<h1 class="text-2xl font-bold mb-1">Choose what to include</h1>
 <p class="text-sm text-slate-500 mb-3">${esc(rv.name)}. Tick the parts that are real study material. Untick instructions, contents, cover pages and anything that is not quiz content. Only ticked parts are used.</p>
 ${rv.autoOff?`<p class="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 mb-3">${rv.autoOff} section(s) were unticked because they look like instructions or a contents list. Tick them if you want them used.</p>`:''}
 <div class="flex gap-4 text-xs text-indigo-600 mb-3"><button onclick="reviewAll(true)">Select all</button><button onclick="reviewAll(false)">Select none</button><button onclick="reviewReset()">Reset suggestions</button></div>
 ${rv.sections.map((s,i)=>`<div class="bg-white border rounded-lg p-3 mb-2 text-sm"><label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" class="mt-1" ${s.on?'checked':''} onchange="reviewToggle(${i},this.checked)"><span class="min-w-0"><span class="font-medium break-words">${esc(trunc(s.title,90))}</span><span class="text-xs text-slate-500"> · ${s.lines.length} line(s)</span></span></label>
  <details class="mt-1 ml-7"><summary class="text-xs text-slate-500 cursor-pointer">Show text</summary><pre class="whitespace-pre-wrap text-xs mt-2 max-h-48 overflow-auto">${esc(s.lines.join('\n'))}</pre></details></div>`).join('')}
 <div class="sticky bottom-2 bg-slate-50/90 py-2 flex flex-wrap items-center gap-2 text-sm"><span id="revcount" class="text-xs text-slate-500 mr-auto">${reviewCount()}</span><button onclick="reviewCancel()" class="border rounded-lg px-4 py-2 bg-white">Cancel</button><button onclick="reviewConfirm()" class="bg-indigo-600 text-white rounded-lg px-5 py-2">Generate from selected</button></div>`}
