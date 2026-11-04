/* Decisions use only local player state and actual, recently intended travel. */
export function shouldShowSpeechFallback(state = {}, hasText = true) {
  return Boolean(hasText && !state.preferred && !state.playing && !state.loading);
}

export function createScrollReactionTracker({ now = Date.now, windowMs = 650,
  cooldown = 20000, intentMs = 1000 } = {}) {
  let previous = null, samples = [], direction = 0, intentUntil = -Infinity, lastReaction = -Infinity;
  function reset() { previous = null; samples = []; direction = 0; intentUntil = -Infinity; }
  return {
    intent(y) {
      const time = now();
      if (!Number.isFinite(y)) return;
      if (time > intentUntil || !previous) { previous = { y, time }; samples = []; direction = 0; }
      intentUntil = time + intentMs;
    },
    observe(y, { allowed = true, viewport = 800 } = {}) {
      const time = now();
      if (!Number.isFinite(y)) return false;
      const before = previous; previous = { y, time };
      if (!before || !allowed || time > intentUntil || time - lastReaction < cooldown) { samples = []; direction = 0; return false; }
      const delta = y - before.y;
      if (!delta) return false;
      const sign = Math.sign(delta);
      if (direction && sign !== direction) samples = [];
      direction = sign;
      samples.push({ from: before.time, distance: Math.abs(delta) });
      samples = samples.filter(sample => time - sample.from <= windowMs);
      if (!samples.length) return false;
      const distance = samples.reduce((sum, sample) => sum + sample.distance, 0);
      const elapsed = Math.max(40, time - samples[0].from);
      const height = Number.isFinite(viewport) && viewport > 0 ? viewport : 800;
      if (distance < Math.max(280, height * .65) || distance / elapsed < 1.3) return false;
      lastReaction = time; samples = []; return true;
    },
    reset,
    get hasIntent() { return now() <= intentUntil; },
  };
}
