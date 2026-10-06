"""Netzwerk-Labor bauen: Module aus src/ -> web/index.html (für das Desktop-Programm).

Reihenfolge der Skripte: Schicht für Schicht (SCHICHTEN). Innerhalb einer Schicht zuerst die
genannten Kopfdateien, dann alle übrigen *.js alphabetisch, zuletzt die genannten Schlussdateien.
Eine neue Datei in einem Schichtordner ist damit automatisch dabei. Regel dafür: Auf oberster Ebene
hängen Dateien nur Funktionen an ihren Namensraum (Sim, CLI, …) und rufen keine anderen Dateien auf.

Der Lernmotor kommt aus fremd/lernmotor.js — einer Kopie aus ../FISI-Spielhalle/src/lernmotor.js,
weil sich beide Projekte EINEN Lernmotor teilen. Die Kopie macht dieses Repositorium allein
baubar (GitHub!). Liegt die Spielhalle daneben, hat sie Vorrang, damit eine Weiterentwicklung
dort sofort im Bau landet; `python tools/lernmotor.py` meldet, ob beide gleich sind.
Schriften liegen lokal in schriften/ (SIL OFL), keine externen Anfragen.

Aufruf:  python bauen.py            -> web/index.html + web/schriften.css + web/schriften/
         python bauen.py --liste    -> gibt die Modulreihenfolge als JSON aus (für Werkzeuge)
         python bauen.py --paket    -> zusätzlich Browser-ZIP (Nebenprodukt) in Dokumente/Lernpakete/
"""
import datetime
import hashlib
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

HIER = Path(__file__).resolve().parent
SRC = HIER / "src"
WEB = HIER / "web"
# Kopie im Repositorium (immer da, auch auf GitHub) …
LERNMOTOR_KOPIE = HIER / "fremd" / "lernmotor.js"
# … und die Quelle daneben, falls die Spielhalle mit ausgecheckt ist (hat Vorrang).
LERNMOTOR_QUELLE = HIER.parent / "FISI-Spielhalle" / "src" / "lernmotor.js"
VERSION = "1.2.0"

# (Ordner, Kopfdateien, Schlussdateien, headless)
SCHICHTEN = [
    ("kern", ["basis.js", "netz.js"], [], True),
    ("@lernmotor", [], [], True),
    ("modell", ["geraete.js"], [], True),
    ("sim", ["engine.js"], [], True),
    ("cli", ["parser.js"], [], True),
    ("daten", ["basis.js"], [], True),
    ("spiel", ["zustand.js"], [], True),
    ("plattform", ["plattform.js"], [], False),
    ("ui", ["dom.js"], ["app.js", "start.js"], False),
]


def module():
    """Liste (relativer Pfad, headless) in Ladereihenfolge."""
    liste = []
    for ordner, kopf, schluss, headless in SCHICHTEN:
        if ordner == "@lernmotor":
            liste.append(("@lernmotor", headless))
            continue
        d = SRC / ordner
        if not d.exists():
            continue
        alle = sorted(p.name for p in d.glob("*.js"))
        reihe = [n for n in kopf if n in alle] + [n for n in alle if n not in kopf and n not in schluss] + [n for n in schluss if n in alle]
        liste += [(f"{ordner}/{n}", headless) for n in reihe]
    return liste


# Der Herkunftskopf in fremd/lernmotor.js (zwischen den /* ===-Zeilen) gehoert nicht in den
# Bau: die Quelle daneben hat ihn nicht, und der Bau soll aus beiden Wegen byte-gleich sein.
# Der Kopf dient nur Menschen, die die Kopie im Repositorium ansehen.
LERNMOTOR_KOPF = re.compile(r"\A/\*\s*=+.*?=+\s*\*/\s*", re.S)


def lies(pfad: Path) -> str:
    """Datei lesen und Zeilenenden auf LF normalisieren.

    Die Quellen sind gemischt (61 Dateien CRLF, 101 LF, so gewachsen und bewusst nicht
    angefasst). Im Repositorium gilt laut .gitattributes LF. Ohne diese Normalisierung
    erbt die gebaute Seite die CRLF der Quellen: `web/index.html` haette 23.719 CRLF,
    `docs/index.html` 23.838 — und beide wuerden von Git als „staendig geaendert" gefuehrt,
    weil der Filter sie beim naechsten Anfassen auf LF umstellt. Ausserdem waere der Bau
    auf Linux (nur LF) nicht byte-gleich zum Bau auf Windows — und die CI vergleicht.
    """
    return pfad.read_text(encoding="utf-8").replace("\r\n", "\n")


