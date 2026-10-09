---
tags: [FISI, Lernspiel, Netzwerk, Übergabe, Kontext]
erstellt: 2026-10-09
status: Übergabezettel — bewusst kurz. Jüngster Stand (Fassung 2.0.0 mit Fundament, Klassenraum A+B und Output-Runde; noch nicht veröffentlicht); die Vorgängerfassung bleibt als Protokoll der Entscheidungsvorlage daneben stehen.
---

# Übergabe — Stand nach dem 2.0-Fundament und der Output-Runde (09.10.2026)

> **Warum diese Datei so kurz ist.** Ein neuer Lauf soll in **einer** Minute wissen, wo er steht, was gilt
> und was als Nächstes zu tun ist — mit Verweisen statt Wiederholungen. Die Vorgängerfassung
> [`Übergabe – Stand 09.10.2026.md`](<Übergabe – Stand 09.10.2026.md>) beschreibt die
> **Entscheidungsvorlage** (fünf Entwürfe, **nichts gebaut**); diese Datei beschreibt den **Bau** danach.
> Die vollständigen Zahlen stehen im [CHANGELOG](../CHANGELOG.md) (drei Abschnitte zu 2.0.0), die
> Begründungen im [Design](<Design – Spielspaß 2.0.md>) § 33, § 34 und § 35.

## 1 · Wo wir stehen (in einem Satz)

**Drei Runden derselben Fassung sind gebaut und gemessen** — das Fundament, der Klassenraum-Öffnungsweg
(Stufe A+B) und die Output-Runde (Trefferflächen, Altlasten, R12) —, alles zusammen ist als Fassung
**2.0.0** verpackt, aber **noch nicht veröffentlicht**: Push und Tag `v2.0.0` fehlen (nur mit Freigabe des
Nutzers). Online ausgeliefert ist weiterhin 1.2.4. Die Klassenraum-Stufen **C** (Live-Server) und **D** (QR)
kommen nach **E6** später.

## 2 · Was in dieser Sitzung entstanden ist

**Erste Runde — das Fundament.**

| Baustein | Wo es steht |
|---|---|
| **Übergabe** — „Neuer Azubi an diesem Rechner", vier Wege | `src/spiel/uebergabe.js` · `src/ui/uebergabe.js` · `src/stil/uebergabe.css` |
| **Ergebnis kopieren** — Klartext plus Knopf im Abschlussfenster | `src/spiel/ergebnis.js` · `src/ui/spiel.js:511,543` |
| **Klassenraum-Karriere** — EINE Umleitung statt elf Filter, keine Bewertung | `src/spiel/klassenraum.js` · `src/spiel/abnahme.js:126-127` |
| **Auftrags-Determinismus** — derselbe Code, derselbe Auftrag (über `def.id`) | `src/spiel/postfach.js` · `src/spiel/flow.js` |
| **Hilfevorrat** — Ticket-Stufe ausdrücklich gesetzt (6/4/2/0) | `src/spiel/stufensystem.js` · `src/spiel/hilfe.js` |
| **Trainingskarten** — alle drei offen, Injektoren 36 → 39 | `src/spiel/injektoren.js` · `src/daten/trainings.js` |
| **Denkhilfen** — 91 von 92 Minis (vorher 25) | `src/daten/mini-denkhilfen.js` · `mini-denkhilfen2.js` |
| **Hilfe-Vorschläge Ebene 2** — 44 statt 29, alle 27 Fertigkeiten abgedeckt | `src/daten/hilfen.js` |
| **Lernmotor-Wache** — unsere Seite der Falle | `tests/lernmotor-wache.test.js` · [Befund – Lernmotor-Falle](<Befund – Lernmotor-Falle.md>) |
| **Wiederholungssperre** — Rotation statt Filter (20 Runden: 9 Wiederholungen → 0) | `src/spiel/mini.js` · `src/spiel/mischer.js` |
| **Nächster Schritt sichtbar** — Führung nur auf Bedarf | `src/spiel/naechster.js` · `src/ui/netzplan.js` |
| **Fragen-Generator** — 11 Vorlagen, 20 Denkfehler, deterministisch | `src/daten/fragen-vorlagen.js` · `src/spiel/fragen.js` |

