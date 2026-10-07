// Lighting plot. Three-point studio rig - warm tungsten key, cold rim, image-based
// fill - re-lit per shot the way a gaffer cheats lights between setups. Positions
// are solved in the camera's basis so the key/rim relationship survives any move;
// scene 4 switches to world-fixed lamps so the orbit drags highlights across the
// surfaces instead of carrying them along.

import { CALLOUTS, EXPLODE, FPS, HOOK_HITS, ORBIT, PEAK_PULSES, SCENES, STRIKES } from './timeline.ts';
import { add3, clamp, invLerp, len3, lerp, mix3, scale3, smoothstep, sub3, type Vec3 } from './math.ts';
import type { CameraState } from './camera.ts';
import { anchorWorld, type ComponentId } from './pose.ts';

export type SpotState = {
  position: Vec3;
  target: Vec3;
  /** Luminous intensity, candela (three.js physical units). */
  intensity: number;
  color: string;
  /** Cone half-angle, radians. */
  angle: number;
  penumbra: number;
};

export type LightingState = {
  key: SpotState;
  rim: SpotState;
  accent: SpotState;
  /** Image-based fill multiplier (scene.environmentIntensity). */
  env: number;
  /** Emission multiplier of the background practicals (tungsten strips, cold slab). */
  practicals: number;
  /** Which part glows from inside during the scene-2 readouts. */
  highlight: { id: ComponentId | null; amount: number };
  floor: { concrete: number; grid: number; shadow: number };
  depthWall: number;
  speedLines: number;
};

export const KELVIN = {
  tungsten: '#ffb36b', // ~2900 K
  warmWhite: '#ffe3c4', // ~4500 K - key: warm, but keeps royal blue honest
  daylight: '#f4f1ff',
  rimBlue: '#6d8cff', // cold rim, royal-tinted
  royal: '#2f55ff',
} as const;

export const CALLOUT_ORDER: readonly ComponentId[] = ['rearChamber', 'frontChamber', 'shank', 'midsole', 'upper'];

/** Camera basis: right, up, forward. */
const basis = (cam: CameraState): { r: Vec3; u: Vec3; f: Vec3 } => {
  const f0 = sub3(cam.target, cam.position);
  const f = scale3(f0, 1 / len3(f0));
  const r0: Vec3 = [-f[2], 0, f[0]]; // forward x world-up
  const r = scale3(r0, 1 / (len3(r0) || 1));
  const u: Vec3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return { r, u, f };
};

const inCameraSpace = (cam: CameraState, right: number, up: number, toward: number, dist: number): Vec3 => {
  const { r, u, f } = basis(cam);
  const dir = add3(add3(scale3(r, right), scale3(u, up)), scale3(f, -toward));
  return add3(cam.target, scale3(dir, dist / len3(dir)));
};

const hitEnvelope = (frame: number, cues: readonly { frame: number; strength: number }[], decay: number): number => {
  let v = 0;
  for (const c of cues) {
    const t = (frame - c.frame) / FPS;
    if (t >= 0 && t < decay * 6) v = Math.max(v, c.strength * Math.exp(-t / decay));
  }
  return v;
};

const shotIndex = (frame: number) => {
  let i = 0;
  while (i < HOOK_HITS.length - 1 && frame >= HOOK_HITS[i + 1].frame) i++;
  return i;
};

/** 0..1 per callout: rises as its readout locks on, hands over to the next. */
export const calloutHighlight = (index: number, frame: number): number => {
  const start = CALLOUTS.start + index * CALLOUTS.stagger;
  const end = index === CALLOUT_ORDER.length - 1 ? CALLOUTS.retract : start + CALLOUTS.stagger + 12;
  return smoothstep(start - 4, start + 10, frame) * (1 - smoothstep(end - 6, end + 10, frame));
};

/** Camera-relative rig presets: [right, up, toward-camera] directions for key and rim. */
const RIGS = {
  /** Low side key + low backlight: reaches the tubes under the midsole overhang. */
  macro: { key: [-1.0, 0.22, 0.75], rim: [0.55, 0.1, -1.0], keyAngle: 0.42, rimAngle: 0.3 },
  product: { key: [-0.9, 0.8, 0.6], rim: [0.75, 0.55, -1.0], keyAngle: 0.45, rimAngle: 0.38 },
  run: { key: [-0.8, 0.45, 0.7], rim: [0.8, 0.3, -1.0], keyAngle: 0.5, rimAngle: 0.42 },
  hero: { key: [-0.95, 1.0, 0.55], rim: [0.85, 0.7, -1.0], keyAngle: 0.55, rimAngle: 0.4 },
} as const;

type RigId = keyof typeof RIGS;

const MACRO_RIG_BY_SHOT: RigId[] = ['macro', 'macro', 'macro', 'product', 'macro', 'product', 'macro', 'macro', 'product', 'product'];

