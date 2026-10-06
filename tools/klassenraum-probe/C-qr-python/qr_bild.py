"""Matrix als PNG rendern (nur zum Ansehen/Beamer-Probe; braucht Pillow).

Aufruf:
    python qr_bild.py --matrix-datei matrix.json --png bild.png [--modul 12] [--ruhe 4]

Die Matrix kommt im selben Format wie aus dem Rust-Encoder oder der Python-Referenz:
{"matrix": ["0101...", ...]}, "1" = dunkel.

Das Bild ist bewusst schlicht: schwarz auf weiss, scharfe Kanten (keine Glaettung),
Ruhezone ringsum. Genau so wird es gescannt.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def main() -> int:
    ap = argparse.ArgumentParser(description="QR-Matrix als PNG rendern")
    ap.add_argument("--matrix-datei", required=True)
    ap.add_argument("--png", required=True)
    ap.add_argument("--modul", type=int, default=12)
    ap.add_argument("--ruhe", type=int, default=4)
    args = ap.parse_args()

    daten = json.loads(Path(args.matrix_datei).read_text(encoding="utf-8-sig"))
    matrix = daten["matrix"]
    n = len(matrix)
    kante = (n + 2 * args.ruhe) * args.modul
    bild = Image.new("RGB", (kante, kante), (255, 255, 255))
    px = bild.load()
    for z, zeile in enumerate(matrix):
        for s, wert in enumerate(zeile):
            if wert != "1":
                continue
            x0 = (s + args.ruhe) * args.modul
            y0 = (z + args.ruhe) * args.modul
            for dy in range(args.modul):
                for dx in range(args.modul):
                    px[x0 + dx, y0 + dy] = (0, 0, 0)
    ziel = Path(args.png)
    ziel.parent.mkdir(parents=True, exist_ok=True)
    bild.save(ziel)
    dunkel = sum(zeile.count("1") for zeile in matrix)
    print(f"{ziel}  {kante}x{kante} px  {n}x{n} Module  {dunkel} dunkle Module  Modul {args.modul} px  Ruhezone {args.ruhe}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
