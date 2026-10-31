"""Minimalismus-Regelwerk für src/stil/*.css — prüfbare Regeln statt Geschmack.

Warum: „minimalistisch" ist als Adjektiv nicht prüfbar. Hier steht es als zwölf Regeln, jede mit
einer Zählung, die nachweist, ob sie eingehalten wird. Rot heißt: eine Zahl ist schlechter als der
festgeschriebene Stand (tests/stil-stand.json). Ohne Stand-Datei ist jeder Verstoß rot.

Aufruf:
  python tools/ethos.py                      alle Regeln messen; ohne Stand ist jeder Verstoß rot
  python tools/ethos.py --stand DATEI        ROT nur bei VERSCHLECHTERUNG gegenüber DATEI (Altlasten erlaubt)
  python tools/ethos.py --neu --stand DATEI  Stand-Datei aus dem Ist-Stand schreiben (friert ein)
  python tools/ethos.py --gegenprobe         baut absichtlich Verstöße ein — der Lauf MUSS rot werden;
                                             Rückgabewert 0 = er wurde rot (Vorbild tools/rauch.py --gegenprobe)
  python tools/ethos.py --dom                zusätzlich Regel 12 im laufenden Programm messen (tools/cdp.py)
  python tools/ethos.py --r12 PFAD           verbindliche R12-Zahl je Ansicht+Breite aus der Rohmessung
                                             (tools/rauch.py --r12) bewerten; schreibt Nachweise/3.0/r12.json;
                                             vergleicht je Ansicht×Breite gegen tests/r12-stand.json (Ratsche)
  python tools/ethos.py --r12 PFAD --festhalten   friert die Letztmessung als tests/r12-stand.json ein
                                             (nur bei vollstaendiger Messung ohne harte Verletzung)
  python tools/ethos.py --lang               alle Fundstellen statt der ersten fünf

Aufgenommen in tools/test.sh hinter tools/klassen.py.

Die Skalen (bewusst klein, das ist der Minimalismus):
  Schrift   {11, 12, 13, 15, 20, 28} px        — sechs Größen, keine halben Pixel
  Abstand   {0, 4, 8, 12, 16, 24, 32} px       — dazu die negativen Gegenstücke
  Radius    var(--radius-s)=6px, var(--radius)=10px, 999px (Pille), 50% (Kreis)
  Schatten  var(--schatten) oder none
  Dauer     var(--dauer)=160ms, 320ms; 1ms nur für „Bewegung aus"
  z-index   {10, 20, 30, 40, 50, 60, 70, 80}   — eine benannte Leiter, keine Zwischenwerte

Ehrlich gemessen, nicht behauptet: die Regeln zählen Literale im Quelltext. Ob zwei Gestalten gleich
AUSSEHEN, sagt das Werkzeug nicht — dafür sind tools/rauch.py (Oberfläche) und die Augen da.
"""
import argparse
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
STIL = HIER / "src" / "stil"
STAND_VORGABE = HIER / "tests" / "stil-stand.json"

# Schrift-Skala nach Architektur § 18.5 (Frontend-Redesign A): 11 / 12,5 / 14 / 16 / 20 / 28 / 34 / 44 px.
# 13 und 15 px sind Altlasten aus v2.1.0 — sie bleiben erlaubt, dürfen aber NICHT neu entstehen;
# die Zahl in tests/stil-stand.json darf nur sinken.
SCHRIFT_SKALA = {11, 12.5, 13, 14, 15, 16, 20, 28, 34, 44}
ABSTAND_SKALA = {0, 4, 8, 12, 16, 24, 32}
# Radien laufen ausschließlich über Tokens (--radius-xs 4 / --radius-s 8 / --radius 12, § 18.6);
# Literale bleiben nur Pille und Kreis. var(--radius…) ist in r2_radius ohnehin erlaubt.
RADIUS_ERLAUBT = {"999px", "50%"}
DAUER_SKALA = {1, 160, 320}                     # Millisekunden
Z_LEITER = {10, 20, 30, 40, 50, 60, 70, 80}
LAENGEN = ("width", "height", "min-width", "max-width", "min-height", "max-height", "top", "right", "bottom",
           "left", "padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin",
           "margin-top", "margin-right", "margin-bottom", "margin-left", "gap", "row-gap", "column-gap",
           "font-size", "border-radius", "letter-spacing", "text-indent", "outline-offset")
ABSTANDS_PROPS = ("padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin",
                  "margin-top", "margin-right", "margin-bottom", "margin-left", "gap", "row-gap", "column-gap")
FARBTRAGEND = ("color", "background", "background-color", "background-image", "border", "border-color", "border-top",
               "border-right", "border-bottom", "border-left", "border-top-color", "border-bottom-color",
               "border-left-color", "border-right-color", "outline", "outline-color", "fill", "stroke", "filter",
               "box-shadow", "text-shadow", "caret-color", "scrollbar-color", "accent-color", "text-decoration-color")
ZEIT_PROPS = ("transition", "transition-duration", "animation", "animation-duration")
AT_MIT_REGELN = re.compile(r"@(media|supports|layer|container|scope)\b")
AT_OHNE_REGELN = re.compile(r"@(media|supports|layer|container|scope|keyframes|-webkit-keyframes)\b")
KEYFRAME_SCHRITT = re.compile(r"^(from|to|\d+%)(\s*,\s*(from|to|\d+%))*$")
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RGB = re.compile(r"\brgba?\([^)]*\)", re.I)
HSL = re.compile(r"\bhsla?\([^)]*\)", re.I)
ZAHL = re.compile(r"(?<![\w.#-])(-?\d*\.?\d+)(?![\w.%\-])")


def ohne_kommentare(text):
    """Kommentare durch Leerzeichen ersetzen, Zeilennummern bleiben erhalten."""
    aus, i, n = [], 0, len(text)
    while i < n:
        if text.startswith("/*", i):
            j = text.find("*/", i + 2)
            j = n if j == -1 else j + 2
            aus.append("".join(ch if ch == "\n" else " " for ch in text[i:j]))
            i = j
        else:
            aus.append(text[i])
            i += 1
    return "".join(aus)


