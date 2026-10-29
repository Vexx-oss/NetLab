#!/usr/bin/env python3
'''Die eine Zahlenquelle des Netzwerk-Labors: erzeugt docs/STAND.md und den Stand-Block in README.md.

WARUM: Bis zum 26.10.2026 nannte dasselbe Repositorium fuenf verschiedene Testzahlen (251/434/707/768/213),
drei Modulzahlen, zwei Groessen der Einzeldatei und die falsche Aussage, die Doku werde nicht
veroeffentlicht. Jede Zahl war einmal richtig und wurde dann von Hand weitergetragen. Dieses Werkzeug
dreht das um: Die Zahlen werden bei JEDEM Lauf gemessen, und die Dokumente nennen sie nur noch ueber
diese gemessene Quelle. Handarbeit im Stand-Block wird ueberschrieben.

VERTRAG: docs/Architektur.md Abschnitt 16.1 (Pflichtfelder, Blockmarker, Pruefmodus).

BEFEHLE
  python tools/stand.py                  erzeugt docs/STAND.md und den Block in README.md
  python tools/stand.py --pruefen        vergleicht beides mit der Messung; Exit 1 bei Abweichung
  python tools/stand.py --pruefen --ohne-tests
                                         wie --pruefen, aber OHNE Testlauf: die Testzahlen werden aus
                                         docs/STAND.md uebernommen und bleiben UNGEPRUEFT (nur fuer
                                         die Arbeit am Text; nicht fuer die Abnahme)
  python tools/stand.py --zahlen         gibt die Messung als JSON aus (Diagnose, schreibt nichts)

METHODE (jede Zahl hat eine Messung, keine ist getippt)
  * Fassung: Regex auf bauen.py (VERSION = ...).
  * Baukennung: Regex auf docs/index.html (LABOR_BAU) samt Kreuzprobe LABOR_VERSION.
  * Tests: echter Lauf "node tests/run.js" (dasselbe, was sh tools/test.sh aufruft). Gelesen werden
    die Bilanzzeile "N/M gruen (T Testdateien, M Module)" und die Zeile darunter "davon N
    uebersprungen" (tests/harness.js zaehlt Tests mit 0 Zusicherungen als uebersprungen), dazu der
    Exit-Code. Node wird gesucht wie in tools/test.sh: $NODE, dann portables Node unter
    %LOCALAPPDATA%, dann PATH.
  * Bau-Module: "python bauen.py --liste" (JSON) und gezaehlt; headless ist das Flag der Liste.
  * src/ Dateien und Zeilen: alle src/**/*.js; Zeilen = Summe von str.splitlines() je Datei, also
    Zeilenzahl inklusive Leerzeilen (ein CRLF zaehlt als ein Umbruch).
  * Einzeldatei: Bytes aus dem Dateisystem, SHA256 ueber die Bytes (hashlib), beide Dateien
    (Netzwerk-Labor.html und docs/index.html) samt Byte-Gleichheit ueber den Hash.
  * Inhalte: die headless Module werden in einem vm-Kontext geladen (genau die Schichten und die
    Ladereihenfolge von tests/run.js) und die Daten danach gezaehlt: DATEN.tickets, DATEN.mini,
    Object.keys(Spiel.INJEKTOREN), DATEN.trainings, Object.keys(DATEN.wiki), DATEN.skills,
    Object.keys(DATEN.kunden), Spiel.KARRIERE_STUFEN, Tickets mit art === "projekt",
    Object.keys(Spiel.vorlagen). Gezaehlt wird also der geladene Datenbestand, nicht ein Suchmuster
    im Quelltext.
  * Doku: HTML-Dateien in docs/doku (inklusive Uebersicht); Quellen = was tools/seite.py
    veroeffentlicht (README.md + AGENTS.md + docs/**/*.md).
  * Klassenraum-Codec: Anzahl der eingefrorenen Auftrags-IDs aus dem Literal TABELLE_AUFTRAEGE
    in src/spiel/klassenraum.js (Architektur § 17.9); Trainings-Fertigkeiten aus DATEN.trainings.
  * Bekannte, begruendete Ausnahmen: statische, im Vertrag begruendete Liste (Architektur § 17.1:
    kein Training fuer lab.ipv6/lab.wlan; § 17.9: 58 von 76 Handtickets per Code; WLAN-Quellen).
    Der Pruefmodus prueft, dass ihre Bedingungen noch gelten, und macht sie sonst rot.
  * Tote relative Verweise: dieselbe Pruefung wie tools/repo-verweise-flicken.py (alle ](...)-Ziele
    ausser http(s)/mailto/#/C:/dsh:, URL-dekodiert gegen den Dateibaum), ueber alle versionierten und
    unversionierten *.md. Die Zaehlung ergibt 0 oder das Werkzeug nennt die Fundstellen.

REIHENFOLGE nach einer Doku-Aenderung: python tools/stand.py, dann python tools/seite.py, dann
python tools/stand.py (die neue Seite zaehlt mit), dann python tools/seite.py. Grund: STAND.md ist
selbst eine Doku-Seite und aendert damit die Zahl der Doku-Seiten; nach zwei Runden sind beide stabil.

BEWUSST OHNE DATUM UND UHR: Ein Zeitstempel waere bei jedem Lauf anders, dann koennte der Pruefmodus
nie gruen werden. Wann gemessen wurde, steht im Git-Log dieser Datei; WAS gemessen wurde, steht hier.
'''
from __future__ import annotations

import hashlib
import html as html_mod
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

HIER = Path(__file__).resolve().parents[1]
STAND = HIER / "docs" / "STAND.md"
README = HIER / "README.md"
ANFANG = "<!-- STAND:ANFANG -->"
ENDE = "<!-- STAND:ENDE -->"
NL = chr(10)
BT = chr(96)

