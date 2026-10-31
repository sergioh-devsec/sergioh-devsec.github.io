import * as THREE from './vendor/three/build/three.module.js';

// These profiles describe the neutral, already-posed meshes supplied for the
// studio. They are deliberately bounded web rigs, not general auto-rigging.
// Coordinates are relative to a character whose neutral height is 3.2 units.
const PROFILES = Object.freeze({
  axiom: { x: 0.20, z: 0.48, neck: 1.82, arm: [0.62, 1.59, 0.55], armStart: 0.67, armEnd: 1.05, armTop: 1.78, armGain: 1, tailStart: -0.10 },
  atlas: { x: 0.18, z: 0.46, neck: 1.89, arm: [0.55, 1.57, 0.68], armStart: 0.65, armEnd: 0.95, armTop: 1.76, armGain: 0.30, tailStart: -0.18 },
  iris: { x: 0.02, z: -0.12, neck: 1.91, arm: [0.40, 1.62, 0.10], armStart: 0.50, armEnd: 0.78, armTop: 1.99, armGain: 0.20, tailStart: -0.48 },
  kernel: { x: 0.02, z: 0.83, neck: 1.80, arm: [0.42, 1.52, 1.13], armStart: 0.52, armEnd: 0.85, armTop: 1.76, armGain: 0.24, tailStart: 0.22 },
  luma: { x: 0.03, z: 0.47, neck: 1.77, arm: [0.43, 1.48, 0.65], armStart: 0.54, armEnd: 0.91, armTop: 1.68, armGain: 0.24, tailStart: -0.05 },
  nexus: { x: 0.15, z: 0.43, neck: 1.83, arm: [0.53, 1.51, 0.70], armStart: 0.65, armEnd: 0.98, armTop: 1.78, armGain: 0.24, tailStart: -0.13 },
  nova: { x: -0.15, z: 0.86, neck: 1.86, arm: [-0.55, 1.55, 1.03], armStart: 0.55, armEnd: 0.85, armTop: 1.76, armGain: -0.24, tailStart: 0.22 },
  vector: { x: -0.04, z: 0.90, neck: 1.83, arm: [0.46, 1.49, 1.18], armStart: 0.55, armEnd: 0.87, armTop: 1.75, armGain: 0.22, tailStart: 0.30 },
});

const smooth = THREE.MathUtils.smoothstep;
const finite = (value, low, high) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, low, high);

function influenceAt(x, y, z, profile, character) {
  const upper = smooth(y, 0.74, 1.38);
  const head = smooth(y, profile.neck - 0.12, profile.neck + 0.19);
  // The back-facing tail is separated from boots and legs by depth, never just
  // by height. Its upper cutoff also keeps ears/hair out of the tail chain.
  const tail = (1 - smooth(z, profile.tailStart - 0.30, profile.tailStart + 0.04))
    * (1 - smooth(y, 1.43, 1.69));
  const tip = tail * (1 - smooth(z, profile.tailStart - 0.84, profile.tailStart - 0.34));
  const side = profile.armGain < 0 ? -x : x;
  const arm = smooth(side, profile.armStart, profile.armEnd)
    * smooth(y, 0.92, 1.15) * (1 - smooth(y, profile.armTop - 0.10, profile.armTop))
    * smooth(z, profile.z - 0.28, profile.z + 0.05) * (1 - tail);
  const hand = character === 'axiom' ? arm * smooth(x, 1.10, 1.29) : 0;
  const normal = 1 - tail;
  const body = normal * (1 - arm);
  return [body * (1 - upper), body * upper * (1 - head), body * upper * head,
    arm - hand, hand, tail - tip, tip];
}

/**
 * Gives supplied meshes independent anatomical movement without replacing their
 * geometry or painted appearance. No network, external textures or extra assets.
 * Call before playing imported clips, only for one of the supplied characters.
 * `dispose` releases skeleton data; the caller still owns mesh/material cleanup.
 */
