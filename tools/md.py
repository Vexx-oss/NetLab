"""Markdown -> HTML, nur Python-Standardbibliothek (fuer die Doku-Seite des Netzwerk-Labors).

WARUM EIGENBAU: Die CI laeuft auf Ubuntu mit Python 3.12 OHNE Zusatzpakete —
`import markdown` ist dort nicht vorhanden, und AGENTS.md verbietet Installationen.
Dieser Konverter deckt deshalb genau die Teilmenge ab, die in den 29 Doku-Dateien
wirklich vorkommt — nachgezaehlt, nicht geraten (Messung 07.10.2026, tools/_analyse24.py):

    Ueberschriften 1-6 · Absaetze · Listen (ungeordnet/geordnet, verschachtelt) ·
    Tabellen (2 126 Tabellenzeilen — die Doku nutzt sie stark) · Codezaeune (147 Paare) ·
    eingerueckter Code · Blockzitate (305 Zeilen) · Trennlinien (155) ·
    **fett** · *kursiv* · `code` · ![Bild](...) · [Link](...) · [[Wiki-Links]] ·
    Fluchtzeichen \\* \\_ \\` und Entitaeten &amp; &lt; &gt; &nbsp;

Bewusst NICHT enthalten (kommt in diesen Dateien nicht vor): Fussnoten, Definitionslisten,
eingebettetes HTML in Blockform, Referenz-Links [text][id], Inline-HTML mit Attributen.
Was nicht vorkommt, wird auch nicht gebaut — sonst waere der Konverter unpruefbar gross.

Zwei Regeln, die der Auftrag hart vorgibt:
  * Kein toter Verweis. Ein [[Wiki-Link]] oder ein relativer .md-Verweis, dessen Ziel nicht
    zu den veroeffentlichten Dokumenten gehoert, wird NICHT verlinkt, sondern als Text mit
    sichtbarem Hinweis ausgegeben (`<span class="dk-tot">`, Titel = Grund).
  * Fluchtzeichen zuerst: `<` und `&` im Quelltext werden escapt, vorhandene Entitaeten
    (&amp;, &lt;, &gt;, &nbsp;) bleiben erhalten.

Aufruf (Pruefung/Entwicklung):
    python tools/md.py --beispiel        -> zeigt die Teilmenge an einem Beispiel
    python tools/md.py DATEI             -> wandelt eine Datei nach stdout (ohne Verweise)
"""
from __future__ import annotations

import re
import sys
import unicodedata
from html import escape
from html.parser import HTMLParser

# ------------------------------------------------------------------ Entitaeten und Escapen

# Entitaeten, die in den Quellen vorkommen und erhalten bleiben sollen.
ENTITAETEN = {"&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": "\u00a0"}
ENTITAET_MUSTER = re.compile("|".join(re.escape(k) for k in ENTITAETEN))


def esc(text: str) -> str:
    """Text HTML-sicher machen — vorhandene Entitaeten aber NICHT doppelt escapen.

    Reihenfolge: erst an den Entitaeten zerlegen, jeden Teil escapen, die Entitaet selbst
    unveraendert wieder einsetzen. So wird aus `&amp;` nicht `&amp;amp;`, und aus einem
    nackten `&` wird korrekt `&amp;`.
    """
    teile, letzter = [], 0
    for m in ENTITAET_MUSTER.finditer(text):
        teile.append(escape(text[letzter:m.start()], quote=False))
        teile.append(m.group(0))
        letzter = m.end()
    teile.append(escape(text[letzter:], quote=False))
    return "".join(teile)


# ------------------------------------------------------------------ Hilsfunktionen

def slug(text: str, vorhandene: set[str]) -> str:
    """Stabile Anker-Kennung aus einer Ueberschrift (deterministisch, ohne Zufall)."""
    roh = unicodedata.normalize("NFKD", text)
    roh = "".join(c for c in roh if not unicodedata.combining(c))
    roh = roh.lower()
    roh = re.sub(r"[^a-z0-9]+", "-", roh).strip("-")
    if not roh:
        roh = "abschnitt"
    kennung, n = roh, 2
    while kennung in vorhandene:
        kennung = f"{roh}-{n}"
        n += 1
    vorhandene.add(kennung)
    return kennung


