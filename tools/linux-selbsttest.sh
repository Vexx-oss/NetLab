#!/bin/bash
# Selbsttest der Linux-Fassung in WSLg (oder auf einem echten Linux-Desktop):
#   wsl -d Ubuntu -- bash /mnt/c/Users/Student/Documents/Joshua/10-Projekte/Lernprojekte/Netzwerk-Labor/tools/linux-selbsttest.sh
# Startet das Programm einmal unter Wayland und einmal unter X11 (GDK_BACKEND=x11) mit LABOR_SELBSTTEST=1.
# Die Seite meldet nach dem Laden Plattform, Fähigkeiten, Fensterzustand und Fehler; das Programm beendet sich dann selbst.
QUELLE="$(cd "$(dirname "$0")/.." && pwd)"
BIN=/tmp/nl-selbsttest
cp "$QUELLE/Programm/linux/netzwerk-labor" "$BIN" && chmod +x "$BIN"
for MODUS in wayland x11; do
  rm -rf "/tmp/nl-daten-$MODUS" "/tmp/st-$MODUS.json"
  if [ "$MODUS" = x11 ]; then export GDK_BACKEND=x11; else unset GDK_BACKEND; fi
  LABOR_SELBSTTEST=1 LABOR_SELBSTTEST_DATEI="/tmp/st-$MODUS.json" LABOR_DATEN="/tmp/nl-daten-$MODUS" timeout 45 "$BIN" > "/tmp/nl-$MODUS.log" 2>&1
  echo "== $MODUS (Exit $?)"
  if [ -f "/tmp/st-$MODUS.json" ]; then
    python3 - "$MODUS" <<'PY'
import json, sys
d = json.load(open(f"/tmp/st-{sys.argv[1]}.json"))
p, f = d.get("plattform", {}), d.get("fenster", {})
print(json.dumps({"sitzung": p.get("sitzung"), "kann": p.get("kann"), "fehler": d.get("fehler"), "modus": d.get("modus"),
                  "spiel": d.get("spiel"), "sim": d.get("sim"), "fenster": {k: f.get(k) for k in ["modus", "sichtbar", "b", "h", "immerOben", "fokus"]}}, ensure_ascii=False))
PY
  else
    echo "kein Ergebnis – Protokoll:"; grep -v "^$" "/tmp/nl-$MODUS.log" | tail -8
  fi
done
