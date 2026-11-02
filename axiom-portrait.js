// A small local mesh warp of the original portrait. No replacement face,
// microphone, model download or generated voice is used by this renderer.
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number.isFinite(value) ? value : 0));
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };
const bell = (value, radius) => 1 - smooth(radius * .3, radius, Math.abs(value));
const mounted = new WeakMap();
export const PORTRAIT_FACE = Object.freeze({ left: .28, top: .12, right: .86, bottom: .45,
  mouthX: .565, mouthY: .315, mouthRadius: .19,
  eyes: Object.freeze([Object.freeze({ x: .398, y: .231 }), Object.freeze({ x: .735, y: .239 })]) });

/** Used only when HTML audio is playing but Web Audio has no amplitude data. */
export function speechEnvelope(time) {
  const t = Number.isFinite(time) ? time : 0;
  return .15 + .58 * Math.pow(.5 + .5 * Math.sin(t * 13.4 + .75 * Math.sin(t * 4.1)), 1.25);
}

export function portraitPose({ speaking = false, level = 0, hasMeterSignal = false,
  time = 0, reducedMotion = false, paused = false, gazeX = 0, gazeY = 0 } = {}) {
  if (paused || reducedMotion) return { jaw: 0, blink: 0, gazeX: 0, gazeY: 0 };
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  const cycle = t % 6.3, blink = cycle > 4.45 && cycle < 4.65 ? Math.sin((cycle - 4.45) / .2 * Math.PI) ** 2 : 0;
  return { jaw: speaking ? hasMeterSignal ? clamp(level) : speechEnvelope(t) : 0,
    blink, gazeX: clamp(gazeX, -1, 1), gazeY: clamp(gazeY, -1, 1) };
}

/** Normalized deformation is zero outside the painted face and at its edges. */
export function portraitDeltaAt(x, y, pose = {}) {
  if (![x, y].every(Number.isFinite) || x <= PORTRAIT_FACE.left || x >= PORTRAIT_FACE.right
    || y <= PORTRAIT_FACE.top || y >= PORTRAIT_FACE.bottom) return [0, 0];
  let dx = 0, dy = 0;
  const boundary = smooth(PORTRAIT_FACE.left, .32, x) * (1 - smooth(.82, PORTRAIT_FACE.right, x))
    * smooth(PORTRAIT_FACE.top, .15, y) * (1 - smooth(.43, PORTRAIT_FACE.bottom, y));
  const mx = x - PORTRAIT_FACE.mouthX;
  const line = PORTRAIT_FACE.mouthY + .014 * Math.pow(mx / PORTRAIT_FACE.mouthRadius, 2);
  const jawWeight = bell(mx, PORTRAIT_FACE.mouthRadius)
    * smooth(line - .012, line + .022, y) * (1 - smooth(.365, .43, y));
  // Stretch the original lower lip and existing dark mouth cavity; the upper
  // lip, skin detail and all clothing/gills remain the original image.
  dy += .023 * clamp(pose.jaw) * jawWeight;
  for (const eye of PORTRAIT_FACE.eyes) {
    const ex = x - eye.x, ey = y - eye.y;
    const radius = Math.hypot(ex / .066, ey / .057);
    const lid = 1 - smooth(.50, 1.38, radius);
    dy -= ey * .90 * clamp(pose.blink) * lid;
    const pupil = (1 - smooth(.20, .95, radius)) * (1 - clamp(pose.blink));
    dx += .006 * clamp(pose.gazeX, -1, 1) * pupil;
    dy += .004 * clamp(pose.gazeY, -1, 1) * pupil;
  }
  return [dx * boundary, dy * boundary];
}

function texturedTriangle(ctx, image, source, target, width, height) {
  const [a, b, c] = source, [p, q, r] = target;
  const u = b[0] - a[0], v = b[1] - a[1], w = c[0] - a[0], z = c[1] - a[1];
  const determinant = u * z - v * w;
  if (Math.abs(determinant) < 1e-8) return;
  const e = q[0] - p[0], f = q[1] - p[1], g = r[0] - p[0], h = r[1] - p[1];
  const xx = (e * z - g * v) / determinant, xy = (g * u - e * w) / determinant;
  const yx = (f * z - h * v) / determinant, yy = (h * u - f * w) / determinant;
  ctx.save(); ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.lineTo(...r); ctx.closePath(); ctx.clip();
  ctx.transform(xx, yx, xy, yy, p[0] - xx * a[0] - xy * a[1], p[1] - yx * a[0] - yy * a[1]);
  ctx.drawImage(image, 0, 0, width, height); ctx.restore();
}

