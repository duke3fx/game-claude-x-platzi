/** Player health ("Tokens") and healing resource ("Contexto"). */
export interface VitalsConfig {
  readonly maxTokens: number;
  readonly maxContext: number;
  readonly contextPerHit: number;
  readonly healCost: number;
}

export class Vitals {
  private readonly config: VitalsConfig;
  tokens: number;
  context = 0;

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

  takeDamage(amount: number): void {
    this.tokens = Math.max(0, this.tokens - amount);
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
