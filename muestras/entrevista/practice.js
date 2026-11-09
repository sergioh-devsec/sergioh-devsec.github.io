(() => {
  'use strict';

  const language = document.documentElement.lang === 'en' ? 'en' : 'es';
  const params = new URLSearchParams(location.search);
  const mode = params.get('modo') === 'laboratorio' ? 'laboratorio' : 'oficina';
  const origins = params.getAll('origen');
  const source = origins.length === 1 && ['cv', 'tienda', 'redes'].includes(origins[0]) ? origins[0] : null;

  function contextualUrl(path, destinationLanguage) {
    const url = new URL(path, location.href);
    url.search = new URLSearchParams({ idioma: destinationLanguage, modo: mode });
    if (source) url.searchParams.set('origen', source);
    return url.href;
  }

  for (const link of document.querySelectorAll('[data-interview-language]')) {
    const targetLanguage = link.dataset.interviewLanguage;
    if (targetLanguage !== 'es' && targetLanguage !== 'en') continue;
    link.href = contextualUrl(targetLanguage === 'en' ? 'index-en.html' : 'index.html', targetLanguage);
  }
  const product = document.querySelector('[data-product-return="entrevista"]');
  if (product) {
    product.href = contextualUrl('../../entrevista-express.html', language);
    product.textContent = product.dataset[language];
    product.lang = language;
  }

  const practice = document.getElementById('interview-practice');
  if (!practice) return;
  const question = document.getElementById('practice-question');
  const prompt = document.getElementById('practice-prompt');
  const clock = document.getElementById('practice-clock');
  const start = document.getElementById('practice-start');
  const reset = document.getElementById('practice-reset');
  const status = document.getElementById('practice-status');
  const answer = document.getElementById('practice-answer');
  const example = document.getElementById('practice-example');
  const templates = new Map(Array.from(practice.querySelectorAll('[data-interview-question]'),
    template => [template.dataset.interviewQuestion, template]));
  const duration = 60;
  let deadline = null;
  let timeout;

  function renderQuestion() {
    const content = templates.get(question.value).content;
    prompt.textContent = content.querySelector('p').textContent;
    example.replaceChildren(content.querySelector('dl').cloneNode(true));
  }

  function renderTime(seconds) {
    const value = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    if (clock.textContent !== value) clock.textContent = value;
  }

  function stopClock() {
    clearTimeout(timeout);
    deadline = null;
    start.removeAttribute('aria-disabled');
  }

  function resetPractice(message = '') {
    stopClock();
    renderTime(duration);
    answer.open = false;
    status.textContent = message;
  }

  function updateClock() {
    clearTimeout(timeout);
    if (deadline === null) return;
    const seconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    renderTime(seconds);
    if (seconds === 0) {
      stopClock();
      answer.open = true;
      status.textContent = practice.dataset.finished;
      return;
    }
    timeout = setTimeout(updateClock, 250);
  }

  start.addEventListener('click', () => {
    if (deadline !== null) return;
    answer.open = false;
    start.setAttribute('aria-disabled', 'true');
    status.textContent = practice.dataset.started;
    deadline = performance.now() + duration * 1000;
    updateClock();
  });
  reset.addEventListener('click', () => resetPractice(practice.dataset.reset));
  question.addEventListener('change', () => {
    renderQuestion();
    resetPractice(practice.dataset.reset);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && deadline !== null) updateClock();
  });
  window.addEventListener('pagehide', () => resetPractice());

  renderQuestion();
  document.getElementById('practice-fallback').hidden = true;
  practice.hidden = false;
})();
