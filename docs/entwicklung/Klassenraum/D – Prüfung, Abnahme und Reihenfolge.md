---
tags: [FISI, Lernspiel, Klassenraum, Prüfung, Abnahme]
erstellt: 2026-10-06
aktualisiert: 2026-10-06
status: Entwurf der Endfassung (Bereich D; von der Leitung in die Spezifikation zu verdichten)
---

# D · Prüfung, Abnahme und Reihenfolge

**Bereich D** des Auftrags [`tools/auftraege/KLASSENRAUM.md`](../../../tools/auftraege/KLASSENRAUM.md).
Diese Datei beantwortet die Fragen, die der Auftrag offen lässt, so genau, dass ein Umsetzer
**nichts mehr entscheiden** muss: Testplan, Abnahmebefehle mit heute gemessenen Sollzahlen,
Vorführdrehbuch, Risiken, Reihenfolge, Definition of Done, Berichtsvorlage und die
zitierfähigen Vorschläge für `docs/Architektur.md` und `docs/CHANGELOG.md`.

**Geltung.** Bei Widerspruch gilt der Auftrag; bei Widerspruch zur `docs/Architektur.md` gilt
die Architektur — hier stehen nur **Vorschläge**. Wo eine Festlegung bei einem Nachbarbereich
liegt, steht **„einzusetzen aus Teil A/B/C"**; erfunden wird nichts.

**Stand-Hinweis.** Grundstand `59c6ccf`, alle eigenen Messungen am **06.10.2026, 23:15–23:31**.
Eingearbeitet sind: Bereich A's eingefrorene Festlegung
[`tools/klassenraum-probe/A-festlegung.md`](../../../tools/klassenraum-probe/A-festlegung.md)
(23:18), der Testplan-Entwurf (`Nachweise/Klassenraum/D-entwurf-testplan.md`, 23:25:33) und die
drei Gegenprüfungen (`Nachweise/Klassenraum/D-pruefung-*.md`). Neue Messungen können Sollzahlen
verschieben — die Fundstellen sind überall genannt und **nicht stillschweigend zu ersetzen**.

## 0 · Ausgangslage — in dieser Sitzung gemessen

| Prüfung | Befehl | Ergebnis |
|---|---|---|
| Tests | `& "<node>" tests/run.js` | **251/251 grün**, 35 Testdateien, 76 Module (Exit 0) |
| Filterform | `& "<node>" tests/run.js --klassenraum` | `0/0 grün (35 Testdateien, 76 Module)` — Filter läuft, trifft nichts (**erwartet**) |
| Minimalismus | `python tools/ethos.py` | `GRUEN: keine Regel schlechter als tests\stil-stand.json` (21 Dateien, 1938 Zeilen, 5484 Deklarationen, 1614 Regelblöcke) |
| Klassen ↔ CSS | `python tools/klassen.py` | `0 Klassen ohne CSS-Regel` |
| Simulation | `& "<node>" tools/sim-stand.js` | „Simulation unverändert gegenüber dem Referenzstand." (12 Szenarien) |
| Web-Bau | `python bauen.py` | Exit 0, **0,17 s** |
| Einzeldatei | `python tools/einfach.py` · `--ziel Netzwerk-Labor.html` | Exit 0, **1,22 s** / **0,69 s**, 14 Schriften als Daten-URI, **0 Außenverweise** |
| Erzeugnisse | `Get-FileHash` | `docs/index.html` = `Netzwerk-Labor.html` = `E44E4C6B…13FD`, nach dem Bau **unverändert** |
| Rauchtest | `python tools/rauch.py` | **gescheitert**, Exit 1: „Browser meldet sich nicht auf dem Fernsteuerungs-Port" |
| Menüprobe | `python tools/menueprobe.py --datei android/bau/assets/index.html --lauf` | **gescheitert**, Exit 1: „der Browser meldet sich nicht auf dem Steuerport" |
| Android-Bau | `python android/bauen.py` | Schritte 1–6 ok, **`apksigner` scheitert** an `Programm/` (Exit 1, 4,77 s) |
| Edge-Ursache | eigener Kurzlauf, eigenes Profil, danach gelöscht | `FATAL:mojo…platform_channel.cc:187 Check failed: Zugriff verweigert (0x5)`, Exit `0x80000003` |
| Klassenraum-Code | `grep klassenraum src/` · `typeof Spiel.klassenraum` | **0 Treffer** / `"undefined"` — noch nichts gebaut (Auftrag ist Spezifikation) |

**Vollständiges Protokoll mit Rohausgaben:** [`Nachweise/Klassenraum/D-messung.md`](../../../Nachweise/Klassenraum/D-messung.md)
und die Dateien `D-messung-tests.txt`, `-ruhig.txt`, `-bau.txt`, `-rauch.txt`, `-menueprobe.txt`, `-android.txt`.

