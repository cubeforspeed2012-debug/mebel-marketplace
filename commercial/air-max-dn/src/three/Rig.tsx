// Camera + three-point lights, driven from the frame's CameraState/LightingState.
// Everything is applied in layout effects: they run before @remotion/three
// advances the R3F loop for the frame, so the rendered image is never stale.

import { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Color, Object3D, type PerspectiveCamera, type SpotLight } from 'three';
import type { CameraState } from '../choreo/camera.ts';
import type { LightingState, SpotState } from '../choreo/lighting.ts';
import { applyCameraState } from '../choreo/project.ts';

export const CameraRig: React.FC<{ state: CameraState }> = ({ state }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    applyCameraState(camera, state, size.width / size.height);
  }, [camera, state, size.width, size.height]);
  return null;
};

const Spot: React.FC<{ s: SpotState; shadows?: boolean }> = ({ s, shadows }) => {
  const target = useMemo(() => new Object3D(), []);
  const colour = useMemo(() => new Color(), []);
  colour.set(s.color);
  return (
    <>
      <primitive object={target} position={s.target} />
      <spotLight
        position={s.position}
        target={target}
        intensity={s.intensity}
        color={colour}
        angle={s.angle}
        penumbra={s.penumbra}
        decay={2}
        distance={0}
        visible={s.intensity > 0.001}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00035}
        shadow-normalBias={0.0012}
        shadow-radius={5}
        shadow-camera-near={0.05}
        shadow-camera-far={6}
        ref={(l: SpotLight | null) => {
          if (l) l.shadow.camera.updateProjectionMatrix();
        }}
      />
    </>
  );
};

export const Lights: React.FC<{ lighting: LightingState }> = ({ lighting }) => (
  <>
    <Spot s={lighting.key} shadows />
    <Spot s={lighting.rim} />
    <Spot s={lighting.accent} shadows />
  </>
);
