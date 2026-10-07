// Broadcast guides (SMPTE ST 2046-1): action-safe 93%, title-safe 90%, plus a
// centre cross. Toggle with the `showSafeAreas` prop; never on by default.

export const SafeAreas: React.FC = () => (
  <svg className="absolute inset-0" width={1920} height={1080}>
    <rect x={1920 * 0.035} y={1080 * 0.035} width={1920 * 0.93} height={1080 * 0.93} fill="none" stroke="#00e5ff" strokeWidth={1} strokeDasharray="8 6" />
    <rect x={1920 * 0.05} y={1080 * 0.05} width={1920 * 0.9} height={1080 * 0.9} fill="none" stroke="#ff3d7f" strokeWidth={1} />
    <path d="M950 540 H970 M960 530 V550" stroke="#ffffff" strokeWidth={1} />
  </svg>
);
