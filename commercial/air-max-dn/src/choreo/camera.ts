// Virtual camera: one deterministic function of the frame. Shots are authored the
// way a DP would - target, azimuth/elevation/distance, focal length (28-85 mm on a
// 36 mm-wide sensor), and the depth of the sharp zone - then layered with an
// operator drift and physically-decaying kicks on every impact.

import { FPS, GAIT, HOOK_HITS, ORBIT, SCENES, STRIKES, VELOCITY_CUTS, WHIP } from './timeline.ts';
import {
  DEG,
  EASE,
  add3,
  clamp,
  dampedKick,
  fbm1,
  invLerp,
  len3,
  lerp,
  mix3,
  sampleTrack,
  scale3,
  smootherstep,
  sub3,
  type Ease,
  type Key,
  type Vec3,
} from './math.ts';
import { DROP_IMPACTS } from './physics.ts';
import { shoeCentre } from './pose.ts';

export type CameraState = {
  position: Vec3;
  target: Vec3;
  /** Dutch angle, radians. */
  roll: number;
  /** Focal length, mm (36 mm horizontal film gauge, same as Blender's default sensor). */
  focal: number;
  /** Distance to the focal plane, metres. */
  focus: number;
  /** Depth of the acceptably sharp zone around the focal plane, metres. */
  depth: number;
  /** Increments on every hard cut - motion-derived effects never differentiate across a cut. */
  cut: number;
};

type Setup = {
  target: Vec3;
  az: number;
  el: number;
  dist: number;
  focal: number;
  depth: number;
  roll?: number;
  /** Optional focus point; defaults to the target. */
  focusAt?: Vec3;
};

const orbitPosition = (target: Vec3, azDeg: number, elDeg: number, dist: number): Vec3 => {
  const az = azDeg * DEG;
  const el = elDeg * DEG;
  return [target[0] + dist * Math.cos(el) * Math.sin(az), target[1] + dist * Math.sin(el), target[2] + dist * Math.cos(el) * Math.cos(az)];
};

const mixSetup = (a: Setup, b: Setup, t: number): Setup => ({
  target: mix3(a.target, b.target, t),
  az: lerp(a.az, b.az, t),
  el: lerp(a.el, b.el, t),
  dist: lerp(a.dist, b.dist, t),
  focal: lerp(a.focal, b.focal, t),
  depth: lerp(a.depth, b.depth, t),
  roll: lerp(a.roll ?? 0, b.roll ?? 0, t),
  focusAt: a.focusAt && b.focusAt ? mix3(a.focusAt, b.focusAt, t) : (b.focusAt ?? a.focusAt),
});

const resolve = (s: Setup, cut: number): CameraState => {
  const position = orbitPosition(s.target, s.az, s.el, s.dist);
  return {
    position,
    target: s.target,
    roll: (s.roll ?? 0) * DEG,
    focal: s.focal,
    focus: len3(sub3(s.focusAt ?? s.target, position)),
    depth: s.depth,
    cut,
  };
};

/* --------------------------------------------------------- 1. Macro shots */

type Shot = { from: number; to: number; a: Setup; b: Setup; ease?: Ease };

const POD_REAR: Vec3 = [-0.108, 0.0152, 0.041];
const POD_FRONT: Vec3 = [-0.0855, 0.0148, 0.0415];

