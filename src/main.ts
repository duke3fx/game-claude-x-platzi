import Phaser from 'phaser';
import { audioDirector } from './audio/AudioDirector';
import { CANVAS_SCALE, GAME_HEIGHT, GAME_WIDTH } from './config/display';
import { COLORS } from './config/palette';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UiScene } from './scenes/UiScene';

/** Waits (briefly) for the display font so the first frames don't render with a fallback. */
async function loadFonts(): Promise<void> {
  const FONT_TIMEOUT_MS = 2500;
  try {
    await Promise.race([
      document.fonts.load('44px "Cinzel"'),
      new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
    ]);
  } catch {
    // Offline or blocked: the serif fallback is fine.
  }
}

await loadFonts();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH * CANVAS_SCALE,
  height: GAME_HEIGHT * CANVAS_SCALE,
  backgroundColor: COLORS.nearBlack,
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  input: { gamepad: true },
  // Sound is synthesized by our own AudioDirector; Phaser's audio context would sit unused.
  audio: { noAudio: true },
  scene: [BootScene, GameScene, UiScene],
});

// Browsers only allow audio after a user gesture; unlock() is cheap after the first call.
for (const type of ['keydown', 'pointerdown'] as const) {
  window.addEventListener(type, () => audioDirector.unlock());
}

// `?debug` exposes the game instance so headless smoke tests can inspect and drive it.
if (new URLSearchParams(window.location.search).has('debug')) {
  Object.assign(window, { agentGame: game });
}
