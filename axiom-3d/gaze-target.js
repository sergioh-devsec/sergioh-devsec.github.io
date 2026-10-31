import * as THREE from './vendor/three/build/three.module.js';

const finiteVector = value => value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
const clamp = (value, limit = 1) => THREE.MathUtils.clamp(value, -limit, limit);

/**
 * Projects a pointer onto the head's camera-facing plane. The caller supplies
 * canvas NDC (+Y up) and a stable, neutral head position in world coordinates.
 * The returned anatomical offset is [-1,1], with +Y down for headPitch.
 * Smoothing, pointer expiry and motion preferences remain with the viewer.
 */
export function createGazeTarget() {
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const normal = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const viewHead = new THREE.Vector3();
  const inverseOrientation = new THREE.Quaternion();
  const pointer = new THREE.Vector2();

  return {
    resolve(camera, modelRoot, headWorldPosition, pointerNDC, out = new THREE.Vector2()) {
      out.set(0, 0);
      if (!(camera?.isPerspectiveCamera || camera?.isOrthographicCamera) || !modelRoot?.isObject3D
        || !finiteVector(headWorldPosition) || !Number.isFinite(pointerNDC?.x) || !Number.isFinite(pointerNDC?.y)) return out;

      camera.updateWorldMatrix(true, false);
      modelRoot.updateWorldMatrix(true, false);
      viewHead.copy(headWorldPosition).applyMatrix4(camera.matrixWorldInverse);
      const depth = -viewHead.z;
      if (!Number.isFinite(depth) || depth <= 1e-5) return out;
      const projection = camera.projectionMatrix.elements;
      const distance = camera.isPerspectiveCamera ? depth : 1;
      const halfWidth = distance / Math.abs(projection[0]);
      const halfHeight = distance / Math.abs(projection[5]);
      if (!Number.isFinite(halfWidth) || !Number.isFinite(halfHeight) || halfWidth < 1e-5 || halfHeight < 1e-5) return out;

      camera.getWorldDirection(normal);
      plane.setFromNormalAndCoplanarPoint(normal, headWorldPosition);
      // A cursor may be outside the canvas while remaining inside the page.
      // Keep it directional, but avoid unbounded projection values.
      pointer.set(clamp(pointerNDC.x, 8), clamp(pointerNDC.y, 8));
      raycaster.setFromCamera(pointer, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return out;

      // Use character axes rather than screen axes: orbiting to the back reverses
      // anatomical left/right smoothly, without forcing a full neck rotation.
      modelRoot.getWorldQuaternion(inverseOrientation).invert();
      offset.subVectors(hit, headWorldPosition).applyQuaternion(inverseOrientation);
      if (!finiteVector(offset)) return out;
      return out.set(clamp(offset.x / halfWidth), clamp(-offset.y / halfHeight));
    },
  };
}
