import type Phaser from 'phaser';
import { TILE } from '../config/display';
import { COLORS, ZONE_PALETTES } from '../config/palette';
import { bakeSprite, type PixelSprite } from './pixelArt';

/** Minimal code-drawn art used by the first playable build. */
export const TILE_INDEX = { sandbox: 0, library: 1, margin: 2, bridge: 3, erased: 4 } as const;

const GARABATO: PixelSprite = {
  palette: { k: COLORS.cloudLight, m: COLORS.danger },
  frames: [
    [
      '..kkkkkk..',
      '.k.k..k.k.',
      'kk.kkk.kkk',
      'k.m.kk.m.k',
      'kkk.kk.kk.',
      '.k.kkkk.k.',
      '..k....k..',
      '.k......k.',
    ],
    [
      '..kkkkkk..',
      '.k.k..k.k.',
      'kk.kkk.kkk',
      'k.m.kk.m.k',
      'kkk.kk.kk.',
      '.k.kkkk.k.',
      '...k..k...',
      '..k....k..',
    ],
  ],
};

const TODO_BUG: PixelSprite = {
  palette: { y: COLORS.oat, s: COLORS.cloudMedium, m: COLORS.danger },
  frames: [
    ['s......s', '.s....s.', '.yyyyyy.', 'yymyymyy', 'yyyyyyyy', '.yyyyyy.', '..y..y..'],
    ['........', 's......s', '.yyyyyy.', 'yymyymyy', 'yyyyyyyy', '.yyyyyy.', '.y....y.'],
  ],
};

const NOTE: PixelSprite = {
  palette: { p: COLORS.ivory, l: COLORS.cloudDark, g: COLORS.clawdLight },
  frames: [
    ['pppp..', 'pllpp.', 'pppppp', 'pllllp', 'pppppp', 'pllllp', 'pppppp'],
    ['ppppg.', 'pllppg', 'pppppp', 'pllllp', 'pppppp', 'pllllp', 'pppppp'],
  ],
};

const COMMIT: PixelSprite = {
  palette: { f: COLORS.cloudDark, s: COLORS.ink, o: COLORS.ivory, g: COLORS.olive },
  frames: [
    [
      'ffffffffff',
      'fssssssssf',
      'fssssssssf',
      'fssssssssf',
      'fssssssssf',
      'ffffffffff',
      '....ff....',
      '....ff....',
      '..ffffff..',
    ],
    [
      'ffffffffff',
      'fooooooogf',
      'fooooogoof',
      'fogooogoof',
      'foogogooof',
      'ffffffffff',
      '....ff....',
      '....ff....',
      '..ffffff..',
    ],
  ],
};

const TILDE: PixelSprite = {
  palette: { i: COLORS.ivory, d: COLORS.cloudMedium, o: COLORS.ink },
  frames: [
    [
      '..i.i.i...',
      '.i.i.i.i..',
      '..........',
      '..iiiiii..',
      '.i......i.',
      '.i.o..o.i.',
      '.i......i.',
      '..i....i..',
      '...d..d...',
      '..d....d..',
      '..i....i..',
      '..i.d..i..',
    ],
    [
      '...i.i.i..',
      '..i.i.i.i.',
      '..........',
      '..iiiiii..',
      '.i......i.',
      '.i.o..o.i.',
      '.i......i.',
      '..i....i..',
      '...d..d...',
      '..d....d..',
      '..i....i..',
      '..i..d.i..',
    ],
  ],
};

const DESK: PixelSprite = {
  palette: { w: '#5E5D59', l: COLORS.peach, s: COLORS.sky, k: COLORS.ink, b: '#3D3D3A' },
  frames: [
    [
      '..............ll......',
      '.............llll.....',
      '..............k.......',
      '...kkkkkkk....k.......',
      '...ksssssk....k.......',
      '...ksssssk....k.......',
      '...kkkkkkk...kkk......',
      '..kkkkkkkkk...........',
      'wwwwwwwwwwwwwwwwwwwwww',
      '.b..................b.',
      '.b..................b.',
      '.b..................b.',
    ],
  ],
};

const SIGN: PixelSprite = {
  palette: { w: '#87867F', p: COLORS.oat },
  frames: [['pppppppp', 'pwwwwwwp', 'pppppppp', '...ww...', '...ww...', '...ww...']],
};

const ERASER: PixelSprite = {
  palette: { p: COLORS.fig, w: COLORS.ivory, k: COLORS.ink },
  frames: [
    ['kkkkkkkkkkkkkk', 'kppppppwwwwwwk', 'kppppppwwwwwwk', 'kppppppwwwwwwk', 'kkkkkkkkkkkkkk'],
  ],
};

