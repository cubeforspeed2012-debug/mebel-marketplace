#!/usr/bin/env python3
"""
render_assets.py - Nike Air Max Dn (Dynamic Air Edition): procedural asset build,
studio rig and batch plate render for the Remotion commercial.

Builds the same parametric sneaker as the realtime renderer (shared/sneaker-spec.json,
mirrored line-for-line from src/geometry/*.ts) as separate objects - outsole,
dual-chamber Dynamic Air tubes, foam carrier, carbon-TPU shank, engineered-mesh upper
with overlays, tongue, collar, laces - with physically based node trees:

  * TPU elastomer   : full transmission, IOR 1.5, Beer-Lambert volume absorption,
                      thin-film iridescence, clear coat
  * carbon fibre    : procedural 2x2 twill, anisotropic fibre highlights with
                      per-tow tangent rotation, bump-mapped weave, resin clear coat
  * synthetic mesh  : matte staggered-perforation knit, sheen lobe, bump

then a three-point rig (warm key, cold rim strip, HDRI / procedural light-box fill),
a camera with dynamic focal length (28-85 mm) and physical depth of field, and renders
transparent 60 fps plates (linear EXR for the web pipeline, multilayer EXR for comp,
PNG for NLEs).

With shared/choreography.bake.json present (run `npm run bake`), every frame - camera,
lens, focus, explode, air-pod compression, lights - is the exact frame the Remotion
comp renders, so the plates drop straight into `--props='{"plate":"blender"}'`.
Without it, a built-in 28 -> 85 mm hero camera path is used.

Tested with Blender 4.2-4.5 LTS and 5.x (also as the `bpy` pip module).

USAGE
  blender --background --factory-startup --python blender/render_assets.py -- [options]
  python blender/render_assets.py [options]                # with `pip install bpy`

OPTIONS
  --spec PATH            sneaker spec            (default: ../shared/sneaker-spec.json)
  --bake PATH            choreography bake       (default: ../shared/choreography.bake.json)
  --out DIR              output root             (default: ../public/renders)
  --formats LIST         exr,png,exr-multilayer  (default: exr,png)
  --frames SPEC          Remotion frame numbers: "0-1799", "0-299,1560-1799", "450"
  --step N               render every Nth frame of --frames (look-dev)
  --engine NAME          cycles | eevee          (default: cycles)
  --samples N            render samples          (default: 256 cycles / 64 eevee)
  --resolution WxH       (default: 1920x1080)
  --percentage P         resolution scale %      (default: 100)
  --device NAME          auto | gpu | cpu        (default: auto)
  --hdri PATH            HDRI for the fill light (default: procedural light-box)
  --no-denoise           disable denoising
  --no-motion-blur       disable 180-degree shutter motion blur
  --resume               skip frames whose outputs already exist
  --save-blend PATH      save the assembled, fully keyframed scene
  --dry-run              build everything, render nothing
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
import warnings
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT = SCRIPT_DIR.parent
FPS = 60
DURATION = 1800

COLORWAY = {
    "upper": "#2244d6",
    "accent": "#0d0e12",
    "midsole": "#e9e7e0",
    "outsole": "#2846b8",
    "air_tint": "#3a5bff",
}


# --------------------------------------------------------------------------- CLI


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser(prog="render_assets.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--spec", type=Path, default=PROJECT / "shared" / "sneaker-spec.json")
    p.add_argument("--bake", type=Path, default=PROJECT / "shared" / "choreography.bake.json")
    p.add_argument("--out", type=Path, default=PROJECT / "public" / "renders")
    p.add_argument("--formats", default="exr,png")
    p.add_argument("--frames", default=f"0-{DURATION - 1}")
    p.add_argument("--step", type=int, default=1)
    p.add_argument("--engine", choices=["cycles", "eevee"], default="cycles")
    p.add_argument("--samples", type=int, default=0)
    p.add_argument("--resolution", default="1920x1080")
    p.add_argument("--percentage", type=int, default=100)
    p.add_argument("--device", choices=["auto", "gpu", "cpu"], default="auto")
    p.add_argument("--hdri", type=Path, default=None)
    p.add_argument("--no-denoise", action="store_true")
    p.add_argument("--no-motion-blur", action="store_true")
    p.add_argument("--resume", action="store_true")
    p.add_argument("--save-blend", type=Path, default=None)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args(argv)
    args.formats = [f.strip() for f in args.formats.split(",") if f.strip()]
    for f in args.formats:
        if f not in ("exr", "png", "exr-multilayer"):
            p.error(f"unknown format {f!r}")
    return args


def parse_frames(spec: str, step: int) -> list[int]:
    frames: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = (int(x) for x in part.split("-", 1))
            frames.update(range(a, b + 1))
        else:
            frames.add(int(part))
    ordered = sorted(f for f in frames if 0 <= f < DURATION)
    return ordered[:: max(1, step)]


# ---------------------------------------------------------------- deterministic math
# Line-for-line ports of src/choreo/math.ts and src/geometry/spec.ts.


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return min(hi, max(lo, v))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def inv_lerp(a: float, b: float, v: float) -> float:
    if a == b:
        return 1.0 if v >= b else 0.0
    return clamp((v - a) / (b - a))


def smoothstep(a: float, b: float, v: float) -> float:
    t = inv_lerp(a, b, v)
    return t * t * (3 - 2 * t)


def catmull_rom_table(table, x: float) -> float:
    n = len(table)
    if x <= table[0][0]:
        return table[0][1]
    if x >= table[n - 1][0]:
        return table[n - 1][1]
    i = 0
    while i < n - 2 and x > table[i + 1][0]:
        i += 1
    p0, p1, p2, p3 = table[max(0, i - 1)], table[i], table[i + 1], table[min(n - 1, i + 2)]
    t = (x - p1[0]) / (p2[0] - p1[0])
    dx = p2[0] - p1[0]
    m1 = ((p2[1] - p0[1]) / ((p2[0] - p0[0]) or 1)) * dx
    m2 = ((p3[1] - p1[1]) / ((p3[0] - p1[0]) or 1)) * dx
    t2 = t * t
    t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2


def sgn_pow(v: float, e: float) -> float:
    if v == 0:
        return 0.0
    return math.copysign(abs(v) ** e, v)


def v_add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def v_sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def v_scale(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def v_len(a):
    return math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])


def v_cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


class Spec:
    """Parametric profile functions over shared/sneaker-spec.json (mirror of src/geometry/spec.ts)."""

    def __init__(self, data: dict):
        self.d = data
        self.L = data["length"]

    def x_at(self, t):
        return (t - 0.5) * self.L

    def cap_factor(self, t):
        heel_cap = self.d["footprint"]["heelCap"]
        toe_cap = self.d["footprint"]["toeCap"]
        f = 1.0
        if t < heel_cap:
            u = 1 - clamp(t / heel_cap)
            f *= math.sqrt(max(0.0, 1 - u * u))
        if t > 1 - toe_cap:
            u = 1 - clamp((1 - t) / toe_cap)
            f *= math.sqrt(max(0.0, 1 - u * u))
        return f

    def half_width(self, side, t):
        return catmull_rom_table(self.d["footprint"][side], t) * self.cap_factor(t)

    def sole_bottom(self, t):
        r = self.d["rocker"]
        heel = max(0.0, 1 - t / r["heelBevelEnd"])
        toe = max(0.0, (t - r["toeSpringStart"]) / (1 - r["toeSpringStart"]))
        return r["heelBevel"] * heel * heel + r["toeSpring"] * toe ** r["toeSpringExponent"]

    def outsole_top(self, t):
        return self.sole_bottom(t) + self.d["outsole"]["thickness"]

    def max_tube_radius(self):
        return max(tube["radius"] for ch in self.d["airUnit"]["chambers"] for tube in ch["tubes"])

    def midsole_top(self, t):
        return self.sole_bottom(t) + catmull_rom_table(self.d["midsole"]["stack"], t)

    def heel_carrier_bottom(self, t):
        return self.outsole_top(t) + 2 * self.d["airUnit"]["flange"] + 2 * self.max_tube_radius()

    def midsole_bottom(self, t):
        m = self.d["midsole"]
        return lerp(self.heel_carrier_bottom(t), self.outsole_top(t), smoothstep(m["heelCarrierEnd"], m["forefootStart"], t))

    def upper_base(self, t):
        return self.midsole_top(t) - self.d["upper"]["baseTuck"]

    def upper_height(self, t):
        return catmull_rom_table(self.d["upper"]["height"], t)

    def upper_half_width(self, side, t):
        return self.half_width(side, t) + self.d["upper"]["flare"]

    def opening_half(self, t):
        rows = self.d["upper"]["opening"]
        if t <= rows[0][0] or t >= rows[-1][0]:
            return 0.0
        return max(0.0, catmull_rom_table(rows, t))

    def upper_point(self, t, s, scale=1.0, lift=0.0):
        e = 2 / self.d["upper"]["exponent"]
        theta = math.pi * s
        c = math.cos(theta)
        w = self.upper_half_width("lateral", t) if c >= 0 else self.upper_half_width("medial", t)
        base = self.upper_base(t)
        z = w * sgn_pow(c, e) * scale
        y = self.upper_height(t) * abs(math.sin(theta)) ** e * scale
        r = math.hypot(z, y) or 1.0
        return (self.x_at(t), base + y + (y / r) * lift, z + (z / r) * lift)

    def tubes(self):
        out = []
        au = self.d["airUnit"]
        for ch in au["chambers"]:
            for tube in ch["tubes"]:
                out.append(
                    {
                        "chamber": ch["id"],
                        "t": tube["t"],
                        "radius": tube["radius"],
                        "zMin": -(self.half_width("medial", tube["t"]) + au["overhang"]),
                        "zMax": self.half_width("lateral", tube["t"]) + au["overhang"],
                        "bottom": self.outsole_top(tube["t"]) + au["flange"],
                    }
                )
        return out


def clustered_samples(t0, t1, n):
    return [t0 + (t1 - t0) * (0.5 - 0.5 * math.cos(math.pi * i / (n - 1))) for i in range(n)]


# ------------------------------------------------------------------ mesh builders
# Mirror of src/geometry/sneaker-mesh.ts. Vertices are produced in three.js space
# (y-up) and converted to Blender (z-up) when the mesh is created.


class MeshData:
    def __init__(self):
        self.verts: list[tuple] = []
        self.uvs: list[tuple] = []
        self.faces: list[tuple] = []

    def vertex(self, p, u, v):
        self.verts.append(tuple(p))
        self.uvs.append((u, v))
        return len(self.verts) - 1

    def tri(self, a, b, c):
        self.faces.append((a, b, c))

    def quad(self, a, b, c, d):
        self.faces.append((a, b, c, d))


def loft_point(spec: Spec, o: dict, t: float, phi: float):
    s = o["section"](t)
    wl, wm = s["wL"], s["wM"]
    hh = (s["yTop"] - s["yBot"]) / 2
    yc = (s["yTop"] + s["yBot"]) / 2

    def rnd(d, r):
        return math.sqrt(max(0.0, 1 - (1 - min(1.0, d / r)) ** 2))

    if o.get("roundStart"):
        f = rnd(t - o["t0"], o["roundStart"])
        wl, wm, hh = wl * f, wm * f, hh * f
    if o.get("roundEnd"):
        f = rnd(o["t1"] - t, o["roundEnd"])
        wl, wm, hh = wl * f, wm * f, hh * f
    e = 2 / o["exponent"]
    c = math.cos(phi)
    z = (wl if c >= 0 else wm) * sgn_pow(c, e)
    y = yc + hh * sgn_pow(math.sin(phi), e)
    return (spec.x_at(t), y, z)


def loft_into(spec: Spec, b: MeshData, o: dict):
    ts = clustered_samples(o["t0"], o["t1"], o["along"])
    M = o["around"]
    tile = spec.d["uvTile"]
    rings = []
    for t in ts:
        pts = [loft_point(spec, o, t, -math.pi / 2 + 2 * math.pi * j / M) for j in range(M + 1)]
        arc = 0.0
        ring = []
        for j, p in enumerate(pts):
            if j > 0:
                arc += v_len(v_sub(p, pts[j - 1]))
            ring.append(b.vertex(p, (t - o["t0"]) * spec.L / tile, arc / tile))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for j in range(M):
            b.quad(rings[i][j], rings[i + 1][j], rings[i + 1][j + 1], rings[i][j + 1])

    def centre(t):
        s = o["section"](t)
        return (spec.x_at(t), (s["yTop"] + s["yBot"]) / 2, (s["wL"] - s["wM"]) / 2)

    def cap(t, reverse):
        c = centre(t)

        def uv(p):
            return (0.5 + (p[2] - c[2]) * 8, 0.5 + (p[1] - c[1]) * 8)

        ci = b.vertex(c, *uv(c))
        ring = []
        for j in range(M + 1):
            p = loft_point(spec, o, t, -math.pi / 2 + 2 * math.pi * j / M)
            ring.append(b.vertex(p, *uv(p)))
        for j in range(M):
            if reverse:
                b.tri(ci, ring[j + 1], ring[j])
            else:
                b.tri(ci, ring[j], ring[j + 1])

    cap(o["t0"], True)
    cap(o["t1"], False)


def build_outsole(spec: Spec) -> MeshData:
    b = MeshData()
    os_ = spec.d["outsole"]

    def section(t):
        return {
            "wL": spec.half_width("lateral", t) + os_["flare"],
            "wM": spec.half_width("medial", t) + os_["flare"],
            "yBot": spec.sole_bottom(t),
            "yTop": spec.outsole_top(t),
        }

    for t0, t1 in os_["segments"]:
        loft_into(
            spec,
            b,
            {
                "t0": t0,
                "t1": t1,
                "along": max(24, round(spec.d["samples"]["along"] * (t1 - t0))),
                "around": spec.d["samples"]["around"],
                "exponent": os_["exponent"],
                "section": section,
                "roundStart": os_["endRound"] if t0 > 0 else None,
                "roundEnd": os_["endRound"] if t1 < 1 else None,
            },
        )
    return b


def build_midsole(spec: Spec) -> MeshData:
    b = MeshData()
    m = spec.d["midsole"]
    loft_into(
        spec,
        b,
        {
            "t0": 0.0,
            "t1": 1.0,
            "along": spec.d["samples"]["along"],
            "around": spec.d["samples"]["around"],
            "exponent": m["exponent"],
            "section": lambda t: {
                "wL": spec.half_width("lateral", t) + m["flare"],
                "wM": spec.half_width("medial", t) + m["flare"],
                "yBot": spec.midsole_bottom(t),
                "yTop": spec.midsole_top(t),
            },
        },
    )
    return b


def build_shank(spec: Spec) -> MeshData:
    b = MeshData()
    k = spec.d["shank"]

    def section(t):
        bottom = spec.midsole_bottom(t) - (k["thickness"] - k["embed"])
        return {
            "wL": spec.half_width("lateral", t) * k["widthRatio"],
            "wM": spec.half_width("medial", t) * k["widthRatio"],
            "yBot": bottom,
            "yTop": bottom + k["thickness"],
        }

    loft_into(
        spec,
        b,
        {
            "t0": k["start"],
            "t1": k["end"],
            "along": 40,
            "around": spec.d["samples"]["around"],
            "exponent": k["exponent"],
            "section": section,
            "roundStart": k["endRound"],
            "roundEnd": k["endRound"],
        },
    )
    return b


def build_tube(tube: dict) -> MeshData:
    """Capsule along z, origin at the tube's bottom centre (it squashes onto the outsole)."""
    b = MeshData()
    r = tube["radius"]
    half_len = (tube["zMax"] - tube["zMin"]) / 2
    cyl = max(0.0, half_len - r)
    cap_segs, cyl_segs, around = 10, 18, 36
    profile = []
    for i in range(cap_segs + 1):
        beta = (math.pi / 2) * (1 - i / cap_segs)
        profile.append((-cyl - r * math.sin(beta), r * math.cos(beta)))
    for i in range(1, cyl_segs):
        profile.append((-cyl + 2 * cyl * i / cyl_segs, r))
    for i in range(cap_segs + 1):
        beta = (math.pi / 2) * (i / cap_segs)
        profile.append((cyl + r * math.sin(beta), r * math.cos(beta)))
    rings = []
    for k, (z, rad) in enumerate(profile):
        ring = []
        for j in range(around + 1):
            a = 2 * math.pi * j / around
            ring.append(b.vertex((rad * math.cos(a), r + rad * math.sin(a), z), k / (len(profile) - 1), j / around))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for j in range(around):
            b.quad(rings[k][j], rings[k][j + 1], rings[k + 1][j + 1], rings[k + 1][j])
    return b


