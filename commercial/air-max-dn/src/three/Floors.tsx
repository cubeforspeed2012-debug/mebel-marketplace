// Ground planes. Concrete cove (scenes 1-2), the travelling velocity grid
// (scene 3, scrolled by the exact ground travel of the stride so the stance
// foot is planted), the shadow-catcher over deep matte black (scene 5), and a
// height-aware contact shadow that tightens and darkens as the shoe lands.

import { useLayoutEffect, useMemo } from 'react';
import { Color, MeshBasicMaterial, PlaneGeometry, ShadowMaterial, ShaderMaterial, Vector3, Quaternion } from 'three';
import type { LightingState } from '../choreo/lighting.ts';
import { groundTravel, rootTransform } from '../choreo/pose.ts';
import { clamp } from '../choreo/math.ts';
import type { MaterialSet } from './materials.ts';

const gridMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTravel: { value: 0 },
      uOpacity: { value: 0 },
      uLine: { value: new Color('#3a5bff').multiplyScalar(1.3) },
      uBase: { value: new Color('#040507') },
      uCentre: { value: new Vector3() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTravel;
      uniform float uOpacity;
      uniform vec3 uLine;
      uniform vec3 uBase;
      uniform vec3 uCentre;
      varying vec3 vWorld;

      float gridLine(vec2 p, float spacing, float width) {
        vec2 q = p / spacing;
        vec2 g = abs(fract(q - 0.5) - 0.5) / (fwidth(q) * width);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }

      void main() {
        vec2 p = vWorld.xz + vec2(uTravel, 0.0);
        float minor = gridLine(p, 0.05, 1.0);
        float major = gridLine(p, 0.25, 1.6);
        // Lane markers running with the direction of travel.
        float lane = 1.0 - min(abs(fract(vWorld.z / 0.5) - 0.5) / (fwidth(vWorld.z / 0.5) * 2.0), 1.0);
        float d = length(vWorld.xz - uCentre.xz);
        float fade = exp(-d * 0.85);
        vec3 c = uBase + uLine * (minor * 0.28 + major * 1.4 + lane * 0.6) * fade;
        gl_FragColor = vec4(c, uOpacity * (1.0 - smoothstep(1.2, 4.5, d)));
      }
    `,
  });

export const Floors: React.FC<{ frame: number; lighting: LightingState; mats: MaterialSet; contactShadow: boolean }> = ({ frame, lighting, mats, contactShadow }) => {
  const res = useMemo(() => {
    const plane = new PlaneGeometry(12, 12, 1, 1);
    const grid = gridMaterial();
    const shadowGrid = new ShadowMaterial({ color: new Color('#000000'), opacity: 0.5, transparent: true, depthWrite: false });
    const shadowMatte = new ShadowMaterial({ color: new Color('#000000'), opacity: 0.85, transparent: true, depthWrite: false });
    const contact = new MeshBasicMaterial({ color: new Color('#000000'), alphaMap: mats.maps.contactShadow, transparent: true, depthWrite: false });
    return { plane, grid, shadowGrid, shadowMatte, contact, unit: new PlaneGeometry(1, 1) };
  }, [mats]);

  const root = rootTransform(frame);
  const q = new Quaternion(...root.quaternion);
  const heading = new Vector3(1, 0, 0).applyQuaternion(q);
  const yaw = Math.atan2(-heading.z, heading.x);
  const centre = new Vector3(0, 0.045, 0).applyQuaternion(q).add(new Vector3(...root.position));
  const lift = Math.max(0, centre.y - 0.045);
  const floorPresence = Math.max(lighting.floor.concrete, lighting.floor.grid, lighting.floor.shadow);
  // Blender-plate mode: the plate's shadow catcher already carries the contact shadow.
  const contactOpacity = contactShadow ? 0.78 * Math.pow(1 - clamp(lift / 0.22), 2) * floorPresence : 0;
  const spread = 1 + lift * 4;

  useLayoutEffect(() => {
    mats.concrete.opacity = lighting.floor.concrete;
    res.grid.uniforms.uTravel.value = groundTravel(frame);
    res.grid.uniforms.uOpacity.value = lighting.floor.grid;
    (res.grid.uniforms.uCentre.value as Vector3).copy(centre);
    res.shadowGrid.opacity = 0.5 * lighting.floor.grid;
    res.shadowMatte.opacity = 0.85 * lighting.floor.shadow;
    res.contact.opacity = contactOpacity;
  });

  return (
    <group>
      <mesh geometry={res.plane} material={mats.concrete} rotation-x={-Math.PI / 2} receiveShadow visible={lighting.floor.concrete > 0.002} />
      <mesh geometry={res.plane} material={res.grid} rotation-x={-Math.PI / 2} position-y={0.0002} visible={lighting.floor.grid > 0.002} />
      <mesh geometry={res.plane} material={res.shadowGrid} rotation-x={-Math.PI / 2} position-y={0.0004} receiveShadow visible={lighting.floor.grid > 0.002} />
      <mesh geometry={res.plane} material={res.shadowMatte} rotation-x={-Math.PI / 2} position-y={0.0002} receiveShadow visible={lighting.floor.shadow > 0.002} />
      <mesh
        geometry={res.unit}
        material={res.contact}
        position={[centre.x, 0.0007, centre.z]}
        rotation={[-Math.PI / 2, 0, yaw]}
        scale={[0.34 * spread, 0.11 * spread, 1]}
        visible={contactOpacity > 0.002}
        renderOrder={2}
      />
    </group>
  );
};
