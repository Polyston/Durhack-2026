# Swarm Orchestra

**Several devices play one piece of music together — with no conductor.** Each device picks its own
part (drums, bass, chords, melody) from what it can see of its neighbours. If one drops out, another
takes over its part within seconds. Cut the network and they keep playing. They can even talk to each
other *through the notes themselves*.

Built at DurHack 2026. One demo touches four briefs at once:

| Angle | How |
|---|---|
| **Composition** (overall theme) | It's generative music made by mixing tech and art |
| **Neptune North** (actors work together) | Leaderless roles, independent decisions, keeps playing when comms fail |
| **QRT "Hidden in Plain Sight"** | The sound channel is a real tone encoder + microphone decoder |
| **MLH / creativity** | A live, audible distributed-systems demo you can break on stage |

---

## Run it

```bash
cd swarm-orchestra
npm install
npm run dev          # open the URL, click "Start the swarm" (browsers need a gesture for audio)
npm test             # 16 core tests, no audio/DOM needed
npm run build
```

Best with a speaker or headphones. The sound channel ("Listen") needs microphone permission and
`https` or `localhost`.

## What to do in the demo

1. **Start the swarm.** Five performers appear in a ring, each a different colour and part. Point out there's no conductor — each one chose its part from who it can see.
2. **Click the drummer** to drop it out. Within a couple of seconds another performer promotes itself to drums and the beat continues. The lowest-id survivor always takes the open role, with no negotiation.
3. **Split in two.** Each half keeps playing and self-organises its own parts. **Reconnect** and they re-merge onto one shared state.
4. **Comms blackout** cuts every link; they keep playing on their own clocks.
5. **Reseed** writes a new song into the shared state on one node — and everyone switches together, because the change wins the merge and spreads by gossip.
6. **Sound channel:** open the page on a second phone, mute one, type a message and press *Send as tones*. The other phone's mic decodes it — data carried by music, no network.

---

## How it works

```
src/core/           pure logic, unit-tested — the same code a real device would run
  types.ts          parts, shared state, note events
  music.ts          deterministic song from a seed: scales, progression, notes per beat
  assign.ts         leaderless role assignment (sort alive ids; fill drums, bass, chords, then melody)
  state.ts          shared state = last-writer-wins register; beat clock derived from it
  node.ts           one swarm member: its own view of who's alive + the shared state
  codec.ts          text  <->  tone sequence  (16 tones, a nibble each, + checksum)
  goertzel.ts       tone detection for the microphone decoder
src/sim/world.ts    many nodes in one page, with a message layer you can partition / storm
src/audio/
  engine.ts         Web Audio: a timbre per part + a tone transmitter
  listener.ts       microphone -> Goertzel -> decoded message
src/ui/             the control room (ring visualiser, break-the-network controls, sound channel)
```

Two ideas carry the whole thing:

- **Leaderless assignment.** Every node sorts the set of members it believes are alive and takes the role at its index. Nodes with the same view reach the same answer with no messages exchanged about roles. Lose a member and everyone recomputes the same way, so gaps get filled automatically.
- **Shared state as a last-writer-wins register.** Tempo, key, seed and the epoch all live in one versioned value. A change bumps the version; gossip spreads it; the highest version wins everywhere. That's how everyone starts the same song and snaps back together after a split.

The **simulation runs the real node code**; only the transport is faked, so the stage demo is reliable even in a loud room with no real radios. The sound channel is the one genuinely acoustic piece, kept isolated so it can never break the main show.

## Honest limitations

- The swarm you see is many nodes in one browser (a believable, controllable demo). Running them on separate devices needs a transport (a tiny WebSocket relay, or WebRTC); the node logic is already transport-agnostic.
- The acoustic sound channel is real but sensitive to noise and distance; it carries short messages, with a checksum to reject mis-heard notes.
- Clock sync here assumes a shared wall clock. Real devices would need NTP-style sync or a beat-phase handshake.
