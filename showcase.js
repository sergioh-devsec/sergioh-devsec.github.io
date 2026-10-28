/* Local CSV workflow and live portfolio demonstrations. No uploads or network calls. */
(() => {
  'use strict';
  const normalized=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
  function parseCSV(text){
    if(typeof text!=='string'||text.length>20000)throw new Error('size');
    text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
    const finishCell=()=>{row.push(cell.trim());cell='';closed=false;};
    const finishRow=()=>{finishCell();if(row.some(Boolean))rows.push(row);row=[];if(rows.length>201)throw new Error('size');};
    for(let i=0;i<text.length;i++){const c=text[i];
      if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
      if(c===','){finishCell();continue;}if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;finishRow();continue;}
      if(closed){if(c===' '||c==='\t')continue;throw new Error('csv');}
      if(c==='"'){if(cell.trim())throw new Error('csv');cell='';quoted=true;}else cell+=c;
    }
    if(quoted)throw new Error('csv');finishRow();return rows;
  }
  function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===value;}
  function organizeTasks(text){
    let rows;try{rows=parseCSV(text);}catch(e){return {error:e.message};}
    const headers=[['tarea','responsable','prioridad','fecha','estado'],['task','owner','priority','due','status']];
    if(!rows.length)return {error:'empty'};
    if(!headers.some(h=>h.join('|')===rows[0].map(normalized).join('|')))return {error:'header'};
    const priorities={alta:0,high:0,media:1,medium:1,baja:2,low:2},states={pendiente:'todo',todo:'todo','en curso':'doing',doing:'doing',completada:'done',done:'done'};
    const result={error:null,total:rows.length-1,duplicates:0,completed:0,invalid:[],tasks:[]},seen=new Set();
    rows.slice(1).forEach((r,i)=>{
      if(r.length!==5){result.invalid.push(i+2);return;}
      const [task,owner,p,due,s]=r,priority=Object.hasOwn(priorities,normalized(p))?priorities[normalized(p)]:undefined,status=Object.hasOwn(states,normalized(s))?states[normalized(s)]:undefined;
      if(!task||task.length>240||!owner||owner.length>80||priority===undefined||!status||!validDate(due)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(task+owner)){result.invalid.push(i+2);return;}
      const key=JSON.stringify([normalized(task),normalized(owner),priority,due,status]);
      if(seen.has(key)){result.duplicates++;return;}seen.add(key);
      if(status==='done'){result.completed++;return;}
      result.tasks.push({task,owner,priority,due,status});
    });
    result.tasks.sort((a,b)=>a.priority-b.priority||a.due.localeCompare(b.due)||a.task.localeCompare(b.task));return result;
  }
  function csvCell(value){let text=String(value);if(/^[\s]*[=+\-@\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
  function exportTasks(tasks,language='es'){
    const es=language==='es',rows=[es?['tarea','responsable','prioridad','fecha','estado']:['task','owner','priority','due','status']];
    tasks.forEach(t=>rows.push([t.task,t.owner,(es?['alta','media','baja']:['high','medium','low'])[t.priority],t.due,t.status==='todo'?(es?'pendiente':'todo'):(es?'en curso':'doing')]));
    return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={parseCSV,organizeTasks,exportTasks,validDate};
  if(typeof document==='undefined')return;
  const I=window.I18N,S=window.Site,$=id=>document.getElementById(id),input=$('task-input'),sample=input.value;let result=null;
  function renderResult(){const out=$('task-output');out.replaceChildren();$('task-download').disabled=true;if(!result)return;
    if(result.error){out.append(S.el('p','log-error',I.t('taskError_'+result.error)));return;}
    out.append(S.el('p','task-summary',I.t('taskSummary',{total:result.total,n:result.tasks.length,duplicates:result.duplicates,completed:result.completed,invalid:result.invalid.length})));
    if(result.invalid.length)out.append(S.el('p','small alert',I.t('taskInvalid',{rows:result.invalid.join(', ')})));
    if(!result.tasks.length){out.append(S.el('p','',I.t('taskNone')));return;}
    const wrap=S.el('div','task-table-wrap'),table=S.el('table','task-table'),caption=S.el('caption','sr-only',I.t('taskResult')),head=S.el('thead'),hr=S.el('tr');
    ['taskColumn','ownerColumn','priorityColumn','dueColumn'].forEach(key=>{const th=S.el('th','',I.t(key));th.scope='col';hr.append(th);});head.append(hr);table.append(caption,head);
    const body=S.el('tbody');result.tasks.forEach(task=>{const tr=S.el('tr');[task.task,task.owner,I.t(['priorityHigh','priorityMedium','priorityLow'][task.priority]),task.due].forEach(value=>tr.append(S.el('td','',value)));body.append(tr);});table.append(body);wrap.append(table);out.append(wrap);$('task-download').disabled=false;
  }
  function run(){result=organizeTasks(input.value);renderResult();}
  $('task-run').addEventListener('click',run);$('task-reset').addEventListener('click',()=>{input.value=sample;run();});
  input.addEventListener('input',()=>{result=null;$('task-download').disabled=true;$('task-output').replaceChildren(S.el('p','small muted',I.t('taskChanged')));});
  $('task-download').addEventListener('click',()=>{if(!result?.tasks?.length)return;const url=URL.createObjectURL(new Blob([exportTasks(result.tasks,I.language)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=I.language==='es'?'plan-de-trabajo.csv':'work-plan.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  $('case-motion').addEventListener('click',()=>document.getElementById('motion-toggle').click());
  $('case-language').addEventListener('click',()=>I.setLanguage(I.language==='es'?'en':'es'));
  function motionLabel(){const paused=document.documentElement.classList.contains('motion-paused');$('case-motion').textContent=I.t(paused?'resumeMotion':'pauseMotion');$('case-motion').setAttribute('aria-pressed',String(paused));}
  document.addEventListener('portfolio:language',()=>{renderResult();motionLabel();});document.addEventListener('portfolio:motion',motionLabel);motionLabel();run();
})();
