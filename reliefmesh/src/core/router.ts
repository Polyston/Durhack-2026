// The routing brain. Every node runs this ALONE, with only local information.
// No node ever receives instructions from anyone. (Brief section 9.)
//
// Same code runs on the real phones (policy "ours") and in the simulation
// (all four policies, for comparison).

import type { Ack, NodeId, NodeState, Packet, PacketId, PacketKind, Policy, Priority } from "./types";
import { UNLIMITED } from "./types";

export const PARAMS = {
  pInit: 0.75, // PRoPHET: boost when meeting a gateway
  beta: 0.5, // PRoPHET: transitive factor
  agingPerMin: 0.98, // PRoPHET: decay per minute
  perEncounterLimit: 20, // max packets per encounter (= what fits in ~10 s of QR)
  capacity: 50,
  copies: { payment: 8, sos2: 16, sprayWait: 8 },
};

export function initialCopies(kind: PacketKind, priority: Priority, policy: Policy): number {
  if (policy === "epidemic" || policy === "towers") return UNLIMITED;
  if (policy === "sprayWait") return PARAMS.copies.sprayWait;
  if (kind === "sos" && priority === 3) return UNLIMITED;
  if (kind === "sos") return PARAMS.copies.sos2;
  return PARAMS.copies.payment;
}

export function newNode(id: NodeId, capacity = PARAMS.capacity, now = 0): NodeState {
  return {
    id,
    packets: new Map(),
    acks: new Map(),
    capacity,
    gatewayPredictability: 0,
    gpUpdatedAt: now,
    lastSeenGatewayAt: null,
    isGateway: false,
  };
}

export const isExpired = (p: Packet, now: number) => now > p.createdAt + p.ttlMs;

// ---------------------------------------------------------------- gateway predictability

export function ageGp(n: NodeState, now: number): void {
  const mins = (now - n.gpUpdatedAt) / 60000;
  if (mins > 0) {
    n.gatewayPredictability *= Math.pow(PARAMS.agingPerMin, mins);
    n.gpUpdatedAt = now;
  }
}

/** Call when this node itself currently has internet. */
export function markGateway(n: NodeState, now: number, online: boolean): void {
  n.isGateway = online;
  if (online) {
    n.gatewayPredictability = 1;
    n.gpUpdatedAt = now;
    n.lastSeenGatewayAt = now;
  }
}

export function updateGpOnMeet(me: NodeState, peerGp: number, peerIsGateway: boolean, now: number): void {
  ageGp(me, now);
  if (peerIsGateway) {
    me.gatewayPredictability += (1 - me.gatewayPredictability) * PARAMS.pInit;
    me.lastSeenGatewayAt = now;
  }
  me.gatewayPredictability = Math.max(me.gatewayPredictability, peerGp * PARAMS.beta);
}

// ---------------------------------------------------------------- ACKs (grow-only set CRDT)

/** Adds an ACK and deletes the delivered packet. Returns true if it was new. */
export function addAck(n: NodeState, ack: Ack): boolean {
  n.packets.delete(ack.packetId);
  if (n.acks.has(ack.packetId)) return false;
  n.acks.set(ack.packetId, ack);
  return true;
}

export function mergeAcks(n: NodeState, acks: Iterable<Ack>): number {
  let added = 0;
  for (const a of acks) if (addAck(n, a)) added++;
  return added;
}

// ---------------------------------------------------------------- storage

export interface StoreResult {
  accepted: boolean;
  dropped: number; // packets evicted to make room
}

/** Store an incoming packet, evicting others if full (brief 9.2). */
export function storePacket(me: NodeState, p: Packet, now: number, policy: Policy): StoreResult {
  if (me.acks.has(p.id) || isExpired(p, now)) return { accepted: false, dropped: 0 };
  const existing = me.packets.get(p.id);
  if (existing) {
    // Already carrying it: keep the larger copy budget.
    if (existing.copiesLeft !== UNLIMITED && (p.copiesLeft === UNLIMITED || p.copiesLeft > existing.copiesLeft)) {
      existing.copiesLeft = p.copiesLeft;
    }
    return { accepted: false, dropped: 0 };
  }

  let dropped = 0;
  if (me.packets.size >= me.capacity) {
    for (const [id, q] of me.packets) if (isExpired(q, now)) me.packets.delete(id);
  }
  while (me.packets.size >= me.capacity) {
    const victim = pickVictim(me, p, policy);
    if (!victim) return { accepted: false, dropped };
    me.packets.delete(victim.id);
    dropped++;
  }
  me.packets.set(p.id, p);
  return { accepted: true, dropped };
}

function pickVictim(me: NodeState, incoming: Packet, policy: Policy): Packet | null {
  let best: Packet | null = null;
  for (const q of me.packets.values()) {
    if (q.origin === me.id) continue; // never drop my own packets
    if (policy === "ours") {
      // lowest priority first, then oldest
      if (!best || q.priority < best.priority || (q.priority === best.priority && q.createdAt < best.createdAt)) best = q;
    } else {
      // baselines: plain drop-oldest
      if (!best || q.createdAt < best.createdAt) best = q;
    }
  }
  if (!best) return null;
  // ours: never evict something more important than what's arriving
  if (policy === "ours" && best.priority > incoming.priority) return null;
  return best;
}

/** Add a packet I created myself. */
export function addOwnPacket(me: NodeState, p: Packet, now: number): boolean {
  return storePacket(me, p, now, "ours").accepted || me.packets.has(p.id);
}

// ---------------------------------------------------------------- choosing what to send

export interface PeerView {
  gp: number;
  isGateway: boolean;
  has: (id: PacketId) => boolean;
}

