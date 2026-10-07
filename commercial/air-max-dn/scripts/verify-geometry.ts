// Geometry + choreography sanity checks, run with `npm run verify`.
// Fails loudly if a builder emits inward-wound / open meshes, if the shoe
// intersects the ground plane at rest, or if the physics tables go unstable.

import { buildSneaker, signedVolume, type MeshData } from '../src/geometry/sneaker-mesh.ts';
import { compressionAt, DROP_IMPACTS, dropHeightAt } from '../src/choreo/physics.ts';
import { anchorWorld, COMPONENTS, rootTransform } from '../src/choreo/pose.ts';
import { cameraAt } from '../src/choreo/camera.ts';
import { DURATION_IN_FRAMES } from '../src/choreo/timeline.ts';

const failures: string[] = [];
const check = (ok: boolean, msg: string) => {
  if (!ok) failures.push(msg);
};

const bounds = (m: MeshData) => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.positions.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      min[c] = Math.min(min[c], m.positions[i + c]);
      max[c] = Math.max(max[c], m.positions[i + c]);
    }
  }
  return { min, max };
};

const meshes = buildSneaker();
const closed: [string, MeshData][] = [
  ['outsole', meshes.outsole],
  ['midsole', meshes.midsole],
  ['shank', meshes.shank],
  ['laces', meshes.laces],
  ['collar', meshes.collar],
  ['flange.rear', meshes.flanges.rearChamber],
  ['flange.front', meshes.flanges.frontChamber],
  ...meshes.tubes.map((t, i) => [`tube${i}`, t.mesh] as [string, MeshData]),
];
for (const [name, m] of closed) {
  const v = signedVolume(m);
  const b = bounds(m);
  console.log(
    `${name.padEnd(13)} verts ${String(m.positions.length / 3).padStart(6)}  tris ${String(m.indices.length / 3).padStart(6)}  vol ${(v * 1e6).toFixed(2).padStart(9)} cm3  y[${b.min[1].toFixed(4)}, ${b.max[1].toFixed(4)}]`,
  );
  check(v > 0, `${name}: signed volume ${v} <= 0 (inward winding or open)`);
  for (const arr of [m.positions, m.normals, m.uvs]) check(arr.every(Number.isFinite), `${name}: non-finite attribute`);
}
for (const [name, m] of [['upper', meshes.upper], ['tongue', meshes.tongue]] as const) {
  const b = bounds(m);
  console.log(`${name.padEnd(13)} verts ${String(m.positions.length / 3).padStart(6)}  x[${b.min[0].toFixed(3)}, ${b.max[0].toFixed(3)}] y[${b.min[1].toFixed(4)}, ${b.max[1].toFixed(4)}] z[${b.min[2].toFixed(3)}, ${b.max[2].toFixed(3)}]`);
  check(m.normals.every(Number.isFinite), `${name}: non-finite normal`);
}
check(bounds(meshes.outsole).min[1] >= -1e-6, 'outsole penetrates the ground at rest');

let maxC = 0;
let minC = 0;
for (let f = 0; f <= DURATION_IN_FRAMES; f++) {
  for (const ch of ['rear', 'front'] as const) {
    const c = compressionAt(ch, f);
    maxC = Math.max(maxC, c);
    minC = Math.min(minC, c);
  }
  const r = rootTransform(f);
  check(r.position.every(Number.isFinite) && r.quaternion.every(Number.isFinite), `root transform non-finite @${f}`);
  const cam = cameraAt(f);
  check(cam.position.every(Number.isFinite) && cam.focal >= 28 && cam.focal <= 85, `camera invalid @${f}`);
  for (const id of COMPONENTS) check(anchorWorld(id, f).every(Number.isFinite), `anchor ${id} non-finite @${f}`);
}
console.log(`pod compression range [${minC.toFixed(3)}, ${maxC.toFixed(3)}]`);
console.log(`drop impacts: ${DROP_IMPACTS.map((i) => `${i.frame.toFixed(1)}f @ ${i.speed.toFixed(2)} m/s`).join(', ')}; rest height ${dropHeightAt(1799).toFixed(4)}`);
check(maxC > 0.15 && maxC < 0.6, `pod compression peak ${maxC} out of range`);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n- ${failures.slice(0, 20).join('\n- ')}`);
  process.exit(1);
}
console.log('\ngeometry + choreography OK');
