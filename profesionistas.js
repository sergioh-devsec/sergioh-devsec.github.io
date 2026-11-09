import { GAD7, scoreGad7, mountGad7, selectInstruments } from './psychology-instruments.js';
import { professionalCopy, mergeProfessionalTranslations } from './profesionistas-translations.js?v=19a23562b290';
import { createStandaloneHTML } from './psychology-download.js?v=ef1c4224d4a9';
import { resolveLanguage, resolveMode } from './modeManager.js';

export function calculateProfessionalBudget(units, price) {
  if (!Number.isInteger(units) || units < 1 || units > 10000 || !/^(?:\d{1,7}(?:\.\d{1,2})?|\.\d{1,2})$/.test(price)) return null;
  const [whole, fraction = ''] = price.split('.');
  const unitCents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return {unitCents, totalCents: units * unitCents};
}

function saveDownload(data, type, filename) {
  const url = URL.createObjectURL(new Blob([data], {type}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function mountBudget(query, ui) {
  const form = query('#professional-budget');
  const concept = query('#budget-service');
  const units = query('#budget-units');
  const price = query('#budget-price');
  const output = query('#budget-output');
  const total = query('#budget-total');
  let estimate = null;

  const money = cents => new Intl.NumberFormat(ui().language === 'en' ? 'en-US' : 'es-MX', {
    style: 'currency', currency: 'MXN', currencyDisplay: 'code',
  }).format(cents / 100);
  function render() {
    output.hidden = !estimate;
    total.textContent = estimate ? money(estimate.totalCents) : '';
  }
  function calculate() {
    const name = concept.value.trim();
    concept.setCustomValidity(name ? '' : ui().budgetMissing);
    if (!form.reportValidity()) return;
    const count = units.valueAsNumber;
    const amounts = calculateProfessionalBudget(count, price.value);
    if (!amounts) {
      price.setCustomValidity(ui().budgetInvalid);
      price.reportValidity();
      return;
    }
    estimate = {...amounts, name, count};
    render();
  }
  form.addEventListener('input', event => {
    event.target.setCustomValidity?.('');
    estimate = null;
    render();
  });
  form.addEventListener('submit', event => { event.preventDefault(); calculate(); });
  query('#budget-sample').addEventListener('click', () => {
    concept.value = ui().budgetExample;
    units.value = '3';
    price.value = '450.50';
    price.setCustomValidity('');
    calculate();
  });
  query('#budget-download').addEventListener('click', () => {
    if (!estimate) return;
    const copy = ui();
    const data = [copy.budgetTitle, '', `${copy.budgetService}: ${estimate.name}`, `${copy.budgetUnits}: ${estimate.count}`,
      `${copy.budgetUnitPrice}: ${money(estimate.unitCents)}`, `${copy.budgetTotal}: ${money(estimate.totalCents)}`, '', copy.budgetNote];
    saveDownload(data.join('\r\n'), 'text/plain;charset=utf-8', copy.language === 'en' ? 'estimate-cyberserch.txt' : 'presupuesto-cyberserch.txt');
  });
  return render;
}

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
  const renderBudget = mountBudget(query, ui);

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
    renderBudget();
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
      saveDownload(html, 'text/html;charset=utf-8', `GAD-7-${fileLanguage}-${fileLanguage === 'es' ? 'en-blanco' : 'blank'}.html`);
      status.textContent = ui().downloaded;
    } catch { status.textContent = ui().downloadError; }
    finally { downloading = false; download.disabled = false; download.textContent = ui().downloadBlank; }
  });
  applyMode(mode);
  applyLanguage(language);
}

if (typeof document !== 'undefined') initProfessionals();
