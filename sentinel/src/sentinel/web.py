"""A tiny live dashboard. Stdlib http.server only, so it needs no extra install.

Shows the camera frame, a big state banner, the rules, and the event log. Judges
watch this while you hold a hazard up to the camera.
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sentinel</title><style>
:root{--bg:#10140f;--panel:#1a2017;--line:#2c3626;--ink:#e8ede2;--mut:#93a088;--ok:#3ec46d;--warn:#e7a92b;--alarm:#f04a36}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 ui-sans-serif,system-ui,sans-serif}
header{display:flex;align-items:baseline;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line)}
h1{font-size:1.3rem;margin:0;letter-spacing:.04em}header span{color:var(--mut);font-size:.9rem}
.wrap{display:grid;grid-template-columns:1fr 340px;gap:18px;padding:18px 20px;max-width:1180px;margin:0 auto}
@media(max-width:860px){.wrap{grid-template-columns:1fr}}
.feed{position:relative;border-radius:12px;overflow:hidden;background:#000;aspect-ratio:4/3;border:1px solid var(--line)}
.feed img{width:100%;height:100%;object-fit:cover;display:block}
.banner{position:absolute;inset:auto 0 0 0;padding:14px 18px;font-weight:800;font-size:1.5rem;letter-spacing:.06em;color:#0c0f0a}
.scene{position:absolute;inset:0 0 auto 0;padding:10px 14px;background:linear-gradient(#000a,#0000);font-size:.9rem}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:16px}
.card h2{font-size:.8rem;text-transform:uppercase;letter-spacing:.1em;color:var(--mut);margin:0 0 10px}
.rule{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--line)}
.rule:first-of-type{border-top:0}.rule .tag{font-size:.7rem;font-weight:700;padding:2px 7px;border-radius:5px;flex:none;margin-top:2px}
.rule.on{color:#fff}.rule.off .tag{background:#2c3626;color:var(--mut)}
.tag.WARN{background:var(--warn);color:#201700}.tag.ALARM{background:var(--alarm);color:#2a0600}
.rule .reason{display:block;color:var(--mut);font-size:.82rem}
.log{list-style:none;margin:0;padding:0;max-height:300px;overflow:auto;font-size:.85rem}
.log li{display:grid;grid-template-columns:4.5em 4em 1fr;gap:8px;padding:6px 0;border-top:1px solid var(--line)}
.log .s{font-weight:700}.s.OK{color:var(--ok)}.s.WARN{color:var(--warn)}.s.ALARM{color:var(--alarm)}
.dim{color:var(--mut)}
</style></head><body>
<header><h1>SENTINEL</h1><span id="sub">sense → analyse → decide → act</span></header>
<div class="wrap">
  <div>
    <div class="feed"><div class="scene" id="scene"></div><img id="frame" alt="camera"><div class="banner" id="banner">—</div></div>
  </div>
  <div>
    <div class="card"><h2>Rules</h2><div id="rules"></div></div>
    <div class="card"><h2>Events</h2><ul class="log" id="log"></ul></div>
  </div>
</div>
<script>
const C={OK:'#3ec46d',WARN:'#e7a92b',ALARM:'#f04a36'};
async function tick(){
 try{
  const s=await (await fetch('/state')).json();
  document.getElementById('frame').src='/frame.jpg?'+Date.now();
  const b=document.getElementById('banner');b.textContent=s.state;b.style.background=C[s.state];
  document.getElementById('scene').textContent=s.scene||'';
  document.getElementById('sub').textContent=`camera ${s.camera} · vision ${s.vision} · cycle ${s.cycles}`;
  const act=new Set(s.active.map(a=>a.id));
  document.getElementById('rules').innerHTML=s.rules.map(r=>{
   const on=act.has(r.id);const a=s.active.find(x=>x.id===r.id);
   return `<div class="rule ${on?'on':'off'}"><span class="tag ${r.severity}">${r.severity}</span>
     <span>${r.watch}${on?`<span class="reason">${(a&&a.reason)||'triggered'}</span>`:''}</span></div>`;}).join('');
  document.getElementById('log').innerHTML=s.log.map(e=>`<li><span class="dim">${e.time}</span>
     <span class="s ${e.state}">${e.state}</span><span>${e.scene||(e.alerts[0]&&e.alerts[0].watch)||''}</span></li>`).join('');
 }catch(e){}
}
setInterval(tick,1000);tick();
</script></body></html>"""


def make_handler(runner):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass  # quiet

        def _send(self, code, ctype, body: bytes):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == "/":
                self._send(200, "text/html; charset=utf-8", PAGE.encode())
            elif self.path.startswith("/frame.jpg"):
                jpeg, _, _ = runner.snapshot()
                self._send(200, "image/jpeg", jpeg or b"")
            elif self.path == "/state":
                _, d, cycles = runner.snapshot()
                body = json.dumps(
                    {
                        "state": d.state.label,
                        "scene": d.scene,
                        "cycles": cycles,
                        "camera": runner.cfg.camera.source,
                        "vision": runner.cfg.vision.backend,
                        "rules": [{"id": r.id, "severity": r.severity.label, "watch": r.description} for r in runner.cfg.rules],
                        "active": [{"id": a.rule.id, "reason": a.reason} for a in d.active],
                        "log": list(runner.log.recent)[:20],
                    }
                ).encode()
                self._send(200, "application/json", body)
            else:
                self._send(404, "text/plain", b"not found")

    return H


def start_web(runner, port: int) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer(("0.0.0.0", port), make_handler(runner))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f"dashboard: http://localhost:{port}  (open on the same network)")
    return server
