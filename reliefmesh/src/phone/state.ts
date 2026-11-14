// Phone app state (zustand) persisted to IndexedDB so it survives airplane mode and restarts.

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { Keypair } from "@solana/web3.js";
import { newNode } from "../core/router";
import { deserializeNode, serializeNode, type SerializedNode } from "../core/store";
import type { NodeState } from "../core/types";
import type { StoredNonce } from "../solana/nonce";
import { loadWallet } from "../solana/wallet";

export interface SubmittedEntry {
  packetId: string;
  kind: "payment" | "sos";
  sig?: string;
  ok: boolean;
  note: string;
  at: number;
}

interface Persisted {
  name: string;
  secret: string | null;
  nonces: StoredNonce[];
  node: SerializedNode | null;
  submitted: SubmittedEntry[];
  defaultRecipient: string;
}

interface AppState extends Persisted {
  loaded: boolean;
  rev: number; // bump after mutating node Maps so React re-renders
  keypair: Keypair | null;
  nodeState: NodeState | null;
  toast: string | null;
  load: () => Promise<void>;
  setWallet: (secret: string, name: string) => void;
  setNonces: (n: StoredNonce[]) => void;
  setDefaultRecipient: (a: string) => void;
  addSubmitted: (e: SubmittedEntry) => void;
  /** Mutate the node (Maps) then persist. */
  mutateNode: (fn: (n: NodeState) => void) => void;
  showToast: (t: string) => void;
  reset: () => Promise<void>;
}

const KEY = "reliefmesh-v1";

export const useApp = create<AppState>((set, get) => {
  const persist = () => {
    const s = get();
    const data: Persisted = {
      name: s.name,
      secret: s.secret,
      nonces: s.nonces,
      node: s.nodeState ? serializeNode(s.nodeState) : null,
      submitted: s.submitted,
      defaultRecipient: s.defaultRecipient,
    };
    idbSet(KEY, data).catch((e) => console.error("persist failed", e));
  };

  return {
    loaded: false,
    rev: 0,
    name: "",
    secret: null,
    nonces: [],
    node: null,
    submitted: [],
    defaultRecipient: "",
    keypair: null,
    nodeState: null,
    toast: null,

    load: async () => {
      let data: Persisted | undefined;
      try {
        // Never hang on a broken/blocked IndexedDB (private mode etc.): give up after 2 s.
        data = await Promise.race([idbGet<Persisted>(KEY), new Promise<undefined>((r) => setTimeout(() => r(undefined), 2000))]);
      } catch {
        data = undefined;
      }
      if (data?.secret) {
        const keypair = loadWallet(data.secret);
        const nodeState = data.node ? deserializeNode(data.node) : newNode(keypair.publicKey.toBase58(), 50, Date.now());
        set({ ...data, keypair, nodeState, loaded: true });
      } else {
        set({ loaded: true });
      }
    },

    setWallet: (secret, name) => {
      const keypair = loadWallet(secret);
      set({ secret, name, keypair, nodeState: newNode(keypair.publicKey.toBase58(), 50, Date.now()) });
      persist();
    },
    setNonces: (nonces) => {
      set({ nonces });
      persist();
    },
    setDefaultRecipient: (defaultRecipient) => {
      set({ defaultRecipient });
      persist();
    },
    addSubmitted: (e) => {
      set({ submitted: [e, ...get().submitted].slice(0, 100) });
      persist();
    },
    mutateNode: (fn) => {
      const n = get().nodeState;
      if (!n) return;
      fn(n);
      set({ rev: get().rev + 1 });
      persist();
    },
    showToast: (t) => {
      set({ toast: t });
      setTimeout(() => get().toast === t && set({ toast: null }), 3500);
    },
    reset: async () => {
      await idbSet(KEY, undefined);
      location.reload();
    },
  };
});

/** True if the browser thinks it has a network. (Airplane mode = false.) */
export const isOnline = () => typeof navigator !== "undefined" && navigator.onLine;
