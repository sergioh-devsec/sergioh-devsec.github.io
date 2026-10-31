/**
 * Original, dependency-free CV document generators. All work stays in memory.
 * No network requests, storage, tracking, payment state or download side effects.
 * PDF uses the standard Helvetica / Times fonts with the WinAnsi character set.
 */

export const CV_EXPORT_LIMITS = Object.freeze({
  name: 160, headline: 220, summary: 4000, email: 254, phone: 80,
  location: 200, skills: 4000, education: 6000, experiences: 40,
  experienceId: 80, role: 220, company: 220, start: 40, end: 40,
  description: 6000, total: 48000, jobText: 20000, letter: 6000,
});

export const CV_TEMPLATES = Object.freeze(['sobria', 'tecnica', 'ejecutiva']);

const TEMPLATES = Object.freeze({
  sobria: { accent: '334155', font: 'Arial', titleSize: 27, sectionSize: 10.5, order: ['summary', 'experiences', 'education', 'skills'] },
  tecnica: { accent: '126177', font: 'Arial', titleSize: 25, sectionSize: 10, order: ['summary', 'skills', 'experiences', 'education'] },
  ejecutiva: { accent: '8A6535', font: 'Georgia', titleSize: 29, sectionSize: 11, order: ['summary', 'experiences', 'skills', 'education'] },
});
const LABELS = { summary: 'Perfil profesional', experiences: 'Experiencia profesional', skills: 'Competencias', education: 'Formación' };
const SINGLE_FIELDS = new Set(['name', 'headline', 'email', 'phone', 'location', 'id', 'role', 'company', 'start', 'end']);
const encoder = new TextEncoder();

function textField(value, key, max) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new TypeError(`El campo ${key} debe ser texto.`);
  // Reject rather than truncate: every exported fact must match the entered data.
  if (value.length > max) throw new RangeError(`El campo ${key} admite como máximo ${max} caracteres.`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFE\uFFFF]/u.test(value)) {
    throw new RangeError(`El campo ${key} contiene caracteres de control no admitidos.`);
  }
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code >= 0xD800 && code <= 0xDFFF) throw new RangeError(`El campo ${key} contiene texto Unicode incompleto.`);
  }
  const normalized = value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').trim();
  const result = SINGLE_FIELDS.has(key) ? normalized.replace(/\s+/g, ' ') : normalized;
  if (result.length > max) throw new RangeError(`El campo ${key} admite como máximo ${max} caracteres.`);
  return result;
}

/** Normalizes a copy and throws on invalid or excessive input, before allocation. */
export function normalizeCvProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Introduce los datos del CV.');
  const data = {};
  for (const key of ['name', 'headline', 'summary', 'email', 'phone', 'location', 'skills', 'education']) {
    data[key] = textField(input[key], key, CV_EXPORT_LIMITS[key]);
  }
  if (!data.name) throw new RangeError('Escribe tu nombre antes de exportar el CV.');
  if (input.experiences !== undefined && !Array.isArray(input.experiences)) throw new TypeError('La experiencia debe ser una lista.');
  const experiences = input.experiences || [];
  if (experiences.length > CV_EXPORT_LIMITS.experiences) throw new RangeError(`Añade como máximo ${CV_EXPORT_LIMITS.experiences} experiencias.`);
  data.experiences = experiences.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError(`La experiencia ${index + 1} no es válida.`);
    if (item.current !== undefined && typeof item.current !== 'boolean') throw new TypeError('El estado de empleo actual debe ser verdadero o falso.');
    return {
      id: textField(item.id, 'id', CV_EXPORT_LIMITS.experienceId),
      role: textField(item.role, 'role', CV_EXPORT_LIMITS.role),
      company: textField(item.company, 'company', CV_EXPORT_LIMITS.company),
      start: textField(item.start, 'start', CV_EXPORT_LIMITS.start),
      end: textField(item.end, 'end', CV_EXPORT_LIMITS.end),
      current: item.current === true,
      description: textField(item.description, 'description', CV_EXPORT_LIMITS.description),
    };
  });
  const total = Object.values(data).filter(value => typeof value === 'string').reduce((sum, value) => sum + value.length, 0)
    + data.experiences.reduce((sum, item) => sum + Object.values(item).filter(value => typeof value === 'string').reduce((n, value) => n + value.length, 0), 0);
  if (total > CV_EXPORT_LIMITS.total) throw new RangeError(`El CV completo admite como máximo ${CV_EXPORT_LIMITS.total} caracteres.`);
  return data;
}

