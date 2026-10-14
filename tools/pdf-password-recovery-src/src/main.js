import { createPdfToolkit, PdfPasswordError } from 'pdfstudio';
import './style.css';

const $ = (s) => document.querySelector(s);
const fileInput=$('#pdfFile'), dropzone=$('#dropzone'), dropTitle=$('#dropTitle'), dropSubtitle=$('#dropSubtitle');
const fileMeta=$('#fileMeta'), fileDetails=$('#fileDetails'), detailSize=$('#detailSize');
const passwordInput=$('#pdfPassword'), togglePassword=$('#togglePassword'), ownership=$('#ownership');
const unlockButton=$('#unlockButton'), stopButton=$('#stopButton'), statusBox=$('#status');
const resultBox=$('#result'), resultMessage=$('#resultMessage'), downloadButton=$('#downloadButton');
const knownPanel=$('#knownPanel'), autoPanel=$('#autoPanel'), candidateInput=$('#candidatePasswords');
const includeCommon=$('#includeCommon'), clearCandidates=$('#clearCandidates');
const modeButtons=[...document.querySelectorAll('.mode-button')];
const progressPanel=$('#progressPanel'), progressTitle=$('#progressTitle'), progressCount=$('#progressCount');
const progressBar=$('#progressBar'), progressElapsed=$('#progressElapsed'), progressPercent=$('#progressPercent');
const COMMON=['123456','12345678','password','Password123','admin','1234','0000','1111','qwerty','letmein','welcome','abc123','iloveyou','123456789'];
let selectedFile=null, unlockedBytes=null, unlockedName='unlocked.pdf', toolkitPromise=null;
let mode='known', stopRequested=false, busy=false, startedAt=0;

function formatBytes(n){return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;}
function status(message,type='info'){
 const icon=type==='success'?'✓':type==='error'?'!':type==='working'?'…':'i';
 statusBox.className=`status status-${type}`; statusBox.innerHTML='<span class="status-icon"></span><span></span>';
 statusBox.querySelector('.status-icon').textContent=icon; statusBox.querySelector('span:last-child').textContent=message;
}
function candidates(){
 const own=candidateInput.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 return [...new Set(includeCommon.checked?[...own,...COMMON]:own)].slice(0,500);
}
function updateButton(){
 if(busy){unlockButton.disabled=true;return;}
 const ready=mode==='known'?passwordInput.value.length>0:candidates().length>0;
 unlockButton.disabled=!(selectedFile&&ready&&ownership.checked);
}
function chooseFile(file){
 resultBox.hidden=true; unlockedBytes=null;if(!file)return;
 if(!(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))){
  selectedFile=null;fileInput.value='';dropTitle.textContent='Please choose a PDF file';dropSubtitle.textContent='This tool accepts PDF documents only.';
  fileMeta.hidden=true;fileDetails.hidden=true;status('The selected file does not appear to be a PDF.','error');updateButton();return;
 }
 selectedFile=file;dropTitle.textContent=file.name;dropSubtitle.textContent='PDF selected and ready';
 fileMeta.textContent=`File size: ${formatBytes(file.size)}`;fileMeta.hidden=false;detailSize.textContent=formatBytes(file.size);fileDetails.hidden=false;
 status('PDF selected. Choose a recovery method and confirm permission to continue.');updateButton();
}
function setMode(next){
 if(busy)return;mode=next;knownPanel.hidden=mode!=='known';autoPanel.hidden=mode!=='auto';
 modeButtons.forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 unlockButton.innerHTML=mode==='known'?'🔓 Unlock PDF':'✨ Start Auto Recovery';
 resultBox.hidden=true;unlockedBytes=null;
 status(mode==='known'?'Enter the current password for this PDF.':'Add possible passwords; only listed candidates will be tested.');updateButton();
}
function updateProgress(done,total,label='Testing candidate passwords…'){
 const pct=total?Math.min(100,Math.round(done/total*100)):0;
 progressTitle.textContent=label;progressCount.textContent=`${done} / ${total}`;progressBar.style.width=`${pct}%`;
 progressPercent.textContent=`${pct}%`;progressElapsed.textContent=`Elapsed: ${Math.floor((Date.now()-startedAt)/1000)}s`;
}
function passwordError(e){return e instanceof PdfPasswordError||/password|decrypt|encrypted|invalid password|incorrect password/i.test(String(e?.message||e));}
async function unlock(pdf,pwd){return await pdf.unlock(selectedFile,{password:pwd});}

