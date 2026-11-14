# ReliefMesh — project brief

> **Status:** built, tested, verified on Solana devnet &nbsp;·&nbsp; **Code:** [`reliefmesh/`](reliefmesh/) &nbsp;·&nbsp; **Prizes:** Neptune North, MLH Best Use of Solana
>
> The project is already built — this is the spec to understand, demo and extend it. Sections 1–5 are the overview; 6 onward is the build detail. Roles are in section 12.

---

## 1. One-sentence pitch

**After an earthquake, the internet and cell towers are down. ReliefMesh lets phones carry signed Solana payments and SOS messages hand to hand, with no central server, until any one phone reaches the internet and settles them on-chain.**

## 2. Target prizes (only these two)

| Prize | Prize value | What judges want |
|---|---|---|
| **Neptune North: "Actors work better together"** (MAIN TARGET) | £1,000 (1st), mechanical keyboards (2nd and 3rd) | Multiple actors, common goal, independent decisions, resilience when comms fail |
| **MLH: Best Use of Solana** (secondary) | Hardware wallets | Meaningful use of Solana |

We are NOT entering other tracks.

### Neptune North judging criteria and how we hit each one

| Criterion | Our answer |
|---|---|
| Working towards a common goal | Every phone works together to get as many urgent messages and payments as possible to the internet, as fast as possible |
| Independent decision-making | No server, no coordinator. Each phone decides alone what to carry, what to forward first, who to hand it to, and what to delete |
| Resilience when communications fail | The whole system is built for zero infrastructure. It only needs occasional phone-to-phone contact and one phone eventually reaching the internet |
| Something you're excited about | The 2023 Turkey–Syria earthquake: infrastructure collapsed exactly when people needed to call for help and send money |

### Why Solana fits for real (not bolted on)
- Normal blockchain transactions expire after about a minute because they include a recent blockhash. **Solana's durable nonces** let a transaction be **signed fully offline and submitted hours later**. That is exactly what a disconnected disaster zone needs.
- Each nonce can only be used once, so **duplicate copies spreading through the mesh can never double-pay**. Only the first copy to reach the network lands; the rest are rejected. The mesh can copy freely without risk.
- Fees are tiny and confirmation takes seconds, so aid money arrives as soon as any phone gets a connection.

---

## 3. Key concepts (read this if you're new to them)

| Term | Meaning in our project |
|---|---|
| **Node** | A phone running ReliefMesh |
| **Packet** | One item travelling through the mesh: a signed payment or an SOS message |
| **Encounter** | Two phones meet and swap packets (in the real demo: by QR code) |
| **Gateway** | A phone that currently has internet. It submits packets to Solana |
| **ACK** | "Delivered" receipt, spread back through the mesh so phones can delete copies |
| **DTN** | Delay-Tolerant Networking: the research field for networks with no end-to-end path (used by NASA for deep space). We use its algorithms |
| **Durable nonce** | A Solana account holding a value that replaces the blockhash, so a signed transaction doesn't expire |

---

## 4. The two halves of the project

1. **Real phones app (PWA):** works in airplane mode. Sign a payment or SOS offline, pass packets between phones by QR code, and submit to Solana devnet when online. **This is the "wow" live demo.**
2. **City simulation:** 100+ simulated phones moving around a destroyed city, using the SAME routing code as the real app. Compares routing strategies and produces the results chart. **This is the proof for Neptune judges.**

Both use the same core logic in `src/core/` (section 6).

---

## 5. What the demo looks like

### Live phone demo
- 3 phones on a table, all in **airplane mode**. Name them: **Sarah** (in the rubble zone), **Tom** (volunteer walking between areas), **Gateway** (at a Starlink point).
1. Sarah opens ReliefMesh offline and signs: **"Send 0.5 SOL to family" + SOS: "2 people trapped, Block C, need water"**.
2. Sarah's phone shows an **animated QR**. Tom scans it, and the packets are now on his phone. His screen shows "carrying 2 packets, priority: SOS URGENT".
3. Tom walks over to Gateway and Gateway scans Tom's QR.
4. **Turn Gateway's internet on.** It submits automatically. The **Solana Explorer** link shows the payment confirmed, the family wallet balance goes up, and the SOS appears on the "Relief HQ" board.
5. Gateway shows an ACK QR, Tom scans it and deletes his now-delivered copies.

