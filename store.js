import { resolveLanguage, resolveMode } from './modeManager.js';
import { mountPageVoice } from './page-voice.js?v=voice-36';

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
export function interviewOrigin(search) {
  const origin = new URLSearchParams(search).get('origen');
  return ['cv', 'tienda', 'redes'].includes(origin) ? origin : 'tienda';
}
function productCampaign(product, origin, fallback) {
  return product.id === 'entrevista' ? `entrevista-${origin}` : fallback;
}
export function selectProducts(products, category) { return products.filter(p => category === 'all' || p.category === category); }
function contextQuery(language, mode) {
  return new URLSearchParams({ idioma: language === 'en' ? 'en' : 'es', modo: mode === 'laboratorio' ? 'laboratorio' : 'oficina' });
}
export function professionalsUrl(language, mode) {
  return `profesionistas.html?${contextQuery(language, mode)}`;
}
function sampleUrl(product, language, mode, origin) {
  const hasEnglishPage = product.id === 'entrevista' || product.id === 'negocio';
  const path = language === 'en' && hasEnglishPage ? product.sample.replace(/index\.html$/, 'index-en.html') : product.sample;
  const query = contextQuery(language, mode);
  if (product.id === 'entrevista') query.set('origen', origin);
  return `${path}?${query}`;
}

export const CART_MAX_QUANTITY = 1;
export function unitPriceCents(product) {
  const value = product?.price;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 100000) return null;
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) && Math.abs(value * 100 - cents) < 1e-7 ? cents : null;
}
/** A local selection, never a payment session or proof of purchase. */
export function normalizeCart(lines, catalogue) {
  if (!Array.isArray(lines) || !Array.isArray(catalogue)) return [];
  const byId = new Map();
  for (const line of lines) {
    if (!line || typeof line.id !== 'string' || !Number.isSafeInteger(line.quantity) || line.quantity < 1) continue;
    const product = catalogue.find(p => p.id === line.id);
    if (!canPurchase(product) || unitPriceCents(product) === null) continue;
    const current = byId.get(line.id) || 0;
    byId.set(line.id, Math.min(CART_MAX_QUANTITY, current + Math.min(CART_MAX_QUANTITY, line.quantity)));
  }
  return [...byId].map(([id, quantity]) => ({ id, quantity }));
}
export function setCartQuantity(lines, id, quantity, catalogue) {
  const current = normalizeCart(lines, catalogue);
  const product = Array.isArray(catalogue) && catalogue.find(p => p.id === id);
  if (!canPurchase(product) || unitPriceCents(product) === null || !Number.isSafeInteger(quantity) || quantity < 0) return current;
  const next = current.filter(line => line.id !== id);
  if (quantity > 0) {
    const entry = { id, quantity: Math.min(CART_MAX_QUANTITY, quantity) };
    const index = current.findIndex(line => line.id === id);
    if (index < 0) next.push(entry); else next.splice(index, 0, entry);
  }
  return next;
}
export function addToCart(lines, id, catalogue) {
  const current = normalizeCart(lines, catalogue);
  const quantity = current.find(line => line.id === id)?.quantity || 0;
  return setCartQuantity(current, id, quantity + 1, catalogue);
}
export function cartSummary(lines, catalogue) {
  const normalized = normalizeCart(lines, catalogue);
  const entries = normalized.map(line => {
    const product = catalogue.find(p => p.id === line.id);
    const unitCents = unitPriceCents(product);
    return { ...line, unitCents, lineCents: unitCents * line.quantity };
  });
  return { lines: entries, count: entries.reduce((n, line) => n + line.quantity, 0),
    distinctCount: entries.length, totalCents: entries.reduce((n, line) => n + line.lineCents, 0) };
}

