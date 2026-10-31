// A small, deterministic animation score. It only describes a pose: the caller
// owns requestAnimationFrame, visibility and the visitor's motion preferences.
export const ACTION_DURATIONS = Object.freeze({ wave: 2.6, jump: 1.25, spin: 1.65 });

const PROFILES = Object.freeze({
  axiom:  { phase: 0.0, energy: 1.00, breathRate: 1.52 },
  atlas:  { phase: 3.7, energy: 0.84, breathRate: 1.30 },
  iris:   { phase: 7.1, energy: 0.94, breathRate: 1.43 },
  kernel: { phase: 1.9, energy: 0.78, breathRate: 1.24 },
  luma:   { phase: 9.3, energy: 1.06, breathRate: 1.65 },
  nexus:  { phase: 5.4, energy: 0.88, breathRate: 1.38 },
  nova:   { phase: 12.8, energy: 1.12, breathRate: 1.70 },
  vector: { phase: 15.2, energy: 0.90, breathRate: 1.47 },
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const smooth = value => {
  const p = clamp(value, 0, 1);
  return p * p * (3 - 2 * p);
};
const ease = value => {
  const p = clamp(value, 0, 1);
  return p * p * p * (p * (p * 6 - 15) + 10);
};
const envelope = (position, start, rise, hold, fall) =>
  smooth((position - start) / rise) * (1 - smooth((position - start - rise - hold) / fall));

function curve(progress, knots) {
  if (progress <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    if (progress <= knots[i][0]) {
      const [from, a] = knots[i - 1], [to, b] = knots[i];
      return a + (b - a) * smooth((progress - from) / (to - from));
    }
  }
  return knots[knots.length - 1][1];
}

/**
 * Time is accumulated only while animation is allowed. Pointer coordinates are
 * normalized to [-1,1]. Action time and duration are seconds. All joint angles
 * are radians, rootY uses the viewer's approximately 3.2-unit character scale.
 */
export function sampleLivingPose(elapsedSeconds, characterId = 'axiom', pointer = {}, action = null) {
  const profile = Object.hasOwn(PROFILES, characterId) ? PROFILES[characterId] : PROFILES.axiom;
  const t = Math.max(0, finite(elapsedSeconds));
  const clock = t + profile.phase;
  const e = profile.energy;
  const x = clamp(finite(pointer?.x), -1, 1), y = clamp(finite(pointer?.y), -1, 1);
  const cycle = clock % 19;

  // Look, pause to notice something, then return. The quiet intervals prevent a
  // character from endlessly shaking its head in a perfectly mechanical loop.
  const lookRight = envelope(cycle, 2.1, 0.7, 0.9, 1.0);
  const lookLeft = envelope(cycle, 9.2, 1.0, 1.1, 1.0);
  const attention = envelope(cycle, 14.9, 0.7, 0.3, 0.9);
  const nod = attention * Math.sin((cycle - 14.9) * 3.1);
  const breath = Math.sin(clock * profile.breathRate);
  const pose = {
    headYaw: x * 0.16 + (lookRight * 0.09 - lookLeft * 0.10) * e,
    headPitch: y * 0.065 + nod * 0.04 - breath * 0.009,
    headRoll: (lookRight * -0.025 + lookLeft * 0.025) * e + Math.sin(clock * 0.69) * 0.009,
    breath,
    bodySway: (Math.sin(clock * 0.73) * 0.017 + Math.sin(clock * 0.37 + 0.8) * 0.006) * e,
    wave: 0.018 + (Math.sin(clock * 1.07) + 1) * 0.012,
    handWiggle: 0,
    tail: (Math.sin(clock * 0.88 - 0.7) * 0.052 + Math.sin(clock * 1.41) * 0.017) * e,
    rootY: 0,
    rootPitch: 0,
    rootRoll: 0,
    rootYaw: 0,
    rootScaleY: 1,
    rootScaleXZ: 1,
  };

  if (action && Object.hasOwn(ACTION_DURATIONS, action.type)) {
    const duration = finite(action.duration, ACTION_DURATIONS[action.type]);
    const p = clamp(finite(action.time) / Math.max(duration, 0.001), 0, 1);
    if (action.type === 'wave') {
      const raised = envelope(p, 0, 0.20, 0.52, 0.28);
      pose.wave += raised * (0.29 + Math.sin((p - 0.20) * Math.PI * 7) * 0.08);
      pose.handWiggle = raised * Math.sin((p - 0.2) * Math.PI * 10) * 0.10;
      pose.headPitch += raised * 0.025;
      pose.headRoll += raised * Math.sin(p * Math.PI * 3) * 0.018;
      pose.bodySway += raised * -0.009;
      pose.tail += raised * Math.sin(p * Math.PI * 3 - 0.4) * 0.02;
    } else if (action.type === 'jump') {
      // Anticipation, push-off, a single airborne arc, then a soft landing.
      // Only the jump lifts the root. Idle breathing keeps the soles grounded.
      const air = p > 0.23 && p < 0.76 ? Math.sin((p - 0.23) / 0.53 * Math.PI) : 0;
      pose.rootY = air * 0.43;
      pose.rootScaleY = curve(p, [[0, 1], [0.15, 0.92], [0.27, 1.035], [0.58, 1.01], [0.76, 1], [0.83, 0.94], [1, 1]]);
      pose.rootScaleXZ = 1 / Math.sqrt(pose.rootScaleY);
      pose.rootPitch = curve(p, [[0, 0], [0.16, 0.035], [0.32, -0.025], [0.76, 0.025], [1, 0]]);
      pose.wave += air * 0.16;
      pose.headPitch += -air * 0.025;
      pose.tail += air * -0.025;
    } else {
      pose.rootYaw = ease(p) * Math.PI * 2;
      const turning = Math.sin(p * Math.PI) ** 2;
      pose.headRoll += turning * -0.02;
      pose.wave += turning * 0.09;
      pose.tail += turning * -0.025;
    }
  }

  // Anatomical limits are shared with the runtime rig. Pointer and gestures can
  // combine, but should never stretch a neck or send a prop-bearing hand flying.
  pose.headYaw = clamp(pose.headYaw, -0.24, 0.24);
  pose.headPitch = clamp(pose.headPitch, -0.10, 0.10);
  pose.headRoll = clamp(pose.headRoll, -0.055, 0.055);
  pose.bodySway = clamp(pose.bodySway, -0.035, 0.035);
  pose.wave = clamp(pose.wave, 0, 0.45);
  pose.tail = clamp(pose.tail, -0.10, 0.10);
  return pose;
}
