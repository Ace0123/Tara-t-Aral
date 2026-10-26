/* ================= 12. START ================= */
(async()=>{try{await DB.open();S.reviewers=(await DB.all('reviewers')).sort((a,b)=>b.date-a.date);S.history=await DB.all('history');await importFromHash()}
 catch(e){toast('Local storage (IndexedDB) is unavailable. Nothing will be saved.',true)}render()})();

