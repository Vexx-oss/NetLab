"""Einmalige Abnahme: Laufen TESTS und SIMULATIONSVERGLEICH auch ohne die FISI-Spielhalle?

Bisher zogen `tests/run.js` und `tools/sim-stand.js` den Lernmotor aus
`../FISI-Spielhalle` — außerhalb des Repositoriums. Auf GitHub hätte beides ins Leere
gegriffen. Dieser Lauf legt die Quelle kurz beiseite und prüft, ob der Rückfall auf
`fremd/lernmotor.js` beide Werkzeuge trägt.

Aufruf: python tools/_rueckfalltest.py
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
QUELLE = HIER.parent / "FISI-Spielhalle" / "src" / "lernmotor.js"
BEISEITE = QUELLE.with_suffix(".js.beiseite")


def node() -> str:
    for k in (os.environ.get("NODE"),
              str(Path(os.environ.get("LOCALAPPDATA", "")) / "node-portable" / "node-v24.21.0-win-x64" / "node.exe"),
              r"C:\Users\Student\AppData\Local\node-portable\node-v24.21.0-win-x64\node.exe",
              shutil.which("node")):
        if k and Path(k).is_file():
            return k
    raise SystemExit("FEHLER: kein Node gefunden.")


NODE = node()


def lauf(name, befehl, muss):
    r = subprocess.run(befehl, cwd=HIER, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=900)
    aus = (r.stdout or "") + (r.stderr or "")
    ok = r.returncode == 0 and muss in aus
    print(f"  [{'GRUEN' if ok else 'ROT  '}] {name:<40} {'gefunden' if muss in aus else 'FEHLT: ' + muss}")
    if not ok:
        print("        " + "\n        ".join(aus.strip().splitlines()[-6:]))
    return ok


if BEISEITE.exists():
    raise SystemExit(f"FEHLER: {BEISEITE} liegt noch herum — erst aufraeumen.")
if not QUELLE.is_file():
    # Auf GitHub liegt die Nachbar-Spielhalle nicht — dann gibt es nichts zu vergleichen.
    # Geprueft wird trotzdem das Wichtigste: dass Tests und Simulationsvergleich ALLEIN
    # laufen. Genau das ist der Zustand in der Pruefung. Ein „GRUEN" fuer den nicht
    # gefahrenen Teil waere gelogen, deshalb steht unten ausdruecklich, was fehlt.
    print(f"Quelle nicht vorhanden: {QUELLE}")
    print("  (auf GitHub der Normalfall) — geprueft wird nur der Weg OHNE Spielhalle.")
    print()
    ohne = [
        lauf("tests/run.js", [NODE, "tests/run.js"], "grün"),
        lauf("tools/sim-stand.js", [NODE, "tools/sim-stand.js"], "unverändert"),
    ]
    print()
    if all(ohne):
        print("GRUEN: Tests und Simulationsvergleich laufen ohne die Spielhalle —")
        print("       das ist der Zustand in der Pruefung auf GitHub.")
        print("NICHT geprueft: der Weg MIT Spielhalle (dafuer muss sie daneben liegen).")
        sys.exit(0)
    print("ROT: der Weg ohne Spielhalle ist gescheitert.")
    sys.exit(1)

print("MIT Quelle daneben:")
mit = [
    lauf("tests/run.js", [NODE, "tests/run.js"], "grün"),
    lauf("tools/sim-stand.js", [NODE, "tools/sim-stand.js"], "unverändert"),
]

print()
print(f"OHNE Quelle ({QUELLE.name} beiseitegelegt) — es muss die Kopie greifen:")
shutil.move(str(QUELLE), str(BEISEITE))
try:
    ohne = [
        lauf("tests/run.js", [NODE, "tests/run.js"], "grün"),
        lauf("tools/sim-stand.js", [NODE, "tools/sim-stand.js"], "unverändert"),
    ]
finally:
    shutil.move(str(BEISEITE), str(QUELLE))

print()
if all(mit) and all(ohne):
    print("GRUEN: Tests und Simulationsvergleich laufen mit UND ohne FISI-Spielhalle.")
    sys.exit(0)
print("ROT: mindestens ein Lauf ist gescheitert.")
sys.exit(1)
