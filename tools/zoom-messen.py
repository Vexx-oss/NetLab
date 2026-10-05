"""Prueft die Zoom-Staffelung der Beschriftungen: bei welchem Zoom ist was sichtbar?

   Aufruf: python tools/zoom-messen.py [vorlage]
   Erwartung (neu):   100 % alles · 70 % nur Name+IP · 40 % nichts
   Alter Zustand war: 70 % alles sichtbar, aber nur 8,4-9,1 Bildschirm-px (unleserlich).
"""
import json
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
import http.server
from functools import partial
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HIER / "tools"))
import cdp  # noqa: E402

EDGE = [Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe")]


class Leise(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def freier_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def seite_auf(port):
    for _ in range(80):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2) as r:
                for z in json.loads(r.read()):
                    if z.get("type") == "page" and "webSocketDebuggerUrl" in z:
                        return z["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.25)
    raise SystemExit("Browser meldet sich nicht")


MESSUNG = r"""
(() => {
  const svg = document.querySelector('.lb-svg');
  /* Z.view ist nicht veroeffentlicht: den Zoom aus dem Transform der Weltgruppe lesen
     (editor.js:188 setzt dort translate(...) scale(k)). */
  const welt = svg.querySelector('g[transform*="scale"]');
  const k = welt ? +((/scale\(([\d.]+)\)/.exec(welt.getAttribute('transform')) || [])[1] || 0) : 0;
  const zahl = sel => { const e = svg.querySelector(sel); if (!e) return null;
    const cs = getComputedStyle(e); return cs.display === 'none' ? 0 : 1; };
  const px = sel => { const e = svg.querySelector(sel); if (!e) return null;
    const cs = getComputedStyle(e); if (cs.display === 'none') return 0;
    const m = e.getScreenCTM(); const f = m ? Math.hypot(m.a, m.b) : 1;
    return +(parseFloat(cs.fontSize) * f).toFixed(1); };
  return {
    k: +k.toFixed(3),
    klassen: svg.getAttribute('class'),
    sichtbar: {name: zahl('.ger-name'), ip: zahl('.ger-ip'), port: zahl('.kabel-port'), zone: zahl('.zone-text')},
    bildschirmPx: {name: px('.ger-name'), ip: px('.ger-ip'), port: px('.kabel-port'), zone: px('.zone-text')}
  };
})()
"""


def main():
    vorlage = sys.argv[1] if len(sys.argv) > 1 else "praxis"
    server = browser = profil = None
    try:
        port = freier_port()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        edge = next((p for p in EDGE if p.exists()), None)
        if not edge:
            raise SystemExit("Edge nicht gefunden")
        profil = Path(tempfile.mkdtemp(prefix="labor-zoom-"))
        dport = freier_port()
        browser = subprocess.Popen([str(edge), "--headless=new", f"--remote-debugging-port={dport}",
                                    f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                                    "--disable-extensions", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws = cdp.WS(seite_auf(dport))
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        ws.rufen("Emulation.setDeviceMetricsOverride", {"width": 1366, "height": 768, "deviceScaleFactor": 1, "mobile": False})

        def js(ausdruck):
            r = ws.rufen("Runtime.evaluate", {"expression": f"(async () => ({ausdruck}))()",
                                              "awaitPromise": True, "returnByValue": True})
            if "exceptionDetails" in r:
                raise RuntimeError(str(r["exceptionDetails"])[:300])
            return r["result"].get("value")

        ws.rufen("Page.navigate", {"url": f"http://127.0.0.1:{port}/index.html"})
        time.sleep(3)
        js(f"""(async () => {{
          for (let i = 0; i < 50 && !(typeof Spiel !== 'undefined' && Spiel.st); i++) await new Promise(r => setTimeout(r, 100));
          Spiel.neu(); store.sofort();
          UI.labor.laden(DATEN.beispiele.{vorlage}(), {{titel: 'Zoom', sandbox: true}});
          await new Promise(r => setTimeout(r, 1200));
          if (UI.ebenen && UI.ebenen.setzen) UI.ebenen.setzen('ip');
          await new Promise(r => setTimeout(r, 900));
          return true;
        }})()""")
        print(f"Vorlage {vorlage} · Zoomstufen (sichtbar 1/0, Schrift in Bildschirm-px)")
        print(f"{'k':>6}  {'name':>16}  {'ip':>16}  {'port':>16}  {'zone':>16}   Klassen")
        for ziel in [1.0, 0.9, 0.7, 0.55, 0.4]:
            js(f"""(async () => {{
              /* Wie der Rauchtest: echte Mausrad-Ereignisse auf die Flaeche (Zoomstrecke in
                 editor-werkzeuge.js). zoomSchritt ist absichtlich nicht veroeffentlicht. */
              const svg = document.querySelector('.lb-svg');
              const r = svg.getBoundingClientRect();
              const k = () => {{ const w = document.querySelector('.lb-svg g[transform*="scale"]');
                const m = w && /scale\\(([\\d.]+)\\)/.exec(w.getAttribute('transform'));
                return m ? +m[1] : null; }};
              for (let i = 0; i < 60; i++) {{
                const jetzt = k();
                if (jetzt != null && Math.abs(jetzt - {ziel}) < 0.03) break;
                svg.dispatchEvent(new WheelEvent('wheel', {{deltaY: (jetzt != null && jetzt < {ziel}) ? -120 : 120,
                  clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true}}));
                await new Promise(r2 => setTimeout(r2, 60));
              }}
              await new Promise(r2 => setTimeout(r2, 800));
              return true;
            }})()""")
            m = js(MESSUNG)
            s, p = m["sichtbar"], m["bildschirmPx"]
            fmt = lambda a, b: f"{a}/{b if b is not None else '-'}px"
            print(f"{m['k']:>6}  {fmt(s['name'], p['name']):>16}  {fmt(s['ip'], p['ip']):>16}  "
                  f"{fmt(s['port'], p['port']):>16}  {fmt(s['zone'], p['zone']):>16}   {m['klassen']}")
        return 0
    finally:
        if browser:
            browser.terminate()
        if server:
            server.shutdown()
        if profil:
            shutil.rmtree(profil, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
