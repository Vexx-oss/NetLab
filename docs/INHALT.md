# 📚 Die Notizen dieses Projekts

Diese Übersicht sammelt, was **nicht** Quelltext ist: Verträge, Pläne, Befunde, Konzepte und
den Verlauf. Der Einstieg ins Projekt steht in [`../README.md`](../README.md), die
Betriebsregeln für Mitarbeit und Modelle in [`../AGENTS.md`](../AGENTS.md).

> **Nicht veröffentlicht.** Auf GitHub Pages landen nur `docs/index.html` und `docs/bilder/`
> (so stellt es `.github/workflows/seite.yml` zusammen). Alles hier ist für Mitlesende im
> Repositorium und wird **nicht** ausgeliefert.

## Was gilt (verbindlich)

| Datei | Wofür |
|---|---|
| [`Architektur.md`](Architektur.md) | Der Vertrag zwischen den Bausteinen: Datenformen, Verhalten, Gründe, Trace-Format. Änderungen an Datenformen stehen **zuerst** hier. |
| [`Bauen.md`](Bauen.md) | Bauen, Testen, Messen, Ausliefern im Detail — inklusive der gemessenen Fallen (d8, `</head>`, `screenOrientation`, MIME-Typ der Schriften). |
| [`SITZUNGSABSCHLUSS.md`](SITZUNGSABSCHLUSS.md) | Die acht Schritte am Ende einer Sitzung: aufräumen, Fassung ziehen, prüfen, bauen, Stand nachziehen, committen, veröffentlichen, nachmessen — mit den Regeln, die aus Fehlern stammen. |
| [`Mitmachen.md`](Mitmachen.md) | Arbeitsweise und Regeln für Beiträge. |
| [`Liesmich.md`](Liesmich.md) | Übersicht für Leser: was das Spiel ist, wie man es startet, was es kann. |

## Was geschehen ist (Verlauf)

| Datei | Wofür |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | Was sich wann geändert hat — aus der echten Commit-Historie abgeleitet, nicht aus Erinnerung. |

## Entwicklung: Pläne, Befunde, Konzepte

| Datei | Wofür |
|---|---|
| [`entwicklung/Design – Spielspaß 2.0.md`](<entwicklung/Design – Spielspaß 2.0.md>) | Die große Design-Notiz: Befunde, Hebel, Messwerte, verworfene Versuche — je Runde ein Abschnitt. |
| [`entwicklung/Plan – Ausbau 1.2.md`](<entwicklung/Plan – Ausbau 1.2.md>) | Phasen, Stand und Messwerte des Ausbaus 1.2. |
| [`entwicklung/Konzept – Netzwerk-Labor.md`](<entwicklung/Konzept – Netzwerk-Labor.md>) | Die Spezifikation des Spiels. |
| [`entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md`](<entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md>) | Konzept für den Einsatz im Unterricht und in der Ausbildung. |
| [`entwicklung/Befund – Programm startet wieder.md`](<entwicklung/Befund – Programm startet wieder.md>) | Der Befund zum Integritätslabel, das die `.exe` blockierte — samt Reparaturweg. |
| [`entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md`](<entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md>) | Vertrag für die nächste Stufe: die Lehrkraft sagt einen Code an, jedes Gerät baut denselben Auftrag — **noch nicht umgesetzt** (Fassung 1.2.3). |
| [`entwicklung/Klassenraum/`](entwicklung/Klassenraum/Liesmich.md) | Die vier Teil-Dokumente zu diesem Vertrag (A Codec/Determinismus · B Oberfläche/Ablauf · C Rust/Live/QR · D Prüfung/Abnahme) mit allen Messprotokollen. |
| [`entwicklung/Opus-Auftrag – Netzwerk-Labor.md`](<entwicklung/Opus-Auftrag – Netzwerk-Labor.md>) | Der ursprüngliche Auftrag, aus dem das Projekt entstand. |

## Wie dieses Verzeichnis aufgeräumt wurde

Bis zum 06.10.2026 lagen zwölf Notizen im Wurzelverzeichnis; ein Besucher sah sie vor dem
Quelltext. Auf Wunsch wurden sie hierher gezogen — **mit** `git mv`, damit die
Versionsgeschichte jeder Datei erhalten bleibt, und mit angepassten Verweisen
(`tools/repo-aufraeumen.py`, `tools/repo-verweise-flicken.py`; der zweite Lauf prüft
**jeden** relativen Verweis in **jeder** Markdown-Datei gegen die Wirklichkeit).

Im Wurzelverzeichnis bleiben nur, was man dort erwartet: `README.md`, `CHANGELOG.md`
(Konvention auf GitHub), `LICENSE`, `LIZENZ.md`, `AGENTS.md`, `.gitignore`,
`.gitattributes`, `index.html` (Weiterleitung für Pages), die Baueingänge `bauen.py` und
`schriften.css` sowie die Ordner `src/`, `tests/`, `tools/`, `android/`, `shell/`,
`schriften/`, `Vorlagen/`, `Programm/`, `fremd/` und `docs/`.
