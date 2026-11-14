---
title: "Swarm Orchestra: a band with no conductor that keeps playing when you cut the network"
published: false
description: "Devices each pick a musical part, cover for each other when one drops out, and talk through the notes themselves when the network is gone. A distributed-systems demo you can hear."
tags: webaudio, typescript, distributed, hackathon
cover_image:
canonical_url:
---

> Built at DurHack 2026. The idea: make a distributed system you can *hear* — and break on stage.

## The pitch in one breath

Several devices play one piece of music together, with no conductor. Each one decides its own part. If a device drops out, another takes over its role within seconds. Cut the network entirely and they keep playing — and they can even pass short messages to each other *through the notes*.

Distributed-systems talks are usually dashboards and diagrams. This one is a band. When the drummer's phone dies and a beat later someone else picks up the drums, you don't need a slide to explain resilience. You can hear it.

## What's actually happening

There is no central clock and no leader. Each node runs the same small brain and makes two decisions on its own.

### 1. Which part do I play? (leaderless assignment)

Every node keeps a view of which members it believes are alive, gathered from gossiped heartbeats. To choose a role, it sorts those member ids and takes the role at its own index: the lowest id plays drums, then bass, then chords, and everyone after that plays melody (in harmony).

The trick is that this needs *no negotiation*. Two nodes with the same view compute the same assignment independently. So when the drummer disappears from everyone's alive-set, every remaining node re-sorts and re-indexes the same way, and exactly one of them becomes the new drummer. No election, no coordinator, no split-brain over the role.

```ts
export function assign(selfId: NodeId, aliveIds: Iterable<NodeId>): Assignment {
  const sorted = [...new Set([...aliveIds, selfId])].sort();
  const index = sorted.indexOf(selfId);
  return { part: roleForIndex(index), voice: voiceForIndex(index), index, total: sorted.length };
}
```

### 2. Which song, and on which beat? (shared state as a register)

Tempo, key, seed, loop length and a shared epoch all live in one versioned value — a last-writer-wins register. Any node can change it; the change bumps the version and gossip spreads it; the highest version wins everywhere (ties broken by id). The music itself is a pure function of that state plus the beat number, so two nodes with the same state and the same wall-clock play the *same note at the same time* without ever syncing note-by-note.

That one idea gives you three things for free:
- **Starting together** — everyone derives the same song from the same seed.
- **Changing together** — "reseed" or a tempo change is one edit that wins the merge and propagates.
- **Healing after a split** — when two partitions reconnect, the higher-versioned state wins and both snap back onto it.

## Breaking it is the demo

The controls are all failures: drop a performer, split the swarm in two, trigger a comms blackout, add a performer. Each half of a partition keeps playing and self-organises its own parts (yes, both halves may grow their own drummer — that's correct, and they reconcile on reconnect). The whole point is that nothing on stage is scripted; you break it live and the music survives.

## Talking through the notes

The last piece is the one I like most. When there's *no* network at all, nodes can still exchange short messages over sound. A tiny codec maps text to a sequence of 16 tones (a nibble each, plus a checksum tone). The transmitter plays them as clean notes; a receiver runs **Goertzel detection** on the microphone — cheaper than a full FFT when you only care about 16 fixed frequencies — to read the tones back and decode the message. Open the page on two phones, mute one, and send "hello" between them with sound alone.

```ts
// detect which of our 16 tone frequencies is sounding, reject noise by SNR
export function detectTone(samples, sampleRate, freqs, minSnr = 4): ToneDetection { … }
```

(This doubles as an answer to a "hidden in plain sight" encoding challenge — the message is literally hidden in the music.)

## What I'd do differently / what's honest

- The swarm in the demo is many nodes in one browser. That's deliberate — it's controllable and reliable in a loud room — but running on separate devices needs a real transport (a small WebSocket relay or WebRTC). The node code is already transport-agnostic, so that's a wiring job, not a redesign.
- The acoustic channel is real but sensitive to noise and distance; the checksum rejects mis-heard notes rather than correcting them.
- Clock sync assumes a shared wall-clock here; real devices would need an NTP-style handshake.

## Stack

TypeScript, React, Web Audio, and a pure core with 16 unit tests covering assignment, state merge, the beat clock, deterministic music, the codec round-trip, Goertzel detection, and the full swarm behaviours (converge, takeover, partition-and-remerge). No framework for the audio — just oscillators, a noise buffer for drums, and a stereo pan per part.

*Repo and live link in the comments. Built with AI assistance, as is normal now.*
