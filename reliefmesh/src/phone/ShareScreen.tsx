// Shows my packets + ACKs as an animated QR code (one item per frame, ~3 frames/second).

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useApp, isOnline } from "./state";
import { encodeFrame } from "../core/packet";
import { commitBroadcast, makeBroadcast } from "../core/router";
import type { Frame } from "../core/types";

export function ShareScreen() {
  const { nodeState, mutateNode, showToast, rev } = useApp();
  const [frameIdx, setFrameIdx] = useState(0);
  const [images, setImages] = useState<string[]>([]);

  const { frames, offers, ackCount } = useMemo(() => {
    if (!nodeState) return { frames: [] as Frame[], offers: [], ackCount: 0 };
    const now = Date.now();
    const { offers, acks } = makeBroadcast(nodeState, now);
    const s = Math.random().toString(36).slice(2, 8);
    const base = { v: 1 as const, s, from: nodeState.id, gp: nodeState.gatewayPredictability, gw: (isOnline() ? 1 : 0) as 0 | 1 };
    const items: Frame["item"][] = [...acks.map((a) => ({ t: "a" as const, a })), ...offers.map((o) => ({ t: "p" as const, p: o.packet }))];
    if (!items.length) items.push({ t: "x" });
    return { frames: items.map((item, i) => ({ ...base, i, n: items.length, item })), offers, ackCount: acks.length };
  }, [nodeState, rev]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(frames.map((f) => QRCode.toDataURL(encodeFrame(f), { errorCorrectionLevel: "L", margin: 1, width: 480 }))).then(
      (imgs) => !cancelled && setImages(imgs),
    );
    return () => {
      cancelled = true;
    };
  }, [frames]);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setFrameIdx((i) => (i + 1) % images.length), 350);
    return () => clearInterval(t);
  }, [images.length]);

  if (!nodeState) return null;
  const n = offers.length;
  const current = frameIdx % Math.max(1, images.length);

  return (
    <>
      <div>
        <h1 className="h1">Hand over</h1>
        <p className="lede">
          {n
            ? `Hold this up to another phone's Receive screen. It passes on ${n} ${n === 1 ? "packet" : "packets"}${ackCount ? ` and ${ackCount} delivery ${ackCount === 1 ? "receipt" : "receipts"}` : ""}.`
            : ackCount
              ? `Nothing to pass on, but sharing ${ackCount} delivery ${ackCount === 1 ? "receipt" : "receipts"} stops other phones carrying finished messages.`
              : "You're not carrying anything yet. The other phone still learns how close you are to the internet."}
        </p>
      </div>
      <div className="tape">
        <div className="tape-inner">
          {images.length ? <img className="qr" src={images[current]} alt={`Packet code, part ${current + 1} of ${images.length}`} /> : <div className="qr" />}
        </div>
      </div>
      {images.length > 1 && (
        <div className="frames" aria-label={`Part ${current + 1} of ${images.length}`}>
          {images.map((_, i) => <i key={i} className={i === current ? "on" : ""} />)}
        </div>
      )}
      <button
        className="btn main"
        disabled={!n}
        onClick={() => {
          mutateNode((node) => commitBroadcast(node, offers));
          showToast("Marked as handed over. Keep your copies until they're delivered.");
        }}
      >
        Mark as handed over
      </button>
    </>
  );
}
