import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import type { Frame, NodeId, Packet, PacketKind, Policy, Priority } from "./types";
import { initialCopies } from "./router";

export const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000;

export function packetIdFor(payload: string): string {
  return bytesToHex(sha256(utf8ToBytes(payload)));
}

export function makePacket(args: {
  kind: PacketKind;
  priority: Priority;
  origin: NodeId;
  payload: string;
  now: number;
  policy?: Policy;
  id?: string; // the sim passes a cheap id instead of hashing
  ttlMs?: number;
}): Packet {
  const policy = args.policy ?? "ours";
  return {
    id: args.id ?? packetIdFor(args.payload),
    kind: args.kind,
    priority: args.priority,
    createdAt: args.now,
    ttlMs: args.ttlMs ?? DEFAULT_TTL_MS,
    origin: args.origin,
    copiesLeft: initialCopies(args.kind, args.priority, policy),
    payload: args.payload,
  };
}

export function encodeFrame(f: Frame): string {
  return JSON.stringify(f);
}

export function decodeFrame(text: string): Frame | null {
  try {
    const f = JSON.parse(text) as Frame;
    if (f && f.v === 1 && typeof f.s === "string" && typeof f.i === "number" && typeof f.n === "number" && f.item) {
      return f;
    }
  } catch {
    /* not one of our QR codes */
  }
  return null;
}

export function priorityLabel(p: Priority): string {
  return ["status", "payment", "SOS: needs", "SOS: URGENT"][p];
}
