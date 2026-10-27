import Phaser from 'phaser';
import { COLORS } from '../config/palette';
import { BOSS } from '../config/tuning';
import type { BossId } from '../content/world';
import type { ArenaBounds, BossFight } from './bossFight';
import { burst, dust } from './effects';
import type { HazardField } from './hazards';

export interface MoveContext {
  readonly scene: Phaser.Scene;
  readonly fight: BossFight;
  readonly field: HazardField;
  readonly arena: ArenaBounds;
  readonly player: () => { x: number; y: number };
  readonly phase2: boolean;
}

/** Starts a move and returns how long it keeps the boss busy (ms). */
type Move = (ctx: MoveContext) => number;

interface MoveSet {
  readonly phase1: readonly string[];
  readonly phase2: readonly string[];
  readonly moves: Readonly<Record<string, Move>>;
}

const TAU = Math.PI * 2;
const ROCK_COLOR = '#C9C2A8';
const FIRE_COLOR = '#FF7A1A';
const STAR_COLOR = '#CDB8FF';

// ------------------------------------------------------------------ Luna: gravity and space

/** Low-gravity hop onto the player; the landing sends shockwaves along the floor. */
const moonHop: Move = (ctx) => {
  const { fight, arena, scene, field, phase2 } = ctx;
  const tune = BOSS.luna;
  const sprite = fight.sprite;
  const flightMs = phase2 ? tune.hopMsPhase2 : tune.hopMs;
  const hops = phase2 ? 2 : 1;
  const gapMs = 260;
  fight.anchored = true;
  fight.setPose(true);
  fight.tween({
    targets: sprite,
    scaleX: fight.baseScale * 1.12,
    scaleY: fight.baseScale * 0.82,
    duration: tune.hopWindupMs / 2,
    yoyo: true,
  });

  const land = (): void => {
    sprite.y = arena.floorY;
    scene.cameras.main.shake(120, 0.004);
    dust(scene, sprite.x, arena.floorY, 12, COLORS.cloudLight);
    const speed = phase2 ? tune.shockwaveSpeedPhase2 : tune.shockwaveSpeed;
    for (const dir of [-1, 1]) {
      field.spawn({
        texture: 'shockwave',
        x: sprite.x + dir * 12,
        y: arena.floorY - 5,
        vx: dir * speed,
        width: 16,
        height: 10,
        lifeMs: 2400,
        breaksOnSolid: true,
        scale: 1.2,
      });
    }
  };
  const hop = (remaining: number): void => {
    const fromX = sprite.x;
    const toX = fight.clampX(ctx.player().x);
    const arc = { p: 0 };
    fight.tween({
      targets: arc,
      p: 1,
      duration: flightMs,
      onUpdate: () => {
        sprite.x = fromX + (toX - fromX) * arc.p;
        sprite.y = arena.floorY - Math.sin(Math.PI * arc.p) * tune.hopHeight;
      },
      onComplete: () => {
        land();
        if (remaining > 1) fight.after(gapMs, () => hop(remaining - 1));
        else {
          fight.anchored = false;
          fight.setPose(false);
        }
      },
    });
  };
  fight.after(tune.hopWindupMs, () => hop(hops));
  return tune.hopWindupMs + hops * flightMs + (hops - 1) * gapMs + 300;
};

/** Marked columns, then moon rocks fall there. The ledges shelter from them. */
const meteorShower: Move = (ctx) => {
  const { fight, arena, field, scene, phase2 } = ctx;
  const tune = BOSS.luna;
  const count = phase2 ? tune.meteorsPhase2 : tune.meteors;
  const columns = spreadColumns(ctx, count, 26);
  fight.setPose(true);
  columns.forEach((x, i) => {
    const delay = i * tune.meteorStaggerMs;
    fight.after(delay, () =>
      field.warnColumn(x, arena.ceilingY, arena.floorY, 12, tune.meteorWarnMs),
    );
    fight.after(delay + tune.meteorWarnMs, () => {
      field.spawn({
        texture: 'moonRock',
        x,
        y: arena.ceilingY + 8,
        vy: 80,
        gravity: 700,
        spin: 200,
        width: 10,
        height: 10,
        lifeMs: 2500,
        breaksOnSolid: true,
        scale: 1.4,
        onEnd: (rock) => burst(scene, rock.x, rock.y - 4, ROCK_COLOR, 6, 14),
      });
    });
  });
  fight.after(500, () => fight.setPose(false));
  return (count - 1) * tune.meteorStaggerMs + tune.meteorWarnMs + 800;
};

