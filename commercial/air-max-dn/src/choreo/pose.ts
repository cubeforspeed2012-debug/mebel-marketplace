// Where the shoe is, and where each of its parts is, at any frame.
// Root motion: rest -> stride cycle (scene 3) -> suspended float (scene 4) -> drop
// and settle (scene 5). Part motion: the scene-2 explode/reassemble springs plus
// the stack lowering when the Dynamic Air chambers compress.

import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { DROP, EXPLODE, FPS, GAIT, ORBIT, SCENES } from './timeline.ts';
import { DEG, EASE, SPRINGS, clamp, lerp, smootherstep, springAt, type SpringConfig, type Vec3 } from './math.ts';
import { compressionAt, dropHeightAt, timeSinceTouchdown } from './physics.ts';
import { SPEC, halfWidth, heelCarrierBottom, midsoleBottom, midsoleTop, outsoleTop, tubes, upperPoint, xAt } from '../geometry/spec.ts';

export type ComponentId = 'upper' | 'midsole' | 'rearChamber' | 'frontChamber' | 'shank' | 'outsole';
export const COMPONENTS: readonly ComponentId[] = ['outsole', 'rearChamber', 'frontChamber', 'shank', 'midsole', 'upper'];

export type Quat = [number, number, number, number];
export type Transform = { position: Vec3; quaternion: Quat };

const IDENTITY: Quat = [0, 0, 0, 1];

/* -------------------------------------------------------------- Explode */

type ExplodeSpec = {
  offset: Vec3;
  rotationDeg: Vec3;
  delayOut: number;
  delayIn: number;
  spring: SpringConfig;
};

const EXPLODE_SPECS: Record<ComponentId, ExplodeSpec> = {
  upper: { offset: [-0.008, 0.105, 0], rotationDeg: [0, 0, 5], delayOut: 0, delayIn: 18, spring: SPRINGS.heavy },
  midsole: { offset: [0, 0.05, 0], rotationDeg: [0, 0, 0], delayOut: 6, delayIn: 14, spring: SPRINGS.heavy },
  outsole: { offset: [0, -0.065, 0], rotationDeg: [0, 0, -3], delayOut: 4, delayIn: 10, spring: SPRINGS.snap },
  rearChamber: { offset: [-0.03, 0.015, 0], rotationDeg: [0, -8, 0], delayOut: 14, delayIn: 6, spring: SPRINGS.snap },
  frontChamber: { offset: [0.012, 0.015, 0], rotationDeg: [0, 8, 0], delayOut: 18, delayIn: 8, spring: SPRINGS.snap },
  shank: { offset: [0.03, -0.012, 0.075], rotationDeg: [12, 0, 0], delayOut: 24, delayIn: 0, spring: SPRINGS.snap },
};

const chamberCentre = (id: string): Vec3 => {
  const list = tubes().filter((t) => t.chamber === id);
  const t = (list[0].t + list[list.length - 1].t) / 2;
  return [xAt(t), list[0].bottom + list[0].radius, 0];
};

/** Rotation pivots: each part spins about its own visual centre while it separates. */
export const PIVOTS: Record<ComponentId, Vec3> = {
  upper: [0, midsoleTop(0.4) + 0.03, 0],
  midsole: [0, (midsoleTop(0.5) + midsoleBottom(0.5)) / 2, 0],
  outsole: [0, outsoleTop(0.5) / 2, 0],
  rearChamber: chamberCentre('rearChamber'),
  frontChamber: chamberCentre('frontChamber'),
  shank: [xAt((SPEC.shank.start + SPEC.shank.end) / 2), midsoleBottom(0.4), 0],
};

/** 0 = assembled, 1 = fully exploded. Spring out, spring back - overshoot is kept, it reads as mass. */
export const explodeAmount = (id: ComponentId, frame: number): number => {
  const s = EXPLODE_SPECS[id];
  return springAt(frame, EXPLODE.start + s.delayOut, FPS, s.spring) - springAt(frame, EXPLODE.reassemble + s.delayIn, FPS, SPRINGS.snap);
};

/* ---------------------------------------------------------- Compression */

const TUBES = tubes();
const REAR_R = TUBES.find((t) => t.chamber === 'rearChamber')?.radius ?? 0.0095;
const FRONT_R = TUBES.find((t) => t.chamber === 'frontChamber')?.radius ?? 0.0088;
const STACK_PIVOT: Vec3 = [0.03, heelCarrierBottom(0.3), 0];
const HEEL_X = -0.11;

/** The midsole + upper ride down on the squashed tubes, hinging about the forefoot. */
const stackHinge = (frame: number): number => {
  const drop = 2 * (REAR_R * compressionAt('rear', frame) * 0.65 + FRONT_R * compressionAt('front', frame) * 0.35);
  return Math.atan2(drop, STACK_PIVOT[0] - HEEL_X);
};

