// A single swarm member. It keeps its own view of the shared state and of who is alive,
// and reaches decisions (its musical part, the current beat) alone. It never takes orders.

import { assign, type Assignment } from "./assign";
import { defaultState, mergeState } from "./state";
import type { Heartbeat, NodeId, SharedState } from "./types";

export class SwarmNode {
  id: NodeId;
  state: SharedState;
  alive = true;
  offsetMs = 0; // local clock skew; drifts when isolated, pulled back on reconnect
  known = new Map<NodeId, number>(); // peer id -> last time heard (ms)

  constructor(id: NodeId, now: number, state?: SharedState) {
    this.id = id;
    this.state = state ?? defaultState(id, now);
    this.known.set(id, now);
  }

  /** Ids believed alive right now (heard within `timeout`), including self. */
  aliveSet(now: number, timeout = 2500): Set<NodeId> {
    const out = new Set<NodeId>();
    if (this.alive) out.add(this.id);
    for (const [id, seen] of this.known) if (now - seen <= timeout) out.add(id);
    return out;
  }

  assignment(now: number, timeout = 2500): Assignment {
    return assign(this.id, this.aliveSet(now, timeout));
  }

  /** Build the heartbeat this node broadcasts. */
  heartbeat(now: number): Heartbeat {
    this.known.set(this.id, now);
    return { from: this.id, sentAt: now, state: this.state, known: [...this.known.entries()] };
  }

  /** Handle a heartbeat from a peer: merge musical state, gossip membership. */
  receive(hb: Heartbeat, now: number): void {
    if (!this.alive) return;
    const merged = mergeState(this.state, hb.state);
    if (merged !== this.state) {
      this.state = merged;
      // adopting the group's state is the "resync": pull our clock toward the shared epoch
      this.offsetMs *= 0.5;
    }
    this.known.set(hb.from, now);
    for (const [id, seen] of hb.known) {
      const prev = this.known.get(id) ?? -Infinity;
      if (seen > prev) this.known.set(id, Math.min(seen, now));
    }
  }

  kill(): void {
    this.alive = false;
  }

  revive(now: number): void {
    this.alive = true;
    this.known.set(this.id, now);
  }
}
