# Mitmachen

Kurz und verbindlich. Die vollständigen Betriebsregeln stehen in [`AGENTS.md`](AGENTS.md) —
sie gelten für Menschen genauso wie für Modelle. Hier steht, was für einen Beitrag
praktisch wichtig ist.

## Die fünf Regeln, die alles andere erklären

1. **Senkrechter Schnitt vor Breite.** Lieber eine Funktion vollständig — Modell,
   Simulation, Konsole, Oberfläche, Lehrtext, Fehlerinjektor, Ticket, Test — als fünf
   halbe. Nach jedem Schritt muss etwas **spielbar** sein.

2. **Wirkung vor Grün.** Ein Baustein zählt erst, wenn er im Programm vorkommt. Grüne
   Tests ohne Aufruf aus einem Ticket oder der Oberfläche gelten als **nicht fertig**.
   *Belegtes Gegenbeispiel:* Der gesamte DHCP-Pool-Modus der Konsole war seit 1.0
   wirkungslos, weil der Test nur den Prompt prüfte.

3. **Vertrag zuerst.** Jede Änderung an Datenformen steht zuerst in
   [`Architektur.md`](Architektur.md) — Datenform, Verhalten, Gründe, Trace-Format.
   Danach der Code. Nicht umgekehrt.

4. **Nach jedem Commit den Stand nachziehen.** `Design – Spielspaß 2.0.md` (neuer
   Abschnitt) und `Architektur.md` (Stand-Tabelle) müssen den echten Zustand zeigen.
   Kein Commit ohne Stand.

5. **Ehrlich berichten.** Stand nachzählen statt schätzen. Offen sagen, was **nicht**
   geprüft wurde — „nicht geprüft" ist eine zulässige und erwünschte Angabe,
   „wahrscheinlich" ohne Messung nicht.

## Bevor du etwas änderst

| Thema | Regel |
|---|---|
| Zweig | Gearbeitet wird auf `ausbau-1.2`. Kein Commit auf `master`. Kein `push`, kein `--force`, kein `reset --hard`, keine Zweige löschen. |
| Prozesse | **Niemals** Prozesse nach Namen beenden (nicht `msedgewebview2`, nicht `node`, nicht `python`). Höchstens eine PID, die du in dieser Sitzung selbst gestartet hast. |
| Ordner | `Nachweise/` und `Programm/` werden **nicht** gelöscht — dort liegen Bildschirmfoto-Nachweise und gebaute Programme. |
| Installation | Keine Software installieren oder deinstallieren. |
| Zeilenenden | Siehe unten. |
| Antworten | Auf Deutsch. |

## Zeilenenden bewahren

Mehrere Dateien haben CRLF, andere LF, einzelne gemischt. Ein Editor, der beim Speichern
normalisiert, ist dafür **ungeeignet** — er erzeugt Diffs über die ganze Datei. Vor dem
Bearbeiten und nach jeder Änderung prüfen:

```bash
git ls-files --eol <Datei>                    # wie liegt die Datei im Index / im Arbeitsbaum?
git diff --stat <Datei>                       # mit Zeilenenden
git diff --stat --ignore-cr-at-eol <Datei>    # ohne Zeilenenden
```

Weichen die Zahlen stark voneinander ab (Beispiel aus der Design-Notiz: `engine.js` mit
265 Zeilen gegen 6 echte), hast du die Enden der ganzen Datei umgestellt. Dann: Datei aus
Git wiederherstellen und mit einem Skript bearbeiten, das **die vorhandenen Enden erhält**.

## Was geprüft wird

Jeder Beitrag muss diese Befehle grün hinterlassen:

```bash
sh tools/test.sh            # 213/213 grün
python tools/klassen.py     # 0 Klassen ohne CSS-Regel
node tools/sim-stand.js     # Simulation unverändert gegenüber dem Referenzstand
```

Nach jeder Änderung an `src/sim/` oder `src/modell/` **zusätzlich**
`node tools/sim-stand.js` — und jede Abweichung benennen: gewollt oder ungewollt.

Berührt dein Beitrag die Auslieferung, kommen dazu:

```bash
python tools/einfach.py --pruefen docs/index.html   # Einzeldatei ohne Außenverweise
python tools/starttest.py                           # startet sie im echten Browser
python tools/paket.py                               # Paket bauen und gegenprüfen
```

Dieselben Schritte laufen bei jedem Push automatisch
([`.github/workflows/pruefen.yml`](.github/workflows/pruefen.yml)).

## Determinismus

In `src/sim/` und `src/cli/`: **kein** `Math.random` ohne Seed, **keine** Uhr, **kein**
Datum. Nur so lassen sich Simulationen reproduzieren und gegen
`tests/sim-stand.json` prüfen.

## Wo was hingehört

- `src/kern` · `src/modell` · `src/sim` · `src/cli` — headless, keine DOM-Berührung
- `src/daten` — Tickets, Vorlagen, Injektoren, Texte
- `src/spiel` — Karriere, Lernstand, Abzeichen, Regeln
- `src/plattform` — Fenster, Leiste, Tray, Speichern
- `src/ui` · `src/stil` — Oberfläche und Gestaltung
- `tests/` — Tests, dazu die versionierte Referenz `tests/sim-stand.json`
- `tools/` — Bau-, Mess- und Prüfwerkzeuge
- `web/` und `docs/` — **erzeugt**, nicht von Hand bearbeiten
- `fremd/` — fremder Bestand (Lernmotor). Änderungen gehören in die FISI-Spielhalle
  und werden danach mit `python tools/lernmotor.py --neu-einlesen` übernommen.

## Ein Beitrag im Ablauf

1. Issue oder Absprache — was soll danach **spielbar** anders sein?
2. Vertrag in `Architektur.md`, falls sich Datenformen ändern.
3. Code **und** Test, der die Wirkung prüft (nicht nur den Prompt).
4. `sh tools/test.sh` und `node tools/sim-stand.js`.
5. Stand in `Design – Spielspaß 2.0.md` und die Stand-Tabelle in `Architektur.md`.
6. Commit, der sagt **warum**, nicht nur was.
