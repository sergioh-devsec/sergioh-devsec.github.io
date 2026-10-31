import { createModeManager } from './modeManager.js';
import { STATIONS } from './stationsConfig.js';
import { validateConsent, consentHash, buildConsentPdf, CONSENT_SCHEMA } from './dentalConsent.js';

// The room never loads analytics or sends document contents over the network.
const $ = id => document.getElementById(id);
const manager = createModeManager();
const en = () => manager.getLanguage() === 'en';
const text = (es, english) => en() ? english : es;
const copy = () => window.TRANSLATIONS[manager.getLanguage()][manager.getMode()];
const shared = () => window.TRANSLATIONS[manager.getLanguage()].roomShared;
const dialog = $('station-dialog');
let currentStation = null, opener = null, hashRevision = 0, hashRequest = 0;
let dentalDraft = {}, profession = 'dentista', tooltipTrigger = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = reducedMotion.matches;
const NS = 'http://www.w3.org/2000/svg';
function el(tag, cls = '', value) { const node = document.createElement(tag); node.className = cls; if (value !== undefined) node.textContent = value; return node; }
function button(value, action, cls = 'button secondary') { const node = el('button', cls, value); node.type = 'button'; node.addEventListener('click', action); return node; }
function link(value, href, cls = 'button primary') {
  const node = el('a', cls, value); const url = new URL(href, location.href);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported destination');
  node.href = href;
  if (url.origin !== location.origin) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
  return node;
}
const UI = {
  skip: ['Ir a las estaciones', 'Skip to stations'], brandLine: ['Ideas que trabajan contigo.', 'Ideas that work with you.'],
  portfolio: ['Portafolio', 'Portfolio'], hint: ['Toca un objeto o elige una estación. Axiom te acompaña.', 'Tap an object or choose a station. Axiom will guide you.'],
  cvBuilder: ['Crear mi CV', 'Build my CV'],
  stationCount: ['12 estaciones · un solo espacio', '12 stations · one shared space'], hoverHint: ['Cada objeto tiene algo para ti.', 'Every object has something for you.'],
  companion: ['/ TU CIBERASISTENTE', '/ YOUR CYBER ASSISTANT'], meet3d: ['Conoce mis gestos en 3D', 'Meet my 3D personality'],
  guidePrivacy: ['Explora sin registro. Tus documentos se generan en este navegador.', 'Explore without signing up. Documents are generated in this browser.'],
  direct: ['TAMBIÉN PUEDES IR DIRECTO', 'TAKE A SHORTCUT'], directory: ['Elige por dónde empezar.', 'Choose where to start.'],
  directoryHint: ['La misma habitación, en una lista fácil de recorrer.', 'The same room, in an easy-to-browse list.'],
  nextEyebrow: ['DE LA IDEA AL SIGUIENTE PASO', 'FROM AN IDEA TO YOUR NEXT STEP'], nextTitle: ['Primero lo entiendes. Después decides.', 'Understand first. Decide next.'],
  nextCopy: ['Prueba una herramienta gratis, mira ejemplos o prepara una estimación. Tú eliges el ritmo.', 'Try a free tool, browse examples or build an estimate. Set your own pace.'],
  quote: ['Calcular mi proyecto', 'Estimate my project'], footerLocal: ['Herramientas locales. Sin cuentas, sin subir documentos.', 'Local tools. No accounts. No document uploads.'],
  privacy: ['Privacidad', 'Privacy'], terms: ['Condiciones', 'Terms'], security: ['Seguridad', 'Security'], about: ['Sobre Serch', 'About Serch'],
};

