"""Bilder fuer die Dokumentation aus Nachweise/ auswaehlen, verkleinern, benennen.

Warum ein eigenes Werkzeug statt "Bild rueberkopieren": Die Bilder in `Nachweise/` sind
Beweismittel der Abnahmen (141 Stueck, 22 MB) und liegen bewusst nicht im Git. Fuer die
README braucht es wenige, kleine, dauerhaft stabile Bilder. Dieses Werkzeug legt sie nach
`docs/bilder/` und schreibt `docs/bilder/HERKUNFT.md` — welches Bild aus welcher
Nachweis-Datei stammt, mit Pruefsumme. Damit ist jedes Bild in der Doku nachpruefbar und
keine Angabe steht ohne Beleg da.

Bilder werden NICHT beschnitten oder retuschiert, nur auf Breite skaliert und als JPEG
gespeichert (deutlich kleiner als PNG bei Fotos von Oberflaechen). Die Bilder zeigen
Version 2.4.0 — das steht auch so in der HERKUNFT.md.

Aufruf: python tools/bilder.py            (baut docs/bilder/ neu)
        python tools/bilder.py --pruefen  (nur pruefen, ob alles da und unveraendert ist)
"""
import argparse
import hashlib
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HIER = Path(__file__).resolve().parent.parent
NACHWEISE = HIER / "Nachweise"
ZIEL = HIER / "docs" / "bilder"

# (Zieldatei, Quelle in Nachweise/, Breite, Bildunterschrift)
AUSWAHL = [
    ("topologie.jpg", "2.4-Bilder/topologie.png", 1440,
     "Lagebild der Arztpraxis im 2.4.0-Bau: Geraete, gerade Kabel und VLAN-Zonen mit Adressschildern"),
    ("einstieg.jpg", "2.4-Bilder/einstieg.png", 1440,
     "Der erste Auftrag „Kasse ohne Netz“: Ticket, Ziele, Labor und Inspektor"),
    ("konsole.jpg", "2.4-Bilder/konsole.png", 1440,
     "IOS-Konsole am Switch: Schnittstellen und VLANs pruefen"),
    ("simulation.jpg", "2.4-Bilder/simulation.png", 1440,
     "Simulation auf Frame-Ebene: Ereignisse mit Grund, Filter und Schritt-fuer-Schritt"),
    ("kompetenzkarte.jpg", "2.4-Bilder/kompetenzkarte.png", 1440,
     "Lernstand: Kompetenzkarte, Fehlerheft und Stufen"),
    ("ergebnis.jpg", "2.4-Bilder/ergebnis.png", 1440,
     "Abnahme bestanden: Sterne, Lohn, Abzeichen und Merke-Kasten"),
    ("postfach.jpg", "2.4-Bilder/postfach.png", 1440,
     "Postfach als Datentafel: Auftraege, Kunde, Form/Dauer/Lohn und Brief"),
    ("hilfe.jpg", "2.4-Bilder/hilfe.png", 1440,
     "Die Hilfeleiter: naechste Diagnose vorschlagen, Fehler kostet nichts"),
]

# Der Kopf sagt „Fassung 1.1.0". Kommt eine neue Nachweis-Runde mit anderer Fassung,
# hier eintragen — sonst behauptet die Doku eine Herkunft, die nicht mehr stimmt.
FASSUNG_DER_BILDER = "2.4.0"

QUELLTEXT_KOPF = """# Herkunft der Bilder

Diese Bilder sind **Aufnahmen aus dem gebauten Programm** — gebaut aus dem Stand {spiel},
aufgenommen am 30.10.2026 mit `Nachweise/2.4-Bilder/foto.py` in Edge headless (1440 × 950,
Theme POLARIS/dunkel), danach **nur auf Breite skaliert und als JPEG gespeichert**. Nicht
beschnitten, nicht retuschiert. Quelldatei, Pruefsumme und Groesse stehen unten; die
Originale liegen unter `Nachweise/` (nicht im Git).

**Die Bilder zeigen die Fassung {fassung}.**

Neu bauen: `python tools/bilder.py` (braucht die Aufnahmen unter `Nachweise/2.4-Bilder/`)
· Pruefen: `python tools/bilder.py --pruefen`
"""


