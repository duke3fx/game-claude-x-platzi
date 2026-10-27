/**
 * Picks a boss's next move: random, but never the same move twice in a row,
 * and phase 2 unlocks extra moves.
 */
export class BossBrain<Move extends string> {
  private readonly phase1: readonly Move[];
  private readonly phase2: readonly Move[];
  private last: Move | null = null;

  constructor(phase1: readonly Move[], phase2: readonly Move[]) {
    if (phase1.length === 0 || phase2.length === 0) throw new Error('A boss needs moves');
    this.phase1 = phase1;
    this.phase2 = phase2;
  }

  next(inPhase2: boolean, random: () => number): Move {
    const moves = inPhase2 ? this.phase2 : this.phase1;
    const options = moves.length > 1 ? moves.filter((move) => move !== this.last) : moves;
    const index = Math.min(options.length - 1, Math.floor(random() * options.length));
    const move = options[index] ?? moves[0];
    if (move === undefined) throw new Error('A boss needs moves');
    this.last = move;
    return move;
  }
}

/** Phase 2 starts once health drops to this fraction of the maximum. */
export function isPhase2(hp: number, maxHp: number, threshold: number): boolean {
  return hp <= maxHp * threshold;
}
