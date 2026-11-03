/** Local emergency-CV workflow. No storage, network, generated career facts or licenses. */
const text = value => typeof value === 'string' ? value.trim() : '';
const normal = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const FIELDS = ['name','headline','email','phone','location','summary','skills','education'];
const LIMITS = {name:160,headline:180,email:160,phone:80,location:160,summary:2500,skills:2500,education:4000};
const EXP_LIMITS = {role:180,company:180,start:10,end:10,description:5000};
const SECTION = new Map([
 ['perfil profesional','summary'],['perfil','summary'],['resumen profesional','summary'],['resumen','summary'],['professional summary','summary'],['summary','summary'],['profile','summary'],
 ['experiencia profesional','experiences'],['experiencia laboral','experiences'],['experiencia','experiences'],['professional experience','experiences'],['work experience','experiences'],['experience','experiences'],
 ['competencias','skills'],['habilidades','skills'],['habilidades tecnicas','skills'],['skills','skills'],['technical skills','skills'],['core competencies','skills'],
 ['formacion','education'],['formacion academica','education'],['educacion','education'],['education','education'],['certificaciones','education'],['certifications','education'],
 ['proyectos','other'],['projects','other'],['idiomas','other'],['languages','other'],['referencias','other'],['references','other'],['publicaciones','other'],['publications','other'],
]);
const heading = value => SECTION.get(normal(value).replace(/[:\s]+$/g,''));
const EMAIL = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}/i;
const DATE_RANGE = /^(\d{4}(?:-(?:0[1-9]|1[0-2]))?)\s*(?:—|–|\s-\s|\s+a\s+|\s+to\s+)\s*(\d{4}(?:-(?:0[1-9]|1[0-2]))?|actualidad|actual|presente|present|current)$/i;
function safeText(value, max){
 if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value))throw new TypeError('CV_PROJECT_INVALID');
 return value.replace(/\r\n?/g,'\n').trim();
}

