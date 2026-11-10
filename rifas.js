const english = new URLSearchParams(location.search).get('idioma') === 'en';
const copy = {
  skip: 'Skip to settings', lead: 'Customize your wheel with tickets or prizes, then take each spin at your own pace.',
  freeLimit: 'Free for up to 10 participants',
  demo: 'Run the draw on your device, with no account or payment. This page does not sell tickets or collect entries.',
  policyHeading: 'Responsible use and privacy',
  policySummary: 'The wheel processes your information in this browser. If you organize a raffle, you are responsible for the rules, permits and prizes.',
  policyLink: 'Terms of use and privacy',
  policyNewTab: ' (opens in a new tab)',
  wheel: 'The wheel', ready: 'Ready to spin.',
  settings: 'Set up your draw', eventName: 'Raffle name (optional)', prize: 'Prize name', participants: 'Number of participants',
  wheelMode: 'What goes on the wheel', foliosMode: 'Participant tickets', optionsMode: 'Prizes and messages',
  entriesHelp: 'From 2 to 10 participants, with one ticket per person.', options: 'Enter your options',
  optionsHelp: 'Enter 2 to 12 options, one per line. Each line takes one sector.', image: 'Reference photos (optional)',
  imageHelp: 'Up to 4 JPG, PNG or WebP photos, 4 MB each. They stay on your device.', style: 'Draw format',
  one: 'One spin · one winner', three: 'Three spins · the third counts', start: 'Spin the wheel', reset: 'Reset draw',
  legend: 'View sectors', plan: 'Raffles with 11 to 500 tickets',
  planDescription: 'One random draw with prize photos. Raffles with more than 10 tickets are not available yet.',
  checkoutStatus: 'Coming soon · payment is not active', perDraw: 'planned price per event', back: 'Back to CyberSerch', reconfigure: 'Back to settings',
  guideLink: 'See instructions', wheelLink: 'View the wheel', instructions: 'How to use the wheel', stepOne: 'Set up the wheel',
  stepOneDetail: 'Choose tickets or enter your own prizes and messages. You can add up to four photos.',
  stepTwo: 'Click once per spin', stepTwoDetail: 'In three-spin mode, the first two are exhibition spins. Each spin waits for your click.',
  stepThree: 'Check the result', stepThreeDetail: 'The final spin reveals the random ticket or option indicated by the pointer.',
};
const local = (es, en) => english ? en : es;
const byId = id => document.getElementById(id);
const defaultPrize = local('Premio sorpresa', 'Surprise prize');
const form = byId('raffle-form');
const stageTitle = byId('stage-title');
const stage = stageTitle.closest('.stage');
const wheel = byId('wheel-disc');
const sectorLayer = byId('wheel-sectors');
const legend = byId('wheel-legend');
const result = byId('result');
const progress = byId('spin-step');
const entries = byId('entries');
const options = byId('options');
const prize = byId('prize');
const eventName = byId('event-name');
const image = byId('image');
const preview = byId('photo-preview');
const stagePhotos = byId('stage-photos');
const photoStatus = byId('photo-status');
const stageSpin = byId('wheel-spin');
const spinButtons = [byId('spin'), stageSpin];
const reset = byId('reset-spin');
const modeChoices = [...form.querySelectorAll('[name="wheel-mode"]')];
const spinChoices = [...form.querySelectorAll('[name="spins"]')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 700px)');
const maxParticipants = 10;
const maxSectors = 12;
const maxPhotos = 4;
const acceptedImages = ['image/jpeg', 'image/png', 'image/webp'];
const randomWord = new Uint32Array(1);
const graphemes = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter() : null;
const photos = [];
let round = null;
let angle = 0;
let running = false;

if (english) {
  document.documentElement.lang = 'en';
  document.title = 'Prueba tu Suerte | CyberSerch raffle wheel';
  for (const element of document.querySelectorAll('[data-copy]')) {
    if (Object.hasOwn(copy, element.dataset.copy)) element.textContent = copy[element.dataset.copy];
  }
  Object.assign(byId('language-link'), { textContent: 'Español', lang: 'es', hreflang: 'es', href: '?idioma=es' });
  byId('policy-link').href = 'rifas-politicas#public-en';
  prize.value = defaultPrize;
  options.value = 'Surprise prize\nBetter luck next time\nSpecial prize\nBetter luck next time';
}

function randomBelow(limit) {
  const ceiling = 2 ** 32 - (2 ** 32 % limit);
  do { crypto.getRandomValues(randomWord); } while (randomWord[0] >= ceiling);
  return randomWord[0] % limit;
}

