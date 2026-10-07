// GSAP inside Remotion, deterministically. Timelines tween plain state objects
// (never the DOM) and are seeked to the frame's time on every render, so any
// frame can be rendered in any order by any worker and come out identical.

import { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);
// Rendering is driven by Remotion, never by GSAP's ticker.
gsap.ticker.sleep();

/** The brief's curve, cubic-bezier(0.19, 1, 0.22, 1), registered as a GSAP ease. */
export const EXPO_OUT = CustomEase.create('dnExpoOut', '0.19,1,0.22,1');
/** Its mirror for exits: cubic-bezier(0.7, 0, 0.84, 0). */
export const EXPO_IN = CustomEase.create('dnExpoIn', '0.7,0,0.84,0');

export const useGsapState = <S extends object>(build: (tl: gsap.core.Timeline, state: S) => void, init: () => S): S => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Built once per mount; `build`/`init` are static choreography.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rig = useMemo(() => {
    const state = init();
    const tl = gsap.timeline({ paused: true, defaults: { immediateRender: false } });
    build(tl, state);
    return { tl, state };
  }, []);
  rig.tl.seek(frame / fps, true);
  return rig.state;
};
