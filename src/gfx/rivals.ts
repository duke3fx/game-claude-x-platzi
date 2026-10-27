import { COLORS } from '../config/palette';
import type { PixelSprite } from './pixelArt';

type Frame = readonly string[];

/** Pastes `patch` over `frame` at (x, y); '.' in the patch keeps the cell below. */
function overlay(frame: Frame, patch: Frame, x: number, y: number): Frame {
  return frame.map((row, rowIndex) => {
    const line = patch[rowIndex - y];
    if (line === undefined) return row;
    const cells = [...row];
    [...line].forEach((char, i) => {
      if (char !== '.' && x + i >= 0 && x + i < cells.length) cells[x + i] = char;
    });
    return cells.join('');
  });
}

/** Idle bob: everything above `row` sinks one cell and `row` itself is dropped. */
function bob(frame: Frame, row: number): Frame {
  const blank = '.'.repeat(frame[0]?.length ?? 0);
  return [blank, ...frame.slice(0, row), ...frame.slice(row + 1)];
}

/** Four-point sparkles; 't' is the sprite's own tint. */
const SPARKLE_BIG: Frame = ['..h..', '..h..', 'hhthh', '..h..', '..h..'];
const SPARKLE_SMALL: Frame = ['.....', '..h..', '.hth.', '..h..', '.....'];

const FACE = {
  e: '#141414',
  h: '#FFFFFF',
  p: '#FF9AA8',
  m: COLORS.danger,
} as const;

// ---------------------------------------------------------------------------------------------
// Luna: moon-headed astronaut
// ---------------------------------------------------------------------------------------------

/** Crescent head, 24 cols; the face sits on the thick lower part, turned right. */
const LUNA_HEAD: Frame = [
  '........OOO.............',
  '......OOllO.............',
  '....OOllyyO.............',
  '...OllyyyyyO............',
  '..OlyyccyyyO............',
  '.OlyyyccyyyyO...........',
  'OlyyyyyyyyyyyO..........',
  'OlycyyyyyyyyyYO.......O.',
  'OyyyyyyyyyyyyyYOO....OlO',
  'OyyyyyyyyyyyyyyyYOOOOyyO',
  'OYyyyyyyyyyyyyyyyyyyyyO.',
  'OYyyyyyyyyyyyyyyyyyyyyO.',
  '.OYyyyyyyyyyyyyyyyyyyyO.',
  '.OYyyyyyyyyyyyyyyyyyyyO.',
  '..OYyyyyyyyyyyyyyyyyyO..',
  '...OYyyyyyyyyyyyyyyyYO..',
  '....OOYyyyyyyyyyyYOO....',
  '......OOYYYYYYYYOO......',
  '........OOOOOOOO........',
];

const LUNA_FACE: Frame = ['.ee...ee.', 'ehee.ehee', 'eeem.eeem', '.ee...ee.', 'p...e...p'];

/** Suit with a life-support pack on the back; the far arm is shaded. */
const LUNA_BODY: Frame = [
  '........kssssssk............',
  '.kkkkkkwwwwwwwwwwkk.........',
  '.ksskwwkwwwwwwwwkwwk........',
  '.ksskwwkwwwwoowwkwwk........',
  '.ksskswkwwwwoowwkwwk........',
  '.kkkkswkswwwwwwwkswk........',
  '....kooksssssssskook........',
  '....kwwkwwwkwwwkkwwk........',
  '.....kkkwwwkwwwk.kk.........',
  '.......kwwwkwwwk............',
  '.......kooookoook...........',
  '.......kwwwkwwwwk...........',
  '.......kkkkkkkkkk...........',
];

const LUNA_THROW: Frame = [
  '........kssssssk............',
  '.kkkkkkwwwwwwwwwwkkkkkk.....',
  '.ksskwwkwwwwwwwwwwwwwwokwk..',
  '.ksskwwkwwwwoowwssssssokwwk.',
  '.ksskswkwwwwoowwkkkkkkkkwwk.',
  '.kkkkswkswwwwwwwk......kkk..',
  '....kooksssssssk............',
  '....kwwkwwwkwwwk............',
  '.....kkkwwwkwwwk............',
  '.......kwwwkwwwk............',
  '.......kooookoook...........',
  '.......kwwwkwwwwk...........',
  '.......kkkkkkkkkk...........',
];

