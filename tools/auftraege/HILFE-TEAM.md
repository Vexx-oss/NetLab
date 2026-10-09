# Teambriefing Netzwerk-Labor – Auftrag „Hilfestellung" (07.10.2026)

> Kurz, verbindlich. Gilt zusätzlich zu `AGENTS.md` im Projektordner — lies **beide** zuerst.

## Projekt und Auftrag

`C:\Users\Student\Documents\Joshua\10-Projekte\Lernprojekte\Netzwerk-Labor`

Der Nutzer (Fisi, 1. Lehrjahr) will das Labor um **stufenweise Hilfestellung** erweitern. Vier Bausteine,
vier Besitzer, keine Überschneidung. Verbindlicher Vertrag: **`docs/entwicklung/Hilfestellung – Stufen und
Schnittstellen.md`** — lies die für dich genannten Paragrafen vollständig, bevor du eine Zeile schreibst.

## Unverhandelbare Regeln

1. **Nur deine Dateien.** Jede Datei hat genau einen Besitzer (Vertrag § 7). Brauchst du eine Änderung in
   einer fremden Datei: **melde sie dem Lead** (`send_message` an `lead`) statt sie zu machen.
2. **Kein `git commit`, kein `git push`, kein Zweigwechsel.** Der Lead committet. Kein `git checkout`,
   kein `git stash` — andere arbeiten gleichzeitig im selben Arbeitsbaum.
3. **Keine Software installieren. Keine Prozesse beenden.** (AGENTS.md, absolut.)
4. **Bash fehlt im PATH nicht** — in dieser Umgebung funktioniert
   `& "C:\Program Files\Git\bin\bash.exe" -c 'export PATH=/usr/bin:/bin:$PATH; cd /c/Users/Student/Documents/Joshua/10-Projekte/Lernprojekte/Netzwerk-Labor && sh tools/test.sh'`
   **nicht** (Sandbox: keine Named Pipes). Rufe die Tests direkt auf:
   ```
   $node = "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe"
   cd "C:\Users\Student\Documents\Joshua\10-Projekte\Lernprojekte\Netzwerk-Labor"
   & $node tests/run.js            # muss >= 251/251 grün melden
   & $node tests/run.js <filter>   # nur passende Tests
   python tools/ethos.py           # muss GRUEN melden
   python bauen.py                 # baut web/index.html + web/tests.html
   ```
5. **Zeilenenden bewahren** (AGENTS.md). `git ls-files --eol <Datei>` vorher und nachher;
   `git diff --stat <Datei>` gegen `git diff --stat --ignore-cr-at-eol <Datei>`. Neue Dateien: **LF**.
6. **Determinismus:** kein `Math.random` ohne Seed, kein `Date.now` in `src/sim/`, `src/cli/`, `src/spiel/`.
7. **Keine Behauptung ohne Messung.** „Wahrscheinlich", „vermutlich", „nicht geprüft" müssen genau so
   dastehen. Zahlen nachzählen, nicht schätzen.
8. **Antworte auf Deutsch.**

## Was diese Umgebung ist

Diese Sitzung läuft unter einem Werkzeug-Agenten (DSH), **nicht** unter Claude/Opus. Es gibt keine
Bildschirmfotos, keinen Browser und kein CDP in dieser Umgebung. Prüfe deshalb:

* **headless über `node tests/run.js`** — lade deinen Baustein und rufe ihn wirklich auf,
* **`python bauen.py`** — beweist, dass die gebaute Seite ohne Ladefehler entsteht,
* und für die Oberfläche: einen Test, der die DOM-Bausteine mit `h()`/`sv()` aus `src/ui/dom.js` aufbaut,
  so wie es `tests/*.test.js` bereits tun. Schau dir eine bestehende Testdatei an, bevor du eine schreibst.

**Wirkung vor Grün** (AGENTS.md): Ein Baustein zählt erst, wenn er aus dem echten Weg aufgerufen wird —
Terminal-Zeile, Leisten-Knopf, Ansicht. Ein Test, der nur den eigenen Aufruf prüft, gilt als **nicht fertig**.

## Meldung an den Lead

Wenn du fertig bist (oder blockiert), schicke **eine** kurze Nachricht an `lead`:

```
TASK <id> · <status: fertig|blockiert>
Geändert: <Dateien mit Zeilenzahl>
Gemessen: node tests/run.js -> N/N grün · ethos -> GRÜN · bauen.py -> ok
Nicht geprüft: <ehrlich, was du nicht messen konntest>
Offen: <was der Lead wissen muss>
```

Markiere danach deine Aufgabe auf dem gemeinsamen Brett als `complete`.
