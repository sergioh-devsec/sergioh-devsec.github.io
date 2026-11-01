import { initRoomAxiom } from './room-axiom.js';
import { createNativeFace } from './axiom-3d/native-face.js';
import { createNativeSecondary } from './axiom-3d/native-secondary.js';
import { createRoomVoice } from './room-voice.js';

// A single fixed service endpoint. No keys and no visitor-selected URLs.
export const AI_ENDPOINT = 'https://axiom-services.cyberserch-mx.workers.dev/chat';
const STATION_VOICE = Object.freeze({ axiom:'welcome', workstation:'webTerm', security:'securityTerm',
  comms:'automationTerm', printer:'automationTerm', board:'automationTerm', clock:'automationTerm',
  register:'automationTerm', vault:'securityTerm', library:'aiTerm', showcase:'cvAnswer', coffee:'supportAnswer' });
const TOPIC_VOICE = Object.freeze({ services:'welcome', landing:'webTerm', information:'webTerm', custom:'webTerm', automation:'automationTerm',
  security:'securityTerm', privacy:'securityTerm', localai:'aiTerm', cv:'cvAnswer',
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
  const viewer = initRoomAxiom({ container:$('room-axiom-viewer'), canvas:$('room-axiom-canvas'), fallback:$('room-axiom-fallback'),
    createFace(root) {
      const face = createNativeFace(root), secondary = createNativeSecondary(root);
      let time = 0, previous = performance.now();
      return { apply(pose) {
        const now = performance.now(); const paused = document.documentElement.dataset.motion === 'paused';
        if (!paused) time += Math.min(.08, (now - previous) / 1000); previous = now;
        face.apply(pose); secondary.apply({ time, paused, speaking:pose.jawOpen > .005, level:pose.jawOpen, mood:pose.anger > .4 ? 'angry' : 'neutral' });
      }, reset() { face.reset(); secondary.reset(); }, dispose() { secondary.dispose(); face.dispose(); } };
    } });
  const voice = createRoomVoice({
    onCaption(value) { $('axiom-caption').textContent = value; $('axiom-caption').hidden = false; },
    onState(state) {
      $('axiom-voice').setAttribute('aria-pressed', String(state.enabled));
      $('axiom-voice').textContent = state.enabled ? t('Voz activada · silenciar','Voice on · mute') : t('Escuchar a Axiom','Listen to Axiom');
      $('axiom-voice-status').textContent = state.error ? t('Toca de nuevo para escuchar.','Tap again to listen.') : state.playing ? t('Voz original · español','Original voice · Spanish') : '';
    },
  });
  function speak(key = currentKey) { return voice.play(key, window.TRANSLATIONS?.es?.[key]); }
  $('axiom-voice').addEventListener('click', () => { if (voice.enabled) voice.disable(); else speak(); });
  $('axiom-replay').addEventListener('click', () => speak());
  $('axiom-greet').addEventListener('click', () => { viewer.gesture('wave'); currentKey = 'welcome'; if (voice.enabled) speak(); });
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
        viewer.gesture('agree');
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
    voice.stop(); resetChat();
    for (const [id,pair] of Object.entries(labels)) $(id).textContent = t(...pair);
    $('axiom-chat-input').placeholder = t('Ej. Una web para mi consultorio','e.g. A website for my practice');
    $('axiom-voice').textContent = voice.enabled ? t('Voz activada · silenciar','Voice on · mute') : t('Escuchar a Axiom','Listen to Axiom');
    $('axiom-caption').hidden = true;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) voice.stop(); });
  window.addEventListener('pagehide', event => { voice.stop(); resetChat(); if (!event.persisted) voice.destroy(); });
  render();
  return { viewer, render, setMotion:value=>viewer.setMotion(value),
    station(id) { currentKey = STATION_VOICE[id] || 'welcome'; viewer.gesture(id === 'coffee' ? 'bow' : id === 'axiom' ? 'wave' : 'agree'); if (voice.enabled) speak(); },
    stop() { voice.stop(); } };
}
