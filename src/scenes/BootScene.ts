import Phaser from 'phaser';
import { bakeBasicArt } from '../gfx/basicArt';
import { withEyesShifted } from '../gfx/clawdLook';
import { CLAWD_POSES } from '../gfx/clawdPoses';
import { bakeSprite } from '../gfx/pixelArt';
import { bakeTileset } from '../gfx/tiles';
import { SCENES } from './sceneKeys';

/** Generates every code-defined texture before the first real scene starts. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    bakeSprite(this.textures, 'clawd', CLAWD_POSES);
    bakeSprite(this.textures, 'clawdLeft', withEyesShifted(CLAWD_POSES, -1));
    bakeSprite(this.textures, 'clawdRight', withEyesShifted(CLAWD_POSES, 1));
    bakeBasicArt(this.textures);
    bakeTileset(this.textures);
    this.scene.start(SCENES.game);
  }
}