function lunaFrame(body: Frame, sparkle: Frame): Frame {
  const head = LUNA_HEAD.map((row) => `${row}....`);
  return overlay(overlay([...head, ...body], LUNA_FACE, 11, 11), sparkle, 16, 1);
}

const LUNA_IDLE = lunaFrame(LUNA_BODY, SPARKLE_BIG);

/** Luna: moon-headed astronaut. Frames: 0 idle, 1 idle bob + twinkle, 2 throw. */
export const luna: PixelSprite = {
  palette: {
    O: '#3A2E12',
    y: '#F6E27A',
    Y: '#D9B84A',
    l: '#FFF3B0',
    c: '#C9A43A',
    w: '#F4F4F2',
    s: '#BFC4CC',
    k: '#2A2D34',
    o: '#FF9A3C',
    t: '#F6E27A',
    ...FACE,
  },
  frames: [
    LUNA_IDLE,
    bob(lunaFrame(LUNA_BODY, SPARKLE_SMALL), 28),
    lunaFrame(LUNA_THROW, SPARKLE_BIG),
  ],
};

// ---------------------------------------------------------------------------------------------
// Brasa: fire-headed hero
// ---------------------------------------------------------------------------------------------

const BRASA_FLAMES: Frame = [
  '.............XX.............',
  '.............XX.............',
  '........XX..XRRX..XX........',
  '........XX..XRRX..XX........',
  '.......XRRXXRFFRXXRRX.......',
  '...XX..XRFRRFaaFRRFRX..XX...',
  '...XX.XRFaFFaYYaFFaFRX.XX...',
  '..XRRXRFaYaaYYYYaaYaFRXRRX..',
  '..XRFRFaYYYYYYYYYYYYaFRFRX..',
  '.XRFaFaYYXXXXXXXXXXXYaFaFRX.',
  'XRFaYaYYXfffffffffffXYaYaFRX',
  'XRFaYYYXrcccccccccccrXYYaFRX',
  'XRFaYYYXrcccccccccccrXYYaFRX',
  'XRFaYYYXrcccccccccccrXYYaFRX',
  '.XRFaaaXrcccccccccccrXaaFRX.',
  '.XRFFFFXrcccccccccccrXFFFRX.',
  '..XRRRRXrcccccccccccrXRRRX..',
  '..XXXXXXrcccccccccccrXXXXX..',
  '........XrrrrrrrrrrrX.......',
  '.........XXXXXXXXXXX........',
];

const BRASA_FLAMES_FLICKER: Frame = [
  '..............XX............',
  '.........XX...XX............',
  '.........XX..XRRX...........',
  '........XRRX.XRRX..XX.......',
  '....XX..XRFRXRFFRX.XX..XX...',
  '....XX.XRFaFRFaaFRXRRX.XX...',
  '...XRRXRFaYaFaYYaFRFFRXRRX..',
  '...XRFRFaYYYaYYYYaFaaFRFRX..',
  'XXXRFaFaYYYYYYYYYYaYYaFaFRX.',
  'XRRFaYaYYXXXXXXXXXXXYYaYaFRX',
  'XRFaYYYYXfffffffffffXYYYaFRX',
  'XRFaYYYXrcccccccccccrXYYaFRX',
  'XRFaYYYXrcccccccccccrXYYaFRX',
  'XRFaYYYXrcccccccccccrXYYaFRX',
  '.XRFaaaXrcccccccccccrXaaFRX.',
  '.XRFFFFXrcccccccccccrXFFFRX.',
  '..XRRRRXrcccccccccccrXRRRX..',
  '..XXXXXXrcccccccccccrXXXXX..',
  '........XrrrrrrrrrrrX.......',
  '.........XXXXXXXXXXX........',
];