function configuration() {
  const mode = modeChoices.find(choice => choice.checked).value;
  const spins = Number(spinChoices.find(choice => choice.checked).value);
  if (mode === 'options') {
    const lines = options.value.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
    const valid = lines.length >= 2 && lines.length <= maxSectors;
    options.setCustomValidity(valid ? '' : local('Escribe de 2 a 12 opciones, una por renglón.', 'Enter 2 to 12 options, one per line.'));
    return { mode, spins, sectors: valid ? lines.map(label => ({ label })) : [] };
  }
  options.setCustomValidity('');
  const count = entries.valueAsNumber;
  const overLimit = count > maxParticipants;
  const message = overLimit ? local('El sorteo gratis admite hasta 10 participantes.', 'The free draw supports up to 10 participants.') : '';
  entries.setCustomValidity(message);
  const valid = entries.validity.valid && Number.isInteger(count) && count >= 2 && !overLimit;
  const sectors = valid ? Array.from({ length: count }, (_, index) => ({ label: String(index + 1) })) : [];
  return { mode, spins, sectors, message };
}

function pointAt(degrees, radius) {
  const radians = degrees * Math.PI / 180;
  return [200 + radius * Math.sin(radians), 200 - radius * Math.cos(radians)];
}

function labelLines(label) {
  const characters = graphemes ? Array.from(graphemes.segment(label), item => item.segment) : Array.from(label);
  if (characters.length <= 12) return [label];
  const first = characters.slice(0, 12);
  const space = first.lastIndexOf(' ');
  const split = space >= 6 ? space : first.length;
  const second = characters.slice(split);
  while (second[0] === ' ') second.shift();
  const remaining = second.length > 12 ? `${second.slice(0, 11).join('')}…` : second.join('');
  return [characters.slice(0, split).join('').trim(), remaining];
}

