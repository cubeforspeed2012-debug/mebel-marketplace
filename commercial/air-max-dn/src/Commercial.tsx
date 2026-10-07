// Nike Air Max Dn - Dynamic Air Edition. 30 s @ 60 fps.
//
// One frame = one pure evaluation: camera, lighting and FX are solved from the
// frame number, handed to the WebGL stage and to every 2D layer, so 3D and
// typography can never disagree about where anything is.

import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { cameraAt } from './choreo/camera.ts';
import { fxAt } from './choreo/fx.ts';
import { lightingAt } from './choreo/lighting.ts';
import { EXPLODE, FLASH_OUT, MATTE, SCENES } from './choreo/timeline.ts';
import { Stage } from './three/Stage.tsx';
import { DesignSpace } from './overlays/DesignSpace.tsx';
import { HookTypography } from './overlays/HookTypography.tsx';
import { TypeMatte } from './overlays/TypeMatte.tsx';
import { Callouts } from './overlays/Callouts.tsx';
import { VelocityTypography } from './overlays/VelocityTypography.tsx';
import { StrobeTypography } from './overlays/StrobeTypography.tsx';
import { Lockup } from './overlays/Lockup.tsx';
import { SafeAreas } from './overlays/SafeAreas.tsx';
import type { CommercialProps } from './schema.ts';
import './lib/fonts.ts';

export const Commercial: React.FC<CommercialProps> = (props) => {
  const frame = useCurrentFrame();
  const camera = cameraAt(frame);
  const lighting = lightingAt(frame, camera);
  const fx = fxAt(frame, camera, props.grain);

  return (
    <AbsoluteFill className="bg-ink">
      <Stage frame={frame} camera={camera} lighting={lighting} fx={fx} colorway={props.colorway} plate={props.plate} plateFormat={props.plateFormat} />
      <DesignSpace>
        <Sequence name="1 - Hook type" durationInFrames={MATTE.start} layout="none">
          <HookTypography frame={frame} camera={camera} />
        </Sequence>
        <Sequence name="1>2 - Dn matte" from={MATTE.start} durationInFrames={MATTE.end - MATTE.start} layout="none">
          <TypeMatte frame={frame} />
        </Sequence>
        <Sequence name="2 - Callouts" from={MATTE.end} durationInFrames={EXPLODE.settled - MATTE.end + 10} layout="none">
          <Callouts frame={frame} camera={camera} />
        </Sequence>
        <Sequence name="3 - Velocity type (GSAP)" from={SCENES.velocity.from} durationInFrames={SCENES.velocity.to - SCENES.velocity.from} layout="none">
          <VelocityTypography frame={frame} />
        </Sequence>
        <Sequence name="4 - Strobe type" from={SCENES.peak.from} durationInFrames={FLASH_OUT.start - SCENES.peak.from} layout="none">
          <StrobeTypography frame={frame} />
        </Sequence>
        <Sequence name="5 - Lockup" from={SCENES.lockup.from} layout="none">
          <Lockup frame={frame} releaseLine={props.releaseLine} ctaLine={props.ctaLine} />
        </Sequence>
        {props.showSafeAreas && <SafeAreas />}
      </DesignSpace>
      {props.audio && <Html5Audio src={staticFile('audio/score.wav')} />}
    </AbsoluteFill>
  );
};

