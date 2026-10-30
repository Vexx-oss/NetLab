"""Vorführ-/Kiosk-Fassung bauen: die Einzeldatei mit 60-Minuten-Rücksetzung.

WARUM: Bei einer Vorführung (Messe, Beamer, Computerraum) soll jeder Besucher bei 0
beginnen — nach spätestens einer Stunde setzt sich der Rechner selbst auf einen frischen
Spielstand zurück, und ein neues Fenster beginnt ebenfalls frisch. Das ist eine
AUSLIEFERUNGS-Variante, kein Bestandteil des Spiels: gelesen wird die fertige Einzeldatei,
geschrieben eine eigene Datei. Die normale Fassung bleibt byte-gleich; ihr Spielstand auf
demselben Rechner wird nicht angefasst (eigener Speicherplatz, siehe unten).

Die Fassung ist KEIN Kopierschutz: eine .html-Datei ist lesbar, und wer die normale
Fassung herunterlädt, spielt ohne Grenze. Sie ist eine Vorführhilfe, kein Verkaufsschloss.

Aufruf:
    python tools/kiosk.py                        -> Programm/Netzwerk-Labor-Demo.html (60 Minuten)
    python tools/kiosk.py --minuten 45           -> andere Dauer
    python tools/kiosk.py --ziel woanders.html   -> anderes Ziel
    python tools/kiosk.py --pruefen DATEI        -> nur prüfen, nichts schreiben
    python tools/kiosk.py --messen               -> Verhalten in Edge headless messen (kurze Dauer,
                                                    Rücksetzung, Frischstart, Speicher-Isolation,
                                                    Bildschirmfotos unter Nachweise/vorfuehrung/)

Was eingebaut wird (zwei Stellen, beide aus tools/kiosk/):
  1. VORLAUF im <head>, vor allen Spielskripten: eigener Spielstand beim ersten Öffnen,
     neuer Besuch = neuer Tab/Fenster; Neuladen (F5) behält den Stand; abgelaufene Stunde
     = frisch.
  2. ANZEIGE nach dem Spiel: kleiner Chip unten mit der Restzeit, nach Ablauf eine Karte
     und dann Neuladen.

Der eigene Speicherplatz entsteht durch drei Ersetzungen im Bau (siehe ERSETZUNGEN):
`const SCHLUESSEL = "netzwerk-labor";` (plattform-browser.js), der Frühstart
`window.localStorage.getItem("netzwerk-labor")` (kern/basis.js) und der Fenster-Wächter
`e.key !== "netzwerk-labor"` (ui/start.js) zeigen danach auf
`"netzwerk-labor-vorfuehrung"`. Damit liegen Vorführ- und normale Fassung auf demselben
Rechner in getrennten Speichern; die Rücksetzung löscht nur den Vorführ-Speicher. Die
Format-Kennung `"format": "netzwerk-labor"` für Export/Import bleibt unangetastet.

Nur Python-Standardbibliothek; der Browser-Teil benutzt die Helfer aus tools/starttest.py
und tools/einfach.py (keine Installation).
"""
import argparse
import hashlib
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
TOOLS = HIER / "tools"
sys.path.insert(0, str(TOOLS))
import einfach  # noqa: E402  (nur die Prüfungen für Außenverweise/Lizenzblock)
import starttest  # noqa: E402  (nur der Browser-Teil: WS, browser(), warte_auf_port())

QUELLE = HIER / "Netzwerk-Labor.html"
KONTROLLE = HIER / "docs" / "index.html"
PAYLOADS = TOOLS / "kiosk"
VORLAUF = PAYLOADS / "vorlauf.js"
ANZEIGE = PAYLOADS / "anzeige.js"
ZIEL = HIER / "Programm" / "Netzwerk-Labor-Demo.html"
BILDER = HIER / "Nachweise" / "vorfuehrung"

MARKER = "KIOSK-DEMO eingefuegt von tools/kiosk.py"
APP_KEY_ALT = "netzwerk-labor"
APP_KEY = "netzwerk-labor-vorfuehrung"
START_KEY = "netzwerk-labor-vorfuehrung-start"
SITZUNG_KEY = "netzwerk-labor-vorfuehrung-sitzung"
TITEL_ALT = "<title>Netzwerk-Labor</title>"
TITEL_NEU = "<title>Netzwerk-Labor – Vorführung</title>"
LIZENZ_TAG = '<script type="text/plain" id="lizenzhinweise">'