def zerteile(datei, text):
    """Liefert Regelblöcke mit Deklarationen (Eigenschaft, Wert, Zeile) und Kontext (@media/@container)."""
    n = len(text)
    vor = [0] * (n + 1)
    for i, ch in enumerate(text):
        vor[i + 1] = vor[i] + (1 if ch == "\n" else 0)
    bloecke, stapel, start, i = [], [], 0, 0
    while i < n:
        ch = text[i]
        if ch == "{":
            kopf = text[start:i].strip()
            stapel.append((kopf, AT_MIT_REGELN.match(kopf) is not None))
            start = i + 1
        elif ch == "}":
            b0, b1 = start, i
            kopf, ist_at = stapel.pop() if stapel else ("", False)
            if not ist_at:
                ctx = " | ".join(k for k, a in stapel if a)
                dekl = []
                q = b0
                while q < b1:
                    e = text.find(";", q, b1)
                    if e == -1:
                        e = b1
                    stueck = text[q:e]
                    if ":" in stueck:
                        prop, wert = stueck.split(":", 1)
                        prop, wert = prop.strip(), wert.strip()
                        if prop:
                            off = q + (len(stueck) - len(stueck.lstrip()))
                            dekl.append({"prop": prop, "wert": wert, "zeile": vor[off] + 1})
                    q = e + 1
                if dekl:
                    bloecke.append({"datei": datei, "sel": kopf, "ctx": ctx, "dekl": dekl,
                                    "zeile": vor[b0] + 1})
            start = i + 1
        i += 1
    return bloecke


def lies(dateien=None):
    """Alle Stildateien einlesen und zerteilen. dateien: optionale Liste (Dateiname, Text) für die Gegenprobe."""
    bloecke, kenn = [], Counter()
    if dateien is None:
        dateien = [(p.name, p.read_text(encoding="utf-8")) for p in sorted(STIL.glob("*.css"))]
    for name, roh in dateien:
        text = ohne_kommentare(roh)
        b = zerteile(name, text)
        bloecke += b
        kenn["dateien"] += 1
        kenn["zeilen"] += roh.count("\n") + (0 if roh.endswith("\n") else 1)
        kenn["deklarationen"] += sum(len(x["dekl"]) for x in b)
        kenn["bloecke"] += len(b)
    kenn["selektoren"] = len({(x["datei"], x["ctx"], x["sel"]) for x in bloecke})
    return bloecke, kenn


def ort(b, d=None):
    return f"{b['datei']}:{(d or b['dekl'][0])['zeile']}"


def deklarationen(bloecke):
    for b in bloecke:
        for d in b["dekl"]:
            yield b, d


# ---------------------------------------------------------------- die zwölf Regeln

THEME_DATEI = re.compile(r"^zzz-thema-[a-z0-9-]+\.css$")


def ist_theme(name):
    """Theme-Dateien (docs/entwicklung/Themes-Vertrag.md) sind eigene Designsysteme.

    Sie liefern nur Tokens plus bewusst gesetzte, mit ``html[data-theme=...]`` gekapselte
    Regeln. Die Layout-Regeln R4/R6/R8 (Abstände, z-index, Bewegung) und die Dopplungsregeln
    R9/R10 prüfen das gemeinsame Grundgerüst in src/stil, nicht die Theme-Dateien.
    R1/R2/R3/R5/R7/R11 gelten weiterhin für alles außerhalb der :root-Theme-Blöcke.
    """
    return bool(THEME_DATEI.match(name))


def r1_farbe(bloecke):
    """Farbe nur per Token: kein #hex/rgb/hsl außerhalb der Token-Blöcke (:root …)."""
    treffer = []
    for b, d in deklarationen(bloecke):
        if "root" in b["sel"]:
            continue
        if HEX.search(d["wert"]) or RGB.search(d["wert"]) or HSL.search(d["wert"]):
            treffer.append(ort(b, d))
    return treffer


def r2_radius(bloecke):
    """Radius nur aus Tokens: var(--radius-xs/-s/--radius, § 18.6), 999px (Pille), 50% (Kreis)."""
    treffer = []
    for b, d in deklarationen(bloecke):
        if ist_theme(b["datei"]):
            continue
        if "radius" not in d["prop"] or "root" in b["sel"] or d["prop"].startswith("--"):
            continue
        if "var(--" in d["wert"]:
            continue
        reste = [w.strip() for w in d["wert"].split() if w.strip()]
        if reste and all(w in RADIUS_ERLAUBT or w == "0" for w in reste):
            continue
        treffer.append(ort(b, d))
    return treffer


def r3_schrift(bloecke):
    """Schrift nur aus der Skala § 18.5: {11, 12.5, 14, 16, 20, 28, 34, 44}px (+ Altlast 13/15)."""
    treffer = []
    kurz = re.compile(r"^(?:(?:normal|italic|oblique|small-caps|bold|bolder|lighter|[1-9]00)\s+)*([\d.]+)px")
    for b, d in deklarationen(bloecke):
        if "root" in b["sel"] or d["prop"].startswith("--"):
            continue
        if d["prop"] == "font-size":
            m = re.match(r"\s*([\d.]+)(px|em|rem|%)", d["wert"])
            zahl, einheit = (m.group(1), m.group(2)) if m else (None, None)
        elif d["prop"] == "font":
            m = kurz.match(re.sub(r"\s*/\s*", "/", d["wert"].strip()))
            zahl, einheit = (m.group(1), "px") if m else (None, None)
        else:
            continue
        if zahl is None:
            continue
        if einheit != "px" or float(zahl) not in SCHRIFT_SKALA:
            treffer.append(ort(b, d))
    return treffer