### Simulation dashboard (on a laptop)
```
+----------------------------------------------------+------------------+
|  CITY MAP (top-down)                               |  CONTROLS        |
|  - grey blocks = buildings, red = collapsed zone   |  Strategy:[ours] |
|  - dots = phones (colour = number of packets)      |  Phones:  ===o   |
|  - green circles = gateways (come and go)          |  Gateways:==o=   |
|  - flash when two phones swap packets              |  [Aftershock]    |
|                                                    |  [Gateway down]  |
+----------------------------------------------------+------------------+
|  STATS: delivered %, avg delay, copies per packet, SOS delivered %    |
+-----------------------------------------------------------------------+
|  RESULTS CHART: delivery % vs time, per strategy                      |
+-----------------------------------------------------------------------+
```

### 3-minute pitch script
1. "February 2023, Turkey. 50,000 people died. Cell towers fell. People under rubble couldn't call for help, and families couldn't send money."
2. Live phone demo (above), in airplane mode. Judges hold the phones if possible.
3. "But does it scale?" Switch to the simulation: 150 phones, 2 gateways. Press **Gateway down** and **Aftershock**. Delivery keeps going.
4. **Winning slide:** results chart, our strategy vs naive flooding vs spray-and-wait vs "wait for towers".
5. Solana: durable nonces = offline signing, one-time use = no double-spend, instant settlement.
6. Close: "No server. No towers. Just people's phones working together."

---

## 6. Tech stack (exact libraries)

| Purpose | Library | Version |
|---|---|---|
| Build tool | `vite` | 5.4.x |
| Language | TypeScript | 5.6.x |
| UI | `react`, `react-dom` | 18.3.1 |
| State | `zustand` | 4.5.x |
| Offline app (installable, works in airplane mode) | `vite-plugin-pwa` | 0.20.x |
| HTTPS in local dev (camera needs HTTPS) | `@vitejs/plugin-basic-ssl` | 1.1.x |
| Make QR codes | `qrcode` (+ `@types/qrcode`) | 1.5.4 |
| Scan QR codes | `qr-scanner` | 1.4.2 |
| Offline storage on phone | `idb-keyval` | 6.2.1 |
| Solana | `@solana/web3.js` | **1.95.x** (NOT 2.x / @solana/kit) |
| Signing messages | `tweetnacl` | 1.0.3 |
| Base58 | `bs58` | 6.0.x |
| Simulation map | **HTML Canvas 2D** (no library) | built-in |
| Results chart | `recharts` | 2.13.x |
| Seeded random | `seedrandom` (+ `@types/seedrandom`) | 3.0.5 |
| Run experiments in Node | `tsx` | 4.19.x |
| Hosting (HTTPS, so phones can install the PWA) | Vercel or Netlify (free) | — |

### Setup
```bash
npm create vite@latest reliefmesh -- --template react-ts
cd reliefmesh
npm i zustand@4.5 qrcode@1.5.4 qr-scanner@1.4.2 idb-keyval@6.2.1 @solana/web3.js@1.95 tweetnacl@1.0.3 bs58@6 recharts@2.13 seedrandom@3.0.5 buffer
npm i -D vite-plugin-pwa@0.20 @vitejs/plugin-basic-ssl@1.1 @types/qrcode @types/seedrandom tsx
npm run dev -- --host      # open https://<laptop-ip>:5173 on phones, same WiFi
```

At the top of `main.tsx` (Solana libs need `Buffer`):
```ts
import { Buffer } from "buffer";
(window as any).Buffer = Buffer;
```

**Important phone facts:**
- The camera only works on **HTTPS**. Deploy to Vercel/Netlify, or use `@vitejs/plugin-basic-ssl` and accept the warning on each phone.
- Open the app **once while online** so the PWA caches itself, then "Add to Home Screen". After that it works in airplane mode.
- **Web Bluetooth can't do phone-to-phone** and WebRTC needs a signalling server, so **QR codes are our offline transport**. It's fully offline and visual, and judges can see the data move. In the pitch say: "In production this would be Bluetooth LE / WiFi Direct in a native app; the routing logic is the same."

---

## 7. Folder structure

