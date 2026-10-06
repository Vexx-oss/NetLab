"""Gesamtabnahme: alles bauen, alles prüfen, ehrlich berichten.

Ein Befehl, der die Kette vollständig durchläuft — Bauen, Testen, Verpacken und die
Gegenprobe am fertigen Paket. Gedacht als letzter Schritt vor einem Commit oder einer
Release, und als Antwort auf die Frage „ist der Stand wirklich heil?".

Aufruf: python tools/abnahme.py

Was NICHT geprüft wird (ehrlich): die Windows-.exe. Sie braucht ein Fenster, einen
laufenden WebView2 und darf nicht neben einer bereits laufenden Instanz starten. Wer sie
messen will: tools/q-echt.py (AGENTS.md Regel 1 — es wird kein fremder Prozess beendet).
"""
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
# Ohne das schreibt Python auf Windows in die Konsolencodepage und ein Gedankenstrich
# aus einer Unterausgabe wird zu "?" — die Zeile waere dann nicht mehr lesbar.
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HIER = Path(__file__).resolve().parent.parent
PY = sys.executable
ERGEBNISSE: list[tuple[str, bool, str]] = []


def finde_node() -> str:
    """Node finden wie tools/test.sh: ausdruecklich gesetzt, portabel, sonst aus dem PATH."""
    kandidaten = [
        os.environ.get("NODE"),
        str(Path(os.environ.get("LOCALAPPDATA", "")) / "node-portable" / "node-v24.21.0-win-x64" / "node.exe"),
        r"C:\Users\Student\AppData\Local\node-portable\node-v24.21.0-win-x64\node.exe",
        shutil.which("node"),
    ]
    for k in kandidaten:
        if k and Path(k).is_file():
            return k
    raise SystemExit("FEHLER: kein Node gefunden. Node 24 installieren oder NODE=/pfad/zu/node setzen.")


NODE = finde_node()


