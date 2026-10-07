// Physically-plausible bloom, Jimenez 2014 ("Next Generation Post Processing in
// Call of Duty"): 13-tap downsample pyramid with a Karis-average prefilter (no
// fireflies), soft-knee threshold, 3x3 tent upsample accumulated back up the
// chain. Every texture read is finiteness-checked, so one bad texel can never
// turn into a block of black - the failure mode of stock bloom on software GL.

import { AddEquation, CustomBlending, HalfFloatType, LinearFilter, NoBlending, OneFactor, ShaderMaterial, Uniform, Vector2, WebGLRenderTarget, type Texture, type WebGLRenderer } from 'three';
import { BlendFunction, Effect, Pass } from 'postprocessing';

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const common = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
varying vec2 vUv;
bool nonFinite(vec3 c) {
  uvec3 e = floatBitsToUint(c) & uvec3(0x7f800000u);
  return any(equal(e, uvec3(0x7f800000u)));
}
vec3 S(vec2 uv) {
  vec3 c = texture2D(tSrc, uv).rgb;
  return nonFinite(c) ? vec3(0.0) : clamp(c, vec3(0.0), vec3(64.0));
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

const downsample = /* glsl */ `
${common}
uniform float uPrefilter;
uniform float uThreshold;
uniform float uKnee;

vec3 softThreshold(vec3 c) {
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  return c * max(soft, br - uThreshold) / max(br, 1e-4);
}

void main() {
  vec2 t = uTexel;
  vec3 a = S(vUv + t * vec2(-2.0, 2.0));
  vec3 b = S(vUv + t * vec2(0.0, 2.0));
  vec3 c = S(vUv + t * vec2(2.0, 2.0));
  vec3 d = S(vUv + t * vec2(-2.0, 0.0));
  vec3 e = S(vUv);
  vec3 f = S(vUv + t * vec2(2.0, 0.0));
  vec3 g = S(vUv + t * vec2(-2.0, -2.0));
  vec3 h = S(vUv + t * vec2(0.0, -2.0));
  vec3 i = S(vUv + t * vec2(2.0, -2.0));
  vec3 j = S(vUv + t * vec2(-1.0, 1.0));
  vec3 k = S(vUv + t * vec2(1.0, 1.0));
  vec3 l = S(vUv + t * vec2(-1.0, -1.0));
  vec3 m = S(vUv + t * vec2(1.0, -1.0));
  vec3 col;
  if (uPrefilter > 0.5) {
    vec3 g0 = (a + b + d + e) * 0.25;
    vec3 g1 = (b + c + e + f) * 0.25;
    vec3 g2 = (d + e + g + h) * 0.25;
    vec3 g3 = (e + f + h + i) * 0.25;
    vec3 g4 = (j + k + l + m) * 0.25;
    float w0 = 0.125 / (1.0 + luma(g0));
    float w1 = 0.125 / (1.0 + luma(g1));
    float w2 = 0.125 / (1.0 + luma(g2));
    float w3 = 0.125 / (1.0 + luma(g3));
    float w4 = 0.5 / (1.0 + luma(g4));
    col = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
    col = softThreshold(col);
  } else {
    col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

const upsample = /* glsl */ `
${common}
uniform float uRadius;
void main() {
  vec4 d = uTexel.xyxy * vec4(1.0, 1.0, -1.0, 0.0) * uRadius;
  vec3 s = S(vUv - d.xy);
  s += S(vUv - d.wy) * 2.0;
  s += S(vUv - d.zy);
  s += S(vUv + d.zw) * 2.0;
  s += S(vUv) * 4.0;
  s += S(vUv + d.xw) * 2.0;
  s += S(vUv + d.zy);
  s += S(vUv + d.wy) * 2.0;
  s += S(vUv + d.xy);
  gl_FragColor = vec4(s / 16.0, 1.0);
}
`;

export class DualBloomPass extends Pass {
  readonly levels: number;
  threshold = 0.82;
  knee = 0.35;
  radius = 0.85;
  private targets: WebGLRenderTarget[] = [];
  private down: ShaderMaterial;
  private up: ShaderMaterial;

  constructor(levels = 6) {
    super('DualBloomPass');
    this.levels = levels;
    this.needsSwap = false;
    const uniforms = () => ({ tSrc: new Uniform<Texture | null>(null), uTexel: new Uniform(new Vector2()) });
    this.down = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: downsample,
      uniforms: { ...uniforms(), uPrefilter: new Uniform(0), uThreshold: new Uniform(0.82), uKnee: new Uniform(0.35) },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    });
    this.up = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: upsample,
      uniforms: { ...uniforms(), uRadius: new Uniform(0.85) },
      // Pure ONE/ONE accumulation onto the next-larger level.
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      depthTest: false,
      depthWrite: false,
    });
  }

  /** Half-resolution bloom result (top of the accumulated pyramid). */
  get texture(): Texture | null {
    return this.targets[0]?.texture ?? null;
  }

  setSize(width: number, height: number) {
    for (const t of this.targets) t.dispose();
    this.targets = [];
    let w = Math.max(1, Math.floor(width / 2));
    let h = Math.max(1, Math.floor(height / 2));
    for (let i = 0; i < this.levels; i++) {
      const rt = new WebGLRenderTarget(w, h, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false, generateMipmaps: false });
      rt.texture.name = `DualBloom.level${i}`;
      this.targets.push(rt);
      w = Math.max(1, Math.floor(w / 2));
      h = Math.max(1, Math.floor(h / 2));
    }
  }

  render(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget) {
    if (this.targets.length === 0) this.setSize(inputBuffer.width, inputBuffer.height);
    const du = this.down.uniforms;
    du.uThreshold.value = this.threshold;
    du.uKnee.value = this.knee;
    let src: Texture = inputBuffer.texture;
    let srcW = inputBuffer.width;
    let srcH = inputBuffer.height;
    this.fullscreenMaterial = this.down;
    for (let i = 0; i < this.targets.length; i++) {
      du.tSrc.value = src;
      (du.uTexel.value as Vector2).set(1 / srcW, 1 / srcH);
      du.uPrefilter.value = i === 0 ? 1 : 0;
      renderer.setRenderTarget(this.targets[i]);
      renderer.render(this.scene, this.camera);
      src = this.targets[i].texture;
      srcW = this.targets[i].width;
      srcH = this.targets[i].height;
    }
    const uu = this.up.uniforms;
    uu.uRadius.value = this.radius;
    this.fullscreenMaterial = this.up;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    for (let i = this.targets.length - 1; i > 0; i--) {
      uu.tSrc.value = this.targets[i].texture;
      (uu.uTexel.value as Vector2).set(1 / this.targets[i].width, 1 / this.targets[i].height);
      renderer.setRenderTarget(this.targets[i - 1]);
      renderer.render(this.scene, this.camera);
    }
    renderer.autoClear = autoClear;
  }

  dispose() {
    for (const t of this.targets) t.dispose();
    this.down.dispose();
    this.up.dispose();
    super.dispose();
  }
}

/** Adds the bloom pyramid back onto the frame (pre-tonemap, so it rolls off through AgX). */
export class BloomCompositeEffect extends Effect {
  constructor() {
    super(
      'BloomCompositeEffect',
      /* glsl */ `
      uniform sampler2D uBloom;
      uniform float uIntensity;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 b = texture2D(uBloom, uv).rgb;
        uvec3 e = floatBitsToUint(b) & uvec3(0x7f800000u);
        if (any(equal(e, uvec3(0x7f800000u)))) b = vec3(0.0);
        outputColor = vec4(inputColor.rgb + max(b, vec3(0.0)) * uIntensity, inputColor.a);
      }
    `,
      {
        blendFunction: BlendFunction.SRC,
        uniforms: new Map<string, Uniform>([
          ['uBloom', new Uniform(null)],
          ['uIntensity', new Uniform(0.4)],
        ]),
      },
    );
  }

  set(texture: Texture | null, intensity: number) {
    this.uniforms.get('uBloom')!.value = texture;
    this.uniforms.get('uIntensity')!.value = intensity;
  }
}
