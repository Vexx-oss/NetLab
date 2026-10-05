"""Lernmotor: Kopie hier gegen die Quelle in der FISI-Spielhalle pruefen.

Warum es diese Kopie gibt: Das Netzwerk-Labor und die FISI-Spielhalle teilen sich
EINEN Lernmotor. Frueher holte `bauen.py` ihn aus `../FISI-Spielhalle/src/lernmotor.js`
— also von ausserhalb des Repositoriums. Damit liess sich das Netzwerk-Labor nicht
allein bauen (und auf GitHub gar nicht). `fremd/lernmotor.js` ist der Stand, mit dem
hier gebaut und getestet wird.

Dieses Werkzeug vergleicht beide Dateien Zeile fuer Zeile (ohne den Herkunftskopf)
und meldet ehrlich:

  * GLEICH      — die Kopie entspricht der Quelle.
  * ABWEICHUNG  — die Spielhalle ist weiter; Kopie mit --neu-einlesen erneuern.
  * QUELLE FEHLT— die Spielhalle liegt nicht daneben (z. B. auf GitHub). Dann wird
                  die in der Kopie hinterlegte Pruefsumme gegen die Kopie selbst
                  geprueft: stimmt sie, ist die Kopie unveraendert.

Aufruf:
    python tools/lernmotor.py                  pruefen und berichten
    python tools/lernmotor.py --neu-einlesen   Kopie aus der Spielhalle erneuern
"""
import argparse
import hashlib
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HIER = Path(__file__).resolve().parent.parent
KOPIE = HIER / "fremd" / "lernmotor.js"
QUELLE = HIER.parent / "FISI-Spielhalle" / "src" / "lernmotor.js"

# Der Herkunftskopf steht zwischen dem ersten /* === und dem Ende dieses Kommentars.
KOPF = re.compile(r"\A/\*\s*=+.*?=+\s*\*/\s*", re.S)
HASH_IM_KOPF = re.compile(r"SHA256\s*:\s*([0-9A-Fa-f]{64})")


def kopf_und_rest(text: str) -> tuple[str, str]:
    t = text.replace("\r\n", "\n")
    m = KOPF.match(t)
    return (m.group(0), t[m.end():]) if m else ("", t)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def pruefen() -> int:
    if not KOPIE.is_file():
        raise SystemExit(f"FEHLER: {KOPIE} fehlt.")
    kopf, rumpf = kopf_und_rest(KOPIE.read_text(encoding="utf-8"))
    kopie_hash = sha(rumpf)

    print(f"Kopie    {KOPIE.relative_to(HIER)}  ({len(rumpf.splitlines())} Zeilen, SHA256 {kopie_hash[:16]}…)")

    if not QUELLE.is_file():
        im_kopf = HASH_IM_KOPF.search(kopf)
        if not im_kopf:
            print("  ROT: im Herkunftskopf steht keine Pruefsumme — Kopie nicht nachvollziehbar.")
            return 1
        if im_kopf.group(1).lower() == kopie_hash:
            print(f"  GRUEN: Quelle liegt nicht daneben ({QUELLE}); die Kopie stimmt mit der")
            print("         im Kopf hinterlegten Pruefsumme ueberein — sie ist unveraendert.")
            return 0
        print("  ROT: die Kopie weicht von der im Kopf hinterlegten Pruefsumme ab.")
        print(f"       im Kopf: {im_kopf.group(1).lower()}")
        print(f"       echt   : {kopie_hash}")
        print("       Entweder wurde die Kopie von Hand geaendert (verboten — Aenderungen")
        print("       gehoeren in die Spielhalle) oder der Kopf ist veraltet.")
        return 1

    _, quelle_rumpf = kopf_und_rest(QUELLE.read_text(encoding="utf-8"))
    quelle_hash = sha(quelle_rumpf)
    print(f"Quelle   {QUELLE}  ({len(quelle_rumpf.splitlines())} Zeilen, SHA256 {quelle_hash[:16]}…)")

    if kopie_hash == quelle_hash:
        print("  GRUEN: GLEICH — die Kopie entspricht der Quelle Zeile fuer Zeile.")
        return 0

    # Wo genau weichen sie ab?
    a, b = rumpf.splitlines(), quelle_rumpf.splitlines()
    erste = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
    print("  ROT: ABWEICHUNG — die Spielhalle ist weiter als die Kopie.")
    print(f"       Kopie  {len(a)} Zeilen, Quelle {len(b)} Zeilen, erste Abweichung in Zeile {erste + 1}")
    for i in range(erste, min(erste + 3, max(len(a), len(b)))):
        links = a[i] if i < len(a) else "(fehlt)"
        rechts = b[i] if i < len(b) else "(fehlt)"
        print(f"       Kopie  {i+1:>4}: {links[:100]}")
        print(f"       Quelle {i+1:>4}: {rechts[:100]}")
    print("       Uebernehmen mit: python tools/lernmotor.py --neu-einlesen")
    return 1


def neu_einlesen() -> int:
    if not QUELLE.is_file():
        raise SystemExit(f"FEHLER: Quelle fehlt: {QUELLE} — ohne sie kann nichts erneuert werden.")
    alt = KOPIE.read_text(encoding="utf-8") if KOPIE.is_file() else ""
    kopf, alt_rumpf = kopf_und_rest(alt)
    _, neu_rumpf = kopf_und_rest(QUELLE.read_text(encoding="utf-8"))
    if alt_rumpf == neu_rumpf and kopf:
        print("Keine Aenderung — die Kopie ist schon auf dem Stand der Quelle.")
        return 0

    neuer_hash = sha(neu_rumpf)
    if kopf:
        neue_kopf = HASH_IM_KOPF.sub(f"SHA256   : {neuer_hash}", kopf, count=1)
    else:
        raise SystemExit("FEHLER: die vorhandene Kopie hat keinen Herkunftskopf — von Hand pruefen.")
    KOPIE.write_text(neue_kopf + neu_rumpf, encoding="utf-8", newline="")
    print(f"Kopie erneuert: {KOPIE.relative_to(HIER)}")
    print(f"  {len(neu_rumpf.splitlines())} Zeilen, SHA256 {neuer_hash}")
    print("  Danach nicht vergessen: sh tools/test.sh  und  node tools/sim-stand.js")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Lernmotor-Kopie gegen die FISI-Spielhalle pruefen")
    ap.add_argument("--neu-einlesen", action="store_true", help="Kopie aus der Spielhalle erneuern")
    a = ap.parse_args()
    return neu_einlesen() if a.neu_einlesen else pruefen()


if __name__ == "__main__":
    sys.exit(main())