export interface Offer {
  packet: Packet; // a CLONE with copiesLeft = copies given to the peer
  senderKeeps: number; // sender's copiesLeft after a successful hand-over
}

export function score(p: Packet, now: number, myGp: number, peerGp: number): number {
  const ageMin = (now - p.createdAt) / 60000;
  const lastCopyPenalty = p.copiesLeft === 1 && peerGp <= myGp ? 5 : 0;
  return (p.priority + 1) * 10 + Math.min(10, ageMin / 10) - lastCopyPenalty;
}

/** Decide which packets to offer a peer. Does NOT mutate; call commitOffer after the peer accepts. */
export function selectToSend(
  me: NodeState,
  peer: PeerView,
  now: number,
  policy: Policy,
  limit = PARAMS.perEncounterLimit,
): Offer[] {
  if (policy === "towers") return [];
  const myGp = me.gatewayPredictability;
  const candidates = [...me.packets.values()].filter((p) => !isExpired(p, now) && !peer.has(p.id));
  const offers: Offer[] = [];

  if (policy === "epidemic") {
    candidates.sort((a, b) => a.createdAt - b.createdAt);
    for (const p of candidates.slice(0, limit)) offers.push({ packet: { ...p }, senderKeeps: p.copiesLeft });
    return offers;
  }

  if (policy === "sprayWait") {
    candidates.sort((a, b) => a.createdAt - b.createdAt);
    for (const p of candidates) {
      if (offers.length >= limit) break;
      if (p.copiesLeft > 1) {
        const give = Math.floor(p.copiesLeft / 2);
        offers.push({ packet: { ...p, copiesLeft: give }, senderKeeps: p.copiesLeft - give });
      } else if (peer.isGateway) {
        offers.push({ packet: { ...p, copiesLeft: 1 }, senderKeeps: 1 }); // direct delivery
      }
    }
    return offers;
  }

  // ---- ours
  candidates.sort((a, b) => score(b, now, myGp, peer.gp) - score(a, now, myGp, peer.gp));
  for (const p of candidates) {
    if (offers.length >= limit) break;
    if (p.copiesLeft === UNLIMITED) {
      offers.push({ packet: { ...p }, senderKeeps: UNLIMITED });
    } else if (p.copiesLeft > 1) {
      const give = Math.floor(p.copiesLeft / 2);
      offers.push({ packet: { ...p, copiesLeft: give }, senderKeeps: p.copiesLeft - give });
    } else if (peer.gp > myGp || peer.isGateway) {
      // last copy: only hand to a better carrier; keep mine as backup
      offers.push({ packet: { ...p, copiesLeft: 1 }, senderKeeps: 1 });
    }
  }
  return offers;
}

export function commitOffer(me: NodeState, offer: Offer): void {
  const mine = me.packets.get(offer.packet.id);
  if (mine) mine.copiesLeft = offer.senderKeeps;
}

// ---------------------------------------------------------------- full two-way encounter (simulation)

export interface EncounterResult {
  transfers: number;
  drops: number;
}

export function encounter(a: NodeState, b: NodeState, now: number, policy: Policy, limit = PARAMS.perEncounterLimit): EncounterResult {
  const res: EncounterResult = { transfers: 0, drops: 0 };
  if (policy === "towers") return res;

  if (policy === "ours") {
    // 1. ACKs first: cheap, and they free up space
    mergeAcks(a, [...b.acks.values()]);
    mergeAcks(b, a.acks.values());
    // 2. gateway predictability (use values from before the meeting)
    const gpA = a.gatewayPredictability;
    const gpB = b.gatewayPredictability;
    updateGpOnMeet(a, gpB, b.isGateway, now);
    updateGpOnMeet(b, gpA, a.isGateway, now);
  }

  const view = (n: NodeState): PeerView => ({ gp: n.gatewayPredictability, isGateway: n.isGateway, has: (id) => n.packets.has(id) || n.acks.has(id) });
  const aToB = selectToSend(a, view(b), now, policy, limit);
  const bToA = selectToSend(b, view(a), now, policy, limit);

  for (const [sender, receiver, offers] of [[a, b, aToB], [b, a, bToA]] as const) {
    for (const o of offers) {
      const r = storePacket(receiver, o.packet, now, policy);
      res.drops += r.dropped;
      if (r.accepted) {
        commitOffer(sender, o);
        res.transfers++;
      }
    }
  }
  return res;
}

// ---------------------------------------------------------------- one-way share (phones, by QR)

/** What a phone puts in its QR codes. Humans chose to hand over, so treat the peer as a willing carrier. */
export function makeBroadcast(me: NodeState, now: number, limit = PARAMS.perEncounterLimit): { offers: Offer[]; acks: Ack[] } {
  const offers = selectToSend(me, { gp: 1, isGateway: false, has: () => false }, now, "ours", limit);
  return { offers, acks: [...me.acks.values()].slice(-30) };
}

/** Sender confirms "they scanned it": apply spray (halve copy budgets). */
export function commitBroadcast(me: NodeState, offers: Offer[]): void {
  for (const o of offers) commitOffer(me, o);
}

export function receiveBroadcast(
  me: NodeState,
  msg: { fromGp: number; fromIsGateway: boolean; packets: Packet[]; acks: Ack[] },
  now: number,
): { newPackets: number; newAcks: number; dropped: number } {
  const newAcks = mergeAcks(me, msg.acks);
  updateGpOnMeet(me, msg.fromGp, msg.fromIsGateway, now);
  let newPackets = 0;
  let dropped = 0;
  for (const p of msg.packets) {
    const r = storePacket(me, { ...p }, now, "ours");
    dropped += r.dropped;
    if (r.accepted) newPackets++;
  }
  return { newPackets, newAcks, dropped };
}