# Jede Stelle, an der die Einzeldatei den Speicherplatz der normalen Fassung nennt, muss auf den
# eigenen Vorführ-Speicher zeigen. Sonst läse der Frühstart in kern/basis.js den leeren normalen
# Speicher, hielte den Stand für „keiner da" und schriebe beim ersten Speichern einen frischen
# Stand über den Vorführ-Speicher — die Rücksetzung wäre dann bei jedem Neuladen statt nach 60
# Minuten. Das dritte Muster ist der Fenster-Wächter in ui/start.js (zwei Fenster auf einem Stand).
# Die Format-Kennung "format": "netzwerk-labor" für Export/Import bleibt ABSICHTLICH unangetastet.
ERSETZUNGEN = [
    ('const SCHLUESSEL = "netzwerk-labor";',
     'const SCHLUESSEL = "netzwerk-labor-vorfuehrung";'),
    ('window.localStorage.getItem("netzwerk-labor")',
     'window.localStorage.getItem("netzwerk-labor-vorfuehrung")'),
    ('e.key !== "netzwerk-labor"',
     'e.key !== "netzwerk-labor-vorfuehrung"'),
]


# ---------------------------------------------------------------- Bauen

def lies(pfad: Path) -> str:
    return pfad.read_text(encoding="utf-8")


def minuten_text(minuten: float) -> str:
    if float(minuten).is_integer():
        return f"{int(minuten)} Minuten"
    return f"{minuten:g} Minuten ({round(minuten * 60, 1):g} s)"


