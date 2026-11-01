import { getPageVoice, voiceText } from './page-voice.js?v=voice-9';
import { ROOM_VOICES } from './room-voice.js?v=voice-5';

// A single fixed service endpoint. No keys and no visitor-selected URLs.
export const AI_ENDPOINT = 'https://axiom-services.cyberserch-mx.workers.dev/chat';
const STATION_VOICES = Object.freeze({
  axiom: ['welcome', 'welcome2', 'welcome3'],
  workstation: ['webTerm', 'webTerm2', 'businessAnswer2'],
  security: ['securityTerm', 'securityTerm2', 'hardeningTerm'],
  comms: ['automationTerm', 'automationTerm2'], printer: ['automationTerm', 'automationTerm2'],
  board: ['automationTerm2', 'automationTerm'], clock: ['automationTerm', 'automationTerm2'],
  register: ['conversionTerm', 'businessAnswer2'], vault: ['glossMfa', 'glossBackup', 'securityTerm2'],
  library: ['aiTerm', 'aiTerm2', 'glossaryIntro'], showcase: ['webTerm2', 'contentTerm'],
  coffee: ['supportAnswer2', 'supportAnswer3'],
});
const TOPIC_VOICES = Object.freeze({
  services: ['businessAnswer', 'businessAnswer2'], landing: ['webTerm', 'webTerm2'],
  information: ['webTerm2', 'webTerm'], custom: ['webTerm', 'webTerm2'],
  automation: ['automationTerm', 'automationTerm2'], security: ['securityTerm', 'securityTerm2'],
  privacy: ['glossMfa', 'glossBackup'], localai: ['aiTerm', 'aiTerm2'], cv: ['welcome2', 'businessWrap'],
  contact: ['contactAnswer', 'contactAnswer2'], support: ['supportAnswer2', 'supportAnswer3'],
});

