"""Baut die Doku-Seiten des Netzwerk-Labors und prueft sie (`--pruefen`).

WARUM: Bis zum 07.10.2026 landeten auf GitHub Pages nur `docs/index.html` (das Spiel) und
`docs/bilder/` — die 29 Markdown-Dokumente waren im Repositorium, aber nicht ausgeliefert.
Dieses Werkzeug wandelt sie in eigenstaendige HTML-Seiten und legt sie an ZWEI Orte:

  * `docs/doku/…`   — versioniert, wie `docs/index.html` auch. So sieht man den ausgelieferten
                      Stand im Repositorium, und die CI muss nur noch kopieren (kurzer Deploy).
  * `_site/doku/…`  — das Verzeichnis, das der Pages-Ablauf hochlaedt.

Entscheidung „versionieren" (Begruendung, siehe Meldung): `docs/index.html` ist seit jeher
versioniert und wird bei jedem Push ohne Bau ausgeliefert. Ein zweites Erzeugnis in derselben
Schicht genauso zu behandeln ist die kleinste Ueberraschung: der Deploy bleibt ein `cp`, und
`git diff` zeigt jede Aenderung an der Doku-Seite. Gegenprobe, die dagegen spraeche: die
809 KB Erzeugnis waechst mit jedem Doku-Commit im Diff — bei 29 Dokumenten ist das vertretbar.

NUR PYTHON-STANDARBIBLIOTHEK. Kein `markdown`, kein pip (die Ubuntu-CI hat nichts davon).

Verweise (das Kernstueck):
  * `[[Wiki-Link]]` — die Doku liegt AUSSERHALB der Obsidian-Vault, die Klammerform loest sich
    also nicht von selbst auf. Hier wird ein Ziel nur verlinkt, wenn es eines der
    veroeffentlichten Dokumente ist; sonst erscheint der Text mit sichtbarem Hinweis
    (`<span class="dk-tot">`), aber KEIN toter Verweis.
  * Relative `.md`-Verweise werden auf `.html` umgeschrieben — mit denselben Regeln.

Aufruf:
  python tools/seite.py                 baut docs/doku/ und _site/doku/
  python tools/seite.py --pruefen       prueft das Erzeugnis, Exit 0/1 (baut NICHT)
  python tools/seite.py --nur-pruefen-dateien   zeigt nur die gefundenen Dokumente
"""
from __future__ import annotations

import html as html_mod
import shutil
import sys
from pathlib import Path
from urllib.parse import quote, unquote

sys.path.insert(0, str(Path(__file__).resolve().parent))
import md                                                        # noqa: E402  (eigener Baustein)

HIER = Path(__file__).resolve().parent.parent
SPIEL_URL = "https://vexx-oss.github.io/NetLab/"                 # der einzige Aussenverweis
DOKU_ORDNER = "doku"
STANDARD_QUELLEN = ("README.md", "AGENTS.md")                    # aus dem Wurzelverzeichnis (in dieser Reihenfolge)
BILDER = "bilder"                                                # docs/bilder/ wird mitkopiert (wie bisher)

GRUPPEN = [
    ("Einstieg", lambda rel: rel in ("README.md", "docs/Liesmich.md", "docs/INHALT.md")),
    ("Betrieb", lambda rel: rel in ("AGENTS.md", "docs/Architektur.md", "docs/Bauen.md",
                                    "docs/Mitmachen.md", "docs/SITZUNGSABSCHLUSS.md", "docs/CHANGELOG.md")),
    ("Review", lambda rel: Path(rel).name.startswith("Review – ")),
    ("Entwicklung", lambda rel: True),
]

