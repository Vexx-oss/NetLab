"""Starttest der Einzeldatei-Fassung in einem echten Browser (headless Edge/Chrome).

Warum: `python tools/einfach.py` beweist nur, dass die Datei keine Aussenverweise hat.
Es beweist NICHT, dass das Spiel darin startet. Dieses Werkzeug laedt die Datei ueber
`file://` (genau der Weg eines Doppelklicks), laesst das Spiel booten und misst danach
im geladenen Dokument.

Warum ueber das DevTools-Protokoll und nicht per `--dump-dom`: Das gerenderte Dokument
ist gut 2 MB gross, `--dump-dom` schneidet genau dort ab — der Zustand am Seitenende
waere nicht lesbar. Ueber CDP wird nur das Ergebnis der Sonde geholt (ein paar hundert
Bytes), unabhaengig von der Seitengroesse.

Gemessen wird (jeder Wert ein Laufzeitwert aus dem echten Browser):
  * Anzahl Elemente in `#app`           (0 = weisse Seite = kaputt)
  * sichtbarer Textanfang
  * geladene CSS-Blaetter und -Regeln   (0 = Stil verloren)
  * ob die drei Schriften wirklich da sind (`document.fonts.check`)
  * JS-Fehler und Konsolenfehler        (muss 0 sein)

Aufruf:  python tools/starttest.py [datei.html] [--bild X.png]
         (Standard: docs/index.html)

Nur Standardbibliothek, keine Installation. Beendet wird ausschliesslich der Prozess,
den dieses Werkzeug selbst gestartet hat (AGENTS.md Regel 1).
"""
import argparse
import base64
import json
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
STANDARD = HIER / "docs" / "index.html"

KANDIDATEN = [
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
]

# Wird VOR den Spielskripten eingehangen: sammelt Fehler ab dem ersten Byte mit.
FEHLERSAMMLER = (
    "<script>window.__nlFehler=[];"
    "window.addEventListener('error',function(e){window.__nlFehler.push(String(e.message))});"
    "window.addEventListener('unhandledrejection',function(e){window.__nlFehler.push('Promise: '+String(e.reason))});"
    "var _ce=console.error;console.error=function(){window.__nlFehler.push(Array.prototype.join.call(arguments,' '));"
    "return _ce.apply(console,arguments)};</script>"
)

# Die Schriften des Spiels. WICHTIG: Bricolage Grotesque gibt es NUR in 600 und 800,
# Atkinson Hyperlegible in 400/700 (kursiv 400), JetBrains Mono in 400/600. Ein
# `document.fonts.check('16px "Bricolage Grotesque"')` fragt Gewicht 400 ab und meldet
# deshalb faelschlich „nicht geladen" — je Familie wird darum das Gewicht geprueft,
# das es wirklich gibt. Zusaetzlich wird nachgesehen, ob die Familie im Dokument
# ueberhaupt verwendet wird (eine mitgelieferte, aber nie benutzte Schrift waere Ballast).
SCHRIFTEN = {
    "Atkinson Hyperlegible": "400",
    "Bricolage Grotesque": "800",
    "JetBrains Mono": "400",
}

# Laeuft IM Browser, nach dem Boot des Spiels. Ergebnis wird als Wert zurueckgegeben.
SONDE = r"""
(() => {
  const app = document.getElementById('app');
  const namen = %s;
  const fam = (f, gewicht) => {
    try { return document.fonts.check(gewicht + ' 16px "' + f + '"'); } catch (e) { return null; }
  };
  let blaetter = 0, regeln = 0;
  for (const s of document.styleSheets) { try { regeln += s.cssRules.length; blaetter++; } catch (e) {} }
  // Wird die Familie im gerenderten Dokument tatsaechlich benutzt?
  const benutzt = {};
  for (const el of document.querySelectorAll('#app *')) {
    const ff = getComputedStyle(el).fontFamily || '';
    for (const n of Object.keys(namen)) if (ff.includes(n)) benutzt[n] = true;
  }
  const schriften = {};
  for (const [n, g] of Object.entries(namen)) schriften[n] = {gewicht: g, geladen: fam(n, g), benutzt: !!benutzt[n]};
  return {
    titel: document.title,
    appKinder: app ? app.children.length : -1,
    appText: app ? app.innerText.replace(/\s+/g, ' ').trim().slice(0, 160) : '',
    cssBlaetter: blaetter,
    cssRegeln: regeln,
    schriften: schriften,
    knopfZahl: document.querySelectorAll('button').length,
    jsFehler: (window.__nlFehler || [])
  };
})()
""" % (json.dumps(SCHRIFTEN),)


