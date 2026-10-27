import type { AccessoryId } from '../core/accessories';
import type { PixelSprite } from './pixelArt';

/**
 * Accessory sheets: one frame per Clawd frame, drawn on Clawd's grid plus a margin, so an overlay
 * sprite with the same origin, frame, scale and angle as Clawd sits exactly on him.
 */
export const GEAR_PAD = { side: 1, top: 5 } as const;

/** Clawd's eye pixel; frames without it are the back view. */
const EYE = 'o';

type Put = (x: number, y: number, char: string) => void;

interface Eyes {
  readonly left: number;
  readonly right: number;
  /** Lowest eye row: it stays put while blinking. */
  readonly bottom: number;
}

interface AccessoryArt {
  readonly palette: Readonly<Record<string, string>>;
  /** Paints in Clawd's grid coordinates (head spans x 2..14, y 0..3). */
  readonly draw: (put: Put, eyes: Eyes | null) => void;
}

function span(put: Put, y: number, from: number, to: number, char: string): void {
  for (let x = from; x <= to; x++) put(x, y, char);
}

const ART: Readonly<Record<AccessoryId, AccessoryArt>> = {
  headphones: {
    palette: { n: '#2B4C9B', l: '#4A72D1', d: '#1A2F66' },
    draw: (put) => {
      span(put, -3, 5, 11, 'n');
      put(7, -3, 'l');
      span(put, -2, 3, 4, 'n');
      span(put, -2, 12, 13, 'n');
      put(2, -1, 'n');
      put(14, -1, 'n');
      for (let y = 0; y <= 3; y++) {
        put(1, y, 'd');
        put(2, y, y === 1 ? 'l' : 'n');
        put(14, y, 'n');
        put(15, y, 'd');
      }
    },
  },
  glasses: {
    palette: { k: '#1E1E22', g: '#BFE3FF' },
    draw: (put, eyes) => {
      if (!eyes) return;
      const { left, right, bottom } = eyes;
      for (const x of [left, right]) {
        span(put, bottom - 2, x - 2, x + 2, 'k');
        span(put, bottom + 1, x - 2, x + 2, 'k');
        for (let y = bottom - 1; y <= bottom; y++) {
          put(x - 2, y, 'k');
          put(x + 2, y, 'k');
        }
        put(x + 1, bottom - 1, 'g');
      }
      span(put, bottom - 1, left + 3, right - 3, 'k');
    },
  },
  beanie: {
    palette: { b: '#7FB539', l: '#A5D65A', d: '#5A8A22', p: '#F4F1E8', q: '#D8D0BC' },
    draw: (put) => {
      span(put, -5, 7, 9, 'p');
      span(put, -4, 7, 9, 'p');
      put(9, -4, 'q');
      span(put, -3, 4, 12, 'b');
      span(put, -3, 5, 6, 'l');
      span(put, -2, 3, 13, 'b');
      put(4, -2, 'l');
      span(put, -1, 2, 14, 'b');
      for (const y of [0, 1]) {
        for (let x = 1; x <= 15; x++) put(x, y, x % 2 === 0 ? 'd' : 'b');
      }
    },
  },
  cap: {
    palette: { k: '#24242C', d: '#3A3A46', t: '#F2C14E', s: '#B8862B' },
    draw: (put) => {
      // A mortarboard seen from the front: the top face, then its thick front edge.
      span(put, -5, 5, 11, 'd');
      span(put, -4, 2, 14, 'd');
      span(put, -3, 1, 15, 'k');
      span(put, -2, 4, 12, 'k');
      span(put, -1, 3, 13, 'k');
      // Button and a tassel hanging from the right corner.
      put(8, -5, 't');
      span(put, -4, 9, 14, 's');
      for (let y = -3; y <= 0; y++) put(15, y, 't');
      span(put, 1, 15, 16, 't');
      span(put, 2, 15, 16, 's');
    },
  },
  crown: {
    palette: { y: '#F2C14E', h: '#FFE89A', s: '#B8862B', j: '#3FD0C9' },
    draw: (put) => {
      for (const x of [4, 8, 12]) put(x, -5, 'h');
      for (const x of [4, 7, 8, 9, 12]) put(x, -4, 'y');
      for (const x of [4, 5, 7, 8, 9, 11, 12]) put(x, -3, 'y');
      span(put, -2, 4, 12, 'y');
      put(5, -2, 'h');
      put(8, -2, 'j');
      span(put, -1, 4, 12, 's');
    },
  },
};

function findEyes(frame: readonly string[]): Eyes | null {
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  frame.forEach((row, y) => {
    [...row].forEach((char, x) => {
      if (char !== EYE) return;
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    });
  });
  return Number.isFinite(left) ? { left, right, bottom } : null;
}

/** Texture key of an accessory sheet that matches a Clawd sheet ('clawd', 'clawdLeft'...). */
export function gearKey(base: string, id: AccessoryId): string {
  return `${base}:${id}`;
}

/** Builds the accessory frames that line up with each frame of a Clawd sheet. */
export function accessorySheet(base: PixelSprite, id: AccessoryId): PixelSprite {
  const art = ART[id];
  const frames = base.frames.map((frame) => {
    const width = (frame[0]?.length ?? 0) + GEAR_PAD.side * 2;
    const height = frame.length + GEAR_PAD.top;
    const grid = Array.from({ length: height }, () => Array<string>(width).fill('.'));
    const put: Put = (x, y, char) => {
      const row = grid[y + GEAR_PAD.top];
      const gx = x + GEAR_PAD.side;
      if (row && gx >= 0 && gx < width) row[gx] = char;
    };
    art.draw(put, findEyes(frame));
    return grid.map((row) => row.join(''));
  });
  return { palette: art.palette, frames };
}
