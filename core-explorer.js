/* Small accessible controls around the original core.js visual. No network. */
(() => {
  'use strict';
  const root=document.documentElement,scene=document.querySelector('.core-scene');
  const art=document.getElementById('core-parallax'),button=document.getElementById('core-motion');
  if(!scene||!art||!button)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const t=key=>window.I18N.t(key);
  let userPaused=root.classList.contains('motion-paused')||root.dataset.motion==='paused',x=0,y=0;
  function renderMode(){
    const mode={ai:['corePageAILabel','corePageAIName'],security:['corePageSecurityLabel','coreSecurity'],software:['corePageSoftwareLabel','coreSoftware']}[scene.dataset.mode];
    if(!mode)return;
    document.getElementById('core-kicker').textContent=t(mode[0]);
    document.getElementById('core-mode-label').textContent=t(mode[1]);
  }
  function syncMotion(){
    const paused=userPaused||reduced.matches;
    root.classList.toggle('motion-paused',paused);root.dataset.motion=paused?'paused':'active';
    button.setAttribute('aria-pressed',String(paused));button.dataset.i18n=paused?'resumeMotion':'pauseMotion';
    button.textContent=t(button.dataset.i18n);button.disabled=reduced.matches;
    document.getElementById('core-motion-note').dataset.i18n=reduced.matches?'corePageReduced':'corePageLocal';
    document.getElementById('core-motion-note').textContent=t(reduced.matches?'corePageReduced':'corePageLocal');
    x=0;y=0;art.style.transform='';
    document.dispatchEvent(new CustomEvent('portfolio:motion',{detail:{paused}}));
  }
  button.addEventListener('click',()=>{userPaused=!userPaused;syncMotion();});
  for(const mode of scene.querySelectorAll('[data-core-mode]'))mode.addEventListener('click',renderMode);
  art.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    event.preventDefault();
    if(userPaused||reduced.matches)return;
    if(event.key==='Home'){x=0;y=0;art.style.transform='';return;}
    if(event.key==='ArrowLeft')x-=.2;if(event.key==='ArrowRight')x+=.2;
    if(event.key==='ArrowUp')y-=.2;if(event.key==='ArrowDown')y+=.2;
    x=Math.max(-1,Math.min(1,x));y=Math.max(-1,Math.min(1,y));
    art.style.transform=`rotateX(${-y*9}deg) rotateY(${x*12}deg) translate3d(${x*4}px,${y*3}px,0)`;
  });
  art.addEventListener('blur',()=>{x=0;y=0;art.style.transform='';});
  document.addEventListener('portfolio:language',()=>{renderMode();syncMotion();});
  reduced.addEventListener('change',syncMotion);
  renderMode();syncMotion();
})();
