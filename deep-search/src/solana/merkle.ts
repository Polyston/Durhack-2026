import {sha256} from '@noble/hashes/sha256';
import bs58 from 'bs58';
import {recordBytes} from './keys';
import type {ScanRecord} from '../sim/types';
export function merkleRoot(records:ScanRecord[]):Uint8Array {
 if(!records.length)throw Error('Cannot commit an empty record set');
 let level=[...records].sort((a,b)=>a.droneId-b.droneId||a.seq-b.seq).map(r=>{if(!r.sig)throw Error('Unsigned record');return sha256(new Uint8Array([...recordBytes(r),...bs58.decode(r.sig)]));});
 while(level.length>1){const next:Uint8Array[]=[];for(let i=0;i<level.length;i+=2)next.push(sha256(new Uint8Array([...level[i],...(level[i+1]??level[i])])));level=next;}return level[0];
}
export const hex=(b:Uint8Array)=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