function optionsOf(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Las opciones de exportación no son válidas.');
  const template = options.template === undefined ? 'sobria' : options.template;
  if (!CV_TEMPLATES.includes(template)) throw new RangeError('Selecciona una plantilla válida: sobria, tecnica o ejecutiva.');
  // Context is intentionally not inserted into a CV or used to invent claims.
  textField(options.jobText, 'jobText', CV_EXPORT_LIMITS.jobText);
  return { template, style: TEMPLATES[template] };
}

function contactOf(data) { return [data.email, data.phone, data.location].filter(Boolean).join(' · '); }
function datesOf(item) { return [item.start, item.current ? 'Actualidad' : item.end].filter(Boolean).join(' - '); }
function titleOf(item) { return [item.role, item.company].filter(Boolean).join(' | '); }
function hasExperience(item) { return Boolean(titleOf(item) || datesOf(item) || item.description); }

/** Plain UTF-8-ready text. The caller chooses the filename and download method. */
export function buildPlainText(profile) {
  const data = normalizeCvProfile(profile);
  const blocks = [[data.name, data.headline, contactOf(data)].filter(Boolean).join('\n')];
  if (data.summary) blocks.push(`${LABELS.summary.toLocaleUpperCase('es-MX')}\n${data.summary}`);
  const experiences = data.experiences.filter(hasExperience);
  if (experiences.length) blocks.push(`${LABELS.experiences.toLocaleUpperCase('es-MX')}\n${experiences.map(item => [titleOf(item), datesOf(item), item.description].filter(Boolean).join('\n')).join('\n\n')}`);
  if (data.education) blocks.push(`${LABELS.education.toLocaleUpperCase('es-MX')}\n${data.education}`);
  if (data.skills) blocks.push(`${LABELS.skills.toLocaleUpperCase('es-MX')}\n${data.skills}`);
  return blocks.join('\n\n') + '\n';
}

