// Scans another phone's animated QR, collects all frames, then hands them to the router.

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { useApp } from "./state";
import { decodeFrame } from "../core/packet";
import { receiveBroadcast } from "../core/router";
import type { Ack, Frame, Packet } from "../core/types";

export function ScanScreen({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { mutateNode, showToast, nodeState } = useApp();
  const [progress, setProgress] = useState<{ got: number; n: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const framesRef = useRef<{ s: string; frames: Map<number, Frame> } | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!videoRef.current) return;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        if (doneRef.current) return;
        const f = decodeFrame(result.data);
        if (!f) return;
        if (nodeState && f.from === nodeState.id) return;
        if (!framesRef.current || framesRef.current.s !== f.s) framesRef.current = { s: f.s, frames: new Map() };
        framesRef.current.frames.set(f.i, f);
        const got = framesRef.current.frames.size;
        setProgress({ got, n: f.n });
        if (got >= f.n) {
          doneRef.current = true;
          scanner.stop();
          const packets: Packet[] = [];
          const acks: Ack[] = [];
          for (const fr of framesRef.current.frames.values()) {
            if (fr.item.t === "p") packets.push(fr.item.p);
            else if (fr.item.t === "a") acks.push(fr.item.a);
          }
          let summary = "";
          mutateNode((n) => {
            const r = receiveBroadcast(n, { fromGp: f.gp, fromIsGateway: f.gw === 1, packets, acks }, Date.now());
            summary =
              r.newPackets || r.newAcks
                ? `Received ${r.newPackets} new ${r.newPackets === 1 ? "packet" : "packets"}${r.newAcks ? ` and ${r.newAcks} ${r.newAcks === 1 ? "receipt" : "receipts"}` : ""}.${r.dropped ? ` Made room by dropping ${r.dropped} less urgent.` : ""}`
                : "Received. You already had everything this phone carries.";
          });
          if (navigator.vibrate) navigator.vibrate(120);
          showToast(summary);
          onDone();
        }
      },
      { returnDetailedScanResult: true, highlightScanRegion: false, maxScansPerSecond: 15, preferredCamera: "environment" },
    );
    scanner.start().catch(() => setError("The camera didn't start. Allow camera access, and make sure the app is opened over https."));
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, []);

  return (
    <>
      <div>
        <h1 className="h1">Receive</h1>
        <p className="lede">Point the camera at the other phone's Hand over code. Hold steady until every part is read.</p>
      </div>
      <div className="scanner">
        <video ref={videoRef} playsInline muted />
        <div className="corners" />
      </div>
      {progress && (
        <div>
          <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={progress.n} aria-valuenow={progress.got}>
            <i style={{ width: `${(progress.got / progress.n) * 100}%` }} />
          </div>
          <p className="note">Read {progress.got} of {progress.n} parts</p>
        </div>
      )}
      {error && <div className="status bad">{error}</div>}
    </>
  );
}
