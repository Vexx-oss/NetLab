"""Klaert, welche Zeigerereignisse bei einem ECHTEN Klick auf dem Adresstext ankommen.

   Aufruf: python tools/zeiger-probe.py [vorlage]
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


def main():
    vorlage = sys.argv[1] if len(sys.argv) > 1 else "praxis"
    server = browser = profil = None
    try:
        port = freier_port()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        edge = next((p for p in EDGE if p.exists()), None)
        profil = Path(tempfile.mkdtemp(prefix="labor-zeiger-"))
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
          UI.labor.laden(DATEN.beispiele.{vorlage}(), {{titel: 'Zeiger', sandbox: true}});
          await new Promise(r => setTimeout(r, 1500));
          if (UI.ebenen && UI.ebenen.setzen) UI.ebenen.setzen('ip');
          await new Promise(r => setTimeout(r, 1200));
          return true;
        }})()""")

        # Alle Zeiger-/Mausereignisse mitschreiben, in der Reihenfolge, in der sie ankommen.
        js("""(() => {
          window.__ev = [];
          const name = e => {
            const t = e.target;
            const k = (t.getAttribute && t.getAttribute('class')) || t.tagName;
            return e.type + '@' + k;
          };
          for (const art of ['pointerdown','pointerup','mousedown','mouseup','click']) {
            document.querySelector('.lb-svg').addEventListener(art, e => window.__ev.push(name(e)), true);
          }
          const el = document.querySelector('.lb-svg text.ger-ip.kopierbar');
          for (const art of ['pointerdown','pointerup','click']) {
            el.addEventListener(art, e => window.__ev.push('TEXT-' + name(e)), true);
          }
          return true;
        })()""")

        lage = js("""(() => {
          const el = document.querySelector('.lb-svg text.ger-ip.kopierbar');
          const b = el.getBBox(), m = el.getScreenCTM();
          const links = m.a * b.x + m.c * b.y + m.e, oben = m.b * b.x + m.d * b.y + m.f;
          return {x: Math.round(links + b.width * Math.hypot(m.a, m.b) / 2),
                  y: Math.round(oben + b.height * Math.hypot(m.c, m.d) / 2)};
        })()""")
        x, y = lage["x"], lage["y"]
        print(f"Klickpunkt: ({x}, {y}) · elementFromPoint:",
              js(f"(document.elementFromPoint({x},{y})||{{}}).getAttribute && document.elementFromPoint({x},{y}).getAttribute('class')"))
        for art in ("mouseMoved", "mousePressed", "mouseReleased"):
            ws.rufen("Input.dispatchMouseEvent", {"type": art, "x": x, "y": y, "button": "left",
                                                  "buttons": 1 if art == "mousePressed" else 0,
                                                  "clickCount": 1, "pointerType": "mouse"})
            time.sleep(0.08)
        time.sleep(0.8)
        print("Ereignisreihenfolge:")
        for e in js("window.__ev"):
            print("   ", e)
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
