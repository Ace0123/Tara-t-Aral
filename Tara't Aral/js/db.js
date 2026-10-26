/* ================= 2. INDEXEDDB ================= */
const DB={db:null,
 open(){return new Promise((ok,no)=>{const r=indexedDB.open('studybuddy',1);
  r.onupgradeneeded=()=>['reviewers','history'].forEach(s=>r.result.createObjectStore(s,{keyPath:'id'}));
  r.onsuccess=()=>{this.db=r.result;ok()};r.onerror=()=>no(r.error)})},
 run(s,mode,fn){return new Promise((ok,no)=>{const t=this.db.transaction(s,mode),q=fn(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)})},
 all(s){return this.run(s,'readonly',o=>o.getAll())},put(s,v){return this.run(s,'readwrite',o=>o.put(v))},
 del(s,id){return this.run(s,'readwrite',o=>o.delete(id))},clear(s){return this.run(s,'readwrite',o=>o.clear())}};

