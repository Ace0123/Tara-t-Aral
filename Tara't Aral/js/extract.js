/* ================= 3. TEXT EXTRACTION (all local) ================= */
async function extract(file,say){
 const ext=file.name.split('.').pop().toLowerCase();
 if(file.size>25*1024*1024)throw new Error('File is over 25 MB. Split it into smaller files.');
 if(ext==='txt')return{text:await file.text()};
 if(ext==='pdf'){
  if(!window.pdfjsLib)throw new Error('The PDF library failed to load. Reload the page.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js'; // bundled copy, works offline
  const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let t='';
  for(let i=1;i<=pdf.numPages;i++){say(`Reading PDF page ${i}/${pdf.numPages}…`);
   const c=await(await pdf.getPage(i)).getTextContent();t+=c.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('')+'\n\n'}
  return{text:t};}
 if(['jpg','jpeg','png','webp'].includes(ext)){
  if(!window.Tesseract)throw new Error('The OCR library failed to load. Reload the page.');
  say('Running OCR…');
  const r=await Tesseract.recognize(file,'eng',{workerPath:'vendor/tesseract/worker.min.js',corePath:'vendor/tesseract/',langPath:'vendor/tesseract/lang/',logger:m=>m.status==='recognizing text'&&say('OCR '+Math.round(m.progress*100)+'%')});
  return{text:r.data.text,ocr:true};}
 if(ext==='docx'){
  const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return{text:r.value};}
 if(ext==='pptx'){
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>a.match(/\d+/)[0]-b.match(/\d+/)[0]);
  let t='';for(const n of names){say('Reading '+n.split('/').pop());
   t+=(await zip.files[n].async('string')).replace(/<\/a:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")+'\n\n'}
  return{text:t};}
 if(['doc','ppt'].includes(ext))throw new Error('Old .doc/.ppt formats are not supported. Save as .docx/.pptx.');
 throw new Error('Unsupported file type ".'+ext+'".');
}

