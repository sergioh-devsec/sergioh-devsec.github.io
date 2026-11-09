(() => {
  'use strict';

  const card = document.getElementById('cs-store-teaser');
  const title = card.querySelector('h2');
  const detail = card.querySelector('p');
  const practice = card.querySelector('[data-interview-promo-action]');
  const shop = card.querySelector('[data-interview-promo-shop]');
  const copy = {
    es: {
      messages: [
        ['Ensaya antes de la entrevista', 'Elige una pregunta, practica durante un minuto y abre un ejemplo de respuesta STAR.'],
        ['Cuenta un logro en 60 segundos', 'Practica cómo contar lo que hiciste y qué cambió. Tienes un ejemplo para empezar.'],
        ['Prepara una respuesta con estructura', 'Prueba una pregunta de entrevista y practica cómo explicar la situación, tu acción y el resultado.'],
      ],
      action: 'Probar la práctica gratis', shop: 'Explorar la tienda',
    },
    en: {
      messages: [
        ['Rehearse before your interview', 'Pick a question, practise for one minute and open an example STAR answer.'],
        ['Tell a story about an achievement in 60 seconds', 'Practise explaining what you did and what changed. Start with an example.'],
        ['Give your answer a clear structure', 'Try an interview question and practise explaining the situation, your action and the outcome.'],
      ],
      action: 'Try the free practice', shop: 'Browse the shop',
    },
  };
  const week = 7 * 24 * 60 * 60 * 1000;
  const campaignStart = Date.UTC(2026, 10, 9);
  const rotation = Math.floor(Math.max(0, Date.now() - campaignStart) / week) % copy.es.messages.length;

  function render() {
    const root = document.documentElement;
    const language = root.lang.startsWith('en') ? 'en' : 'es';
    const mode = root.dataset.mode === 'laboratorio' ? 'laboratorio' : 'oficina';
    const words = copy[language];
    [title.textContent, detail.textContent] = words.messages[rotation];
    practice.textContent = words.action;
    shop.textContent = words.shop;

    const context = new URLSearchParams({ idioma: language, modo: mode });
    shop.href = `tienda.html?${context}`;
    context.set('origen', 'portada');
    practice.href = `muestras/entrevista/${language === 'en' ? 'index-en.html' : ''}?${context}`;
  }

  render();
  new MutationObserver(render).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang', 'data-mode'],
  });
})();
