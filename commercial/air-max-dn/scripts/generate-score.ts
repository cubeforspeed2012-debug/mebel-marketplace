// Procedural score + sound design -> public/audio/score.wav (48 kHz / 24-bit / stereo).
//
// Nothing here is hand-timed: every hit is read from src/choreo/timeline.ts and
// src/choreo/physics.ts, the same modules that drive the picture. Sub hits land on
// the hook cuts, the air hiss follows the chambers' real compression rate (dV/dt),
// foot strikes thump on the stride, the orbit whoosh pans with the camera, and the
// end-card thud fires on the solved bounce impacts.
//
//   node scripts/generate-score.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  BEAT,
  CALLOUTS,
  DURATION_IN_FRAMES,
  EXPLODE,
  FLASH_OUT,
  FPS,
  HOOK_HITS,
  LOCKUP,
  MATTE,
  ORBIT,
  PEAK_PULSES,
  SCENES,
  STRIKES,
  STROBE,
  WHIP,
} from '../src/choreo/timeline.ts';
import { compressionAt, DROP_IMPACTS } from '../src/choreo/physics.ts';
import { EASE, clamp, invLerp } from '../src/choreo/math.ts';

const SR = 48000;
const N = Math.ceil((DURATION_IN_FRAMES / FPS) * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const sendL = new Float32Array(N); // reverb send
const sendR = new Float32Array(N);

const sec = (frame: number) => frame / FPS;
const BEAT_S = BEAT / FPS;

/* ------------------------------------------------------------ primitives */

let seed = 0x2f55ff;
const rand = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 4294967296) * 2 - 1;
};

const panGains = (pan: number): [number, number] => {
  const a = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
};

const put = (i: number, v: number, pan: number, send = 0) => {
  if (i < 0 || i >= N) return;
  const [gl, gr] = panGains(pan);
  L[i] += v * gl;
  R[i] += v * gr;
  if (send) {
    sendL[i] += v * gl * send;
    sendR[i] += v * gr * send;
  }
};