const BRASA_FLAMES_TALL: Frame = [
  '........XX..XXXX..XX........',
  '.......XRRX.XRRX.XRRX.......',
  '...XX..XRFRXRFFRXRFRX..XX...',
  '...XX..XRFFRFaaFRFFRX..XX...',
  '..XRRXXRFaaFaYYaFaaFRXXRRX..',
  '..XRFRRFaYYaYYYYaYYaFRRFRX..',
  '..XRFFFaYYYYYYYYYYYYaFFFRX..',
  'XXRFaaaYYYYYYYYYYYYYYaaaFRXX',
  'XRFaYYYYYYYYYYYYYYYYYYYYaFRX',
  'XRFaYYYYYXXXXXXXXXXXYYYYaFRX',
  'XRFaYYYYXfffffffffffXYYYaFRX',
  'XRFaYYYXrcccccccccccrXYYaFRX',
  'XRFaYYYXrcccccccccccrXYYaFRX',
  '.XRFaYYXrcccccccccccrXYaFRX.',
  '.XRFaaaXrcccccccccccrXaaFRX.',
  '..XRFFFXrcccccccccccrXFFRX..',
  '..XRRRRXrcccccccccccrXRRRX..',
  '...XXXXXrcccccccccccrXXXX...',
  '........XrrrrrrrrrrrX.......',
  '.........XXXXXXXXXXX........',
];

/** Face on the cream plate, nudged right so Brasa looks ahead. */
const BRASA_FACE: Frame = ['.ee...ee.', 'ehee.ehee', 'eeem.eeem', '.ee...ee.', 'p...e...p'];

const BRASA_BODY: Frame = [
  '.......XXXcccccccccXXX......',
  '......XccXcccccccccXccX.....',
  '......XccXcccccccccXccX.....',
  '......XCcXCccccccccXcCX.....',
  '......XrrXrrrrYrrrrXrrX.....',
  '.....XcccXrrraYarrrXcccX....',
  '.....XcCcXXcccXcccXXcCcX....',
  '......XXX.XcccXcccX.XXX.....',
  '..........XcccXcccX.........',
  '.........XrrrrXrrrrX........',
  '.........XFFFFXFFFFFX.......',
  '.........XXXXXXXXXXXX.......',
];

const BRASA_PUNCH: Frame = [
  '.......XXXcccccccccXXXXXX...',
  '......XccXcccccccccccccrXXX.',
  '......XccXcccccccccccccrXccX',
  '......XCcXCccccccccXXXXrXcCX',
  '......XrrXrrrrYrrrrX...XXXX.',
  '.....XcccXrrraYarrrX........',
  '.....XcCcXXcccXcccXX........',
  '......XXX.XcccXcccX.........',
  '..........XcccXcccX.........',
  '.........XrrrrXrrrrX........',
  '.........XFFFFXFFFFFX.......',
  '.........XXXXXXXXXXXX.......',
];

function brasaFrame(flames: Frame, body: Frame, sparks: Frame): Frame {
  return overlay(overlay([...flames, ...body], BRASA_FACE, 11, 12), sparks, 0, 0);
}

const SPARKS_A: Frame = [
  '..........................a.',
  '',
  '',
  'Y',
  '',
  '.........................Y',
];
const SPARKS_B: Frame = ['.a', '', '...........................Y', '', '', '', 'a'];

/** Brasa: fire-headed hero. Frames: 0 idle, 1 idle flicker + bob, 2 punch with taller flames. */
export const brasa: PixelSprite = {
  palette: {
    X: '#5A1408',
    R: '#E8401C',
    F: '#FF7A1A',
    a: '#FFB627',
    Y: '#FFE066',
    r: '#E8401C',
    f: '#FF7A1A',
    c: '#FFF1D6',
    C: '#EBCB9E',
    ...FACE,
  },
  frames: [
    brasaFrame(BRASA_FLAMES, BRASA_BODY, SPARKS_A),
    bob(brasaFrame(BRASA_FLAMES_FLICKER, BRASA_BODY, SPARKS_B), 28),
    brasaFrame(BRASA_FLAMES_TALL, BRASA_PUNCH, SPARKS_B),
  ],
};

