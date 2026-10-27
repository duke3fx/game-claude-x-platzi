/**
 * Clawd's four dances, as pure functions of time. Each pose says which body pose to show,
 * where the eyes look and how the sprite is transformed, so the scene only has to render it.
 * Inspired by the official Clawd animations: arms-up hop, wave, turntable and the spinner.
 */
export type DanceId = 'hooray' | 'wave' | 'turntable' | 'thinking';

export const DANCE_ORDER: readonly DanceId[] = ['hooray', 'wave', 'turntable', 'thinking'];

export type DanceBodyPose = 'idle' | 'closed' | 'armsUp' | 'waveLeft' | 'waveRight' | 'back';

export interface DancePose {
  readonly pose: DanceBodyPose;
  /** -1 look left, 0 center, 1 look right. */
  readonly look: -1 | 0 | 1;
  /** Vertical offset in world pixels (negative is up). */
  readonly offsetY: number;
  readonly scaleX: number;
  readonly scaleY: number;
  /** Rotation in degrees. */
  readonly angle: number;
  /** Increments on every beat; the scene fires effects when it changes. */
  readonly beat: number;
}

export const DANCE_DURATION_MS: Readonly<Record<DanceId, number>> = {
  hooray: 2400,
  wave: 2000,
  turntable: 2000,
  thinking: 2600,
};

const HOP_MS = 600;
const HOP_HEIGHT = 10;
const WAVE_FLAP_MS = 150;
const WAVE_LOOK_MS = 600;
const WAVE_SWAY_DEG = 5;
const SPIN_MS = 1000;
const MIN_SPIN_SCALE = 0.12;
const THINK_SWAY_DEG = 8;
const THINK_BEAT_MS = 120;

function hooray(t: number): DancePose {
  const phase = (t % HOP_MS) / HOP_MS;
  const hop = Math.sin(phase * Math.PI);
  const landing = phase < 0.12 || phase > 0.88;
  return {
    pose: hop > 0.5 ? 'armsUp' : 'idle',
    look: 0,
    offsetY: -Math.round(hop * HOP_HEIGHT),
    scaleX: landing ? 1.2 : 0.92,
    scaleY: landing ? 0.82 : 1.1,
    angle: 0,
    beat: Math.floor(t / HOP_MS),
  };
}

function wave(t: number): DancePose {
  const flapping = Math.floor(t / WAVE_FLAP_MS) % 2 === 0;
  const lookRight = Math.floor(t / WAVE_LOOK_MS) % 2 === 0;
  return {
    pose: flapping ? (lookRight ? 'waveRight' : 'waveLeft') : 'idle',
    look: lookRight ? 1 : -1,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
    angle: Math.sin(t / 300) * WAVE_SWAY_DEG,
    beat: Math.floor(t / WAVE_LOOK_MS),
  };
}

function turntable(t: number): DancePose {
  const phase = (t / SPIN_MS) * Math.PI * 2;
  const facing = Math.cos(phase);
  return {
    pose: facing >= 0 ? 'idle' : 'back',
    look: Math.sin(phase) > 0 ? 1 : -1,
    offsetY: -Math.round(Math.abs(Math.sin(phase * 2)) * 2),
    scaleX: Math.max(MIN_SPIN_SCALE, Math.abs(facing)),
    scaleY: 1,
    angle: 0,
    beat: Math.floor(t / (SPIN_MS / 2)),
  };
}

function thinking(t: number): DancePose {
  return {
    pose: 'closed',
    look: 0,
    offsetY: -Math.round(Math.sin(t / 200) + 1),
    scaleX: 1,
    scaleY: 1,
    angle: Math.sin(t / 400) * THINK_SWAY_DEG,
    beat: Math.floor(t / THINK_BEAT_MS),
  };
}

const DANCES: Readonly<Record<DanceId, (t: number) => DancePose>> = {
  hooray,
  wave,
  turntable,
  thinking,
};

export function dancePose(id: DanceId, timeMs: number): DancePose {
  return DANCES[id](Math.max(0, timeMs));
}

/** The dance that follows `index` presses of the dance button (cycles through all four). */
export function danceAt(index: number): DanceId {
  return (
    DANCE_ORDER[((index % DANCE_ORDER.length) + DANCE_ORDER.length) % DANCE_ORDER.length] ??
    'hooray'
  );
}