def build_flange(spec: Spec, chamber_id: str) -> MeshData:
    lst = [t for t in spec.tubes() if t["chamber"] == chamber_id]
    margin = lst[0]["radius"] / spec.L
    au = spec.d["airUnit"]
    b = MeshData()
    loft_into(
        spec,
        b,
        {
            "t0": lst[0]["t"] - margin,
            "t1": lst[-1]["t"] + margin,
            "along": 24,
            "around": spec.d["samples"]["around"],
            "exponent": 6,
            "section": lambda t: {
                "wL": spec.half_width("lateral", t) + au["overhang"] - 0.001,
                "wM": spec.half_width("medial", t) + au["overhang"] - 0.001,
                "yBot": spec.outsole_top(t) - 0.0002,
                "yTop": spec.outsole_top(t) + au["flangeThickness"],
            },
            "roundStart": 0.012,
            "roundEnd": 0.012,
        },
    )
    return b


def build_upper(spec: Spec) -> MeshData:
    b = MeshData()
    ts = clustered_samples(0.0, 1.0, spec.d["samples"]["along"])
    K = spec.d["samples"]["upperAround"] // 2
    lateral, medial = [], []
    for t in ts:
        a = spec.opening_half(t)
        lat, med = [], []
        for k in range(K + 1):
            s_l = (0.5 - a) * (k / K)
            s_m = 0.5 + a + (0.5 - a) * (k / K)
            lat.append(b.vertex(spec.upper_point(t, s_l), t, s_l))
            med.append(b.vertex(spec.upper_point(t, s_m), t, s_m))
        lateral.append(lat)
        medial.append(med)
    for strip in (lateral, medial):
        for i in range(len(strip) - 1):
            for k in range(K):
                b.quad(strip[i][k], strip[i + 1][k], strip[i + 1][k + 1], strip[i][k + 1])
    return b


