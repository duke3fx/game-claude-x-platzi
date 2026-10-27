import type { PixelSprite } from './pixelArt';
import { CLAWD } from './sprites';

/** Frame indices of the extended Clawd sheet (the official six plus dance poses). */
export const CLAWD_FRAME = {
  idle: 0,
  closed: 1,
  walkA: 2,
  walkB: 3,
  armsUp: 4,
  lookDown: 5,
  waveLeft: 6,
  waveRight: 7,
  back: 8,
} as const;

const WAVE_RIGHT = [
  '..#############..',
  '..#############..',
  '..##o#######o####',
  '..##o#######o####',
  '################.',
  '################.',
  '..#############..',
  '..#############..',
  '..#.#.......#.#..',
  '..#.#.......#.#..',
];

const mirror = (rows: readonly string[]): string[] =>
  rows.map((row) => [...row].reverse().join(''));
const withoutEyes = (rows: readonly string[]): string[] =>
  rows.map((row) => row.replaceAll('o', '#'));

/** CLAWD (unchanged) plus a one-arm wave on each side and a back view for the turntable. */
export const CLAWD_POSES: PixelSprite = {
  ...CLAWD,
  frames: [...CLAWD.frames, mirror(WAVE_RIGHT), WAVE_RIGHT, withoutEyes(CLAWD.frames[0] ?? [])],
};