**Warum Edge nicht läuft (gemessen, nicht vermutet):** Edge bricht in seiner **eigenen**
Prozess-Sandbox ab (Mojo-Kanal = benannter Kanal, von der Werkzeug-Sandbox verweigert). Deshalb
gibt es in dieser Sitzung **weder Rauchtest noch Menüprobe** und **keine** zwei Profile für den
Vorführvergleich. Der Sollwert 36/36 ist trotzdem **nachprüfbar hergeleitet**: `tools/rauch.py:411-432`
zählt je Breite 1 Fall („erster Auftrag") + 11 Fälle aus `FAELLE` (`tools/rauch.py:175-187`),
also 3 × 12 = **36**.

---

## 1 · Testplan für `tests/klassenraum.test.js`

### 1.1 Form und Zählweise

- **Datei:** `tests/klassenraum.test.js` (neu). `tests/run.js:47` lädt alle `tests/*.test.js`
  alphabetisch; die Datei liegt zwischen `kern.test.js` und `sim-golden.test.js`.
- **Eine Gruppe:** `gruppe("Klassenraum", () => { … })`. Jeder gedruckte Name lautet
  `Klassenraum › <pruefe-Name>` (`tests/harness.js:7`). Der Filter `--klassenraum` trifft damit
  alle neuen Tests und **nichts anderes**.
- **Je Testfall genau ein `pruefe(...)`-Aufruf** — das ist die Zähleinheit (`tests/harness.js:7`:
  ein Eintrag je `pruefe`; `gruppe()` zählt nichts).
- **Nichts auf oberster Ebene der Datei anlegen:** `tests/run.js:44-49` hängt alle Testdateien an
  **ein** Skript — ein zusätzliches `const`/`function` auf oberster Ebene kollidiert und ergibt
  `LADEFEHLER` (Exit 2, **alles** rot). Alle Hilfen gehören in den `gruppe(...)`-Rückruf.
- **Nichts beim Laden aufrufen:** der `gruppe(...)`-Rückruf läuft beim Laden. Ein Aufruf von
  `Spiel.klassenraum` dort ergäbe heute einen Ladefehler statt roter Einzeltests.
- **Kein `erwarte.wirftNicht`:** `tests/harness.js:8-18` kennt nur `wahr`, `falsch`, `gleich`,
  `enthaelt`, `passt`, `wirft`. Ausnahmefreiheit wird mit `try/catch` und Fehlerliste geprüft
  (Hausform: `tests/spiel-vielfalt.test.js:20-41`).
- **Kapsel K (Pflicht):** `store`/`SPEICHER` retten und im `finally` wiederherstellen, Zeitgeber
  löschen (Vorbild `tests/spiel-speichern.test.js:7-34`, `tests/spiel-vielfalt.test.js:7-15`).
  Zusätzlich nötig, weil `Spiel.oeffnen` **schreibt** (`src/spiel/ticket.js:41-59`:
  `sofortSpeichern`, `basisMessen`): `store.initialisieren(...)`, `Spiel._st = Spiel.leererStand()`,
  `Spiel._einst = {}`, `Spiel._lz = {}`, `jetzt.setzen(...)`, `Spiel._trocken = true`.
- **Kein Zustand darf lecken** — kein Test darf einen anderen Test oder eine andere Testdatei
  vorbereiten.

**Abkürzungen im Testplan**

| Kürzel | Bedeutung |
|---|---|
| **S** | `Spiel.klassenraum` |
| **E(s)** | `S.erzeugen({ticketId: "salon-02", seed: s, dauerMin: 15, titel: "Klassenraum-Probe"})` — Seed **1..256** |
| **N(dec)** | Netz der Instanz: `Spiel.instanzErstellen({ticketId: dec.ticketId, seed: dec.seed, quelle: "klassenraum", ohneFlow: true}).netz` (bzw. `Spiel.startNetz` als Gegenprobe) |
| **KW(n)** | `S.netzkennwert(n)` — **6 Zeichen** aus `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (A § 6) |
| **KW₂(n)** | heute messbare Ersatzprobe, solange KW fehlt: `javaHash(JSON.stringify(n)) + ":" + Zeichenzahl` |
| **L(x)** | ausnahmefreies `S.ausCode(x)` → `{wert}` oder `{wurf}` |

**Verbindliche Festlegungen aus Teil A** (Quelle:
[`A-festlegung.md`](../../../tools/klassenraum-probe/A-festlegung.md), 23:18:24, „eingefroren"):
Auftragscode `NL-XXXX-XX` (10 Zeichen gedruckt, **6 Nutzzeichen** = 30 Bit: 4 Nutz + 2 Prüf),
Ergebnis-Code `E-XXXX-XXX` (7 Nutzzeichen), Alphabet **ohne I, O, 0, 1** (32 Zeichen), Prüfsumme
**zwei** Zeichen (`C1 mod 31`, `C2 mod 32` — **nicht** „Summe mod 37"), Seed = `variante + 1`
also **1..256**, Kanonisierungsfenster 64, Fehlerklassen `länge · zeichen · prüfziffer · auftrag ·
fassung · sitzung · wahl`, Speicherform `store "klassenraum"` nach A § 9.

### 1.2 Die 40 Testfälle

| Nr | pruefe-Name (wörtlich) | Behauptung | Vorbereitung | erwartetes Ergebnis |
|---|---|---|---|---|
| 1 | `Code-Round-Trip: derselbe Netzkennwert aus Sitzung und Code` | Das Netz aus dem entschlüsselten Code ist Zeichen für Zeichen das Netz der Sitzung; beide Kennwerte gleich | K; `const s = E(42)`; `dec = S.ausCode(s.code)`; `a = N(dec)`; `b` = Netz aus `Spiel.instanzErstellen({ticketId: s.ticketId, seed: s.seed, quelle:"klassenraum", ohneFlow:true})` | `JSON.stringify(a) === JSON.stringify(b)`; `KW(a) === KW(b)`; Ersatzprobe `KW₂` |
| 2 | `Code-Round-Trip: ticketId, seed und art kommen unverändert zurück` | Der Code transportiert Auftrag **und** Seed; die Sitzung liegt im Store | K; `s = E(42)`; `dec = S.ausCode(s.code)`; `ausStore = S.sitzung()` | `dec.ticketId === "salon-02"`; `dec.seed === s.seed`; `dec.art` ∈ {`"hand"`,`"generiert"`}; Zusatzfelder (`index`,`variante`,`id`,`schritte`) erlaubt; `JSON.stringify(ausStore) === JSON.stringify(s)` |
| 3 | `Determinismus: zweimal ausCode(code) ergibt denselben Auftrag` | Zweimal lesen ergibt denselben Auftrag und Kennwert, auch nach geleertem Laufzeitspeicher | K; `c = E(42).code`; `d1 = S.ausCode(c)`; `Spiel._lz = {}; Spiel.generierte = {}`; `d2 = S.ausCode(c)` | `JSON.stringify(d1) === JSON.stringify(d2)`; `KW(N(d1)) === KW(N(d2))` |
| 4 | `Seed erreicht das Netz: der Kennwert ist nicht der der festen Fassung` | Der Seed landet wirklich im Netz — nicht heimlich die feste Fassung | K; `dec = S.ausCode(E(42).code)`; **kein** Terminal-Auftrag (A § 5) | `KW₂(N(dec)) === "3b072247:12374"` **und** `KW₂(N(dec)) !== "ee287645:12368"` (feste `salon-02`-Fassung) |
| 5–14 | `Vertipper 01: …` … `Vertipper 10: …` (je Buchstabenstelle 1–10) | Eine Vertauschung **genau eines Buchstabens** ergibt niemals eine gültige Sitzung | K; Stellenpool aus echten Codes (Abschnitt 1.3), Fall i = i-te Buchstabenstelle → **nächster Buchstabe** (`Z`→`A`) | `L(kaputt).wurf === undefined`; Ergebnis `null` oder `{fehler: <Klasse>}`; **kein** `ticketId`/`seed` |
| 15–24 | `Vertipper 11: …` … `Vertipper 20: …` (je Ziffernstelle 1–10) | wie 5–14, aber **Ziffern**stelle → nächste Ziffer (`9`→`2`) | wie 5–14, Ziffernstellen | wie 5–14 |
| 25 | `jeder lesbare Code liefert einen lösbaren Auftrag (12 Paare)` | Für 3 Aufträge × 4 Seeds liefert der Code einen lösbaren Auftrag | K; Paare `salon-02`, `baeckerei-02`, `praxis-03` × Seeds `1, 5, 8, 42`; je Paar `S.erzeugen({ticketId, seed})` → `dec` → `def` | `Spiel.ticketGueltig(def) === true` in **12 von 12** Fällen (heute gemessen); Fehlerliste leer |
| 26 | `generierter Auftrag: Code aus Fertigkeit und Seed ist lesbar und der Auftrag lösbar` | Auch ein über `skill` erzeugter Auftrag kommt über den Code zurück und ist lösbar | K; `S.erzeugen({skill: "lab.link", seed: 1})`; `dec = S.ausCode(s.code)`; `def` über `Spiel.generierte`/`Spiel.ticketDef` | `dec.art === "generiert"`; `Spiel.ticketGueltig(def) === true`; `dec.ticketId` nicht leer. **Fällt dieser Fall weg → 39 Fälle → 290** (Rückfall, siehe § 11) |
| 27 | `ergebnisCode/ergebnisLesen-Round-Trip: Sitzung, Platz, Sterne, Dauer und Fehlversuche kommen zurück` | Der Ergebnis-Code trägt Sitzung, Platz, Sterne, Fehlversuche und Dauer und liest sich vollständig zurück | K; Platz = **3** (Zahl 0..31, Weg aus Teil A); `inst = Spiel.instanzErstellen({ticketId:"salon-02", seed:42, quelle:"klassenraum", ohneFlow:true})`; `Spiel.oeffnen(inst.iid)`; `Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung)`; `Spiel.arbeitszieleErfuellen(inst)`; Uhr auf `inst.start + 310000` setzen; `ab = Spiel.abnahme(inst)`; `c = S.ergebnisCode(inst, ab)`; `r = S.ergebnisLesen(c)` | `ab.bestanden === true`; `c` beginnt mit `E-`, gedruckt 10 Zeichen; `r.ok === true`; `r.sterne === ab.sterne`; `r.dauerS === 310` (**10-s-Einheiten**, A § 4 — keine krumme Sekundenzahl); `r.versuche === 0`; `r.platz === 3`; `r.sitzung === Sitzungs-id` |
| 28 | `ergebnisLesen weist einen Ergebnis-Code mit gekippter Prüfsumme ab` | Ein vertippter Ergebnis-Code wird nicht als Ergebnis gelesen | K; wie Fall 27, danach ein Nutzzeichen des Ergebnis-Codes innerhalb derselben Zeichenklasse tauschen | `{fehler:"prüfziffer"}`, kein `ok:true`, kein Wurf |
| 29 | `doppeltes Eintragen ändert die Sitzung nicht: erst neu, dann nicht neu` | Derselbe Ergebnis-Code zweimal eintragen zählt einmal | K; Sitzung; `c` wie Fall 27; `vor = JSON.stringify(S.sitzung())`; `a1 = S.ergebnisEintragen(c)`; `nach1`; `a2 = S.ergebnisEintragen(c)`; `nach2` | `a1 = {ok:true, neu:true}`; `a2 = {ok:true, neu:false}`; `nach1 !== vor`; `nach2 === nach1`; `Object.keys(S.sitzung().ergebnisse).length === 1` |
| 30 | `Ergebnis-Code einer fremden Sitzung wird abgewiesen` | Ein Ergebnis aus einer anderen Sitzung wird nicht eingetragen | K; Sitzung A = `E(42)` mit Ergebnis-Code `cA`; dann neue Sitzung B = `S.erzeugen({ticketId:"baeckerei-02", seed:5})`; `vorB`; `r = S.ergebnisEintragen(cA)` | `r.fehler === "sitzung"`; `S.sitzung()` unverändert `=== vorB`; keine Ergebnisse in B |
| 31 | `Unsinniger Ergebnis-Code ergibt {fehler} statt einer Ausnahme` | Fünf unsinnige Ergebnis-Codes werden abgewiesen, ohne zu werfen | K; Sitzung; `S.ergebnisLesen` und `S.ergebnisEintragen` mit `""`, `"E-"`, `"E-0000-0000"`, `"E-IIII-III"`, `12345` | kein Wurf; `""` → `null`; die anderen → `{fehler: <Klasse>}` (`länge`/`länge`/`zeichen`/`länge`); Sitzung unverändert |
| 32 | `exportieren und importieren ist verlustfrei (tief-gleich, samt Ergebnissen)` | Export/Import gibt die Sitzung samt Ergebnissen unverändert zurück | K; `E(42)`; zwei verschiedene Ergebnis-Codes eintragen; `text = S.exportieren()`; `vor = JSON.stringify(S.sitzung())`; `store.set("klassenraum", null)`; `r = S.importieren(text)` | `typeof text === "string"`; `JSON.parse(text).format === "netzwerk-labor/klassenraum"`; `…fassung === 1`; `r.ok === true`; `JSON.stringify(r.sitzung) === vor`; `JSON.stringify(S.sitzung()) === vor` |
| 33 | `Sitzung überlebt den Neustart: Store geleert, importiert, Ampel-Zahlen unverändert` | Nach Export, geleertem Store und Import sind Ergebnisse und Ampel-Zahlen gleich | K; wie Fall 32; `zahlenVor = ampelZahlen(S.sitzung())` (Hilfsfunktion **im** `gruppe`-Rückruf, s. u.); Store leeren; importieren | `S.sitzung() !== null`; `ampelZahlen(...)` tief-gleich `zahlenVor`; zwei Ergebnisse |
| 34 | `sitzung() liefert null, solange im Store nichts liegt` | Ohne Sitzung im Store gibt es keine Sitzung und keinen Wurf | K; `store.set("klassenraum", null)` | `S.sitzung() === null` |
| 35 | `importieren weist fremden Text mit {fehler} ab und lässt die Sitzung stehen` | Kaputter oder fremder Importtext zerstört die laufende Sitzung nicht | K; `E(42)`; `vor`; Texte `""`, `"null"`, `"{}"`, `"kein JSON"`, `'{"fremd":1}'` | fünfmal `{fehler:<Klasse>}`, kein Wurf, `S.sitzung()` unverändert `=== vor` |
| 36 | `Telefon-Eingabe: Groß/Klein und Trennzeichen ändern den Auftrag nicht` | Kleinschreibung und fehlende/ersetzte Trennzeichen ergeben **denselben** Auftrag | K; `c = E(42).code`; `roh = c.replace(/-/g,"").toLowerCase()`; `leer = c.replace(/-/g," ")`; **vier** Eingaben: `c`, `roh`, `"  " + roh + " "`, `leer` | alle **vier** Ergebnisse `JSON.stringify`-gleich (`ticketId`, `seed`, `art` gleich) |
| 37 | `Unsinnscodes erzeugen {fehler} oder null, nie eine Ausnahme (zehn Fälle)` | Zehn unsinnige Auftragscodes werden abgewiesen, ohne zu werfen | K; `L(x)` für `""`, `"   "`, `"NL"`, `"NL-"`, `"NL-4F7K"`, `"XXXXXXXX"`, `"NL-IIII-II"`, `"NL-0000-00"`, `"A".repeat(40)`, `"NL-4F7K-2Q"` | kein Wurf; `""`/`"   "` → `null`; `"NL"`,`"NL-"`,`"NL-4F7K"`,`"XXXXXXXX"`,`"A"×40` → `{fehler:"länge"}`; `"NL-IIII-II"`,`"NL-0000-00"` → `{fehler:"zeichen"}`; `"NL-4F7K-2Q"` → `{fehler:"prüfziffer"}`; nie `ticketId`/`seed` |
| 38 | `Code-Form: Alphabet ohne I, O, 0 und 1, gedruckte Länge zehn Zeichen, Trenner nur Bindestrich` | Der gedruckte Code hält Form und Alphabet ein | K; Codes aus `E(1)`, `E(5)`, `E(8)`, `E(42)` | gedruckt `NL-XXXX-XX` (10 Zeichen, Gruppen 2-4-2); normalisiert 8 Zeichen (`NL` + 6); jedes Zeichen aus `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; `-` nur als Trenner; Präfix `NL` |
| 39 | `kein Klarname im Auftrags-Code und im Ergebnis-Code` | Im Code steckt keine Person — nur Kennungen | K; `s = S.erzeugen({ticketId:"salon-02", seed:42, titel:"Herr Mustermann ruft an", dauerMin:15})`; Ergebnis-Code wie Fall 27 | `s.code` und `c` bestehen nur aus Alphabetzeichen und `-`; keiner enthält `"MUSTERMANN"`/`"HERR"`; das entschlüsselte Objekt trägt kein `name`- und kein `titel`-Feld; `platz` ist eine Zahl |
| 40 | `eingefrorene Tabellen stimmen mit Spiel.ticketReihe() und DATEN.skills überein` | Die im Programm eingefrorenen Indexlisten passen zur heutigen Reihenfolge — ein verschobener Index ergäbe auf jedem Gerät einen anderen Auftrag | K; eingefrorene Liste gegen `Spiel.ticketReihe().map(t => t.id)` und `DATEN.skills.map(s => s.id)` | beide Listen Element für Element gleich; Länge **58** bzw. **27**; Fehlerliste leer |

**Zwei Hilfen, die es heute noch nicht gibt** und die deshalb **im `gruppe`-Rückruf** stehen müssen
(beide sind Vertragsvorschläge, kein bestehender Vertrag):

- `ampelZahlen(sitzung)` → `{fertig, sterne, medianDauerS}` (Zahl der Einträge in `ergebnisse`,
  Summe/Vergleich der Sterne, Median der `dauerS`). Der Auftrag verlangt die Ampel
  (`KLASSENRAUM.md:44`), der Vertrag nennt aber **keine** Funktion — der Nenner „wie viele offen"
  braucht eine geplante Platzzahl, die A's Sitzungsform (noch) nicht führt.
