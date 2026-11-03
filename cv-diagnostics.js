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

const ALIAS_EXPRESSIONS = new Map();
const MENTION_EXPRESSIONS = new Map();
const NEGATION_EXPRESSIONS = new WeakMap();
function aliasExpression(alias) {
  // Unicode boundaries avoid Java matching JavaScript, SQL matching MySQL, or JS matching a name.
  // A dot joining identifiers also matters: the "js" in Node.js is not a separate mention.
  if (!ALIAS_EXPRESSIONS.has(alias)) ALIAS_EXPRESSIONS.set(alias, new RegExp(`(^|[^\\p{L}\\p{N}_.])${escapeRegex(alias)}(?=$|[^\\p{L}\\p{N}_])(?!\\.[\\p{L}\\p{N}])`, 'u'));
  return ALIAS_EXPRESSIONS.get(alias);
}

function contains(text, alias) {
  // Most vocabulary entries are absent. Avoid compiling/executing a Unicode
  // boundary regex when the literal alias is not even a substring.
  return text.includes(alias) && aliasExpression(alias).test(text);
}

function skillIn(text, skill) {
  return skill.aliases.some(alias => contains(text, alias));
}

export const DIAGNOSTIC_LIMITS = Object.freeze({jobCharacters: 100000, fieldCharacters: 20000, experiences: 40, evidence: 120, excerptCharacters: 220});
function bounded(value, maximum) {
  const text = string(value);
  // Do not turn a truncated identifier (e.g. PythonLibrary) into a skill.
  return text.length <= maximum ? text : text.slice(0, maximum).replace(/\S+$/, '').trimEnd();
}
const splitClauses = value => string(value).split(/[;\r\n]+|[.!?](?=\s|$)/u).map(string).filter(Boolean);
const CONTRAST = /\b(?:pero|aunque|sin embargo|but|however|whereas|yet)\b/u;
const OPTIONAL = /\b(?:opcional(?:es)?|deseable(?:s)?|valorable(?:s)?|preferid[oa]s?|preferred|preferable|optional|desirable|desired|nice[- ]to[- ]have|bonus|plus|se valora(?:n|ra)?|valoramos|suma(?:n)? puntos)\b/u;
const MANDATORY = /\b(?:obligatori[oa]s?|indispensable(?:s)?|imprescindible(?:s)?|requerid[oa]s?|mandatory|required|essential|must[- ]have)\b/u;

function relevantJobClauses(jobText) {
  const lines = bounded(jobText, DIAGNOSTIC_LIMITS.jobCharacters).split(/[\r\n]+/);
  let benefits = false, optionalSection = false;
  const clauses = [];
  for (const line of lines) {
    const normalized = normalize(line);
    if (/^(?:beneficios|ofrecemos|te ofrecemos|prestaciones|que ofrecemos|benefits|we offer|perks)\s*(?:[:—-]|$)/.test(normalized)) benefits = true;
    if (/^(?:requisitos|responsabilidades|funciones|habilidades|conocimientos|perfil|buscamos|se requiere|necesitas|requirements|responsibilities|skills|qualifications|you need)\b/.test(normalized)) { benefits = false; optionalSection = false; }
    if (/^(?:requisitos\s+)?(?:opcionales|deseables|valorables|nice[- ]to[- ]have|(?:preferred|desired|optional)(?:\s+(?:qualifications|skills))?)\s*(?:[:—-]|$)/.test(normalized)) { benefits = false; optionalSection = true; }
    if (benefits || /^(?:ofrecemos|te ofrecemos|recibiras|obtendras|capacitacion gratuita|seguro de vida)\b/.test(normalized)) continue;
    for (const text of splitClauses(line)) clauses.push({text, normalized: normalize(text), optionalSection});
  }
  return clauses;
}

