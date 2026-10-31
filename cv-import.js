/** Bounded, local TXT/DOCX import. No uploads, executable markup or third party runtime. */
const MAX_FILE = 2 * 1024 * 1024;
const MAX_EXPANDED = 4 * 1024 * 1024;
const WORD_NS = new Set(['http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'http://purl.oclc.org/ooxml/wordprocessingml/main']);
const fail = message => { throw new Error(message); };

function decode(bytes, encoding = 'utf-8') {
  try { return new TextDecoder(encoding, {fatal: true}).decode(bytes); }
  catch { fail('El texto tiene una codificación inválida. Guarda el archivo como TXT UTF-8 o copia y pega su contenido.'); }
}

function assertReadable(text) {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)
    || /^(?:%PDF-|PK\u0003\u0004|GIF8|\{\\rtf)/.test(text)) {
    fail('El archivo contiene datos binarios o un formato distinto de texto. Usa un TXT UTF-8, un DOCX o pega el texto.');
  }
  if (!text.trim()) fail('El archivo no contiene texto legible. Copia y pega el contenido de tu CV.');
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let value = i;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  CRC_TABLE[i] = value >>> 0;
}
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function safePath(name) {
  if (!name || /[\\\u0000-\u001f\u007f:<>|?*]/.test(name) || name.startsWith('/')
    || name.split('/').some((part, index, parts) => part === '.' || part === '..' || (!part && index !== parts.length - 1))) {
    fail('El DOCX contiene una ruta interna insegura. Guarda una copia nueva del documento e inténtalo otra vez.');
  }
}

function zipDirectory(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { eocd = offset; break; }
  }
  if (eocd < 0) fail('El DOCX está incompleto o no es un archivo ZIP válido. Guarda una copia nueva.');
  const count = view.getUint16(eocd + 10, true);
  const size = view.getUint32(eocd + 12, true);
  const start = view.getUint32(eocd + 16, true);
  if (view.getUint16(eocd + 4, true) || view.getUint16(eocd + 6, true)
    || view.getUint16(eocd + 8, true) !== count || count === 0xffff || size === 0xffffffff || start === 0xffffffff) {
    fail('No se admiten DOCX divididos en varios archivos ni ZIP64. Guarda un DOCX sencillo o pega el texto.');
  }
  if (!count || count > 2048 || start + size !== eocd) fail('El directorio interno del DOCX es inválido o demasiado complejo.');
  let offset = start, total = 0;
  const entries = [], names = new Set();
  for (let index = 0; index < count; index++) {
    if (offset + 46 > eocd || view.getUint32(offset, true) !== 0x02014b50) fail('El directorio interno del DOCX está dañado.');
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true), expanded = view.getUint32(offset + 24, true);
    const nameSize = view.getUint16(offset + 28, true), extraSize = view.getUint16(offset + 30, true), commentSize = view.getUint16(offset + 32, true);
    const next = offset + 46 + nameSize + extraSize + commentSize;
    if (next > eocd || compressed === 0xffffffff || expanded === 0xffffffff || view.getUint16(offset + 34, true)) fail('El DOCX contiene tamaños o registros internos inválidos.');
    if (flags & (1 | 0x40 | 0x2000)) fail('El DOCX está cifrado o protegido con contraseña. Usa una copia sin contraseña o pega el texto.');
    if (method !== 0 && method !== 8) fail('El DOCX utiliza un método de compresión no compatible. Guarda una copia nueva o pega el texto.');
    const rawName = bytes.subarray(offset + 46, offset + 46 + nameSize);
    const name = decode(rawName, flags & 0x800 ? 'utf-8' : 'windows-1252');
    safePath(name);
    if (names.has(name)) fail('El DOCX contiene rutas internas duplicadas y no se puede interpretar con seguridad.');
    names.add(name);
    if (((view.getUint32(offset + 38, true) >>> 16) & 0xf000) === 0xa000) fail('El DOCX contiene enlaces internos no compatibles.');
    total += expanded;
    if (compressed > MAX_FILE || total > MAX_EXPANDED) fail('El DOCX supera el límite de 4 MiB sin comprimir. Reduce su contenido o pega el texto.');
    if (method === 0 && compressed !== expanded) fail('El DOCX declara un tamaño incorrecto en un archivo sin compresión.');
    const local = view.getUint32(offset + 42, true);
    if (local + 30 > start || view.getUint32(local, true) !== 0x04034b50) fail('El DOCX tiene una cabecera interna inválida.');
    const localNameSize = view.getUint16(local + 26, true), localExtraSize = view.getUint16(local + 28, true);
    const dataStart = local + 30 + localNameSize + localExtraSize;
    if (dataStart + compressed > start || localNameSize !== nameSize
      || view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method
      || rawName.some((value, position) => value !== bytes[local + 30 + position])) {
      fail('Las cabeceras internas del DOCX no coinciden o están incompletas.');
    }
    const checksum = view.getUint32(offset + 16, true);
    if (!(flags & 8) && (view.getUint32(local + 14, true) !== checksum || view.getUint32(local + 18, true) !== compressed || view.getUint32(local + 22, true) !== expanded)) {
      fail('Los tamaños o la integridad interna del DOCX no coinciden.');
    }
    entries.push({name, method, checksum, compressed, expanded, dataStart});
    offset = next;
  }
  if (offset !== start + size) fail('El directorio interno del DOCX tiene datos inesperados.');
  const document = entries.find(entry => entry.name === 'word/document.xml');
  if (!document) fail('No se encontró word/document.xml. El archivo no parece ser un DOCX válido.');
  return document;
}

