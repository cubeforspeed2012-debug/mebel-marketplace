// The single WebGL layer for all 30 seconds. One canvas, one continuous world:
// cuts are camera cuts, not context switches, which is what keeps the 3D-to-2D
// hand-offs seamless and the render memory flat.

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { staticFile, useDelayRender, useVideoConfig } from 'remotion';
import { HalfFloatType, LinearSRGBColorSpace, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import type { CameraState } from '../choreo/camera.ts';
import type { FxState } from '../choreo/fx.ts';
import type { LightingState } from '../choreo/lighting.ts';
import { FAR, NEAR } from '../choreo/project.ts';
import { createMaterials, type Colorway } from './materials.ts';
import { Floors } from './Floors.tsx';
import { PostFX } from './PostFX.tsx';
import { CameraRig, Lights } from './Rig.tsx';
import { Sneaker } from './Sneaker.tsx';
import { SpeedField } from './SpeedField.tsx';
import { StudioEnvironment } from './StudioEnvironment.tsx';

export type PlateMode = 'three' | 'blender';
export type PlateFormat = 'exr' | 'png';

export type StageProps = {
  frame: number;
  camera: CameraState;
  lighting: LightingState;
  fx: FxState;
  colorway: Colorway;
  plate: PlateMode;
  plateFormat: PlateFormat;
};

/** Frame-accurate Blender plate: blocks the render until the frame's EXR/PNG is decoded and drawn. */
const useBlenderPlate = (enabled: boolean, frame: number, format: PlateFormat) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const advance = useThree((s) => s.advance);
  const [plate, setPlate] = useState<{ texture: Texture; premultiplied: boolean; frame: number } | null>(null);
  const pending = useRef<number | null>(null);

  const src = enabled ? staticFile(`renders/${format === 'exr' ? 'beauty' : 'png'}/frame_${String(frame).padStart(4, '0')}.${format}`) : null;

  useLayoutEffect(() => {
    if (!src) return;
    const handle = delayRender(`Loading Blender plate ${src}`);
    let settled = false;
    let cancelled = false;
    const loader = format === 'exr' ? new EXRLoader().setDataType(HalfFloatType) : new TextureLoader();
    loader
      .loadAsync(src)
      .then((texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        texture.colorSpace = format === 'exr' ? LinearSRGBColorSpace : SRGBColorSpace;
        texture.flipY = format !== 'exr';
        texture.needsUpdate = true;
        settled = true;
        pending.current = handle;
        // Cycles writes premultiplied EXR; PNG is straight alpha.
        setPlate((prev) => {
          prev?.texture.dispose();
          return { texture, premultiplied: format === 'exr', frame };
        });
      })
      .catch((err: unknown) => {
        cancelRender(new Error(`Blender plate missing or unreadable: ${src}. Render it with blender/render_assets.py (see README). ${String(err)}`));
      });
    return () => {
      cancelled = true;
      if (!settled) continueRender(handle);
    };
  }, [src, format, frame, delayRender, continueRender, cancelRender]);

  useLayoutEffect(() => {
    if (!plate || pending.current === null) return;
    // PostFX (a child) has already picked the texture up in its own layout effect.
    advance(performance.now());
    continueRender(pending.current);
    pending.current = null;
  }, [plate, advance, continueRender]);

  return enabled && plate ? plate : null;
};

const World: React.FC<StageProps & { width: number; height: number }> = (p) => {
  // Props objects are not referentially stable across frames - key on content.
  const colorwayKey = JSON.stringify(p.colorway);
  const mats = useMemo(() => createMaterials(JSON.parse(colorwayKey) as Colorway), [colorwayKey]);
  useLayoutEffect(
    () => () => {
      for (const m of [mats.upper, mats.overlay, mats.tongue, mats.collar, mats.laces, mats.midsole, mats.outsole, mats.air, mats.carbon, mats.concrete]) m.dispose();
    },
    [mats],
  );
  const plate = useBlenderPlate(p.plate === 'blender', p.frame, p.plateFormat);
  const cyc = 1 - p.lighting.floor.shadow;
  return (
    <>
      <color attach="background" args={['#000000']} />
      <CameraRig state={p.camera} />
      <StudioEnvironment envIntensity={p.lighting.env} practicals={p.lighting.practicals} cyclorama={cyc} />
      <Lights lighting={p.lighting} />
      <Floors frame={p.frame} lighting={p.lighting} mats={mats} contactShadow={p.plate !== 'blender'} />
      <SpeedField frame={p.frame} wall={p.lighting.depthWall} streaks={p.lighting.speedLines} />
      <Sneaker frame={p.frame} mats={mats} colorway={p.colorway} highlight={p.lighting.highlight} hidden={p.plate === 'blender'} />
      <PostFX frame={p.frame} camera={p.camera} fx={p.fx} width={p.width} height={p.height} plate={plate} />
    </>
  );
};

export const Stage: React.FC<StageProps> = (props) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      flat
      shadows="percentage"
      gl={{ antialias: false, alpha: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      camera={{ fov: 20, near: NEAR, far: FAR, position: [0, 0.1, 1] }}
    >
      <World {...props} width={width} height={height} />
    </ThreeCanvas>
  );
};
