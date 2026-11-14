// Prove the real optical path: encode a frame -> render an actual QR PNG -> decode the pixels
// with jsQR (a camera-grade decoder) -> get the identical frame back.
import assert from "node:assert/strict";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { makePacket, encodeFrame, decodeFrame } from "../src/core/packet";
import { addOwnPacket, makeBroadcast, newNode } from "../src/core/router";

async function renderAndDecode(text: string): Promise<string | null> {
  const buf = await QRCode.toBuffer(text, { errorCorrectionLevel: "L", margin: 2, width: 512, type: "png" });
  const png = PNG.sync.read(buf);
  const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return res ? res.data : null;
}

(async () => {
  const a = newNode("A");
  const payload = "Q".repeat(470); // realistic signed-tx size
  addOwnPacket(a, makePacket({ kind: "payment", priority: 1, origin: "Afamily4444", payload, now: 0 }), 0);
  const { offers } = makeBroadcast(a, 0);
  const frame = encodeFrame({ v: 1, s: "s1", from: a.id, gp: 0.3, gw: 0, i: 0, n: 1, item: { t: "p", p: offers[0].packet } });

  const decoded = await renderAndDecode(frame);
  assert.ok(decoded, "jsQR read the rendered QR");
  assert.equal(decoded, frame, "decoded string is byte-identical to the encoded frame");
  const f = decodeFrame(decoded!);
  assert.ok(f && f.item.t === "p" && f.item.p.payload === payload, "the packet survives the full optical round trip");
  console.log(`ok - real QR render+decode round trip (${frame.length} chars in a 512px QR)`);
  console.log("\n1 optical test passed");
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
