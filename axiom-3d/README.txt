AXIOM 3D · CyberSerchMX

Three.js 0.187.0, local modules, no build step and no API keys.

OPEN THE VIEWER
Serve this folder over HTTP/HTTPS. Do not open index.html through file://:
  python -m http.server 8780 --bind 127.0.0.1
Then visit http://127.0.0.1:8780/ from the directory containing index.html.
On the portfolio this lives at /axiom-3d/index.html.

FILES
index.html: semantic UI, keyboard controls, strict CSP, static image fallback.
style.css: responsive container and layout.
main.js: transparent WebGL renderer, camera/lights, GLTFLoader, cursor tracking,
raycast-based click response, jump/spin, explicit orbit mode and render lifecycle.
model-policy.js: bounded, embedded-resource-only validation for local imports.
prototype.js: original parametric Axiom prototype, including bone hierarchy
and truly skinned tail/fin. The rendered asset is models/axiom-prototype.glb.
vendor/three: pinned official Three.js source and MIT license.

MODEL STATUS
This is an original stylized procedural prototype based on Axiom's reference.
It is not an exact conversion of the supplied illustration and was not generated
with Tripo, CSM or Spline. No reference was uploaded to an external service.
The final artistic model can replace this prototype without replacing the UI.

REPLACE THE MODEL
Export glTF 2.0 as one self-contained .glb, Y-up, facing +Z, neutral standing pose.
Include the skeleton, weights, textures and optional animation named Idle.
Keep textures modest (e.g. 1024px) and geometry lightweight for mobile devices.
Point MODEL_URL in main.js to the file. Update BONE_NAMES to match your rig:
  Head, Eye_L, Eye_R (common Mixamo/CC aliases are included).
The model is uniformly fitted. Head tracking applies a subtle local offset on
top of its rest/idle pose. Different bone axes may require reversing the offset.
Jump and spin use a separate parent group and do not overwrite imported clips.
The local file picker accepts embedded .gltf or .glb up to 20 MiB; no external
URIs or unsupported compression decoders. Model imports are not uploads.
The validator is not the complete Khronos validator and does not certify arbitrary
untrusted assets or bound the decoded size of every texture. Use trusted models.

CONTROLS AND PRIVACY
Move mouse across the window: subtle head/eye tracking. Tap Axiom: jump.
Enter/Space on canvas: jump. Left/Right arrows: change the view.
360-degree mode enables drag rotation explicitly so mobile scrolling stays usable.
Pause and OS reduced-motion settings stop animation; offscreen/hidden tabs stop
the rendering loop. Resolution is capped. WebGL failure keeps the original image.
This page has no analytics, camera, microphone, AI service or voice generation.
No data is sent to a model provider. All runtime dependencies are same-origin.

REBUILD THE PROTOTYPE IN THE SOURCE WORKSPACE
  node tools/export_axiom_model.mjs
The script exports the mesh, rig and Idle tail animation using GLTFExporter.
The source ZIP includes this helper under tools/ and axiom-3d/package.json.

OFFICIAL REFERENCES
https://threejs.org/docs/pages/GLTFLoader
https://threejs.org/docs/pages/WebGLRenderer
https://threejs.org/docs/pages/OrbitControls
https://threejs.org/manual/pages/responsive.html
Three.js license: vendor/three/LICENSE.
