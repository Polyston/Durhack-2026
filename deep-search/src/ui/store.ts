import {create} from 'zustand';
import {createWorld,step,log,setStrategy} from '../sim/world';
import {createSecurity} from '../solana/keys';
import {Settlement} from '../solana/client';
import type {WorldState,Config} from '../sim/types';
let identity=createSecurity(6),settlement:Settlement|null=null;
interface Store {world:WorldState;version:number;running:boolean;selected:number;live:boolean;transactions:string[];balances:{operator:number;authority:number}|null;error:string; advance:()=>void;toggle:()=>void;reset:(seed?:string)=>void;select:(id:number)=>void;configure:(c:Partial<Config>)=>void;kill:()=>void;killHub:()=>void;storm:()=>void;surface:()=>void;enableLive:()=>void;refreshBalance:()=>Promise<void>;}
export const useStore=create<Store>((set,get)=>({world:createWorld({signing:true},identity.security),version:0,running:false,selected:0,live:false,transactions:[],balances:null,error:'',
 advance:()=>{const w=get().world;const before=w.found;step(w);set({version:get().version+1,running:!!w.found||w.tick>=w.cfg.maxTicks?false:get().running});if(!before&&w.found){get().surface();}else if(w.tick%300===0&&get().live)get().surface();},
 toggle:()=>set({running:!get().running}),select:selected=>set({selected}),
 reset:(seed)=>{settlement?.dispose();identity=createSecurity(6);settlement=null;set({world:createWorld({...get().world.cfg,seed:seed??get().world.cfg.seed},identity.security),version:0,running:false,live:false,transactions:[],error:''});},
 configure:c=>{const w=get().world;if(c.strategy)setStrategy(w,c.strategy);Object.assign(w.cfg,c);set({version:get().version+1});},
 kill:()=>{const w=get().world,d=w.drones[get().selected];d.alive=false;log(w,`Drone ${d.id+1} lost. Peers retain only previously received records.`);set({version:get().version+1});},
 killHub:()=>{const w=get().world;w.mothership.alive=false;log(w,'Mothership offline. Decentralized drones remain autonomous.');set({version:get().version+1});},
 storm:()=>{const w=get().world;w.stormUntil=w.tick+300;log(w,'Storm started: acoustic blackout for 300 ticks (30 seconds at normal speed).');set({version:get().version+1});},
 surface:()=>{const w=get().world;if(!get().live||!settlement){log(w,'Signed records retained offline. Enable devnet and fund the displayed wallets to settle.');set({version:get().version+1});return;}
 for(const d of w.drones.filter(d=>d.alive)){const records=[...d.records.values()].filter(r=>r.droneId===d.id);if(records.length)settlement.enqueue(identity.keys.get(d.id)!,records,w.found?.by===d.id);}},
 enableLive:()=>{if(!settlement)settlement=new Settlement(message=>set(s=>({transactions:[message,...s.transactions].slice(0,100)})),`${get().world.cfg.seed}-${Date.now()}`);set({live:true});void get().refreshBalance();},
 refreshBalance:async()=>{try{settlement??=new Settlement(message=>set(s=>({transactions:[message,...s.transactions]})),`${get().world.cfg.seed}-${Date.now()}`);set({balances:await settlement.balances(),error:''});}catch(e){set({error:e instanceof Error?e.message:String(e)});}}
}));
export function walletAddresses(){return settlement?{operator:settlement.operator.publicKey.toBase58(),authority:settlement.authority.publicKey.toBase58()}:null;}

export function coverageReceipts(){return settlement?.receipts??[];}
