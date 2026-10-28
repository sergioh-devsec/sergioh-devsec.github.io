/* Local interactions only. All inputs remain in the browser. */
(() => {
  'use strict';
  const clamp = (value,min,max) => Math.min(max,Math.max(min,Number.isFinite(Number(value))?Number(value):min));
  function estimateRevenue(members,price) {
    const count=Math.round(clamp(members,0,500));
    const amount=Math.round(clamp(price,50,1000));
    return {members:count,price:amount,gross:count*amount};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={estimateRevenue};
  if(typeof document==='undefined')return;
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const canMove=()=>!reduced.matches&&!root.classList.contains('motion-paused')&&!document.hidden;

  // Pointer/touch writes are coalesced into a single frame, never an idle loop.
  const field=$('.ambient-field');const cursor=$('.pointer-orbit');const spark=$('.touch-spark');
  let pointerFrame=0,lastEvent=null,sparkTimer=0,surface=null;
  function clearSurface(){if(surface){surface.style.removeProperty('--spot-x');surface.style.removeProperty('--spot-y');surface.classList.remove('pointer-lit');surface=null;}}
  function paintPointer(){
    pointerFrame=0;if(!lastEvent||!canMove())return;
    const {x,y,pointerType,target}=lastEvent;
    field.style.setProperty('--drift-x',`${(x/innerWidth-.5)*64}px`);
    field.style.setProperty('--drift-y',`${(y/innerHeight-.5)*48}px`);
    const next=target.closest('.creator-section,.featured,.core-scene,.support-section');
    if(next!==surface){clearSurface();surface=next;}
    if(surface){const rect=surface.getBoundingClientRect();surface.style.setProperty('--spot-x',`${x-rect.left}px`);surface.style.setProperty('--spot-y',`${y-rect.top}px`);surface.classList.add('pointer-lit');}
    if(pointerType==='mouse'&&fine.matches){cursor.hidden=false;cursor.style.transform=`translate3d(${x}px,${y}px,0)`;cursor.classList.toggle('over-control',!!target.closest('a,button,summary,input,textarea'));}
  }
  function onPointer(event){
    if(!canMove()||!(event.target instanceof Element))return;
    lastEvent={x:event.clientX,y:event.clientY,pointerType:event.pointerType,target:event.target};
    if(!pointerFrame)pointerFrame=requestAnimationFrame(paintPointer);
  }
  document.addEventListener('pointermove',onPointer,{passive:true});
  document.addEventListener('pointerdown',event=>{
    onPointer(event);
    if(!canMove()||event.pointerType==='mouse')return;
    spark.hidden=false;spark.style.left=`${event.clientX}px`;spark.style.top=`${event.clientY}px`;
    spark.getAnimations().forEach(animation=>animation.cancel());
    spark.animate([{transform:'translate(-50%,-50%) scale(.35)',opacity:.6},{transform:'translate(-50%,-50%) scale(1.6)',opacity:0}],{duration:600,easing:'ease-out',fill:'forwards'});
    clearTimeout(sparkTimer);sparkTimer=setTimeout(()=>{spark.hidden=true;clearSurface();},650);
  },{passive:true});
  document.addEventListener('pointerleave',()=>{cursor.hidden=true;clearSurface();});
  document.addEventListener('pointercancel',()=>{spark.hidden=true;clearSurface();},{passive:true});
  window.addEventListener('blur',()=>{cursor.hidden=true;clearSurface();});

  const flow=$('#ai-flow');const run=$('#flow-run');const status=$('#flow-status');
  const outputs={image:{title:'Del brief a una imagen',copy:'Define estilo, composición y referencias; revisa el resultado antes de exportarlo.',step:'03 / IMAGEN · composición y variantes'},video:{title:'De una idea a una secuencia',copy:'Organiza escenas, ritmo y formato. Después, revisa la continuidad y prepara la edición.',step:'03 / VIDEO · escenas y continuidad'},voice:{title:'Del texto a una voz',copy:'Prepara un guion y una voz autorizada. Revisa pronunciación, ritmo y calidad de audio.',step:'03 / VOZ · guion y síntesis autorizada'}};
  let flowTimer=0,playing=false,step=0;
  function stopFlow(message){clearTimeout(flowTimer);playing=false;flow.classList.remove('flow-running');run.textContent='Recorrer flujo ↗';if(message)status.textContent=message;}
  function renderStep(){
    flow.dataset.step=String(step);
    status.textContent=['LISTO PARA EXPLORAR','01 / BRIEF · definir intención','02 / LOCAL AI · organizar el flujo',outputs[flow.dataset.output].step,'04 / REVISIÓN · validar y exportar'][step];
  }
  $$('[data-ai-output]').forEach(button=>button.addEventListener('click',()=>{
    stopFlow();const name=button.dataset.aiOutput;if(!Object.hasOwn(outputs,name))return;
    flow.dataset.output=name;$$('[data-ai-output]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    $('#flow-title').textContent=outputs[name].title;$('#flow-copy').textContent=outputs[name].copy;step=0;renderStep();
  }));
  function advance(){
    if(!canMove()){step=4;renderStep();stopFlow('RECORRIDO COMPLETO · efectos en pausa');return;}
    step++;renderStep();
    if(step<4)flowTimer=setTimeout(advance,950);else stopFlow('RECORRIDO COMPLETO · simulación visual');
  }
  run.addEventListener('click',()=>{
    if(playing){stopFlow('RECORRIDO DETENIDO');return;}
    step=0;playing=true;flow.classList.add('flow-running');run.textContent='Detener recorrido';advance();
  });

  const money=new Intl.NumberFormat('es-MX',{maximumFractionDigits:0});
  let summaryTimer=0;
  function updateRevenue(){
    const result=estimateRevenue($('#demo-members').value,$('#demo-price').value);
    $('#members-value').textContent=money.format(result.members);
    $('#price-value').textContent=`$${money.format(result.price)} MXN`;
    $('#revenue-total').textContent=`$${money.format(result.gross)}`;
    const ceiling=10**Math.ceil(Math.log10(Math.max(result.gross,100)));
    $('#chart-scale').textContent=`ESCALA: $0–$${money.format(ceiling)} MXN`;
    $$('.scenario-chart>div').forEach((bar,i)=>{const count=Math.round(result.members*(i+1)/4);bar.querySelector('i').style.height=`${count*result.price/ceiling*100}%`;bar.querySelector('span').textContent=money.format(count);});
    clearTimeout(summaryTimer);summaryTimer=setTimeout(()=>{$('#revenue-summary').textContent=`${result.members} suscriptores por ${result.price} pesos: ${money.format(result.gross)} pesos brutos mensuales, antes de comisiones, impuestos y gastos.`;},180);
  }
  $('#demo-members').disabled=false;$('#demo-price').disabled=false;
  $('#demo-members').addEventListener('input',updateRevenue);$('#demo-price').addEventListener('input',updateRevenue);updateRevenue();

  function syncMotion(){
    const enabled=canMove();root.classList.toggle('effects-enabled',enabled);
    if(!enabled){cancelAnimationFrame(pointerFrame);pointerFrame=0;lastEvent=null;cursor.hidden=true;spark.hidden=true;clearTimeout(sparkTimer);spark.getAnimations().forEach(a=>a.cancel());clearSurface();field.style.removeProperty('--drift-x');field.style.removeProperty('--drift-y');if(playing)stopFlow('RECORRIDO EN PAUSA · pulsa para reiniciar');}
    if(!fine.matches)cursor.hidden=true;
  }
  document.addEventListener('portfolio:motion',syncMotion);document.addEventListener('visibilitychange',syncMotion);reduced.addEventListener('change',syncMotion);fine.addEventListener('change',syncMotion);syncMotion();
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{entry.target.classList.toggle('effect-offscreen',!entry.isIntersecting);if(entry.target===flow&&!entry.isIntersecting&&playing)stopFlow('RECORRIDO EN PAUSA · pulsa para reiniciar');});});[flow,$('#creadoras'),$('.lab-console'),$('#apoyar')].forEach(node=>observer.observe(node));}

  // No payment destination exists yet; no placeholder link or invented checkout.
  const value=window.PORTFOLIO?.supportUrl;
  if(typeof value==='string'&&!/[\u0000-\u0020\\]/.test(value)){
    try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password){const action=$('#support-action');const a=document.createElement('a');a.className='button primary';a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Apoyar el laboratorio ↗';const note=document.createElement('p');note.className='small muted';note.textContent='Aportación voluntaria. Revisa el importe y las condiciones en la plataforma antes de confirmar.';action.replaceChildren(a,note);}}catch{/* Invalid configuration stays visibly pending. */}
  }
})();
