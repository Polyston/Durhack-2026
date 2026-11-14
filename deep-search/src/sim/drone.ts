import type { Config, DroneState, Knowledge } from './types';
export const point=(cell:number,W:number)=>({x:cell%W,y:Math.floor(cell/W)});
export const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
export function choose(d:DroneState,k:Knowledge,cfg:Config,tick:number,useIntents=true):number {
 let best=-1,target=0;
 const intents=useIntents?[...k.peerIntents.values()].filter(i=>i.droneId!==d.id).map(i=>({p:point(i.target,cfg.W),f:Math.exp(-(tick-i.tick)/50)})):[];
 // Rotating traversal gives each drone a deterministic tie break.
 for(let n=0;n<k.weights.length;n++) { const c=(n+d.id*397)%k.weights.length,p=point(c,cfg.W); let claimed=0;
 for(const i of intents) if(distance(p,i.p)<=3) claimed=Math.max(claimed,i.f);
 const score=k.weights[c]*cfg.pDetect/(1+0.15*distance(d.pos,p))*(1-0.8*claimed);
 if(score>best) {best=score;target=c;}
 } return target;
}
export function needsTarget(d:DroneState,W:number,tick:number) {return d.target===null||distance(d.pos,point(d.target,W))===0||tick-d.lastPick>=20;}
