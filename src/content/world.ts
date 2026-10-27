import type { ZoneId } from '../config/palette';

/**
 * The whole game is one continuous map (tiles of 16 px). The critical path runs left to right;
 * after the ending the erased edge on the far left opens up (open world).
 * Terrain chars: '#' solid, 'B' bridge (solid once COMPLETAR is unlocked), '^' spikes,
 * 'E' erased wall (solid until the story is finished), '.' empty.
 */
export const WORLD_COLS = 200;
export const WORLD_ROWS = 20;

export type EntityKind =
  | 'player'
  | 'sign'
  | 'tilde'
  | 'grokBot'
  | 'dots'
  | 'note'
  | 'commit'
  | 'bench'
  | 'desk';

export interface WorldEntity {
  readonly kind: EntityKind;
  readonly col: number;
  readonly row: number;
  readonly id: string;
}

/** The three rival AIs, fought in this order. */
export type BossId = 'luna' | 'brasa' | 'nebula';
export const BOSS_ORDER: readonly BossId[] = ['luna', 'brasa', 'nebula'];

/** A closed room where a rival is fought. Columns are inclusive tile columns. */
export interface ArenaDef {
  readonly boss: BossId;
  /** Gate that closes behind the player when the fight starts. */
  readonly gateLeft: number;
  /** Gate that blocks the way on until the rival is beaten (null: the map's end wall). */
  readonly gateRight: number | null;
  /** Walking past this column starts the fight. */
  readonly triggerCol: number;
  /** Inner floor span the rival moves in. */
  readonly left: number;
  readonly right: number;
  readonly spawnCol: number;
  readonly spawnRow: number;
}

export const ARENAS: readonly ArenaDef[] = [
  {
    boss: 'luna',
    gateLeft: 57,
    gateRight: 74,
    triggerCol: 60,
    left: 58,
    right: 73,
    spawnCol: 70,
    spawnRow: 16,
  },
  {
    boss: 'brasa',
    gateLeft: 127,
    gateRight: 144,
    triggerCol: 130,
    left: 128,
    right: 143,
    spawnCol: 140,
    spawnRow: 16,
  },
  {
    boss: 'nebula',
    gateLeft: 166,
    gateRight: null,
    triggerCol: 170,
    left: 167,
    right: 197,
    spawnCol: 186,
    spawnRow: 9,
  },
];

/** Arenas share the main floor: its top row. */
export const ARENA_FLOOR_ROW = 17;

/** Gates span the whole arena height so they can't be jumped over. */
export const GATE_TOP_ROW = 1;
export const GATE_BOTTOM_ROW = 16;

type Grid = string[][];

function fill(grid: Grid, c0: number, c1: number, r0: number, r1: number, char: string): void {
  for (let r = r0; r <= r1; r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = c0; c <= c1; c++) row[c] = char;
  }
}

function buildTerrain(): string[] {
  const grid: Grid = Array.from({ length: WORLD_ROWS }, () =>
    Array.from({ length: WORLD_COLS }, () => '.'),
  );
  // Floor, outer walls and ceiling.
  fill(grid, 0, WORLD_COLS - 1, 17, 19, '#');
  fill(grid, 0, 1, 0, 19, '#');
  fill(grid, WORLD_COLS - 2, WORLD_COLS - 1, 0, 19, '#');
  fill(grid, 0, WORLD_COLS - 1, 0, 0, '#');
  // Secret room behind the erased edge.
  fill(grid, 7, 7, 1, 16, 'E');
  // El Arenero: a step, a block and a spike pit.
  fill(grid, 16, 19, 15, 16, '#');
  fill(grid, 28, 29, 15, 16, '#');
  fill(grid, 33, 38, 13, 13, '#');
  fill(grid, 31, 32, 14, 14, '#');
  fill(grid, 44, 46, 17, 18, '.');
  fill(grid, 44, 46, 18, 18, '^');
  // Luna's arena: two ledges to dodge shockwaves and meteors.
  fill(grid, 61, 63, 13, 13, '#');
  fill(grid, 68, 70, 13, 13, '#');
  // La Biblioteca Nocturna: a climb of shelves.
  fill(grid, 76, 76, 1, 12, '#');
  fill(grid, 80, 84, 14, 14, '#');
  fill(grid, 87, 91, 11, 11, '#');
  fill(grid, 94, 98, 8, 8, '#');
  fill(grid, 102, 106, 12, 12, '#');
  fill(grid, 110, 111, 15, 16, '#');
  // Brasa's arena: ledges to escape the burning floor.
  fill(grid, 131, 133, 13, 13, '#');
  fill(grid, 138, 140, 13, 13, '#');
  // The unfinished bridge over a spike pit: only COMPLETAR can cross it.
  fill(grid, 146, 153, 17, 19, '.');
  fill(grid, 146, 153, 19, 19, '^');
  fill(grid, 146, 153, 17, 17, 'B');
  // El Margen and Nébula's arena.
  fill(grid, 156, 159, 14, 14, '#');
  fill(grid, 174, 177, 13, 13, '#');
  fill(grid, 187, 190, 13, 13, '#');
  return grid.map((row) => row.join(''));
}

