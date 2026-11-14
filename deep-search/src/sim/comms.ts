import type { WorldState, Message, Knowledge, Envelope } from './types';
import { distance } from './drone';
import { merge } from './belief';
export function connected(w:WorldState,a:number,b:number) { const x=a===-1?w.mothership:w.drones[a],y=b===-1?w.mothership:w.drones[b]; return x.alive&&y.alive&&w.tick>w.stormUntil&&distance(x.pos,y.pos)<=(a===-1||b===-1?25:w.cfg.commRange); }
export function send(w:WorldState,from:number,to:number,message:Envelope['message']) { if(connected(w,from,to)&&w.random()>=w.cfg.packetLoss) {w.queue.push({to,at:w.tick+1,message});w.links.push([from,to]);} }
export function missing(k:Knowledge,known:[number,number][]) {
 const vv=new Map(known),cursors=k.sourceRecords.map((_,id)=>(vv.get(id)??-1)+1),out=[];
 while(out.length<200){let pick=-1,min=Infinity;
 for(let id=0;id<k.sourceRecords.length;id++){const a=k.sourceRecords[id];if(!a)continue;while(cursors[id]<a.length&&!a[cursors[id]])cursors[id]++;if(cursors[id]<a.length&&cursors[id]<min){min=cursors[id];pick=id;}}
 if(pick<0)break;out.push(k.sourceRecords[pick][cursors[pick]++]);
 }return out;
}
export function deliver(w:WorldState) {
 const due=w.queue.filter(e=>e.at<=w.tick);w.queue=w.queue.filter(e=>e.at>w.tick);
 for(const e of due) {const m=e.message;if(!connected(w,m.from,e.to))continue;const k=e.to===-1?w.mothership:w.drones[e.to];w.delivered++;
 if(m.kind==='records') {for(const r of m.records)merge(k,r,w);}
 else if(m.kind==='target') {const d=w.drones[e.to];d.target=m.target;d.lastPick=w.tick;}
 else {k.peerIntents.set(m.from,m.intent); const records=missing(k,m.knownSeq); if(records.length)send(w,e.to,m.from,{kind:'records',from:e.to,records});}
 }
}
export function gossip(w:WorldState) {
 if(w.tick%5!==0)return;
 for(const a of w.drones.filter(d=>d.alive)) for(const b of w.drones.filter(d=>d.alive&&d.id!==a.id)) {
 const message:Message={kind:'hello',from:a.id,pos:{...a.pos},intent:{droneId:a.id,target:a.target??a.pos.y*w.cfg.W+a.pos.x,tick:w.tick},knownSeq:[...a.knownSeq]};send(w,a.id,b.id,message);
 }
}