export function createLivingRig(root, character) {
  const profile = PROFILES[character];
  if (!profile || !root?.isObject3D) return null;
  root.updateWorldMatrix(true, true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const originals = [];
  root.traverse(node => { if (node.isMesh && node.geometry?.attributes.position) originals.push(node); });
  if (!originals.length) return null;

  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  const transforms = new Map();
  for (const mesh of originals) {
    const matrix = new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld);
    transforms.set(mesh, matrix);
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) bounds.expandByPoint(point.fromBufferAttribute(positions, i).applyMatrix4(matrix));
  }
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) return null;
  const unit = height / 3.2;
  const floor = bounds.min.y;
  const at = (x, y, z) => new THREE.Vector3(x * unit, floor + y * unit, z * unit);
  const bones = Array.from({ length: 7 }, (_, index) => {
    const bone = new THREE.Bone();
    bone.name = ['LivingRoot', 'LivingChest', 'LivingHead', 'LivingArm', 'LivingHand', 'LivingTail', 'LivingTailTip'][index];
    return bone;
  });
  const positions = [at(0, 0, 0), at(profile.x, 1.14, profile.z), at(profile.x, profile.neck, profile.z),
    at(...profile.arm), at(1.14, 1.40, 0.73), at(profile.x, 0.91, profile.tailStart),
    at(profile.x, 0.85, profile.tailStart - 0.59)];
  const parents = [-1, 0, 1, 1, 3, 0, 5];
  bones.forEach((bone, index) => {
    bone.position.copy(positions[index]);
    if (parents[index] >= 0) {
      bone.position.sub(positions[parents[index]]);
      bones[parents[index]].add(bone);
    }
  });
  const rigGroup = new THREE.Group(); rigGroup.name = 'LivingWebRig'; rigGroup.add(bones[0]); root.add(rigGroup);
  root.updateWorldMatrix(true, true);
  const skeleton = new THREE.Skeleton(bones);
  const stats = { bones: bones.length, meshes: 0, headVertices: 0, armVertices: 0, tailVertices: 0 };
  const oldGeometries = new Set(), oldSkeletons = new Set();
  for (const original of originals) {
    const geometry = original.geometry.clone().applyMatrix4(transforms.get(original));
    const attribute = geometry.attributes.position;
    const indices = new Uint16Array(attribute.count * 4);
    const weights = new Float32Array(attribute.count * 4);
    for (let index = 0; index < attribute.count; index++) {
      const values = influenceAt(attribute.getX(index) / unit, (attribute.getY(index) - floor) / unit,
        attribute.getZ(index) / unit, profile, character);
      const sorted = values.map((weight, bone) => ({ weight, bone })).sort((a, b) => b.weight - a.weight).slice(0, 4);
      const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
      sorted.forEach((entry, slot) => { indices[index * 4 + slot] = entry.bone; weights[index * 4 + slot] = entry.weight / total; });
      if (values[2] > 0.5) stats.headVertices++;
      if (values[3] + values[4] > 0.5) stats.armVertices++;
      if (values[5] + values[6] > 0.5) stats.tailVertices++;
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, original.material);
    mesh.name = original.name; mesh.castShadow = original.castShadow; mesh.receiveShadow = original.receiveShadow;
    mesh.renderOrder = original.renderOrder; mesh.visible = original.visible;
    root.add(mesh); root.updateWorldMatrix(true, true); mesh.bind(skeleton);
    // The viewer fits the full character including its generous motion margin.
    // Dynamic limb movement should not be culled using a neutral-pose bound.
    mesh.frustumCulled = false;
    oldGeometries.add(original.geometry);
    if (original.skeleton) oldSkeletons.add(original.skeleton);
    original.removeFromParent(); stats.meshes++;
  }
  // Original bones are no longer used. Keep unrelated metadata/scene groups.
  for (const old of oldSkeletons) for (const bone of old.bones) if (bone.parent && !bone.parent.isBone) bone.removeFromParent();
  oldGeometries.forEach(geometry => geometry.dispose());
  oldSkeletons.forEach(old => old.dispose());
  const rest = bones.map(bone => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }));
  let disposed = false;
  function reset() {
    bones.forEach((bone, index) => { bone.position.copy(rest[index].position); bone.quaternion.copy(rest[index].quaternion); bone.scale.copy(rest[index].scale); });
  }
  function apply(pose = {}) {
    if (disposed) return;
    reset();
    const breath = finite(pose.breath, -1, 1);
    bones[1].rotation.z = finite(pose.bodySway, -0.045, 0.045);
    bones[1].scale.set(1 + breath * 0.010, 1 + breath * 0.012, 1 + breath * 0.014);
    bones[1].position.y += breath * unit * 0.012;
    bones[2].rotation.set(finite(pose.headPitch, -0.12, 0.12), finite(pose.headYaw, -0.28, 0.28), finite(pose.headRoll, -0.075, 0.075), 'YXZ');
    const wave = finite(pose.wave, 0, 0.55) * profile.armGain;
    bones[3].rotation.z = wave;
    bones[3].rotation.x = -Math.abs(wave) * 0.12;
    bones[4].rotation.y = character === 'axiom' ? finite(pose.handWiggle, -0.12, 0.12) : 0;
    bones[5].rotation.y = finite(pose.tail, -0.13, 0.13);
    bones[6].rotation.y = finite(pose.tail, -0.13, 0.13) * 0.75;
  }
  return {
    apply, reset, stats: Object.freeze(stats),
    dispose() { if (!disposed) { disposed = true; skeleton.dispose(); } },
  };
}