**Zweite Runde — der Öffnungsweg (Klassenraum Stufe A+B).**

| Was | Wo es steht |
|---|---|
| **Codec** — `NL-XXXX-XX`, `E-XXXX-XXX`, Prüfzeichen, Kanonisierung, Abdruck, Tabellen **58/27** | `src/spiel/klassenraum-codec.js` |
| **Verwaltung** — `Spiel.klassenraum` (16 Namen), Store `klassenraum` (`fassung: 1`), Öffnungsweg | `src/spiel/klassenraum.js` · `src/spiel/zustand.js` |
| **Zwei Ansichten** — `klassenraum` (Lehrkraft) und `mitarbeit` (Azubi) | `src/ui/klassenraum.js` · `src/stil/klassenraum.css` |
| **Einhängen** — Startseiten-Zeile über den Bus-Haken, Ergebnis-Code als Toast | Bus-Ereignisse `ansicht`/`klassenraum`; `src/ui/hub.js` blieb unberührt |
| **Keine Bewertung · kein Server · kein QR** | [`Architektur.md`](../Architektur.md) § 12.1/§ 12.2 |

**Dritte Runde — die Output-Runde (Trefferflächen, Altlasten, R12).**

| Was | Beleg |
|---|---|
| **14 CSS-Dateien** in `src/stil/`: Trefferflächen ≥ 44 px, R1–R4 auf Tokens/Skalen, R5/R6/R8/R10 **auf 0** | `44px` 3 → 11; ethos besser als der Stand (R5 70→0 · R6 11→0 · R8 5→0 · R10 87→0) |
| **R8 gelöscht statt verschoben** — fünf Zusatzblöcke weg, `basis.css` byte-identisch | „Bewegung reduzieren" = „1 ms statt aus"; **ein benannter Verlust** (s. § 6) |
| **R12 misst jetzt wirklich** — ohne `--dom` steht „NICHT GEMESSEN" | im Programm `klasse` 6/6, `Auftrag` 3/3 |
| **Menüprobe grün** — Web **45 erfüllt / 0 verletzt**, Android **49 erfüllt / 0 verletzt** (je 5 von 5 Profilen) | vorher rot (36 von 43); Ursache war ein Menü mit `z-index: 40` unter dem Dock-Blatt |
| **Rauchtest erweitert** — die zwei Klassenraum-Ansichten als echte Wege | 39/39 bei 12 → **45/45** bei 14 Fällen |
| **Wiki** — zwei neue Seiten „Klassenraum" und „Übergabe" | **29 Seiten / 107 Abschnitte** |
| **Nachweise** — 10 Bildschirmfotos + 1 Exportdatei der fünf Vorführschritte | `Nachweise/Klassenraum/`; Code `NL-9ACQ-AM`, Abdruck `3U9JGE`, Ampel 1/2 → 2/2 |

Berichte: [Review – 2.0-Fundament](<Review – 2.0-Fundament.md>) ·
[Review – Klassenraum A+B](<Review – Klassenraum A+B.md>) ·
[Befund – Output-Runde](<Befund – Output-Runde.md>) · [Befund – 27 von 27](<Befund – 27 von 27.md>).

## 3 · Was gerade GILT (nicht neu herleiten, sondern benutzen)

**Prüfstand 2.0.0.** „Vom Lead gemessen" heißt: nicht selbst erhoben, sondern übernommen. „Selbst gemessen"
heißt: in dieser Sitzung nachgerechnet.

