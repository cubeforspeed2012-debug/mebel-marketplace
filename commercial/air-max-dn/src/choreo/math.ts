// Deterministic math shared by the Remotion composition, the choreography bake
// (scripts/bake-choreography.ts) and the score synthesiser
// (scripts/generate-score.ts). No React, no Remotion imports: every function here
// must give bit-identical results in Chromium and in Node.

export type Vec3 = [number, number, number];
export type Ease = (x: number) => number;

export const DEG = Math.PI / 180;

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number): number => (a === b ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a)));
export const smoothstep = (a: number, b: number, v: number): number => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a: number, b: number, v: number): number => {
  const t = invLerp(a, b, v);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const len3 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

/**
 * CSS cubic-bezier() timing function. Newton-Raphson with a bisection fallback,
 * accurate to 1e-7 so the same curve can be shared with GSAP CustomEase and the
 * Python bake without visible drift.
 */
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number): Ease => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solveT = (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-7) return t;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 40; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-7) return t;
      if (x > v) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveT(x));
  };
};

/** Curve library. Every curve is a cubic-bezier so it can be mirrored 1:1 in GSAP / CSS. */
export const EASE = {
  linear: ((x: number) => x) as Ease,
  /** The brief's signature curve: cubic-bezier(0.19, 1, 0.22, 1) - exponential deceleration. */
  expoOut: cubicBezier(0.19, 1, 0.22, 1),
  expoIn: cubicBezier(0.7, 0, 0.84, 0),
  quintInOut: cubicBezier(0.83, 0, 0.17, 1),
  cubicInOut: cubicBezier(0.65, 0, 0.35, 1),
  cubicOut: cubicBezier(0.33, 1, 0.68, 1),
  cubicIn: cubicBezier(0.32, 0, 0.67, 0),
  sineInOut: cubicBezier(0.37, 0, 0.63, 1),
  /** Camera operator ease: fast acceleration, long feathered landing. */
  operator: cubicBezier(0.5, 0, 0.1, 1),
} as const;

export type SpringConfig = { mass: number; stiffness: number; damping: number };

export const SPRINGS = {
  /** Crisp mechanical settle, ~3% overshoot. */
  snap: { mass: 1, stiffness: 220, damping: 26 },
  /** Heavy component (midsole, upper) - slower, weighty. */
  heavy: { mass: 2.2, stiffness: 120, damping: 26 },
  /** Elastic micro-overshoot for type tracking. */
  elastic: { mass: 1, stiffness: 180, damping: 12 },
  /** Critically damped glide. */
  glide: { mass: 1, stiffness: 60, damping: 15.5 },
} as const satisfies Record<string, SpringConfig>;

/**
 * Closed-form step response of a damped mass-spring system released from rest at
 * 0 toward 1. Handles under-, critically- and over-damped regimes exactly
 * (no numerical integration -> identical at any frame, in any render order).
 */
export const springStep = (tSeconds: number, cfg: SpringConfig): number => {
  if (tSeconds <= 0) return 0;
  const w0 = Math.sqrt(cfg.stiffness / cfg.mass);
  const zeta = cfg.damping / (2 * Math.sqrt(cfg.stiffness * cfg.mass));
  const t = tSeconds;
  if (zeta < 0.9999) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (zeta <= 1.0001) {
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  const root = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - root);
  const r2 = -w0 * (zeta + root);
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
};

export const springAt = (frame: number, startFrame: number, fps: number, cfg: SpringConfig): number =>
  springStep((frame - startFrame) / fps, cfg);

/** 32-bit integer hash (lowbias32). Exact in every JS engine, unlike sin()-based hashes. */
export const hashU32 = (x: number): number => {
  let h = x >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
};
export const hash01 = (i: number, seed = 0): number => hashU32((i | 0) * 0x9e3779b1 + Math.imul(seed | 0, 0x85ebca77)) / 4294967296;

/** Smooth 1D value noise in [-1, 1]. */
export const noise1 = (x: number, seed = 0): number => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  return lerp(hash01(i, seed), hash01(i + 1, seed), u) * 2 - 1;
};

/** Fractal noise - used for the "operator" micro-drift on handheld-style camera moves. */
export const fbm1 = (x: number, seed = 0, octaves = 3): number => {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise1(x * freq, seed + o * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
};

export type Key = { frame: number; value: number; ease?: Ease };

/**
 * Samples a keyframe track. The ease on key[i] shapes the segment arriving at key[i].
 * Values hold before the first and after the last key.
 */
export const sampleTrack = (keys: readonly Key[], frame: number): number => {
  if (frame <= keys[0].frame) return keys[0].value;
  const last = keys[keys.length - 1];
  if (frame >= last.frame) return last.value;
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (frame <= b.frame) {
      const a = keys[i - 1];
      const t = (frame - a.frame) / (b.frame - a.frame);
      return lerp(a.value, b.value, (b.ease ?? EASE.cubicInOut)(t));
    }
  }
  return last.value;
};

/** Uniform Catmull-Rom through (x, y) samples with clamped ends - used for all spec profiles. */
export const catmullRomTable = (table: readonly (readonly [number, number])[], x: number): number => {
  const n = table.length;
  if (x <= table[0][0]) return table[0][1];
  if (x >= table[n - 1][0]) return table[n - 1][1];
  let i = 0;
  while (i < n - 2 && x > table[i + 1][0]) i++;
  const p0 = table[Math.max(0, i - 1)];
  const p1 = table[i];
  const p2 = table[i + 1];
  const p3 = table[Math.min(n - 1, i + 2)];
  const t = (x - p1[0]) / (p2[0] - p1[0]);
  // Non-uniform spacing: scale tangents by segment length (cardinal form).
  const dx = p2[0] - p1[0];
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * dx;
  const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * dx;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
};

/** Damped sinusoid used for camera kicks and type shudder on sub hits. */
export const dampedKick = (tSeconds: number, freqHz: number, decay: number): number =>
  tSeconds < 0 ? 0 : Math.exp(-tSeconds / decay) * Math.sin(2 * Math.PI * freqHz * tSeconds);
