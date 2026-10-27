import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, UI_ZOOM } from '../config/display';
import { COLORS, hexToNumber, ZONE_PALETTES } from '../config/palette';
import { REST } from '../config/tuning';
import { bakeParallax } from '../gfx/backgrounds';
import { CLAWD_FRAME } from '../gfx/clawdPoses';
import { NEIGHBOR, TILESET_KEY, tileIndex } from '../gfx/tiles';

/** Title screen scenery: the 02:14 library at night, with Clawd resting on a bench on a ledge. */
const ZONE = 'library';
const W = GAME_WIDTH * UI_ZOOM;
const H = GAME_HEIGHT * UI_ZOOM;
/** World art is drawn at UI_ZOOM so its pixels match the in-game pixel size. */
const ART_SCALE = UI_ZOOM;
const TILE_SIZE = 16 * ART_SCALE;
const LEDGE_X = 640;
const LEDGE_Y = 404;
const BENCH_X = 772;
/** Background drift in px/s at scroll factor 1. */
const DRIFT_SPEED = 14;
const FADE_IN_MS = 1400;
const FADE_OUT_MS = 450;
const BLINK_EVERY_MS = 3400;
const BLINK_MS = 140;
const STEAM_EVERY_MS = 420;

export interface TitleBackdrop {
  /** Fades to black, destroys the scenery and then calls onDone. */
  fadeOut(onDone: () => void): void;
}

