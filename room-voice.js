// Original approved recordings only. No microphone, voice cloning or remote TTS.
export const ROOM_VOICES = Object.freeze({
  "thanks": ["gracias_es.mp3","bow","happy"],
  "welcome": ["10_saludo_serch.mp3","wave","happy"],
  "businessAnswer": ["02_negocio.mp3","agree","neutral"],
  "creatorAnswer": ["03_contenido.mp3","agree","neutral"],
  "labAnswer": ["04_proyectos.mp3","agree","neutral"],
  "trialJoke1": ["05_humor.mp3","agree","happy"],
  "trialJoke2": ["06_humor.mp3","agree","happy"],
  "trialJoke3": ["07_humor.mp3","agree","happy"],
  "trialInvite": ["26_apoyo_serch.mp3","bow","happy"],
  "bye": ["27_despedida.mp3","agree","neutral"],
  "supportAnswer": ["26_apoyo_serch.mp3","bow","happy"],
  "who": ["11_quien_serch.mp3","wave","happy"],
  "webTerm": ["12_web.mp3","agree","neutral"],
  "automationTerm": ["13_automatizacion.mp3","agree","neutral"],
  "aiTerm": ["14_ia_local.mp3","agree","neutral"],
  "securityTerm": ["15_seguridad.mp3","foldArms","calm"],
  "cvAnswer": ["16_perfil.mp3","agree","neutral"],
  "contactAnswer": ["17_revision.mp3","agree","neutral"],
  "trialJoke4": ["18_caja.mp3","agree","happy"],
  "trialJoke5": ["19_web_sencilla.mp3","agree","happy"],
  "trialJoke6": ["20_modem.mp3","agree","happy"],
  "trialJoke7": ["21_contrasena.mp3","agree","happy"],
  "trialJoke8": ["22_rapido.mp3","agree","happy"],
  "trialJoke9": ["23_cinco_minutos.mp3","agree","happy"],
  "trialJoke10": ["24_nube.mp3","agree","happy"],
  "trialJoke11": ["25_celda.mp3","agree","happy"],
  "trialJoke12": ["28_explotacion.mp3","agree","happy"],
  "trialJoke13": ["29_sueldo_virtual.mp3","agree","happy"],
  "trialJoke14": ["30_vacaciones.mp3","agree","happy"],
  "welcome2": ["31_bienvenida.mp3","wave","happy"],
  "welcome3": ["32_bienvenida.mp3","wave","happy"],
  "businessAnswer2": ["33_negocio.mp3","agree","neutral"],
  "creatorAnswer2": ["34_contenido.mp3","agree","neutral"],
  "labAnswer2": ["35_proyectos.mp3","agree","neutral"],
  "webTerm2": ["36_web.mp3","agree","neutral"],
  "automationTerm2": ["37_automatizacion.mp3","agree","neutral"],
  "aiTerm2": ["38_ia.mp3","agree","neutral"],
  "securityTerm2": ["39_seguridad.mp3","foldArms","calm"],
  "consultingTerm": ["40_consultoria.mp3","agree","neutral"],
  "networkTerm": ["41_redes.mp3","agree","neutral"],
  "contentTerm": ["42_produccion.mp3","agree","neutral"],
  "cvAnswer2": ["43_perfil.mp3","agree","neutral"],
  "contactAnswer2": ["44_revision.mp3","agree","neutral"],
  "who2": ["45_identidad.mp3","wave","happy"],
  "thanks2": ["46_gracias.mp3","bow","happy"],
  "bye2": ["47_despedida.mp3","agree","neutral"],
  "fallback": ["48_alternativas.mp3","agree","neutral"],
  "fallback2": ["49_alternativas.mp3","agree","neutral"],
  "searchFound": ["50_busqueda.mp3","agree","neutral"],
  "osintTerm": ["51_osint.mp3","agree","neutral"],
  "siemTerm": ["52_siem.mp3","agree","neutral"],
  "hardeningTerm": ["53_hardening.mp3","foldArms","calm"],
  "conversionTerm": ["54_conversion.mp3","agree","neutral"],
  "glossaryIntro": ["55_glosario.mp3","agree","neutral"],
  "supportAnswer2": ["56_apoyo.mp3","bow","happy"],
  "supportAnswer3": ["57_apoyo.mp3","bow","happy"],
  "businessWrap": ["58_cierre_negocio.mp3","agree","neutral"],
  "creatorWrap": ["59_cierre_creador.mp3","agree","neutral"],
  "labWrap": ["60_cierre_lab.mp3","agree","neutral"],
  "adultWelcome": ["61_creadoras.mp3","agree","neutral"],
  "adultWelcome2": ["62_creadoras.mp3","agree","neutral"],
  "trialJoke15": ["63_horario.mp3","agree","happy"],
  "trialJoke16": ["64_vacaciones.mp3","agree","happy"],
  "glossPhishing": ["65_phishing.mp3","agree","neutral"],
  "glossMfa": ["66_dos_factores.mp3","foldArms","calm"],
  "glossApi": ["67_api.mp3","agree","neutral"],
  "glossHosting": ["68_alojamiento.mp3","agree","neutral"],
  "glossSeo": ["69_seo.mp3","agree","neutral"],
  "glossBackup": ["70_respaldo.mp3","foldArms","calm"],
  "glossHttps": ["71_https.mp3","foldArms","calm"],
  "glossMalware": ["72_malware.mp3","agree","neutral"],
  "glossLlm": ["73_modelo.mp3","agree","neutral"],
  "glossAutomation": ["74_automatizar.mp3","agree","neutral"],
  "trialJoke17": ["75_familia.mp3","agree","happy"],
  "trialJoke18": ["76_descanso.mp3","agree","happy"],
  "trialJoke19": ["77_presupuesto.mp3","agree","happy"],
  "trialJoke20": ["78_cafe.mp3","agree","happy"],
  "trialJoke21": ["79_ideas.mp3","agree","happy"],
  "trialJoke22": ["80_patron.mp3","agree","happy"],
  "idleReturn": ["81_regreso.mp3","agree","neutral"],
  "idleReturnNote": ["82_cafe_tactico.mp3","agree","neutral"],
  "axiomStoryVoice": ["83_concepto.mp3","wave","happy"],
  "scrollBrake": ["84_frenos.mp3","agree","neutral"],
  "scrollRadar": ["85_radar.mp3","agree","neutral"],
  "idleReturnNight": ["86_regreso_noche.mp3","wave","calm"],
  "scrollNight": ["87_scroll_noche.mp3","wave","calm"],
  "welcomeEn": ["saludo_en.mp3","wave","happy"],
  "thanksEn": ["gracias_en.mp3","wave","happy"],
  "byeEn": ["adios_en.mp3","wave","happy"]
});

