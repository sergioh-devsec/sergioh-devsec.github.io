/* Browser-only tools. No SDK, document upload, network request or persistent document storage. */
(() => {
'use strict';
const MAX_LOG=2_000_000,MAX_CSV=20_000;
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
function bounded(text,max){if(typeof text!=='string'||new TextEncoder().encode(text).length>max)throw Error('El archivo supera el tamaño permitido.');if(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))throw Error('Usa un archivo de texto UTF-8, no un documento binario.');}
function parseCSV(text){
 bounded(text,MAX_CSV);text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
 function field(){row.push(cell);cell='';closed=false;}function line(){field();if(row.some(x=>x.trim()))rows.push(row);row=[];}
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
 if(c==='"'){if(cell||closed)throw Error('Comillas CSV inválidas.');quoted=true;}
 else if(c===',')field();else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line();}
 else{if(closed)throw Error('Texto fuera de comillas CSV.');cell+=c;}}
 if(quoted)throw Error('Hay una celda con comillas sin cerrar.');if(cell||row.length||closed)line();return rows;
}
function organize(text){
 const rows=parseCSV(text),header=(rows.shift()||[]).map(norm).join(',');
 if(!['tarea,responsable,prioridad,fecha,estado','task,owner,priority,due,status'].includes(header))throw Error('Encabezado requerido: tarea,responsable,prioridad,fecha,estado');
 if(rows.length>200)throw Error('Máximo 200 tareas.');const result={total:rows.length,duplicates:0,completed:0,invalid:[],tasks:[]},seen=new Set();
 const priorities={alta:0,high:0,media:1,medium:1,baja:2,low:2},statuses={pendiente:'todo',todo:'todo','en curso':'doing',doing:'doing',completada:'done',done:'done'};
 rows.forEach((row,i)=>{const [task='',owner='',p='',due='',s='']=row.map(x=>x.trim()),priority=priorities[norm(p)],status=statuses[norm(s)];
 const date=/^\d{4}-\d{2}-\d{2}$/.test(due)?new Date(due+'T00:00:00Z'):null;
 if(row.length!==5||!task||task.length>240||!owner||owner.length>80||!Number.isInteger(priority)||!['todo','doing','done'].includes(status)||!date||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==due){result.invalid.push(i+2);return;}
 const key=JSON.stringify([norm(task),norm(owner),priority,due,status]);if(seen.has(key)){result.duplicates++;return;}seen.add(key);
 if(status==='done'){result.completed++;return;}result.tasks.push({task,owner,priority,due,status});});
 result.tasks.sort((a,b)=>a.priority-b.priority||a.due.localeCompare(b.due)||norm(a.task).localeCompare(norm(b.task)));return result;
}
function exportCSV(tasks){
 const safe=v=>{let s=String(v);if(/^[\s]*[=+@\-\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 return '\uFEFF'+[['tarea','responsable','prioridad','fecha','estado'],...tasks.map(t=>[t.task,t.owner,['alta','media','baja'][t.priority],t.due,t.status==='todo'?'pendiente':'en curso'])].map(r=>r.map(safe).join(',')).join('\r\n');
}
function analyze(text,threshold=3){
 bounded(text,MAX_LOG);if(!Number.isInteger(threshold)||threshold<1||threshold>100000)throw Error('El umbral debe ser un entero de 1 a 100000.');
 const result={total:0,valid:0,accepted:0,denied:0,invalid:[],ignored:[],formats:{simple:0,ssh:0},findings:[],threshold},ips=new Map();
 text.split(/\r?\n/).forEach((raw,i)=>{const line=raw.trim();if(!line)return;result.total++;
 const parsed=parseAuthLine(line);
 if(parsed.status!=='valid'){result[parsed.status].push(i+1);return;}
 result.valid++;result.formats[parsed.format]++;if(parsed.action==='DENY'){result.denied++;ips.set(parsed.ip,(ips.get(parsed.ip)||0)+1);}else result.accepted++;});
 result.findings=[...ips].filter(([,n])=>n>=threshold).map(([ip,denials])=>({ip,denials})).sort((a,b)=>b.denials-a.denials||a.ip.localeCompare(b.ip));return result;
}
function parseAuthLine(line){
 if(line.length>4096)return {status:'invalid'};
 const ipOK=ip=>/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)&&ip.split('.').every(p=>Number(p)<=255&&String(Number(p))===p);
 const time='(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d';
 const simple=new RegExp('^'+time+'\\s+(ACCEPT|DENY)\\s+(\\S+)$').exec(line);
 if(simple)return ipOK(simple[2])?{status:'valid',format:'simple',action:simple[1],ip:simple[2]}:{status:'invalid'};
 if(/^\S+\s+(ACCEPT|DENY)\b/.test(line))return {status:'invalid'};
 // Only the actual sshd program field is recognized, never quoted text from another program.
 const envelope=/^(.*?)\s+([^\s:]+)\s+sshd(?:-session)?\[\d+\]:\s+(.+)$/.exec(line);
 if(!envelope)return {status:'ignored'};
 const message=envelope[3];
 if(!/^(?:Failed password|Accepted (?:password|publickey))\b/.test(message))return {status:'ignored'};
 const syslog=new RegExp('^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(0?[1-9]|[12]\\d|3[01])\\s+'+time+'$');
 const iso=new RegExp('^(\\d{4}-\\d{2}-\\d{2})[T ]'+time+'(?:\\.\\d{1,9})?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)?$');
 const isoMatch=iso.exec(envelope[1]),syslogMatch=syslog.exec(envelope[1]);
 const validIso=isoMatch&&Number.isFinite(Date.parse(isoMatch[1]+'T00:00:00Z'))&&new Date(isoMatch[1]+'T00:00:00Z').toISOString().slice(0,10)===isoMatch[1];
 // Traditional syslog has no year; allow Feb 29 but reject impossible month/day pairs.
 const days={Jan:31,Feb:29,Mar:31,Apr:30,May:31,Jun:30,Jul:31,Aug:31,Sep:30,Oct:31,Nov:30,Dec:31};
 const validSyslog=syslogMatch&&Number(syslogMatch[2])<=days[syslogMatch[1]];
 const event=/^(Failed password|Accepted (?:password|publickey)) for (?:invalid user )?\S{1,128} from (\S+) port (\d{1,5}) ssh2(?: \[preauth\]|: [^\r\n]{1,512})?$/.exec(message);
 if(!event||!(validIso||validSyslog)||!ipOK(event[2])||Number(event[3])<1||Number(event[3])>65535)return {status:'invalid'};
 return {status:'valid',format:'ssh',action:event[1]==='Failed password'?'DENY':'ACCEPT',ip:event[2]};
}
if(typeof module==='object'&&module.exports)module.exports={parseCSV,organize,exportCSV,analyze};
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
const t=(key,values={})=>window.I18N.t(key,values);
// Only a same-origin module is loaded. Neither the tool input nor its result is passed to a server.
let toolsVoice=null;
const reciprocityReady=Promise.all([import('./reciprocity.js?v=voice-5'),import('./page-voice.js?v=voice-36')]).then(([{createReciprocity},{mountPageVoice}])=>{const voice=mountPageVoice({page:'tools',initialKey:'automationTerm'});toolsVoice=voice;return createReciprocity({translate:t,links:()=>window.PORTFOLIO.supportLinks,voice});}).catch(()=>null);
const errorKeys=new Map([
 ['El archivo supera el tamaño permitido.','toolsF_errorSize'],['Usa un archivo de texto UTF-8, no un documento binario.','toolsF_errorBinary'],
 ['Comillas CSV inválidas.','toolsF_errorQuotes'],['Texto fuera de comillas CSV.','toolsF_errorOutsideQuotes'],['Hay una celda con comillas sin cerrar.','toolsF_errorUnclosedQuotes'],
 ['Encabezado requerido: tarea,responsable,prioridad,fecha,estado','toolsF_errorHeader'],['Máximo 200 tareas.','toolsF_errorTasks'],['El umbral debe ser un entero de 1 a 100000.','toolsF_errorThreshold'],
]);
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type})),a=node('a','');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
for(const kind of ['csv','logs']){
 const input=$(kind+'-input'),out=$(kind+'-result'),file=$(kind+'-file'),drop=$(kind+'-drop'),save=$(kind+'-save');let result=null,generation=0;
 let resultError=null,noticeKey=null,exportPending=false;
 function invalidateCheckpoint(){void reciprocityReady.then(controller=>controller?.invalidate(kind));}
 function invalidate(){generation++;result=null;resultError=null;noticeKey=null;save.disabled=true;out.replaceChildren();invalidateCheckpoint();}
 function renderResult(){out.replaceChildren();if(resultError){out.append(node('p',t(resultError)));return;}if(noticeKey){out.append(node('p',t(noticeKey)));return;}if(!result)return;
 out.append(node('strong',t(kind==='csv'?'toolsF_tasksReady':'toolsF_sourcesReview',{n:kind==='csv'?result.tasks.length:result.findings.length})));
 if(kind==='csv')out.append(node('p',t('toolsF_csvSummary',{total:result.total,duplicates:result.duplicates,completed:result.completed,invalid:result.invalid.length})));
 else{
 const stats=node('dl','');stats.className='log-stats';
 for(const [label,count] of [['toolsF_denied',result.denied],['toolsF_accepted',result.accepted],['toolsF_ignored',result.ignored.length],['toolsF_invalid',result.invalid.length]]){const pair=node('div','');pair.append(node('dt',t(label)),node('dd',String(count)));stats.append(pair);}out.append(stats);
 out.append(node('p',t('toolsF_logSummary',{total:result.total,ssh:result.formats.ssh,simple:result.formats.simple})));
 const guide=node('p',t(result.findings.length?'toolsF_signalGuide':'toolsF_noSignals'));guide.className='hint';out.append(guide);
 if(result.ignored.length)out.append(node('p',t('toolsF_ignoredLines',{lines:result.ignored.slice(0,30).join(',')+(result.ignored.length>30?'…':'')})));
 }
 if(result.invalid.length)out.append(node('p',t('toolsF_reviewRows',{lines:result.invalid.slice(0,30).join(',')+(result.invalid.length>30?'…':'')})));
 const table=node('table',''),head=node('tr','');(kind==='csv'?['toolsF_task','toolsF_owner','toolsF_date']:['toolsF_ip','toolsF_denied']).forEach(key=>{const th=node('th',t(key));th.scope='col';head.append(th);});const thead=node('thead','');thead.append(head);table.append(thead);const tbody=node('tbody','');
 const entries=kind==='csv'?result.tasks:result.findings;
 for(const item of entries.slice(0,200)){const tr=node('tr','');(kind==='csv'?[item.task,item.owner,item.due]:[item.ip,String(item.denials)]).forEach(x=>tr.append(node('td',x)));tbody.append(tr);}table.append(tbody);const scroller=node('div','');scroller.className='table-scroll';scroller.append(table);out.append(scroller);
 if(entries.length>200)out.append(node('p',t('toolsF_viewLimit')));
 }
 function run(){invalidate();try{result=kind==='csv'?organize(input.value):analyze(input.value,Number($('threshold').value));save.disabled=false;if(toolsVoice?.react)void toolsVoice.react(kind==='csv'?'automation':'security',{priority:2,maxAge:5000,cooldown:20000});}catch(e){resultError=errorKeys.get(e.message)||'toolsF_errorGeneral';}renderResult();}
 async function read(selected){invalidate();const token=generation;if(!selected)return;if(selected.size>(kind==='csv'?MAX_CSV:MAX_LOG)){noticeKey='toolsF_errorSize';renderResult();return;}
 try{const bytes=await selected.arrayBuffer();const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(token!==generation)return;input.value=text;run();}catch{if(token===generation){noticeKey='toolsF_errorRead';renderResult();}}}
 input.addEventListener('input',invalidate);if(kind==='logs')$('threshold').addEventListener('input',invalidate);
 $(kind+'-sample').addEventListener('click',()=>{input.value=t(kind==='csv'?'toolsF_sampleCsv':'toolsF_sampleLogs');run();});
 $(kind+'-run').addEventListener('click',run);$(kind+'-clear').addEventListener('click',()=>{invalidate();input.value='';file.value='';noticeKey='toolsF_dataCleared';renderResult();input.focus();});
 file.addEventListener('change',()=>read(file.files[0]));
 for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('dragging');});
 drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));
 drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer.files.length!==1){invalidate();noticeKey='toolsF_oneFile';renderResult();return;}read(e.dataTransfer.files[0]);});
 save.addEventListener('click',async()=>{
   if(!result||exportPending)return;exportPending=true;const snapshot=result,token=generation;
   try{
     const controller=await reciprocityReady;if(token!==generation||snapshot!==result)return;
     const onDownload=()=>{if(token!==generation||snapshot!==result)return false;download(kind==='csv'?exportCSV(snapshot.tasks):JSON.stringify(snapshot,null,2),kind==='csv'?'tareas-ordenadas.csv':'revision-accesos.json',kind==='csv'?'text/csv;charset=utf-8':'application/json');return true;};
     const stats=kind==='csv'?{success:true,total:snapshot.total}:{success:true,valid:snapshot.valid};
     if(!controller?.checkpoint({tool:kind,stats,onDownload}))onDownload();
   }catch{noticeKey='toolsF_errorDownload';renderResult();}finally{exportPending=false;}
 });
 document.addEventListener('portfolio:language',renderResult);
 window.addEventListener('pagehide',()=>{invalidate();input.value='';file.value='';void reciprocityReady.then(controller=>controller?.reset(kind));});
}
})();

