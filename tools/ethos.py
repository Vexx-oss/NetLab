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
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
STIL = HIER / "src" / "stil"
STAND_VORGABE = HIER / "tests" / "stil-stand.json"

SCHRIFT_SKALA = {11, 12, 13, 15, 20, 28}
ABSTAND_SKALA = {0, 4, 8, 12, 16, 24, 32}
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
    """Radius nur aus Tokens: var(--radius…), 999px (Pille), 50% (Kreis)."""
    treffer = []
    for b, d in deklarationen(bloecke):
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
    """Schrift nur aus sechs Werten: {11,12,13,15,20,28}px — keine halben Pixel, kein em/%."""
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
        if d["prop"] != "z-index" or "root" in b["sel"]:
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
            if name != "basis.css":                     # basis.css ist der zentrale Block
                treffer.append(f"{name}:{zeile}")
    return treffer


def r9_selektor_einmal(bloecke):
    """Ein Selektor wird unter gleichen Bedingungen nur einmal definiert (Wiederholung = toter Text)."""
    gesehen = defaultdict(list)
    for b in bloecke:
        if KEYFRAME_SCHRITT.match(b["sel"]):
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


def r12_bedienelemente(bloecke, texte, messen):
    """Höchstens 6 sichtbare Bedienelemente je Ansicht (DOM-Messung im laufenden Programm)."""
    if not messen:
        return None
    js = ("(()=>{const s=[...document.querySelectorAll('button,[role=button],input,select,textarea,a[href]')]"
          ".filter(e=>{const r=e.getBoundingClientRect();const st=getComputedStyle(e);"
          "return r.width>0&&r.height>0&&st.visibility!=='hidden'&&st.display!=='none'});"
          "return JSON.stringify({sichtbar:s.length})})()")
    try:
        aus = subprocess.run([sys.executable, "tools/cdp.py", "eval", js], cwd=HIER,
                             capture_output=True, text=True, timeout=90, encoding="utf-8")
        daten = json.loads(re.search(r"\{.*\}", aus.stdout or "{}").group(0))
    except Exception as fehler:                                        # noqa: BLE001
        print(f"       Regel 12 übersprungen: {fehler}")
        return None
    if daten.get("sichtbar", 0) > 6:
        return [f"laufendes Programm: {daten['sichtbar']} sichtbare Bedienelemente"]
    return []


def messen(texte=None, dom=False):
    """Alle Regeln messen. Liefert (liste, kennzahlen); liste: (nummer, name, treffer, einheit)."""
    bloecke, kenn = lies(texte)
    roh = texte if texte is not None else [(p.name, p.read_text(encoding="utf-8")) for p in sorted(STIL.glob("*.css"))]
    regeln = [
        ("R1", "Farbe nur per Token", r1_farbe(bloecke), "Deklarationen mit Farb-Literal"),
        ("R2", "Radius nur aus Tokens", r2_radius(bloecke), "Deklarationen ohne Token"),
        ("R3", "Schrift nur aus 6 Werten", r3_schrift(bloecke), "Deklarationen außerhalb der Skala"),
        ("R4", "Abstand nur aus der Skala", r4_abstand(bloecke), "Werte außerhalb der Skala"),
        ("R5", "Dauer nur 1/160/320 ms", r5_dauer(bloecke), "Zeitwerte außerhalb der Skala"),
        ("R6", "z-index nur aus der Leiter", r6_zindex(bloecke), "Deklarationen außerhalb der Leiter"),
        ("R7", "!important nur in basis.css", r7_important(bloecke), "Deklarationen"),
        ("R8", "Bewegung aus: ein zentraler Block", r8_bewegung(bloecke, roh), "weitere Blöcke"),
        ("R9", "Ein Selektor einmal definiert", r9_selektor_einmal(bloecke), "Wiederholungen"),
        ("R10", "Keine identische Blockdopplung", r10_blockdopplung(bloecke), "doppelte Blöcke"),
        ("R11", "Längenzahl nur mit Einheit", r11_einheit(bloecke), "Zahlen ohne Einheit"),
        ("R12", "Höchstens 6 Bedienelemente je Ansicht", r12_bedienelemente(bloecke, roh, dom), "sichtbare Elemente"),
    ]
    return regeln, kenn


# ---------------------------------------------------------------- Ausgabe und Stand

def zeige(regeln, kenn, lang=False):
    print("Netzwerk-Labor · Minimalismus-Regelwerk (src/stil/*.css)")
    print()
    for nr, name, treffer, einheit in regeln:
        if treffer is None:
            print(f"  {nr:3} {name:38} übersprungen (--dom nicht gesetzt oder Programm nicht erreichbar)")
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
    ap.add_argument("--lang", action="store_true", help="alle Fundstellen ausgeben")
    args = ap.parse_args()

    if args.gegenprobe:
        return gegenprobe()

    regeln, kenn = messen(dom=args.dom)
    zeige(regeln, kenn, args.lang)

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
              "Eingehalten ist damit nicht jede Regel — der Stand friert die Altlasten ein.")
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
