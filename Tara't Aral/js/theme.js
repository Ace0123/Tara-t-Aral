/* ================= DARK MODE ================= */
// Follows your device setting until you press the 🌙/☀️ button. The choice is remembered in this browser.
// Loaded in <head> so the right theme shows immediately (no white flash).
(function(){
 const root=document.documentElement;
 let saved=null;try{saved=localStorage.getItem('sb_theme')}catch(e){}
 const mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
 const isDark=()=>saved?saved==='dark':!!(mq&&mq.matches);
 window.applyTheme=()=>{
  root.classList.toggle('dark',isDark());
  const b=document.getElementById('themeBtn');
  if(b){b.textContent=isDark()?'☀️':'🌙';b.title=isDark()?'Switch to light mode':'Switch to dark mode';b.setAttribute('aria-label',b.title)}};
 window.toggleTheme=()=>{saved=isDark()?'light':'dark';try{localStorage.setItem('sb_theme',saved)}catch(e){}applyTheme()};
 if(mq&&mq.addEventListener)mq.addEventListener('change',()=>{if(!saved)applyTheme()});
 addEventListener('beforeprint',()=>root.classList.remove('dark')); // always print on white paper
 addEventListener('afterprint',applyTheme);
 applyTheme();
 document.addEventListener('DOMContentLoaded',applyTheme);
})();