// A single SVG map, created once. Changing mode only replaces labels and paint.
for (const station of STATIONS) {
  const group = document.createElementNS(NS, 'g');
  group.classList.add('station-hitbox'); group.dataset.station = station.id;
  group.setAttribute('role', 'button'); group.setAttribute('tabindex', '0');
  group.setAttribute('aria-haspopup', 'dialog'); group.setAttribute('aria-controls', 'station-dialog');
  const polygon = document.createElementNS(NS, 'polygon'); polygon.setAttribute('points', station.polygon);
  const circle = document.createElementNS(NS, 'circle'); circle.setAttribute('cx', station.x); circle.setAttribute('cy', station.y); circle.setAttribute('r', '23'); circle.classList.add('station-pin');
  const number = document.createElementNS(NS, 'text'); number.setAttribute('x', station.x); number.setAttribute('y', station.y + 7); number.classList.add('station-number'); number.textContent = station.number;
  group.append(polygon, circle, number); $('station-map').append(group);
  group.addEventListener('click', () => openStation(station.id, group));
  group.addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); openStation(station.id, group); } });
  group.addEventListener('pointerenter', () => { $('station-hover').textContent = copy().stations[station.id].title; });
  group.addEventListener('focus', () => { $('station-hover').textContent = copy().stations[station.id].title; });
  const item = button('', () => openStation(station.id, item), 'directory-item'); item.dataset.station = station.id;
  item.setAttribute('aria-haspopup', 'dialog'); item.setAttribute('aria-controls', 'station-dialog');
  item.append(el('span', 'directory-number', station.number), el('strong', 'directory-title'), el('span', 'directory-object'));
  $('station-directory').append(item);
}

function glossaryFor(key) { return shared().glossary?.[key]; }
function closeGlossary() {
  $('glossary-popover').hidden = true;
  tooltipTrigger?.setAttribute('aria-expanded', 'false'); tooltipTrigger = null;
}
function showGlossary(trigger, entry) {
  if (tooltipTrigger && tooltipTrigger !== trigger) closeGlossary();
  tooltipTrigger = trigger; const panel = $('glossary-popover');
  (dialog.open ? dialog : document.body).append(panel);
  panel.replaceChildren(el('strong', '', entry.label), el('p', '', entry.definition)); panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  const rect = trigger.getBoundingClientRect(), width = Math.min(310, innerWidth - 32);
  panel.style.width = `${width}px`; panel.style.left = `${Math.max(16, Math.min(rect.left, innerWidth - width - 16))}px`;
  const height = panel.getBoundingClientRect().height;
  panel.style.top = `${Math.max(12, rect.bottom + height + 18 < innerHeight ? rect.bottom + 8 : rect.top - height - 8)}px`;
}
function richText(parent, value) {
  parent.replaceChildren(); const source = String(value || ''); let offset = 0;
  for (const match of source.matchAll(/\[term:([a-zA-Z0-9_-]+)\]/g)) {
    parent.append(document.createTextNode(source.slice(offset, match.index)));
    const entry = glossaryFor(match[1]);
    if (entry) {
      const term = button(entry.label, () => showGlossary(term, entry), 'tech-term');
      term.setAttribute('aria-expanded', 'false'); term.setAttribute('aria-controls', 'glossary-popover');
      term.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') showGlossary(term, entry); });
      term.addEventListener('pointerleave', closeGlossary); term.addEventListener('focus', () => showGlossary(term, entry)); term.addEventListener('blur', closeGlossary);
      parent.append(term);
    } else parent.append(document.createTextNode(match[1]));
    offset = match.index + match[0].length;
  }
  parent.append(document.createTextNode(source.slice(offset)));
}
function guideOptions(target) {
  target.replaceChildren();
  for (const [id, es, english] of [['printer','Repito documentos a mano','I keep rewriting documents'],['workstation','Necesito una página web','I need a website'],['board','Tengo tareas por todas partes','My tasks are scattered'],['security','Quiero proteger mis datos','I want to protect my data']]) {
    target.append(button(text(es, english), event => openStation(id, event.currentTarget), 'guide-option'));
  }
}
function render() {
  const dictionary = copy(), isLab = manager.getMode() === 'laboratorio';
  document.title = `${isLab ? text('El Laboratorio', 'The Lab') : text('La Oficina', 'The Office')} · CyberSerchMX`;
  document.querySelector('meta[name="theme-color"]').content = isLab ? '#091b27' : '#f3f1e8';
  $('mode-switch').checked = isLab;
  $('mode-switch').setAttribute('aria-label', isLab ? text('Volver a La Oficina', 'Switch to The Office') : text('Entrar a El Laboratorio', 'Switch to The Lab'));
  $('mode-office-label').textContent = text('La Oficina', 'The Office'); $('mode-lab-label').textContent = text('El Laboratorio', 'The Lab');
  $('scene-mode').textContent = isLab ? text('EL LABORATORIO', 'THE LAB') : text('LA OFICINA', 'THE OFFICE');
  $('language-select').value = manager.getLanguage();
  for (const node of document.querySelectorAll('[data-room-ui]')) { const pair = UI[node.dataset.roomUi]; if (pair) node.textContent = text(...pair); }
  $('room-title').textContent = dictionary.title; $('room-eyebrow').textContent = dictionary.eyebrow; $('room-lead').textContent = dictionary.lead;
  $('guide-title').textContent = text('¿Qué te quita tiempo hoy?', 'What takes up your time today?'); $('guide-copy').textContent = dictionary.guide;
  $('rescue-office').hidden = !isLab; $('rescue-office').textContent = text('¿Te perdiste entre tanto código? Volver a La Oficina', 'Lost in all this code? Back to The Office');
  $('close-station').setAttribute('aria-label', text('Cerrar', 'Close')); $('station-map').setAttribute('aria-label', text('Estaciones de la habitación', 'Room stations'));
  $('room-scene').setAttribute('aria-label', text('Habitación interactiva', 'Interactive room'));
  for (const station of STATIONS) {
    const stationCopy = dictionary.stations[station.id];
    document.querySelector(`.station-hitbox[data-station="${station.id}"]`).setAttribute('aria-label', `${station.number}. ${stationCopy.title}: ${stationCopy.object}`);
    const item = document.querySelector(`.directory-item[data-station="${station.id}"]`);
    item.querySelector('strong').textContent = stationCopy.title; item.querySelector('.directory-object').textContent = stationCopy.object;
  }
  guideOptions($('guide-options')); updateMotion(); closeGlossary();
  if (currentStation) renderStation(true);
}
function updateMotion() {
  document.documentElement.dataset.motion = motionPaused ? 'paused' : 'playing';
  $('motion-toggle').setAttribute('aria-pressed', String(motionPaused));
  $('motion-toggle').textContent = motionPaused ? text('Activar movimiento', 'Enable motion') : text('Pausar movimiento', 'Pause motion');
}
$('motion-toggle').addEventListener('click', () => { motionPaused = !motionPaused; updateMotion(); });
reducedMotion.addEventListener('change', event => { motionPaused = event.matches; updateMotion(); });
$('mode-switch').addEventListener('change', event => manager.setMode(event.target.checked ? 'laboratorio' : 'oficina'));
$('rescue-office').addEventListener('click', () => manager.setMode('oficina'));
$('language-select').addEventListener('change', event => manager.setLanguage(event.target.value));
document.addEventListener('site:mode', render); document.addEventListener('portfolio:language', render);

