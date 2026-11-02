import * as THREE from './axiom-3d/vendor/three/build/three.module.js';
import { GLTFLoader } from './axiom-3d/vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './axiom-3d/vendor/meshoptimizer/meshopt_decoder_reference.js';
import { validateGLB, MAX_MODEL_BYTES } from './axiom-3d/model-policy.js?v=performance-3';
import { createNativeAxiom } from './axiom-3d/native-axiom.js';
import { createStudioEnvironment, enhanceAxiomMaterials } from './axiom-3d/axiom-studio.js';
import { speechEnvelope } from './axiom-portrait.js?v=living-10';

const MODEL_URL = new URL('./axiom-3d/models/axiom-web.glb', import.meta.url);
const MOODS = new Set(['neutral', 'happy', 'calm', 'angry', 'furious']);
const CLIPS = Object.freeze({
  clap: /^clap(?:\.|$)/i, agree: /^agree(?:\.|$)/i, nod: /^agree(?:\.|$)/i,
  bow: /^bow(?:\.|$)/i, afraid: /^afraid(?:\.|$)/i,
  foldArms: /^fold_arms(?:\.|$)/i, kick: /^front_kick_02(?:\.|$)/i, run: /^run(?:\.|$)/i,
});
const ACTIONS = new Set(['wave', 'jump', 'spin', 'attack']);
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));

/** Finite, bounded speech data. This module never requests microphone/audio access. */
export function normalizeRoomSpeech(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return { speaking: source.speaking === true, level: clamp(source.level),
    mood: MOODS.has(source.mood) ? source.mood : null };
}

