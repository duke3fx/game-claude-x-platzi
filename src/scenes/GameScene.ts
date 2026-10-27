import Phaser from 'phaser';
import { audioDirector } from '../audio/AudioDirector';
import { CANVAS_SCALE, GAME_HEIGHT, GAME_WIDTH, TILE } from '../config/display';
import { COLORS, hexToNumber, ZONE_PALETTES, type ZoneId } from '../config/palette';
import { ATTACK, CAMERA, DASH, HIT_FX, HURT, PLAYER, REST, SPELL, VITALS } from '../config/tuning';
import {
  BOSS_DOUBTS,
  BOSS_LINES,
  DANCE_NAMES,
  DESK_LINES,
  NOTE_TEXT,
  SIGN_TEXT,
  SPINNER_GLYPHS,
  THINKING_VERBS,
  TILDE_LINES,
  TILDE_POSTGAME,
  UI_TEXT,
} from '../content/script';
import { CREDITS, ENDING, INTRO } from '../content/text';
import {
  ARENA_GATE_COL,
  ARENA_TRIGGER_COL,
  BENCH_COMMIT,
  ENTITIES,
  WORLD_ROWS,
  WORLD_TERRAIN,
  type WorldEntity,
  zoneAtCol,
} from '../content/world';
import { ActionBuffer } from '../core/actionBuffer';
import { approach } from '../core/approach';
import {
  DANCE_DURATION_MS,
  DANCE_ORDER,
  type DanceBodyPose,
  type DanceId,
  danceAt,
  dancePose,
} from '../core/dance';
import { JumpAssist } from '../core/jumpAssist';
import { createDefaultSave, type SaveData, SaveStore } from '../core/save';
import { TapHold } from '../core/tapHold';
import { Vitals } from '../core/vitals';
import { SoulSpark } from '../entities/SoulSpark';
import { bakeParallax } from '../gfx/backgrounds';
import { TILE_INDEX } from '../gfx/basicArt';
import { CLAWD_FRAME } from '../gfx/clawdPoses';
import { NEIGHBOR, TILESET_COLUMNS, TILESET_KEY, tileIndex, ZONE_ORDER } from '../gfx/tiles';
import { burst, clawSlash, confetti, dust, flashWhite, impactStar } from '../systems/effects';
import { SCENES } from './sceneKeys';
import type { UiScene } from './UiScene';

type Keys = Record<
  'left' | 'right' | 'up' | 'down' | 'a' | 'd' | 'w' | 's' | 'z' | 'space',
  Phaser.Input.Keyboard.Key
>;

interface Enemy {
  readonly kind: 'garabato' | 'todo';
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly homeX: number;
  readonly homeY: number;
  readonly label: Phaser.GameObjects.Text | null;
  hp: number;
  dir: number;
  t: number;
  mode: 'hover' | 'warn' | 'dive' | 'return';
  modeMs: number;
  flashMs: number;
}

interface Pickup {
  readonly entity: WorldEntity;
  readonly sprite: Phaser.GameObjects.Sprite;
}

interface Hazard {
  readonly rect: Phaser.Geom.Rectangle;
  readonly visual: Phaser.GameObjects.GameObject & { destroy: () => void };
  lifeMs: number;
  activeAfterMs: number;
}

type BossMode = 'idle' | 'select' | 'sweep' | 'doubts' | 'dead';

const GARABATO_SPEED = 35;
const GARABATO_HP = 2;
const TODO_HP = 1;
const TODO_TRIGGER_RANGE = 90;
const TODO_WARN_MS = 550;
const TODO_DIVE_MS = 650;
const TODO_DIVE_SPEED = 140;
const BOSS_HP = 14;
const BOSS_IDLE_MS = 1300;
const BOSS_SELECT_WARN_MS = 800;
const BOSS_SELECT_ACTIVE_MS = 1200;
const BOSS_SWEEP_WARN_MS = 550;
const BOSS_SWEEP_SPEED = 230;
const BOSS_PHASE2_SPEEDUP = 0.7;
const INTERACT_RANGE = 28;
const RESPAWN_DELAY_MS = 1300;
const ENEMY_KNOCKBACK = 120;
/** First tile id of the small extra tileset (bridge, erased wall) after the autotile sheet. */
const EXTRA_GID = TILESET_COLUMNS * ZONE_ORDER.length;
const BRIDGE_TILE = EXTRA_GID + TILE_INDEX.bridge;
const ERASED_TILE = EXTRA_GID + TILE_INDEX.erased;
type Action = 'jump' | 'attack' | 'dash' | 'dance' | 'interact' | 'confirm' | 'spell';

/** Keyboard codes for each discrete action. */
const ACTION_CODES: Readonly<Record<string, Action>> = {
  KeyZ: 'jump',
  Space: 'jump',
  KeyX: 'attack',
  KeyJ: 'attack',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyK: 'dash',
  KeyB: 'dance',
  ArrowUp: 'interact',
  KeyW: 'interact',
  Enter: 'confirm',
};
const SPELL_CODES = new Set(['KeyV', 'KeyL']);

const POSE_FRAME: Readonly<Record<DanceBodyPose, number>> = {
  idle: CLAWD_FRAME.idle,
  closed: CLAWD_FRAME.closed,
  armsUp: CLAWD_FRAME.armsUp,
  waveLeft: CLAWD_FRAME.waveLeft,
  waveRight: CLAWD_FRAME.waveRight,
  back: CLAWD_FRAME.back,
};
const GARABATO_HIT_HOP = 90;
const ENEMY_DISSOLVE_MS = 220;
const STEAM_INTERVAL_MS = 450;
/** Story ending, then credits (with the legal line), then the open-world card. */
const ENDING_SEQUENCE: readonly string[] = [
  ...ENDING.slice(0, -1),
  CREDITS.join('\n'),
  ...ENDING.slice(-1),
];

