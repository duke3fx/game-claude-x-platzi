import { describe, expect, it } from 'vitest';
import { COLORS } from '../src/config/palette';
import { DOTS_KEYS, GROK_BOT_KEYS, MINION_SPRITES } from '../src/gfx/minions';

const TRANSPARENT = new Set(['.', ' ']);

/** Clawd's colors never appear on an enemy. */
const BRAND = [COLORS.clawdBody, COLORS.clawdShade, COLORS.clawdLight, '#EDA289'];

const entries = Object.entries(MINION_SPRITES);

function cells(frame: readonly string[]): string[] {
  return frame.flatMap((row) => [...row]).filter((char) => !TRANSPARENT.has(char));
}

describe('minion sprites', () => {
  it('bakes one texture per Grok Bot shape and per Dots plush', () => {
    expect(GROK_BOT_KEYS).toHaveLength(8);
    expect(DOTS_KEYS).toHaveLength(4);
    expect(Object.keys(MINION_SPRITES).sort()).toEqual([...GROK_BOT_KEYS, ...DOTS_KEYS].sort());
  });

  it('gives Grok Bots an even number of shapes, so a hit always swaps to a new one', () => {
    expect(GROK_BOT_KEYS.length % 2).toBe(0);
  });

  describe.each(entries)('%s', (key, sprite) => {
    const width = sprite.frames[0]?.[0]?.length ?? 0;
    const height = sprite.frames[0]?.length ?? 0;
    const isGrok = key.startsWith('grokBot-');

    it('has walk frames (Grok Bot) or idle, bob and dive frames (Dots)', () => {
      expect(sprite.frames).toHaveLength(isGrok ? 2 : 3);
    });

    it('uses a square grid smaller than Clawd is wide, the same in every frame', () => {
      expect(width).toBe(height);
      expect(width).toBeLessThanOrEqual(16);
      for (const frame of sprite.frames) {
        expect(frame).toHaveLength(height);
        for (const row of frame) expect(row).toHaveLength(width);
      }
    });

    it('only uses palette characters, with valid colors and none of Clawd brand colors', () => {
      const unknown = new Set(
        sprite.frames.flatMap(cells).filter((char) => !(char in sprite.palette)),
      );
      expect([...unknown]).toEqual([]);
      for (const color of Object.values(sprite.palette)) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(BRAND, color).not.toContain(color.toUpperCase());
      }
    });

    it('has a body in every frame', () => {
      for (const frame of sprite.frames) expect(cells(frame).length).toBeGreaterThan(40);
    });

    it('shows danger magenta in every frame', () => {
      const magenta = Object.keys(sprite.palette).filter(
        (char) => sprite.palette[char]?.toUpperCase() === COLORS.danger,
      );
      for (const frame of sprite.frames) {
        expect(cells(frame).some((char) => magenta.includes(char))).toBe(true);
      }
    });

    if (isGrok) {
      it('stands on the bottom row of every frame', () => {
        for (const frame of sprite.frames) {
          expect(cells([frame.at(-1) ?? '']).length).toBeGreaterThan(0);
        }
      });
    }
  });
});
