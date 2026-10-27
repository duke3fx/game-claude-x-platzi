import Phaser from 'phaser';
import { audioDirector } from '../audio/AudioDirector';
import { GAME_HEIGHT, GAME_WIDTH, UI_ZOOM } from '../config/display';
import { COLORS, hexToNumber } from '../config/palette';
import { WARDROBE_TEXT } from '../content/script';
import type { AccessoryId } from '../core/accessories';
import { gearKey } from '../gfx/accessories';
import { isTouchDevice } from '../input/touchControls';
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

/** Bench wardrobe layout: a strip high on the screen, so Clawd on the bench stays visible. */
const WARDROBE = {
  centerY: 190,
  width: 720,
  height: 196,
  slotW: 88,
  slotH: 72,
  slotGap: 16,
  slotY: 170,
  iconScale: 1.5,
} as const;

/** One wardrobe slot as the game describes it. */
export interface WardrobeSlotView {
  readonly id: AccessoryId | null;
  readonly name: string;
  readonly detail: string;
  readonly locked: boolean;
  readonly equipped: boolean;
}

interface WardrobeSlotUi {
  readonly frame: Phaser.GameObjects.Rectangle;
  readonly clawd: Phaser.GameObjects.Image;
  readonly gear: Phaser.GameObjects.Image;
  readonly mark: Phaser.GameObjects.Text;
}

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
  private bossName!: Phaser.GameObjects.Text;
  private bossCard!: Phaser.GameObjects.Container;
  private bossCardName!: Phaser.GameObjects.Text;
  private bossCardEpithet!: Phaser.GameObjects.Text;
  private prevTokens = -1;
  private tokenFx: TokenFx[] = [];
  private wardrobe: Phaser.GameObjects.Container | null = null;
  private wardrobeSlots: WardrobeSlotUi[] = [];
  private wardrobeName!: Phaser.GameObjects.Text;
  private wardrobeDetail!: Phaser.GameObjects.Text;
  panelOpen = false;
  cardsPlaying = false;

  constructor() {
    super(SCENES.ui);
  }

  create(): void {
    this.cameras.main.setZoom(UI_ZOOM).centerOn(W / 2, H / 2);
    this.hud = this.add.graphics();
    this.bossBar = this.add.graphics();
    this.bossName = this.add
      .text(W / 2, H - 36, '', { ...this.style(18, COLORS.ivory), fontFamily: SERIF })
      .setOrigin(0.5, 1)
      .setVisible(false);
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

    this.bossCardEpithet = this.add
      .text(W / 2, H - 150, '', { ...this.style(20, COLORS.cloudLight), fontFamily: SERIF })
      .setOrigin(0.5);
    this.bossCardName = this.add
      .text(W / 2, H - 112, '', { ...this.style(48, COLORS.ivory), fontFamily: SERIF })
      .setOrigin(0.5);
    const bossOrnament = this.add.graphics();
    this.drawOrnament(bossOrnament, W / 2, H - 78, 300);
    this.bossCard = this.add
      .container(0, 0, [this.bossCardEpithet, this.bossCardName, bossOrnament])
      .setAlpha(0);

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

  /** Hollow-Knight-style boss card: small epithet over a big name, low on the screen. */
  bossTitle(name: string, epithet: string): void {
    this.bossCardEpithet.setText(epithet);
    this.bossCardName.setText(name.toUpperCase().split('').join(' '));
    this.tweens.killTweensOf(this.bossCard);
    this.bossCard.setAlpha(0);
    this.tweens.add({
      targets: this.bossCard,
      alpha: 1,
      duration: 700,
      hold: ZONE_TITLE_HOLD_MS,
      yoyo: true,
    });
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

  /** Shows (or refreshes) the bench wardrobe with the cursor on one slot. */
  showWardrobe(slots: readonly WardrobeSlotView[], cursor: number): void {
    if (!this.wardrobe) this.buildWardrobe(slots.length);
    this.wardrobe?.setVisible(true);
    this.hintText.setVisible(false);
    this.toastTimer?.remove();
    this.toastText.setAlpha(0);
    slots.forEach((slot, index) => {
      const ui = this.wardrobeSlots[index];
      if (!ui) return;
      const selected = index === cursor;
      ui.frame
        .setStrokeStyle(
          selected ? 3 : 1,
          hexToNumber(selected ? COLORS.clawdLight : COLORS.cloudMedium),
          selected ? 1 : 0.5,
        )
        .setFillStyle(hexToNumber(COLORS.ink), selected ? 0.9 : 0.6);
      ui.clawd.setAlpha(slot.locked ? 0.35 : 1);
      ui.gear.setVisible(slot.id !== null);
      if (slot.id !== null) {
        ui.gear.setTexture(gearKey('clawd', slot.id), 0);
        // Locked accessories show only as a silhouette.
        if (slot.locked)
          ui.gear.setTint(hexToNumber(COLORS.cloudMedium)).setTintMode(Phaser.TintModes.FILL);
        else ui.gear.clearTint();
      }
      ui.mark.setText(slot.equipped ? '✓' : slot.locked ? '?' : '');
    });
    const current = slots[cursor];
    this.wardrobeName.setText(current ? current.name : '');
    this.wardrobeDetail.setText(current ? current.detail : '');
  }

  hideWardrobe(): void {
    this.wardrobe?.setVisible(false);
    this.hintText.setVisible(true);
  }

  private buildWardrobe(count: number): void {
    const { centerY, width, height, slotW, slotH, slotGap, slotY, iconScale } = WARDROBE;
    const top = centerY - height / 2;
    const left = W / 2 - width / 2;
    const box = this.add
      .rectangle(W / 2, centerY, width, height, hexToNumber(COLORS.nearBlack), 0.92)
      .setStrokeStyle(2, hexToNumber(COLORS.clawdBody));
    const title = this.add
      .text(left + 24, top + 18, WARDROBE_TEXT.title.toUpperCase(), {
        ...this.style(20, COLORS.ivory),
        fontFamily: SERIF,
      })
      .setOrigin(0, 0.5);
    const controls = this.add
      .text(
        left + width - 24,
        top + 18,
        isTouchDevice() ? WARDROBE_TEXT.controlsTouch : WARDROBE_TEXT.controls,
        this.style(14, COLORS.cloudMedium),
      )
      .setOrigin(1, 0.5);
    const rowWidth = count * slotW + (count - 1) * slotGap;
    const children: Phaser.GameObjects.GameObject[] = [box, title, controls];
    this.wardrobeSlots = Array.from({ length: count }, (_, index) => {
      const x = W / 2 - rowWidth / 2 + slotW / 2 + index * (slotW + slotGap);
      const frame = this.add.rectangle(x, slotY, slotW, slotH, hexToNumber(COLORS.ink), 0.6);
      const feet = slotY + slotH / 2 - 10;
      const clawd = this.add.image(x, feet, 'clawd', 0).setOrigin(0.5, 1).setScale(iconScale);
      const gear = this.add.image(x, feet, 'clawd', 0).setOrigin(0.5, 1).setScale(iconScale);
      const mark = this.add
        .text(x + slotW / 2 - 6, slotY - slotH / 2 + 4, '', this.style(14, COLORS.clawdLight))
        .setOrigin(1, 0);
      children.push(frame, clawd, gear, mark);
      return { frame, clawd, gear, mark };
    });
    this.wardrobeName = this.add
      .text(W / 2, slotY + slotH / 2 + 22, '', this.style(20, COLORS.clawdLight))
      .setOrigin(0.5);
    this.wardrobeDetail = this.add
      .text(W / 2, slotY + slotH / 2 + 48, '', this.style(16, COLORS.ivory))
      .setOrigin(0.5);
    children.push(this.wardrobeName, this.wardrobeDetail);
    this.wardrobe = this.add.container(0, 0, children);
  }

  setBoss(ratio: number | null, name = ''): void {
    const g = this.bossBar;
    g.clear();
    this.bossName.setVisible(ratio !== null).setText(name);
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
  showTitle(
    onStart: () => void,
    subtitle: string,
    prompt: string,
    controls: string,
    accessory: AccessoryId | null = null,
  ): void {
    const backdrop = createTitleBackdrop(this, accessory);
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
