import * as THREE from './vendor/three/build/three.module.js';

// Secondary surface motion for the supplied Mixamo Axiom. There are no tail or
// gill bones in this model. These small morph waves preserve the original rig,
// texture, skin weights and clips; they do not imply new articulated joints.
// Compose after createNativeFace(root); dispose in reverse creation order.
const NAMES = Object.freeze(['tailSway', 'tailRipple', 'gillBreath']);
const instances = new WeakMap();
const smooth = THREE.MathUtils.smoothstep;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, lo = 0, hi = 1) => THREE.MathUtils.clamp(finite(value), lo, hi);

function displacement(x, y, z, shape) {
  if (shape === 'gillBreath') {
    // Anatomical guards exclude the face, eyes, mouth, jacket and hands.
    // All affected source vertices belong predominantly to the Head bone.
    if (Math.abs(x) <= .225 || y <= .54 || z <= .115 || z >= .39) return [0, 0, 0];
    const reach = smooth(Math.abs(x), .225, .365);
    const mask = reach * smooth(y, .54, .58) * smooth(z, .115, .15) * (1 - smooth(z, .355, .39));
    const wave = Math.sin((y - .54) * 18 + Math.abs(x) * 7);
    return [Math.sign(x) * .0045 * mask, .0018 * wave * mask, .0032 * wave * mask];
  }
  // The tail tip rises to y=.443; a flat y<.4 cutoff would tear its movement.
  // This sloping upper bound also keeps the backpack completely still.
  if (z >= .08 || y <= .045 || y >= .48) return [0, 0, 0];
  const progress = clamp((.08 - z) / .58);
  const ceiling = .30 + .18 * smooth(-z, .04, .35);
  const envelope = smooth(progress, 0, 1) * smooth(y, .045, .075)
    * (1 - smooth(y, ceiling - .025, ceiling));
  if (!envelope) return [0, 0, 0];
  const phase = progress * 3.4;
  // Quadrature shapes create a travelling bend along the existing tail, not a
  // single rigid rotation. The maximum geometric delta is 2.4% of mesh height.
  const wave = shape === 'tailSway' ? Math.sin(phase) : Math.cos(phase);
  return [.021 * wave * envelope, .002 * wave * envelope, 0];
}

function normalDelta(x, y, z, original, shape, matrix, vector) {
  const step = .00005, columns = [];
  for (let axis = 0; axis < 3; axis++) {
    const a = [x, y, z], b = [x, y, z]; a[axis] += step; b[axis] -= step;
    const plus = displacement(...a, shape), minus = displacement(...b, shape);
    columns.push(plus.map((value, component) => (value - minus[component]) / (2 * step) + (axis === component ? 1 : 0)));
  }
  matrix.set(columns[0][0], columns[1][0], columns[2][0],
    columns[0][1], columns[1][1], columns[2][1],
    columns[0][2], columns[1][2], columns[2][2]);
  if (Math.abs(matrix.determinant()) < 1e-8) return original;
  return vector.fromArray(original).applyMatrix3(matrix.invert().transpose()).normalize().toArray();
}

