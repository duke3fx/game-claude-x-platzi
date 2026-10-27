export type Direction = 'left' | 'right' | 'up' | 'down';
export const DIRECTIONS: readonly Direction[] = ['left', 'right', 'up', 'down'];
export type DpadState = Readonly<Record<Direction, boolean>>;

/** cos(67.5°): each direction covers a 135° arc, so the four diagonals press two directions. */
const AXIS_THRESHOLD = Math.cos((67.5 * Math.PI) / 180);

/**
 * Directions held on a virtual 8-way d-pad, from the touch offset to the pad's center
 * (screen axes: +y is down). Touches inside the dead zone press nothing.
 */
export function dpadDirections(dx: number, dy: number, deadZone: number): DpadState {
  const length = Math.hypot(dx, dy);
  if (length <= deadZone || length === 0) {
    return { left: false, right: false, up: false, down: false };
  }
  const x = dx / length;
  const y = dy / length;
  return {
    left: x < -AXIS_THRESHOLD,
    right: x > AXIS_THRESHOLD,
    up: y < -AXIS_THRESHOLD,
    down: y > AXIS_THRESHOLD,
  };
}
