/**
 * Sound design data: every SFX as a stack of synth layers (see synth.ts).
 * Aim: soft and tasteful, never chiptune-harsh. Sines and triangles for tones,
 * filtered noise for texture, FM partials for bells.
 */
import { midiToFrequency, noteToMidi } from './dsp';
import type { FilterSpec, LayerSpec, SfxSpec } from './synth';

export const SFX_IDS = [
  'jump',
  'land',
  'swing',
  'hit',
  'pogo',
  'enemyDie',
  'hurt',
  'death',
  'dash',
  'heal',
  'commit',
  'note',
  'key',
  'erase',
  'ability',
  'bossHit',
  'bossPhase',
  'bossDefeat',
  'select',
  'confirm',
  'talk',
] as const;

export type SfxId = (typeof SFX_IDS)[number];

const hz = (note: string): number => midiToFrequency(noteToMidi(note));

/** Inharmonic FM bell (ratio 3.5): glassy, rings, brightness fades out. */
function bell(note: string, offset: number, release: number, gain: number): LayerSpec {
  return {
    wave: 'sine',
    freq: hz(note),
    offset,
    gain,
    env: { attack: 0.002, release, curve: 2.5 },
    fm: { ratio: 3.5, index: 1.3, indexEnd: 0 },
  };
}

/** Harmonic FM chime (ratio 2): rounder, like a soft electric piano. */
function chime(note: string, offset: number, release: number, gain: number): LayerSpec {
  return {
    wave: 'sine',
    freq: hz(note),
    offset,
    gain,
    env: { attack: 0.003, release, curve: 2.2 },
    fm: { ratio: 2, index: 1.1, indexEnd: 0.05 },
  };
}

/** Warm triangle tone for chords. */
function warm(note: string, offset: number, gain: number, filter: FilterSpec): LayerSpec {
  return {
    wave: 'triangle',
    freq: hz(note),
    offset,
    gain,
    env: { attack: 0.2, hold: 0.5, release: 0.5, curve: 1.6 },
    filter,
  };
}

/** Resolved chord tone with a long, slow tail. */
function resolved(note: string, offset: number, gain: number): LayerSpec {
  return {
    wave: 'triangle',
    freq: hz(note),
    offset,
    gain,
    env: { attack: 0.15, hold: 0.6, release: 2.2, curve: 1.8 },
    filter: { mode: 'lowpass', from: 2200, to: 1400, q: 0.6 },
  };
}

const swellEnvelope = { attack: 1.2, hold: 0.25, release: 1.0, curve: 1.5 } as const;
const swellFilter: FilterSpec = { mode: 'lowpass', from: 140, to: 900, q: 1.2 };
const susFilter: FilterSpec = { mode: 'lowpass', from: 1800, q: 0.6 };

