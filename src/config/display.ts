/** Logical world view in world pixels (what the main camera shows). */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/**
 * The canvas is rendered at 4x the logical view (1920x1080). The world camera zooms 4x, so pixel
 * art scales by an exact integer and stays sharp on large and high-DPI screens.
 */
export const CANVAS_SCALE = 4;

/** The UI is laid out on a 960x540 grid and drawn by a 2x camera with high-resolution text. */
export const UI_ZOOM = 2;

/** One pixel-art "cell" in world pixels. Every sprite grid is drawn at this scale. */
export const CELL = 2;

/** World tile size in world pixels (8x8 cells). */
export const TILE = 16;