def lauf(name: str, befehl: list[str], muss: str | None = None, shell: bool = False) -> str:
    t0 = time.time()
    r = subprocess.run(befehl, cwd=HIER, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", shell=shell, timeout=1800)
    aus = (r.stdout or "") + (r.stderr or "")
    ok = r.returncode == 0 and (muss is None or muss in aus)
    dauer = time.time() - t0
    letzte = [z for z in aus.strip().splitlines() if z.strip()]
    kurz = letzte[-1][:110] if letzte else "(keine Ausgabe)"
    ERGEBNISSE.append((name, ok, kurz))
    zeichen = "GRUEN" if ok else "ROT  "
    print(f"  [{zeichen}] {name:<44} {dauer:5.1f}s  {kurz}")
    return aus


def main() -> int:
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', (HIER / "bauen.py").read_text(encoding="utf-8"), re.M)
    version = m.group(1) if m else "?"
    print(f"Gesamtabnahme Netzwerk-Labor {version}")
    print(f"  Ordner {HIER}")
    print()

    print("1 · Tests und Prüfungen")
    bash = ["C:\\Program Files\\Git\\bin\\bash.exe", "-c",
            'export PATH=/usr/bin:/bin:$PATH; sh tools/test.sh']
    lauf("Tests headless (Node)", bash, muss="grün")
    lauf("Klassen im JS gegen CSS", [PY, "tools/klassen.py"], muss="0 Klassen ohne CSS-Regel")
    lauf("Simulation gegen Referenzstand", [NODE, "tools/sim-stand.js"])
    lauf("Lernmotor-Kopie gegen Quelle", [PY, "tools/lernmotor.py"], muss="GRUEN")
    lauf("Bau mit und ohne Spielhalle gleich", [PY, "tools/lernmotor-bau.py"], muss="GRUEN")
    lauf("Tests + Simulation ohne Spielhalle", [PY, "tools/lernmotor-rueckfall.py"], muss="GRUEN")
    lauf("GitHub-Ablaeufe gueltig", [PY, "tools/ablaeufe.py"], muss="GRUEN")
    lauf("CI-Nachbau (frischer Klon, keine Spielhalle)", [PY, "tools/ci-nachbau.py"], muss="GRUEN")

    print()
    print("2 · Bauen")
    lauf("Programm-Fassung (bauen.py)", [PY, "bauen.py"])
    lauf("Einzeldatei (docs/index.html)", [PY, "tools/einfach.py"], muss="Aussenverweise  0")
    lauf("Einzeldatei prüfen", [PY, "tools/einfach.py", "--pruefen"], muss="GRUEN")
    lauf("Bilder der Doku prüfen", [PY, "tools/bilder.py", "--pruefen"], muss="GRUEN")

    print()
    print("3 · Start im echten Browser")
    lauf("Einzeldatei starten und messen", [PY, "tools/starttest.py"], muss="GRUEN")

    print()
    print("4 · Auslieferungspaket")
    aus = lauf("Paket bauen (Ordner + ZIP)", [PY, "tools/paket.py"], muss="GRUEN")
    zip_pfad = None
    for zeile in aus.splitlines():
        if zeile.strip().startswith("ZIP ->"):
            zip_pfad = Path(zeile.split("->", 1)[1].strip())
    if zip_pfad and zip_pfad.is_file():
        import zipfile
        with zipfile.ZipFile(zip_pfad) as z:
            kaputt = z.testzip()
            namen = z.namelist()
        ok = kaputt is None
        ERGEBNISSE.append(("ZIP zurueckgelesen (CRC32)", ok, f"{len(namen)} Dateien"))
        print(f"  [{'GRUEN' if ok else 'ROT  '}] {'ZIP zurueckgelesen (CRC32)':<44} {'':5}  {len(namen)} Dateien"
              + (f", Fehler in {kaputt}" if kaputt else ""))

        # Die entpackte Einzeldatei ein zweites Mal starten - genau der Weg des Nutzers.
        # Ordnername aus der Ordnerausgabe des Paketbaus lesen ("Zielordner <pfad>");
        # NICHT aus dem ZIP-Namen ableiten, der traegt zusaetzlich "-Windows"/"-Browser".
        ordner = None
        for zeile in aus.splitlines():
            if zeile.strip().startswith("Zielordner "):
                ordner = Path(zeile.strip().split(" ", 1)[1])
        if ordner and (ordner / "Netzwerk-Labor.html").is_file():
            lauf("Entpackte Einzeldatei starten",
                 [PY, "tools/starttest.py", str(ordner / "Netzwerk-Labor.html")], muss="GRUEN")
        else:
            ERGEBNISSE.append(("Entpackte Einzeldatei starten", False, "Paketordner nicht gefunden"))
            print(f"  [ROT  ] {'Entpackte Einzeldatei starten':<44} {'':5}  Paketordner nicht gefunden")
    else:
        ERGEBNISSE.append(("ZIP zurueckgelesen (CRC32)", False, "kein ZIP gefunden"))
        print("  [ROT  ] ZIP zurueckgelesen (CRC32)              kein ZIP gefunden")

    print()
    print("5 · Die veroeffentlichte Seite (braucht Internet)")
    lauf("Kundenadresse liefert das Spiel", [PY, "tools/seite-pruefen.py"], muss="GRUEN")

    print()
    rot = [n for n, ok, _ in ERGEBNISSE if not ok]
    print(f"{len(ERGEBNISSE) - len(rot)}/{len(ERGEBNISSE)} grün")
    if rot:
        print("ROT:")
        for n in rot:
            print("  - " + n)
    print()
    print("NICHT geprüft: die Windows-.exe (braucht ein Fenster; laufende Instanz vorhanden).")
    print("               Wer sie messen will: python tools/q-echt.py")
    return 1 if rot else 0


if __name__ == "__main__":
    sys.exit(main())
