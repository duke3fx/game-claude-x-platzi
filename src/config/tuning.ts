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
  reach: 40,
  thickness: 32,
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

/** "Chispa ✻": tap the heal key to throw a soul projectile that costs Contexto. */
export const SPELL = {
  cost: 33,
  speed: 300,
  damage: 2,
  lifetimeMs: 900,
  tapMaxMs: 180,
  recoil: 70,
  castLockMs: 240,
} as const;

/** Resting on a bench refills one Token every interval. */
export const REST = {
  refillIntervalMs: 220,
  seatLift: 8,
} as const;

export const HIT_FX = {
  slashSweepMs: 90,
  slashFadeMs: 110,
  slashRadius: 30,
  slashThickness: 13,
  impactMs: 160,
  impactShakeMs: 70,
  impactShakeIntensity: 0.0025,
  hurtStopMs: 150,
} as const;
