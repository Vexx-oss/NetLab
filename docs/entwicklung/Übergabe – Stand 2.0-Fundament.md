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
**Die Fassung steht auf 2.0.4 und ist veröffentlicht.** Getaggt sind **`v2.0.0`** (09.10., 14:44 UTC),
**`v2.0.1`** (16:40), **`v2.0.2`** (17:07), **`v2.0.3`** (18:16) und **`v2.0.4`** (19:56); die **Live-Seite
liefert 2.0.4** und ist **byte-gleich** zum lokalen Bau (2.893.778 B, `C3D3835B…4088`, selbst
nachgerechnet). **Alle älteren Fassungen bleiben unverändert stehen** (kein `--force`). Offen sind nur: die
zwei **Repository-Secrets** (dann hängt der Android-Job die APK an), eine **APK für 2.0.4** und die
**`.exe` im Release `v2.0.4`** (beim Messen trug es zwei Anhänge — bei 2.0.2 und 2.0.3 kam sie jeweils nach). Die Klassenraum-Stufen **C** (Live-Server) und **D** (QR) kommen
nach **E6** später.

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

**Sechste Runde — Überlappung und verschiebbare Dialoge (2.0.4).** Zwei Befunde des Nutzers mit Bild:
die „1" zwischen Werkzeugen und Ebenen-Knopf war der Mappen-Reiter „Ziele 0/1", der wegen eines **eigenen
Stapelkontexts** (`.am-mappe` in `.lb-auftrag`) **unter** der Leiste malte — bei **allen 25** Breiten von 640
bis 1600 px; behoben über eine **gemessene Leistenhöhe** (`--leiste-h`, `src/ui/editor.js:114-119`) und
`--am-kopfraum` (`src/stil/spiel.css:31-41`), danach Reiter **y=187** und **0 Auffälligkeiten** in 25
Breiten. Dazu: **Dialoge sind verschiebbar** (`.dialog-kopf`, geklemmt 12 px, immer mittig startend) — der
Drag-Test ist ein **Entwurf außerhalb der Suite** (`Nachweise/ui-dialog-ziehen.entwurf.js`), **nicht**
„getestet". Neu: `tests/ui-leiste-ueberlappung.test.js` (**4 Fälle**).

