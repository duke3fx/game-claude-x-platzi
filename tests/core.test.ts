import { describe, expect, it } from 'vitest';
import { approach } from '../src/core/approach';
import { parseAsciiMap } from '../src/core/asciiMap';
import { JumpAssist } from '../src/core/jumpAssist';
import { createDefaultSave, parseSave, SaveStore, type StorageAdapter } from '../src/core/save';
import { StateMachine } from '../src/core/stateMachine';
import { Vitals } from '../src/core/vitals';

describe('approach', () => {
  it('moves toward the target without overshooting', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(5, -5, 20)).toBe(-5);
  });
});

describe('JumpAssist', () => {
  it('allows a jump during coyote time after leaving the ground', () => {
    const assist = new JumpAssist(100, 120);
    assist.update(16, true, false);
    assist.update(80, false, true);
    expect(assist.consumeJump()).toBe(true);
  });

  it('rejects a jump after coyote time expires', () => {
    const assist = new JumpAssist(100, 120);
    assist.update(16, true, false);
    assist.update(150, false, true);
    expect(assist.consumeJump()).toBe(false);
  });

  it('buffers a press made shortly before landing', () => {
    const assist = new JumpAssist(100, 120);
    assist.update(16, false, true);
    assist.update(60, true, false);
    expect(assist.consumeJump()).toBe(true);
    expect(assist.consumeJump()).toBe(false);
  });
});

describe('Vitals', () => {
  const config = {
    maxTokens: 5,
    maxContext: 99,
    contextPerHit: 11,
    healCost: 33,
    invulnerableMs: 1000,
  };

  it('heals only with enough context and missing tokens', () => {
    const vitals = new Vitals(config);
    expect(vitals.heal()).toBe(false);
    vitals.takeDamage(2);
    for (let i = 0; i < 3; i++) vitals.registerHit();
    expect(vitals.heal()).toBe(true);
    expect(vitals.tokens).toBe(4);
    expect(vitals.context).toBe(0);
  });

  it('clamps damage at zero and reports death', () => {
    const vitals = new Vitals(config);
    vitals.takeDamage(9);
    expect(vitals.tokens).toBe(0);
    expect(vitals.isDead).toBe(true);
  });

  it('ignores hits during the grace time right after taking one', () => {
    const vitals = new Vitals(config);
    expect(vitals.takeDamage(1)).toBe(true);
    expect(vitals.isInvulnerable).toBe(true);
    vitals.tick(999);
    expect(vitals.takeDamage(1)).toBe(false);
    expect(vitals.tokens).toBe(4);
    vitals.tick(1);
    expect(vitals.isInvulnerable).toBe(false);
    expect(vitals.takeDamage(1)).toBe(true);
    expect(vitals.tokens).toBe(3);
  });

  it('can start the grace time without a hit, never shortening one in progress', () => {
    const vitals = new Vitals(config);
    vitals.protect();
    expect(vitals.takeDamage(1)).toBe(false);
    vitals.tick(400);
    vitals.protect();
    expect(vitals.invulnerableMs).toBe(1000);
    expect(vitals.tokens).toBe(5);
  });
});

describe('StateMachine', () => {
  it('runs enter/exit hooks and tracks time in state', () => {
    const log: string[] = [];
    const fsm = new StateMachine<'idle' | 'run', { log: string[] }>(
      { log },
      {
        idle: { enter: (ctx) => ctx.log.push('enter idle'), update: () => 'run' },
        run: { enter: (ctx, from) => ctx.log.push(`enter run from ${from}`) },
      },
      'idle',
    );
    fsm.update(16);
    expect(fsm.state).toBe('run');
    fsm.update(10);
    expect(fsm.timeInState).toBe(10);
    expect(log).toEqual(['enter idle', 'enter run from idle']);
  });
});

describe('save', () => {
  it('round-trips through the store', () => {
    const memory = new Map<string, string>();
    const storage: StorageAdapter = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    };
    const store = new SaveStore(storage);
    const data = { ...createDefaultSave('c1'), notes: ['n1'], abilities: ['complete' as const] };
    store.save(data);
    expect(store.load()).toEqual(data);
  });

  it('rejects malformed or outdated data', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave({ ...createDefaultSave('c1'), version: 0 })).toBeNull();
    expect(parseSave({ ...createDefaultSave('c1'), abilities: ['fly'] })).toBeNull();
  });
});

describe('parseAsciiMap', () => {
  it('separates solid tiles from markers', () => {
    const map = parseAsciiMap(['#P.', '###'], new Set(['#']), new Set(['.', ' ']));
    expect(map.cols).toBe(3);
    expect(map.solid[1]).toEqual([true, true, true]);
    expect(map.markers).toEqual([{ char: 'P', col: 1, row: 0 }]);
  });
});

describe('withEyesShifted', () => {
  it('moves eye pixels inside the body', async () => {
    const { withEyesShifted } = await import('../src/gfx/clawdLook');
    const sprite = { palette: { '#': '#000', o: '#fff' }, frames: [['#o##o#']] };
    expect(withEyesShifted(sprite, 1).frames[0]).toEqual(['##o##o']);
    expect(withEyesShifted(sprite, -1).frames[0]).toEqual(['o##o##']);
  });
});
