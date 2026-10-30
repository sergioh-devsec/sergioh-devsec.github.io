import * as THREE from './vendor/three/build/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';
import { validateGLB, validateGLTF, MAX_MODEL_BYTES } from './model-policy.js';

// Replace this file with your final, self-contained, Y-up GLB. No API key is needed.
const MODEL_URL = new URL('./models/axiom-prototype.glb', import.meta.url).href;
const BONE_NAMES = {
  head: ['Head', 'head', 'mixamorigHead', 'CC_Base_Head'],
  left: ['Eye_L', 'LeftEye', 'EyeLeft', 'mixamorigLeftEye'],
  right: ['Eye_R', 'RightEye', 'EyeRight', 'mixamorigRightEye'],
};
const $ = id => document.getElementById(id);
const stage = $('axiom-container');
const canvas = $('axiom-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const buttons = [...document.querySelectorAll('#viewer-controls button, .view-controls button, #rig')];
const status = text => { $('status').textContent = text; };
let renderer, scene, camera, controls, model, mixer, skeletonHelper;
let head, eyes = [], tracked = [], loadSequence = 0;
let paused = false, following = true, orbiting = false, visible = true, contextLost = false;
let frame = 0, previousTime = 0, elapsed = 0, action = null;
let fitDistance = 6, modelHeight = 3.2, modelRadius = 2.13;
const targetPointer = new THREE.Vector2();
const smoothPointer = new THREE.Vector2();
const neutralPointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const offsetQuaternion = new THREE.Quaternion();
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const motionRoot = new THREE.Group();
const listenerController = new AbortController();
const listen = (node, type, handler, options = {}) => node.addEventListener(type, handler, { ...options, signal: listenerController.signal });
const mayAnimate = () => model && !paused && !reducedMotion.matches && visible && !document.hidden && !contextLost;

function disposeModel(object) {
  if (!object) return;
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  object.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of [].concat(node.material || [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
    if (node.skeleton) skeletons.add(node.skeleton);
  });
  geometries.forEach(item => item.dispose());
  materials.forEach(item => item.dispose());
  textures.forEach(item => item.dispose());
  skeletons.forEach(item => item.dispose());
}

function findPart(root, names) {
  let part;
  const normalized = names.map(name => name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  root.traverse(node => {
    if (!part && normalized.includes(node.name.toLowerCase().replace(/[^a-z0-9]/g, ''))) part = node;
  });
  return part;
}

function sceneSummary(root) {
  let bones = 0, skins = 0, triangles = 0;
  root.traverse(node => {
    if (node.isBone) bones++;
    if (node.isSkinnedMesh) skins++;
    if (node.isMesh) triangles += (node.geometry.index?.count ?? node.geometry.attributes.position?.count ?? 0) / 3;
  });
  return { bones, skins, triangles };
}

function fitCamera(reset = false) {
  if (!camera || !controls || !model) return;
  const aspect = Math.max(stage.clientWidth / stage.clientHeight, 0.2);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  // A sphere is rotation-independent: even the narrow mobile view fits the tail.
  fitDistance = modelRadius / Math.sin(Math.min(vFov, hFov) / 2);
  const direction = reset ? new THREE.Vector3(0.1, 0.06, 1).normalize() : camera.position.clone().sub(controls.target).normalize();
  controls.target.set(0, modelHeight * 0.49, 0);
  camera.position.copy(controls.target).addScaledVector(direction, fitDistance);
  camera.near = 0.05;
  camera.far = Math.max(50, fitDistance * 5);
  camera.updateProjectionMatrix();
  controls.update();
}

function resize() {
  if (!renderer || contextLost) return;
  const width = Math.max(stage.clientWidth, 1), height = Math.max(stage.clientHeight, 1);
  const density = Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(1800000 / (width * height)));
  renderer.setPixelRatio(density);
  renderer.setSize(width, height, false);
  fitCamera();
  render();
}

function render() {
  if (!renderer || contextLost || document.hidden || !visible) return;
  renderer.render(scene, camera);
}

function resetPose() {
  for (const entry of tracked) entry.node.quaternion.copy(entry.rest);
  motionRoot.position.set(0, 0, 0);
  motionRoot.rotation.set(0, 0, 0);
  action = null;
  canvas.dataset.action = 'idle';
  smoothPointer.set(0, 0);
  render();
}

function updateState() {
  $('pause').textContent = paused ? 'Reanudar movimiento' : 'Pausar movimiento';
  $('pause').setAttribute('aria-pressed', String(paused));
  $('look').textContent = following ? 'Mirada activa' : 'Mirada en reposo';
  $('look').setAttribute('aria-pressed', String(following));
  $('scene-state').textContent = contextLost ? 'SIN WEBGL' : !model ? 'CARGANDO' : paused || reducedMotion.matches ? 'EN REPOSO' : 'EN VIVO';
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  previousTime = 0;
  if (mayAnimate()) frame = requestAnimationFrame(tick);
  else render();
}

function tick(time) {
  frame = 0;
  if (!mayAnimate()) return;
  const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
  previousTime = time;
  elapsed += delta;
  for (const entry of tracked) entry.node.quaternion.copy(entry.rest);
  mixer?.update(delta);
  smoothPointer.lerp(following && !orbiting ? targetPointer : neutralPointer, 1 - Math.exp(-delta * 5));
  if (head) {
    lookEuler.set(smoothPointer.y * 0.12, smoothPointer.x * 0.25, 0);
    head.quaternion.multiply(offsetQuaternion.setFromEuler(lookEuler));
  }
  for (const eye of eyes) {
    lookEuler.set(smoothPointer.y * 0.055, smoothPointer.x * 0.10, 0);
    eye.quaternion.multiply(offsetQuaternion.setFromEuler(lookEuler));
  }
  motionRoot.position.y = Math.sin(elapsed * 1.9) * 0.012;
  if (action) {
    action.time += delta;
    const progress = Math.min(action.time / action.duration, 1);
    if (action.type === 'jump') motionRoot.position.y += Math.sin(progress * Math.PI) * 0.43;
    else motionRoot.rotation.y = (progress * progress * (3 - 2 * progress)) * Math.PI * 2;
    if (progress === 1) {
      action = null;
      motionRoot.rotation.y = 0;
      canvas.dataset.action = 'idle';
      $('stage-caption').textContent = 'Tu ciberasistente, desde otro ángulo.';
    }
  }
  render();
  frame = requestAnimationFrame(tick);
}

function react(type) {
  if (!model || contextLost) return;
  if (paused || reducedMotion.matches) {
    status(reducedMotion.matches ? 'Respetamos tu preferencia de movimiento reducido. Puedes explorar las vistas con los botones.' : 'El movimiento está pausado. Pulsa «Reanudar movimiento» para jugar con Axiom.');
    return;
  }
  if (action) return;
  action = { type, time: 0, duration: type === 'jump' ? 0.8 : 1.25 };
  canvas.dataset.action = type;
  $('stage-caption').textContent = type === 'jump' ? '¡Una idea que despega!' : 'Un giro para ver las cosas de otra forma.';
  status(type === 'jump' ? '¡Salto recibido! Axiom responde a tu toque.' : 'Axiom da una vuelta completa.');
  updateState();
}

function adoptModel(gltf, imported) {
  const next = gltf.scene;
  const summary = sceneSummary(next);
  if (!summary.triangles || summary.triangles > 500000) {
    disposeModel(next);
    throw new Error('El modelo debe tener geometría y menos de 500 000 triángulos para este visor.');
  }
  next.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(next);
  const size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every(Number.isFinite) || size.y <= 0 || size.length() === 0) {
    disposeModel(next);
    throw new Error('El modelo no tiene dimensiones válidas.');
  }
  const scale = 3.2 / Math.max(size.y, size.x * 1.05, size.z * 1.05);
  const center = bounds.getCenter(new THREE.Vector3());
  const vertex = new THREE.Vector3();
  let radiusSquared = 0;
  next.traverse(node => {
    if (!node.isMesh || !node.geometry.attributes.position) return;
    for (let index = 0; index < node.geometry.attributes.position.count; index++) {
      node.getVertexPosition(index, vertex).applyMatrix4(node.matrixWorld);
      radiusSquared = Math.max(radiusSquared, vertex.distanceToSquared(center));
    }
  });
  modelRadius = Math.sqrt(radiusSquared) * scale + 0.28;
  // Parent wrapper preserves the imported root transform and any root animation tracks.
  const wrapper = new THREE.Group();
  wrapper.add(next);
  wrapper.scale.setScalar(scale);
  wrapper.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  modelHeight = size.y * scale;
  mixer?.stopAllAction();
  if (mixer && model) mixer.uncacheRoot(model.children[0]);
  if (skeletonHelper) {
    scene.remove(skeletonHelper);
    skeletonHelper.geometry.dispose();
    skeletonHelper.material.dispose();
    skeletonHelper = null;
  }
  motionRoot.clear();
  disposeModel(model);
  model = wrapper;
  motionRoot.add(model);
  head = findPart(next, BONE_NAMES.head);
  eyes = [findPart(next, BONE_NAMES.left), findPart(next, BONE_NAMES.right)].filter(Boolean);
  tracked = [head, ...eyes].filter(Boolean).map(node => ({ node, rest: node.quaternion.clone() }));
  next.traverse(node => {
    if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
  });
  mixer = new THREE.AnimationMixer(next);
  const idle = gltf.animations?.find(clip => /idle|reposo|respir/i.test(clip.name));
  if (idle) mixer.clipAction(idle).play();
  stage.dataset.ready = 'true';
  canvas.dataset.bones = String(summary.bones);
  canvas.dataset.skins = String(summary.skins);
  canvas.dataset.action = 'idle';
  buttons.forEach(button => { button.disabled = false; });
  $('restore-model').disabled = !imported;
  $('rig').disabled = !summary.bones;
  $('rig').setAttribute('aria-pressed', 'false');
  $('rig').textContent = 'Ver articulaciones';
  $('model-label').textContent = imported ? 'Tu modelo, en este navegador' : 'Prototipo 3D articulado';
  $('model-description').textContent = imported ? 'El archivo se procesa aquí, sin subirlo a un servidor. El seguimiento depende de los nombres de sus articulaciones.' : 'Una interpretación estilizada de Axiom, construida con geometría y articulaciones. Conservamos la ilustración original en la web.';
  $('rig-status').textContent = `${summary.bones} articulaciones · ${summary.skins} mallas con rigging · ${Math.round(summary.triangles).toLocaleString('es-MX')} triángulos.${head ? ' Cabeza reconocida.' : ' No se encontró una articulación de cabeza compatible.'}`;
  status('Listo. Mueve el cursor, toca a Axiom o prueba los controles.');
  $('stage-caption').textContent = 'Tu ciberasistente, desde otro ángulo.';
  resetPose();
  fitCamera(true);
  resize();
  updateState();
}

