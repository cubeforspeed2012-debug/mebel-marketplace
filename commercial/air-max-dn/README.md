# Nike Air Max Dn — Dynamic Air Edition · 30 s spec commercial

A broadcast-grade, fully procedural 30-second / 60 fps product film. Everything is built in code: **Remotion + React Three Fiber + postprocessing + GSAP + Tailwind CSS v4**, plus a **Blender 4.x / 5.x Python pipeline** that path-traces the same shoe, frame-locked to the same timeline.

There are no stock assets, no image files and no licensed music. The shoe geometry, the textures, the light-box HDRI, the score and the sound design are all generated from shared data.

> Spec work. Brand names and the "Feel the Unreal" line belong to Nike, Inc. Before any public or paid use, clear brand rights and replace the on-screen tech figures in `src/copy.ts` with product-team-substantiated values.

---

## Quick start

```bash
cd commercial/air-max-dn
npm install            # also synthesises public/audio/score.wav and bakes shared/choreography.bake.json
npm run dev            # Remotion Studio, scrub the film and edit the props live
npm run render         # out/air-max-dn.mp4, 1920x1080 / 60 fps / H.264 CRF 14 + AAC 320k
npm run render:uhd     # 3840x2160 master
npm run render:prores  # ProRes 4444 for finishing
```

Rendering uses WebGL, so headless Chromium needs a GL backend. `remotion.config.ts` defaults to `--gl=angle` (your GPU). On a machine without a GPU, add `--gl=swangle` (SwiftShader). It is correct but slow, roughly 20 s per 1080p frame on 4 CPU cores.

Fonts are bundled from Fontsource, so rendering never touches the network.

| Script | What it does |
| --- | --- |
| `npm run score` | Re-synthesises `public/audio/score.wav` (48 kHz / 24-bit) from the timeline |
| `npm run bake` | Re-bakes `shared/choreography.bake.json` for Blender |
| `npm run verify` | Geometry and choreography checks: outward winding, closed volumes, no ground penetration, stable physics, finite camera/anchors on all 1,800 frames |
| `npm run stills [frames…]` | Renders key frames to `out/stills/` (`REMOTION_GL=swangle` without a GPU) |
| `npm run typecheck` | `tsc --noEmit` |

---

## The film (frame-accurate)

The whole film is cut on a **120 BPM grid**: 1 beat = 30 frames, an eighth = 15 frames. Every cue is declared once in `src/choreo/timeline.ts` and read by the picture, the physics, the Blender bake and the score.

| Time | Frames | Scene | What happens |
| --- | --- | --- | --- |
| 00:00–00:05 | 0–300 | **Macro Impact** | 10 sub-hit hard cuts (beats 0, 1.5, 3, 4, 5.5, 7, then an 8 / 8.5 / 9 / 9.5 stutter). 85 mm macro on the Dynamic Air tubes, compressing under a driven damped-oscillator model. Archivo Expanded Black type is cropped by the frame edges, slides with drag, and splits into sheared slices on each hit. Live psi, lens and timecode HUD. |
| 00:04.75 | 285–336 | **"Dn" matte** | A custom-drawn monogram becomes the window onto the 3D scene, then zooms through camera from the D's stem. This is the 3D-to-2D hand-off. |
| 00:05–00:13 | 300–780 | **Exploded deconstruction** | The shoe lifts and separates on staggered springs (heavy parts slower). SVG leader lines lock onto each part through the camera arc. The readouts count up, and the chamber psi is live from Boyle's law. The lighting cycles a highlight through the parts (internal glow plus a tight accent source). |
| 00:13–00:21 | 780–1260 | **Street velocity** | The parts reassemble into a stride cycle: heel strike, foot flat, heel rise, toe-off, swing. Each cycle is time-warped (slow-mo at impact, fast swing) but stays locked to the beat. The grid floor scrolls by the true ground travel, so the stance foot is planted. Depth-map contour wall, air streaks, GSAP layout type on `cubic-bezier(0.19, 1, 0.22, 1)`. Cuts at 28 mm and 40 mm on strikes, then a whip pan. |
| 00:21–00:26 | 1260–1560 | **Peak pressure** | A 360° orbit on a quintic in-out (≈450°/s at peak). Directional blur and chromatic aberration scale with the real camera angular speed. Bloom bursts on the beat, stroboscopic eighth-note type with full-frame inversions, then a white-out. |
| 00:26–00:30 | 1560–1800 | **Settle and lockup** | A true ballistic drop (g = 9.81, restitution 0.34, 0.55× overcrank). The shoe lands heel first, rocks flat on a damped pivot, and the pods squash on each impact. The contact shadow tightens as it lands. The background clears to deep matte **#080808**, then the lockup and CTA resolve. |

---

## Architecture

