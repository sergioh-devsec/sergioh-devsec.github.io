(() => {
  'use strict';

  const products = new Map([
    ['entrevista', 'entrevista-express'],
    ['negocio', 'ordena-tu-negocio'],
    ['soc', 'laboratorio-soc-inicial'],
    ['plantillas', 'paginas-para-tres-negocios'],
    ['ia-local', 'ia-local-privacidad#requisitos'],
  ]);
  const query = new URLSearchParams(location.search);
  const mode = query.get('modo') === 'laboratorio' ? 'laboratorio' : 'oficina';
  const pageLanguage = () => document.documentElement.lang.startsWith('en') ? 'en' : 'es';
  const requested = query.get('idioma');
  const preferred = requested === 'en' || requested === 'es' ? requested : pageLanguage();
  const languageToggle = document.getElementById('lang');

  function contextualUrl(path, language) {
    const url = new URL(path, location.href);
    url.search = new URLSearchParams({ idioma: language, modo: mode });
    return url.href;
  }

  function updateReturnLinks(language) {
    for (const link of document.querySelectorAll('[data-product-return]')) {
      const destination = products.get(link.dataset.productReturn);
      if (!destination) continue;
      link.href = contextualUrl(`../../${destination}`, language);
      if (link.dataset[language]) {
        link.textContent = link.dataset[language];
        link.lang = language;
      }
    }
  }

  for (const link of document.querySelectorAll('[data-sample-english]')) {
    link.href = contextualUrl('index-en', 'en');
  }
  if (languageToggle) {
    if (preferred !== pageLanguage()) languageToggle.click();
    languageToggle.addEventListener('click', () => updateReturnLinks(pageLanguage()));
  }
  updateReturnLinks(languageToggle ? pageLanguage() : preferred);
})();
