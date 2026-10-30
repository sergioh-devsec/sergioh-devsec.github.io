/* Native browser application. All user/data strings are inserted as text, never HTML. */
(() => {
  'use strict';
  const LINKEDIN = 'https://www.linkedin.com/in/jose-sergio-hernandez-hernandez-a355a3227';

  function safeUrl(value) {
    if (typeof value !== 'string' || !value || /[\u0000-\u0020\\]/.test(value)) return null;
    if (value==='cotizador.html'||/^herramientas\.html#(csv|logs)$/.test(value)) return value;
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

  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],data=window.PORTFOLIO,I=window.I18N,t=I.t;
  const el=(tag,cls='',text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  function icon(name){const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.classList.add('icon');n.setAttribute('aria-hidden','true');const u=document.createElementNS(n.namespaceURI,'use');u.setAttribute('href',`assets/icons.svg#${name}`);n.append(u);return n;}
  function link(text,url,cls='text-link'){const href=safeUrl(url);if(!href)return null;const n=el('a',cls,text);n.href=href;if(href.startsWith('https:')){n.target='_blank';n.rel='noopener noreferrer';}return n;}
  function tags(list){const n=el('div','tags');list.forEach(v=>n.append(el('span','',v)));return n;}
  function projectAt(i){const p={...data.projects[i]};if(I.language==='en'){const [name,status,description,problem,architecture,features,scope]=window.TRANSLATIONS.en.projects[i];Object.assign(p,{name,status,description,problem,architecture,features,scope});}return p;}
  let filter='all',activeProject=null,creative='image',flowStep=0;
  const openers=new WeakMap();
  function openDialog(id,opener){const d=document.getElementById(id);if(!d||d.open)return;window.AXIOM?.close(false);$$('dialog[open]').forEach(x=>x.close());openers.set(d,opener||document.activeElement);d.showModal();document.body.classList.add('dialog-open');d.scrollTop=0;d.querySelector('[data-close-dialog]').focus();document.dispatchEvent(new CustomEvent('portfolio:dialog-open',{detail:{id}}));}
  $$('dialog:not(#site-menu-dialog)').forEach(d=>{
    d.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>d.close()));
    d.addEventListener('close',()=>{document.dispatchEvent(new CustomEvent('portfolio:dialog-close',{detail:{id:d.id}}));if(!$('dialog[open]'))document.body.classList.remove('dialog-open');if(!$('#axiom-panel').hidden){$('#axiom-close').focus({preventScroll:true});return;}const opener=openers.get(d);if(opener?.isConnected){const target=opener.getClientRects().length?opener:$('#axiom-launcher');target?.focus({preventScroll:true});}});
    d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
  });
  function revealTarget(hash){const target=document.getElementById(hash.replace(/^#/,''));if(!target)return null;let node=target;while(node){if(node.tagName==='DETAILS')node.open=true;node=node.parentElement;}if(target.classList.contains('project-card')&&target.hidden){filter='all';setFilter();}return target;}
  function navigate(hash){const target=revealTarget(hash);if(!target)return;$$('dialog[open]').forEach(d=>{openers.delete(d);d.close();});history.replaceState(null,'',hash);target.scrollIntoView({behavior:document.documentElement.classList.contains('motion-paused')?'instant':'smooth',block:'start'});if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
  window.Site={openDialog,navigate,revealTarget,el,icon,link};
  document.addEventListener('click',e=>{
    const d=e.target.closest('[data-open-dialog]');if(d)openDialog(d.dataset.openDialog,d);
    const a=e.target.closest('a[href^="#"]');if(a&&!e.defaultPrevented&&e.button===0&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();navigate(a.getAttribute('href'));$('#primary-nav').classList.remove('is-open');$('#menu-toggle').setAttribute('aria-expanded','false');}
    const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;setFilter();}
    const p=e.target.closest('[data-project]');if(p){activeProject=Number(p.dataset.project);renderProjectDialog();openDialog('project-dialog',p);}
  });
  function flowDiagram(){const n=el('div','ai-flow');n.append(el('p','eyebrow',t('flowTitle')));const line=el('div','flow-line');['flowIdea','flowModels','flowReview'].forEach((key,i)=>{if(i)line.append(el('b','','→'));line.append(el('span','',t(key)));});n.append(line);const actions=el('div','flow-controls');['image','video','voice'].forEach(type=>{const b=el('button','chip',t(type));b.type='button';b.dataset.flowFormat=type;b.setAttribute('aria-pressed',String(type===creative));b.addEventListener('click',()=>{creative=type;renderCreative();updateFlow();});actions.append(b);});n.append(actions,el('h3','flow-title',t(`${creative}Title`)),el('p','flow-copy',t(`${creative}Copy`)));const run=el('button','button secondary',t('flowRun'));run.type='button';run.addEventListener('click',()=>{flowStep=(flowStep+1)%4;n.querySelector('.flow-status').textContent=flowStep===3?t('flowDone'):t('flowSteps').split(' → ')[flowStep];});const status=el('p','flow-status small',t('flowReady'));status.setAttribute('role','status');n.append(run,status,el('p','small muted',t('conceptOnly')));return n;}
  function updateFlow(){const n=$('.ai-flow');if(!n)return;n.querySelector('.flow-title').textContent=t(`${creative}Title`);n.querySelector('.flow-copy').textContent=t(`${creative}Copy`);n.querySelectorAll('[data-flow-format]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.flowFormat===creative)));}
  function renderProjects(){const frag=document.createDocumentFragment();data.projects.forEach((_,i)=>{const p=projectAt(i);if(!p.shipped)return;const card=el('article','project-card');card.id=p.id;const content=el('div','project-content');content.append(el('span','badge',p.status),el('h3','',p.name),el('p','',p.description),tags(p.stack));if(p.github&&p.id!=='cyberserch'){content.append(link(t('projectRepo'),p.github));}else{const b=el('button','text-button',t('projectDetails'));b.type='button';b.dataset.project=i;b.setAttribute('aria-haspopup','dialog');content.append(b);}card.append(content);frag.append(card);});const backlog=el('details','project-backlog');backlog.append(el('summary','',t('backlogTitle')),el('p','muted',t('backlogCopy')));const list=el('ul');data.projects.forEach((_,i)=>{const p=projectAt(i);if(!p.backlog)return;const li=el('li');li.id=p.id;const b=el('button','text-button',p.name);b.type='button';b.dataset.project=i;li.append(b);list.append(li);});backlog.append(list);frag.append(backlog);$('#project-grid').replaceChildren(frag);setFilter();}
  function setFilter(){const shipped=data.projects.filter(p=>p.shipped),ids=new Set(filterProjects(shipped,filter).map(p=>p.id));shipped.forEach(p=>{document.getElementById(p.id).hidden=!ids.has(p.id);});$$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));$('#project-count').textContent=t('projectCount',{n:ids.size});}
  function renderProjectDialog(){if(activeProject===null)return;const p=projectAt(activeProject),n=$('#dialog-content');n.replaceChildren();const title=el('h2','',p.name);title.id='dialog-title';n.append(el('span','badge',p.status),title,el('p','',p.description),el('h3','',t('problem')),el('p','',p.problem),el('h3','',t('architecture')),el('p','',p.architecture),tags(p.stack),el('h3','',t('features')));const list=el('ul');p.features.forEach(x=>list.append(el('li','',x)));n.append(list,el('h3','',t('projectScope')),el('p','',p.scope));const actions=el('div','dialog-actions');for(const [label,url] of [[t('projectRepo'),p.id==='cyberserch'?null:p.github]]){const a=link(label,url,'button secondary');if(a)actions.append(a);}actions.append(link(t('projectContact'),'#contact','button primary'));n.append(actions);if(p.id==='local-ai-platform')n.append(flowDiagram());}
  function renderServices(){
    const openServices=new Set($$('#service-grid details[open]').map(n=>n.dataset.service));
    const frag=document.createDocumentFragment();
    data.services.forEach((s,i)=>{
      const values=I.language==='en'?window.TRANSLATIONS.en.services[i]:[s.name,s.description,s.use];
      const card=el('details','service-card service-disclosure');
      card.name='service-options';card.dataset.service=String(i);card.open=openServices.has(String(i));
      const summary=el('summary','service-summary'),title=el('h3','',values[0]);
      const cue=el('span','service-disclosure-cue',t('serviceDetails'));cue.setAttribute('aria-hidden','true');
      summary.append(icon(s.icon),title,cue);
      const body=el('div','service-disclosure-body');
      body.append(el('p','',values[1]),el('p','use-case',values[2]));
      const price={0:3500,1:2500,3:5000}[i];
      if(price)body.append(el('p','service-price',t('priceFrom',{amount:new Intl.NumberFormat(I.language==='es'?'es-MX':'en-US').format(price)})),link(t('quoteOpen'),'cotizador.html'));
      const b=el('button','text-button',t('serviceAction'));b.type='button';
      b.addEventListener('click',()=>window.AXIOM?.startService(i,b));
      body.append(b);card.append(summary,body);frag.append(card);
    });
    $('#service-grid').replaceChildren(frag);
  }
  function renderCredentials(){const frag=document.createDocumentFragment();data.credentials.forEach(c=>{const card=el('article','cert-card');card.append(el('div','cert-brand',c.issuer),el('h3','',c.source==='owner'?t('sc100Name'):c.name),el('span','credential-state',t(c.source==='owner'?'examPassed':'credentialCourse')));if(c.source!=='owner')card.append(link(t('credentialLink'),LINKEDIN+'/details/certifications/'));else card.append(el('p','small muted',t('sc100LinkPending')));frag.append(card);});$('#cert-grid').replaceChildren(frag);}
  function renderSocial(){
    const frag=document.createDocumentFragment();
    [['GitHub','github','https://github.com/sergioh-devsec'],['LinkedIn','linkedin',LINKEDIN],['X','x',data.socialLinks.x],['Instagram','instagram',data.socialLinks.instagram],['TikTok','tiktok',data.socialLinks.tiktok],['YouTube','youtube',data.socialLinks.youtube],['Telegram','telegram',data.socialLinks.telegram]].forEach(([name,ic,url])=>{
      const card=el('article',`social-card social-${ic}`),top=el('div','social-card-top'),a=link('',url,'social-card-link');
      top.append(icon(ic),el('span','social-status',t(a?'activeChannel':'soon')));
      const content=a||card;content.append(top,el('h3','',name),el('p','social-description',t('social_'+ic)));
      if(a){a.setAttribute('aria-label',t('openSocial',{name}));card.append(a);}
      if(ic==='instagram'&&a){const qr=el('button','text-button instagram-qr-button',t('instagramQr'));qr.type='button';qr.dataset.openDialog='instagram-dialog';qr.setAttribute('aria-haspopup','dialog');card.append(qr);}frag.append(card);
    });$('#social-grid').replaceChildren(frag);
  }
  function renderCreative(){$('#creative-stage').textContent=`01 / ${t(creative).toUpperCase()}`;$('#creative-title').textContent=t(`${creative}Title`);$('#creative-copy').textContent=t(`${creative}Copy`);$$('[data-format]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===creative)));updateFlow();}
  $$('[data-format]').forEach(b=>b.addEventListener('click',()=>{creative=b.dataset.format;renderCreative();}));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let userPaused=false;try{userPaused=localStorage.getItem('cyberserch-motion')==='paused';}catch{/* Optional. */}
  function syncMotion(){const paused=userPaused||reduced.matches;document.documentElement.classList.toggle('motion-paused',paused);const toggle=$('#motion-toggle');toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',t(reduced.matches?'systemMotion':paused?'resumeMotion':'pauseMotion'));const label=toggle.querySelector('[data-i18n]');label.dataset.i18n=paused?'effectsPaused':'effectsActive';label.textContent=t(label.dataset.i18n);document.dispatchEvent(new CustomEvent('portfolio:motion',{detail:{paused}}));}
  $('#motion-toggle').addEventListener('click',()=>{userPaused=!userPaused;try{localStorage.setItem('cyberserch-motion',userPaused?'paused':'active');}catch{/* Optional. */}syncMotion();});reduced.addEventListener('change',syncMotion);
  function render(){renderServices();renderProjects();renderCredentials();renderSocial();renderCreative();renderProjectDialog();syncMotion();}
  document.addEventListener('portfolio:language',render);render();$('#year').textContent=new Date().getFullYear();
  function syncCaseMotion(){const paused=document.documentElement.classList.contains('motion-paused'),button=$('#case-motion');button.textContent=t(paused?'resumeMotion':'pauseMotion');button.setAttribute('aria-pressed',String(paused));}
  document.addEventListener('portfolio:motion',syncCaseMotion);syncCaseMotion();
  $('#case-motion').addEventListener('click',()=>$('#motion-toggle').click());
  $('#case-language').addEventListener('click',()=>I.setLanguage(I.language==='es'?'en':'es'));
  function handleHash(){const n=revealTarget(location.hash);if(n)n.scrollIntoView({behavior:'instant',block:'start'});}

  // Attention follows visibility and respects both motion controls.
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{e.target.dataset.attention=String(e.isIntersecting);}),{threshold:.5});$$('.support-card,.paypal-nudge,.quote-launch').forEach(n=>observer.observe(n));}
  window.addEventListener('hashchange',handleHash);window.addEventListener('load',handleHash,{once:true});
})();

