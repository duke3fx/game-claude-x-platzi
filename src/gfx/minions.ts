import { COLORS } from '../config/palette';
import type { PixelSprite } from './pixelArt';
import { hashSeed, mulberry32 } from './tiles';

/**
 * The rivals' minions, drawn procedurally: Grok Bots (flat blue blobs of many shapes with two
 * slanted eyes) and Dots (fluffy plush characters with accessories). Shapes are defined in
 * normalized coordinates (-1..1, +y down) and rasterized per frame, so squash, stretch and bob
 * reuse the same drawing.
 */

/** A point test in normalized coordinates. */
type Shape = (u: number, v: number) => boolean;

/** Per-frame transform: scale around the bottom-center of the grid, then lift by `bob` cells. */
interface FrameTransform {
  readonly sx: number;
  readonly sy: number;
  readonly bob: number;
}

const TRANSPARENT = '.';
const DANGER = 'g';
const INK = 'k';

class Raster {
  readonly size: number;
  private readonly cells: string[];

  constructor(size: number) {
    this.size = size;
    this.cells = Array.from({ length: size * size }, () => TRANSPARENT);
  }

  get(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return TRANSPARENT;
    return this.cells[y * this.size + x] ?? TRANSPARENT;
  }

  set(x: number, y: number, char: string): void {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    this.cells[y * this.size + x] = char;
  }

  /** Paints every cell whose center lies inside the shape (seen through the transform). */
  fill(shape: Shape, char: string, t: FrameTransform): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const [u, v] = this.toShape(x + 0.5, y + 0.5, t);
        if (shape(u, v)) this.set(x, y, char);
      }
    }
  }

  /** Grid cell of a normalized point after the frame transform. */
  toCell(u: number, v: number, t: FrameTransform): [number, number] {
    const tu = u * t.sx;
    const tv = 1 - (1 - v) * t.sy;
    const x = Math.floor(((tu + 1) / 2) * this.size);
    const y = Math.floor(((tv + 1) / 2) * this.size) - t.bob;
    return [x, y];
  }

  /** Stamps a small pattern ('.' = skip) with its top-left corner at a cell. */
  stamp(x: number, y: number, pattern: readonly string[]): void {
    pattern.forEach((row, dy) => {
      [...row].forEach((char, dx) => {
        if (char !== TRANSPARENT) this.set(x + dx, y + dy, char);
      });
    });
  }

  /** Cells of `body` touching transparency become `edge` (an inner outline). */
  outline(body: ReadonlySet<string>, edge: string): void {
    const marks: Array<[number, number]> = [];
    this.forEach((x, y, char) => {
      if (!body.has(char)) return;
      const open = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ].some(([dx = 0, dy = 0]) => this.get(x + dx, y + dy) === TRANSPARENT);
      if (open) marks.push([x, y]);
    });
    for (const [x, y] of marks) this.set(x, y, edge);
  }

  /** Light on the top-left rim, shade on the bottom-right rim of `body` cells. */
  shade(body: string, light: string, dark: string): void {
    const marks: Array<[number, number, string]> = [];
    this.forEach((x, y, char) => {
      if (char !== body) return;
      if (this.get(x - 1, y - 1) !== body && this.get(x, y - 1) !== body) marks.push([x, y, light]);
      else if (this.get(x + 1, y + 1) !== body && this.get(x, y + 1) !== body)
        marks.push([x, y, dark]);
    });
    for (const [x, y, char] of marks) this.set(x, y, char);
  }

  forEach(fn: (x: number, y: number, char: string) => void): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) fn(x, y, this.get(x, y));
    }
  }

  rows(): string[] {
    return Array.from({ length: this.size }, (_, y) =>
      this.cells.slice(y * this.size, (y + 1) * this.size).join(''),
    );
  }

  private toShape(px: number, py: number, t: FrameTransform): [number, number] {
    const u = (px / this.size) * 2 - 1;
    const v = ((py + t.bob) / this.size) * 2 - 1;
    return [u / t.sx, 1 - (1 - v) / t.sy];
  }
}

// ------------------------------------------------------------------ shape helpers

const circle =
  (cx: number, cy: number, r: number): Shape =>
  (u, v) =>
    (u - cx) ** 2 + (v - cy) ** 2 <= r * r;

