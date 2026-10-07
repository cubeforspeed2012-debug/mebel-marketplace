// Bakes the realtime choreography to shared/choreography.bake.json so
// blender/render_assets.py renders the *same* film: per-frame camera (position,
// target, up, focal length, focus distance, equivalent f-stop), root motion, the
// explode/compression transforms of every part and tube, and light levels.
// Coordinates are three.js (y-up, metres); the Blender script converts.
//
//   node scripts/bake-choreography.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Vector3 } from 'three';
import { cameraAt, equivalentFStop } from '../src/choreo/camera.ts';
import { lightingAt, CALLOUT_ORDER } from '../src/choreo/lighting.ts';
import { COMPONENTS, componentTransform, rootTransform, tubeTransform } from '../src/choreo/pose.ts';
import { compressionAt } from '../src/choreo/physics.ts';
import { DURATION_IN_FRAMES, FPS, SCENES } from '../src/choreo/timeline.ts';
import { tubes } from '../src/geometry/spec.ts';

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const push = (arr: number[], ...vals: number[]) => {
  for (const v of vals) arr.push(r6(v));
};

const camera = { position: [] as number[], target: [] as number[], up: [] as number[], focal: [] as number[], focus: [] as number[], fStop: [] as number[], cut: [] as number[] };
const root = { position: [] as number[], quaternion: [] as number[] };
const components = Object.fromEntries(COMPONENTS.map((id) => [id, { position: [] as number[], quaternion: [] as number[] }]));
const tubeTracks = tubes().map((t) => ({ chamber: t.chamber, position: [] as number[], scale: [] as number[] }));
const lamp = () => ({ position: [] as number[], target: [] as number[], level: [] as number[], color: [] as string[] });
const lights = { key: lamp(), rim: lamp(), accent: lamp(), env: [] as number[], floorShadow: [] as number[] };
const highlight = Object.fromEntries(CALLOUT_ORDER.map((id) => [id, [] as number[]]));
const pods = { rear: [] as number[], front: [] as number[] };

for (let f = 0; f < DURATION_IN_FRAMES; f++) {
  const cam = cameraAt(f);
  const forward = new Vector3(...cam.target).sub(new Vector3(...cam.position)).normalize();
  const up = new Vector3(0, 1, 0).applyAxisAngle(forward, -cam.roll);
  push(camera.position, ...cam.position);
  push(camera.target, ...cam.target);
  push(camera.up, up.x, up.y, up.z);
  push(camera.focal, cam.focal);
  push(camera.focus, cam.focus);
  push(camera.fStop, equivalentFStop(cam));
  camera.cut.push(cam.cut);

  const rt = rootTransform(f);
  push(root.position, ...rt.position);
  push(root.quaternion, ...rt.quaternion);
  for (const id of COMPONENTS) {
    const ct = componentTransform(id, f);
    push(components[id].position, ...ct.position);
    push(components[id].quaternion, ...ct.quaternion);
  }
  tubeTracks.forEach((track, i) => {
    const tt = tubeTransform(i, f);
    push(track.position, ...tt.position);
    push(track.scale, ...tt.scale);
  });

  const light = lightingAt(f, cam);
  // Levels are relative to each lamp's nominal candela - Blender maps them onto its own wattages.
  const nominal = { key: 6, rim: 18, accent: 20 } as const;
  for (const id of ['key', 'rim', 'accent'] as const) {
    push(lights[id].position, ...light[id].position);
    push(lights[id].target, ...light[id].target);
    push(lights[id].level, light[id].intensity / nominal[id]);
    lights[id].color.push(light[id].color);
  }
  push(lights.env, light.env / 0.35);
  push(lights.floorShadow, light.floor.shadow);
  for (const id of CALLOUT_ORDER) push(highlight[id], light.highlight.id === id ? light.highlight.amount : 0);
  push(pods.rear, compressionAt('rear', f));
  push(pods.front, compressionAt('front', f));
}

const bake = {
  version: 1,
  generator: 'scripts/bake-choreography.ts',
  fps: FPS,
  frames: DURATION_IN_FRAMES,
  axes: 'three.js: x heel->toe, y up, z lateral. Blender: (x, y, z) -> (x, -z, y).',
  units: 'metres',
  filmGaugeMm: 36,
  scenes: SCENES,
  camera,
  root,
  components,
  tubes: tubeTracks,
  lights,
  highlight,
  pods,
};

const out = path.resolve(import.meta.dirname, '../shared/choreography.bake.json');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(bake));
console.log(`choreography.bake.json: ${DURATION_IN_FRAMES} frames, ${COMPONENTS.length} parts, ${tubeTracks.length} tubes -> ${path.relative(process.cwd(), out)}`);
