// A phone that has internet submits everything it carries. (Brief 10.4.)

import { Keypair, Transaction } from "@solana/web3.js";
import type { Ack, Packet } from "../core/types";
import { memoIx, txSignatureOf } from "./offlineTx";
import { parseSos, verifySos } from "./sos";
import { connection, waitForSignature } from "./wallet";

export interface SubmitResult {
  packet: Packet;
  ok: boolean;
  sig?: string;
  alreadyLanded?: boolean;
  error?: string;
  ack?: Ack;
}

async function isConfirmed(sig: string): Promise<boolean> {
  const { value } = await connection.getSignatureStatuses([sig], { searchTransactionHistory: true });
  const st = value[0];
  return !!st && !st.err && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized");
}

async function submitPayment(p: Packet): Promise<SubmitResult> {
  const sig = txSignatureOf(p.payload);
  // Another copy may already have landed (same signed tx = same signature). That is NOT a double-spend:
  // the nonce was advanced, so the chain only ever accepts one copy.
  if (await isConfirmed(sig)) {
    return { packet: p, ok: true, sig, alreadyLanded: true, ack: { packetId: p.id, txSig: sig, deliveredAt: Date.now() } };
  }
  await connection.sendRawTransaction(Buffer.from(p.payload, "base64"));
  await waitForSignature(sig);
  return { packet: p, ok: true, sig, ack: { packetId: p.id, txSig: sig, deliveredAt: Date.now() } };
}

async function submitSos(p: Packet, gateway: Keypair): Promise<SubmitResult> {
  if (!verifySos(p.payload, p.origin)) return { packet: p, ok: false, error: "Bad SOS signature: rejected" };
  const s = parseSos(p.payload)!;
  const loc = s.lat != null && s.lng != null ? `${s.lat.toFixed(5)},${s.lng.toFixed(5)}` : "-";
  const memo = `reliefmesh-sos|p${p.priority}|${loc}|${p.origin}|${s.sig}|${s.text}`;
  const tx = new Transaction().add(memoIx(memo.slice(0, 560), gateway.publicKey));
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = gateway.publicKey;
  tx.sign(gateway);
  const sig = await connection.sendRawTransaction(tx.serialize());
  await waitForSignature(sig);
  return { packet: p, ok: true, sig, ack: { packetId: p.id, txSig: sig, deliveredAt: Date.now() } };
}

/** Submits highest priority first. Never throws; each packet gets its own result. */
export async function submitAll(packets: Packet[], gateway: Keypair, onResult?: (r: SubmitResult) => void): Promise<SubmitResult[]> {
  const sorted = [...packets].sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  const results: SubmitResult[] = [];
  for (const p of sorted) {
    let r: SubmitResult;
    try {
      r = p.kind === "payment" ? await submitPayment(p) : await submitSos(p, gateway);
    } catch (e) {
      // A copy might have landed between our check and our send.
      try {
        if (p.kind === "payment" && (await isConfirmed(txSignatureOf(p.payload)))) {
          const sig = txSignatureOf(p.payload);
          r = { packet: p, ok: true, sig, alreadyLanded: true, ack: { packetId: p.id, txSig: sig, deliveredAt: Date.now() } };
        } else throw e;
      } catch {
        r = { packet: p, ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
    results.push(r);
    onResult?.(r);
  }
  return results;
}

export interface HqEntry {
  sig: string;
  time: number | null;
  kind: "sos" | "payment" | "other";
  priority?: number;
  location?: string;
  origin?: string;
  text: string;
}

/** Reads recent Memo txs that involve an address (e.g. the gateway wallet) for the HQ board. */
export async function fetchHqBoard(address: string, limit = 30): Promise<HqEntry[]> {
  const { PublicKey } = await import("@solana/web3.js");
  const sigs = await connection.getSignaturesForAddress(new PublicKey(address), { limit });
  const out: HqEntry[] = [];
  for (const s of sigs) {
    if (!s.memo || s.err) continue;
    for (const raw of s.memo.split("; ")) {
      const m = raw.replace(/^\[\d+\]\s*/, "");
      if (m.startsWith("reliefmesh-sos|")) {
        const [, pr, loc, origin, , ...text] = m.split("|");
        out.push({ sig: s.signature, time: s.blockTime ?? null, kind: "sos", priority: Number(pr.slice(1)), location: loc, origin, text: text.join("|") });
      } else if (m.startsWith("reliefmesh|")) {
        out.push({ sig: s.signature, time: s.blockTime ?? null, kind: "payment", text: m.slice("reliefmesh|".length) });
      }
    }
  }
  return out;
}
