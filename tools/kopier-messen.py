"""Prueft das Kopieren der Adresse beim Klick - liest die Zwischenablage ZURUECK.

   Aufruf: python tools/kopier-messen.py [vorlage]
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
        if not edge:
            raise SystemExit("Edge nicht gefunden")
        profil = Path(tempfile.mkdtemp(prefix="labor-kopier-"))
        dport = freier_port()
        browser = subprocess.Popen([str(edge), "--headless=new", f"--remote-debugging-port={dport}",
                                    f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                                    "--disable-extensions", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws = cdp.WS(seite_auf(dport))
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        # Zwischenablage LESEN und SCHREIBEN erlauben, sonst ist das Ergebnis nicht aussagekraeftig.
        try:
            ws.rufen("Browser.grantPermissions", {"permissions": ["clipboardReadWrite", "clipboardSanitizedWrite"]})
            print("Zwischenablage-Rechte: erteilt")
        except Exception as e:
            print("Zwischenablage-Rechte: NICHT erteilt –", str(e)[:120])
        ws.rufen("Emulation.setDeviceMetricsOverride", {"width": 1366, "height": 768, "deviceScaleFactor": 1, "mobile": False})

        def js(ausdruck):
            r = ws.rufen("Runtime.evaluate", {"expression": f"(async () => ({ausdruck}))()",
                                              "awaitPromise": True, "returnByValue": True, "userGesture": True})
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

        # Zwischenablage leeren, damit ein alter Inhalt das Ergebnis nicht verfaelscht
        js("navigator.clipboard.writeText('LEER')")
        time.sleep(0.4)

        lage = js("""(() => {
          const el = document.querySelector('.lb-svg text.ger-ip.kopierbar');
          if (!el) return {fehler: 'kein anklickbares Adressfeld gefunden'};
          const ger = el.closest('g.ger');
          /* Nur den eigenen Text messen: getBoundingClientRect liefert bei SVG-Text 0 Breite,
             und der <title> zaehlt als Kind mit - deshalb getBBox() auf dem Textelement. */
          const b = el.getBBox();
          const m = el.getScreenCTM();
          const links = m.a * b.x + m.c * b.y + m.e, oben = m.b * b.x + m.d * b.y + m.f;
          const breite = b.width * Math.hypot(m.a, m.b), hoehe = b.height * Math.hypot(m.c, m.d);
          return {gefunden: true, geraet: ger && ger.getAttribute('data-id'), text: el.firstChild ? el.firstChild.textContent : '',
                  cursor: getComputedStyle(el).cursor,
                  x: Math.round(links + breite / 2), y: Math.round(oben + hoehe / 2),
                  breite: Math.round(breite), hoehe: Math.round(hoehe)};
        })()""")
        print("Adressfeld:", json.dumps(lage, ensure_ascii=False))

        # Warum scheitert das Kopieren? Die API direkt pruefen, mit und ohne Gestik.
        roh = js("""(async () => {
          const da = !!(navigator.clipboard && navigator.clipboard.writeText);
          let direkterFehler = null;
          try { await navigator.clipboard.writeText('DIREKT'); } catch (e) { direkterFehler = e.name + ': ' + e.message; }
          const gelesen = await navigator.clipboard.readText().catch(e => 'LESEFEHLER ' + e.message);
          return {apiDa: da, direkterFehler, danachInhalt: gelesen,
                  hatFokus: document.hasFocus(), istSecure: window.isSecureContext, herkunft: location.origin};
        })()""")
        print("API:", json.dumps(roh, ensure_ascii=False))

        # Klick direkt auf dem Element ausloesen - so wird geprueft, ob der Handler verdrahtet ist.
        js("navigator.clipboard.writeText('LEER2')")
        time.sleep(0.3)
        direkt = js("""(async () => {
          const el = document.querySelector('.lb-svg text.ger-ip.kopierbar');
          el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
          await new Promise(r => setTimeout(r, 900));
          return await navigator.clipboard.readText().catch(e => 'LESEFEHLER');
        })()""")
        print(f"Nach direktem click auf dem Element: {direkt!r}")

        # Echter Mausklick ueber CDP (kein synthetisches Element.click())
        ws.rufen("Input.dispatchMouseEvent", {"type": "mousePressed", "x": lage["x"], "y": lage["y"],
                                              "button": "left", "clickCount": 1})
        ws.rufen("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": lage["x"], "y": lage["y"],
                                              "button": "left", "clickCount": 1})
        time.sleep(1.2)

        inhalt = js("navigator.clipboard.readText().catch(e => 'FEHLER: ' + e.message)")
        erwartet = str(lage["text"]).split(" ")[0].split("/")[0]
        print(f"\nErwartet in der Zwischenablage: {erwartet!r}")
        print(f"Tatsaechlich:                   {inhalt!r}")
        print("ERGEBNIS:", "KOPIERT – stimmt" if inhalt == erwartet else "ABWEICHUNG")
        # Wurde das Geraet versehentlich ausgewaehlt (Inspektor geoeffnet)?
        danach = js("(() => ({auswahl: UI.labor.auswahl && UI.labor.auswahl.geraet, toast: (document.querySelector('.toast') || {}).textContent || ''}))()")
        print("Danach:", json.dumps(danach, ensure_ascii=False))
        return 0 if inhalt == erwartet else 1
    finally:
        if browser:
            browser.terminate()
        if server:
            server.shutdown()
        if profil:
            shutil.rmtree(profil, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