export const SFX_DEFS: Readonly<Record<SfxId, SfxSpec>> = {
  /** Soft airy blip. */
  jump: {
    volume: 0.4,
    pitchJitter: 0.03,
    layers: [
      {
        wave: 'sine',
        freq: 330,
        freqEnd: 560,
        glide: 0.09,
        gain: 0.7,
        env: { attack: 0.004, release: 0.11 },
      },
      {
        wave: 'noise',
        gain: 0.18,
        env: { attack: 0.006, release: 0.07 },
        filter: { mode: 'bandpass', from: 2200, to: 4200, q: 0.9 },
      },
    ],
  },
  /** Muted thud. */
  land: {
    volume: 0.5,
    pitchJitter: 0.05,
    minInterval: 0.06,
    layers: [
      {
        wave: 'sine',
        freq: 150,
        freqEnd: 55,
        glide: 0.08,
        gain: 0.9,
        env: { attack: 0.002, release: 0.11, curve: 3 },
      },
      {
        wave: 'noise',
        gain: 0.5,
        env: { attack: 0.001, release: 0.07, curve: 2.5 },
        filter: { mode: 'lowpass', from: 700, to: 180, q: 0.7 },
      },
    ],
  },
  /** Quick whoosh of filtered noise. */
  swing: {
    volume: 0.38,
    pitchJitter: 0.07,
    minInterval: 0.05,
    layers: [
      {
        wave: 'noise',
        gain: 1,
        env: { attack: 0.03, release: 0.11, curve: 1.6 },
        filter: { mode: 'bandpass', from: 700, to: 3400, q: 1.3 },
      },
      {
        wave: 'noise',
        gain: 0.25,
        env: { attack: 0.02, release: 0.06 },
        filter: { mode: 'highpass', from: 5000 },
      },
    ],
  },
  /** Crisp ink tick over a low thump. */
  hit: {
    volume: 0.55,
    pitchJitter: 0.04,
    layers: [
      {
        wave: 'noise',
        gain: 0.8,
        env: { attack: 0.0005, release: 0.028, curve: 3 },
        filter: { mode: 'highpass', from: 3200, q: 0.8 },
      },
      {
        wave: 'sine',
        freq: 2300,
        freqEnd: 1700,
        gain: 0.22,
        env: { attack: 0.0005, release: 0.035, curve: 2.5 },
      },
      {
        wave: 'sine',
        freq: 190,
        freqEnd: 70,
        glide: 0.1,
        gain: 0.9,
        env: { attack: 0.001, release: 0.14, curve: 2.5 },
      },
    ],
  },
  /** Brighter hit with an upward ping. */
  pogo: {
    volume: 0.5,
    pitchJitter: 0.03,
    layers: [
      {
        wave: 'noise',
        gain: 0.7,
        env: { attack: 0.0005, release: 0.03, curve: 3 },
        filter: { mode: 'highpass', from: 4500, q: 0.8 },
      },
      {
        wave: 'sine',
        freq: hz('E5'),
        freqEnd: hz('B5'),
        glide: 0.05,
        gain: 0.3,
        env: { attack: 0.001, release: 0.16, curve: 2.2 },
      },
      {
        wave: 'triangle',
        freq: 260,
        freqEnd: 120,
        glide: 0.08,
        gain: 0.55,
        env: { attack: 0.001, release: 0.1, curve: 2.5 },
      },
    ],
  },
  /** Dissolving shimmer. */
  enemyDie: {
    volume: 0.38,
    echo: { time: 0.09, feedback: 0.3, mix: 0.3 },
    layers: [
      {
        wave: 'sine',
        freq: 1320,
        freqEnd: 990,
        gain: 0.28,
        env: { attack: 0.004, release: 0.5, curve: 1.8 },
        tremolo: { rate: 17, depth: 0.6 },
      },
      {
        wave: 'sine',
        freq: 1760,
        freqEnd: 1400,
        offset: 0.03,
        gain: 0.2,
        env: { attack: 0.004, release: 0.42 },
        tremolo: { rate: 23, depth: 0.7 },
      },
      {
        wave: 'noise',
        gain: 0.4,
        env: { attack: 0.01, release: 0.45, curve: 1.6 },
        filter: { mode: 'bandpass', from: 6500, to: 2200, q: 2 },
        tremolo: { rate: 31, depth: 0.8 },
      },
      {
        wave: 'sine',
        freq: 220,
        freqEnd: 110,
        gain: 0.3,
        env: { attack: 0.002, release: 0.12, curve: 2.5 },
      },
    ],
  },
  /** Dull low hit that sags downward. */
  hurt: {
    volume: 0.6,
    layers: [
      {
        wave: 'triangle',
        freq: 320,
        freqEnd: 85,
        glide: 0.22,
        gain: 0.9,
        env: { attack: 0.002, release: 0.28 },
        filter: { mode: 'lowpass', from: 1100, to: 260, q: 0.9 },
      },
      {
        wave: 'noise',
        gain: 0.45,
        env: { attack: 0.001, release: 0.12, curve: 2.5 },
        filter: { mode: 'lowpass', from: 900, to: 250, q: 0.7 },
      },
      { wave: 'sine', freq: 70, freqEnd: 45, gain: 0.5, env: { attack: 0.003, release: 0.2 } },
    ],
  },
  /** "Compacting": a slow descending tone collapsing into darkening noise. */
  death: {
    volume: 0.5,
    echo: { time: 0.2, feedback: 0.35, mix: 0.3 },
    layers: [
      {
        wave: 'sine',
        freq: hz('E5'),
        freqEnd: hz('E2'),
        glide: 1.5,
        gain: 0.5,
        env: { attack: 0.02, hold: 0.25, release: 1.35, curve: 1.4 },
        fm: { ratio: 1, index: 0.6, indexEnd: 0 },
      },
      {
        wave: 'sine',
        freq: hz('B5'),
        freqEnd: hz('B2'),
        glide: 1.5,
        offset: 0.04,
        gain: 0.2,
        env: { attack: 0.02, hold: 0.2, release: 1.3, curve: 1.6 },
      },
      {
        wave: 'noise',
        gain: 0.3,
        env: { attack: 0.25, hold: 0.35, release: 1.0, curve: 1.5 },
        filter: { mode: 'lowpass', from: 3200, to: 160, q: 1.1 },
        tremolo: { rate: 9, depth: 0.35 },
      },
    ],
  },
  /** Tab key: a click and thock, then a falling whoosh. */
  dash: {
    volume: 0.42,
    pitchJitter: 0.04,
    layers: [
      {
        wave: 'noise',
        gain: 0.4,
        env: { attack: 0.0005, release: 0.018, curve: 3 },
        filter: { mode: 'highpass', from: 3800, q: 0.8 },
      },
      {
        wave: 'sine',
        freq: 170,
        freqEnd: 110,
        gain: 0.3,
        env: { attack: 0.001, release: 0.06, curve: 2.5 },
      },
      {
        wave: 'noise',
        gain: 1,
        offset: 0.01,
        env: { attack: 0.02, release: 0.19, curve: 1.6 },
        filter: { mode: 'bandpass', from: 3000, to: 650, q: 1.4 },
      },
    ],
  },
  /** Warm rising chime. */
  heal: {
    volume: 0.42,
    echo: { time: 0.16, feedback: 0.3, mix: 0.25 },
    layers: [
      {
        wave: 'triangle',
        freq: hz('G4'),
        freqEnd: hz('D5'),
        glide: 0.35,
        gain: 0.4,
        env: { attack: 0.12, hold: 0.1, release: 0.55 },
        filter: { mode: 'lowpass', from: 1600, to: 2600, q: 0.7 },
      },
      {
        wave: 'sine',
        freq: hz('G5'),
        freqEnd: hz('D6'),
        glide: 0.35,
        gain: 0.16,
        env: { attack: 0.15, release: 0.5 },
      },
      bell('D6', 0.3, 0.7, 0.22),
      bell('A5', 0.42, 0.5, 0.12),
    ],
  },
  /** Two-note terminal chime. */
  commit: {
    volume: 0.42,
    echo: { time: 0.21, feedback: 0.32, mix: 0.3 },
    layers: [
      chime('E5', 0, 0.5, 0.45),
      chime('B5', 0.13, 0.9, 0.45),
      { wave: 'sine', freq: hz('E4'), gain: 0.18, env: { attack: 0.005, release: 0.35 } },
    ],
  },
  /** Paper rustle and a soft bell. */
  note: {
    volume: 0.4,
    echo: { time: 0.18, feedback: 0.3, mix: 0.28 },
    layers: [
      {
        wave: 'noise',
        gain: 0.55,
        env: { attack: 0.015, hold: 0.05, release: 0.12, curve: 1.5 },
        filter: { mode: 'bandpass', from: 2400, to: 4200, q: 0.8 },
        tremolo: { rate: 37, depth: 0.75 },
      },
      bell('C6', 0.08, 0.8, 0.26),
      bell('G6', 0.16, 0.6, 0.1),
    ],
  },
  /** Mechanical keyboard click (one per letter Luz types). */
  key: {
    volume: 0.32,
    pitchJitter: 0.08,
    minInterval: 0.02,
    layers: [
      {
        wave: 'noise',
        gain: 0.8,
        env: { attack: 0.0003, release: 0.012, curve: 3 },
        filter: { mode: 'highpass', from: 2600, q: 0.7 },
      },
      {
        wave: 'noise',
        gain: 0.5,
        env: { attack: 0.0005, release: 0.025, curve: 2.5 },
        filter: { mode: 'bandpass', from: 1300, q: 2 },
      },
      {
        wave: 'sine',
        freq: 260,
        freqEnd: 170,
        offset: 0.006,
        gain: 0.35,
        env: { attack: 0.001, release: 0.03, curve: 2.5 },
      },
    ],
  },
  /** Rubber scrubbing on paper. */
  erase: {
    volume: 0.4,
    pitchJitter: 0.05,
    minInterval: 0.06,
    layers: [
      {
        wave: 'noise',
        gain: 1,
        env: { attack: 0.02, hold: 0.12, release: 0.15, curve: 1.5 },
        filter: { mode: 'bandpass', from: 1500, to: 900, q: 1.5 },
        tremolo: { rate: 22, depth: 0.85 },
      },
      {
        wave: 'noise',
        gain: 0.35,
        env: { attack: 0.02, hold: 0.1, release: 0.12 },
        filter: { mode: 'lowpass', from: 450 },
        tremolo: { rate: 22, depth: 0.6 },
      },
    ],
  },
  /** Rising arpeggio over a soft swell (new ability). */
  ability: {
    volume: 0.45,
    echo: { time: 0.17, feedback: 0.35, mix: 0.35 },
    layers: [
      chime('C5', 0, 0.9, 0.3),
      chime('E5', 0.1, 0.9, 0.28),
      chime('G5', 0.2, 0.9, 0.26),
      chime('C6', 0.3, 1.0, 0.24),
      bell('E6', 0.42, 1.1, 0.14),
      {
        wave: 'triangle',
        freq: hz('C4'),
        gain: 0.14,
        env: { attack: 0.3, hold: 0.3, release: 0.8 },
        filter: { mode: 'lowpass', from: 900, to: 1800 },
      },
      {
        wave: 'triangle',
        freq: hz('G4'),
        gain: 0.1,
        env: { attack: 0.35, hold: 0.25, release: 0.8 },
        filter: { mode: 'lowpass', from: 900, to: 1800 },
      },
    ],
  },
  /** Paper slap. */
  bossHit: {
    volume: 0.55,
    pitchJitter: 0.05,
    layers: [
      {
        wave: 'noise',
        gain: 1,
        env: { attack: 0.0008, release: 0.07, curve: 2.2 },
        filter: { mode: 'lowpass', from: 4000, to: 1200, q: 0.8 },
      },
      {
        wave: 'noise',
        gain: 0.5,
        env: { attack: 0.002, release: 0.13 },
        filter: { mode: 'bandpass', from: 700, to: 450, q: 1.2 },
      },
      {
        wave: 'sine',
        freq: 130,
        freqEnd: 65,
        gain: 0.55,
        env: { attack: 0.001, release: 0.1, curve: 2.5 },
      },
    ],
  },
  /** Deep swell that opens up, landing on a soft low impact. */
  bossPhase: {
    volume: 0.5,
    echo: { time: 0.25, feedback: 0.3, mix: 0.25 },
    layers: [
      { wave: 'saw', freq: hz('A1'), gain: 0.35, env: swellEnvelope, filter: swellFilter },
      { wave: 'saw', freq: hz('A1') * 1.006, gain: 0.35, env: swellEnvelope, filter: swellFilter },
      { wave: 'sine', freq: hz('A2'), gain: 0.3, env: { attack: 1.0, hold: 0.3, release: 1.1 } },
      {
        wave: 'noise',
        gain: 0.18,
        env: { attack: 1.2, release: 0.8 },
        filter: { mode: 'lowpass', from: 300, to: 1800 },
      },
      {
        wave: 'sine',
        freq: 110,
        freqEnd: 45,
        offset: 1.18,
        gain: 0.6,
        env: { attack: 0.002, release: 0.4 },
      },
    ],
  },
  /** Suspended chord that resolves into D major, with bells. */
  bossDefeat: {
    volume: 0.45,
    echo: { time: 0.26, feedback: 0.38, mix: 0.35 },
    layers: [
      warm('D4', 0, 0.22, susFilter),
      warm('G4', 0, 0.18, susFilter),
      warm('A4', 0, 0.18, susFilter),
      resolved('D3', 0.85, 0.26),
      resolved('D4', 0.85, 0.2),
      resolved('F#4', 0.85, 0.2),
      resolved('A4', 0.85, 0.18),
      {
        wave: 'sine',
        freq: hz('E5'),
        offset: 0.85,
        gain: 0.1,
        env: { attack: 0.2, hold: 0.5, release: 2.2 },
      },
      bell('D6', 0.85, 2.0, 0.18),
      bell('A5', 1.05, 1.8, 0.1),
    ],
  },
  /** UI tick for moving between options. */
  select: {
    volume: 0.28,
    minInterval: 0.03,
    layers: [
      { wave: 'sine', freq: 1250, gain: 0.5, env: { attack: 0.0005, release: 0.03 } },
      {
        wave: 'noise',
        gain: 0.25,
        env: { attack: 0.0003, release: 0.008 },
        filter: { mode: 'highpass', from: 4000 },
      },
    ],
  },
  /** UI confirmation: two quick rising ticks. */
  confirm: {
    volume: 0.32,
    layers: [
      { wave: 'sine', freq: hz('A5'), gain: 0.4, env: { attack: 0.001, release: 0.06 } },
      {
        wave: 'sine',
        freq: hz('E6'),
        offset: 0.05,
        gain: 0.4,
        env: { attack: 0.001, release: 0.14 },
      },
    ],
  },
  /** Tiny blip per chunk of dialogue text. */
  talk: {
    volume: 0.22,
    pitchJitter: 0.1,
    minInterval: 0.035,
    layers: [
      {
        wave: 'triangle',
        freq: 520,
        freqEnd: 480,
        gain: 0.55,
        env: { attack: 0.002, release: 0.035 },
        filter: { mode: 'lowpass', from: 2200 },
      },
    ],
  },
};
