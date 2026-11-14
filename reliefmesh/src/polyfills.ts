// Solana libraries expect Node's Buffer. Imported FIRST in main.tsx.
import { Buffer } from "buffer";

(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
