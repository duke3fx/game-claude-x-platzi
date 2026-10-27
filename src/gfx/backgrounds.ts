import type Phaser from 'phaser';
import { CELL, GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { COLORS, ZONE_PALETTES, type ZoneId } from '../config/palette';
import { hashSeed, mixColor as mix, mulberry32 } from './tiles';

export interface ParallaxLayer {
  readonly key: string;
  readonly scrollFactor: number;
}

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;

interface LayerSpec {
  readonly scrollFactor: number;
  readonly paint: (ctx: Ctx, rand: Rand) => void;
}

const W = GAME_WIDTH;
const H = GAME_HEIGHT;
/** Layer size in cells (240 x 135). Everything is drawn on the 2 px cell grid. */
const COLS = W / CELL;
const ROWS = H / CELL;
const TAU = Math.PI * 2;

const HAND_FONT = '"Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive';
const MONO_FONT = '"DejaVu Sans Mono", Menlo, Consolas, monospace';

// ---------------------------------------------------------------------------------------------
// Cell-grid drawing helpers. All x coordinates wrap around, so every layer tiles horizontally.
// ---------------------------------------------------------------------------------------------

function wrapX(x: number): number {
  return ((x % COLS) + COLS) % COLS;
}

function ink(ctx: Ctx, color: string, alpha = 1): void {
  ctx.fillStyle = color;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
}

function rect(ctx: Ctx, x: number, y: number, w = 1, h = 1): void {
  const px = wrapX(Math.floor(x)) * CELL;
  const py = Math.floor(y) * CELL;
  const pw = Math.round(w) * CELL;
  const ph = Math.round(h) * CELL;
  if (pw <= 0 || ph <= 0) return;
  ctx.fillRect(px, py, pw, ph);
  if (px + pw > W) ctx.fillRect(px - W, py, pw, ph);
}

/** DDA line in cells; `alpha(t)` (t in 0..1 along the line) lets strokes fade out. */
function line(
  ctx: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  alpha?: (t: number) => number,
): void {
  const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const base = ctx.globalAlpha;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (alpha) ctx.globalAlpha = Math.max(0, Math.min(1, alpha(t)));
    rect(ctx, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t));
  }
  ctx.globalAlpha = base;
}

function disc(ctx: Ctx, cx: number, cy: number, r: number): void {
  for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    rect(ctx, cx - half, cy + dy, half * 2 + 1, 1);
  }
}

/** Circle outline between two angles (radians, clockwise from 3 o'clock). */
function arc(ctx: Ctx, cx: number, cy: number, r: number, from: number, to: number): void {
  const steps = Math.max(8, Math.ceil(Math.abs(to - from) * r * 1.5));
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    rect(ctx, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r));
  }
}

/** Rectangle outline in cells; `cut` skips the corner cells for a rounded look. */
function frame(ctx: Ctx, x: number, y: number, w: number, h: number, cut = false): void {
  const c = cut ? 1 : 0;
  rect(ctx, x + c, y, w - 2 * c, 1);
  rect(ctx, x + c, y + h - 1, w - 2 * c, 1);
  rect(ctx, x, y + c, 1, h - 2 * c);
  rect(ctx, x + w - 1, y + c, 1, h - 2 * c);
}

function text(ctx: Ctx, value: string, x: number, y: number, font: string): void {
  ctx.font = font;
  ctx.textBaseline = 'top';
  const px = wrapX(x) * CELL;
  const width = ctx.measureText(value).width;
  ctx.fillText(value, px, y * CELL);
  if (px + width > W) ctx.fillText(value, px - W, y * CELL);
}

/** Banded vertical gradient (pixel-art friendly) through `stops` = [t, color][]. */
function gradient(ctx: Ctx, stops: readonly (readonly [number, string])[], bands = 14): void {
  for (let y = 0; y < ROWS; y++) {
    const t = Math.floor((y / (ROWS - 1)) * bands) / bands;
    let color = stops[0]?.[1] ?? '#000000';
    for (let i = 0; i < stops.length - 1; i++) {
      const [t0, c0] = stops[i] ?? [0, color];
      const [t1, c1] = stops[i + 1] ?? [1, color];
      if (t >= t0 && t <= t1) color = mix(c0, c1, t1 === t0 ? 0 : (t - t0) / (t1 - t0));
    }
    ink(ctx, color);
    rect(ctx, 0, y, COLS, 1);
  }
}

