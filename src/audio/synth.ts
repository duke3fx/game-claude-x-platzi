/**
 * ZzFX-style parametric sound generator (original implementation, not vendored code).
 * A sound is a stack of layers (tone or noise) with an envelope, an exponential pitch glide,
 * optional FM, a sweeping state-variable filter and tremolo, plus an optional warm echo.
 * Pure: everything renders into a Float32Array, so it is unit-tested in Node.
 */
import {
  clamp,
  createRng,
  type Envelope,
  envelopeDuration,
  envelopeLevel,
  type FilterMode,
  type Rng,
  StateVariableFilter,
  shapeEnvelope,
} from './dsp';

export type Waveform = 'sine' | 'triangle' | 'saw' | 'square' | 'noise';

export interface FilterSpec {
  readonly mode: FilterMode;
  /** Cutoff (or centre) in Hz at the start of the layer. */
  readonly from: number;
  /** Cutoff at the end of the layer; the sweep is exponential. Defaults to `from`. */
  readonly to?: number;
  readonly q?: number;
}

export interface LayerSpec {
  readonly wave: Waveform;
  /** Start pitch in Hz (ignored by noise). */
  readonly freq?: number;
  /** Pitch the glide lands on. Defaults to `freq`. */
  readonly freqEnd?: number;
  /** Seconds the glide takes. Defaults to the whole layer. */
  readonly glide?: number;
  readonly gain: number;
  /** Seconds after the sound starts. */
  readonly offset?: number;
  readonly env: Envelope;
  readonly filter?: FilterSpec;
  /** Sine-only phase modulation: modulator at freq × ratio, index fading linearly. */
  readonly fm?: { readonly ratio: number; readonly index: number; readonly indexEnd?: number };
  readonly tremolo?: { readonly rate: number; readonly depth: number };
}

export interface EchoSpec {
  /** Seconds between repeats. */
  readonly time: number;
  /** 0..1; each repeat is this much quieter. */
  readonly feedback: number;
  /** Wet level added on top of the dry sound. */
  readonly mix: number;
}

export interface SfxSpec {
  readonly layers: readonly LayerSpec[];
  /** Final gain applied to the mix. */
  readonly volume: number;
  /** Random playback-rate spread (±fraction) applied at play time, not baked. */
  readonly pitchJitter?: number;
  /** Seconds before the same sound may retrigger (prevents stacking). */
  readonly minInterval?: number;
  readonly echo?: EchoSpec;
}

const TAU = Math.PI * 2;
/** Filter cutoff and envelope are evaluated once per block and interpolated in between. */
const CONTROL_BLOCK = 16;
const ECHO_DAMPING = 0.35;
const ECHO_FLOOR = 0.01;
const MAX_ECHO_TAIL = 2.5;
const END_FADE_SECONDS = 0.004;

function layerEnd(layer: LayerSpec): number {
  return (layer.offset ?? 0) + envelopeDuration(layer.env);
}

function echoTail(echo: EchoSpec | undefined): number {
  if (!echo || echo.mix <= 0) return 0;
  const feedback = clamp(echo.feedback, 0.01, 0.95);
  const repeats = Math.ceil(Math.log(ECHO_FLOOR) / Math.log(feedback));
  return Math.min(MAX_ECHO_TAIL, echo.time * repeats);
}

/** Total length in seconds, including the echo tail. */
export function sfxDuration(spec: SfxSpec): number {
  const body = spec.layers.reduce((longest, layer) => Math.max(longest, layerEnd(layer)), 0);
  return body + echoTail(spec.echo);
}

function oscillate(wave: Waveform, phase: number, rng: Rng): number {
  switch (wave) {
    case 'sine':
      return Math.sin(TAU * phase);
    case 'triangle':
      return 4 * Math.abs(phase - 0.5) - 1;
    case 'saw':
      return 2 * phase - 1;
    case 'square':
      return phase < 0.5 ? 1 : -1;
    case 'noise':
      return rng() * 2 - 1;
  }
}

