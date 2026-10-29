# Mitmachen

Danke fürs Interesse. Dieses Repo ist ein Lernspiel — Beiträge sind willkommen, wenn sie
**spielbar** bleiben und ehrlich belegt sind. Die verbindlichen Betriebsregeln stehen in
[AGENTS.md](AGENTS.md) und gelten für Menschen genauso wie für Modelle; die praktische
Kurzfassung steht in [docs/Mitmachen.md](docs/Mitmachen.md).

## Die fünf Regeln, die alles erklären

1. **Senkrechter Schnitt vor Breite** — nach jedem Schritt muss etwas spielbar sein.
2. **Wirkung vor Grün** — ein Baustein zählt erst, wenn er im Programm vorkommt; grüne Tests
   ohne Aufruf aus Ticket oder Oberfläche gelten als **nicht fertig**.
3. **Vertrag zuerst** — Änderungen an Datenformen stehen zuerst in
   [docs/Architektur.md](docs/Architektur.md), dann im Code.
4. **Eine Zahlenquelle** — Zahlen (Tests, Module, Größen) stehen **nicht** von Hand in
   Dokumenten: `python tools/stand.py` misst und schreibt [docs/STAND.md](docs/STAND.md);
   `--pruefen` meldet jede Abweichung.
5. **Ehrlich berichten** — „nicht geprüft" ist eine erwünschte Angabe; „wahrscheinlich" ohne
   Messung nicht.

## Vor dem ersten Beitrag

| Thema | Regel |
|---|---|
| Zweig | Gearbeitet wird auf `ausbau-1.2`. Kein Commit auf `master`, kein Push, kein `--force`, kein `reset --hard`, keine Zweige löschen. Veröffentlichen nur mit ausdrücklicher Freigabe. |
| Prozesse | **Niemals** Prozesse nach Namen beenden (nicht `msedgewebview2`, nicht `node`, nicht `python`). Höchstens eine PID, die du in dieser Sitzung selbst gestartet hast. |
| Ordner | `Nachweise/` und `Programm/` sind nicht versioniert und werden **nicht** gelöscht. |
| Installation | Keine Software installieren oder deinstallieren. |
| Geheimnisse | Keine Zugangsdaten, Schlüssel oder Spielstände mit Klarnamen committen. Sicherheitslücken: [SECURITY.md](SECURITY.md). |
| Zeilenenden | LF (siehe `.gitattributes`); vor/nach dem Bearbeiten `git ls-files --eol <Datei>` prüfen. |

## Bauen und prüfen

Voraussetzung: Node 24 (Tests) und Python 3 (Werkzeuge).

```bash
python bauen.py                    # src/ -> web/index.html
python tools/einfach.py            # web/ -> docs/index.html und Netzwerk-Labor.html
sh tools/test.sh                   # Tests headless in Node
python tools/stand.py --pruefen    # Zahlen in STAND.md/README gegen die Messung
python tools/seite.py --pruefen    # Doku-Seite strukturell prüfen
```

Die Reihenfolge ist wichtig (`bauen.py` zuerst). Weitere Prüfungen — Simulation,
Klassen↔CSS, Stilregeln, Doku-Frische — stehen in [docs/Bauen.md](docs/Bauen.md) und
[docs/SITZUNGSABSCHLUSS.md](docs/SITZUNGSABSCHLUSS.md).

## Ein Beitrag im Ablauf

1. **Issue** oder Absprache: Was soll danach **spielbar** anders sein?
2. **Vertrag** in `docs/Architektur.md`, falls sich Datenformen oder Verhalten ändern.
3. **Code und Test**, der die Wirkung prüft — nicht nur den Prompt.
4. **Prüfen**: `sh tools/test.sh`, bei Simulationsnähe `node tools/sim-stand.js`.
5. **Stand nachziehen**: `python tools/stand.py` und bei Doku-Änderungen
   `python tools/seite.py` + `--pruefen`.
6. **Pull Request** mit der Vorlage in `.github/PULL_REQUEST_TEMPLATE.md` — warum, nicht nur was.

Fragen, die schon beantwortet sind: [docs/FAQ.md](docs/FAQ.md). Kleinigkeiten und
Verständnisfragen dürfen auch als Diskussion im Issue stehen.