/** RBJ biquad, coefficients recomputable per sample for sweeps. */
class Biquad {
  private b0 = 1; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  set(type: 'lp' | 'hp' | 'bp', freq: number, q: number) {
    const w = (2 * Math.PI * clamp(freq, 10, SR * 0.45)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0: number, b1: number, b2: number;
    if (type === 'lp') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
    else if (type === 'hp') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; }
    const a0 = 1 + alpha;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0; this.a2 = (1 - alpha) / a0;
    return this;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** Band-limited saw (polyBLEP). */
const sawBlep = (phase: number, dt: number) => {
  let v = 2 * phase - 1;
  if (phase < dt) { const t = phase / dt; v -= t + t - t * t - 1; }
  else if (phase > 1 - dt) { const t = (phase - 1) / dt; v -= t * t + t + t + 1; }
  return v;
};

/* ----------------------------------------------------------------- voices */

/** Sub hit: 130 -> 41 Hz exponential drop, long sine body, transient click. */
const subHit = (t0: number, strength: number) => {
  const start = Math.round(t0 * SR);
  const len = Math.round(1.4 * SR);
  let phase = 0;
  const click = new Biquad().set('bp', 3200, 0.9);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const f = 41 + 89 * Math.exp(-t / 0.045);
    phase += (2 * Math.PI * f) / SR;
    const body = Math.sin(phase) * Math.exp(-t / (0.32 + 0.12 * strength)) * Math.min(1, t / 0.0015);
    const tick = click.run(rand()) * Math.exp(-t / 0.004) * 0.6;
    const v = Math.tanh(1.6 * (body * 0.9 + tick)) * 0.62 * strength;
    put(start + n, v, 0, 0.04);
  }
};

const kick = (t0: number, gain: number) => {
  const start = Math.round(t0 * SR);
  let phase = 0;
  for (let n = 0; n < 0.5 * SR; n++) {
    const t = n / SR;
    const f = 48 + 102 * Math.exp(-t / 0.03);
    phase += (2 * Math.PI * f) / SR;
    put(start + n, Math.tanh(2 * Math.sin(phase) * Math.exp(-t / 0.16)) * 0.42 * gain, 0);
  }
};

const noiseBurst = (t0: number, dur: number, type: 'lp' | 'hp' | 'bp', freq: number, q: number, decay: number, gain: number, pan: number, send = 0) => {
  const start = Math.round(t0 * SR);
  const fl = new Biquad().set(type, freq, q);
  const fr = new Biquad().set(type, freq, q);
  for (let n = 0; n < dur * SR; n++) {
    const t = n / SR;
    const env = Math.exp(-t / decay) * Math.min(1, t / 0.0008);
    const [gl, gr] = panGains(pan);
    const vl = fl.run(rand()) * env * gain;
    const vr = fr.run(rand()) * env * gain;
    const i = start + n;
    if (i >= N) break;
    L[i] += vl * gl * 1.2;
    R[i] += vr * gr * 1.2;
    sendL[i] += vl * send;
    sendR[i] += vr * send;
  }
};

const clap = (t0: number, gain: number) => {
  for (let k = 0; k < 3; k++) noiseBurst(t0 + k * 0.011, 0.25, 'bp', 1250, 1.1, k === 2 ? 0.11 : 0.012, 0.5 * gain, 0, 0.35);
};

const hat = (t0: number, gain: number, pan: number) => noiseBurst(t0, 0.08, 'hp', 8200, 0.7, 0.022, 0.22 * gain, pan, 0.05);

/** UI lock-on blip for the callouts: two-partial sine ping with a fast pitch settle. */
const blip = (t0: number, freq: number, pan: number) => {
  const start = Math.round(t0 * SR);
  let p1 = 0;
  let p2 = 0;
  for (let n = 0; n < 0.35 * SR; n++) {
    const t = n / SR;
    const f = freq * (1 + 0.06 * Math.exp(-t / 0.01));
    p1 += (2 * Math.PI * f) / SR;
    p2 += (2 * Math.PI * f * 2.76) / SR;
    const env = Math.exp(-t / 0.07) * Math.min(1, t / 0.001);
    put(start + n, (Math.sin(p1) + 0.25 * Math.sin(p2)) * env * 0.12, pan, 0.4);
  }
};

/** Filtered-noise sweep: risers (up) and whooshes (band sweep with pan travel). */
const sweep = (t0: number, t1: number, f0: number, f1: number, gain: (u: number) => number, pan: (u: number) => number, q = 2.5, send = 0.2) => {
  const start = Math.round(t0 * SR);
  const len = Math.round((t1 - t0) * SR);
  const fl = new Biquad();
  const fr = new Biquad();
  for (let n = 0; n < len; n++) {
    const u = n / len;
    if (n % 32 === 0) {
      const f = f0 * Math.pow(f1 / f0, u);
      fl.set('bp', f, q);
      fr.set('bp', f * 1.03, q);
    }
    const g = gain(u);
    const [gl, gr] = panGains(pan(u));
    const i = start + n;
    if (i >= N) break;
    const vl = fl.run(rand()) * g;
    const vr = fr.run(rand()) * g;
    L[i] += vl * gl;
    R[i] += vr * gr;
    sendL[i] += vl * send;
    sendR[i] += vr * send;
  }
};

/** Detuned-saw pad through a slowly opening low-pass. */
const pad = (t0: number, t1: number, notes: number[], gain: number, attack: number, release: number, cutoff: (u: number) => number) => {
  const start = Math.round(t0 * SR);
  const len = Math.round((t1 - t0 + release) * SR);
  const hold = (t1 - t0) * SR;
  const voices = notes.flatMap((f) => [f * 0.997, f * 1.003]);
  const phases = voices.map((_, i) => (i * 0.137) % 1);
  const fl = new Biquad();
  const fr = new Biquad();
  for (let n = 0; n < len; n++) {
    const u = Math.min(1, n / hold);
    if (n % 64 === 0) {
      fl.set('lp', cutoff(u), 0.7);
      fr.set('lp', cutoff(u) * 1.04, 0.7);
    }
    let sl = 0;
    let sr = 0;
    voices.forEach((f, v) => {
      const dt = f / SR;
      phases[v] = (phases[v] + dt) % 1;
      const s = sawBlep(phases[v], dt);
      if (v % 2 === 0) sl += s;
      else sr += s;
    });
    const env = Math.min(1, n / (attack * SR)) * (n > hold ? Math.exp(-(n - hold) / (release * SR * 0.35)) : 1);
    const k = (gain * env) / voices.length;
    const i = start + n;
    if (i >= N) break;
    const vl = fl.run(sl) * k;
    const vr = fr.run(sr) * k;
    L[i] += vl;
    R[i] += vr;
    sendL[i] += vl * 0.5;
    sendR[i] += vr * 0.5;
  }
};

/** Offbeat saw bass, one note per bar. */
const bass = (t0: number, dur: number, freq: number, gain: number) => {
  const start = Math.round(t0 * SR);
  const fl = new Biquad();
  let phase = 0;
  for (let n = 0; n < dur * SR; n++) {
    const t = n / SR;
    if (n % 32 === 0) fl.set('lp', 220 + 1400 * Math.exp(-t / 0.06), 1.2);
    const dt = freq / SR;
    phase = (phase + dt) % 1;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.16);
    put(start + n, Math.tanh(1.5 * fl.run(sawBlep(phase, dt))) * env * 0.3 * gain, 0);
  }
};