def r4_abstand(bloecke):
    """Abstand nur aus der Skala {0,4,8,12,16,24,32}px (negative Gegenstücke erlaubt)."""
    treffer = []
    for b, d in deklarationen(bloecke):
        if ist_theme(b["datei"]):
            continue
        if d["prop"] not in ABSTANDS_PROPS or "root" in b["sel"] or d["prop"].startswith("--"):
            continue
        for m in re.finditer(r"(-?[\d.]+)(px|em|rem)", d["wert"]):
            if m.group(2) != "px" or abs(float(m.group(1))) not in ABSTAND_SKALA:
                treffer.append(f"{ort(b, d)} ({m.group(0)})")
    return treffer


def r5_dauer(bloecke):
    """Dauer nur aus {1ms (Bewegung aus), 160ms, 320ms} — var(--dauer) ist erlaubt."""
    treffer = []
    for b, d in deklarationen(bloecke):
        if d["prop"] not in ZEIT_PROPS or "root" in b["sel"] or d["prop"].startswith("--"):
            continue
        for m in re.finditer(r"([\d.]+)(m?s)\b", d["wert"]):
            ms = round(float(m.group(1)) * (1000 if m.group(2) == "s" else 1))
            if ms not in DAUER_SKALA:
                treffer.append(f"{ort(b, d)} ({m.group(0)})")
    return treffer


def r6_zindex(bloecke):
    """z-index nur aus der benannten Leiter {10,20,…,80} — keine Zwischenwerte."""
    treffer = []
    for b, d in deklarationen(bloecke):
        if d["prop"] != "z-index" or "root" in b["sel"] or ist_theme(b["datei"]):
            continue
        if not d["wert"].lstrip("-").isdigit() or int(d["wert"]) not in Z_LEITER:
            treffer.append(f"{ort(b, d)} (z-index:{d['wert']})")
    return treffer


def r7_important(bloecke):
    """!important nur in basis.css (Reset und Barrierefreiheit)."""
    treffer = []
    for b, d in deklarationen(bloecke):
        if "!important" in d["wert"] and b["datei"] != "basis.css":
            treffer.append(f"{ort(b, d)} ({d['prop']})")
    return treffer


def r8_bewegung(bloecke, texte):
    """Bewegung aus: genau EIN zentraler @media (prefers-reduced-motion)-Block (basis.css:91)."""
    treffer = []
    for name, roh in texte:
        for m in re.finditer(r"@media\s*\(prefers-reduced-motion[^{]*\{", roh):
            zeile = roh.count("\n", 0, m.start()) + 1
            if name != "basis.css" and not ist_theme(name):   # basis.css ist der zentrale Block; Themes dürfen eigene Reduzier-Blöcke haben
                treffer.append(f"{name}:{zeile}")
    return treffer


def r9_selektor_einmal(bloecke):
    """Ein Selektor wird unter gleichen Bedingungen nur einmal definiert (Wiederholung = toter Text)."""
    gesehen = defaultdict(list)
    for b in bloecke:
        if KEYFRAME_SCHRITT.match(b["sel"]) or ist_theme(b["datei"]):
            continue
        gesehen[(b["datei"], b["ctx"], b["sel"])].append(b)
    treffer = []
    for (datei, ctx, sel), bs in gesehen.items():
        for b in bs[1:]:
            treffer.append(f"{datei}:{b['zeile']} ({sel[:40]}{' @' + ctx[:26] if ctx else ''})")
    return treffer


def r10_blockdopplung(bloecke):
    """Keine identischen Regelblöcke: gleicher Inhalt unter gleichen Bedingungen = doppelt."""
    gruppen = defaultdict(list)
    for b in bloecke:
        if KEYFRAME_SCHRITT.match(b["sel"]):
            continue
        # Themes (src/stil/zzz-thema-*.css) sind Tokendateien wie basis.css: derselbe Deklarationssatz
        # darf dort in mehreren Theme-Regeln stehen (Vertrag docs/entwicklung/Themes-Vertrag.md).
        if ist_theme(b["datei"]):
            continue
        inhalt = tuple(sorted((d["prop"], d["wert"]) for d in b["dekl"]))
        gruppen[(b["datei"], b["ctx"], inhalt)].append(b)
    treffer = []
    for (datei, ctx, inhalt), bs in gruppen.items():
        if len(bs) < 2:
            continue
        for b in bs[1:]:
            treffer.append(f"{datei}:{b['zeile']} ({b['sel'][:34]} = {inhalt[0][0]}:{inhalt[0][1][:22]})")
    return treffer


def r11_einheit(bloecke):
    """Jede Zahl in einer Längen-Eigenschaft trägt eine Einheit (0 und Faktoren in calc() ausgenommen)."""
    treffer = []
    for b, d in deklarationen(bloecke):
        if d["prop"] not in LAENGEN or "root" in b["sel"] or d["prop"].startswith("--"):
            continue
        wert = re.sub(r"\b(?:calc|min|max|clamp)\([^()]*(?:\([^()]*\)[^()]*)*\)", " ", d["wert"])
        for m in ZAHL.finditer(wert):
            if float(m.group(1)) != 0:
                treffer.append(f"{ort(b, d)} ({d['prop']}:{d['wert'][:34]})")
                break
    return treffer


# ------------------------------------------------- Regel 12: Bedienelemente JE ANSICHT
#
# BEFUND UND REPARATUR (09.10.2026, Strom G).
# Die alte Fassung maß den GERADE OFFENEN Zustand und machte aus einer fehlgeschlagenen Messung
# eine 0: `aus.stdout or "{}"` lieferte bei leerer Ausgabe ein leeres Objekt, `daten.get("sichtbar", 0)`
# daraus die Zahl 0, und `0 > 6` ist falsch → kein Treffer → „0 sichtbare Elemente — eingehalten".
# Gemessen: `python tools/ethos.py --dom` ohne laufendes Programm meldete genau das. Ein Fehlerpfad,
# der GRÜN ergibt, ist genau die Bauart, vor der AGENTS.md („Wirkung vor Grün") warnt.
# Jetzt gilt: je angemeldeter Ansicht EINE Zahl; was nicht messbar ist, steht als Befund da und
# zählt NICHT als eingehalten.

