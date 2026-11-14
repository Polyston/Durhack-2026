# ReliefMesh — Devpost submission (ready to paste)

**Tracks to tick:** Neptune North · MLH Best Use of Solana
**Fill in before submitting:** team members · GitHub repo URL · deployed (HTTPS) link · demo video link

---

**Tagline**
When the towers fall, phones become the network: signed SOS + Solana payments carried hand to hand.

**Inspiration**
In the February 2023 Turkey–Syria earthquake, cell towers went down exactly when people needed them. People trapped couldn't call for help; families couldn't send money in. The phones still worked — the network between them didn't.

**What it does**
You sign an SOS or a payment on your phone with no signal. Phones pass these packets to each other by QR code, with no server and no coordinator. Each phone decides on its own what to carry, what to send first, who to hand it to, and what to drop when full. The first phone to reach any connection uploads everything to Solana: payments settle, and SOS messages appear — verified — on a relief HQ board. A delivery receipt then travels back through the mesh so phones stop carrying what's already arrived.

**How we built it**
A React + TypeScript PWA that works in airplane mode, plus a 150-phone city simulation that runs the exact same routing code. The routing brain uses delivery receipts as a grow-only CRDT, a learned "closeness to the internet" score (PRoPHET-style) to route toward connectivity with no map, and binary spray-and-wait copy budgets with priority-based dropping (urgent SOS first, never your own). For Solana we use durable nonces so a payment signed fully offline never expires, and because each nonce is single-use, copies can spread through the mesh but only the first to land ever pays. SOS messages are ed25519-signed and posted as Memo transactions the HQ board can verify.

**Challenges we ran into**
Devnet's RPC faucet was closed, so we verified the offline-nonce flow first on a local Solana runtime (LiteSVM), then end-to-end on devnet. Phone cameras need HTTPS, so the app is a deployed PWA. Balancing copies against battery drove the whole routing design.

**Accomplishments we're proud of**
Measured results, not claims: across 20 simulated quakes, ReliefMesh delivers 97.5% of messages (96.7% of urgent SOS) — matching flooding-everything with 11× fewer copies and 500× fewer lost messages, and beating flooding when gateways are rarely up. Verified on Solana devnet including the no-double-spend case.

**What we learned**
Leaderless, local-only decisions can match a central coordinator on delivery while using a fraction of the resources — and Solana's durable nonces are a genuinely good fit for intermittently-connected payments.

**What's next**
Bluetooth LE / WiFi Direct transport in a native app (same routing brain), USDC stablecoin aid payments, and NGO-run gateways.

**Built with**
TypeScript, React, Vite, PWA/Workbox, @solana/web3.js (durable nonces + Memo), tweetnacl, a stdlib simulation + Recharts, and AI coding assistance.

**Honest limitations (say them)**
Keys live in the browser for the demo (production: secure enclave / wallet app). QR is the demo transport (production: BLE / WiFi Direct). The "wait for towers" baseline hits 0% because trapped survivors can't reach a gateway themselves — that's the status quo we replace.