# Je Dokument eine Zeile, was drinsteht. Was hier fehlt, bekommt den ersten Satz des Dokuments.
BESCHREIBUNG = {
    "README.md": "Was das Spiel ist, wie man es startet und was es kann.",
    "AGENTS.md": "Betriebsregeln fuer Mitarbeit und Modelle: Verbote, Befehle, Zeilenenden, Ablage.",
    "docs/Liesmich.md": "Uebersicht fuer Leser in Kurzform.",
    "docs/INHALT.md": "Die Notizen dieses Projekts — was gilt, was geschehen ist.",
    "docs/Architektur.md": "Der Vertrag zwischen den Bausteinen: Datenformen, Verhalten, Gruende, Trace-Format.",
    "docs/Bauen.md": "Bauen, Testen, Messen, Ausliefern im Detail — samt der gemessenen Fallen.",
    "docs/Mitmachen.md": "Arbeitsweise und Regeln fuer Beitraege.",
    "docs/SITZUNGSABSCHLUSS.md": "Die acht Schritte am Ende einer Sitzung, mit den Regeln aus Fehlern.",
    "docs/CHANGELOG.md": "Was sich wann geaendert hat — aus der echten Commit-Historie.",
    "docs/bilder/HERKUNFT.md": "Herkunft und Lizenz der Bilder in diesem Ordner.",
    "docs/entwicklung/Design – Spielspaß 2.0.md": "Die grosse Design-Notiz: Befunde, Hebel, Messwerte, verworfene Versuche.",
    "docs/entwicklung/Plan – Ausbau 1.2.md": "Phasen, Stand und Messwerte des Ausbaus 1.2.",
    "docs/entwicklung/Konzept – Netzwerk-Labor.md": "Die Spezifikation des Spiels.",
    "docs/entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md": "Konzept fuer den Einsatz im Unterricht und in der Ausbildung.",
    "docs/entwicklung/Befund – Programm startet wieder.md": "Der Befund zum Integritaetslabel, das die .exe blockierte — samt Reparaturweg.",
    "docs/entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md": "Vertrag fuer die naechste Stufe: ein Code, derselbe Auftrag auf jedem Geraet.",
    "docs/entwicklung/Klassenraum/Liesmich.md": "Einstieg in die vier Teil-Dokumente des Klassenraum-Vertrags.",
    "docs/entwicklung/Opus-Auftrag – Netzwerk-Labor.md": "Der urspruengliche Auftrag, aus dem das Projekt entstand.",
    "docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md": "Der Vertrag der stufenweisen Hilfestellung: Bildungsstand, Vorrat, Schnittstellen.",
}

# ------------------------------------------------------------------ Verweis-Aufloesung