def build_overlay(spec: Spec, overlay_id: str) -> MeshData:
    o = spec.d["overlays"][overlay_id]
    b = MeshData()
    ts = clustered_samples(o["start"], o["end"], 80)
    K = 8

    def top(t):
        return max(0.0, min(catmull_rom_table(o["top"], t), 0.5 - spec.opening_half(t) - 0.004))

    for side in ("lateral", "medial"):
        grid = []
        for t in ts:
            st = top(t)
            row = []
            for k in range(K + 1):
                sv = st * k / K if side == "lateral" else 1 - st * k / K
                row.append(b.vertex(spec.upper_point(t, sv, 1, o["lift"]), t * 10, sv * 4))
            grid.append(row)
        for i in range(len(grid) - 1):
            for k in range(K):
                if side == "lateral":
                    b.quad(grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1])
                else:
                    b.quad(grid[i][k], grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k])
    return b


def tongue_point(spec: Spec, t, s):
    g = spec.d["tongue"]
    p = spec.upper_point(t, s, g["inset"])
    if t < g["liftEnd"]:
        lift = g["lift"] * ((g["liftEnd"] - t) / (g["liftEnd"] - g["start"])) ** 1.5
        return (p[0] - 0.4 * lift, p[1] + lift, p[2])
    return p


def build_tongue(spec: Spec) -> MeshData:
    b = MeshData()
    g = spec.d["tongue"]
    ts = clustered_samples(g["start"], g["end"], 40)
    S = 16
    grid = []
    for t in ts:
        row = []
        for k in range(S + 1):
            s = 0.5 - g["halfSpan"] + 2 * g["halfSpan"] * k / S
            row.append(b.vertex(tongue_point(spec, t, s), (t - g["start"]) / (g["end"] - g["start"]), k / S))
        grid.append(row)
    for i in range(len(grid) - 1):
        for k in range(S):
            b.quad(grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1])
    return b


def sweep_into(b: MeshData, points, radius, around=12):
    n = len(points)
    tangents = []
    for i in range(n):
        d = v_sub(points[min(n - 1, i + 1)], points[max(0, i - 1)])
        tangents.append(v_scale(d, 1 / (v_len(d) or 1)))
    t0 = tangents[0]
    normal = v_cross(t0, (0, 1, 0) if abs(t0[1]) < 0.9 else (1, 0, 0))
    normal = v_scale(normal, 1 / v_len(normal))
    rings, frames = [], []
    arc = 0.0
    for i in range(n):
        T = tangents[i]
        dot = normal[0] * T[0] + normal[1] * T[1] + normal[2] * T[2]
        normal = v_sub(normal, v_scale(T, dot))
        normal = v_scale(normal, 1 / (v_len(normal) or 1))
        B = v_cross(T, normal)
        frames.append((normal, B))
        if i > 0:
            arc += v_len(v_sub(points[i], points[i - 1]))
        ring = []
        for j in range(around + 1):
            beta = 2 * math.pi * j / around
            off = v_add(v_scale(normal, math.cos(beta) * radius), v_scale(B, math.sin(beta) * radius))
            ring.append(b.vertex(v_add(points[i], off), arc * 40, j / around))
        rings.append(ring)
    for i in range(n - 1):
        for j in range(around):
            b.quad(rings[i][j], rings[i][j + 1], rings[i + 1][j + 1], rings[i + 1][j])

    def cap_at(i, reverse):
        nrm, bnm = frames[i]
        c = b.vertex(points[i], 0.5, 0.5)
        ring = []
        for j in range(around + 1):
            beta = 2 * math.pi * j / around
            p = v_add(points[i], v_add(v_scale(nrm, math.cos(beta) * radius), v_scale(bnm, math.sin(beta) * radius)))
            ring.append(b.vertex(p, 0.5 + 0.5 * math.cos(beta), 0.5 + 0.5 * math.sin(beta)))
        for j in range(around):
            if reverse:
                b.tri(c, ring[j + 1], ring[j])
            else:
                b.tri(c, ring[j], ring[j + 1])

    cap_at(0, True)
    cap_at(n - 1, False)


def quadratic_bezier(a, c, d, steps):
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        out.append(tuple(u * u * a[k] + 2 * u * t * c[k] + t * t * d[k] for k in range(3)))
    return out


def catmull_rom_path(ctrl, steps):
    out = []
    for i in range(len(ctrl) - 1):
        p0, p1, p2, p3 = ctrl[max(0, i - 1)], ctrl[i], ctrl[i + 1], ctrl[min(len(ctrl) - 1, i + 2)]
        for k in range(steps):
            t = k / steps
            t2, t3 = t * t, t * t * t
            out.append(
                tuple(
                    0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)
                    for c in range(3)
                )
            )
    out.append(tuple(ctrl[-1]))
    return out


def lace_paths(spec: Spec):
    lc = spec.d["laces"]
    lateral = [spec.upper_point(t, 0.5 - spec.opening_half(t) - lc["margin"], 1, 0.0015) for t in lc["eyelets"]]
    medial = [spec.upper_point(t, 0.5 + spec.opening_half(t) + lc["margin"], 1, 0.0015) for t in lc["eyelets"]]
    n = len(lc["eyelets"])

    def over(a, d):
        tm = (a[0] + d[0]) / 2 / spec.L + 0.5
        crown = spec.upper_point(tm, 0.5, 1, lc["rise"] * 1.8)
        mid = v_scale(v_add(a, d), 0.5)
        return quadratic_bezier(a, (mid[0], max(mid[1], crown[1]), mid[2]), d, 14)

    paths = [over(lateral[n - 1], medial[n - 1])]
    for i in range(n - 1, 0, -1):
        paths.append(over(lateral[i], medial[i - 1]))
        paths.append(over(medial[i], lateral[i - 1]))
    knot = spec.upper_point(lc["eyelets"][0] - 0.006, 0.5, 1, 0.006)
    for side in (1, -1):

        def k(v, side=side):
            return v_add(knot, (v[0], v[1], v[2] * side))

        paths.append(catmull_rom_path([knot, k((-0.006, 0.006, 0.012)), k((0, 0.012, 0.026)), k((0.01, 0.008, 0.03)), k((0.012, 0.002, 0.018)), k((0.002, 0.001, 0.003))], 6))
        paths.append(catmull_rom_path([k((0.001, 0, 0.002)), k((0.012, -0.004, 0.009)), k((0.024, -0.014, 0.02)), k((0.032, -0.03, 0.026))], 6))
    return paths


