// 00:05-00:13. SVG callouts locked to the exploded parts. Anchors are projected
// from the same camera + part matrices the renderer uses, every frame, so the
// leader lines stay pinned through the camera arc and the spring overshoot.

import { anchorWorld, type ComponentId } from '../choreo/pose.ts';
import { projectToScreen } from '../choreo/project.ts';
import { pressureAt } from '../choreo/physics.ts';
import { CALLOUT_ORDER } from '../choreo/lighting.ts';
import { CALLOUTS, EXPLODE, FPS, HEIGHT, MATTE, WIDTH } from '../choreo/timeline.ts';
import { EASE, SPRINGS, clamp, invLerp, lerp, springStep } from '../choreo/math.ts';
import type { CameraState } from '../choreo/camera.ts';
import { COPY } from '../copy.ts';
import { FONTS } from '../lib/fonts.ts';
import { timecode } from './DesignSpace.tsx';

type Slot = { x: number; y: number; side: 'left' | 'right' };

/** Label slots tuned to the scene-2 camera arc: heel parts left, forefoot right. */
const SLOTS: Record<Exclude<ComponentId, 'outsole'>, Slot> = {
  rearChamber: { x: 120, y: 735, side: 'left' },
  frontChamber: { x: 400, y: 905, side: 'left' },
  shank: { x: 1310, y: 930, side: 'right' },
  midsole: { x: 1800, y: 720, side: 'right' },
  upper: { x: 1730, y: 205, side: 'right' },
};

const LABEL_W = 300;

const Callout: React.FC<{ id: Exclude<ComponentId, 'outsole'>; index: number; frame: number; camera: CameraState }> = ({ id, index, frame, camera }) => {
  const start = CALLOUTS.start + index * CALLOUTS.stagger;
  const retract = CALLOUTS.retract + (CALLOUT_ORDER.length - 1 - index) * 5;
  if (frame < start || frame > retract + 24) return null;

  const anchor = projectToScreen(anchorWorld(id, frame), camera, WIDTH, HEIGHT);
  const slot = SLOTS[id];
  const dir = slot.side === 'left' ? -1 : 1;
  const labelEdge = slot.side === 'left' ? slot.x + LABEL_W : slot.x - LABEL_W;
  // 45-degree run to the label's baseline, then horizontal - classic technical drawing leader.
  const dy = slot.y - anchor.y;
  const elbowX = anchor.x + dir * Math.min(Math.abs(dy), Math.abs(labelEdge - anchor.x) * 0.8);
  const path = `M ${anchor.x} ${anchor.y} L ${elbowX} ${slot.y} L ${labelEdge} ${slot.y}`;
  const length = Math.hypot(elbowX - anchor.x, dy) + Math.abs(labelEdge - elbowX);

  const tIn = (frame - start) / FPS;
  const tOut = (frame - retract) / FPS;
  const draw = EASE.expoOut(clamp(tIn / 0.45)) * (1 - EASE.expoIn(clamp(tOut / 0.3)));
  const lock = springStep(tIn, SPRINGS.elastic);
  const textIn = EASE.expoOut(clamp((tIn - 0.18) / 0.6));
  const textOut = EASE.expoIn(clamp(tOut / 0.25));
  const reveal = clamp(textIn - textOut);
  const bracket = lerp(42, 11, lock) * (1 - textOut);

  const c = COPY.callouts[id];
  const live = 'live' in c;
  const valueNum = live ? pressureAt(c.live, frame) : c.value * EASE.expoOut(clamp((tIn - 0.12) / 0.7));
  const decimals = live ? 1 : c.decimals;
  const value = valueNum.toFixed(decimals);

  return (
    <>
      <svg className="absolute inset-0 overflow-visible" width={WIDTH} height={HEIGHT}>
        <path d={path} fill="none" stroke="#f1efe9" strokeWidth={1.25} strokeDasharray={length} strokeDashoffset={length * (1 - draw)} opacity={0.9} />
        {/* lock-on brackets */}
        <g transform={`translate(${anchor.x} ${anchor.y})`} stroke="#f1efe9" strokeWidth={1.5} fill="none" opacity={draw}>
          {[
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ].map(([sx, sy], k) => (
            <path key={k} d={`M ${sx * bracket} ${sy * (bracket - 6)} L ${sx * bracket} ${sy * bracket} L ${sx * (bracket - 6)} ${sy * bracket}`} />
          ))}
          <circle r={2.6 * lock} fill="#2f55ff" stroke="none" />
          <circle r={lerp(4, 22, clamp(tIn / 0.5))} strokeWidth={1} opacity={1 - clamp(tIn / 0.5)} />
        </g>
      </svg>
      <div
        className="absolute"
        style={{
          left: slot.side === 'left' ? slot.x : slot.x - LABEL_W,
          top: slot.y - 92,
          width: LABEL_W,
          textAlign: slot.side === 'left' ? 'left' : 'right',
          clipPath: `inset(0 ${slot.side === 'left' ? (1 - reveal) * 100 : 0}% 0 ${slot.side === 'right' ? (1 - reveal) * 100 : 0}%)`,
        }}
      >
        <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-bone" style={{ fontFamily: FONTS.grotesk }}>
          <span className="text-royal">{String(index + 1).padStart(2, '0')}</span>&nbsp;&nbsp;{c.title}
        </div>
        <div className="tabular mt-[6px] text-[46px] font-medium leading-none text-bone" style={{ fontFamily: FONTS.mono, letterSpacing: '-0.02em' }}>
          {value}
          <span className="ml-2 text-[15px] tracking-normal text-steel">{c.unit}</span>
        </div>
        <div className="mt-[10px] text-[11px] uppercase tracking-[0.2em] text-steel" style={{ fontFamily: FONTS.grotesk }}>
          {c.note}
        </div>
      </div>
    </>
  );
};

export const Callouts: React.FC<{ frame: number; camera: CameraState }> = ({ frame, camera }) => {
  const headerIn = EASE.expoOut(invLerp(MATTE.end, MATTE.end + 40, frame));
  const headerOut = EASE.expoIn(invLerp(EXPLODE.reassemble + 20, EXPLODE.settled, frame));
  const header = clamp(headerIn - headerOut);
  return (
    <div className="absolute inset-0">
      <div className="absolute left-[96px] top-[64px] text-bone" style={{ opacity: header }}>
        <div className="flex items-center gap-4 text-[13px] font-medium uppercase tracking-[0.24em]" style={{ fontFamily: FONTS.grotesk }}>
          <span className="text-royal">{COPY.explode.figure}</span>
          <span className="h-px bg-bone/60" style={{ width: 64 * header }} />
          <span>{COPY.explode.title}</span>
        </div>
      </div>
      <div className="tabular absolute right-[96px] top-[64px] text-[13px] text-bone" style={{ fontFamily: FONTS.mono, opacity: header }}>
        TC {timecode(frame, FPS)}
      </div>
      {CALLOUT_ORDER.map((id, i) =>
        id === 'outsole' ? null : <Callout key={id} id={id} index={i} frame={frame} camera={camera} />,
      )}
    </div>
  );
};
