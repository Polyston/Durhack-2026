import type { Policy } from "../core/types";

// colorVar = CSS custom property, read at draw time so light/dark both work.
export const STRATEGIES: { id: Policy; label: string; colorVar: string; dash?: string; description: string }[] = [
  { id: "ours", label: "ReliefMesh", colorVar: "--ink", description: "Each phone weighs urgency, learns who is near the internet, and drops copies once delivered." },
  { id: "epidemic", label: "Copy to everyone", colorVar: "--steel", dash: "6 4", description: "Every phone copies every packet to everyone it meets." },
  { id: "sprayWait", label: "Fixed copy limit", colorVar: "--amber", dash: "2 4", description: "Each packet gets 8 copies, with no priorities or learning." },
  { id: "towers", label: "Wait for towers", colorVar: "--rule", description: "Today's reality: a message only leaves when its sender reaches a connection." },
];

export const strategyById = (id: Policy) => STRATEGIES.find((s) => s.id === id)!;

export const cssVar = (name: string) =>
  typeof window === "undefined" ? "#000" : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000";
