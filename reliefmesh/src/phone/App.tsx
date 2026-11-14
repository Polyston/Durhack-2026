import { useEffect, useState, type ReactNode } from "react";
import { useApp, isOnline } from "./state";
import { SetupScreen } from "./SetupScreen";
import { ComposeScreen } from "./ComposeScreen";
import { ShareScreen } from "./ShareScreen";
import { ScanScreen } from "./ScanScreen";
import { InboxScreen } from "./InboxScreen";
import { GatewayScreen } from "./GatewayScreen";
import { HQBoard } from "./HQBoard";
import { IconBoard, IconGear, IconInbox, IconNew, IconScan, IconShare, IconUplink } from "./Icons";

type Tab = "inbox" | "compose" | "share" | "scan" | "gateway" | "hq" | "setup";
const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "inbox", label: "Carrying", icon: <IconInbox /> },
  { id: "compose", label: "New", icon: <IconNew /> },
  { id: "share", label: "Hand over", icon: <IconShare /> },
  { id: "scan", label: "Receive", icon: <IconScan /> },
  { id: "gateway", label: "Upload", icon: <IconUplink /> },
];

export function PhoneApp() {
  const { loaded, load, keypair, name, toast, nodeState, rev } = useApp();
  const [tab, setTab] = useState<Tab>("inbox");
  const [online, setOnline] = useState(isOnline());
  void rev;

  useEffect(() => {
    load();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);

  // No wallet yet → stay on Setup after creating it, so the user makes offline payment slots next.
  useEffect(() => {
    if (loaded && !keypair) setTab("setup");
  }, [loaded, keypair]);

  if (!loaded) return <div className="phone"><p className="screen">Opening ReliefMesh…</p></div>;
  const current: Tab = keypair ? tab : "setup";
  const carrying = nodeState?.packets.size ?? 0;

  return (
    <div className="phone">
      <div className="topbar">
        <span className="brand">ReliefMesh</span>
        <span className="who">{name}</span>
        {keypair && (
          <>
            <button className="iconbtn" aria-label="Relief HQ board" aria-pressed={current === "hq"} onClick={() => setTab("hq")}><IconBoard /></button>
            <button className="iconbtn" aria-label="Setup" aria-pressed={current === "setup"} onClick={() => setTab("setup")}><IconGear /></button>
          </>
        )}
      </div>
      <div className={`signal ${online ? "on" : "off"}`} role="status">
        <span className="dot" />
        {online ? "Connected: you can upload" : "No signal: packets travel by hand"}
        {nodeState && <span className="count">{carrying} carried</span>}
      </div>

      <main className="screen">
        {current === "setup" && <SetupScreen />}
        {current === "compose" && <ComposeScreen onDone={() => setTab("share")} />}
        {current === "share" && <ShareScreen />}
        {current === "scan" && <ScanScreen onDone={() => setTab("inbox")} />}
        {current === "inbox" && <InboxScreen onCompose={() => setTab("compose")} onScan={() => setTab("scan")} />}
        {current === "gateway" && <GatewayScreen />}
        {current === "hq" && <HQBoard />}
        {current === "setup" && <a className="foot" href="#/sim">Open the city simulation</a>}
      </main>

      {keypair && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} className={t.id} aria-current={current === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