function negatedSkill(clause, skill) {
  if (!NEGATION_EXPRESSIONS.has(skill)) {
    const aliases = skill.aliases.map(escapeRegex).join('|');
    NEGATION_EXPRESSIONS.set(skill, [
      new RegExp(`(?:no\\s+(?:experience|knowledge)\\s+(?:in|of|with)|(?:do(?:es)?\\s+not|not)\\s+(?:require|need))\\s+(?:${aliases})(?=$|[^\\p{L}\\p{N}_])|(?:${aliases})\\s+(?:(?:is|experience is)\\s+)?not\\s+(?:required|necessary)\\b`, 'u'),
      new RegExp(`(?:no\\s+(?:(?:se\\s+)?(?:requiere|requieren|necesita|necesitan|solicita)|es\\s+(?:necesario|indispensable|obligatorio))|sin\\s+(?:experiencia|conocimientos?)\\s+(?:previa\\s+)?(?:en|de))\\s+(?:(?:dominio|experiencia|conocimientos?)\\s+(?:en|de)\\s+)?(?:${aliases})(?=$|[^\\p{L}\\p{N}_])`, 'u'),
      new RegExp(`(?:${aliases})\\s*[:—-]?\\s*no\\s+(?:es\\s+)?(?:requerido|necesario|indispensable|obligatorio)\\b`, 'u'),
    ]);
  }
  const expressions = NEGATION_EXPRESSIONS.get(skill);
  if (expressions[0].test(clause)) return true;
  const negativeGroup = /(?:no\s+(?:(?:se\s+)?(?:requiere|requieren|necesita|necesitan|solicita)|(?:requieres|necesitas)|es\s+(?:necesario|indispensable|obligatorio))|sin\s+(?:experiencia|conocimientos?))\b([^;.!?]*)/gu;
  for (const match of clause.matchAll(negativeGroup)) {
    const group = match[1].split(/\b(?:pero|aunque|sin embargo)\b/)[0];
    if (skillIn(group, skill)) return true;
  }
  // Exclude explicit nonrequirements without dropping other skills in the same sentence.
  return expressions[1].test(clause) || expressions[2].test(clause);
}

function skillMentions(text, skill) {
  const mentions = [];
  for (const alias of skill.aliases) {
    if (!text.includes(alias)) continue;
    if (!MENTION_EXPRESSIONS.has(alias)) MENTION_EXPRESSIONS.set(alias, new RegExp(aliasExpression(alias).source, 'gu'));
    // matchAll clones the regex and never advances this cached instance.
    const expression = MENTION_EXPRESSIONS.get(alias);
    for (const match of text.matchAll(expression)) {
      const start = match.index + match[1].length;
      if (!mentions.some(item => item.start === start)) mentions.push({start, end: start + alias.length});
    }
  }
  return mentions.sort((a, b) => a.start - b.start);
}