/** Soft horizontal haze that peaks in the middle of [top, bottom]. */
function fogBand(ctx: Ctx, color: string, top: number, bottom: number, peak: number): void {
  for (let y = top; y < bottom; y++) {
    const t = (y - top) / Math.max(1, bottom - top);
    ink(ctx, color, peak * Math.sin(t * Math.PI));
    rect(ctx, 0, y, COLS, 1);
  }
}

/** Haze that thickens toward the bottom of the layer. */
function groundFog(ctx: Ctx, color: string, top: number, peak: number): void {
  for (let y = top; y < ROWS; y++) {
    ink(ctx, color, peak * ((y - top) / Math.max(1, ROWS - top)));
    rect(ctx, 0, y, COLS, 1);
  }
}

/** Sum of sines with integer periods over the layer width, so it wraps seamlessly. */
function skyline(rand: Rand, terms: readonly (readonly [number, number])[]): (x: number) => number {
  const phases = terms.map(() => rand() * TAU);
  return (x) =>
    terms.reduce(
      (sum, [periods, amp], i) =>
        sum + Math.sin((x / COLS) * periods * TAU + (phases[i] ?? 0)) * amp,
      0,
    );
}

function scatter(ctx: Ctx, rand: Rand, count: number, top: number, bottom: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.3 + rand() * 0.7);
    rect(ctx, rand() * COLS, top + rand() * (bottom - top));
  }
}

/** The terminal cursor "▌": the sun of the Borrador. */
function cursorSun(ctx: Ctx, x: number, y: number, core: string, glow: string, alpha: number) {
  for (let i = 4; i >= 1; i--) {
    ink(ctx, glow, alpha * 0.07 * (5 - i));
    rect(ctx, x - i * 2, y - i * 2, 4 + i * 4, 7 + i * 4);
  }
  ink(ctx, core, alpha);
  rect(ctx, x, y, 4, 7);
}

// ---------------------------------------------------------------------------------------------
// El Arenero: grey placeholder boxes, hand-written labels, dev grid, olive flora, cactus fog.
// ---------------------------------------------------------------------------------------------

const SANDBOX = ZONE_PALETTES.sandbox;

const SANDBOX_LABELS = [
  'caja',
  'árbol?',
  'TODO: fondo',
  'montaña (temporal)',
  'placeholder',
  'casa',
  'arte final aquí',
  'no sé',
];

interface BoxColors {
  readonly fill: string;
  readonly edge: string;
  readonly mark: string;
  readonly label: string;
}

function placeholderBox(
  ctx: Ctx,
  rand: Rand,
  x: number,
  top: number,
  w: number,
  h: number,
  colors: BoxColors,
  labelChance: number,
): void {
  ink(ctx, colors.fill);
  rect(ctx, x, top, w, h);
  ink(ctx, colors.edge);
  frame(ctx, x, top, w, h);
  if (rand() < 0.55) {
    // The classic missing-image cross.
    ink(ctx, colors.mark);
    line(ctx, x + 1, top + 1, x + w - 2, top + h - 2);
    line(ctx, x + w - 2, top + 1, x + 1, top + h - 2);
  }
  if (rand() < labelChance) {
    const label = SANDBOX_LABELS[Math.floor(rand() * SANDBOX_LABELS.length)] ?? 'caja';
    ink(ctx, colors.label);
    text(ctx, label, x + 1, top - 5, `italic 7px ${HAND_FONT}`);
  }
}

function sandboxSky(ctx: Ctx, rand: Rand): void {
  gradient(ctx, [
    [0, mix(SANDBOX.background, COLORS.nearBlack, 0.5)],
    [0.55, SANDBOX.background],
    [0.8, mix(SANDBOX.background, SANDBOX.fog, 0.16)],
    [1, mix(SANDBOX.background, SANDBOX.fog, 0.08)],
  ]);
  // The dev grid nobody turned off.
  ink(ctx, COLORS.ivory, 0.04);
  for (let x = 0; x < COLS; x += 16) rect(ctx, x, 0, 1, ROWS);
  for (let y = 4; y < ROWS; y += 16) rect(ctx, 0, y, COLS, 1);
  ink(ctx, COLORS.ivory, 0.1);
  for (let x = 0; x < COLS; x += 16) for (let y = 4; y < ROWS; y += 16) rect(ctx, x - 1, y, 3, 1);
  ink(ctx, COLORS.ivory);
  scatter(ctx, rand, 50, 0, 70, 0.25);
  cursorSun(ctx, 172, 20, COLORS.cloudLight, SANDBOX.fog, 0.6);
  fogBand(ctx, SANDBOX.fog, 70, 118, 0.12);
}

