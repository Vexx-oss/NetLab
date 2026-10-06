"""Differentialtest des QR-Encoders (Stufe D des Auftrags KLASSENRAUM.md).

Zwei unabhaengig geschriebene Umsetzungen derselben Norm werden Zelle fuer Zelle verglichen:

  * Rust:   tools/klassenraum-probe/C-qr-rust/   (abhaengigkeitsfrei, nur std)
  * Python: tools/klassenraum-probe/C-qr-python/qr_referenz.py  (nur Standardbibliothek)

Dazu die Rueckkodierung: die Matrix des Rust-Encoders wird mit dem unabhaengig geschriebenen
Leser qr_lesen.py wieder in die Nutzlast zurueckverwandelt (Matrix -> Text), und dessen
Reed-Solomon-Syndrome muessen alle null sein.

Aufruf:
    python tools/klassenraum-probe/C-qr-python/vergleich.py
    python tools/klassenraum-probe/C-qr-python/vergleich.py --nachweis Nachweise/Klassenraum/C-qr.json

Ergebnis: eine JSON-Datei mit Nutzlast, Matrix-Hash (SHA256 ueber "\\n".join(matrix)), der
Rueckkodierung und dem Ergebnis jedes Falls. Rueckgabewert 0 = alles gleich, 1 = Abweichung.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
PROJEKT = HIER.parent.parent.parent
RUST_EXE = HIER.parent / "C-qr-rust" / "target" / "release" / "C-qr-rust.exe"
REFERENZ = HIER / "qr_referenz.py"
LESER = HIER / "qr_lesen.py"

# (Text, Stufe, Version, Maske) - None bei Version/Maske heisst "automatisch".
FAELLE = [
    ("NL-4F7K-2Q", "H", 1, 0),
    ("NL-4F7K-2Q", "H", 1, None),
    ("NL-ABCD-12", "L", 1, 3),
    ("HALLO WELT 1234", "M", 2, None),
    ("HALLO WELT 1234", "M", 3, 1),
    ("HALLO WELT 1234", "L", 4, 5),
    ("NL-ABCD-12", "H", 4, None),
    # alle acht Masken bei einem echten Auftragscode
    ("NL-4F7K-2Q", "Q", 1, 1),
    ("NL-4F7K-2Q", "Q", 1, 2),
    ("NL-4F7K-2Q", "Q", 1, 4),
    ("NL-4F7K-2Q", "Q", 1, 6),
    ("NL-4F7K-2Q", "Q", 1, 7),
    # kleine und grosse Stufen
    ("NL-4F7K-2Q", "L", 1, None),
    ("NL-4F7K-2Q", "M", 1, None),
    ("NL-2Q", "H", 1, None),
    ("NL-9Z8Y-7X", "H", 1, None),
    # Byte-Modus (kleine Buchstaben) - UTF-8, wie in der Referenz
    ("Hallo Welt 123", "M", 2, None),
    ("Netzwerk-Labor", "Q", 3, None),
    # groessere Versionen mit alphanumerischem Inhalt
    ("NL-ABCD-12-EFGH-34", "H", 2, None),
    ("NL-ABCD-12-EFGH-34-IJKL-56", "M", 3, None),
    # nicht-alphanumerischer Inhalt (Byte-Modus, UTF-8)
    ("Auftrag: NL-4F7K-2Q!", "Q", 2, None),
    # Rückfall-Fälle der Gegenprüfung: Hier hatte die Maskenwahl des Rust-Encoders einen
    # Fehler in Strafregel 1 (Spaltenlauf begann bei m[i][0] statt m[0][i]) und wich in rund
    # 2 % der Fälle von der Referenz ab. Diese vier Fälle waren betroffen und sind jetzt
    # Regressionsproben.
    ("AAAAAAAAA", "L", 1, None),
    ("US", "H", 1, None),
    ("AAAAAAAAAAAAAAAAAAAAAAAAA", "L", 4, None),
    ("4Y1XDUEIQB", "L", 3, None),
]


def sha256_matrix(zeilen: list[str]) -> str:
    return hashlib.sha256("\n".join(zeilen).encode("utf-8")).hexdigest()


def utf8_schreiben(pfad: Path, text: str) -> None:
    pfad.write_text(text, encoding="utf-8", newline="\n")


def rust_lauf(text: str, stufe: str, version, maske, svg: Path | None = None):
    befehl = [str(RUST_EXE), "--text", text, "--ecc", stufe]
    if version is not None:
        befehl += ["--version", str(version)]
    befehl += ["--maske", "auto" if maske is None else str(maske)]
    if svg is not None:
        befehl += ["--svg", str(svg)]
    r = subprocess.run(befehl, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        return None, (r.stderr or "").strip() or f"Rueckgabewert {r.returncode}"
    try:
        return json.loads(r.stdout), None
    except json.JSONDecodeError as e:
        return None, f"Ausgabe ist kein JSON: {e}"


def python_lauf(text: str, stufe: str, version, maske):
    befehl = [sys.executable, str(REFERENZ), "--text", text, "--ecc", stufe]
    if version is not None:
        befehl += ["--version", str(version)]
    if maske is not None:
        befehl += ["--maske", str(maske)]
    r = subprocess.run(befehl, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        return None, (r.stderr or "").strip() or f"Rueckgabewert {r.returncode}"
    try:
        return json.loads(r.stdout), None
    except json.JSONDecodeError as e:
        return None, f"Ausgabe ist kein JSON: {e}"


def rueckkodieren(matrix: list[str], ordner: Path):
    datei = ordner / "matrix.json"
    utf8_schreiben(datei, json.dumps({"matrix": matrix}))
    r = subprocess.run([sys.executable, str(LESER), "--matrix-datei", str(datei)], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        return None, (r.stderr or "").strip() or f"Rueckgabewert {r.returncode}"
    try:
        return json.loads(r.stdout), None
    except json.JSONDecodeError as e:
        return None, f"Leser liefert kein JSON: {e}"


def main() -> int:
    ap = argparse.ArgumentParser(description="Differentialtest Rust-Encoder gegen Python-Referenz")
    ap.add_argument("--nachweis", default=str(PROJEKT / "Nachweise" / "Klassenraum" / "C-qr.json"))
    args = ap.parse_args()

    if not RUST_EXE.exists():
        print(f"Rust-Probe fehlt: {RUST_EXE}\nErst bauen: cd tools/klassenraum-probe/C-qr-rust; cargo build --release")
        return 2

    ergebnisse = []
    alle_gleich = True
    # Arbeitsordner bewusst IM Projekt: Der Temp-Ordner dieser Umgebung ist fuer Unterprozesse
    # gesperrt (gemessen 06.10.2026: "Zugriff verweigert" beim Schreiben des SVG).
    arbeitsordner = HIER / "_arbeit"
    if arbeitsordner.exists():
        shutil.rmtree(arbeitsordner, ignore_errors=True)
    arbeitsordner.mkdir(parents=True, exist_ok=True)
    try:
        ordner = arbeitsordner
        for text, stufe, version, maske in FAELLE:
            eintrag = {"text": text, "ecc": stufe, "version": version, "maske": "auto" if maske is None else maske}
            svg_datei = ordner / "probe.svg"
            if svg_datei.exists():
                svg_datei.unlink()
            rust, fehler_r = rust_lauf(text, stufe, version, maske, svg=svg_datei)
            py, fehler_p = python_lauf(text, stufe, version, maske)
            if rust is None or py is None:
                eintrag["ok"] = False
                eintrag["fehler"] = {"rust": fehler_r, "python": fehler_p}
                alle_gleich = False
                ergebnisse.append(eintrag)
                print(f"  ABWEICHUNG {text!r} {stufe} v{version} m{maske}: {fehler_r or fehler_p}")
                continue

            gleich = rust["matrix"] == py["matrix"]
            eintrag.update(
                {
                    "rust": {
                        "version": rust["version"],
                        "ecc": rust["ecc"],
                        "modus": rust.get("modus"),
                        "maske": rust["maske"],
                        "auto": rust["auto"],
                        "groesse": rust["groesse"],
                        "sha256": sha256_matrix(rust["matrix"]),
                    },
                    "python": {
                        "version": py["version"],
                        "ecc": py["ecc"],
                        "maske": py["maske"],
                        "auto": py["auto"],
                        "groesse": py["groesse"],
                        "sha256": sha256_matrix(py["matrix"]),
                    },
                    "matrizen_gleich": gleich,
                }
            )
            if not gleich:
                abweichend = [i for i, (a, b) in enumerate(zip(rust["matrix"], py["matrix"])) if a != b]
                eintrag["abweichende_zeilen"] = abweichend
                eintrag["ok"] = False
                alle_gleich = False
                print(f"  ABWEICHUNG {text!r} {stufe} v{version} m{maske}: {len(abweichend)} Zeilen")
                ergebnisse.append(eintrag)
                continue

            # Rueckkodierung der RUST-Matrix
            gelesen, fehler_l = rueckkodieren(rust["matrix"], ordner)
            if gelesen is None:
                eintrag["ok"] = False
                eintrag["fehler"] = {"leser": fehler_l}
                alle_gleich = False
                ergebnisse.append(eintrag)
                print(f"  RUECKKODIERUNG FEHLGESCHLAGEN {text!r}: {fehler_l}")
                continue
            eintrag["rueckkodiert"] = gelesen
            passt = gelesen.get("text") == text and gelesen.get("syndrome_ok") is True
            eintrag["ok"] = passt
            alle_gleich &= passt

            if svg_datei.exists():
                svg = svg_datei.read_text(encoding="utf-8")
                kante = (rust["groesse"] + 8) * 8  # 4 Module Ruhezone je Seite, 8 px je Modul
                eintrag["svg"] = {
                    "datei_bytes": len(svg.encode("utf-8")),
                    "kante_erwartet": kante,
                    "kante_gefunden": f'width="{kante}"' in svg,
                    "crispEdges": "crispEdges" in svg,
                    "data_uri_praefix": rust.get("data_uri_praefix"),
                    "data_uri_bytes": rust.get("data_uri_bytes"),
                }
                if not (eintrag["svg"]["kante_gefunden"] and eintrag["svg"]["crispEdges"]):
                    eintrag["ok"] = False
                    alle_gleich = False

            ergebnisse.append(eintrag)
            print(
                f"  ok  {text!r:26} {stufe} v{rust['version']} m{rust['maske']}"
                f"{' (auto)' if rust['auto'] else ''}  sha256 {eintrag['rust']['sha256'][:16]}…"
            )

        # Kapazitaetsgrenze: 10 Zeichen muessen in V1-H passen, 11 nicht - bei BEIDEN Umsetzungen.
        grenze = {}
        for name, inhalt in (("zehn_zeichen", "NL-4F7K-2Q"), ("elf_zeichen", "NL-4F7K-2QX")):
            r, fr = rust_lauf(inhalt, "H", 1, None)
            p, fp = python_lauf(inhalt, "H", 1, None)
            grenze[name] = {"rust_ok": r is not None, "python_ok": p is not None, "rust_fehler": fr, "python_fehler": fp}
        grenze_ok = (
            grenze["zehn_zeichen"]["rust_ok"]
            and grenze["zehn_zeichen"]["python_ok"]
            and not grenze["elf_zeichen"]["rust_ok"]
            and not grenze["elf_zeichen"]["python_ok"]
        )
        alle_gleich &= grenze_ok
        print(f"  Kapazitaet V1-H: 10 Zeichen ok, 11 abgelehnt (beide): {grenze_ok}")
    finally:
        shutil.rmtree(arbeitsordner, ignore_errors=True)

    nachweis = Path(args.nachweis)
    nachweis.parent.mkdir(parents=True, exist_ok=True)
    inhalt = {
        "pruefung": "Differentialtest QR-Encoder (Rust) gegen unabhaengige Python-Referenz",
        "norm": "ISO/IEC 18004, Model 2, Versionen 1-4, Stufen L/M/Q/H, alphanumerisch und Byte",
        "rust": str(RUST_EXE),
        "python_referenz": str(REFERENZ),
        "python_leser": str(LESER),
        "anzahl_faelle": len(FAELLE),
        "alle_gleich": alle_gleich,
        "kapazitaetsgrenze": grenze,
        "faelle": ergebnisse,
    }
    utf8_schreiben(nachweis, json.dumps(inhalt, indent=2, ensure_ascii=False) + "\n")
    print()
    print(f"Faelle: {len(FAELLE)}  alle Matrizen gleich und rueckkodiert: {alle_gleich}")
    print(f"Nachweis: {nachweis}")
    return 0 if alle_gleich else 1


if __name__ == "__main__":
    sys.exit(main())
