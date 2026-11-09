/* Additive shop access. Existing menus, content, tools, voice and language
   controllers stay intact; only nodes owned by this module are updated. */
(() => {
  'use strict';
  const doc = document;
  const source = doc.currentScript?.src || new URL('store-entry.js', location.href).href;
  const shop = new URL('tienda', source).href;
  const TEXT = {
    es: { shop: 'Tienda', label: 'Recursos digitales', tag: 'PARA TU PRÓXIMO PASO', title: 'Recursos listos para usar',
      copy: 'Guías, herramientas y plantillas para pasar de la idea a la práctica.', action: 'Explorar la tienda' },
    en: { shop: 'Shop', label: 'Digital resources', tag: 'FOR YOUR NEXT STEP', title: 'Resources ready to use',
      copy: 'Guides, tools and templates to take your next idea into practice.', action: 'Browse the shop' }
  };
  const owned = [];
  const english = () => String(doc.documentElement.lang).toLowerCase().startsWith('en');
  const make = (tag, className, key) => {
    const node = doc.createElement(tag); node.className = className;
    if (key) { node.dataset.storeEntryCopy = key; owned.push(node); }
    return node;
  };
  function shopLink(nav) {
    const existing = Array.from(nav.querySelectorAll('a[href]')).find(link => {
      try { return new URL(link.href, location.href).pathname === new URL(shop).pathname; } catch { return false; }
    });
    if (existing) return;
    const link = make('a', 'cs-store-link', 'shop'); link.href = shop;
    link.dataset.storeEntryLink = 'true'; nav.append(link);
  }
  for (const nav of doc.querySelectorAll('.cs-menu nav')) shopLink(nav);
  for (const footer of doc.querySelectorAll('footer')) {
    let nav = Array.from(footer.querySelectorAll('nav')).find(node => !node.classList.contains('cs-social-footer'));
    if (!nav) {
      nav = make('nav', 'cs-store-footer-nav'); nav.dataset.storeEntryNav = 'true'; footer.append(nav);
    }
    shopLink(nav);
  }
  const estimate = doc.getElementById('cotizador-directo');
  if (estimate && !doc.getElementById('cs-store-teaser')) {
    const section = make('section', 'cs-store-teaser'); section.id = 'cs-store-teaser';
    section.setAttribute('aria-labelledby', 'cs-store-teaser-title');
    const copy = make('div', 'cs-store-teaser-copy');
    const title = make('h2', 'cs-store-teaser-title', 'title'); title.id = 'cs-store-teaser-title';
    const detail = make('p', 'cs-store-teaser-detail', 'copy'); copy.append(title, detail);
    const action = make('a', 'cs-store-teaser-action', 'action'); action.href = shop;
    section.append(copy, action); estimate.after(section);
  }
  function render() {
    const words = TEXT[english() ? 'en' : 'es'];
    for (const node of owned) node.textContent = words[node.dataset.storeEntryCopy];
    for (const nav of doc.querySelectorAll('[data-store-entry-nav]')) nav.setAttribute('aria-label', words.label);
  }
  doc.addEventListener('portfolio:language', render);
  doc.addEventListener('site:mode', render);
  new MutationObserver(render).observe(doc.documentElement, { attributes: true, attributeFilter: ['lang'] });
  render();
})();