```
reliefmesh/
  src/
    core/                 <- PURE TypeScript, NO React, NO DOM. Shared by phone app AND simulation
      types.ts            shared types (section 8)
      packet.ts           create, encode, decode packets
      router.ts           the routing decisions (section 9): what to send, keep, delete
      store.ts            a node's packet store (in-memory interface; phone wraps it with IndexedDB)
    solana/
      wallet.ts           keypair create/load, airdrop, balance
      nonce.ts            create durable nonce accounts (online, before disaster)
      offlineTx.ts        build + sign payment offline with durable nonce
      gateway.ts          submit packets to devnet, produce ACKs
    phone/                <- the PWA screens
      App.tsx
      SetupScreen.tsx     online: create wallet, airdrop, create 3 nonce accounts
      ComposeScreen.tsx   offline: new payment / new SOS
      ShareScreen.tsx     shows animated QR of my packets (+ ACKs)
      ScanScreen.tsx      scans another phone's QR
      InboxScreen.tsx     list of carried packets, delivered status
      GatewayScreen.tsx   when online: submit all, show Explorer links
      HQBoard.tsx         "Relief HQ" board: SOS messages that reached a gateway
    sim/
      world.ts            city map, collapsed zones, movement, gateways
      runner.ts           tick loop using core/router.ts for every node
      strategies.ts       epidemic, spray-and-wait, ours, wait-for-towers
      metrics.ts
    dashboard/
      SimDashboard.tsx    canvas + controls + stats + chart
  scripts/
    experiments.ts        headless runs -> public/results.json
  public/
    results.json
```

**Rule:** `src/core/` never imports React, the DOM, or IndexedDB. The phone app and the simulation must both run the exact same `router.ts`. Say this in the pitch: "the simulation runs the same code as the phones".

---

## 8. Core data types (`src/core/types.ts`)

Agree on these FIRST (first 30 minutes).

```ts
export type NodeId = string;          // base58 public key of the phone's wallet
export type PacketId = string;        // hex sha256 of the payload, so the same packet = the same id everywhere

export type Priority = 0 | 1 | 2 | 3; // 3 = SOS life-threatening, 2 = SOS needs, 1 = payment, 0 = status/chat

export interface Packet {
  id: PacketId;
  kind: "payment" | "sos";
  priority: Priority;
  createdAt: number;                  // unix ms (phone clock; fine for a demo)
  ttlMs: number;                      // discard after this, default 48h
  origin: NodeId;
  copiesLeft: number;                 // spray-and-wait copy budget (section 9)
  payload: string;                    // payment: base64 serialized signed Solana tx
                                      // sos: JSON {text, lat?, lng?, sig} signed with tweetnacl
}

export interface Ack {                // "this packet has been delivered, delete it"
  packetId: PacketId;
  txSig?: string;                     // Solana signature if it was a payment
  deliveredAt: number;
}

export interface NodeState {
  id: NodeId;
  packets: Map<PacketId, Packet>;
  acks: Map<PacketId, Ack>;           // ACKs we know about (grow-only set)
  capacity: number;                   // max packets stored, e.g. 50 (phones are limited)
  gatewayPredictability: number;      // 0..1, how likely I am to meet a gateway (PRoPHET, section 9)
  lastSeenGatewayAt: number | null;
  isGateway: boolean;                 // has internet right now
}

// What goes inside one QR frame
export interface Frame {
  v: 1;
  from: NodeId;
  gp: number;                         // sender's gatewayPredictability
  i: number; n: number;               // frame i of n (animated QR)
  item: { t: "p"; p: Packet } | { t: "a"; a: Ack };
}
```

---

## 9. The routing algorithm (the Neptune core), in `src/core/router.ts`

Every node runs this on its own, with only local information. **No node ever receives instructions from anyone.**

### 9.1 On an encounter (two phones meet)
```
1. Exchange ACKs first (cheap, small). Both sides add all ACKs (set union, a grow-only CRDT)
   and DELETE any packet that has an ACK. This frees up space and stops useless copying.

2. Update gateway predictability (PRoPHET rule, simplified):
   - if peer is a gateway:       gp = gp + (1 - gp) * 0.75
   - transitive (peer is close to gateways):
                                 gp = max(gp, peer.gp * 0.5)
   - ageing, applied every minute: gp = gp * 0.98

3. Decide what to send to the peer, in this order:
   sort my packets by score, highest first:
      score = (priority + 1) * 10
            + ageBonus              (older = more urgent: minutes waited / 10, max 10)
            - 5 * (copiesLeft <= 1 && peer.gp <= my.gp ? 1 : 0)
   send the top packets the peer doesn't already have (limit per encounter = frames we can
   show in ~10 seconds of QR, about 20).

4. Copy rule (spray-and-wait plus PRoPHET):
   - if copiesLeft > 1:  give half the copies to the peer, keep half  (binary spray)
   - if copiesLeft == 1: only hand it over if peer.gp > my.gp (peer is a better carrier).
                         The peer becomes the carrier; I keep my copy as backup
                         until I run out of space.
   - SOS priority 3 ignores limits: always copy (life-threatening beats bandwidth)
```

