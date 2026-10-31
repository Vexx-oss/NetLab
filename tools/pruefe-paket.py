#!/usr/bin/env python3
"""FASSUNGS-PRUEFUNG FUER PAKET UND .EXE (BAU-09, 3.0) — prueft WERTE, nicht Muster.

Warum: `tools/paket.py` benennt ZIP und Ordner nach der Fassung aus `bauen.py`, prueft aber
bisher nicht, ob die mitgelieferte `Programm/Netzwerk-Labor.exe` wirklich zu dieser Fassung
gehoert. Der Audit (berichte/bau-release.md, B12/WP-BAU-09) fand den Fall: eine lokale
.exe mit ProductVersion 2.8.0 waere als `Netzwerk-Labor-2.9.0-Windows.zip` veroeffentlicht
worden. Dieses Werkzeug macht daraus ein Gate:

  (a) Die ProductVersion der .exe muss exakt `VERSION` aus `bauen.py` sein.
  (b) `LABOR_VERSION` in der Einzeldatei `Netzwerk-Labor.html` muss exakt `VERSION` sein.
  (c) Wird ein ZIP geprueft: sein Name, der Innenordner und die HTML-Fassung darin muessen
      `VERSION` nennen.

Exit-Codes:
  0 = alle pruefbaren Werte stimmen (GRUEN)
  1 = mindestens ein Befund (ROT), z. B. falsche ProductVersion — beide Nummern im Text
  2 = nichts Falsches gefunden, aber etwas war nicht pruefbar (z. B. Linux/CI: die
      ProductVersion einer PE-Datei ist hier ohne Windows nicht lesbar -> nur Windows
      pruefbar; fehlende .exe/HTML/ZIP). "Nicht geprueft" ist kein Gruen.

Aufruf:
  python tools/pruefe-paket.py --nur-pruefen                     # Standardpruefung im Repo
  python tools/pruefe-paket.py --nur-pruefen --zip dist/X.zip    # zusaetzlich ein ZIP pruefen
  python tools/pruefe-paket.py --nur-pruefen --wurzel <dir>      # anderer Baum (z. B. Kopie)
  python tools/pruefe-paket.py --gegenprobe                      # Attrappen-Selbsttest (4 Faelle)

Die Testnaht `--exe-version` (nur fuer `--gegenprobe`/Attrappen) ersetzt das Lesen der
PE-Ressource durch einen vorgegebenen Wert; `--wurzel` zeigt die Pruefung auf einen
temporaeren Baum. Beides aendert keine Datei.
"""
from __future__ import annotations

import argparse
import ctypes
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HIER = Path(__file__).resolve().parent.parent


class NichtPruefbar(Exception):
    """Ein Wert liess sich nicht messen — eigener Zustand, nie 0 und nie "bestanden"."""


def version_aus_bauen(wurzel: Path) -> str:
    datei = wurzel / "bauen.py"
    if not datei.is_file():
        raise NichtPruefbar(f"bauen.py fehlt in {wurzel}")
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', datei.read_text(encoding="utf-8"), re.M)
    if not m:
        raise NichtPruefbar(f"in {datei} steht keine VERSION-Zeile")
    return m.group(1)


