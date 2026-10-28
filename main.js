/* Native browser application. All user/data strings are inserted as text, never HTML. */
(() => {
  'use strict';
  const LINKEDIN = 'https://www.linkedin.com/in/jose-sergio-hernandez-hernandez-a355a3227';

  function safeUrl(value) {
    if (typeof value !== 'string' || !value || /[\u0000-\u0020\\]/.test(value)) return null;
    if (/^#[a-z][a-z0-9-]*$/i.test(value)) return value;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
  }
  function filterProjects(projects, category) {
    return projects.filter(project => category === 'all' || project.categories.includes(category));
  }
  function analyzeLogs(input) {
    const sources = new Map(); let valid = 0; let invalid = 0; let accepted = 0; let denied = 0;
    const lines = input.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (const line of lines) {
      const match = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d\s+(ACCEPT|DENY)\s+((?:\d{1,3}\.){3}\d{1,3})$/.exec(line);
      if (!match || !match[3].split('.').every(part => Number(part) <= 255 && String(Number(part)) === part)) { invalid++; continue; }
      valid++;
      if (match[2] === 'DENY') { denied++; sources.set(match[3], (sources.get(match[3]) || 0) + 1); } else accepted++;
    }
    const findings = [...sources].filter(([, count]) => count >= 3).map(([ip, count]) => ({ ip, count })).sort((a, b) => b.count - a.count);
    return { valid, invalid, accepted, denied, findings, total:lines.length };
  }
  // Export pure logic for dependency-free Node tests; the browser uses the same functions.
  if (typeof module !== 'undefined' && module.exports) module.exports = { safeUrl, filterProjects, analyzeLogs };
  if (typeof document === 'undefined') return;

  const data = window.PORTFOLIO;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('icon'); svg.setAttribute('aria-hidden','true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `assets/icons.svg#${name}`); svg.append(use); return svg;
  }
  function link(label, url, className = 'text-link') {
    const href = safeUrl(url); if (!href) return null;
    const node = el('a', className, label); node.href = href;
    if (href.startsWith('https:')) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
    return node;
  }
  function tags(values) { const node = el('div','tags'); values.forEach(value => node.append(el('span','',value))); return node; }
  function architectureDiagram() {
    const diagram = el('div','ai-architecture'); diagram.setAttribute('aria-label','Arquitectura conceptual de Plataforma de IA local');
    diagram.id='ai-flow';diagram.dataset.step='0';diagram.dataset.output='image';
    diagram.append(el('p','architecture-label mono','LOCAL AI / EXPLORA EL FLUJO'),el('div','pipeline-input','01 / IDEA + BRIEF'),el('div','pipeline-link'),el('div','pipeline-hub','02 / LOCAL AI'),el('div','pipeline-link'));
    const models = el('div','pipeline-models');
    models.setAttribute('role','group');models.setAttribute('aria-label','Elegir salida del flujo');
    [['image','Imagen'],['video','Video'],['voice','Voz']].forEach(([name,label]) => {const node=el('button');node.type='button';node.dataset.aiOutput=name;node.setAttribute('aria-pressed',String(name==='image'));node.setAttribute('aria-controls','flow-detail');node.append(icon(name),document.createTextNode(label));models.append(node);});
    const detail=el('div','flow-detail');detail.id='flow-detail';
    const signal=el('div','flow-signal');signal.setAttribute('aria-hidden','true');for(let i=0;i<12;i++)signal.append(el('i'));
    const title=el('strong','','Del brief a una imagen');title.id='flow-title';const text=el('p','','Define estilo, composición y referencias; revisa el resultado antes de exportarlo.');text.id='flow-copy';
    detail.append(signal,title,text);
    const controls=el('div','flow-controls');const run=el('button','button secondary small-button','Recorrer flujo ↗');run.id='flow-run';run.type='button';run.setAttribute('aria-describedby','flow-status');const status=el('span','mono small','LISTO PARA EXPLORAR');status.id='flow-status';status.setAttribute('role','status');controls.append(run,status);
    diagram.append(models,el('div','pipeline-link'),el('div','pipeline-output','04 / REVISIÓN → EXPORTACIÓN'),detail,controls,el('p','architecture-note','SIMULACIÓN VISUAL · NO GENERA ARCHIVOS NI EJECUTA MODELOS'));return diagram;
  }
  function renderProjects() {
    const fragment = document.createDocumentFragment();
    data.projects.forEach(project => {
      const card = el('article',`project-card${project.featured ? ' featured' : ''}`); card.id = project.id;
      const content = project.featured ? el('div','featured-content') : card;
      const top = el('div','card-top');
      top.append(project.featured ? el('span','eyebrow','↗ FEATURED PROJECT') : icon(project.icon),el('span',`badge ${project.statusType}`,project.status));
      content.append(top,el('p','project-category',project.categoryLabel),el('h3','',project.name));
      if (project.subtitle) content.append(el('p','featured-subtitle',project.subtitle));
      content.append(el('p','project-description',project.description),tags(project.stack));
      const bottom = el('div','card-bottom'); const button = el('button','',project.featured ? 'Explorar proyecto ↗' : 'Ver ficha técnica ↗');
      button.type='button'; button.dataset.project=project.id; button.setAttribute('aria-label',`Explorar ${project.name}`);button.setAttribute('aria-haspopup','dialog');
      bottom.append(button);
      const github = link('GitHub ↗',project.github); const demo = link('Probar demo ↗',project.demo);
      if (github) bottom.append(github); else if (demo) bottom.append(demo); else bottom.append(el('span','unavailable','Demo por publicar'));
      content.append(bottom); if (project.featured) card.append(content,architectureDiagram());
      fragment.append(card);
    });
    $('#project-grid').append(fragment); $('.project-filters').hidden=false;
    $('[data-filter="all"] span').textContent=String(data.projects.length).padStart(2,'0');
    setFilter('all');
  }
  function setFilter(category) {
    const visible = new Set(filterProjects(data.projects,category).map(project => project.id));
    data.projects.forEach(project => { document.getElementById(project.id).hidden=!visible.has(project.id); });
    $$('[data-filter]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.filter === category)));
    $('#project-count').textContent=`${visible.size} ${visible.size === 1 ? 'proyecto' : 'proyectos'}`;
  }
  function renderCredentials() {
    data.credentials.forEach(credential => {
      const card=el('article','cert-card reveal'); const time=el('time','',credential.displayDate);time.dateTime=credential.date;
      card.append(el('div',`cert-brand ${credential.issuer.toLowerCase()}`,credential.issuer),el('h3','',credential.name),time,el('span','credential-state',credential.type));
      card.append(link(credential.url ? 'Verificar credencial ↗' : 'Ver en LinkedIn ↗',credential.url || `${LINKEDIN}/details/certifications/`));
      $('#cert-grid').append(card);
    });
  }
  function renderServices() {
    data.services.forEach(service => {
      const card=el('article','service-card reveal'); const button=el('a','text-link','Solicitar información ↗');button.href='#contact';button.dataset.service=service.name;
      card.append(icon(service.icon),el('h3','',service.name),el('p','',service.description),el('p','use-case',service.use),button);$('#service-grid').append(card);
    });
  }
  function setupSocialLinks() {
    $$('[data-social]').forEach(card => {
      const url = safeUrl(data.socialLinks?.[card.dataset.social]);
      if (!url || !url.startsWith('https:')) return;
      const name = card.querySelector('h3').textContent;
      card.querySelector('.social-action').replaceWith(link(`Visitar ${name} ↗`, url, 'social-action text-link'));
      card.querySelector('.social-status').textContent = 'CANAL ACTIVO';
    });
  }
  function setupCoreExplorer() {
    const scene=$('.core-scene');
    const modes={
      ai:{kicker:'LOCAL',label:'INTELLIGENCE',description:'Modelos locales, agentes y flujos creativos conectados.'},
      security:{kicker:'DEFENSIVE',label:'SECURITY',description:'Análisis de señales, protección de redes y seguridad desde el diseño.'},
      software:{kicker:'BUILD',label:'SOFTWARE',description:'Código, interfaces y automatización para resolver problemas reales.'}
    };
    $('.core-controls').hidden=false;
    $$('[data-core-mode]').forEach(button=>button.addEventListener('click',()=>{
      const mode=button.dataset.coreMode;
      if(!Object.hasOwn(modes,mode))return;
      scene.dataset.mode=mode;
      $('#core-kicker').textContent=modes[mode].kicker;
      $('#core-mode-label').textContent=modes[mode].label;
      $('#core-description').textContent=modes[mode].description;
      $$('[data-core-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    }));
  }
  const dialog=$('#project-dialog'); let dialogOpener=null;
  function openProject(id, opener) {
    const project=data.projects.find(item => item.id===id); if (!project) return;
    const content=$('#dialog-content');content.replaceChildren();
    content.append(el('span',`badge ${project.statusType}`,project.status));
    const title=el('h2','',project.name);title.id='dialog-title';content.append(title,el('p','',project.description));
    const meta=el('dl','project-metadata');
    [['Versión',project.version || 'No publicada'],['Progreso',Number.isFinite(project.progress) ? `${project.progress}% documentado` : 'Sin porcentaje documentado'],['Actualización',project.updated || 'Pendiente de documentar']].forEach(([label,value]) => {const group=el('div');group.append(el('dt','',label),el('dd','',value));meta.append(group);});content.append(meta);
    content.append(el('h3','','El problema'),el('p','',project.problem),el('h3','',project.architectureLabel),el('p','dialog-architecture',project.architecture),el('h3','',project.stackLabel),tags(project.stack),el('h3','','Alcance y características'));
    const list=el('ul');project.features.forEach(feature => list.append(el('li','',feature)));content.append(list,el('h3','','Estado real del proyecto'),el('p','',project.scope));
    project.screenshots.forEach(shot => {
      if (!/^assets\/[a-zA-Z0-9_./-]+\.(png|webp|jpe?g|svg)$/.test(shot.src) || shot.src.includes('..')) return;
      const img=el('img','dialog-image');img.src=shot.src;img.alt=shot.alt || project.name;img.loading='lazy';img.decoding='async';content.append(img);
    });
    const actions=el('div','dialog-actions');
    [['Ver demo ↗',project.demo],['GitHub ↗',project.github],['Documentación ↗',project.docs]].forEach(([label,url]) => {const node=link(label,url,'button secondary');if(node)actions.append(node);});
    const contact=link('Consultar el proyecto →','#contact','button primary');contact.dataset.service=project.name;actions.append(contact);content.append(actions);
    dialogOpener=opener;dialog.showModal();document.body.classList.add('dialog-open');dialog.scrollTop=0;$('#dialog-close').focus();
  }
  function closeDialog() { if(dialog.open)dialog.close(); }
  dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');dialogOpener?.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog();});
  $('#dialog-close').addEventListener('click',closeDialog);

  const menu=$('#menu-toggle'); const nav=$('#primary-nav');
  function closeMenu(restoreFocus=false){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');if(restoreFocus)menu.focus();}
  menu.hidden=false;$('.site-header').classList.add('menu-ready');
  menu.addEventListener('click',()=>{const opened=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(opened));nav.classList.toggle('is-open',opened);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true')closeMenu(true);});
  document.addEventListener('click',event=>{
    const filter=event.target.closest('[data-filter]');if(filter)setFilter(filter.dataset.filter);
    const project=event.target.closest('[data-project]');if(project)openProject(project.dataset.project,project);
    const service=event.target.closest('[data-service]');
    if(service){closeDialog();$('#contact-interest').textContent=`Tema de interés: ${service.dataset.service}`;requestAnimationFrame(()=>$('#private-contact').focus({preventScroll:true}));}
    const anchor=event.target.closest('a[href^="#"]');
    if(anchor){const hash=anchor.getAttribute('href');const target=document.getElementById(hash.slice(1));if(target?.classList.contains('project-card')&&target.hidden)setFilter('all');closeMenu();if(dialog.open)closeDialog();}
    if(event.target.closest('.print-cv'))window.print();
  });
  const mobileQuery=matchMedia('(max-width: 800px)');mobileQuery.addEventListener('change',()=>closeMenu());
  function handleHash(){const target=document.getElementById(location.hash.slice(1));if(!target)return;if(target.classList.contains('project-card')&&target.hidden)setFilter('all');target.scrollIntoView({behavior:'instant',block:'start'});}
  window.addEventListener('hashchange',handleHash);
  window.addEventListener('load',handleHash,{once:true});

  function setupLab(){
    const input=$('#log-input');const sample=input.value;const output=$('#log-output');
    const run=()=>{const result=analyzeLogs(input.value);output.replaceChildren();if(!result.total){output.append(el('p','log-error','Escribe al menos un evento para analizar.'));return;}
      output.append(el('strong','',`${result.valid} ${result.valid === 1 ? 'evento válido' : 'eventos válidos'} · ${result.denied} ${result.denied === 1 ? 'rechazo' : 'rechazos'} · ${result.accepted} ${result.accepted === 1 ? 'acceso' : 'accesos'}`));
      const chart=el('div','lab-chart');chart.setAttribute('aria-label','Distribución de eventos de la muestra');
      [['ACCEPT',result.accepted,'accepted'],['DENY',result.denied,'denied'],['INVÁLIDOS',result.invalid,'invalid']].forEach(([label,count,kind])=>{const row=el('div',`lab-chart-row ${kind}`);const track=el('div','lab-chart-track');const bar=el('i');bar.style.width=`${result.total?count/result.total*100:0}%`;track.setAttribute('aria-hidden','true');track.append(bar);row.append(el('span','mono',label),track,el('strong','',String(count)));chart.append(row);});output.append(chart);
      if(result.invalid)output.append(el('p','log-error',`${result.invalid} ${result.invalid === 1 ? 'línea descartada' : 'líneas descartadas'}. Formato: HH:MM:SS ACCEPT|DENY IPv4.`));
      if(!result.valid)return;
      if(result.findings.length)result.findings.forEach(finding=>output.append(el('p','alert',`${finding.ip} → ${finding.count} rechazos. Umbral alcanzado: revisar contexto.`)));
      else output.append(el('p','','Ningún origen alcanza 3 rechazos en esta muestra. Esto no garantiza ausencia de riesgo.'));
    };
    $('#analyze-logs').hidden=false;$('#reset-logs').hidden=false;$('#analyze-logs').addEventListener('click',run);$('#reset-logs').addEventListener('click',()=>{input.value=sample;run();});run();
  }
  function setupMotion(){
    const query=matchMedia('(prefers-reduced-motion: reduce)');const coarse=matchMedia('(pointer: coarse), (max-width: 580px)');
    const toggle=$('#motion-toggle');let userPaused=false;
    const studioFrame=$('#studio-frame');
    const studioControl=$('#studio-toggle');
    let studioPaused=false;
    function syncStudio() {
      const stopped=paused||studioPaused;
      studioFrame.classList.toggle('studio-paused',stopped);
      studioControl.disabled=paused;
      studioControl.setAttribute('aria-pressed',String(stopped));
      const label=query.matches?'Movimiento reducido por el sistema':userPaused?'Activa los efectos de la cabecera para reanudar':studioPaused?'Reanudar visualización':'Pausar visualización';
      studioControl.setAttribute('aria-label',label);
      studioControl.title=label;
      $('#studio-control-icon').setAttribute('href',`assets/icons.svg#${stopped?'play':'pause'}`);
      $('#studio-state').textContent=query.matches?'MOVIMIENTO REDUCIDO':userPaused?'EFECTOS GLOBALES EN PAUSA':studioPaused?'VISUALIZACIÓN EN PAUSA':'VISUALIZACIÓN ANIMADA';
    }
    studioFrame.classList.add('studio-ready');
    studioControl.hidden=false;
    studioControl.addEventListener('click',()=>{studioPaused=!studioPaused;syncStudio();});
    try{userPaused=localStorage.getItem('cyberserch-motion')==='paused';}catch{/* Storage can be disabled. */}
    const hero=$('.hero');const core=$('#core-parallax');const canvas=$('#particles');const ctx=canvas.getContext('2d');
    $('.core-scene').classList.add('core-ready');
    let width=0,height=0,points=[],raf=0,last=0,heroVisible=true,px=0,py=0,moved=false;
    let pointerRect=null;
    let paused=query.matches||userPaused;
    const typed=$('#typed-role');const phrase=typed.textContent;let typingTimer=0;
    const pending=new Set();
    const revealObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('reveal-pending');pending.delete(entry.target);revealObserver.unobserve(entry.target);}});},{threshold:.08}):null;
    if(revealObserver&&!paused){$$('.reveal').forEach(node=>{node.classList.add('reveal-pending');pending.add(node);revealObserver.observe(node);});}
    function draw(dt=0){
      if(!ctx)return;ctx.clearRect(0,0,width,height);
      points.forEach(point=>{point.x=(point.x+point.vx*dt+width)%width;point.y=(point.y+point.vy*dt+height)%height;ctx.beginPath();ctx.arc(point.x,point.y,point.r,0,Math.PI*2);ctx.fillStyle=`rgba(98,233,223,${point.alpha})`;ctx.fill();});
      // Bounded pair count: 38 points maximum; no geometry reads in the frame loop.
      for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){const a=points[i],b=points[j];const distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance<100){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(98,233,223,${.09*(1-distance/100)})`;ctx.lineWidth=.5;ctx.stroke();}}
    }
    function shouldRun(){return !!ctx&&!paused&&!coarse.matches&&heroVisible&&!document.hidden;}
    function frame(time){raf=0;if(!shouldRun())return;const dt=Math.min((time-last)/1000,.04);last=time;draw(dt);if(moved){core.style.transform=`translate3d(${px}px,${py}px,0)`;moved=false;}raf=requestAnimationFrame(frame);}
    function sync(){cancelAnimationFrame(raf);raf=0;paused=query.matches||userPaused;document.documentElement.classList.toggle('motion-paused',paused);toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',query.matches?'Movimiento reducido por el sistema':paused?'Activar animaciones':'Pausar animaciones');toggle.title=query.matches?'Tu sistema tiene activada la reducción de movimiento':paused?'Activar animaciones':'Pausar animaciones';
      syncStudio();
      document.dispatchEvent(new CustomEvent('portfolio:motion',{detail:{paused}}));
      if(paused){clearTimeout(typingTimer);typed.textContent=phrase;core.style.transform='';pending.forEach(node=>node.classList.remove('reveal-pending'));pending.clear();revealObserver?.disconnect();}
      draw();if(shouldRun()){last=performance.now();raf=requestAnimationFrame(frame);}
    }
    function resize(){const rect=hero.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);const count=coarse.matches?12:Math.min(38,Math.round(width/35));points=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,r:.6+Math.random(),vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*6,alpha:.12+Math.random()*.24}));sync();}
    toggle.hidden=false;toggle.addEventListener('click',()=>{if(query.matches){toggle.title='Para activar las animaciones, desactiva la reducción de movimiento en tu sistema.';return;}userPaused=!userPaused;try{localStorage.setItem('cyberserch-motion',userPaused?'paused':'active');}catch{}sync();});
    query.addEventListener('change',sync);coarse.addEventListener('change',resize);
    document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('page-hidden',document.hidden);sync();});
    hero.addEventListener('pointerenter',()=>{pointerRect=hero.getBoundingClientRect();},{passive:true});
    hero.addEventListener('pointermove',event=>{if(paused||coarse.matches||event.pointerType!=='mouse')return;const rect=pointerRect || hero.getBoundingClientRect();px=(event.clientX-rect.left-width/2)/width*12;py=(event.clientY-rect.top-height/2)/height*10;moved=true;},{passive:true});
    hero.addEventListener('pointerleave',()=>{px=0;py=0;moved=true;pointerRect=null;},{passive:true});
    if('ResizeObserver' in window)new ResizeObserver(resize).observe(hero);else window.addEventListener('resize',resize,{passive:true});
    if('IntersectionObserver' in window){new IntersectionObserver(entries=>{entries.forEach(entry=>{entry.target.classList.toggle('offscreen',!entry.isIntersecting);if(entry.target===hero){heroVisible=entry.isIntersecting;sync();}});}).observe(hero);const studio=$('#content');new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('offscreen',!entry.isIntersecting))).observe(studio);}
    resize();
    if(!paused){let index=0;typed.textContent='';const type=()=>{if(paused){typed.textContent=phrase;return;}typed.textContent=phrase.slice(0,++index);if(index<phrase.length)typingTimer=setTimeout(type,29);};type();}
    let firstVisit=true;try{firstVisit=sessionStorage.getItem('cyberserch-boot')!=='done';sessionStorage.setItem('cyberserch-boot','done');}catch{}
    if(firstVisit&&!paused){const boot=$('#boot');boot.hidden=false;setTimeout(()=>{boot.hidden=true;},800);}
  }
  function setupActiveNavigation(){
    if(!('IntersectionObserver' in window))return;
    const links=$$('#primary-nav a');const visible=new Map();
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>visible.set(entry.target.id,entry.isIntersecting));const current=links.find(link=>visible.get(link.hash.slice(1)));links.forEach(link=>{if(link===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});},{rootMargin:'-15% 0px -55% 0px'});
    links.forEach(link=>{const section=document.getElementById(link.hash.slice(1));if(section)observer.observe(section);});
  }
  renderProjects();renderCredentials();renderServices();setupSocialLinks();setupCoreExplorer();setupLab();setupMotion();setupActiveNavigation();
  $$('.print-cv').forEach(button=>{button.hidden=false;});
  requestAnimationFrame(handleHash);
})();
