import { getPageVoice, voiceText } from './page-voice.js?v=voice-5';

// A single fixed service endpoint. No keys and no visitor-selected URLs.
export const AI_ENDPOINT = 'https://axiom-services.cyberserch-mx.workers.dev/chat';
const STATION_VOICE = Object.freeze({ axiom:'welcome', workstation:'webTerm', security:'securityTerm',
  comms:'automationTerm', printer:'automationTerm', board:'automationTerm', clock:'automationTerm',
  register:'automationTerm', vault:'securityTerm', library:'aiTerm', showcase:'welcome2', coffee:'supportAnswer2' });
const TOPIC_VOICE = Object.freeze({ services:'welcome', landing:'webTerm', information:'webTerm', custom:'webTerm', automation:'automationTerm',
  security:'securityTerm', privacy:'securityTerm', localai:'aiTerm', cv:'welcome2',
  contact:'contactAnswer', support:'supportAnswer' });
const SAFE_HOSTS = new Set(['cyberserch.com','www.patreon.com','www.paypal.com']);
export function safeServiceLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && SAFE_HOSTS.has(url.hostname) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function initRoomAssistant({ language = () => 'es' } = {}) {
  const $ = id => document.getElementById(id);
  const en = () => language() === 'en';
  const t = (es, english) => en() ? english : es;
  let currentKey = 'welcome', chatEnabled = false, busy = false, history = [], controller, requestId = 0;
  let viewer = null, viewerLoading = false, motionAllowed = true, destroyed = false;
  function viewerLabel() {
    $('axiom-3d-start').textContent = viewer ? t('3D activado','3D enabled') : viewerLoading ? t('Cargando 3D…','Loading 3D…') : t('Ver a Axiom en 3D','View Axiom in 3D');
    $('axiom-3d-start').disabled = viewerLoading || Boolean(viewer);
  }
  // Explicit opt-in: no Three.js, decoder or GLB request before this click.
  $('axiom-3d-start').addEventListener('click', async () => {
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
            const now = performance.now(); const paused = document.documentElement.dataset.motion === 'paused';
            if (!paused) time += Math.min(.08, (now - previous) / 1000); previous = now;
            face.apply(pose); secondary.apply({ time, paused, speaking:pose.jawOpen > .005, level:pose.jawOpen, mood:pose.anger > .4 ? 'angry' : 'neutral' });
          }, reset() { face.reset(); secondary.reset(); }, dispose() { secondary.dispose(); face.dispose(); } };
        } });
      viewer.setMotion(motionAllowed);
      if (!await viewer.ready) { viewer.destroy(); viewer = null; throw new Error('3D unavailable'); }
      $('axiom-3d-status').textContent = t('Listo. Saluda o mueve el cursor.','Ready. Say hello or move your pointer.');
    } catch {
      $('axiom-3d-status').textContent = t('La vista ligera sigue disponible. Puedes volver a intentar el 3D.','The lightweight view is still available. You can retry 3D.');
    } finally { viewerLoading = false; if (!destroyed) viewerLabel(); }
  });
  const voice = getPageVoice();
  voice.subscribe(state => {
    if(state.caption){$('axiom-caption').textContent=state.caption;$('axiom-caption').hidden=false;}
    $('axiom-voice').setAttribute('aria-pressed',String(state.preferred&&!state.error));
    $('axiom-voice').setAttribute('aria-busy',String(state.loading));
    $('axiom-voice').textContent=voiceText(state.loading?'voice_loading':state.error?'voice_retry':state.preferred?'voice_mute':'voice_listen');
    $('axiom-voice-status').textContent=voiceText(state.error?'voice_error':state.loading?'voice_loading':state.playing?'voice_playing':state.preferred?'voice_ready':'voice_off');
  });
  function speak(key = currentKey) { return voice.play(key); }
  $('axiom-voice').addEventListener('click', () => { void voice.toggle(currentKey); });
  $('axiom-replay').addEventListener('click', () => speak());
  $('axiom-greet').addEventListener('click', () => { viewer?.gesture('wave'); currentKey = 'welcome'; speak(); });
  $('axiom-story').addEventListener('click', () => { currentKey = 'axiomStoryVoice'; speak(); });
  function resetChat() {
    chatEnabled = false; busy = false; requestId++; controller?.abort(); history = [];
    $('axiom-chat-form').hidden = true; $('axiom-chat-messages').replaceChildren();
    $('axiom-chat-input').value = ''; $('axiom-chat-send').disabled = false;
    $('axiom-chat-activate').hidden = false; $('axiom-chat-stop').hidden = true;
    $('axiom-chat-status').textContent = '';
  }
  function message(role, value) {
    const p = document.createElement('p'); p.className = `room-chat-message ${role}`;
    p.textContent = value; $('axiom-chat-messages').append(p);
    while ($('axiom-chat-messages').children.length > 8) $('axiom-chat-messages').firstElementChild.remove();
    p.scrollIntoView({ block:'nearest', behavior:'auto' });
  }
  $('axiom-chat-activate').addEventListener('click', () => {
    chatEnabled = true; $('axiom-chat-form').hidden = false; $('axiom-chat-activate').hidden = true;
    $('axiom-chat-stop').hidden = false; $('axiom-chat-input').focus();
  });
  $('axiom-chat-stop').addEventListener('click', resetChat);
  $('axiom-chat-form').addEventListener('submit', async event => {
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
        const a = document.createElement('a'); a.href = url; a.textContent = item.label.slice(0,90); a.className = 'room-chat-link';
        if (new URL(url).origin !== location.origin) { a.target='_blank'; a.rel='noopener noreferrer'; }
        $('axiom-chat-messages').append(a);
      }
      if (response.ok) {
        history.push({ role:'user', content:value.slice(0,600) }); history = history.slice(-4);
        const key = TOPIC_VOICE[result.topic]; if (key) { currentKey = key; if (voice.enabled) speak(key); }
        viewer?.gesture('agree');
      }
      $('axiom-chat-status').textContent = response.status === 429 ? t('Espera un minuto antes de preguntar de nuevo.','Wait a minute before asking again.') : t('Orientación sobre nuestros servicios.','Guidance about our services.');
    } catch {
      if (revision === requestId && chatEnabled) $('axiom-chat-status').textContent = t('No pude conectar. Puedes usar las estaciones o el cotizador.','Could not connect. You can use the stations or the estimator.');
    } finally {
      clearTimeout(timeout); if (revision === requestId) { busy = false; $('axiom-chat-send').disabled = false; }
    }
  });
  const labels = {
    'axiom-replay':['Repetir explicación','Replay explanation'], 'axiom-greet':['Saludar','Say hello'],
    'axiom-story':['Escucha mi historia','Hear my story'], 'axiom-chat-heading':['Pregúntame por una solución','Ask about a solution'],
    'axiom-chat-notice':['Solo servicios CyberSerch. Al activarlo, tus preguntas se procesan en Cloudflare. No incluyas datos personales ni documentos.','CyberSerch services only. When enabled, your questions are processed by Cloudflare. Do not include personal data or documents.'],
    'axiom-chat-activate':['Activar preguntas con IA','Enable AI questions'], 'axiom-chat-stop':['Desactivar y limpiar','Disable and clear'],
    'axiom-chat-label':['¿Qué necesitas resolver?','What do you need help with?'], 'axiom-chat-send':['Preguntar','Ask'],
  };
  function render() {
    resetChat();
    for (const [id,pair] of Object.entries(labels)) $(id).textContent = t(...pair);
    $('axiom-chat-input').placeholder = t('Ej. Una web para mi consultorio','e.g. A website for my practice');
    voice.refresh();
    viewerLabel();
    if (!viewer) $('axiom-3d-status').textContent = t('La voz funciona sin descargar el 3D.','Voice works without downloading 3D.');
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) voice.stop(); });
  window.addEventListener('pagehide', event => { voice.stop(); resetChat(); if (!event.persisted) { destroyed = true; voice.destroy(); } });
  render();
  if(voice.preferred)void voice.cue(currentKey);
  return { get viewer() { return viewer; }, render, setMotion(value) { motionAllowed = value; viewer?.setMotion(value); },
    station(id) { currentKey = STATION_VOICE[id] || 'welcome'; viewer?.gesture(id === 'coffee' ? 'bow' : id === 'axiom' ? 'wave' : 'agree'); if (voice.enabled) speak(); },
    stop() { voice.stop(); } };
}
