// 00:13-00:21. Layout typography on a GSAP timeline. Lines rise out of masks on
// cubic-bezier(0.19, 1, 0.22, 1) with a 90 ms stagger while their tracking closes
// from open to tight - the settle is in the spacing, not just the position.

import { GAIT, SCENES, STRIKES, WHIP } from '../choreo/timeline.ts';
import { COPY } from '../copy.ts';
import { FONTS } from '../lib/fonts.ts';
import { EXPO_IN, EXPO_OUT, useGsapState } from '../lib/gsap-timeline.ts';

type LineState = { y: number; track: number; opacity: number };
type State = {
  kicker: { width: number; opacity: number };
  a: LineState[];
  aBody: { y: number; opacity: number };
  bKickers: LineState[];
  bLeft: LineState[];
  bRight: LineState[];
  bNotes: { y: number; opacity: number }[];
  bRule: { scale: number };
};

const at = (frame: number) => (frame - SCENES.velocity.from) / 60;
const line = (): LineState => ({ y: 110, track: 0.14, opacity: 1 });

const build = (tl: gsap.core.Timeline, s: State) => {
  const aIn = at(STRIKES[0].frame + 2);
  const aOut = at(STRIKES[3].frame + 18);
  const bIn = at(STRIKES[4].frame + 2);
  const bOut = at(WHIP.start - 26);

  tl.fromTo(s.kicker, { width: 0, opacity: 0 }, { width: 72, opacity: 1, duration: 0.8, ease: EXPO_OUT }, aIn - 0.1);
  tl.fromTo(s.a, { y: 110, track: 0.14 }, { y: 0, track: -0.035, duration: 1.2, ease: EXPO_OUT, stagger: 0.09 }, aIn);
  tl.fromTo(s.aBody, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: EXPO_OUT }, aIn + 0.75);
  tl.fromTo(s.a, { y: 0, track: -0.035 }, { y: -110, track: -0.06, duration: 0.42, ease: EXPO_IN, stagger: 0.06 }, aOut);
  tl.fromTo(s.aBody, { y: 0, opacity: 1 }, { y: -16, opacity: 0, duration: 0.3, ease: EXPO_IN }, aOut);
  tl.fromTo(s.kicker, { width: 72, opacity: 1 }, { width: 0, opacity: 0, duration: 0.3, ease: EXPO_IN }, aOut + 0.1);

  tl.fromTo(s.bKickers, { y: 110, track: 0.5 }, { y: 0, track: 0.28, duration: 1, ease: EXPO_OUT, stagger: 0.12 }, bIn);
  tl.fromTo(s.bLeft, { y: 110, track: 0.14 }, { y: 0, track: -0.035, duration: 1.15, ease: EXPO_OUT, stagger: 0.09 }, bIn + 0.08);
  tl.fromTo(s.bRight, { y: 110, track: 0.14 }, { y: 0, track: -0.035, duration: 1.15, ease: EXPO_OUT, stagger: 0.09 }, bIn + 0.26);
  tl.fromTo(s.bNotes, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: EXPO_OUT, stagger: 0.18 }, bIn + 0.7);
  tl.fromTo(s.bRule, { scale: 0 }, { scale: 1, duration: 1.4, ease: EXPO_OUT }, bIn + 0.2);
  tl.fromTo([...s.bKickers, ...s.bLeft, ...s.bRight], { y: 0 }, { y: -110, duration: 0.38, ease: EXPO_IN, stagger: 0.035 }, bOut);
  tl.fromTo(s.bNotes, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: EXPO_IN }, bOut);
  tl.fromTo(s.bRule, { scale: 1 }, { scale: 0, duration: 0.4, ease: EXPO_IN }, bOut);
};

const init = (): State => ({
  kicker: { width: 0, opacity: 0 },
  a: COPY.velocity.a.map(line),
  aBody: { y: 24, opacity: 0 },
  bKickers: [line(), line()].map((l) => ({ ...l, track: 0.5 })),
  bLeft: COPY.velocity.b.left.line.map(line),
  bRight: COPY.velocity.b.right.line.map(line),
  bNotes: [
    { y: 20, opacity: 0 },
    { y: 20, opacity: 0 },
  ],
  bRule: { scale: 0 },
});

