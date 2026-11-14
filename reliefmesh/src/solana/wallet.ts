import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export const RPC_URL = "https://api.devnet.solana.com";
export const connection = new Connection(RPC_URL, "confirmed");

export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export const explorerAddr = (a: string) => `https://explorer.solana.com/address/${a}?cluster=devnet`;

// DEMO ONLY: the secret key lives in IndexedDB. Production = secure enclave / wallet app.
export function createWallet(): { keypair: Keypair; secret: string } {
  const keypair = Keypair.generate();
  return { keypair, secret: bs58.encode(keypair.secretKey) };
}

export function loadWallet(secret: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(secret));
}

export async function getBalanceSol(address: string): Promise<number> {
  return (await connection.getBalance(new PublicKey(address))) / LAMPORTS_PER_SOL;
}

/** Devnet airdrop. The faucet rate-limits: if it fails use https://faucet.solana.com */
export async function airdrop(address: string, sol = 1): Promise<string> {
  const sig = await connection.requestAirdrop(new PublicKey(address), sol * LAMPORTS_PER_SOL);
  await waitForSignature(sig);
  return sig;
}

/** Poll until confirmed. Works for durable-nonce txs too (no blockhash expiry to track). */
export async function waitForSignature(sig: string, timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { value } = await connection.getSignatureStatuses([sig]);
    const st = value[0];
    if (st?.err) throw new Error(`Transaction failed: ${JSON.stringify(st.err)}`);
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Timed out waiting for confirmation");
}

export function isValidAddress(a: string): boolean {
  try {
    new PublicKey(a);
    return true;
  } catch {
    return false;
  }
}