// ---------------------------------------------------------------------------------------------
// Nebula: floating galaxy spirit
// ---------------------------------------------------------------------------------------------

const NEBULA_IDLE: Frame = [
  '..............................',
  '...............DDD............',
  '............DDDLLLDDD.........',
  '...........DLLLLVVVLLD........',
  '..........DLPPhPPVVVVVD.......',
  '.........DLPPVVVPPVVVVVD......',
  '........DLLPPVVVVVPVhVVBD.....',
  '........DLVVVVVVVVPVVVVBD.....',
  '........DLVVVVVLLLLLVVVBD.....',
  '........DLVVVLLLLLLLLLVBD.....',
  '........DLVhLLLLLLLLLLLBD.....',
  '........DLVLLLLLLLLLLLLLD.....',
  '.........DVLLLLLLLLLLLLD......',
  '..........DVLLLLLLLLLLD.......',
  '...........DVLLLLLLLLD..DD....',
  '.....DDD..DLLVVLLLLLVVDDLBD...',
  '....DLLLDDLLVVVVVVVBBBBBBBD...',
  '.....DBBBBLVVVVVVVBBDDDDDD....',
  '..GGGGDDDDDVVVVVVVBD..........',
  '.gG........DVVVVVhBDGG........',
  '.gg........DLVVVVVBD.GGGGG....',
  '..ggg......DLVVPPBBD.....GGG..',
  '....ggggg..DLVVPVBD........GG.',
  '........gggggggPVBD........gg.',
  '.......D...DLhgggggggggggggg..',
  '......DD...DLPPVBD............',
  '.....DD...DLLPVBBD............',
  '.....DLD.DPPPPBBD.............',
  '......DVDPPVBBBD..............',
  '......DBBBBBBDD...............',
  '.......DDDDDD.................',
  '..............................',
];

const NEBULA_SPREAD: Frame = [
  '..............................',
  '...............DDD............',
  '............DDDLLLDDD.........',
  '...........DLLLLVVVLLD........',
  '..........DLPPhPPVVVVVD.......',
  '.........DLPPVVVPPVVVVVD......',
  '........DLLPPVVVVVPVhVVBD.....',
  '........DLVVVVVVVVPVVVVBD.....',
  '........DLVVVVVLLLLLVVVBD.....',
  '....DD..DLVVVLLLLLLLLLVVD.D...',
  '...DLLD.DLVhLLLLLLLLLLLVVDBD..',
  '...DLVVDLLVLLLLLLLLLLLLLVBBD..',
  '....DBVVLVVLLLLLLLLLLLLLBBD...',
  '.....DDVVVVVLLLLLLLLLLLBBD....',
  '.......DVVhVVLLLLLLLLLBDD.....',
  '........DVVVVVVLLLLLBBD.......',
  '.........DVVVVVVVVVBBD........',
  '..........DVVVVVVVBBD.........',
  '..GGGGGGGGGDVVVVVVBD..........',
  '.gG........DLVVVVhBDGG........',
  '.gg........DLVVVVVBD.GGGGG....',
  '..ggg......DLVVPPBBD.....GGG..',
  '....ggggg..DLVVPVBD........GG.',
  '........gggggggPVBD........gg.',
  '.......D...DLhgggggggggggggg..',
  '......DD...DLPPVBD............',
  '.....DD...DLLPVBBD............',
  '.....DLD.DPPPPBBD.............',
  '......DVDPPVBBBD..............',
  '......DBBBBBBDD...............',
  '.......DDDDDD.................',
  '..............................',
];

const NEBULA_FACE: Frame = [
  '.ee...ee.',
  'ehee.ehee',
  'eeem.eeem',
  '.ee...ee.',
  'p..eee..p',
  '....p....',
];

