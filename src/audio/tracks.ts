/**
 * The six music loops. Original, minimal pieces: soft FM piano and bells over slow pads,
 * melancholic-warm. Each loop is 8 bars (20–32 s) and is rendered once, then looped.
 */
import {
  alternatePan,
  arpeggiate,
  type Chord,
  humanize,
  melody,
  type NoteEvent,
  placeChords,
  roots,
  type Score,
  type Step,
  sustain,
  type TrackMix,
} from './score';

export const MUSIC_IDS = ['title', 'sandbox', 'library', 'margin', 'boss', 'ending'] as const;

export type MusicId = (typeof MUSIC_IDS)[number];

const BEATS_PER_BAR = 4;
const BARS = 8;
const TOTAL_BEATS = BEATS_PER_BAR * BARS;

function score(bpm: number, mix: TrackMix, events: readonly NoteEvent[]): Score {
  return { bpm, beatsPerBar: BEATS_PER_BAR, bars: BARS, mix, events };
}

/** Piano/bell lines get a little human drift; pads and pulses stay on the grid. */
const human = (events: readonly NoteEvent[], seed: number): NoteEvent[] =>
  humanize(events, seed, TOTAL_BEATS);

/** Broken chord in quarter notes, each one left ringing. */
const BROKEN_QUARTERS: readonly Step[] = [
  { at: 0, tone: 'root', beats: 3 },
  { at: 1, tone: 0, beats: 2.5 },
  { at: 2, tone: 1, beats: 2 },
  { at: 3, tone: 2, beats: 1.5 },
];

/** Gentle flowing eighths with the bass on the downbeat. */
const FLOWING_EIGHTHS: readonly Step[] = [
  { at: 0, tone: 'root', beats: 4 },
  { at: 0.5, tone: 0, beats: 1.2 },
  { at: 1, tone: 1, beats: 1.2, accent: 0.8 },
  { at: 1.5, tone: 2, beats: 1.2 },
  { at: 2, tone: 1, beats: 1.2, accent: 0.85 },
  { at: 2.5, tone: 2, beats: 1.2 },
  { at: 3, tone: 0, beats: 1.2, accent: 0.8 },
  { at: 3.5, tone: 1, beats: 1.2 },
];

/** Title — sparse piano, hopeful but unresolved (D major, ends on the dominant). */
function composeTitle(): Score {
  const chords = placeChords(
    [
      { beats: 4, root: 'G2', tones: ['B3', 'D4', 'F#4'] },
      { beats: 4, root: 'F#2', tones: ['A3', 'D4', 'F#4'] },
      { beats: 4, root: 'E2', tones: ['G3', 'B3', 'D4'] },
      // Tone order matters to the pattern: the sus4 (D) then its resolution (C#) land on beat 2.
      { beats: 2, root: 'A2', tones: ['D4', 'A3', 'E4'] },
      { beats: 2, root: 'A2', tones: ['C#4', 'A3', 'E4'], holdRoot: true },
    ],
    2,
  );
  const lead = { instrument: 'piano', velocity: 0.52, pan: 0.15 } as const;
  return score(
    66,
    {
      reverbSeconds: 3.2,
      reverbWet: 0.32,
      delayBeats: 0.75,
      delayFeedback: 0.28,
      delayWet: 0.16,
      padCutoff: 900,
      padAttack: 1.4,
      level: 0.8,
    },
    [
      ...human(
        arpeggiate(chords, BROKEN_QUARTERS, { instrument: 'piano', velocity: 0.34, pan: -0.15 }),
        11,
      ),
      ...sustain(chords, { instrument: 'pad', velocity: 0.22 }),
      ...human(
        melody(
          [
            'F#5@1:3',
            'E5@0:2 D5@2:2',
            'B4@1:3',
            'E5@0:2 C#5@2:2',
            'B4@0:1 D5@1:1 A5@2:2',
            'F#5@0:2 E5@2:1 D5@3:1',
            'E5@0:1.5 G5@1.5:0.5 F#5@2:1 E5@3:1',
            'D5@0:2 C#5@2:2',
          ].join('|'),
          lead,
        ),
        12,
      ),
      ...melody('-|-|-|-|A5@2:2|F#5@0:2|-|-', { instrument: 'bell', velocity: 0.2, pan: -0.3 }),
    ],
  );
}

