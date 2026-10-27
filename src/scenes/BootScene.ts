import Phaser from 'phaser';
import { bakeBasicArt } from '../gfx/basicArt';
import { withEyesShifted } from '../gfx/clawdLook';
import { bakeSprite } from '../gfx/pixelArt';
import { CLAWD } from '../gfx/sprites';
import { bakeTileset } from '../gfx/tiles';
import { SCENES } from './sceneKeys';

/** Generates every code-defined texture before the first real scene starts. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    bakeSprite(this.textures, 'clawd', CLAWD);
    bakeSprite(this.textures, 'clawdLeft', withEyesShifted(CLAWD, -1));
    bakeSprite(this.textures, 'clawdRight', withEyesShifted(CLAWD, 1));
    bakeBasicArt(this.textures);
    bakeTileset(this.textures);
    this.scene.start(SCENES.game);
  }
}
