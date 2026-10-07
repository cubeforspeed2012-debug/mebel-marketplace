// Renders key frames of the film to out/stills/ for look-dev and review.
//   node scripts/preview-stills.ts                 -> one frame per beat of interest
//   node scripts/preview-stills.ts 100 450 1610    -> specific frames
// Env: REMOTION_GL (default 'angle'; use 'swangle' without a GPU), PROPS (JSON input props,
//      e.g. '{"plate":"blender"}'),
//      REMOTION_BROWSER (optional path to chrome-headless-shell), SCALE (default 0.5).

import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { enableTailwind } from '@remotion/tailwind-v4';
import { CUE_SHEET } from '../src/choreo/timeline.ts';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n));
const frames = args.length ? args : [...new Set([40, 100, 140, 190, 225, 292, ...CUE_SHEET().map((c) => c.frame + 12), 600, 900, 1100, 1200, 1350, 1440, 1700, 1790])].sort((a, b) => a - b);

const serveUrl = await bundle({
  entryPoint: path.join(root, 'src/index.ts'),
  webpackOverride: (c) => enableTailwind(c),
});
const inputProps = { audio: false, ...(JSON.parse(process.env.PROPS ?? '{}') as Record<string, unknown>) };
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const gl = (process.env.REMOTION_GL ?? 'angle') as 'angle' | 'swangle' | 'egl' | 'swiftshader' | 'vulkan';
const composition = await selectComposition({ serveUrl, id: 'AirMaxDn', inputProps, browserExecutable, chromiumOptions: { gl } });
const outDir = path.join(root, process.env.OUT_DIR ?? 'out/stills');
mkdirSync(outDir, { recursive: true });
const scale = Number(process.env.SCALE ?? 0.5);

for (const frame of frames) {
  const t0 = Date.now();
  const output = path.join(outDir, `frame_${String(frame).padStart(4, '0')}.png`);
  await renderStill({
    serveUrl,
    composition,
    frame,
    output,
    inputProps,
    scale,
    chromiumOptions: { gl },
    browserExecutable,
    overwrite: true,
  });
  console.log(`frame ${frame} -> ${path.relative(root, output)} (${Date.now() - t0} ms)`);
}