function sandboxFar(ctx: Ctx, rand: Rand): void {
  const base = 100;
  const colors: BoxColors = {
    fill: SANDBOX.far,
    edge: mix(SANDBOX.far, SANDBOX.fog, 0.18),
    mark: mix(SANDBOX.far, SANDBOX.fog, 0.08),
    label: mix(SANDBOX.far, COLORS.ivory, 0.3),
  };
  for (let x = 0; x < COLS; ) {
    const w = 8 + Math.floor(rand() * 20);
    const h = 8 + Math.floor(rand() * 34);
    placeholderBox(ctx, rand, x, base - h, w, h + 2, colors, 0.3);
    x += w + Math.floor(rand() * 8) - 2;
  }
  ink(ctx, colors.fill);
  rect(ctx, 0, base, COLS, ROWS - base);
  fogBand(ctx, SANDBOX.fog, 60, 112, 0.08);
  groundFog(ctx, SANDBOX.fog, 96, 0.1);
}

function sandboxMid(ctx: Ctx, rand: Rand): void {
  const base = 114;
  const colors: BoxColors = {
    fill: SANDBOX.mid,
    edge: mix(SANDBOX.mid, SANDBOX.solidEdge, 0.3),
    mark: mix(SANDBOX.mid, SANDBOX.solidEdge, 0.12),
    label: mix(SANDBOX.mid, SANDBOX.solidEdge, 0.65),
  };
  for (let x = 4; x < COLS; ) {
    if (rand() < 0.45) {
      // A placeholder tree: a stick with a box on top.
      const trunk = 10 + Math.floor(rand() * 16);
      const crown = 9 + Math.floor(rand() * 8);
      ink(ctx, colors.edge);
      rect(ctx, x + Math.floor(crown / 2) - 1, base - trunk, 2, trunk);
      placeholderBox(ctx, rand, x, base - trunk - crown, crown, crown, colors, 0.5);
      ink(ctx, SANDBOX.accent, 0.5);
      for (let i = 0; i < crown; i++) if (rand() < 0.5) rect(ctx, x + i, base - trunk - crown);
      x += crown + 6 + Math.floor(rand() * 10);
    } else {
      const w = 10 + Math.floor(rand() * 16);
      const h = 8 + Math.floor(rand() * 20);
      placeholderBox(ctx, rand, x, base - h, w, h + 2, colors, 0.5);
      x += w + 4 + Math.floor(rand() * 12);
    }
  }
  ink(ctx, colors.fill);
  rect(ctx, 0, base, COLS, ROWS - base);
  ink(ctx, colors.edge);
  rect(ctx, 0, base, COLS, 1);
  groundFog(ctx, SANDBOX.fog, 110, 0.06);
}

function sandboxNear(ctx: Ctx, rand: Rand): void {
  const ground = skyline(rand, [
    [2, 2],
    [5, 1.2],
  ]);
  const fill = mix(SANDBOX.mid, SANDBOX.solid, 0.75);
  const top = (x: number) => Math.round(124 + ground(x));
  ink(ctx, fill);
  for (let x = 0; x < COLS; x++) rect(ctx, x, top(x), 1, ROWS - top(x));
  // Olive flora: grass blades and a few tall reeds.
  for (let x = 0; x < COLS; x++) {
    if (rand() > 0.55) continue;
    const tall = rand() < 0.08;
    const h = tall ? 10 + Math.floor(rand() * 10) : 1 + Math.floor(rand() * 5);
    const tip = x + (rand() < 0.5 ? -1 : 1) * (tall ? 2 : 1);
    ink(ctx, fill);
    line(ctx, x, top(x), tip, top(x) - h);
    ink(ctx, SANDBOX.accent, tall ? 0.45 : 0.3);
    rect(ctx, tip, top(x) - h);
  }
  // A leafy bush now and then.
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(rand() * COLS);
    ink(ctx, fill);
    disc(ctx, x, top(x) - 3, 4 + rand() * 2);
    ink(ctx, SANDBOX.accent, 0.35);
    arc(ctx, x, top(x) - 3, 5, Math.PI * 1.1, Math.PI * 1.6);
  }
}

