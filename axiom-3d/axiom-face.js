import * as THREE from './vendor/three/build/three.module.js';

// Facial landmarks fitted to the supplied Axiom mesh (3.2 units tall). The
// source is a posed, textured scan, so its two eyes have different normals.
// Shape keys deform the actual painted surface before skeletal skinning. They
// deliberately do not replace its eyes, recolour its face or fetch any assets.
const EYES = Object.freeze([
  { x: -.025, y: 2.255, z: 1.015, nx: .08, nz: .997, rx: .205, ry: .185 },
  { x: .785, y: 2.255, z: .700, nx: .72, nz: .694, rx: .175, ry: .185 },
]);
const MOUTH = Object.freeze({ x: .365, y: 1.945, z: 1.055 });
const TARGETS = ['blink', 'gazeX', 'gazeY', 'smile', 'jawOpen', 'anger', 'calm'];
const clamp = (n, min = 0, max = 1) => THREE.MathUtils.clamp(Number.isFinite(n) ? n : 0, min, max);
const smooth = THREE.MathUtils.smoothstep;
const bell = (value, radius) => 1 - smooth(Math.abs(value), radius * .42, radius);

function shapeDelta(x, y, z, shape, unit) {
  x /= unit; y /= unit; z /= unit;
  let dx = 0, dy = 0, dz = 0;
  // A hard outside bound keeps joints, jacket, hands and frills unchanged.
  if (y < 1.72 || y > 2.65 || z < .40 || x < -.40 || x > 1.03) return [0, 0, 0];
  for (const eye of EYES) {
    const ex = x - eye.x, ey = y - eye.y, ez = z - eye.z;
    const tangent = ex * eye.nz - ez * eye.nx;
    const depth = ex * eye.nx + ez * eye.nz;
    const distance = Math.hypot(tangent / eye.rx, ey / eye.ry);
    const front = smooth(depth, -.205, -.09) * (1 - smooth(depth, .24, .38));
    const lid = (1 - smooth(distance, .88, 1.48)) * front;
    const pupil = (1 - smooth(distance, .44, 1.08)) * front;
    if (shape === 'blink') {
      // Compress each eye aperture into its natural lid seam. The surrounding
      // skin follows with a smooth falloff, preventing a detached eyelid mask.
      dy -= ey * .965 * lid;
      const retreat = -.018 * lid * Math.max(0, 1 - distance);
      dx += eye.nx * retreat; dz += eye.nz * retreat;
    } else if (shape === 'gazeX') {
      dx += .030 * pupil * eye.nz; dz -= .030 * pupil * eye.nx;
    } else if (shape === 'gazeY') {
      dy += .025 * pupil;
    } else if (shape === 'calm') {
      dy -= .060 * lid * smooth(ey, -.04, .13);
      dy += .016 * lid * (1 - smooth(ey, -.13, .02));
    } else if (shape === 'smile') {
      dy += .024 * lid * (1 - smooth(ey, -.10, .06));
    } else if (shape === 'anger') {
      const inward = eye.x < MOUTH.x ? tangent : -tangent;
      const upper = smooth(ey, -.015, .12);
      dy -= (.022 + .074 * smooth(inward, -.13, .13)) * lid * upper;
      // The upper rim leans inward instead of drawing a new eyebrow over skin.
      dx += (eye.x < MOUTH.x ? .010 : -.010) * lid * upper;
    }
  }
  // Fit the mouth in the face's oblique local plane, not an axis-aligned oval.
  const mx = x - MOUTH.x, my = y - MOUTH.y, mz = z - MOUTH.z;
  const horizontal = mx * .93 - mz * .368;
  const depth = mx * .368 + mz * .93;
  const faceFront = smooth(depth, -.25, -.08) * (1 - smooth(depth, .29, .42));
  const mouthWidth = bell(horizontal, .66);
  if (shape === 'jawOpen') {
    const jaw = (1 - smooth(my, -.005, .065)) * smooth(y, 1.72, 1.82)
      * bell(horizontal, .68) * faceFront;
    dy -= .105 * jaw;
    dx += .006 * jaw; dz += .016 * jaw;
    // Upper lip movement makes the opening a gesture, not a rigid chin drop.
    dy += .010 * mouthWidth * bell(my - .025, .065) * faceFront;
  } else if (shape === 'smile') {
    const corner = smooth(Math.abs(horizontal), .16, .42) * mouthWidth
      * bell(my, .18) * faceFront;
    dy += .062 * corner;
    dx += Math.sign(horizontal) * .023 * corner;
    // A little cheek lift connects mouth and eyes anatomically.
    dy += .014 * bell(my - .15, .17) * mouthWidth * faceFront;
  } else if (shape === 'anger') {
    const corner = smooth(Math.abs(horizontal), .13, .40) * mouthWidth
      * bell(my, .16) * faceFront;
    dy -= .035 * corner;
    dz += .009 * mouthWidth * bell(my, .12) * faceFront;
  }
  return [dx * unit, dy * unit, dz * unit];
}

