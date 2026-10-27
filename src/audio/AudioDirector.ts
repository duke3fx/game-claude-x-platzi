/**
 * The game's single entry point for sound. Owns one AudioContext (created lazily on the
 * first user gesture), pre-rendered SFX buffers and cross-faded music loops.
 *
 * Graph: SFX voices → sfxBus ┐
 *        music loops → musicBus ┴→ gentle compressor → master → speakers
 *
 * Everything is a silent no-op until `unlock()` succeeds, or forever if Web Audio is missing.
 */
import { clamp, createRng } from './dsp';
import { renderScore } from './musicRenderer';
import { SFX_DEFS, SFX_IDS, type SfxId } from './sfxDefs';
import { renderSfx, SfxRenderJob, sfxDuration } from './synth';
import { TrackLoader } from './trackLoader';
import { MUSIC_IDS, type MusicId, TRACKS } from './tracks';
import { getAudioContextConstructor, isDocumentHidden } from './webAudio';

export type { SfxId } from './sfxDefs';
export type { MusicId } from './tracks';

const MUSIC_FADE_SECONDS = 1.5;
const VOLUME_SMOOTHING_SECONDS = 0.03;
const MAX_SFX_VOICES = 12;
const DEFAULT_SFX_MIN_INTERVAL = 0.03;
const DEFAULT_MASTER_VOLUME = 0.8;
const DEFAULT_MUSIC_VOLUME = 0.7;
const JITTER_SEED = 0x6b6579;
/** Main-thread time spent pre-rendering SFX per task. */
const PRERENDER_SLICE_MS = 8;

/** Fixed noise seed per sound, so every session sounds the same. */
const sfxSeed = (id: SfxId): number => SFX_IDS.indexOf(id) + 1;

/** Rough synthesis cost of a sound: rendered seconds summed over its layers. */
const sfxRenderCost = (id: SfxId): number => sfxDuration(SFX_DEFS[id]) * SFX_DEFS[id].layers.length;

interface MusicVoice {
  readonly id: MusicId;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  disposeTimer: ReturnType<typeof setTimeout> | null;
}

/** Sliders feel even when gain follows a square law (roughly perceptual loudness). */
const sliderToGain = (volume: number): number => volume * volume;

const ignore = (): undefined => undefined;

export class AudioDirector {
  private context: AudioContext | null = null;
  private unavailable = false;
  private resuming = false;
  private suspendedWhileHidden = false;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;

  private masterVolumeSetting = DEFAULT_MASTER_VOLUME;
  private musicVolumeSetting = DEFAULT_MUSIC_VOLUME;

  private readonly sfxBuffers = new Map<SfxId, AudioBuffer>();
  private readonly sfxVoices: AudioBufferSourceNode[] = [];
  private readonly sfxLastStart = new Map<SfxId, number>();
  private readonly jitter = createRng(JITTER_SEED);

  /** Every loop stays cached once rendered (~5–8 MB each, ~42 MB for all six). */
  private readonly tracks = new TrackLoader<MusicId, AudioBuffer>(
    (id) => renderScore(TRACKS[id]),
    (id, error) => console.warn(`[audio] Could not render music "${id}".`, error),
  );
  private requestedMusic: MusicId | null = null;
  private loadingMusic: MusicId | null = null;
  private currentMusic: MusicVoice | null = null;
  private readonly fadingMusic: MusicVoice[] = [];

  /**
   * Call from every user gesture (keydown / pointerdown / gamepad press): the first call creates
   * the AudioContext, pre-renders the SFX and starts rendering the music loops in the
   * background; later calls are cheap and resume a context the browser suspended
   * (background tab, iOS interruption).
   */
  unlock(): void {
    const firstUnlock = this.context === null;
    const ctx = this.context ?? this.createContext();
    if (!ctx) return;
    if (firstUnlock) this.tracks.prefetch(MUSIC_IDS);
    if (ctx.state !== 'running') this.resume(ctx);
    if (this.requestedMusic !== null && this.currentMusic === null && this.loadingMusic === null) {
      this.applyMusicRequest();
    }
  }

