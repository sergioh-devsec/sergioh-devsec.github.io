import { GAD7, scoreGad7, mountGad7, selectInstruments } from './psychology-instruments.js';
import { professionalCopy, mergeProfessionalTranslations } from './profesionistas-translations.js';
import { createStandaloneHTML } from './psychology-download.js';
import { resolveLanguage, resolveMode } from './modeManager.js';

function initProfessionals() {
  mergeProfessionalTranslations(window.TRANSLATIONS ??= { es: {}, en: {} });
  const query = selector => document.querySelector(selector);
  // Read URL preferences through the shared pure resolvers; this health page
  // deliberately does not instantiate the manager that persists preferences.
  let language = resolveLanguage(location.search, null, navigator.language);
  let mode = resolveMode(location.search, null);
  let disposeQuestionnaire = null;
  let downloading = false;
  const root = query('#gad7-questionnaire');
  const filters = query('#instrument-filters');
  const download = query('#download-blank');
  const status = query('#download-status');
  const ui = () => professionalCopy[language];

  function updatePreferenceURL() {
    try {
      const url = new URL(location.href);
      // A shared health-tool link carries interface choices only. Never put
      // questionnaire state or arbitrary form values into the address.
      url.search = '';
      url.searchParams.set('idioma', language);
      url.searchParams.set('modo', mode);
      history.replaceState(history.state, '', url.href);
    } catch { /* Restricted previews may not permit history changes. */ }
  }
  function applyMode(value) {
    mode = value === 'laboratorio' ? 'laboratorio' : 'oficina';
    document.documentElement.dataset.mode = mode;
    query('#professional-mode').value = mode;
  }

  function renderFilters() {
    const instruments = selectInstruments([GAD7], { symptom: query('#instrument-symptom').value, method: query('#instrument-method').value, sort: query('#instrument-sort').value, search: query('#instrument-search').value });
    query('#gad7-catalog').hidden = instruments.length === 0;
    query('#instrument-empty').hidden = instruments.length !== 0;
    query('#instrument-count').textContent = (instruments.length === 1 ? ui().count : ui().countOther).replace('{n}', String(instruments.length));
  }
  function renderQuestionnaire() {
    disposeQuestionnaire?.();
    disposeQuestionnaire = mountGad7(root, GAD7, ui(), scoreGad7);
  }
  function applyLanguage(value, announce = false) {
    if (!['es', 'en'].includes(value)) return;
    language = value; document.documentElement.lang = value;
    query('#professional-language').value = value;
    document.title = ui().title;
    query('meta[name="description"]').content = ui().description;
    document.querySelectorAll('[data-prof-copy]').forEach(node => { node.textContent = ui()[node.dataset.profCopy]; });
    document.querySelectorAll('[data-prof-label]').forEach(node => { node.setAttribute('aria-label', ui()[node.dataset.profLabel]); });
    document.querySelectorAll('[data-prof-placeholder]').forEach(node => { node.placeholder = ui()[node.dataset.profPlaceholder]; });
    status.textContent = '';
    renderFilters();
    if (disposeQuestionnaire) renderQuestionnaire();
    if (announce && !root.hidden) query('#language-status').textContent = ui().languageReset;
    download.disabled = downloading;
    if (downloading) download.textContent = ui().downloading;
  }
  query('#professional-language').addEventListener('change', event => { applyLanguage(event.target.value, true); updatePreferenceURL(); });
  query('#professional-mode').addEventListener('change', event => { applyMode(event.target.value); updatePreferenceURL(); });
  filters.addEventListener('submit', event => event.preventDefault());
  filters.addEventListener('input', renderFilters);
  filters.addEventListener('change', renderFilters);
  query('#clear-filters').addEventListener('click', () => { filters.reset(); renderFilters(); query('#instrument-search').focus(); });
  query('#open-questionnaire').addEventListener('click', () => {
    root.hidden = false;
    if (!disposeQuestionnaire) renderQuestionnaire();
    root.querySelector('h3').tabIndex = -1;
    root.querySelector('h3').focus();
    root.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  download.addEventListener('click', async () => {
    if (downloading) return;
    downloading = true; download.disabled = true; download.textContent = ui().downloading; status.textContent = '';
    const fileLanguage = language;
    try {
      const html = await createStandaloneHTML(fileLanguage);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `GAD-7-${fileLanguage}-${fileLanguage === 'es' ? 'en-blanco' : 'blank'}.html`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = ui().downloaded;
    } catch { status.textContent = ui().downloadError; }
    finally { downloading = false; download.disabled = false; download.textContent = ui().downloadBlank; }
  });
  applyMode(mode);
  applyLanguage(language);
}

if (typeof document !== 'undefined') initProfessionals();
