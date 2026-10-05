"""Test im ECHTEN Programm (Windows, WebView2) über das Chrome DevTools Protocol – nur Python-Standardbibliothek.

  python tools/cdp.py start [exe] [--frisch]   Programm mit Fernsteuerungs-Port starten (eigener Datenordner, echter Spielstand bleibt unberührt)
  python tools/cdp.py eval "<js>"              JavaScript im Programm auswerten (await erlaubt), Ergebnis als JSON
  python tools/cdp.py shot bild.png            Bildschirmfoto der Seite
  python tools/cdp.py klick X Y | zeigen X Y | ziehen X1 Y1 X2 Y2 | taste P   echte Maus/Tastatur (CSS-Pixel; zeigen = nur darüberfahren)
  python tools/cdp.py lauf schritte.txt [mess.json]   Szenario in einer Sitzung (groesse B H, klick-auf SELEKTOR, messen, shot …; siehe lauf())
  python tools/cdp.py stop                     die in DIESEM Lauf gestartete Instanz beenden (nur eigene PID, Regel 1)

Umgebung: WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222, LABOR_DATEN=<Testordner>.
"""
import base64
import json
import os
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
PORT = 9222
EXE = HIER / "Programm" / "Netzwerk-Labor.exe"
DATEN = Path(tempfile.gettempdir()) / "netzwerk-labor-test"
GESTARTET = []  # Popen-Objekte, die DIESER Lauf selbst gestartet hat (AGENTS.md Regel 1: nur eigene PIDs beenden)


def laeuft_schon():
    """Laeuft schon eine Netzwerk-Labor-Instanz? (Einzelinstanz-Plugin: ein zweiter Start kaeme nicht auf den Port.)

    Es wird NICHTS beendet - der Aufruf meldet nur. Fremde Prozesse anzufassen verbietet AGENTS.md Regel 1."""
    r = subprocess.run(["tasklist", "/FI", "IMAGENAME eq Netzwerk-Labor.exe", "/FO", "CSV", "/NH"],
                       capture_output=True, text=True)
    return "Netzwerk-Labor.exe" in (r.stdout or "")


def ziele():
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=3) as r:
        return json.loads(r.read())


def seite():
    for z in ziele():
        if z.get("type") == "page" and "webSocketDebuggerUrl" in z:
            return z["webSocketDebuggerUrl"]
    raise SystemExit("Keine Seite gefunden")


class WS:
    """Minimaler WebSocket-Client (Text-Frames, maskiert) – reicht für CDP."""

    def __init__(self, url):
        rest = url.split("://", 1)[1]
        wirt, pfad = rest.split("/", 1)
        h, p = wirt.split(":")
        self.s = socket.create_connection((h, int(p)), timeout=60)
        schluessel = base64.b64encode(os.urandom(16)).decode()
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
        laenge = len(daten)
        if laenge < 126:
            kopf.append(0x80 | laenge)
        elif laenge < 65536:
            kopf.append(0x80 | 126); kopf += struct.pack(">H", laenge)
        else:
            kopf.append(0x80 | 127); kopf += struct.pack(">Q", laenge)
        maske = os.urandom(4)
        self.s.sendall(bytes(kopf) + maske + bytes(b ^ maske[i % 4] for i, b in enumerate(daten)))

    def _genau(self, n):
        b = b""
        while len(b) < n:
            teil = self.s.recv(n - len(b))
            if not teil:
                raise SystemExit("Verbindung zu")
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
                getattr(self, "fehler", []).append((d.get("exception", {}).get("description") or d.get("text") or "?")[:300])
            elif m.get("method") == "Runtime.consoleAPICalled" and m["params"].get("type") == "error":
                getattr(self, "fehler", []).append(" ".join(str(a.get("value", a.get("description", ""))) for a in m["params"].get("args", []))[:300])


