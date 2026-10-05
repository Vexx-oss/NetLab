"""Prueft, ob die Werkzeug-Tasten sichtbar im Knopf stehen (gemessen, nicht behauptet)."""
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
    server = browser = profil = None
    try:
        port = ke.freier_port()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(ke.Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        edge = next((p for p in ke.EDGE if p.exists()), None)
        profil = Path(tempfile.mkdtemp(prefix="labor-taste-anzeige-"))
        dport = ke.freier_port()
        browser = subprocess.Popen([str(edge), "--headless=new", f"--remote-debugging-port={dport}",
                                    f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                                    "--disable-extensions", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws = cdp.WS(ke.seite_auf(dport))
        ws.rufen("Runtime.enable"); ws.rufen("Page.enable")
        ws.rufen("Emulation.setDeviceMetricsOverride", {"width": 1366, "height": 768, "deviceScaleFactor": 1, "mobile": False})

        def js(a):
            r = ws.rufen("Runtime.evaluate", {"expression": f"(async () => ({a}))()",
                                              "awaitPromise": True, "returnByValue": True})
            if "exceptionDetails" in r:
                raise RuntimeError(str(r["exceptionDetails"])[:300])
            return r["result"].get("value")

        ws.rufen("Page.navigate", {"url": f"http://127.0.0.1:{port}/index.html"})
        time.sleep(3)
        js("""(async () => {
          for (let i = 0; i < 50 && !(typeof Spiel !== 'undefined' && Spiel.st); i++) await new Promise(r => setTimeout(r, 100));
          Spiel.neu(); store.sofort();
          UI.labor.laden(DATEN.beispiele.praxis(), {titel: 'Tasten', sandbox: true});
          await new Promise(r => setTimeout(r, 1600));
          return true;
        })()""")
        erg = js("""(() => [...document.querySelectorAll('.lb-wz')].map(b => {
          const k = b.querySelector('.lb-wz-taste');
          const r = b.getBoundingClientRect();
          const kr = k ? k.getBoundingClientRect() : null;
          return {werkzeug: b.getAttribute('data-wz'), taste: k ? k.textContent : null,
                  knopf: [Math.round(r.width), Math.round(r.height)],
                  tasteSichtbar: !!(kr && kr.width > 0 && kr.height > 0 && getComputedStyle(k).display !== 'none'),
                  tasteGroesse: kr ? [Math.round(kr.width), Math.round(kr.height)] : null,
                  imKnopf: !!(kr && kr.left >= r.left - 1 && kr.right <= r.right + 1 && kr.top >= r.top - 1 && kr.bottom <= r.bottom + 1)};
        }))()""")
        print(f"{'Werkzeug':10s} {'Taste':6s} {'Knopf':10s} {'Taste sichtbar':15s} {'im Knopf':9s}")
        for e in erg:
            print(f"  {e['werkzeug']:8s} {str(e['taste']):6s} {str(e['knopf']):10s} {str(e['tasteSichtbar']):15s} {str(e['imKnopf'])}")
        alle = all(e["tasteSichtbar"] and e["imKnopf"] for e in erg)
        print("\nERGEBNIS:", "alle Tasten sichtbar im Knopf" if alle else "NICHT alle sichtbar")
        return 0 if alle else 1
    finally:
        if browser:
            browser.terminate()
        if server:
            server.shutdown()
        if profil:
            shutil.rmtree(profil, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
