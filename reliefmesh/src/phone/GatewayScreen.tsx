import { useEffect, useState } from "react";
import { useApp, isOnline } from "./state";
import { addAck, markGateway } from "../core/router";
import { submitAll, type SubmitResult } from "../solana/gateway";
import { explorerTx, getBalanceSol } from "../solana/wallet";

export function GatewayScreen() {
  const { nodeState, keypair, mutateNode, addSubmitted, submitted, showToast, rev } = useApp();
  const [online, setOnline] = useState(isOnline());
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<SubmitResult[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  void rev;

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (online && keypair) getBalanceSol(keypair.publicKey.toBase58()).then(setBalance).catch(() => setBalance(null));
  }, [online, keypair, busy]);

  if (!nodeState || !keypair) return null;
  const packets = [...nodeState.packets.values()];

  const upload = async () => {
    setBusy(true);
    setLive([]);
    mutateNode((n) => markGateway(n, Date.now(), true));
    let delivered = 0;
    await submitAll(packets, keypair, (r) => {
      setLive((l) => [...l, r]);
      if (r.ok && r.ack) {
        delivered++;
        mutateNode((n) => addAck(n, r.ack!));
      }
      addSubmitted({
        packetId: r.packet.id,
        kind: r.packet.kind,
        sig: r.sig,
        ok: r.ok,
        note: r.ok ? (r.alreadyLanded ? "Already delivered by another phone" : "Delivered") : r.error ?? "Not delivered",
        at: Date.now(),
      });
    });
    setBusy(false);
    showToast(`Uploaded ${delivered} of ${packets.length}. Hand over again so other phones drop their copies.`);
  };

  return (
    <>
      <div>
        <h1 className="h1">Upload</h1>
        <p className="lede">
          {online
            ? "This phone has a connection. Upload everything it carries to Solana, urgent SOS first."
            : "No connection yet. Keep carrying. The moment any network appears, come back here."}
        </p>
      </div>

      <div className="panel">
        <button className="btn go" disabled={!online || busy || !packets.length} onClick={upload}>
          {busy ? "Uploading…" : packets.length ? `Upload ${packets.length} ${packets.length === 1 ? "packet" : "packets"}` : "Nothing to upload"}
        </button>
        {online && balance !== null && (
          <p className="note">This phone pays SOS fees from its wallet: {balance.toFixed(4)} SOL left.</p>
        )}
      </div>

      {live.length > 0 && (
        <ul className="packets">
          {live.map((r) => (
            <li key={r.packet.id} className={`packet p${r.packet.priority}`}>
              <div className="kind">{r.packet.kind === "sos" ? "SOS" : "Payment"}: {r.ok ? (r.alreadyLanded ? "already delivered by another phone" : "delivered") : "not delivered"}</div>
              <div className="meta">
                {r.ok && r.alreadyLanded && <span>Same signed copy, so it was paid only once.</span>}
                {!r.ok && <span>{r.error}. It stays on this phone; try again.</span>}
                {r.sig && <a href={explorerTx(r.sig)} target="_blank" rel="noreferrer">See it on Solana Explorer</a>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {submitted.length > 0 && (
        <div>
          <h2 className="h3">Earlier uploads</h2>
          <ul className="log">
            {submitted.slice(0, 20).map((s, i) => (
              <li key={i}>
                <span className="t">{new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span>
                  {s.kind === "sos" ? "SOS" : "Payment"}: {s.note.toLowerCase()}
                  {s.sig && <> · <a href={explorerTx(s.sig)} target="_blank" rel="noreferrer">Explorer</a></>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
