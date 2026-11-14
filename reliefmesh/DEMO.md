# ReliefMesh — demo & submission card

Everything you need on the day, on one page. Prizes: **Neptune North (£1000)** + **MLH Best Use of Solana**.

---

## A. Deploy (once, ~5 min)

The build is ready in `dist/`. Pick one:

- **Easiest:** `npm run build`, then drag the `reliefmesh/dist` folder onto <https://app.netlify.com/drop>. Copy the HTTPS link.
- **CLI:** `npx vercel` (a `vercel.json` is included).

You need HTTPS so phones can install the app and use the camera for QR.

## B. Set up 3 phones (night before, while online)

1. Open the link on each phone → **Setup** → create wallet, names: **Sarah**, **Tom**, **Gateway**.
2. Fund **Sarah** and **Gateway** at <https://faucet.solana.com> (paste each address; the app copies it for you). 0.5 SOL each is plenty.
3. On **Sarah**: add **3 offline payment slots**; set the default recipient to a "Family" wallet address (make a 4th wallet, or reuse Tom's).
4. On every phone: browser menu → **Add to Home Screen**. Open it once online so it caches, then it works in airplane mode.
5. Charge phones; screen brightness **max**; auto-lock **off**.

## C. The demo (90 seconds, all phones in airplane mode)

| Step | Do | Say |
|---|---|---|
| 1 | Show Sarah's black "No signal" bar | "Sarah is trapped. The towers are down." |
| 2 | Sarah → **New** → SOS "2 people trapped, Block C, need water", tick life-threatening → **Sign SOS** | "She signs it with no connection." |
| 3 | Sarah → **Hand over** (QR). Tom → **Receive**, scan it | "A volunteer walks past and carries it." |
| 4 | Tom → **Hand over**. Gateway → **Receive** | "He reaches a Starlink point." |
| 5 | Turn Gateway's **internet on** → **Upload** | "First connection uploads everything to Solana." |
| 6 | Open the **Explorer** link; open **HQ** | "Signed by Sarah's phone, verified, with her GPS." |
| 7 | (if time) show the payment + "a second copy can't double-pay" | "Durable nonces: signed offline, pays exactly once." |

## D. If it breaks (don't debug on stage)

1. QR won't scan → brightness up, move closer, hold steady 3 s.
2. Devnet slow → show the **Explorer link from your rehearsal** (keep a tab open).
3. Anything else → play the **backup video** (record it Sunday morning: run the flow once and screen/phone-record it).

## E. Pitch (if you get a full 2–3 min, one speaker opens + closes)

> "February 2023, Turkey. A 7.8 quake. Cell towers fell. People under rubble couldn't call for help; families couldn't send money. The phones still worked — the network didn't.
> ReliefMesh turns phones into the network. You sign an SOS or a payment with no signal; phones pass it hand to hand by QR; the first phone to reach any connection settles everything on Solana. No server, no towers.
> [demo]
> Does it scale? [open the sim] 150 phones. Same delivery as flooding everything, 11× fewer copies, 500× fewer lost messages — and it beats flooding when gateways are rarely up.
> Next: Bluetooth instead of QR, stablecoin aid, NGO gateways. Each phone decides for itself, and together they get help out."

## F. Submit on Devpost (early — don't wait for the buzzer)

Use `DEVPOST.md`. Tick **Neptune North** and **Best Use of Solana**. Add all teammates, the repo link, the deployed link, and the demo video.

---

### What's already verified (so you can trust it)
- Solana devnet, end to end: offline-signed payment + SOS submitted, duplicate copy refused, HQ reads the SOS back. (`npm run solana:smoke`)
- The QR handoff: frame protocol + a real rendered QR decoded byte-identical by a camera-grade decoder. (`npm test`)
- 150-phone simulation with the results chart. (`/#/sim`, `npm run experiments`)

### Only you can do (needs real phones)
- Set up the 3 phones (section B), test the live QR scan between two of them, record the backup video, rehearse the pitch.
