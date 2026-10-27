/**
 * Every gameplay "feel" number lives here, so tuning never means hunting magic numbers.
 * Units: pixels, pixels/second, pixels/second², milliseconds.
 */
export const PLAYER = {
  runSpeed: 130,
  acceleration: 1600,
  deceleration: 2200,
  jumpVelocity: 365,
  jumpCutMultiplier: 0.45,
  gravity: 980,
  maxFallSpeed: 360,
  coyoteMs: 100,
  jumpBufferMs: 120,
  bodyWidth: 22,
  bodyHeight: 16,
} as const;

export const ATTACK = {
  startupMs: 40,
  activeMs: 90,
  recoveryMs: 180,
  reach: 22,
  thickness: 18,
  damage: 1,
  pogoVelocity: 260,
  recoilVelocity: 90,
} as const;

export const DASH = {
  speed: 360,
  durationMs: 190,
  cooldownMs: 450,
} as const;

export const VITALS = {
  maxTokens: 5,
  maxContext: 99,
  contextPerHit: 11,
  healCost: 33,
  healHoldMs: 900,
} as const;

export const HURT = {
  knockbackX: 160,
  knockbackY: 180,
  invulnerableMs: 900,
  hitStopMs: 70,
  shakeMs: 120,
  shakeIntensity: 0.006,
  assistDamageMultiplier: 0.5,
} as const;

export const CAMERA = {
  lerp: 0.12,
  deadzoneWidth: 40,
  deadzoneHeight: 30,
  lookAheadY: 0,
} as const;