function drawCanvas(
  textures: Phaser.Textures.TextureManager,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (textures.exists(key)) return;
  const canvas = textures.createCanvas(key, width, height);
  if (!canvas) throw new Error(`Could not create canvas texture "${key}"`);
  draw(canvas.getContext());
  canvas.refresh();
}

function drawTiles(ctx: CanvasRenderingContext2D): void {
  const zones = [ZONE_PALETTES.sandbox, ZONE_PALETTES.library, ZONE_PALETTES.margin];
  zones.forEach((zone, i) => {
    const x = i * TILE;
    // Near-black silhouette with a faint inner texture and a thin moss/ink lip on top.
    ctx.fillStyle = zone.solid;
    ctx.fillRect(x, 0, TILE, TILE);
    ctx.fillStyle = zone.mid;
    ctx.globalAlpha = 0.35;
    for (let p = 0; p < 5; p++) ctx.fillRect(x + ((p * 7) % 14), 4 + ((p * 5) % 11), 2, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = zone.solidEdge;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x, 0, TILE, 1);
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x + 2, 1, 4, 1);
    ctx.fillRect(x + 9, 1, 5, 1);
    ctx.globalAlpha = 1;
  });
  const bridgeX = TILE_INDEX.bridge * TILE;
  ctx.fillStyle = COLORS.clawdLight;
  ctx.fillRect(bridgeX, 0, TILE, 3);
  ctx.fillStyle = COLORS.ivory;
  ctx.fillRect(bridgeX, 3, TILE, 1);
  const erasedX = TILE_INDEX.erased * TILE;
  ctx.fillStyle = COLORS.erased;
  ctx.fillRect(erasedX, 0, TILE, TILE);
}

/** Soft radial light used for Clawd's halo, lamps and pickups (drawn with ADD blending). */
function drawHalo(ctx: CanvasRenderingContext2D, size: number): void {
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

/** Vertical light shaft: bright at the top, fading downward. */
function drawShaft(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(width * 0.35, 0);
  ctx.lineTo(width * 0.65, 0);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

/** Horizontal fog band: transparent at the edges, milky in the middle. */
function drawFog(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawPage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  core: boolean,
): void {
  ctx.fillStyle = COLORS.ivory;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = COLORS.periwinkle;
  for (let y = 14; y < height; y += 8) ctx.fillRect(4, y, width - 8, 1);
  ctx.fillStyle = COLORS.error;
  ctx.fillRect(10, 0, 1, height);
  if (core) {
    ctx.fillStyle = COLORS.cloudLight;
    ctx.beginPath();
    ctx.moveTo(width - 22, height);
    ctx.lineTo(width, height - 22);
    ctx.lineTo(width, height);
    ctx.fill();
    ctx.fillStyle = COLORS.danger;
    ctx.fillRect(width - 10, height - 10, 6, 6);
  }
}

const PAGE_WIDTH = 64;
const HALO_SIZE = 64;
const SHAFT_WIDTH = 64;
const SHAFT_HEIGHT = 200;
const FOG_WIDTH = 32;
const FOG_HEIGHT = 48;
const PAGE_HEIGHT = 80;

export function bakeBasicArt(textures: Phaser.Textures.TextureManager): void {
  bakeSprite(textures, 'garabato', GARABATO);
  bakeSprite(textures, 'todo', TODO_BUG);
  bakeSprite(textures, 'note', NOTE);
  bakeSprite(textures, 'commit', COMMIT);
  bakeSprite(textures, 'tilde', TILDE);
  bakeSprite(textures, 'desk', DESK);
  bakeSprite(textures, 'sign', SIGN);
  bakeSprite(textures, 'eraser', ERASER);
  drawCanvas(textures, 'tiles', TILE * 5, TILE, drawTiles);
  drawCanvas(textures, 'page', PAGE_WIDTH, PAGE_HEIGHT, (ctx) =>
    drawPage(ctx, PAGE_WIDTH, PAGE_HEIGHT, false),
  );
  drawCanvas(textures, 'pageOpen', PAGE_WIDTH, PAGE_HEIGHT, (ctx) =>
    drawPage(ctx, PAGE_WIDTH, PAGE_HEIGHT, true),
  );
  drawCanvas(textures, 'halo', HALO_SIZE, HALO_SIZE, (ctx) => drawHalo(ctx, HALO_SIZE));
  drawCanvas(textures, 'shaft', SHAFT_WIDTH, SHAFT_HEIGHT, (ctx) =>
    drawShaft(ctx, SHAFT_WIDTH, SHAFT_HEIGHT),
  );
  drawCanvas(textures, 'fog', FOG_WIDTH, FOG_HEIGHT, (ctx) => drawFog(ctx, FOG_WIDTH, FOG_HEIGHT));
  drawCanvas(textures, 'dot', 2, 2, (ctx) => {
    ctx.fillStyle = COLORS.ivory;
    ctx.fillRect(0, 0, 2, 2);
  });
}
