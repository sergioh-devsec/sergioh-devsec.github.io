import * as THREE from './vendor/three/build/three.module.js';

// Anatomical web rig calibrated to the supplied, already-posed Axiom mesh.
// It preserves the original painted geometry. It is not an auto-rigger for
// arbitrary imports, and fingers fused to the tablet are kept together.
const JOINTS = [
  ['Root', null, [0, 0, 0]],
  ['Pelvis', 'Root', [.25, .78, .46]],
  ['Spine', 'Pelvis', [.23, 1.05, .47]],
  ['Chest', 'Spine', [.23, 1.43, .47]],
  ['Neck', 'Chest', [.20, 1.72, .48]],
  ['Head', 'Neck', [.20, 1.84, .48]],
  ['ShoulderL', 'Chest', [-.15, 1.58, .66]],
  ['UpperArmL', 'ShoulderL', [-.28, 1.49, .71]],
  ['ElbowL', 'UpperArmL', [-.39, 1.11, .88]],
  ['WristL', 'ElbowL', [-.34, 1.01, 1.04]],
  ['ShoulderR', 'Chest', [.65, 1.53, .23]],
  ['UpperArmR', 'ShoulderR', [.76, 1.40, .25]],
  ['ElbowR', 'UpperArmR', [.92, 1.10, .36]],
  ['WristR', 'ElbowR', [1.19, 1.22, .46]],
  ['HipL', 'Pelvis', [.04, .69, .69]],
  ['KneeL', 'HipL', [-.02, .37, .72]],
  ['AnkleL', 'KneeL', [-.06, .15, .75]],
  ['FootL', 'AnkleL', [-.03, .08, .85]],
  ['HipR', 'Pelvis', [.47, .69, .25]],
  ['KneeR', 'HipR', [.48, .37, .22]],
  ['AnkleR', 'KneeR', [.46, .15, .20]],
  ['FootR', 'AnkleR', [.52, .08, .31]],
  ['Tail', 'Pelvis', [.10, .79, .10]],
  ['TailMid', 'Tail', [-.45, .43, -.60]],
  ['TailTip', 'TailMid', [-1.10, .55, -1.10]],
];
const INDEX = Object.fromEntries(JOINTS.map(([name], index) => [name, index]));
const smooth = THREE.MathUtils.smoothstep;
const clamp = (value, min, max) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, min, max);
// The original model faces diagonally; these are its actual lateral/forward axes.
const LATERAL = new THREE.Vector3(.9, 0, -.436).normalize();
const FORWARD = new THREE.Vector3(.436, 0, .9).normalize();
const UP = new THREE.Vector3(0, 1, 0);

function tabletAt(x, y, z) {
  // Oriented bounds measured from the detached front plate and its rigid frame.
  // This also carries the fingers that grip it, without pulling the jacket.
  const dx = x + .17448334, dy = y - 1.20006866, dz = z - 1.08473576;
  const depth = dx * -.30802843 + dy * -.15526646 + dz * .93862176;
  const width = dx * .80109502 + dy * .48985731 + dz * .34392816;
  const height = dx * -.51319124 + dy * .85786487 + dz * -.02650679;
  return Math.abs(depth) < .105 && Math.abs(width) < .345 && Math.abs(height) < .445;
}