**Fünfte Runde — der Hilfecode (2.0.3).** Der letzte offene Punkt aus Säule 5 des 3.0-Konzepts:
**`H-XXXX-XX`** (9 Zeichen, 20 Nutzbit: `sitzung · platz · schritt · offen`), `Spiel.klassenraum.hilfeCode`
und `hilfeLesen`, **kein Personenbezug** (`name`/`note`/`rang`/`punkte` ändern den Code nicht); ein Knopf
**„Ich hänge"** in der **Auftragsmappe des Labors**, der den Code im Knopf zeigt und kopiert; die Lehrkraft
liest ihn in ihrer **bestehenden** Block-Ausgabe als Klartext („Platz 7 hängt: 0 von 3 Zielen erfüllt") —
**kein neues Bedienelement**. Messungen (Leitung): Round-Trip **1.015.808** Nutzlasten ohne Abweichung,
**32.768/32.768** `sitzung = 0` abgewiesen, **86/86** Tippfehler erkannt.

**Vierte Runde — Inhalte und Diagnose (2.0.2).** Minis **92 → 116**, Denkhilfen **91 → 115** (neu:
`src/daten/mini-denkhilfen3.js` mit **24** Anstößen); Injektoren **39 → 45**, Trainingskarten **34 → 40**,
vier vorher ungenutzte Grundcodes belegt; die Ampel der Lehrkraft zeigt jetzt **„Fortschritt: 7 von 20
offen · 3 Abgaben in den letzten 5 Minuten · letzte Abgabe vor 2 Minuten"** — **nur anonyme Zahlen**, kein
Name, kein Rang, kein neues Bedienelement; der Android-Job **warnt** bei fehlenden Secrets statt rot zu
werden. Selbst nachgezählt: **116 Minis**, **115 Denkhilfen** (60 + 31 + 24), **45 Injektoren**, **40
Karten**; `mini-link-2` bleibt als einziges Mini ohne Eintrag (absichtlich).

**Nachzügler derselben Runde:** `tests/klassen-20.test.js` (20 Geräte aus **einem** Code, Ampel **20/20**,
349 ms) · [Markt – Monetarisierung](<Markt – Monetarisierung.md>) (Marktteil mit 20 Quellen, 9
Wettbewerbern und dem Abschnitt „was NICHT funktionieren wird") ·
[Bilanz – Agententeam 2.0](<Bilanz – Agententeam 2.0.md>) (Erfolgsquote streng **87,8 %** der Aufgaben,
**66,7 %** der Zusagen; neun Ausfälle namentlich).

## 3 · Was gerade GILT (nicht neu herleiten, sondern benutzen)

**Prüfstand 2.0.0.** „Vom Lead gemessen" heißt: nicht selbst erhoben, sondern übernommen. „Selbst gemessen"
heißt: in dieser Sitzung nachgerechnet.

| Prüfung | Ergebnis |
|---|---|
| `sh tools/test.sh --rauch` (Endstand 2.0.4) | **Exit 0** — **768/768 grün**, 87 Testdateien, 92 Module, **0 übersprungen** (selbst gemessen); Rauchtest **45/45** (Lead) |
| dieselbe Messung am Ende von Klassenraum A+B / des Fundaments | 661/661 (74/91) · 620/620 (70/90) (selbst gemessen) |
| dieselbe Messung **vor** der Sitzung | 471/479 grün, **8 rot**, 55 Testdateien, 84 Module (Nullmessung des Leads) |
| `node tests/run.js --klassenraum` | **104/104 grün** (selbst gemessen) — der Filter schneidet führende Striche ab (Befund **K2 behoben**); ein Filter **ohne** Treffer endet mit **Exit 1** und der Meldung „KEIN Test passt zum Filter … Das ist kein grüner Lauf." |
| `tools/ethos.py` | **GRUEN**, besser als der Stand: R1 23→22 · R2 122→113 · R3 206→195 · R4 539→514 · R5 70→0 · R6 11→0 · R8 5→0 · R10 87→0 (selbst gemessen) |
| `tools/klassen.py` · `node tools/sim-stand.js` | **0** Klassen ohne CSS-Regel · Simulation **unverändert** (12/12) (selbst gemessen) |
| Menüprobe Web · Android | **45 erfüllt, 0 verletzt** · **49 erfüllt, 0 verletzt** (je 5 von 5 Profilen) (selbst gemessen) |
| `tools/rauch.py` | **45/45** (14 Ansichten × 3 Breiten) (Lead; der Aufbau ist im Quelltext nachgezählt) |
| R12 im Programm (`ethos.r12_js()`) | `klasse` **6/6**, `Auftrag` **3/3** (Lead) |
| `python bauen.py` | **129 Module, 2300 KB**, Version **2.0.4**; **`VERSION_CODE` 20005** (Lead) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.874.964 B**, SHA256 `E913A613…37F3`, byte-gleich, **0 Außenverweise** und **live byte-gleich** (Lead; Größe, Hash und Live-Vergleich selbst nachgerechnet) |
| Android-APK **2.0.4** | **1.185.308 B**, Signatur gültig — **ohne Prüfsumme**, weil nicht reproduzierbar; nur die **Größe** ist stabil (selbst gemessen) |
| `tools/seite.py --pruefen` | GRÜN: **45 Dokumente** (Lead, nach dem Neubau) |

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
| **a** | **`python tools/seite.py` erneut laufen lassen** — nach diesem Nachzug ist `docs/doku/` wieder älter als die Quellen; es sind dann **45** Dokumente | offen (Lead) |
| **b** | **Stand-Tabelle in [`Architektur.md`](../Architektur.md)** nachziehen — gehört dem **Lead** | offen (Lead) |
| **c** | **Lokal committen** — vorher die Zeilenenden prüfen (Byte-Vergleich, Schritt 6 des Protokolls) | offen (Lead) |
| **d** | **Schritt 8 nachmessen:** Release **`v2.0.4`** prüfen — beim Messen **zwei** Anhänge (die `.exe` kam bei 2.0.2/2.0.3 jeweils nach), **keine APK** (Secrets). **Einmalig vorzubereiten:** die zwei Repository-Secrets für den Android-Anhang (siehe § 5) | offen (Lead) |
| **e** | **Desktop-Hülle / `.exe`** — im Release `v2.0.0` liegt eine; ob für den heutigen Stand eine neue gebaut wird, ist offen | offen (Lead) |
| **f** | **Klassenraum:** Stufe **C** (Live-Server) und **D** (QR) nach **E6**; **O1** ist entschieden (Platzzahl bleibt im Datei-Dialog, kein siebtes Bedienelement) | offen — [`Architektur.md`](../Architektur.md) § 12 |

## 5 · Was entschieden ist — und was nur der Nutzer entscheiden kann

**Entschieden am 09.10.2026, wörtlich: „Nein, Lehreraufträge sollen nicht bewertet werden."** Damit gibt es
**keine Note, keine Punkte, keine Rangfolge und keinen Vergleich zwischen Azubis**; ein Klassenraum-Auftrag
zählt ausschließlich für den Lernstand des Einzelnen. Die Fahrplan-Alternative „eigene Auswertung statt
eines Filters" **entfällt** — die Umleitung nach E2 ist die ganze Lösung. Die Entscheidungstabelle **E1–E8**
steht in [`Architektur.md`](../Architektur.md) § 12.1, die Bau-Entscheidungen **L1–L5** in § 12.2.

Offen bleibt nur:

1. **Freigabe für Push und Tag `v2.0.1`.** **Entschieden ist:** die Veröffentlichung trägt den heutigen Stand;
   die Fassung ist auf **2.0.1** gezogen, das Tag ist vorbereitet. **Offen ist nur die Freigabe** — je
   Handlung einzeln (siehe [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md), Schritt 7). `v2.0.0` bleibt
   dabei unangetastet (kein `--force`).

   **Der Ablauf hängt künftig einen vierten Anhang an: die APK.** Der neue Job `android` in
   `.github/workflows/release.yml` holt den Signaturschlüssel aus **zwei Repository-Secrets** —
   `ANDROID_KEYSTORE_B64` und `ANDROID_KEYSTORE_PASSWORT`. **Was der Nutzer einmalig anlegen muss:**
   Repository → Settings → Secrets and variables → Actions → diese zwei Secrets. **Was passiert, wenn er es
   nicht tut:** nur dieser Job bricht mit klarer Meldung ab — die **APK entfällt, die drei anderen Anhänge
   (Browser-ZIP, `.html`, `.exe`) kommen trotzdem**, weil der Android-Job mit `needs: release` **parallel**
   zum Windows-Job läuft und ihn nicht mitreißt. Das ist Absicht: `android/signatur/` liegt **nicht** im Git,
   und `android/bauen.py` würde sonst **einen neuen Schlüssel** erzeugen — eine APK, die sich nicht über eine
   alte Fassung installieren lässt, wäre schlimmer als keine.

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
* **`tests/stil-stand.json` ist eingefroren** auf R1 22 · R2 113 · R3 195 · R4 514 · R5–R12 = 0 — der
  Lauf meldet **kein** „BESSER als der Stand" mehr (selbst geprüft). Diese vier Regeln sind damit
  **eingefroren, nicht behoben**.
* **Keine echte Unterrichtsstunde**, kein Test mit einem Menschen.
* **Klassenraum Stufe C und D** (Live-Server, QR) sind **nicht gebaut** — nach E6 später.
* **Online (selbst gemessen):** Tags bis **`v2.0.4`**; die **Live-Seite liefert 2.0.4** und ist
  **byte-gleich** zum lokalen Bau (2.893.778 B, `C3D3835B…4088`). Das **Release** `v2.0.4` hatte beim Messen
  **zwei** Anhänge (Browser-ZIP, `.html`) — die `.exe` kam bei 2.0.2 und 2.0.3 jeweils nach; die **APK fehlt
  weiterhin** (Secrets). Das **Release** `v2.0.0` (09.10.2026, 14:44 UTC) trägt drei Anhänge
  (Browser-ZIP, `.exe`, `.html`) und ist **älter** als die Output-Runde; die **APK liegt nicht** im Release —
  der Ablauf `.github/workflows/release.yml` wird gerade so erweitert, dass sie künftig **angehängt** wird
  (sonst bleibt die Android-Fassung für Nutzer unsichtbar). **Auffrischen:** neu taggen (**2.0.1**, voller
  Neubau) oder den Ablauf „Release anlegen" von Hand für `v2.0.0` anstoßen — **nur mit Freigabe des Nutzers**.
* **Befund K2 ist behoben:** `node tests/run.js --klassenraum` läuft jetzt (führende Striche werden
  abgeschnitten) und meldet **104/104 grün**; ein Filter **ohne** Treffer endet mit **Exit 1** und der
  Meldung „KEIN Test passt zum Filter … Das ist kein grüner Lauf." — die Bilanzzeile allein zeigt weiterhin
  „0/0 grün", der **Exit-Code** entscheidet.
* **Grenzbefunde des 20-Geräte-Laufs** (Anforderungen für 3.0, im [Konzept](<Konzept – 3.0.md>) eingetragen):
  `platz` > 31 wird **still auf 31 geklemmt**; ein **doppelter Platz** lässt den ersten Eintrag gewinnen;
  **zwei Sitzungen gleichzeitig gehen nicht** (`sitzung` ist ein Einzelfeld — nur Export/Import holt die
  alte zurück).
* Der Prüfer hat den **Lernmotor-Befund** nicht selbst nachgemessen und die **FISI-Spielhalle** nicht
  geöffnet (gelesen, nicht gemessen) — was dort zu tun ist, steht als Vorlage im
  [Befund](<Befund – Lernmotor-Falle.md>), **nicht ausgeführt**.

## 7 · Womit man anfängt, wenn man neu startet

```powershell
cd 10-Projekte\Lernprojekte\Netzwerk-Labor
$node = "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe"
& $node tests/run.js          # muss 768/768 grün melden, 0 rot, 0 übersprungen
python tools/ethos.py         # GRUEN gegen tests/stil-stand.json (R12 nur mit --dom)
python tools/klassen.py       # 0 Klassen ohne CSS-Regel
node tools/sim-stand.js       # Simulation unverändert gegenüber dem Referenzstand
python tools/menueprobe.py --datei web/index.html --lauf   # 5 von 5 Profilen, 45 erfüllt, 0 verletzt
python bauen.py               # src/ -> web/, Version 2.0.0
```

Danach **eine** Datei lesen, je nach Auftrag: den [Fahrplan 1.3/2.0](<Fahrplan – 1.3 und 2.0.md>) für die
Richtung, [`Architektur.md`](../Architektur.md) für die Verträge, das [CHANGELOG](../CHANGELOG.md) für die
gemessenen Zahlen, [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md) für das Ende einer Sitzung.