export const WORLD_TERRAIN: readonly string[] = buildTerrain();

export const ENTITIES: readonly WorldEntity[] = [
  { kind: 'player', col: 10, row: 16, id: 'start' },
  { kind: 'sign', col: 12, row: 16, id: 'walk' },
  { kind: 'sign', col: 15, row: 16, id: 'jump' },
  { kind: 'sign', col: 20, row: 16, id: 'dance' },
  { kind: 'tilde', col: 22, row: 16, id: 'tilde' },
  { kind: 'sign', col: 25, row: 16, id: 'attack' },
  { kind: 'grokBot', col: 31, row: 16, id: 'g1' },
  { kind: 'note', col: 35, row: 12, id: 'firstCommit' },
  { kind: 'grokBot', col: 40, row: 16, id: 'g2' },
  { kind: 'sign', col: 42, row: 16, id: 'pogo' },
  { kind: 'sign', col: 49, row: 16, id: 'rest' },
  { kind: 'commit', col: 51, row: 16, id: 'c1' },
  { kind: 'bench', col: 53, row: 16, id: 'b1' },
  { kind: 'sign', col: 55, row: 16, id: 'rival' },
  { kind: 'sign', col: 78, row: 16, id: 'heal' },
  { kind: 'grokBot', col: 86, row: 16, id: 'g3' },
  { kind: 'dots', col: 90, row: 8, id: 't1' },
  { kind: 'note', col: 96, row: 7, id: 'theJump' },
  { kind: 'dots', col: 101, row: 6, id: 't2' },
  { kind: 'grokBot', col: 104, row: 11, id: 'g4' },
  { kind: 'dots', col: 108, row: 9, id: 't3' },
  { kind: 'note', col: 114, row: 16, id: 'claudeMdLuz' },
  { kind: 'desk', col: 117, row: 16, id: 'desk' },
  { kind: 'commit', col: 121, row: 16, id: 'c2' },
  { kind: 'bench', col: 123, row: 16, id: 'b2' },
  { kind: 'sign', col: 145, row: 16, id: 'bridge' },
  { kind: 'note', col: 158, row: 13, id: 'pendingQuestion' },
  { kind: 'bench', col: 161, row: 16, id: 'b3' },
  { kind: 'commit', col: 163, row: 16, id: 'c3' },
  { kind: 'note', col: 189, row: 12, id: 'sessionNotes' },
  { kind: 'note', col: 4, row: 16, id: 'lastLine' },
  { kind: 'sign', col: 9, row: 16, id: 'erasedEdge' },
];

/** Each rest bench belongs to the commit terminal beside it. */
export const BENCH_COMMIT: Readonly<Record<string, string>> = { b1: 'c1', b2: 'c2', b3: 'c3' };

export function zoneAtCol(col: number): ZoneId {
  if (col < 76) return 'sandbox';
  if (col < 146) return 'library';
  return 'margin';
}
