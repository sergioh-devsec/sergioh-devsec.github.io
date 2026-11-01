/** Professional working drafts. All fields, validation, previews and PDFs stay local. */
const field = (key, es, en, type = 'textarea', maxLength = 1600, required = false) =>
  Object.freeze({ key, label: Object.freeze({ es, en }), type, maxLength, required });
const identity = person => [
  field('clientName', person[0], person[1], 'text', 160, true),
  field('professionalName', 'Nombre del profesional', 'Professional name', 'text', 160, true),
  field('date', 'Fecha de elaboración', 'Preparation date', 'date', 10, true),
];
export const PROFESSION_DOCUMENTS = Object.freeze({
  psicologia: Object.freeze({
    title: { es: 'Acuerdos de atención psicológica', en: 'Psychological care arrangements' },
    description: { es: 'Organiza la modalidad, las sesiones y los acuerdos que el profesional explicará a la persona atendida.', en: 'Organize the format, sessions and arrangements the professional will discuss with the client.' },
    notice: { es: 'Borrador para revisión del profesional y de la persona atendida. No evalúa, diagnostica ni obtiene consentimiento por el hecho de descargarlo. Completa los límites de confidencialidad y el plan de atención según el caso.', en: 'Draft for review by the professional and client. Downloading does not assess, diagnose or obtain consent. Complete confidentiality limits and the care plan for the individual situation.' },
    filename: 'acuerdos-atencion-psicologica',
    fields: Object.freeze([
      ...identity(['Nombre de la persona atendida', 'Client name']),
      field('serviceScope', 'Alcance y modalidad de la atención', 'Scope and format of care', 'textarea', 1800, true),
      field('sessionTerms', 'Duración, frecuencia y condiciones de las sesiones', 'Session duration, frequency and arrangements', 'textarea', 1600, true),
      field('confidentiality', 'Confidencialidad y límites que explicará el profesional', 'Confidentiality and limits to be explained by the professional', 'textarea', 2000, true),
      field('practiceName', 'Consultorio o institución', 'Practice or institution', 'text', 160),
      field('professionalLicense', 'Identificación profesional, si corresponde', 'Professional registration, if applicable', 'text', 120),
      field('objectives', 'Objetivos acordados de la atención', 'Agreed care objectives'),
      field('fees', 'Honorarios y condiciones de pago acordadas', 'Agreed fees and payment arrangements'),
      field('changes', 'Cancelaciones, reprogramación y comunicación entre sesiones', 'Cancellations, rescheduling and communication between sessions'),
      field('careLimits', 'Límites del servicio y plan de derivación o urgencias', 'Service limits and referral or emergency arrangements', 'textarea', 2000),
      field('questions', 'Preguntas y acuerdos pendientes de revisión', 'Questions and arrangements still to review'),
    ]),
  }),
  medicina: Object.freeze({
    title: { es: 'Resumen e indicaciones de consulta', en: 'Consultation summary and instructions' },
    description: { es: 'Pasa a un documento legible lo que el médico ya valoró e indicó. La herramienta no propone diagnósticos ni tratamientos.', en: 'Create a readable document from the clinician’s own assessment and instructions. The tool does not propose diagnoses or treatments.' },
    notice: { es: 'Borrador de apoyo escrito exclusivamente con los datos e indicaciones introducidos por el profesional. No es una receta validada, justificante médico ni certificado. El médico debe revisar los datos, el contenido y su emisión antes de entregarlo.', en: 'Supporting draft using only information and instructions entered by the professional. It is not a validated prescription, medical excuse or certificate. The clinician must review the details, content and issuance before delivering it.' },
    filename: 'resumen-consulta-medica',
    fields: Object.freeze([
      ...identity(['Nombre del paciente', 'Patient name']),
      field('visitReason', 'Motivo de consulta referido', 'Reported reason for consultation', 'textarea', 1800, true),
      field('assessment', 'Resumen de la valoración escrita por el médico', 'Assessment summary written by the clinician', 'textarea', 2400, true),
      field('instructions', 'Indicaciones que ya definió el médico', 'Instructions already determined by the clinician', 'textarea', 2400, true),
      field('practiceName', 'Consultorio o institución', 'Practice or institution', 'text', 160),
      field('professionalLicense', 'Identificación profesional, si corresponde', 'Professional registration, if applicable', 'text', 120),
      field('relevantHistory', 'Antecedentes relevantes revisados por el médico', 'Relevant history reviewed by the clinician'),
      field('allergies', 'Alergias y precauciones verificadas por el médico', 'Allergies and precautions verified by the clinician'),
      field('warningSigns', 'Signos de alarma y acciones explicados por el médico', 'Warning signs and actions explained by the clinician', 'textarea', 2000),
      field('followUp', 'Seguimiento e indicaciones de revisión', 'Follow-up and review instructions'),
      field('notes', 'Observaciones para la entrega y revisión', 'Delivery and review notes'),
    ]),
  }),
  abogacia: Object.freeze({
    title: { es: 'Propuesta de servicios jurídicos', en: 'Legal services proposal' },
    description: { es: 'Delimita un encargo, sus entregables y honorarios antes de preparar el acuerdo definitivo.', en: 'Define an engagement, deliverables and fees before preparing the final agreement.' },
    notice: { es: 'Propuesta de trabajo para revisión de las partes y del profesional. Descargarla no formaliza una contratación, representación ni aceptación. No calcula plazos procesales ni promete resultados jurídicos.', en: 'Working proposal for review by the parties and professional. Downloading does not establish an engagement, representation or acceptance. It does not calculate procedural deadlines or promise legal outcomes.' },
    filename: 'propuesta-servicios-juridicos',
    fields: Object.freeze([
      ...identity(['Nombre del cliente o empresa', 'Client or organization name']),
      field('matter', 'Asunto u objetivo del encargo', 'Matter or engagement objective', 'textarea', 1800, true),
      field('scope', 'Actividades incluidas en la propuesta', 'Activities included in the proposal', 'textarea', 2400, true),
      field('deliverables', 'Entregables y forma de entrega', 'Deliverables and delivery method', 'textarea', 2000, true),
      field('fees', 'Honorarios, moneda e impuestos por confirmar', 'Fees, currency and taxes to confirm', 'textarea', 1600, true),
      field('practiceName', 'Despacho o firma', 'Practice or firm', 'text', 160),
      field('exclusions', 'Actividades y gastos no incluidos', 'Excluded activities and expenses'),
      field('timeline', 'Calendario de trabajo propuesto y dependencias', 'Proposed work schedule and dependencies'),
      field('clientMaterials', 'Información o documentos que deberá aportar el cliente', 'Information or documents the client must provide'),
      field('paymentTerms', 'Condiciones de pago propuestas', 'Proposed payment arrangements'),
      field('validUntil', 'Vigencia de la propuesta, si se acuerda', 'Proposal validity, if agreed', 'date', 10),
      field('notes', 'Puntos pendientes antes del acuerdo definitivo', 'Open points before the final agreement'),
    ]),
  }),
  contabilidad: Object.freeze({
    title: { es: 'Control de documentos contables', en: 'Accounting document checklist' },
    description: { es: 'Prepara una solicitud clara de documentos, responsables y fechas para organizar un servicio contable.', en: 'Prepare a clear request for documents, owners and dates to organize an accounting engagement.' },
    notice: { es: 'Documento de organización para revisión del contador y del cliente. No genera facturas, declaraciones ni cálculos de impuestos y no envía datos a ninguna autoridad. No incluyas contraseñas, archivos de firma electrónica ni claves de acceso.', en: 'Organizational document for review by the accountant and client. It does not create invoices, returns or tax calculations and sends no data to an authority. Do not include passwords, electronic-signature files or access keys.' },
    filename: 'control-documentos-contables',
    fields: Object.freeze([
      ...identity(['Nombre del cliente o empresa', 'Client or organization name']),
      field('period', 'Periodo de trabajo que se revisará', 'Accounting period to review', 'text', 160, true),
      field('serviceScope', 'Servicio contable y alcance acordado', 'Accounting service and agreed scope', 'textarea', 2000, true),
      field('documentList', 'Lista de documentos solicitados y estado de cada uno', 'Requested documents and status of each item', 'textarea', 3000, true),
      field('practiceName', 'Despacho o firma', 'Practice or firm', 'text', 160),
      field('responsible', 'Responsable de reunir y revisar la documentación', 'Person responsible for collecting and reviewing documents', 'text', 160),
      field('deliveryDate', 'Fecha de entrega propuesta', 'Proposed delivery date', 'date', 10),
      field('deliveryChannel', 'Medio de entrega acordado, sin credenciales', 'Agreed delivery method, without credentials'),
      field('pendingItems', 'Documentos faltantes y seguimiento', 'Missing documents and follow-up'),
      field('fees', 'Honorarios y condiciones por confirmar', 'Fees and arrangements to confirm'),
      field('notes', 'Observaciones de revisión del contador', 'Accountant review notes'),
    ]),
  }),
});

