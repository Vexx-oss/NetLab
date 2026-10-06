"""Prueft die veroeffentlichte Seite — die Adresse, die ein Mensch wirklich oeffnet.

Warum das noetig war: Alle bisherigen Pruefungen liefen lokal oder auf dem Bau-Server.
Am 06.10.2026 war aber genau die Kundenadresse das Problem — der Veroeffentlichungs-Ablauf
meldete in allen Schritten Erfolg, waehrend unter der Adresse ein 404 stand. Und die
veroeffentlichte Fassung kann von der lokalen abweichen, wenn ein Push noch nicht
durchgelaufen ist.

Gemessen wird:
  * HTTP-Status und Groesse
  * Titel und Produktname im ausgelieferten HTML
  * die Versionsnummer IM AUSGELIEFERTEN Spiel gegen die lokale aus bauen.py
  * ob die Schriften wirklich eingebettet ankommen (Daten-URI)
  * ob Aussenverweise dazugekommen sind

Aufruf: python tools/seite-pruefen.py [url]
        (Standard: https://vexx-oss.github.io/NetLab/)
"""
import hashlib
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
ADRESSE = "https://vexx-oss.github.io/NetLab/"
ERWARTETE_SCHRIFTEN = 14


def lokal() -> tuple[str, str]:
    """Version und Baukennung aus dem lokalen Bau (eine Quelle: bauen.py + docs/)."""
    version = "?"
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', (HIER / "bauen.py").read_text(encoding="utf-8"), re.M)
    if m:
        version = m.group(1)
    kennung = "?"
    index = HIER / "docs" / "index.html"
    if index.is_file():
        k = re.search(r'LABOR_BAU = "([^"]*)"', index.read_text(encoding="utf-8"))
        if k:
            kennung = k.group(1)
    return version, kennung


def main() -> int:
    adresse = sys.argv[1] if len(sys.argv) > 1 else ADRESSE
    version_lokal, kennung_lokal = lokal()

    print(f"Seite pruefen: {adresse}")
    print(f"  lokal erwartet: Version {version_lokal}, Baukennung {kennung_lokal}")
    print()

    anfrage = urllib.request.Request(adresse, headers={"User-Agent": "Mozilla/5.0 (Netzwerk-Labor Pruefung)"})
    try:
        with urllib.request.urlopen(anfrage, timeout=45) as r:
            roh = r.read()
            status = r.status
            typ = r.headers.get("Content-Type", "?")
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "replace")
        print(f"  ROT: HTTP {e.code}")
        if "There isn't a GitHub Pages site here" in text:
            print("       GitHub Pages kennt unter dieser Adresse KEINE Seite.")
            print("       Ursache pruefen: Settings -> Pages -> Source.")
        else:
            print(f"       Antwort: {text[:200]!r}")
        return 1
    except Exception as e:                                            # noqa: BLE001
        print(f"  ROT: nicht erreichbar — {e}")
        return 1

    html = roh.decode("utf-8", "replace")
    titel = re.search(r"<title>([^<]*)</title>", html)
    version_fern = re.search(r'LABOR_VERSION = "([^"]*)"', html)
    kennung_fern = re.search(r'LABOR_BAU = "([^"]*)"', html)
    schriften = len(re.findall(r"data:font/woff2;base64,", html))
    aussen = [m.group(0) for m in re.finditer(r"""(?i)(?:href|src)\s*=\s*["'](?!data:)[^"']+["']""", html)]

    print(f"  HTTP           {status}, {len(roh):,} Bytes, {typ}")
    print(f"  Titel          {titel.group(1) if titel else '(keiner)'}")
    print(f"  Version dort   {version_fern.group(1) if version_fern else '(keine)'}")
    print(f"  Baukennung     {kennung_fern.group(1) if kennung_fern else '(keine)'}")
    print(f"  Schriften      {schriften} eingebettet (erwartet {ERWARTETE_SCHRIFTEN})")
    print(f"  Aussenverweise {len(aussen)}")
    print(f"  SHA256         {hashlib.sha256(roh).hexdigest()}")
    if aussen:
        for a in aussen[:5]:
            print(f"       {a[:90]}")

    rot = []
    if "Netzwerk-Labor" not in (titel.group(1) if titel else ""):
        rot.append("Titel fehlt oder falsch")
    if not version_fern:
        rot.append("keine Versionsnummer im ausgelieferten Spiel")
    if schriften < ERWARTETE_SCHRIFTEN:
        rot.append(f"nur {schriften} von {ERWARTETE_SCHRIFTEN} Schriften eingebettet")
    if aussen:
        rot.append(f"{len(aussen)} Aussenverweise")

    # Abweichung ist ein HINWEIS, kein Fehler: die Seite kann gerade neu gebaut werden.
    if version_fern and version_fern.group(1) != version_lokal:
        print()
        print(f"  HINWEIS: die Seite liefert Version {version_fern.group(1)}, lokal steht "
              f"{version_lokal} — vermutlich laeuft gerade eine Veroeffentlichung.")
    if kennung_fern and kennung_lokal != "?" and kennung_fern.group(1) != kennung_lokal:
        print(f"  HINWEIS: Baukennung dort {kennung_fern.group(1)}, lokal {kennung_lokal}.")

    print()
    if rot:
        print("ROT:")
        for f in rot:
            print("  - " + f)
        return 1
    print("GRUEN: die veroeffentlichte Seite liefert das Spiel, eigenstaendig und mit Schriften.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