async function inflate(bytes, expected) {
  let stream;
  try {
    if (typeof DecompressionStream !== 'function') throw new Error();
    stream = new DecompressionStream('deflate-raw');
  } catch { fail('Este navegador no admite la descompresión local de este DOCX. Abre el documento y pega su texto, o guárdalo como TXT UTF-8.'); }
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_EXPANDED || length > expected) {
        await reader.cancel().catch(() => {});
        fail('El DOCX excede el tamaño declarado o el límite de 4 MiB sin comprimir.');
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error.message?.startsWith('El DOCX excede')) throw error;
    fail('No se pudo descomprimir el DOCX. Puede estar dañado; guarda una copia nueva o pega el texto.');
  } finally { reader.releaseLock(); }
  if (length !== expected) fail('El tamaño real del texto DOCX no coincide con el declarado.');
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

function xmlCodePoint(value) {
  return value === 9 || value === 10 || value === 13 || (value >= 32 && value <= 0xd7ff)
    || (value >= 0xe000 && value <= 0xfffd) || (value >= 0x10000 && value <= 0x10ffff);
}
function entities(value) {
  const named = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};
  return value.replace(/&([^;\s<&]*);|&/g, (full, entity) => {
    if (Object.hasOwn(named, entity)) return named[entity];
    const numeric = entity && /^(?:#\d+|#x[\da-f]+)$/i.test(entity);
    const number = numeric ? Number.parseInt(entity.slice(entity[1]?.toLowerCase() === 'x' ? 2 : 1), entity[1]?.toLowerCase() === 'x' ? 16 : 10) : NaN;
    if (!xmlCodePoint(number)) fail('El DOCX contiene entidades XML inválidas o no compatibles.');
    return String.fromCodePoint(number);
  });
}

