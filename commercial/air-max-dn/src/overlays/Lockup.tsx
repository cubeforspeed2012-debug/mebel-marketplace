// 00:26-00:30. Brand lockup on deep matte black. Springs for mass, tracking that
// settles from airy to tight, a hairline that draws on the brief's expo curve,
// and the CTA arriving last on its own beat.

import { DROP_IMPACTS } from '../choreo/physics.ts';
import { FPS, LOCKUP } from '../choreo/timeline.ts';
import { EASE, SPRINGS, clamp, lerp, springStep } from '../choreo/math.ts';
import { COPY } from '../copy.ts';
import { EXTENDED_BLACK, FONTS } from '../lib/fonts.ts';

const sec = (frame: number, start: number) => (frame - start) / FPS;

export const Lockup: React.FC<{ frame: number; releaseLine: string; ctaLine: string }> = ({ frame, releaseLine, ctaLine }) => {
  const t0 = Math.max(LOCKUP.start, Math.round(DROP_IMPACTS[1]?.frame ?? LOCKUP.start));
  const brand = springStep(sec(frame, t0), SPRINGS.glide);
  const model = springStep(sec(frame, t0 + 6), SPRINGS.heavy);
  const edition = springStep(sec(frame, t0 + 16), SPRINGS.glide);
  const rule = EASE.expoOut(clamp(sec(frame, t0 + 12) / 1.1));
  const tagline = EASE.expoOut(clamp(sec(frame, t0 + 30) / 0.9));
  const cta = EASE.expoOut(clamp(sec(frame, LOCKUP.cta) / 0.8));
  const ctaTrack = lerp(0.5, 0.2, EASE.expoOut(clamp(sec(frame, LOCKUP.cta) / 1.2)));

  return (
    <div className="absolute inset-y-0 right-[132px] flex w-[700px] flex-col justify-center text-bone">
      <div
        className="text-[24px] font-medium uppercase"
        style={{ fontFamily: FONTS.grotesk, letterSpacing: `${lerp(0.75, 0.34, brand)}em`, opacity: clamp(brand * 1.4) }}
      >
        {COPY.lockup.brand}
      </div>
      <div className="overflow-hidden" style={{ marginTop: 6, paddingBottom: 16 }}>
        <div
          style={{
            ...EXTENDED_BLACK,
            fontSize: 300,
            lineHeight: 0.84,
            letterSpacing: `${lerp(0.08, -0.06, model)}em`,
            transform: `translateY(${lerp(100, 0, model)}%)`,
          }}
        >
          {COPY.lockup.model}
        </div>
      </div>
      <div className="h-px bg-bone/50" style={{ width: `${rule * 100}%` }} />
      <div className="mt-6 flex items-baseline justify-between">
        <div
          className="text-[20px] font-medium uppercase"
          style={{ fontFamily: FONTS.grotesk, letterSpacing: `${lerp(0.5, 0.26, edition)}em`, opacity: clamp(edition * 1.3) }}
        >
          {COPY.lockup.edition}
        </div>
        <div className="text-[20px] uppercase text-royal" style={{ fontFamily: FONTS.syne, fontWeight: 700, letterSpacing: '0.04em', opacity: tagline, transform: `translateX(${(1 - tagline) * 24}px)` }}>
          {COPY.lockup.tagline}
        </div>
      </div>
      <div className="tabular mt-16 flex items-center gap-6 text-[16px] uppercase" style={{ fontFamily: FONTS.mono, opacity: cta, letterSpacing: `${ctaTrack}em` }}>
        <span className="inline-block h-[9px] w-[9px] bg-tungsten" />
        <span>{releaseLine}</span>
        <span className="text-steel">{ctaLine}</span>
      </div>
    </div>
  );
};
