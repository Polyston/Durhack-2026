import {useEffect,useRef} from 'react';
import {useStore} from './store';
import {belief} from '../sim/belief';
import {point} from '../sim/drone';
export const colors=['#63d8ef','#ffd872','#ef9bba','#a9d67b','#c1acff','#ff9d68'];
export function OceanCanvas(){const canvas=useRef<HTMLCanvasElement>(null);const {world:w,version,selected}=useStore();
 useEffect(()=>{const c=canvas.current!,ctx=c.getContext('2d')!;const scale=16;c.width=w.cfg.W*scale;c.height=w.cfg.H*scale;const b=belief(w.drones[selected]),max=Math.max(...b);
 ctx.fillStyle='#092f43';ctx.fillRect(0,0,c.width,c.height);
 for(let cell=0;cell<b.length;cell++){const p=point(cell,w.cfg.W),v=Math.sqrt(b[cell]/(max||1));ctx.fillStyle=`rgb(${Math.round(9+v*218)},${Math.round(47+v*161)},${Math.round(67+v*49)})`;ctx.fillRect(p.x*scale,p.y*scale,scale-1,scale-1);}
 ctx.font='12px sans-serif';ctx.strokeStyle='#b1d8e522';ctx.fillStyle='#d1e3e9';for(let x=0;x<w.cfg.W;x+=10){ctx.fillText(`${x}`,x*scale+4,14);}
 for(const [a,b]of w.links){const x=a===-1?w.mothership:w.drones[a],y=b===-1?w.mothership:w.drones[b];ctx.strokeStyle='#e4faff80';ctx.beginPath();ctx.moveTo((x.pos.x+.5)*scale,(x.pos.y+.5)*scale);ctx.lineTo((y.pos.x+.5)*scale,(y.pos.y+.5)*scale);ctx.stroke();}
 for(const d of w.drones){const x=(d.pos.x+.5)*scale,y=(d.pos.y+.5)*scale;ctx.strokeStyle=colors[d.id]+'88';ctx.lineWidth=2;ctx.beginPath();d.trail.forEach((p,i)=>i?ctx.lineTo((p.x+.5)*scale,(p.y+.5)*scale):ctx.moveTo((p.x+.5)*scale,(p.y+.5)*scale));ctx.stroke();ctx.fillStyle=d.alive?colors[d.id]:'#6d7a80';ctx.strokeStyle=colors[d.id]+'45';ctx.beginPath();ctx.arc(x,y,w.cfg.commRange*scale,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x,y,d.id===selected?8:5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(`${d.id+1}${d.alive?'':' ×'}`,x+10,y-8);}
 const m=w.mothership;ctx.fillStyle=m.alive?'#ffffff':'#ec6475';ctx.fillRect(m.pos.x*scale-4,m.pos.y*scale-4,10,10);
 if(w.found){const p=point(w.boxCell,w.cfg.W);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(p.x*scale-4,p.y*scale-4,24,24);ctx.fillStyle='#fff';ctx.fillText('Black box located',Math.min(p.x*scale+24,c.width-130),p.y*scale);}
 },[w,version,selected]);
 return <div className="ocean"><canvas ref={canvas} aria-label={`Ocean probability map from drone ${selected+1}. ${w.found?'Black box located.':'Search in progress.'}`}/><div className="map-key"><span>Low probability</span><i/><span>High probability</span><span>□ Mothership</span></div>{w.tick<=w.stormUntil&&w.tick>0&&<div className="storm-banner">Acoustic blackout · {w.stormUntil-w.tick} ticks remaining</div>}</div>;
}