### 9.2 When storage is full
Drop in this order: expired TTL first, then lowest priority, then the oldest copy among packets with `copiesLeft == 1` that I'm not the origin of. **Never drop my own origin packets.**

### 9.3 When a node is a gateway
Submit everything (section 10.4). For each success, create an `Ack` and spread it on the next encounters.

### 9.4 Starting copy budget
`copiesLeft = 8` for payments, `16` for SOS priority 2, unlimited for priority 3.

### 9.5 Why this is smart (say it in the pitch)
- **Independent decisions:** every phone scores, filters and drops packets alone.
- **Cooperation without coordination:** ACKs spread as a CRDT, so the whole mesh cleans itself up.
- **Learning:** gateway predictability means phones learn who is "close to the internet" and route towards them, with no map and no server.
- **Life-first:** SOS packets get priority and unlimited copies.

---

## 10. Solana implementation

### 10.1 Setup (ONLINE, before the "disaster", in `SetupScreen`)
```ts
import { Connection, Keypair, SystemProgram, Transaction, NONCE_ACCOUNT_LENGTH,
         NonceAccount, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// 1. wallet: generate once, store secretKey in IndexedDB (DEMO ONLY, not secure)
const user = Keypair.generate();

// 2. fund on devnet: connection.requestAirdrop(user.publicKey, 1 * LAMPORTS_PER_SOL)
//    the faucet RATE-LIMITS, so also fund manually at https://faucet.solana.com before the demo

// 3. create 3 durable nonce accounts (each one = one future offline transaction)
async function createNonce() {
  const nonceKp = Keypair.generate();
  const rent = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: user.publicKey, newAccountPubkey: nonceKp.publicKey,
      lamports: rent, space: NONCE_ACCOUNT_LENGTH, programId: SystemProgram.programId,
    }),
    SystemProgram.nonceInitialize({ noncePubkey: nonceKp.publicKey, authorizedPubkey: user.publicKey }),
  );
  await sendAndConfirmTransaction(connection, tx, [user, nonceKp]);
  const info = await connection.getAccountInfo(nonceKp.publicKey);
  const nonce = NonceAccount.fromAccountData(info!.data).nonce;   // string
  return { noncePubkey: nonceKp.publicKey.toBase58(), nonce, used: false };  // save to IndexedDB
}
```

### 10.2 Offline payment (`offlineTx.ts`), works in airplane mode
```ts
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function buildOfflinePayment(user, n /* stored nonce */, recipient: string, lamports: number, note: string) {
  const tx = new Transaction();
  tx.add(SystemProgram.nonceAdvance({                    // MUST be the FIRST instruction
    noncePubkey: new PublicKey(n.noncePubkey), authorizedPubkey: user.publicKey }));
  tx.add(SystemProgram.transfer({
    fromPubkey: user.publicKey, toPubkey: new PublicKey(recipient), lamports }));
  tx.add(new TransactionInstruction({
    keys: [], programId: MEMO_PROGRAM_ID, data: Buffer.from(`reliefmesh|${note}`) }));
  tx.recentBlockhash = n.nonce;                          // durable nonce instead of blockhash
  tx.feePayer = user.publicKey;
  tx.sign(user);
  n.used = true;                                         // save: this nonce is now spent
  return tx.serialize().toString("base64");              // goes into Packet.payload
}
```
- Each nonce account = one offline payment. With 3 accounts you can send 3 payments offline. When back online, refresh them.
- `packet.id = sha256(payload)`, so every copy in the mesh has the same id.

### 10.3 SOS message
- `{text, lat, lng}` → sign the JSON with `nacl.sign.detached(bytes, user.secretKey)` → put `{text, lat, lng, sig}` in the payload.
- No nonce is needed: the **gateway** pays the fee and posts it as a Memo transaction: `reliefmesh-sos|<origin pubkey>|<sig>|<text>`. Anyone can verify the SOS really came from that phone's key.

