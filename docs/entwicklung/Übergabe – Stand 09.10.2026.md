---
tags: [FISI, Lernspiel, Netzwerk, Übergabe, Kontext]
erstellt: 2026-10-09
status: Übergabezettel — bewusst kurz. Für einen Neustart gedacht: hier steht, was ein neuer Lauf wissen muss, ohne 40 Dateien zu lesen.
---

# Übergabe — Stand nach der Sitzung vom 09.10.2026

> **Warum diese Datei so kurz ist.** Der Kontext eines Laufs ist teuer. Diese Datei ist so gebaut,
> dass ein neuer Lauf in **einer** Minute weiß, wo er steht, was gerade gilt und was als Nächstes
> zu tun ist — mit Verweisen statt Wiederholungen. Wer mehr braucht, folgt den Links.

## 1 · Wo wir stehen (in einem Satz)

Fassung **1.2.4** ist gebaut, getestet, getaggt, veröffentlicht und live; zusätzlich ist seit
09.10.2026 die **Doku als Build** mit ausgeliefert. Der nächste Schritt ist **nicht** gebaut — er ist
geplant und wartet auf eine Entscheidung (siehe § 4).

## 2 · Was in dieser Sitzung entstanden ist

| Was | Stand | Wo es steht |
|---|---|---|
| **Hilfestellung** (Bildungsstufen, Hilfekonto, Terminal-Streifen, Lernanker, Trainingsbereich) | gebaut, 1.2.4 | [CHANGELOG 1.2.4](CHANGELOG.md) · [Hilfestellung – Stufen und Schnittstellen](<entwicklung/Hilfestellung – Stufen und Schnittstellen.md>) |
| **Doku als Build** — 29 Markdown-Dateien als lesbare Seiten unter `/doku/` | gebaut, live | `tools/md.py` · `tools/seite.py` · [INHALT.md](INHALT.md) |
| **Auslieferung korrigiert** — veraltete `.exe` wäre als neue Fassung verpackt worden; Doku jetzt im Browser-ZIP | gebaut | [CHANGELOG, Nachtrag](CHANGELOG.md) · `.github/workflows/release.yml` |
| **Fahrplan 1.3 / 2.0** — fünf unabhängige Expertenentwürfe, 1 454 Zeilen | **geplant, nichts gebaut** | [Fahrplan – 1.3 und 2.0](<entwicklung/Fahrplan – 1.3 und 2.0.md>) |
| **Team-Größe** — `maxMembers` von 8 auf 16 | eingetragen, wirkt nach Neustart | `~/.dsh/profiles/desktop/cordis.patch.yml` · [SITZUNGSABSCHLUSS](SITZUNGSABSCHLUSS.md) Regel 6 |

## 3 · Was gerade GILT (nicht neu herleiten, sondern benutzen)

**Prüfstand** — diese Zahlen sind gemessen, nicht geschätzt:

```
node tests/run.js            461/461 grün (53 Testdateien, 83 Module, 0 übersprungen)
python tools/ethos.py        GRÜN          python tools/klassen.py   0
node tools/sim-stand.js      unverändert   python tools/rauch.py     39/39 (echter Edge)
python tools/seite.py --pruefen   GRÜN: 35 Dokumente, kein toter Verweis
python bauen.py              118 Module, Version 1.2.4
```

**Veröffentlicht** (alles erreichbar, geprüft):
`vexx-oss.github.io/NetLab/` (Spiel) · `…/NetLab/doku/` (Doku) · Release `v1.2.4` mit drei Anhängen.
**Achtung:** die lebende Adresse ist `…/NetLab/`. `…/Side-Project/` gibt **HTTP 404** — ein alter
Kommentar behauptete eine Umleitung; das war falsch.

**Drei Fallen, die Zeit gekostet haben** (stehen ausführlich in [AGENTS.md](../AGENTS.md)):
* `bash.exe` scheitert in dieser Umgebung (Signal-Pipe, Win32-Fehler 5) → Tests direkt mit `node tests/run.js`.
* Ein Test ohne Zusicherungen galt früher als grün → `tests/harness.js` meldet jetzt „davon N übersprungen".
* In Doku-Tests keine feste Dokumentzahl verdrahten — sie wächst (genau daran wurde ein Test rot).