/** Conservative field proposal, never an automatic overwrite. Unassigned text remains visible. */
export function parseCvText(value=''){
 const source=safeText(value,48000);
 if(!source||/^(?:%PDF-|PK\u0003\u0004|\{\\rtf)/.test(source))throw new TypeError('CV_IMPORT_NOT_TEXT');
 const profile=Object.fromEntries(FIELDS.map(key=>[key,'']));profile.experiences=[];
 const sections={header:[],summary:[],skills:[],education:[],experiences:[],other:[]};let active='header';
 for(const line of source.split('\n').map(s=>s.trim()).filter(Boolean)){
  const section=heading(line);if(section){active=section;continue;}sections[active].push(line);
 }
 const unassigned=[];
 for(const line of sections.header){
  const email=line.match(EMAIL)?.[0];
  if(email&&!profile.email){profile.email=email;const rest=line.replace(email,'').replace(/^[\s·|,]+|[\s·|,]+$/g,'');if(rest)unassigned.push(rest);continue;}
  if(!profile.phone&&/^\+?[\d\s().-]{8,30}$/.test(line)&&line.replace(/\D/g,'').length>=8){profile.phone=line;continue;}
  if(!profile.name&&line.length<=160&&!/[\d@]/.test(line)){profile.name=line;continue;}
  if(profile.name&&!profile.headline&&line.length<=180){profile.headline=line;continue;}
  unassigned.push(line);
 }
 for(const key of ['summary','skills','education']){
  const joined=sections[key].join(key==='skills'?', ':'\n');
  if(joined.length<=LIMITS[key])profile[key]=joined;else unassigned.push(...sections[key]);
 }
 const exp=sections.experiences;let consumed=new Set();
 for(let i=1;i<exp.length;i++){
  const range=DATE_RANGE.exec(exp[i]);if(!range||consumed.has(i-1)||profile.experiences.length>=20)continue;
  const title=exp[i-1],parts=title.split(/\s+[|·]\s+/);if(title.length>360)continue;
  let end=exp.length;for(let j=i+1;j<exp.length;j++){if(DATE_RANGE.test(exp[j])){end=Math.max(i+1,j-1);break;}}
  const description=exp.slice(i+1,end).join('\n');if(description.length>5000)continue;
  const role=parts[0],company=parts.slice(1).join(' · ');if(role.length>180||company.length>180)continue;
  profile.experiences.push({role,company,start:range[1].length===4?'':range[1],end:range[2].length===4?'':/^\d/.test(range[2])?range[2]:'',current:!/^\d/.test(range[2]),description});
  for(let n=i-1;n<end;n++)consumed.add(n);
  if(range[1].length===4||range[2].length===4)unassigned.push(exp[i]); // Do not invent a missing month.
 }
 unassigned.push(...exp.filter((_,i)=>!consumed.has(i)),...sections.other);
 return {profile,unassigned:unassigned.join('\n'),detected:FIELDS.filter(key=>profile[key]).length,experienceCount:profile.experiences.length};
}

/** Joining visitor-authored facts is deliberately not a claim of AI generation. */
export function composeAchievement({action='',scope='',result=''}={}){
 const parts=[action,scope,result].map(value=>safeText(value,1200).replace(/\s+/g,' ')).filter(Boolean);
 if(!parts.length)return '';
 return parts.map(value=>value.replace(/[.;\s]+$/g,'')).filter(Boolean).join('. ')+'.';
}

export function readinessFor(profile={},jobText=''){
 const experience=(Array.isArray(profile.experiences)?profile.experiences:[]).filter(e=>text(e.role)||text(e.description));
 return [
  {id:'identity',pass:!!(text(profile.name)&&text(profile.headline))},
  {id:'contact',pass:!!(EMAIL.test(text(profile.email))||text(profile.phone).replace(/\D/g,'').length>=8)},
  {id:'summary',pass:text(profile.summary).split(/\s+/).filter(Boolean).length>=12},
  {id:'experience',pass:experience.length>0&&experience.every(e=>text(e.role)&&text(e.description)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(text(e.start))&&(e.current||(/^\d{4}-(0[1-9]|1[0-2])$/.test(text(e.end))&&e.end>=e.start)))},
  {id:'skills',pass:!!text(profile.skills)},
  {id:'vacancy',pass:!!text(jobText),optional:true},
 ];
}

/** Explicit portable backup. It contains personal data, but never payment credentials. */
export function parseCvProject(value){
 const input=typeof value==='string'?JSON.parse(safeText(value,500000)):value;
 if(!input||input.format!=='cyberserch-cv'||input.version!==1||!input.profile||!Array.isArray(input.jobs)||input.jobs.length!==3)throw new TypeError('CV_PROJECT_INVALID');
 const profile={};for(const key of FIELDS)profile[key]=safeText(input.profile[key]??'',LIMITS[key]);
 if(!Array.isArray(input.profile.experiences)||input.profile.experiences.length>20)throw new TypeError('CV_PROJECT_INVALID');
 profile.experiences=input.profile.experiences.map((e,i)=>{
  if(!e||typeof e.current!=='boolean')throw new TypeError('CV_PROJECT_INVALID');
  const entry={id:'restored-'+i,current:e.current};for(const key of Object.keys(EXP_LIMITS))entry[key]=safeText(e[key]??'',EXP_LIMITS[key]);
  return entry;
 });
 const template=['sobria','tecnica','ejecutiva'].includes(input.template)?input.template:'sobria';
 const language=input.language==='en'?'en':'es';
 const jobs=input.jobs.map(job=>{if(!job||typeof job!=='object')throw new TypeError('CV_PROJECT_INVALID');return {title:safeText(job.title??'',180),text:safeText(job.text??'',16000)};});
 return {format:'cyberserch-cv',version:1,profile,template,language,jobs,letter:safeText(input.letter??'',6000),source:safeText(input.source??'',48000),unassigned:safeText(input.unassigned??'',48000)};
}
export function buildCvProject(input){return JSON.stringify(parseCvProject({...input,format:'cyberserch-cv',version:1}),null,2);}