### 10.4 Gateway (`gateway.ts`), when a phone has internet
```ts
for (const p of packets) {
  if (p.kind === "payment") {
    try {
      const sig = await connection.sendRawTransaction(Buffer.from(p.payload, "base64"));
      await connection.confirmTransaction(sig, "confirmed");
      ack(p.id, sig);
    } catch (e) {
      // "nonce already advanced" / "already processed" = another copy already landed.
      // Treat it as delivered: ACK it so the mesh stops copying it.
      ack(p.id);
    }
  } else {
    // SOS: verify the tweetnacl signature, then post a Memo tx paid by the gateway, then ACK
  }
}
```
- Show each signature as `https://explorer.solana.com/tx/${sig}?cluster=devnet`.
- **HQBoard** reads recent Memo txs, or (simpler) the gateway just shows the SOS list it submitted, with Explorer links.

### 10.5 Double-spend safety (say it before judges ask)
A copy of the same signed transaction can hit the network many times, but its nonce advances on the first success, so every later copy fails. **Copies are free; double payment is impossible.**

### 10.6 Honest limitations (put on a slide or say them)
- Keys in IndexedDB are for the demo only. Production would use the phone's secure enclave / a wallet app.
- You need to pre-create nonce accounts while online (like charging a power bank before a storm).
- QR is our demo transport; production would use BLE / WiFi Direct.

---

## 11. Simulation and experiments

### 11.1 World (`sim/world.ts`)
- City of 2 km × 2 km on a canvas. Draw grid streets plus a few **collapsed zones** (red) where people are stuck (slow or no movement).
- **150 nodes:**
  - 60% "survivors" in or near collapsed zones (move slowly, short trips)
  - 30% "volunteers" (random waypoint between zones, fast)
  - 10% "responders" (move between zones and gateway points, fast)
- **Gateways:** 2–3 points (e.g. a Starlink truck, a hospital). They **turn on and off** randomly (generator failures). Any node within 30 m of an active gateway is a gateway.
- **Encounter:** two nodes within 20 m for at least 2 ticks. Max packets per encounter = 20 (same as the QR limit).
- **Packets:** survivors generate SOS (20%) and payments (80%) at random times. 1 tick = 10 s, run for 12 simulated hours.
- Buttons: **Aftershock** (all nodes freeze for 30 min and 20% lose battery = die), **Gateway down**.

### 11.2 Strategies to compare (`sim/strategies.ts`)
| Strategy | Rule |
|---|---|
| **Wait for towers** | Only deliver if you're the origin and you physically reach a gateway yourself (= the status quo) |
| **Epidemic** | Copy everything to everyone (fast but floods storage, drops packets when full) |
| **Spray-and-wait** | Fixed copy budget, no priorities, no learning |
| **Ours** | Section 9: priorities, ACKs, gateway predictability, smart dropping |

### 11.3 Metrics
- **Delivery ratio** (overall and **SOS-only**)
- **Median delay** to delivery
- **Overhead:** copies made per delivered packet
- **Storage drops:** packets lost because phones were full

### 11.4 Experiments (`scripts/experiments.ts`)
```
for strategy in [towers, epidemic, sprayWait, ours]:
  for seed in 1..30:
    run 12 simulated hours headless
  -> delivery % over time (median + IQR), SOS delivery %, overhead
also: capacity in [10, 25, 50] and gateway uptime in [20%, 50%, 90%]
write public/results.json
```
Run with: `npx tsx scripts/experiments.ts`

