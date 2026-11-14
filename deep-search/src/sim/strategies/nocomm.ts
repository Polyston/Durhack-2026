import type {WorldState} from '../types';
import {choose,needsTarget} from '../drone';
export function nocomm(w:WorldState) {for(const d of w.drones)if(d.alive&&needsTarget(d,w.cfg.W,w.tick)){d.target=choose(d,d,w.cfg,w.tick,false);d.lastPick=w.tick;}}
