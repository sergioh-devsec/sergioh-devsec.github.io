// Original approved recordings only. No microphone, voice cloning or remote TTS.
export const ROOM_VOICES = Object.freeze({
  welcome: ['10_saludo_serch.mp3', 'wave', 'happy'],
  webTerm: ['12_web.mp3', 'agree', 'happy'],
  automationTerm: ['13_automatizacion.mp3', 'agree', 'neutral'],
  securityTerm: ['15_seguridad.mp3', 'foldArms', 'calm'],
  aiTerm: ['14_ia_local.mp3', 'wave', 'happy'],
  cvAnswer: ['16_perfil.mp3', 'agree', 'neutral'],
  contactAnswer: ['17_revision.mp3', 'agree', 'calm'],
  supportAnswer: ['26_apoyo_serch.mp3', 'bow', 'happy'],
  who: ['11_quien_serch.mp3', 'wave', 'happy'],
  axiomStoryVoice: ['83_concepto.mp3', 'wave', 'happy'],
});

export function voiceLevel(samples) {
  if (!samples?.length) return 0;
  let sum = 0;
  for (const value of samples) sum += ((value - 128) / 128) ** 2;
  return Math.min(1, Math.sqrt(sum / samples.length) * 5);
}

export function createRoomVoice({ onCaption = () => {}, onState = () => {},
  audio = new Audio(), contextFactory = () => {
    const Context = window.AudioContext || window.webkitAudioContext;
    return Context ? new Context() : null;
  }, emit = detail => document.dispatchEvent(new CustomEvent('axiom:speech', { detail })),
  raf = requestAnimationFrame, caf = cancelAnimationFrame } = {}) {
  audio.preload = 'none'; audio.controls = false;
  let context, analyser, source, samples, frame = 0, revision = 0, active = null, enabled = false;
  function signal(phase, level = 0) {
    emit({ phase, level, key: active?.key, gesture: active?.gesture, mood: active?.mood || 'neutral' });
  }
  function stop() {
    revision++; if (frame) caf(frame); frame = 0;
    audio.pause(); signal('end'); active = null; onState({ enabled, playing: false });
  }
  function meter() {
    if (!active || audio.paused || audio.ended) return;
    let level = 0;
    if (analyser) { analyser.getByteTimeDomainData(samples); level = voiceLevel(samples); }
    signal('progress', level); frame = raf(meter);
  }
  function finished() {
    if (frame) caf(frame); frame = 0; signal('end'); active = null;
    onState({ enabled, playing: false });
  }
  audio.addEventListener('ended', finished);
  audio.addEventListener('error', () => { finished(); onState({ enabled, playing: false, error: true }); });
  return {
    get enabled() { return enabled; },
    async play(key, caption) {
      if (!Object.hasOwn(ROOM_VOICES, key)) return false;
      stop(); enabled = true; const ownRevision = revision;
      const [file, gesture, mood] = ROOM_VOICES[key];
      active = { key, gesture, mood };
      onCaption(String(caption || ''));
      try {
        if (!context) {
          context = contextFactory();
          if (context) {
            analyser = context.createAnalyser(); analyser.fftSize = 256;
            samples = new Uint8Array(analyser.fftSize);
            source = context.createMediaElementSource(audio); source.connect(analyser); analyser.connect(context.destination);
          }
        }
        if (context?.state === 'suspended') await context.resume();
        if (ownRevision !== revision) return false;
        audio.src = new URL(`./assets/axiom/audio/${file}`, import.meta.url).href;
        await audio.play();
        if (ownRevision !== revision) { if (!active) audio.pause(); return false; }
        signal('start'); onState({ enabled, playing: true }); frame = raf(meter); return true;
      } catch {
        if (ownRevision === revision) { finished(); onState({ enabled, playing: false, error: true }); }
        return false;
      }
    },
    stop,
    disable() { enabled = false; stop(); },
    destroy() { enabled = false; stop(); audio.removeAttribute('src'); audio.load(); context?.close().catch(() => {}); },
  };
}
