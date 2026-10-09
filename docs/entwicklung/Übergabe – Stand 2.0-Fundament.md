---
tags: [FISI, Lernspiel, Netzwerk, Übergabe, Kontext]
erstellt: 2026-10-09
status: Übergabezettel — bewusst kurz. Jüngster Stand (Fassung 2.0.0, noch nicht veröffentlicht); die Vorgängerfassung bleibt als Protokoll der Entscheidungsvorlage daneben stehen.
---

# Übergabe — Stand nach dem 2.0-Fundament (09.10.2026)

> **Warum diese Datei so kurz ist.** Ein neuer Lauf soll in **einer** Minute wissen, wo er steht, was gilt
> und was als Nächstes zu tun ist — mit Verweisen statt Wiederholungen. Die Vorgängerfassung
> [`Übergabe – Stand 09.10.2026.md`](<Übergabe – Stand 09.10.2026.md>) beschreibt die
> **Entscheidungsvorlage** (fünf Entwürfe, **nichts gebaut**); diese Datei beschreibt den **Bau** danach.
> Die vollständigen Zahlen stehen im [CHANGELOG](../CHANGELOG.md) § 2.0.0, die Begründungen im
> [Design](<Design – Spielspaß 2.0.md>) § 33.

## 1 · Wo wir stehen (in einem Satz)

Das **2.0-Fundament ist gebaut und gemessen**, und die **Klassenraum-Stufe A+B** (der Öffnungsweg) ist
**gebaut und gemessen**; alles zusammen ist als Fassung **2.0.0** verpackt — aber **noch nicht veröffentlicht**:
die Nummer steht in allen Erzeugnissen, Push und Tag `v2.0.0` fehlen (nur mit ausdrücklicher Freigabe des
Nutzers). Online ausgeliefert ist weiterhin 1.2.4. Die Stufen **C** (Live-Server) und **D** (QR) kommen
nach **E6** später.

## 2 · Was in dieser Sitzung entstanden ist

| Baustein | Stand | Wo es steht |
|---|---|---|
| **Übergabe** — „Neuer Azubi an diesem Rechner", vier Wege (Behalten/Löschen/Erst sichern/Abbrechen) | gebaut, 2.0.0 | `src/spiel/uebergabe.js` · `src/ui/uebergabe.js` · `src/stil/uebergabe.css` |
| **Ergebnis kopieren** — Klartext plus Knopf im Abschlussfenster | gebaut, 2.0.0 | `src/spiel/ergebnis.js` · `src/ui/spiel.js:511,543` |
| **Klassenraum-Karriere** — EINE Umleitung statt elf Filter | gebaut, 2.0.0 | `src/spiel/klassenraum.js` · `src/spiel/abnahme.js:126-127` |
| **Auftrags-Determinismus** — derselbe Code, derselbe Auftrag | gebaut, 2.0.0 | `src/spiel/postfach.js` · `src/spiel/flow.js` |
| **Hilfevorrat** — die Ticket-Stufe wird ausdrücklich gesetzt (6/4/2/0) | gebaut, 2.0.0 | `src/spiel/stufensystem.js` · `src/spiel/hilfe.js` |
| **Trainingskarten** — alle drei offen (`lab.portsec`, `lab.stp`, `lab.storage`), Injektoren 36 → 39 | gebaut, 2.0.0 | `src/spiel/injektoren.js` · `src/daten/trainings.js` |
| **Denkhilfen** — 91 von 92 Minis mit eigenem Anstoß (vorher 25) | gebaut, 2.0.0 | `src/daten/mini-denkhilfen.js` · `src/daten/mini-denkhilfen2.js` |
| **Hilfe-Vorschläge Ebene 2** — 44 statt 29, Ebene 2 von 0 auf 15, alle 27 Fertigkeiten abgedeckt | gebaut, 2.0.0 | `src/daten/hilfen.js` |
| **Wiki 2.0** — dünnste Seiten gefüllt, IPv6 (5 Seiten) und WLAN (3 Seiten) nachgetragen | gebaut, 2.0.0 | `src/daten/wiki.js` |
| **Lernmotor-Wache** — unsere Seite der Falle, plus Befund als Vorlage für die Spielhalle | gebaut, 2.0.0 | `tests/lernmotor-wache.test.js` · [Befund – Lernmotor-Falle](<Befund – Lernmotor-Falle.md>) |
| **Wiederholungssperre** — Rotation statt Filter (20 Runden: 11 Minis/9 Wiederholungen → 20/0) | gebaut, 2.0.0 | `src/spiel/mini.js` · `src/spiel/mischer.js` |
| **Nächster Schritt sichtbar** — Führung nur auf Bedarf (90 s, nach Fehler, `meister` nie) | gebaut, 2.0.0 | `src/spiel/naechster.js` · `src/ui/netzplan.js` · `src/stil/naechster.css` |
| **Fragen-Generator** — 11 Vorlagen, 20 Denkfehler, deterministisch aus dem Seed | gebaut, 2.0.0 | `src/daten/fragen-vorlagen.js` · `src/spiel/fragen.js` |

