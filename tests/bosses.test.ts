import { describe, expect, it } from 'vitest';
import {
  ARENAS,
  BOSS_ORDER,
  GATE_BOTTOM_ROW,
  GATE_TOP_ROW,
  WORLD_COLS,
  WORLD_TERRAIN,
  zoneAtCol,
} from '../src/content/world';
import { BossBrain, isPhase2 } from '../src/core/bossBrain';

describe('BossBrain', () => {
  it('never repeats the previous move', () => {
    const brain = new BossBrain(['a', 'b'], ['a', 'b', 'c']);
    let previous = brain.next(false, () => 0);
    for (let i = 0; i < 20; i++) {
      const move = brain.next(i > 10, () => (i * 0.37) % 1);
      expect(move).not.toBe(previous);
      previous = move;
    }
  });

  it('only uses phase-2 moves once in phase 2', () => {
    const brain = new BossBrain(['a', 'b'], ['a', 'b', 'c']);
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) seen.add(brain.next(false, () => (i * 0.61) % 1));
    expect(seen.has('c')).toBe(false);
    for (let i = 0; i < 30; i++) seen.add(brain.next(true, () => (i * 0.61) % 1));
    expect(seen.has('c')).toBe(true);
  });

  it('switches to phase 2 at the threshold', () => {
    expect(isPhase2(6, 12, 0.5)).toBe(true);
    expect(isPhase2(7, 12, 0.5)).toBe(false);
  });
});

describe('boss arenas', () => {
  it('has one arena per rival, in order, left to right', () => {
    expect(ARENAS.map((arena) => arena.boss)).toEqual(BOSS_ORDER);
    for (let i = 1; i < ARENAS.length; i++) {
      expect(ARENAS[i]?.gateLeft).toBeGreaterThan(ARENAS[i - 1]?.right ?? 0);
    }
  });

  it('keeps gates, trigger and spawn inside the map and the arena', () => {
    for (const arena of ARENAS) {
      expect(arena.gateLeft).toBeLessThan(arena.left);
      expect(arena.triggerCol).toBeGreaterThanOrEqual(arena.left);
      expect(arena.triggerCol).toBeLessThan(arena.spawnCol);
      expect(arena.spawnCol).toBeLessThanOrEqual(arena.right);
      expect(arena.right).toBeLessThan(arena.gateRight ?? WORLD_COLS - 2);
      expect(zoneAtCol(arena.left)).toBe(zoneAtCol(arena.right));
    }
  });

  it('leaves the gate columns open until a fight closes them', () => {
    for (const arena of ARENAS) {
      for (const col of [arena.gateLeft, arena.gateRight]) {
        if (col === null) continue;
        for (let row = GATE_TOP_ROW; row <= GATE_BOTTOM_ROW; row++) {
          expect(WORLD_TERRAIN[row]?.[col], `col ${col} row ${row}`).toBe('.');
        }
      }
    }
  });

  it('gives every arena a flat, solid floor', () => {
    for (const arena of ARENAS) {
      for (let col = arena.left; col <= arena.right; col++) {
        expect(WORLD_TERRAIN[17]?.[col], `col ${col}`).toBe('#');
        expect(WORLD_TERRAIN[16]?.[col], `col ${col}`).toBe('.');
      }
    }
  });
});