# Zahlen, die in README.md nicht mehr stehen duerfen: sie waren einmal richtig (Fassung 1.2.3)
# oder sind widerlegt (die Doku wird sehr wohl veroeffentlicht; seite.yml stellt nicht nur
# index.html und bilder zusammen; seite-pruefen.py vergleicht die beiden Einzeldateien nicht).
# Der Pruefmodus haelt sie draussen, damit sie sich beim naechsten Textumbau nicht wieder
# einschleichen. Historische Abschnitte in docs/CHANGELOG.md bleiben ausdruecklich unangetastet.
WIDERLEGT = [
    ("251/251", "Testzahl der Fassung 1.2.3"),
    ("2.269.597", "Groesse der Einzeldatei aus 1.2.3"),
    ("107 Module", "Modulzahl aus 1.2.3"),
    ("20.706", "Zeilenzahl aus 1.2.3"),
    ("35 Testdateien", "Testdateizahl aus 1.2.3"),
    ("seite.yml stellt genau", "seite.yml liefert auch docs/doku (seit 07.10.2026)"),
    ("werden **nicht** veroeffentlicht", "die Doku wird seit 07.10.2026 als HTML unter /doku/ ausgeliefert"),
    ("prueft die Gleichheit", "seite-pruefen.py vergleicht nicht die beiden Einzeldateien; das tut stand.py"),
]
README_PFLICHT = [
    ("https://vexx-oss.github.io/NetLab/doku/", "die veroeffentlichte Doku-Seite muss im README stehen"),
    (ANFANG, "der gemessene Stand-Block muss im README stehen"),
]

SUMME = re.compile(r"^ *([0-9]+)/([0-9]+) grün(?:, ([0-9]+) ROT)? *[(]([0-9]+) Testdateien, ([0-9]+) Module[)] *$", re.M)
UEBERSPRUNGEN = re.compile(r"^ *davon ([0-9]+) übersprungen", re.M)
FASSUNG = re.compile(r'^VERSION *= *"([^"]+)"', re.M)
ANDROID_CODE = re.compile(r"^VERSION_CODE *= *([0-9]+)", re.M)
BAU_VERSION = re.compile(r'LABOR_VERSION *= *"([^"]*)"')
BAU_KENNUNG = re.compile(r'LABOR_BAU *= *"([^"]*)"')
# Relative Verweisziele: dieselbe Klammerform wie tools/repo-verweise-flicken.py.
VERWEIS = re.compile(r"[]][(](<[^>]*>|[^) ]+)[)]")
KODEX_TABELLE = re.compile(r"const TABELLE_AUFTRAEGE\s*=\s*\[(.*?)\]", re.S)

# Bekannte, begruendete Ausnahmen (statisch gepflegt; Quelle ist der VERTRAG, keine Messung).
# Sie stehen bewusst als Text im Stand, weil sie nicht verschwinden: der Pruefmodus prueft,
# dass ihre tragenden Bedingungen noch gelten (kein Training fuer lab.ipv6/lab.wlan,
# eingefrorene Codec-Tabelle, Wi-Fi-Alliance-Beleg vorhanden).
AUSNAHMEN = [
    ("Trainings", "lab.ipv6, lab.wlan",
     "Kein Training fuer diese beiden Fertigkeiten: die Simulation fuehrt WLAN und IPv6 nicht "
     "paketweise aus (Architektur § 17.1, Abschnitt „Uebungsformen ohne Simulation“; der 2.1-Plan "
     "D4 erlaubt namentliche Ausnahmen). Geuebt wird inhaltlich ueber Handticket mit Arbeitsziel, "
     "Minis, Wiki, Lehrtext und Hilfe — nicht ueber ein Training."),
    ("Klassenraum-Codec", "58 von 76 Handtickets",
     "Der Auftrags-Codec hat 6 Bit (0..63). TABELLE_AUFTRAEGE bleibt deshalb bei 58 eingefrorenen "
     "IDs; die neuen 2.1-Handtickets sind nicht klassenraum-adressierbar (Architektur § 17.9). "
     "Alte Codes bleiben gueltig, weil die Tabelle ein Literal ist; der Formatwechsel kommt erst 3.1."),
    ("Quellen", "WLAN-Inhalte",
     "Die Belege der Wiki-Seite lab.wlan nennen IEEE 802.11/802.11i/802.11w und die "
     "WPA3-Spezifikation der Wi-Fi Alliance. Das sind inhaltliche Quellen; eine Paket-Simulation "
     "oder eine Geraetezertifizierung ist damit nicht behauptet."),
]