function influences(x, y, z) {
  const result = new Float64Array(JOINTS.length);
  const put = (name, weight) => { result[INDEX[name]] += Math.max(0, weight); };
  if (tabletAt(x, y, z)) { put('WristL', 1); return result; }
  const side = x * .9 - z * .436;
  const depth = x * .436 + z * .9;
  // Tail depth separation protects the legs and boots, even when seen head-on.
  const tail = (1 - smooth(depth, -.08, .18)) * (1 - smooth(y, 1.20, 1.52));
  const tailMid = 1 - smooth(depth, -.85, -.22);
  const tailTip = 1 - smooth(depth, -1.48, -.90);
  put('Tail', tail * (1 - tailMid));
  put('TailMid', tail * tailMid * (1 - tailTip));
  put('TailTip', tail * tailMid * tailTip);
  const body = 1 - tail;

  const armHeight = smooth(y, .79, .96) * (1 - smooth(y, 1.53, 1.70));
  const armDepth = smooth(depth, .12, .32);
  const leftArm = smooth(-side, .38, .61) * armHeight * armDepth;
  const rightArm = smooth(side, .40, .66) * armHeight * armDepth;
  const arms = Math.min(1, leftArm + rightArm);
  const assignArm = (suffix, amount) => {
    const shoulder = smooth(y, 1.35, 1.57);
    const forearm = suffix === 'R' ? smooth(side, .54, .82) : 1 - smooth(y, 1.08, 1.28);
    const hand = suffix === 'R' ? smooth(side, .83, 1.00) : smooth(depth, .72, .90) * (1 - smooth(y, 1.09, 1.22));
    put(`Shoulder${suffix}`, amount * shoulder * .30 * (1 - forearm));
    put(`UpperArm${suffix}`, amount * (1 - shoulder * .30) * (1 - forearm));
    put(`Elbow${suffix}`, amount * forearm * (1 - hand));
    put(`Wrist${suffix}`, amount * forearm * hand);
  };
  assignArm('L', body * leftArm);
  assignArm('R', body * rightArm);

  const trunk = body * (1 - arms);
  const legs = 1 - smooth(y, .55, .74);
  const rightLeg = smooth(side, -.045, .045);
  const assignLeg = (suffix, amount) => {
    const shin = 1 - smooth(y, .24, .52);
    const ankle = 1 - smooth(y, .14, .25);
    const foot = 1 - smooth(y, .06, .15);
    put(`Hip${suffix}`, amount * (1 - shin));
    put(`Knee${suffix}`, amount * shin * (1 - ankle));
    put(`Ankle${suffix}`, amount * shin * ankle * (1 - foot));
    put(`Foot${suffix}`, amount * shin * ankle * foot);
  };
  assignLeg('L', trunk * legs * (1 - rightLeg));
  assignLeg('R', trunk * legs * rightLeg);

  const torso = trunk * (1 - legs);
  const spine = smooth(y, .78, 1.05);
  const chest = smooth(y, 1.09, 1.43);
  const neck = smooth(y, 1.61, 1.78);
  // Low peripheral frills belong to the head rather than the upper arms.
  const fringe = smooth(Math.abs(side), .68, .94) * (1 - smooth(depth, .30, .59)) * smooth(y, 1.51, 1.72);
  // The projecting jaw is lower than the back of the head. Keep its lip/chin
  // vertices on Head so facial morphs do not stretch across the neck hinge.
  const jaw = smooth(depth, .75, .93) * smooth(y, 1.62, 1.74);
  const head = Math.max(smooth(y, 1.76, 1.96), fringe, jaw);
  put('Pelvis', torso * (1 - spine) * (1 - head));
  put('Spine', torso * spine * (1 - chest) * (1 - head));
  put('Chest', torso * spine * chest * (1 - neck) * (1 - head));
  put('Neck', torso * spine * chest * neck * (1 - head));
  put('Head', torso * head);
  return result;
}

/**
 * Replace Axiom's basic skeleton with a bounded, full-body articulation rig.
 * Pose angles are radians; positive knee bends backwards, negative hip swings
 * forward, positive elbow flexes the forearm. `apply` is stateless per frame.
 * Parent owns global translation/jumps and all mesh/material disposal.
 */