/** Variants belong to their real topic, and repeat only after that topic's cycle. */
export function createRoomReactionPicker() {
  const positions = new Map();
  return (kind, id) => {
    const groups = kind === 'station' ? STATION_VOICES : kind === 'topic' ? TOPIC_VOICES : null;
    if (!groups || !Object.hasOwn(groups, id)) return null;
    const variants = groups[id], token = `${kind}:${id}`, next = positions.get(token) || 0;
    positions.set(token, (next + 1) % variants.length);
    return variants[next];
  };
}
const SAFE_HOSTS = new Set(['cyberserch.com','www.patreon.com','www.paypal.com']);
export function safeServiceLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && SAFE_HOSTS.has(url.hostname) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function initRoomAssistant({ language = () => 'es', document: doc = globalThis.document, window: view = globalThis.window, voice = getPageVoice() } = {}) {
  const $ = id => doc.getElementById(id);
  const removers = [], pickReaction = createRoomReactionPicker();
  const listen = (target, type, callback) => { target.addEventListener(type, callback); removers.push(() => target.removeEventListener(type, callback)); };
  const en = () => language() === 'en';
  const t = (es, english) => en() ? english : es;
  let currentKey = 'welcome', currentStation = null, chatEnabled = false, busy = false, history = [], controller, requestId = 0;
  let viewer = null, viewerLoading = false, motionAllowed = true, destroyed = false;
  function viewerLabel() {
    $('axiom-3d-start').textContent = viewer ? t('3D activado','3D enabled') : viewerLoading ? t('Cargando 3D…','Loading 3D…') : t('Ver a Axiom en 3D','View Axiom in 3D');
    $('axiom-3d-start').disabled = viewerLoading || Boolean(viewer);
  }
  // Explicit opt-in: no Three.js, decoder or GLB request before this click.
  listen($('axiom-3d-start'), 'click', async () => {
    if (viewer || viewerLoading || destroyed) return;
    viewerLoading = true; viewerLabel();
    try {
      const [{ initRoomAxiom }, { createNativeFace }, { createNativeSecondary }] = await Promise.all([
        import('./room-axiom.js?v=performance-3'), import('./axiom-3d/native-face.js'), import('./axiom-3d/native-secondary.js'),
      ]);
      if (destroyed) return;
      viewer = initRoomAxiom({ container:$('room-axiom-viewer'), canvas:$('room-axiom-canvas'), fallback:$('room-axiom-fallback'),
        createFace(root) {
          const face = createNativeFace(root), secondary = createNativeSecondary(root);
          let time = 0, previous = performance.now();
          return { apply(pose) {
            const now = performance.now(); const paused = doc.documentElement.dataset.motion === 'paused';
            if (!paused) time += Math.min(.08, (now - previous) / 1000); previous = now;
            face.apply(pose); secondary.apply({ time, paused, speaking:pose.jawOpen > .005, level:pose.jawOpen, mood:pose.anger > .4 ? 'angry' : 'neutral' });
          }, reset() { face.reset(); secondary.reset(); }, dispose() { secondary.dispose(); face.dispose(); } };
        } });
      viewer.setMotion(motionAllowed);
      const ready = await viewer.ready;
      if (destroyed) return;
      if (!ready) { viewer.destroy(); viewer = null; throw new Error('3D unavailable'); }
      if (voice.playing) { const recording = ROOM_VOICES[voice.state.key]; if (recording) { viewer.setMood(recording[2]); viewer.gesture(recording[1]); } }
      $('axiom-3d-status').textContent = t('Listo. Saluda o mueve el cursor.','Ready. Say hello or move your pointer.');
    } catch {
      if (destroyed) return;
      $('axiom-3d-status').textContent = t('La vista ligera sigue disponible. Puedes volver a intentar el 3D.','The lightweight view is still available. You can retry 3D.');
    } finally { viewerLoading = false; if (!destroyed) viewerLabel(); }
  });
  const unsubscribeVoice = voice.subscribe(state => {
    const avatar = $('room-axiom-viewer');
    avatar?.classList.toggle('is-speaking', Boolean(state.playing));
    if (avatar) { avatar.dataset.speaking = String(Boolean(state.playing)); avatar.dataset.voiceMood = state.playing ? (ROOM_VOICES[state.key]?.[2] || 'neutral') : 'calm'; }
    if(state.caption){$('axiom-caption').textContent=state.caption;$('axiom-caption').hidden=false;}
    $('axiom-voice').setAttribute('aria-pressed',String(state.preferred&&!state.error));
    $('axiom-voice').setAttribute('aria-busy',String(state.loading));
    $('axiom-voice').textContent=voiceText(state.loading?'voice_loading':state.error?'voice_retry':state.preferred?'voice_mute':'voice_listen');
    $('axiom-voice-status').textContent=voiceText(state.error?'voice_error':state.loading?'voice_loading':state.playing?'voice_playing':state.preferred?'voice_ready':'voice_off');
  });
  function speak(key = currentKey) { return voice.play(key); }
  listen($('axiom-voice'), 'click', () => { void voice.toggle(currentKey); });
  listen($('axiom-replay'), 'click', () => {
    currentKey = pickReaction('station', currentStation || (doc.documentElement.dataset.mode === 'laboratorio' ? 'library' : 'workstation'));
    void speak();
  });
  listen($('axiom-greet'), 'click', () => { currentKey = en() ? 'welcomeEn' : pickReaction('station', 'axiom'); void speak(); });
  listen($('axiom-story'), 'click', () => { currentKey = 'axiomStoryVoice'; void speak(); });
  function resetChat() {
    chatEnabled = false; busy = false; requestId++; controller?.abort(); history = [];
    $('axiom-chat-form').hidden = true; $('axiom-chat-messages').replaceChildren();
    $('axiom-chat-input').value = ''; $('axiom-chat-send').disabled = false;
    $('axiom-chat-activate').hidden = false; $('axiom-chat-stop').hidden = true;
    $('axiom-chat-status').textContent = '';
  }
  function message(role, value) {
    const p = doc.createElement('p'); p.className = `room-chat-message ${role}`;
    p.textContent = value; $('axiom-chat-messages').append(p);
    while ($('axiom-chat-messages').children.length > 8) $('axiom-chat-messages').firstElementChild.remove();
    p.scrollIntoView({ block:'nearest', behavior:'auto' });
  }
  listen($('axiom-chat-activate'), 'click', () => {
    chatEnabled = true; $('axiom-chat-form').hidden = false; $('axiom-chat-activate').hidden = true;
    $('axiom-chat-stop').hidden = false; $('axiom-chat-input').focus();
  });
  listen($('axiom-chat-stop'), 'click', resetChat);
  listen($('axiom-chat-form'), 'submit', async event => {
    event.preventDefault(); if (!chatEnabled || busy) return;
    const input = $('axiom-chat-input'), value = input.value.trim(); if (!value || value.length > 1200) return;
    busy = true; const revision = ++requestId; controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    $('axiom-chat-send').disabled = true; input.value = ''; voice.stop();
    message('user', value); $('axiom-chat-status').textContent = t('Buscando la solución adecuada…','Finding the right solution…');
    try {
      const response = await fetch(AI_ENDPOINT, { method:'POST', credentials:'omit', referrerPolicy:'no-referrer', cache:'no-store',
        headers:{'Content-Type':'application/json'}, signal:controller.signal,
        body:JSON.stringify({ message:value, language:language(), history:history.slice(-4) }) });
      const result = await response.json(); if (revision !== requestId || !chatEnabled) return;
      if (typeof result.answer !== 'string' || result.answer.length > 4000) throw new Error('Invalid response');
      message('assistant', result.answer);
      for (const item of Array.isArray(result.links) ? result.links.slice(0,3) : []) {
        const url = safeServiceLink(item.url); if (!url || typeof item.label !== 'string') continue;
        const a = doc.createElement('a'); a.href = url; a.textContent = item.label.slice(0,90); a.className = 'room-chat-link';
        if (new URL(url).origin !== location.origin) { a.target='_blank'; a.rel='noopener noreferrer'; }
        $('axiom-chat-messages').append(a);
      }
      if (response.ok) {
        history.push({ role:'user', content:value.slice(0,600) }); history = history.slice(-4);
        const key = pickReaction('topic', result.topic); if (key) { currentKey = key; if (voice.enabled) void voice.cue(key, { priority: 3 }); }
        if (!voice.enabled) viewer?.gesture('agree');
      }
      $('axiom-chat-status').textContent = response.status === 429 ? t('Espera un minuto antes de preguntar de nuevo.','Wait a minute before asking again.') : t('Orientación sobre nuestros servicios.','Guidance about our services.');
    } catch {
      if (revision === requestId && chatEnabled) $('axiom-chat-status').textContent = t('No pude conectar. Puedes usar las estaciones o el cotizador.','Could not connect. You can use the stations or the estimator.');
    } finally {
      clearTimeout(timeout); if (revision === requestId) { busy = false; $('axiom-chat-send').disabled = false; }
    }
  });
  const labels = {
    'axiom-greet':['Saludar','Say hello'],
    'axiom-story':['Escucha mi historia','Hear my story'], 'axiom-chat-heading':['Pregúntame por una solución','Ask about a solution'],
    'axiom-chat-notice':['Solo servicios CyberSerch. Al activarlo, tus preguntas se procesan en Cloudflare. No incluyas datos personales ni documentos.','CyberSerch services only. When enabled, your questions are processed by Cloudflare. Do not include personal data or documents.'],
    'axiom-chat-activate':['Activar preguntas con IA','Enable AI questions'], 'axiom-chat-stop':['Desactivar y limpiar','Disable and clear'],
    'axiom-chat-label':['¿Qué necesitas resolver?','What do you need help with?'], 'axiom-chat-send':['Preguntar','Ask'],
  };
  function render() {
    resetChat();
    $('axiom-replay').textContent = voiceText('voice_recommend');
    for (const [id,pair] of Object.entries(labels)) $(id).textContent = t(...pair);
    $('axiom-chat-input').placeholder = t('Ej. Una web para mi consultorio','e.g. A website for my practice');
    voice.refresh();
    viewerLabel();
    if (!viewer) $('axiom-3d-status').textContent = t('La voz funciona sin descargar el 3D.','Voice works without downloading 3D.');
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true; requestId++; controller?.abort(); unsubscribeVoice();
    for (const remove of removers.splice(0)) remove();
    viewer?.destroy(); viewer = null; voice.destroy();
    const avatar = $('room-axiom-viewer');
    avatar?.classList.remove('is-speaking'); if (avatar) avatar.dataset.speaking = 'false';
  }
  listen(doc, 'visibilitychange', () => { if (doc.hidden) voice.stop(); });
  listen(view, 'pagehide', event => { voice.stop(); resetChat(); if (!event.persisted) destroy(); });
  render();
  if(voice.preferred)void voice.cue(currentKey);
  return { get viewer() { return viewer; }, render, setMotion(value) { motionAllowed = value; viewer?.setMotion(value); },
    station(id) {
      const key = pickReaction('station', id); if (destroyed || !key) return;
      currentStation = id; currentKey = key;
      if (voice.enabled) void voice.cue(key, { priority: 3 });
      else viewer?.gesture(id === 'coffee' ? 'bow' : id === 'axiom' ? 'wave' : 'agree');
    },
    stop() { voice.stop(); }, destroy };
}
