AXIOM Y SUS AMIGOS · CyberSerchMX

ESTUDIO WEB
Serve this directory over HTTP/HTTPS (not file://). No build step or API key.
On the portfolio: /axiom-3d/index.html.

The eight GLB models come from the owner's supplied FBX meshes and PNG textures.
The original files were not modified or uploaded to a conversion service.
Conversion uses pinned official Three.js 0.187.0 FBXLoader and GLTFExporter.
Meshes retain their original proportions and painted UV texture, normalized to
Y-up at height 3.2. Opaque textures were encoded as 2048px JPEG for web delivery.
Only the selected character is downloaded; changing character disposes the old
geometry, materials, textures and skeleton. Each GLB is approximately 1.6–2.4 MB.

ANIMATION
The source FBX files were static. Axiom has a new, conservative three-bone
Root/Chest/Head rig for subtle head tracking and torso motion. There is no facial,
hand, lip-sync or walk rig. The other seven models remain static meshes and react
with whole-object turns, jumps and a greeting bow. These are not gameplay assets
with full locomotion yet. The previous procedural model is retained as a legacy
file but is not used by the current viewer.

FILES
index.html: character selector, responsive stage, controls and future game slot.
style.css: responsive layout with reduced-motion support.
main.js: transparent WebGL renderer, soft lights, self-hosted GLTFLoader,
head tracking, greeting/jump/spin, orbit mode, local import and lifecycle.
model-policy.js: size-limited embedded-resource validation for local imports.
models/*.glb: self-contained models, including their textures.
vendor/three: official pinned Three.js modules and MIT license.

CONTROLS
Mouse movement subtly turns the character; Axiom also moves his head.
Tap the character or press Enter/Space on the canvas to jump.
Use Saludar, Dar una vuelta or the camera buttons. Enable Explorar 360° for drag
rotation; leave this mode to scroll the page on touch screens.
Pause and OS reduced motion stop animation. Offscreen or hidden tabs stop the
render loop. Pixel density is capped for mobile devices.

PRIVACY AND LOCAL IMPORT
No analytics, AI service, camera, microphone or voice generation on this page.
All runtime dependencies and selected characters are served from the same site.
The optional file picker processes trusted .glb/.gltf files locally, not uploads.
Maximum 20 MiB, embedded resources only. The policy rejects external URLs and
unsupported compressed formats. It is not a complete Khronos validator or a
security certification for arbitrary untrusted assets.

FUTURE GAME
#proximo-juego reserves a visible section. #game-mount is the empty hidden mount.
No game is loaded or advertised as already playable in that section.

SOURCE WORKSPACE
  node tools/convert_axiom_fbx.mjs axiom atlas iris kernel luma nexus nova vector
The conversion helper uses the supplied source folder and prepared JPEG copies.
It is a development tool; visitors only receive the final GLBs.

https://threejs.org/docs/pages/GLTFLoader
https://threejs.org/docs/pages/WebGLRenderer
https://threejs.org/docs/pages/OrbitControls