# Das Messprogramm fuer die Inhalte. Es bildet die headless-Schichten und die Ladereihenfolge von
# tests/run.js nach (bewusst dieselbe Quelle: kern, lernmotor, modell, sim, cli, daten, spiel) und
# zaehlt danach den geladenen Datenbestand. Kein Suchmuster im Quelltext.
INHALT_JS = '''"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const NLJ = String.fromCharCode(10);
const W = process.cwd(), SRC = path.join(W, "src");
const SCHICHTEN = [
  ["kern", ["basis.js", "netz.js"], []], ["@lernmotor", [], []], ["modell", ["geraete.js"], []],
  ["sim", ["engine.js"], []], ["cli", ["parser.js"], []], ["daten", ["basis.js"], []], ["spiel", ["zustand.js"], []],
];
const QUELLE = path.resolve(W, "..", "FISI-Spielhalle", "src", "lernmotor.js");
const KOPIE = path.join(W, "fremd", "lernmotor.js");
const LM = fs.existsSync(QUELLE) ? QUELLE : KOPIE;
const dateien = [];
for (const [ordner, kopf, schluss] of SCHICHTEN) {
  if (ordner === "@lernmotor") { dateien.push(LM); continue; }
  const d = path.join(SRC, ordner);
  if (!fs.existsSync(d)) continue;
  const alle = fs.readdirSync(d).filter(n => n.endsWith(".js")).sort();
  const reihe = [...kopf.filter(n => alle.includes(n)), ...alle.filter(n => !kopf.includes(n) && !schluss.includes(n)), ...schluss.filter(n => alle.includes(n))];
  for (const n of reihe) dateien.push(path.join(d, n));
}
const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
const teile = ['"use strict"; const LABOR_VERSION = "stand";'];
for (const f of dateien) teile.push("/* " + f + " */" + NLJ + fs.readFileSync(f, "utf8"));
// Die Messung gehoert ins SELBE Skript: top-level const-Deklarationen aus src/ (const DATEN, ...)
// sind in einem zweiten vm-Lauf nicht sichtbar. Deshalb endet das Skript mit dem Objekt-Ausdruck,
// und vm.runInContext liefert ihn als Ergebnis zurueck.
teile.push([
  'const ST_D = (typeof DATEN !== "undefined" && DATEN && typeof DATEN === "object") ? DATEN : {};',
  'const ST_S = (typeof Spiel !== "undefined" && Spiel && typeof Spiel === "object") ? Spiel : {};',
  'const ST_TICKETS = Array.isArray(ST_D.tickets) ? ST_D.tickets : [];',
  'function ST_ANZAHL(x) { if (Array.isArray(x)) return x.length; if (x && typeof x === "object") return Object.keys(x).length; return null; }',
  '({ tickets: ST_ANZAHL(ST_D.tickets), minis: ST_ANZAHL(ST_D.mini), injektoren: ST_ANZAHL(ST_S.INJEKTOREN), trainings: ST_ANZAHL(ST_D.trainings), wikiSeiten: ST_ANZAHL(ST_D.wiki), fertigkeiten: ST_ANZAHL(ST_D.skills), kunden: ST_ANZAHL(ST_D.kunden), karrierestufen: ST_ANZAHL(ST_S.KARRIERE_STUFEN), projekte: ST_TICKETS.filter(t => t && t.art === "projekt").length, netzvorlagen: ST_ANZAHL(ST_S.vorlagen), abzeichen: ST_ANZAHL(ST_S.ABZEICHEN), fehlertexte: ST_ANZAHL(ST_D.fehlertexte), trainingsSkills: (Array.isArray(ST_D.trainings) ? ST_D.trainings : []).map(t => t && t.skill).filter(Boolean) })'
].join(NLJ + ";" + NLJ));
const ergebnis = vm.runInContext(teile.join(NLJ + ";" + NLJ), ctx, {filename: "stand-messung.js"});
process.stdout.write(JSON.stringify(ergebnis));
'''


# ------------------------------------------------------------------ kleine Helfer

def de(n: int) -> str:
    '''Ganze Zahl mit Punkt als Tausendertrenner (deutsche Schreibweise, deterministisch).'''
    return f"{n:,}".replace(",", ".")


def code(text: str) -> str:
    '''Ein Markdown-Code-Span; der Umschlag wird als Zeichenkonstante gebaut.'''
    return BT + text + BT


def verweis(text: str, ziel: str) -> str:
    '''Ein Markdown-Verweis mit Code-Umschlag im Linktext.'''
    return "[" + code(text) + "](" + ziel + ")"


def hcode(text: str) -> str:
    '''Ein Code-Span in HTML (fuer den Stand-Block in README.md).'''
    return "<code>" + html_mod.escape(text, quote=False) + "</code>"


def kurz_sha(sha: str) -> str:
    return f"{sha[:8].upper()}…{sha[-7:].upper()}"


