const english = new URLSearchParams(location.search).get('idioma') === 'en';
const copy = {
  skip: 'Skip to the simulator', lead: 'Personalize the prize, watch the wheel spin and see which ticket is picked at random.',
  demo: 'Free rehearsal with fictional tickets. No sales, entries or actual prizes.', wheel: 'The wheel', ready: 'Ready to spin.',
  settings: 'Set up your rehearsal', eventName: 'Raffle name (optional)', prize: 'Prize name', participants: 'Number of tickets', image: 'Reference image (optional)',
  imageHelp: 'JPG, PNG or WebP, up to 4 MB. The image stays on your device.', remove: 'Remove image', style: 'Rehearsal format',
  one: 'One spin · one winner', three: 'Three spins · the third wins', start: 'Spin the wheel', plan: 'Basic plan',
  planDescription: 'One random draw, a prize photo and up to 500 tickets. A confirmed MXN 99 payment will unlock one event.',
  checkoutStatus: 'Payments are being prepared · free rehearsal available', perDraw: 'per event', back: 'Back to CyberSerch', reconfigure: 'Back to settings',
  guideLink: 'See instructions', instructions: 'How to use the wheel', stepOne: 'Set up the prize',
  stepOneDetail: 'Name the prize, optionally add a photo, and choose how many tickets to try.',
  stepTwo: 'Choose a format', stepTwoDetail: 'With three spins, the first two are for show. The third reveals the winning ticket.',
  stepThree: 'Spin and check the result', stepThreeDetail: 'Select Spin the wheel. The rehearsal picks a random ticket from your fictional list.',
};
const local = (es, en) => english ? en : es;
const byId = id => document.getElementById(id);
const defaultPrize = local('Premio sorpresa', 'Surprise prize');

if (english) {
  document.documentElement.lang = 'en';
  document.title = 'Prueba tu Suerte | CyberSerch raffle demo';
  for (const element of document.querySelectorAll('[data-copy]')) element.textContent = copy[element.dataset.copy];
  Object.assign(byId('language-link'), { textContent: 'Español', lang: 'es', hreflang: 'es', href: '?idioma=es' });
  byId('prize').value = defaultPrize;
  byId('stage-prize').textContent = defaultPrize;
}

const form = byId('raffle-form');
const stage = byId('stage-title').closest('.stage');
const wheel = byId('wheel-disc');
const result = byId('result');
const image = byId('image');
const previews = [byId('photo'), byId('stage-photo')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 700px)');
const randomWord = new Uint32Array(1);
let photoUrl = '';
let angle = 0;
let running = false;
let lastTurn;

function randomBelow(limit) {
  const ceiling = 2 ** 32 - (2 ** 32 % limit);
  do { crypto.getRandomValues(randomWord); } while (randomWord[0] >= ceiling);
  return randomWord[0] % limit;
}

function clearPhoto() {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = '';
  for (const preview of previews) preview.removeAttribute('src');
  previews[1].hidden = true;
  byId('photo-preview').hidden = true;
}

image.addEventListener('change', () => {
  clearPhoto();
  image.setCustomValidity('');
  const file = image.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
    image.setCustomValidity(local('Elige una imagen JPG, PNG o WebP de hasta 4 MB.', 'Choose a JPG, PNG or WebP image up to 4 MB.'));
    image.reportValidity();
    return;
  }
  photoUrl = URL.createObjectURL(file);
  for (const preview of previews) preview.src = photoUrl;
  previews[1].hidden = false;
  byId('photo-preview').hidden = false;
});

previews[0].addEventListener('error', () => {
  clearPhoto();
  image.setCustomValidity(local('No se pudo leer esa imagen. Elige otro archivo.', 'This image could not be read. Choose another file.'));
  image.reportValidity();
});

byId('remove-photo').addEventListener('click', () => {
  image.value = '';
  image.setCustomValidity('');
  clearPhoto();
  image.focus();
});

byId('prize').addEventListener('input', () => {
  byId('stage-prize').textContent = byId('prize').value.trim() || defaultPrize;
});

byId('event-name').addEventListener('input', () => {
  byId('stage-title').textContent = byId('event-name').value.trim() || local('La ruleta', 'The wheel');
});

async function turn() {
  if (reduce.matches || typeof wheel.animate !== 'function') return;
  lastTurn?.cancel();
  const start = angle % 360;
  angle = start + 1080 + randomBelow(360);
  lastTurn = wheel.animate([{ transform: `rotate(${start}deg)` }, { transform: `rotate(${angle}deg)` }],
    { duration: 1900, easing: 'cubic-bezier(.14,.65,.25,1)', fill: 'forwards' });
  await lastTurn.finished;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (running || !form.reportValidity()) return;
  running = true;
  const total = byId('entries').valueAsNumber;
  const spins = Number(new FormData(form).get('spins'));
  const controls = [...form.querySelectorAll('input,button')];
  for (const control of controls) control.disabled = true;
  stage.dataset.state = 'spinning';
  if (narrow.matches) stage.scrollIntoView({ behavior: reduce.matches ? 'instant' : 'smooth' });
  try {
    for (let spin = 1; spin <= spins; spin += 1) {
      byId('spin-step').textContent = `${spin} / ${spins}`;
      result.textContent = spin < spins
        ? local(`Giro ${spin} de ${spins} · sin premio`, `Spin ${spin} of ${spins} · no prize`)
        : local(`Giro ${spin} de ${spins} · buscando el folio ganador`, `Spin ${spin} of ${spins} · picking the winning ticket`);
      await turn();
      if (spin < spins) await new Promise(resolve => setTimeout(resolve, reduce.matches ? 650 : 320));
    }
    const ticket = String(1 + randomBelow(total)).padStart(String(total).length, '0');
    result.textContent = local(`Folio ganador del ensayo · ${ticket}`, `Rehearsal winning ticket · ${ticket}`);
    stage.dataset.state = 'winner';
  } catch {
    result.textContent = local('No se completó el ensayo. Puedes volver a girar.', 'The rehearsal was interrupted. You can spin again.');
    stage.dataset.state = 'ready';
  } finally {
    running = false;
    for (const control of controls) control.disabled = false;
  }
});