R12_GRENZE = 6                    # Standard: höchstens 6 sichtbare Bedienelemente je Ansicht
R12_GRENZEN = {"mitarbeit": 3}    # Spez. B § 2.1/§ 2.2: die Azubi-Ansicht „Auftrag" hat 3
R12_WAEHLER = "button,[role=button],input,select,textarea,a[href]"
# Der letzte Messbericht — für die Zeile in `zeige()` und die Zusammenfassung in `main()`.
R12_BERICHT = {"gemessen": False, "grund": None, "zahlen": []}
# VIS-05: Rohmessung je Ansicht UND Breite (tools/rauch.py) und die verbindliche Zahl (eine Quelle
# für tools/stand.py). Beides liegt unter Nachweise/ (nicht versioniert) — fehlt sie, ist R12
# ausdrücklich "nicht gemessen", nie eine 0.
R12_ROHDATEN = HIER / "Nachweise" / "rauch" / "r12.json"
R12_VERBINDLICH = HIER / "Nachweise" / "3.0" / "r12.json"
# r-arch V02: die verbindliche LETZTMESSUNG wird versioniert (neben sim-stand/stil-stand), damit ein
# frischer Klon ohne Nachweise/ reproduzierbar pruefen kann. Nur sie ist die Ratsche; Nachweise/
# bleibt Beleg der Rohmessung.
R12_STAND = HIER / "tests" / "r12-stand.json"


def r12_js():
    """Das Messprogramm für den laufenden DOM — EINE Auswertung, je Ansicht eine Zahl.

    Jede angemeldete Ansicht wird einzeln geöffnet, gezählt und am Ende wird die vorher offene
    Ansicht wiederhergestellt (die Messung stellt das Programm nicht um). Eine Ansicht, die sich
    nicht öffnen lässt, liefert `fehler` statt einer Zahl — sie wird nie zu einer 0."""
    return ("(()=>{"
            "if(typeof UI==='undefined'||!UI.app||typeof UI.app.liste!=='function'"
            "||typeof UI.app.ansicht!=='function')"
            "return {fehler:'UI.app fehlt - Programm nicht erreichbar'};"
            "if(UI.app.modus!=='voll')return {fehler:'Programm laeuft im Modus '"
            "+UI.app.modus+' - keine Ansicht ist aufgebaut'};"
            "const sichtbar=e=>{const r=e.getBoundingClientRect();const st=getComputedStyle(e);"
            "return r.width>0&&r.height>0&&st.visibility!=='hidden'&&st.display!=='none'};"
            "const kasten=k=>[...document.querySelectorAll('.ansicht')]"
            ".find(e=>e.dataset.ansicht===k)||null;"
            "const zaehlen=k=>{document.body.offsetHeight;const b=kasten(k);"
            "return b?[...b.querySelectorAll('" + R12_WAEHLER + "')].filter(sichtbar).length:null};"
            "const vorher=UI.app.aktuell||null;const aus=[];"
            "for(const a of (UI.app.liste()||[])){let fehler=null;"
            "try{UI.app.ansicht(a.name)}catch(e){fehler=String((e&&e.message)||e)}"
            "const offen=UI.app.aktuell===a.name;"
            "aus.push({name:a.name,titel:a.titel,zahl:offen?zaehlen(a.name):null,"
            "fehler:fehler||(offen?null:'Ansicht nicht aufgebaut')})}"
            "if(vorher)try{UI.app.ansicht(vorher)}catch(e){}"
            "return {ansichten:aus,grenze:" + str(R12_GRENZE)
            + ",grenzen:" + json.dumps(R12_GRENZEN) + "}"
            "})()")


def r12_auswerten(ausgabe):
    """Aus der Ausgabe von cdp.py Befunde und Zahlen machen. NICHTS wird stillschweigend zu 0.

    Liefert (befunde, zahlen); `zahlen` ist [(titel, name, zahl|None, soll)] für die Anzeige."""
    roh = (ausgabe or "").strip()
    if not roh:
        return ["nicht gemessen: das Programm hat nichts geantwortet"], []
    try:
        daten = json.loads(roh)
        if isinstance(daten, str):        # zweimal kodiert (Zeichenkette statt Objekt)
            daten = json.loads(daten)
    except Exception as fehler:                                        # noqa: BLE001
        return [f"nicht gemessen: Auswertung nicht lesbar ({fehler}) - Rohausgabe: {roh[:120]}"], []
    if not isinstance(daten, dict):
        return [f"nicht gemessen: unerwartete Auswertung ({roh[:120]})"], []
    if daten.get("fehler"):
        return [f"nicht gemessen: {daten['fehler']}"], []
    ansichten = daten.get("ansichten")
    if not isinstance(ansichten, list) or not ansichten:
        return ["nicht gemessen: das Programm meldet keine einzige Ansicht"], []
    grenze = daten.get("grenze") or R12_GRENZE
    grenzen = daten.get("grenzen") or R12_GRENZEN
    befunde, zahlen = [], []
    for a in ansichten:
        name = a.get("name") or "?"
        titel = a.get("titel") or name
        soll = grenzen.get(name, grenze)
        zahl = a.get("zahl")
        if a.get("fehler") or zahl is None:
            befunde.append(f"nicht gemessen: Ansicht {titel} ({name}) - {a.get('fehler') or 'keine Zahl'}")
            zahlen.append((titel, name, None, soll))
            continue
        zahlen.append((titel, name, zahl, soll))
        if zahl > soll:
            befunde.append(f"{titel} ({name}): {zahl} sichtbare Bedienelemente - erlaubt {soll}")
    if not any(z[2] is not None for z in zahlen):
        befunde.append("nicht gemessen: keine einzige Ansicht war messbar")
    return befunde, zahlen