def start(exe=None, frisch=False):
    exe = Path(exe) if exe else EXE
    if frisch and DATEN.exists():
        shutil.rmtree(DATEN, ignore_errors=True)
    DATEN.mkdir(parents=True, exist_ok=True)
    if laeuft_schon():
        raise SystemExit("Es laeuft schon eine Netzwerk-Labor-Instanz. Bitte zuerst beenden (Tray-Symbol -> Beenden); "
                         "dieses Werkzeug beendet aus Prinzip keine fremden Prozesse (AGENTS.md Regel 1).")
    umgebung = dict(os.environ, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=f"--remote-debugging-port={PORT}", LABOR_DATEN=str(DATEN))
    p = subprocess.Popen([str(exe)], env=umgebung, creationflags=getattr(subprocess, "DETACHED_PROCESS", 0))
    GESTARTET.append(p)
    for _ in range(60):
        try:
            seite()
            print(json.dumps({"gestartet": str(exe), "pid": p.pid, "daten": str(DATEN)}, ensure_ascii=False))
            return
        except Exception:
            time.sleep(0.5)
    raise SystemExit("Programm meldet sich nicht auf dem Fernsteuerungs-Port")


def auswerten(js):
    ws = WS(seite())
    r = ws.rufen("Runtime.evaluate", {"expression": f"(async () => {{ return {js} }})()" if "return" not in js and "\n" not in js and ";" not in js else f"(async () => {{ {js} }})()",
                                       "awaitPromise": True, "returnByValue": True})
    if "exceptionDetails" in r:
        print(json.dumps({"fehler": r["exceptionDetails"].get("exception", {}).get("description") or r["exceptionDetails"].get("text")}, ensure_ascii=False))
    else:
        print(json.dumps(r.get("result", {}).get("value"), ensure_ascii=False, indent=1))


def foto(datei):
    ws = WS(seite())
    r = ws.rufen("Page.captureScreenshot", {"format": "png"})
    Path(datei).write_bytes(base64.b64decode(r["data"]))
    print(datei)


def maus(art, punkte, taste="left"):
    """Echte Mausereignisse (wie ein Mensch): klick x y · ziehen x1 y1 x2 y2 (mit Zwischenschritten)."""
    ws = WS(seite())
    def ev(typ, x, y, knoepfe=0, anzahl=0):
        ws.rufen("Input.dispatchMouseEvent", {"type": typ, "x": x, "y": y, "button": taste if typ != "mouseMoved" else ("left" if knoepfe else "none"),
                                              "buttons": knoepfe, "clickCount": anzahl, "pointerType": "mouse"})
    if art == "klick":
        x, y = punkte
        ev("mouseMoved", x, y); ev("mousePressed", x, y, 1, 1); ev("mouseReleased", x, y, 0, 1)
    elif art == "zeigen":
        ev("mouseMoved", *punkte)
    elif art == "ziehen":
        x1, y1, x2, y2 = punkte
        ev("mouseMoved", x1, y1); time.sleep(0.15)
        ev("mousePressed", x1, y1, 1, 1)
        for i in range(1, 13):
            ev("mouseMoved", x1 + (x2 - x1) * i / 12, y1 + (y2 - y1) * i / 12, 1); time.sleep(0.02)
        ev("mouseReleased", x2, y2, 0, 1)
    print(json.dumps({art: punkte}))


SONDER = {"Enter": 13, "Escape": 27, "Backspace": 8, "Tab": 9, "Delete": 46}


def taste(name):
    ws = WS(seite())
    vk = SONDER.get(name, ord(name.upper()) if len(name) == 1 else 0)
    for typ in ("rawKeyDown" if name in SONDER else "keyDown", "keyUp"):
        ws.rufen("Input.dispatchKeyEvent", {"type": typ, "key": name, "code": ("Key" + name.upper()) if len(name) == 1 else name,
                                            "text": (chr(13) if name == "Enter" else name) if (typ in ("keyDown", "rawKeyDown") and (len(name) == 1 or name == "Enter")) else "",
                                            "windowsVirtualKeyCode": vk, "nativeVirtualKeyCode": vk})
    print(json.dumps({"taste": name}))


