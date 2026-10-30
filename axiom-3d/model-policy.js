/** Local model boundary. Validation never fetches URLs or uploads model content. */
export const MAX_MODEL_BYTES = 20 * 1024 * 1024;

const MAX_COMPONENTS = 8_000_000;
const TYPES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const COMPONENT_BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const SUPPORTED_REQUIRED = new Set([
  'KHR_lights_punctual', 'KHR_materials_unlit', 'KHR_materials_clearcoat',
  'KHR_materials_diffuse_roughness', 'KHR_materials_dispersion', 'KHR_materials_ior',
  'KHR_materials_sheen', 'KHR_materials_specular', 'KHR_materials_transmission',
  'KHR_materials_iridescence', 'KHR_materials_anisotropy', 'KHR_materials_volume',
  'KHR_materials_emissive_strength', 'KHR_texture_transform', 'KHR_mesh_quantization',
  'EXT_materials_bump', 'EXT_texture_webp', 'EXT_mesh_gpu_instancing'
]);
const NEEDS_DECODER = new Set([
  'KHR_draco_mesh_compression', 'KHR_texture_basisu',
  'EXT_meshopt_compression', 'KHR_meshopt_compression'
]);

function fail(message) { throw new Error(message); }
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label}: se esperaba un objeto JSON.`);
}
function integer(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(`${label}: valor fuera de los límites admitidos.`);
  return value;
}
function list(value, maximum, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum) fail(`${label}: lista inválida o demasiado grande.`);
  return value;
}
function ref(value, values, label) { return integer(value, 0, values.length - 1, label); }

function inspectJSON(json) {
  object(json, 'Modelo');
  const stack = [[json, 0]];
  const seen = new WeakSet();
  let visited = 0;
  while (stack.length) {
    const [value, depth] = stack.pop();
    if (++visited > 180_000 || depth > 64) fail('El modelo tiene demasiados elementos o niveles de anidación.');
    if (value === null || typeof value === 'boolean' || typeof value === 'string') continue;
    if (typeof value === 'number' && Number.isFinite(value)) continue;
    if (typeof value !== 'object') fail('El modelo contiene valores que no son JSON válido.');
    if (seen.has(value)) fail('El modelo contiene referencias circulares o compartidas que no son JSON válido.');
    seen.add(value);
    for (const [key, item] of Object.entries(value)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') fail('El modelo contiene una propiedad no admitida.');
      if (NEEDS_DECODER.has(key)) fail(`La compresión ${key} necesita un decodificador que este visor no incluye. Exporta el modelo sin compresión.`);
      stack.push([item, depth + 1]);
    }
  }
  if (new TextEncoder().encode(JSON.stringify(json)).byteLength > MAX_MODEL_BYTES) fail('El modelo supera el límite de 20 MiB.');
}

function embeddedBytes(uri, kind) {
  if (typeof uri !== 'string') fail(`${kind}: la dirección del recurso no es válida.`);
  const mime = kind === 'Imagen' ? '(?:image/png|image/jpeg|image/webp)' : '(?:application/octet-stream|application/gltf-buffer)';
  const match = new RegExp(`^data:${mime};base64,([A-Za-z0-9+/]*={0,2})$`).exec(uri);
  if (!match) fail(`${kind}: solo se permiten recursos base64 incrustados. No se admiten URL externas ni archivos separados.`);
  const body = match[1];
  if (!body.length || body.length % 4 !== 0 || /=[^=]/.test(body)) fail(`${kind}: el contenido base64 está incompleto.`);
  const size = body.length / 4 * 3 - (body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0);
  if (size > MAX_MODEL_BYTES) fail(`${kind}: el recurso supera el límite de 20 MiB.`);
  return size;
}

function validate(json, binLength = null) {
  inspectJSON(json);
  object(json.asset, 'asset');
  if (json.asset.version !== '2.0' || (json.asset.minVersion !== undefined && json.asset.minVersion !== '2.0')) fail('Solo se admiten modelos glTF 2.0.');
  const required = list(json.extensionsRequired, 32, 'Extensiones obligatorias');
  for (const name of required) {
    if (NEEDS_DECODER.has(name)) fail(`La compresión ${name} necesita un decodificador que este visor no incluye. Exporta el modelo sin compresión.`);
    if (!SUPPORTED_REQUIRED.has(name)) fail(`Extensión obligatoria no compatible: ${String(name).slice(0, 100)}.`);
  }

  const buffers = list(json.buffers, 64, 'Buffers');
  let resourceBytes = 0;
  buffers.forEach((buffer, index) => {
    object(buffer, 'Buffer');
    integer(buffer.byteLength, 1, MAX_MODEL_BYTES, 'Tamaño del buffer');
    if (buffer.uri === undefined) {
      if (index !== 0 || binLength === null) fail('El buffer no está incrustado. Exporta un GLB autocontenido o un glTF con datos base64.');
      if (binLength < buffer.byteLength || binLength - buffer.byteLength > 3) fail('El tamaño del bloque binario no coincide con el buffer declarado.');
    } else if (embeddedBytes(buffer.uri, 'Buffer') !== buffer.byteLength) {
      fail('El tamaño del buffer base64 no coincide con el tamaño declarado.');
    }
    resourceBytes += buffer.byteLength;
  });
  if (binLength !== null && (!buffers.length || buffers[0].uri !== undefined)) fail('El bloque binario GLB no tiene un buffer asociado.');

  const views = list(json.bufferViews, 8192, 'Vistas de buffers');
  views.forEach(view => {
    object(view, 'Vista de buffer');
    const buffer = buffers[ref(view.buffer, buffers, 'Buffer de la vista')];
    const start = integer(view.byteOffset ?? 0, 0, buffer.byteLength, 'Inicio de la vista');
    const length = integer(view.byteLength, 1, buffer.byteLength, 'Longitud de la vista');
    if (start + length > buffer.byteLength) fail('Una vista de buffer sale del bloque binario.');
    if (view.byteStride !== undefined && (integer(view.byteStride, 4, 252, 'Paso de la vista') % 4)) fail('El paso de la vista debe ser múltiplo de cuatro.');
  });

  const accessors = list(json.accessors, 8192, 'Accesores');
  let components = 0;
  function fitsView(index, offset, count, elementBytes, label, allowStride = true) {
    const view = views[ref(index, views, label)];
    integer(offset, 0, view.byteLength, `${label}: inicio`);
    const stride = allowStride ? view.byteStride ?? elementBytes : elementBytes;
    if (stride < elementBytes || offset + (count - 1) * stride + elementBytes > view.byteLength) fail(`${label}: los datos salen de la vista del buffer.`);
  }
  accessors.forEach(accessor => {
    object(accessor, 'Accesor');
    const count = integer(accessor.count, 1, 1_000_000, 'Cantidad de elementos');
    const dimension = Object.hasOwn(TYPES, accessor.type) ? TYPES[accessor.type] : 0;
    const bytes = Object.hasOwn(COMPONENT_BYTES, accessor.componentType) ? COMPONENT_BYTES[accessor.componentType] : 0;
    if (!dimension || !bytes) fail('Un accesor tiene un tipo o componente no admitido.');
    components += count * dimension;
    if (components > MAX_COMPONENTS) fail('El modelo contiene demasiados datos geométricos para este visor.');
    // glTF aligns each matrix column to four bytes, including MAT2/MAT3 integer data.
    const side = accessor.type.startsWith('MAT') ? Number(accessor.type.slice(3)) : 0;
    const elementBytes = side ? Math.ceil(side * bytes / 4) * 4 * side : dimension * bytes;
    if (accessor.bufferView !== undefined) fitsView(accessor.bufferView, accessor.byteOffset ?? 0, count, elementBytes, 'Accesor');
    else if ((accessor.byteOffset ?? 0) !== 0) fail('Un accesor sin vista no puede declarar desplazamiento.');
    if (accessor.sparse !== undefined) {
      const sparse = accessor.sparse;
      object(sparse, 'Accesor disperso'); object(sparse.indices, 'Índices dispersos'); object(sparse.values, 'Valores dispersos');
      const sparseCount = integer(sparse.count, 1, count, 'Cantidad dispersa');
      if (![5121, 5123, 5125].includes(sparse.indices.componentType)) fail('El tipo de los índices dispersos no es válido.');
      fitsView(sparse.indices.bufferView, sparse.indices.byteOffset ?? 0, sparseCount, COMPONENT_BYTES[sparse.indices.componentType], 'Índices dispersos', false);
      fitsView(sparse.values.bufferView, sparse.values.byteOffset ?? 0, sparseCount, elementBytes, 'Valores dispersos', false);
    }
  });

  const images = list(json.images, 128, 'Imágenes');
  images.forEach(image => {
    object(image, 'Imagen');
    if (image.uri !== undefined && image.bufferView !== undefined) fail('Una imagen debe tener un solo origen incrustado.');
    if (image.uri !== undefined) resourceBytes += embeddedBytes(image.uri, 'Imagen');
    else {
      ref(image.bufferView, views, 'Vista de la imagen');
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.mimeType)) fail('Solo se admiten imágenes PNG, JPEG o WebP incrustadas.');
    }
  });
  if (resourceBytes > MAX_MODEL_BYTES) fail('Los recursos del modelo superan el límite total de 20 MiB.');

  const nodes = list(json.nodes, 2048, 'Nodos');
  const meshes = list(json.meshes, 512, 'Mallas');
  let primitives = 0;
  meshes.forEach(mesh => {
    object(mesh, 'Malla');
    const items = list(mesh.primitives, 1024, 'Primitivas');
    if (!items.length || (primitives += items.length) > 2048) fail('La cantidad de primitivas de malla no es válida.');
    items.forEach(primitive => {
      object(primitive, 'Primitiva'); object(primitive.attributes, 'Atributos');
      for (const index of Object.values(primitive.attributes)) ref(index, accessors, 'Accesor de atributo');
      if (primitive.indices !== undefined) ref(primitive.indices, accessors, 'Accesor de índices');
      for (const target of list(primitive.targets, 64, 'Objetivos de animación')) {
        object(target, 'Objetivo');
        for (const index of Object.values(target)) ref(index, accessors, 'Accesor del objetivo');
      }
    });
  });
  const parents = new Set();
  nodes.forEach(node => {
    object(node, 'Nodo');
    if (node.mesh !== undefined) ref(node.mesh, meshes, 'Malla del nodo');
    for (const child of list(node.children, 2048, 'Hijos')) {
      ref(child, nodes, 'Nodo hijo');
      if (parents.has(child)) fail('Un nodo aparece con más de un padre.');
      parents.add(child);
    }
  });
  // Detect cycles before GLTFLoader recursively constructs the scene graph.
  const colors = new Uint8Array(nodes.length);
  for (let root = 0; root < nodes.length; root++) {
    const pending = [[root, false]];
    while (pending.length) {
      const [index, leaving] = pending.pop();
      if (leaving) { colors[index] = 2; continue; }
      if (colors[index] === 1) fail('La jerarquía de nodos contiene un ciclo.');
      if (colors[index] === 2) continue;
      colors[index] = 1;
      pending.push([index, true]);
      for (const child of nodes[index].children ?? []) pending.push([child, false]);
    }
  }
  const scenes = list(json.scenes, 64, 'Escenas');
  for (const scene of scenes) {
    object(scene, 'Escena');
    for (const index of list(scene.nodes, 2048, 'Nodos de escena')) ref(index, nodes, 'Nodo de escena');
  }
  if (json.scene !== undefined) ref(json.scene, scenes, 'Escena principal');
  list(json.animations, 128, 'Animaciones');
  list(json.materials, 512, 'Materiales');
  list(json.textures, 128, 'Texturas');
  return json;
}

/** Validate a JSON-parsed .gltf whose buffers and images are embedded. */
export function validateGLTF(json) { return validate(json); }

/** Validate a complete glTF 2.0 binary container before passing it to GLTFLoader. */
export function validateGLB(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer)) fail('El archivo GLB debe ser un ArrayBuffer.');
  if (arrayBuffer.byteLength > MAX_MODEL_BYTES) fail('El archivo supera el límite de 20 MiB.');
  if (arrayBuffer.byteLength < 20) fail('El archivo GLB está incompleto.');
  const view = new DataView(arrayBuffer);
  if (view.getUint32(0, true) !== 0x46546c67) fail('El archivo no tiene una cabecera GLB válida.');
  if (view.getUint32(4, true) !== 2) fail('Solo se admiten archivos GLB de versión 2.');
  if (view.getUint32(8, true) !== arrayBuffer.byteLength) fail('La longitud declarada del GLB no coincide con el archivo.');
  let json = null;
  let binLength = null;
  for (let offset = 12; offset < arrayBuffer.byteLength;) {
    if (offset + 8 > arrayBuffer.byteLength) fail('El archivo GLB contiene una cabecera de bloque incompleta.');
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (length % 4 !== 0 || start + length > arrayBuffer.byteLength) fail('El archivo GLB contiene un bloque truncado o mal alineado.');
    if (type === 0x4e4f534a && json === null && offset === 12) {
      try {
        json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(arrayBuffer, start, length)));
      } catch { fail('El bloque JSON del GLB no contiene texto UTF-8 y JSON válidos.'); }
      object(json, 'Bloque JSON');
    } else if (type === 0x004e4942 && json !== null && binLength === null) {
      binLength = length;
    } else fail('El GLB debe contener un bloque JSON inicial y, como máximo, un bloque BIN.');
    offset = start + length;
  }
  if (json === null) fail('El GLB no contiene un bloque JSON.');
  return validate(json, binLength);
}
