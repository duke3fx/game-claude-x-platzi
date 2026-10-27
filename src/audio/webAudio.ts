/**
 * Feature detection for Web Audio. Reads globals lazily (never at import time),
 * so importing the audio modules is safe in Node and in browsers without Web Audio.
 */

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext;
type OfflineAudioContextConstructor = new (
  numberOfChannels: number,
  length: number,
  sampleRate: number,
) => OfflineAudioContext;

interface AudioGlobals {
  readonly AudioContext?: AudioContextConstructor;
  readonly webkitAudioContext?: AudioContextConstructor;
  readonly OfflineAudioContext?: OfflineAudioContextConstructor;
}

const audioGlobals = (): AudioGlobals => globalThis as AudioGlobals;

export function getAudioContextConstructor(): AudioContextConstructor | null {
  const scope = audioGlobals();
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

export function getOfflineAudioContextConstructor(): OfflineAudioContextConstructor | null {
  return audioGlobals().OfflineAudioContext ?? null;
}

/** True while the page is in a background tab (always false outside a browser). */
export function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden;
}
