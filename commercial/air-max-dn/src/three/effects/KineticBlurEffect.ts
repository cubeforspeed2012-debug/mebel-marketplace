// Directional motion blur + pre-tonemap exposure, as one convolution pass.
// 24 taps along a screen-space vector with a triangular weight - reads like a
// real 180-degree shutter smear rather than a box ghost.

import { Effect, EffectAttribute } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

const fragment = /* glsl */ `
uniform vec2 uDirection;
uniform float uExposure;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (dot(uDirection, uDirection) < 1e-10) {
    outputColor = vec4(inputColor.rgb * uExposure, inputColor.a);
    return;
  }
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 24; i++) {
    float t = float(i) / 23.0 - 0.5;
    float w = 1.0 - abs(t) * 1.6;
    acc += texture2D(inputBuffer, uv + uDirection * t).rgb * w;
    wsum += w;
  }
  outputColor = vec4(acc / wsum * uExposure, inputColor.a);
}
`;

export class KineticBlurEffect extends Effect {
  constructor() {
    super('KineticBlurEffect', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uDirection', new Uniform(new Vector2(0, 0))],
        ['uExposure', new Uniform(1)],
      ]),
    });
  }

  /** length in UV units (fraction of frame width), angle in radians, aspect = width / height. */
  set(length: number, angle: number, exposure: number, aspect: number) {
    (this.uniforms.get('uDirection')!.value as Vector2).set(Math.cos(angle) * length, (Math.sin(angle) * length) * aspect);
    this.uniforms.get('uExposure')!.value = exposure;
  }
}
