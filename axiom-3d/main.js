import * as THREE from './vendor/three/build/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';
import { validateGLB, validateGLTF, MAX_MODEL_BYTES } from './model-policy.js';
import { createLivingRig } from './living-rig.js';
import { sampleLivingPose, ACTION_DURATIONS } from './living-motion.js?v=attention-1';
import { createGazeTarget } from './gaze-target.js';
import { createAxiomBodyRig } from './axiom-body-rig.js';
import { createAxiomFace } from './axiom-face.js';
import { sampleAxiomPerformance, AXIOM_ACTION_DURATIONS } from './axiom-performance.js';

// Locally converted user-supplied models. Only the selected character is fetched.
const CHARACTERS = Object.freeze({
  axiom: { name: 'Axiom', role: 'El ciberasistente de Serch', color: 0x67e5de },
  atlas: { name: 'Atlas', role: 'Parte de la familia del laboratorio', color: 0x9cc9f1 },
  iris: { name: 'Iris', role: 'Parte de la familia del laboratorio', color: 0xd5b1ed },
  kernel: { name: 'Kernel', role: 'Parte de la familia del laboratorio', color: 0xf0bb88 },
  luma: { name: 'Luma', role: 'Parte de la familia del laboratorio', color: 0xf2df99 },
  nexus: { name: 'Nexus', role: 'Parte de la familia del laboratorio', color: 0x9bafe8 },
  nova: { name: 'Nova', role: 'Parte de la familia del laboratorio', color: 0xefabb9 },
  vector: { name: 'Vector', role: 'Parte de la familia del laboratorio', color: 0xa8d9a9 },
});
const BONE_NAMES = {
  head: ['LivingHead', 'Head', 'head', 'mixamorigHead', 'CC_Base_Head'],
  left: ['Eye_L', 'LeftEye', 'EyeLeft', 'mixamorigLeftEye'],
  right: ['Eye_R', 'RightEye', 'EyeRight', 'mixamorigRightEye'],
};
const $ = id => document.getElementById(id);
const stage = $('axiom-container');
const canvas = $('axiom-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const buttons = [...document.querySelectorAll('#viewer-controls button, .view-controls button, #rig')];
const status = text => { $('status').textContent = text; };
let renderer, scene, camera, controls, model, mixer, skeletonHelper, livingRig, axiomFace;
let axiomActive = false, mood = 'neutral', locomotion = 'idle', blendedPose = null;
let closeUp = false;
const manualPose = new Map();
let head, chest, eyes = [], tracked = [], loadSequence = 0;
let selectedCharacter = 'axiom', displayName = 'Axiom', loading = false, ring, fill;
let pendingFetch;
let paused = false, following = true, orbiting = true, dragging = false, visible = true, contextLost = false;
let frame = 0, previousTime = 0, elapsed = 0, action = null;
let fitDistance = 6, modelHeight = 3.2, modelRadius = 2.13;
const targetPointer = new THREE.Vector2();
const smoothPointer = new THREE.Vector2();
const pointerNDC = new THREE.Vector2();
const headAnchor = new THREE.Vector3();
const headWorld = new THREE.Vector3();
const gazeTarget = createGazeTarget();
const pointerSample = { x: 0, y: 0, until: 0 };
let attention = 0;
const raycaster = new THREE.Raycaster();
const offsetQuaternion = new THREE.Quaternion();
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const motionRoot = new THREE.Group();
const listenerController = new AbortController();
const listen = (node, type, handler, options = {}) => node.addEventListener(type, handler, { ...options, signal: listenerController.signal });
const mayAnimate = () => model && !paused && !reducedMotion.matches && visible && !document.hidden && !contextLost;
const narrowView = matchMedia('(max-width: 760px)');
function placePerformancePanel() {
  const panel = $('axiom-performance');
  if (narrowView.matches) document.querySelector('.interaction-deck').insertBefore(panel, $('interaction-hint'));
  else document.querySelector('.intro').insertBefore(panel, document.querySelector('.intro-note'));
}
placePerformancePanel();
listen(narrowView, 'change', placePerformancePanel);

// Fixed, bounded controls; no visitor-provided code or model instructions.
const JOINT_CONTROLS = [
  ['face.blink', 'Cerrar los ojos', 0, 100], ['face.jawOpen', 'Abrir la boca', 0, 100],
  ['headYaw', 'Girar la cabeza', -24, 24], ['headPitch', 'Inclinar la cabeza', -14, 14],
  ['torsoPitch', 'Inclinar el torso', -11, 13], ['pelvisYaw', 'Girar la cintura', -12, 12],
  ['shoulderLX', 'Hombro de la tablet', -25, 25], ['shoulderRX', 'Hombro libre', -35, 35],
  ['shoulderLZ', 'Abrir brazo de la tablet', -18, 18], ['shoulderRZ', 'Abrir brazo libre', -30, 30],
  ['elbowL', 'Codo de la tablet', -10, 40], ['elbowR', 'Codo libre', -10, 45],
  ['wristL', 'Muñeca de la tablet', -10, 10], ['wristR', 'Muñeca libre', -22, 22],
  ['hipL', 'Cadera izquierda', -40, 40], ['hipR', 'Cadera derecha', -40, 40],
  ['kneeL', 'Rodilla izquierda', 0, 75], ['kneeR', 'Rodilla derecha', 0, 75],
  ['ankleL', 'Tobillo izquierdo', -25, 25], ['ankleR', 'Tobillo derecho', -25, 25],
  ['tail', 'Cola', -10, 10],
];
for (const [key, text, min, max] of JOINT_CONTROLS) {
  const label = document.createElement('label');
  const title = document.createElement('span'); title.textContent = text;
  const input = document.createElement('input');
  input.type = 'range'; input.min = String(min); input.max = String(max); input.step = '1'; input.value = '0';
  input.dataset.joint = key; input.id = `joint-${key.replace('.', '-')}`;
  const output = document.createElement('output'); output.htmlFor = input.id; output.value = '0';
  label.append(title, input, output); $('joint-controls').append(label);
}

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
  textures.forEach(item => { item.dispose(); item.image?.close?.(); });
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
  controls.target.set(0, modelHeight * (closeUp ? 0.69 : 0.49), 0);
  camera.position.copy(controls.target).addScaledVector(direction, fitDistance * (closeUp ? 0.56 : 1));
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
  livingRig?.reset();
  axiomFace?.reset();
  blendedPose = null;
  for (const entry of tracked) entry.node.quaternion.copy(entry.rest);
  motionRoot.position.set(0, 0, 0);
  motionRoot.rotation.set(0, 0, 0);
  motionRoot.scale.set(1, 1, 1);
  action = null;
  canvas.dataset.action = 'idle';
  smoothPointer.set(0, 0);
  pointerSample.until = 0;
  attention = 0;
  render();
}

