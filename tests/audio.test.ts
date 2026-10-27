import { describe, expect, it } from 'vitest';
import { AudioDirector, audioDirector, type MusicId, type SfxId } from '../src/audio/AudioDirector';
import {
  createRng,
  envelopeAt,
  envelopeDuration,
  foldLoop,
  generateImpulse,
  midiToFrequency,
  noteToMidi,
  StateVariableFilter,
} from '../src/audio/dsp';
import { MUSIC_SAMPLE_RATE } from '../src/audio/musicRenderer';
import { humanize, loopBeats, loopSeconds, melody, placeChords, roots } from '../src/audio/score';
import { SFX_DEFS, SFX_IDS } from '../src/audio/sfxDefs';
import { renderSfx, SfxRenderJob, sfxDuration } from '../src/audio/synth';
import { TrackLoader } from '../src/audio/trackLoader';
import { MUSIC_IDS, TRACKS } from '../src/audio/tracks';

const SAMPLE_RATE = 44100;

function stats(samples: Float32Array): { finite: boolean; peak: number } {
  let finite = true;
  let peak = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample)) finite = false;
    peak = Math.max(peak, Math.abs(sample));
  }
  return { finite, peak };
}

describe('pitch helpers', () => {
  it('maps MIDI notes to equal-tempered frequencies', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
    expect(midiToFrequency(60)).toBeCloseTo(261.626, 2);
  });

  it('parses note names with sharps, flats and octaves', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('F#3')).toBe(54);
    expect(noteToMidi('Bb1')).toBe(34);
    expect(() => noteToMidi('H2')).toThrow();
  });
});

