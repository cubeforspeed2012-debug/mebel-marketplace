import { AbsoluteFill, useVideoConfig } from 'remotion';
import { HEIGHT, WIDTH } from '../choreo/timeline.ts';

/** All 2D layers are authored on a fixed 1920x1080 canvas and scaled to the output (e.g. UHD). */
export const DesignSpace: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill className="pointer-events-none overflow-hidden">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: WIDTH, height: HEIGHT, transform: `scale(${width / WIDTH})` }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** SMPTE timecode at 60 fps, non-drop. */
export const timecode = (frame: number, fps: number) => {
  const f = Math.max(0, Math.floor(frame));
  const ff = f % fps;
  const s = Math.floor(f / fps);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(ff)}`;
};
