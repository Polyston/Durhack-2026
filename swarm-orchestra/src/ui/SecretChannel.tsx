// The sound channel: type a message, send it as tones, and decode tones heard on the mic.
// This is the QRT "Hidden in Plain Sight" encoder/decoder, and how nodes talk with the
// network fully down. Isolated from the swarm so it can never break the main demo.

import { useRef, useState } from "react";
import type { AudioEngine } from "../audio/engine";
import { encode, TONES, type DecodeResult } from "../core/codec";
import { MicListener } from "../audio/listener";

export function SecretChannel({ engine }: { engine: AudioEngine }) {
  const [text, setText] = useState("hello durhack");
  const [sentTones, setSentTones] = useState<number[]>([]);
  const [lit, setLit] = useState(-1);
  const [listening, setListening] = useState(false);
  const [received, setReceived] = useState<{ result: DecodeResult; at: string }[]>([]);
  const listenerRef = useRef<MicListener | null>(null);

  const transmit = () => {
    const tones = encode(text.slice(0, 40));
    setSentTones(tones);
    engine.transmit(tones);
  };

  const toggleListen = async () => {
    if (listening) {
      listenerRef.current?.stop();
      listenerRef.current = null;
      setListening(false);
      return;
    }
    const listener = new MicListener({
      onTone: (i) => { setLit(i); setTimeout(() => setLit(-1), 200); },
      onMessage: (result) => setReceived((r) => [{ result, at: new Date().toLocaleTimeString() }, ...r].slice(0, 6)),
    });
    try {
      await listener.start();
      listenerRef.current = listener;
      setListening(true);
    } catch {
      alert("Could not open the microphone. Allow mic access (and use https / localhost).");
    }
  };

  return (
    <div className="panel">
      <h3>Sound channel · talk through the notes</h3>
      <textarea rows={2} value={text} maxLength={40} onChange={(e) => setText(e.target.value)} />
      <div className="ctl" style={{ marginTop: 8 }}>
        <button className="btn small" onClick={transmit}>Send as tones</button>
        <button className={`btn small ${listening ? "on" : ""}`} onClick={toggleListen}>{listening ? "Stop listening" : "Listen"}</button>
      </div>
      {sentTones.length > 0 && (
        <div className="tones" aria-label="sent tones">
          {sentTones.map((t, i) => <i key={i} className={lit === t ? "lit" : ""}>{t.toString(TONES).toUpperCase()}</i>)}
        </div>
      )}
      {listening && (
        <>
          <p className="note">Listening. Point another device running this page at this one and press Send as tones there.</p>
          {received.map((r, i) => (
            <div key={i} className={`decoded ${r.result.ok ? "" : "bad"}`} style={{ marginTop: 8 }}>
              {r.result.ok ? `“${r.result.text}”` : `couldn't read it (${r.result.reason})`} <span className="hint">{r.at}</span>
            </div>
          ))}
        </>
      )}
      <p className="note">Open this page on two phones, mute one, and send a message between them with sound only — no network.</p>
    </div>
  );
}
