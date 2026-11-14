---
title: "ReliefMesh: when the towers fall, phones become the network"
published: false
description: "A disaster-response app where phones carry signed SOS messages and Solana payments hand to hand, with no server, until one phone finds a connection."
tags: hackathon, solana, typescript, webdev
cover_image:
canonical_url:
---

> Built at DurHack 2026, in one weekend, by a small team. This is the story of how it works and why we made the choices we did.

## The problem that started it

In the February 2023 Turkey–Syria earthquake, more than 50,000 people died. One detail stuck with us: the cell towers went down. People trapped under rubble couldn't call for help, and families outside couldn't send money in. The phones in everyone's pockets still worked perfectly. The *network between them* was gone.

So we asked a narrow question: **if there is no internet and no cell service, can phones still get a message — or money — out of a disaster zone?**

ReliefMesh is our answer. You sign an SOS or a payment on your phone with no signal. Phones pass these packets to each other by QR code. The first phone that reaches any connection uploads everything to Solana. No server coordinates it. No tower is required.

## What it actually does

Three roles in the demo, all in airplane mode:

1. **Sarah** is trapped. She writes an SOS ("2 people trapped, Block C, need water"), marks it life-threatening, and signs it. She can also sign a payment to her family. Both happen with zero connectivity.
2. **Tom** is a volunteer walking past. He points his camera at Sarah's screen, which shows an animated QR code. Her packets are now on his phone.
3. **Gateway** is a phone at a Starlink point. Tom hands the packets over the same way. The moment Gateway's internet is on, it uploads everything to Solana devnet. The payment settles; the SOS appears, verified, on a relief HQ board with Sarah's GPS location.

Then a delivery receipt travels *back* through the mesh, so phones stop carrying messages that already arrived.

## The two decisions I'm proud of

### 1. Every phone decides on its own

There is no coordinator, which is the whole point for a disaster. Each phone runs the same small routing brain and, from only what it has seen locally, decides what to carry, what to send first, who to hand it to, and what to drop when it's full. The interesting pieces:

- **Delivery receipts are a grow-only set (a CRDT).** When two phones meet they union their receipt sets, so the whole mesh eventually cleans itself up without anyone being in charge.
- **"Closeness to the internet"** is a learned score (a simplified PRoPHET metric): it rises when you meet a gateway, is inherited at half strength from phones that recently did, and decays over time. A packet's last copy is only handed to a *better-connected* carrier. No map, no server — the swarm routes toward connectivity on its own.
- **Life first.** Urgent SOS packets ignore the copy budget and always spread; when a phone is full it drops the least important packet, never its own, and never something more urgent for something less urgent.

The same routing code runs on the phones *and* in a 150-phone city simulation, so we could measure it.

### 2. Solana durable nonces are the perfect fit

A normal blockchain transaction expires in about a minute, because it pins a recent blockhash. That's useless when a payment might sit in someone's pocket for hours. **Solana's durable nonces** replace the blockhash with a one-time value stored on-chain, so a transaction signed completely offline never expires.

And because each nonce can only be used once, you get something lovely for free: a packet can be copied through the mesh as many times as it likes, but **only the first copy to reach the network ever lands.** Every later copy is rejected by the chain. Copies are safe; double-payment is impossible. We tested exactly this case on devnet, and the recipient's balance went up by the amount exactly once.

## What the numbers say

We ran 20 simulated earthquakes per routing strategy, 150 phones, 12 hours each:

| Strategy | Delivered | Urgent SOS | Copies per delivery | Lost (full phones) |
|---|---|---|---|---|
| **ReliefMesh** | **97.5%** | **96.7%** | **61** | **440** |
| Copy to everyone | 97.4% | 96.6% | 692 | 220,985 |
| Fixed copy limit | 61.6% | 60.7% | 11 | 84 |
| Wait for towers | 0% | 0% | — | — |

Same delivery as flooding everything, with about **11× fewer copies** (battery and bandwidth) and **500× fewer dropped messages**. When gateways are up only 20% of the time, ReliefMesh beats flooding outright, 95% to 89%.

## The honest part

- Keys live in the browser for the demo. A real build would use the phone's secure enclave or a wallet app.
- QR is our transport because it needs no pairing and is visible on stage. The routing brain is transport-agnostic; a native app would swap in Bluetooth LE or WiFi Direct with the same code.
- The devnet RPC faucet was closed during the hackathon, so we first verified the offline-nonce flow on a local Solana runtime (LiteSVM), then end-to-end on devnet.

## Try it

React + TypeScript PWA, a stdlib-free simulation dashboard, and a Solana devnet integration. It runs in airplane mode once installed.

*Repo and live link in the comments. Built with help from AI coding tools, which is a normal part of how this got built in a weekend.*
