import { analyzeCv, improveActionText, extractJobKeywords, findingPresentation } from './cv-diagnostics.js?v=freemium-4';
import { buildPlainText, buildCvPdf, buildDocx, buildCoverLetterDocx, normalizeCvProfile } from './cv-exports.js';
import { readCvFile } from './cv-import.js';
import { beginCheckout, verifyCheckout, supportUrl } from './cv-checkout.js';
import { mountPageVoice } from './page-voice.js?v=voice-9';

const cvVoice=mountPageVoice({page:'cv',initialKey:'welcome2'});

const $=id=>document.getElementById(id);
// Shared dictionaries contain all new UI copy. No visitor text leaves this page
// through measurement: only the fixed event names below are dispatched.
const t=(key,values={})=>window.I18N?.t(key,values)||String(window.TRANSLATIONS?.[document.documentElement.lang==='en'?'en':'es']?.[key]||window.TRANSLATIONS?.es?.[key]||key).replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
const track=name=>document.dispatchEvent(new CustomEvent('portfolio:measurement',{detail:name}));
let started=false,diagnosisSeen=false,afterTxt=false,axiomMessageKey='cvF_greeting',axiomMessageValues={};
function markStarted(){if(!started){started=true;track('cv_start');}}
const fields=['name','headline','email','phone','location','summary','skills','education'];
const steps=['profile','experience','vacancy','review'];
let step='profile',template='sobria',counter=0,sourceText='',extraction=null,revision=0,importRequest=0;
let analysis={findings:[],keywords:[],missingKeywords:[]},pendingKeyword='',checkout=null,entitlement=null;
let updateTimer,paymentRevision=0,paymentBusy=false;
function previewLicense(){const active=Boolean(entitlement);document.body.dataset.cvLicensed=String(active);$('cv-preview').dataset.licensed=String(active);}
function refreshFunnelCopy(){const overlay=document.querySelector('.watermarks');overlay.dataset.label=Array(14).fill(t('cvF_watermark')).join('\n');if($('export-modal').open)$('checkout-dialogue').textContent=t(afterTxt?'cvF_afterTxt':'cvF_conversion');refreshExperienceCopy();say(t(afterTxt?'cvF_afterTxt':axiomMessageKey,axiomMessageValues));update();if(entitlement)paidFiles(entitlement.plan);}
const node=(tag,cls='',text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const action=(text,fn,cls='secondary')=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
function say(text){$('axiom-message').textContent=text;}
function sayKey(key,values={}){axiomMessageKey=key;axiomMessageValues=values;say(t(key,values));}
function status(text){$('cv-status').textContent=text;}
function profile(){return Object.fromEntries([...fields.map(key=>[key,$('cv-'+key).value]),['experiences',Array.from($('experiences').children).map(card=>({id:card.dataset.id,...Object.fromEntries(['role','company','start','end','description'].map(key=>[key,card.querySelector(`[data-field="${key}"]`).value])),current:card.querySelector('[data-field="current"]').checked})).filter(item=>item.role||item.company||item.description||item.start||item.end)]]);}
function addExperience(value={}){
 if($('experiences').children.length>=20){sayKey('cvF_maxExperiences');return;}
 const id=`exp-${++counter}`, card=node('article','experience');card.dataset.id=id;card.dataset.number=String(counter);
 const head=node('div','experience-heading'),heading=node('h3','',t('cvF_experienceNumber',{n:counter})),remove=action(t('cvF_delete'),()=>{card.remove();changed();},'quiet');heading.dataset.expHeading='';remove.dataset.expRemove='';head.append(heading,remove);card.append(head);
 const grid=node('div','field-grid');
 for(const [key,label,type,max] of [['role',t('cvF_field_role'),'text',180],['company',t('cvF_field_company'),'text',180],['start',t('cvF_field_start'),'month',10],['end',t('cvF_field_end'),'month',10],['description',t('cvF_field_description'),'textarea',5000]]){
  const wrap=node('label',key==='description'?'wide':''),labelText=node('span','',label),input=document.createElement(type==='textarea'?'textarea':'input');labelText.dataset.expLabel=key;
  input.id=`${id}-${key}`;wrap.htmlFor=input.id;input.dataset.field=key;
  if(type==='textarea'){input.rows=4;input.placeholder=t('cvF_descriptionPlaceholder');}else input.type=type;
  input.maxLength=max;input.value=value[key]||'';wrap.append(labelText,input);grid.append(wrap);
 }
 const check=node('label','check wide'), current=document.createElement('input');current.type='checkbox';current.dataset.field='current';current.id=id+'-current';current.checked=!!value.current;check.htmlFor=current.id;const currentLabel=node('span','',t('cvF_currentRole'));currentLabel.dataset.expCurrent='';check.append(current,currentLabel);grid.append(check);card.append(grid);$('experiences').append(card);
 const end=card.querySelector('[data-field=end]');end.disabled=current.checked;
 current.addEventListener('change',()=>{end.disabled=current.checked;if(current.checked)end.value='';});
}
function refreshExperienceCopy(){
 for(const card of $('experiences').children){card.querySelector('[data-exp-heading]').textContent=t('cvF_experienceNumber',{n:card.dataset.number});card.querySelector('[data-exp-remove]').textContent=t('cvF_delete');card.querySelectorAll('[data-exp-label]').forEach(label=>label.textContent=t('cvF_field_'+label.dataset.expLabel));card.querySelector('[data-exp-current]').textContent=t('cvF_currentRole');card.querySelector('[data-field=description]').placeholder=t('cvF_descriptionPlaceholder');}
}
function setStep(next){
 if(!steps.includes(next))return;step=next;
 document.querySelectorAll('[data-panel]').forEach(n=>n.hidden=n.dataset.panel!==next);
 document.querySelectorAll('[data-step]').forEach(n=>{if(n.dataset.step===next)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');});
 $('previous-step').hidden=next==='profile';$('next-step').hidden=next==='review';$('export-document').hidden=next!=='review';
 if(next==='vacancy'||next==='review'){update();if(!diagnosisSeen){diagnosisSeen=true;track('cv_diagnosis_seen');}}
}
function textSection(parent,title,value){if(!value.trim())return;const section=node('section');section.append(node('h3','',title),node('p','',value));parent.append(section);}
function renderPreview(p){
 const content=$('preview-content');content.replaceChildren();
 const header=node('header','document-head');header.append(node('h2','',p.name||t('cvF_previewName')),node('p','',p.headline||t('cvF_field_headline')));
 const contact=[p.location,p.email,p.phone].filter(Boolean).join(' · ');if(contact)header.append(node('p','document-contact',contact));content.append(header);
 textSection(content,t('cvF_previewSummary'),p.summary||t('cvF_previewSummaryHint'));
 const skills=()=>textSection(content,t('cvF_previewSkills'),p.skills);
 if(template==='tecnica')skills();
 if(p.experiences.length){const sec=node('section');sec.append(node('h3','',t('cvF_previewExperience')));for(const item of p.experiences){sec.append(node('p','document-role',[item.role,item.company].filter(Boolean).join(' · ')),node('p','document-dates',[item.start,item.current?t('cvF_present'):item.end].filter(Boolean).join(' — ')),node('p','',item.description));}content.append(sec);}
 if(template==='ejecutiva')skills();textSection(content,t('cvF_previewEducation'),p.education);if(template==='sobria')skills();
 $('cv-preview').dataset.template=template;
}
function focusExperience(id,key){setStep('experience');const card=Array.from($('experiences').children).find(n=>n.dataset.id===id),input=card?.querySelector(`[data-field="${key}"]`);input?.focus();input?.scrollIntoView({block:'center',behavior:'auto'});}
function fixFinding(finding){
 if(finding.type==='profile'){
  if(finding.targetField==='experience'){setStep('experience');$('add-experience').focus();}
  else{setStep('profile');$('cv-'+finding.targetField)?.focus();}
  sayKey(finding.messageKey,finding.params);return;
 }
 if(finding.type==='keyword'){pendingKeyword=finding.keyword;$('keyword-confirm-copy').textContent=pendingKeyword;openModal($('keyword-modal'));return;}
 if(finding.type==='date'){focusExperience(finding.experienceId,finding.id.endsWith('missing-end')||finding.id.endsWith('invalid-end')?'end':'start');sayKey('cvF_fixDates');return;}
 if(finding.type==='description'){
  setStep('experience');const card=Array.from($('experiences').children).find(n=>n.dataset.id===finding.experienceId),input=card?.querySelector('[data-field=description]');
  if(input && finding.id.endsWith(':action')){const improved=improveActionText(input.value);if(improved!==input.value){input.value=improved;changed();sayKey('cvF_fixAction');}}
  focusExperience(finding.experienceId,'description');
  if(finding.id.endsWith(':metrics'))sayKey('cvF_fixMetrics');
  else if(finding.id.endsWith(':short'))sayKey('cvF_fixShort');
  return;
 }
 setStep('profile');const details=$('source-text').closest('details');details.open=true;$('source-text').focus();sayKey('cvF_fixExtraction');
}
function renderFindings(){
 const target=$('findings');target.replaceChildren();const old=Number($('friction-count').textContent),count=analysis.findings.length;
 $('friction-count').textContent=String(count);if(count<old){if(started&&profile().name)void cvVoice.react('thanks',{priority:1,maxAge:2500,cooldown:45000});$('friction-count').classList.remove('improved');requestAnimationFrame(()=>$('friction-count').classList.add('improved'));}
 $('keyword-summary').textContent=analysis.keywords.length?t('cvF_keywordSummary',{matched:analysis.matchedKeywords.length,count:analysis.keywords.length}):t($('job-text').value.trim()?'cvF_keywordNone':'cvF_keywordAdd');
 if(!count){target.append(node('p','no-findings',profile().name?t('cvF_noFindings'):t('cvF_startEditing')));return;}
 const labels={keyword:t('cvF_type_keyword'),date:t('cvF_type_date'),description:t('cvF_type_description'),extraction:t('cvF_type_extraction'),profile:t('cvF_profileType')};
 for(const f of analysis.findings){const presentation=findingPresentation(f,profile()),params={...presentation.params};if(!params.y&&params.n)params.y=t('cvF_experienceNumber',{n:params.n});const item=node('article','finding');item.append(node('span','finding-type',labels[f.type]),node('strong','',t(presentation.titleKey,params)),node('p','',t(presentation.detailKey,params)),action(f.type==='keyword'?t('cvF_reviewSkill'):f.type==='extraction'?t('cvF_reviewText'):t('cvF_review'),()=>fixFinding(f)));target.append(item);}
}
function renderBlindSpots(){for(const id of ['vacancy-blind-spots','review-blind-spots']){const list=$(id);list.replaceChildren();const spots=analysis.blindSpots||[];for(const item of spots)list.append(node('li','',t(item.key,item.params)));if(!spots.length)list.append(node('li','',t('cvF_blindNone')));}}
function update(){const p=profile();renderPreview(p);analysis=analyzeCv({profile:p,jobText:$('job-text').value,sourceText,extraction});renderFindings();renderBlindSpots();$('review-summary').textContent=t('cvF_summaryReview',{n:p.experiences.length,count:analysis.findings.length,template:t('cvF_'+template)});}
function changed(){markStarted();revision++;clearTimeout(updateTimer);updateTimer=setTimeout(update,160);}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
let modalOpener;
function openModal(dialog){modalOpener=document.activeElement;if(!dialog.open)dialog.showModal();document.body.classList.add('modal-open');}
function closeModal(dialog){dialog.close();document.body.classList.remove('modal-open');modalOpener?.focus();}
function validateForExport(){try{normalizeCvProfile(profile());if(!$('cv-email').validity.valid)throw new Error(t('cvF_validEmail'));return true;}catch(error){sayKey('cvF_exportError');status(t('cvF_exportError'));setStep('profile');$('cv-name').focus();return false;}}
function finish(){clearTimeout(updateTimer);update();if(!validateForExport())return;afterTxt=false;$('checkout-dialogue').textContent=t('cvF_conversion');$('checkout-status').textContent='';$('support-after-download').hidden=true;openModal($('export-modal'));track('cv_paywall_seen');void cvVoice.react('finish',{priority:3,maxAge:6000});}
function letterText(){const p=profile(),title=$('job-title').value.trim()||p.headline;return [t('cvF_letterSalutation'),title?t('cvF_letterInterest',{title}):t('cvF_letterGeneral'),p.summary||[p.headline,p.skills?t('cvF_letterSkills',{skills:p.skills}):''].filter(Boolean).join('. '),t('cvF_letterBody'),t('cvF_letterClosing'),p.name].filter(Boolean).join('\n\n');}
function tailored(p,job){const keywords=extractJobKeywords(job),norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const skills=p.skills.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean);skills.sort((a,b)=>Number(keywords.some(k=>norm(b).includes(norm(k))))-Number(keywords.some(k=>norm(a).includes(norm(k)))));return {...p,skills:skills.join(', ')};}
function paidFiles(plan){
 // This path is reached only following a successful server verification.
 const root=$('paid-downloads');root.replaceChildren();root.hidden=false;root.append(node('h3','',t('cvF_deliveryTitle')));
 if(plan==='pro')for(const tpl of ['sobria','tecnica','ejecutiva'])for(const format of ['pdf','docx'])root.append(action(`${t('cvF_'+tpl)} · ${format.toUpperCase()}`,()=>exportPaid(profile(),tpl,format,`cv-${tpl}`)));
 if(plan==='plus'){
  const jobs=[$('job-text').value,$('job-text-2').value,$('job-text-3').value];
  if(jobs.some(j=>!j.trim()))root.append(node('p','small',t('cvF_threeJobsNeeded')));
  jobs.forEach((_,i)=>{for(const format of ['pdf','docx'])root.append(action(t('cvF_vacancyDownload',{n:i+1,format:format.toUpperCase()}),()=>{const job=$(i===0?'job-text':`job-text-${i+1}`).value,title=$(i===0?'job-title':`job-title-${i+1}`).value.trim();if(!job.trim()){closeModal($('export-modal'));setStep('vacancy');sayKey('cvF_completeVacancy');return;}const p=tailored(profile(),job);if(title)p.headline=t('cvF_objective',{title});exportPaid(p,template,format,`cv-vacante-${i+1}`);}));});
  root.append(action(t('cvF_editableLetter'),()=>{try{if(!entitlement)throw new Error(t('cvF_verifyBeforeDownload'));const letter=$('cover-letter').value.trim()||letterText();download(buildCoverLetterDocx(profile(),letter,{template}),'carta-presentacion.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');$('checkout-status').textContent=t('cvF_letterReady');}catch(e){$('checkout-status').textContent=t('cvF_exportError');}}));
 }
}
function exportPaid(p,tpl,format,name){try{if(!entitlement)throw new Error(t('cvF_verifyBeforeDownload'));const data=format==='pdf'?buildCvPdf(p,{template:tpl}):buildDocx(p,{template:tpl});download(data,name+'.'+format,format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');$('checkout-status').textContent=t('cvF_fileReady');}catch(e){$('checkout-status').textContent=t('cvF_exportError');}}
async function buy(plan){
 if(paymentBusy)return;try{buildCvPdf(profile(),{template});}catch(e){$('checkout-status').textContent=t('cvF_checkPdfFirst');return;}track(plan==='pro'?'cv_checkout_pro_click':'cv_checkout_plus_click');paymentBusy=true;const request=++paymentRevision;
 $('checkout-status').textContent=t('cvF_checkoutPreparing');$('buy-pro').disabled=true;$('buy-plus').disabled=true;
 try{const result=await beginCheckout(plan);if(request!==paymentRevision)return;checkout=result;const a=document.createElement('a');a.href=checkout.url;a.target='_blank';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove();$('license-access').open=true;$('license-plan').value=plan;$('checkout-status').textContent=t('cvF_checkoutInstructions');const reopen=node('a','secondary',t('cvF_openGumroad'));reopen.href=checkout.url;reopen.target='_blank';reopen.rel='noopener noreferrer';$('checkout-status').append(document.createTextNode(' '),reopen);}
 catch(e){if(request===paymentRevision)$('checkout-status').textContent=t('cvF_checkoutError');}finally{if(request===paymentRevision){paymentBusy=false;$('buy-pro').disabled=false;$('buy-plus').disabled=false;}}
}
function reset(){clearTimeout(updateTimer);importRequest++;revision++;paymentRevision++;paymentBusy=false;afterTxt=false;$('buy-pro').disabled=false;$('buy-plus').disabled=false;$('verify-payment').disabled=false;$('cv-form').reset();$('experiences').replaceChildren();counter=0;addExperience();sourceText='';extraction=null;entitlement=null;checkout=null;previewLicense();$('source-text').value='';$('import-status').textContent='';$('paid-downloads').hidden=true;$('paid-downloads').replaceChildren();$('license-key').value='';$('license-access').open=false;setStep('profile');update();sayKey('cvF_resetMessage');}

document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>setStep(b.dataset.step)));
document.querySelectorAll('[data-template]').forEach(b=>b.addEventListener('click',()=>{if(template!==b.dataset.template){markStarted();track('cv_preview_template_switch');}template=b.dataset.template;document.querySelectorAll('[data-template][aria-pressed]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();}));
$('next-step').addEventListener('click',()=>setStep(steps[steps.indexOf(step)+1]));$('previous-step').addEventListener('click',()=>setStep(steps[steps.indexOf(step)-1]));
$('cv-form').addEventListener('submit',e=>{e.preventDefault();finish();});$('cv-form').addEventListener('input',changed);$('cv-form').addEventListener('change',changed);
$('add-experience').addEventListener('click',()=>{addExperience();changed();});$('export-document').addEventListener('click',finish);
$('prepare-letter').addEventListener('click',()=>{if($('cover-letter').value.trim()&&!confirm(t('cvF_replaceLetter')))return;$('cover-letter').value=letterText();sayKey('cvF_preparedLetter');});
$('clear-data').addEventListener('click',()=>{if(confirm(t('cvF_clearConfirm')))reset();});
$('load-example').addEventListener('click',()=>{
 if(fields.some(k=>$('cv-'+k).value.trim())&&!confirm(t('cvF_replaceExample')))return;
 markStarted();reset();const demo={name:'Andrea Molina · Ejemplo',headline:'Analista de operaciones',summary:'Analista con experiencia en organización de información y seguimiento de procesos. Elaboro reportes para facilitar decisiones operativas.',skills:'Excel, análisis de datos',education:'Licenciatura en Administración · Institución de ejemplo'};
 for(const key of fields)$('cv-'+key).value=demo[key]||'';$('experiences').replaceChildren();counter=0;
 addExperience({role:'Analista de operaciones',company:'Organización de ejemplo',start:'2022-03',end:'2025-06',description:'Responsable de reportes.'});$('job-title').value='Analista de operaciones';$('job-text').value='Requisitos: Excel, SQL y Power BI. Funciones: análisis de datos y seguimiento de inventarios.';update();sayKey('cvF_exampleMessage');
});
$('source-text').addEventListener('input',()=>{sourceText=$('source-text').value;extraction={status:'ok',format:'paste',imported:true,warnings:[]};changed();});
$('use-source').addEventListener('click',()=>{const value=$('source-text').value.trim();if(!value){sayKey('cvF_pasteFirst');return;}if(value.length>2500){sayKey('cvF_sourceTooLong');return;}if($('cv-summary').value.trim()&&!confirm(t('cvF_replaceSummary')))return;$('cv-summary').value=value;changed();sayKey('cvF_sourceUsed');});
$('cv-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;const request=++importRequest,started=revision;$('import-status').textContent=t('cvF_importReading');const result=await readCvFile(file);if(request!==importRequest)return;if(started!==revision){$('import-status').textContent=t('cvF_importStale');return;}extraction=result.extraction;if(result.extraction.status==='error'){$('import-status').textContent=t('cvF_importFailed');sourceText='';$('source-text').value='';}else{sourceText=result.text;$('source-text').value=result.text;$('import-status').textContent=t('cvF_importRead',{n:result.text.length})+(result.extraction.warnings.length?' '+t('cvF_importWarning'):'');}changed();});
$('free-download').addEventListener('click',e=>{e.preventDefault();try{download('\uFEFF'+buildPlainText(profile()),'mi-cv.txt','text/plain;charset=utf-8');track('cv_txt_download');afterTxt=true;$('checkout-dialogue').textContent=t('cvF_afterTxt');$('support-copy').hidden=true;$('support-after-download').hidden=false;$('checkout-status').textContent=t('cvF_txtReady');sayKey('cvF_afterTxt');$('support-after-download').scrollIntoView({block:'nearest',behavior:'auto'});}catch(error){$('checkout-status').textContent=t('cvF_exportError');}});
$('support-two').href=supportUrl(2);$('support-five').href=supportUrl(5);
$('buy-pro').addEventListener('click',()=>buy('pro'));$('buy-plus').addEventListener('click',()=>buy('plus'));
$('verify-payment').addEventListener('click',async()=>{
 if(paymentBusy)return;const licenseKey=$('license-key').value.trim(),plan=$('license-plan').value;
 if(!licenseKey){$('checkout-status').textContent=t('cvF_licenseNeeded');$('license-key').focus();return;}
 paymentBusy=true;const request=++paymentRevision;$('verify-payment').disabled=true;$('checkout-status').textContent=t('cvF_licenseChecking');
 try{const active=await beginCheckout(plan);if(request!==paymentRevision)return;checkout=active;const result=await verifyCheckout(active.session,{licenseKey,plan});if(request!==paymentRevision||checkout!==active)return;entitlement=result;previewLicense();
 if(!entitlement){$('checkout-status').textContent=t('cvF_licenseInvalid');return;}
 $('license-key').value='';previewLicense();track('cv_license_activated');$('checkout-status').textContent=entitlement.test?t('cvF_licenseTest'):t('cvF_licenseSuccess');paidFiles(entitlement.plan);
 }catch(e){if(request===paymentRevision)$('checkout-status').textContent=t('cvF_checkoutError');}finally{if(request===paymentRevision){paymentBusy=false;$('verify-payment').disabled=false;}}
});
$('confirm-keyword').addEventListener('click',()=>{if(!pendingKeyword)return;const skills=$('cv-skills'),next=[skills.value.trim(),pendingKeyword].filter(Boolean).join(', ');if(next.length>skills.maxLength){closeModal($('keyword-modal'));setStep('profile');skills.focus();sayKey('cvF_skillFull');return;}skills.value=next;pendingKeyword='';closeModal($('keyword-modal'));changed();sayKey('cvF_skillAdded');});
$('cancel-keyword').addEventListener('click',()=>closeModal($('keyword-modal')));$('close-export').addEventListener('click',()=>closeModal($('export-modal')));
for(const dialog of [$('export-modal'),$('keyword-modal')]){dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');modalOpener?.focus();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal(dialog);}});}
// Decorative CSS overlay is never part of exported TXT/PDF/DOCX content.
document.addEventListener('portfolio:language',refreshFunnelCopy);
$('cv-preview').addEventListener('dragstart',e=>e.preventDefault());
window.addEventListener('pagehide',()=>{clearTimeout(updateTimer);importRequest++;reset();});
addExperience();setStep('profile');previewLicense();refreshFunnelCopy();
