/* Native dialog keeps the side menu keyboard-accessible without a custom focus trap. */
(() => {
  'use strict';
  const menu = document.getElementById('site-menu-dialog');
  const toggle = document.getElementById('menu-toggle');
  if (!menu || !toggle || typeof menu.showModal !== 'function') return;

  const root = document.documentElement;
  let restoreFocus = true;
  toggle.hidden = false;
  toggle.setAttribute('aria-controls', menu.id);
  toggle.setAttribute('aria-haspopup', 'dialog');
  toggle.setAttribute('aria-expanded', 'false');
  root.classList.add('side-menu-ready');

  function closeMenu(restore = true) {
    if (!menu.open) return;
    restoreFocus = restore;
    menu.close();
  }

  toggle.addEventListener('click', () => {
    if (menu.open) {
      closeMenu();
      return;
    }
    // A menu should never stack over an unrelated product or privacy dialog.
    if (document.querySelector('dialog[open]')) return;
    window.AXIOM?.close(false);
    restoreFocus = true;
    menu.showModal();
    menu.scrollTop = 0;
    root.classList.add('menu-is-open');
    document.body.classList.add('menu-is-open');
    toggle.setAttribute('aria-expanded', 'true');
    menu.querySelector('[data-close-menu]')?.focus({preventScroll: true});
    document.dispatchEvent(new CustomEvent('portfolio:dialog-open', {detail: {id: menu.id}}));
  });

  menu.querySelectorAll('[data-close-menu]').forEach(button => {
    button.addEventListener('click', () => closeMenu());
  });
  menu.addEventListener('cancel', () => { restoreFocus = true; });
  menu.addEventListener('close', () => {
    document.dispatchEvent(new CustomEvent('portfolio:dialog-close', {detail: {id: menu.id}}));
    root.classList.remove('menu-is-open');
    document.body.classList.remove('menu-is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus && !document.querySelector('dialog[open]') && toggle.isConnected) {
      toggle.focus({preventScroll: true});
    }
    restoreFocus = true;
  });
  menu.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (link && !event.defaultPrevented && event.button === 0 &&
        !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      // The site's existing anchor handler owns scrolling and focus at the destination.
      closeMenu(false);
      return;
    }
    if (event.target !== menu) return;
    const bounds = menu.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
  });
})();
