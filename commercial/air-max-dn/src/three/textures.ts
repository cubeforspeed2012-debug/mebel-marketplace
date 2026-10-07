// Procedural surface maps, generated once per tab from integer-hash noise (so they
// are identical across Remotion's parallel render workers). No image files - the
// same patterns exist as shader node trees in blender/render_assets.py.

import { ClampToEdgeWrapping, DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat, SRGBColorSpace, UnsignedByteType, type ColorSpace } from 'three';
import { hashU32 } from '../choreo/math.ts';

const hash2 = (i: number, j: number, seed: number) => hashU32(Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(seed, 83492791)) / 4294967296;

/** Tileable 2D value noise: lattice wraps at `period`. */
const noise2 = (x: number, y: number, period: number, seed: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = (n: number) => ((n % period) + period) % period;
  const a = hash2(w(xi), w(yi), seed);
  const b = hash2(w(xi + 1), w(yi), seed);
  const c = hash2(w(xi), w(yi + 1), seed);
  const d = hash2(w(xi + 1), w(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

const fbm2 = (x: number, y: number, period: number, seed: number, octaves: number) => {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let p = period;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise2(x * f, y * f, p, seed + o * 31);
    norm += amp;
    amp *= 0.5;
    f *= 2;
    p *= 2;
  }
  return sum / norm;
};

type Field = (u: number, v: number) => number;

const makeTexture = (size: number, data: Uint8Array, colorSpace: ColorSpace, repeat = true): DataTexture => {
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = colorSpace;
  tex.needsUpdate = true;
  return tex;
};

/** Height field -> tangent-space normal map (central differences, wrapping). */
const normalMapFrom = (size: number, height: Field, strength: number): DataTexture => {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = height(x / size, y / size);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)];
      const r = h[y * size + ((x + 1) % size)];
      const d = h[((y - 1 + size) % size) * size + x];
      const u = h[((y + 1) % size) * size + x];
      const nx = -(r - l) * strength;
      const ny = -(u - d) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round((nx / len) * 127.5 + 127.5);
      data[i + 1] = Math.round((ny / len) * 127.5 + 127.5);
      data[i + 2] = Math.round((1 / len) * 127.5 + 127.5);
      data[i + 3] = 255;
    }
  }
  return makeTexture(size, data, NoColorSpace);
};

const greyMap = (size: number, field: Field, colorSpace: ColorSpace): DataTexture => {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const g = Math.round(Math.min(1, Math.max(0, field(x / size, y / size))) * 255);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  return makeTexture(size, data, colorSpace);
};

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* -------------------------------------------------- Engineered mesh upper */

const KNIT_CELLS = 18;
/** Staggered diamond perforations with yarn courses running between them. */
const knit = (u: number, v: number) => {
  const qy = v * KNIT_CELLS;
  const row = Math.floor(qy);
  const qx = u * KNIT_CELLS + (row % 2) * 0.5;
  const fx = qx - Math.floor(qx) - 0.5;
  const fy = qy - row - 0.5;
  const d = Math.abs(fx) * 1.15 + Math.abs(fy);
  const hole = smooth(0.24, 0.16, d);
  const courses = 0.5 + 0.5 * Math.sin(qy * Math.PI * 6);
  const wales = 0.5 + 0.5 * Math.sin(qx * Math.PI * 4);
  const fibre = fbm2(u * 64, v * 64, 64, 11, 2);
  return { hole, height: (1 - hole) * (0.55 + 0.25 * courses + 0.12 * wales + 0.08 * fibre) };
};

/* ------------------------------------------------------------ Carbon twill */

const TOWS = 32;
/** 2x2 twill: a tow passes over two, under two, stepping one per row. */
export const twill = (u: number, v: number) => {
  const qx = u * TOWS;
  const qy = v * TOWS;
  const i = Math.floor(qx);
  const j = Math.floor(qy);
  const warp = (((i + j) % 4) + 4) % 4 < 2;
  const lu = qx - i;
  const lv = qy - j;
  const pillow = Math.sqrt(Math.sin(Math.PI * lu) * Math.sin(Math.PI * lv));
  const strands = 0.5 + 0.5 * Math.sin((warp ? lv : lu) * Math.PI * 9);
  return { warp, height: pillow * (0.85 + 0.15 * strands), tone: 0.86 + 0.14 * hash2(i, j, 5) };
};

export type ProceduralMaps = ReturnType<typeof createProceduralMaps>;

let cache: ReturnType<typeof build> | null = null;

