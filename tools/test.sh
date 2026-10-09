#!/bin/sh
# Headless-Tests:                    sh tools/test.sh [filter]
# Dazu Klassen-Abgleich + Rauchtest: sh tools/test.sh --rauch [filter]   (Oberfläche in 1366/960/720 px, Edge headless; tools/rauch.py)
#
# Node wird in dieser Reihenfolge gesucht (der erste Treffer gewinnt):
#   1. $NODE                                     (ausdruecklich gesetzt)
#   2. Node portabel unter %LOCALAPPDATA%        (der Weg auf dem Entwicklungsrechner)
#   3. node aus dem PATH                          (GitHub Actions, Linux, macOS)
# Damit laeuft dasselbe Skript hier und in der Pruefung auf GitHub.
cd "$(dirname "$0")/.." || exit 1

finde_node() {
  if [ -n "$NODE" ] && [ -x "$NODE" ]; then echo "$NODE"; return 0; fi
  for kandidat in \
    "/c/Users/Student/AppData/Local/node-portable/node-v24.21.0-win-x64/node.exe" \
    "$LOCALAPPDATA/node-portable/node-v24.21.0-win-x64/node.exe"
  do
    if [ -x "$kandidat" ]; then echo "$kandidat"; return 0; fi
  done
  if command -v node >/dev/null 2>&1; then command -v node; return 0; fi
  return 1
}

NODE=$(finde_node) || {
  echo "FEHLER: kein Node gefunden. Node 24 installieren oder NODE=/pfad/zu/node setzen." >&2
  exit 1
}

# Die Anfuehrungszeichen-Falle (`„…"` mit ASCII-Ende) hat am 09.10.2026 DREIMAL den ganzen Lauf
# angehalten: SyntaxError -> LADEFEHLER -> Exit 2, keine einzige Zahl, jedes Mal mehrere Minuten
# Stillstand. Das Namenswerkzeug findet sie - aber niemand rief es auf. Deshalb laeuft sein
# TROCKENLAUF jetzt VOR den Tests (es schreibt nichts, kein --setzen): es prueft jede Testdatei
# ausserdem mit `node --check` und endet ungleich 0, sobald eine nicht laedt.
pruefe_namen() {
  "$NODE" tools/pruefe-namen-flicken.js || {
    echo "ABBRUCH: mindestens eine Testdatei laedt nicht (siehe oben)." >&2
    echo "Hilfe: node tools/pruefe-namen-flicken.js --setzen  (setzt die Anfuehrungszeichen gerade)" >&2
    exit 1
  }
}

if [ "$1" = "--rauch" ]; then
  shift
  pruefe_namen
  "$NODE" tests/run.js "$@" || exit 1
  python tools/klassen.py || exit 1
  python tools/ethos.py || exit 1
  exec python tools/rauch.py
fi
pruefe_namen
python tools/ethos.py || exit 1
exec "$NODE" tests/run.js "$@"
