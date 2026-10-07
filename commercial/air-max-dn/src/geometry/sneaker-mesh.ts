// Procedural sneaker mesh builders - pure functions from the spec to vertex/index
// arrays. blender/render_assets.py mirrors each builder (loft, capsule, upper
// shell, tongue, swept tubes) so both renderers share one silhouette.

import { SPEC, clusteredSamples, halfWidth, midsoleBottom, midsoleTop, openingHalf, outsoleTop, sgnPow, soleBottom, tubes, upperPoint, xAt, type TubeSpec } from './spec.ts';
import { add3, catmullRomTable, len3, scale3, sub3, type Vec3 } from '../choreo/math.ts';

export type MeshData = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
};

class MeshBuilder {
  private pos: number[] = [];
  private uv: number[] = [];
  private idx: number[] = [];

  vertex(p: Vec3, u: number, v: number): number {
    this.pos.push(p[0], p[1], p[2]);
    this.uv.push(u, v);
    return this.pos.length / 3 - 1;
  }

  tri(a: number, b: number, c: number) {
    this.idx.push(a, b, c);
  }

  /** a -> b -> c -> d counter-clockwise seen from outside. */
  quad(a: number, b: number, c: number, d: number) {
    this.idx.push(a, b, c, a, c, d);
  }

  /**
   * Area-weighted vertex normals, welded by position: UV seams, the upper's top
   * seam and degenerate pole rings all shade as one smooth surface.
   */
  build(): MeshData {
    const n = this.pos.length / 3;
    const canonical = new Uint32Array(n);
    const seen = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const key = `${Math.round(this.pos[i * 3] * 1e6)}|${Math.round(this.pos[i * 3 + 1] * 1e6)}|${Math.round(this.pos[i * 3 + 2] * 1e6)}`;
      const hit = seen.get(key);
      if (hit === undefined) {
        seen.set(key, i);
        canonical[i] = i;
      } else canonical[i] = hit;
    }
    const acc = new Float64Array(n * 3);
    for (let f = 0; f < this.idx.length; f += 3) {
      const [a, b, c] = [this.idx[f], this.idx[f + 1], this.idx[f + 2]];
      const ax = this.pos[a * 3], ay = this.pos[a * 3 + 1], az = this.pos[a * 3 + 2];
      const e1x = this.pos[b * 3] - ax, e1y = this.pos[b * 3 + 1] - ay, e1z = this.pos[b * 3 + 2] - az;
      const e2x = this.pos[c * 3] - ax, e2y = this.pos[c * 3 + 1] - ay, e2z = this.pos[c * 3 + 2] - az;
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      for (const v of [a, b, c]) {
        const k = canonical[v] * 3;
        acc[k] += nx;
        acc[k + 1] += ny;
        acc[k + 2] += nz;
      }
    }
    const normals = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const k = canonical[i] * 3;
      const l = Math.hypot(acc[k], acc[k + 1], acc[k + 2]) || 1;
      normals[i * 3] = acc[k] / l;
      normals[i * 3 + 1] = acc[k + 1] / l;
      normals[i * 3 + 2] = acc[k + 2] / l;
    }
    return {
      positions: new Float32Array(this.pos),
      normals,
      uvs: new Float32Array(this.uv),
      indices: new Uint32Array(this.idx),
    };
  }
}

/* ----------------------------------------------------------------- Loft */

export type Section = { wL: number; wM: number; yBot: number; yTop: number };

export type LoftOptions = {
  t0: number;
  t1: number;
  along: number;
  around: number;
  exponent: number;
  section: (t: number) => Section;
  /** Ellipsoidal rounding (t-space radius) at the start / end of a segment that stops mid-shoe. */
  roundStart?: number;
  roundEnd?: number;
};

