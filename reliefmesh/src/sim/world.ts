// A destroyed city with ~150 phones, using the SAME router as the real phones. (Brief 11.1.)
// Pure TypeScript (no DOM) so it also runs headless in Node for experiments.

import seedrandom from "seedrandom";
import { makePacket } from "../core/packet";
import { encounter, markGateway, newNode } from "../core/router";
import type { NodeState, Policy, Priority } from "../core/types";
import { UNLIMITED } from "../core/types";

export type Role = "survivor" | "volunteer" | "responder";

export interface SimConfig {
  policy: Policy;
  seed: string;
  numNodes: number; // default 150
  capacity: number; // packets per phone, default 25
  gatewayUptime: number; // 0..1, fraction of time each gateway has a connection
  hours: number; // simulated duration
  tickSec: number;
  encounterRange: number; // metres
  gatewayRange: number; // metres
  packetsPerSurvivor: number; // average packets each survivor creates over the run
}

export const DEFAULT_CONFIG: SimConfig = {
  policy: "ours",
  seed: "durhack",
  numNodes: 150,
  capacity: 25,
  gatewayUptime: 0.5,
  hours: 12,
  tickSec: 10,
  encounterRange: 20,
  gatewayRange: 30,
  packetsPerSurvivor: 4,
};

export const CITY = 2000; // metres, square
export const ZONES = [
  { x: 600, y: 600, r: 160 },
  { x: 1050, y: 1300, r: 160 },
  { x: 1450, y: 750, r: 160 },
  { x: 450, y: 1400, r: 140 },
];
export const GATEWAY_SITES = [
  { x: 250, y: 1800, name: "Starlink truck" },
  { x: 1800, y: 250, name: "Hospital" },
  { x: 1750, y: 1750, name: "Stadium camp" },
];

export interface SimNode {
  idx: number;
  state: NodeState;
  role: Role;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number; // m/s
  home: number; // zone index
  alive: boolean;
  lastMeet: Map<number, number>; // other idx -> tick
  goingToGateway: boolean;
}

export interface Gateway {
  x: number;
  y: number;
  name: string;
  on: boolean;
}

export interface CreatedInfo {
  tick: number;
  kind: "payment" | "sos";
  priority: Priority;
}

export interface Metrics {
  created: Map<string, CreatedInfo>;
  delivered: Map<string, number>; // packet id -> tick delivered
  transfers: number;
  drops: number;
  timeline: { hour: number; delivered: number; sos: number; created: number }[];
}

export interface World {
  cfg: SimConfig;
  rng: () => number;
  tick: number;
  nodes: SimNode[];
  gateways: Gateway[];
  frozenUntil: number;
  gatewaysForcedOffUntil: number;
  metrics: Metrics;
  recentEncounters: [number, number][]; // for drawing
  events: string[];
  seq: number;
}

export function createWorld(partial: Partial<SimConfig> = {}): World {
  const cfg = { ...DEFAULT_CONFIG, ...partial };
  const rng = seedrandom(cfg.seed);
  const nodes: SimNode[] = [];
  for (let i = 0; i < cfg.numNodes; i++) {
    const f = i / cfg.numNodes;
    const role: Role = f < 0.6 ? "survivor" : f < 0.9 ? "volunteer" : "responder";
    const home = Math.floor(rng() * ZONES.length);
    const z = ZONES[home];
    const p = role === "survivor" ? pointInZone(rng, home) : { x: rng() * CITY, y: rng() * CITY };
    nodes.push({
      idx: i,
      state: newNode(`n${i}`, cfg.capacity, 0),
      role,
      x: p.x,
      y: p.y,
      tx: z.x,
      ty: z.y,
      speed: role === "survivor" ? 0.3 : role === "volunteer" ? 1.4 : 4,
      home,
      alive: true,
      lastMeet: new Map(),
      goingToGateway: false,
    });
  }
  const w: World = {
    cfg,
    rng,
    tick: 0,
    nodes,
    gateways: GATEWAY_SITES.map((g) => ({ ...g, on: rng() < cfg.gatewayUptime })),
    frozenUntil: -1,
    gatewaysForcedOffUntil: -1,
    metrics: { created: new Map(), delivered: new Map(), transfers: 0, drops: 0, timeline: [] },
    recentEncounters: [],
    events: [],
    seq: 0,
  };
  for (const n of nodes) pickTarget(w, n);
  return w;
}