def text_von(html: str) -> str:
    """Sichtbaren Text aus HTML holen (fuer den Inhaltsverzeichnis-Eintrag)."""
    return re.sub(r"<[^>]+>", "", html).strip()


# ------------------------------------------------------------------ Inline-Ebene

class Konverter:
    """Wandelt Markdown in HTML. `links` entscheidet ueber Ziele (siehe tools/seite.py)."""

    def __init__(self, links=None, anker_erzeugen: bool = True):
        self.links = links
        self.anker_erzeugen = anker_erzeugen
        self.ueberschriften: list[dict] = []          # {stufe, id, text}
        self._anker: set[str] = set()

    # ---- Inline -----------------------------------------------------------
    def inline(self, text: str) -> str:
        """Inline-Auszeichnung. Reihenfolge: Code · Bilder · Links · Wiki · fett · kursiv."""
        return self._inline(text)

    def _inline(self, text: str) -> str:
        aus, i, n = [], 0, len(text)
        while i < n:
            c = text[i]
            # Vorhandene Entitaet (&amp; &lt; &gt; &quot; &#39; &nbsp;) unveraendert uebernehmen —
            # ohne diesen Schritt wuerde das nackte & zu &amp; und die Entitaet damit zerstoert.
            if c == "&":
                e = ENTITAET_MUSTER.match(text, i)
                if e:
                    aus.append(e.group(0))
                    i = e.end()
                    continue
            # Fluchtzeichen: \* \_ \` \[ \] \\ usw.
            if c == "\\" and i + 1 < n and text[i + 1] in r"*_`[]()#+-.!|\<>~":
                aus.append(escape(text[i + 1], quote=False))
                i += 2
                continue
            # Code-Span: `code` (auch ``code``)
            if c == "`":
                m = re.match(r"(`+)(.+?)\1", text[i:], re.S)
                if m:
                    aus.append("<code>" + escape(m.group(2).strip(), quote=False) + "</code>")
                    i += m.end()
                    continue
            # Bild: ![alt](ziel "titel")
            if text.startswith("![", i):
                m = re.match(r"!\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+[\"']([^\"']*)[\"'])?\s*\)", text[i:])
                if m:
                    aus.append(self.bild(m.group(1), m.group(2), m.group(3)))
                    i += m.end()
                    continue
            # Link: [text](ziel "titel")  — Text darf eckige Klammern enthalten
            if c == "[" and not text.startswith("[[", i):
                m = re.match(r"\[((?:[^\[\]]|\[[^\]]*\])*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+[\"']([^\"']*)[\"'])?\s*\)", text[i:])
                if m:
                    aus.append(self.link(m.group(1), m.group(2), m.group(3)))
                    i += m.end()
                    continue
            # Wiki-Link: [[Ziel]] · [[Ziel|Anzeige]] · [[Ziel#Anker]] · [[Ziel#Anker|Anzeige]]
            # ACHTUNG: Das Ziel darf `|` enthalten (Obsidian wertet das ERSTE `|` als Trenner,
            # Ordner- und Dateinamen duerfen es ebenfalls tragen). Genau daran scheiterte die
            # Zeile 56 in docs/entwicklung/Konzept – Netzwerk-Labor.md: dort steht
            # [[20-Bereiche/…/Liesmich|Karriere – Storage & Cloud]].
            if text.startswith("[[", i):
                m = re.match(r"\[\[([^\]\[]*?)(?:#([^\]\[|]+))?(?:\|([^\]\[]*))?\]\]", text[i:])
                if m:
                    aus.append(self.wiki(m.group(1), m.group(2), m.group(3)))
                    i += m.end()
                    continue
                # Nicht aufloesbares Muster (z. B. "[[Start]"): als Text, NICHT als Muelleimer
                aus.append(escape("[[", quote=False))
                i += 2
                continue
            # Fett und kursiv (auch ***fett kursiv***)
            if text.startswith("***", i) or text.startswith("___", i):
                zeichen = text[i]
                m = re.match(re.escape(zeichen * 3) + r"(.+?)" + re.escape(zeichen * 3), text[i:], re.S)
                if m:
                    aus.append("<strong><em>" + self._inline(m.group(1)) + "</em></strong>")
                    i += m.end()
                    continue
            if text.startswith("**", i) or text.startswith("__", i):
                zeichen = text[i]
                m = re.match(re.escape(zeichen * 2) + r"(.+?)" + re.escape(zeichen * 2), text[i:], re.S)
                if m:
                    aus.append("<strong>" + self._inline(m.group(1)) + "</strong>")
                    i += m.end()
                    continue
            if c in "*_":
                m = re.match(re.escape(c) + r"([^\s*_](?:.*?[^\s*_])?)" + re.escape(c), text[i:], re.S)
                if m:
                    aus.append("<em>" + self._inline(m.group(1)) + "</em>")
                    i += m.end()
                    continue
            if text.startswith("~~", i):
                m = re.match(r"~~(.+?)~~", text[i:], re.S)
                if m:
                    aus.append("<del>" + self._inline(m.group(1)) + "</del>")
                    i += m.end()
                    continue
            # Sonst: ein Zeichen bis zum naechsten Sonderzeichen
            m = re.match(r"[^\\`\[!*_~<&]+", text[i:])
            if m:
                aus.append(escape(m.group(0), quote=False))
                i += m.end()
                continue
            aus.append(escape(c, quote=False))
            i += 1
        return "".join(aus)

    # ---- Ziele ------------------------------------------------------------
    def ziel(self, ziel: str) -> str:
        """Zielangabe normalisieren: spitze Klammern weg, Prozent-Kodierung aufloesen."""
        z = ziel.strip()
        if z.startswith("<") and z.endswith(">"):
            z = z[1:-1].strip()
        if "%" in z:
            from urllib.parse import unquote
            z = unquote(z)
        return z

    def link(self, text: str, ziel: str, titel: str | None) -> str:
        roh = self.ziel(ziel)
        if roh.startswith(("http://", "https://", "mailto:", "tel:")):
            return f'<a href="{escape(roh, quote=True)}">{self._inline(text)}</a>'
        if self.links is None:
            return f'<a href="{escape(roh, quote=True)}">{self._inline(text)}</a>'
        aufloesung = self.links.aufloesen(roh)
        if aufloesung is None:
            return f'<span class="dk-tot" title="{escape(self.links.grund(roh), quote=True)}">{self._inline(text)}</span>'
        return f'<a href="{escape(aufloesung, quote=True)}">{self._inline(text)}</a>'

    def bild(self, alt: str, ziel: str, titel: str | None) -> str:
        roh = self.ziel(ziel)
        if roh.startswith(("http://", "https://", "data:")):
            return f'<img src="{escape(roh, quote=True)}" alt="{escape(alt, quote=True)}">'
        if self.links is None:
            return f'<img src="{escape(roh, quote=True)}" alt="{escape(alt, quote=True)}">'
        aufloesung = self.links.bild(roh)
        if aufloesung is None:
            return f'<span class="dk-tot" title="{escape(self.links.grund(roh), quote=True)}">[Bild: {self._inline(alt)}]</span>'
        return f'<img src="{escape(aufloesung, quote=True)}" alt="{escape(alt, quote=True)}">'

    def wiki(self, ziel: str, anker: str | None, anzeige: str | None) -> str:
        """[[Ziel]] ausserhalb der Vault: nur verlinken, wenn das Ziel veroeffentlicht ist."""
        ziel = ziel.strip()
        anzeige_html = self._inline(anzeige.strip()) if anzeige and anzeige.strip() else None
        if not ziel:
            return anzeige_html or ""
        if self.links is None:
            return anzeige_html or self._inline(ziel)
        aufloesung = self.links.wiki(ziel, anker)
        if aufloesung is None:
            text = anzeige_html or self._inline(ziel)
            return f'<span class="dk-tot" title="{escape(self.links.grund(ziel), quote=True)}">{text}</span>'
        return f'<a href="{escape(aufloesung, quote=True)}">{anzeige_html or self._inline(ziel)}</a>'

    # ---- Block-Ebene ------------------------------------------------------
    def wandeln(self, text: str) -> str:
        """Markdown -> HTML (Blockebene)."""
        zeilen = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        bloecke = self._bloecke(zeilen)
        return "\n".join(bloecke)

    # -- Blockzerlegung
    def _bloecke(self, zeilen: list[str]) -> list[str]:
        aus: list[str] = []
        i, n = 0, len(zeilen)
        while i < n:
            zeile = zeilen[i]

            # Leerzeile
            if not zeile.strip():
                i += 1
                continue

            # Codezaun ``` oder ~~~  (auch mehr als drei Zeichen)
            m = re.match(r"^(\s*)(`{3,}|~{3,})\s*(.*)$", zeile)
            if m:
                zeichen, laenge, sprache = m.group(2)[0], len(m.group(2)), m.group(3).strip()
                i += 1
                inhalt = []
                while i < n and not re.match(r"^\s*" + re.escape(zeichen) + "{" + str(laenge) + r",}\s*$", zeilen[i]):
                    inhalt.append(zeilen[i])
                    i += 1
                i += 1                                     # schliessenden Zaun ueberspringen (fehlt er, endet der Block am Dateiende)
                klasse = f' class="sprache-{escape(sprache.split()[0], quote=True)}"' if sprache else ""
                aus.append(f"<pre><code{klasse}>" + escape("\n".join(inhalt), quote=False) + "</code></pre>")
                continue

            # Roher HTML-Block (kommt genau einmal vor: die zwei Bild-Spalten in README.md).
            # Er wird durchgereicht — sonst stuenden die Bilder als Text mit spitzen Klammern da.
            # Relative Bild-/Verweisziele darin werden ueber denselben Weg aufgeloest wie sonst.
            if re.match(r"^\s*<(?:table|tr|td|th|div|figure|img|p|section|details|summary)\b", zeile, re.I):
                roh, i = self._html_block(zeilen, i)
                aus.append(self._html_uebernehmen(roh))
                continue

            # Trennlinie
            if re.match(r"^\s*(?:-{3,}|\*{3,}|_{3,})\s*$", zeile) and not self._ist_tabelle(zeilen, i):
                aus.append("<hr>")
                i += 1
                continue

            # Ueberschrift
            m = re.match(r"^(#{1,6})\s+(.*?)\s*#*\s*$", zeile)
            if m:
                stufe = len(m.group(1))
                inhalt = self._inline(m.group(2).strip())
                kennung = ""
                if self.anker_erzeugen:
                    kennung = slug(text_von(inhalt), self._anker)
                    self.ueberschriften.append({"stufe": stufe, "id": kennung, "text": text_von(inhalt)})
                    kennung = f' id="{kennung}"'
                aus.append(f"<h{stufe}{kennung}>{inhalt}</h{stufe}>")
                i += 1
                continue

            # Tabelle
            if self._ist_tabelle(zeilen, i):
                html, i = self._tabelle(zeilen, i)
                aus.append(html)
                continue

            # Blockzitat
            if re.match(r"^\s*>", zeile):
                zitat, i = self._zitat(zeilen, i)
                aus.append(zitat)
                continue

            # Liste
            if re.match(r"^\s*(?:[-*+]|\d+[.)])\s+", zeile):
                html, i = self._liste(zeilen, i)
                aus.append(html)
                continue

            # Eingerueckter Code (4 Leerzeichen oder ein Tabulator), nur wenn keine Liste
            if re.match(r"^(?: {4,}|\t)\S", zeile) and not re.match(r"^\s*(?:[-*+]|\d+[.)])\s", zeile):
                inhalt = []
                while i < n and (re.match(r"^(?: {4,}|\t)", zeilen[i]) or not zeilen[i].strip()):
                    inhalt.append(zeilen[i][4:] if zeilen[i].startswith("    ") else zeilen[i].lstrip("\t"))
                    i += 1
                while inhalt and not inhalt[-1].strip():
                    inhalt.pop()
                aus.append("<pre><code>" + escape("\n".join(inhalt), quote=False) + "</code></pre>")
                continue

            # Absatz: bis zur naechsten Leerzeile oder einem neuen Blockanfang
            absatz = []
            while i < n and zeilen[i].strip() and not self._blockanfang(zeilen, i):
                absatz.append(zeilen[i].strip())
                i += 1
            aus.append("<p>" + self._inline(" ".join(absatz)) + "</p>")
        return aus

    def _blockanfang(self, zeilen: list[str], i: int) -> bool:
        z = zeilen[i]
        if re.match(r"^\s*(`{3,}|~{3,})", z): return True
        if re.match(r"^#{1,6}\s", z): return True
        if re.match(r"^\s*>", z): return True
        if re.match(r"^\s*(?:[-*+]|\d+[.)])\s+", z): return True
        if re.match(r"^\s*<(?:table|tr|td|th|div|figure|img|p|section|details|summary)\b", z, re.I): return True
        if re.match(r"^\s*(?:-{3,}|\*{3,}|_{3,})\s*$", z) and not self._ist_tabelle(zeilen, i): return True
        if self._ist_tabelle(zeilen, i): return True
        return False

    def _html_block(self, zeilen: list[str], i: int) -> tuple[str, int]:
        """Einen rohen HTML-Block sammeln, bis die Tag-Tiefe wieder 0 ist (oder eine Leerzeile)."""
        LEER = {"img", "br", "hr", "input", "meta", "link", "col", "source", "wbr"}
        tiefe = 0
        teile = []
        n = len(zeilen)
        while i < n:
            z = zeilen[i]
            if not z.strip() and tiefe <= 0:
                break
            teile.append(z)
            for m in re.finditer(r"<\s*(/?)\s*([a-zA-Z][\w-]*)([^>]*)>", z):
                schluss, name, rest = m.group(1), m.group(2).lower(), m.group(3)
                if name in LEER or rest.rstrip().endswith("/"):
                    continue
                tiefe += -1 if schluss else 1
            i += 1
            if tiefe <= 0 and teile:
                break
        return "\n".join(teile), i

    def _html_uebernehmen(self, roh: str) -> str:
        """Durchgereichtes HTML: nur relative Ziele werden aufgeloest (sonst bliebe `docs/…` stehen)."""
        def ersetze(m):
            attr, anfuehrung, ziel = m.group(1), m.group(2), m.group(3)
            aufgeloest = self.links.aufloesen(ziel) if self.links is not None else ziel
            if aufgeloest is None:
                return m.group(0)                            # bleibt wie es ist, nichts erfunden
            return f'{attr}={anfuehrung}{aufgeloest}{anfuehrung}'
        return '<div class="dk-html">' + re.sub(r'\b(src|href)=(["\'])([^"\']+)\2', ersetze, roh) + "</div>"

    def _ist_tabelle(self, zeilen: list[str], i: int) -> bool:
        """Kopfzeile |---| darunter = Tabelle."""
        if i + 1 >= len(zeilen): return False
        if "|" not in zeilen[i]: return False
        return bool(re.match(r"^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*$", zeilen[i + 1]))

    def _zellen(self, zeile: str) -> list[str]:
        """Eine Tabellenzeile in Zellen zerlegen — `|` in Wiki-Links, Verweisen und Code bleibt Text.

        Warum das noetig ist (gemessen 07.10.2026): In docs/entwicklung/Konzept – Netzwerk-Labor.md
        steht `[[…/Liesmich|Karriere – Storage & Cloud]]`. Ein naives `split("|")` machte daraus
        ZWEI Zellen und zerlegte damit die ganze Tabellenzeile.
        """
        z = zeile.strip()
        if z.startswith("|"): z = z[1:]
        if z.endswith("|"): z = z[:-1]
        zellen, aktuelle, tiefe = [], [], 0
        i, n = 0, len(z)
        while i < n:
            if z.startswith("[[", i):
                tiefe += 1; aktuelle.append("[["); i += 2; continue
            if z.startswith("]]", i):
                tiefe = max(0, tiefe - 1); aktuelle.append("]]"); i += 2; continue
            if z[i] == "`":
                tiefe = 0 if tiefe else 1; aktuelle.append("`"); i += 1; continue
            if z[i] == "|" and tiefe == 0:
                zellen.append("".join(aktuelle).strip()); aktuelle = []; i += 1; continue
            aktuelle.append(z[i]); i += 1
        zellen.append("".join(aktuelle).strip())
        return zellen

    def _tabelle(self, zeilen: list[str], i: int) -> tuple[str, int]:
        kopf = self._zellen(zeilen[i])
        ausgerichtet = [t.strip() for t in self._zellen(zeilen[i + 1])]
        i += 2
        zeilen_html = []
        while i < len(zeilen) and "|" in zeilen[i] and zeilen[i].strip():
            zeilen_html.append(self._zellen(zeilen[i]))
            i += 1
        kopf_html = "".join(
            f'<th{self._ausrichtung(ausgerichtet, k)}>{self._inline(t)}</th>' for k, t in enumerate(kopf))
        koerper = []
        for zellen in zeilen_html:
            tds = "".join(
                f'<td{self._ausrichtung(ausgerichtet, k)}>{self._inline(t)}</td>' for k, t in enumerate(zellen))
            koerper.append(f"<tr>{tds}</tr>")
        return ("<div class=\"dk-tabelle\"><table><thead><tr>" + kopf_html + "</tr></thead><tbody>"
                + "".join(koerper) + "</tbody></table></div>"), i

    def _ausrichtung(self, ausgerichtet: list[str], k: int) -> str:
        if k >= len(ausgerichtet): return ""
        a = ausgerichtet[k]
        if a.startswith(":") and a.endswith(":"): return ' style="text-align:center"'
        if a.endswith(":"): return ' style="text-align:right"'
        return ""

    def _zitat(self, zeilen: list[str], i: int) -> tuple[str, int]:
        inhalt = []
        while i < len(zeilen) and (re.match(r"^\s*>", zeilen[i]) or (inhalt and zeilen[i].strip())):
            inhalt.append(re.sub(r"^\s*>\s?", "", zeilen[i]))
            i += 1
        innen = self._bloecke(inhalt)          # gleiche Ankerliste: keine doppelten IDs
        return f"<blockquote>\n" + "\n".join(innen) + "\n</blockquote>", i

    def _liste(self, zeilen: list[str], i: int) -> tuple[str, int]:
        """Eine Liste mit beliebiger Verschachtelung. Einrueckung = zwei Leerzeichen je Ebene."""
        return self._liste_ebene(zeilen, i, self._einrueckung(zeilen[i]))

    def _einrueckung(self, zeile: str) -> int:
        return len(re.match(r"^(\s*)", zeile).group(1).expandtabs(4))

    def _marke(self, zeile: str):
        return re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$", zeile)

    def _liste_ebene(self, zeilen: list[str], i: int, einzug: int) -> tuple[str, int]:
        """Eine Ebene sammeln. Jede Position ist (text, unterlisten) — damit bleibt die
        Reihenfolge innen richtig: erst der Text, dann die Unterliste."""
        erster = self._marke(zeilen[i])
        geordnet = erster.group(2)[0].isdigit()
        posten: list[list] = []                # [text_html, unter_html]
        n = len(zeilen)
        while i < n:
            if not zeilen[i].strip():
                # Leerzeile: gehoert sie zu einer Unterstruktur, macht der Aufrufer weiter
                break
            m = self._marke(zeilen[i])
            if m:
                if m.group(2)[0].isdigit() != geordnet:
                    break
                tiefe = len(m.group(1).expandtabs(4))
                if tiefe < einzug:
                    break
                if tiefe > einzug:
                    unter, i = self._liste_ebene(zeilen, i, tiefe)
                    if posten:
                        posten[-1][1] += unter
                    else:
                        posten.append(["", unter])
                    continue
                posten.append([self._inline(m.group(3).strip()), ""])
                i += 1
                continue
            # Fortsetzungszeile der offenen Position (eingerueckt, keine neue Marke)
            if posten and self._einrueckung(zeilen[i]) > einzug and not self._blockanfang(zeilen, i):
                posten[-1][0] += " " + self._inline(zeilen[i].strip())
                i += 1
                continue
            break
        marke = "ol" if geordnet else "ul"
        innen = "".join(f"<li>{text}{unter}</li>" for text, unter in posten)
        return f"<{marke}>{innen}</{marke}>", i