/** Append bounded tail/gill waves without replacing previously added morphs. */
export function createNativeSecondary(root) {
  if (!root?.isObject3D) return null;
  if (instances.has(root)) return instances.get(root);
  let mesh;
  root.traverse(node => {
    if (node.isSkinnedMesh && node.geometry?.attributes.position?.count === 45043
      && node.skeleton?.bones.some(bone => /^mixamorig[:_]?head$/i.test(bone.name))) mesh = node;
  });
  if (!mesh?.geometry.attributes.normal) return null;
  const originalGeometry = mesh.geometry;
  // Existing facial morphs can enlarge bounds slightly, so validate the source
  // positions instead of morph-expanded min/max values.
  const sourceBounds = new THREE.Box3().setFromBufferAttribute(originalGeometry.attributes.position);
  if (Math.abs(sourceBounds.max.y - .89306647) > .001 || Math.abs(sourceBounds.min.z + .49975589) > .001) return null;
  const originalInfluences = mesh.morphTargetInfluences, originalDictionary = mesh.morphTargetDictionary;
  const geometry = originalGeometry.clone(), position = geometry.attributes.position, normal = geometry.attributes.normal;
  const relative = geometry.morphTargetsRelative;
  const positionTargets = [...geometry.morphAttributes.position || []];
  const normalTargets = [...geometry.morphAttributes.normal || []];
  while (normalTargets.length < positionTargets.length) {
    normalTargets.push(new THREE.BufferAttribute(relative ? new Float32Array(normal.count * 3) : normal.array.slice(), 3));
  }
  const slots = {}, affectedVertices = {}, matrix = new THREE.Matrix3(), vector = new THREE.Vector3();
  for (const name of NAMES) {
    const positions = new Float32Array(position.count * 3), normals = new Float32Array(position.count * 3);
    let count = 0;
    for (let i = 0; i < position.count; i++) {
      const p = [position.getX(i), position.getY(i), position.getZ(i)];
      const n = [normal.getX(i), normal.getY(i), normal.getZ(i)];
      const delta = displacement(...p, name);
      const changed = delta.some(value => Math.abs(value) > 1e-12);
      const transformed = changed ? normalDelta(...p, n, name, matrix, vector) : n;
      if (changed) count++;
      for (let k = 0; k < 3; k++) {
        positions[i * 3 + k] = delta[k] + (relative ? 0 : p[k]);
        normals[i * 3 + k] = transformed[k] - (relative ? n[k] : 0);
      }
    }
    const attribute = new THREE.BufferAttribute(positions, 3); attribute.name = `NativeAxiom_${name}`;
    slots[name] = positionTargets.length;
    positionTargets.push(attribute); normalTargets.push(new THREE.BufferAttribute(normals, 3));
    affectedVertices[name] = count;
  }
  geometry.morphAttributes.position = positionTargets; geometry.morphAttributes.normal = normalTargets;
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  mesh.geometry = geometry; mesh.updateMorphTargets();
  originalInfluences?.forEach((value, i) => { mesh.morphTargetInfluences[i] = value; });
  let disposed = false;
  function reset() {
    if (disposed || mesh.geometry !== geometry) return;
    for (const slot of Object.values(slots)) mesh.morphTargetInfluences[slot] = 0;
  }
  function apply(options = {}) {
    if (disposed || mesh.geometry !== geometry) return;
    options = options && typeof options === 'object' ? options : {};
    if (options.paused) return; // Freeze the last pose; reset() explicitly clears it.
    const time = finite(options.time) % 10000;
    const energy = finite(({ calm: .52, happy: 1.12, angry: .95, furious: 1.22 })[options.mood], 1);
    const voice = options.speaking ? clamp(options.level) : 0;
    const phase = time * 1.65;
    mesh.morphTargetInfluences[slots.tailSway] = Math.sin(phase) * .55 * energy;
    mesh.morphTargetInfluences[slots.tailRipple] = Math.cos(phase) * .55 * energy;
    mesh.morphTargetInfluences[slots.gillBreath] = (Math.sin(time * 2.1) * .55 + voice * .18) * energy;
  }
  const api = {
    apply, reset, targets: Object.freeze(slots),
    stats: Object.freeze({ affectedVertices: Object.freeze(affectedVertices), shapeCount: NAMES.length,
      independentTailJoint: false, newBones: 0 }),
    dispose() {
      if (disposed) return;
      if (mesh.geometry === geometry) {
        // Face updates have occurred on this clone; retain its latest pose when
        // handing ownership back to the previous controller.
        originalInfluences?.forEach((_, i) => { originalInfluences[i] = mesh.morphTargetInfluences[i]; });
        mesh.geometry = originalGeometry;
        mesh.morphTargetInfluences = originalInfluences; mesh.morphTargetDictionary = originalDictionary;
      }
      geometry.dispose(); instances.delete(root); disposed = true;
    },
  };
  instances.set(root, api);
  return api;
}