function disposeObject(object) {
  if (!object) return;
  const geometry = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  object.traverse(node => {
    if (node.geometry) geometry.add(node.geometry);
    for (const material of [].concat(node.material || [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
    if (node.skeleton) skeletons.add(node.skeleton);
  });
  geometry.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
  textures.forEach(item => { item.dispose(); item.image?.close?.(); });
  skeletons.forEach(item => item.dispose());
}

/**
 * One immutable Axiom inside the room's existing avatar container.
 * The SVG station map retains interaction; no second canvas, voice, tracking,
 * external resource or model upload is created. `createFace(scene, nativeRig)`
 * may supply { apply(pose), reset?(), dispose?() } for locally fitted morphs.
 */
export function initRoomAxiom({ container, canvas, fallback = null, onReady = null, createFace = null } = {}) {
  if (!container || !canvas) throw new TypeError('Axiom needs its room container and canvas.');
  const lifecycle = new AbortController();
  const fetchController = new AbortController();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = matchMedia('(pointer: coarse)');
  const listen = (node, type, callback, options = {}) => node.addEventListener(type, callback, { ...options, signal: lifecycle.signal });
  const pointer = new THREE.Vector2();
  const focus = new THREE.Vector2();
  const quietPointer = new THREE.Vector2();
  const motionRoot = new THREE.Group();
  let renderer = null, scene = null, camera = null, model = null, native = null, face = null;
  let studio = null, materials = null, resizeObserver = null, visibilityObserver = null;
  let motion = true, intersecting = false, destroyed = false, contextLost = false;
  let loading = false, loaded = false, failed = false, frame = 0, previousTime = 0, elapsed = 0;
  let modelHeight = 3.2, modelWidth = 2.5, modelDepth = 2.5, pointerUntil = 0;
  let mood = 'neutral', action = null, pendingGesture = null;
  let speaking = false, speechTarget = 0, speechLevel = 0, hasMeterSignal = false;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const moving = () => loaded && motion && !reducedMotion.matches && intersecting && !document.hidden && !contextLost && !destroyed;

  function signalState() {
    container.classList.toggle('room-axiom-ready', loaded && !contextLost && !destroyed);
    container.dataset.axiomState = destroyed ? 'destroyed' : failed ? 'fallback' : contextLost ? 'context-lost' : loaded ? 'ready' : loading ? 'loading' : 'waiting';
    canvas.dataset.motion = !motion ? 'paused' : reducedMotion.matches ? 'reduced' : 'active';
    canvas.dataset.speaking = String(speaking);
    if (fallback) fallback.setAttribute('aria-hidden', String(loaded && !contextLost && !destroyed));
  }

  function render() {
    if (renderer && scene && camera && loaded && intersecting && !document.hidden && !contextLost && !destroyed) renderer.render(scene, camera);
  }

  function resize() {
    if (!renderer || contextLost || destroyed) return;
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(500000 / (width * height))));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const distance = Math.max(modelHeight / (2 * Math.tan(vertical / 2)), modelWidth / (2 * Math.tan(horizontal / 2))) * 1.14 + modelDepth * .35;
    const target = new THREE.Vector3(0, modelHeight * .5, 0);
    camera.position.set(distance * .035, target.y + modelHeight * .015, distance);
    camera.lookAt(target); camera.far = Math.max(50, distance * 5); camera.updateProjectionMatrix();
    render();
  }

  function applyPose(pose) {
    motionRoot.position.y = pose.rootY || 0;
    motionRoot.rotation.set(pose.rootPitch || 0, pose.rootYaw || 0, pose.rootRoll || 0);
    motionRoot.scale.set(pose.rootScaleXZ || 1, pose.rootScaleY || 1, pose.rootScaleXZ || 1);
  }

  function updateFace(delta) {
    // Safari's first trusted HTML-audio clip can be audible before AudioContext
    // becomes available. A zero meter must not leave an audible Axiom frozen.
    // Once a real nonzero sample arrives, pauses follow the actual RMS again.
    const target = speaking && !hasMeterSignal ? speechEnvelope(elapsed) : speechTarget;
    speechLevel += (target - speechLevel) * Math.min(1, delta * 16);
    canvas.dataset.voiceLevel = speechLevel.toFixed(3);
    if (!face?.apply) return;
    const cycle = elapsed % 6.7;
    const blink = cycle > 4.8 && cycle < 5.0 ? Math.sin((cycle - 4.8) / .2 * Math.PI) ** 2 : 0;
    // Morphs are optional: a body-only export still uses its real head/arms.
    face.apply({ blink: reducedMotion.matches || !motion ? 0 : blink,
      gazeX: pointer.x * .65, gazeY: pointer.y * .5,
      smile: mood === 'happy' ? .6 : mood === 'angry' || mood === 'furious' ? 0 : .12,
      anger: mood === 'angry' ? .55 : mood === 'furious' ? .85 : 0,
      calm: mood === 'calm' ? .55 : 0,
      jawOpen: motion && !reducedMotion.matches ? speechLevel * .75 : 0 });
  }

  function drawFrame(time) {
    frame = 0;
    if (!moving()) return;
    const minimum = coarsePointer.matches ? 1000 / 30 : 1000 / 40;
    if (previousTime && time - previousTime < minimum) { frame = requestAnimationFrame(drawFrame); return; }
    const delta = previousTime ? Math.min((time - previousTime) / 1000, .06) : 0;
    previousTime = time; elapsed += delta;
    const attention = clamp((pointerUntil - time) / 700);
    const ease = 1 - Math.exp(-delta * 6);
    pointer.lerp(attention ? focus : quietPointer, ease);
    pointer.attention = attention;
    if (action) action.time += delta;
    applyPose(native.update(delta, elapsed, { mood, locomotion: 'idle', pointer, action }));
    updateFace(delta);
    if (action && action.time >= action.duration) action = null;
    canvas.dataset.clip = native.activeClipName || action?.type || 'idle';
    render(); frame = requestAnimationFrame(drawFrame);
  }

  function synchronize() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; previousTime = 0; signalState();
    if (moving()) frame = requestAnimationFrame(drawFrame);
    else if (loaded) render();
  }

  function gesture(type) {
    if (destroyed || typeof type !== 'string' || (!ACTIONS.has(type) && !Object.hasOwn(CLIPS, type))) return false;
    if (!loaded) { pendingGesture = { type, until: performance.now() + 8000 }; return true; }
    if (!motion || reducedMotion.matches) return false;
    action = null;
    if (ACTIONS.has(type)) {
      native.playClip(null);
      action = { type, time: 0, duration: native.duration(type) };
    } else {
      const name = native.clipNames.find(clip => CLIPS[type].test(clip));
      if (!name) return false;
      native.playClip(name);
    }
    synchronize(); return true;
  }

  function setMood(value) {
    if (!MOODS.has(value) || destroyed) return;
    mood = value; synchronize();
  }

  function setSpeech(value) {
    if (destroyed) return;
    const speech = normalizeRoomSpeech(value);
    if (speech.speaking && !speaking) hasMeterSignal = false;
    if (speech.level > .006) hasMeterSignal = true;
    speaking = speech.speaking;
    speechTarget = speaking ? speech.level : 0;
    if (speech.mood) mood = speech.mood;
    signalState();
    // Ending speech releases the mouth smoothly; it never cuts a body clip.
  }

  async function load() {
    if (loading || loaded || destroyed || failed) return;
    loading = true; signalState();
    let candidate = null;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(32, 1, .05, 50);
      scene.add(new THREE.AmbientLight(0xe5eef1, .65));
      const key = new THREE.DirectionalLight(0xffede1, 2.1); key.position.set(-3, 6, 5); scene.add(key);
      const fill = new THREE.DirectionalLight(0xb3ebe8, .8); fill.position.set(4, 3, -3); scene.add(fill);
      const front = new THREE.DirectionalLight(0xffffff, .5); front.position.set(3, 2, 4); scene.add(front);
      scene.add(motionRoot);
      studio = createStudioEnvironment(renderer, scene);
      const response = await fetch(MODEL_URL, { signal: fetchController.signal, credentials: 'omit' });
      if (!response.ok || Number(response.headers.get('content-length')) > MAX_MODEL_BYTES) throw new Error('Model unavailable');
      const buffer = await response.arrayBuffer();
      validateGLB(buffer, { allowMeshopt:true });
      if (destroyed) return;
      const manager = new THREE.LoadingManager();
      let resourceFailed = false;
      manager.onError = () => { resourceFailed = true; };
      manager.setURLModifier(url => {
        if (url.startsWith('blob:') || /^data:(image\/(png|jpeg|webp)|application\/(octet-stream|gltf-buffer));base64,/i.test(url)) return url;
        throw new Error('External model resources are disabled');
      });
      const gltf = await new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, '');
      candidate = gltf.scene;
      if (resourceFailed) throw new Error('A model texture could not be loaded');
      if (destroyed) { disposeObject(candidate); candidate = null; return; }
      native = createNativeAxiom(gltf);
      if (!native) throw new Error('Expected the supplied animated Axiom');
      candidate.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(candidate);
      const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      if (![size.x, size.y, size.z].every(Number.isFinite) || size.y <= 0) throw new Error('Invalid model bounds');
      const scale = 3.2 / Math.max(size.y, size.x * 1.05, size.z * 1.05);
      modelHeight = size.y * scale; modelWidth = size.x * scale; modelDepth = size.z * scale;
      model = new THREE.Group(); model.add(candidate);
      model.scale.setScalar(scale); model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      motionRoot.add(model);
      materials = enhanceAxiomMaterials(candidate, renderer); studio.setActive(true);
      if (typeof createFace === 'function') face = await createFace(candidate, native);
      if (destroyed) { releaseGraphics(); return; }
      candidate = null; loaded = true; loading = false;
      canvas.dataset.model = 'axiom-animated'; canvas.dataset.clips = String(native.clipNames.length);
      applyPose(native.update(0, 0, { mood, locomotion: 'idle', pointer }));
      resize(); synchronize(); resolveReady(true);
      if (typeof onReady === 'function') onReady({ clips: [...native.clipNames], facial: Boolean(face) });
      if (pendingGesture && pendingGesture.until >= performance.now()) gesture(pendingGesture.type);
      pendingGesture = null;
    } catch (error) {
      if (candidate && !model) disposeObject(candidate);
      releaseGraphics(); loading = false;
      if (!destroyed) failed = true;
      signalState(); resolveReady(false);
    }
  }

  function releaseGraphics() {
    loaded = false;
    native?.dispose(); native = null;
    face?.dispose?.(); face = null;
    materials?.dispose(); materials = null;
    studio?.dispose(); studio = null;
    disposeObject(model); model = null;
    motionRoot.clear(); scene?.clear(); scene = null;
    renderer?.dispose(); renderer = null;
  }

  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
  visibilityObserver = new IntersectionObserver(entries => {
    intersecting = entries.some(entry => entry.isIntersecting);
    if (intersecting && !loaded && !loading && !failed) load();
    synchronize();
  }, { rootMargin: '100px', threshold: .01 });
  visibilityObserver.observe(container);
  listen(document, 'pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    focus.set(clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1), clamp(1 - event.clientY / Math.max(1, innerHeight) * 2, -1, 1));
    pointerUntil = performance.now() + 4000;
  }, { passive: true });
  listen(document, 'pointerdown', event => {
    focus.set(clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1), clamp(1 - event.clientY / Math.max(1, innerHeight) * 2, -1, 1));
    pointerUntil = performance.now() + 2500;
  }, { passive: true });
  listen(window, 'blur', () => { pointerUntil = 0; });
  listen(document, 'visibilitychange', synchronize);
  listen(reducedMotion, 'change', () => { speechLevel = 0; synchronize(); });
  listen(document, 'axiom:speech', event => {
    const data = event.detail && typeof event.detail === 'object' ? event.detail : {};
    if (!['start', 'progress', 'end'].includes(data.phase)) return;
    setSpeech({ speaking: data.phase !== 'end', level: data.phase === 'end' ? 0 : data.level, mood: data.mood });
    if (data.phase === 'start' && typeof data.gesture === 'string') gesture(data.gesture);
  });
  listen(canvas, 'click', () => gesture('wave'));
  listen(canvas, 'keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) gesture('wave'); }
  });
  listen(canvas, 'webglcontextlost', event => { event.preventDefault(); contextLost = true; synchronize(); });
  listen(canvas, 'webglcontextrestored', () => { contextLost = false; resize(); synchronize(); });
  listen(window, 'pagehide', event => { if (event.persisted) { if (frame) cancelAnimationFrame(frame); frame = 0; } else destroy(); });
  listen(window, 'pageshow', synchronize);

  function destroy() {
    if (destroyed) return;
    destroyed = true; speaking = false; fetchController.abort(); lifecycle.abort();
    if (frame) cancelAnimationFrame(frame); frame = 0;
    resizeObserver?.disconnect(); visibilityObserver?.disconnect();
    releaseGraphics(); signalState(); resolveReady(false);
  }

  signalState();
  return { ready, setMotion(value) { motion = Boolean(value); synchronize(); }, setMood, gesture, setSpeech, destroy,
    get readyState() { return destroyed ? 'destroyed' : failed ? 'fallback' : loaded ? 'ready' : 'loading'; } };
}
