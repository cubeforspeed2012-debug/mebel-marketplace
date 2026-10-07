// Image-based fill + the set. The environment map is a procedural light-box
// (big overhead softbox, tungsten strip, cold strip, faint fill card) baked
// through PMREM - it is what draws the long specular strips down the air tubes.
// The visible set is a dark cyclorama with architectural pillars and practical
// lights that DOF turns into bokeh, after the concrete-and-tungsten reference.

import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import {
  BackSide,
  BoxGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  type WebGLRenderer,
} from 'three';
import { KELVIN } from '../choreo/lighting.ts';
import { DEG } from '../choreo/math.ts';

const envCache = new WeakMap<WebGLRenderer, ReturnType<PMREMGenerator['fromScene']>>();

const buildEnvironment = (gl: WebGLRenderer) => {
  const cached = envCache.get(gl);
  if (cached) return cached;
  const scene = new Scene();
  scene.add(new Mesh(new SphereGeometry(10, 48, 24), new MeshBasicMaterial({ color: new Color('#030304'), side: BackSide })));
  const panel = (w: number, h: number, colour: string, power: number, pos: [number, number, number]) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(colour).multiplyScalar(power), side: DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0); // +z (the emitting face) toward the subject
    scene.add(m);
  };
  panel(6, 3, KELVIN.warmWhite, 3.2, [0, 6, 0.5]); // overhead softbox
  panel(1, 4.5, KELVIN.tungsten, 9, [-5, 2.2, 3]); // key-side strip
  panel(0.8, 5, KELVIN.rimBlue, 7, [4.5, 2.4, -4]); // rim-side strip
  panel(5, 2.5, '#c9ccd6', 0.55, [0, 1.4, 6]); // fill card behind camera
  panel(10, 10, '#2a2b30', 0.06, [0, -3, 0]); // floor bounce
  const pmrem = new PMREMGenerator(gl);
  const rt = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  envCache.set(gl, rt);
  return rt;
};

const cycloramaMaterial = () =>
  new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: { uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uFade;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 floorC = vec3(0.0042, 0.0045, 0.0052);
        vec3 wallC = vec3(0.0068, 0.0072, 0.0085);
        vec3 haze = vec3(0.016, 0.011, 0.007);
        vec3 c = mix(floorC, wallC, smoothstep(-0.05, 0.35, h));
        c += haze * exp(-abs(h - 0.06) * 14.0);
        gl_FragColor = vec4(c * uFade, 1.0);
      }
    `,
  });

type Practical = { angle: number; radius: number; y: number; kind: 'strip' | 'slab'; tint: 'warm' | 'cold' };

const PRACTICALS: Practical[] = [
  { angle: -160, radius: 4.6, y: 1.1, kind: 'strip', tint: 'warm' },
  { angle: -135, radius: 5.2, y: 0.55, kind: 'strip', tint: 'warm' },
  { angle: -100, radius: 4.8, y: 1.6, kind: 'slab', tint: 'cold' },
  { angle: -62, radius: 5.4, y: 0.9, kind: 'strip', tint: 'warm' },
  { angle: -20, radius: 5.0, y: 0.5, kind: 'strip', tint: 'warm' },
  { angle: 18, radius: 5.6, y: 1.4, kind: 'slab', tint: 'cold' },
  { angle: 55, radius: 4.9, y: 0.8, kind: 'strip', tint: 'warm' },
  { angle: 95, radius: 5.3, y: 1.9, kind: 'strip', tint: 'warm' },
  { angle: 128, radius: 4.7, y: 1.2, kind: 'slab', tint: 'cold' },
];

export const StudioEnvironment: React.FC<{ envIntensity: number; practicals: number; cyclorama: number }> = ({ envIntensity, practicals, cyclorama }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const env = useMemo(() => buildEnvironment(gl), [gl]);

  const set = useMemo(() => {
    const cyc = cycloramaMaterial();
    const warm = new MeshBasicMaterial({ color: new Color(KELVIN.tungsten) });
    const cold = new MeshBasicMaterial({ color: new Color(KELVIN.rimBlue) });
    const pillar = new MeshStandardMaterial({ color: new Color('#2a2c31'), roughness: 0.9 });
    return {
      cyc,
      warm,
      cold,
      pillar,
      strip: new BoxGeometry(1.7, 0.045, 0.05),
      slab: new BoxGeometry(0.55, 2.4, 0.06),
      pillarGeo: new BoxGeometry(0.6, 5, 0.6),
      sphere: new SphereGeometry(14, 48, 24),
    };
  }, []);

  useLayoutEffect(() => {
    scene.environment = env.texture;
    scene.environmentIntensity = envIntensity;
    // Practicals are emissive cards: values > 1 survive the half-float chain and feed bloom.
    set.warm.color.set(KELVIN.tungsten).multiplyScalar(5.5 * practicals);
    set.cold.color.set(KELVIN.rimBlue).multiplyScalar(4.5 * practicals);
    set.cyc.uniforms.uFade.value = cyclorama;
  }, [scene, env, envIntensity, practicals, cyclorama, set]);

  return (
    <group>
      <mesh geometry={set.sphere} material={set.cyc} renderOrder={-10} />
      {PRACTICALS.map((p, i) => {
        const a = p.angle * DEG;
        const x = Math.sin(a) * p.radius;
        const z = -Math.cos(a) * p.radius;
        const face = Math.atan2(-x, -z);
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, face, 0]} visible={practicals > 0.001}>
            <mesh geometry={set.pillarGeo} material={set.pillar} position={[0, 2.5, -0.35]} />
            <mesh geometry={p.kind === 'strip' ? set.strip : set.slab} material={p.tint === 'warm' ? set.warm : set.cold} position={[0, p.y, 0]} />
          </group>
        );
      })}
    </group>
  );
};
