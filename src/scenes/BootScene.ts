import Phaser from 'phaser';
import { bakeBasicArt } from '../gfx/basicArt';
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
    bakeBasicArt(this.textures);
    this.scene.start(SCENES.game);
  }
}
