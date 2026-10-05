"""Einmalige Abnahme: Baut das Repositorium auch OHNE die danebenliegende FISI-Spielhalle
identisch? Und baut es mit ihr identisch?

Geht so vor: baut dreimal und vergleicht die Pruefsumme des Ergebnisses, wobei der
Bauzeitstempel (Minutengenauigkeit) neutralisiert wird:

  1. mit Quelle daneben        (Vorrang-Zweig in bauen.py)
  2. Quelle beiseitegelegt     (Kopie-Zweig: fremd/lernmotor.js)
  3. Quelle wieder da          (muss wieder wie 1. sein)

Aufruf: python tools/_vendortest.py
"""
import hashlib
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
QUELLE = HIER.parent / "FISI-Spielhalle" / "src" / "lernmotor.js"
BEISEITE = QUELLE.with_suffix(".js.beiseite")
INDEX = HIER / "web" / "index.html"


def bau() -> str:
    subprocess.run([sys.executable, str(HIER / "bauen.py")], check=True, capture_output=True)
    t = INDEX.read_text(encoding="utf-8")
    t = re.sub(r'const LABOR_BAU = "[^"]*"', "LABOR_BAU", t)
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


def stempel() -> str:
    m = re.search(r'const LABOR_BAU = "([^"]*)"', INDEX.read_text(encoding="utf-8"))
    return m.group(1) if m else "?"


if BEISEITE.exists():
    raise SystemExit(f"FEHLER: {BEISEITE} liegt noch herum — erst aufraeumen.")
if not QUELLE.is_file():
    raise SystemExit(f"FEHLER: Quelle fehlt: {QUELLE} — Test nicht durchfuehrbar.")

print(f"Quelle daneben: {QUELLE}")
print(f"Kopie im Repo : {HIER / 'fremd' / 'lernmotor.js'}")

eins = bau()
print(f"1. mit Quelle daneben   SHA(ohne Stempel) {eins[:16]}…  Stempel {stempel()}")

shutil.move(str(QUELLE), str(BEISEITE))
try:
    zwei = bau()
    print(f"2. Quelle beiseite      SHA(ohne Stempel) {zwei[:16]}…  Stempel {stempel()}")
finally:
    shutil.move(str(BEISEITE), str(QUELLE))

drei = bau()
print(f"3. Quelle wieder da     SHA(ohne Stempel) {drei[:16]}…  Stempel {stempel()}")

print()
print("Der Bau enthaelt den Lernmotor:", "Lernmotor: Beherrschung" in INDEX.read_text(encoding="utf-8"))

rot = []
if eins != zwei:
    rot.append("MIT und OHNE Spielhalle bauen unterschiedlich — die Kopie weicht ab!")
if eins != drei:
    rot.append("Nach dem Wiederherstellen kommt ein anderer Bau heraus — Testaufbau unsauber.")
if not (HIER / "web" / "index.html").is_file():
    rot.append("kein Bau entstanden")

if rot:
    print("ROT:")
    for r in rot:
        print("  - " + r)
    sys.exit(1)
print("GRUEN: das Repositorium baut mit und ohne FISI-Spielhalle byte-gleich.")
sys.exit(0)