function xml(text) {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}
function paragraph(text, style = 'Normal') {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r>${text.split('\n').map((line, index) => `${index ? '<w:br/>' : ''}<w:t xml:space="preserve">${xml(line)}</w:t>`).join('')}</w:r></w:p>`;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let n = index;
  for (let bit = 0; bit < 8; bit++) n = (n & 1) ? 0xEDB88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function concat(parts) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}
function header(size) { const bytes = new Uint8Array(size); return { bytes, view: new DataView(bytes.buffer) }; }

// Stored ZIP with fixed DOS date (1980-01-01): valid OOXML, deterministic bytes.
function storedZip(entries) {
  const locals = [], central = [];
  let offset = 0, centralSize = 0;
  for (const [path, contents] of entries) {
    const name = encoder.encode(path), bytes = encoder.encode(contents), checksum = crc32(bytes);
    const local = header(30), directory = header(46);
    local.view.setUint32(0, 0x04034B50, true);
    local.view.setUint16(4, 20, true); local.view.setUint16(6, 0x800, true);
    local.view.setUint16(12, 33, true); local.view.setUint32(14, checksum, true);
    local.view.setUint32(18, bytes.length, true); local.view.setUint32(22, bytes.length, true);
    local.view.setUint16(26, name.length, true);
    directory.view.setUint32(0, 0x02014B50, true);
    directory.view.setUint16(4, 20, true); directory.view.setUint16(6, 20, true); directory.view.setUint16(8, 0x800, true);
    directory.view.setUint16(14, 33, true); directory.view.setUint32(16, checksum, true);
    directory.view.setUint32(20, bytes.length, true); directory.view.setUint32(24, bytes.length, true);
    directory.view.setUint16(28, name.length, true); directory.view.setUint32(42, offset, true);
    locals.push(local.bytes, name, bytes); central.push(directory.bytes, name);
    offset += 30 + name.length + bytes.length;
    centralSize += 46 + name.length;
  }
  const end = header(22);
  end.view.setUint32(0, 0x06054B50, true); end.view.setUint16(8, entries.length, true); end.view.setUint16(10, entries.length, true);
  end.view.setUint32(12, centralSize, true); end.view.setUint32(16, offset, true);
  return concat([...locals, ...central, end.bytes]);
}

function wordStyles(template, style) {
  const titleFont = style.font;
  const headingCaps = template === 'tecnica' ? '<w:caps/>' : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="21"/><w:color w:val="253244"/><w:lang w:val="es-MX"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="90"/></w:pPr><w:rPr><w:rFonts w:ascii="${titleFont}" w:hAnsi="${titleFont}"/><w:b/><w:color w:val="172536"/><w:sz w:val="${style.titleSize * 2}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="100"/></w:pPr><w:rPr><w:color w:val="${style.accent}"/><w:sz w:val="25"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Contact"><w:name w:val="Contact"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="160"/><w:pBdr><w:bottom w:val="single" w:sz="${template === 'ejecutiva' ? 10 : 5}" w:space="12" w:color="${style.accent}"/></w:pBdr></w:pPr><w:rPr><w:sz w:val="18"/><w:color w:val="526174"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="110"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/>${headingCaps}<w:sz w:val="${style.sectionSize * 2}"/><w:color w:val="${style.accent}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Experience"><w:name w:val="Experience"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="55"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="70"/></w:pPr><w:rPr><w:sz w:val="18"/><w:color w:val="526174"/></w:rPr></w:style>
</w:styles>`;
}

/** A real editable .docx (OOXML ZIP), never HTML renamed as a Word file. */
export function buildDocx(profile, options = {}) {
  const data = normalizeCvProfile(profile), { template, style } = optionsOf(options);
  const body = [paragraph(data.name, 'Title')];
  if (data.headline) body.push(paragraph(data.headline, 'Subtitle'));
  body.push(paragraph(contactOf(data), 'Contact'));
  let sectionNumber = 0;
  for (const key of style.order) {
    const experiences = key === 'experiences' ? data.experiences.filter(hasExperience) : [];
    if (key === 'experiences' ? !experiences.length : !data[key]) continue;
    sectionNumber++;
    body.push(paragraph(`${template === 'tecnica' ? `0${sectionNumber} / ` : ''}${LABELS[key]}`, 'Heading1'));
    if (key !== 'experiences') body.push(paragraph(data[key]));
    else for (const item of experiences) {
      if (titleOf(item)) body.push(paragraph(titleOf(item), 'Experience'));
      if (datesOf(item)) body.push(paragraph(datesOf(item), 'Meta'));
      if (item.description) body.push(paragraph(item.description));
    }
  }
  return docxPackage(data, body, template, style);
}

/** An editable letter, with its own paragraphs and no CV section headings. */
export function buildCoverLetterDocx(profile, letter, options = {}) {
  const data = normalizeCvProfile(profile), { template, style } = optionsOf(options);
  const content = textField(letter, 'letter', CV_EXPORT_LIMITS.letter);
  if (!content) throw new RangeError('Escribe la carta de presentación antes de exportarla.');
  const body = [paragraph(data.name, 'Title'), paragraph(contactOf(data), 'Contact')];
  for (const block of content.split(/\n{2,}/u)) body.push(paragraph(block));
  return docxPackage(data, body, template, style, 'Carta de presentación');
}

