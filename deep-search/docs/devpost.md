# Deep Search

**Tagline:** Autonomous underwater search with offline-signed evidence and Solana coverage commitments.

## Inspiration

A search fleet should not stop thinking when communication disappears. We built a simulation in which every underwater drone can keep making search decisions from the evidence it already has.

## What it does

Six drones search a probability map for a hidden aircraft black box. Each actor updates its own Bayesian belief after a scan, chooses its next target and exchanges records with nearby peers. Operators can drop packets, reduce communication range, kill a drone or trigger a storm. A centralized mothership and a no-communication strategy provide comparison baselines.

Live scan records carry Ed25519 signatures. When a drone surfaces, the application can commit a Merkle root using a real Solana devnet Memo transaction. The current bounty fallback is a wallet transfer; Anchor escrow source is included as an undeployed upgrade.

## How we built it

The pure TypeScript simulation runs both in Node and behind a React interface. Canvas displays each drone's belief; Zustand manages controls and Recharts displays measured experiments. Seeded placement, sensing and communication streams support reproducible comparisons. Record exchange uses a grow-only set and contiguous sequence vectors to repair missing messages without double-counting scans.

## Challenges

Dropped messages can leave sequence holes, so recording only the largest sequence number would lose evidence. Our vectors advance only over contiguous records. We also separated pending, failed and confirmed settlement states so an unavailable network cannot look like a successful commitment.

## Results

See `results-summary.md` and the full raw dataset. Report the measured outcomes, including where no-comms performs better. The simulation tests verify merge behavior, deterministic replay, failures and signature rejection. Do not describe unverified browser, devnet or Anchor deployment steps as completed.

## What is next

Test real acoustic bandwidth limits, energy costs and terrain. Add authority/inspector recovery confirmation before a real bounty payout. Audit the contract and replace browser-local demo keys with production wallet custody.

## Submission fields to complete

Repository URL, running demo URL, team members and a demo video link must be supplied at submission. A local backup replay video is included; it is explicitly an unsigned headless replay without blockchain settlement. Select Neptune North and Best Use of Solana only after verifying the event's current submission form permits both.