// ---------------------------------------------------------------------------------------------
// La Biblioteca Nocturna: night blue, bookshelves, lamp light shafts, 37 tabs, clock at 02:14.
// ---------------------------------------------------------------------------------------------

const LIBRARY = ZONE_PALETTES.library;

interface ShelfColors {
  readonly frame: string;
  readonly plank: string;
  readonly books: readonly string[];
  readonly accent: string;
}

/** Shelf colors around `base`; `contrast` scales how far books stray from it. */
function shelfColors(base: string, light: string, contrast: number): ShelfColors {
  return {
    frame: base,
    plank: mix(base, light, 0.25 * contrast),
    books: [0.06, 0.12, 0.18, 0.1].map((t) => mix(base, light, t * contrast)),
    accent: mix(base, COLORS.iris, 0.5 * contrast),
  };
}

function bookshelf(ctx: Ctx, rand: Rand, x: number, top: number, w: number, c: ShelfColors) {
  ink(ctx, c.frame);
  rect(ctx, x, top, w, ROWS - top);
  for (let shelf = top + 3; shelf < ROWS; shelf += 12) {
    ink(ctx, c.plank);
    rect(ctx, x, shelf + 9, w, 1);
    for (let bx = x + 1; bx < x + w - 1; ) {
      const bw = 1 + Math.floor(rand() * 2);
      const bh = 5 + Math.floor(rand() * 4);
      const book = c.books[Math.floor(rand() * c.books.length)] ?? c.frame;
      ink(ctx, rand() < 0.06 ? c.accent : book);
      if (rand() < 0.08 && bx + 3 < x + w - 1) {
        // A leaning book.
        line(ctx, bx, shelf + 8, bx + 2, shelf + 9 - bh);
        bx += 3;
        continue;
      }
      rect(ctx, bx, shelf + 9 - bh, bw, bh);
      bx += bw + (rand() < 0.12 ? 1 : 0);
    }
  }
}

function clockAt0214(ctx: Ctx, cx: number, cy: number, r: number, base: string): void {
  ink(ctx, mix(base, LIBRARY.fog, 0.15));
  disc(ctx, cx, cy, r + 2);
  ink(ctx, mix(base, LIBRARY.fog, 0.3));
  disc(ctx, cx, cy, r);
  ink(ctx, mix(base, LIBRARY.fog, 0.5));
  arc(ctx, cx, cy, r, 0, TAU);
  ink(ctx, LIBRARY.fog, 0.8);
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * TAU;
    for (let i = 0; i < (h % 3 === 0 ? 3 : 1); i++) {
      rect(
        ctx,
        Math.round(cx + Math.sin(a) * (r - 2 - i)),
        Math.round(cy - Math.cos(a) * (r - 2 - i)),
      );
    }
  }
  // Stopped at 02:14.
  const hour = ((2 + 14 / 60) / 12) * TAU;
  const minute = (14 / 60) * TAU;
  ink(ctx, COLORS.ivory, 0.9);
  line(ctx, cx, cy, cx + Math.sin(hour) * r * 0.5, cy - Math.cos(hour) * r * 0.5);
  line(ctx, cx, cy, cx + Math.sin(minute) * r * 0.8, cy - Math.cos(minute) * r * 0.8);
  rect(ctx, cx, cy);
}

function librarySky(ctx: Ctx, rand: Rand): void {
  gradient(ctx, [
    [0, mix(LIBRARY.background, COLORS.nearBlack, 0.55)],
    [0.6, LIBRARY.background],
    [1, mix(LIBRARY.background, LIBRARY.fog, 0.12)],
  ]);
  ink(ctx, COLORS.periwinkle);
  scatter(ctx, rand, 70, 0, 60, 0.35);
  // Tall arched windows letting the night in.
  for (const wx of [92, 196]) {
    ink(ctx, mix(LIBRARY.background, COLORS.nearBlack, 0.25));
    rect(ctx, wx, 30, 22, ROWS - 30);
    disc(ctx, wx + 11, 30, 11);
    ink(ctx, mix(LIBRARY.background, COLORS.periwinkle, 0.12));
    rect(ctx, wx + 2, 31, 18, ROWS - 31);
    disc(ctx, wx + 11, 31, 9);
    ink(ctx, mix(LIBRARY.background, COLORS.nearBlack, 0.3));
    rect(ctx, wx + 10, 22, 2, ROWS - 22);
    for (let y = 44; y < ROWS; y += 18) rect(ctx, wx + 2, y, 18, 1);
  }
  cursorSun(ctx, 72, 16, LIBRARY.fog, COLORS.periwinkle, 0.5);
  fogBand(ctx, LIBRARY.fog, 80, ROWS, 0.08);
}

