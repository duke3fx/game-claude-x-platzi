/**
 * Coyote time (jump shortly after leaving a ledge) and jump buffering
 * (press jump shortly before landing). Pure logic, fed by the player controller.
 */
export class JumpAssist {
  private sinceGrounded = Number.POSITIVE_INFINITY;
  private sincePressed = Number.POSITIVE_INFINITY;

  private readonly coyoteMs: number;
  private readonly bufferMs: number;

  constructor(coyoteMs: number, bufferMs: number) {
    this.coyoteMs = coyoteMs;
    this.bufferMs = bufferMs;
  }

  update(dtMs: number, grounded: boolean, jumpPressed: boolean): void {
    this.sinceGrounded = grounded ? 0 : this.sinceGrounded + dtMs;
    this.sincePressed = jumpPressed ? 0 : this.sincePressed + dtMs;
  }

  /** Returns true (and consumes the buffered press) when a jump should start now. */
  consumeJump(): boolean {
    const canJump = this.sinceGrounded <= this.coyoteMs && this.sincePressed <= this.bufferMs;
    if (canJump) {
      this.sinceGrounded = Number.POSITIVE_INFINITY;
      this.sincePressed = Number.POSITIVE_INFINITY;
    }
    return canJump;
  }
}
