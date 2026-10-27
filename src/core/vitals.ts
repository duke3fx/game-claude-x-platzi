/** Player health ("Tokens") and healing resource ("Contexto"). */
export interface VitalsConfig {
  readonly maxTokens: number;
  readonly maxContext: number;
  readonly contextPerHit: number;
  readonly healCost: number;
  /** Grace time (ms) after a hit during which further hits are ignored. */
  readonly invulnerableMs: number;
}

export class Vitals {
  private readonly config: VitalsConfig;
  tokens: number;
  context = 0;
  /** Grace time left (ms): while above zero, hits are ignored. */
  invulnerableMs = 0;

  constructor(config: VitalsConfig) {
    this.config = config;
    this.tokens = config.maxTokens;
  }

  get maxTokens(): number {
    return this.config.maxTokens;
  }

  get isDead(): boolean {
    return this.tokens <= 0;
  }

  get canHeal(): boolean {
    return this.context >= this.config.healCost && this.tokens < this.config.maxTokens;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableMs > 0;
  }

  /** Counts down the grace time after a hit. */
  tick(dt: number): void {
    this.invulnerableMs = Math.max(0, this.invulnerableMs - dt);
  }

  /** Takes a hit and starts the grace time, unless still in it. Returns whether the hit landed. */
  takeDamage(amount: number): boolean {
    if (this.isInvulnerable) return false;
    this.tokens = Math.max(0, this.tokens - amount);
    this.invulnerableMs = this.config.invulnerableMs;
    return true;
  }

  /** Starts the grace time without taking a hit (e.g. right after respawning). */
  protect(): void {
    this.invulnerableMs = Math.max(this.invulnerableMs, this.config.invulnerableMs);
  }

  registerHit(): void {
    this.context = Math.min(this.config.maxContext, this.context + this.config.contextPerHit);
  }

  canSpend(amount: number): boolean {
    return this.context >= amount;
  }

  /** Spends Contexto (e.g. to throw a spark). Returns false if there is not enough. */
  spendContext(amount: number): boolean {
    if (!this.canSpend(amount)) return false;
    this.context -= amount;
    return true;
  }

  heal(): boolean {
    if (!this.canHeal) return false;
    this.context -= this.config.healCost;
    this.tokens += 1;
    return true;
  }

  /** Restores a single Token (resting on a bench). Returns false when already full. */
  addToken(): boolean {
    if (this.tokens >= this.config.maxTokens) return false;
    this.tokens += 1;
    return true;
  }

  restore(): void {
    this.tokens = this.config.maxTokens;
  }
}
