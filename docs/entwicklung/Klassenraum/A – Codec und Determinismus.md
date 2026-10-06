# A · Codec und Determinismus (Bereich A des Auftrags „Klassenraum")

Stand: 2026-10-06 · Zweig `ausbau-1.2` · nichts committet, nichts gepusht.
Grundlage: `tools/auftraege/KLASSENRAUM.md` (Auftrag), `tools/auftraege/COMMON.md`, `AGENTS.md`.
Diese Datei ist **umsetzungsreif**: Format, Bit-Budget, Prüfsumme, Kanonisierung, API-Vertrag, Ergebniscode,
Datenschema und Export/Import stehen so genau da, dass Bereich B/C sie ohne Nachdenken bauen kann.
Alles Zahlengestützte ist in dieser Sitzung gemessen; die Belege stehen in
`Nachweise/Klassenraum/A-codec.json`, `A-tabelle.json`, `A-codec-teil1.json`, `A-codec-teil2.json`
und in der Probe `tools/klassenraum-probe/A-codec-probe.js`.

## 0 · Nachrechnen

```
cd <Repo-Wurzel>
& "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tools\klassenraum-probe\A-codec-probe.js
```
Laufzeit **253,2 s** in dem Lauf, der `A-codec.json` erzeugt hat (die Probe lief parallel zu den
Entwurfs-/Prüfagenten dieser Sitzung; ohne diese Last gemessen: 150,6 s). Die Probe schreibt
`Nachweise/Klassenraum/A-codec.json`, `A-tabelle.json` und startet für den Determinismusbeweis zwei eigene
Node-Prozesse (`A-codec-teil1.json`, `A-codec-teil2.json`).
Der gemeinsame Lader `tools/klassenraum-probe/A-lader.js` lädt die Module in derselben Reihenfolge wie
`tests/run.js` (76 Module); die eingefrorene Festlegung steht in `tools/klassenraum-probe/A-festlegung.md`.

Basisstand dieser Sitzung: `node tests/run.js` → **251/251 grün** (am Ende dieser Sitzung erneut gelaufen,
unverändert, weil Bereich A nur neue Dateien anlegt), 58 handgeschriebene Tickets, 27 Fertigkeiten.

---

## 1 · Auftragscode: Format, Prüfsumme, Fehlermeldungen

### 1.1 Alphabet und Form

```
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"     // 32 Zeichen → 5 Bit je Zeichen
wert(c)   = ALPHABET.indexOf(c)                   // 0..31, -1 = Fremdzeichen (I, O, 0, 1)
zeichen(v)= ALPHABET[v % 32]
```

Der gedruckte Auftragscode hat **immer genau 10 Zeichen**:

```
NL-XXXX-XX       4 Nutzzeichen · 2 Prüfzeichen
```

Gemessen: über **alle 2^20 = 1.048.576** möglichen Nutzlasten ist die Länge **min = max = 10 Zeichen**
(inkl. Trennstriche), 0 Codes länger als 10 (`A-codec.json → messungen.laengeAuftragscode`, 0,7 s).
Der Ergebniscode ist ebenfalls **immer genau 10 Zeichen** (`E-XXXX-XXX`, 335.168 geprüfte Fälle, 0 Ausreißer).

**Groß-/Kleinschreibung, Trennstriche, Punkte und Leerzeichen sind egal.** Normalisierung:

1. `String(eingabe).toUpperCase()`
2. alles außer `[0-9A-Z]` entfernen
3. führendes `NL` abschneiden, **aber nur wenn danach genau 6 Zeichen übrig bleiben**
4. Länge prüfen → Fremdzeichen prüfen → Prüfsumme prüfen

