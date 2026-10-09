# 🔬 Review – 2.0-Fundament (task-14, unabhängige Gegenprüfung)

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Vertrag: [[Fahrplan – 1.3 und 2.0]] · [[SITZUNGSABSCHLUSS]]

> **Auftrag.** Nicht „sind die Tests grün?", sondern: **Stimmt, was die anderen behaupten?** Jeder Bericht eines
> Teammates ist eine BEHAUPTUNG. Verfahren: jede Zahl mit eigenem Befehl nachzählen, jede Ursache mit eigenem
> Experiment belegen, jede Datei per Byte-Vergleich prüfen — und ausdrücklich sagen, was **nicht** geprüft wurde.
> Geändert wird nichts: dieses Dokument ist mein einziges Schreibrecht.
>
> **Kernaussage in einem Satz.** Die Nullmessung des Leads ist **exakt** bestätigt (471/479 grün, 8 rot,
> 55 Testdateien, 84 Module, 0 übersprungen) · die 8 roten `UI: Übergabe › …` waren ein **Fehler der
> Attrappe, nicht des Produktivcodes** (gemessen; inzwischen behoben, 8/8 in Isolation) · **kein**
> Zeilenenden-Bruch in dieser Sitzung (sieben Verdachtsfälle per Index-Arithmetik als vorbestehend
> entlastet) · die vorgeschriebene Wächterprüfung `tools/pruefe-namen-flicken.js` **verschwieg im
> Trockenlauf genau die Datei, die nicht lädt** (`:86` — behoben, mit Verweis auf dieses Review) ·
> **eine** Zusicherung außerhalb eines `pruefe`-Rumpfs gibt es in keiner der 66 Testdateien (24 statische
> Treffer, jeder von Hand gelesen: alles Helfer-Funktionen) · **eine** öffentliche Funktion ohne Aufrufer:
> `Spiel.ergebnisKurz` — und **ein** Zwischenstand mit 8 neuen roten Zeilen, von denen drei inhaltlich waren.

**Was ich gemessen habe, in Zahlen (jede mit Befehl, siehe unten):** 92 Minis mit **91** Denkhilfen, davon
**91 von 91 wirklich ausgeliefert** (kein stiller Wächter-Tausch) · Hilfe-Vorschläge **44** statt 29,
**Ebene 2: 15** statt 0, **0** Fertigkeiten ohne Vorschlag statt 10 · Trainingskarten **0** gesperrt statt 3,
alle drei Ende-zu-Ende wirksam · Hilfe-Vorrat **6/4/2/0** je Bildungsstand, Stufe **am Ticket** · Klassenraum
**+0 €/+0 Ruf** statt +33/+1 (Kontrolle `pruefung` liefert exakt die +33/+1) · Determinismus: derselbe Code
⇒ derselbe `def.id`, und der Flow-Regler lebt im Postfach-Weg weiter · Fehlerdex **39** Fehlerarten, 7
Grundcodes ohne Injektor, keine fehlenden Pflichtfelder.

**Stand der Messung:** 09.10.2026, 15:13–15:40 · Arbeitsbaum nur gelesen · kein `git add`, kein Commit,
kein Prozess beendet · HEAD unverändert `fe6d7c1`.
**Dies ist der Zwischenstand.** Phase 2 (voller Lauf nach Ende der Bauphase, Zahlen aller Teammates) folgt unten
in § 10 — die Nummern dort bleiben offen, bis sie gemessen sind. „Nicht geprüft" steht als „nicht geprüft" da.

---

## 1 · Verfahren

| Schritt | Befehl / Ort |
|---|---|
| Voller Testlauf (ungesiebt) | `& "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tests/run.js` — **ohne** Filter, denn `tests/run.js:60` zählt die Bilanzzeile über die **gefilterte** Liste |
| Einzelmessung ohne Datei zu schreiben | `node -e "<Programm>"` mit eigenem Mini-Rahmen (Module wie `tests/run.js:23-37` laden, `harness.js`, dann genau **eine** Testdatei) — die Testdatei wird **im Speicher** verändert, nie auf der Platte |
| Zeilenenden | `git -c core.pager=cat ls-files --eol`, `git diff --numstat` gegen `--ignore-cr-at-eol`, plus **Byte-Vergleich** Arbeitsbaum ↔ `git show HEAD:<datei>` (SITZUNGSABSCHLUSS Schritt 6) |
| Syntax aller JS-Dateien | `node --check` über jede `*.js` in `src/`, `tests/`, `tools/`, `fremd/` (206 Dateien) |
| Zahlen der Datenpakete | eigener `vm`-Bereich, `DATEN.*` und `Spiel.training.liste()` direkt ausgezählt |

**Warum `node -e` und kein Skript im Projekt:** mein Schreibrecht umfasst nur diese Datei. Ein Prüfskript im
Projektordner wäre eine Änderung am Produkt.

---

## 2 · Die Nullmessung des Leads — nachgezählt, nicht zitiert

**Behauptung (Lead, überall im Task-Board):** „471/479 grün, 8 rot — die 8 roten heißen alle `UI: Übergabe › …`;
55 Testdateien, 84 Module."

**Meine Messung** (voller Lauf, kein Filter, 15:15–15:19):

```
471/479 grün, 8 ROT  (55 Testdateien, 84 Module)
davon 0 übersprungen
```

Alle acht `✗`-Zeilen beginnen mit `UI: Übergabe ›`.

| Teil der Behauptung | Ergebnis | Beleg |
|---|---|---|
| 471/479 grün, 8 rot | **bestätigt, exakt** | Bilanzzeile meines Laufs |
| die 8 roten sind alle `UI: Übergabe › …` | **bestätigt** | acht `✗`-Zeilen im Lauf |
| 55 Testdateien, 84 Module | **bestätigt** | Klammer der Bilanzzeile |
| „davon N übersprungen" (AGENTS.md-Regel) | **0 übersprungen** | Zeile unter der Bilanz (`tests/harness.js:60-75` hängt sie an) |

**Restzweifel.** Mein Lauf traf den Stand **vor** `src/spiel/ergebnis.js` (angelegt 15:15:34) — deshalb 84 und
nicht 85/87 Module. Er ist damit *genau* die Nullmessung des Leads, aber **kein** Stand nach der Bauphase.
Die Testdateizahl 55 war zum Messzeitpunkt ebenfalls die des Leads.

---

## 3 · Die 8 roten `UI: Übergabe › …` — Ursache gemessen, und sie liegt im Test

**Behauptung (task-11):** „die 8 roten Fälle sind inhaltlich … die Attrappe ist unvollständig oder
`src/ui/uebergabe.js` greift auf etwas zu, das sie nicht kennt."

### 3.1 Was der Lauf zeigt — und was er verschweigt

Der Lauf druckt als Fehler einen **Code-Ausschnitt**, keine Meldung:

```
✗ UI: Übergabe › Der Einstellungs-Abschnitt „Rechner übergeben" steht da, mit Knopf
    evalmachine.<anonymous>:3
    UI.app = {einstellungAbschnitt: (titel, fn) => { const c = h('div', …); fn(c); globalThis.__abschnitte.push([titel, c]); }, …};
                                                                                                                                 ^
```