/** Optional wording is scoped, so "Python required, Docker preferred" keeps Python. */
function optionalSkill(clause, skill) {
  const text = clause.normalized;
  const mentions = skillMentions(text, skill);
  return mentions.every(mention => {
    const before = text.slice(0, mention.start), after = text.slice(mention.end);
    const mandatorySuffix = /^\s*(?:[(:—-]\s*)?(?:(?:is|are|es|son|sera|seran)\s+)?(?:required|mandatory|essential|obligatori[oa]s?|indispensable(?:s)?|requerid[oa]s?)\b/u;
    if (mandatorySuffix.test(after)) return false;
    const suffix = /^\s*(?:[(:—-]\s*)?(?:(?:is|are|would\s+be|could\s+be|experience\s+is|knowledge\s+is|es|son|sera|seran|seria)\s+)?(?:not\s+(?:required|necessary)|no\s+(?:es\s+)?(?:requerido|necesario|obligatorio)|opcional(?:es)?|deseable(?:s)?|valorable(?:s)?|preferid[oa]s?|preferred|optional|desirable|desired|(?:a|un)\s+(?:plus|bonus)|bonus|nice[- ]to[- ]have)\b/u;
    if (suffix.test(after)) return true;
    // A prefix such as "Deseable: Python y SQL" applies to its following list.
    const prefix = [...before.matchAll(new RegExp(OPTIONAL.source, 'gu'))].at(-1);
    if (prefix) {
      const scope = before.slice(prefix.index + prefix[0].length);
      if (!CONTRAST.test(scope) && !MANDATORY.test(scope) && !/[;.!?]/.test(scope)) return true;
    }
    // A plural trailing marker explicitly qualifies a whole preceding list.
    const trailing = /\b(?:opcionales|deseables|valorables|preferidos|preferidas)\b/u.exec(after);
    if (trailing && !CONTRAST.test(after.slice(0, trailing.index)) && !MANDATORY.test(after.slice(0, trailing.index))) return true;
    // Section headings persist until the next requirements heading, unless this
    // particular skill is explicitly mandatory.
    return clause.optionalSection;
  });
}

function jobSkillMatches(jobText) {
  const clauses = relevantJobClauses(jobText);
  return SKILLS.map((skill, order) => {
    const mentions = clauses.flatMap((clause, clauseIndex) => {
      if (!skillIn(clause.normalized, skill) || negatedSkill(clause.normalized, skill)) return [];
      return [{clause, clauseIndex, position: skillMentions(clause.normalized, skill)[0].start, optional: optionalSkill(clause, skill)}];
    });
    const mention = mentions.find(item => !item.optional) || mentions[0];
    return mention ? {skill, label: skill.label, order, ...mention} : null;
  }).filter(Boolean).sort((a, b) => a.clauseIndex - b.clauseIndex || a.position - b.position || a.order - b.order).slice(0, DIAGNOSTIC_LIMITS.evidence);
}

/** Returns canonical skill labels explicitly present in requirement text, in mention order. */
export function extractJobKeywords(jobText = '') {
  return jobSkillMatches(jobText).filter(item => !item.optional).map(item => item.label);
}

/** Negation describes only the current clause, never a person's actual ability. */
function affirmedCvSkill(clause, skill) {
  const text = normalize(clause);
  const parts = text.split(/\b(?:pero|aunque|sin embargo|but|however|whereas|yet)\b|(?:,\s*|\b(?:y|and)\s+)(?=(?:uso|utilizo|conozco|domino|manejo|trabajo|desarrolle|implemente|have\s+(?:used|experience)|i\s+(?:use|know|developed|built|have\s+experience))\b)/u);
  return parts.some(part => {
    if (!skillIn(part, skill)) return false;
    const mentions = skillMentions(part, skill);
    return mentions.some(({start, end}) => {
      const before = part.slice(0, start), after = part.slice(end);
      const negativePrefix = /\b(?:no\s+(?:(?:tengo|cuento\s+con|poseo|tenia|tuve)\s+(?:experiencia|conocimientos?|dominio|habilidad(?:es)?)|(?:he|habia)\s+(?:trabajado|utilizado|usado)|(?:se|conozco|domino|manejo|uso|utilizo))|(?:sin|carezco\s+de)\s+(?:experiencia|conocimientos?|dominio|habilidad(?:es)?)|nunca\s+(?:he\s+)?(?:trabaje|trabajado|utilice|utilizado|use|usado)|(?:have|has|had)\s+(?:no\s+(?:experience|knowledge|proficiency)|not\s+(?:used|worked|learned))|(?:no|lack(?:ed|ing)?)\s+(?:experience|knowledge|proficiency)|(?:do|does|did)\s+not\s+(?:know|use|have\s+(?:experience|knowledge))|(?:don['’]t|doesn['’]t|didn['’]t|haven['’]t|hasn['’]t|never)\s+(?:know|use|used|worked|work|have\s+experience)|not\s+(?:experienced|proficient|skilled|familiar))\b([^;.!?]*)$/u;
      const negative = negativePrefix.exec(before);
      if (negative && !/\b(?:no\s+solo|not\s+only)\b/u.test(negative[0])) return false;
      if (/\b(?:no|not)\s*$/u.test(before) && !/^\s*(?:only|solo)\b/u.test(after)) return false;
      if (/^\s*(?:[(:—-]\s*)?(?:(?:is|are|es)\s+)?(?:sin\s+(?:experiencia|conocimientos?)|no\s+(?:experience|knowledge)|not\s+(?:a\s+skill|experienced|proficient|known)|no\s+(?:(?:tengo|poseo)\s+(?:experiencia|conocimientos?)|(?:lo\s+)?(?:domino|conozco|manejo)))\b/u.test(after)) return false;
      if (/\b(?:quiero|deseo|planeo)\s+(?:aprender|estudiar)|\b(?:want|plan|hope)\s+to\s+learn/u.test(before)) return false;
      return true;
    });
  });
}

function currentProfileClauses(profile) {
  const fields = [profile.headline, profile.summary, profile.skills, profile.education,
    ...(Array.isArray(profile.experiences) ? profile.experiences.slice(0, DIAGNOSTIC_LIMITS.experiences) : []).flatMap(item => item && typeof item === 'object' ? [item.role, item.description] : []),
  ];
  // Keep the original affirmative fragment for evidence, not an earlier
  // negated mention of the same skill in a long, contrastive sentence.
  return fields.flatMap(value => splitClauses(bounded(value, DIAGNOSTIC_LIMITS.fieldCharacters)))
    .flatMap(value => value.split(/\b(?:pero|aunque|sin embargo|but|however|whereas|yet)\b|(?:,\s*|\b(?:y|and)\s+)(?=(?:uso|utilizo|conozco|domino|manejo|trabajo|desarroll[eé]|implement[eé]|have\s+(?:used|experience)|i\s+(?:use|know|developed|built|have\s+experience))\b)/iu).map(string).filter(Boolean));
}

function excerptFor(value, skill) {
  const text = string(value), maximum = DIAGNOSTIC_LIMITS.excerptCharacters;
  if (text.length <= maximum) return text;
  const position = skillMentions(normalize(text), skill)[0]?.start || 0;
  const start = Math.max(0, Math.min(text.length - maximum, position - Math.floor(maximum / 3)));
  return text.slice(start, start + maximum);
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
const METRICS = /(?:\d[\d.,]*\s*(?:%|(?:por ciento|percent|mxn|usd|eur|pesos|dolares|euros)\b)|[$€]\s*\d)|\b(?:\d[\d.,]*|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|cien|one|two|three|four|five|six|seven|eight|nine|ten|hundred)\s*(?:horas?|minutos?|dias?|semanas?|meses?|anos?|clientes?|usuarios?|personas?|colaboradores?|empleados?|proyectos?|cuentas?|tickets?|casos?|solicitudes?|pedidos?|ventas?|sucursales?|equipos?|reportes?|registros?|unidades?|productos?|procesos?|eventos?|pacientes?|alumnos?|proveedores?|sistemas?|servidores?|campanas?|hours?|minutes?|days?|weeks?|months?|years?|clients?|customers?|users?|people|employees?|projects?|accounts?|cases?|requests?|orders?|sales|branches|teams?|reports?|records?|units?|products?|processes|events?|patients?|students?|suppliers?|systems?|servers?|campaigns?)\b/u;

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
 * @returns {{findings: object[], keywords: string[], matchedKeywords: string[], missingKeywords: string[], optionalKeywords: string[], evidence: object[], extraction: object}}
 */
export function analyzeCv({profile = {}, jobText = '', sourceText = '', extraction} = {}) {
  profile = profile && typeof profile === 'object' ? profile : {};
  const quality = extractionQuality(sourceText, extraction);
  const findings = [...quality.issues];
  const jobSkills = jobSkillMatches(jobText);
  const required = jobSkills.filter(item => !item.optional);
  const keywords = required.map(item => item.label);
  const optionalKeywords = jobSkills.filter(item => item.optional).map(item => item.label);
  // Only current, edited professional fields can establish a lexical match.
  // An imported original, contact address or employer's name is not evidence.
  const profileClauses = currentProfileClauses(profile);
  const evidence = required.map(({skill, label, clause}) => {
    const affirmative = profileClauses.find(text => affirmedCvSkill(text, skill));
    const mention = affirmative || profileClauses.find(text => skillIn(normalize(text), skill));
    return {keyword: label, matched: Boolean(affirmative), jobExcerpt: excerptFor(clause.text, skill), cvExcerpt: mention ? excerptFor(mention, skill) : '', status: affirmative ? 'matched' : 'missing'};
  });
  const matchedKeywords = evidence.filter(item => item.matched).map(item => item.keyword);
  const missingKeywords = keywords.filter(label => !matchedKeywords.includes(label));
  missingKeywords.forEach(keyword => findings.push({
    id: `keyword:${slug(keyword)}`, type: 'keyword', severity: 'info', keyword,
    titleKey: 'cvQ_keywordTitle', detailKey: 'cvQ_keywordDetail', params: {x: keyword},
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
  // These observations inspect only entered text. They do not predict hiring or
  // invent a missing result simply to fill a fixed marketing quota.
  if (!string(jobText)) {
    const summary = string(profile.summary);
    if (!summary || !METRICS.test(normalize(summary))) findings.push({id:'profile:summary:scope',type:'profile',severity:'info',targetField:'summary',messageKey:'cvF_blindSummary',params:{},titleKey:'cvF_profileCheck',detailKey:'cvF_blindSummary'});
    const skills = string(profile.skills).split(/[,;\n]/).map(normalize).filter(Boolean);
    const generic = /^(?:responsable|puntual|proactivo|proactiva|trabajo en equipo|liderazgo|comunicacion|teamwork|leadership|communication|hardworking|reliable|proactive|responsibility)$/u;
    if (!skills.length || skills.every(skill=>generic.test(skill))) findings.push({id:'profile:skills:generic',type:'profile',severity:'info',targetField:'skills',messageKey:'cvF_blindSkills',params:{},titleKey:'cvF_profileCheck',detailKey:'cvF_blindSkills'});
    if (!(Array.isArray(profile.experiences) && profile.experiences.some(item=>item && [item.role,item.company,item.description].some(string)))) findings.push({id:'profile:experience:missing',type:'profile',severity:'info',targetField:'experience',messageKey:'cvF_blindExperience',params:{},titleKey:'cvF_profileCheck',detailKey:'cvF_blindExperience'});
  }
  const blindSpots = collectBlindSpots({findings, profile, hasVacancy:Boolean(string(jobText))});
  const {issues, ...extractionResult} = quality;
  return {findings, keywords, matchedKeywords, missingKeywords, optionalKeywords, evidence, blindSpots, extraction: extractionResult};
}

/** Pure, language-neutral, bounded observations suitable for translated UI. */
export function collectBlindSpots({findings=[],profile={},hasVacancy=false}={}) {
  const result=[], seen=new Set();
  const add=(id,key,params={})=>{if(!seen.has(id)){seen.add(id);result.push({id,key,params});}};
  // Extraction is critical: do not imply a reliable diagnosis of unreadable text.
  for(const f of findings.filter(f=>f.type==='extraction')) add('extraction','cvF_blindExtraction');
  if(hasVacancy) for(const f of findings.filter(f=>f.type==='keyword')) add(f.id,'cvQ_blindKeywordEvidence',{x:f.keyword});
  for(const f of findings.filter(f=>f.type==='date')) {
    const experience=(Array.isArray(profile.experiences)?profile.experiences:[]).find(item=>item?.id===f.experienceId);
    add('date:'+f.experienceId,'cvF_blindDate',{y:string(experience?.role)||string(experience?.company)});
  }
  for(const f of findings.filter(f=>f.type==='description' && (f.id.endsWith(':action')||f.id.endsWith(':metrics')))) {
    const experience=(Array.isArray(profile.experiences)?profile.experiences:[]).find(item=>item?.id===f.experienceId);
    const actionIssue=findings.some(item=>item.experienceId===f.experienceId&&item.id.endsWith(':action'));
    const metricIssue=findings.some(item=>item.experienceId===f.experienceId&&item.id.endsWith(':metrics'));
    add('impact:'+f.experienceId,actionIssue&&metricIssue?'cvF_blindImpact':actionIssue?'cvF_blindAction':'cvF_blindMetric',{y:string(experience?.role)||string(experience?.company)});
  }
  for(const f of findings.filter(f=>f.type==='profile')) add(f.id,f.messageKey,f.params);
  return result.slice(0,hasVacancy?5:3);
}

/** Stable UI keys. Never translate, parse or rewrite a visitor's experience text. */
export function findingPresentation(finding={},profile={}) {
  if(finding.titleKey&&finding.detailKey)return {titleKey:finding.titleKey,detailKey:finding.detailKey,params:{...finding.params}};
  const experiences=Array.isArray(profile.experiences)?profile.experiences:[];
  const index=experiences.findIndex(item=>item?.id===finding.experienceId),experience=experiences[index];
  const params={x:string(finding.keyword),y:string(experience?.role)||string(experience?.company),n:index+1};
  const code=string(finding.id).split(':').at(-1);
  const known={date:['missing-start','invalid-start','missing-end','invalid-end','order'],description:['short','action','metrics'],extraction:['failed','binary','control','encoding','insufficient','review']};
  const base=finding.type==='keyword'?'cvF_find_keyword':Object.hasOwn(known,finding.type)&&known[finding.type].includes(code)?`cvF_find_${finding.type}_${code.replace(/-/g,'_')}`:'cvF_find_generic';
  return {titleKey:base+'_title',detailKey:base+'_detail',params};
}