const ellipse =
  (cx: number, cy: number, rx: number, ry: number): Shape =>
  (u, v) =>
    ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;

const union =
  (...shapes: Shape[]): Shape =>
  (u, v) =>
    shapes.some((shape) => shape(u, v));

const rotate =
  (shape: Shape, degrees: number): Shape =>
  (u, v) => {
    const a = (degrees * Math.PI) / 180;
    return shape(u * Math.cos(a) + v * Math.sin(a), -u * Math.sin(a) + v * Math.cos(a));
  };

/** Rounded regular polygon / lobed outline: radius as a function of the angle. */
const polar =
  (cy: number, radius: (theta: number) => number): Shape =>
  (u, v) =>
    Math.hypot(u, v - cy) <= radius(Math.atan2(v - cy, u));

/** Superellipse: higher `power` gives squarer corners. */
const superellipse =
  (cx: number, cy: number, rx: number, ry: number, power: number): Shape =>
  (u, v) =>
    Math.abs((u - cx) / rx) ** power + Math.abs((v - cy) / ry) ** power <= 1;

function regularPolygon(sides: number, size: number, cy: number, spinDegrees: number): Shape {
  const spin = (spinDegrees * Math.PI) / 180;
  const apothem = size * Math.cos(Math.PI / sides);
  return polar(cy, (theta) => {
    const sector = (2 * Math.PI) / sides;
    const local = ((((theta - spin) % sector) + sector) % sector) - sector / 2;
    return apothem / Math.cos(local);
  });
}

// ------------------------------------------------------------------ Grok Bots

const GROK_SIZE = 14;
const GROK_PALETTE = {
  b: '#3F86F0',
  h: '#78ABF7',
  o: '#2160C4',
  e: '#1E2433',
  g: COLORS.danger,
} as const;

/** A slanted pill eye leaning right. */
const GROK_EYE = ['.e', 'ee', 'e.'] as const;

interface GrokShape {
  readonly name: string;
  readonly shape: Shape;
  /** Where the pair of eyes sits (normalized). */
  readonly eyes: readonly [number, number];
}

/** Lower body: every shape rests on the bottom of the grid (v ≈ 0.95). */
const GROK_SHAPES: readonly GrokShape[] = [
  { name: 'circle', shape: circle(0, 0.12, 0.84), eyes: [0.22, -0.05] },
  {
    name: 'cloud',
    shape: union(
      circle(-0.42, 0.32, 0.55),
      circle(0.45, 0.3, 0.52),
      circle(0, 0, 0.6),
      circle(0.05, 0.42, 0.52),
    ),
    eyes: [0.25, 0.05],
  },
  {
    name: 'tile',
    shape: rotate(superellipse(0, 0.15, 0.68, 0.68, 4), 22),
    eyes: [0.2, 0.05],
  },
  {
    name: 'sparkle',
    shape: union(
      superellipse(0, 0.1, 0.95, 0.42, 1.6),
      superellipse(0, 0.1, 0.42, 0.88, 1.6),
      circle(0, 0.1, 0.45),
    ),
    eyes: [0.12, 0.02],
  },
  {
    name: 'flower',
    shape: polar(0.12, (theta) => 0.68 + 0.18 * Math.cos(5 * theta + 0.6)),
    eyes: [0.18, 0.02],
  },
  {
    name: 'heart',
    shape: (u, v) => {
      const x = u / 0.95;
      const y = -(v - 0.2) / 0.95;
      return (x * x + y * y - 0.55) ** 3 - x * x * y ** 3 <= 0;
    },
    eyes: [0.22, 0.0],
  },
  { name: 'pill', shape: superellipse(0, 0.32, 0.95, 0.58, 2.6), eyes: [0.35, 0.2] },
  { name: 'hexagon', shape: regularPolygon(6, 0.88, 0.12, 10), eyes: [0.18, 0.02] },
];

