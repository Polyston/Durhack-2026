import type {Config,Security,WorldState,ScanRecord} from './types';
import {rng} from './rng';
import {knowledge,merge} from './belief';
import {point,distance} from './drone';
import {deliver} from './comms';
import {ours} from './strategies/ours';
import {centralized} from './strategies/centralized';
import {nocomm} from './strategies/nocomm';
export const defaults:Config={W:60,H:40,numDrones:6,pDetect:0.8,commRange:8,packetLoss:0.1,seed:'deep-search-1',strategy:'ours',maxTicks:3000,signing:false};
export function createWorld(config:Partial<Config>={},security?:Security):WorldState {
 const cfg={...defaults,...config};
 if(!Number.isInteger(cfg.W)||!Number.isInteger(cfg.H)||cfg.W<2||cfg.H<2||cfg.W*cfg.H>100000||!Number.isInteger(cfg.numDrones)||cfg.numDrones<1||cfg.numDrones>8||cfg.pDetect<=0||cfg.pDetect>1||cfg.packetLoss<0||cfg.packetLoss>1||cfg.commRange<0||!Number.isInteger(cfg.maxTicks)||cfg.maxTicks<1)throw Error('Invalid simulation configuration');
 if(cfg.signing&&!security)throw Error('Signing requires registered drone keys');
 const prior=new Float64Array(cfg.W*cfg.H);
 for(let c=0;c<prior.length;c++){const {x,y}=point(c,cfg.W);prior[c]=[[.35,.45,.13,.18,.55],[.65,.6,.19,.12,.3],[.6,.25,.1,.1,.15]].reduce((s,[cx,cy,sx,sy,a])=>s+a*Math.exp(-.5*(((x/cfg.W-cx)/sx)**2+((y/cfg.H-cy)/sy)**2)),0);}
 const sum=prior.reduce((a,b)=>a+b,0);for(let c=0;c<prior.length;c++)prior[c]/=sum;
 const placement=rng(cfg.seed+':placement');let draw=placement(),boxCell=prior.length-1;for(let c=0;c<prior.length;c++){draw-=prior[c];if(draw<=0){boxCell=c;break;}}
 return {cfg,tick:0,prior,boxCell,drones:Array.from({length:cfg.numDrones},(_,id)=>({id,pos:{x:Math.floor(cfg.W/2)+(id%3)-1,y:Math.floor(cfg.H/2)+Math.floor(id/3)-1},alive:true,target:null,battery:100,nextSeq:0,lastPick:-20,trail:[],...knowledge(prior)})),mothership:{pos:{x:Math.floor(cfg.W/2),y:Math.floor(cfg.H/2)},alive:true,...knowledge(prior)},stormUntil:0,found:null,events:['Mission ready. Six independent search actors.'],random:rng(cfg.seed+':comms'),sensing:rng(cfg.seed+':sensor'),queue:[],security,scans:0,redundant:0,visited:new Uint8Array(prior.length),scannedBy:new Uint8Array(prior.length),firstScanner:new Int16Array(prior.length).fill(-1),coveredMass:0,links:[],delivered:0,rejected:0};
}
export function log(w:WorldState,s:string){w.events.push(`[${w.tick}] ${s}`);if(w.events.length>150)w.events.shift();}
export function step(w:WorldState):void {
 if(w.found||w.tick>=w.cfg.maxTicks)return;w.tick++;w.links=[];deliver(w);
 ({ours,centralized,nocomm}[w.cfg.strategy])(w);
 for(const d of w.drones){if(!d.alive||d.target===null)continue;
 if(w.cfg.strategy==='centralized'&&distance(d.pos,point(d.target,w.cfg.W))===0)continue;
 const target=point(d.target,w.cfg.W);d.pos={x:d.pos.x+Math.sign(target.x-d.pos.x),y:d.pos.y+Math.sign(target.y-d.pos.y)};d.trail.push({...d.pos});if(d.trail.length>45)d.trail.shift();
 const cell=d.pos.y*w.cfg.W+d.pos.x,found=cell===w.boxCell&&w.sensing()<w.cfg.pDetect;
 const r:ScanRecord={droneId:d.id,seq:d.nextSeq++,cell,tick:w.tick,found};if(w.cfg.signing)r.sig=w.security!.sign(r);merge(d,r,w);
 w.scans++;if(w.scannedBy[cell]&~(1<<d.id))w.redundant++;w.scannedBy[cell]|=1<<d.id;
 if(!w.visited[cell]){w.visited[cell]=1;w.firstScanner[cell]=d.id;w.coveredMass+=w.prior[cell];}
 if(found){w.found={tick:w.tick,by:d.id};log(w,`Drone ${d.id+1} detected the black box. Signed detection ready to surface.`);break;}
 }
 if(w.tick===w.stormUntil+1&&w.stormUntil>0)log(w,'Storm cleared. Acoustic links restored; record exchange resumes.');
}
export function setStrategy(w:WorldState,strategy:Config['strategy']){w.cfg.strategy=strategy;w.queue=[];for(const d of w.drones){d.target=null;d.peerIntents.clear();}log(w,`Strategy changed to ${strategy}. Existing knowledge retained.`);}