def baue(minuten: float, ziel: Path, quelle: Path = QUELLE, still: bool = False) -> str:
    """Baut die Vorführ-Fassung nach `ziel` und gibt den HTML-Text zurück."""
    if minuten <= 0:
        raise SystemExit("FEHLER: --minuten muss größer als 0 sein.")
    if not quelle.is_file():
        raise SystemExit(f"FEHLER: {quelle} fehlt — zuerst `python tools/einfach.py` laufen lassen.")

    # Grundlage prüfen: die Wurzel-Datei und docs/index.html sind laut tools/stand.py
    # byte-gleich. Weichen sie voneinander ab, ist unklar, welcher Bau gemeint ist.
    if quelle == QUELLE and KONTROLLE.is_file():
        a = hashlib.sha256(quelle.read_bytes()).hexdigest()
        b = hashlib.sha256(KONTROLLE.read_bytes()).hexdigest()
        if a != b:
            raise SystemExit(
                f"FEHLER: Netzwerk-Labor.html und docs/index.html sind nicht byte-gleich.\n"
                f"  {quelle.name}: {a}\n  docs/index.html: {b}\n"
                "  Beide neu bauen: python tools/einfach.py && python tools/einfach.py --ziel Netzwerk-Labor.html")

    html = lies(quelle)
    if MARKER in html:
        raise SystemExit(f"FEHLER: {quelle} ist bereits eine Vorführ-Fassung — normale Einzeldatei bauen.")
    if LIZENZ_TAG not in html:
        raise SystemExit("FEHLER: Lizenzblock fehlt in der Quelle — das ist kein aktueller Einzeldatei-Bau.")

    # 1. Titel (nur im echten <head>, nicht in simulierten HTML-Zeichenketten im Spielcode)
    if "</head>" not in html:
        raise SystemExit("FEHLER: kein </head> in der Quelle gefunden.")
    kopf, rest = html.split("</head>", 1)
    if kopf.count(TITEL_ALT) != 1:
        raise SystemExit("FEHLER: <title>Netzwerk-Labor</title> im <head> nicht genau einmal gefunden — falsche Quelle?")
    kopf = kopf.replace(TITEL_ALT, TITEL_NEU, 1)
    html = kopf + "</head>" + rest

    # 2. Eigener Speicherplatz, damit die normale Fassung unberührt bleibt.
    for alt, neu in ERSETZUNGEN:
        if html.count(alt) != 1:
            raise SystemExit(f"FEHLER: Speicher-Stelle nicht genau einmal gefunden ({html.count(alt)}×):\n  {alt}")
        html = html.replace(alt, neu, 1)

    # 3. Vorlauf in den <head> (vor allen Spielskripten).
    if html.find("<head>") < 0 or html.find("<body>") < html.find("<head>"):
        raise SystemExit("FEHLER: <head>/<body> nicht in erwarteter Reihenfolge gefunden.")
    vorlauf = (lies(VORLAUF)
               .replace("__MINUTEN__", str(minuten))
               .replace("__APP_KEY__", APP_KEY)
               .replace("__START_KEY__", START_KEY)
               .replace("__SITZUNG_KEY__", SITZUNG_KEY))
    html = html.replace("<head>", "<head>\n<!-- " + MARKER + " (Vorlauf) -->\n<script>\n" + vorlauf + "\n</script>", 1)

    # 4. Anzeige NACH dem Spiel, aber VOR dem Lizenzblock. Diese Stelle ist Pflicht: der
    #    Lizenzblock muss hinter dem letzten </script> stehen (Prüfung in tools/einfach.py),
    #    und genau das ist er in jeder Einzeldatei aus tools/einfach.py — also davor einhängen.
    stelle = html.find(LIZENZ_TAG)
    if stelle < 0:
        raise SystemExit("FEHLER: Lizenzblock nicht gefunden — sichere Einbaustelle fehlt.")
    anzeige = lies(ANZEIGE)
    html = html[:stelle] + "<!-- " + MARKER + " (Anzeige) -->\n<script>\n" + anzeige + "\n</script>\n" + html[stelle:]

    # 5. Pflichtprüfungen: kein Platzhalter übrig, keine Außenverweise, Lizenzblock heil.
    for platzhalter in ("__MINUTEN__", "__APP_KEY__", "__START_KEY__", "__SITZUNG_KEY__"):
        if platzhalter in html:
            raise SystemExit(f"FEHLER: Platzhalter {platzhalter} wurde nicht ersetzt.")
    if html.count(MARKER) != 2:
        raise SystemExit(f"FEHLER: Marker nicht genau zweimal enthalten ({html.count(MARKER)}×).")
    rest_verweise = einfach.aussenverweise(html)
    if rest_verweise:
        raise SystemExit("FEHLER: Außenverweise in der Vorführ-Fassung:\n  " + "\n  ".join(rest_verweise))
    if einfach.LIZENZ_MARKE not in html:
        raise SystemExit("FEHLER: Lizenzblock ist beim Einbau verloren gegangen.")
    for alt, neu in ERSETZUNGEN:
        if html.count(neu) != 1 or alt in html:
            raise SystemExit("FEHLER: Speicherplatz wurde nicht sauber ersetzt: " + alt)

    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(html, encoding="utf-8", newline="\n")
    roh = ziel.read_bytes()
    sha = hashlib.sha256(roh).hexdigest()
    if not still:
        quell_roh = quelle.read_bytes()
        print(f"Vorführ-Fassung -> {ziel}")
        print(f"  Grundlage   {quelle.name} ({len(quell_roh):,} B, SHA256 {hashlib.sha256(quell_roh).hexdigest()[:16]}…)")
        print(f"  Dauer       {minuten_text(minuten)}, Rücksetzung eigenständig")
        print(f"  Größe       {len(roh):,} B ({len(roh) / 1024 / 1024:.2f} MB)")
        print(f"  SHA256      {sha}")
        print(f"  Speicher    {APP_KEY} (normale Fassung: netzwerk-labor, bleibt unberührt)")
        print(f"  Prüfungen   0 Außenverweise · Lizenzblock enthalten · 2 Einschübe")
    return html


# ---------------------------------------------------------------- Prüfen

def pruefen(pfad: Path) -> int:
    if not pfad.is_file():
        print(f"ROT: {pfad} fehlt — bauen mit: python tools/kiosk.py")
        return 1
    html = lies(pfad)
    roh = pfad.read_bytes()
    rot = 0

    def zeile(ok: bool, name: str, text: str = "") -> None:
        nonlocal rot
        if not ok:
            rot += 1
        print(f"{'ok  ' if ok else 'ROT '} {name:<38} {text}")

    print(f"Prüfe {pfad} ({len(roh):,} B, SHA256 {hashlib.sha256(roh).hexdigest()[:16]}…)")
    zeile(html.count(MARKER) == 2, "Einschübe (Vorlauf + Anzeige)", f"{html.count(MARKER)}/2")
    zeile(all(neu in html for _, neu in ERSETZUNGEN) and not any(alt in html for alt, _ in ERSETZUNGEN),
          "eigener Speicherplatz", f"{len(ERSETZUNGEN)} Stellen · {APP_KEY}")
    zeile(LIZENZ_TAG in html, "Lizenzblock vorhanden")
    zeile(TITEL_NEU in html, "Titel", TITEL_NEU)
    zeile("window.__vorfuehrung" in html, "Vorlauf-Marke")
    zeile("#vf-chip" in html or "vf-chip" in html, "Anzeige-Chip")
    zeile("__MINUTEN__" not in html, "keine Platzhalter übrig")
    rest = einfach.aussenverweise(html)
    zeile(rest == [], "Außenverweise", f"{len(rest)}")
    import re
    m = re.search(r"var MINUTEN = ([0-9.]+);", html)
    zeile(bool(m), "Dauer", minuten_text(float(m.group(1))) if m else "nicht gefunden")
    print(f"\n{'GRÜN: Vorführ-Fassung in Ordnung' if not rot else f'ROT: {rot} Befund(e)'}")
    return 0 if not rot else 1


