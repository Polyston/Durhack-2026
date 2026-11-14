// The "physical language": encode text as a sequence of musical tones, and decode it back.
// This is what lets nodes talk THROUGH the music when the network is gone — and it is the
// QRT "Hidden in Plain Sight" encoder/decoder.
//
// Scheme: 16 tones, each carrying one nibble (4 bits). Each UTF-8 byte = 2 tones.
// A final checksum tone catches mis-heard notes. The audio layer separates tones by
// timing (note on/off), so no reserved framing tone is needed here.

export const TONES = 16;
const BASE_MIDI = 60; // C4
const STEP = 2; // whole-tone spacing, so pitches are far enough apart to tell apart by ear/mic

export function toneToMidi(tone: number): number {
  return BASE_MIDI + tone * STEP;
}

export function midiToTone(midi: number): number {
  return Math.round((midi - BASE_MIDI) / STEP);
}

export function encode(text: string): number[] {
  const bytes = new TextEncoder().encode(text);
  const tones: number[] = [];
  let sum = 0;
  for (const b of bytes) {
    const hi = (b >> 4) & 0xf;
    const lo = b & 0xf;
    tones.push(hi, lo);
    sum += hi + lo;
  }
  tones.push(sum % TONES); // checksum
  return tones;
}

export interface DecodeResult {
  text: string | null;
  ok: boolean;
  reason?: string;
}

export function decode(tones: number[]): DecodeResult {
  if (tones.length < 1) return { text: null, ok: false, reason: "empty" };
  const checksum = tones[tones.length - 1];
  const body = tones.slice(0, -1);
  if (body.length % 2 !== 0) return { text: null, ok: false, reason: "truncated (odd tone count)" };
  let sum = 0;
  const bytes: number[] = [];
  for (let i = 0; i < body.length; i += 2) {
    const hi = body[i] & 0xf;
    const lo = body[i + 1] & 0xf;
    bytes.push((hi << 4) | lo);
    sum += hi + lo;
  }
  if (sum % TONES !== checksum) return { text: null, ok: false, reason: "checksum failed (a tone was misheard)" };
  try {
    return { text: new TextDecoder().decode(new Uint8Array(bytes)), ok: true };
  } catch {
    return { text: null, ok: false, reason: "not valid text" };
  }
}

export const toneFrequencies = (): number[] =>
  Array.from({ length: TONES }, (_, i) => 440 * Math.pow(2, (toneToMidi(i) - 69) / 12));
