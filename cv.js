import { analyzeCv, improveActionText, extractJobKeywords, findingPresentation } from './cv-diagnostics.js?v=cv23';
import { buildPlainText, buildCvPdf, buildDocx, buildCoverLetterDocx, normalizeCvProfile, pdfCharacterIssues } from './cv-exports.js?v=2053bdee3ebd';
import { readCvFile } from './cv-import.js';
import { parseCvText, composeAchievement, readinessFor, buildCvProject, parseCvProject } from './cv-workflow.js?v=cv23';
import { beginCheckout, verifyCheckout, supportUrl } from './cv-checkout.js';
import { mountPageVoice } from './page-voice.js?v=voice-36';

const cvVoice=mountPageVoice({page:'cv',initialKey:'welcome2'});

const $=id=>document.getElementById(id);
// Shared dictionaries contain all new UI copy. No visitor text leaves this page
// through measurement: only the fixed event names below are dispatched.
const t=(key,values={})=>window.I18N?.t(key,values)||String(window.TRANSLATIONS?.[document.documentElement.lang==='en'?'en':'es']?.[key]||window.TRANSLATIONS?.es?.[key]||key).replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
const track=name=>document.dispatchEvent(new CustomEvent('portfolio:measurement',{detail:name}));
let started=false,diagnosisSeen=false,afterTxt=false,axiomMessageKey='cvF_greeting',axiomMessageValues={};
let exampleProfile = null;
function markStarted(){if(!started){started=true;track('cv_start');}}
const fields=['name','headline','email','phone','location','summary','skills','education'];
const steps=['profile','experience','vacancy','review'];
let step='profile',template='sobria',counter=0,sourceText='',extraction=null,revision=0,importRequest=0;
let analysis={findings:[],keywords:[],missingKeywords:[]},pendingKeyword='',checkout=null,entitlement=null;
let updateTimer,paymentRevision=0,paymentBusy=false;
let documentLanguage=document.documentElement.lang.startsWith('en')?'en':'es',documentLanguageChosen=false,importProposal=null,achievementTarget=null,unassignedSource='';
const dt=(key,values={})=>String(window.TRANSLATIONS?.[documentLanguage]?.[key]||window.TRANSLATIONS?.es?.[key]||key).replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
const exportOptions=tpl=>({template:tpl||template,language:documentLanguage});
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
 const helper=action(t('cvQ_achievementOpen'),()=>openAchievement(id),'quiet achievement-helper');helper.dataset.achievementOpen='';card.append(helper);
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
 textSection(content,dt('cvF_previewSummary'),p.summary||dt('cvQ_previewSummaryHint'));
 const skills=()=>textSection(content,dt('cvF_previewSkills'),p.skills);
 if(template==='tecnica')skills();
 if(p.experiences.length){const sec=node('section');sec.append(node('h3','',dt('cvF_previewExperience')));for(const item of p.experiences){const entry=node('div','document-entry');entry.append(node('p','document-role',[item.role,item.company].filter(Boolean).join(' · ')),node('p','document-dates',[item.start,item.current?dt('cvF_present'):item.end].filter(Boolean).join(' — ')),node('p','',item.description));sec.append(entry);}content.append(sec);}
 if(template==='ejecutiva')skills();textSection(content,dt('cvF_previewEducation'),p.education);if(template==='sobria')skills();
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
function update(){if(!documentLanguageChosen)documentLanguage=document.documentElement.lang.startsWith('en')?'en':'es';const p=profile();renderPreview(p);analysis=analyzeCv({profile:p,jobText:$('job-text').value,sourceText,extraction});renderFindings();renderBlindSpots();$('review-summary').textContent=t('cvF_summaryReview',{n:p.experiences.length,count:analysis.findings.length,template:t('cvF_'+template)});updateQuality(p);}
function changed(){markStarted();revision++;clearTimeout(updateTimer);updateTimer=setTimeout(update,160);}
function renderInterviewResource() {
 const language = document.documentElement.lang.startsWith('en') ? 'en' : 'es';
 const mode = new URLSearchParams(location.search).get('modo') === 'laboratorio' ? 'laboratorio' : 'oficina';
 const query = new URLSearchParams({ idioma: language, modo: mode });
 const sample = language === 'en' ? 'index-en.html' : 'index.html';
 const resource = $('cv-interview-resource');
 for (const label of resource.querySelectorAll('[data-en]')) label.textContent = label.dataset[language];
 $('cv-interview-sample').href = `muestras/entrevista/${sample}?${query}`;
}
function showInterviewResource() {
 renderInterviewResource();
 $('cv-interview-resource').hidden = false;
}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
let modalOpener;
function openModal(dialog){modalOpener=document.activeElement;if(!dialog.open)dialog.showModal();document.body.classList.add('modal-open');}
function closeModal(dialog){dialog.close();document.body.classList.remove('modal-open');modalOpener?.focus();}
function validateForExport(){try{normalizeCvProfile(profile());if(!$('cv-email').validity.valid)throw new Error(t('cvF_validEmail'));return true;}catch(error){sayKey('cvF_exportError');status(t('cvF_exportError'));setStep('profile');$('cv-name').focus();return false;}}
function finish(){clearTimeout(updateTimer);update();if(!validateForExport())return;afterTxt=false;$('checkout-dialogue').textContent=t('cvF_conversion');$('checkout-status').textContent='';$('support-after-download').hidden=true;$('cv-interview-resource').hidden=true;openModal($('export-modal'));track('cv_paywall_seen');void cvVoice.react('finish',{priority:3,maxAge:6000});}
function letterText(){const p=profile(),title=$('job-title').value.trim()||p.headline;return [dt('cvF_letterSalutation'),title?dt('cvF_letterInterest',{title}):dt('cvF_letterGeneral'),p.summary||[p.headline,p.skills?dt('cvF_letterSkills',{skills:p.skills}):''].filter(Boolean).join('. '),dt('cvF_letterBody'),dt('cvF_letterClosing'),p.name].filter(Boolean).join('\n\n');}
function tailored(p,job){const keywords=extractJobKeywords(job),norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const skills=p.skills.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean);skills.sort((a,b)=>Number(keywords.some(k=>norm(b).includes(norm(k))))-Number(keywords.some(k=>norm(a).includes(norm(k)))));return {...p,skills:skills.join(', ')};}
function paidFiles(plan){
 // This path is reached only following a successful server verification.
 const root=$('paid-downloads');root.replaceChildren();root.hidden=false;root.append(node('h3','',t('cvF_deliveryTitle')));
 if(plan==='pro')for(const tpl of ['sobria','tecnica','ejecutiva'])for(const format of ['pdf','docx'])root.append(action(`${t('cvF_'+tpl)} · ${format.toUpperCase()}`,()=>exportPaid(profile(),tpl,format,`cv-${tpl}`)));
 if(plan==='plus'){
  const jobs=[$('job-text').value,$('job-text-2').value,$('job-text-3').value];
  if(jobs.some(j=>!j.trim()))root.append(node('p','small',t('cvF_threeJobsNeeded')));
  jobs.forEach((_,i)=>{for(const format of ['pdf','docx'])root.append(action(t('cvF_vacancyDownload',{n:i+1,format:format.toUpperCase()}),()=>{const job=$(i===0?'job-text':`job-text-${i+1}`).value,title=$(i===0?'job-title':`job-title-${i+1}`).value.trim();if(!job.trim()){closeModal($('export-modal'));setStep('vacancy');sayKey('cvF_completeVacancy');return;}const p=tailored(profile(),job);if(title)p.headline=t('cvF_objective',{title});exportPaid(p,template,format,`cv-vacante-${i+1}`);}));});
  root.append(action(t('cvF_editableLetter'),()=>{try{if(!entitlement)throw new Error(t('cvF_verifyBeforeDownload'));const letter=$('cover-letter').value.trim()||letterText();download(buildCoverLetterDocx(profile(),letter,exportOptions()),'carta-presentacion.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');$('checkout-status').textContent=t('cvF_letterReady');}catch(e){$('checkout-status').textContent=exportError(e);}}));
 }
}
function exportPaid(p,tpl,format,name){$('cv-interview-resource').hidden=true;try{if(!entitlement)throw new Error(t('cvF_verifyBeforeDownload'));const data=format==='pdf'?buildCvPdf(p,exportOptions(tpl)):buildDocx(p,exportOptions(tpl));download(data,name+'.'+format,format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');$('checkout-status').textContent=t('cvF_fileReady');if(!entitlement.test)showInterviewResource();}catch(e){$('checkout-status').textContent=exportError(e);}}
async function buy(plan){
 if(paymentBusy)return;try{buildCvPdf(profile(),exportOptions());}catch(e){$('checkout-status').textContent=exportError(e);return;}track(plan==='pro'?'cv_checkout_pro_click':'cv_checkout_plus_click');paymentBusy=true;const request=++paymentRevision;
 $('checkout-status').textContent=t('cvF_checkoutPreparing');$('buy-pro').disabled=true;$('buy-plus').disabled=true;
 try{const result=await beginCheckout(plan);if(request!==paymentRevision)return;checkout=result;const a=document.createElement('a');a.href=checkout.url;a.target='_blank';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove();$('license-access').open=true;$('license-plan').value=plan;$('checkout-status').textContent=t('cvF_checkoutInstructions');const reopen=node('a','secondary',t('cvF_openGumroad'));reopen.href=checkout.url;reopen.target='_blank';reopen.rel='noopener noreferrer';$('checkout-status').append(document.createTextNode(' '),reopen);}
 catch(e){if(request===paymentRevision)$('checkout-status').textContent=t('cvF_checkoutError');}finally{if(request===paymentRevision){paymentBusy=false;$('buy-pro').disabled=false;$('buy-plus').disabled=false;}}
}
function reset(){
 $('cv-interview-resource').hidden = true;
 exampleProfile = null;
 $('cv-example-files').hidden = true;
 $('cv-example-status').textContent = '';
 clearTimeout(updateTimer);importRequest++;revision++;paymentRevision++;paymentBusy=false;afterTxt=false;$('buy-pro').disabled=false;$('buy-plus').disabled=false;$('verify-payment').disabled=false;$('cv-form').reset();$('experiences').replaceChildren();counter=0;addExperience();sourceText='';extraction=null;showUnassigned('');entitlement=null;checkout=null;previewLicense();$('source-text').value='';$('import-status').textContent='';$('paid-downloads').hidden=true;$('paid-downloads').replaceChildren();$('license-key').value='';$('license-access').open=false;setStep('profile');update();sayKey('cvF_resetMessage');}

function exportError(error){
 if(error?.code==='CV_PDF_UNSUPPORTED_CHARACTERS')return t('cvQ_pdfUnicode',{chars:(error.characters||[]).map(x=>typeof x==='string'?x:x.character).filter(Boolean).slice(0,12).join(' ')});
 return t('cvF_exportError');
}
function updateQuality(p){
 if(!documentLanguageChosen)documentLanguage=document.documentElement.lang.startsWith('en')?'en':'es';
 $('document-language').value=documentLanguage;
 const zoom=$('preview-zoom');if(zoom)zoom.textContent=t(document.querySelector('.preview-scroll').classList.contains('is-enlarged')?'cvQ_fitPreview':'cvQ_zoomPreview');
 document.querySelectorAll('[data-achievement-open]').forEach(n=>n.textContent=t('cvQ_achievementOpen'));
 const checklist=$('readiness-list');checklist.replaceChildren();
 for(const check of readinessFor(p,$('job-text').value)){const item=node('li',check.pass?'check-done':'check-pending');item.append(node('span','check-icon',check.pass?'✓':'○'),node('span','',t('cvQ_ready_'+check.id)),node('small','',t(check.pass?'cvQ_checked':'cvQ_toReview')));checklist.append(item);}
 try{$('reading-order-text').textContent=p.name?buildPlainText(p,exportOptions()):'';}catch{$('reading-order-text').textContent='';}
 const evidence=$('keyword-evidence');evidence.replaceChildren();
 for(const e of analysis.evidence||[]){const item=node('article',e.matched?'evidence-match':'evidence-missing');item.append(node('strong','',e.keyword),node('span','evidence-status',t(e.matched?'cvQ_evidenceMatched':'cvQ_evidenceMissing')));const job=node('p');job.append(node('b','',t('cvQ_evidenceJob')+': '),document.createTextNode(e.jobExcerpt));item.append(job);if(e.cvExcerpt){const cv=node('p');cv.append(node('b','',t('cvQ_evidenceCv')+': '),document.createTextNode(e.cvExcerpt));item.append(cv);}evidence.append(item);}
 if(!evidence.children.length)evidence.append(node('p','small',t('cvQ_evidenceEmpty')));
 if(p.name){const issues=pdfCharacterIssues(p);$('pdf-compatibility').textContent=issues.length?t('cvQ_pdfUnicode',{chars:[...new Set(issues.map(x=>x.character))].slice(0,12).join(' ')}):t('cvQ_pdfReady');}
 else $('pdf-compatibility').textContent='';
}
function applyProfile(p){for(const key of fields)$('cv-'+key).value=p[key]||'';$('experiences').replaceChildren();counter=0;for(const e of p.experiences||[])addExperience(e);if(!counter)addExperience();changed();update();}
function hasDocumentData(includeSource=true){const p=profile();return fields.some(key=>p[key]?.trim())||p.experiences.length>0||['job-title','job-text','job-title-2','job-text-2','job-title-3','job-text-3','cover-letter'].some(id=>$(id).value.trim())||(includeSource&&!!(sourceText.trim()||$('source-text').value.trim()||unassignedSource));}
function showUnassigned(value=''){unassignedSource=value;$('source-text').closest('details').querySelector('.import-unassigned')?.remove();if(value){const details=node('details','import-unassigned');details.open=true;details.append(node('summary','',t('cvQ_unassignedTitle')),node('pre','',value));$('source-text').closest('details').append(details);}}
function openAchievement(id){achievementTarget=Array.from($('experiences').children).find(n=>n.dataset.id===id);for(const key of ['action','scope','result'])$('achievement-'+key).value='';$('achievement-preview').textContent=t('cvQ_achievementEmpty');openModal($('achievement-modal'));$('achievement-action').focus();}
function projectData(){return {profile:profile(),template,language:documentLanguage,jobs:[0,1,2].map(i=>({title:$(i?'job-title-'+(i+1):'job-title').value,text:$(i?'job-text-'+(i+1):'job-text').value})),letter:$('cover-letter').value,source:sourceText,unassigned:unassignedSource};}
$('document-language').addEventListener('change',()=>{documentLanguage=$('document-language').value;documentLanguageChosen=true;update();});
document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>{const el=$(button.dataset.jump);el.scrollIntoView({block:'start',behavior:'auto'});if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','-1');el.focus({preventScroll:true});}));
$('quick-export').addEventListener('click',finish);
const previewZoom=action(t('cvQ_zoomPreview'),()=>{const enlarged=document.querySelector('.preview-scroll').classList.toggle('is-enlarged');previewZoom.textContent=t(enlarged?'cvQ_fitPreview':'cvQ_zoomPreview');previewZoom.setAttribute('aria-pressed',String(enlarged));},'quiet preview-zoom');previewZoom.id='preview-zoom';previewZoom.setAttribute('aria-pressed','false');document.querySelector('.template-tabs').after(previewZoom);
$('quick-blank').addEventListener('click',()=>{setStep('profile');$('cv-name').focus();});
$('quick-example').addEventListener('click',()=>$('load-example').click());
$('quick-import').addEventListener('click',()=>{setStep('profile');$('source-text').closest('details').open=true;$('source-text').focus();});
$('save-project').addEventListener('click',()=>{try{download(buildCvProject(projectData()),'mi-cv-borrador.json','application/json;charset=utf-8');$('project-status').textContent=t('cvQ_projectSaved');}catch{$('project-status').textContent=t('cvQ_projectError');}});
$('project-file').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;const request=++importRequest,atRevision=revision;
 try{if(file.size>1048576)throw new Error();const draft=parseCvProject(await file.text());if(request!==importRequest||atRevision!==revision)return;
  if(hasDocumentData()&&!confirm(t('cvQ_replaceDraft')))return;
  documentLanguage=draft.language;documentLanguageChosen=true;template=draft.template;document.querySelectorAll('button[data-template]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.template===template)));
  draft.jobs.forEach((job,i)=>{$(i?'job-title-'+(i+1):'job-title').value=job.title;$(i?'job-text-'+(i+1):'job-text').value=job.text;});$('cover-letter').value=draft.letter;sourceText=draft.source;extraction=sourceText?{status:'ok',format:'draft',imported:true,warnings:[]}:null;$('source-text').value=sourceText;showUnassigned(draft.unassigned);applyProfile(draft.profile);$('project-status').textContent=t('cvQ_projectRestored');setStep('profile');sayKey('cvQ_projectRestored');
 }catch{if(request===importRequest)$('project-status').textContent=t('cvQ_projectError');}finally{event.target.value='';}
});
$('organize-source').addEventListener('click',()=>{
 try{importProposal=parseCvText($('source-text').value);const container=$('import-review-fields');container.replaceChildren();
  for(const key of fields){container.append(node('dt','',t('cvF_field_'+key)),node('dd','',importProposal.profile[key]||t('cvQ_notDetected')));}
  container.append(node('dt','',t('cvF_stepExperience')),node('dd','',t('cvQ_experienceDetected',{n:importProposal.experienceCount})));
  for(const e of importProposal.profile.experiences)container.append(node('dt','',[e.role,e.company].filter(Boolean).join(' · ')),node('dd','',[e.start,e.current?dt('cvF_present'):e.end,e.description].filter(Boolean).join('\n')));
  $('unassigned-text').textContent=importProposal.unassigned||t('cvQ_notDetected');$('unassigned-details').open=!!importProposal.unassigned;openModal($('import-review-modal'));
 }catch{sayKey('cvQ_importError');$('import-status').textContent=t('cvQ_importError');}
});
$('apply-import').addEventListener('click',()=>{
 if(!importProposal)return;if(hasDocumentData(false)&&!confirm(t('cvQ_importReplace')))return;
 applyProfile(importProposal.profile);closeModal($('import-review-modal'));setStep('profile');sayKey('cvQ_importApplied');$('import-status').textContent=t('cvQ_importApplied');
 showUnassigned(importProposal.unassigned);
 importProposal=null;
});
for(const id of ['close-import-review','cancel-import'])$(id).addEventListener('click',()=>closeModal($('import-review-modal')));
for(const id of ['close-achievement','cancel-achievement'])$(id).addEventListener('click',()=>closeModal($('achievement-modal')));
for(const key of ['action','scope','result'])$('achievement-'+key).addEventListener('input',()=>{$('achievement-preview').textContent=composeAchievement(Object.fromEntries(['action','scope','result'].map(k=>[k,$('achievement-'+k).value])))||t('cvQ_achievementEmpty');});
$('apply-achievement').addEventListener('click',()=>{
 if(!achievementTarget?.isConnected)return;
 if(!$('achievement-action').value.trim()){$('achievement-preview').textContent=t('cvQ_achievementEmpty');$('achievement-action').focus();return;}
 const value=composeAchievement(Object.fromEntries(['action','scope','result'].map(k=>[k,$('achievement-'+k).value]))),field=achievementTarget.querySelector('[data-field=description]'),next=[field.value.trim(),value].filter(Boolean).join('\n');
 if(next.length>field.maxLength){$('achievement-preview').textContent=t('cvQ_achievementFull');return;}field.value=next;closeModal($('achievement-modal'));changed();sayKey('cvQ_achievementApplied');
});

document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>setStep(b.dataset.step)));
document.querySelectorAll('button[data-template]').forEach(b=>b.addEventListener('click',()=>{if(template!==b.dataset.template){markStarted();track('cv_preview_template_switch');}template=b.dataset.template;document.querySelectorAll('[data-template][aria-pressed]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();}));
$('next-step').addEventListener('click',()=>setStep(steps[steps.indexOf(step)+1]));$('previous-step').addEventListener('click',()=>setStep(steps[steps.indexOf(step)-1]));
$('cv-form').addEventListener('submit',e=>{e.preventDefault();finish();});$('cv-form').addEventListener('input',changed);$('cv-form').addEventListener('change',changed);
$('add-experience').addEventListener('click',()=>{addExperience();changed();});$('export-document').addEventListener('click',finish);
$('prepare-letter').addEventListener('click',()=>{if($('cover-letter').value.trim()&&!confirm(t('cvF_replaceLetter')))return;$('cover-letter').value=letterText();sayKey('cvF_preparedLetter');});
$('clear-data').addEventListener('click',()=>{if(confirm(t('cvF_clearConfirm')))reset();});
function demoProfile() {
 const english = documentLanguage === 'en';
 return {
  name: dt('cvQ_exampleName'),
  headline: dt('cvQ_exampleRole'),
  email: 'andrea@example.test',
  location: english ? 'Example City' : 'Ciudad de ejemplo',
  summary: english
   ? 'Operations analyst with experience organizing inventories and preparing reports in Excel and SQL. I document processes so teams can identify discrepancies and resolve them.'
   : 'Analista de operaciones con experiencia en organización de inventarios y preparación de reportes en Excel y SQL. Documento procesos para que el equipo identifique diferencias y pueda resolverlas.',
  skills: english ? 'Excel, SQL, data analysis' : 'Excel, SQL, análisis de datos',
  education: dt('cvQ_exampleEducation'),
  experiences: [
   {
    role: dt('cvQ_exampleRole'),
    company: dt('cvQ_exampleCompany'),
    start: '2022-03', end: '2025-06',
    description: english
     ? 'Consolidated 12 weekly inventory reports in Excel and reduced preparation time from 5 to 3 hours.\nVerified 350 records with SQL and documented discrepancies for the operations team.'
     : 'Consolidé 12 reportes semanales de inventario en Excel y reduje su preparación de 5 a 3 horas.\nVerifiqué 350 registros con SQL y documenté las diferencias para el equipo de operaciones.'
   },
   {
    role: english ? 'Operations assistant' : 'Asistente de operaciones',
    company: english ? 'Fictional Supply Project' : 'Proyecto de Abasto Ficticio',
    start: '2020-09', end: '2022-02',
    description: english
     ? 'Organized weekly checks for 3 teams and prepared a guide for tracking pending orders.'
     : 'Organicé revisiones semanales para 3 equipos y preparé una guía de seguimiento de pedidos pendientes.'
   }
  ]
 };
}

function downloadExample(format) {
 if (!exampleProfile) return;
 const status = $('cv-example-status');
 try {
  // The file only ever uses the original fictional fixture, even if the visitor edits the form.
  const pdf = format === 'pdf';
  const data = pdf ? buildCvPdf(exampleProfile, exportOptions()) : buildDocx(exampleProfile, exportOptions());
  download(data, `cv-${documentLanguage === 'en' ? 'sample' : 'ejemplo'}-${template}.${format}`,
    pdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  status.textContent = t('cvF_fileReady');
 } catch (error) {
  status.textContent = exportError(error);
 }
}

$('cv-example-pdf').addEventListener('click', () => downloadExample('pdf'));
$('cv-example-docx').addEventListener('click', () => downloadExample('docx'));
$('load-example').addEventListener('click', () => {
 if (hasDocumentData() && !confirm(t('cvF_replaceExample'))) return;
 reset();
 exampleProfile = demoProfile();
 $('job-title').value = exampleProfile.headline;
 $('job-text').value = dt('cvQ_exampleJob');
 applyProfile(exampleProfile);
 $('cv-example-files').hidden = false;
 const evidence = $('keyword-evidence').closest('details');
 evidence.open = true;
 setStep('review');
 const editorTitle = $('editor-title');
 editorTitle.setAttribute('tabindex', '-1');
 editorTitle.focus({preventScroll: true});
 editorTitle.scrollIntoView({block: 'start', behavior: 'auto'});
 sayKey('cvF_exampleMessage');
});
$('source-text').addEventListener('input',()=>{sourceText=$('source-text').value;extraction={status:'ok',format:'paste',imported:true,warnings:[]};changed();});
$('use-source').addEventListener('click',()=>{const value=$('source-text').value.trim();if(!value){sayKey('cvF_pasteFirst');return;}if(value.length>2500){sayKey('cvF_sourceTooLong');return;}if($('cv-summary').value.trim()&&!confirm(t('cvF_replaceSummary')))return;$('cv-summary').value=value;changed();sayKey('cvF_sourceUsed');});
$('cv-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;const request=++importRequest,started=revision;$('import-status').textContent=t('cvF_importReading');const result=await readCvFile(file);if(request!==importRequest)return;if(started!==revision){$('import-status').textContent=t('cvF_importStale');return;}if(result.extraction.status==='error'){$('import-status').textContent=t('cvF_importFailed');return;}extraction=result.extraction;sourceText=result.text;$('source-text').value=result.text;showUnassigned('');$('import-status').textContent=t('cvF_importRead',{n:result.text.length})+(result.extraction.warnings.length?' '+t('cvF_importWarning'):'');changed();});
$('free-download').addEventListener('click',e=>{e.preventDefault();$('cv-interview-resource').hidden=true;try{download('\uFEFF'+buildPlainText(profile(),exportOptions()),'mi-cv.txt','text/plain;charset=utf-8');track('cv_txt_download');afterTxt=true;$('checkout-dialogue').textContent=t('cvF_afterTxt');$('support-copy').hidden=true;$('support-after-download').hidden=false;$('checkout-status').textContent=t('cvF_txtReady');showInterviewResource();sayKey('cvF_afterTxt');$('support-after-download').scrollIntoView({block:'nearest',behavior:'auto'});}catch(error){$('checkout-status').textContent=exportError(error);}});
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
for(const dialog of [$('export-modal'),$('keyword-modal'),$('import-review-modal'),$('achievement-modal')]){dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');modalOpener?.focus();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal(dialog);}});}
// Decorative CSS overlay is never part of exported TXT/PDF/DOCX content.
document.addEventListener('portfolio:language',refreshFunnelCopy);
document.addEventListener('portfolio:language',renderInterviewResource);
$('cv-preview').addEventListener('dragstart',e=>e.preventDefault());
window.addEventListener('pagehide',()=>{clearTimeout(updateTimer);importRequest++;paymentRevision++;paymentBusy=false;$('buy-pro').disabled=false;$('buy-plus').disabled=false;$('verify-payment').disabled=false;});
window.addEventListener('pageshow', event => {
 if (event.persisted) reset();
});
addExperience();setStep('profile');previewLicense();refreshFunnelCopy();
