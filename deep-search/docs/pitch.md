# Three-minute demonstration

**Before presenting:** load the app, verify the experiment chart, enable devnet, fund both displayed wallets and confirm a small coverage transaction. Use the headless backup replay only if the app cannot run; it is not proof of blockchain settlement.

**0:00–0:25 — Problem**

“Searching an ocean is a coordination problem. Each vehicle has incomplete information, and communication can disappear. Deep Search is a simulation of six underwater drones looking for an aircraft's black box.”

**0:25–0:55 — Actors**

Start the decentralized mission. “Each dot is an actor with its own probability map. A failed scan reduces its belief in that cell. The actor chooses its own next destination, accounting for the last intentions it heard from peers.” Select two drones to compare their maps.

**0:55–1:20 — Failure**

Set packet loss to 70%. Trigger a storm. “Messages stop; decisions continue. After reconnection, signed records are exchanged in bounded batches. Set union makes the merge idempotent: receiving a scan twice cannot count it twice.”

**1:20–1:45 — Hub contrast**

Reset and choose centralized. Start, let assignments arrive, then kill the mothership. Wait for existing targets to finish. “These drones depend on the hub for their next target.” Switch to decentralized. “Now each actor can choose locally.” This is an interactive resilience demonstration, not a fair benchmark; use reset and the same seed for benchmarks.

**1:45–2:10 — Measurements**

Show the chart and the success-rate table. Read the actual numbers from `docs/results-summary.md`. “We ran 50 paired seeds per condition. Runs that did not find the box are capped at 3,000 ticks. The data includes negative results; we do not claim that gossip always wins.”

**2:10–2:40 — Solana**

Surface the fleet. Click a confirmed Explorer link. “Drones sign scans while offline. Once connected, we commit a Merkle root to Solana devnet. Our current fallback pays a small bounty by wallet transfer. We have escrow source prepared, but this demo does not claim deployed escrow.” If funding or RPC fails, say that explicitly and show the offline signatures, without claiming a transaction landed.

**2:40–3:00 — Limits and next step**

“A registered signature authenticates a report; it does not prove physical recovery. A real deployment needs inspector confirmation, bandwidth budgets, terrain and hardware tests. What works here is independent decision-making, mergeable knowledge and continued search during a communications outage.”