def exe_product_version(pfad: Path, testwert: str | None = None) -> str:
    """ProductVersion der PE-Datei lesen (Windows, ohne Zusatzpaket).

    `testwert` ist die Testnaht fuer Attrappen: dann wird NICHT gelesen, sondern der
    vorgegebene Wert zurueckgegeben (dokumentiert als Testnaht, nicht fuer Auslieferung).
    """
    if testwert:
        if not pfad.is_file():
            raise NichtPruefbar(f"Attrappe fehlt: {pfad}")
        return testwert.strip()
    if sys.platform != "win32":
        raise NichtPruefbar(
            "ProductVersion einer .exe ist nur unter Windows lesbar "
            "(Linux/CI: nur Windows pruefbar)")
    if not pfad.is_file():
        raise NichtPruefbar(f"{pfad} fehlt")
    version_dll = ctypes.windll.version
    groesse = version_dll.GetFileVersionInfoSizeW(str(pfad), None)
    if not groesse:
        raise NichtPruefbar(f"{pfad}: keine Versionsressource")
    puffer = ctypes.create_string_buffer(groesse)
    if not version_dll.GetFileVersionInfoW(str(pfad), 0, groesse, puffer):
        raise NichtPruefbar(f"{pfad}: Versionsressource nicht lesbar")
    zeiger = ctypes.c_void_p()
    laenge = ctypes.c_uint()
    if not version_dll.VerQueryValueW(
            puffer, r"\VarFileInfo\Translation",
            ctypes.byref(zeiger), ctypes.byref(laenge)):
        raise NichtPruefbar(f"{pfad}: keine Sprach-/Codepage-Angabe (Translation)")
    anzahl = laenge.value // 4
    if anzahl < 1:
        raise NichtPruefbar(f"{pfad}: leere Translation")
    paare = ctypes.cast(zeiger, ctypes.POINTER(ctypes.c_ushort * (anzahl * 2))).contents
    sprache, codepage = paare[0], paare[1]
    schluessel = r"\StringFileInfo\%04x%04x\ProductVersion" % (sprache, codepage)
    zeiger2 = ctypes.c_void_p()
    laenge2 = ctypes.c_uint()
    if not version_dll.VerQueryValueW(
            puffer, schluessel, ctypes.byref(zeiger2), ctypes.byref(laenge2)):
        raise NichtPruefbar(f"{pfad}: kein Feld ProductVersion")
    wert = ctypes.wstring_at(zeiger2, laenge2.value).rstrip("\x00").strip()
    if not wert:
        raise NichtPruefbar(f"{pfad}: ProductVersion ist leer")
    return wert


def labor_version(html: str) -> str | None:
    m = re.search(r'LABOR_VERSION\s*=\s*"([^"]+)"', html)
    return m.group(1) if m else None


def _kurz(pfad: Path, wurzel: Path) -> str:
    try:
        return pfad.resolve().relative_to(wurzel.resolve()).as_posix()
    except ValueError:
        return str(pfad)


def pruefe_zip(zip_pfad: Path, soll: str, wurzel: Path) -> list[str]:
    """Name, Innenordner und HTML-Fassung eines Paket-ZIPs gegen `soll` pruefen."""
    befunde: list[str] = []
    kurz = _kurz(zip_pfad, wurzel)
    if not re.fullmatch(rf"Netzwerk-Labor-{re.escape(soll)}-(Windows|Browser)\.zip", zip_pfad.name):
        befunde.append(f"ZIP   {zip_pfad.name}: Name nennt nicht die Fassung {soll} "
                       f"(erwartet Netzwerk-Labor-{soll}-Windows.zip oder -Browser.zip)")
    try:
        with zipfile.ZipFile(zip_pfad) as z:
            namen = z.namelist()
            praefix = f"Netzwerk-Labor-{soll}/"
            fremd = [n for n in namen if not n.startswith(praefix)]
            if fremd:
                befunde.append(f"ZIP   {kurz}: {len(fremd)} Eintrag/Eintraege ausserhalb "
                               f"{praefix} (z. B. {fremd[0]})")
            innen_html = praefix + "Netzwerk-Labor.html"
            if innen_html not in namen:
                befunde.append(f"ZIP   {kurz}: {innen_html} fehlt")
            else:
                innen = labor_version(z.read(innen_html).decode("utf-8", "replace"))
                if innen is None:
                    befunde.append(f"ZIP   {kurz}: {innen_html} nennt keine LABOR_VERSION")
                elif innen != soll:
                    befunde.append(f"ZIP   {kurz}: LABOR_VERSION {innen} != VERSION {soll}")
    except zipfile.BadZipFile as e:
        befunde.append(f"ZIP   {kurz}: nicht lesbar ({e})")
    if not befunde:
        print(f"  OK   ZIP   {kurz}: Name, Innenordner und HTML nennen die Fassung {soll}.")
    return befunde


