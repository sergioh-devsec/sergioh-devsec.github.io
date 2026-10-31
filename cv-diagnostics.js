/** Local, deterministic CV checks. Findings describe text, never an ATS score. */
const string = value => typeof value === 'string' ? value.trim() : '';
const normalize = value => string(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const slug = value => normalize(value).replace(/[^a-z0-9+#.]+/g, '-').replace(/^-|-$/g, '');
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A small vocabulary is more conservative than treating every word in an ad as a skill.
// Aliases are lexical equivalents; related skills (e.g. Java/JavaScript) stay separate.
const SKILLS = [
  ['Excel', 'Microsoft Excel', 'MS Excel'], ['Word', 'Microsoft Word', 'MS Word'],
  ['PowerPoint', 'Microsoft PowerPoint'], ['Microsoft Office', 'MS Office', 'ofimatica'],
  ['Google Workspace', 'G Suite'], ['Google Sheets', 'hojas de calculo de Google'],
  ['Power BI', 'PowerBI'], ['Tableau'], ['SQL'], ['MySQL'], ['PostgreSQL', 'Postgres'],
  ['SQLite'], ['MongoDB'], ['Python'], ['JavaScript', 'Javascript', 'JS'], ['TypeScript', 'TS'],
  ['Java'], ['C#', 'C sharp'], ['C++', 'CPP'], ['.NET', 'dotnet', 'ASP.NET'], ['PHP'], ['Ruby'],
  ['HTML', 'HTML5'], ['CSS', 'CSS3'], ['React', 'React.js', 'ReactJS'], ['Angular'],
  ['Vue', 'Vue.js', 'VueJS'], ['Node.js', 'NodeJS', 'Node JS'], ['Django'], ['Laravel'],
  ['Git'], ['GitHub'], ['GitLab'], ['Docker'], ['Kubernetes', 'K8s'], ['Linux'], ['Windows'],
  ['AWS', 'Amazon Web Services'], ['Azure', 'Microsoft Azure'], ['Google Cloud', 'GCP'],
  ['Terraform'], ['CI/CD', 'CI CD', 'integracion continua'], ['REST', 'API REST', 'RESTful'],
  ['GraphQL'], ['Figma'], ['Photoshop', 'Adobe Photoshop'], ['Illustrator', 'Adobe Illustrator'],
  ['InDesign', 'Adobe InDesign'], ['AutoCAD'], ['SolidWorks'], ['Revit'], ['BIM'],
  ['Diseño UX', 'UX', 'experiencia de usuario'], ['Diseño UI', 'UI', 'interfaz de usuario'],
  ['Pruebas de software', 'software testing', 'QA testing'], ['Selenium'], ['Cypress'], ['Playwright'],
  ['Scrum'], ['Kanban'], ['Agile', 'metodologia agil', 'metodologias agiles'], ['Jira'], ['Trello'],
  ['Gestión de proyectos', 'gestion proyectos', 'project management'],
  ['Análisis de datos', 'analisis datos', 'data analysis', 'analitica de datos'],
  ['Visualización de datos', 'data visualization'], ['Estadística', 'statistics'],
  ['Machine learning', 'aprendizaje automatico'], ['Inteligencia artificial', 'artificial intelligence'],
  ['Ciberseguridad', 'seguridad informatica', 'cybersecurity'], ['Redes informáticas', 'redes de datos', 'redes de computadoras', 'redes LAN', 'redes WAN', 'networking'],
  ['Soporte técnico', 'soporte IT', 'soporte TI', 'technical support'],
  ['Atención al cliente', 'atencion a clientes', 'atencion a cliente', 'atencion de clientes', 'servicio al cliente', 'servicio a clientes', 'customer service', 'customer support'],
  ['Ventas', 'sales', 'venta'], ['Prospección', 'prospeccion comercial'], ['Negociación', 'negotiation'],
  ['CRM', 'customer relationship management'], ['Salesforce'], ['HubSpot'], ['SAP'], ['ERP'],
  ['Contabilidad', 'accounting'], ['Facturación', 'facturacion electronica'], ['Nómina', 'nominas', 'payroll'],
  ['Conciliaciones bancarias', 'conciliacion bancaria'], ['Finanzas', 'finance'], ['Presupuestos', 'budgeting'],
  ['Inventarios', 'inventario', 'control de inventarios'], ['Logística', 'logistics'], ['Compras', 'procurement'],
  ['Cadena de suministro', 'supply chain'], ['Gestión de almacén', 'gestion de almacenes', 'warehouse management'],
  ['Marketing digital', 'digital marketing'], ['SEO', 'search engine optimization'], ['SEM'],
  ['Google Ads', 'AdWords'], ['Meta Ads', 'Facebook Ads'], ['Google Analytics', 'GA4'],
  ['Redes sociales', 'social media'], ['Email marketing'], ['Copywriting', 'redaccion publicitaria'],
  ['Reclutamiento', 'recruitment'], ['Selección de personal', 'seleccion personal'],
  ['Recursos humanos', 'RRHH', 'RR. HH.', 'human resources'], ['Capacitación', 'formacion de personal'],
  ['Liderazgo', 'leadership'], ['Trabajo en equipo', 'teamwork'], ['Comunicación', 'communication'],
  ['Resolución de problemas', 'solucion de problemas', 'problem solving'], ['Inglés', 'English'],
  ['Francés', 'French'], ['Alemán', 'German'], ['Portugués', 'Portuguese'],
  ['Enfermería', 'nursing'], ['Primeros auxilios', 'first aid'], ['RCP', 'reanimacion cardiopulmonar'],
  ['Expediente clínico', 'expedientes clinicos'], ['Seguridad e higiene', 'seguridad industrial'],
  ['Control de calidad', 'quality control'], ['ISO 9001'], ['Lean manufacturing', 'manufactura esbelta'],
  ['Six Sigma', 'seis sigma'], ['CNC'], ['Soldadura', 'welding'], ['Lectura de planos'],
].map(([label, ...aliases]) => ({label, aliases: [...new Set([label, ...aliases].map(normalize))]}));

function aliasExpression(alias) {
  // Unicode boundaries avoid Java matching JavaScript, SQL matching MySQL, or JS matching a name.
  // A dot joining identifiers also matters: the "js" in Node.js is not a separate mention.
  return new RegExp(`(^|[^\\p{L}\\p{N}_.])${escapeRegex(alias)}(?=$|[^\\p{L}\\p{N}_])(?!\\.[\\p{L}\\p{N}])`, 'u');
}

function contains(text, alias) {
  return aliasExpression(alias).test(text);
}

function skillIn(text, skill) {
  return skill.aliases.some(alias => contains(text, alias));
}

function relevantJobClauses(jobText) {
  const lines = string(jobText).split(/[\r\n]+/);
  let benefits = false;
  const clauses = [];
  for (const line of lines) {
    const normalized = normalize(line);
    if (/^(?:beneficios|ofrecemos|te ofrecemos|prestaciones|que ofrecemos)\s*(?:[:—-]|$)/.test(normalized)) benefits = true;
    if (/^(?:requisitos|responsabilidades|funciones|habilidades|conocimientos|perfil|buscamos|se requiere|necesitas)\b/.test(normalized)) benefits = false;
    if (benefits || /^(?:ofrecemos|te ofrecemos|recibiras|obtendras|capacitacion gratuita|seguro de vida)\b/.test(normalized)) continue;
    for (const clause of normalized.split(/[;.!?](?:\s+|$)/)) {
      if (clause) clauses.push(clause);
    }
  }
  return clauses;
}

function negatedSkill(clause, skill) {
  const aliases = skill.aliases.map(escapeRegex).join('|');
  const negativeGroup = /(?:no\s+(?:(?:se\s+)?(?:requiere|requieren|necesita|necesitan|solicita)|(?:requieres|necesitas)|es\s+(?:necesario|indispensable|obligatorio))|sin\s+(?:experiencia|conocimientos?))\b([^;.!?]*)/gu;
  for (const match of clause.matchAll(negativeGroup)) {
    const group = match[1].split(/\b(?:pero|aunque|sin embargo)\b/)[0];
    if (skillIn(group, skill)) return true;
  }
  // Exclude explicit nonrequirements without dropping other skills in the same sentence.
  return new RegExp(`(?:no\\s+(?:(?:se\\s+)?(?:requiere|requieren|necesita|necesitan|solicita)|es\\s+(?:necesario|indispensable|obligatorio))|sin\\s+(?:experiencia|conocimientos?)\\s+(?:previa\\s+)?(?:en|de))\\s+(?:(?:dominio|experiencia|conocimientos?)\\s+(?:en|de)\\s+)?(?:${aliases})(?=$|[^\\p{L}\\p{N}_])`, 'u').test(clause)
    || new RegExp(`(?:${aliases})\\s*[:—-]?\\s*(?:no\\s+(?:es\\s+)?(?:requerido|necesario|indispensable|obligatorio)|opcional)\\b`, 'u').test(clause);
}

/** Returns canonical skill labels explicitly present in requirement text, in mention order. */
export function extractJobKeywords(jobText = '') {
  const clauses = relevantJobClauses(jobText);
  return SKILLS.map((skill, order) => {
    const clauseIndex = clauses.findIndex(clause => skillIn(clause, skill) && !negatedSkill(clause, skill));
    if (clauseIndex < 0) return null;
    const position = Math.min(...skill.aliases.map(alias => {
      const match = aliasExpression(alias).exec(clauses[clauseIndex]);
      return match ? match.index : Infinity;
    }));
    return {label: skill.label, clauseIndex, position, order};
  }).filter(Boolean).sort((a, b) => a.clauseIndex - b.clauseIndex || a.position - b.position || a.order - b.order).map(skill => skill.label);
}

/** Flattens only current profile values; the imported source never masks later edits. */
export function flattenProfile(profile = {}) {
  profile = profile && typeof profile === 'object' ? profile : {};
  return [profile.name, profile.headline, profile.summary, profile.email, profile.phone, profile.location,
    profile.skills, profile.education,
    ...(Array.isArray(profile.experiences) ? profile.experiences : []).flatMap(experience => experience && typeof experience === 'object'
      ? [experience.role, experience.company, experience.start, experience.current ? 'Actualidad' : experience.end, experience.description] : []),
  ].map(string).filter(Boolean).join('\n');
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function dateValue(value, end = false) {
  const text = normalize(value);
  let match, year, month, day;
  if ((match = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(text))) {
    year = Number(match[1]); month = match[2] ? Number(match[2]) : (end ? 12 : 1); day = match[3] ? Number(match[3]) : null;
  } else if ((match = /^(\d{1,2})\/(\d{4})$/.exec(text))) {
    month = Number(match[1]); year = Number(match[2]);
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text))) {
    day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
  } else if ((match = /^([a-z]+)\.?\s+(?:de\s+)?(\d{4})$/.exec(text))) {
    const index = MONTHS.findIndex(label => label === match[1] || label.slice(0, 3) === match[1]);
    month = index + 1; year = Number(match[2]);
  } else return null;
  if (year < 1900 || year > 2200 || month < 1 || month > 12) return null;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day != null && (day < 1 || day > days)) return null;
  return year * 10000 + month * 100 + (day == null ? (end ? days : 1) : day);
}
const present = value => /^(?:actualidad|actual|presente|actualmente|hoy|present|current|a la fecha)$/.test(normalize(value));

const ACTION_ROOTS = ['administr', 'analiz', 'aplic', 'apoy', 'asesor', 'automatiz', 'capacit', 'colabor', 'comunic', 'configur', 'control', 'coordin', 'cre', 'desarroll', 'detect', 'disen', 'document', 'ejecut', 'elabor', 'entreg', 'evalu', 'gestion', 'implement', 'instal', 'integr', 'lider', 'mejor', 'migr', 'negoci', 'oper', 'optimiz', 'organiz', 'planific', 'prepar', 'present', 'proces', 'program', 'realiz', 'recuper', 'revis', 'supervis', 'trabaj', 'valid'];
const ACTIONS = new RegExp(`\\b(?:${ACTION_ROOTS.join('|')})(?:ar|o|as|a|amos|an|e|aste|aron|aba|abas|abamos|aban|are|aras|ara|aremos|aran|ando|ado|ada|ados|adas|es|en|emos)\\b|\\b(?:analice|aplique|automatice|organice|optimice|planifique|atiendo|atendi|atendia|atender|atiende|atendemos|atendiendo|resolvi|resolvia|resolver|resuelvo|resuelve|reduje|reducia|reducir|reduzco|mantengo|mantuve|mantenia|mantener|dirigi|dirigia|dirigir|dirijo|produje|producir|hice|hacer|brinde|brindo|brindar|vendia|vendi|vender|vendo|escribi|escribir|escribo|construi|construir|construyo|managed|led|built|developed|created|designed|implemented|improved|supported|delivered|analyzed|coordinated|reduced|increased)\\b`, 'u');
const METRICS = /(?:\d[\d.,]*\s*(?:%|(?:por ciento|mxn|usd|eur|pesos|dolares|euros)\b)|[$€]\s*\d)|\b(?:\d[\d.,]*|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|cien)\s*(?:horas?|minutos?|dias?|semanas?|meses?|clientes?|usuarios?|personas?|colaboradores?|empleados?|proyectos?|cuentas?|tickets?|casos?|solicitudes?|pedidos?|ventas?|sucursales?|equipos?|reportes?|registros?|unidades?|productos?|procesos?|eventos?|pacientes?|alumnos?|proveedores?|sistemas?|servidores?|campanas?)\b/u;

/** Conservative wording edits: no added employers, skills, results, quantities or benefits. */
export function improveActionText(value = '') {
  const replacements = [
    [/^atencion (?:a|al) cliente\b/i, 'Atender al cliente'],
    [/^gestion de\b/i, 'Gestionar'], [/^control de\b/i, 'Controlar'],
    [/^elaboracion de\b/i, 'Elaborar'], [/^desarrollo de\b/i, 'Desarrollar'],
    [/^coordinacion de\b/i, 'Coordinar'], [/^analisis de\b/i, 'Analizar'],
  ];
  return string(value).split(/\r?\n/).map(line => {
    let text = line.replace(/^\s*(?:[•*-]\s*)?/, '').replace(/\s+/g, ' ').trim();
    text = text.replace(/^(?:responsable de|me encargaba de|mis funciones (?:incluian|incluían|eran))\s+(?=[a-záéíóúñ]+(?:ar|er|ir)\b)/i, '');
    const plain = normalize(text);
    const replacement = replacements.find(([pattern]) => pattern.test(plain));
    if (replacement) {
      const prefix = replacement[0].exec(plain)[0];
      text = replacement[1] + text.slice(prefix.length);
    }
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  }).filter(Boolean).join('\n');
}

function extractionQuality(sourceText, extraction) {
  const source = string(sourceText);
  const metadata = extraction && typeof extraction === 'object' ? extraction : {};
  const imported = Boolean(source || Object.keys(metadata).length);
  const letters = source.match(/\p{L}/gu) || [];
  const words = source.match(/\p{L}{2,}/gu) || [];
  const issues = [];
  const add = (reason, severity, title, detail) => issues.push({id: `extraction:${reason}`, type: 'extraction', severity, title, detail});
  if (!imported) return {status: 'none', reason: '', readableCharacters: 0, issues};
  if (metadata.status === 'error' || metadata.success === false || metadata.error) {
    add('failed', 'error', 'No se pudo completar la extracción', 'Revisa el archivo original y vuelve a importarlo, o pega su texto legible.');
  }
  if (/^(?:%PDF-|PK\u0003\u0004|\{\\rtf)/.test(source) || /\b(?:endstream|xref)\b[\s\S]*\b(?:endobj|trailer)\b/.test(source)) {
    add('binary', 'error', 'El contenido parece ser un archivo sin extraer', 'Se detectaron marcas internas de un archivo, no texto de un CV. Vuelve a importar el documento con el formato correcto.');
  }
  const controls = (source.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g) || []).length;
  if (controls) add('control', controls > 2 || source.includes('\u0000') ? 'error' : 'warning', 'Hay caracteres de control en el texto', 'La extracción contiene caracteres que no forman parte del texto normal. Compara los campos con el documento original.');
  if (source.includes('\ufffd') || /(?:Ã[\u0080-\u00bf]|Â[\u0080-\u00bf])/.test(source)) {
    add('encoding', 'warning', 'Hay caracteres que requieren revisión', 'Se detectaron caracteres de sustitución o señales de codificación dañada. Corrige las palabras afectadas comparando con el original.');
  }
  if (source.length < 80 || words.length < 12 || letters.length < 50 || (source.length > 100 && letters.length / source.length < 0.3)) {
    add('insufficient', 'warning', 'El texto extraído es insuficiente', 'Hay poco texto legible para revisar el CV completo. Un PDF escaneado puede necesitar OCR; también puedes pegar el texto o completar los campos manualmente.');
  }
  if ((metadata.status === 'warning' || (Array.isArray(metadata.warnings) && metadata.warnings.length)) && !issues.length) {
    add('review', 'warning', 'Revisa los datos importados', 'El importador indicó que algunos datos necesitan revisión. Compara el perfil con el documento original antes de descargarlo.');
  }
  return {status: issues.some(issue => issue.severity === 'error') ? 'error' : issues.length ? 'warning' : 'good', reason: issues[0]?.id.slice(11) || '', readableCharacters: letters.length, issues};
}

/**
 * @param {{profile?: object, jobText?: string, sourceText?: string, extraction?: object}} input
 * @returns {{findings: object[], keywords: string[], matchedKeywords: string[], missingKeywords: string[], extraction: object}}
 */
export function analyzeCv({profile = {}, jobText = '', sourceText = '', extraction} = {}) {
  profile = profile && typeof profile === 'object' ? profile : {};
  const quality = extractionQuality(sourceText, extraction);
  const findings = [...quality.issues];
  const keywords = extractJobKeywords(jobText);
  // Contact details and the person's name cannot establish a professional skill.
  const evidence = normalize(flattenProfile({...profile, name: '', email: '', phone: '', location: ''}));
  const matchedKeywords = keywords.filter(label => skillIn(evidence, SKILLS.find(skill => skill.label === label)));
  const missingKeywords = keywords.filter(label => !matchedKeywords.includes(label));
  missingKeywords.forEach(keyword => findings.push({
    id: `keyword:${slug(keyword)}`, type: 'keyword', severity: 'info', keyword,
    title: `Revisa «${keyword}»`,
    detail: `La vacante menciona «${keyword}» y no aparece en los campos actuales de tu CV. Añádelo solo si puedes respaldarlo con tu experiencia.`,
    suggestion: `Si dominas ${keyword}, descríbelo con tus palabras en Habilidades y confirma el cambio.`,
  }));
  (Array.isArray(profile.experiences) ? profile.experiences : []).forEach((experience, index) => {
    if (!experience || typeof experience !== 'object' || ![experience.role, experience.company, experience.start, experience.end, experience.description].some(string)) return;
    const experienceId = string(experience.id) || `experience-${index + 1}`;
    const label = string(experience.role) || string(experience.company) || `Experiencia ${index + 1}`;
    const add = (type, code, severity, title, detail, suggestion) => findings.push({id: `${type}:${experienceId}:${code}`, type, severity, title, detail, experienceId, ...(suggestion ? {suggestion} : {})});
    const start = string(experience.start), end = string(experience.end);
    const ongoing = experience.current === true || present(end);
    const startValue = start ? dateValue(start) : null;
    const endValue = end && !ongoing ? dateValue(end, true) : null;
    if (!start) add('date', 'missing-start', 'warning', `Falta la fecha de inicio: ${label}`, 'Añade al menos el año de inicio de esta experiencia.');
    else if (startValue == null) add('date', 'invalid-start', 'warning', `Revisa la fecha de inicio: ${label}`, 'Usa una fecha válida: AAAA, AAAA-MM, MM/AAAA o mes y año.');
    if (!end && !ongoing) add('date', 'missing-end', 'warning', `Falta la fecha de cierre: ${label}`, 'Añade el cierre o marca que actualmente trabajas aquí.');
    else if (!ongoing && endValue == null) add('date', 'invalid-end', 'warning', `Revisa la fecha de cierre: ${label}`, 'Usa una fecha válida o marca esta experiencia como actual.');
    if (startValue != null && endValue != null && startValue > endValue) add('date', 'order', 'error', `Las fechas están invertidas: ${label}`, 'La fecha de cierre debe ser igual o posterior a la de inicio. Comprueba ambas fechas en el documento original.');
    const description = string(experience.description), normalized = normalize(description);
    const wordCount = (description.match(/\p{L}[\p{L}\p{N}'’-]*/gu) || []).length;
    if (wordCount < 10 || description.length < 60) add('description', 'short', 'info', `Amplía la descripción: ${label}`, 'Esta descripción tiene poco contexto. Explica qué hacías, con qué herramientas y para quién, usando solo información real.');
    if (description && !ACTIONS.test(normalized)) add('description', 'action', 'info', `Describe tus acciones: ${label}`, 'No se reconoció un verbo de acción. Revisa si puedes expresar una función concreta con verbos como «atender», «coordinar» o «desarrollar».', improveActionText(description) !== description ? improveActionText(description) : 'Escribe una acción que realmente hayas realizado; conserva su alcance original.');
    if (description && !METRICS.test(normalized)) add('description', 'metrics', 'info', `Revisa el alcance de tu trabajo: ${label}`, 'No se reconocieron cifras de alcance o resultados. Si cuentas con datos verificables, puedes indicar volumen, frecuencia o tamaño del equipo; no es obligatorio tener métricas en todos los puestos.', 'Añade solo cifras que puedas verificar. También puedes describir el alcance con contexto sin inventar resultados.');
  });
  const {issues, ...extractionResult} = quality;
  return {findings, keywords, matchedKeywords, missingKeywords, extraction: extractionResult};
}
