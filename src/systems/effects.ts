import Phaser from 'phaser';
import { COLORS, hexToNumber } from '../config/palette';
import { HIT_FX } from '../config/tuning';
import { crescentPoints, type Point } from '../core/geometry';

/** Draw order for effects, above characters. */
const FX_DEPTH = 7;
const CRESCENT_STEPS = 14;
const SLASH_SPAN = 2.5;

const toVectors = (points: Point[]): Phaser.Math.Vector2[] =>
  points.map((point) => new Phaser.Math.Vector2(point.x, point.y));

/**
 * Clawd's claw swipe: a crescent that sweeps around Clawd in ~90 ms and then fades,
 * with a warm under-layer so it reads on both dark and ivory backgrounds.
 */
export function clawSlash(scene: Phaser.Scene, x: number, y: number, angle: number): void {
  const g = scene.add.graphics().setPosition(x, y).setDepth(FX_DEPTH);
  const start = angle - SLASH_SPAN / 2;
  const sweep = { p: 0 };
  const draw = (): void => {
    const end = start + SLASH_SPAN * sweep.p;
    g.clear();
    g.fillStyle(hexToNumber(COLORS.clawdLight), 0.55);
    g.fillPoints(
      toVectors(
        crescentPoints(
          start,
          end,
          HIT_FX.slashRadius + 3,
          HIT_FX.slashThickness + 4,
          CRESCENT_STEPS,
        ),
      ),
      true,
    );
    g.fillStyle(hexToNumber(COLORS.ivory), 0.95);
    g.fillPoints(
      toVectors(
        crescentPoints(start, end, HIT_FX.slashRadius, HIT_FX.slashThickness, CRESCENT_STEPS),
      ),
      true,
    );
  };
  scene.tweens.add({
    targets: sweep,
    p: 1,
    duration: HIT_FX.slashSweepMs,
    ease: 'Cubic.easeOut',
    onUpdate: draw,
    onComplete: () => {
      scene.tweens.add({
        targets: g,
        alpha: 0,
        scale: 1.12,
        duration: HIT_FX.slashFadeMs,
        onComplete: () => g.destroy(),
      });
    },
  });
}

/** Contact flash where a blow lands: radiating rays and an expanding ring. */
export function impactStar(scene: Phaser.Scene, x: number, y: number): void {
  const RAYS = 7;
  const g = scene.add
    .graphics()
    .setPosition(x, y)
    .setDepth(FX_DEPTH + 1);
  const rotation = Phaser.Math.FloatBetween(0, Math.PI);
  const anim = { p: 0 };
  scene.tweens.add({
    targets: anim,
    p: 1,
    duration: HIT_FX.impactMs,
    ease: 'Quad.easeOut',
    onUpdate: () => {
      const p = anim.p;
      g.clear();
      g.lineStyle(2 * (1 - p) + 0.5, hexToNumber(COLORS.ivory), 1 - p);
      for (let i = 0; i < RAYS; i++) {
        const a = rotation + (i / RAYS) * Math.PI * 2;
        const long = i % 2 === 0 ? 16 : 10;
        g.lineBetween(
          Math.cos(a) * (3 + p * 6),
          Math.sin(a) * (3 + p * 6),
          Math.cos(a) * (6 + p * long),
          Math.sin(a) * (6 + p * long),
        );
      }
      g.lineStyle(1.5, hexToNumber(COLORS.clawdLight), 1 - p);
      g.strokeCircle(0, 0, 3 + p * 12);
    },
    onComplete: () => g.destroy(),
  });
}

/** Radial burst of square particles. */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: string,
  count: number,
  distance = 22,
): void {
  for (let i = 0; i < count; i++) {
    const dot = scene.add.rectangle(x, y, 2, 2, hexToNumber(color)).setDepth(FX_DEPTH);
    const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
    const reach = distance * Phaser.Math.FloatBetween(0.6, 1.1);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(angle) * reach,
      y: y + Math.sin(angle) * reach,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => dot.destroy(),
    });
  }
}

/** Small puffs of dust at a character's feet. */
export function dust(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count: number,
  color: string,
): void {
  for (let i = 0; i < count; i++) {
    const puff = scene.add
      .rectangle(x, y - 1, 2, 2, hexToNumber(color), 0.8)
      .setDepth(FX_DEPTH - 1);
    scene.tweens.add({
      targets: puff,
      x: x + (i - count / 2) * 4,
      y: y - 4 - (i % 3) * 2,
      alpha: 0,
      duration: 320,
      onComplete: () => puff.destroy(),
    });
  }
}

const CONFETTI_COLORS = [COLORS.clawdBody, COLORS.ivory, COLORS.sky, COLORS.olive, COLORS.peach];

/** Celebration confetti, like the official Clawd's hop. */
export function confetti(scene: Phaser.Scene, x: number, y: number): void {
  const PIECES = 12;
  for (let i = 0; i < PIECES; i++) {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? COLORS.ivory;
    const piece = scene.add.rectangle(x, y, 2, 3, hexToNumber(color)).setDepth(FX_DEPTH);
    const dx = Phaser.Math.Between(-28, 28);
    const peak = y - Phaser.Math.Between(16, 34);
    scene.tweens.chain({
      targets: piece,
      tweens: [
        { x: x + dx * 0.6, y: peak, angle: 180, duration: 260, ease: 'Quad.easeOut' },
        { x: x + dx, y: y + 10, angle: 360, alpha: 0, duration: 520, ease: 'Quad.easeIn' },
      ],
      onComplete: () => piece.destroy(),
    });
  }
}

/** Brief white silhouette flash, the classic "you hit it" read. */
export function flashWhite(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
): void {
  const FLASH_MS = 80;
  target.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  scene.time.delayedCall(FLASH_MS, () => target.clearTint());
}
