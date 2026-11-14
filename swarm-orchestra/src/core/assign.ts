// Leaderless role assignment. Every node runs this on its own view of who is alive
// and reaches the same answer with no negotiation. If the drummer vanishes from the
// known-alive set, the next node promotes itself automatically.

import { PARTS, type NodeId, type Part } from "./types";

/** Role for the i-th node (0-based) out of `total` sorted alive nodes.
 *  0 => drums, 1 => bass, 2 => chords, everyone else => melody. */
export function roleForIndex(i: number): Part {
  return i < PARTS.length ? PARTS[i] : "melody";
}

/** Extra melody players get a voice index (0,1,2…) so they harmonise instead of unison. */
export function voiceForIndex(i: number): number {
  return i < PARTS.length ? 0 : i - PARTS.length + 1;
}

export interface Assignment {
  part: Part;
  voice: number;
  index: number;
  total: number;
}

/** Assign from a set of alive ids. Deterministic: sorted by id. */
export function assign(selfId: NodeId, aliveIds: Iterable<NodeId>): Assignment {
  const sorted = [...new Set([...aliveIds, selfId])].sort();
  const index = sorted.indexOf(selfId);
  return { part: roleForIndex(index), voice: voiceForIndex(index), index, total: sorted.length };
}

/** Which parts are currently covered by a group (to show gaps in the UI). */
export function coveredParts(aliveCount: number): Set<Part> {
  const covered = new Set<Part>();
  for (let i = 0; i < aliveCount; i++) covered.add(roleForIndex(i));
  return covered;
}
