/* Demonstrations run entirely in the browser; no data leaves these pages. */
(() => {
  'use strict';
  const tones=Object.freeze({berry:'Cereza',rose:'Rosa',pearl:'Perla',cocoa:'Cacao'});
  const finishes=Object.freeze({gloss:{name:'Brillo',extra:0},matte:{name:'Mate',extra:50},accent:{name:'Acento',extra:100}});
  function quoteStyle(tone,finish){
    if(!Object.hasOwn(tones,tone)||!Object.hasOwn(finishes,finish))return null;
    return {label:`Gel · ${tones[tone]} · ${finishes[finish].name}`,amount:450+finishes[finish].extra,tone,finish};
  }
  function demoDays(now=new Date(),count=5){
    if(!(now instanceof Date)||!Number.isFinite(now.getTime())||!Number.isInteger(count)||count<1||count>14)return [];
    const day=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12),result=[];
    while(result.length<count){day.setDate(day.getDate()+1);if(day.getDay()===0)continue;
      result.push({value:`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`,label:day.toLocaleDateString('es-MX',{weekday:'short'}),number:day.getDate(),full:day.toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})});
    }return result;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={quoteStyle,demoDays};
  if(typeof document==='undefined')return;
  // A simple, keyboard-native disclosure for the three stages of a visit.
  const visitButtons=[...document.querySelectorAll('[data-visit]')];
  visitButtons.forEach(button=>button.addEventListener('click',()=>{
    visitButtons.forEach(item=>{
      const selected=item===button;
      item.setAttribute('aria-pressed',String(selected));
      const panel=document.getElementById(item.getAttribute('aria-controls'));
      if(panel)panel.hidden=!selected;
    });
  }));
  const menu=document.querySelector('.menu-toggle'),nav=document.getElementById('navigation');
  function closeMenu(){if(!menu||!nav)return;menu.setAttribute('aria-expanded','false');nav.classList.remove('open');}
  menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
  nav?.addEventListener('click',event=>{if(event.target.closest('a,button'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
  const dialog=document.getElementById('booking-dialog'),form=document.getElementById('booking-form'),result=document.getElementById('booking-result');
  let opener=null;const days=demoDays();
  if(dialog&&form){
    const options=document.getElementById('day-options');
    for(const [index,day]of days.entries()){
      const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span'),strong=document.createElement('strong');
      input.type='radio';input.name='day';input.value=day.value;input.required=true;input.checked=index===0;input.setAttribute('aria-label',day.full);
      span.textContent=day.label;strong.textContent=String(day.number);span.append(strong);label.append(input,span);options.append(label);
    }
    document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>{
      opener=button;closeMenu();result.hidden=true;result.replaceChildren();
      const service=button.dataset.service,select=document.getElementById('service');
      if(service&&[...select.options].some(o=>o.value===service))select.value=service;
      dialog.showModal();
    }));
    dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>opener?.focus({preventScroll:true}));
    dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const data=new FormData(form),day=days.find(item=>item.value===data.get('day')),service=String(data.get('service')),time=String(data.get('time'));
      if(!day||![...document.getElementById('service').options].some(o=>o.value===service)||!['10:00','12:30','16:00','17:30'].includes(time))return;
      result.replaceChildren();const title=document.createElement('strong'),description=document.createElement('p'),notice=document.createElement('p');
      title.textContent='Así se vería tu elección';description.textContent=`${service} · ${day.full} · ${time}`;
      const style=document.getElementById('style-description');if(service==='Mi combinación de gel'&&style)description.textContent+=` · ${style.textContent}`;
      notice.className='small';notice.textContent='Solo es una vista previa. No se ha creado una cita, enviado una solicitud ni efectuado un cobro.';
      result.append(title,description,notice);result.hidden=false;result.tabIndex=-1;result.focus({preventScroll:true});result.scrollIntoView({block:'nearest',behavior:'auto'});
    });
  }
  const styleForm=document.getElementById('style-form');
  if(styleForm){
    function updateStyle(){const data=new FormData(styleForm),quote=quoteStyle(data.get('tone'),data.get('finish'));if(!quote)return;
      const preview=document.querySelector('.polish-preview');preview.dataset.tone=quote.tone;preview.dataset.finish=quote.finish;preview.setAttribute('aria-label','Muestra gráfica: '+quote.label);
      document.getElementById('style-description').textContent=quote.label;document.getElementById('style-price').textContent=`$${quote.amount} MXN`;
    }styleForm.addEventListener('change',updateStyle);styleForm.addEventListener('submit',event=>event.preventDefault());updateStyle();
  }
})();