function applyPerformance(pose, delta = 0, immediate = false) {
  // Blend mode changes without damping footsteps or short blinks into a blur.
  const blend = immediate || !blendedPose ? 1 : 1 - Math.exp(-Math.max(delta, 0) * 16);
  if (!blendedPose) blendedPose = { ...pose, face: { ...pose.face } };
  for (const [key, value] of Object.entries(pose)) {
    if (typeof value === 'number') blendedPose[key] = (blendedPose[key] ?? value) + (value - (blendedPose[key] ?? value)) * blend;
  }
  blendedPose.face ||= {};
  for (const [key, value] of Object.entries(pose.face || {})) {
    const old = blendedPose.face[key] ?? value;
    blendedPose.face[key] = key === 'blink' ? value : old + (value - old) * blend;
  }
  const output = { ...blendedPose, face: { ...blendedPose.face } };
  for (const [key, value] of manualPose) {
    if (key.startsWith('face.')) output.face[key.slice(5)] = value;
    else output[key] = value;
  }
  livingRig.apply(output);
  axiomFace?.apply(output.face);
  motionRoot.position.y = output.rootY + livingRig.groundLift(output.rootY);
  motionRoot.scale.set(output.rootScaleXZ, output.rootScaleY, output.rootScaleXZ);
  motionRoot.rotation.set(output.rootPitch, output.rootYaw, output.rootRoll);
}