// Node has no DOMParser. This bounded XML tokenizer is a test/runtime fallback, never an HTML sink.
function fallbackXml(xml) {
  const stack = [], output = [];
  let offset = 0, roots = 0, tokens = 0;
  const namePattern = '[A-Za-z_][A-Za-z0-9_.:-]*';
  const text = value => {
    if (!stack.length && value.trim()) fail('El DOCX tiene texto fuera del documento XML.');
    if (stack.some(node => node.word && node.local === 't') && !stack.some(node => node.word && node.local === 'del')) output.push(value);
  };
  while (offset < xml.length) {
    if (++tokens > 200000) fail('El XML del DOCX es demasiado complejo.');
    if (xml.startsWith('<!--', offset)) {
      const end = xml.indexOf('-->', offset + 4);
      if (end < 0 || xml.slice(offset + 4, end).includes('--')) fail('El DOCX contiene un comentario XML inválido.');
      offset = end + 3; continue;
    }
    if (xml.startsWith('<?', offset)) {
      const end = xml.indexOf('?>', offset + 2);
      if (end < 0) fail('La declaración XML del DOCX está incompleta.');
      offset = end + 2; continue;
    }
    if (xml.startsWith('<![CDATA[', offset)) {
      const end = xml.indexOf(']]>', offset + 9);
      if (end < 0 || !stack.length) fail('El DOCX contiene una sección XML inválida.');
      text(xml.slice(offset + 9, end)); offset = end + 3; continue;
    }
    if (xml[offset] !== '<') {
      const end = xml.indexOf('<', offset);
      const value = xml.slice(offset, end < 0 ? xml.length : end);
      if (value.includes(']]>')) fail('El DOCX contiene texto XML inválido.');
      text(entities(value)); offset = end < 0 ? xml.length : end; continue;
    }
    let end = offset + 1, quote = '';
    for (; end < xml.length; end++) {
      const char = xml[end];
      if (quote) { if (char === quote) quote = ''; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === xml.length || quote) fail('El DOCX contiene una etiqueta XML incompleta.');
    const tag = xml.slice(offset + 1, end);
    offset = end + 1;
    if (tag.startsWith('/')) {
      const match = new RegExp(`^/(${namePattern})\\s*$`).exec(tag);
      const node = stack.pop();
      if (!match || !node || node.name !== match[1]) fail('Las etiquetas XML del DOCX no coinciden.');
      if (node.word && node.local === 'p') output.push('\n');
      continue;
    }
    const match = new RegExp(`^(${namePattern})([\\s\\S]*?)(/?)$`).exec(tag);
    if (!match) fail('El DOCX contiene una etiqueta XML inválida.');
    const name = match[1], selfClosing = Boolean(match[3]);
    const attributes = Object.create(null), attributesText = match[2];
    let position = 0;
    while (position < attributesText.length) {
      if (!attributesText.slice(position).trim()) break;
      const attribute = new RegExp(`^\\s+(${namePattern})\\s*=\\s*(["'])([^]*?)\\2`).exec(attributesText.slice(position));
      if (!attribute || Object.hasOwn(attributes, attribute[1]) || attribute[3].includes('<')) fail('El DOCX contiene atributos XML inválidos.');
      attributes[attribute[1]] = entities(attribute[3]); position += attribute[0].length;
      if (Object.keys(attributes).length > 128) fail('El XML del DOCX es demasiado complejo.');
    }
    const namespace = {...(stack.at(-1)?.namespace || {})};
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'xmlns') namespace[''] = value;
      else if (key.startsWith('xmlns:')) namespace[key.slice(6)] = value;
    }
    const parts = name.split(':');
    if (parts.length > 2 || (parts.length === 2 && !Object.hasOwn(namespace, parts[0]))) fail('El DOCX contiene un prefijo XML no definido.');
    const local = parts.at(-1), word = WORD_NS.has(namespace[parts.length === 2 ? parts[0] : '']);
    if (!stack.length && (++roots !== 1 || !word || local !== 'document')) fail('El XML principal no es un documento Word válido.');
    if (word && (local === 'tab' || local === 'br' || local === 'cr')) output.push(local === 'tab' ? '\t' : '\n');
    if (selfClosing) { if (word && local === 'p') output.push('\n'); }
    else {
      stack.push({name, local, word, namespace});
      if (stack.length > 128) fail('El XML del DOCX tiene demasiados niveles de anidación.');
    }
  }
  if (stack.length || roots !== 1) fail('El XML principal del DOCX está incompleto.');
  return output.join('');
}