def r12_auswerten_breiten(daten):
    """Rohmessung (tools/rauch.py --r12) je Ansicht UND Breite auswerten.

    Liefert (befunde, zahlen, verstoesse, gemessen). zahlen ist [(label, name, zahl|None, soll)]
    mit label "Titel (name) @Breite px". Eine fehlende Messung wird BENANNT, nie zu 0."""
    if not isinstance(daten, dict):
        return ["nicht gemessen: Rohmessung unlesbar"], [], [], False
    if not daten.get("gemessen"):
        return ["nicht gemessen: " + str(daten.get("grund") or "Rohmessung meldet nicht gemessen")], [], [], False
    grenze = daten.get("grenze") or R12_GRENZE
    grenzen = daten.get("grenzen") or R12_GRENZEN
    befunde, zahlen, verstoesse, offen = [], [], [], []
    for m in daten.get("messungen") or []:
        breite = m.get("breite")
        for a in m.get("ansichten") or []:
            name = (a or {}).get("name") or "?"
            titel = (a or {}).get("titel") or name
            soll = grenzen.get(name, grenze)
            label = f"{titel} ({name}) @{breite}px"
            zahl = (a or {}).get("zahl")
            if m.get("messbar") is False or isinstance(zahl, bool) or not isinstance(zahl, int):
                grund = (a or {}).get("fehler") or m.get("grund") or "keine Zahl"
                offen.append(f"nicht gemessen: {label} - {grund}")
                zahlen.append((label, name, None, soll, breite))
                continue
            zahlen.append((label, name, zahl, soll, breite))
            if zahl > soll:
                verstoesse.append(f"{label}: {zahl} sichtbare Bedienelemente - erlaubt {soll}")
    gemessen = bool(zahlen) and not offen
    return offen, zahlen, verstoesse, gemessen


def r12_stand_lesen(pfad):
    """Versionierte letzte R12-Messung (tests/r12-stand.json) lesen. None + Grund statt 0."""
    p = Path(pfad)
    if not p.is_file():
        return None, f"keine verbindliche R12-Messung: {p} fehlt (mit --festhalten einfrieren)"
    try:
        daten = json.loads(p.read_text(encoding="utf-8-sig"))
    except Exception as fehler:                                    # noqa: BLE001
        return None, f"R12-Stand unlesbar: {fehler}"
    if not isinstance(daten, dict) or not isinstance(daten.get("ansichten"), dict) or not daten.get("ansichten"):
        return None, "R12-Stand ohne Ansichten"
    return daten, None


def r12_ratsche(zahlen, stand, grund):
    """Ratsche je Ansicht×Breite: aktuell > Baseline = ROT, ≤ Baseline = grün, fehlende Evidenz = nicht gemessen."""
    if stand is None:
        return ["nicht gemessen: " + (grund or "kein R12-Stand")], False
    basis = stand.get("ansichten") or {}
    regress, offen, gesehen = [], [], set()
    for label, name, zahl, soll, breite in zahlen:
        if zahl is None:
            continue
        schluessel = str(breite)
        gesehen.add((name, schluessel))
        wert = (basis.get(name) or {}).get(schluessel)
        if wert is None:
            offen.append(f"nicht gemessen: keine Baseline fuer {label} (tests/r12-stand.json)")
        elif zahl > wert:
            regress.append(f"R12 Ratsche {label}: {zahl} > Baseline {wert}")
    for name, breiten in (basis or {}).items():
        for breite in (breiten or {}):
            if (name, str(breite)) not in gesehen:
                offen.append(f"nicht gemessen: Baseline {name}@{breite}px ohne aktuelle Messung")
    return regress + offen, not offen


def r12_stand_schreiben(ziel, zahlen, verstoesse):
    """Friert die Letztmessung als versionierte tests/r12-stand.json ein (r-arch V02)."""
    ansichten, werte = {}, []
    for label, name, zahl, soll, breite in zahlen:
        if zahl is None:
            continue
        ansichten.setdefault(name, {})[str(breite)] = zahl
        werte.append(zahl)
    daten = {
        "fassung": 1, "quelle": "tools/ethos.py --dom --r12 --festhalten",
        "zeit": datetime.now().astimezone().isoformat(timespec="seconds"),
        "grenzen": {"standard": R12_GRENZE, **dict(R12_GRENZEN)},
        "ansichten": ansichten, "messungen": len(werte),
        "max": max(werte) if werte else None, "verstoesse": sorted(verstoesse),
    }
    z = Path(ziel)
    z.parent.mkdir(parents=True, exist_ok=True)
    z.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"       R12 festgehalten: {z} ({daten['messungen']} Messungen, max {daten['max']}, "
          f"{len(verstoesse)} ueber Grenze eingefroren)")
    return daten


