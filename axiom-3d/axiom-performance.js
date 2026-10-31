import { sampleLivingPose, ACTION_DURATIONS } from './living-motion.js?v=attention-1';

export const AXIOM_ACTION_DURATIONS = Object.freeze({ ...ACTION_DURATIONS, attack: 1.15 });

const MOODS = Object.freeze({
  neutral: { breathRate: 1.52, breath: 1, smile: .16, anger: 0, furious: 0, calm: 0, tilt: 0, lean: 0, arm: 0, tail: 1 },
  happy:   { breathRate: 1.78, breath: 1, smile: .88, anger: 0, furious: 0, calm: 0, tilt: -.025, lean: -.012, arm: -.018, tail: 1.35 },
  calm:    { breathRate: 1.05, breath: .7, smile: .25, anger: 0, furious: 0, calm: .85, tilt: .016, lean: .009, arm: .015, tail: .55 },
  angry:   { breathRate: 2.10, breath: .9, smile: 0, anger: .72, furious: 0, calm: 0, tilt: .028, lean: -.025, arm: -.045, tail: 1.05 },
  furious: { breathRate: 2.80, breath: 1, smile: 0, anger: 1, furious: 1, calm: 0, tilt: .045, lean: -.045, arm: -.085, tail: 1.25 },
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const smooth = value => { const p = clamp(value, 0, 1); return p * p * (3 - 2 * p); };
const mix = (a, b, amount) => a + (b - a) * amount;

function curve(progress, knots) {
  if (progress <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    if (progress <= knots[i][0]) {
      const [a, from] = knots[i - 1], [b, to] = knots[i];
      return mix(from, to, smooth((progress - a) / (b - a)));
    }
  }
  return knots[knots.length - 1][1];
}

function pulse(time, start, duration) {
  const p = (time - start) / duration;
  if (p <= 0 || p >= 1) return 0;
  return p < .38 ? smooth(p / .38) : p < .50 ? 1 : 1 - smooth((p - .50) / .50);
}

function blinkAt(time, calm) {
  const clock = time % 23;
  let blink = 0;
  // A double blink and unequal pauses keep the sequence from looking like a
  // metronome. Pure time sampling makes pause/resume and tests reproducible.
  for (const [start, duration] of [[1.9, .18], [5.7, .15], [5.98, .12], [10.3, .17], [15.4, .19], [20.9, .17]]) {
    blink = Math.max(blink, pulse(clock, start, duration * (1 + calm * .25)));
  }
  return blink;
}

function actionState(action) {
  if (!action || !Object.hasOwn(AXIOM_ACTION_DURATIONS, action.type)) return null;
  const fallback = AXIOM_ACTION_DURATIONS[action.type];
  const supplied = finite(action.duration, fallback);
  const duration = supplied > 0 ? supplied : fallback;
  return { type: action.type, time: Math.max(0, finite(action.time)), duration,
    progress: clamp(finite(action.time) / duration, 0, 1) };
}

function legAt(phase, running) {
  const swing = Math.max(0, -Math.sin(phase));
  const stance = Math.max(0, Math.sin(phase));
  return {
    hip: -Math.cos(phase) * (running ? .49 : .29),
    // Flex only after toe-off. The planted leg remains close to straight.
    knee: (running ? .065 : .035) + stance * stance * .035 + Math.pow(swing, 1.35) * (running ? .80 : .56),
  };
}

/**
 * Axiom's animation score. All angles are radians, time/action time are seconds.
 * L is anatomical left (negative X, carrying the tablet). The caller owns
 * smoothing between mood/locomotion choices and the animation clock.
 * This sampler has no random state, timers, storage, sound or DOM side effects.
 */
export function sampleAxiomPerformance(elapsedSeconds, options = {}) {
  const t = Math.max(0, finite(elapsedSeconds));
  const settings = options && typeof options === 'object' ? options : {};
  const mood = Object.hasOwn(MOODS, settings.mood) ? MOODS[settings.mood] : MOODS.neutral;
  const locomotion = ['walk', 'run'].includes(settings.locomotion) ? settings.locomotion : 'idle';
  const pointer = settings.pointer && typeof settings.pointer === 'object' ? settings.pointer : {};
  const action = actionState(settings.action);
  const baselineAction = action && action.type !== 'attack' ? action : null;
  const pose = sampleLivingPose(t, 'axiom', pointer, baselineAction);
  const breath = Math.sin(t * mood.breathRate) * mood.breath;
  const focus = clamp(finite(pointer.attention), 0, 1);
  const x = clamp(finite(pointer.x), -1, 1), y = clamp(finite(pointer.y), -1, 1);

  pose.breath = breath;
  pose.headPitch += mood.tilt;
  pose.headRoll += mood.smile * Math.sin(t * .85) * .018;
  pose.tail *= mood.tail;
  Object.assign(pose, {
    shoulderLX: .012 * Math.sin(t * 1.1) + mood.arm * .35,
    shoulderRX: .018 * Math.sin(t * 1.1 + .6) + mood.arm,
    shoulderLY: 0,
    shoulderRY: 0,
    shoulderLZ: -.012 - breath * .006,
    shoulderRZ: pose.wave + mood.anger * .065,
    elbowL: .035 + (breath + 1) * .008,
    elbowR: .045 + (breath + 1) * .013 + mood.anger * .18,
    wristL: .009 * Math.sin(t * .9),
    wristR: pose.handWiggle + .018 * Math.sin(t * .85),
    hipL: 0, hipR: 0, hipLZ: 0, hipRZ: 0,
    kneeL: 0, kneeR: 0, ankleL: 0, ankleR: 0,
    pelvisYaw: 0, pelvisRoll: 0,
    torsoPitch: mood.lean,
    face: {
      blink: blinkAt(t, mood.calm),
      gazeX: x * .75 + Math.sin(t * .41) * .16 * (1 - focus),
      gazeY: y * .65 + Math.sin(t * .57 + .6) * .07 * (1 - focus),
      smile: mood.smile,
      jawOpen: mood.furious * (.12 + (Math.sin(t * 2.8) + 1) * .035),
      anger: mood.anger,
      furious: mood.furious,
      calm: mood.calm,
    },
  });

  let flight = 0;
  if (locomotion !== 'idle') {
    const running = locomotion === 'run';
    const phase = t * (running ? 8.8 : 5.2);
    const left = legAt(phase, running), right = legAt(phase + Math.PI, running);
    pose.hipL = left.hip;
    pose.hipR = right.hip;
    pose.kneeL = left.knee;
    pose.kneeR = right.knee;
    pose.hipLZ = Math.sin(phase) * .014;
    pose.hipRZ = Math.sin(phase) * .014;
    pose.pelvisYaw = Math.sin(phase) * (running ? .065 : .035);
    pose.pelvisRoll = Math.sin(phase) * (running ? .026 : .018);
    pose.torsoPitch -= running ? .075 : .025;
    pose.bodySway *= .5;
    pose.headPitch += Math.cos(phase * 2) * (running ? .018 : .009);
    // Opposite arm/leg phases, with restrained movement around the tablet.
    pose.shoulderLX -= left.hip * (running ? .23 : .28);
    pose.shoulderRX -= right.hip * (running ? .86 : .78);
    pose.elbowL += running ? .035 : .02;
    pose.elbowR += (running ? .18 : .065) + Math.max(0, right.hip) * .30;
    pose.wristR += Math.sin(phase + .45) * .035;
    pose.tail += Math.sin(phase - .7) * (running ? .025 : .014);
    // A short flight phase at foot exchange belongs to running, not walking.
    flight = running ? Math.pow(Math.abs(Math.cos(phase)), 6) * .045 : 0;
  }

  if (action) {
    const p = action.progress;
    const gesture = Math.sin(p * Math.PI) ** 2;
    if (action.type === 'wave') {
      pose.elbowR += gesture * .14;
      pose.shoulderRX *= 1 - gesture * .65;
      pose.face.smile = mix(pose.face.smile, Math.max(.65, pose.face.smile), gesture);
      pose.face.blink = Math.max(pose.face.blink, pulse(p, .13, .075));
    } else if (action.type === 'jump') {
      const air = p > .23 && p < .76 ? Math.sin((p - .23) / .53 * Math.PI) : 0;
      const crouch = curve(p, [[0, 0], [.15, .16], [.27, 0], [.58, 0], [.76, 0], [.83, .12], [1, 0]]);
      pose.kneeL += crouch + air * .29;
      pose.kneeR += crouch + air * .29;
      pose.hipL -= (crouch + air * .29) * .5;
      pose.hipR -= (crouch + air * .29) * .5;
      pose.shoulderRX -= air * .09;
      pose.elbowR += air * .10;
      pose.face.jawOpen += air * .20;
      pose.face.blink = Math.max(pose.face.blink, pulse(p, .13, .08));
    } else if (action.type === 'spin') {
      pose.pelvisYaw -= gesture * .045;
      pose.shoulderLZ -= gesture * .015;
      pose.face.smile += gesture * .12;
    } else if (action.type === 'attack') {
      // The source hand is open: perform a palm strike, not a pretend fist.
      // Turn the free arm toward the model's oblique front before extending.
      // Positive torso pitch / negative pelvis yaw drive this rig forward.
      const windup = curve(p, [[0, 0], [.24, 1], [.30, 1], [.44, 0], [1, 0]]);
      const punch = curve(p, [[0, 0], [.26, 0], [.46, 1], [.56, 1], [1, 0]]);
      const active = curve(p, [[0, 0], [.24, 1], [.56, 1], [1, 0]]);
      pose.shoulderRX = mix(pose.shoulderRX, mix(.09, -.25, punch), active);
      pose.shoulderRY = mix(pose.shoulderRY, mix(.12, -.65, punch), active);
      pose.shoulderRZ = mix(pose.shoulderRZ, mix(.035, .025, punch), active);
      pose.elbowR = mix(pose.elbowR, mix(.78, .07, punch), active);
      pose.wristR = mix(pose.wristR, mix(.035, -.06, punch), active);
      pose.shoulderLX += windup * .018;
      pose.elbowL += windup * .025;
      pose.pelvisYaw = mix(pose.pelvisYaw, mix(.065, -.10, punch), active);
      pose.torsoPitch = mix(pose.torsoPitch, mix(-.025, .10, punch), active);
      pose.headYaw += -.03 * windup + .035 * punch;
      pose.headPitch += .012 * windup - .01 * punch;
      pose.kneeL += windup * .045;
      pose.kneeR += windup * .065;
      pose.face.anger = Math.max(pose.face.anger, active * .36);
      pose.face.jawOpen += punch * .15;
      pose.face.smile *= 1 - active * .6;
      pose.face.blink = Math.max(pose.face.blink, pulse(p, .13, .075));
    }
  }

  for (const side of ['L', 'R']) {
    pose[`hip${side}`] = clamp(pose[`hip${side}`], -.75, .75);
    pose[`knee${side}`] = clamp(pose[`knee${side}`], 0, 1.30);
    // Counter-rotate the ankle to keep the sole level through stance. The
    // swing knee may flex farther than the ankle's comfortable range.
    pose[`ankle${side}`] = clamp(-pose[`hip${side}`] - pose[`knee${side}`], -.5, .5);
    pose[`elbow${side}`] = clamp(pose[`elbow${side}`], 0, .85);
    pose[`wrist${side}`] = clamp(pose[`wrist${side}`], -.20, .20);
  }

  // Approximate the supplied model's .32-unit thigh and .37-unit lower leg.
  // Lower the pelvis by the shorter planted reach, keeping a sole on the floor
  // rather than making the model float when its hips/knees bend. Running and
  // the explicit jump can lift both soles; idle remains exactly grounded.
  const reach = side => .32 * Math.cos(pose[`hip${side}`]) + .37 * Math.cos(pose[`hip${side}`] + pose[`knee${side}`]);
  const grounding = Math.max(reach('L'), reach('R')) - .69;
  pose.rootY += grounding + flight;
  pose.shoulderLX = clamp(pose.shoulderLX, -.35, .35);
  pose.shoulderRX = clamp(pose.shoulderRX, -.65, .65);
  pose.shoulderLY = clamp(pose.shoulderLY, -.25, .25);
  pose.shoulderRY = clamp(pose.shoulderRY, -.95, .95);
  pose.shoulderLZ = clamp(pose.shoulderLZ, -.30, .30);
  pose.shoulderRZ = clamp(pose.shoulderRZ, -.65, .65);
  pose.headYaw = clamp(pose.headYaw, -.28, .28);
  pose.headPitch = clamp(pose.headPitch, -.12, .12);
  pose.headRoll = clamp(pose.headRoll, -.075, .075);
  pose.tail = clamp(pose.tail, -.13, .13);
  pose.pelvisYaw = clamp(pose.pelvisYaw, -.20, .20);
  pose.pelvisRoll = clamp(pose.pelvisRoll, -.05, .05);
  pose.torsoPitch = clamp(pose.torsoPitch, -.18, .16);
  for (const key of Object.keys(pose.face)) {
    pose.face[key] = clamp(pose.face[key], key.startsWith('gaze') ? -1 : 0, 1);
  }
  return pose;
}
