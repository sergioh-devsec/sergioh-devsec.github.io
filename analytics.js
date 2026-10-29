/* Optional usage analytics. No SDK, network request or identifier before opt-in. */
(() => {
  'use strict';
  const KEY='cyberserch-analytics-v1', AGE=90*24*60*60*1000, PROJECT='z5jal39enl';
  const EVENTS=new Set(['visit_portfolio','open_estimator','estimate_download','enquiry_accepted','support_paypal_click','support_patreon_click','project_repository_click','profile_open','axiom_open']);
  function readChoice(raw,now=Date.now()){
    try{const x=JSON.parse(raw);return x.version===1&&['accepted','denied'].includes(x.choice)&&Number.isFinite(x.expires)&&x.expires>now&&x.expires<=now+AGE?x.choice:null;}catch{return null;}
  }
  function allowedPage(location,privacySignal=false){
    return !privacySignal&&location.protocol==='https:'&&location.hostname==='sergioh-devsec.github.io'&&['/','/index.html','/cotizador.html'].includes(location.pathname)&&!location.search;
  }
  function createConsent({initial=null,eligible=true,load,stop,save,event,reload}){
    let choice=initial,started=false,stopped=false;
    function start(){if(eligible&&choice==='accepted'&&!started){if(stopped){reload();return;}started=true;load();}}
    function choose(next){if(!['accepted','denied'].includes(next))return;choice=next;save(next);if(next==='denied'&&started){started=false;stopped=true;stop();}else start();}
    function track(name){if(started&&choice==='accepted'&&EVENTS.has(name))event(name);}
    start();return {choose,track,get choice(){return choice;},get active(){return started;}};
  }
  if(typeof module==='object'&&module.exports)module.exports={readChoice,allowedPage,createConsent,KEY,AGE};
  if(typeof document==='undefined')return;
  const en=()=>document.documentElement.lang==='en',tx=(es,english)=>en()?english:es;
  const signal=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';
  const eligible=allowedPage(window.location,signal);
  let stored=null;try{stored=readChoice(localStorage.getItem(KEY));}catch{/* No storage: session choice only. */}
  let script=null,revoked=false,controller;
  function call(...args){if(typeof window.clarity==='function')window.clarity(...args);}
  function clearCookies(){
    for(const name of ['_clck','_clsk'])for(const domain of ['',`; domain=${location.hostname}`])document.cookie=`${name}=; Max-Age=0; path=/${domain}; SameSite=Lax; Secure`;
  }
  function stop(){revoked=true;call('consentv2',{ad_Storage:'denied',analytics_Storage:'denied'});call('stop');clearCookies();document.documentElement.dataset.analytics='off';}
  function load(){
    window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments);};
    call('consentv2',{ad_Storage:'denied',analytics_Storage:'granted'});
    script=document.createElement('script');script.async=true;script.src=`https://www.clarity.ms/tag/${PROJECT}`;script.referrerPolicy='no-referrer';script.id='clarity-opt-in';
    script.addEventListener('load',()=>{if(revoked){stop();return;}document.documentElement.dataset.analytics='loaded';});
    script.addEventListener('error',()=>{document.documentElement.dataset.analytics='unavailable';});
    document.documentElement.dataset.analytics='loading';document.head.append(script);
  }
  controller=createConsent({initial:signal?'denied':stored,eligible,load,stop,
    save(choice){try{localStorage.setItem(KEY,JSON.stringify({version:1,choice,expires:Date.now()+AGE}));}catch{/* Choice still applies to this page. */}},
    event(name){call('event',name);},reload(){location.reload();}});
  if(!controller.active)document.documentElement.dataset.analytics='off';
  const create=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  const panel=create('aside','analytics-consent');panel.id='analytics-preferences';panel.setAttribute('aria-labelledby','analytics-title');panel.setAttribute('data-clarity-mask','true');
  const heading=create('h2');heading.id='analytics-title';heading.tabIndex=-1;
  const description=create('p'),detail=create('details'),summary=create('summary'),explanation=create('p'),privacy=create('a');
  privacy.href='https://privacy.microsoft.com/privacystatement';privacy.target='_blank';privacy.rel='noopener noreferrer';
  detail.append(summary,explanation,privacy);
  const actions=create('div','analytics-actions'),accept=create('button','button secondary'),decline=create('button','button secondary'),close=create('button','text-button'),state=create('p','small muted');state.setAttribute('role','status');
  for(const button of [accept,decline,close])button.type='button';
  actions.append(accept,decline,close);panel.append(heading,description,detail,actions,state);document.body.append(panel);
  const preferences=create('button','text-button');preferences.type='button';preferences.setAttribute('aria-controls',panel.id);document.querySelector('.site-footer')?.append(preferences);
  function render(){
    heading.textContent=tx('¿Nos ayudas a mejorar esta web?','Help us improve this website?');
    description.textContent=tx('Solo si lo permites, Microsoft Clarity registra clics, desplazamientos y reproducciones de tu navegación para entender qué funciona. Los textos y campos del formulario se enmascaran. Puedes usar toda la web sin aceptar.','Only with your permission, Microsoft Clarity records clicks, scrolling and session replays to understand what works. Text and form fields are masked. You can use the entire site without accepting.');
    summary.textContent=tx('Cómo usamos estos datos','How we use this data');
    explanation.textContent=tx('Microsoft procesa los datos de uso y del dispositivo. No enviamos nombres, correos, mensajes ni importes como eventos. Las cookies analíticas se habilitan después de aceptar; la publicidad permanece desactivada. Guardamos tu elección durante 90 días. Puedes retirarla aquí: detendremos nuevas grabaciones, sin borrar retroactivamente las ya recogidas.','Microsoft processes usage and device data. We do not send names, emails, messages or amounts as events. Analytics cookies are enabled after accepting; advertising stays disabled. We remember your choice for 90 days. You can withdraw it here to stop new recording; this does not retroactively delete previous data.');
    privacy.textContent=tx('Privacidad de Microsoft ↗','Microsoft privacy ↗');
    preferences.textContent=tx('Privacidad y analítica','Privacy and analytics');accept.textContent=tx('Permitir analítica','Allow analytics');decline.textContent=tx('Rechazar analítica','Reject analytics');close.textContent=tx('Cerrar','Close');close.hidden=!controller.choice;accept.disabled=signal;
    state.textContent=signal?tx('Respetamos la señal de privacidad de tu navegador: analítica desactivada.','We respect your browser privacy signal: analytics disabled.'):!eligible?tx('En vistas locales o direcciones con parámetros no se recogen datos de Clarity.','Clarity does not collect data on local previews or URLs with query parameters.'):controller.choice==='accepted'?tx('Has permitido la analítica. Puedes cambiarlo cuando quieras.','You have allowed analytics. You can change this at any time.'):controller.choice==='denied'?tx('Analítica rechazada. Clarity no se carga en nuevas visitas.','Analytics rejected. Clarity will not load on new visits.'):tx('La analítica está apagada hasta que decidas.','Analytics stays off until you decide.');
  }
  function hide(){panel.hidden=true;preferences.setAttribute('aria-expanded','false');}
  function choose(value){controller.choose(value);render();hide();}
  accept.addEventListener('click',()=>{choose('accepted');controller.track(location.pathname.endsWith('cotizador.html')?'open_estimator':'visit_portfolio');});
  decline.addEventListener('click',()=>choose('denied'));close.addEventListener('click',hide);
  preferences.addEventListener('click',()=>{panel.hidden=false;preferences.setAttribute('aria-expanded','true');render();heading.focus({preventScroll:true});});
  document.addEventListener('portfolio:language',render);render();panel.hidden=Boolean(controller.choice);preferences.setAttribute('aria-expanded',String(!panel.hidden));
  window.addEventListener('storage',e=>{if(e.key===KEY){const next=readChoice(e.newValue);if(next!=='accepted'&&controller.choice!=='denied'){controller.choose('denied');render();hide();}}});
  document.addEventListener('click',e=>{
    const element=e.target.closest?.('a,button');if(!element||element.closest('#analytics-preferences'))return;
    if(element.matches('[data-open-dialog="cv-dialog"]'))controller.track('profile_open');
    if(element.matches('[data-open-axiom]'))controller.track('axiom_open');
    if(element.tagName==='A'){
      let url;try{url=new URL(element.href,location.href);}catch{return;}
      if(url.origin===location.origin&&url.pathname.endsWith('/cotizador.html'))controller.track('open_estimator');
      if(url.hostname==='www.paypal.com'&&url.pathname==='/donate/')controller.track('support_paypal_click');
      if(url.hostname==='www.patreon.com')controller.track('support_patreon_click');
      if(url.hostname==='github.com'&&/^\/sergioh-devsec\/(auth-log-analyzer|csv-task-organizer|web-design-showcase)(\/|$)/.test(url.pathname))controller.track('project_repository_click');
    }
  });
  document.addEventListener('portfolio:measurement',e=>controller.track(e.detail));
  controller.track(location.pathname.endsWith('cotizador.html')?'open_estimator':'visit_portfolio');
})();
