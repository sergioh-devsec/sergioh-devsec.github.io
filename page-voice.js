import { createRoomVoice, ROOM_VOICES } from './room-voice.js?v=voice-5';
import { mountAxiomPresence } from './axiom-presence.js?v=living-9';

export const VOICE_PREFERENCE = 'cyberserch-voice-session-v1';
export const VOICE_REACTIONS = Object.freeze({
  greeting: ['welcome2', 'welcome3', 'welcome'],
  business: ['businessAnswer', 'businessAnswer2'],
  web: ['webTerm', 'webTerm2'],
  automation: ['automationTerm', 'automationTerm2', 'glossAutomation'],
  security: ['securityTerm', 'securityTerm2'],
  content: ['creatorAnswer', 'creatorAnswer2', 'contentTerm'],
  lab: ['labAnswer', 'labAnswer2'],
  support: ['supportAnswer2', 'supportAnswer3', 'supportAnswer'],
  thanks: ['thanks', 'thanks2'],
  finish: ['businessWrap'],
});
function readPreference() { try { return sessionStorage.getItem(VOICE_PREFERENCE) === 'on'; } catch { return false; } }
function writePreference(value) { try { sessionStorage.setItem(VOICE_PREFERENCE, value ? 'on' : 'off'); } catch { /* Voice still works in this view. */ } }
export function voiceText(key, values = {}, language = globalThis.document?.documentElement?.lang) {
  const lang = String(language).startsWith('en') ? 'en' : 'es';
  const dictionaries = globalThis.window?.TRANSLATIONS || {};
  return String(dictionaries[lang]?.[key] ?? dictionaries.es?.[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

/** One original-recording player, with one fresh contextual response at most. */
export function createVoiceHub({ createPlayer = createRoomVoice, read = readPreference, write = writePreference,
  captionFor = key => globalThis.window?.TRANSLATIONS?.es?.[key] || '', document: doc = globalThis.document,
  now = Date.now, schedule = setTimeout, cancel = clearTimeout } = {}) {
  const listeners = new Set(), lastPlayed = new Map(), reactionPositions = new Map();
  let preferred = Boolean(read()), currentKey = 'welcome2', destroyed = false, gestureRetryUsed = false;
  let pending = null, pendingTimer = null, starting = false, stopping = false;
  let snapshot = { preferred, enabled: false, playing: false, loading: false, error: false, caption: '', key: currentKey };
  function clearPending() { pending = null; if (pendingTimer !== null) cancel(pendingTimer); pendingTimer = null; }
  function drain() {
    pendingTimer = null;
    if (!pending || destroyed || !preferred || doc?.hidden || snapshot.error || snapshot.playing || snapshot.loading) return;
    const next = pending; pending = null;
    if (next.expires <= now()) { publish({}); return; }
    if (lastPlayed.has(next.key) && now() - lastPlayed.get(next.key) < next.cooldown) { publish({}); return; }
    void start(next.key, false);
  }
  function publish(patch) {
    const wasBusy = snapshot.playing || snapshot.loading;
    snapshot = { ...snapshot, ...patch, preferred, key: currentKey };
    for (const listener of listeners) listener({ ...snapshot, pendingKey: pending?.key || null });
    if (patch.error) clearPending();
    // A real clip finishes before the newest useful response begins. No list,
    // infinite queue or pointer movement can interrupt the current sentence.
    if (wasBusy && !snapshot.playing && !snapshot.loading && !snapshot.error && !starting && !stopping && pending && preferred && !doc?.hidden) {
      if (pendingTimer !== null) cancel(pendingTimer);
      pendingTimer = schedule(drain, 450);
    }
  }
  const player = createPlayer({
    onState: state => publish(state),
    onCaption: caption => publish({ caption }),
  });
  function start(key, manual) {
    if (destroyed || !Object.hasOwn(ROOM_VOICES, key) || (!manual && !preferred)) return Promise.resolve(false);
    currentKey = key;
    if (manual) { preferred = true; write(true); }
    lastPlayed.set(key, now());
    starting = true;
    try {
      // Keep play() in the original trusted click stack. Web Audio is optional.
      return Promise.resolve(player.play(key, captionFor(key)));
    } finally { starting = false; }
  }
  function play(key = currentKey, { manual = true } = {}) {
    if (destroyed || !Object.hasOwn(ROOM_VOICES, key) || (!manual && !preferred)) return Promise.resolve(false);
    clearPending(); return start(key, manual);
  }
  function cue(key, { priority = 2, maxAge = 15000, cooldown = 12000 } = {}) {
    if (destroyed || !preferred || doc?.hidden || !Object.hasOwn(ROOM_VOICES, key)) return Promise.resolve(false);
    cooldown = Number.isFinite(cooldown) ? Math.max(0, Math.min(120000, cooldown)) : 12000;
    priority = Number.isFinite(priority) ? Math.max(0, Math.min(5, priority)) : 2;
    maxAge = Number.isFinite(maxAge) ? Math.max(0, Math.min(30000, maxAge)) : 15000;
    if (lastPlayed.has(key) && now() - lastPlayed.get(key) < cooldown) return Promise.resolve(false);
    if (snapshot.playing || snapshot.loading || pendingTimer !== null) {
      if (key === currentKey || priority === 0 || (pending && pending.priority > priority)) return Promise.resolve(false);
      pending = { key, priority, expires: now() + maxAge, cooldown }; publish({});
      return Promise.resolve(true);
    }
    return start(key, false);
  }
  function react(topic, options = {}) {
    if (destroyed || !preferred || doc?.hidden) return Promise.resolve(false);
    if (Object.hasOwn(ROOM_VOICES, topic)) return cue(topic, options);
    if (!Object.hasOwn(VOICE_REACTIONS, topic)) return Promise.resolve(false);
    const keys = VOICE_REACTIONS[topic], position = reactionPositions.get(topic) || 0;
    const cooldown = Number.isFinite(options.cooldown) ? Math.max(0, options.cooldown) : 12000;
    for (let i = 0; i < keys.length; i++) {
      const index = (position + i) % keys.length, key = keys[index];
      if ((lastPlayed.has(key) && now() - lastPlayed.get(key) < cooldown) || pending?.key === key) continue;
      reactionPositions.set(topic, (index + 1) % keys.length);
      return cue(key, options);
    }
    return Promise.resolve(false);
  }
  function stop() { clearPending(); stopping = true; try { player.stop(); } finally { stopping = false; } }
  function disable() { preferred = false; write(false); clearPending(); player.disable(); publish({ preferred: false }); }
  const hub = {
    play, cue, react,
    toggle(key = currentKey) { return preferred && !snapshot.error ? (disable(), Promise.resolve(false)) : play(key); },
    disable, stop,
    subscribe(listener) { listeners.add(listener); listener({ ...snapshot, pendingKey: pending?.key || null }); return () => listeners.delete(listener); },
    refresh() { publish({}); },
    get enabled() { return preferred && !snapshot.error; },
    get preferred() { return preferred; },
    get playing() { return snapshot.playing; },
    get loading() { return snapshot.loading; },
    get state() { return { ...snapshot, pendingKey: pending?.key || null }; },
    destroy() {
      if (destroyed) return; destroyed = true; clearPending();
      doc?.removeEventListener('portfolio:language', changedLanguage); doc?.removeEventListener('visibilitychange', visibility);
      doc?.removeEventListener('pointerup', resumeFromGesture, true); doc?.removeEventListener('keydown', resumeFromGesture, true);
      player.destroy(); listeners.clear();
    },
  };
  const changedLanguage = () => hub.refresh();
  const visibility = () => { if (doc.hidden) hub.stop(); };
  const resumeFromGesture = event => {
    if (destroyed || gestureRetryUsed || !event.isTrusted || !preferred || !snapshot.error || snapshot.loading) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    if (event.target?.closest?.('#page-voice-control,.axiom-inline-voice,#axiom-voice,#axiom-replay,#axiom-greet,#axiom-story,#quote-guide-voice')) return;
    gestureRetryUsed = true; void play(currentKey, { manual: false });
  };
  doc?.addEventListener('portfolio:language', changedLanguage);
  doc?.addEventListener('visibilitychange', visibility);
  doc?.addEventListener('pointerup', resumeFromGesture, true);
  doc?.addEventListener('keydown', resumeFromGesture, true);
  return hub;
}

let singleton;
export function getPageVoice() { return singleton ||= createVoiceHub(); }

/** Native dialogs need their own accessible mute control. */
export function bindVoiceButton(button, { hub = getPageVoice(), key = 'welcome2' } = {}) {
  const update = state => {
    button.textContent = voiceText(state.loading ? 'voice_loading' : state.error ? 'voice_retry' : state.preferred ? 'voice_mute' : 'voice_listen');
    button.setAttribute('aria-pressed', String(state.preferred && !state.error));
    button.setAttribute('aria-busy', String(state.loading));
  };
  const listener = () => { void hub.toggle(typeof key === 'function' ? key() : key); };
  button.addEventListener('click', listener);
  const unsubscribe = hub.subscribe(update);
  return () => { unsubscribe(); button.removeEventListener('click', listener); };
}

export function mountPageVoice({ initialKey = 'welcome2', document: doc = globalThis.document } = {}) {
  const hub = getPageVoice();
  if (doc.getElementById('page-voice-control')) return hub;
  const make = (tag, cls = '') => { const node = doc.createElement(tag); node.className = cls; return node; };
  const panel = make('aside', 'page-voice-control'); panel.id = 'page-voice-control';
  const actions = make('div', 'page-voice-actions');
  const avatar = make('button', 'page-voice-avatar'); avatar.type = 'button';
  const face = make('img'); face.src = new URL('./assets/axiom/img/axiom.webp', import.meta.url).href;
  face.alt = ''; face.width = 56; face.height = 64; face.draggable = false;
  const name = make('span'); name.textContent = 'AXIOM'; avatar.append(face, name);
  const toggle = make('button', 'page-voice-toggle'); toggle.type = 'button'; toggle.id = 'page-voice-toggle';
  const state = make('span', 'page-voice-state'); state.setAttribute('role', 'status'); state.setAttribute('aria-live', 'polite');
  const bubble = make('p', 'page-voice-bubble'); bubble.id = 'page-voice-caption';
  bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite'); bubble.setAttribute('aria-atomic', 'true'); bubble.hidden = true;
  actions.append(avatar, toggle); panel.append(bubble, actions, state); doc.body.append(panel);
  bindVoiceButton(toggle, { hub, key: initialKey });
  avatar.addEventListener('click', () => { if (!hub.preferred || hub.state.error) void hub.play(initialKey); else void hub.react('greeting', { priority: 1 }); });
  hub.subscribe(value => {
    panel.setAttribute('aria-label', voiceText('voice_label'));
    panel.classList.toggle('is-speaking', value.playing); panel.classList.toggle('is-awake', value.preferred);
    panel.classList.toggle('has-error', value.error);
    avatar.setAttribute('aria-label', voiceText('voice_greet')); avatar.title = voiceText('voice_greet');
    bubble.textContent = value.caption; bubble.hidden = !value.playing || !value.caption;
    state.textContent = value.error ? voiceText('voice_error') : '';
  });
  for (const dialog of doc.querySelectorAll('dialog')) {
    if (dialog.id === 'reciprocity-delivery' || dialog.dataset.axiomVoiceBound) continue;
    const control = make('button', 'axiom-inline-voice'); control.type = 'button';
    dialog.insertBefore(control, dialog.firstChild); dialog.dataset.axiomVoiceBound = 'true';
    bindVoiceButton(control, { hub, key: () => dialog.dataset.voiceKey || initialKey });
  }
  mountAxiomPresence({ hub, document: doc });
  if (hub.preferred) void hub.cue(initialKey);
  return hub;
}