function nebulaFrame(body: Frame, sparkles: readonly (readonly [Frame, number, number])[]): Frame {
  return sparkles.reduce(
    (frame, [patch, x, y]) => overlay(frame, patch, x, y),
    overlay(body, NEBULA_FACE, 13, 10),
  );
}

const NEBULA_REST = nebulaFrame(NEBULA_IDLE, [
  [SPARKLE_BIG, 1, 3],
  [SPARKLE_SMALL, 24, 1],
  [SPARKLE_SMALL, 24, 25],
]);

/** Nebula: floating galaxy spirit with an orbiting ring. Frames: 0 idle, 1 float, 2 spread arms. */
export const nebula: PixelSprite = {
  palette: {
    D: '#1E1E6E',
    B: '#3B33B0',
    V: '#6A4BE0',
    L: '#9C7BFF',
    P: '#E6A8FF',
    g: '#CDB8FF',
    G: '#9C7BFF',
    t: '#E6A8FF',
    ...FACE,
  },
  frames: [
    NEBULA_REST,
    bob(
      nebulaFrame(NEBULA_IDLE, [
        [SPARKLE_SMALL, 1, 3],
        [SPARKLE_BIG, 24, 1],
        [SPARKLE_SMALL, 25, 24],
      ]),
      31,
    ),
    nebulaFrame(NEBULA_SPREAD, [
      [SPARKLE_BIG, 0, 1],
      [SPARKLE_BIG, 25, 2],
      [SPARKLE_SMALL, 0, 24],
      [SPARKLE_SMALL, 24, 25],
      [SPARKLE_SMALL, 19, 0],
    ]),
  ],
};

// ---------------------------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------------------------

/** Luna's thrown moon rock. */
export const moonRock: PixelSprite = {
  palette: {
    k: '#3A2E12',
    l: '#EDE3B4',
    y: '#C9BC8A',
    Y: '#958A62',
    c: '#6E6448',
    m: COLORS.danger,
  },
  frames: [['.kkkk.', 'kllyyk', 'klycYk', 'kyyYYm', 'kcYYmm', '.kmmm.']],
};

/** Luna's crescent blade; the magenta edge is the convex side. */
export const crescent: PixelSprite = {
  palette: { k: '#3A2E12', y: '#F6E27A', l: '#FFF6C8', m: COLORS.danger },
  frames: [
    [
      '.kkm....',
      '..kylm..',
      '...kylm.',
      '....kylm',
      '....kylm',
      '...kylm.',
      '..kylm..',
      '.kkm....',
    ],
  ],
};

const FIREBALL_CORE: Frame = ['XRFFFRX', 'XFaYaFX', 'XFYmYFX', 'XRFaFRX', '.XXXXX.'];

/** Brasa's fireball. Frames: 0, 1 (flicker). */
export const fireball: PixelSprite = {
  palette: {
    X: '#5A1408',
    R: '#E8401C',
    F: '#FF7A1A',
    a: '#FFB627',
    Y: '#FFE066',
    m: COLORS.danger,
  },
  frames: [
    ['..X.X..', '.XRXRX.', ...FIREBALL_CORE],
    ['...X...', '.XXRXX.', 'XRFaFRX', 'XFYaYFX', 'XFamaFX', 'XRFYFRX', '.XXXXX.'],
  ],
};

