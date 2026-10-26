/* StudyBuddy service worker: lets the app load and work with no internet.
   Change VERSION whenever you add or rename files in CORE, so phones fetch a fresh copy. */
const VERSION='v1',CACHE='studybuddy-'+VERSION;
const CORE=['./','index.html','manifest.webmanifest','css/tailwind.css','css/style.css',
 'js/theme.js','js/helpers.js','js/db.js','js/extract.js','js/generate.js','js/state.js','js/quiz.js','js/flashcards.js','js/edit.js','js/notes.js','js/typing.js','js/manual.js','js/share.js','js/views.js','js/main.js','js/pwa.js',
 'icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png',
 'vendor/pdf.min.js','vendor/pdf.worker.min.js','vendor/mammoth.browser.min.js','vendor/jszip.min.js','vendor/tesseract.min.js'];
// Image-reading (OCR) files are large, so a failure here must not block installing the app.
const OCR=['vendor/tesseract/worker.min.js','vendor/tesseract/tesseract-core-simd-lstm.wasm.js','vendor/tesseract/lang/eng.traineddata.gz'];

self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CACHE);await c.addAll(CORE);
 await Promise.allSettled(OCR.map(u=>c.add(u)));
 self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const k of await caches.keys())if(k.startsWith('studybuddy-')&&k!==CACHE)await caches.delete(k); // remove old versions
 await self.clients.claim()})()));

self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin)return;
 e.respondWith(u.pathname.includes('/vendor/')?cacheFirst(r):networkFirst(r))});

// Libraries never change, so use the saved copy first.
async function cacheFirst(r){
 const c=await caches.open(CACHE),hit=await c.match(r,{ignoreSearch:true});if(hit)return hit;
 const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}
// App files: try the internet first (so updates show up), fall back to the saved copy when offline or very slow.
async function networkFirst(r){
 const c=await caches.open(CACHE);
 const saved=await c.match(r,{ignoreSearch:true})||(r.mode==='navigate'?await c.match('index.html'):null);
 try{
  const ctl=new AbortController(),t=saved?setTimeout(()=>ctl.abort(),4000):0;
  const res=await fetch(r,{signal:ctl.signal});clearTimeout(t);
  if(res.ok)c.put(r,res.clone());return res
 }catch(err){if(saved)return saved;throw err}}