  /** Fire-and-forget. Ignored before `unlock()`, while the tab is hidden, or without Web Audio. */
  playSfx(id: SfxId): void {
    const ctx = this.context;
    const bus = this.sfxBus;
    if (!ctx || !bus || !this.isAudible(ctx)) return;

    const spec = SFX_DEFS[id];
    const now = ctx.currentTime;
    const lastStart = this.sfxLastStart.get(id);
    if (lastStart !== undefined && now - lastStart < (spec.minInterval ?? DEFAULT_SFX_MIN_INTERVAL))
      return;
    this.sfxLastStart.set(id, now);

    if (this.sfxVoices.length >= MAX_SFX_VOICES) this.stopSfxVoice(this.sfxVoices[0]);

    const source = ctx.createBufferSource();
    source.buffer = this.sfxBuffer(ctx, id);
    const spread = spec.pitchJitter ?? 0;
    if (spread > 0) source.playbackRate.value = 1 + (this.jitter() * 2 - 1) * spread;
    source.connect(bus);
    source.onended = () => this.releaseSfxVoice(source);
    source.start(now);
    this.sfxVoices.push(source);
  }

  /**
   * Cross-fades (~1.5 s) to a looping track; the same id is a no-op and `null` fades out.
   * Safe before `unlock()`: the request is remembered and starts on unlock. Rendering needs no
   * gesture, so calling this early (e.g. when the title appears) gets the loop ready sooner.
   */
  playMusic(id: MusicId | null): void {
    if (id === this.requestedMusic) return;
    this.requestedMusic = id;
    if (id !== null) this.tracks.load(id);
    this.applyMusicRequest();
  }

  /** 0..1 (clamped). */
  setMasterVolume(volume: number): void {
    this.masterVolumeSetting = clamp(volume, 0, 1);
    this.smoothGain(this.master, sliderToGain(this.masterVolumeSetting));
  }

  get masterVolume(): number {
    return this.masterVolumeSetting;
  }

  /** 0..1 (clamped). */
  setMusicVolume(volume: number): void {
    this.musicVolumeSetting = clamp(volume, 0, 1);
    this.smoothGain(this.musicBus, sliderToGain(this.musicVolumeSetting));
  }

  get musicVolume(): number {
    return this.musicVolumeSetting;
  }

  // ---------------------------------------------------------------- context lifecycle

  private createContext(): AudioContext | null {
    if (this.unavailable) return null;
    const Context = getAudioContextConstructor();
    if (!Context) {
      this.unavailable = true;
      return null;
    }
    let ctx: AudioContext;
    try {
      ctx = new Context({ latencyHint: 'interactive' });
    } catch (error) {
      console.warn('[audio] Web Audio is unavailable; continuing without sound.', error);
      this.unavailable = true;
      return null;
    }

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;
    const master = ctx.createGain();
    master.gain.value = sliderToGain(this.masterVolumeSetting);
    const sfxBus = ctx.createGain();
    const musicBus = ctx.createGain();
    musicBus.gain.value = sliderToGain(this.musicVolumeSetting);
    sfxBus.connect(compressor);
    musicBus.connect(compressor);
    compressor.connect(master);
    master.connect(ctx.destination);

    this.context = ctx;
    this.master = master;
    this.sfxBus = sfxBus;
    this.musicBus = musicBus;
    this.primeOutput(ctx);
    this.prerenderSfx(ctx);
    this.watchVisibility(ctx);
    return ctx;
  }

  private resume(ctx: AudioContext): void {
    if (this.resuming || ctx.state === 'closed') return;
    this.resuming = true;
    Promise.resolve(ctx.resume())
      .catch(ignore)
      .finally(() => {
        this.resuming = false;
      });
  }

  /** iOS only unmutes Web Audio after something is started inside the gesture. */
  private primeOutput(ctx: AudioContext): void {
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    source.connect(ctx.destination);
    source.start();
  }