const Masked: React.FC<{ s: LineState; children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ s, children, className, style }) => (
  <div className="overflow-hidden" style={{ paddingBottom: '0.06em', marginBottom: '-0.06em' }}>
    <div className={className} style={{ ...style, transform: `translateY(${s.y}%)`, letterSpacing: `${s.track}em`, opacity: s.opacity }}>
      {children}
    </div>
  </div>
);

export const VelocityTypography: React.FC<{ frame: number }> = ({ frame }) => {
  const s = useGsapState(build, init);
  const cycle = Math.max(0, Math.floor((frame - GAIT.firstStrike) / GAIT.period) + 1);
  const headline = 'whitespace-nowrap uppercase text-bone';
  return (
    <div className="absolute inset-0">
      {/* Layout A - bottom-left stack */}
      <div className="absolute bottom-[150px] left-[96px]">
        <div className="mb-6 flex items-center gap-4 text-[13px] font-medium uppercase tracking-[0.24em] text-bone" style={{ fontFamily: FONTS.grotesk, opacity: s.kicker.opacity }}>
          <span className="text-royal">02</span>
          <span className="h-px bg-bone/70" style={{ width: s.kicker.width }} />
          <span>VELOCITY</span>
        </div>
        {COPY.velocity.a.map((text, i) => (
          <Masked key={text} s={s.a[i]} className={headline} style={{ fontFamily: FONTS.syne, fontWeight: 800, fontSize: 156, lineHeight: 0.9 }}>
            {text}
          </Masked>
        ))}
        <div className="mt-8 max-w-[520px] text-[22px] leading-[1.35] text-bone/85" style={{ fontFamily: FONTS.grotesk, transform: `translateY(${s.aBody.y}px)`, opacity: s.aBody.opacity }}>
          {COPY.velocity.aBody}
        </div>
      </div>

      {/* Layout B - diagonal split: front chamber top-left, rear chamber bottom-right */}
      {(['left', 'right'] as const).map((side, k) => {
        const col = COPY.velocity.b[side];
        const lines = side === 'left' ? s.bLeft : s.bRight;
        return (
          <div key={side} className={`absolute ${side === 'left' ? 'left-[96px] top-[120px] text-left' : 'bottom-[120px] right-[96px] text-right'}`}>
            <Masked s={s.bKickers[k]} className="text-[14px] font-medium uppercase text-royal" style={{ fontFamily: FONTS.grotesk }}>
              {col.kicker} CHAMBER
            </Masked>
            <div className="mt-3">
              {col.line.map((text, i) => (
                <Masked key={text} s={lines[i]} className={headline} style={{ fontFamily: FONTS.syne, fontWeight: 800, fontSize: 96, lineHeight: 0.9 }}>
                  {text}
                </Masked>
              ))}
            </div>
            <div className="mt-5 text-[19px] text-bone/80" style={{ fontFamily: FONTS.grotesk, transform: `translateY(${s.bNotes[k].y}px)`, opacity: s.bNotes[k].opacity }}>
              {col.note}
            </div>
          </div>
        );
      })}
      <div className="absolute left-[96px] right-[96px] top-[540px] h-px origin-center bg-bone/25" style={{ transform: `scaleX(${s.bRule.scale})` }} />

      {/* Stride counter */}
      <div className="tabular absolute bottom-[64px] right-[96px] text-right text-[13px] uppercase tracking-[0.14em] text-bone/80" style={{ fontFamily: FONTS.mono, opacity: s.kicker.opacity + s.bNotes[0].opacity > 0 ? 1 : 0 }}>
        STRIDE {String(Math.min(cycle, GAIT.strikes)).padStart(2, '0')}/{String(GAIT.strikes).padStart(2, '0')}
      </div>
    </div>
  );
};