def pruefe(wurzel: Path, *, exe: Path | None = None, html: Path | None = None,
           zip_pfad: Path | None = None, exe_testwert: str | None = None) -> tuple[list[str], list[str]]:
    """(befunde, nicht_geprueft) — beide Listen sind Textzeilen fuer die Ausgabe."""
    befunde: list[str] = []
    offen: list[str] = []
    soll = version_aus_bauen(wurzel)

    exe_pfad = Path(exe) if exe else wurzel / "Programm" / "Netzwerk-Labor.exe"
    try:
        ist = exe_product_version(exe_pfad, testwert=exe_testwert)
        if ist != soll:
            befunde.append(f"EXE   {_kurz(exe_pfad, wurzel)}: ProductVersion {ist} != VERSION {soll}")
        else:
            print(f"  OK   EXE   {_kurz(exe_pfad, wurzel)}: ProductVersion {ist}")
    except NichtPruefbar as e:
        offen.append(f"EXE   {e}")

    html_pfad = Path(html) if html else wurzel / "Netzwerk-Labor.html"
    try:
        if not html_pfad.is_file():
            raise NichtPruefbar(f"{_kurz(html_pfad, wurzel)} fehlt")
        ist = labor_version(html_pfad.read_text(encoding="utf-8", errors="replace"))
        if ist is None:
            raise NichtPruefbar(f"{_kurz(html_pfad, wurzel)}: keine LABOR_VERSION-Zeile")
        if ist != soll:
            befunde.append(f"HTML  {_kurz(html_pfad, wurzel)}: LABOR_VERSION {ist} != VERSION {soll}")
        else:
            print(f"  OK   HTML  {_kurz(html_pfad, wurzel)}: LABOR_VERSION {ist}")
    except NichtPruefbar as e:
        offen.append(f"HTML  {e}")

    if zip_pfad:
        zp = Path(zip_pfad)
        if not zp.is_file():
            offen.append(f"ZIP   {zp} fehlt")
        else:
            befunde.extend(pruefe_zip(zp, soll, wurzel))
    else:
        kandidaten = sorted((wurzel / "dist").glob(f"Netzwerk-Labor-{soll}-*.zip"))
        if not kandidaten:
            offen.append(f"ZIP   keines geprueft (kein --zip und kein dist/Netzwerk-Labor-{soll}-*.zip)")
        for zp in kandidaten:
            befunde.extend(pruefe_zip(zp, soll, wurzel))
    return befunde, offen


def attrappe_bauen(basis: Path, *, exe_version: str = "2.9.0", html_version: str = "2.9.0",
                   zip_version: str = "2.9.0", zip_name: str | None = None,
                   innen_version: str | None = None) -> tuple[Path, Path]:
    """Baut einen temporaeren Baum mit Attrappen (kein echter PE-Inhalt noetig)."""
    basis.mkdir(parents=True, exist_ok=True)
    (basis / "bauen.py").write_text('VERSION = "2.9.0"\n', encoding="utf-8")
    (basis / "Programm").mkdir(exist_ok=True)
    (basis / "Programm" / "Netzwerk-Labor.exe").write_bytes(b"MZ-Attrappe")
    (basis / "Netzwerk-Labor.html").write_text(
        f'const LABOR_VERSION = "{html_version}";\n', encoding="utf-8")
    innen = innen_version or zip_version
    dist = basis / "dist"
    dist.mkdir(exist_ok=True)
    zip_pfad = dist / (zip_name or f"Netzwerk-Labor-{zip_version}-Browser.zip")
    with zipfile.ZipFile(zip_pfad, "w") as z:
        z.writestr(f"Netzwerk-Labor-{innen}/Netzwerk-Labor.html",
                   f'const LABOR_VERSION = "{html_version}";\n')
    return basis, zip_pfad


