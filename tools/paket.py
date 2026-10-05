"""Auslieferungspaket bauen: EIN Ordner mit allem, was ein Mensch zum Spielen braucht.

Warum: AGENTS.md und die README sagen, dass gebaute Programme nicht ins Git gehoeren
(7,8 MB .exe). Ohne Paket muss sich jeder Build-Willige Rust, Tauri und Node selbst
besorgen — fuer "ich will das nur spielen" ist das unbrauchbar. Dieses Werkzeug baut
darum ein ZIP, das man an eine Release haengt:

    Netzwerk-Labor-<version>-Windows.zip
      Netzwerk-Labor/
        Netzwerk-Labor.html            das Spiel als EINZELDATEI, ueberall spielbar
        Netzwerk-Labor.exe             Windows-Programm mit Leiste und Tray
        Integritaet-reparieren.cmd     falls die .exe kein Fenster zeigt
        START-HIER.md                  Anleitung zum Losspielen
        LIESMICH.txt                   dieselbe Anleitung als reiner Text
        LIZENZ.md                      Lizenz des Programms
        LIZENZEN/                      OFL-Lizenztexte der Schriften
        SIZES.txt                      was drin ist, wie gross, welche Pruefsumme

Vor dem Packen wird die Einzeldatei frisch gebaut (`tools/einfach.py`) und geprueft
(keine Aussenverweise). Danach wird das ZIP zurueckgelesen und jedes Element mit CRC32
gegen das Original geprueft — ein Paket, das sich nicht oeffnen laesst, faellt hier auf
und nicht beim Nutzer.

Aufruf:
    python tools/paket.py                    -> dist/Netzwerk-Labor-<version>-Windows.zip
    python tools/paket.py --ohne-exe         -> nur die Browser-Fassung (klein, ueberall lauffaehig)
    python tools/paket.py --nur-ordner       -> Ordner bauen, kein ZIP
    python tools/paket.py --ziel X.zip
"""
import argparse
import hashlib
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HIER = Path(__file__).resolve().parent.parent
EINFACH = HIER / "tools" / "einfach.py"
WEB_INDEX = HIER / "web" / "index.html"
WEB_STIL = HIER / "web" / "schriften.css"
EXE = HIER / "Programm" / "Netzwerk-Labor.exe"
REPARATUR = HIER / "Programm" / "Integritaet-reparieren.cmd"
VORLAGEN = HIER / "Vorlagen"
SCHRIFTEN = HIER / "schriften"
DIST = HIER / "dist"
ORDNERNAME = "Netzwerk-Labor"


def version() -> str:
    """Version aus bauen.py lesen — eine Quelle, kein zweiter Ort zum Pflegen."""
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', (HIER / "bauen.py").read_text(encoding="utf-8"), re.M)
    if not m:
        raise SystemExit("FEHLER: VERSION in bauen.py nicht gefunden.")
    return m.group(1)


def einzeldatei_bauen(ziel: Path) -> None:
    print("Baue die Einzeldatei frisch …")
    if not WEB_INDEX.is_file():
        subprocess.run([sys.executable, str(HIER / "bauen.py")], check=True, capture_output=True)
    r = subprocess.run([sys.executable, str(EINFACH), "--ziel", str(ziel)],
                       capture_output=True, text=True, encoding="utf-8")
    for zeile in (r.stdout or "").splitlines():
        print("  " + zeile)
    if r.returncode != 0:
        raise SystemExit("FEHLER: Einzeldatei konnte nicht gebaut werden:\n" + (r.stderr or ""))


def lizenz_texte() -> list[str]:
    """Die OFL-Texte, die zu den mitgelieferten Schriften gehoeren."""
    return ["OFL-atkinsonhyperlegible.txt", "OFL-bricolagegrotesque.txt", "OFL-jetbrainsmono.txt"]


