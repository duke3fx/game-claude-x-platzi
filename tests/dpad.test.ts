import { describe, expect, it } from 'vitest';
import { dpadDirections } from '../src/core/dpad';

describe('dpadDirections', () => {
  it('presses nothing inside the dead zone', () => {
    expect(dpadDirections(3, -2, 10)).toEqual({
      left: false,
      right: false,
      up: false,
      down: false,
    });
    expect(dpadDirections(0, 0, 0)).toEqual({ left: false, right: false, up: false, down: false });
  });

  it('maps the four axes', () => {
    expect(dpadDirections(40, 0, 10)).toEqual({ left: false, right: true, up: false, down: false });
    expect(dpadDirections(-40, 5, 10)).toEqual({
      left: true,
      right: false,
      up: false,
      down: false,
    });
    expect(dpadDirections(0, -40, 10)).toEqual({
      left: false,
      right: false,
      up: true,
      down: false,
    });
    expect(dpadDirections(4, 40, 10)).toEqual({ left: false, right: false, up: false, down: true });
  });

  it('presses two directions on a diagonal', () => {
    expect(dpadDirections(30, 30, 10)).toEqual({ left: false, right: true, up: false, down: true });
    expect(dpadDirections(-30, -30, 10)).toEqual({
      left: true,
      right: false,
      up: true,
      down: false,
    });
  });
});