const h = HOOK_HITS.map((c) => c.frame);
const MACRO_SHOTS: Shot[] = [
  {
    from: h[0], to: h[1],
    a: { target: [-0.112, 0.016, 0.04], az: 6, el: 3, dist: 0.14, focal: 85, depth: 0.018 },
    b: { target: [-0.11, 0.016, 0.04], az: 2, el: 4, dist: 0.122, focal: 85, depth: 0.016 },
  },
  {
    // Down the row of pods, rack focus front tube -> rear tube.
    from: h[1], to: h[2],
    a: { target: [-0.095, 0.015, 0.045], az: 58, el: 2, dist: 0.17, focal: 70, depth: 0.012, focusAt: POD_FRONT },
    b: { target: [-0.097, 0.015, 0.045], az: 52, el: 3, dist: 0.15, focal: 70, depth: 0.012, focusAt: POD_REAR },
    ease: EASE.cubicInOut,
  },
  {
    // One pod fills frame - compression is unmistakable.
    from: h[2], to: h[3],
    a: { target: [-0.066, 0.0152, 0.044], az: 0, el: 0, dist: 0.085, focal: 85, depth: 0.02 },
    b: { target: [-0.066, 0.0152, 0.044], az: 1.5, el: 1, dist: 0.078, focal: 85, depth: 0.02 },
  },
  {
    // Breath: full silhouette, rim light only.
    from: h[3], to: h[4],
    a: { target: [0, 0.05, 0], az: 0, el: 1, dist: 0.62, focal: 50, depth: 0.5 },
    b: { target: [0, 0.05, 0], az: -1.5, el: 1.5, dist: 0.58, focal: 50, depth: 0.5 },
  },
  {
    // Truck along the tubes under a travelling light.
    from: h[4], to: h[5],
    a: { target: [-0.125, 0.016, 0.042], az: 12, el: 9, dist: 0.12, focal: 85, depth: 0.022 },
    b: { target: [-0.068, 0.016, 0.042], az: 14, el: 9, dist: 0.12, focal: 85, depth: 0.022 },
    ease: EASE.sineInOut,
  },
  {
    from: h[5], to: h[6],
    a: { target: [-0.12, 0.03, 0], az: -128, el: 9, dist: 0.3, focal: 50, depth: 0.08 },
    b: { target: [-0.12, 0.03, 0], az: -122, el: 8, dist: 0.27, focal: 50, depth: 0.08 },
  },
  {
    from: h[6], to: h[7],
    a: { target: [-0.075, 0.016, 0.04], az: 30, el: 14, dist: 0.15, focal: 85, depth: 0.02 },
    b: { target: [-0.075, 0.016, 0.04], az: 32, el: 14, dist: 0.14, focal: 85, depth: 0.02 },
  },
  {
    from: h[7], to: h[8],
    a: { target: [-0.115, 0.016, 0.04], az: -18, el: -1, dist: 0.13, focal: 85, depth: 0.02 },
    b: { target: [-0.115, 0.016, 0.04], az: -20, el: -0.5, dist: 0.125, focal: 85, depth: 0.02 },
  },
  {
    from: h[8], to: h[9],
    a: { target: [-0.08, 0.03, 0], az: 72, el: 18, dist: 0.34, focal: 35, depth: 0.12, roll: -4 },
    b: { target: [-0.08, 0.03, 0], az: 70, el: 18, dist: 0.31, focal: 35, depth: 0.12, roll: -4 },
  },
];

/* ------------------------------------------------------- 2. Explode track */

type SetupKey = { frame: number; setup: Setup; ease?: Ease };

const EXPLODE_KEYS: SetupKey[] = [
  { frame: h[9], setup: { target: [0, 0.055, 0], az: 32, el: 11, dist: 0.62, focal: 50, depth: 0.45 } },
  { frame: 420, setup: { target: [0, 0.135, 0.005], az: 20, el: 13, dist: 0.66, focal: 45, depth: 0.6 }, ease: EASE.operator },
  { frame: 672, setup: { target: [0, 0.133, 0.005], az: -6, el: 9, dist: 0.63, focal: 45, depth: 0.6 }, ease: EASE.sineInOut },
  { frame: 756, setup: { target: [0, 0.05, 0], az: 4, el: 4, dist: 0.6, focal: 38, depth: 0.5 }, ease: EASE.cubicInOut },
];

const sampleSetupKeys = (keys: SetupKey[], frame: number): Setup => {
  if (frame <= keys[0].frame) return keys[0].setup;
  for (let i = 1; i < keys.length; i++) {
    if (frame <= keys[i].frame) {
      const t = invLerp(keys[i - 1].frame, keys[i].frame, frame);
      return mixSetup(keys[i - 1].setup, keys[i].setup, (keys[i].ease ?? EASE.cubicInOut)(t));
    }
  }
  return keys[keys.length - 1].setup;
};

/* --------------------------------------------------- 3. Velocity tracking */

