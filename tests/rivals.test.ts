import { describe, expect, it } from 'vitest';
import { COLORS } from '../src/config/palette';
import type { PixelSprite } from '../src/gfx/pixelArt';
import { RIVAL_SPRITES } from '../src/gfx/rivals';

const TRANSPARENT = new Set(['.', ' ']);

interface Spec {
  readonly frames: number;
  /** Largest allowed size in cells (cols x rows). */
  readonly max: readonly [number, number];
  /** Required size in cells, when the gameplay code depends on it. */
  readonly exact?: readonly [number, number];
}

const BOSS: Spec = { frames: 3, max: [32, 34] };

const SPECS: Readonly<Record<keyof typeof RIVAL_SPRITES, Spec>> = {
  luna: BOSS,
  brasa: BOSS,
  nebula: BOSS,
  moonRock: { frames: 1, max: [8, 8] },
  crescent: { frames: 1, max: [10, 10] },
  fireball: { frames: 2, max: [9, 9] },
  flamePillar: { frames: 2, max: [8, 32], exact: [8, 32] },
  star: { frames: 2, max: [7, 7] },
  shockwave: { frames: 1, max: [12, 6] },
  blackHole: { frames: 2, max: [18, 18] },
};

/** Clawd's colors never appear on a rival. */
const BRAND = [COLORS.clawdBody, COLORS.clawdShade, COLORS.clawdLight, '#EDA289'];

const entries = Object.entries(RIVAL_SPRITES) as [keyof typeof RIVAL_SPRITES, PixelSprite][];

function cells(frame: readonly string[]): string[] {
  return frame.flatMap((row) => [...row]).filter((char) => !TRANSPARENT.has(char));
}

describe('rival sprites', () => {
  it('exports exactly the expected texture keys', () => {
    expect(Object.keys(RIVAL_SPRITES).sort()).toEqual(Object.keys(SPECS).sort());
  });

  describe.each(entries)('%s', (name, sprite) => {
    const spec = SPECS[name];
    const width = sprite.frames[0]?.[0]?.length ?? 0;
    const height = sprite.frames[0]?.length ?? 0;

    it('has the expected number of non-empty frames', () => {
      expect(sprite.frames.length).toBe(spec.frames);
      sprite.frames.forEach((frame, index) => {
        expect(cells(frame).length, `frame ${index}`).toBeGreaterThan(0);
      });
    });

    it('uses the same width and height in every row and frame', () => {
      expect(width).toBeGreaterThan(0);
      sprite.frames.forEach((frame, index) => {
        expect(frame.length, `frame ${index} height`).toBe(height);
        frame.forEach((row, y) => {
          expect(row.length, `frame ${index} row ${y} width`).toBe(width);
        });
      });
    });

    it('stays within its size limits', () => {
      expect(width).toBeLessThanOrEqual(spec.max[0]);
      expect(height).toBeLessThanOrEqual(spec.max[1]);
      if (spec.exact) expect([width, height]).toEqual([...spec.exact]);
    });

    it('only uses characters defined in its palette', () => {
      const unknown = new Set(
        sprite.frames.flatMap(cells).filter((char) => !(char in sprite.palette)),
      );
      expect([...unknown]).toEqual([]);
    });

    it('uses valid #RRGGBB colors and none of Clawd brand colors', () => {
      for (const color of Object.values(sprite.palette)) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(BRAND, color).not.toContain(color.toUpperCase());
      }
    });

    it('shows danger magenta in every frame', () => {
      const magenta = Object.keys(sprite.palette).filter(
        (char) => sprite.palette[char]?.toUpperCase() === COLORS.danger,
      );
      sprite.frames.forEach((frame, index) => {
        expect(
          cells(frame).some((char) => magenta.includes(char)),
          `frame ${index}`,
        ).toBe(true);
      });
    });
  });
});