/**
 * Mount alongside an existing <img>. CSS contract (in page-voice.css):
 * .axiom-portrait-host {position:relative}
 * .axiom-portrait-canvas {position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
 * .axiom-portrait-ready > .axiom-portrait-source {opacity:0!important}
 * .room-axiom-ready > .axiom-portrait-canvas {visibility:hidden}
 * Canvas is decorative; the existing original image retains its accessible alt.
 */
export function mountAxiomPortrait(container, { image = container?.querySelector?.('img'),
  document: doc = globalThis.document, requestFrame = globalThis.requestAnimationFrame,
  cancelFrame = globalThis.cancelAnimationFrame } = {}) {
  if (!container || !image || !doc?.createElement) return null;
  if (mounted.has(container)) return mounted.get(container);
  const canvas = doc.createElement('canvas'); canvas.className = 'axiom-portrait-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext?.('2d', { alpha: true }); if (!ctx) return null;
  const view = doc.defaultView || globalThis.window;
  const reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let destroyed = false, loaded = false, visible = true, frame = 0, lastFrame = 0, start = 0;
  let speaking = false, level = 0, hasMeterSignal = false, jaw = 0, gazeX = 0, gazeY = 0;
  let cssWidth = 0, cssHeight = 0;
  const paused = () => doc.documentElement?.classList?.contains('motion-paused')
    || doc.documentElement?.dataset?.motion === 'paused';
  const active = () => loaded && !destroyed && !doc.hidden && visible
    && !container.classList.contains('room-axiom-ready');
  const cleanups = [];
  const listen = (target, event, callback, options) => {
    target?.addEventListener?.(event, callback, options);
    cleanups.push(() => target?.removeEventListener?.(event, callback, options));
  };
  container.classList.add('axiom-portrait-host'); image.classList.add('axiom-portrait-source');
  container.append(canvas);

  function resize() {
    if (destroyed) return;
    const box = container.getBoundingClientRect();
    cssWidth = Math.max(1, box.width); cssHeight = Math.max(1, box.height);
    const dpr = Math.min(2, Math.max(1, view?.devicePixelRatio || 1), Math.sqrt(250000 / (cssWidth * cssHeight)));
    canvas.width = Math.max(1, Math.round(cssWidth * dpr)); canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    draw(lastFrame || 0, true);
  }
  function draw(time, force = false) {
    if (!loaded || destroyed || !image.naturalWidth || !image.naturalHeight) return;
    if (!force && time - lastFrame < (cssWidth < 160 ? 1000 / 20 : 1000 / 25)) return;
    const delta = lastFrame ? Math.min(.10, Math.max(0, (time - lastFrame) / 1000)) : .016;
    lastFrame = time; if (!start) start = time;
    const pose = portraitPose({ speaking, level, hasMeterSignal, time: (time - start) / 1000,
      reducedMotion: reduced?.matches, paused: paused(), gazeX, gazeY });
    jaw += (pose.jaw - jaw) * Math.min(1, delta * 17); pose.jaw = jaw;
    if (reduced?.matches || paused()) pose.jaw = jaw = 0;
    canvas.dataset.jaw = jaw.toFixed(3); canvas.dataset.speaking = String(speaking);
    const width = image.naturalWidth, height = image.naturalHeight;
    const scale = Math.min(cssWidth / width, cssHeight / height);
    const left = (cssWidth - width * scale) / 2, top = (cssHeight - height * scale) / 2;
    ctx.setTransform(canvas.width / cssWidth, 0, 0, canvas.height / cssHeight, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight); ctx.translate(left, top); ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
    if (!pose.jaw && !pose.blink && Math.abs(pose.gazeX) + Math.abs(pose.gazeY) < .01) return;
    // One small face patch, 364 clipped triangles. Clothing and the silhouette
    // are not redrawn or deformed; pause/offscreen stops this loop entirely.
    const cols = 14, rows = 13, grid = [];
    for (let row = 0; row <= rows; row++) {
      const line = [];
      for (let col = 0; col <= cols; col++) {
        const x = PORTRAIT_FACE.left + (PORTRAIT_FACE.right - PORTRAIT_FACE.left) * col / cols;
        const y = PORTRAIT_FACE.top + (PORTRAIT_FACE.bottom - PORTRAIT_FACE.top) * row / rows;
        const [dx, dy] = portraitDeltaAt(x, y, pose);
        line.push({ source: [x * width, y * height], target: [(x + dx) * width, (y + dy) * height] });
      }
      grid.push(line);
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const a = grid[row][col], b = grid[row][col + 1], c = grid[row + 1][col], d = grid[row + 1][col + 1];
      texturedTriangle(ctx, image, [a.source, b.source, c.source], [a.target, b.target, c.target], width, height);
      texturedTriangle(ctx, image, [b.source, d.source, c.source], [b.target, d.target, c.target], width, height);
    }
  }
  function tick(time) {
    frame = 0; if (!active()) return;
    draw(time);
    if (!reduced?.matches && !paused()) frame = requestFrame(tick);
  }
  function sync() {
    if (frame) cancelFrame(frame); frame = 0;
    if (!active()) return;
    draw(lastFrame || 0, true);
    if (!reduced?.matches && !paused()) frame = requestFrame(tick);
  }
  function ready() {
    if (destroyed || !image.naturalWidth) return;
    loaded = true; container.classList.add('axiom-portrait-ready'); resize(); sync();
  }
  function speech(event) {
    const data = event.detail || {};
    if (!['start', 'progress', 'end'].includes(data.phase)) return;
    if (data.phase === 'start') hasMeterSignal = false;
    speaking = data.phase !== 'end'; level = speaking ? clamp(data.level) : 0;
    if (level > .006) hasMeterSignal = true;
    if (!speaking) { level = 0; jaw = 0; }
    if (data.phase !== 'progress') sync();
    else if (!frame && active() && !reduced?.matches && !paused()) frame = requestFrame(tick);
  }
  function pointer(event) {
    if (reduced?.matches || paused()) return;
    const box = container.getBoundingClientRect();
    gazeX = clamp((event.clientX - box.left - box.width / 2) / Math.max(1, view.innerWidth / 2), -1, 1);
    gazeY = clamp((event.clientY - box.top - box.height / 2) / Math.max(1, view.innerHeight / 2), -1, 1);
    if (!frame && active() && !reduced?.matches && !paused()) frame = requestFrame(tick);
  }
  const resizeObserver = view?.ResizeObserver ? new view.ResizeObserver(resize) : null; resizeObserver?.observe(container);
  const intersection = view?.IntersectionObserver ? new view.IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting); sync();
  }, { rootMargin: '50px' }) : null; intersection?.observe(container);
  const observer = view?.MutationObserver ? new view.MutationObserver(sync) : null;
  observer?.observe(doc.documentElement, { attributes: true, attributeFilter: ['class', 'data-motion'] });
  observer?.observe(container, { attributes: true, attributeFilter: ['class'] });
  listen(doc, 'axiom:speech', speech); listen(doc, 'visibilitychange', sync);
  listen(doc, 'pointermove', pointer, { passive: true }); listen(doc, 'pointerdown', pointer, { passive: true });
  listen(reduced, 'change', sync); listen(image, 'load', ready);
  function destroy() {
    if (destroyed) return; destroyed = true;
    if (frame) cancelFrame(frame); frame = 0;
    cleanups.forEach(fn => fn()); resizeObserver?.disconnect(); intersection?.disconnect(); observer?.disconnect();
    canvas.remove(); image.classList.remove('axiom-portrait-source');
    container.classList.remove('axiom-portrait-host', 'axiom-portrait-ready'); mounted.delete(container);
  }
  listen(view, 'pagehide', event => { if (!event.persisted) destroy(); }); listen(view, 'pageshow', sync);
  const api = { canvas, refresh: resize, destroy }; mounted.set(container, api);
  if (image.complete) ready(); return api;
}
