# AGENTS.md – Betriebsregeln für das Netzwerk-Labor

Gilt für **jedes** Modell und jeden Menschen, der in diesem Projekt arbeitet. Kurz, verbindlich, ohne Ausnahmen.
Vorbild für diese Datei: Design – Spielspaß 2.0.md § 24 (Auftrag „R“, Punkt 1).

## Absolute Verbote

1. **Beende NIE Prozesse nach Namen oder Muster.** Nicht `msedgewebview2`, nicht `msedge`, nicht `explorer`, nicht
   `python`, nicht `node`. Du darfst **höchstens eine PID beenden, die du in dieser Sitzung selbst gestartet hast** —
   und nur diese. Starte nichts neu, starte Windows nicht neu.
   *Grund (belegt):* Am 05.10.2026 wurden 13 `msedgewebview2.exe` zwangsweise beendet, darunter die Hosts der
   Windows-Shell. *Nachtrag 05.10.2026, 19:30:* Dieser Zusammenhang war eine Fehldeutung – die `.exe` startet wieder
   (Ursache war das Integritätslabel „Niedrig“ des Vaults, siehe Befund unten). Die Regel gilt unverändert.
2. **Kein `git push`, kein `--force`, kein `reset --hard`, kein Zweigwechsel, kein Commit auf `master`, keine Zweige
   löschen.** Gearbeitet wird auf `ausbau-1.2`.
3. **Keine Dateien außerhalb des Projektordners ändern.** Die Ordner `Nachweise/` und `Programm/` werden **nicht**
   gelöscht (dort liegen Bildschirmfoto-Nachweise und die gebauten Programme).
4. **Keine Software installieren oder deinstallieren.**
5. **Behaupte nichts, was du nicht in dieser Sitzung gemessen hast.** „Wahrscheinlich“, „vermutlich“ und „nicht
   geprüft“ müssen genau so dastehen.

## Befehle

| Zweck | Befehl | Erwartung |
|---|---|---|
| Tests | `sh tools/test.sh` | meldet `N/N grün` (Stand: 213) |
| + Rauchtest der Oberfläche | `sh tools/test.sh --rauch` | zusätzlich 36/36 |
| Simulation gegen Referenzstand | `node tools/sim-stand.js` | „Simulation unverändert gegenüber dem Referenzstand“ |
| Klassen ↔ CSS | `python tools/klassen.py` | `0 Klassen ohne CSS-Regel` |
| Bauen (Browser-Fassung) | `python bauen.py` | immer **vor** `cargo tauri build` |
| Echtes Programm | `python tools/q-echt.py` | startet die `.exe`; siehe Befund unten |

Node liegt portabel unter `%LOCALAPPDATA%\node-portable\node-v24.21.0-win-x64\node.exe` (v24.21.0).

**In eingeschränkten Umgebungen** (z. B. einer Werkzeug-Sandbox) startet `sh tools/test.sh` nicht, wenn `sh.exe`
direkt aufgerufen wird: dann fehlt `dirname`, weil Git-`/usr/bin` nicht im PATH liegt, und das Skript sucht
`tests/run.js` im falschen Ordner. Verlässlich ist:

```
& "C:\Program Files\Git\bin\bash.exe" -c 'export PATH=/usr/bin:/bin:$PATH; sh tools/test.sh'
```

**Die `.exe` startet wieder** (Stand 05.10.2026, 19:30 – Befund und Beweise in `Nachweise/1.2-Start/BEFUND.md`).
Der frühere Befund „startet nicht“ war falsch gedeutet: Nicht die zwangsweise beendeten `msedgewebview2.exe` waren
die Ursache, sondern das **Integritätslabel „Niedrig“** auf dem Vault (Überrest der Werkzeug-Sandbox). Davon erbt
`Programm/Netzwerk-Labor.exe`, läuft dadurch als Low-Prozess und darf `%LOCALAPPDATA%` nicht beschreiben; die
WebView2-Laufzeit kann ihr Profil nicht anlegen und bricht ab (`failed to create webview`, `0x800700AA`/`0x8000FFFF`,
Exception `0x80000003`). **Reparatur (ohne Administratorrechte, wiederholbar):** Doppelklick auf
`Programm/Integritaet-reparieren.cmd` oder `icacls Programm /setintegritylevel (OI)(CI)Medium /T` +
`icacls Programm/Netzwerk-Labor.exe /setintegritylevel Medium`. Der alte Befund in `Design – Spielspaß 2.0.md` § 25
und in `Architektur.md` ist damit überholt.

