import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { bakeSprite } from '../gfx/pixelArt';
import { CLAWD } from '../gfx/sprites';
import { SCENES } from './sceneKeys';

/** Generates every code-defined texture before the first real scene starts. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    bakeSprite(this.textures, 'clawd', CLAWD);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'clawd', 0);
  }
}