def tippen(text):
    ws = WS(seite())
    ws.rufen("Input.insertText", {"text": text})
    print(json.dumps({"getippt": text}))


MESSEN = r"""(() => {
  /* Abnahme A: sichtbare Bedienelemente, Wörter oberhalb der Falz, Primärknöpfe.
     Bereich „labor“ = alles außer Kopfzeile, Andock-Leiste und Zeichnung (SVG-Fläche); „fenster“ = alles. */
  const W = innerWidth, H = innerHeight;
  const sichtbar = (el, treffer = true) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.right <= 0 || r.top >= H || r.left >= W) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; }
    if (!treffer) return true;   /* Text zählt auch auf Flächen ohne Mausereignisse (pointer-events:none) */
    const x = Math.min(W - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(H - 1, Math.max(0, r.top + r.height / 2));
    const t = document.elementFromPoint(x, y);
    return !!t && (el === t || el.contains(t) || t.contains(el));
  };
  const chrom = el => !!el.closest(".kopf, .dock");
  const zeichnung = el => !!el.closest("svg.lb-svg");
  const SEL = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=radio], [role=menuitem], [role=switch], [tabindex]:not([tabindex='-1'])";
  const bedien = [...document.querySelectorAll(SEL)].filter(el => !el.disabled && el.getAttribute("aria-disabled") !== "true" && !el.matches("svg.lb-svg") && !zeichnung(el) && sichtbar(el));
  const name = el => (el.getAttribute("aria-label") || el.title || el.textContent || el.className || el.tagName).replace(/\s+/g, " ").trim().slice(0, 40);
  const woerter = filter => {
    let n = 0; const proben = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      const el = t.parentElement; if (!el || !t.nodeValue.trim() || !filter(el)) continue;
      if (el.closest("script, style, title")) continue;
      const rg = document.createRange(); rg.selectNodeContents(t);
      const r = rg.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.top >= H || r.bottom <= 0 || r.left >= W || r.right <= 0 || !sichtbar(el, false)) continue;
      const w = t.nodeValue.split(/\s+/).filter(x => /[\p{L}\p{N}]/u.test(x));
      n += w.length; if (w.length) proben.push(w.join(" ").slice(0, 60));
    }
    return {n, proben};
  };
  const labor = bedien.filter(el => !chrom(el));
  const wl = woerter(el => !chrom(el) && !zeichnung(el)), wf = woerter(() => true);
  const primaer = [...document.querySelectorAll(".primaer, .knopf-haupt")].filter(el => sichtbar(el));
  return {viewport: W + "x" + H, bedienLabor: labor.length, bedienFenster: bedien.length, woerterLabor: wl.n, woerterFenster: wf.n,
    primaer: primaer.length, primaerNamen: primaer.map(name), bedienListe: labor.map(name), woerterProben: wl.proben};
})()"""


