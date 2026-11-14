// Small checks for the routing core. Run: npm test
import assert from "node:assert/strict";
import { makePacket } from "../src/core/packet";
import { addAck, commitBroadcast, encounter, makeBroadcast, newNode, receiveBroadcast, storePacket } from "../src/core/router";
import { UNLIMITED } from "../src/core/types";
import { deserializeNode, serializeNode } from "../src/core/store";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`ok - ${name}`);
};

test("packet id is the sha256 of the payload (same packet = same id everywhere)", () => {
  const a = makePacket({ kind: "payment", priority: 1, origin: "A", payload: "hello", now: 0 });
  const b = makePacket({ kind: "payment", priority: 1, origin: "A", payload: "hello", now: 999 });
  assert.equal(a.id, b.id);
  assert.equal(a.id.length, 64);
});

test("encounter moves packets and halves the copy budget (binary spray)", () => {
  const a = newNode("A"), b = newNode("B");
  const p = makePacket({ kind: "payment", priority: 1, origin: "A", payload: "x", now: 0 });
  assert.equal(p.copiesLeft, 8);
  a.packets.set(p.id, p);
  encounter(a, b, 1000, "ours");
  assert.equal(b.packets.get(p.id)?.copiesLeft, 4);
  assert.equal(a.packets.get(p.id)?.copiesLeft, 4);
});

test("ACKs spread and delete delivered packets", () => {
  const a = newNode("A"), b = newNode("B");
  const p = makePacket({ kind: "payment", priority: 1, origin: "C", payload: "y", now: 0 });
  b.packets.set(p.id, { ...p });
  addAck(a, { packetId: p.id, deliveredAt: 5 });
  encounter(a, b, 1000, "ours");
  assert.equal(b.packets.has(p.id), false);
  assert.equal(b.acks.has(p.id), true);
});

test("urgent SOS has unlimited copies and always spreads", () => {
  const a = newNode("A"), b = newNode("B");
  const p = makePacket({ kind: "sos", priority: 3, origin: "A", payload: "help", now: 0 });
  assert.equal(p.copiesLeft, UNLIMITED);
  a.packets.set(p.id, p);
  encounter(a, b, 1000, "ours");
  assert.equal(b.packets.get(p.id)?.copiesLeft, UNLIMITED);
});

test("last copy only goes to a better carrier (higher gateway predictability)", () => {
  const a = newNode("A"), b = newNode("B");
  const p = { ...makePacket({ kind: "payment", priority: 1, origin: "Z", payload: "z", now: 0 }), copiesLeft: 1 };
  a.packets.set(p.id, p);
  a.gatewayPredictability = 0.5;
  b.gatewayPredictability = 0.1;
  encounter(a, b, 0, "ours");
  assert.equal(b.packets.has(p.id), false, "worse carrier should not get it");
  b.gatewayPredictability = 0.9;
  a.gatewayPredictability = 0.5;
  a.gpUpdatedAt = b.gpUpdatedAt = 0;
  encounter(a, b, 0, "ours");
  assert.equal(b.packets.has(p.id), true, "better carrier should get it");
});

test("full storage drops low priority first, never own packets, never for less important", () => {
  const n = newNode("N", 2);
  const own = makePacket({ kind: "payment", priority: 1, origin: "N", payload: "own", now: 0 });
  const other = makePacket({ kind: "payment", priority: 1, origin: "X", payload: "other", now: 0 });
  storePacket(n, own, 0, "ours");
  storePacket(n, other, 0, "ours");
  const status = makePacket({ kind: "payment", priority: 0, origin: "Y", payload: "low", now: 0 });
  assert.equal(storePacket(n, status, 0, "ours").accepted, false, "less important packet is rejected");
  const sos = makePacket({ kind: "sos", priority: 3, origin: "Y", payload: "sos", now: 0 });
  const r = storePacket(n, sos, 0, "ours");
  assert.equal(r.accepted, true);
  assert.equal(n.packets.has(own.id), true, "own packet kept");
  assert.equal(n.packets.has(other.id), false, "other payment evicted");
});

test("towers policy never transfers", () => {
  const a = newNode("A"), b = newNode("B");
  const p = makePacket({ kind: "payment", priority: 1, origin: "A", payload: "t", now: 0, policy: "towers" });
  a.packets.set(p.id, p);
  encounter(a, b, 0, "towers");
  assert.equal(b.packets.size, 0);
});

test("QR broadcast flow: share -> receive -> commit", () => {
  const a = newNode("A"), b = newNode("B");
  const p = makePacket({ kind: "payment", priority: 1, origin: "A", payload: "qr", now: 0 });
  a.packets.set(p.id, p);
  const { offers, acks } = makeBroadcast(a, 0);
  const r = receiveBroadcast(b, { fromGp: 0.4, fromIsGateway: false, packets: offers.map((o) => o.packet), acks }, 0);
  assert.equal(r.newPackets, 1);
  assert.ok(b.gatewayPredictability >= 0.2);
  commitBroadcast(a, offers);
  assert.equal(a.packets.get(p.id)?.copiesLeft, 4);
});

test("serialize / deserialize round trip", () => {
  const a = newNode("A");
  const p = makePacket({ kind: "sos", priority: 2, origin: "A", payload: "s", now: 0 });
  a.packets.set(p.id, p);
  addAck(a, { packetId: "zzz", deliveredAt: 1 });
  const back = deserializeNode(JSON.parse(JSON.stringify(serializeNode(a))));
  assert.deepEqual([...back.packets.keys()], [p.id]);
  assert.equal(back.acks.has("zzz"), true);
});

console.log(`\n${passed} tests passed`);
