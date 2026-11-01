import * as THREE from './vendor/three/build/three.module.js';

// Landmarks belong to axiom-animated.glb in its original mesh coordinates,
// before Mixamo skinning. They must not be reused for the older static models.
// Every gesture deforms the existing painted face: no replacement eyes, teeth,
// eyebrow overlays or remote resources. The source mouth has no inner cavity.
const EYES = Object.freeze([
  Object.freeze({ x: -.128, y: .642, z: .434, nx: -.14, nz: .990, rx: .044, ry: .046 }),
  Object.freeze({ x: .125, y: .643, z: .436, nx: .14, nz: .990, rx: .044, ry: .046 }),
]);
const NAMES = Object.freeze(['blink', 'gazeX', 'gazeY', 'smile', 'jawOpen', 'anger']);
const TARGETS = Object.freeze(Object.fromEntries(NAMES.map((name, index) => [name, index])));
const instances = new WeakMap();
const smooth = THREE.MathUtils.smoothstep;
const clamp = (value, low = 0, high = 1) => THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, low, high);
const bell = (value, radius) => 1 - smooth(Math.abs(value), radius * .45, radius);

function deltaAt(x, y, z, shape) {
  // Includes a smooth guard inside the hard bound: clothing, gills, rear skull,
  // neck and limbs remain exactly unchanged, even with exaggerated input.
  if (y < .48 || y > .76 || z < .32 || Math.abs(x) > .225) return [0, 0, 0];
  const face = smooth(y, .48, .505) * (1 - smooth(y, .735, .76))
    * smooth(z, .32, .385) * (1 - smooth(Math.abs(x), .20, .225));
  let dx = 0, dy = 0, dz = 0;
  for (const eye of EYES) {
    const ex = x - eye.x, ey = y - eye.y, ez = z - eye.z;
    const tangent = ex * eye.nz - ez * eye.nx;
    const depth = ex * eye.nx + ez * eye.nz;
    const radius = Math.hypot(tangent / eye.rx, ey / eye.ry);
    const front = smooth(depth, -.058, -.025) * (1 - smooth(depth, .045, .085));
    const lid = (1 - smooth(radius, .96, 1.65)) * front;
    const pupil = (1 - smooth(radius, .52, 1.20)) * front;
    if (shape === 'blink') {
      dy -= ey * .965 * lid;
      const retreat = -.010 * lid * Math.max(0, 1 - radius);
      dx += eye.nx * retreat; dz += eye.nz * retreat;
    } else if (shape === 'gazeX') {
      dx += .0048 * pupil * eye.nz; dz -= .0048 * pupil * eye.nx;
    } else if (shape === 'gazeY') {
      dy += .0037 * pupil;
    } else if (shape === 'smile') {
      dy += .0034 * lid * (1 - smooth(ey, -.025, .011));
    } else if (shape === 'anger') {
      const inward = eye.x < 0 ? tangent : -tangent;
      const upper = smooth(ey, -.004, .030);
      dy -= (.003 + .012 * smooth(inward, -.035, .035)) * lid * upper;
      dx += (eye.x < 0 ? .0018 : -.0018) * lid * upper;
    }
  }
  const mouthLine = .548 + .013 * smooth(Math.abs(x), .07, .155);
  const my = y - mouthLine;
  const mouthFront = smooth(z, .35, .413);
  const width = bell(x, .19);
  if (shape === 'jawOpen') {
    // A small lower-lip/chin stretch provides an amplitude-driven speaking
    // gesture. A sealed mesh cannot produce true phonemes or an open cavity.
    const jaw = (1 - smooth(my, -.002, .012)) * smooth(y, .493, .522)
      * bell(x, .18) * mouthFront;
    dy -= .011 * jaw;
    dz += .0015 * jaw;
    dy += .0016 * width * bell(my - .012, .018) * mouthFront;
  } else if (shape === 'smile') {
    const corner = smooth(Math.abs(x), .040, .125) * width * bell(my, .041) * mouthFront;
    dy += .0085 * corner;
    dx += Math.sign(x) * .0030 * corner;
    dy += .0016 * width * bell(my - .040, .035) * mouthFront;
  } else if (shape === 'anger') {
    const corner = smooth(Math.abs(x), .045, .125) * width * bell(my, .036) * mouthFront;
    dy -= .0045 * corner;
    dz += .0013 * width * bell(my, .032) * mouthFront;
  }
  return [dx * face, dy * face, dz * face];
}