def git(*args: str) -> str:
    # core.quotepath=false: sonst gibt git Pfade mit Umlauten als "docs/entwicklung/\303\234..." aus,
    # und genau diese Dateien fielen aus jeder Zaehlung heraus (42 statt 78 *.md im ersten Lauf).
    r = subprocess.run(["git", "-c", "core.quotepath=false"] + list(args), cwd=str(HIER),
                       capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise SystemExit(f"FEHLER: git {' '.join(args)} gescheitert: {r.stderr.strip()}")
    return r.stdout


def node_finden() -> str:
    '''Node wie in tools/test.sh: $NODE, dann portables Node, dann PATH.'''
    kandidaten = []
    if os.environ.get("NODE"):
        kandidaten.append(os.environ["NODE"])
    lokal = os.environ.get("LOCALAPPDATA")
    if lokal:
        kandidaten.append(str(Path(lokal) / "node-portable" / "node-v24.21.0-win-x64" / "node.exe"))
    for k in kandidaten:
        if Path(k).is_file():
            return k
    gefunden = shutil.which("node")
    if gefunden:
        return gefunden
    raise SystemExit("FEHLER: kein Node gefunden. Node 24 installieren oder NODE=/pfad/zu/node setzen.")


def lies(p: Path) -> str:
    return p.read_text(encoding="utf-8")


# ------------------------------------------------------------------ Messungen

def messe_testlauf(node: str) -> dict:
    print("  messe: Testlauf (node tests/run.js) …", file=sys.stderr, flush=True)
    r = subprocess.run([node, "tests/run.js"], cwd=str(HIER), capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=1800)
    aus = (r.stdout or "") + NL + (r.stderr or "")
    m = SUMME.search(aus)
    if not m:
        raise SystemExit("FEHLER: die Bilanzzeile N/M gruen (T Testdateien, M Module) fehlt im Testlauf "
                         f"(Exit {r.returncode}). Letzte Ausgabe:" + NL + aus[-2000:])
    u = UEBERSPRUNGEN.search(aus)
    if not u:
        raise SystemExit("FEHLER: die Zeile davon N uebersprungen fehlt im Testlauf. Sie kommt aus "
                         "tests/harness.js; ohne sie ist die Zahl der uebersprungenen Tests nicht gemessen.")
    return {
        "gruen": int(m.group(1)), "gesamt": int(m.group(2)), "rot": int(m.group(3) or 0),
        "testdateien": int(m.group(4)), "headless": int(m.group(5)),
        "uebersprungen": int(u.group(1)), "exit": r.returncode,
    }


def messe_bau_module() -> dict:
    r = subprocess.run([sys.executable, "bauen.py", "--liste"], cwd=str(HIER), capture_output=True,
                       text=True, encoding="utf-8", errors="replace", timeout=300)
    if r.returncode != 0:
        raise SystemExit("FEHLER: python bauen.py --liste gescheitert:" + NL + (r.stderr or "")[-2000:])
    liste = json.loads(r.stdout)
    headless = sum(1 for e in liste if e.get("headless"))
    return {"gesamt": len(liste), "headless": headless}


def messe_src() -> dict:
    dateien = sorted(p for p in (HIER / "src").rglob("*.js") if p.is_file())
    zeilen = 0
    for p in dateien:
        zeilen += len(lies(p).splitlines())
    return {"dateien": len(dateien), "zeilen": zeilen}


def messe_einzeldatei() -> dict:
    werte = []
    for rel in ("Netzwerk-Labor.html", "docs/index.html"):
        p = HIER / rel
        if not p.is_file():
            werte.append({"pfad": rel, "bytes": None, "sha256": None, "fassung": None, "bau": None})
            continue
        roh = p.read_bytes()
        text = roh.decode("utf-8", errors="replace")
        mv = BAU_VERSION.search(text)
        mk = BAU_KENNUNG.search(text)
        werte.append({"pfad": rel, "bytes": len(roh), "sha256": hashlib.sha256(roh).hexdigest(),
                      "fassung": mv.group(1) if mv else None, "bau": mk.group(1) if mk else None})
    gleich = (werte[0]["sha256"] is not None and werte[0]["sha256"] == werte[1]["sha256"])
    return {"dateien": werte, "gleich": gleich}


def messe_inhalte(node: str) -> dict:
    print("  messe: Inhalte (headless Module laden, Daten zaehlen) …", file=sys.stderr, flush=True)
    r = subprocess.run([node, "-e", INHALT_JS], cwd=str(HIER), capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=600)
    if r.returncode != 0 or not (r.stdout or "").strip():
        raise SystemExit("FEHLER: die Inhaltsmessung ist gescheitert (Exit " + str(r.returncode) + "):"
                         + NL + (r.stderr or "")[-2000:])
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError as e:
        raise SystemExit(f"FEHLER: die Inhaltsmessung lieferte kein JSON ({e}): {r.stdout[:500]}")


def messe_doku() -> dict:
    html = sorted(p for p in (HIER / "docs" / "doku").rglob("*.html") if p.is_file())
    quellen = [HIER / "README.md", HIER / "AGENTS.md"]
    quellen += sorted(p for p in (HIER / "docs").rglob("*.md") if p.is_file())
    return {"seiten": len(html), "quellen": len({p for p in quellen if p.is_file()})}


def dateien_md() -> list[Path]:
    '''Alle *.md im Arbeitsbaum: versioniert UND unversioniert (docs/STAND.md ist vor dem Commit neu).'''
    pfade = git("ls-files", "*.md").splitlines()
    pfade += git("ls-files", "--others", "--exclude-standard", "*.md").splitlines()
    gesehen, aus = set(), []
    for p in pfade:
        # docs/STAND.md ist das Erzeugnis DIESES Werkzeugs. Es mitzuzaehlen machte die Messung
        # von sich selbst abhaengig (vor dem Schreiben existiert die Datei noch nicht).
        if p.strip() and p != "docs/STAND.md" and p not in gesehen and (HIER / p).is_file():
            gesehen.add(p)
            aus.append(p)
    return [HIER / p for p in sorted(aus)]


def messe_verweise() -> dict:
    '''Dieselbe Pruefung wie tools/repo-verweise-flicken.py: relative Ziele gegen den Dateibaum.'''
    geprueft, tot = 0, []
    for datei in dateien_md():
        rel = datei.relative_to(HIER)
        text = lies(datei)
        for m in VERWEIS.finditer(text):
            roh = m.group(1)
            ziel = unquote(roh.strip("<>").split("#")[0])
            if not ziel or ziel.startswith(("http://", "https://", "#", "mailto:", "C:", "dsh:")):
                continue
            geprueft += 1
            zielpfad = (HIER / rel.parent / ziel)
            # Verweise auf docs/STAND.md sind keine toten Verweise: die Datei entsteht in genau
            # diesem Lauf (vor dem Schreiben existiert sie nicht). Die Ausnahme steht hier offen.
            erzeugnis = zielpfad.resolve() == (HIER / "docs" / "STAND.md").resolve()
            if not zielpfad.exists() and not erzeugnis:
                tot.append((rel.as_posix(), text[:m.start()].count(NL) + 1, ziel))
    return {"geprueft": geprueft, "tot": tot, "md": len(dateien_md())}


def messe_codec() -> dict:
    """Auftrags-Tabelle des Klassenraum-Codecs: Anzahl der eingefrorenen IDs.

    Quelle ist der Quelltext (Literal-Array in src/spiel/klassenraum.js). Die Tabelle ist per
    Vertrag eingefroren (Architektur § 17.9), damit alte Codes gueltig bleiben — der Pruefmodus
    haelt Laenge und Ausnahmen zusammen.
    """
    js = lies(HIER / "src" / "spiel" / "klassenraum.js")
    m = KODEX_TABELLE.search(js)
    if not m:
        raise SystemExit("FEHLER: TABELLE_AUFTRAEGE in src/spiel/klassenraum.js nicht gefunden.")
    return {"auftraege": len(re.findall(r'"([^"]+)"', m.group(1)))}


def messe(fassung: str, ohne_tests: bool = False) -> dict:
    print("messe: Fassung, Bau, Quellen …", file=sys.stderr, flush=True)
    bau = messe_bau_module()
    src = messe_src()
    einz = messe_einzeldatei()
    node = node_finden()
    if ohne_tests:
        alt = zahlen_aus_stand()
        tests = alt["tests"]
        inhalte = alt["inhalte"]
        print("  WARNUNG --ohne-tests: die Testzahlen sind NICHT gemessen, sie stammen aus dem "
              "vorigen Lauf. Fuer die Abnahme ist das unzulaessig.", file=sys.stderr, flush=True)
    else:
        tests = messe_testlauf(node)
        inhalte = messe_inhalte(node)
    doku = messe_doku()
    verweise = messe_verweise()
    return {
        "fassung": fassung,
        "android_code": ANDROID_CODE.search(lies(HIER / "android" / "bauen.py")).group(1),
        "bau": bau, "src": src, "einzeldatei": einz, "tests": tests, "inhalte": inhalte,
        "doku": doku, "verweise": verweise, "codec": messe_codec(),
    }


def zahlen_aus_stand() -> dict:
    '''Die Messung des letzten Laufs, die in docs/STAND.md als JSON-Kommentar steht.'''
    if not STAND.is_file():
        raise SystemExit("FEHLER: --ohne-tests braucht eine vorhandene docs/STAND.md (dort stehen die "
                         "Testzahlen des letzten Laufs). Erst python tools/stand.py laufen lassen.")
    text = lies(STAND)
    m = re.search(r"<!-- STAND:ZAHLEN ([{].*?[}]) -->", text, re.S)
    if not m:
        raise SystemExit("FEHLER: in docs/STAND.md fehlt der Kommentar STAND:ZAHLEN mit den Zahlen.")
    return json.loads(m.group(1))


# ------------------------------------------------------------------ Erzeugung der Texte

def testwert(t: dict) -> str:
    wert = f"{de(t['gruen'])}/{de(t['gesamt'])} grün"
    if t["rot"]:
        wert += f", {de(t['rot'])} rot"
    return wert


def stand_text(z: dict) -> str:
    t, i, e = z["tests"], z["inhalte"], z["einzeldatei"]
    zaun = BT * 3
    teile = []
    teile.append("# Stand — gemessen, nicht getippt")
    teile.append("")
    teile.append("Die einzige Zahlenquelle des Projekts — bei jedem Lauf neu gemessen, nicht getippt.")
    teile.append("")
    teile.append("*Erzeugt von tools/stand.py. Handarbeit wird beim naechsten Lauf ueberschrieben.*")
    teile.append("")
    teile.append("Diese Seite ist die **einzige Zahlenquelle** des Projekts (Vertrag: "
                 + verweis("Architektur.md", "Architektur.md") + " Abschnitt 16.1). "
                 + verweis("README.md", "../README.md") + ", " + verweis("Liesmich.md", "Liesmich.md")
                 + ", " + verweis("AGENTS.md", "../AGENTS.md") + ", " + verweis("Bauen.md", "Bauen.md")
                 + ", " + verweis("SITZUNGSABSCHLUSS.md", "SITZUNGSABSCHLUSS.md") + " und der "
                 + verweis("CHANGELOG", "CHANGELOG.md") + " nennen Zahlen nur noch ueber diese Seite. "
                 "**Historische CHANGELOG-Abschnitte bleiben, wie sie geschrieben wurden** — sie werden "
                 "nicht rueckdatiert und nicht korrigiert.")
    teile.append("")
    teile.append("## Der Stand")
    teile.append("")
    teile.append("| Groesse | Wert | Gemessen mit |")
    teile.append("|---|---|---|")
    teile.append(f"| Fassung (Quelle) | **{z['fassung']}** | {code('bauen.py')}, Zeile "
                 f"{code('VERSION = ...')} (Regex) |")
    teile.append(f"| Android-Bauzaehlung | {code('VERSION_CODE = ' + z['android_code'])} | "
                 f"{code('android/bauen.py')} (Regex) |")
    bauvers = e["dateien"][1]["fassung"]
    teile.append(f"| Baukennung | **{code(e['dateien'][1]['bau'] or 'nicht gemessen')}** "
                 f"(gebaut aus Fassung {code(bauvers or 'nicht gemessen')}) | {code('docs/index.html')}, "
                 f"{code('LABOR_BAU')} (Regex) |")
    teile.append(f"| Tests | **{testwert(t)}** | echter Lauf {code('node tests/run.js')}, Bilanzzeile |")
    teile.append(f"| davon uebersprungen | **{de(t['uebersprungen'])}** | Zeile „davon N uebersprungen“ "
                 f"({code('tests/harness.js')}: Test mit 0 Zusicherungen) |")
    teile.append(f"| Exit-Code des Testlaufs | **{t['exit']}** | Rueckgabewert desselben Laufs |")
    teile.append(f"| Testdateien | {de(t['testdateien'])} | dieselbe Bilanzzeile |")
    teile.append(f"| headless Module (Testlauf) | {de(t['headless'])} | dieselbe Bilanzzeile |")
    teile.append(f"| Bau-Module | {de(z['bau']['gesamt'])} (davon {de(z['bau']['headless'])} headless) | "
                 f"{code('python bauen.py --liste')} (JSON, gezaehlt) |")
    teile.append(f"| src/ | {de(z['src']['dateien'])} JS-Dateien, {de(z['src']['zeilen'])} Zeilen | "
                 f"alle {code('src/**/*.js')}, Zeilen = Summe {code('str.splitlines()')} je Datei "
                 f"(inkl. Leerzeilen, CRLF = ein Umbruch) |")
    for d in e["dateien"]:
        if d["bytes"] is None:
            teile.append(f"| Einzeldatei {code(d['pfad'])} | **fehlt** | Dateisystem |")
            continue
        teile.append(f"| Einzeldatei {code(d['pfad'])} | **{de(d['bytes'])} B** · SHA256 "
                     f"{code(d['sha256'].upper())} | Bytes zaehlen, {code('hashlib.sha256')} ueber die Bytes |")
    teile.append(f"| Einzeldateien byte-gleich | **{'ja' if e['gleich'] else 'NEIN'}** | gleicher SHA256 |")
    for feld, name, quelle in [
        ("tickets", "Tickets", "DATEN.tickets"),
        ("kunden", "Kunden", "Object.keys(DATEN.kunden)"),
        ("karrierestufen", "Karrierestufen", "Spiel.KARRIERE_STUFEN"),
        ("projekte", "Projekte (Tickets mit art = projekt)", "gezaehlt in DATEN.tickets"),
        ("minis", "Mini-Tickets", "DATEN.mini"),
        ("netzvorlagen", "Netzvorlagen", "Object.keys(Spiel.vorlagen)"),
        ("injektoren", "Fehlerinjektoren", "Object.keys(Spiel.INJEKTOREN)"),
        ("trainings", "Trainings", "DATEN.trainings"),
        ("wikiSeiten", "Wiki-Seiten", "Object.keys(DATEN.wiki)"),
        ("fertigkeiten", "Fertigkeiten", "DATEN.skills"),
        ("abzeichen", "Abzeichen", "Spiel.ABZEICHEN"),
        ("fehlertexte", "Fehlertexte", "Object.keys(DATEN.fehlertexte)"),
    ]:
        wert = i.get(feld)
        teile.append(f"| {name} | {de(wert) if isinstance(wert, int) else 'nicht gemessen'} | "
                     f"{code(quelle)} (headless Module geladen wie {code('tests/run.js')}) |")
    teile.append(f"| Doku-Seiten docs/doku | {de(z['doku']['seiten'])} HTML-Dateien (inkl. Uebersicht) | "
                 f"HTML-Dateien zaehlen |")
    teile.append(f"| Doku-Quellen | {de(z['doku']['quellen'])} Markdown-Dokumente | was "
                 f"{code('tools/seite.py')} veroeffentlicht: {code('README.md')} + {code('AGENTS.md')} + "
                 f"{code('docs/**/*.md')} |")
    teile.append(f"| Markdown-Dateien | {de(z['verweise']['md'])} | {code('git ls-files')} auf "
                 f"{code('*.md')} + unversionierte {code('*.md')} |")
    teile.append(f"| Relative Verweise | {de(z['verweise']['geprueft'])} geprueft, "
                 f"**{de(len(z['verweise']['tot']))} tot** | wie {code('tools/repo-verweise-flicken.py')} |")
    teile.append("")
    teile.append("## Bekannte, begruendete Ausnahmen")
    teile.append("")
    teile.append("Abweichungen, die **keine** Messung wegzaubert. Sie stehen im Vertrag, gelten bis zur")
    teile.append("dort genannten Fassung — und der Pruefmodus prueft, dass ihre Bedingungen noch stimmen:")
    teile.append("eine Ausnahme, die nicht mehr gilt, macht ihn rot.")
    teile.append("")
    teile.append("| Bereich | Ausnahme | Begruendung |")
    teile.append("|---|---|---|")
    for bereich, wert, begruendung in AUSNAHMEN:
        teile.append(f"| **{bereich}** | {wert} | {begruendung} |")
    teile.append("")
    skills = z["inhalte"].get("trainingsSkills") or []
    ohne_training = ", ".join(f"{code(s)}: {skills.count(s)}" for s in ("lab.ipv6", "lab.wlan"))
    codec_n = z.get("codec", {}).get("auftraege")
    tickets = z["inhalte"].get("tickets")
    teile.append("**Gegenprobe (gemessen in diesem Lauf):**")
    teile.append("")
    teile.append(f"- Trainings fuer {code('lab.ipv6')} und {code('lab.wlan')}: **{ohne_training}** — die")
    teile.append("  Ausnahme gilt also.")
    if isinstance(codec_n, int) and isinstance(tickets, int):
        teile.append(f"- Klassenraum-Codec: **{codec_n}** eingefrorene Auftrags-IDs (Literal, § 17.9),")
        teile.append(f"  derzeit **{de(tickets)}** Handtickets — **{de(tickets - codec_n)}** davon sind per Code")
        teile.append("  nicht aufrufbar (2.1-Ziel: 76 Handtickets, Formatwechsel erst 3.1).")
    teile.append(f"- WLAN-Quellen: {code('Wi-Fi Alliance')} ist in {code('src/daten/wiki.js')} belegt")
    teile.append("  (WPA3-Spezifikation; inhaltliche Quelle, keine Geraetezertifizierung).")
    teile.append("")
    teile.append("## So wird gemessen")
    teile.append("")
    teile.append(zaun + "bash")
    teile.append("python tools/stand.py --zahlen    # die Messung als JSON, schreibt nichts")
    teile.append("python tools/stand.py            # docs/STAND.md + Stand-Block in README.md schreiben")
    teile.append("python tools/stand.py --pruefen  # Exit 0 oder 1 mit der betroffenen Zeile")
    teile.append(zaun)
    teile.append("")
    teile.append("Ein Lauf misst: Fassung, Android-Bauzaehlung, Baukennung, den **echten Testlauf** "
                 "(kein gespeicherter Wert), die Modulliste des Baus, Dateien und Zeilen unter src/, beide "
                 "Einzeldateien samt SHA256, den geladenen Datenbestand (Tickets, Minis, Injektoren, "
                 "Trainings, Wiki, Fertigkeiten), die Doku-Seiten und alle relativen Verweise. "
                 "**Bewusst ohne Datum und Uhrzeit:** ein Zeitstempel waere bei jedem Lauf anders, dann "
                 "koennte der Pruefmodus nie gruen werden. Wann gemessen wurde, steht im Git-Log dieser "
                 "Datei.")
    teile.append("")
    teile.append("Nach einer Aenderung an den Dokumenten ist die Reihenfolge: "
                 + code("python tools/stand.py") + ", dann " + code("python tools/seite.py") + ", dann noch "
                 "einmal " + code("python tools/stand.py") + " (die neue Seite zaehlt mit), dann "
                 + code("python tools/seite.py") + ".")
    teile.append("")
    teile.append("## Abweichungen und ehrliche Grenzen")
    teile.append("")
    if e["dateien"][0]["bytes"] is not None and e["dateien"][1]["bytes"] is not None and not e["gleich"]:
        teile.append("- **Die beiden Einzeldateien sind NICHT byte-gleich.** Einer der beiden Wege "
                     "liefert einen anderen Bau; tools/einfach.py baut beide aus derselben Quelle.")
    if bauvers and bauvers != z["fassung"]:
        teile.append(f"- **Gebaute Fassung ({bauvers}) und Quellfassung ({z['fassung']}) weichen "
                     f"voneinander ab.** Dann sind Release und Quelle nicht auf demselben Stand.")
    if t["exit"] != 0 or t["rot"]:
        teile.append(f"- **Der Testlauf ist ROT: {de(t['rot'])} Test(s), Exit {t['exit']}.** Die Fassung "
                     f"ist in diesem Zustand nicht auslieferbar; die Zahl steht hier, weil sie gemessen "
                     f"wird und nicht verborgen.")
    if t["uebersprungen"]:
        teile.append(f"- **{de(t['uebersprungen'])} Test(s) ohne eine einzige Zusicherung** gelten als "
                     f"uebersprungen (Definition: tests/harness.js). Nach dem Skip-Gate "
                     f"(Architektur Abschnitt 16.2) ist der Lauf damit rot.")
    if z["verweise"]["tot"]:
        teile.append(f"- **{len(z['verweise']['tot'])} tote relative Verweise:** " +
                     ", ".join(code(f + ":" + str(zeile)) for f, zeile, _ in z["verweise"]["tot"][:10]))
    teile.append("- **Browser, Android und die Windows-Datei werden hier nicht gemessen.** Ob die "
                 "Live-Seite, ein Browser oder die .exe laufen, kann dieses Werkzeug ohne Browser und "
                 "ohne die nicht im Git liegenden Nachweise nicht pruefen; solche Aussagen stehen in den "
                 "Dokumenten ausdruecklich als nicht geprueft.")
    teile.append("- **Der Testlauf misst den Arbeitsbaum im Moment des Laufs.** Aendert ein anderer "
                 "Bearbeiter gleichzeitig src/ oder tests/, beschreibt der Stand genau diesen Moment — "
                 "deshalb wird er nach jeder Aenderung neu erzeugt und in der CI geprueft.")
    teile.append("- **Kein Datum, keine Uhr:** siehe oben; der Pruefmodus vergleicht Text gegen Messung, "
                 "nicht Zeitstempel.")
    teile.append("")
    teile.append("<div hidden>")
    teile.append("<!-- STAND:ZAHLEN " + json.dumps(z, ensure_ascii=False, sort_keys=True) + " -->")
    teile.append("</div>")
    teile.append("")
    return NL.join(teile)


def block_text(z: dict) -> str:
    t, i, e = z["tests"], z["inhalte"], z["einzeldatei"]
    daten = e["dateien"][1]  # docs/index.html ist die ausgelieferte Datei
    groesse = de(daten["bytes"]) if daten["bytes"] is not None else "nicht gemessen"
    sha = kurz_sha(daten["sha256"]) if daten["sha256"] else "nicht gemessen"
    zeilen = [
        ANFANG,
        f"<p><strong>Gemessener Stand</strong> (einzige Zahlenquelle: "
        f"<a href=\"docs/STAND.md\">docs/STAND.md</a>): Fassung <strong>{z['fassung']}</strong> · "
        f"Baukennung {hcode(daten['bau'] or 'nicht gemessen')} · "
        f"Tests <strong>{testwert(t)}</strong> ({de(t['uebersprungen'])} uebersprungen, "
        f"{de(t['testdateien'])} Testdateien, {de(t['headless'])} headless Module) · "
        f"Bau <strong>{de(z['bau']['gesamt'])} Module</strong> · "
        f"src/ <strong>{de(z['src']['dateien'])} Dateien / {de(z['src']['zeilen'])} Zeilen</strong> · "
        f"Einzeldatei <strong>{groesse} B</strong>, SHA256 {hcode(sha)} · "
        f"Inhalte <strong>{de(i.get('tickets') or 0)} Tickets, {de(i.get('minis') or 0)} Minis, "
        f"{de(i.get('injektoren') or 0)} Injektoren, {de(i.get('trainings') or 0)} Trainings, "
        f"{de(i.get('wikiSeiten') or 0)} Wiki-Seiten, {de(i.get('fertigkeiten') or 0)} Fertigkeiten</strong> · "
        f"<strong>{de(z['doku']['seiten'])}</strong> Doku-Seiten · relative Verweise "
        f"<strong>{de(z['verweise']['geprueft'])} geprueft, {de(len(z['verweise']['tot']))} tot</strong>.</p>",
        ENDE,
    ]
    return NL.join(zeilen)


def setze_block(text: str, block: str) -> str:
    a = text.find(ANFANG)
    b = text.find(ENDE)
    if a < 0 or b < 0 or b < a:
        raise SystemExit(f"FEHLER: in README.md fehlen die Marker {ANFANG} bis {ENDE}.")
    return text[:a] + block + text[b + len(ENDE):]


def schreibe(pfad: Path, text: str) -> bool:
    alt = lies(pfad) if pfad.is_file() else None
    if alt == text:
        return False
    pfad.write_text(text, encoding="utf-8", newline=NL)
    return True


# ------------------------------------------------------------------ Befehle

def befehl_schreiben(z: dict) -> int:
    geaendert = []
    if schreibe(STAND, stand_text(z)):
        geaendert.append("docs/STAND.md")
    neu = setze_block(lies(README), block_text(z))
    if schreibe(README, neu):
        geaendert.append("README.md")
    print("Stand geschrieben." if geaendert else "Stand unveraendert.")
    for g in geaendert:
        print("  + " + g)
    return 0


def vergleiche(name: str, soll: str, ist: str) -> list[str]:
    if soll == ist:
        print(f"  OK: {name}")
        return []
    fehler = [f"{name}: Text weicht ab"]
    soll_z, ist_z = soll.splitlines(), ist.splitlines()
    for n in range(max(len(soll_z), len(ist_z))):
        s = soll_z[n] if n < len(soll_z) else "<Zeile fehlt>"
        i = ist_z[n] if n < len(ist_z) else "<Zeile fehlt>"
        if s != i:
            fehler.append(f"{name}: Zeile {n + 1}: soll {s.strip()[:160]}")
            fehler.append(f"{name}: Zeile {n + 1}: ist  {i.strip()[:160]}")
    print(f"  ROT: {name} weicht ab ({len(fehler)} Befund(e))")
    return fehler


def pruefe_ausnahmen(z: dict) -> list[str]:
    """Prueft, dass die begruendeten Ausnahmen noch stimmen (Architektur § 17.1 / § 17.9)."""
    fehler: list[str] = []
    print()
    print("Bekannte, begruendete Ausnahmen:")
    skills = z["inhalte"].get("trainingsSkills") or []
    for skill in ("lab.ipv6", "lab.wlan"):
        n = skills.count(skill)
        if n:
            fehler.append(f"Ausnahme „kein Training fuer {skill}“ gilt nicht mehr: {n} Training(s) gefunden")
        else:
            print(f"  OK    kein Training fuer {skill} (Ausnahme gilt, Architektur § 17.1)")
    if "Wi-Fi Alliance" not in lies(HIER / "src" / "daten" / "wiki.js"):
        fehler.append("Ausnahme „WLAN-Quellen“: „Wi-Fi Alliance“ fehlt in src/daten/wiki.js")
    else:
        print("  OK    WLAN-Quellen: „Wi-Fi Alliance“ in src/daten/wiki.js belegt")
    codec = z.get("codec", {}).get("auftraege")
    tickets = z["inhalte"].get("tickets")
    if codec is None:
        fehler.append("Klassenraum-Codec: TABELLE_AUFTRAEGE nicht gemessen")
    elif codec != 58:
        fehler.append(f"Klassenraum-Codec hat {codec} Auftrags-IDs statt 58 (Architektur § 17.9) — "
                      f"entweder Vertragsbruch oder der Ausnahmetext ist veraltet")
    else:
        print(f"  OK    Klassenraum-Codec: 58 eingefrorene Auftrags-IDs (§ 17.9); "
              f"derzeit {tickets} Handtickets -> {tickets - codec if isinstance(tickets, int) else '?'} "
              f"nicht per Code aufrufbar")
    return fehler


def befehl_pruefen(ohne_tests: bool) -> int:
    fassung = FASSUNG.search(lies(HIER / "bauen.py"))
    if not fassung:
        raise SystemExit("FEHLER: VERSION in bauen.py nicht gefunden.")
    z = messe(fassung.group(1), ohne_tests=ohne_tests)
    fehler = []
    print()
    print("Stand pruefen")
    if not STAND.is_file():
        fehler.append("docs/STAND.md fehlt — python tools/stand.py laufen lassen")
        fehler.append("README.md: nicht geprueft (STAND.md fehlt)")
    else:
        fehler += vergleiche("docs/STAND.md", stand_text(z), lies(STAND))
        readme = lies(README)
        a, b = readme.find(ANFANG), readme.find(ENDE)
        if a < 0 or b < 0 or b < a:
            fehler.append(f"README.md: die Marker {ANFANG} bis {ENDE} fehlen")
        else:
            fehler += vergleiche("README.md (Stand-Block)", block_text(z), readme[a:b + len(ENDE)])
    readme_text = lies(README)
    altlasten = [m for m, _ in WIDERLEGT if m in readme_text]
    for muster in altlasten:
        fehler.append(f"README.md: widerlegte Angabe {muster} steht noch im Text")
    for muster, grund in README_PFLICHT:
        if muster not in readme_text:
            fehler.append(f"README.md: {muster} fehlt ({grund})")
    if not altlasten and all(m in readme_text for m, _ in README_PFLICHT):
        print("  OK: README.md — keine widerlegte Angabe, Doku-Link und Stand-Block vorhanden")
    tot = z["verweise"]["tot"]
    if tot:
        for f, zeile, ziel in tot:
            fehler.append(f"toter relativer Verweis: {f}:{zeile} -> {ziel}")
    else:
        print(f"  OK: {de(z['verweise']['geprueft'])} relative Verweise geprueft, 0 tot")
    fehler += pruefe_ausnahmen(z)
    if ohne_tests:
        print("  WARNUNG: --ohne-tests — die Testzahlen wurden NICHT gemessen; fuer die Abnahme unzulaessig")
    print()
    if fehler:
        print(f"ROT: {len(fehler)} Befund(e)")
        for f in fehler[:60]:
            print("  - " + f)
        return 1
    print("GRUEN: docs/STAND.md und der Stand-Block in README.md stimmen mit der Messung ueberein.")
    return 0


def main() -> int:
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8")
        except Exception:  # noqa: BLE001
            pass
    fassung = FASSUNG.search(lies(HIER / "bauen.py"))
    if not fassung:
        raise SystemExit("FEHLER: VERSION in bauen.py nicht gefunden.")
    if "--zahlen" in sys.argv:
        print(json.dumps(messe(fassung.group(1), ohne_tests="--ohne-tests" in sys.argv),
                         ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    if "--pruefen" in sys.argv:
        return befehl_pruefen("--ohne-tests" in sys.argv)
    return befehl_schreiben(messe(fassung.group(1)))


if __name__ == "__main__":
    sys.exit(main())