# ---------------------------------------------------------------- Messen (Edge headless)

class Seite:
    """Dünner Mantel um den WS-Client aus tools/starttest.py mit Wiederholung bei Navigation."""

    def __init__(self, ws_url: str):
        self.ws = starttest.WS(ws_url)
        self.fehler = []
        self.ws.fehler = self.fehler
        self.ws.rufen("Runtime.enable")
        self.ws.rufen("Page.enable")

    def js(self, ausdruck: str, warten: bool = False, geduld: float = 10.0):
        ende = time.time() + geduld
        letzter = "Zeit abgelaufen"
        while time.time() < ende:
            try:
                r = self.ws.rufen("Runtime.evaluate",
                                  {"expression": ausdruck, "returnByValue": True, "awaitPromise": warten})
            except SystemExit:
                raise
            if "exceptionDetails" in r:
                d = r["exceptionDetails"]
                letzter = ((d.get("exception", {}) or {}).get("description")
                           or d.get("text") or "JS-Fehler")
                time.sleep(0.2)
                continue
            return r.get("result", {}).get("value")
        raise RuntimeError(letzter)

    def warte_bis(self, ausdruck: str, sekunden: float = 30.0, geduld: float = 6.0):
        ende = time.time() + sekunden
        while time.time() < ende:
            try:
                if self.js(ausdruck, geduld=geduld):
                    return True
            except RuntimeError:
                pass
            time.sleep(0.3)
        return False

    def bild(self, pfad: Path) -> None:
        shot = self.ws.rufen("Page.captureScreenshot", {"format": "png"})
        pfad.parent.mkdir(parents=True, exist_ok=True)
        pfad.write_bytes(__import__("base64").b64decode(shot["data"]))


APP_BEREIT = ("(() => { const a = document.getElementById('app');"
              " return !!(a && a.children.length && typeof Spiel !== 'undefined' && Spiel.st); })()")