function loaderForLocalFile() {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if (url.startsWith('blob:') || /^data:(image\/(png|jpeg|webp)|application\/(octet-stream|gltf-buffer));base64,/i.test(url)) return url;
    throw new Error('Usa un modelo autocontenido: no se permiten descargas externas.');
  });
  return new GLTFLoader(manager);
}

async function loadDefault() {
  const sequence = ++loadSequence;
  status('Cargando el modelo 3D de Axiom…');
  try {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    if (sequence !== loadSequence) return disposeModel(gltf.scene);
    adoptModel(gltf, false);
    $('model-file').value = '';
  } catch (error) {
    if (sequence !== loadSequence) return;
    status('No se pudo abrir el modelo. Conservamos la imagen de Axiom; puedes recargar para intentarlo de nuevo.');
    console.warn('Axiom 3D: no se pudo cargar el recurso local.', error);
  }
}

async function importFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const sequence = ++loadSequence;
  try {
    if (!/\.(glb|gltf)$/i.test(file.name)) throw new Error('Elige un archivo .glb o .gltf.');
    if (file.size > MAX_MODEL_BYTES) throw new Error('El archivo supera el máximo de 20 MB.');
    status('Revisando tu modelo local…');
    const buffer = await file.arrayBuffer();
    let payload = buffer;
    if (/\.gltf$/i.test(file.name)) {
      const manifest = JSON.parse(new TextDecoder().decode(buffer));
      validateGLTF(manifest);
      payload = JSON.stringify(manifest);
    } else validateGLB(buffer);
    const gltf = await loaderForLocalFile().parseAsync(payload, '');
    if (sequence !== loadSequence) return disposeModel(gltf.scene);
    adoptModel(gltf, true);
  } catch (error) {
    if (sequence === loadSequence) status(`No se cambió el modelo. ${error instanceof SyntaxError ? 'El archivo JSON no es válido.' : error.message}`);
  }
}

