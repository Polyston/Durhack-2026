import {Keypair} from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import type {ScanRecord,Security} from '../sim/types';
export const droneKeys=new Map<number,Keypair>();
export const recordBytes=(r:ScanRecord)=>new TextEncoder().encode(`${r.droneId}|${r.seq}|${r.cell}|${r.tick}|${r.found?1:0}`);
export const signRecord=(r:ScanRecord,kp:Keypair)=>bs58.encode(nacl.sign.detached(recordBytes(r),kp.secretKey));
export function verifyRecord(r:ScanRecord,pubkey:Uint8Array):boolean{try{return !!r.sig&&nacl.sign.detached.verify(recordBytes(r),bs58.decode(r.sig),pubkey);}catch{return false;}}
export function createSecurity(n:number):{keys:Map<number,Keypair>;security:Security}{const keys=new Map(Array.from({length:n},(_,i)=>[i,Keypair.generate()]));droneKeys.clear();for(const [i,k]of keys)droneKeys.set(i,k);return {keys,security:{sign:r=>signRecord(r,keys.get(r.droneId)!),verify:r=>{const k=keys.get(r.droneId);return !!k&&verifyRecord(r,k.publicKey.toBytes());}}};}
