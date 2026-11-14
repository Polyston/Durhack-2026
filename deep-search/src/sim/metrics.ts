import type {WorldState} from './types';
export function metrics(w:WorldState){return {timeToFind:w.found?.tick??w.cfg.maxTicks,found:!!w.found,coverage:100*w.coveredMass,redundancy:w.scans?100*w.redundant/w.scans:0,scans:w.scans};}
