import {AnchorProvider,Program,BN,type Idl} from '@coral-xyz/anchor';
import {PublicKey,Keypair,Transaction,SystemProgram} from '@solana/web3.js';
import {connection} from '../src/solana/client';
import {merkleRoot} from '../src/solana/merkle';
import {verifyRecord} from '../src/solana/keys';
import type {ScanRecord} from '../src/sim/types';
// Optional Anchor upgrade: supply the real deployed Playground IDL. Never invent a program ID.
export function anchorClient(idl:Idl,operator:Keypair){
 const wallet={publicKey:operator.publicKey,signTransaction:async<T extends Transaction>(tx:T)=>{tx.partialSign(operator);return tx;},signAllTransactions:async<T extends Transaction>(txs:T[])=>{txs.forEach(t=>t.partialSign(operator));return txs;}};
 const provider=new AnchorProvider(connection,wallet as AnchorProvider['wallet'],{commitment:'confirmed'});
 return new Program(idl,provider);
}
export function searchAddress(program:PublicKey,authority:PublicKey,id:number){return PublicKey.findProgramAddressSync([Buffer.from('search'),authority.toBuffer(),new BN(id).toArrayLike(Buffer,'le',8)],program)[0];}
export async function createSearch(program:Program,authority:Keypair,id:number,drones:PublicKey[],bounty:number){const search=searchAddress(program.programId,authority.publicKey,id);await program.methods.createSearch(new BN(id),drones,new BN(bounty)).accounts({search,authority:authority.publicKey,systemProgram:SystemProgram.programId}).signers([authority]).rpc();return search;}
export async function submitCoverage(program:Program,search:PublicKey,drone:Keypair,operator:PublicKey,index:number,records:ScanRecord[],tick:number){const commit=PublicKey.findProgramAddressSync([Buffer.from('commit'),search.toBuffer(),new BN(index).toArrayLike(Buffer,'le',4)],program.programId)[0];return program.methods.submitCoverage([...merkleRoot(records)],records.length,new BN(tick)).accounts({search,commit,drone:drone.publicKey,operator,systemProgram:SystemProgram.programId}).signers([drone]).rpc();}
export async function claimBounty(program:Program,search:PublicKey,drone:Keypair,operator:PublicKey,r:ScanRecord){if(!r.found||!verifyRecord(r,drone.publicKey.toBytes()))throw Error('Signed detection required');return program.methods.claimBounty(r.cell,new BN(r.tick)).accounts({search,drone:drone.publicKey,operator}).signers([drone]).rpc();}