def build_laces(spec: Spec) -> MeshData:
    b = MeshData()
    for path in lace_paths(spec):
        sweep_into(b, path, spec.d["laces"]["radius"], 10)
    return b


def build_collar(spec: Spec) -> MeshData:
    start = spec.d["upper"]["opening"][0][0]
    end = spec.d["collar"]["end"]
    steps = 36
    pts = []
    for i in range(steps + 1):
        t = end - (end - start) * i / steps
        pts.append(spec.upper_point(t, 0.5 - spec.opening_half(t), 1, 0.001))
    for i in range(1, steps + 1):
        t = start + (end - start) * i / steps
        pts.append(spec.upper_point(t, 0.5 + spec.opening_half(t), 1, 0.001))
    b = MeshData()
    sweep_into(b, pts, spec.d["collar"]["radius"], 14)
    return b


# ------------------------------------------------------------- Blender helpers


def to_blender(p) -> Vector:
    """three.js (x, y-up, z-lateral) -> Blender (x, y = -z, z-up). A proper rotation: winding survives."""
    return Vector((p[0], -p[2], p[1]))


def quat_to_blender(q) -> Quaternion:
    """three.js quaternion (x, y, z, w) -> Blender Quaternion (w, x, y, z) in z-up space."""
    return Quaternion((q[3], q[0], -q[2], q[1]))


def hex_rgb(h: str, alpha: float | None = None):
    h = h.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, 1.0 if alpha is None else alpha)


def mesh_object(name: str, data: MeshData, collection, parent=None, smooth=True, weld=True):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([to_blender(v) for v in data.verts], [], data.faces)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    loop_uvs = []
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            loop_uvs.extend(data.uvs[mesh.loops[li].vertex_index])
    uv_layer.data.foreach_set("uv", loop_uvs)
    mesh.validate(clean_customdata=False)
    if weld:
        import bmesh

        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
        bm.to_mesh(mesh)
        bm.free()
    if smooth:
        if hasattr(mesh, "shade_smooth"):
            mesh.shade_smooth()
        else:
            mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def empty(name: str, collection, parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.02
    collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    obj.rotation_mode = "QUATERNION"
    return obj


def node_tree_of(idblock):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", DeprecationWarning)
        if getattr(idblock, "node_tree", None) is None or not getattr(idblock, "use_nodes", True):
            idblock.use_nodes = True
    return idblock.node_tree


def set_input(node, names, value):
    for n in names if isinstance(names, (list, tuple)) else (names,):
        sock = node.inputs.get(n)
        if sock is not None:
            sock.default_value = value
            return sock
    return None


def inp(node, names):
    for n in names if isinstance(names, (list, tuple)) else (names,):
        sock = node.inputs.get(n)
        if sock is not None:
            return sock
    raise KeyError(f"{node.bl_idname} has none of {names}")


class Graph:
    """Tiny node-graph DSL so the procedural shaders read like the math they are."""

    def __init__(self, nt):
        self.nt = nt
        self.x = -1400

    def node(self, kind, **props):
        n = self.nt.nodes.new(kind)
        for k, v in props.items():
            setattr(n, k, v)
        n.location = (self.x, 0)
        self.x += 40
        return n

    def link(self, src, dst):
        self.nt.links.new(src, dst)

    def _feed(self, sock, v):
        if isinstance(v, (int, float)):
            sock.default_value = v
        elif v is not None:
            self.link(v, sock)

    def math(self, op, a, b=None, c=None, clamp_=False):
        n = self.node("ShaderNodeMath", operation=op, use_clamp=clamp_)
        for i, v in enumerate((a, b, c)):
            self._feed(n.inputs[i], v)
        return n.outputs[0]

    def lerp(self, a, b, t):
        # a + (b - a) * t
        return self.math("MULTIPLY_ADD", self.math("SUBTRACT", b, a), t, a)

    def smooth(self, value, from_min, from_max, to_min=0.0, to_max=1.0):
        n = self.node("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
        self._feed(inp(n, ["Value"]), value)
        inp(n, ["From Min"]).default_value = from_min
        inp(n, ["From Max"]).default_value = from_max
        inp(n, ["To Min"]).default_value = to_min
        inp(n, ["To Max"]).default_value = to_max
        return n.outputs[0]

    def uv(self, scale=(1.0, 1.0, 1.0)):
        tc = self.node("ShaderNodeTexCoord")
        mp = self.node("ShaderNodeMapping")
        self.link(tc.outputs["UV"], inp(mp, ["Vector"]))
        inp(mp, ["Scale"]).default_value = scale
        sep = self.node("ShaderNodeSeparateXYZ")
        self.link(mp.outputs[0], sep.inputs[0])
        return mp.outputs[0], sep.outputs["X"], sep.outputs["Y"]

    def bump(self, height, strength, distance):
        n = self.node("ShaderNodeBump")
        inp(n, ["Strength"]).default_value = strength
        inp(n, ["Distance"]).default_value = distance
        self.link(height, inp(n, ["Height"]))
        return n.outputs["Normal"]

    def scale_color(self, rgba, factor):
        n = self.node("ShaderNodeHueSaturation")
        inp(n, ["Color"]).default_value = rgba
        self._feed(inp(n, ["Value"]), factor)
        return n.outputs[0]


def new_material(name: str):
    mat = bpy.data.materials.new(name)
    nt = node_tree_of(mat)
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (400, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat, Graph(nt), bsdf, out


# ------------------------------------------------------------------ materials


def mat_air(name: str, tint: str):
    """Dynamic Air TPU: transmission 1, IOR 1.5, Beer-Lambert volume tint, thin film, clear coat."""
    mat, g, bsdf, out = new_material(name)
    set_input(bsdf, "Base Color", (0.92, 0.94, 1.0, 1.0))
    set_input(bsdf, ["Transmission Weight", "Transmission"], 1.0)
    set_input(bsdf, "Roughness", 0.05)
    set_input(bsdf, "IOR", 1.5)
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.35)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.04)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.5)
    set_input(bsdf, "Thin Film Thickness", 320.0)  # nm, Blender 4.2+
    set_input(bsdf, "Thin Film IOR", 1.38)
    set_input(bsdf, ["Emission Color", "Emission"], hex_rgb(tint))
    set_input(bsdf, "Emission Strength", 0.0)
    absorb = g.node("ShaderNodeVolumeAbsorption")
    r, gg, bb, _ = hex_rgb(tint)
    absorb.inputs["Color"].default_value = (lerp(r, 1, 0.3), lerp(gg, 1, 0.3), lerp(bb, 1, 0.3), 1.0)
    absorb.inputs["Density"].default_value = 30.0  # 1/m: ~18% red loss through 1 cm of wall + gas
    g.link(absorb.outputs[0], out.inputs["Volume"])
    if hasattr(mat, "use_raytrace_refraction"):
        mat.use_raytrace_refraction = True  # EEVEE
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "DITHERED"
    return mat


