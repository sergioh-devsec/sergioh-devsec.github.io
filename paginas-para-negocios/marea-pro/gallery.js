(() => {
  'use strict';

  const images = {
    marea: [
      { src: 'assets/gallery-marea-02.webp?v=cc19670b7366', alt: 'Manicura lila sobre lino' },
      { src: 'assets/gallery-marea-03.webp?v=9e3eeed89b04', alt: 'Puntas francesas color vino con un vaso rosa' },
      { src: 'assets/gallery-marea-04.webp?v=522f3aa71e10', alt: 'Manicura rosa con acabado perlado' },
      { src: 'assets/gallery-marea-05.webp?v=552b91808aed', alt: 'Puntas pastel sobre seda marfil' },
    ],
    tinta: [
      { src: 'assets/gallery-tinta-bordado-v58.webp?v=7739a58a8cc3', alt: 'Tatuaje bordado de flores rojas y violetas en un brazo' },
      { src: 'assets/gallery-tinta-gran-formato-v58.webp?v=080c9a9cd616', alt: 'Tatuaje de gran formato con una grulla y olas que cubre la espalda' },
      { src: 'assets/cover-tinta-v58.webp?v=2ff9a02f5709', alt: 'Manga de blackout con un helecho en espacio negativo' },
      { src: 'assets/gallery-tinta-05.webp?v=bfa671902ef8', alt: 'Tatuaje de media luna con una rama en un hombro' },
    ],
  };

  const figure = document.getElementById('business-photo');
  const cover = figure?.querySelector('img');
  const additions = images[document.documentElement.dataset.theme];
  if (!cover || !Array.isArray(additions)) return;

  const slides = [{ src: cover.getAttribute('src'), alt: cover.alt }, ...additions];
  const name = document.getElementById('business-photo-caption').textContent;
  const region = document.createElement('div');
  region.className = 'photo-gallery';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-roledescription', 'carrusel');
  region.setAttribute('aria-label', `Galería de fotos de ${name}`);

  const frame = document.createElement('div');
  frame.className = 'photo-gallery-frame';
  cover.id = 'gallery-photo';
  cover.draggable = false;
  cover.before(region);
  frame.append(cover);
  region.append(frame);

  const bar = document.createElement('div');
  bar.className = 'photo-gallery-bar';
  const status = document.createElement('p');
  status.className = 'photo-gallery-count';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-atomic', 'true');
  const count = document.createElement('span');
  count.setAttribute('aria-hidden', 'true');
  const announcement = document.createElement('span');
  announcement.className = 'visually-hidden';
  status.append(count, announcement);

  const pagination = document.createElement('div');
  pagination.className = 'photo-gallery-pagination';
  pagination.setAttribute('role', 'group');
  pagination.setAttribute('aria-label', 'Elegir fotografía');
  bar.append(status, pagination);
  region.append(bar);

  function button(className, label, content, onClick) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = className;
    control.setAttribute('aria-label', label);
    control.setAttribute('aria-controls', cover.id);
    control.append(content);
    control.addEventListener('click', onClick);
    return control;
  }

  function chevron(shape) {
    const namespace = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(namespace, 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
    const line = document.createElementNS(namespace, 'path');
    line.setAttribute('d', shape);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '1.75');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    icon.append(line);
    return icon;
  }

  let current = 0;
  const items = slides.map(({ alt }, index) => button('photo-gallery-dot', `Ver foto ${index + 1}: ${alt}`, String(index + 1), () => show(index)));
  pagination.append(...items);
  frame.append(
    button('photo-gallery-arrow photo-gallery-previous', 'Foto anterior', chevron('m14 6-6 6 6 6'), () => show(current - 1)),
    button('photo-gallery-arrow photo-gallery-next', 'Foto siguiente', chevron('m10 6 6 6-6 6'), () => show(current + 1)),
  );

  function show(index) {
    current = (index + slides.length) % slides.length;
    const { src, alt } = slides[current];
    if (cover.getAttribute('src') !== src) cover.src = src;
    cover.alt = alt;
    count.textContent = `${current + 1} / ${slides.length}`;
    announcement.textContent = `Foto ${current + 1} de ${slides.length}. ${alt}`;
    for (const [position, item] of items.entries()) {
      if (position === current) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    }
  }

  region.addEventListener('keydown', (event) => {
    const steps = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 };
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !Object.hasOwn(steps, event.key)) return;
    event.preventDefault();
    show(steps[event.key]);
  });

  let start;
  cover.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    start = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  cover.addEventListener('pointercancel', () => { start = undefined; });
  cover.addEventListener('pointerup', (event) => {
    if (start?.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = undefined;
    if (Math.abs(dx) >= 36 && Math.abs(dx) > Math.abs(dy) * 1.35) show(current + (dx < 0 ? 1 : -1));
  });

  show(0);
})();