def lauf(datei, ausgabe=None):
    """Szenario in EINER Sitzung (Fenstergröße per Emulation gilt nur, solange die Sitzung offen ist).
    Zeilen: groesse B H · eval JS · klick X Y · klick-auf[?] SEL[@fx,fy] · rechtsklick-auf SEL · ziehen-auf SEL | SEL · zeigen X Y · ziehen X1 Y1 X2 Y2 ·
            taste NAME · tippen TEXT · warte MS · shot DATEI · messen [NAME] · navigiere URL · # Kommentar"""
    ws = WS(seite())
    ws.fehler = []
    ws.rufen("Runtime.enable")
    ergebnisse = {}
    def js(ausdruck):
        r = ws.rufen("Runtime.evaluate", {"expression": f"(async () => {{ return {ausdruck} }})()" if "return" not in ausdruck and "\n" not in ausdruck and ";" not in ausdruck
                                          else f"(async () => {{ {ausdruck} }})()", "awaitPromise": True, "returnByValue": True})
        if "exceptionDetails" in r:
            raise SystemExit("JS-Fehler: " + json.dumps(r["exceptionDetails"].get("exception", {}).get("description") or r["exceptionDetails"].get("text"), ensure_ascii=False))
        return r.get("result", {}).get("value")
    def ev(typ, x, y, knoepfe=0, anzahl=0, mod=0):
        ws.rufen("Input.dispatchMouseEvent", {"type": typ, "x": x, "y": y, "button": "left" if typ != "mouseMoved" or knoepfe else "none",
                                              "buttons": knoepfe, "clickCount": anzahl, "pointerType": "mouse", "modifiers": mod})
    def klick(x, y, mod=0):
        ev("mouseMoved", x, y); ev("mousePressed", x, y, 1, 1, mod); ev("mouseReleased", x, y, 0, 1, mod)
    def rechtsklick(x, y):
        ws.rufen("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": x, "y": y, "button": "none", "buttons": 0, "pointerType": "mouse"})
        for typ in ("mousePressed", "mouseReleased"):
            ws.rufen("Input.dispatchMouseEvent", {"type": typ, "x": x, "y": y, "button": "right", "buttons": 2 if typ == "mousePressed" else 0, "clickCount": 1, "pointerType": "mouse"})
    def punkt(ziel):
        """CSS-Selektor, optional @fx,fy (Anteil im Element, Standard Mitte) → [x, y] oder None"""
        sel, _, anteil = ziel.partition("@")
        fx, fy = (float(v) for v in anteil.split(",")) if anteil else (0.5, 0.5)
        return js(f"return (() => {{ const e = [...document.querySelectorAll({json.dumps(sel.strip())})].find(e => e.getClientRects().length); if (!e) return null; "
                  f"if (!(e instanceof SVGElement)) e.scrollIntoView({{block: 'nearest'}}); const r = e.getBoundingClientRect(); return [r.left + r.width * {fx}, r.top + r.height * {fy}]; }})()")
    for zeile in Path(datei).read_text(encoding="utf-8").splitlines():
        zeile = zeile.strip()
        if not zeile or zeile.startswith("#"):
            continue
        befehl, _, rest = zeile.partition(" ")
        if befehl == "groesse" and rest.strip() == "aus":
            ws.rufen("Emulation.clearDeviceMetricsOverride"); time.sleep(0.4)
        elif befehl == "groesse":
            b, h = (int(x) for x in rest.split())
            ws.rufen("Emulation.setDeviceMetricsOverride", {"width": b, "height": h, "deviceScaleFactor": 1, "mobile": False})
            time.sleep(0.4)
        elif befehl == "eval":
            print(json.dumps({"eval": rest[:60], "wert": js(rest)}, ensure_ascii=False))
        elif befehl == "navigiere":
            ws.rufen("Page.navigate", {"url": rest}); time.sleep(2.5)
        elif befehl == "klick":
            x, y = (float(v) for v in rest.split()); klick(x, y)
        elif befehl in ("klick-auf", "klick-auf?"):
            p = punkt(rest)
            if not p:
                if befehl == "klick-auf?":
                    print(json.dumps({"übersprungen": rest}, ensure_ascii=False)); continue
                raise SystemExit(f"Nicht gefunden: {rest}")
            klick(*p)
        elif befehl == "rechtsklick-auf":
            p = punkt(rest)
            if not p:
                raise SystemExit(f"Nicht gefunden: {rest}")
            rechtsklick(*p)
        elif befehl == "ziehen-auf":
            von, _, nach = rest.partition("|")
            a, b = punkt(von.strip()), punkt(nach.strip())
            if not a or not b:
                raise SystemExit(f"Nicht gefunden: {von if not a else nach}")
            ev("mouseMoved", *a); time.sleep(0.1); ev("mousePressed", *a, 1, 1)
            for i in range(1, 13):
                ev("mouseMoved", a[0] + (b[0] - a[0]) * i / 12, a[1] + (b[1] - a[1]) * i / 12, 1); time.sleep(0.02)
            ev("mouseReleased", *b, 0, 1)
        elif befehl == "zeigen":
            ev("mouseMoved", *(float(v) for v in rest.split()))
        elif befehl == "ziehen":
            x1, y1, x2, y2 = (float(v) for v in rest.split())
            ev("mouseMoved", x1, y1); time.sleep(0.1); ev("mousePressed", x1, y1, 1, 1)
            for i in range(1, 13):
                ev("mouseMoved", x1 + (x2 - x1) * i / 12, y1 + (y2 - y1) * i / 12, 1); time.sleep(0.02)
            ev("mouseReleased", x2, y2, 0, 1)
        elif befehl == "taste":
            vk = SONDER.get(rest, ord(rest.upper()) if len(rest) == 1 else 0)
            for typ in ("rawKeyDown" if rest in SONDER else "keyDown", "keyUp"):
                ws.rufen("Input.dispatchKeyEvent", {"type": typ, "key": rest, "code": ("Key" + rest.upper()) if len(rest) == 1 else rest,
                                                    "text": rest if typ == "keyDown" and len(rest) == 1 else "", "windowsVirtualKeyCode": vk, "nativeVirtualKeyCode": vk})
        elif befehl == "tippen":
            ws.rufen("Input.insertText", {"text": rest})
        elif befehl == "warte":
            time.sleep(int(rest) / 1000)
        elif befehl == "shot":
            r = ws.rufen("Page.captureScreenshot", {"format": "png"})
            Path(rest).write_bytes(base64.b64decode(r["data"]))
            print(json.dumps({"shot": rest}, ensure_ascii=False))
        elif befehl == "messen":
            m = js("return " + MESSEN)
            ergebnisse[rest or f"messung{len(ergebnisse) + 1}"] = m
            print(json.dumps({"messen": rest, **{k: v for k, v in m.items() if k not in ("bedienListe", "woerterProben")}}, ensure_ascii=False))
        else:
            raise SystemExit(f"Unbekannter Schritt: {zeile}")
    ws.rufen("Emulation.clearDeviceMetricsOverride")
    print(json.dumps({"js-fehler": ws.fehler}, ensure_ascii=False))
    if ausgabe:
        Path(ausgabe).write_text(json.dumps(ergebnisse, ensure_ascii=False, indent=1), encoding="utf-8")


