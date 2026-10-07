// 00:04.75-00:05.6. 3D-to-2D hand-off: the 3D world is only visible through a
// custom-drawn "Dn" monogram; the monogram then zooms through camera with the
// D's stem as the scale origin until the stem alone covers the frame.

import { MATTE } from '../choreo/timeline.ts';
import { EASE, SPRINGS, invLerp, lerp, springStep } from '../choreo/math.ts';

/** Monogram on a 1080 x 600 grid. D: 140-unit stem, r300 bowl. n: 130-unit stems, rounded arch. */
const D_PATH = 'M0,0 H330 A300,300 0 0 1 330,600 H0 Z M140,140 V460 H330 A160,160 0 0 0 330,140 Z';
const N_PATH = 'M700,600 V180 H890 A190,190 0 0 1 1080,370 V600 H950 V370 A60,60 0 0 0 890,310 H830 V600 Z';
const ORIGIN = { x: 70, y: 300 }; // centre of the D stem
const BOX = { w: 1080, h: 600 };

export const TypeMatte: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < MATTE.start || frame >= MATTE.end) return null;
  const hold = MATTE.start + 15;
  const t = (frame - MATTE.start) / 60;
  const settle = springStep(t, SPRINGS.snap);
  const baseScale = 0.62 * lerp(1.25, 1, settle);
  const zoom = EASE.expoIn(invLerp(hold, MATTE.end - 2, frame));
  const scale = baseScale * Math.pow(70, zoom);
  // Drift the stem toward frame centre as we fly through it.
  const restX = 960 - (BOX.w / 2 - ORIGIN.x) * baseScale;
  const restY = 540 + (ORIGIN.y - BOX.h / 2) * baseScale;
  const ox = lerp(restX, 960, EASE.cubicInOut(zoom));
  const oy = lerp(restY, 540, EASE.cubicInOut(zoom));
  const transform = `translate(${ox} ${oy}) scale(${scale}) translate(${-ORIGIN.x} ${-ORIGIN.y})`;
  const stroke = 2 / scale;
  return (
    <svg className="absolute inset-0" width={1920} height={1080} viewBox="0 0 1920 1080">
      <defs>
        <mask id="dn-matte" maskUnits="userSpaceOnUse" x={0} y={0} width={1920} height={1080}>
          <rect width={1920} height={1080} fill="#fff" />
          <g transform={transform}>
            <path d={D_PATH} fillRule="evenodd" fill="#000" />
            <path d={N_PATH} fill="#000" />
          </g>
        </mask>
      </defs>
      <rect width={1920} height={1080} fill="#080808" mask="url(#dn-matte)" />
      <g transform={transform} fill="none" stroke="#f1efe9" strokeWidth={stroke} opacity={1 - zoom}>
        <path d={D_PATH} fillRule="evenodd" />
        <path d={N_PATH} />
      </g>
    </svg>
  );
};
