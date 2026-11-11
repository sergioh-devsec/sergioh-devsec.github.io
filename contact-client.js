/* Public contact client. Secrets, delivery and verification belong to the Worker. */
(() => {
  'use strict';
  const SERVICES = new Set(['landing', 'information', 'custom', 'automation', 'security', 'other']);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  function workerEndpoint(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && u.hostname === 'contact.cyberserch.com' && !u.port &&
        u.pathname === '/contact' && !u.search && !u.hash && !u.username && !u.password ? u.href : null;
    } catch { return null; }
  }
  function publicSiteKey(value) {
    // Production keys only; official always-pass test keys must not activate the live form.
    return typeof value === 'string' && /^0x4[A-Za-z0-9_-]{17,100}$/.test(value) ? value : null;
  }
  function workerReady(config) {
    return Boolean(config && config.provider === 'worker' && workerEndpoint(config.endpoint) && publicSiteKey(config.turnstileSiteKey));
  }
  function validFields(fields) {
    if (!fields || fields.consent !== true || !SERVICES.has(fields.service) || !['es', 'en'].includes(fields.locale) || !UUID.test(fields.requestId)) return false;
    for (const [key, min, max] of [['name', 1, 120], ['email', 3, 254], ['message', 10, 3000], ['quoteSummary', 0, 4000], ['turnstileToken', 1, 2048]]) {
      const value = fields[key];
      if (typeof value !== 'string' || value.trim().length < min || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return false;
    }
    return !/[\r\n]/.test(fields.name + fields.email + fields.turnstileToken) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email);
  }
  function requestSession(idFactory = () => crypto.randomUUID()) {
    const keys = ['name', 'email', 'message', 'service', 'quoteSummary', 'consent', 'locale'];
    let fingerprint = '', id = '', snapshot = null, locked = false;
    function prepare(fields) {
      if (locked && id) return id;
      const next = JSON.stringify(keys.map(key => fields[key]));
      if (next !== fingerprint || !id) { id = idFactory(); fingerprint = next; }
      snapshot = Object.fromEntries(keys.map(key => [key, fields[key]]));
      return id;
    }
    return {
      prepare,
      submission(fields, token) {
        const requestId = prepare(fields);
        return { ...snapshot, requestId, turnstileToken: token };
      },
      markUncertain() { if (id && snapshot) locked = true; },
      get locked() { return locked; },
      get snapshot() { return snapshot ? { ...snapshot } : null; },
      clear() { fingerprint = ''; id = ''; snapshot = null; locked = false; }
    };
  }
  function isUncertainResult(result) {
    if (result?.ok === true) return false;
    // Only these failures affirm that this attempt was rejected before delivery.
    // They never release a session which was already uncertain from an older attempt.
    return !new Set(['invalid_payload', 'bot_rejected', 'origin_denied', 'payload_too_large',
      'unsupported_type', 'rate_limited', 'verification_unavailable']).has(result?.code);
  }
  async function sendContact(config, fields, { request = fetch, timeoutMs = 20000 } = {}) {
    if (!workerReady(config)) return { ok: false, code: 'unavailable' };
    if (!validFields(fields)) return { ok: false, code: 'invalid_payload' };
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await request(workerEndpoint(config.endpoint), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(fields), credentials: 'omit', redirect: 'error', cache: 'no-store',
        referrerPolicy: 'no-referrer', signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if ([200, 202].includes(response.status) && data.ok === true && ['accepted', 'already_accepted'].includes(data.code) && data.requestId === fields.requestId) return { ok: true, code: data.code, requestId: data.requestId };
      const known = new Set(['invalid_payload', 'bot_rejected', 'origin_denied', 'request_conflict', 'delivery_uncertain', 'payload_too_large', 'unsupported_type', 'rate_limited', 'unavailable', 'verification_unavailable']);
      return { ok: false, code: known.has(data.code) ? data.code : 'unconfirmed' };
    } catch { return { ok: false, code: controller.signal.aborted ? 'timeout' : 'unconfirmed' }; }
    finally { clearTimeout(timer); }
  }
  let scriptPromise;
  function loadTurnstile(doc = document, browser = window) {
    if (browser.turnstile?.render) return Promise.resolve(browser.turnstile);
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const script = doc.createElement('script');
      script.src = SCRIPT_URL; script.async = true; script.referrerPolicy = 'no-referrer';
      const timeout = setTimeout(() => fail(), 15000);
      function fail() { clearTimeout(timeout); script.remove(); scriptPromise = null; reject(new Error('verification_unavailable')); }
      script.onerror = fail;
      script.onload = () => {
        clearTimeout(timeout);
        if (browser.turnstile?.render) resolve(browser.turnstile); else fail();
      };
      doc.head.append(script);
    });
    return scriptPromise;
  }
  function turnstileController({ config, container, language = () => 'es', onState, doc = document, browser = window }) {
    let api, widgetId, token = '', starting = false, disposed = false;
    function state(value) { if (!disposed) onState(value, token); }
    return {
      get token() { return token; },
      async start() {
        if (starting || disposed || !workerReady(config)) return;
        if (api && widgetId !== undefined) { api.reset(widgetId); token = ''; state('checking'); return; }
        starting = true; state('loading');
        try {
          api = await loadTurnstile(doc, browser);
          if (disposed) return;
          widgetId = api.render(container, {
            sitekey: config.turnstileSiteKey, action: 'commercial_contact', language: language(), theme: 'auto',
            appearance: 'interaction-only', size: container.getBoundingClientRect().width < 300 ? 'compact' : 'flexible',
            callback: value => { token = value; state('verified'); },
            'expired-callback': () => { token = ''; state('expired'); },
            'error-callback': () => { token = ''; state('error'); },
            'timeout-callback': () => { token = ''; state('error'); }
          });
          if (!token) state('checking');
        } catch { token = ''; state('error'); }
        finally { starting = false; }
      },
      reset() { token = ''; if (api && widgetId !== undefined) { api.reset(widgetId); state('checking'); } },
      destroy() { disposed = true; token = ''; if (api && widgetId !== undefined) api.remove(widgetId); }
    };
  }
  const api = { workerEndpoint, publicSiteKey, workerReady, validFields, requestSession, isUncertainResult, sendContact, turnstileController };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ContactClient = api;
})();
