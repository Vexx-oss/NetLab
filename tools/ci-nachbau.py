"""Nachbau der Pruefung auf GitHub: frischer Klon, KEINE Nachbar-Spielhalle.

Warum: Am 05.10.2026 lief die Pruefung auf GitHub rot, und die Protokolle liessen sich
ohne Anmeldung nicht lesen. Statt zu raten, baut dieses Werkzeug denselben Zustand hier
nach — einen frischen Klon in einem Ordner OHNE `../FISI-Spielhalle` — und fuehrt genau
die Schritte aus, die `.github/workflows/` aufruft.

Damit findet man hier, was auf GitHub scheitert: fehlende Rueckfallwege, feste Pfade,
Annahmen ueber die Nachbarordner.

Aufruf: python tools/ci-nachbau.py
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent

# Auf GitHub liegen `sh` und `node` im PATH. Auf diesem Windows-Rechner nicht: dort gibt
# es Git-Bash und ein portables Node. Beide werden hier aufgeloest und den Schritten
# vorangestellt, damit der Nachbau dieselben Befehle fahren kann wie die Pruefung.
GIT_BASH = Path(r"C:\Program Files\Git\bin\bash.exe")
NODE_KANDIDATEN = [
    os.environ.get("NODE"),
    str(Path(os.environ.get("LOCALAPPDATA", "")) / "node-portable" / "node-v24.21.0-win-x64" / "node.exe"),
    r"C:\Users\Student\AppData\Local\node-portable\node-v24.21.0-win-x64\node.exe",
]


def finde_node() -> str:
    for k in NODE_KANDIDATEN:
        if k and Path(k).is_file():
            return k
    gefunden = shutil.which("node")
    if gefunden:
        return gefunden
    raise SystemExit("FEHLER: kein Node gefunden — der Nachbau braucht Node wie die Pruefung.")


def befehl(teile: list[str]) -> list[str]:
    """`python`: derselbe Interpreter wie hier. `sh`: ueber Git-Bash. `node`: voller Pfad."""
    if teile[0] == "node":
        return [NODE] + teile[1:]
    if teile[0] == "sh":
        if not GIT_BASH.is_file():
            raise SystemExit(f"FEHLER: Git-Bash nicht gefunden: {GIT_BASH}")
        return [str(GIT_BASH), "-c", "export PATH=/usr/bin:/bin:$PATH; " + " ".join(teile)]
    if teile[0] == "python":
        return [sys.executable] + teile[1:]
    return teile


NODE = finde_node()

# Genau die Schritte aus .github/workflows/pruefen.yml (und dem Bau-Job in seite.yml).
SCHRITTE = [
    ("Tests (headless, Node)", ["sh", "tools/test.sh"], "grün"),
    ("Klassen im JS gegen CSS", ["python", "tools/klassen.py"], "0 Klassen ohne CSS-Regel"),
    ("Simulation gegen Referenzstand", ["node", "tools/sim-stand.js"], "unverändert"),
    ("Tests + Simulation ohne Spielhalle", ["python", "tools/lernmotor-rueckfall.py"], "GRUEN"),
    ("Programm-Fassung bauen", ["python", "bauen.py"], "Module"),
    ("Einzeldatei bauen", ["python", "tools/einfach.py"], "Aussenverweise  0"),
    ("Einzeldatei prüfen", ["python", "tools/einfach.py", "--pruefen"], "GRUEN"),
    ("Bilder der Doku prüfen", ["python", "tools/bilder.py", "--pruefen"], "GRUEN"),
    ("GitHub-Abläufe prüfen", ["python", "tools/ablaeufe.py"], "GRUEN"),
]


def main() -> int:
    ziel = Path(tempfile.mkdtemp(prefix="nl-ci-")) / "NetLab"
    print(f"Frischer Klon nach {ziel}")
    print("(kein ../FISI-Spielhalle — genau der Zustand auf GitHub)")
    print()

    r = subprocess.run(["git", "clone", "--quiet", "--depth", "1",
                        "--branch", "ausbau-1.2", str(HIER), str(ziel)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print("ROT: Klon fehlgeschlagen:\n" + (r.stderr or ""))
        return 1

    # Sicherstellen, dass wirklich keine Spielhalle in Reichweite liegt.
    spielhalle = ziel.parent / "FISI-Spielhalle"
    if spielhalle.exists():
        shutil.rmtree(spielhalle, ignore_errors=True)
    print(f"Spielhalle in Reichweite: {spielhalle.is_file() or spielhalle.is_dir()}  (muss False sein)")

    # Nachweise/ liegt nicht im Git: im Klon fehlt es. Genau der Zustand auf GitHub.
    print(f"Nachweise/ im Klon      : {(ziel / 'Nachweise').is_dir()}  (muss False sein)")

    # Pillow ist auf dem GitHub-Runner NICHT installiert. Nachbauen: ein leerer Ordner mit
    # einer PIL, die beim Import absichtlich scheitert, wird per PYTHONPATH vorgeschaltet.
    # (Pillow wird hier nicht angefasst — nur verdeckt.)
    sperre = Path(tempfile.mkdtemp(prefix="nl-kein-pillow-"))
    (sperre / "PIL").mkdir()
    (sperre / "PIL" / "__init__.py").write_text(
        'raise ImportError("Pillow ist hier absichtlich nicht verfuegbar (CI-Nachbau)")\n', encoding="utf-8")
    umgebung = dict(os.environ, PYTHONPATH=str(sperre))
    print(f"Pillow                  : verdeckt (wie auf dem Runner)")
    print()

    fehler = []
    for name, teile, muss in SCHRITTE:
        try:
            lauf = subprocess.run(befehl(teile), cwd=ziel, capture_output=True, text=True,
                                  encoding="utf-8", errors="replace", timeout=900, env=umgebung)
        except FileNotFoundError as e:
            print(f"  [ROT  ] {name:<34} Befehl nicht gefunden: {e}")
            fehler.append(f"{name}: Befehl fehlt")
            continue
        aus = (lauf.stdout or "") + (lauf.stderr or "")
        ok = lauf.returncode == 0 and muss in aus
        print(f"  [{'GRUEN' if ok else 'ROT  '}] {name:<34} {'ok' if ok else 'FEHLGESCHLAGEN'}")
        if not ok:
            fehler.append(name)
            for zeile in aus.strip().splitlines()[-8:]:
                print("          " + zeile[:150])

    shutil.rmtree(ziel.parent, ignore_errors=True)
    print()
    if fehler:
        print("ROT — auf GitHub wuerde scheitern:")
        for f in fehler:
            print("  - " + f)
        return 1
    print("GRUEN: alle CI-Schritte laufen auch ohne die Nachbar-Spielhalle.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
