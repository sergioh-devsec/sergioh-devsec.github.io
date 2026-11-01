// Shared menus use native details, usable even before JavaScript is available.
(() => {
 'use strict';
 const menus=Array.from(document.querySelectorAll('.cs-menu'));
 const labels={
  'index.html':['Inicio · La Oficina','Home · The Office'],
  'cotizador.html':['Impulsa tu negocio','Boost your business'],
  'cv.html':['Crear mi CV','Build my CV'],
  'herramientas.html':['Herramientas gratuitas','Free tools'],
  'portafolio.html':['Explora lo que hacemos','Explore our work'],
  'axiom-3d/index.html':['Conoce a Axiom en 3D','Meet Axiom in 3D'],
 };
 function english(){return document.documentElement.lang.toLowerCase().startsWith('en');}
 function render(){
  const en=english();
  document.querySelector('.cs-quick-start')?.setAttribute('aria-label',en?'Choose your next step':'Elige tu siguiente paso');
  document.querySelector('.room-footer nav')?.setAttribute('aria-label',en?'Information':'Información');
  const copies={possibilities:['Un laboratorio, muchas posibilidades.','One lab, many possibilities.'],technology:['Tecnología que puedes explorar.','Technology you can explore.'],cv:['Crear mi CV','Build my CV']};
  for(const node of document.querySelectorAll('[data-cs-copy]')){const pair=copies[node.dataset.csCopy];if(pair)node.textContent=pair[en?1:0];}
  for(const menu of menus){const summary=menu.querySelector('summary');if(summary)summary.textContent=en?'Explore':'Explorar';
   menu.querySelector('nav')?.setAttribute('aria-label',en?'Explore CyberSerch.mx':'Explorar CyberSerch.mx');
   for(const link of menu.querySelectorAll('a[href]')){
    const url=new URL(link.getAttribute('href'),location.href),path=url.pathname;
    const key=Object.keys(labels).sort((a,b)=>b.length-a.length).find(key=>path.endsWith('/'+key));if(key)link.textContent=labels[key][en?1:0];
    const here=location.pathname.endsWith('/')?location.pathname+'index.html':location.pathname;
    if(path===here)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
   }
  }
 }
 for(const menu of menus){
  menu.addEventListener('toggle',()=>{if(menu.open){menu.style.setProperty('--cs-menu-top',`${Math.max(8,Math.min(menu.querySelector('summary').getBoundingClientRect().bottom+10,innerHeight-160))}px`);for(const other of menus)if(other!==menu)other.open=false;}});
  menu.addEventListener('click',event=>{if(event.target.closest('a[href]'))menu.open=false;});
 }
 document.addEventListener('click',event=>{for(const menu of menus)if(menu.open&&!menu.contains(event.target))menu.open=false;});
 document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;for(const menu of menus)if(menu.open){menu.open=false;menu.querySelector('summary')?.focus();}});
 window.addEventListener('resize',()=>{for(const menu of menus)menu.open=false;});
 document.addEventListener('portfolio:language',render);document.addEventListener('site:mode',render);
 new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});render();
})();
