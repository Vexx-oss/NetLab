"""Sonae: bleibt „Auftrag annehmen“ im Postfach sichtbar, wenn das Fenster niedrig ist?  (Design § 22, G2c)

Aufruf:  python tools/sonde-postfach.py [breite] [hoehe]
Belegt die sticky-Regel in src/stil/spiel.css (.sp-pf-teile > .sp-leser .sp-brief > .sp-knoepfe).
Kein Ersatz für tools/rauch.py – eine einzelne Messung an einer Stelle, die der Rauchtest nicht abdeckt.
"""
import json
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
    raise SystemExit("Browser meldet sich nicht auf dem Fernsteuerungs-Port")


def main():
    breite = int(sys.argv[1]) if len(sys.argv) > 1 else 960
    hoehe = int(sys.argv[2]) if len(sys.argv) > 2 else 700
    server = browser = profil = None
    try:
        port = freier_port()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        edge = next((p for p in EDGE if p.exists()), None)
        if not edge:
            raise SystemExit("Edge nicht gefunden")
        profil = Path(tempfile.mkdtemp(prefix="labor-sonde-"))
        dport = freier_port()
        browser = subprocess.Popen([str(edge), "--headless=new", f"--remote-debugging-port={dport}",
                                    f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                                    "--disable-extensions", "about:blank"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws = cdp.WS(seite_auf(dport))
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        ws.rufen("Emulation.setDeviceMetricsOverride", {"width": breite, "height": hoehe, "deviceScaleFactor": 1, "mobile": False})

        def js(ausdruck):
            r = ws.rufen("Runtime.evaluate", {"expression": f"(async () => {{ return {ausdruck} }})()",
                                              "awaitPromise": True, "returnByValue": True})
            if "exceptionDetails" in r:
                raise RuntimeError(str(r["exceptionDetails"])[:300])
            return r.get("result", {}).get("value")

        ws.rufen("Page.navigate", {"url": f"http://127.0.0.1:{port}/index.html"})
        time.sleep(2.5)
        # frischer Spielstand, dann ins Postfach und die erste Karte öffnen
        js("(() => { Spiel.neu(); store.sofort(); return true; })()")
        ws.rufen("Page.navigate", {"url": f"http://127.0.0.1:{port}/index.html"})
        time.sleep(2.5)
        erg = js("""(async () => {
          for (let i = 0; i < 40 && !Spiel.st; i++) await new Promise(r => setTimeout(r, 100));
          UI.app.ansicht('postfach');
          await new Promise(r => setTimeout(r, 900));
          const k = document.querySelector('.sp-mail');
          if (!k) return {fehlt: 'keine Postkarte'};
          const r0 = k.getBoundingClientRect();
          return {karte: [Math.round(r0.left), Math.round(r0.top)]};
        })()""")
        if erg.get("fehlt"):
            raise SystemExit(erg["fehlt"])
        # echte Maus: Karte anklicken, damit der Leser den Brief zeigt
        x, y = erg["karte"][0] + 60, erg["karte"][1] + 20
        for typ, knoepfe, anzahl in (("mouseMoved", 0, 0), ("mousePressed", 1, 1), ("mouseReleased", 0, 1)):
            ws.rufen("Input.dispatchMouseEvent", {"type": typ, "x": x, "y": y, "button": "left",
                                                  "buttons": knoepfe, "clickCount": anzahl, "pointerType": "mouse"})
        time.sleep(1.0)
        mess = js("""(() => {
          const knoepfe = document.querySelector('.sp-pf-teile > .sp-leser .sp-brief > .sp-knoepfe');
          if (!knoepfe) return {fehlt: 'kein Knopfbereich im Leser'};
          const r = knoepfe.getBoundingClientRect();
          const b = knoepfe.querySelector('.knopf');
          const br = b && b.getBoundingClientRect();
          const mx = br ? br.left + br.width / 2 : 0, my = br ? br.top + br.height / 2 : 0;
          const t = br ? document.elementFromPoint(mx, my) : null;
          return {knopf_y: Math.round(br ? br.top : -1), knopf_unten: Math.round(br ? br.bottom : -1),
                  fenster_hoehe: innerHeight, knoepfe_unten: Math.round(r.bottom),
                  sichtbar: !!br && br.top >= 0 && br.bottom <= innerHeight + 1,
                  trifft: !!t && (b === t || b.contains(t)), oben: t ? t.className : null};
        })()""")
        print(json.dumps({"fenster": f"{breite}x{hoehe}", **mess}, ensure_ascii=False, indent=2))
        return 0 if mess.get("sichtbar") and mess.get("trifft") else 1
    finally:
        if browser:
            browser.terminate()
        if server:
            server.shutdown()
        if profil:
            import shutil
            shutil.rmtree(profil, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
