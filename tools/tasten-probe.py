"""Prueft die Werkzeug-Tasten mit ECHTEN Tastaturereignissen (CDP), inklusive deutscher Belegung.

   Aufruf: python tools/tasten-probe.py [vorlage]
"""
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

# (Beschreibung, key, code, shift, erwartete Wirkung als Pruefung)
TASTEN = [
    ("P  Ping-Werkzeug",        "p",      "KeyP",     False),
    ("K  Kabel-Werkzeug",       "k",      "KeyK",     False),
    ("V  Auswahl",              "v",      "KeyV",     False),
    ("I  Inspektor",            "i",      "KeyI",     False),
    ("S  Simulation",           "s",      "KeyS",     False),
    ("F  einpassen",            "f",      "KeyF",     False),
    ("A  aufraeumen",           "a",      "KeyA",     False),
    ("0  Zoom 100 %",           "0",      "Digit0",   False),
    ("+  Zoom groesser (US)",   "+",      "Equal",    True),
    ("=  Zoom groesser (DE?)",  "=",      "Equal",    False),
    ("-  Zoom kleiner",         "-",      "Minus",    False),
    ("SHIFT+2  Ebene VLAN",     "@",      "Digit2",   True),
]


def main():
    vorlage = sys.argv[1] if len(sys.argv) > 1 else "praxis"
    server = browser = profil = None
    try:
        port = ke.freier_port()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(ke.Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        edge = next((p for p in ke.EDGE if p.exists()), None)
        profil = Path(tempfile.mkdtemp(prefix="labor-tasten-"))
        dport = ke.freier_port()
        browser = subprocess.Popen([str(edge), "--headless=new", f"--remote-debugging-port={dport}",
                                    f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                                    "--disable-extensions", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws = cdp.WS(ke.seite_auf(dport))
        ws.rufen("Runtime.enable"); ws.rufen("Page.enable")
        ws.rufen("Emulation.setDeviceMetricsOverride", {"width": 1366, "height": 768, "deviceScaleFactor": 1, "mobile": False})

        def js(a, geste=False):
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
          UI.labor.laden(DATEN.beispiele.{vorlage}(), {{titel: 'Tasten', sandbox: true}});
          await new Promise(r => setTimeout(r, 1600));
          return true;
        }})()""")

        def lage():
            return js("""(() => ({
              werkzeug: UI.labor.werkzeugName,
              ebene: UI.ebenen.aktuell,
              zoom: (() => { const w = document.querySelector('.lb-svg g[transform*="scale"]');
                const m = w && /scale\\(([\\d.]+)\\)/.exec(w.getAttribute('transform')); return m ? +(+m[1]).toFixed(3) : null; })(),
              inspektor: !!document.querySelector('.lb-inspektor:not([hidden])'),
              sim: !!document.querySelector('.lb-sim:not([hidden])')
            }))()""")

        print(f"{'Taste':26s} {'vorher':38s} nachher")
        for beschreibung, key, code, shift in TASTEN:
            vor = lage()
            # echten Tastendruck senden
            gemein = {"key": key, "code": code, "windowsVirtualKeyCode": ord(key.upper()) if key.isalpha() else 0,
                      "nativeVirtualKeyCode": 0}
            ws.rufen("Input.dispatchKeyEvent", {"type": "keyDown", "modifiers": 8 if shift else 0, **gemein})
            ws.rufen("Input.dispatchKeyEvent", {"type": "keyUp", "modifiers": 8 if shift else 0, **gemein})
            time.sleep(0.5)
            nach = lage()
            geaendert = {k: (vor[k], nach[k]) for k in vor if vor[k] != nach[k]}
            kurz = json.dumps(geaendert, ensure_ascii=False) if geaendert else "KEINE WIRKUNG"
            print(f"{beschreibung:26s} {json.dumps({k: vor[k] for k in ('werkzeug','ebene','zoom','inspektor','sim')}, ensure_ascii=False)[:38]:38s} {kurz}")
            # Ausgangslage wiederherstellen: Seite neu laden ist ehrlicher als einzelne Zustände zurueckzusetzen
            ws.rufen("Page.reload", {})
            time.sleep(1.8)
            js(f"""(async () => {{
              for (let i = 0; i < 50 && !(typeof Spiel !== 'undefined' && Spiel.st); i++) await new Promise(r => setTimeout(r, 100));
              UI.labor.laden(DATEN.beispiele.{vorlage}(), {{titel: 'Tasten', sandbox: true}});
              await new Promise(r => setTimeout(r, 1400));
              return true;
            }})()""")
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