function grokFrame(spec: GrokShape, t: FrameTransform): string[] {
  const raster = new Raster(GROK_SIZE);
  raster.fill(spec.shape, 'b', t);
  raster.outline(new Set(['b']), 'o');
  // Flat look: one soft highlight and two slanted eyes.
  const [hx, hy] = raster.toCell(-0.35, -0.3, t);
  if (raster.get(hx, hy) === 'b') raster.set(hx, hy, 'h');
  const [ex, ey] = spec.eyes;
  const [x, y] = raster.toCell(ex, ey, t);
  raster.stamp(x - 3, y - 2, GROK_EYE);
  raster.stamp(x + 1, y - 2, GROK_EYE);
  // The magenta blush every enemy wears: danger reads at a glance.
  if (raster.get(x - 4, y + 1) === 'b') raster.set(x - 4, y + 1, 'g');
  else raster.set(x - 3, y + 1, 'g');
  return settle(raster.rows());
}

/** Moves a frame down until its lowest painted row touches the bottom edge, so walkers stand. */
function settle(rows: string[]): string[] {
  const empty = TRANSPARENT.repeat(rows[0]?.length ?? 0);
  let gap = 0;
  while (gap < rows.length && rows[rows.length - 1 - gap] === empty) gap++;
  return [...Array.from({ length: gap }, () => empty), ...rows.slice(0, rows.length - gap)];
}

/** Two frames: standing, then squashed (a little hop while walking). */
const GROK_FRAMES: readonly FrameTransform[] = [
  { sx: 1, sy: 1, bob: 0 },
  { sx: 1.1, sy: 0.88, bob: 0 },
];

function grokSprite(spec: GrokShape): PixelSprite {
  return { palette: GROK_PALETTE, frames: GROK_FRAMES.map((t) => grokFrame(spec, t)) };
}

// ------------------------------------------------------------------ Dots (plush characters)

const DOTS_SIZE = 15;

interface Plush {
  readonly name: string;
  readonly colors: {
    readonly b: string;
    readonly h: string;
    readonly s: string;
    readonly o: string;
  };
  readonly body: Shape;
  /** Skips edge tufts for shapes whose silhouette must stay crisp. */
  readonly smooth?: boolean;
  /** Accessory drawn over the body (beret, glasses...), as filled shapes and stamps. */
  readonly decorate: (raster: Raster, t: FrameTransform) => void;
}

const PLUSH_COMMON = { k: '#191919', w: '#FFFFFF', g: COLORS.danger } as const;

/** Small upright oval eye. */
const BEAD_EYE = ['k', 'k'] as const;

const PLUSHES: readonly Plush[] = [
  {
    name: 'beret',
    colors: { b: '#2F6EF6', h: '#6A98FF', s: '#1E4DBF', o: '#142F7A' },
    body: union(
      circle(-0.45, 0.42, 0.48),
      circle(0.45, 0.42, 0.48),
      circle(-0.2, 0.05, 0.55),
      circle(0.3, 0.1, 0.5),
      circle(0, 0.5, 0.45),
    ),
    decorate: (raster, t) => {
      raster.fill(
        union(rotate(ellipse(-0.15, -0.45, 0.68, 0.24), -10), circle(-0.12, -0.74, 0.12)),
        INK,
        t,
      );
      const [x, y] = raster.toCell(0.05, 0.3, t);
      raster.stamp(x - 2, y, BEAD_EYE);
      raster.stamp(x + 2, y, BEAD_EYE);
      raster.set(x - 4, y + 2, DANGER);
    },
  },
  {
    name: 'frog',
    colors: { b: '#78D12A', h: '#A6EC5C', s: '#4FA015', o: '#2C5E0A' },
    body: union(ellipse(0, 0.42, 0.82, 0.55), circle(-0.42, -0.2, 0.3), circle(0.42, -0.2, 0.3)),
    decorate: (raster, t) => {
      for (const side of [-1, 1]) {
        raster.fill(circle(side * 0.42, -0.2, 0.2), 'w', t);
        const [x, y] = raster.toCell(side * 0.42 + 0.04, -0.2, t);
        raster.stamp(x - 1, y - 1, ['kk', 'kk']);
      }
      const [mx, my] = raster.toCell(0, 0.45, t);
      raster.stamp(mx - 2, my, ['k...k', '.kkk.']);
      raster.set(mx - 4, my - 1, DANGER);
    },
  },
  {
    name: 'glasses',
    colors: { b: '#FFC21A', h: '#FFE07A', s: '#E09A00', o: '#8A5A00' },
    // A gumdrop: a wide rounded base under a softer dome.
    body: union(superellipse(0, 0.3, 0.88, 0.6, 2.8), ellipse(0, -0.2, 0.7, 0.55)),
    smooth: true,
    decorate: (raster, t) => {
      for (const side of [-1, 1]) {
        const [x, y] = raster.toCell(side * 0.3, 0.3, t);
        raster.stamp(x - 2, y - 2, ['.kkk.', 'k...k', 'kk.kk', 'k...k', '.kkk.']);
      }
      const [bx, by] = raster.toCell(0, 0.3, t);
      raster.set(bx, by - 1, INK);
      const [cx, cy] = raster.toCell(0, 0.62, t);
      raster.set(cx - 5, cy, DANGER);
    },
  },
  {
    name: 'heart',
    colors: { b: COLORS.danger, h: '#FF8ADF', s: '#C21E93', o: '#6E0A50' },
    // Two round lobes over a soft point, so it never reads as ears.
    body: union(
      circle(-0.44, -0.22, 0.5),
      circle(0.44, -0.22, 0.5),
      (u, v) => v >= -0.25 && Math.abs(u) <= (0.92 * (0.95 - v)) / 1.2,
    ),
    smooth: true,
    decorate: (raster, t) => {
      for (const side of [-1, 1]) {
        const [x, y] = raster.toCell(side * 0.38, -0.12, t);
        raster.stamp(x - 1, y - 1, ['kkk', 'kkw', 'kkk']);
      }
      const [bx, by] = raster.toCell(0, -0.2, t);
      raster.stamp(bx - 1, by, ['kk']);
    },
  },
];

