export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Outline of a crescent swept from angle `a0` to `a1` (radians) around the origin. The band is
 * thickest in the middle and tapers to sharp tips, like a blade's slash.
 */
export function crescentPoints(
  a0: number,
  a1: number,
  radius: number,
  thickness: number,
  steps: number,
): Point[] {
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = a0 + (a1 - a0) * t;
    const half = (thickness * Math.sin(Math.PI * t)) / 2;
    outer.push({ x: Math.cos(angle) * (radius + half), y: Math.sin(angle) * (radius + half) });
    inner.push({ x: Math.cos(angle) * (radius - half), y: Math.sin(angle) * (radius - half) });
  }
  return [...outer, ...inner.reverse()];
}
