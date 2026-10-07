import { useLayoutEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, type MeshPhysicalMaterial } from 'three';
import { buildSneaker, type MeshData } from '../geometry/sneaker-mesh.ts';
import { componentTransform, rootTransform, tubeTransform, type ComponentId, type Transform } from '../choreo/pose.ts';
import { AIR_SCATTER, type Colorway, type MaterialSet } from './materials.ts';

const toGeometry = (m: MeshData): BufferGeometry => {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(m.positions, 3));
  g.setAttribute('normal', new BufferAttribute(m.normals, 3));
  g.setAttribute('uv', new BufferAttribute(m.uvs, 2));
  g.setIndex(new BufferAttribute(m.indices, 1));
  g.computeBoundingSphere();
  return g;
};

let geometryCache: ReturnType<typeof buildGeometries> | null = null;

const buildGeometries = () => {
  const m = buildSneaker();
  return {
    outsole: toGeometry(m.outsole),
    midsole: toGeometry(m.midsole),
    shank: toGeometry(m.shank),
    upper: toGeometry(m.upper),
    mudguard: toGeometry(m.mudguard),
    heelCounter: toGeometry(m.heelCounter),
    tongue: toGeometry(m.tongue),
    laces: toGeometry(m.laces),
    collar: toGeometry(m.collar),
    flanges: { rearChamber: toGeometry(m.flanges.rearChamber), frontChamber: toGeometry(m.flanges.frontChamber) },
    tubes: m.tubes.map((t) => ({ chamber: t.spec.chamber as ComponentId, geometry: toGeometry(t.mesh) })),
  };
};

const getGeometries = () => {
  if (!geometryCache) geometryCache = buildGeometries();
  return geometryCache;
};

export type SneakerProps = {
  frame: number;
  mats: MaterialSet;
  colorway: Colorway;
  highlight: { id: ComponentId | null; amount: number };
  /** Blender-plate mode: the realtime shoe is replaced by the path-traced plate. */
  hidden?: boolean;
};

const Part: React.FC<{ t: Transform; children: React.ReactNode }> = ({ t, children }) => (
  <group position={t.position} quaternion={t.quaternion}>
    {children}
  </group>
);

export const Sneaker: React.FC<SneakerProps> = ({ frame, mats: base, colorway, highlight, hidden }) => {
  const geo = useMemo(getGeometries, []);
  // Separate elastomer instances so each chamber can glow on its own readout.
  const mats = useMemo(() => ({ ...base, airRear: base.air, airFront: base.air.clone() as MeshPhysicalMaterial }), [base]);

  useLayoutEffect(() => {
    const glow = (id: ComponentId) => (highlight.id === id ? highlight.amount : 0);
    mats.airRear.emissiveIntensity = AIR_SCATTER + 0.9 * glow('rearChamber');
    mats.airFront.emissiveIntensity = AIR_SCATTER + 0.9 * glow('frontChamber');
    mats.carbon.emissiveIntensity = 0.25 * glow('shank');
    mats.midsole.emissive.set(colorway.airTint);
    mats.midsole.emissiveIntensity = 0.06 * glow('midsole');
    mats.upper.emissive.set(colorway.airTint);
    mats.upper.emissiveIntensity = 0.1 * glow('upper');
  }, [mats, highlight, colorway.airTint]);

  useLayoutEffect(() => () => mats.airFront.dispose(), [mats]);

  const root = rootTransform(frame);
  const part = (id: ComponentId) => componentTransform(id, frame);

  return (
    <group position={root.position} quaternion={root.quaternion} visible={!hidden}>
      <Part t={part('outsole')}>
        <mesh geometry={geo.outsole} material={mats.outsole} castShadow receiveShadow />
      </Part>
      {(['rearChamber', 'frontChamber'] as const).map((chamber) => (
        <Part key={chamber} t={part(chamber)}>
          <mesh geometry={geo.flanges[chamber]} material={chamber === 'rearChamber' ? mats.airRear : mats.airFront} castShadow />
          {geo.tubes.map((tube, i) => {
            if (tube.chamber !== chamber) return null;
            const tt = tubeTransform(i, frame);
            return (
              <mesh
                key={i}
                geometry={tube.geometry}
                material={chamber === 'rearChamber' ? mats.airRear : mats.airFront}
                position={tt.position}
                scale={tt.scale}
                castShadow
              />
            );
          })}
        </Part>
      ))}
      <Part t={part('shank')}>
        <mesh geometry={geo.shank} material={mats.carbon} castShadow receiveShadow />
      </Part>
      <Part t={part('midsole')}>
        <mesh geometry={geo.midsole} material={mats.midsole} castShadow receiveShadow />
      </Part>
      <Part t={part('upper')}>
        <mesh geometry={geo.upper} material={mats.upper} castShadow receiveShadow />
        <mesh geometry={geo.mudguard} material={mats.overlay} castShadow receiveShadow />
        <mesh geometry={geo.heelCounter} material={mats.overlay} castShadow receiveShadow />
        <mesh geometry={geo.tongue} material={mats.tongue} castShadow receiveShadow />
        <mesh geometry={geo.collar} material={mats.collar} castShadow receiveShadow />
        <mesh geometry={geo.laces} material={mats.laces} castShadow />
      </Part>
    </group>
  );
};
