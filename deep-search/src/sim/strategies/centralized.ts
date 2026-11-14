import type {WorldState} from '../types';
import {choose,needsTarget} from '../drone';
import {missing,send,connected} from '../comms';
export function centralized(w:WorldState) {
 if(!w.mothership.alive||w.tick%5!==0)return;
 for(const d of w.drones) {if(!connected(w,d.id,-1))continue;
 const records=missing(d,[...w.mothership.knownSeq]);if(records.length)send(w,d.id,-1,{kind:'records',from:d.id,records});
 if(!needsTarget(d,w.cfg.W,w.tick))continue;
 const target=choose(d,w.mothership,w.cfg,w.tick);w.mothership.peerIntents.set(d.id,{droneId:d.id,target,tick:w.tick});send(w,-1,d.id,{kind:'target',from:-1,target});
 }
}
