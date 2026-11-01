/* A separate, opt-in request. Patient names, clinical fields and hashes never leave the browser. */
export function validWaitlist(fields) {
  return Boolean(fields && fields.consent === true && !fields.botcheck && typeof fields.email === 'string'
    && fields.email === fields.email.trim() && fields.email.length <= 180
    && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(fields.email));
}

export async function sendProWaitlist(key, fields, { request = globalThis.fetch, signal, subject, message, timeoutMs = 15000 } = {}) {
  if (typeof key !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key)
    || !validWaitlist(fields) || typeof request !== 'function' || typeof subject !== 'string' || !subject || subject.length > 160
    || typeof message !== 'string' || !message || message.length > 500 || !Number.isFinite(timeoutMs) || timeoutMs <= 0 || signal?.aborted) return 'invalid';
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, Math.min(Math.max(timeoutMs, 1), 20000));
  try {
    const response = await request('https://api.web3forms.com/submit', {
      method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ access_key: key, email: fields.email, subject, message,
        consent: 'yes', botcheck: false, from_name: 'CyberSerch' }),
    });
    if (controller.signal.aborted) return 'cancelled';
    if (!response?.ok) return response?.status === 429 ? 'limit' : 'error';
    const body = await response.json();
    if (controller.signal.aborted) return 'cancelled';
    return body?.success === true ? 'accepted' : 'error';
  } catch { return controller.signal.aborted ? 'cancelled' : 'error'; }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

export function mountProWaitlist({ parent, translate, getKey, track = () => {} }) {
  const doc = parent.ownerDocument;
  const make = (tag, key, cls = '') => {
    const element = doc.createElement(tag); element.className = cls;
    if (key) { element.dataset.i18n = key; element.textContent = translate(key); }
    return element;
  };
  const section = make('section', null, 'pro-waitlist'); section.hidden = true;
  section.id = 'consent-pro-waitlist'; section.setAttribute('data-clarity-mask', 'true');
  const title = make('h3', 'recip_waitlistTitle'); title.tabIndex = -1;
  section.append(title, make('p', 'recip_waitlistCopy'));
  const form = make('form'); form.noValidate = true;
  const emailLabel = make('label', 'recip_waitlistEmail'); emailLabel.htmlFor = 'pro-waitlist-email';
  const email = make('input'); email.type = 'email'; email.id = emailLabel.htmlFor;
  email.name = 'email'; email.autocomplete = 'email'; email.maxLength = 180; email.required = true;
  const honeyLabel = make('label', null, 'waitlist-honeypot'); honeyLabel.htmlFor = 'pro-waitlist-website'; honeyLabel.setAttribute('aria-hidden', 'true');
  const honey = make('input'); honey.id = honeyLabel.htmlFor; honey.name = 'botcheck'; honey.tabIndex = -1; honey.autocomplete = 'off'; honeyLabel.append(honey);
  const consentLabel = make('label', null, 'waitlist-consent'); consentLabel.htmlFor = 'pro-waitlist-consent';
  const consent = make('input'); consent.id = consentLabel.htmlFor; consent.type = 'checkbox'; consent.required = true;
  consentLabel.append(consent, make('span', 'recip_waitlistConsent'));
  const policy = make('a', 'recip_waitlistProvider'); policy.href = 'https://web3forms.com/privacy'; policy.target = '_blank'; policy.rel = 'noopener noreferrer';
  const submit = make('button', 'recip_waitlistSubmit', 'button primary'); submit.type = 'submit';
  const status = make('p'); status.id = 'pro-waitlist-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  form.append(emailLabel, email, honeyLabel, consentLabel, make('p', 'recip_waitlistPrivacy', 'small'), policy, submit, status);
  section.append(form); parent.append(section);
  let disposed = false, busy = false, sent = false, requestController;
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (disposed || busy || sent) return;
    const fields = { email: email.value.trim(), consent: consent.checked, botcheck: Boolean(honey.value) };
    if (!form.checkValidity() || !validWaitlist(fields)) { status.textContent = translate('recip_waitlistInvalid'); form.reportValidity(); return; }
    busy = true; submit.disabled = true; requestController = new AbortController();
    status.textContent = translate('recip_waitlistSending');
    const result = await sendProWaitlist(getKey(), fields, { signal: requestController.signal,
      subject: translate('recip_waitlistSubject'), message: translate('recip_waitlistMessage') });
    if (disposed || !section.isConnected) return;
    busy = false;
    if (result === 'accepted') {
      sent = true; form.reset(); email.disabled = true; consent.disabled = true;
      status.textContent = translate('recip_waitlistSuccess'); track('pro_waitlist_sent');
    } else { submit.disabled = false; status.textContent = translate(result === 'limit' ? 'recip_waitlistLimit' : 'recip_waitlistError'); }
  });
  return {
    show({ focus = true } = {}) { if (!disposed) { section.hidden = false; if (focus) title.focus(); } },
    hide() { if (!disposed) section.hidden = true; },
    destroy() { disposed = true; requestController?.abort(); form.reset(); section.remove(); },
  };
}
