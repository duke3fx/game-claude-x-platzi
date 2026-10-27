import { describe, expect, it } from 'vitest';
import { ActionBuffer } from '../src/core/actionBuffer';
import { DANCE_DURATION_MS, DANCE_ORDER, danceAt, dancePose } from '../src/core/dance';
import { crescentPoints } from '../src/core/geometry';
import { TapHold } from '../src/core/tapHold';
import { Vitals } from '../src/core/vitals';

describe('dances', () => {
  it('has four dances that cycle', () => {
    expect(DANCE_ORDER).toHaveLength(4);
    expect(danceAt(0)).toBe('hooray');
    expect(danceAt(5)).toBe(DANCE_ORDER[1]);
  });

  it('produces finite poses for the whole duration of every dance', () => {
    for (const id of DANCE_ORDER) {
      for (let t = 0; t <= DANCE_DURATION_MS[id]; t += 37) {
        const pose = dancePose(id, t);
        for (const value of [pose.offsetY, pose.scaleX, pose.scaleY, pose.angle, pose.beat]) {
          expect(Number.isFinite(value)).toBe(true);
        }
        expect(pose.offsetY).toBeLessThanOrEqual(0);
        expect(pose.scaleX).toBeGreaterThan(0);
      }
    }
  });

  it('shows the back of Clawd halfway through a turntable spin', () => {
    expect(dancePose('turntable', 0).pose).toBe('idle');
    expect(dancePose('turntable', 500).pose).toBe('back');
  });
});

describe('TapHold', () => {
  it('reports a tap on a quick release', () => {
    const input = new TapHold(180);
    input.press(1000);
    expect(input.isHolding(1100)).toBe(false);
    expect(input.release(1100)).toBe(true);
  });

  it('reports holding after the threshold and no tap on release', () => {
    const input = new TapHold(180);
    input.press(1000);
    expect(input.isHolding(1200)).toBe(true);
    expect(input.release(1300)).toBe(false);
    expect(input.isHolding(1400)).toBe(false);
  });
});

describe('ActionBuffer', () => {
  it('keeps a press until consumed or cleared', () => {
    const buffer = new ActionBuffer<'jump' | 'attack'>();
    buffer.press('jump');
    expect(buffer.peek('jump')).toBe(true);
    expect(buffer.consume('jump')).toBe(true);
    expect(buffer.consume('jump')).toBe(false);
    buffer.press('attack');
    buffer.clear();
    expect(buffer.consume('attack')).toBe(false);
  });
});

describe('Vitals.spendContext', () => {
  it('spends only when there is enough Contexto', () => {
    const vitals = new Vitals({
      maxTokens: 5,
      maxContext: 99,
      contextPerHit: 11,
      healCost: 33,
      invulnerableMs: 1000,
    });
    expect(vitals.spendContext(33)).toBe(false);
    for (let i = 0; i < 3; i++) vitals.registerHit();
    expect(vitals.spendContext(33)).toBe(true);
    expect(vitals.context).toBe(0);
  });
});

describe('crescentPoints', () => {
  it('builds a closed outline with sharp tips', () => {
    const points = crescentPoints(0, Math.PI, 10, 4, 8);
    expect(points).toHaveLength(18);
    const first = points[0];
    const last = points[points.length - 1];
    expect(first?.x).toBeCloseTo(last?.x ?? Number.NaN);
    expect(first?.y).toBeCloseTo(last?.y ?? Number.NaN);
  });
});