def mat_carbon(name: str):
    """2x2 twill carbon: tow mask -> per-tow anisotropy rotation, pillow bump, resin coat."""
    mat, g, bsdf, _ = new_material(name)
    tows = 32.0  # per 10 cm UV tile -> ~3 mm tows
    _, u, v = g.uv((tows, tows, 1.0))
    i = g.math("FLOOR", u)
    j = g.math("FLOOR", v)
    warp = g.math("LESS_THAN", g.math("MODULO", g.math("ADD", i, j), 4.0), 2.0)
    lu = g.math("FRACT", u)
    lv = g.math("FRACT", v)
    pillow = g.math("SQRT", g.math("MULTIPLY", g.math("SINE", g.math("MULTIPLY", lu, math.pi)), g.math("SINE", g.math("MULTIPLY", lv, math.pi))))
    across = g.lerp(lu, lv, warp)
    strands = g.math("MULTIPLY_ADD", g.math("SINE", g.math("MULTIPLY", across, 9 * math.pi)), 0.5, 0.5)
    height = g.math("MULTIPLY", pillow, g.math("MULTIPLY_ADD", strands, 0.15, 0.85))
    cell = g.node("ShaderNodeCombineXYZ")
    g.link(i, cell.inputs[0])
    g.link(j, cell.inputs[1])
    noise = g.node("ShaderNodeTexWhiteNoise", noise_dimensions="3D")
    g.link(cell.outputs[0], noise.inputs["Vector"])
    tone = g.math("MULTIPLY_ADD", noise.outputs["Value"], 0.14, 0.86)
    shade = g.math("MULTIPLY", tone, g.math("MULTIPLY_ADD", height, 0.3, 0.7))
    g.link(g.scale_color((0.05, 0.05, 0.055, 1.0), shade), inp(bsdf, ["Base Color"]))
    set_input(bsdf, "Metallic", 0.15)
    set_input(bsdf, "Roughness", 0.32)
    set_input(bsdf, ["Anisotropic"], 0.85)
    g.link(g.math("MULTIPLY", g.math("SUBTRACT", 1.0, warp), 0.25), inp(bsdf, ["Anisotropic Rotation"]))
    tangent = g.node("ShaderNodeTangent", direction_type="UV_MAP")
    tangent.uv_map = "UVMap"
    g.link(tangent.outputs["Tangent"], inp(bsdf, ["Tangent"]))
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 1.0)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.06)
    g.link(g.bump(height, 0.35, 0.0004), inp(bsdf, ["Normal"]))
    set_input(bsdf, ["Emission Color", "Emission"], hex_rgb(COLORWAY["air_tint"]))
    set_input(bsdf, "Emission Strength", 0.0)
    return mat


def mat_knit(name: str, colour: str, repeat=(10.0, 4.0)):
    """Matte engineered mesh: staggered diamond perforations between yarn courses, sheen lobe."""
    mat, g, bsdf, _ = new_material(name)
    cells = 18.0
    _, u, v = g.uv((repeat[0], repeat[1], 1.0))
    qy = g.math("MULTIPLY", v, cells)
    row = g.math("FLOOR", qy)
    qx = g.math("MULTIPLY_ADD", g.math("MODULO", row, 2.0), 0.5, g.math("MULTIPLY", u, cells))
    fx = g.math("ABSOLUTE", g.math("SUBTRACT", g.math("FRACT", qx), 0.5))
    fy = g.math("ABSOLUTE", g.math("SUBTRACT", g.math("FRACT", qy), 0.5))
    d = g.math("MULTIPLY_ADD", fx, 1.15, fy)
    hole = g.smooth(d, 0.16, 0.24, 1.0, 0.0)
    courses = g.math("MULTIPLY_ADD", g.math("SINE", g.math("MULTIPLY", qy, 6 * math.pi)), 0.5, 0.5)
    solid = g.math("SUBTRACT", 1.0, hole)
    height = g.math("MULTIPLY", solid, g.math("MULTIPLY_ADD", courses, 0.25, 0.55))
    value = g.math("MULTIPLY_ADD", g.math("MULTIPLY", solid, g.math("MULTIPLY_ADD", height, 0.18, 0.82)), 0.78, 0.22)
    g.link(g.scale_color(hex_rgb(colour), value), inp(bsdf, ["Base Color"]))
    g.link(g.math("MULTIPLY_ADD", hole, 0.22, 0.74), inp(bsdf, ["Roughness"]))
    set_input(bsdf, ["Sheen Weight", "Sheen"], 0.18)
    set_input(bsdf, "Sheen Roughness", 0.5)
    set_input(bsdf, "Sheen Tint", hex_rgb("#3a5cff"))
    g.link(g.bump(height, 0.5, 0.0006), inp(bsdf, ["Normal"]))
    set_input(bsdf, ["Emission Color", "Emission"], hex_rgb(COLORWAY["air_tint"]))
    set_input(bsdf, "Emission Strength", 0.0)
    return mat


def mat_simple(name: str, colour: str, roughness: float, *, sheen=0.0, coat=0.0, coat_rough=0.3, bump=0.0, bump_scale=400.0, metallic=0.0):
    mat, g, bsdf, _ = new_material(name)
    set_input(bsdf, "Base Color", hex_rgb(colour))
    set_input(bsdf, "Roughness", roughness)
    set_input(bsdf, "Metallic", metallic)
    if sheen:
        set_input(bsdf, ["Sheen Weight", "Sheen"], sheen)
    if coat:
        set_input(bsdf, ["Coat Weight", "Clearcoat"], coat)
        set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], coat_rough)
    if bump:
        noise = g.node("ShaderNodeTexNoise")
        inp(noise, ["Scale"]).default_value = bump_scale
        inp(noise, ["Detail"]).default_value = 3.0
        g.link(g.bump(noise.outputs["Fac"], bump, 0.0003), inp(bsdf, ["Normal"]))
    set_input(bsdf, ["Emission Color", "Emission"], hex_rgb(COLORWAY["air_tint"]))
    set_input(bsdf, "Emission Strength", 0.0)
    return mat, bsdf


def mat_outsole(name: str, colour: str):
    """Rubber: staggered lug field (Voronoi) cut by transverse flex grooves (bands)."""
    mat, g, bsdf, _ = new_material(name)
    set_input(bsdf, "Base Color", hex_rgb(colour))
    set_input(bsdf, "Roughness", 0.68)
    vec, u, _ = g.uv((1.0, 1.0, 1.0))
    vor = g.node("ShaderNodeTexVoronoi")
    inp(vor, ["Scale"]).default_value = 13.0
    g.link(vec, inp(vor, ["Vector"]))
    lug = g.smooth(vor.outputs["Distance"], 0.32, 0.42, 1.0, 0.0)
    groove = g.smooth(g.math("ABSOLUTE", g.math("SUBTRACT", g.math("FRACT", g.math("MULTIPLY", u, 4.0)), 0.5)), 0.44, 0.49, 0.0, 1.0)
    height = g.math("MULTIPLY", lug, g.math("SUBTRACT", 1.0, g.math("MULTIPLY", groove, 0.85)))
    g.link(g.bump(height, 0.6, 0.0008), inp(bsdf, ["Normal"]))
    set_input(bsdf, ["Emission Color", "Emission"], hex_rgb(COLORWAY["air_tint"]))
    set_input(bsdf, "Emission Strength", 0.0)
    return mat


def build_materials():
    return {
        "upper": mat_knit("DN_Upper_EngineeredMesh", COLORWAY["upper"]),
        "tongue": mat_knit("DN_Tongue_Knit", COLORWAY["accent"], (4.0, 3.0)),
        "overlay": mat_simple("DN_Overlay_SyntheticLeather", COLORWAY["accent"], 0.42, coat=0.25, coat_rough=0.35, bump=0.08, bump_scale=900)[0],
        "collar": mat_simple("DN_Collar_Padding", COLORWAY["accent"], 0.9, sheen=0.4, bump=0.1, bump_scale=600)[0],
        "laces": mat_simple("DN_Laces", "#0c0d11", 0.78, sheen=0.25)[0],
        "midsole": mat_simple("DN_Midsole_Foam", COLORWAY["midsole"], 0.58, sheen=0.12, bump=0.12, bump_scale=480)[0],
        "outsole": mat_outsole("DN_Outsole_Rubber", COLORWAY["outsole"]),
        "airRear": mat_air("DN_Air_RearChamber", COLORWAY["air_tint"]),
        "airFront": mat_air("DN_Air_FrontChamber", COLORWAY["air_tint"]),
        "carbon": mat_carbon("DN_Shank_CarbonTPU"),
    }


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def add_solidify(obj, thickness, offset=-1.0):
    mod = obj.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = offset
    mod.use_even_offset = True
    mod.use_quality_normals = True


# ---------------------------------------------------------------- the sneaker


