# Durhack-2026 — Deep Search

A reproducible underwater search simulation for DurHack 2026. Six actors maintain their own Bayesian maps, exchange signed scan records over unreliable acoustic links, and keep searching during a communications outage.

## Run

Node 22 is recommended. This workspace already contains the runtime dependencies.

```bash
cd deep-search
npm install
npm run dev
```

Open the URL printed by Vite. For a production build, run `npm run build`, then `npm run preview`. The application starts paused. All live scans are signed; no wallet or network is needed to search.

```bash
npm test
npm run experiments
```

The experiment command runs 1,700 missions: 3 strategies × 10 packet-loss levels × 50 seeds, plus 2 strategies × 2 loss levels × 50 seeds with the hub killed at tick 200. It writes `public/results.json`, including every raw run, quartiles, success rates and redundancy. Run from this directory. `SEEDS=3 npm run experiments` is a smoke run and replaces the full results; rerun with 50 seeds before presenting.

## Demo controls

- **Start search / Pause / Step:** 10 simulation ticks per second at normal speed. Signing and rendering can reduce wall-clock speed on slow computers.
- **Packet loss / Acoustic range:** change the communication model while the simulation runs.
- **Inspect drone:** switch the heatmap to that actor's actual knowledge. There is no omniscient map driving decisions.
- **Kill drone:** stops the selected actor. Other drones keep only the records they already received.
- **Kill mothership:** disables the hub. Centralized drones finish their last target and idle. Switch to decentralized to resume independent search.
- **Storm:** disables communication for 300 ticks. Maps converge incrementally after reconnection, with one-tick latency, packet loss and a 200-record cap. They do not merge instantly.
- **Reset mission:** reproduces placement and sensor randomness for the same seed. Creates new drone identities and disables live settlement. Switching strategy without reset retains prior knowledge, so use reset for fair comparisons.
- **Surface fleet:** submits signed records from surviving drones, once devnet is enabled and funded.

## Solana demo

The working browser integration uses the brief's **Memo fallback**, not deployed Anchor escrow. Enable devnet to display two browser-local wallets. Fund the operator for transaction fees and the authority for the 0.001 devnet SOL bounty at https://faucet.solana.com. Refresh balances, start a mission and surface. Finding the box automatically queues the signed coverage commit and bounty transfer.

Each coverage Memo includes a mission identifier, drone ID, Merkle root and number of records. The transaction is signed by the drone and fee-paying operator. Merkle leaves contain canonical record bytes plus the Ed25519 signature, sorted by drone and sequence; an odd leaf is duplicated. Empty and unsigned batches are rejected.

Export signed evidence to save public keys, signed records and the exact batches/roots of confirmed coverage transactions. Export before resetting or closing the page; scan evidence and receipts are held in memory.

Confirmed transactions appear as Explorer links. Failed jobs remain visibly failed and can be retried by surfacing again. The simulation does not wait for the network. Never present a failed or pending transaction as a confirmed proof.

Demo keypairs live in localStorage. Use only devnet funds. A reset creates a new mission; a new mission can pay a new bounty. Browser private keys and this fallback are not suitable for production custody. Signed evidence authenticates the reporting drone, not the physical truth of a detection.

`program/lib.rs` and `program/anchor-client.ts` contain the optional escrow upgrade. See [program/README.md](program/README.md). Anchor is an optional dependency because its package could not be downloaded in this environment. The shipped UI does not claim to run that upgrade.

## Model and architecture

`src/sim/` is pure TypeScript with no React, DOM or Solana imports. `createWorld(config, security?)` and `step(world)` are the entry points. Signing and verification are injected hooks. The shared types extend the brief with incremental belief caches, record indexes, message envelopes and metrics.

The prior is a normalized mixture of three Gaussians. Only `world.ts` uses the hidden box to perform sensing. A missed scan multiplies that cell's probability by `1 − pDetect`. Decisions use unnormalized weights because the normalization constant cancels in the argmax. UI beliefs are normalized.

Record merging is an idempotent G-Set CRDT. Version vectors advance only across contiguous records. Missing records are sent oldest-sequence-first, capped at 200 per message. Duplicate records do not change beliefs. Signatures are verified before accepting new records in live mode. Previously known IDs are immutable; trusted sensors are assumed not to equivocate.

The simulator uses separate seeded streams for placement, sensing and message loss. This keeps hidden locations identical across paired strategies. Every unsuccessful run counts as 3,000 ticks in the chart; success rates are shown alongside medians. A censored median of 3,000 does not mean that a box was found at that time.

The mothership has range 25. Its coverage is not unlimited. Drones upload only to the hub and receive assignments with the same packet-loss and latency rules. Disconnected drones keep their old target and then idle.

Coverage is the prior probability mass scanned at least once. Redundancy counts a scan when any *other* drone has already scanned the cell; repeat scans by the same drone alone do not count as cross-drone redundancy.

## Delivery and validation

- Strict TypeScript and Vite production build checked locally.
- Automated checks cover deterministic behavior, Bayesian merging, sequence holes, latency, loss, storms, hub failure, killed drones, signature tampering, Merkle order and tick limits.
- Full experiment data is in `public/results.json`; the conclusions belong to the results, not to a preselected winning narrative.
- [Demo script](docs/pitch.md), [six-slide content deck](docs/slides.md), [Devpost draft](docs/devpost.md), and [handoff checklist](docs/handoff.md).
- `docs/backup-replay.mp4` is a recorded headless simulation, explicitly labeled unsigned and without devnet settlement. Regenerate it with `node --import tsx scripts/replay.ts` followed by `python3 scripts/render-replay.py` (matplotlib and ffmpeg required).

This environment blocks listening sockets and package/RPC network access. Browser layout and interaction QA, real devnet settlement, and Anchor compilation/deployment were not verified. The presentation runtime was unavailable, so the six-slide deck is delivered as editable Markdown content. Project repository: https://github.com/Polyston/Durhack-2026 (branch `main`).
