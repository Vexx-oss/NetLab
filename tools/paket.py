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
(keine Aussenverweise). Enthaelt das Paket die .exe, wird zuerst ihre ProductVersion
gegen `VERSION` aus `bauen.py` geprueft (`tools/pruefe-paket.py`): eine veraltete .exe
bricht das Packen ab, statt als Paket der neuen Fassung zu erscheinen (Audit B12).
Danach wird das ZIP zurueckgelesen und jedes Element mit CRC32 gegen das Original
geprueft — ein Paket, das sich nicht oeffnen laesst, faellt hier auf und nicht beim Nutzer.

Das ZIP ist reproduzierbar (BAU-07): Eintraege sortiert, ein fester Zeitstempel
(ohne `SOURCE_DATE_EPOCH`: 1980-01-01, sonst dessen UTC-Zeit) und keine OS-Metadaten.
Zwei Laeufe mit gleichem Inhalt und gleichem `SOURCE_DATE_EPOCH` ergeben byte-gleiche
Dateien. Der Anhangsname ist `Netzwerk-Labor-<version>-Browser.zip` (mit .exe:
`-Windows.zip`) und wird vom Release-Gate erwartet.

Aufruf:
    python tools/paket.py                    -> dist/Netzwerk-Labor-<version>-Windows.zip
    python tools/paket.py --ohne-exe         -> nur die Browser-Fassung (klein, ueberall lauffaehig)
    python tools/paket.py --nur-ordner       -> Ordner bauen, kein ZIP
    python tools/paket.py --gegenprobe       -> Determinismus-/Namens-Selbsttest (Attrappen)
    python tools/paket.py --ziel X.zip
