import { mountAxiomSupport } from './axiom-support.js?v=voice-36';
import { createScrollReactionTracker } from './axiom-interaction.js?v=voice-36';
// Reactions stay in this document. No visitor text, analytics or remote voice.
export function isNight(hour) { return hour >= 21 || hour < 6; }
export function presenceClip(kind, hour = new Date().getHours()) {
  if (kind === 'return') return isNight(hour) ? 'idleReturnNight' : 'idleReturn';
  if (kind === 'scroll') return isNight(hour) ? 'scrollNight' : 'scrollBrake';
  return null;
}
export function canReact({ preferred, playing, loading, hidden, editing, dialogOpen, error = false }) {
  return Boolean(preferred && !playing && !loading && !hidden && !editing && !dialogOpen && !error);
}
export function rapidScroll({ distance, elapsed, viewport }) {
  return Math.abs(distance) > Math.max(350, viewport * .8) && elapsed > 0 && elapsed < 550 && Math.abs(distance) / elapsed > 2.2;
}

const mounted = new WeakMap();
export function mountAxiomPresence({ hub, document: doc = globalThis.document,
  now = () => Date.now(), hour = () => new Date().getHours(),
  schedule = setTimeout, cancel = clearTimeout } = {}) {
  if (!hub || !doc?.documentElement) return () => {};
  if (mounted.has(doc)) return mounted.get(doc);
  const view = doc.defaultView || globalThis.window;
  let destroyed = false, idleTimer, lastReaction = -Infinity, idleCount = 0;
  let away = false, lastActivity = now();
  const scroll = createScrollReactionTracker({ now });
  const root = doc.documentElement;
  const destroySupport = mountAxiomSupport({ hub, document: doc });
  const editing = () => Boolean(doc.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]'));
  const available = () => canReact({ preferred: hub.preferred, playing: hub.playing,
    loading: hub.loading, error: hub.state?.error, hidden: doc.hidden, editing: editing(), dialogOpen: Boolean(doc.querySelector('dialog[open]')) });
  const clearIdle = () => { if (idleTimer) cancel(idleTimer); idleTimer = undefined; };
  const spanish = () => !String(root.lang).startsWith('en');
  function armIdle() {
    clearIdle();
    if (destroyed || !hub.preferred || hub.state?.error || doc.hidden || idleCount >= 2 || !spanish()) return;
    idleTimer = schedule(() => {
      idleTimer = undefined;
      if (!available() || now() - lastReaction < 90000) return;
      // A brief aside is a response to a pause, never a playlist or a timer loop.
      const key = ['trialJoke1', 'trialJoke21'][idleCount++];
      lastReaction = now(); away = true;
      void hub.cue(key, { priority: 0, maxAge: 1800, cooldown: 90000 });
    }, 10000);
  }
  function activity(event) {
    if (destroyed || event.isTrusted === false) return;
    if (event.type === 'keydown' && ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) return;
    const time = now();
    const directAction = Boolean(event.target?.closest?.('button,a,summary,input,select,textarea,[contenteditable]:not([contenteditable="false"])'));
    if (away && (directAction || time - lastActivity > 10000)) {
      away = false;
      // Let the visitor's chosen control keep its trusted recovery gesture.
      if (!directAction && available() && spanish() && time - lastReaction >= 12000) {
        lastReaction = time;
        void hub.cue(presenceClip('return', hour()), { priority: 1, maxAge: 1800, cooldown: 90000 });
      }
    }
    lastActivity = time; armIdle();
  }
  function scrollIntent(event) {
    if (destroyed || event.isTrusted !== true || editing() || doc.querySelector('dialog[open]')) return;
    if (event.type === 'keydown' && (!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)
      || event.target?.closest?.('button,a,summary,input,select,textarea,[contenteditable]:not([contenteditable="false"])'))) return;
    scroll.intent(view?.scrollY || 0); away = false; lastActivity = now(); armIdle();
  }
  function scrolling(event) {
    if (destroyed || event.isTrusted === false) return;
    if (event.target && ![doc, view, root, doc.body].includes(event.target)) return;
    const allowed = !doc.hidden && !editing() && !doc.querySelector('dialog[open]');
    if (!scroll.observe(view?.scrollY || 0, { allowed, viewport: view?.innerHeight || 800 })) return;
    lastReaction = now(); away = false; lastActivity = now(); clearIdle();
    const key = presenceClip('scroll', hour());
    // A rapid gesture can queue one fresh response, never interrupt a sentence.
    if (hub.preferred && !hub.state?.error) void hub.cue(key, { priority: 1, maxAge: 8000, cooldown: 20000 });
    else hub.describe?.(key);
  }
  function speech(event) {
    const data = event.detail || {};
    root.dataset.axiomSpeaking = String(data.phase === 'start' || data.phase === 'progress');
    root.dataset.axiomMood = data.mood || 'neutral';
  }
  function visibility() { scroll.reset(); if (doc.hidden) { away = true; clearIdle(); } else armIdle(); }
  const cleanups = [];
  const listen = (target, name, fn, options) => {
    target?.addEventListener(name, fn, options);
    cleanups.push(() => target?.removeEventListener(name, fn, options));
  };
  for (const name of ['pointerdown', 'keydown', 'focusin']) listen(doc, name, activity, { passive: true });
  for (const name of ['wheel', 'touchstart', 'touchmove', 'keydown']) listen(doc, name, scrollIntent, { passive: true, capture: true });
  listen(doc, 'click', event => { if (event.target?.closest?.('a,button,summary')) scroll.reset(); }, { capture: true });
  listen(view, 'hashchange', () => scroll.reset());
  listen(doc, 'scroll', scrolling, { passive: true });
  listen(doc, 'visibilitychange', visibility);
  listen(doc, 'axiom:speech', speech);
  const unsubscribe = hub.subscribe(state => { if (state.preferred && !state.playing && !state.error) armIdle(); else clearIdle(); });
  function destroy() {
    if (destroyed) return;
    destroyed = true; clearIdle(); unsubscribe(); destroySupport(); cleanups.forEach(fn => fn());
    delete root.dataset.axiomSpeaking; delete root.dataset.axiomMood; mounted.delete(doc);
  }
  listen(view, 'pagehide', destroy);
  mounted.set(doc, destroy); armIdle();
  return destroy;
}
