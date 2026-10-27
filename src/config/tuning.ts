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

/** Small enemies: hurtboxes (px) a bit smaller than their art, so touching feels fair. */
export const MINION = {
  grokHurtbox: { width: 22, height: 20 },
  dotsHurtbox: { width: 22, height: 22 },
  /** How far above its home tile a Dots hovers (px). */
  dotsHover: 14,
} as const;

/** On-screen controls for touch devices, as fractions of the d-pad radius. */
export const TOUCH = {
  deadZone: 0.22,
  knobTravel: 0.55,
} as const;

/** The three rival AIs: health, pacing and the numbers behind each move (px, ms, px/s). */
export const BOSS = {
  phase2At: 0.5,
  restMs: 950,
  restMsPhase2: 650,
  introMs: 1400,
  defeatMs: 1800,
  luna: {
    hp: 10,
    driftSpeed: 26,
    keepAway: 44,
    hopWindupMs: 320,
    hopMs: 900,
    hopMsPhase2: 700,
    hopHeight: 90,
    shockwaveSpeed: 150,
    shockwaveSpeedPhase2: 190,
    meteors: 4,
    meteorsPhase2: 6,
    meteorWarnMs: 750,
    meteorStaggerMs: 120,
    crescentSpeed: 250,
    crescentPull: 300,
  },
  brasa: {
    hp: 12,
    paceSpeed: 45,
    paceSpeedPhase2: 70,
    keepAway: 52,
    chargeWarnMs: 450,
    chargeMs: 520,
    chargeMsPhase2: 380,
    trailSpacing: 18,
    trailLifeMs: 1100,
    trailLifeMsPhase2: 1500,
    volley: 3,
    volleyPhase2: 5,
    volleyFlightMs: 900,
    pillars: 3,
    pillarsPhase2: 5,
    pillarWarnMs: 600,
    pillarSpacing: 34,
    pillarStaggerMs: 160,
    pillarLifeMs: 650,
  },
  nebula: {
    hp: 16,
    hoverHeight: 84,
    followSpeed: 35,
    orbitStars: 6,
    orbitStarsPhase2: 8,
    orbitRadius: 30,
    orbitMs: 1800,
    starSpeed: 140,
    burstStars: 8,
    burstStarsPhase2: 12,
    warpWarnMs: 550,
    blackHoleMs: 3200,
    pullSpeed: 70,
  },
} as const;
