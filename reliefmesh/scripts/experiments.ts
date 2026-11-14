// Runs every strategy over many seeds and writes public/results.json for the dashboard chart.
// Usage: npm run experiments            (default 20 seeds)
//        SEEDS=5 npm run experiments    (faster)

import { writeFileSync } from "node:fs";
import { runHeadless } from "../src/sim/runner";
import { DEFAULT_CONFIG } from "../src/sim/world";
import { mean, medianOf, type PolicySummary, type Results } from "../src/sim/metrics";
import type { Policy } from "../src/core/types";

const SEEDS = Number(process.env.SEEDS ?? 20);
const POLICIES: Policy[] = ["ours", "epidemic", "sprayWait", "towers"];
const seeds = Array.from({ length: SEEDS }, (_, i) => `seed-${i + 1}`);

const t0 = Date.now();
const timeline = {} as NonNullable<Results["timeline"]>;
const summary = {} as Record<Policy, PolicySummary>;

for (const policy of POLICIES) {
  const runs = seeds.map((seed) => runHeadless({ policy, seed }));
  const points = runs[0].world.metrics.timeline.length;
  timeline[policy] = Array.from({ length: points }, (_, k) => ({
    hour: runs[0].world.metrics.timeline[k].hour,
    delivered: medianOf(runs.map((r) => r.world.metrics.timeline[k]?.delivered ?? 0)),
    sos: medianOf(runs.map((r) => r.world.metrics.timeline[k]?.sos ?? 0)),
  }));
  const s = runs.map((r) => r.summary);
  summary[policy] = {
    delivery: mean(s.map((x) => x.delivery)),
    sosUrgentDelivery: mean(s.map((x) => x.sosUrgentDelivery)),
    sosDelivery: mean(s.map((x) => x.sosDelivery)),
    medianDelayMin: medianOf(s.map((x) => x.medianDelayMin ?? 0)),
    urgentMedianDelayMin: medianOf(s.map((x) => x.urgentMedianDelayMin ?? 0)),
    copiesPerDelivered: mean(s.map((x) => x.copiesPerDelivered)),
    drops: mean(s.map((x) => x.drops)),
  };
  console.log(`${policy.padEnd(10)} delivery ${(summary[policy].delivery * 100).toFixed(1)}%  urgent SOS ${(summary[policy].sosUrgentDelivery * 100).toFixed(1)}%  ` +
    `median delay ${summary[policy].medianDelayMin?.toFixed(0)} min  copies/delivered ${summary[policy].copiesPerDelivered.toFixed(1)}  drops ${summary[policy].drops.toFixed(0)}`);
}

// Sweeps use fewer seeds to stay quick.
const sweepSeeds = seeds.slice(0, Math.max(3, Math.floor(SEEDS / 3)));
const sweepRow = (cfg: Record<string, number>) => {
  const row: Record<string, number> = { ...cfg };
  for (const policy of POLICIES) row[policy] = mean(sweepSeeds.map((seed) => runHeadless({ policy, seed, ...cfg }).summary.delivery));
  return row;
};
const capacity = [10, 25, 50].map((c) => sweepRow({ capacity: c }));
const uptime = [0.2, 0.5, 0.9].map((u) => sweepRow({ gatewayUptime: u }));
console.log("capacity sweep", capacity);
console.log("uptime sweep", uptime);

const results: Results = {
  generatedAt: new Date().toISOString(),
  seeds: SEEDS,
  config: { ...DEFAULT_CONFIG, policy: undefined, seed: undefined },
  timeline,
  summary,
  sweeps: { capacity: capacity as never, uptime: uptime as never },
};
writeFileSync(new URL("../public/results.json", import.meta.url), JSON.stringify(results, null, 1));
console.log(`wrote public/results.json in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
