// Serialise a NodeState (which uses Maps) to plain JSON and back.
// The phone app wraps this with IndexedDB; core itself never touches storage.

import type { Ack, NodeState, Packet } from "./types";

export interface SerializedNode {
  id: string;
  packets: Packet[];
  acks: Ack[];
  capacity: number;
  gatewayPredictability: number;
  gpUpdatedAt: number;
  lastSeenGatewayAt: number | null;
}

export function serializeNode(n: NodeState): SerializedNode {
  return {
    id: n.id,
    packets: [...n.packets.values()],
    acks: [...n.acks.values()],
    capacity: n.capacity,
    gatewayPredictability: n.gatewayPredictability,
    gpUpdatedAt: n.gpUpdatedAt,
    lastSeenGatewayAt: n.lastSeenGatewayAt,
  };
}

export function deserializeNode(s: SerializedNode): NodeState {
  return {
    id: s.id,
    packets: new Map(s.packets.map((p) => [p.id, p])),
    acks: new Map(s.acks.map((a) => [a.packetId, a])),
    capacity: s.capacity,
    gatewayPredictability: s.gatewayPredictability,
    gpUpdatedAt: s.gpUpdatedAt,
    lastSeenGatewayAt: s.lastSeenGatewayAt,
    isGateway: false,
  };
}
