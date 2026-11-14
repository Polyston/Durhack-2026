# ReliefMesh: how we win

The build is done and tested. From here, **stop adding features.** Wins come from three things: a demo that can't break, a tight pitch, and a complete submission.

---

## 1. What the judges score (and our answer)

| Judge | What they score | Our proof |
|---|---|---|
| **Neptune North** | Common goal | Every phone works to get SOS and payments to the internet |
| | Independent decisions | Each phone alone decides what to carry, what goes first, who to hand to, what to drop. No server |
| | Resilience when comms fail | Works in airplane mode. Aftershock and "cut all gateways" buttons, and delivery keeps going |
| | Something you care about | 2023 Turkey earthquake: towers fell when people needed them most |
| **MLH Solana** | Meaningful use | Durable nonces = sign offline, settle hours later. One-time nonce = copies can never double-pay. Signed SOS on-chain |
| **MLH general** | Originality, technical complexity, theme, practical implementation (equal weight) | Real research algorithms (PRoPHET, spray-and-wait, CRDT receipts); 20-run experiment; real phones; real devnet |

---

## 2. The pitch (2 minutes 30 seconds)

Decide who says what. Suggested split: **A** opens and closes, **B** drives the phones, **C** drives the simulation.

**A: Problem (20 s)**
> "February 2023. A 7.8 earthquake in Turkey. Cell towers went down. People trapped under rubble couldn't call for help, and families outside couldn't send money in. The phones still worked. The network didn't."

**A: What we built (15 s)**
> "ReliefMesh turns phones into the network. Messages and payments are signed on the phone, carried hand to hand, and the first phone that finds any signal delivers everything, straight onto Solana. No server. No towers."

**B: Live demo (60 s)**, all three phones in airplane mode
1. "Sarah is trapped. No signal." Show the black *No signal* bar. Type the SOS, tick *life at risk*, tap **Sign SOS**.
2. "Tom is a volunteer walking past." Tom → **Receive**, scan Sarah's hazard-tape code. "Tom's phone now carries Sarah's SOS."
3. "Tom reaches a Starlink point." Gateway phone receives from Tom, **turn its WiFi on**, tap **Upload**.
4. Open the **Explorer** link. Then open **HQ**: "Signed by Sarah's phone, verified, with her GPS location."
5. (If time) Show the payment: "Signed with no signal. Submitted later. And if two phones upload the same copy, it pays exactly once."

**C: Does it scale? (35 s)**, laptop on `/#/sim`
> "Three phones is a demo. A city is 150. Every dot runs the same code as the app."
- Click **Trigger aftershock**: "1 in 5 phones just died. Everyone froze." Delivery keeps climbing.
- Point at the chart: "Twenty simulated quakes. We deliver as much as copying everything to everyone, with **11 times fewer copies** and **500 times fewer lost messages**. When gateways are rarely up, we win outright: 95% vs 89%."

**A: Close (20 s)**
> "Each phone decides for itself, and together they get help out. Next: Bluetooth instead of QR codes, stablecoin aid payments, and NGOs running gateways. ReliefMesh: no server, no towers, just people's phones working together."

Rehearse it **out loud, with a timer, at least twice.**

---

## 3. Protect the happy path

**Night before / early morning (online):**
- [ ] 3 phones: open the deployed HTTPS URL, Setup, names **Sarah**, **Tom**, **Gateway**
- [ ] Fund **Sarah** and **Gateway** at faucet.solana.com (0.5 SOL each is plenty)
- [ ] Sarah: add **3 payment slots**; set default recipient = a "Family" wallet address
- [ ] **Add to Home Screen** on all three, then test once in airplane mode
- [ ] Test the full run end to end **twice**, then reset Tom's and Gateway's packets (Setup → Erase, re-create) or just use fresh SOS text
- [ ] Charge all phones; set screen brightness to max (QR scanning) and auto-lock to never
- [ ] Laptop: sim open on `/#/sim`, results chart visible, a second tab with Sarah's Explorer address

**Fallbacks, in order:**
1. QR won't scan → increase brightness, move closer, hold steady 3 s
2. Devnet slow → show the **Explorer link from the rehearsal** (keep it open in a tab)
3. Anything else breaks → play the **backup video** (below). Don't debug in front of judges