/** Fur: edge tufts and speckles, re-rolled per frame so the plush seems to breathe. */
function furry(
  raster: Raster,
  body: string,
  light: string,
  dark: string,
  seed: number,
  tufted: boolean,
): void {
  const random = mulberry32(seed);
  const tufts: Array<[number, number]> = [];
  raster.forEach((x, y, char) => {
    if (char !== TRANSPARENT) return;
    const touches = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ].some(([dx = 0, dy = 0]) => raster.get(x + dx, y + dy) === body);
    const neighbors = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ].filter(([dx = 0, dy = 0]) => raster.get(x + dx, y + dy) === body).length;
    // Tufts round the silhouette off instead of growing spikes.
    const chance = neighbors >= 2 ? 0.6 : 0.08;
    if (tufted && touches && y < raster.size - 1 && random() < chance) tufts.push([x, y]);
  });
  for (const [x, y] of tufts) raster.set(x, y, body);
  raster.forEach((x, y, char) => {
    if (char !== body) return;
    const roll = random();
    if (roll < 0.1) raster.set(x, y, x + y < raster.size ? light : dark);
  });
}

/** Three frames: idle, idle with a 1-cell bob, and a stretched dive. */
const DOTS_FRAMES: readonly FrameTransform[] = [
  { sx: 1, sy: 1, bob: 0 },
  { sx: 1, sy: 1, bob: 1 },
  { sx: 0.88, sy: 1.08, bob: 0 },
];

function plushSprite(plush: Plush): PixelSprite {
  const frames = DOTS_FRAMES.map((t, index) => {
    const raster = new Raster(DOTS_SIZE);
    raster.fill(plush.body, 'b', t);
    furry(raster, 'b', 'h', 's', hashSeed(`${plush.name}-${index}`), !plush.smooth);
    raster.shade('b', 'h', 's');
    raster.outline(new Set(['b', 'h', 's']), 'o');
    plush.decorate(raster, t);
    return raster.rows();
  });
  return { palette: { ...plush.colors, ...PLUSH_COMMON }, frames };
}

export const GROK_BOT_KEYS = GROK_SHAPES.map((spec) => `grokBot-${spec.name}`);
export const DOTS_KEYS = PLUSHES.map((plush) => `dots-${plush.name}`);

/** Texture key -> sprite, for every minion variant. */
export const MINION_SPRITES: Readonly<Record<string, PixelSprite>> = Object.fromEntries([
  ...GROK_SHAPES.map((spec) => [`grokBot-${spec.name}`, grokSprite(spec)] as const),
  ...PLUSHES.map((plush) => [`dots-${plush.name}`, plushSprite(plush)] as const),
]);
