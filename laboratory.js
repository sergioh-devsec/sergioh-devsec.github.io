/* A small, local playground: no accounts, network calls, tracking or generated voice. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const api = window.LabMissions;
  if (!api) return;
  const copy = {
    es: {
      skip:'Ir a las misiones',back:'Volver al sitio',pause:'Pausar movimiento',resume:'Reanudar movimiento',help:'Cómo jugar',language:'Idioma',
      security:'Seguridad',network:'Redes',automation:'Automatización',explore:'Explorar',done:'Completada',caption:'Toca una estación. Axiom te acompaña.',
      eyebrow:'BIENVENIDO AL OTRO LADO',title:'Aquí se viene\na curiosear.',intro:'Soy Axiom, el ciberasistente de Serch. El laboratorio está abierto: elige una estación y resolvamos algo juntos.',
      progress:'Tu recorrido',missionSecurity:'Una alerta no lo dice todo',securityHint:'Seguridad · observa, contrasta, decide',missionNetwork:'Encuentra el camino',networkHint:'Redes · conecta las piezas',missionAutomation:'Menos vueltas, más orden',automationHint:'Automatización · diseña un flujo',
      secretHint:'Hay una señal fuera de lugar. No todo en este laboratorio es lo que parece.',download:'Descargar mi checklist',tip:'Sin cronómetro. Puedes equivocarte, aprender y volver a intentar. Tu avance dura esta visita.',
      footer:'Tres pequeñas simulaciones con datos ficticios. Ningún archivo se envía.',privacy:'Privacidad',terms:'Condiciones',project:'Tengo un proyecto',close:'Cerrar',
      helpTitle:'La curiosidad es el control.',helpBody:'Toca una estación en el mapa o elige una misión de la lista. Lee la situación, elige una respuesta y descubre por qué. Cada misión tiene tres decisiones.',
      helpKeys:'Con teclado: Tab para moverte, Enter o espacio para elegir y Escape para cerrar. Fuera de los campos, escribe AXIOM y observa qué pasa. En celular, toca la señal { ? }.',helpMotion:'Puedes pausar las animaciones. También respetamos la preferencia de movimiento reducido de tu dispositivo.',
      step:'Decisión',of:'de',correct:'Bien visto.',learn:'Vamos a revisar esa idea.',next:'Siguiente decisión',finish:'Ver mi resultado',replay:'Volver a intentar',return:'Volver al laboratorio',result:'Misión completada',score:'decisiones acertadas al primer intento.',practice:'Es una práctica con un escenario simplificado, no una evaluación profesional.',
      support:'La curiosidad no lleva factura.',supportBody:'Si quieres que este rincón siga creciendo, puedes poner el café. Seguir explorando y descargar la guía es gratis.',paypal:'Poner el café · PayPal',patreon:'Apoyar el laboratorio · Patreon',supportNote:'Apoyo voluntario. PayPal: aportación única; Patreon: suscripción mensual. Revisa el importe antes de confirmar.',
      secretTitle:'Encontraste el turno secreto.',secretBody:'Serch me dejó vigilando el laboratorio. Encontraste el único cajón que no dice «final_final_ahora_sí». Dentro hay una checklist para pensar tu próxima web, red o automatización con más orden.',secretFound:'Secreto descubierto · tu checklist está lista.',allDone:'Tres estaciones exploradas. Ya puedes llevarte la checklist del laboratorio.',
      voice:'Escuchar a Axiom',stopVoice:'Detener voz',voiceText:'«Bienvenido al laboratorio. Tú traes la curiosidad; yo pongo las ideas y algún chiste de dudosa rentabilidad.»',voiceError:'No se pudo reproducir. Puedes seguir explorando sin audio.',downloaded:'Checklist descargada. Puedes volver a guardarla cuando quieras.',moving:'Axiom se acerca a la estación…',map:'Mapa interactivo del laboratorio',signal:'Inspeccionar la señal misteriosa'
    },
    en: {
      skip:'Skip to missions',back:'Back to the website',pause:'Pause motion',resume:'Resume motion',help:'How to play',language:'Language',
      security:'Security',network:'Networks',automation:'Automation',explore:'Explore',done:'Completed',caption:'Choose a station. Axiom will join you.',
      eyebrow:'WELCOME TO THE OTHER SIDE',title:'A little curiosity.\nA lot to discover.',intro:'I’m Axiom, Serch’s cyber assistant. The lab is open: choose a station and let’s work something out together.',
      progress:'Your journey',missionSecurity:'One alert isn’t the whole story',securityHint:'Security · observe, compare, decide',missionNetwork:'Find the route',networkHint:'Networks · connect the pieces',missionAutomation:'Fewer steps, more order',automationHint:'Automation · build a workflow',
      secretHint:'Something in this room is out of place. Not everything is quite what it seems.',download:'Download my checklist',tip:'No timer. Make mistakes, learn and try again. Progress lasts for this visit.',
      footer:'Three small simulations using fictional data. No files are sent.',privacy:'Privacy',terms:'Terms',project:'I have a project',close:'Close',
      helpTitle:'Curiosity is your controller.',helpBody:'Tap a station on the map or choose a mission from the list. Read the situation, choose an answer and discover why. Each mission has three decisions.',
      helpKeys:'Keyboard: Tab to move, Enter or space to choose, Escape to close. Outside input fields, type AXIOM and see what happens. On mobile, tap the { ? } signal.',helpMotion:'You can pause animation. We also respect your device’s reduced-motion preference.',
      step:'Decision',of:'of',correct:'Good catch.',learn:'Let’s look at that idea.',next:'Next decision',finish:'See my result',replay:'Try again',return:'Back to the lab',result:'Mission completed',score:'correct decisions on your first attempt.',practice:'This is a simplified practice scenario, not a professional assessment.',
      support:'Curiosity comes with no invoice.',supportBody:'If you would like this little corner to grow, you can bring the coffee. Exploring and downloading the guide are free.',paypal:'Bring the coffee · PayPal',patreon:'Support the lab · Patreon',supportNote:'Optional support. PayPal: one-time contribution; Patreon: monthly membership. Review the amount before confirming.',
      secretTitle:'You found the secret shift.',secretBody:'Serch left me watching the lab. You found the only drawer that isn’t called “final_final_really_final”. Inside is a checklist to help plan your next website, network or automation.',secretFound:'Secret found · your checklist is ready.',allDone:'Three stations explored. Your lab checklist is ready to download.',
      voice:'Hear Axiom · Spanish',stopVoice:'Stop voice',voiceText:'Spanish recording: “Welcome to the laboratory. You bring the curiosity; I bring the ideas and the occasional questionably profitable joke.”',voiceError:'Playback failed. You can keep exploring without audio.',downloaded:'Checklist downloaded. You can save it again at any time.',moving:'Axiom is heading to the station…',map:'Interactive laboratory map',signal:'Inspect the mysterious signal'
    }
  };
  let language = document.documentElement.lang === 'en' ? 'en' : 'es';
  try { const saved=localStorage.getItem('cyberserch-language'); if (saved==='en'||saved==='es') language=saved; } catch (_) { /* A preference is optional. */ }
  const t = key => copy[language][key] || key;
  const runs=new Map(), completed=new Set();
  let active=null, secretFound=false, paused=false, moveTimer=0, lastTrigger=null, mode='mission', keyBuffer='', lastKey=0, voiceToken=0;
  const dialog=$('mission-dialog'), help=$('lab-help-dialog'), audio=$('lab-audio');
  const world=document.querySelector('.lab-world'), character=document.querySelector('.lab-character');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  try{paused=localStorage.getItem('cyberserch-motion')==='paused';}catch(_){ /* Optional accessibility preference. */ }
  function syncMotion(){
    document.body.classList.toggle('motion-paused',paused||reduced.matches);
    $('lab-motion').disabled=reduced.matches;
    $('lab-motion').setAttribute('aria-pressed',String(paused||reduced.matches));
    $('lab-motion').textContent=reduced.matches?(language==='es'?'Movimiento reducido':'Reduced motion'):t(paused?'resume':'pause');
  }
  function node(tag, text, className) { const element=document.createElement(tag); if(text!==undefined) element.textContent=text; if(className) element.className=className; return element; }
  function button(text, handler, className='') { const element=node('button',text,className); element.type='button'; element.addEventListener('click',handler); return element; }
  function stopAudio(){ voiceToken++;audio.pause(); audio.currentTime=0; $('lab-voice').setAttribute('aria-pressed','false'); $('lab-voice').textContent=t('voice'); }
  function cancelMove(){ clearTimeout(moveTimer); moveTimer=0; document.querySelector('.lab-world-caption').textContent=t('caption'); }
  function updateProgress(){
    $('lab-progress').value=completed.size; $('lab-progress-text').textContent=`${completed.size} / 3`;
    $('lab-progress').setAttribute('aria-label',`${t('progress')}: ${completed.size} / 3`);
    document.querySelectorAll('[data-station]').forEach(el=>{
      const done=completed.has(el.dataset.station); el.dataset.complete=String(done);
      const status=el.querySelector('.hotspot-status'); if(status) status.textContent=t(done?'done':'explore');
      const mark=el.querySelector('.station-mark'); if(mark) mark.textContent=done?'✓':'+';
    });
    if(secretFound||completed.size===3) {
      $('lab-reward').hidden=false; $('lab-discovery-text').textContent=t(secretFound?'secretFound':'allDone');
    }
  }
  function translate(){
    document.documentElement.lang=language; $('lab-language').value=language;
    document.querySelectorAll('[data-lab-copy]').forEach(el=>el.textContent=t(el.dataset.labCopy));
    syncMotion();
    world.setAttribute('aria-label',t('map')); $('lab-secret').setAttribute('aria-label',t('signal'));
    $('lab-stations').setAttribute('aria-label',language==='es'?'Misiones':'Missions');
    $('lab-voice-status').textContent=''; updateProgress();
    if(dialog.open) mode==='secret'?renderSecret():renderMission();
  }
  function resetDialog(){
    $('mission-feedback').hidden=true; $('mission-feedback').textContent='';
    $('mission-choices').replaceChildren(); $('mission-actions').replaceChildren();
    $('mission-evidence').hidden=false; $('mission-evidence').textContent='';
  }
  function focusTitle(){ $('mission-title').focus({preventScroll:true}); }
  function showMission(id,trigger){
    if(!['security','network','automation'].includes(id)||dialog.open||help.open) return;
    stopAudio(); cancelMove(); active=id; mode='mission';lastTrigger=trigger;
    if(!runs.has(id))runs.set(id,api.createRun(id));
    world.dataset.location=id; character.dataset.location=id;
    document.querySelector('.lab-world-caption').textContent=t('moving');
    moveTimer=setTimeout(()=>{
      cancelMove();renderMission();dialog.showModal();document.body.classList.add('lab-modal-open');focusTitle();
    },paused||reduced.matches?0:550);
  }
  function renderMission(){
    resetDialog();const data=api.getMission(active,language),run=runs.get(active),state=run.state;
    $('mission-kicker').textContent=`AXIOM / ${t(active).toLocaleUpperCase(language)}`;
    if(state.complete){renderResult(data,state);return;}
    const step=data.steps[state.step];
    $('mission-progress').textContent=`${t('step')} ${state.step+1} ${t('of')} ${state.total}`;
    $('mission-title').textContent=step.title;
    $('mission-body').textContent=step.body;
    $('mission-evidence').textContent=Array.isArray(step.evidence)?step.evidence.join('\n'):step.evidence;
    $('mission-evidence').hidden=!step.evidence;
    step.options.forEach(option=>{
      const choice=button(option.label,()=>{run.choose(option.id);renderMission();$('mission-next').focus({preventScroll:true});},'mission-choice');
      choice.dataset.option=option.id;
      if(state.feedback){
        choice.disabled=true;
        if(option.id===step.correct)choice.dataset.state='correct';
        else if(option.id===state.feedback.choice)choice.dataset.state='incorrect';
        choice.setAttribute('aria-pressed',String(option.id===state.feedback.choice));
      }
      $('mission-choices').append(choice);
    });
    if(state.feedback){
      const feedback=$('mission-feedback');feedback.hidden=false;feedback.dataset.state=state.feedback.correct?'correct':'incorrect';
      feedback.append(node('strong',t(state.feedback.correct?'correct':'learn')),node('p',step.explanation));
      const next=button(t(state.step===state.total-1?'finish':'next'),()=>{
        run.next();if(run.state.complete)completed.add(active);updateProgress();renderMission();focusTitle();
      }); next.id='mission-next';next.setAttribute('aria-describedby','mission-feedback');$('mission-actions').append(next);
    }
  }
  function support(){
    const box=node('section',undefined,'mission-result');
    box.append(node('h3',t('support')),node('p',t('supportBody')));
    const links=node('div',undefined,'reward-actions');
    [['paypal','https://www.paypal.com/donate/?hosted_button_id=D587QCAYURRYG'],['patreon','https://www.patreon.com/c/CyberserchMX/membership']].forEach(([key,url])=>{
      const link=node('a',t(key));link.href=url;link.target='_blank';link.rel='noopener noreferrer';links.append(link);
    });
    box.append(links,node('small',t('supportNote')));return box;
  }
  function renderResult(data,state){
    $('mission-progress').textContent=t('result');$('mission-title').textContent=data.title;
    $('mission-body').textContent=data.finish;$('mission-evidence').hidden=true;
    const result=node('div',undefined,'mission-result');result.append(node('strong',`${state.score} / ${state.total} ${t('score')}`),node('p',t('practice')));
    $('mission-choices').append(result);
    if(completed.size===3){ $('mission-choices').append(button(t('download'),download,'lab-reward-button')); }
    $('mission-choices').append(support());
    $('mission-actions').append(button(t('return'),()=>dialog.close()),button(t('replay'),()=>{runs.get(active).reset();renderMission();focusTitle();}));
  }
  function renderSecret(){
    resetDialog();$('mission-kicker').textContent='AXIOM / SECRET';$('mission-progress').textContent='✦ 01 / 01';
    $('mission-title').textContent=t('secretTitle');$('mission-body').textContent=t('secretBody');$('mission-evidence').hidden=true;
    $('mission-choices').append(button(t('download'),download,'lab-reward-button'),support());
    $('mission-actions').append(button(t('return'),()=>dialog.close()));
  }
  function revealSecret(trigger){
    if(dialog.open||help.open)return; cancelMove();stopAudio();mode='secret';secretFound=true;lastTrigger=trigger;
    $('lab-secret').dataset.found='true';updateProgress();renderSecret();dialog.showModal();document.body.classList.add('lab-modal-open');focusTitle();
  }
  function download(){
    const blob=new Blob([api.rewardText(language)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob);
    const link=node('a');link.href=url;link.download=`axiom-checklist-${language}.txt`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('lab-discovery-text').textContent=t('downloaded');
  }
  document.querySelectorAll('[data-station]').forEach(el=>el.addEventListener('click',()=>showMission(el.dataset.station,el)));
  document.querySelectorAll('[data-lab-close]').forEach(el=>el.addEventListener('click',()=>el.closest('dialog').close()));
  dialog.addEventListener('close',()=>{lastTrigger?.focus({preventScroll:true});});
  [dialog,help].forEach(modal=>modal.addEventListener('close',()=>document.body.classList.remove('lab-modal-open')));
  $('lab-help').addEventListener('click',()=>{cancelMove();stopAudio();help.showModal();document.body.classList.add('lab-modal-open');});
  $('lab-secret').addEventListener('click',event=>revealSecret(event.currentTarget));
  $('lab-reward').addEventListener('click',download);
  $('lab-motion').addEventListener('click',()=>{
    paused=!paused;syncMotion();
  });
  reduced.addEventListener('change',syncMotion);
  $('lab-language').addEventListener('change',event=>{stopAudio();cancelMove();language=event.target.value==='en'?'en':'es';translate();});
  $('lab-voice').addEventListener('click',async()=>{
    if(!audio.paused){stopAudio();return;}
    const token=++voiceToken;
    $('lab-voice-status').textContent=t('voiceText');
    try{await audio.play();if(token!==voiceToken)return;$('lab-voice').textContent=t('stopVoice');$('lab-voice').setAttribute('aria-pressed','true');}catch(error){if(token===voiceToken&&error.name!=='AbortError')$('lab-voice-status').textContent=t('voiceError');}
  });
  audio.addEventListener('ended',stopAudio);audio.addEventListener('error',()=>{stopAudio();$('lab-voice-status').textContent=t('voiceError');});
  document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('lab-hidden',document.hidden);if(document.hidden){stopAudio();cancelMove();}});
  window.addEventListener('pagehide',()=>{stopAudio();cancelMove();});
  document.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.target.closest('input,textarea,select,[contenteditable="true"]')||dialog.open||help.open)return;
    if(event.key.length!==1)return;
    const now=Date.now();if(now-lastKey>1800)keyBuffer='';lastKey=now;keyBuffer=(keyBuffer+event.key.toLowerCase()).slice(-5);
    if(keyBuffer==='axiom'){keyBuffer='';revealSecret($('lab-secret'));}
  });
  translate();
})();