---

## 4. Backup video (record Sunday morning, 2 minutes max)

Record the exact pitch flow: phones in airplane mode → hand over → upload → Explorer → sim aftershock → chart. Screen-record the laptop; film the phones with another phone. Upload unlisted to YouTube. It's also the **Devpost demo video**, which is usually required.

---

## 5. Submission checklist (missing one can disqualify you)

- [ ] Devpost project created; **every teammate added**
- [ ] Tracks selected: **Neptune North** and **MLH Best Use of Solana**
- [ ] Demo video link (section 4)
- [ ] Public GitHub repo with `reliefmesh/` and its README (already written: setup, how it works, results, limitations)
- [ ] Deployed link (Netlify Drop: drag `reliefmesh/dist` onto https://app.netlify.com/drop)
- [ ] Screenshots: hazard-tape share screen, HQ board, sim map, results chart
- [ ] Mention AI-assisted development honestly (allowed and normal)

### Devpost text (copy and edit)

**Tagline:** Phones become the network when the towers fall: signed SOS and Solana payments, carried hand to hand.

**Inspiration:** In the 2023 Turkey–Syria earthquake, cell networks collapsed exactly when people needed to call for help or send money. Phones still worked; the infrastructure didn't.

**What it does:** ReliefMesh lets anyone sign an SOS or a payment with no signal. Phones pass packets to each other by QR code. Every phone decides on its own what to carry and who to give it to. The first phone that reaches any connection uploads everything to Solana: payments settle and SOS messages appear, verified, on a relief HQ board.

**How we built it:** React + TypeScript PWA that works in airplane mode. A routing core shared by the app and a 150-phone city simulation: delivery receipts as a grow-only CRDT, PRoPHET-style "closeness to internet" learning, binary spray-and-wait copy budgets, and priority-based storage. Solana durable nonces let payments be signed offline and submitted hours later; because each nonce is single-use, any number of copies can travel without ever double-paying. SOS messages are ed25519-signed and posted as Memo transactions.

**Results:** 20 simulated earthquakes per strategy. ReliefMesh delivers 97.5% of messages (96.7% of urgent SOS), matching copy-everything flooding with 11× fewer copies and 500× fewer lost messages; with gateways up only 20% of the time it beats flooding 95% to 89%. Tested end to end on Solana devnet, including the duplicate-copy case.

**Challenges:** Devnet's RPC faucet was closed; we verified the offline-nonce flow first on a local Solana runtime (LiteSVM), then on devnet. Phone cameras need HTTPS. Balancing copies vs battery.

**What's next:** Bluetooth LE / WiFi Direct transport in a native app, USDC aid payments, NGO-run gateways.

---

## 6. Questions judges will ask

| Question | Answer |
|---|---|
| "Why not just Bluetooth?" | The router is transport-agnostic; QR proves it works with zero pairing and is visible for the demo. A native app swaps in BLE with the same code. |
| "Can someone double-spend by copying?" | No. Every copy is the same signed transaction with a one-time durable nonce. The first copy advances the nonce; the rest are rejected. We tested this on devnet. |
| "What stops fake SOS messages?" | Each SOS is signed with the phone's key; the gateway verifies the signature before posting. |
| "What if a phone is full?" | It drops the least urgent packet that isn't its own, and never drops something more urgent for something less urgent. |
| "Why does 'wait for towers' get 0%?" | In our scenario trapped survivors can't walk to a gateway. That's the status quo we're replacing, so we say it plainly. |
| "Where are the keys stored?" | In the browser for the demo. Production would use the phone's secure enclave or a wallet app. |
| "Why Solana?" | Durable nonces (offline signing that doesn't expire), cheap fees, and seconds to settle when signal returns. |

---

## 7. Remaining time

| When | What |
|---|---|
| Now | Deploy to Netlify; test QR between two real phones |
| Next 2 h | Full rehearsal of the happy path twice; fix only what breaks it |
| Before sleep | Fund wallets, add payment slots, install PWAs |
| Sunday 08:00 | Record backup video; screenshots |
| Sunday 10:00 | Submit on Devpost (don't wait for the deadline) |
| Before judging | Rehearse pitch twice with a timer |