class Verweise:
    """Loest Ziele innerhalb des veroeffentlichten Dokumentensatzes auf — oder sagt, warum nicht.

    Aufloesungsreihenfolge (deterministisch, ohne Ratem):
      1. genauer Pfad ab Projektwurzel (`docs/entwicklung/Plan – Ausbau 1.2.md`)
      2. Pfad-Endung (`entwicklung/Plan – Ausbau 1.2.md`, `Klassenraum/A – ….md`) oder Name mit
         angehaengtem `.md` — so loesen sich Obsidian-Kurzformen wie `[[Architektur]]` auf
      3. Dateiname ohne Ordner (`A – Codec und Determinismus.md`) — bei mehreren Treffern
         entscheidet der kuerzeste Pfad, danach die alphabetische Reihenfolge.
      4. relativer Pfad, aufgeloest aus dem Ordner der QUELLDATEI (fuer die Vault-Pfade
         `10-Projekte/Lernprojekte/Netzwerk-Labor/Architektur`: von `docs/entwicklung/` aus
         zeigen die vier Ebenen hoch, und der Rest ist der Pfad im Repositorium).
    """

    def __init__(self, dokumente: list["Dokument"]):
        self.dokumente = dokumente
        self.nach_rel = {d.rel: d for d in dokumente}
        self.nach_name: dict[str, list["Dokument"]] = {}
        for d in dokumente:
            self.nach_name.setdefault(d.name, []).append(d)
        self.geloest = 0
        self.offen: list[tuple[str, str, str]] = []              # (von, ziel, grund)
        self.aktuell = ""
        self.quellordner = ""

    # ---- Ziele finden
    def finden(self, ziel: str) -> "Dokument | None":
        ziel = ziel.strip().replace("\\", "/")
        while ziel.startswith("./"):
            ziel = ziel[2:]
        if ziel in self.nach_rel:
            return self.nach_rel[ziel]
        # Pfad-Endung oder Kurzform ohne .md: "entwicklung/X", "Klassenraum/A", "Architektur"
        kandidaten = [d for d in self.dokumente
                      if d.rel.endswith("/" + ziel) or d.rel == ziel
                      or d.rel.endswith("/" + ziel + ".md") or d.rel == ziel + ".md"]
        if not kandidaten:
            kandidaten = self.nach_name.get(Path(ziel).name, []) or self.nach_name.get(Path(ziel).name + ".md", [])
        if not kandidaten and self.quellordner:
            # Vault-Pfad: relativ zum Ordner der Quelldatei aufloesen
            versuch = ziel
            while versuch.startswith("../"):
                versuch = versuch[3:]
            kandidaten = [d for d in self.dokumente if d.rel.endswith("/" + versuch) or d.rel == versuch
                          or d.rel.endswith("/" + versuch + ".md") or d.rel == versuch + ".md"]
        if not kandidaten:
            return None
        return sorted(kandidaten, key=lambda d: (len(d.rel), d.rel))[0]

    def grund(self, ziel: str) -> str:
        return f"„{ziel}“ gehört nicht zu den veröffentlichten Dokumenten — kein Verweis, nur Text."

    def _merken(self, ziel: str, ok: bool) -> None:
        if ok:
            self.geloest += 1
        else:
            self.offen.append((self.aktuell, ziel, self.grund(ziel)))

    # ---- die Aufrufe des Konverters
    def _bild_ziel(self, roh: str) -> str | None:
        """Ein Bild, das wirklich mit ausgeliefert wird (docs/bilder/). Sonst None."""
        rel = roh.replace("\\", "/").strip()
        kandidaten = [
            (HIER / "docs" / rel),                                  # "bilder/topologie.jpg" (so nennt es README.md)
            (HIER / rel),                                           # "docs/bilder/topologie.jpg"
            (HIER / self.quellordner / rel),                        # relativ zur Quelldatei
            (HIER / self.quellordner / Path(rel).name),             # nur der Dateiname
            (HIER / "docs" / BILDER / Path(rel).name),
        ]
        for kandidat in kandidaten:
            try:
                kandidat = kandidat.resolve()
            except OSError:
                continue
            if kandidat.is_file() and BILDER in kandidat.parts:
                rest = kandidat.relative_to(HIER / "docs").as_posix()      # "bilder/topologie.jpg"
                hoch = "../" * (self.aktuell.count("/") + 1)               # von doku/<ordner>/… nach docs/
                return hoch + "/".join(quote(t, safe="-_.~") for t in rest.split("/"))
        return None

    def aufloesen(self, ziel: str) -> str | None:
        """Relative Verweise einer Doku-Seite: .md-Ziele, Bilder, Anker, fremde Ziele."""
        ohne_anker, _, anker = ziel.partition("#")
        anker_teil = ("#" + quote(unquote(anker.strip()), safe="-_.~")) if anker else ""
        if ohne_anker.startswith(("http://", "https://", "mailto:", "tel:")) or ohne_anker == "":
            return ziel
        if ohne_anker.endswith(".md"):
            d = self.finden(ohne_anker)
            if d is None:
                self._merken(ohne_anker, False)
                return None
            self._merken(ohne_anker, True)
            return d.href_pfad(self.aktuell) + anker_teil
        bild = self._bild_ziel(ohne_anker)
        if bild:
            self._merken(ohne_anker, True)
            return bild + anker_teil
        self._merken(ohne_anker, False)
        return None

    def bild(self, ziel: str) -> str | None:
        ziel = ziel.strip()
        if ziel.startswith(("http://", "https://", "data:")):
            return ziel
        # Die Quelle nennt Bilder relativ zu IHREM Ordner (docs/…), nicht zum Erzeugnis.
        treffer = self._bild_ziel(ziel)
        if treffer:
            self._merken(ziel, True)
            return treffer
        self._merken(ziel, False)
        return None

    def wiki(self, ziel: str, anker: str | None = None) -> str | None:
        """[[Ziel]] — Ziel relativ zur Vault-Wurzel. Nur verlinken, wenn veroeffentlicht."""
        ziel = ziel.strip()
        if not ziel:
            return None
        d = self.finden(ziel)
        if d is not None:
            self._merken(ziel, True)
            return d.href_pfad(self.aktuell) + (("#" + quote(unquote(anker.strip()), safe="-_.~")) if anker else "")
        # Ein Bild in Wiki-Form (Obsidian-Einbettung): als Bild ausliefern, wenn vorhanden
        bild = self._bild_ziel(ziel)
        if bild:
            self._merken(ziel, True)
            return bild
        self._merken(ziel, False)
        return None