// Recomputing normals on the imported UV seams creates white facets. Preserve
// the source smoothing by applying the deformation's inverse-transpose Jacobian
// to each original normal. This is calculated once, not on every animation tick.
function normalAt(x, y, z, nx, ny, nz, shape, matrix, vector) {
  const step = .00005, columns = [];
  for (let axis = 0; axis < 3; axis++) {
    const a = [x, y, z], b = [x, y, z]; a[axis] += step; b[axis] -= step;
    const plus = deltaAt(...a, shape), minus = deltaAt(...b, shape);
    columns.push(plus.map((value, component) => (value - minus[component]) / (2 * step) + (axis === component ? 1 : 0)));
  }
  matrix.set(columns[0][0], columns[1][0], columns[2][0],
    columns[0][1], columns[1][1], columns[2][1],
    columns[0][2], columns[1][2], columns[2][2]);
  if (Math.abs(matrix.determinant()) < 1e-8) return [nx, ny, nz];
  return vector.set(nx, ny, nz).applyMatrix3(matrix.invert().transpose()).normalize().toArray();
}

/** Facial motion for the supplied native Axiom only. Returns null otherwise. */
export function createNativeFace(root) {
  if (!root?.isObject3D) return null;
  if (instances.has(root)) return instances.get(root);
  let mesh;
  root.traverse(node => {
    if (node.isSkinnedMesh && node.geometry?.attributes.position?.count === 45043
      && node.skeleton?.bones.some(bone => /^mixamorig[:_]?head$/i.test(bone.name))) mesh = node;
  });
  if (!mesh?.geometry.attributes.normal || mesh.geometry.morphAttributes.position?.length) return null;
  const originalGeometry = mesh.geometry;
  const bounds = originalGeometry.boundingBox || new THREE.Box3().setFromBufferAttribute(originalGeometry.attributes.position);
  if (Math.abs(bounds.max.y - .89306647) > .001 || Math.abs(bounds.min.y) > .001
    || Math.abs(bounds.max.z - .49975586) > .001) return null;
  const originalInfluences = mesh.morphTargetInfluences;
  const originalDictionary = mesh.morphTargetDictionary;
  const geometry = originalGeometry.clone();
  const source = geometry.attributes.position, normals = geometry.attributes.normal;
  const matrix = new THREE.Matrix3(), vector = new THREE.Vector3();
  const positionTargets = [], normalTargets = [], affectedVertices = {};
  for (const name of NAMES) {
    const positions = new Float32Array(source.count * 3), normalDeltas = new Float32Array(source.count * 3);
    let affected = 0;
    for (let i = 0; i < source.count; i++) {
      const x = source.getX(i), y = source.getY(i), z = source.getZ(i);
      const delta = deltaAt(x, y, z, name);
      positions.set(delta, i * 3);
      if (Math.abs(delta[0]) + Math.abs(delta[1]) + Math.abs(delta[2]) < 1e-12) continue;
      affected++;
      const original = [normals.getX(i), normals.getY(i), normals.getZ(i)];
      const transformed = normalAt(x, y, z, ...original, name, matrix, vector);
      for (let j = 0; j < 3; j++) normalDeltas[i * 3 + j] = transformed[j] - original[j];
    }
    const attribute = new THREE.BufferAttribute(positions, 3); attribute.name = `NativeAxiom_${name}`;
    positionTargets.push(attribute); normalTargets.push(new THREE.BufferAttribute(normalDeltas, 3));
    affectedVertices[name] = affected;
  }
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = positionTargets;
  geometry.morphAttributes.normal = normalTargets;
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  mesh.geometry = geometry; mesh.updateMorphTargets();
  let disposed = false;
  function reset() {
    if (disposed) return;
    for (let i = 0; i < NAMES.length; i++) mesh.morphTargetInfluences[i] = 0;
  }
  function apply(pose = {}) {
    if (disposed) return;
    pose = pose && typeof pose === 'object' ? pose : {};
    const blink = clamp(pose.blink), anger = clamp(pose.anger);
    const values = [blink, clamp(pose.gazeX, -1, 1) * (1 - blink),
      clamp(pose.gazeY, -1, 1) * (1 - blink), clamp(pose.smile) * (1 - anger) * (1 - blink * .85),
      clamp(pose.jawOpen), anger * (1 - blink)];
    for (let i = 0; i < values.length; i++) mesh.morphTargetInfluences[i] = values[i];
  }
  const api = {
    apply, reset, targets: TARGETS,
    stats: Object.freeze({ affectedVertices: Object.freeze(affectedVertices), shapeCount: NAMES.length,
      sourceMouthHasCavity: false, meshCount: 1 }),
    dispose() {
      if (disposed) return;
      reset();
      mesh.geometry = originalGeometry;
      mesh.morphTargetInfluences = originalInfluences;
      mesh.morphTargetDictionary = originalDictionary;
      geometry.dispose();
      instances.delete(root); disposed = true;
    },
  };
  instances.set(root, api);
  return api;
}
