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

if [ "$1" = "--rauch" ]; then
  shift
  "$NODE" tests/run.js "$@" || exit 1
  python tools/klassen.py || exit 1
  exec python tools/rauch.py
fi
exec "$NODE" tests/run.js "$@"
