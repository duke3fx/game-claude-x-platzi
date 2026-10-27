import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, UI_ZOOM } from '../config/display';
import { COLORS, hexToNumber } from '../config/palette';
import { SCENES } from './sceneKeys';

/** UI layout space (960x540); the camera zooms it to the full canvas. */
const W = GAME_WIDTH * UI_ZOOM;
const H = GAME_HEIGHT * UI_ZOOM;
const FONT = 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace';
const SERIF = '"Cinzel", Georgia, "Times New Roman", serif';
const ZONE_TITLE_HOLD_MS = 2200;
const CARD_MS = 3200;

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

  setHud(tokens: number, maxTokens: number, context: number, maxContext: number): void {
    const g = this.hud;
    g.clear();
    // Context vessel: a dark orb that fills with warm light.
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
    g.lineStyle(3, hexToNumber(COLORS.ivory));
    g.strokeCircle(cx, cy, 30);
    g.lineStyle(1, hexToNumber(COLORS.ivory), 0.5);
    g.strokeCircle(cx, cy, 35);
    g.lineBetween(cx + 35, cy, cx + 50, cy);
    // Tokens: ivory blocks with ink outlines; spent ones are hollow.
    for (let i = 0; i < maxTokens; i++) {
      const x = 98 + i * 26;
      const y = 34;
      if (i < tokens) {
        g.fillStyle(hexToNumber(COLORS.ivory));
        g.fillRect(x, y, 18, 28);
        g.fillStyle(hexToNumber(COLORS.cloudMedium));
        g.fillRect(x, y + 22, 18, 6);
      }
      g.lineStyle(2, hexToNumber(i < tokens ? COLORS.ink : COLORS.cloudDark));
      g.strokeRect(x, y, 18, 28);
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

  /** Full-screen text cards. Advance with Z/Enter or automatically. */
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
    const advance = (event: KeyboardEvent): void => {
      if (event.code !== 'KeyZ' && event.code !== 'Enter' && event.code !== 'Space') return;
      index++;
      show();
    };
    keyboard?.on('keydown', advance);
    show();
  }

  /** Title screen: waits for a key, then calls onStart. */
  showTitle(onStart: () => void, subtitle: string, prompt: string, controls: string): void {
    const bg = this.add.rectangle(W / 2, H / 2, W, H, hexToNumber(COLORS.nearBlack));
    const title = this.add
      .text(W / 2, H / 2 - 90, 'A G E N T', { ...this.style(96, COLORS.ivory), fontFamily: SERIF })
      .setOrigin(0.5);
    const ornament = this.add.graphics();
    this.drawOrnament(ornament, W / 2, H / 2 - 28, 360);
    const sub = this.add
      .text(W / 2, H / 2, subtitle, this.style(22, COLORS.cloudLight))
      .setOrigin(0.5);
    const press = this.add
      .text(W / 2, H / 2 + 80, prompt, this.style(22, COLORS.ivory))
      .setOrigin(0.5);
    const help = this.add
      .text(W / 2, H - 40, controls, this.style(16, COLORS.cloudDark))
      .setOrigin(0.5);
    this.tweens.add({ targets: press, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
    const keyboard = this.input.keyboard;
    const start = (event: KeyboardEvent): void => {
      if (event.code !== 'KeyZ' && event.code !== 'Enter' && event.code !== 'Space') return;
      keyboard?.off('keydown', start);
      for (const obj of [bg, title, ornament, sub, press, help]) obj.destroy();
      onStart();
    };
    keyboard?.on('keydown', start);
  }
}