/** Tube transform inside its chamber group: bottom-centre anchored, volume-ish preserving squash. */
export const tubeTransform = (index: number, frame: number): { position: Vec3; scale: Vec3 } => {
  const tube = TUBES[index];
  const c = compressionAt(tube.chamber === 'rearChamber' ? 'rear' : 'front', frame);
  return {
    position: [xAt(tube.t), tube.bottom, (tube.zMin + tube.zMax) / 2],
    scale: [1 + 0.9 * c, 1 - c, 1],
  };
};

/* ------------------------------------------------------------ Transforms */

const _m = new Matrix4();
const _m2 = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _v = new Vector3();
const _s = new Vector3(1, 1, 1);

const rotateAbout = (pivot: Vec3, q: Quaternion, out: Matrix4): Matrix4 => {
  out.makeTranslation(pivot[0], pivot[1], pivot[2]);
  out.multiply(_m2.makeRotationFromQuaternion(q));
  out.multiply(_m2.makeTranslation(-pivot[0], -pivot[1], -pivot[2]));
  return out;
};

/** Local (root-space) matrix of a component at a frame. */
export const componentMatrix = (id: ComponentId, frame: number, out = new Matrix4()): Matrix4 => {
  const spec = EXPLODE_SPECS[id];
  const e = explodeAmount(id, frame);
  out.makeTranslation(spec.offset[0] * e, spec.offset[1] * e, spec.offset[2] * e);
  _e.set(spec.rotationDeg[0] * DEG * e, spec.rotationDeg[1] * DEG * e, spec.rotationDeg[2] * DEG * e);
  _q.setFromEuler(_e);
  out.multiply(rotateAbout(PIVOTS[id], _q, _m));
  if (id === 'midsole' || id === 'upper') {
    _q.setFromAxisAngle(_v.set(0, 0, 1), stackHinge(frame));
    out.multiply(rotateAbout(STACK_PIVOT, _q, _m));
  }
  return out;
};

