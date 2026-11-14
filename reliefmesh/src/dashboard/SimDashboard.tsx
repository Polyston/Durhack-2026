import { useEffect, useRef, useState } from "react";
import { aftershock, CITY, createWorld, gatewaysDown, step, summarize, totalTicks, ZONES, type World } from "../sim/world";
import { STRATEGIES, cssVar } from "../sim/strategies";
import type { Policy } from "../core/types";
import { ResultsChart } from "./ResultsChart";

const SIZE = 720;
const sc = SIZE / CITY;

function draw(ctx: CanvasRenderingContext2D, w: World) {
  const ink = cssVar("--ink"), field = cssVar("--field"), rule = cssVar("--rule"), steel = cssVar("--steel");
  const hivis = cssVar("--hivis"), signal = cssVar("--signal"), hatch = cssVar("--hatch");
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // street grid, like a site plan
  ctx.strokeStyle = rule;
  ctx.lineWidth = 1;
  for (let v = 100; v < CITY; v += 100) {
    ctx.lineWidth = v % 400 === 0 ? 3 : 1;
    ctx.beginPath(); ctx.moveTo(v * sc, 0); ctx.lineTo(v * sc, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, v * sc); ctx.lineTo(SIZE, v * sc); ctx.stroke();
  }

  // collapsed zones: rubble hatching
  for (const z of ZONES) {
    ctx.save();
    ctx.beginPath(); ctx.arc(z.x * sc, z.y * sc, z.r * sc, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = field; ctx.fill();
    ctx.strokeStyle = hatch; ctx.lineWidth = 1.5;
    for (let d = -SIZE; d < SIZE * 2; d += 7) { ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - SIZE, SIZE); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.arc(z.x * sc, z.y * sc, z.r * sc, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // gateways: square marker + reach
  ctx.font = "600 13px 'Archivo Variable', system-ui";
  for (const g of w.gateways) {
    const x = g.x * sc, y = g.y * sc, r = Math.max(10, w.cfg.gatewayRange * sc * 2.2);
    ctx.strokeStyle = g.on ? signal : steel; ctx.lineWidth = 2;
    if (!g.on) ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = g.on ? signal : field;
    ctx.fillRect(x - 6, y - 6, 12, 12); ctx.strokeRect(x - 6, y - 6, 12, 12);
    ctx.fillStyle = g.on ? signal : steel;
    const label = g.on ? g.name : `${g.name}, no signal`;
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, Math.min(SIZE - tw - 6, Math.max(6, x - tw / 2)), y - r - 12);
  }

  // hand-overs this tick
  ctx.strokeStyle = ink; ctx.lineWidth = 2;
  for (const [a, b] of w.recentEncounters) {
    const A = w.nodes[a], B = w.nodes[b];
    ctx.beginPath(); ctx.moveTo(A.x * sc, A.y * sc); ctx.lineTo(B.x * sc, B.y * sc); ctx.stroke();
  }

  // phones
  for (const n of w.nodes) {
    const x = n.x * sc, y = n.y * sc;
    if (!n.alive) {
      ctx.strokeStyle = steel; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
      continue;
    }
    let urgent = false;
    for (const p of n.state.packets.values()) if (p.priority === 3) { urgent = true; break; }
    const r = 2.5 + Math.min(3.5, n.state.packets.size / 6);
    ctx.fillStyle = urgent ? hivis : ink;
    ctx.beginPath();
    if (n.role === "responder") ctx.rect(x - r, y - r, r * 2, r * 2);
    else if (n.role === "volunteer") { ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r + 1, y + r); ctx.lineTo(x - r - 1, y + r); ctx.closePath(); }
    else ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (w.tick < w.frozenUntil) {
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, SIZE, 40);
    ctx.fillStyle = field;
    ctx.font = "800 20px 'Archivo Variable', system-ui";
    ctx.fillText("Aftershock: everyone is sheltering, nobody moves", 14, 27);
  }
}

export function SimDashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [policy, setPolicy] = useState<Policy>("ours");
  const [numNodes, setNumNodes] = useState(150);
  const [uptime, setUptime] = useState(0.5);
  const [speed, setSpeed] = useState(6);
  const [running, setRunning] = useState(true);
  const [seed, setSeed] = useState(1);
  const worldRef = useRef<World | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    worldRef.current = createWorld({ policy, numNodes, gatewayUptime: uptime, seed: `live-${seed}` });
    force((x) => x + 1);
  }, [policy, numNodes, uptime, seed]);

  useEffect(() => {
    let raf = 0;
    let frame = 0;
    const loop = () => {
      const w = worldRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (w && ctx) {
        if (running && w.tick < totalTicks(w.cfg)) for (let i = 0; i < speed; i++) step(w);
        draw(ctx, w);
        if (++frame % 10 === 0) force((x) => x + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed]);

  const w = worldRef.current;
  const s = w ? summarize(w) : null;
  const hours = w ? (w.tick * w.cfg.tickSec) / 3600 : 0;
  const alive = w ? w.nodes.filter((n) => n.alive).length : 0;
  const strat = STRATEGIES.find((x) => x.id === policy)!;

  return (
    <div className="dash">
      <header className="dashhead">
        <h1 className="h1">A city with no signal</h1>
        <p className="lede">
          {numNodes} phones after an earthquake. Each one runs the same ReliefMesh code as the app, deciding on its own what to carry and who to hand it to. No server, no coordinator.
        </p>
        <a className="btn small quiet" href="#/">Open the phone app</a>
      </header>

      <div className="plan">
        <div className="mapwrap">
          <canvas ref={canvasRef} width={SIZE} height={SIZE} className="simcanvas" aria-label="City map of phones passing messages" />
          <div className="maplegend">
            <span><i style={{ background: "var(--ink)" }} />Survivor</span>
            <span><i style={{ background: "var(--ink)", borderRadius: 0, clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />Volunteer</span>
            <span><i style={{ background: "var(--ink)", borderRadius: 0 }} />Responder</span>
            <span><i style={{ background: "var(--hivis)" }} />Carrying an urgent SOS</span>
            <span><i style={{ background: "var(--signal)", borderRadius: 0 }} />Gateway with signal</span>
            <span>Hatched: collapsed buildings</span>
          </div>
        </div>

        <aside className="side">
          <section className="panel">
            <h2 className="h3">Strategy</h2>
            <select value={policy} onChange={(e) => setPolicy(e.target.value as Policy)} style={{ marginTop: 8 }}>
              {STRATEGIES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
            </select>
            <p className="note">{strat.description}</p>
          </section>

          <section className="panel">
            <dl className="readout">
              <dt>Time since the quake</dt><dd className="big">{hours.toFixed(1)} h</dd>
              <dt>Messages delivered</dt><dd className="big">{s ? `${Math.round(s.delivery * 100)}%` : "–"}</dd>
              <dt>Urgent SOS delivered</dt><dd className="hot">{s ? `${Math.round(s.sosUrgentDelivery * 100)}%` : "–"}</dd>
              <dt>Typical wait</dt><dd>{s?.medianDelayMin != null ? `${s.medianDelayMin.toFixed(0)} min` : "–"}</dd>
              <dt>Copies per delivery</dt><dd>{s ? s.copiesPerDelivered.toFixed(1) : "–"}</dd>
              <dt>Lost to full phones</dt><dd>{s ? s.drops.toLocaleString() : "–"}</dd>
              <dt>Phones still working</dt><dd>{alive} of {numNodes}</dd>
            </dl>
          </section>

          <section className="panel">
            <h2 className="h3">Break things</h2>
            <div className="btns" style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => w && aftershock(w)}>Trigger aftershock</button>
              <button className="btn" onClick={() => w && gatewaysDown(w)}>Cut all gateways</button>
            </div>
            <p className="note">An aftershock freezes everyone for 30 minutes and kills 1 in 5 phones. Cutting gateways takes the internet away for an hour.</p>
          </section>

          <section className="panel">
            <label>Phones in the city: {numNodes}</label>
            <input type="range" min={50} max={300} step={10} value={numNodes} onChange={(e) => setNumNodes(Number(e.target.value))} />
            <label>Gateway uptime: {Math.round(uptime * 100)}%</label>
            <input type="range" min={0.1} max={1} step={0.1} value={uptime} onChange={(e) => setUptime(Number(e.target.value))} />
            <label>Playback speed: {speed}×</label>
            <input type="range" min={1} max={40} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            <div className="btns" style={{ marginTop: 12 }}>
              <button className="btn small" onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Play"}</button>
              <button className="btn small quiet" onClick={() => setSeed((x) => x + 1)}>Restart</button>
            </div>
          </section>
        </aside>
      </div>

      <div className="lower">
        <ResultsChart />
        <section className="panel">
          <h2 className="h3">What's happening</h2>
          <ul className="log">
            {w?.events.map((e, i) => {
              const m = e.match(/^\[([\d.]+)h\] (.*)$/);
              const text = m ? m[2] : e;
              const cls = text.startsWith("URGENT") ? "urgent" : text.startsWith("AFTERSHOCK") || text.startsWith("ALL GATEWAYS") ? "shock" : "";
              return (
                <li key={i} className={cls}>
                  <span className="t">{m ? `${m[1]}h` : ""}</span>
                  <span>{text.replace(/^URGENT SOS (\S+) reached HQ$/, "Urgent SOS reached HQ").replace(/^AFTERSHOCK: /, "Aftershock: ").replace(/^ALL GATEWAYS DOWN/, "All gateways down")}</span>
                </li>
              );
            })}
            {!w?.events.length && <li><span className="t" /><span className="note">Events appear here as gateways come and go.</span></li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
