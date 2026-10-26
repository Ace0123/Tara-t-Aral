/* ================= 4. STUDY MATERIAL GENERATION (no AI) ================= */
const STOP=new Set('about above after again against also because been before being between both could during each every from have having here into itself just more most other should since some such than that their them then there these they this those through under until very were what when where which while will with would your'.split(' '));
const BAD_SUBJ=/^(This|That|It|There|These|Those|He|She|They|What|Which|Who|We|You|I|Here)\b/;
const DEF_IS=/^(?:The |An? )?([A-Z][A-Za-z0-9\- ]{1,40}?) (?:is|are|refers to|means|is defined as|are defined as|can be defined as|is known as) (?:the |an? )?(.{15,})$/;
const DEF_COLON=/^([A-Z][A-Za-z0-9\- ]{1,40}):\s+(.{15,})$/;

// True if a passage looks like a multiple-choice item (3+ markers like "A)" "B." "C)")
const isChoice=s=>(s.match(/(?:^|\s)[A-Da-d][).]\s/g)||[]).length>=3;
// ---- Import existing multiple-choice questions ("1. Question" followed by "A) ..." lines) ----
// Answers are only used if the file (or the user) provides them. Nothing is guessed.
function parseKey(str){const m={},re=/(\d{1,3})\s*[.):\-–=]?\s*\(?([A-Fa-f])\)?(?![A-Za-z])/g;let x;
 while((x=re.exec(str)))m[+x[1]]=x[2].toUpperCase().charCodeAt(0)-65;return m}
function parseMCQ(lines){
 const items=[],used=new Set();
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^(\d{1,3})[.)]\s+(.{8,})$/);if(!m)continue;
  const opts=[];let j=i+1;
  while(j<lines.length){const o=lines[j].match(/^\(?([A-Fa-f])[).]\s*(.+)$/);
   if(!o||o[1].toUpperCase().charCodeAt(0)-65!==opts.length)break;opts.push(o[2].trim());j++}
  if(opts.length<2)continue;
  let a=null;const k=lines[j]&&lines[j].match(/^(?:correct\s+)?answers?\s*[:.\-]\s*\(?([A-Fa-f])\)?/i);
  if(k){a=k[1].toUpperCase().charCodeAt(0)-65;j++}
  if(a!==null&&a>=opts.length)a=null;
  for(let x=i;x<j;x++)used.add(x);
  items.push({num:+m[1],q:m[2].trim(),opts,a,expl:a===null?'':'Answer taken from your file.',unc:false,imported:true});i=j-1}
 // Optional "Answer Key" section at the end of the file
 const ki=lines.findIndex(l=>/^answer\s*key\b/i.test(l));
 if(ki>=0&&items.length){const map=parseKey(lines.slice(ki+1).join(' '));
  items.forEach(x=>{if(x.a===null&&map[x.num]!==undefined&&map[x.num]<x.opts.length){x.a=map[x.num];x.expl='Answer taken from the answer key in your file.'}});
  for(let x=ki;x<lines.length;x++)used.add(x)}
 return{items,used}}
const cardsFromImported=items=>items.filter(x=>x.a!==null).map(x=>({q:x.q,a:x.opts[x.a],unc:false}));
function clean(t){return t.replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()}