function libraryFar(ctx: Ctx, rand: Rand): void {
  const colors = shelfColors(LIBRARY.far, LIBRARY.fog, 0.4);
  for (let x = 0; x < COLS; ) {
    if (x > 130 && x < 168) {
      x = 168;
      continue;
    }
    const w = 12 + Math.floor(rand() * 14);
    bookshelf(ctx, rand, x, 44 + Math.floor(rand() * 30), w, colors);
    x += w + 8 + Math.floor(rand() * 14);
  }
  // The clock tower, stopped at the hour of the last session.
  ink(ctx, LIBRARY.far);
  rect(ctx, 138, 30, 26, ROWS - 30);
  clockAt0214(ctx, 151, 44, 11, LIBRARY.far);
  fogBand(ctx, LIBRARY.fog, 90, ROWS, 0.1);
}

function hangingLamp(ctx: Ctx, x: number, drop: number): void {
  // Light shaft: a soft cone of peach, wider and fainter as it falls.
  for (let y = drop + 3; y < ROWS; y++) {
    const spread = 2 + (y - drop) * 0.32;
    const fade = 1 - (y - drop) / (ROWS - drop);
    ink(ctx, LIBRARY.accent, 0.05 + 0.08 * fade);
    rect(ctx, x - spread, y, spread * 2 + 2, 1);
    ink(ctx, LIBRARY.accent, 0.05 * fade);
    rect(ctx, x - spread * 0.45, y, spread * 0.9 + 2, 1);
  }
  ink(ctx, mix(LIBRARY.mid, LIBRARY.solidEdge, 0.3));
  for (let y = 0; y < drop; y += 2) rect(ctx, x, y, 2, 1);
  ink(ctx, LIBRARY.mid);
  rect(ctx, x - 1, drop, 4, 1);
  rect(ctx, x - 2, drop + 1, 6, 1);
  rect(ctx, x - 3, drop + 2, 8, 1);
  ink(ctx, LIBRARY.accent);
  rect(ctx, x - 2, drop + 3, 6, 1);
  ink(ctx, COLORS.ivory);
  rect(ctx, x, drop + 3, 2, 1);
}

/** A sagging wire with exactly 37 browser tabs pinned to it. */
function thirtySevenTabs(ctx: Ctx, rand: Rand, top: number): void {
  const sag = (x: number) => top + Math.round(Math.abs(Math.sin((x / COLS) * TAU)) * 6);
  ink(ctx, mix(LIBRARY.mid, LIBRARY.solidEdge, 0.3));
  for (let x = 0; x < COLS; x++) rect(ctx, x, sag(x));
  const count = 37;
  for (let i = 0; i < count; i++) {
    const x = Math.round((i * COLS) / count);
    const y = sag(x + 2) + 1;
    const active = i === count - 1;
    ink(
      ctx,
      active ? mix(LIBRARY.mid, LIBRARY.solidEdge, 0.5) : mix(LIBRARY.mid, LIBRARY.far, 0.6),
    );
    rect(ctx, x + 1, y, 3, 1);
    rect(ctx, x, y + 1, 5, 2);
    ink(ctx, active ? COLORS.periwinkle : mix(LIBRARY.mid, LIBRARY.solidEdge, 0.45));
    rect(ctx, x + 1, y + 1, rand() < 0.5 ? 2 : 1, 1);
  }
}

function libraryMid(ctx: Ctx, rand: Rand): void {
  const colors = shelfColors(LIBRARY.mid, LIBRARY.solidEdge, 1);
  for (let x = 0; x < COLS; ) {
    const w = 18 + Math.floor(rand() * 22);
    bookshelf(ctx, rand, x, 48 + Math.floor(rand() * 34), w, colors);
    x += w + 10 + Math.floor(rand() * 26);
  }
  for (const [x, drop] of [
    [36, 30],
    [118, 22],
    [196, 36],
  ] as const) {
    hangingLamp(ctx, x, drop);
  }
  thirtySevenTabs(ctx, rand, 8);
}