def build_sneaker(spec: Spec, mats: dict, collection):
    root = empty("DN_Root", collection)
    parts = {cid: empty(f"DN_{cid}", collection, root) for cid in ("outsole", "rearChamber", "frontChamber", "shank", "midsole", "upper")}

    assign(mesh_object("DN_Outsole", build_outsole(spec), collection, parts["outsole"]), mats["outsole"])
    assign(mesh_object("DN_Midsole_Foam", build_midsole(spec), collection, parts["midsole"]), mats["midsole"])
    assign(mesh_object("DN_Shank_CarbonTPU", build_shank(spec), collection, parts["shank"]), mats["carbon"])

    tube_objs = []
    for i, tube in enumerate(spec.tubes()):
        mat = mats["airRear"] if tube["chamber"] == "rearChamber" else mats["airFront"]
        obj = mesh_object(f"DN_AirTube_{i}_{tube['chamber']}", build_tube(tube), collection, parts[tube["chamber"]])
        assign(obj, mat)
        obj.location = to_blender((spec.x_at(tube["t"]), tube["bottom"], (tube["zMin"] + tube["zMax"]) / 2))
        tube_objs.append(obj)
    for cid in ("rearChamber", "frontChamber"):
        assign(mesh_object(f"DN_AirFlange_{cid}", build_flange(spec, cid), collection, parts[cid]), mats["airRear" if cid == "rearChamber" else "airFront"])

    upper = mesh_object("DN_Upper_Mesh", build_upper(spec), collection, parts["upper"])
    assign(upper, mats["upper"])
    add_solidify(upper, 0.0014)
    for oid in ("mudguard", "heelCounter"):
        ov = mesh_object(f"DN_Overlay_{oid}", build_overlay(spec, oid), collection, parts["upper"])
        assign(ov, mats["overlay"])
        add_solidify(ov, 0.0006, 1.0)
    tongue = mesh_object("DN_Tongue", build_tongue(spec), collection, parts["upper"])
    assign(tongue, mats["tongue"])
    add_solidify(tongue, 0.0025)
    assign(mesh_object("DN_Collar", build_collar(spec), collection, parts["upper"]), mats["collar"])
    assign(mesh_object("DN_Laces", build_laces(spec), collection, parts["upper"]), mats["laces"])
    return root, parts, tube_objs


# --------------------------------------------------------------- world + rig