function renderLayer(layer: LayerSpec, out: Float32Array, sampleRate: number, rng: Rng): void {
  const start = Math.round((layer.offset ?? 0) * sampleRate);
  // Hoist everything out of the hot loop: layer literals all have different shapes, and
  // reading their properties per sample would make the loop megamorphic (several times slower).
  const shape = shapeEnvelope(layer.env);
  const duration = shape.releaseStart + shape.release;
  const wave = layer.wave;
  const level = layer.gain;
  const count = Math.min(out.length - start, Math.ceil(duration * sampleRate));
  const startFreq = layer.freq ?? 440;
  const endFreq = layer.freqEnd ?? startFreq;
  const glideSamples = Math.max(1, Math.round((layer.glide ?? duration) * sampleRate));
  const glideStep = (endFreq / startFreq) ** (1 / glideSamples);
  const spec = layer.filter;
  const filter = spec ? new StateVariableFilter(spec.mode, sampleRate) : null;
  const filterFrom = spec?.from ?? 1000;
  const filterRatio = (spec?.to ?? filterFrom) / filterFrom;
  const q = spec?.q ?? Math.SQRT1_2;
  const fm = layer.wave === 'sine' ? layer.fm : undefined;
  const fmRatio = fm?.ratio ?? 1;
  const fmIndex = fm?.index ?? 0;
  const fmIndexSlope = ((fm?.indexEnd ?? fmIndex) - fmIndex) / duration;
  const tremoloStep = (TAU * (layer.tremolo?.rate ?? 0)) / sampleRate;
  const tremoloDepth = layer.tremolo?.depth ?? 0;
  const secondsPerSample = 1 / sampleRate;

  const blockSeconds = CONTROL_BLOCK * secondsPerSample;

  let frequency = startFreq;
  let phase = 0;
  let modPhase = 0;
  let envelope = 0;
  let envelopeStep = 0;
  for (let i = 0; i < count; i++) {
    const time = i * secondsPerSample;
    const blockStart = i % CONTROL_BLOCK === 0;
    if (blockStart) {
      envelope = envelopeLevel(shape, time);
      envelopeStep = (envelopeLevel(shape, time + blockSeconds) - envelope) / CONTROL_BLOCK;
    }
    let sample: number;
    if (fm) {
      const index = fmIndex + fmIndexSlope * time;
      sample = Math.sin(TAU * phase + index * Math.sin(TAU * modPhase));
      modPhase += frequency * fmRatio * secondsPerSample;
      if (modPhase >= 1) modPhase -= Math.floor(modPhase);
    } else {
      sample = oscillate(wave, phase, rng);
    }
    phase += frequency * secondsPerSample;
    if (phase >= 1) phase -= Math.floor(phase);
    if (i < glideSamples) frequency *= glideStep;

    if (filter) {
      if (blockStart) filter.setCutoff(filterFrom * filterRatio ** (time / duration), q);
      sample = filter.process(sample);
    }
    if (tremoloDepth > 0) sample *= 1 - tremoloDepth * (0.5 - 0.5 * Math.cos(tremoloStep * i));
    const index = start + i;
    out[index] = (out[index] ?? 0) + sample * envelope * level;
    envelope += envelopeStep;
  }
}

/** Feedback echo with a one-pole low-pass in the loop so repeats get warmer, not harsher. */
function applyEcho(out: Float32Array, echo: EchoSpec, sampleRate: number): void {
  const delay = Math.max(1, Math.round(echo.time * sampleRate));
  const feedback = clamp(echo.feedback, 0, 0.95);
  const wet = new Float32Array(out.length);
  let smoothed = 0;
  for (let i = delay; i < out.length; i++) {
    const input = (out[i - delay] ?? 0) + feedback * (wet[i - delay] ?? 0);
    smoothed += ECHO_DAMPING * (input - smoothed);
    wet[i] = smoothed;
  }
  for (let i = 0; i < out.length; i++) {
    out[i] = (out[i] ?? 0) + echo.mix * (wet[i] ?? 0);
  }
}

function finalize(out: Float32Array, volume: number, sampleRate: number): void {
  // Short linear fade so the final sample is exactly silent (no click when the voice ends).
  const last = out.length - 1;
  const fadeStart = Math.max(0, last - Math.ceil(END_FADE_SECONDS * sampleRate));
  for (let i = 0; i < out.length; i++) {
    const fade = i < fadeStart ? 1 : (last - i) / Math.max(1, last - fadeStart);
    out[i] = clamp((out[i] ?? 0) * volume * fade, -1, 1);
  }
}

/**
 * Incremental renderer: each `step()` does one bounded chunk of work (a layer, then the echo
 * and the final pass), so long sounds can be pre-rendered across several short tasks.
 */
export class SfxRenderJob {
  private readonly spec: SfxSpec;
  private readonly sampleRate: number;
  private readonly rng: Rng;
  private readonly out: Float32Array<ArrayBuffer>;
  private nextLayer = 0;
  private finished = false;

  constructor(spec: SfxSpec, sampleRate: number, seed = 1) {
    this.spec = spec;
    this.sampleRate = sampleRate;
    this.rng = createRng(seed);
    this.out = new Float32Array(Math.max(1, Math.ceil(sfxDuration(spec) * sampleRate)));
  }

  get done(): boolean {
    return this.finished;
  }

  /** Does the next chunk of work; returns true once the samples are complete. */
  step(): boolean {
    if (this.finished) return true;
    const layer = this.spec.layers[this.nextLayer];
    if (layer) {
      renderLayer(layer, this.out, this.sampleRate, this.rng);
      this.nextLayer++;
      return false;
    }
    const echo = this.spec.echo;
    if (echo && echo.mix > 0) applyEcho(this.out, echo, this.sampleRate);
    finalize(this.out, this.spec.volume, this.sampleRate);
    this.finished = true;
    return true;
  }

  /** Completes any remaining work and returns mono samples in [-1, 1]. */
  finish(): Float32Array<ArrayBuffer> {
    while (!this.step()) {
      // Keep stepping until the last chunk is done.
    }
    return this.out;
  }
}

/** Renders a sound to mono samples in [-1, 1]. Deterministic for a given seed. */
export function renderSfx(spec: SfxSpec, sampleRate: number, seed = 1): Float32Array<ArrayBuffer> {
  return new SfxRenderJob(spec, sampleRate, seed).finish();
}
