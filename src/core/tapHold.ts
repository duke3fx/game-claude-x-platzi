/**
 * Tells a quick tap from a long press on one button, like Hollow Knight's spell/focus key.
 * Driven by key events with timestamps, so very short taps are never lost between frames.
 */
export class TapHold {
  private readonly tapMaxMs: number;
  private downAt: number | null = null;

  constructor(tapMaxMs: number) {
    this.tapMaxMs = tapMaxMs;
  }

  press(timeMs: number): void {
    if (this.downAt === null) this.downAt = timeMs;
  }

  /** Returns true when the press that just ended was a tap. */
  release(timeMs: number): boolean {
    const wasTap = this.downAt !== null && timeMs - this.downAt < this.tapMaxMs;
    this.downAt = null;
    return wasTap;
  }

  isHolding(timeMs: number): boolean {
    return this.downAt !== null && timeMs - this.downAt >= this.tapMaxMs;
  }
}
