// 00:23-00:26. Stroboscopic type on the eighth-note grid: each word is lit for
// 7 frames and dark for 8, with full-frame inversions on the payoff words.
// Sizes jump between steps so the eye re-acquires every cut.

import { FLASH_OUT, FPS, ORBIT, STROBE } from '../choreo/timeline.ts';
import { pressureAt } from '../choreo/physics.ts';
import { clamp, invLerp } from '../choreo/math.ts';
import { EXTENDED_BLACK, FONTS } from '../lib/fonts.ts';
import { timecode } from './DesignSpace.tsx';

const SIZES = [300, 360, 250, 520, 300, 260, 230, 560, 230, 560, 760];
const OFFSETS = [-90, 120, 0, 40, -140, 60, -60, 0, 80, 0, 0];
const INVERT = new Set(['UNREAL', 'Dn']);

export const StrobeTypography: React.FC<{ frame: number }> = ({ frame }) => {
  const step = Math.floor((frame - STROBE.start) / STROBE.step);
  const local = (frame - STROBE.start) % STROBE.step;
  const word = step >= 0 && step < STROBE.words.length ? STROBE.words[step] : null;
  const lit = word !== null && local < 7 && frame < FLASH_OUT.start;
  const invert = lit && word !== null && INVERT.has(word) && local < 3;
  const hudOn = frame >= ORBIT.start + 20 && frame < FLASH_OUT.start;
  const orbit = clamp(invLerp(ORBIT.start, ORBIT.end, frame));
  const peakPsi = pressureAt('rear', frame) + 22 * Math.sin(Math.PI * orbit);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {invert && <div className="absolute inset-0 bg-bone" />}
      {lit && word && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ mixBlendMode: invert ? 'normal' : 'difference' }}>
          <div
            className="whitespace-nowrap"
            style={{
              ...EXTENDED_BLACK,
              fontSize: SIZES[step],
              lineHeight: 1,
              letterSpacing: word === 'Dn' ? '-0.06em' : '-0.04em',
              color: invert ? '#080808' : '#f1efe9',
              transform: `translateY(${OFFSETS[step]}px)`,
              textTransform: word === 'Dn' ? 'none' : 'uppercase',
            }}
          >
            {word}
          </div>
        </div>
      )}
      {hudOn && (
        <div className="tabular absolute inset-x-[96px] bottom-[64px] flex items-end justify-between text-[13px] uppercase tracking-[0.16em] text-bone" style={{ fontFamily: FONTS.mono }}>
          <div>
            <div className="text-steel">PEAK PRESSURE</div>
            <div className="mt-1 text-[34px] font-medium tracking-[-0.02em]">{peakPsi.toFixed(1)} PSI</div>
          </div>
          <div className="text-right">
            <div className="text-steel">ORBIT</div>
            <div className="mt-1 text-[34px] font-medium tracking-[-0.02em]">{Math.round(orbit * 360).toString().padStart(3, '0')}&deg;</div>
          </div>
        </div>
      )}
      {hudOn && (
        <div className="tabular absolute right-[96px] top-[64px] text-[13px] text-bone" style={{ fontFamily: FONTS.mono }}>
          TC {timecode(frame, FPS)}
        </div>
      )}
    </div>
  );
};