**Nebenbefund N1 (Testrahmen):** `tests/harness.js:41` kürzt den Fehler auf **vier** Stack-Zeilen
(`e.stack.split("\n").slice(0, 4)`). Bei einem Fehler aus `vm.runInContext` sind diese vier Zeilen der
Code-Ausschnitt — **die Meldung selbst (`TypeError: …`) fällt weg.** Genau deshalb stand im Board eine Meldung
(„Cannot set properties of undefined"), die der Lauf so gar nicht ausgibt. Wer künftig einen vm-Fehler sucht,
findet die Ursache nur über ein eigenes Experiment; drei Zeilen im Harness (`e.name + ": " + e.message`
voranstellen) würden das beheben.

### 3.2 Eigene Ursachenmessung (drei Proben, `node -e`)

| Probe | Aufbau | Messergebnis |
|---|---|---|
| P1 | `vm.createContext({})`, dann `globalThis.__abschnitte.push([1,2])` | `TypeError: Cannot read properties of undefined (reading 'push')` |
| P2 | Funktion **im Außenbereich** erzeugt, in den Bereich gelegt: `location: {reload(){ globalThis.__reloads++; }}` | `bereich.__reloads = 0`, `global.__reloads = NaN` — der Zähler landet im **erzeugenden** Realm |
| P3 | Gegenprobe: `__zaehler` **vorher** verdrahtet (`Object.assign(bereich, {__zaehler: 0})`) | `bereich.__zaehler = 2` — das Muster selbst ist richtig |

**Befund B1 (belegt):** In `tests/ui-uebergabe.test.js` (Fassung 15:16, 220 Z.) verdrahtete
`Object.assign(bereich, {__reloads: 0})` **nur** `__reloads`. Die Attrappe schreibt aber nach
`globalThis.__abschnitte` / `__uebergaben` / `__toasts` / `__exporte`, während der Test die **äußeren**
Felder `abschnitte`, `uebergaben`, `toasts`, `exporte` liest. `uebStand()` warf beim ersten Start-Haken —
**vor jeder Zusicherung**. Das ist ein Fehler der Attrappe, nicht des Produktivcodes.

### 3.3 Gegenversuch: Attrappe im Speicher repariert — es bleiben **drei** Fehler

Ich habe **nur** die Verdrahtung im Speicher nachgezogen (Datei unverändert) und erneut gemessen:

| Fall | Ergebnis nach der Reparatur |
|---|---|
| Abschnitt steht da, mit Knopf | OK |
| Klick öffnet den Dialog | OK |
| genau EIN Dialog | OK |
| „Behalten" übergibt und lädt neu | **ROT** `die Seite lädt neu: ist 0 – soll 1` |
| „Löschen" übergibt und lädt neu | **ROT** `die Seite lädt neu: ist 0 – soll 1` |
| Abbrechen übergibt nicht | OK |
| „Erst sichern" schreibt eine Datei | **ROT** `TypeError: Cannot read properties of null (reading 'euro')` |
| Fehlschlag lädt nicht neu, meldet den Grund | OK |

**Befund B2:** Die beiden „lädt neu"-Fälle scheiterten an **P2** — `location.reload` zählte in den erzeugenden
Realm. **Befund B3:** „Erst sichern" scheiterte, weil `uebKapsel` `Spiel._trocken = true` setzt, `Spiel.speichern()`
bei `src/spiel/zustand.js:170` sofort zurückkehrt und der Speicher deshalb **kein** `labor` hat; die Zusicherung
`inhalt.speicher.labor.euro === 42` ist in dieser Kapsel nicht einlösbar. Der Exportweg selbst ist dabei
**regelkonform**: `src/ui/uebergabe.js:28-31` ist Zeichen für Zeichen derselbe Weg wie `src/ui/karriere.js:442-445`
(`store.sofort()`, dann `store.alles()`).

**Ergebnis:** „Die 8 grün machen" war **nicht** mit einer Reparatur an einer Stelle getan. Das war der wertvollste
Teil dieser Prüfung — und der Grund, warum ich die Attrappe nicht als „kleine Unvollständigkeit" durchgehen lasse.

### 3.4 Was der Eigentümer daraus gemacht hat (nachgemessen)

`tests/ui-uebergabe.test.js` wurde um 15:16:22 geändert. Die neue Fassung (235 Z., SHA256 `F125293B629A3FD7…`)
verdrahtet alle vier Felder (`:101`), zählt `neuladungen` über eine Verschlussvariable statt über `globalThis`
(`:73`, `:92` — mit genau dieser Begründung im Kommentar) und legt `store.set("labor", Spiel.st)` vor die
Export-Zusicherung (`:211`).

**Meine Messung der neuen Fassung** (Einzellauf im eigenen Bereich, 87 Module): **8/8 grün, 0 übersprungen.**

**Restzweifel.** Das ist ein **Einzellauf** dieser einen Datei, kein voller Lauf; die Zahl im Gesamtlauf steht
in Phase 2 (§ 10). Und: dass drei Fehler in einer Testdatei steckten, sagt nichts über `src/ui/uebergabe.js`
selbst — dessen Wirkung im **echten** Browser habe ich **nicht** gemessen (§ 8).

---

## 4 · Prüfauftrag des Leads: Zusicherungen außerhalb eines `pruefe`-Rumpfs

**Auftrag (Lead, 15:30).** `tests/klassenraum-hilfevorrat.test.js:66` hatte eine Zusicherung **direkt im
Gruppenrumpf**; sie schlug durch bis `vm.runInContext`, `tests/run.js:58` meldete `LADEFEHLER` und beendete den
**ganzen** Lauf mit Exit 2. Gesucht: jede weitere solche Stelle.

### 4.1 Der gemeldete Ort ist inzwischen sauber

`tests/klassenraum-hilfevorrat.test.js` hat jetzt 131 Zeilen; jede Zusicherung steht in
`pruefe(…, kapsel(() => {…}))`. Der Kopfkommentar `:20-22` warnt inzwischen selbst:
„ein sofort ausgeführter Rumpf brächte den ganzen Lauf mit LADEFEHLER (exit 2) zum Stehen."

### 4.2 Statischer Scan über **alle** 65 Testdateien

Eigener Tokenizer (Zeichenketten, Vorlagen, Zeilen- und Blockkommentare werden zu Leerzeichen), dann
Klammerstapel: eine Zusicherung gilt als „außerhalb", wenn beim Auftreffen von `erwarte.` **kein** offener
`pruefe(`-Aufruf im Stapel liegt.

```
Geprueft: 65 Testdateien, 2352 erwarte.*-Aufrufe im Quelltext
AUSSERHALB eines pruefe-Rumpfs: 24
```

**Jeden der 24 Treffer habe ich von Hand im Kontext gelesen.** Alle 24 stehen in **Helfer-Funktionen**, die nur
aus `pruefe`-Rümpfen gerufen werden — zum Beispiel:

| Datei:Zeile | Umgebung | Urteil |
|---|---|---|
| `sim-gruende.test.js:7` | `const grund = (r, soll) => { erwarte.falsch(…); erwarte.gleich(…); };` | Helfer, kein Laufzeitpfad beim Laden |
| `sim-dhcp-gruende.test.js:17` | `const nurDieser = (tr, code, hinweis) => erwarte.gleich(…)` | Helfer |
| `klassenraum-determinismus.test.js:59-60` | `const alleGleich = (liste, was) => {…}` | Helfer |
| `spiel-training.test.js:40,45,47` | `const id = (…) => {…}` / `function durchgang(…){…}` | Helfer |
| `spiel-einstieg-stufe.test.js:400-412` | innerhalb `pruefe(…, kapsel(() => mitWelt(welt => { … })))` | liegt **im** pruefe-Rumpf; mein Stapel hat die Klammer wegen eines Regex-Literals verloren |
| `spiel-mini-hilfe.test.js:308` | innerhalb `oberflaecheKapsel = fn => () => {…}` | Helfer (wird aus `pruefe` gerufen) |

**Ergebnis (statisch):** **keine** Zusicherung, die beim Ausführen eines Gruppenrumpfs ungeschützt läuft.
**Einschränkung, ehrlich:** mein Scanner ist eine Heuristik — Regex-Literale mit Anführungszeichen können den
Klammerstapel verschieben (genau das passiert bei `spiel-einstieg-stufe.test.js`). Deshalb die Handprüfung
jedes Treffers; ein sauberes Ergebnis ist damit belegt, ein „Scanner findet nichts" allein wäre es nicht.

### 4.3 Dynamischer Scan — die belastbare Gegenprobe

Ich habe **jede** Testdatei einzeln in einen **frischen** Bereich geladen: dieselben 87 Module wie
`tests/run.js`, dazu `tests/harness.js` und **genau eine** Testdatei — und `testsAusfuehren()` **absichtlich
nicht** gerufen. Damit laufen alle Gruppenrümpfe (und nur die), also genau der Pfad, der den `LADEFEHLER`
auslöst.

```
Geprueft: 65 Testdateien  |  Dateien mit LADEFEHLER beim Laden: 1
  LADEFEHLER  hilfe-ebene2.test.js
```

**Befund B4 (hart, mit Zeitfenster):** `tests/hilfe-ebene2.test.js` war beim Anlegen **nicht ladbar**:

```
tests/hilfe-ebene2.test.js:174
  for (const v of e1) erwarte.gleich(v.art, "pruefen", v.id + ": Ebene 1 („ansehen") muss prüfen");
SyntaxError: Unexpected identifier 'muss'          (node --check, Exit 1)
```

Das ASCII-`"` nach `„ansehen` schließt den String; `muss` ist dann ein Bezeichner. Gemessen im Fenster
**15:20:16 (Anlage) bis 15:21:03** — in diesem Fenster hätte `tests/run.js` mit **Exit 2** abgebrochen, also
**derselbe Totalausfall wie der gemeldete Fall**, nur mit anderer Ursache. Der Eigentümer hat die Datei um
15:21:03 selbst behoben; `node --check` liefert jetzt Exit 0. Der Fehler steht hier, weil er gemessen ist —
nicht als Vorwurf, sondern als Beleg für die Fehlerklasse.

**Gesamturteil zum Prüfauftrag:** In der aktuellen Fassung gibt es **weder** eine ungeschützte Zusicherung
**noch** eine nicht ladbare Testdatei (65 von 65 laden, Stand 15:35).

### 4.4 Werkzeugbefund: die Wächterprüfung verschweigt den Fall, für den es sie gibt

**Behauptung (AGENTS.md, Befehlstabelle):** `node tools/pruefe-namen-flicken.js` „findet
`pruefe("…„…"…")`, das den Lauf mit `LADEFEHLER` (Exit 2) anhält — trockener Lauf zuerst".

**Messung im selben Befehlsblock, in dem `node --check tests/hilfe-ebene2.test.js` mit Exit 1 scheiterte:**

```
würde flicken tests\hilfe-ebene2.test.js: 2 pruefe()-Name(n)
…
65 Datei(en) geprüft, 0 geschrieben, 0 laden nicht.
Exit: 0
```

Das Werkzeug meldet **„0 laden nicht"**, während dieselbe Datei nicht ladbar ist.

**Ursache (Zitat, `tools/pruefe-namen-flicken.js:86`):**

```js
if (setzen || !anzahl) {
  const fehler = ladbar(datei);
  if (fehler !== true) { kaputt.push(rel + " — " + fehler); … }
}
```

Im **Trockenlauf** (`setzen === false`) wird die Ladbarkeitsprüfung für jede Datei **übersprungen, die geflickt
werden müsste** (`anzahl > 0`) — also für genau die verdächtigen. Der Trockenlauf ist aber der Lauf, den
AGENTS.md vorschreibt.

**Vorschlag (nicht von mir ausgeführt, weil fremde Datei):** die Bedingung auf `if (setzen || true)` bzw.
schlicht `const fehler = ladbar(datei);` verkürzen — die Prüfung kostet Millisekunden und ist der einzige
Grund, warum es das Werkzeug gibt.

**Restzweifel.** Ich habe den Werkzeugbefund an **einer** Datei in **einem** Zeitfenster gemessen. Dass die
Bedingung generell so wirkt, ist Quelltext-Zitat (`:86`), nicht Stichprobe über viele Dateien.

**Nachtrag 15:26 — der Befund ist behoben.** `tools/pruefe-namen-flicken.js` ist im Arbeitsbaum geändert; die
Bedingung lautet jetzt unbedingt (Diff zitiert):

```diff
-    if (setzen || !anzahl) {
+    /* Die Ladbarkeit wird IMMER geprüft. … (gemessen am 09.10.2026 von der Gegenprüfung,
+       Beleg im Review – 2.0-Fundament.md) */
+    {
       const fehler = ladbar(datei);
```

**Meine Nachmessung:** `node tools/pruefe-namen-flicken.js` → „**66** Datei(en) geprüft, 0 geschrieben,
0 laden nicht", Exit 0. Die Zahl der geprüften Dateien ist von 65 auf 66 gestiegen (neue Testdatei), die
Prüfung läuft jetzt für **jede** Datei — Beleg im Quelltext (`:92`, aus der Bedingung herausgezogen).
**Restzweifel:** dass die Korrektur auch eine *kaputte* Datei meldet, konnte ich nicht vorführen — dafür
müsste ich eine nicht ladbare Testdatei anlegen, und Testdateien liegen außerhalb meines Schreibrechts.
Belegt ist die geänderte Bedingung und der fehlerfreie Trockenlauf, nicht der scharfe Gegenfall.

---

## 5 · Zeilenenden — der Byte-Vergleich, und eine Entlastung

**Regel (AGENTS.md / SITZUNGSABSCHLUSS Schritt 6).** Ein Editor, der normalisiert, dreht die ganze Datei um;
`git diff --numstat` und `--ignore-cr-at-eol` können dabei **identisch** aussehen. Verlässlich ist der
Byte-Vergleich.

**Erste Messung (Alarm):** `src/ui/spiel.js` — Arbeitsbaum `CRLF=876, LF=0`, HEAD `CRLF=0, LF=866`.
Und die Falle aus der Doku ist echt: `git diff --numstat` und `--ignore-cr-at-eol` zeigen **beide** `10 0`,
`git diff --stat` beide **10 insertions**. Der Diff sieht also harmlos aus, obwohl der ganze Dateiinhalt
umgestellt ist. Dazu passt `git ls-files --eol`:

```
i/lf  w/crlf  attr/text=auto eol=lf   src/ui/spiel.js
```

und Git warnt von selbst: „in the working copy of 'src/ui/spiel.js', CRLF will be replaced by LF the next time
Git touches it".

**Gegenmessung — und sie entlastet die Sitzung.** Ein Zeilenendenwechsel *in dieser Sitzung* hätte bedeutet:
die Datei war vorher LF. Die Index-Statistik sagt das Gegenteil:

| Größe | Wert | Rechnung |
|---|---|---|
| HEAD-Blob `f992bae…` | **67 546 B** (866 LF-Zeilen) | `git cat-file -s HEAD:src/ui/spiel.js` |
| Index-Statistik (Arbeitsbaum beim letzten Git-Zugriff) | **68 412 B** | `git ls-files --debug src/ui/spiel.js` |
| Differenz | **866 B** | genau **1 Byte je Zeile** → der Arbeitsbaum war **schon damals CRLF** |

**Befund B5:** Die CRLF von `src/ui/spiel.js` sind **vorbestehend**. Die 10 in dieser Sitzung angehängten
Zeilen wurden in CRLF angehängt — also **im Sinne der Datei**, nicht gegen sie. Nach AGENTS.md ist das die
richtige Behandlung (Zeilenenden bewahren), auch wenn sie der Deklaration in `.gitattributes`
(`* text=auto eol=lf`) widerspricht.

**Repo-weiter Zustand (gemessen):** 51 von 423 verfolgten Dateien sind `w/crlf`, 372 `w/lf`, 0 `w/mixed`.
In `src/` allein: 38 CRLF, 105 LF. Es ist also **kein Einzelfall** dieser Sitzung, sondern gewachsener Bestand.

| Datei | Arbeitsbaum | HEAD | Urteil |
|---|---|---|---|
| `src/ui/spiel.js` | CRLF=876, LF=0 | CRLF=0, LF=866 | vorbestehend (Index-Statistik), Inhalt +10 Zeilen |
| `src/daten/wiki.js` | CRLF=0, LF=603 | CRLF=0, LF=586 | LF bewahrt |
| `docs/INHALT.md` | CRLF=0, LF=102 | CRLF=0, LF=85 | LF bewahrt |
| `src/spiel/ergebnis.js`, `src/spiel/uebergabe.js`, `src/ui/uebergabe.js`, `src/stil/uebergabe.css`, `tests/spiel-ergebnis.test.js`, `tests/spiel-uebergabe.test.js`, `tests/ui-uebergabe.test.js`, `tests/klassenraum-determinismus.test.js`, `tests/lernmotor-wache.test.js`, `docs/entwicklung/Übergabe – Stand 2.0-Fundament.md` | **alle LF, 0 CRLF** | (untracked) | LF, wie gefordert |

**Restzweifel.** Für untracked Dateien gibt es keinen HEAD-Vergleich; ich kann nur die **jetzige** Verteilung
belegen (alles LF). Und für `src/ui/spiel.js` ist die Index-Statistik ein **Indizienbeweis**, kein Beweis aus
einem zweiten Arbeitsbaum: sie zeigt den Zustand beim letzten Git-Zugriff, nicht lückenlos jeden Zeitpunkt
davor. Kein anderes Argument in dieser Sitzung spricht dafür, dass jemand die Datei in dieser Sitzung
umgestellt hat — der Inhalt ist um genau die 10 neuen Zeilen gewachsen.

---

## 6 · „Wirkung vor Grün" — was ich bisher messen konnte

Die Regel: ein Baustein zählt erst, wenn er im **echten** Weg vorkommt. Das belegte Gegenbeispiel des Projekts
ist der DHCP-Pool-Modus, der jahrelang wirkungslos war, weil der Test nur den Prompt prüfte.

### 6.1 Eingebunden ist alles (Bau-Reihenfolge, nicht Wirkung)

`bauen.py:60` (`d.glob("*.js")` je Schicht) und `bauen.py:124` (`d.glob("*.css")` in `src/stil`) nehmen neue
Dateien **automatisch** mit. `python bauen.py --liste` nennt `spiel/uebergabe.js`, `spiel/ergebnis.js` und
`ui/uebergabe.js`. **Aber:** „steht im Bau" ist **nicht** „wird aufgerufen" — der DHCP-Fall war auch gebaut.

### 6.2 Übergabe: der echte Weg ist belegt, die Wirkung im Browser nicht

| Kettenglied | Beleg | Urteil |
|---|---|---|
| Start-Haken wird ausgeführt | `src/ui/start.js:49` `for (const fn of UI.startHaken \|\| [])` | Aufruf vorhanden |
| Abschnitt wird angemeldet | `src/ui/app.js:272-275` `einstellungAbschnitt` | vorhanden |
| Abschnitt wird gezeichnet | `src/ui/app.js:346` `for (const a of [...eigeneAbschnitte(), ...abschnitte])` → `a.fn(c)` | vorhanden |
| Knopf → Dialog → Logik | `src/ui/uebergabe.js:74` Knopf, `:35` `Spiel.uebergabe(...)`, `:42` `location.reload()` | Aufrufkette vorhanden |
| nur EIN Aufrufer der Kernlogik | `grep Spiel.uebergabe` in `src/`: **nur** `src/ui/uebergabe.js:35` (+ Testdateien) | kein zweiter Weg, kein toter Aufruf |

**Nicht gemessen:** dass der Knopf im **echten** Browser sichtbar ist und der Dialog dort öffnet. Dafür bräuchte
es `python bauen.py` + `tools/rauch.py` (echter Edge) — beides gehört dem Lead und schreibt Erzeugnisse.
**Nicht geprüft.**

### 6.3 `Spiel.ergebnisText` wirkt, `Spiel.ergebnisKurz` hat (noch) keinen Aufrufer

| Name | Aufrufer in `src/` | Urteil |
|---|---|---|
| `Spiel.ergebnisText` | `src/ui/spiel.js:453` (Knopf „Ergebnis kopieren", `:535`) | **Wirkung belegt** (Aufrufkette: Abschlussfenster → Knopf → `UI.kopieren`) |
| `Spiel.ergebnisKurz` | **keiner** — nur `tests/spiel-ergebnis.test.js` | **Befund B6: grün, aber ohne Wirkung** |
| `Spiel.ergebnis.lage`, `.sterneText`, `.zahl`, `.dauer`, `.zeitpunkt`, `.kundeName`, `.thema`, `.niveau`, `.ziele`, `.ergebnisTeil` | indirekt über `ergebnisText` | erreicht |

**Befund B6 (Wirkung vor Grün):** `Spiel.ergebnisKurz` ist eine öffentliche Funktion der zugesagten
Schnittstelle, hat aber **null** Aufrufer im Programm. Nach der Projektregel gilt sie damit als **nicht fertig**.
Ob das ein Fehler des Teammates ist, hängt an der Schnittstellenzusage des Leads (task-1 Punkt 2 nennt beide
Funktionen) — **die Entscheidung liegt beim Lead**, nicht bei mir. Mein Befund ist die Zahl: **0 Aufrufer**.

### 6.4 Klassenraum: der Schaden ist behoben — und der Fahrplan-Wert exakt reproduziert

Eigener Lauf im **echten** Fluss (`Spiel.instanzErstellen` → `Spiel.oeffnen` → Lösung → `Spiel.abnahme` →
`Spiel.abschliessen`), Ticket `salon-01`, Niveau AP2, je Quelle ein frischer Stand:

| `quelle` | bestanden | Δ Euro | Δ Ruf | Δ `st.erledigt` | `erg.euro/ruf` | Eintrag mit welcher Quelle |
|---|---|---|---|---|---|---|
| `pruefung` (Kontrolle) | ja | **+33** | **+1** | +1 | 33 / 1 | `pruefung` |
| `training` | ja | 0 | 0 | 0 | 0 / 0 | — |
| `klassenraum` | ja | **0** | **0** | **0** | 0 / 0 | — |
| `raetsel` | ja | +30 | +1 | +1 | 30 / 1 | `raetsel` |

**Ergebnis:** Die Zahl **+33 € / +1 Ruf** des Fahrplans ist auf dem **ungefilterten** Pfad exakt reproduziert
(Kontrollzeile `pruefung`) — und der Klassenraum-Auftrag zahlt in der **jetzigen** Fassung **nichts**:
`Spiel.klassenraum` existiert (`typeof` = `object`), die Umleitung greift. **Den Vorher-Zustand konnte ich
nicht messen** — als ich messen konnte, war die Behebung schon eingebaut. Die Fahrplan-Zahl ist damit
*plausibel und konsistent*, aber von mir **nicht als Vorher-Messung** wiederholt.

**Nicht gemessen:** die Teilbehauptungen „Wochenziel erfüllt" und „Kundenampel grün" — im frischen Stand ist
`st.woche === null` und es gibt keinen Vertragskunden. **Nicht geprüft.**

---

### 6.5 Denkhilfen: **91 von 91** kommen wirklich beim Spieler an (Wirkung, nicht Prompt)

Das ist die schärfste Prüfung dieses Bausteins — denn `src/spiel/mini.js:182-193` (`miniOhneLoesung`) ersetzt
einen Text **still** durch den Fertigkeitssatz, wenn er die Lösung verrät oder eine Option wörtlich nennt.
Ein grüner Daten-Test würde das nicht merken. Ich habe deshalb **über die echte API** gemessen: je Mini
`Spiel.mini.hilfe(id, {nurSehen:true})` aufrufen und den zurückgegebenen Text mit dem Eintrag vergleichen.

| Messung (Stufe azubi, `SPROSSEN = {azubi:2, azubi-plus:1, geselle:1, meister:0}`) | Ergebnis |
|---|---|
| Minis | **92** |
| Einträge in `DATEN.miniDenkhilfen` | **91** |
| davon Sprosse 1: Text **identisch** mit `eintrag.denkhilfe`, `art === "denkhilfe"` | **91** |
| Sprosse 1 still ersetzt oder anders | **0** |
| Sprosse 1 liefert gar nichts | **0** |
| Einträge mit eigenem `ausschnitt`, Sprosse 2 identisch, `art === "ausschnitt"` | **68 von 68** |
| ohne Eintrag | **1** (`mini-link-2`, der reservierte) |

**Ergebnis:** Kein Text fällt durch den Wächter. Das ist die Aussage, die ein reiner Daten-Test **nicht** liefern
kann. **Restzweifel:** gemessen auf **einer** Stufe (azubi) und mit `nurSehen` — ob die Oberfläche den Text
danach auch anzeigt, ist damit nicht belegt (kein Browser, § 9).

### 6.6 Hilfe-Vorrat: der Vorrat folgt dem Bildungsstand, nicht dem stillen Standard

Eigener Lauf, je Bildungsstand ein frischer Klassenraum-Auftrag (`salon-01`, `ohneFlow:true`):

| Bildungsstand | `Spiel.stufe.konto()` (ohne Instanz) | `hilfenFrei()` | Stufe **am Ticket** | `konto(inst)` |
|---|---|---|---|---|
| (keine gesetzt → Rückfall) | `{frei:6, gesamt:6}` | 6 | `azubi` | `{frei:6, gesamt:6}` |
| `azubi` | `{frei:6, gesamt:6}` | 6 | `azubi` | `{frei:6, gesamt:6}` |
| `azubi-plus` | `{frei:4, gesamt:4}` | 4 | `azubi-plus` | `{frei:4, gesamt:4}` |
| `geselle` | `{frei:2, gesamt:2}` | 2 | `geselle` | `{frei:2, gesamt:2}` |
| `meister` | `{frei:0, gesamt:0}` | 0 | `meister` | `{frei:0, gesamt:0}` |

**Ergebnis:** 6/4/2/0 wie in der Zusage, und der Bildungsstand steht **ausdrücklich am Ticket** (`inst.stufe`) —
der stille Rückfall auf `EINST_STANDARD` ist weg. **Nicht gemessen:** der Gegenfall „`EINST_STANDARD` auf
`meister`, Mensch auf `azubi`" — den prüft die Testdatei des Eigentümers (`tests/klassenraum-hilfevorrat.test.js:104-118`,
zitiert, nicht von mir nachgerechnet).

### 6.7 Die drei gesperrten Trainingskarten: **alle drei wirken jetzt** (Ende-zu-Ende gemessen)

Nicht „`liste()` sagt offen", sondern der ganze Weg: `starten` → Startzustand verletzt → Lösung → Abnahme →
`training.abnehmen`. Je Karte ein frischer Stand.

| Karte | `starten.ok` | `def.id` | Ziele | **verletzt vorher** | **verletzt nachher** | Abnahme | Sterne | Δ Euro | Δ Ruf |
|---|---|---|---|---|---|---|---|---|---|
| `tr-portsec-dose` | **ja** | `gen-lab.portsec-1374736676` | 2 | **2** | **0** | bestanden | 5 | 0 | 0 |
| `tr-stp-schleife` | **ja** | `gen-lab.stp-823619411` | 1 | **1** | **0** | bestanden | 4,5 | 0 | 0 |
| `tr-storage-nas-san` | **ja** | `gen-lab.storage-1998957893` | 1 | **1** | **0** | bestanden | 5 | 0 | 0 |
| `tr-link-kabel` (**Kontrolle**, war nie gesperrt) | ja | `gen-lab.link-413487848` | 3 | 3 | 0 | bestanden | 5 | 0 | 0 |

**Ergebnis:** Der Fehler wirkt (Ziel verletzt **vor** der Lösung), die Lösung heilt (0 verletzt **nach** der
Lösung), die Abnahme besteht, und das Training zahlt weiterhin **0 € / 0 Ruf**. Die Kontrollzeile zeigt, dass
mein Prüfstand überhaupt unterscheiden kann.

**Wichtige Einschränkung:** Die board-eigene Warnung zu `lab.stp` lautete, ein zweites Kabel erzeuge **keinen**
Sturm und `ticketBauen` verwerfe einen Injektor, der nichts bricht. `starten.ok = true` und „Ziel verletzt"
belegen, dass **irgendein** wirkender Fall gebaut wird — **nicht**, dass es ein Broadcast-Sturm ist (Grundcode
`STORM`). Ob der STP-Injektor den behaupteten Mechanismus hat, prüfe ich am Bericht des Eigentümers nach
(Phase 2). **Bisher nicht geprüft:** der Grundcode der erzeugten Fälle.

### 6.8 Determinismus: der Klassenraum ist fest — und der Flow-Regler lebt weiter

Gemessen mit **Kontrolle** (sonst wäre „alles gleich" auch als „mein Schalter tut nichts" deutbar):

| `quelle` | Flow-Stand gelesen | `def.id` | Ziele |
|---|---|---|---|
| `postfach` | `normal` | `gen-lab.vlan-5` | 2 |
| `postfach` | `geruest` | **`gen-lab.vlan-5-geruest`** | **1** |
| `postfach` | `verwicklung` | **`gen-lab.vlan-5-verwicklung`** | **3** |
| `klassenraum` | `normal` / `geruest` / `verwicklung` | `gen-lab.vlan-5` (dreimal gleich) | 2 / 2 / 2 |
| `pruefung` | `normal` / `geruest` / `verwicklung` | `gen-lab.vlan-5` (dreimal gleich) | 2 / 2 / 2 |

`Spiel.flow.stand("lab.vlan")` gab in **jedem** Durchgang genau den gesetzten Wert zurück — der Schalter wirkt
also, das Ergebnis ist nicht „Rauschen". Ursache im Quelltext, `src/spiel/postfach.js`:

```js
const ohneRegler = o.quelle === "pruefung" || o.quelle === "raetsel" || o.quelle === "klassenraum";
const flow = Spiel.flow && !o.ohneFlow && !ohneRegler ? Spiel.flow.fuer(def) : null;
```

**Ergebnis:** Die Zusage „derselbe Code + derselbe Seed ⇒ derselbe Auftrag" ist für den Klassenraum **belegt**,
und die naheliegende Abhilfe „Flow einfach abschalten" wurde **nicht** gewählt: im normalen Postfach-Weg
adaptiert der Regler weiter (1 / 2 / 3 Ziele). Das ist der Unterschied zwischen „Test grün" und „Feature heil".

**Nebenbefund N3 (zwei Listen, gemessen):** `src/spiel/flow.js:nachAbschluss` nimmt nur `pruefung` und
`raetsel` aus — **nicht** `klassenraum`. Ein Klassenraum-Auftrag **schreibt** also weiter in den Flow-Stand
seines Geräts, obwohl er ihn nicht mehr **liest**. Ob das gewollt ist (der Flow ist die Lern-Geschichte des
Geräts), entscheidet der Lead — ich melde nur, dass zwei Stellen zwei verschiedene Ausnahmelisten führen.

### 6.9 Was weiterhin **ohne** Aufrufer dasteht

| Name | Aufrufer in `src/` | Urteil |
|---|---|---|
| `Spiel.ergebnisKurz` | **keiner** | Befund B6 (§ 6.3) |
| `Spiel.uebergabeLetzte` | `src/ui/uebergabe.js:46` | erreicht |
| `Spiel.klassenraum.abnehmen` | `src/spiel/abnahme.js` (Umleitung) | erreicht — Wirkung in § 6.4 gemessen |
| `Spiel.ergebnis.lage/.sterneText/.zahl/.dauer/.zeitpunkt/.kundeName/.thema/.niveau/.ziele/.ergebnisTeil` | über `ergebnisText` | erreicht |

---

## 7 · Die Vorher-Zahlen des Task-Boards — selbst ausgezählt

Alle Zahlen aus einem eigenen `vm`-Bereich (87 Module, Stand 15:35), nicht aus Berichten übernommen.

| Behauptung im Board | Meine Messung | Urteil |
|---|---|---|
| „67 von 92 Mini-Tickets ohne eigenen Denkanstoß" (Vorher) | 92 Minis, **91** Einträge in `DATEN.miniDenkhilfen`, **1** ohne: `mini-link-2` | **bestätigt als Vorher** (25 + 66 = 91; vorher 92−67 = 25 ✓). Der verbliebene eine ist der **absichtlich reservierte** (`tests/spiel-mini-denktexte.test.js`) |
| keine verwaisten Denkhilfen | **0** Einträge ohne zugehöriges Mini | sauber |
| „Ebene 2 existiert 0×" | `DATEN.hilfen.VORSCHLAEGE`: **29** gesamt, Ebene 1 = **22**, **Ebene 2 = 0**, sonst/ohne `ebene` = **7** | **bestätigt** (Stand 15:35 noch 0 — task-8 lief noch) |
| „10 Fertigkeiten ohne einen einzigen Vorschlag" | 27 Fertigkeiten, **17** mit Vorschlag, **10** ohne: `lab.netz, lab.arp, lab.subnetz, lab.dhcp, lab.tcp, lab.rostick, lab.portfwd, lab.portsec, lab.stp, lab.storage` | **bestätigt, exakt** |
| Vertrag § 13.2: `bereich` immer eine `Spiel.LEITER`-id | Leiter-ids `link, vlan, ip, gateway, route, dienst`; **0** Vorschläge außerhalb | eingehalten |
| `art` ∈ {`pruefen`,`aendern`} | genau diese zwei | eingehalten |
| „drei gesperrte Trainingskarten `lab.portsec`, `lab.stp`, `lab.storage`" | **Vorher (15:19):** 34 Szenarien, **31 offen**, **3 gesperrt** = `tr-portsec-dose`, `tr-stp-schleife`, `tr-storage-nas-san`. **Nachher (15:29):** dieselben drei `offen:true` und startbar (§ 6.7) | **bestätigt, exakt drei** — und inzwischen behoben |

**Nebenbefund N2 (Board-Text vs. Datei):** task-1 sagt „`tests/spiel-uebergabe.test.js` (8 Fälle, grün)".
Gemessen: **10** `pruefe`-Fälle, alle zehn im vollen Lauf grün. Eine Nebenangabe, kein Sachfehler — die Datei
ist seither gewachsen.

---

## 8 · Verbote und Randbedingungen (gemessen)

| Frage | Messung | Urteil |
|---|---|---|
| Wurde in dieser Sitzung committet? | `git log -1` → `fe6d7c1 … 2026-10-09T15:00:57` (vor Sitzungsbeginn dieser Runde), `git reflog` zeigt nur Vorarbeiten | **kein Commit** in dieser Sitzung |
| Wurde etwas außerhalb des Projektordners geändert? | `../FISI-Spielhalle/src/lernmotor.js`: `LastWriteTime 29.09.2026 15:57`, 4221 B | **unberührt** |
| Prozess-Beendigung im Baum? | Suche nach `Stop-Process\|taskkill\|kill -9\|pkill\|TerminateProcess` in `*.js,*.py,*.ps1,*.cmd,*.sh` (ohne Erzeugnisse) → **ein** Treffer: `tools/cdp.py:355` | vorbestehendes Werkzeug, beendet **eine selbst gestartete PID** — laut AGENTS.md Regel 1 ausdrücklich erlaubt. **Kein Verstoß belegt** |
| Testlauf-Ergebnis unabhängig nachgefahren | `python tools/klassen.py` → `0 Klassen ohne CSS-Regel` (die neuen `.uz-*`-Klassen sind abgedeckt) | grün |
| | `python tools/ethos.py` → `GRUEN: keine Regel schlechter als tests/stil-stand.json`, R4 = **539** | grün; die 539 deckt sich mit dem Kommentar in `src/stil/uebergabe.css`, der von „R4 539 → 542" im ersten Entwurf spricht |
| | `node tools/sim-stand.js` → 12/12 „unverändert", „Simulation unverändert gegenüber dem Referenzstand" | grün |
| Syntax aller Quellen | `node --check` über 206 Dateien: **2** nicht ladbar — `tests/hilfe-ebene2.test.js` (inzwischen behoben, § 4.3) und `tools/klassenraum-probe/B-workflow.js` (`await is only valid in async functions …`) | B-workflow.js ist ein **Probe-Werkzeug** und in `AGENTS.md` nicht als Befehl geführt; ob es als ESM gedacht ist, habe ich **nicht geprüft** |

---

## 9 · Was ich **nicht** geprüft habe (ehrlich)

* **Die volle Prüfung der Bauphase** — sie läuft noch. Alle Zahlen der Teammates (Zeilen, Testnamen,
  Vorher/Nachher) sind **nicht** von mir nachgezählt, solange ihre Tasks `in_progress` sind. § 10 folgt.
* **Browser/Oberfläche:** kein `python bauen.py`, kein `tools/rauch.py`, kein `tools/menueprobe.py`,
  kein `python tools/seite.py --pruefen`. Aussagen über die **sichtbare** Oberfläche (Knopf im
  Einstellungsdialog, Abschlussfenster mit Kopierknopf) beruhen auf Quelltext-Zitaten, nicht auf einem Bild.
* **Wochenziel und Kundenampel** beim Klassenraum-Auftrag (§ 6.4).
* **`Spiel.ergebnisKurz`** — kein Aufrufer gefunden; ob das gewollt ist, entscheidet der Lead.
* **Der Vorher-Zustand des Klassenraum-Schadens** — nicht mehr messbar, die Behebung war schon eingebaut.
* **Der Lernmotor-Befund** (`fremd/lernmotor.js:39`, `s.v === 1` ohne Migration) — nicht nachgemessen;
  die Datei liegt außerhalb und darf nicht angefasst werden. Die Aussage „`tests/run.js` lädt die
  Spielhalle, nicht die Kopie" habe ich **belegt**: mein eigener Lader lädt
  `..\FISI-Spielhalle\src\lernmotor.js` (Ausgabe der eigenen Probe), und beide Dateien liegen vor.
* **Zeilen-/Zweigabdeckung** im Sinne eines Abdeckungsinstruments: das Projekt hat keines.
* **`tools/klassenraum-probe/B-workflow.js`** — ob der `await`-Fehler praktisch relevant ist.
* **Der Grundcode der drei geöffneten Trainingskarten** (§ 6.7): ich habe „Ziel verletzt → Lösung heilt"
  gemessen, **nicht** ob der STP-Fall wirklich ein `STORM` ist.
* **Die Berichte der Teammates** selbst — zum Zeitpunkt dieses Zwischenstands lag mir noch keiner vor.
  Ich habe ihre **Zahlen** aus dem Board nachgemessen, nicht ihre Begründungen geprüft.

---

## 10 · Zwischen- und Endmessungen der Bauphase

*(Dieser Abschnitt wächst mit. Jede Zeile nennt den Messzeitpunkt, weil der Baum während der Bauphase
wandert — ein Zwischenstand ist kein Endstand.)*

### 10.1 Voller Lauf 15:25 — **562/570 grün, 8 ROT** (66 Testdateien, 90 Module, 0 übersprungen)

Kein LADEFEHLER. Die ursprünglichen acht `UI: Übergabe › …` sind **verschwunden**; dafür standen acht
**neue** rote Zeilen im Lauf. Ich habe sie dem Umstand zugeschrieben, dass die Bauphase lief — und das
war richtig, aber nicht bei allen:

| # | roter Fall (wörtlich) | Fehler | meine Einordnung |
|---|---|---|---|
| 1–2 | `Doku: … › Jede erzeugte Seite hat <h1>, …` · `… › Die Uebersicht nennt alle Dokumente …` | `39 Dokumente + Uebersicht: ist 37 – soll 40` · `39 Karten — eine je Dokument: ist 36 – soll 39` | **Bauartefakt:** `tests/doku-seite.test.js:114` zählt die **Quelle**, vergleicht mit dem **Erzeugnis** `docs/doku/` — das war noch nicht neu gebaut. Erwartung: nach dem Endbau grün. **Bleibt zu prüfen.** |
| 3–5 | `Spiel: Bogen (S2) › Fehlerdex …` (drei Fälle) | `ist 39 – soll 36` | **Zwischenstand:** die drei neuen Fehlerarten heben den Dex 36 → 39. Der Eigentümer hat `tests/spiel-bogen.test.js` inzwischen auf `36 + DEX_NEU.length` umgestellt (`:41`, `:43`, `:49`, `:63`, `:71`). |
| 6 | `Injektoren: neu › portsec-fremde-mac …` | `ist "TIMEOUT" – soll "PORTSEC_VIOLATION"` | **inhaltlich:** der neue Injektor bricht den Ping nicht wie zugesagt |
| 7 | `Injektoren: neu › stp-doppelkabel: der Lauf bricht wirklich mit STORM ab …` | `nach dem Ziehen der zweiten Leitung trägt das Netz wieder` | **inhaltlich** (der Eigentümer prüft genau das, was ich in § 6.7 offenlassen musste) |
| 8 | `Spiel: Netzplan › alle generierten Tickets (Injektor × Vorlage) …` | `ist ["stp-doppelkabel/standorte: Abweichungen sw1,sw2 ≠ Lösung "] – soll []` | **inhaltlich:** mindestens in der Vorlage `standorte` heilt die Lösung die Abweichung nicht |

**Wert für die Abnahme:** Punkt 8 ist der Fall, der sonst durchrutscht — eine Karte, die startet und
„irgendwie" rot wird, aber dessen Lösung das Netz nicht heilt. Die Punkte 6–8 sind **keine** Bauartefakte
und müssen vor dem Endlauf grün sein (oder ehrlich als Befund dastehen).

### 10.2 Die Datenzahlen nach der Bauphase (15:28, 90 Module)

| Größe | Nullmessung/Vorher | **Jetzt gemessen** | Urteil |
|---|---|---|---|
| Module (headless) | 84 | **90** | gewachsen |
| Mini-Tickets | 92 | 92 | unverändert |
| Denkhilfen-Einträge | 25 („67 fehlten") | **91** | 66 Lücken gefüllt, **1** absichtlich frei (`mini-link-2`) |
| Hilfe-Vorschläge gesamt | 29 | **44** | +15 |
| davon **Ebene 2** | **0** | **15** | „Ebene 2 existiert nicht mehr 0×" — **belegt** |
| Fertigkeiten **ohne** Vorschlag | **10** | **0** (`skillsOhne: []`) | **belegt**; die 10 Namen aus § 7 sind alle abgedeckt |
| `bereich`-Werte der Vorschläge | — | `dienst, gateway, ip, link, route, vlan` | genau die `Spiel.LEITER`-ids, **kein** Fremdwert |
| Trainingskarten gesperrt | **3** | **0** (`gesperrt: []`) | belegt (§ 6.7) |

### 10.3 Zeilenenden — **kein Bruch in dieser Sitzung** (15:27)

Der Byte-Vergleich zeigt für **sieben** geänderte Dateien „Arbeitsbaum CRLF, HEAD LF":

`src/spiel/abnahme.js` · `src/spiel/dex.js` · `src/spiel/flow.js` · `src/spiel/postfach.js` ·
`src/ui/netzplan.js` · `src/ui/spiel.js` · `tests/spiel-bogen.test.js`

Das **sieht** wie der verbotene Fall aus. Die Index-Arithmetik entlastet alle sieben — Index-Statistik-Größe
= HEAD-Bytes **+ Zeilenzahl**, also war die Datei beim letzten Git-Zugriff bereits CRLF:

| Datei | HEAD-Bytes | HEAD-Zeilen | HEAD+Zeilen | Index-Statistik |
|---|---|---|---|---|
| `src/spiel/abnahme.js` | 16 001 | 238 | **16 239** | **16 239** |
| `src/spiel/dex.js` | 8 624 | 116 | **8 740** | **8 740** |
| `src/spiel/flow.js` | 5 190 | 79 | **5 269** | **5 269** |
| `src/spiel/postfach.js` | 13 994 | 235 | **14 229** | **14 229** |
| `src/ui/netzplan.js` | 11 151 | 152 | **11 303** | **11 303** |
| `src/ui/spiel.js` | 67 546 | 866 | **68 412** | **68 412** |
| `tests/spiel-bogen.test.js` | 10 752 | 161 | **10 913** | **10 913** |

**Ergebnis:** **Keine** Datei wurde in dieser Sitzung von LF auf CRLF gedreht. Alle **neuen** Dateien
(24 untracked, darunter dieses Review) sind **LF, 0 CRLF**. Der CRLF-Bestand ist gewachsen (repo-weit
51 von 423 verfolgten Dateien) und widerspricht `.gitattributes` (`* text=auto eol=lf`) — aber er ist
**vorbestehend**, nicht von dieser Sitzung gemacht.

### 10.4 Werkzeuge (15:30–15:31)

| Werkzeug | Ergebnis |
|---|---|
| `python tools/klassen.py` | **0 Klassen ohne CSS-Regel** — die neuen `.uz-*`/`.nst-*`-Klassen sind abgedeckt |
| `node tools/sim-stand.js` | **Simulation unverändert gegenüber dem Referenzstand** (12/12) |
| `node --check` über 212 JS-Dateien | **1** nicht ladbar: `tools/klassenraum-probe/B-workflow.js` (Top-Level-`await`); `tests/hilfe-ebene2.test.js` ist behoben |
| `python tools/ethos.py` **15:30** | **ROT**: `R5 Dauer nur 1/160/320 ms: 70 → 73 (+3)` |
| `python tools/ethos.py` **15:31:10** | **GRÜN: keine Regel schlechter als tests/stil-stand.json** |
| `node tools/pruefe-namen-flicken.js` | 66 Dateien geprüft, **0 laden nicht**, Exit 0 (nach der Korrektur, § 4.4) |

**Zur ethos-Roten, ehrlich:** sie fiel in dasselbe Zeitfenster, in dem `src/stil/naechster.css` entstand
(15:29:34) — die einzige neue CSS-Datei. Um 15:31:10 war die Regel wieder grün, **ohne** dass ich etwas
geändert hätte. Ich habe die +3 deshalb **nicht** einer bestimmten Zeile zuordnen können: mein eigener
Nachbau des Zählers (`messen()` des Werkzeugs direkt aufgerufen, mit und ohne `naechster.css`) ergab in
beiden Fällen **70**. **Ergebnis:** Zwischenstand während des Schreibens, kein belegter Verstoß.
**Restzweifel:** ein Zähler, der beim Schreiben einer Datei kurz ausschlägt, ist selbst eine Beobachtung
wert — für die Abnahme zählt der Endlauf.

### 10.5 Zweiter Vollschnitt 15:31 — **591/593 grün, 2 ROT** (69 Testdateien, 90 Module, 0 übersprungen)

Kein LADEFEHLER. Von den acht roten aus § 10.1 sind **sechs** verschwunden (Doku-Erzeugnis neu gebaut,
Fehlerdex-Zahlen nachgezogen, `stp-doppelkabel` heilt jetzt auch in `standorte`). Es blieben zwei — beide
gehören Bausteinen, die **nach** meinem Task-Board-Abzug entstanden sind:

```
✗ Fragen-Generator › Fragen-Generator: jede falsche Option ist ein typischer Denkfehler, keine Zufallszahl
✗ Spiel: naechster Schritt › Nur auf Bedarf: azubi nach Wartezeit, geselle nach Fehler, meister nie — gefragt bekommt sie jeder
```

**Wert für die Abnahme:** 591 von 593 grün heißt **nicht** fertig — die zwei roten Zeilen sind genau der
Grund, warum die Abnahme am Ende zählt und nicht der Zwischenstand. **Nicht geprüft:** ob diese zwei im
Endlauf noch rot sind (der Baum wanderte weiter, während ich maß).

### 10.6 Fremdbericht gegengeprüft: Fehlerdex-Nachzug (Peer-Meldung `hilfevorrat`, 15:35)

Der Peer meldete Zahlen zum Fehlerdex-Nachzug. Ich habe sie **nicht** zitiert, sondern mit eigener Probe
nachgezählt (90 Module, eigener `vm`-Bereich):

| Behauptung des Peers | meine Messung | Urteil |
|---|---|---|
| Injektoren 39 = `Spiel.dex.liste()` 39 = `dex.zaehlen().gesamt` 39 | **39 / 39 / 39** | **bestätigt** |
| Gruppen: schicht1 4 · adressen 6 · dienste 7 · vlan 5 · routing 4 · nat 4 · filter 6 · betrieb 3 | dieselben acht Zahlen, Summe **39** | **bestätigt** |
| alle 39 mit Gruppe, Symptom, Erkennungszeichen, Erklärung | `fehlt: []` über alle 39 (`gruppe`, `symptom`, `erkennen`, `erklaerung`) | **bestätigt** |
| 7 Grundcodes ohne Injektor: DEVICE_OFF, DHCP_CONFLICT, DHCP_LEASE_EXPIRED, DHCP_POOL_EMPTY, DHCP_RESERVED_BUSY, DHCP_SNOOPING_BLOCKED, NATIVE_MISMATCH | genau diese **7** | **bestätigt** |
| „Jeder von Injektoren benutzte Code liegt in `Sim.GRUENDE` (Differenz `[]`)" | **eine** Ausnahme: `OFFEN` wird von einem Injektor benutzt und steht **nicht** in `Sim.GRUENDE` | **teilweise widerlegt** |

Zu `OFFEN`: `src/spiel/dex.js:77` fängt genau diesen Wert ausdrücklich ab („Etwas ist erreichbar, das
gesperrt sein soll"). Die Ausnahme ist also **gewollt** — aber die Aussage „Differenz []" ist zu stark.
**Restzweifel:** meine Zahl beruht auf `Spiel.INJEKTOREN` als Objekt (`Object.values`); die erste Probe lief
in einen Typfehler, weil ich ein Feld falsch angenommen hatte. Diesen Fehlalarm nenne ich hier ausdrücklich,
weil er die Regel des Hauses belegt: **eine Probe, die das Falsche misst, sieht wie ein Befund aus.**

### 10.7 Was für die Abnahme offen bleibt

| Was | Stand |
|---|---|
| Voller Lauf **nach** dem letzten Bau-Task | **offen** — mein letzter Stand: 591/593 (15:31) |
| Die zwei roten aus § 10.5 | **offen** |
| `python tools/ethos.py`, `klassen.py`, `sim-stand.js` nach dem letzten Bau | klassen **0**, sim-stand **unverändert**, ethos **GRÜN** (15:31) — Endlauf offen |
| Zeilenenden der Dateien, die **nach** 15:27 entstehen | **offen** |
| Browser/Oberfläche (`bauen.py`, `tools/rauch.py`, `menueprobe.py`, `seite-pruefen.py`) | **nicht geprüft** — siehe § 9 |
