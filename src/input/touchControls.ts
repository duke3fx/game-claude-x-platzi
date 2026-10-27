import { TOUCH } from '../config/tuning';
import { TOUCH_TEXT } from '../content/script';
import { DIRECTIONS, type Direction, dpadDirections } from '../core/dpad';

/**
 * On-screen controls for phones and tablets, built as DOM elements over the canvas.
 * They press virtual keys, so the game handles touch exactly like the keyboard.
 */
type KeyCode =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'KeyZ'
  | 'KeyX'
  | 'KeyV'
  | 'KeyB'
  | 'ShiftLeft';

/** Legacy `key`/`keyCode` per code: Phaser's Key objects still match on keyCode. */
const KEY_INFO: Readonly<Record<KeyCode, { key: string; keyCode: number }>> = {
  ArrowLeft: { key: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { key: 'ArrowUp', keyCode: 38 },
  ArrowRight: { key: 'ArrowRight', keyCode: 39 },
  ArrowDown: { key: 'ArrowDown', keyCode: 40 },
  KeyZ: { key: 'z', keyCode: 90 },
  KeyX: { key: 'x', keyCode: 88 },
  KeyV: { key: 'v', keyCode: 86 },
  KeyB: { key: 'b', keyCode: 66 },
  ShiftLeft: { key: 'Shift', keyCode: 16 },
};

const DIRECTION_KEY: Readonly<Record<Direction, KeyCode>> = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
};

const ARROW_GLYPH: Readonly<Record<Direction, string>> = {
  left: '◀',
  right: '▶',
  up: '▲',
  down: '▼',
};

interface ButtonSpec {
  readonly code: KeyCode;
  readonly label: string;
  readonly hint: string;
  readonly className: string;
}

/** Laid out like a gamepad's face buttons: jump at the bottom, claw on the left. */
const BUTTONS: readonly ButtonSpec[] = [
  { code: 'KeyZ', label: TOUCH_TEXT.jump, hint: 'Z', className: 'touch-jump' },
  { code: 'KeyX', label: TOUCH_TEXT.attack, hint: 'X', className: 'touch-attack' },
  { code: 'KeyV', label: TOUCH_TEXT.spell, hint: 'V', className: 'touch-spell' },
  { code: 'ShiftLeft', label: TOUCH_TEXT.dash, hint: '⇧', className: 'touch-dash' },
  { code: 'KeyB', label: TOUCH_TEXT.dance, hint: 'B', className: 'touch-dance' },
];

/** Four corner brackets; drawn as SVG because the ⛶ glyph is missing from many fonts. */
const FULLSCREEN_ICON =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">' +
  '<path d="M2 7V2h5M13 2h5v5M18 13v5h-5M7 18H2v-5"/></svg>';

/** True on devices whose main pointer is a finger (phones, tablets). */
export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/** Sends keyboard events for held virtual keys, once per change. */
class VirtualKeys {
  private readonly held = new Set<KeyCode>();

  set(code: KeyCode, down: boolean): void {
    if (down === this.held.has(code)) return;
    if (down) this.held.add(code);
    else this.held.delete(code);
    const { key, keyCode } = KEY_INFO[code];
    const event = new KeyboardEvent(down ? 'keydown' : 'keyup', {
      code,
      key,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'keyCode', { value: keyCode });
    Object.defineProperty(event, 'which', { value: keyCode });
    window.dispatchEvent(event);
  }

  releaseAll(): void {
    for (const code of [...this.held]) this.set(code, false);
  }
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent: HTMLElement,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  parent.append(el);
  return el;
}

/** A thumb pad: slide anywhere on it to hold up to two directions. */
function mountDpad(root: HTMLElement, keys: VirtualKeys): void {
  const pad = element('div', 'touch-pad', root);
  const arrows = new Map<Direction, HTMLElement>();
  for (const direction of DIRECTIONS) {
    const arrow = element('span', `touch-arrow touch-arrow-${direction}`, pad);
    arrow.textContent = ARROW_GLYPH[direction];
    arrows.set(direction, arrow);
  }
  const knob = element('div', 'touch-knob', pad);
  let pointerId: number | null = null;

  const apply = (dx: number, dy: number, radius: number): void => {
    const held = dpadDirections(dx, dy, radius * TOUCH.deadZone);
    for (const direction of DIRECTIONS) {
      keys.set(DIRECTION_KEY[direction], held[direction]);
      arrows.get(direction)?.classList.toggle('is-on', held[direction]);
    }
    const length = Math.hypot(dx, dy);
    const travel = radius * TOUCH.knobTravel;
    const k = length > travel ? travel / length : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  };
  const track = (event: PointerEvent): void => {
    const rect = pad.getBoundingClientRect();
    const radius = rect.width / 2;
    apply(event.clientX - rect.left - radius, event.clientY - rect.top - radius, radius);
  };
  pad.addEventListener('pointerdown', (event) => {
    if (pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    pad.setPointerCapture(event.pointerId);
    track(event);
  });
  pad.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointerId) track(event);
  });
  const release = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    apply(0, 0, 1);
  };
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);
}

function mountButton(parent: HTMLElement, spec: ButtonSpec, keys: VirtualKeys): void {
  const button = element('button', `touch-button ${spec.className}`, parent);
  button.type = 'button';
  const label = element('span', 'touch-label', button);
  label.textContent = spec.label;
  const hint = element('small', 'touch-hint', button);
  hint.textContent = spec.hint;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-down');
    keys.set(spec.code, true);
  });
  const release = (): void => {
    button.classList.remove('is-down');
    keys.set(spec.code, false);
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}

function mountFullscreen(root: HTMLElement): void {
  if (!document.fullscreenEnabled) return;
  const button = element('button', 'touch-fullscreen', root);
  button.type = 'button';
  button.innerHTML = FULLSCREEN_ICON;
  button.title = TOUCH_TEXT.fullscreen;
  button.setAttribute('aria-label', TOUCH_TEXT.fullscreen);
  button.addEventListener('click', () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    document.documentElement
      .requestFullscreen()
      .then(() => {
        // Not every browser can lock orientation; landscape is only a preference.
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        return orientation.lock?.('landscape');
      })
      .catch(() => undefined);
  });
}

/** Adds the touch controls and the "rotate your phone" notice to the page. */
export function mountTouchControls(): void {
  const keys = new VirtualKeys();
  const root = element('div', 'touch', document.body);
  root.classList.toggle('is-on', isTouchDevice());
  mountDpad(root, keys);
  const actions = element('div', 'touch-actions', root);
  for (const spec of BUTTONS) mountButton(actions, spec, keys);
  mountFullscreen(root);

  const rotate = element('div', 'rotate', document.body);
  rotate.textContent = TOUCH_TEXT.rotate;

  // Hybrid devices: show the controls as soon as the screen is touched.
  window.addEventListener('touchstart', () => root.classList.add('is-on'), {
    once: true,
    passive: true,
  });
  // Long presses (hold V to heal) must not open the context menu.
  root.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('blur', () => keys.releaseAll());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) keys.releaseAll();
  });
}