**Story the chart should show** (check it's true and tune if not):
- "wait for towers" delivers very little
- epidemic is OK at first, then collapses when storage fills (and wastes battery)
- **ours delivers the most SOS fastest, with far fewer copies**

---

## 12. Roles (4 people)

### Person 1: Routing core (`src/core/*`)
- Types, packet encode/decode, the router (section 9), ACK handling, storage dropping.
- Write small tests with `tsx`, e.g. two nodes encounter → the correct packets move.
- **Done when:** the simulation and phone app can both call `router.encounter(a, b)`.

### Person 2: Phone app (`src/phone/*`, PWA)
- PWA setup (works in airplane mode), IndexedDB storage, the screens.
- **Animated QR:** split items into frames (one packet per frame, ~3 frames/sec loop) with `qrcode`. Scanner with `qr-scanner` collects frames until all `n` are seen.
- Keep each QR under ~600 characters (a signed payment tx is ~350 bytes → ~470 base64 chars, which fits).
- **Done when:** phone A → QR → phone B moves packets in airplane mode.

### Person 3: Solana (`src/solana/*`)
- Wallet, airdrop, nonce accounts (10.1), offline payment (10.2), SOS signing (10.3), gateway submit plus ACKs (10.4), Explorer links.
- Prepare 3 demo wallets (Sarah, Tom, Gateway) plus a "Family" recipient wallet, **all funded the night before judging**.
- **Done when:** a tx signed in airplane mode, carried by QR, lands on devnet from the gateway phone.

### Person 4: Simulation, experiments and pitch (`src/sim/*`, `src/dashboard/*`, `scripts/*`)
- City world, 4 strategies, metrics, dashboard canvas, results chart.
- Owns: slides (max 6), pitch script, Devpost text, backup demo video.
- **Done when:** the results chart tells the story in 11.4.

---

## 13. Timeline (hacking ends Sunday ~12:00)

| Time | Milestone |
|---|---|
| **Now + 30 min** | `types.ts` agreed, repo created, app opens on phones over HTTPS |
| **18:00 Sat** | Router basic encounter works. QR A→B works with dummy data. Wallet plus 1 nonce account created on devnet. Sim map draws moving dots |
| **21:00** | Offline-signed tx submits successfully from a laptop. ACKs work. Sim runs epidemic plus ours |
| **00:00** | **Full chain works once:** airplane-mode phone → QR → phone → QR → gateway → devnet. All 4 sim strategies |
| **03:00** | PWA installs and works fully offline. SOS flow plus HQ board. Experiments produce `results.json` |
| **06:00** | Dashboard plus chart. Full demo rehearsed once. **Feature freeze** |
| **06:00–10:00** | Bug fixes, tune the sim so the story shows, polish UI, slides |
| **10:00** | Record the backup video (the phone demo can fail live!). Submit on Devpost: tick Neptune North and Best Use of Solana |
| **Before judging** | Re-fund demo wallets, refresh nonce accounts, charge phones, rehearse twice |

**Cut order if behind:** sim polish > SOS HQ board > animated QR (fall back to one QR per packet) > PWA install (just keep the tab open). **Never cut:** offline-sign → carry → submit on devnet, and the results chart.

---

## 14. Pitch slides (max 6)

1. **Problem:** 2023 earthquake, towers down, people trapped, families unable to send money.
2. **How ReliefMesh works:** phones carry signed packets hand to hand; one phone online settles them all.
3. **Live demo** (phones in airplane mode).
4. **Results chart:** ours vs flooding vs spray-and-wait vs waiting for towers.
5. **Why Solana:** durable nonces (offline signing), one-time nonces (no double-spend), instant cheap settlement.
6. **Next:** BLE / WiFi Direct native app, stablecoin (USDC) aid payments, NGO integration.

---

## 15. Prompt template for AI coding assistants

Copy this, plus the whole brief above, into your AI tool:

```
You are helping build "ReliefMesh", a DurHack 2026 hackathon project. The full project
brief is above. Follow its tech stack, versions, folder structure and types EXACTLY.

My role is: <Person 1/2/3/4 — copy the role description from section 12>.
I am working only on these files: <list files>.
Other teammates own the other files; do not change src/core/types.ts without telling me.

Task right now: <e.g. "implement router.ts encounter() as in section 9.1, with tests
using tsx that show ACKs delete packets and SOS priority 3 always copies">.

Constraints:
- TypeScript, strict mode.
- src/core must not import React, the DOM, or IndexedDB.
- @solana/web3.js version 1.95 (not 2.x).
- Use the seeded RNG in the simulation, never Math.random().
- Keep it simple and working; this is a 24-hour hackathon.
Give me complete files, not fragments.
```

---

## 16. Before you start

- [ ] Someone visits the **Neptune North stand**: "Phones passing packets with no server, plus a 150-node simulation using the same code. Does that fit?" Tell the team the answer.
- [ ] Read https://mlh.link/solana for any Solana prize requirements.
- [ ] Check Devpost to confirm you can select both Neptune North and Best Use of Solana.
- [ ] Get devnet SOL early at https://faucet.solana.com (it rate-limits).
- [ ] Test the camera QR scan on **every team phone** (iPhone Safari and Android Chrome), because HTTPS is required.
