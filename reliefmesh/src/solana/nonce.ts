// Durable nonce accounts: created ONLINE, before the disaster.
// Each one = one payment that can later be signed fully offline. (Brief 10.1.)

import { Keypair, NONCE_ACCOUNT_LENGTH, NonceAccount, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { connection, waitForSignature } from "./wallet";

export interface StoredNonce {
  noncePubkey: string;
  nonce: string; // current nonce value (used instead of a recent blockhash)
  used: boolean;
}

export async function createNonceAccount(user: Keypair): Promise<StoredNonce> {
  const nonceKp = Keypair.generate();
  const rent = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: user.publicKey,
      newAccountPubkey: nonceKp.publicKey,
      lamports: rent,
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    }),
    SystemProgram.nonceInitialize({ noncePubkey: nonceKp.publicKey, authorizedPubkey: user.publicKey }),
  );
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = user.publicKey;
  tx.sign(user, nonceKp);
  const sig = await connection.sendRawTransaction(tx.serialize());
  await waitForSignature(sig);
  return { noncePubkey: nonceKp.publicKey.toBase58(), nonce: await fetchNonce(nonceKp.publicKey.toBase58()), used: false };
}

export async function fetchNonce(noncePubkey: string): Promise<string> {
  const info = await connection.getAccountInfo(new PublicKey(noncePubkey));
  if (!info) throw new Error("Nonce account not found");
  return NonceAccount.fromAccountData(info.data).nonce;
}

/** When back online: re-read every nonce. A used nonce whose tx landed has a NEW value, so it's reusable. */
export async function refreshNonces(list: StoredNonce[]): Promise<StoredNonce[]> {
  const out: StoredNonce[] = [];
  for (const n of list) {
    try {
      const value = await fetchNonce(n.noncePubkey);
      out.push({ ...n, nonce: value, used: n.used && value === n.nonce });
    } catch {
      out.push(n);
    }
  }
  return out;
}
