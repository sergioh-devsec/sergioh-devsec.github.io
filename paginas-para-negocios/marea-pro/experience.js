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
      galleryIntro: 'Explora cinco acabados de muestra, del cromado suave a las puntas francesas.',
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
      galleryIntro: 'Explora cinco trabajos de muestra, de la línea fina a las piezas de gran formato.',
    },
  };
  const theme = root.dataset.theme === 'tinta' ? 'tinta' : 'marea';
  const profile = experience[theme];
  const welcome = byId('experience-welcome');
  const cover = byId('experience-cover');
  const app = byId('experience-app');
  const topbar = byId('experience-topbar');
  const footer = byId('experience-footer');
  const device = byId('demo-device');
  const deviceControls = byId('device-controls');
  const deviceButtons = [...deviceControls.querySelectorAll('[data-device]')];
  const desktopPreview = window.matchMedia('(min-width: 38rem)');
  const views = {
    home: { hash: '', heading: byId('experience-title') },
    booking: { hash: '#reserva', panel: byId('booking-view'), heading: byId('booking-title') },
    studio: { hash: '#estudio', panel: byId('studio-view'), heading: byId('studio-title') },
    gallery: { hash: '#galeria', panel: byId('gallery-view'), heading: byId('gallery-title') },
  };
  const viewButtons = [...topbar.querySelectorAll('[data-view]')];
  const galleryNav = byId('experience-gallery-nav');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let activeView;

  byId('experience-name').textContent = profile.name;
  byId('experience-title-main').textContent = profile.title;
  byId('experience-title-tail').textContent = profile.tail;
  byId('experience-description').textContent = profile.description;
  byId('experience-photo-name').textContent = profile.photoName;
  byId('experience-photo-detail').textContent = profile.photoDetail;
  byId('gallery-intro').textContent = profile.galleryIntro;
  cover.alt = profile.photoAlt;
  byId(`experience-profile-${theme}`).setAttribute('aria-current', 'page');
  byId('business-brand').href = `${location.pathname}${location.search}`;

  const routeLinks = ['experience-start', 'experience-panel', 'business-brand', 'experience-gallery-link',
    'experience-gallery-nav', 'gallery-booking-link', 'booking-gallery-link'].map(byId);
  const previewLinks = [...routeLinks, byId('experience-profile-marea'), byId('experience-profile-tinta'),
    ...byId('business-links').querySelectorAll('a')].map((link) => [link, new URL(link.href)]);

  function renderDevice() {
    const view = new URLSearchParams(location.search).get('vista');
    const preset = view === 'android' ? 'android' : 'iphone';
    root.dataset.device = preset;
    byId('device-width').textContent = preset === 'android' ? '412 px' : '390 px';
    for (const button of deviceButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.device === preset));
    }
    for (const [link, url] of previewLinks) {
      if (view === preset) url.searchParams.set('vista', preset);
      else url.searchParams.delete('vista');
      link.href = `${url.pathname}${url.search}${url.hash}`;
    }
  }

  function setScrollTarget() {
    if (desktopPreview.matches) device.tabIndex = 0;
    else device.removeAttribute('tabindex');
  }

  function renderRoute(focus = false) {
    const mode = Object.keys(views).find((name) => views[name].hash === location.hash) || 'home';
    const changed = activeView !== mode;
    const home = mode === 'home';
    const gallery = mode === 'gallery';
    activeView = mode;

    welcome.hidden = !home;
    app.hidden = home;
    topbar.hidden = home;
    footer.hidden = home;
    views.gallery.panel.hidden = !gallery;
    document.body.dataset.experience = home ? 'welcome' : 'app';
    themeColor.content = getComputedStyle(root).getPropertyValue(home ? '--experience-surround' : '--experience-app-header').trim();

    if (home && !cover.getAttribute('src')) cover.src = profile.src;
    if (gallery) {
      views.booking.panel.hidden = true;
      views.studio.panel.hidden = true;
      galleryNav.setAttribute('aria-current', 'page');
    } else {
      galleryNav.removeAttribute('aria-current');
      const viewButton = viewButtons.find((button) => button.dataset.view === mode);
      if (viewButton && views[mode].panel.hidden) viewButton.click();
    }
    for (const button of viewButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.view === mode));
    }
    if (focus && changed) {
      device.scrollTop = 0;
      window.scrollTo(0, 0);
      views[mode].heading.focus({ preventScroll: true });
    }
  }

  function navigate(hash, focus = true) {
    if (location.hash !== hash) history.pushState(null, '', `${location.pathname}${location.search}${hash}`);
    renderRoute(focus);
  }

  for (const link of routeLinks) {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(link.hash);
    });
  }
  for (const button of viewButtons) {
    button.addEventListener('click', () => {
      const { hash } = views[button.dataset.view];
      if (location.hash !== hash) navigate(hash);
    });
  }
  byId('experience-skip').addEventListener('click', (event) => {
    event.preventDefault();
    views[activeView].heading.focus();
  });
  window.addEventListener('hashchange', () => renderRoute(true));
  window.addEventListener('popstate', () => {
    renderDevice();
    renderRoute(true);
  });
  for (const button of deviceButtons) {
    button.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.set('vista', button.dataset.device);
      history.replaceState(history.state, '', url);
      renderDevice();
    });
  }
  desktopPreview.addEventListener('change', setScrollTarget);

  // The existing booking controller also switches views from the receipt and studio.
  const navigation = new MutationObserver(() => {
    if (app.hidden) return;
    const nextView = ['booking', 'studio'].find((name) => !views[name].panel.hidden);
    if (nextView && location.hash !== views[nextView].hash) navigate(views[nextView].hash, false);
  });
  navigation.observe(views.booking.panel, { attributes: true, attributeFilter: ['hidden'] });

  setScrollTarget();
  renderDevice();
  renderRoute();
  deviceControls.hidden = false;
})();
