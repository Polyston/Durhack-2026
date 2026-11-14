// Relief HQ: reads SOS memos that gateways posted on Solana devnet.

import { useEffect, useState } from "react";
import { useApp } from "./state";
import { fetchHqBoard, type HqEntry } from "../solana/gateway";
import { explorerTx, getBalanceSol, isValidAddress } from "../solana/wallet";
import { IconPin } from "./Icons";

export function HQBoard() {
  const { keypair } = useApp();
  const [address, setAddress] = useState(keypair?.publicKey.toBase58() ?? "");
  const [entries, setEntries] = useState<HqEntry[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!isValidAddress(address)) return;
    setError(null);
    try {
      setEntries(await fetchHqBoard(address));
      setBalance(await getBalanceSol(address));
    } catch {
      setError("Couldn't reach Solana. The board updates when this phone is online.");
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [address]);

  const sos = entries?.filter((e) => e.kind === "sos") ?? [];
  const pay = entries?.filter((e) => e.kind === "payment") ?? [];

  return (
    <>
      <div>
        <h1 className="h1">Relief HQ</h1>
        <p className="lede">Messages that reached the internet, read straight from Solana. Use an uploading phone's address for SOS, or a family wallet to see payments arrive.</p>
      </div>
      <label className="field">
        <span>Wallet address to watch</span>
        <input value={address} onChange={(e) => setAddress(e.target.value.trim())} />
      </label>
      {balance !== null && <p className="note">Balance: <b>{balance.toFixed(4)} SOL</b>. Refreshes every 10 seconds.</p>}
      {error && <div className="status warn">{error}</div>}

      {entries && !sos.length && !pay.length && (
        <div className="empty"><div className="h3">No messages yet</div><p className="note">Upload from a phone carrying an SOS, then check back here.</p></div>
      )}
      {(sos.length > 0 || pay.length > 0) && (
        <ul className="packets">
          {[...sos, ...pay].map((e) => (
            <li key={e.sig + e.text} className={`packet ${e.kind === "sos" ? `p${e.priority}` : "p1"}`}>
              <div className="kind">{e.kind === "sos" ? (e.priority === 3 ? "Urgent SOS" : "SOS") : "Payment note"}</div>
              <div className="body">{e.text}</div>
              <div className="meta">
                {e.time && <span>{new Date(e.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                {e.location && e.location !== "-" && (
                  <a style={{ display: "inline-flex", alignItems: "center", gap: 2 }} href={`https://www.openstreetmap.org/?mlat=${e.location.split(",")[0]}&mlon=${e.location.split(",")[1]}#map=18/${e.location.replace(",", "/")}`} target="_blank" rel="noreferrer">
                    <IconPin />Open location
                  </a>
                )}
                {e.origin && <span>Signature checked: from {e.origin.slice(0, 4)}…{e.origin.slice(-4)}</span>}
                <a href={explorerTx(e.sig)} target="_blank" rel="noreferrer">Explorer</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