export function createAxiomBodyRig(root) {
  if (!root?.isObject3D) return null;
  root.updateWorldMatrix(true, true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const originals = [];
  root.traverse(node => { if (node.isMesh && node.geometry?.attributes.position) originals.push(node); });
  if (!originals.length) return null;
  const bounds = new THREE.Box3(), point = new THREE.Vector3(), transforms = new Map();
  for (const mesh of originals) {
    const transform = new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld);
    transforms.set(mesh, transform);
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) bounds.expandByPoint(point.fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(transform));
  }
  const unit = (bounds.max.y - bounds.min.y) / 3.2, floor = bounds.min.y;
  if (!Number.isFinite(unit) || unit <= 0) return null;
  const positions = JOINTS.map(([, , [x, y, z]]) => new THREE.Vector3(x * unit, floor + y * unit, z * unit));
  const bones = Object.fromEntries(JOINTS.map(([name]) => {
    const bone = new THREE.Bone(); bone.name = `Living${name}`;
    return [name, bone];
  }));
  JOINTS.forEach(([name, parent], index) => {
    const bone = bones[name]; bone.position.copy(positions[index]);
    if (parent) { bone.position.sub(positions[INDEX[parent]]); bones[parent].add(bone); }
  });
  const rigGroup = new THREE.Group(); rigGroup.name = 'AxiomBodyRig'; rigGroup.add(bones.Root); root.add(rigGroup);
  root.updateWorldMatrix(true, true);
  const orderedBones = JOINTS.map(([name]) => bones[name]);
  const skeleton = new THREE.Skeleton(orderedBones);
  const meshes = [], oldGeometries = new Set(), oldSkeletons = new Set();
  const stats = { bones: JOINTS.length, meshes: 0, headVertices: 0, armVertices: 0, legVertices: 0, tailVertices: 0, tabletVertices: 0 };
  for (const original of originals) {
    const geometry = original.geometry.clone().applyMatrix4(transforms.get(original));
    const positions = geometry.attributes.position;
    const indices = new Uint16Array(positions.count * 4), weights = new Float32Array(positions.count * 4);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) / unit, y = (positions.getY(i) - floor) / unit, z = positions.getZ(i) / unit;
      const values = influences(x, y, z);
      const sorted = Array.from(values, (weight, bone) => ({ weight, bone })).sort((a, b) => b.weight - a.weight).slice(0, 4);
      const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
      if (total <= 0) { sorted[0] = { bone: INDEX.Pelvis, weight: 1 }; }
      sorted.forEach((entry, slot) => { indices[i * 4 + slot] = entry.bone; weights[i * 4 + slot] = entry.weight / (total || 1); });
      if (values[INDEX.Head] > .5) stats.headVertices++;
      if (values.slice(INDEX.ShoulderL, INDEX.HipL).reduce((a, b) => a + b, 0) > .5) stats.armVertices++;
      if (values.slice(INDEX.HipL, INDEX.Tail).reduce((a, b) => a + b, 0) > .5) stats.legVertices++;
      if (values.slice(INDEX.Tail).reduce((a, b) => a + b, 0) > .5) stats.tailVertices++;
      if (tabletAt(x, y, z)) stats.tabletVertices++;
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, original.material);
    mesh.name = original.name; mesh.castShadow = original.castShadow; mesh.receiveShadow = original.receiveShadow;
    mesh.visible = original.visible; mesh.renderOrder = original.renderOrder;
    // Preserve imported morph metadata if a future supplied mesh includes it.
    if (original.morphTargetInfluences) mesh.morphTargetInfluences = [...original.morphTargetInfluences];
    if (original.morphTargetDictionary) mesh.morphTargetDictionary = { ...original.morphTargetDictionary };
    root.add(mesh); root.updateWorldMatrix(true, true); mesh.bind(skeleton); mesh.frustumCulled = false;
    meshes.push(mesh); stats.meshes++;
    oldGeometries.add(original.geometry); if (original.skeleton) oldSkeletons.add(original.skeleton);
    original.removeFromParent();
  }
  for (const old of oldSkeletons) for (const bone of old.bones) if (bone.parent && !bone.parent.isBone) bone.removeFromParent();
  oldGeometries.forEach(geometry => geometry.dispose()); oldSkeletons.forEach(old => old.dispose());
  // Sample the support envelope of both soles once. Extremal points cover heel,
  // toe and lateral edges much better than every Nth vertex; at most 64 are
  // retained, regardless of the imported mesh's vertex count.
  const soleCandidates = { L: [], R: [] };
  for (const mesh of meshes) {
    const { position: positions, skinIndex, skinWeight } = mesh.geometry.attributes;
    for (let i = 0; i < positions.count; i++) {
      if (positions.getY(i) > floor + .08 * unit) continue;
      for (const side of ['L', 'R']) {
        let weight = 0;
        for (let slot = 0; slot < 4; slot++) {
          const joint = skinIndex.getComponent(i, slot);
          if (joint === INDEX[`Ankle${side}`] || joint === INDEX[`Foot${side}`]) weight += skinWeight.getComponent(i, slot);
        }
        if (weight > .90) soleCandidates[side].push({ mesh, index: i, position: new THREE.Vector3().fromBufferAttribute(positions, i) });
      }
    }
  }
  const soles = new Set();
  for (const side of ['L', 'R']) {
    for (const inclination of [0, .50, 1.0, 1.45]) {
      for (let azimuth = 0; azimuth < 8; azimuth++) {
        const angle = azimuth * Math.PI / 4;
        const dx = Math.cos(angle) * Math.sin(inclination), dy = -Math.cos(inclination), dz = Math.sin(angle) * Math.sin(inclination);
        let best = null, maximum = -Infinity;
        for (const candidate of soleCandidates[side]) {
          const p = candidate.position, support = p.x * dx + p.y * dy + p.z * dz;
          if (support > maximum) { best = candidate; maximum = support; }
        }
        if (best) soles.add(best);
      }
    }
  }
  const soleSamples = [...soles];
  stats.groundSamples = soleSamples.length;
  const rest = orderedBones.map(bone => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }));
  const rotation = new THREE.Quaternion(); let disposed = false;
  const groundPoint = new THREE.Vector3(), groundInverse = new THREE.Matrix4();
  const rotate = (bone, axis, angle) => { rotation.setFromAxisAngle(axis, angle); bone.quaternion.multiply(rotation); };
  function reset() {
    if (disposed) return;
    orderedBones.forEach((bone, i) => { bone.position.copy(rest[i].position); bone.quaternion.copy(rest[i].quaternion); bone.scale.copy(rest[i].scale); });
  }
  function apply(pose = {}) {
    if (disposed) return;
    reset();
    rotate(bones.Pelvis, UP, clamp(pose.pelvisYaw, -.22, .22));
    rotate(bones.Pelvis, FORWARD, clamp(pose.pelvisRoll, -.12, .12));
    rotate(bones.Spine, LATERAL, clamp(pose.torsoPitch, -.20, .24));
    rotate(bones.Chest, FORWARD, clamp(pose.bodySway, -.085, .085));
    const breath = clamp(pose.breath, -1, 1);
    bones.Chest.scale.set(1 + breath * .006, 1 + breath * .008, 1 + breath * .008);
    bones.Chest.position.y += breath * unit * .004;
    // Split looking between neck and head; soft motion instead of a hinge.
    for (const [bone, fraction] of [[bones.Neck, .25], [bones.Head, .75]]) {
      rotate(bone, UP, clamp(pose.headYaw, -.42, .42) * fraction);
      rotate(bone, LATERAL, clamp(pose.headPitch, -.25, .25) * fraction);
      rotate(bone, FORWARD, clamp(pose.headRoll, -.16, .16) * fraction);
    }
    for (const suffix of ['L', 'R']) {
      const left = suffix === 'L';
      const shoulderX = clamp(pose[`shoulder${suffix}X`], left ? -.4 : -.85, left ? .4 : .85);
      const shoulderZValue = suffix === 'R' && !Number.isFinite(pose.shoulderRZ) ? pose.wave : pose[`shoulder${suffix}Z`];
      const shoulderZ = clamp(shoulderZValue, left ? -.35 : -.75, left ? .35 : .75);
      rotate(bones[`Shoulder${suffix}`], LATERAL, shoulderX * .25);
      rotate(bones[`UpperArm${suffix}`], LATERAL, shoulderX * .75);
      rotate(bones[`Shoulder${suffix}`], FORWARD, shoulderZ * .25);
      rotate(bones[`UpperArm${suffix}`], FORWARD, shoulderZ * .75);
      rotate(bones[`Elbow${suffix}`], LATERAL, -clamp(pose[`elbow${suffix}`], -.18, left ? .7 : 1.0));
      rotate(bones[`Wrist${suffix}`], LATERAL, clamp(pose[`wrist${suffix}`], left ? -.18 : -.4, left ? .18 : .4));
      if (!left) rotate(bones.WristR, UP, clamp(pose.handWiggle, -.22, .22));
      rotate(bones[`Hip${suffix}`], LATERAL, clamp(pose[`hip${suffix}`], -.75, .75));
      rotate(bones[`Hip${suffix}`], FORWARD, clamp(pose[`hip${suffix}Z`], -.22, .22));
      rotate(bones[`Knee${suffix}`], LATERAL, clamp(pose[`knee${suffix}`], 0, 1.35));
      rotate(bones[`Ankle${suffix}`], LATERAL, clamp(pose[`ankle${suffix}`], -.5, .5));
    }
    const tail = clamp(pose.tail, -.18, .18);
    rotate(bones.Tail, UP, tail * .55); rotate(bones.TailMid, UP, tail * .75); rotate(bones.TailTip, UP, tail);
  }
  /** Lift only penetrating soles; never cancel intentional run/jump flight.
   * rootY and return value use the viewer's normalized 3.2-unit character space.
   * Scene ancestors are removed from the measurement, avoiding feedback from a
   * previous-frame wrapper lift or a scaled/translated presentation container.
   */
  function groundLift(rootY = 0) {
    if (disposed || !soleSamples.length) return 0;
    root.updateWorldMatrix(true, false);
    // updateMatrixWorld also refreshes SkinnedMesh.bindMatrixInverse in attached
    // mode. Object3D.updateWorldMatrix alone does not run that override.
    root.updateMatrixWorld(true);
    skeleton.update();
    groundInverse.copy(root.matrixWorld).invert();
    let minimum = Infinity;
    for (const sample of soleSamples) {
      sample.mesh.getVertexPosition(sample.index, groundPoint);
      groundPoint.applyMatrix4(sample.mesh.matrixWorld).applyMatrix4(groundInverse);
      minimum = Math.min(minimum, (groundPoint.y - floor) / unit);
    }
    const offset = Number.isFinite(rootY) ? rootY : 0;
    return Number.isFinite(minimum) ? Math.max(0, -minimum - offset) : 0;
  }
  return {
    bones: Object.freeze(bones), meshes: Object.freeze(meshes), stats: Object.freeze(stats), apply, reset, groundLift,
    dispose() { if (!disposed) { disposed = true; skeleton.dispose(); } },
  };
}
