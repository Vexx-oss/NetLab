# AGENTS.md – Betriebsregeln für das Netzwerk-Labor

Gilt für **jedes** Modell und jeden Menschen, der in diesem Projekt arbeitet. Kurz, verbindlich, ohne Ausnahmen.
Vorbild für diese Datei: docs/entwicklung/Design – Spielspaß 2.0.md § 24 (Auftrag „R“, Punkt 1).

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

**Am Ende jeder Sitzung:** [`docs/SITZUNGSABSCHLUSS.md`](docs/SITZUNGSABSCHLUSS.md) — die acht
Schritte von „aufräumen" bis „nachmessen, was online steht", samt der Regeln, die aus Fehlern
stammen (Fassung ziehen, Zeilenenden prüfen, erzeugen und gegenprüfen, Stand nachziehen,
veröffentlichen nur mit Freigabe). Erst diese Reihenfolge, dann die Tabelle unten.

| Zweck | Befehl | Erwartung |
|---|---|---|
| Tests | `sh tools/test.sh` | meldet `N/N grün` + `davon N übersprungen` (Stand: **768**, 87 Testdateien, 92 Module, 0 übersprungen – 09.10.2026, selbst nachgemessen). Ein Test mit **0 Zusicherungen** gilt als übersprungen und wird gezählt, nicht als grün verschwiegen. **Filter:** `node tests/run.js <name>` filtert nur die Ausgabe; seit 09.10.2026 schneidet er führende Striche ab (`--klassenraum` → **104/104 grün**, selbst gemessen), und ein Filter **ohne** Treffer endet mit **Exit 1** samt „KEIN Test passt zum Filter … Das ist kein grüner Lauf." — die Bilanzzeile zeigt dabei weiterhin „0/0 grün", es entscheidet der **Exit-Code** |
| + Rauchtest der Oberfläche | `sh tools/test.sh --rauch` | zusätzlich **45/45** (14 Ansichten **plus** die Erstabnahme mit echter Maus, je 3 Breiten = 45 Prüfungen; seit 09.10.2026 mit den zwei Klassenraum-Ansichten — Zahl von der Leitung gemessen) |
| Gegen die Falle in Testnamen | `node tools/pruefe-namen-flicken.js [--setzen]` | findet `pruefe("…„…"…")`, das den Lauf mit `LADEFEHLER` (Exit 2) anhält — trockener Lauf zuerst |
| Tiefe Menüebenen (Android und Web) | `python tools/menueprobe.py --datei android/bau/assets/index.html --lauf` | **5 Profile, 49 Kriterien erfüllt, 0 verletzt** (selbst nachgemessen am 09.10.2026 gegen die Android-Fassung **2.0.2**; beim Stand **2.0.1** waren es **47** — die Zahl hängt am gebauten Stand, nicht am Quellstand). Für den Web-Bau: `--datei web/index.html` (am 09.10.2026 **45 Kriterien erfüllt, 0 verletzt**, 5 von 5 Profilen, auch gegen den **2.0.2**-Bau — selbst gemessen; vorher **rot** 36 von 43 erfüllt, 44-px-Trefferflächen in den Editor-Menüs, gemessen **identisch** zu `HEAD~1`, also vorbestehend) |
| Simulation gegen Referenzstand | `node tools/sim-stand.js` | „Simulation unverändert gegenüber dem Referenzstand“ |
| Klassen ↔ CSS | `python tools/klassen.py` | `0 Klassen ohne CSS-Regel` |
| Regelwerk (Minimalismus) | `python tools/ethos.py` | `GRUEN: keine Regel schlechter als tests/stil-stand.json` — am 09.10.2026 **BESSER als der Stand**: R1 23→22 · R2 122→113 · R3 206→195 · R4 539→514 · R5 70→0 · R6 11→0 · R8 5→0 · R10 87→0 (selbst gemessen; die Stand-Datei ist auf genau diesen Stand eingefroren: R1 22 · R2 113 · R3 195 · R4 514 · R5–R12 = 0). **Achtung:** R12 misst nur mit `--dom`; ohne es meldet der Lauf ausdrücklich „NICHT GEMESSEN" |
| Bauen (Browser-Fassung) | `python bauen.py` | immer **vor** `cargo tauri build` |
| Einzeldatei (auch die Wurzel-Datei) | `python tools/einfach.py` · `--ziel Netzwerk-Labor.html` | beide byte-gleich, `0 Außenverweise` |
| Android-APK | `python android/bauen.py` | 7 Schritte, ~5 s, endet mit `GRUEN` |
| PC-Hülle für die Entwicklungsrunde | `pwsh -File shell/entwickeln.ps1 -NurBauen` | Debug-Profil, ~4 s je Runde (Auslieferung bleibt `cargo tauri build`) |
| Fassung ziehen (2.0.3 → 2.0.4) | `python tools/fassung-ziehen.py --neu 2.0.4` · `--setzen` | Trockenlauf zuerst; im `Cargo.lock` bleibt nur der eigene Block; **`VERSION_CODE` in `android/bauen.py` von Hand nachziehen** (muss über dem aus `versionName` abgeleiteten Wert liegen) |
| Tote Verweise finden | `python tools/repo-verweise-flicken.py` | prüft **jeden** relativen Verweis in jeder Markdown-Datei — **schreibt aber**: es setzt tote Verweise zuerst gerade |
| Die drei Randbefunde nachmessen | `python tools/nachprobe-menuefix.py` | `GRÜN: alle drei Befunde behoben` |
| Echtes Programm | `python tools/q-echt.py` | startet die `.exe`; siehe Befund unten |
| Klassenraum-Codec messen | `& "<node>" tools\klassenraum-probe\A-codec-probe.js` | erschöpfender Code-Round-Trip über 2²⁰ Nutzlasten (~250 s), schreibt `Nachweise/Klassenraum/A-codec.json` |
| Klassenraum-Server bauen | `cargo build --release` in `tools/klassenraum` | eine `.exe` **ohne jede Kiste** (322.560 B), `cargo test` 10/10 |
| Klassenraum-Server prüfen | `pwsh -File tools\klassenraum-probe\C-http-probe.ps1` | 20 echte HTTP-Messungen, endet mit `20/20`, Port danach frei |

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
und in `docs/Architektur.md` ist damit überholt.

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
- **Vertrag zuerst.** Jede Änderung an Datenformen steht zuerst in `docs/Architektur.md` (Datenform, Verhalten, Gründe,
  Trace-Format). Danach der Code.
- **Selbst und nacheinander.** Keine Agentenschwärme: Ein Schwarm riss zweimal das Limit, und drei von vier
  Teammitgliedern brachen am 05.10.2026 mitten in der Arbeit ab, ohne etwas zu hinterlassen.
- **Nach jedem Commit den Stand nachziehen.** `docs/entwicklung/Design – Spielspaß 2.0.md` (neuer Abschnitt) und
  `docs/Architektur.md` (Stand-Tabelle) müssen den echten Zustand zeigen. Kein Commit ohne Stand.
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
