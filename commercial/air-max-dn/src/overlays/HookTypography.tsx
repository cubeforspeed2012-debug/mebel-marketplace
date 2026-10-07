// 00:00-00:05. Extended-black type that breaks the frame edges, cut hard on the
// sub hits. Each word arrives with an impulse and decelerates under drag
// (x = v0*tau*(1 - e^(-t/tau))), splits into three horizontal slices that shear
// apart on the hit and spring back, and tightens its tracking as it settles.

import { CHAMBERS, compressionAt, pressureAt } from '../choreo/physics.ts';
import { FPS, HOOK_HITS, MATTE } from '../choreo/timeline.ts';
import { EASE, SPRINGS, dampedKick, invLerp, lerp, springStep } from '../choreo/math.ts';
import type { CameraState } from '../choreo/camera.ts';
import { COPY } from '../copy.ts';
import { EXTENDED_BLACK, FONTS } from '../lib/fonts.ts';
import { timecode } from './DesignSpace.tsx';

type Layout = { size: number; y: number; x0: number; v0: number; align: 'left' | 'center' | 'right' };

/** Per-shot staging: deliberately off-centre, cropped by the frame on at least one edge. */
const LAYOUTS: Layout[] = [
  { size: 430, y: 690, x0: -60, v0: 520, align: 'left' }, // IMPACT - bottom edge crop
  { size: 470, y: 330, x0: 260, v0: -900, align: 'left' }, // COMPRESS - runs off both sides
  { size: 400, y: 200, x0: 1980, v0: -640, align: 'right' }, // RELEASE - top crop, from right
  { size: 0, y: 0, x0: 0, v0: 0, align: 'left' },
  { size: 440, y: 860, x0: -120, v0: 700, align: 'left' }, // REPEAT
  { size: 380, y: 540, x0: 960, v0: 0, align: 'center' }, // DYNAMIC - centred slam
  { size: 640, y: 540, x0: 960, v0: 120, align: 'center' }, // DY
  { size: 640, y: 540, x0: 960, v0: -120, align: 'center' }, // NA
  { size: 640, y: 540, x0: 960, v0: 160, align: 'center' }, // MIC
];

const SLICES = [
  { top: 0, bottom: 0.38, gain: 1 },
  { top: 0.38, bottom: 0.64, gain: -1.6 },
  { top: 0.64, bottom: 1, gain: 0.7 },
];

const Word: React.FC<{ shot: number; frame: number }> = ({ shot, frame }) => {
  const hit = HOOK_HITS[shot];
  const next = HOOK_HITS[shot + 1]?.frame ?? MATTE.start;
  const entry = COPY.hook[shot];
  if (!entry || !entry.word) return null;
  const { word, mode } = entry;
  const L = LAYOUTS[shot];
  const t = (frame - hit.frame) / FPS;
  const tau = 0.22;
  const x = L.x0 + L.v0 * tau * (1 - Math.exp(-t / tau)) + L.v0 * 0.08 * t;
  const slam = 1 + 0.16 * (1 - springStep(t, SPRINGS.snap));
  const tracking = lerp(0.07, -0.045, EASE.expoOut(invLerp(hit.frame, next, frame)));
  // Last 3 frames of a shot: the word drops a frame ahead of the cut (classic pre-lap).
  const visible = frame < next - 1;
  if (!visible) return null;
  const translate = L.align === 'center' ? '-50%' : L.align === 'right' ? '-100%' : '0%';
  return (
    <div className="absolute inset-0" style={{ mixBlendMode: mode === 'difference' ? 'difference' : 'normal' }}>
      {SLICES.map((s, i) => {
        const shear = s.gain * 46 * hit.strength * dampedKick(t, 7.5, 0.085);
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{ clipPath: `polygon(0 ${L.y - L.size * 0.5 + L.size * s.top}px, 100% ${L.y - L.size * 0.5 + L.size * s.top}px, 100% ${L.y - L.size * 0.5 + L.size * s.bottom + 0.5}px, 0 ${L.y - L.size * 0.5 + L.size * s.bottom + 0.5}px)` }}
          >
            <div
              className="absolute whitespace-nowrap uppercase text-bone"
              style={{
                ...EXTENDED_BLACK,
                left: x + shear,
                top: L.y,
                fontSize: L.size,
                lineHeight: 1,
                letterSpacing: `${tracking}em`,
                transform: `translate(${translate}, -50%) scale(${slam})`,
                transformOrigin: L.align === 'right' ? '100% 50%' : L.align === 'center' ? '50% 50%' : '0% 50%',
              }}
            >
              {word}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Hud: React.FC<{ frame: number; camera: CameraState; shot: number }> = ({ frame, camera, shot }) => {
  const on = frame >= 2 && frame < MATTE.start - 2;
  if (!on) return null;
  const psi = pressureAt('rear', frame);
  const c = Math.max(0, compressionAt('rear', frame));
  const flicker = frame < 8 ? (frame % 2 === 0 ? 1 : 0.25) : 1;
  return (
    <div className="absolute inset-0 text-bone" style={{ opacity: flicker }}>
      <div className="absolute left-[96px] top-[64px] text-[15px] font-medium uppercase tracking-[0.2em]" style={{ fontFamily: FONTS.grotesk }}>
        {COPY.hookHud.left}
      </div>
      <div className="tabular absolute right-[96px] top-[64px] text-[15px]" style={{ fontFamily: FONTS.mono }}>
        TC {timecode(frame, FPS)}
      </div>
      <div className="absolute bottom-[64px] left-[96px] flex items-end gap-6" style={{ fontFamily: FONTS.mono }}>
        <div>
          <div className="text-[12px] uppercase tracking-[0.2em] text-steel" style={{ fontFamily: FONTS.grotesk }}>
            {COPY.hookHud.right} / {CHAMBERS.rear.psi} PSI NOMINAL
          </div>
          <div className="tabular mt-1 text-[40px] font-medium leading-none">
            {psi.toFixed(1)}
            <span className="ml-2 text-[14px] text-steel">PSI</span>
          </div>
        </div>
        <div className="mb-[6px] h-[34px] w-[180px] border border-bone/40 p-[3px]">
          <div className="h-full bg-royal" style={{ width: `${Math.min(100, (c / 0.5) * 100)}%` }} />
        </div>
      </div>
      <div className="tabular absolute bottom-[64px] right-[96px] text-right text-[13px] uppercase leading-[1.6] tracking-[0.12em]" style={{ fontFamily: FONTS.mono }}>
        <div>SHOT {String(shot + 1).padStart(2, '0')}/{String(COPY.hook.length).padStart(2, '0')}</div>
        <div>
          {camera.focal.toFixed(0)}MM / FOCUS {(camera.focus * 100).toFixed(1)}CM
        </div>
      </div>
    </div>
  );
};

export const HookTypography: React.FC<{ frame: number; camera: CameraState }> = ({ frame, camera }) => {
  let shot = 0;
  while (shot < HOOK_HITS.length - 1 && frame >= HOOK_HITS[shot + 1].frame) shot++;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Word shot={shot} frame={frame} />
      <Hud frame={frame} camera={camera} shot={shot} />
    </div>
  );
};
