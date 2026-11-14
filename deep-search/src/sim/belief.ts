import type { Knowledge, ScanRecord, WorldState } from './types';
export function knowledge(prior:Float64Array):Knowledge { return {sourceRecords:[],records:new Map(),knownSeq:new Map(),misses:new Int32Array(prior.length),weights:prior.slice(),peerIntents:new Map()}; }
export const recordId=(r:ScanRecord)=>`${r.droneId}:${r.seq}`;
export function merge(k:Knowledge, r:ScanRecord, w:WorldState):boolean {
 if(k.records.has(recordId(r))) return false;
 if(!Number.isInteger(r.droneId)||r.droneId<0||r.droneId>=w.cfg.numDrones||!Number.isInteger(r.seq)||r.seq<0||!Number.isInteger(r.cell)||r.cell<0||r.cell>=w.prior.length||!Number.isInteger(r.tick)||r.tick<0||r.tick>w.tick||typeof r.found!=='boolean'||(w.cfg.signing&&!w.security?.verify(r))) {w.rejected++;return false;}
 k.records.set(recordId(r),r);
 (k.sourceRecords[r.droneId]??=[])[r.seq]=r;
 if(!r.found) { k.misses[r.cell]++; k.weights[r.cell]*=1-w.cfg.pDetect; }
 let seq=k.knownSeq.get(r.droneId)??-1;
 while(k.records.has(`${r.droneId}:${seq+1}`)) seq++;
 k.knownSeq.set(r.droneId,seq); return true;
}
export function belief(k:Knowledge):Float64Array { const b=k.weights.slice(); const sum=b.reduce((a,v)=>a+v,0); if(sum>0) for(let i=0;i<b.length;i++) b[i]/=sum; return b; }