function generate(text,cfg,ocr){
 const orig=text;
 const all=text.split('\n').map(s=>s.trim()).filter(Boolean);
 const imp=parseMCQ(all);
 text=all.filter((_,i)=>!imp.used.has(i)).join('\n'); // remaining text feeds the normal generators
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
 const rawS=text.replace(/\n/g,' ').split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(s=>s.trim());
 const skipOn=cfg.skipChoice!==false; // user setting: skip multiple-choice-looking passages?
 const isCh=s=>skipOn&&isChoice(s);
 const skipped=rawS.filter(isCh).length; // existing choice lists: skipped, answer key unknown
 const sents=rawS.filter(s=>s.length>25&&s.length<320&&!isCh(s));
 // Topics: short heading-like lines
 const topics=[...new Set(lines.filter(l=>l.length<70&&l.split(' ').length<=8&&!/[.?!,;]$/.test(l)&&/^(\d+[.)]\s*)?[A-Z0-9]/.test(l)&&!DEF_COLON.test(l)))].slice(0,25);
 // Definitions
 const defs=[],seen=new Set();
 const addDef=(t,d,src)=>{t=t.trim();const k=t.toLowerCase();
  if(BAD_SUBJ.test(t)||t.split(' ').length>5||seen.has(k))return;seen.add(k);
  d=d.replace(/[.\s]+$/,'');defs.push({term:t,def:d,src,unc:d.length>150||ocr})};
 lines.forEach(l=>{if(isCh(l))return;const m=l.match(DEF_COLON);if(m)addDef(m[1],m[2],l)});
 sents.forEach(s=>{const m=s.match(DEF_IS);if(m)addDef(m[1],m[2],s)});
 // Existing questions: a line ending in "?" followed by a non-question line
 const found=[];lines.forEach((l,i)=>{if(/\?$/.test(l)&&l.length>10&&lines[i+1]&&!/\?$/.test(lines[i+1])&&lines[i+1].length<300)
  found.push({q:l.replace(/^\d+[.)]\s*/,''),a:lines[i+1].replace(/^(answer|ans|a)\s*[:.-]\s*/i,''),unc:true,detected:true})});
 // Frequent keywords
 const freq={};(text.toLowerCase().match(/[a-z]{7,}/g)||[]).forEach(w=>{if(!STOP.has(w))freq[w]=(freq[w]||0)+1});
 const keywords=Object.keys(freq).filter(w=>freq[w]>=2).sort((a,b)=>freq[b]-freq[a]).slice(0,40);
 // Key facts: sentences with numbers or cue words, not already definitions
 const facts=sents.filter(s=>!defs.some(d=>d.src===s)&&(/\d/.test(s)||/\b(important|because|therefore|causes?|results? in|consists? of|includes?|must|always|never|first|main)\b/i.test(s))).slice(0,30);

 // ---- Multiple-choice questions ----
 const seenQ=new Set(),qs=[];
 const mk=(q,ans,pool,expl,unc)=>{
  const dis=shuffle(pool.filter(p=>p.toLowerCase()!==ans.toLowerCase())).slice(0,3);
  if(dis.length<3||seenQ.has(q))return null;seenQ.add(q);
  const opts=shuffle([ans,...dis]);return{q,opts,a:opts.indexOf(ans),expl,unc:!!unc}};
 const termPool=defs.map(d=>d.term);
 const A=defs.map(d=>mk(`Which term is described as: "${trunc(d.def,160)}"?`,d.term,termPool,`${d.term} — ${trunc(d.src,220)}`,d.unc)).filter(Boolean);
 const B=defs.map(d=>mk(`What is "${d.term}"?`,trunc(d.def,110),defs.map(x=>trunc(x.def,110)),`${d.term} — ${trunc(d.src,220)}`,d.unc||d.def.length>110)).filter(Boolean);
 let main=cfg.diff==='easy'?A:cfg.diff==='hard'?[...B,...A]:A.flatMap((x,i)=>B[i]?[x,B[i]]:[x]);
 qs.push(...main);
 // Fill-in-the-blank from key facts (always flagged for review: distractors are keywords)
 for(const f of facts){if(qs.length>=cfg.count*2)break;
  const w=keywords.filter(k=>new RegExp('\\b'+k+'\\b','i').test(f)).sort((a,b)=>b.length-a.length)[0];if(!w)continue;
  const q=mk('Fill in the blank: '+f.replace(new RegExp('\\b'+w+'\\b','i'),'_____'),w,keywords.filter(k=>!new RegExp('\\b'+k+'\\b','i').test(f)),`Source: ${trunc(f,220)}`,true);
  if(q)qs.push(q)}
 const questions=[...imp.items,...qs.slice(0,cfg.count)]; // imported questions are always kept

 // ---- Flashcards ----
 const genCards=[...defs.map(d=>({q:`What is ${d.term}?`,a:d.def,unc:d.unc})),...found.map(f=>({q:f.q,a:f.a,unc:true})),
  ...questions.filter(x=>!x.imported&&x.q.startsWith('Fill')).map(x=>({q:x.q,a:x.opts[x.a],unc:true}))].slice(0,cfg.count);
 const cards=[...cardsFromImported(imp.items),...genCards];

 const warnings=[];
 if(imp.items.length){const n=imp.items.filter(x=>x.a!==null).length;warnings.push(`Imported ${imp.items.length} multiple-choice questions from your file; ${n} have a known answer.`+(n<imp.items.length?' Paste an answer key in the Quiz tab to score them.':''))}
 if(skipped)warnings.push(`${skipped} passage(s) that look like existing multiple-choice items were skipped, because this app cannot tell which choice is correct.`);
 if(ocr)warnings.push('Text came from OCR and may contain errors. Check items before relying on them.');
 if(!imp.items.length&&questions.length<cfg.count)warnings.push(`Only ${questions.length} of ${cfg.count} requested questions could be built from this content (needs definitions or repeated key terms).`);
 if(!cards.length&&!imp.items.length)warnings.push('No flashcards could be built: no definitions or question/answer pairs were detected.');
 return{notes:{topics,defs:defs.map(d=>({term:d.term,def:d.def})),terms:keywords.slice(0,15),facts},questions,cards,warnings,preview:orig.slice(0,1500)};
}