function pointInZone(rng: () => number, zi: number) {
  const z = ZONES[zi];
  const a = rng() * Math.PI * 2;
  const r = Math.sqrt(rng()) * z.r;
  return { x: z.x + Math.cos(a) * r, y: z.y + Math.sin(a) * r };
}

function pickTarget(w: World, n: SimNode) {
  const rng = w.rng;
  if (n.role === "survivor") {
    const p = pointInZone(rng, n.home);
    n.tx = p.x;
    n.ty = p.y;
  } else if (n.role === "volunteer") {
    // volunteers walk between collapsed zones and random streets
    const p = rng() < 0.6 ? pointInZone(rng, Math.floor(rng() * ZONES.length)) : { x: rng() * CITY, y: rng() * CITY };
    n.tx = p.x;
    n.ty = p.y;
  } else {
    // responders shuttle between zones and gateway sites (aid trucks)
    n.goingToGateway = !n.goingToGateway;
    const p = n.goingToGateway ? GATEWAY_SITES[Math.floor(rng() * GATEWAY_SITES.length)] : pointInZone(rng, Math.floor(rng() * ZONES.length));
    n.tx = p.x;
    n.ty = p.y;
  }
}

const nowMs = (w: World) => w.tick * w.cfg.tickSec * 1000;
export const totalTicks = (cfg: SimConfig) => Math.round((cfg.hours * 3600) / cfg.tickSec);

function log(w: World, msg: string) {
  const h = (w.tick * w.cfg.tickSec) / 3600;
  w.events.unshift(`[${h.toFixed(1)}h] ${msg}`);
  if (w.events.length > 40) w.events.pop();
}

// ---------------------------------------------------------------- controls

export function aftershock(w: World) {
  w.frozenUntil = w.tick + Math.round(1800 / w.cfg.tickSec); // 30 min frozen
  let died = 0;
  for (const n of w.nodes) {
    if (n.alive && w.rng() < 0.2) {
      n.alive = false;
      died++;
    }
  }
  log(w, `AFTERSHOCK: everyone shelters for 30 min, ${died} phones lost`);
}

export function gatewaysDown(w: World) {
  w.gatewaysForcedOffUntil = w.tick + Math.round(3600 / w.cfg.tickSec); // 1 hour
  for (const g of w.gateways) g.on = false;
  log(w, "ALL GATEWAYS DOWN: no internet for 1 hour");
}

// ---------------------------------------------------------------- tick

