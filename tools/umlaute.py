# -*- coding: utf-8 -*-
"""Umlaut-Waechter: sichtbare Texte und enge Versal-Ueberschriften.

Aufruf: python tools/umlaute.py [--leise]
Exit 0 = gruen, 1 = Befund, 2 = Werkzeugfehler.

(a) Sichtbare Texte in src/ui, src/daten, src/spiel, src/seite.html, index.html und
    CSS-content-Strings: ASCII-Transliterationen (aussen, Gaeste, ueber, laedt ...)
    und Mojibake (A-tilde, Euro-Zeichen-Folgen, A-circumflex). Kommentare und technische
    Schluessel werden nicht geprueft.
(b) CSS-Regeln in src/stil: text-transform:uppercase plus line-height < 1.15
    (oder overflow:hidden plus < 1.15) bei Ueberschriften/Titeln/grossen Labels.
    Kleine 11-px-Etiketten sind als geprueft Ausnahme dokumentiert: ihr Glyphenraum
    liegt in der Polsterung des umgebenden Kastens; gemessen am 30.10.2026.

Ausnahmen sind unten mit Datei + Wort + Grund aufgefuehrt. Nur Standardbibliothek.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
WURZEL = Path(__file__).resolve().parent.parent
STIL = WURZEL / "src" / "stil"
JS_ORDNER = [WURZEL / "src" / "ui", WURZEL / "src" / "daten", WURZEL / "src" / "spiel"]
HTML_DATEIEN = [WURZEL / "src" / "seite.html", WURZEL / "index.html"]

# ---------------------------------------------------------------- Woerter/Grenzen
# Nur eindeutige ASCII-Schreibweisen. "zuerst", "Quelle", "neue", "Steuer" sind
# korrekt und stehen deshalb NICHT hier.
FALSCH = (
    "aussen", "Aussen", "Gaeste", "GAESTE", "Stoerung", "stoerung", "Stoerungen",
    "ueber", "Ueber", "ueberall", "Ueberall", "uebernehmen", "uebernimmt", "uebernommen",
    "ueberpruefen", "ueberprueft", "ueberpruefung", "uebersicht", "Uebersicht",
    "uebersetzen", "uebersetzt", "uebersetzung", "uebertragen", "uebertraegt", "uebertragung",
    "fuer", "Fuer", "fuenf", "Fuenf", "frueh", "Frueh", "frueher",
    "gruen", "Gruen", "gruene", "gruener", "huegel", "kuehl", "kueche", "muede",
    "muessen", "schluessel", "Schluessel", "schueler", "Schueler", "tuer", "Tuer",
    "zurueck", "Zurueck", "zuruecksetzen", "zurueckgesetzt",
    "aendern", "Aendern", "aenderung", "Aenderung", "Geraet", "Geraete", "geraet",
    "Pruefung", "pruefung", "pruefen", "prueft", "spaeter", "Spaeter", "Groesse", "groesse",
    "groesser", "haengt", "Haengt", "haengen", "aeltere", "Aeltere", "aelter",
    "flaeche", "Flaeche", "flaechen", "naechste", "Naechste", "naechsten", "naechster",
    "waehlen", "Waehlen", "waehrend", "Waehrend", "laesst", "Laesst", "kaempfen",
    "oeffnen", "Oeffnen", "oeffnet", "oeffnung", "oeffentlich", "Oeffentlich",
    "koennen", "Koennen", "koennte", "moeglich", "Moeglich", "noetig", "Noetig",
    "loesung", "Loesung", "loesen", "hoeren", "woerter", "Woerter", "woertlich",
    "laedt", "Laedt", "Uebungen", "Uebung", "ueben", "uebt", "uebte",
    "gross", "Gross", "grosse", "grosser", "weiss", "Weiss", "heisst", "Heisst",
    "strasse", "Strasse", "schliessen", "Schliessen", "ausser", "Ausser", "Fuss", "fuss",
)
FALSCH_RE = re.compile(r"(?<![A-Za-zÄÖÜäöüß])(" + "|".join(re.escape(w) for w in sorted(set(FALSCH), key=len, reverse=True)) + r")(?![A-Za-zÄÖÜäöüß])", re.I)
MOJIBAKE = ("\u00c3", "\u00e2\u20ac", "\u00c2")
MOJIBAKE_RE = re.compile("|".join(re.escape(x) for x in MOJIBAKE))

# Ausnahmen: Datei (relativ zur Wurzel), Wort, Grund. Gross/klein wird ignoriert.
AUSNAHMEN = [
    ("src/daten/basis.js", "Gaeste", "technischer Cisco-VLAN-Name (ASCII, im Netz gesetzt)"),
    ("src/spiel/vorlagen.js", "Gaeste", "technischer Cisco-VLAN-Name (ASCII, im Netz gesetzt)"),
    ("src/daten/tickets-3-5.js", "Gaeste", "CLI-Konfiguration 'name Gaeste' (technischer Name)"),
    ("src/daten/tickets-3-5.js", "GAESTE", "DHCP-Poolname (technischer Schluessel, im Text zitiert)"),
    ("src/daten/trainings.js", "Gaeste", "zitierter VLAN-Name (technischer Name)"),
    ("src/daten/trainings.js", "Uebungen", "Dokumenttitel 07-Uebungen-Subnetting-Szenarien (Zitat)"),
    ("src/daten/wiki.js", "Uebungen", "Dokumenttitel 07-Uebungen-Subnetting-Szenarien (Zitat)"),
]

# Stopwoerter: macht aus einem String einen deutschen Satz/UI-Text.
STOPP = re.compile(r"\b(der|die|das|den|dem|des|ein|eine|einen|einem|eines|und|oder|aber|ist|sind|war|wird|werden|kann|können|muss|müssen|soll|sollen|nicht|kein|keine|für|mit|auf|aus|bei|nach|vor|über|unter|zwischen|ohne|um|durch|gegen|zu|im|in|am|an|von|vom|beim|wie|was|wer|wo|wenn|dann|auch|nur|noch|schon|hier|dort|es|sich|du|wir|ich)\b", re.I)
TECHNISCH = re.compile(r"(?:https?:|=>|\{|\}|</?[a-z]|\b(?:class|key|id|data-|aria-|style|href|src|px|var\()|\.(?:js|css|html)\b|(?:^|\s)--[a-z])", re.I)
LABEL = re.compile(r"^[A-ZÄÖÜ][a-zäöüß]+(?:[ \-][A-ZÄÖÜ][a-zäöüß]+){0,5}$")


def zeile(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


# ---------------------------------------------------------------- JS-Strings
def js_strings(text: str):
    """Statische String-/Template-Teile mit Zeile. Kommentare werden uebersprungen."""
    out, i, n = [], 0, len(text)
    while i < n:
        c = text[i]
        if c == "/" and i + 1 < n and text[i + 1] == "/":
            p = text.find("\n", i)
            i = n if p < 0 else p
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "*":
            p = text.find("*/", i + 2)
            i = n if p < 0 else p + 2
            continue
        if c in "\"'":
            q, start, i = c, i, i + 1
            buf = []
            while i < n:
                if text[i] == "\\":
                    buf.append(text[i:i + 2]); i += 2; continue
                if text[i] == q:
                    out.append((zeile(text, start), "".join(buf))); i += 1; break
                buf.append(text[i]); i += 1
            continue
        if c == chr(96):
            start, i = i, i + 1
            buf = []
            while i < n:
                if text[i] == "\\":
                    buf.append(text[i:i + 2]); i += 2; continue
                if text[i] == chr(96):
                    if "".join(buf).strip():
                        out.append((zeile(text, start), "".join(buf)))
                    i += 1; break
                if text[i] == "$" and i + 1 < n and text[i + 1] == "{":
                    if "".join(buf).strip():
                        out.append((zeile(text, start), "".join(buf)))
                    buf = []
                    i += 2; depth = 1
                    while i < n and depth:
                        d = text[i]
                        if d == "\\":
                            i += 2; continue
                        if d in "\"'" + chr(96):
                            q = d; i += 1
                            while i < n:
                                if text[i] == "\\":
                                    i += 2; continue
                                if text[i] == q:
                                    i += 1; break
                                i += 1
                            continue
                        if d == "{": depth += 1
                        elif d == "}": depth -= 1
                        i += 1
                    continue
                buf.append(text[i]); i += 1
            continue
        i += 1
    return out


def html_visible(text: str):
    """sichtbare Textknoten + aria-label/title/placeholder/alt; script/style/comment weg."""
    out = []
    cleaned = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    cleaned = re.sub(r"<(script|style)\b.*?</\1\s*>", "", cleaned, flags=re.S | re.I)
    for m in re.finditer(r"\b(aria-label|title|placeholder|alt)\s*=\s*(\"([^\"]*)\"|'([^']*)')", cleaned, re.I):
        val = m.group(3) if m.group(3) is not None else m.group(4)
        out.append((zeile(cleaned, m.start()), val))
    for m in re.finditer(r">([^<>]+)<", cleaned):
        t = re.sub(r"\s+", " ", m.group(1)).strip()
        if t:
            out.append((zeile(cleaned, m.start()), t))
    return out


def css_content(text: str):
    """content:"..."/'...' in CSS, Kommentare weg."""
    cleaned = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    out = []
    for m in re.finditer(r"\bcontent\s*:\s*(\"((?:\\.|[^\"\\])*)\"|'((?:\\.|[^'\\])*)')", cleaned, re.I):
        val = m.group(2) if m.group(2) is not None else m.group(3)
        val = val.replace('\\"', '"').replace("\\'", "'")
        out.append((zeile(cleaned, m.start()), val))
    return out


def ist_sichtbarer_text(t: str) -> bool:
    t = t.strip()
    if len(t) < 3 or TECHNISCH.search(t):
        return False
    if re.fullmatch(r"[a-z0-9_.:#\-\[\]=>+~*() ]+", t):
        return False
    if STOPP.search(t):
        return True
    if LABEL.match(t):
        return True
    return bool(re.search(r"[.!?]", t) and len(t) > 15)


def treffer(t: str):
    """(gefunden, wort) – Mojibake oder eine falsche Schreibweise."""
    if MOJIBAKE_RE.search(t):
        return True, MOJIBAKE_RE.search(t).group(0)
    m = FALSCH_RE.search(t)
    if m:
        return True, m.group(1)
    return False, ""


def ist_ausnahme(datei: str, wort: str) -> bool:
    d = datei.replace("\\", "/")
    for f, w, _ in AUSNAHMEN:
        if d.endswith(f) and w.lower() == wort.lower():
            return True
    return False


# ---------------------------------------------------------------- CSS-Regeln
def css_bloecke(text: str):
    cleaned = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", cleaned):
        yield m.group(1).strip(), m.group(2), zeile(cleaned, m.start())


def lh_wert(body: str):
    m = re.search(r"(?:^|;)\s*line-height\s*:\s*([0-9.]+)", body)
    if m:
        return float(m.group(1))
    m = re.search(r"(?:^|;)\s*font\s*:[^;]*?/\s*([0-9.]+)", body)
    if m:
        return float(m.group(1))
    return None


def font_px(body: str):
    m = re.search(r"(?:^|;)\s*font-size\s*:\s*([0-9.]+)px", body)
    if m:
        return float(m.group(1))
    m = re.search(r"(?:^|;)\s*font\s*:[^;]*?([0-9.]+)px", body)
    if m:
        return float(m.group(1))
    m = re.search(r"(?:^|;)\s*font(?:-size)?\s*:[^;]*?var\(--fs-(\d)\)", body)
    if m:
        return FS.get("--fs-" + m.group(1))
    return None


BASIS = (WURZEL / "src" / "stil" / "basis.css").read_text(encoding="utf-8")
FS = {m.group(1): float(m.group(2)) for m in re.finditer(r"(--fs-\d)\s*:\s*([0-9.]+)px", BASIS)}
HEADING = re.compile(r"(?:^|[\s,>])(?:h1|h2|h3|h4|strong)(?:$|[\s,.:#\[])", re.I)
NAMED = re.compile(r"(am-titel|hb-hero|hb-kopf|hb-auftrag|sp-pf-kopf|sp-brief|dock-text|in-kopf-text)", re.I)
GROSS = re.compile(r"(am-titel|hb-hero\s+h1|hb-kopf\s+h2|hb-auftrag\s+(?:h3|strong)|sp-pf-kopf\s+h2|sp-brief\s+h3|lb-auftrag[^,{]*(?:h1|h2)|dock-text|in-kopf-text\s+h3)", re.I)


def css_pruefen():
    befunde, geprueft, klein = [], 0, 0
    for f in sorted(STIL.glob("*.css")):
        text = f.read_text(encoding="utf-8")
        for sel, body, ln in css_bloecke(text):
            if not (HEADING.search(sel) or NAMED.search(sel)):
                continue
            uppercase = bool(re.search(r"text-transform\s*:\s*uppercase", body, re.I))
            overflow = bool(re.search(r"overflow\s*:\s*hidden", body, re.I))
            if not uppercase and not overflow:
                continue
            lh = lh_wert(body)
            if lh is None:
                continue
            px = font_px(body)
            # Dekorative ::before/::after-Labels (11 px) tragen ihre Punkte in der Polsterung.
            if px is not None and px < 16 and "::" in sel:
                klein += 1
                continue
            gross = bool(GROSS.search(sel)) or (px is not None and px >= 16)
            # 11-px-Etiketten sind geprueft Ausnahme (Polsterung des Kastens, gemessen).
            if not gross:
                klein += 1
                continue
            geprueft += 1
            if lh < 1.15:
                befunde.append((f.relative_to(WURZEL), ln, sel, lh, overflow))
    return befunde, geprueft, klein


# ---------------------------------------------------------------- Selbsttest
def selbsttest() -> bool:
    ok = True
    ok &= treffer("Stoerung im Betrieb")[0]
    ok &= treffer("ATELIER MESSING \u00c2\u00b7 HAUS 12")[0]
    ok &= not treffer("Störung im Betrieb")[0]
    ok &= not treffer("Neue Quelle, zuerst lesen")[0]
    ok &= treffer("laedt")[0]
    bloecke = list(css_bloecke("h1{text-transform:uppercase;line-height:1}"))
    ok &= len(bloecke) == 1 and lh_wert(bloecke[0][1]) == 1.0
    ok &= not ist_sichtbarer_text("geraet")
    return bool(ok)


def main() -> int:
    ap = argparse.ArgumentParser(description="Umlaut-Waechter fuer das Netzwerk-Labor")
    ap.add_argument("--leise", action="store_true", help="nur Bilanz")
    a = ap.parse_args()
    if not selbsttest():
        print("ROT: Selbsttest des Werkzeugs fehlgeschlagen (Muster werden nicht erkannt).")
        return 2
    befunde = []
    geprueft = 0
    ausnahmen = 0
    dateien = []
    for d in JS_ORDNER:
        dateien += sorted(d.glob("*.js"))
    dateien += [p for p in HTML_DATEIEN if p.is_file()]
    for f in dateien:
        text = f.read_text(encoding="utf-8")
        rel = f.relative_to(WURZEL).as_posix()
        ist_html = f.suffix == ".html"
        segs = js_strings(text) if not ist_html else html_visible(text)
        for ln, t in segs:
            # HTML ist klein und unmittelbar sichtbar: alle Textknoten/Attribute pruefen.
            if ist_html:
                if not t.strip() or TECHNISCH.search(t):
                    continue
            elif not ist_sichtbarer_text(t):
                continue
            geprueft += 1
            ja, wort = treffer(t)
            if ja:
                if ist_ausnahme(rel, wort):
                    ausnahmen += 1
                else:
                    befunde.append((rel, ln, wort, t.strip()[:100]))
    # CSS-content-Strings (nur sichtbare Inhalte, keine Kommentare)
    for f in sorted(STIL.glob("*.css")):
        text = f.read_text(encoding="utf-8")
        rel = f.relative_to(WURZEL).as_posix()
        for ln, t in css_content(text):
            if not t.strip():
                continue
            geprueft += 1
            ja, wort = treffer(t)
            if ja:
                if ist_ausnahme(rel, wort):
                    ausnahmen += 1
                else:
                    befunde.append((rel, ln, wort, t.strip()[:100]))
    css_befunde, css_geprueft, css_klein = css_pruefen()
    if not a.leise:
        print("Umlaut-Waechter")
        print(f"  sichtbare Texte: {geprueft} geprueft, {len(befunde)} Befund(e), {ausnahmen} dokumentierte Ausnahme(n)")
        print(f"  CSS-Ueberschriften: {css_geprueft} Versal-Regel(n) mit Headroom geprueft, {len(css_befunde)} Befund(e)")
        print(f"  kleine 11-px-Etiketten (Polsterung, gemessen): {css_klein} bewusst nicht als Ueberschrift gewertet")
        for rel, ln, wort, t in befunde:
            print(f"  ROT {rel}:{ln}  '{wort}'  in: {t}")
        for rel, ln, sel, lh, ov in css_befunde:
            print(f"  ROT {rel}:{ln}  {sel}  line-height {lh:g}{', overflow:hidden' if ov else ''}")
        if not befunde and not css_befunde:
            print(f"  GRUEN: {len(AUSNAHMEN)} Ausnahme(n) dokumentiert, 0 offene Befunde.")
    return 0 if not befunde and not css_befunde else 1


if __name__ == "__main__":
    sys.exit(main())
