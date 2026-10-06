"""Einzeldatei-Fassung bauen: web/index.html + Schriften -> EINE .html-Datei.

Warum: Die Browser-Fassung braucht heute einen Ordner neben sich (`schriften.css` +
`schriften/`). Fuer einen Download-Link im Netz ist ein Ordner eine Fehlerquelle —
wer nur `index.html` weiterreicht, bekommt ein Spiel ohne Schrift. Dieses Werkzeug
schreibt die Schriftdateien als Daten-URI direkt in die Seite. Ergebnis: eine Datei,
Doppelklick, fertig. Laedt nichts nach (kein Netzwerkaufruf).

Aufruf:
    python tools/einfach.py                    -> docs/index.html  (GitHub-Pages-Einstieg)
    python tools/einfach.py --ziel X.html      -> andere Zieldatei
    python tools/einfach.py --pruefen docs/index.html   -> nur pruefen, nichts schreiben

Voraussetzung: `python bauen.py` ist vorher gelaufen (web/index.html existiert).

Gemessen wird immer: Groesse, SHA256 und die Zahl der verbliebenen Aussenverweise.
Der Bau schlaegt fehl, wenn ein Aussenverweis uebrig bleibt — sonst waere die
Einzeldatei nur scheinbar eigenstaendig.
"""
import argparse
import base64
import hashlib
import mimetypes
import re
import subprocess
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
WEB = HIER / "web"
STANDARD_QUELLE = WEB / "index.html"
STANDARD_STIL = WEB / "schriften.css"
STANDARD_ZIEL = HIER / "docs" / "index.html"

# Verweise, die eine eigenstaendige Datei nicht haben darf.
VERBOTEN = [
    (re.compile(r"""<link[^>]+rel=["']?stylesheet""", re.I), "<link rel=stylesheet>"),
    (re.compile(r"""<script[^>]+\bsrc\s*=""", re.I), "<script src=...>"),
    (re.compile(r"""<img[^>]+\bsrc\s*=\s*["'](?!data:)""", re.I), "<img src=...> (nicht data:)"),
    (re.compile(r"""url\(\s*["']?(?!data:)[^)"']+\.(woff2?|ttf|otf|eot)""", re.I), "url(...) auf eine Schriftdatei"),
]


def daten_uri(pfad: Path) -> str:
    typ = mimetypes.guess_type(pfad.name)[0] or "application/octet-stream"
    return f"data:{typ};base64," + base64.b64encode(pfad.read_bytes()).decode("ascii")


def stil_einbetten(css: str, basis: Path) -> tuple[str, int]:
    """Ersetzt jedes url(...) in der CSS durch eine Daten-URI. Gibt (css, Anzahl) zurueck."""
    anzahl = 0

    def ersetzen(treffer: re.Match) -> str:
        nonlocal anzahl
        if treffer.group(1).startswith("data:"):
            return treffer.group(0)
        ziel = (basis / treffer.group(1)).resolve()
        if not ziel.is_file():
            raise SystemExit(f"FEHLER: Schriftdatei fehlt: {ziel}")
        anzahl += 1
        return f"url({daten_uri(ziel)})"

    return re.sub(r"""url\(\s*["']?([^)"']+?)["']?\s*\)""", ersetzen, css), anzahl


def aussenverweise(html: str) -> list[str]:
    fund = []
    for muster, name in VERBOTEN:
        for t in muster.finditer(html):
            ausschnitt = t.group(0).replace("\n", " ")[:100]
            fund.append(f"{name}: {ausschnitt}")
    return fund


