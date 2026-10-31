/**
 * Local dental-consent draft generator. No network, storage, tracking or uploads.
 * Reference: NOM-013-SSA2-2015 9.6 and NOM-004-SSA3-2012 10.1, Mexico.
 * This tool does not provide a diagnosis, clinical risks or legal certification.
 */
export const CONSENT_FIELDS = Object.freeze({
  patientName: { required: true, maxLength: 160 },
  procedure: { required: true, maxLength: 4000 },
  risks: { required: true, maxLength: 4000 },
  date: { required: true, maxLength: 10 },
  clinicName: { maxLength: 200 },
  clinicianName: { maxLength: 160 },
  location: { maxLength: 200 },
  objectives: { maxLength: 2000 },
  benefits: { maxLength: 2000 },
  alternatives: { maxLength: 2000 },
  noTreatment: { maxLength: 2000 },
  contingencies: { maxLength: 2000 },
  notes: { maxLength: 2000 },
  representativeName: { maxLength: 160 },
  witness1Name: { maxLength: 160 },
  witness2Name: { maxLength: 160 },
});

export const CONSENT_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'CyberSerch dental consent draft data v1',
  type: 'object',
  additionalProperties: false,
  required: ['patientName', 'procedure', 'risks', 'date'],
  properties: { schemaVersion: { type: 'string', const: '1.0' }, ...Object.fromEntries(Object.entries(CONSENT_FIELDS).map(([key, field]) => [key, {
    type: 'string', maxLength: field.maxLength,
    ...(field.required ? { minLength: 1 } : {}),
    ...(key === 'date' ? { format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } : {}),
  }])) },
});

export const CONSENT_SOURCES = Object.freeze([
  { title: 'NOM-013-SSA2-2015, 9.6', url: 'https://sidof.segob.gob.mx/notas/docFuente/5462039' },
  { title: 'NOM-004-SSA3-2012, 10.1', url: 'https://sidof.segob.gob.mx/notas/docFuente/5272787' },
]);