Gemessen (`messungen.normalisierung`): fünf Schreibweisen desselben Codes
(`NL-EDAH-H8`, `nl-edah-h8`, `NLEDAHH8`, ` nl edah-h8 `, `NL.EDAH.H8`) ergeben **alle** dieselben Felder
`[sitzung 4, art 0, index 12, variante 7]`. `nl4f7k2q` und `NL-4F7K-2Q` ergeben dieselbe Normalform
`NL4F7K2Q` und dieselbe Beurteilung (**beide `prüfziffer`** – das Formbeispiel des Auftrags ist kein gültiger
Code, siehe 1.4). Präfix-Falle geprüft: der gültige Code `NL-NLHW-K3` (Nutzteil beginnt selbst mit „NL")
wird mit und ohne Trennstriche zu denselben Feldern gelesen (`[sitzung 12, art 0, index 40, variante 244]`).

### 1.2 Prüfsumme (zwei Zeichen, 10 Bit)

Über die Nutzzeichen `v0..v3` (Werte 0..31):

```
C1 = (1·v0 + 2·v1 + 3·v2 + 4·v3) mod 31     → Prüfzeichen 4 = zeichen(C1)   // 31 ist prim
C2 = (1·v0 + 3·v1 + 5·v2 + 7·v3) mod 32     → Prüfzeichen 5 = zeichen(C2)   // Gewichte ungerade
```

**Warum zwei Zeichen?** Ein Zeichen kann nicht beides leisten:

* Einzelne Ersetzung: `C2` ändert sich um `w·δ mod 32`, `w` ungerade, `0 < |δ| ≤ 31` → nur `δ ≡ 0 (mod 32)`
  würde verschwinden, das gibt es nicht → **jede Einzel-Ersetzung wird erkannt**, auch der Grenzfall `A↔9`
  (Werte 0 und 31, Abstand 31).
* Nachbarvertauschung: `C1` ändert sich um `∓(u−w) mod 31`, `C2` um `(u−w)·(∓2) mod 32`. Beide Prüfungen
  versagen gleichzeitig nur bei `u−w ≡ 0 (mod 31)` **und** `u−w ≡ 0 (mod 16)` – 31 ist nicht durch 16
  teilbar → **jede Nachbarvertauschung wird erkannt**.

Beides ist zusätzlich gemessen, nicht nur behauptet: 92 Vertipperfälle aus vier gültigen Codes
(48 × ein Zeichen ersetzt, 20 × Nachbarn vertauscht, 24 × Buchstabe↔Ziffer) → **92/92 abgelehnt, alle mit
`prüfziffer`**. Der Grenzfall `A↔9` an allen vier Positionen wird **von C2** gefangen – das Messprotokoll
zum Code `NL-A9A9-AY` (Nutzzeichen `A 9 A 9`) zeigt für jede Position `C1 = [0, 0]` (unverändert, das ist
die mod-31-Blindstelle) und ein verändertes `C2`, z. B. Position 1: `C2 = [22, 25]` → abgelehnt.
Dieselbe Probe für die Vertauschung zweier Zeichen mit Wertdifferenz 31 (`NL-A9A9-AY` → `NL-9AA9-AY`):
`C1 = [0, 0]`, `C2 = [22, 24]` → abgelehnt.

**Erschöpfende Gegenprüfung des ganzen Zeichenraums** (Gegenprüfer der zweiten Iteration, Beleg in
`Nachweise/Klassenraum/A-pruef-format.json → messungen.vertipper.raum`):

| Prüfung | Fälle | unbemerkt |
|---|---|---|
| einzelnes Nutzzeichen ersetzt (alle Positionen × alle 31 Ersatzzeichen, über alle 2^20 Nutzlasten) | 130.023.424 | **0** |
| zwei Nutzzeichen vertauscht | 3.047.424 | **0** |
| dabei `C1` unverändert | 6.144 | – |
| dabei `C2` unverändert | 98.304 | – |
| dabei **beide** unverändert | **0** | Beweis bestätigt |

`C2` bleibt bei einer Nachbarvertauschung genau dann gleich, wenn die Wertdifferenz 16 ist (2·16 ≡ 0 mod 32),
`C1` genau dann, wenn sie 31 ist – beides zugleich gibt es nicht, deshalb die Null in der letzten Zeile.

**Zwei Randfälle, die § 2 nicht abdeckt, aber gemessen sind (ehrlich benannt):**

* Vertauscht jemand die **beiden Prüfzeichen** (die letzten beiden Nutzzeichen), bleibt das unbemerkt,
  wenn beide Zeichen gleich sind – dann ist es aber auch keine Änderung. Bei ungleichen Prüfzeichen wird es
  erkannt (1.048.576 Fälle geprüft, 32.763 „unbemerkt“ = genau die Fälle mit `C1 = C2`).
* Vertauscht jemand **Nutzzeichen 4 mit Prüfzeichen 1** (die Zeichen links und rechts des zweiten
  Trennstrichs), sind **167 von 1.015.808** Fällen unbemerkt (0,016 %). Das ist kein Tausch zweier
  Nutzzeichen, sondern ein Tausch über die Gruppengrenze. Wer das ausschließen will, müsste ein drittes
  Prüfzeichen bezahlen – für die Hobby-Ebene nicht nötig.

Kleiner Merkposten für die Oberfläche: das **erste** Prüfzeichen ist nie `9` (C1 liegt in 0..30), es sind
also 31 der 32 Zeichen möglich. Das zweite Prüfzeichen nutzt alle 32.

### 1.3 Rechenweg, zwei gültige Beispiele

**Beispiel 1 – handgeschriebener Auftrag:** Sitzung 7, art 0 (handgeschrieben), Index 11, Variante 42.

```
n = (7 << 15) | (0 << 14) | (11 << 8) | 42 = 232234
Nutzzeichen v = [(n>>>15)&31, (n>>>10)&31, (n>>>5)&31, n&31] = [7, 2, 25, 10] → "HC3L"
C1 = 1·7 + 2·2 + 3·25 + 4·10 = 7 + 4 + 75 + 40 = 126 → 126 mod 31 = 2  → zeichen(2)  = "C"
C2 = 1·7 + 3·2 + 5·25 + 7·10 = 7 + 6 + 125 + 70 = 208 → 208 mod 32 = 16 → zeichen(16) = "S"
Code: NL-HC3L-CS
```

**Beispiel 2 – generierte Form:** Sitzung 20, art 1 (generiert), Index 5 (lab.ping), Variante 200.

```
n = (20 << 15) | (1 << 14) | (5 << 8) | 200 = 673224
v = [20, 17, 14, 8] → "WTQJ"
C1 = 20 + 34 + 42 + 32 = 128 → 128 mod 31 = 4  → "E"
C2 = 20 + 51 + 70 + 56 = 197 → 197 mod 32 = 5  → "F"
Code: NL-WTQJ-EF
```

**Ein Vertipper dazu:** `NL-HC3L-CS` → `NL-HC3L-C7` (letztes Zeichen verändert). Erwartete Prüfzeichen
sind `C` und `S`; gefunden wird `C` und `7` → `{fehler:"prüfziffer", grund:"Die Prüfziffer passt nicht –
hast du dich vertippt?"}`. So sieht der Rückgabewert aus, es wird **nie** eine Ausnahme geworfen.

### 1.4 Das Formbeispiel des Auftrags ist kein gültiger Code

`NL-4F7K-2Q` (aus `KLASSENRAUM.md`, Zeile 37) hat die Nutzzeichen `4F7K` = Werte `[26, 5, 29, 9]`:

```
C1 = 26 + 10 + 87 + 36 = 159 → 159 mod 31 = 4  → "E"
C2 = 26 + 15 + 145 + 63 = 249 → 249 mod 32 = 25 → "3"
richtig wäre: NL-4F7K-E3        mitgeliefert: NL-4F7K-2Q  → stimmt nicht
```

Das ist kein Fehler des Auftrags (dort steht „gedruckt in Gruppen (`NL-4F7K-2Q`)", also ein Formmuster),
aber Oberfläche und Tests dürfen dieses Muster **nicht** als gültigen Code verwenden. Ein Eingabefeld, das
es ablehnt, arbeitet richtig.

### 1.5 Fehlermeldungen je Fehlerklasse

Rückgabe ist immer `{fehler:"klasse", grund:"Satz für die Oberfläche"}`, bei Erfolg das Feldobjekt, bei
leerer Eingabe `null`. Die Klassen und ihre Texte (gemessen, `messungen.vertipper`, `messungen.zufallscodes`):

| `fehler` | Auslöser | `grund` (Textvorschlag, so gemessen) |
|---|---|---|
| `länge` | nach Normalisierung nicht 6 Zeichen | „Der Code hat 5 Zeichen – er braucht 6 (gedruckt z. B. NL-4F7K-2Q)." · Zusatzhinweis, wenn die Eingabe wie ein Ergebniscode aussieht: „Das sieht nach einem Ergebnis-Code aus (E-…). Hier gehört der Auftragscode hin (NL-…)." |
| `zeichen` | Zeichen außerhalb des Alphabets (I, O, 0, 1) | „Im Code kommt kein I, kein O, keine 0 und keine 1 vor – hast du 0 statt O oder 1 statt I getippt?" (Feld `zeichen` nennt den Übeltäter) |
| `prüfziffer` | Prüfsumme stimmt nicht | „Die Prüfziffer passt nicht – hast du dich vertippt?" (Felder `erwartet`, `gefunden`) |
| `bereich` | ein Feldwert liegt außerhalb seiner Spanne | „Der Sterne-Wert im Code liegt außerhalb des Bereichs (0..10 halbe Sterne): 15." |
| `auftrag` | Index zeigt auf eine ID, die es hier nicht gibt, oder der Generator liefert nichts | „Den Auftrag Nr. 0 (gibt-es-nicht) gibt es in dieser Fassung nicht." |
| `fassung` | Index im freien Bereich (Aufträge 58..63, Fertigkeiten 27..63) | „Auftragsindex 61 liegt hinter dem Ende der Auftragstabelle (58 Einträge)." |
| `sitzung` | Ergebniscode gehört zu einer anderen Sitzung / es läuft keine | „Dieser Ergebnis-Code gehört zu Sitzung 7 – hier läuft Sitzung 6." (Zusatzfeld `art: "fremd"` bzw. `art: "keine"`, damit die Oberfläche zwei verschiedene Sätze zeigen kann) |
| `abnahme` | Ergebniscode ohne bestandene Abnahme oder ohne Abnahmeobjekt | „Der Auftrag ist noch nicht bestanden." |
| `wahl` | `erzeugen` ohne `ticketId` **und** ohne `skill` (oder mit beiden) | „Bitte genau einen Auftrag ODER eine Fertigkeit wählen." |
| `format` | nur Export/Import: kein JSON, fremdes Format, kaputte Sitzung | siehe § 7 |

Nachtrag gegenüber `tools/klassenraum-probe/A-festlegung.md` § 8 (dort standen sieben Klassen plus `format`):
`bereich`, `abnahme` und das Zusatzfeld `art` bei `sitzung` sind Ergänzungen aus der Gegenprüfung der zweiten
Iteration. Die Oberfläche muss „hier läuft keine Sitzung" von „gehört zu Sitzung 12" unterscheiden können;
und `bereich` schließt eine echte Lücke: das Sterne-Feld des Ergebniscodes hat 4 Bit, kann also 0..15
tragen. Ohne Prüfung käme ein von Hand gebauter Code mit Sterne-Bits 11..15 als „5,5 bis 7,5 Sterne" in die
Lehrerliste. Die Referenz weist alles über 10 (fünf Sterne) mit `{fehler:"bereich"}` ab; der Grenzwert 10
bleibt gültig (beides gemessen, `messungen.fehlerklassen`). Der **Encoder** klemmt dagegen still, weil seine
Werte aus dem Spiel kommen (`Spiel.sterneBerechnen` liefert 1..5, `inst.zeitMs ≥ 0`); wer mag, kann dort
stattdessen ebenfalls `{fehler:"bereich"}` werfen.

Gemessene Verteilung bei 10.000 rohen Zufallszeichenketten aus `[0-9A-Z]`: 9.988 × `länge`, 6 × `zeichen`,
6 × `prüfziffer`, 0 gültig (alle 10.000 Zeichenketten verschieden). Aus dem Alphabet allein: 9.995 × `länge`,
5 × `prüfziffer`. **10.000 wohlgeformte Zufallscodes** (`NL-XXXX-XX` mit zufälligen Zeichen) → 9.984
abgelehnt = **99,84 %**, 16 kamen durch (davon 9 auf einen echten Auftrag, 7 auf `fassung`).
**10.000 Ein-Zeichen-Mutationen gültiger Codes → 10.000 erkannt (100 %)**, 9.953 verschiedene Ausgangscodes.

**Je Klasse ein gemessener Beleg** (`messungen.fehlerklassen`, wörtliche Rückgabe):

| Eingabe | Rückgabe (gekürzt) |
|---|---|
| `""` / `null` | `null` (nichts getippt) |
| `NL-ABC` | `{fehler:"länge", grund:"Der Code hat 5 Zeichen – er braucht 6 …"}` |
| `E-EDSB-6SA` (Ergebniscode im Auftragsfeld) | `{fehler:"länge", …, hinweis:"Das sieht nach einem Ergebnis-Code aus (E-…). …"}` |
| `NL-AAAO-AA` | `{fehler:"zeichen", grund:"Im Code kommt kein I, kein O, keine 0 und keine 1 vor …", zeichen:"O"}` |
| `NL-4F7K-2Q` | `{fehler:"prüfziffer", grund:"Die Prüfziffer passt nicht …", erwartet:"E3", gefunden:"2Q"}` |
| `E-…` mit Sterne-Bits 15 (Prüfsumme stimmt!) | `{fehler:"bereich", grund:"Der Sterne-Wert im Code liegt außerhalb des Bereichs (0..10 halbe Sterne): 15."}` |
| `E-…` mit Sterne-Bits 10 (5 Sterne) | gültig, gelesen `sterne: 5, versuche: 3, dauerS: 5110` |
| `NL-FRJD-KR` (Auftragsindex 61) | `{fehler:"fassung", grund:"Auftragsindex 61 liegt hinter dem Ende der Auftragstabelle (58 Einträge)."}` |
| `NL-F4AD-HJ` (Fertigkeitsindex 40) | `{fehler:"fassung", grund:"Fertigkeitsindex 40 liegt hinter dem Ende der Fertigkeitstabelle (27 Einträge)."}` |
| `NL-FAAD-T4` (Tabelleneintrag entfernt) | `{fehler:"auftrag", grund:"Den Auftrag Nr. 0 (gibt-es-nicht) gibt es in dieser Fassung nicht."}` |
| `NL-FYSD-SN` (art 1, Index 26 = lab.storage) | `{fehler:"auftrag", grund:"Für die Fertigkeit lab.storage liefert kein Seed im Fenster (64) einen spielbaren Auftrag."}` |
| `E-ABC` im Ergebnisfeld | `{fehler:"länge", grund:"Der Ergebnis-Code hat 4 Zeichen – er braucht 7 …"}` |
| `NL-FA2D-5U` im Ergebnisfeld | `{fehler:"länge", grund:"Der Ergebnis-Code hat 8 Zeichen – er braucht 7 …"}` |

---

## 2 · Bit-Budget

### 2.1 Auftragscode (30 Bit Nutzteil = 6 Zeichen · 5 Bit)

Nutzlast 20 Bit (4 Zeichen) `n = (sitzung << 15) | (art << 14) | (index << 8) | variante`:

| Feld | Bits | Bereich | Bedeutung |
|---|---|---|---|
| `sitzung` | 5 | 0..31 | Sitzungskennung; `erzeugen` wählt 1..31, 0 = „ohne Sitzung" (Übung) |
| `art` | 1 | 0/1 | 0 = handgeschrieben (Index in der Auftragstabelle), 1 = generiert (Index in der Fertigkeitstabelle) |
| `index` | 6 | 0..63 | belegt 0..57 (Aufträge) bzw. 0..23 (taugliche Fertigkeiten); 58..63 / 24..63 frei → `fassung` |
| `variante` | 8 | 0..255 | Variantenfeld; Startseed ist **immer** `variante + 1` (1..256) |

Prüfsumme 10 Bit (2 Zeichen, § 1.2).

**Beweis der Länge:** 5 + 1 + 6 + 8 = 20 Bit Nutzlast + 10 Bit Prüfsumme = 30 Bit = 6 Zeichen à 5 Bit;
gedruckt `NL-` + 4 + `-` + 2 = **10 Zeichen ≤ 10** ✓. Der Auftrag verlangt keine längeren Codes, und es
bleibt **kein** Bit ungenutzt: die 30 Bit sind vollständig belegt.

Warum 8 Bit Varianten und nicht mehr? Weil das zweite Prüfzeichen mehr wert ist als weitere Varianten
(siehe § 1.2): 256 Varianten je Auftrag × 58 Aufträge sind 14.848 verschiedene Netze für Handaufträge,
dazu 24 Fertigkeiten × 256 = 6.144 generierte Formen – gemessen (weiter unten) sind es real
3.520 + 1.536 = 5.056 Varianten mit eigenem Netz, der Rest greift bewusst auf die feste Fassung zurück.

### 2.2 Anzahl handgeschriebener Tickets (selbst nachgezählt)

`DATEN.tickets.length` = **58**, `Spiel.ticketReihe().length` = **58** – die Zahl stimmt mit der Vorgabe
(58) überein. Die Filter in `Spiel.ticketReihe()` (`entwurf`, `art: "mini"`, `art: "wartung"`) entfernen
heute **nichts**; 3 Tickets haben `art: "terminal"`, 4 `art: "projekt"`, 51 `art: "stoerung"`.

### 2.3 Index-Tabelle: welche Reihenfolge, und wie sie stabil bleibt

Gemessen: `Spiel.ticketReihe()` und die rohe `DATEN.tickets`-Reihenfolge sind **an 52 von 58 Stellen
verschieden** (`A-tabelle.json → unterschiede`). Grund: `ticketReihe()` sortiert nach Karriere-Stufe, dann
`reihe`, dann Registrierungsindex; die Hotline-, Terminal- und Sicherheits-Tickets liegen in eigenen Dateien
und landen roh am Ende. **Entscheidung: eingefrorene Liste in `Spiel.ticketReihe()`-Reihenfolge** – das ist
die Reihenfolge, in der das Spiel die Aufträge anbietet („Karriere-Stufe zuerst"), sie ist für eine Lehrkraft
nachvollziehbar, und sie ist heute vollständig (58 = 58).

Die Liste steht vollständig in `Nachweise/Klassenraum/A-tabelle.json`; Anfang und Ende:

```
 0 salon-01       1 salon-02       2 salon-03      …   5 salon-06       6 salon-hotline
 7 salon-projekt  8 salon-terminal 9 baeckerei-01  …  56 storage-02     57 storage-03
```

**Vorkehrung gegen verschobene Tabellen (vier Regeln, alle sofort umsetzbar):**

1. **Einfrieren statt rechnen.** `TABELLE_AUFTRAEGE` (58 IDs) und `TABELLE_SKILLS` (27 IDs mit `tauglich`
   und `ersterSeed`) liegen als **Literal** in `src/spiel/klassenraum.js`. Zur Laufzeit wird die Reihenfolge
   **nicht** aus `DATEN.tickets` oder `Spiel.ticketReihe()` berechnet – sonst würde ein neues Ticket in der
   Mitte alle Indizes verschieben und alte Codes zeigten auf andere Aufträge.
2. **Nur anhängen.** Neue Aufträge bekommen den nächsten freien Index **am Ende**; nie einschieben, nie
   umnummerieren. Neue Fertigkeiten ebenso.
3. **Beim Laden prüfen.** Jede ID der Tabelle muss in `DATEN.tickets` existieren; fehlt sie, liefert der
   Code für diesen Index `{fehler:"auftrag"}` statt eines falschen Auftrags.
4. **Ein Test wacht darüber** (Vorschlag für `tests/klassenraum.test.js`, Bereich B): die eingefrorene
   Liste muss ein **Präfix** der aktuellen `Spiel.ticketReihe()`-Reihenfolge sein und darf keine ID
   enthalten, die es nicht mehr gibt. Verschiebt jemand eine bestehende Position, wird der Test rot.

Die freien Indizes sind **kein** Zufall: 58..63 (Aufträge) und 27..63 (Fertigkeiten, weil nur 24 von 27
tauglich sind) ergeben `{fehler:"fassung"}` → „Dieser Code stammt aus einer anderen Programmfassung."
Gemessen (`messungen.reserviert`): **49.152** Codes mit Auftragsindex 58..63 und **303.104** Codes mit
Fertigkeitsindex 27..63 ergeben alle `fassung`, keine andere Klasse. Dazu kommen **24.576** Codes
(3 untaugliche Fertigkeiten × 32 Sitzungen × 256 Varianten), die `{fehler:"auftrag"}` ergeben.

**Eine Feinheit, die ausdrücklich entschieden sein muss** (Gegenprüfung der zweiten Iteration): „frei" heißt
„in **dieser** Fassung nicht vergeben". Wer nach der Anhängeregel den 59. Auftrag auf Index 58 legt, gibt
diesem Index erstmals eine Bedeutung – ein Code mit Index 58, der vorher `fassung` ergab, zeigt danach auf
den neuen Auftrag. Das ist unschädlich, weil ein solcher Code **nie ausgegeben** wurde (die Oberfläche
vergibt nur Indizes unterhalb der Tabellenlänge). Wer es strenger will, friert die Obergrenze ein und
beginnt neue Aufträge erst bei Index 64 – dann bleiben 58..63 für immer frei, und der Code-Vorrat sinkt auf
58 Adressen. **Vorschlag:** Anhängen (Regel 2), weil 6 verlorene Adressen dauerhaft teurer sind als ein
theoretischer Fall, der nie eintreten kann.

---

## 3 · Seed-Kanonisierung

### 3.1 Algorithmus (gleiche Schrittfolge auf jedem Gerät)

```
KANON_FENSTER = 64
seedStart = variante + 1                       // 1..256, direkt aus dem Code

hand(def, seedStart):                          // def = DATEN.ticketSpec-Definition
  für k = 0 … 63:
     s = seedStart + k
     d = def.fuerSeed(s)                       // src/daten/basis.js:159
     wenn Spiel.ticketGueltig(d) UND d !== def      → {seed:s, def:d, eigene:true, schritte:k}
  d0 = def.fuerSeed(seedStart)                 // Rückfall: feste Fassung (dasselbe Netz überall)
  wenn Spiel.ticketGueltig(d0)                 → {seed:seedStart, def:d0, eigene:false, schritte:64}
  sonst                                        → {fehler:"auftrag"}

generiert(skill, seedStart):
  für k = 0 … 63:
     try d = Spiel.generiere(skill, seedStart+k) catch → weiter
     wenn d && Spiel.ticketGueltig(d)          → {seed:seedStart+k, def:d, schritte:k}
  sonst                                        → {fehler:"auftrag"}
```

Wichtig: `DATEN.ticketSpec(...).fuerSeed(seed)` gibt bei „Seed-Fassung taugt nicht" **dasselbe Objekt**
`feste` zurück, bei gelungener Seed-Fassung ein **neues** (`src/daten/basis.js:159-176`). Der Vergleich
`d !== def` erkennt den Rückfall also ohne Zusatzwissen. Der Rückfall ist **kein Fehler**: er liefert
deterministisch dasselbe feste Netz auf allen Geräten – nur eben keine Vielfalt.

### 3.2 Gemessen: 58 Handaufträge × 64 Varianten

| Größe | Wert |
|---|---|
| geprüfte (Auftrag, Variante)-Paare | 3.712 |
| schon bei `schritte = 0` eine **eigene** Seed-Fassung | **3.520 (94,83 %)** |
| Rückfall auf die feste Fassung | **192 (5,17 %)** – genau die 3 Terminal-Aufträge × 64 |
| höchste Schrittzahl `k` | 64 (nur die Terminal-Aufträge; sonst **0**) |
| Mittelwert `k` über alle Paare | 3,31 (entsteht allein aus den 192 Terminal-Rückfällen: 192·64/3712) |
| `Spiel.ticketGueltig` wahr für jede gefundene Fassung | **3.712 / 3.712** |
| Laufzeit | 150,6–316,0 s je nach Maschinenlast; im Lauf der Belegdatei 224,8 s |

**Aufträge ohne jede eigene Fassung (immer dasselbe Netz):** `salon-terminal`, `baeckerei-terminal`,
`buero-terminal`. Das ist **gewollt und im Code begründet** (`src/daten/basis.js:114-116`): Terminal-Aufträge
arbeiten per Fernwartung auf einem echten Rechner, ihre Befehlsmuster nennen konkrete Adressen
(`baeckerei-terminal`: netsh mit 192.168.10.17/.254). Für sie ist das Variantenfeld wirkungslos – ein Code
mit anderer Variante liefert denselben Auftrag. Ehrlich benannt: bei diesen 3 von 58 Aufträgen ist die
„Vielfalt" nur Schein, und die Kanonisierung läuft immer das volle Fenster ab (64 Schritte, deshalb `k = 64`).

### 3.3 Gemessen: generierte Formen, 27 Fertigkeiten × 64 Varianten

| Größe | Wert |
|---|---|
| geprüfte (Fertigkeit, Variante)-Paare | 1.728 |
| erfolgreich mit `schritte = 0` | **1.536 (88,89 %)** |
| höchste Schrittzahl bei Erfolg | **0** |
| Fehlschläge (Fenster erschöpft) | **192** – genau 3 Fertigkeiten × 64 |
| Laufzeit | 25,1–72,8 s je nach Maschinenlast; im Lauf der Belegdatei 25,1 s; Tauglichkeitsmessung zusätzlich 0,2–0,7 s |

**Drei Fertigkeiten lassen sich gar nicht adressieren:** `lab.portsec`, `lab.stp`, `lab.storage`.
Die Messung der Tauglichkeit (Suchraum 128 Seeds je Fertigkeit) nennt den Grund exakt:
`„Kein Injektor für lab.portsec"` – es gibt in `Spiel.INJEKTOREN` keinen Injektor mit dieser Fertigkeit,
`Spiel.generiere` kann also nie ein Ticket bauen. Die unabhängige Gegenprüfung hat den Suchraum auf 200 Seeds
erweitert und dasselbe Ergebnis erhalten (**0 von 200** gültig, `A-pruef-api.json → korrekturen`).
Damit sind **24.576** aller möglichen Codes (3 × 32 Sitzungen × 256 Varianten) nicht einlösbar – sie ergeben
`{fehler:"auftrag"}` und keine Ausnahme. Die übrigen **24 von 27 Fertigkeiten** liefern schon mit
`seed = 1` ein gültiges Ticket. Folge für die Umsetzung:

* `TABELLE_SKILLS` führt alle 27 Indizes (Reihenfolge von `DATEN.skills`), aber nur die 24 tauglichen
  dürfen von der Oberfläche angeboten werden (`tauglich: true`).
* Ein Code mit `art = 1` auf Index 24, 25 oder 26 → `{fehler:"auftrag"}`.
* Die Oberfläche bietet generierte Aufträge über `Spiel.klassenraum.tauglicheFertigkeiten()` an
  (eingefrorene Liste, keine Rechnung beim Start). Wer es zur Laufzeit prüfen will, schneidet die
  Fertigkeiten mit Injektor: `Object.values(Spiel.INJEKTOREN).flatMap(i => i.skills)` ∩ `DATEN.skills`
  ergibt gemessen genau **24** Einträge (Vorschlag der Gegenprüfung, in dieser Sitzung nachgerechnet).

### 3.4 Wie oft ist Kanonisierung wirklich nötig?

Im **Normalbetrieb nie**: `erzeugen` sucht die kanonische Fassung auf dem Lehrergerät und schreibt nur die
`variante` in den Code; das Schülergerät rechnet dieselbe Schleife und findet bei gleicher Programmfassung
denselben Seed mit **0 Schritten** (3.520 + 1.536 = 5.056 von 5.440 erfolgreichen Fällen = 92,9 %).
Die Schleife ist die **Versicherung gegen Fassungsunterschiede** (andere Injektor- oder Vorlagenfassung)
und gegen künftige Änderungen an `fuerSeed`/`generiere` – sie kostet im Normalfall einen einzigen Aufruf.
Die obere Schranke 64 ist bewusst klein: bei 58 Aufträgen × 64 Varianten wurde sie nie gebraucht außer bei
den 3 Terminal-Aufträgen, wo sie planmäßig ausläuft.

**Ehrlich benannt (Befund der Gegenprüfung):** In allen 5.440 gemessenen Fällen trat nur `k = 0` (eigene
Fassung sofort) oder `k = 64` (Rückfall auf die feste Fassung) auf – der Zweig „eigene Fassung erst nach
1..63 Schritten" wurde **nie** beobachtet. Er ist damit eine begründete Versicherung, aber **kein gemessener
Pfad**. Wer ihn belegen will, braucht einen Auftrag, dessen Startseed keine gültige Seed-Fassung hat und ein
Nachbarseed schon – in dieser Fassung gibt es keinen.

---

## 4 · Determinismus-Beweis und Netzkennwert

### 4.1 Zwei getrennte Node-Prozesse, gleicher Code → gleicher Auftrag

Die Probe startet für den Beweis **zwei eigene Kindprozesse** (`spawnSync(process.execPath, [__filename,
"--teil1|--teil2"], {stdio:"inherit"})` – `"pipe"` ist in dieser Sandbox gesperrt). Beide werten dieselben
12 Prüfcodes aus (6 Handaufträge, darunter ein Terminal-Auftrag, 6 generierte über verschiedene
Fertigkeiten) und schreiben Seed, Netzkennwert des Startnetzes, Netzkennwert der über
`Spiel.instanzErstellen` erzeugten Instanz sowie die Schrittzahl in eigene Dateien.

Ergebnis (`messungen.determinismus`, Prozesse **pid 9888** und **pid 13904**, beide `status 0`):

| Größe | Wert |
|---|---|
| verglichene Codes | 12 |
| identisch in Seed, Netzkennwert, Instanz-Kennwert | **12 / 12** |
| Abweichungen | 0 |
| Laufzeit (beide Prozesse zusammen) | 1,7 s |

Beispielzeilen aus `A-codec-teil1.json` (identisch in `-teil2.json`):

```
NL-BAAA-BB   → salon-01        seed 1    Netzkennwert FTJ3L8   Instanz FTJ3L8
NL-8HQM-GG   → praxis-01       seed 204  Netzkennwert MC92HL   Instanz MC92HL
NL-BSAA-CT   → gen-lab.link-1  seed 1    Netzkennwert GCYRWX   Instanz GCYRWX
NL-5YTD-LH   → {fehler:"auftrag"}  (art 1, Index 26 = lab.storage – kein Injektor)
```

Der Kennwert aus `Spiel.instanzErstellen` ist in **allen** erfolgreichen Zeilen gleich dem Kennwert aus
`Spiel.startNetz` – der Weg über die Instanz verändert das Netz also nicht.

### 4.2 Der Netzkennwert (Spezifikationstext)

6 Zeichen aus demselben Alphabet; wird in der Oberfläche angezeigt und in der Vorführung verglichen
(„gleiche Geräte, gleiche Adressen, gleiche Fehlerstelle"). **So ist er gebaut – dies ist der Code, der in
`src/spiel/klassenraum.js` gehört (die Probe führt ihn wortgleich aus):**

```js
/* Kanonische JSON-Abbildung: Objektschlüssel rekursiv sortiert (UTF-16-Reihenfolge, locale-unabhängig) */
function kanonisch(x) {
  if (Array.isArray(x)) return "[" + x.map(kanonisch).join(",") + "]";
  if (x && typeof x === "object")
    return "{" + Object.keys(x).sort().map(k => JSON.stringify(k) + ":" + kanonisch(x[k])).join(",") + "}";
  return JSON.stringify(x === undefined ? null : x);
}
/* FNV-1a (32 Bit) über UTF-16-Codeeinheiten – bewusst ohne Buffer/TextEncoder, damit dieselbe Funktion
   im Browser, in der Einzeldatei und headless identisch läuft. */
function fnv1a(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function netzAbbild(netz) {
  const geraete = {};
  for (const id of Object.keys(netz.geraete || {}).sort()) geraete[id] = netz.geraete[id];
  const schluessel = k => [k.a.geraet, k.a.port, k.b.geraet, k.b.port, k.id].join("\u0000");
  const kabel = (netz.kabel || []).map(k => ({id: k.id, a: {geraet: k.a.geraet, port: k.a.port},
                                              b: {geraet: k.b.geraet, port: k.b.port}}))
    .sort((x, y) => { const a = schluessel(x), b = schluessel(y); return a < b ? -1 : a > b ? 1 : 0; });
  return {v: netz.v, geraete, kabel};          /* netz.zustand (Laufzeit) bleibt DRAUSSEN */
}
function netzkennwert(netz) {
  const h = fnv1a(kanonisch(netzAbbild(netz))) & 0x3fffffff;
  let s = "";
  for (let i = 5; i >= 0; i--) s += zeichen((h >>> (i * 5)) & 31);
  return s;
}
```

Gemessen (`messungen.netzkennwert`), alles am selben Netz:

| Prüfung | Ergebnis |
|---|---|
| gleiches Netz zweimal gebaut | gleicher Kennwert (`YYBR4E`) |
| Schlüsselreihenfolge der Geräte/Felder umgedreht | **gleicher** Kennwert (`YYBR4E`) |
| Kabelreihenfolge umgedreht | **gleicher** Kennwert (`YYBR4E`) |
| `netz.zustand` (Laufzeit: MAC-Tabellen, `_uhr`) verändert | **gleicher** Kennwert (`YYBR4E`) |
| eine IP-Adresse geändert | **anderer** Kennwert (`YYBR4E` → `RB46A7`) |
| Länge / Zeichenvorrat | 6 Zeichen, nur aus dem Alphabet |
| FNV-1a-Gegenrechnung | `fnv1a("A")` = 3.289.118.412 (2166136261 ^ 65, ×16777619 mod 2^32) |

Der Kennwert zeigt also genau das, was in der Vorführung verglichen werden soll (Geräte, Verkabelung,
Konfiguration), und ignoriert, was sich zwischen zwei Geräten ohnehin unterscheidet (Laufzeitzustand,
Reihenfolgen). Er ist **kein** Prüfmittel gegen Manipulation, sondern ein Vergleichsabdruck.

**Zwei Fallen, die gemessen und vermieden sind:**

1. **Flow-Regler.** `Spiel.instanzErstellen` ruft `Spiel.flow.fuer(def)` und – bei generierten Aufträgen –
   `Spiel.flow.anpassen`, was `Spiel.generiere(skill, seed, {flow:"verwicklung"})` aufruft und damit eine
   **andere Auftrags-ID mit anderem Netz** liefert (`src/spiel/postfach.js:79-80`, `src/spiel/flow.js:50-66`).
   Gemessen mit aktivem Flow-Stand „verwicklung" für `lab.link`: ohne `ohneFlow` entsteht
   `gen-lab.link-5-verwicklung` (Kennwert `FFKP5X`), mit `ohneFlow:true` entsteht `gen-lab.link-5`
   (Kennwert `LPKNCW`) – **verschiedene Aufträge zum selben Code**. Bei Handaufträgen ändert der Flow
   nichts (`salon-01`, Kennwert `ZB2KXF` in beiden Fällen). **Der Klassenraum-Weg muss `ohneFlow: true`
   setzen.**
2. **Einstellungen.** `erzeugen`/`ausCode` dürfen `Spiel.generiere` **ohne** `opts.stufe` aufrufen. Der
   Pfad `postfachAuffuellen`/`nachschub` setzt `opts.stufe` aus `Spiel.einst.wahl` – das ist eine lokale
   Einstellung und würde den Auftrag je Gerät ändern.

---

## 5 · API-Vertrag `Spiel.klassenraum`

Die acht Funktionen aus `KLASSENRAUM.md` (Zeilen 26-35), exakt so umzusetzen. Zusätzlich stehen zwei
**Zusatzfunktionen** (`netzkennwert`, `tauglicheFertigkeiten`) und zwei kleine Helfer (`platz`, `platzSetzen`)
im Vertrag – sie sind für die Oberfläche nötig; wer sie nicht will, kann sie weglassen, ohne die acht zu
berühren.

| Funktion | Signatur | Rückgabe bei Erfolg | Rückgabe bei Fehler |
|---|---|---|---|
| `erzeugen` | `({ticketId?, skill?, seed?, dauerMin?, titel?})` | Sitzungsobjekt (Kopie, § 7) | `{fehler:"wahl"｜"auftrag"｜"fassung", grund}` |
| `ausCode` | `(code)` | `{ticketId, seed, art, sitzung, index, variante, skill, eigene, schritte, code}` | `{fehler, grund}` · `null` bei leerer Eingabe |
| `sitzung` | `()` | Sitzung aus `store "klassenraum"` (tiefe Kopie) | `null` |
| `ergebnisCode` | `(inst, abnahme)` | `"E-XXXX-XXX"` | `{fehler:"abnahme"｜"auftrag", grund}` |
| `ergebnisLesen` | `(code)` | `{sitzung, platz, sterne, dauerS, versuche, ok:true}` | `{fehler, grund}` · `null` bei leerer Eingabe |
| `ergebnisEintragen` | `(code)` | `{ok:true, neu:true｜false, platz, sterne, grund?}` | `{fehler, grund}` |
| `exportieren` | `()` | JSON-String (§ 7) | `{fehler:"sitzung", grund}` |
| `importieren` | `(text)` | `{ok:true, sitzung}` | `{fehler:"format"｜"fassung", grund}` |
| `netzkennwert` (Zusatz) | `(netz)` | `"XXXXXX"` (6 Zeichen) | – |
| `tauglicheFertigkeiten` (Zusatz) | `()` | `[{skill, index, ersterSeed}]` (24 Einträge) | – |
| `platz` / `platzSetzen` (Helfer) | `()` / `(zahl)` | `0..31` ｜ `null` · `{ok:true, platz}` | – · `{fehler:"wahl", grund}` bei Zahl außerhalb 0..31 |

Zusatzfeld der Referenzimplementierung: `ausCode` gibt zusätzlich `_def` zurück – die aufgelöste
Ticketdefinition (enthält Funktionen). Nur für Tests und Vergleiche, **nicht speichern und nicht
serialisieren**; die Oberfläche übergibt stattdessen `ticketId`/`skill`/`seed` an `Spiel.instanzErstellen`.

### 5.1 Verhalten im Einzelnen

**`erzeugen`**

* Genau **eine** Quelle: `ticketId` (muss in `TABELLE_AUFTRÄGE` stehen) **oder** `skill` (muss in
  `TABELLE_SKILLS` stehen und `tauglich` sein). Beides oder keines → `{fehler:"wahl"}`.
* `seed` ist ein **Wunsch**, nicht der Seed im Code: `variante = (seed >>> 0) % 256`; ohne `seed` wird
  `Spiel.neuerSeed("klassenraum-variante:<zähler>")` benutzt (kein `Math.random`, wie im Haus üblich).
  Der tatsächliche Seed entsteht aus der Kanonisierung (`variante + 1 + k`) und steht in der Sitzung.
* `dauerMin` (Standard 10, auf 1..120 begrenzt) und `titel` (Standard: `def.titel`) sind **nur Anzeige und
  Export** – sie stehen **nicht** im Code.
* Sitzungskennung: `1 + (Spiel.neuerSeed("klassenraum-id:<zähler>") % 31)` → 1..31.
* Schreibt in `store "klassenraum"`: `zaehler`, `sitzung` (volle Form § 7), `zuletzt`; gibt eine Kopie der
  Sitzung zurück. **Kein** Eintrag in `store "labor"` – der Spielstand bleibt unberührt.

**`ausCode`**

* Reine Rechnung, **keine** Speicheränderung, **keine** Ausnahme. Ablauf: § 1.1 → § 1.2 → Tabelle (§ 2.3) →
  Kanonisierung (§ 3.1).
* `art: "hand"` → `ticketId` aus `TABELLE_AUFTRÄGE[index]`; `art: "generiert"` → `skill` aus
  `TABELLE_SKILLS[index]`, `ticketId` ist die Generator-ID `gen-<skill>-<seed>`.
* Randfälle: `null`/`undefined`/`""` → `null` (nichts getippt = keine Fehlermeldung); fremder Code →
  `{fehler:"prüfziffer"}`; Code aus anderer Fassung → `{fehler:"fassung"}` bzw. `{fehler:"auftrag"}`;
  Ergebniscode im Auftragsfeld → `{fehler:"länge"}` mit Hinweis.

**Der Öffnungsweg für die Oberfläche** (Bereich B/C) – so, und nur so, ist der Auftrag auf allen Geräten
gleich:

```js
const c = Spiel.klassenraum.ausCode(eingabe);
if (!c) return;                                  // nichts eingetippt
if (c.fehler) return zeigeHinweis(c.grund);      // Tippfehler, fremde Fassung …
const inst = c.skill
  ? Spiel.instanzErstellen({gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true})
  : Spiel.instanzErstellen({ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
inst.klassenraum = {sitzung: c.sitzung, platz: Spiel.klassenraum.platz() ?? 0, code: c.code};
Spiel.oeffnen(inst.iid);
```

**`quelle: "klassenraum"` und `ohneFlow: true` – warum, mit Messung** (`messungen.instanzweg`):

| Wirkung | gemessen |
|---|---|
| `ohneFlow: true` verhindert den Flow-Umbau | ohne: `gen-lab.link-5-verwicklung` (`FFKP5X`), mit: `gen-lab.link-5` (`LPKNCW`) |
| `quelle: "klassenraum"` zählt **nicht** als reguläres Postfach-Ticket | `regulaerNachher = 0` (nur `"postfach"`/`"generiert"` zählen, `src/spiel/postfach.js:152`) |
| Auftrag ist trotzdem im Postfach sichtbar | `Spiel.postfach()` enthält die Instanz (`sichtbarImPostfach: true`; nur `pruefung`/`raetsel` sind ausgeblendet) |
| Postfach-Ziel bleibt unberührt | `Spiel.postfachZiel()` = 2 vorher wie nachher; das Postfach füllt sich normal weiter |
| `st.angebot` | wächst um die Auftrags-ID (wie bei jedem neuen Handauftrag, `src/spiel/postfach.js:99`) |
| `st.erledigt` | unverändert beim Öffnen; der Abschluss läuft wie immer über `Spiel.abschliessen` |
| `inst.vielfalt` | `true` bei Handaufträgen (eigene Seed-Fassung wurde übernommen) |

**`ergebnisCode(inst, abnahme)`**

* Nach `Spiel.abschliessen(inst)` aufrufen (dort wird `inst.zeitMs` ein letztes Mal fortgeschrieben) und
  `ergebnis.abnahme` übergeben.
* `inst.klassenraum = {sitzung, platz}` muss gesetzt sein (macht der Öffnungsweg oben); sonst
  `{fehler:"auftrag", grund:"Dieser Auftrag kam nicht über einen Klassenraum-Code."}` (gemessen).
* Ohne `abnahme`: `{fehler:"abnahme", grund:"Ohne Abnahme gibt es keinen Ergebnis-Code."}`;
  `abnahme.bestanden === false`: `{fehler:"abnahme", grund:"Der Auftrag ist noch nicht bestanden."}`;
  `inst === null`: `{fehler:"auftrag", grund:"Kein Auftrag übergeben."}` – **keine Ausnahme**.
* Felder: `sitzung` aus `inst.klassenraum.sitzung`, `platz` 0..31, `sterne = abnahme.sterne` (halbe Sterne),
  `versuche = min(3, max(0, (inst.abnahmen||1) − 1))`, `dauerS = round(inst.zeitMs/1000)`, auf 5110 s
  begrenzt und in 10-s-Einheiten kodiert, also auf 10 s gerundet.
  Gemessen (Zustand nachgestellt: `inst.zeitMs = 72.500`, `inst.abnahmen = 1` gesetzt, dann
  `Spiel.abnahme(inst)` → `inst.abnahmen = 2`): `sterne = 5` → `E-KFWS-HZM`
  → gelesen `{sitzung 9, platz 5, sterne 5, versuche 1, dauerS 70}`.

**`ergebnisEintragen(code)` – idempotent**

* Schlüssel ist der **Platz**. Erster Eintrag gewinnt:
  * derselbe Code noch einmal → `{ok:true, neu:false, grund:"doppelt"}`, Speicherinhalt **byte-identisch**
    (gemessen: `nachErstemGleichNachZweitem = true`, `nach2GleichNach3 = true`).
  * anderer Code für denselben Platz → `{ok:true, neu:false, grund:"platz-schon-da"}`, nichts ändert sich.
  * fremde Sitzung → `{fehler:"sitzung"}` – auch dann, wenn der Platz hier noch frei ist.
  * keine Sitzung → `{fehler:"sitzung", grund:"Es läuft keine Sitzung – erst einen Auftrag erzeugen."}`
  * unsinniger Code (bei laufender Sitzung) → `{fehler:"länge"}` bzw. `{fehler:"prüfziffer"}`, keine Ausnahme.
  * zwei Plätze nacheinander → 2 Einträge (`ergebnisAnzahl = 2`, gemessen).
* Block-Eingabe (mehrere Codes durch Leerzeichen/Zeilenumbruch) macht die **Oberfläche**: sie zerlegt den
  Text und ruft die Funktion je Code. Gemessen mit drei Codes: `neu, neu, doppelt` – die Ampel zählt 2.
* Warum „erster Eintrag gewinnt" und nicht „mehr Sterne gewinnen"? Weil das Ergebnis eines Schülers nicht
  durch einen zweiten Code überschrieben werden soll, ohne dass die Lehrkraft es merkt (siehe offene Punkte).

**`platzkennung` (Leiter-Hinweis 4):** Der Platz ist eine **Zahl 0..31**, die die Schülerin **einmal** im
Klassenraum-Fenster wählt/tippt; sie liegt lokal in `store "klassenraum"` unter `platz`. 0 heißt „ohne
Platz" (Lehrkraft-Rechner). **Ein Klarname ist nicht möglich**: der Codec kennt nur 5 Bit, es gibt kein
Namensfeld – weder im Auftrags- noch im Ergebniscode und nicht im Export.

---

## 6 · Ergebnis-Code `E-…`

### 6.1 Format und Bit-Budget (35 Bit Nutzteil = 7 Zeichen · 5 Bit)

```
E-XXXX-XXX      5 Nutzzeichen · 2 Prüfzeichen, immer genau 10 Zeichen inkl. Trennstriche
n = (sitzung << 20) | (platz << 15) | (sterne << 11) | (versuche << 9) | dauer
```

| Feld | Bits | Bereich | Bedeutung |
|---|---|---|---|
| `sitzung` | 5 | 0..31 | muss zur lokalen Sitzung passen |
| `platz` | 5 | 0..31 | Platzkennung, 0 = „ohne Platz"; nie ein Klarname |
| `sterne` | 4 | 0..10 | halbe Sterne (`round(sterne·2)`); 0 = nicht bestanden |
| `versuche` | 2 | 0..3 | **Fehlversuche** = `abnahmen − 1`, ab 3 als „3+" angezeigt |
| `dauer` | 9 | 0..511 | Einheiten à 10 s → 0..5110 s (1:25:10), Quelle `inst.zeitMs` |

Prüfsumme: dieselbe Rechnung wie beim Auftragscode, über die fünf Nutzzeichen
(`C1` Gewichte 1..5 mod 31, `C2` Gewichte 1,3,5,7,9 mod 32) → derselbe Beweis gilt: Einzel-Ersetzung und
Nachbarvertauschung sind zu 100 % erkannt.

**Antwort auf die Frage „haben Fehlversuche im Budget Platz?"** – **Ja, mit 2 Bit.** Die Alternative wäre
gewesen, sie wegzulassen und die Lehrerliste ohne sie zu zeigen; die Ampel-Spalte „Fehlversuche" ist aber
Teil des Auftrags (Zeile 44). 2 Bit reichen für 0, 1, 2 und „3 oder mehr" – mehr Fehlversuche sind im
Unterricht selten, und die Sterne spiegeln den Versuchsabzug ohnehin. Bezahlt wird das mit der Dauer:
9 Bit in 10-s-Schritten (0..1:25:10) statt 11 Bit in Sekunden – für eine Ampel mit Median-Dauer völlig
ausreichend, zumal `inst.zeitMs` selbst nur auf 1,5 s genau fortgeschrieben wird (`store.entprellungMs`).

**Zur Dauer im Einzelnen** (Gegenprüfung der zweiten Iteration, `A-pruef-api.json`): Die Quelle ist
`inst.zeitMs`; je Arbeitslücke zählt `Spiel.ARBEIT_LUECKE_MS` = 120 s (`src/spiel/ticket.js:175`), am Ende
schreibt `Spiel.abschliessen` die letzte Lücke fort. Die 10-s-Quantisierung heißt: 5.109 s und 5.110 s
landen beide in Einheit 511, im Code steht also 5.110 s; gedeckelt wird erst ab 5.111 s. Um die volle
Reichweite (1:25:10) zu erreichen, müssten ~43 Arbeitslücken anfallen – die 9 Bit sind also reichlich
bemessen, nicht knapp.

**Beispiel:** `E-KFWS-HZM` (Sitzung 9, Platz 5, 5 Sterne, 1 Fehlversuch, 70 s) → Round-Trip ergibt
`{sitzung: 9, platz: 5, sterne: 5, dauerS: 70, versuche: 1, ok: true}`.
Alle 335.168 geprüften Kombinationen (Randwerte erschöpfend über sitzung × platz × sterne × versuche bei
drei Dauern, plus 200.000 Zufallskombinationen) gehen verlustfrei hin und zurück, Längen min = max = 10.

### 6.2 Doppelter oder fremder Code

| Fall | Verhalten (gemessen) |
|---|---|
| derselbe Code zweimal | `{ok:true, neu:false, grund:"doppelt"}`, Sitzung **byte-identisch** |
| anderer Code für denselben Platz | `{ok:true, neu:false, grund:"platz-schon-da"}`, nichts ändert sich |
| Code einer anderen Sitzung | `{fehler:"sitzung", grund:"Dieser Ergebnis-Code gehört zu Sitzung 7 – hier läuft Sitzung 6."}` |
| Code ohne laufende Sitzung | `{fehler:"sitzung", grund:"Es läuft keine Sitzung – erst einen Auftrag erzeugen."}` |
| Tippfehler im Ergebniscode | `{fehler:"prüfziffer"}` (5.000 Mutationen geprüft → 100 % erkannt) |
| Code aus einer anderen Programmfassung | `{fehler:"fassung"}` nur, wenn die Sitzungskennung nicht passt **und** die Prüfsumme stimmt; sonst greift `prüfziffer` |

---

## 7 · Datenschema `store "klassenraum"` und Export/Import

### 7.1 Speicherform (eine Sitzung, Fassungsfeld, Zeitstempel)

```json
{
  "fassung": 1,
  "programm": "probe",
  "sitzung": {
    "id": 6,
    "titel": "Filiale und Zentrale erreichen sich nicht",
    "art": "generiert",
    "ticketId": "gen-lab.gateway-8",
    "skill": "lab.gateway",
    "index": 3,
    "variante": 7,
    "seed": 8,
    "eigene": true,
    "schritte": 0,
    "code": "NL-GS2H-Q9",
    "dauerMin": 10,
    "erstellt": 1759706400000,
    "ergebnisse": {
      "0": {"platz": 0, "sterne": 2.5, "dauerS": 5110, "versuche": 3, "code": "E-GAM9-9JP", "zeit": 1759706400000, "quelle": "eingabe"},
      "3": {"platz": 3, "sterne": 4, "dauerS": 610, "versuche": 1, "code": "E-GDST-735", "zeit": 1759706400000, "quelle": "eingabe"}
    }
  },
  "platz": null,
  "letzte": null,
  "zuletzt": 1759706400000,
  "zaehler": 0
}
```

Dieses Beispiel ist **wörtlich gemessen** (`A-codec.json → messungen.speicher.idempotenz.nach5`), nicht
erfunden: Sitzung 6 entstand aus `erzeugen({skill:"lab.gateway", seed:7, sitzung:6})`, Platz 3 wurde mit
`E-GDST-735`, Platz 0 mit `E-GAM9-9JP` eingetragen. `platz`/`letzte` gehören zur **Schülerseite** desselben
Geräts und sind hier leer (Lehrerrechner).

| Feld | Typ | Bedeutung |
|---|---|---|
| `fassung` | Zahl | Schemaversion dieses Datensatzes (jetzt 1); **nicht** die Programmversion |
| `programm` | Text | `LABOR_VERSION` der schreibenden Fassung (Fassungsprüfung beim Import) |
| `sitzung` | Objekt \| null | die laufende/letzte Sitzung; `null` = keine |
| `sitzung.art` | `"hand"｜"generiert"` | muss zum `art`-Bit im Code passen |
| `sitzung.index` | 0..63 | Tabellenindex (Auftrag) bzw. Fertigkeitsindex |
| `sitzung.variante` | 0..255 | das Variantenfeld, das im Code steht |
| `sitzung.seed` | ≥ 1 | **kanonischer** Seed (Ergebnis der Schleife § 3.1) – nicht im Code |
| `sitzung.eigene` | wahr/falsch | falsch = feste Fassung (Terminal-Auftrag) |
| `sitzung.schritte` | 0..64 | wie viele Kanonisierungsschritte das Lehrergerät brauchte |
| `sitzung.code` | Text | kanonische Druckform `NL-XXXX-XX` |
| `sitzung.ergebnisse` | Abbildung `platz → {platz, sterne, dauerS, versuche, code, zeit, quelle}` | eingetragene Ergebnisse |
| `platz` | 0..31 \| null | **lokal gewählte** Platzkennung dieses Geräts (Schülerseite) |
| `letzte` | Objekt \| null | zuletzt geöffneter Auftragscode (für die Oberfläche) |
| `zuletzt`, `erstellt`, `zeit` | Zahl | Zeitstempel `jetzt()` in Millisekunden |

Gemessene Feldliste von `erzeugen` (genau diese 14 Felder, nichts mehr):
`art, code, dauerMin, eigene, ergebnisse, erstellt, id, index, schritte, seed, skill, ticketId, titel, variante`.

### 7.2 Export/Import (verlustfrei, mit Fassungsprüfung)

```json
{
  "format": "netzwerk-labor/klassenraum",
  "fassung": 1,
  "programm": "1.2.2",
  "zeit": 1759706400000,
  "sitzung": { "…wie 7.1…" }
}
```

Regeln (alle gemessen, `messungen.speicher.exportImport`):

* `exportieren()` liefert ohne Sitzung `{fehler:"sitzung", grund:"Es läuft keine Sitzung – nichts zu exportieren."}`.
* `importieren(text)` gibt die Sitzung **als Ganzes** wieder aus – auch unbekannte Felder bleiben erhalten,
  nur Pflichtfelder bekommen Standardwerte. Gemessen: **verlustfrei = true**, Liste fehlender/abweichender
  Felder leer (Vergleich über die kanonisch sortierte Abbildung; die Reihenfolge der JSON-Schlüssel darf
  sich ändern, der Inhalt nicht).
* **Fassungsprüfung:** `fassung` > 1 → `{fehler:"fassung", grund:"Die Datei stammt aus einer neueren Fassung
  (Stand 2); dieses Programm kennt nur 1."}`; `fassung` ≤ 1 → übernommen (Migration). Abweichendes
  `programm`-Feld (z. B. „1.0.0") wird **angenommen und mitgespeichert**, nicht abgewiesen – die
  Schemaversion ist das Kriterium, nicht die Programmversion; die Oberfläche kann einen Hinweis anzeigen.
* Fehlerfälle mit Beispiel (alle ohne Ausnahme):

| Eingabe | Rückgabe |
|---|---|
| `""` | `{fehler:"format", grund:"Die Datei ist leer."}` |
| `"{kaputt"` | `{fehler:"format", grund:"Das ist keine JSON-Datei."}` |
| `{"format":"netzwerk-labor","speicher":{}}` | `{fehler:"format", grund:"Das ist keine Klassenraum-Datei (format fehlt)."}` |
| `"[]"` | `{fehler:"format", grund:"Das ist keine Klassenraum-Datei."}` |
| `{format, fassung:2, sitzung}` | `{fehler:"fassung", grund:"…neuere Fassung (Stand 2)…"}` |
| `{format, fassung:1}` (ohne `sitzung`) | `{fehler:"format", grund:"In der Datei fehlt die Sitzung."}` |
| `{format, sitzung:5}` / `sitzung:[]` | `{fehler:"format", grund:"Die Sitzung in der Datei ist unbrauchbar."}` |
| `{format, sitzung:{…, ergebnisse:[]}}` | `{fehler:"format", grund:"Die Ergebnisliste in der Datei ist unbrauchbar (Abbildung Platz → Ergebnis erwartet)."}` |
| `{format, fassung:1, programm:"1.0.0", sitzung}` | `{ok:true, sitzung}` (angenommen) |

---

## 8 · Offene Punkte und was nicht geprüft wurde

**Offene Punkte (Entscheidungen für Bereich B/C):**

1. `src/spiel/klassenraum.js` ist **nicht** geschrieben – dieser Text und die Probe sind die Vorlage.
   Die Sitzung liegt in `store "klassenraum"`; das ist genau der eine Store-Schlüssel, den
   `KLASSENRAUM.md` für `src/spiel/zustand.js` erlaubt.
2. Fehlversuche: „erster Eintrag gewinnt" ist eine bewusste Hobby-Entscheidung. Will die Lehrkraft
   Nachbesserungen zulassen, braucht es eine Regel (z. B. „mehr Sterne ersetzen") **und** einen sichtbaren
   Hinweis in der Liste.
3. Nur 24 von 27 Fertigkeiten sind über einen Code erreichbar (kein Injektor für `lab.portsec`, `lab.stp`,
   `lab.storage`). Entweder bleiben sie gesperrt (Vorschlag) oder es entstehen später Injektoren – dann
   rückt der Index nicht nach (Anhängeregel § 2.3), sondern der Eintrag wird `tauglich: true`.
4. Die 3 Terminal-Aufträge haben keine Varianten (immer dasselbe Netz). Für die Vorführung unkritisch,
   für „jeder Code ein anderes Netz" eine Einschränkung.
5. Sitzungskennung 5 Bit = 32 Sitzungen. Zwei Lehrkräfte im selben Raum können dieselbe Kennung erwischen
   (Wahrscheinlichkeit 1/31 je Paar). Bei mehr Bedarf müsste das Feld wachsen – das sprengt die 10 Zeichen.
6. Der Code ist **kein Geheimnis**: wer ihn kennt, hat den Auftrag (im Auftrag ausdrücklich gewollt).
   Ein Rateversuch trifft mit 0,09 % (9 von 10.000) einen echten Auftrag; das ist kein Schutz, sondern
   nur die Feststellung, dass Codes nicht zufällig kollidieren.
7. Vorschlag für `docs/Architektur.md` (nicht von mir geändert): neuer Absatz „Klassenraum-Codec" mit
   Format `NL-XXXX-XX` / `E-XXXX-XXX`, Prüfsummenverfahren, Kanonisierungsfenster 64, Netzkennwert
   (FNV-1a über kanonische JSON-Abbildung, 6 Zeichen), Store-Schlüssel `klassenraum` und den zwei
   Zusatzfunktionen.

**Nicht geprüft (ehrlich benannt):**

* **Zwei echte Geräte / zwei Browserprofile**: Der Determinismusbeweis lief über zwei getrennte
  **Node-Prozesse auf derselben Maschine** (pid 10668 / 13412). Ein Browser- oder Android-Lauf wurde in
  dieser Sitzung **nicht** ausgeführt; `src/ui/**`, `src/stil/**` und die Rust-Teile (C1/C2/D) wurden
  nicht angefasst.
* **`sh tools/test.sh`, `tools/rauch.py`, `bauen.py`, Android-Bau**: nicht ausgeführt (Bereich A legt nur
  neue Dateien an). Gelaufen ist `node tests\run.js` → 251/251 grün, unverändert.
* **Verhalten bei Sperrbildschirm/Zeitwechsel**: Die Probe setzt die Uhr fest (`jetzt.setzen`); echte
  Laufzeitbedingungen (Timer, `store.entprellungMs = 1500`) sind nicht Teil der Messung.
* **Vollständigkeit der Index-Stabilität über künftige Fassungen**: nur die Regel und ein vorgeschlagener
  Test, kein ausgeführter Nachweis über einen Fassungswechsel hinweg.
* **Kollisionen des Netzkennwerts**: 30 Bit aus einem 32-Bit-Hash; die Wahrscheinlichkeit, dass zwei
  **verschiedene** Netze denselben Kennwert bekommen, wurde nicht gemessen (Geburtstagsschranke ~2^15).
* **`erzeugen` mit Zufallsvariante**: Die Messungen benutzen feste Seeds; die Verteilung von
  `Spiel.neuerSeed` über viele Sitzungen wurde nicht statistisch geprüft.
* **Prüfsummenstärke gegen Mehrfachfehler**: Der Beweis gilt für Einzel-Ersetzung und Nachbarvertauschung.
  Zwei gleichzeitige Fehler wurden nicht systematisch gemessen (nur die 10.000 Ein-Zeichen-Mutationen und
  10.000 Zufallscodes). **Vertauschungen nicht benachbarter Nutzzeichen** sind weder beweisbar noch
  erschöpfend gemessen – die Probe der zweiten Iteration hat nur „erste gegen letzte Stelle" geprüft; die
  Prüfsumme erkennt sie in der Regel, garantiert ist es nicht.
* **Der Kanonisierungszweig mit `0 < k < 64`** wurde nie beobachtet (siehe § 3.4) – die Schleife ist für
  diesen Fall also nicht durch Messung gedeckt.
* **`Math.round(sterne*2)` über 10**: `Spiel.sterneBerechnen` liefert 1..5 Sterne, der Encoder klemmt
  zusätzlich; dass ein echter Abnahmefall je über fünf Sterne käme, wurde nicht gemessen (nur die
  Bereichsprüfung des Decoders, § 1.5).
* **Keine Aussage über `Spiel.generiereForm`** (Fernwartung/Plan-Audit/Adressplan): deren Formen sind in
  `erzeugen`/`ausCode` nicht vorgesehen; gebraucht wird nur `Spiel.generiere`.

---

## 9 · Anhang: Befehle und Belegdateien

| Befehl | Ergebnis |
|---|---|
| `& "<node>" tools\klassenraum-probe\A-codec-probe.js` | komplette Messung, 253,2 s im Lauf der Belegdatei (150,6 s ohne parallele Last), schreibt `A-codec.json` + `A-tabelle.json` |
| `& "<node>" tools\klassenraum-probe\A-codec-probe.js --teil1` | ein Prozess, 12 Codes → `A-codec-teil1.json` |
| `& "<node>" tools\klassenraum-probe\A-codec-probe.js --teil2` | zweiter Prozess → `A-codec-teil2.json` |
| `& "<node>" tools\klassenraum-probe\A-recon.js` | Aufklärung: 58 Tickets, 27 Fertigkeiten, 76 Module |
| `& "<node>" tests\run.js` | 251/251 grün (unverändert) |

Belege: `Nachweise/Klassenraum/A-codec.json` (alle Messwerte), `A-tabelle.json` (Index-Tabellen roh und
eingefroren), `A-codec-teil1.json` / `A-codec-teil2.json` (Determinismus), `A-codec.json → befunde`
(Kurzfassung der wichtigsten Ergebnisse). Vorlage/Festlegung: `tools/klassenraum-probe/A-festlegung.md`.

### 9.1 Wie dieser Text entstanden ist (zwei Iterationen, sechs Agenten)

Drei Entwürfe liefen parallel, danach je ein Gegenprüfer, der den Entwurf **gegen die Wirklichkeit**
nachgerechnet hat (eigene Implementierung, eigene Messung). Die Entwurfs- und Prüfdateien bleiben als
zusätzliche Belege liegen; **maßgeblich ist dieses Dokument und `A-codec-probe.js`**:

| Datei | Inhalt | Übernommen? |
|---|---|---|
| `tools/klassenraum-probe/A-format.js` + `A-format.json` | Entwurf Codec/Prüfsumme/Bit-Budget | Messungen bestätigt; die *Erwartungstexte* des Entwurfs zu `C1`/`C2` beim Tausch waren falsch und wurden **nicht** übernommen |
| `tools/klassenraum-probe/A-kanon.js` + `A-kanon.json` (dazu `A-kanon-diag.js`, `A-kanon-teil1/2.json`) | Entwurf Kanonisierung/Determinismus | Zahlen deckungsgleich mit § 3/§ 4 |
| `tools/klassenraum-probe/A-api.js` + `A-api.json` | Entwurf API/Ergebniscode/Schema/Export | Zahlen deckungsgleich; drei Korrekturen übernommen |
| `Nachweise/Klassenraum/A-pruef-format.json` | Gegenprüfung Format | erschöpfende Prüfung des Zeichenraums (0 unbemerkt), zwei Randfälle ergänzt |
| `Nachweise/Klassenraum/A-pruef-api.json` | Gegenprüfung API | drei Korrekturen übernommen (siehe unten) |
| `Nachweise/Klassenraum/A-pruef-kanon.json` | Gegenprüfung Kanonisierung | vier Korrekturen: `bereich`, `auftrag` statt `fassung`, Fertigkeiten-Auswahl, offener `k>0`-Zweig |

**Aus der Gegenprüfung übernommen:**

1. `sitzung`-Fehler tragen jetzt `art: "keine"` bzw. `"fremd"` (die Oberfläche zeigt zwei verschiedene Sätze) – § 1.5.
2. Die Dauer-Erklärung wurde richtiggestellt: 10-s-Quantisierung, nicht Deckelung bei 5.109 s – § 6.1.
3. Die Frage „freier Index wird später belegt" ist ausdrücklich entschieden (Anhängen, § 2.3), statt sie
   stillschweigend offen zu lassen.
4. Die erschöpfende Prüfung des Zeichenraums (130 Mio. Ersetzungen, 3,0 Mio. Vertauschungen, 0 unbemerkt)
   und die zwei Randfälle außerhalb von § 2 stehen in § 1.2.
5. Der Netzkennwert sortiert Kabel **ohne** `localeCompare` (Zeichenkettenvergleich `<`/`>`), damit die
   Reihenfolge nicht von Sprache/ICU abhängt – der Entwurf A-api.js hatte dort `localeCompare`, dieser
   Text nicht.
6. **Neue Fehlerklasse `bereich`** (§ 1.5): ein von Hand gebauter Ergebniscode mit Sterne-Bits 11..15 hätte
   sonst 5,5 bis 7,5 Sterne in die Lehrerliste geschrieben (Befund der Kanonisierungs-Gegenprüfung).
7. Der Kanonisierungszweig `0 < k < 64` ist in dieser Fassung **nie** aufgetreten und steht deshalb
   ausdrücklich als Versicherung (nicht als Messung) in § 3.4 und § 8.
8. Die Auswahl der Fertigkeiten für die Lehrer-Ansicht ist konkretisiert
   (`Object.values(Spiel.INJEKTOREN).flatMap(i => i.skills)` ∩ `DATEN.skills` = 24) – § 3.3.

**Nicht übernommen (bewusst):** Die Gegenprüfung schlug vor, die Obergrenze der Index-Tabellen
festzuschreiben (Aufträge nur bis 57, Fertigkeiten nur bis 26). Das widerspricht der Anhängeregel – siehe
die Begründung in § 2.3.