/** Superellipse cross-section at (t, phi). phi = -pi/2 is the bottom centre, 0 lateral, pi/2 top. */
export const loftPoint = (o: LoftOptions, t: number, phi: number): Vec3 => {
  const s = o.section(t);
  let { wL, wM } = s;
  let hh = (s.yTop - s.yBot) / 2;
  const yc = (s.yTop + s.yBot) / 2;
  const round = (d: number, r: number) => Math.sqrt(Math.max(0, 1 - (1 - Math.min(1, d / r)) ** 2));
  if (o.roundStart) {
    const f = round(t - o.t0, o.roundStart);
    wL *= f;
    wM *= f;
    hh *= f;
  }
  if (o.roundEnd) {
    const f = round(o.t1 - t, o.roundEnd);
    wL *= f;
    wM *= f;
    hh *= f;
  }
  const e = 2 / o.exponent;
  const c = Math.cos(phi);
  const z = (c >= 0 ? wL : wM) * sgnPow(c, e);
  const y = yc + hh * sgnPow(Math.sin(phi), e);
  return [xAt(t), y, z];
};

const loftInto = (b: MeshBuilder, o: LoftOptions) => {
  const ts = clusteredSamples(o.t0, o.t1, o.along);
  const M = o.around;
  const tile = SPEC.uvTile;
  // World-scaled UVs: u = distance along the last, v = arc length around the
  // section, both in uvTile units - tread, foam and twill keep real size everywhere.
  const rings: number[][] = ts.map((t) => {
    const pts = Array.from({ length: M + 1 }, (_, j) => loftPoint(o, t, -Math.PI / 2 + (2 * Math.PI * j) / M));
    let arc = 0;
    return pts.map((p, j) => {
      if (j > 0) arc += len3(sub3(p, pts[j - 1]));
      return b.vertex(p, ((t - o.t0) * SPEC.length) / tile, arc / tile);
    });
  });
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < M; j++) b.quad(rings[i][j], rings[i + 1][j], rings[i + 1][j + 1], rings[i][j + 1]);
  }
  const centre = (t: number) => {
    const s = o.section(t);
    return [xAt(t), (s.yTop + s.yBot) / 2, (s.wL - s.wM) / 2] as Vec3;
  };
  // Caps get their own vertices with planar (z, y) UVs: a fan sharing one UV
  // would give zero UV derivatives and NaN tangent frames in the shader.
  const cap = (t: number, reverse: boolean) => {
    const c = centre(t);
    const uv = (p: Vec3): [number, number] => [0.5 + (p[2] - c[2]) * 8, 0.5 + (p[1] - c[1]) * 8];
    const centreIdx = b.vertex(c, ...uv(c));
    const ring: number[] = [];
    for (let j = 0; j <= M; j++) {
      const p = loftPoint(o, t, -Math.PI / 2 + (2 * Math.PI * j) / M);
      ring.push(b.vertex(p, ...uv(p)));
    }
    for (let j = 0; j < M; j++) {
      if (reverse) b.tri(centreIdx, ring[j + 1], ring[j]);
      else b.tri(centreIdx, ring[j], ring[j + 1]);
    }
  };
  cap(o.t0, true);
  cap(o.t1, false);
};

/* ------------------------------------------------------------ Components */

export const outsoleSection = (t: number): Section => ({
  wL: halfWidth('lateral', t) + SPEC.outsole.flare,
  wM: halfWidth('medial', t) + SPEC.outsole.flare,
  yBot: soleBottom(t),
  yTop: outsoleTop(t),
});

export const buildOutsole = (): MeshData => {
  const b = new MeshBuilder();
  SPEC.outsole.segments.forEach(([t0, t1]) => {
    loftInto(b, {
      t0,
      t1,
      along: Math.max(24, Math.round(SPEC.samples.along * (t1 - t0))),
      around: SPEC.samples.around,
      exponent: SPEC.outsole.exponent,
      section: outsoleSection,
      roundStart: t0 > 0 ? SPEC.outsole.endRound : undefined,
      roundEnd: t1 < 1 ? SPEC.outsole.endRound : undefined,
    });
  });
  return b.build();
};

