// End-to-end devnet check of the Solana part, no phones needed.
// Usage: npm run solana:smoke
// Optional: FUNDER_SECRET=<base58 secret of a funded devnet wallet> if the airdrop faucet is rate-limited.

import "../src/polyfills";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { makePacket } from "../src/core/packet";
import { buildOfflinePayment, txSignatureOf } from "../src/solana/offlineTx";
import { createNonceAccount } from "../src/solana/nonce";
import { createSos } from "../src/solana/sos";
import { submitAll } from "../src/solana/gateway";
import { connection, explorerTx, getBalanceSol, loadWallet } from "../src/solana/wallet";

async function main() {
  const user = Keypair.generate();
  const gateway = Keypair.generate();
  const family = Keypair.generate();
  console.log("user   ", user.publicKey.toBase58());
  console.log("gateway", gateway.publicKey.toBase58());

  // A reusable funder wallet saved in .devnet-funder.json (gitignored). Fund it once at faucet.solana.com.
  const { existsSync, readFileSync, writeFileSync } = await import("node:fs");
  const file = new URL("../.devnet-funder.json", import.meta.url);
  if (!process.env.FUNDER_SECRET) {
    if (!existsSync(file)) writeFileSync(file, JSON.stringify({ secret: (await import("bs58")).default.encode(Keypair.generate().secretKey) }));
    process.env.FUNDER_SECRET = JSON.parse(readFileSync(file, "utf8")).secret;
  }
  {
    const funder = loadWallet(process.env.FUNDER_SECRET!);
    const bal = await getBalanceSol(funder.publicKey.toBase58());
    console.log("funder ", funder.publicKey.toBase58(), "balance", bal);
    if (bal < 0.3) {
      console.log(`\nFund the funder wallet with devnet SOL at https://faucet.solana.com\n  address: ${funder.publicKey.toBase58()}\nthen run this again.`);
      process.exit(2);
    }
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: user.publicKey, lamports: 0.2 * LAMPORTS_PER_SOL }),
      SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: gateway.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
    );
    await sendAndConfirmTransaction(connection, tx, [funder]);
  }
  console.log("funded. user balance", await getBalanceSol(user.publicKey.toBase58()));

  // ---- ONLINE, before disaster: create a durable nonce slot
  const nonce = await createNonceAccount(user);
  console.log("nonce account", nonce.noncePubkey, "value", nonce.nonce);

  // ---- OFFLINE: sign payment + SOS (no network calls here)
  const payload = buildOfflinePayment(user, nonce, family.publicKey.toBase58(), 0.01, "smoke test");
  const payment = makePacket({ kind: "payment", priority: 1, origin: user.publicKey.toBase58(), payload, now: Date.now() });
  const sos = makePacket({ kind: "sos", priority: 3, origin: user.publicKey.toBase58(), payload: createSos(user, "smoke test SOS", 54.77, -1.57), now: Date.now() });
  console.log("signed offline. tx id will be", txSignatureOf(payload));

  // wait a bit so the blockhash used to create the nonce would have expired for a normal tx? (not needed; nonce never expires)

  // ---- GATEWAY: submit
  const r1 = await submitAll([payment, sos], gateway);
  for (const r of r1) console.log(r.packet.kind, r.ok ? "OK" : "FAIL", r.alreadyLanded ? "(already landed)" : "", r.sig ? explorerTx(r.sig) : r.error);

  // ---- A second copy of the same payment arrives at another gateway: must NOT pay twice
  const r2 = await submitAll([{ ...payment }], gateway);
  console.log("duplicate copy:", r2[0].ok ? "OK" : "FAIL", r2[0].alreadyLanded ? "(already landed → no double spend)" : "", r2[0].error ?? "");

  const famBal = await getBalanceSol(family.publicKey.toBase58());
  console.log("family balance", famBal, famBal === 0.01 ? "✓ paid exactly once" : "✗ unexpected");
}

main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
