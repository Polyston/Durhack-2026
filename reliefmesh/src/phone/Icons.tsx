// Small line icons drawn for ReliefMesh (stroke = currentColor).
const P = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconInbox = () => (
  <svg {...P}><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 3h6l1-3h5" /></svg>
);
export const IconNew = () => (
  <svg {...P}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconShare = () => (
  <svg {...P}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v1M14 20h1M18 18h3v3" /></svg>
);
export const IconScan = () => (
  <svg {...P}><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" /><path d="M4 12h16" /></svg>
);
export const IconUplink = () => (
  <svg {...P}><path d="M12 21V11" /><circle cx="12" cy="9" r="2" /><path d="M7.8 13.2a6 6 0 010-8.4M16.2 4.8a6 6 0 010 8.4M5 16a10 10 0 010-14M19 2a10 10 0 010 14" /></svg>
);
export const IconBoard = () => (
  <svg {...P}><path d="M4 4h16v12H4zM8 20h8M12 16v4" /><path d="M8 9h8M8 12h5" /></svg>
);
export const IconGear = () => (
  <svg {...P}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
);
export const IconPin = () => (
  <svg {...P} width={18} height={18}><path d="M12 21s-6-5.6-6-11a6 6 0 0112 0c0 5.4-6 11-6 11z" /><circle cx="12" cy="10" r="2" /></svg>
);
