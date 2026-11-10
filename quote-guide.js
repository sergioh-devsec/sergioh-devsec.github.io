/* Axiom's guidance follows the active estimate section. */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const guide = byId('quote-guide');
  if (!guide) return;

  const I = window.I18N;
  const panels = [...document.querySelectorAll('[data-quote-panel]')];
  const stepButtons = [...guide.querySelectorAll('[data-guide-step]')];
  const back = byId('quote-step-back');
  const next = byId('quote-step-next');
  const packages = byId('quote-packages');
  const download = byId('quote-download');
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
      continue: 'Continuar a funciones',
      review: 'Revisar estimación',
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
      continue: 'Continue to features',
      review: 'Review estimate',
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
  let hub;
  let audioUnavailable = false;

  function currentTopic() {
    const selected = packages.querySelector('[data-quote-kind][aria-pressed="true"]');
    return topics[selected?.dataset.quoteKind] || 'webTerm';
  }

  function render() {
    const labels = copy[I.language] || copy.es;
    intro.textContent = labels.intro;
    position.textContent = labels.progress(step, panels.length);
    guide.querySelector('.quote-guide-steps').setAttribute('aria-label', labels.group);
    const advice = labels.advice[step - 1];
    if (line.textContent !== advice) line.textContent = advice;

    for (const panel of panels) panel.hidden = Number(panel.dataset.quotePanel) !== step;
    for (const button of stepButtons) {
      const active = Number(button.dataset.guideStep) === step;
      button.setAttribute('aria-pressed', String(active));
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    back.hidden = step === 1;
    back.textContent = labels.back;
    next.hidden = step === panels.length;
    next.textContent = step === 1 ? labels.continue : labels.review;
    if (audioUnavailable) status.textContent = I.t('quoteGuideAudioError');
    hub?.refresh();
  }

  function rememberStep() {
    if (history.state?.quoteStep !== step) {
      history.replaceState({ ...history.state, quoteStep: step }, '', location.href);
    }
  }

  function goTo(requested, { focus = true, react = true, saveHistory = false } = {}) {
    const previous = step;
    const needsCorrection = requested === 3 && download.disabled;
    const destination = needsCorrection ? 2 : requested;

    if (saveHistory && previous !== destination) {
      rememberStep();
      const hash = destination === 1 ? '' : '#quote-step-' + destination;
      history.pushState({ ...history.state, quoteStep: destination }, '', location.pathname + location.search + hash);
    }
    step = destination;
    render();

    if (needsCorrection) {
      const invalidField = [...byId('quote-options').querySelectorAll('input')]
        .find(field => !field.validity.valid || field.value === '');
      (invalidField || byId('quote-options-title')).focus();
      return false;
    }

    if (focus && previous !== step) {
      panels[step - 1].querySelector('[data-quote-heading]').focus({ preventScroll: true });
      guide.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    if (react && previous !== step) {
      if (step === 3) void hub?.react('finish', { priority: 2, maxAge: 5000 });
      else if (step === 2) void hub?.react('automation', { priority: 1, maxAge: 3500 });
    }
    return true;
  }

  function restoreStep(initial = false) {
    const target = byId(location.hash.slice(1));
    const panel = target?.closest('[data-quote-panel]');
    const fallback = initial || !location.hash ? 1 : step;
    const requested = Number(panel?.dataset.quotePanel) || history.state?.quoteStep || fallback;
    if (!initial && requested === step) return;

    const linkedContent = panel && target !== panel;
    const allowed = goTo(requested, { focus: !initial && !linkedContent, react: false });
    if (allowed && !initial && linkedContent) target.scrollIntoView({ block: 'start' });
  }

  for (const button of stepButtons) {
    button.addEventListener('click', () => goTo(Number(button.dataset.guideStep), { saveHistory: true }));
  }
  back.addEventListener('click', () => goTo(step - 1, { saveHistory: true }));
  next.addEventListener('click', () => goTo(step + 1, { saveHistory: true }));
  byId('quote-breakdown-link').addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (download.disabled) {
      event.preventDefault();
      goTo(3, { saveHistory: true });
      return;
    }
    rememberStep();
    goTo(3, { focus: false });
  });
  byId('quote-reset').addEventListener('click', () => goTo(1, { react: false, saveHistory: true }));
  packages.addEventListener('click', event => {
    const kind = event.target.closest('[data-quote-kind]')?.dataset.quoteKind;
    if (!Object.hasOwn(topics, kind)) return;
    void hub?.react(kind === 'security' ? 'security' : kind === 'automation' ? 'automation' : 'web', {
      priority: 3,
      maxAge: 6000,
    });
  });
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