const supported = value => Object.hasOwn(PROFESSION_DOCUMENTS, value);
const normalize = value => typeof value === 'string' ? value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').trim() : '';
export function professionConfig(id) { if (!supported(id)) throw new TypeError('Unsupported profession'); return PROFESSION_DOCUMENTS[id]; }
function dataOf(id, input) { const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}; return Object.fromEntries(professionConfig(id).fields.map(item => [item.key, normalize(source[item.key])])); }
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return year >= 1900 && year <= 2200 && month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}
export function validateProfessionDocument(id, input, lang = 'es') {
  const config = professionConfig(id), en = lang === 'en', errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { form: en ? 'Enter the document details.' : 'Completa los datos del documento.' };
  const data = dataOf(id, input), keys = new Set(config.fields.map(item => item.key));
  if (Object.keys(input).some(key => !keys.has(key))) errors.form = en ? 'The form contains fields for another document.' : 'El formulario contiene campos de otro documento.';
  for (const item of config.fields) {
    const value = data[item.key];
    if (input[item.key] !== undefined && typeof input[item.key] !== 'string') errors[item.key] = en ? 'Enter text only.' : 'Introduce únicamente texto.';
    else if (item.required && !value) errors[item.key] = en ? 'This field is required.' : 'Este campo es obligatorio.';
    else if (value.length > item.maxLength) errors[item.key] = en ? `Use no more than ${item.maxLength} characters.` : `Usa como máximo ${item.maxLength} caracteres.`;
    else if (![...value].every(char => { const n = char.codePointAt(0); return n === 10 || (n >= 32 && n <= 126) || (n >= 160 && n <= 255) || SPECIAL_BYTES.has(char); })) errors[item.key] = en ? 'Use Spanish or English text, without emoji or control characters.' : 'Usa texto en español o inglés, sin emojis ni caracteres de control.';
    else if (value && item.type === 'date' && !validDate(value)) errors[item.key] = en ? 'Enter a valid date.' : 'Introduce una fecha válida.';
  }
  if (Object.values(data).reduce((sum, value) => sum + value.length, 0) > 16000) errors.form = en ? 'The complete draft must not exceed 16,000 characters.' : 'El borrador completo no debe superar 16,000 caracteres.';
  return errors;
}
export function professionSchema(id) {
  const config = professionConfig(id);
  return { $schema:'https://json-schema.org/draft/2020-12/schema', title:config.title.es, type:'object', additionalProperties:false,
    required:config.fields.filter(item=>item.required).map(item=>item.key),
    properties:Object.fromEntries(config.fields.map(item=>[item.key,{type:'string',maxLength:item.maxLength,...(item.required?{minLength:1}:{}),...(item.type==='date'?{format:'date'}:{})}])) };
}
export function canonicalProfessionDocument(id, input) { return JSON.stringify({ schemaVersion:'1.0', profession:id, ...dataOf(id,input) }); }
export async function professionDocumentHash(id, input) {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 requires Web Crypto and HTTPS.');
  const bytes = await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalProfessionDocument(id,input)));
  return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
}
export function professionPreview(id, input, lang='es') {
  const language=lang==='en'?'en':'es', config=professionConfig(id), data=dataOf(id,input);
  return { title:config.title[language], notice:config.notice[language],
    rows:config.fields.map(item=>({label:item.label[language],value:data[item.key]|| (language==='en'?'To be completed by the professional.':'Por completar por el profesional.')})) };
}

