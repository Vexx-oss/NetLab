"""Kurzauswertung der Dock-Probe: Zustandsübergänge und Trefferprobe kompakt.

  python Nachweise/experten/_debugdock.py > tmp.json
  python Nachweise/experten/_debugdock-auswerten.py tmp.json
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
d = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
for s in d.get("schritte", []):
    k = s["k"]
    if k in ("A_offen", "B_eingeklappt", "D_nachReiterTippen", "E_nachDockKnopfKlick",
             "F_nachGriffKlick", "G_nachAnsichtwechsel"):
        v = s["v"]
        print(f"{k}: dock={v['dock']} sichtbar={v['dockSichtbar']} zu={v['dockZuKlasse']} inhalt={v['inhaltSichtbar']}")
    elif k == "H_trefferprobe":
        schlecht = [t for t in s["v"] if not t["trifftSichSelbst"]]
        print(f"H_trefferprobe: {len(s['v'])} Knöpfe, {len(schlecht)} nicht treffbar"
              + ("" if not schlecht else f" -> {[t['knopf'] for t in schlecht]}"))
if "fehler" in d:
    print("FEHLER:", d["fehler"])
