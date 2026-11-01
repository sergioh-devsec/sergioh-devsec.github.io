/* Local delivery checkpoints. No requests, storage, identifiers or payment confirmation. */
const TOOLS = new Set(['dental', 'csv', 'logs']);
const HOSTS = Object.freeze({
  paypal: Object.freeze(['paypal.com', 'www.paypal.com', 'paypal.me', 'www.paypal.me']),
  patreon: Object.freeze(['patreon.com', 'www.patreon.com']),
});
const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const count = value => Number.isSafeInteger(value) && value >= 0;
const configuredLinks = () => globalThis.PORTFOLIO?.supportLinks || globalThis.window?.PORTFOLIO?.supportLinks || {};

/** Per-tool, per-view flags only: {csv:{success:true,dismissed:false}}. */
export function shouldAsk({ tool, sessionFlags } = {}) {
  if (!TOOLS.has(tool) || !record(sessionFlags) || !Object.hasOwn(sessionFlags, tool)) return false;
  const flag = sessionFlags[tool];
  return record(flag) && flag.success === true && flag.dismissed !== true;
}

/** Translation key + factual local-result values. Never invent hours or money saved. */
export function anchorFor(tool, stats = {}) {
  if (!TOOLS.has(tool) || !record(stats) || stats.success !== true) return null;
  if (tool === 'dental') {
    if (typeof stats.hash !== 'string' || !/^[a-fA-F0-9]{64}$/u.test(stats.hash)) return null;
    return { key: 'recip_anchorDental', values: {} };
  }
  const n = tool === 'csv' ? stats.total : stats.valid;
  if (!count(n)) return null;
  return { key: tool === 'csv' ? 'recip_anchorCsv' : 'recip_anchorLogs', values: { n } };
}

function providerUrl(value, provider) {
  if (!Object.hasOwn(HOSTS, provider) || typeof value !== 'string' || !value || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash
      && HOSTS[provider].includes(url.hostname) && url.pathname !== '/' ? url : null;
  } catch { return null; }
}
function hostedDonation(url) {
  return url && ['paypal.com', 'www.paypal.com'].includes(url.hostname)
    && /^\/donate\/?$/u.test(url.pathname) && /^[A-Z0-9]{5,32}$/u.test(url.searchParams.get('hosted_button_id') || '')
    && url.searchParams.getAll('hosted_button_id').length === 1;
}

/** Public destinations only. Existing fixed-USD buttons take precedence over the MXN flexible button.
 * Amount parameters are hints to hosted donation pages, never proof of a paid amount.
 * Non-hosted URLs are validated and returned unchanged, as the provider owns their pricing UI.
 */
export function supportUrl(provider, amountUsd, { links = configuredLinks() } = {}) {
  if (!Object.hasOwn(HOSTS, provider) || !record(links)) return null;
  if (amountUsd !== undefined && (!Number.isSafeInteger(amountUsd) || amountUsd < 1 || amountUsd > 10000)) return null;
  const fixedKey = provider === 'paypal' && [2, 5].includes(amountUsd) ? `paypalUsd${amountUsd}` : null;
  const value = fixedKey && Object.hasOwn(links, fixedKey) ? links[fixedKey] : links[provider];
  const url = providerUrl(value, provider);
  if (!url) return null;
  if (provider === 'paypal' && amountUsd !== undefined && hostedDonation(url)) {
    url.searchParams.set('amount', String(amountUsd));
    url.searchParams.set('currency_code', 'USD');
  }
  return url.href;
}

function defaultTranslate(key, values = {}) {
  if (globalThis.window?.I18N?.t) return window.I18N.t(key, values);
  const lang = globalThis.document?.documentElement?.lang === 'en' ? 'en' : 'es';
  const dictionary = globalThis.window?.TRANSLATIONS?.[lang] || globalThis.TRANSLATIONS?.[lang] || {};
  return String(dictionary[key] || key).replace(/\{(\w+)\}/gu, (_, name) => String(values[name] ?? ''));
}