Dazu die **unabhängige Gegenprüfung** ([Review – 2.0-Fundament](<Review – 2.0-Fundament.md>)) und eine
Abnahmedatei, die das Fundament im echten Fluss durchspielt (`tests/2.0-abnahme.test.js`).

**Zweite Hälfte derselben Fassung: der Öffnungsweg (Klassenraum Stufe A+B).**

| Was | Stand | Wo es steht |
|---|---|---|
| **Codec** — Auftragscode `NL-XXXX-XX`, Ergebnis-Code `E-XXXX-XXX`, Prüfzeichen, Kanonisierung, Abdruck (6 Zeichen), eingefrorene Tabellen **58/27** | gebaut, gemessen | `src/spiel/klassenraum-codec.js` |
| **Verwaltung** — `Spiel.klassenraum` (16 Namen), Store-Schlüssel `klassenraum` (`fassung: 1`), Öffnungsweg `quelle: "klassenraum"` | gebaut, gemessen | `src/spiel/klassenraum.js` · `src/spiel/zustand.js` |
| **Zwei Ansichten** — `klassenraum` (Lehrkraft: Code groß und kopierbar, Ampel, Block-Eingabe, ein Hausdialog) und `mitarbeit` (Azubi: Code eingeben, Tippfehler markiert) | gebaut, gemessen | `src/ui/klassenraum.js` · `src/stil/klassenraum.css` |
| **Einhängen** — Startseiten-Zeile über den Bus-Haken, Ergebnis-Code als Toast über den Kanal `klassenraum` | gebaut, gemessen | Bus-Ereignisse `ansicht`/`zustand-geaendert`/`spiel-geladen`; `src/ui/hub.js` bleibt unberührt |
| **Keine Bewertung · kein Server · kein QR** | entschieden; Stufe C/D offen | [`Architektur.md`](../Architektur.md) § 12.1/§ 12.2 |

Der Vertrag steht in [`Architektur.md`](../Architektur.md) § 12/§ 12.1/§ 12.2; die Bau-Entscheidungen
**L1–L5** und der entschiedene Punkt **O1** (die Platzzahl bleibt im Datei-Dialog, **kein** siebtes
Bedienelement) stehen dort bzw. im [CHANGELOG](../CHANGELOG.md) § 2.0.0 „Klassenraum Stufe A+B".

## 3 · Was gerade GILT (nicht neu herleiten, sondern benutzen)

**Prüfstand 2.0.0.** „Vom Lead gemessen" heißt: ich habe die Zahl nicht selbst erhoben, sondern aus dem
Lauf des Leads übernommen. „Selbst gemessen" heißt: in dieser Sitzung nachgerechnet.