def baue_web_falls_noetig() -> None:
    """Sorgt dafuer, dass web/index.html existiert.

    `web/` liegt nicht im Git (erzeugt). Auf einem frischen Klon — und damit in jeder
    Pruefung auf GitHub — fehlt `web/index.html`, und dieser Aufruf scheiterte dann mit
    „zuerst bauen.py laufen lassen" (gemessen 06.10.2026: der Release-Ablauf brach genau
    daran ab). Statt den Aufrufer zu ermahnen, wird hier gebaut: bauen.py ist schnell und
    schreibt nur nach web/.
    """
    if STANDARD_QUELLE.is_file():
        return
    bauen = HIER / "bauen.py"
    if not bauen.is_file():
        return
    print("web/index.html fehlt — baue zuerst (python bauen.py) …")
    r = subprocess.run([sys.executable, str(bauen)], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise SystemExit("FEHLER: bauen.py ist gescheitert:\n" + ((r.stdout or "") + (r.stderr or ""))[-500:])
    print("  " + (r.stdout or "").strip())


def bauen(quelle: Path, stil: Path, ziel: Path) -> int:
    baue_web_falls_noetig()
    if not quelle.is_file():
        raise SystemExit(f"FEHLER: {quelle} fehlt — zuerst `python bauen.py` laufen lassen.")
    if not stil.is_file():
        raise SystemExit(f"FEHLER: {stil} fehlt.")

    html = quelle.read_text(encoding="utf-8")
    css, schriften = stil_einbetten(stil.read_text(encoding="utf-8"), stil.parent)
    if schriften == 0:
        raise SystemExit(f"FEHLER: in {stil} steht kein einziges url(...) — falsche Datei?")

    # Zeilenenden auf LF: im Repositorium gilt LF (.gitattributes). Ohne das haette
    # docs/index.html 23.838 CRLF und wuerde von Git als „staendig geaendert" gefuehrt.
    html = html.replace("\r\n", "\n")
    css = css.replace("\r\n", "\n")

    # Die Verweiszeile auf die externe CSS durch die eingebettete CSS ersetzen.
    neu, n = re.subn(
        r"""\s*<link[^>]+href=["']schriften\.css["'][^>]*>""",
        "\n<style>\n" + css + "\n</style>",
        html,
        count=1,
    )
    if n != 1:
        raise SystemExit(
            "FEHLER: kein <link ... schriften.css> gefunden. Wurde die Seite anders gebaut?"
        )

    rest = aussenverweise(neu)
    if rest:
        raise SystemExit("FEHLER: Aussenverweise uebrig geblieben:\n  " + "\n  ".join(rest))

    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(neu, encoding="utf-8", newline="\n")

    roh = ziel.read_bytes()
    sha = hashlib.sha256(roh).hexdigest()
    print(f"Einzeldatei -> {ziel}")
    print(f"  Groesse    {len(roh):,} Bytes ({len(roh)/1024/1024:.2f} MB)")
    print(f"  Schriften  {schriften} als Daten-URI eingebettet")
    print(f"  SHA256     {sha}")
    print(f"  Aussenverweise  0  (geprueft: link/script/img/url)")
    return 0


def pruefen(ziel: Path) -> int:
    if not ziel.is_file():
        raise SystemExit(f"FEHLER: {ziel} fehlt.")
    html = ziel.read_text(encoding="utf-8")
    rest = aussenverweise(html)
    print(f"Pruefe {ziel}: {ziel.stat().st_size:,} Bytes, SHA256 {hashlib.sha256(ziel.read_bytes()).hexdigest()}")
    for name in ("fetch(", "XMLHttpRequest", "WebSocket"):
        if name in html:
            print(f"  HINWEIS: '{name}' kommt im Text vor — im Kontext pruefen (Konsole/Lehrtext?).")
    if rest:
        print("  ROT: Aussenverweise uebrig:")
        for r in rest:
            print("    " + r)
        return 1
    print("  GRUEN: keine Aussenverweise — die Datei ist eigenstaendig.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Einzeldatei-Fassung des Netzwerk-Labors bauen")
    ap.add_argument("--quelle", type=Path, default=STANDARD_QUELLE)
    ap.add_argument("--stil", type=Path, default=STANDARD_STIL)
    ap.add_argument("--ziel", type=Path, default=STANDARD_ZIEL)
    ap.add_argument("--pruefen", type=Path, nargs="?", const=STANDARD_ZIEL,
                    help="nur pruefen statt schreiben")
    a = ap.parse_args()
    if a.pruefen is not None:
        return pruefen(a.pruefen)
    return bauen(a.quelle, a.stil, a.ziel)


if __name__ == "__main__":
    sys.exit(main())