## Zeilenenden bewahren

Mehrere Dateien haben CRLF, andere LF, einzelne gemischt (die Design-Notiz: 1156 × CRLF, 43 × LF). **Vor** dem
Bearbeiten und **nach** jeder Bearbeitung prüfen:

```
git ls-files --eol <Datei>                              # wie liegt die Datei im Index / im Arbeitsbaum?
git diff --stat <Datei>                                 # mit Zeilenenden
git diff --stat --ignore-cr-at-eol <Datei>              # ohne Zeilenenden
```

Weichen die Zahlen **stark** voneinander ab (Beispiel aus § 24: `engine.js` mit 265 Zeilen gegen 6 echte), hast du
die Zeilenenden der ganzen Datei umgestellt: Datei aus Git wiederherstellen (nur wenn sie vorher sauber war) und so
bearbeiten, dass die vorhandenen Enden erhalten bleiben — mit einem Skript, das die Zeilen einzeln ersetzt bzw. beim
Anhängen das überwiegende Ende der Datei übernimmt. Ein Editor, der beim Speichern normalisiert, ist dafür ungeeignet.

## Arbeitsweise

- **Senkrechter Schnitt vor Breite.** Lieber eine Funktion vollständig — Modell, Simulation, Konsole, Oberfläche,
  Lehrtext, Fehlerinjektor, Ticket, Test — als fünf halbe Funktionen. Nach jedem Schritt muss etwas **spielbar** sein.
- **Wirkung vor Grün.** Ein Baustein zählt erst, wenn er im Programm vorkommt. Grüne Tests ohne Aufruf aus Ticket oder
  Oberfläche gelten als **nicht fertig**. *Belegtes Gegenbeispiel:* Der gesamte DHCP-Pool-Modus der Konsole war seit
  1.0 wirkungslos, weil der Test nur den Prompt prüfte (gefunden 05.10.2026). Ein Test, der nur den Prompt prüft, ist
  kein Test.
- **Vertrag zuerst.** Jede Änderung an Datenformen steht zuerst in `Architektur.md` (Datenform, Verhalten, Gründe,
  Trace-Format). Danach der Code.
- **Selbst und nacheinander.** Keine Agentenschwärme: Ein Schwarm riss zweimal das Limit, und drei von vier
  Teammitgliedern brachen am 05.10.2026 mitten in der Arbeit ab, ohne etwas zu hinterlassen.
- **Nach jedem Commit den Stand nachziehen.** `Design – Spielspaß 2.0.md` (neuer Abschnitt) und `Architektur.md`
  (Stand-Tabelle) müssen den echten Zustand zeigen. Kein Commit ohne Stand.
- **Tests statt Augenschein, wo es geht.** Nach jeder Änderung an `src/sim/` oder `src/modell/` zusätzlich
  `node tools/sim-stand.js` laufen lassen und jede Abweichung benennen: gewollt oder ungewollt.
- **Determinismus.** Kein `Math.random` ohne Seed, kein Datum, keine Uhr in `src/sim/` und `src/cli/`.
- **Ehrlich berichten.** Stand nachzählen statt schätzen, offen sagen, was **nicht** geprüft wurde. Antworten auf
  Deutsch.

## Ablage

- `src/` – Code in Schichten: `kern` · `modell` · `sim` · `cli` · `daten` · `spiel` · `plattform` · `ui` · `stil`
- `tests/` – Tests (`sh tools/test.sh`), dazu die versionierte Simulations-Referenz `tests/sim-stand.json`
- `tools/` – Bau-, Mess- und Prüfwerkzeuge
- `Programm/` – gebaute Programme · `Nachweise/` – Bildschirmfotos und Messdateien (**beide nicht im Git**)
