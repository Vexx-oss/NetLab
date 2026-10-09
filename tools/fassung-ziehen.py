"""Fassung ziehen: 1.2.2 -> 1.2.3 an allen Stellen, die die FASSUNG meinen.

Warum ein Skript und nicht fünf Handgriffe: In `shell/src-tauri/Cargo.lock` steht die Nummer
auch bei fremden Paketen (am 06.10.2026: zweimal). Ein Suchen-und-Ersetzen über die Datei
würde deren Fassungen verändern und die Sperrdatei beschädigen. Deshalb wird im Cargo.lock
nur der Block angefasst, dessen `name = "netzwerk-labor"` lautet.

Die aktuelle Nummer wird aus `bauen.py` GELESEN, nicht im Skript geführt — sonst meldet ein
zweiter Lauf „nicht gefunden", statt zu sagen, dass die Fassung schon gezogen ist.

Aufruf:  python tools/fassung-ziehen.py                          (zeigt nur die Fassung)
         python tools/fassung-ziehen.py --neu 1.2.3              (Trockenlauf)
         python tools/fassung-ziehen.py --neu 1.2.3 --setzen     (schreiben)
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parents[1]

_m = re.search(r'^VERSION\s*=\s*"([^"]+)"', (HIER / "bauen.py").read_text(encoding="utf-8"), re.M)
if not _m:
    raise SystemExit("FEHLER: in bauen.py steht keine VERSION-Zeile.")
ALT = _m.group(1)
NEU = sys.argv[sys.argv.index("--neu") + 1] if "--neu" in sys.argv else None
setzen = "--setzen" in sys.argv

if NEU is None:
    print(f"Aktuelle Fassung laut bauen.py: {ALT}")
    print("Aufruf:  python tools/fassung-ziehen.py --neu <neue Fassung> [--setzen]")
    raise SystemExit(0)
if NEU == ALT:
    raise SystemExit(f"FEHLER: {NEU} ist bereits die aktuelle Fassung — nichts zu tun.")
if not re.fullmatch(r"\d+\.\d+\.\d+", NEU):
    raise SystemExit(f"FEHLER: „{NEU}" + "“ sieht nicht wie eine Fassung aus (erwartet z. B. 1.2.3).")

# (Datei, alt, neu) — aus ALT und NEU gebildet, damit hier keine Nummer doppelt steht.
AENDERUNGEN = [
    ("bauen.py", f'VERSION = "{ALT}"', f'VERSION = "{NEU}"'),
    ("shell/src-tauri/Cargo.toml", f'version = "{ALT}"', f'version = "{NEU}"'),
    ("shell/src-tauri/tauri.conf.json", f'"version": "{ALT}"', f'"version": "{NEU}"'),
    (".github/workflows/release.yml", f"git tag -a v{ALT} -m \"Netzwerk-Labor {ALT}\"",
     f"git tag -a v{NEU} -m \"Netzwerk-Labor {NEU}\""),
    (".github/workflows/release.yml", f"git push origin v{ALT}", f"git push origin v{NEU}"),
    ("docs/Bauen.md", f"git tag -a v{ALT} -m \"Netzwerk-Labor {ALT}\"",
     f"git tag -a v{NEU} -m \"Netzwerk-Labor {NEU}\""),
    ("docs/Bauen.md", f"git push origin v{ALT}", f"git push origin v{NEU}"),
    ("README.md", f"Netzwerk-Labor-{ALT}-Browser.zip", f"Netzwerk-Labor-{NEU}-Browser.zip"),
    ("README.md", f"dieselbe Fassung `{ALT}`", f"dieselbe Fassung `{NEU}`"),
    # Die .exe-Fassung wird 2026-10-07 als Code geschrieben (`` `1.2.4` ``), nicht mehr fett.
    # Das Fett-Muster ist entfernt: es lief in „nicht gefunden" (Exit 1), obwohl die Zeile existiert.
    ("README.md", f"Sie ist `{ALT}`", f"Sie ist `{NEU}`"),
    ("README.md", f"| `ausbau-1.2` ← **Standardzweig** | Version {ALT}:", f"| `ausbau-1.2` ← **Standardzweig** | Version {NEU}:"),
    ("README.md", f"- **Die Windows-`.exe` ist {ALT} und ihr Start ist gemessen**",
     f"- **Die Windows-`.exe` ist {NEU} und ihr Start ist gemessen**"),
    ("android/LIESMICH.md", f"`Programm/Netzwerk-Labor-{ALT}-Android.apk`",
     f"`Programm/Netzwerk-Labor-{NEU}-Android.apk`"),
    ("android/LIESMICH.md", f"versionName {ALT},", f"versionName {NEU},"),
    ("docs/Liesmich.md", f"`Programm/Netzwerk-Labor-{ALT}-Android.apk`",
     f"`Programm/Netzwerk-Labor-{NEU}-Android.apk`"),
    ("docs/Liesmich.md", f"Spielversion `versionName {ALT}`", f"Spielversion `versionName {NEU}`"),
    ("android/huelle/AndroidManifest.xml", f"Fassung {ALT} / versionCode", f"Fassung {NEU} / versionCode"),
]


def cargo_lock_setzen() -> str:
    """Im Cargo.lock NUR den eigenen Block umschreiben."""
    p = HIER / "shell" / "src-tauri" / "Cargo.lock"
    text = p.read_text(encoding="utf-8")
    bloecke = text.split("[[package]]")
    getroffen = 0
    fuer_ausgabe = []
    for i, b in enumerate(bloecke):
        if 'name = "netzwerk-labor"' in b:
            neu = re.sub(r'version = "' + re.escape(ALT) + r'"', f'version = "{NEU}"', b, count=1)
            if neu != b:
                bloecke[i] = neu
                getroffen += 1
    if setzen and getroffen:
        p.write_text("[[package]]".join(bloecke), encoding="utf-8", newline="")
    fremde = len(re.findall(r'version = "' + re.escape(ALT) + r'"', text)) - getroffen
    return f"Cargo.lock: eigener Block {getroffen}x gesetzt, {fremde} fremde Vorkommen bleiben unberührt"


def main() -> int:
    fehler = 0
    for datei, alt, neu in AENDERUNGEN:
        p = HIER / datei
        text = p.read_text(encoding="utf-8")
        n = text.count(alt)
        if n == 0:
            print(f"  ! {datei}: „{alt[:50]}…" + "“ nicht gefunden")
            fehler += 1
            continue
        if setzen:
            p.write_text(text.replace(alt, neu), encoding="utf-8", newline="")
        print(f"  {datei}: {n}x  {alt[:44]!r} -> {neu[:44]!r}")
    print("  " + cargo_lock_setzen())
    print(f"\n{'GESETZT' if setzen else 'TROCKENLAUF (nichts geschrieben)'} — Fehler: {fehler}"
          + ("" if not fehler else "  <-- bitte ansehen"))
    return 1 if fehler else 0


if __name__ == "__main__":
    raise SystemExit(main())