describe('dsp', () => {
  it('produces a deterministic PRNG in [0, 1)', () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('shapes envelopes that start and end in silence', () => {
    const env = { attack: 0.01, hold: 0.05, release: 0.2 };
    expect(envelopeAt(env, -0.1)).toBe(0);
    expect(envelopeAt(env, 0)).toBe(0);
    expect(envelopeAt(env, 0.03)).toBe(1);
    expect(envelopeAt(env, 0.15)).toBeGreaterThan(0);
    expect(envelopeAt(env, 0.15)).toBeLessThan(1);
    expect(envelopeAt(env, envelopeDuration(env))).toBe(0);
  });

  it('keeps the state-variable filter stable for every mode', () => {
    for (const mode of ['lowpass', 'highpass', 'bandpass'] as const) {
      const filter = new StateVariableFilter(mode, SAMPLE_RATE);
      const rng = createRng(3);
      let peak = 0;
      for (let i = 0; i < SAMPLE_RATE; i++) {
        if (i % 16 === 0) filter.setCutoff(100 + (i / SAMPLE_RATE) * 15000, 2);
        peak = Math.max(peak, Math.abs(filter.process(rng() * 2 - 1)));
      }
      expect(Number.isFinite(peak)).toBe(true);
      expect(peak).toBeLessThan(10);
    }
  });

  it('folds a loop tail back onto its start', () => {
    expect(Array.from(foldLoop([1, 2, 3, 4, 5, 6, 7], 3))).toEqual([1 + 4 + 7, 2 + 5, 3 + 6]);
  });

  it('generates a decaying stereo impulse response', () => {
    const [left, right] = generateImpulse(8000, 2, createRng(1));
    expect(left.length).toBe(16000);
    expect(right.length).toBe(16000);
    const early = stats(left.subarray(0, 4000));
    const late = stats(left.subarray(12000));
    expect(early.finite && late.finite).toBe(true);
    expect(late.peak).toBeLessThan(early.peak);
    expect(left[left.length - 1]).toBeCloseTo(0, 3);
  });
});

describe('sfx synthesis', () => {
  it('defines every SFX id', () => {
    expect(Object.keys(SFX_DEFS).sort()).toEqual([...SFX_IDS].sort());
  });

  it.each(SFX_IDS)('renders "%s" as finite, audible samples within [-1, 1]', (id) => {
    const spec = SFX_DEFS[id];
    const samples = renderSfx(spec, SAMPLE_RATE, 1);
    const { finite, peak } = stats(samples);
    expect(finite).toBe(true);
    expect(peak).toBeLessThanOrEqual(1);
    expect(peak).toBeGreaterThan(0.02);
    expect(samples.length).toBe(Math.ceil(sfxDuration(spec) * SAMPLE_RATE));
    expect(sfxDuration(spec)).toBeLessThan(7);
    expect(Math.abs(samples[samples.length - 1] ?? 1)).toBe(0);
  });

  it('keeps gameplay sounds short', () => {
    const quick: SfxId[] = [
      'jump',
      'land',
      'swing',
      'hit',
      'pogo',
      'key',
      'select',
      'talk',
      'dash',
    ];
    for (const id of quick) expect(sfxDuration(SFX_DEFS[id])).toBeLessThan(0.35);
  });

  it('is deterministic for a seed', () => {
    const a = renderSfx(SFX_DEFS.erase, SAMPLE_RATE, 9);
    const b = renderSfx(SFX_DEFS.erase, SAMPLE_RATE, 9);
    expect(a).toEqual(b);
  });

  it('renders incrementally, one layer per step, to the same samples', () => {
    const spec = SFX_DEFS.bossDefeat;
    const job = new SfxRenderJob(spec, SAMPLE_RATE, 4);
    let steps = 0;
    while (!job.step()) steps++;
    expect(steps).toBe(spec.layers.length);
    expect(job.done).toBe(true);
    expect(job.finish()).toEqual(renderSfx(spec, SAMPLE_RATE, 4));
  });
});

describe('music scores', () => {
  it('builds chord progressions and melodies from compact notation', () => {
    const chords = placeChords(
      [
        { beats: 2, root: 'A2', tones: ['D4'] },
        { beats: 2, root: 'A2', tones: ['C#4'], holdRoot: true },
      ],
      2,
    );
    expect(chords.map((chord) => chord.start)).toEqual([0, 2, 4, 6]);
    const bass = roots(chords, { instrument: 'bass', velocity: 0.5 });
    expect(bass.map((event) => [event.beat, event.beats])).toEqual([
      [0, 4],
      [4, 4],
    ]);
    const line = melody('E5@0:2 C#5@2:2 | - | D5@1:3', { instrument: 'piano', velocity: 0.5 });
    expect(line.map((event) => [event.midi, event.beat, event.beats])).toEqual([
      [76, 0, 2],
      [73, 2, 2],
      [74, 9, 3],
    ]);
    expect(() => melody('E5-0-2', { instrument: 'piano', velocity: 0.5 })).toThrow();
  });

  it('humanizes without leaving the loop', () => {
    const events = melody('C4@0:1 | C4@3.99:1', { instrument: 'piano', velocity: 1 });
    for (const event of humanize(events, 1, 8, 0.5, 0.5)) {
      expect(event.beat).toBeGreaterThanOrEqual(0);
      expect(event.beat).toBeLessThan(8);
      expect(event.velocity).toBeLessThanOrEqual(1);
    }
  });

  it.each(MUSIC_IDS)('composes "%s" as a valid 16–34 s loop', (id) => {
    const score = TRACKS[id];
    const seconds = loopSeconds(score);
    expect(seconds).toBeGreaterThanOrEqual(16);
    expect(seconds).toBeLessThanOrEqual(34);
    expect(score.events.length).toBeGreaterThan(10);
    const beats = loopBeats(score);
    for (const event of score.events) {
      expect(event.beat).toBeGreaterThanOrEqual(0);
      expect(event.beat).toBeLessThan(beats);
      expect(event.beats).toBeGreaterThan(0);
      expect(event.velocity).toBeGreaterThan(0);
      expect(event.velocity).toBeLessThanOrEqual(1);
      expect(Math.abs(event.pan)).toBeLessThanOrEqual(1);
      const hz = midiToFrequency(event.midi);
      expect(hz).toBeGreaterThan(25);
      expect(hz).toBeLessThan(MUSIC_SAMPLE_RATE / 4);
    }
  });
});

describe('TrackLoader', () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('renders one track at a time, explicit requests first, and caches results', async () => {
    const started: string[] = [];
    const finishers = new Map<string, (value: string) => void>();
    const loader = new TrackLoader<string, string>(
      (id) => {
        started.push(id);
        return new Promise((resolve) => finishers.set(id, resolve));
      },
      () => undefined,
    );
    loader.prefetch(['a', 'b', 'c']);
    expect(started).toEqual(['a']);
    const c = loader.load('c');
    finishers.get('a')?.('A');
    await flush();
    expect(started).toEqual(['a', 'c']);
    finishers.get('c')?.('C');
    expect(await c).toBe('C');
    await flush();
    expect(started).toEqual(['a', 'c', 'b']);
    finishers.get('b')?.('B');
    expect(await loader.load('a')).toBe('A');
    expect(await loader.load('b')).toBe('B');
    expect(started).toHaveLength(3);
    expect(loader.isReady('b')).toBe(true);
  });

  it('resolves failed renders to null and keeps going', async () => {
    const errors: string[] = [];
    const loader = new TrackLoader<string, string>(
      (id) => (id === 'bad' ? Promise.reject(new Error('boom')) : Promise.resolve(id)),
      (id) => errors.push(id),
    );
    const bad = loader.load('bad');
    const good = loader.load('good');
    expect(await bad).toBeNull();
    expect(await good).toBe('good');
    expect(errors).toEqual(['bad']);
  });
});

describe('AudioDirector without Web Audio (Node)', () => {
  it('imports and no-ops before unlock', () => {
    const music: (MusicId | null)[] = ['title', 'title', 'boss', null];
    expect(() => {
      for (const id of SFX_IDS) audioDirector.playSfx(id);
      for (const id of music) audioDirector.playMusic(id);
    }).not.toThrow();
  });

  it('silently ignores unlock when AudioContext is missing', () => {
    const director = new AudioDirector();
    expect(() => {
      director.unlock();
      director.playSfx('jump');
      director.playMusic('sandbox');
      director.unlock();
    }).not.toThrow();
  });

  it('clamps volumes', () => {
    const director = new AudioDirector();
    director.setMasterVolume(2);
    expect(director.masterVolume).toBe(1);
    director.setMasterVolume(-1);
    expect(director.masterVolume).toBe(0);
    director.setMasterVolume(Number.NaN);
    expect(director.masterVolume).toBe(0);
    director.setMusicVolume(0.4);
    expect(director.musicVolume).toBe(0.4);
  });
});
