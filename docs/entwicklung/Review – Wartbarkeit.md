# 🔍 Review – Wartbarkeit der Bausteine „Hilfestellung"

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Auftrag: `task-14` · Vertrag: [[Hilfestellung – Stufen und Schnittstellen]] · Architektur: [[Architektur]]

> **Auftrag.** Prüfe die WARTBARKEIT der neuen Bausteine A–H. Kein Umbau, keine Meinung ohne Beleg.
> **Stand der Messung:** Commit `c341c2d`, Arbeitsbaum sauber. Gelesen wurde nur; geändert wurde allein diese Datei.
> **Prüfpunkte** (aus `task-14`): 1 Größe/Verantwortung · 2 doppelte Wahrheiten · 3 Kopplung · 4 defensive Rückfälle · 5 Testbarkeit.
> **Prioritäten:** **P1** verhindert Änderungen · **P2** kostet Zeit · **P3** Kosmetik.

## Kurzfassung

**Antwort auf die Leitfrage („doppelte Wahrheiten beseitigt oder verschoben?"):** Die *Definitionstabelle* ist
beseitigt – § 2 steht genau einmal, in `Spiel.STUFE`/`STUFEN_SCHALTER`/`STUFEN_WANN` (`src/spiel/stufensystem.js:44–76`),
und die Mini-Hilfe baut die Fehlerregel nachweislich nicht mehr nach (`src/spiel/mini.js:144–152`). **Verschoben**
worden sind zwei Dinge: (a) die **Terminal-Hilfe** prüft „erst nach Fehler" weiterhin selbst, an drei Stellen
(`src/spiel/hilfe.js:278, 306, 321`), statt `Spiel.stufe.wannPasst` zu fragen; (b) **vier Fallback-Kopien** der
§ 2-Zahlen entstanden in `src/ui/konsole.js:25–30`, `src/cli/parser.js:279,354`,
`src/ui/lernstand-hilfe.js:29–35` und `src/spiel/mini.js:11–12`. Kein P1 gefunden.

| # | Befund | Priorität |
|---|---|---|
| 2.1 | Zwei Vorschlagsquellen: `Spiel.hilfe.passend` und `CLI.vorschlag` (im Bau nur die erste erreichbar, die zweite ungetestet) | P2 |
| 2.2 | „erst nach Fehler" in `src/spiel/hilfe.js:278, 306, 321` selbst gebaut – plus 4 Fallback-Kopien der § 2-Zahlen | P2 |
| 2.3 | Der Freigabe-Text existiert zweimal: `Spiel.stufe.freigabeText` und `UI.lernstandHilfe.freigabeText` | P2 |
| 1.1 | `src/spiel/fehlertexte.js`: 1176 Zeilen, davon ~1015 Tabelle – Daten liegen in der Spielschicht | P2 |
| 4 | 17 × „Baustein A da?"-Prüfungen: **11 müssen bleiben, 6 sind entfernbar** | P3 |
| 2.4 / 2.5 | Gerüst-Texte (`GERUEST` vs. `WERKZEUGE`) und Erklärwege (`fehlertext` vs. `grundText`): **KEINE Doppelung** | – |

---

## 1 · Größe und Verantwortung

Gemessen am Stand `c341c2d` (Zeilen = `Get-Content | .Count`, öffentliche Namen = Zuweisungen `^Spiel.|^UI.|^DATEN.`):

| Datei | Zeilen | öffentliche Namen | Was noch drinsteckt |
|---|---:|---:|---|
| `src/spiel/stufensystem.js` | 235 | 7 (dazu 16 Methoden in `Spiel.stufe`) | 4 Tabellen + 16 Funktionen – **eine** Verantwortung (Bildungsstand) |
| `src/spiel/hilfe.js` | 339 | 15 | Daten (`LEITER`, `WERKZEUGE` 27, `SENIOR_FRAGEN` 13) + Stufenmodell + Baustein B (ab :189) |
| `src/spiel/fehlertexte.js` | 1176 | 2 | **82 Tabelleneinträge** + 106 Zeilen Auswertung |
| `src/spiel/training.js` | 252 | 2 | Notvorrat `TRAINING_EIGENE_SZENARIEN` (9 Szenarien) + Logik |
| `src/ui/hilfe.js` | 172 | 1 (2 Methoden) | reine DOM-Ausgabe |
| `src/ui/training.js` | 138 | 1 | reine DOM-Ausgabe |
| `src/ui/lernstand-hilfe.js` | 282 | 1 | DOM + Lernmotor-Leser + Stufen-Rückfalltabelle (`:29–35`) |
| `src/ui/stufensystem.js` | 81 | 1 | Einstellungs-Abschnitt |
| `src/daten/hilfen.js` | 259 | 1 | drei Tabellen (`VORSCHLAEGE`, `GERUEST`, `SYNTAX`) – thematisch zusammengehörig |
| `src/daten/trainings.js` | 383 | 1 | 34 Szenarien, reine Daten |

### 1.1 · `fehlertexte.js` ist ein Datenpaket in der Spielschicht — P2

* **Behauptung:** Die Datei ist zu ~86 % Tabelle: `Spiel.FEHLERTEXTE = [` beginnt in `:55` und endet in `:1069`
  (82 Einträge, gemessen über `^\s+id: "`), die Auswertung umfasst nur `:1071–1176` (106 Zeilen: `ART_ALIAS`, `ARTE`, `lageVon`,
  `artPasst`, `modusPasst`, `stufenText`, `Spiel.fehlertext`). Die vergleichbaren Pakete liegen als Daten:
  `src/daten/hilfen.js`, `src/daten/trainings.js`.
* **Beleg:** `src/spiel/fehlertexte.js:55`, `:1069`, `:1082`, `:1152`; `src/daten/hilfen.js:22`; `src/daten/trainings.js:27`.
* **Risiko:** Der Vertrag § 7 ordnet Daten nicht der Schicht `spiel` zu; ein Review muss jedes Mal 1000 Zeilen
  Daten durchblättern, um 100 Zeilen Logik zu finden. `bauen.py` nimmt beide Ordner automatisch auf, ein Umzug ist
  also technisch billig.
* **Vorschlag:** `Spiel.FEHLERTEXTE` nach `src/daten/fehlertexte.js` als `DATEN.fehlertExte` verschieben, den
  106-Zeilen-Auswerter in `src/spiel/fehlertexte.js` lassen, Zugriff wie bei `DATEN.hilfen` über die Spielschicht.
  Zwei Zeilen in `tests/spiel-fehlertexte.test.js` ziehen nach. **Entscheidung des Lead** (fremde Datei, § 7).

### 1.2 · `src/spiel/hilfe.js` trägt jetzt drei Verantwortungen — P3

* **Behauptung:** Daten (27 Werkzeughinweise, 13 Senior-Fragen), das Stufenmodell der bestehenden Hilfeleiter und
  seit diesem Bau die vier Funktionen aus Vertrag § 4.1 (`passend` `:275`, `geruest` `:289`, `leiter` `:303`,
  `syntaxBruecke` `:316`, zusammen ~150 Zeilen).
* **Beleg:** `src/spiel/hilfe.js:37`, `:68`, `:275–339`.
* **Risiko:** § 7 erlaubt genau dieses Anfügen („nur am Dateiende"), also **kein Vertragsbruch**; die Datei wird
  aber von zwei Bausteinen zugleich verändert.
* **Vorschlag:** Kein Umbau nötig. Wenn die Datei das nächste Mal angefasst wird: die reinen Texttabellen
  (`WERKZEUGE`, `SENIOR_FRAGEN`) nach `src/daten/werkzeuge.js` ziehen – dann bleibt in `hilfe.js` nur Verhalten.

---

## 2 · Doppelte Wahrheiten

### 2.1 · Zwei Vorschlagsquellen: entschärft, nicht beseitigt — P2

* **Behauptung:** `Spiel.hilfe.passend` (`src/spiel/hilfe.js:275`) und `CLI.vorschlag`
  (`src/cli/entspricht.js:186–257`, ~70 Zeilen Regelwerk) beantworten dieselbe Frage („was tippe ich jetzt?").
  Im gebauten Programm ist nur die erste erreichbar; die zweite hängt als Rückfall daneben.
* **Beleg:** `src/ui/konsole.js:334–346` – `ausSpielHilfe` ist wahr, sobald `DATEN.hilfen` existiert; im Bau
  existiert es (`src/daten/hilfen.js:22`). Kein Test ruft `CLI.vorschlag` auf: die Testhilfe in
  `tests/spiel-hilfe-vorschlaege.test.js:249` liest `Spiel.hilfe.leiter(...).vorschlag`, die Wirkungsprüfung
  `tests/pruefung-wirkung.test.js:112` belegt `Spiel.hilfe.passend` in `konsole.js`.
* **Risiko:** Die zweite Maschine ist ungetestet und kann unbemerkt verrotten; wer die Befehle der Konsole ändert,
  muss zwei Stellen pflegen. Umgekehrt kennt `CLI.vorschlag` Modi (`config`, `vlan`, `line`, `dhcp`), die
  `DATEN.hilfen.VORSCHLAEGE` nicht abdeckt – der Rückfall ist stellenweise **fähiger** als der Hauptweg.
* **Vorschlag:** Entweder `CLI.vorschlag` löschen und den Rückfall in `konsole.js:344` auf `null` setzen, oder ihn
  als bewussten Zweitweg führen: ein Kommentar in beiden Dateien („Rückfall für Testfassungen ohne `DATEN.hilfen`")
  und zwei Tests, die seine Ausgabe festhalten. Beides ist eine Entscheidung des Lead.

### 2.2 · „erst nach Fehler" wird in der Terminal-Hilfe weiterhin selbst gebaut — P2

* **Behauptung:** Die Bedingung existiert **nicht** mehr in `src/spiel/mini.js` (dort delegiert), aber **dreimal**
  in `src/spiel/hilfe.js` – jedes Mal mit eigener Logik statt `Spiel.stufe.wannPasst`.
* **Beleg:**
  * Definition (eine Quelle): `src/spiel/stufensystem.js:71–76` (`STUFEN_WANN`) und `:158–165` (`wannPasst`);
    die Datei sagt in `:142` ausdrücklich: „Für das WANN ist `wann()`/`wannPasst()` zuständig".
  * Mini-Hilfe delegiert korrekt: `src/spiel/mini.js:144–152` (Kommentar `:118`).
  * Terminal-Hilfe baut selbst: `src/spiel/hilfe.js:278` (`kann("leiter") === "nachfehler" && !hatFehler(...)`),
    `:306` (dieselbe Zeile für `leiter()`), `:321` (`if (!fehler && r >= 2) return null;` – eine Regel, für die
    es in `STUFEN_WANN` **keine** Zeile gibt).
* **Risiko:** Ändert der Vertrag § 2 eine Zeile (z. B. „Geselle sieht den Streifen sofort"), müssen drei Stellen
  nachgezogen werden – und die Tabelle in A behauptet derweil etwas anderes. Genau das war Befund B2.
* **Vorschlag:** In `hilfe.js:278/306` `Spiel.stufe.wannPasst("leiter", {fehler})` benutzen und `:321` über eine
  neue Fläche (`"syntaxBruecke"`) in `STUFEN_WANN` führen. Beides berührt den Vertragstext → Lead.

### 2.2a · Vier Fallback-Kopien der § 2-Zahlen — P3

| Kopie | Datei:Zeile | Was dupliziert wird | erreichbar? |
|---|---|---|---|
| `STUFE_RUECKFALL` | `src/ui/konsole.js:25–30` | `einstieg`, `tipps` aus `Spiel.STUFE` (`stufensystem.js:45–48`) | nur ohne A (`:33–43`) |
| `o.tipps \|\| (o.einstieg ? "alle" : "keine")` | `src/cli/parser.js:279`, `:354` | dieselbe Zuordnung, dritte Fassung | wenn `konsole.js` nichts übergibt |
| `RUECKFALL` + `SCHALTER_AZUBI` | `src/ui/lernstand-hilfe.js:29–35` | `rang`, `name`, `vorschlaege`, `leiter`, `konto` | Testkapsel „ohne A" (`tests/spiel-lernstand-hilfe.test.js:431`) |
| `SPROSSEN` / `HILFE_KONTO` | `src/spiel/mini.js:11–12` | `HILFE_KONTO` = `stufensystem.js:52` | zweiter Eintrag ist toter Zweig, s. 4 |

* **Behauptung:** Die Zahlen sind gleich, aber sie stehen viermal. Die Tabelle `Spiel.STUFE` behauptet in
  `stufensystem.js:40–41`, „jede Zeile der Vertragstabelle" zu halten; die Zeile „Leiste/Mini: 2 Hilfen" lebt
  dagegen allein in `src/spiel/mini.js:11` (`SPROSSEN`) – für sie gibt es in A **kein Feld**.
* **Risiko:** Wer § 2 nachzieht (der Vertrag § 9 kündigt das an: „Die Zahlen … werden nach dem ersten
  Durchspielen nachgezogen"), muss fünf Stellen finden. `SPROSSEN` würde beim Nachziehen übersehen.
* **Vorschlag:** Ein gemeinsames Rückfallpaket (z. B. `DATEN.stufen`) als Quelle für A **und** die Rückfälle;
  `SPROSSEN` als Feld in `Spiel.STUFE` aufnehmen (z. B. `sprossen: {azubi: 2, "azubi-plus": 1, …}`) und in
  `mini.js:216` über `kann("sprossen")` lesen. Vertragsänderung → Lead.

### 2.3 · Der Freigabe-Text existiert zweimal — P2

* **Behauptung:** `Spiel.stufe.freigabeText` (`src/spiel/stufensystem.js:208–224`) und
  `UI.lernstandHilfe.freigabeText` + `hilfeKurz` (`src/ui/lernstand-hilfe.js:83–101`) schreiben denselben Satz
  („Stufe X von 4 · … was ist frei") aus derselben Quelle (`kann`/`darf`), mit unterschiedlichem Wortlaut.
* **Beleg:** A-Text: `„Stufe 3 von 4 · Geselle: 1 Vorschlag im Terminal · Werkzeugleiter nach einem Fehler ·
  Hilfe-Knopf in Leiste und Mini-Ticket (2 Hilfen je Auftrag frei) …"` (`stufensystem.js:213–223`);
  UI-Text: `„Stufe 3 von 4 · Geselle / Prüfungsvorbereitung – 1 Vorschlag mit Syntax im Terminal ·
  Werkzeugleiter nach einem Fehler · Hilfe-Knopf im Mini-Ticket (2 frei) …"` (`lernstand-hilfe.js:86–100`).
  Beide Texte sind durch Tests festgehalten: `tests/spiel-stufensystem.test.js:395, 419` und
  `tests/spiel-lernstand-hilfe.test.js:375`.
* **Risiko:** Zwei Wahrheiten für eine Aussage; der Mensch liest in den Einstellungen und im Lernstand
  unterschiedliche Formulierungen. Positiv: beide lesen `kann`/`darf`, keine zweite Tabelle.
* **Vorschlag:** `UI.lernstandHilfe.freigabeText()` gibt `Spiel.stufe.freigabeText()` zurück und hängt nur den
  Zusatz `hilfeKurz()` an; der Test prüft dann Gleichheit statt Eigentext. Eine Stunde, eine Datei.

### 2.4 · Gerüst-Texte: KEINE Doppelung — entlastet

* **Behauptung:** `DATEN.hilfen.GERUEST` und `Spiel.WERKZEUGE` beantworten **verschiedene** Fragen.
* **Beleg:** `src/daten/hilfen.js:156–181` ist nach **Geräteart + CLI-Modus** geschlüsselt (`ios.user`, `ios.priv`,
  `host-windows.host`, `fw.fwPriv` …) und beantwortet „Was geht hier?" – gelesen nur von
  `Spiel.hilfe.geruest` (`src/spiel/hilfe.js:290–297`). `src/spiel/hilfe.js:37–65` ist nach **Fertigkeit**
  geschlüsselt (27 Einträge) und beantwortet „Welches Werkzeug zeigt, wo es hängt?" – gelesen von
  Hilfestufe 2 (`src/spiel/hilfe.js:98`), `src/spiel/mini.js:194` und `src/spiel/training.js:182`.
  Verschiedene Schlüssel, verschiedene Frage, kein gemeinsamer Aufrufer.
* **Risiko:** Nur ein Berührungspunkt: beide nennen konkrete Befehle (`show ip interface brief` in
  `daten/hilfen.js:159` und `spiel/hilfe.js:38`). Ändert IOS einen Befehl, sind zwei Textstellen zu pflegen. P3.
* **Vorschlag:** Nichts umbauen. Vermerk genügt.

### 2.5 · Zwei Erklärwege (`Spiel.fehlertext` / `Spiel.grundText`): KEINE Doppelung — entlastet

* **Behauptung:** Die beiden erklären nicht dieselbe Ursache, sondern zwei verschiedene Ereignisse.
* **Beleg:** `Spiel.fehlertext` (`src/spiel/fehlertexte.js:1152`) wird von der **Ausgabe der Konsole** gesteuert
  (`t.erkennung.test(ausgabe)`, `:1169`) und antwortet im Moment des Tippfehlers; die Tiefe kommt aus dem
  **Bildungsstand** (`Spiel.stufe.text`, `:1139`). `Spiel.grundText` (`src/spiel/lernen.js:101`) wird von einem
  **Grundcode** gesteuert (`DATEN.lehrtexte[code]`, `Sim.GRUENDE`) und antwortet bei der Abnahme eines Ziels;
  die Tiefe kommt aus der **Erklärtiefe** `niveau`.
* **Risiko:** Keine Doppelung, aber zwei Tiefe-Achsen in zwei Erklärwegen – das ist § 1 (getrennte Achsen) und
  damit gewollt; beim Lesen ist es die häufigste Verwechslung. P3.
* **Vorschlag:** Im Kopf von `fehlertexte.js` einen Satz ergänzen, welcher Weg wofür zuständig ist
  (steht sinngemäß in `:2–10`, könnte aber den Namen `Spiel.grundText` nennen).

---

## 3 · Kopplung und Schichtung

* **Behauptung:** Die neuen Daten- und Spiel-Dateien greifen nicht auf die Oberfläche zu; die Richtung
  `kern → modell → sim → cli → daten → spiel → plattform → ui` ist eingehalten.
* **Beleg (gemessen):** `grep -E "\bUI\.|\bdocument\.|\bwindow\."` über `src/daten/*.js` und `src/spiel/*.js`
  → **0 Treffer**. `grep -E "\bSpiel\.|\bstore\.|\bBus\.|\bL\."` über `src/daten/*.js` → nur Kommentare
  (`daten/hilfen.js:4`, `:19`; `daten/trainings.js:18`) und der **vorbestehende** `DATEN.ticketSpec`
  (`daten/basis.js:156, 166, 169`), der laut eigenem Kommentar `:108` bewusst erst beim Zugriff über
  `Spiel.ticketBauen` arbeitet – kein neuer Bruch.
* **Beleg (Gegenrichtung):** `src/ui/hilfe.js:15, 20, 28, 36` und `src/ui/lernstand-hilfe.js:37, 75`
  lesen `Spiel.*` – erlaubt (ui darf nach unten).
* **Risiko:** Keines gefunden. **Offen gemeldet:** `src/spiel/mini.js:241` liest `DATEN.wiki` direkt
  (daten ← spiel, erlaubt) und `src/spiel/training.js:96` liest `DATEN.trainings` – beides ist der vorgesehene
  Weg, kein Zugriff der Oberfläche an der Spielschicht vorbei.

---

## 4 · Defensive Rückfälle: wie viele sind noch nötig?

**Gezählt (Stand `c341c2d`):** 11 Prüfungen der Form `typeof Spiel.stufe !== "undefined"` in `src/`
(`src/spiel/erstestunde.js:148, 179, 197`; `src/spiel/mini.js:126, 137, 146, 159`;
`src/spiel/fehlertexte.js:1139`; `src/spiel/training.js:104, 110, 116`) und 6 gleichwertige der Form
`typeof Spiel !== "undefined" && Spiel.stufe` in `src/ui/` (`src/ui/hilfe.js:20, 28, 36`;
`src/ui/konsole.js:33, 40`; `src/ui/lernstand-hilfe.js:37`) – **zusammen 17**.

| Datei:Zeile | Prüft | Verdikt | Beleg |
|---|---|---|---|
| `spiel/erstestunde.js:148, 179, 197` | `id`, `alle`, `setzen` | **bleibt** | `tests/spiel-einstieg-stufe.test.js:234` löscht A und prüft den Rückfall |
| `spiel/mini.js:126` | `rang` | **bleibt** | `tests/spiel-mini-hilfe.test.js:228` setzt `Spiel.stufe = undefined` und prüft `:229–232` Hilfe und Anker |
| `spiel/mini.js:137` | `darf` | **bleibt** | dito (der Test läuft durch `hilfe()`/`anker()`, die beide `darf` fragen) |
| `spiel/mini.js:146` | `wannPasst` | **bleibt** | zweifach gedeckt: `:220` lässt `wannPasst` werfen, `:228` entfernt A ganz |
| `spiel/mini.js:159` | `kann("konto")` | **entfernbar (toter Zweig)** | `:157–158` antwortet vorher über `Spiel.HILFE_KONTO`; kein Test löscht `HILFE_KONTO` |
| `spiel/fehlertexte.js:1139` | `text` | **bleibt** | `tests/spiel-fehlertexte.test.js:289` löscht A, erwartet „ausführlich" |
| `spiel/training.js:104, 110, 116` | `id`, `darf`, `erklaerung` | **bleibt** | `tests/spiel-training.test.js:241` löscht A; `tests/ui-training.test.js:131` setzt `stufe: null` |
| `ui/lernstand-hilfe.js:37` | `Spiel.stufe` | **bleibt** | Testkapsel „ohne A" `tests/spiel-lernstand-hilfe.test.js:431` |
| `ui/hilfe.js:20, 28, 36` | `def`, `konto`, `rang` | **entfernbar** | kein Test baut `UI.hilfe` ohne A; `tests/spiel-hilfe-vorschlaege.test.js:456` **ersetzt** A nur |
| `ui/konsole.js:33, 40` | `kann`, `id` | **entfernbar** | dito (die Konsole läuft in Tests immer mit A) |

* **Behauptung:** 11 der 17 Prüfungen sind durch Testkapseln gedeckt und **müssen** bleiben – sie sind kein
  toter Ballast, sondern die Zusicherung „ohne A gilt azubi" (Vertrag § 3, Regel 1). 6 sind entfernbar.
* **Risiko beim Entfernen:** Wer `ui/hilfe.js` oder `ui/konsole.js` jemals ohne Spielschicht lädt (Testfassung,
  Einzeldatei-Bau), verliert den Rückfall und bekäme einen `ReferenceError` statt „Azubi". Deshalb: **entfernbar,
  aber begründete Versicherung** – ich empfehle, nur `spiel/mini.js:159` zu entfernen (nachweislich unerreichbar)
  und die fünf UI-Prüfungen stehen zu lassen.
* **Zusatz:** Zusammen mit `Spiel.MINI.HILFE_KONTO` (`spiel/mini.js:12`) ist auch `mini.js:164` nur erreichbar,
  wenn `HILFE_KONTO` fehlt – dieselbe Klasse wie `:159`. Beide Zeilen sind Kandidaten für einen Streichstrich.

---

## 5 · Testbarkeit: was ist nicht abgedeckt?

Gemessen: Name in `tests/*.test.js` gesucht (`grep`), Stand `c341c2d`, 44 Testdateien.

**Nicht abgedeckt (neu in diesem Bau):**

| Datei:Funktion | Warum es auffällt | Vorschlag |
|---|---|---|
| `src/spiel/stufensystem.js:174` `Spiel.stufe.hilfenFrei(inst)` | Kein Test ruft sie; `tests/spiel-stufensystem.test.js:262` prüft nur das **Feld** `a.hilfenFrei` | Ein Testfall: Ticket mit `hilfenFrei: 3` → `hilfenFrei()` = 3, ohne Feld = `konto().frei` |
| `src/spiel/stufensystem.js:229` `Spiel.stufeInstanz()` | Kein Test; nur mittelbar über `konto()` ohne Argument | Ein Testfall: ohne offenes Ticket `null`, mit `st.aktiv` die Instanz |
| `src/cli/entspricht.js:188` `CLI.vorschlag` | Kein Test, im Bau nicht erreichbar (s. 2.1) | Entweder löschen oder zwei Tests |
| `src/spiel/lernen.js:101` `Spiel.grundText` | kein Test (vorbestehend, nicht neu) – `grundTitel`/`lernenNachAbnahme` ebenso wenig | Ein Testfall über einen bekannten Grundcode je Niveau |
| `src/spiel/fehlertexte.js:55` `Spiel.FEHLERTEXTE` (Tabelle) | mittelbar abgedeckt: `tests/spiel-fehlertexte.test.js` prüft jeden Eintrag über seine `probe` | keine Aktion |

**Abgedeckt (zur Entlastung, damit die Liste vollständig ist):** `Spiel.stufe.alle/id/def/rang/setzen/kann/
darf/wann/wannPasst/erklaerung/konto/hilfeZiehen/text/erklaerungText/freigabeText` (`tests/spiel-stufensystem.test.js`,
`tests/pruefung-hilfestellung.test.js`), `Spiel.hilfe.passend/geruest/leiter/syntaxBruecke`
(`tests/spiel-hilfe-vorschlaege.test.js:196–330`), `Spiel.mini.hilfe/anker` (`tests/spiel-mini-hilfe.test.js`),
`Spiel.fehlertext` (`tests/spiel-fehlertexte.test.js`), `Spiel.training.liste/starten/stand/abnehmen`
(`tests/spiel-training.test.js`), `UI.stufeAbschnitt.zeichnen` (`tests/spiel-stufensystem.test.js:389`),
`UI.lernstandHilfe.*` (`tests/spiel-lernstand-hilfe.test.js`), `UI.training.*` (`tests/ui-training.test.js`),
`DATEN.trainings` (`tests/daten-trainings.test.js`). `UI.hilfe.aktualisieren` und `UI.hilfe.zeichnen` werden
**indirekt** ausgeführt (`tests/spiel-hilfe-vorschlaege.test.js:471` öffnet `UI.konsole`, das den Streifen zeichnet),
aber nie direkt gerufen.

---

## Anhang · So sind die Zahlen entstanden

```
Zeilen            Get-Content <Datei> | .Count                      (je Datei oben)
öffentl. Namen    Select-String '^(Spiel|UI|DATEN)\.[A-Za-z_.]+ *='
Tabelleneinträge  Select-String '^\s+id: "' in src/spiel/fehlertexte.js   -> 82
Kopplung          grep '\bUI\.|\bdocument\.|\bwindow\.' in src/daten, src/spiel -> 0 Treffer
Rückfälle         grep 'typeof Spiel\.stufe' bzw. 'typeof Spiel !== "undefined"' in src/
Testabdeckung     grep '<Funktionsname>' in tests/*.test.js
```

Kein Testlauf nötig für dieses Review; der Stand des Auftrags ist `395/395 grün` (Commit `c341c2d`), gemessen vom Lead.
