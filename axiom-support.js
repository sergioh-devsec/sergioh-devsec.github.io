import { supportUrl } from './reciprocity.js?v=voice-5';

// Existing public destinations. No visitor text, payment processing or network calls.
const DEFAULT_LINKS = Object.freeze({
  paypal: 'https://www.paypal.com/donate/?hosted_button_id=D587QCAYURRYG',
  patreon: 'https://www.patreon.com/c/CyberserchMX/membership',
});
const INVITATIONS = ['supportAnswer3', 'supportAnswer2', 'trialJoke20'];
export function mealForHour(hour) {
  if (!Number.isFinite(hour) || hour < 0 || hour >= 24) return 'coffee';
  return hour < 11 && hour >= 5 ? 'breakfast' : hour >= 19 || hour < 5 ? 'dinner' : 'coffee';
}
export function mayInvite({ elapsed, sinceLast, usefulReplies, visible, busy, editing, dismissedUntil = 0, now = 0 }) {
  return Boolean(visible && !busy && !editing && now >= dismissedUntil && elapsed >= 20000
    && sinceLast >= 65000 && (usefulReplies >= 3 || elapsed >= 45000));
}
const mounts = new WeakMap();
export function mountAxiomSupport({ hub, document: doc = globalThis.document,
  now = Date.now, hour = () => new Date().getHours(), schedule = setTimeout, cancel = clearTimeout } = {}) {
  if (!hub || !doc?.body || mounts.has(doc)) return mounts.get(doc) || (() => {});
  const start = now(); let last = start - 45000, dismissedUntil = 0, replies = 0, count = 0, timer, destroyed = false;
  const t = key => {
    const lang = String(doc.documentElement.lang).startsWith('en') ? 'en' : 'es';
    return globalThis.window?.TRANSLATIONS?.[lang]?.[key] || globalThis.window?.TRANSLATIONS?.es?.[key] || key;
  };
  const node = (tag, cls) => { const el = doc.createElement(tag); el.className = cls; return el; };
  const panel = node('aside', 'axiom-support'); panel.id = 'axiom-support'; panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'axiom-support-title'); panel.setAttribute('data-clarity-mask', 'true');
  const close = node('button', 'axiom-support-close'); close.type = 'button'; close.textContent = '×';
  const title = node('strong', 'axiom-support-title'); title.id = 'axiom-support-title';
  const copy = node('p', 'axiom-support-copy'); copy.setAttribute('aria-live', 'polite');
  const actions = node('div', 'axiom-support-actions');
  const paypal = node('a', 'axiom-support-paypal'), patreon = node('a', 'axiom-support-patreon');
  for (const [a, provider] of [[paypal, 'paypal'], [patreon, 'patreon']]) {
    const href = supportUrl(provider, undefined, { links: globalThis.window?.PORTFOLIO?.supportLinks || DEFAULT_LINKS });
    if (href) a.href = href; else a.hidden = true;
    a.target = '_blank'; a.rel = 'noopener noreferrer';
  }
  actions.append(paypal, patreon); panel.append(close, title, copy, actions); doc.body.append(panel);
  function render() {
    const meal = mealForHour(hour()); title.textContent = t('presence_supportTitle');
    copy.textContent = t(`presence_${meal}Copy`); paypal.textContent = t(`presence_${meal}Button`);
    patreon.textContent = t('presence_patreon'); close.setAttribute('aria-label', t('presence_closeSupport'));
  }
  function quiet() { return doc.hidden || doc.querySelector('dialog[open],#analytics-preferences:not([hidden])'); }
  function check() {
    timer = undefined; if (destroyed) return;
    const time = now(), editing = Boolean(doc.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]'));
    if (panel.hidden && count < 4 && mayInvite({ elapsed: time-start, sinceLast: time-last, usefulReplies: replies,
      visible: !quiet(), busy: hub.playing || hub.loading || !hub.preferred || hub.state?.error,
      editing, dismissedUntil, now: time })) {
      render(); panel.hidden = false; last = time; replies = 0;
      if (!String(doc.documentElement.lang).startsWith('en')) void hub.cue(INVITATIONS[count % INVITATIONS.length], { priority: 1, maxAge: 1800, cooldown: 65000 });
      count++;
    }
    timer = schedule(check, 5000);
  }
  function dismiss() { panel.hidden = true; dismissedUntil = now() + 180000; }
  function speech(event) { if (event.detail?.phase === 'end' && event.detail.key && !INVITATIONS.includes(event.detail.key)) replies++; }
  function visibility() { if (doc.hidden) panel.hidden = true; }
  close.addEventListener('click', dismiss); paypal.addEventListener('click', dismiss); patreon.addEventListener('click', dismiss);
  doc.addEventListener('axiom:speech', speech); doc.addEventListener('visibilitychange', visibility);
  doc.addEventListener('portfolio:language', render);
  function destroy() {
    if (destroyed) return; destroyed = true; cancel(timer);
    doc.removeEventListener('axiom:speech', speech); doc.removeEventListener('visibilitychange', visibility);
    doc.removeEventListener('portfolio:language', render); doc.defaultView?.removeEventListener('pagehide', destroy);
    panel.remove(); mounts.delete(doc);
  }
  doc.defaultView?.addEventListener('pagehide', destroy); render(); timer = schedule(check, 20000);
  mounts.set(doc, destroy); return destroy;
}