| Prüfung | Ergebnis |
|---|---|
| `sh tools/test.sh` (Endstand **mit** der Output-Runde) | **725/725 grün**, 81 Testdateien, 91 Module, **0 übersprungen**, Exit 0 (selbst gemessen) |
| dieselbe Messung am Ende von Klassenraum A+B / des Fundaments | 661/661 (74/91) · 620/620 (70/90) (selbst gemessen) |
| dieselbe Messung **vor** der Sitzung | 471/479 grün, **8 rot**, 55 Testdateien, 84 Module (Nullmessung des Leads) |
| `node tests/run.js klassenraum` | **67/67** — der richtige Filter; `--klassenraum` liefert **0/0** (Befund K2) (Lead) |
| `tools/ethos.py` | **GRUEN**, besser als der Stand: R1 23→22 · R2 122→113 · R3 206→195 · R4 539→514 · R5 70→0 · R6 11→0 · R8 5→0 · R10 87→0 (selbst gemessen) |
| `tools/klassen.py` · `node tools/sim-stand.js` | **0** Klassen ohne CSS-Regel · Simulation **unverändert** (12/12) (selbst gemessen) |
| Menüprobe Web · Android | **45 erfüllt, 0 verletzt** · **49 erfüllt, 0 verletzt** (je 5 von 5 Profilen) (selbst gemessen) |
| `tools/rauch.py` | **45/45** (14 Ansichten × 3 Breiten) (Lead; der Aufbau ist im Quelltext nachgezählt) |
| R12 im Programm (`ethos.r12_js()`) | `klasse` **6/6**, `Auftrag` **3/3** (Lead) |
| `python bauen.py` | **128 Module, 2225 KB** → `web/index.html`, Version **2.0.0** (Lead) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.829.477 B**, SHA256 `C3C51EDA…828E`, byte-gleich, **0 Außenverweise** (Lead; Bytes und Hash selbst nachgerechnet) |
| Android-APK 2.0.0 | **1.160.732 B**, SHA256 `A27751B2…F93733`, Signatur gültig (Lead; Bytes und Hash selbst nachgerechnet) |
| `tools/seite.py --pruefen` | GRÜN: 39 Dokumente — nach dem Doku-Neubau **40** (Lead) |

**Vier Regeln, die diese Sitzung gesetzt hat:**

* **Der Lernmotor gehört uns nicht.** `fremd/lernmotor.js` trägt „FREMDE DATEI — NICHT HIER BEARBEITEN";
  die Quelle liegt außerhalb des Projektordners und hat beim Laden **Vorrang**. Unsere Seite ist durch eine
  **Wache** geschützt (Lernstand nur über die `L.*`-API); der offene Teil steht im
  [Befund](<Befund – Lernmotor-Falle.md>).
* **Klassenraum wird umgeleitet, nicht gefiltert** (E2): EINE Zeile in `src/spiel/abnahme.js:126-127`,
  **vor** jedem Nebeneffekt. Die elf Filterstellen bleiben toter Vorsorge-Code.
* **Determinismus ist eine Zusage.** Derselbe Code mit demselben Seed ergibt denselben Auftrag — bewiesen
  über `def.id`, nicht über Ziele, Geräte oder Kabellisten.
* **Ein Zwischenstand ist kein Endstand, und ein grüner Zähler ist kein Beweis.** `tests/harness.js` zählt
  Zusicherungen; R12 meldete jahrelang „0 sichtbare Elemente — eingehalten", ohne etwas zu messen, und der
  gefährlichste Befund der Output-Runde war „grün, aber ohne Wirkung" (Dokument D: `--klassenraum` → 0/0).

## 4 · Was als Nächstes zu tun ist

| | Schritt | Stand |
|---|---|---|
| **a** | **`python tools/seite.py` erneut laufen lassen** — `docs/doku/` ist älter als die Dokumente dieses Stand-Nachziehens; danach sind es **40** Dokumente | offen (Lead) |
| **b** | **Stand-Tabelle in [`Architektur.md`](../Architektur.md)** nachziehen — gehört dem **Lead** | offen (Lead) |
| **c** | **Lokal committen** — vorher die Zeilenenden prüfen (Byte-Vergleich, Schritt 6 des Protokolls) | offen (Lead) |
| **d** | **Push und Tag `v2.0.0`** — je Handlung **einzeln** freigeben lassen; danach Schritt 8: nachmessen, was online steht | offen, entscheidet der Nutzer |
| **e** | **Desktop-Release-Bau** der Hülle — beim Schreiben lief er noch; die APK ist gebaut | offen (Lead) |
| **f** | **Klassenraum:** Stufe **C** (Live-Server) und **D** (QR) nach **E6**; **O1** ist entschieden (Platzzahl bleibt im Datei-Dialog, kein siebtes Bedienelement) | offen — [`Architektur.md`](../Architektur.md) § 12 |

## 5 · Was entschieden ist — und was nur der Nutzer entscheiden kann