/** El Arenero — naive and gentle, a little playful; major with sus chords (C). */
function composeSandbox(): Score {
  const chords = placeChords([
    { beats: 4, root: 'C3', tones: ['G3', 'C4', 'D4'] },
    { beats: 4, root: 'F2', tones: ['A3', 'C4', 'E4'] },
    { beats: 4, root: 'A2', tones: ['G3', 'C4', 'E4'] },
    { beats: 2, root: 'G2', tones: ['G3', 'C4', 'D4'] },
    { beats: 2, root: 'G2', tones: ['G3', 'B3', 'D4'], holdRoot: true },
    { beats: 4, root: 'C3', tones: ['E3', 'G3', 'D4'] },
    { beats: 4, root: 'F2', tones: ['A3', 'C4', 'E4'] },
    { beats: 4, root: 'D3', tones: ['F3', 'A3', 'C4'] },
    { beats: 4, root: 'G2', tones: ['F3', 'C4', 'D4'] },
  ]);
  const bounce: readonly Step[] = [
    { at: 0, tone: 0, beats: 0.9 },
    { at: 0.5, tone: 1, beats: 0.9, accent: 0.75 },
    { at: 1, tone: 2, beats: 0.9 },
    { at: 1.5, tone: 1, beats: 0.9, accent: 0.75 },
    { at: 2, tone: 0, beats: 0.9 },
    { at: 2.5, tone: 1, beats: 0.9, accent: 0.75 },
    { at: 3, tone: 2, beats: 0.9 },
    { at: 3.5, tone: 1, beats: 0.9, accent: 0.75 },
  ];
  const bassSteps: readonly Step[] = [
    { at: 0, tone: 'root', beats: 2.5 },
    { at: 2.5, tone: 'root', beats: 1.5, accent: 0.7 },
  ];
  return score(
    84,
    {
      reverbSeconds: 2.4,
      reverbWet: 0.26,
      delayBeats: 0.5,
      delayFeedback: 0.22,
      delayWet: 0.12,
      padCutoff: 1100,
      padAttack: 0.9,
      level: 0.8,
    },
    [
      ...human(arpeggiate(chords, bounce, { instrument: 'piano', velocity: 0.26, pan: -0.3 }), 21),
      ...arpeggiate(chords, bassSteps, { instrument: 'bass', velocity: 0.5 }),
      ...sustain(chords, { instrument: 'pad', velocity: 0.16 }),
      ...human(
        melody(
          [
            'G4@0:1 A4@1:1 C5@2:1.5 D5@3.5:0.5',
            'E5@0:1 D5@1:1 C5@2:2',
            'A4@0:1 C5@1:1 E5@2:1 D5@3:1',
            'D5@0:2 B4@2:2',
            'G4@0:1 A4@1:1 C5@2:1 E5@3:1',
            'F5@0:1 E5@1:1 C5@2:2',
            'D5@0:1 C5@1:1 A4@2:1 F4@3:1',
            'G4@0:2 D5@2:1 C5@3:1',
          ].join('|'),
          { instrument: 'piano', velocity: 0.52, pan: 0.2 },
        ),
        22,
      ),
      ...melody('-|E6@0:2|-|B5@2:2|-|C6@2:2|-|D6@2:2', {
        instrument: 'bell',
        velocity: 0.14,
        pan: 0.35,
      }),
    ],
  );
}

