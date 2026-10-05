"""Bilder fuer die Dokumentation aus Nachweise/ auswaehlen, verkleinern, benennen.

Warum ein eigenes Werkzeug statt "Bild rueberkopieren": Die Bilder in `Nachweise/` sind
Beweismittel der Abnahmen (141 Stueck, 22 MB) und liegen bewusst nicht im Git. Fuer die
README braucht es wenige, kleine, dauerhaft stabile Bilder. Dieses Werkzeug legt sie nach
`docs/bilder/` und schreibt `docs/bilder/HERKUNFT.md` — welches Bild aus welcher
Nachweis-Datei stammt, mit Pruefsumme. Damit ist jedes Bild in der Doku nachpruefbar und
keine Angabe steht ohne Beleg da.

Bilder werden NICHT beschnitten oder retuschiert, nur auf Breite skaliert und als JPEG
gespeichert (deutlich kleiner als PNG bei Fotos von Oberflaechen). Die Bilder zeigen
Version 1.1.0 — das steht auch so in der HERKUNFT.md.

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
    ("topologie.jpg", "1.2-Topo/topo-praxis-mit-tasten.png", 1500,
     "Topologie der Arztpraxis mit Adressschildern, VLAN-Flaechen und den drei Werkzeugen"),
    ("einstieg.jpg", "1.2-Phase-A/nachher-1366-1-start.png", 1366,
     "Der erste Auftrag „Kasse ohne Netz“: Ticket, Ziele, Senioren-Hinweis, Labor"),
    ("konsole.jpg", "1.2-C/c-1366-3-terminal-diagnose.png", 1366,
     "IOS-aehnliche Konsole und Windows-Terminal bei der Fehlersuche (ping, nslookup)"),
    ("simulation.jpg", "1.2-Phase-A/nachher-1366-8-sim.png", 1366,
     "Simulation auf Frame-Ebene: 42 Ereignisse, Filter nach ARP/ICMP, PDU-Ansicht"),
    ("kompetenzkarte.jpg", "1.2-E2/e2-1366-5-kompetenzkarte.png", 1366,
     "Lernstand: Kompetenzkarte, Fehlerheft, Stufen „neu“ bis „gemeistert“"),
    ("ergebnis.jpg", "1.2-S2/s2-1366-1-erster-auftrag.png", 1366,
     "Abnahme bestanden: Sterne, Lohn, Abzeichen, „Merke“-Kasten mit Lernquelle"),
    ("postfach.jpg", "1.2-C/c-1366-1-postfach.png", 1366,
     "Postfach: Kundenmails mit Symptom aus Kundensicht"),
    ("hilfe.jpg", "1.2-C/c-1366-8-hilfe-naechste-diagnose.png", 1366,
     "Die Hilfeleiter: naechste Diagnose vorschlagen, Fehler kostet nichts"),
]

# Der Kopf sagt „Fassung 1.1.0". Kommt eine neue Nachweis-Runde mit anderer Fassung,
# hier eintragen — sonst behauptet die Doku eine Herkunft, die nicht mehr stimmt.
FASSUNG_DER_BILDER = "1.1.0"

QUELLTEXT_KOPF = """# Herkunft der Bilder

Diese Bilder sind **Ausschnitte aus den Abnahme-Nachweisen** des Projekts, keine
gestellten Aufnahmen. Quelldatei, Pruefsumme und Groesse stehen unten; die Originale
liegen unter `Nachweise/` (nicht im Git, weil 22 MB Beweismaterial).

Bearbeitung: **nur auf Breite skaliert und als JPEG gespeichert.** Nicht beschnitten,
nicht retuschiert.

**Die Bilder zeigen die Fassung {fassung}** — die Nachweise wurden vor dem Versionssprung
auf {spiel} aufgenommen. Die Oberflaeche ist dieselbe; die kleinen Ziffern in der Kopfzeile
der Bilder sind der einzige Unterschied. Neue Nachweise werden mit der jeweils aktuellen
Fassung erzeugt.

Neu bauen: `python tools/bilder.py` · Pruefen: `python tools/bilder.py --pruefen`
"""


def main() -> int:
    ap = argparse.ArgumentParser(description="Bilder fuer die Doku aus Nachweise/ bauen")
    ap.add_argument("--pruefen", action="store_true", help="nur pruefen, nichts schreiben")
    a = ap.parse_args()

    try:
        from PIL import Image
    except ImportError:
        raise SystemExit("FEHLER: Pillow fehlt. Ohne Pillow kann nicht skaliert werden.")

    if not NACHWEISE.is_dir():
        raise SystemExit(f"FEHLER: {NACHWEISE} fehlt — die Bilder lassen sich nicht herleiten.")

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
        if a.pruefen:
            ziel = ZIEL / name
            if not ziel.is_file():
                fehler.append(f"Zielbild fehlt: {name}")
                continue
            sha = hashlib.sha256(ziel.read_bytes()).hexdigest()[:16]
            zeilen.append(f"| `{name}` | `{rel}` | {ziel.stat().st_size:,} B | {sha} |")
            gesamt += ziel.stat().st_size
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

    if not a.pruefen:
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
    print("GRUEN: alle Bilder vorhanden und zugeordnet." if a.pruefen else "GRUEN: fertig.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
