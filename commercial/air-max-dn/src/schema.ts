import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const commercialSchema = z.object({
  /** 'three' renders the shoe in realtime; 'blender' composites the render_assets.py plates. */
  plate: z.enum(['three', 'blender']),
  plateFormat: z.enum(['exr', 'png']),
  colorway: z.object({
    upper: zColor(),
    accent: zColor(),
    midsole: zColor(),
    outsole: zColor(),
    airTint: zColor(),
  }),
  releaseLine: z.string(),
  ctaLine: z.string(),
  grain: z.number().min(0).max(2).step(0.05),
  audio: z.boolean(),
  showSafeAreas: z.boolean(),
});

export type CommercialProps = z.infer<typeof commercialSchema>;