function start() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    status('Este navegador no pudo activar WebGL. Puedes ver la ilustración original y descargar el modelo.');
    $('scene-state').textContent = 'VISTA ORIGINAL';
    $('model-file').disabled = true;
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  camera.position.set(0.5, 2, 8);
  scene.add(new THREE.AmbientLight(0xd5e9f1, 1.8));
  const key = new THREE.DirectionalLight(0xffede1, 3.5);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -4;
  key.shadow.camera.right = key.shadow.camera.top = 4;
  key.shadow.camera.near = 0.1; key.shadow.camera.far = 20;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x72eae0, 2.4);
  fill.position.set(4, 3, -3); scene.add(fill);
  const front = new THREE.DirectionalLight(0xffffff, 0.8);
  front.position.set(3, 2, 4); scene.add(front);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.025; floor.receiveShadow = true; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.34, 1.35, 80), new THREE.MeshBasicMaterial({ color: 0x61d8d1, transparent: true, opacity: 0.34, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = -0.018; scene.add(ring, motionRoot);
  controls = new OrbitControls(camera, canvas);
  controls.enabled = false;
  controls.enableZoom = false; controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.30; controls.maxPolarAngle = Math.PI * 0.58;
  canvas.style.touchAction = 'pan-y';
  controls.addEventListener('change', render);
  listen(window, 'pointermove', event => {
    if (event.pointerType === 'mouse') targetPointer.set((event.clientX / innerWidth - 0.5) * 2, (event.clientY / innerHeight - 0.5) * 2);
  }, { passive: true });
  listen(document.documentElement, 'pointerleave', () => targetPointer.set(0, 0));
  listen(window, 'blur', () => targetPointer.set(0, 0));
  let pointerStart = null;
  listen(canvas, 'pointerdown', event => {
    if (event.isPrimary && event.button === 0) pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    if (event.pointerType !== 'mouse') {
      const box = canvas.getBoundingClientRect();
      targetPointer.set((event.clientX - box.left) / box.width * 2 - 1, (event.clientY - box.top) / box.height * 2 - 1);
    }
  }, { passive: true });
  listen(canvas, 'pointercancel', () => { pointerStart = null; targetPointer.set(0, 0); });
  listen(canvas, 'pointerup', event => {
    const startPoint = pointerStart;
    pointerStart = null;
    if (!model || !startPoint || startPoint.id !== event.pointerId || Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) > 8) return;
    const box = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - box.left) / box.width * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1), camera);
    if (raycaster.intersectObject(model, true).length) react('jump');
  });
  listen(canvas, 'keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); react('jump'); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); controls.rotateLeft(event.key === 'ArrowLeft' ? 0.3 : -0.3); controls.update(); render(); }
  });
  listen($('jump'), 'click', () => react('jump'));
  listen($('spin'), 'click', () => react('spin'));
  listen($('look'), 'click', () => { following = !following; if (!following) resetPose(); updateState(); });
  listen($('pause'), 'click', () => { paused = !paused; if (paused) resetPose(); updateState(); });
  listen($('orbit'), 'click', () => {
    orbiting = !orbiting; controls.enabled = orbiting;
    canvas.style.touchAction = orbiting ? 'none' : 'pan-y';
    $('orbit').setAttribute('aria-pressed', String(orbiting));
    $('orbit').textContent = orbiting ? 'Terminar vista 360°' : 'Explorar 360°';
    $('stage-caption').textContent = orbiting ? 'Arrastra para girar. Termina la vista 360° para deslizar la página.' : 'Tu ciberasistente, desde otro ángulo.';
  });
  listen($('camera-left'), 'click', () => { controls.rotateLeft(0.35); controls.update(); render(); });
  listen($('camera-right'), 'click', () => { controls.rotateLeft(-0.35); controls.update(); render(); });
  listen($('reset'), 'click', () => { resetPose(); fitCamera(true); render(); });
  listen($('model-file'), 'change', importFile);
  listen($('restore-model'), 'click', loadDefault);
  listen($('rig'), 'click', () => {
    if (!model) return;
    if (!skeletonHelper) { skeletonHelper = new THREE.SkeletonHelper(model); skeletonHelper.material.depthTest = false; skeletonHelper.renderOrder = 10; scene.add(skeletonHelper); }
    else skeletonHelper.visible = !skeletonHelper.visible;
    $('rig').setAttribute('aria-pressed', String(skeletonHelper.visible));
    $('rig').textContent = skeletonHelper.visible ? 'Ocultar articulaciones' : 'Ver articulaciones';
    render();
  });
  listen(document, 'visibilitychange', updateState);
  listen(reducedMotion, 'change', () => { resetPose(); updateState(); });
  listen(canvas, 'webglcontextlost', event => {
    event.preventDefault(); contextLost = true; stage.dataset.ready = 'false'; updateState();
    status('La vista 3D se ha pausado porque el navegador liberó la memoria gráfica. Conservamos la imagen.');
  });
  listen(canvas, 'webglcontextrestored', () => {
    contextLost = false; stage.dataset.ready = model ? 'true' : 'false'; resize(); updateState();
    status('Vista 3D recuperada.');
  });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateState(); }, { threshold: 0.01 });
  visibilityObserver.observe(stage);
  listen(window, 'pagehide', event => {
    if (frame) cancelAnimationFrame(frame);
    if (event.persisted) return;
    loadSequence++;
    listenerController.abort(); resizeObserver.disconnect(); visibilityObserver.disconnect();
    controls.dispose(); mixer?.stopAllAction(); disposeModel(scene); renderer.dispose();
  });
  listen(window, 'pageshow', () => updateState());
  resize();
  loadDefault();
}

start();