def gegenprobe() -> int:
    """Vier Attrappen-Faelle: richtig -> Exit 0, drei Abweichungen -> Exit 1 mit beiden
    Nummern. Exit 0 nur bei 4/4. Schreibt nur unter %TEMP%, nie ins Repo."""
    faelle = []
    with tempfile.TemporaryDirectory(prefix="netlab-pruefe-paket-") as tmp:
        tmp = Path(tmp)
        faelle.append(("richtig (2.9.0 = 2.9.0)", dict(exe_version="2.9.0"), 0))
        faelle.append(("falsche EXE (2.8.0 != 2.9.0)", dict(exe_version="2.8.0"), 1))
        faelle.append(("falsches HTML (2.8.0 != 2.9.0)", dict(html_version="2.8.0"), 1))
        faelle.append(("falscher ZIP-Name (2.8.0 != 2.9.0)", dict(zip_name="Netzwerk-Labor-2.8.0-Browser.zip"), 1))
        bestanden = 0
        for i, (titel, aenderung, soll_exit) in enumerate(faelle, 1):
            basis = tmp / f"fall{i}"
            basis, zip_pfad = attrappe_bauen(basis, **aenderung)
            exe_version = aenderung.get("exe_version", "2.9.0")
            r = subprocess.run([sys.executable, str(Path(__file__).resolve()),
                                "--wurzel", str(basis), "--nur-pruefen",
                                "--exe-version", exe_version, "--zip", str(zip_pfad)],
                               capture_output=True, text=True, encoding="utf-8")
            text = (r.stdout or "") + (r.stderr or "")
            ok = r.returncode == soll_exit
            if ok and soll_exit == 1:
                ok = ("2.8.0" in text) and ("2.9.0" in text)
            if ok:
                bestanden += 1
                print(f"  OK  Fall {i}: {titel} -> Exit {r.returncode}")
            else:
                print(f"  ROT Fall {i}: {titel} -> Exit {r.returncode} (erwartet {soll_exit})")
                print("      " + " | ".join(text.strip().splitlines()[-3:]))
    print()
    if bestanden == len(faelle):
        print(f"GRUEN: Gegenprobe {bestanden}/{len(faelle)} — alle Attrappen erkannt; es wurde NICHTS geschrieben.")
        return 0
    print(f"ROT: Gegenprobe {bestanden}/{len(faelle)} — Attrappen nicht korrekt erkannt.")
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Fassung von Paket und .exe gegen bauen.py pruefen")
    ap.add_argument("--nur-pruefen", action="store_true", help="pruefen, nichts schreiben (Standard)")
    ap.add_argument("--gegenprobe", action="store_true", help="Attrappen-Selbsttest (4 Faelle)")
    ap.add_argument("--wurzel", type=Path, help="Projektwurzel (Standard: Repo dieser Datei)")
    ap.add_argument("--exe", type=Path, help="Pfad der .exe (Standard: Programm/Netzwerk-Labor.exe)")
    ap.add_argument("--exe-version", dest="exe_testwert", help="Testnaht: ProductVersion vorgeben (nur Attrappen)")
    ap.add_argument("--html", type=Path, help="Pfad der Einzeldatei (Standard: Netzwerk-Labor.html)")
    ap.add_argument("--zip", type=Path, dest="zip_pfad", help="ZIP-Datei pruefen (Name, Innenordner, HTML)")
    a = ap.parse_args()
    if a.gegenprobe:
        return gegenprobe()
    wurzel = (a.wurzel or HIER).resolve()
    try:
        soll = version_aus_bauen(wurzel)
    except NichtPruefbar as e:
        print(f"NICHT PRUEFBAR: {e}")
        return 2
    print(f"Fassungs-Pruefung (Soll aus bauen.py: {soll}, Wurzel {wurzel})")
    try:
        befund, offen = pruefe(wurzel, exe=a.exe, html=a.html, zip_pfad=a.zip_pfad,
                               exe_testwert=a.exe_testwert)
    except NichtPruefbar as e:
        print(f"NICHT PRUEFBAR: {e}")
        return 2
    for zeile in befund:
        print("  ROT  " + zeile)
    for zeile in offen:
        print("  OFFEN " + zeile)
    print()
    if befund:
        print(f"ROT: {len(befund)} Befund(e) — Fassung nicht konsistent.")
        return 1
    if offen:
        print(f"NICHT PRUEFBAR: 0 Befunde, aber {len(offen)} Wert(e) nicht geprueft.")
        return 2
    print("GRUEN: alle geprueften Werte nennen die Fassung " + soll + ".")
    return 0


if __name__ == "__main__":
    sys.exit(main())
