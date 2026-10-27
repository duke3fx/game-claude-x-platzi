/**
 * Collects discrete button presses between frames. Presses are recorded from key events and
 * consumed by the game loop, so a press-and-release shorter than one frame is still seen.
 */
export class ActionBuffer<TAction extends string> {
  private readonly pressed = new Set<TAction>();

  press(action: TAction): void {
    this.pressed.add(action);
  }

  /** True if the action was pressed this frame, without consuming it. */
  peek(action: TAction): boolean {
    return this.pressed.has(action);
  }

  /** True (once) if the action was pressed this frame. */
  consume(action: TAction): boolean {
    return this.pressed.delete(action);
  }

  /** Drops unconsumed presses; call at the end of every frame. */
  clear(): void {
    this.pressed.clear();
  }
}