// Shared base-14 PDF encoding/layout primitives mirror the established dental generator.

const SPECIAL_BYTES = new Map([
  ['€',128],['‚',130],['ƒ',131],['„',132],['…',133],['†',134],['‡',135],['ˆ',136],['‰',137],['Š',138],['‹',139],['Œ',140],['Ž',142],
  ['‘',145],['’',146],['“',147],['”',148],['•',149],['–',150],['—',151],['˜',152],['™',153],['š',154],['›',155],['œ',156],['ž',158],['Ÿ',159],
]);

// Standard PDF base-14 Helvetica widths, in thousandths of one em.
const ASCII_WIDTHS = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const ASCII_BOLD_WIDTHS = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
const EXTENDED_WIDTHS = [556,556,222,556,333,1000,556,556,333,1000,667,333,1000,556,611,556,556,222,222,333,333,350,556,1000,333,1000,500,333,944,556,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const EXTENDED_BOLD_WIDTHS = [556,611,278,556,500,1000,556,556,333,1000,667,333,1000,611,611,611,611,278,278,500,500,350,556,1000,333,1000,556,333,944,611,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
function textWidth(text, size, bold = false) {
  let width = 0;
  for (const char of text) {
    const n = SPECIAL_BYTES.get(char) ?? char.charCodeAt(0);
    width += n >= 32 && n <= 126 ? (bold ? ASCII_BOLD_WIDTHS : ASCII_WIDTHS)[n - 32] : (bold ? EXTENDED_BOLD_WIDTHS : EXTENDED_WIDTHS)[n - 128] || 600;
  }
  return width * size / 1000;
}
function wrap(text, size, width, bold = false) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      if (textWidth(line ? `${line} ${word}` : word, size, bold) <= width) { line += (line ? ' ' : '') + word; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const character of word) {
        if (line && textWidth(line + character, size, bold) > width) { lines.push(line); line = ''; }
        line += character;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}
function literal(text) {
  return `(${[...text].map(char => {
    const n = SPECIAL_BYTES.get(char) ?? char.charCodeAt(0);
    // All bytes are octal escaped. Input cannot break out of a PDF string.
    return `\\${n.toString(8).padStart(3, '0')}`;
  }).join('')})`;
}


function encodePdf(streams, lang) {
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R /Lang (${lang === 'en' ? 'en' : 'es-MX'}) >>`,
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  const kids = [];
  for (const stream of streams) {
    const pageId = objects.length + 1, streamId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
  let file = '%PDF-1.4\n%CYBERSERCH-local\n';
  const offsets = [0];
  objects.forEach((body, index) => { offsets.push(file.length); file += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const start = file.length;
  file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  file += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  file += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return new TextEncoder().encode(file);
}

function documentLayout(preview, hash, lang) {
  const pages=[], margin=45, width=522, bottom=720;
  let commands,y;
  const isEnglish=lang==='en';
  function text(value,x,baseline,size=9.5,bold=false,tone='.12 .18 .22') {
    commands.push(`BT /${bold?'F2':'F1'} ${size} Tf ${tone} rg 1 0 0 1 ${x} ${792-baseline} Tm ${literal(value)} Tj ET`);
  }
  function line(yValue) { commands.push(`.70 .79 .79 RG .6 w ${margin} ${792-yValue} m 567 ${792-yValue} l S`); }
  function newPage() {
    commands=[]; pages.push(commands); y=126;
    commands.push(`q .966 .973 .973 rg BT /F2 57 Tf .819 .574 -.574 .819 101 310 Tm ${literal('CYBERSERCH')} Tj ET Q`);
    text('CYBERSERCH',margin,38,10,true,'.06 .38 .40');
    text(isEnglish?'DRAFT':'BORRADOR',482,38,9,true,'.34 .41 .44');
    const heading=wrap(preview.title,20,width,true);
    heading.forEach((row,index)=>text(row,margin,66+index*23,20,true));
    const headerBottom=70+heading.length*23;
    text(isEnglish?'Working document / professional review':'Documento de trabajo / revisión profesional',margin,headerBottom,9,false,'.34 .41 .44');
    line(headerBottom+12); y=headerBottom+28;
  }
  function paragraph(value,{size=9.5,leading=13,bold=false,muted=false,after=8}={}) {
    for(const row of wrap(value,size,width,bold)) {
      if(y+leading>bottom)newPage();
      text(row,margin,y+size,size,bold,muted?'.34 .41 .44':'.12 .18 .22'); y+=leading;
    }
    y+=after;
  }
  newPage(); paragraph(preview.notice,{size:9,leading:12,muted:true,after:15});
  preview.rows.forEach((row,index)=>{
    // Keep a field heading with at least its first content line.
    if(y+46>bottom)newPage();
    paragraph(`${String(index+1).padStart(2,'0')} / ${row.label}`,{size:8.5,leading:12,bold:true,muted:true,after:2});
    paragraph(row.value,{after:12});
  });
  if(y+110>bottom)newPage();
  paragraph(isEnglish?'Local content fingerprint':'Huella local del contenido',{size:10,bold:true,after:5});
  paragraph(hash,{size:7.6,leading:11,after:6});
  paragraph(isEnglish?'SHA-256 of the normalized document data. It is not a digital signature, timestamp, identity check or certification. Review the entire draft before delivering it. Store and share downloaded files carefully.':'SHA-256 de los datos normalizados del documento. No es una firma digital, sello de tiempo, verificación de identidad ni certificación. Revisa todo el borrador antes de entregarlo. Guarda y comparte los archivos descargados con cuidado.',{size:8,leading:11,muted:true});
  pages.forEach((page,index)=>{
    commands=page; line(745);
    text(isEnglish?'CYBERSERCH / DRAFT FOR REVIEW / NO DIGITAL SIGNATURE':'CYBERSERCH / BORRADOR PARA REVISIÓN / SIN FIRMA DIGITAL',margin,761,6.5,false,'.34 .41 .44');
    text(`${isEnglish?'Page':'Página'} ${index+1} / ${pages.length}`,510,761,7.5,false,'.34 .41 .44');
  });
  return pages.map(page=>page.join('\n'));
}

export async function buildProfessionPdf(id,input,{lang='es',hash}={}) {
  const language=lang==='en'?'en':'es', errors=validateProfessionDocument(id,input,language);
  if(Object.keys(errors).length) {
    const error=new Error(language==='en'?'Review the document fields.':'Revisa los campos del documento.');
    error.name='ProfessionDocumentValidationError'; error.errors=errors; throw error;
  }
  const calculated=await professionDocumentHash(id,input);
  if(hash!==undefined&&(typeof hash!=='string'||hash.toLowerCase()!==calculated))throw new Error('The supplied hash does not match these document details.');
  return encodePdf(documentLayout(professionPreview(id,input,language),calculated,language),language);
}