/** Lazy operator follow: weighted look-back over the last ~0.4 s of shoe motion. */
const followTarget = (frame: number): Vec3 => {
  let x = 0;
  let wsum = 0;
  for (let k = 0; k < 8; k++) {
    const w = 1 - k / 9;
    x += shoeCentre(frame - k * 3)[0] * w;
    wsum += w;
  }
  return [x / wsum + 0.015, 0.058, 0];
};

const velocitySetup = (frame: number): { setup: Setup; cut: number } => {
  const target = followTarget(frame);
  if (frame < VELOCITY_CUTS[0]) {
    const t = invLerp(SCENES.velocity.from, VELOCITY_CUTS[0], frame);
    return {
      cut: 100,
      setup: { target, az: lerp(0, -4, t), el: 3, dist: lerp(0.62, 0.56, t), focal: 35, depth: 0.3, roll: lerp(0, -2.5, t) },
    };
  }
  if (frame < VELOCITY_CUTS[1]) {
    const t = invLerp(VELOCITY_CUTS[0], VELOCITY_CUTS[1], frame);
    return {
      cut: 101,
      setup: { target, az: lerp(48, 56, t), el: 4, dist: lerp(0.4, 0.37, t), focal: 28, depth: 0.22, roll: 3 },
    };
  }
  const t = invLerp(VELOCITY_CUTS[1], WHIP.start, frame);
  return {
    cut: 102,
    setup: { target, az: lerp(-38, -30, t), el: 7, dist: lerp(0.48, 0.44, t), focal: 40, depth: 0.24, roll: -1.5 },
  };
};

/* --------------------------------------------------------- 4. Peak orbit */

const ORBIT_TARGET: Vec3 = [0, 0.15, 0];

const orbitSetup = (frame: number): Setup => {
  const p = invLerp(ORBIT.start, ORBIT.end, frame);
  const arc = Math.sin(Math.PI * p);
  const after = Math.max(0, frame - ORBIT.end) / FPS;
  return {
    target: ORBIT_TARGET,
    az: -10 + 360 * EASE.quintInOut(p) + 10 * after,
    el: -6 + 20 * arc,
    dist: lerp(0.52, 0.4, arc) - 0.03 * clamp(after / 1),
    focal: lerp(40, 28, arc) + 5 * clamp(after / 1),
    depth: 0.25,
    roll: 6 * Math.sin(2 * Math.PI * p),
  };
};

/* ---------------------------------------------------------- 5. Hero card */

const heroSetup = (frame: number): Setup => {
  const push = EASE.sineInOut(invLerp(SCENES.lockup.from, SCENES.lockup.to, frame));
  const az = 28;
  const right: Vec3 = [Math.cos(az * DEG), 0, -Math.sin(az * DEG)];
  return {
    target: add3([0, 0.05, 0], scale3(right, 0.155)),
    az,
    el: 8,
    dist: lerp(1.06, 0.99, push),
    focal: 60,
    depth: 0.35,
    focusAt: [0, 0.045, 0],
  };
};

/* ------------------------------------------------------------- Assemble */

const baseCamera = (frame: number): CameraState => {
  if (frame < h[9]) {
    const i = MACRO_SHOTS.findIndex((s) => frame >= s.from && frame < s.to);
    const shot = MACRO_SHOTS[Math.max(0, i)];
    const t = (shot.ease ?? EASE.sineInOut)(invLerp(shot.from, shot.to, frame));
    return resolve(mixSetup(shot.a, shot.b, t), i);
  }
  if (frame < SCENES.velocity.from - 40) return resolve(sampleSetupKeys(EXPLODE_KEYS, frame), 50);
  if (frame < SCENES.velocity.from + 10) {
    // Exploded hero -> low tracking: blend through 50 frames, no cut.
    const a = resolve(sampleSetupKeys(EXPLODE_KEYS, frame), 50);
    const v = velocitySetup(frame);
    const b = resolve(v.setup, 50);
    return blendStates(a, b, smootherstep(SCENES.velocity.from - 40, SCENES.velocity.from + 10, frame), 50);
  }
  if (frame < WHIP.start) {
    const v = velocitySetup(frame);
    return resolve(v.setup, v.cut);
  }
  if (frame < WHIP.end) {
    // Whip pan: accelerate the tracking camera's yaw, hand over to the orbit mid-blur.
    const u = invLerp(WHIP.start, WHIP.end, frame);
    const v = velocitySetup(frame);
    const whip = resolve({ ...v.setup, az: v.setup.az + 95 * EASE.expoIn(Math.min(1, u * 1.25)) }, 103);
    const orbit = resolve(orbitSetup(frame), 103);
    return blendStates(whip, orbit, smootherstep(0.45, 0.85, u), 103);
  }
  if (frame < SCENES.lockup.from) return resolve(orbitSetup(frame), 103);
  return resolve(heroSetup(frame), 200);
};

