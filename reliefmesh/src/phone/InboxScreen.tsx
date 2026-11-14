import { useApp } from "./state";
import { UNLIMITED, type Packet } from "../core/types";
import { describePayment } from "../solana/offlineTx";
import { parseSos } from "../solana/sos";
import { IconPin } from "./Icons";

const KIND = ["Status", "Payment", "SOS", "Urgent SOS"];

function PacketRow({ p, mine }: { p: Packet; mine: boolean }) {
  const age = Math.round((Date.now() - p.createdAt) / 60000);
  let body = "";
  let loc: string | null = null;
  if (p.kind === "sos") {
    const s = parseSos(p.payload);
    body = s?.text ?? "";
    if (s?.lat != null && s.lng != null) loc = `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`;
  } else {
    const d = describePayment(p.payload);
    body = d ? `${d.sol} SOL to ${d.to.slice(0, 4)}…${d.to.slice(-4)}${d.note ? `, ${d.note}` : ""}` : "Payment";
  }
  return (
    <li className={`packet p${p.priority}`}>
      <div className="kind">{KIND[p.priority]}</div>
      <div className="body">{body}</div>
      <div className="meta">
        <span>{mine ? "Yours" : `From ${p.origin.slice(0, 4)}…${p.origin.slice(-4)}`}</span>
        <span>{age < 1 ? "Just now" : `${age} min ago`}</span>
        <span>{p.copiesLeft === UNLIMITED ? "Spreads to everyone" : `${p.copiesLeft} ${p.copiesLeft === 1 ? "copy" : "copies"} left to hand out`}</span>
        {loc && <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><IconPin />{loc}</span>}
      </div>
    </li>
  );
}

export function InboxScreen({ onCompose, onScan }: { onCompose: () => void; onScan: () => void }) {
  const { nodeState, rev } = useApp();
  void rev;
  if (!nodeState) return null;
  const packets = [...nodeState.packets.values()].sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  const gp = nodeState.gatewayPredictability;

  return (
    <>
      <div className="ledger">
        <div><span className="num">{packets.length}</span><span>carrying</span></div>
        <div><span className="num">{nodeState.acks.size}</span><span>known delivered</span></div>
        <div>
          <span className="num">{Math.round(gp * 100)}%</span>
          <span>closeness to internet</span>
          <div className="meter" aria-hidden><i style={{ width: `${gp * 100}%` }} /></div>
        </div>
      </div>

      {packets.length === 0 ? (
        <div className="empty">
          <div className="h3">Nothing to carry yet</div>
          <p className="note">Write an SOS or payment, or receive packets from a phone nearby.</p>
          <div className="btns" style={{ marginTop: 12 }}>
            <button className="btn" onClick={onCompose}>Write a message</button>
            <button className="btn quiet" onClick={onScan}>Receive from a phone</button>
          </div>
        </div>
      ) : (
        <ul className="packets">
          {packets.map((p) => <PacketRow key={p.id} p={p} mine={p.origin === nodeState.id} />)}
        </ul>
      )}
    </>
  );
}
