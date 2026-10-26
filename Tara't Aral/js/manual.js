/* ================= CREATE A QUIZ WITHOUT A FILE ================= */
// Makes an empty reviewer and opens the question editor so you can write everything yourself.
async function startManual(){
 const name=($id('newname').value.trim()||'My custom quiz').slice(0,80);
 const r={id:uid(),name,date:Date.now(),chars:0,ocr:false,manual:true,cfg:{...cfg},
  notes:{topics:[],defs:[],terms:[],facts:[]},questions:[],cards:[],warnings:[],preview:''};
 try{await DB.put('reviewers',r)}catch(e){return toast('Could not save: '+e.message,true)}
 S.reviewers.unshift(r);S.rid=r.id;S.q=S.fc=S.ty=null;
 r.questions.push({num:null,q:'',opts:['','','',''],a:null,expl:'',unc:false,imported:true}); // one blank question to start (not saved until you click Save changes)
 S.view='reviewer';S.tab='quiz';S.edit=true;render();
 toast('Write your question, fill in the choices, pick the correct one, then Save changes.')}
