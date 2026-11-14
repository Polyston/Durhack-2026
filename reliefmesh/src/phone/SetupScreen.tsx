import { useEffect, useState } from "react";
import { useApp, isOnline } from "./state";
import { airdrop, createWallet, explorerAddr, getBalanceSol, isValidAddress } from "../solana/wallet";
import { createNonceAccount, refreshNonces } from "../solana/nonce";

export function SetupScreen() {
  const { keypair, name, nonces, setWallet, setNonces, showToast, defaultRecipient, setDefaultRecipient, reset } = useApp();
  const [nameInput, setNameInput] = useState(name || "");
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [recipient, setRecipient] = useState(defaultRecipient);
  const address = keypair?.publicKey.toBase58();
  const online = isOnline();

  const refreshBalance = async () => {
    if (!address || !isOnline()) return;
    try {
      setBalance(await getBalanceSol(address));
    } catch {
      setBalance(null);
    }
  };
  useEffect(() => {
    refreshBalance();
  }, [address]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      showToast(`${label} didn't work: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(null);
      refreshBalance();
    }
  };

  if (!keypair) {
    return (
      <>
        <div>
          <h1 className="h1">Get ready before you need it</h1>
          <p className="lede">Set this up while you still have signal. It makes a wallet on this phone and prepares payments you can sign later with no connection.</p>
        </div>
        <div className="panel">
          <label className="field">
            <span>Your name, as other phones will see it</span>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Sarah" />
          </label>
          <button className="btn main" disabled={!nameInput.trim()} onClick={() => setWallet(createWallet().secret, nameInput.trim())}>
            Create my wallet
          </button>
        </div>
      </>
    );
  }

  const ready = nonces.filter((n) => !n.used).length;

  return (
    <>
      <div>
        <h1 className="h1">Setup</h1>
        <p className="lede">Do this while you have signal. After that, ReliefMesh works in airplane mode.</p>
      </div>

      <section className="panel">
        <h2 className="h3">Wallet</h2>
        <p className="note" style={{ marginBottom: 8 }}>Solana devnet address</p>
        <div className="address">{address}</div>
        <p style={{ margin: "12px 0" }}>
          Balance: <b>{balance === null ? (online ? "checking…" : "needs signal") : `${balance.toFixed(4)} SOL`}</b>
        </p>
        <div className="btns">
          <a
            className="btn"
            href="https://faucet.solana.com"
            target="_blank"
            rel="noreferrer"
            onClick={() => navigator.clipboard?.writeText(address!).then(() => showToast("Address copied. Paste it on the faucet page."))}
          >
            Get test SOL
          </a>
          <button className="btn quiet" onClick={() => navigator.clipboard?.writeText(address!).then(() => showToast("Address copied"))}>Copy address</button>
          <button className="btn quiet" onClick={refreshBalance} disabled={!online}>Check balance</button>
        </div>
        <details style={{ marginTop: 12 }}>
          <summary className="note">More options</summary>
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn small quiet" disabled={!!busy || !online} onClick={() => run("Airdrop", async () => { await airdrop(address!, 1); showToast("Added 1 test SOL"); })}>
              {busy === "Airdrop" ? "Requesting…" : "Try direct airdrop"}
            </button>
            <a className="btn small quiet" href={explorerAddr(address!)} target="_blank" rel="noreferrer">View on Explorer</a>
          </div>
          <p className="note">The direct airdrop is often switched off on devnet. The faucet page always works.</p>
        </details>
      </section>

      <section className="panel">
        <h2 className="h3">Offline payments</h2>
        <p className="note">Each slot lets you sign one payment later with no signal. Used slots come back after their payment is delivered.</p>
        {nonces.length > 0 && (
          <ul className="slots" aria-label={`${ready} of ${nonces.length} ready`}>
            {nonces.map((n, i) => <li key={n.noncePubkey} className={n.used ? "used" : ""} title={n.used ? "Used" : "Ready"}>{i + 1}</li>)}
          </ul>
        )}
        <div className="btns" style={{ marginTop: 14 }}>
          <button
            className="btn"
            disabled={!!busy || !online || nonces.length >= 5 || (balance ?? 0) <= 0}
            onClick={() =>
              run("Adding a payment slot", async () => {
                const n = await createNonceAccount(keypair);
                setNonces([...useApp.getState().nonces, n]);
                showToast("Payment slot added");
              })
            }
          >
            {busy === "Adding a payment slot" ? "Adding on Solana…" : "Add a payment slot"}
          </button>
          <button className="btn quiet" disabled={!!busy || !online || !nonces.some((n) => n.used)} onClick={() => run("Refreshing slots", async () => { setNonces(await refreshNonces(nonces)); showToast("Slots refreshed"); })}>
            Refresh used slots
          </button>
        </div>
        {(balance ?? 0) <= 0 && online && <p className="note">Add test SOL first; each slot costs a tiny deposit.</p>}
      </section>

      <section className="panel">
        <h2 className="h3">Who you send money to</h2>
        <label className="field">
          <span>Default recipient's Solana address</span>
          <input value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="Family wallet address" />
        </label>
        <button className="btn" disabled={!isValidAddress(recipient) || recipient === defaultRecipient} onClick={() => { setDefaultRecipient(recipient); showToast("Recipient saved"); }}>
          Save recipient
        </button>
      </section>

      <section className="panel flat">
        <p className="note">To use it with no signal: open the browser menu and choose Add to Home Screen while you're online.</p>
        <button className="btn quiet" style={{ marginTop: 8 }} onClick={() => confirm("Delete this phone's wallet and everything it carries?") && reset()}>
          Erase this phone
        </button>
      </section>
    </>
  );
}