def r12_breiten(rohdatei, ausgabedatei, festhalten=False, standdatei=None):
    """R12 je Ansicht+Breite aus der Rohmessung; Gate = Ratsche gegen die versionierte Letztmessung.

    Rohbefund (Zahlen ueber der Grenze) wird BENANNT, aber eingefrorene Werte gelten als Baseline —
    die Ratsche verbietet nur den Zuwachs. Ohne verbindliche Letztmessung: "nicht gemessen" (kein 0)."""
    roh = Path(rohdatei)
    stand_pfad = Path(standdatei or R12_STAND)
    grund, befund, zahlen, verstoesse, gemessen = None, [], [], [], False
    if not roh.is_file():
        grund = f"Rohmessung fehlt: {roh} — erzeugen mit python tools/rauch.py --r12"
        befund = ["nicht gemessen: " + grund]
    else:
        try:
            daten = json.loads(roh.read_text(encoding="utf-8-sig"))
        except Exception as fehler:                                    # noqa: BLE001
            daten = None
            grund = f"Rohmessung unlesbar: {fehler}"
            befund = ["nicht gemessen: " + grund]
        if isinstance(daten, dict):
            befund, zahlen, verstoesse, gemessen = r12_auswerten_breiten(daten)
            grund = None if gemessen else "; ".join(befund)
    for b in befund:
        print(f"       R12 {b}")
    for label, name, zahl, soll, breite in zahlen:
        stand = "nicht gemessen" if zahl is None else f"{zahl} sichtbar, Grenze {soll}"
        print(f"       R12 {label}: {stand}")
    for v in verstoesse:
        print(f"       R12 UEBER GRENZE (eingefroren erlaubt): {v}")
    werte = [z[2] for z in zahlen if z[2] is not None]
    stand, stand_grund = r12_stand_lesen(stand_pfad)
    regress, ratsche_gemessen = (r12_ratsche(zahlen, stand, stand_grund) if gemessen else ([], False))
    ratsche_rot = [b for b in regress if not b.startswith("nicht gemessen")]
    ratsche_offen = [b for b in regress if b.startswith("nicht gemessen")]
    for b in regress:
        print(f"       R12 {b}")
    if festhalten:
        if not gemessen:
            print("       R12 nicht festgehalten: Messung nicht vollstaendig")
        else:
            r12_stand_schreiben(stand_pfad, zahlen, verstoesse)
    aus = {
        "fassung": 1, "quelle": "tools/ethos.py --dom --r12", "rohdaten": str(roh),
        "stand": str(stand_pfad), "gemessen": gemessen,
        "grund": None if gemessen else (grund or "nicht gemessen"),
        "zeit": datetime.now().astimezone().isoformat(timespec="seconds"),
        "grenze": R12_GRENZE, "grenzen": R12_GRENZEN, "messungen": len(zahlen),
        "max": max(werte) if werte else None,
        "zahlen": [{"label": l, "name": n, "zahl": z, "soll": s, "breite": b} for l, n, z, s, b in zahlen],
        "ueber_grenze": verstoesse, "ratsche_rot": ratsche_rot, "ratsche_offen": ratsche_offen,
    }
    ziel = Path(ausgabedatei)
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps(aus, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"       R12 verbindlich: {len(zahlen)} Messungen, max {aus['max']}, "
          f"{len(verstoesse)} ueber Grenze, {len(ratsche_rot)} Ratsche-Verstoss/Verstoesse — {ziel}")
    R12_BERICHT["gemessen"] = gemessen and ratsche_gemessen
    R12_BERICHT["grund"] = (None if (gemessen and ratsche_gemessen)
                            else (grund or "; ".join(ratsche_offen) or "nicht gemessen"))
    R12_BERICHT["zahlen"] = [(lbl, nm, z, s) for lbl, nm, z, s, _b in zahlen]
    if ratsche_rot:
        return ratsche_rot      # Zuwachs gegenueber der eingefrorenen Letztmessung = ROT
    if not gemessen or not ratsche_gemessen:
        return None             # eigener Zustand: nicht gemessen (kein 0, kein Verlust)
    return []                   # gehalten: aktuell <= Baseline je Ansicht×Breite
def r12_bedienelemente(bloecke, texte, messen, r12_datei=None, r12_ausgabe=None,
                       festhalten=False, r12_stand=None):
    if r12_datei:
        return r12_breiten(r12_datei, r12_ausgabe or R12_VERBINDLICH,
                           festhalten=festhalten, standdatei=r12_stand)
    """Höchstens 6 sichtbare Bedienelemente je Ansicht (DOM-Messung im laufenden Programm).

    DREI AUSGÄNGE, und keiner davon ist still:
      · gemessen, alles im Rahmen   → [] (eingehalten)
      · gemessen, eine Ansicht zu groß → Liste der Verstöße (zählt als Verschlechterung)
      · NICHT gemessen (kein Programm, Ansicht nicht aufgebaut) → None: laut gemeldet in der
        Zeile UND in der Zusammenfassung, aber NICHT als Verschlechterung gezählt und NICHT
        als eingehalten. Ein Rückschritt, der nur aus einer nicht zustande gekommenen Messung
        entsteht, ist keiner — der eingefrorene Stand kannte R12 nur als stumme 0.

    Warum `return ` vor dem Messprogramm steht: `tools/cdp.py:147` verpackt den Ausdruck je nach
    Inhalt als AUSDRUCK (`... return {js} ...`) oder als RUMPF (`... {js} ...`). Ein Programm mit
    `return`/`;` gilt als Rumpf — ohne eigenes `return` kommt dann `null` zurück (gemessen 09.10.2026:
    genau das war der Grund, warum R12 „0 sichtbare Elemente" meldete; die Messung kam nie an)."""
    if not messen:
        R12_BERICHT["gemessen"] = False
        R12_BERICHT["grund"] = "ohne --dom wird im DOM nicht gemessen"
        return None
    try:
        aus = subprocess.run([sys.executable, "tools/cdp.py", "eval", "return " + r12_js()], cwd=HIER,
                             capture_output=True, text=True, timeout=120, encoding="utf-8")
    except Exception as fehler:                                        # noqa: BLE001
        R12_BERICHT.update(gemessen=False, grund=str(fehler))
        print(f"       R12 nicht gemessen: {fehler}")
        return None
    befunde, zahlen = r12_auswerten(aus.stdout)
    verstoesse = [b for b in befunde if not b.startswith("nicht gemessen")]
    offen = [b for b in befunde if b.startswith("nicht gemessen")]
    if not zahlen and aus.returncode != 0:
        zeilen = [z for z in (aus.stderr or "").strip().splitlines() if z.strip()]
        zusatz = f" ({zeilen[-1].strip()[:110]})" if zeilen else ""
        offen = [f"nicht gemessen: cdp.py endete mit {aus.returncode}{zusatz}"]
    for titel, name, zahl, soll in zahlen:
        stand = "nicht gemessen" if zahl is None else f"{zahl} sichtbar, erlaubt {soll}"
        print(f"       R12 {titel} ({name}): {stand}")
    for b in offen:
        print(f"       R12 {b}")
    for b in verstoesse:
        print(f"       R12 VERSTOSS {b}")
    gemessen = any(z[2] is not None for z in zahlen)
    R12_BERICHT["gemessen"] = gemessen and not offen
    R12_BERICHT["grund"] = None if (gemessen and not offen) else "; ".join(offen) or "keine Ansicht messbar"
    R12_BERICHT["zahlen"] = zahlen
    if verstoesse:
        return verstoesse
    if offen or not gemessen:
        return None
    return []