export const midsoleSection = (t: number): Section => ({
  wL: halfWidth('lateral', t) + SPEC.midsole.flare,
  wM: halfWidth('medial', t) + SPEC.midsole.flare,
  yBot: midsoleBottom(t),
  yTop: midsoleTop(t),
});

export const buildMidsole = (): MeshData => {
  const b = new MeshBuilder();
  loftInto(b, {
    t0: 0,
    t1: 1,
    along: SPEC.samples.along,
    around: SPEC.samples.around,
    exponent: SPEC.midsole.exponent,
    section: midsoleSection,
  });
  return b.build();
};

export const shankSection = (t: number): Section => {
  const k = SPEC.shank;
  const bottom = midsoleBottom(t) - (k.thickness - k.embed);
  return {
    wL: halfWidth('lateral', t) * k.widthRatio,
    wM: halfWidth('medial', t) * k.widthRatio,
    yBot: bottom,
    yTop: bottom + k.thickness,
  };
};

export const buildShank = (): MeshData => {
  const b = new MeshBuilder();
  const k = SPEC.shank;
  loftInto(b, {
    t0: k.start,
    t1: k.end,
    along: 40,
    around: SPEC.samples.around,
    exponent: k.exponent,
    section: shankSection,
    roundStart: k.endRound,
    roundEnd: k.endRound,
  });
  return b.build();
};

/** Capsule along z, origin at the bottom centre of the tube (so it squashes onto the outsole). */
export const buildTube = (tube: TubeSpec): MeshData => {
  const b = new MeshBuilder();
  const r = tube.radius;
  const halfLen = (tube.zMax - tube.zMin) / 2;
  const cyl = Math.max(0, halfLen - r);
  const capSegs = 10;
  const cylSegs = 18;
  const around = 36;
  const profile: { z: number; rad: number }[] = [];
  for (let i = 0; i <= capSegs; i++) {
    const beta = (Math.PI / 2) * (1 - i / capSegs);
    profile.push({ z: -cyl - r * Math.sin(beta), rad: r * Math.cos(beta) });
  }
  for (let i = 1; i < cylSegs; i++) profile.push({ z: -cyl + (2 * cyl * i) / cylSegs, rad: r });
  for (let i = 0; i <= capSegs; i++) {
    const beta = (Math.PI / 2) * (i / capSegs);
    profile.push({ z: cyl + r * Math.sin(beta), rad: r * Math.cos(beta) });
  }
  const rings = profile.map((p, k) => {
    const ring: number[] = [];
    for (let j = 0; j <= around; j++) {
      const a = (2 * Math.PI * j) / around;
      ring.push(b.vertex([p.rad * Math.cos(a), r + p.rad * Math.sin(a), p.z], k / (profile.length - 1), j / around));
    }
    return ring;
  });
  for (let k = 0; k < rings.length - 1; k++) {
    for (let j = 0; j < around; j++) b.quad(rings[k][j], rings[k][j + 1], rings[k + 1][j + 1], rings[k + 1][j]);
  }
  return b.build();
};

/** Thin elastomer flange each chamber's tubes are welded to. */
export const buildFlange = (chamberId: string): MeshData => {
  const list = tubes().filter((t) => t.chamber === chamberId);
  const margin = list[0].radius / SPEC.length;
  const t0 = list[0].t - margin;
  const t1 = list[list.length - 1].t + margin;
  const b = new MeshBuilder();
  loftInto(b, {
    t0,
    t1,
    along: 24,
    around: SPEC.samples.around,
    exponent: 6,
    section: (t) => ({
      wL: halfWidth('lateral', t) + SPEC.airUnit.overhang - 0.001,
      wM: halfWidth('medial', t) + SPEC.airUnit.overhang - 0.001,
      yBot: outsoleTop(t) - 0.0002,
      yTop: outsoleTop(t) + SPEC.airUnit.flangeThickness,
    }),
    roundStart: 0.012,
    roundEnd: 0.012,
  });
  return b.build();
};