function openStation(id, trigger) {
  if (!STATIONS.some(station => station.id === id)) return;
  if (!dialog.open) { opener = trigger || document.activeElement; dentalDraft = {}; profession = 'dentista'; }
  if (currentStation === 'printer' && id !== 'printer') { dentalDraft = {}; hashRevision++; }
  currentStation = id; renderStation();
  if (!dialog.open) dialog.showModal();
  document.documentElement.classList.add('dialog-open'); $('station-title').focus();
}
function renderStation(preserve = false) {
  if (preserve && currentStation === 'printer') rememberDental();
  closeGlossary(); hashRevision++;
  const station = STATIONS.find(item => item.id === currentStation), data = copy().stations[currentStation];
  $('dialog-kicker').textContent = `${station.number} / ${data.object}`; $('station-title').textContent = data.title;
  richText($('station-summary'), data.summary);
  const details = $('station-details'); details.replaceChildren();
  const list = el('ul', 'station-detail'); for (const line of data.details || []) { const item = el('li'); richText(item, line); list.append(item); } details.append(list);
  const body = $('station-content'); body.replaceChildren();
  if (station.id === 'printer') renderDental(body);
  else if (station.id === 'axiom') { const options = el('div', 'guide-options'); guideOptions(options); body.append(options, link(text('Explorar a Axiom en 3D', 'Explore Axiom in 3D'), station.href)); }
  else if (station.id === 'coffee') {
    body.append(el('p', 'tool-notice', text('Apoyo voluntario. No compra servicios ni reserva una cita.', 'Voluntary support. It does not purchase services or book an appointment.')));
    const actions = el('div', 'station-actions');
    actions.append(link(text('Invitar un café · PayPal', 'Buy us a coffee · PayPal'), 'https://www.paypal.com/donate/?hosted_button_id=D587QCAYURRYG'), link(text('Impulsar el laboratorio · Patreon', 'Support the lab · Patreon'), 'https://www.patreon.com/c/CyberserchMX/membership', 'button secondary'));
    body.append(actions, el('p', 'small', text('PayPal: importe libre en MXN. Patreon: apoyo mensual. Revisa el importe, la recurrencia y los datos del destinatario en el proveedor.', 'PayPal: choose an amount in MXN. Patreon: monthly support. Review the amount, recurrence and recipient information with the provider.')));
  } else if (station.id === 'register') renderNumbers(body);
  else if (station.id === 'security' || station.id === 'vault') {
    renderChecklist(body); const actions = el('div', 'station-actions'); actions.append(link(data.cta, station.href), link(text('Revisar mi caso', 'Discuss my needs'), `cotizador.html?interes=seguridad`, 'button secondary')); body.append(actions);
  } else {
    if (['workstation','showcase'].includes(station.id)) {
      const samples = el('div', 'sample-links');
      for (const [path, es, english] of [['dental','Consultorio dental','Dental practice'],['psicologia','Psicología','Psychology'],['unas','Estudio de uñas','Nail studio']]) samples.append(link(text(es, english), `https://sergioh-devsec.github.io/paginas-para-negocios/${path}/`, 'sample-link'));
      body.append(el('p', 'small', text('Muestras de diseño con marcas ficticias.', 'Design samples with fictional brands.')), samples);
    }
    if (station.id === 'library' || station.id === 'showcase') body.append(link(text('Crear mi CV con Axiom', 'Build my CV with Axiom'), 'cv.html'));
    body.append(link(data.cta, station.href));
    if (['comms','clock'].includes(station.id)) body.append(el('p', 'tool-notice', text('Diseñamos esta integración después de revisar tus herramientas y permisos. Esta demo no envía mensajes ni agenda citas.', 'We scope this integration after reviewing your tools and permissions. This demo does not send messages or book appointments.')));
  }
}
function renderChecklist(body) {
  const section = el('section', 'tool-panel'), title = el('h3', '', text('Una primera revisión, sin tecnicismos.', 'A first check, without the jargon.'));
  const status = el('p', 'small'); status.setAttribute('role', 'status'); const inputs = [];
  section.append(title);
  const items = [["Tengo una copia fuera de este equipo.","I have a backup outside this device."],["He probado que puedo recuperar un archivo.","I have tested restoring a file."],["Uso un segundo paso para entrar a mis cuentas.","I use a second step to sign in to my accounts."]];
  items.forEach((pair, i) => { const label = el('label', 'check-row'); const input = document.createElement('input'); input.type = 'checkbox'; input.id = `check-${i}`; label.htmlFor = input.id; label.append(input, el('span','',text(...pair))); inputs.push(input); input.addEventListener('change', update); section.append(label); });
  function update() { status.textContent = text(`${inputs.filter(i => i.checked).length} de 3 hábitos revisados. Esto no es una auditoría.`, `${inputs.filter(i => i.checked).length} of 3 habits reviewed. This is not an audit.`); }
  update(); section.append(status); body.append(section);
}
function renderNumbers(body) {
  const section = el('section', 'tool-panel'); section.append(el('h3','',text('Lo que entra y lo que sale.', 'What comes in and what goes out.')));
  const fields = el('div', 'form-grid'), inputs = [];
  for (const [id, es, english] of [['income','Ingresos del mes (MXN)','Monthly income (MXN)'],['costs','Gastos del mes (MXN)','Monthly expenses (MXN)']]) {
    const label = el('label','field',text(es, english)); label.htmlFor = `numbers-${id}`; const input = document.createElement('input'); input.id = label.htmlFor; input.type = 'number'; input.min = '0'; input.max = '1000000000'; input.step = '.01'; input.value = '0'; label.append(input); fields.append(label); inputs.push(input);
  }
  const total = el('output','numbers-total'); total.setAttribute('aria-live','polite');
  const update = () => { const valid = inputs.every(input => input.value !== '' && input.validity.valid); total.textContent = valid ? new Intl.NumberFormat(en()?'en-US':'es-MX',{style:'currency',currency:'MXN'}).format(Number(inputs[0].value)-Number(inputs[1].value)) : text('Revisa los importes.', 'Check the amounts.'); };
  inputs.forEach(input => input.addEventListener('input',update)); update();
  section.append(fields, el('p','small',text('Diferencia antes de impuestos, deudas u otros ajustes:', 'Difference before taxes, debts or other adjustments:')),total,el('p','tool-notice',text('Calculadora orientativa. No guarda cifras ni sustituye un registro contable.', 'An illustrative calculator. Figures are not stored; it does not replace accounting records.')));
  body.append(section,link(text('Quiero un tablero para mi negocio', 'I want a dashboard for my business'),'cotizador.html?interes=tablero'));
}