function previewPerformance() {
  if (!axiomActive || !model) return;
  const pose = sampleAxiomPerformance(elapsed || 0.8, { mood, locomotion, pointer: smoothPointer, action: null });
  applyPerformance(pose, 0, true);
  render();
}

function updatePerformanceControls() {
  $('axiom-performance').hidden = !axiomActive;
  $('attack').hidden = !axiomActive;
  document.querySelectorAll('[data-mood]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mood === mood)));
  document.querySelectorAll('[data-locomotion]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.locomotion === locomotion)));
  canvas.dataset.mood = axiomActive ? mood : '';
  canvas.dataset.locomotion = axiomActive ? locomotion : '';
}

function rememberPointer(event) {
  pointerSample.x = event.clientX;
  pointerSample.y = event.clientY;
  pointerSample.until = performance.now() + (event.pointerType === 'mouse' ? 5000 : 3500);
}

function updateState() {
  $('pause').textContent = paused ? 'Reanudar movimiento' : 'Pausar movimiento';
  $('pause').setAttribute('aria-pressed', String(paused));
  $('look').textContent = following ? 'Seguir cursor: activo' : 'Seguir cursor: apagado';
  $('look').setAttribute('aria-pressed', String(following));
  $('orbit').setAttribute('aria-pressed', String(orbiting));
  $('orbit').textContent = orbiting ? 'Arrastre 360°: activo' : 'Activar arrastre 360°';
  $('face-view').textContent = closeUp ? 'Ver cuerpo completo' : 'Ver rostro';
  $('face-view').setAttribute('aria-pressed', String(closeUp));
  $('scene-state').textContent = contextLost ? 'SIN WEBGL' : loading ? 'CARGANDO' : !model ? 'VISTA ORIGINAL' : paused || reducedMotion.matches ? 'EN REPOSO' : 'EN VIVO';
  const state = loading ? 'loading' : contextLost || !model ? 'unavailable' : paused ? 'paused' : reducedMotion.matches ? 'reduced' : 'active';
  $('motion-note').dataset.state = state;
  $('motion-note').textContent = state === 'paused' ? 'Movimiento pausado. Pulsa «Reanudar movimiento» para verlo cobrar vida.'
    : state === 'reduced' ? 'Movimiento reducido según tu dispositivo. Puedes cambiar el ángulo manualmente.'
    : state === 'loading' ? 'Preparando a tu compañero…'
    : state === 'unavailable' ? 'Preparando la vista del personaje.'
    : `${displayName} está despierto. Observa sus gestos o invítalo a saludar.`;
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
  // Resolve a ray against the head's viewing plane, then into the model's local
  // frame. A camera orbit changes the mapping; a quiet pointer eases back to idle.
  const focus = following && !dragging && action?.type !== 'spin'
    ? THREE.MathUtils.clamp((pointerSample.until - time) / 700, 0, 1) : 0;
  targetPointer.set(0, 0);
  if (focus) {
    const box = canvas.getBoundingClientRect();
    pointerNDC.set((pointerSample.x - box.left) / Math.max(box.width, 1) * 2 - 1,
      1 - (pointerSample.y - box.top) / Math.max(box.height, 1) * 2);
    model.updateWorldMatrix(true, false);
    headWorld.copy(headAnchor).applyMatrix4(model.matrixWorld);
    gazeTarget.resolve(camera, model, headWorld, pointerNDC, targetPointer);
    targetPointer.multiplyScalar(focus);
  }
  const ease = 1 - Math.exp(-delta * 6);
  smoothPointer.lerp(targetPointer, ease);
  attention += (focus - attention) * ease;
  smoothPointer.attention = attention;
  canvas.dataset.attention = focus ? 'following' : 'idle';
  if (action) action.time += delta;
  const pose = axiomActive
    ? sampleAxiomPerformance(elapsed, { mood, locomotion, pointer: smoothPointer, action })
    : sampleLivingPose(elapsed, selectedCharacter, smoothPointer, action);
  if (axiomActive) applyPerformance(pose, delta);
  else if (livingRig) livingRig.apply(pose);
  else {
    // Imported models keep their own rig and animation tracks.
    if (head) {
      lookEuler.set(pose.headPitch, pose.headYaw, pose.headRoll);
      head.quaternion.multiply(offsetQuaternion.setFromEuler(lookEuler));
    }
    if (chest) chest.rotation.z += pose.bodySway;
    for (const eye of eyes) {
      lookEuler.set(smoothPointer.y * 0.055, smoothPointer.x * 0.10, 0);
      eye.quaternion.multiply(offsetQuaternion.setFromEuler(lookEuler));
    }
  }
  if (!axiomActive) {
    motionRoot.position.y = pose.rootY;
    motionRoot.scale.set(pose.rootScaleXZ, pose.rootScaleY, pose.rootScaleXZ);
    motionRoot.rotation.set(pose.rootPitch, pose.rootYaw, pose.rootRoll);
  }
  if (action && action.time >= action.duration) {
    action = null;
    canvas.dataset.action = 'idle';
    $('stage-caption').textContent = 'Tu próxima idea ya tiene compañía.';
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
  manualPose.clear();
  document.querySelectorAll('[data-joint]').forEach(input => { input.value = '0'; input.nextElementSibling.value = '0'; });
  action = { type, time: 0, duration: (axiomActive ? AXIOM_ACTION_DURATIONS : ACTION_DURATIONS)[type] };
  canvas.dataset.action = type;
  $('stage-caption').textContent = type === 'attack' ? '¡Preparado! Un golpe de práctica y vuelta a la calma.' : type === 'jump' ? '¡Una idea que despega!' : type === 'wave' ? '¡Qué bueno verte por aquí!' : 'Un giro para ver las cosas de otra forma.';
  status(type === 'attack' ? 'Axiom practica un ataque en el sitio.' : type === 'jump' ? `¡Salto recibido! ${displayName} responde a tu toque.` : type === 'wave' ? `${displayName} te saluda.` : `${displayName} da una vuelta completa.`);
  updateState();
}

function adoptModel(gltf, imported, character = selectedCharacter) {
  const next = gltf.scene;
  let summary = sceneSummary(next);
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
  // These eight meshes have known proportions. Unknown imports retain their rig.
  const isAxiom = !imported && character === 'axiom';
  const nextLivingRig = imported ? null : isAxiom ? createAxiomBodyRig(next) : createLivingRig(next, character);
  const nextFace = isAxiom ? createAxiomFace(next, nextLivingRig) : null;
  summary = sceneSummary(next);
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
  axiomFace?.dispose();
  livingRig?.dispose();
  disposeModel(model);
  livingRig = nextLivingRig;
  axiomFace = nextFace;
  axiomActive = isAxiom;
  closeUp = false;
  manualPose.clear();
  document.querySelectorAll('[data-joint]').forEach(input => { input.value = '0'; input.nextElementSibling.value = '0'; });
  model = wrapper;
  motionRoot.add(model);
  head = findPart(next, BONE_NAMES.head);
  model.updateWorldMatrix(true, true);
  if (head) {
    head.getWorldPosition(headAnchor);
    model.worldToLocal(headAnchor);
    headAnchor.y += size.y * 0.10;
  } else headAnchor.set(center.x, bounds.min.y + size.y * 0.75, center.z);
  chest = findPart(next, ['Chest']);
  eyes = [findPart(next, BONE_NAMES.left), findPart(next, BONE_NAMES.right)].filter(Boolean);
  tracked = livingRig ? [] : [head, chest, ...eyes].filter(Boolean).map(node => ({ node, rest: node.quaternion.clone() }));
  next.traverse(node => {
    if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
  });
  mixer = new THREE.AnimationMixer(next);
  const idle = gltf.animations?.find(clip => /idle|reposo|respir/i.test(clip.name));
  if (idle) mixer.clipAction(idle).play();
  stage.dataset.ready = 'true';
  stage.dataset.loading = 'false';
  stage.dataset.character = imported ? 'custom' : character;
  loading = false;
  displayName = imported ? 'Tu personaje' : CHARACTERS[character].name;
  $('character-name').textContent = displayName;
  $('character-role').textContent = imported ? 'Una visita al laboratorio' : CHARACTERS[character].role;
  canvas.setAttribute('aria-label', `${displayName} en 3D. Arrastra o usa las cuatro flechas para girar la vista. Enter o espacio para saltar.`);
  document.querySelectorAll('[data-character].character-option').forEach(button => button.setAttribute('aria-pressed', String(!imported && button.dataset.character === character)));
  ring.material.color.set(imported ? 0x67e5de : CHARACTERS[character].color);
  fill.color.copy(ring.material.color);
  $('model-download').hidden = imported;
  if (!imported) $('model-download').href = new URL(`./models/${character}.glb`, import.meta.url).href;
  canvas.dataset.bones = String(summary.bones);
  canvas.dataset.skins = String(summary.skins);
  canvas.dataset.action = 'idle';
  buttons.forEach(button => { button.disabled = false; });
  $('restore-model').disabled = !imported && character === 'axiom';
  $('rig').disabled = !summary.bones;
  $('rig').setAttribute('aria-pressed', 'false');
  $('rig').textContent = 'Ver articulaciones';
  $('model-label').textContent = imported ? 'Tu modelo, en este navegador' : `${displayName} · modelo del laboratorio`;
  $('model-description').textContent = imported ? 'El archivo se procesa aquí, sin subirlo a un servidor. El seguimiento depende de los nombres de sus articulaciones.' : isAxiom ? 'Axiom conserva su malla y textura originales. Este visor añade articulaciones de cuerpo y extremidades, expresiones faciales y ciclos en el sitio. El archivo descargable conserva el modelo base.' : 'Malla y textura originales con articulaciones añadidas en este visor: cabeza, torso, brazo y cola. Respiración, miradas y gestos se combinan en tiempo real. El archivo descargable conserva el modelo base.';
  $('rig-status').textContent = `${summary.bones} articulaciones · ${summary.skins} mallas con rigging · ${Math.round(summary.triangles).toLocaleString('es-MX')} triángulos.${livingRig || head ? ' Cabeza articulada.' : ' No se encontró una articulación de cabeza compatible.'}`;
  status(`${displayName} está listo. Mueve el cursor o arrastra el visor. Al seleccionarlo, las cuatro flechas giran la vista.`);
  $('stage-caption').textContent = 'Tu próxima idea ya tiene compañía.';
  resetPose();
  updatePerformanceControls();
  if (isAxiom && (paused || reducedMotion.matches)) previewPerformance();
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

async function loadCharacter(character) {
  if (!Object.hasOwn(CHARACTERS, character)) return;
  const sequence = ++loadSequence;
  pendingFetch?.abort();
  pendingFetch = new AbortController();
  loading = true;
  stage.dataset.loading = 'true';
  stage.setAttribute('aria-busy', 'true');
  status(`Preparando a ${CHARACTERS[character].name}…`);
  updateState();
  try {
    const response = await fetch(new URL(`./models/${character}.glb`, import.meta.url), { signal: pendingFetch.signal, credentials: 'omit' });
    if (!response.ok) throw new Error('El modelo no está disponible.');
    const buffer = await response.arrayBuffer();
    validateGLB(buffer);
    if (sequence !== loadSequence) return;
    const gltf = await loaderForLocalFile().parseAsync(buffer, '');
    if (sequence !== loadSequence) return disposeModel(gltf.scene);
    adoptModel(gltf, false, character);
    selectedCharacter = character;
    $('model-file').value = '';
  } catch (error) {
    if (sequence !== loadSequence) return;
    loading = false;
    stage.dataset.loading = 'false';
    updateState();
    status('No se pudo abrir ese personaje. La vista anterior sigue disponible; puedes elegirlo otra vez para reintentar.');
    console.warn('Axiom 3D: no se pudo cargar el recurso local.', error);
  } finally {
    if (sequence === loadSequence) stage.setAttribute('aria-busy', 'false');
  }
}

async function importFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const sequence = ++loadSequence;
  pendingFetch?.abort();
  loading = false;
  stage.dataset.loading = 'false';
  stage.setAttribute('aria-busy', 'false');
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
    if (sequence === loadSequence) { updateState(); status(`No se cambió el modelo. ${error instanceof SyntaxError ? 'El archivo JSON no es válido.' : error.message}`); }
  }
}

function start() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    status('Este navegador no pudo activar WebGL. Puedes ver la ilustración original y descargar el modelo.');
    $('scene-state').textContent = 'VISTA ORIGINAL';
    $('model-file').disabled = true;
    stage.dataset.loading = 'false';
    document.querySelectorAll('.character-option').forEach(button => { button.disabled = true; });
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  camera.position.set(0.5, 2, 8);
  scene.add(new THREE.AmbientLight(0xe5eef1, 1.6));
  const key = new THREE.DirectionalLight(0xffede1, 2.8);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -4;
  key.shadow.camera.right = key.shadow.camera.top = 4;
  key.shadow.camera.near = 0.1; key.shadow.camera.far = 20;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  fill = new THREE.DirectionalLight(0x72eae0, 1.6);
  fill.position.set(4, 3, -3); scene.add(fill);
  const front = new THREE.DirectionalLight(0xffffff, 0.8);
  front.position.set(3, 2, 4); scene.add(front);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.025; floor.receiveShadow = true; scene.add(floor);
  ring = new THREE.Mesh(new THREE.RingGeometry(1.34, 1.35, 80), new THREE.MeshBasicMaterial({ color: 0x61d8d1, transparent: true, opacity: 0.34, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = -0.018; scene.add(ring, motionRoot);
  controls = new OrbitControls(camera, canvas);
  controls.enabled = true;
  controls.enableZoom = false; controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = Math.PI * 0.30; controls.maxPolarAngle = Math.PI * 0.58;
  canvas.style.touchAction = 'none';
  controls.addEventListener('start', () => { dragging = true; });
  controls.addEventListener('end', () => { dragging = false; });
  controls.addEventListener('change', render);
  listen(window, 'pointermove', event => {
    if (event.pointerType === 'mouse' && !dragging) rememberPointer(event);
    else if (event.isPrimary && pointerStart && !orbiting) rememberPointer(event);
  }, { passive: true });
  listen(document.documentElement, 'pointerleave', () => { pointerSample.until = 0; });
  listen(window, 'blur', () => { pointerSample.until = 0; dragging = false; });
  let pointerStart = null;
  listen(canvas, 'pointerdown', event => {
    canvas.focus({ preventScroll: true });
    if (event.isPrimary && event.button === 0) pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    if (event.isPrimary) rememberPointer(event);
  }, { passive: true });
  listen(canvas, 'pointercancel', () => { pointerStart = null; dragging = false; pointerSample.until = 0; });
  listen(canvas, 'pointerup', event => {
    const startPoint = pointerStart;
    pointerStart = null;
    if (!model || !startPoint || startPoint.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) > 8) {
      if (orbiting) pointerSample.until = 0;
      return;
    }
    rememberPointer(event);
    const box = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - box.left) / box.width * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1), camera);
    if (raycaster.intersectObject(model, true).length) react('jump');
  });
  listen(canvas, 'keydown', event => {
    if (!model || contextLost || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) react('jump'); }
    const step = event.repeat ? 0.085 : 0.23;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); controls.rotateLeft(event.key === 'ArrowLeft' ? step : -step); render();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault(); controls.rotateUp(event.key === 'ArrowUp' ? step * 0.6 : -step * 0.6); render();
    }
  });
  listen($('jump'), 'click', () => react('jump'));
  listen($('spin'), 'click', () => react('spin'));
  listen($('wave'), 'click', () => react('wave'));
  listen($('attack'), 'click', () => react('attack'));
  listen($('face-view'), 'click', () => { closeUp = !closeUp; fitCamera(true); updateState(); render(); });
  document.querySelectorAll('[data-mood], [data-locomotion]').forEach(button => listen(button, 'click', () => {
    if (!axiomActive) return;
    if (button.dataset.mood) mood = button.dataset.mood;
    if (button.dataset.locomotion) locomotion = button.dataset.locomotion;
    action = null; canvas.dataset.action = 'idle';
    manualPose.clear();
    document.querySelectorAll('[data-joint]').forEach(input => { input.value = '0'; input.nextElementSibling.value = '0'; });
    updatePerformanceControls();
    if (paused || reducedMotion.matches) previewPerformance();
    status(`${button.textContent.trim()}. ${paused || reducedMotion.matches ? 'Vista de la pose; el movimiento continuo está desactivado.' : 'Puedes combinar una emoción con caminar o correr en el sitio.'}`);
  }));
  document.querySelectorAll('[data-joint]').forEach(input => listen(input, 'input', () => {
    if (!axiomActive) return;
    locomotion = 'idle'; action = null; canvas.dataset.action = 'idle';
    const value = Number(input.value);
    manualPose.set(input.dataset.joint, input.dataset.joint.startsWith('face.') ? value / 100 : THREE.MathUtils.degToRad(value));
    input.nextElementSibling.value = input.dataset.joint.startsWith('face.') ? `${value}%` : `${value}°`;
    updatePerformanceControls();
    previewPerformance();
  }));
  listen($('clear-pose'), 'click', () => {
    manualPose.clear();
    document.querySelectorAll('[data-joint]').forEach(input => { input.value = '0'; input.nextElementSibling.value = '0'; });
    previewPerformance(); status('Articulaciones de vuelta a la animación elegida.');
  });
  document.querySelectorAll('.character-option').forEach(button => listen(button, 'click', () => {
    loadCharacter(button.dataset.character);
    if (matchMedia('(max-width: 760px)').matches) stage.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  }));
  listen($('look'), 'click', () => { following = !following; updateState(); });
  // Pause freezes the current pose rather than abruptly snapping to a statue.
  listen($('pause'), 'click', () => { paused = !paused; updateState(); });
  listen($('orbit'), 'click', () => {
    orbiting = !orbiting; controls.enabled = orbiting;
    dragging = false;
    canvas.style.touchAction = orbiting ? 'none' : 'pan-y';
    $('stage-caption').textContent = orbiting ? 'Arrastra para girar; un toque atrae su mirada.' : 'Toca un punto del visor para que mire hacia ahí. Puedes deslizar para seguir por la página.';
    updateState();
  });
  listen($('camera-left'), 'click', () => { controls.rotateLeft(0.35); controls.update(); render(); });
  listen($('camera-right'), 'click', () => { controls.rotateLeft(-0.35); controls.update(); render(); });
  listen($('camera-up'), 'click', () => { controls.rotateUp(0.18); render(); });
  listen($('camera-down'), 'click', () => { controls.rotateUp(-0.18); render(); });
  listen($('reset'), 'click', () => { resetPose(); fitCamera(true); render(); });
  listen($('model-file'), 'change', importFile);
  listen($('restore-model'), 'click', () => loadCharacter('axiom'));
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
    pendingFetch?.abort();
    listenerController.abort(); resizeObserver.disconnect(); visibilityObserver.disconnect();
    controls.dispose(); mixer?.stopAllAction(); axiomFace?.dispose(); livingRig?.dispose(); disposeModel(scene); renderer.dispose();
  });
  listen(window, 'pageshow', () => updateState());
  resize();
  loadCharacter('axiom');
}

start();