def lernmotor():
    """Welche Lernmotor-Datei wird gebaut? Quelle daneben hat Vorrang, sonst die Kopie.

    Gibt (Pfad, ist_kopie) zurueck. `ist_kopie` entscheidet, ob der Herkunftskopf
    abgeschnitten und geprueft wird — ueber den Pfad zu raten wäre plattformabhaengig
    (Windows trennt mit '\\', Linux mit '/'), das war ein echter Fehler.
    """
    if LERNMOTOR_QUELLE.is_file():
        return LERNMOTOR_QUELLE, False
    if LERNMOTOR_KOPIE.is_file():
        return LERNMOTOR_KOPIE, True
    raise SystemExit(
        "FEHLER: kein Lernmotor gefunden.\n"
        f"  erwartet: {LERNMOTOR_KOPIE}\n"
        "  Die Kopie gehoert ins Repositorium — fehlt sie, ist der Checkout unvollstaendig."
    )


def quelle(rel):
    if rel == "@lernmotor":
        pfad, ist_kopie = lernmotor()
        text = lies(pfad)
        if not ist_kopie:
            return text
        # Die Kopie MUSS ihren Herkunftskopf haben — sonst ist die Herkunft nicht mehr
        # belegbar, und der Bau waere von der Quelle nicht mehr zu unterscheiden.
        if not LERNMOTOR_KOPF.match(text):
            raise SystemExit(
                f"FEHLER: {pfad} hat keinen Herkunftskopf.\n"
                "  Die Kopie im Repositorium traegt Herkunft und Pruefsumme im Kopf; er wird\n"
                "  beim Bau abgeschnitten. Fehlt er, wurde die Datei von Hand beschnitten.\n"
                "  In Ordnung bringen: python tools/lernmotor.py --neu-einlesen"
            )
        return LERNMOTOR_KOPF.sub("", text, count=1)
    return lies(SRC / rel)


def stile():
    d = SRC / "stil"
    alle = sorted(p.name for p in d.glob("*.css"))
    reihe = [n for n in ["basis.css"] if n in alle] + [n for n in alle if n != "basis.css"]
    return "\n".join(f"/* ---- {n} ---- */\n" + lies(d / n) for n in reihe)


def baukennung() -> str:
    """Kurze Kennung der gebauten Fassung, aus dem INHALT der Bausteine.

    Vorher stand hier die Uhrzeit des Bauens. Das war aus zwei Gruenden schlecht:

    1. Die versionierte `docs/index.html` galt nach jedem Bau als geaendert, auch wenn
       sich inhaltlich nichts tat — ein Diff ueber eine Datei, die nur eine Zeit traegt.
    2. Auch ein Stempel aus dem letzten Commit loest es nicht: der Commit, der die Datei
       enthaelt, ist immer neuer als der Stempel darin. Die Datei koennte sich nie
       einholen.

    Jetzt wird ueber die Modulinhalte, die Stile und die Seitenhuelle gehasht. Damit gilt:
    gleicher Inhalt -> gleiche Kennung, auf jeder Plattform und zu jeder Uhrzeit. Zwei
    Staende lassen sich ueber die Kennung vergleichen, ohne die Dateien zu diffen.
    """
    teile = []
    for rel, _ in module():
        if rel == "@lernmotor":
            continue
        teile.append(quelle(rel))
    teile.append(stile())
    teile.append(lies(SRC / "seite.html"))
    return hashlib.sha256("\n".join(teile).encode("utf-8")).hexdigest()[:8]


def seite(schrift_link):
    NL = "\n"
    kopf = f'"use strict";{NL}const LABOR_VERSION = "{VERSION}";{NL}const LABOR_BAU = "{baukennung()}";'
    skripte = kopf + NL + NL.join(f"/* ---- {rel} ---- */{NL}" + quelle(rel).replace("</script", "<\\/script") for rel, _ in module())
    huelle = lies(SRC / "seite.html")
    return huelle.replace("/*STIL*/", stile()).replace("/*SKRIPTE*/", skripte).replace("<!--SCHRIFTEN-->", schrift_link)


