/* Original orbital lab explorer. Pointer/touch tilt never blocks page scrolling. */
(() => {
  'use strict';
  const scene=document.querySelector('.core-scene');if(!scene)return;
  const art=document.getElementById('core-parallax'),description=document.getElementById('core-description');
  const buttons=[...scene.querySelectorAll('[data-core-mode]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const modes={ai:['LOCAL','INTELLIGENCE','coreAIDescription'],security:['DEFENSIVE','SECURITY','coreSecurityDescription'],software:['BUILD','SOFTWARE','coreSoftwareDescription']};
  const paused=()=>reduced.matches||document.documentElement.classList.contains('motion-paused');
  function render(){const mode=modes[scene.dataset.mode];document.getElementById('core-kicker').textContent=mode[0];document.getElementById('core-mode-label').textContent=mode[1];description.dataset.i18n=mode[2];description.textContent=window.I18N.t(mode[2]);buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.coreMode===scene.dataset.mode)));}
  buttons.forEach(b=>b.addEventListener('click',()=>{if(!Object.hasOwn(modes,b.dataset.coreMode))return;scene.dataset.mode=b.dataset.coreMode;render();}));
  let frame=0,x=0,y=0;
  function reset(){cancelAnimationFrame(frame);frame=0;art.style.transform='';}
  art.addEventListener('pointermove',e=>{if(paused())return;const r=art.getBoundingClientRect();x=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1));y=Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1));if(!frame)frame=requestAnimationFrame(()=>{frame=0;art.style.transform=`rotateX(${-y*9}deg) rotateY(${x*12}deg) translate3d(${x*4}px,${y*3}px,0)`;});},{passive:true});
  ['pointerleave','pointerup','pointercancel'].forEach(event=>art.addEventListener(event,reset,{passive:true}));
  document.addEventListener('portfolio:motion',reset);document.addEventListener('portfolio:language',render);reduced.addEventListener('change',reset);
  document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('page-hidden',document.hidden);if(document.hidden)reset();});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>entries.forEach(e=>scene.classList.toggle('offscreen',!e.isIntersecting))).observe(scene);
  render();
})();
