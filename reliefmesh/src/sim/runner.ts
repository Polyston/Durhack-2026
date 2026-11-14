import { createWorld, step, summarize, totalTicks, type SimConfig, type Summary, type World } from "./world";

/** Run one full simulation with no UI. Used by scripts/experiments.ts. */
export function runHeadless(cfg: Partial<SimConfig>): { summary: Summary; world: World } {
  const w = createWorld(cfg);
  const end = totalTicks(w.cfg);
  while (w.tick < end) step(w);
  return { summary: summarize(w), world: w };
}
