/**
 * Music as data: a Score is a list of note events (in beats) plus mix settings.
 * The builders below turn chord progressions and compact melody strings into events.
 * Pure, so the compositions can be validated in Node.
 */
import { clamp, createRng, noteToMidi } from './dsp';

export type InstrumentId = 'piano' | 'bell' | 'pad' | 'strings' | 'bass' | 'pulse';

export interface NoteEvent {
  readonly instrument: InstrumentId;
  readonly midi: number;
  /** Start, in beats from the top of the loop. */
  readonly beat: number;
  /** How long the key is held, in beats (the tail rings past it). */
  readonly beats: number;
  /** 0..1 */
  readonly velocity: number;
  /** -1 (left) .. 1 (right) */
  readonly pan: number;
}

export interface TrackMix {
  readonly reverbSeconds: number;
  readonly reverbWet: number;
  readonly delayBeats: number;
  readonly delayFeedback: number;
  readonly delayWet: number;
  /** Low-pass cutoff of the pad voice, Hz. */
  readonly padCutoff: number;
  /** Fade-in time of the pad voice, seconds. */
  readonly padAttack: number;
  /** Peak level after normalisation, 0..1. */
  readonly level: number;
}

export interface Score {
  readonly bpm: number;
  readonly beatsPerBar: number;
  readonly bars: number;
  readonly mix: TrackMix;
  readonly events: readonly NoteEvent[];
}

type Timing = Pick<Score, 'bpm' | 'beatsPerBar' | 'bars'>;

export const loopBeats = (score: Pick<Score, 'beatsPerBar' | 'bars'>): number =>
  score.bars * score.beatsPerBar;

export const beatSeconds = (score: Pick<Score, 'bpm'>): number => 60 / score.bpm;

export const loopSeconds = (score: Timing): number => loopBeats(score) * beatSeconds(score);

/** Who plays a line, and how. */
export interface Voice {
  readonly instrument: InstrumentId;
  readonly velocity: number;
  readonly pan?: number;
  /** Semitones added to every note. */
  readonly transpose?: number;
}

export interface Chord {
  readonly beats: number;
  /** Bass note, e.g. "G2". */
  readonly root: string;
  /** Voicing above the bass, low to high. */
  readonly tones: readonly string[];
  /** Keep the previous chord's bass ringing instead of striking it again. */
  readonly holdRoot?: boolean;
}

export interface PlacedChord {
  readonly start: number;
  readonly beats: number;
  readonly root: number;
  readonly tones: readonly number[];
  readonly holdRoot: boolean;
}

/** One hit of an accompaniment pattern, relative to the chord start. */
export interface Step {
  readonly at: number;
  /** Index into the chord tones (wraps around), or the bass note. */
  readonly tone: number | 'root';
  readonly beats: number;
  /** Velocity multiplier (default 1). */
  readonly accent?: number;
}

function noteEvent(voice: Voice, midi: number, beat: number, beats: number, accent = 1): NoteEvent {
  return {
    instrument: voice.instrument,
    midi: midi + (voice.transpose ?? 0),
    beat,
    beats,
    velocity: clamp(voice.velocity * accent, 0, 1),
    pan: voice.pan ?? 0,
  };
}

/** Lays chords end to end (optionally repeating the progression) and resolves note names. */
export function placeChords(chords: readonly Chord[], repeat = 1): PlacedChord[] {
  const placed: PlacedChord[] = [];
  let start = 0;
  for (let pass = 0; pass < repeat; pass++) {
    for (const chord of chords) {
      placed.push({
        start,
        beats: chord.beats,
        root: noteToMidi(chord.root),
        tones: chord.tones.map(noteToMidi),
        holdRoot: chord.holdRoot ?? false,
      });
      start += chord.beats;
    }
  }
  return placed;
}

/** Plays `steps` over every chord; steps past the chord's length are skipped. */
export function arpeggiate(
  chords: readonly PlacedChord[],
  steps: readonly Step[],
  voice: Voice,
): NoteEvent[] {
  const events: NoteEvent[] = [];
  for (const chord of chords) {
    for (const step of steps) {
      if (step.at >= chord.beats) continue;
      const beat = chord.start + step.at;
      if (step.tone === 'root') {
        if (!chord.holdRoot)
          events.push(noteEvent(voice, chord.root, beat, step.beats, step.accent));
        continue;
      }
      const midi = chord.tones[step.tone % chord.tones.length];
      if (midi !== undefined) events.push(noteEvent(voice, midi, beat, step.beats, step.accent));
    }
  }
  return events;
}

/** Holds every chord tone for the chord's length (plus a little overlap for legato). */
export function sustain(chords: readonly PlacedChord[], voice: Voice, overlap = 0.25): NoteEvent[] {
  return chords.flatMap((chord) =>
    chord.tones.map((midi) => noteEvent(voice, midi, chord.start, chord.beats + overlap)),
  );
}

/** One bass note per chord, held through any following `holdRoot` chords. */
export function roots(chords: readonly PlacedChord[], voice: Voice): NoteEvent[] {
  const events: NoteEvent[] = [];
  chords.forEach((chord, index) => {
    if (chord.holdRoot) return;
    let beats = chord.beats;
    for (let next = index + 1; chords[next]?.holdRoot === true; next++) {
      beats += chords[next]?.beats ?? 0;
    }
    events.push(noteEvent(voice, chord.root, chord.start, beats));
  });
  return events;
}

const MELODY_TOKEN = /^([A-G][#b]?-?\d)@(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/;

/**
 * Parses a compact melody: bars separated by "|", notes as NAME@beat:length
 * (beat relative to its bar), "-" for an empty bar. Example: "E5@0:2 C#5@2:2 | - | D5@1:3".
 */
export function melody(text: string, voice: Voice, beatsPerBar = 4): NoteEvent[] {
  const events: NoteEvent[] = [];
  for (const [barIndex, bar] of text.split('|').entries()) {
    for (const token of bar.trim().split(/\s+/)) {
      if (token === '' || token === '-') continue;
      const match = MELODY_TOKEN.exec(token);
      const name = match?.[1];
      const at = match?.[2];
      const length = match?.[3];
      if (name === undefined || at === undefined || length === undefined) {
        throw new Error(`Invalid melody token: "${token}"`);
      }
      events.push(
        noteEvent(voice, noteToMidi(name), barIndex * beatsPerBar + Number(at), Number(length)),
      );
    }
  }
  return events;
}

/** Small seeded timing/velocity drift so loops breathe instead of sounding sequenced. */
export function humanize(
  events: readonly NoteEvent[],
  seed: number,
  totalBeats: number,
  timing = 0.015,
  velocity = 0.08,
): NoteEvent[] {
  const rng = createRng(seed);
  return events.map((event) => ({
    ...event,
    beat: clamp(event.beat + (rng() * 2 - 1) * timing, 0, totalBeats - 0.001),
    velocity: clamp(event.velocity * (1 + (rng() * 2 - 1) * velocity), 0, 1),
  }));
}

/** Alternates pan left/right across a line (for sparse bells). */
export function alternatePan(events: readonly NoteEvent[], width: number): NoteEvent[] {
  return events.map((event, index) => ({ ...event, pan: index % 2 === 0 ? -width : width }));
}