/** Biblioteca Nocturna — night, lonely, slower; A minor with lamp-warm pads. */
function composeLibrary(): Score {
  const chords = placeChords([
    { beats: 4, root: 'A2', tones: ['E3', 'B3', 'C4'] },
    { beats: 4, root: 'F2', tones: ['E3', 'A3', 'C4'] },
    { beats: 4, root: 'D2', tones: ['F3', 'A3', 'C4', 'E4'] },
    { beats: 2, root: 'E2', tones: ['A3', 'B3', 'D4'] },
    { beats: 2, root: 'E2', tones: ['G#3', 'B3', 'D4'], holdRoot: true },
    { beats: 4, root: 'A2', tones: ['E3', 'A3', 'C4'] },
    { beats: 4, root: 'F2', tones: ['A3', 'C4', 'E4'] },
    { beats: 4, root: 'D2', tones: ['F3', 'A3', 'C4'] },
    { beats: 2, root: 'E2', tones: ['A3', 'B3', 'E4'] },
    { beats: 2, root: 'E2', tones: ['G#3', 'B3', 'E4'], holdRoot: true },
  ]);
  const lonely: readonly Step[] = [
    { at: 0, tone: 'root', beats: 4 },
    { at: 1, tone: 0, beats: 3 },
    { at: 1.5, tone: 1, beats: 2.5, accent: 0.85 },
    { at: 2.5, tone: 2, beats: 1.5, accent: 0.8 },
  ];
  return score(
    60,
    {
      reverbSeconds: 4,
      reverbWet: 0.4,
      delayBeats: 1,
      delayFeedback: 0.35,
      delayWet: 0.2,
      padCutoff: 650,
      padAttack: 1.6,
      level: 0.78,
    },
    [
      ...human(arpeggiate(chords, lonely, { instrument: 'piano', velocity: 0.3, pan: -0.2 }), 31),
      ...sustain(chords, { instrument: 'pad', velocity: 0.26 }),
      ...roots(chords, { instrument: 'bass', velocity: 0.3 }),
      ...human(
        melody(
          [
            'A4@2:1 B4@3:1',
            'C5@0:3 B4@3:1',
            'A4@0:2 F4@2:2',
            'E4@0:2 G#4@2:2',
            'E5@1:1 D5@2:1 C5@3:1',
            'C5@0:2 A4@2:1 G4@3:1',
            'F4@0:2 A4@2:2',
            'B4@0:2 G#4@2:2',
          ].join('|'),
          { instrument: 'piano', velocity: 0.46, pan: 0.2 },
        ),
        32,
      ),
    ],
  );
}

/** El Margen — vast and airy: high register, long pads, lots of space (E Lydian). */
function composeMargin(): Score {
  const progression: readonly Chord[] = [
    { beats: 8, root: 'E2', tones: ['B3', 'E4', 'F#4', 'G#4'] },
    { beats: 8, root: 'E2', tones: ['A#3', 'C#4', 'F#4'] },
    { beats: 8, root: 'C#2', tones: ['B3', 'E4', 'G#4'] },
    { beats: 4, root: 'A1', tones: ['C#4', 'E4', 'B4'] },
    { beats: 4, root: 'B1', tones: ['E4', 'F#4', 'B4'] },
  ];
  const chords = placeChords(progression);
  return score(
    60,
    {
      reverbSeconds: 5,
      reverbWet: 0.5,
      delayBeats: 1.5,
      delayFeedback: 0.42,
      delayWet: 0.26,
      padCutoff: 1400,
      padAttack: 2.4,
      level: 0.75,
    },
    [
      ...sustain(chords, { instrument: 'pad', velocity: 0.3 }),
      ...sustain(chords, { instrument: 'pad', velocity: 0.1, transpose: 12 }),
      ...roots(chords, { instrument: 'bass', velocity: 0.28 }),
      ...alternatePan(
        human(
          melody(
            [
              'G#5@1:3',
              'B5@0:2 F#5@2.5:3',
              'A#5@2:2',
              'C#6@1:3',
              'G#5@0:2 E5@3:2',
              'B5@2:3',
              'C#6@0:2 E6@2.5:3',
              'F#5@1:2 B5@3:1',
            ].join('|'),
            { instrument: 'bell', velocity: 0.22 },
          ),
          41,
        ),
        0.35,
      ),
    ],
  );
}