def main():
    if "--liste" in sys.argv:
        print(json.dumps([{"datei": r, "headless": h} for r, h in module()], ensure_ascii=False))
        return
    WEB.mkdir(exist_ok=True)
    html = seite('<link rel="stylesheet" href="schriften.css">')
    # newline="\n": auf jeder Plattform dieselben Zeilenenden (LF), wie .gitattributes verlangt.
    (WEB / "index.html").write_text(html, encoding="utf-8", newline="\n")
    shutil.copy2(HIER / "schriften.css", WEB / "schriften.css")
    if (WEB / "schriften").exists():
        shutil.rmtree(WEB / "schriften")
    shutil.copytree(HIER / "schriften", WEB / "schriften")
    testseite()
    print(f"{len(module())} Module, {len(html) // 1024} KB -> web/index.html (Version {VERSION}), web/tests.html")
    if "--paket" in sys.argv:
        paket()


def testseite():
    """web/tests.html: dieselben headless-Tests wie tests/run.js, im Browser/Programm ausführbar."""
    NL = "\n"
    teile = ['"use strict";', 'const LABOR_VERSION = "test";']
    teile += [quelle(rel).replace("</script", "<\\/script") for rel, headless in module() if headless]
    teile.append(lies(HIER / "tests" / "harness.js"))
    teile += [lies(p).replace("</script", "<\\/script") for p in sorted((HIER / "tests").glob("*.test.js"))]
    js = (NL + ";" + NL).join(teile)
    html = f"""<!doctype html><meta charset="utf-8"><title>Netzwerk-Labor – Tests</title>
<style>body{{font:14px/1.5 system-ui;margin:20px;background:#fff;color:#111}} .ok{{color:#15803D}} .bad{{color:#B91C1C;font-weight:700}} pre{{white-space:pre-wrap}}</style>
<h1>Netzwerk-Labor – Tests</h1><p id="summe">läuft …</p><pre id="out"></pre>
<script>{js}
;(function(){{ const e = testsAusfuehren(); let f = 0; const z = e.map(r => {{ if (!r.ok) f++; return r.ok ? '<span class="ok">✓ ' + esc(r.name) + '</span>' : '<span class="bad">✗ ' + esc(r.name) + '\\n    ' + esc(r.fehler) + '</span>'; }});
document.getElementById("out").innerHTML = z.join("\\n"); document.getElementById("summe").textContent = (e.length - f) + "/" + e.length + " grün" + (f ? ", " + f + " ROT" : "");
window.TESTERGEBNIS = {{gesamt: e.length, rot: f, fehler: e.filter(r => !r.ok)}}; }})();
</script>"""
    (WEB / "tests.html").write_text(html, encoding="utf-8", newline="\n")


LIESMICH = """Netzwerk-Labor – Browser-Fassung (Nebenprodukt des Desktop-Programms)
=====================================================================

  1. ZIP entpacken.  2. Doppelklick auf „Netzwerk-Labor – START.html“.
  Kein Internet nötig. Der Ordner „Dateien“ enthält die Schriften.
  Der Spielstand bleibt in diesem Browser. Leiste, Tray und „immer oben“
  gibt es nur im Desktop-Programm (Netzwerk-Labor.exe bzw. Linux-Fassung).

Stand: {datum}, Version {version}.
Schriften: Atkinson Hyperlegible, Bricolage Grotesque, JetBrains Mono – SIL Open Font License 1.1.
"""


def paket():
    datum = datetime.date.today()
    ziel = Path.home() / "Documents" / "Lernpakete" / f"Netzwerk-Labor-Browser_{datum.isoformat()}.zip"
    ziel.parent.mkdir(parents=True, exist_ok=True)
    html = seite('<link rel="stylesheet" href="Dateien/schriften.css">')
    text = LIESMICH.replace("{datum}", datum.strftime("%d.%m.%Y")).replace("{version}", VERSION)
    with zipfile.ZipFile(ziel, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("Netzwerk-Labor – START.html", html)
        z.writestr("LIESMICH.txt", text.replace("\n", "\r\n"))
        z.write(HIER / "schriften.css", "Dateien/schriften.css")
        for f in sorted((HIER / "schriften").iterdir()):
            z.write(f, f"Dateien/schriften/{f.name}")
    print(f"Paket -> {ziel} ({ziel.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
