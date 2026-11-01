/* Local, consent-gated funnel counters. No SDK, requests, identifiers, form
 * values or persistent event history. Counts disappear when this page closes.
 * Clarity remains restricted to its pre-existing eligible pages. */
(() => {
  'use strict';
  const KEY='cyberserch-analytics-v1', AGE=90*24*60*60*1000;
  const EVENTS=Object.freeze([
    'cv_start','cv_diagnosis_seen','cv_preview_template_switch','cv_paywall_seen',
    'cv_txt_download','cv_checkout_pro_click','cv_checkout_plus_click','cv_license_activated',
    'recip_shown_dental','recip_shown_csv','recip_shown_logs','recip_coffee2_click',
    'recip_support5_click','recip_dismiss','pro_waitlist_sent'
  ]);
  const ALLOWED=new Set(EVENTS), MAX_COUNT=1000;
  function readChoice(raw,now=Date.now()) {
    try {
      const record=JSON.parse(raw);
      return record?.version===1&&['accepted','denied'].includes(record.choice)
        &&Number.isFinite(record.expires)&&record.expires>now&&record.expires<=now+AGE
        ?record.choice:null;
    } catch { return null; }
  }
  function createMeasurement({initial=null,privacySignal=false}={}) {
    let choice=privacySignal?'denied':initial;
    const counts=Object.create(null);
    function clear(){for(const name of Object.keys(counts))delete counts[name];}
    function choose(next) {
      choice=privacySignal?'denied':(['accepted','denied'].includes(next)?next:null);
      if(choice!=='accepted')clear();
    }
    function track(name) {
      if(choice!=='accepted'||typeof name!=='string'||!ALLOWED.has(name))return false;
      counts[name]=Math.min(MAX_COUNT,(counts[name]||0)+1);return true;
    }
    return Object.freeze({choose,track,clear,
      snapshot(){return Object.freeze({...counts});},
      get choice(){return choice;},get active(){return choice==='accepted';}});
  }
  if(typeof module==='object'&&module.exports)module.exports={createMeasurement,readChoice,EVENTS,KEY,AGE,MAX_COUNT};
  if(typeof document==='undefined')return;
  const privacySignal=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';
  function choice(){try{return readChoice(localStorage.getItem(KEY));}catch{return null;}}
  const controller=createMeasurement({initial:choice(),privacySignal});
  document.addEventListener('portfolio:measurement',event=>controller.track(event.detail));
  document.addEventListener('portfolio:analytics-choice',()=>controller.choose(window.SiteAnalytics?.choice??choice()));
  window.addEventListener('storage',event=>{if(event.key===KEY)controller.choose(readChoice(event.newValue));});
  window.FunnelMeasurement=controller;
})();
