import type Phaser from 'phaser';
import { CELL } from '../config/display';

/**
 * A sprite defined as text: each character of a row maps to a palette color.
 * '.' and ' ' are always transparent. All frames must share the same size.
 */
export interface PixelSprite {
  readonly palette: Readonly<Record<string, string>>;
  readonly frames: readonly (readonly string[])[];
  /** Screen pixels per grid cell. Defaults to CELL. */
  readonly cell?: number;
}

const TRANSPARENT = new Set(['.', ' ']);

export function spriteSize(sprite: PixelSprite): { width: number; height: number } {
  const cell = sprite.cell ?? CELL;
  const first = sprite.frames[0] ?? [];
  const cols = Math.max(0, ...first.map((row) => row.length));
  return { width: cols * cell, height: first.length * cell };
}

/**
 * Draws every frame side by side into one canvas texture and registers numbered frames
 * (0..n-1), so the texture works like a spritesheet.
 */
export function bakeSprite(
  textures: Phaser.Textures.TextureManager,
  key: string,
  sprite: PixelSprite,
): void {
  if (textures.exists(key)) return;
  const cell = sprite.cell ?? CELL;
  const { width, height } = spriteSize(sprite);
  const canvas = textures.createCanvas(key, width * sprite.frames.length, height);
  if (!canvas) throw new Error(`Could not create canvas texture "${key}"`);
  const ctx = canvas.getContext();

  sprite.frames.forEach((rows, frameIndex) => {
    const offsetX = frameIndex * width;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const char = row[x] ?? '.';
        if (TRANSPARENT.has(char)) continue;
        const color = sprite.palette[char];
        if (!color) throw new Error(`Sprite "${key}" uses unknown palette char "${char}"`);
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + x * cell, y * cell, cell, cell);
      }
    });
    canvas.add(frameIndex, 0, offsetX, 0, width, height);
  });
  canvas.refresh();
}
