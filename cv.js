import { analyzeCv, improveActionText, extractJobKeywords } from './cv-diagnostics.js';
import { buildPlainText, buildCvPdf, buildDocx, buildCoverLetterDocx, normalizeCvProfile } from './cv-exports.js';
import { readCvFile } from './cv-import.js';
import { beginCheckout, verifyCheckout, CONVERSION_COPY, SUPPORT_COPY, supportUrl } from './cv-checkout.js';

const $=id=>document.getElementById(id);
const fields=['name','headline','email','phone','location','summary','skills','education'];
const steps=['profile','experience','vacancy','review'];
let step='profile',template='sobria',counter=0,sourceText='',extraction=null,revision=0,importRequest=0;
let analysis={findings:[],keywords:[],missingKeywords:[]},pendingKeyword='',checkout=null,entitlement=null;
let updateTimer,paymentRevision=0,paymentBusy=false;
const node=(tag,cls='',text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const action=(text,fn,cls='secondary')=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
function say(text){$('axiom-message').textContent=text;}
function status(text){$('cv-status').textContent=text;}
function profile(){return Object.fromEntries([...fields.map(key=>[key,$('cv-'+key).value]),['experiences',Array.from($('experiences').children).map(card=>({id:card.dataset.id,...Object.fromEntries(['role','company','start','end','description'].map(key=>[key,card.querySelector(`[data-field="${key}"]`).value])),current:card.querySelector('[data-field="current"]').checked})).filter(item=>item.role||item.company||item.description||item.start||item.end)]]);}
function addExperience(value={}){
 if($('experiences').children.length>=20){say('Puedes incluir hasta veinte experiencias. Prioriza las más relevantes.');return;}
 const id=`exp-${++counter}`, card=node('article','experience');card.dataset.id=id;
 const head=node('div','experience-heading');head.append(node('h3','',`Experiencia ${counter}`),action('Eliminar',()=>{card.remove();changed();},'quiet'));card.append(head);
 const grid=node('div','field-grid');
 for(const [key,label,type,max] of [['role','Puesto','text',180],['company','Organización o proyecto','text',180],['start','Desde','month',10],['end','Hasta','month',10],['description','Qué hiciste y qué resultado obtuviste','textarea',5000]]){
  const wrap=node('label',key==='description'?'wide':'',label), input=document.createElement(type==='textarea'?'textarea':'input');
  input.id=`${id}-${key}`;wrap.htmlFor=input.id;input.dataset.field=key;
  if(type==='textarea'){input.rows=4;input.placeholder='Ej. Organicé el inventario de 3 sucursales y reduje diferencias de registro.';}else input.type=type;
  input.maxLength=max;input.value=value[key]||'';wrap.append(input);grid.append(wrap);
 }
 const check=node('label','check wide'), current=document.createElement('input');current.type='checkbox';current.dataset.field='current';current.id=id+'-current';current.checked=!!value.current;check.htmlFor=current.id;check.append(current,document.createTextNode('Actualmente trabajo aquí'));grid.append(check);card.append(grid);$('experiences').append(card);
 const end=card.querySelector('[data-field=end]');end.disabled=current.checked;
 current.addEventListener('change',()=>{end.disabled=current.checked;if(current.checked)end.value='';});
}
function setStep(next){
 if(!steps.includes(next))return;step=next;
 document.querySelectorAll('[data-panel]').forEach(n=>n.hidden=n.dataset.panel!==next);
 document.querySelectorAll('[data-step]').forEach(n=>{if(n.dataset.step===next)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');});
 $('previous-step').hidden=next==='profile';$('next-step').hidden=next==='review';$('export-document').hidden=next!=='review';
 if(next==='review')update();
}
function textSection(parent,title,value){if(!value.trim())return;const section=node('section');section.append(node('h3','',title),node('p','',value));parent.append(section);}
function renderPreview(p){
 const content=$('preview-content');content.replaceChildren();
 const header=node('header','document-head');header.append(node('h2','',p.name||'Tu nombre y apellidos'),node('p','',p.headline||'Tu especialidad o puesto'));
 const contact=[p.location,p.email,p.phone].filter(Boolean).join(' · ');if(contact)header.append(node('p','document-contact',contact));content.append(header);
 textSection(content,'Perfil profesional',p.summary||'Cuenta qué haces, en qué tienes experiencia y qué aportas. Tu resumen aparecerá aquí.');
 const skills=()=>textSection(content,'Competencias',p.skills);
 if(template==='tecnica')skills();
 if(p.experiences.length){const sec=node('section');sec.append(node('h3','','Experiencia profesional'));for(const item of p.experiences){sec.append(node('p','document-role',[item.role,item.company].filter(Boolean).join(' · ')),node('p','document-dates',[item.start,item.current?'Actualidad':item.end].filter(Boolean).join(' — ')),node('p','',item.description));}content.append(sec);}
 if(template==='ejecutiva')skills();textSection(content,'Formación',p.education);if(template==='sobria')skills();
 $('cv-preview').dataset.template=template;
}
function focusExperience(id,key){setStep('experience');const card=Array.from($('experiences').children).find(n=>n.dataset.id===id),input=card?.querySelector(`[data-field="${key}"]`);input?.focus();input?.scrollIntoView({block:'center',behavior:'auto'});}
function fixFinding(finding){
 if(finding.type==='keyword'){pendingKeyword=finding.keyword;$('keyword-confirm-copy').textContent=pendingKeyword;openModal($('keyword-modal'));return;}
 if(finding.type==='date'){focusExperience(finding.experienceId,finding.id.endsWith('missing-end')||finding.id.endsWith('invalid-end')?'end':'start');say('Completa las fechas reales. Si sigue siendo tu trabajo, marca «Actualmente trabajo aquí».');return;}
 if(finding.type==='description'){
  setStep('experience');const card=Array.from($('experiences').children).find(n=>n.dataset.id===finding.experienceId),input=card?.querySelector('[data-field=description]');
  if(input && finding.id.endsWith(':action')){const improved=improveActionText(input.value);if(improved!==input.value){input.value=improved;changed();say('Ajusté la frase manteniendo lo que escribiste. Comprueba que describe tu función.');}}
  focusExperience(finding.experienceId,'description');
  if(finding.id.endsWith(':metrics'))say('Añade una cifra o alcance que puedas respaldar: cantidad, frecuencia, plazo o resultado. No hace falta inventar porcentajes.');
  else if(finding.id.endsWith(':short'))say('Cuenta la tarea, cómo la realizaste y qué resultado obtuviste.');
  return;
 }
 setStep('profile');const details=$('source-text').closest('details');details.open=true;$('source-text').focus();say('Revisa el texto original y pega una copia legible. Después pásala al resumen o distribúyela en tus campos.');
}
function renderFindings(){
 const target=$('findings');target.replaceChildren();const old=Number($('friction-count').textContent),count=analysis.findings.length;
 $('friction-count').textContent=String(count);if(count<old){$('friction-count').classList.remove('improved');requestAnimationFrame(()=>$('friction-count').classList.add('improved'));}
 $('keyword-summary').textContent=analysis.keywords.length?`${analysis.matchedKeywords.length} de ${analysis.keywords.length} términos del catálogo coinciden con tu CV. Las ausencias son puntos para revisar, no requisitos confirmados.`:($('job-text').value.trim()?'No identifiqué términos del catálogo en esta vacante. Revisa sus requisitos manualmente.':'Añade una vacante para comparar sus palabras clave.');
 if(!count){target.append(node('p','no-findings',profile().name?'Sin hallazgos en estas reglas. Haz también una revisión personal del contenido.':'Empieza por tus datos. Axiom revisará lo que vayas escribiendo.'));return;}
 const labels={keyword:'COINCIDENCIA CON LA VACANTE',date:'FECHAS',description:'REDACCIÓN',extraction:'EXTRACCIÓN DE TEXTO'};
 for(const f of analysis.findings){const item=node('article','finding');item.append(node('span','finding-type',labels[f.type]),node('strong','',f.title),node('p','',f.detail),action(f.type==='keyword'?'Revisar esta habilidad':f.type==='extraction'?'Revisar texto':'Revisar y mejorar',()=>fixFinding(f)));target.append(item);}
}
function update(){const p=profile();renderPreview(p);analysis=analyzeCv({profile:p,jobText:$('job-text').value,sourceText,extraction});renderFindings();$('review-summary').textContent=`${p.experiences.length} experiencias · ${analysis.findings.length} puntos de fricción para revisar · Plantilla ${template}. Puedes exportar aunque queden observaciones.`;}
function changed(){revision++;clearTimeout(updateTimer);updateTimer=setTimeout(update,160);}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
let modalOpener;
function openModal(dialog){modalOpener=document.activeElement;if(!dialog.open)dialog.showModal();document.body.classList.add('modal-open');}
function closeModal(dialog){dialog.close();document.body.classList.remove('modal-open');modalOpener?.focus();}
function validateForExport(){try{normalizeCvProfile(profile());if(!$('cv-email').validity.valid)throw new Error('Revisa el correo de contacto.');return true;}catch(error){say(error.message);status(error.message);setStep('profile');$('cv-name').focus();return false;}}
function finish(){clearTimeout(updateTimer);update();if(!validateForExport())return;$('checkout-dialogue').textContent=CONVERSION_COPY;$('checkout-status').textContent='';$('support-after-download').hidden=true;openModal($('export-modal'));}
function letterText(){const p=profile(),title=$('job-title').value.trim()||p.headline;return ['A quien corresponda:',`Me interesa postularme${title?' al puesto de '+title:''}.`,p.summary||[p.headline,p.skills?'Mis competencias incluyen '+p.skills+'.':''].filter(Boolean).join('. '),'Adjunto mi currículum para que puedan revisar mi experiencia y formación. Quedo a disposición para ampliar la información sobre mi trayectoria.','Atentamente,',p.name].filter(Boolean).join('\n\n');}
function tailored(p,job){const keywords=extractJobKeywords(job),norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const skills=p.skills.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean);skills.sort((a,b)=>Number(keywords.some(k=>norm(b).includes(norm(k))))-Number(keywords.some(k=>norm(a).includes(norm(k)))));return {...p,skills:skills.join(', ')};}
function paidFiles(plan){
 // This path is reached only following a successful server verification.
 const root=$('paid-downloads');root.replaceChildren();root.hidden=false;root.append(node('h3','','Tu entrega'));
 if(plan==='pro')for(const tpl of ['sobria','tecnica','ejecutiva'])for(const format of ['pdf','docx'])root.append(action(`${tpl} · ${format.toUpperCase()}`,()=>exportPaid(profile(),tpl,format,`cv-${tpl}`)));
 if(plan==='plus'){
  const jobs=[$('job-text').value,$('job-text-2').value,$('job-text-3').value];
  if(jobs.some(j=>!j.trim()))root.append(node('p','small','Completa las tres vacantes en el paso 03 para preparar versiones con sus habilidades relevantes primero.'));
  jobs.forEach((_,i)=>{for(const format of ['pdf','docx'])root.append(action(`Vacante ${i+1} · ${format.toUpperCase()}`,()=>{const job=$(i===0?'job-text':`job-text-${i+1}`).value,title=$(i===0?'job-title':`job-title-${i+1}`).value.trim();if(!job.trim()){closeModal($('export-modal'));setStep('vacancy');say('Completa el texto de esta vacante para preparar su versión.');return;}const p=tailored(profile(),job);if(title)p.headline='Objetivo: '+title;exportPaid(p,template,format,`cv-vacante-${i+1}`);}));});
  root.append(action('Carta editable · DOCX',()=>{try{if(!entitlement)throw new Error('Comprueba tu compra antes de descargar.');const letter=$('cover-letter').value.trim()||letterText();download(buildCoverLetterDocx(profile(),letter,{template}),'carta-presentacion.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');$('checkout-status').textContent='Carta preparada. Revisa tu carpeta de descargas.';}catch(e){$('checkout-status').textContent=e.message;}}));
 }
}
function exportPaid(p,tpl,format,name){try{if(!entitlement)throw new Error('Comprueba tu compra antes de descargar.');const data=format==='pdf'?buildCvPdf(p,{template:tpl}):buildDocx(p,{template:tpl});download(data,name+'.'+format,format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');$('checkout-status').textContent='Archivo preparado. Revisa tu carpeta de descargas.';}catch(e){$('checkout-status').textContent=e.message;}}
async function buy(plan){
 if(paymentBusy)return;try{buildCvPdf(profile(),{template});}catch(e){$('checkout-status').textContent='Antes de comprar, revisa el PDF: '+e.message;return;}paymentBusy=true;const request=++paymentRevision;
 $('checkout-status').textContent='Preparando la compra…';$('buy-pro').disabled=true;$('buy-plus').disabled=true;
 try{const result=await beginCheckout(plan);if(request!==paymentRevision)return;checkout=result;const a=document.createElement('a');a.href=checkout.url;a.target='_blank';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove();$('license-access').open=true;$('license-plan').value=plan;$('checkout-status').textContent='Completa la compra en Gumroad y pega aquí la clave de tu recibo. Si no se abrió otra pestaña, usa el enlace de compra.';const reopen=node('a','secondary','Abrir compra en Gumroad');reopen.href=checkout.url;reopen.target='_blank';reopen.rel='noopener noreferrer';$('checkout-status').append(document.createTextNode(' '),reopen);}
 catch(e){if(request===paymentRevision)$('checkout-status').textContent=e.message;}finally{if(request===paymentRevision){paymentBusy=false;$('buy-pro').disabled=false;$('buy-plus').disabled=false;}}
}
function reset(){clearTimeout(updateTimer);importRequest++;revision++;paymentRevision++;paymentBusy=false;$('buy-pro').disabled=false;$('buy-plus').disabled=false;$('verify-payment').disabled=false;$('cv-form').reset();$('experiences').replaceChildren();counter=0;addExperience();sourceText='';extraction=null;entitlement=null;checkout=null;$('source-text').value='';$('import-status').textContent='';$('paid-downloads').hidden=true;$('paid-downloads').replaceChildren();$('license-key').value='';$('license-access').open=false;setStep('profile');update();say('Empezamos de nuevo. Tus datos se borraron del editor.');}

document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>setStep(b.dataset.step)));
document.querySelectorAll('[data-template]').forEach(b=>b.addEventListener('click',()=>{template=b.dataset.template;document.querySelectorAll('[data-template][aria-pressed]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();}));
$('next-step').addEventListener('click',()=>setStep(steps[steps.indexOf(step)+1]));$('previous-step').addEventListener('click',()=>setStep(steps[steps.indexOf(step)-1]));
$('cv-form').addEventListener('submit',e=>{e.preventDefault();finish();});$('cv-form').addEventListener('input',changed);$('cv-form').addEventListener('change',changed);
$('add-experience').addEventListener('click',()=>{addExperience();changed();});$('export-document').addEventListener('click',finish);
$('prepare-letter').addEventListener('click',()=>{if($('cover-letter').value.trim()&&!confirm('¿Reemplazar la carta actual por una versión basada en tus campos?'))return;$('cover-letter').value=letterText();say('La carta está preparada con tus datos. Dale tu voz antes de enviarla.');});
$('clear-data').addEventListener('click',()=>{if(confirm('¿Borrar los datos del editor? Las descargas de tu dispositivo se conservarán.'))reset();});
$('load-example').addEventListener('click',()=>{
 if(fields.some(k=>$('cv-'+k).value.trim())&&!confirm('¿Reemplazar tus datos por un ejemplo ficticio?'))return;
 reset();const demo={name:'Andrea Molina · Ejemplo',headline:'Analista de operaciones',summary:'Analista con experiencia en organización de información y seguimiento de procesos. Elaboro reportes para facilitar decisiones operativas.',skills:'Excel, análisis de datos',education:'Licenciatura en Administración · Institución de ejemplo'};
 for(const key of fields)$('cv-'+key).value=demo[key]||'';$('experiences').replaceChildren();counter=0;
 addExperience({role:'Analista de operaciones',company:'Organización de ejemplo',start:'2022-03',end:'2025-06',description:'Responsable de reportes.'});$('job-title').value='Analista de operaciones';$('job-text').value='Requisitos: Excel, SQL y Power BI. Funciones: análisis de datos y seguimiento de inventarios.';update();say('Este ejemplo tiene puntos mejorables a propósito. Abre la revisión y prueba una corrección.');
});
$('source-text').addEventListener('input',()=>{sourceText=$('source-text').value;extraction={status:'ok',format:'paste',imported:true,warnings:[]};changed();});
$('use-source').addEventListener('click',()=>{const value=$('source-text').value.trim();if(!value){say('Pega primero el texto legible de tu documento.');return;}if(value.length>2500){say('El texto es largo para el resumen. Distribúyelo entre experiencia y formación; puedes copiarlo desde el campo original.');return;}if($('cv-summary').value.trim()&&!confirm('¿Reemplazar el resumen por el texto original?'))return;$('cv-summary').value=value;changed();say('Texto incorporado al resumen. Ahora puedes distribuirlo en sus secciones.');});
$('cv-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;const request=++importRequest,started=revision;$('import-status').textContent='Leyendo el archivo en este dispositivo…';const result=await readCvFile(file);if(request!==importRequest)return;if(started!==revision){$('import-status').textContent='El editor cambió durante la lectura. Selecciona de nuevo el archivo para importarlo.';return;}extraction=result.extraction;if(result.extraction.status==='error'){$('import-status').textContent=result.extraction.error||result.extraction.warnings.join(' ');sourceText='';$('source-text').value='';}else{sourceText=result.text;$('source-text').value=result.text;$('import-status').textContent=`Texto extraído: ${result.text.length} caracteres. ${result.extraction.warnings.join(' ')}`;}changed();});
$('free-download').addEventListener('click',e=>{e.preventDefault();try{download('\uFEFF'+buildPlainText(profile()),'mi-cv.txt','text/plain;charset=utf-8');$('checkout-dialogue').textContent=SUPPORT_COPY;$('support-copy').hidden=true;$('support-after-download').hidden=false;$('checkout-status').textContent='Descarga iniciada. El apoyo es opcional.';say(SUPPORT_COPY);$('support-after-download').scrollIntoView({block:'nearest',behavior:'auto'});}catch(error){$('checkout-status').textContent=error.message;}});
$('support-two').href=supportUrl(2);$('support-five').href=supportUrl(5);
$('buy-pro').addEventListener('click',()=>buy('pro'));$('buy-plus').addEventListener('click',()=>buy('plus'));
$('verify-payment').addEventListener('click',async()=>{
 if(paymentBusy)return;const licenseKey=$('license-key').value.trim(),plan=$('license-plan').value;
 if(!licenseKey){$('checkout-status').textContent='Pega la clave de licencia que aparece en tu recibo de Gumroad.';$('license-key').focus();return;}
 paymentBusy=true;const request=++paymentRevision;$('verify-payment').disabled=true;$('checkout-status').textContent='Comprobando tu licencia con Gumroad…';
 try{const active=await beginCheckout(plan);if(request!==paymentRevision)return;checkout=active;const result=await verifyCheckout(active.session,{licenseKey,plan});if(request!==paymentRevision||checkout!==active)return;entitlement=result;
 if(!entitlement){$('checkout-status').textContent='La licencia no confirma una compra activa de este paquete. Revisa la clave y el paquete de tu recibo.';return;}
 $('license-key').value='';$('checkout-status').textContent=entitlement.test?'Licencia de prueba del creador confirmada. Puedes comprobar los archivos; no se realizó un cobro.':'Compra confirmada. Tus archivos están listos para preparar.';paidFiles(entitlement.plan);
 }catch(e){if(request===paymentRevision)$('checkout-status').textContent=e.message;}finally{if(request===paymentRevision){paymentBusy=false;$('verify-payment').disabled=false;}}
});
$('confirm-keyword').addEventListener('click',()=>{if(!pendingKeyword)return;const skills=$('cv-skills'),next=[skills.value.trim(),pendingKeyword].filter(Boolean).join(', ');if(next.length>skills.maxLength){closeModal($('keyword-modal'));setStep('profile');skills.focus();say('El campo de habilidades está completo. Acórtalo antes de añadir otra.');return;}skills.value=next;pendingKeyword='';closeModal($('keyword-modal'));changed();say('Habilidad añadida. Ahora aparece en tu perfil y en la comparación.');});
$('cancel-keyword').addEventListener('click',()=>closeModal($('keyword-modal')));$('close-export').addEventListener('click',()=>closeModal($('export-modal')));
for(const dialog of [$('export-modal'),$('keyword-modal')]){dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');modalOpener?.focus();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal(dialog);}});}
// Decorative overlay is never part of exported TXT/PDF/DOCX content.
for(let i=0;i<12;i++)document.querySelector('.watermarks').append(node('span','','PREVIEW · LABORATORIO AXIOM'));
$('cv-preview').addEventListener('dragstart',e=>e.preventDefault());
window.addEventListener('pagehide',()=>{clearTimeout(updateTimer);importRequest++;reset();});
addExperience();setStep('profile');update();
