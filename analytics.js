/* Optional usage analytics. No SDK, network request or identifier before opt-in. */
(() => {
  'use strict';
  const KEY='cyberserch-analytics-v1', AGE=90*24*60*60*1000, PROJECT='z5jal39enl';
  const NOTICE_KEY='cyberserch-notice-v1';
  const HOSTS=["cyberserch.com", "sergioh-devsec.github.io"]; // Replaced from the canonical URL during publication.
  const REFERRALS=new Set(['fbclid','gclid','igshid','utm_source','utm_medium','utm_campaign','utm_content','utm_term']);
  const EVENTS=new Set(['visit_portfolio','open_estimator','estimate_download','enquiry_accepted','support_paypal_click','support_patreon_click','project_repository_click','profile_open','axiom_open','open_local_tools','cv_start','cv_diagnosis_seen','cv_preview_template_switch','cv_paywall_seen','cv_txt_download','cv_checkout_pro_click','cv_checkout_plus_click','cv_license_activated','recip_shown_dental','recip_shown_csv','recip_shown_logs','recip_coffee2_click','recip_support5_click','recip_dismiss','pro_waitlist_sent']);
  function readChoice(raw,now=Date.now()){
    try{const x=JSON.parse(raw);return x.version===1&&['accepted','denied'].includes(x.choice)&&Number.isFinite(x.expires)&&x.expires>now&&x.expires<=now+AGE?x.choice:null;}catch{return null;}
  }
  function allowedPage(location,privacySignal=false,hosts=HOSTS){
    const params=new URLSearchParams(location.search||'');
    const safe=[...params].every(([key,value])=>REFERRALS.has(key)||(key==='ruta'&&['business','creator','lab'].includes(value)));
    return !privacySignal&&location.protocol==='https:'&&hosts.includes(location.hostname)&&['/portafolio.html','/cotizador.html','/portafolio','/cotizador'].includes(location.pathname)&&safe;
  }
  function isEstimatorPath(pathname){return pathname==='/cotizador.html'||pathname==='/cotizador';}
  function noticeAnalyticsChoice(checked,privacySignal=false){return checked===true&&!privacySignal?'accepted':'denied';}
  function readNotice(raw,now=Date.now()){
    try{const x=JSON.parse(raw);return x.version===1&&['accepted','dismissed'].includes(x.choice)&&Number.isFinite(x.expires)&&x.expires>now&&x.expires<=now+AGE?x.choice:null;}catch{return null;}
  }
  function createConsent({initial=null,eligible=true,load,stop,save,event,reload}){
    let choice=initial,started=false,stopped=false;
    function start(){if(eligible&&choice==='accepted'&&!started){if(stopped){reload();return;}started=true;load();}}
    function choose(next){if(!['accepted','denied'].includes(next))return;choice=next;save(next);if(next==='denied'&&started){started=false;stopped=true;stop();}else start();}
    function track(name){if(started&&choice==='accepted'&&EVENTS.has(name))event(name);}
    start();return {choose,track,get choice(){return choice;},get active(){return started;}};
  }
  if(typeof module==='object'&&module.exports)module.exports={readChoice,readNotice,noticeAnalyticsChoice,allowedPage,isEstimatorPath,createConsent,KEY,NOTICE_KEY,AGE};
  if(typeof document==='undefined')return;
  const tx=key=>{const language=document.documentElement.lang==='en'?'en':'es',d=window.TRANSLATIONS||{};return d[language]?.[key]??d.es?.[key]??key;};
  const signal=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';
  const eligible=allowedPage(window.location,signal);
  let stored=null,noticeChoice=null;try{stored=readChoice(localStorage.getItem(KEY));noticeChoice=readNotice(localStorage.getItem(NOTICE_KEY));}catch{/* No storage: session choices only. */}
  let script=null,revoked=false,controller;
  function call(...args){if(typeof window.clarity==='function')window.clarity(...args);}
  function clearCookies(){
    for(const name of ['_clck','_clsk'])for(const domain of ['',`; domain=${location.hostname}`])document.cookie=`${name}=; Max-Age=0; path=/${domain}; SameSite=Lax; Secure`;
  }
  function stop(){revoked=true;call('consentv2',{ad_Storage:'denied',analytics_Storage:'denied'});call('stop');clearCookies();document.documentElement.dataset.analytics='off';}
  function load(){
    // Remove tracking identifiers before the SDK can read the document URL.
    const clean=new URL(location.href);for(const key of REFERRALS)clean.searchParams.delete(key);
    if(clean.href!==location.href)history.replaceState(history.state,'',clean.pathname+clean.search+clean.hash);
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
  const legal=create('nav','analytics-legal'),privacyNotice=create('a'),terms=create('a');
  privacyNotice.href='informacion#privacidad';terms.href='informacion#condiciones';legal.append(privacyNotice,terms);
  const detail=create('details'),summary=create('summary'),explanation=create('p'),privacy=create('a');
  privacy.href='https://privacy.microsoft.com/privacystatement';privacy.target='_blank';privacy.rel='noopener noreferrer';
  detail.append(summary,explanation,privacy);
  const option=create('div','analytics-option'),optionLabel=create('label'),check=create('input'),optionText=create('span'),hint=create('p','analytics-hint');
  check.type='checkbox';check.id='site-notice-analytics';check.checked=!signal&&controller.choice==='accepted';check.disabled=signal;check.setAttribute('aria-describedby','site-notice-analytics-hint');
  optionLabel.htmlFor=check.id;optionLabel.append(check,optionText);hint.id='site-notice-analytics-hint';option.append(optionLabel,hint);
  const actions=create('div','analytics-actions'),accept=create('button','button'),decline=create('button','text-button'),close=create('button','text-button'),state=create('p','small muted');state.setAttribute('role','status');state.setAttribute('aria-live','polite');
  accept.id='site-notice-accept';decline.id='site-notice-later';
  for(const button of [accept,decline,close])button.type='button';
  actions.append(accept,decline,close);panel.append(heading,legal,option,detail,actions,state);document.body.append(panel);
  const preferences=create('button','text-button');preferences.type='button';preferences.setAttribute('aria-controls',panel.id);document.querySelector('.site-footer')?.append(preferences);
  function render(){
    heading.textContent=tx('notice_title');privacyNotice.textContent=tx('notice_privacy');terms.textContent=tx('notice_terms');legal.setAttribute('aria-label',tx('notice_title'));
    summary.textContent=tx('notice_details');explanation.textContent=tx('notice_explanation');privacy.textContent=tx('notice_microsoft');
    optionText.textContent=tx('notice_analytics_label');hint.textContent=tx('notice_analytics_hint');
    preferences.textContent=tx('notice_preferences');accept.textContent=tx('notice_accept');decline.textContent=tx('notice_later');close.textContent=tx('notice_close');close.hidden=!noticeChoice;
    state.textContent=tx(signal?'notice_signal':!eligible?'notice_unrecorded':controller.choice==='accepted'?'notice_allowed':controller.choice==='denied'?'notice_denied':'notice_pending');
    state.hidden=!signal;
  }
  function syncExpanded(){preferences.setAttribute('aria-expanded',String(!panel.hidden));}
  function hide(){panel.hidden=true;syncExpanded();}
  function choose(value){const previous=controller.choice;controller.choose(signal?'denied':value);if(previous!=='accepted'&&controller.choice==='accepted')controller.track(isEstimatorPath(location.pathname)?'open_estimator':'visit_portfolio');check.checked=!signal&&controller.choice==='accepted';render();hide();document.dispatchEvent(new CustomEvent('portfolio:analytics-choice'));}
  function rememberNotice(choice){noticeChoice=choice;try{localStorage.setItem(NOTICE_KEY,JSON.stringify({version:1,choice,expires:Date.now()+AGE}));}catch{/* Acknowledgement still applies in this view. */}}
  accept.addEventListener('click',()=>{rememberNotice('accepted');choose(noticeAnalyticsChoice(check.checked,signal));});
  decline.addEventListener('click',()=>{rememberNotice('dismissed');choose('denied');});close.addEventListener('click',hide);
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){hide();preferences.focus({preventScroll:true});}});
  preferences.addEventListener('click',()=>{panel.hidden=false;check.checked=!signal&&controller.choice==='accepted';syncExpanded();render();heading.focus({preventScroll:true});});
  document.addEventListener('portfolio:language',render);render();panel.hidden=Boolean(noticeChoice);syncExpanded();
  window.SiteAnalytics={get choice(){return controller.choice;},get eligible(){return eligible;},get privacySignal(){return signal;},choose,track:name=>controller.track(name)};
  document.dispatchEvent(new CustomEvent('portfolio:analytics-ready'));
  window.addEventListener('storage',e=>{if(e.key===KEY){const next=readChoice(e.newValue);if(next!=='accepted'&&controller.choice!=='denied')choose('denied');}});
  document.addEventListener('click',e=>{
    const element=e.target.closest?.('a,button');if(!element||element.closest('#analytics-preferences'))return;
    if(element.matches('[data-open-dialog="cv-dialog"]'))controller.track('profile_open');
    if(element.matches('[data-open-axiom]'))controller.track('axiom_open');
    if(element.tagName==='A'){
      let url;try{url=new URL(element.href,location.href);}catch{return;}
      if(url.origin===location.origin&&['/herramientas','/herramientas.html'].includes(url.pathname))controller.track('open_local_tools');
      if(url.origin===location.origin&&isEstimatorPath(url.pathname))controller.track('open_estimator');
      if(url.hostname==='www.paypal.com'&&url.pathname==='/donate/')controller.track('support_paypal_click');
      if(url.hostname==='www.patreon.com')controller.track('support_patreon_click');
      if(url.hostname==='github.com'&&/^\/sergioh-devsec\/(revisa-accesos|ordena-tareas-csv|paginas-para-negocios)(\/|$)/.test(url.pathname))controller.track('project_repository_click');
    }
  });
  document.addEventListener('portfolio:measurement',e=>controller.track(e.detail));
  controller.track(isEstimatorPath(location.pathname)?'open_estimator':'visit_portfolio');
})();
