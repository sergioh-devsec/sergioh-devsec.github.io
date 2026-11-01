/* Written guidance and the same original-recording player used by the site. */
(() => {
  'use strict';
  const root=document.getElementById('quote-guide');if(!root)return;
  const I=window.I18N,voice=document.getElementById('quote-guide-voice'),status=document.getElementById('quote-guide-status'),line=document.getElementById('quote-guide-line');
  const topics={landing:'webTerm',information:'webTerm',custom:'webTerm',automation:'automationTerm',security:'securityTerm'};
  let step=1,kind='landing',hub;
  function render(){line.textContent=I.t('quoteGuide'+step);root.querySelectorAll('[data-guide-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.guideStep)===step)));hub?.refresh();}
  voice.disabled=true;
  import('./page-voice.js?v=voice-5').then(({mountPageVoice,bindVoiceButton,voiceText})=>{
    hub=mountPageVoice({initialKey:'webTerm'});voice.disabled=false;
    bindVoiceButton(voice,{hub,key:()=>topics[kind]});
    hub.subscribe(state=>{status.textContent=state.error?voiceText('voice_error'):state.playing?voiceText('voice_playing'):'';});
  }).catch(()=>{status.textContent=I.t('quoteGuideAudioError');});
  root.addEventListener('click',event=>{const button=event.target.closest('[data-guide-step]');if(button){step=Number(button.dataset.guideStep);render();}});
  document.getElementById('quote-packages').addEventListener('click',event=>{const button=event.target.closest('[data-quote-kind]');if(button&&Object.hasOwn(topics,button.dataset.quoteKind)){kind=button.dataset.quoteKind;step=2;render();void hub?.cue(topics[kind]);}});
  document.addEventListener('portfolio:language',render);render();
})();
