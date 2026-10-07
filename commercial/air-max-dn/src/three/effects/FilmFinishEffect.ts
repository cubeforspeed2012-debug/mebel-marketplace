// Final display-referred finish: grade, optical vignette, deterministic film grain
// (seeded by the frame number, so every render worker agrees), matte black lift
// to #080808, and the white-out used on the scene-4 -> 5 cut.

import { Effect } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

const fragment = /* glsl */ `
uniform float uFrame;
uniform float uGrain;
uniform float uVignette;
uniform float uFlash;
uniform float uMatte;
uniform vec2 uResolution;
uniform float uSaturation;
uniform float uContrast;

// Integer-domain hash (PCG-style) - stable across GPUs, unlike sin() hashes.
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float rand(vec2 p, float seed) {
  uvec2 q = uvec2(p);
  return float(pcg(q.x + pcg(q.y + pcg(uint(seed))))) / 4294967295.0;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;

  // Grade (display-referred, after AgX): AgX rolls saturated blues toward pastel;
  // restore chroma, add a gentle filmic S-curve, cool the shadows, warm the highlights.
  float y0 = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(mix(vec3(y0), c, uSaturation), vec3(0.0));
  vec3 enc = pow(c, vec3(1.0 / 2.2));
  enc = mix(enc, enc * enc * (3.0 - 2.0 * enc), uContrast);
  c = pow(max(enc, vec3(0.0)), vec3(2.2));
  float tone = smoothstep(0.0, 0.6, y0);
  c *= mix(vec3(0.95, 0.98, 1.07), vec3(1.035, 1.0, 0.965), tone);

  // cos^4 natural vignetting, aspect-correct.
  vec2 d = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float r2 = dot(d, d);
  float cos4 = pow(1.0 / (1.0 + r2 * 1.35), 2.0);
  c *= mix(1.0, cos4, uVignette);

  // Luminance-weighted grain: strongest in the mids, gentle in deep shadow.
  vec2 px = uv * uResolution;
  float g = (rand(px, uFrame) + rand(px + 17.0, uFrame + 1.0)) - 1.0;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float response = smoothstep(0.0, 0.18, lum) * (1.0 - smoothstep(0.6, 1.0, lum)) * 0.85 + 0.15;
  c += g * uGrain * response * 0.12;

  // Deep matte: lift the floor to sRGB #080808 (linear 0.002428).
  c = mix(c, max(c, vec3(0.002428)), uMatte);

  c = mix(c, vec3(1.0), uFlash);
  outputColor = vec4(max(c, vec3(0.0)), inputColor.a);
}
`;

export class FilmFinishEffect extends Effect {
  constructor() {
    super('FilmFinishEffect', fragment, {
      uniforms: new Map<string, Uniform>([
        ['uFrame', new Uniform(0)],
        ['uGrain', new Uniform(0.05)],
        ['uVignette', new Uniform(0.45)],
        ['uFlash', new Uniform(0)],
        ['uMatte', new Uniform(0)],
        ['uResolution', new Uniform(new Vector2(1920, 1080))],
        ['uSaturation', new Uniform(1.14)],
        ['uContrast', new Uniform(0.18)],
      ]),
    });
  }

  set(values: { frame: number; grain: number; vignette: number; flash: number; matte: number; width: number; height: number }) {
    const u = this.uniforms;
    u.get('uFrame')!.value = values.frame;
    u.get('uGrain')!.value = values.grain;
    u.get('uVignette')!.value = values.vignette;
    u.get('uFlash')!.value = values.flash;
    u.get('uMatte')!.value = values.matte;
    (u.get('uResolution')!.value as Vector2).set(values.width, values.height);
  }
}