/* ---------------------------------------------------------------- Upper */

/**
 * The upper is an open shell: a superellipse arch per t-station, split into a
 * lateral and a medial strip wherever the collar / lace opening is. The strips'
 * inner edges trace the opening exactly, so no boolean is needed.
 */
export const buildUpper = (): MeshData => {
  const b = new MeshBuilder();
  const ts = clusteredSamples(0, 1, SPEC.samples.along);
  const K = SPEC.samples.upperAround / 2;
  const lateral: number[][] = [];
  const medial: number[][] = [];
  ts.forEach((t) => {
    const a = openingHalf(t);
    const lat: number[] = [];
    const med: number[] = [];
    for (let k = 0; k <= K; k++) {
      const sL = (0.5 - a) * (k / K);
      const sM = 0.5 + a + (0.5 - a) * (k / K);
      lat.push(b.vertex(upperPoint(t, sL), t, sL));
      med.push(b.vertex(upperPoint(t, sM), t, sM));
    }
    lateral.push(lat);
    medial.push(med);
  });
  for (const strip of [lateral, medial]) {
    for (let i = 0; i < strip.length - 1; i++) {
      for (let k = 0; k < K; k++) b.quad(strip[i][k], strip[i + 1][k], strip[i + 1][k + 1], strip[i][k + 1]);
    }
  }
  return b.build();
};

export const tonguePoint = (t: number, s: number): Vec3 => {
  const g = SPEC.tongue;
  const p = upperPoint(t, s, g.inset);
  if (t < g.liftEnd) {
    const l = g.lift * Math.pow((g.liftEnd - t) / (g.liftEnd - g.start), 1.5);
    return [p[0] - 0.4 * l, p[1] + l, p[2]];
  }
  return p;
};

export const buildTongue = (): MeshData => {
  const b = new MeshBuilder();
  const g = SPEC.tongue;
  const ts = clusteredSamples(g.start, g.end, 40);
  const S = 16;
  const grid = ts.map((t) => {
    const row: number[] = [];
    for (let k = 0; k <= S; k++) {
      const s = 0.5 - g.halfSpan + (2 * g.halfSpan * k) / S;
      row.push(b.vertex(tonguePoint(t, s), (t - g.start) / (g.end - g.start), k / S));
    }
    return row;
  });
  for (let i = 0; i < grid.length - 1; i++) {
    for (let k = 0; k < S; k++) b.quad(grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]);
  }
  return b.build();
};

/**
 * Overlay panel (mudguard / toe cap, heel counter): a band of the upper surface
 * from the base up to a design line `top(t)`, lifted off the mesh. Where the top
 * reaches s = 0.5 the lateral and medial bands meet and close over the toe.
 */
export const buildOverlay = (id: 'mudguard' | 'heelCounter'): MeshData => {
  const o = SPEC.overlays[id];
  const rows = o.top as unknown as (readonly [number, number])[];
  const b = new MeshBuilder();
  const ts = clusteredSamples(o.start, o.end, 80);
  const K = 8;
  const top = (t: number) => Math.max(0, Math.min(catmullRomTable(rows, t), 0.5 - openingHalf(t) - 0.004));
  for (const side of ['lateral', 'medial'] as const) {
    const grid = ts.map((t) => {
      const st = top(t);
      return Array.from({ length: K + 1 }, (_, k) => {
        const sv = side === 'lateral' ? (st * k) / K : 1 - (st * k) / K;
        return b.vertex(upperPoint(t, sv, 1, o.lift), t * 10, sv * 4);
      });
    });
    for (let i = 0; i < grid.length - 1; i++) {
      for (let k = 0; k < K; k++) {
        if (side === 'lateral') b.quad(grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]);
        else b.quad(grid[i][k], grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k]);
      }
    }
  }
  return b.build();
};

/* --------------------------------------------------------- Swept tubes */

