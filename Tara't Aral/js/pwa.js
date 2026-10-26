/* ================= OFFLINE APP (PWA) ================= */
// Registers the service worker (sw.js) so the app works without internet, and handles the Install button.
// Service workers only run on https:// or http://localhost, not when index.html is opened as a file.
if('serviceWorker' in navigator&&location.protocol!=='file:'){
 addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.warn('Offline mode unavailable:',e)));
 navigator.serviceWorker.ready.then(()=>{let seen=null;try{seen=localStorage.getItem('sb_offline_ready')}catch(e){}
  if(!seen){try{localStorage.setItem('sb_offline_ready','1')}catch(e){}toast('Ready to work offline.')}});
}
let installEvent=null;
const showInstall=on=>{const b=document.getElementById('installBtn');if(b)b.classList.toggle('hidden',!on)};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;showInstall(true)}); // browser says "installable"
addEventListener('appinstalled',()=>{installEvent=null;showInstall(false)});
async function installApp(){if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;showInstall(false)}
// "Offline" badge in the sidebar
const showNet=()=>{const b=document.getElementById('netBadge');if(b)b.classList.toggle('hidden',navigator.onLine)};
addEventListener('online',showNet);addEventListener('offline',showNet);addEventListener('DOMContentLoaded',showNet);