const blendStates = (a: CameraState, b: CameraState, t: number, cut: number): CameraState => ({
  position: mix3(a.position, b.position, t),
  target: mix3(a.target, b.target, t),
  roll: lerp(a.roll, b.roll, t),
  focal: lerp(a.focal, b.focal, t),
  focus: lerp(a.focus, b.focus, t),
  depth: lerp(a.depth, b.depth, t),
  cut,
});

/* ----------------------------------------------------- Operator + kicks */

type Kick = { frame: number; strength: number };
const KICKS: Kick[] = [
  ...HOOK_HITS.map((c) => ({ frame: c.frame, strength: c.strength })),
  ...STRIKES.map((c) => ({ frame: c.frame, strength: 0.35 * c.strength })),
  ...DROP_IMPACTS.slice(0, 2).map((i, k) => ({ frame: i.frame, strength: k === 0 ? 0.55 : 0.2 })),
];

const kickAt = (frame: number): number => {
  let sum = 0;
  for (const k of KICKS) {
    const t = (frame - k.frame) / FPS;
    if (t >= 0 && t < 0.6) sum += k.strength * dampedKick(t, 11, 0.075);
  }
  return sum;
};

const DRIFT: Key[] = [
  { frame: 0, value: 1 },
  { frame: SCENES.explode.from, value: 0.25 },
  { frame: GAIT.enter, value: 1 },
  { frame: ORBIT.start, value: 0 },
  { frame: SCENES.lockup.from, value: 0.35 },
];

export const cameraAt = (frame: number): CameraState => {
  const base = baseCamera(frame);
  const drift = sampleTrack(DRIFT, frame);
  const forward = sub3(base.target, base.position);
  const dist = len3(forward);
  // Operator drift: sub-degree, low-frequency - the opposite of a CG "float".
  const yaw = drift * 0.3 * DEG * fbm1(frame / 95, 7);
  const pitch = drift * 0.2 * DEG * fbm1(frame / 120, 19);
  const kick = kickAt(frame);
  const offset: Vec3 = [
    -forward[2] * yaw,
    dist * (pitch + 0.004 * kick),
    forward[0] * yaw,
  ];
  return {
    ...base,
    position: add3(base.position, offset),
    roll: base.roll + 0.45 * DEG * kick,
  };
};

/** View-direction angular speed in degrees per frame (0 across hard cuts). */
export const cameraAngularSpeed = (frame: number): number => {
  const a = cameraAt(frame - 1);
  const b = cameraAt(frame + 1);
  if (a.cut !== b.cut) return 0;
  const da = sub3(a.target, a.position);
  const db = sub3(b.target, b.position);
  const cos = clamp((da[0] * db[0] + da[1] * db[1] + da[2] * db[2]) / (len3(da) * len3(db)), -1, 1);
  return Math.acos(cos) / DEG / 2;
};

/** Sign of horizontal screen motion (+1 scene slides left->right). */
export const cameraPanDirection = (frame: number): number => {
  const a = cameraAt(frame - 1);
  const b = cameraAt(frame + 1);
  const fa = sub3(a.target, a.position);
  const fb = sub3(b.target, b.position);
  const cross = fa[2] * fb[0] - fa[0] * fb[2];
  return cross >= 0 ? 1 : -1;
};

/** Physical-equivalent f-number that gives `depth` metres of sharp zone (CoC 0.03 mm) - for Blender. */
export const equivalentFStop = (state: CameraState): number => {
  const f = state.focal / 1000;
  const n = (state.depth * f * f) / (2 * 0.00003 * state.focus * state.focus);
  return clamp(n, 1.2, 128);
};

