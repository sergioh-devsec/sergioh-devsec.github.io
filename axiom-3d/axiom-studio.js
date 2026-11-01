import * as THREE from './vendor/three/build/three.module.js';

// A small, local photographic studio. Its panels are rendered once into an
// environment map; no HDRI, image download, telemetry or background is added.
export function createStudioEnvironment(renderer, scene) {
  const previous = scene.environment;
  const room = new THREE.Scene();
  const resources = [];
  let target = null, generator = null, active = false, disposed = false;
  const panel = (width, height, position, color, strength) => {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(strength),
      side: THREE.DoubleSide, toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
    resources.push(geometry, material);
  };
  try {
    const geometry = new THREE.BoxGeometry(12, 12, 12);
    const material = new THREE.MeshBasicMaterial({
      color: 0x232a30, side: THREE.BackSide, toneMapped: false,
    });
    room.add(new THREE.Mesh(geometry, material));
    resources.push(geometry, material);
    // Large neutral sources give soft skin reflections; the smaller frontal
    // card creates a defined eye catchlight without repainting the eyes.
    panel(4.6, 5.2, [-3.7, 2.7, 3.3], 0xfff4e9, 3.0);
    panel(2.3, 3.6, [3.8, 1.2, 2.8], 0xf0f8ff, 1.9);
    panel(2.6, 2.6, [0.2, 4.4, -2.5], 0xe9ffff, 2.4);
    panel(1.1, 1.7, [-0.8, 1.7, 4.8], 0xffffff, 2.3);
    generator = new THREE.PMREMGenerator(renderer);
    target = generator.fromScene(room, 0.035, 0.1, 30, { size: 128 });
  } catch {
    target?.dispose();
    target = null;
    // Direct scene lights remain usable if the GPU cannot build an IBL map.
  } finally {
    generator?.dispose();
    resources.forEach(resource => resource.dispose());
    room.clear();
  }
  return {
    available: Boolean(target),
    setActive(value) {
      if (disposed) return;
      active = Boolean(value) && Boolean(target);
      scene.environment = active ? target.texture : previous;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (active || scene.environment === target?.texture) scene.environment = previous;
      target?.dispose();
      target = null;
    },
  };
}

// Refine the response to light, not the painted identity. This export has one
// material for skin, eyes and clothes, so a bounded rest-height + color mask
// changes only roughness: glossy dark eyes, softer skin, matte fabric.
export function enhanceAxiomMaterials(root, renderer) {
  const replacements = [];
  const originals = new Map();
  const textureSettings = new Map();
  const maximum = Math.max(1, Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1));
  let disposed = false;
  root.traverse(node => {
    if (!node.isMesh || !node.geometry?.attributes?.position) return;
    node.geometry.computeBoundingBox();
    const box = node.geometry.boundingBox;
    const bottom = box.min.y;
    const height = Math.max(box.max.y - bottom, 0.0001);
    const convert = original => {
      if (!original?.isMeshStandardMaterial) return original;
      // This asset has one mesh/material. Cache per source + height so a shared
      // texture is never cloned and stays on its original UVs and color space.
      const cacheKey = `${original.uuid}:${bottom}:${height}`;
      if (originals.has(cacheKey)) return originals.get(cacheKey);
      const material = new THREE.MeshPhysicalMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(material, original);
      material.defines = { ...material.defines, PHYSICAL: '' };
      material.name = `${original.name || 'Axiom'} · studio`;
      material.metalness = 0;
      material.roughness = 0.78;
      material.clearcoat = 0.04;
      material.clearcoatRoughness = 0.32;
      material.envMapIntensity = 0.65;
      material.onBeforeCompile = shader => {
        shader.uniforms.axiomRestBottom = { value: bottom };
        shader.uniforms.axiomRestHeight = { value: height };
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
uniform float axiomRestBottom;
uniform float axiomRestHeight;
varying float vAxiomRestHeight;`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>
vAxiomRestHeight = clamp((position.y - axiomRestBottom) / axiomRestHeight, 0.0, 1.0);`);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
varying float vAxiomRestHeight;`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
float axiomHeadMask = smoothstep(0.56, 0.66, vAxiomRestHeight);
float axiomLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
float axiomEyeMask = axiomHeadMask * (1.0 - smoothstep(0.018, 0.075, axiomLuminance));
roughnessFactor = mix(roughnessFactor, 0.56, axiomHeadMask);
roughnessFactor = mix(roughnessFactor, 0.17, axiomEyeMask);`);
      };
      material.customProgramCacheKey = () => 'axiom-studio-roughness-v1';
      for (const value of Object.values(material)) {
        if (!value?.isTexture || textureSettings.has(value)) continue;
        textureSettings.set(value, value.anisotropy);
        value.anisotropy = maximum;
        value.needsUpdate = true;
      }
      originals.set(cacheKey, material);
      return material;
    };
    const source = node.material;
    const result = Array.isArray(source) ? source.map(convert) : convert(source);
    if (result !== source) {
      replacements.push({ node, source, result });
      node.material = result;
    }
  });
  return {
    materials: originals.size,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { node, source, result } of replacements) {
        if (node.material === result) node.material = source;
      }
      for (const [texture, anisotropy] of textureSettings) {
        texture.anisotropy = anisotropy;
        texture.needsUpdate = true;
      }
      for (const material of originals.values()) material.dispose();
      replacements.length = 0;
      originals.clear();
      textureSettings.clear();
    },
  };
}
