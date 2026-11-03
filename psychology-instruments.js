/* GAD-7 source and scoring, shared by the website and its blank offline file.
 * Instrument: Spitzer, Williams, Kroenke and colleagues; educational grant Pfizer.
 * PHQ manual (pp. 2, 6, 8):
 * https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf
 * Published Spanish (USA), not a Mexico-specific validation claim:
 * https://capp.ucsf.edu/sites/g/files/tkssra6871/f/GAD-7_Spanish.pdf
 * Published English wording:
 * https://www.hiv.uw.edu/page/mental-health-screening/gad-7
 * The instrument is public domain. CyberSerch supplies the software interface,
 * not a new validated instrument, diagnostic service or clinical endorsement.
 */
export const GAD7 = Object.freeze({
  id: 'gad7', name: 'GAD-7', symptoms: ['anxiety'], method: 'self-report',
  // Actual date first added to this catalog; not the instrument publication date.
  catalogAdded: '2026-11-03', publicationYear: 2006,
  sources: {
    manual: 'https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf',
    es: 'https://capp.ucsf.edu/sites/g/files/tkssra6871/f/GAD-7_Spanish.pdf',
    en: 'https://www.hiv.uw.edu/page/mental-health-screening/gad-7'
  },
  es: {
    stem: 'Durante las últimas 2 semanas, ¿qué tan seguido ha tenido molestias debido a los siguientes problemas?',
    choices: ['Ningún día', 'Varios días', 'Más de la mitad de los días', 'Casi todos los días'],
    items: [
      'Se ha sentido nervioso(a), ansioso(a) o con los nervios de punta',
      'No ha sido capaz de parar o controlar su preocupación',
      'Se ha preocupado demasiado por motivos diferentes',
      'Ha tenido dificultad para relajarse',
      'Se ha sentido tan inquieto(a) que no ha podido quedarse quieto(a)',
      'Se ha molestado o irritado fácilmente',
      'Ha tenido miedo de que algo terrible fuera a pasar'
    ]
  },
  en: {
    stem: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
    choices: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
    items: [
      'Feeling nervous, anxious or on edge',
      'Not being able to stop or control worrying',
      'Worrying too much about different things',
      'Trouble relaxing',
      'Being so restless that it is hard to sit still',
      'Becoming easily annoyed or irritable',
      'Feeling afraid as if something awful might happen'
    ]
  }
});

/** Strict numeric input only: missing/NaN/coerced/out-of-range answers never score. */
export function scoreGad7(answers) {
  if (!Array.isArray(answers) || answers.length !== 7) throw new TypeError('Seven numeric answers are required.');
  for (let index = 0; index < 7; index += 1) {
    const value = answers[index];
    if (!Number.isInteger(value) || value < 0 || value > 3) throw new RangeError('Each answer must be an integer from 0 through 3.');
  }
  const total = answers.reduce((sum, value) => sum + value, 0);
  return Object.freeze({ total, level: total >= 15 ? 'severe' : total >= 10 ? 'moderate' : total >= 5 ? 'mild' : 'minimal', recommendEvaluation: total >= 10 });
}

export function selectInstruments(instruments, { symptom = 'all', method = 'all', search = '', sort = 'newest' } = {}) {
  const query = String(search).trim().toLocaleLowerCase();
  return instruments.filter(item => (symptom === 'all' || item.symptoms.includes(symptom)) && (method === 'all' || item.method === method) && (!query || item.name.toLocaleLowerCase().includes(query)))
    .sort((left, right) => sort === 'name' ? left.name.localeCompare(right.name) : right.catalogAdded.localeCompare(left.catalogAdded));
}

/* Self-contained DOM runtime. Its exact source is embedded in the offline file.
 * No storage, network, identifiers, email transmission or analytics. */
