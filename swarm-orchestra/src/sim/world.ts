// The simulated swarm: many SwarmNodes in one page, with a message layer you can break.
// Same node code as a real device; only the transport is simulated, so the demo is reliable
// even in a loud room with no real radios.

import { SwarmNode } from "../core/node";
import { assign } from "../core/assign";
import { beatAt } from "../core/state";
import type { NodeId } from "../core/types";

export interface SwarmConfig {
  count: number;
  heartbeatMs: number; // how often nodes gossip
  aliveTimeoutMs: number; // silence before a peer is presumed gone
}

export const DEFAULT: SwarmConfig = { count: 5, heartbeatMs: 500, aliveTimeoutMs: 2500 };

export class Swarm {
  cfg: SwarmConfig;
  nodes: SwarmNode[];
  partition = new Map<NodeId, number>(); // node id -> group number; same number = can talk
  storm = false; // all links down
  private lastBeat = new Map<NodeId, number>();
  onBeat?: (nodeId: NodeId, beat: number) => void; // audio hook
  log: string[] = [];

  constructor(cfg: SwarmConfig, now: number) {
    this.cfg = cfg;
    this.nodes = Array.from({ length: cfg.count }, (_, i) => new SwarmNode(nodeName(i), now));
    for (const n of this.nodes) this.partition.set(n.id, 0);
  }

  node(id: NodeId): SwarmNode | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  private canTalk(a: NodeId, b: NodeId): boolean {
    if (this.storm) return false;
    return this.partition.get(a) === this.partition.get(b);
  }

  /** One gossip round: every alive node broadcasts; reachable peers receive. */
  gossip(now: number): void {
    const beats = this.nodes.map((n) => (n.alive ? n.heartbeat(now) : null));
    for (let i = 0; i < this.nodes.length; i++) {
      const hb = beats[i];
      if (!hb) continue;
      for (const other of this.nodes) {
        if (other.id === hb.from || !other.alive) continue;
        if (this.canTalk(hb.from, other.id)) other.receive(hb, now);
      }
    }
  }

  /** Advance audio: fire onBeat for each alive node that crossed into a new beat. */
  pump(now: number): void {
    for (const n of this.nodes) {
      if (!n.alive) continue;
      const beat = beatAt(n.state, now, n.offsetMs);
      if (this.lastBeat.get(n.id) !== beat) {
        this.lastBeat.set(n.id, beat);
        this.onBeat?.(n.id, beat);
      }
    }
  }

  // ---- controls the UI calls ----
  kill(id: NodeId): void {
    this.node(id)?.kill();
    this.record(`${id} dropped out`);
  }
  revive(id: NodeId, now: number): void {
    this.node(id)?.revive(now);
    this.record(`${id} rejoined`);
  }
  setStorm(on: boolean): void {
    this.storm = on;
    this.record(on ? "network storm: all links down" : "network restored");
  }
  /** Split the swarm into `groups` isolated partitions. */
  splitInto(groups: number): void {
    this.nodes.forEach((n, i) => this.partition.set(n.id, i % groups));
    this.record(groups > 1 ? `network split into ${groups} groups` : "network merged");
  }
  addNode(now: number): void {
    const id = nodeName(this.nodes.length);
    const n = new SwarmNode(id, now);
    this.nodes.push(n);
    this.partition.set(id, 0);
    this.record(`${id} joined`);
  }

  private record(msg: string): void {
    this.log.unshift(msg);
    if (this.log.length > 30) this.log.pop();
  }

  /** Are all alive nodes agreed on the same musical state? (A health read-out.) */
  inSync(): boolean {
    const alive = this.nodes.filter((n) => n.alive);
    if (!alive.length) return true;
    const v = alive[0].state;
    return alive.every((n) => n.state.version === v.version && n.state.origin === v.origin);
  }
}

// Each node's "true" assignment given global alive set is only knowable to itself; the UI
// reads each node's own assignment() so gaps/overlaps during a partition are visible.
export function nodeName(i: number): NodeId {
  return `N${String(i + 1).padStart(2, "0")}`;
}

export { assign };