export function step(w: World): void {
  const { cfg, rng } = w;
  const now = nowMs(w);
  const dt = cfg.tickSec;

  // 1. gateways switch on/off (mean cycle 2 h)
  if (w.tick >= w.gatewaysForcedOffUntil) {
    const cycle = 7200 / dt;
    for (const g of w.gateways) {
      const meanOn = Math.max(1, cfg.gatewayUptime * cycle);
      const meanOff = Math.max(1, (1 - cfg.gatewayUptime) * cycle);
      if (g.on && rng() < 1 / meanOn) {
        g.on = false;
        log(w, `${g.name} lost signal`);
      } else if (!g.on && cfg.gatewayUptime > 0 && rng() < 1 / meanOff) {
        g.on = true;
        log(w, `${g.name} has signal again`);
      }
    }
  }

  // 2. movement
  const frozen = w.tick < w.frozenUntil;
  if (!frozen) {
    for (const n of w.nodes) {
      if (!n.alive) continue;
      const dx = n.tx - n.x;
      const dy = n.ty - n.y;
      const d = Math.hypot(dx, dy);
      const stepLen = n.speed * dt;
      if (d <= stepLen) {
        n.x = n.tx;
        n.y = n.ty;
        pickTarget(w, n);
      } else {
        n.x += (dx / d) * stepLen;
        n.y += (dy / d) * stepLen;
      }
    }
  }

  // 3. survivors create packets: 80% payments, 20% SOS (half urgent)
  const pPerTick = cfg.packetsPerSurvivor / totalTicks(cfg);
  for (const n of w.nodes) {
    if (!n.alive || n.role !== "survivor" || rng() >= pPerTick) continue;
    const r = rng();
    const kind = r < 0.2 ? "sos" : "payment";
    const priority: Priority = kind === "sos" ? (r < 0.1 ? 3 : 2) : 1;
    const id = `p${w.seq++}`;
    const p = makePacket({ kind, priority, origin: n.state.id, payload: id, now, policy: cfg.policy, id });
    n.state.packets.set(p.id, p); // own packet: always kept (may exceed capacity briefly)
    w.metrics.created.set(id, { tick: w.tick, kind, priority });
  }

  // 4. gateway delivery
  const activeGws = w.gateways.filter((g) => g.on);
  for (const n of w.nodes) {
    if (!n.alive) continue;
    const at = activeGws.some((g) => Math.hypot(g.x - n.x, g.y - n.y) <= cfg.gatewayRange);
    if (cfg.policy === "ours" || at) markGateway(n.state, now, at);
    if (!at) {
      n.state.isGateway = false;
      continue;
    }
    for (const p of [...n.state.packets.values()]) {
      if (cfg.policy === "towers" && p.origin !== n.state.id) continue;
      if (!w.metrics.delivered.has(p.id)) {
        w.metrics.delivered.set(p.id, w.tick);
        if (p.kind === "sos" && p.priority === 3) log(w, `URGENT SOS ${p.id} reached HQ`);
      }
      n.state.packets.delete(p.id);
      if (cfg.policy === "ours") n.state.acks.set(p.id, { packetId: p.id, deliveredAt: now });
    }
  }

  // 5. encounters (spatial hash, so 150+ nodes stay fast)
  w.recentEncounters = [];
  if (!frozen && cfg.policy !== "towers") {
    const cell = cfg.encounterRange;
    const grid = new Map<number, number[]>();
    const key = (cx: number, cy: number) => cx * 100003 + cy;
    for (const n of w.nodes) {
      if (!n.alive) continue;
      const k = key(Math.floor(n.x / cell), Math.floor(n.y / cell));
      let b = grid.get(k);
      if (!b) grid.set(k, (b = []));
      b.push(n.idx);
    }
    const cooldown = Math.round(60 / dt); // same pair meets at most once a minute
    for (const n of w.nodes) {
      if (!n.alive) continue;
      const cx = Math.floor(n.x / cell);
      const cy = Math.floor(n.y / cell);
      for (let ox = -1; ox <= 1; ox++)
        for (let oy = -1; oy <= 1; oy++) {
          const b = grid.get(key(cx + ox, cy + oy));
          if (!b) continue;
          for (const j of b) {
            if (j <= n.idx) continue;
            const m = w.nodes[j];
            if (Math.hypot(m.x - n.x, m.y - n.y) > cfg.encounterRange) continue;
            const last = n.lastMeet.get(j);
            if (last !== undefined && w.tick - last < cooldown) continue;
            n.lastMeet.set(j, w.tick);
            const r = encounter(n.state, m.state, now, cfg.policy);
            w.metrics.transfers += r.transfers;
            w.metrics.drops += r.drops;
            if (r.transfers > 0) w.recentEncounters.push([n.idx, j]);
          }
        }
    }
  }

  // 6. timeline sample every 15 simulated minutes
  if (w.tick % Math.round(900 / dt) === 0) {
    const s = summarize(w);
    w.metrics.timeline.push({ hour: (w.tick * dt) / 3600, delivered: s.delivery, sos: s.sosUrgentDelivery, created: s.created });
  }
  w.tick++;
}

export interface Summary {
  created: number;
  delivered: number;
  delivery: number; // 0..1
  sosUrgentDelivery: number; // 0..1, priority 3 only
  sosDelivery: number; // all SOS
  medianDelayMin: number | null;
  urgentMedianDelayMin: number | null;
  copiesPerDelivered: number;
  drops: number;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function summarize(w: World): Summary {
  const { created, delivered } = w.metrics;
  let sos = 0, sosD = 0, urg = 0, urgD = 0;
  const delays: number[] = [];
  const urgDelays: number[] = [];
  for (const [id, c] of created) {
    const d = delivered.get(id);
    if (c.kind === "sos") {
      sos++;
      if (d !== undefined) sosD++;
    }
    if (c.priority === 3) {
      urg++;
      if (d !== undefined) {
        urgD++;
        urgDelays.push(((d - c.tick) * w.cfg.tickSec) / 60);
      }
    }
    if (d !== undefined) delays.push(((d - c.tick) * w.cfg.tickSec) / 60);
  }
  const n = created.size;
  return {
    created: n,
    delivered: delivered.size,
    delivery: n ? delivered.size / n : 0,
    sosUrgentDelivery: urg ? urgD / urg : 0,
    sosDelivery: sos ? sosD / sos : 0,
    medianDelayMin: median(delays),
    urgentMedianDelayMin: median(urgDelays),
    copiesPerDelivered: delivered.size ? w.metrics.transfers / delivered.size : 0,
    drops: w.metrics.drops,
  };
}

export const UNLIMITED_COPIES = UNLIMITED;
