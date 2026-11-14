// Shared types. Pure: no DOM, no Web Audio. The simulation and the real nodes share this.

export type NodeId = string;

/** The four musical roles, in takeover priority order (index 0 is filled first). */
export const PARTS = ["drums", "bass", "chords", "melody"] as const;
export type Part = (typeof PARTS)[number];

/** The musical state every node agrees on, so they play as one band with no conductor.
 *  It is a last-writer-wins register: higher version wins, ties broken by origin id. */
export interface SharedState {
  seed: number; // drives the chord progression + melodic choices, deterministically
  tempo: number; // BPM
  keyRoot: number; // MIDI note of the key's root, e.g. 48 = C3
  scale: ScaleName;
  bars: number; // length of the looping progression
  epochStart: number; // ms: when beat 0 happened (shared, so clocks line up)
  version: number; // LWW counter
  origin: NodeId; // LWW tie-break
}

export type ScaleName = "minorPentatonic" | "naturalMinor" | "dorian" | "majorPentatonic";

/** What one node broadcasts each tick. */
export interface Heartbeat {
  from: NodeId;
  sentAt: number; // ms
  state: SharedState; // its view of the shared state (for merge)
  known: [NodeId, number][]; // peers it has heard from: id -> lastSeen ms (gossip)
}

/** A sound the audio engine should make on a given beat. The core emits these;
 *  the audio layer turns them into oscillators and noise. Deterministic = testable. */
export interface NoteEvent {
  kind: "tone" | "kick" | "snare" | "hat";
  midi?: number; // for kind "tone"
  gain: number; // 0..1
  durBeats: number;
}
