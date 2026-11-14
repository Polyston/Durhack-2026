# Deep Search — project brief

> **Status:** built and tested; Solana devnet and Anchor not verified in the build environment &nbsp;·&nbsp; **Code:** [`deep-search/`](deep-search/) &nbsp;·&nbsp; **Prizes:** Neptune North, MLH Best Use of Solana
>
> The project is already built — this is the spec to understand, demo and extend it. Sections 1–4 are the overview; 5 onward is the build detail. Roles are in section 10. See [`deep-search/README.md`](deep-search/README.md) for exactly what was and wasn't verified.

---

## 1. One-sentence pitch

**A swarm of autonomous underwater drones searches the ocean floor for a crashed plane's black box. They keep working even when communication fails, and every scan is signed offline and settled on Solana when the drones surface.**

## 2. Target prizes (only these two)

| Prize | Prize value | What judges want |
|---|---|---|
| **Neptune North: "Actors work better together"** (MAIN TARGET) | £1,000 (1st), mechanical keyboards (2nd and 3rd) | Multiple actors, common goal, independent decisions, resilience when comms fail |
| **MLH: Best Use of Solana** (secondary) | Hardware wallets | Meaningful use of Solana |

We are NOT entering other tracks. Don't add features for other sponsors.

### Neptune North judging criteria and how we hit each one

| Criterion | Our answer |
|---|---|
| Working towards a common goal | All drones share one goal: find the black box as fast as possible |
| Independent decision-making | No central controller. Each drone picks its own next search area from its own probability map |
| Resilience when communications fail | Underwater comms are short-range and lossy. Drones keep searching when cut off and merge their knowledge when they reconnect |
| Something you're excited about | A real-world problem (MH370, Air France 447), using real search maths (Bayesian search theory) |

### Why this story is real (use it in the pitch)
- Radio does not work underwater. Acoustic modems are short-range, slow and drop packets, so the comms problem is real, not made up.
- **Bayesian search theory** was used to find Air France 447 (2011), the USS Scorpion submarine, and in the MH370 search.
- Ocean Infinity searched for MH370 on a **"no find, no fee"** contract. That's why we need *provable search coverage* and *automatic bounty payout*, which is where Solana comes in.

---

## 3. What the demo looks like (build towards this)

A single web page:

```
+--------------------------------------------------+-------------------+
|                                                  |  CONTROLS         |
|   OCEAN MAP (grid heatmap = probability)          |  Strategy: [ours] |
|   - drones = coloured dots with comm-range circle |  Packet loss: ===o|
|   - lines between drones = active comm links     |  Comm range:  =o==|
|   - mothership (for centralized baseline)        |  [Kill drone]     |
|   - black box hidden (shown when found)          |  [Kill mothership]|
|                                                  |  [STORM 30s]      |
|                                                  |  [Play/Pause/Step]|
+--------------------------------------------------+-------------------+
|  EVENT LOG: "Drone 3 surfaced -> proof committed -> [Explorer link]" |
|  STATS: tick, coverage %, redundant scans %, bounty wallet balance   |
+----------------------------------------------------------------------+
|  RESULTS CHART: time-to-find vs packet loss, 3 strategies            |
+----------------------------------------------------------------------+
```

### 3-minute demo script
1. "MH370 was never found. Searches are slow, communication underwater is terrible, and contractors are paid 'no find, no fee'."
2. Start the sim with 6 drones and our strategy. The heatmap cools as areas get searched.
3. Drag packet loss to 70%. The drones keep searching. Show a drone that got cut off still working.
4. Switch to the **centralized** strategy and click **Kill mothership**. The whole swarm stalls. Switch back to ours and it carries on.
5. Click **STORM** (0 comms for 30 s). Drones work alone. When the storm ends, their maps merge instantly.
6. A drone finds the box. Event log: signed detection → `claim_bounty` → bounty paid on Solana devnet. Click the Explorer link.
7. **Winning slide:** the chart showing our strategy stays close to centralized speed at high packet loss, while centralized collapses when the hub dies and no-comms is slow.

