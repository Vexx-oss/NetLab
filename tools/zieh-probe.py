"""Prueft, ob Ziehen eines Geraets noch funktioniert - mit Mitschnitt der Zeigerereignisse."""
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import http.server
from functools import partial
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HIER / "tools"))
spec = importlib.util.spec_from_file_location("ke", HIER / "tools" / "kopier-echt.py")
ke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ke)
import cdp  # noqa: E402


def main():
    vorlage = sys.argv[1] if len(sys.argv) > 1 else "praxis"
    server = browser = profil = None
    try:
        port = ke.freier_port()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(ke.Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        edge = next((p for p in ke.EDGE if p.exists()), None)
        profil = Path(tempfile.mkdtemp(prefix="labor-zieh-"))
        dport = ke.freier_port()
        browser = subprocess.Popen([str(edge), "--headless=new", f"--remote-debugging-port={dport}",
                                    f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                                    "--disable-extensions", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws = cdp.WS(ke.seite_auf(dport))
        ws.rufen("Runtime.enable"); ws.rufen("Page.enable")
        ws.rufen("Emulation.setDeviceMetricsOverride", {"width": 1366, "height": 768, "deviceScaleFactor": 1, "mobile": False})

        def js(a, geste=True):
            r = ws.rufen("Runtime.evaluate", {"expression": f"(async () => ({a}))()",
                                              "awaitPromise": True, "returnByValue": True, "userGesture": geste})
            if "exceptionDetails" in r:
                raise RuntimeError(str(r["exceptionDetails"])[:300])
            return r["result"].get("value")

        ws.rufen("Page.navigate", {"url": f"http://127.0.0.1:{port}/index.html"})
        time.sleep(3)
        js(f"""(async () => {{
          for (let i = 0; i < 50 && !(typeof Spiel !== 'undefined' && Spiel.st); i++) await new Promise(r => setTimeout(r, 100));
          Spiel.neu(); store.sofort();
          UI.labor.laden(DATEN.beispiele.{vorlage}(), {{titel: 'Ziehen', sandbox: true}});
          await new Promise(r => setTimeout(r, 1600));
          window.__ev = [];
          for (const art of ['pointerdown','pointermove','pointerup']) {{
            document.querySelector('.lb-svg').addEventListener(art, e => {{
              const t = e.target, k = (t.getAttribute && t.getAttribute('class')) || t.tagName;
              window.__ev.push(art + '@' + k);
            }}, true);
          }}
          return true;
        }})()""")

        ziel = js("""(() => {
          const g = [...document.querySelectorAll('.lb-svg g.ger')].find(x => x.getAttribute('data-id') === 'srv');
          const t = g.querySelector('.ger-treffer').getBoundingClientRect();
          const w = document.querySelector('.lb-svg').getBoundingClientRect();
          return {x: Math.round(t.left + t.width / 2), y: Math.round(t.top + t.height / 2),
                  treffer: {l: Math.round(t.left), o: Math.round(t.top), b: Math.round(t.width), h: Math.round(t.height)},
                  svg: {l: Math.round(w.left), o: Math.round(w.top), b: Math.round(w.width), h: Math.round(w.height)},
                  elementAmPunkt: (() => { const e = document.elementFromPoint(Math.round(t.left + t.width / 2), Math.round(t.top + t.height / 2));
                    return e ? ((e.getAttribute && e.getAttribute('class')) || e.tagName) : null; })()};
        })()""")
        print("Greifpunkt:", json.dumps(ziel, ensure_ascii=False))
        vorher = js("UI.labor.pos('srv')", geste=False)

        ws.rufen("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": ziel["x"], "y": ziel["y"], "button": "none", "buttons": 0})
        ws.rufen("Input.dispatchMouseEvent", {"type": "mousePressed", "x": ziel["x"], "y": ziel["y"], "button": "left", "buttons": 1, "clickCount": 1, "pointerType": "mouse"})
        for i in range(1, 9):
            ws.rufen("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": ziel["x"] + i * 10, "y": ziel["y"] + i * 5,
                                                  "button": "left", "buttons": 1, "pointerType": "mouse"})
            time.sleep(0.06)
        ws.rufen("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": ziel["x"] + 80, "y": ziel["y"] + 40, "button": "left", "buttons": 0, "clickCount": 1, "pointerType": "mouse"})
        time.sleep(0.8)
        nachher = js("UI.labor.pos('srv')", geste=False)
        print("Position:", vorher, "->", nachher)
        print("Bewegt:", bool(vorher and nachher and (abs(nachher["x"] - vorher["x"]) > 4 or abs(nachher["y"] - vorher["y"]) > 4)))
        ev = js("window.__ev", geste=False)
        print(f"Ereignisse ({len(ev)}):", ", ".join(ev[:10]), "…" if len(ev) > 10 else "")
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
