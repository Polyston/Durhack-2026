// Build and sign a payment with NO internet, using a durable nonce. (Brief 10.2.)

import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";
import type { StoredNonce } from "./nonce";

export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export function memoIx(text: string, signer?: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: signer ? [{ pubkey: signer, isSigner: true, isWritable: false }] : [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(text, "utf8"),
  });
}

/** Returns base64 of the fully signed tx (goes into Packet.payload). Mark the nonce as used after calling. */
export function buildOfflinePayment(user: Keypair, n: StoredNonce, recipient: string, sol: number, note: string): string {
  if (n.used) throw new Error("This nonce is already used");
  const tx = new Transaction();
  tx.add(SystemProgram.nonceAdvance({ noncePubkey: new PublicKey(n.noncePubkey), authorizedPubkey: user.publicKey })); // MUST be first
  tx.add(SystemProgram.transfer({ fromPubkey: user.publicKey, toPubkey: new PublicKey(recipient), lamports: Math.round(sol * LAMPORTS_PER_SOL) }));
  tx.add(memoIx(`reliefmesh|${note}`.slice(0, 120)));
  tx.recentBlockhash = n.nonce; // durable nonce instead of a recent blockhash: never expires
  tx.feePayer = user.publicKey;
  tx.sign(user);
  return tx.serialize().toString("base64");
}

/** A signed tx's first signature IS its transaction id, so every copy in the mesh has the same id on-chain. */
export function txSignatureOf(base64Tx: string): string {
  const tx = Transaction.from(Buffer.from(base64Tx, "base64"));
  if (!tx.signature) throw new Error("Unsigned transaction");
  return bs58.encode(tx.signature);
}

/** Human-readable summary of a payment payload, for the inbox. */
export function describePayment(base64Tx: string): { to: string; sol: number; note: string } | null {
  try {
    const tx = Transaction.from(Buffer.from(base64Tx, "base64"));
    let to = "?";
    let sol = 0;
    let note = "";
    for (const ix of tx.instructions) {
      if (ix.programId.equals(SystemProgram.programId) && ix.data.length === 12 && ix.data.readUInt32LE(0) === 2) {
        to = ix.keys[1].pubkey.toBase58();
        sol = Number(ix.data.readBigUInt64LE(4)) / LAMPORTS_PER_SOL;
      }
      if (ix.programId.equals(MEMO_PROGRAM_ID)) note = ix.data.toString("utf8").replace(/^reliefmesh\|/, "");
    }
    return { to, sol, note };
  } catch {
    return null;
  }
}
