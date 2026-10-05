"""Prueft das Kopieren an mehreren Geraeten und dass Ziehen weiter funktioniert.

   Aufruf: python tools/kopier-viele.py [vorlage]
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

import importlib.util  # noqa: E402
spec = importlib.util.spec_from_file_location("ke", HIER / "tools" / "kopier-echt.py")
ke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ke)  # nutzt nur die Helfer (freier_port, seite_auf, Leise, EDGE)

import cdp  # noqa: E402


def main():
    vorlage = sys.argv[1] if len(sys.argv) > 1 else "praxis"
    server = browser = profil = None
    try:
        port = ke.freier_port()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(ke.Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        edge = next((p for p in ke.EDGE if p.exists()), None)
        profil = Path(tempfile.mkdtemp(prefix="labor-viele-"))
        dport = ke.freier_port()
        browser = subprocess.Popen([str(edge), "--headless=new", f"--remote-debugging-port={dport}",
                                    f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                                    "--disable-extensions", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws = cdp.WS(ke.seite_auf(dport))
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        ws.rufen("Browser.grantPermissions", {"permissions": ["clipboardReadWrite", "clipboardSanitizedWrite"]})
        ws.rufen("Emulation.setDeviceMetricsOverride", {"width": 1366, "height": 768, "deviceScaleFactor": 1, "mobile": False})

        def js(ausdruck, geste=True):
            r = ws.rufen("Runtime.evaluate", {"expression": f"(async () => ({ausdruck}))()",
                                              "awaitPromise": True, "returnByValue": True, "userGesture": geste})
            if "exceptionDetails" in r:
                raise RuntimeError(str(r["exceptionDetails"])[:300])
            return r["result"].get("value")

        ws.rufen("Page.navigate", {"url": f"http://127.0.0.1:{port}/index.html"})
        time.sleep(3)
        js(f"""(async () => {{
          for (let i = 0; i < 50 && !(typeof Spiel !== 'undefined' && Spiel.st); i++) await new Promise(r => setTimeout(r, 100));
          Spiel.neu(); store.sofort();
          UI.labor.laden(DATEN.beispiele.{vorlage}(), {{titel: 'Kopieren', sandbox: true}});
          await new Promise(r => setTimeout(r, 1500));
          if (UI.ebenen && UI.ebenen.setzen) UI.ebenen.setzen('ip');
          await new Promise(r => setTimeout(r, 1200));
          return true;
        }})()""")

        felder = js("""(() => [...document.querySelectorAll('.lb-svg text.ger-ip.kopierbar')].map(el => {
          const g = el.closest('g.ger');
          const b = el.getBBox(), m = el.getScreenCTM();
          const links = m.a * b.x + m.c * b.y + m.e, oben = m.b * b.x + m.d * b.y + m.f;
          return {geraet: g.getAttribute('data-id'), text: el.firstChild.textContent,
                  x: Math.round(links + b.width * Math.hypot(m.a, m.b) / 2),
                  y: Math.round(oben + b.height * Math.hypot(m.c, m.d) / 2)};
        }))()""")
        print(f"{len(felder)} anklickbare Adressfelder\n")
        treffer = 0
        for f in felder:
            erwartet = str(f["text"]).split(" ")[0].split("/")[0]
            for art in ("mouseMoved", "mousePressed", "mouseReleased"):
                ws.rufen("Input.dispatchMouseEvent", {"type": art, "x": f["x"], "y": f["y"], "button": "left",
                                                      "buttons": 1 if art == "mousePressed" else 0,
                                                      "clickCount": 1, "pointerType": "mouse"})
                time.sleep(0.06)
            time.sleep(0.7)
            inhalt = js("navigator.clipboard.readText().catch(e => 'LESEFEHLER')", geste=False)
            ok = inhalt == erwartet
            treffer += ok
            print(f"  {'ok  ' if ok else 'FEHL'} {f['geraet']:12s} angezeigt {f['text']!r:22s} kopiert {inhalt!r}")
        print(f"\n{treffer}/{len(felder)} richtig kopiert")

        # Gegenprobe: Ziehen eines Geraets muss weiter funktionieren (nicht das Adressfeld treffen).
        vorher = js("UI.labor.pos('srv')")
        js("""(() => {
          const el = [...document.querySelectorAll('.lb-svg g.ger')].find(g => g.getAttribute('data-id') === 'srv');
          const r = el.querySelector('.ger-treffer').getBoundingClientRect();
          window.__zieh = {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 20)};
          return true;
        })()""", geste=False)
        z = js("window.__zieh", geste=False)
        ws.rufen("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": z["x"], "y": z["y"], "button": "none", "buttons": 0})
        ws.rufen("Input.dispatchMouseEvent", {"type": "mousePressed", "x": z["x"], "y": z["y"], "button": "left", "buttons": 1, "clickCount": 1})
        for schritt in range(1, 7):
            ws.rufen("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": z["x"] + schritt * 8, "y": z["y"] + schritt * 4,
                                                  "button": "left", "buttons": 1})
            time.sleep(0.05)
        ws.rufen("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": z["x"] + 48, "y": z["y"] + 24, "button": "left", "buttons": 0, "clickCount": 1})
        time.sleep(0.6)
        nachher = js("UI.labor.pos('srv')", geste=False)
        bewegt = vorher and nachher and (abs(nachher["x"] - vorher["x"]) > 4 or abs(nachher["y"] - vorher["y"]) > 4)
        print(f"Ziehen: vorher {vorher} → nachher {nachher} → {'funktioniert' if bewegt else 'UNVERAENDERT (Problem?)'}")
        return 0 if treffer == len(felder) and bewegt else 1
    finally:
        if browser:
            browser.terminate()
        if server:
            server.shutdown()
        if profil:
            shutil.rmtree(profil, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