"""
import argparse
import datetime
import hashlib
import importlib.util
import os
import re
import shutil
import subprocess
import sys
import tempfile
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

# BAU-09: Die Fassungs-Pruefung der .exe liegt in `tools/pruefe-paket.py` — dasselbe
# Werkzeug ist eigenstaendig aufrufbar (Release-Gate/Abnahme). Der Dateiname enthaelt einen
# Bindestrich, deshalb wird das Modul ueber den Pfad geladen statt mit `import`.
_PRUEFE_PFAD = HIER / "tools" / "pruefe-paket.py"
_spec = importlib.util.spec_from_file_location("pruefe_paket", _PRUEFE_PFAD)
pruefe_paket = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pruefe_paket)


def version() -> str:
    """Version aus bauen.py lesen — eine Quelle, kein zweiter Ort zum Pflegen."""
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', (HIER / "bauen.py").read_text(encoding="utf-8"), re.M)
    if not m:
        raise SystemExit("FEHLER: VERSION in bauen.py nicht gefunden.")
    return m.group(1)


def zip_dateiname(ver: str, mit_exe: bool) -> str:
    """Anhangsname des Release: Netzwerk-Labor-<VERSION>-Browser.zip bzw. -Windows.zip.

    Das Release-Gate (pruefsummen in .github/workflows/release.yml) erwartet genau diese
    Namen; darum stehen sie an EINER Stelle und werden mit --gegenprobe geprueft.
    """
    endung = "Windows" if mit_exe else "Browser"
    return f"Netzwerk-Labor-{ver}-{endung}.zip"


def zip_zeit() -> tuple[int, int, int, int, int, int]:
    """Zeitstempel aller ZIP-Eintraege: fest, oder aus SOURCE_DATE_EPOCH.

    Ohne SOURCE_DATE_EPOCH gilt 1980-01-01 00:00 (ZIP-Minimum): das ZIP haengt dann nicht
    an Datei-mtimes oder der Systemzeit. Ist SOURCE_DATE_EPOCH gesetzt, wird der
    UTC-Zeitpunkt benutzt (Standard fuer reproduzierbare Pakete).
    """
    roh = os.environ.get("SOURCE_DATE_EPOCH")
    if not roh:
        return (1980, 1, 1, 0, 0, 0)
    try:
        sekunden = int(roh)
    except ValueError:
        raise SystemExit(f"FEHLER: SOURCE_DATE_EPOCH ist keine ganze Zahl: {roh!r}")
    try:
        zeit = datetime.datetime.fromtimestamp(sekunden, tz=datetime.timezone.utc)
    except (OverflowError, OSError, ValueError):
        raise SystemExit(
            f"FEHLER: SOURCE_DATE_EPOCH liegt ausserhalb des darstellbaren Bereichs: {roh}")
    if zeit.year < 1980:
        raise SystemExit("FEHLER: SOURCE_DATE_EPOCH liegt vor 1980 — ZIP kann das nicht speichern.")
    return (zeit.year, zeit.month, zeit.day, zeit.hour, zeit.minute, zeit.second)


def zip_schreiben(ordner: Path, ver: str, zip_pfad: Path) -> None:
    """Deterministisches ZIP: sortierte Eintraege, feste Zeit, keine OS-Metadaten.

    Warum: Fuer ein reproduzierbares Release-Paket darf derselbe Inhalt nicht durch
    Datei-mtimes, Betriebssystem oder Eintrags-Reihenfolge zu anderen Bytes fuehren.
    Deshalb bekommt jeder Eintrag denselben Zeitstempel (zip_zeit()), denselben
    Unix-Modus 0644 (create_system=3, external_attr=0o100644<<16) und die Eintraege
    entstehen sortiert. Gleiche Quelldaten + gleiche Fassung + gleicher
    SOURCE_DATE_EPOCH ergeben byte-gleiche Dateien.
    """
    zeit = zip_zeit()
    zip_pfad.parent.mkdir(parents=True, exist_ok=True)
    if zip_pfad.exists():
        zip_pfad.unlink()
    with zipfile.ZipFile(zip_pfad, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(ordner.rglob("*")):
            if not f.is_file():
                continue
            rel = f.relative_to(ordner).as_posix()
            info = zipfile.ZipInfo(f"{ORDNERNAME}-{ver}/{rel}", date_time=zeit)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            z.writestr(info, f.read_bytes(), compresslevel=9)


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

    # BAU-09-Gate: Eine .exe mit fremder ProductVersion darf nicht in einem Paket dieser
    # Fassung landen. Der Audit (berichte/bau-release.md, B12) fand den Fall, dass eine
    # lokale 2.8.0-.exe als `Netzwerk-Labor-2.9.0-Windows.zip` erschienen waere. Das Gate
    # laeuft VOR Aufraeumen/Bauen: bei Abweichung bleibt der Baum unberuehrt.
    if mit_exe and EXE.is_file():
        try:
            exe_ver = pruefe_paket.exe_product_version(EXE)
        except pruefe_paket.NichtPruefbar as e:
            raise SystemExit(f"FEHLER: ProductVersion der .exe nicht pruefbar: {e}")
        if exe_ver != ver:
            raise SystemExit(
                f"FEHLER: {EXE.relative_to(HIER)} hat ProductVersion {exe_ver}, "
                f"bauen.py VERSION ist {ver}.\n"
                f"  Ein Paket der Fassung {ver} darf keine .exe mit {exe_ver} enthalten.\n"
                "  Die .exe aus DIESEM Stand neu bauen (docs/Bauen.md) oder --ohne-exe verwenden.\n"
                "  Pruefung: python tools/pruefe-paket.py --nur-pruefen")
        print(f"  Fassung der .exe: ProductVersion {exe_ver} = VERSION {ver}")

    ordner = DIST / f"{ORDNERNAME}-{ver}"

    # 1 · Reste frueherer Fassungen wegraeumen.
    # `dist/` ist git-ignoriert und sammelt sich ueber die Sitzungen an. Gemessen am 09.10.2026
    # lagen dort gleichzeitig `Netzwerk-Labor-1.2.1-Windows.zip`, `…-1.2.4-Windows.zip` und
    # `…-1.2.4-Browser.zip` — und der Release-Ablauf sammelt mit `ls dist/*.zip` ALLE ein. Ein
    # einziger Lauf haette also drei Pakete an eine Veroeffentlichung gehaengt, darunter zwei
    # fremde Fassungen. Was hier nicht entsteht, hat in `dist/` nichts zu suchen.
    if DIST.is_dir():
        entfernt = 0
        for alt in sorted(DIST.iterdir()):
            if alt.resolve() == ordner.resolve():
                continue
            if not alt.name.startswith("Netzwerk-Labor-"):
                continue
            if alt.is_dir():
                shutil.rmtree(alt, ignore_errors=True)
            else:
                try:
                    alt.unlink()
                except OSError:
                    pass
            entfernt += 1
        if entfernt:
            print(f"  dist/ aufgeraeumt: {entfernt} Reste frueherer Fassungen entfernt.")

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
    # Der verbindliche englische Lizenztext gehoert dazu, nicht nur die Erklaerung.
    englisch = HIER / "LICENSE"
    if englisch.is_file():
        shutil.copy2(englisch, ordner / "LICENSE")
    else:
        raise SystemExit(f"FEHLER: {englisch} fehlt — ohne Lizenztext darf nicht ausgeliefert werden.")

    (ordner / "LIZENZEN").mkdir(exist_ok=True)
    for name in lizenz_texte():
        quelle = SCHRIFTEN / name
        if not quelle.is_file():
            raise SystemExit(f"FEHLER: Lizenztext fehlt: {quelle}")
        shutil.copy2(quelle, ordner / "LIZENZEN" / name)

    # Die Dokumentation als Ordner dazu (seit 07.10.2026). Sie liegt fertig erzeugt in
    # `docs/doku/` (tools/seite.py, deterministisch) und wird nur kopiert — kein Bau im Paket.
    # Warum ueberhaupt: wer das Spiel herunterlaedt, arbeitet oft OHNE Netz (das ist der Sinn
    # der Einzeldatei). Die Doku war bis dahin nur online erreichbar. Der Ordner ist
    # eigenstaendig: er verlinkt untereinander, braucht keine Schriften von aussen und
    # stoert den Spielstart nicht (das Spiel ist eine einzelne HTML-Datei daneben).
    doku = HIER / "docs" / "doku"
    if doku.is_dir():
        shutil.copytree(doku, ordner / "doku")
        anzahl = sum(1 for _ in (ordner / "doku").rglob("*.html"))
        print(f"  Doku beigelegt: {anzahl} HTML-Seiten aus docs/doku/")
    else:
        print("  HINWEIS: docs/doku/ fehlt — Paket kommt ohne Doku (python tools/seite.py baut sie).")

    mitgelieferte_exe = False
    if mit_exe:
        if EXE.is_file():
            shutil.copy2(EXE, ordner / "Netzwerk-Labor.exe")
            mitgelieferte_exe = True
            if REPARATUR.is_file():
                shutil.copy2(REPARATUR, ordner / "Integritaet-reparieren.cmd")
        else:
            # Kein Abbruch: Auf einem frischen Klon (und damit in jeder Pruefung auf GitHub)
            # gibt es die .exe nicht — sie ist 8 MB gross und liegt bewusst nicht im Git.
            # Dann entsteht die Browser-Fassung, und das steht auch so im Bericht. Ein
            # Abbruch waere hier falsch: das Paket ist auch ohne .exe vollstaendig spielbar.
            print(f"  HINWEIS: {EXE} fehlt — es entsteht die Browser-Fassung ohne .exe.")
            print("           Die .exe baut man selbst (siehe Bauen.md) und ruft paket.py")
            print("           danach erneut auf.")
    else:
        print("  --ohne-exe: es entsteht die Browser-Fassung ohne .exe.")

    # 2b · Ehrlicher Hinweis, wenn die .exe fehlt.
    # Die Vorlagen beschreiben unter "Weg 2" das Windows-Programm. Fehlt die .exe im Paket,
    # stuende dort eine Anleitung fuer eine Datei, die es nicht gibt — gemessen am Release
    # 1.2.3: LIESMICH.txt und START-HIER.md verwiesen auf Netzwerk-Labor.exe, im ZIP lag
    # nur die Browser-Fassung. Der Hinweis wird deshalb vorn an beide Texte angehaengt.
    if not mitgelieferte_exe:
        hinweis = (
            "HINWEIS ZU DIESEM PAKET\n"
            + "-" * 64 + "\n"
            "Dieses Paket enthaelt die Browser-Fassung: Netzwerk-Labor.html.\n"
            "Das Windows-Programm (Netzwerk-Labor.exe, rund 8 MB) ist NICHT in diesem\n"
            "Paket enthalten - es haengt als eigener Anhang an der Veroeffentlichung\n"
            "(Release) oder wird selbst gebaut (docs/Bauen.md). Alles, was unten unter\n"
            "\"Weg 2\" steht, gilt, sobald du die Datei hast.\n"
            + "-" * 64 + "\n\n"
        )
        for name in ("LIESMICH.txt", "START-HIER.md"):
            p = ordner / name
            p.write_text(hinweis + p.read_text(encoding="utf-8"), encoding="utf-8")
        print("  HINWEIS in LIESMICH.txt und START-HIER.md eingetragen (keine .exe im Paket).")

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

    # 5 · ZIP schreiben und zuruecklesen (CRC32 gegen das Original). Der Schreiber ist
    #     deterministisch (feste Zeit, keine OS-Metadaten); siehe zip_schreiben().
    zip_pfad = ziel or (DIST / zip_dateiname(ver, mitgelieferte_exe))
    zip_schreiben(ordner, ver, zip_pfad)

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


def _attrappe_bauen(basis: Path, mtime: float) -> Path:
    """Kleiner Attrappen-Ordner mit gleichem Inhalt, aber vorgegebener Dateizeit."""
    ordner = basis / "Netzwerk-Labor-2.9.0"
    ordner.mkdir(parents=True)
    for name, inhalt in (("eins.txt", b"eins"), ("zwei.html", b"zwei"),
                         ("unter/drei.bin", b"\x00\x01\x02")):
        p = ordner / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(inhalt)
        os.utime(p, (mtime, mtime))
    return ordner


def gegenprobe() -> int:
    """Attrappen-Selbsttest fuer ZIP-Determinismus und Anhangsnamen (4 Faelle).

    Schreibt nur unter %TEMP%, nichts ins Repo. Exit 0 nur bei 4/4."""
    ergebnisse: list[tuple[str, bool]] = []

    def fall(titel: str, pruefung) -> None:
        try:
            ok = bool(pruefung())
        except Exception as e:
            ok = False
            print(f"      {type(e).__name__}: {e}")
        ergebnisse.append((titel, ok))
        print(("  OK  " if ok else "  ROT ") + titel)

    with tempfile.TemporaryDirectory(prefix="netlab-paket-") as tmpstr:
        tmp = Path(tmpstr)
        vorher = os.environ.get("SOURCE_DATE_EPOCH")
        try:
            # Fall 1: gleicher Inhalt, verschiedene Datei-mtimes -> byte-gleich (ohne SOURCE_DATE_EPOCH)
            os.environ.pop("SOURCE_DATE_EPOCH", None)
            a = _attrappe_bauen(tmp / "a", 1_600_000_000)
            b = _attrappe_bauen(tmp / "b", 1_700_000_000)
            za, zb = tmp / "a.zip", tmp / "b.zip"
            zip_schreiben(a, "2.9.0", za)
            zip_schreiben(b, "2.9.0", zb)
            fall("zwei Laeufe mit verschiedenen mtimes byte-gleich",
                 lambda: hashlib.sha256(za.read_bytes()).digest() == hashlib.sha256(zb.read_bytes()).digest())

            # Fall 2: SOURCE_DATE_EPOCH steuert die Zeit: gleicher Wert -> gleich, anderer -> anders
            c = _attrappe_bauen(tmp / "c", 1_650_000_000)
            s1, s2, s3 = tmp / "c1.zip", tmp / "c2.zip", tmp / "c3.zip"
            os.environ["SOURCE_DATE_EPOCH"] = "1700000000"
            zip_schreiben(c, "2.9.0", s1)
            zip_schreiben(c, "2.9.0", s2)
            os.environ["SOURCE_DATE_EPOCH"] = "1700000100"
            zip_schreiben(c, "2.9.0", s3)
            fall("SOURCE_DATE_EPOCH: gleicher Wert gleich, anderer anders",
                 lambda: s1.read_bytes() == s2.read_bytes() and s1.read_bytes() != s3.read_bytes())

            # Fall 3: Anhangsnamen exakt (Release-Gate erwartet diese Namen)
            fall("Anhangsnamen exakt", lambda: (
                zip_dateiname("3.0.0", False) == "Netzwerk-Labor-3.0.0-Browser.zip"
                and zip_dateiname("3.0.0", True) == "Netzwerk-Labor-3.0.0-Windows.zip"))

            # Fall 4: ZIP-Metadaten fix: Zeit 1980-01-01, Unix-Modus 0644, Eintraege sortiert
            def metadaten() -> bool:
                with zipfile.ZipFile(za) as z:
                    infos = z.infolist()
                    fest = all(i.date_time == (1980, 1, 1, 0, 0, 0)
                               and i.create_system == 3
                               and i.external_attr == (0o100644 << 16)
                               and i.compress_type == zipfile.ZIP_DEFLATED
                               and not i.extra for i in infos)
                    namen = [i.filename for i in infos]
                    return fest and len(infos) == 3 and namen == sorted(namen)
            fall("ZIP-Metadaten fix und Eintraege sortiert", metadaten)
        finally:
            if vorher is None:
                os.environ.pop("SOURCE_DATE_EPOCH", None)
            else:
                os.environ["SOURCE_DATE_EPOCH"] = vorher

    gut = sum(1 for _, ok in ergebnisse if ok)
    print()
    if gut == len(ergebnisse):
        print(f"GRUEN: Gegenprobe {gut}/{len(ergebnisse)} — ZIP ist deterministisch, Namen exakt.")
        return 0
    print(f"ROT: Gegenprobe {gut}/{len(ergebnisse)} — ZIP/Namen nicht deterministisch.")
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Auslieferungspaket des Netzwerk-Labors bauen")
    ap.add_argument("--ohne-exe", action="store_true", help="nur die Browser-Fassung (klein, ueberall lauffaehig)")
    ap.add_argument("--mit-exe", action="store_true",
                    help="Windows-Fassung anstreben; fehlt die .exe, entsteht die Browser-Fassung (kein Abbruch)")
    ap.add_argument("--nur-ordner", action="store_true", help="Ordner bauen, kein ZIP")
    ap.add_argument("--ziel", type=Path, help="Pfad des ZIPs")
    ap.add_argument("--gegenprobe", action="store_true",
                    help="Determinismus-/Namens-Selbsttest mit Attrappen (4 Faelle)")
    a = ap.parse_args()
    if a.gegenprobe:
        return gegenprobe()
    if a.ohne_exe and a.mit_exe:
        raise SystemExit("FEHLER: --ohne-exe und --mit-exe zusammen ergeben keinen Sinn.")
    # Standard ist die Windows-Fassung; auf einem frischen Klon wird daraus die
    # Browser-Fassung, mit Hinweis statt Abbruch (siehe paket_bauen).
    return paket_bauen(not a.ohne_exe, a.nur_ordner, a.ziel)


if __name__ == "__main__":
    sys.exit(main())