**Entschieden am 09.10.2026, wörtlich: „Nein, Lehreraufträge sollen nicht bewertet werden."** Damit gibt es
**keine Note, keine Punkte, keine Rangfolge und keinen Vergleich zwischen Azubis**; ein Klassenraum-Auftrag
zählt ausschließlich für den Lernstand des Einzelnen. Die Fahrplan-Alternative „eigene Auswertung statt
eines Filters" **entfällt** — die Umleitung nach E2 ist die ganze Lösung. Die Entscheidungstabelle **E1–E8**
steht in [`Architektur.md`](../Architektur.md) § 12.1, die Bau-Entscheidungen **L1–L5** in § 12.2.

Offen bleibt nur:

1. **Ob veröffentlicht wird.** Push, Tag und Release gibt es nur auf ausdrückliche Freigabe, und zwar je
   Handlung einzeln (siehe [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md), Schritt 7). Die
   **Zielnummer 2.0.0** ist entschieden (Auftrag „bis zum Production Release").

## 6 · Was ehrlich offen blieb

* **Der eine R8-Verlust:** `.ger[class*="jc-"] .gb` und `.kabel[class*="jc-"] *` haben im ganzen `src/stil/`
  keine Regel mehr, obwohl `UI.juice(el,"einrasten")` auf Kabelelementen gerufen wird — für „Bewegung
  reduzieren" liefen diese Animationen vorher **gar nicht**, jetzt in **1 ms**. Ob man das sieht, ist
  **nicht gemessen**.
* **Kein `ethos.py --dom` gegen die Release-Hülle:** R12 lief gegen **Debug-Bau** und **Web-Bau**.
* **Kein Aufnahmeprogramm:** die Bildschirmfotos in `Nachweise/Klassenraum/` sind über CDP entstanden.
* **`prefers-reduced-motion` ist im Browser nicht gemessen** (dem Werkzeug fehlt `Emulation.setEmulatedMedia`);
  die **720-px-Frage im Einstellungsdialog** ebenfalls nicht (die Menüprobe erreicht den Dialog nicht).
* **Die Erzeugnis-Hashes sind Momentaufnahmen:** die letzten CSS-Werte steckten beim Messen noch nicht im
  Artefakt, und ein Desktop-Release-Bau lief noch.
* **`tests/stil-stand.json` deckt R2/R3/R4 noch nicht** — der Lauf meldet erneut „BESSER als der Stand"
  (R2 121→113 · R3 204→195 · R4 530→514); ein weiteres `ethos.py --neu` gehört der Leitung.
* **Keine echte Unterrichtsstunde**, kein Test mit einem Menschen.
* **Klassenraum Stufe C und D** (Live-Server, QR) sind **nicht gebaut** — nach E6 später.
* Die **online** veröffentlichte Seite liefert weiterhin 1.2.4, weil nicht gepusht wurde.
* Der Prüfer hat den **Lernmotor-Befund** nicht selbst nachgemessen und die **FISI-Spielhalle** nicht
  geöffnet (gelesen, nicht gemessen) — was dort zu tun ist, steht als Vorlage im
  [Befund](<Befund – Lernmotor-Falle.md>), **nicht ausgeführt**.

## 7 · Womit man anfängt, wenn man neu startet

```powershell
cd 10-Projekte\Lernprojekte\Netzwerk-Labor
$node = "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe"
& $node tests/run.js          # muss 725/725 grün melden, 0 rot, 0 übersprungen
python tools/ethos.py         # GRUEN gegen tests/stil-stand.json (R12 nur mit --dom)
python tools/klassen.py       # 0 Klassen ohne CSS-Regel
node tools/sim-stand.js       # Simulation unverändert gegenüber dem Referenzstand
python tools/menueprobe.py --datei web/index.html --lauf   # 5 von 5 Profilen, 45 erfüllt, 0 verletzt
python bauen.py               # src/ -> web/, Version 2.0.0
```

Danach **eine** Datei lesen, je nach Auftrag: den [Fahrplan 1.3/2.0](<Fahrplan – 1.3 und 2.0.md>) für die
Richtung, [`Architektur.md`](../Architektur.md) für die Verträge, das [CHANGELOG](../CHANGELOG.md) für die
gemessenen Zahlen, [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md) für das Ende einer Sitzung.