function rememberDental() {
  const form = $('consent-form'); if (!form) return;
  dentalDraft = Object.fromEntries(new FormData(form).entries());
}
const DENTAL_FIELDS = [
  ['patientName','Nombre del paciente','Patient name','text',120,true], ['date','Fecha','Date','date',10,true],
  ['procedure','Procedimiento dental','Dental procedure','textarea',800,true], ['risks','Riesgos principales explicados por el profesional','Main risks explained by the clinician','textarea',1600,true],
];
const EXTRA_FIELDS = [
  ['clinicName','Nombre de la clínica','Clinic name','text',120], ['clinicianName','Nombre del profesional','Clinician name','text',120], ['location','Lugar','Location','text',160],
  ['objectives','Objetivo del procedimiento','Purpose of the procedure','textarea',1200], ['benefits','Beneficios esperados','Expected benefits','textarea',1200],
  ['alternatives','Alternativas explicadas','Alternatives discussed','textarea',1200], ['noTreatment','Consecuencias de no realizarlo','Consequences of not proceeding','textarea',1200],
  ['contingencies','Plan ante contingencias acordado con el paciente','Contingency plan agreed with the patient','textarea',1200], ['representativeName','Representante, si corresponde','Representative, if applicable','text',120],
  ['witness1Name','Primer testigo','First witness','text',120], ['witness2Name','Segundo testigo','Second witness','text',120], ['notes','Observaciones del profesional','Clinician notes','textarea',1200],
];
function addDentalField(form, definition) {
  const [name, es, english, type, max, required = false] = definition;
  const wrapper = el('div','field'+(type==='textarea'?' field-wide':'')); const label = el('label','',text(es,english)+(required?' *':'')); label.htmlFor = `consent-${name}`;
  const input = document.createElement(type==='textarea'?'textarea':'input'); input.id = label.htmlFor; input.name = name;
  if (type!=='textarea') input.type=type; else input.rows = 3;
  input.required=required; input.maxLength=max; input.autocomplete='off'; input.spellcheck=false;
  input.setAttribute('data-clarity-mask','true'); input.value=dentalDraft[name] || '';
  if (name==='date' && !input.value) { const now=new Date(); input.value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
  const error=el('small','field-error'); error.id=`error-${name}`; input.setAttribute('aria-describedby',error.id);
  wrapper.append(label,input,error); form.append(wrapper);
}
function renderDental(body) {
  const panel = el('section','tool-panel'); panel.id='document-tool'; panel.setAttribute('data-clarity-mask','true');
  const professionLabel=el('label','field',text('Tu profesión','Your profession')); professionLabel.htmlFor='profession';
  const select=document.createElement('select'); select.id='profession';
  for (const [id,es,english] of [['dentista','Dentistas','Dentists'],['psicologia','Psicólogos','Psychologists'],['medicina','Médicos','Doctors'],['abogacia','Abogados','Lawyers'],['contabilidad','Contadores','Accountants']]) { const option=el('option','',text(es,english)); option.value=id; select.append(option); }
  select.value=profession; professionLabel.append(select); panel.append(professionLabel); body.append(panel);
  select.addEventListener('change',()=>{ rememberDental(); profession=select.value; hashRevision++; renderStation(); });
  if (profession!=='dentista') {
    panel.append(el('h3','',text('Este escritorio se está preparando.','This desk is being prepared.')),el('p','',text('La herramienta disponible ahora es el consentimiento dental. Para otro giro, podemos revisar tus documentos y diseñar una solución.','The tool currently available is dental consent. For another profession, we can review your documents and design a solution.')),link(text('Consultar una solución para mi profesión','Discuss a solution for my profession'),`cotizador.html?giro=${profession}&interes=documentos`)); return;
  }
  panel.append(el('p','eyebrow',text('HERRAMIENTA GRATUITA · SIN SUBIR DATOS','FREE TOOL · NO DATA UPLOADS')),el('h3','',text('Consentimiento dental, en PDF.','Dental consent, in PDF.')));
  panel.append(el('p','tool-notice',text('Genera un borrador para revisión del odontólogo. Los campos clínicos los completa el profesional; esta plantilla no valida el consentimiento ni lo firma. Los datos se borran al cerrar esta ventana.','Generate a draft for review by the dentist. Clinical fields must be completed by the clinician; this template does not validate or sign consent. Entries are cleared when this window closes.')));
  const form=document.createElement('form'); form.id='consent-form'; form.noValidate=true;
  const grid=el('div','form-grid'); for (const definition of DENTAL_FIELDS) addDentalField(grid,definition); form.append(grid);
  const extras=el('details','extra-fields'), summary=el('summary','',text('Completar datos del profesional y de la explicación clínica','Complete clinician details and the clinical explanation')),extraGrid=el('div','form-grid');
  for (const definition of EXTRA_FIELDS) addDentalField(extraGrid,definition); extras.append(summary,extraGrid); form.append(extras);
  const actions=el('div','station-actions'); const submit=el('button','button primary',text('Descargar PDF Gratis','Download free PDF')); submit.type='submit';
  const reset=button(text('Borrar datos','Clear entries'),()=>{ dentalDraft={}; hashRevision++; renderStation(); }); actions.append(submit,reset); form.append(actions);
  const result=el('p','form-result'); result.id='consent-result'; result.setAttribute('role','status'); result.setAttribute('aria-live','polite'); form.append(result);
  panel.append(form);
  const technical=el('details','technical-details'); technical.id='consent-technical'; technical.open=true; technical.hidden=manager.getMode()!=='laboratorio';
  technical.append(el('summary','',text('Validación y huella local','Local validation and fingerprint')),el('p','small',text('SHA-256 del JSON canónico. Comprueba el contenido; no acredita identidad, firma ni validez legal.','SHA-256 of the canonical JSON. It checks the content, not identity, signature or legal validity.')));
  const hash=el('code','hash-value',text('Completa los campos obligatorios para calcular la huella.','Complete the required fields to calculate the fingerprint.')); hash.id='consent-hash'; technical.append(hash);
  const schema=el('pre','schema-preview'); schema.textContent=JSON.stringify(CONSENT_SCHEMA,null,2); technical.append(el('h4','',text('Esquema de validación local','Local validation schema')),schema); panel.append(technical);
  let timer, busy=false;
  form.addEventListener('input',()=>{ clearTimeout(timer); hashRevision++; rememberDental(); if(busy)result.textContent=text('Los datos cambiaron. Descarga de nuevo para incluirlos.','Entries changed. Download again to include them.'); timer=setTimeout(updateDentalHash,200); });
  form.addEventListener('submit',async event=>{
    event.preventDefault(); if(busy)return; clearTimeout(timer); rememberDental(); const errors=validateConsent(dentalDraft,manager.getLanguage());
    for(const field of form.querySelectorAll('[name]')) {const message=errors[field.name]||''; $(`error-${field.name}`).textContent=message; field.setAttribute('aria-invalid',String(Boolean(message)));}
    if(Object.keys(errors).length){ result.textContent=errors.form||text('Revisa los campos marcados.','Review the marked fields.'); const first=form.querySelector('[aria-invalid="true"]'); if(first?.closest('details'))first.closest('details').open=true; first?.focus(); return; }
    busy=true; submit.disabled=true; const revision=++hashRevision; const snapshot={...dentalDraft},language=manager.getLanguage();
    result.textContent=text('Preparando tu PDF en este dispositivo…','Preparing the PDF on this device…');
    try{
      const digest=await consentHash(snapshot); const bytes=await buildConsentPdf(snapshot,{lang:language,hash:digest});
      if(revision!==hashRevision||!dialog.open)return;
      download(new Blob([bytes],{type:'application/pdf'}),en()?'dental-consent-draft.pdf':'consentimiento-dental-borrador.pdf');
      hash.textContent=digest; result.textContent=text('PDF preparado. Revisa la carpeta de descargas o la vista de documentos de tu navegador.','PDF prepared. Check your downloads or your browser’s document view.');
    }catch{if(revision===hashRevision)result.textContent=text('No fue posible generar el PDF. Revisa los campos y vuelve a intentarlo en un navegador actualizado.','The PDF could not be generated. Check the fields and try again in an up-to-date browser.');}
    finally{busy=false;submit.disabled=false;}
  });
  updateDentalHash();
  const pro=el('section','pro-card'); pro.append(el('p','eyebrow','PRO / '+text('CONSULTORIO AUTOMATIZADO','AUTOMATED PRACTICE')),el('h3','',text('Del documento suelto a un consultorio conectado.','From one document to a connected practice.')));
  const table=el('table','comparison'); const caption=el('caption','',text('Qué incluye cada opción','What each option includes')); const head=document.createElement('thead'),headRow=document.createElement('tr');
  for(const value of [text('Función','Feature'),text('Gratis','Free'),text('Pro · a cotizar','Pro · quoted separately')]){const th=el('th','',value);th.scope='col';headRow.append(th);}head.append(headRow);table.append(caption,head);
  const tbody=document.createElement('tbody');
  for(const row of [[text('PDF local de consentimiento','Local consent PDF'),text('Con marca discreta','With discreet watermark'),text('Con tu logo, sin marca','Your logo, no watermark')],[text('Web dental y sistema de citas','Dental website and booking'),text('No incluido','Not included'),text('Se diseña para tu clínica','Scoped for your clinic')],[text('Recordatorios y presupuestos','Reminders and treatment estimates'),text('No incluido','Not included'),text('Integración según alcance','Integration as scoped')]]){const tr=document.createElement('tr'); row.forEach((value,i)=>{const cell=el(i?'td':'th','',value);if(!i)cell.scope='row';tr.append(cell);});tbody.append(tr);} table.append(tbody);pro.append(table);
  pro.append(el('p','small',text('Pro se desarrolla por encargo. El alcance, las licencias y el costo de mensajería se acuerdan antes de contratar.','Pro is built to order. Scope, licences and messaging costs are agreed before purchase.')),link(text('Quiero mi consultorio automatizado','Plan my automated practice'),'cotizador.html?giro=dentista&interes=paquete_pro')); body.append(pro);
}
async function updateDentalHash(){
  const node=$('consent-hash'); if(!node)return; rememberDental(); const revision=hashRevision,request=++hashRequest;
  if(Object.keys(validateConsent(dentalDraft,manager.getLanguage())).length){node.textContent=text('Completa los campos obligatorios para calcular la huella.','Complete the required fields to calculate the fingerprint.');return;}
  try{const digest=await consentHash(dentalDraft);if(revision===hashRevision&&request===hashRequest&&node.isConnected)node.textContent=digest;}catch{if(revision===hashRevision&&request===hashRequest&&node.isConnected)node.textContent=text('La huella requiere un navegador con Web Crypto y HTTPS.','The fingerprint requires Web Crypto and HTTPS.');}
}
function download(blob,name){const url=URL.createObjectURL(blob),anchor=el('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function closeStation(){closeGlossary();dialog.close();}
$('close-station').addEventListener('click',closeStation);
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeStation();}});
dialog.addEventListener('close',()=>{closeGlossary();document.documentElement.classList.remove('dialog-open');currentStation=null;dentalDraft={};hashRevision++;document.body.append($('glossary-popover'));$('station-content').replaceChildren();opener?.isConnected&&opener.focus();});
dialog.addEventListener('cancel',event=>{if(tooltipTrigger){event.preventDefault();closeGlossary();}});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeGlossary();});
document.addEventListener('click',event=>{if(tooltipTrigger&&!event.target.closest('.tech-term,.glossary-popover'))closeGlossary();});
window.addEventListener('resize',closeGlossary); dialog.addEventListener('scroll',closeGlossary,true);
window.addEventListener('pagehide',event=>{dentalDraft={};hashRevision++;closeGlossary();document.body.append($('glossary-popover'));$('station-content').replaceChildren();if(dialog.open)dialog.close();currentStation=null;document.documentElement.classList.remove('dialog-open');if(!event.persisted)manager.destroy();});
render();
// Preserve previously shared portfolio anchors without duplicating its content.
const legacyHashes=new Set(['home','services','creadoras','content','social','contact','apoyar','certifications','laboratory','automation','web-samples','descubrir','projects','about','soc-play','como-trabajamos','que-recibes','preguntas']);
const hash=location.hash.slice(1);
if(legacyHashes.has(hash))location.replace(`portafolio.html${location.search}${location.hash}`);
else if(STATIONS.some(station=>station.id===hash))openStation(hash);