# ------------------------------------------------------------------ Wohlgeformtheit

class Pruefer(HTMLParser):
    """Einfache Wohlgeformtheits-Pruefung: Tags paarweise, keine unbekannten Schliesser."""

    LEER = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stapel: list[tuple[str, int]] = []
        self.fehler: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag not in self.LEER:
            self.stapel.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in self.LEER:
            return
        if not self.stapel:
            self.fehler.append(f"Zeile {self.getpos()[0]}: </{tag}> ohne Anfang")
            return
        offen, zeile = self.stapel.pop()
        if offen != tag:
            self.fehler.append(f"Zeile {self.getpos()[0]}: </{tag}> schliesst <{offen}> aus Zeile {zeile}")

    def ergebnis(self) -> list[str]:
        for offen, zeile in self.stapel:
            self.fehler.append(f"<{offen}> aus Zeile {zeile} bleibt offen")
        return self.fehler


def wohlgeformt(html: str) -> list[str]:
    p = Pruefer()
    p.feed(html)
    p.close()
    return p.ergebnis()


# ------------------------------------------------------------------ CLI

BEISPIEL = """# Beispiel

Ein Absatz mit **fett**, *kursiv*, `code`, [Link](https://example.com) und < > &amp; Zeichen.

## Tabelle

| Frage | Antwort |
|---|---|
| `[[Start]]` | Wiki-Link |

> Ein Zitat
> ueber zwei Zeilen

- eins
- zwei
  - zwei-a

1. erster
2. zweiter

```js
const x = 1 < 2 && 3 > 2;
```

---

| links | mitte | rechts |
|:---|:---:|---:|
| a | b | c |
"""


def main() -> int:
    # Windows-Konsole schreibt sonst cp1252 und bricht an Emoji/Pfeilen ab (UnicodeEncodeError).
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8")
        except Exception:                                            # noqa: BLE001
            pass
    if "--beispiel" in sys.argv:
        k = Konverter()
        html = k.wandeln(BEISPIEL)
        print(html)
        fehler = wohlgeformt(html)
        print("\n-- Wohlgeformtheit:", "ok" if not fehler else fehler, file=sys.stderr)
        return 0 if not fehler else 1
    dateien = [a for a in sys.argv[1:] if not a.startswith("-")]
    if not dateien:
        print(__doc__)
        return 0
    from pathlib import Path
    for name in dateien:
        text = Path(name).read_text(encoding="utf-8")
        k = Konverter()
        html = k.wandeln(text)
        print(f"<!-- {name} -->")
        print(html)
        fehler = wohlgeformt(html)
        if fehler:
            print(f"\nROT: {name} nicht wohlgeformt:", file=sys.stderr)
            for f in fehler[:10]:
                print("  - " + f, file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
