// Shared musical state: a last-writer-wins register merged on every heartbeat,
// plus the beat clock derived from it. With the same state + wall clock, every node
// computes the same beat, so they play together with no central conductor.

import { BEATS_PER_BAR } from "./music";
import type { NodeId, SharedState } from "./types";

export function defaultState(origin: NodeId, now: number): SharedState {
  return {
    seed: 1337,
    tempo: 110,
    keyRoot: 48,
    scale: "minorPentatonic",
    bars: 4,
    epochStart: now,
    version: 1,
    origin,
  };
}

/** LWW: higher version wins; ties broken by origin id. Returns the winner (never mutates). */
export function mergeState(a: SharedState, b: SharedState): SharedState {
  if (b.version > a.version) return b;
  if (b.version < a.version) return a;
  return b.origin > a.origin ? b : a;
}

/** Make a change to shared state that will win the merge, stamped by this node. */
export function edit(state: SharedState, by: NodeId, patch: Partial<SharedState>): SharedState {
  return { ...state, ...patch, version: state.version + 1, origin: by };
}

export const beatDurationMs = (tempo: number): number => 60000 / tempo;

/** The absolute beat index at wall-clock `now`, given shared state and a local clock offset. */
export function beatAt(state: SharedState, now: number, offsetMs = 0): number {
  return Math.floor((now + offsetMs - state.epochStart) / beatDurationMs(state.tempo));
}

/** Fractional phase within the current beat (0..1), for a smooth visual pulse. */
export function beatPhase(state: SharedState, now: number, offsetMs = 0): number {
  const d = beatDurationMs(state.tempo);
  const x = (now + offsetMs - state.epochStart) / d;
  return x - Math.floor(x);
}

export const barOf = (beat: number, bars: number): number => Math.floor(beat / BEATS_PER_BAR) % bars;