function libraryNear(ctx: Ctx, rand: Rand): void {
  const dark = mix(LIBRARY.mid, LIBRARY.solid, 0.7);
  const spine = mix(LIBRARY.mid, LIBRARY.solid, 0.25);
  // Piles of books on the floor.
  for (let x = 0; x < COLS; ) {
    let y = ROWS;
    const height = 2 + Math.floor(rand() * 6);
    let width = 14 + Math.floor(rand() * 10);
    for (let i = 0; i < height; i++) {
      const h = 2 + Math.floor(rand() * 2);
      y -= h;
      const offset = Math.floor(rand() * 4) - 2;
      ink(ctx, dark);
      rect(ctx, x + offset, y, width, h);
      ink(ctx, spine);
      rect(ctx, x + offset, y, width, 1);
      width = Math.max(8, width - Math.floor(rand() * 3));
    }
    x += width + 8 + Math.floor(rand() * 30);
  }
  // A rolling ladder leaning on an unseen shelf.
  ink(ctx, dark);
  line(ctx, 150, ROWS, 168, 40);
  line(ctx, 158, ROWS, 176, 40);
  for (let t = 0.08; t < 1; t += 0.11) rect(ctx, 150 + 18 * t, ROWS - (ROWS - 40) * t, 9, 1);
  // A foreground shelf edge framing the view.
  rect(ctx, 220, 0, 12, ROWS);
  ink(ctx, spine);
  rect(ctx, 220, 0, 1, ROWS);
  for (let y = 10; y < ROWS; y += 14) rect(ctx, 220, y, 12, 1);
}

// ---------------------------------------------------------------------------------------------
// El Margen: ivory paper, ink lines fading mid-stroke, eraser crumbs, the frozen dialog box.
// ---------------------------------------------------------------------------------------------

const MARGIN = ZONE_PALETTES.margin;
const PENDING_QUESTION = '¿Quieres continuar?  1. Sí  2. No (esc)';

/** Draws `path` as pencil strokes that start firm and fade out mid-stroke, with gaps. */
function fadingStrokes(
  ctx: Ctx,
  rand: Rand,
  path: (x: number) => number,
  color: string,
  maxAlpha: number,
): void {
  ctx.fillStyle = color;
  let x = Math.floor(rand() * 10);
  while (x < COLS) {
    const length = 18 + Math.floor(rand() * 34);
    for (let i = 0; i < length && x + i < COLS + 4; i++) {
      const t = i / length;
      ctx.globalAlpha = maxAlpha * (t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.55));
      const y0 = Math.round(path(x + i));
      const y1 = Math.round(path(x + i + 1));
      rect(ctx, x + i, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1);
    }
    x += length + 3 + Math.floor(rand() * 12);
  }
}

function crumbs(ctx: Ctx, rand: Rand, count: number, top: number, bottom: number): void {
  for (let i = 0; i < count; i++) {
    const x = rand() * COLS;
    const y = top + rand() * (bottom - top);
    ink(ctx, COLORS.cloudMedium, 0.8);
    rect(ctx, x, y + 1, 2, 1);
    ink(ctx, COLORS.cloudLight);
    rect(ctx, x, y, 2, 1);
  }
}

function eraserSmudge(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ink(ctx, MARGIN.fog, 0.75);
  for (let dy = 0; dy < h; dy++) {
    const inset = Math.round(Math.abs(dy - h / 2) * 0.8);
    rect(ctx, x + inset, y + dy, w - inset * 2, 1);
  }
}

