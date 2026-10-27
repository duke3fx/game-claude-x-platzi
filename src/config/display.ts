/** Logical world view in world pixels (what the main camera shows). */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/**
 * The canvas is rendered at 2x the logical view. The world camera zooms 2x, so pixel art stays
 * chunky while UI text (drawn by an unzoomed camera) stays crisp.
 */
export const CANVAS_SCALE = 2;

/** One pixel-art "cell" in world pixels. Every sprite grid is drawn at this scale. */
export const CELL = 2;

/** World tile size in world pixels (8x8 cells). */
export const TILE = 16;
