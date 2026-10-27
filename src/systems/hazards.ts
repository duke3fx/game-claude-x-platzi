import Phaser from 'phaser';
import { COLORS, hexToNumber } from '../config/palette';

/** Everything a boss attack leaves in the world: projectiles, waves, pillars, vortices. */
export interface HazardSpec {
  readonly texture: string;
  readonly x: number;
  readonly y: number;
  readonly vx?: number;
  readonly vy?: number;
  /** Downward acceleration in px/s². */
  readonly gravity?: number;
  /** Rotation speed in degrees per second. */
  readonly spin?: number;
  /** Hitbox size, centered on the sprite. */
  readonly width: number;
  readonly height: number;
  readonly lifeMs: number;
  /** Harmless warm-up time (the sprite fades in) before it can hurt. */
  readonly armMs?: number;
  /** Destroyed when its center enters a solid tile. */
  readonly breaksOnSolid?: boolean;
  readonly scale?: number;
  readonly originY?: number;
  /** Frames to loop through (the texture's numbered frames). */
  readonly frames?: number;
  readonly frameMs?: number;
  readonly depth?: number;
  /** Custom per-frame motion; runs before velocity is applied. */
  readonly behave?: (hazard: Hazard, dt: number) => void;
  /** Called once when the hazard breaks or expires. */
  readonly onEnd?: (hazard: Hazard) => void;
}

export class Hazard {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly spec: HazardSpec;
  vx: number;
  vy: number;
  ageMs = 0;
  done = false;
  /** Free slot for behaviours (orbit angle, launch flag...). */
  memory: Record<string, number> = {};

  constructor(sprite: Phaser.GameObjects.Sprite, spec: HazardSpec) {
    this.sprite = sprite;
    this.spec = spec;
    this.vx = spec.vx ?? 0;
    this.vy = spec.vy ?? 0;
  }

  get armed(): boolean {
    return this.ageMs >= (this.spec.armMs ?? 0);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  bounds(out: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
    const { width, height } = this.spec;
    const originY = this.spec.originY ?? 0.5;
    // Bottom-anchored sprites (pillars) keep their hitbox above the anchor.
    const centerY = this.sprite.y - (originY - 0.5) * height;
    return out.setTo(this.sprite.x - width / 2, centerY - height / 2, width, height);
  }
}

const WARN_DEPTH = 6;
const HAZARD_DEPTH = 7;

/** Owns every live hazard and warning marker, so a fight can be cleared in one call. */
export class HazardField {
  private readonly scene: Phaser.Scene;
  private readonly isSolid: (x: number, y: number) => boolean;
  private hazards: Hazard[] = [];
  private warnings: Phaser.GameObjects.GameObject[] = [];
  private readonly scratch = new Phaser.Geom.Rectangle();

  constructor(scene: Phaser.Scene, isSolid: (x: number, y: number) => boolean) {
    this.scene = scene;
    this.isSolid = isSolid;
  }

  spawn(spec: HazardSpec): Hazard {
    const sprite = this.scene.add
      .sprite(spec.x, spec.y, spec.texture, 0)
      .setOrigin(0.5, spec.originY ?? 0.5)
      .setScale(spec.scale ?? 1)
      .setDepth(spec.depth ?? HAZARD_DEPTH);
    if (spec.armMs) {
      sprite.setAlpha(0.35);
      this.scene.tweens.add({ targets: sprite, alpha: 1, duration: spec.armMs });
    }
    const hazard = new Hazard(sprite, spec);
    this.hazards.push(hazard);
    return hazard;
  }

  /** A pulsing magenta marker that never hurts: "something lands here soon". */
  warnColumn(x: number, top: number, bottom: number, width: number, ms: number): void {
    const marker = this.scene.add
      .rectangle(x, (top + bottom) / 2, width, bottom - top, hexToNumber(COLORS.danger), 0.16)
      .setDepth(WARN_DEPTH);
    marker.setStrokeStyle(1, hexToNumber(COLORS.danger), 0.8);
    this.trackWarning(marker, ms);
  }

  warnCircle(x: number, y: number, radius: number, ms: number): void {
    const marker = this.scene.add
      .circle(x, y, radius, hexToNumber(COLORS.danger), 0.18)
      .setDepth(WARN_DEPTH);
    marker.setStrokeStyle(1, hexToNumber(COLORS.danger), 0.9);
    this.trackWarning(marker, ms);
  }

  update(dt: number): void {
    const seconds = dt / 1000;
    for (const hazard of this.hazards) {
      if (hazard.done) continue;
      const { spec, sprite } = hazard;
      hazard.ageMs += dt;
      spec.behave?.(hazard, dt);
      if (hazard.done) continue;
      hazard.vy += (spec.gravity ?? 0) * seconds;
      sprite.x += hazard.vx * seconds;
      sprite.y += hazard.vy * seconds;
      if (spec.spin) sprite.angle += spec.spin * seconds;
      if (spec.frames && spec.frames > 1) {
        sprite.setFrame(Math.floor(hazard.ageMs / (spec.frameMs ?? 120)) % spec.frames);
      }
      const expired = hazard.ageMs >= spec.lifeMs;
      const broke = spec.breaksOnSolid === true && this.isSolid(sprite.x, sprite.y);
      if (expired || broke) this.end(hazard);
    }
    this.hazards = this.hazards.filter((hazard) => !hazard.done);
  }

  /** The first armed hazard overlapping the rectangle, if any. */
  hit(rect: Phaser.Geom.Rectangle): Hazard | null {
    for (const hazard of this.hazards) {
      if (hazard.done || !hazard.armed) continue;
      if (Phaser.Geom.Rectangle.Overlaps(rect, hazard.bounds(this.scratch))) return hazard;
    }
    return null;
  }

  end(hazard: Hazard): void {
    if (hazard.done) return;
    hazard.done = true;
    hazard.spec.onEnd?.(hazard);
    this.scene.tweens.killTweensOf(hazard.sprite);
    hazard.sprite.destroy();
  }

  clear(): void {
    for (const hazard of this.hazards) {
      hazard.done = true;
      this.scene.tweens.killTweensOf(hazard.sprite);
      hazard.sprite.destroy();
    }
    this.hazards = [];
    for (const warning of this.warnings) {
      this.scene.tweens.killTweensOf(warning);
      warning.destroy();
    }
    this.warnings = [];
  }

  private trackWarning(marker: Phaser.GameObjects.Shape, ms: number): void {
    this.warnings.push(marker);
    this.scene.tweens.add({
      targets: marker,
      alpha: 0.35,
      duration: 110,
      yoyo: true,
      repeat: Math.max(0, Math.floor(ms / 220) - 1),
      onComplete: () => {
        this.warnings = this.warnings.filter((warning) => warning !== marker);
        marker.destroy();
      },
    });
  }
}