export function mountGad7(root, instrument, ui, scorer) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const el = (tag, text, className) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const source = instrument[ui.language];
  let latest = null;
  root.replaceChildren();
  const heading = el('h3', ui.questionnaireTitle); heading.id = 'gad7-heading';
  const caveat = el('p', ui.caveat, 'prof-caveat');
  const privacy = el('p', ui.privacy, 'prof-note');
  const adultNote = el('p', ui.adultNote);
  const form = el('form'); form.noValidate = true; form.autocomplete = 'off';
  form.setAttribute('aria-labelledby', heading.id);
  const adultLabel = el('label', undefined, 'prof-adult');
  const adult = el('input'); adult.type = 'checkbox'; adult.id = 'gad7-adult';
  adult.required = true; adult.autocomplete = 'off';
  adultLabel.append(adult, el('span', ui.adultConfirm));
  const questions = el('fieldset', undefined, 'prof-questions'); questions.disabled = true;
  const stem = el('legend', source.stem, 'prof-stem'); questions.append(stem);
  const groups = [];
  for (let index = 0; index < source.items.length; index += 1) {
    const group = el('fieldset', undefined, 'prof-item');
    group.append(el('legend', `${index + 1}. ${source.items[index]}`));
    const choices = el('div', undefined, 'prof-choices');
    for (let value = 0; value <= 3; value += 1) {
      const label = el('label', undefined, 'prof-choice');
      const input = el('input'); input.type = 'radio'; input.name = `gad7-${index}`;
      input.value = String(value); input.required = true; input.autocomplete = 'off';
      label.append(input, el('span', source.choices[value]), el('small', String(value)));
      choices.append(label);
    }
    group.append(choices); questions.append(group); groups.push(group);
  }
  const error = el('p', undefined, 'prof-error'); error.setAttribute('role', 'alert'); error.id = 'gad7-error';
  form.setAttribute('aria-describedby', error.id);
  const actions = el('div', undefined, 'prof-actions');
  const calculate = el('button', ui.calculate, 'prof-button'); calculate.type = 'submit';
  const reset = el('button', ui.reset, 'prof-button secondary'); reset.type = 'reset';
  actions.append(calculate, reset);
  form.append(adultLabel, questions, error, actions);
  const result = el('section', undefined, 'prof-result'); result.hidden = true; result.tabIndex = -1;
  result.setAttribute('aria-labelledby', 'gad7-result-heading');
  const resultHeading = el('h3', ui.resultTitle); resultHeading.id = 'gad7-result-heading';
  const totalText = el('p', undefined, 'prof-total');
  const levelText = el('p');
  const guidance = el('p');
  const resultCaveat = el('p', ui.caveat, 'prof-caveat');
  const answerDetails = el('details', undefined, 'prof-answers');
  answerDetails.append(el('summary', ui.reviewAnswers));
  const answerList = el('ol'); answerDetails.append(answerList);
  const reportActions = el('div', undefined, 'prof-actions');
  const print = el('button', ui.print, 'prof-button secondary'); print.type = 'button';
  const text = el('button', ui.downloadText, 'prof-button secondary'); text.type = 'button';
  reportActions.append(print, text);
  const reportNotice = el('p', ui.reportNotice, 'prof-note');
  const manual = el('a', ui.sourceManual); manual.href = instrument.sources.manual;
  manual.target = '_blank'; manual.rel = 'noopener noreferrer';
  const resultSource = el('p', undefined, 'prof-note'); resultSource.append(manual);
  result.append(resultHeading, totalText, levelText, guidance, resultCaveat, answerDetails, reportActions, reportNotice, resultSource);
  root.append(heading, caveat, privacy, adultNote, form, result);

  function invalidate() {
    latest = null; result.hidden = true; answerList.replaceChildren();
    totalText.textContent = ''; levelText.textContent = ''; guidance.textContent = '';
    error.textContent = '';
    groups.forEach(group => group.removeAttribute('aria-invalid'));
  }
  function clear() {
    form.reset(); adult.checked = false; questions.disabled = true; invalidate();
  }
  adult.addEventListener('change', () => { questions.disabled = !adult.checked; invalidate(); });
  questions.addEventListener('change', invalidate);
  form.addEventListener('reset', () => { adult.checked = false; questions.disabled = true; invalidate(); });
  form.addEventListener('submit', event => {
    event.preventDefault(); invalidate();
    if (!adult.checked) { error.textContent = ui.adultError; adult.focus(); return; }
    const answers = groups.map(group => {
      const selected = group.querySelector('input:checked');
      return selected && /^[0-3]$/.test(selected.value) ? Number(selected.value) : null;
    });
    const missing = answers.findIndex(value => value === null);
    if (missing !== -1) {
      error.textContent = ui.missingError;
      groups.forEach((group, index) => { if (answers[index] === null) group.setAttribute('aria-invalid', 'true'); });
      groups[missing].querySelector('input').focus(); return;
    }
    try { latest = { answers, score: scorer(answers) }; }
    catch { error.textContent = ui.invalidError; return; }
    totalText.textContent = `${ui.scoreLabel}: ${latest.score.total} / 21`;
    levelText.textContent = `${ui.levelLabel}: ${ui.levels[latest.score.level]}`;
    guidance.textContent = latest.score.recommendEvaluation ? ui.highGuidance : ui.lowGuidance;
    answers.forEach((value, index) => answerList.append(el('li', `${source.items[index]} — ${source.choices[value]} (${value})`)));
    result.hidden = false; result.focus();
  });
  print.addEventListener('click', () => { if (latest) { answerDetails.open = true; view.print(); } });
  text.addEventListener('click', () => {
    if (!latest) return;
    const lines = [ui.questionnaireTitle, ui.adultNote, source.stem, '', ...latest.answers.map((value, index) => `${index + 1}. ${source.items[index]}: ${source.choices[value]} (${value})`), '', totalText.textContent, levelText.textContent, guidance.textContent, ui.caveat, '', ui.reportNotice, ui.attribution, ui.license, ui.interfaceNote, ui.spanishScope, instrument.sources[ui.language], instrument.sources.manual];
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = view.URL.createObjectURL(blob);
    const link = el('a'); link.href = url; link.download = `GAD-7-${ui.language}-resultado.txt`;
    doc.body.append(link); link.click(); link.remove();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 1000);
  });
  // Clear memory before a page can enter the browser's back/forward cache.
  view.addEventListener('pagehide', clear);
  return () => { clear(); view.removeEventListener('pagehide', clear); root.replaceChildren(); };
}
