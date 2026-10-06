"""Aufräumen: die langen Notizen aus dem Wurzelverzeichnis nach docs/ ziehen.

Warum: Ein Besucher sieht am Repositoriumsanfang zuerst elf lange Notizen (Architektur 73 KB,
Design 168 KB) und eine 2,2-MB-Spieledatei. Was ein Klon wirklich braucht, steht in README,
LICENSE, bauen.py und den Ordnern src/ tests/ tools/ android/ shell/ schriften/ Vorlagen/.

Was dieses Skript tut (idempotent gedacht, aber für EINEN Lauf gebaut):
  1. `git mv` — die Versionsgeschichte bleibt erhalten.
  2. Alle relativen Markdown-Verweise in den bewegten Dateien und in den Dateien, die auf sie
     zeigen, werden neu geschrieben (%20 bleibt kodiert; Namen mit Gedankenstrich kommen in
     spitze Klammern, weil GitHub sie sonst nicht auflöst).
  3. Danach wird JEDER relative Verweis in JEDER Markdown-Datei geprüft: existiert das Ziel?
     Das Skript endet rot, wenn ein Verweis ins Leere zeigt.

NICHT angefasst: docs/index.html und docs/bilder/ — die gehen zu GitHub Pages (seite.yml
stellt genau diese beiden zusammen). Der Ablauf bleibt unverändert.
"""
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parents[1]

# Wo die Dateien liegen sollen. Schlüssel = Pfad vorher (Wurzel), Wert = Pfad nachher.
UMZUG = {
    # für Leser des Projekts
    "Liesmich.md": "docs/Liesmich.md",
    "Mitmachen.md": "docs/Mitmachen.md",
    "Bauen.md": "docs/Bauen.md",
    "Architektur.md": "docs/Architektur.md",
    "CHANGELOG.md": "docs/CHANGELOG.md",
    # Entwicklungsnotizen (Verlauf, Pläne, Konzepte, Befunde)
    "Design – Spielspaß 2.0.md": "docs/entwicklung/Design – Spielspaß 2.0.md",
    "Plan – Ausbau 1.2.md": "docs/entwicklung/Plan – Ausbau 1.2.md",
    "Konzept – Netzwerk-Labor.md": "docs/entwicklung/Konzept – Netzwerk-Labor.md",
    "Konzept – Lernplattform für Betriebe und Schulen.md": "docs/entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md",
    "Befund – Programm startet wieder.md": "docs/entwicklung/Befund – Programm startet wieder.md",
    "Opus-Auftrag – Netzwerk-Labor.md": "docs/entwicklung/Opus-Auftrag – Netzwerk-Labor.md",
}

WURZEL_ALT = {alt: neu for alt, neu in UMZUG.items()}


def git(*args: str) -> str:
    r = subprocess.run(["git"] + list(args), cwd=str(HIER), capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise SystemExit(f"git {' '.join(args)} ist gescheitert: {r.stderr.strip()}")
    return r.stdout


def verschieben():
    for alt, neu in UMZUG.items():
        if not (HIER / alt).is_file():
            print(f"  (schon weg: {alt})")
            continue
        (HIER / Path(neu).parent).mkdir(parents=True, exist_ok=True)
        git("mv", alt, neu)
        print(f"  {alt}  ->  {neu}")


def ziel_link(quelle: Path, ziel: str) -> str:
    """Relativen Link von `quelle` (Ordner) auf das Wurzelziel `ziel` bauen."""
    rel = Path(ziel)
    tiefe = len(quelle.parts)
    if tiefe:
        rel = Path(*([".."] * tiefe)) / rel
    text = rel.as_posix()
    # Namen mit Gedankenstrich in spitze Klammern: sonst bricht Markdown die Adresse ab.
    if any(z in text for z in ("–", "—", " ")):
        return f"<{text}>"
    return text


def verweise_neu_schreiben():
    """Alle Markdown-Dateien durchgehen und Verweise auf die bewegten Dateien anpassen."""
    dateien = [Path(p) for p in git("ls-files", "*.md").splitlines() if p.strip()]
    geaendert = 0
    for datei in dateien:
        voll = HIER / datei
        if not voll.is_file():
            continue
        try:
            text = voll.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        ordner = datei.parent
        alt_text = text

        for alt, neu in UMZUG.items():
            neu_link = ziel_link(ordner, neu)
            formen = {alt, alt.replace(" ", "%20"), alt.replace("–", "%E2%80%93"),
                      alt.replace(" ", "%20").replace("–", "%E2%80%93")}
            for form in formen:
                for muster in (f"](<{form}>)", f"]({form})"):
                    if muster in text and datei.as_posix() != neu:
                        text = text.replace(muster, f"]({neu_link})")

        # Doppelte spitze Klammern könnten aus zwei Durchläufen entstehen — glätten.
        text = text.replace("](<<", "](<").replace(">>)", ">)")
        if text != alt_text:
            voll.write_text(text, encoding="utf-8", newline="")
            geaendert += 1
            print(f"  Verweise angepasst: {datei}")
    return geaendert


def pruefe_verweise() -> int:
    """Jeder relative Markdown-Verweis muss auf eine vorhandene Datei zeigen."""
    fehler = 0
    dateien = [p for p in git("ls-files", "*.md").splitlines() if p.strip()]
    for p in dateien:
        datei = HIER / p
        if not datei.is_file():
            continue
        text = datei.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r"\]\((<[^>]*>|[^)\s]+)\)", text):
            ziel = m.group(1).strip("<>")
            if ziel.startswith(("http://", "https://", "#", "mailto:")):
                continue
            ziel = unquote(ziel.split("#")[0])
            if not ziel:
                continue
            voll = (datei.parent / ziel).resolve()
            if not voll.exists() and not ziel.startswith(("dsh:", "C:")):
                zeile = text[: m.start()].count("\n") + 1
                print(f"  ✗ {p}:{zeile} zeigt ins Leere -> {ziel}")
                fehler += 1
    return fehler


if __name__ == "__main__":
    print("1) Verschieben")
    verschieben()
    print("\n2) Verweise neu schreiben")
    n = verweise_neu_schreiben()
    print(f"   {n} Datei(en) angepasst")
    print("\n3) Verweise prüfen")
    f = pruefe_verweise()
    print(f"\n{'GRÜN: alle relativen Verweise zeigen auf vorhandene Dateien' if not f else f'ROT: {f} tote(r) Verweis(e)'}")
    raise SystemExit(1 if f else 0)