// The source has UV seams with duplicated vertices but custom smooth normals.
// Rebuilding normals from the separated triangles creates visible white facets
// around the lips. Transform its original normals by the local shape Jacobian
// instead, preserving the artist's smoothing across those texture seams.
function transformNormal(x, y, z, nx, ny, nz, name, unit, matrix, vector) {
  const step = .0005 * unit;
  const derivatives = [];
  for (let axis = 0; axis < 3; axis++) {
    const plus = [x, y, z], minus = [x, y, z];
    plus[axis] += step; minus[axis] -= step;
    const a = shapeDelta(...plus, name, unit), b = shapeDelta(...minus, name, unit);
    derivatives.push(a.map((value, component) => (value - b[component]) / (step * 2) + (axis === component ? 1 : 0)));
  }
  matrix.set(
    derivatives[0][0], derivatives[1][0], derivatives[2][0],
    derivatives[0][1], derivatives[1][1], derivatives[2][1],
    derivatives[0][2], derivatives[1][2], derivatives[2][2],
  );
  if (Math.abs(matrix.determinant()) < 1e-7) return [nx, ny, nz];
  matrix.invert().transpose();
  return vector.set(nx, ny, nz).applyMatrix3(matrix).normalize().toArray();
}

/** Axiom-only facial shapes; call after createAxiomBodyRig(). */
export function createAxiomFace(root, bodyRig) {
  if (!root?.isObject3D || !bodyRig?.bones?.Head || !bodyRig?.meshes?.length) return null;
  const meshes = bodyRig.meshes.filter(mesh => mesh.isSkinnedMesh && mesh.geometry?.attributes.position);
  if (!meshes.length) return null;
  const unit = bodyRig.unit || 1;
  const records = [];
  const counts = Object.fromEntries(TARGETS.map(key => [key, 0]));
  let disposed = false;
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    // Retain imported shape keys if a later model revision brings its own rig.
    const oldPosition = geometry.morphAttributes.position || [];
    const oldNormal = geometry.morphAttributes.normal || [];
    const previousRelative = geometry.morphTargetsRelative;
    const oldInfluences = mesh.morphTargetInfluences?.slice() || [];
    // Absolute shape keys are universal, including future meshes with keys.
    const source = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    const positionTargets = [...oldPosition], normalTargets = [...oldNormal];
    while (normalTargets.length < oldPosition.length) {
      normalTargets.push(new THREE.BufferAttribute(previousRelative ? new Float32Array(source.count * 3) : normal.array.slice(), 3));
    }
    const slots = {};
    const normalMatrix = new THREE.Matrix3(), normalVector = new THREE.Vector3();
    for (const name of TARGETS) {
      const values = new Float32Array(source.count * 3);
      const affected = new Uint8Array(source.count);
      for (let i = 0; i < source.count; i++) {
        const x = source.getX(i), y = source.getY(i), z = source.getZ(i);
        const delta = shapeDelta(x, y, z, name, unit);
        if (Math.abs(delta[0]) + Math.abs(delta[1]) + Math.abs(delta[2]) > 1e-7) { counts[name]++; affected[i] = 1; }
        values[i * 3] = delta[0] + (previousRelative ? 0 : x);
        values[i * 3 + 1] = delta[1] + (previousRelative ? 0 : y);
        values[i * 3 + 2] = delta[2] + (previousRelative ? 0 : z);
      }
      const attribute = new THREE.BufferAttribute(values, 3);
      attribute.name = `AxiomFace_${name}`;
      slots[name] = positionTargets.length;
      positionTargets.push(attribute);
      const normals = new Float32Array(source.count * 3);
      for (let i = 0; i < source.count; i++) {
        const original = normal ? [normal.getX(i), normal.getY(i), normal.getZ(i)] : [0, 0, 1];
        const transformed = affected[i]
          ? transformNormal(source.getX(i), source.getY(i), source.getZ(i), ...original, name, unit, normalMatrix, normalVector)
          : original;
        for (let k = 0; k < 3; k++) normals[i * 3 + k] = transformed[k] - (previousRelative ? original[k] : 0);
      }
      normalTargets.push(new THREE.BufferAttribute(normals, 3));
    }
    geometry.morphAttributes.position = positionTargets;
    geometry.morphAttributes.normal = normalTargets;
    mesh.updateMorphTargets();
    oldInfluences.forEach((value, i) => { mesh.morphTargetInfluences[i] = value; });
    // The source's tiny facial displacement is inside its existing body bounds.
    records.push({ mesh, slots, oldPosition, oldNormal, oldInfluences, previousRelative });
  }
  function reset() {
    if (disposed) return;
    for (const { mesh, slots } of records) for (const slot of Object.values(slots)) mesh.morphTargetInfluences[slot] = 0;
  }
  function apply(pose = {}) {
    if (disposed) return;
    const blink = clamp(pose.blink);
    const anger = Math.max(clamp(pose.anger), clamp(pose.furious));
    const values = {
      blink,
      gazeX: clamp(pose.gazeX, -1, 1) * (1 - blink),
      gazeY: clamp(pose.gazeY, -1, 1) * (1 - blink),
      smile: clamp(pose.smile) * (1 - anger),
      jawOpen: clamp(pose.jawOpen),
      anger: anger * (1 - blink * .7),
      calm: clamp(pose.calm) * (1 - blink) * (1 - anger),
    };
    for (const { mesh, slots } of records) for (const [key, value] of Object.entries(values)) mesh.morphTargetInfluences[slots[key]] = value;
  }
  return {
    apply, reset,
    stats: Object.freeze({ ...counts, shapeCount: TARGETS.length, meshCount: records.length, sourceAppearancePreserved: true }),
    dispose() {
      if (disposed) return;
      reset();
      for (const { mesh, oldPosition, oldNormal, oldInfluences, previousRelative } of records) {
        mesh.geometry.morphAttributes.position = oldPosition;
        mesh.geometry.morphAttributes.normal = oldNormal;
        mesh.geometry.morphTargetsRelative = previousRelative;
        mesh.updateMorphTargets();
        oldInfluences.forEach((value, i) => { mesh.morphTargetInfluences[i] = value; });
      }
      disposed = true;
    },
  };
}