def pruefen() -> int:
    """Nur pruefen: sind alle Bilder da und zugeordnet?

    Braucht WEDER die Nachweise NOCH Pillow. Auf dem GitHub-Runner fehlt beides
    (Nachweise/ liegt nicht im Git, Pillow ist nicht installiert) — geprueft wird dort
    also nur, dass die versionierten Bilder in docs/bilder/ vollstaendig sind.
    """
    fehler = []
    if not ZIEL.is_dir() or not any(ZIEL.glob("*.jpg")):
        print(f"ROT: {ZIEL} fehlt oder enthaelt keine Bilder.")
        return 1
    print(f"Bilder in {ZIEL.relative_to(HIER)}/  ({NACHWEISE.is_dir() and 'Nachweise vorhanden' or 'Nachweise liegen nicht vor'})")
    for name, rel, _, _ in AUSWAHL:
        ziel = ZIEL / name
        if not ziel.is_file():
            fehler.append(f"fehlt: {name}")
            print(f"  ROT   {name:<24} fehlt")
            continue
        sha = hashlib.sha256(ziel.read_bytes()).hexdigest()[:16]
        quelle_da = (NACHWEISE / rel).is_file()
        print(f"  ok    {name:<24} {ziel.stat().st_size:>8,} B  {sha}…  Quelle: {'da' if quelle_da else 'nicht vor Ort'}")
    if fehler:
        print("ROT: " + ", ".join(fehler))
        return 1
    print(f"GRUEN: alle {len(AUSWAHL)} Bilder vorhanden und zugeordnet.")
    if not NACHWEISE.is_dir():
        print("      Neu bauen ginge nur mit den Nachweisen (tools/bilder.py ohne --pruefen).")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Bilder fuer die Doku aus Nachweise/ bauen")
    ap.add_argument("--pruefen", action="store_true", help="nur pruefen, nichts schreiben")
    a = ap.parse_args()

    # Zuerst pruefen — das braucht weder Nachweise noch Pillow.
    if a.pruefen:
        return pruefen()

    if not NACHWEISE.is_dir():
        raise SystemExit(
            f"FEHLER: {NACHWEISE} fehlt — ohne die Abnahme-Nachweise lassen sich die Bilder\n"
            "  nicht herleiten. Die fertigen Bilder liegen in docs/bilder/ (im Git, bereits\n"
            f"  fertig). Nur pruefen: python tools/bilder.py --pruefen"
        )

    # Pillow wird NUR zum Bauen gebraucht. Der Import stand frueher ganz oben und liess
    # `--pruefen` auf jedem Rechner ohne Pillow scheitern — auf dem GitHub-Runner ist
    # Pillow nicht installiert, dadurch wurde der ganze Ablauf rot (gemessen 05.10.2026).
    try:
        from PIL import Image
    except ImportError:
        raise SystemExit("FEHLER: Pillow fehlt. Ohne Pillow kann nicht skaliert werden.\n"
                         "  Nur pruefen (ohne Pillow): python tools/bilder.py --pruefen")

    ZIEL.mkdir(parents=True, exist_ok=True)
    # Fassung des Spiels aus bauen.py lesen - eine Quelle, kein zweiter Ort zum Pflegen.
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', (HIER / "bauen.py").read_text(encoding="utf-8"), re.M)
    spiel = m.group(1) if m else "?"
    kopf = QUELLTEXT_KOPF.format(fassung=FASSUNG_DER_BILDER, spiel=spiel)
    zeilen = [kopf, "", "| Bild | aus Nachweise/ | Groesse | SHA256 (Bild) |",
              "|---|---|---|---|"]
    fehler, gesamt = [], 0

    for name, rel, breite, text in AUSWAHL:
        quelle = NACHWEISE / rel
        if not quelle.is_file():
            fehler.append(f"Quelle fehlt: {rel}")
            continue

        with Image.open(quelle) as im:
            if im.width > breite:
                hoehe = round(im.height * breite / im.width)
                im = im.resize((breite, hoehe), Image.LANCZOS)
            if im.mode not in ("RGB", "L"):
                im = im.convert("RGB")
            ziel = ZIEL / name
            im.save(ziel, "JPEG", quality=84, optimize=True, progressive=True)
        sha = hashlib.sha256(ziel.read_bytes()).hexdigest()
        roh = ziel.stat().st_size
        gesamt += roh
        print(f"  {name:<24} {im.width}x{im.height}  {roh/1024:>7.1f} KB  <- {rel}")
        zeilen.append(f"| `{name}` | `{rel}` | {roh:,} B | {sha[:16]} |")

    zeilen += ["", "## Was auf welchem Bild zu sehen ist", ""]
    for name, rel, breite, text in AUSWAHL:
        zeilen.append(f"- **`{name}`** — {text}")

    # newline="\n": im Repositorium gilt LF (.gitattributes), auch auf Windows.
    (ZIEL / "HERKUNFT.md").write_text("\n".join(zeilen) + "\n", encoding="utf-8", newline="\n")
    print()
    print(f"{len(AUSWAHL)} Bilder -> {ZIEL}")
    print(f"  Summe {gesamt/1024:.0f} KB")
    print(f"  Herkunft -> {ZIEL / 'HERKUNFT.md'}")

    if fehler:
        print("ROT:")
        for f in fehler:
            print("  - " + f)
        return 1
    print("GRUEN: fertig.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
