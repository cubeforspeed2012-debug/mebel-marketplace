// Scene-3 velocity environment: an abstract depth-map wall (iso-depth contours of
// a travelling height field) and instanced air streaks. The wall scrolls with the
// true ground travel, so perspective gives it correct parallax; the streaks run
// at 3-9x ground speed - they are the "air", not the set.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial } from 'three';
import { groundTravel } from '../choreo/pose.ts';
import { hash01, lerp } from '../choreo/math.ts';

const STREAKS = 110;

const depthWallMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTravel: { value: 0 }, uOpacity: { value: 0 } },
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
      varying vec3 vWorld;

      float hash(vec2 p) {
        uvec2 q = uvec2(ivec2(floor(p)) + 32768);
        uint h = q.x * 1597334677u ^ q.y * 3812015801u;
        h = (h ^ (h >> 16u)) * 2246822519u;
        return float(h ^ (h >> 13u)) / 4294967295.0;
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          s += a * noise(p);
          p = p * 2.03 + 17.0;
          a *= 0.5;
        }
        return s;
      }

      void main() {
        vec2 p = vec2(vWorld.x + uTravel, vWorld.y) * 0.85;
        float h = fbm(p);
        float bands = h * 16.0;
        float dist = 0.5 - abs(fract(bands) - 0.5);
        float iso = 1.0 - smoothstep(0.0, fwidth(bands) * 1.3, dist);
        vec3 deep = vec3(0.004, 0.006, 0.016);
        vec3 royal = vec3(0.12, 0.2, 1.0);
        vec3 c = mix(deep, royal * 0.06, h) + royal * iso * (0.25 + 1.1 * h * h);
        float v = smoothstep(-0.1, 0.5, vWorld.y) * (1.0 - smoothstep(1.8, 3.2, vWorld.y));
        gl_FragColor = vec4(c, uOpacity * v);
      }
    `,
  });

export const SpeedField: React.FC<{ frame: number; wall: number; streaks: number }> = ({ frame, wall, streaks }) => {
  const mesh = useRef<InstancedMesh>(null);
  const res = useMemo(() => {
    const wallMat = depthWallMaterial();
    const streakMat = new MeshBasicMaterial({ color: new Color('#ffffff'), blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
    const seeds = Array.from({ length: STREAKS }, (_, i) => {
      const near = hash01(i, 3) < 0.18;
      return {
        x0: lerp(-2.4, 2.4, hash01(i, 1)),
        y: near ? lerp(0.02, 0.22, hash01(i, 2)) : lerp(0.01, 0.6, hash01(i, 2)),
        z: near ? lerp(0.22, 0.45, hash01(i, 4)) : lerp(-1.3, -0.18, hash01(i, 4)),
        length: lerp(0.08, 0.5, hash01(i, 5) ** 1.6),
        thick: lerp(0.0012, 0.0038, hash01(i, 6)),
        speed: lerp(3, 9, hash01(i, 7)),
        royal: hash01(i, 8) < 0.35,
        gain: lerp(0.4, 2.2, hash01(i, 9)),
      };
    });
    return { wallMat, streakMat, seeds, wallGeo: new PlaneGeometry(10, 4), streakGeo: new PlaneGeometry(1, 1), dummy: new Object3D() };
  }, []);

  useLayoutEffect(() => {
    const travel = groundTravel(frame);
    res.wallMat.uniforms.uTravel.value = travel;
    res.wallMat.uniforms.uOpacity.value = wall;
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    res.seeds.forEach((s, i) => {
      const span = 4.8;
      let x = s.x0 - travel * s.speed;
      x = ((((x + span / 2) % span) + span) % span) - span / 2;
      res.dummy.position.set(x, s.y, s.z);
      res.dummy.scale.set(s.length, s.thick, 1);
      res.dummy.updateMatrix();
      m.setMatrixAt(i, res.dummy.matrix);
      // Additive: brightness is opacity. Fade streaks at the wrap seam.
      const edge = 1 - Math.min(1, Math.max(0, (Math.abs(x) - 1.9) / 0.5));
      c.set(s.royal ? '#4d6bff' : '#dfe6ff').multiplyScalar(s.gain * streaks * edge);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group visible={wall > 0.002 || streaks > 0.002}>
      <mesh geometry={res.wallGeo} material={res.wallMat} position={[0, 1.2, -1.7]} />
      <instancedMesh ref={mesh} args={[res.streakGeo, res.streakMat, STREAKS]} frustumCulled={false} />
    </group>
  );
};