# ------------------------------------------------------------------ Dokument


class Dokument:
    """Ein Markdown-Dokument und seine Ausgabeseite."""

    def __init__(self, pfad: Path, rel: str):
        self.pfad = pfad
        self.rel = rel                                        # z. B. "docs/Architektur.md"
        self.name = pfad.name
        self.aus_rel = self._ausgabe_rel()
        self.titel = ""
        self.beschreibung = ""
        self.gruppe = ""
        self.koerper = ""
        self.ueberschriften: list[dict] = []
        self.verweise: list[str] = []

    def _ausgabe_rel(self) -> str:
        """Ausgabepfad innerhalb von `doku/` — die Ordnernamen der Quelle bleiben erkennbar."""
        if self.rel in STANDARD_QUELLEN:
            return self.rel[:-3] + ".html"
        rest = self.rel[len("docs/"):] if self.rel.startswith("docs/") else self.rel
        return rest[:-3] + ".html"

    @property
    def tiefe(self) -> int:
        """Wie tief liegt die Ausgabeseite unter `doku/` (fuer relative Verweise)."""
        return self.aus_rel.count("/")

    def href_pfad(self, von_rel: str) -> str:
        """Relativer Verweis von einer anderen Doku-Seite auf diese."""
        hoch = "../" * von_rel.count("/")
        return hoch + quote(self.aus_rel, safe="/-_.~")

    def hoch(self) -> str:
        """Der Weg von dieser Seite zurueck nach `doku/` (fuer Bilder unter docs/bilder/)."""
        return "../" * self.tiefe

    def datei(self, basis: Path) -> Path:
        return basis / DOKU_ORDNER / Path(self.aus_rel)


# ------------------------------------------------------------------ Seitenhuelle

STIL = """
:root{--bg:#ffffff;--panel:#f5f7fa;--linie:#d7dde5;--text:#16202c;--leise:#5b6b7d;--akzent:#0b6ea8;--code:#eef2f7}
@media (prefers-color-scheme:dark){:root{--bg:#111823;--panel:#18212e;--linie:#2b3949;--text:#e6ecf5;--leise:#9fb0c4;--akzent:#63b8e8;--code:#1d2735}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--akzent)}
.dk-kopf,.dk-fuss{display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:12px 20px;background:var(--panel);border-bottom:1px solid var(--linie)}
.dk-fuss{border-bottom:0;border-top:1px solid var(--linie);color:var(--leise);font-size:14px;margin-top:32px}
.dk-marke{font-weight:700;text-decoration:none;color:var(--text)}
.dk-kopf a,.dk-fuss a{text-decoration:none}
.dk-kopf a:hover,.dk-fuss a:hover{text-decoration:underline}
.dk-innen{max-width:60rem;margin:0 auto;padding:24px 20px 0}
.dk-toc{background:var(--panel);border:1px solid var(--linie);border-radius:10px;padding:12px 16px;margin:0 0 24px}
.dk-toc p{margin:0 0 8px;font-weight:700;font-size:14px;color:var(--leise)}
.dk-toc ul{margin:0;padding-left:20px}
.dk-toc li{margin:2px 0}
.dk-toc a{text-decoration:none}
.dk-toc a:hover{text-decoration:underline}
h1,h2,h3,h4,h5,h6{line-height:1.25;margin:24px 0 8px}
h1{margin-top:0;font-size:30px}
h2{font-size:24px;border-bottom:1px solid var(--linie);padding-bottom:6px}
h3{font-size:19px}
h4,h5,h6{font-size:16px}
p{margin:0 0 12px}
ul,ol{margin:0 0 12px;padding-left:24px}
li{margin:4px 0}
code{background:var(--code);border-radius:4px;padding:1px 5px;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
pre{background:var(--code);border:1px solid var(--linie);border-radius:10px;padding:12px;overflow-x:auto}
pre code{background:none;padding:0;font-size:14px}
blockquote{margin:0 0 12px;padding:4px 16px;border-left:4px solid var(--akzent);background:var(--panel);border-radius:0 10px 10px 0}
blockquote p:last-child{margin-bottom:0}
hr{border:0;border-top:1px solid var(--linie);margin:24px 0}
.dk-tabelle{overflow-x:auto;margin:0 0 16px}
table{border-collapse:collapse;width:100%;font-size:15px}
th,td{border:1px solid var(--linie);padding:8px 12px;text-align:left;vertical-align:top}
th{background:var(--panel)}
img{max-width:100%;height:auto}
.dk-tot{border-bottom:1px dotted var(--leise);color:var(--leise);cursor:help}
.dk-liste{display:grid;gap:12px;margin:16px 0 24px;padding:0;list-style:none}
.dk-liste li{margin:0}
.dk-karte{display:block;border:1px solid var(--linie);border-radius:10px;padding:12px 16px;background:var(--panel);text-decoration:none;color:var(--text)}
.dk-karte:hover{border-color:var(--akzent)}
.dk-karte b{display:block;margin-bottom:4px}
.dk-karte span{color:var(--leise);font-size:14px}
.dk-hinweis{color:var(--leise);font-size:14px}
""".strip()


