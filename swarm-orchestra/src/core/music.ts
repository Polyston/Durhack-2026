// Deterministic music: everyone with the same SharedState + beat plays the same notes.
// Pure and testable.

import type { NoteEvent, Part, ScaleName, SharedState } from "./types";

const SCALES: Record<ScaleName, number[]> = {
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

export const BEATS_PER_BAR = 4;

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Small deterministic PRNG (mulberry32), seeded, so a seed => a fixed song. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scale degree -> MIDI note in the key, wrapping octaves. */
export function scaleNote(state: SharedState, degree: number, octave = 0): number {
  const scale = SCALES[state.scale];
  const n = scale.length;
  const idx = ((degree % n) + n) % n;
  const oct = Math.floor(degree / n) + octave;
  return state.keyRoot + scale[idx] + 12 * oct;
}

/** The looping chord progression as scale-degree roots, fixed by the seed. */
export function progression(state: SharedState): number[] {
  const r = rng(state.seed);
  const choices = [0, 5, 4, 3, 6, 2]; // pleasant degrees to build chords on
  return Array.from({ length: state.bars }, () => choices[Math.floor(r() * choices.length)]);
}

export function chordRootForBeat(state: SharedState, beat: number): number {
  const bar = Math.floor(beat / BEATS_PER_BAR) % state.bars;
  return progression(state)[bar];
}

/** The notes one part plays on one beat. `voice` offsets extra melody players into harmony. */
export function notesForBeat(part: Part, state: SharedState, beat: number, voice = 0): NoteEvent[] {
  const beatInBar = ((beat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
  const root = chordRootForBeat(state, beat);

  if (part === "drums") {
    const out: NoteEvent[] = [{ kind: "hat", gain: 0.25, durBeats: 0.5 }];
    if (beatInBar === 0 || beatInBar === 2) out.push({ kind: "kick", gain: 0.9, durBeats: 0.5 });
    if (beatInBar === 1 || beatInBar === 3) out.push({ kind: "snare", gain: 0.6, durBeats: 0.5 });
    return out;
  }
  if (part === "bass") {
    if (beatInBar === 0 || beatInBar === 2) return [{ kind: "tone", midi: scaleNote(state, root, -2), gain: 0.8, durBeats: 2 }];
    return [];
  }
  if (part === "chords") {
    if (beatInBar !== 0) return [];
    return [0, 2, 4].map((d) => ({ kind: "tone", midi: scaleNote(state, root + d, 0), gain: 0.28, durBeats: BEATS_PER_BAR } as NoteEvent));
  }
  // melody: a seeded line, one note per beat, higher octave; voice shifts harmony
  const r = rng(state.seed * 131 + beat * 7 + voice * 97);
  if (r() < 0.25) return []; // rests for musicality
  const step = Math.floor(r() * 5) - 2;
  return [{ kind: "tone", midi: scaleNote(state, root + step + voice * 2, 1), gain: 0.4, durBeats: 1 }];
}
