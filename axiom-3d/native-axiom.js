import * as THREE from './vendor/three/build/three.module.js';

// Playback for the artist-supplied Mixamo rig. Geometry, skin weights, textures
// and source clips remain untouched. Small gestures operate on the real bones.
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const FADE_SECONDS = .24;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, low, high) => THREE.MathUtils.clamp(finite(value), low, high);
const smooth = value => { const p = clamp(value, 0, 1); return p * p * (3 - 2 * p); };
const normalized = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const PARTS = Object.freeze({
  Hips: 'Hips', Spine: 'Spine', Chest: 'Spine2', Neck: 'Neck', Head: 'Head',
  ShoulderL: 'LeftShoulder', ShoulderR: 'RightShoulder', UpperArmL: 'LeftArm', UpperArmR: 'RightArm',
  ElbowL: 'LeftForeArm', ElbowR: 'RightForeArm', WristL: 'LeftHand', WristR: 'RightHand',
  HipL: 'LeftUpLeg', HipR: 'RightUpLeg', KneeL: 'LeftLeg', KneeR: 'RightLeg',
  AnkleL: 'LeftFoot', AnkleR: 'RightFoot', FootL: 'LeftToeBase', FootR: 'RightToeBase',
});
const JOINTS = Object.freeze({
  headYaw: ['Head', 'y', -.42, .42], headPitch: ['Head', 'x', -.25, .25],
  torsoPitch: ['Chest', 'x', -.20, .23], pelvisYaw: ['Hips', 'y', -.21, .21],
  shoulderLX: ['UpperArmL', 'x', -.45, .45], shoulderRX: ['UpperArmR', 'x', -.61, .61],
  shoulderLY: ['UpperArmL', 'y', -.25, .25], shoulderRY: ['UpperArmR', 'y', -.95, .95],
  shoulderLZ: ['UpperArmL', 'z', -.32, .32], shoulderRZ: ['UpperArmR', 'z', -.53, .53],
  elbowL: ['ElbowL', 'x', -.18, .70, -1], elbowR: ['ElbowR', 'x', -.18, .79, -1],
  wristL: ['WristL', 'x', -.18, .18], wristR: ['WristR', 'x', -.39, .39],
  hipL: ['HipL', 'x', -.70, .70], hipR: ['HipR', 'x', -.70, .70],
  kneeL: ['KneeL', 'x', 0, 1.31], kneeR: ['KneeR', 'x', 0, 1.31],
  ankleL: ['AnkleL', 'x', -.44, .44], ankleR: ['AnkleR', 'x', -.44, .44],
});
const ROOT_POSE = Object.freeze({ rootY: 0, rootYaw: 0, rootPitch: 0, rootRoll: 0, rootScaleXZ: 1, rootScaleY: 1 });

