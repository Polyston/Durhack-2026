import {Connection,Keypair,PublicKey,SystemProgram,Transaction,TransactionInstruction,LAMPORTS_PER_SOL} from '@solana/web3.js';
import type {ScanRecord} from '../sim/types';
import bs58 from 'bs58';
import {merkleRoot,hex} from './merkle';
import {verifyRecord} from './keys';
export const connection=new Connection('https://api.devnet.solana.com','confirmed');
export const explorer=(sig:string)=>`https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export function loadKey(name:string):Keypair {const stored=localStorage.getItem(name);if(stored)return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(stored)));const kp=Keypair.generate();localStorage.setItem(name,JSON.stringify([...kp.secretKey]));return kp;}
export class Settlement {
 readonly receipts:{root:string;records:ScanRecord[];signature:string;drone:string}[]=[];
 operator=loadKey('deep-search-devnet-operator'); authority=loadKey('deep-search-devnet-authority');
 private tail=Promise.resolve(); private committed=new Set<string>(); private claimed=false; private cancelled=false;
 private pending=new Map<string,{tx:Transaction;signature:string;blockhash:string;lastValidBlockHeight:number}>();
 private rpc:Connection; private pauseMs:number;
 constructor(private report:(message:string)=>void,private mission:string,options:{connection?:Connection;pauseMs?:number}={}){this.rpc=options.connection??connection;this.pauseMs=options.pauseMs??3000;}
 dispose(){this.cancelled=true;}
 private async submit(id:string,tx:Transaction,signers:Keypair[]){
 let pending=this.pending.get(id);
 if(!pending){const latest=await this.rpc.getLatestBlockhash();tx.feePayer??=this.operator.publicKey;tx.recentBlockhash=latest.blockhash;tx.sign(...signers);pending={tx,signature:bs58.encode(tx.signature!),...latest};this.pending.set(id,pending);}
 // Retain the signed bytes across uncertain RPC failures: retries cannot pay twice.
 const status=await this.rpc.getSignatureStatuses([pending.signature]);
 if(status.value[0]?.err){this.pending.delete(id);throw Error(`Transaction rejected: ${JSON.stringify(status.value[0].err)}`);}
 if(!['confirmed','finalized'].includes(status.value[0]?.confirmationStatus??'')){
 await this.rpc.sendRawTransaction(pending.tx.serialize());
 this.report(`Submitted; awaiting confirmation: ${explorer(pending.signature)}`);
 const confirmation=await this.rpc.confirmTransaction({signature:pending.signature,blockhash:pending.blockhash,lastValidBlockHeight:pending.lastValidBlockHeight},'confirmed');
 if(confirmation.value.err){this.pending.delete(id);throw Error(`Transaction rejected: ${JSON.stringify(confirmation.value.err)}`);}
 }
 this.pending.delete(id);return pending.signature;
 }
 async balances(){return {operator:(await this.rpc.getBalance(this.operator.publicKey))/LAMPORTS_PER_SOL,authority:(await this.rpc.getBalance(this.authority.publicKey))/LAMPORTS_PER_SOL};}
 enqueue(drone:Keypair,records:ScanRecord[],claim=false){
 const job=async()=>{if(this.cancelled)return;const fresh=records.filter(r=>!this.committed.has(`${r.droneId}:${r.seq}`));
 if(fresh.length){if(!fresh.every(r=>verifyRecord(r,drone.publicKey.toBytes())))throw Error('Invalid drone signature');
 const root=hex(merkleRoot(fresh));const memo=`deepsearch|mission=${this.mission}|drone=${fresh[0].droneId}|root=${root}|n=${fresh.length}`;
 const tx=new Transaction().add(new TransactionInstruction({programId:new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),keys:[{pubkey:drone.publicKey,isSigner:true,isWritable:false}],data:Buffer.from(memo)}));
 const sig=await this.submit(`coverage:${drone.publicKey.toBase58()}:${root}`,tx,[this.operator,drone]);this.receipts.push({root,records:fresh,signature:sig,drone:drone.publicKey.toBase58()});fresh.forEach(r=>this.committed.add(`${r.droneId}:${r.seq}`));this.report(`Coverage confirmed: ${explorer(sig)}`);}
 if(claim&&!this.claimed&&!this.cancelled){const found=records.find(r=>r.found&&verifyRecord(r,drone.publicKey.toBytes()));if(!found)throw Error('Signed detection required');
 const tx=new Transaction().add(SystemProgram.transfer({fromPubkey:this.authority.publicKey,toPubkey:this.operator.publicKey,lamports:1_000_000}));tx.feePayer=this.operator.publicKey;
 const sig=await this.submit('bounty',tx,[this.operator,this.authority]);this.claimed=true;this.report(`Fallback bounty paid (0.001 devnet SOL): ${explorer(sig)}`);}
 };
 this.tail=this.tail.then(async()=>{try{await job();}catch(e){this.report(`Settlement failed; surface to retry: ${e instanceof Error?e.message:String(e)}`);}await new Promise(r=>setTimeout(r,this.pauseMs));});
 return this.tail;
 }
}