| Prüfung | Ergebnis |
|---|---|
| `sh tools/test.sh` (Endstand **mit** Klassenraum A+B) | **661/661 grün**, 74 Testdateien, 91 Module, **0 übersprungen**, Exit 0 (Lead) |
| dieselbe Messung am Ende des Fundaments | 620/620 grün, 70 Testdateien, 90 Module (selbst gemessen) |
| dieselbe Messung **vor** der Sitzung | 471/479 grün, **8 rot**, 55 Testdateien, 84 Module (Nullmessung des Leads) |
| `node tests/run.js klassenraum` | **67/67 grün** — der richtige Filter; `--klassenraum` liefert **0/0** (Befund K2) (Lead) |
| `tools/ethos.py` · `tools/klassen.py` · `tools/sim-stand.js` | GRÜN · **0** Klassen ohne CSS-Regel · Simulation **unverändert** (Lead) |
| `python bauen.py` | **128 Module, 2202 KB**, Version **2.0.0** (Lead) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.791.782 B**, SHA256 `D7D45F13…A4A2`, byte-gleich, 0 Außenverweise (Lead; Bytes und Hash selbst nachgerechnet) |
| Android-APK 2.0.0 | **1.148.444 B**, SHA256 `A9526120…D988` (Lead; Bytes und Hash selbst nachgerechnet) |
| `tools/seite.py --pruefen` | GRÜN: 39 Dokumente — nach dem Doku-Neubau **40** (Lead) |
| `tools/seite-pruefen.py` | in dieser Runde **nicht** gemessen |

**Klassenraum Stufe A+B ist gemessen.** Die Tabelle zeigt den Endstand **nach** dieser Stufe; darunter
stehen die Zeilen „am Ende des Fundaments" und „vor der Sitzung", damit der Weg sichtbar bleibt.

**Vier Regeln, die diese Sitzung gesetzt hat:**

* **Der Lernmotor gehört uns nicht.** `fremd/lernmotor.js` trägt im Kopf „FREMDE DATEI — NICHT HIER
  BEARBEITEN"; die Quelle liegt außerhalb des Projektordners und hat beim Laden **Vorrang** — Änderungen
  gehören in die FISI-Spielhalle und werden mit `python tools/lernmotor.py --neu-einlesen` übernommen.
  Unsere Seite ist durch eine **Wache** geschützt: der Lernstand geht ausschließlich über die `L.*`-API.
  Der offene Teil steht als Vorlage in [Befund – Lernmotor-Falle](<Befund – Lernmotor-Falle.md>).
* **Klassenraum wird umgeleitet, nicht gefiltert** (Entscheidung E2 aus
  [Entwurf – Klassenraum-Umsetzung](<Entwurf – Klassenraum-Umsetzung.md>)): EINE Zeile in
  `src/spiel/abnahme.js:126-127` leitet `quelle === "klassenraum"` um, **bevor** irgendein Nebeneffekt
  greift. Die elf Filterstellen sind toter Vorsorge-Code und bleiben es.
* **Determinismus ist eine Zusage, keine Absicht.** Derselbe Code mit demselben Seed ergibt denselben
  Auftrag — unabhängig vom lokalen Flow-Stand. Bewiesen wird das über `def.id`, nicht über Ziele, Geräte
  oder Kabellisten: die bleiben in allen Flow-Ständen gleich und würden die Abweichung **nicht** bemerken.
