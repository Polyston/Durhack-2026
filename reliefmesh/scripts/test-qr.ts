// De-risks the phone-to-phone QR handoff WITHOUT phones, by exercising the exact frame
// protocol that ShareScreen (sender) and ScanScreen (receiver) use: build frames -> encode
// each to the string that goes in a QR -> decode -> reassemble -> receiveBroadcast.
import assert from "node:assert/strict";
import { makePacket, encodeFrame, decodeFrame } from "../src/core/packet";
import { addOwnPacket, makeBroadcast, newNode, receiveBroadcast, commitBroadcast } from "../src/core/router";
import type { Ack, Frame, Packet } from "../src/core/types";

let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log("ok -", name); };

// Mirror ShareScreen: turn a node's broadcast into the list of Frame strings its QR cycles through.
function buildFrames(node: ReturnType<typeof newNode>, now: number): { frames: string[]; offers: ReturnType<typeof makeBroadcast>["offers"] } {
  const { offers, acks } = makeBroadcast(node, now);
  const s = "sess01";
  const base = { v: 1 as const, s, from: node.id, gp: node.gatewayPredictability, gw: 0 as 0 | 1 };
  const items: Frame["item"][] = [...acks.map((a) => ({ t: "a" as const, a })), ...offers.map((o) => ({ t: "p" as const, p: o.packet }))];
  if (!items.length) items.push({ t: "x" });
  const frames = items.map((item, i) => encodeFrame({ ...base, i, n: items.length, item }));
  return { frames, offers };
}

// Mirror ScanScreen: collect scanned frame strings until a session is complete, then reassemble.
function scan(frameStrings: string[]): { packets: Packet[]; acks: Ack[]; gp: number; gw: 0 | 1 } | null {
  const bySession = new Map<string, Map<number, Frame>>();
  for (const str of frameStrings) {
    const f = decodeFrame(str);
    if (!f) continue;
    let m = bySession.get(f.s);
    if (!m) bySession.set(f.s, (m = new Map()));
    m.set(f.i, f); // duplicate i overwrites, exactly like the real collector
    if (m.size >= f.n) {
      const all = [...m.values()];
      const packets: Packet[] = [];
      const acks: Ack[] = [];
      for (const fr of all) {
        if (fr.item.t === "p") packets.push(fr.item.p);
        else if (fr.item.t === "a") acks.push(fr.item.a);
      }
      return { packets, acks, gp: f.gp, gw: f.gw };
    }
  }
  return null;
}

test("a signed SOS crosses from phone A to phone B through QR frames", () => {
  const a = newNode("A"), b = newNode("B");
  const sos = makePacket({ kind: "sos", priority: 3, origin: "A", payload: JSON.stringify({ text: "trapped, block C", sig: "x" }), now: 0 });
  addOwnPacket(a, sos, 0);
  const { frames, offers } = buildFrames(a, 0);
  const scanned = scan(frames)!;
  assert.ok(scanned, "receiver reassembled the session");
  const r = receiveBroadcast(b, { fromGp: scanned.gp, fromIsGateway: scanned.gw === 1, packets: scanned.packets, acks: scanned.acks }, 0);
  commitBroadcast(a, offers);
  assert.equal(r.newPackets, 1);
  assert.equal(b.packets.get(sos.id)?.kind, "sos");
  assert.equal(b.packets.get(sos.id)?.priority, 3);
});

test("multiple packets + an ACK all survive the round trip", () => {
  const a = newNode("A"), b = newNode("B");
  addOwnPacket(a, makePacket({ kind: "payment", priority: 1, origin: "A", payload: "pay1", now: 0 }), 0);
  addOwnPacket(a, makePacket({ kind: "sos", priority: 2, origin: "A", payload: "sos1", now: 0 }), 0);
  a.acks.set("deliveredX", { packetId: "deliveredX", deliveredAt: 1 });
  const { frames } = buildFrames(a, 0);
  const scanned = scan(frames)!;
  receiveBroadcast(b, { fromGp: scanned.gp, fromIsGateway: false, packets: scanned.packets, acks: scanned.acks }, 0);
  assert.equal(b.packets.size, 2);
  assert.ok(b.acks.has("deliveredX"), "the delivery receipt rode along and will clean up copies");
});

test("frames read out of order still reassemble", () => {
  const a = newNode("A"), b = newNode("B");
  addOwnPacket(a, makePacket({ kind: "payment", priority: 1, origin: "A", payload: "p", now: 0 }), 0);
  addOwnPacket(a, makePacket({ kind: "sos", priority: 3, origin: "A", payload: "s", now: 0 }), 0);
  const { frames } = buildFrames(a, 0);
  const shuffled = [...frames].reverse();
  const scanned = scan(shuffled)!;
  assert.equal(scanned.packets.length, frames.filter((f) => decodeFrame(f)!.item.t === "p").length);
});

test("duplicate scans of the same frame are harmless", () => {
  const a = newNode("A"), b = newNode("B");
  addOwnPacket(a, makePacket({ kind: "sos", priority: 3, origin: "A", payload: "s", now: 0 }), 0);
  const { frames } = buildFrames(a, 0);
  const withDupes = [frames[0], frames[0], ...frames]; // camera re-reads the same frame
  const scanned = scan(withDupes)!;
  receiveBroadcast(b, { fromGp: scanned.gp, fromIsGateway: false, packets: scanned.packets, acks: scanned.acks }, 0);
  assert.equal(b.packets.size, 1);
});

test("a missing frame means the session never completes (no half-messages)", () => {
  const a = newNode("A");
  addOwnPacket(a, makePacket({ kind: "payment", priority: 1, origin: "A", payload: "p1", now: 0 }), 0);
  addOwnPacket(a, makePacket({ kind: "sos", priority: 3, origin: "A", payload: "s1", now: 0 }), 0);
  const { frames } = buildFrames(a, 0);
  assert.ok(frames.length >= 2);
  const scanned = scan(frames.slice(0, -1)); // drop the last frame
  assert.equal(scanned, null);
});

test("each frame string is small enough to fit in one QR code", () => {
  const a = newNode("A");
  // a real signed Solana tx payload is ~470 base64 chars; use a realistic size
  addOwnPacket(a, makePacket({ kind: "payment", priority: 1, origin: "A".repeat(44), payload: "Q".repeat(480), now: 0 }), 0);
  const { frames } = buildFrames(a, 0);
  for (const f of frames) assert.ok(f.length < 900, `frame ${f.length} chars should fit a QR at low error correction`);
});

console.log(`\n${n} QR-handoff tests passed`);
