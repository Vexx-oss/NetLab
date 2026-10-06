"""App-Symbol des Netzwerk-Labors erzeugen (Pillow).

Ein Symbol, drei Knoten, zwei Farben — dieselben Farbwerte wie im Spiel
(`src/stil/basis.css`: --bg #0E131B, --accent #4FC3F7, --ok #4ADE80, --muted #93A1B8).

Erzeugt:
  huelle/res/mipmap-<dichte>/ic_launcher.png          klassisches Symbol (48…192 px)
  huelle/res/mipmap-<dichte>/ic_launcher_rund.png     ebenso (die Form gibt der Starter)
  huelle/res/mipmap-xxxhdpi/ic_launcher_vorder.png    Vordergrund für das adaptive Symbol
  huelle/res/mipmap-anydpi-v26/ic_launcher*.xml       adaptives Symbol (Android 8+)

Aufruf:  python android/werkzeuge/ikone.py [--neu]
         Ohne --neu wird nichts überschrieben, was schon da ist.
"""
import argparse
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
RES = HIER / "huelle" / "res"

HINTER = (14, 19, 27)
AKZENT = (79, 195, 247)
OK = (74, 222, 128)
HELL = (230, 236, 245)

DICHTEN = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

# Knoten des Symbols, als Anteil der Zeichenfläche (0…1): Router links, zwei Hosts rechts.
A = (0.30, 0.50)
B = (0.71, 0.27)
C = (0.71, 0.73)


def zeichnen(kante: int, mit_hintergrund: bool, randanteil: float) -> "object":
    """Zeichnet das Symbol in `kante` Pixeln. `randanteil` ist der Rand ringsum (0…0.4)."""
    from PIL import Image, ImageDraw

    S = kante * 4                      # vierfach zeichnen und verkleinern = weiche Kanten
    bild = Image.new("RGBA", (S, S), HINTER + (255,) if mit_hintergrund else (0, 0, 0, 0))
    d = ImageDraw.Draw(bild)

    n = 1.0 - 2 * randanteil           # genutzte Kantenlänge
    x0 = y0 = S * randanteil

    def p(punkt):
        return (x0 + punkt[0] * n * S, y0 + punkt[1] * n * S)

    breite = max(2, int(S * 0.030 * n))
    for von, nach, farbe in ((A, B, AKZENT), (A, C, AKZENT), (B, C, (58, 74, 98))):
        d.line([p(von), p(nach)], fill=farbe + (255,), width=breite)
        for (px, py) in (p(von), p(nach)):
            d.ellipse([px - breite / 2, py - breite / 2, px + breite / 2, py + breite / 2], fill=farbe + (255,))

    r = S * 0.072 * n
    for punkt, farbe, form in ((A, HELL, "router"), (B, OK, "host"), (C, AKZENT, "host")):
        cx, cy = p(punkt)
        if form == "router":
            b = r * 1.35
            d.rounded_rectangle([cx - b, cy - b * 0.72, cx + b, cy + b * 0.72],
                                radius=b * 0.45, fill=farbe + (255,))
            d.rectangle([cx - b * 0.55, cy - b * 0.18, cx + b * 0.15, cy + b * 0.02], fill=HINTER + (255,))
        else:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=farbe + (255,))
            d.ellipse([cx - r * 0.42, cy - r * 0.42, cx + r * 0.42, cy + r * 0.42], fill=HINTER + (255,))

    # Ein „Paket“ auf der oberen Kante: das Labor verschickt wirklich Pakete.
    mx, my = ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)
    cx, cy = p((mx, my))
    pr = S * 0.023 * n
    d.ellipse([cx - pr, cy - pr, cx + pr, cy + pr], fill=HELL + (255,))

    return bild.resize((kante, kante), Image.LANCZOS)


ADAPTIV = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ikone_hinter" />
    <foreground android:drawable="@mipmap/ic_launcher_vorder" />
</adaptive-icon>
"""


def main() -> int:
    ap = argparse.ArgumentParser(description="App-Symbol erzeugen")
    ap.add_argument("--neu", action="store_true", help="vorhandene Bilder überschreiben")
    a = ap.parse_args()

    try:
        import PIL  # noqa: F401
    except ImportError:
        print("FEHLER: Pillow fehlt (pip install Pillow). Ohne Pillow kein Symbol.")
        return 1

    geschrieben, uebersprungen = 0, 0
    for dichte, kante in DICHTEN.items():
        ordner = RES / f"mipmap-{dichte}"
        ordner.mkdir(parents=True, exist_ok=True)
        # klassisch: vollflächig, etwas mehr Rand; rund: gleiches Bild (Form gibt der Starter)
        for name, rand in (("ic_launcher.png", 0.10), ("ic_launcher_rund.png", 0.14)):
            ziel = ordner / name
            if ziel.is_file() and not a.neu:
                uebersprungen += 1
                continue
            zeichnen(kante, True, rand).save(ziel)
            geschrieben += 1

    # adaptiv: Vordergrund 432 px (108 dp bei xxxhdpi), Symbol in der sicheren Zone (66 %)
    vorder = RES / "mipmap-xxxhdpi" / "ic_launcher_vorder.png"
    if not vorder.is_file() or a.neu:
        zeichnen(432, False, 0.26).save(vorder)
        geschrieben += 1
    else:
        uebersprungen += 1

    anydpi = RES / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    for name in ("ic_launcher.xml", "ic_launcher_rund.xml"):
        ziel = anydpi / name
        if ziel.is_file() and not a.neu:
            uebersprungen += 1
            continue
        ziel.write_text(ADAPTIV, encoding="utf-8", newline="\n")
        geschrieben += 1

    print(f"App-Symbol: {geschrieben} Dateien geschrieben, {uebersprungen} schon vorhanden "
          f"({len(DICHTEN)} Dichten, adaptiv für Android 8+)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
