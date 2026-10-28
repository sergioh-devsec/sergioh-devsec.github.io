/* No network, tracking, credentials or payment confirmation runs in this file. */
(() => {
  'use strict';
  // A damped, finite-difference height field: impulses propagate rather than follow as a ring.
  function waveStep(current, previous, width, height) {
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const i=y*width+x;
      previous[i]=((current[i-1]+current[i+1]+current[i-width]+current[i+width])*.5-previous[i])*.975;
    }
  }
  function providerUrl(value, provider) {
    if(typeof value!=='string'||/[\u0000-\u0020\\]/.test(value))return null;
    const hosts={patreon:['patreon.com','www.patreon.com'],paypal:['paypal.com','www.paypal.com','paypal.me','www.paypal.me']};
    try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts[provider]?.includes(u.hostname)&&u.pathname!=='/'?u.href:null;}catch{return null;}
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={waveStep,providerUrl};
  if(typeof document==='undefined')return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>!reduced.matches&&!root.classList.contains('motion-paused')&&!document.hidden;
  const canvas=$('#water-surface'),ctx=canvas.getContext('2d',{alpha:true});
  let w=0,h=0,current,previous,pixels,raf=0,lastFrame=0,lastInput=0,lastPoint=null;
  function clearWater(){cancelAnimationFrame(raf);raf=0;lastPoint=null;current?.fill(0);previous?.fill(0);ctx?.clearRect(0,0,w,h);}
  function resize(){clearWater();w=Math.min(360,Math.max(100,Math.ceil(innerWidth/4)));h=Math.min(260,Math.max(80,Math.ceil(w*innerHeight/innerWidth)));canvas.width=w;canvas.height=h;current=new Float32Array(w*h);previous=new Float32Array(w*h);pixels=ctx?.createImageData(w,h);}
  function impulse(x,y,strength){
    const cx=Math.round(x/innerWidth*w),cy=Math.round(y/innerHeight*h);
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      const xx=cx+dx,yy=cy+dy,d=Math.hypot(dx,dy);
      if(xx>0&&xx<w-1&&yy>0&&yy<h-1&&d<3)current[yy*w+xx]=Math.min(200,current[yy*w+xx]+strength*(1-d/3));
    }
  }
  function frame(time){
    raf=0;if(!motion()||time-lastInput>2400){clearWater();return;}
    if(time-lastFrame<30){raf=requestAnimationFrame(frame);return;}lastFrame=time;
    waveStep(current,previous,w,h);[current,previous]=[previous,current];
    const data=pixels.data;data.fill(0);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x,k=i*4,nx=current[i-1]-current[i+1],ny=current[i-w]-current[i+w];
      const light=Math.min(1,Math.abs(nx*.05+ny*.075));
      // Specular highlights and cyan shadow edges give the moving water a glassy depth.
      data[k]=40+light*110;data[k+1]=170+light*70;data[k+2]=200+light*55;
      data[k+3]=Math.min(100,(Math.abs(nx)+Math.abs(ny))*2.4)*(Math.min(1,(2400-(time-lastInput))/650));
    }
    ctx.putImageData(pixels,0,0);raf=requestAnimationFrame(frame);
  }
  function touchWater(event){
    if(!ctx||!motion())return;
    const now=performance.now();if(event.type==='pointermove'&&now-lastInput<24)return;
    const point={x:event.clientX,y:event.clientY};
    const distance=lastPoint?Math.hypot(point.x-lastPoint.x,point.y-lastPoint.y):0;
    if(lastPoint&&distance<200){const n=Math.min(8,Math.ceil(distance/12));for(let i=1;i<n;i++)impulse(lastPoint.x+(point.x-lastPoint.x)*i/n,lastPoint.y+(point.y-lastPoint.y)*i/n,22);}
    impulse(point.x,point.y,event.type==='pointerdown'?90:38);lastPoint=point;lastInput=now;
    if(!raf)raf=requestAnimationFrame(frame);
  }
  resize();window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('pointermove',touchWater,{passive:true});document.addEventListener('pointerdown',touchWater,{passive:true});
  document.addEventListener('pointerleave',()=>{lastPoint=null;});document.addEventListener('pointercancel',()=>{lastPoint=null;},{passive:true});window.addEventListener('blur',clearWater);
  document.addEventListener('portfolio:motion',()=>{if(!motion())clearWater();});document.addEventListener('visibilitychange',()=>{if(!motion())clearWater();});reduced.addEventListener('change',clearWater);

  const habitat=$('#studio-frame'),character=$('#axiom-character'),speech=$('#axiom-speech');
  const replies={hello:'¡Hola! Soy Axiom, el ajolote del laboratorio. Toca el agua y explora conmigo.',create:'Una idea pequeña puede crecer mucho. Elige imagen, video o voz y descubre un posible camino.',protect:'Mi escudo recuerda una regla del laboratorio: tus datos se comparten con intención, nunca por accidente.'};
  const greetings=['¡Hola! Soy Axiom. Si tienes curiosidad, pulsa «Guíame» y elegimos una ruta.','¡Otra vez tú! Mi tableta está lista: hoy podemos crear, proteger o construir una web.','Un pequeño experimento también cuenta. ¿Probamos una idea juntos?'];
  const shields=['Escudo activado. Comparte solo los datos necesarios para cada propósito.','Escudo activado. Una contraseña distinta y un segundo factor protegen mejor tus cuentas.','Escudo activado. Antes de abrir un enlace de pago, revisa el dominio y el importe.'];
  let greetingIndex=0,shieldIndex=0,reactionTimer=0,characterFrame=0,characterPoint=null;
  function react(mode){
    if(!Object.hasOwn(replies,mode))return;
    habitat.dataset.mood=mode;
    speech.textContent=mode==='hello'?greetings[greetingIndex++%greetings.length]:mode==='protect'?shields[shieldIndex++%shields.length]:replies[mode];
    $('#axiom-state').textContent={hello:'AQUÍ CONTIGO',create:'IMAGINANDO',protect:'ESCUDO ACTIVO'}[mode];
    $$('[data-axiom]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.axiom===mode)));
    clearTimeout(reactionTimer);habitat.classList.remove('reacting');
    if(motion()&&!habitat.classList.contains('studio-paused')){requestAnimationFrame(()=>{habitat.classList.add('reacting');reactionTimer=setTimeout(()=>habitat.classList.remove('reacting'),1700);});}
  }
  $$('[data-axiom]').forEach(b=>b.addEventListener('click',()=>react(b.dataset.axiom)));
  character.addEventListener('click',()=>react('hello'));
  const routes={
    create:[['De una idea a un formato','Elige imagen, video o voz. Cada formato propone un punto de partida distinto.','#creative-preview'],['Conecta el proceso','Explora la arquitectura propuesta y ejecuta la simulación del flujo de IA local.','#local-ai-platform'],['Conoce el alcance','Distingue los prototipos disponibles de las líneas que siguen en desarrollo.','#projects']],
    protect:[['Una señal entre muchos eventos','Prueba el analizador con su muestra sintética. Todo se procesa en este navegador.','#laboratory'],['Revisa el contexto','Explora las fichas del laboratorio de seguridad y sus límites de uso.','#projects'],['Protege la información','Conoce los principios de confidencialidad y trabajo autorizado.','#values']],
    web:[['Una web con intención','Identifica qué debe explicar tu página y qué acción necesita tu visitante.','#services'],['Explora un ejemplo','Este portafolio es un proyecto publicado: revisa su arquitectura y funciones.','#cyberserch'],['Del objetivo al alcance','Las solicitudes profesionales tendrán un canal privado; revisa su estado antes de pagar.','#contact']]
  };
  const tour=$('#axiom-tour'),tourToggle=$('#axiom-tour-toggle');let route='create',step=0;
  function renderStep(){const item=routes[route][step];$('#axiom-step').textContent=`PASO ${step+1} DE ${routes[route].length}`;$('#axiom-tour-title').textContent=item[0];$('#axiom-tour-copy').textContent=item[1];$('#axiom-tour-link').href=item[2];$('#axiom-tour-next').textContent=step===2?'Volver al inicio ↺':'Siguiente →';}
  tourToggle.addEventListener('click',()=>{tour.hidden=!tour.hidden;tourToggle.setAttribute('aria-expanded',String(!tour.hidden));if(!tour.hidden){renderStep();speech.textContent='Vamos paso a paso. Elige una ruta y te mostraré qué puedes explorar.';}});
  $$('[data-route]').forEach(button=>button.addEventListener('click',()=>{if(!Object.hasOwn(routes,button.dataset.route))return;route=button.dataset.route;step=0;renderStep();$$('[data-route]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));react(route==='protect'?'protect':'create');}));
  $('#axiom-tour-next').addEventListener('click',()=>{step=(step+1)%routes[route].length;renderStep();speech.textContent=routes[route][step][1];});
  habitat.addEventListener('pointermove',event=>{
    if(!motion()||habitat.classList.contains('studio-paused'))return;
    const r=habitat.getBoundingClientRect();characterPoint={x:(event.clientX-r.left)/r.width-.5,y:(event.clientY-r.top)/r.height-.5};
    if(!characterFrame)characterFrame=requestAnimationFrame(()=>{characterFrame=0;if(!motion()||habitat.classList.contains('studio-paused'))return;habitat.style.setProperty('--axiom-x',`${characterPoint.x*14}px`);habitat.style.setProperty('--axiom-y',`${characterPoint.y*8}px`);});
  },{passive:true});
  habitat.addEventListener('pointerleave',()=>{habitat.style.removeProperty('--axiom-x');habitat.style.removeProperty('--axiom-y');},{passive:true});
  const creative={image:['DIRECCIÓN VISUAL','Dale forma a lo que imaginas.','Del concepto a una composición: explora estilo, luz y color antes de producir.'],video:['NARRATIVA EN MOVIMIENTO','Convierte la idea en una historia.','Ordena escenas, elige un ritmo y conecta los momentos que quieres contar.'],voice:['IDENTIDAD SONORA','Encuentra la voz de tu historia.','Prepara un guion, explora la intención y trabaja solo con voces autorizadas.']};
  $$('[data-creative]').forEach(button=>button.addEventListener('click',()=>{
    const mode=button.dataset.creative;if(!Object.hasOwn(creative,mode))return;
    $('#creative-preview').dataset.output=mode;
    ['#creative-tag','#creative-title','#creative-copy'].forEach((id,i)=>$(id).textContent=creative[mode][i]);
    $$('[data-creative]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));react('create');
  }));
  const launcher=$('#axiom-launcher'),popover=$('#axiom-popover');
  function closeGuide(focus=false){popover.hidden=true;launcher.setAttribute('aria-expanded','false');if(focus)launcher.focus();}
  launcher.addEventListener('click',()=>{const open=popover.hidden;popover.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(open)$('#axiom-close').focus();});
  $('#axiom-close').addEventListener('click',()=>closeGuide(true));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!popover.hidden)closeGuide(true);});
  document.addEventListener('click',e=>{if(e.target instanceof Element&&!e.target.closest('.axiom-companion'))closeGuide();});
  $$('.axiom-popover a').forEach(a=>a.addEventListener('click',()=>closeGuide()));
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('effect-offscreen',!e.isIntersecting)));$$('.social-card,.studio-editorial,.studio-visual').forEach(node=>observer.observe(node));}
  // Native modal dialogs keep hidden details out of normal navigation and trap focus.
  const dialogs=[$('#creator-dialog'),$('#cv-dialog')];
  const openers=new WeakMap();
  function openModal(dialog,opener){
    closeGuide();openers.set(dialog,opener);dialog.showModal();document.body.classList.add('dialog-open');dialog.scrollTop=0;dialog.querySelector('h2').focus({preventScroll:true});
  }
  dialogs.forEach(dialog=>{
    dialog.querySelector('[data-close-dialog]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{if(!$('dialog[open]'))document.body.classList.remove('dialog-open');openers.get(dialog)?.focus({preventScroll:true});});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
    dialog.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{openers.delete(dialog);dialog.close();}));
  });
  $('#creators-open').hidden=false;
  $('#creators-open').addEventListener('click',event=>openModal(dialogs[0],event.currentTarget));
  $$('.cv-open').forEach(button=>button.addEventListener('click',()=>openModal(dialogs[1],button)));
  const cvUrl=providerUrl(window.PORTFOLIO?.cvCheckoutUrl,'patreon');
  if(cvUrl){
    const checkout=$('#cv-checkout'),link=document.createElement('a'),note=document.createElement('p');
    link.href=cvUrl;link.target='_blank';link.rel='noopener noreferrer';link.className='button primary';link.textContent='Comprar y descargar en Patreon ↗';
    note.className='small muted';note.textContent='Patreon confirma el pago único y habilita el archivo desde tu compra. No necesitas suscribirte al apoyo mensual.';checkout.replaceChildren(link,note);
  }
  // Only verified provider destinations may be enabled. There is no paid access flag.
  ['patreon','paypal'].forEach((provider,i)=>{
    const url=providerUrl(window.PORTFOLIO?.supportLinks?.[provider],provider);if(!url)return;
    const card=$$('.support-providers article')[i];const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.className='text-link';link.textContent=provider==='patreon'?'Visitar Patreon ↗':'Apoyar ↗';card.querySelector('span').replaceWith(link);
    if(provider==='patreon')$('#support-action').nextElementSibling.textContent='Patreon: apoyo general de US$5 al mes. PayPal: aportación única de importe libre en MXN, a nombre de José Sergio Hernández Hernández. Ambos son independientes del CV y de cualquier servicio. Revisa el importe y las condiciones en la plataforma antes de confirmar.';
  });
})();
