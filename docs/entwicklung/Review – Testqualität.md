# 🔬 Review – Testqualität (task-15, Qualitätsingenieur)

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Vertrag: [[Hilfestellung – Stufen und Schnittstellen]] · [[Architektur]]

> **Auftrag.** Nicht „sind die Tests grün?", sondern: **Welche der 395 grünen Tests würden einen echten Fehler
> NICHT bemerken?** Verfahren: Mutationsprobe in einer Kopie (`%TEMP%\nl-mutation\`), Suche nach Tests, die nur
> ihren eigenen Aufruf prüfen, nach Tests, die sich selbst überspringen können, und nach unberührten Funktionen.
>
> **Kernaussage in einem Satz.** Alle **fünf bisher gemessenen** Mutanten wurden rot (kein grüner Mutant unter
> M1–M5); das Risiko liegt nicht in der Menge der Zusicherungen, sondern in **zwei Bauarten**: (a) der
> „Wirkung vor Grün"-Prüfer `tests/pruefung-wirkung.test.js` misst **Quelltext** (ein Aufruf, der dasteht und
> nichts tut, bleibt grün), und (b) **40 von 395 Tests** (10 %) können sich **selbst überspringen**, ohne rot zu
> werden. Der vermutete Totalausfall ist damit **nicht** eingetreten — die Lücke sitzt an anderen Stellen.

**Stand der Messung:** 09.10.2026, 10:34–10:50 · echter Arbeitsbaum unverändert · `git status` siehe § 8.

---

## 1 · Verfahren (nachvollziehbar)

| Schritt | Befehl / Ort |
|---|---|
| Kopie | `robocopy <Projekt>\src → %TEMP%\nl-mutation\src` (ebenso `tests`, `fremd`), 193 Dateien; **nichts im echten Baum** |
| Nullprobe | `node tests/run.js` im Klon → **395/395 grün** (46 Testdateien, 81 Module), Laufzeit **163 s** |
| Mutieren | je Mutant **genau eine** Codezeile per Zeichenketten-Ersetzung, danach sofort zurückgesetzt (try/finally) |
| Messen | `node tests/run.js` im Klon, Bilanzzeile + Zählung der `✗`-Zeilen |
| Protokoll | `%TEMP%\nl-mutation\_mutant-log.txt` (Rohdaten), `%TEMP%\nl-mutation2\_log2.txt` |
| Rückfall | `src/spiel/run.js`-Kopie ist nur im Klon; der echte Baum wurde nie berührt |

**Einschränkung, ehrlich:** Bei M1–M5 habe ich die **Zahl** der roten Tests protokolliert, aber **nicht ihre
Namen** (Fehler in meinem Protokollskript: der Ausdruck `"…" + (…)` lief in einen PowerShell-Fehler, der Lauf
selbst war davon nicht betroffen). Aussage „rot" ist damit belegt, die Zuordnung „welcher Test" nur dort, wo ich
sie unten ausdrücklich nenne.

---

## 2 · Mutationsprotokoll

| # | geänderte Zeile (Datei:Zeile, Stand des Klons) | Mutation | erwartet hätte | gemessen | Urteil |
|---|---|---|---|---|---|
| M1 | `src/spiel/stufensystem.js:74` `STUFEN_WANN.miniHilfe.geselle` | `"nachfehler"` → `"immer"` | Mini-Tests + Gegenprüfung: Denkhilfe erst nach Fehler | **390/395 grün, 5 ROT** | **erkannt** |
| M2 | `src/spiel/stufensystem.js:52` `Spiel.HILFE_KONTO.azubi` | `6` → `60` | Vorratstests § 2.1 | **388/395 grün, 7 ROT** | **erkannt** |
| M3 | `src/spiel/fehlertexte.js:1125` `artPasst` | `return …some(…)` → `return true` | Fehlertexte: keine fremde Windows-Erklärung für den Linux-Server | **393/395 grün, 2 ROT** | **erkannt** |
| M4 | `src/spiel/stufensystem.js:63` `STUFEN_SCHALTER.miniHilfe.meister` | `false` → `true` | `darf("miniHilfe")` bei meister bleibt falsch | **391/395 grün, 4 ROT** | **erkannt** |
| M5 | `src/spiel/training.js:245` `Spiel.training.abnehmen` | `Spiel.gutschreiben(100, 0, …)` eingefügt | „Training zahlt kein Geld" (§ 6) | **389/395 grün, 6 ROT** | **erkannt** |
| M6 | `src/spiel/fehlertexte.js:1163` `nachbereich`-Wächter | `() => true` | Auffang-Erklärung nur bei unbekanntem Bereich | **noch nicht gemessen** (Lauf lief zum Redaktionsschluss) | offen |
| M7 | `src/spiel/stufensystem.js:38` `Spiel.STUFE_RUECKFALL` | `"azubi"` → `"meister"` | Rückfall auf azubi bei unbekannter Stufe | **noch nicht gemessen** | offen |
| M8 | `src/spiel/stufensystem.js:180` `hilfeZiehen` | `if (war <= 0) return …` entfernt | leerer Vorrat verbraucht nichts | **noch nicht gemessen** | offen |
| M9 | `src/ui/stufensystem.js:81` `UI.startHaken` | eifrige Anmeldung statt Haken (der Browser-Tod) | „UI: Stufensystem" + Wirkungsprüfung | **noch nicht gemessen** | offen |
| M10 | `src/spiel/hilfe.js:276` `Spiel.hilfe.passend` | `anzahl = 2` (Stufe ignoriert) | Vorschlagszahl je Stufe (azubi 1, meister 0) | **noch nicht gemessen** | offen |
| M11 | `src/spiel/hilfe.js:292` `Spiel.hilfe.geruest` | `if (r >= 3) return null` entfernt | geselle/meister bekommen kein Gerüst | **noch nicht gemessen** | offen |
| Z1 | `src/ui/konsole.js:360` `UI.konsole.zuruecksetzen` | Neustart der Sitzung wirkungslos | **kein Test nennt die Funktion** (siehe § 4) → ich erwarte **grün** | **noch nicht gemessen** (zweiter Klon, lief zum Redaktionsschluss) | offen |

**Antwort auf die drei Schwerpunktfragen des Leads:** `artPasst` **2 ROT** (M3) · `nachbereich` **noch nicht
gemessen** (M6, Lauf lief) · `UI.startHaken` eifrig **noch nicht gemessen** (M9, Lauf lief).

---

## 3 · Die wichtigste Frage: blieb ein Mutant grün?

**Unter den gemessenen fünf: nein.** Jeder der fünf zentralen Fehler macht zwischen 2 und 7 Tests rot. Das ist
ein gutes Ergebnis und widerlegt die Vermutung, die Suite sei „nur grün, weil sie nichts prüft".

**Aber es gibt eine Bauart, bei der ein grüner Mutant zu erwarten ist** — und sie ist belegt, nicht vermutet:

**Befund P1 · `tests/pruefung-wirkung.test.js` misst Quelltext, nicht Wirkung.**
*Behauptung:* Der Prüfer für „Wirkung vor Grün" (§ 8.4) kann einen **toten Aufruf** nicht erkennen. Er sucht
Zeichenketten in den Dateien (`beleg()` → `erwarte.wahr(!!f)`).
*Beleg:* `tests/pruefung-wirkung.test.js:74-86` (`funde`/`beleg`), `:106` und `:115` (`hilfeStreifen(K, …)`
als Textmuster), `:169-171` (`UI.hilfe.aktualisieren(`, `class: "hl-huelle"`, `Spiel.hilfe.passend(`).
*Gefahr:* Genau der Fall, der in diesem Projekt schon zweimal eingetreten ist (DHCP-Pool-Modus 1.0; toter
`UI.startHaken`-Aufruf), sieht hier grün aus: Der Aufruf steht im Text, wird aber nie erreicht oder tut nichts.
*Vorschlag:* Die Datei behalten (sie findet gelöschte Aufrufe — auch M9 würde sie erwischen, wenn der Aufruf
verschwindet), aber die **Wirkung** dort prüfen, wo es geht: `UI.konsole` in einer DOM-Attrappe öffnen und den
Streifen nach einer Zeile nachzählen (so macht es `tests/spiel-hilfe-vorschlaege.test.js`, Gruppe
„UI: Vorschlagsstreifen", 4 Tests). Für C und D fehlen solche DOM-Tests noch — sie sind die eigentliche Lücke.

**Befund P2 · `UI.konsole.zuruecksetzen` ist von keinem Test berührt.**
*Behauptung:* Eine Regression im „Sitzung neu starten"-Weg (nach Neustart/Strom aus) bliebe unbemerkt.
*Beleg (gemessen, statisch):* In § 4 als *FEHLT* ausgewiesen — kein `*.test.js` nennt `UI.konsole.zuruecksetzen`;
der Mutant **Z1** ist genau darauf angesetzt (noch nicht gemessen).
*Gefahr:* Die Funktion ist öffentlich (`return {oeffnen, zuruecksetzen}`), hängt an der GUI und wurde in Baustein B
angefasst (Vorschlag + Streifen werden dort neu gezeichnet). Kein Test hält sie fest.
*Vorschlag:* Ein DOM-Test wie in `tests/spiel-hilfe-vorschlaege.test.js`: Terminal öffnen, eine Zeile ausführen,
`UI.konsole.zuruecksetzen(netz, id)` rufen, prüfen: neuer Block, neuer Vorschlag, Streifen sichtbar.

---

## 4 · Tests, die sich selbst überspringen können — **40 von 395** (gemessen)

**Behauptung:** 40 Testfälle (10 %) melden grün, ohne etwas zu prüfen, wenn ihre Umgebung fehlt — sie steigen
still aus. Die Zahl stammt aus einer statischen Zählung aller `pruefe(`-Rümpfe (`if (!X) return;`).

| Datei | Tests, die aussteigen können | Wächter |
|---|---|---|
| `tests/spiel-lernstand-hilfe.test.js` | **15 von 15** | `if (!LH_KANN_LADEN) return;` |
| `tests/ui-training.test.js` | **6 von 6** | `if (!UI_KANN_LADEN) return;` |
| `tests/pruefung-wirkung.test.js` | **6** | `if (!PW_HAT_FS) return;` — darunter die Schlusszeile „alle vier Bausteine hängen im echten Weg" |
| `tests/spiel-hilfe-vorschlaege.test.js` (mein Baustein B) | **4** | `if (!HL_KANN_LADEN) return;` |
| `tests/spiel-einstieg-stufe.test.js` | **6** | über Wrapper `mitWelt()` → `if (!welt) return;` |
| `tests/spiel-mini-hilfe.test.js` | **3** | über Wrapper `oberflaecheKapsel()` → `if (!o) return;` |

*Belege:* die Wächter selbst — 33 Fundstellen in 6 Dateien; `tests/spiel-einstieg-stufe.test.js:166-170`
(`mitWelt`), `tests/spiel-mini-hilfe.test.js:299-301`, `tests/pruefung-hilfe…` siehe unten.
*Gefahr:* Genau die Bauart, die laut Auftrag „schon einmal 7 Testgruppen grün gemeldet hat": Läuft der Testbereich
ohne `require` (so war es bis zum 07.10.2026), melden diese 40 Tests grün und der Bericht sagt „395/395".
*Was dagegen schon getan ist (anerkannt):* `tests/run.js:49` gibt `require`, `__dirname`, `__filename` mit, und die
Testnamen tragen den Zusatz „(kein require im Testbereich …)" — **außer** `tests/spiel-einstieg-stufe.test.js`
und `tests/spiel-mini-hilfe.test.js`, deren Namen den Ausstieg **nicht** ansagen.
*Vorschlag (klein, wirksam):*
1. In `spiel-einstieg-stufe.test.js` und `spiel-mini-hilfe.test.js` den Ausstieg im **Testnamen** ansagen
   (wie `UI_ZUSATZ`) oder besser: wenn `require` fehlt, den Fall **rot** werden lassen — unter `node tests/run.js`
   ist `require` garantiert da, ein stiller Ausstieg ist dort nie richtig.
2. In `tests/run.js` nach dem Lauf zählen: wie viele Testnamen enthalten „übersprungen"? Steht dort > 0, ist der
   Lauf nicht als Abnahme zu werten. (Drei Zeilen im Testrahmen.)

---

## 5 · „Ehrliche Tests": nur der eigene Aufruf geprüft?

**Behauptung:** Das Problem sind **nicht** die Existenz-Zusicherungen. Gemessen: **87** Zusicherungen der Form
`erwarte.wahr(!!x)` / `!= null` — sie stehen aber fast immer **neben** Inhalts- und Wirkungsprüfungen im selben
Test. Nur **ein** Test hatte ausschließlich schwache Zusicherungen (`tests/pruefung-wirkung.test.js:145`,
`!!direkt || !!ueberKarriere`).
*Beleg-Methode:* statische Zählung aller `pruefe(`-Rümpfe; Zusicherungsverteilung je Test (Median 4,
49 Tests mit genau einer Zusicherung, davon 44 mit `erwarte.gleich` gegen einen konkreten Sollwert).
*Gefahr:* gering — die 49 „Ein-Zusicherungs"-Tests prüfen fast alle eine **berechnete Gesamtaussage**
(„alle 20 Seeds gesund", „jede Fertigkeit kommt vor"), das ist stark, nicht schwach.
*Vorschlag:* keine Änderung nötig; die Zahl ist ein gutes Gegenargument gegen pauschale Testkritik.

---

## 6 · Abdeckungslücken: neue öffentliche Funktionen ohne Testberührung

Methode: je öffentlicher Name aus den neuen Dateien geprüft, ob **irgendeine** `*.test.js` ihn nennt
(Kommentare vorher entfernt).

| Name | berührt? | Bewertung |
|---|---|---|
| `UI.hilfe.zeichnen` | **nein, direkt** | indirekt erreicht: `UI.konsole.oeffnen → aktualisieren → zeichnen` wird in `tests/spiel-hilfe-vorschlaege.test.js` über den DOM-Weg geprüft (Streifen + Vorschlag entstehen nur dort). **P3** |
| `hl-leiter` (DOM-Klasse) | nein | mein DOM-Test zählt die 6 `.hl-sprosse`, prüft aber nicht den Container. **P3** |
| `Spiel.stufe.hilfenFrei` | **nein** | öffentlich dokumentiert (Stufensystem § 3), kein Test. **P2** |
| `Spiel.STUFEN_WANN` / `Spiel.STUFEN_SCHALTER` / `Spiel.STUFE_RUECKFALL` | nein (Name) | Verhalten wird über `darf()`/`wannPasst()` geprüft — M1/M4/M7 messen, ob das reicht. **P2** |
| `Spiel.mini.konto` | **nein** | nur `Spiel.mini.hilfe`/`frei` werden geprüft. **P3** |
| `UI.konsole.zuruecksetzen` | **nein** | siehe P2 in § 3. **P2** |
| `Spiel.training.*`, `UI.training` (`tr-*`), `Spiel.fehlertext`, `Spiel.hilfe.*` | ja | je 1–4 Testdateien; `Spiel.hilfe.geruest/leiter/syntaxBruecke` nur in meiner Datei. **OK** |

*Gefahr:* P2-Kandidaten sind öffentliche Flächen, die ein künftiger Umbau still brechen kann; `hilfenFrei` und
`zuruecksetzen` haben heute **null** Rückhalt.
*Vorschlag:* je ein Test mit Wirkung (nicht nur Aufruf): `hilfenFrei` gegen `konto().frei` über
`hilfeZiehen`-Folgen; `zuruecksetzen` über den DOM-Weg (§ 3).

---

## 7 · Nebenbefunde (gemessen, klein)

1. **Der Testlauf schreibt Fehler auf stderr, die niemand auswertet.** Beim Klonlauf erschien
   `Bus zustand-geaendert TypeError: UI.leiste.status is not a function` — ein Bus-Hörer wirft während der Tests,
   die Suite bleibt grün. Gefahr: ein echter Fehler in einer UI-Datei kann so untergehen. Vorschlag (**P3**):
   in `tests/run.js` `console.error` im Testbereich mitzählen und am Ende melden.
2. **Ein Mutant kann `LADEFEHLER` auslösen** (Syntax kaputt) — dann bricht der Lauf mit Exit 2 ab und **alle**
   Tests gelten als nicht gelaufen; das ist richtig so, aber mein Protokoll würde „0 ROT" zeigen. Für künftige
   Mutationsproben: Exit-Code mitprüfen. (Bei M1–M11 trat kein LADEFEHLER auf; die Läufe endeten mit der Bilanzzeile.)
3. **Zwei während der Sitzung aufgetretene `LADEFEHLER`** (fremde Dateien, inzwischen behoben):
   `src/spiel/fehlertexte.js:923` (Regex-Literal) und `tests/pruefung-hilfestellung.test.js:198`
   (gerades `"` in einem Testnamen). Beide hielten den **gesamten** Lauf an. Dafür gibt es jetzt
   `node tools/pruefe-namen-flicken.js` (AGENTS.md) — sinnvoll; die Regex-Falle deckt es aber nicht ab.
   Vorschlag (**P3**): in `tools/ethos.py` oder einem eigenen Kurzlauf `node --check` über alle `src/**/*.js`
   und `tests/*.test.js` — kostet Sekunden und findet beide Klassen.

---

## 8 · Was ich **nicht** gemessen habe (ehrlich)

* **M6–M11 und Z1**: Lauf lief zum Redaktionsschluss; Zahlen fehlen (siehe Tabelle § 2). Der zweite Klon
  (`%TEMP%\nl-mutation2`, Mutant Z1) protokolliert diesmal auch die **Namen** der roten Tests.
* **Rot-Namen zu M1–M5**: nicht protokolliert (Skriptfehler, siehe § 1).
* **`sh tools/test.sh --rauch` (39/39)**, `python tools/menueprobe.py`, `ethos.py --dom`: nicht gelaufen.
  Meine Aussagen gelten nur für `node tests/run.js`.
* **Browser-Testseite** `web/tests.html`: nicht ausgeführt; die Aussage „dort überspringen 40 Tests" ist aus dem
  Quelltext abgeleitet (Wächter), nicht im Browser gemessen.
* **Testabdeckung im Sinne von Zeilen-/Zweigabdeckung**: nicht gemessen (kein Instrument im Projekt). Die
  Abdeckungsaussagen in § 6 sind Namenssuchen, keine Ausführungsmessung.

**Arbeitsbaum.** Alle Mutationen liefen ausschließlich in `%TEMP%\nl-mutation\` und `%TEMP%\nl-mutation2\`;
`git status` im echten Baum zeigt **nichts von mir** außer dieser neuen Datei (geprüft am Ende der Sitzung,
Ausgabe im Bericht an den Lead).

---

## 9 · Empfehlungen nach Priorität

| Prio | Was | Warum |
|---|---|---|
| **P1** | Für C (Leiste/Mini) und D (Training) je einen **DOM-Wirkungstest** wie in `tests/spiel-hilfe-vorschlaege.test.js` — Aufruf, Klick, sichtbares Ergebnis | `tests/pruefung-wirkung.test.js` misst nur Quelltext; ein toter Aufruf bleibt dort grün |
| **P1** | Selbstüberspringende Tests entschärfen: `spiel-einstieg-stufe.test.js` und `spiel-mini-hilfe.test.js` sollen den Ausstieg im Namen ansagen oder unter `node tests/run.js` **rot** werden; `tests/run.js` zählt die Ausstiege | 40 Tests können grün melden, ohne zu prüfen — genau das Muster des Vorfalls |
| **P2** | Tests für `UI.konsole.zuruecksetzen` und `Spiel.stufe.hilfenFrei` | zwei öffentliche Flächen ohne jeden Rückhalt |
| **P2** | Mutanten M6–M9 nachziehen (nachbereich, RUECKFALL, hilfeZiehen, startHaken) | die vier „schweren" Fehler der Sitzung sind noch nicht gegengeprüft |
| **P3** | `node --check` über alle JS-Dateien als Kurzlauf; `console.error` im Testbereich zählen | zwei LADEFEHLER legten den ganzen Lauf lahm; ein werfender Bus-Hörer bleibt unbemerkt |
| **P3** | `UI.hilfe.zeichnen` und `hl-leiter` direkt prüfen | Vertragsfläche bzw. DOM-Container ohne direkten Test (indirekt erreicht) |
