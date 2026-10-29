"""Fassung ziehen an allen Stellen, die die FASSUNG meinen — und sie vorher pruefen.

Warum ein Skript und nicht fuenf Handgriffe: In `shell/src-tauri/Cargo.lock` steht die Nummer
auch bei fremden Paketen (am 06.10.2026: zweimal). Ein Suchen-und-Ersetzen ueber die Datei
wuerde deren Fassungen veraendern und die Sperrdatei beschaedigen. Deshalb wird im Cargo.lock
nur der Block angefasst, dessen `name = "netzwerk-labor"` lautet.

Die aktuelle Nummer wird aus `bauen.py` GELESEN, nicht im Skript gefuehrt — sonst meldet ein
zweiter Lauf „nicht gefunden", statt zu sagen, dass die Fassung schon gezogen ist.

NEU in 2.1.0 (O5): der Pruefmodus `--pruefen`. Er setzt NICHTS, sondern prueft, ob alle
Fassungsstellen vorhanden und untereinander konsistent sind: Quell- und Konfigurationsdateien
(Cargo.toml, tauri.conf.json, Cargo.lock), die Dokumente (README, Liesmich, Bauen, STAND,
CHANGELOG, Android-LIESMICH, Manifest), den gebauten Stand (LABOR_VERSION in `docs/index.html`),
die Android-Bauzaehlung und die Screenshot-Kennzeichnung (README gegen HERKUNFT). Fehlt ein
Suchmuster, das ein spaeterer Fassungszug ersetzen soll, ist das ein FEHLER: sonst zieht der
Zug die Fassung an einer Stelle still nicht nach. Exit 1 bei jeder Abweichung.

Aufruf:  python tools/fassung-ziehen.py                          (zeigt nur die Fassung)
         python tools/fassung-ziehen.py --neu 2.1.0             (Trockenlauf, schreibt nichts)
         python tools/fassung-ziehen.py --neu 2.1.0 --setzen    (schreiben)
         python tools/fassung-ziehen.py --pruefen               (nur pruefen, schreibt nichts)

KEIN Commit, kein Push, keine Veroeffentlichung: das macht der Lead nach Freigabe
(Architektur § 17.6).
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parents[1]


def text(rel: str) -> str:
    return (HIER / rel).read_text(encoding="utf-8")


def version_aus_bauen() -> str:
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', text("bauen.py"), re.M)
    if not m:
        raise SystemExit("FEHLER: in bauen.py steht keine VERSION-Zeile.")
    return m.group(1)


def aenderungen(alt: str, neu: str) -> list[tuple[str, str, str]]:
    """Alle Stellen, die eine Fassung nennen: (Datei, alt, neu).

    Aus ALT und NEU gebildet, damit hier keine Nummer doppelt steht. Jede Zeile muss im
    Zieldokument genau so vorkommen — `--pruefen` haelt das fest.
    """
    return [
        ("bauen.py", f'VERSION = "{alt}"', f'VERSION = "{neu}"'),
        ("shell/src-tauri/Cargo.toml", f'version = "{alt}"', f'version = "{neu}"'),
        ("shell/src-tauri/tauri.conf.json", f'"version": "{alt}"', f'"version": "{neu}"'),
        (".github/workflows/release.yml", f"git tag -a v{alt} -m \"Netzwerk-Labor {alt}\"",
         f"git tag -a v{neu} -m \"Netzwerk-Labor {neu}\""),
        (".github/workflows/release.yml", f"git push origin v{alt}", f"git push origin v{neu}"),
        ("docs/Bauen.md", f"git tag -a v{alt} -m \"Netzwerk-Labor {alt}\"",
         f"git tag -a v{neu} -m \"Netzwerk-Labor {neu}\""),
        ("docs/Bauen.md", f"git push origin v{alt}", f"git push origin v{neu}"),
        ("docs/Bauen.md", f"`VERSION`, derzeit **{alt}**", f"`VERSION`, derzeit **{neu}**"),
        ("docs/Bauen.md", f"heute gilt `VERSION` = {alt} und", f"heute gilt `VERSION` = {neu} und"),
        ("README.md", f"Netzwerk-Labor-{alt}-Browser.zip", f"Netzwerk-Labor-{neu}-Browser.zip"),
        ("README.md", f"dieselbe Fassung **{alt}**", f"dieselbe Fassung **{neu}**"),
        ("README.md", f"| `ausbau-1.2` ← **Standardzweig** | Version {alt}:",
         f"| `ausbau-1.2` ← **Standardzweig** | Version {neu}:"),
        ("docs/Liesmich.md", f"status: Version {alt} (", f"status: Version {neu} ("),
        ("docs/Liesmich.md", f"bis `v2.0.0`–`v{alt}`", f"bis `v2.0.0`–`v{neu}`"),
        ("android/LIESMICH.md", f"`Programm/Netzwerk-Labor-{alt}-Android.apk`",
         f"`Programm/Netzwerk-Labor-{neu}-Android.apk`"),
        ("android/LIESMICH.md", f"versionName {alt},", f"versionName {neu},"),
        ("android/huelle/AndroidManifest.xml", f"Fassung {alt} / versionCode",
         f"Fassung {neu} / versionCode"),
    ]


def cargo_lock_eigene_fassung() -> tuple[Path, list[str], int]:
    """(Pfad, Bloecke, Index des eigenen Blocks) — fuer Lesen und Schreiben."""
    p = HIER / "shell" / "src-tauri" / "Cargo.lock"
    bloecke = p.read_text(encoding="utf-8").split("[[package]]")
    for i, b in enumerate(bloecke):
        if 'name = "netzwerk-labor"' in b:
            return p, bloecke, i
    raise SystemExit("FEHLER: im Cargo.lock steht kein Block name = \"netzwerk-labor\".")


def cargo_lock_setzen(alt: str, neu: str, setzen: bool) -> str:
    """Im Cargo.lock NUR den eigenen Block umschreiben (oder im Trockenlauf nur melden)."""
    p, bloecke, i = cargo_lock_eigene_fassung()
    original = "[[package]]".join(bloecke)
    fremde = max(len(re.findall(r'version = "' + re.escape(alt) + r'"', original)) - 1, 0)
    neu_block = re.sub(r'version = "' + re.escape(alt) + r'"', f'version = "{neu}"', bloecke[i], count=1)
    getroffen = 0 if neu_block == bloecke[i] else 1
    if setzen and getroffen:
        bloecke[i] = neu_block
        p.write_text("[[package]]".join(bloecke), encoding="utf-8", newline="")
    tat = "gesetzt" if setzen else "zu ersetzen"
    return (f"Cargo.lock: eigener Block {getroffen}x {tat}, {fremde} fremde Vorkommen bleiben unberuehrt")



def abgeleiteter_code(version: str) -> int:
    """Android-Bauzaehlung aus der Spielversion: wie android/bauen.py (2.0.5 -> 20005)."""
    zahlen = re.findall(r"[0-9]+", version)
    if len(zahlen) < 3:
        return 0
    return int(zahlen[0]) * 10000 + int(zahlen[1]) * 100 + int(zahlen[2])


def pruefen() -> int:
    alt = version_aus_bauen()
    fehler: list[str] = []
    hinweise: list[str] = []

    def ok(bedingung: bool, titel: str, wert: str = "") -> None:
        if bedingung:
            print("  OK    " + titel)
        else:
            fehler.append(titel + (f" (gefunden: {wert})" if wert else ""))

    print(f"Fassungsstellen pruefen (aktuelle Fassung laut bauen.py: {alt})")
    print()

    # 1) Jedes Muster, das ein Fassungszug ersetzen soll, muss vorhanden sein.
    print("Suchmuster (muessen alle vorhanden sein, sonst zieht der Zug sie still nicht nach):")
    for datei, muster, _ in aenderungen(alt, alt):
        ok(text(datei).count(muster) >= 1, f"{datei}: {muster[:60]}")
    print()

    # 2) Versionsangaben in Quelle und Konfiguration.
    print("Quelle und Konfiguration:")
    ok(f'VERSION = "{alt}"' in text("bauen.py"), "bauen.py: VERSION")
    m = re.search(r"^\[package\][^\[]*?^version\s*=\s*\"([^\"]+)\"", text("shell/src-tauri/Cargo.toml"), re.M | re.S)
    ok(bool(m) and m.group(1) == alt, "shell/src-tauri/Cargo.toml: [package] version", m.group(1) if m else "nicht gefunden")
    m = re.search(r'^\s*"version"\s*:\s*"([^"]+)"', text("shell/src-tauri/tauri.conf.json"), re.M)
    ok(bool(m) and m.group(1) == alt, "shell/src-tauri/tauri.conf.json: version", m.group(1) if m else "nicht gefunden")
    _, bloecke, i = cargo_lock_eigene_fassung()
    m = re.search(r'^version = "([^"]+)"', bloecke[i], re.M)
    ok(bool(m) and m.group(1) == alt, "Cargo.lock: eigener Block version", m.group(1) if m else "nicht gefunden")
    m = re.search(r"^VERSION_CODE\s*=\s*([0-9]+)", text("android/bauen.py"), re.M)
    code = int(m.group(1)) if m else 0
    ok(code >= abgeleiteter_code(alt), f"android/bauen.py: VERSION_CODE {code} >= {abgeleiteter_code(alt)} (aus {alt})", str(code))
    print()

    # Blindfleck-Check (QA-Befund 29.10.2026): Die Bauzaehlung stand in der Doku noch als alte
    # Zahl (10202), obwohl android/bauen.py laengst 20101 sagte. Jede sichtbare versionCode-Zahl
    # in der Android-Doku muss deshalb mit android/bauen.py uebereinstimmen — Abweichung = rot.
    print("Dokumentierte Bauzaehlung (Blindfleck-Check):")
    blind = [
        ("android/LIESMICH.md", r"versionCode\s*(?:=|[*]{2})?\s*([0-9]{4,7})",
         "versionCode in android/LIESMICH.md"),
        ("android/huelle/AndroidManifest.xml", r"Fassung [0-9.]+ / versionCode\s*([0-9]+)",
         "versionCode im AndroidManifest-Kommentar"),
    ]
    for datei, muster, titel in blind:
        zahlen = re.findall(muster, text(datei))
        if not zahlen:
            hinweise.append(f"{titel}: keine Zahl gefunden — Blindfleck-Check dort pruefen.")
        for zahl in zahlen:
            ok(int(zahl) == code, f"{titel}: {zahl} == {code}", zahl)
    print()

    # 3) Dokumente, die die Fassung nennen.
    print("Dokumente:")
    ok(f"Netzwerk-Labor-{alt}-Browser.zip" in text("README.md"), "README.md: ZIP-Name")
    ok(f"dieselbe Fassung **{alt}**" in text("README.md"), "README.md: dieselbe Fassung")
    ok(re.search(rf"\| [^|]*ausbau-1\.2[^|]*\| Version {re.escape(alt)}:", text("README.md")) is not None,
       "README.md: Stand-Tabelle")
    ok(f"status: Version {alt}" in text("docs/Liesmich.md"), "docs/Liesmich.md: status")
    ok(f"versionName {alt}" in text("android/LIESMICH.md"), "android/LIESMICH.md: versionName")
    ok(f"Fassung {alt} / versionCode" in text("android/huelle/AndroidManifest.xml"), "AndroidManifest.xml: Fassungs-Kommentar")
    ok(re.search(rf"^## {re.escape(alt)}", text("docs/CHANGELOG.md"), re.M) is not None,
       "docs/CHANGELOG.md: Abschnitt fuer die Fassung")
    if (HIER / "docs" / "STAND.md").is_file():
        ok(f"| Fassung (Quelle) | **{alt}** |" in text("docs/STAND.md"),
           "docs/STAND.md: Fassung (sonst `python tools/stand.py` laufen lassen)")
    else:
        hinweise.append("docs/STAND.md fehlt — `python tools/stand.py` erzeugt sie.")
    print()

    # 4) Gebauter Stand (Baustand, nicht Quelle).
    print("Baustand:")
    html = text("docs/index.html") if (HIER / "docs" / "index.html").is_file() else ""
    m = re.search(r'LABOR_VERSION\s*=\s*"([^"]*)"', html)
    ok(bool(m) and m.group(1) == alt,
       "docs/index.html: LABOR_VERSION (sonst neu bauen: `python bauen.py` + `python tools/einfach.py`)",
       m.group(1) if m else "nicht gefunden")
    if 'id="lizenzhinweise"' not in html:
        hinweise.append("docs/index.html enthaelt noch keinen Lizenzblock (Bau vor 2.1.0) — "
                        "beim Neubau nach dem Fassungszug enthalten.")
    print()

    # 5) Screenshot-Kennzeichnung: README und HERKUNFT muessen dieselbe Bildfassung nennen.
    herkunft = text("docs/bilder/HERKUNFT.md")
    m = re.search(r"Die Bilder zeigen die Fassung (\d+\.\d+\.\d+)", herkunft)
    if m:
        bild = m.group(1)
        ok(f"Fassung {bild}" in text("README.md"),
           f"README.md: Screenshot-Hinweis nennt die Bildfassung {bild} (wie HERKUNFT.md)")
    else:
        fehler.append("docs/bilder/HERKUNFT.md: Satz „Die Bilder zeigen die Fassung X.Y.Z“ fehlt oder ist unlesbar")
    print()

    # 6) Hinweis fuer den naechsten Zug (keine Abweichung, nur Planungshilfe).
    naechste = "2.1.0"
    print("Hinweis fuer den Fassungszug auf " + naechste + ":")
    print(f"  VERSION_CODE in android/bauen.py muss UEBER {abgeleiteter_code(naechste)} liegen "
          f"(aktuell {code}); der Zug aendert ihn nicht.")
    if naechste != alt:
        fehlende = [(d, x) for d, x, _ in aenderungen(alt, naechste) if text(d).count(x) == 0]
        print(f"  Suchmuster, die der Zug auf {naechste} derzeit nicht faende: {len(fehlende)}"
              + ("" if not fehlende else "  <-- vorher klaeren: " + ", ".join(d for d, _ in fehlende[:4])))
    print()

    for h in hinweise:
        print("  HINWEIS: " + h)
    if hinweise:
        print()
    if fehler:
        print(f"ROT: {len(fehler)} Abweichung(en)")
        for f in fehler:
            print("  - " + f)
        return 1
    print(f"GRUEN: alle Fassungsstellen vorhanden und konsistent mit {alt}. Es wurde NICHTS geschrieben.")
    return 0


def main() -> int:
    alt = version_aus_bauen()
    if "--pruefen" in sys.argv:
        return pruefen()
    neu = sys.argv[sys.argv.index("--neu") + 1] if "--neu" in sys.argv else None
    setzen = "--setzen" in sys.argv
    if neu is None:
        print(f"Aktuelle Fassung laut bauen.py: {alt}")
        print("Aufruf:  python tools/fassung-ziehen.py --neu <neue Fassung> [--setzen]")
        print("         python tools/fassung-ziehen.py --pruefen")
        return 0
    if neu == alt:
        raise SystemExit(f"FEHLER: {neu} ist bereits die aktuelle Fassung — nichts zu tun.")
    if not re.fullmatch(r"\d+\.\d+\.\d+", neu):
        raise SystemExit(f"FEHLER: „{neu}" + "“ sieht nicht wie eine Fassung aus (erwartet z. B. 1.2.3).")
    fehler = 0
    for datei, alt_text, neu_text in aenderungen(alt, neu):
        p = HIER / datei
        inhalt = p.read_text(encoding="utf-8")
        n = inhalt.count(alt_text)
        if n == 0:
            print(f"  ! {datei}: „{alt_text[:50]}…" + "“ nicht gefunden")
            fehler += 1
            continue
        if setzen:
            p.write_text(inhalt.replace(alt_text, neu_text), encoding="utf-8", newline="")
        print(f"  {datei}: {n}x  {alt_text[:44]!r} -> {neu_text[:44]!r}")
    print("  " + cargo_lock_setzen(alt, neu, setzen))
    print(f"\n{'GESETZT' if setzen else 'TROCKENLAUF (nichts geschrieben)'} — Fehler: {fehler}"
          + ("" if not fehler else "  <-- bitte ansehen"))
    return 1 if fehler else 0


if __name__ == "__main__":
    raise SystemExit(main())