/** A crescent boomerang: it flies out at the player and comes back. Phase 2 adds a high one. */
const crescentBoomerang: Move = (ctx) => {
  const { fight, arena, field, phase2 } = ctx;
  const tune = BOSS.luna;
  const sprite = fight.sprite;
  const dir = ctx.player().x < sprite.x ? -1 : 1;
  fight.setPose(true);
  const throwAt = (y: number): void => {
    field.spawn({
      texture: 'crescent',
      x: sprite.x + dir * 14,
      y,
      vx: dir * tune.crescentSpeed,
      spin: dir * 720,
      width: 14,
      height: 12,
      lifeMs: 2400,
      scale: 1.4,
      behave: (blade, dt) => {
        blade.vx -= dir * tune.crescentPull * (dt / 1000);
        const returning = Math.sign(blade.vx) === -dir;
        if (returning && Math.abs(blade.x - sprite.x) < 10) field.end(blade);
      },
    });
  };
  throwAt(arena.floorY - 12);
  if (phase2) fight.after(320, () => throwAt(arena.floorY - 42));
  fight.after(450, () => fight.setPose(false));
  return 1900;
};

// ------------------------------------------------------------------ Brasa: fire and speed

/** Wind-up, then a charge to the wall that sets the floor behind it on fire. */
const flameCharge: Move = (ctx) => {
  const { fight, arena, field, scene, phase2 } = ctx;
  const tune = BOSS.brasa;
  const sprite = fight.sprite;
  const dir = ctx.player().x < sprite.x ? -1 : 1;
  const targetX = fight.clampX(dir < 0 ? arena.left : arena.right);
  const chargeMs = phase2 ? tune.chargeMsPhase2 : tune.chargeMs;
  const trailLifeMs = phase2 ? tune.trailLifeMsPhase2 : tune.trailLifeMs;
  fight.anchored = true;
  fight.faceLock = dir;
  fight.setPose(true);
  field.warnColumn(
    (sprite.x + targetX) / 2,
    arena.floorY - 8,
    arena.floorY,
    Math.abs(targetX - sprite.x),
    tune.chargeWarnMs,
  );
  fight.tween({
    targets: sprite,
    x: sprite.x - dir * 2,
    duration: 50,
    yoyo: true,
    repeat: Math.max(0, Math.floor(tune.chargeWarnMs / 100) - 1),
  });
  fight.after(tune.chargeWarnMs, () => {
    let lastTrail = sprite.x;
    fight.tween({
      targets: sprite,
      x: targetX,
      duration: chargeMs,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        while (Math.abs(sprite.x - lastTrail) >= tune.trailSpacing) {
          lastTrail += dir * tune.trailSpacing;
          field.spawn({
            texture: 'fireball',
            x: lastTrail,
            y: arena.floorY - 6,
            width: 14,
            height: 10,
            lifeMs: trailLifeMs,
            armMs: 150,
            frames: 2,
            frameMs: 110,
            depth: 6,
          });
        }
      },
      onComplete: () => {
        scene.cameras.main.shake(100, 0.003);
        burst(scene, sprite.x + dir * 10, arena.floorY - 10, FIRE_COLOR, 10, 20);
        fight.anchored = false;
        fight.faceLock = null;
        fight.setPose(false);
      },
    });
  });
  return tune.chargeWarnMs + chargeMs + 450;
};

