import type {WorldState} from '../types';
import {choose,needsTarget} from '../drone';
import {gossip} from '../comms';
export function ours(w:WorldState) { for(const d of w.drones) if(d.alive&&needsTarget(d,w.cfg.W,w.tick)){d.target=choose(d,d,w.cfg,w.tick);d.lastPick=w.tick;} gossip(w); }