```
commercial/air-max-dn/
├─ shared/sneaker-spec.json      ← the shoe, as data (profiles, tubes, overlays) - read by TS *and* Python
├─ src/
│  ├─ choreo/                    ← pure, deterministic functions of the frame (no React)
│  │  ├─ timeline.ts             ← scenes, beat grid, every cue
│  │  ├─ math.ts                 ← cubic-bezier, closed-form springs, integer-hash noise, Catmull-Rom
│  │  ├─ physics.ts              ← air-chamber ODEs (480 Hz), ballistic bounce, Boyle's-law psi
│  │  ├─ pose.ts                 ← explode springs, stack hinge, stride cycle, float, drop, anchors
│  │  ├─ camera.ts               ← shots: target/az/el/distance/focal/sharp-zone + operator drift + kicks
│  │  ├─ lighting.ts             ← camera-relative 3-point rig presets, highlight cycling
│  │  ├─ fx.ts                   ← motion-derived blur/CA, hit-synced bloom/exposure, flash, matte
│  │  └─ project.ts              ← one camera model for WebGL *and* the SVG/HTML overlays
│  ├─ geometry/                  ← spec profiles + mesh builders (loft, capsule, open upper shell, sweeps)
│  ├─ three/                     ← R3F stage: sneaker, PBR materials, procedural maps, set, floors,
│  │  └─ effects/                   speed field, rig, post chain (+ Blender-plate compositing)
│  ├─ overlays/                  ← hook type, Dn matte, callouts, GSAP layouts, strobe, lockup, safe areas
│  ├─ lib/                       ← Fontsource loading, deterministic GSAP timeline hook
│  └─ Commercial.tsx             ← one frame = one evaluation, handed to 3D and every 2D layer
├─ scripts/                      ← score synthesiser, Blender bake, stills, verification (run on plain Node)
└─ blender/render_assets.py      ← procedural asset build + rig + batch plate render
```

**Determinism is the core rule.** Remotion renders frames in parallel tabs, in any order. So nothing integrates state across frames at render time:
- Springs are closed-form.
- The air-chamber ODEs are solved once, at load, into per-frame tables.
- GSAP timelines tween plain objects and are *seeked* to each frame (never ticked).
- Noise uses 32-bit integer hashes, so Node and Chromium agree bit for bit.
- Film grain is seeded by the frame number.

The same `src/choreo` modules run in Chromium (the comp) and in Node 22 with native type-stripping (the score and the bake). That is why picture, sound and Blender plates cannot drift.

### Rendering stack (`src/three`)
- **One WebGL canvas for all 30 s.** Cuts are camera cuts, not context switches.
- **Procedural shoe** from `shared/sneaker-spec.json`:
  - superellipse lofts for the outsole (two segments), foam carrier and carbon-TPU shank;
  - four capsule tubes in two pressure chambers on elastomer flanges;
  - an open upper shell whose strips trace the collar/lace opening exactly (no booleans);
  - mudguard / toe-cap and heel-counter overlays, tongue, swept laces with bow, padded collar.
- **PBR materials:**
  - TPU at IOR 1.5 with Beer-Lambert royal absorption, thin-film iridescence and clear coat;
  - 2×2 twill carbon with a per-tow anisotropy map under a resin coat;
  - matte engineered knit with a sheen lobe;
  - satin synthetic-leather overlays, foam and lugged rubber.
  - All maps are generated in code at real-world UV scale.
- **Light:**
  - a PMREM light-box environment (overhead softbox, tungsten and cold strips);
  - a camera-relative three-point rig, re-lit per shot (low side key for macro, product, run, hero);
  - world-fixed lamps for the orbit;
  - practical tungsten strips and a cold slab that depth of field turns into bokeh.
