import { resolveLanguage, resolveMode } from './modeManager.js';
import { mountPageVoice } from './page-voice.js';

export const STORE_HOST = 'cyberserch.gumroad.com';
export function purchaseUrl(value, source = 'tienda') {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.hostname !== STORE_HOST || u.port || u.username || u.password || u.search || u.hash || !/^\/l\/[a-z0-9-]+$/.test(u.pathname)) return null;
    if (!/^[a-z0-9-]{1,64}$/.test(source)) return null;
    u.searchParams.set('utm_source','cyberserch'); u.searchParams.set('utm_medium','website'); u.searchParams.set('utm_campaign',source);
    return u.href;
  } catch { return null; }
}
export function canPurchase(product) { return product?.status === 'available' && purchaseUrl(product.checkout, product.slug) !== null; }
export function selectProducts(products, category) { return products.filter(p => category === 'all' || p.category === category); }

function start() {
  const I=window.I18N, catalogue=window.STORE_CATALOG?.products || [];
  if(!I) return;
  const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
  document.documentElement.dataset.mode=resolveMode(location.search,read('site_mode'));
  const mode=document.getElementById('shop-mode');
  mode.value=document.documentElement.dataset.mode;
  mode.addEventListener('change',()=>{document.documentElement.dataset.mode=mode.value;try{localStorage.setItem('site_mode',mode.value);}catch{}document.dispatchEvent(new CustomEvent('site:mode',{detail:{mode:mode.value}}));});
  I.setLanguage(resolveLanguage(location.search,read('cyberserch-language'),navigator.language),false);
  let selected='all';
  function render() {
    const lang=I.language;
    for(const row of document.querySelectorAll('[data-product]')) {
      const product=catalogue.find(p=>p.id===row.dataset.product); if(!product)continue;
      const name=row.querySelector('[data-product-name]');if(name)name.textContent=product.name[lang];
      const lead=row.querySelector('[data-product-lead]');if(lead)lead.textContent=product.lead[lang];
      const buy=row.querySelector('[data-product-buy]');
      const status=row.querySelector('[data-product-status]');
      const active=canPurchase(product);
      if(status) status.textContent=I.t(active?'shopStatusReady':product.status==='validation'?'shopStatusValidation':'shopStatusPreview');
      if(buy) {
        buy.href=active?purchaseUrl(product.checkout,product.slug):product.sample;
        buy.textContent=active?I.t('shopBuy',{price:product.price}):I.t('shopSample');
        if(active){buy.target='_blank';buy.rel='noopener noreferrer';}else{buy.removeAttribute('target');buy.removeAttribute('rel');}
      }
    }
    for(const link of document.querySelectorAll('[data-cv-checkout]')) {
      const name=link.dataset.cvCheckout;
      const base=name==='pro'?'https://cyberserch.gumroad.com/l/cv-profesional-axiom':'https://cyberserch.gumroad.com/l/cv-multi-vacante-axiom';
      link.href=purchaseUrl(base,'cv-tienda');
    }
    filter(selected);
  }
  function filter(category) {
    selected=category;
    for(const button of document.querySelectorAll('[data-store-filter]'))button.setAttribute('aria-pressed',String(button.dataset.storeFilter===category));
    const visible=selectProducts(catalogue,category);
    for(const row of document.querySelectorAll('.shop-product[data-product]'))row.hidden=!visible.some(p=>p.id===row.dataset.product);
    const count=document.getElementById('shop-count');if(count)count.textContent=I.t('shopCount',{n:visible.length});
  }
  for(const button of document.querySelectorAll('[data-store-filter]'))button.addEventListener('click',()=>filter(button.dataset.storeFilter));
  document.addEventListener('portfolio:language',render);
  render();
  const voice=mountPageVoice({initialKey:'businessAnswer2'});
  for(const link of document.querySelectorAll('[data-product-buy]'))link.addEventListener('click',()=>{void voice?.react('finish',{priority:1});});
}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
