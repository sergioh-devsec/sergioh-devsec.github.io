export const MODE_STORAGE_KEY = 'site_mode';
export const LANGUAGE_STORAGE_KEY = 'cyberserch-language';

const MODES = new Set(['oficina', 'laboratorio']);
const LANGUAGES = new Set(['es', 'en']);
const parameter = (search, name) => {
  try { return new URLSearchParams(typeof search === 'string' ? search : '').get(name); }
  catch { return null; }
};

/** URL preferences take priority when opening a link or navigating history. */
export function resolveMode(search = '', stored = null) {
  const requested = parameter(search, 'modo');
  return MODES.has(requested) ? requested : MODES.has(stored) ? stored : 'oficina';
}

export function resolveLanguage(search = '', stored = null, browserLanguage = 'es') {
  const requested = parameter(search, 'idioma');
  if (LANGUAGES.has(requested)) return requested;
  if (LANGUAGES.has(stored)) return stored;
  return typeof browserLanguage === 'string' && browserLanguage.toLowerCase().startsWith('en') ? 'en' : 'es';
}

/**
 * Owns only mode/language preferences. No analytics or visitor data is stored.
 * setMode/setLanguage update the current history entry, preserving other URL
 * parameters and its hash. Storage events represent a new choice in another
 * tab, while popstate resolves the link's preferences again.
 */
export function createModeManager({ window: win = globalThis.window, document: doc = globalThis.document } = {}) {
  if (!win || !doc?.documentElement) throw new TypeError('createModeManager needs a window and document.');
  let destroyed = false;
  const read = key => { try { return win.localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { win.localStorage.setItem(key, value); } catch { /* Preference storage is optional. */ } };
  const browserLanguage = () => win.navigator?.language || 'es';
  let mode = resolveMode(win.location?.search, read(MODE_STORAGE_KEY));
  let language = resolveLanguage(win.location?.search, read(LANGUAGE_STORAGE_KEY), browserLanguage());

  function updateURL(name, value) {
    try {
      const url = new URL(win.location.href);
      if (url.searchParams.getAll(name).length === 1 && url.searchParams.get(name) === value) return;
      url.searchParams.set(name, value);
      win.history.replaceState(win.history.state, '', url.href);
    } catch { /* Sandboxed previews may not permit history changes. */ }
  }

  function emit(name, detail) {
    const CustomEventType = win.CustomEvent || globalThis.CustomEvent;
    if (typeof CustomEventType === 'function') doc.dispatchEvent(new CustomEventType(name, { detail, bubbles: true }));
  }

  function applyMode(next, source, { persist = true, url = true, initial = false } = {}) {
    if (destroyed || !MODES.has(next)) return mode;
    const previous = mode;
    mode = next;
    doc.documentElement.dataset.mode = mode;
    if (persist) write(MODE_STORAGE_KEY, mode);
    if (url) updateURL('modo', mode);
    if (initial || previous !== mode) emit('site:mode', { mode, previous: initial ? null : previous, source });
    return mode;
  }

  function applyLanguage(next, source, { persist = true, url = true, initial = false } = {}) {
    if (destroyed || !LANGUAGES.has(next)) return language;
    const previous = language;
    language = next;
    doc.documentElement.lang = language;
    if (persist) write(LANGUAGE_STORAGE_KEY, language);
    if (url) updateURL('idioma', language);
    if (initial || previous !== language) emit('portfolio:language', { language, previous: initial ? null : previous, source });
    return language;
  }

  function onHistory() {
    applyMode(resolveMode(win.location?.search, read(MODE_STORAGE_KEY)), 'history');
    applyLanguage(resolveLanguage(win.location?.search, read(LANGUAGE_STORAGE_KEY), browserLanguage()), 'history', {url:false});
  }

  function onStorage(event) {
    // A different tab's explicit selection is newer than this tab's URL.
    // Do not write it back and create a cross-tab update loop.
    if (event.key === MODE_STORAGE_KEY) applyMode(MODES.has(event.newValue) ? event.newValue : 'oficina', 'storage', {persist:false});
    if (event.key === LANGUAGE_STORAGE_KEY) applyLanguage(LANGUAGES.has(event.newValue) ? event.newValue : resolveLanguage('', null, browserLanguage()), 'storage', {persist:false});
  }

  win.addEventListener('popstate', onHistory);
  win.addEventListener('storage', onStorage);
  applyMode(mode, 'initial', {initial:true});
  applyLanguage(language, 'initial', {initial:true, url:false});

  return Object.freeze({
    getMode: () => mode,
    getLanguage: () => language,
    setMode: value => applyMode(value, 'user'),
    setLanguage: value => applyLanguage(value, 'user'),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      win.removeEventListener('popstate', onHistory);
      win.removeEventListener('storage', onStorage);
    },
  });
}