const sweepInto = (b: MeshBuilder, points: Vec3[], radius: number, around = 12) => {
  const n = points.length;
  const tangents = points.map((_, i) => {
    const d = sub3(points[Math.min(n - 1, i + 1)], points[Math.max(0, i - 1)]);
    return scale3(d, 1 / (len3(d) || 1));
  });
  const cross = (a: Vec3, c: Vec3): Vec3 => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
  const t0 = tangents[0];
  let normal = cross(t0, Math.abs(t0[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  normal = scale3(normal, 1 / len3(normal));
  const rings: number[][] = [];
  const capFrames: { n: Vec3; b: Vec3 }[] = [];
  let arc = 0;
  for (let i = 0; i < n; i++) {
    const T = tangents[i];
    // Parallel transport: strip the tangential component, renormalise.
    const dot = normal[0] * T[0] + normal[1] * T[1] + normal[2] * T[2];
    normal = sub3(normal, scale3(T, dot));
    normal = scale3(normal, 1 / (len3(normal) || 1));
    const B = cross(T, normal);
    capFrames.push({ n: normal, b: B });
    if (i > 0) arc += len3(sub3(points[i], points[i - 1]));
    const ring: number[] = [];
    for (let j = 0; j <= around; j++) {
      const beta = (2 * Math.PI * j) / around;
      const off = add3(scale3(normal, Math.cos(beta) * radius), scale3(B, Math.sin(beta) * radius));
      ring.push(b.vertex(add3(points[i], off), arc * 40, j / around));
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < around; j++) b.quad(rings[i][j], rings[i][j + 1], rings[i + 1][j + 1], rings[i + 1][j]);
  }
  const capAt = (i: number, reverse: boolean) => {
    const T = tangents[i];
    const ref: Vec3 = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const U = cross(T, ref);
    const ul = len3(U) || 1;
    const V = cross(T, U);
    const uv = (p: Vec3): [number, number] => {
      const d = sub3(p, points[i]);
      return [0.5 + ((d[0] * U[0] + d[1] * U[1] + d[2] * U[2]) / ul / radius) * 0.5, 0.5 + ((d[0] * V[0] + d[1] * V[1] + d[2] * V[2]) / ul / radius) * 0.5];
    };
    const c = b.vertex(points[i], 0.5, 0.5);
    const ring = Array.from({ length: around + 1 }, (_, j) => {
      const beta = (2 * Math.PI * j) / around;
      const p = add3(points[i], add3(scale3(capFrames[i].n, Math.cos(beta) * radius), scale3(capFrames[i].b, Math.sin(beta) * radius)));
      return b.vertex(p, ...uv(p));
    });
    for (let j = 0; j < around; j++) {
      if (reverse) b.tri(c, ring[j + 1], ring[j]);
      else b.tri(c, ring[j], ring[j + 1]);
    }
  };
  capAt(0, true);
  capAt(n - 1, false);
};

const quadraticBezier = (a: Vec3, c: Vec3, d: Vec3, steps: number): Vec3[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * d[0], u * u * a[1] + 2 * u * t * c[1] + t * t * d[1], u * u * a[2] + 2 * u * t * c[2] + t * t * d[2]];
  });

/** Uniform Catmull-Rom through control points, `steps` samples per span. */
const catmullRomPath = (ctrl: Vec3[], steps: number): Vec3[] => {
  const out: Vec3[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as Vec3);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
};

export const eyelets = (): { lateral: Vec3[]; medial: Vec3[] } => {
  const L = SPEC.laces;
  return {
    lateral: L.eyelets.map((t) => upperPoint(t, 0.5 - openingHalf(t) - L.margin, 1, 0.0015)),
    medial: L.eyelets.map((t) => upperPoint(t, 0.5 + openingHalf(t) + L.margin, 1, 0.0015)),
  };
};

/** Lace paths: a toe-end bar, criss-cross runs, and a bow with tails at the collar end. */
export const lacePaths = (): Vec3[][] => {
  const L = SPEC.laces;
  const { lateral, medial } = eyelets();
  const n = L.eyelets.length;
  const over = (a: Vec3, d: Vec3): Vec3[] => {
    const tm = (a[0] + d[0]) / 2 / SPEC.length + 0.5;
    const crown = upperPoint(tm, 0.5, 1, L.rise * 1.8);
    const mid = scale3(add3(a, d), 0.5);
    return quadraticBezier(a, [mid[0], Math.max(mid[1], crown[1]), mid[2]], d, 14);
  };
  const paths: Vec3[][] = [over(lateral[n - 1], medial[n - 1])];
  for (let i = n - 1; i > 0; i--) {
    paths.push(over(lateral[i], medial[i - 1]));
    paths.push(over(medial[i], lateral[i - 1]));
  }
  const knot = upperPoint(L.eyelets[0] - 0.006, 0.5, 1, 0.006);
  for (const side of [1, -1]) {
    const k = (v: Vec3): Vec3 => add3(knot, [v[0], v[1], v[2] * side]);
    paths.push(catmullRomPath([knot, k([-0.006, 0.006, 0.012]), k([0, 0.012, 0.026]), k([0.01, 0.008, 0.03]), k([0.012, 0.002, 0.018]), k([0.002, 0.001, 0.003])], 6));
    paths.push(catmullRomPath([k([0.001, 0, 0.002]), k([0.012, -0.004, 0.009]), k([0.024, -0.014, 0.02]), k([0.032, -0.03, 0.026])], 6));
  }
  return paths;
};

export const buildLaces = (): MeshData => {
  const b = new MeshBuilder();
  for (const path of lacePaths()) sweepInto(b, path, SPEC.laces.radius, 10);
  return b.build();
};

/** Padded collar following the ankle opening from lateral, round the heel, to medial. */
export const collarPath = (): Vec3[] => {
  const start = SPEC.upper.opening[0][0];
  const end = SPEC.collar.end;
  const steps = 36;
  const pts: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = end - ((end - start) * i) / steps;
    pts.push(upperPoint(t, 0.5 - openingHalf(t), 1, 0.001));
  }
  for (let i = 1; i <= steps; i++) {
    const t = start + ((end - start) * i) / steps;
    pts.push(upperPoint(t, 0.5 + openingHalf(t), 1, 0.001));
  }
  return pts;
};