/* -------------------------------------------------------- arrangement */

const A1 = 55;
const NOTE = (semis: number) => A1 * Math.pow(2, semis / 12);

// 1. Hook: sub hits on every cut, air hiss driven by the chambers' dV/dt.
HOOK_HITS.forEach((h) => subHit(sec(h.frame), h.strength));
{
  const fl = new Biquad().set('bp', 3600, 0.8);
  const fr = new Biquad().set('bp', 4100, 0.8);
  const end = Math.round(sec(SCENES.lockup.to) * SR);
  for (let i = 0; i < end; i++) {
    const frame = (i / SR) * FPS;
    const dc = (compressionAt('rear', frame + 0.5) - compressionAt('rear', frame - 0.5) + compressionAt('front', frame + 0.5) - compressionAt('front', frame - 0.5)) * FPS;
    const flow = Math.min(1, Math.abs(dc) / 8);
    if (flow < 1e-4) {
      fl.run(0);
      fr.run(0);
      continue;
    }
    const g = 0.09 * flow * (frame < SCENES.explode.from ? 1 : 0.55);
    L[i] += fl.run(rand()) * g;
    R[i] += fr.run(rand()) * g;
  }
}
// Low drone under the hook, opening up into the matte.
pad(0, sec(MATTE.start), [A1, A1 * 2], 0.35, 1.2, 0.4, (u) => 120 + 900 * u * u);

// 1>2. Riser into the Dn matte, whoosh through it.
sweep(sec(MATTE.start - 90), sec(MATTE.start + 8), 300, 6000, (u) => 0.22 * u * u, () => 0, 3, 0.25);
sweep(sec(MATTE.start + 10), sec(MATTE.end + 10), 5000, 220, (u) => 0.3 * Math.sin(Math.PI * u), (u) => -0.8 + 1.6 * u, 2, 0.3);

// 2. Explode: minimal pulse, pad, callout blips.
for (let f = EXPLODE.start; f < SCENES.velocity.from; f += BEAT) {
  kick(sec(f), 0.55);
  hat(sec(f + BEAT / 2), 0.6, 0.25);
}
pad(sec(EXPLODE.start - 10), sec(SCENES.velocity.from), [NOTE(12), NOTE(15), NOTE(19), NOTE(22), NOTE(26)], 0.32, 1.6, 0.8, (u) => 600 + 2400 * u);
[0, 1, 2, 3, 4].forEach((i) => blip(sec(CALLOUTS.start + i * CALLOUTS.stagger), [1760, 1975, 2217, 1975, 2637][i], i % 2 ? 0.35 : -0.35));
sweep(sec(EXPLODE.start - 4), sec(EXPLODE.start + 50), 180, 2400, (u) => 0.2 * Math.sin(Math.PI * u), () => 0, 2, 0.4);
sweep(sec(EXPLODE.reassemble - 4), sec(EXPLODE.reassemble + 40), 2400, 160, (u) => 0.22 * Math.sin(Math.PI * u), () => 0, 2, 0.4);

// 3. Velocity: full groove, strike thumps on the stride.
const progression = [NOTE(0), NOTE(-4), NOTE(3), NOTE(-2)];
for (let f = SCENES.velocity.from; f < WHIP.end; f += BEAT) {
  const beatIdx = Math.round((f - SCENES.velocity.from) / BEAT);
  kick(sec(f), 0.9);
  if (beatIdx % 2 === 1) clap(sec(f), 0.9);
  const bar = Math.floor(beatIdx / 4) % progression.length;
  bass(sec(f + BEAT / 2), BEAT_S * 0.45, progression[bar], 1);
  for (let k = 0; k < 4; k++) hat(sec(f) + k * BEAT_S * 0.25, k % 2 ? 0.5 : 0.85, k % 2 ? 0.3 : -0.3);
}
STRIKES.forEach((s) => {
  subHit(sec(s.frame), 0.42 * s.strength);
  noiseBurst(sec(s.frame), 0.12, 'bp', 900, 1.4, 0.03, 0.18, -0.15);
});
sweep(sec(WHIP.start), sec(WHIP.end + 6), 700, 7000, (u) => 0.4 * Math.sin(Math.PI * u), (u) => -1 + 2 * EASE.cubicInOut(u), 1.8, 0.2);

