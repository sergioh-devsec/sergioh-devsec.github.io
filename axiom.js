/* Axiom: bounded local guide + layered Canvas rig adapted from the supplied assets.
   No microphone, remote model, analytics, chat storage or HTML insertion. */
(() => {
  'use strict';
  function normalize(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();}
  const intents=[
    ['tellJoke',['chiste','chistes','broma','bromas','joke','jokes'],''],
    ['cvAnswer',['cv','curriculum','resume'],'#contact'],['contactAnswer',['contacto','contact','correo','email','precio','price'],'#contact'],
    ['supportAnswer',['apoyar','apoyo','support','donar','donate','paypal','patreon'],'#apoyar'],
    ['webTerm',['web','website','pagina','software'],'#services'],['automationTerm',['automatizacion','automatizar','automation','automate'],'#automation'],
    ['aiTerm',['ia local','local ai','llm','inteligencia artificial','artificial intelligence'],'#local-ai-platform'],
    ['securityTerm',['seguridad','security','ciberseguridad','cybersecurity'],'#services'],['osintTerm',['osint'],'#technologies'],['siemTerm',['siem','wazuh'],'#laboratory'],['hardeningTerm',['hardening'],'#technologies'],
    ['conversionTerm',['conversion','suscriptores','subscribers','seguidores','followers'],'#creadoras'],
    ['who',['quien eres','who are you'],''],['thanks',['gracias','thanks','thank you'],'','gracias'],['bye',['adios','bye','goodbye'],'','adios'],['welcome',['hola','hello','hi'],'']
  ];
  function matchIntent(value){const text=' '+normalize(value)+' ';return intents.find(([,words])=>words.some(w=>text.includes(' '+w+' ')))||null;}
  function trialStep(index,jokes=['trialJoke1','trialJoke2','trialJoke3']){if(!Number.isInteger(index)||index<0)throw new Error('Invalid trial index');const slot=index%4;return slot===3?{key:'trialInvite',clip:'support',donation:true}:{key:jokes[slot],clip:'joke'+(slot+1),donation:false};}
  function createJokeDeck(keys,random=Math.random){
    const pool=[...new Set(keys)].filter(k=>/^trialJoke\d+$/.test(k));if(pool.length<3)throw new Error('At least three jokes are required');
    let remaining=[];
    return function draw(count=3){
      if(!Number.isInteger(count)||count<1||count>pool.length)throw new Error('Invalid joke count');
      const chosen=[];
      while(chosen.length<count){
        if(!remaining.length){remaining=pool.filter(k=>!chosen.includes(k));for(let i=remaining.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))));[remaining[i],remaining[j]]=[remaining[j],remaining[i]];}}
        const key=remaining.shift();if(!chosen.includes(key))chosen.push(key);
      }
      return chosen;
    };
  }
  function resolveAudio(key,language,catalog){
    if(!['es','en'].includes(language)||typeof key!=='string'||!catalog||!Object.hasOwn(catalog,language))return null;
    const clips=catalog[language];if(!clips||!Object.hasOwn(clips,key))return null;
    const file=clips[key];return typeof file==='string'&&/^[a-z0-9][a-z0-9_-]*\.mp3$/.test(file)?file:null;
  }
  // Wait for a recording to end before starting the next ten-second pause.
  // Generations prevent stopped or restarted trials from resuming after an old promise settles.
  function createTrialSequence({schedule,cancel,present,finish,chooseJokes=()=>['trialJoke1','trialJoke2','trialJoke3'],chooseInvite=()=> 'trialInvite'}){
    let active=false,generation=0,index=0,timer=null,jokes=[],invite=null;
    function stop(){active=false;generation++;if(timer!==null)cancel(timer);timer=null;index=0;}
    function queue(token){timer=schedule(()=>tick(token),10000);}
    async function tick(token){
      if(!active||token!==generation)return;timer=null;if(index===3&&!invite){active=false;finish();return;}const step=index===3?{key:invite,donation:true}:trialStep(index,jokes);index++;
      try{await present(step);}catch{if(active&&token===generation){stop();finish();}return;}
      if(!active||token!==generation)return;
      if(step.donation||(index===3&&!invite)){active=false;finish();}else queue(token);
    }
    return {start(){stop();jokes=chooseJokes();invite=chooseInvite();if(jokes.length<3){finish();return;}active=true;queue(generation);},stop,get active(){return active;}};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={normalize,matchIntent,trialStep,resolveAudio,createTrialSequence,createJokeDeck};
  if(typeof document==='undefined')return;
  const I=window.I18N,S=window.Site,K=window.AxiomKnowledge,$=id=>document.getElementById(id),panel=$('axiom-panel'),messages=$('axiom-messages'),chips=$('axiom-chips'),input=$('axiom-input');
  const catalog=window.PORTFOLIO.axiomAudio,variants=window.PORTFOLIO.axiomVariants||{},glossary=window.AXIOM_GLOSSARY||[];
  let opener=null,lastResponse={key:'welcome'},voiceEnabled=true,turn=0,speaking=false,waveAt=-10000,playbackDone=null,voiceContext=null,manualJokes=0,activeRoute='lab',activeTerm=null,adultKey=null;
  const audio=$('axiom-audio'),tone=$('axiom-tone');
  try{const saved=localStorage.getItem('cyberserch-tone');if(['professional','playful'].includes(saved))tone.value=saved;}catch{/* Optional preference. */}
  const visit=K.createVisit({onReset(){stopTrial();manualJokes=0;setVoiceStatus('visitRenewed');}});
  const phraseId=key=>resolveAudio(key,'es',catalog)||key;
  const fresh=keys=>keys.filter(key=>!visit.has(phraseId(key)));
  function chooseKey(key){const freshChoices=fresh(variants[key]||[key]),recorded=freshChoices.filter(k=>resolveAudio(k,I.language,catalog));const choices=voiceEnabled&&recorded.length?recorded:freshChoices;return choices.length?choices[Math.floor(Math.random()*choices.length)]:null;}
  function remember(key){const added=visit.mark(phraseId(key));syncCounters();return added;}
  function syncCounters(){const state=visit.tick(),s=Math.floor(state.elapsed/1000);$('axiom-elapsed').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');$('axiom-phrase-count').textContent=String(state.count);}
  setInterval(syncCounters,1000);
  function settlePlayback(played=false){const done=playbackDone;playbackDone=null;if(done)done(played);}
  function stopVoice(){turn++;settlePlayback();voiceContext=null;audio.pause();audio.removeAttribute('src');audio.load();speaking=false;syncVoice();}
  function syncVoice(){const button=$('axiom-voice');button.setAttribute('aria-pressed',String(voiceEnabled));button.querySelector('[data-i18n]').dataset.i18n=voiceEnabled?'voiceOn':'voiceOff';I.apply(button);$('axiom-trial-listen').disabled=!audio.paused&&!audio.ended;document.querySelectorAll('[data-listen-key]').forEach(b=>{const playing=speaking&&lastResponse.key===b.dataset.listenKey;b.dataset.i18n=playing?'stopClip':(b.dataset.listenLabel||'trialListen');b.textContent=I.t(b.dataset.i18n);b.setAttribute('aria-pressed',String(playing));});}
  function resetVoice(){stopVoice();setVoiceStatus('voiceReady');}
  function setVoiceStatus(key){$('axiom-voice-status').textContent=I.t(key);$('axiom-trial-status').textContent=I.t(key);}
  function currentClip(key=lastResponse.key){return resolveAudio(key,I.language,catalog);}
  function listenKey(key){if(speaking&&lastResponse.key===key){stopVoice();return;}lastResponse={key};voiceEnabled=true;playResponse();}
  function playResponse(){
    stopVoice();if(!voiceEnabled){setVoiceStatus('voiceMuted');return Promise.resolve(false);}
    const file=currentClip(),currentTurn=turn;
    if(!file){setVoiceStatus('voiceUnavailable');return Promise.resolve(false);}
    voiceContext=document.querySelector('dialog[open]')?.id||(panel.hidden?'trial':'axiom');audio.src=`assets/axiom/audio/${file}`;setVoiceStatus('voiceLoading');
    return new Promise(resolve=>{playbackDone=resolve;audio.play().catch(()=>{if(turn===currentTurn){speaking=false;syncVoice();setVoiceStatus('voiceFailed');settlePlayback();}});});
  }
  audio.addEventListener('playing',()=>{if(audio.paused||!audio.hasAttribute('src'))return;speaking=true;syncVoice();setVoiceStatus('voiceRecorded');});
  ['pause','ended'].forEach(event=>audio.addEventListener(event,()=>{if(!audio.paused&&!audio.ended)return;speaking=false;syncVoice();settlePlayback(audio.ended);}));
  audio.addEventListener('emptied',()=>{if(!audio.hasAttribute('src')){speaking=false;syncVoice();}});
  audio.addEventListener('error',()=>{if(!audio.hasAttribute('src')||!audio.error)return;speaking=false;syncVoice();setVoiceStatus('voiceFailed');settlePlayback();});
  function clearConversation(){stopTrial();messages.replaceChildren();chips.replaceChildren();input.value='';lastResponse={key:null};showRoutes();setVoiceStatus('chatCleared');input.focus({preventScroll:true});}
  const trial=createTrialSequence({schedule:setTimeout,cancel:clearTimeout,chooseJokes(){const pool=fresh(window.PORTFOLIO.axiomJokes);for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.length>=3?pool.slice(0,3):[];},chooseInvite:()=>chooseKey('supportAnswer'),present(step){
    if(document.hidden||document.querySelector('dialog[open]')){stopTrial();return;}
    remember(step.key);lastResponse={key:step.key};$('axiom-trial-text').textContent=I.t(step.key);$('axiom-trial-support').hidden=!step.donation;$('axiom-trial-listen').hidden=!currentClip();return playResponse();
  },finish(){$('axiom-trial').setAttribute('aria-pressed','false');$('axiom-trial-stop').textContent=I.t('trialDone');}});
  function stopTrial(){trial.stop();stopVoice();$('axiom-trial').setAttribute('aria-pressed','false');$('axiom-trial-bubble').hidden=true;}
  function startTrial(){stopTrial();close(false,true);visit.start();$('axiom-trial').setAttribute('aria-pressed','true');$('axiom-trial-bubble').hidden=false;$('axiom-trial-support').hidden=true;$('axiom-trial-listen').hidden=true;$('axiom-trial-status').textContent='';$('axiom-trial-text').textContent=I.t(fresh(window.PORTFOLIO.axiomJokes).length>=3?'trialWaiting':'jokesDone');$('axiom-trial-stop').textContent=I.t('trialStop');$('axiom-trial-stop').focus({preventScroll:true});trial.start();document.dispatchEvent(new CustomEvent('portfolio:axiom-trial'));}
  function addMessage(text,user=false){const n=S.el('div','axiom-message'+(user?' user':''));n.append(S.el('p','',text));messages.append(n);while(messages.children.length>14)messages.firstElementChild.remove();messages.scrollTop=messages.scrollHeight;return n;}
  function actionLink(n,label,hash){const a=S.link(label,hash);if(!a)return;a.addEventListener('click',()=>close(false));n.append(a);}
  function answer(base,hash=''){
    const key=chooseKey(base);if(!key){stopVoice();lastResponse={key:null};return {node:addMessage(I.t('phraseSeen')),done:Promise.resolve(false),turn};}
    remember(key);lastResponse={key};const n=addMessage(I.t(key));if(hash)actionLink(n,I.t('goSection'),hash);const done=playResponse();return {node:n,done,turn};
  }
  function makeButton(parent,label,action,cls='chip'){const b=S.el('button',cls,label);b.type='button';b.addEventListener('click',()=>{action();if(!b.isConnected&&!panel.hidden)chips.querySelector('button')?.focus({preventScroll:true});});parent.append(b);return b;}
  function makeChip(key,action){return makeButton(chips,I.t(key),action);}
  function showRoutes(){chips.replaceChildren();[['routeBusiness','business'],['routeCreator','creator'],['routeLab','lab']].forEach(([key,route])=>makeChip(key,()=>chooseRoute(route)));makeChip('glossary',openGlossary);if(tone.value==='playful')makeChip('tellJoke',sayJoke);}
  function support(){chips.replaceChildren();const result=answer('supportAnswer');const n=result.node;[['Patreon ↗','https://www.patreon.com/c/CyberserchMX/membership'],['PayPal ↗','https://www.paypal.com/donate/?hosted_button_id=D587QCAYURRYG']].forEach(([label,url])=>n.append(S.link(label,url)));makeChip('continueExplore',showRoutes);}
  function wrapRoute(){chips.replaceChildren();answer({business:'businessWrap',creator:'creatorWrap',lab:'labWrap'}[activeRoute]);makeChip('voluntarySupport',support);makeChip('continueExplore',showRoutes);if(tone.value==='playful')makeChip('tellJoke',sayJoke);}
  function topic(key,hash){chips.replaceChildren();answer(key,hash);makeChip('nextIdea',()=>chooseRoute(activeRoute));makeChip('finishRoute',wrapRoute);makeChip('glossary',openGlossary);}
  async function sayJoke(){
    chips.replaceChildren();const pool=fresh(window.PORTFOLIO.axiomJokes);if(!pool.length){stopVoice();addMessage(I.t('jokesDone'));makeChip('showRoutes',showRoutes);return;}
    const response=answer(pool[Math.floor(Math.random()*pool.length)]);makeChip('anotherJoke',sayJoke);makeChip('showRoutes',showRoutes);
    const played=await response.done;if(turn!==response.turn||panel.hidden||(!played&&voiceEnabled))return;
    manualJokes++;if(manualJokes%3===0&&chooseKey('supportAnswer')){answer('supportAnswer','#apoyar');makeChip('voluntarySupport',support);}
  }
  function chooseRoute(route){activeRoute=route;chips.replaceChildren();
    if(route==='creator'){answer('creatorAnswer');makeChip('creatorMore',()=>S.openDialog('creator-dialog',$('creators-open')));makeButton(chips,I.language==='es'?'Organizar publicaciones':'Organize publishing',()=>topic('contentTerm','#content'));}
    else if(route==='business'){answer('businessAnswer');[['webTerm','#services','Web'],['automationTerm','#automation',I.language==='es'?'Automatización':'Automation'],['aiTerm','#local-ai-platform','IA / AI'],['securityTerm','#services',I.language==='es'?'Seguridad':'Security']].forEach(([key,hash,label])=>makeButton(chips,label,()=>topic(key,hash)));}
    else {answer('labAnswer');makeButton(chips,I.language==='es'?'Analizar eventos':'Analyze events',()=>topic('siemTerm','#laboratory'));makeButton(chips,I.language==='es'?'Probar automatización':'Try automation',()=>topic('automationTerm','#automation'));makeButton(chips,I.language==='es'?'Explorar esta web':'Explore this website',()=>topic('webTerm','#cases'));}
    makeChip('finishRoute',wrapRoute);makeChip('showRoutes',showRoutes);
  }
  function open(source,withGreeting=true){stopTrial();visit.start();if(!panel.hidden)return;opener=source||document.activeElement;panel.hidden=false;$('axiom-launcher').setAttribute('aria-expanded','true');waveAt=performance.now();if(!messages.children.length){if(withGreeting)answer('welcome');showRoutes();}document.dispatchEvent(new CustomEvent('portfolio:axiom-open'));$('axiom-close').focus({preventScroll:true});}
  function close(restore=true,keepTrial=false){if(!keepTrial)stopTrial();if(panel.hidden){stopVoice();return;}panel.hidden=true;$('axiom-launcher').setAttribute('aria-expanded','false');resetVoice();if(restore&&opener?.isConnected)opener.focus({preventScroll:true});}
  function searchPage(value){const words=normalize(value).split(' ').filter(w=>w.length>2&&!['que','como','los','las','the','what','how','can','una','del','para'].includes(w));if(!words.length)return[];const ids=['cases','automation','services','contact','content','projects','laboratory','technologies','certifications','experience','apoyar'];return ids.map(id=>{const n=$(id),heading=n?.querySelector('summary,h2,h3');return {id,label:heading?.textContent||id,text:normalize(n?.textContent||'')};}).filter(item=>words.some(w=>(' '+item.text+' ').includes(' '+w+' '))).slice(0,3);}
  function renderTerm(entry,target,chat=false){
    activeTerm=entry;const key=entry.key,isNew=remember(key);lastResponse={key};target.replaceChildren();target.append(S.el('h3','',entry.label[I.language]),S.el('p','',I.t(key)),S.el('strong','small',I.t('glossaryExample')),S.el('p','small',entry.example[I.language]));
    const source=S.link(I.t('glossarySource'),entry.source);if(source)target.append(source);
    const related=S.el('div','glossary-related');related.append(S.el('span','small muted',I.t('glossaryRelated')));entry.related.forEach(id=>{const other=glossary.find(x=>x.id===id);if(other)makeButton(related,other.label[I.language],()=>chat?answerTerm(other):renderTerm(other,target));});target.append(related);
    if(isNew&&chat)playResponse();else stopVoice();
    if(!chat&&currentClip(key)){const b=makeButton(target,I.t('trialListen'),()=>listenKey(key));b.dataset.listenKey=key;syncVoice();}
  }
  function answerTerm(entry){const node=addMessage('');renderTerm(entry,node,true);chips.replaceChildren();makeChip('glossaryNew',openGlossary);makeChip('finishRoute',wrapRoute);makeChip('showRoutes',showRoutes);messages.scrollTop=messages.scrollHeight;}
  function suggestMatches(matches){addMessage(I.t('glossarySuggest'));matches.slice(0,4).forEach(({entry})=>makeButton(chips,entry.label[I.language],()=>answerTerm(entry)));makeChip('glossary',openGlossary);}
  function ask(value){
    stopTrial();const raw=String(value).trim().slice(0,240);if(!raw)return;visit.start();addMessage(raw,true);input.value='';chips.replaceChildren();
    const intent=matchIntent(raw),matches=K.search(raw,glossary),definition=/\b(que es|que significa|define|definicion|significa|what is|what does|meaning|difference|diferencia)\b/.test(normalize(raw));
    if(intent?.[0]==='tellJoke'){sayJoke();return;}
    if(matches.length&&(definition||!intent||matches.some(m=>m.entry.aliases.some(a=>normalize(a)===normalize(raw))))){if(matches.length===1&&matches[0].exact)answerTerm(matches[0].entry);else suggestMatches(matches);return;}
    if(intent?.[0]==='supportAnswer'){support();return;}
    if(intent)answer(intent[0],intent[2]);else if(matches.length){suggestMatches(matches);return;}else{const found=searchPage(raw),result=answer(found.length?'searchFound':'fallback');found.forEach(item=>actionLink(result.node,item.label,'#'+item.id));}
    makeChip('glossary',openGlossary);makeChip('showRoutes',showRoutes);
  }
  function renderGlossary(){const query=$('glossary-query').value.trim(),results=$('glossary-results');results.replaceChildren();const matches=query?K.search(query,glossary):glossary.map(entry=>({entry}));$('glossary-status').textContent=query&&!matches.length?I.t('glossaryEmpty'):I.t(matches.length===1?'glossaryOne':'glossaryCount',{n:matches.length});const choices=matches.length?matches:glossary.filter(e=>['phishing','api','automation','llm'].includes(e.id)).map(entry=>({entry}));choices.forEach(({entry,exact})=>makeButton(results,(query&&exact===false?'≈ ':'')+entry.label[I.language],()=>renderTerm(entry,$('glossary-detail')),'glossary-choice'));}
  function openGlossary(){S.openDialog('glossary-dialog',document.activeElement);$('glossary-query').value='';$('glossary-detail').replaceChildren();renderGlossary();$('glossary-query').focus({preventScroll:true});if(!visit.has(phraseId('glossaryIntro'))){remember('glossaryIntro');lastResponse={key:'glossaryIntro'};$('glossary-detail').append(S.el('p','muted',I.t('glossaryIntro')));playResponse();}}
  $('glossary-query').addEventListener('input',()=>{stopVoice();activeTerm=null;$('glossary-detail').replaceChildren();renderGlossary();});
  $('axiom-glossary').addEventListener('click',openGlossary);
  $('axiom-launcher').addEventListener('click',e=>panel.hidden?open(e.currentTarget):close());$('axiom-close').addEventListener('click',()=>close());
  document.querySelectorAll('[data-open-axiom]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());open(b);}));
  $('axiom-send').addEventListener('click',()=>ask(input.value));input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();ask(input.value);}});panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
  $('axiom-voice').addEventListener('click',()=>{voiceEnabled=!voiceEnabled;if(voiceEnabled)playResponse();else{stopVoice();setVoiceStatus('voiceMuted');}syncVoice();});
  $('axiom-clear').addEventListener('click',clearConversation);
  $('axiom-trial').addEventListener('click',startTrial);$('axiom-trial-stop').addEventListener('click',()=>{stopTrial();$('axiom-launcher').focus({preventScroll:true});});
  $('axiom-trial-listen').addEventListener('click',()=>{voiceEnabled=true;playResponse();});
  $('adult-listen').addEventListener('click',()=>{if(adultKey)listenKey(adultKey);});
  document.addEventListener('portfolio:dialog-open',event=>{if(event.detail.id==='creator-dialog'){const key=chooseKey('adultWelcome');adultKey=key||'adultWelcome';$('adult-axiom-line').textContent=I.t(adultKey);$('adult-listen').dataset.listenKey=adultKey;$('adult-listen').dataset.listenLabel='adultListen';$('adult-listen').hidden=!resolveAudio(adultKey,I.language,catalog);if(key){remember(key);lastResponse={key};playResponse();}syncVoice();}});
  document.addEventListener('portfolio:dialog-close',event=>{if(voiceContext===event.detail.id)stopVoice();});
  function syncTone(){$('axiom-trial-controls').hidden=tone.value!=='playful';if(tone.value!=='playful'&&trial.active)stopTrial();}
  tone.addEventListener('change',()=>{syncTone();showRoutes();try{localStorage.setItem('cyberserch-tone',tone.value);}catch{/* Optional. */}});
  document.addEventListener('portfolio:language',()=>{stopTrial();manualJokes=0;messages.replaceChildren();input.value='';lastResponse={key:null};if(!panel.hidden)showRoutes();if($('glossary-dialog').open){renderGlossary();if(activeTerm)renderTerm(activeTerm,$('glossary-detail'));}if($('creator-dialog').open&&adultKey){$('adult-axiom-line').textContent=I.t(adultKey);$('adult-listen').hidden=!resolveAudio(adultKey,I.language,catalog);}});
  document.addEventListener('visibilitychange',()=>{visit.setVisible(!document.hidden);if(document.hidden)stopTrial();});
  window.AXIOM={open,close,ask,get trialActive(){return trial.active;},startService(index,source){open(source,false);activeRoute=index===6?'creator':'business';const keys=['webTerm','automationTerm','aiTerm','securityTerm','consultingTerm','networkTerm','contentTerm'];topic(keys[index]||'businessAnswer',index===1?'#automation':'#contact');}};
  syncVoice();syncTone();syncCounters();setVoiceStatus('voiceReady');

  // All seven supplied layers share a 1029×1183 coordinate system.
  const layers={},names=['cola','cuerpo','brazo','raices','branquias_izq','branquias_der','cabeza'];
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');const rigs=[...document.querySelectorAll('.axiom-canvas')].map(canvas=>({canvas,ctx:canvas.getContext('2d'),visible:true}));
  let ready=false,raf=0,lastFrame=0;
  const paused=()=>reduced.matches||document.documentElement.classList.contains('motion-paused')||document.hidden;
  const mouthTop=[[440,379],[460,380],[480,374],[500,371],[520,368],[540,359],[560,355],[580,352],[600,351],[620,355],[640,366],[660,381],[680,391],[700,398],[720,401],[732,402]];
  const mouthBottom=[[440,409],[460,409],[480,403],[500,399],[520,392],[540,386],[560,382],[580,382],[600,383],[620,385],[640,390],[660,395],[680,400],[700,403],[720,404],[732,404]];
  function mouthAmount(time){if(!speaking||audio.paused||audio.muted||audio.volume===0)return 0;return Math.abs(Math.sin(time/90))*.6;}
  function draw(rig,time,still=false){const {canvas,ctx}=rig;if(!ctx||!ready)return;const w=canvas.width,h=canvas.height;if(!w||!h)return;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);const k=Math.min(w/1120,h/1300),s=still?0:time/1000,m=still?0:1,opening=still?0:mouthAmount(time);ctx.translate((w-1029*k)/2,(h-1183*k)/2-5*Math.sin(s*1.6)*k*m);ctx.scale(k,k);
    function layer(name,degrees=0,pivot=[0,0]){ctx.save();ctx.translate(...pivot);ctx.rotate(degrees*Math.PI/180);ctx.translate(-pivot[0],-pivot[1]);ctx.drawImage(layers[name],0,0,1029,1183);ctx.restore();}
    layer('cola',Math.sin(s*1.9)*3*m,[390,930]);layer('cuerpo');const waving=!still&&time-waveAt<1700&&time>=waveAt;layer('brazo',waving?(-20+Math.sin((time-waveAt)/90)*7)*Math.sin(Math.PI*(time-waveAt)/1700):(-Math.sin(s*1.4)*2-(speaking?opening*6:0))*m,[800,710]);
    ctx.save();ctx.translate(540,470);ctx.rotate(Math.sin(s*1.3)*.028*m);ctx.translate(-540,-470);layer('raices');layer('branquias_izq',Math.sin(s*2.4)*2.1*m,[300,300]);layer('branquias_der',-Math.sin(s*2.4)*2.1*m,[775,300]);layer('cabeza');
    if(opening>.02){const lower=mouthBottom.map(([x,y])=>[x,y+opening*42*Math.sin(Math.PI*(x-440)/292)]);ctx.save();ctx.beginPath();mouthTop.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));lower.slice().reverse().forEach(([x,y])=>ctx.lineTo(x,y));ctx.closePath();ctx.fillStyle='#2a0506';ctx.fill();ctx.clip();ctx.beginPath();ctx.ellipse(590,383+opening*42,70,14+opening*18,0,0,Math.PI*2);ctx.fillStyle='#b8474f';ctx.fill();ctx.restore();}
    const phase=time%5700,blink=!still&&phase<150?Math.sin(phase/150*Math.PI):0;if(blink>.01)for(const [x,y,rx,ry] of [[408.5,273.5,54,58],[752,289.5,41,58]]){ctx.save();ctx.beginPath();ctx.ellipse(x,y,rx+4,ry+4,0,0,Math.PI*2);ctx.clip();ctx.fillStyle='#eee1dc';ctx.fillRect(x-rx-6,y-ry-6,rx*2+12,(ry*2+12)*blink);ctx.restore();}ctx.restore();
  }
  function resizeRig(rig){const r=rig.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);rig.canvas.width=Math.max(1,Math.round(r.width*dpr));rig.canvas.height=Math.max(1,Math.round(r.height*dpr));draw(rig,performance.now(),paused());}
  function frame(time){raf=0;if(!ready||paused())return;if(time-lastFrame>=33){lastFrame=time;rigs.forEach(r=>{if(r.visible)draw(r,time);});}if(rigs.some(r=>r.visible))raf=requestAnimationFrame(frame);}
  function sync(){cancelAnimationFrame(raf);raf=0;if(!ready)return;if(paused())rigs.forEach(r=>draw(r,0,true));else if(rigs.some(r=>r.visible))raf=requestAnimationFrame(frame);}
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{const r=rigs.find(x=>x.canvas===entry.target);if(r)r.visible=entry.isIntersecting;});sync();});rigs.forEach(r=>observer.observe(r.canvas));}
  if('ResizeObserver' in window){const observer=new ResizeObserver(entries=>entries.forEach(entry=>{const r=rigs.find(x=>x.canvas===entry.target);if(r)resizeRig(r);}));rigs.forEach(r=>observer.observe(r.canvas));}else window.addEventListener('resize',()=>rigs.forEach(resizeRig),{passive:true});
  Promise.all(names.map(name=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=`assets/axiom/img/${name}.webp`;layers[name]=image;}))).then(()=>{ready=true;rigs.forEach(r=>{if(r.ctx){r.canvas.parentElement.classList.add('rig-ready');resizeRig(r);}});sync();}).catch(()=>{/* The static supplied character remains visible if any layer cannot load. */});
  document.addEventListener('portfolio:motion',sync);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
})();
