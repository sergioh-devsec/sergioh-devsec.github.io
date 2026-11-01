import { createRoomVoice, ROOM_VOICES } from './room-voice.js?v=voice-5';

export const VOICE_PREFERENCE = 'cyberserch-voice-session-v1';
function readPreference() { try { return sessionStorage.getItem(VOICE_PREFERENCE) === 'on'; } catch { return false; } }
function writePreference(value) { try { sessionStorage.setItem(VOICE_PREFERENCE, value ? 'on' : 'off'); } catch { /* Voice still works in this view. */ } }
export function voiceText(key, values = {}, language = globalThis.document?.documentElement?.lang) {
  const lang = String(language).startsWith('en') ? 'en' : 'es';
  const dictionaries = globalThis.window?.TRANSLATIONS || {};
  return String(dictionaries[lang]?.[key] ?? dictionaries.es?.[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

/** One original-recording player per document. The preference is not an autoplay permission. */
export function createVoiceHub({ createPlayer = createRoomVoice, read = readPreference, write = writePreference,
  captionFor = key => globalThis.window?.TRANSLATIONS?.es?.[key] || '', document: doc = globalThis.document } = {}) {
  const listeners = new Set();
  let preferred = Boolean(read()), currentKey = 'welcome2', destroyed = false, gestureRetryUsed = false;
  let snapshot = { preferred, enabled: false, playing: false, loading: false, error: false, caption: '', key: currentKey };
  const publish = patch => {
    snapshot = { ...snapshot, ...patch, preferred, key: currentKey };
    for (const listener of listeners) listener({ ...snapshot });
  };
  const player = createPlayer({
    onState: state => publish(state),
    onCaption: caption => publish({ caption }),
  });
  function play(key = currentKey, { manual = true } = {}) {
    if (destroyed || !Object.hasOwn(ROOM_VOICES, key) || (!manual && !preferred)) return Promise.resolve(false);
    currentKey = key;
    if (manual) { preferred = true; write(true); }
    // Do not await a module, permission, AudioContext or network call before play().
    return player.play(key, captionFor(key));
  }
  function disable() { preferred = false; write(false); player.disable(); publish({ preferred: false }); }
  const hub = {
    play,
    cue(key) { return play(key, { manual: false }); },
    toggle(key = currentKey) { return preferred && !snapshot.error ? (disable(), Promise.resolve(false)) : play(key); },
    disable,
    stop() { player.stop(); },
    subscribe(listener) { listeners.add(listener); listener({ ...snapshot }); return () => listeners.delete(listener); },
    refresh() { publish({}); },
    get enabled() { return preferred && !snapshot.error; },
    get preferred() { return preferred; },
    get playing() { return snapshot.playing; },
    get loading() { return snapshot.loading; },
    get state() { return { ...snapshot }; },
    destroy() { if (destroyed) return; destroyed = true; doc?.removeEventListener('portfolio:language',changedLanguage);doc?.removeEventListener('visibilitychange',visibility);doc?.removeEventListener('pointerup',resumeFromGesture,true);doc?.removeEventListener('keydown',resumeFromGesture,true);player.destroy(); listeners.clear(); },
  };
  const changedLanguage = () => hub.refresh();
  const visibility = () => { if (doc.hidden) hub.stop(); };
  const resumeFromGesture = event => {
    if(destroyed||gestureRetryUsed||!event.isTrusted||!preferred||!snapshot.error||snapshot.loading)return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    if(event.target?.closest?.('#page-voice-control,.axiom-inline-voice,#axiom-voice,#axiom-replay,#axiom-greet,#axiom-story,#quote-guide-voice'))return;
    gestureRetryUsed=true;void play(currentKey,{manual:false});
  };
  doc?.addEventListener('portfolio:language', changedLanguage);
  doc?.addEventListener('visibilitychange', visibility);
  doc?.addEventListener('pointerup',resumeFromGesture,true);
  doc?.addEventListener('keydown',resumeFromGesture,true);
  return hub;
}

let singleton;
export function getPageVoice() { return singleton ||= createVoiceHub(); }

/** Use inside a native dialog too: outside floating controls are inert while a dialog is open. */
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
  const toggle = make('button', 'page-voice-toggle'); toggle.type = 'button'; toggle.id = 'page-voice-toggle';
  const repeat = make('button', 'page-voice-repeat'); repeat.type = 'button'; repeat.id = 'page-voice-repeat';
  const state = make('span', 'page-voice-state'); state.setAttribute('role', 'status'); state.setAttribute('aria-live', 'polite');
  const captions = make('details', 'page-voice-captions');
  const summary = make('summary'); const caption = make('p'); captions.append(summary, caption);
  actions.append(toggle, repeat); panel.append(actions, state, captions); doc.body.append(panel);
  bindVoiceButton(toggle, { hub, key: initialKey });
  repeat.addEventListener('click', () => { void hub.play(initialKey); });
  hub.subscribe(value => {
    panel.setAttribute('aria-label', voiceText('voice_label'));
    repeat.textContent = voiceText('voice_repeat'); summary.textContent = voiceText('voice_caption');
    caption.textContent = value.caption;
    captions.hidden = !value.caption;
    state.textContent = voiceText(value.error ? 'voice_error' : value.loading ? 'voice_loading' : value.playing ? 'voice_playing' : value.preferred ? 'voice_ready' : 'voice_off');
  });
  for(const dialog of doc.querySelectorAll('dialog')) {
    if(dialog.id==='reciprocity-delivery'||dialog.dataset.axiomVoiceBound)continue;
    const control=make('button','axiom-inline-voice');control.type='button';
    dialog.insertBefore(control,dialog.firstChild);dialog.dataset.axiomVoiceBound='true';
    bindVoiceButton(control,{hub,key:()=>dialog.dataset.voiceKey||initialKey});
  }
  if (hub.preferred) void hub.cue(initialKey);
  return hub;
}