// 4. Peak: drop, orbit whoosh that pans with the camera, strobe ticks, white-out swell, silence.
subHit(sec(ORBIT.start), 1.2);
PEAK_PULSES.forEach((p) => kick(sec(p.frame), 0.8 * p.strength));
sweep(
  sec(ORBIT.start),
  sec(ORBIT.end),
  250,
  2600,
  (u) => 0.32 * Math.sin(Math.PI * u) ** 0.7,
  (u) => Math.sin(2 * Math.PI * EASE.quintInOut(u)),
  1.6,
  0.25,
);
STROBE.words.forEach((_, i) => {
  const t = sec(STROBE.start + i * STROBE.step);
  noiseBurst(t, 0.06, 'hp', 5200, 0.8, 0.012, 0.42, i % 2 ? 0.5 : -0.5, 0.15);
  blip(t, 3520, i % 2 ? 0.6 : -0.6);
});
sweep(sec(FLASH_OUT.start - 60), sec(FLASH_OUT.peak), 400, 9000, (u) => 0.35 * u ** 2.5, () => 0, 1.4, 0.4);

// 5. Lockup: heavy landing, bounce taps, logo pad and tail.
DROP_IMPACTS.forEach((imp, k) => {
  const s = imp.speed / DROP_IMPACTS[0].speed;
  subHit(sec(imp.frame), 1.1 * s);
  noiseBurst(sec(imp.frame), 0.2, 'lp', 1400, 0.8, 0.05 * (k === 0 ? 1.4 : 1), 0.35 * s, 0, 0.5);
});
pad(sec(LOCKUP.start), sec(SCENES.lockup.to) - 1.2, [NOTE(12), NOTE(19), NOTE(24), NOTE(26), NOTE(31)], 0.3, 0.9, 1.1, (u) => 900 + 2600 * u);
[NOTE(36), NOTE(43), NOTE(48)].forEach((f, i) => blip(sec(LOCKUP.start + 6) + i * 0.045, f, (i - 1) * 0.4));

/* ------------------------------------------------------------- reverb */

// Freeverb-style: 8 damped combs + 4 allpasses per channel (Jezar's tunings, scaled to 48 kHz).
const reverb = (input: Float32Array, spread: number): Float32Array => {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0, store: 0 }));
  const alls = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0 }));
  const out = new Float32Array(N);
  const feedback = 0.86;
  const damp = 0.32;
  for (let n = 0; n < N; n++) {
    const x = input[n] * 0.015;
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.store = y * (1 - damp) + c.store * damp;
      c.buf[c.i] = x + c.store * feedback;
      c.i = (c.i + 1) % c.buf.length;
      acc += y;
    }
    for (const a of alls) {
      const b = a.buf[a.i];
      a.buf[a.i] = acc + b * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      acc = b - acc;
    }
    out[n] = acc;
  }
  return out;
};
const wetL = reverb(sendL, 0);
const wetR = reverb(sendR, 23);

/* -------------------------------------------------------------- master */

const hpL = new Biquad().set('hp', 24, 0.7);
const hpR = new Biquad().set('hp', 24, 0.7);
// Pressure drop: hard silence from the white-out until the first touchdown.
const silenceFrom = Math.round(sec(FLASH_OUT.peak + 2) * SR);
const silenceTo = Math.round(sec(DROP_IMPACTS[0].frame) * SR) - 1;
let peak = 0;
for (let n = 0; n < N; n++) {
  let l = hpL.run(L[n] + wetL[n] * 2.4);
  let r = hpR.run(R[n] + wetR[n] * 2.4);
  if (n > silenceFrom && n < silenceTo) {
    const k = clamp(invLerp(silenceFrom, silenceFrom + 0.02 * SR, n));
    l *= 1 - k;
    r *= 1 - k;
  }
  // Fade the last 120 ms so the file ends on true digital silence.
  const tail = clamp((N - n) / (0.12 * SR));
  l = Math.tanh(l * 1.15) * tail;
  r = Math.tanh(r * 1.15) * tail;
  L[n] = l;
  R[n] = r;
  peak = Math.max(peak, Math.abs(l), Math.abs(r));
}
const norm = peak > 0 ? 0.891 / peak : 1; // -1 dBFS

/* ---------------------------------------------------------------- write */

const bytesPerSample = 3;
const dataSize = N * 2 * bytesPerSample;
const buf = Buffer.alloc(44 + dataSize);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2 * bytesPerSample, 28);
buf.writeUInt16LE(2 * bytesPerSample, 32);
buf.writeUInt16LE(bytesPerSample * 8, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);
let o = 44;
for (let n = 0; n < N; n++) {
  for (const ch of [L, R]) {
    const v = Math.round(clamp(ch[n] * norm, -1, 1) * 8388607);
    buf.writeIntLE(v, o, 3);
    o += 3;
  }
}
const outPath = path.resolve(import.meta.dirname, '../public/audio/score.wav');
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, buf);
console.log(`score.wav: ${(N / SR).toFixed(2)} s, ${HOOK_HITS.length} sub hits, ${STRIKES.length} strikes, ${DROP_IMPACTS.length} impacts, peak normalised to -1 dBFS -> ${path.relative(process.cwd(), outPath)}`);
