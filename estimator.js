/* Transparent estimates in MXN. The same pure functions power the UI and tests. */
(() => {
  'use strict';
  const packages = {
    landing:{price:3500,label:['Landing page','Landing page'],scope:['Una página adaptable a celular, formulario y una ronda de cambios. Textos e imágenes proporcionados por ti.','One responsive page, a contact form and one revision round. You provide text and images.'],options:{sections:[700,6,['Secciones adicionales','Additional sections']],language:[2500,1,['Segundo idioma · textos proporcionados','Second language · supplied copy']],copy:[1200,1,['Redacción de textos','Copywriting']],motion:[1500,1,['Animaciones personalizadas','Custom animations']],revisions:[600,3,['Rondas de cambios adicionales','Extra revision rounds']]}},
    information:{price:7000,label:['Sitio informativo','Informational website'],scope:['De 3 a 5 secciones, estructura de contenidos, diseño adaptable, formulario y una ronda de cambios.','3–5 sections, content structure, responsive design, a form and one revision round.'],options:{pages:[1200,8,['Páginas adicionales','Additional pages']],language:[3500,1,['Segundo idioma · textos proporcionados','Second language · supplied copy']],copy:[2000,1,['Redacción de textos','Copywriting']],motion:[2000,1,['Animaciones personalizadas','Custom animations']],revisions:[800,3,['Rondas de cambios adicionales','Extra revision rounds']]}},
    custom:{price:30000,label:['Web a medida','Custom website'],scope:['Diseño y desarrollo propio, hasta 5 secciones y una función interactiva sencilla. Dos rondas de cambios.','Custom design and development, up to 5 sections and one simple interactive feature. Two revision rounds.'],options:{pages:[1800,8,['Páginas adicionales','Additional pages']],language:[7500,1,['Versión bilingüe completa','Full bilingual version']],assistant:[12000,1,['Asistente guiado con voz · recursos aparte','Guided voice assistant · assets extra']],tool:[7500,3,['Herramientas interactivas adicionales','Additional interactive tools']],dashboard:[10000,1,['Panel de administración básico','Basic administration panel']],revisions:[1500,3,['Rondas de cambios adicionales','Extra revision rounds']]}},
    automation:{price:2500,label:['Automatización','Automation'],scope:['Una secuencia sencilla entre hasta 2 herramientas que permiten conectarse entre sí, pruebas y entrega documentada.','One simple task sequence between up to 2 tools that support connecting to each other, testing and documented handoff.'],options:{flows:[2500,4,['Flujos adicionales','Additional workflows']],sources:[1200,4,['Conexiones adicionales','Additional connections']],dashboard:[3500,1,['Tablero de seguimiento','Tracking dashboard']],alerts:[1800,1,['Avisos de error y registro','Error alerts and logging']]}},
    security:{price:5000,label:['Revisión básica de seguridad','Basic security review'],scope:['Una web pública: revisión externa no intrusiva, informe y recomendaciones. Requiere autorización escrita del titular.','One public website: non-intrusive external review, report and recommendations. Written owner authorization required.'],options:{assets:[1500,4,['Sitios o activos adicionales del mismo titular','Additional sites or assets from the same owner']],followup:[1800,1,['Revisión posterior de las correcciones','Follow-up review of corrections']]}}
  };
  const explanations={
    landing:['Una sola página para presentar y promocionar tu negocio.','One page to introduce and promote your business.'],
    information:['Una web para explicar quién eres, qué ofreces y cómo trabajas.','A website explaining who you are, what you offer and how you work.'],
    custom:['Una web diseñada para tus procesos y funciones particulares.','A website designed around your particular workflows and features.'],
    automation:['Conecta herramientas para hacer tareas repetitivas por ti.','Connect tools to handle repetitive tasks for you.'],
    security:['Busca señales de riesgo visibles desde fuera, sin entrar a tus sistemas.','Check externally visible risk signals without entering your systems.'],
    sections:['Bloques dentro de la misma página, como preguntas frecuentes o testimonios.','Blocks within one page, such as FAQs or testimonials.'],
    pages:['Pantallas con su propia dirección, como un catálogo o un servicio.','Screens with their own address, such as a catalog or service page.'],
    language:['Una versión en otro idioma; tú entregas los textos y sus traducciones.','A version in another language; you supply the copy and translations.'],
    copy:['Escritura de textos claros para explicar y presentar tu oferta.','Writing clear copy to explain and present your offering.'],
    motion:['Movimientos y transiciones propios para dar vida a la página.','Custom movements and transitions that bring the page to life.'],
    revisions:['Una entrega agrupada de ajustes sobre el alcance ya acordado.','One consolidated set of changes within the agreed scope.'],
    assistant:['Un personaje con opciones y respuestas preparadas; no es un chat de IA libre.','A character with guided choices and prepared replies; not an open-ended AI chat.'],
    tool:['Una función que el visitante puede usar, como un cotizador o un filtro.','A feature visitors can use, such as an estimator or a filter.'],
    dashboard:['Una pantalla para consultar o gestionar información de tu proyecto.','A screen to view or manage your project information.'],
    flows:['Otra secuencia de tareas, por ejemplo registrar un pedido y enviar un aviso.','Another task sequence, such as recording an order and sending an alert.'],
    sources:['Conecta una herramienta más, como una hoja de cálculo o un calendario.','Connect another tool, such as a spreadsheet or calendar.'],
    alerts:['Avisos cuando algo falla y un historial para revisar qué ocurrió.','Notifications when something fails, plus a history of what happened.'],
    assets:['Otra web o sistema público de tu propiedad, dentro del permiso acordado.','Another public website or system you own, within the agreed authorization.'],
    followup:['Comprobar después si se atendieron los hallazgos de la primera revisión.','Check later whether the initial findings have been addressed.']
  };
  function estimate(kind,selected={}){
    if(!Object.hasOwn(packages,kind)||!selected||typeof selected!=='object'||Array.isArray(selected))return null;
    const pack=packages[kind],lines=[{id:'base',quantity:1,unit:pack.price,total:pack.price}];
    for(const [id,count] of Object.entries(selected)){
      if(!Object.hasOwn(pack.options,id)||!Number.isInteger(count)||count<0||count>pack.options[id][1])return null;
      if(count)lines.push({id,quantity:count,unit:pack.options[id][0],total:count*pack.options[id][0]});
    }
    const total=lines.reduce((sum,line)=>sum+line.total,0);
    return {kind,lines,total,upper:Math.ceil(total*1.25),currency:'MXN'};
  }
  function formEndpoint(value){return typeof value==='string'&&/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]{6,32}$/.test(value)?value:null;}
  function web3formsKey(value){return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)?value:null;}
  // Only an affirmative provider response counts as accepted. No retries or redirects.
  async function sendEnquiry(key, fields, {request=fetch,timeoutMs=20000}={}){
    if(!web3formsKey(key)||!fields||fields.consent!=='yes'||fields.botcheck)return 'invalid';
    for(const [name,max] of Object.entries({name:80,email:180,message:2000,estimate:12000})){
      if(typeof fields[name]!=='string'||!fields[name].trim()||fields[name].length>max)return 'invalid';
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))return 'invalid';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await request('https://api.web3forms.com/submit',{
        method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
        credentials:'omit',redirect:'error',signal:controller.signal,
        body:JSON.stringify({access_key:key,name:fields.name,email:fields.email,message:fields.message,
          estimate:fields.estimate,consent:'yes',botcheck:false,
          subject:'CyberSerchMX · Consulta de proyecto',from_name:'CyberSerchMX'})
      });
      if(!response.ok)return response.status===429?'limit':'error';
      const result=await response.json();return result.success===true?'accepted':'error';
    }catch{return controller.signal.aborted?'timeout':'error';}finally{clearTimeout(timer);}
  }
  function paymentLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname==='www.paypal.com'&&/^\/ncp\/payment\/[A-Za-z0-9]+\/?$/.test(u.pathname)&&!u.search&&!u.hash?u.href:null;}catch{return null;}}
  function bookingLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname==='cal.com'&&/^\/[a-z0-9_-]+\/[a-z0-9_-]+\/?$/i.test(u.pathname)&&!u.search&&!u.hash?u.href:null;}catch{return null;}}
  const api={packages,explanations,estimate,formEndpoint,web3formsKey,sendEnquiry,paymentLink,bookingLink};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document==='undefined')return;
  const I=window.I18N,S=window.Site,C=window.COMMERCE,$=id=>document.getElementById(id),root=$('quote-builder');
  const review=$('review-actions'),pay=paymentLink(C.reviewPaymentUrl),booking=bookingLink(C.bookingUrl);
  function renderReview(){if(!review)return;review.replaceChildren();if(pay&&booking){$('review-pending-note').hidden=true;review.append(S.link(I.t('reviewCheckAvailability'),booking,'button secondary'),S.link(I.t('reviewPay'),pay,'button primary'));}}
  renderReview();document.addEventListener('portfolio:language',renderReview);
  if(!root||!$('quote-packages'))return;
  let kind='landing',selected={};
  const en=()=>I.language==='en',label=arr=>arr[en()?1:0],money=n=>new Intl.NumberFormat(en()?'en-US':'es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(n)+' MXN';
  const tx=(es,english)=>en()?english:es;
  function tax(){return C.taxMode==='included'?tx('Precios con impuestos incluidos.','Prices include taxes.'):C.taxMode==='excluded'?tx('Importes antes de IVA; se detallará en la propuesta final.','Amounts before VAT; itemized in the final proposal.'):tx('Impuestos y facturación por confirmar antes de contratar.','Taxes and invoicing to be confirmed before purchase.');}
  function brief(){const r=estimate(kind,selected);return ['CYBERSERCH · '+tx('Estimación orientativa','Indicative estimate'),label(packages[kind].label),label(packages[kind].scope),tx('Mi idea: ','My idea: ')+(($('quote-contact-form').hidden?$('local-goal'):$('contact-goal'))?.value.trim().slice(0,2000)||tx('Por definir','To be defined')),...r.lines.map(l=>`${l.id==='base'?tx('Base','Base'):label(packages[kind].options[l.id][2])}: ${l.quantity} × ${money(l.unit)} = ${money(l.total)}`),tx('Subtotal estimado: ','Estimated subtotal: ')+money(r.total),tx('Rango orientativo: ','Indicative range: ')+money(r.total)+' – '+money(r.upper),tax(),I.t('quoteEvaluation'),I.t('quoteMargin'),tx('No es una oferta final. Dominio, hosting, licencias, consumo de APIs y recursos de voz/imagen se cotizan aparte. Alcance y plazo se confirman antes del pago.','Not a final offer. Domain, hosting, licenses, API usage and voice/image assets are separate. Scope and timeline confirmed before payment.')].join('\n');}
  function update(){const r=estimate(kind,selected),lines=$('quote-lines');lines.replaceChildren();for(const l of r.lines){const li=S.el('li');li.append(S.el('span','',l.id==='base'?label(packages[kind].label):`${label(packages[kind].options[l.id][2])} × ${l.quantity}`),S.el('strong','',money(l.total)));lines.append(li);}$('quote-total').textContent=money(r.total);$('quote-range').textContent=tx('Rango orientativo: ','Indicative range: ')+money(r.total)+' – '+money(r.upper);$('quote-tax').textContent=tax();$('quote-summary').value=brief();$('quote-contact-summary').value=brief();}
  function render(){
    const choices=$('quote-packages');choices.replaceChildren();Object.entries(packages).forEach(([id,p])=>{const b=S.el('button','quote-package');b.type='button';b.setAttribute('aria-pressed',String(id===kind));b.append(S.el('strong','',label(p.label)),S.el('small','quote-help',label(explanations[id])),S.el('span','',tx('Desde ','From ')+money(p.price)));b.addEventListener('click',()=>{kind=id;selected={};render();$('quote-options-title').focus({preventScroll:true});});choices.append(b);});
    $('quote-scope').textContent=label(packages[kind].scope);const options=$('quote-options');options.replaceChildren();
    for(const [id,[price,max,names]] of Object.entries(packages[kind].options)){
      const row=S.el('div','quote-option'),input=S.el('input'),lab=S.el('label');input.id='quote-'+id;input.name=id;lab.htmlFor=input.id;
      const help=S.el('span','quote-help',label(explanations[id]));help.id=input.id+'-help';input.setAttribute('aria-describedby',help.id);
      lab.append(S.el('span','',label(names)),help,S.el('small','',`+ ${money(price)}${max>1?tx(' por unidad',' each'):''}`));
      input.type=max===1?'checkbox':'number';if(max===1)input.checked=selected[id]===1;else{input.min='0';input.max=String(max);input.step='1';input.value=String(selected[id]||0);}
      input.addEventListener('input',()=>{const valid=Array.from(options.querySelectorAll('input')).every(field=>field.validity.valid&&field.value!=='');$('quote-download').disabled=!valid;if(!valid){$('quote-error').textContent=tx('Revisa las cantidades: usa enteros dentro del límite indicado.','Check quantities: use whole numbers within the indicated limits.');$('quote-total').textContent='—';return;}selected=Object.fromEntries(Array.from(options.querySelectorAll('input')).map(field=>[field.name,field.type==='checkbox'?Number(field.checked):Number(field.value)]));$('quote-error').textContent='';update();});row.append(lab,input);options.append(row);
    }$('quote-download').disabled=false;$('quote-error').textContent='';update();configureContact();
  }
  function download(){if($('quote-download').disabled){$('local-feedback').textContent=tx('Revisa las cantidades del cotizador antes de descargar.','Check estimate quantities before downloading.');return;}const blob=new Blob([brief()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cyberserch-estimacion.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('quote-feedback').textContent=tx('Resumen preparado para descargar. No se ha enviado a nadie.','Summary prepared for download. It has not been sent.');}
  $('quote-download').addEventListener('click',download);$('local-download').addEventListener('click',()=>{download();$('local-feedback').textContent=$('quote-feedback').textContent;});for(const id of ['local-goal','contact-goal'])$(id).addEventListener('input',()=>{if(!$('quote-download').disabled)update();});
  $('quote-reset').addEventListener('click',()=>{kind='landing';selected={};render();$('quote-feedback').textContent='';});
  let contactBusy=false;
  function configureContact(){const active=Boolean(web3formsKey(C.web3formsAccessKey)),form=$('quote-contact-form');form.hidden=!active;$('local-enquiry').hidden=active;$('quote-contact-pending').hidden=active;form.removeAttribute('action');$('quote-contact-ready').hidden=!active;}
  $('quote-contact-form').addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,key=web3formsKey(C.web3formsAccessKey),status=$('quote-contact-result'),button=form.querySelector('[type=submit]');
    if(contactBusy||!key)return;
    if($('quote-download').disabled){status.textContent=tx('Revisa las cantidades del cotizador antes de enviar.','Check the estimate quantities before sending.');return;}
    if($('contact-website').value||!form.reportValidity())return;
    const fields={name:$('contact-name').value.trim(),email:$('contact-email').value.trim(),message:$('contact-goal').value.trim(),estimate:brief(),consent:$('contact-consent').checked?'yes':'no',botcheck:false};
    contactBusy=true;button.disabled=true;form.setAttribute('aria-busy','true');status.textContent=tx('Enviando tu consulta…','Sending your enquiry…');
    const result=await sendEnquiry(key,fields);
    contactBusy=false;button.disabled=false;form.removeAttribute('aria-busy');
    if(result==='accepted'){
      form.reset();update();status.textContent=tx('Tu consulta fue recibida por Web3Forms. No se realizó ningún cobro. Serch revisará el contexto para responderte; este envío no reserva una cita.','Web3Forms received your enquiry. No payment was made. Serch will review it before replying; this does not book an appointment.');
    }else{
      const message=result==='timeout'?tx('La conexión tardó demasiado; no podemos confirmar el envío.','The connection timed out; we cannot confirm the submission.'):result==='limit'?tx('El proveedor ha limitado temporalmente los envíos.','The provider has temporarily limited submissions.'):result==='invalid'?tx('Revisa el nombre, correo y descripción de tu proyecto.','Check your name, email and project description.'):tx('No pudimos confirmar el envío.','We could not confirm the submission.');
      status.textContent=message+' '+tx('Tus datos siguen en el formulario. Puedes descargar el resumen o volver a intentarlo más tarde.','Your entries remain in the form. Download the summary or try again later.');
    }
  });
  document.addEventListener('portfolio:language',render);render();
})();