def build_world(hdri: Path | None):
    world = bpy.data.worlds.new("DN_Fill") if bpy.context.scene.world is None else bpy.context.scene.world
    bpy.context.scene.world = world
    nt = node_tree_of(world)
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    g = Graph(nt)
    if hdri is not None:
        env = g.node("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(str(hdri), check_existing=True)
        g.link(env.outputs["Color"], bg.inputs["Color"])
    else:
        # Procedural light-box (same panels as the realtime PMREM environment): overhead
        # softbox, tungsten key strip, cold rim strip, faint fill, near-black surround.
        tc = g.node("ShaderNodeTexCoord")
        direction = tc.outputs["Generated"]

        def lobe(dir3, cos_inner, cos_outer):
            dn = Vector(dir3).normalized()
            dot = g.node("ShaderNodeVectorMath", operation="DOT_PRODUCT")
            g.link(direction, dot.inputs[0])
            dot.inputs[1].default_value = tuple(dn)
            return g.smooth(dot.outputs["Value"], cos_outer, cos_inner)

        def tint(mask, colour, power):
            scale = g.node("ShaderNodeVectorMath", operation="SCALE")
            scale.inputs[0].default_value = tuple(c * power for c in hex_rgb(colour)[:3])
            g.link(mask, inp(scale, ["Scale"]))
            return scale.outputs[0]

        def add(a, b):
            n = g.node("ShaderNodeVectorMath", operation="ADD")
            g.link(a, n.inputs[0])
            g.link(b, n.inputs[1])
            return n.outputs[0]

        panels = [
            tint(lobe(to_blender((0, 6, 0.5)), 0.93, 0.86), "#ffe3c4", 3.2),
            tint(lobe(to_blender((-5, 2.2, 3)), 0.985, 0.96), "#ffb36b", 9.0),
            tint(lobe(to_blender((4.5, 2.4, -4)), 0.985, 0.96), "#6d8cff", 7.0),
            tint(lobe(to_blender((0, 1.4, 6)), 0.95, 0.85), "#c9ccd6", 0.55),
        ]
        acc = panels[0]
        for p in panels[1:]:
            acc = add(acc, p)
        base = g.node("ShaderNodeVectorMath", operation="ADD")
        g.link(acc, base.inputs[0])
        base.inputs[1].default_value = (0.004, 0.0042, 0.005)
        g.link(base.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    return world, bg


def area_light(name: str, collection, colour: str, shape: str, size: float, size_y: float, energy: float, spread_deg: float):
    data = bpy.data.lights.new(name, "AREA")
    data.shape = shape
    data.size = size
    if shape in ("RECTANGLE", "ELLIPSE"):
        data.size_y = size_y
    data.energy = energy
    data.color = hex_rgb(colour)[:3]
    if hasattr(data, "spread"):
        data.spread = math.radians(spread_deg)
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.rotation_mode = "QUATERNION"
    return obj


def build_rig(collection):
    cam_data = bpy.data.cameras.new("DN_Camera")
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.sensor_width = 36.0
    cam_data.clip_start = 0.004
    cam_data.clip_end = 60.0
    cam_data.dof.use_dof = True
    cam_data.dof.aperture_blades = 9
    cam_data.dof.aperture_rotation = math.radians(10)
    cam = bpy.data.objects.new("DN_Camera", cam_data)
    cam.rotation_mode = "QUATERNION"
    collection.objects.link(cam)
    bpy.context.scene.camera = cam
    # Wattages are calibrated to the realtime rig: a one-sided Lambertian area light of
    # power P has on-axis intensity P/pi, so P = pi * I matches three.js's I candela
    # (key 6 cd, rim 18 cd, accent 20 cd) at the same distance - the plates expose like the comp.
    lights = {
        # Warm key: large soft source. Cold rim: tall strip. Accent: small hard kicker.
        "key": area_light("DN_Key_Warm", collection, "#ffe3c4", "SQUARE", 0.55, 0.55, math.pi * 6, 120),
        "rim": area_light("DN_Rim_Cold", collection, "#6d8cff", "RECTANGLE", 0.16, 0.9, math.pi * 18, 70),
        "accent": area_light("DN_Accent", collection, "#ffe3c4", "DISK", 0.06, 0.06, math.pi * 20, 30),
    }
    shadow_plane = bpy.data.meshes.new("DN_ShadowCatcher")
    s = 3.0
    shadow_plane.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    floor = bpy.data.objects.new("DN_ShadowCatcher", shadow_plane)
    collection.objects.link(floor)
    if hasattr(floor, "is_shadow_catcher"):
        floor.is_shadow_catcher = True
    return cam, lights, floor


# ---------------------------------------------------------------- choreography


class Choreography:
    """Per-frame tracks from shared/choreography.bake.json, or a built-in hero path."""

    def __init__(self, path: Path, spec: Spec):
        self.baked = path.is_file()
        self.spec = spec
        if self.baked:
            with open(path, "r", encoding="utf-8") as fh:
                self.d = json.load(fh)
            if self.d.get("fps") != FPS or self.d.get("frames") != DURATION:
                raise SystemExit(f"bake {path} is {self.d.get('frames')}f @ {self.d.get('fps')} fps; expected {DURATION} @ {FPS}")
        else:
            print(f"[render_assets] no bake at {path} - using the built-in 28-85 mm camera path. Run `npm run bake` for timeline-locked plates.")

    @staticmethod
    def _v3(arr, f):
        return (arr[f * 3], arr[f * 3 + 1], arr[f * 3 + 2])

    @staticmethod
    def _q4(arr, f):
        return (arr[f * 4], arr[f * 4 + 1], arr[f * 4 + 2], arr[f * 4 + 3])

    def camera(self, f):
        if self.baked:
            c = self.d["camera"]
            return {
                "position": self._v3(c["position"], f),
                "target": self._v3(c["target"], f),
                "up": self._v3(c["up"], f),
                "focal": c["focal"][f],
                "focus": c["focus"][f],
                "fstop": c["fStop"][f],
                "cut": c["cut"][f],
            }
        # Built-in path: one slow 300-degree orbit, lens breathing 28 -> 85 -> 50 mm,
        # focus locked on the heel unit.
        u = f / (DURATION - 1)
        ease = 0.5 - 0.5 * math.cos(math.pi * u)
        az = math.radians(-30 + 300 * ease)
        focal = 28 + (85 - 28) * math.sin(math.pi * min(1.0, u * 1.6)) ** 2 if u < 0.625 else lerp(85, 50, (u - 0.625) / 0.375)
        dist = 0.26 * focal / 35 + 0.12
        el = math.radians(6 + 10 * math.sin(2 * math.pi * u))
        target = (-0.09 * (1 - ease), 0.03 + 0.03 * ease, 0.0)
        pos = (target[0] + dist * math.cos(el) * math.sin(az), target[1] + dist * math.sin(el), target[2] + dist * math.cos(el) * math.cos(az))
        focus = v_len(v_sub(target, pos))
        return {"position": pos, "target": target, "up": (0, 1, 0), "focal": focal, "focus": focus, "fstop": clamp(0.03 * (focal / 1000) ** 2 / (2 * 0.00003 * focus * focus), 1.4, 64), "cut": 0}

    def root(self, f):
        if self.baked:
            r = self.d["root"]
            return self._v3(r["position"], f), self._q4(r["quaternion"], f)
        return (0, 0, 0), (0, 0, 0, 1)

    def component(self, cid, f):
        if self.baked:
            c = self.d["components"][cid]
            return self._v3(c["position"], f), self._q4(c["quaternion"], f)
        return (0, 0, 0), (0, 0, 0, 1)

    def tube(self, i, f, rest_position):
        if self.baked:
            t = self.d["tubes"][i]
            return self._v3(t["position"], f), self._v3(t["scale"], f)
        # Built-in: a gentle 1 Hz breathing compression so the pods read as pressurised.
        c = 0.12 * max(0.0, math.sin(2 * math.pi * f / FPS)) ** 3
        return rest_position, (1 + 0.9 * c, 1 - c, 1)

    def light(self, lid, f):
        if self.baked:
            lamp = self.d["lights"][lid]
            return self._v3(lamp["position"], f), self._v3(lamp["target"], f), lamp["level"][f], lamp["color"][f]
        cam = self.camera(f)
        tgt = cam["target"]
        fwd = Vector(v_sub(tgt, cam["position"])).normalized()
        right = fwd.cross(Vector((0, 1, 0))).normalized()
        upv = right.cross(fwd)
        rig = {"key": (-0.9, 0.8, 0.6, 1.0, "#ffe3c4"), "rim": (0.75, 0.55, -1.0, 1.0, "#6d8cff"), "accent": (0, 1, 0, 0.0, "#ffe3c4")}[lid]
        d = right * rig[0] + upv * rig[1] - fwd * rig[2]
        pos = Vector(tgt) + d.normalized() * 0.9
        return tuple(pos), tgt, rig[3], rig[4]

    def env(self, f):
        return self.d["lights"]["env"][f] if self.baked else 1.0

    def highlight(self, cid, f):
        return self.d["highlight"][cid][f] if self.baked else 0.0


# ------------------------------------------------------------------- animation


def keyed(obj, path, f, index=-1):
    obj.keyframe_insert(data_path=path, frame=f, index=index)


def set_interpolation(kind: str):
    prefs = bpy.context.preferences.edit
    if hasattr(prefs, "keyframe_new_interpolation_type"):
        prefs.keyframe_new_interpolation_type = kind


def look_rotation(position: Vector, target: Vector, up: Vector) -> Quaternion:
    """Camera/light orientation: local -Z toward target, local +Y toward `up` (three.js lookAt convention)."""
    z = (position - target).normalized()
    x = up.cross(z)
    if x.length < 1e-8:
        x = Vector((1, 0, 0)).cross(z)
    x.normalize()
    y = z.cross(x)
    return Matrix((x, y, z)).transposed().to_quaternion()


def continuous(q: Quaternion, prev: Quaternion | None) -> Quaternion:
    if prev is not None and q.dot(prev) < 0:
        return Quaternion((-q.w, -q.x, -q.y, -q.z))
    return q


def animate(choreo: Choreography, frames: list[int], root, parts, tube_objs, cam, lights, mats, world_bg, base_env: float):
    """Keys every needed frame (+/- 1 for motion blur). Keys before a camera cut are CONSTANT."""
    needed = sorted({g for f in frames for g in (f - 1, f, f + 1) if 0 <= g < DURATION})
    prev: dict[str, Quaternion] = {}
    rest = {i: tuple(o.location) for i, o in enumerate(tube_objs)}
    base_energy = {k: v.data.energy for k, v in lights.items()}
    t0 = time.time()
    for f in needed:
        bf = f  # Blender frame == Remotion frame (the timeline starts at 0)
        cut_next = f + 1 < DURATION and choreo.camera(f)["cut"] != choreo.camera(f + 1)["cut"]

        pos, q = choreo.root(f)
        root.location = to_blender(pos)
        root.rotation_quaternion = prev["root"] = continuous(quat_to_blender(q), prev.get("root"))
        keyed(root, "location", bf)
        keyed(root, "rotation_quaternion", bf)
        for cid, obj in parts.items():
            pos, q = choreo.component(cid, f)
            obj.location = to_blender(pos)
            obj.rotation_quaternion = prev[cid] = continuous(quat_to_blender(q), prev.get(cid))
            keyed(obj, "location", bf)
            keyed(obj, "rotation_quaternion", bf)
        for i, obj in enumerate(tube_objs):
            rest_three = (rest[i][0], rest[i][2], -rest[i][1])
            pos, sc = choreo.tube(i, f, rest_three)
            obj.location = to_blender(pos)
            obj.scale = (sc[0], sc[2], sc[1])  # three (x, y-up, z) -> Blender (x, y=z, z=y)
            keyed(obj, "location", bf)
            keyed(obj, "scale", bf)

        set_interpolation("CONSTANT" if cut_next else "LINEAR")
        c = choreo.camera(f)
        cpos = to_blender(c["position"])
        cam.location = cpos
        cam.rotation_quaternion = prev["cam"] = continuous(look_rotation(cpos, to_blender(c["target"]), to_blender(c["up"])), prev.get("cam"))
        cam.data.lens = c["focal"]
        cam.data.dof.focus_distance = c["focus"]
        cam.data.dof.aperture_fstop = c["fstop"]
        keyed(cam, "location", bf)
        keyed(cam, "rotation_quaternion", bf)
        cam.data.keyframe_insert("lens", frame=bf)
        cam.data.dof.keyframe_insert("focus_distance", frame=bf)
        cam.data.dof.keyframe_insert("aperture_fstop", frame=bf)
        for lid, obj in lights.items():
            lpos, ltgt, level, colour = choreo.light(lid, f)
            p, tg = to_blender(lpos), to_blender(ltgt)
            obj.location = p
            obj.rotation_quaternion = prev[lid] = continuous(look_rotation(p, tg, Vector((0, 0, 1))), prev.get(lid))
            obj.data.energy = base_energy[lid] * level
            obj.data.color = hex_rgb(colour)[:3]
            keyed(obj, "location", bf)
            keyed(obj, "rotation_quaternion", bf)
            obj.data.keyframe_insert("energy", frame=bf)
            obj.data.keyframe_insert("color", frame=bf)
        set_interpolation("LINEAR")

        world_bg.inputs["Strength"].default_value = base_env * choreo.env(f)
        world_bg.inputs["Strength"].keyframe_insert("default_value", frame=bf)
        for cid, mat_key, gain in (("rearChamber", "airRear", 0.9), ("frontChamber", "airFront", 0.9), ("shank", "carbon", 0.25), ("midsole", "midsole", 0.06), ("upper", "upper", 0.1)):
            sock = mats[mat_key].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
            sock.default_value = gain * choreo.highlight(cid, f)
            sock.keyframe_insert("default_value", frame=bf)
    print(f"[render_assets] keyed {len(needed)} frames in {time.time() - t0:.1f}s")


# ------------------------------------------------------------------- render


def engine_id(kind: str) -> str:
    items = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    if kind == "cycles":
        return "CYCLES"
    return "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in items else "BLENDER_EEVEE"


def configure_cycles_device(scene, preference: str) -> str:
    if preference == "cpu":
        scene.cycles.device = "CPU"
        return "CPU"
    try:
        cprefs = bpy.context.preferences.addons["cycles"].preferences
    except KeyError:
        scene.cycles.device = "CPU"
        return "CPU"
    for backend in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
        try:
            cprefs.compute_device_type = backend
        except TypeError:
            continue
        if hasattr(cprefs, "refresh_devices"):
            cprefs.refresh_devices()
        else:
            cprefs.get_devices()
        devices = [d for d in cprefs.devices if d.type == backend]
        if devices:
            for d in cprefs.devices:
                d.use = d.type == backend
            scene.cycles.device = "GPU"
            return backend
    if preference == "gpu":
        raise SystemExit("[render_assets] --device gpu requested but no OptiX/CUDA/HIP/Metal/oneAPI device found")
    scene.cycles.device = "CPU"
    return "CPU"


def configure_render(scene, args, width: int, height: int) -> str:
    scene.render.engine = engine_id(args.engine)
    scene.render.fps = FPS
    scene.render.fps_base = 1.0
    scene.frame_start = 0
    scene.frame_end = DURATION - 1
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = args.percentage
    scene.render.film_transparent = True
    scene.render.use_motion_blur = not args.no_motion_blur
    if hasattr(scene.render, "motion_blur_shutter"):
        scene.render.motion_blur_shutter = 0.5  # 180-degree shutter
    # Plates are graded downstream: PNG gets a plain sRGB transfer (Remotion applies AgX once),
    # EXR stays scene-linear.
    vs = scene.view_settings
    try:
        vs.view_transform = "Standard"
        vs.look = "None"
    except TypeError:
        pass
    vs.exposure = 0.0
    vs.gamma = 1.0
    device = "n/a"
    if scene.render.engine == "CYCLES":
        cy = scene.cycles
        device = configure_cycles_device(scene, args.device)
        cy.samples = args.samples or 256
        cy.use_adaptive_sampling = True
        cy.adaptive_threshold = 0.008
        cy.max_bounces = 16
        cy.diffuse_bounces = 4
        cy.glossy_bounces = 6
        cy.transmission_bounces = 14
        cy.transparent_max_bounces = 16
        cy.volume_bounces = 2
        cy.caustics_reflective = False
        cy.caustics_refractive = False
        cy.blur_glossy = 0.6
        cy.sample_clamp_indirect = 8.0
        cy.use_denoising = not args.no_denoise
        if cy.use_denoising:
            try:
                cy.denoiser = "OPTIX" if device == "OPTIX" else "OPENIMAGEDENOISE"
            except TypeError:
                pass
        if hasattr(cy, "film_exposure"):
            cy.film_exposure = 1.0
    else:
        ee = scene.eevee
        ee.taa_render_samples = args.samples or 64
        for attr, value in (("use_raytracing", True), ("use_shadows", True), ("use_gtao", True)):
            if hasattr(ee, attr):
                setattr(ee, attr, value)
    vl = scene.view_layers[0]
    for attr in ("use_pass_z", "use_pass_normal", "use_pass_vector", "use_pass_mist", "use_pass_emit", "use_pass_cryptomatte_object"):
        if hasattr(vl, attr):
            setattr(vl, attr, True)
    return device


def configure_output(scene, fmt: str):
    s = scene.render.image_settings
    multilayer = fmt == "exr-multilayer"
    if hasattr(s, "media_type"):  # Blender 5.x splits "what kind of file" from "which codec"
        s.media_type = "MULTI_LAYER_IMAGE" if multilayer else "IMAGE"
    wanted = "OPEN_EXR_MULTILAYER" if multilayer else ("OPEN_EXR" if fmt == "exr" else "PNG")
    try:
        s.file_format = wanted
    except TypeError:
        s.file_format = "OPEN_EXR"
    s.color_mode = "RGBA"
    if fmt.startswith("exr"):
        s.color_depth = "16"
        s.exr_codec = "DWAA" if multilayer else "ZIP"
    else:
        s.color_depth = "16"
        s.compression = 15


OUTPUT_DIRS = {"exr": ("beauty", "exr"), "png": ("png", "png"), "exr-multilayer": ("passes", "exr")}


def output_path(root: Path, fmt: str, frame: int) -> Path:
    folder, ext = OUTPUT_DIRS[fmt]
    return root / folder / f"frame_{frame:04d}.{ext}"


def render_frames(scene, frames: list[int], formats: list[str], out_root: Path, resume: bool):
    for fmt in formats:
        (out_root / OUTPUT_DIRS[fmt][0]).mkdir(parents=True, exist_ok=True)
    total = len(frames)
    t_start = time.time()
    for n, f in enumerate(frames, 1):
        targets = [(fmt, output_path(out_root, fmt, f)) for fmt in formats]
        if resume and all(p.is_file() for _, p in targets):
            continue
        scene.frame_set(f)
        t0 = time.time()
        layered = [(fmt, p) for fmt, p in targets if fmt == "exr-multilayer"]
        if layered:
            # Only the render operator writes every enabled pass (Blender 5.x: as multipart EXR).
            configure_output(scene, "exr-multilayer")
            scene.render.filepath = str(layered[0][1])
            bpy.ops.render.render(write_still=True)
        else:
            bpy.ops.render.render(write_still=False)
        result = bpy.data.images["Render Result"]
        for fmt, path in targets:
            if fmt == "exr-multilayer":
                continue
            configure_output(scene, fmt)
            result.save_render(filepath=str(path), scene=scene)
        elapsed = time.time() - t_start
        eta = elapsed / n * (total - n)
        print(f"[render_assets] frame {f:4d} ({n}/{total}) {time.time() - t0:5.1f}s  eta {eta / 60:5.1f} min", flush=True)


# --------------------------------------------------------------------- main


def main():
    args = parse_args()
    if not args.spec.is_file():
        raise SystemExit(f"[render_assets] spec not found: {args.spec}")
    with open(args.spec, "r", encoding="utf-8") as fh:
        spec = Spec(json.load(fh))
    width, height = (int(x) for x in args.resolution.lower().split("x"))
    frames = parse_frames(args.frames, args.step)
    if not frames:
        raise SystemExit("[render_assets] --frames selected nothing")

    # Clean slate (factory scene objects, default cube/camera/light).
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    collection = bpy.data.collections.new("AirMaxDn")
    scene.collection.children.link(collection)

    mats = build_materials()
    root, parts, tube_objs = build_sneaker(spec, mats, collection)
    cam, lights, _floor = build_rig(collection)
    _world, world_bg = build_world(args.hdri)
    base_env = 0.35 if args.hdri is None else 0.6

    choreo = Choreography(args.bake, spec)
    animate(choreo, frames if args.save_blend is None else list(range(DURATION)), root, parts, tube_objs, cam, lights, mats, world_bg, base_env)
    device = configure_render(scene, args, width, height)

    print(
        f"[render_assets] Blender {bpy.app.version_string} | {scene.render.engine} on {device} | "
        f"{width}x{height}@{args.percentage}% | {len(frames)} frames | formats {args.formats} | "
        f"{'bake: ' + str(args.bake) if choreo.baked else 'built-in camera path'}"
    )
    if args.save_blend is not None:
        args.save_blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(args.save_blend.resolve()))
        print(f"[render_assets] saved {args.save_blend}")
    if args.dry_run:
        return

    out_root = args.out.resolve()
    render_frames(scene, frames, args.formats, out_root, args.resume)
    manifest = {
        "generator": "blender/render_assets.py",
        "blender": bpy.app.version_string,
        "engine": scene.render.engine,
        "device": device,
        "fps": FPS,
        "resolution": [width * args.percentage // 100, height * args.percentage // 100],
        "frames": [frames[0], frames[-1]],
        "count": len(frames),
        "formats": {fmt: OUTPUT_DIRS[fmt][0] + "/frame_####." + OUTPUT_DIRS[fmt][1] for fmt in args.formats},
        "colour": {"exr": "scene-linear Rec.709, premultiplied alpha", "png": "sRGB (Standard view transform), straight alpha"},
        "naming": "frame index = Remotion frame = Blender frame",
        "choreography": str(args.bake) if choreo.baked else "built-in",
    }
    out_root.mkdir(parents=True, exist_ok=True)
    with open(out_root / "manifest.json", "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"[render_assets] done -> {out_root}")


if __name__ == "__main__":
    main()
