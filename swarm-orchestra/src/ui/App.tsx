import { useEffect, useMemo, useRef, useState } from "react";
import { Swarm, DEFAULT } from "../sim/world";
import { AudioEngine } from "../audio/engine";
import { notesForBeat } from "../core/music";
import { beatPhase, edit } from "../core/state";
import { PARTS, type Part } from "../core/types";
import { SecretChannel } from "./SecretChannel";

const COLOR: Record<Part, string> = { drums: "#ff6b6b", bass: "#ffd166", chords: "#4ecdc4", melody: "#a78bfa" };

export function App() {
  const [started, setStarted] = useState(false);
  const engineRef = useRef(new AudioEngine());
  const swarmRef = useRef<Swarm | null>(null);
  const [, force] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);

  if (!swarmRef.current) swarmRef.current = new Swarm({ ...DEFAULT }, Date.now());
  const swarm = swarmRef.current;
  const engine = engineRef.current;

  useEffect(() => {
    if (!started) return;
    let lastGossip = 0;
    let lastRender = 0;
    let raf = 0;
    swarm.onBeat = (id, beat) => {
      const node = swarm.node(id);
      if (!node?.alive) return;
      const a = node.assignment(Date.now());
      engine.playBeat(a.part, notesForBeat(a.part, node.state, beat, a.voice), 60 / node.state.tempo, a.voice);
    };
    const loop = () => {
      const now = Date.now();
      if (now - lastGossip >= swarm.cfg.heartbeatMs) {
        swarm.gossip(now);
        lastGossip = now;
      }
      swarm.pump(now);
      if (now - lastRender >= 55) {
        lastRender = now;
        force((x) => x + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  const begin = async () => {
    await engine.start();
    engine.setVolume(volume);
    setStarted(true);
  };

  const firstAlive = () => swarm.nodes.find((n) => n.alive);
  const editState = (patch: Parameters<typeof edit>[2]) => {
    const n = firstAlive();
    if (n) n.state = edit(n.state, n.id, patch);
  };

  const now = Date.now();
  const tempo = firstAlive()?.state.tempo ?? 110;
  const covered = useMemo(() => {
    const s = new Set<Part>();
    for (const n of swarm.nodes) if (n.alive) s.add(n.assignment(now).part);
    return s;
  }, [now, swarm]);

  if (!started) {
    return (
      <div className="wrap">
        <div className="gate">
          <h1>Swarm Orchestra</h1>
          <p>
            Several devices play one piece of music together — with no conductor. Each picks its own part, and if one drops out another takes over.
            Cut the network and they keep playing; they can even talk through the notes themselves.
          </p>
          <button className="btn go" onClick={begin}>Start the swarm</button>
          <p className="hint">Sound on. Best with headphones or a speaker.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header>
        <h1>Swarm Orchestra</h1>
        <span className="tag">one band, no conductor · {swarm.nodes.filter((n) => n.alive).length} playing</span>
      </header>

      <div className="grid">
        <div className="stage">
          <div className="stagewrap">
            <Ring swarm={swarm} now={now} onToggle={(id) => (swarm.node(id)?.alive ? swarm.kill(id) : swarm.revive(id, Date.now()))} />
          </div>
        </div>

        <div>
          <div className="panel">
            <h3>Health</h3>
            <div className="readout">
              <span className={`chip ${swarm.inSync() ? "sync" : "desync"}`}>{swarm.inSync() ? "in sync" : "diverged"}</span>
              <span className="chip">{tempo} BPM</span>
              <span className="chip">{swarm.storm ? "network down" : "network up"}</span>
            </div>
            <div className="parts">
              {PARTS.map((p) => (
                <span key={p} className={`p ${p} ${covered.has(p) ? "" : "gap"}`}>{p}</span>
              ))}
            </div>
            <p className="note">Click any performer to drop it out or bring it back. Watch a part get covered by someone else.</p>
          </div>

          <div className="panel">
            <h3>Break the network</h3>
            <div className="ctl">
              <button className="btn small" onClick={() => swarm.splitInto(2)}>Split in two</button>
              <button className="btn small" onClick={() => swarm.splitInto(1)}>Reconnect</button>
              <button className={`btn small ${swarm.storm ? "warn" : ""}`} onClick={() => swarm.setStorm(!swarm.storm)}>
                {swarm.storm ? "End blackout" : "Comms blackout"}
              </button>
              <button className="btn small" onClick={() => swarm.addNode(Date.now())}>Add performer</button>
            </div>
            <div className="row">
              <label>Tempo</label>
              <input type="range" min={70} max={160} value={tempo} onChange={(e) => editState({ tempo: Number(e.target.value) })} />
              <span className="val">{tempo}</span>
            </div>
            <div className="row">
              <label>New song</label>
              <button className="btn small" onClick={() => editState({ seed: Math.floor(Math.random() * 1e6) })}>Reseed</button>
              <span className="hint">everyone switches together</span>
            </div>
            <div className="row">
              <label>Volume</label>
              <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => { setVolume(+e.target.value); engine.setVolume(+e.target.value); }} />
              <button className={`btn small ${muted ? "on" : ""}`} onClick={() => { const m = !muted; setMuted(m); engine.setMuted(m); }}>{muted ? "unmute" : "mute"}</button>
            </div>
          </div>

          <SecretChannel engine={engine} />

          <div className="panel">
            <h3>Events</h3>
            <ul className="log">
              {swarm.log.map((l, i) => <li key={i}>{l}</li>)}
              {!swarm.log.length && <li>Break something to see what the swarm does.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ring({ swarm, now, onToggle }: { swarm: Swarm; now: number; onToggle: (id: string) => void }) {
  const cx = 50, cy = 41, R = 30;
  const nodes = swarm.nodes.map((n, i) => {
    const ang = (i / swarm.nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { n, x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R };
  });
  const links: [number, number][] = [];
  if (!swarm.storm) {
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        if (nodes[i].n.alive && nodes[j].n.alive && swarm.partition.get(nodes[i].n.id) === swarm.partition.get(nodes[j].n.id))
          links.push([i, j]);
  }
  return (
    <svg viewBox="0 0 100 82">
      {links.map(([a, b], k) => (
        <line key={k} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="#2d2548" strokeWidth={0.3} />
      ))}
      {nodes.map(({ n, x, y }) => {
        const a = n.assignment(now);
        const color = n.alive ? COLOR[a.part] : "#4a4360";
        const phase = n.alive ? 1 - beatPhase(n.state, now, n.offsetMs) : 0;
        const r = 4.4 + phase * 2.2;
        return (
          <g key={n.id} onClick={() => onToggle(n.id)} style={{ cursor: "pointer" }}>
            {n.alive && <circle cx={x} cy={y} r={r + 1.6} fill="none" stroke={color} strokeOpacity={phase * 0.5} strokeWidth={0.8} />}
            <circle cx={x} cy={y} r={4.4} fill={n.alive ? color : "none"} stroke={color} strokeWidth={n.alive ? 0 : 0.6} strokeDasharray={n.alive ? "0" : "1.2 1"} />
            <text x={x} y={y + 0.8} textAnchor="middle" fontSize={2.3} fontWeight={700} fill={n.alive ? "#140a28" : "#6a6288"}>{n.id}</text>
            <text x={x} y={y + 7.5} textAnchor="middle" fontSize={2.4} fill={n.alive ? color : "#4a4360"}>{n.alive ? a.part : "out"}</text>
          </g>
        );
      })}
    </svg>
  );
}
