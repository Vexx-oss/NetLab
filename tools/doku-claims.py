#!/usr/bin/env python3
"""WERTE-GATE FÜR DIE DOKU (DOK-03, 3.0) — prüft WERTE statt Musterpräsenz.

Befund (berichte/doku.md, 31.10.2026): tools/fassung-ziehen.py --pruefen war Exit 0 TROTZ
Liesmich "VERSION_CODE = 20006" (android/bauen.py = 20901), drei "13 Tags"-Stellen (git tag
--list = 21) und FAQ "1.1.0" gegen HERKUNFT "2.5.0". Das bestehende Gate prüft Muster, nicht Werte.

Regeln (jede gegen die ECHTE Quelle):
  R1 VERSION_CODE  — README.md, docs/Liesmich.md, docs/Bauen.md == android/bauen.py
  R2 TAG-ZAHL      — "<N> Tags" in README/Liesmich/INHALT/CHANGELOG-Kopf == git tag --list
  R3 BILDSTAND     — "Die Bilder zeigen die Fassung X.Y.Z" == VERSION aus bauen.py; README/FAQ
                     dürfen keine abweichende Bildfassung nennen
  R4 INHALT        — jede Datei docs/entwicklung/**/*.md kommt in docs/INHALT.md vor
  R5 VERWEISZAHL   — "<N> relative Verweise" darf nur in docs/STAND.md stehen (eine Zahlenquelle)

Nutzung:
  python tools/doku-claims.py --pruefen      # Exit 0 = alle Werte stimmen, 1 = Befunde
  python tools/doku-claims.py --gegenprobe   # baut 4 Abweichungen ein; Exit 0 nur bei 4/4 erkannt
  python tools/doku-claims.py --pruefen --gegenprobe
  --blind R2                                 # nur für den Selbsttest der Gegenprobe
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
R1_DATEIEN = ["README.md", "docs/Liesmich.md", "docs/Bauen.md"]
R2_DATEIEN = ["README.md", "docs/Liesmich.md", "docs/INHALT.md"]
R3_DATEIEN = ["README.md", "docs/FAQ.md"]


def konsole_utf8() -> None:
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def lies(rel: str) -> str:
    p = HIER / rel
    try:
        return p.read_text(encoding="utf-8") if p.is_file() else ""
    except OSError:
        return ""


def zeile_von(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def alle_md() -> dict:
    """Alle Markdown-Dateien des Repos außer der erzeugten Website (docs/doku/) und .git."""
    daten = {}
    for p in sorted(HIER.rglob("*.md")):
        rel = p.relative_to(HIER).as_posix()
        teile = rel.split("/")
        if rel.startswith("docs/doku/") or any(t.startswith(".") for t in teile):
            continue
        daten[rel] = lies(rel)
    return daten


def messwerte() -> dict:
    """Die echten Quellen: Fassung, Android-Bauzählung, Bildsatz, Tag-Zahl."""
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', lies("bauen.py"), re.M)
    fassung = m.group(1) if m else None
    m = re.search(r"^VERSION_CODE\s*=\s*(\d+)", lies("android/bauen.py"), re.M)
    version_code = int(m.group(1)) if m else None
    m = re.search(r"Die Bilder zeigen die Fassung (\d+\.\d+\.\d+)", lies("docs/bilder/HERKUNFT.md"))
    bild = m.group(1) if m else None
    tag_zahl = None
    try:
        aus = subprocess.run(["git", "-C", str(HIER), "tag", "--list"],
                             capture_output=True, text=True, timeout=60)
        if aus.returncode == 0:
            tag_zahl = len([z for z in aus.stdout.splitlines() if z.strip()])
    except (OSError, subprocess.SubprocessError):
        tag_zahl = None
    return {"fassung": fassung, "version_code": version_code, "bild": bild, "tag_zahl": tag_zahl}


def changelog_kopf(daten: dict) -> str:
    text = daten.get("docs/CHANGELOG.md", "")
    return re.split(r"^\s*## ", text, maxsplit=1, flags=re.M)[0]


def regel_r1(daten: dict, mess: dict) -> list:
    soll = mess.get("version_code")
    if soll is None:
        return ["R1 nicht messbar: VERSION_CODE in android/bauen.py fehlt oder ist unlesbar"]
    befund = []
    for rel in R1_DATEIEN:
        text = daten.get(rel, "")
        for m in re.finditer(r"VERSION_CODE\s*(?:=|ist|:)\s*([0-9]{4,7})", text):
            ist = int(m.group(1))
            if ist != soll:
                befund.append("%s:%d — VERSION_CODE %d, android/bauen.py sagt %d"
                              % (rel, zeile_von(text, m.start()), ist, soll))
    return befund


def regel_r2(daten: dict, mess: dict) -> list:
    soll = mess.get("tag_zahl")
    if soll is None:
        return ["R2 nicht messbar: git tag --list nicht verfügbar — nie grün (Prüfkopie ohne .git?)"]
    befund = []
    teile = [(rel, daten.get(rel, "")) for rel in R2_DATEIEN]
    teile.append(("docs/CHANGELOG.md (Kopf)", changelog_kopf(daten)))
    for rel, text in teile:
        for m in re.finditer(r"(\d+)\s+Tags\b", text):
            ist = int(m.group(1))
            if ist != soll:
                befund.append("%s:%d — „%d Tags“, git tag --list zählt %d"
                              % (rel, zeile_von(text, m.start()), ist, soll))
    return befund


def regel_r3(daten: dict, mess: dict) -> list:
    fassung = mess.get("fassung")
    bild = mess.get("bild")
    if fassung is None:
        return ["R3 nicht messbar: VERSION in bauen.py fehlt oder ist unlesbar"]
    befund = []
    if bild is None:
        befund.append("docs/bilder/HERKUNFT.md — Satz „Die Bilder zeigen die Fassung X.Y.Z“ fehlt")
    elif bild != fassung:
        befund.append("docs/bilder/HERKUNFT.md — Bildstand %s, aktuelle Fassung %s "
                      "(Screenshots erneuern oder Ausnahme eintragen)" % (bild, fassung))
    for rel in R3_DATEIEN:
        text = daten.get(rel, "")
        for m in re.finditer(r"(?:Bilder|Screenshots)\b[^\n]*?(\d+\.\d+\.\d+)", text):
            ist = m.group(1)
            if ist != bild:
                befund.append("%s:%d — nennt Bildfassung %s, HERKUNFT sagt %s"
                              % (rel, zeile_von(text, m.start()), ist, bild))
    return befund


def entwicklung_dateien() -> list:
    ordner = HIER / "docs" / "entwicklung"
    if not ordner.is_dir():
        return []
    return sorted(p for p in ordner.rglob("*.md") if p.is_file())


def regel_r4(daten: dict, mess: dict) -> list:
    inhalt = daten.get("docs/INHALT.md", "")
    befund = []
    for p in entwicklung_dateien():
        if p.name not in inhalt:
            befund.append("%s fehlt in docs/INHALT.md" % p.relative_to(HIER).as_posix())
    return befund


# R5-Ausnahmen (dokumentiert, sichtbar gemeldet): historische Aufzeichnungen dürfen ihre damals
# gemessenen Zahlen behalten — docs/STAND.md:7 verbietet das Rückdatieren alter CHANGELOG-Abschnitte;
# der Review-Bericht vom 09.10.2026 ist ein datiertes Messprotokoll. Beides ist KEINE aktuelle Aussage.
R5_AUSNAHMEN = {
    "docs/CHANGELOG.md": "historischer CHANGELOG-Abschnitt (docs/STAND.md:7 — nicht rückdatieren)",
    "docs/entwicklung/Review – Betrieb.md": "datierter Review-Bericht (Messprotokoll 09.10.2026)",
}


def regel_r5(daten: dict, mess: dict) -> tuple:
    befund, ausnahmen = [], []
    for rel, text in daten.items():
        if rel == "docs/STAND.md":
            continue
        for m in re.finditer(r"(\d+)\s+relative\s+Verweise", text):
            zeile = "%s:%d — „%s relative Verweise“" % (rel, zeile_von(text, m.start()), m.group(1))
            if rel in R5_AUSNAHMEN:
                ausnahmen.append(zeile + " (" + R5_AUSNAHMEN[rel] + ")")
            elif rel.startswith("Nachweise/"):
                ausnahmen.append(zeile + " (nicht versioniertes Messprotokoll unter Nachweise/, nicht Teil der Doku)")
            else:
                befund.append(zeile + " — die Zahl gehört nur in docs/STAND.md")
    return befund, ausnahmen


REGELN = [("R1", regel_r1), ("R2", regel_r2), ("R3", regel_r3), ("R4", regel_r4), ("R5", regel_r5)]


def kopf(mess: dict) -> None:
    print("Werte-Gate der Doku (DOK-03): Werte gegen echte Quellen")
    print("  Fassung bauen.py: %s · VERSION_CODE android/bauen.py: %s · Tag-Zahl: %s · Bildstand: %s"
          % (mess.get("fassung"), mess.get("version_code"), mess.get("tag_zahl"), mess.get("bild")))
    print()


def pruefen(daten: dict, mess: dict, blind) -> int:
    kopf(mess)
    alle = []
    for nr, fn in REGELN:
        if blind == nr:
            print("%s: BLIND (per --blind abgeschaltet — nur für den Selbsttest)" % nr)
            continue
        ergebnis = fn(daten, mess)
        befund, ausnahmen = ergebnis if isinstance(ergebnis, tuple) else (ergebnis, [])
        print("%s: %s" % (nr, "ROT" if befund else "grün"))
        for b in befund:
            print("  — " + b)
        for a in ausnahmen:
            print("  · dokumentierte Ausnahme: " + a)
        alle.extend(befund)
    print()
    if alle:
        print("ROT: %d Befund(e). Das Werte-Gate ist nicht grün — Zahlen und Bildstand aus den "
              "echten Quellen nachziehen (DOK-01/02/04/05/07/08)." % len(alle))
        return 1
    print("GRUEN: alle Werte stimmen mit den echten Quellen überein.")
    return 0


def gegenprobe(daten: dict, mess: dict, blind) -> int:
    print("Gegenprobe: vier absichtliche Abweichungen — jede zuständige Regel muss anschlagen.")
    mess_g = dict(mess)
    if mess_g.get("tag_zahl") is None:
        mess_g["tag_zahl"] = 21
    if mess_g.get("version_code") is None:
        mess_g["version_code"] = 20901
    if not mess_g.get("fassung"):
        mess_g["fassung"] = "2.9.0"
    faelle = [("R1", _verstelle_r1, regel_r1), ("R2", _verstelle_r2, regel_r2),
              ("R3", _verstelle_r3, regel_r3), ("R4", _verstelle_r4, regel_r4)]
    fehlt = []
    for nr, verstelle, regel in faelle:
        kopie = dict(daten)
        verstelle(kopie, mess_g)
        treffer = regel(kopie, mess_g)
        if isinstance(treffer, tuple):
            treffer = treffer[0]
        print("  %s erkannt +%d" % (nr, len(treffer)))
        if not treffer:
            fehlt.append(nr)
    print()
    if blind in [nr for nr, _, _ in faelle]:
        fehlt.append(blind)
    if fehlt:
        print("ROT: die Gegenprobe ist blind für %s (BLIND). Das Gate ist nicht belastbar."
              % ", ".join(sorted(set(fehlt))))
        return 1
    print("GRUEN: Gegenprobe 4/4 — R1, R2, R3, R4 schlagen auf ihre Abweichung an.")
    return 0


def _verstelle_r1(daten: dict, mess: dict) -> None:
    rel = "docs/Liesmich.md"
    text = daten.get(rel, "")
    m = re.search(r"(VERSION_CODE\s*(?:=|ist|:)\s*)(\d{4,7})", text)
    falsch = str(int(mess["version_code"]) + 1)
    if m:
        daten[rel] = text[:m.start(2)] + falsch + text[m.end(2):]
    else:
        daten[rel] = text + "\nVERSION_CODE = " + falsch + "\n"


def _verstelle_r2(daten: dict, mess: dict) -> None:
    falsch = str(int(mess["tag_zahl"]) + 1)
    for rel in R2_DATEIEN + ["docs/CHANGELOG.md"]:
        text = daten.get(rel, "")
        m = re.search(r"(\d+)(\s+Tags\b)", text)
        if m:
            daten[rel] = text[:m.start(1)] + falsch + text[m.end(1):]
            return
    daten["docs/Liesmich.md"] = daten.get("docs/Liesmich.md", "") + "\n" + falsch + " Tags\n"


def _verstelle_r3(daten: dict, mess: dict) -> None:
    rel = "docs/bilder/HERKUNFT.md"
    text = daten.get(rel, "")
    daten[rel] = re.sub(r"Die Bilder zeigen die Fassung \d+\.\d+\.\d+",
                        "Die Bilder zeigen die Fassung 9.9.9", text)


def _verstelle_r4(daten: dict, mess: dict) -> None:
    # W2-Gate-Befund: docs/INHALT.md nennt den Dateinamen ZWEIMAL (Anzeigetext UND Linkziel,
    # z. B. [`entwicklung/A.md`](<entwicklung/A.md>)). Ein replace(..., 1) entfernte nur das erste
    # Vorkommen — R4 blieb dadurch blind (Gegenprobe 3/4). Jetzt ALLE Vorkommen ersetzen.
    inhalt = daten.get("docs/INHALT.md", "")
    for p in entwicklung_dateien():
        if p.name in inhalt:
            daten["docs/INHALT.md"] = inhalt.replace(p.name, "___GEGENPROBE___")
            return
    daten["docs/INHALT.md"] = inhalt


def main() -> int:
    konsole_utf8()
    ap = argparse.ArgumentParser(description="Werte-Gate der Doku (DOK-03, 3.0)")
    ap.add_argument("--pruefen", action="store_true", help="Werte gegen die echten Quellen prüfen")
    ap.add_argument("--gegenprobe", action="store_true", help="4 Abweichungen einbauen; nur 4/4 ist grün")
    ap.add_argument("--blind", default=None, help="Regel für den Selbsttest abschalten (z. B. R2)")
    args = ap.parse_args()
    if not args.pruefen and not args.gegenprobe:
        ap.error("bitte --pruefen und/oder --gegenprobe angeben")
    daten = alle_md()
    mess = messwerte()
    code = 0
    if args.pruefen:
        code = max(code, pruefen(daten, mess, args.blind))
        if args.gegenprobe:
            print()
    if args.gegenprobe:
        code = max(code, gegenprobe(daten, mess, args.blind))
    return code


if __name__ == "__main__":
    sys.exit(main())
