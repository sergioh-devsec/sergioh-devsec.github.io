(() => {
  'use strict';

  const engine = globalThis.MareaProState;
  const catalog = globalThis.BookingBusinesses;
  const byId = (id) => document.getElementById(id);
  if (!engine || !catalog) {
    byId('demo-notice-copy').textContent = 'La agenda no pudo cargarse. Recarga la página para volver a intentarlo.';
    return;
  }
  const requestedId = new URLSearchParams(location.search).get('negocio');
  const profile = catalog.profiles.find(({ id }) => id === requestedId)
    ?? catalog.profiles.find(({ id }) => id === catalog.defaultId);
  const model = engine.createBookingModel(profile);
  const booking = byId('booking-view');
  const studio = byId('studio-view');
  const form = byId('booking-form');
  const panels = [...form.querySelectorAll('[data-step]')];
  const progress = [...byId('booking-progress').children];
  const receipt = byId('booking-receipt');
  const error = byId('booking-error');
  const back = byId('booking-back');
  const next = byId('booking-next');
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  const locale = profile.locale ?? 'es-MX';
  const currency = profile.currency ?? 'MXN';
  const priceFormat = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0 });
  const dayFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', weekday: 'short' });
  const storageKey = model.STORAGE_KEY;
  const aliases = model.ALIASES;
  const transitions = {
    pending: ['confirmed', 'canceled'],
    confirmed: ['completed', 'canceled', 'noShow'],
  };

  const money = (value) => `${priceFormat.format(value)} ${currency}`;
  const formatDate = (date) => dayFormat.format(new Date(`${date}T12:00:00`));
  const emptyDraft = () => ({ serviceId: '', addonIds: [], staffId: 'any', date: '', time: '', client: '' });
  let draft = emptyDraft();
  let step = 0;
  let selectedView = 'booking';
  let lastBooking = null;
  let highlightedId = null;
  let appointments = load();

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function profileLink(id) {
    return id === catalog.defaultId ? './' : `?${new URLSearchParams({ negocio: id })}`;
  }

  function configureBusiness() {
    const root = document.documentElement;
    root.dataset.theme = profile.theme;
    document.title = profile.title;
    document.querySelector('meta[name="description"]').content = profile.description;
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--paper').trim();
    byId('business-brand').href = profileLink(profile.id);
    byId('business-brand-name').textContent = profile.brand;
    byId('booking-intro').textContent = profile.intro;
    byId('studio-title').textContent = profile.studioTitle;
    byId('studio-search').placeholder = `Ej. ${aliases[0]} o ${profile.folioPrefix}-101`;
    if (currency !== 'MXN') byId('booking-currency').textContent = `Precios ilustrativos en ${currency}.`;

    const links = byId('business-links');
    links.replaceChildren(...catalog.profiles.map(({ id, label }) => {
      const link = element('a', '', label);
      link.href = profileLink(id);
      if (id === profile.id) link.setAttribute('aria-current', 'page');
      return link;
    }));
    links.closest('nav').hidden = catalog.profiles.length < 2;

    if (profile.photo) {
      const { src, alt, width, height } = profile.photo;
      const photo = element('img');
      photo.alt = alt;
      photo.width = width;
      photo.height = height;
      photo.src = src;
      byId('business-photo').prepend(photo);
      byId('business-photo-caption').textContent = profile.businessName;
      byId('business-photo').hidden = false;
    } else if (profile.artwork) {
      byId('business-art-eyebrow').textContent = profile.artwork.eyebrow;
      byId('business-art-title').textContent = profile.artwork.title;
      byId('business-art-caption').textContent = profile.artwork.caption;
      byId('business-art').hidden = false;
    }
  }

  function replaceChoices(fieldset, choices) {
    fieldset.replaceChildren(fieldset.querySelector('legend'), ...choices);
  }

  function choose(type, name, value, title, subtitle, selected, price) {
    const label = element('label', price === undefined ? 'pick' : 'choice');
    const input = element('input');
    input.type = type;
    input.name = name;
    input.value = value;
    input.checked = selected;
    const copy = element('span', price === undefined ? 'pick-copy' : 'choice-copy');
    copy.append(element('strong', '', title));
    if (subtitle) copy.append(element('small', '', subtitle));
    label.append(input, copy);
    if (price !== undefined) label.append(element('span', 'choice-price', price));
    return label;
  }

  function radio(name, value, title, subtitle = '', price) {
    return choose('radio', name, value, title, subtitle, value === draft[name], price);
  }

  function descriptionList(list, rows) {
    list.replaceChildren(...rows.map(([name, value, className]) => {
      const row = element('div', className);
      row.append(element('dt', '', name), element('dd', '', value));
      return row;
    }));
  }

  function showError(message = '') {
    error.textContent = message;
    error.hidden = !message;
  }

  function selectView(view, { focus = true } = {}) {
    selectedView = view;
    booking.hidden = view !== 'booking';
    studio.hidden = view !== 'studio';
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    if (view === 'studio') renderStudio();
    else if (step === 1) renderSchedule();
    if (focus) byId(view === 'studio' ? 'studio-title' : 'booking-title').focus();
  }

  function showStep(index, focus = true) {
    step = index;
    panels.forEach((panel, number) => { panel.hidden = number !== index; });
    progress.forEach((item, number) => {
      if (number === index) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      item.classList.toggle('complete', number < index);
    });
    back.hidden = index === 0;
    next.textContent = ['Elegir horario', 'Revisar cita', 'Confirmar cita de prueba'][index];
    showError();
    if (index === 1) renderSchedule();
    if (index === 2) renderReview();
    if (focus) panels[index].querySelector('h2').focus();
    renderSelection();
  }

  function startBooking() {
    draft = emptyDraft();
    lastBooking = null;
    receipt.hidden = true;
    form.hidden = false;
    renderServices();
    renderAliases();
    selectView('booking', { focus: false });
    showStep(0);
  }

  function load() {
    try {
      return model.decodeAppointments(localStorage.getItem(storageKey));
    } catch {
      return model.seedAppointments();
    }
  }

  function save(updated) {
    appointments = updated;
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      byId('demo-notice-copy').textContent = 'Tu navegador limitó el almacenamiento. Los cambios durarán mientras esta página siga abierta.';
    }
  }

  function renderServices() {
    replaceChoices(byId('services'), model.SERVICES.map((service) =>
      radio('serviceId', service.id, service.name, `${service.minutes} min · ${service.description}`, money(service.price))
    ));
    byId('booking-addons').hidden = model.ADDONS.length === 0;
    replaceChoices(byId('addons'), model.ADDONS.map((addon) =>
      choose('checkbox', 'addonIds', addon.id, addon.name, `+${addon.minutes} min · ${addon.description}`,
        draft.addonIds.includes(addon.id), `+${money(addon.price)}`)
    ));
  }

  function renderAliases() {
    replaceChoices(byId('aliases'), aliases.map((alias) => radio('client', alias, alias)));
  }

  function renderSchedule() {
    const specialists = model.eligibleStaff(draft.serviceId);
    if (draft.staffId !== 'any' && !specialists.some((member) => member.id === draft.staffId)) {
      draft.staffId = 'any';
      draft.time = '';
    }
    replaceChoices(byId('staff'), [radio('staffId', 'any', 'Primera disponible'),
      ...specialists.map((member) => radio('staffId', member.id, member.name, member.role))]);
    const days = model.bookingDates();
    if (!days.includes(draft.date)) {
      draft.date = days[0] ?? '';
      draft.time = '';
    }
    replaceChoices(byId('booking-dates'), days.map((date) => radio('date', date, formatDate(date))));
    const slots = model.getSlots(draft, appointments);
    if (!slots.some(({ time }) => time === draft.time)) draft.time = '';
    const hours = slots.map(({ time }) => radio('time', time, time));
    if (hours.length === 0) hours.push(element('p', 'quiet', 'No quedan horarios para esta combinación. Prueba otro día o especialista.'));
    replaceChoices(byId('booking-slots'), hours);
  }

  function summaryRows(item) {
    const service = model.SERVICES.find(({ id }) => id === item.serviceId);
    if (!service) return [];
    const totals = model.getTotals(item.serviceId, item.addonIds);
    const assigned = item.staffId === 'any' && item.time
      ? model.getSlots(item, appointments).find(({ time }) => time === item.time)?.staffId : item.staffId;
    const staff = model.STAFF.find(({ id }) => id === assigned);
    const extras = model.ADDONS.filter(({ id }) => item.addonIds.includes(id)).map(({ name }) => name);
    const rows = [['Servicio', service.name]];
    if (extras.length) rows.push(['Extras', extras.join(', ')]);
    if (staff) rows.push(['Especialista', staff.name]);
    if (item.date && item.time) rows.push(['Cuándo', `${formatDate(item.date)} · ${item.time}`]);
    if (item.client) rows.push(['Alias', item.client]);
    rows.push(['Duración', `${totals.minutes} min`], ['Total estimado', money(totals.price), 'total']);
    return rows;
  }

  function renderSelection() {
    const container = byId('selection-content');
    const rows = summaryRows(lastBooking || draft);
    if (!rows.length) {
      container.replaceChildren(element('p', 'quiet', 'Elige un servicio para calcular el total y la duración.'));
      return;
    }
    const list = element('dl', 'summary-data');
    descriptionList(list, rows);
    container.replaceChildren(list);
  }

  function renderReview() {
    renderAliases();
    descriptionList(byId('review-data'), summaryRows(draft));
  }

  function completeBooking(appointment) {
    lastBooking = appointment;
    form.hidden = true;
    receipt.hidden = false;
    for (const item of progress) {
      item.removeAttribute('aria-current');
      item.classList.add('complete');
    }
    byId('receipt-folio').textContent = `Folio ${appointment.id}. Encuentra la cita en el panel de este navegador.`;
    descriptionList(byId('receipt-data'), summaryRows(appointment));
    renderSelection();
    byId('receipt-title').focus();
  }

  function readChange(input) {
    const { name, value, checked } = input;
    showError();
    if (name === 'addonIds') {
      draft.addonIds = checked ? [...draft.addonIds, value] : draft.addonIds.filter((id) => id !== value);
      draft.time = '';
    } else if (Object.hasOwn(draft, name)) {
      draft[name] = value;
      if (name === 'serviceId' || name === 'staffId' || name === 'date') draft.time = '';
    }
    if (name === 'staffId' || name === 'date') {
      renderSchedule();
      const replacement = form.querySelector(`input[name="${name}"]:checked`);
      replacement?.focus();
    }
    if (step === 2) descriptionList(byId('review-data'), summaryRows(draft));
    renderSelection();
  }

  function submitBooking(event) {
    event.preventDefault();
    if (step === 0 && !draft.serviceId) {
      showError('Elige un servicio para continuar.');
      byId('services').querySelector('input').focus();
    } else if (step === 1 && !draft.time) {
      showError('Elige una hora disponible para continuar.');
      byId('booking-slots').querySelector('input')?.focus();
    } else if (step === 2 && !draft.client) {
      showError('Elige un alias de prueba para continuar.');
      byId('aliases').querySelector('input').focus();
    } else if (step < 2) {
      showStep(step + 1);
    } else {
      const result = model.createBooking(draft, appointments);
      if (!result.appointment) {
        showStep(1);
        showError('Ese horario ya no está disponible. Elige otro para continuar.');
        return;
      }
      save([...appointments, result.appointment]);
      completeBooking(result.appointment);
    }
  }

  function option(value, name) {
    const item = element('option', '', name);
    item.value = value;
    return item;
  }

  function renderAppointment(appointment) {
    const member = model.STAFF.find(({ id }) => id === appointment.staffId);
    const service = model.SERVICES.find(({ id }) => id === appointment.serviceId);
    const row = element('article', 'appointment');
    row.dataset.id = appointment.id;
    if (highlightedId === appointment.id) row.dataset.highlight = '';
    const time = element('div', 'appointment-time');
    time.append(element('strong', '', appointment.time), element('span', '', formatDate(appointment.date)));
    const detail = element('div', 'appointment-detail');
    detail.append(element('h2', '', appointment.client),
      element('p', '', `${service.name} · ${member.name} · ${appointment.id}`));
    const actions = element('div', 'appointment-actions');
    const status = element('span', `status status-${appointment.status}`, model.STATUS[appointment.status]);
    actions.append(status);
    const available = transitions[appointment.status] || [];
    if (available.length) {
      const select = element('select');
      select.dataset.appointment = appointment.id;
      select.setAttribute('aria-label', `Cambiar estado de ${appointment.client}, ${appointment.id}`);
      select.append(option('', 'Cambiar estado'), ...available.map((key) => option(key, model.STATUS[key])));
      actions.append(select);
    }
    row.append(time, detail, actions);
    return row;
  }

  function renderStudio() {
    const dateInput = byId('studio-date');
    const dateFilter = dateInput.value;
    const dates = [...new Set(appointments.map(({ date }) => date))].sort();
    dateInput.replaceChildren(option('', 'Todas las fechas'), ...dates.map((date) => option(date, formatDate(date))));
    dateInput.value = dates.includes(dateFilter) ? dateFilter : '';
    const period = appointments.filter(({ date }) => !dateInput.value || date === dateInput.value);
    const { confirmed, pending, completed, revenue } = model.summarize(period);
    descriptionList(byId('studio-metrics'), [['Por atender', confirmed + pending], ['Completadas', completed], ['Valor de citas', money(revenue)]]);
    const query = byId('studio-search').value.trim().toLocaleLowerCase(locale);
    const status = byId('studio-status').value;
    const filtered = period.filter((item) =>
      (!status || item.status === status) && `${item.client} ${item.id}`.toLocaleLowerCase(locale).includes(query)
    ).sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`));
    byId('studio-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'cita visible' : 'citas visibles'}`;
    byId('appointments').replaceChildren(...(filtered.length ? filtered.map(renderAppointment)
      : [element('p', 'empty', 'No hay citas para estos filtros. Cambia la fecha, el estado o la búsqueda.')]));
  }

  function updateAppointment(event) {
    const control = event.target;
    const id = control.dataset.appointment;
    if (!id || !control.value) return;
    const updated = model.updateStatus(appointments, id, control.value);
    if (updated !== appointments) {
      save(updated);
      byId('studio-message').textContent = `Cita ${id}: ${model.STATUS[control.value]}.`;
    }
    renderStudio();
    const updatedRow = [...byId('appointments').children].find((row) => row.dataset.id === id);
    const target = updatedRow?.querySelector('select') || byId('studio-status');
    target.focus();
  }

  for (const button of viewButtons) button.addEventListener('click', () => selectView(button.dataset.view));
  form.addEventListener('change', ({ target }) => readChange(target));
  form.addEventListener('submit', submitBooking);
  back.addEventListener('click', () => showStep(step - 1));
  byId('studio-new').addEventListener('click', startBooking);
  byId('new-booking').addEventListener('click', startBooking);
  byId('show-in-studio').addEventListener('click', () => {
    highlightedId = lastBooking.id;
    for (const id of ['studio-search', 'studio-status', 'studio-date']) byId(id).value = '';
    selectView('studio');
  });
  for (const [key, label] of Object.entries(model.STATUS)) byId('studio-status').append(option(key, label));
  byId('studio-search').addEventListener('input', renderStudio);
  byId('studio-date').addEventListener('change', renderStudio);
  byId('studio-status').addEventListener('change', renderStudio);
  byId('appointments').addEventListener('change', updateAppointment);
  byId('reset-demo').addEventListener('click', () => {
    save(model.seedAppointments());
    draft = emptyDraft();
    lastBooking = null;
    highlightedId = null;
    form.hidden = false;
    receipt.hidden = true;
    renderServices();
    renderAliases();
    showStep(0, false);
    for (const id of ['studio-search', 'studio-status', 'studio-date']) byId(id).value = '';
    renderStudio();
    byId('studio-message').textContent = 'Datos de muestra restaurados.';
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return;
    appointments = load();
    if (selectedView === 'studio') renderStudio();
    else if (step === 1 && !lastBooking) {
      renderSchedule();
      renderSelection();
    }
  });

  configureBusiness();
  renderServices();
  renderAliases();
  showStep(0, false);
  selectView(location.hash === '#estudio' ? 'studio' : 'booking', { focus: false });
})();
