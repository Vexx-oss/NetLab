"""Baut eine private Vorschau-Fassung nach web/vorschau-<name>.html – ohne web/index.html anzufassen.

Zweck: Mehrere Bereichs-Teams arbeiten gleichzeitig. `python bauen.py` schreibt immer
web/index.html; zwei gleichzeitige Läufe würden sich überschreiben. Dieses Werkzeug nutzt
dieselben Bausteine (bauen.seite) und legt das Ergebnis unter einem eigenen Namen ab.
Die Seite lädt web/schriften.css und web/schriften/ – darum liegt sie im selben Ordner.

Aufruf:
  python tools/vorschau.py --name postfach
  python tools/vorschau.py --name postfach --pruefen   # nur Existenz/Größe prüfen
"""
import argparse
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HIER))
import bauen  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description="private Vorschau-Fassung bauen")
    ap.add_argument("--name", required=True, help="Bereichsname, z. B. postfach")
    ap.add_argument("--pruefen", action="store_true", help="nur prüfen, nicht schreiben")
    a = ap.parse_args()
    ziel = HIER / "web" / f"vorschau-{a.name}.html"

    if a.pruefen:
        if not ziel.is_file():
            print(f"ROT: {ziel.name} fehlt – bauen mit: python tools/vorschau.py --name {a.name}")
            return 1
        print(f"ok    {ziel.name}  {ziel.stat().st_size:,} B")
        return 0

    if not (HIER / "web" / "schriften.css").is_file() or not (HIER / "web" / "schriften").is_dir():
        print("Hinweis: web/schriften.css fehlt – einmal `python bauen.py` laufen lassen (Schriften kopieren).")
    html = bauen.seite('<link rel="stylesheet" href="schriften.css">')
    ziel.write_text(html, encoding="utf-8", newline="\n")
    print(f"{len(bauen.module())} Module, {len(html) // 1024} KB -> web/{ziel.name}")
    print(f"Foto: python Nachweise/bento/foto.py --html {ziel.name} --marke {a.name} --nur <ansichten>")
    return 0


if __name__ == "__main__":
    sys.exit(main())
