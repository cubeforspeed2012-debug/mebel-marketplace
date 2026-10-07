// First post pass - the NaN killer. Grazing-angle transmission samples can emit
// non-finite or negative texels; left alone, DOF, blur and bloom smear them into
// black holes. Overflowed highlights clamp to the ceiling, broken texels are rebuilt
// from the mean of their finite 3x3 neighbours, everything is clamped against fireflies, and alpha is forced
// opaque (transmission writes alpha from its own render target).

import { Effect, EffectAttribute } from 'postprocessing';
import { Uniform } from 'three';

const fragment = /* glsl */ `
uniform float uClamp;

// IEEE-754 bit tests - they survive fast-math compilers that legally fold
// isnan()/isinf() to false (ANGLE/SwiftShader do).
//   +Inf: a specular core that overflowed the half-float buffer (> 65504) -> it is
//         simply very bright, so it becomes the firefly ceiling, never black.
//   NaN / negative: genuinely broken -> rebuilt from finite neighbours.
vec3 resolveInf(vec3 c) {
  uvec3 bits = floatBitsToUint(c);
  bvec3 inf = equal(bits & uvec3(0x7fffffffu), uvec3(0x7f800000u));
  return vec3(inf.x ? (c.x > 0.0 ? uClamp : 0.0) : c.x, inf.y ? (c.y > 0.0 ? uClamp : 0.0) : c.y, inf.z ? (c.z > 0.0 ? uClamp : 0.0) : c.z);
}
bool bad(vec3 c) {
  uvec3 bits = floatBitsToUint(c);
  bool nan = any(equal(bits & uvec3(0x7f800000u), uvec3(0x7f800000u)));
  return nan || min(c.r, min(c.g, c.b)) < -1e-4;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = resolveInf(inputColor.rgb);
  if (bad(c)) {
    vec3 sum = vec3(0.0);
    float n = 0.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        if (x == 0 && y == 0) continue;
        vec3 s = resolveInf(texture2D(inputBuffer, uv + vec2(float(x), float(y)) * texelSize).rgb);
        if (!bad(s)) {
          sum += s;
          n += 1.0;
        }
      }
    }
    c = n > 0.0 ? sum / n : vec3(0.0);
  }
  outputColor = vec4(clamp(c, vec3(0.0), vec3(uClamp)), 1.0);
}
`;

export class SanitizeEffect extends Effect {
  constructor(maxRadiance = 48) {
    super('SanitizeEffect', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([['uClamp', new Uniform(maxRadiance)]]),
    });
  }
}
