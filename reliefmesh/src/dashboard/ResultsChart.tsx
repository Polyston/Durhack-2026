// The winning slide: results from scripts/experiments.ts (public/results.json).

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Results } from "../sim/metrics";
import { STRATEGIES, cssVar } from "../sim/strategies";

export function ResultsChart() {
  const [r, setR] = useState<Results | null>(null);
  const [metric, setMetric] = useState<"delivered" | "sos">("delivered");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}results.json`).then((x) => x.json()).then(setR).catch(() => setR(null));
  }, []);

  if (!r?.timeline || !r.summary) {
    return (
      <section className="panel">
        <h2 className="h2">Results</h2>
        <p className="note">No results yet. Run <b>npm run experiments</b>, then reload this page.</p>
      </section>
    );
  }

  const tl = r.timeline;
  const data = tl.ours.map((pt, k) => {
    const row: Record<string, number> = { hour: Math.round(pt.hour * 10) / 10 };
    for (const st of STRATEGIES) row[st.id] = Math.round((tl[st.id]?.[k]?.[metric] ?? 0) * 1000) / 10;
    return row;
  });
  const ours = r.summary.ours, flood = r.summary.epidemic;
  const fewer = flood.copiesPerDelivered / Math.max(1, ours.copiesPerDelivered);
  const axis = cssVar("--steel"), grid = cssVar("--rule");

  return (
    <section className="panel">
      <h2 className="h2">Same delivery as flooding, {Math.round(fewer)}× fewer copies</h2>
      <p className="lede">
        {r.seeds} simulated quakes per strategy, 150 phones, 12 hours. ReliefMesh delivers {(ours.delivery * 100).toFixed(1)}% of messages, about the same as copying everything to everyone ({(flood.delivery * 100).toFixed(1)}%), while using a fraction of the battery and storage.
      </p>
      <div className="seg" role="group" aria-label="Chart metric" style={{ margin: "14px 0 6px", maxWidth: 380 }}>
        <button aria-pressed={metric === "delivered"} onClick={() => setMetric("delivered")}>All messages</button>
        <button aria-pressed={metric === "sos"} onClick={() => setMetric("sos")}>Urgent SOS only</button>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="hour" stroke={axis} tickFormatter={(h) => `${Math.round(h)}h`} interval={7} />
          <YAxis stroke={axis} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
          <Tooltip formatter={(v: number, name: string) => [`${v}%`, STRATEGIES.find((s) => s.id === name)?.label ?? name]} labelFormatter={(h) => `${h} hours after the quake`} />
          {STRATEGIES.map((st) => (
            <Line key={st.id} type="monotone" dataKey={st.id} stroke={cssVar(st.colorVar)} strokeDasharray={st.dash} dot={false} strokeWidth={st.id === "ours" ? 3.5 : 2} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <table className="results">
        <thead>
          <tr><th>Strategy</th><th>Delivered</th><th>Urgent SOS</th><th>Typical wait</th><th>Copies per delivery</th><th>Lost to full phones</th></tr>
        </thead>
        <tbody>
          {STRATEGIES.map((st) => {
            const s = r.summary![st.id];
            return (
              <tr key={st.id} className={st.id === "ours" ? "ours" : ""}>
                <td><span className="swatch" style={{ background: cssVar(st.colorVar) }} />{st.label}</td>
                <td>{(s.delivery * 100).toFixed(1)}%</td>
                <td>{(s.sosUrgentDelivery * 100).toFixed(1)}%</td>
                <td>{s.medianDelayMin ? `${s.medianDelayMin.toFixed(0)} min` : "–"}</td>
                <td>{s.copiesPerDelivered.toFixed(0)}</td>
                <td>{Math.round(s.drops).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
