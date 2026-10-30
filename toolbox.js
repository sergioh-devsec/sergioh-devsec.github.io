/* Browser-only tools: no analytics, requests or persistent storage. */
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
 const result={total:0,valid:0,accepted:0,denied:0,invalid:[],findings:[],threshold},ips=new Map();
 text.split(/\r?\n/).forEach((raw,i)=>{const line=raw.trim();if(!line)return;result.total++;
 const m=/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d\s+(ACCEPT|DENY)\s+((?:\d{1,3}\.){3}\d{1,3})$/.exec(line);
 if(!m||!m[3].split('.').every(p=>Number(p)<=255&&String(Number(p))===p)){result.invalid.push(i+1);return;}result.valid++;if(m[2]==='DENY'){result.denied++;ips.set(m[3],(ips.get(m[3])||0)+1);}else result.accepted++;});
 result.findings=[...ips].filter(([,n])=>n>=threshold).map(([ip,denials])=>({ip,denials})).sort((a,b)=>b.denials-a.denials||a.ip.localeCompare(b.ip));return result;
}
if(typeof module==='object'&&module.exports)module.exports={parseCSV,organize,exportCSV,analyze};
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
const samples={csv:'tarea,responsable,prioridad,fecha,estado\nRevisar formulario,Equipo,alta,2026-11-04,pendiente\nRevisar formulario,Equipo,alta,2026-11-04,pendiente\nPublicar aviso,Equipo,media,2026-11-05,completada\nProbar móvil,Equipo,alta,2026-11-06,en curso',logs:'09:00:00 DENY 192.0.2.14\n09:01:00 DENY 192.0.2.14\n09:02:00 ACCEPT 198.51.100.5\n09:03:00 DENY 192.0.2.14\n09:04:00 DENY 203.0.113.7'};
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type})),a=node('a','');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
for(const kind of ['csv','logs']){
 const input=$(kind+'-input'),out=$(kind+'-result'),file=$(kind+'-file'),drop=$(kind+'-drop'),save=$(kind+'-save');let result=null,generation=0;
 function invalidate(){generation++;result=null;save.disabled=true;out.replaceChildren();}
 function run(){generation++;result=null;save.disabled=true;out.replaceChildren();try{
 result=kind==='csv'?organize(input.value):analyze(input.value,Number($('threshold').value));
 out.append(node('strong',kind==='csv'?'Tareas listas: '+result.tasks.length:'Orígenes por revisar: '+result.findings.length));
 out.append(node('p',kind==='csv'?['Registros: '+result.total,'duplicados: '+result.duplicates,'terminados: '+result.completed,'inválidos: '+result.invalid.length].join(' · '):['Eventos válidos: '+result.valid,'rechazos: '+result.denied,'aceptados: '+result.accepted,'inválidos: '+result.invalid.length].join(' · ')));
 if(result.invalid.length)out.append(node('p','Revisa filas: '+result.invalid.slice(0,30).join(',')+(result.invalid.length>30?'…':'')));
 const table=node('table',''),head=node('tr','');(kind==='csv'?['Tarea','Responsable','Fecha']:['IP','Rechazos']).forEach(x=>{const th=node('th',x);th.scope='col';head.append(th);});const thead=node('thead','');thead.append(head);table.append(thead);const tbody=node('tbody','');
 const entries=kind==='csv'?result.tasks:result.findings;
 for(const item of entries.slice(0,200)){const tr=node('tr','');(kind==='csv'?[item.task,item.owner,item.due]:[item.ip,String(item.denials)]).forEach(x=>tr.append(node('td',x)));tbody.append(tr);}table.append(tbody);const scroller=node('div','');scroller.className='table-scroll';scroller.append(table);out.append(scroller);
 if(entries.length>200)out.append(node('p','Vista limitada a 200 resultados. La descarga incluye todos.'));
 save.disabled=false;
 }catch(e){out.append(node('p',e.message));}}
 async function read(selected){invalidate();const token=generation;if(!selected)return;if(selected.size>(kind==='csv'?MAX_CSV:MAX_LOG)){out.textContent='Archivo demasiado grande. CSV: 20 KB; logs: 2 MB.';return;}
 try{const bytes=await selected.arrayBuffer();const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(token!==generation)return;input.value=text;run();}catch{if(token===generation)out.textContent='No se pudo leer. Usa texto UTF-8.';}}
 input.addEventListener('input',invalidate);if(kind==='logs')$('threshold').addEventListener('input',invalidate);
 $(kind+'-sample').addEventListener('click',()=>{invalidate();input.value=samples[kind];run();});
 $(kind+'-run').addEventListener('click',run);$(kind+'-clear').addEventListener('click',()=>{invalidate();input.value='';file.value='';out.textContent='Datos borrados de esta vista.';input.focus();});
 file.addEventListener('change',()=>read(file.files[0]));
 for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('dragging');});
 drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));
 drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer.files.length!==1){invalidate();out.textContent='Elige un solo archivo.';return;}read(e.dataTransfer.files[0]);});
 save.addEventListener('click',()=>{if(!result)return;download(kind==='csv'?exportCSV(result.tasks):JSON.stringify(result,null,2),kind==='csv'?'tareas-ordenadas.csv':'revision-accesos.json',kind==='csv'?'text/csv;charset=utf-8':'application/json');});
}
})();