export function voiceLevel(samples) {
  if (!samples?.length) return 0;
  let sum = 0;
  for (const value of samples) sum += ((value - 128) / 128) ** 2;
  return Math.min(1, Math.sqrt(sum / samples.length) * 5);
}

export function createRoomVoice({ onCaption = () => {}, onState = () => {},
  audio = new Audio(), document: doc = globalThis.document, audioId = 'axiom-local-audio',
  audioFactory, contextFactory = () => {
    const Context = window.AudioContext || window.webkitAudioContext;
    return Context ? new Context() : null;
  }, emit = detail => document.dispatchEvent(new CustomEvent('axiom:speech', { detail })),
  raf = requestAnimationFrame, caf = cancelAnimationFrame } = {}) {
  let media = audio, context, analyser, source, samples, frame = 0, revision = 0, active = null;
  let enabled = false, playing = false, loading = false, destroyed = false, ownedElement = false;
  function configure(element) {
    element.preload = 'none'; element.controls = false; element.hidden = true;
    element.id = audioId; element.tabIndex = -1;
    element.setAttribute?.('aria-hidden', 'true'); element.setAttribute?.('playsinline', '');
    // A DOM media element allows browser tools and assistive UI to inspect the
    // actual original recording. It never exposes native player controls.
    if (doc?.body && element.nodeType === 1 && !element.isConnected) { doc.body.append(element); ownedElement = true; }
    element.addEventListener('ended', finished);
    element.addEventListener('error', failed);
  }
  const state = (error = false) => onState({ enabled, playing, loading, error });
  function signal(phase, level = 0) {
    emit({ phase, level, key: active?.key, gesture: active?.gesture, mood: active?.mood || 'neutral' });
  }
  function stop() {
    revision++; if (frame) caf(frame); frame = 0;
    media.pause(); signal('end'); active = null; playing = false; loading = false; state();
  }
  function meter() {
    if (!active || media.paused || media.ended) return;
    let level = 0;
    if (analyser && context?.state === 'running') { analyser.getByteTimeDomainData(samples); level = voiceLevel(samples); }
    signal('progress', level); frame = raf(meter);
  }
  function finished() {
    if (frame) caf(frame); frame = 0; signal('end'); active = null;
    playing = false; loading = false; state();
  }
  function failed() {
    if (!active) return;
    if (frame) caf(frame); frame = 0; media.pause(); signal('end'); active = null;
    // Failed playback is retryable with the very next press of the voice button.
    enabled = false; playing = false; loading = false; state(true);
  }
  function disconnectMeter() {
    try { source?.disconnect?.(); analyser?.disconnect?.(); } catch { /* Optional meter only. */ }
    source = null; analyser = null; samples = null;
  }
  function plainElement() {
    // A previously routed HTML element cannot leave its Web Audio graph. If a
    // browser suspends/closes that graph, use a fresh direct HTML media element.
    const old = media, previousUrl = old.src;
    const fresh = audioFactory ? audioFactory() : old.cloneNode?.(false);
    if (!fresh || typeof fresh.play !== 'function') return false;
    old.pause(); old.removeEventListener('ended', finished); old.removeEventListener('error', failed);
    old.removeAttribute('src'); old.load(); if (ownedElement) old.remove?.();
    disconnectMeter(); media = fresh; configure(media); media.src = previousUrl; return true;
  }
  function attachMeter(token) {
    if (destroyed || token !== revision || !active || context?.state !== 'running' || source) return;
    let nextSource;
    try {
      const nextAnalyser = context.createAnalyser(); nextAnalyser.fftSize = 256;
      const nextSamples = new Uint8Array(nextAnalyser.fftSize);
      nextSource = context.createMediaElementSource(media);
      // Sound has a direct destination even if connecting the meter fails.
      source = nextSource; nextSource.connect(context.destination);
      try { nextSource.connect(nextAnalyser); analyser = nextAnalyser; samples = nextSamples; }
      catch { analyser = null; samples = null; }
    } catch {
      // Creating a source can reroute its element. If its destination fails,
      // replace that element immediately while still in the user gesture.
      if (nextSource) {
        if (plainElement()) return media.play();
        return Promise.reject(new Error('HTML audio could not be restored'));
      }
      // An unsupported source/analyser leaves ordinary HTML audio untouched.
    }
  }
  function prepareMeter(token) {
    try {
      if (!context) context = contextFactory();
      if (!context) return;
      if (context.state === 'running') return attachMeter(token);
      else if (context.state === 'suspended') {
        // Never await Web Audio before calling HTMLMediaElement.play(). A
        // pending resume or a rejected meter cannot consume the sound gesture.
        // This clip stays direct HTML audio. A successful resume may enable
        // metering on the next clip, never reroute a playing clip asynchronously.
        Promise.resolve(context.resume()).catch(() => {});
      }
    } catch { /* Voice remains ordinary HTML audio when Web Audio is unavailable. */ }
  }
  configure(media);
  return {
    get enabled() { return enabled; },
    get playing() { return playing; },
    get loading() { return loading; },
    async play(key, caption) {
      if (destroyed || !Object.hasOwn(ROOM_VOICES, key)) return false;
      stop(); enabled = true; loading = true; const ownRevision = revision;
      const [file, gesture, mood] = ROOM_VOICES[key];
      active = { key, gesture, mood };
      onCaption(String(caption || ''));
      state();
      try {
        if (source && context?.state !== 'running') {
          const previous = context;
          if (plainElement()) { context = null; previous?.close?.().catch(() => {}); }
        }
        media.src = new URL(`./assets/axiom/audio/${file}`, import.meta.url).href;
        // This call happens synchronously in the original click/tap stack.
        const playback = media.play();
        const fallbackPlayback = prepareMeter(ownRevision);
        if (fallbackPlayback) Promise.resolve(playback).catch(() => {});
        await (fallbackPlayback || playback);
        if (ownRevision !== revision || !active || destroyed) { if (!active) media.pause(); return false; }
        playing = true; loading = false; signal('start'); state(); frame = raf(meter); return true;
      } catch {
        if (ownRevision === revision) failed();
        return false;
      }
    },
    stop,
    disable() { enabled = false; stop(); },
    destroy() {
      if (destroyed) return; enabled = false; stop(); destroyed = true;
      media.removeEventListener('ended', finished); media.removeEventListener('error', failed);
      media.removeAttribute('src'); media.load(); if (ownedElement) media.remove?.();
      disconnectMeter(); context?.close?.().catch(() => {});
    },
  };
}
