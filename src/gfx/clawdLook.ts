import type { PixelSprite } from './pixelArt';

/**
 * Builds a copy of a sprite with its eye pixels ('o') shifted horizontally, the way the official
 * Clawd "looks" left or right. Eyes that would leave the body are kept in place.
 */
export function withEyesShifted(sprite: PixelSprite, dx: number): PixelSprite {
  const frames = sprite.frames.map((rows) =>
    rows.map((row) => {
      const chars = [...row];
      const eyes = chars.flatMap((char, i) => (char === 'o' ? [i] : []));
      const canShift = eyes.every((i) => chars[i + dx] === '#' || chars[i + dx] === 'o');
      if (!canShift) return row;
      for (const i of eyes) chars[i] = '#';
      for (const i of eyes) chars[i + dx] = 'o';
      return chars.join('');
    }),
  );
  return { ...sprite, frames };
}