---

## 4. Tech stack (exact libraries)

Pin these versions so nobody hits breaking changes.

| Purpose | Library | Version |
|---|---|---|
| Build tool | `vite` | 5.4.x |
| Language | TypeScript | 5.6.x |
| UI | `react`, `react-dom` | 18.3.1 |
| State | `zustand` | 4.5.x |
| Ocean rendering | **HTML Canvas 2D** (no library) | built-in |
| Results chart | `recharts` | 2.13.x |
| Seeded random (reproducible experiments) | `seedrandom` (+ `@types/seedrandom`) | 3.0.5 |
| Run experiments in Node | `tsx` | 4.19.x |
| Solana client | `@solana/web3.js` | **1.95.x** (NOT 2.x / @solana/kit; Anchor needs 1.x) |
| Anchor client | `@coral-xyz/anchor` | 0.30.1 |
| Signing | `tweetnacl` | 1.0.3 |
| Hashing (Merkle) | `@noble/hashes` | 1.5.x |
| Base58 | `bs58` | 6.0.x |
| Solana program (contract) | **Anchor in Solana Playground** (https://beta.solpg.io) | Playground default |

Vite needs a Buffer polyfill for Solana libs: `npm i buffer` and add at the top of `main.tsx`:
```ts
import { Buffer } from "buffer";
(window as any).Buffer = Buffer;
```

### Setup
```bash
npm create vite@latest deep-search -- --template react-ts
cd deep-search
npm i zustand@4.5 recharts@2.13 seedrandom@3.0.5 @solana/web3.js@1.95 @coral-xyz/anchor@0.30.1 tweetnacl@1.0.3 @noble/hashes@1.5 bs58@6 buffer
npm i -D @types/seedrandom tsx
npm run dev
```

Use one GitHub repo. Everyone works on their own folder (see section 5) to avoid merge conflicts.

---

## 5. Folder structure

```
deep-search/
  src/
    sim/                  <- PURE TypeScript, NO React, NO DOM (so it runs in Node too)
      types.ts            shared types (section 6)
      rng.ts              seeded random
      world.ts            grid, prior, hidden box, tick loop
      belief.ts           Bayesian probability map
      drone.ts            drone decision logic
      comms.ts            comm range, packet loss, storms, message delivery
      strategies/
        ours.ts           decentralized gossip (our approach)
        centralized.ts    mothership assigns targets (baseline)
        nocomm.ts         every drone alone (baseline)
      metrics.ts          coverage, redundancy, time-to-find
    solana/
      keys.ts             drone keypairs, signing, verification
      merkle.ts           Merkle root of scan records
      client.ts           calls to the Anchor program / Memo fallback
    ui/
      App.tsx
      OceanCanvas.tsx     draws the grid, drones, links
      Controls.tsx        sliders and buttons
      EventLog.tsx
      ResultsChart.tsx
      store.ts            zustand store wrapping the sim
  scripts/
    experiments.ts        runs many seeds headless -> results.json
  public/
    results.json          output of experiments, loaded by ResultsChart
  program/
    lib.rs                copy of the Anchor program from Solana Playground
```

**Rule:** `src/sim/` must never import React or anything from `src/ui/`. The UI reads the sim state; the sim doesn't know the UI exists.

---

## 6. Core data types (`src/sim/types.ts`)

Agree on these FIRST (in the first 30 minutes) so everyone can work in parallel.

```ts
export type Cell = number;              // index = y * W + x
export type DroneId = number;

export interface Vec { x: number; y: number }

export interface ScanRecord {
  droneId: DroneId;
  seq: number;          // per-drone sequence number: 0, 1, 2, ...
  cell: Cell;
  tick: number;
  found: boolean;
  sig?: string;         // base58 ed25519 signature (Solana keypair), added by solana/keys.ts
}

export interface Intent {               // "I'm heading here"
  droneId: DroneId;
  target: Cell;
  tick: number;         // when this intent was sent
}

export interface DroneState {
  id: DroneId;
  pos: Vec;
  alive: boolean;
  target: Cell | null;
  battery: number;                       // optional; can ignore
  records: Map<string, ScanRecord>;      // key = `${droneId}:${seq}` (all records this drone knows)
  knownSeq: Map<DroneId, number>;        // highest contiguous seq known per drone (version vector)
  peerIntents: Map<DroneId, Intent>;     // last intent heard from each peer
  nextSeq: number;
}

export type Message =
  | { kind: "hello"; from: DroneId; pos: Vec; intent: Intent; knownSeq: [DroneId, number][] }
  | { kind: "records"; from: DroneId; records: ScanRecord[] };

export interface Config {
  W: number; H: number;          // grid size, default 60 x 40
  numDrones: number;             // default 6
  pDetect: number;               // chance of detecting the box when scanning its cell, default 0.8
  commRange: number;             // in cells, default 8
  packetLoss: number;            // 0..1
  seed: string;
  strategy: "ours" | "centralized" | "nocomm";
  maxTicks: number;              // default 3000
}

export interface WorldState {
  cfg: Config;
  tick: number;
  prior: Float64Array;           // length W*H, sums to 1
  boxCell: Cell;                 // ground truth (hidden from drones!)
  drones: DroneState[];
  mothership: { pos: Vec; alive: boolean };
  stormUntil: number;            // tick until which all comms fail
  found: { tick: number; by: DroneId } | null;
  events: string[];              // for the UI event log
}
```

---

## 7. The algorithms (exact rules)

### 7.1 World and prior
- Grid `W=60, H=40`. Each cell is a patch of seabed.
- **Prior** = where the box probably is, before searching. Build it as a mix of 2–3 Gaussian blobs (e.g. "last known position" plus "drift direction"), then normalise so it sums to 1.
- **Hidden box:** sample `boxCell` from the prior with the seeded RNG. Drones NEVER read `boxCell` directly; only `world.ts` checks it when a drone scans.

### 7.2 Sensing
- Each tick a drone moves 1 cell (8 directions allowed) towards its target, then **scans its current cell**.
- If `cell === boxCell`, it detects the box with probability `pDetect` (0.8). Otherwise nothing (no false alarms, to keep it simple).
- Every scan creates a `ScanRecord` with the next `seq` and is stored in the drone's own `records`.

### 7.3 Belief (Bayesian search), in `belief.ts`
A drone's belief is computed from the prior plus **all records it knows**:

```
n[c]       = number of unsuccessful scans of cell c in known records
belief[c]  = prior[c] * (1 - pDetect) ^ n[c]
belief     = belief / sum(belief)          // normalise
```

Because belief only depends on the **set of records**, merging is trivial and order doesn't matter. This is a **G-Set CRDT** (grow-only set): merge = set union. Put that phrase on a slide; judges like it.

Performance tip: keep `n[c]` as an `Int32Array` per drone and update it incrementally when new records arrive, instead of recomputing from scratch.

### 7.4 Decision rule (each drone, every tick, no central control)
For every candidate cell `c` (or sample ~200 high-probability cells for speed):

```
gain(c)    = belief[c] * pDetect
dist(c)    = chebyshev distance from drone to c
claimed(c) = 1 if some peer's last intent is within 3 cells of c,
             weighted by freshness: exp(-(tick - intent.tick) / 50)
score(c)   = gain(c) / (1 + 0.15 * dist(c))  *  (1 - 0.8 * claimed(c))
target     = argmax score(c)
```

- Re-pick the target when the drone reaches it, or every 20 ticks.
- `claimed` is what stops all drones crowding into the same hotspot, and it uses **stale** intents when comms are down ("I last heard drone 2 was heading north-west, so I'll avoid that area"). This is our resilience trick.
- Tie-break deterministically by drone id so the behaviour is reproducible.

### 7.5 Communication model (`comms.ts`)
- Two drones can talk only if `distance <= commRange` AND `tick > stormUntil` AND both are alive.
- Each message is independently dropped with probability `packetLoss`.
- Every 5 ticks, each drone sends `hello` to every drone in range: its position, current intent, and its `knownSeq` version vector.
- When drone A receives B's `hello`, A compares version vectors and sends `records` containing every record A has that B is missing (records with `seq > B.knownSeq[droneId]`). Cap at 200 records per message, so lossy links still make progress.
- Messages are delivered next tick (1-tick latency).

### 7.6 Strategies
| Strategy | Behaviour |
|---|---|
| **ours** | Sections 7.3–7.5 exactly. No leader. |
| **centralized** | Mothership at a fixed position with big comm range (say 25). Drones send records only to the mothership. The mothership computes the global belief and assigns each drone a target. A drone that can't reach the mothership **keeps its old target, then idles** when it gets there. If the mothership is killed, every drone idles after reaching its last target. |
| **nocomm** | Each drone only uses its own records. No messages at all. |

### 7.7 Failure events (buttons in the UI)
- **Kill drone:** `alive=false`. It stops moving and sending; its records survive only if others already received them.
- **Kill mothership:** only affects the centralized strategy.
- **Storm:** `stormUntil = tick + 300`. All comms fail.
- **Packet loss slider:** changes `cfg.packetLoss` live.

### 7.8 Metrics (`metrics.ts`)
- **Time to find:** tick when the box was detected (or `maxTicks` if never).
- **Coverage %:** share of total prior probability mass that has been scanned at least once by anyone.
- **Redundant scans %:** scans of a cell that someone else already scanned, out of all scans.

---

## 8. Experiments (the winning chart), in `scripts/experiments.ts`

```
for strategy in [ours, centralized, nocomm]:
  for packetLoss in [0, 0.1, 0.2, ..., 0.9]:
    for seed in 1..50:
      run headless sim until found or maxTicks
      record time-to-find
  -> median and 25th/75th percentile per (strategy, packetLoss)
Extra scenario: "mothership killed at tick 200" for centralized vs ours.
Write public/results.json
```

Run with: `npx tsx scripts/experiments.ts`

`ResultsChart.tsx` loads `/results.json` and draws a line chart with packet loss on the x-axis, median time-to-find on the y-axis, and one line per strategy. **This chart is the most important slide.**

Expected story (check it's true once it runs, and tune the parameters if not):
- centralized is the fastest at 0% loss, but collapses when the mothership dies
- nocomm is slow and wastes scans
- **ours degrades gracefully and stays close to centralized**

---

## 9. Solana integration

### 9.1 The idea
- Every drone has its own **Solana keypair** (ed25519). Signing needs NO network, so drones sign every `ScanRecord` while offline underwater.
- When drones merge records, they **reject records whose signature is not valid for a registered drone**. A broken or spoofed drone can't poison the swarm's maps. (This is also a resilience point for Neptune.)
- When a drone "surfaces" (every N ticks, or a "Surface" button), it computes a **Merkle root** of its new signed records and commits it to **Solana devnet** = tamper-proof proof of search coverage.
- A **bounty escrow program**: the authority locks SOL, and a detection signed by a registered drone releases it automatically. That is "no find, no fee" without paperwork or trust.

### 9.2 Signing (`src/solana/keys.ts`)
```ts
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

export const droneKeys = new Map<number, Keypair>();   // droneId -> keypair, created at sim start

export function recordBytes(r: ScanRecord): Uint8Array {
  return new TextEncoder().encode(`${r.droneId}|${r.seq}|${r.cell}|${r.tick}|${r.found ? 1 : 0}`);
}
export function signRecord(r: ScanRecord, kp: Keypair): string {
  return bs58.encode(nacl.sign.detached(recordBytes(r), kp.secretKey));
}
export function verifyRecord(r: ScanRecord, pubkey: Uint8Array): boolean {
  return !!r.sig && nacl.sign.detached.verify(recordBytes(r), bs58.decode(r.sig), pubkey);
}
```
Note: signing thousands of records can be slow in experiments. Give the sim a `signing: boolean` flag. Turn it ON in the live demo and OFF in `experiments.ts`.

### 9.3 Merkle root (`src/solana/merkle.ts`)
```
leaf  = sha256(recordBytes(r) + sigBytes)
level = pairwise sha256(left + right); duplicate the last leaf if the count is odd
root  = final 32 bytes
```
Use `sha256` from `@noble/hashes/sha256`.

### 9.4 Anchor program (write in https://beta.solpg.io, deploy to devnet)

Accounts:
```rust
#[account]
pub struct Search {
    pub authority: Pubkey,        // who funded the bounty
    pub drones: Vec<Pubkey>,      // registered drone keys, max 8
    pub bounty: u64,              // lamports
    pub found: bool,
    pub finder: Pubkey,
    pub commits: u32,
    pub bump: u8,
}
// PDA seeds: [b"search", authority.key(), search_id.to_le_bytes()]

#[account]
pub struct CoverageCommit {
    pub search: Pubkey,
    pub drone: Pubkey,
    pub root: [u8; 32],
    pub num_records: u32,
    pub tick: u64,
}
// PDA seeds: [b"commit", search.key(), search.commits.to_le_bytes()]
```

Instructions:
| Instruction | Signer(s) | Does |
|---|---|---|
| `create_search(search_id, drones, bounty)` | authority | Creates the `Search` PDA and transfers `bounty` lamports into it |
| `submit_coverage(root, num_records, tick)` | **drone keypair** + operator (fee payer) | Requires the drone to be in `search.drones`. Creates a `CoverageCommit`, increments `commits` |
| `claim_bounty(cell, tick)` | **drone keypair** + operator | Requires drone registered and `!found`. Sets `found=true`, `finder=drone`, and moves `bounty` lamports from the `Search` PDA to the operator account (direct lamport debit/credit, since the PDA is program-owned) |

Drones don't need SOL: the **operator** wallet is the fee payer, and the drone keypair is just an extra signer. In the browser we hold all keys, so this is easy.

After deploying in Playground: copy the **program ID** and **IDL JSON** into `src/solana/`, and copy `lib.rs` into `program/lib.rs` for the repo.

### 9.5 Client (`src/solana/client.ts`)
- `const connection = new Connection("https://api.devnet.solana.com", "confirmed")`
- Operator keypair: generate once, save the secret in `localStorage` (demo only!), fund it from **https://faucet.solana.com** (devnet). **Fund it BEFORE the demo**, because the faucet rate-limits.
- Use `new anchor.Program(idl, provider)` and `program.methods.submitCoverage(...).accounts({...}).signers([droneKp]).rpc()`.
- Show every tx in the event log as `https://explorer.solana.com/tx/${sig}?cluster=devnet`.
- Throttle: at most 1 commit every few seconds (the demo shouldn't spam devnet). Queue the commits and send them in the background so the sim never blocks.

### 9.6 Fallback (do this FIRST, upgrade later)
If Anchor isn't working by midnight:
- Commit Merkle roots with the **Memo program** (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`): a transaction with one instruction whose data is `"deepsearch|drone=3|root=<hex>|n=120"`.
- The bounty becomes a plain `SystemProgram.transfer` from the authority wallet to the operator when the box is found.
- This still demos well; the Anchor escrow is the upgrade.

### 9.7 Honest limitation (say it before the judges ask)
"In the sim, the detection is trusted from a registered drone's signature. In reality the bounty would also need recovery confirmation, e.g. a multisig of the authority and an inspector." Judges respect this.

---

## 10. Roles (4 people)

### Person 1: Simulation core (`src/sim/world.ts`, `belief.ts`, `rng.ts`, `metrics.ts`)
- Grid, prior, hidden box, tick loop, sensing, Bayes belief, metrics.
- Expose: `createWorld(cfg): WorldState` and `step(world): void`.
- **Done when:** drones (even moving randomly) scan cells and a belief heatmap can be computed.

### Person 2: Drone intelligence and comms (`drone.ts`, `comms.ts`, `strategies/*`)
- The decision rule (7.4), comms model (7.5), all 3 strategies (7.6), failure events (7.7).
- Then: signature verification on merge (calls `solana/keys.ts`).
- **Done when:** `ours` clearly beats `nocomm` on redundant scans.

### Person 3: UI and experiments (`src/ui/*`, `scripts/experiments.ts`)
- Canvas: heatmap (blue = low, yellow = high probability), drones as dots, a faint comm-range circle, lines for active links, flash on message.
- Controls (section 3), event log, stats, results chart.
- Runs the experiments and builds the chart.
- **Done when:** the full demo script in section 3 can be clicked through.

### Person 4: Solana and pitch (`src/solana/*`, `program/`)
- Memo fallback first, then the Anchor program, signing, Merkle, client, Explorer links.
- Also owns: slides (max 6), the pitch script, the Devpost write-up, and the backup demo video.
- **Done when:** finding the box in the UI triggers a real devnet transaction visible on Explorer.

---

## 11. Timeline (hacking ends Sunday ~12:00)

| Time | Milestone |
|---|---|
| **Now + 30 min** | `types.ts` agreed, repo created, Vite app running, everyone has a role |
| **18:00 Sat** | Drones move and scan, heatmap visible. Solana: devnet wallet funded, Memo commit works |
| **21:00** | Decision rule plus comms (`ours`) working, and `nocomm` baseline |
| **00:00** | `centralized` baseline, kill/storm buttons. Signed records. Anchor program deployed |
| **03:00** | Experiments script produces `results.json`. `claim_bounty` works end to end |
| **06:00** | Results chart in the UI. Full demo flow works. **Feature freeze.** |
| **06:00–10:00** | Bug fixes, tune parameters so the story in section 8 shows, polish visuals, slides |
| **10:00** | Record the backup demo video. Submit on Devpost (tick Neptune North and Best Use of Solana) |
| **Before judging** | Rehearse the 3-minute pitch twice. Top up the devnet operator wallet |

**Rule:** if something is not working by its deadline, cut it, don't fight it. The order of importance is: sim > comms + strategies > chart > UI polish > Anchor (the Memo fallback is fine).

---

## 12. Pitch slides (max 6)

1. **Problem:** MH370, searched for years. Underwater comms barely work. "No find, no fee" contracts.
2. **Our swarm:** no leader, each drone decides for itself, shared maps merge like a CRDT.
3. **Live demo** (section 3 script).
4. **Results chart:** resilience under packet loss and when the hub fails.
5. **Solana:** signed offline, proof of coverage on-chain, automatic bounty.
6. **What's next:** real acoustic-modem constraints, 3D terrain, real hardware, other uses (wildfire, search-and-rescue).

---

## 13. Prompt template for AI coding assistants

Copy this, plus the whole brief above, into your AI tool:

```
You are helping build "Deep Search", a DurHack 2026 hackathon project. The full project
brief is above. Follow its tech stack, versions, folder structure and types EXACTLY.

My role is: <Person 1/2/3/4 — copy the role description from section 10>.
I am working only on these files: <list files>.
Other teammates own the other files; do not change src/sim/types.ts without telling me.

Task right now: <e.g. "implement belief.ts as described in section 7.3, with an
incremental Int32Array of miss counts per drone, and a unit test using tsx">.

Constraints:
- TypeScript, strict mode.
- src/sim must not import React or the DOM.
- Use the seeded RNG from src/sim/rng.ts, never Math.random() in the sim.
- Keep it simple and working; this is a 24-hour hackathon.
Give me complete files, not fragments.
```

---

## 14. Before you start

- [ ] Someone visits the **Neptune North stand** and asks: "Is a simulation OK, or do you want real devices?" Tell the team the answer.
- [ ] Read https://mlh.link/solana for any Solana prize requirements.
- [ ] Check Devpost to confirm you can select both Neptune North and Best Use of Solana.
- [ ] Fund the devnet operator wallet early at https://faucet.solana.com.
