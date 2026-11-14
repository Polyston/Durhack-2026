// Goertzel tone detection: cheaper than a full FFT when you only care about a fixed set
// of frequencies (our 16 tones). Used by the microphone listener to read the sound channel.
// Pure math, so it is unit-tested on synthetic sine waves.

/** Relative magnitude of `targetFreq` in `samples`. */
export function goertzel(samples: Float32Array, sampleRate: number, targetFreq: number): number {
  const n = samples.length;
  const k = Math.round((n * targetFreq) / sampleRate);
  const w = (2 * Math.PI * k) / n;
  const coeff = 2 * Math.cos(w);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return Math.sqrt(Math.max(0, power)) / n;
}

export interface ToneDetection {
  index: number; // -1 = nothing confident
  magnitude: number;
  snr: number; // strongest / average, a confidence proxy
}

/** Detect which of `freqs` is sounding in `samples`. `minSnr` rejects noise/silence. */
export function detectTone(samples: Float32Array, sampleRate: number, freqs: number[], minSnr = 4): ToneDetection {
  const mags = freqs.map((f) => goertzel(samples, sampleRate, f));
  let best = 0;
  let sum = 0;
  for (let i = 0; i < mags.length; i++) {
    sum += mags[i];
    if (mags[i] > mags[best]) best = i;
  }
  const avg = sum / mags.length || 1e-9;
  const snr = mags[best] / avg;
  return { index: snr >= minSnr ? best : -1, magnitude: mags[best], snr };
}