def messen(texte=None, dom=False, r12_datei=None, r12_ausgabe=None, festhalten=False, r12_stand=None):
    """Alle Regeln messen. Liefert (liste, kennzahlen); liste: (nummer, name, treffer, einheit)."""
    bloecke, kenn = lies(texte)
    roh = texte if texte is not None else [(p.name, p.read_text(encoding="utf-8")) for p in sorted(STIL.glob("*.css"))]
    regeln = [
        ("R1", "Farbe nur per Token", r1_farbe(bloecke), "Deklarationen mit Farb-Literal"),
        ("R2", "Radius nur aus Tokens", r2_radius(bloecke), "Deklarationen ohne Token"),
        ("R3", "Schrift nur aus der Skala § 18.5", r3_schrift(bloecke), "Deklarationen außerhalb der Skala"),
        ("R4", "Abstand nur aus der Skala", r4_abstand(bloecke), "Werte außerhalb der Skala"),
        ("R5", "Dauer nur 1/160/320 ms", r5_dauer(bloecke), "Zeitwerte außerhalb der Skala"),
        ("R6", "z-index nur aus der Leiter", r6_zindex(bloecke), "Deklarationen außerhalb der Leiter"),
        ("R7", "!important nur in basis.css", r7_important(bloecke), "Deklarationen"),
        ("R8", "Bewegung aus: ein zentraler Block", r8_bewegung(bloecke, roh), "weitere Blöcke"),
        ("R9", "Ein Selektor einmal definiert", r9_selektor_einmal(bloecke), "Wiederholungen"),
        ("R10", "Keine identische Blockdopplung", r10_blockdopplung(bloecke), "doppelte Blöcke"),
        ("R11", "Längenzahl nur mit Einheit", r11_einheit(bloecke), "Zahlen ohne Einheit"),
        ("R12", "Höchstens 6 Bedienelemente je Ansicht",
         r12_bedienelemente(bloecke, roh, dom, r12_datei, r12_ausgabe, festhalten, r12_stand),
         "Befunde je Ansicht"),
    ]
    return regeln, kenn


# ---------------------------------------------------------------- Ausgabe und Stand

def zeige(regeln, kenn, lang=False):
    print("Netzwerk-Labor · Minimalismus-Regelwerk (src/stil/*.css)")
    print()
    for nr, name, treffer, einheit in regeln:
        if treffer is None:
            grund = f" — {R12_BERICHT['grund']}" if nr == "R12" and R12_BERICHT.get("grund") else ""
            print(f"  {nr:3} {name:38} nicht gemessen{grund}")
            continue
        kopf = f"  {nr:3} {name:38} {len(treffer):4} {einheit}"
        if treffer:
            grenze = len(treffer) if lang else 5
            print(f"{kopf}   z. B. " + "; ".join(treffer[:grenze]))
        else:
            print(f"{kopf}   — eingehalten")
    print()
    print(f"  Kennzahlen: {kenn['dateien']} Dateien, {kenn['zeilen']} Zeilen, {kenn['deklarationen']} Deklarationen, "
          f"{kenn['bloecke']} Regelblöcke, {kenn['selektoren']} verschiedene Selektor+Kontext")


def als_stand(regeln, kenn):
    return {"fassung": 1,
            "hinweis": "Eingefrorener Ist-Stand. ethos.py meldet ROT nur, wenn eine Zahl STEIGT. "
                       "Verbesserungen gehören mit --neu hier hinein.",
            "kennzahlen": {k: kenn[k] for k in ("dateien", "zeilen", "deklarationen", "bloecke", "selektoren")},
            "regeln": {nr: (0 if t is None else len(t)) for nr, _, t, _ in regeln}}


def pruefe_gegen_stand(regeln, stand):
    schlechter, besser = [], []
    for nr, name, treffer, einheit in regeln:
        if treffer is None:
            continue
        alt = stand.get("regeln", {}).get(nr)
        neu = len(treffer)
        if alt is None:
            schlechter.append(f"{nr} {name}: kein Stand-Wert, jetzt {neu}")
        elif neu > alt:
            schlechter.append(f"{nr} {name}: {alt} → {neu} (+{neu - alt}); z. B. " + "; ".join(treffer[:3]))
        elif neu < alt:
            besser.append(f"{nr} {name}: {alt} → {neu}")
    return schlechter, besser


