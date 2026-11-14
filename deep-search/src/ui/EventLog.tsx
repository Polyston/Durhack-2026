import {useStore} from './store';
function Entry({text}:{text:string}){const match=text.match(/https:\/\/explorer\.solana\.com\/tx\/[^ ]+/);return <li>{match?<>{text.slice(0,match.index)}<a href={match[0]} target="_blank" rel="noreferrer">View transaction ↗</a></>:text}</li>;}
export function EventLog(){const {world,transactions}=useStore();return <section className="events"><h2>Mission events</h2><ol aria-live="polite">{[...transactions,...world.events.slice().reverse()].map((text,i)=><Entry key={i} text={text}/>)}</ol></section>;}
