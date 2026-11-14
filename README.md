# DurHack 2026 — projects

Four finished, working projects, plus their briefs, win plan and DEV.to write-ups.

| Project | One line | Target prizes | Stack | Status |
|---|---|---|---|---|
| **[ReliefMesh](reliefmesh/)** | Phones pass signed SOS + Solana payments hand-to-hand when the towers fall | Neptune North · MLH Solana | TypeScript / React PWA | Built, tested, Solana devnet verified |
| **[Deep Search](deep-search/)** | Underwater drone swarm keeps searching for a black box when comms drop | Neptune North · MLH Solana | TypeScript / React | Built, tested; devnet not verified in build env |
| **[Sentinel](sentinel/)** | A safety camera you program in plain English (sense → analyse → decide → act) | RS · MLH Gemini | Python / Gemini Vision / Raspberry Pi | Built, tested; needs API key + hardware to run live |
| **[Swarm Orchestra](swarm-orchestra/)** | Devices play music together with no conductor, keep playing when the network is cut, and talk through the notes | Composition theme · Neptune North · QRT | TypeScript / React / Web Audio | Built, 16 tests pass |

> **Pick for Neptune North:** ReliefMesh and Deep Search both target Neptune North + Solana. If the team submits one project per track, choose one. ReliefMesh has a stronger live demo (real phones, airplane mode) and was verified on Solana devnet; Deep Search has the deeper distributed-systems theory and a 1,700-mission experiment. Sentinel is independent (RS + Gemini), so it can run alongside either.

---

## Quick start

```bash
# ReliefMesh (web PWA + city simulation)
cd reliefmesh && npm install && npm run dev        # https://<ip>:5173  ·  sim at /#/sim

# Deep Search (underwater search simulation)
cd deep-search && npm install && npm run dev

# Sentinel (no camera / key / Pi needed to try it)
cd sentinel && python scripts/make_demo_images.py
PYTHONPATH=src python -m sentinel.app --source demo --vision mock --actuator mock --web

# Swarm Orchestra (needs a speaker; click "Start the swarm")
cd swarm-orchestra && npm install && npm run dev
```

Each project has its own README with full setup, tests, demo steps and honest limitations.

---

## Documents

| File | What it is |
|---|---|
| [RELIEFMESH_BRIEF.md](RELIEFMESH_BRIEF.md) | Full spec: idea, prizes, demo, routing algorithm, Solana, roles, timeline |
| [DEEP_SEARCH_BRIEF.md](DEEP_SEARCH_BRIEF.md) | Full spec for the underwater search swarm |
| [SENTINEL_BRIEF.md](SENTINEL_BRIEF.md) | Full spec for the plain-English safety camera |
| [Swarm Orchestra README](swarm-orchestra/README.md) | Overview, demo steps and how the leaderless music works |
| [WIN_PLAN.md](WIN_PLAN.md) | How to win: judging, pitch script, demo protection, submission checklist (ReliefMesh) |
| [dev-posts/](dev-posts/) | Ready-to-publish DEV.to blog posts for the DEV Writing Challenge ($100), one per project |

## Challenge materials

- [Neptune North challenge](Neptune%20North%20challenge%202.pdf)
- [Opening ceremony deck](Opening%20Ceremony.pdf)

---

## The prizes we target

- **Neptune North** — "Actors work better together": many actors, a shared goal, independent decisions, resilience when communication fails. (ReliefMesh, Deep Search)
- **MLH Best Use of Solana** — offline-signed transactions settled when a connection returns. (ReliefMesh, Deep Search)
- **RS** — "Build an intelligent system that can sense, analyse and respond to the real world." (Sentinel)
- **MLH Best Use of Gemini** — Gemini Vision as the reasoning core. (Sentinel)
- **DEV Writing Challenge** — a published post per project in [dev-posts/](dev-posts/). (all three)