* **Ein Test ohne Zusicherung ist kein Test — und ein Zwischenstand ist kein Endstand.** `tests/harness.js`
  zählt Zusicherungen („davon N übersprungen"); der Prüfer maß um 15:31 noch **591/593**, erst der Lauf
  nach dem letzten Bau-Task zählt: **620/620**.

## 4 · Was als Nächstes zu tun ist

| | Schritt | Stand |
|---|---|---|
| **a** | **Stand-Tabelle in [`Architektur.md`](../Architektur.md)** nachziehen — gehört dem **Lead** | offen (Lead) |
| **b** | **`python tools/seite.py` erneut laufen lassen**: die Doku-Seiten unter `docs/doku/` wurden um **15:56:28** erzeugt und sind damit **älter** als die vier Dokumente des Stand-Nachziehens | offen (Lead) |
| **c** | **Lokal committen** — vorher die Zeilenenden prüfen (Byte-Vergleich, Schritt 6 des Protokolls) | offen (Lead) |
| **d** | **Push und Tag `v2.0.0`** — je Handlung **einzeln** freigeben lassen; danach Schritt 8: nachmessen, was wirklich online steht | offen, entscheidet der Nutzer |
| **e** | **`.exe` neu bauen** (Rust) — in dieser Sitzung **nicht** geschehen; die APK ist gebaut | offen, wenn gewünscht |
| **f** | **Klassenraum:** Stufe **A+B** (Codec, Lehrkräfte-Ansicht, „Code eingeben") ist **gebaut**; **Stufe C** (Live-Server) und **D** (QR) kommen nach **E6** später; **O1** (Klassenstärke: sechstes oder siebtes Bedienelement) entscheidet die Leitung | A+B gebaut, C/D offen — [`Architektur.md`](../Architektur.md) § 12.1/§ 12.2 |

## 5 · Was entschieden ist — und was nur der Nutzer entscheiden kann

**Entschieden am 09.10.2026, wörtlich: „Nein, Lehreraufträge sollen nicht bewertet werden."** Damit gibt es
**keine Note, keine Punkte, keine Rangfolge und keinen Vergleich zwischen Azubis**; ein Klassenraum-Auftrag
zählt ausschließlich für den Lernstand des Einzelnen. Die im Fahrplan genannte Alternative — eine **eigene
Auswertung statt eines Filters** — **entfällt**: die Umleitung nach E2 ist die ganze Lösung, und das
ausgelieferte Verhalten von 2.0.0 erfüllt sie bereits. Die vollständige Entscheidungstabelle **E1–E8** steht
in [`Architektur.md`](../Architektur.md) § 12.1 (E1, E2, E4, E8 umgesetzt; E3, E5, E6 entschieden bzw.
offen; E7 überholt) — dort nachsehen, hier nicht wiederholen.

Offen bleibt nur:

1. **Ob veröffentlicht wird.** Push, Tag und Release gibt es nur auf ausdrückliche Freigabe, und zwar je
   Handlung einzeln (siehe [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md), Schritt 7). Die
   **Zielnummer 2.0.0** ist entschieden (Auftrag „bis zum Production Release").

## 6 · Was ehrlich offen blieb

* **Kein Browserlauf, kein Bild:** `tools/rauch.py` und `tools/menueprobe.py` liefen nicht; es gibt kein
  Bildschirmfoto und keine Pixelmessung dieser Fassung.
* **Die `.exe` wurde nicht neu gebaut** und nicht gestartet — ihre Fassungsnummer ist **nicht gemessen**.
* **Keine echte Unterrichtsstunde**, kein Test mit einem Menschen.
* **Klassenraum Stufe C und D** (Live-Server, QR) sind **nicht gebaut** — nach E6 später.
* **O1 ist entschieden:** die Platzzahl bleibt im Datei-Dialog, es gibt **kein** siebtes Bedienelement;
  ohne Platzzahl sagt die Ampel ausdrücklich „Plätze nicht eingestellt".
* Die **Klassenraum-Stufe A+B** ist gemessen (661/661; Filter `klassenraum` 67/67) — aber **kein
  Browserlauf** hat die zwei neuen Ansichten gesehen (`tools/rauch.py` kennt sie nicht).
* Die **online** veröffentlichte Seite liefert weiterhin 1.2.4, weil nicht gepusht wurde.
* Die Testzahl **620** kommt aus dem Lauf; statisch gezählt sind es 613 `pruefe(`-Stellen in 70 Testdateien
  — die Differenz entsteht durch Tests in Schleifen und ist **nicht aufgeklärt**.
* Der Prüfer hat den **Lernmotor-Befund** nicht selbst nachgemessen und die **FISI-Spielhalle** nicht
  geöffnet (gelesen, nicht gemessen). Was dort zu tun ist, steht als Vorlage im
  [Befund](<Befund – Lernmotor-Falle.md>) — **nicht ausgeführt**.

## 7 · Womit man anfängt, wenn man neu startet

```powershell
cd 10-Projekte\Lernprojekte\Netzwerk-Labor
$node = "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe"
& $node tests/run.js          # muss 620/620 grün melden, 0 rot, 0 übersprungen
python tools/ethos.py         # GRUEN gegen tests/stil-stand.json
python tools/klassen.py       # 0 Klassen ohne CSS-Regel
node tools/sim-stand.js       # Simulation unverändert gegenüber dem Referenzstand
python bauen.py               # src/ -> web/, Version 2.0.0
```

Danach **eine** Datei lesen, je nach Auftrag: den [Fahrplan 1.3/2.0](<Fahrplan – 1.3 und 2.0.md>) für die
Richtung, [`Architektur.md`](../Architektur.md) für die Verträge, das [CHANGELOG](../CHANGELOG.md) für die
gemessenen Zahlen, [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md) für das Ende einer Sitzung.
