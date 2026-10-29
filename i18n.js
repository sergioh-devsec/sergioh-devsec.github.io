/* Translate only trusted dictionary text and explicitly named attributes. */
(() => {
  'use strict';
  const dictionaries=window.TRANSLATIONS;
  let language=(navigator.language||'es').toLowerCase().startsWith('en')?'en':'es';
  try{const saved=localStorage.getItem('cyberserch-language');if(['es','en'].includes(saved))language=saved;}catch{/* Optional preference storage. */}
  function t(key,values={}){const value=dictionaries[language][key]??dictionaries.es[key]??key;return String(value).replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));}
  function apply(root=document){
    root.querySelectorAll('[data-i18n]').forEach(node=>{node.textContent=t(node.dataset.i18n);});
    for(const attr of ['aria-label','alt','title','placeholder'])root.querySelectorAll(`[data-i18n-${attr}]`).forEach(node=>node.setAttribute(attr,t(node.getAttribute(`data-i18n-${attr}`))));
  }
  function setLanguage(value,persist=true){if(!['es','en'].includes(value))return;language=value;document.documentElement.lang=value;document.querySelector('#language').value=value;apply();document.title=t(document.body.dataset.pageTitle||'pageTitle');document.querySelector('meta[name="description"]').content=t(document.body.dataset.pageDescription||'pageDescription');if(persist)try{localStorage.setItem('cyberserch-language',value);}catch{/* Nonessential. */}document.dispatchEvent(new CustomEvent('portfolio:language',{detail:{language}}));}
  window.I18N={t,apply,setLanguage,get language(){return language;}};
  document.querySelector('#language').addEventListener('change',event=>setLanguage(event.target.value));
  setLanguage(language,false);
})();