/** Boss — tense but sad: heartbeat pulse, ticking ostinato, low strings, a lament (D minor). */
function composeBoss(): Score {
  const harmony = placeChords(
    [
      { beats: 4, root: 'D2', tones: ['D3', 'F3', 'A3'] },
      { beats: 4, root: 'Bb1', tones: ['D3', 'F3', 'Bb3'] },
      { beats: 4, root: 'G1', tones: ['D3', 'G3', 'Bb3'] },
      { beats: 4, root: 'A1', tones: ['C#3', 'E3', 'A3'] },
    ],
    2,
  );
  // The ostinato keeps a D pedal over the first three chords, then turns to the dominant.
  const ostinato = placeChords(
    [
      { beats: 12, root: 'D4', tones: ['D4', 'A4', 'F4'] },
      { beats: 4, root: 'A3', tones: ['C#4', 'A4', 'E4'] },
    ],
    2,
  );
  const ticking: Step[] = [];
  for (let at = 0; at < 12; at += 0.5) {
    const tone = [0, 1, 2, 1][(at * 2) % 4] ?? 0;
    ticking.push({ at, tone, beats: 0.45, accent: at % 2 === 0 ? 1.3 : 1 });
  }
  const heartbeat: readonly Step[] = [
    { at: 0, tone: 'root', beats: 1 },
    { at: 0.5, tone: 'root', beats: 1, accent: 0.6 },
    { at: 2, tone: 'root', beats: 1, accent: 0.9 },
    { at: 2.5, tone: 'root', beats: 1, accent: 0.55 },
  ];
  return score(
    96,
    {
      reverbSeconds: 2.6,
      reverbWet: 0.28,
      delayBeats: 0.5,
      delayFeedback: 0.2,
      delayWet: 0.08,
      padCutoff: 900,
      padAttack: 0.8,
      level: 0.85,
    },
    [
      ...human(
        arpeggiate(ostinato, ticking, { instrument: 'piano', velocity: 0.24, pan: -0.2 }),
        51,
      ),
      ...sustain(harmony, { instrument: 'strings', velocity: 0.3 }, 0.1),
      ...roots(harmony, { instrument: 'strings', velocity: 0.34 }),
      ...arpeggiate(harmony, heartbeat, { instrument: 'pulse', velocity: 0.7 }),
      ...melody(
        [
          '-',
          '-',
          '-',
          '-',
          'A4@0:2 G4@2:1 F4@3:1',
          'F4@0:2 E4@2:1 D4@3:1',
          'D4@0:2 E4@2:1 F4@3:1',
          'E4@0:4',
        ].join('|'),
        { instrument: 'strings', velocity: 0.34, pan: 0.15 },
      ),
    ],
  );
}

/** Ending — warm resolution: the title's phrase finally lands on D. */
function composeEnding(): Score {
  const chords = placeChords([
    { beats: 4, root: 'G2', tones: ['B3', 'D4', 'F#4'] },
    { beats: 2, root: 'A2', tones: ['A3', 'D4', 'E4'] },
    { beats: 2, root: 'A2', tones: ['A3', 'C#4', 'E4'], holdRoot: true },
    { beats: 4, root: 'B2', tones: ['A3', 'D4', 'F#4'] },
    { beats: 4, root: 'G2', tones: ['B3', 'D4', 'F#4'] },
    { beats: 4, root: 'E2', tones: ['G3', 'B3', 'D4', 'F#4'] },
    { beats: 2, root: 'A2', tones: ['A3', 'D4', 'E4'] },
    { beats: 2, root: 'A2', tones: ['A3', 'C#4', 'E4'], holdRoot: true },
    { beats: 4, root: 'D2', tones: ['A3', 'D4', 'E4', 'F#4'] },
    { beats: 4, root: 'D2', tones: ['A3', 'D4', 'F#4'] },
  ]);
  return score(
    70,
    {
      reverbSeconds: 3.6,
      reverbWet: 0.36,
      delayBeats: 0.75,
      delayFeedback: 0.26,
      delayWet: 0.15,
      padCutoff: 1000,
      padAttack: 1.4,
      level: 0.8,
    },
    [
      ...human(
        arpeggiate(chords, FLOWING_EIGHTHS, { instrument: 'piano', velocity: 0.22, pan: -0.2 }),
        61,
      ),
      ...sustain(chords, { instrument: 'pad', velocity: 0.2 }),
      ...roots(chords, { instrument: 'bass', velocity: 0.3 }),
      ...human(
        melody(
          [
            'B4@0:1.5 D5@1.5:0.5 F#5@2:2',
            'E5@0:1 D5@1:1 E5@2:2',
            'F#5@0:1.5 E5@1.5:0.5 D5@2:1 B4@3:1',
            'D5@0:4',
            'G5@0:1.5 F#5@1.5:0.5 E5@2:2',
            'E5@0:1 F#5@1:1 E5@2:1 C#5@3:1',
            'D5@0:4',
            'F#4@2:1 A4@3:1',
          ].join('|'),
          { instrument: 'piano', velocity: 0.5, pan: 0.2 },
        ),
        62,
      ),
      ...melody('-|-|-|D6@0:3|-|-|A5@0:2 D6@2:2|-', {
        instrument: 'bell',
        velocity: 0.16,
        pan: 0.3,
      }),
    ],
  );
}

export const TRACKS: Readonly<Record<MusicId, Score>> = {
  title: composeTitle(),
  sandbox: composeSandbox(),
  library: composeLibrary(),
  margin: composeMargin(),
  boss: composeBoss(),
  ending: composeEnding(),
};
