import {mkdir,writeFile} from 'node:fs/promises';
import {createWorld,step,defaults} from '../src/sim/world';
import {metrics} from '../src/sim/metrics';
import type {Config} from '../src/sim/types';
const seeds=Number(process.env.SEEDS??50);
if(!Number.isInteger(seeds)||seeds<1)throw Error('SEEDS must be a positive integer');
const rows:unknown[]=[],failure:unknown[]=[],runs:unknown[]=[];
function quantile(a:number[],q:number){const pos=(a.length-1)*q,lo=Math.floor(pos);return a[lo]+(a[Math.ceil(pos)]-a[lo])*(pos-lo);}
function batch(strategy:Config['strategy'],packetLoss:number,kill=false){const samples=[];
 for(let seed=1;seed<=seeds;seed++){const w=createWorld({strategy,packetLoss,seed:String(seed),signing:false});while(!w.found&&w.tick<w.cfg.maxTicks){if(kill&&w.tick===200)w.mothership.alive=false;step(w);}const result=metrics(w);samples.push(result);runs.push({strategy,packetLoss,seed,scenario:kill?'hub-killed':'normal',...result});}
 const times=samples.map(s=>s.timeToFind).sort((a,b)=>a-b);const row={strategy,packetLoss,median:quantile(times,.5),q25:quantile(times,.25),q75:quantile(times,.75),successRate:samples.filter(s=>s.found).length/seeds,redundancy:samples.reduce((s,x)=>s+x.redundancy,0)/seeds};console.log(JSON.stringify({scenario:kill?'hub-killed':'normal',...row}));return row;}
for(const strategy of ['ours','centralized','nocomm'] as const)for(let loss=0;loss<10;loss++)rows.push(batch(strategy,loss/10));
for(const strategy of ['ours','centralized'] as const)for(const loss of [0,.7])failure.push(batch(strategy,loss,true));
await mkdir('public',{recursive:true});await writeFile('public/results.json',JSON.stringify({generatedAt:new Date().toISOString(),seeds,config:defaults,method:'Paired seeds, separate placement/sensing/communications RNG streams. Unfound runs censored at maxTicks. No parameter tuning after measurement.',rows,failure,runs},null,2));