def freier_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def browser_oeffnen(datei: Path, profil: Path, port: int):
    exe = starttest.browser()
    argumente = [str(exe), "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
                 "--disable-sync", "--disable-extensions", "--disable-component-update", "--no-service-autorun",
                 "--disable-background-networking", "--disable-client-side-phishing-detection",
                 "--disable-features=msEdgeIdentityFluentUI,msEdgeSyncPromo,msImplicitSignin,EdgeCollectionsPrompt",
                 "--window-size=1366,768", f"--remote-debugging-port={port}", f"--user-data-dir={profil}",
                 datei.as_uri()]
    return subprocess.Popen(argumente, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def browser_schliessen(prozess) -> None:
    """Beendet NUR den Prozess, den dieser Lauf selbst gestartet hat (AGENTS.md Regel 1)."""
    if prozess is None or prozess.poll() is not None:
        return
    prozess.terminate()
    try:
        prozess.wait(timeout=15)
    except subprocess.TimeoutExpired:
        prozess.kill()
        prozess.wait(timeout=10)


def probe_mit_fehler_sammler(quelle: Path, ziel: Path) -> None:
    """Arbeitskopie mit Fehlersammler direkt nach <head> — zählt JS-Fehler ab dem ersten Byte."""
    text = lies(quelle)
    if "<head>" not in text:
        raise SystemExit("FEHLER: kein <head> in der Probefassung.")
    ziel.write_text(text.replace("<head>", "<head>" + starttest.FEHLERSAMMLER, 1), encoding="utf-8", newline="\n")


def messen() -> int:
    proben = Path(tempfile.mkdtemp(prefix="nl-kiosk-"))
    profile = {name: Path(tempfile.mkdtemp(prefix=f"nl-kiosk-{name}-")) for name in ("kurz", "start")}
    BILDER.mkdir(parents=True, exist_ok=True)
    zeilen = []

    def pruefe(name: str, ok: bool, text: str = "") -> None:
        zeilen.append((ok, name, text))
        print(f"{'ok  ' if ok else 'ROT '} {name:<44} {text}")

    sha_vorher = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in (QUELLE, KONTROLLE)}
    kurz = proben / "demo-kurz.html"
    voll = proben / "demo-voll.html"
    baue(0.15, kurz, still=True)
    baue(60, voll, still=True)
    probe_kurz, probe_voll = proben / "probe-kurz.html", proben / "probe-voll.html"
    probe_mit_fehler_sammler(kurz, probe_kurz)
    probe_mit_fehler_sammler(voll, probe_voll)

    prozess = None
    try:
        # ---------- A: Ablauf und Rücksetzung (kurze Dauer = 9 s) ----------
        port = freier_port()
        prozess = browser_oeffnen(probe_kurz, profile["kurz"], port)
        ws = Seite(starttest.warte_auf_port(port))
        if not ws.warte_bis(APP_BEREIT):
            raise SystemExit("ROT: die Vorführ-Fassung startet in Edge nicht (kein #app).")
        time.sleep(0.5)
        anfang = ws.js("""(() => {
          const V = window.__vorfuehrung || {}, chip = document.querySelector('#vf-chip');
          return {
            titel: document.title,
            chip: chip ? chip.textContent : null,
            chipSichtbar: !!chip && chip.getBoundingClientRect().width > 0,
            chipUnten: chip ? Math.round(chip.getBoundingClientRect().bottom) : null,
            start: V.start || null, dauer: V.dauer || null,
            rest: V.rest ? Math.round(V.rest()) : null,
            appKey: V.appKey || null,
            normalKey: localStorage.getItem('netzwerk-labor'),
            euro: Spiel.st.euro, stufe: Spiel.st.stufe,
          };
        })()""")
        pruefe("Start: Chip sichtbar", bool(anfang["chipSichtbar"]),
               f"„{anfang['chip']}“ · unterer Rand {anfang['chipUnten']} px")
        pruefe("Start: Dauer 9 s gesetzt", anfang["dauer"] == 9000, f"{anfang['dauer']} ms")
        pruefe("Start: Restzeit plausibel", bool(anfang["rest"] is not None and 3000 < anfang["rest"] <= 9000),
               f"{anfang['rest']} ms")
        pruefe("Start: Titel", "Vorführung" in str(anfang["titel"]), str(anfang["titel"]))
        pruefe("Start: frischer Spielstand", anfang["euro"] == 0 and anfang["stufe"] == 1,
               f"{anfang['euro']} € · Stufe {anfang['stufe']}")
        pruefe("Start: normaler Speicher unberührt", anfang["normalKey"] is None,
               f"localStorage[netzwerk-labor] = {anfang['normalKey']!r}")

        rest1 = ws.js("Math.round(window.__vorfuehrung.rest())")
        time.sleep(1.3)
        rest2 = ws.js("Math.round(window.__vorfuehrung.rest())")
        pruefe("Anzeige: Restzeit läuft", bool(rest2 < rest1), f"{rest1} → {rest2} ms")

        gesetzt = ws.js("""(async () => {
          Spiel.st.euro = 4242; Spiel.st.ruf = 7; Spiel.st.stufe = 2;
          Spiel.speichern(); await store.sofort();
          const roh = localStorage.getItem(window.__vorfuehrung.appKey) || '';
          return {euro: Spiel.st.euro, gespeichert: roh.indexOf('4242') >= 0};
        })()""", warten=True)
        pruefe("Vorbereitung: Fortschritt gespeichert", gesetzt["euro"] == 4242 and gesetzt["gespeichert"],
               "4.242 € im Vorführ-Speicher")

        alt_start = anfang["start"]
        neu, overlay_zeit = None, None
        ende = time.time() + 30
        while time.time() < ende:
            try:
                z = ws.js("""(() => {
                  const V = window.__vorfuehrung, ov = document.querySelector('#vf-reset');
                  return {ov: !!ov, start: V ? V.start : 0,
                          app: (document.getElementById('app') || {children: []}).children.length,
                          euro: (typeof Spiel !== 'undefined' && Spiel.st) ? Spiel.st.euro : null};
                })()""", geduld=4.0)
            except RuntimeError:
                time.sleep(0.2)
                continue
            if z and z["ov"] and overlay_zeit is None:
                overlay_zeit = time.time()
                try:
                    ws.bild(BILDER / "kiosk-ruecksetzung.png")
                except Exception:
                    pass
            if z and z["start"] and z["start"] != alt_start and z["app"] and z["euro"] == 0:
                neu = z
                break
            time.sleep(0.25)
        pruefe("Ablauf: Rücksetzung ausgelöst", neu is not None,
               "Neuladen nach Ablauf gesehen" if neu else "nicht gesehen")
        if overlay_zeit is not None:
            pruefe("Ablauf: Hinweiskarte sichtbar (Foto)", True, "Nachweise/vorfuehrung/kiosk-ruecksetzung.png")
        if neu is not None:
            time.sleep(0.5)
            nachher = ws.js("""(() => {
              const V = window.__vorfuehrung || {}, chip = document.querySelector('#vf-chip');
              return {start: V.start, dauer: V.dauer, rest: Math.round((V.rest ? V.rest() : 0)),
                      euro: Spiel.st.euro, ruf: Spiel.st.ruf, stufe: Spiel.st.stufe,
                      erledigt: Spiel.st.erledigt.length,
                      chip: chip ? chip.textContent : null,
                      normalKey: localStorage.getItem('netzwerk-labor'),
                      demoKey: (localStorage.getItem(V.appKey || '-') || '').length};
            })()""")
            pruefe("Nach Ablauf: frischer Spielstand", nachher["euro"] == 0 and nachher["ruf"] == 0
                   and nachher["stufe"] == 1 and nachher["erledigt"] == 0,
                   f"{nachher['euro']} € · {nachher['ruf']} Ruf · Stufe {nachher['stufe']} · "
                   f"{nachher['erledigt']} erledigt")
            pruefe("Nach Ablauf: neue Stunde beginnt", nachher["start"] != alt_start and nachher["rest"] > 3000,
                   f"Rest {nachher['rest']} ms")
            pruefe("Nach Ablauf: Chip wieder da", bool(nachher["chip"]), f"„{nachher['chip']}“")
            pruefe("Nach Ablauf: normaler Speicher unberührt", nachher["normalKey"] is None,
                   f"localStorage[netzwerk-labor] = {nachher['normalKey']!r}")
            try:
                ws.bild(BILDER / "kiosk-chip.png")
                pruefe("Foto der laufenden Vorführung", True, "Nachweise/vorfuehrung/kiosk-chip.png")
            except Exception:
                pass
        js_fehler = [f for f in ws.fehler if "__TAURI" not in str(f)]
        pruefe("JS-/Konsolenfehler (Lauf 1)", not js_fehler, f"{len(js_fehler)}")
        browser_schliessen(prozess)
        prozess = None

        # ---------- B: Neustart (neues Fenster) beginnt frisch ----------
        port = freier_port()
        prozess = browser_oeffnen(probe_voll, profile["start"], port)
        ws = Seite(starttest.warte_auf_port(port))
        if not ws.warte_bis(APP_BEREIT):
            raise SystemExit("ROT: die 60-Minuten-Fassung startet in Edge nicht.")
        time.sleep(0.4)
        gesetzt = ws.js("""(async () => {
          Spiel.st.euro = 999; Spiel.st.stufe = 3;
          Spiel.speichern(); await store.sofort();
          const V = window.__vorfuehrung;
          return {euro: Spiel.st.euro, startKey: localStorage.getItem(V.startKey),
                  imSpeicher: (localStorage.getItem(V.appKey) || '').indexOf('999') >= 0,
                  appKeyLen: (localStorage.getItem(V.appKey) || '').length};
        })()""", warten=True)
        pruefe("Neustart-Vorbereitung: 999 € gespeichert", gesetzt["euro"] == 999 and gesetzt["imSpeicher"],
               f"Start {gesetzt['startKey']} · Speicher {gesetzt['appKeyLen']} B")
        # Neu laden (gleiche Sitzung) muss den Fortschritt BEHALTEN
        try:
            ws.js("location.reload(); 1", geduld=3.0)
        except RuntimeError:
            pass
        if ws.warte_bis(APP_BEREIT):
            time.sleep(0.6)
            nach_reload = ws.js("""(() => {
              const V = window.__vorfuehrung || {};
              let sitzung = "?", startKey = "?", appKeyLen = -1;
              try { sitzung = sessionStorage.getItem(V.sitzungKey); } catch(e){ sitzung = "FEHLER:" + e; }
              try { startKey = localStorage.getItem(V.startKey); } catch(e){ startKey = "FEHLER"; }
              try { appKeyLen = (localStorage.getItem(V.appKey) || "").length; } catch(e){ appKeyLen = -1; }
              return {euro: Spiel.st.euro, stufe: Spiel.st.stufe, frisch: V.frisch,
                      sitzung: sitzung, startKey: startKey, appKeyLen: appKeyLen, fehler: V.fehler};
            })()""")
            pruefe("Neuladen (F5): Fortschritt bleibt", nach_reload["euro"] == 999,
                   f"{nach_reload['euro']} € · Sitzung {nach_reload['sitzung']!r} · "
                   f"Start {nach_reload['startKey']} · Speicher {nach_reload['appKeyLen']} B · "
                   f"frisch {nach_reload['frisch']} · Fehler {nach_reload['fehler']!r}")
        else:
            pruefe("Neuladen (F5): Fortschritt bleibt", False, "Seite kam nach dem Neuladen nicht hoch")
        browser_schliessen(prozess)
        prozess = None

        # Neues Fenster (neuer Browserstart) muss FRISCH beginnen
        port = freier_port()
        prozess = browser_oeffnen(probe_voll, profile["start"], port)
        ws = Seite(starttest.warte_auf_port(port))
        if not ws.warte_bis(APP_BEREIT):
            raise SystemExit("ROT: zweiter Start der 60-Minuten-Fassung scheitert.")
        time.sleep(0.4)
        frisch = ws.js("""(() => {
          const V = window.__vorfuehrung || {};
          return {euro: Spiel.st.euro, stufe: Spiel.st.stufe, rest: Math.round((V.rest ? V.rest() : 0)),
                  normalKey: localStorage.getItem('netzwerk-labor'), chip: (document.querySelector('#vf-chip') || {}).textContent};
        })()""")
        pruefe("Neues Fenster: Fortschritt zurücksetzt", frisch["euro"] == 0 and frisch["stufe"] == 1,
               f"{frisch['euro']} € · Stufe {frisch['stufe']} (vorher 999 €)")
        pruefe("Neues Fenster: volle Stunde läuft", frisch["rest"] > 3500000,
               f"Rest {frisch['rest']} ms · Chip „{frisch['chip']}“")
        js_fehler = [f for f in ws.fehler if "__TAURI" not in str(f)]
        pruefe("JS-/Konsolenfehler (Lauf 2)", not js_fehler, f"{len(js_fehler)}")

        # ---------- C: Quelle unberührt ----------
        sha_nachher = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in (QUELLE, KONTROLLE)}
        pruefe("Grundlage unberührt (SHA256)", sha_vorher == sha_nachher, "Netzwerk-Labor.html + docs/index.html")
    finally:
        browser_schliessen(prozess)
        shutil.rmtree(proben, ignore_errors=True)
        for p in profile.values():
            shutil.rmtree(p, ignore_errors=True)

    ok = sum(1 for z in zeilen if z[0])
    rot = len(zeilen) - ok
    print(f"\n{ok}/{len(zeilen)} grün" + ("" if not rot else f" — {rot} rot") + f"\nBilder: {BILDER}")
    return 0 if rot == 0 else 1


# ---------------------------------------------------------------- Kommandozeile

def main() -> int:
    ap = argparse.ArgumentParser(description="Vorführ-Fassung (Kiosk) der Einzeldatei bauen und prüfen")
    ap.add_argument("--minuten", type=float, default=60, help="Dauer bis zur Rücksetzung (Standard 60)")
    ap.add_argument("--ziel", type=Path, default=ZIEL, help=f"Zieldatei (Standard {ZIEL.relative_to(HIER)})")
    ap.add_argument("--pruefen", type=Path, metavar="DATEI", help="nur prüfen, nichts schreiben")
    ap.add_argument("--messen", action="store_true", help="Verhalten in Edge headless messen (dauert ~1 Minute)")
    a = ap.parse_args()
    if a.pruefen:
        return pruefen(a.pruefen)
    if a.messen:
        return messen()
    baue(a.minuten, a.ziel)
    return 0


if __name__ == "__main__":
    sys.exit(main())