- `S.netzkennwert(netz)` — A § 6 legt die Rechenregel fest, im **Produktivcode** existiert sie
  nicht (nur in A's Probe `tools/klassenraum-probe/A-kanon.js`). Bis sie in `src/` steht, trägt
  `KW₂` den Vergleich, und im Bericht steht, dass `KW₂` **rekonstruiert** ist.

### 1.3 Die 20 Vertipperfälle im Einzelnen

1. **Pool aus echten Codes** bauen: `S.erzeugen({ticketId:"salon-02", seed})` für `seed = 1, 2, 3, …`
   (Bereich 1..256), bis der Pool **mindestens 10 Buchstaben- und 10 Ziffernstellen** hat —
   Höchstgrenze **32 Codes**.
2. Gezählt werden **nur Nutzzeichen** des normalisierten Codes (nach Abzug von `NL` und der
   Trennzeichen): 6 Stellen je Code, **einschließlich** der zwei Prüfzeichen.
3. Die Voraussetzung wird **laut geprüft**, nicht stillschweigend angenommen:
   `erwarte.wahr(pool.buchstaben.length >= 10, "zu wenige Buchstabenstellen: " + …)` und dasselbe
   für die Ziffern. An A's 12 Codes nachgezählt: **58 Buchstaben- und 14 Ziffernstellen in 72
   Nutzzeichen** — das ist eine **Erwartung, keine Messung**, und der Test prüft sie selbst.
4. **Fall 1–10:** i-te Buchstabenstelle → nächster Buchstabe (`Z`→`A`). **Fall 11–20:** i-te
   Ziffernstelle → nächste Ziffer (`9`→`2`, weil `0` und `1` nicht im Alphabet sind). So bleibt
   jeder Vertipper **innerhalb der Zeichenklasse** und erzeugt kein Fremdzeichen, das nur über
   `länge`/`zeichen` abgefangen würde.
5. **Erwartung je Fall:** kein Wurf, `null` oder `{fehler:<Klasse>}`, **niemals** ein Objekt mit
   `ticketId`/`seed` — also nie eine andere gültige Sitzung.
6. **Registrierung** in einer Schleife, aber mit **eigenem Namen je Fall** und `const`/`let`
   **je Durchlauf** (Closure), sonst prüfen alle 20 Tests den letzten Fall:

   ```js
   FAELLE.forEach((f, i) => pruefe(`Vertipper ${String(i + 1).padStart(2, "0")}: ${f.text}`, () => { … }));
   ```

### 1.4 Erwartete Gesamtzahl nach dem Einbau

**Heute gemessen:** `251/251 grün (35 Testdateien, 76 Module)`.

**Neu: 40 `pruefe(...)`-Aufrufe** ⇒ **251 + 40 = 291**, erwartete Schlusszeile

```
291/291 grün  (36 Testdateien, 77 Module)
```

und mit Filter: `& "<node>" tests/run.js --klassenraum` → **`40/40 grün`**.

**Wie sich die Zahl ergibt:**

| Größe | Rechnung | Beleg |
|---|---|---|
| Testzahl | 251 **+ 1 je `pruefe(...)`** = 251 + 40 = **291** | `tests/harness.js:7` (ein Eintrag je `pruefe`), `tests/harness.js:6` (`gruppe` zählt nicht), `tests/run.js:59` (druckt die Liste) |
| Gegenprobe der Zählweise | **247** Textzeilen mit `pruefe(` in `tests/*.test.js`, aber **251** Tests — die Differenz von 4 entsteht in der Schleife `tests/tickets-vorlagen.test.js:3-4` über die fünf `Spiel.vorlagen` | selbst nachgezählt und reproduziert |
| Testdateien | 35 **+ 1** (`tests/klassenraum.test.js`) = **36** | `tests/run.js:47` liest genau `tests/*.test.js` |
| Module | 75 `.js` in `kern/modell/sim/cli/daten/spiel` **+ 1 Lernmotor** = 76; **+ 1** (`src/spiel/klassenraum.js`) = **77** | `tests/run.js:23-26` lädt nur diese Schichten |
| Was die Modulzahl **nicht** ändert | neue Dateien in `src/ui/` und `src/stil/` (Bereich B) | dieselbe Stelle |

**Wovon die 40 im Einzelnen getragen werden:** 1–4 Round-Trip, Determinismus und Seed-Wirksamkeit
(Auftrag `:38`, `:60`, `:71`); 5–24 der Pflichtfall „20 Vertipper" (`:60`); 25–26 „jeder lesbare
Code liefert einen **lösbaren** Auftrag" (`:60`, `:43`); 27–31 Ergebnis-Code-Round-Trip, Prüfsumme,
Idempotenz, fremde Sitzung und „`{fehler}` statt Ausnahme" (`:31`, `:32`, `:39`, `:60`); 32–35
Export/Import verlustfrei und Neustart (`:33`, `:34`, `:40`, `:57`); 36 Telefon-Eingabe (`:64`);
37 ungültiger/fremder Code (`:28`, `:60`); 38 Code-Form und Alphabet (`:37`, `:69`); 39 kein
Klarname (`:39`, `:70`); 40 eingefrorene Tabellen (`:69`, A § 7d).

**Rückfall:** Entfällt Fall 26 (generierter Auftrag über `skill`), sind es **39 Fälle → 290**.
Grund: A hat für die Fertigkeit `lab.storage` **keinen** spielbaren Auftrag im Kanonisierungsfenster
64 gefunden (fremd gemessen, `A-codec-teil1.json`); Fall 26 benutzt deshalb nur `lab.link`, für den
A die Spielbarkeit belegt hat.

### 1.5 Was dieser Test **nicht** kann

- **Zwei getrennte Browserprofile** (Vorführschritt 2, `KLASSENRAUM.md:54`) — das ist die
  Edge-Messung des Drehbuchs (§ 3). Der Test misst Determinismus nur **innerhalb eines Laufs**
  (Fall 3). Das steht so im Testkopf.
- **Ampel als Oberfläche, Beamer-Lesbarkeit, Code-Eingabefeld** (`:43-44`) — Oberfläche = Teil B;
  hier werden nur die **Daten** geprüft.
- **QR-Code** (`:50`) — Teil C; Fall 1/3 zeigen nur, dass der Code selbsttragend ist.
- **Der Android-Weg** (Groß-/Kleinschreibung, Ziffernfeld) wird hier nur **logisch** geprüft
  (Fall 36); das Tippen auf einem Gerät ist nicht Teil dieses Tests.

---

## 2 · Abnahmebefehle

### 2.1 In dieser Sitzung selbst gemessen

| Befehl | heute gemessener Sollwert | was die neue Funktion daran ändern **darf** | was sie **nicht** ändern darf |
|---|---|---|---|
| `python tools/ethos.py` | `GRUEN: keine Regel schlechter als tests\stil-stand.json.` — 21 Dateien, 1938 Zeilen, 5484 Deklarationen, 1614 Regelblöcke, 1575 Selektor+Kontext; R7/R9/R11 eingehalten, R12 übersprungen | Dateizahl 21 → 22 und Zeilen/Deklarationen/Regelblöcke dürfen **steigen** (neue `src/stil/klassenraum.css`) | keine Regel darf **schlechter** werden als `tests/stil-stand.json` (sonst ROT); R7 (`!important` außer `basis.css`) bleibt 0, R9 (Selektor doppelt) 0, R11 (Zahl ohne Einheit) 0; Rückgabewert 0 |
| `python tools/klassen.py` | `0 Klassen ohne CSS-Regel`, Rückgabewert 0 | nichts — es bleibt **0** | jede neue Klasse aus `src/ui/*.js` braucht eine Regel in `src/stil/*.css`; > 0 = rot |
| `& "<node>" tools/sim-stand.js` | „Simulation unverändert gegenüber dem Referenzstand." + 12 Zeilen (19, 40, 55, 8, 25, 23, 20, 20, 50, 20, 1, 122) | nichts — der Klassenraum fasst `src/sim/` nicht an | keine Ereigniszahl darf sich ändern; Rückgabewert 0 |
| `& "<node>" tests/run.js` | `251/251 grün (35 Testdateien, 76 Module)`, Exit 0 | **291/291 grün (36 Testdateien, 77 Module)** | keine der 251 bestehenden Tests darf rot werden |
| `& "<node>" tests/run.js --klassenraum` | `0/0 grün (35 Testdateien, 76 Module)` — **erwartet** | **40/40 grün (36 Testdateien, 77 Module)** | nicht bei `0/0` bleiben; dann heißt die Datei nicht `tests/klassenraum.test.js` oder die Gruppe nicht `Klassenraum` |
| `python bauen.py` | Exit 0, **0,17 s**, `web/index.html` 1.753.635 B | Dauer und Modulzahl dürfen steigen (**107 Module** heute) | die Fassungsnummer bleibt **1.2.2** (in dieser Ausbaustufe wird keine Fassung gezogen); Exit 0 |

> [!success] ✅ Nachtrag vom 07.10.2026 (Leiter)
> Die Zeile darüber beschreibt den Planungsstand dieser Sitzung und ist inzwischen **überholt**: Für die
> Veröffentlichung wurde die Fassung auf **1.2.3** gezogen (`tools/fassung-ziehen.py --neu 1.2.3 --setzen`),
> weil diese Sitzung ausgeliefert wurde. Der Sollwert für `bauen.py` lautet damit „Exit 0, Version **1.2.3**";
> alles andere in dieser Tabelle gilt unverändert. Beleg: `docs/CHANGELOG.md`, Abschnitt 1.2.3.
| `python tools/einfach.py` | Exit 0, **1,22 s**, 14 Schriften als Daten-URI, **0 Außenverweise**, `docs/index.html` 2.269.597 B | nur die Bytes (neue Quellen) | **0 Außenverweise** bleibt 0; Exit 0 |
| `python tools/einfach.py --ziel Netzwerk-Labor.html` | Exit 0, **0,69 s**, dieselbe Ausgabe | dito | Wurzeldatei und `docs/index.html` bleiben **byte-gleich** zueinander |
| `(Get-FileHash docs\index.html).Hash` / `(Get-FileHash Netzwerk-Labor.html).Hash` | beide `E44E4C6BADDCFB1E3549CF0C08B60DBB277641A50C9731FA2E504FADDCE213FD`, **nach dem Neubau unverändert** | ändert sich nur durch einen **bewussten** Neubau | die beiden Dateien bleiben zueinander byte-gleich; kein unbemerkter Hash-Wechsel |
| `python tools/einfach.py --pruefen docs/index.html` (**nur lesend**) | `2,269,597 Bytes, SHA256 e44e4c6b…13fd` · `GRUEN: keine Aussenverweise – die Datei ist eigenstaendig.`, Exit 0 | Größe und Hash ändern sich mit den Quellen | **0 Außenverweise** bleibt 0; Exit 0 |

### 2.2 Vom Leiter bzw. aus dem Hausstand — heute **nicht** gemessen

| Befehl | Sollwert | warum heute nicht gemessen | was er **nicht** ändern darf |
|---|---|---|---|
| `sh tools/test.sh` | `251/251 grün` | Sandbox: `bash: couldn't create signal pipe, Win32 error 5` | Ersatzweg ist `& "<node>" tests/run.js`; `tools/test.sh:36` ruft vorher `ethos.py` |
| `sh tools/test.sh --rauch` | zusätzlich **36/36** | Edge bricht in der Sandbox ab (Mojo-Kanal) | die neue Startseiten-Eingabe (`KLASSENRAUM.md:72`) darf den **ersten Auftrag** nicht stören — der Rauchtest zieht die Kabel mit **echten Mausereignissen** (`tools/rauch.py:273-309`) |
| `python tools/rauch.py` | **36/36** = 3 Breiten (`:45`) × (1 erster Auftrag + 11 `FAELLE`, `:175-187`) | gescheitert, Exit 1, „Browser meldet sich nicht auf dem Fernsteuerungs-Port" | kein JS-Fehler zählt zusätzlich rot (`:433-436`); kein waagerechter Überlauf; Hauptaktion treffbar |
| `python tools/menueprobe.py --datei android/bau/assets/index.html --lauf` | **5 Profile, 49 Kriterien, 0 verletzt** | gescheitert, Exit 1, „der Browser meldet sich nicht auf dem Steuerport" | die Tiefe der Menüs bleibt unverändert; neue Flächen ≥ 44 px |
| `python android/bauen.py` | **7 Schritte, ~5 s, endet mit `GRUEN`** | Schritte 1–6 ok, `apksigner` scheitert an `Programm/` (`icacls`: `Jeder:(I)(CI)(DENY)(DC)`), Exit 1, 4,77 s; vorhandene APK vom 06.10.2026 22:11:19 (988.700 B) | der Android-Bau darf durch den Klassenraum nicht **zusätzlich** scheitern; `assets/index.html` bleibt byte-gleich zum Bau |
| `python tools/seite-pruefen.py` | `docs/index.html` eigenständig und mit Schriften | nicht versucht | unverändert |
| `python tools/q-echt.py` | `.exe` startet, erster Auftrag löst, 0 Fehler | nicht versucht (kein Auftrag, `.exe` unverändert) | unverändert |

**Kurzfassung:** Rot werden darf am Ende **keiner** dieser Werte. Was sich durch den Klassenraum
ändern **muss**, steht in § 2.1: `tests/run.js` 251 → **291** und der Filter 0/0 → **40/40**.
Alles andere ist ein Rückschritt und im Bericht zu benennen.

---

## 3 · Vorführdrehbuch

### 3.1 Welche Fassung geladen wird — **Entscheidung**

**Die Einzeldatei `Netzwerk-Labor.html` im Projektwurzelverzeichnis, per `file://`.**
`docs/index.html` ist byte-gleich und dient als Gegenprobe.

| | Einzeldatei (`Netzwerk-Labor.html` / `docs/index.html`) | `web/index.html` |
|---|---|---|
| Start | ein Doppelklick — kein Server, kein Python, kein Port | ohne Server unvollständig: `schriften.css` + `web/schriften/` fehlen; `tools/rauch.py:393-394` startet dafür einen HTTP-Server |
| äußere Verweise | **0** (Werkzeugbeleg `tools/einfach.py:36-41`, gemessen) | genau einer (`schriften.css`) plus 14 Schriftdateien |
| Schule | Kopie auf USB/Netzlaufwerk genügt | Server oder mitgelieferte Ordnerstruktur nötig |
| Nachweis | identisch zur veröffentlichten Seite (byte-gleich, gemessen) | 1.753.635 B gegen 2.269.597 B — nicht byte-gleich |
| offener Nachteil | ob `localStorage` unter `file://` einen Browserneustart übersteht, ist im Projekt **nicht** gemessen | — |

Der Auftrag verlangt „ohne Konto, ohne Server, ohne Netz" (`KLASSENRAUM.md:3`) — nur die
Einzeldatei erfüllt das im Klassenzimmer ohne Zusatzschritt. Der offene Nachteil wird **nicht
weggeredet**: Schritt 5 (Export/Import) ist genau dafür da und macht die Vorführung auch dann
vollständig, wenn der Speicher nicht hält. **Vorher messen** (Punkt 6 der Vorbereitungsliste) und
das Ergebnis in die Protokolltabelle schreiben.

### 3.2 Zwei (bzw. drei) getrennte Edge-Profile — exakte Kommandozeile

Die Schalter stammen **wörtlich** aus dem Haus: `tools/rauch.py:398-404` und
`tools/menueprobe.py:619-625`. Neu ist nur, dass **sichtbar** gestartet wird (kein `--headless=new`
— eine Vorführung vor Menschen braucht ein Fenster).

```powershell
# --- gemeinsame Pfade ---
$edge    = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"   # heute per Test-Path bestätigt
$projekt = "C:\Users\Student\Documents\Joshua\10-Projekte\Lernprojekte\Netzwerk-Labor"
$seite   = "$projekt\Netzwerk-Labor.html"          # Einzeldatei, siehe 3.1
$profile = "$projekt\Nachweise\Klassenraum\edge-profile"

# --- Fenster 1: LEHRER (Rechner A) ---
& $edge "--user-data-dir=$profile\lehrer" --no-first-run --no-default-browser-check `
  --disable-extensions --disable-sync --remote-debugging-port=9331 `
  --window-size=1366,768 --window-position=0,0 "$seite"

# --- Fenster 2: SCHÜLER B (Rechner B) ---
& $edge "--user-data-dir=$profile\schueler-b" --no-first-run --no-default-browser-check `
  --disable-extensions --disable-sync --remote-debugging-port=9332 `
  --window-size=960,700 --window-position=1400,0 "$seite"

# --- Fenster 3: SCHÜLER C (Rechner C) ---
& $edge "--user-data-dir=$profile\schueler-c" --no-first-run --no-default-browser-check `
  --disable-extensions --disable-sync --remote-debugging-port=9333 `
  --window-size=960,700 --window-position=1400,720 "$seite"

# --- Fenster 4 (nur die Verschärfung in Schritt 5: frischer Lehrerrechner) ---
& $edge "--user-data-dir=$profile\lehrer-2" --no-first-run --no-default-browser-check `
  --remote-debugging-port=9334 --window-size=1366,768 "$seite"
```

**Warum drei Profile, obwohl der Auftrag zwei nennt:** Schritt 2 verlangt **zwei Schüler**, die
**denselben** Auftrag bekommen. Zwei Fenster **desselben** Profils teilen den `localStorage` — der
Vergleich wäre wertlos. Der Auftrag erlaubt das ausdrücklich („notfalls zwei Browserfenster mit
getrennten Profilen", `:54`).

**Ehrliche Lücke:** Dass zwei verschiedene `--user-data-dir` **zwei getrennte `localStorage`**
bedeuten, ist im Projekt **nicht belegt** — belegt ist nur die Umkehrung
(`src/ui/start.js:73-86` warnt, wenn sich zwei Fenster **einen** Speicher teilen). Die Trennung
ist Eigenschaft des Browsers, nicht des Programms; sie wird in der Vorbereitung **gemessen**
(Punkt 6) und nicht behauptet.

**Nicht getrennt** wird der **Downloadordner** — der ist eine Windows-Einstellung und zeigt bei
einem frischen Profil auf `%USERPROFILE%\Downloads`, also für **alle** Profile auf dasselbe Ziel.
Vorher leeren, Dateinamen notieren, Doppelnamen (`… (1).json`) im Bericht erwähnen.

**Ports:** 9331–9334 sind eigene Wahl; vorher prüfen, ob frei:
`Get-NetTCPConnection -LocalPort 9331 -ErrorAction SilentlyContinue` (leer = frei).
**Nicht 9333 für `tools/starttest.py` verwenden** — das Werkzeug belegt diesen Port selbst.
`--window-position` stammt **nicht** aus den Hauswerkzeugen und ist **heute nicht gemessen**;
es dient nur der bequemen Anordnung und darf wegfallen.

### 3.3 Die fünf Schritte — Klickfolge, Abdruck, Nachweis

**Vorbereitung** (einmal, vor Schritt 1): Profile leeren; Einzeldatei prüfen
(`python tools/einfach.py --pruefen docs/index.html`); Zettel für den Ergebnis-Code; leerer
Exportordner; Edge-Pfad prüfen. **Achtung erster Klick:** auf einem **frischen** Profil startet
das Programm im **Labor** mit dem Einstiegsauftrag „Kasse ohne Netz" (`src/ui/spiel.js:855`
`einstiegStarten()`), **nicht** in „Heute" (`:856` gilt erst mit Fortschritt). Wer den Einstieg
nicht durchspielen will, schaltet ihn über die vorhandene Einstellung ab — **nicht** durch
Herumklicken.

| Schritt | Klickfolge (je Rechner) | Was dabei entsteht | Bildschirmfoto |
|---|---|---|---|
| **1 · Verteilen** | Rechner A → Ansicht **Klassenraum** · „Auftrag wählen" → Auftrag oder Fertigkeit+Stufe → Dauer → **„Sitzung anlegen"** → Code steht groß (≥ 3 m lesbar), daneben **Kopierknopf** und der **Abdruck** | Sitzung im Store `"klassenraum"`, gedruckter Code `NL-XXXX-XX`, Abdruck beider Seiten sichtbar | `D-vorfuehrung-1-lehrer-code.png` |
| **2 · Verteilen an B und C** | Rechner B → Startseite, Feld **„Auftragscode"** → `NL-XXXX-XX` eintippen (bewusst einmal **klein** und **ohne** Bindestriche) → Enter → Auftrag öffnet sich als „Klassenraum-Auftrag". Dasselbe auf C, **anderer** Platz | Beide Geräte bauen denselben Auftrag; **Abdruck beider Seiten ablesen und wörtlich vergleichen** | `D-vorfuehrung-2a-b-auftrag.png`, `-2b-c-auftrag.png`, `-2c-abdruck-vergleich.png` |
| **3 · Einsammeln (1/2)** | B löst den Auftrag → Abnahme → **Ergebnis-Code** `E-XXXX-XXX` erscheint (dezent, kopierbar) → Zettel oder Zwischenablage → Rechner A → Ansicht **Klassenraum** → Feld „Ergebnis-Code" → einfügen → **„Eintragen"** | Liste zeigt Platz, Sterne, Dauer, Fehlversuche; **Ampel 1/2** | `D-vorfuehrung-3a-ergebnis-b.png`, `-3b-ampel-1von2.png` |
| **4 · Zweiter Platz (2/2)** | Rechner A selbst löst den Auftrag (anderer Platz) → Ergebnis-Code → im **eigenen** Feld eintragen | **Ampel 2/2**, Median-Dauer sichtbar | `D-vorfuehrung-4a-ampel-2von2.png` |
| **5 · Neustart überlebt** | Fenster A **schließen** (Prozess endet) → in A **„Exportieren"**… **vorher** ausgeführt, Datei liegt im Exportordner → Fenster A neu starten (**Fenster 4**, frisches Profil) → Ansicht Klassenraum → **„Importieren"** → Datei wählen | Sitzung samt Ergebnissen zurück; **Ampel unverändert 2/2** — **zusätzlich** prüfen, dass die Kopfzeile (Euro/Ruf/Stufe) **unverändert** bleibt | `D-vorfuehrung-5-vorher.png`, `-5a-import.png`, `-5b-ampel-unveraendert.png` |

**Der Klassenraum-Abdruck — Messvorschrift.** Verglichen wird der Abdruck des **fertig gebauten
Netzes** (nicht des Codes). Rechenregel: **6 Zeichen** aus
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, FNV1a32 über das **kanonische** Netz (`geraete` und `kabel`
sortiert, `netz.zustand` bleibt draußen), höchstwertige 5 Bit zuerst — festgelegt in
`A-festlegung.md` § 6, **einzusetzen aus Teil A** in `src/` (heute existiert die Funktion nur in
A's Probe `A-kanon.js:53`). **Anzeige: einzusetzen aus Teil B** — Mindestanforderung:

1. eine **kopierbare** ASCII-Zeile je Ansicht, auf **beiden** Seiten (Lehrer und Schüler),
2. gebildet aus dem **tatsächlich geladenen** Netz, nicht aus dem Code,
3. **kein** Klarname, kein Datum, keine Uhrzeit darin,
4. sichtbar **ohne** Entwicklerwerkzeuge (sonst ist die Vorführung keine Vorführung),
5. Schrift mindestens so groß wie der übrige Fließtext,
6. gleicher Abdruck bei gleichem Auftrag — **zeichengleich**, nicht „ähnlich",
7. steht der Abdruck in beiden Ansichten an **verschiedenen** Stellen, wird die Stelle im
   Protokoll mitgenannt.

**Kontrollweg (wenn die Anzeige fehlt):** die Entwicklerkonsole (F12) auf beiden Rechnern und
dort denselben Ausdruck eingeben; über CDP ließe sich der Wert mit `Runtime.evaluate` ziehen
(`tools/rauch.py:205-210`) — **heute nicht ausgeführt**, weil Edge in dieser Sandbox abbricht.

**Wie protokolliert wird** — Tabelle **wörtlich** ausfüllen, der Abdruck wird **zitiert**, nicht
zusammengefasst:

| Schritt | Gerät/Profil | Abdruck (Netzkennwert) | Sterne | Code | Uhrzeit | Bildschirmfoto |
|---|---|---|---|---|---|---|
| 1 | A / `lehrer` |  | — | `NL-____-__` |  | `D-vorfuehrung-1-lehrer-code.png` |
| 2 | B / `schueler-b` |  | — | derselbe Code |  | `D-vorfuehrung-2a-b-auftrag.png` |
| 2 | C / `schueler-c` |  | — | derselbe Code |  | `D-vorfuehrung-2b-c-auftrag.png` |
| 3 | B → A |  |  | `E-___-___` |  | `D-vorfuehrung-3b-ampel-1von2.png` |
| 4 | A |  |  | `E-___-___` |  | `D-vorfuehrung-4a-ampel-2von2.png` |
| 5 | A neu / `lehrer-2` |  |  | — (Import) |  | `D-vorfuehrung-5b-ampel-unveraendert.png` |

Zusätzlich festhalten: **Geräte, Adressen und Fehlerstelle** beider Schülerseiten (Auftrag `:54`
verlangt sie ausdrücklich) sowie die **Lösbarkeit** (Auftrag lösbar, Abnahme bestanden).

**Bildschirmfotos:** Ordner `Nachweise/Klassenraum/`, Format **PNG**, Namensschema
`D-vorfuehrung-<schritt>-<was>.png` (siehe Tabellen). `Nachweise/` liegt **nicht** im Git
(`.gitignore`), die Bilder gehen also nicht in die Versionierung. Aufnahme mit dem
Windows-Snipping-Werkzeug (`Win + Umschalt + S`) — **nicht** über ein Edge-Menü.

### 3.4 Abbruchkriterien — wann die Vorführung **gescheitert** ist

**Hart (Vorführung wird abgebrochen, keine Beschönigung):**

1. **Abdruck B ≠ Abdruck C** → „Determinismus nicht belegt, Bereich A nachbessern." (Das ist der
   Stolperstein 3 des Auftrags, `:71`.)
2. **Kein Abdruck sichtbar** (nur über Entwicklerwerkzeuge) → die Vorführung zeigt ihre eigene
   Kernbehauptung nicht; Abbruch.
3. **Geräte, Adressen oder Fehlerstelle weichen ab** oder der Auftrag ist auf einer Seite **nicht
   lösbar** → derselbe Befund wie 1.
4. **Ergebnis-Code wird abgewiesen, doppelt gezählt oder die Ampel zeigt etwas anderes als die
   eingetragenen Ergebnisse** → Schritt 3 gilt als gescheitert.
5. **Import verändert die Ampel** (oder die Kopfzeile Euro/Ruf/Stufe) → Schritt 5 gescheitert.
6. **Die Schüleransicht braucht einen Spielstand** oder ein Konto → der Auftrag ist verfehlt.

**Weich (läuft weiter, Befund in den Bericht):** Dauer je Schritt über der Schätzung;
`localStorage` hält den Neustart **nicht** (dann trägt der Import — das ist der geplante Weg);
Doppelnamen im Downloadordner; Fenstermaße weichen ab.

**Meldeform bei einem Abbruch:** Schritt, Gerät, gemessener Wert, erwarteter Wert, Befehl/Handgriff
zum Nachstellen — **kein** „ungefähr", kein Weglassen.

---

## 4 · Risikoliste

| Nr | Risiko | W. | Wirkung | Gegenmaßnahme | Erkennungsmerkmal |
|---|---|---|---|---|---|
| R1 | **Code passt nicht in 10 Zeichen** (Auftrag + Seed + Prüfsumme) | mittel | Stufe A unmöglich oder Code unlesbar | A's Bit-Budget ist gerechnet: 20 Bit Nutzlast + 10 Bit Prüfsumme = 30 Bit = 6 Zeichen (`A-festlegung.md:48-62`); Aufträge über einen **Index** auf die im Programm steckende Liste | Längenbeweis aufgeht nicht, oder ein Feld braucht mehr Bits als vorgesehen |
| R2 | **Determinismus bricht: der Seed landet nicht vollständig im Code** — die **belegte** Bruchstelle ist der **Flow-Regler** (`src/spiel/flow.js:13, :42-48, :50-66`), der am **lokalen** Spielstand hängt, und die Seed-Grenze ist **8 Bit** (`variante`, 1..256) | hoch | Zwei Geräte bekommen verschiedene Netze — die Kernbehauptung fällt | `ohneFlow: true` **im Code erzwingen** (nicht der Oberfläche überlassen) und die Kanonisierung mit Rückfall (`A-festlegung.md:80-101`); Testfall 3/4 | Zwei Profile zeigen für denselben generierten Code verschiedene Adressen; Fall 4 (`KW₂ ≠ ee287645:12368`) wird rot |
| R3 | **Startseite wird heikel, Rauchtest 36/36 kippt** (`KLASSENRAUM.md:72`) | mittel | Abnahme rot, erster Eindruck kaputt | Code-Eingabe **eine Zeile, untergeordnet, kein zweiter Hauptknopf**; Rauchtest nach jedem UI-Schritt; die Mauskabel-Probe (`tools/rauch.py:273-309`) läuft auf **frischem** Spielstand | `python tools/rauch.py` < 36/36 oder „Einstieg nicht wie erwartet" (`:286-287`) |
| R4 | **`tests/run.js` zählt plötzlich anders** (Ladefehler, doppelter Name) | mittel | ganze Testbatterie rot (Exit 2) | kein `const`/`function` auf oberster Ebene der Testdatei; ein `pruefe` je Fall; Zahl **291** und Filter **40/40** nachmessen | `LADEFEHLER:` in der Ausgabe oder eine andere Schlusszeile als `291/291 grün (36 Testdateien, 77 Module)` |
| R5 | **CSS verletzt den eingefrorenen Stil-Stand** | mittel | `ethos.py` ROT, Abnahme blockiert | nur Tokens aus `basis.css`; **vor** dem Schreiben `python tools/ethos.py` laufen lassen; keine neuen Farb-/Größensysteme (`KLASSENRAUM.md:20`) | `ethos.py` meldet eine Regel **schlechter** als `tests/stil-stand.json` |
| R6 | **Neue CSS-Klasse ohne Regel** | mittel | `klassen.py` > 0, Abnahme blockiert | jede Klasse aus `src/ui/klassenraum.js` bekommt eine Regel in `src/stil/klassenraum.css`; `python tools/klassen.py kb-` als Frühprobe | `N Klassen ohne CSS-Regel` mit `≠ 0` |
| R7 | **Sitzung geht bei Neustart verloren** (im Spielstand statt im eigenen Store, oder ohne `store.sofort()`) | mittel | Vorführschritt 5 fällt | eigener Schlüssel `"klassenraum"` (`KLASSENRAUM.md:40`), `store.sofort()` beim Anlegen und Eintragen; Export/Import als Datei; Testfall 33 | Nach dem Neuladen ist `S.sitzung()` `null` oder die Ampel leer |
| R8 | **Klarname landet im Code** | niedrig | aus dem Hobby wird ein Datenschutzthema (`:70`) | nur Sitzungs-`id` (1..31) und `platz` (Zahl 0..31) im Code; Titel und Name bleiben **außerhalb**; Testfall 39 | Der Code oder das entschlüsselte Objekt enthält Buchstabenfolgen aus einem Namen |
| R9 | **Telefon-Eingabe scheitert** (Kleinbuchstaben, Bindestriche, Ziffernfeld) | mittel | Android-Weg unbrauchbar (`:64`) | Normalisierung vor dem Prüfen (Großbuchstaben, alle Nicht-`[0-9A-Z]` weg); Testfall 36; Alphabet **ohne I, O, 0, 1** | `nl4f7k2q` ergibt einen anderen Auftrag als `NL-4F7K-2Q` |
| R10 | **Rust-Teile: nur noch QR und C1 offen.** C2 braucht **keine** Kisten (`tools/klassenraum/Cargo.toml:12-14`: keine `[dependencies]`) und ist gebaut (Artefakt 328.704 B, 13 HTTP-Aufrufe belegt in `Nachweise/Klassenraum/C-http.txt`) | mittel | blockiert **A und B nicht** | A und B zuerst fertig melden; QR erst mit verfügbarer Kiste **oder** belegtem Ersatzweg; C1 erst mit Tauri-Abhängigkeiten | `cargo fetch` scheitert weiter (`Umsetzungsreife Spezifikation.md:33-34`, **fremd** gemessen); `shell/src-tauri/src/klassenraum.rs` existiert nicht |
| R11 | **Android-Bau bricht** | mittel | APK fehlt | `python android/bauen.py` **vor** und **nach** dem Einbau; heute scheitert er bereits an `Programm/` (`DENY (DC)`) — **das ist kein Befund des Klassenraums** | Exit ≠ 0 vor dem Schritt „Packen, ausrichten, signieren" |
| R12 | **Zeilenenden- oder Kodierungsschaden** in neuen Dateien | mittel | riesige Diffs, schleichende Fehler | neue Dateien **UTF-8 ohne BOM, LF**; nach dem Schreiben die Bytes prüfen (`docs/SITZUNGSABSCHLUSS.md:139-148`). Der Arbeitsbaum ist gemischt: `git ls-files --eol` meldet für 330 Einträge **51 × w/crlf, 235 × w/lf, 0 × w/mixed**; der Index ist durch `.gitattributes` (`* text=auto eol=lf`) vollständig LF | `git diff --stat` weicht **stark** von `--ignore-cr-at-eol` ab |
| R13 | **Die parallelen Bereiche A/B/C überschreiben sich** | mittel | Arbeit verloren, widersprüchliche Verträge | getrennte Schreibbereiche (`src/spiel/` = A, `src/ui/`+`src/stil/` = B, `shell/`+`tools/klassenraum/` = C, Belege je `Nachweise/Klassenraum/<Buchstabe>-*`); Vertrag zuerst in `Architektur.md` | Zwei Bereiche nennen dieselbe Datei als ihre eigene; ein Feldname existiert in zwei Formen |
| R14 | **Halbe Sterne fallen unter den Tisch** — `Spiel.abnahme` liefert `sterne` mit **0,5**-Schritten (`src/spiel/abnahme.js:52-61`), der Ergebnis-Code hat 4 Bit für `round(sterne*2)` | mittel | Ampel zeigt falsche Sterne | Testfall 27 vergleicht `r.sterne === ab.sterne` **ohne** Rundung auf ganze Sterne; A § 4 führt Halbschritte | Ampel-Sterne ≠ `ab.sterne` |
| R15 | **`Spiel.instanzErstellen` wirft** bei unbekanntem Ticket (`src/spiel/postfach.js:74-76`) | mittel | Absturz statt `{fehler}` | vor dem Aufruf prüfen, ob die ID in der eingefrorenen Tabelle steht; Fehlerklasse `auftrag` (A § 8); Testfall 37 deckt die Lese-Seite | Ausnahme im Spiel statt Fehlermeldung |
| R16 | **Der Klassenraum-Auftrag zahlt Lohn/Ruf und steht in `st.erledigt` (belegt).** `src/spiel/abnahme.js:98` rechnet den Lohn **ohne** `quelle`-Prüfung, `:117` schiebt **jede** bestandene Abnahme in `st.erledigt`, `:132` bucht Geld und Ruf (`karriere.js:304`); daran hängen Postfach-Ziel (`postfach.js:14`), Kundenakte (`kundenakte.js:153`) und Varianten (`varianten.js:59,66`). Ein Ausschluss `quelle === "klassenraum"` existiert **nicht** | hoch | Vorführschritt 3/4 verändert den Fortschritt des Lehrerrechners — Nebenwirkung, die niemand erwartet | **Entscheidung des Leiters** (Vorschlag: **zulassen und benennen**): entweder Ausschluss additiv einbauen (**fremde Datei, im Bericht nennen**, `COMMON.md:10`) oder bewusst zulassen. **Test:** `st.euro`, `st.ruf`, `st.erledigt.length` vor/nach einem Klassenraum-Abschluss vergleichen | Nach einem Klassenraum-Auftrag steigen Euro/Ruf oder `st.erledigt` wächst |
| R17 | **Kanonisierung findet keine Fassung** — A hat für `lab.storage` im Fenster 64 **keinen** spielbaren Auftrag gefunden (fremd gemessen, `A-codec-teil1.json`) | mittel | Code für diese Fertigkeit ergibt `{fehler:"fassung"}` | Rückfall auf die feste Fassung (`eigene:false`, A § 5) ist **kein** Fehler; freie Indizes ergeben `{fehler:"fassung"}`; Testfall 26 benutzt nur `lab.link` | Ein Fertigkeitscode liefert dauerhaft `{fehler:"fassung"}` |
| R18 | **Veraltete Zahlen wandern in den Bericht** (Aufsatz „46 Aufträge / 213 Tests" gegen heute **58 / 251**) | mittel | Bericht widerspricht der Wirklichkeit | jede Zahl nachzählen; `docs/Architektur.md:251` nennt mit `ee287645:12368` die **feste Alt-Fassung**, nicht einen Code-Abdruck | Zwei Stellen derselben Sitzung nennen verschiedene Tests oder Aufträge |

---

## 5 · Reihenfolge der Umsetzungssitzungen

**Regel aus dem Auftrag:** jede Stufe ist **einzeln vorführbar**; **A zuerst fertigstellen und
melden** (`:42`); C1/C2/D **nur**, wenn A und B stehen **und grün** sind (`:45`); der Server ist in
beiden Formen **optional** — ohne ihn müssen A und B vollständig funktionieren (`:48`).
**Nach jedem Schritt muss das Spiel spielbar und die Tests grün sein.**

| Sitzung | Eingangsvoraussetzung | Ergebnis (was danach existiert und läuft) | Abnahmebefehl(e) | Dauer (Schätzung, `:74`) |
|---|---|---|---|---|
| **A · Verteilen** | nichts außer dem heutigen Stand (251/251 grün); A's Festlegung `A-festlegung.md` ist die verbindliche Schnittstelle | `src/spiel/klassenraum.js` (Codec, Prüfsumme, Kanonisierung, Sitzung im Store, `netzkennwert`), `src/ui/klassenraum.js` (Lehrer-Ansicht: Auftrag wählen, Code groß, Kopierknopf; Schüler: Eingabefeld mit Fehlerrückmeldung), `src/stil/klassenraum.css`, `tests/klassenraum.test.js`, Startseiten-Eingabezeile; **ein Code ergibt auf jedem Gerät denselben Auftrag** | `tests/run.js` → **291/291** (36 Dateien, 77 Module) · `--klassenraum` → 40/40 · `ethos.py` GRÜN · `klassen.py` 0 · `sim-stand.js` unverändert | **≈ 1 Sitzung** |
| **B · Einsammeln** | **A grün gemeldet** | Ergebnis-Code nach bestandener Abnahme; Lehrer-Ansicht mit Eingabefeld (mehrere Codes, Block), Liste (Platz, Sterne, Dauer, **Fehlversuche**), **Ampel**, Export/Import als Datei | dieselben wie A, **plus** Vorführschritte 3–5 durchgespielt (heute: nicht ausführbar, Edge fehlt) | **≈ 1–2 Sitzungen** |
| **C1 · Server in der `.exe`** | **A und B grün**; Tauri-Abhängigkeiten vorhanden | `shell/src-tauri/src/klassenraum.rs`: `GET /liste`, `POST /ergebnis`, in den Einstellungen **abschaltbar, Standard aus**, mit ehrlichem Firewall-Hinweis. **Nur Desktop** — Browser und Android können das nicht | `cargo tauri build --no-bundle` (`docs/SITZUNGSABSCHLUSS.md:100`) · `python tools/q-echt.py` · ohne Server: A und B unverändert grün | **≈ 1 Sitzung** (erster Übersetzungslauf einplanen) |
| **C2 · eigenständiges Binary** | A und B grün — **kein** Kisten-Nachschub nötig (`tools/klassenraum/Cargo.toml:12-14`). **Nicht** durch C1 bedingt (`:47`) | `tools/klassenraum/`: eigenes Cargo-Projekt, `cargo build --release` → eine `.exe` von wenigen MB, **dieselben zwei Endpunkte und dieselbe Datenform** wie C1 (Entwurfsstand und 13 HTTP-Aufrufe belegt: `Nachweise/Klassenraum/C-http.txt`) | `cargo build --release` · dieselbe HTTP-Probe wie in `C-http.txt` · ohne den Server: A und B unverändert grün | **≈ ½ Sitzung zusätzlich** |
| **D · QR auf dem Beamer** | A und B grün; Kiste `qrcode`/`image` **verfügbar oder belegter Ersatzweg** (heute: `qrcode` nicht im Cache, `cargo fetch` scheitert — fremd gemessen) | Rust erzeugt das QR-Bild und reicht es als **Data-URI** an die Oberfläche; **Inhalt = genau der Auftragscode** (kein Link, keine Adresse, kein Konto); in der Browser-Fassung bleibt das Abtippen der Normalfall | QR-Bild mit einem handelsüblichen Scanner lesen → derselbe Auftragscode; A und B unverändert grün | **≈ ½ Sitzung** |

**Meilenstein je Zeile:** „nach diesem Schritt ist das Spiel spielbar und die Tests grün" — wer
eine Zeile abschließt, meldet **A zuerst** und lässt die Nachbarn erst danach anfangen.

---

## 6 · Definition of Done

Der Auftrag gilt als **fertig**, wenn **alle** folgenden Punkte zutreffen:

**Technisch**

1. `src/spiel/klassenraum.js`, `src/ui/klassenraum.js`, `src/stil/klassenraum.css`,
   `tests/klassenraum.test.js` existieren; die additiven Änderungen an `src/ui/app.js`,
   `src/ui/start.js` und `src/spiel/zustand.js` (nur ein Store-Schlüssel) sind im Bericht genannt.
2. Die acht Aufrufe aus `KLASSENRAUM.md:26-35` sind **genau so** vorhanden — Namen, Parameter,
   Rückgaben; jede Abweichung ist im Bericht als Vertragsänderung benannt.
3. `ausCode` **wirft nie**: `null` = nichts eingegeben, `{fehler:<Klasse>, grund:<Satz>}` = ungültig
   (Klassen nach A § 8).
4. Determinismus ist **gemessen**, nicht angenommen: mindestens 20 Seeds **aus 1..256** × alle
   adressierbaren Aufträge (58 Handaufträge, 27 Fertigkeiten), **je zwei Läufe** — und der Weg
   führt über `Spiel.instanzErstellen({…, quelle:"klassenraum", ohneFlow:true})` (nicht nur über
   `Spiel.startNetz(DATEN.tickets[…], seed)`).
5. `tests/klassenraum.test.js` enthält die **40** Fälle aus § 1.2; `tests/run.js` meldet
   **291/291 grün (36 Testdateien, 77 Module)**, `--klassenraum` **40/40**.
6. `ergebnisCode` → `ergebnisLesen` ergibt dieselben Werte (Sitzung, Platz, Sterne **mit
   Halbschritten**, Dauer, **Fehlversuche**); `ergebnisEintragen` ist **idempotent**
   (`{ok,neu}` → `{ok,neu:false}`, Sitzung unverändert).
7. `ergebnisLesen` weist einen Ergebnis-Code einer **fremden** Sitzung ab.
8. Die Sitzung liegt in `store "klassenraum"`, **nicht** im Spielstand; `exportieren`/`importieren`
   ist **verlustfrei** und übersteht einen Neustart (§ 12.1 Speicherform + Export/Import;
   Vorführschritt 5).
9. Ungültige Codes ergeben `{fehler}`, **keine** Ausnahme — für Auftrags- **und** Ergebnis-Codes.
10. `NL-XXXX-XX` (klein, ohne Bindestriche) und `NL-XXXX-XX` (groß, mit) ergeben **denselben**
    Auftrag; das Alphabet enthält **kein** I, O, 0, 1.
11. Die Sitzung nutzt **keine** Klarnamen — nur Sitzungs-`id` und `platz` (Zahl).

**Sichtbar (die fünf Vorführschritte, § 3.3)**

12. Alle fünf Schritte sind **wirklich durchgespielt** — mit **getrennten Profilen**; die
    Netzkennwerte beider Schülerseiten sind **wörtlich** im Bericht, ebenso Geräte, Adressen und
    Fehlerstelle.
13. Bildschirmfotos liegen unter `Nachweise/Klassenraum/` mit dem Namensschema § 3.3.
14. Die Startseiten-Eingabe ist **eine Zeile, untergeordnet, kein zweiter Hauptknopf** (`:72`).

**Dokumentarisch**

15. `docs/Architektur.md` trägt den neuen Paragraphen **§ 12** samt **Stand-Tabelle § 12.8** und den
    **Nachtrag zu § 7.4** (fünfter Store-Schlüssel `klassenraum`).
16. `docs/CHANGELOG.md` trägt einen Abschnitt mit **gemessenen** Zahlen und am Ende die erzeugten
    Dateien mit Bytes und SHA256.
17. Der Bericht nach § 7 liegt vor.
18. `docs/entwicklung/Design – Spielspaß 2.0.md` bekommt einen neuen Abschnitt — **auch die
    verworfenen Versuche** gehören hinein (`docs/SITZUNGSABSCHLUSS.md:123-124`).

**Ehrlich**

19. Der Pflichtabschnitt **„Nicht gemessen"** ist gefüllt: Rauchtest 36/36, Menüprobe, Android-Bau,
    `sh tools/test.sh`, die zwei Profile und alles, was in dieser Sandbox nicht lief.
20. Bekannte Abweichungen stehen im Bericht — z. B. dass `Konzept – Lernplattform…md:46` weiter
    „Schreiben 2 s verzögert" sagt, während die Architektur **1500 ms** festschreibt
    (`docs/Architektur.md:265`).
21. **12** (Rauchtest 36/36, Menüprobe 49/0) gilt **nur**, wenn ein Browser startbar ist — sonst
    steht dort ausdrücklich „heute nicht gemessen".

---

## 7 · Berichtsvorlage (nach `COMMON.md:13` und `KLASSENRAUM.md:76`)

```markdown
# Bericht Klassenraum — Stufe [A | B | C1 | C2 | D]

## 1. Gebaute Dateien (Bytes und SHA256)
| Datei | Bytes | SHA256 | Zeilenenden |
|---|---|---|---|
| src/spiel/klassenraum.js | | | LF, UTF-8 ohne BOM — geprüft mit <Befehl> |
| … | | | |
Additiv geändert: src/ui/app.js, src/ui/start.js, src/spiel/zustand.js — was genau und warum.

## 2. Tatsächliche öffentliche API
Die acht Aufrufe aus KLASSENRAUM.md:26-35, je mit Signatur und Rückgabe.
Abweichungen vom Auftrag ausdrücklich benennen.

## 3. Code-Format (mit Beispiel)
Auftragscode: NL-XXXX-XX (Form) · gültiger Code: <gemessener Code, z. B. NL-BAAA-BB>
Ergebnis-Code: E-XXXX-XXX · gültiger Code: <gemessen>
Alphabet ohne I, O, 0, 1 · Prüfsumme <wie> · Seed 1..256
Hinweis: NL-4F7K-2Q ist die Form aus dem Auftrag und fällt als {fehler:"prüfziffer"} durch.

## 4. Was geprüft wurde (wie, mit welchem Ergebnis)
| Prüfung | Befehl | Ergebnis |
| Tests | node tests/run.js | 291/291 grün (36 Testdateien, 77 Module) |
| Filter | node tests/run.js --klassenraum | 40/40 |
| ethos / klassen / sim-stand | … | … |
| Rauchtest | python tools/rauch.py | <Zahl>/36 oder „heute nicht gemessen" |
| Determinismus | <Befehl> | <Abdruck A> = <Abdruck B>, gemessen am Netz aus
  Spiel.instanzErstellen({…, ohneFlow:true}) — nicht an Spiel.startNetz(DATEN.tickets[…], seed) |

## 5. Die fünf Vorführschritte mit Netzkennwerten
| Schritt | Gerät | Abdruck | Sterne | Code | Bildschirmfoto |
(wörtlich, keine Zusammenfassung)

## 6. Bewusste Vereinfachungen (Hobby-Ebene)
Die sieben Punkte aus KLASSENRAUM.md:66 — je ein Satz, was es konkret heißt.

## 7. Offene Punkte
…

## 8. Vorschläge für docs/Architektur.md
§ 12 (siehe D – Prüfung, Abnahme und Reihenfolge.md § 8) + Nachtrag zu § 7.4.

## 9. Nicht gemessen (Pflichtabschnitt)
Was nicht lief, mit Grund und Ersatzbeleg.
```

---

## 8 · Vorschlag für `docs/Architektur.md` (zitierfähig)

**Beleg, wohin er gehört:** `docs/Architektur.md` hat **815 Zeilen**; der letzte Paragraph ist
`## 11 · Tiefe Menüebenen und Bau (06.10.2026)` in **Zeile 731**, sein letzter Unterpunkt
`### 11.7 Bau` in **Zeile 803**, Dateiende **Zeile 815**. **§ 12 gehört unmittelbar hinter
Zeile 815.** Formvorlage ist § 10 (`:579-729`).

````markdown
## 12 · Klassenraum (Lehrer/Schüler, Hobby-Ebene) — Vertrag

*Vorgeschlagen 06.10.2026 (Bereich D), Form nach § 10. Der Auftrag ist `tools/auftraege/KLASSENRAUM.md`;
bei Widerspruch gilt der Auftrag. Diese Ausbaustufe ist die **Hobby-Fassung / Vorführung**, nicht das
Geschäft: keine Konten, keine Anmeldung, keine Serverpflicht, kein Netzwerkzwang, keine Klarnamen.*

**Kern in drei Sätzen.** Eine Lehrkraft sagt einen kurzen **Auftragscode** an; jedes Gerät baut daraus
**denselben** Auftrag, weil Aufträge seit dem 06.10.2026 deterministisch aus einem Seed entstehen
(`def.fuerSeed(seed)`, `Spiel.ticketGueltig`). Bis Stufe C ist der Klassenraum ein reiner
Datenaustausch über Code und Datei — es gibt **keinen** Netzwerkcode im Spielkern. Erst C1/C2 fügen
einen **optionalen** lokalen Server hinzu; ohne ihn müssen A und B vollständig funktionieren.

### 12.1 Datenform — `store "klassenraum"`

Die Sitzung liegt **nicht** im Spielstand (`store "labor"`), sondern unter einem eigenen Schlüssel
(Auftrag `:40`): ein Schulrechner braucht sie unabhängig vom Spieler-Fortschritt. `store.get`/`store.set`
kopieren tief und schreiben 1500 ms verzögert (`src/kern/basis.js:71-88`) — wer die Sitzung anlegt oder
ändert, ruft zusätzlich **`store.sofort()`**.

```js
/* store "klassenraum" — Wurzel und Sitzung.
   Verbindlich: tools/klassenraum-probe/A-festlegung.md § 9. Abweichungen sind Befunde an Teil A. */
Speicher = {
  fassung: 1,                     // Schemaversion des Klassenraum-Teils
  programm: "<LABOR_VERSION>",
  platz: null,                    // eigener Platz dieses Geräts, Zahl 0..31, null = keiner
  zuletzt: 1759706400000,         // ms, jetzt()
  sitzung: Sitzung | null,
  letzte: null                    // zuletzt gelesenes Ergebnis (Anzeige)
}
Sitzung = {
  id: 7,                          // Sitzungskennung 1..31 (5 Bit im Auftragscode)
  titel: "Klassenraum-Auftrag",   // so verlangt (Auftrag :43)
  art: "hand",                    // "hand" | "generiert"
  ticketId: "salon-01",           // genau eines von ticketId | (skill + seed)  (:27)
  skill: null,                    // Fertigkeit aus DATEN.skills, wenn generiert  (:27)
  index: 0,                       // Index in TABELLE_AUFTRAEGE bzw. TABELLE_SKILLS
  variante: 42,                   // 8 Bit; seed = variante + 1
  seed: 43,                       // 1..256 — größere Seeds sind im Code nicht darstellbar
  code: "NL-BAAA-BB",             // gedruckter Auftragscode  (:37)
  eigene: true,                   // Kanonisierung: eigene Fassung ja/nein
  dauerMin: 10,                   // geschätzte Dauer in Minuten  (:27)
  erstellt: 1759706400000,        // ms, jetzt()
  ergebnisse: {}                  // ABBILDUNG platz → {platz, sterne, dauerS, versuche, code, zeit, quelle}
}
/* Export/Import als Datei:
   {"format":"netzwerk-labor/klassenraum","fassung":1,"programm":"…","zeit":…,"sitzung":{…}} */
```

**Auftragscode** `NL-XXXX-XX`: 10 Zeichen gedruckt, 6 Nutzzeichen (4 Nutz + 2 Prüf), 30 Bit.
**Ergebnis-Code** `E-XXXX-XXX`: 7 Nutzzeichen (5 Nutz + 2 Prüf). Alphabet **ohne I, O, 0, 1**.
Prüfsumme: `C1 = Σ(i+1)·vᵢ mod 31`, `C2 = Σ(2i+1)·vᵢ mod 32` — jede Einzel-Ersetzung und jede
Nachbarvertauschung wird erkannt.

### 12.2 API — `Spiel.klassenraum`

| Aufruf | Rückgabe | Zusicherung |
|---|---|---|
| `erzeugen({ticketId?, skill?, seed?, dauerMin?, titel?})` | `sitzung` | legt die Sitzung an und **schreibt sie sofort** in `store "klassenraum"`; fehlender Seed wird gezogen und **steht im Code** |
| `ausCode(code)` | `{ticketId, seed, art}` \| `{fehler, grund}` \| `null` | **wirft nie**; `null` = nichts eingegeben; normalisiert Groß-/Kleinschreibung und Trennstriche |
| `sitzung()` | aktuelle Sitzung \| `null` | liest nur `store "klassenraum"`, nie den Spielstand |
| `ergebnisCode(inst, abnahme)` | `"E-…"` | trägt Sitzung, Platz, Sterne (Halbschritte), Fehlversuche, Dauer und eine Prüfsumme |
| `ergebnisLesen(code)` | `{sitzung, platz?, sterne, dauerS, versuche, ok}` \| `{fehler, grund}` | **wirft nie**; prüft Prüfsumme und Sitzungszugehörigkeit |
| `ergebnisEintragen(code)` | `{ok, neu}` \| `{fehler, grund}` | **idempotent**: derselbe Code zweimal ändert die Sitzung nicht (`neu:false`) |
| `exportieren()` | JSON-String | verlustfrei; übersteht einen Neustart |
| `importieren(text)` | `{ok, sitzung}` \| `{fehler, grund}` | **wirft nie**; fremdes/beschädigtes JSON ergibt `{fehler}` |

Ein neuer Auftrag entsteht über den vorhandenen Weg
`Spiel.instanzErstellen({ticketId | gen:{skill, seed}, seed, quelle:"klassenraum", ohneFlow:true})`
(`src/spiel/postfach.js:62`) — **vorher prüfen**, denn der Aufruf **wirft** bei unbekanntem Ticket
(`:74-76`). **`ohneFlow: true` ist Pflicht:** ohne es wendet `postfach.js:79-80` den Flow-Regler an,
der am **lokalen** Spielstand hängt (`src/spiel/flow.js:13, :42-48, :50-66`) — derselbe Code ergäbe auf
zwei Geräten verschiedene Netze. Eine Klassenraum-Instanz belegt **keinen** Postfach-Platz (die
Auffüllung zählt nur `quelle === "postfach" | "generiert"`, `:152`, `:157-158`, `:177`).

### 12.3 Fehlerformen

Alle Fehler sind **Daten**, keine Ausnahmen (Auftrag `:60`), in der Form
`{fehler:<Klasse>, grund:<Satz>}`. Klassen (verbindlich): `länge` · `zeichen` · `prüfziffer` ·
`auftrag` · `fassung` · `sitzung` · `wahl`. `null` **nur** aus `ausCode`/`ergebnisLesen`, wenn gar
nichts eingegeben wurde. Der **Satz** ist Anzeigetext und gehört der Oberfläche; wörtlich vorgegeben
ist nur „Prüfziffer stimmt nicht — hast du ein O statt 0 getippt?" (`:43`).

### 12.4 Der Netzabdruck (Netzkennwert) — Messform

Der Determinismus wird **gemessen, nicht behauptet** (`:54`, `:71`). Messgröße ist ein kurzer Abdruck
des **fertig gebauten Netzes** — gebildet aus dem Netz, das auf dem Gerät wirklich geladen ist,
**nicht** aus dem Code.

`Spiel.klassenraum.netzkennwert(netz)` → **6 Zeichen** aus dem Alphabet, FNV1a32 über das **kanonische**
Netz (`geraete` und `kabel` sortiert, `netz.zustand` bleibt draußen), höchstwertige 5 Bit zuerst.

Der Vergleich im Bericht ist **Zeichengleichheit** des kanonischen Textes **und** des Kennwerts.
Gleicher Abdruck = derselbe Auftrag; ungleicher Abdruck = Alarm, und dann ist der Seed nicht
vollständig im Code gelandet. Der Abdruck wird **wörtlich** zitiert, nicht zusammengefasst.
Der Doku-Wert `ee287645:12368` (`§ 7.2`) ist die **feste Alt-Fassung**, **nicht** der Abdruck eines
Klassenraum-Codes. **Form und Ort der Anzeige: Teil B.**

### 12.5 Live-Server (Stufe C, in **Rust**) — zwei Endpunkte

Der Server ist **optional**: ohne ihn müssen A und B vollständig funktionieren (Ergebnis-Codes
eintippen); das Spiel fragt nur ab, wenn er erreichbar ist, und meldet **keinen** Fehler, wenn nicht
(`:48`). Beide Bauformen sind **nur lokal** — kein Internet, keine Cloud, keine Konten — und liefern
**keine Klarnamen**, nur Platz-Kennungen (`:49`).

| Form | Ort | Endpunkte |
|---|---|---|
| **C1** in der Desktop-`.exe` (nur Desktop) | `shell/src-tauri/src/klassenraum.rs` | `GET /liste` · `POST /ergebnis` |
| **C2** eigenständiges Binary (Browser-/Android-Fall und Rückfall) | `tools/klassenraum/` (eigenes Cargo-Projekt, `cargo build --release`) | **dieselben** zwei Endpunkte, **dieselbe** Datenform |

**Datenform beider Endpunkte — belegt aus C2** (Entwurfsstand, 13 echte HTTP-Aufrufe):
`GET /liste` (optional `?sitzung=CODE`) → `200` +
`{"format":"klassenraum-liste","v":1,"sitzung":…,"anzahl":…,"sitzungen":[…],"ergebnisse":[…]}`
`POST /ergebnis` → `201` (neu) / `200` (idempotent) +
`{"format":"klassenraum-ergebnis","v":1,"ok":…,"neu":…,"anzahl":…,"platz":…,"sitzung":…,"lagerVoll":…}`
Fehler → `400`/`409`/`413`/`415` + `{"format":"klassenraum-fehler","v":1,"fehler":…,"feld":…}`.
Einschalten in den Einstellungen, **Standard aus**, mit ehrlichem Hinweis auf die
Windows-Firewall-Abfrage beim ersten Start (`:46`). Der C1-Einbau ist **noch nicht gebaut**.

### 12.6 QR-Code (Stufe D, in **Rust**)

Die Lehrkraft zeigt den Auftragscode als QR-Bild; Schüler scannen und landen direkt im Auftrag. In der
Desktop-Fassung erzeugt **Rust** das Bild (Crate `qrcode`/`image`) und reicht es als **Data-URI** an die
Oberfläche; der **Inhalt ist genau der Auftragscode** — kein Link, keine Adresse, kein Konto —, damit
jeder handelsübliche Scanner funktioniert (`:50`). In der Browser-Fassung bleibt das Abtippen der
Normalfall. **Form des Data-URI und Bildtyp: Teil C.**

### 12.7 Grenzen (Hobby-Ebene, bewusst)

Kein Schutz gegen Abschreiben (wer den Code hat, hat den Auftrag — gewollt) · keine Identität, nur
Platz-Kennungen · keine Zeit- oder Sperrlogik · keine Serverpflicht · kein QR in der Browser-Fassung ·
keine Auswertung über die Ampel hinaus · keine Mehrfach-Sitzungen gleichzeitig (`:66`).
Ausdrücklich **nicht** in diesem Auftrag: Konten, Anmeldung, Passwörter, Serverpflicht, Bezahlung,
Lizenzverwaltung, Mandantenfähigkeit, Marktplatz, Datenschutzkonzept, Autorenwerkzeug,
Fortschritts-Dashboards (`:7`).

### 12.8 Stand der Umsetzung (06.10.2026, vor der ersten Zeile Code)

| Punkt | Stand |
|---|---|
| ① Vertrag (dieser Abschnitt) | **Vorschlag** – noch nicht in der Architektur, noch nicht gebaut |
| ② Codec + Determinismus (Stufe A) | offen |
| ③ Oberfläche A: Lehrer-Ansicht, Code groß, Kopierknopf; Schüler-Eingabe | offen |
| ④ Oberfläche B: Ergebnis-Code, Eingabe mehrerer Codes, Ampel, Export/Import | offen |
| ⑤ Tests (`tests/klassenraum.test.js`, **291/291**) | offen |
| ⑥ Live-Server C1 in der `.exe` (optional) | offen |
| ⑦ Live-Server C2 als eigenes Binary (optional) | Entwurf gebaut und per HTTP-Probe belegt, **nicht** in den Spielweg eingebunden |
| ⑧ QR-Code D (Rust, Data-URI) | offen – Kiste `qrcode` heute nicht verfügbar |
| ⑨ Startseiten-Eingabezeile + Rauchtest 36/36 | offen – Rauchtest heute nicht messbar (kein startbarer Edge) |
````

**Nachtrag zu § 7.4 (Schlüssel) — ebenfalls vorzuschlagen:** Der Klassenraum legt seine Sitzung
unter dem **fünften** Schlüssel `klassenraum` ab (`KLASSENRAUM.md:40`). Er liegt im **selben**
Speicher (`netzwerk-labor` / `spielstand.json`) wie die übrigen, ist aber vom Spielstand getrennt:
`store "labor"` bleibt unangetastet. Geschrieben wird wie überall entprellt (1500 ms);
`erzeugen` und `ergebnisEintragen` rufen zusätzlich `store.sofort()` (`src/kern/basis.js:86`).
§ 7.4 nennt heute nur `labor`, `einst`, `sandbox`, `labor-sicherung` (`docs/Architektur.md:264`).

---

## 9 · Vorschlag für `docs/CHANGELOG.md` (zitierfähig)

**Platzierung — eine Entscheidung, keine belegte Hausregel.** Der Verlauf ist widersprüchlich:
`## 1.2.1` steht in **Zeile 12**, `## 1.2.2` in **Zeile 31**, der „in Arbeit"-Abschnitt `## 1.2.0`
in **Zeile 137** — also **unter** beiden. Es gibt **keinen** 1.2.3-Abschnitt.
Zwei vertretbare Wege: **(a)** „jüngste Fassung zuerst" → neue `## 1.2.3` **vor Zeile 12**;
**(b)** Hausform der „in Arbeit"-Abschnitte → **vor Zeile 137**. **Empfehlung D: (a).**
Die alte Unstimmigkeit wird **nicht** geheilt (`docs/SITZUNGSABSCHLUSS.md:57-58`).

```markdown
## 1.2.3 — Klassenraum (in Arbeit)

Schwerpunkt: die Lehrer-/Schüler-Instanz als **Hobby-Fassung** — ein angesagter Code, ein überall
gleicher Auftrag, eingesammelte Ergebnisse als Ampel. Ohne Konto, ohne Server, ohne Netz.
Maßgeblich: tools/auftraege/KLASSENRAUM.md.

**Code und Determinismus**
- Auftragscode `NL-XXXX-XX` (Form), Beispiel (Form): `NL-4F7K-2Q` · gültiger Code: <gemessen>.
  Alphabet ohne I, O, 0, 1; zwei Prüfzeichen (mod 31, mod 32) gegen Vertipper.
- Ergebnis-Code `E-XXXX-XXX` mit Sitzung, Platz, Sternen (Halbschritten), Fehlversuchen, Dauer.
- Gemessen: <n> Seeds × <m> Aufträge, derselbe Netzkennwert auf beiden Profilen.

**Oberfläche**
- Lehrer-Ansicht (Code groß, Kopierknopf, Ampel, Ergebnisse, Export/Import), Schüler-Ansicht
  (Code-Eingabe, Fehlerrückmeldung, Auftrag öffnet sich), Startseiten-Eingabe in einer Zeile.

**Gemessen (06.10.2026)**
- `node tests/run.js` → **291/291 grün (36 Testdateien, 77 Module)**, Filter `--klassenraum` 40/40.
- `python tools/ethos.py` GRÜN · `python tools/klassen.py` 0 · `node tools/sim-stand.js` unverändert.
- <was noch gemessen wurde, mit Zahl>

**Erzeugte Dateien**
| Datei | Bytes | SHA256 |
|---|---|---|
| docs/index.html | | |
| Netzwerk-Labor.html | | |
```

**Regel für das Einsetzen:** alle Zahlen erst **nach** der Umsetzung eintragen, mit dem Befehl
daneben; `docs/index.html` und `Netzwerk-Labor.html` müssen denselben SHA256 tragen
(`docs/Architektur.md:814-815`).

---

## 10 · Bewusste Vereinfachungen und Nicht-Ziele

### 10.1 Bewusste Vereinfachungen (die **sieben** Punkte aus `KLASSENRAUM.md:66`)

| # | Vereinfachung | was das konkret heißt | warum vertretbar | was es stillschweigend kaputt machen würde |
|---|---|---|---|---|
| 1 | **Kein Schutz gegen Abschreiben** | Wer den Code hat, hat den Auftrag | gewollt: es ist eine Ansage an der Tafel | wer Nachschreiben für Betrug hält, baut plötzlich Identität ein — das ist ein anderer Auftrag |
| 2 | **Keine Identität** | nur Platz-Kennungen (Zahl 0..31), keine Namen | Datensparsamkeit; kein Konto nötig | sobald ein Name im Code landet, ist es ein Datenschutzthema |
| 3 | **Keine Zeit- oder Sperrlogik** | der Code gilt, wann er getippt wird | eine Unterrichtsstunde braucht keine Frist | „der Auftrag ist abgelaufen" wäre eine Funktion, die niemand bestellt hat |
| 4 | **Keine Serverpflicht** | A und B laufen vollständig ohne C1/C2 | Schulnetze sind unzuverlässig und gesperrt | wird der Server Pflicht, fällt die Browser- und die Android-Fassung aus |
| 5 | **Kein QR-Code in der Browser-Fassung** | Stufe D liefert ihn nur in der Desktop-Fassung | Rust darf dort arbeiten, wo es Gewinn bringt | ein JavaScript-QR wäre ~300 Zeilen, die niemand pflegt |
| 6 | **Keine Auswertung über die Ampel hinaus** | fertig / offen / Median-Dauer, sonst nichts | die Lehrkraft sieht, was sie braucht | Noten, Verläufe und Dashboards sind ein anderes Produkt |
| 7 | **Keine Mehrfach-Sitzungen gleichzeitig** | ein Gerät führt genau eine Sitzung | ein Klassenraum, eine Stunde | zwei parallele Kurse auf demselben Rechner bräuchten eine Sitzungsverwaltung |

### 10.2 Nicht-Ziele dieses Auftrags (elf Punkte aus `KLASSENRAUM.md:7`, wörtlich)

Konten · Anmeldung · Passwörter · Serverpflicht · Bezahlung · Lizenzverwaltung ·
Mandantenfähigkeit · Marktplatz · Datenschutzkonzept · Autorenwerkzeug · Fortschritts-Dashboards.

### 10.3 Was ausdrücklich späteren Aufträgen gehört

Wer das Geschäft will, liest
[`docs/entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md`](../Konzept%20%E2%80%93%20Lernplattform%20f%C3%BCr%20Betriebe%20und%20Schulen.md)
(Stufen 1–4). Dort stehen die Abschnitte, die hier **nicht** gebaut werden: § 2 (Ausgangslage),
§ 3 (Stufen), § 4 (Konten und Rollen), § 5 (Serverbetrieb), § 6 (Datenschutz), § 7 (Lizenz und
Bezahlung), § 8 (Autorenwerkzeug), § 9 (Fortschritt und Auswertung), § 10 (Mandanten), § 11 (Betrieb),
§ 12 (Marktplatz). **Bekannte Abweichung, die in den Bericht gehört:** `Konzept…md:46` nennt weiter
„Schreiben 2 s verzögert", während `docs/Architektur.md:265` **1500 ms** festschreibt.

---

## 11 · Offene Punkte und was nicht geprüft wurde

### 11.1 Entscheidungen, die die Leitung treffen muss

1. **`NL-4F7K-2Q` — Auftrag gegen Prüfsumme.** Der Auftrag verlangt (`:64`), dass `NL-4F7K-2Q`
   und `nl4f7k2q` **beide gehen**. A's Prüfsumme lehnt genau diesen Code ab: nachgerechnet
   `C1 = 159 mod 31 = 4` (Zeichen `E`, Code hat `2`), `C2 = 249 mod 32 = 25` (Zeichen `3`, Code hat `Q`) ⇒
   `{fehler:"prüfziffer"}`.

   > [!success] ✅ Vom Leiter nachgerechnet am 2026-10-06
   > Hier standen zuerst falsche Zwischenwerte (`C1 ≡ 6`, `C2 ≡ 8`). Richtig ist: `4F7K` hat die Werte
   > `[26, 5, 29, 9]`, damit `1·26+2·5+3·29+4·9 = 159 → 159 mod 31 = 4 → „E"` und
   > `1·26+3·5+5·29+7·9 = 249 → 249 mod 32 = 25 → „3"`. Gültig wäre also `NL-4F7K-E3`. Die Folgerung
   > (der Beispielcode fällt mit `prüfziffer` durch) war schon richtig.

   **Empfehlung D:** `NL-4F7K-2Q` als **Form** lesen (so steht es in
   `A-festlegung.md:20-21`); Testfall 36 prüft die Normalisierung an einem **echten** Code **und**
   zusätzlich, dass `NL-4F7K-2Q` und `nl4f7k2q` **dasselbe** Ergebnis liefern (nämlich dieselbe
   Fehlerklasse). Die Alternative — die Prüfsumme so ändern, dass dieses Beispiel gültig wird —
   wäre eine Änderung an A's eingefrorener Festlegung.
2. **R16: Zahlt ein Klassenraum-Auftrag Lohn und Ruf?** Belegt: ja, ohne Sonderfall
   (`src/spiel/abnahme.js:98, :117, :132`). Vorschlag D: **zulassen und im Bericht benennen** —
   oder additiv einen Ausschluss für `quelle === "klassenraum"` einbauen (fremde Datei, im Bericht
   nennen).
3. **Ampel-Nenner „offen".** Der Auftrag verlangt „wie viele fertig / wie viele offen"
   (`:44`); A's Sitzungsform führt **keine** geplante Platzzahl. Vorschlag D: `plaetze` in die
   Sitzung aufnehmen (Vorschlag an A) — sonst zeigt die Ampel nur „fertig" und den Median.
4. **Weg zum Platz.** A § 4/§ 9 legt `platz` als Zahl 0..31 im Speicher fest; **wie** die
   Oberfläche ihn setzt (eigener Setter oder `store.set`), ist offen — **einzusetzen aus Teil A**.
5. **CHANGELOG-Platzierung** (§ 9): vor Zeile 12 oder vor Zeile 137.
6. **Anzeigeform des Abdrucks** — **einzusetzen aus Teil B** (§ 3.3, sieben Mindestpunkte).

### 11.2 Kleine Vertragslücken, die noch zu schließen sind

- `Spiel.klassenraum.netzkennwert(netz)` und eine Ampel-Zählung (`ampelZahlen`) stehen **nicht**
  im Acht-Aufrufe-Vertrag (`KLASSENRAUM.md:26-35`). Beide werden gebraucht; sie gehören als
  **Vertragsergänzung** in § 12.2 (Vorschlag D).
- Der Seed-Bereich ist **1..256** (`variante + 1`); `erzeugen({seed})` muss größere Werte
  kanonisieren **und das im Dateikopf dokumentieren**.
- `versuche` (Fehlversuche) fehlt in der ersten Fassung des Vertrags, ist aber verlangt (`:44`)
  und im Bit-Budget vorhanden (2 Bit).

### 11.3 Was in dieser Sitzung **nicht** gemessen wurde

| Prüfung | Grund | Ersatzbeleg |
|---|---|---|
| `sh tools/test.sh` | Sandbox: `bash: couldn't create signal pipe, Win32 error 5` | `node tests/run.js` → 251/251 |
| `sh tools/test.sh --rauch` / `python tools/rauch.py` (36/36) | Edge bricht in der Sandbox ab (`platform_channel.cc … Zugriff verweigert (0x5)`, Exit `0x80000003`) | Herleitung 3 × 12 aus `tools/rauch.py:411-432`, `:175-187` |
| `python tools/menueprobe.py … --lauf` (5/49/0) | derselbe Edge-Abbruch | Sollwert aus `AGENTS.md` |
| `python android/bauen.py` (GRUEN) | `Programm/` ist schreibgeschützt (`icacls`: `Jeder:(I)(CI)(DENY)(DC)`); `apksigner` scheitert mit „Zugriff verweigert" | vorhandene APK vom 06.10.2026 22:11:19, 988.700 B |
| **Die fünf Vorführschritte mit zwei Profilen** | Edge nicht startbar | **keine** Netzkennwerte aus dieser Sitzung; das Drehbuch ist eine Anweisung, kein Nachweis |
| Zweite-Profile-`localStorage`-Trennung, `file://`-Dauerhaftigkeit | nicht messbar ohne Browser | belegt ist nur die Umkehrung (`src/ui/start.js:73-86`) |
| `python tools/seite-pruefen.py`, `python tools/q-echt.py`, `python tools/nachprobe-menuefix.py` | nicht versucht | — |
| Rust C1 (Hülle) und QR-Crate | `cargo fetch` scheitert, `qrcode` nicht im Cache (**fremd** gemessen, `Umsetzungsreife Spezifikation.md:33-34`); `shell/src-tauri/src/klassenraum.rs` existiert nicht | C2-Entwurf mit 13 HTTP-Aufrufen (`Nachweise/Klassenraum/C-http.txt`) |
| Der Kanonisierungslauf für `lab.storage` | A's Probe, **fremd** gemessen | `A-codec-teil1.json`; als fremde Zahl gekennzeichnet |

### 11.4 Aufgabenstatus

`task-4` (Bereich D) ist mit dieser Datei **inhaltlich erfüllt**: Testplan (40 Fälle, Sollzahl 291),
Abnahmebefehle mit den heute gemessenen Sollzahlen, Vorführdrehbuch mit Edge-Kommandozeilen und
Abbruchkriterien, Risikoliste (18), Reihenfolge A→B→C1→C2→D, Definition of Done (21 Punkte),
Berichtsvorlage, Architektur-Vorschlag § 12 und CHANGELOG-Vorschlag, Vereinfachungen und Nicht-Ziele,
offene Punkte. **Nicht** enthalten und nicht enthalten sein können: gemessene Netzkennwerte aus der
Vorführung, Rauchtest- und Menüprobenergebnisse, ein bestandener Android-Bau — Edge und Android
laufen in dieser Umgebung nicht (Grund oben).
