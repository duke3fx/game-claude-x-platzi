import Phaser from 'phaser';
import { TILE } from '../config/display';
import { COLORS } from '../config/palette';
import { BOSS } from '../config/tuning';
import { ARENA_FLOOR_ROW, type ArenaDef, type BossId } from '../content/world';
import { approach } from '../core/approach';
import { BossBrain, isPhase2 } from '../core/bossBrain';
import { BOSS_MOVES, type MoveContext } from './bossMoves';
import { burst, flashWhite } from './effects';
import type { HazardField } from './hazards';

/** Arena limits in world pixels. */
export interface ArenaBounds {
  readonly left: number;
  readonly right: number;
  readonly floorY: number;
  readonly ceilingY: number;
}

export function arenaBounds(def: ArenaDef): ArenaBounds {
  return {
    left: def.left * TILE,
    right: (def.right + 1) * TILE,
    floorY: ARENA_FLOOR_ROW * TILE,
    ceilingY: TILE,
  };
}

export type DamageResult = 'hit' | 'phase2' | 'defeated';

interface Point {
  readonly x: number;
  readonly y: number;
}

const FRAME = { idleA: 0, idleB: 1, attack: 2 } as const;
const IDLE_FRAME_MS = 380;
const BOSS_DEPTH = 3;
const PHASE2_SCALE = 1.08;
/** Nébula floats; the other two stand on the floor. */
const FLYING: Readonly<Record<BossId, boolean>> = { luna: false, brasa: false, nebula: true };
const MAX_HP: Readonly<Record<BossId, number>> = {
  luna: BOSS.luna.hp,
  brasa: BOSS.brasa.hp,
  nebula: BOSS.nebula.hp,
};

/**
 * One rival AI in its arena: idles (drifts toward the player), then runs its moves.
 * Its body is harmless; only the hazards it creates hurt.
 */
export class BossFight {
  readonly id: BossId;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly maxHp: number;
  readonly arena: ArenaBounds;
  hp: number;
  /** While set, a vortex drags the player toward this point. */
  pull: { x: number; y: number; speed: number } | null = null;
  /** While true, a move positions the boss itself and idle drifting pauses. */
  anchored = false;
  /** Overrides facing the player (e.g. during a charge). */
  faceLock: number | null = null;
  baseScale = 1;

  private readonly scene: Phaser.Scene;
  private readonly field: HazardField;
  private readonly player: () => Point;
  private readonly brain: BossBrain<string>;
  private readonly flying: boolean;
  private busyMs: number = BOSS.introMs;
  private animMs = 0;
  private posing = false;
  private over = false;
  private timers: Phaser.Time.TimerEvent[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, def: ArenaDef, field: HazardField, player: () => Point) {
    this.scene = scene;
    this.id = def.boss;
    this.field = field;
    this.player = player;
    this.arena = arenaBounds(def);
    this.maxHp = MAX_HP[def.boss];
    this.hp = this.maxHp;
    this.flying = FLYING[def.boss];
    const moves = BOSS_MOVES[def.boss];
    this.brain = new BossBrain(moves.phase1, moves.phase2);
    const x = def.spawnCol * TILE + TILE / 2;
    this.sprite = scene.add
      .sprite(x, this.flying ? this.hoverY(0) : this.arena.floorY, def.boss, FRAME.idleA)
      .setOrigin(0.5, this.flying ? 0.5 : 1)
      .setDepth(BOSS_DEPTH)
      .setAlpha(0);
    this.tween({ targets: this.sprite, alpha: 1, duration: BOSS.introMs * 0.6 });
    burst(scene, x, this.centerY, COLORS.ivory, 16, 30);
  }

  get phase2(): boolean {
    return isPhase2(this.hp, this.maxHp, BOSS.phase2At);
  }

  get defeated(): boolean {
    return this.over;
  }

  /** Vertical center of the body, whatever the sprite's origin. */
  get centerY(): number {
    return this.flying ? this.sprite.y : this.sprite.y - this.sprite.displayHeight / 2;
  }

  get halfWidth(): number {
    return this.sprite.displayWidth / 2;
  }

  /** Keeps an x position inside the arena with the whole body visible. */
  clampX(x: number): number {
    const margin = this.halfWidth + 4;
    return Phaser.Math.Clamp(x, this.arena.left + margin, this.arena.right - margin);
  }

