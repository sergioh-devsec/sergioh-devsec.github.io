(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const root = document.documentElement;
  const experience = {
    marea: {
      src: 'assets/cover-marea-v60.webp?v=279f0bd9fd1e',
      name: 'Marea Nail Studio',
      title: 'Brillo a',
      tail: 'tu manera.',
      description: 'Elige tu acabado, personaliza los detalles y prueba la agenda del estudio.',
      photoName: 'Acabado cromado',
      photoDetail: 'Lavanda y nácar',
      photoAlt: 'Una mano con uñas cromadas en lavanda sostiene una concha nacarada sobre tela oscura.',
    },
    tinta: {
      src: 'assets/cover-tinta-v59.webp?v=5f04b7e158a1',
      name: 'Línea Negra Tattoo',
      title: 'La piel es',
      tail: 'territorio.',
      description: 'Del primer trazo a la espalda completa. Explora el catálogo y simula tu sesión.',
      photoName: 'Espalda completa',
      photoDetail: 'Tinta negra · Gran formato',
      photoAlt: 'Un tatuaje abstracto cubre la espalda con pinceladas negras y líneas topográficas, junto a una ventana del taller.',
    },
  };
  const theme = root.dataset.theme === 'tinta' ? 'tinta' : 'marea';
  const profile = experience[theme];
  const welcome = byId('experience-welcome');
  const cover = byId('experience-cover');
  const app = byId('experience-app');
  const topbar = byId('experience-topbar');
  const footer = byId('experience-footer');
  const booking = byId('booking-view');
  const studio = byId('studio-view');
  const gallery = byId('experience-gallery');
  const title = byId('experience-title');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const mobileLayout = window.matchMedia('(max-width: 50rem)');

  byId('experience-name').textContent = profile.name;
  byId('experience-title-main').textContent = profile.title;
  byId('experience-title-tail').textContent = profile.tail;
  byId('experience-description').textContent = profile.description;
  byId('experience-photo-name').textContent = profile.photoName;
  byId('experience-photo-detail').textContent = profile.photoDetail;
  cover.alt = profile.photoAlt;
  byId(`experience-profile-${theme}`).setAttribute('aria-current', 'page');
  byId('business-brand').href = `${location.pathname}${location.search}`;

  function layoutGallery() {
    gallery.open = !mobileLayout.matches;
  }

  function renderRoute(focus = false) {
    const mode = location.hash === '#estudio' ? 'studio' : location.hash === '#reserva' ? 'booking' : '';
    const home = !mode;
    const changed = home ? welcome.hidden : app.hidden || (mode === 'booking' ? booking.hidden : studio.hidden);

    welcome.hidden = !home;
    app.hidden = home;
    topbar.hidden = home;
    footer.hidden = home;
    document.body.dataset.experience = home ? 'welcome' : 'app';
    themeColor.content = getComputedStyle(root).getPropertyValue(home ? '--experience-surround' : '--experience-app-header').trim();

    if (home && !cover.getAttribute('src')) cover.src = profile.src;
    if (!home) {
      const view = mode === 'booking' ? booking : studio;
      if (view.hidden) document.querySelector(`[data-view="${mode}"]`).click();
    }
    if (focus && changed) {
      window.scrollTo(0, 0);
      const heading = home ? title : byId(mode === 'booking' ? 'booking-title' : 'studio-title');
      heading.focus({ preventScroll: true });
    }
  }

  function routeLink(id, hash, afterRoute) {
    byId(id).addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.hash !== hash) history.pushState(null, '', `${location.pathname}${location.search}${hash}`);
      renderRoute(true);
      afterRoute?.();
    });
  }

  routeLink('experience-start', '#reserva');
  routeLink('experience-panel', '#estudio');
  routeLink('business-brand', '');
  if (theme === 'marea') {
    byId('experience-gallery-link').hidden = false;
    byId('experience-panel').after(byId('experience-profile-marea').parentElement);
    routeLink('experience-gallery-link', '#reserva', () => {
      gallery.open = true;
      const summary = gallery.querySelector('summary');
      const control = summary.getClientRects().length ? summary : gallery.querySelector('.photo-gallery-next');
      control?.focus({ preventScroll: true });
      gallery.scrollIntoView({ block: 'start' });
    });
  }
  byId('experience-skip').addEventListener('click', (event) => {
    event.preventDefault();
    const heading = app.hidden ? title : byId(booking.hidden ? 'studio-title' : 'booking-title');
    heading.focus();
  });
  window.addEventListener('hashchange', () => renderRoute(true));
  window.addEventListener('popstate', () => renderRoute(true));
  mobileLayout.addEventListener('change', layoutGallery);

  // The existing booking controller also switches views from the receipt and studio.
  const navigation = new MutationObserver(() => {
    if (app.hidden) return;
    const hash = booking.hidden ? '#estudio' : '#reserva';
    if (location.hash !== hash) history.replaceState(null, '', hash);
  });
  navigation.observe(booking, { attributes: true, attributeFilter: ['hidden'] });

  layoutGallery();
  renderRoute();
})();
