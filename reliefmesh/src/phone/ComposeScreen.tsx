import { useState } from "react";
import { useApp } from "./state";
import { makePacket } from "../core/packet";
import { addOwnPacket } from "../core/router";
import type { Priority } from "../core/types";
import { buildOfflinePayment } from "../solana/offlineTx";
import { createSos } from "../solana/sos";
import { isValidAddress } from "../solana/wallet";
import { IconPin } from "./Icons";

export function ComposeScreen({ onDone }: { onDone: () => void }) {
  const { keypair, nonces, setNonces, mutateNode, showToast, defaultRecipient } = useApp();
  const [mode, setMode] = useState<"sos" | "payment">("sos");
  const [text, setText] = useState("");
  const [urgent, setUrgent] = useState(true);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [amount, setAmount] = useState("0.1");
  const [note, setNote] = useState("");
  if (!keypair) return null;

  const freeSlots = nonces.filter((n) => !n.used);
  const freeNonce = freeSlots[0];

  const getLocation = () => {
    if (!navigator.geolocation) return showToast("This phone has no location service");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { showToast("Location not available. Describe where you are in the message."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const sendSos = () => {
    const payload = createSos(keypair, text.trim(), loc?.lat ?? null, loc?.lng ?? null);
    const priority: Priority = urgent ? 3 : 2;
    const p = makePacket({ kind: "sos", priority, origin: keypair.publicKey.toBase58(), payload, now: Date.now() });
    mutateNode((n) => addOwnPacket(n, p, Date.now()));
    showToast("SOS signed. Hand it to any phone nearby.");
    onDone();
  };

  const sendPayment = () => {
    if (!freeNonce) return;
    try {
      const payload = buildOfflinePayment(keypair, freeNonce, recipient, Number(amount), note.trim() || "aid");
      setNonces(nonces.map((n) => (n.noncePubkey === freeNonce.noncePubkey ? { ...n, used: true } : n)));
      const p = makePacket({ kind: "payment", priority: 1, origin: keypair.publicKey.toBase58(), payload, now: Date.now() });
      mutateNode((n) => addOwnPacket(n, p, Date.now()));
      showToast("Payment signed. Hand it to any phone nearby.");
      onDone();
    } catch (e) {
      showToast(`Payment not signed: ${e instanceof Error ? e.message : e}`);
    }
  };

  return (
    <>
      <h1 className="h1">{mode === "sos" ? "Ask for help" : "Send money"}</h1>
      <div className="seg" role="group" aria-label="Message type">
        <button aria-pressed={mode === "sos"} onClick={() => setMode("sos")}>SOS</button>
        <button aria-pressed={mode === "payment"} onClick={() => setMode("payment")}>Payment</button>
      </div>

      {mode === "sos" ? (
        <div className="panel">
          <label className="field">
            <span>What do you need, and where are you?</span>
            <textarea rows={4} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="2 people trapped in Block C, second floor. Need water." />
          </label>
          <label className="toggle">
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            <span><b>Someone's life is at risk.</b> Every phone that receives this passes it on, and it goes first.</span>
          </label>
          <button className="btn quiet" style={{ width: "100%", marginBottom: 12 }} onClick={getLocation} disabled={locating}>
            <IconPin />
            {locating ? "Finding your location…" : loc ? `Location added: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : "Add my GPS location"}
          </button>
          <button className="btn main" disabled={!text.trim()} onClick={sendSos}>Sign SOS</button>
          <p className="note">Signed with your key, so rescuers know it really came from this phone. GPS works without signal.</p>
        </div>
      ) : (
        <div className="panel">
          <label className="field">
            <span>Recipient's Solana address</span>
            <input value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="Family wallet address" />
          </label>
          <label className="field">
            <span>Amount in SOL</span>
            <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="field">
            <span>Note for the recipient</span>
            <input value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} placeholder="For food and water" />
          </label>
          {freeNonce ? (
            <p className="note" style={{ marginBottom: 12 }}>{freeSlots.length} offline {freeSlots.length === 1 ? "payment" : "payments"} left on this phone.</p>
          ) : (
            <div className="status warn" style={{ marginBottom: 12 }}>No offline payments left. Add more in Setup next time you have signal.</div>
          )}
          <button className="btn main" disabled={!freeNonce || !isValidAddress(recipient) || !(Number(amount) > 0)} onClick={sendPayment}>Sign payment</button>
          <p className="note">Signed now without signal. It settles on Solana as soon as any phone carrying it gets a connection, and it can only ever be paid once.</p>
        </div>
      )}
    </>
  );
}
