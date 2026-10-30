/* A short written guide with the existing, approved Axiom recordings only. */
(() => {
  'use strict';
  const root=document.getElementById('quote-guide');if(!root)return;
  const I=window.I18N,voice=document.getElementById('quote-guide-voice'),status=document.getElementById('quote-guide-status'),line=document.getElementById('quote-guide-line');
  const player=new Audio();player.preload='none';player.id='quote-guide-audio';player.hidden=true;root.append(player);let step=1,kind='landing',playing=false,generation=0;
  const clips={landing:'12_web.mp3',information:'12_web.mp3',custom:'12_web.mp3',automation:'13_automatizacion.mp3',security:'15_seguridad.mp3'};
  function render(){line.textContent=I.t('quoteGuide'+step);root.querySelectorAll('[data-guide-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.guideStep)===step)));voice.textContent=I.t(playing?'quoteGuideMute':'quoteGuideListen');voice.setAttribute('aria-pressed',String(playing));}
  function stop(){generation++;player.pause();player.currentTime=0;playing=false;render();}
  root.addEventListener('click',event=>{const button=event.target.closest('[data-guide-step]');if(button){step=Number(button.dataset.guideStep);render();}});
  document.getElementById('quote-packages').addEventListener('click',event=>{const button=event.target.closest('[data-quote-kind]');if(button&&Object.hasOwn(clips,button.dataset.quoteKind)){stop();kind=button.dataset.quoteKind;step=2;render();}});
  voice.addEventListener('click',async()=>{if(playing){stop();return;}const token=++generation;player.src='assets/axiom/audio/'+(I.language==='en'?'saludo_en.mp3':clips[kind]);playing=true;status.textContent='';render();try{await player.play();}catch{if(token!==generation)return;playing=false;status.textContent=I.t('quoteGuideAudioError');render();}});
  player.addEventListener('ended',()=>{playing=false;render();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});document.addEventListener('portfolio:language',()=>{stop();status.textContent='';});
  window.addEventListener('pagehide',stop);render();
})();