function mountCart({ document: doc, catalogue, I, origin }) {
  const dialog = doc.getElementById('shop-cart'), trigger = doc.getElementById('shop-cart-open');
  if (!dialog || !trigger) return { render() {} };
  const list = doc.getElementById('shop-cart-items'), empty = doc.getElementById('shop-cart-empty');
  const count = doc.getElementById('shop-cart-count'), total = doc.getElementById('shop-cart-total');
  const clear = doc.getElementById('shop-cart-clear'), announcement = doc.getElementById('shop-cart-announcement');
  let lines = [], opener = null;
  const money = cents => new Intl.NumberFormat(I.language === 'en' ? 'en-US' : 'es-MX', { style: 'currency', currency: 'USD', currencyDisplay: 'code' }).format(cents / 100);
  const node = (tag, className, value) => {
    const el = doc.createElement(tag); el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  function announce(key, values = {}) { if (announcement) announcement.textContent = I.t(key, values); }
  function render() {
    const summary = cartSummary(lines, catalogue); lines = summary.lines.map(({ id, quantity }) => ({ id, quantity }));
    count.textContent = String(summary.count); trigger.setAttribute('aria-label', I.t('shopCartOpen', { n: summary.count }));
    total.textContent = money(summary.totalCents); empty.hidden = summary.count !== 0; clear.hidden = summary.count === 0;
    const fragment = doc.createDocumentFragment();
    for (const line of summary.lines) {
      const product = catalogue.find(p => p.id === line.id), name = product.name[I.language];
      const item = node('li', 'shop-cart-item');
      const heading = node('h3', '', name), detail = node('p', 'shop-cart-unit', I.t('shopCartUnitPrice', { price: money(line.unitCents) }));
      const remove = node('button', 'shop-cart-remove', I.t('shopCartRemove')); remove.type = 'button';
      remove.setAttribute('aria-label', I.t('shopCartRemoveNamed', { name }));
      remove.addEventListener('click', () => { lines = setCartQuantity(lines, line.id, 0, catalogue); render(); announce('shopCartRemoved', { name }); dialog.querySelector('[data-cart-close]').focus(); });
      const buy = node('a', 'shop-button', I.t('shopCartCheckout')); buy.href = purchaseUrl(product.checkout, productCampaign(product, origin, 'carrito')); buy.target = '_blank'; buy.rel = 'noopener noreferrer';
      buy.setAttribute('aria-label', I.t('shopCartCheckoutNamed', { name }));
      item.append(heading, detail, remove, buy); fragment.append(item);
    }
    list.replaceChildren(fragment);
  }
  function close() {
    if (dialog.open) dialog.close();
    doc.documentElement.classList.remove('shop-cart-open'); trigger.setAttribute('aria-expanded', 'false');
    if (opener?.isConnected) opener.focus();
  }
  trigger.addEventListener('click', () => {
    if (dialog.open) return;
    opener = doc.activeElement; render(); dialog.showModal(); doc.documentElement.classList.add('shop-cart-open');
    trigger.setAttribute('aria-expanded', 'true'); dialog.querySelector('[data-cart-close]').focus();
  });
  for (const button of dialog.querySelectorAll('[data-cart-close]')) button.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { doc.documentElement.classList.remove('shop-cart-open'); trigger.setAttribute('aria-expanded', 'false'); });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button:not([disabled]),a[href],select,input,[tabindex]:not([tabindex="-1"])')].filter(el => !el.closest('[hidden]') && el.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  clear.addEventListener('click', () => { lines = []; render(); announce('shopCartCleared'); dialog.querySelector('[data-cart-close]').focus(); });
  for (const button of doc.querySelectorAll('[data-cart-add]')) button.addEventListener('click', () => {
    const id = button.dataset.cartAdd, product = catalogue.find(p => p.id === id);
    if (!canPurchase(product)) return;
    const previous = lines.find(line => line.id === id)?.quantity || 0;
    lines = addToCart(lines, id, catalogue); render();
    announce(previous >= CART_MAX_QUANTITY ? 'shopCartAlready' : 'shopCartAdded', { name: product.name[I.language], n: cartSummary(lines, catalogue).count });
  });
  render(); return { render };
}

function start() {
  const I=window.I18N, catalogue=window.STORE_CATALOG?.products || [];
  if(!I) return;
  const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
  document.documentElement.dataset.mode=resolveMode(location.search,read('site_mode'));
  const mode=document.getElementById('shop-mode');
  mode.value=document.documentElement.dataset.mode;
  mode.addEventListener('change',()=>{document.documentElement.dataset.mode=mode.value;try{localStorage.setItem('site_mode',mode.value);}catch{}renderContextLinks();document.dispatchEvent(new CustomEvent('site:mode',{detail:{mode:mode.value}}));});
  I.setLanguage(resolveLanguage(location.search,read('cyberserch-language'),navigator.language),false);
  const origin = interviewOrigin(location.search);
  const cart = mountCart({ document, catalogue, I, origin });
  let selected='all';
  function renderContextLinks() {
    const currentMode = document.documentElement.dataset.mode;
    for (const link of document.querySelectorAll('[data-professionals-link]')) link.href = professionalsUrl(I.language, currentMode);
    for (const row of document.querySelectorAll('[data-product]')) {
      const product = catalogue.find(p => p.id === row.dataset.product);
      if (!product?.sample) continue;
      const href = sampleUrl(product, I.language, currentMode, origin);
      for (const link of row.querySelectorAll('[data-product-sample]')) link.href = href;
      const primary = row.querySelector('[data-product-buy]');
      if (primary && !canPurchase(product)) primary.href = href;
    }
  }
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
        if (active) buy.href=purchaseUrl(product.checkout,productCampaign(product,origin,product.slug));
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
    cart.render();
    renderContextLinks();
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