export class GameScene extends Phaser.Scene {
  private keys!: Keys;
  private ui!: UiScene;
  private store = new SaveStore(typeof localStorage === 'undefined' ? null : localStorage);
  private save: SaveData = createDefaultSave('start');
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private player!: Phaser.Physics.Arcade.Sprite;
  private vitals = new Vitals(VITALS);
  private jump = new JumpAssist(PLAYER.coyoteMs, PLAYER.jumpBufferMs);
  private facing = 1;
  private attackMs = 0;
  private dashMs = 0;
  private dashCooldownMs = 0;
  private invulnerableMs = 0;
  private healHoldMs = 0;
  private walkMs = 0;
  private jumpCut = false;
  private dead = false;
  private started = false;
  private lastSafe = new Phaser.Math.Vector2();
  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  private props: Pickup[] = [];
  private spikes = new Set<string>();
  private bridgeCells: Array<{ col: number; row: number }> = [];
  private erasedCells: Array<{ col: number; row: number }> = [];
  private bridgeOutline!: Phaser.GameObjects.Graphics;
  private zone: ZoneId = 'sandbox';
  private tildeLine = 0;
  private tildeMs = 0;
  private boss!: Phaser.GameObjects.Image;
  private bossHp = BOSS_HP;
  private bossActive = false;
  private bossMode: BossMode = 'idle';
  private bossModeMs = 0;
  private bossFlashMs = 0;
  private hazards: Hazard[] = [];
  private ambience: Partial<Record<ZoneId, Phaser.GameObjects.Particles.ParticleEmitter>> = {};
  private halo!: Phaser.GameObjects.Image;
  /** Visual-only Clawd; the physics sprite is invisible so squash/stretch never affects collisions. */
  private view!: Phaser.GameObjects.Sprite;
  private wasGrounded = true;
  private squash = { x: 1, y: 1 };
  private trailMs = 0;
  private animMs = 0;
  private parallax: Array<{ sprite: Phaser.GameObjects.TileSprite; factor: number }> = [];
  private spellInput = new TapHold(SPELL.tapMaxMs);
  private actions = new ActionBuffer<Action>();
  private castMs = 0;
  private sparks: SoulSpark[] = [];
  private dance: { id: DanceId; ms: number; beat: number } | null = null;
  private danceCount = 0;
  private danceGlyph: Phaser.GameObjects.Text | null = null;
  private danceCaption: Phaser.GameObjects.Text | null = null;
  private rest: { bench: Pickup; refillMs: number } | null = null;
  private zoneDecor: Partial<
    Record<ZoneId, { objects: Phaser.GameObjects.Components.AlphaSingle[]; baseAlphas: number[] }>
  > = {};

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    this.save = this.store.load() ?? createDefaultSave('start');
    this.vitals = new Vitals(VITALS);
    this.buildWorld();
    this.spawnEntities();
    this.setupCamera();
    this.setupInput();
    this.scene.launch(SCENES.ui);
    this.ui = this.scene.get(SCENES.ui) as UiScene;
    this.ui.events.once(Phaser.Scenes.Events.CREATE, () => this.showTitle());
  }

  private showTitle(): void {
    this.physics.world.pause();
    audioDirector.playMusic('title');
    this.ui.showTitle(
      () => {
        const cards = this.save.finishedStory ? [UI_TEXT.zoneNames.sandbox] : INTRO;
        this.ui.playCards(cards, () => {
          this.started = true;
          this.physics.world.resume();
          this.ui.zoneTitle(UI_TEXT.zoneNames[this.zone]);
          audioDirector.playMusic(this.zone);
        });
      },
      UI_TEXT.subtitle,
      UI_TEXT.pressStart,
      UI_TEXT.controls,
    );
    this.refreshHud();
  }

  // ---------------------------------------------------------------- world

  private buildWorld(): void {
    const solidAt = (col: number, row: number): boolean => {
      const char = WORLD_TERRAIN[row]?.[col];
      // Outside the map counts as solid so border tiles don't draw exposed edges.
      return char === undefined ? true : char === '#';
    };
    const data = WORLD_TERRAIN.map((line, row) =>
      [...line].map((char, col) => {
        if (char === '#') {
          let mask = 0;
          if (solidAt(col, row - 1)) mask |= NEIGHBOR.up;
          if (solidAt(col + 1, row)) mask |= NEIGHBOR.right;
          if (solidAt(col, row + 1)) mask |= NEIGHBOR.down;
          if (solidAt(col - 1, row)) mask |= NEIGHBOR.left;
          return tileIndex(zoneAtCol(col), mask);
        }
        if (char === '^') this.spikes.add(`${col},${row}`);
        if (char === 'B') {
          this.bridgeCells.push({ col, row });
          return this.hasAbility() ? BRIDGE_TILE : -1;
        }
        if (char === 'E') {
          this.erasedCells.push({ col, row });
          return this.save.finishedStory ? -1 : ERASED_TILE;
        }
        return -1;
      }),
    );
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const autotiles = map.addTilesetImage('auto', TILESET_KEY, TILE, TILE, 0, 0, 0);
    const extra = map.addTilesetImage('extra', 'tilesBasic', TILE, TILE, 0, 0, EXTRA_GID);
    if (!autotiles || !extra) throw new Error('Tileset missing');
    const layer = map.createLayer(0, [autotiles, extra], 0, 0);
    if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) throw new Error('Tilemap layer missing');
    this.layer = layer;
    this.layer.setCollisionByExclusion([-1]);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.drawBackdrop(map.widthInPixels);
    this.drawSpikes();
    this.bridgeOutline = this.add.graphics();
    this.drawBridgeOutline();
  }

  /**
   * Hollow-Knight-style depth: pale foggy far layers, darker mid layers, light shafts,
   * and near-black foreground silhouettes that pass in front of the player.
   * Each zone owns a full set of backdrop layers; only the current zone's set is visible,
   * because slow parallax layers would otherwise leak one zone's scenery into the next.
   */
  private drawBackdrop(width: number): void {
    const floorY = (WORLD_ROWS - 3) * TILE;
    for (const zone of ['sandbox', 'library', 'margin'] as const) {
      const rng = new Phaser.Math.RandomDataGenerator([`agent-${zone}`]);
      const palette = ZONE_PALETTES[zone];
      const decor: Phaser.GameObjects.Components.AlphaSingle[] = [];
      // Painted parallax layers (far to near). They are pinned to the camera and scrolled by
      // offsetting their texture, so they tile endlessly across the whole zone.
      const cam = this.cameras.main;
      const viewX = cam.width / 2 - GAME_WIDTH / 2;
      const viewY = cam.height / 2 - GAME_HEIGHT / 2;
      bakeParallax(this.textures, zone).forEach((layer, i) => {
        const sprite = this.add
          .tileSprite(viewX, viewY, GAME_WIDTH, GAME_HEIGHT, layer.key)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(-50 + i);
        this.parallax.push({ sprite, factor: layer.scrollFactor });
        decor.push(sprite);
      });
      for (let x = 0; x < width; x += 140) {
        decor.push(
          this.add
            .image(x * 0.5 + rng.between(0, 120), rng.between(150, 250), 'fog')
            .setDisplaySize(rng.between(260, 420), rng.between(50, 90))
            .setTint(hexToNumber(palette.fog))
            .setAlpha(0.22)
            .setScrollFactor(0.5, 1)
            .setDepth(-20),
        );
        decor.push(
          this.add
            .image(x * 0.7 + rng.between(0, 120), 0, 'shaft')
            .setOrigin(0.5, 0)
            .setDisplaySize(rng.between(50, 90), floorY)
            .setAngle(rng.between(-12, 12))
            .setTint(hexToNumber(zone === 'library' ? palette.accent : palette.fog))
            .setAlpha(zone === 'margin' ? 0.12 : 0.2)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScrollFactor(0.7, 1)
            .setDepth(-15),
        );
      }
      const baseAlphas = decor.map((obj) => obj.alpha);
      this.zoneDecor[zone] = { objects: decor, baseAlphas };
      if (zone !== this.zone) for (const obj of decor) obj.setAlpha(0);
    }
    // Foreground: dark roots/stalactites from the ceiling and rubble along the bottom edge.
    const rng = new Phaser.Math.RandomDataGenerator(['agent-fg']);
    const fg = this.add.graphics().setScrollFactor(1.25, 1).setDepth(30);
    for (let s = 0; s < width * 1.25; s += 70) {
      const zone = zoneAtCol(Math.floor(s / 1.25 / TILE));
      fg.fillStyle(hexToNumber(zone === 'margin' ? '#2A2928' : '#050505'), 0.92);
      const x = s + rng.between(0, 40);
      if (rng.frac() < 0.55) {
        const len = rng.between(20, 70);
        fg.fillTriangle(x - rng.between(6, 14), 0, x + rng.between(6, 14), 0, x, len);
      }
      if (rng.frac() < 0.5) {
        const h = rng.between(10, 26);
        fg.fillEllipse(x, WORLD_ROWS * TILE - 4, rng.between(40, 90), h * 2);
      }
    }
    this.createAmbience();
  }

  /** Crossfade the backdrop sets when the player changes zone. */
  private showZoneDecor(zone: ZoneId): void {
    const FADE_MS = 1200;
    for (const [id, set] of Object.entries(this.zoneDecor)) {
      set.objects.forEach((obj, i) => {
        this.tweens.add({
          targets: obj,
          alpha: id === zone ? (set.baseAlphas[i] ?? 1) : 0,
          duration: FADE_MS,
        });
      });
    }
  }

  private createAmbience(): void {
    const view = { x: { min: 0, max: GAME_WIDTH }, y: { min: 0, max: GAME_HEIGHT } };
    const configs: Record<ZoneId, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig> = {
      sandbox: {
        ...view,
        lifespan: 6000,
        speedY: { min: -10, max: -3 },
        speedX: { min: -6, max: 6 },
        alpha: { start: 0.6, end: 0 },
        tint: hexToNumber(COLORS.cactus),
        frequency: 160,
        blendMode: Phaser.BlendModes.ADD,
      },
      library: {
        ...view,
        lifespan: 5000,
        speedY: { min: -14, max: -4 },
        speedX: { min: -5, max: 5 },
        alpha: { start: 0.9, end: 0 },
        tint: hexToNumber(COLORS.peach),
        frequency: 120,
        blendMode: Phaser.BlendModes.ADD,
      },
      margin: {
        ...view,
        lifespan: 6000,
        speedY: { min: 12, max: 26 },
        speedX: { min: -8, max: 4 },
        alpha: { start: 0.9, end: 0.2 },
        tint: hexToNumber(COLORS.cloudDark),
        frequency: 90,
      },
    };
    for (const zone of ['sandbox', 'library', 'margin'] as const) {
      const emitter = this.add.particles(0, 0, 'dot', configs[zone]).setDepth(25);
      emitter.emitting = zone === this.zone;
      this.ambience[zone] = emitter;
    }
    this.halo = this.add
      .image(0, 0, 'halo')
      .setTint(hexToNumber(COLORS.clawdLight))
      .setAlpha(0.38)
      .setScale(2.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);
  }

  private updateAmbience(): void {
    const cam = this.cameras.main;
    for (const layer of this.parallax) layer.sprite.tilePositionX = cam.scrollX * layer.factor;
    const view = cam.worldView;
    for (const emitter of Object.values(this.ambience)) emitter.setPosition(view.x, view.y);
    if (this.view)
      this.halo.setPosition(this.player.x, this.player.y).setVisible(this.view.visible);
  }

  private drawSpikes(): void {
    const g = this.add.graphics().setDepth(1);
    for (const key of this.spikes) {
      const [col = 0, row = 0] = key.split(',').map(Number);
      const x = col * TILE;
      const y = row * TILE;
      g.fillStyle(hexToNumber(COLORS.danger));
      g.fillTriangle(x, y + TILE, x + 8, y + 4, x + TILE, y + TILE);
    }
  }

  private drawBridgeOutline(): void {
    const g = this.bridgeOutline;
    g.clear();
    if (this.hasAbility()) return;
    g.fillStyle(hexToNumber(COLORS.clawdLight), 0.8);
    for (const cell of this.bridgeCells) {
      for (let i = 0; i < TILE; i += 4) g.fillRect(cell.col * TILE + i, cell.row * TILE, 2, 2);
    }
  }

  private spawnEntities(): void {
    for (const entity of ENTITIES) {
      const x = entity.col * TILE + TILE / 2;
      const y = entity.row * TILE + TILE;
      switch (entity.kind) {
        case 'player':
          this.spawnPlayer(x, y);
          break;
        case 'garabato':
        case 'todo':
          this.spawnEnemy(entity.kind, x, y);
          break;
        case 'note':
          if (!this.save.notes.includes(entity.id)) {
            this.add
              .image(x, y - 10, 'halo')
              .setTint(hexToNumber(COLORS.ivory))
              .setAlpha(0.35)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(1);
            const sprite = this.add.sprite(x, y - 10, 'note', 0).setDepth(2);
            this.tweens.add({ targets: sprite, y: y - 14, duration: 900, yoyo: true, repeat: -1 });
            this.pickups.push({ entity, sprite });
          }
          break;
        case 'commit':
          this.props.push({ entity, sprite: this.add.sprite(x, y - 9, 'commit', 0).setDepth(1) });
          break;
        case 'bench':
          this.spawnBench(entity, x, y);
          break;
        case 'sign':
          this.props.push({ entity, sprite: this.add.sprite(x, y - 6, 'sign', 0).setDepth(1) });
          break;
        case 'tilde':
          this.props.push({ entity, sprite: this.add.sprite(x, y - 12, 'tilde', 0).setDepth(1) });
          break;
        case 'desk':
          this.add
            .image(x + 8, y - 26, 'halo')
            .setTint(hexToNumber(COLORS.peach))
            .setAlpha(0.5)
            .setScale(2.5)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(0);
          this.props.push({ entity, sprite: this.add.sprite(x, y - 12, 'desk', 0).setDepth(1) });
          break;
        case 'boss':
          this.boss = this.add.image(x, y, 'blankPage', 0).setDepth(3);
          this.tweens.add({ targets: this.boss, angle: 2, duration: 1600, yoyo: true, repeat: -1 });
          if (this.save.finishedStory) this.boss.setVisible(false);
          break;
        default:
          break;
      }
    }
    const checkpoint = this.checkpointPosition(this.save.checkpointId);
    this.player.setPosition(checkpoint.x, checkpoint.y);
    this.lastSafe.set(checkpoint.x, checkpoint.y);
  }

  private spawnPlayer(x: number, y: number): void {
    this.player = this.physics.add.sprite(x, y - 10, 'clawd', 0).setVisible(false);
    this.view = this.add.sprite(x, y, 'clawd', 0).setOrigin(0.5, 1).setDepth(5);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body
      .setSize(PLAYER.bodyWidth, PLAYER.bodyHeight)
      .setOffset((34 - PLAYER.bodyWidth) / 2, 20 - PLAYER.bodyHeight);
    body.setGravityY(PLAYER.gravity).setMaxVelocityY(PLAYER.maxFallSpeed);
    body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.layer);
  }

  private spawnEnemy(kind: Enemy['kind'], x: number, y: number): void {
    const sprite = this.physics.add.sprite(x, y - 8, kind, 0).setDepth(4);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    let label: Phaser.GameObjects.Text | null = null;
    if (kind === 'garabato') {
      body.setGravityY(PLAYER.gravity);
      this.physics.add.collider(sprite, this.layer);
    } else {
      body.setAllowGravity(false);
      label = this.add
        .text(x, y - 24, 'TODO', { fontFamily: 'monospace', fontSize: '8px', color: COLORS.oat })
        .setOrigin(0.5)
        .setResolution(CANVAS_SCALE)
        .setDepth(4);
    }
    this.enemies.push({
      kind,
      sprite,
      homeX: x,
      homeY: y - 8,
      label,
      hp: kind === 'garabato' ? GARABATO_HP : TODO_HP,
      dir: -1,
      t: x,
      mode: 'hover',
      modeMs: 0,
      flashMs: 0,
    });
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setZoom(CANVAS_SCALE);
    cam.setBounds(0, 0, this.layer.width, this.layer.height);
    cam.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);
    cam.setDeadzone(CAMERA.deadzoneWidth, CAMERA.deadzoneHeight);
    cam.setBackgroundColor(ZONE_PALETTES[this.zone].background);
    cam.filters.external.addVignette(0.5, 0.5, 0.75, 0.45);
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = keyboard.addKeys({
      left: K.LEFT,
      right: K.RIGHT,
      up: K.UP,
      down: K.DOWN,
      a: K.A,
      d: K.D,
      w: K.W,
      s: K.S,
      z: K.Z,
      space: K.SPACE,
    }) as Keys;
    // Discrete actions come straight from DOM events: exactly one event per press, even for
    // presses shorter than a frame (Phaser's queue can drop or replay them at low frame rates).
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      if (SPELL_CODES.has(event.code)) this.spellInput.press(this.time.now);
      const action = ACTION_CODES[event.code];
      if (action) this.actions.press(action);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (SPELL_CODES.has(event.code) && this.spellInput.release(this.time.now)) {
        this.actions.press('spell');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    });
  }

  // ---------------------------------------------------------------- loop

  override update(_time: number, delta: number): void {
    if (!this.started || this.ui.cardsPlaying) {
      this.actions.clear();
      return;
    }
    if (this.ui.panelOpen) {
      const close = ['jump', 'attack', 'confirm'] as const;
      if (close.some((action) => this.actions.peek(action))) {
        this.ui.hidePanel();
        this.physics.world.resume();
        audioDirector.playSfx('confirm');
      }
      this.actions.clear();
      return;
    }
    if (this.physics.world.isPaused) {
      // Keep presses made during a hit-stop so they still register when time resumes.
      return;
    }
    const dt = Math.min(delta, 50);
    if (!this.dead) this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateSparks(dt);
    if (this.bossActive) this.updateBoss(dt);
    this.updateHazards(dt);
    if (!this.dead) {
      this.checkContacts();
      this.checkInteractions(dt);
    }
    this.updateZone();
    this.updateAmbience();
    this.refreshHud();
    this.actions.clear();
  }

  private input2(): { x: number; up: boolean; down: boolean } {
    const k = this.keys;
    const x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    return { x, up: k.up.isDown || k.w.isDown, down: k.down.isDown || k.s.isDown };
  }

  private updatePlayer(dt: number): void {
    const k = this.keys;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down;
    const move = this.input2();
    const jumpPressed = this.actions.consume('jump');
    const jumpHeld = k.z.isDown || k.space.isDown;
    const seconds = dt / 1000;

    this.attackMs = Math.max(0, this.attackMs - dt);
    this.invulnerableMs = Math.max(0, this.invulnerableMs - dt);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - dt);
    this.castMs = Math.max(0, this.castMs - dt);
    if (move.x !== 0) this.facing = move.x;

    const leaving = move.x !== 0 || jumpPressed || this.actions.peek('attack');
    if (this.rest) {
      this.updateRest(dt, leaving);
      this.animatePlayer(grounded, 0);
      return;
    }
    if (this.dance) {
      if (leaving || this.actions.peek('dash')) this.stopDance();
      else if (this.actions.consume('dance')) {
        this.startDance();
        this.animatePlayer(grounded, 0);
        return;
      } else {
        body.setVelocityX(approach(body.velocity.x, 0, PLAYER.deceleration * seconds));
        this.dance.ms += dt;
        if (this.dance.ms >= DANCE_DURATION_MS[this.dance.id]) this.stopDance();
        this.animatePlayer(grounded, 0);
        return;
      }
    }
    if (this.actions.consume('dance') && grounded && this.dashMs <= 0) {
      this.startDance();
      this.animatePlayer(grounded, 0);
      return;
    }

    if (this.dashMs > 0) {
      this.dashMs -= dt;
      body.setVelocity(this.facing * DASH.speed, 0);
      if (this.dashMs <= 0) body.setAllowGravity(true);
      this.animatePlayer(grounded, move.x);
      return;
    }
    if (this.actions.consume('dash') && this.hasAbility() && this.dashCooldownMs <= 0) {
      this.dashMs = DASH.durationMs;
      this.dashCooldownMs = DASH.cooldownMs + DASH.durationMs;
      body.setAllowGravity(false);
      this.setSquash(1.45, 0.7);
      audioDirector.playSfx('dash');
      burst(this, this.player.x, this.player.y, COLORS.clawdLight, 6);
      return;
    }

    const target = move.x * PLAYER.runSpeed;
    const rate = move.x === 0 ? PLAYER.deceleration : PLAYER.acceleration;
    body.setVelocityX(approach(body.velocity.x, target, rate * seconds));

    this.jump.update(dt, grounded, jumpPressed);
    if (this.jump.consumeJump()) {
      body.setVelocityY(-PLAYER.jumpVelocity);
      this.jumpCut = false;
      this.setSquash(0.75, 1.3);
      this.dust(this.player.x, body.bottom, 4);
      audioDirector.playSfx('jump');
    }
    if (!jumpHeld && body.velocity.y < 0 && !this.jumpCut) {
      body.setVelocityY(body.velocity.y * PLAYER.jumpCutMultiplier);
      this.jumpCut = true;
    }

    // V: a quick tap throws a spark; holding it (while standing) heals.
    if (this.actions.consume('spell')) this.castSpark();
    if (this.spellInput.isHolding(this.time.now) && grounded && this.vitals.canHeal) {
      body.setVelocityX(0);
      this.healHoldMs += dt;
      if (this.healHoldMs >= VITALS.healHoldMs) {
        this.vitals.heal();
        this.healHoldMs = 0;
        audioDirector.playSfx('heal');
        burst(this, this.player.x, this.player.y, COLORS.clawdLight, 10);
      }
    } else {
      this.healHoldMs = 0;
    }

    if (this.attackMs <= 0 && this.actions.consume('attack'))
      this.attack(move.up, move.down && !grounded);
    if (grounded && !this.isSpikeBelow()) this.lastSafe.set(this.player.x, this.player.y);
    this.animatePlayer(grounded, move.x);
  }

  private animatePlayer(grounded: boolean, moveX: number): void {
    const dt = this.game.loop.delta;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.walkMs += dt;
    this.animMs += dt;

    // Landing: squash and a puff of dust.
    if (grounded && !this.wasGrounded) {
      this.setSquash(1.3, 0.75);
      this.dust(this.player.x, body.bottom, 6);
      audioDirector.playSfx('land');
    }
    this.wasGrounded = grounded;
    if (this.dance) {
      this.renderDance(body);
      return;
    }
    if (this.rest) {
      const breathing = Math.round((Math.sin(this.animMs / 700) + 1) / 2);
      this.view
        .setTexture('clawd', CLAWD_FRAME.closed)
        .setPosition(this.player.x, body.bottom + 2 - REST.seatLift - breathing)
        .setScale(1, 1)
        .setAngle(0)
        .setAlpha(1);
      return;
    }

    // Frames: blink, walk cycle, arms up for up-attacks and healing.
    const blink = Math.floor(this.walkMs / 100) % 34 === 0;
    let frame = blink ? 1 : 0;
    const running = grounded && moveX !== 0;
    const step = Math.floor(this.walkMs / 110);
    if (running) frame = step % 2 === 0 ? 2 : 3;
    if ((this.attackMs > 0 && this.input2().up) || this.healHoldMs > 0 || this.castMs > 0)
      frame = CLAWD_FRAME.armsUp;
    if (running && step !== Math.floor((this.walkMs - dt) / 110) && step % 4 === 0) {
      this.dust(this.player.x - moveX * 8, body.bottom, 2);
    }

    // Eyes look where Clawd is heading, like the official "look-left/right" poses.
    this.view.setTexture(this.facing < 0 ? 'clawdLeft' : 'clawdRight', frame);

    // Ease squash back to 1, plus a little stretch while rising or falling fast.
    const ease = Math.min(1, dt / 90);
    this.squash.x += (1 - this.squash.x) * ease;
    this.squash.y += (1 - this.squash.y) * ease;
    let sx = this.squash.x;
    let sy = this.squash.y;
    if (!grounded && this.dashMs <= 0) {
      const stretch = Math.min(0.12, Math.abs(body.velocity.y) / 3000);
      sx -= stretch;
      sy += stretch;
    }
    // Idle breathing: a slow 1px bob, like the official Clawd animation.
    const breathing =
      grounded && moveX === 0 ? Math.round((Math.sin(this.animMs / 420) + 1) / 2) : 0;
    const runBob = running && frame === 2 ? 1 : 0;
    const lean = this.dashMs > 0 ? this.facing * 6 : running ? this.facing * 2 : 0;
    this.view
      .setPosition(this.player.x, body.bottom + 2 - breathing - runBob)
      .setScale(sx, sy)
      .setAngle(lean);

    // Dash afterimages.
    this.trailMs -= dt;
    if (this.dashMs > 0 && this.trailMs <= 0) {
      this.trailMs = 30;
      const ghost = this.add
        .sprite(this.view.x, this.view.y, this.view.texture.key, frame)
        .setOrigin(0.5, 1)
        .setScale(sx, sy)
        .setTint(hexToNumber(COLORS.clawdLight))
        .setAlpha(0.5)
        .setDepth(4);
      this.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 220,
        onComplete: () => ghost.destroy(),
      });
    }

    const flicker = this.invulnerableMs > 0 && Math.floor(this.invulnerableMs / 80) % 2 === 0;
    this.view.setAlpha(flicker ? 0.35 : 1);
  }

  private setSquash(x: number, y: number): void {
    this.squash = { x, y };
  }

  /** Small puffs of dust at Clawd's feet, tinted for the zone. */
  private dust(x: number, y: number, count: number): void {
    dust(this, x, y, count, this.zone === 'margin' ? COLORS.cloudDark : COLORS.cloudMedium);
  }

  private attack(up: boolean, down: boolean): void {
    this.attackMs = ATTACK.activeMs + ATTACK.recoveryMs;
    const px = this.player.x;
    const py = this.player.y;
    let rect: Phaser.Geom.Rectangle;
    if (up)
      rect = new Phaser.Geom.Rectangle(
        px - ATTACK.thickness / 2,
        py - 10 - ATTACK.reach,
        ATTACK.thickness,
        ATTACK.reach,
      );
    else if (down)
      rect = new Phaser.Geom.Rectangle(
        px - ATTACK.thickness / 2,
        py + 8,
        ATTACK.thickness,
        ATTACK.reach,
      );
    else
      rect = new Phaser.Geom.Rectangle(
        this.facing > 0 ? px + 12 : px - 12 - ATTACK.reach,
        py - ATTACK.thickness / 2,
        ATTACK.reach,
        ATTACK.thickness,
      );

    const angle = up ? -Math.PI / 2 : down ? Math.PI / 2 : this.facing > 0 ? 0 : Math.PI;
    clawSlash(this, this.player.x, this.player.y - 1, angle);
    audioDirector.playSfx('swing');
    this.setSquash(up || down ? 0.9 : 1.2, up || down ? 1.15 : 0.9);

    let hitSomething = false;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const bounds = enemy.sprite.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(rect, bounds)) {
        this.damageEnemy(enemy);
        impactStar(this, (rect.centerX + bounds.centerX) / 2, (rect.centerY + bounds.centerY) / 2);
        hitSomething = true;
      }
    }
    if (
      this.bossActive &&
      this.bossHp > 0 &&
      Phaser.Geom.Rectangle.Overlaps(rect, this.boss.getBounds())
    ) {
      this.damageBoss();
      const bounds = this.boss.getBounds();
      impactStar(this, (rect.centerX + bounds.centerX) / 2, rect.centerY);
      hitSomething = true;
    }
    if (down && this.spikeInRect(rect)) hitSomething = true;
    if (hitSomething) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      audioDirector.playSfx(down ? 'pogo' : 'hit');
      if (down) body.setVelocityY(-ATTACK.pogoVelocity);
      else if (!up) body.setVelocityX(-this.facing * ATTACK.recoilVelocity);
      this.cameras.main.shake(HIT_FX.impactShakeMs, HIT_FX.impactShakeIntensity);
      this.hitStop(HURT.hitStopMs);
    }
  }

  private hitStop(ms: number): void {
    this.physics.world.pause();
    this.time.delayedCall(ms, () => {
      if (!this.ui.panelOpen) this.physics.world.resume();
    });
  }

  private damageEnemy(enemy: Enemy, damage: number = ATTACK.damage, gainContext = true): void {
    enemy.hp -= damage;
    enemy.flashMs = 120;
    flashWhite(this, enemy.sprite);
    burst(this, enemy.sprite.x, enemy.sprite.y, COLORS.ink, 6);
    if (gainContext) this.vitals.registerHit();
    const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(Math.sign(enemy.sprite.x - this.player.x || 1) * ENEMY_KNOCKBACK);
    if (enemy.kind === 'garabato') body.setVelocityY(-GARABATO_HIT_HOP);
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  /** Enemies don't die: they "resolve", squashing into ink and dissolving. */
  private killEnemy(enemy: Enemy): void {
    audioDirector.playSfx('enemyDie');
    burst(this, enemy.sprite.x, enemy.sprite.y, COLORS.ivory, 14, 28);
    burst(this, enemy.sprite.x, enemy.sprite.y, COLORS.ink, 8, 18);
    enemy.sprite.disableBody(true, false);
    this.tweens.add({
      targets: enemy.sprite,
      scaleX: 1.6,
      scaleY: 0,
      alpha: 0,
      duration: ENEMY_DISSOLVE_MS,
      ease: 'Quad.easeIn',
      onComplete: () => enemy.sprite.setVisible(false),
    });
    if (enemy.label) {
      enemy.label.setText('// HECHO');
      this.tweens.add({ targets: enemy.label, alpha: 0, y: enemy.label.y - 10, duration: 900 });
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.flashMs = Math.max(0, enemy.flashMs - dt);

      enemy.t += dt;
      if (enemy.kind === 'garabato') this.updateGarabato(enemy);
      else this.updateTodo(enemy, dt);
    }
  }

  private updateGarabato(enemy: Enemy): void {
    const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
    if (enemy.flashMs > 0) return;
    if (body.blocked.left) enemy.dir = 1;
    if (body.blocked.right) enemy.dir = -1;
    const aheadX = enemy.sprite.x + enemy.dir * 10;
    const below = this.layer.getTileAtWorldXY(aheadX, enemy.sprite.y + 12);
    if (body.blocked.down && !below) enemy.dir *= -1;
    body.setVelocityX(enemy.dir * GARABATO_SPEED);
    enemy.sprite.setFlipX(enemy.dir > 0);
    enemy.sprite.setFrame(enemy.flashMs > 0 ? 2 : Math.floor(enemy.t / 180) % 2);
  }

  private updateTodo(enemy: Enemy, dt: number): void {
    const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
    enemy.modeMs += dt;
    enemy.sprite.setFrame(enemy.mode === 'dive' ? 2 : Math.floor(enemy.t / 90) % 2);
    const dx = this.player.x - enemy.sprite.x;
    const dy = this.player.y - enemy.sprite.y;
    const dist = Math.hypot(dx, dy);
    switch (enemy.mode) {
      case 'hover':
        body.setVelocity(0, 0);
        enemy.sprite.setPosition(
          enemy.homeX + Math.sin(enemy.t / 600) * 18,
          enemy.homeY + Math.sin(enemy.t / 300) * 6,
        );
        if (dist < TODO_TRIGGER_RANGE && !this.dead) {
          enemy.mode = 'warn';
          enemy.modeMs = 0;
          enemy.label?.setText('AHORA').setColor(COLORS.danger);
        }
        break;
      case 'warn':
        body.setVelocity(0, 0);
        if (enemy.modeMs >= TODO_WARN_MS) {
          enemy.mode = 'dive';
          enemy.modeMs = 0;
          body.setVelocity((dx / dist) * TODO_DIVE_SPEED, (dy / dist) * TODO_DIVE_SPEED);
        }
        break;
      case 'dive':
        if (enemy.modeMs >= TODO_DIVE_MS) {
          enemy.mode = 'return';
          enemy.modeMs = 0;
        }
        break;
      case 'return': {
        const hx = enemy.homeX - enemy.sprite.x;
        const hy = enemy.homeY - enemy.sprite.y;
        const hd = Math.hypot(hx, hy);
        if (hd < 4) {
          enemy.mode = 'hover';
          enemy.t = 0;
          enemy.label?.setText('TODO').setColor(COLORS.oat);
        } else body.setVelocity((hx / hd) * 80, (hy / hd) * 80);
        break;
      }
      default:
        break;
    }
    enemy.label?.setPosition(enemy.sprite.x, enemy.sprite.y - 12);
  }

  // ---------------------------------------------------------------- boss

  private startBoss(): void {
    this.bossActive = true;
    this.bossHp = BOSS_HP;
    this.bossMode = 'idle';
    this.bossModeMs = 0;
    for (let row = 11; row <= 16; row++) this.layer.putTileAt(ERASED_TILE, ARENA_GATE_COL, row);
    this.layer.setCollisionByExclusion([-1]);
    this.ui.toast(BOSS_LINES.intro, 3500);
    audioDirector.playMusic('boss');
  }

  private resetBoss(): void {
    this.bossActive = false;
    this.bossHp = BOSS_HP;
    for (let row = 11; row <= 16; row++) this.layer.removeTileAt(ARENA_GATE_COL, row);
    for (const hazard of this.hazards) hazard.visual.destroy();
    this.hazards = [];
    this.ui.setBoss(null);
    this.boss.setFrame(0);
    audioDirector.playMusic(this.zone);
  }

  private get bossPhase2(): boolean {
    return this.bossHp <= BOSS_HP / 2;
  }

  private updateBoss(dt: number): void {
    if (this.bossMode === 'dead') return;
    const speed = this.bossPhase2 ? BOSS_PHASE2_SPEEDUP : 1;
    this.bossModeMs += dt;
    this.bossFlashMs = Math.max(0, this.bossFlashMs - dt);

    const targetX = Phaser.Math.Clamp(this.player.x, (ARENA_GATE_COL + 4) * TILE, 154 * TILE);
    this.boss.x = approach(this.boss.x, targetX, 40 * (dt / 1000));
    this.boss.y = 10.5 * TILE + Math.sin(this.time.now / 700) * 8;
    this.ui.setBoss(this.bossHp / BOSS_HP);

    if (this.bossMode === 'idle' && this.bossModeMs >= BOSS_IDLE_MS * speed) {
      const next: BossMode[] = this.bossPhase2
        ? ['select', 'sweep', 'doubts']
        : ['select', 'sweep'];
      this.bossMode = next[Math.floor(this.time.now / 1000) % next.length] ?? 'select';
      this.bossModeMs = 0;
      if (this.bossMode === 'select') this.spawnSelection(speed);
      if (this.bossMode === 'sweep') this.spawnSweep();
      if (this.bossMode === 'doubts') this.spawnDoubts();
      this.boss.setFrame(1);
    } else if (this.bossMode !== 'idle' && this.bossModeMs >= 1600 * speed) {
      this.bossMode = 'idle';
      this.bossModeMs = 0;
      this.boss.setFrame(0);
    }
  }

  private spawnSelection(speed: number): void {
    const width = 72;
    const rect = new Phaser.Geom.Rectangle(this.player.x - width / 2, 12 * TILE, width, 5 * TILE);
    const visual = this.add
      .rectangle(rect.centerX, rect.centerY, rect.width, rect.height)
      .setDepth(6);
    visual.setStrokeStyle(2, hexToNumber(COLORS.danger));
    this.tweens.add({ targets: visual, alpha: 0.4, duration: 120, yoyo: true, repeat: 4 });
    this.time.delayedCall(BOSS_SELECT_WARN_MS * speed, () =>
      visual.setFillStyle(hexToNumber(COLORS.erased), 0.85),
    );
    this.hazards.push({
      rect,
      visual,
      lifeMs: (BOSS_SELECT_WARN_MS + BOSS_SELECT_ACTIVE_MS) * speed,
      activeAfterMs: BOSS_SELECT_WARN_MS * speed,
    });
  }

  private spawnSweep(): void {
    const fromLeft = this.player.x > this.boss.x;
    const startX = fromLeft ? (ARENA_GATE_COL + 1) * TILE : 157 * TILE;
    const visual = this.add.image(startX, 17 * TILE - 5, 'eraser').setDepth(6);
    const rect = new Phaser.Geom.Rectangle(startX - 14, 17 * TILE - 10, 28, 10);
    const hazard: Hazard = { rect, visual, lifeMs: 6000, activeAfterMs: BOSS_SWEEP_WARN_MS };
    this.hazards.push(hazard);
    audioDirector.playSfx('erase');
    this.tweens.add({
      targets: visual,
      x: fromLeft ? 157 * TILE : (ARENA_GATE_COL + 1) * TILE,
      delay: BOSS_SWEEP_WARN_MS,
      duration: ((157 - ARENA_GATE_COL) * TILE * 1000) / BOSS_SWEEP_SPEED,
      onUpdate: () => rect.setPosition(visual.x - 14, visual.y - 5),
      onComplete: () => {
        hazard.lifeMs = 0;
      },
    });
  }

  private spawnDoubts(): void {
    for (let i = 0; i < 3; i++) {
      const x = this.player.x + (i - 1) * 56;
      const text = BOSS_DOUBTS[(Math.floor(this.time.now / 100) + i) % BOSS_DOUBTS.length] ?? '';
      const visual = this.add
        .text(x, 2 * TILE, text, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: COLORS.cloudDark,
        })
        .setOrigin(0.5)
        .setResolution(CANVAS_SCALE)
        .setDepth(6);
      const rect = new Phaser.Geom.Rectangle(x - 20, 2 * TILE, 40, 8);
      const hazard: Hazard = { rect, visual, lifeMs: 2400, activeAfterMs: 500 };
      this.hazards.push(hazard);
      this.tweens.add({
        targets: visual,
        y: 17 * TILE,
        delay: 500 + i * 150,
        duration: 1500,
        onUpdate: () => rect.setPosition(visual.x - 20, visual.y - 4),
      });
    }
  }

  private damageBoss(damage: number = ATTACK.damage, gainContext = true): void {
    const before = this.bossHp;
    this.bossHp -= damage;
    this.bossFlashMs = 100;
    audioDirector.playSfx('bossHit');
    flashWhite(this, this.boss);
    burst(this, this.boss.x, this.boss.y + 20, COLORS.ink, 8);
    if (gainContext) this.vitals.registerHit();
    if (before > BOSS_HP / 2 && this.bossHp <= BOSS_HP / 2) {
      this.ui.toast(BOSS_LINES.phase2, 3500);
      audioDirector.playSfx('bossPhase');
    }
    if (this.bossHp <= 0) this.defeatBoss();
  }

  private defeatBoss(): void {
    this.bossMode = 'dead';
    this.ui.setBoss(null);
    for (const hazard of this.hazards) hazard.visual.destroy();
    this.hazards = [];
    this.ui.toast(BOSS_LINES.defeat, 3000);
    audioDirector.playSfx('bossDefeat');
    audioDirector.playMusic('ending');
    this.tweens.add({ targets: this.boss, alpha: 0, scale: 1.4, duration: 2200 });
    this.time.delayedCall(2600, () => {
      this.ui.playCards(ENDING_SEQUENCE, () => this.openWorld());
    });
  }

  private openWorld(): void {
    this.bossActive = false;
    this.boss.setVisible(false);
    for (let row = 11; row <= 16; row++) this.layer.removeTileAt(ARENA_GATE_COL, row);
    for (const cell of this.erasedCells) this.layer.removeTileAt(cell.col, cell.row);
    this.persist({ finishedStory: true });
    audioDirector.playMusic(this.zone);
    this.ui.toast(UI_TEXT.notes(this.save.notes.length, this.totalNotes()), 4000);
  }

  private updateHazards(dt: number): void {
    for (const hazard of this.hazards) {
      hazard.lifeMs -= dt;
      hazard.activeAfterMs -= dt;
      if (hazard.lifeMs <= 0) hazard.visual.destroy();
    }
    this.hazards = this.hazards.filter((h) => h.lifeMs > 0);
  }

  // ---------------------------------------------------------------- contacts

  private checkContacts(): void {
    const bounds = (this.player.body as Phaser.Physics.Arcade.Body).getBounds(
      new Phaser.Geom.Rectangle(),
    );
    const playerRect = new Phaser.Geom.Rectangle(
      this.player.x - PLAYER.bodyWidth / 2,
      this.player.y - 2,
      PLAYER.bodyWidth,
      PLAYER.bodyHeight,
    );
    void bounds;
    if (this.isOnSpikes()) {
      this.hurt(this.player.x);
      if (!this.dead) {
        this.player.setPosition(this.lastSafe.x, this.lastSafe.y);
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      return;
    }
    if (this.invulnerableMs > 0 || this.dashMs > 0) return;
    for (const enemy of this.enemies) {
      if (enemy.hp > 0 && Phaser.Geom.Rectangle.Overlaps(playerRect, enemy.sprite.getBounds())) {
        this.hurt(enemy.sprite.x);
        return;
      }
    }
    // The boss's body is harmless: only its attacks (selection, eraser, doubts) hurt.
    for (const hazard of this.hazards) {
      if (hazard.activeAfterMs <= 0 && Phaser.Geom.Rectangle.Overlaps(playerRect, hazard.rect)) {
        this.hurt(hazard.rect.centerX);
        return;
      }
    }
  }

  private hurt(fromX: number): void {
    if (this.invulnerableMs > 0 && !this.isOnSpikes()) return;
    const damage = this.save.assistMode ? HURT.assistDamageMultiplier : 1;
    this.vitals.takeDamage(Math.ceil(damage));
    this.invulnerableMs = HURT.invulnerableMs;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.sign(this.player.x - fromX || 1) * HURT.knockbackX, -HURT.knockbackY);
    this.stopDance();
    this.rest = null;
    this.cameras.main.shake(HURT.shakeMs, HURT.shakeIntensity);
    flashWhite(this, this.view);
    this.setSquash(1.3, 0.7);
    burst(this, this.player.x, this.player.y, COLORS.clawdBody, 8, 26);
    burst(this, this.player.x, this.player.y, COLORS.ink, 6, 20);
    this.hitStop(HIT_FX.hurtStopMs);
    audioDirector.playSfx(this.vitals.isDead ? 'death' : 'hurt');
    if (this.vitals.isDead) this.die();
  }

  private die(): void {
    this.dead = true;
    this.ui.toast(UI_TEXT.compacting, RESPAWN_DELAY_MS);
    this.view.setVisible(false);
    burst(this, this.player.x, this.player.y, COLORS.clawdBody, 16);
    this.time.delayedCall(RESPAWN_DELAY_MS, () => {
      if (this.bossActive) this.resetBoss();
      const checkpoint = this.checkpointPosition(this.save.checkpointId);
      this.player.setPosition(checkpoint.x, checkpoint.y);
      this.view.setVisible(true);
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.vitals.restore();
      this.invulnerableMs = HURT.invulnerableMs;
      this.dead = false;
    });
  }

  private checkInteractions(dt: number): void {
    const px = this.player.x;
    const py = this.player.y;
    let hint = '';
    for (const pickup of this.pickups) {
      if (!pickup.sprite.visible) continue;
      if (
        Phaser.Math.Distance.Between(px, py, pickup.sprite.x, pickup.sprite.y) <
        INTERACT_RANGE * 0.7
      ) {
        pickup.sprite.setVisible(false);
        const note = NOTE_TEXT[pickup.entity.id];
        this.persist({ notes: [...this.save.notes, pickup.entity.id] });
        this.physics.world.pause();
        audioDirector.playSfx('note');
        this.ui.showPanel(`${UI_TEXT.noteFound} · ${note?.title ?? ''}`, note?.body ?? '');
        return;
      }
    }
    for (const prop of this.props) {
      const near =
        Phaser.Math.Distance.Between(px, py, prop.sprite.x, prop.sprite.y) < INTERACT_RANGE;
      if (!near) continue;
      const { kind, id } = prop.entity;
      if (kind === 'sign') hint = SIGN_TEXT[id] ?? '';
      if (kind === 'tilde') hint = this.tildeHint(dt);
      if (kind === 'bench' && !this.rest) {
        hint = UI_TEXT.rest;
        const sit = this.actions.consume('interact');
        if (sit && !this.dance && (this.player.body as Phaser.Physics.Arcade.Body).blocked.down)
          this.startRest(prop);
      }
      if (kind === 'commit' && this.save.checkpointId !== id) {
        this.persist({ checkpointId: id });
        this.vitals.restore();
        prop.sprite.setFrame(1);
        this.ui.toast(UI_TEXT.saved);
        audioDirector.playSfx('commit');
      }
      if (kind === 'desk' && !this.hasAbility()) {
        this.persist({ abilities: ['complete'] });
        for (const cell of this.bridgeCells) this.layer.putTileAt(BRIDGE_TILE, cell.col, cell.row);
        this.layer.setCollisionByExclusion([-1]);
        this.drawBridgeOutline();
        this.physics.world.pause();
        audioDirector.playSfx('ability');
        this.ui.showPanel('COMPLETAR [Shift]', DESK_LINES.join('\n\n'));
      }
    }
    for (const prop of this.props) {
      if (prop.entity.kind === 'commit')
        prop.sprite.setFrame(this.isActiveCommit(prop.entity.id) ? 1 : 0);
    }
    this.ui.setHint(hint);
    if (!this.bossActive && !this.save.finishedStory && px > ARENA_TRIGGER_COL * TILE)
      this.startBoss();
  }

  private tildeHint(dt: number): string {
    const lines = this.save.finishedStory ? TILDE_POSTGAME : TILDE_LINES;
    this.tildeMs += dt;
    if (this.tildeMs > 3600) {
      this.tildeMs = 0;
      this.tildeLine = (this.tildeLine + 1) % lines.length;
    }
    return lines[this.tildeLine % lines.length] ?? '';
  }

  private updateZone(): void {
    const zone = zoneAtCol(Math.floor(this.player.x / TILE));
    if (zone === this.zone) return;
    this.zone = zone;
    this.cameras.main.setBackgroundColor(ZONE_PALETTES[zone].background);
    for (const [id, emitter] of Object.entries(this.ambience)) emitter.emitting = id === zone;
    this.showZoneDecor(zone);
    this.ui.zoneTitle(UI_TEXT.zoneNames[zone]);
    if (!this.bossActive) audioDirector.playMusic(zone);
  }

  private refreshHud(): void {
    this.ui.setHud(
      this.vitals.tokens,
      this.vitals.maxTokens,
      this.vitals.context,
      VITALS.maxContext,
      SPELL.cost,
    );
    this.ui.setNotes(UI_TEXT.notes(this.save.notes.length, this.totalNotes()));
  }

  // ---------------------------------------------------------------- abilities

  /** "Chispa ✻": spend Contexto to throw a spark in the facing direction. */
  private castSpark(): void {
    if (this.castMs > 0 || this.dashMs > 0) return;
    if (!this.vitals.spendContext(SPELL.cost)) {
      this.ui.toast(UI_TEXT.noContext, 1200);
      return;
    }
    this.castMs = SPELL.castLockMs;
    audioDirector.playSfx('swing');
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.facing * SPELL.recoil);
    this.setSquash(1.25, 0.8);
    burst(this, this.player.x + this.facing * 10, this.player.y, COLORS.clawdLight, 8, 14);
    this.sparks.push(
      new SoulSpark(this, this.player.x + this.facing * 14, this.player.y - 1, this.facing),
    );
  }

  private updateSparks(dt: number): void {
    const isSolid = (x: number, y: number): boolean => this.layer.getTileAtWorldXY(x, y) !== null;
    this.sparks = this.sparks.filter((spark) => {
      if (!spark.update(dt, isSolid)) return false;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        if (!Phaser.Geom.Rectangle.Overlaps(spark.bounds, enemy.sprite.getBounds())) continue;
        if (!spark.registerHit(enemy)) continue;
        this.damageEnemy(enemy, SPELL.damage, false);
        impactStar(this, spark.x, spark.y);
        audioDirector.playSfx('hit');
      }
      const bossHit =
        this.bossActive &&
        this.bossHp > 0 &&
        Phaser.Geom.Rectangle.Overlaps(spark.bounds, this.boss.getBounds()) &&
        spark.registerHit(this.boss);
      if (bossHit) {
        this.damageBoss(SPELL.damage, false);
        impactStar(this, spark.x, spark.y);
      }
      return true;
    });
  }

  private startDance(): void {
    this.stopDance();
    const id = danceAt(this.danceCount);
    this.danceCount++;
    this.dance = { id, ms: 0, beat: -1 };
    const index = DANCE_ORDER.indexOf(id) + 1;
    this.ui.toast(UI_TEXT.dance(index, DANCE_ORDER.length, DANCE_NAMES[id]), 1800);
    audioDirector.playSfx('select');
    if (id === 'thinking') {
      const style = {
        fontFamily: 'Georgia, serif',
        color: COLORS.clawdLight,
        resolution: CANVAS_SCALE,
      };
      this.danceGlyph = this.add
        .text(this.player.x, this.player.y - 22, '✻', { ...style, fontSize: '12px' })
        .setOrigin(0.5)
        .setDepth(8);
      const verb = THINKING_VERBS[this.danceCount % THINKING_VERBS.length] ?? '';
      this.danceCaption = this.add
        .text(this.player.x, this.player.y - 34, verb, {
          ...style,
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '7px',
          color: COLORS.cloudLight,
        })
        .setOrigin(0.5)
        .setDepth(8);
    }
  }

  private stopDance(): void {
    this.dance = null;
    this.danceGlyph?.destroy();
    this.danceCaption?.destroy();
    this.danceGlyph = null;
    this.danceCaption = null;
    this.view.setAngle(0);
  }

  private renderDance(body: Phaser.Physics.Arcade.Body): void {
    if (!this.dance) return;
    const pose = dancePose(this.dance.id, this.dance.ms);
    const key = pose.look < 0 ? 'clawdLeft' : pose.look > 0 ? 'clawdRight' : 'clawd';
    const y = body.bottom + 2 + pose.offsetY;
    this.view
      .setTexture(key, POSE_FRAME[pose.pose])
      .setPosition(this.player.x, y)
      .setScale(pose.scaleX, pose.scaleY)
      .setAngle(pose.angle)
      .setAlpha(1);
    if (pose.beat !== this.dance.beat) {
      this.dance.beat = pose.beat;
      if (this.dance.id === 'hooray') confetti(this, this.player.x, y - 18);
      if (this.dance.id === 'turntable') this.dust(this.player.x, body.bottom, 3);
      this.danceGlyph?.setText(SPINNER_GLYPHS[pose.beat % SPINNER_GLYPHS.length] ?? '✻');
    }
    this.danceGlyph?.setPosition(this.player.x, y - 26);
    this.danceCaption?.setPosition(this.player.x, y - 36);
  }

  private spawnBench(entity: WorldEntity, x: number, y: number): void {
    const sprite = this.add.sprite(x, y - 10, 'bench', 0).setDepth(1);
    this.props.push({ entity, sprite });
    this.add
      .image(x + 18, y - 14, 'halo')
      .setTint(hexToNumber(COLORS.peach))
      .setAlpha(0.35)
      .setScale(1.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(0);
    // Steam rising from Luz's coffee mug.
    this.time.addEvent({
      delay: STEAM_INTERVAL_MS,
      loop: true,
      callback: () => {
        const puff = this.add
          .rectangle(
            x + 18 + Phaser.Math.Between(-1, 1),
            y - 12,
            2,
            2,
            hexToNumber(COLORS.ivory),
            0.6,
          )
          .setDepth(2);
        this.tweens.add({
          targets: puff,
          y: y - 26,
          x: puff.x + Phaser.Math.Between(-3, 3),
          alpha: 0,
          duration: 1400,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  /** Sit on a bench: save here and refill Tokens one by one. */
  private startRest(bench: Pickup): void {
    this.rest = { bench, refillMs: 0 };
    this.stopDance();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.player.setX(bench.sprite.x - 4);
    this.persist({ checkpointId: bench.entity.id });
    this.ui.toast(UI_TEXT.resting);
    audioDirector.playSfx('commit');
    this.ui.setHint('');
    burst(this, this.player.x, this.player.y, COLORS.peach, 12, 20);
  }

  private updateRest(dt: number, leaving: boolean): void {
    if (!this.rest) return;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    this.rest.refillMs += dt;
    if (this.rest.refillMs >= REST.refillIntervalMs) {
      this.rest.refillMs = 0;
      if (this.vitals.addToken()) {
        burst(this, this.player.x, this.player.y - 6, COLORS.ivory, 6, 12);
        audioDirector.playSfx('heal');
      }
    }
    if (leaving) {
      this.rest = null;
      this.setSquash(0.85, 1.2);
    }
  }

  private isActiveCommit(commitId: string): boolean {
    const checkpoint = this.save.checkpointId;
    return checkpoint === commitId || BENCH_COMMIT[checkpoint] === commitId;
  }

  // ---------------------------------------------------------------- helpers

  private totalNotes(): number {
    return ENTITIES.filter((e) => e.kind === 'note').length;
  }

  private hasAbility(): boolean {
    return this.save.abilities.includes('complete');
  }

  private persist(patch: Partial<SaveData>): void {
    this.save = { ...this.save, ...patch };
    this.store.save(this.save);
  }

  private checkpointPosition(id: string): Phaser.Math.Vector2 {
    const entity = ENTITIES.find((e) => e.id === id) ?? ENTITIES.find((e) => e.kind === 'player');
    const col = entity?.col ?? 10;
    const row = entity?.row ?? 16;
    return new Phaser.Math.Vector2(col * TILE + TILE / 2, row * TILE + TILE - 12);
  }

  private isSpikeAt(x: number, y: number): boolean {
    return this.spikes.has(`${Math.floor(x / TILE)},${Math.floor(y / TILE)}`);
  }

  private isOnSpikes(): boolean {
    return this.isSpikeAt(this.player.x, this.player.y + 8);
  }

  private isSpikeBelow(): boolean {
    return this.isSpikeAt(this.player.x, this.player.y + TILE);
  }

  private spikeInRect(rect: Phaser.Geom.Rectangle): boolean {
    return this.isSpikeAt(rect.centerX, rect.bottom);
  }
}

export const VIEW = { width: GAME_WIDTH, height: GAME_HEIGHT };
