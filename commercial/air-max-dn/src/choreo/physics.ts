// Procedural physics: the Dynamic Air chambers as driven damped oscillators, and
// the end-card drop as a true ballistic bounce with restitution.
//
// Everything is solved once, at module load, into per-frame tables. A frame
// lookup is then O(1) and identical no matter which Chromium tab renders it or in
// which order, which is what Remotion's parallel renderer requires.

import { CHAMBER_DEMO_HITS, DROP, DURATION_IN_FRAMES, FPS, HOOK_HITS, PEAK_PULSES, STRIKES, TOE_LOADS } from './timeline.ts';
import { clamp, lerp } from './math.ts';

/* ------------------------------------------------------------------ Drop */

export type Impact = { frame: number; speed: number };

type Arc = { tau: number; launch: number };

const solveBounce = () => {
  const { height, gravity: g, restitution: e } = DROP;
  const tauFirst = Math.sqrt((2 * height) / g);
  const arcs: Arc[] = [];
  const impacts: { tau: number; speed: number }[] = [{ tau: tauFirst, speed: g * tauFirst }];
  let tau = tauFirst;
  let speed = g * tauFirst;
  // Stop once the rebound is under 3 cm/s - below that rubber just stays down.
  while (e * speed > 0.03) {
    const launch = e * speed;
    arcs.push({ tau, launch });
    tau += (2 * launch) / g;
    speed = launch;
    impacts.push({ tau, speed });
  }
  return { tauFirst, arcs, impacts, tauRest: tau };
};

const BOUNCE = solveBounce();

const tauToFrame = (tau: number) => DROP.release + (tau / DROP.timeScale) * FPS;
const frameToTau = (frame: number) => ((frame - DROP.release) / FPS) * DROP.timeScale;

/** Impact frames (fractional) and speeds in m/s - consumed by the pods, the camera and the score. */
export const DROP_IMPACTS: readonly Impact[] = BOUNCE.impacts.map((i) => ({ frame: tauToFrame(i.tau), speed: i.speed }));

/** Height of the sole's contact point above the ground plane, in metres. */
export const dropHeightAt = (frame: number): number => {
  const tau = frameToTau(frame);
  if (tau <= 0) return DROP.height;
  if (tau < BOUNCE.tauFirst) return DROP.height - 0.5 * DROP.gravity * tau * tau;
  for (let i = BOUNCE.arcs.length - 1; i >= 0; i--) {
    const arc = BOUNCE.arcs[i];
    if (tau >= arc.tau) {
      const dt = tau - arc.tau;
      return Math.max(0, arc.launch * dt - 0.5 * DROP.gravity * dt * dt);
    }
  }
  return 0;
};

/** Scaled seconds since first touchdown (negative before it). */
export const timeSinceTouchdown = (frame: number): number => frameToTau(frame) - BOUNCE.tauFirst;

/* ------------------------------------------------------------- Air pods */

export type ChamberId = 'rear' | 'front';

/**
 * Dual-pressure chambers. The rear (heel) chamber runs at higher pressure: stiffer,
 * faster, shallower. The front chamber is softer and swings deeper. Pressures are
 * creative values for the readouts - see src/copy.ts.
 */
export const CHAMBERS = {
  rear: { psi: 25, freqHz: 6.5, zeta: 0.32, gain: 0.3, pulse: 0.1 },
  front: { psi: 15, freqHz: 4.8, zeta: 0.28, gain: 0.42, pulse: 0.12 },
} as const;

type Force = { frame: number; strength: number };

const forcesFor = (id: ChamberId): Force[] => {
  const forces: Force[] = [];
  for (const h of HOOK_HITS) forces.push({ frame: h.frame, strength: h.strength * (id === 'rear' ? 1 : 0.85) });
  forces.push(id === 'rear' ? CHAMBER_DEMO_HITS[0] : CHAMBER_DEMO_HITS[1]);
  if (id === 'rear') for (const s of STRIKES) forces.push(s);
  else for (const s of TOE_LOADS) forces.push(s);
  for (const p of PEAK_PULSES) forces.push({ frame: p.frame, strength: 0.25 * p.strength });
  const v1 = DROP_IMPACTS[0].speed;
  DROP_IMPACTS.forEach((imp) => {
    const s = imp.speed / v1;
    // Heel lands first; the toe slap loads the front chamber ~5 frames later.
    forces.push(id === 'rear' ? { frame: imp.frame, strength: 1.2 * s } : { frame: imp.frame + 5, strength: 0.8 * s });
  });
  return forces;
};

/**
 * x'' + 2ζω x' + ω² x = ω² · gain · F(t), F = sum of half-sine force pulses.
 * Semi-implicit Euler at 8 sub-steps per frame (480 Hz) - stable for ω up to ~2π·40.
 */
const integrateChamber = (id: ChamberId): Float32Array => {
  const c = CHAMBERS[id];
  const forces = forcesFor(id).sort((a, b) => a.frame - b.frame);
  const w = 2 * Math.PI * c.freqHz;
  const sub = 8;
  const dt = 1 / (FPS * sub);
  const out = new Float32Array(DURATION_IN_FRAMES + 1);
  let x = 0;
  let v = 0;
  for (let f = 0; f <= DURATION_IN_FRAMES; f++) {
    out[f] = x;
    for (let s = 0; s < sub; s++) {
      const t = (f + s / sub) / FPS;
      let force = 0;
      for (const fc of forces) {
        const u = (t - fc.frame / FPS) / c.pulse;
        if (u >= 0 && u <= 1) force += fc.strength * Math.sin(Math.PI * u);
      }
      const a = w * w * (c.gain * force - x) - 2 * c.zeta * w * v;
      v += a * dt;
      x += v * dt;
    }
  }
  return out;
};

const TABLES: Record<ChamberId, Float32Array> = {
  rear: integrateChamber('rear'),
  front: integrateChamber('front'),
};

/** Fractional compression of a chamber's tube height (0 = rest, 0.5 = half squashed, <0 = rebound). */
export const compressionAt = (id: ChamberId, frame: number): number => {
  const table = TABLES[id];
  const f = clamp(frame, 0, DURATION_IN_FRAMES);
  const i = Math.floor(f);
  const v = lerp(table[i], table[Math.min(DURATION_IN_FRAMES, i + 1)], f - i);
  return clamp(v, -0.12, 0.6);
};

/** Live gauge pressure (psi) from Boyle's law on the effective tube volume. */
export const pressureAt = (id: ChamberId, frame: number): number => {
  const ATM = 14.696;
  const absolute = CHAMBERS[id].psi + ATM;
  const volume = 1 - 0.7 * compressionAt(id, frame);
  return absolute / volume - ATM;
};
