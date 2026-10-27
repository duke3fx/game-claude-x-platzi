import Phaser from 'phaser';
import { audioDirector } from '../audio/AudioDirector';
import { GAME_HEIGHT, GAME_WIDTH, UI_ZOOM } from '../config/display';
import { COLORS, hexToNumber } from '../config/palette';
import { createTitleBackdrop } from '../systems/titleBackdrop';
import { SCENES } from './sceneKeys';

/** UI layout space (960x540); the camera zooms it to the full canvas. */
const W = GAME_WIDTH * UI_ZOOM;
const H = GAME_HEIGHT * UI_ZOOM;
const FONT = 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace';
const SERIF = '"Cinzel", Georgia, "Times New Roman", serif';
const ZONE_TITLE_HOLD_MS = 2200;
const TOKEN_FX_MS = 450;
const TOKEN_X = 98;
const TOKEN_Y = 34;
const TOKEN_STEP = 26;
const TOKEN_W = 18;
const TOKEN_H = 28;

interface TokenFx {
  readonly index: number;
  readonly kind: 'lost' | 'gained';
  readonly at: number;
}
const CARD_MS = 3200;

const isConfirmKey = (event: KeyboardEvent): boolean =>
  event.code === 'KeyZ' || event.code === 'Enter' || event.code === 'Space';

/** HUD and overlays, drawn by an unzoomed camera so text stays crisp. */
export class UiScene extends Phaser.Scene {
  private hud!: Phaser.GameObjects.Graphics;
  private notesText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private panelTitle!: Phaser.GameObjects.Text;
  private panelBody!: Phaser.GameObjects.Text;
  private cardBg!: Phaser.GameObjects.Rectangle;
  private cardText!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Graphics;
  private toastTimer: Phaser.Time.TimerEvent | null = null;
  private zoneCard!: Phaser.GameObjects.Container;
  private zoneText!: Phaser.GameObjects.Text;
  private prevTokens = -1;
  private tokenFx: TokenFx[] = [];
  panelOpen = false;
  cardsPlaying = false;

  constructor() {
    super(SCENES.ui);
  }

  create(): void {
    this.cameras.main.setZoom(UI_ZOOM).centerOn(W / 2, H / 2);
    this.hud = this.add.graphics();
    this.bossBar = this.add.graphics();
    this.notesText = this.add
      .text(W - 24, 22, '', this.style(18, COLORS.cloudLight))
      .setOrigin(1, 0);
    this.hintText = this.add
      .text(W / 2, H - 46, '', { ...this.style(20, COLORS.ivory), align: 'center' })
      .setOrigin(0.5, 1)
      .setWordWrapWidth(W - 160);
    this.toastText = this.add
      .text(W / 2, 70, '', this.style(24, COLORS.clawdLight))
      .setOrigin(0.5, 0)
      .setAlpha(0);

    this.zoneText = this.add
      .text(W / 2, 150, '', { ...this.style(44, COLORS.ivory), fontFamily: SERIF })
      .setOrigin(0.5);
    const ornament = this.add.graphics();
    this.drawOrnament(ornament, W / 2, 110, 260);
    this.drawOrnament(ornament, W / 2, 192, 200);
    this.zoneCard = this.add.container(0, 0, [ornament, this.zoneText]).setAlpha(0);

    const box = this.add
      .rectangle(W / 2, H / 2, W - 220, 260, hexToNumber(COLORS.nearBlack), 0.94)
      .setStrokeStyle(2, hexToNumber(COLORS.clawdBody));
    this.panelTitle = this.add.text(150, H / 2 - 110, '', this.style(20, COLORS.clawdLight));
    this.panelBody = this.add
      .text(150, H / 2 - 70, '', { ...this.style(22, COLORS.ivory), lineSpacing: 8 })
      .setWordWrapWidth(W - 300);
    const close = this.add
      .text(W - 130, H / 2 + 110, '[Z] cerrar', this.style(16, COLORS.cloudMedium))
      .setOrigin(1, 1);
    this.panel = this.add
      .container(0, 0, [box, this.panelTitle, this.panelBody, close])
      .setVisible(false);

    this.cardBg = this.add.rectangle(W / 2, H / 2, W, H, hexToNumber(COLORS.nearBlack)).setAlpha(0);
    this.cardText = this.add
      .text(W / 2, H / 2, '', {
        ...this.style(28, COLORS.ivory),
        fontFamily: SERIF,
        align: 'center',
        lineSpacing: 12,
      })
      .setOrigin(0.5)
      .setWordWrapWidth(W - 240)
      .setAlpha(0);
  }

