// Microphone listener for the sound channel: detect tones, group them into a message,
// and decode it. This is the risky-but-magic part of the demo, kept isolated so it can
// never break the main swarm.

import { decode, toneFrequencies, type DecodeResult } from "../core/codec";
import { detectTone } from "../core/goertzel";

export interface ListenerCallbacks {
  onTone?: (index: number) => void; // a confident tone right now (-1 = silence)
  onMessage?: (result: DecodeResult, tones: number[]) => void; // a full message decoded on a gap
}

export class MicListener {
  private ctx: AudioContext | null = null;
  private analyser: Analyser | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private freqs = toneFrequencies();
  private current = -1;
  private stableCount = 0;
  private silenceCount = 0;
  private collected: number[] = [];
  running = false;

  constructor(private cb: ListenerCallbacks, private minSnr = 5) {}

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const src = ctx.createMediaStreamSource(this.stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    this.ctx = ctx;
    this.analyser = analyser as unknown as Analyser;
    this.running = true;
    this.loop();
  }

  private loop = (): void => {
    if (!this.running || !this.analyser || !this.ctx) return;
    const buf = new Float32Array(this.analyser.fftSize);
    (this.analyser as unknown as AnalyserNode).getFloatTimeDomainData(buf);
    const det = detectTone(buf, this.ctx.sampleRate, this.freqs, this.minSnr);

    if (det.index >= 0) {
      this.silenceCount = 0;
      if (det.index === this.current) {
        this.stableCount++;
        if (this.stableCount === 3) {
          this.collected.push(det.index); // a new, stable tone
          this.cb.onTone?.(det.index);
        }
      } else {
        this.current = det.index;
        this.stableCount = 1;
      }
    } else {
      this.current = -1;
      this.stableCount = 0;
      this.silenceCount++;
      // a long gap ends the message
      if (this.silenceCount === 20 && this.collected.length) {
        const tones = this.collected;
        this.collected = [];
        this.cb.onMessage?.(decode(tones), tones);
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.ctx = null;
  }
}

// local alias so the field type reads clearly
type Analyser = AnalyserNode;
