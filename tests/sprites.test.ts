import { describe, expect, it } from 'vitest';
import type { PixelSprite } from '../src/gfx/pixelArt';
import * as sprites from '../src/gfx/sprites';

const TRANSPARENT = new Set(['.', ' ']);

function isPixelSprite(value: unknown): value is PixelSprite {
  if (typeof value !== 'object' || value === null) return false;
  return 'palette' in value && 'frames' in value && Array.isArray(value.frames);
}

const entries = Object.entries(sprites).filter(
  (entry): entry is [string, PixelSprite] => isPixelSprite(entry[1]),
);

/** Names other modules import; sizes are in cells (width x height). */
const CONTRACT: Readonly<Record<string, { frames: number; size?: readonly [number, number] }>> = {
  CLAWD: { frames: 6, size: [17, 10] },
  GARABATO: { frames: 3 },
  TODO_BUG: { frames: 3 },
  TILDE: { frames: 2 },
  ECO_17: { frames: 2, size: [17, 10] },
  EXPLORE: { frames: 2 },
  COMMIT: { frames: 2 },
  NOTE: { frames: 2 },
  CONTEXT_SPARK: { frames: 6, size: [5, 5] },
  LUZ_DESK: { frames: 1 },
  BRIDGE: { frames: 2, size: [8, 8] },
  SPIKES: { frames: 1, size: [8, 4] },
  MIRAGE: { frames: 2, size: [16, 4] },
  BLANK_PAGE: { frames: 3 },
  ERASER: { frames: 1 },
  KEYCAP: { frames: 1 },
  LOOP_WHEEL: { frames: 2 },
  TOKEN_ICON: { frames: 2 },
  SLASH: { frames: 3 },
  PARTICLE_DOT: { frames: 1, size: [1, 1] },
  PARTICLE_INK: { frames: 1, size: [1, 1] },
  PARTICLE_CRUMB: { frames: 1, size: [2, 1] },
  PARTICLE_EMBER: { frames: 1, size: [1, 1] },
};

describe('sprites', () => {
  it('exports every sprite of the art contract', () => {
    const names = entries.map(([name]) => name);
    for (const [name, spec] of Object.entries(CONTRACT)) {
      expect(names, name).toContain(name);
      const sprite = entries.find(([n]) => n === name)?.[1];
      expect(sprite?.frames.length, `${name} frame count`).toBe(spec.frames);
      if (spec.size && sprite) {
        const first = sprite.frames[0] ?? [];
        expect([first[0]?.length, first.length], `${name} size`).toEqual([...spec.size]);
      }
    }
  });

  describe.each(entries)('%s', (_name, sprite) => {
    it('has at least one non-empty frame', () => {
      expect(sprite.frames.length).toBeGreaterThan(0);
      expect(sprite.frames[0]?.length ?? 0).toBeGreaterThan(0);
    });

    it('uses the same width and height in every row and frame', () => {
      const height = sprite.frames[0]?.length ?? 0;
      const width = sprite.frames[0]?.[0]?.length ?? 0;
      expect(width).toBeGreaterThan(0);
      sprite.frames.forEach((frame, index) => {
        expect(frame.length, `frame ${index} height`).toBe(height);
        frame.forEach((row, y) => {
          expect(row.length, `frame ${index} row ${y} width`).toBe(width);
        });
      });
    });

    it('only uses characters defined in its palette', () => {
      const unknown = new Set<string>();
      for (const frame of sprite.frames) {
        for (const row of frame) {
          for (const char of row) {
            if (!TRANSPARENT.has(char) && !(char in sprite.palette)) unknown.add(char);
          }
        }
      }
      expect([...unknown]).toEqual([]);
    });

    it('draws at least one visible cell per frame', () => {
      sprite.frames.forEach((frame, index) => {
        const visible = frame.some((row) => [...row].some((char) => !TRANSPARENT.has(char)));
        expect(visible, `frame ${index}`).toBe(true);
      });
    });

    it('uses valid #RRGGBB palette colors', () => {
      for (const color of Object.values(sprite.palette)) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });
});
