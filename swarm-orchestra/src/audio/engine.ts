// Web Audio: turn the core's NoteEvents into actual sound, one timbre per part, plus a
// transmitter for the sound channel. Created lazily on a user gesture (browsers require it).

import { midiToFreq } from "../core/music";
import { toneToMidi } from "../core/codec";
import type { NoteEvent, Part } from "../core/types";

const PAN: Record<Part, number> = { drums: 0, bass: -0.15, chords: 0.3, melody: -0.35 };

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  muted = false;

  async start(): Promise<void> {
    if (this.ctx) {
      await this.ctx.resume();
      return;
    }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);
    this.ctx = ctx;
  }

  setVolume(v: number): void {
    if (this.master) this.master.gain.value = this.muted ? 0 : v;
  }
  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  /** Play one node's part for one beat. All nodes together make the full arrangement. */
  playBeat(part: Part, events: NoteEvent[], beatDurSec: number, voice = 0): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    for (const e of events) {
      if (e.kind === "tone" && e.midi != null) this.tone(part, midiToFreq(e.midi), e.gain, e.durBeats * beatDurSec, t, voice);
      else if (e.kind === "kick") this.kick(t, e.gain);
      else if (e.kind === "snare") this.snare(t, e.gain);
      else if (e.kind === "hat") this.hat(t, e.gain);
    }
  }

  private out(pan: number): AudioNode {
    const p = this.ctx!.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.master);
    return p;
  }

  private tone(part: Part, freq: number, gain: number, dur: number, t: number, voice: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = part === "bass" ? "triangle" : part === "melody" ? "sawtooth" : "triangle";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.out(PAN[part] + voice * 0.12));
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBuffer(dur: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  private kick(t: number, gain: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g).connect(this.out(0));
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private snare(t: number, gain: number): void {
    const ctx = this.ctx!;
    const src = this.noiseBuffer(0.2);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.connect(hp).connect(g).connect(this.out(0.05));
    src.start(t);
    src.stop(t + 0.2);
  }

  private hat(t: number, gain: number): void {
    const ctx = this.ctx!;
    const src = this.noiseBuffer(0.05);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp).connect(g).connect(this.out(-0.1));
    src.start(t);
    src.stop(t + 0.06);
  }

  /** Transmit a tone sequence as clear notes with gaps, for the sound channel. */
  transmit(tones: number[], toneDur = 0.18, gap = 0.07): number {
    if (!this.ctx) return 0;
    const ctx = this.ctx;
    let t = ctx.currentTime + 0.1;
    for (const tn of tones) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = midiToFreq(toneToMidi(tn));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.6, t + 0.01);
      g.gain.setValueAtTime(0.6, t + toneDur - 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + toneDur);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + toneDur);
      t += toneDur + gap;
    }
    return (t - ctx.currentTime) * 1000; // ms until done
  }
}