const SPECIAL_BYTES = new Map([
  ['€',128],['‚',130],['ƒ',131],['„',132],['…',133],['†',134],['‡',135],['ˆ',136],['‰',137],['Š',138],['‹',139],['Œ',140],['Ž',142],
  ['‘',145],['’',146],['“',147],['”',148],['•',149],['–',150],['—',151],['˜',152],['™',153],['š',154],['›',155],['œ',156],['ž',158],['Ÿ',159],
]);
const normalise = value => typeof value === 'string' ? value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').trim() : '';
function dataOf(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return Object.fromEntries(Object.keys(CONSENT_FIELDS).map(key => [key, normalise(source[key])]));
}
function isSupported(text) {
  return [...text].every(char => {
    const n = char.codePointAt(0);
    return n === 10 || (n >= 32 && n <= 126) || (n >= 160 && n <= 255) || SPECIAL_BYTES.has(char);
  });
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Returns {} when valid; otherwise { fieldName: localizedMessage }. */
export function validateConsent(input, lang = 'es') {
  const en = lang === 'en', errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { form: en ? 'Enter the form details.' : 'Completa los datos del formulario.' };
  const data = dataOf(input);
  for (const [key, rule] of Object.entries(CONSENT_FIELDS)) {
    if (input[key] !== undefined && typeof input[key] !== 'string') errors[key] = en ? 'Enter text only.' : 'Introduce únicamente texto.';
    else if (rule.required && !data[key]) errors[key] = en ? 'This field is required.' : 'Este campo es obligatorio.';
    else if (data[key].length > rule.maxLength) errors[key] = en ? `Use no more than ${rule.maxLength} characters.` : `Usa como máximo ${rule.maxLength} caracteres.`;
    else if (!isSupported(data[key])) errors[key] = en ? 'Use Spanish or English text, without emoji or control characters.' : 'Usa texto en español o inglés, sin emojis ni caracteres de control.';
  }
  if (data.date && !errors.date && !validDate(data.date)) errors.date = en ? 'Enter a valid date as YYYY-MM-DD.' : 'Introduce una fecha válida en formato AAAA-MM-DD.';
  if (Object.values(data).reduce((sum, value) => sum + value.length, 0) > 18000) errors.form = en ? 'The complete draft must not exceed 18,000 characters.' : 'El borrador completo no debe superar 18,000 caracteres.';
  return errors;
}

/** Fixed key order, NFC text and LF newlines. Hashes the entered data, not PDF bytes. */
export function canonicalConsent(input) {
  return JSON.stringify({ schemaVersion: '1.0', ...dataOf(input) });
}

export async function consentHash(input) {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 requires a secure browser context (HTTPS or localhost).');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalConsent(input)));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

const COPY = {
  es: {
    title: 'Consentimiento dental', subtitle: 'Plantilla de trabajo / revisión profesional', draft: 'BORRADOR',
    notice: 'Documento de apoyo. Debe completarlo y revisarlo el profesional tratante con el paciente antes de cualquier firma. Generar este PDF no equivale a otorgar consentimiento ni acredita su validez legal.',
    identity: '01 / Identificación de la atención', plan: '02 / Intervención propuesta', information: '03 / Información para decidir',
    patientName: 'Paciente', date: 'Fecha', clinicName: 'Establecimiento o institución', clinicianName: 'Profesional tratante', location: 'Lugar de emisión',
    procedure: 'Procedimiento propuesto', risks: 'Molestias y riesgos comunicados por el profesional', objectives: 'Objetivo de la intervención',
    benefits: 'Beneficios esperados y probabilidad aproximada', alternatives: 'Alternativas factibles explicadas', noTreatment: 'Consecuencias previsibles de no tratar y recomendación profesional',
    contingencies: 'Alcance de la atención de contingencias y urgencias', notes: 'Preguntas, aclaraciones o condiciones particulares', representativeName: 'Representante, cuando corresponda',
    pending: 'Pendiente de completar y revisar con el profesional tratante.',
    review: '04 / Conversación y decisión',
    reviewIntro: 'La siguiente declaración es un texto para revisar con el profesional. No está aceptada por el hecho de descargar el documento:',
    statements: [
      'Pude conocer el procedimiento propuesto, sus objetivos, beneficios, riesgos y alternativas, así como las consecuencias de no realizarlo. Mis dudas deben quedar resueltas antes de decidir.',
      'Comprendo que pueden surgir situaciones no previstas y que el resultado no está garantizado. El profesional debe precisar conmigo cómo atendería contingencias relacionadas con el procedimiento.',
      'Mi decisión debe ser libre. Puedo hacer preguntas y revocar mi consentimiento antes de que comience el procedimiento. Si cambia el plan, debe revisarse y documentarse un nuevo consentimiento.',
      'El profesional prioriza mi bienestar y seguridad; este documento no le obliga a realizar una intervención cuyo riesgo supere el beneficio. Cualquier autorización se limita al procedimiento y alcance revisados.',
    ],
    decision: 'Decisión del paciente (completar después de la explicación):', decisionOptions: '[  ] Autorizo el procedimiento descrito   [  ] No autorizo   [  ] Solicito aclaraciones',
    signatureHeading: '05 / Nombres y firmas', patientSignature: 'Paciente o representante: nombre y firma', clinicianSignature: 'Profesional que informa: nombre y firma',
    witness1: 'Testigo 1: nombre y firma', witness2: 'Testigo 2: nombre y firma', signedDate: 'Lugar y fecha de firma:',
    integrity: 'Control local del contenido',
    hashNote: 'SHA-256 del JSON normalizado de los datos. No es una firma electrónica, sello de tiempo, prueba de identidad ni garantía de validez clínica o legal. El PDF y el JSON contienen datos personales: guárdalos y compártelos con cuidado.',
    reference: 'Orientación documental: NOM-013-SSA2-2015, 9.6; NOM-004-SSA3-2012, 10.1. El profesional debe adecuar el contenido al caso y a las disposiciones aplicables.',
    page: 'Página', continued: '(continuación)', footer: 'CYBERSERCH / BORRADOR PARA REVISIÓN / SIN FIRMA DIGITAL',
  },
  en: {
    title: 'Dental informed consent', subtitle: 'Working template / professional review', draft: 'DRAFT',
    notice: 'Supporting document. The treating professional must complete and review it with the patient before anyone signs. Generating this PDF does not give consent or establish its legal validity.',
    identity: '01 / Care details', plan: '02 / Proposed intervention', information: '03 / Information for a decision',
    patientName: 'Patient', date: 'Date', clinicName: 'Practice or institution', clinicianName: 'Treating professional', location: 'Place of issue',
    procedure: 'Proposed procedure', risks: 'Discomfort and risks explained by the professional', objectives: 'Purpose of the intervention',
    benefits: 'Expected benefits and approximate likelihood', alternatives: 'Feasible alternatives discussed', noTreatment: 'Expected consequences of no treatment and professional recommendation',
    contingencies: 'Scope of care for contingencies and emergencies', notes: 'Questions, clarifications or particular conditions', representativeName: 'Representative, where applicable',
    pending: 'To be completed and reviewed with the treating professional.',
    review: '04 / Discussion and decision',
    reviewIntro: 'The following statement is a draft to review with the professional. Downloading this document does not mean it has been accepted:',
    statements: [
      'I had the opportunity to understand the proposed procedure, its purpose, benefits, risks and alternatives, including the consequences of no treatment. My questions must be answered before I decide.',
      'I understand that unforeseen situations may occur and outcomes are not guaranteed. The professional must discuss with me how contingencies related to the procedure would be addressed.',
      'My decision must be voluntary. I may ask questions and withdraw consent before the procedure begins. A changed treatment plan requires a new discussion and documented consent.',
      'The professional prioritizes my wellbeing and safety. This document does not require an intervention whose risks outweigh its benefits. Any authorization is limited to the reviewed procedure and scope.',
    ],
    decision: 'Patient decision (complete after the discussion):', decisionOptions: '[  ] I authorize the described procedure   [  ] I do not authorize   [  ] I need clarification',
    signatureHeading: '05 / Names and signatures', patientSignature: 'Patient or representative: name and signature', clinicianSignature: 'Informing professional: name and signature',
    witness1: 'Witness 1: name and signature', witness2: 'Witness 2: name and signature', signedDate: 'Place and date of signing:',
    integrity: 'Local content verification',
    hashNote: 'SHA-256 of the normalized form-data JSON. It is not an electronic signature, timestamp, proof of identity, or assurance of clinical or legal validity. The PDF and JSON contain personal data: store and share them carefully.',
    reference: 'Documentary orientation: Mexico NOM-013-SSA2-2015, 9.6; NOM-004-SSA3-2012, 10.1. The professional must adapt the content to the individual case and applicable requirements. This English template is not a legal translation.',
    page: 'Page', continued: '(continued)', footer: 'CYBERSERCH / DRAFT FOR REVIEW / NO DIGITAL SIGNATURE',
  },
};

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

function pdfLayout(data, copy, hash) {
  const pages = [], margin = 45, width = 522, bottom = 724;
  let commands, y;
  const color = { text: '.12 .18 .22', muted: '.34 .41 .44', teal: '.06 .38 .40' };
  function text(value, x, baseline, size = 9.5, bold = false, tone = 'text') {
    commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color[tone]} rg 1 0 0 1 ${x} ${792 - baseline} Tm ${literal(value)} Tj ET`);
  }
  function line(x1, y1, x2, y2, shade = '.75 .80 .81') { commands.push(`${shade} RG .6 w ${x1} ${792 - y1} m ${x2} ${792 - y2} l S`); }
  function newPage() {
    commands = []; pages.push(commands); y = 116;
    commands.push(`q .966 .973 .973 rg BT /F2 57 Tf .819 .574 -.574 .819 101 310 Tm ${literal('CYBERSERCH')} Tj ET Q`);
    text('CYBERSERCH', margin, 38, 10, true, 'teal');
    text(copy.draft, 483, 38, 9, true, 'muted');
    text(copy.title, margin, 68, 23, true);
    text(copy.subtitle, margin, 86, 9, false, 'muted');
    line(margin, 98, 567, 98, '.06 .38 .40');
  }
  function ensure(space) { if (y + space > bottom) newPage(); }
  function paragraph(value, { size = 9.5, leading = 13, bold = false, tone = 'text', after = 7 } = {}) {
    for (const row of wrap(value, size, width, bold)) { ensure(leading); text(row, margin, y + size, size, bold, tone); y += leading; }
    y += after;
  }
  function section(title) { ensure(43); y += 7; paragraph(title, { size: 10, leading: 15, bold: true, tone: 'teal', after: 5 }); }
  function field(key, compact = false) {
    const value = data[key] || copy.pending;
    ensure(38);
    if (compact && textWidth(`${copy[key]}: ${value}`, 9.5) <= width) paragraph(`${copy[key]}: ${value}`, { leading: 13, after: 3 });
    else {
      paragraph(copy[key], { size: 8.5, leading: 12, bold: true, tone: 'muted', after: 1 });
      paragraph(value, { after: 7, tone: data[key] ? 'text' : 'muted' });
    }
  }
  newPage();
  paragraph(copy.notice, { size: 9, leading: 12, tone: 'muted', after: 8 });
  section(copy.identity);
  for (const key of ['patientName', 'date', 'clinicName', 'clinicianName', 'location']) field(key, true);
  if (data.representativeName) field('representativeName', true);
  section(copy.plan); field('procedure'); field('objectives');
  section(copy.information);
  for (const key of ['risks', 'benefits', 'alternatives', 'noTreatment', 'contingencies']) field(key);
  if (data.notes) field('notes');
  // A separate decision page keeps signatures with the text to be reviewed.
  newPage();
  section(copy.review);
  paragraph(copy.reviewIntro, { tone: 'muted', after: 9 });
  for (const statement of copy.statements) paragraph(statement, { size: 9, leading: 12, after: 6 });
  paragraph(copy.decision, { bold: true, size: 9, after: 5 });
  paragraph(copy.decisionOptions, { size: 8.4, leading: 12, after: 12 });
  section(copy.signatureHeading);
  ensure(180);
  const signatureTop = y + 30;
  const signatures = [[copy.patientSignature, data.patientName], [copy.clinicianSignature, data.clinicianName], [copy.witness1, data.witness1Name], [copy.witness2, data.witness2Name]];
  const signatureNames = signatures.map(([, value]) => wrap(value, 8, 245));
  const firstRowHeight = Math.max(63, 33 + Math.max(signatureNames[0].length, signatureNames[1].length) * 9);
  const secondRowHeight = Math.max(48, 27 + Math.max(signatureNames[2].length, signatureNames[3].length) * 9);
  for (let i = 0; i < signatures.length; i++) {
    const x = margin + (i % 2) * 273, top = signatureTop + Math.floor(i / 2) * firstRowHeight;
    line(x, top, x + 249, top);
    text(signatures[i][0], x, top + 13, 7.8, true, 'muted');
    // Reference names do not fill a signature. Long names wrap inside each cell.
    if (signatures[i][1]) signatureNames[i].forEach((row, n) => text(row, x, top + 25 + n * 9, 8));
  }
  y = signatureTop + firstRowHeight + secondRowHeight;
  paragraph(`${copy.signedDate} _______________________________________________`, { size: 8.5, after: 15 });
  section(copy.integrity);
  paragraph(hash, { size: 7.6, leading: 11, after: 6 });
  paragraph(copy.hashNote, { size: 8, leading: 10.5, tone: 'muted', after: 9 });
  paragraph(copy.reference, { size: 7.5, leading: 10, tone: 'muted', after: 3 });
  for (const source of CONSENT_SOURCES) paragraph(`${source.title}: ${source.url}`, { size: 7, leading: 10, tone: 'muted', after: 0 });
  pages.forEach((page, index) => {
    commands = page;
    line(margin, 745, 567, 745);
    text(copy.footer, margin, 761, 6.5, false, 'muted');
    text(`${copy.page} ${index + 1} / ${pages.length}`, 510, 761, 7.5, false, 'muted');
  });
  return pages.map(page => page.join('\n'));
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

/** Returns a PDF Uint8Array. Caller owns download URL creation and revocation. */
export async function buildConsentPdf(input, { lang = 'es', hash } = {}) {
  const language = lang === 'en' ? 'en' : 'es';
  const errors = validateConsent(input, language);
  if (Object.keys(errors).length) {
    const error = new Error(language === 'en' ? 'Review the form fields before generating the draft.' : 'Revisa los campos antes de generar el borrador.');
    error.name = 'ConsentValidationError'; error.errors = errors; throw error;
  }
  const calculated = await consentHash(input);
  if (hash !== undefined && (typeof hash !== 'string' || hash.toLowerCase() !== calculated)) throw new Error(language === 'en' ? 'The supplied hash does not match these form details.' : 'El hash proporcionado no corresponde a estos datos.');
  return encodePdf(pdfLayout(dataOf(input), COPY[language], calculated), language);
}