function marginSky(ctx: Ctx, rand: Rand): void {
  gradient(ctx, [
    [0, COLORS.ivory],
    [1, MARGIN.background],
  ]);
  ink(ctx, mix(MARGIN.background, COLORS.sky, 0.12));
  for (let y = 12; y < ROWS; y += 10) rect(ctx, 0, y, COLS, 1);
  ink(ctx, mix(MARGIN.background, COLORS.heather, 0.6));
  rect(ctx, 30, 0, 1, ROWS);
  rect(ctx, 32, 0, 1, ROWS);

  // The frozen constellation: the question that was never answered.
  const box = { x: 52, y: 14, w: 136, h: 18 };
  eraserSmudge(ctx, box.x - 6, box.y - 4, box.w + 12, box.h + 8);
  ink(ctx, MARGIN.fog, 0.6);
  rect(ctx, box.x + 1, box.y + 1, box.w - 2, box.h - 2);
  ink(ctx, COLORS.ink, 0.3);
  for (let i = 1; i < box.w - 1; i += 2) {
    rect(ctx, box.x + i, box.y);
    rect(ctx, box.x + i, box.y + box.h - 1);
  }
  for (let i = 1; i < box.h - 1; i += 2) {
    rect(ctx, box.x, box.y + i);
    rect(ctx, box.x + box.w - 1, box.y + i);
  }
  // Brighter "stars" at the corners.
  ink(ctx, COLORS.ink, 0.55);
  for (const [cx, cy] of [
    [box.x, box.y],
    [box.x + box.w - 1, box.y],
    [box.x, box.y + box.h - 1],
    [box.x + box.w - 1, box.y + box.h - 1],
  ] as const) {
    rect(ctx, cx - 1, cy);
    rect(ctx, cx + 1, cy);
    rect(ctx, cx, cy - 1);
    rect(ctx, cx, cy + 1);
  }
  const font = `10px ${MONO_FONT}`;
  ctx.font = font;
  const textWidth = Math.ceil(ctx.measureText(PENDING_QUESTION).width / CELL);
  const textX = box.x + Math.floor((box.w - textWidth - 6) / 2);
  ink(ctx, COLORS.ink, 0.45);
  text(ctx, PENDING_QUESTION, textX, box.y + 6, font);
  // The cursor waiting after "(esc)" is the sun of this world.
  cursorSun(ctx, textX + textWidth + 2, box.y + 5, COLORS.ink, MARGIN.fog, 0.6);

  ink(ctx, COLORS.cloudMedium);
  scatter(ctx, rand, 30, 40, 90, 0.25);
}

function marginFar(ctx: Ctx, rand: Rand): void {
  const hills = skyline(rand, [
    [2, 6],
    [5, 3],
    [11, 1],
  ]);
  const pencil = mix(MARGIN.far, MARGIN.background, 0.3);
  fadingStrokes(ctx, rand, (x) => 92 + hills(x), MARGIN.far, 1);
  // Unfinished distant buildings: some sides never got drawn.
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(rand() * COLS);
    const w = 8 + Math.floor(rand() * 12);
    const h = 10 + Math.floor(rand() * 18);
    const base = Math.round(92 + hills(x));
    ink(ctx, pencil);
    line(ctx, x, base, x, base - h);
    line(ctx, x, base - h, x + w, base - h, (t) => 1 - t);
    if (rand() < 0.5) line(ctx, x + w, base - h, x + w, base, (t) => 0.7 * (1 - t));
  }
  // Light hatching under the hills.
  ink(ctx, pencil, 0.6);
  for (let x = 0; x < COLS; x += 3) {
    if (rand() < 0.4) continue;
    const y = Math.round(94 + hills(x));
    line(ctx, x, y + 4, x + 3, y + 1);
  }
}

function marginMid(ctx: Ctx, rand: Rand): void {
  const groundY = 112;
  const ground = skyline(rand, [[3, 1.5]]);
  const pencil = mix(MARGIN.mid, COLORS.cloudDark, 0.5);
  fadingStrokes(ctx, rand, (x) => groundY + ground(x), pencil, 1);
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 48 + Math.floor(rand() * 20);
    const base = Math.round(groundY + ground(x));
    ink(ctx, pencil);
    if (i === 2) {
      // A half-drawn house.
      line(ctx, x, base, x, base - 14);
      line(ctx, x, base - 14, x + 9, base - 22);
      line(ctx, x + 9, base - 22, x + 18, base - 14, (t) => 1 - t);
      line(ctx, x + 18, base - 6, x + 18, base, (t) => 0.5 * t);
      line(ctx, x + 6, base, x + 6, base - 6);
      line(ctx, x + 6, base - 6, x + 10, base - 6, (t) => 1 - t);
      continue;
    }
    // An unfinished tree: trunk plus a canopy that stops mid-circle.
    const trunk = 10 + Math.floor(rand() * 10);
    const r = 6 + Math.floor(rand() * 4);
    line(ctx, x, base, x, base - trunk);
    line(ctx, x + 1, base, x + 1, base - trunk + 3);
    const start = Math.PI * (0.6 + rand() * 0.3);
    const sweep = Math.PI * (1.1 + rand() * 0.6);
    const steps = 24;
    for (let s = 0; s < steps; s++) {
      ctx.globalAlpha = 1 - s / steps;
      const a0 = start + (sweep * s) / steps;
      arc(ctx, x, base - trunk - r + 1, r, a0, a0 + sweep / steps);
    }
  }
  // Erased patches, as if someone changed their mind.
  for (let i = 0; i < 3; i++) {
    eraserSmudge(ctx, rand() * COLS, 92 + rand() * 18, 12 + rand() * 10, 6 + rand() * 4);
  }
  crumbs(ctx, rand, 26, groundY + 2, ROWS - 4);
}