- **Post chain** (`postprocessing`, built imperatively so it exists on any worker's first frame):
  1. NaN/firefly sanitize
  2. depth of field (focus and sharp-zone from the camera)
  3. *(Blender plate composite)*
  4. directional motion blur + exposure
  5. dual-filter bloom (13-tap Karis prefilter, tent upsample, finiteness-checked)
  6. chromatic aberration
  7. AgX tone map, then a grade (chroma restore, S-curve, cool shadows / warm highlights), cos⁴ vignette, luma-weighted grain, #080808 matte lift and flash

### Typography
- **Archivo Expanded Black** (true `wdth 125` variable cut): the Druk Wide / Monument Extended register, for the hook, strobe and lockup.
- **Syne 800** for the layout headlines, **Space Grotesk** for labels, **JetBrains Mono** for tabular readouts.
- Tracking is animated everywhere: words settle from open to tight.
- All overlays are authored on a 1920×1080 design canvas and scale to UHD.

### Audio
`scripts/generate-score.ts` synthesises everything from the timeline and the physics tables:
- **Hook:** pitch-dropping sub hits on the cuts, plus an air hiss whose level is the chambers' real compression rate (dV/dt), and a low drone opening into the matte.
- **Matte:** a riser and a whoosh.
- **Explode:** a minimal pulse, an Am9 pad, and UI blips as each callout locks.
- **Velocity:** a full groove (kick, clap, offbeat bass, 16th hats) with strike thumps.
- **Orbit:** a whoosh panned with the orbit, strobe ticks, then a riser into a hard "pressure-drop" silence until touchdown.
- **Lockup:** impact thuds on the solved bounces, then an A-add9 pad and logo sting.

Mix: Freeverb send, high-pass, soft clip, −1 dBFS peak. Integrated loudness is ≈ −16.6 LUFS, a web/social target. Normalise to −23/−24 LUFS for broadcast delivery.

### Props (Remotion Studio → right panel)
`plate` (`three` | `blender`), `plateFormat` (`exr` | `png`), `colorway` (colour pickers for upper / accent / midsole / outsole / air tint), `releaseLine`, `ctaLine`, `grain`, `audio`, `showSafeAreas` (SMPTE action/title-safe guides).

---

## Blender pipeline (`blender/render_assets.py`)

```bash
npm run bake                                              # timeline -> shared/choreography.bake.json
blender -b --factory-startup -P blender/render_assets.py -- \
        --formats exr,png,exr-multilayer --samples 256    # -> public/renders/{beauty,png,passes}/frame_####.*
npm run render:blender-plates                             # composite the path-traced plates in the comp
```

The script also runs as the `bpy` pip module (`pip install bpy`, then `python blender/render_assets.py …`). `--help` lists every option: `--frames 0-299,1560-1799`, `--step`, `--engine cycles|eevee`, `--device auto|gpu|cpu`, `--resolution`, `--percentage`, `--hdri`, `--resume`, `--save-blend`, `--dry-run`.

**What it builds**
- **Geometry:** the identical parametric shoe, as separate objects: outsole, foam carrier, carbon-TPU shank, four Dynamic Air tubes plus flanges per chamber, engineered-mesh upper (solidified), overlays, tongue, collar, laces. It is ported line for line from `src/geometry`.
- **Node trees:**
  - *TPU elastomer:* Transmission 1.0, Roughness 0.05, IOR 1.5, Volume Absorption tint, Thin Film (4.2+), coat.
  - *Carbon fibre:* procedural 2×2 twill mask driving the base tone, per-tow Anisotropic Rotation on a UV tangent, and a pillow-and-strand height into Bump, under a resin coat.
  - *Matte synthetic mesh:* staggered diamond perforations and yarn courses into colour, roughness and bump, plus sheen.
  - Lugged rubber, foam, satin overlays.
- **Rig:**
  - warm key (area light), cold rim strip, small accent;
  - fill from `--hdri` or a procedural light-box world matching the realtime PMREM;
  - camera with a 36 mm horizontal sensor (same as three.js `filmGauge`), focal length keyed 28–85 mm, and physical depth of field. The f-stop is derived so its sharp zone equals the comp's.
  - A Cycles shadow catcher, 180° shutter motion blur, and CONSTANT keys before camera cuts, so blur never smears across a cut.
- **Light calibration:** wattages are P = π·I from the realtime candela values, so plates expose like the comp.
- **Output:** transparent 60 fps sequences, named by Remotion frame (Blender frame = Remotion frame):
  - `beauty/` linear half-float RGBA EXR (ZIP, premultiplied), which the comp loads through `EXRLoader`, so AgX is applied exactly once;
  - `png/` 16-bit RGBA PNG, Standard view transform, for NLEs;
  - `passes/` multilayer EXR (DWAA) with depth, mist, normal, vector, emission and Cryptomatte, for comp.
- **No bake?** The script falls back to a built-in 300° hero orbit with the lens breathing 28 → 85 → 50 mm.

In plate mode the comp hides the realtime shoe and its contact shadow. It loads each frame's plate and blocks the render until it is decoded. It composites the plate after the depth-of-field pass, so the realtime set is defocused while Blender's own DOF is kept. Bloom, blur, CA and the grade then sit over both.

---

## Verification done for this delivery

- `npm run typecheck` and `npm run verify` pass. Every closed mesh has positive signed volume, the shoe never penetrates the floor, pod compression stays within [−0.12, 0.45], the camera stays within 28–85 mm, and all anchors are finite on all 1,800 frames.
- Key frames from every scene and a 6-second motion segment were rendered with headless Chromium under SwiftShader (`--gl=swangle`) and reviewed.
- `render_assets.py` was run on **Blender 5.2 LTS** and **4.5 LTS** (bpy module, Cycles CPU):
  - scene build and dry runs;
  - EXR, PNG and multilayer output: single-part on 4.5, multipart on 5.x, with all passes present;
  - the no-bake fallback path;
  - full 1,800-frame keying and `.blend` save.
- The score was checked by spectrogram against the cue sheet, and loudness with EBU R128.

### Known limitations
- The tech figures on screen are creative placeholders for claims. Clear them before use (see `src/copy.ts`).
- Under SwiftShader, one extreme-macro shot (around frame 190) can show a single dark texel in the hottest transmission highlight. It comes from three.js's screen-space transmission approximation. GPU renders were not available here to compare.
- The EEVEE path needs a GPU/EGL context. Headless render nodes without one should use Cycles (the default).