/** Brasa's eruption: a column of fire anchored at the bottom. Frames: 0, 1 (flicker). */
export const flamePillar: PixelSprite = {
  palette: {
    X: '#5A1408',
    R: '#E8401C',
    F: '#FF7A1A',
    a: '#FFB627',
    Y: '#FFE066',
    m: COLORS.danger,
  },
  frames: [
    [
      '...XX...',
      '...XX...',
      '...XaX..',
      '...XaX..',
      '...XaX..',
      '...XaX..',
      '..XaaX..',
      '.XRaaX..',
      '.XFaFX..',
      '..XmFX..',
      '..XaX...',
      '..XaFX..',
      '.XFaaFX.',
      '.XFaaFX.',
      '..XaaFX.',
      '..XFaX..',
      '..XFaX..',
      '..XYYFX.',
      '.XFmmFX.',
      '.XFYYFX.',
      '.XFYYFX.',
      '.XFYYX..',
      '.XFYYX..',
      '.XFYYFX.',
      'XRFYYFRX',
      'XRFYYFRX',
      '.XFYYFX.',
      '.XFmmFX.',
      '.XFYYFX.',
      'mRFYYFRm',
      'mRFYYFFm',
      'mRFYYFRm',
    ],
    [
      '........',
      '...XX...',
      '...XX...',
      '..XaX...',
      '.XRaRX..',
      '.XRaRX..',
      '..XaRX..',
      '..XaX...',
      '..XaFX..',
      '..XaaX..',
      '..XaaFX.',
      '..XFaFX.',
      '..XFmFX.',
      '..XFaX..',
      '..XaaX..',
      '.XFaaFX.',
      '.XFaaFX.',
      '.XFYYFX.',
      '.XFYYX..',
      '.XFYYX..',
      '.XFYYFX.',
      '.XFmmFX.',
      '.XFYYFRX',
      '.XFYYFX.',
      '.XFYYFX.',
      '.XFYYFX.',
      '.XFYYFX.',
      'XRFYYFRX',
      'XRFYYFRX',
      '.mFYYFm.',
      '.mFmmFm.',
      '.mFYYFm.',
    ],
  ],
};

/** Nebula's star shot. Frames: 0, 1 (twinkle). */
export const star: PixelSprite = {
  palette: { h: '#FFFFFF', l: '#CDB8FF', m: COLORS.danger },
  frames: [
    ['..h..', '..l..', 'hlmlh', '..l..', '..h..'],
    ['h...h', '.l.l.', '..m..', '.l.l.', 'h...h'],
  ],
};

/** Luna's ground slam: a low wave of moon dust rolling right. */
export const shockwave: PixelSprite = {
  palette: { k: '#3A2E12', y: '#F6E27A', Y: '#D9B84A', c: '#C9A43A', m: COLORS.danger },
  frames: [['.......mm.', '.....kmyym', '..kk.kyyYm', '.kyykyyYYk', 'kyYYyYYYck']],
};

/** Nebula's black hole: a dark core inside a swirling ring. Frames: 0, 1 (ring turned). */
export const blackHole: PixelSprite = {
  palette: {
    k: '#07061A',
    d: '#1E1440',
    m: COLORS.danger,
    w: '#FFFFFF',
    l: '#CDB8FF',
    v: '#6A4BE0',
  },
  frames: [
    [
      '........ll......',
      '......llllll....',
      '....lllmdddvll..',
      '....lmddddddvv..',
      '...wldmmmmdddvv.',
      '..dlmmkkkkmdddv.',
      '..dlmkkkkkkmdd.v',
      '..dlmkkkkkkmwd..',
      '..dwmkkkkkkmld..',
      'v.ddmkkkkkkmld..',
      '.vdddmkkkkmmld..',
      '.vvdddmmmmdlw...',
      '..vvddddddml....',
      '..llvdddmlll....',
      '....llllll......',
      '......ll........',
    ],
    [
      '......llll......',
      '....llvvvvv.....',
      '...llmddddd.....',
      '..llmddddddd....',
      '..lmddmmmmwwd...',
      '..lmdmkkkkmlwd..',
      '..lmmkkkkkkmlw..',
      '..lmmkkkkkkmmw..',
      '..wmmkkkkkkmml..',
      '..wlmkkkkkkmml..',
      '..dwlmkkkkmdml..',
      '...dwwmmmmddml..',
      '....dddddddmll..',
      '.....dddddmll...',
      '.....vvvvvll....',
      '......llll......',
    ],
  ],
};

export const RIVAL_SPRITES = {
  luna,
  brasa,
  nebula,
  moonRock,
  crescent,
  fireball,
  flamePillar,
  star,
  shockwave,
  blackHole,
} as const satisfies Record<string, PixelSprite>;