/** Returns null for old static companions and unrelated/custom rig types. */
export function createNativeAxiom(gltf) {
  const root = gltf?.scene;
  if (!root?.isObject3D || !Array.isArray(gltf.animations)) return null;
  const nodes = [], meshes = [], allBones = [];
  root.traverse(node => {
    nodes.push(node);
    if (node.isBone) allBones.push(node);
    if (node.isSkinnedMesh) meshes.push(node);
  });
  if (!meshes.length || allBones.length < 20) return null;
  const bones = {};
  for (const [key, suffix] of Object.entries(PARTS)) {
    bones[key] = allBones.find(node => normalized(node.name) === `mixamorig${normalized(suffix)}`);
  }
  if (['Hips', 'Head', 'Chest', 'UpperArmL', 'UpperArmR', 'ElbowL', 'ElbowR', 'HipL', 'HipR', 'KneeL', 'KneeR'].some(key => !bones[key])) return null;
  const clips = gltf.animations.filter(clip => clip?.isAnimationClip !== false && typeof clip?.name === 'string'
    && Number.isFinite(clip.duration) && clip.duration > 0 && Array.isArray(clip.tracks) && clip.tracks.length);
  if (!clips.length || new Set(clips.map(clip => clip.name)).size !== clips.length) return null;
  const byName = new Map(clips.map(clip => [clip.name, clip]));
  const findClip = pattern => clips.find(clip => pattern.test(clip.name)) || null;
  const run = findClip(/^run(?:\.|$)/i);
  const boxing = findClip(/^box_01(?:\.|$)/i);
  const clap = findClip(/^clap(?:\.|$)/i);
  const angry = findClip(/^angry_01(?:\.|$)/i);
  const furious = findClip(/^angry_02(?:\.|$)/i);
  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map(clips.map(clip => [clip.name, mixer.clipAction(clip)]));
  const rest = new Map(allBones.map(bone => [bone, {
    position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
  }]));
  root.updateWorldMatrix(true, true);
  const initialBounds = new THREE.Box3().setFromObject(root);
  const size = initialBounds.getSize(new THREE.Vector3());
  const scaleToViewer = 3.2 / Math.max(size.x * 1.05, size.y, size.z * 1.05, .001);
  const rootQuaternion = new THREE.Quaternion(), parentQuaternion = new THREE.Quaternion();
  const rotation = new THREE.Quaternion(), axis = new THREE.Vector3(), point = new THREE.Vector3();
  const initialFeet = Object.fromEntries(['L', 'R'].map(side => {
    const foot = bones[`Ankle${side}`];
    return [side, foot ? root.worldToLocal(foot.getWorldPosition(new THREE.Vector3())).y : 0];
  }));
  let disposed = false, active = null, custom = null, queue = null, queueNumber = 0;
  let lastMood = 'neutral', lastLocomotion = 'idle', lastAction = null;

  function resetBones() {
    for (const [bone, pose] of rest) {
      bone.position.copy(pose.position); bone.quaternion.copy(pose.quaternion); bone.scale.copy(pose.scale);
    }
  }

  // The bone's local axes differ between arms/legs. Express adjustments in the
  // model's frame, convert into the parent's frame, and compose with its pose.
  function rotate(key, direction, radians) {
    const bone = bones[key];
    if (!bone || !radians) return;
    root.getWorldQuaternion(rootQuaternion);
    bone.parent.getWorldQuaternion(parentQuaternion).invert();
    axis.copy(AXES[direction]).applyQuaternion(rootQuaternion).applyQuaternion(parentQuaternion).normalize();
    bone.quaternion.premultiply(rotation.setFromAxisAngle(axis, radians));
  }

  function transition(clip, loop = false) {
    const next = clip ? actions.get(clip.name) : null;
    if (active === next && (!next || next.loop === (loop ? THREE.LoopRepeat : THREE.LoopOnce))) return;
    for (const item of actions.values()) if (item !== next && item.isScheduled()) item.fadeOut(FADE_SECONDS);
    active = next;
    if (next) {
      next.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      next.clampWhenFinished = !loop;
      next.enabled = true; next.setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(FADE_SECONDS).play();
    }
  }

  function finished(event) {
    if (event.action !== active || event.action.loop !== THREE.LoopOnce) return;
    if (custom?.action === active) custom = null;
    transition(null);
  }
  mixer.addEventListener('finished', finished);

  function select(options) {
    const mood = ['neutral', 'happy', 'calm', 'angry', 'furious'].includes(options.mood) ? options.mood : 'neutral';
    const locomotion = ['walk', 'run'].includes(options.locomotion) ? options.locomotion : 'idle';
    const action = options.action && ['wave', 'jump', 'spin', 'attack'].includes(options.action.type) ? options.action : null;
    const manual = options.manualPose instanceof Map && options.manualPose.size > 0;
    const moodChanged = mood !== lastMood, locomotionChanged = locomotion !== lastLocomotion;
    const actionStarted = action && action !== lastAction;
    if (moodChanged || locomotionChanged || actionStarted || manual) {
      custom = null;
      transition(null);
    }
    if (queue && !manual && !actionStarted) {
      const clip = byName.get(queue.name);
      transition(clip);
      custom = { action: active, token: queue.token };
      queue = null;
    } else if (manual) {
      queue = null;
    } else if (actionStarted && action.type === 'attack' && boxing) transition(boxing);
    else if (!action && !custom) {
      if (locomotion === 'run' && run) transition(run, true);
      else if (locomotionChanged || (active && active.loop === THREE.LoopRepeat)) transition(null);
      if (moodChanged && locomotion === 'idle') {
        const clip = mood === 'happy' ? clap : mood === 'angry' ? angry : mood === 'furious' ? furious : null;
        transition(clip);
      }
    }
    lastMood = mood; lastLocomotion = locomotion; lastAction = action;
    return { mood, locomotion, action, manual };
  }

  function advance(delta, elapsed, options = {}, preview = false) {
    if (disposed) return { ...ROOT_POSE };
    const dt = clamp(delta, 0, .1), t = Math.max(0, finite(elapsed));
    resetBones();
    const selected = select(options && typeof options === 'object' ? options : {});
    if (preview && active) {
      for (const item of actions.values()) {
        item.stopFading(); item.setEffectiveWeight(item === active ? 1 : 0);
      }
      active.time = Math.min(active.getClip().duration * .42, active.getClip().duration - .001);
    }
    mixer.update(preview ? 0 : dt);
    const nativeWeight = clamp([...actions.values()].reduce((sum, item) => sum + (item.enabled && item.isScheduled() ? item.getEffectiveWeight() : 0), 0), 0, 1);
    const procedural = 1 - nativeWeight;
    const pose = { ...ROOT_POSE };
    const calm = selected.mood === 'calm';
    const breath = Math.sin(t * (calm ? 1.05 : 1.5));
    // Ease the source A-pose into relaxed arms; retain its hands, skin weights,
    // tail and face exactly. Breathing is articulated rather than whole-mesh squash.
    rotate('UpperArmL', 'z', (-.32 + breath * .008) * procedural);
    rotate('UpperArmR', 'z', (.32 - breath * .008) * procedural);
    rotate('ElbowL', 'x', -.08 * procedural); rotate('ElbowR', 'x', -.10 * procedural);
    rotate('Chest', 'x', breath * .009 * procedural);
    rotate('Spine', 'z', Math.sin(t * .73) * .008 * procedural);

    if (selected.locomotion === 'walk' && !selected.action && !custom) {
      const phase = t * 5.0;
      for (const [side, offset] of [['L', 0], ['R', Math.PI]]) {
        const swing = Math.sin(phase + offset);
        rotate(`Hip${side}`, 'x', swing * .24 * procedural);
        rotate(`Knee${side}`, 'x', Math.max(0, -swing) * .45 * procedural);
        rotate(`Ankle${side}`, 'x', (-swing * .18 - Math.max(0, -swing) * .24) * procedural);
        rotate(`UpperArm${side}`, 'x', -swing * .17 * procedural);
      }
      rotate('Hips', 'y', Math.sin(phase) * .025 * procedural);
      root.updateWorldMatrix(true, true);
      const lowest = Math.min(...['L', 'R'].map(side => {
        const foot = bones[`Ankle${side}`];
        return foot ? root.worldToLocal(foot.getWorldPosition(point)).y - initialFeet[side] : 0;
      }));
      pose.rootY = clamp(-lowest * scaleToViewer, -.15, .15) * procedural;
    }

    const action = selected.action;
    if (action) {
      const p = clamp(finite(action.time) / Math.max(.01, finite(action.duration, duration(action.type))), 0, 1);
      const envelope = Math.sin(p * Math.PI) ** 2;
      if (action.type === 'wave') {
        // Raise anatomical right hand and bend its actual elbow, then wave.
        rotate('UpperArmR', 'z', -1.55 * envelope * procedural);
        rotate('ElbowR', 'x', -.75 * envelope * procedural);
        rotate('WristR', 'z', Math.sin(p * Math.PI * 8) * .18 * envelope * procedural);
        rotate('Head', 'z', -.04 * envelope * procedural);
      } else if (action.type === 'jump') {
        const crouch = p < .22 ? smooth(p / .22) * .22 : p > .78 ? (1 - smooth((p - .78) / .22)) * .14 : 0;
        const air = p > .22 && p < .78 ? Math.sin((p - .22) / .56 * Math.PI) : 0;
        for (const side of ['L', 'R']) {
          rotate(`Hip${side}`, 'x', -crouch * .5 * procedural);
          rotate(`Knee${side}`, 'x', (crouch + air * .20) * procedural);
          rotate(`Ankle${side}`, 'x', -(crouch * .5 + air * .10) * procedural);
        }
        pose.rootY = .38 * air - crouch * .15;
      } else if (action.type === 'spin') pose.rootYaw = smooth(p) * Math.PI * 2;
    }

    const pointer = options?.pointer || {};
    const focus = clamp(pointer.attention, 0, 1);
    const yaw = clamp(pointer.x, -1, 1) * .23;
    const pitch = clamp(pointer.y, -1, 1) * -.14;
    // Gaze is a small additive offset even while source clips animate the head.
    rotate('Neck', 'y', yaw * .35); rotate('Head', 'y', yaw * .65);
    rotate('Neck', 'x', pitch * .35); rotate('Head', 'x', pitch * .65);
    rotate('Head', 'z', Math.sin(t * .61) * .014 * (1 - focus) * procedural);
    const manualPose = options?.manualPose;
    const manualBones = new Set();
    if (manualPose instanceof Map) for (const [key, value] of manualPose) {
      if (!Object.hasOwn(JOINTS, key)) continue;
      const definition = JOINTS[key];
      if (!definition) continue;
      const [part, direction, low, high, sign = 1] = definition;
      if (!bones[part]) continue;
      // Replace this bone's procedural/clip rotation; repeat calls never accumulate.
      if (!manualBones.has(part)) {
        bones[part].quaternion.copy(rest.get(bones[part]).quaternion); manualBones.add(part);
      }
      rotate(part, direction, clamp(value, low, high) * sign);
    }
    root.updateWorldMatrix(true, true);
    return pose;
  }

  function duration(type) {
    return type === 'attack' ? (boxing?.duration || 1.2)
      : type === 'wave' ? 2.25 : type === 'jump' ? 1.35 : type === 'spin' ? 1.6 : 0;
  }

  function reset() {
    if (disposed) return;
    mixer.stopAllAction(); resetBones(); active = null; custom = null; queue = null;
    lastMood = 'neutral'; lastLocomotion = 'idle'; lastAction = null;
    root.updateWorldMatrix(true, true);
  }

  const summary = Object.freeze({ native: true, bones: allBones.length, skins: meshes.length,
    animations: clips.length, facialMorphs: meshes.reduce((sum, mesh) => sum + (mesh.morphTargetInfluences?.length || 0), 0),
    independentTail: false });
  return {
    bones, summary, clipNames: Object.freeze(clips.map(clip => clip.name)), duration,
    get activeClipName() { return active?.getClip().name || null; },
    supportsJoint(key) { return Object.hasOwn(JOINTS, key) && Boolean(bones[JOINTS[key][0]]); },
    playClip(name) {
      if (name === null && !disposed) { queue = null; custom = null; transition(null); return true; }
      if (disposed || !byName.has(name)) return false;
      queue = { name, token: ++queueNumber }; return true;
    },
    update(delta, elapsed, options) { return advance(delta, elapsed, options); },
    preview(elapsed, options) { return advance(0, elapsed, options, true); },
    reset,
    dispose() {
      if (disposed) return;
      reset(); mixer.removeEventListener('finished', finished); mixer.uncacheRoot(root); disposed = true;
    },
  };
}
