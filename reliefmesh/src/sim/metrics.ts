// Shape of public/results.json (written by scripts/experiments.ts, read by the dashboard chart).
import type { Policy } from "../core/types";

export interface PolicySummary {
  delivery: number;
  sosUrgentDelivery: number;
  sosDelivery: number;
  medianDelayMin: number | null;
  urgentMedianDelayMin: number | null;
  copiesPerDelivered: number;
  drops: number;
}

export interface Results {
  generatedAt: string | null;
  seeds?: number;
  config?: Record<string, unknown>;
  timeline?: Record<Policy, { hour: number; delivered: number; sos: number }[]>;
  summary?: Record<Policy, PolicySummary>;
  sweeps?: {
    capacity: ({ capacity: number } & Record<Policy, number>)[];
    uptime: ({ uptime: number } & Record<Policy, number>)[];
  };
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const medianOf = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