function marginNear(ctx: Ctx, rand: Rand): void {
  const ground = skyline(rand, [
    [2, 2],
    [7, 1],
  ]);
  const inkColor = mix(MARGIN.solid, MARGIN.mid, 0.15);
  // Bold ink hatching at the bottom, every stroke trailing off.
  ink(ctx, inkColor);
  for (let x = 0; x < COLS; x += 2) {
    if (rand() < 0.3) continue;
    const top = Math.round(124 + ground(x));
    const len = 2 + Math.floor(rand() * 6);
    line(ctx, x, ROWS, x + Math.floor(len / 2), top - len, (t) => 0.9 * (1 - t * t));
  }
  ink(ctx, inkColor, 0.9);
  for (let x = 0; x < COLS; x++) rect(ctx, x, Math.round(126 + ground(x)), 1, ROWS);
  // Crumpled paper balls.
  for (let i = 0; i < 3; i++) {
    const x = 20 + i * 80 + Math.floor(rand() * 30);
    const y = Math.round(124 + ground(x)) - 4;
    const r = 4 + Math.floor(rand() * 3);
    ink(ctx, MARGIN.far);
    disc(ctx, x, y, r);
    ink(ctx, inkColor, 0.9);
    arc(ctx, x, y, r, Math.PI * 0.8, Math.PI * 2.3);
    ink(ctx, MARGIN.mid);
    line(ctx, x - 2, y - 1, x + 1, y + 1);
    line(ctx, x + 1, y - 2, x + 2, y + 2);
  }
  crumbs(ctx, rand, 18, 118, ROWS - 2);
}

// ---------------------------------------------------------------------------------------------

const ZONE_LAYERS: Readonly<Record<ZoneId, readonly LayerSpec[]>> = {
  sandbox: [
    { scrollFactor: 0.06, paint: sandboxSky },
    { scrollFactor: 0.2, paint: sandboxFar },
    { scrollFactor: 0.4, paint: sandboxMid },
    { scrollFactor: 0.6, paint: sandboxNear },
  ],
  library: [
    { scrollFactor: 0.06, paint: librarySky },
    { scrollFactor: 0.2, paint: libraryFar },
    { scrollFactor: 0.4, paint: libraryMid },
    { scrollFactor: 0.6, paint: libraryNear },
  ],
  margin: [
    { scrollFactor: 0.06, paint: marginSky },
    { scrollFactor: 0.2, paint: marginFar },
    { scrollFactor: 0.4, paint: marginMid },
    { scrollFactor: 0.6, paint: marginNear },
  ],
};

/**
 * Bakes the parallax stack of a zone, ordered far to near. Layer 0 is an opaque backdrop; the
 * rest are transparent silhouettes. Every texture is 480x270 and tiles seamlessly horizontally.
 */
export function bakeParallax(
  textures: Phaser.Textures.TextureManager,
  zone: ZoneId,
): readonly ParallaxLayer[] {
  return ZONE_LAYERS[zone].map((spec, index) => {
    const key = `bg-${zone}-${index}`;
    if (!textures.exists(key)) {
      const canvas = textures.createCanvas(key, W, H);
      if (!canvas) throw new Error(`Could not create canvas texture "${key}"`);
      const ctx = canvas.getContext();
      ctx.imageSmoothingEnabled = false;
      spec.paint(ctx, mulberry32(hashSeed(key)));
      ctx.globalAlpha = 1;
      canvas.refresh();
    }
    return { key, scrollFactor: spec.scrollFactor };
  });
}
