"""App- und Tray-Symbole des Netzwerk-Labors erzeugen (eigene Zeichnung, keine Marke).

Motiv: ein Netz aus vier Knoten – ein Knoten in der Mitte (Switch), drei außen (Geräte),
verbunden durch Kabel. Farben aus src/stil/basis.css (Leitstand: --bg, --accent, --warn).
Variante „punkt“: derselbe Knoten mit orangem Punkt oben rechts = neue Tickets (Tray).

Aufruf:  python erzeugen.py      (braucht Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw

HIER = Path(__file__).resolve().parent
GROSS = 1024                      # Arbeitsgröße, danach verkleinern (glatte Kanten)
BG = (14, 19, 27, 255)            # --bg
RAND = (58, 74, 98, 255)          # --line-2
AKZENT = (79, 195, 247, 255)      # --accent
KNOTEN_HELL = (230, 236, 245, 255)  # --ink
PUNKT = (251, 146, 60, 255)       # orange, gut sichtbar auf hellem und dunklem Tray
PUNKT_RAND = (14, 19, 27, 255)


def zeichnen(punkt=False, tray=False):
    s = GROSS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rand = 0 if tray else int(s * 0.04)
    radius = int(s * 0.22)
    d.rounded_rectangle([rand, rand, s - rand - 1, s - rand - 1], radius=radius, fill=BG,
                        outline=RAND, width=max(1, int(s * 0.018)))
    mitte = (s * 0.5, s * 0.55)
    aussen = [(s * 0.24, s * 0.30), (s * 0.76, s * 0.30), (s * 0.5, s * 0.84)]
    if tray:  # im Tray kräftiger (16–32 px)
        linie, r_mitte, r_aussen = int(s * 0.085), s * 0.16, s * 0.12
    else:
        linie, r_mitte, r_aussen = int(s * 0.055), s * 0.13, s * 0.095
    for p in aussen:
        d.line([mitte, p], fill=AKZENT, width=linie)
    for (x, y) in aussen:
        d.ellipse([x - r_aussen, y - r_aussen, x + r_aussen, y + r_aussen], fill=KNOTEN_HELL)
    x, y = mitte
    d.ellipse([x - r_mitte, y - r_mitte, x + r_mitte, y + r_mitte], fill=AKZENT)
    if punkt:
        r = s * 0.2
        cx, cy = s - r - s * 0.02, r + s * 0.02
        d.ellipse([cx - r - s * 0.035, cy - r - s * 0.035, cx + r + s * 0.035, cy + r + s * 0.035], fill=PUNKT_RAND)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=PUNKT)
    return img


def klein(img, n):
    return img.resize((n, n), Image.LANCZOS)


def main():
    app = zeichnen()
    klein(app, 512).save(HIER / "icon.png")
    klein(app, 32).save(HIER / "32x32.png")
    klein(app, 128).save(HIER / "128x128.png")
    klein(app, 256).save(HIER / "128x128@2x.png")
    klein(app, 256).save(HIER / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    klein(zeichnen(tray=True), 64).save(HIER / "tray.png")
    klein(zeichnen(punkt=True, tray=True), 64).save(HIER / "tray-punkt.png")
    # Vorschau zum Ansehen (nicht Teil des Programms)
    vorschau = Image.new("RGBA", (64 * 2 + 32 * 2 + 16 * 2 + 70, 72), (238, 242, 246, 255))
    x = 6
    for bild in (zeichnen(tray=True), zeichnen(punkt=True, tray=True)):
        for n in (64, 32, 16):
            vorschau.alpha_composite(klein(bild, n), (x, 4))
            x += n + 6
    vorschau.save(HIER / "vorschau.png")
    print("Symbole erzeugt in", HIER)


if __name__ == "__main__":
    main()