def gegenprobe():
    """Baut Verstöße in eine Kopie ein: jede gestochene Regel MUSS rot werden (Exit 0 = alles erkannt)."""
    dateien = [(p.name, p.read_text(encoding="utf-8")) for p in sorted(STIL.glob("*.css"))]
    stiche = {
        "R1": (".gegenprobe-farbe{color:#123456}", "R1"),
        "R2": (".gegenprobe-radius{border-radius:13px}", "R2"),
        "R3": (".gegenprobe-schrift{font-size:19px}", "R3"),
        "R4": (".gegenprobe-abstand{padding:7px}", "R4"),
        "R5": (".gegenprobe-dauer{transition:all .37s}", "R5"),
        "R6": (".gegenprobe-z{z-index:57}", "R6"),
        "R7": (".gegenprobe-wichtig{color:red !important}", "R7"),
        "R8": ("@media (prefers-reduced-motion: reduce){.gegenprobe-bewegung{animation:none}}", "R8"),
        "R9": (".gegenprobe-einmal{color:var(--ink)}\n.gegenprobe-einmal{color:var(--muted)}", "R9"),
        "R10": (".gegenprobe-doppelt-a{color:var(--muted)}\n.gegenprobe-doppelt-b{color:var(--muted)}", "R10"),
        "R11": (".gegenprobe-einheit{width:12}", "R11"),
    }
    kopien = list(dateien)
    kopien[0] = (kopien[0][0], kopien[0][1] + "\n" + "\n".join(s for s, _ in stiche.values()) + "\n")
    regeln, _ = messen(kopien)
    zahlen = {nr: len(t) for nr, _, t, _ in regeln if t is not None}
    basis, _ = messen(dateien)
    vorher = {nr: len(t) for nr, _, t, _ in basis if t is not None}
    fehlt = []
    print("Gegenprobe: absichtliche Verstöße einbauen — jede gestochene Regel muss steigen.")
    for name, (code, nr) in stiche.items():
        zuwachs = zahlen.get(nr, 0) - vorher.get(nr, 0)
        print(f"  {nr:3} {code[:52]:54} +{zuwachs}")
        if zuwachs < 1:
            fehlt.append(nr)
    print()
    if fehlt:
        print(f"ROT: die Gegenprobe wurde NICHT überall erkannt — blind für {', '.join(fehlt)}")
        return 1
    print("GRUEN: die Gegenprobe wurde rot — alle 11 prüfbaren Regeln schlagen an.")
    return 0


def kurz(pfad):
    """Pfad möglichst kurz anzeigen (relativ zum Projekt, sonst absolut)."""
    try:
        return str(pfad.resolve().relative_to(HIER))
    except ValueError:
        return str(pfad)


def main():
    ap = argparse.ArgumentParser(description="Minimalismus-Regelwerk für src/stil/*.css")
    ap.add_argument("--stand", default=str(STAND_VORGABE), help="Stand-Datei (Standard: tests/stil-stand.json)")
    ap.add_argument("--neu", action="store_true", help="Stand-Datei aus dem Ist-Stand schreiben")
    ap.add_argument("--gegenprobe", action="store_true", help="absichtliche Verstöße einbauen; muss rot werden")
    ap.add_argument("--dom", action="store_true", help="Regel 12 im laufenden Programm messen (tools/cdp.py)")
    ap.add_argument("--r12", nargs="?", const=str(R12_ROHDATEN), default=None,
                    help="verbindliche R12-Zahl je Ansicht+Breite aus der Rohmessung (tools/rauch.py --r12)")
    ap.add_argument("--r12-ausgabe", default=None,
                    help="Ziel der verbindlichen R12-Datei (Standard: Nachweise/3.0/r12.json)")
    ap.add_argument("--festhalten", action="store_true",
                    help="Letztmessung als versionierte Baseline tests/r12-stand.json einfrieren")
    ap.add_argument("--festhalten-ziel", default=None,
                    help="Ziel der versionierten Baseline (Standard: tests/r12-stand.json)")
    ap.add_argument("--r12-baseline", default=None,
                    help="Baseline der Ratsche (Standard: tests/r12-stand.json)")
    ap.add_argument("--lang", action="store_true", help="alle Fundstellen ausgeben")
    args = ap.parse_args()

    if args.gegenprobe:
        return gegenprobe()

    if args.festhalten_ziel and not args.r12_baseline:
        args.r12_baseline = args.festhalten_ziel
    regeln, kenn = messen(dom=args.dom, r12_datei=args.r12, r12_ausgabe=args.r12_ausgabe,
                          festhalten=args.festhalten, r12_stand=args.r12_baseline)
    zeige(regeln, kenn, args.lang)

    nicht_gemessen = [nr for nr, _, t, _ in regeln if t is None]
    if not R12_BERICHT.get("gemessen") and "R12" not in nicht_gemessen:
        nicht_gemessen.append("R12")          # teilweise/nicht gemessen: laut sagen, nicht zählen
    if nicht_gemessen:
        print(f"  NICHT GEMESSEN: {', '.join(nicht_gemessen)} — diese Regel(n) gelten weder als eingehalten "
              "noch als verletzt und zählen NICHT als Verschlechterung. "
              + (f"R12: {R12_BERICHT['grund']}. " if R12_BERICHT.get("grund") else "")
              + "R12 misst nur mit `--dom` bei laufendem Programm (python tools/cdp.py start).")

    ziel = Path(args.stand)
    if not ziel.is_absolute():
        ziel = HIER / ziel
    if args.neu:
        ziel.parent.mkdir(parents=True, exist_ok=True)
        ziel.write_text(json.dumps(als_stand(regeln, kenn), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nStand geschrieben: {kurz(ziel)}")
        return 0

    if ziel.is_file():
        stand = json.loads(ziel.read_text(encoding="utf-8"))
        schlechter, besser = pruefe_gegen_stand(regeln, stand)
        if besser:
            print("\nBESSER als der Stand (mit --neu festschreiben): " + "; ".join(besser))
        if schlechter:
            print(f"\nROT: {len(schlechter)} Regel(n) schlechter als {kurz(ziel)}:")
            for z in schlechter:
                print("  - " + z)
            return 1
        print(f"\nGRUEN: keine Regel schlechter als {kurz(ziel)}. "
              "Eingehalten ist damit nicht jede Regel — der Stand friert die Altlasten ein."
              + (f" NICHT GEMESSEN: {', '.join(nicht_gemessen)}." if nicht_gemessen else ""))
        return 0

    offen = [f"{nr} {name}: {len(t)}" for nr, name, t, _ in regeln if t]
    if offen:
        print(f"\nROT (ohne Stand-Datei gilt jeder Verstoß): {'; '.join(offen)}")
        print("Altlasten einfrieren: python tools/ethos.py --neu --stand tests/stil-stand.json")
        return 1
    print("\nGRUEN: alle Regeln eingehalten.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