def kopf(titel: str, tiefe: int, uebersicht: bool) -> str:
    """Kopfleiste. `tiefe` = Anzahl der Ordner unterhalb von doku/ (0 = Uebersicht).

    Von jeder Seite muss der Weg zur Uebersicht UND der Weg zum Spiel stimmen:
      docs/doku/X.html              -> Uebersicht "index.html",  Spiel "../index.html"
      docs/doku/entwicklung/X.html  -> Uebersicht "../index.html", Spiel "../../index.html"
    """
    hoch = "../" * tiefe
    um = "index.html" if uebersicht else hoch + "index.html"
    spiel = hoch + "../index.html"
    return f"""<header class="dk-kopf">
<a class="dk-marke" href="{um}">Netzwerk-Labor · Doku</a>
<span class="dk-hinweis">{html_mod.escape(titel)}</span>
<a href="{spiel}">Zum Spiel</a>
<a href="{SPIEL_URL}">Online</a>
</header>"""


def fuss(tiefe: int, uebersicht: bool) -> str:
    hoch = "../" * tiefe
    um = "index.html" if uebersicht else hoch + "index.html"
    spiel = hoch + "../index.html"
    return f"""<footer class="dk-fuss">
<span>Netzwerk-Labor · Doku aus dem Repositorium erzeugt (<code>tools/seite.py</code>)</span>
<a href="{um}">Übersicht</a>
<a href="{spiel}">Zum Spiel</a>
</footer>"""


