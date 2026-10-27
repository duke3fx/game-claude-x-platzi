import type Phaser from 'phaser';
import { CELL, TILE } from '../config/display';
import { ZONE_PALETTES, type ZoneId } from '../config/palette';

/** Tileset rows, top to bottom. */
export const ZONE_ORDER: readonly ZoneId[] = ['sandbox', 'library', 'margin'];
export const TILESET_KEY = 'tiles';

/** One column per 4-bit neighbor mask. */
export const TILESET_COLUMNS = 16;

/** Bits of the neighbor mask: a set bit means the neighbor on that side is solid. */
export const NEIGHBOR = { up: 1, right: 2, down: 4, left: 8 } as const;

/** Index of a tile inside the tileset (row-major), also registered as its frame name. */
export function tileIndex(zone: ZoneId, mask: number): number {
  return ZONE_ORDER.indexOf(zone) * TILESET_COLUMNS + (mask & 15);
}

/** Small, fast seeded PRNG returning floats in [0, 1). Never use Math.random for art. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash, handy to derive a stable seed from a texture key. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Linear blend of two '#RRGGBB' colors (t = 0 gives `a`, t = 1 gives `b`). */
export function mixColor(a: string, b: string, t: number): string {
  const ca = Number.parseInt(a.slice(1), 16);
  const cb = Number.parseInt(b.slice(1), 16);
  const channel = (shift: number) => {
    const from = (ca >> shift) & 255;
    const to = (cb >> shift) & 255;
    return Math.round(from + (to - from) * t);
  };
  const value = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${value.toString(16).padStart(6, '0')}`;
}

/** Cells per tile side (8). */
const N = TILE / CELL;
const LAST = N - 1;

/** A tile as an 8x8 grid of colors, indexed [y][x]; null is transparent. */
type Cells = (string | null)[][];

function fillCells(color: (x: number, y: number) => string): Cells {
  return Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => color(x, y)));
}

function setCell(cells: Cells, x: number, y: number, color: string | null): void {
  const row = cells[y];
  if (row && x >= 0 && x < N) row[x] = color;
}

function exposed(mask: number, bit: number): boolean {
  return (mask & bit) === 0;
}

function pick(rand: () => number, n: number): number {
  return Math.floor(rand() * n);
}

/** Cuts the outer corner cell where two exposed sides meet, so blocks read as rounded. */
function roundCorners(cells: Cells, mask: number): void {
  const { up, right, down, left } = NEIGHBOR;
  if (exposed(mask, up) && exposed(mask, left)) setCell(cells, 0, 0, null);
  if (exposed(mask, up) && exposed(mask, right)) setCell(cells, LAST, 0, null);
  if (exposed(mask, down) && exposed(mask, left)) setCell(cells, 0, LAST, null);
  if (exposed(mask, down) && exposed(mask, right)) setCell(cells, LAST, LAST, null);
}

type Side = 'up' | 'down' | 'left' | 'right';

/** Paints one side, `depth` cells in from the edge; `color(i)` runs along that side. */
function paintSide(
  cells: Cells,
  side: Side,
  depth: number,
  color: (i: number) => string | null,
): void {
  for (let i = 0; i < N; i++) {
    const c = color(i);
    if (side === 'up') setCell(cells, i, depth, c);
    else if (side === 'down') setCell(cells, i, LAST - depth, c);
    else if (side === 'left') setCell(cells, depth, i, c);
    else setCell(cells, LAST - depth, i, c);
  }
}

/*
 * The playfield is a dark Hollow-Knight-style silhouette (ZONE_PALETTES[zone].solid) with a light
 * walkable lip (solidEdge). Each zone only changes the texture inside and how the edges behave.
 */

/** El Arenero: placeholder blocks with the dev grid still visible and olive moss on top. */
function paintSandbox(mask: number, rand: () => number): Cells {
  const p = ZONE_PALETTES.sandbox;
  const grid = mixColor(p.solid, p.mid, 0.45);
  const cells = fillCells((x, y) => ((x === 0 || y === 0) && (x + y) % 2 === 0 ? grid : p.solid));
  for (let i = 0; i < 3; i++) {
    setCell(cells, 1 + pick(rand, 6), 2 + pick(rand, 5), mixColor(p.solid, p.mid, 0.3));
  }

  if (exposed(mask, NEIGHBOR.down))
    paintSide(cells, 'down', 0, () => mixColor(p.solid, p.mid, 0.25));
  if (exposed(mask, NEIGHBOR.left))
    paintSide(cells, 'left', 0, () => mixColor(p.solid, p.mid, 0.6));
  if (exposed(mask, NEIGHBOR.right))
    paintSide(cells, 'right', 0, () => mixColor(p.solid, p.mid, 0.35));
  if (exposed(mask, NEIGHBOR.up)) {
    paintSide(cells, 'up', 0, () => p.solidEdge);
    paintSide(cells, 'up', 1, () => mixColor(p.solid, p.solidEdge, 0.3));
    // Olive moss creeping over the lip, sometimes dripping lower.
    for (let x = 0; x < N; x++) {
      if (rand() < 0.4) setCell(cells, x, 1, p.accent);
      if (rand() < 0.2) setCell(cells, x, 2, mixColor(p.solid, p.accent, 0.55));
    }
  }
  roundCorners(cells, mask);
  return cells;
}

/** La Biblioteca Nocturna: night-blue masonry with a moonlit rim on walkable tops. */
function paintLibrary(mask: number, rand: () => number): Cells {
  const p = ZONE_PALETTES.library;
  const brick = mixColor(p.solid, p.mid, 0.3);
  const cells = fillCells((x, y) => {
    if (y === 3 || y === 7) return p.solid;
    return x === (y < 4 ? 2 : 6) ? p.solid : brick;
  });
  for (let i = 0; i < 3; i++) {
    const y = pick(rand, 2) === 0 ? 1 + pick(rand, 2) : 4 + pick(rand, 3);
    setCell(cells, pick(rand, N), y, mixColor(p.solid, p.mid, 0.5));
  }

  if (exposed(mask, NEIGHBOR.down)) paintSide(cells, 'down', 0, () => p.solid);
  if (exposed(mask, NEIGHBOR.left))
    paintSide(cells, 'left', 0, () => mixColor(p.solid, p.mid, 0.75));
  if (exposed(mask, NEIGHBOR.right))
    paintSide(cells, 'right', 0, () => mixColor(p.solid, p.mid, 0.45));
  if (exposed(mask, NEIGHBOR.up)) {
    paintSide(cells, 'up', 0, () => p.solidEdge);
    paintSide(cells, 'up', 1, () =>
      rand() < 0.3 ? mixColor(p.solid, p.solidEdge, 0.6) : mixColor(p.solid, p.solidEdge, 0.35),
    );
    paintSide(cells, 'up', 2, () => mixColor(p.solid, p.mid, 0.6));
  }
  roundCorners(cells, mask);
  return cells;
}

/** El Margen: an ink mass with pencil hatching; its outline fades out mid-stroke. */
function paintMargin(mask: number, rand: () => number): Cells {
  const p = ZONE_PALETTES.margin;
  const hatch = mixColor(p.solid, p.mid, 0.2);
  const cells = fillCells((x, y) => ((x + y) % 4 === 0 ? hatch : p.solid));
  // Eraser crumbs caught in the ink.
  for (let i = 0; i < 2; i++) {
    setCell(cells, 1 + pick(rand, 6), 3 + pick(rand, 4), mixColor(p.solid, p.far, 0.35));
  }

  /** Ink that holds for `start` cells, thins out, then stops (transparent). */
  const fading = (start: number) => (i: number) => {
    if (i < start) return mixColor(p.solid, p.background, 0.35);
    if (i === start) return mixColor(p.solid, p.background, 0.65);
    return null;
  };
  if (exposed(mask, NEIGHBOR.down)) paintSide(cells, 'down', 0, fading(2 + pick(rand, 5)));
  if (exposed(mask, NEIGHBOR.left)) paintSide(cells, 'left', 0, fading(3 + pick(rand, 4)));
  if (exposed(mask, NEIGHBOR.right)) paintSide(cells, 'right', 0, fading(2 + pick(rand, 5)));
  if (exposed(mask, NEIGHBOR.up)) {
    // On ivory paper an ivory top row would vanish, so the ink stays on top and the light
    // edge sits just under it.
    paintSide(cells, 'up', 0, () => p.solid);
    paintSide(cells, 'up', 1, () => mixColor(p.solid, p.solidEdge, 0.8));
    paintSide(cells, 'up', 2, () => mixColor(p.solid, p.solidEdge, 0.2));
  }
  roundCorners(cells, mask);
  return cells;
}

const PAINTERS: Readonly<Record<ZoneId, (mask: number, rand: () => number) => Cells>> = {
  sandbox: paintSandbox,
  library: paintLibrary,
  margin: paintMargin,
};

/**
 * Bakes the autotile sheet: 16 columns (neighbor mask 0..15) x 3 rows (ZONE_ORDER), 16 px tiles.
 * Each tile is also registered as a numbered frame (see `tileIndex`).
 */
export function bakeTileset(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(TILESET_KEY)) return;
  const canvas = textures.createCanvas(
    TILESET_KEY,
    TILE * TILESET_COLUMNS,
    TILE * ZONE_ORDER.length,
  );
  if (!canvas) throw new Error(`Could not create canvas texture "${TILESET_KEY}"`);
  const ctx = canvas.getContext();

  ZONE_ORDER.forEach((zone, row) => {
    for (let mask = 0; mask < TILESET_COLUMNS; mask++) {
      const rand = mulberry32(hashSeed(`${zone}:${mask}`));
      const cells = PAINTERS[zone](mask, rand);
      const originX = mask * TILE;
      const originY = row * TILE;
      cells.forEach((line, y) => {
        line.forEach((color, x) => {
          if (!color) return;
          ctx.fillStyle = color;
          ctx.fillRect(originX + x * CELL, originY + y * CELL, CELL, CELL);
        });
      });
      canvas.add(row * TILESET_COLUMNS + mask, 0, originX, originY, TILE, TILE);
    }
  });
  canvas.refresh();
}
