// Parametric profile functions over shared/sneaker-spec.json. blender/render_assets.py
// implements the same functions line for line, so the realtime model and the
// Blender hero model are the same shoe.

import specJson from '../../shared/sneaker-spec.json' with { type: 'json' };
import { catmullRomTable, clamp, lerp, smoothstep, type Vec3 } from '../choreo/math.ts';

export const SPEC = specJson;

type Table = readonly (readonly [number, number])[];
const table = (rows: number[][]): Table => rows as unknown as Table;

export type Side = 'lateral' | 'medial';

export const xAt = (t: number): number => (t - 0.5) * SPEC.length;

/** Elliptical plan-view rounding at heel and toe. */
export const capFactor = (t: number): number => {
  const { heelCap, toeCap } = SPEC.footprint;
  let f = 1;
  if (t < heelCap) {
    const u = 1 - clamp(t / heelCap);
    f *= Math.sqrt(Math.max(0, 1 - u * u));
  }
  if (t > 1 - toeCap) {
    const u = 1 - clamp((1 - t) / toeCap);
    f *= Math.sqrt(Math.max(0, 1 - u * u));
  }
  return f;
};

export const halfWidth = (side: Side, t: number): number => catmullRomTable(table(SPEC.footprint[side]), t) * capFactor(t);

/** Rocker: heel bevel plus toe spring. Height of the outsole's ground face above y = 0. */
export const soleBottom = (t: number): number => {
  const r = SPEC.rocker;
  const heel = Math.max(0, 1 - t / r.heelBevelEnd);
  const toe = Math.max(0, (t - r.toeSpringStart) / (1 - r.toeSpringStart));
  return r.heelBevel * heel * heel + r.toeSpring * Math.pow(toe, r.toeSpringExponent);
};

export const outsoleTop = (t: number): number => soleBottom(t) + SPEC.outsole.thickness;

export const maxTubeRadius = (): number =>
  Math.max(...SPEC.airUnit.chambers.flatMap((c) => c.tubes.map((tube) => tube.radius)));

export const midsoleTop = (t: number): number => soleBottom(t) + catmullRomTable(table(SPEC.midsole.stack), t);

export const heelCarrierBottom = (t: number): number =>
  outsoleTop(t) + 2 * SPEC.airUnit.flange + 2 * maxTubeRadius();

export const midsoleBottom = (t: number): number =>
  lerp(heelCarrierBottom(t), outsoleTop(t), smoothstep(SPEC.midsole.heelCarrierEnd, SPEC.midsole.forefootStart, t));

export const upperBase = (t: number): number => midsoleTop(t) - SPEC.upper.baseTuck;
export const upperHeight = (t: number): number => catmullRomTable(table(SPEC.upper.height), t);
export const upperHalfWidth = (side: Side, t: number): number => halfWidth(side, t) + SPEC.upper.flare;

/** Half-width of the collar / lace opening in s-space (0 where the upper is closed). */
export const openingHalf = (t: number): number => {
  const rows = SPEC.upper.opening;
  if (t <= rows[0][0] || t >= rows[rows.length - 1][0]) return 0;
  return Math.max(0, catmullRomTable(table(rows), t));
};

export const sgnPow = (v: number, e: number): number => Math.sign(v) * Math.pow(Math.abs(v), e);

/**
 * Point on the upper's superellipse arch. s = 0 lateral base, 0.5 top centre,
 * 1 medial base. `scale` shrinks toward the arch base centre (tongue sits inside),
 * `lift` pushes outward along the arch's radial direction.
 */
export const upperPoint = (t: number, s: number, scale = 1, lift = 0): Vec3 => {
  const e = 2 / SPEC.upper.exponent;
  const theta = Math.PI * s;
  const c = Math.cos(theta);
  const w = c >= 0 ? upperHalfWidth('lateral', t) : upperHalfWidth('medial', t);
  const base = upperBase(t);
  const z = w * sgnPow(c, e) * scale;
  const y = upperHeight(t) * Math.pow(Math.abs(Math.sin(theta)), e) * scale;
  const r = Math.hypot(z, y) || 1;
  return [xAt(t), base + y + (y / r) * lift, z + (z / r) * lift];
};

export type TubeSpec = { chamber: string; t: number; radius: number; zMin: number; zMax: number; bottom: number };

/** Resolved tube placements: capsules run across the shoe (z) and sit on the outsole. */
export const tubes = (): TubeSpec[] =>
  SPEC.airUnit.chambers.flatMap((ch) =>
    ch.tubes.map((tube) => ({
      chamber: ch.id,
      t: tube.t,
      radius: tube.radius,
      zMin: -(halfWidth('medial', tube.t) + SPEC.airUnit.overhang),
      zMax: halfWidth('lateral', tube.t) + SPEC.airUnit.overhang,
      bottom: outsoleTop(tube.t) + SPEC.airUnit.flange,
    })),
  );

/** Cosine-clustered samples on [t0, t1]: dense at the ends where curvature lives. */
export const clusteredSamples = (t0: number, t1: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => t0 + (t1 - t0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / (n - 1))));
