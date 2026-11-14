// Core tests: leaderless assignment, state merge, clock, music determinism, the note codec,
// Goertzel pitch detection, and swarm takeover on failure. No audio, no DOM.
import assert from "node:assert/strict";

import { assign, coveredParts, roleForIndex } from "../src/core/assign";
import { decode, encode, toneFrequencies, TONES } from "../src/core/codec";
import { detectTone, goertzel } from "../src/core/goertzel";
import { notesForBeat, progression } from "../src/core/music";
import { beatAt, defaultState, edit, mergeState } from "../src/core/state";
import { Swarm } from "../src/sim/world";

let n = 0;
const test = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log("ok -", name);
};

// ---- assignment
test("roles fill in priority order, extras play melody", () => {
  assert.equal(roleForIndex(0), "drums");
  assert.equal(roleForIndex(1), "bass");
  assert.equal(roleForIndex(2), "chords");
  assert.equal(roleForIndex(3), "melody");
  assert.equal(roleForIndex(9), "melody");
});

test("assignment is leaderless and identical across nodes with the same view", () => {
  const ids = ["N03", "N01", "N02"];
  const a1 = assign("N01", ids);
  const a2 = assign("N02", ids);
  assert.equal(a1.part, "drums"); // N01 is lowest id
  assert.equal(a2.part, "bass");
  // both nodes compute the SAME global picture
  assert.deepEqual(assign("N03", ids).part, "chords");
});

test("when the drummer disappears, the next node takes over with no coordination", () => {
  const before = assign("N02", ["N01", "N02", "N03"]);
  assert.equal(before.part, "bass");
  const after = assign("N02", ["N02", "N03"]); // N01 gone from the known set
  assert.equal(after.part, "drums"); // promoted itself
});

test("coveredParts shows gaps", () => {
  assert.deepEqual([...coveredParts(2)].sort(), ["bass", "drums"]);
});

// ---- state merge + clock
test("state merge is last-writer-wins with id tie-break", () => {
  const a = defaultState("N01", 0);
  const b = edit(a, "N02", { tempo: 140 });
  assert.equal(mergeState(a, b).tempo, 140); // higher version wins
  const c = { ...a, origin: "N09" };
  assert.equal(mergeState(a, c).origin, "N09"); // same version, higher id wins
});

test("same state + same wall clock gives the same beat on every node", () => {
  const s = defaultState("N01", 1000);
  assert.equal(beatAt(s, 1000), 0);
  assert.equal(beatAt(s, 1000 + 60000 / s.tempo), 1);
  assert.equal(beatAt(s, 1000 + (60000 / s.tempo) * 8), 8);
});

// ---- music
test("music is deterministic from the seed", () => {
  const s = defaultState("N01", 0);
  assert.deepEqual(progression(s), progression({ ...s }));
  const beat5 = notesForBeat("bass", s, 5);
  assert.deepEqual(beat5, notesForBeat("bass", s, 5));
});

test("drums hit kick and snare on the right beats", () => {
  const s = defaultState("N01", 0);
  assert.ok(notesForBeat("drums", s, 0).some((e) => e.kind === "kick"));
  assert.ok(notesForBeat("drums", s, 1).some((e) => e.kind === "snare"));
});

// ---- codec (Hidden in Plain Sight)
test("codec round-trips text through tones", () => {
  for (const msg of ["hi", "SOS", "durhack 2026", "", "swarm!"]) {
    const r = decode(encode(msg));
    assert.equal(r.ok, true);
    assert.equal(r.text, msg);
  }
});

test("codec uses only valid tone indices", () => {
  for (const t of encode("hello world")) assert.ok(t >= 0 && t < TONES);
});

test("codec catches a misheard tone with its checksum", () => {
  const tones = encode("alarm");
  tones[1] = (tones[1] + 1) % TONES; // corrupt one note
  assert.equal(decode(tones).ok, false);
});

// ---- goertzel pitch detection on a synthetic tone
test("goertzel detects the right tone in a clean sine wave", () => {
  const sampleRate = 44100;
  const freqs = toneFrequencies();
  const target = 5;
  const N = 2048;
  const samples = new Float32Array(N);
  for (let i = 0; i < N; i++) samples[i] = Math.sin((2 * Math.PI * freqs[target] * i) / sampleRate);
  const det = detectTone(samples, sampleRate, freqs);
  assert.equal(det.index, target);
  assert.ok(goertzel(samples, sampleRate, freqs[target]) > goertzel(samples, sampleRate, freqs[(target + 3) % freqs.length]));
});

test("goertzel reports nothing for silence", () => {
  const det = detectTone(new Float32Array(2048), 44100, toneFrequencies());
  assert.equal(det.index, -1);
});

// ---- swarm behaviour end to end
test("a fresh swarm converges so every node agrees and covers 4 distinct parts", () => {
  const sw = new Swarm({ count: 5, heartbeatMs: 500, aliveTimeoutMs: 2500 }, 0);
  for (let t = 0; t <= 2000; t += 500) sw.gossip(t);
  assert.ok(sw.inSync());
  const parts = new Set(sw.nodes.map((n) => n.assignment(2000).part));
  assert.deepEqual([...parts].sort(), ["bass", "chords", "drums", "melody"]);
});

test("killing the drummer promotes a new one", () => {
  const sw = new Swarm({ count: 4, heartbeatMs: 500, aliveTimeoutMs: 1500 }, 0);
  for (let t = 0; t <= 2000; t += 500) sw.gossip(t);
  const drummer = sw.nodes.find((n) => n.assignment(2000).part === "drums")!;
  sw.kill(drummer.id);
  for (let t = 2500; t <= 6000; t += 500) sw.gossip(t); // let the dead node time out
  const stillDrums = sw.nodes.filter((n) => n.alive && n.assignment(6000).part === "drums");
  assert.equal(stillDrums.length, 1);
  assert.notEqual(stillDrums[0].id, drummer.id);
});

test("a partition keeps both halves playing; they re-merge on reconnect", () => {
  const sw = new Swarm({ count: 4, heartbeatMs: 500, aliveTimeoutMs: 1500 }, 0);
  for (let t = 0; t <= 2000; t += 500) sw.gossip(t);
  // one group bumps the tempo while split
  sw.splitInto(2);
  for (let t = 2500; t <= 4000; t += 500) sw.gossip(t);
  const a = sw.nodes[0];
  a.state = edit(a.state, a.id, { tempo: 150 });
  for (let t = 4500; t <= 6000; t += 500) sw.gossip(t);
  // both halves still have a drummer (each group self-organises)
  for (const g of [0, 1]) {
    const group = sw.nodes.filter((_, i) => i % 2 === g);
    assert.ok(group.some((n) => n.assignment(6000, 1500).part === "drums"));
  }
  sw.splitInto(1); // reconnect
  for (let t = 6500; t <= 9000; t += 500) sw.gossip(t);
  assert.ok(sw.inSync());
  assert.ok(sw.nodes.every((n) => n.state.tempo === 150)); // the edit won everywhere
});

console.log(`\n${n} tests passed`);