class WS:
    """Minimaler WebSocket-Client (Text-Frames, maskiert) — wie tools/cdp.py, hier eigenstaendig."""

    def __init__(self, url, timeout=60):
        rest = url.split("://", 1)[1]
        wirt, pfad = rest.split("/", 1)
        h, p = wirt.split(":")
        self.s = socket.create_connection((h, int(p)), timeout=timeout)
        schluessel = base64.b64encode(bytes(range(16))).decode()
        self.s.sendall((f"GET /{pfad} HTTP/1.1\r\nHost: {wirt}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        f"Sec-WebSocket-Key: {schluessel}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        antwort = b""
        while b"\r\n\r\n" not in antwort:
            antwort += self.s.recv(4096)
        if b" 101 " not in antwort.split(b"\r\n")[0]:
            raise SystemExit("WebSocket-Handshake fehlgeschlagen")
        self.n = 0

    def senden(self, obj):
        daten = json.dumps(obj).encode()
        kopf = bytearray([0x81])
        if len(daten) < 126:
            kopf.append(0x80 | len(daten))
        elif len(daten) < 65536:
            kopf.append(0x80 | 126); kopf += struct.pack(">H", len(daten))
        else:
            kopf.append(0x80 | 127); kopf += struct.pack(">Q", len(daten))
        maske = b"\x00\x01\x02\x03"
        self.s.sendall(bytes(kopf) + maske + bytes(b ^ maske[i % 4] for i, b in enumerate(daten)))

    def _genau(self, n):
        b = b""
        while len(b) < n:
            teil = self.s.recv(n - len(b))
            if not teil:
                raise SystemExit("Verbindung zum Browser abgebrochen")
            b += teil
        return b

    def empfangen(self):
        daten = b""
        while True:
            b1, b2 = self._genau(2)
            laenge = b2 & 0x7F
            if laenge == 126:
                laenge = struct.unpack(">H", self._genau(2))[0]
            elif laenge == 127:
                laenge = struct.unpack(">Q", self._genau(8))[0]
            daten += self._genau(laenge)
            if b1 & 0x80:
                return json.loads(daten.decode("utf-8", "replace"))

    def rufen(self, methode, params=None):
        self.n += 1
        mein = self.n
        self.senden({"id": mein, "method": methode, "params": params or {}})
        while True:
            m = self.empfangen()
            if m.get("id") == mein:
                if "error" in m:
                    raise SystemExit(json.dumps(m["error"], ensure_ascii=False))
                return m.get("result", {})
            if m.get("method") == "Runtime.exceptionThrown":
                d = m["params"]["exceptionDetails"]
                self.fehler.append((d.get("exception", {}).get("description") or d.get("text") or "?")[:200])
            elif m.get("method") == "Runtime.consoleAPICalled" and m["params"].get("type") == "error":
                self.fehler.append(" ".join(str(a.get("value", a.get("description", "")))
                                            for a in m["params"].get("args", []))[:200])


def browser() -> Path:
    for k in KANDIDATEN:
        if k.is_file():
            return k
    raise SystemExit("FEHLER: kein Edge/Chrome gefunden — bitte Pfad in KANDIDATEN ergaenzen.")


def warte_auf_port(port: int, sekunden: float = 40.0):
    ende = time.time() + sekunden
    while time.time() < ende:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2) as r:
                ziele = json.loads(r.read())
            for z in ziele:
                if z.get("type") == "page" and "webSocketDebuggerUrl" in z:
                    return z["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.4)
    raise SystemExit("FEHLER: der Browser meldet sich nicht auf dem Steuerport.")


def main() -> int:
    ap = argparse.ArgumentParser(description="Starttest der Einzeldatei-Fassung")
    ap.add_argument("datei", nargs="?", type=Path, default=STANDARD)
    ap.add_argument("--bild", type=Path, help="Bildschirmfoto des geladenen Spiels hierhin schreiben")
    ap.add_argument("--port", type=int, default=9333, help="Steuerport (Standard 9333)")
    a = ap.parse_args()

    datei = a.datei.resolve()
    if not datei.is_file():
        raise SystemExit(f"FEHLER: {datei} fehlt — zuerst `python tools/einfach.py` laufen lassen.")
    exe = browser()
    profil = Path(tempfile.mkdtemp(prefix="nl-starttest-"))
    ordner = Path(tempfile.mkdtemp(prefix="nl-probe-"))

    # Arbeitskopie mit Fehlersammler direkt nach <head>, damit Fehler ab dem ersten Byte zaehlen.
    quelle = datei.read_text(encoding="utf-8")
    if "<head>" not in quelle:
        raise SystemExit("FEHLER: kein <head> in der Datei gefunden.")
    probe = ordner / "starttest.html"
    probe.write_text(quelle.replace("<head>", "<head>" + FEHLERSAMMLER, 1), encoding="utf-8")

    # Edge bringt sonst seine eigene Willkommens-/Synchronisationsseite statt der Datei.
    # Deshalb: Ersteinrichtung, Anmeldung, Synchronisation und Hintergrunddienste aus.
    p = subprocess.Popen(
        [str(exe), "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
         "--disable-sync", "--disable-extensions", "--disable-component-update", "--no-service-autorun",
         "--disable-background-networking", "--disable-client-side-phishing-detection",
         "--disable-features=msEdgeIdentityFluentUI,msEdgeSyncPromo,msImplicitSignin,EdgeCollectionsPrompt",
         "--window-size=1366,768", f"--remote-debugging-port={a.port}", f"--user-data-dir={profil}",
         probe.as_uri()],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    fehler, ergebnis = [], None
    try:
        url = warte_auf_port(a.port)
        ws = WS(url)
        ws.fehler = fehler
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        # Warten, bis #app wirklich Inhalt hat (oder Zeit ablaeuft).
        for _ in range(60):
            r = ws.rufen("Runtime.evaluate", {"expression": "document.getElementById('app')?.children.length || 0",
                                              "returnByValue": True})
            if (r.get("result", {}).get("value") or 0) > 0:
                break
            time.sleep(0.5)
        time.sleep(1.5)
        r = ws.rufen("Runtime.evaluate", {"expression": SONDE, "returnByValue": True, "awaitPromise": True})
        if "exceptionDetails" in r:
            print("ROT: die Sonde ist gescheitert:", r["exceptionDetails"].get("text"))
            return 1
        ergebnis = r["result"]["value"]
        if a.bild:
            shot = ws.rufen("Page.captureScreenshot", {"format": "png"})
            a.bild.parent.mkdir(parents=True, exist_ok=True)
            a.bild.write_bytes(base64.b64decode(shot["data"]))
    finally:
        p.terminate()
        try:
            p.wait(timeout=15)
        except subprocess.TimeoutExpired:
            p.kill()
        shutil.rmtree(profil, ignore_errors=True)
        shutil.rmtree(ordner, ignore_errors=True)

    if ergebnis is None:
        print("ROT: kein Messergebnis.")
        return 1

    e = ergebnis
    print(f"Starttest: {datei}")
    print(f"  Browser          {exe.name}, headless, ueber {datei.as_uri()[:40]}…")
    print(f"  Titel            {e['titel']}")
    print(f"  #app             {e['appKinder']} Elemente, {e['knopfZahl']} Knoepfe")
    print(f"  Sichtbarer Text  {e['appText'][:100]!r}")
    print(f"  CSS              {e['cssBlaetter']} Blaetter, {e['cssRegeln']} Regeln")
    for name, w in e["schriften"].items():
        stand = "geladen" if w["geladen"] else "NICHT GELADEN"
        nutz = "benutzt" if w["benutzt"] else "NICHT BENUTZT"
        print(f"  Schrift          {name:<24} {stand:<14} ({nutz}, Gewicht {w['gewicht']})")
    print(f"  JS-/Konsolenfehler {len(fehler)}")
    if a.bild:
        print(f"  Bildschirmfoto   {a.bild}")

    rot = []
    if "Netzwerk-Labor" not in (e["titel"] or ""):
        rot.append("Titel fehlt oder falsch")
    if e["appKinder"] <= 0:
        rot.append("#app ist leer — das Spiel rendert nichts")
    if e["cssRegeln"] <= 0:
        rot.append("keine CSS-Regeln geladen")
    for name, w in e["schriften"].items():
        if not w["geladen"]:
            rot.append(f"Schrift nicht geladen: {name} (Gewicht {w['gewicht']})")
        if not w["benutzt"]:
            rot.append(f"Schrift mitgeliefert, aber im Dokument nicht benutzt: {name}")
    if fehler:
        rot.append(f"{len(fehler)} JS-Fehler: {fehler[:2]}")

    if rot:
        print("  ROT:")
        for x in rot:
            print("    - " + x)
        return 1
    print("  GRUEN: laedt, rendert, Stil und Schriften da, keine JS-Fehler.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
