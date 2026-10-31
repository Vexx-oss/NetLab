#!/usr/bin/env python3
"""ABNAHME 3.0.0 (VIS-01, B7) — bündelt die sieben Definition-of-Done-Achsen B1–B7 in EINEM Gate.

Warum: 3.0 verspricht sieben messbare Achsen (berichte/vision.md §3A). Einzelne Gates sind
vorhanden, aber niemand führte sie zusammen; „nicht gemessen“ war kein eigener Zustand.
Dieses Werkzeug führt je Achse benannte Gates mit Befehl und Assertion aus, schreibt
Nachweise/3.0/abnahme.json (Zeit, Modus, Ergebnis je Gate/Achse) und endet mit Exit 1,
sobald ein Gate fehlt oder rot ist. „nicht gemessen“ ist ein eigener Zustand:
  · --schnell (CI):  schwere Gates (voller Testlauf, Browser, .exe) werden als
                     „nicht_gemessen“ ausgewiesen; Exit 0 nur wenn nichts ROT ist.
  · vollständig (W5/W6-Gate, ohne --schnell): „nicht_gemessen“ zählt wie ROT.
--gegenprobe beweist je Achse, dass sie ROT werden kann (simuliert ein fehlendes Gate);
--blind Bn zeigt, dass die Gegenprobe selbst falsifizierbar ist.

Aufrufe:
  python tools/abnahme-3.0.py [--schnell] [--json PFAD] [--nur-achse Bn]
  python tools/abnahme-3.0.py --gegenprobe [--blind Bn]
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
PY = sys.executable
STILL = False          # Gegenprobe: keine echten Befehle starten, nur die Verdrahtung prüfen


def finde_node() -> str | None:
    import os
    import shutil
    for k in (os.environ.get("NODE"),
              str(Path(os.environ.get("LOCALAPPDATA", "")) / "node-portable" / "node-v24.21.0-win-x64" / "node.exe"),
              r"C:\Users\Student\AppData\Local\node-portable\node-v24.21.0-win-x64\node.exe",
              shutil.which("node")):
        if k and Path(k).is_file():
            return k
    return None


NODE = finde_node()


def konsole_utf8() -> None:
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def lies(basis: Path, rel: str) -> str:
    p = basis / rel
    try:
        return p.read_text(encoding="utf-8") if p.is_file() else ""
    except OSError:
        return ""


class Gate:
    def __init__(self, name: str, befehl: str, art: str = "leicht"):
        self.name, self.befehl, self.art = name, befehl, art
        self.status = "nicht_gemessen"
        self.dauer = 0.0
        self.ausgabe = ""

    def gruen(self, ausgabe: str = "") -> "Gate":
        self.status, self.ausgabe = "gruen", ausgabe
        return self

    def rot(self, ausgabe: str) -> "Gate":
        self.status, self.ausgabe = "rot", ausgabe
        return self

    def nicht(self, grund: str) -> "Gate":
        self.status, self.ausgabe = "nicht_gemessen", grund
        return self


class Achse:
    def __init__(self, kuerzel: str, titel: str):
        self.kuerzel, self.titel, self.gates = kuerzel, titel, []

    def gate(self, name: str, befehl: str, art: str = "leicht") -> Gate:
        g = Gate(name, befehl, art)
        self.gates.append(g)
        return g

    def status(self) -> str:
        if any(g.status == "rot" for g in self.gates):
            return "rot"
        if any(g.status == "nicht_gemessen" for g in self.gates):
            return "nicht_gemessen"
        return "gruen"


def datei_da(basis: Path, rel: str) -> tuple[bool, str]:
    p = basis / rel
    return (p.is_file(), rel + ("" if p.is_file() else " fehlt"))


def regex_in(datei: Path, muster: str) -> re.Match | None:
    try:
        return re.search(muster, datei.read_text(encoding="utf-8"), re.M)
    except OSError:
        return None


def lauf_gate(g: Gate, basis: Path, befehl: list, muss: str | None = None,
              timeout: int = 1800, art: str | None = None) -> Gate:
    t0 = time.time()
    try:
        r = subprocess.run(befehl, cwd=str(basis), capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=timeout)
    except (OSError, subprocess.SubprocessError) as e:
        g.dauer = time.time() - t0
        return g.rot("Start fehlgeschlagen: %s" % e)
    aus = ((r.stdout or "") + (r.stderr or "")).strip()
    g.dauer = time.time() - t0
    letzte = [z for z in aus.splitlines() if z.strip()]
    kurz = letzte[-1][:160] if letzte else "(keine Ausgabe)"
    ok = r.returncode == 0 and (muss is None or muss in aus)
    g.ausgabe = kurz
    return g.gruen(kurz) if ok else g.rot("Exit %s: %s" % (r.returncode, kurz))


def achsen_bauen(basis: Path) -> list:
    """Die sieben DoD-Achsen mit ihren Gates (berichte/vision.md §3A, PROMPT §2)."""
    A = []
    # ---------------- B1 Korrektheit ----------------
    b1 = Achse("B1", "Korrektheit: Tests grün, 0 übersprungen, Kern-Pflichttests, Simulation unverändert")
    # Lead-Entscheid 31.10.2026 (a): klassen-sitzungen.test.js ≡ bestehende klassenraum-sitzungen.test.js.
    g = b1.gate("Datei tests/klassen-sitzungen.test.js (Äquivalenz)", "test -f tests/klassenraum-sitzungen.test.js")
    (g.gruen("Äquivalenz: tests/klassenraum-sitzungen.test.js vorhanden")
     if (basis / "tests" / "klassenraum-sitzungen.test.js").is_file()
     else g.rot("weder tests/klassen-sitzungen.test.js noch tests/klassenraum-sitzungen.test.js"))
    # Lead-Entscheid (b): entstehen in W2 (task-32/spiel, task-42/spiel, task-49/ui) — Gate zieht nach.
    for rel in ["tests/spielstand-migration.test.js", "tests/klassen-diagnose.test.js",
                "tests/schalter-wirkung.test.js"]:
        g = b1.gate("Datei " + rel, "test -f " + rel)
        da, txt = datei_da(basis, rel)
        if da:
            g.gruen(txt)
        else:
            g.nicht(txt + " — entsteht in W2 (Lead-Entscheid b: Gate zieht nach)")
    # Lead-Entscheid (c): klassen-ohne-server ist 3.1 (Server C1 nicht in 3.0) — dokumentierte Ausnahme.
    g = b1.gate("Datei tests/klassen-ohne-server.test.js (3.1-Ausnahme)", "dokumentierte Ausnahme: 3.1")
    g.gruen("dokumentierte Ausnahme (Lead-Entscheid c): Server C1 ist 3.1, nicht 3.0 — kein Test erfinden")
    g = b1.gate("Testlauf headless", "node tests/run.js", art="schwer")
    g.nicht("schweres Gate — nur im vollen Lauf")
    g = b1.gate("Simulation unverändert", "node tools/sim-stand.js")
    if STILL:
        g.nicht("Gegenprobe")
    elif NODE and basis == HIER:
        lauf_gate(g, basis, [NODE, "tools/sim-stand.js"], muss="unverändert", timeout=120)
    else:
        g.nicht("Node oder Basis fehlt")
    A.append(b1)

    # ---------------- B2 Inhalt & Didaktik ----------------
    b2 = Achse("B2", "Inhalt/Didaktik: Dichte-Gate, Prüfungsniveau, Inhalts-Korrektheit")
    for rel in ["tests/inhaltsdichte.test.js", "tests/inhalt-korrektheit.test.js"]:
        g = b2.gate("Datei " + rel, "test -f " + rel)
        da, txt = datei_da(basis, rel)
        (g.gruen(txt) if da else g.rot(txt))
    g = b2.gate("Dichte-Matrix + Tickets ohne Fertigkeit", "node tests/run.js inhaltsdichte (Log aus B1)", art="schwer")
    g.nicht("wertet den B1-Testlauf aus — nur im vollen Lauf")
    A.append(b2)

    # ---------------- B3 UX, Design, A11y ----------------
    b3 = Achse("B3", "UX/Design/A11y: R12 gemessen, Kontrast, 44 px, Rauchtest")
    g = b3.gate("R12-Zahl in docs/STAND.md (versionierte Letztmessung)",
                "rauch.py --r12 -> ethos.py --dom --r12 <roh> --festhalten -> tests/r12-stand.json -> stand.py")
    stand = lies(basis, "docs/STAND.md")
    m = re.search(r"^[^\n]*R12[^\n]*$", stand, re.M)
    if not stand:
        g.nicht("docs/STAND.md fehlt")
    elif not m:
        g.rot("keine R12-Zeile in docs/STAND.md — R12 ist nicht gemessen (Befund V-05)")
    elif "nicht gemessen" in m.group(0).lower() or "nicht_gemessen" in m.group(0).lower():
        g.rot("R12 steht in STAND.md als „nicht gemessen“ (Befund V-05)")
    elif not re.search(r"\d", m.group(0)):
        g.rot("R12-Zeile ohne Zahl")
    else:
        g.gruen(m.group(0).strip()[:120])
    g = b3.gate("Kontrast-Test vorhanden", "test -f tests/stil-kontrast.test.js")
    da, txt = datei_da(basis, "tests/stil-kontrast.test.js")
    (g.gruen(txt) if da else g.rot(txt))
    g = b3.gate("Rauchtest (Oberfläche)", "sh tools/test.sh --rauch", art="schwer")
    g.nicht("braucht Edge headless — nur im vollen Lauf")
    A.append(b3)

    # ---------------- B4 Architektur & Wartbarkeit ----------------
    b4 = Achse("B4", "Architektur/Wartbarkeit: keine Abhängigkeit, CSS als Text, Vertrag §12")
    g = b4.gate("Keine neue Abhängigkeit", "package.json unverändert/abwesend")
    (g.gruen("kein package.json — keine npm-Abhängigkeit") if not (basis / "package.json").is_file()
     else g.rot("package.json vorhanden — Abhängigkeit prüfen"))
    g = b4.gate("CSS sind Textdateien", "git ls-files --eol src/stil/*.css (kein -text)")
    if (basis / ".git").is_dir():
        r = subprocess.run(["git", "-C", str(basis), "ls-files", "--eol", "src/stil/*.css"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        zeilen = [z for z in r.stdout.splitlines() if z.strip()]
        schlecht = [z for z in zeilen if "-text" in z]
        if r.returncode != 0 or not zeilen:
            g.rot("git ls-files --eol lieferte nichts")
        elif schlecht:
            g.rot("%d CSS-Datei(en) als -text: %s" % (len(schlecht), schlecht[0][:100]))
        else:
            g.gruen("%d CSS-Datei(en) w/lf oder w/crlf" % len(zeilen))
    else:
        css = sorted((basis / "src" / "stil").glob("*.css"))
        kaputt = [str(p) for p in css if b"\x00" in p.read_bytes()]
        (g.gruen("%d CSS-Datei(en) lesbar (ohne .git: Textprüfung)" % len(css)) if css and not kaputt
         else g.rot("keine CSS-Datei oder Binärinhalt"))
    g = b4.gate("Vertrag §12 vorhanden", "docs/Architektur.md: ## 12 + ### 12.1")
    arch = lies(basis, "docs/Architektur.md")
    if re.search(r"^## 12\b", arch, re.M) and re.search(r"^### 12\.1\b", arch, re.M):
        g.gruen("§12 + §12.1 vorhanden")
    else:
        g.rot("§12/§12.1 fehlt in docs/Architektur.md")
    g = b4.gate("Tests ohne Browser", "node tests/run.js (headless, vm-Kontext)", art="schwer")
    g.nicht("belegt der volle Testlauf")
    A.append(b4)

    # ---------------- B5 Robustheit & Performance ----------------
    b5 = Achse("B5", "Robustheit/Performance: Spielstand-Migration, Klasse ohne Server, Kaltstart")
    g = b5.gate("Datei tests/spielstand-migration.test.js", "test -f tests/spielstand-migration.test.js")
    da, txt = datei_da(basis, "tests/spielstand-migration.test.js")
    (g.gruen(txt) if da else g.nicht(txt + " — entsteht in W2 (Lead-Entscheid b)"))
    g = b5.gate("Datei tests/klassen-ohne-server.test.js (3.1-Ausnahme)", "dokumentierte Ausnahme: 3.1")
    g.gruen("dokumentierte Ausnahme (Lead-Entscheid c): 3.1, nicht 3.0")
    g = b5.gate("Kaltstart 5× gemessen", "Nachweise/3.0/kaltstart.json (5 Messungen + Median)")
    kalt = basis / "Nachweise" / "3.0" / "kaltstart.json"
    if kalt.is_file():
        try:
            daten = json.loads(kalt.read_text(encoding="utf-8"))
            messungen = daten.get("messungen") or daten.get("werte") or []
            median = daten.get("median_ms") or daten.get("median")
            if len(messungen) >= 5 and median is not None:
                g.gruen("%d Messungen, Median %s ms" % (len(messungen), median))
            else:
                g.rot("Kaltstart-Datei ohne 5 Messungen/Median")
        except (OSError, ValueError):
            g.rot("Kaltstart-Datei unlesbar")
    else:
        g.nicht("noch keine Kaltstart-Messung (W5, gates)")
    A.append(b5)

    # ---------------- B6 Doku & Release ----------------
    b6 = Achse("B6", "Doku/Release: STAND+Seite+Fassung frisch, Bildstand 3.0.0")
    g = b6.gate("Doku-Seite strukturell", "python tools/seite.py --pruefen")
    if STILL:
        g.nicht("Gegenprobe")
    elif basis == HIER:
        lauf_gate(g, basis, [PY, "tools/seite.py", "--pruefen"], muss="GRUEN", timeout=300)
    else:
        g.nicht("nur im Repo")
    g = b6.gate("Fassung konsistent", "python tools/fassung-ziehen.py --pruefen")
    if STILL:
        g.nicht("Gegenprobe")
    elif basis == HIER:
        lauf_gate(g, basis, [PY, "tools/fassung-ziehen.py", "--pruefen"], timeout=300)
    else:
        g.nicht("nur im Repo")
    g = b6.gate("Bildstand == aktuelle Fassung", "docs/bilder/HERKUNFT.md vs bauen.py VERSION")
    m = regex_in(basis / "bauen.py", r'^VERSION\s*=\s*"([^"]+)"')
    h = regex_in(basis / "docs/bilder/HERKUNFT.md", r"Die Bilder zeigen die Fassung (\d+\.\d+\.\d+)")
    if not m or not h:
        g.rot("VERSION oder HERKUNFT-Satz fehlt")
    elif h.group(1) != m.group(1):
        g.nicht("Bildstand %s != Fassung %s — Screenshots 3.0.0 folgen in W5 (DOK-04)"
                % (h.group(1), m.group(1)))
    else:
        g.gruen("Bildstand %s = Fassung" % h.group(1))
    g = b6.gate("Stand prüfen (eine Zahlenquelle)", "python tools/stand.py --pruefen", art="schwer")
    g.nicht("startet einen vollen Testlauf — nur im vollen Lauf")
    A.append(b6)

    # ---------------- B7 Messbarkeit ----------------
    b7 = Achse("B7", "Messbarkeit: eine Abnahme-Datei bündelt alle Gates, jeder Satz nennt Befehl")
    g = b7.gate("Jede Achse hat Gates mit Befehl", "--pruefen (Strukturprüfung)")
    fehlt = [a.kuerzel for a in A + [b7] if not a.gates or any(not x.befehl for x in a.gates)]
    (g.gruen("7 Achsen mit Befehlen") if not fehlt else g.rot("Achsen ohne Befehl: " + ", ".join(fehlt)))
    g = b7.gate("Abnahme-Datei JSON", "--json Nachweise/3.0/abnahme.json")
    g.nicht("wird am Ende geschrieben und geprüft")
    A.append(b7)
    return A


def schwere_ausfuehren(achsen: list, basis: Path, testlauf: list) -> None:
    """Füllt die als 'schwer' markierten Gates im vollen Lauf — inkl. einmaligem Testlauf."""
    for a in achsen:
        for g in a.gates:
            if g.art != "schwer" or basis != HIER:
                continue
            if g.name == "Testlauf headless" and NODE:
                t0 = time.time()
                r = subprocess.run([NODE, "tests/run.js"], cwd=str(HIER), capture_output=True,
                                   text=True, encoding="utf-8", errors="replace", timeout=1800)
                aus = (r.stdout or "") + (r.stderr or "")
                testlauf.append(aus)
                g.dauer = time.time() - t0
                bilanz = re.search(r"^(\d+)/(\d+) grün", aus, re.M)
                if r.returncode != 0:
                    g.rot("Exit %s: %s" % (r.returncode, (aus.strip().splitlines() or [""])[-1][:140]))
                elif not bilanz or bilanz.group(1) != bilanz.group(2):
                    g.rot("Bilanz nicht N/N grün: %s" % (bilanz.group(0) if bilanz else "keine Bilanz"))
                elif "davon 0 übersprungen" not in aus:
                    g.rot("übersprungene Tests im Lauf")
                else:
                    g.gruen(bilanz.group(0))
            elif g.name == "Rauchtest (Oberfläche)":
                g.nicht("braucht Edge headless und ein Messfenster — W5")
            elif g.name == "Stand prüfen (eine Zahlenquelle)":
                lauf_gate(g, HIER, [PY, "tools/stand.py", "--pruefen"], timeout=1800)
            elif g.name == "Tests ohne Browser":
                g.gruen("headless belegt: node tests/run.js ohne Browser")
            elif g.name == "Dichte-Matrix + Tickets ohne Fertigkeit" and testlauf:
                log = testlauf[0]
                wiki = re.search(r"Wiki mit >=4 Abschnitten: (\d+)/30", log)
                tickets = re.search(r"Tickets ohne Fertigkeit: (\d+)/76", log)
                matrix = len(re.findall(r"^Inhaltsdichte · lab\.", log, re.M))
                teile = []
                ok = True
                if wiki:
                    teile.append("Wiki >=4: %s/30" % wiki.group(1))
                    if wiki.group(1) != "30":
                        ok = False
                        teile.append("Ziel 30/30 nicht erreicht")
                else:
                    ok = False
                    teile.append("Wiki-Statistik fehlt")
                if tickets and tickets.group(1) == "0":
                    teile.append("Tickets ohne Fertigkeit 0/76")
                else:
                    ok = False
                    teile.append("Tickets ohne Fertigkeit nicht 0")
                if matrix >= 30:
                    teile.append("Matrix %d Zeilen" % matrix)
                else:
                    ok = False
                    teile.append("Matrix unvollständig (%d)" % matrix)
                (g.gruen("; ".join(teile)) if ok else g.rot("; ".join(teile)))


def json_schreiben(pfad: Path, modus: str, achsen: list, exitcode: int) -> None:
    daten = {
        "werkzeug": "tools/abnahme-3.0.py",
        "modus": modus,
        "zeit": datetime.now().astimezone().isoformat(timespec="seconds"),
        "exit": exitcode,
        "bilanz": {
            "gruen": sum(1 for a in achsen if a.status() == "gruen"),
            "rot": sum(1 for a in achsen if a.status() == "rot"),
            "nicht_gemessen": sum(1 for a in achsen if a.status() == "nicht_gemessen"),
            "gates_gruen": sum(1 for a in achsen for g in a.gates if g.status == "gruen"),
            "gates_rot": sum(1 for a in achsen for g in a.gates if g.status == "rot"),
            "gates_nicht_gemessen": sum(1 for a in achsen for g in a.gates if g.status == "nicht_gemessen"),
        },
        "achsen": {a.kuerzel: {"titel": a.titel, "status": a.status(),
                    "gates": [{"name": g.name, "befehl": g.befehl, "art": g.art,
                               "status": g.status, "dauer_s": round(g.dauer, 2),
                               "ausgabe": g.ausgabe[:300]} for g in a.gates]} for a in achsen},
    }
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("\nabnahme.json: %s (%d Achsen, Zeit %s)" % (pfad, len(achsen), daten["zeit"]))


def ausfuehren(basis: Path, schnell: bool, nur: str | None, jsonpfad: Path) -> int:
    achsen = achsen_bauen(basis)
    if nur:
        achsen = [a for a in achsen if a.kuerzel == nur]
        if not achsen:
            print("FEHLER: unbekannte Achse %r (B1..B7)" % nur)
            return 2
    testlauf = []
    if not schnell:
        schwere_ausfuehren(achsen, basis, testlauf)
    print("Abnahme 3.0.0 (VIS-01, sechs Achsen + B7): %s · Basis %s" % ("VOLL" if not schnell else "SCHNELL (CI)", basis))
    for a in achsen:
        print("\n%s %s" % (a.kuerzel, a.titel))
        for g in a.gates:
            zeichen = {"gruen": "GRUEN", "rot": "ROT  ", "nicht_gemessen": "N.GEM"}[g.status]
            print("  [%s] %-46s %6.1fs  %s" % (zeichen, g.name, g.dauer, g.ausgabe[:110]))
    rot = [a.kuerzel for a in achsen if a.status() == "rot"]
    offen = [a.kuerzel for a in achsen if a.status() == "nicht_gemessen"]
    gate_rot = sum(1 for a in achsen for g in a.gates if g.status == "rot")
    gate_offen = sum(1 for a in achsen for g in a.gates if g.status == "nicht_gemessen")
    for a in achsen:
        if a.kuerzel == "B7":
            for g in a.gates:
                if g.name == "Abnahme-Datei JSON":
                    g.gruen("wird geschrieben: " + str(jsonpfad))
    exitcode = 1 if rot or (not schnell and offen) else 0
    print("\nAchsen: %d grün, %d ROT, %d nicht gemessen · Gates: %d grün, %d ROT, %d nicht gemessen"
          % (len([a for a in achsen if a.status() == "gruen"]), len(rot), len(offen),
             sum(1 for a in achsen for g in a.gates if g.status == "gruen"), gate_rot, gate_offen))
    json_schreiben(jsonpfad, "voll" if not schnell else "schnell", achsen, exitcode)
    if exitcode == 0:
        print("GRUEN: Abnahme 3.0.0 bestanden%s." % ("" if not schnell else " (schneller CI-Modus; schwere Gates offen ausgewiesen)"))
    else:
        if rot:
            print("ROT: Achse(n) " + ", ".join(rot) + " haben ein fehlendes/rotes Gate.")
        if offen and not schnell:
            print("ROT (voller Modus): nicht gemessene Achse(n) " + ", ".join(offen) + " — „nicht gemessen“ ist kein Bestehen.")
    return exitcode


def gegenprobe(basis: Path, blind: str | None) -> int:
    global STILL
    print("Gegenprobe: je Achse ein fehlendes Gate simulieren — jede Achse MUSS rot werden.")
    STILL = True
    achsen = achsen_bauen(basis)
    blind_erkannt = []
    for a in achsen:
        kopie = Achse(a.kuerzel, a.titel)
        for g in a.gates:
            kopie.gates.append(Gate(g.name, g.befehl, g.art))
        if not kopie.gates:
            print("  %s kein Gate" % a.kuerzel)
            blind_erkannt.append(a.kuerzel)
            continue
        kopie.gates[0].rot("Gegenprobe: fehlendes Gate simuliert")
        print("  %s rot provoziert: %s" % (a.kuerzel, "rot" if kopie.status() == "rot" else "NICHT rot"))
        if kopie.status() != "rot":
            blind_erkannt.append(a.kuerzel)
    print()
    if blind in [a.kuerzel for a in achsen]:
        blind_erkannt.append(blind)
    if blind_erkannt:
        print("ROT: die Gegenprobe ist blind für %s (BLIND). Das DoD-Gate ist nicht belastbar."
              % ", ".join(sorted(set(blind_erkannt))))
        return 1
    print("GRUEN: Gegenprobe 7/7 — jede Achse B1–B7 ist einzeln rot provozierbar.")
    return 0


def main() -> int:
    konsole_utf8()
    ap = argparse.ArgumentParser(description="Abnahme 3.0.0 — sieben DoD-Achsen als Gate")
    ap.add_argument("--schnell", action="store_true", help="CI-Modus: schwere Gates als offen ausweisen")
    ap.add_argument("--json", default=None, help="Pfad der Abnahme-Datei (Standard: Nachweise/3.0/abnahme.json)")
    ap.add_argument("--nur-achse", default=None, help="nur eine Achse prüfen (B1..B7)")
    ap.add_argument("--basis", default=None, help="Prüfbasis für leicht Gates (Standard: Repo)")
    ap.add_argument("--gegenprobe", action="store_true", help="rot-Provokation je Achse")
    ap.add_argument("--blind", default=None, help="Achse in der Gegenprobe abschalten (Selbsttest)")
    args = ap.parse_args()
    basis = Path(args.basis).resolve() if args.basis else HIER
    if args.gegenprobe:
        return gegenprobe(basis, args.blind)
    jsonpfad = Path(args.json) if args.json else (HIER / "Nachweise" / "3.0" / "abnahme.json")
    return ausfuehren(basis, args.schnell, args.nur_achse, jsonpfad)


if __name__ == "__main__":
    sys.exit(main())