  /** Thin line with a diamond in the middle, like an engraved divider. */
  private drawOrnament(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number): void {
    g.lineStyle(2, hexToNumber(COLORS.ivory), 0.85);
    g.lineBetween(x - width / 2, y, x - 12, y);
    g.lineBetween(x + 12, y, x + width / 2, y);
    g.fillStyle(hexToNumber(COLORS.clawdLight));
    g.fillTriangle(x - 8, y, x, y - 6, x + 8, y);
    g.fillTriangle(x - 8, y, x, y + 6, x + 8, y);
    g.fillStyle(hexToNumber(COLORS.ivory));
    g.fillCircle(x - width / 2, y, 3);
    g.fillCircle(x + width / 2, y, 3);
  }

  /** Area title card that fades in and out when entering a zone. */
  zoneTitle(name: string): void {
    this.zoneText.setText(name.toUpperCase().split('').join(' '));
    this.tweens.killTweensOf(this.zoneCard);
    this.zoneCard.setAlpha(0);
    this.tweens.add({
      targets: this.zoneCard,
      alpha: 1,
      duration: 900,
      hold: ZONE_TITLE_HOLD_MS,
      yoyo: true,
    });
  }

  private style(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: FONT, fontSize: `${size}px`, color, resolution: UI_ZOOM };
  }

  setHud(
    tokens: number,
    maxTokens: number,
    context: number,
    maxContext: number,
    readyCost: number,
  ): void {
    const now = this.time.now;
    this.trackTokenChanges(tokens, now);
    const g = this.hud;
    g.clear();
    this.drawVessel(g, context, maxContext, context >= readyCost, now);
    for (let i = 0; i < maxTokens; i++) {
      const x = TOKEN_X + i * TOKEN_STEP;
      if (i < tokens) {
        g.fillStyle(hexToNumber(COLORS.ivory));
        g.fillRect(x, TOKEN_Y, TOKEN_W, TOKEN_H);
        g.fillStyle(hexToNumber(COLORS.cloudMedium));
        g.fillRect(x, TOKEN_Y + 22, TOKEN_W, 6);
      }
      g.lineStyle(2, hexToNumber(i < tokens ? COLORS.ink : COLORS.cloudDark));
      g.strokeRect(x, TOKEN_Y, TOKEN_W, TOKEN_H);
    }
    this.drawTokenFx(g, now);
  }

  private trackTokenChanges(tokens: number, now: number): void {
    if (this.prevTokens >= 0 && tokens !== this.prevTokens) {
      const kind = tokens < this.prevTokens ? 'lost' : 'gained';
      const [from, to] = kind === 'lost' ? [tokens, this.prevTokens] : [this.prevTokens, tokens];
      for (let i = from; i < to; i++) this.tokenFx.push({ index: i, kind, at: now });
    }
    this.prevTokens = tokens;
    this.tokenFx = this.tokenFx.filter((fx) => now - fx.at < TOKEN_FX_MS);
  }

  /** Context vessel: a dark orb that fills with warm light and pulses when a spark is ready. */
  private drawVessel(
    g: Phaser.GameObjects.Graphics,
    context: number,
    maxContext: number,
    ready: boolean,
    now: number,
  ): void {
    const cx = 56;
    const cy = 52;
    g.fillStyle(hexToNumber(COLORS.nearBlack), 0.8);
    g.fillCircle(cx, cy, 30);
    const ratio = Math.max(0, Math.min(1, context / maxContext));
    if (ratio > 0) {
      g.fillStyle(hexToNumber(COLORS.clawdLight), 0.25);
      g.fillCircle(cx, cy, 26);
      g.fillStyle(hexToNumber(COLORS.clawdLight), 0.9);
      g.fillCircle(cx, cy, 26 * ratio);
    }
    if (ready) {
      const pulse = (Math.sin(now / 180) + 1) / 2;
      g.lineStyle(3, hexToNumber(COLORS.clawdLight), 0.3 + pulse * 0.5);
      g.strokeCircle(cx, cy, 36 + pulse * 3);
    }
    g.lineStyle(3, hexToNumber(COLORS.ivory));
    g.strokeCircle(cx, cy, 30);
    g.lineStyle(1, hexToNumber(COLORS.ivory), 0.5);
    g.strokeCircle(cx, cy, 35);
    g.lineBetween(cx + 35, cy, cx + 50, cy);
  }

  /** Lost Tokens shatter into four shards; regained ones flash with a warm ring. */
  private drawTokenFx(g: Phaser.GameObjects.Graphics, now: number): void {
    for (const fx of this.tokenFx) {
      const p = (now - fx.at) / TOKEN_FX_MS;
      const x = TOKEN_X + fx.index * TOKEN_STEP;
      if (fx.kind === 'lost') {
        g.fillStyle(hexToNumber(COLORS.ivory), 1 - p);
        const spread = p * 14;
        const half = TOKEN_W / 2;
        const halfH = TOKEN_H / 2;
        g.fillRect(x - spread, TOKEN_Y - spread, half, halfH);
        g.fillRect(x + half + spread, TOKEN_Y - spread, half, halfH);
        g.fillRect(x - spread, TOKEN_Y + halfH + spread, half, halfH);
        g.fillRect(x + half + spread, TOKEN_Y + halfH + spread, half, halfH);
      } else {
        const grow = p * 8;
        g.lineStyle(2, hexToNumber(COLORS.clawdLight), 1 - p);
        g.strokeRect(x - grow, TOKEN_Y - grow, TOKEN_W + grow * 2, TOKEN_H + grow * 2);
      }
    }
  }

  setNotes(text: string): void {
    this.notesText.setText(text);
  }

  setHint(text: string): void {
    if (this.hintText.text !== text) this.hintText.setText(text);
  }

  toast(text: string, ms = 2200): void {
    this.toastText.setText(text).setAlpha(1);
    this.toastTimer?.remove();
    this.toastTimer = this.time.delayedCall(ms, () => {
      this.tweens.add({ targets: this.toastText, alpha: 0, duration: 400 });
    });
  }

  showPanel(title: string, body: string): void {
    this.panelTitle.setText(title);
    this.panelBody.setText(body);
    this.panel.setVisible(true);
    this.panelOpen = true;
  }

  hidePanel(): void {
    this.panel.setVisible(false);
    this.panelOpen = false;
  }

  setBoss(ratio: number | null): void {
    const g = this.bossBar;
    g.clear();
    if (ratio === null) return;
    const width = 420;
    g.fillStyle(hexToNumber(COLORS.ink), 0.8);
    g.fillRect(W / 2 - width / 2, H - 30, width, 8);
    g.fillStyle(hexToNumber(COLORS.ivory));
    g.fillRect(W / 2 - width / 2, H - 30, width * ratio, 8);
  }

  /** Full-screen text cards. Advance with Z/Enter, a tap, or automatically. */
  playCards(cards: readonly string[], onDone: () => void): void {
    this.cardsPlaying = true;
    this.cardBg.setAlpha(1);
    let index = 0;
    let timer: Phaser.Time.TimerEvent | null = null;
    const keyboard = this.input.keyboard;
    const show = (): void => {
      timer?.remove();
      const card = cards[index];
      if (card === undefined) {
        keyboard?.off('keydown', advance);
        this.input.off('pointerdown', next);
        this.tweens.add({ targets: [this.cardBg, this.cardText], alpha: 0, duration: 500 });
        this.cardsPlaying = false;
        onDone();
        return;
      }
      this.cardText.setText(card).setAlpha(0);
      this.tweens.add({ targets: this.cardText, alpha: 1, duration: 400 });
      timer = this.time.delayedCall(CARD_MS, () => {
        index++;
        show();
      });
    };
    const next = (): void => {
      audioDirector.playSfx('select');
      index++;
      show();
    };
    const advance = (event: KeyboardEvent): void => {
      if (isConfirmKey(event)) next();
    };
    keyboard?.on('keydown', advance);
    this.input.on('pointerdown', next);
    show();
  }

  /** Title screen: waits for a key or a tap, then calls onStart. */
  showTitle(onStart: () => void, subtitle: string, prompt: string, controls: string): void {
    const backdrop = createTitleBackdrop(this);
    const title = this.add
      .text(W / 2, 150, 'A G E N T', {
        ...this.style(104, COLORS.ivory),
        fontFamily: SERIF,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 16, fill: true },
      })
      .setOrigin(0.5);
    const ornament = this.add.graphics();
    this.drawOrnament(ornament, W / 2, 222, 380);
    const sub = this.add
      .text(W / 2, 254, subtitle, {
        ...this.style(22, COLORS.cloudLight),
        shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6, fill: true },
      })
      .setOrigin(0.5);
    const press = this.add
      .text(W / 2, 340, prompt, {
        ...this.style(22, COLORS.ivory),
        shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6, fill: true },
      })
      .setOrigin(0.5);
    const help = this.add
      .text(W / 2, H - 22, controls.replace(/ · (V toque)/, '\n$1'), {
        ...this.style(15, COLORS.cloudLight),
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 1);
    this.tweens.add({
      targets: title,
      y: title.y - 6,
      duration: 3200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({ targets: press, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
    const keyboard = this.input.keyboard;
    const begin = (): void => {
      keyboard?.off('keydown', onKey);
      this.input.off('pointerdown', begin);
      audioDirector.playSfx('confirm');
      this.tweens.add({ targets: [title, ornament, sub, press, help], alpha: 0, duration: 400 });
      backdrop.fadeOut(() => {
        for (const obj of [title, ornament, sub, press, help]) {
          this.tweens.killTweensOf(obj);
          obj.destroy();
        }
        onStart();
      });
    };
    const onKey = (event: KeyboardEvent): void => {
      if (isConfirmKey(event)) begin();
    };
    keyboard?.on('keydown', onKey);
    this.input.on('pointerdown', begin);
  }
}
