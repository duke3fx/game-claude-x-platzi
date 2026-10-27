import Phaser from 'phaser';
import { ACCESSORY_IDS } from '../core/accessories';
import { accessorySheet, gearKey } from '../gfx/accessories';
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
    const sheets = {
      clawd: CLAWD_POSES,
      clawdLeft: withEyesShifted(CLAWD_POSES, -1),
      clawdRight: withEyesShifted(CLAWD_POSES, 1),
    };
    for (const [key, sheet] of Object.entries(sheets)) {
      bakeSprite(this.textures, key, sheet);
      // Each accessory gets a sheet per look, so glasses follow the eyes.
      for (const id of ACCESSORY_IDS) {
        bakeSprite(this.textures, gearKey(key, id), accessorySheet(sheet, id));
      }
    }
    bakeBasicArt(this.textures);
    bakeTileset(this.textures);
    this.scene.start(SCENES.game);
  }
}