def seite(titel: str, tiefe: int, inhalt: str, uebersicht: bool = False, beschreibung: str = "") -> str:
    beschreibung_html = f'<meta name="description" content="{html_mod.escape(beschreibung, quote=True)}">' if beschreibung else ""
    return f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html_mod.escape(titel)} · Netzwerk-Labor</title>
{beschreibung_html}
<style>
{STIL}
</style>
</head>
<body>
{kopf(titel, tiefe, uebersicht)}
<main class="dk-innen">
{inhalt}
</main>
{fuss(tiefe, uebersicht)}
</body>
</html>
"""


# ------------------------------------------------------------------ Erzeugung

def quellen() -> list[Path]:
    """Alle zu veroeffentlichenden Markdown-Dateien, sortiert (deterministisch)."""
    dateien = [HIER / n for n in STANDARD_QUELLEN if (HIER / n).is_file()]
    dateien += sorted(p for p in (HIER / "docs").rglob("*.md") if p.is_file())
    # doppelte Eintraege (falls eine Wurzeldatei auch unter docs/ liegt) entfernen
    gesehen, aus = set(), []
    for p in dateien:
        if p not in gesehen:
            gesehen.add(p)
            aus.append(p)
    return aus


def beschreibung_von(text: str) -> str:
    """Erster Satz des Dokuments als Beschreibung (ohne Ueberschrift und Leerzeilen)."""
    for zeile in text.split("\n"):
        z = zeile.strip()
        if not z or z.startswith("#") or z.startswith("|") or z.startswith(">") or z.startswith("```"):
            continue
        z = md.text_von(md.Konverter().inline(z))
        z = z.replace("**", "").replace("`", "")
        treffer = z.split(". ")
        satz = treffer[0].strip()
        if len(satz) > 160:
            satz = satz[:157].rstrip() + "…"
        return satz if satz.endswith(".") else satz + "."
    return ""


def gruppe_von(rel: str) -> str:
    for name, passt in GRUPPEN:
        if passt(rel):
            return name
    return "Entwicklung"


def sammeln() -> tuple[list[Dokument], Verweise]:
    dokumente = []
    for pfad in quellen():
        rel = pfad.relative_to(HIER).as_posix()
        d = Dokument(pfad, rel)
        d.gruppe = gruppe_von(rel)
        text = pfad.read_text(encoding="utf-8")
        k = md.Konverter(links=None)                    # nur fuer Titel/Beschreibung
        for zeile in text.split("\n"):
            m = md.re.match(r"^#\s+(.*)$", zeile)
            if m:
                d.titel = md.text_von(k.inline(m.group(1).strip()))
                break
        if not d.titel:
            d.titel = pfad.stem
        d.beschreibung = BESCHREIBUNG.get(rel) or beschreibung_von(text)
        dokumente.append(d)
    return dokumente, Verweise(dokumente)


def baue_dokument(d: Dokument, verweise: Verweise) -> str:
    text = d.pfad.read_text(encoding="utf-8")
    verweise.aktuell = d.aus_rel
    verweise.quellordner = d.pfad.parent.relative_to(HIER).as_posix()      # z. B. "docs/entwicklung"
    k = md.Konverter(links=verweise)
    d.koerper = k.wandeln(text)
    d.ueberschriften = [h for h in k.ueberschriften]
    # Inhaltsverzeichnis aus den Ueberschriften (ab h2 — h1 ist der Titel)
    toc_zeilen = []
    for h in k.ueberschriften:
        if h["stufe"] < 2 or h["stufe"] > 3:
            continue
        einzug = " style=\"margin-left:16px\"" if h["stufe"] == 3 else ""
        toc_zeilen.append(f'<li{einzug}><a href="#{h["id"]}">{md.esc(h["text"])}</a></li>')
    toc = ""
    if len(toc_zeilen) >= 2:
        toc = ('<nav class="dk-toc" aria-label="Inhalt">\n<p>Inhalt</p>\n<ul>\n'
               + "\n".join(toc_zeilen) + "\n</ul>\n</nav>")
    inhalt = toc + d.koerper
    return seite(d.titel, d.tiefe, inhalt, beschreibung=d.beschreibung)


def uebersicht(dokumente: list[Dokument]) -> str:
    """Die Uebersichtsseite: gruppiert, mit einer Zeile je Dokument. Zahlen werden gezaehlt."""
    teile = [
        "<h1>Dokumentation</h1>",
        f'<p class="dk-hinweis">{len(dokumente)} Dokumente, aus dem Repositorium erzeugt — '
        f'dieselben Dateien, die im Ordner <code>docs/</code> liegen (plus <code>README.md</code> und '
        f'<code>AGENTS.md</code>). Nichts hiervon wird von Hand gepflegt.</p>',
    ]
    for name, _ in GRUPPEN:
        gruppe = [d for d in dokumente if d.gruppe == name]
        if not gruppe:
            continue
        teile.append(f"<h2>{md.esc(name)}</h2>")
        teile.append('<ul class="dk-liste">')
        for d in sorted(gruppe, key=lambda x: x.aus_rel):
            teile.append(
                f'<li><a class="dk-karte" href="{quote(d.aus_rel, safe="/-_.~")}">'
                f'<b>{md.esc(d.titel)}</b><span>{md.esc(d.beschreibung)}</span></a></li>')
        teile.append("</ul>")
    return seite("Dokumentation", 0, "\n".join(teile), uebersicht=True,
                 beschreibung="Alle Dokumente des Netzwerk-Labors auf einer Seite.")


def ziele() -> list[Path]:
    """Wohin gebaut wird: versioniert (docs/doku) und fuer die Auslieferung (_site/doku)."""
    return [HIER / "docs", HIER / "_site"]


def _ausliefern(ziel: Path) -> None:
    """Das Spiel selbst mit in den Auslieferungsordner stellen.

    Die Seiten verweisen mit `../index.html` auf das Spiel und mit `../bilder/…` auf die Bilder.
    Fuer `docs/doku/` gibt es beides schon (`docs/index.html`, `docs/bilder/`). Fuer `_site/`
    wird es hierher kopiert — genau das, was `.github/workflows/seite.yml` bisher allein tat.

    `docs/bilder/HERKUNFT.md` wird NICHT mitkopiert: die Datei steht als eigenes Dokument in der
    Doku, als rohes Markdown neben den Bildern waere sie im Netz nur Ballast (und der Ablauf hat
    sie bisher auch nicht ausgeliefert).
    """
    if ziel.name != "_site":
        return
    quelle = HIER / "docs" / "index.html"
    if quelle.is_file():
        shutil.copyfile(quelle, ziel / "index.html")
    bilder = HIER / "docs" / BILDER
    if bilder.is_dir():
        zielbilder = ziel / BILDER
        if zielbilder.exists():
            shutil.rmtree(zielbilder)
        zielbilder.mkdir(parents=True, exist_ok=True)
        for datei in sorted(bilder.iterdir()):
            if datei.is_file() and datei.suffix.lower() != ".md":
                shutil.copyfile(datei, zielbilder / datei.name)


def bauen(leise: bool = False) -> int:
    dokumente, verweise = sammeln()
    seiten = [(d, baue_dokument(d, verweise)) for d in dokumente]
    uebersicht_html = uebersicht(dokumente)
    for ziel in ziele():
        basis = ziel / DOKU_ORDNER
        if basis.exists():
            shutil.rmtree(basis)
        basis.mkdir(parents=True, exist_ok=True)
        for d, html in seiten:
            datei = d.datei(ziel)
            datei.parent.mkdir(parents=True, exist_ok=True)
            datei.write_text(html, encoding="utf-8", newline="\n")
        (basis / "index.html").write_text(uebersicht_html, encoding="utf-8", newline="\n")
        _ausliefern(ziel)
    if not leise:
        print(f"Doku gebaut: {len(dokumente)} Dokumente -> docs/doku/ und _site/doku/")
        print(f"  Verweise aufgeloest: {verweise.geloest}")
        if verweise.offen:
            print(f"  nicht aufloesbar (als Text mit Hinweis, kein toter Verweis): {len(verweise.offen)}")
            for von, ziel, _ in verweise.offen[:8]:
                print(f"    {von}: [[{ziel}]]" if not ziel.endswith(".md") else f"    {von}: {ziel}")
            if len(verweise.offen) > 8:
                print(f"    … und {len(verweise.offen) - 8} weitere")
    return 0


# ------------------------------------------------------------------ Pruefung

def pruefen() -> int:
    """Prueft das Erzeugnis ehrlich: Dateien vollstaendig, keine Reste, Wohlgeformtheit."""
    fehler: list[str] = []
    dokumente, _ = sammeln()
    erwartet = {d.aus_rel for d in dokumente}

    if not dokumente:
        print("ROT: keine Dokumente gefunden")
        return 1

    for ziel in ziele():
        basis = ziel / DOKU_ORDNER
        if not basis.is_dir():
            fehler.append(f"{basis.relative_to(HIER).as_posix()}/ fehlt (nicht gebaut?)")
            continue
        gefunden = sorted(p.relative_to(basis).as_posix() for p in basis.rglob("*.html"))
        if (basis / "index.html").is_file():
            gefunden.remove("index.html")
        fehlend = sorted(erwartet - set(gefunden))
        doppelt = sorted({n for n in gefunden if gefunden.count(n) > 1})
        ueberzaehlig = sorted(set(gefunden) - erwartet)
        if fehlend:
            fehler.append(f"{basis.relative_to(HIER).as_posix()}/: {len(fehlend)} Dokument(e) fehlen: {fehlend[:4]}")
        if doppelt:
            fehler.append(f"{basis.relative_to(HIER).as_posix()}/: doppelt erzeugt: {doppelt[:4]}")
        if ueberzaehlig:
            fehler.append(f"{basis.relative_to(HIER).as_posix()}/: {len(ueberzaehlig)} unerwartete Datei(en): {ueberzaehlig[:4]}")

        for name in ["index.html"] + sorted(erwartet & set(gefunden)):
            datei = basis / name
            text = datei.read_text(encoding="utf-8")
            wo = f"{datei.relative_to(HIER).as_posix()}"
            # Text ohne Code-Stellen und ohne Verweisziele: nur hier darf KEINE Wiki-Klammer mehr
            # stehen. In <code>…</code> und <pre>…</pre> sind Beispiele aus dem Quelltext richtig —
            # ebenso ein absichtlich unvollstaendiges Beispiel wie „[[…]]“ in docs/INHALT.md.
            ohne_code = md.re.sub(r"<pre>.*?</pre>|<code>.*?</code>", " ", text, flags=md.re.S)
            ohne_ziele = md.re.sub(r'="[^"]*"', '=""', ohne_code)
            if "[[" in ohne_ziele or "]]" in ohne_ziele:
                fehler.append(f"{wo}: „[[“ oder „]]“ steht als Fließtext im Erzeugnis")
            if md.re.search(r"\]\([^)]*\.md(?:[)#]|$)", text):
                fehler.append(f"{wo}: ein .md-Verweis steht noch im Erzeugnis")
            if "../index.html" not in text and "../../index.html" not in text:
                fehler.append(f"{wo}: der Weg zum Spiel (../index.html) fehlt")
            if name != "index.html":
                if "<h1" not in text:
                    fehler.append(f"{wo}: keine <h1>")
                if 'class="dk-fuss"' not in text:
                    fehler.append(f"{wo}: keine Fussleiste")
            for f in md.wohlgeformt(text):
                fehler.append(f"{wo}: HTML nicht wohlgeformt — {f}")
            # tote Verweise: jeder relative href muss auf eine erzeugte Datei zeigen
            for m in md.re.finditer(r'(?:href|src)="([^"]+)"', text):
                ziel_roh = m.group(1)
                if ziel_roh.startswith(("http://", "https://", "mailto:", "#", "data:")):
                    continue
                pfad = unquote(ziel_roh.split("#")[0])
                if not pfad:
                    continue
                ziel_datei = (datei.parent / pfad).resolve()
                if not ziel_datei.is_file():
                    fehler.append(f"{wo}: Verweis ins Leere — {ziel_roh}")

    print("Doku-Seite pruefen")
    print(f"  Dokumente in der Quelle: {len(dokumente)}")
    for ziel in ziele():
        basis = ziel / DOKU_ORDNER
        anzahl = len(list(basis.rglob("*.html"))) if basis.is_dir() else 0
        print(f"  {basis.relative_to(HIER).as_posix()}/: {anzahl} HTML-Dateien (inkl. Uebersicht)")
    print()
    if fehler:
        print(f"ROT: {len(fehler)} Befund(e)")
        for f in fehler[:40]:
            print("  - " + f)
        if len(fehler) > 40:
            print(f"  … und {len(fehler) - 40} weitere")
        return 1
    print(f"GRUEN: {len(dokumente)} Dokumente erzeugt, kein „[[“, kein .md-Verweis, keine toten Verweise, "
          f"jede Seite mit <h1> und Fussleiste, HTML wohlgeformt.")
    return 0


def main() -> int:
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8")
        except Exception:                                        # noqa: BLE001
            pass
    if "--pruefen" in sys.argv:
        return pruefen()
    if "--nur-pruefen-dateien" in sys.argv:
        for d in sammeln()[0]:
            print(f"{d.rel}  ->  doku/{d.aus_rel}  [{d.gruppe}]")
        return 0
    return bauen()


if __name__ == "__main__":
    sys.exit(main())