export const componentTransform = (id: ComponentId, frame: number): Transform => {
  const m = componentMatrix(id, frame);
  const p = new Vector3();
  const q = new Quaternion();
  m.decompose(p, q, _s);
  return { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
};

/* ------------------------------------------------------------ Root: gait */

const P_HEEL: Vec3 = [xAt(0.05), 0, 0];
const P_BALL: Vec3 = [xAt(0.8), 0, 0];
const STRIKE_PITCH = 13 * DEG;
const TOEOFF_PITCH = -40 * DEG;
const STRIDE = 0.4; // ground travel per cycle, metres
const X0 = -0.035; // heel contact x at strike
const WARP = 0.55; // slow-mo at impact, fast swing - stays locked to the beat grid

const pitchQuat = (theta: number, out = new Quaternion()) => out.setFromAxisAngle(new Vector3(0, 0, 1), theta);

/** Root position given a world pivot, the pivot's local position and a pitch. */
const pivotPose = (world: Vec3, local: Vec3, theta: number): Transform => {
  const q = pitchQuat(theta);
  const rotated = new Vector3(...local).applyQuaternion(q);
  return { position: [world[0] - rotated.x, world[1] - rotated.y, world[2] - rotated.z], quaternion: [q.x, q.y, q.z, q.w] };
};

const heelWorldOf = (pose: Transform): Vec3 => {
  const v = new Vector3(...P_HEEL).applyQuaternion(new Quaternion(...pose.quaternion));
  return [pose.position[0] + v.x, pose.position[1] + v.y, pose.position[2] + v.z];
};

/** Warped stride phase. Integer crossings land exactly on GAIT strike frames. */
export const gaitPhase = (frame: number): { cycle: number; phase: number } => {
  const lin = (frame - GAIT.firstStrike) / GAIT.period;
  const cycle = Math.floor(lin);
  const frac = lin - cycle;
  return { cycle, phase: frac - (WARP * Math.sin(2 * Math.PI * frac)) / (2 * Math.PI) };
};

const gaitPoseAtPhase = (phase: number): Transform => {
  if (phase < 0.12) {
    const u = phase / 0.12;
    return pivotPose([X0 - STRIDE * phase, 0, 0], P_HEEL, STRIKE_PITCH * (1 - u * u));
  }
  if (phase < 0.36) return pivotPose([X0 - STRIDE * phase, 0, 0], P_HEEL, 0);
  if (phase < 0.52) {
    const u = (phase - 0.36) / 0.16;
    return pivotPose([X0 - STRIDE * phase + (P_BALL[0] - P_HEEL[0]), 0, 0], P_BALL, TOEOFF_PITCH * Math.pow(u, 1.8));
  }
  const u = (phase - 0.52) / 0.48;
  const start = gaitPoseAtPhase(0.5199999);
  const h0 = heelWorldOf(start);
  const theta = lerp(TOEOFF_PITCH, STRIKE_PITCH, EASE.cubicInOut(u));
  const heel: Vec3 = [
    lerp(h0[0], X0, EASE.sineInOut(u)),
    lerp(h0[1], 0, u) + 0.07 * Math.pow(Math.sin(Math.PI * u), 1.3),
    0,
  ];
  return pivotPose(heel, P_HEEL, theta);
};

/** Ground travel in metres - the grid floor scrolls by exactly this, so the stance foot is planted. */
export const groundTravel = (frame: number): number => {
  const { cycle, phase } = gaitPhase(frame);
  return STRIDE * (cycle + phase);
};

/* ------------------------------------------------------- Root: float/drop */

const floatPose = (frame: number): Transform => {
  const t = (frame - ORBIT.start) / FPS;
  const q = new Quaternion().setFromEuler(
    new Euler((-64 + 4 * Math.sin(t * 1.7)) * DEG, (18 + 22 * clamp((frame - ORBIT.start) / (SCENES.peak.to - ORBIT.start))) * DEG, 8 * DEG, 'YXZ'),
  );
  return { position: [0, 0.135 + 0.004 * Math.sin(t * Math.PI), 0], quaternion: [q.x, q.y, q.z, q.w] };
};

const ROCK = { freqHz: 2.4, zeta: 0.38 };

const dropPose = (frame: number): Transform => {
  const since = timeSinceTouchdown(frame);
  let theta = DROP.pitch * DEG;
  if (since > 0) {
    const w = 2 * Math.PI * ROCK.freqHz;
    const wd = w * Math.sqrt(1 - ROCK.zeta * ROCK.zeta);
    theta *= Math.exp(-ROCK.zeta * w * since) * Math.cos(wd * since);
  }
  const pivot = theta >= 0 ? P_HEEL : P_BALL;
  return pivotPose([pivot[0], dropHeightAt(frame), 0], pivot, theta);
};

const blendPose = (a: Transform, b: Transform, t: number): Transform => {
  const q = new Quaternion(...a.quaternion).slerp(new Quaternion(...b.quaternion), t);
  return {
    position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
    quaternion: [q.x, q.y, q.z, q.w],
  };
};

const REST: Transform = { position: [0, 0, 0], quaternion: IDENTITY };

/** The assembly lifts off the floor while it deconstructs, so the outsole never sinks below it. */
const explodeLift = (frame: number): number =>
  0.075 * (springAt(frame, EXPLODE.start - 12, FPS, SPRINGS.heavy) - springAt(frame, EXPLODE.reassemble + 10, FPS, SPRINGS.heavy));

export const rootTransform = (frame: number): Transform => {
  if (frame < SCENES.explode.from) return REST;
  if (frame < GAIT.enter) return { position: [0, explodeLift(frame), 0], quaternion: IDENTITY };
  if (frame >= SCENES.lockup.from) return dropPose(frame);
  const gait = gaitPoseAtPhase(gaitPhase(frame).phase);
  const enter = smootherstep(GAIT.enter, GAIT.firstStrike - 4, frame);
  const exit = smootherstep(GAIT.exit, ORBIT.start + 36, frame);
  const running = blendPose(REST, gait, enter);
  return exit > 0 ? blendPose(running, floatPose(frame), exit) : running;
};

export const rootMatrix = (frame: number, out = new Matrix4()): Matrix4 => {
  const r = rootTransform(frame);
  return out.compose(new Vector3(...r.position), new Quaternion(...r.quaternion), new Vector3(1, 1, 1));
};

export const componentWorldMatrix = (id: ComponentId, frame: number, out = new Matrix4()): Matrix4 =>
  rootMatrix(frame, out).multiply(componentMatrix(id, frame, new Matrix4()));

/* --------------------------------------------------------------- Anchors */

/** Callout anchor points in component space - the lateral faces the scene-2 camera sees. */
export const ANCHORS: Record<ComponentId, Vec3> = (() => {
  const rear = TUBES.filter((t) => t.chamber === 'rearChamber')[1];
  const front = TUBES.filter((t) => t.chamber === 'frontChamber')[0];
  const shankT = (SPEC.shank.start + SPEC.shank.end) / 2;
  return {
    rearChamber: [xAt(rear.t), rear.bottom + rear.radius, rear.zMax - rear.radius * 0.35],
    frontChamber: [xAt(front.t), front.bottom + front.radius, front.zMax - front.radius * 0.35],
    shank: [xAt(shankT), midsoleBottom(shankT) - SPEC.shank.thickness * 0.5, halfWidth('lateral', shankT) * SPEC.shank.widthRatio * 0.7],
    midsole: [xAt(0.7), (outsoleTop(0.7) + midsoleTop(0.7)) / 2, halfWidth('lateral', 0.7) + SPEC.midsole.flare],
    upper: upperPoint(0.74, 0.24, 1, 0.001),
    outsole: [xAt(0.85), outsoleTop(0.85) - SPEC.outsole.thickness / 2, halfWidth('lateral', 0.85) + SPEC.outsole.flare],
  };
})();

export const anchorWorld = (id: ComponentId, frame: number): Vec3 => {
  const v = new Vector3(...ANCHORS[id]).applyMatrix4(componentWorldMatrix(id, frame));
  return [v.x, v.y, v.z];
};

/** Shoe centre in world space - what the camera operator frames. */
export const shoeCentre = (frame: number): Vec3 => {
  const v = new Vector3(0, 0.045, 0).applyMatrix4(rootMatrix(frame));
  return [v.x, v.y, v.z];
};