  /** Silence background tabs (Phaser pauses the game, so the music should pause too). */
  private watchVisibility(ctx: AudioContext): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (ctx.state !== 'running') return;
        this.suspendedWhileHidden = true;
        Promise.resolve(ctx.suspend()).catch(ignore);
      } else if (this.suspendedWhileHidden) {
        this.suspendedWhileHidden = false;
        this.resume(ctx);
      }
    });
  }

  private isAudible(ctx: AudioContext): boolean {
    if (isDocumentHidden()) return false;
    return ctx.state === 'running' || this.resuming;
  }

  private smoothGain(node: GainNode | null, value: number): void {
    const ctx = this.context;
    if (!node || !ctx) return;
    node.gain.setTargetAtTime(value, ctx.currentTime, VOLUME_SMOOTHING_SECONDS);
  }

  // ---------------------------------------------------------------- SFX

  /**
   * Renders every SFX, cheapest first, in time-boxed slices of one synth layer at a time: the
   * short gameplay/UI sounds are ready inside the unlock gesture, and the long chimes and boss
   * sounds follow in background tasks, so no task stalls a frame for long. A sound requested
   * before its turn simply renders on demand.
   */
  private prerenderSfx(ctx: AudioContext): void {
    const queue = [...SFX_IDS].sort((a, b) => sfxRenderCost(a) - sfxRenderCost(b));
    let job: { readonly id: SfxId; readonly render: SfxRenderJob } | null = null;
    const slice = (): void => {
      const deadline = performance.now() + PRERENDER_SLICE_MS;
      while (performance.now() < deadline) {
        if (!job) {
          const id = queue.shift();
          if (id === undefined) return;
          if (this.sfxBuffers.has(id)) continue;
          job = { id, render: new SfxRenderJob(SFX_DEFS[id], ctx.sampleRate, sfxSeed(id)) };
        }
        if (job.render.step()) {
          if (!this.sfxBuffers.has(job.id)) this.storeSfx(ctx, job.id, job.render.finish());
          job = null;
        }
      }
      setTimeout(slice, 0);
    };
    slice();
  }

  private sfxBuffer(ctx: AudioContext, id: SfxId): AudioBuffer {
    return (
      this.sfxBuffers.get(id) ??
      this.storeSfx(ctx, id, renderSfx(SFX_DEFS[id], ctx.sampleRate, sfxSeed(id)))
    );
  }

  private storeSfx(ctx: AudioContext, id: SfxId, samples: Float32Array<ArrayBuffer>): AudioBuffer {
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    this.sfxBuffers.set(id, buffer);
    return buffer;
  }

  private stopSfxVoice(source: AudioBufferSourceNode | undefined): void {
    if (!source) return;
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
    this.releaseSfxVoice(source);
  }

  private releaseSfxVoice(source: AudioBufferSourceNode): void {
    const index = this.sfxVoices.indexOf(source);
    if (index === -1) return;
    this.sfxVoices.splice(index, 1);
    source.disconnect();
  }

  // ---------------------------------------------------------------- music

  private applyMusicRequest(): void {
    const ctx = this.context;
    const bus = this.musicBus;
    if (!ctx || !bus) return;
    const id = this.requestedMusic;

    const current = this.currentMusic;
    if (current && current.id !== id) {
      this.fadeOut(ctx, current);
      this.currentMusic = null;
    }
    if (id === null || this.currentMusic !== null) {
      this.loadingMusic = null;
      return;
    }

    const revived = this.takeFadingVoice(id);
    if (revived) {
      this.fadeTo(ctx, revived, 1);
      this.currentMusic = revived;
      this.loadingMusic = null;
      return;
    }

    this.loadingMusic = id;
    this.tracks.load(id).then((buffer) => {
      if (this.loadingMusic !== id || this.requestedMusic !== id) return;
      this.loadingMusic = null;
      if (buffer) this.currentMusic = this.startMusic(ctx, bus, id, buffer);
    }, ignore);
  }

  private startMusic(
    ctx: AudioContext,
    bus: GainNode,
    id: MusicId,
    buffer: AudioBuffer,
  ): MusicVoice {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(bus);
    source.start();
    const voice: MusicVoice = { id, source, gain, disposeTimer: null };
    this.fadeTo(ctx, voice, 1);
    return voice;
  }

  private fadeTo(ctx: AudioContext, voice: MusicVoice, target: number): void {
    const now = ctx.currentTime;
    const param = voice.gain.gain;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + MUSIC_FADE_SECONDS);
  }

  private fadeOut(ctx: AudioContext, voice: MusicVoice): void {
    this.fadeTo(ctx, voice, 0);
    this.fadingMusic.push(voice);
    voice.disposeTimer = setTimeout(
      () => this.disposeMusic(voice),
      (MUSIC_FADE_SECONDS + 0.25) * 1000,
    );
  }

  private takeFadingVoice(id: MusicId): MusicVoice | null {
    const index = this.fadingMusic.findIndex((voice) => voice.id === id);
    const voice = this.fadingMusic[index];
    if (!voice) return null;
    this.fadingMusic.splice(index, 1);
    if (voice.disposeTimer !== null) clearTimeout(voice.disposeTimer);
    voice.disposeTimer = null;
    return voice;
  }

  private disposeMusic(voice: MusicVoice): void {
    const index = this.fadingMusic.indexOf(voice);
    if (index !== -1) this.fadingMusic.splice(index, 1);
    try {
      voice.source.stop();
    } catch {
      // Already stopped.
    }
    voice.source.disconnect();
    voice.gain.disconnect();
  }
}

/** The game-wide instance. Constructing it touches no browser APIs. */
export const audioDirector = new AudioDirector();
