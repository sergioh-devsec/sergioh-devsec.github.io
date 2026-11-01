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
  return distance > Math.max(350, viewport * .8) && elapsed > 0 && elapsed < 550 && distance / elapsed > 2.2;
}

const mounted = new WeakMap();
export function mountAxiomPresence({ hub, document: doc = globalThis.document,
  now = () => Date.now(), hour = () => new Date().getHours(),
  schedule = setTimeout, cancel = clearTimeout } = {}) {
  if (!hub || !doc?.documentElement) return () => {};
  if (mounted.has(doc)) return mounted.get(doc);
  const view = doc.defaultView || globalThis.window;
  let destroyed = false, idleTimer, lastReaction = -Infinity, idleCount = 0;
  let away = false, lastActivity = now(), scrollAt = now(), scrollFrom = view?.scrollY || 0;
  const root = doc.documentElement;
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
  function scrolling(event) {
    if (destroyed || event.isTrusted === false) return;
    const time = now(), top = view?.scrollY || 0, elapsed = time - scrollAt;
    if (elapsed >= 550) { scrollAt = time; scrollFrom = top; }
    else if (rapidScroll({ distance: top - scrollFrom, elapsed, viewport: view?.innerHeight || 800 })) {
      scrollAt = time; scrollFrom = top;
      if (available() && spanish() && time - lastReaction >= 90000) {
        lastReaction = time;
        void hub.cue(presenceClip('scroll', hour()), { priority: 1, maxAge: 1800, cooldown: 90000 });
      }
    }
    activity(event);
  }
  function speech(event) {
    const data = event.detail || {};
    root.dataset.axiomSpeaking = String(data.phase === 'start' || data.phase === 'progress');
    root.dataset.axiomMood = data.mood || 'neutral';
  }
  function visibility() { if (doc.hidden) { away = true; clearIdle(); } else armIdle(); }
  const cleanups = [];
  const listen = (target, name, fn, options) => {
    target?.addEventListener(name, fn, options);
    cleanups.push(() => target?.removeEventListener(name, fn, options));
  };
  for (const name of ['pointerdown', 'keydown', 'focusin']) listen(doc, name, activity, { passive: true });
  listen(doc, 'scroll', scrolling, { passive: true });
  listen(doc, 'visibilitychange', visibility);
  listen(doc, 'axiom:speech', speech);
  const unsubscribe = hub.subscribe(state => { if (state.preferred && !state.playing && !state.error) armIdle(); else clearIdle(); });
  function destroy() {
    if (destroyed) return;
    destroyed = true; clearIdle(); unsubscribe(); cleanups.forEach(fn => fn());
    delete root.dataset.axiomSpeaking; delete root.dataset.axiomMood; mounted.delete(doc);
  }
  listen(view, 'pagehide', destroy);
  mounted.set(doc, destroy); armIdle();
  return destroy;
}
