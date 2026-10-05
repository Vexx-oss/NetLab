#!/bin/sh
# Headless-Tests:                    sh tools/test.sh [filter]
# Dazu Klassen-Abgleich + Rauchtest: sh tools/test.sh --rauch [filter]   (Oberfläche in 1366/960/720 px, Edge headless; tools/rauch.py)
cd "$(dirname "$0")/.." || exit 1
NODE="/c/Users/Student/AppData/Local/node-portable/node-v24.21.0-win-x64/node.exe"
if [ "$1" = "--rauch" ]; then
  shift
  "$NODE" tests/run.js "$@" || exit 1
  python tools/klassen.py || exit 1
  exec python tools/rauch.py
fi
exec "$NODE" tests/run.js "$@"
