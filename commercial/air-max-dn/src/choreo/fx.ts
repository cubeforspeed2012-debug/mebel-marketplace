// Post-processing cue sheet. Every lens/film artefact is motivated: blur and
// chromatic aberration scale with real camera angular speed, bloom bursts ride
// the sub hits, exposure "hit frames" punch on impacts. Nothing wobbles on a loop.

import { cameraAngularSpeed, cameraPanDirection, type CameraState } from './camera.ts';
import { DROP_IMPACTS } from './physics.ts';
import { FLASH_OUT, FPS, HOOK_HITS, MATTE, ORBIT, PEAK_PULSES, SCENES, STRIKES, STROBE, WHIP } from './timeline.ts';
import { clamp, invLerp, lerp, smoothstep } from './math.ts';

export type FxState = {
  /** Linear exposure multiplier applied pre-tonemap. */
  exposure: number;
  bloom: number;
  bloomThreshold: number;
  /** Chromatic aberration offset in UV units at the frame edge. */
  ca: number;
  /** Directional blur length in UV units, and its screen-space angle (radians). */
  blur: number;
  blurAngle: number;
  grain: number;
  /** 0..1 white-out, post tonemap. */
  flash: number;
  vignette: number;
  /** 0..1 lift of the black floor to #080808 (deep matte, never crushed). */
  matte: number;
  /** Bokeh radius scale for the depth-of-field pass. */
  bokeh: number;
};

const envelope = (frame: number, cues: readonly { frame: number; strength: number }[], decaySeconds: number): number => {
  let v = 0;
  for (const c of cues) {
    const t = (frame - c.frame) / FPS;
    if (t >= 0 && t < decaySeconds * 7) v = Math.max(v, c.strength * Math.exp(-t / decaySeconds));
  }
  return v;
};

/** 1 on the exact frame of a cue, 0.35 on the next - a two-frame exposure punch. */
const hitFrame = (frame: number, cues: readonly { frame: number; strength: number }[]): number => {
  for (const c of cues) {
    const d = frame - Math.round(c.frame);
    if (d === 0) return c.strength;
    if (d === 1) return 0.35 * c.strength;
  }
  return 0;
};

const STROBE_CUES = STROBE.words.map((_, i) => ({ frame: STROBE.start + i * STROBE.step, strength: 1 }));

export const fxAt = (frame: number, cam: CameraState, grainAmount: number): FxState => {
  const angular = cameraAngularSpeed(frame); // deg / frame
  const pan = cameraPanDirection(frame);

  const fx: FxState = {
    exposure: 1,
    bloom: 0.35,
    bloomThreshold: 0.82,
    ca: 0.0006,
    blur: 0,
    blurAngle: 0,
    grain: 0.05 * grainAmount,
    flash: 0,
    vignette: 0.45,
    matte: 0,
    bokeh: 1.5,
  };

  // Motion-derived lens response (all scenes): ~1.1% of frame width per 10 deg/frame.
  fx.blur = clamp(angular * 0.0011, 0, 0.03);
  fx.blurAngle = pan > 0 ? 0 : Math.PI;
  fx.ca += clamp(angular * 0.00045, 0, 0.012);

  if (frame < SCENES.explode.from) {
    const hit = envelope(frame, HOOK_HITS, 0.11);
    fx.bloom = 0.4 + 0.9 * hit;
    fx.ca += 0.0035 * hit;
    fx.exposure = 1 + 0.55 * hitFrame(frame, HOOK_HITS);
    fx.bokeh = cam.focal > 60 ? 3.4 : 2;
    fx.vignette = 0.55;
  } else if (frame < SCENES.velocity.from) {
    const matteTail = 1 - smoothstep(MATTE.start, MATTE.end, frame);
    fx.bloom = 0.32 + 0.4 * matteTail;
    fx.bokeh = 1.4;
  } else if (frame < SCENES.peak.from) {
    const strike = envelope(frame, STRIKES, 0.09);
    fx.bloom = 0.32 + 0.35 * strike;
    fx.ca += 0.0022 * strike;
    fx.exposure = 1 + 0.25 * hitFrame(frame, STRIKES);
    // Stylised velocity smear on the background travel, kept off the hero by the DOF.
    fx.blur = Math.max(fx.blur, 0.0025);
    fx.blurAngle = Math.PI;
    fx.bokeh = 2;
    if (frame >= WHIP.start) fx.blur = Math.max(fx.blur, 0.018 * Math.sin(Math.PI * invLerp(WHIP.start, WHIP.end, frame)));
  } else if (frame < SCENES.lockup.from) {
    const pulse = envelope(frame, PEAK_PULSES, 0.08);
    fx.bloom = 0.45 + 1.1 * pulse;
    fx.bloomThreshold = 0.7;
    fx.ca += 0.003 * pulse;
    const strobe = hitFrame(frame, STROBE_CUES);
    fx.exposure = 1 + 0.6 * strobe;
    fx.bokeh = 1.2;
    fx.vignette = 0.55;
    const flashIn = smoothstep(FLASH_OUT.start, FLASH_OUT.peak, frame);
    fx.flash = flashIn;
    if (frame < ORBIT.start + 6) fx.blur = Math.max(fx.blur, 0.012);
  } else {
    const flashOut = 1 - smoothstep(SCENES.lockup.from, FLASH_OUT.end, frame);
    fx.flash = flashOut;
    const impact = DROP_IMPACTS.length ? envelope(frame, [{ frame: DROP_IMPACTS[0].frame, strength: 1 }], 0.1) : 0;
    fx.bloom = 0.22 + 0.25 * impact;
    fx.ca = 0.0003 + 0.0012 * impact;
    fx.grain = 0.025 * grainAmount;
    fx.vignette = 0.3;
    fx.matte = 1;
    fx.bokeh = 1.5;
    fx.exposure = lerp(0.6, 1, smoothstep(SCENES.lockup.from, SCENES.lockup.from + 30, frame));
  }

  return fx;
};
