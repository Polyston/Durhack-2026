# ReliefMesh

**After an earthquake, the internet and cell towers are down. ReliefMesh lets phones carry signed Solana payments and SOS messages hand to hand, with no central server, until any one phone reaches the internet and settles them on-chain.**

DurHack 2026 entry for **Neptune North ("Actors work better together")** and **MLH Best Use of Solana**.
Full project brief: `../RELIEFMESH_BRIEF.md`.

---

## Quick start

```bash
npm install
npm run dev          # https://localhost:5173  (HTTPS on, so phone cameras work)
```

- **Phone app:** open `https://<your-laptop-ip>:5173` on each phone (same WiFi) and accept the certificate warning.
- **City simulation:** `https://localhost:5173/#/sim` on the laptop.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (HTTPS). `HTTP=1 npm run dev` turns HTTPS off |
| `npm test` | Router unit tests (9 checks) |
| `npm run experiments` | Runs the 4 strategies × 20 seeds → `public/results.json` (about 4 min). `SEEDS=5` is faster |
| `npm run solana:smoke` | End-to-end devnet test: nonce → offline sign → gateway submit → duplicate copy refused |
| `npm run build` | Production build + PWA service worker in `dist/` |
| `npm run preview` | Serve the build (HTTPS). **Use this to test airplane mode**: the dev server doesn't cache offline |

### Getting devnet SOL
The devnet **RPC airdrop is closed**. Use **https://faucet.solana.com** (paste the wallet address; the Setup screen copies it for you).

For the smoke test: run `npm run solana:smoke` once and it prints a funder address (saved in `.devnet-funder.json`, which is gitignored). Fund that address on the faucet, then run it again.

---

## Live demo (3 phones)

Before judging, while **online** on each phone:
1. Open the app → **Setup** → enter a name (Sarah / Tom / Gateway) → *Create wallet*.
2. Fund **Sarah** and **Gateway** on faucet.solana.com (Gateway pays the fees for SOS memos).
3. On Sarah: *Create offline payment slot* (2–3 times). Set the default recipient (a "Family" wallet address).
4. **Install the PWA:** browser menu → *Add to Home Screen*. Do this from `npm run preview` or a Vercel/Netlify deploy so it works offline.

Demo:
1. All phones in **airplane mode**.
2. **Sarah** → *New* → SOS "2 people trapped, Block C" (urgent) and a payment to Family → *Share* shows an animated QR.
3. **Tom** → *Scan* → gets the packets → *Inbox* shows them. Sarah taps *They scanned it*.
4. Tom → *Share*. **Gateway** → *Scan*.
5. Turn the Gateway phone's **internet on** → *Gateway* → *Submit*. Explorer links appear. *HQ* shows the SOS; enter the Family address in HQ to see the balance.
6. Gateway → *Share* (now carries delivery receipts) → Tom scans → his copies are deleted.

Deploying (for HTTPS + offline install): `npm run build`, then drag `dist/` onto https://app.netlify.com/drop, or `npx vercel`.

---

## How it works

```
src/core/      routing brain: pure TS, shared by phones AND simulation
  types.ts     Packet, Ack, NodeState, Frame, Policy
  packet.ts    makePacket (id = sha256(payload)), QR frame encode/decode
  router.ts    encounter(), selectToSend(), storePacket(), ACK CRDT, PRoPHET, spray
  store.ts     NodeState <-> JSON
src/solana/
  wallet.ts    devnet connection, keypairs, balances, confirmation polling
  nonce.ts     durable nonce accounts (created online, before the disaster)
  offlineTx.ts sign payment OFFLINE: nonceAdvance + transfer + memo
  sos.ts       SOS signed with the wallet key (tweetnacl)
  gateway.ts   submit everything, detect already-landed copies, HQ board reader
src/phone/     PWA screens: Setup, New, Share (animated QR), Scan, Inbox, Gateway, HQ
src/sim/       city world (150 phones, 4 collapsed zones, 3 flaky gateways), strategies, metrics
src/dashboard/ simulation canvas + controls + results chart
scripts/       tests, experiments, devnet smoke test
```

### Each phone decides alone (Neptune North)
- **ACKs first:** delivery receipts spread as a grow-only set (a CRDT), and phones delete delivered packets.
- **Closeness to internet** (PRoPHET): it rises when you meet a gateway, is inherited at half strength from people who did, and decays over time. Phones learn who is a good carrier with no map and no server.
- **Copy budget** (binary spray-and-wait): payments 8 copies, SOS 16, **urgent SOS unlimited**. The last copy is only handed to a better carrier.
- **Priority scoring and smart dropping:** urgent SOS first; when storage is full, the least important packet goes, never your own.

### Why Solana
- **Durable nonces:** a payment signed fully offline doesn't expire, so it can be submitted hours later.
- **One-time nonce:** many copies can travel through the mesh, but only one can ever land. The gateway checks the (deterministic) signature first and reports "already landed". **No double spend.**
- **SOS** messages are signed with the phone's key. The gateway verifies the signature and posts them as Memo transactions, so HQ can trust who sent them.

### Results (20 seeds, 150 phones, 12 simulated hours)
From `npm run experiments`. The chart is on `/#/sim`.

| Strategy | Delivered | Urgent SOS | Median delay | Copies per delivered | Dropped (full phones) |
|---|---|---|---|---|---|
| **ReliefMesh (ours)** | **97.5%** | **96.7%** | 14 min | **61** | **440** |
| Epidemic flooding | 97.4% | 96.6% | 14 min | 692 | 220,985 |
| Spray-and-wait | 61.6% | 60.7% | 18 min | 11 | 84 |
| Wait for towers | 0% | 0% | – | 0 | 0 |

**Pitch line:** same delivery as flooding everything, with **11× fewer copies** (battery) and **500× fewer dropped packets**. When gateways are only up 20% of the time, ours delivers **95% vs 89%** for flooding.

### Honest limitations
- Keys live in IndexedDB (demo only). Production: secure enclave or a wallet app.
- Nonce slots must be created online in advance (like charging a power bank before a storm).
- QR is the demo transport. Production: BLE / WiFi Direct in a native app, with the same router.
- In the simulation, trapped survivors never walk to a gateway themselves, so "wait for towers" delivers almost nothing. That's the point, but say it out loud.
