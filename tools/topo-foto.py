"""Macht ein Bildschirmfoto der Laborflaeche (Vorlage waehlbar) nach Nachweise/1.2-Topo/.

   Aufruf: python tools/topo-foto.py [vorlage] [breite] [hoehe] [dateiname]
"""
import base64
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
    breite = int(sys.argv[2]) if len(sys.argv) > 2 else 1736
    hoehe = int(sys.argv[3]) if len(sys.argv) > 3 else 964
    name = sys.argv[4] if len(sys.argv) > 4 else f"topo-{vorlage}-{breite}x{hoehe}.png"
    ziel = HIER / "Nachweise" / "1.2-Topo"
    ziel.mkdir(parents=True, exist_ok=True)
    server = browser = profil = None
    try:
        port = freier_port()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        edge = next((p for p in EDGE if p.exists()), None)
        if not edge:
            raise SystemExit("Edge nicht gefunden")
        profil = Path(tempfile.mkdtemp(prefix="labor-foto-"))
        dport = freier_port()
        browser = subprocess.Popen([str(edge), "--headless=new", f"--remote-debugging-port={dport}",
                                    f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                                    "--disable-extensions", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws = cdp.WS(seite_auf(dport))
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        ws.rufen("Emulation.setDeviceMetricsOverride", {"width": breite, "height": hoehe, "deviceScaleFactor": 1, "mobile": False})

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
          UI.labor.laden(DATEN.beispiele.{vorlage}(), {{titel: 'Topologie', sandbox: true}});
          await new Promise(r => setTimeout(r, 1500));
          if (UI.ebenen && UI.ebenen.setzen) UI.ebenen.setzen('ip');
          await new Promise(r => setTimeout(r, 1500));
          return true;
        }})()""")
        r = ws.rufen("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
        daten = base64.b64decode(r["data"])
        (ziel / name).write_bytes(daten)
        print(f"Bild: {ziel / name}  ({len(daten)} Bytes, {breite}x{hoehe})")
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
