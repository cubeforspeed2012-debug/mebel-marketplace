// Post chain, built imperatively on `postprocessing` so it exists on the very
// first rendered frame (Remotion may start a worker at any frame):
//
//   Render -> NaN/firefly sanitize -> DOF (CoC from camera focus/depth) -> [Blender plate composite]
//          -> kinetic blur + exposure -> dual-filter bloom -> chromatic aberration
//          -> AgX tone map + film finish (vignette, grain, matte, flash)

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BlendFunction,
  ChromaticAberrationEffect,
  DepthOfFieldEffect,
  Effect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { HalfFloatType, Uniform, Vector2, type Texture } from 'three';
import type { CameraState } from '../choreo/camera.ts';
import type { FxState } from '../choreo/fx.ts';
import { FilmFinishEffect } from './effects/FilmFinishEffect.ts';
import { KineticBlurEffect } from './effects/KineticBlurEffect.ts';
import { SanitizeEffect } from './effects/SanitizeEffect.ts';
import { BloomCompositeEffect, DualBloomPass } from './effects/DualBloom.ts';

/** Composites a path-traced Blender plate over the (already defocused) realtime set. */
class PlateCompositeEffect extends Effect {
  constructor() {
    super(
      'PlateCompositeEffect',
      /* glsl */ `
      uniform sampler2D uPlate;
      uniform float uEnabled;
      uniform float uPremultiplied;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 p = texture2D(uPlate, uv);
        vec3 rgb = mix(p.rgb * p.a, p.rgb, uPremultiplied);
        outputColor = vec4(mix(inputColor.rgb, rgb + inputColor.rgb * (1.0 - p.a), uEnabled), inputColor.a);
      }
    `,
      {
        blendFunction: BlendFunction.SRC,
        uniforms: new Map<string, Uniform>([
          ['uPlate', new Uniform(null)],
          ['uEnabled', new Uniform(0)],
          ['uPremultiplied', new Uniform(1)],
        ]),
      },
    );
  }
}

export type PostFXProps = {
  frame: number;
  camera: CameraState;
  fx: FxState;
  width: number;
  height: number;
  plate: { texture: Texture; premultiplied: boolean } | null;
};

export const PostFX: React.FC<PostFXProps> = (props) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  });

  const chain = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType, multisampling: 4 });
    const dof = new DepthOfFieldEffect(camera, { worldFocusDistance: 0.5, worldFocusRange: 0.3, bokehScale: 2, resolutionScale: 0.75 });
    const plate = new PlateCompositeEffect();
    const blur = new KineticBlurEffect();
    const bloomPass = new DualBloomPass(6);
    const bloom = new BloomCompositeEffect();
    const ca = new ChromaticAberrationEffect({ offset: new Vector2(), radialModulation: true, modulationOffset: 0.2 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    const finish = new FilmFinishEffect();
    const platePass = new EffectPass(camera, plate);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new EffectPass(camera, new SanitizeEffect()));
    composer.addPass(new EffectPass(camera, dof));
    composer.addPass(platePass);
    composer.addPass(new EffectPass(camera, blur));
    composer.addPass(bloomPass);
    composer.addPass(new EffectPass(camera, bloom));
    composer.addPass(new EffectPass(camera, ca));
    composer.addPass(new EffectPass(camera, tone, finish));
    return { composer, dof, plate, platePass, blur, bloomPass, bloom, ca, finish };
  }, [gl, scene, camera]);

  useLayoutEffect(() => {
    chain.composer.setSize(props.width, props.height, false);
  }, [chain, props.width, props.height]);
  useLayoutEffect(() => () => chain.composer.dispose(), [chain]);

  useFrame(() => {
    const p = latest.current;
    const { fx } = p;
    chain.dof.cocMaterial.worldFocusDistance = p.camera.focus;
    chain.dof.cocMaterial.worldFocusRange = p.camera.depth;
    chain.dof.bokehScale = fx.bokeh;
    chain.platePass.enabled = p.plate !== null;
    if (p.plate) {
      chain.plate.uniforms.get('uPlate')!.value = p.plate.texture;
      chain.plate.uniforms.get('uEnabled')!.value = 1;
      chain.plate.uniforms.get('uPremultiplied')!.value = p.plate.premultiplied ? 1 : 0;
    }
    chain.blur.set(fx.blur, fx.blurAngle, fx.exposure, p.width / p.height);
    chain.bloomPass.threshold = fx.bloomThreshold;
    // The pyramid accumulates one copy per level; normalise so fx.bloom reads as energy fraction.
    chain.bloom.set(chain.bloomPass.texture, fx.bloom / chain.bloomPass.levels);
    // Lateral CA follows the motion vector on kinetic shots; radial modulation keeps the centre clean.
    chain.ca.offset.set(Math.cos(fx.blurAngle) * fx.ca, fx.ca * 0.45);
    chain.finish.set({ frame: p.frame, grain: fx.grain, vignette: fx.vignette, flash: fx.flash, matte: fx.matte, width: p.width, height: p.height });
    chain.composer.render();
  }, 1);

  return null;
};
