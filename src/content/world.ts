import type { ZoneId } from '../config/palette';

/**
 * The whole game is one continuous map (tiles of 16 px). The critical path runs left to right;
 * after the ending the erased edge on the far left opens up (open world).
 * Terrain chars: '#' solid, 'B' bridge (solid once COMPLETAR is unlocked), '^' spikes,
 * 'E' erased wall (solid until the story is finished), '.' empty.
 */
export const WORLD_COLS = 160;
export const WORLD_ROWS = 20;

export type EntityKind =
  | 'player'
  | 'sign'
  | 'tilde'
  | 'garabato'
  | 'todo'
  | 'note'
  | 'commit'
  | 'desk'
  | 'boss';

export interface WorldEntity {
  readonly kind: EntityKind;
  readonly col: number;
  readonly row: number;
  readonly id: string;
}

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
  // La Biblioteca Nocturna: a climb of shelves.
  fill(grid, 56, 56, 1, 12, '#');
  fill(grid, 60, 64, 14, 14, '#');
  fill(grid, 67, 71, 11, 11, '#');
  fill(grid, 74, 78, 8, 8, '#');
  fill(grid, 82, 86, 12, 12, '#');
  fill(grid, 90, 91, 15, 16, '#');
  // The unfinished bridge over a spike pit: only COMPLETAR can cross it.
  fill(grid, 106, 113, 17, 19, '.');
  fill(grid, 106, 113, 19, 19, '^');
  fill(grid, 106, 113, 17, 17, 'B');
  // El Margen and the boss arena.
  fill(grid, 116, 119, 14, 14, '#');
  fill(grid, 134, 137, 13, 13, '#');
  fill(grid, 147, 150, 13, 13, '#');
  return grid.map((row) => row.join(''));
}

export const WORLD_TERRAIN: readonly string[] = buildTerrain();

export const ENTITIES: readonly WorldEntity[] = [
  { kind: 'player', col: 10, row: 16, id: 'start' },
  { kind: 'sign', col: 12, row: 16, id: 'walk' },
  { kind: 'sign', col: 15, row: 16, id: 'jump' },
  { kind: 'tilde', col: 22, row: 16, id: 'tilde' },
  { kind: 'sign', col: 25, row: 16, id: 'attack' },
  { kind: 'garabato', col: 31, row: 16, id: 'g1' },
  { kind: 'note', col: 35, row: 12, id: 'firstCommit' },
  { kind: 'garabato', col: 40, row: 16, id: 'g2' },
  { kind: 'sign', col: 42, row: 16, id: 'pogo' },
  { kind: 'commit', col: 51, row: 16, id: 'c1' },
  { kind: 'sign', col: 58, row: 16, id: 'heal' },
  { kind: 'garabato', col: 66, row: 16, id: 'g3' },
  { kind: 'todo', col: 70, row: 8, id: 't1' },
  { kind: 'note', col: 76, row: 7, id: 'theJump' },
  { kind: 'todo', col: 81, row: 6, id: 't2' },
  { kind: 'garabato', col: 84, row: 11, id: 'g4' },
  { kind: 'todo', col: 88, row: 9, id: 't3' },
  { kind: 'note', col: 94, row: 16, id: 'claudeMdLuz' },
  { kind: 'desk', col: 97, row: 16, id: 'desk' },
  { kind: 'commit', col: 101, row: 16, id: 'c2' },
  { kind: 'sign', col: 104, row: 16, id: 'bridge' },
  { kind: 'note', col: 118, row: 13, id: 'pendingQuestion' },
  { kind: 'commit', col: 123, row: 16, id: 'c3' },
  { kind: 'boss', col: 146, row: 9, id: 'blankPage' },
  { kind: 'note', col: 149, row: 12, id: 'sessionNotes' },
  { kind: 'note', col: 4, row: 16, id: 'lastLine' },
  { kind: 'sign', col: 9, row: 16, id: 'erasedEdge' },
];

/** Column where the boss arena gate closes behind the player. */
export const ARENA_GATE_COL = 126;
export const ARENA_TRIGGER_COL = 130;

export function zoneAtCol(col: number): ZoneId {
  if (col < 56) return 'sandbox';
  if (col < 106) return 'library';
  return 'margin';
}
