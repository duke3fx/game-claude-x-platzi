/**
 * Renders a Score into a seamlessly looping stereo AudioBuffer with an OfflineAudioContext:
 * instruments → dry bus → (generated-impulse convolution reverb + damped feedback delay).
 * The render runs past the loop end and the tail is folded back onto the start, so reverb
 * and ringing notes carry across the loop point. The result is peak-normalised.
 */
import {
  clamp,
  createRng,
  foldLoop,
  generateImpulse,
  midiToFrequency,
  peakAmplitude,
  scaleInPlace,
} from './dsp';
import { scheduleVoice } from './instruments';
import { beatSeconds, loopSeconds, type Score } from './score';
import { getOfflineAudioContextConstructor } from './webAudio';

/**
 * Music is mellow (little energy above ~8 kHz), so 32 kHz keeps quality while using a third
 * less memory than 48 kHz. Buffers are resampled transparently on playback.
 */
export const MUSIC_SAMPLE_RATE = 32000;

const TAIL_PADDING_SECONDS = 2.5;
const TARGET_PEAK = 0.9;
const DELAY_TONE_HZ = 2400;
const MAX_DELAY_SECONDS = 4;
const IMPULSE_SEED = 0x1f2e3d;
/**
 * Building the node graph runs on the main thread (the render itself does not), so it is split
 * into small batches with yields in between: background prefetches must not stall gameplay.
 */
const NOTES_PER_BATCH = 12;

const yieldToMain = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function buildMixBus(ctx: OfflineAudioContext, score: Score): Promise<AudioNode> {
  const { mix } = score;
  const dry = ctx.createGain();
  const master = ctx.createGain();
  dry.connect(master);
  master.connect(ctx.destination);

  await yieldToMain();
  const [left, right] = generateImpulse(ctx.sampleRate, mix.reverbSeconds, createRng(IMPULSE_SEED));
  const impulse = ctx.createBuffer(2, left.length, ctx.sampleRate);
  impulse.getChannelData(0).set(left);
  impulse.getChannelData(1).set(right);
  // Assigning the impulse pre-computes the FFT kernels on the main thread: its own task.
  await yieldToMain();
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse;
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = mix.reverbWet;
  dry.connect(reverbSend);
  reverbSend.connect(reverb);
  reverb.connect(master);

  if (mix.delayWet > 0) {
    const delay = ctx.createDelay(MAX_DELAY_SECONDS);
    delay.delayTime.value = Math.min(MAX_DELAY_SECONDS, mix.delayBeats * beatSeconds(score));
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = DELAY_TONE_HZ;
    const feedback = ctx.createGain();
    feedback.gain.value = mix.delayFeedback;
    const delaySend = ctx.createGain();
    delaySend.gain.value = mix.delayWet;
    dry.connect(delaySend);
    delaySend.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(master);
    tone.connect(reverbSend);
  }
  return dry;
}

async function toLoopBuffer(
  ctx: BaseAudioContext,
  rendered: AudioBuffer,
  loopLength: number,
  level: number,
): Promise<AudioBuffer> {
  const channels: Float32Array<ArrayBuffer>[] = [];
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    await yieldToMain();
    channels.push(foldLoop(rendered.getChannelData(c), loopLength));
  }
  const peak = peakAmplitude(channels);
  const normalise = peak > 0 ? (TARGET_PEAK * level) / peak : 0;
  const buffer = ctx.createBuffer(channels.length, loopLength, rendered.sampleRate);
  channels.forEach((samples, c) => {
    scaleInPlace(samples, normalise);
    buffer.getChannelData(c).set(samples);
  });
  return buffer;
}

/** Resolves to a looping buffer, or null when OfflineAudioContext is unavailable. */
export async function renderScore(
  score: Score,
  sampleRate = MUSIC_SAMPLE_RATE,
): Promise<AudioBuffer | null> {
  const Offline = getOfflineAudioContextConstructor();
  if (!Offline) return null;
  const loop = loopSeconds(score);
  const length = Math.ceil((loop + score.mix.reverbSeconds + TAIL_PADDING_SECONDS) * sampleRate);
  const ctx = new Offline(2, length, sampleRate);
  const dry = await buildMixBus(ctx, score);
  await yieldToMain();
  const secondsPerBeat = beatSeconds(score);
  // Lines keep a constant pan, so one shared panner per position saves a node per note.
  const panners = new Map<number, StereoPannerNode>();
  const pannerAt = (pan: number): StereoPannerNode => {
    const existing = panners.get(pan);
    if (existing) return existing;
    const panner = ctx.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    panner.connect(dry);
    panners.set(pan, panner);
    return panner;
  };
  for (const [index, event] of score.events.entries()) {
    if (index > 0 && index % NOTES_PER_BATCH === 0) await yieldToMain();
    scheduleVoice(
      ctx,
      pannerAt(event.pan),
      event.instrument,
      {
        start: event.beat * secondsPerBeat,
        duration: event.beats * secondsPerBeat,
        frequency: midiToFrequency(event.midi),
        velocity: event.velocity,
      },
      score.mix,
    );
  }
  const rendered = await ctx.startRendering();
  return toLoopBuffer(ctx, rendered, Math.round(loop * sampleRate), score.mix.level);
}
