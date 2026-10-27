/**
 * Instrument voices built from native Web Audio nodes. They are scheduled on an
 * OfflineAudioContext (see musicRenderer.ts), so there is no live scheduler and no jitter.
 * Every oscillator is stopped once its tail has decayed, so finished voices are freed.
 */
import { clamp } from './dsp';
import type { InstrumentId, TrackMix } from './score';

export interface VoiceRequest {
  /** Seconds from the start of the render. */
  readonly start: number;
  /** Seconds the note is held. */
  readonly duration: number;
  readonly frequency: number;
  readonly velocity: number;
}

export type InstrumentSettings = Pick<TrackMix, 'padCutoff' | 'padAttack'>;

type Ctx = BaseAudioContext;

function oscillator(ctx: Ctx, type: OscillatorType, frequency: number, detune = 0): OscillatorNode {
  const node = ctx.createOscillator();
  node.type = type;
  node.frequency.value = frequency;
  node.detune.value = detune;
  return node;
}

function gain(ctx: Ctx, value: number): GainNode {
  const node = ctx.createGain();
  node.gain.value = value;
  return node;
}

function lowpass(ctx: Ctx, frequency: number, q: number): BiquadFilterNode {
  const node = ctx.createBiquadFilter();
  node.type = 'lowpass';
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

function run(nodes: readonly OscillatorNode[], start: number, stop: number): void {
  for (const node of nodes) {
    node.start(start);
    node.stop(stop);
  }
}

/** Soft FM piano: a 1:1 modulator whose brightness fades fast, plus a quiet octave partial. */
function piano(ctx: Ctx, out: AudioNode, v: VoiceRequest): void {
  const end = v.start + v.duration;
  const octavesAboveA2 = Math.log2(v.frequency / 110);
  const decay = clamp(1.2 - 0.2 * octavesAboveA2, 0.35, 1.3);
  const brightness = clamp(330 / v.frequency, 0.35, 1.3);
  const index = (0.5 + 1.2 * v.velocity) * brightness;

  const amp = gain(ctx, 0);
  amp.connect(out);
  amp.gain.setValueAtTime(0, v.start);
  amp.gain.linearRampToValueAtTime(0.3 * v.velocity, v.start + 0.004);
  amp.gain.setTargetAtTime(0, v.start + 0.004, decay);
  amp.gain.setTargetAtTime(0, end, 0.15);

  const carrier = oscillator(ctx, 'sine', v.frequency);
  const modulator = oscillator(ctx, 'sine', v.frequency);
  const depth = gain(ctx, 0);
  depth.gain.setValueAtTime(v.frequency * index, v.start);
  depth.gain.setTargetAtTime(v.frequency * index * 0.1, v.start, 0.25);
  modulator.connect(depth);
  depth.connect(carrier.frequency);
  carrier.connect(amp);

  const octave = oscillator(ctx, 'sine', v.frequency * 2, 2);
  const octaveLevel = gain(ctx, 0.12);
  octave.connect(octaveLevel);
  octaveLevel.connect(amp);

  run([carrier, modulator, octave], v.start, end + 1);
}

/** Glassy FM bell (inharmonic 3.5 ratio) that rings for a few seconds. */
function bell(ctx: Ctx, out: AudioNode, v: VoiceRequest): void {
  const end = v.start + v.duration;
  const ratio = 3.5;
  const index = 0.6 + 0.8 * v.velocity;

  const amp = gain(ctx, 0);
  amp.connect(out);
  amp.gain.setValueAtTime(0, v.start);
  amp.gain.linearRampToValueAtTime(0.16 * v.velocity, v.start + 0.003);
  amp.gain.setTargetAtTime(0, v.start + 0.003, 1.1);
  amp.gain.setTargetAtTime(0, end, 0.5);

  const carrier = oscillator(ctx, 'sine', v.frequency);
  const modulator = oscillator(ctx, 'sine', v.frequency * ratio);
  const depth = gain(ctx, 0);
  depth.gain.setValueAtTime(v.frequency * ratio * index, v.start);
  depth.gain.setTargetAtTime(0, v.start, 0.35);
  modulator.connect(depth);
  depth.connect(carrier.frequency);
  carrier.connect(amp);

  run([carrier, modulator], v.start, end + 3);
}

/** Slow pad: detuned triangle + quiet saw through a gentle low-pass. */
function pad(ctx: Ctx, out: AudioNode, v: VoiceRequest, settings: InstrumentSettings): void {
  const end = v.start + v.duration;
  const attack = Math.min(settings.padAttack, v.duration * 0.6);
  const release = 1.2;

  const amp = gain(ctx, 0);
  amp.connect(out);
  amp.gain.setValueAtTime(0, v.start);
  amp.gain.linearRampToValueAtTime(0.11 * v.velocity, v.start + attack);
  amp.gain.setTargetAtTime(0, end, release / 3);

  const filter = lowpass(ctx, settings.padCutoff, 0.3);
  filter.connect(amp);
  const body = oscillator(ctx, 'triangle', v.frequency, -6);
  const shimmer = oscillator(ctx, 'sawtooth', v.frequency, 6);
  const shimmerLevel = gain(ctx, 0.3);
  body.connect(filter);
  shimmer.connect(shimmerLevel);
  shimmerLevel.connect(filter);

  run([body, shimmer], v.start, end + release * 2);
}

/** Bowed-string pad: two detuned saws, darker for low notes, with a slow vibrato. */
function strings(ctx: Ctx, out: AudioNode, v: VoiceRequest): void {
  const end = v.start + v.duration;
  const attack = Math.min(0.45, v.duration * 0.5);
  const release = 0.5;
  const stop = end + release * 3;

  const amp = gain(ctx, 0);
  amp.connect(out);
  amp.gain.setValueAtTime(0, v.start);
  amp.gain.linearRampToValueAtTime(0.085 * v.velocity, v.start + attack);
  amp.gain.setTargetAtTime(0, end, release / 3);

  const filter = lowpass(ctx, clamp(v.frequency * 4, 600, 1800), 0.6);
  filter.connect(amp);
  const left = oscillator(ctx, 'sawtooth', v.frequency, -7);
  const right = oscillator(ctx, 'sawtooth', v.frequency, 7);
  left.connect(filter);
  right.connect(filter);

  const vibrato = oscillator(ctx, 'sine', 4.6);
  const vibratoDepth = gain(ctx, 5);
  vibrato.connect(vibratoDepth);
  vibratoDepth.connect(left.detune);
  vibratoDepth.connect(right.detune);

  run([left, right, vibrato], v.start, stop);
}

/** Round sine bass that settles to a softer sustain. */
function bass(ctx: Ctx, out: AudioNode, v: VoiceRequest): void {
  const end = v.start + v.duration;
  const peak = 0.3 * v.velocity;

  const amp = gain(ctx, 0);
  amp.connect(out);
  amp.gain.setValueAtTime(0, v.start);
  amp.gain.linearRampToValueAtTime(peak, v.start + 0.02);
  amp.gain.setTargetAtTime(peak * 0.5, v.start + 0.02, 0.6);
  amp.gain.setTargetAtTime(0, end, 0.2);

  const filter = lowpass(ctx, 500, 0.5);
  filter.connect(amp);
  const fundamental = oscillator(ctx, 'sine', v.frequency);
  const edge = oscillator(ctx, 'triangle', v.frequency);
  const edgeLevel = gain(ctx, 0.25);
  fundamental.connect(filter);
  edge.connect(edgeLevel);
  edgeLevel.connect(filter);

  run([fundamental, edge], v.start, end + 1.2);
}

/** Heartbeat thump: a quick downward pitch drop, with a 2nd harmonic for small speakers. */
function pulse(ctx: Ctx, out: AudioNode, v: VoiceRequest): void {
  const amp = gain(ctx, 0);
  amp.connect(out);
  amp.gain.setValueAtTime(0, v.start);
  amp.gain.linearRampToValueAtTime(0.55 * v.velocity, v.start + 0.004);
  amp.gain.setTargetAtTime(0, v.start + 0.004, 0.1);

  const low = oscillator(ctx, 'sine', v.frequency);
  low.frequency.setValueAtTime(v.frequency * 2.2, v.start);
  low.frequency.exponentialRampToValueAtTime(v.frequency, v.start + 0.08);
  const harmonic = oscillator(ctx, 'sine', v.frequency * 2);
  harmonic.frequency.setValueAtTime(v.frequency * 4.4, v.start);
  harmonic.frequency.exponentialRampToValueAtTime(v.frequency * 2, v.start + 0.08);
  const harmonicLevel = gain(ctx, 0.3);
  low.connect(amp);
  harmonic.connect(harmonicLevel);
  harmonicLevel.connect(amp);

  run([low, harmonic], v.start, v.start + 0.8);
}

/** Schedules one note of `instrument` into `destination` (panning is the caller's job). */
export function scheduleVoice(
  ctx: Ctx,
  destination: AudioNode,
  instrument: InstrumentId,
  voice: VoiceRequest,
  settings: InstrumentSettings,
): void {
  switch (instrument) {
    case 'piano':
      piano(ctx, destination, voice);
      break;
    case 'bell':
      bell(ctx, destination, voice);
      break;
    case 'pad':
      pad(ctx, destination, voice, settings);
      break;
    case 'strings':
      strings(ctx, destination, voice);
      break;
    case 'bass':
      bass(ctx, destination, voice);
      break;
    case 'pulse':
      pulse(ctx, destination, voice);
      break;
  }
}