function svg(tag, attributes) {
  const element = document.createElementNS(sectorLayer.namespaceURI, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

function drawSectors(sectors) {
  const step = 360 / sectors.length;
  const paths = [];
  const labels = [];
  const items = [];
  sectors.forEach(({ label }, index) => {
    const middle = index * step;
    const [x1, y1] = pointAt(middle - step / 2, 198);
    const [x2, y2] = pointAt(middle + step / 2, 198);
    const path = svg('path', {
      d: `M 200 200 L ${x1} ${y1} A 198 198 0 0 1 ${x2} ${y2} Z`,
      class: 'wheel-sector', 'data-tone': index % 6,
    });
    const [x, y] = pointAt(middle, 126);
    const direction = middle > 180 ? middle - 270 : middle - 90;
    const lines = labelLines(label);
    const text = svg('text', { x, y, transform: `rotate(${direction} ${x} ${y})`, class: 'wheel-label', 'text-anchor': 'middle' });
    lines.forEach((line, lineIndex) => {
      const span = svg('tspan', { x, y: y + (lineIndex - (lines.length - 1) / 2) * 15 + 4 });
      span.textContent = line;
      text.append(span);
    });
    const item = document.createElement('li');
    item.textContent = label;
    paths.push(path);
    labels.push(text);
    items.push(item);
  });
  sectorLayer.replaceChildren(...paths, ...labels);
  legend.replaceChildren(...items);
}

function syncControls() {
  const inProgress = Boolean(round && round.completed < round.spins);
  const locked = running || inProgress;
  const mode = modeChoices.find(choice => choice.checked).value;
  byId('entries-field').hidden = mode !== 'folios';
  byId('options-field').hidden = mode !== 'options';
  entries.disabled = locked || mode !== 'folios';
  options.disabled = locked || mode !== 'options';
  for (const control of [eventName, prize, ...modeChoices, ...spinChoices]) control.disabled = locked;

  let label = local('Girar la ruleta', 'Spin the wheel');
  if (running) label = local('Girando…', 'Spinning…');
  else if (inProgress) label = local(`Girar tiro ${round.completed + 1} de ${round.spins}`, `Take spin ${round.completed + 1} of ${round.spins}`);
  else if (round) label = local('Volver a girar', 'Spin again');
  for (const button of spinButtons) {
    button.textContent = label;
    button.disabled = running;
  }
  reset.hidden = !round;
  reset.disabled = running;
}

function resetRound() {
  round = null;
  angle = 0;
  wheel.style.transform = '';
  stage.dataset.state = 'ready';
  syncControls();
  const settings = configuration();
  progress.textContent = `0 / ${settings.spins}`;
  result.textContent = settings.sectors.length ? local('Lista para girar.', copy.ready)
    : settings.message || local('Configura los sectores para poder girar.', 'Set up your sectors before spinning.');
  drawSectors(settings.sectors);
}

function syncNames() {
  stageTitle.textContent = eventName.value.trim() || local('La ruleta', copy.wheel);
  byId('stage-prize').textContent = prize.value.trim() || defaultPrize;
}

function setPhotoStatus(message = '') {
  if (!photoStatus) return;
  photoStatus.hidden = !message;
  photoStatus.textContent = message;
}

function showPhotos() {
  preview.replaceChildren();
  stagePhotos.replaceChildren();
  for (const photo of photos) {
    const tile = document.createElement('div');
    tile.className = 'photo-tile';
    const thumbnail = document.createElement('img');
    thumbnail.alt = photo.name;
    thumbnail.src = photo.url;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = local('Quitar', 'Remove');
    remove.setAttribute('aria-label', local(`Quitar foto: ${photo.name}`, `Remove photo: ${photo.name}`));
    remove.addEventListener('click', () => {
      removePhoto(photo);
      setPhotoStatus();
      image.focus();
    });
    thumbnail.addEventListener('error', () => {
      if (!photos.includes(photo)) return;
      removePhoto(photo);
      setPhotoStatus(local('No se pudo leer una foto. Elige otro archivo.', 'A photo could not be read. Choose another file.'));
    });
    tile.append(thumbnail, remove);
    preview.append(tile);
    stagePhotos.append(thumbnail.cloneNode());
  }
  preview.hidden = photos.length === 0;
  stagePhotos.hidden = photos.length === 0;
}

function removePhoto(photo) {
  photos.splice(photos.indexOf(photo), 1);
  URL.revokeObjectURL(photo.url);
  showPhotos();
}

image.addEventListener('change', () => {
  const files = [...image.files];
  image.value = '';
  const messages = [];
  for (const file of files) {
    if (photos.length === maxPhotos) {
      messages.push(local('La galería admite hasta cuatro fotos. Quita una para agregar otra.', 'The gallery holds up to four photos. Remove one to add another.'));
      break;
    }
    if (!acceptedImages.includes(file.type) || !file.size || file.size > 4 * 1024 * 1024) {
      messages.push(local('Elige fotos JPG, PNG o WebP de hasta 4 MB cada una.', 'Choose JPG, PNG or WebP photos up to 4 MB each.'));
      continue;
    }
    photos.push({ name: file.name, url: URL.createObjectURL(file) });
  }
  showPhotos();
  setPhotoStatus([...new Set(messages)].join(' '));
});

async function turn(index, count) {
  const start = angle;
  const destination = (360 - index * 360 / count) % 360;
  const finish = start + 1440 + (destination - start + 360) % 360;
  let animation;
  try {
    if (!reduce.matches && typeof wheel.animate === 'function') {
      animation = wheel.animate([{ transform: `rotate(${start}deg)` }, { transform: `rotate(${finish}deg)` }],
        { duration: 2400, easing: 'cubic-bezier(.14,.65,.25,1)', fill: 'forwards' });
      await animation.finished;
    }
  } finally {
    angle = destination;
    wheel.style.transform = `rotate(${destination}deg)`;
    animation?.cancel();
  }
}

for (const control of [entries, options, ...modeChoices, ...spinChoices]) control.addEventListener('input', resetRound);
for (const control of [eventName, prize]) control.addEventListener('input', () => {
  syncNames();
  if (round) resetRound();
});
reset.addEventListener('click', () => {
  resetRound();
  stageSpin.focus({ preventScroll: true });
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (running || !form.reportValidity()) return;
  if (!round || round.completed === round.spins) {
    const settings = configuration();
    if (!settings.sectors.length) return;
    round = { ...settings, completed: 0 };
    drawSectors(round.sectors);
  }

  const spin = round.completed + 1;
  const final = spin === round.spins;
  const source = event.submitter;
  const moveToStage = narrow.matches && source !== stageSpin;
  running = true;
  stage.dataset.state = 'spinning';
  progress.textContent = `${spin} / ${round.spins}`;
  result.textContent = final ? local(`Tiro ${spin} de ${round.spins} · buscando el resultado`, `Spin ${spin} of ${round.spins} · picking the result`)
    : local(`Tiro ${spin} de ${round.spins} · exhibición`, `Spin ${spin} of ${round.spins} · exhibition`);
  syncControls();
  if (moveToStage) stage.scrollIntoView({ behavior: reduce.matches ? 'instant' : 'smooth' });

  try {
    const selectedIndex = randomBelow(round.sectors.length);
    const { label } = round.sectors[selectedIndex];
    await turn(selectedIndex, round.sectors.length);
    round.completed = spin;
    stage.dataset.state = final ? 'winner' : 'ready';
    if (!final) {
      result.textContent = local(`Tiro ${spin} de ${round.spins} · exhibición, sin premio.`, `Spin ${spin} of ${round.spins} · exhibition, no prize.`);
    } else if (round.mode === 'options') {
      result.textContent = local(`Resultado del sorteo · ${label}`, `Draw result · ${label}`);
    } else {
      result.textContent = local(`Folio ganador · ${label}`, `Winning ticket · ${label}`);
    }
  } catch {
    progress.textContent = `${round.completed} / ${round.spins}`;
    stage.dataset.state = 'ready';
    result.textContent = local('El tiro se interrumpió. Puedes volver a girar.', 'The spin was interrupted. You can spin again.');
  } finally {
    running = false;
    syncControls();
    if (document.activeElement === document.body) (moveToStage ? stageSpin : source)?.focus({ preventScroll: true });
  }
});

syncNames();
resetRound();
