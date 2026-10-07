// PBR material set. Values are measured-ish rather than "looks nice": TPU air
// units at IOR 1.52 with Beer-Lambert tinting, resin-coated carbon with real
// anisotropic fibre highlights, matte knit with a sheen lobe instead of a gloss.

import { Color, DoubleSide, MeshPhysicalMaterial, Vector2 } from 'three';
import { createProceduralMaps } from './textures.ts';

export type Colorway = {
  upper: string;
  accent: string;
  midsole: string;
  outsole: string;
  airTint: string;
};

export const ROYAL_COLORWAY: Colorway = {
  upper: '#2244d6', // Hyper Royal - sampled from the reference stills
  accent: '#0d0e12', // black overlays / tongue / collar
  midsole: '#e9e7e0', // Summit White
  outsole: '#2846b8',
  airTint: '#3a5bff',
};

/** Base internal-scatter glow of the air units; highlights add on top. */
export const AIR_SCATTER = 0.06;

export const createMaterials = (cw: Colorway) => {
  const maps = createProceduralMaps();

  // Textures carry their own repeat, so each material tiling gets a clone (shared GPU source).
  const tiled = <T extends { clone(): T; repeat: Vector2 }>(tex: T, x: number, y: number): T => {
    const c = tex.clone();
    c.repeat.set(x, y);
    return c;
  };

  const knit = (colour: string, repeat: Vector2, sheenTint: string) => {
    const m = new MeshPhysicalMaterial({
      color: new Color(colour),
      map: tiled(maps.knitColour, repeat.x, repeat.y),
      normalMap: tiled(maps.knitNormal, repeat.x, repeat.y),
      normalScale: new Vector2(0.9, 0.9),
      roughnessMap: tiled(maps.knitRough, repeat.x, repeat.y),
      roughness: 1,
      metalness: 0,
      sheen: 0.18,
      sheenRoughness: 0.5,
      sheenColor: new Color(sheenTint),
      side: DoubleSide,
    });
    return m;
  };

  const upper = knit(cw.upper, new Vector2(10, 4), '#3a5cff');
  const tongue = knit(cw.accent, new Vector2(4, 3), '#3a3d48');

  /** Synthetic-leather overlays (mudguard, toe cap, heel counter): satin, pigment-black. */
  const overlay = new MeshPhysicalMaterial({
    color: new Color(cw.accent),
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
    sheen: 0.15,
    sheenColor: new Color('#2b2f3a'),
    normalMap: tiled(maps.foamNormal, 14, 6),
    normalScale: new Vector2(0.25, 0.25),
    side: DoubleSide,
  });

  const collar = new MeshPhysicalMaterial({
    color: new Color(cw.accent),
    roughness: 0.92,
    sheen: 0.4,
    sheenRoughness: 0.6,
    sheenColor: new Color('#2b2f3a'),
    normalMap: maps.foamNormal,
    normalScale: new Vector2(0.4, 0.4),
  });

  const laces = new MeshPhysicalMaterial({
    color: new Color('#0c0d11'),
    roughness: 0.78,
    sheen: 0.25,
    sheenColor: new Color('#3a3f4d'),
    normalMap: maps.laceNormal,
    normalScale: new Vector2(0.6, 0.6),
  });

  const midsole = new MeshPhysicalMaterial({
    color: new Color(cw.midsole),
    roughness: 0.58,
    metalness: 0,
    normalMap: tiled(maps.foamNormal, 1.5, 1.5),
    normalScale: new Vector2(0.35, 0.35),
    sheen: 0.12,
    sheenColor: new Color('#ffffff'),
  });

  const outsole = new MeshPhysicalMaterial({
    color: new Color(cw.outsole),
    roughness: 0.68,
    metalness: 0,
    normalMap: tiled(maps.treadNormal, 1, 1),
    normalScale: new Vector2(1.2, 1.2),
    specularIntensity: 0.6,
  });

  /**
   * Dynamic Air elastomer: TPU, IOR 1.5, thin-walled so it reads clear rather than
   * inky, Beer-Lambert royal absorption, a whisper of internal scatter (emissive
   * floor) like real tinted urethane, thin-film sheen from the blow-moulding.
   */
  const air = new MeshPhysicalMaterial({
    color: new Color('#eef2ff'),
    metalness: 0,
    roughness: 0.07,
    transmission: 1,
    // Screen-space refraction offset scales with thickness; 3 mm keeps grazing macro
    // samples on-screen (no black refraction misses) while still bending the background.
    thickness: 0.003,
    ior: 1.5,
    attenuationColor: new Color(cw.airTint).lerp(new Color('#ffffff'), 0.25),
    attenuationDistance: 0.03,
    specularIntensity: 1,
    specularColor: new Color('#ffffff'),
    clearcoat: 0.35,
    clearcoatRoughness: 0.04,
    iridescence: 0.16,
    iridescenceIOR: 1.38,
    iridescenceThicknessRange: [180, 420],
    emissive: new Color(cw.airTint),
    emissiveIntensity: AIR_SCATTER,
    envMapIntensity: 1.4,
  });

  /** Resin-coated 2x2 twill: anisotropic fibres under a glossy clear coat. */
  const carbon = new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    map: tiled(maps.carbonColour, 1, 1),
    normalMap: tiled(maps.carbonNormal, 1, 1),
    normalScale: new Vector2(0.55, 0.55),
    roughness: 0.34,
    metalness: 0.15,
    anisotropy: 0.9,
    anisotropyMap: tiled(maps.carbonAniso, 1, 1),
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    emissive: new Color(cw.airTint),
    emissiveIntensity: 0,
  });

  const concrete = new MeshPhysicalMaterial({
    color: new Color('#101113'),
    specularIntensity: 0.3,
    map: tiled(maps.concreteColour, 9, 9),
    roughnessMap: tiled(maps.concreteRough, 9, 9),
    normalMap: tiled(maps.concreteNormal, 9, 9),
    normalScale: new Vector2(0.5, 0.5),
    roughness: 1,
    metalness: 0,
    alphaMap: maps.floorFade,
    transparent: true,
    depthWrite: false,
  });

  return { upper, overlay, tongue, collar, laces, midsole, outsole, air, carbon, concrete, maps };
};

export type MaterialSet = ReturnType<typeof createMaterials>;
