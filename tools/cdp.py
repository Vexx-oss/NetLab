"""Test im ECHTEN Programm (Windows, WebView2) über das Chrome DevTools Protocol – nur Python-Standardbibliothek.

  python tools/cdp.py start [exe] [--frisch]   Programm mit Fernsteuerungs-Port starten (eigener Datenordner, echter Spielstand bleibt unberührt)
  python tools/cdp.py eval "<js>"              JavaScript im Programm auswerten (await erlaubt), Ergebnis als JSON
  python tools/cdp.py shot bild.png            Bildschirmfoto der Seite
  python tools/cdp.py stop                     Programm beenden

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


def start(exe=None, frisch=False):
    exe = Path(exe) if exe else EXE
    if frisch and DATEN.exists():
        shutil.rmtree(DATEN, ignore_errors=True)
    DATEN.mkdir(parents=True, exist_ok=True)
    umgebung = dict(os.environ, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=f"--remote-debugging-port={PORT}", LABOR_DATEN=str(DATEN))
    subprocess.Popen([str(exe)], env=umgebung, creationflags=getattr(subprocess, "DETACHED_PROCESS", 0))
    for _ in range(60):
        try:
            seite()
            print(json.dumps({"gestartet": str(exe), "daten": str(DATEN)}, ensure_ascii=False))
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


def stop():
    subprocess.run(["taskkill", "/IM", "netzwerk-labor.exe", "/F"], capture_output=True)
    subprocess.run(["taskkill", "/IM", "Netzwerk-Labor.exe", "/F"], capture_output=True)
    print("gestoppt")


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
    elif a[0] == "stop":
        stop()
    else:
        raise SystemExit(__doc__)
