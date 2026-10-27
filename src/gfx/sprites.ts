import { COLORS, ZONE_PALETTES } from '../config/palette';
import type { PixelSprite } from './pixelArt';

const CLAWD_PALETTE = {
  '#': COLORS.clawdBody,
  s: COLORS.clawdShade,
  h: COLORS.clawdLight,
  o: COLORS.clawdEye,
} as const;

/**
 * Clawd, faithful to the official 17x10 Claude Code design (body #D77757, eyes #141414).
 * Frames: 0 idle, 1 blink, 2 walk A, 3 walk B, 4 arms up, 5 look down.
 */
export const CLAWD: PixelSprite = {
  palette: CLAWD_PALETTE,
  frames: [
    [
      '..#############..',
      '..#############..',
      '..##o#######o##..',
      '..##o#######o##..',
      '#################',
      '#################',
      '..#############..',
      '..#############..',
      '..#.#.......#.#..',
      '..#.#.......#.#..',
    ],
    [
      '..#############..',
      '..#############..',
      '..#############..',
      '..##o#######o##..',
      '#################',
      '#################',
      '..#############..',
      '..#############..',
      '..#.#.......#.#..',
      '..#.#.......#.#..',
    ],
    [
      '..#############..',
      '..#############..',
      '..##o#######o##..',
      '..##o#######o##..',
      '#################',
      '#################',
      '..#############..',
      '..#############..',
      '..#.#.......#.#..',
      '............#.#..',
    ],
    [
      '..#############..',
      '..#############..',
      '..##o#######o##..',
      '..##o#######o##..',
      '#################',
      '#################',
      '..#############..',
      '..#############..',
      '..#.#.......#.#..',
      '..#.#............',
    ],
    [
      '..#############..',
      '..#############..',
      '####o#######o####',
      '####o#######o####',
      '.###############.',
      '.###############.',
      '..#############..',
      '..#############..',
      '..#.#.......#.#..',
      '..#.#.......#.#..',
    ],
    [
      '..#############..',
      '..#############..',
      '..#############..',
      '..##o#######o##..',
      '#####o#####o#####',
      '#################',
      '..#############..',
      '..#############..',
      '..#.#.......#.#..',
      '..#.#.......#.#..',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// Grid helpers. Some sprites are generated from math or from other sprites at module load; the
// result is still a plain PixelSprite (rows of palette chars).
// ---------------------------------------------------------------------------------------------

type Frame = readonly string[];

function paint(width: number, height: number, cell: (x: number, y: number) => string): Frame {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => cell(x, y)).join(''),
  );
}

function charAt(frame: Frame, x: number, y: number): string {
  return frame[y]?.[x] ?? '.';
}

function recolor(frame: Frame, map: Readonly<Record<string, string>>): Frame {
  return frame.map((row) => [...row].map((char) => map[char] ?? char).join(''));
}

// ---------------------------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------------------------

const GARABATO_WALK0: Frame = [
  '..l..m.l....',
  '...lmlmlml..',
  '..mkekkekkl.',
  '.lkkekkekkml',
  '.mkkkkkkllll',
  'llllllllkkl.',
  '.lkkkkkkkkm.',
  '..mlmkkmlm..',
  '..l.l..l.l..',
];

/** Garabato: a crossed-out scribble that patrols El Arenero. Frames: walk0, walk1, hurt. */
export const GARABATO: PixelSprite = {
  palette: {
    l: COLORS.cloudLight,
    m: COLORS.cloudDark,
    k: COLORS.ink,
    e: COLORS.danger,
    w: COLORS.ivory,
    g: COLORS.cloudMedium,
  },
  frames: [
    GARABATO_WALK0,
    [
      '...l..l..m..',
      '...mlmlmlm..',
      '..lkekkekkm.',
      '.mkkekkekkll',
      '.lkkkkkkllll',
      'llllllllkkm.',
      '.mkkkkkkkkl.',
      '..lmlkklml..',
      '.l..l..l..l.',
    ],
    recolor(GARABATO_WALK0, { l: 'w', m: 'w', k: 'g', e: 'w' }),
  ],
};

/** TODO: a crumpled sticky-note comment with wings. Frames: flap0, flap1, dive. */
export const TODO_BUG: PixelSprite = {
  palette: {
    p: COLORS.oat,
    P: COLORS.ivoryMedium,
    c: COLORS.cloudMedium,
    d: COLORS.cloudDark,
    v: COLORS.heather,
    e: COLORS.danger,
  },
  frames: [
    [
      'vv......vv',
      '.vv....vv.',
      '..PPPPPc..',
      '..PepPec..',
      '..pPpcpp..',
      '..ppcppd..',
      '...pdpd...',
      '..........',
    ],
    [
      '..........',
      '..........',
      '.vPPPPPcv.',
      'vvPepPecvv',
      'v.pPpcpp.v',
      '..ppcppd..',
      '...pdpd...',
      '..........',
    ],
    [
      '.v......v.',
      '..v....v..',
      '..vPPPcv..',
      '..PePPeP..',
      '..pPpcpp..',
      '...ppcd...',
      '....pd....',
      '....d.....',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// NPCs
// ---------------------------------------------------------------------------------------------

/** Tilde's full outline; 'o' marks the eyes, which are never dotted. */
const TILDE_OUTLINE: Frame = [
  '....ii..i...',
  '...i..ii....',
  '............',
  '....iiii....',
  '...i....i...',
  '..i......i..',
  '..i.o..o.i..',
  '..i......i..',
  '...iiiiii...',
  '..i......i..',
  '..i......i..',
  '.i........i.',
  '.i........i.',
  'i..........i',
  'iiiiiiiiiiii',
  '..i......i..',
];

/** The right half of an unfinished sketch is only a dotted guide. */
function tildeFrame(phase: number, swapTilde: boolean): Frame {
  const rows = swapTilde
    ? [TILDE_OUTLINE[1] ?? '', TILDE_OUTLINE[0] ?? '', ...TILDE_OUTLINE.slice(2)]
    : TILDE_OUTLINE;
  return paint(12, rows.length, (x, y) => {
    const char = charAt(rows, x, y);
    if (char === 'o') return 'i';
    if (char !== 'i' || x < 6 || y < 2) return char;
    return (x + y + phase) % 2 === 0 ? 'd' : '.';
  });
}

/** Tilde: friendly guide NPC, a sketch Luz never finished. Frames: idle0, idle1. */
export const TILDE: PixelSprite = {
  palette: { i: COLORS.ivory, d: COLORS.cloudMedium },
  frames: [tildeFrame(0, false), tildeFrame(1, true)],
};

const CLAWD_SOLID = new Set(['#', 's', 'h', 'o']);

/** Turns a Clawd frame into a dotted, translucent-looking outline with the same silhouette. */
function ghostFrame(base: Frame, phase: number): Frame {
  const width = base[0]?.length ?? 0;
  const solid = (x: number, y: number) => CLAWD_SOLID.has(charAt(base, x, y));
  return paint(width, base.length, (x, y) => {
    if (!solid(x, y)) return '.';
    if (charAt(base, x, y) === 'o') return 'e';
    const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
    if (edge) return (x + y + phase) % 2 === 0 ? 'b' : 'f';
    return (x + 2 * y + phase) % 4 === 0 ? 'g' : '.';
  });
}

/** Eco·17: the ghost of an earlier Clawd session. Same 17x10 silhouette. Frames: 0, 1. */
export const ECO_17: PixelSprite = {
  palette: { b: COLORS.sky, f: '#3A5A80', g: '#24304F', e: COLORS.periwinkle },
  frames: [ghostFrame(CLAWD.frames[0] ?? [], 0), ghostFrame(CLAWD.frames[1] ?? [], 1)],
};

/** Explore: a tiny grey Clawd drawn with "⎿" strokes (left and bottom edges). Frames: 0, 1. */
export const EXPLORE: PixelSprite = {
  palette: { g: COLORS.cloudLight, f: COLORS.cloudDark, o: COLORS.ink },
  frames: [
    [
      '.gfffff..',
      '.gofffof.',
      'gffffffff',
      '.ggggggg.',
      '.g.g.g.g.',
      '.g.g.g.g.',
    ],
    [
      '.gfffff..',
      '.gofffof.',
      'gffffffff',
      '.ggggggg.',
      '.g.g.g.g.',
      '...g...g.',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// Interactables and pickups
// ---------------------------------------------------------------------------------------------

/** Commit: checkpoint terminal on a stand. Frames: off, on (ivory screen with a check). */
export const COMMIT: PixelSprite = {
  palette: {
    B: COLORS.cloudMedium,
    b: COLORS.cloudDark,
    d: '#3D3D3A',
    k: COLORS.ink,
    p: '#5E5D59',
    i: COLORS.ivory,
    g: COLORS.cloudLight,
  },
  frames: [
    [
      '.BBBBBBBBBB.',
      'Bddddddddddb',
      'Bdkkkkkkkkdb',
      'Bdkpkkkkkkdb',
      'Bdkkpkkkkkdb',
      'Bdkpkkpppkdb',
      'Bdkkkkkkkkdb',
      'Bddddddddddb',
      '.bbbbbbbbbb.',
      '.....bb.....',
      '.....db.....',
      '....bbbb....',
      '..BBBBBBBB..',
      '.bbbbbbbbbb.',
    ],
    [
      '.BBBBBBBBBB.',
      'Bggggggggggb',
      'Bgiiiiiiiigb',
      'Bgiiiiiikigb',
      'Bgiiiiikiigb',
      'Bgikiikiiigb',
      'Bgiikkiiiigb',
      'Bggggggggggb',
      '.bbbbbbbbbb.',
      '.....bb.....',
      '.....db.....',
      '....bbbb....',
      '..BBBBBBBB..',
      '.bbbbbbbbbb.',
    ],
  ],
};

/** Note: collectible scrap of paper. Frames: 0, 1 (glint sweep). */
export const NOTE: PixelSprite = {
  palette: { i: COLORS.ivoryDark, w: COLORS.ivory, l: COLORS.cloudDark, F: COLORS.cloudMedium },
  frames: [
    ['iiiiF.', 'illiFF', 'iiiiii', 'illlli', 'iiiiii', 'illiii', 'FFFFFF'],
    ['wiiiF.', 'iwliFF', 'iiwiii', 'illwli', 'iiiiwi', 'illiiw', 'FFFFFF'],
  ],
};

/** Contexto: spinner-glyph spark (· ✢ ✳ ✶ ✻ ✽), cycled as an animation. */
export const CONTEXT_SPARK: PixelSprite = {
  palette: { h: COLORS.clawdLight, w: COLORS.ivory },
  frames: [
    ['.....', '.....', '..w..', '.....', '.....'],
    ['..h..', '..h..', 'hhwhh', '..h..', '..h..'],
    ['h.h.h', '.hhh.', 'hhwhh', '.hhh.', 'h.h.h'],
    ['..w..', 'hhwhh', '.www.', 'hhwhh', '..w..'],
    ['w...w', '.hwh.', '.www.', '.hwh.', 'w...w'],
    ['.hwh.', 'hw.wh', 'w.w.w', 'hw.wh', '.hwh.'],
  ],
};

/** Luz's desk: anglepoise lamp, an open laptop with code and a few loose pages. */
export const LUZ_DESK: PixelSprite = {
  palette: {
    L: COLORS.cloudDark,
    l: COLORS.cloudMedium,
    y: COLORS.peach,
    Y: COLORS.ivory,
    c: COLORS.cloudMedium,
    C: COLORS.cloudDark,
    k: '#3D3D3A',
    s: '#35507A',
    S: COLORS.sky,
    T: COLORS.periwinkle,
    p: COLORS.oat,
    P: COLORS.cloudMedium,
    W: '#4A4880',
    w: ZONE_PALETTES.library.mid,
    q: '#7E6E86',
    D: ZONE_PALETTES.library.far,
    d: '#100F26',
  },
  frames: [
    [
      '................................',
      '...lLLLLLL......................',
      '...L.....LL.....................',
      '...L....lLLL...cccccccccccc.....',
      '...L...lLLLLL..csssssssssscc....',
      '...L....yYYy...csTTTsSSSsssc....',
      '...L...........cssSSSSSsssscc...',
      '...L...........cssSSSsTTsssc....',
      '...L...........csSSSSSSSsssc....',
      '...L...........cssssSSsssssc....',
      '..LLL..........csssssssssssc..p.',
      '.lLLLL.......CkCkCkCkCkCkCkCCpPp',
      'WWWWWqqqqqqqqqWWWWWWWWWWWWWWWWWW',
      'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      '.DD.DwwwwwwwD..............DD...',
      '.DD.DdddddddD..............DD...',
      '.DD.DDDDDDDDD..............DD...',
      '.DD........................DD...',
      '.DD........................DD...',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// World pieces
// ---------------------------------------------------------------------------------------------

/** "// TODO: puente" bridge tile. Frames: inactive dotted outline, materialized plank. */
export const BRIDGE: PixelSprite = {
  palette: { k: COLORS.ink, p: COLORS.oat, P: COLORS.cloudLight, d: COLORS.cloudDark },
  frames: [
    ['d.d.d.d.', '........', '........', '.d.d.d.d', 'd......d', '........', '..d..d..', '........'],
    ['kkkkkkkk', 'ppppppPp', 'PpPppppp', 'kkkkkkkk', 'k......k', '.k....k.', '..k..k..', '...kk...'],
  ],
};

/** "╳╳" hazard glyphs: magenta tips, ink feet. */
export const SPIKES: PixelSprite = {
  palette: { m: COLORS.danger, M: '#A3247F', k: COLORS.ink },
  frames: [['m..mm..m', '.MM..MM.', '.MM..MM.', 'k..kk..k']],
};

/** Espejismo: a fake platform that glows too much and casts no shadow. Frames: 0, 1 shimmer. */
export const MIRAGE: PixelSprite = {
  palette: { i: COLORS.ivory, p: COLORS.periwinkle, b: '#A9C9EF', s: COLORS.erased },
  frames: [
    ['.iiiiiiiiiiiiii.', 'ppspppppbpppsppp', 'pbpppsppppbppppp', '.pppppppppppppp.'],
    ['.iiiiiiiiiiiiii.', 'pppppsppppppbpps', 'ppbppppppsppppbp', '.pppppppppppppp.'],
  ],
};

/** Keyboard keycap platform; the letter is drawn on top by code (face: cells 2..9 x 1..5). */
export const KEYCAP: PixelSprite = {
  palette: { k: COLORS.ink, g: COLORS.oat, i: COLORS.ivory, s: COLORS.cloudMedium },
  frames: [
    [
      '.kkkkkkkkkk.',
      'kgiiiiiiiigk',
      'kgiiiiiiiigk',
      'kgiiiiiiiigk',
      'kgiiiiiiiigk',
      'kgiiiiiiiigk',
      'kssssssssssk',
      '.kkkkkkkkkk.',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// Bosses
// ---------------------------------------------------------------------------------------------

const PAGE_W = 36;
const PAGE_H = 44;
/** Cells with x + y above this line are uncovered when the lower-right corner folds. */
const PAGE_FOLD = PAGE_W - 1 + (PAGE_H - 1) - 13;
/** Exposed core, in cells (inside the folded lower-right corner). */
const PAGE_CORE = { x: 30.5, y: 38.5, r: 3.6 } as const;

function blankPageCell(x: number, y: number): string {
  const right = PAGE_W - 1;
  const bottom = PAGE_H - 1;
  // Softly rounded corners.
  if ((x === 0 || x === right) && (y === 0 || y === bottom)) return '.';
  if (x === 0 || y === 0) return 'e';
  if (x === right || y === bottom) return 'E';
  if (x === right - 1 || y === bottom - 1) return 'e';
  // Calm closed eyes ("‿ ‿").
  const eyeRow = y === 16 ? [9, 13, 22, 26] : y === 17 ? [10, 11, 12, 23, 24, 25] : [];
  if (eyeRow.includes(x)) return 'k';
  // Faint ruled lines.
  if (y >= 6 && y % 4 === 2 && x >= 3 && x <= right - 3) return 'r';
  return 'w';
}

function blankPageFolded(x: number, y: number): string {
  if (x + y > PAGE_FOLD) {
    const inCore = Math.hypot(x + 0.5 - PAGE_CORE.x, y + 0.5 - PAGE_CORE.y);
    if (inCore < PAGE_CORE.r * 0.55) return 'M';
    if (inCore < PAGE_CORE.r) return 'm';
    return 'd';
  }
  // Mirror of the uncovered corner across the fold line: the back of the flap.
  const mx = PAGE_FOLD - y;
  const my = PAGE_FOLD - x;
  if (mx < PAGE_W && my < PAGE_H && x + y > PAGE_FOLD - 13) {
    return x + y === PAGE_FOLD || mx === PAGE_W - 1 || my === PAGE_H - 1 ? 'F' : 'f';
  }
  return blankPageCell(x, y);
}

const BLANK_PAGE_IDLE = paint(PAGE_W, PAGE_H, blankPageCell);

/**
 * La Hoja en Blanco: a tall, calm sheet of pure white. Frames: idle, cornerFolded (the lower-right
 * corner folds and exposes a magenta core around cell (30, 38)), hurt (inverted flash).
 */
export const BLANK_PAGE: PixelSprite = {
  palette: {
    w: COLORS.erased,
    e: COLORS.ivoryDark,
    E: COLORS.cloudLight,
    r: '#E9ECF3',
    k: COLORS.cloudLight,
    f: COLORS.oat,
    F: COLORS.cloudMedium,
    d: '#2A2630',
    m: COLORS.danger,
    M: '#FFB3EA',
    n: COLORS.ink,
    N: '#30302E',
    i: COLORS.ivory,
  },
  frames: [
    BLANK_PAGE_IDLE,
    paint(PAGE_W, PAGE_H, blankPageFolded),
    recolor(BLANK_PAGE_IDLE, { w: 'n', r: 'N', k: 'i', e: 'i', E: 'i' }),
  ],
};

/** Goma: the boss's sweeping eraser. The magenta lower edge is what erases. */
export const ERASER: PixelSprite = {
  palette: {
    W: COLORS.ivoryMedium,
    w: COLORS.ivory,
    g: COLORS.cloudLight,
    G: COLORS.cloudMedium,
    k: COLORS.ink,
    K: '#30302E',
    l: COLORS.cloudDark,
    m: COLORS.danger,
  },
  frames: [
    [
      '.WWWWWkkkkkkkkkkWWW.',
      'WwwwwwkKKKKKKKKkwwwW',
      'Wwwwwwkkkkkkkkkkwwwg',
      'WwwwwwklllllllkkwwWg',
      'WwwwwwkkkkkkkkkkwwWg',
      'WwwwwwkllllkkkkkwwWg',
      'WwwwwwkkkkkkkkkkwWWg',
      'gWWWWWkkkkkkkkkkWWgg',
      '.ggggggggggggggggGG.',
      '..mmmmmmmmmmmmmmmm..',
    ],
  ],
};

const WHEEL_SIZE = 24;
const WHEEL_TEXT = 'while(true) ';

/** The ring is a line of code: each character owns an angular slot; spaces leave gaps. */
function wheelGlyph(angle: number, shift: number): string | null {
  const pos = (angle / (Math.PI * 2)) * WHEEL_TEXT.length * 3 + shift;
  const index = Math.floor(pos);
  const char = WHEEL_TEXT[index % WHEEL_TEXT.length] ?? ' ';
  if (char === ' ' || pos - index > 0.7) return null;
  return char;
}

function loopWheelFrame(phase: number): Frame {
  const c = WHEEL_SIZE / 2;
  return paint(WHEEL_SIZE, WHEEL_SIZE, (x, y) => {
    const dx = x + 0.5 - c;
    const dy = y + 0.5 - c;
    const r = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
    if (r > 11.8) return '.';
    if (r > 10.9 || (r > 7.3 && r <= 8.1)) return 'R';
    if (r > 8.1) {
      const glyph = r > 8.6 && r < 10.5 ? wheelGlyph(angle, phase * 0.5) : null;
      if (!glyph) return 'd';
      if (glyph === '(' || glyph === ')') return 'p';
      return 'while'.includes(glyph) ? 't' : 'T';
    }
    if (r < 1.5) return 'e';
    if (r < 2.7) return 'h';
    // Four spokes, rotated 45 degrees on the second frame.
    const spoke = (angle + (phase * Math.PI) / 4) % (Math.PI / 2);
    return Math.min(spoke, Math.PI / 2 - spoke) * r < 0.8 ? 'H' : '.';
  });
}

/** El Bucle: optional mini-boss, a wheel made of a repeated `while(true)`. Frames: 0, 1. */
export const LOOP_WHEEL: PixelSprite = {
  palette: {
    R: COLORS.sky,
    d: '#0E0D24',
    t: COLORS.periwinkle,
    T: COLORS.heather,
    p: COLORS.iris,
    h: '#3D3D3A',
    H: COLORS.cloudDark,
    e: COLORS.danger,
  },
  frames: [loopWheelFrame(0), loopWheelFrame(1)],
};

// ---------------------------------------------------------------------------------------------
// HUD and FX
// ---------------------------------------------------------------------------------------------

/** A "█" health Token. Frames: full, empty. */
export const TOKEN_ICON: PixelSprite = {
  palette: { k: COLORS.ink, i: COLORS.ivory, s: COLORS.cloudLight, d: '#5E5D59', e: '#30302E' },
  frames: [
    ['kkkkkk', 'kiiiik', 'kiiisk', 'kiiisk', 'kiiisk', 'kiiisk', 'kssssk', 'kkkkkk'],
    ['kkkkkk', 'kddddk', 'kdeedk', 'kdeedk', 'kdeedk', 'kdeedk', 'kddddk', 'kkkkkk'],
  ],
};

const SLASH_W = 14;
const SLASH_H = 10;

/**
 * Crescent hugging an ellipse, convex side to the right, thickest in the middle and tapering to
 * points. `from`/`to` (-1 top .. 1 bottom) clip it so the arc can sweep downward.
 */
function slashFrame(from: number, to: number, faded: boolean): Frame {
  return paint(SLASH_W, SLASH_H, (x, y) => {
    const u = (x + 0.5 - 1) / 12.5;
    const v = (y + 0.5 - SLASH_H / 2) / 5.3;
    const d = Math.hypot(u, v);
    const thickness = 0.3 * (1 - v * v);
    if (d > 1 || d < 1 - thickness || v < from || v > to) return '.';
    if (faded) return (x + y) % 2 === 0 ? 'c' : '.';
    if (d > 1 - thickness * 0.3) return 'w';
    return d > 1 - thickness * 0.7 ? 'h' : 'c';
  });
}

/** Clawd's swipe, facing right. Frames: 0 rising, 1 full arc, 2 fading. */
export const SLASH: PixelSprite = {
  palette: { w: COLORS.ivory, h: COLORS.clawdLight, c: COLORS.clawdBody },
  frames: [slashFrame(-1, 0.2, false), slashFrame(-1, 1, false), slashFrame(-0.3, 1, true)],
};

export const PARTICLE_DOT: PixelSprite = { palette: { i: COLORS.ivory }, frames: [['i']] };
export const PARTICLE_INK: PixelSprite = { palette: { k: COLORS.ink }, frames: [['k']] };
export const PARTICLE_CRUMB: PixelSprite = { palette: { c: COLORS.cloudLight }, frames: [['cc']] };
export const PARTICLE_EMBER: PixelSprite = { palette: { e: COLORS.clawdLight }, frames: [['e']] };
