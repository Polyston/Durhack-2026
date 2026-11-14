---
title: "Deep Search: a drone swarm that keeps looking when it goes dark"
published: false
description: "An underwater search simulation where six autonomous drones keep making decisions during a comms blackout, and sign every scan so their coverage can be proven on Solana."
tags: hackathon, solana, typescript, simulation
cover_image:
canonical_url:
---

> Built at DurHack 2026. A simulation about search teams that don't stop thinking when they lose contact.

## Why an underwater search

Finding a crashed aircraft's black box on the seabed is a brutal coordination problem. Radio doesn't travel underwater. Acoustic links are short-range, slow and drop packets. A fleet of autonomous drones will spend long stretches with no way to talk to each other or to a ship.

The naive answer is a central controller that tells each drone where to go. But the moment that hub is unreachable — which underwater is *most* of the time — the whole fleet stalls. Real searches (Air France 447, the MH370 effort) lean on **Bayesian search theory**, where belief about where the target is gets updated as you sweep. We wanted a swarm that does that *per drone*, and keeps going through a blackout.

## What it does

Six drones search a probability map for a hidden box. Each one:

- keeps **its own** Bayesian belief and updates it after every scan (a miss multiplies that cell's probability by `1 − pDetect`);
- picks its next target from that belief alone — there is no omniscient map driving decisions, and you can click any drone to see the world *as it actually knows it*;
- exchanges signed scan records with nearby drones when it can.

You can drop packets, shrink the acoustic range, kill a drone, kill the mothership, or trigger a 300-tick **storm** that cuts all communication. A centralized strategy and a no-communication strategy sit alongside ours as honest baselines.

## The parts that were fun to get right

### Merging knowledge without a coordinator

When two drones meet, they need to combine what they've each learned — in any order, possibly having missed messages, without ever double-counting a scan. We modeled the shared knowledge as a **grow-only set (G-Set CRDT)**: merging is just a union, so it's idempotent and order-independent. Version vectors advance only across *contiguous* sequence numbers, so a dropped message leaves a hole that gets repaired later instead of silently swallowing evidence. Missing records are re-sent oldest-first, capped per message, with latency and loss — so after a storm the maps converge *incrementally*, not magically.

### Proving where you searched, with Solana

Search contracts are sometimes "no find, no fee." That raises a real question: who can prove which areas were actually swept? Every scan record is **Ed25519-signed by the drone**. When a drone surfaces, it bundles its records into a **Merkle root** and commits that to Solana devnet as a Memo transaction — a cheap, tamper-evident record of coverage. Signing needs no network, so it happens offline on the seabed; settlement happens later, when the drone is up.

We were strict about not lying with the UI: pending, failed and confirmed settlement are visibly different states, and the simulation never waits on the network. A signature authenticates *which drone reported* a scan — not the physical truth of a detection, and we say so.

### Measuring instead of asserting

The experiment harness runs **1,700 missions** (3 strategies × 10 packet-loss levels × 50 seeds, plus hub-failure scenarios). Seeded placement, sensing and message-loss streams keep the hidden box identical across paired strategies, so comparisons are fair. Unsuccessful runs are censored at the tick limit and reported *with* success rates, so a median isn't mistaken for "always found by then." The conclusions belong to the dataset, including the cases where no-communication does better.

## The honest part

The build environment blocked listening sockets and network access, so **real devnet settlement, browser QA and Anchor contract deployment were not verified** in it. The shipped Solana path is the Memo fallback; an Anchor escrow upgrade is included as source but not claimed as deployed. A backup replay video is a headless simulation, explicitly labeled as unsigned and without on-chain settlement. We'd rather underclaim than present a pending transaction as a proof.

## Stack

Pure TypeScript simulation (no React/DOM/Solana imports in the core, so it runs headless in Node too), a React + Canvas + Zustand + Recharts front end, and a Solana devnet Memo integration. Automated tests cover deterministic replay, Bayesian merging, sequence holes, storms, hub failure, killed drones, signature tampering and Merkle ordering.

*Repo and demo link in the comments. Built with AI assistance, as is normal now.*
