(() => {
  'use strict';

  const booking = document.getElementById('agenda');
  const shell = booking?.querySelector('.booking-shell');
  if (!shell) return;

  const form = shell.querySelector('.booking-form');
  const steps = [...form.querySelectorAll('[data-booking-step]')];
  const progress = [...shell.querySelectorAll('.booking-progress li')];
  const dates = form.querySelector('[data-booking-dates]');
  const times = form.querySelector('[data-booking-times]');
  const timeGroup = form.querySelector('[data-booking-time-group]');
  const back = form.querySelector('[data-booking-back]');
  const next = form.querySelector('[data-booking-next]');
  const error = form.querySelector('[data-booking-error]');
  const alias = form.querySelector('#marea-alias');
  const note = form.querySelector('#marea-note');
  const complete = shell.querySelector('[data-booking-complete]');
  const result = complete.querySelector('[data-booking-result]');
  const fullDate = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' });
  const shortDate = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  let step = 0;

  function chosen(name) {
    return form.querySelector(`input[name="marea-${name}"]:checked`);
  }

  function slotOption(name, value, caption, accessibleLabel = caption) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    const text = document.createElement('span');
    label.className = 'booking-slot';
    input.type = 'radio';
    input.name = `marea-${name}`;
    input.value = value;
    input.setAttribute('aria-label', accessibleLabel);
    text.textContent = caption;
    label.append(input, text);
    return label;
  }

  function renderDates() {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    for (let count = 0; count < 4;) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() === 0 || date.getDay() === 1) continue;
      const option = slotOption('date', String(date.getDay()), shortDate.format(date), fullDate.format(date));
      dates.append(option);
      count += 1;
    }
  }

  function renderTimes() {
    const date = chosen('date');
    times.replaceChildren();
    timeGroup.hidden = !date;
    if (!date) return;
    const hours = date.value === '6' ? ['10:00', '11:30', '13:00'] : ['10:00', '12:30', '16:00', '17:30'];
    for (const hour of hours) times.append(slotOption('time', hour, hour));
  }

  function announceError(message = '') {
    error.hidden = !message;
    error.textContent = message;
  }

  function showStep(index, focus = true) {
    step = index;
    steps.forEach((panel, i) => { panel.hidden = i !== index; });
    progress.forEach((item, i) => {
      item.classList.toggle('is-complete', i < index);
      if (i === index) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    back.hidden = index === 0;
    next.textContent = index === steps.length - 1 ? 'Simular confirmación' : 'Continuar';
    announceError();
    if (focus) steps[index].querySelector('h3').focus();
  }

  function renderSummary() {
    const service = chosen('service').dataset;
    const slot = `${chosen('date').getAttribute('aria-label')} a las ${chosen('time').value}`;
    const values = {
      service: `${service.label} · ${service.duration}`,
      slot,
      name: alias.value.trim(),
      price: service.price,
      note: note.value.trim(),
    };
    for (const [key, value] of Object.entries(values)) {
      form.querySelector(`[data-booking-summary="${key}"]`).textContent = value;
    }
    form.querySelector('[data-booking-summary-note]').hidden = !values.note;
    result.textContent = `${service.label} · ${slot}`;
  }

  form.addEventListener('change', (event) => {
    announceError();
    if (event.target.name === 'marea-date') renderTimes();
  });
  alias.addEventListener('input', () => announceError());
  back.addEventListener('click', () => showStep(step - 1));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (step === 0 && !chosen('service')) {
      announceError('Selecciona un servicio para continuar.');
      form.querySelector('[name="marea-service"]').focus();
      return;
    }
    if (step === 1 && (!chosen('date') || !chosen('time'))) {
      const missingDate = !chosen('date');
      announceError(missingDate ? 'Elige una fecha de muestra.' : 'Elige un horario de muestra.');
      (missingDate ? dates : times).querySelector('input').focus();
      return;
    }
    if (step === 2 && !alias.value.trim()) {
      announceError('Escribe un nombre ficticio para continuar.');
      alias.focus();
      return;
    }
    if (step === 2) renderSummary();
    if (step < steps.length - 1) {
      showStep(step + 1);
      return;
    }
    form.hidden = true;
    for (const item of progress) {
      item.removeAttribute('aria-current');
      item.classList.add('is-complete');
    }
    complete.hidden = false;
    complete.querySelector('h3').focus();
  });

  complete.querySelector('[data-booking-reset]').addEventListener('click', () => {
    form.reset();
    renderTimes();
    complete.hidden = true;
    form.hidden = false;
    showStep(0);
  });

  renderDates();
  showStep(0, false);
  shell.hidden = false;
})();