function docxPackage(data, body, template, style, title = 'CV') {
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const packageRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join('')}<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020" w:header="400" w:footer="450"/></w:sectPr></w:body></w:document>`;
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="526174"/></w:rPr><w:t xml:space="preserve">Página </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)} - ${xml(data.name)}</dc:title><dc:creator>${xml(data.name)}</dc:creator><dc:language>es-MX</dc:language></cp:coreProperties>`;
  return storedZip([
    ['[Content_Types].xml', types], ['_rels/.rels', packageRels], ['word/document.xml', document],
    ['word/styles.xml', wordStyles(template, style)], ['word/_rels/document.xml.rels', documentRels],
    ['word/footer1.xml', footer], ['docProps/core.xml', core],
  ]);
}

// Widths of the PDF standard Helvetica fonts (1/1000 em, ASCII 32 through 126).
const WIDTHS = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const BOLD_WIDTHS = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
const TIMES_BOLD_WIDTHS = [250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520];
const SPECIAL_BYTES = new Map([
  ['€',128],['‚',130],['ƒ',131],['„',132],['…',133],['†',134],['‡',135],['ˆ',136],['‰',137],['Š',138],['‹',139],['Œ',140],['Ž',142],
  ['‘',145],['’',146],['“',147],['”',148],['•',149],['–',150],['—',151],['˜',152],['™',153],['š',154],['›',155],['œ',156],['ž',158],['Ÿ',159],
]);
function winByte(char) { return SPECIAL_BYTES.get(char) ?? char.codePointAt(0); }
function pdfCompatible(data) {
  const strings = Object.values(data).filter(value => typeof value === 'string');
  for (const item of data.experiences) strings.push(...Object.values(item).filter(value => typeof value === 'string'));
  for (const value of strings) for (const char of value) {
    const code = char.codePointAt(0);
    if (char !== '\n' && !(code >= 32 && code <= 126) && !(code >= 160 && code <= 255) && !SPECIAL_BYTES.has(char)) {
      throw new RangeError('Para PDF usa caracteres en español o inglés, sin emojis ni alfabetos no latinos. DOCX y TXT conservan otros caracteres Unicode.');
    }
  }
}
function widthOf(text, size, bold = false, font) {
  let units = 0;
  for (const char of text) {
    const ascii = char.normalize('NFD')[0].charCodeAt(0);
    if (ascii >= 32 && ascii <= 126) units += (font === 'F3' ? TIMES_BOLD_WIDTHS : bold ? BOLD_WIDTHS : WIDTHS)[ascii - 32];
    else units += ({ '·': 278, '•': 350, '¡': 333, '¿': 611, '–': 556, '—': 1000, '…': 1000, '€': 556, 'Æ': 1000, 'æ': 889, 'Œ': 1000, 'œ': 944, 'ß': 611, '«': 556, '»': 556, '“': 500, '”': 500, '‘': 278, '’': 278, '\u00A0': 278 })[char] || 1000;
  }
  return units * size / 1000;
}
function wrapText(text, size, width, bold = false, font) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      if (widthOf(line ? `${line} ${word}` : word, size, bold, font) <= width) { line += (line ? ' ' : '') + word; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const char of word) {
        if (line && widthOf(line + char, size, bold, font) > width) { lines.push(line); line = ''; }
        line += char;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}
function pdfString(text) { return `(${[...text].map(char => `\\${winByte(char).toString(8).padStart(3, '0')}`).join('')})`; }
function utf16Hex(text) { return 'FEFF' + Array.from({ length: text.length }, (_, index) => text.charCodeAt(index).toString(16).padStart(4, '0')).join('').toUpperCase(); }
function rgb(hex) { return hex.match(/../g).map(part => (parseInt(part, 16) / 255).toFixed(4)).join(' '); }

/** Searchable/selectable PDF with automatic wrapping and page breaks. */
export function buildCvPdf(profile, options = {}) {
  const data = normalizeCvProfile(profile), { template, style } = optionsOf(options);
  pdfCompatible(data);
  const pageWidth = 595.28, pageHeight = 841.89, margin = 51, available = pageWidth - margin * 2;
  const pages = [[]];
  let commands = pages[0], y = 65;
  const dark = '0.0902 0.1451 0.2118', muted = '0.3216 0.3804 0.4549', accent = rgb(style.accent);
  function draw(text, top, size = 10.5, bold = false, color = dark, x = margin, font) {
    if (!text) return;
    commands.push(`BT ${color} rg /${font || (bold ? 'F2' : 'F1')} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${(pageHeight - top).toFixed(2)} Tm ${pdfString(text)} Tj ET`);
  }
  function rule(top, thickness = 0.7) {
    commands.push(`${accent} RG ${thickness} w ${margin} ${(pageHeight - top).toFixed(2)} m ${(pageWidth - margin).toFixed(2)} ${(pageHeight - top).toFixed(2)} l S`);
  }
  function nextPage() {
    commands = []; pages.push(commands); y = 91;
    draw(wrapText(data.name, 9, available - 60, true)[0], 49, 9, true, muted);
    rule(65, 0.5);
  }
  function ensure(height) { if (y + height > pageHeight - 65) nextPage(); }
  function write(text, size = 10.5, bold = false, color = dark, leading = size * 1.42, font) {
    for (const line of wrapText(text, size, available, bold, font)) {
      ensure(leading); draw(line, y, size, bold, color, margin, font); y += leading;
    }
  }
  function heading(label, number, followingHeight = 15) {
    ensure(35 + followingHeight + 1); y += 15;
    const text = template === 'tecnica' ? `0${number} / ${label.toLocaleUpperCase('es-MX')}` : label;
    write(text, style.sectionSize, true, accent, 15); y += 5;
  }
  function experienceLeadHeight(item) {
    const title = titleOf(item);
    return (title ? wrapText(title, 11, available, true).length * 15 : 0)
      + (datesOf(item) ? 14 : 0) + (item.description ? 15 : 0);
  }

  write(data.name, style.titleSize, true, dark, style.titleSize * 1.16, template === 'ejecutiva' ? 'F3' : 'F2');
  if (data.headline) { y += 4; write(data.headline, 12.5, false, accent, 17); }
  if (contactOf(data)) { y += 9; write(contactOf(data), 9, false, muted, 13); }
  y += 8; rule(y, template === 'ejecutiva' ? 1.5 : 0.7); y += 9;

  let sectionNumber = 0;
  for (const key of style.order) {
    const experiences = key === 'experiences' ? data.experiences.filter(hasExperience) : [];
    if (key === 'experiences' ? !experiences.length : !data[key]) continue;
    heading(LABELS[key], ++sectionNumber, key === 'experiences' ? experienceLeadHeight(experiences[0]) : 15);
    if (key !== 'experiences') write(data[key]);
    else for (const item of experiences) {
      const title = titleOf(item), dates = datesOf(item);
      ensure(experienceLeadHeight(item));
      if (title) write(title, 11, true, dark, 15);
      if (dates) write(dates, 9, false, muted, 14);
      if (item.description) write(item.description);
      y += 9;
    }
  }
  const total = pages.length;
  pages.forEach((page, index) => {
    commands = page;
    draw(`Página ${index + 1} de ${total}`, pageHeight - 35, 8, false, muted, pageWidth - margin - 78);
  });

  const objects = [null,
    '<< /Type /Catalog /Pages 2 0 R /Lang (es-MX) >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title <${utf16Hex(`CV - ${data.name}`)}> /Author <${utf16Hex(data.name)}> /Producer (Generador local de CV) >>`,
  ];
  const pageRefs = [];
  for (const page of pages) {
    const stream = page.join('\n') + '\n', streamId = objects.length;
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`);
    const pageId = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${streamId} 0 R >>`);
    pageRefs.push(`${pageId} 0 R`);
  }
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;
  const chunks = [encoder.encode('%PDF-1.4\n% Local CV\n')], offsets = [0];
  let length = chunks[0].length;
  for (let index = 1; index < objects.length; index++) {
    offsets.push(length);
    const bytes = encoder.encode(`${index} 0 obj\n${objects[index]}\nendobj\n`);
    chunks.push(bytes); length += bytes.length;
  }
  const xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${length}\n%%EOF\n`;
  chunks.push(encoder.encode(xref));
  return concat(chunks);
}