const build = () => {
  const knitSize = 512;
  const knitColour = greyMap(knitSize, (u, v) => {
    const k = knit(u, v);
    return 0.22 + 0.78 * (1 - k.hole) * (0.82 + 0.18 * k.height);
  }, SRGBColorSpace);
  const knitNormal = normalMapFrom(knitSize, (u, v) => knit(u, v).height, 5.5);
  const knitRough = greyMap(knitSize, (u, v) => 0.74 + 0.22 * knit(u, v).hole, NoColorSpace);

  const carbonSize = 512;
  const carbonData = new Uint8Array(carbonSize * carbonSize * 4);
  const anisoData = new Uint8Array(carbonSize * carbonSize * 4);
  for (let y = 0; y < carbonSize; y++) {
    for (let x = 0; x < carbonSize; x++) {
      const tw = twill(x / carbonSize, y / carbonSize);
      const i = (y * carbonSize + x) * 4;
      const g = Math.round(255 * (0.035 + 0.05 * tw.tone * (0.7 + 0.3 * tw.height)));
      carbonData[i] = g;
      carbonData[i + 1] = g;
      carbonData[i + 2] = Math.min(255, g + 3);
      carbonData[i + 3] = 255;
      // Anisotropy map: RG = fibre direction, B = strength.
      anisoData[i] = tw.warp ? 255 : 128;
      anisoData[i + 1] = tw.warp ? 128 : 255;
      anisoData[i + 2] = Math.round(255 * (0.6 + 0.4 * tw.height));
      anisoData[i + 3] = 255;
    }
  }
  const carbonColour = makeTexture(carbonSize, carbonData, SRGBColorSpace);
  const carbonAniso = makeTexture(carbonSize, anisoData, NoColorSpace);
  const carbonNormal = normalMapFrom(carbonSize, (u, v) => twill(u, v).height, 2.2);

  const foamNormal = normalMapFrom(256, (u, v) => fbm2(u * 48, v * 48, 48, 23, 3), 1.6);

  // Outsole (10 cm tile): staggered hex lug field cut by transverse flex grooves,
  // with pebble grain on the lug faces.
  const treadNormal = normalMapFrom(512, (u, v) => {
    const groove = smooth(0.05, 0.0, Math.abs(((u * 4) % 1) - 0.5) - 0.44);
    const qy = v * 14;
    const row = Math.floor(qy);
    const qx = u * 12 + (row % 2) * 0.5;
    const fx = qx - Math.floor(qx) - 0.5;
    const fy = qy - row - 0.5;
    const hex = Math.max(Math.abs(fx) * 0.866 + Math.abs(fy) * 0.5, Math.abs(fy));
    const lug = smooth(0.46, 0.36, hex);
    const pebble = fbm2(u * 96, v * 96, 96, 41, 2);
    return lug * (1 - 0.85 * groove) + 0.08 * pebble;
  }, 3.2);

  const laceNormal = normalMapFrom(128, (u, v) => 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 8) * Math.sin(v * Math.PI * 2 * 4), 1.2);

  const concreteColour = greyMap(512, (u, v) => {
    const blot = fbm2(u * 6, v * 6, 6, 61, 5);
    const speck = hash2(Math.floor(u * 512), Math.floor(v * 512), 67) > 0.985 ? 0.25 : 0;
    return 0.42 + 0.35 * blot - speck;
  }, SRGBColorSpace);
  const concreteRough = greyMap(512, (u, v) => 0.84 + 0.16 * fbm2(u * 10, v * 10, 10, 71, 4), NoColorSpace);
  const concreteNormal = normalMapFrom(512, (u, v) => fbm2(u * 40, v * 40, 40, 73, 4), 0.9);

  // Radial falloff: floor fades into the cyc; contact shadow blob.
  const radial = (inner: number, outer: number) =>
    greyMap(256, (u, v) => smooth(outer, inner, Math.hypot(u - 0.5, v - 0.5) * 2), NoColorSpace);
  const floorFade = radial(0.25, 1.0);
  floorFade.wrapS = floorFade.wrapT = ClampToEdgeWrapping;
  const contactShadow = greyMap(256, (u, v) => {
    const r = Math.hypot((u - 0.5) * 2, (v - 0.5) * 2);
    return Math.pow(smooth(1, 0, r), 2.2);
  }, NoColorSpace);
  contactShadow.wrapS = contactShadow.wrapT = ClampToEdgeWrapping;

  return {
    knitColour,
    knitNormal,
    knitRough,
    carbonColour,
    carbonAniso,
    carbonNormal,
    foamNormal,
    treadNormal,
    laceNormal,
    concreteColour,
    concreteRough,
    concreteNormal,
    floorFade,
    contactShadow,
  };
};

export const createProceduralMaps = () => {
  if (!cache) cache = build();
  return cache;
};