fileInput.addEventListener('change',()=>chooseFile(fileInput.files?.[0]));
['dragenter','dragover'].forEach(name=>dropzone.addEventListener(name,e=>{e.preventDefault();dropzone.classList.add('drag-over');}));
['dragleave','drop'].forEach(name=>dropzone.addEventListener(name,e=>{e.preventDefault();dropzone.classList.remove('drag-over');}));
dropzone.addEventListener('drop',e=>chooseFile(e.dataTransfer?.files?.[0]));
passwordInput.addEventListener('input',updateButton);ownership.addEventListener('change',updateButton);
candidateInput.addEventListener('input',updateButton);includeCommon.addEventListener('change',updateButton);
modeButtons.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
togglePassword.addEventListener('click',()=>{const show=passwordInput.type==='password';passwordInput.type=show?'text':'password';togglePassword.textContent=show?'Hide':'Show';});
clearCandidates.addEventListener('click',()=>{candidateInput.value='';updateButton();});

unlockButton.addEventListener('click',async()=>{
 if(!selectedFile||!ownership.checked||busy)return;
 if(mode==='known'&&!passwordInput.value)return;
 const list=mode==='auto'?candidates():[];
 if(mode==='auto'&&!list.length){status('Add at least one candidate or enable the common list.','error');return;}
 resultBox.hidden=true;unlockedBytes=null;busy=true;stopRequested=false;startedAt=Date.now();
 unlockButton.disabled=true;unlockButton.innerHTML='<span class="spinner"></span> Preparing…';
 stopButton.hidden=mode!=='auto';stopButton.disabled=false;stopButton.textContent='Stop recovery';progressPanel.hidden=mode!=='auto';
 try{
  toolkitPromise??=createPdfToolkit();const pdf=await toolkitPromise;
  if(mode==='known'){
   status('Processing on this device. Your PDF is not being uploaded.','working');
   unlockedBytes=await unlock(pdf,passwordInput.value);
   unlockedName=selectedFile.name.replace(/\.pdf$/i,'')+'-unlocked.pdf';
   resultMessage.textContent='Your unlocked copy is ready to save.';status('Success! Download the separate unlocked copy below.','success');resultBox.hidden=false;return;
  }
  status(`Auto recovery started. Testing ${list.length} candidate(s) on this device.`,'working');
  unlockButton.innerHTML='<span class="spinner"></span> Recovering…';let attempted=0,found=false;
  for(const pwd of list){
   if(stopRequested)break;
   try{unlockedBytes=await unlock(pdf,pwd);found=true;attempted++;break;}
   catch(e){if(!passwordError(e))throw e;}
   attempted++;updateProgress(attempted,list.length);
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(found){
   unlockedName=selectedFile.name.replace(/\.pdf$/i,'')+'-unlocked.pdf';
   resultMessage.textContent=`Password matched after ${attempted} attempt(s).`;
   updateProgress(attempted,list.length,'Password found!');status(`Password found after ${attempted} attempt(s). It is not displayed or saved by this page.`,'success');resultBox.hidden=false;
  }else if(stopRequested){
   updateProgress(attempted,list.length,'Recovery stopped');status(`Recovery stopped after ${attempted} attempt(s). Add more likely candidates and try again.`);
  }else{
   updateProgress(attempted,list.length,'Recovery complete');status(`No match found in ${attempted} candidate(s). Try a more relevant list. Strong passwords may not be recovered.`,'error');
  }
 }catch(e){
  unlockedBytes=null;console.error('PDF recovery error:',e);
  status(mode==='known'&&passwordError(e)?'That password was not accepted. Check it and try again.':'Could not process this PDF. It may be damaged, unsupported, or protected in a way this version cannot handle.','error');
 }finally{
  busy=false;stopRequested=false;unlockButton.innerHTML=mode==='known'?'🔓 Unlock PDF':'✨ Start Auto Recovery';stopButton.hidden=true;updateButton();
 }
});
stopButton.addEventListener('click',()=>{stopRequested=true;stopButton.disabled=true;stopButton.textContent='Stopping…';status('Stopping after the current candidate finishes…','working');});
downloadButton.addEventListener('click',()=>{
 if(!unlockedBytes)return;const blob=new Blob([unlockedBytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=unlockedName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
