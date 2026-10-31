#!/bin/sh
# Headless-Tests:                    sh tools/test.sh [filter]
# Dazu Klassen-Abgleich + Rauchtest: sh tools/test.sh --rauch [filter]   (Oberfläche in 1366/960/720 px, Edge headless; tools/rauch.py)
# Vor jedem Lauf: JS-Syntax-Gate über src/ + alle Testdateien (tools/syntax.js, QUA-01) und der Namenstor-Trockenlauf.
# Nach dem Lauf:  Zähl-Gate gegen docs/STAND.md (tools/zaehl-gate.js, QUA-04) — nur beim vollen Lauf ohne Filter.
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

# Die Anfuehrungszeichen-Falle (`„…"` mit ASCII-Ende) hat am 09.10.2026 FUENFMAL zugeschlagen, davon
# DREIMAL so, dass der ganze Lauf stehenblieb: SyntaxError -> LADEFEHLER -> Exit 2, keine einzige
# Zahl, jedes Mal mehrere Minuten Stillstand. Deshalb laeuft das Namenswerkzeug als TROCKENLAUF VOR
# den Tests (es schreibt nichts, kein --setzen) und endet ungleich 0, sobald eine Datei nicht laedt.
# QUA-05 (3.0, Lead-Beschluss 31.10.2026): Das Werkzeug parst alle Testdateien in EINEM Node-Prozess
# (Baustein tools/syntax.js), meldet die Falle als Datei:Zeile und findet sie in `pruefe(...)`
# UND in `erwarte(...)`-Texten. Fehlalarme sind strukturell ausgeschlossen (gewertet wird nur, was
# wirklich nicht laedt: vorher 75 Fehlalarme / 30 s, gemessen jetzt 0 / 0,17 s). --setzen repariert
# nur echte Faelle und meldet Zeilen mit ASCII-Apostroph zur Handpruefung.
# QUA-01 (3.0, Lead-Beschluss 31.10.2026): das Syntax-Gate parst JEDE JS-Datei unter src/ und alle
# Testdateien in EINEM Node-Prozess (Millisekunden). Bisher parste nur das Namenstor die Testdateien;
# ein Syntaxfehler in einer nie geladenen src-Datei passierte die ganze CI (Befund Q2, qualitaet.md).
pruefe_syntax() {
  "$NODE" tools/syntax.js || {
    echo "ABBRUCH: mindestens eine JavaScript-Datei hat einen Syntaxfehler (Datei:Zeile oben)." >&2
    exit 1
  }
}

pruefe_namen() {
  "$NODE" tools/pruefe-namen-flicken.js || {
    echo "ABBRUCH: mindestens eine Testdatei laedt nicht (siehe oben)." >&2
    echo "Hilfe: node tools/pruefe-namen-flicken.js --setzen  (setzt die Anfuehrungszeichen gerade)" >&2
    exit 1
  }
}

# QUA-04 (3.0, Lead-Beschluss 31.10.2026): lokales Zaehl-Gate. Nach einem vollen Testlauf OHNE Filter
# muss die Testzahl zur Bilanz in docs/STAND.md passen; sonst sind still verschwundene Tests (Befund Q5)
# wieder unbemerkt. Der Lauf bleibt live sichtbar (tee), sein Exit-Code gilt weiter; die Logdatei
# liegt nur unter ${TMPDIR:-/tmp} und wird geloescht. Mit Filter laeuft das Gate nicht (andere Zahl).
teste_und_zaehle() {
  log="${TMPDIR:-/tmp}/netlab-tests-$$.log"
  rcdatei="${TMPDIR:-/tmp}/netlab-tests-$$.rc"
  { "$NODE" tests/run.js "$@"; echo $? > "$rcdatei"; } | tee "$log"
  code=$(cat "$rcdatei" 2>/dev/null || echo 1)
  rm -f "$rcdatei"
  if [ "$code" -ne 0 ]; then rm -f "$log"; exit "$code"; fi
  if [ "$#" -eq 0 ]; then
    "$NODE" tools/zaehl-gate.js --bilanz "$log" || { rm -f "$log"; exit 1; }
  fi
  rm -f "$log"
}

if [ "$1" = "--rauch" ]; then
  shift
  pruefe_syntax
  pruefe_namen
  teste_und_zaehle "$@"
  python tools/klassen.py || exit 1
  python tools/ethos.py || exit 1
  python tools/umlaute.py || exit 1
  exec python tools/rauch.py
fi
pruefe_syntax
pruefe_namen
python tools/ethos.py || exit 1
python tools/umlaute.py || exit 1
teste_und_zaehle "$@"