export const buildCollar = (): MeshData => {
  const b = new MeshBuilder();
  sweepInto(b, collarPath(), SPEC.collar.radius, 14);
  return b.build();
};

/** Everything, keyed by component - consumed by the R3F <Sneaker/>. */
export const buildSneaker = () => ({
  outsole: buildOutsole(),
  midsole: buildMidsole(),
  shank: buildShank(),
  tubes: tubes().map((t) => ({ spec: t, mesh: buildTube(t) })),
  flanges: { rearChamber: buildFlange('rearChamber'), frontChamber: buildFlange('frontChamber') },
  upper: buildUpper(),
  mudguard: buildOverlay('mudguard'),
  heelCounter: buildOverlay('heelCounter'),
  tongue: buildTongue(),
  laces: buildLaces(),
  collar: buildCollar(),
});

export type SneakerMeshes = ReturnType<typeof buildSneaker>;

/** Signed volume - a closed, outward-wound mesh is positive. Used by scripts/verify-geometry.ts. */
export const signedVolume = (m: MeshData): number => {
  let v = 0;
  for (let i = 0; i < m.indices.length; i += 3) {
    const a = m.indices[i] * 3;
    const b2 = m.indices[i + 1] * 3;
    const c = m.indices[i + 2] * 3;
    const p = m.positions;
    v += (p[a] * (p[b2 + 1] * p[c + 2] - p[b2 + 2] * p[c + 1]) - p[a + 1] * (p[b2] * p[c + 2] - p[b2 + 2] * p[c]) + p[a + 2] * (p[b2] * p[c + 1] - p[b2 + 1] * p[c])) / 6;
  }
  return v;
};