/** Lobbed fireballs aimed around the player. */
const fireVolley: Move = (ctx) => {
  const { fight, arena, field, scene, phase2 } = ctx;
  const tune = BOSS.brasa;
  const sprite = fight.sprite;
  const count = phase2 ? tune.volleyPhase2 : tune.volley;
  const staggerMs = 150;
  const gravity = 520;
  const flight = tune.volleyFlightMs / 1000;
  fight.setPose(true);
  for (let i = 0; i < count; i++) {
    fight.after(i * staggerMs, () => {
      const spread = (i - (count - 1) / 2) * 22;
      const targetX = fight.clampX(ctx.player().x + spread);
      const fromX = sprite.x;
      const fromY = fight.centerY - 12;
      field.spawn({
        texture: 'fireball',
        x: fromX,
        y: fromY,
        vx: (targetX - fromX) / flight,
        vy: (arena.floorY - 6 - fromY - 0.5 * gravity * flight * flight) / flight,
        gravity,
        width: 10,
        height: 10,
        lifeMs: 2600,
        breaksOnSolid: true,
        frames: 2,
        scale: 1.2,
        onEnd: (ball) => burst(scene, ball.x, ball.y - 4, FIRE_COLOR, 8, 16),
      });
    });
  }
  fight.after(count * staggerMs + 200, () => fight.setPose(false));
  return count * staggerMs + tune.volleyFlightMs + 300;
};

/** Flame pillars erupt one after another, from Brasa toward the player. */
const flamePillars: Move = (ctx) => {
  const { fight, arena, field, phase2 } = ctx;
  const tune = BOSS.brasa;
  const sprite = fight.sprite;
  const count = phase2 ? tune.pillarsPhase2 : tune.pillars;
  const dir = ctx.player().x < sprite.x ? -1 : 1;
  fight.setPose(true);
  for (let i = 0; i < count; i++) {
    const x = sprite.x + dir * (26 + i * tune.pillarSpacing);
    if (x < arena.left + 6 || x > arena.right - 6) break;
    const delay = i * tune.pillarStaggerMs;
    fight.after(delay, () =>
      field.warnColumn(x, arena.floorY - 10, arena.floorY, 16, tune.pillarWarnMs),
    );
    fight.after(delay + tune.pillarWarnMs, () => {
      const pillar = field.spawn({
        texture: 'flamePillar',
        x,
        y: arena.floorY,
        originY: 1,
        width: 12,
        height: 60,
        lifeMs: tune.pillarLifeMs,
        frames: 2,
        frameMs: 90,
      });
      fight.tween({ targets: pillar.sprite, scaleY: { from: 0.2, to: 1 }, duration: 90 });
    });
  }
  fight.after(600, () => fight.setPose(false));
  return (count - 1) * tune.pillarStaggerMs + tune.pillarWarnMs + tune.pillarLifeMs + 300;
};

// ------------------------------------------------------------------ Nébula: stars and void

