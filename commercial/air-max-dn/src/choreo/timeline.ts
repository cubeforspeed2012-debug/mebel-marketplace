// Master timeline: 30 s @ 60 fps, cut on a 120 BPM grid (1 beat = 30 frames, an
// eighth = 15 frames). Every cue the picture reacts to is declared here once and
// imported by the comp, the Blender bake and the score generator, so picture,
// physics and sound can never drift apart.

export const FPS = 60;
export const DURATION_IN_FRAMES = 30 * FPS;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const BPM = 120;
export const BEAT = (FPS * 60) / BPM; // 30 frames
export const EIGHTH = BEAT / 2; // 15 frames

export const SCENES = {
  macro: { from: 0, to: 300, label: '00:00-00:05 Macro Impact' },
  explode: { from: 300, to: 780, label: '00:05-00:13 Exploded Deconstruction' },
  velocity: { from: 780, to: 1260, label: '00:13-00:21 Kinetic Street Velocity' },
  peak: { from: 1260, to: 1560, label: '00:21-00:26 Peak Pressure Drop' },
  lockup: { from: 1560, to: 1800, label: '00:26-00:30 Premium Settle & Lockup' },
} as const;

export type SceneId = keyof typeof SCENES;

export const sceneAt = (frame: number): SceneId => {
  if (frame < SCENES.explode.from) return 'macro';
  if (frame < SCENES.velocity.from) return 'explode';
  if (frame < SCENES.peak.from) return 'velocity';
  if (frame < SCENES.lockup.from) return 'peak';
  return 'lockup';
};

export type Cue = { frame: number; strength: number };

/* ---------------------------------------------------------------- 1. Macro */

/** Sub hits = hard cuts. Beats 0, 1.5, 3, 4, 5.5, 7 then an accelerating 8/8.5/9/9.5 stutter. */
export const HOOK_HITS: readonly Cue[] = [
  [0, 1],
  [1.5, 0.82],
  [3, 0.95],
  [4, 0.7],
  [5.5, 0.9],
  [7, 1],
  [8, 0.8],
  [8.5, 0.85],
  [9, 0.9],
  [9.5, 1],
].map(([b, strength]) => ({ frame: Math.round(b * BEAT), strength }));

/** Frame where the "Dn" type matte starts opening into scene 2. */
export const MATTE = { start: 285, end: 336 } as const;

/* -------------------------------------------------------------- 2. Explode */

export const EXPLODE = { start: 330, reassemble: 690, settled: 756 } as const;
export const CALLOUTS = { start: 426, stagger: 42, retract: 672 } as const;
/** Pressure demo pulses fired as the chamber callouts lock on. */
export const CHAMBER_DEMO_HITS: readonly Cue[] = [
  { frame: 444, strength: 0.75 },
  { frame: 486, strength: 0.6 },
];

/* ------------------------------------------------------------- 3. Velocity */

/** Stride cycle: one heel strike every 2 beats, first strike on the downbeat at 810. */
export const GAIT = { enter: 762, firstStrike: 810, period: 2 * BEAT, strikes: 8, exit: 1236 } as const;
export const STRIKES: readonly Cue[] = Array.from({ length: GAIT.strikes }, (_, k) => ({
  frame: GAIT.firstStrike + k * GAIT.period,
  strength: k === 4 ? 1.15 : 1,
}));
/** Forefoot loading arrives ~0.3 of a cycle after each strike (front chamber). */
export const TOE_LOADS: readonly Cue[] = STRIKES.map((s) => ({ frame: s.frame + 19, strength: 0.7 }));
export const VELOCITY_CUTS = [STRIKES[4].frame, STRIKES[6].frame] as const; // 1050, 1170
export const WHIP = { start: 1238, end: 1266 } as const;

/* ----------------------------------------------------------------- 4. Peak */

export const ORBIT = { start: 1260, end: 1500 } as const;
export const PEAK_PULSES: readonly Cue[] = Array.from({ length: 10 }, (_, k) => ({
  frame: SCENES.peak.from + k * BEAT,
  strength: k % 2 === 0 ? 1 : 0.6,
}));
export const STROBE = {
  start: 1380,
  step: EIGHTH,
  words: ['FEEL', 'THE', 'UNREAL', 'FEEL', 'THE', 'UNREAL', 'DYNAMIC', 'AIR', 'DYNAMIC', 'AIR', 'Dn'],
} as const;
export const FLASH_OUT = { start: 1545, peak: 1556, end: 1568 } as const;

/* --------------------------------------------------------------- 5. Lockup */

export const DROP = {
  release: 1574,
  height: 0.3,
  restitution: 0.34,
  /** 0.55x real time: reads as 110 fps overcrank, keeps true-gravity arcs. */
  timeScale: 0.55,
  gravity: 9.81,
  /** Toe-up attitude on release - the shoe lands heel first, then slaps flat. */
  pitch: 7,
} as const;
export const LOCKUP = { start: 1626, cta: 1700, hold: 1770 } as const;

/** Every cue in time order, labelled - drives the score and the Studio timeline markers. */
export const CUE_SHEET = (): { frame: number; label: string }[] =>
  [
    ...HOOK_HITS.map((c, i) => ({ frame: c.frame, label: `hook hit ${i + 1}` })),
    { frame: MATTE.start, label: 'type matte' },
    { frame: EXPLODE.start, label: 'explode' },
    { frame: CALLOUTS.start, label: 'callouts' },
    { frame: EXPLODE.reassemble, label: 'reassemble' },
    ...STRIKES.map((c, i) => ({ frame: c.frame, label: `strike ${i + 1}` })),
    { frame: WHIP.start, label: 'whip' },
    { frame: ORBIT.start, label: 'orbit' },
    { frame: STROBE.start, label: 'strobe' },
    { frame: FLASH_OUT.start, label: 'flash out' },
    { frame: DROP.release, label: 'drop' },
    { frame: LOCKUP.start, label: 'lockup' },
  ].sort((a, b) => a.frame - b.frame);