function documentText(xml) {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(xml) || /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) fail('El DOCX contiene XML inválido o entidades externas no admitidas.');
  if (typeof DOMParser !== 'function') return fallbackXml(xml);
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagNameNS('*', 'parsererror').length) fail('El XML principal del DOCX está dañado.');
  const root = document.documentElement;
  if (!root || root.localName !== 'document' || !WORD_NS.has(root.namespaceURI)) fail('El XML principal no es un documento Word válido.');
  const output = [], pending = [{node: root, closing: false, deleted: false}];
  let count = 0;
  while (pending.length) {
    if (++count > 200000) fail('El XML del DOCX es demasiado complejo.');
    const {node, closing, deleted} = pending.pop();
    const word = WORD_NS.has(node.namespaceURI);
    if (closing) { output.push('\n'); continue; }
    if (deleted || (word && node.localName === 'del')) continue;
    if (word && node.localName === 't') { output.push(node.textContent || ''); continue; }
    if (word && ['tab', 'br', 'cr'].includes(node.localName)) output.push(node.localName === 'tab' ? '\t' : '\n');
    if (word && node.localName === 'p') pending.push({node, closing: true});
    for (let index = node.childNodes.length - 1; index >= 0; index--) pending.push({node: node.childNodes[index], closing: false, deleted: false});
  }
  return output.join('');
}

async function readDocx(bytes) {
  const document = zipDirectory(bytes);
  const data = bytes.subarray(document.dataStart, document.dataStart + document.compressed);
  const xmlBytes = document.method === 0 ? data : await inflate(data, document.expanded);
  if (crc32(xmlBytes) !== document.checksum) fail('El DOCX no pasó la comprobación de integridad. Guarda una copia nueva o pega el texto.');
  const encoding = xmlBytes[0] === 0xff && xmlBytes[1] === 0xfe ? 'utf-16le' : xmlBytes[0] === 0xfe && xmlBytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  return documentText(decode(xmlBytes, encoding));
}

/** Always returns a result; failure has empty text and a Spanish extraction.error. */
export async function readCvFile(file) {
  const extension = typeof file?.name === 'string' ? /\.([^.]+)$/.exec(file.name.toLowerCase())?.[1] : '';
  const format = ['txt', 'docx', 'pdf'].includes(extension) ? extension : 'unknown';
  const extraction = {status: 'ok', format, imported: true, warnings: []};
  try {
    if (format === 'pdf') fail('La extracción de PDF no está disponible en este navegador. Abre el PDF, copia su texto y pégalo en el editor; si está escaneado, usa OCR primero.');
    if (format === 'unknown') fail('Formato no compatible. Selecciona un TXT UTF-8 o un DOCX, o pega el texto de tu CV.');
    if (!file || typeof file.arrayBuffer !== 'function') fail('No se pudo leer el archivo seleccionado. Vuelve a elegirlo.');
    if (file.size > MAX_FILE) fail('El archivo supera el límite de 2 MiB. Reduce su tamaño o pega el texto de tu CV.');
    let buffer;
    try { buffer = await file.arrayBuffer(); }
    catch { fail('No se pudo abrir el archivo. Vuelve a elegirlo o pega su texto.'); }
    if (!(buffer instanceof ArrayBuffer)) fail('No se pudo leer el contenido del archivo seleccionado.');
    const bytes = new Uint8Array(buffer);
    if (bytes.length > MAX_FILE) fail('El archivo supera el límite de 2 MiB. Reduce su tamaño o pega el texto de tu CV.');
    let text = format === 'txt' ? decode(bytes) : await readDocx(bytes);
    text = text.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n').trim();
    assertReadable(text);
    if (text.includes('\ufffd')) extraction.warnings.push('Se encontraron caracteres de sustitución. Compara las palabras afectadas con el original.');
    if (text.length < 80 || (text.match(/\p{L}{2,}/gu) || []).length < 12) extraction.warnings.push('Se extrajo poco texto. Revisa que el contenido del CV esté completo.');
    if (format === 'docx') extraction.warnings.push('Solo se importó el cuerpo principal del DOCX. Revisa encabezados, pies de página y otros elementos en el original.');
    if (extraction.warnings.length) extraction.status = 'warning';
    return {text, extraction};
  } catch (error) {
    return {text: '', extraction: {...extraction, status: 'error', error: error instanceof Error ? error.message : 'No se pudo extraer el texto del archivo. Copia y pega el contenido.'}};
  }
}
