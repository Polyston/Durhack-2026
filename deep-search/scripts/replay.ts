import {writeFile} from 'node:fs/promises';
import {createWorld,step,setStrategy} from '../src/sim/world';
import {belief} from '../src/sim/belief';
import {metrics} from '../src/sim/metrics';
const frames=[];
for(const strategy of ['ours','centralized'] as const){const w=createWorld({strategy,seed:'10',packetLoss:.7});for(let tick=0;tick<1000&&!w.found;tick++){if(tick===80)w.mothership.alive=false;if(tick===120)w.stormUntil=420;step(w);if(tick%3===0||w.found)frames.push({strategy,tick:w.tick,storm:w.tick<=w.stormUntil,hub:w.mothership.alive,found:w.found,box:w.found?w.boxCell:null,belief:[...belief(w.drones[0])],drones:w.drones.map(d=>({id:d.id,pos:d.pos})),metrics:metrics(w)});}}
await writeFile('docs/replay.json',JSON.stringify(frames));console.log(`${frames.length} replay frames written`);
