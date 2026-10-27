/** A small typed finite state machine. Pure TypeScript, no engine dependencies. */
export interface StateHandlers<TState extends string, TContext> {
  readonly enter?: (ctx: TContext, from: TState | null) => void;
  readonly update?: (ctx: TContext, dtMs: number) => TState | undefined;
  readonly exit?: (ctx: TContext, to: TState) => void;
}

export class StateMachine<TState extends string, TContext> {
  private readonly ctx: TContext;
  private readonly states: Readonly<Record<TState, StateHandlers<TState, TContext>>>;
  private current: TState;
  private elapsed = 0;

  constructor(
    ctx: TContext,
    states: Readonly<Record<TState, StateHandlers<TState, TContext>>>,
    initial: TState,
  ) {
    this.ctx = ctx;
    this.states = states;
    this.current = initial;
    this.states[initial].enter?.(ctx, null);
  }

  get state(): TState {
    return this.current;
  }

  /** Milliseconds spent in the current state. */
  get timeInState(): number {
    return this.elapsed;
  }

  transition(next: TState): void {
    if (next === this.current) return;
    this.states[this.current].exit?.(this.ctx, next);
    const previous = this.current;
    this.current = next;
    this.elapsed = 0;
    this.states[next].enter?.(this.ctx, previous);
  }

  update(dtMs: number): void {
    this.elapsed += dtMs;
    const next = this.states[this.current].update?.(this.ctx, dtMs);
    if (next !== undefined) this.transition(next);
  }
}