export const lightingAt = (frame: number, cam: CameraState): LightingState => {
  const scene = frame < SCENES.explode.from ? 'macro' : frame < SCENES.velocity.from ? 'explode' : frame < SCENES.peak.from ? 'velocity' : frame < SCENES.lockup.from ? 'peak' : 'lockup';
  const dist = Math.max(0.6, len3(sub3(cam.target, cam.position)) * 1.4);
  const rigId: RigId = scene === 'macro' ? MACRO_RIG_BY_SHOT[shotIndex(frame)] : scene === 'velocity' ? 'run' : scene === 'lockup' ? 'hero' : 'product';
  const rig = RIGS[rigId];

  let key: SpotState = {
    position: inCameraSpace(cam, rig.key[0], rig.key[1], rig.key[2], dist),
    target: cam.target,
    intensity: 6,
    color: KELVIN.warmWhite,
    angle: rig.keyAngle,
    penumbra: 0.9,
  };
  let rim: SpotState = {
    position: inCameraSpace(cam, rig.rim[0], rig.rim[1], rig.rim[2], dist),
    target: cam.target,
    intensity: 18,
    color: KELVIN.rimBlue,
    angle: rig.rimAngle,
    penumbra: 0.75,
  };
  let accent: SpotState = {
    position: inCameraSpace(cam, -0.2, 1.2, 0.2, dist * 0.8),
    target: cam.target,
    intensity: 0,
    color: KELVIN.warmWhite,
    angle: 0.12,
    penumbra: 0.6,
  };
  let env = 0.35;
  let practicals = 1;
  let highlight: LightingState['highlight'] = { id: null, amount: 0 };
  const floor = { concrete: 1, grid: 0, shadow: 0 };
  let depthWall = 0;
  let speedLines = 0;

  if (scene === 'macro') {
    const shot = shotIndex(frame);
    const punch = hitEnvelope(frame, HOOK_HITS, 0.09);
    key.intensity = 6 * (1 + 0.6 * punch);
    rim.intensity = 18 * (1 + 0.8 * punch);
    if (shot === 3) {
      // Silhouette: no key, hot rim, starved fill.
      key.intensity = 0;
      rim.intensity = 34;
      rim.position = inCameraSpace(cam, 0.2, 0.3, -1.0, dist);
      env = 0.06;
    }
    if (shot === 4) {
      // Travelling hard light sweeping heel -> forefoot across the tubes.
      const u = invLerp(HOOK_HITS[4].frame, HOOK_HITS[5].frame, frame);
      key.intensity = 2;
      accent = {
        ...accent,
        intensity: 26,
        position: [lerp(-0.2, 0.02, u), 0.32, 0.22],
        target: [lerp(-0.14, -0.05, u), 0.015, 0.03],
        angle: 0.09,
        penumbra: 0.5,
      };
    }
  }

  if (scene === 'explode') {
    key.intensity = 5;
    rim.intensity = 9;
    env = 0.4;
    practicals = lerp(1, 0.6, smoothstep(SCENES.explode.from, EXPLODE.start + 60, frame));
    let best = 0;
    CALLOUT_ORDER.forEach((id, i) => {
      const a = calloutHighlight(i, frame);
      if (a > best) {
        best = a;
        highlight = { id, amount: a };
      }
    });
    if (highlight.id) {
      const anchor = anchorWorld(highlight.id, frame);
      key.intensity = lerp(5, 2.6, highlight.amount);
      // Tight, close source on the active part only - no pool spilling onto the floor.
      accent = {
        position: add3(anchor, scale3(sub3(cam.position, anchor), 0.22)),
        target: anchor,
        intensity: 4 * highlight.amount,
        color: highlight.id === 'rearChamber' || highlight.id === 'frontChamber' ? KELVIN.daylight : KELVIN.warmWhite,
        angle: 0.1,
        penumbra: 0.8,
      };
      accent.position = add3(accent.position, [0, 0.1, 0]);
    }
    const toGrid = smoothstep(SCENES.velocity.from - 30, SCENES.velocity.from + 6, frame);
    floor.concrete = 1 - toGrid;
    floor.grid = toGrid;
  }

  if (scene === 'velocity') {
    const strike = hitEnvelope(frame, STRIKES, 0.08);
    key.intensity = 6 * (1 + 0.35 * strike);
    rim.intensity = 16 * (1 + 0.5 * strike);
    env = 0.45;
    practicals = 0.4;
    floor.concrete = 0;
    floor.grid = 1 - smoothstep(ORBIT.start - 30, ORBIT.start + 10, frame);
    depthWall = smoothstep(SCENES.velocity.from - 10, SCENES.velocity.from + 30, frame) * (1 - smoothstep(ORBIT.start - 20, ORBIT.start + 10, frame));
    speedLines = depthWall;
  }

  if (scene === 'peak') {
    // World-fixed lamps: highlights now travel across the surfaces as we orbit.
    const pulse = hitEnvelope(frame, PEAK_PULSES, 0.07);
    const target: Vec3 = [0, 0.14, 0];
    key = { ...key, position: [0.55, 0.85, 0.75], target, intensity: 7, color: KELVIN.warmWhite };
    rim = { ...rim, position: [-0.8, 0.55, -0.85], target, intensity: 22 * (1 + 2.2 * pulse), color: KELVIN.rimBlue };
    accent = { ...accent, position: [0, -0.6, 0.1], target, intensity: 10 * (1 + pulse), color: KELVIN.royal, angle: 0.35, penumbra: 1 };
    env = 0.3;
    practicals = 1.2;
    floor.concrete = 0;
    floor.grid = 0;
    const blend = smoothstep(ORBIT.start, ORBIT.start + 30, frame);
    key.position = mix3(inCameraSpace(cam, RIGS.run.key[0], RIGS.run.key[1], RIGS.run.key[2], dist), key.position, blend);
  }

  if (scene === 'lockup') {
    key = { ...key, position: inCameraSpace(cam, rig.key[0], rig.key[1], rig.key[2], 1.4), target: [0, 0.04, 0], intensity: 8, penumbra: 1 };
    rim = { ...rim, position: inCameraSpace(cam, rig.rim[0], rig.rim[1], rig.rim[2], 1.3), target: [0, 0.05, 0], intensity: 15 };
    env = 0.22;
    practicals = 0;
    floor.concrete = 0;
    floor.grid = 0;
    floor.shadow = 1;
  }

  return { key, rim, accent, env, practicals: clamp(practicals, 0, 2), highlight, floor, depthWall, speedLines };
};
