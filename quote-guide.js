/* Axiom's guidance follows the active estimate section. */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const guide = byId('quote-guide');
  if (!guide) return;

  const I = window.I18N;
  const panels = [...document.querySelectorAll('[data-quote-panel]')];
  const stepMarkers = [...guide.querySelectorAll('[data-guide-step]')];
  const back = byId('quote-step-back');
  const next = byId('quote-step-next');
  const packages = byId('quote-packages');
  const options = byId('quote-options');
  const download = byId('quote-download');
  const breakdown = byId('quote-breakdown-link');
  const requirement = byId('quote-step-requirement');
  const voice = byId('quote-guide-voice');
  const status = byId('quote-guide-status');
  const line = byId('quote-guide-line');
  const position = byId('quote-step-progress');
  const intro = byId('quote-guide-intro');
  const copy = {
    es: {
      intro: 'Elige una base, añade funciones y revisa tu estimación.',
      group: 'Pasos de la cotización',
      progress: (step, total) => `Paso ${step} de ${total}`,
      back: 'Atrás',
      next: 'Siguiente',
      required: 'Selecciona un tipo de proyecto para habilitar Siguiente.',
      advice: [
        'Elige el tipo de proyecto y revisa sus ejemplos antes de continuar.',
        'Marca las funciones que necesitas y mira cómo cambia el total.',
        'Revisa el desglose. Puedes descargarlo o preparar una consulta.',
      ],
    },
    en: {
      intro: 'Choose a base, add features and review your estimate.',
      group: 'Estimate steps',
      progress: (step, total) => `Step ${step} of ${total}`,
      back: 'Back',
      next: 'Next',
      required: 'Select a project type to enable Next.',
      advice: [
        'Choose the project type and look at its examples before continuing.',
        'Select the features you need and see how the total changes.',
        'Review the breakdown. You can download it or prepare an enquiry.',
      ],
    },
  };
  const topics = {
    landing: 'webTerm',
    information: 'webTerm',
    custom: 'webTerm',
    automation: 'automationTerm',
    security: 'securityTerm',
  };
  let step = 1;
  let confirmedBase = '';
  let hub;
  let audioUnavailable = false;
  const suggestedBase = packages.querySelector('[data-quote-kind][aria-pressed="true"]')?.dataset.quoteKind;

  function currentTopic() {
    return topics[confirmedBase || suggestedBase] || 'webTerm';
  }

  function updateNext() {
    const needsBase = step === 1 && !confirmedBase;
    const invalidOptions = step === 2 && download.disabled;
    next.disabled = needsBase || invalidOptions;
    requirement.hidden = !needsBase;
    if (needsBase) next.setAttribute('aria-describedby', requirement.id);
    else if (invalidOptions) next.setAttribute('aria-describedby', 'quote-error');
    else next.removeAttribute('aria-describedby');
  }

  function render() {
    const labels = copy[I.language] || copy.es;
    intro.textContent = labels.intro;
    position.textContent = labels.progress(step, panels.length);
    guide.querySelector('.quote-guide-steps').setAttribute('aria-label', labels.group);
    const advice = labels.advice[step - 1];
    if (line.textContent !== advice) line.textContent = advice;

    for (const panel of panels) panel.hidden = Number(panel.dataset.quotePanel) !== step;
    for (const marker of stepMarkers) {
      if (Number(marker.dataset.guideStep) === step) marker.setAttribute('aria-current', 'step');
      else marker.removeAttribute('aria-current');
    }
    for (const button of packages.querySelectorAll('[data-quote-kind]')) {
      button.setAttribute('aria-pressed', String(button.dataset.quoteKind === confirmedBase));
    }
    back.hidden = step === 1;
    back.textContent = labels.back;
    next.hidden = step === panels.length;
    next.textContent = labels.next;
    breakdown.hidden = step !== panels.length;
    requirement.textContent = labels.required;
    updateNext();
    if (audioUnavailable) status.textContent = I.t('quoteGuideAudioError');
    hub?.refresh();
  }

  function stepUrl(destination) {
    const hash = destination === 1 ? '' : '#quote-step-' + destination;
    return location.pathname + location.search + hash;
  }

  function goTo(requested, { focus = true, react = true, saveHistory = false } = {}) {
    const previous = step;
    if (saveHistory && previous !== requested) {
      history.replaceState({ ...history.state, quoteStep: previous }, '', location.href);
      history.pushState({ ...history.state, quoteStep: requested }, '', stepUrl(requested));
    }
    step = requested;
    render();

    if (focus && previous !== step) {
      panels[step - 1].querySelector('[data-quote-heading]').focus({ preventScroll: true });
      guide.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    if (react && previous !== step) {
      if (step === 3) void hub?.react('finish', { priority: 2, maxAge: 5000 });
      else if (step === 2) void hub?.react('automation', { priority: 1, maxAge: 3500 });
    }
  }

  function restoreStep(initial = false) {
    const target = byId(location.hash.slice(1));
    const panel = target?.closest('[data-quote-panel]');
    const fallback = initial || !location.hash ? 1 : step;
    const remembered = Number(history.state?.quoteStep);
    const requested = Number(panel?.dataset.quotePanel) || (panels[remembered - 1] ? remembered : fallback);
    if (requested > step) {
      history.replaceState({ ...history.state, quoteStep: step }, '', stepUrl(step));
      if (initial) render();
      return;
    }
    if (initial || requested < step) goTo(requested, { focus: !initial, react: false });
  }

  back.addEventListener('click', () => {
    if (step > 1) goTo(step - 1, { saveHistory: true });
  });
  next.addEventListener('click', () => {
    updateNext();
    if (step < panels.length && !next.disabled) goTo(step + 1, { saveHistory: true });
  });
  breakdown.addEventListener('click', event => {
    if (step !== panels.length) event.preventDefault();
  });
  byId('quote-reset').addEventListener('click', () => {
    confirmedBase = '';
    goTo(1, { react: false, saveHistory: true });
  });
  packages.addEventListener('click', event => {
    const kind = event.target.closest('[data-quote-kind]')?.dataset.quoteKind;
    if (step !== 1 || !Object.hasOwn(topics, kind)) return;
    confirmedBase = kind;
    render();
    void hub?.react(kind === 'security' ? 'security' : kind === 'automation' ? 'automation' : 'web', {
      priority: 3,
      maxAge: 6000,
    });
  });
  options.addEventListener('input', updateNext);
  window.addEventListener('popstate', () => restoreStep());
  window.addEventListener('hashchange', () => restoreStep());
  document.addEventListener('portfolio:language', render);
  restoreStep(true);

  voice.disabled = true;
  import('./page-voice.js?v=voice-36').then(({ mountPageVoice, bindVoiceButton, voiceText }) => {
    hub = mountPageVoice({ page: 'quote', initialKey: currentTopic() });
    voice.disabled = false;
    voice.removeAttribute('data-i18n');
    bindVoiceButton(voice, { hub, key: currentTopic, iconOnly: true });
    hub.subscribe(state => {
      status.textContent = state.error ? voiceText('voice_error') : state.playing ? voiceText('voice_playing') : '';
    });
  }).catch(() => {
    audioUnavailable = true;
    status.textContent = I.t('quoteGuideAudioError');
  });
})();
