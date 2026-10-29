/* Honest evidence notes, never fabricated customers, purchases or visitor counts. */
(() => {
  'use strict';
  const I=window.I18N,toast=document.getElementById('proof-toast');let dismissed=false,fact=0,visibleTimer=0;const started=performance.now();
  try{dismissed=sessionStorage.getItem('cyberserch-notes-dismissed')==='1';}catch{/* Session memory fallback below. */}
  function hide(){toast.hidden=true;clearTimeout(visibleTimer);}
  function show(){if(dismissed||window.AXIOM?.trialActive||document.hidden||document.querySelector('dialog[open]')||!document.getElementById('axiom-panel').hidden||matchMedia('(prefers-reduced-motion:reduce)').matches)return;document.getElementById('proof-message').textContent=I.t('fact'+(fact+1));fact=(fact+1)%3;toast.hidden=false;visibleTimer=setTimeout(hide,7000);}
  document.getElementById('proof-dismiss').addEventListener('click',()=>{dismissed=true;hide();try{sessionStorage.setItem('cyberserch-notes-dismissed','1');}catch{/* In-memory dismissal still applies. */}});
  // At most three factual notes per page visit; no artificial activity stream.
  [22000,70000,130000].forEach(ms=>setTimeout(show,ms));
  document.addEventListener('portfolio:language',hide);document.addEventListener('visibilitychange',hide);document.addEventListener('portfolio:axiom-open',hide);
  document.addEventListener('portfolio:axiom-trial',hide);
  document.addEventListener('portfolio:axiom-idle',()=>{dismissed=true;exitSeen=true;hide();});
  let exitSeen=false;try{exitSeen=sessionStorage.getItem('cyberserch-exit-seen')==='1';}catch{/* In-memory fallback. */}
  document.addEventListener('mouseout',event=>{
    if(exitSeen||window.AXIOM?.trialActive||event.relatedTarget!==null||event.clientY>3||event.clientY<0||performance.now()-started<45000||scrollY<250||!matchMedia('(hover:hover) and (pointer:fine)').matches||document.hidden||document.querySelector('dialog[open]')||!document.getElementById('axiom-panel').hidden)return;
    exitSeen=true;try{sessionStorage.setItem('cyberserch-exit-seen','1');}catch{/* In-memory fallback. */}hide();window.Site.openDialog('exit-dialog',document.activeElement);
  });
})();