## 4 · Was als Nächstes zu tun ist

**Empfehlung, in dieser Reihenfolge** (Begründung im [Fahrplan](<entwicklung/Fahrplan – 1.3 und 2.0.md>)):

| | Schritt | Aufwand | Status |
|---|---|---|---|
| **0** | **Übergabe + „Ergebnis kopieren"** — „Neuer Azubi an diesem Rechner". Ohne das steckt der zweite Azubi im Auftrag des ersten (`src/ui/spiel.js:857`), und das Spiel ist ab der zweiten Unterrichtsstunde unbrauchbar | **0,5–1 Sitzung** | offen |
| **1** | **Karriere-Filter für Klassenraum** — eine Zeile neben `src/spiel/abnahme.js:118`. Heute filtert für `klasse…` **nichts**: gemessen **+33 €, +1 Ruf**, Wochenziel erfüllt, Kundenampel „grün" | **0,5 Sitzung** | offen |
| **2** | **67 Denkhilfen** (67 von 92 Minis ohne eigenen Anstoß) + Hilfe-Vorschläge (Ebene 2 fehlt **vollständig**, 10 Fertigkeiten ohne einen einzigen) | ~7 Sitzungen | offen |
| **3** | Drei gesperrte Trainingskarten (`lab.portsec`, `lab.stp`, `lab.storage` haben keinen Injektor) | 1–2 Sitzungen | offen |
| **4** | Lernmotor-Falle (`fremd/lernmotor.js:39` wirft einen Lernstand mit `v !== 1` **still** weg) | 0,5 Sitzung | offen |
| **5** | Klassenraum (Stufen A/B/E/F, ohne QR und ohne Server in der `.exe`) | 6–9 Sitzungen | braucht E1–E8 |

## 5 · Was nur der Nutzer entscheiden kann

Die **acht Entscheidungen E1–E8** aus [§ 8 des Klassenraum-Entwurfs](<entwicklung/Entwurf – Klassenraum-Umsetzung.md>);
die vier wichtigsten stehen als Tabelle im Fahrplan § 7. Die schwerste ist keine technische Frage:
**Soll ein Klassenraum-Auftrag bewertet werden?** Wenn ja, braucht es eine eigene Auswertung statt eines
Filters — und dann stellt sich die Frage nach **Noten**, die dieses Spiel bisher bewusst nicht stellt.

## 6 · Drei Fehler, die die Prüfung gefunden hat und die noch im Code stehen

1. **Ein Lernstand wird still weggeworfen** — `fremd/lernmotor.js:39` (`s.v === 1`, ohne Migration) und
   `:40` hält ihn im Verschluss: ein Import **nach** dem Start geht beim nächsten `save()` verloren.
2. **Ein Klassenraum-Auftrag verfälscht die Karriere** — elf Filterstellen nehmen nur `pruefung`/`raetsel`
   aus, `abnahme.js:118` leitet nur `training` um.
3. **Derselbe Code ergibt je Gerät einen anderen Auftrag** — `postfach.js:79`; und der „Klassenraum-Abdruck"
   würde es **nicht** merken, weil Geräte und Kabel gleich bleiben (neuer Testfall Nr. 41 nötig).

## 7 · Womit man anfängt, wenn man neu startet

```powershell
cd 10-Projekte\Lernprojekte\Netzwerk-Labor
$node = "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe"
& $node tests/run.js          # muss 461/461 grün melden
git status -sb                # muss "## ausbau-1.2...origin/ausbau-1.2" ohne Änderungen melden
```

Danach **eine** Datei lesen, je nach Auftrag: den [Fahrplan](<entwicklung/Fahrplan – 1.3 und 2.0.md>)
für die Richtung, [ARCHITEKTUR § 13](Architektur.md) für die Hilfestellung, [SITZUNGSABSCHLUSS](SITZUNGSABSCHLUSS.md)
für das Ende einer Sitzung.
