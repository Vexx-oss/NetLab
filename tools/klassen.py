"""Abgleich „Klassen im JS ↔ CSS-Regeln“ (in 1.0 fehlten ganze Stylesheets).

  python tools/klassen.py            listet Klassen aus src/ui/*.js, zu denen keine CSS-Regel in src/stil/*.css passt
  python tools/klassen.py lb- pa-    nur Klassen mit diesen Präfixen

Heuristik: Zeichenketten in Zeilen mit class:/classList/className/closest/querySelector werden in Wörter zerlegt;
geprüft werden Wörter mit Bindestrich (alle Bausteine nutzen Präfixe wie sp-, lb-, pa-, am-). IDs (id: "…", url(#…))
und Bus-Ereignisse (Bus.an/senden("…")) zählen nicht. Ausnahmen (ARIA, SVG-Attribute) stehen in AUSNAHMEN, Klassen, die
absichtlich nur als JS-Marke dienen, und Wörter, die keine Klassen sind, in MARKEN. Ziel: 0 Treffer.
"""
import re
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
SRC = HIER / "src"
AUSNAHMEN = re.compile(r"^(aria-|data-|stroke-|font-|text-|line-|letter-|white-|pointer-|touch-|user-|object-|z-|tab-|line-height|"
                       r"bg-|sans-|mono-|no-|on-|is-|has-)")
ZEILE = re.compile(r"class(?:List|Name)?\b|closest\(|querySelector|\$\$?\(")
OHNE = re.compile(r"""\bid:\s*("[^"]*"|'[^']*'|`[^`]*`)|url\(#[^)]*\)|Bus\.(?:an|aus|senden)\(\s*"[^"]*" """.strip())
MARKEN = {
    "lb-welt", "lb-werkzeuge",        # Gruppen-Container (SVG-Ebene, Werkzeugleiste) – nur zum Finden per JS
    "vlan-farbe",                     # setzt nur --kf (Kabelfarbe), die Regel hängt an .kabel
    "default-gateway",                # Text „ip default-gateway“ in einem Feldtitel
    "zu-teuer",                       # Zustand im Shop (Schlüssel einer Tabelle), keine Klasse
}
TEXT = re.compile(r'"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`|\'((?:[^\'\\]|\\.)*)\'')


def css_klassen():
    css = "\n".join(p.read_text(encoding="utf-8") for p in (SRC / "stil").glob("*.css"))
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    return set(re.findall(r"\.(-?[A-Za-z_][\w-]*)", css))


def js_klassen():
    gefunden = {}
    for p in sorted((SRC / "ui").glob("*.js")):
        for nr, zeile in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            if not ZEILE.search(zeile):
                continue
            zeile = OHNE.sub(" ", zeile)
            for m in TEXT.finditer(zeile):
                s = next(g for g in m.groups() if g is not None)
                s = re.sub(r"\$\{[^}]*\}", " ", s)
                for wort in re.split(r"[\s.,>:#\[\]()=+~*\"']+", s):
                    if re.fullmatch(r"[a-z][a-z0-9]*(-[a-z0-9]+)+", wort) and not AUSNAHMEN.match(wort) and wort not in MARKEN:
                        gefunden.setdefault(wort, f"{p.name}:{nr}")
    return gefunden


def main():
    praefixe = sys.argv[1:]
    css = css_klassen()
    fehlt = {k: ort for k, ort in js_klassen().items() if k not in css and (not praefixe or k.startswith(tuple(praefixe)))}
    for k, ort in sorted(fehlt.items()):
        print(f"{k:32} {ort}")
    print(f"\n{len(fehlt)} Klassen ohne CSS-Regel" + (f" (Präfixe {' '.join(praefixe)})" if praefixe else ""))


if __name__ == "__main__":
    main()