def stop():
    """Beendet NUR die Instanzen, die DIESER Lauf selbst gestartet hat (AGENTS.md Regel 1).

    Kein Beenden nach Namen: beendet wird ausschliesslich eine PID aus GESTARTET und nur, solange genau
    dieser Prozess noch laeuft (p.poll() is None) - damit ist eine PID-Wiederverwendung ausgeschlossen.
    /T nimmt die msedgewebview2-Kinder mit, damit keine Waisen zurueckbleiben."""
    if not GESTARTET:
        print("gestoppt: nichts zu beenden - in diesem Lauf wurde keine Instanz gestartet")
        return
    for p in GESTARTET:
        if p.poll() is not None:
            print(f"gestoppt: PID {p.pid} war schon beendet")
            continue
        r = subprocess.run(["taskkill", "/PID", str(p.pid), "/T", "/F"], capture_output=True, text=True)
        print(f"gestoppt: PID {p.pid} (taskkill {r.returncode})")
    GESTARTET.clear()


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        raise SystemExit(__doc__)
    if a[0] == "start":
        start(next((x for x in a[1:] if not x.startswith("--")), None), "--frisch" in a)
    elif a[0] == "eval":
        auswerten(a[1])
    elif a[0] == "shot":
        foto(a[1] if len(a) > 1 else "programm.png")
    elif a[0] == "klick":
        maus("klick", [float(a[1]), float(a[2])])
    elif a[0] == "ziehen":
        maus("ziehen", [float(x) for x in a[1:5]])
    elif a[0] == "zeigen":
        maus("zeigen", [float(a[1]), float(a[2])])
    elif a[0] == "taste":
        taste(a[1])
    elif a[0] == "tippen":
        tippen(a[1])
    elif a[0] == "lauf":
        lauf(a[1], a[2] if len(a) > 2 else None)
    elif a[0] == "stop":
        stop()
    else:
        raise SystemExit(__doc__)