/**
 * createReciprocity({translate,links,track}) -> checkpoint, reset, dismiss, destroy.
 * checkpoint({tool,stats,onDownload,onDelivered}) takes a successful result, not file contents.
 * stats: csv {success:true,total}; logs {success:true,valid}; dental {success:true,hash}.
 * Call invalidate(tool) on edit, clear or a new analysis; dismissal persists in this view.
 * Call reset(tool) only when leaving the tool view or starting a new visit.
 * A closed checkpoint skips the prompt on a repeated export of that same result.
 * Donations are voluntary: file delivery does not wait for or verify a payment.
 */
export function createReciprocity({
  document: doc = globalThis.document,
  translate = defaultTranslate,
  links = configuredLinks,
  track = name => doc.dispatchEvent(new CustomEvent('portfolio:measurement', { detail: name })),
  openSupport = url => globalThis.window.open(url, '_blank', 'noopener,noreferrer'),
  voice = null,
} = {}) {
  if (!doc?.createElement || typeof translate !== 'function' || typeof track !== 'function' || typeof openSupport !== 'function') throw new TypeError('Invalid checkpoint configuration');
  const sessionFlags = Object.create(null);
  let active = null, destroyed = false, sequence = 0;
  const make = (tag, cls) => { const node = doc.createElement(tag); if (cls) node.className = cls; return node; };
  const dialog = make('dialog', 'reciprocity-dialog');
  dialog.id = 'reciprocity-delivery';
  dialog.setAttribute('aria-labelledby', 'reciprocity-title');
  dialog.setAttribute('data-clarity-mask', 'true');
  const close = make('button', 'reciprocity-close'); close.type = 'button'; close.textContent = '×';
  const kicker = make('p', 'reciprocity-kicker'), title = make('h2'); title.id = 'reciprocity-title'; title.tabIndex = -1;
  const message = make('p', 'reciprocity-message'); message.setAttribute('aria-live', 'polite'); message.setAttribute('aria-atomic', 'true');
  const note = make('p', 'reciprocity-note');
  const actions = make('div', 'reciprocity-actions');
  const coffee = make('button', 'reciprocity-primary'), support = make('button', 'reciprocity-secondary'), skip = make('button', 'reciprocity-skip');
  for (const button of [coffee, support, skip]) button.type = 'button';
  const monthly = make('a', 'reciprocity-monthly'); monthly.target = '_blank'; monthly.rel = 'noopener noreferrer';
  const status = make('p', 'reciprocity-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  actions.append(coffee, support, skip); dialog.append(close, kicker, title, message, note, actions, monthly, status); doc.body.append(dialog);
  let removeVoice=()=>{};
  if(voice?.subscribe&&voice?.toggle) {
    const voiceButton=make('button','axiom-inline-voice');voiceButton.type='button';dialog.insertBefore(voiceButton,message);
    const updateVoice=state=>{voiceButton.textContent=translate(state.loading?'voice_loading':state.error?'voice_retry':state.preferred?'voice_mute':'voice_listen');voiceButton.setAttribute('aria-pressed',String(state.preferred&&!state.error));};
    voiceButton.addEventListener('click',()=>{void voice.toggle('supportAnswer2');});
    removeVoice=voice.subscribe(updateVoice);
  }
  const currentLinks = () => typeof links === 'function' ? links() : links;
  const setBusy = busy => { coffee.disabled = busy || !active?.urls.two; support.disabled = busy || !active?.urls.five; skip.disabled = busy; };
  function render() {
    close.setAttribute('aria-label', translate('recip_close'));
    kicker.textContent = translate('recip_kicker'); title.textContent = translate('recip_title');
    coffee.textContent = translate('recip_coffee2'); support.textContent = translate('recip_support5');
    skip.textContent = translate('recip_skip'); monthly.textContent = translate('recip_monthly');
    note.textContent = translate('recip_voluntary');
    if (active) {
      message.textContent = translate(active.anchor.key, active.anchor.values);
      const url = supportUrl('patreon', undefined, { links: currentLinks() });
      monthly.hidden = !url; if (url) monthly.href = url; else monthly.removeAttribute('href');
      if (active.failure) status.textContent = translate('recip_downloadError');
      setBusy(active.started);
    }
  }
  function finishDialog({ explicit = false } = {}) {
    const previous = active;
    if (!previous) return;
    active = null; sequence++;
    if (explicit) { sessionFlags[previous.tool].dismissed = true; track('recip_dismiss'); }
    if (dialog.open) dialog.close();
    if (previous.opener?.isConnected) previous.opener.focus({ preventScroll: true });
  }
  async function performDownload(amount) {
    const task = active;
    if (!task || task.started) return;
    task.started = true; task.failure = false; setBusy(true);
    if (amount !== undefined) {
      const url = amount === 2 ? task.urls.two : task.urls.five;
      if (!url) { task.started = false; setBusy(false); return; }
      track(amount === 2 ? 'recip_coffee2_click' : 'recip_support5_click');
      // Synchronous user-gesture destination; opening the provider never confirms payment.
      try { openSupport(url); } catch { /* The local file is delivered even if a popup is blocked. */ }
    }
    try {
      const delivered = await task.onDownload();
      if (active !== task || task.sequence !== sequence) return;
      if (delivered === false) { finishDialog(); return; }
      sessionFlags[task.tool].dismissed = true;
      if (amount === undefined) track('recip_dismiss');
      finishDialog();
      task.onDelivered?.();
    } catch {
      if (active === task) { task.started = false; task.failure = true; status.textContent = translate('recip_downloadError'); setBusy(false); }
    }
  }
  close.addEventListener('click', () => finishDialog({ explicit: true }));
  dialog.addEventListener('cancel', event => { event.preventDefault(); finishDialog({ explicit: true }); });
  dialog.addEventListener('close', () => { if (active) finishDialog({ explicit: true }); });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not([disabled]),a[href]')].filter(node => !node.hidden);
    if (!focusable.length) { event.preventDefault(); title.focus(); return; }
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && (doc.activeElement === first || doc.activeElement === title)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (doc.activeElement === last || doc.activeElement === title)) { event.preventDefault(); first.focus(); }
  });
  coffee.addEventListener('click', () => { void performDownload(2); });
  support.addEventListener('click', () => { void performDownload(5); });
  skip.addEventListener('click', () => { void performDownload(); });
  doc.addEventListener('portfolio:language', render);
  render();
  return {
    checkpoint({ tool, stats, onDownload, onDelivered } = {}) {
      if (destroyed || !TOOLS.has(tool) || typeof onDownload !== 'function') return false;
      const anchor = anchorFor(tool, stats); if (!anchor) return false;
      if (active?.started) return true;
      if (active) finishDialog();
      sessionFlags[tool] ??= { success: true, dismissed: false };
      sessionFlags[tool].success = true;
      if (!shouldAsk({ tool, sessionFlags })) {
        // No repeated prompt after a close/skip for this result. Delivery stays free.
        Promise.resolve().then(onDownload).then(delivered => { if (delivered !== false) onDelivered?.(); }).catch(() => {});
        return true;
      }
      const configured = currentLinks(), urls = {};
      // Labels promise USD: use the already verified, fixed-USD hosted pages only.
      for (const [key, amount] of [['two', 2], ['five', 5]]) {
        const fixed = providerUrl(configured?.[`paypalUsd${amount}`], 'paypal');
        urls[key] = hostedDonation(fixed) ? supportUrl('paypal', amount, { links: configured }) : null;
      }
      active = { tool, anchor, urls, onDownload, onDelivered, started: false, failure: false, opener: doc.activeElement, sequence: ++sequence };
      status.textContent = ''; render(); dialog.showModal(); title.focus({ preventScroll: true });
      track(`recip_shown_${tool}`);if(voice?.cue)void voice.cue('supportAnswer2');return true;
    },
    invalidate(tool) { if (!TOOLS.has(tool)) return; if (active?.tool === tool) finishDialog(); if (sessionFlags[tool]) sessionFlags[tool].success = false; },
    reset(tool) { if (!TOOLS.has(tool)) return; if (active?.tool === tool) finishDialog(); delete sessionFlags[tool]; },
    dismiss(tool) { if (!TOOLS.has(tool)) return; if (active?.tool === tool) finishDialog({ explicit: true }); else if (sessionFlags[tool]) sessionFlags[tool].dismissed = true; },
    destroy() { if (destroyed) return; destroyed = true; finishDialog(); removeVoice(); doc.removeEventListener('portfolio:language', render); dialog.remove(); },
  };
}
