import Phaser from 'phaser';
import { CANVAS_SCALE, GAME_HEIGHT, GAME_WIDTH } from './config/display';
import { COLORS } from './config/palette';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UiScene } from './scenes/UiScene';

new Phaser.Game({
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
  scene: [BootScene, GameScene, UiScene],
});
