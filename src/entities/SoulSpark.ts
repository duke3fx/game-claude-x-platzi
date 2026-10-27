import Phaser from 'phaser';
import { CANVAS_SCALE } from '../config/display';
import { COLORS, hexToNumber } from '../config/palette';
import { SPELL } from '../config/tuning';
import { burst } from '../systems/effects';

const DEPTH = 6;
const HALF_SIZE = 7;
const TRAIL_MS = 24;
const SPIN_DEG_PER_MS = 0.9;

/**
 * "Chispa ✻": a projectile made of Clawd's own Contexto, shaped like the Claude Code spinner
 * glyph. It flies straight, pierces enemies (each once) and bursts against walls.
 */
export class SoulSpark {
  private readonly scene: Phaser.Scene;
  private readonly glyph: Phaser.GameObjects.Text;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly dir: number;
  private readonly hitTargets = new Set<unknown>();
  private lifeMs: number = SPELL.lifetimeMs;
  private trailMs = 0;
  private alive = true;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: number) {
    this.scene = scene;
    this.dir = dir;
    this.glow = scene.add
      .image(x, y, 'halo')
      .setTint(hexToNumber(COLORS.clawdLight))
      .setScale(0.9)
      .setAlpha(0.8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH);
    this.glyph = scene.add
      .text(x, y, '✻', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: COLORS.ivory,
        stroke: COLORS.clawdBody,
        strokeThickness: 3,
        resolution: CANVAS_SCALE,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 1);
  }

  get x(): number {
    return this.glyph.x;
  }

  get y(): number {
    return this.glyph.y;
  }

  get bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - HALF_SIZE,
      this.y - HALF_SIZE,
      HALF_SIZE * 2,
      HALF_SIZE * 2,
    );
  }

  /** Returns true only the first time `target` is struck by this spark. */
  registerHit(target: unknown): boolean {
    if (this.hitTargets.has(target)) return false;
    this.hitTargets.add(target);
    return true;
  }

  /** Advances the spark; returns false once it has expired (and cleaned itself up). */
  update(dtMs: number, isSolid: (x: number, y: number) => boolean): boolean {
    if (!this.alive) return false;
    const dx = this.dir * SPELL.speed * (dtMs / 1000);
    this.glyph.x += dx;
    this.glyph.angle += SPIN_DEG_PER_MS * dtMs * this.dir;
    this.glow.setPosition(this.glyph.x, this.glyph.y);
    this.lifeMs -= dtMs;

    this.trailMs -= dtMs;
    if (this.trailMs <= 0) {
      this.trailMs = TRAIL_MS;
      const ember = this.scene.add
        .rectangle(
          this.x - this.dir * 6,
          this.y + Phaser.Math.Between(-3, 3),
          2,
          2,
          hexToNumber(COLORS.clawdLight),
        )
        .setDepth(DEPTH - 1);
      this.scene.tweens.add({
        targets: ember,
        alpha: 0,
        y: ember.y - 4,
        duration: 260,
        onComplete: () => ember.destroy(),
      });
    }

    if (this.lifeMs <= 0 || isSolid(this.x + this.dir * HALF_SIZE, this.y)) this.destroy();
    return this.alive;
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    burst(this.scene, this.x, this.y, COLORS.clawdLight, 10, 16);
    this.glyph.destroy();
    this.glow.destroy();
  }
}
