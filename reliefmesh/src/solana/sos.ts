// SOS messages: signed with the phone's Solana key (tweetnacl, works offline). (Brief 10.3.)

import type { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

export interface SosPayload {
  text: string;
  lat: number | null;
  lng: number | null;
  ts: number;
  sig: string; // base58 ed25519 signature
}

const canonical = (origin: string, p: Omit<SosPayload, "sig">) => `${origin}|${p.ts}|${p.lat ?? ""}|${p.lng ?? ""}|${p.text}`;

export function createSos(user: Keypair, text: string, lat: number | null, lng: number | null): string {
  const body = { text: text.slice(0, 200), lat, lng, ts: Date.now() };
  const sig = bs58.encode(nacl.sign.detached(new TextEncoder().encode(canonical(user.publicKey.toBase58(), body)), user.secretKey));
  return JSON.stringify({ ...body, sig } satisfies SosPayload);
}

export function parseSos(payload: string): SosPayload | null {
  try {
    return JSON.parse(payload) as SosPayload;
  } catch {
    return null;
  }
}

export function verifySos(payload: string, origin: string): boolean {
  const p = parseSos(payload);
  if (!p) return false;
  try {
    return nacl.sign.detached.verify(new TextEncoder().encode(canonical(origin, p)), bs58.decode(p.sig), bs58.decode(origin));
  } catch {
    return false;
  }
}
