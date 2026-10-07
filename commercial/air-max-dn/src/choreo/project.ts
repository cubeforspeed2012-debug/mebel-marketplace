// The 3D -> 2D bridge. The WebGL camera and the SVG/HTML overlays are both built
// from cameraAt(frame), so a callout line drawn here lands on the exact texel the
// renderer shaded - no read-back, no one-frame lag, identical in Blender-plate mode.

import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { CameraState } from './camera.ts';
import type { Vec3 } from './math.ts';

export const FILM_GAUGE_MM = 36;
export const NEAR = 0.004;
export const FAR = 60;

/** Configures any PerspectiveCamera from a CameraState (used by the R3F rig and by projection). */
export const applyCameraState = (cam: PerspectiveCamera, state: CameraState, aspect: number): PerspectiveCamera => {
  cam.aspect = aspect;
  cam.near = NEAR;
  cam.far = FAR;
  cam.filmGauge = FILM_GAUGE_MM;
  cam.setFocalLength(state.focal);
  cam.position.set(...state.position);
  const forward = new Vector3(...state.target).sub(cam.position).normalize();
  const up = new Vector3(0, 1, 0).applyAxisAngle(forward, -state.roll);
  cam.up.copy(up);
  cam.lookAt(...state.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return cam;
};

/** Vertical field of view in degrees for a focal length on the 36 mm gauge. */
export const verticalFov = (focalMm: number, aspect: number): number => {
  const filmHeight = FILM_GAUGE_MM / Math.max(aspect, 1);
  return 2 * MathUtils.RAD2DEG * Math.atan(filmHeight / 2 / focalMm);
};

const scratch = new PerspectiveCamera();
const v = new Vector3();

export type ScreenPoint = { x: number; y: number; depth: number; visible: boolean };

/** World point -> pixel coordinates in a width x height design space. */
export const projectToScreen = (point: Vec3, state: CameraState, width: number, height: number): ScreenPoint => {
  applyCameraState(scratch, state, width / height);
  v.set(...point).project(scratch);
  return {
    x: (v.x * 0.5 + 0.5) * width,
    y: (1 - (v.y * 0.5 + 0.5)) * height,
    depth: v.z,
    visible: v.z > -1 && v.z < 1,
  };
};
