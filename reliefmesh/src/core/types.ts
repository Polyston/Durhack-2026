// Shared types. Used by the phone app AND the simulation.
// Pure TypeScript: no React, no DOM, no IndexedDB.

export type NodeId = string; // base58 public key of the phone's wallet (or "n12" in the sim)
export type PacketId = string; // hex sha256 of the payload, so the same packet has the same id everywhere

/** 3 = SOS life-threatening, 2 = SOS needs, 1 = payment, 0 = status/chat */
export type Priority = 0 | 1 | 2 | 3;

export type PacketKind = "payment" | "sos";

/** copiesLeft value meaning "no copy limit" (SOS priority 3). JSON-safe, unlike Infinity. */
export const UNLIMITED = -1;

export interface Packet {
  id: PacketId;
  kind: PacketKind;
  priority: Priority;
  createdAt: number; // unix ms
  ttlMs: number; // discard after this
  origin: NodeId;
  copiesLeft: number; // spray-and-wait copy budget, or UNLIMITED
  payload: string; // payment: base64 signed Solana tx; sos: JSON {text, lat, lng, ts, sig}
}

export interface Ack {
  packetId: PacketId;
  txSig?: string; // Solana signature of the tx that delivered it
  deliveredAt: number;
}

export interface NodeState {
  id: NodeId;
  packets: Map<PacketId, Packet>;
  acks: Map<PacketId, Ack>; // grow-only set (CRDT): merge = union
  capacity: number; // max packets stored
  gatewayPredictability: number; // 0..1 (PRoPHET)
  gpUpdatedAt: number; // last time gp was aged
  lastSeenGatewayAt: number | null;
  isGateway: boolean; // has internet right now
}

/** One QR code frame (animated QR = many frames). */
export interface Frame {
  v: 1;
  s: string; // session id, so frames from two different shares never mix
  from: NodeId;
  gp: number; // sender's gateway predictability
  gw: 0 | 1; // sender is a gateway right now
  i: number; // frame index
  n: number; // total frames
  item: { t: "p"; p: Packet } | { t: "a"; a: Ack } | { t: "x" }; // "x" = empty share (just gp)
}

/** Routing strategies. The phones always use "ours"; the others are baselines for the simulation. */
export type Policy = "ours" | "epidemic" | "sprayWait" | "towers";
