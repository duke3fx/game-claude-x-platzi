/**
 * Pure DSP helpers shared by the SFX and music renderers.
 * Nothing in this file touches Web Audio, so it runs (and is tested) in Node.
 */

export type Rng = () => number;

/** Mulberry32: a tiny seedable PRNG that returns floats in [0, 1). */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clamps into [min, max]; NaN collapses to `min` so bad input can never blow up a gain. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Equal-tempered pitch, A4 (MIDI 69) = 440 Hz. */
export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

const PITCH_CLASSES: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Parses scientific pitch notation ("C4", "F#3", "Bb1") into a MIDI note number (C4 = 60). */
export function noteToMidi(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  const pitch = PITCH_CLASSES[match?.[1] ?? ''];
  const octave = match?.[3];
  if (pitch === undefined || octave === undefined) {
    throw new Error(`Invalid note name: "${name}"`);
  }
  const accidental = match?.[2] === '#' ? 1 : match?.[2] === 'b' ? -1 : 0;
  return (Number(octave) + 1) * 12 + pitch + accidental;
}

export interface Envelope {
  /** Seconds from silence to peak. */
  readonly attack: number;
  /** Seconds held at peak. */
  readonly hold?: number;
  /** Seconds from peak back to silence. */
  readonly release: number;
  /** Release shape exponent: 1 is linear, higher drops faster at first (default 2). */
  readonly curve?: number;
}

/** Shortest attack allowed: anything faster clicks. */
const MIN_ATTACK = 0.0003;

/** An envelope with defaults resolved; always the same object shape, so hot loops stay fast. */
export interface EnvelopeShape {
  readonly attack: number;
  readonly releaseStart: number;
  readonly release: number;
  readonly curve: number;
}

export function shapeEnvelope(env: Envelope): EnvelopeShape {
  const attack = Math.max(env.attack, MIN_ATTACK);
  return {
    attack,
    releaseStart: attack + (env.hold ?? 0),
    release: Math.max(env.release, 0),
    curve: env.curve ?? 2,
  };
}

export function envelopeDuration(env: Envelope): number {
  const shape = shapeEnvelope(env);
  return shape.releaseStart + shape.release;
}

/** Amplitude in [0, 1] at `time` seconds; exactly 0 before the start and after the release. */
export function envelopeLevel(shape: EnvelopeShape, time: number): number {
  if (time < 0) return 0;
  if (time < shape.attack) return time / shape.attack;
  if (time < shape.releaseStart) return 1;
  const progress = (time - shape.releaseStart) / shape.release;
  if (!(progress < 1)) return 0;
  return (1 - progress) ** shape.curve;
}

export function envelopeAt(env: Envelope, time: number): number {
  return envelopeLevel(shapeEnvelope(env), time);
}

export type FilterMode = 'lowpass' | 'highpass' | 'bandpass';

/**
 * Topology-preserving state-variable filter (Zavalishin / Simper).
 * Stays stable while the cutoff sweeps every few samples, which naive biquads do not.
 * The band-pass output is scaled to unity gain at the centre frequency.
 */
export class StateVariableFilter {
  private readonly mode: FilterMode;
  private readonly sampleRate: number;
  private k = Math.SQRT2;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  private ic1 = 0;
  private ic2 = 0;

  constructor(mode: FilterMode, sampleRate: number) {
    this.mode = mode;
    this.sampleRate = sampleRate;
    this.setCutoff(1000, Math.SQRT1_2);
  }

  setCutoff(frequency: number, q: number): void {
    const safe = clamp(frequency, 10, this.sampleRate * 0.45);
    const g = Math.tan((Math.PI * safe) / this.sampleRate);
    this.k = 1 / Math.max(q, 0.05);
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }

  process(input: number): number {
    const v3 = input - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    if (this.mode === 'lowpass') return v2;
    if (this.mode === 'bandpass') return this.k * v1;
    return input - this.k * v1 - v2;
  }
}

/**
 * Stereo reverb impulse response: two decorrelated noise tails that decay by ~60 dB and
 * darken over time (air absorption), with a short pre-delay and a soft onset.
 */
export function generateImpulse(
  sampleRate: number,
  seconds: number,
  rng: Rng,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const preDelay = Math.floor(sampleRate * 0.012);
  const onset = Math.max(1, Math.floor(sampleRate * 0.02));
  const channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [
    new Float32Array(length),
    new Float32Array(length),
  ];
  // exp(-6.9 · progress) ≈ -60 dB at the end, applied as a running product (no exp per sample).
  const decayPerSample = Math.exp(-6.9 / length);
  for (const channel of channels) {
    let smoothed = 0;
    let decay = Math.exp((-6.9 * preDelay) / length);
    for (let i = preDelay; i < length; i++) {
      const progress = i / length;
      const brightness = 0.9 - 0.8 * progress;
      smoothed += brightness * (rng() * 2 - 1 - smoothed);
      const fadeIn = Math.min(1, (i - preDelay) / onset);
      channel[i] = smoothed * fadeIn * decay * (1 - progress);
      decay *= decayPerSample;
    }
  }
  return channels;
}

/**
 * Wraps every sample past `loopLength` back onto the start (modulo), so notes and reverb that
 * ring past the loop point bleed into the next pass and the buffer loops without a seam.
 */
export function foldLoop(
  samples: ArrayLike<number>,
  loopLength: number,
): Float32Array<ArrayBuffer> {
  const length = Math.max(1, Math.floor(loopLength));
  const out = new Float32Array(length);
  for (let i = 0; i < samples.length; i++) {
    const j = i % length;
    out[j] = (out[j] ?? 0) + (samples[i] ?? 0);
  }
  return out;
}

export function peakAmplitude(channels: readonly ArrayLike<number>[]): number {
  let peak = 0;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) {
      peak = Math.max(peak, Math.abs(channel[i] ?? 0));
    }
  }
  return peak;
}

export function scaleInPlace(samples: Float32Array, gain: number): void {
  for (let i = 0; i < samples.length; i++) {
    samples[i] = (samples[i] ?? 0) * gain;
  }
}