export function createTitleBackdrop(scene: Phaser.Scene): TitleBackdrop {
  const palette = ZONE_PALETTES[ZONE];
  const objects: Phaser.GameObjects.GameObject[] = [];
  const timers: Phaser.Time.TimerEvent[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
    objects.push(obj);
    return obj;
  };

  add(scene.add.rectangle(W / 2, H / 2, W, H, hexToNumber(palette.background)));
  for (const layer of bakeParallax(scene.textures, ZONE)) {
    const sprite = add(
      scene.add.tileSprite(W / 2, H / 2, GAME_WIDTH, GAME_HEIGHT, layer.key).setScale(ART_SCALE),
    );
    scene.tweens.add({
      targets: sprite,
      tilePositionX: GAME_WIDTH,
      duration: (GAME_WIDTH / (DRIFT_SPEED * layer.scrollFactor)) * 1000,
      repeat: -1,
    });
  }

  // Dim the library so the title and the light shafts stand out.
  add(scene.add.rectangle(W / 2, H / 2, W, H, hexToNumber(COLORS.nearBlack), 0.32));

  // Shafts of light falling from high windows.
  [
    { x: 170, width: 120, angle: 14 },
    { x: 470, width: 80, angle: 8 },
    { x: 760, width: 150, angle: 11 },
  ].forEach((shaft, i) => {
    const image = add(
      scene.add
        .image(shaft.x, -20, 'shaft')
        .setOrigin(0.5, 0)
        .setDisplaySize(shaft.width, H + 60)
        .setAngle(shaft.angle)
        .setTint(hexToNumber(palette.accent))
        .setAlpha(0.16)
        .setBlendMode(Phaser.BlendModes.ADD),
    );
    scene.tweens.add({
      targets: image,
      alpha: 0.3,
      duration: 2600 + i * 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  });

  for (let i = 0; i < 4; i++) {
    const fog = add(
      scene.add
        .image(i * 300 - 60, H - 150 + (i % 2) * 40, 'fog')
        .setDisplaySize(520, 120)
        .setTint(hexToNumber(palette.fog))
        .setAlpha(0.14),
    );
    scene.tweens.add({
      targets: fog,
      x: fog.x + 90,
      duration: 9000 + i * 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Loose pages drifting down, and motes of light rising.
  add(
    scene.add.particles(0, 0, 'page', {
      x: { min: 0, max: W },
      y: -20,
      speedY: { min: 14, max: 26 },
      speedX: { min: -12, max: 6 },
      rotate: { start: 0, end: 220 },
      scale: { min: 1.2, max: 2 },
      alpha: { start: 0.55, end: 0 },
      tint: hexToNumber(palette.fog),
      lifespan: 16000,
      frequency: 1300,
    }),
  );
  add(
    scene.add.particles(0, 0, 'dot', {
      x: { min: 0, max: W },
      y: H + 10,
      speedY: { min: -10, max: -26 },
      speedX: { min: -6, max: 6 },
      scale: { min: 1, max: 2.5 },
      alpha: { start: 0.8, end: 0 },
      tint: [hexToNumber(COLORS.ivory), hexToNumber(COLORS.peach), hexToNumber(palette.accent)],
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 14000,
      frequency: 160,
      advance: 12000,
    }),
  );

  // A soft glow behind where the title sits.
  add(
    scene.add
      .image(W / 2, 160, 'halo')
      .setDisplaySize(760, 300)
      .setTint(hexToNumber(palette.accent))
      .setAlpha(0.14)
      .setBlendMode(Phaser.BlendModes.ADD),
  );

  // The ledge, built from the real tileset so it matches the game.
  const columns = Math.ceil((W - LEDGE_X) / TILE_SIZE) + 1;
  const rows = Math.ceil((H - LEDGE_Y) / TILE_SIZE) + 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const mask =
        (row > 0 ? NEIGHBOR.up : 0) |
        NEIGHBOR.down |
        NEIGHBOR.right |
        (col > 0 ? NEIGHBOR.left : 0);
      add(
        scene.add
          .image(
            LEDGE_X + col * TILE_SIZE,
            LEDGE_Y + row * TILE_SIZE,
            TILESET_KEY,
            tileIndex(ZONE, mask),
          )
          .setOrigin(0, 0)
          .setScale(ART_SCALE),
      );
    }
  }

  // Clawd resting on a bench, lit by its warmth and Luz's coffee.
  add(
    scene.add
      .image(BENCH_X, LEDGE_Y - 20, 'halo')
      .setTint(hexToNumber(COLORS.peach))
      .setScale(3.2)
      .setAlpha(0.32)
      .setBlendMode(Phaser.BlendModes.ADD),
  );
  const bench = add(
    scene.add.image(BENCH_X, LEDGE_Y, 'bench', 0).setOrigin(0.5, 1).setScale(ART_SCALE),
  );
  const clawd = add(
    scene.add
      .sprite(BENCH_X - 8, LEDGE_Y - REST.seatLift * ART_SCALE, 'clawdLeft', CLAWD_FRAME.idle)
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE),
  );
  scene.tweens.add({
    targets: clawd,
    scaleY: ART_SCALE * 1.05,
    scaleX: ART_SCALE * 0.98,
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  timers.push(
    scene.time.addEvent({
      delay: BLINK_EVERY_MS,
      loop: true,
      callback: () => {
        clawd.setFrame(CLAWD_FRAME.closed);
        scene.time.delayedCall(BLINK_MS, () => clawd.setFrame(CLAWD_FRAME.idle));
      },
    }),
  );
  const mugX = bench.x + 18 * ART_SCALE;
  const mugY = bench.y - bench.displayHeight + 4 * ART_SCALE;
  timers.push(
    scene.time.addEvent({
      delay: STEAM_EVERY_MS,
      loop: true,
      callback: () => {
        const puff = scene.add.rectangle(
          mugX + Phaser.Math.Between(-2, 2),
          mugY,
          4,
          4,
          hexToNumber(COLORS.ivory),
          0.6,
        );
        scene.tweens.add({
          targets: puff,
          y: mugY - 34,
          x: puff.x + Phaser.Math.Between(-6, 6),
          alpha: 0,
          duration: 1600,
          onComplete: () => puff.destroy(),
        });
      },
    }),
  );

  // Darken the edges so the text reads, like a vignette.
  const shade = add(scene.add.graphics());
  shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
  shade.fillRect(0, 0, W, 120);
  shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.8, 0.8);
  shade.fillRect(0, H - 110, W, 110);

  const curtain = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000).setDepth(10);
  scene.tweens.add({ targets: curtain, alpha: 0, duration: FADE_IN_MS, ease: 'Sine.easeOut' });

  return {
    fadeOut(onDone) {
      scene.tweens.killTweensOf(curtain);
      scene.tweens.add({
        targets: curtain,
        alpha: 1,
        duration: FADE_OUT_MS,
        onComplete: () => {
          for (const timer of timers) timer.remove();
          for (const obj of objects) {
            scene.tweens.killTweensOf(obj);
            obj.destroy();
          }
          curtain.destroy();
          onDone();
        },
      });
    },
  };
}