def paket_bauen(mit_exe: bool, nur_ordner: bool, ziel: Path | None) -> int:
    ver = version()
    ordner = DIST / f"{ORDNERNAME}-{ver}"
    if ordner.exists():
        shutil.rmtree(ordner)
    ordner.mkdir(parents=True)

    print(f"Version {ver}")
    print(f"Zielordner {ordner}")
    print()

    # 1 · Die Einzeldatei — das Herz des Pakets.
    html_ziel = ordner / "Netzwerk-Labor.html"
    einzeldatei_bauen(html_ziel)

    # 2 · Alles Uebrige.
    if not VORLAGEN.is_dir():
        raise SystemExit(f"FEHLER: {VORLAGEN} fehlt.")
    shutil.copy2(VORLAGEN / "START-HIER.md", ordner / "START-HIER.md")
    shutil.copy2(VORLAGEN / "LIESMICH.txt", ordner / "LIESMICH.txt")

    lizenz = HIER / "LIZENZ.md"
    if lizenz.is_file():
        shutil.copy2(lizenz, ordner / "LIZENZ.md")
    else:
        print("  HINWEIS: LIZENZ.md fehlt — Paket kommt ohne Lizenzangabe des Programms.")

    (ordner / "LIZENZEN").mkdir(exist_ok=True)
    for name in lizenz_texte():
        quelle = SCHRIFTEN / name
        if not quelle.is_file():
            raise SystemExit(f"FEHLER: Lizenztext fehlt: {quelle}")
        shutil.copy2(quelle, ordner / "LIZENZEN" / name)

    mitgelieferte_exe = False
    if mit_exe:
        if EXE.is_file():
            shutil.copy2(EXE, ordner / "Netzwerk-Labor.exe")
            mitgelieferte_exe = True
            if REPARATUR.is_file():
                shutil.copy2(REPARATUR, ordner / "Integritaet-reparieren.cmd")
        else:
            raise SystemExit(f"FEHLER: --ohne-exe nicht gesetzt, aber {EXE} fehlt.")

    # 3 · Inhaltsverzeichnis mit Pruefsummen schreiben.
    zeilen = [
        f"Netzwerk-Labor {ver} — Inhalt des Pakets",
        "=" * 60,
        "",
        f"{'Bytes':>12}  {'SHA256':<16}  Datei",
        f"{'-'*12}  {'-'*16}  {'-'*40}",
    ]
    for f in sorted(ordner.rglob("*")):
        if f.is_file():
            roh = f.read_bytes()
            rel = f.relative_to(ordner).as_posix()
            zeilen.append(f"{len(roh):>12,}  {hashlib.sha256(roh).hexdigest()[:16]}  {rel}")
    zeilen += [
        "",
        "Spielstand Browser-Fassung : im Browser (localStorage, Schluessel netzwerk-labor)",
        "Spielstand Windows-Prog.   : %APPDATA%\\de.fisi.netzwerklabor\\spielstand.json",
        "Die beiden Fassungen teilen sich den Spielstand NICHT.",
        "",
    ]
    (ordner / "SIZES.txt").write_text("\n".join(zeilen), encoding="utf-8")

    # 4 · Bericht.
    print()
    gesamt = 0
    for f in sorted(ordner.rglob("*")):
        if f.is_file():
            rel = f.relative_to(ordner).as_posix()
            groesse = f.stat().st_size
            gesamt += groesse
            print(f"  {groesse:>12,}  {rel}")
    print(f"  {'-'*12}")
    print(f"  {gesamt:>12,}  Summe ({gesamt/1024/1024:.2f} MB)")

    if nur_ordner:
        print("\n--nur-ordner: kein ZIP geschrieben.")
        return 0

    # 5 · ZIP schreiben und zuruecklesen (CRC32 gegen das Original).
    endung = "Windows" if mitgelieferte_exe else "Browser"
    zip_pfad = ziel or (DIST / f"Netzwerk-Labor-{ver}-{endung}.zip")
    zip_pfad.parent.mkdir(parents=True, exist_ok=True)
    if zip_pfad.exists():
        zip_pfad.unlink()

    with zipfile.ZipFile(zip_pfad, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in sorted(ordner.rglob("*")):
            if f.is_file():
                z.write(f, f"{ORDNERNAME}-{ver}/{f.relative_to(ordner).as_posix()}")

    fehler = []
    with zipfile.ZipFile(zip_pfad) as z:
        kaputt = z.testzip()
        if kaputt:
            fehler.append(f"CRC32-Fehler in {kaputt}")
        namen = set(z.namelist())
        for f in sorted(ordner.rglob("*")):
            if f.is_file():
                rel = f"{ORDNERNAME}-{ver}/{f.relative_to(ordner).as_posix()}"
                if rel not in namen:
                    fehler.append(f"fehlt im ZIP: {rel}")
                    continue
                if hashlib.sha256(z.read(rel)).digest() != hashlib.sha256(f.read_bytes()).digest():
                    fehler.append(f"Inhalt weicht ab: {rel}")

    roh = zip_pfad.read_bytes()
    print()
    print(f"ZIP -> {zip_pfad}")
    print(f"  Groesse   {len(roh):,} Bytes ({len(roh)/1024/1024:.2f} MB)")
    print(f"  Eintraege {len(namen)} Dateien")
    print(f"  SHA256    {hashlib.sha256(roh).hexdigest()}")

    if fehler:
        print("  ROT:")
        for f in fehler:
            print("    - " + f)
        return 1
    print("  GRUEN: CRC32 ohne Beanstandung, jede Datei im ZIP Byte fuer Byte wie im Ordner.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Auslieferungspaket des Netzwerk-Labors bauen")
    ap.add_argument("--ohne-exe", action="store_true", help="nur die Browser-Fassung (klein, ueberall lauffaehig)")
    ap.add_argument("--nur-ordner", action="store_true", help="Ordner bauen, kein ZIP")
    ap.add_argument("--ziel", type=Path, help="Pfad des ZIPs")
    a = ap.parse_args()
    return paket_bauen(not a.ohne_exe, a.nur_ordner, a.ziel)


if __name__ == "__main__":
    sys.exit(main())