  update(dt: number): void {
    if (this.over) return;
    this.animMs += dt;
    if (!this.anchored) this.drift(dt);
    const facing = this.faceLock ?? (this.player().x < this.sprite.x ? -1 : 1);
    this.sprite.setFlipX(facing < 0);
    const idleFrame = Math.floor(this.animMs / IDLE_FRAME_MS) % 2 === 0 ? FRAME.idleA : FRAME.idleB;
    this.sprite.setFrame(this.posing ? FRAME.attack : idleFrame);

    this.busyMs -= dt;
    if (this.busyMs > 0) return;
    const move = this.brain.next(this.phase2, Math.random);
    const run = BOSS_MOVES[this.id].moves[move];
    const duration = run ? run(this.context()) : 0;
    this.busyMs = duration + (this.phase2 ? BOSS.restMsPhase2 : BOSS.restMs);
  }

  damage(amount: number): DamageResult {
    if (this.over) return 'hit';
    const wasPhase2 = this.phase2;
    this.hp = Math.max(0, this.hp - amount);
    flashWhite(this.scene, this.sprite);
    burst(this.scene, this.sprite.x, this.centerY, COLORS.ink, 8);
    if (this.hp <= 0) return 'defeated';
    if (!wasPhase2 && this.phase2) {
      this.baseScale = PHASE2_SCALE;
      this.sprite.setScale(PHASE2_SCALE);
      return 'phase2';
    }
    return 'hit';
  }

  /** Plays the "resolved" animation; the caller clears hazards and opens the gates. */
  defeat(): void {
    this.stopActivity();
    this.over = true;
    this.sprite.setFrame(FRAME.attack);
    const { x } = this.sprite;
    const y = this.centerY;
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 260, () => burst(this.scene, x, y, COLORS.ivory, 12, 34));
    }
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: this.baseScale * 1.35,
      angle: 12,
      duration: BOSS.defeatMs,
      ease: 'Quad.easeIn',
      onComplete: () => this.sprite.destroy(),
    });
  }

  destroy(): void {
    this.stopActivity();
    this.over = true;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }

  setPose(attacking: boolean): void {
    this.posing = attacking;
  }

  /** Runs fn after ms unless the fight ended first. */
  after(ms: number, fn: () => void): void {
    const timer = this.scene.time.delayedCall(ms, () => {
      if (!this.over) fn();
    });
    this.timers = this.timers.filter((t) => t.getProgress() < 1);
    this.timers.push(timer);
  }

  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const tween = this.scene.tweens.add(config);
    this.tweens.push(tween);
    return tween;
  }

  private context(): MoveContext {
    return {
      scene: this.scene,
      fight: this,
      field: this.field,
      arena: this.arena,
      player: this.player,
      phase2: this.phase2,
    };
  }

  private drift(dt: number): void {
    const seconds = dt / 1000;
    const player = this.player();
    if (this.flying) {
      const speed = BOSS.nebula.followSpeed;
      const target = this.clampX(player.x);
      this.sprite.x = approach(this.sprite.x, target, speed * seconds);
      this.sprite.y = this.hoverY(this.animMs);
      return;
    }
    const tune = this.id === 'luna' ? BOSS.luna : BOSS.brasa;
    const speed =
      this.id === 'brasa' && this.phase2 ? BOSS.brasa.paceSpeedPhase2 : this.paceSpeed();
    // Keep a little distance on whichever side the boss already is.
    const side = this.sprite.x < player.x ? -1 : 1;
    const target = this.clampX(player.x + side * tune.keepAway);
    this.sprite.x = approach(this.sprite.x, target, speed * seconds);
    this.sprite.y = this.arena.floorY;
  }

  private paceSpeed(): number {
    return this.id === 'luna' ? BOSS.luna.driftSpeed : BOSS.brasa.paceSpeed;
  }

  private hoverY(ms: number): number {
    return this.arena.floorY - BOSS.nebula.hoverHeight + Math.sin(ms / 700) * 10;
  }

  private stopActivity(): void {
    for (const timer of this.timers) timer.remove();
    for (const tween of this.tweens) tween.stop();
    this.timers = [];
    this.tweens = [];
    this.pull = null;
    this.anchored = false;
    this.posing = false;
  }
}
