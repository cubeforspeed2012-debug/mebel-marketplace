import { Composition, Folder } from 'remotion';
import './styles.css';
import { Commercial } from './Commercial.tsx';
import { commercialSchema, type CommercialProps } from './schema.ts';
import { DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from './choreo/timeline.ts';
import { ROYAL_COLORWAY } from './three/materials.ts';
import { COPY } from './copy.ts';

const defaultProps: CommercialProps = {
  plate: 'three',
  plateFormat: 'exr',
  colorway: ROYAL_COLORWAY,
  releaseLine: COPY.lockup.release,
  ctaLine: COPY.lockup.cta,
  grain: 1,
  audio: true,
  showSafeAreas: false,
};

export const RemotionRoot: React.FC = () => (
  <Folder name="Nike-Air-Max-Dn">
    <Composition
      id="AirMaxDn"
      component={Commercial}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      schema={commercialSchema}
      defaultProps={defaultProps}
    />
    {/* UHD master: overlays are authored in a 1920x1080 design space and scale up; WebGL renders native 4K. */}
    <Composition
      id="AirMaxDn-UHD"
      component={Commercial}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={3840}
      height={2160}
      schema={commercialSchema}
      defaultProps={defaultProps}
    />
  </Folder>
);