/** Stars orbit Nébula while she drifts closer, then fly outward. */
const starOrbit: Move = (ctx) => {
  const { fight, field, phase2 } = ctx;
  const tune = BOSS.nebula;
  const count = phase2 ? tune.orbitStarsPhase2 : tune.orbitStars;
  fight.setPose(true);
  for (let i = 0; i < count; i++) {
    field.spawn({
      texture: 'star',
      x: fight.sprite.x,
      y: fight.centerY,
      width: 8,
      height: 8,
      lifeMs: tune.orbitMs + 2800,
      armMs: 300,
      breaksOnSolid: true,
      frames: 2,
      frameMs: 140,
      scale: 1.3,
      behave: (star) => {
        const cx = fight.sprite.x;
        const cy = fight.centerY;
        if (star.ageMs < tune.orbitMs) {
          const angle = (i / count) * TAU + (star.ageMs / 1000) * 2.4;
          const radius = Math.min(tune.orbitRadius, star.ageMs / 8);
          star.sprite.setPosition(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        } else if (!star.memory.launched) {
          star.memory.launched = 1;
          const dx = star.x - cx;
          const dy = star.y - cy;
          const length = Math.hypot(dx, dy) || 1;
          star.vx = (dx / length) * tune.starSpeed;
          star.vy = (dy / length) * tune.starSpeed;
        }
      },
    });
  }
  fight.after(tune.orbitMs, () => fight.setPose(false));
  return tune.orbitMs + 900;
};

/** Vanishes, reappears above the player and bursts into a ring of stars. */
const warpBurst: Move = (ctx) => {
  const { fight, arena, field, scene, phase2 } = ctx;
  const tune = BOSS.nebula;
  const sprite = fight.sprite;
  const toX = fight.clampX(ctx.player().x);
  const toY = arena.floorY - tune.hoverHeight - 10;
  fight.anchored = true;
  fight.setPose(true);
  field.warnCircle(toX, toY, 18, tune.warpWarnMs);
  fight.tween({
    targets: sprite,
    alpha: 0,
    scale: fight.baseScale * 0.5,
    duration: 240,
    onComplete: () => sprite.setPosition(toX, toY),
  });
  fight.after(tune.warpWarnMs, () => {
    fight.tween({ targets: sprite, alpha: 1, scale: fight.baseScale, duration: 160 });
    burst(scene, toX, toY, STAR_COLOR, 14, 30);
    const count = phase2 ? tune.burstStarsPhase2 : tune.burstStars;
    const offset = Math.random() * TAU;
    for (let i = 0; i < count; i++) {
      const angle = offset + (i / count) * TAU;
      const speed = tune.starSpeed * 0.8;
      field.spawn({
        texture: 'star',
        x: toX,
        y: toY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        width: 8,
        height: 8,
        lifeMs: 3000,
        breaksOnSolid: true,
        frames: 2,
        frameMs: 140,
        scale: 1.3,
      });
    }
    fight.after(450, () => {
      fight.anchored = false;
      fight.setPose(false);
    });
  });
  return tune.warpWarnMs + 1000;
};

/** Phase 2: a black hole in the middle of the arena drags Clawd in while stars spiral to it. */
const blackHole: Move = (ctx) => {
  const { fight, arena, field } = ctx;
  const tune = BOSS.nebula;
  const cx = (arena.left + arena.right) / 2;
  const cy = arena.floorY - 56;
  const warnMs = 500;
  fight.setPose(true);
  field.warnCircle(cx, cy, 16, warnMs);
  fight.after(warnMs, () => {
    field.spawn({
      texture: 'blackHole',
      x: cx,
      y: cy,
      width: 14,
      height: 14,
      lifeMs: tune.blackHoleMs,
      armMs: 200,
      frames: 2,
      frameMs: 100,
      spin: 90,
      scale: 1.6,
    });
    fight.pull = { x: cx, y: cy, speed: tune.pullSpeed };
    for (let i = 0; i < 6; i++) {
      fight.after(i * 380, () => {
        const fromLeft = i % 2 === 0;
        field.spawn({
          texture: 'star',
          x: fromLeft ? arena.left + 8 : arena.right - 8,
          y: arena.ceilingY + 40 + ((i * 37) % 120),
          width: 8,
          height: 8,
          lifeMs: 4000,
          frames: 2,
          frameMs: 140,
          scale: 1.3,
          behave: (star) => {
            const dx = cx - star.x;
            const dy = cy - star.y;
            const length = Math.hypot(dx, dy);
            if (length < 6) {
              field.end(star);
              return;
            }
            star.vx = (dx / length) * 90 - (dy / length) * 40;
            star.vy = (dy / length) * 90 + (dx / length) * 40;
          },
        });
      });
    }
    fight.after(tune.blackHoleMs, () => {
      fight.pull = null;
      fight.setPose(false);
    });
  });
  return warnMs + tune.blackHoleMs + 400;
};

/** Up to `count` x positions across the arena, the first one under the player. */
function spreadColumns(ctx: MoveContext, count: number, minGap: number): number[] {
  const { arena, fight } = ctx;
  const columns = [fight.clampX(ctx.player().x)];
  for (let attempt = 0; columns.length < count && attempt < count * 12; attempt++) {
    const x = Phaser.Math.Between(arena.left + 12, arena.right - 12);
    if (columns.every((other) => Math.abs(other - x) >= minGap)) columns.push(x);
  }
  return columns;
}

export const BOSS_MOVES: Readonly<Record<BossId, MoveSet>> = {
  luna: {
    phase1: ['hop', 'meteors', 'crescent'],
    phase2: ['hop', 'meteors', 'crescent'],
    moves: { hop: moonHop, meteors: meteorShower, crescent: crescentBoomerang },
  },
  brasa: {
    phase1: ['charge', 'volley'],
    phase2: ['charge', 'volley', 'pillars'],
    moves: { charge: flameCharge, volley: fireVolley, pillars: flamePillars },
  },
  nebula: {
    phase1: ['orbit', 'warp'],
    phase2: ['orbit', 'warp', 'blackHole'],
    moves: { orbit: starOrbit, warp: warpBurst, blackHole },
  },
};
