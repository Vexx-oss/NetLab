# Entwurf – Klassenraum-Umsetzung: die Lücke zwischen Spezifikation und Code

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Spezifikation: [[Klassenraum – Umsetzungsreife Spezifikation]] · Auftrag: task-26 (E1)

> **Auftrag.** Der Klassenraum ist fertig spezifiziert und **nicht gebaut**. Dieses Dokument misst die
> Lücke zwischen Spezifikation und heutigem Code und liefert einen umsetzungsreifen Plan — **keine**
> Zusammenfassung der Spezifikation.
>
> **Methode.** Quelltext und Spezifikation gelesen; alles Gemessene mit Befehl ausgeführt und die Zahl
> hier genannt. Gemessen am 07.10.2026 gegen den Arbeitsbaum (`ausbau-1.2`, nach `c341c2d`). Sonden
> liefen als stdin-Skripte in einem `vm`-Bereich mit derselben Ladereihenfolge wie `tests/run.js`;
> **es wurde keine Datei außer dieser angelegt oder geändert.**
>
> **Rangfolge bei Widersprüchen** (aus der Spezifikation übernommen): `tools/auftraege/KLASSENRAUM.md`
> → `docs/Architektur.md` → Spezifikation → die vier Teil-Dokumente A–D. Jede Abweichung wird genannt.

---

## 0 · Kurzurteil in fünf Sätzen

1. **Die Spezifikationsseite ist außergewöhnlich vollständig** — 290.541 B in sechs Dateien, dazu
   39 Nachweis-Dateien (1.572.629 B) und 32 Probe-Werkzeuge (1.013.503 B, gemessen); der Rust-Server C2
   ist gebaut und von mir **nachgemessen** (`cargo test --release`: 10/10, `klassenraum.exe` 322.560 B),
   der QR-Encoder ebenso (`cargo test --release`: 5/5, mit `--svg` und `--data-uri`).
2. **Die Umsetzungsseite ist exakt null**: `src/spiel/klassenraum.js`, `src/ui/klassenraum.js`,
   `src/stil/klassenraum.css`, `tests/klassenraum.test.js` — alle vier fehlen (gemessen); `typeof
   Spiel.klassenraum === "undefined"`.
3. **Der Codec friert heute noch das Richtige ein**: `Spiel.ticketReihe().length === 58`,
   `DATEN.skills.length === 27`, davon **24** mit Injektor — die drei Zahlen der Spezifikation stimmen
   unverändert (gemessen). Die eingefrorenen Tabellen können also gebaut werden, **solange nur
   angehängt wird**.
4. **Drei Änderungen seit dem 07.10.2026 erzwingen Entscheidungen, keine reinen Zusätze** (§ 4):
   der Trainingsweg hat einen **Postfach-Filter** eingeführt (`quelle:"training"`) und als erster
   Auftragstyp die **Karriere umgeleitet** (`abnahme.js:118`), die Hilfestellung verbucht Hilfe **je
   Fertigkeit** und bezahlt sie **je Ticket**, und das Stufensystem entscheidet jetzt über **sechs
   Flächen** (`STUFEN_WANN`), wer welche Hilfe sieht. Dazu zwei Funde der Gegenprüfung (task-30), die
   ich selbst nachgemessen habe: **ohne `ohneFlow` baut jedes Gerät einen anderen Auftrag** (§ 4.4, und
   der Netzkennwert merkt es nicht), und **der Klassenraum-Auftrag verfälscht die Karriere** (§ 4.5:
   33 € / 1 Ruf, Wochenziel, Kundenampel — beliebig oft wiederholbar).
5. **Der wichtigste Satz dieses Dokuments:** die Spezifikation ist an einer Stelle zu optimistisch —
   **Stufe A ist mit „≈ 1 Sitzung" veranschlagt** und verlangt vier neue Dateien, 40 Testfälle, zwei
   vollständige Ansichten mit wörtlichen Texten und zwei eingefrorene Tabellen; nach dem Vergleich mit
   einem eigenen, kleineren Baustein dieses Projekts (1 Engine-Datei, 27 Tests, ein zweiter
   Integrationsdurchgang) sind das **2–3 Sitzungen**. Zusammen mit den in der Planung **fehlenden**
   Sitzungen für das Nachziehen der drei Änderungen seit dem 07.10.2026 **und** der zwei Funde der
   Gegenprüfung (§ 4.4 und § 4.5) komme ich auf
   **8–11,5 Sitzungen statt 4,5–5,5** — die Zahl ist nach der Gegenprüfung (task-30) nochmals gestiegen.

---

## 1 · Was existiert schon (VORHANDEN, jede Zeile gemessen)

### 1.1 Die Spezifikationsseite

| Gegenstand | Beleg | Stand |
|---|---|---|
| Spezifikation + vier Teil-Dokumente + Liesmich | `docs/entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md` (30.069 B) · `Klassenraum/A…` (54.806) · `B…` (77.455) · `C…` (49.404) · `D…` (75.958) · `Liesmich.md` (2.849) | **290.541 B** |
| Nachweise (Messprotokolle, JSON-Belege, QR-Beispiel) | `Nachweise/Klassenraum/` | **39 Dateien, 1.572.629 B** |
| Probe-Werkzeuge (Referenz-Implementierungen + Gegenprüfungen) | `tools/klassenraum-probe/` (A-kanon.js, A-format.js, A-api.js, `A-pruef-*.js`, A-lader.js, B-workflow.js, C-http-probe.ps1, C-qr-rust, C-qr-python) | **32 Dateien, 1.013.503 B** |
| Der Codec-Determinismusbeweis | `Nachweise/Klassenraum/A-kanon.json` (64.229 B), A-api.json (89.077 B) | liegt vor |
| Der Testplan mit 40 Fällen | `D – Prüfung, Abnahme und Reihenfolge.md:103-140` | liegt vor |

### 1.2 Der Rust-Teil (die einzige schon gebaute Stufe)

| Gegenstand | Beleg | Stand (von mir gemessen) |
|---|---|---|
| C2-Server, abhängigkeitsfrei | `tools/klassenraum/src/{main,http,json,lager}.rs` | 4 Dateien, 1.312 Zeilen, 55.499 B |
| C2-Tests | `cargo test --release` in `tools/klassenraum` (cargo 1.97.1) | **10 passed; 0 failed** |
| C2-Binary | `tools/klassenraum/target/release/klassenraum.exe` | **322.560 B** (wie in der Spezifikation) |
| C2-HTTP-Probe (Sollwert 20/20) | `tools/klassenraum-probe/C-http-probe.ps1` | **nicht durchgelaufen** in dieser Umgebung — der erste *neue* Ergebnis-POST antwortet 507; Einzelheiten und Verdacht in § 9 |
| QR-Encoder (Machbarkeit) | `tools/klassenraum-probe/C-qr-rust/src/qr.rs` (25.205 B) + `main.rs` (8.800 B) | 2 Dateien, 34.005 B |
| QR-Tests | `cargo test --release` in `C-qr-rust` | **5 passed; 0 failed** |
| QR-Ausgabe | `main.rs:27-30` (`--svg DATEI`, `--data-uri DATEI`, `--modul`, `--ruhe`), `main.rs:160-177` (`qr::svg`, `data:image/svg+xml;base64,…`, `qr::base64`) | SVG und Daten-URI **gebaut** |
| QR-Gegenprobe | `tools/klassenraum-probe/C-qr-python/` (qr_referenz.py 41.256 B, qr_lesen.py 26.894 B, vergleich.py) | liegt vor |

**Wichtig für die Lücke:** Der QR-Encoder liegt in einem **eigenen Probe-Crate**, nicht im Server.
`tools/klassenraum/src/` enthält **keinen** QR-Code (Volltextsuche nach `qr|svg` in den vier
Server-Quellen: 0 Treffer). Die Spezifikation nennt ihn „Stufe D" — gebaut ist der *Beweis*, nicht die
*Strecke* (§ 2.6).

### 1.3 Die tragenden Haken im Spielkern (alle heute nachgemessen)

| Haken | Beleg heute | Trägt für den Klassenraum |
|---|---|---|
| Deterministischer Zufall | `src/kern/basis.js:42` (`function Zufall(seed)`) | Code → Seed → Netz |
| Start-Netz aus Seed | `src/spiel/ticket.js:14` (`Spiel.startNetz(def, seed)`) | „alle Geräte bauen dasselbe" |
| Seed-Fassung je Auftrag + Selbstprüfung | `src/daten/basis.js:169` (`ticketGueltig`), Aufruf `src/spiel/generator.js:126` | Kanonisierung |
| Instanz mit `seed`/`quelle`/`ohneFlow` | `src/spiel/postfach.js:62` (`Spiel.instanzErstellen = function(o = {})`), Flow-Wächter `:79` | der Öffnungsweg § 2.6 |
| Freie Store-Schlüssel | `src/kern/basis.js` (Store-Cache; Spezifikation nennt `:73-132`, die Zeilen sind verschoben) | `store "klassenraum"` |
| Ansichten anmelden | `src/ui/app.js:59` (`function registrieren`), Andock-Reihe `:23` | zwei neue Ansichten |
| Labor öffnen wie ein Ticket | `UI.spiel.oeffnen(iid)` (`src/ui/spiel.js`, öffentlich) | § 2.6 |

**Selbst gemessen, dass der Weg heute trägt:** eine Instanz mit
`Spiel.instanzErstellen({ticketId:"salon-01", seed:7, quelle:"klassenraum", ohneFlow:true})` entsteht
fehlerfrei, hat `quelle:"klassenraum"`, `inst.flow === null` (der Flow-Regler greift nicht), ist in
`Spiel.postfach()` **sichtbar** (Länge 1) und zählt in `Spiel.offen()` (1). Es fehlt also wirklich nur
`Spiel.klassenraum` davor.

**Und der Feldname der Instanz überlebt das Speichern:** `inst.klassenraum = {sitzung, platz, code}`
steht nach `Spiel.migrieren(JSON.parse(JSON.stringify(Spiel.st)))` unverändert wieder da (gemessen) —
die Migration behält unbekannte Felder. Der Vorschlag aus § 2.6 ist damit zukunftssicher.

---

## 2 · Was fehlt — Abschnitt für Abschnitt

Aufwandsschlüssel: **S** = Anteil einer Sitzung. „Sitzung" = ein Arbeitsblock dieses Projekts
(vgl. § 6).

| § der Spezifikation | Gegenstand | Zustand heute | Aufwand |
|---|---|---|---|
| § 2.1 Auftragscode | Alphabet, Nutzlast, zwei Prüfsummen | **FEHLT**; Algorithmus nur als Probe (`tools/klassenraum-probe/A-format.js`) | Teil von A |
| § 2.2 Ergebnis-Code | `E-XXXX-XXX`, 25 Bit | **FEHLT** | Teil von A/B |
| § 2.3 Seed-Kanonisierung | `KANON_FENSTER = 64`, Rückfall über Objektvergleich | **FEHLT**; Regel steht in A § 3, Probe `A-kanon.js` | Teil von A |
| § 2.4 Index-Tabellen | 58 + 27 Einträge als Literal | **FEHLT**; die Zahlen stimmen heute noch (gemessen) | Teil von A |
| § 2.5 API | 12 Funktionen, nie werfend, 10 Fehlerklassen | **FEHLT** | Teil von A |
| § 2.6 Öffnungsweg | `ausCode` → `instanzErstellen` → `UI.spiel.oeffnen` | **FEHLT** (nur die Haken, s. § 1.3); **GEÄNDERT NÖTIG** zweifach: Postfach-Sichtbarkeit (§ 4.1) und die `ohneFlow`-Falle (§ 4.4) | Teil von A |
| § 2.7 Netzkennwert | 6 Zeichen, kanonisches JSON | **FEHLT in `src/`** — existiert nur in `A-kanon.js` (D § 1.2 sagt das ehrlich) | Teil von A |
| § 2.8 Speicherform/Export | `store "klassenraum"` + verlustfreier Export | **FEHLT**; der Store ist frei (kein Fremdeingriff nötig) | Teil von A/B |
| § 3 Oberfläche | zwei Ansichten, `kl-`-Klassen, alle Texte wörtlich, Startseiten-Zeile | **FEHLT**; `klassenraum.css` fehlt | A (Ansichten) + B (Ampel/Eingabe) |
| § 4.1 C1 Server in der `.exe` | drei Stellen `shell/src-tauri/src/main.rs`, neue `klassenraum.rs` | **FEHLT** (Anleitung liegt vor) | 1–1,5 S |
| § 4.2 C2 eigenes Binary | gebaut und gemessen | **VORHANDEN** (§ 1.2) — aber **GEÄNDERT NÖTIG** (§ 2.7 unten) | ½–1 S |
| § 4.3 L3 „nur Codes über die Leitung" | Leiterentscheidung | **GEÄNDERT NÖTIG**, gemessen: `tools/klassenraum/src/lager.rs:21-23` (`sitzung`, `platz`, `sterne`), `:49-56` (Feldlesung) | in C2 enthalten |
| § 4.4 QR auf dem Beamer | Encoder + SVG-Data-URI an die Oberfläche | Encoder **VORHANDEN** (Probe), Strecke **FEHLT** (kein QR im Server, keine Anzeige in der Ansicht) | ½–1 S |
| § 5.1 Testplan 40 Fälle | `tests/klassenraum.test.js` | **FEHLT** | in A/B enthalten |
| § 5.2 Abnahmezahlen | 251 → 291, rauch 36/36, ethos 21 Dateien | **GEÄNDERT NÖTIG** — alle Zahlen veraltet (§ 5) | ⅓ S |
| § 5.3 Vorführung | drei Edge-Profile, Fotos | **FEHLT**; die Sandbox, die Edge blockierte, ist nicht mehr dieselbe (Hausstand meldet `--rauch` 39/39) | ⅓ S |
| § 6 fünf Sitzungen | A, B, C1, C2, D | Plan ohne die Post-Spezifikations-Änderungen | § 6 |

**Zwei Fremddateien, die die Spezifikation nicht auf der Liste hat** (beide nötig, beide sind ein
Entscheid des Leads):

1. `src/spiel/postfach.js` — entweder `quelle:"klassenraum"` aus `Spiel.postfach()` herausfiltern
   (wie `training`) **oder** die zwei gemessenen Nebenwirkungen tragen (§ 4.1).
2. `src/ui/spiel.js` — der Ergebnis-Code soll laut § 3 „im Ergebnis-Fenster nach der Abnahme"
   erscheinen; dieses Fenster wird in `ergebnisZeigen(erg)` gebaut (`src/ui/spiel.js`). Ohne Eingriff
   bleibt nur der Bus-Weg (`Spiel.melden("ticket-geloest")` → die neue Ansicht zeigt den Code) oder
   ein Toast. Die Spezifikation erlaubt nur `app.js`, `start.js`, `zustand.js` additiv und `abnahme.js`
   mit Freigabe — `src/ui/spiel.js` fehlt in dieser Liste.

---

## 3 · Die 40 Testfälle aus § 5.1: was sie wirklich brauchen

| Fälle | Gegenstand | Setzt auf vorhandener Infrastruktur auf? |
|---|---|---|
| 1–4 | Code-Round-Trip, `ticketId`/`seed`/`art`, zweimal lesen, Seed erreicht das Netz | **ja** — `Zufall` (`kern/basis.js:42`), `instanzErstellen` (`postfach.js:62`); neu ist nur `Spiel.klassenraum` |
| 5–24 | 20 Vertipper (10 Buchstaben-, 10 Ziffernstellen) | **ja** — brauchen nur die neue API und Testhilfen (`E`, `K`, `L`), die im `gruppe`-Rückruf stehen |
| 25 | 12 Paare (3 Aufträge × 4 Seeds) liefern einen lösbaren Auftrag | **ja** — `Spiel.ticketGueltig` existiert (`daten/basis.js:169`) |
| 26 | generierter Auftrag über `skill` | **ja** — `Spiel.generiere`/`ticketDef` vorhanden; **24 von 27** Fertigkeiten adressierbar (heute nachgemessen) |
| 27–33 | Ergebnis-Code, gekippte Prüfsumme, Idempotenz, fremde Sitzung, Export/Import, Neustart, Ampelzahlen | **überwiegend ja** — `Spiel.oeffnen`/`abnahme`/`loesung`/`arbeitszieleErfuellen` vorhanden; **neu ist die Testhilfe `ampelZahlen(sitzung)`** (D § 1.2 nennt sie ausdrücklich als noch nicht existent) |
| 34–39 | `null`-Sitzung, kaputter Import, Telefoneingabe, Unsinnscodes, Form/Alphabet, kein Klarname | **ja** — nur die neue API |
| 40 | eingefrorene Tabellen gegen `Spiel.ticketReihe()` und `DATEN.skills` | **ja** — beide Längen heute nachgemessen: **58** und **27** |

**Ergebnis:** Alle 40 Fälle setzen auf vorhandener Infrastruktur auf, sobald `Spiel.klassenraum`
existiert. **Zwei Hilfen müssen im Test entstehen** (`ampelZahlen`, `KW₂`/`netzkennwert` — Letzteres
gibt es nur in `tools/klassenraum-probe/A-kanon.js`, nicht in `src/`). Die Spezifikation sagt das
selbst (D § 1.2, „Zwei Hilfen, die es heute noch nicht gibt") — ehrlich und richtig.

**Und ein 41. Fall, den die Spezifikation nicht hat** (§ 4.4): derselbe Code, zwei Geräte mit
verschiedenem Flow-Stand, **ohne** `ohneFlow` → **verschiedene Aufträge**. Dieser Fall muss die
Verdrahtung aus § 2.6 absichern, sonst kann sie ein späterer Aufrufer still brechen.

---

## 4 · Widersprüche mit dem heutigen Code (der Kern des Auftrags)

### 4.1 Der Spielstand ist v:3 und hat den Trainingsweg — **ERGÄNZT, aber mit zwei Nebenwirkungen**

**Beleg.** `Spiel.VERSION = 3` (`src/spiel/zustand.js:16`), neues Feld `training` (`:43`); der
Postfach-Filter kennt jetzt drei unsichtbare Quellen: `quelle !== "pruefung" && !== "raetsel" &&
!== "training"` (`src/spiel/postfach.js:127`).

**Gemessen, was das für einen Klassenraum-Auftrag heißt:**

| Prüfung | Klassenraum (`quelle:"klassenraum"`) | Training (`quelle:"training"`) |
|---|---|---|
| in `Spiel.postfach()` sichtbar | **1** | **0** |
| im Spielstand (`st.postfach`) | 1 | 1 |
| zählt in `Spiel.offen()` (Kopfzeile) | **1** | **0** |

Die Spezifikation will die Sichtbarkeit ausdrücklich („ist aber im Postfach sichtbar", § 2.6) — das ist
heute **noch so**, also **kein Bruch**. Aber:

* **Nebenwirkung 1 (gemessen):** `Spiel.postfachAuffuellen()` blockt dieselbe `ticketId`, solange die
  Klassenraum-Instanz im Postfach liegt — `const imPostfach = new Set(st.postfach.map(i => i.ticketId))`
  (`postfach.js:156`), Kandidatenfilter darüber. Nachgestellt: nach `postfachAuffuellen()` standen
  `["salon-01"(Klassenraum), "salon-02", "baeckerei-01"]` — **salon-01 wurde nicht erneut angeboten**.
  Bei den Einstiegsaufträgen (`salon-01…06`, `Spiel.ersteStunde`) ist das die unangenehmste Kollision.
* **Nebenwirkung 2 (gemessen):** der Offen-Zähler der Kopfzeile und der Andock-Punkt zählen den
  Klassenraum-Auftrag mit — auf dem Schülergerät ist das eher erwünscht („du hast einen Auftrag"),
  auf dem Lehrergerät gibt es keinen Auftrag, also auch kein Problem.

**Entscheidung nötig (E1):** sichtbar lassen (wie spezifiziert, zwei Nebenwirkungen tragen) **oder**
wie `training` herausfiltern (dann entfallen beide Nebenwirkungen; die Ansicht „Auftrag" zeigt den
Auftrag ohnehin). Meine Empfehlung: **herausfiltern** — eine Zeile in `src/spiel/postfach.js`, und der
Klassenraum-Auftrag ist damit kein Postfach-Ticket, sondern ein eigener Weg, genau wie das Training.

### 4.2 Die Stufen-Erweiterung — **ERGÄNZUNG, die eine Entscheidung erzwingt**

**Beleg.** `Spiel.STUFEN_WANN` (`src/spiel/stufensystem.js:74-79`) kennt **sechs** Flächen —
`leiter`, `anker`, `miniHilfe`, `wasGeht`, `vorschlaege`, `syntaxBruecke` — je vier Stufen:
`azubi`/`azubi-plus` „immer", `geselle` „nachfehler", `meister` „nein" (von mir ausgelesen).
`Spiel.stufe.darf(frage)` = „gibt es die Fläche überhaupt" (bei `nachfehler` **true**,
`stufensystem.js:145`), `wann(flaeche)` = „wann erscheint sie"; `kann(frage)` liefert die Zahlen der
Tabelle (gemessen: `vorschlaege` 1/2/1/0, `tipps` alle/fehler/fehler/keine, `niveau` E/E/AP1/AP2,
`konto` 6/4/2/0, `erklaerung` ausführlich/ausführlich/knapp/nurcodes).

**Für den Klassenraum heißt das:**

* Der Auftrag selbst ist **stufenunabhängig**: der Netzkennwert liest `{v, geraete, kabel}` (§ 2.7) —
  die Stufe steckt nicht darin. Die Kernbehauptung „alle Geräte bekommen denselben Auftrag" bleibt
  **wahr**.
* Die **Hilfe** ist es nicht: `Spiel.niveauVon(inst)` rechnet das wirksame Niveau je Gerät
  (gemessen: `wahl=auto` → `E`, weil die Netz-Klasse `def.stufe` „E" ist) und `wann`/`darf` steuern,
  welche Flächen überhaupt erscheinen. Zwei Schüler im selben Raum sehen also **denselben Auftrag mit
  unterschiedlich viel Hilfe** — für den Unterricht richtig, für die Vorführung erklärungsbedürftig.
* **Kein Bruch**, aber die Frage „überstimmt die Lehreransage die Stufe?" ist neu. Meine Empfehlung
  (E3): **nein.** Der Vertrag „Hilfestellung – Stufen und Schnittstellen" § 1 sagt wörtlich: „Der
  Bildungsstand ist eine **Voreinstellung des Menschen**, kein Spielzustand und keine Automatik."
  Eine Lehreransage, die einem Meister die Werkzeugleiter aufzwingt, würde genau das brechen. Was der
  Klassenraum tun darf: die Stufe **nennen** (der Lehrer sieht, mit welcher Hilfe ein Schüler arbeitet)
  — das ist heute aber nicht Teil des Ergebnis-Codes (§ 4.3).

### 4.3 Hilfe je Fertigkeit und je Ticket — **TEILWEISE IN WIDERSPRUCH**

**Beleg.** `Spiel.hilfe(inst, o)` schreibt seit task-19 die **Fertigkeit** in den Eintrag
(`src/spiel/hilfe.js:119`, Eintrag `{stufe, skill, frei, t}`); `Spiel.hilfeFuerSkill` entscheidet je
Fertigkeit (`src/spiel/lernen.js:62`); bezahlt wird **je Ticket** über `Spiel.hilfeAbzuege`
(`src/spiel/abnahme.js:61`) und den Sternabzug; der Ticket-Vorrat kommt aus
`Spiel.HILFE_KONTO[alsTicketId(inst)]` mit Rückfall auf `EINST_STANDARD.stufe`
(`src/spiel/stufensystem.js:95-100`).

**Gemessen an einem Klassenraum-Ticket** (Person auf „meister" gestellt, Ticket ohne `stufe`):
`Spiel.stufe.konto(inst)` = **`{frei:6, gesamt:6}`** — der Vorrat des **Azubi**, obwohl der Mensch
Meister ist. Sechs gezogene Sprossen landen alle auf `def.skills[0]` (`lab.link`) mit
`frei = [false,false,false,true,true,true]`, und `Spiel.hilfeAbzuege(inst)` bleibt **leer**: der Vorrat
hat alle sechs bezahlt, der Schüler verliert **keinen** Stern.

**Antwort auf die Frage „wessen Ticket-Vorrat gilt?":** der des **Schülers auf seinem Gerät** — es gibt
keinen gemeinsamen Vorrat, keine 30-fache Multiplikation. Der Lehrer hat gar kein Ticket. Was fehlt,
ist eine **Entscheidung über die Höhe**:

* Heute ist der Vorrat jedes Tickets implizit **azubi (6)** — auch für einen Meister, auch für einen
  Gesellen (gemessen). Das ist im Klassenzimmer **günstig** (alle gleich behandelt), widerspricht aber
  § 2.1 der Hilfestellung, wo der Vorrat je Stufe 6/4/2/0 ist.
* Empfehlung (E4): dem Ticket seine Stufe **ausdrücklich** mitgeben (`inst.stufe = "azubi"` für den
  Klassenraum) — dann ist die Zahl sichtbar und stabil, statt von einem Rückfall abzuhängen. Die Stufe
  des Menschen darf **nicht** hineinwirken (sonst wäre derselbe Code auf zwei Geräten verschieden
  „teuer"; das widerspräche dem Gedanken „ein Code, ein Auftrag").

**Und der zweite Teil: die Karriere-Wirkung ist messbar wiederholbar.** Nach dem Hauptweg L4 („zulassen")
zahlt ein Klassenraum-Auftrag wie ein Kundenauftrag, und derselbe Code lässt sich **beliebig oft**
spielen — nachgestellt mit `salon-01`, Seed 7, zweimal gelöst:

```
Lauf 1: bestanden, 5 Sterne, +33 € +1 Ruf   Stand: 33 € / 1 Ruf / 1 erledigt
Lauf 2: bestanden, 5 Sterne, +33 € +1 Ruf   Stand: 66 € / 2 Ruf / 2 erledigt
```

`Spiel.istErledigt("salon-01")` ist nach Lauf 1 wahr — der Klassenraum-Weg fragt es aber nicht ab
(`Spiel.instanzErstellen` direkt, kein `postfachAuffuellen`). Dazu zählt der Auftrag in **alle**
Wertungen mit, die nur `pruefung`/`raetsel` ausnehmen: `Spiel.flow.nachAbschluss`
(`src/spiel/abnahme.js:149` → `src/spiel/flow.js:72`), Wochenziel (`src/spiel/woche.js:9-16`),
Arbeitstag (`src/spiel/tag.js`), Abzeichen, Fehlerdex, Tagebuch. Nach drei Läufen desselben Auftrags
mit voller Hilfe kippt der Flow-Regler die Fertigkeit auf „geruest" (§ 2.1) — der Klassenraum
verändert dann die **normalen** Aufträge des Schülers.

**Empfehlung (E2):** die L4-**Verschärfung** ist für den Unterricht nicht optional, sondern der
Regelfall: vier Zeilen in `src/spiel/abnahme.js` (früher Ausstieg für `quelle:"klassenraum"`), damit
der Auftrag weder Lohn noch Ruf noch einen `erledigt`-Eintrag erzeugt. Die Spezifikation nennt sie
„empfohlen, braucht Freigabe" — nach dieser Messung ist sie **notwendig**, sonst ist der Klassenraum
eine Geldquelle und ein Flow-Verzerrer. (Ein zweiter, schwächerer Weg ohne Fremdeingriff: der
Klassenraum-Auftrag wird beim Erzeugen mit `quelle:"pruefung"` gebaut — dann nehmen ihn **alle**
Wertungen aus, aber die Prüfungslogik (`Spiel.pruefung`) würde mitgemeint, und `Spiel.postfach()` /
`Spiel.offen()` verhalten sich anders. Nicht empfohlen, nur genannt.)

### 4.4 `ohneFlow: true` ist keine Empfehlung, sondern die Bedingung (Gegenprüfung task-30, nachgemessen)

**Beleg.** `src/spiel/postfach.js:79`: `const flow = Spiel.flow && !o.ohneFlow && o.quelle !== "pruefung"
&& o.quelle !== "raetsel" ? Spiel.flow.fuer(def) : null;` — der Flow-Regler greift also **immer**, wenn
`ohneFlow` fehlt. `Spiel.flow.fuer(def)` liest den **lokalen** Stand der Hauptfertigkeit aus dem
Spielstand dieses Geräts und baut den Auftrag um (`flow.js:50-66` → `Spiel.generiere(…, {flow})`).

**Gemessen, derselbe Code (`lab.vlan`, Seed 5) auf Geräten mit verschiedenem Flow-Stand, ohne `ohneFlow`:**

```
normal      -> gen-lab.vlan-5              (2 Ziele)
geruest     -> gen-lab.vlan-5-geruest      (1 Ziel)
verwicklung -> gen-lab.vlan-5-verwicklung  (mehr Ziele)
```

Mit `ohneFlow: true` entsteht in **allen** drei Fällen `gen-lab.vlan-5`, `inst.flow === null` ✓. Ohne
`ohneFlow` bekommt ein Schüler, der die Fertigkeit zweimal verhauen hat, **einen anderen (leichteren)
Auftrag als seine Nachbarin** — dieselbe Lehreransage, zwei verschiedene Aufgaben.

**Die unangenehme Feinheit:** die **Gerätemenge und die Kabelliste blieben in meiner Stichprobe gleich**
(`{"g":[behandlung,empfang,gast,inet,r1,srv,sw1],"k":6}` in allen drei Fällen). Der Netzkennwert der
Spezifikation (§ 2.7) liest genau `{v, geraete, kabel}` — **er würde die Abweichung also nicht
bemerken.** Wer „beide Geräte haben denselben Auftrag" beweisen will, darf nicht nur den Abdruck
vergleichen, sondern muss `def.id` (oder die Zahl der Ziele) mitvergleichen. Für den Testplan heißt das:
Test 1 und Test 40 reichen als Beweis **nicht**; es braucht einen Fall „`ohneFlow` weggelassen →
verschiedener Auftrag" (neuer Test, Nr. 41).

**Empfehlung:** `ohneFlow: true` im Öffnungsweg **fest verdrahten** (nicht als Parameter durchreichen),
sonst kann ein späterer Aufrufer es vergessen. Die Spezifikation verlangt es bereits („Zwingend") — sie
kennt aber diese Messung nicht und keinen Test dafür.

### 4.5 Der Klassenraum-Auftrag verfälscht die Karriere (Gegenprüfung task-30, nachgemessen)

**Beleg (alle Zeilen selbst geprüft).** `src/spiel/abnahme.js:118` leitet **nur** `quelle === "training"`
um — alles andere läuft in den normalen Weg: Lohn (`:91`), Tempo (`:93`), Kundenakte (`:148`), Flow
(`:149`), `st.erledigt.push` mit `quelle` (`:150`), Kundensterne (`:152-154`). Und die Filter, die es gibt,
nehmen **nur** `pruefung`/`raetsel` aus: `woche.js:10,12,16`, `abzeichen.js:13`, `formen.js:43`,
`erstestunde.js:26`, `tag.js:45`, `hub.js:54`, `verdacht.js:20`, `karriere.js:103`, `postfach.js:79`,
`ui/spiel.js:69,475`. Für `"klassenraum"` gibt es **nirgends** einen Filter — die Quelle existiert ja
noch nicht. `kundenakte.js:54` zählt sogar ganz ohne Quellfilter: `(st.erledigt||[]).filter(e => e.kunde === id).length`.

**Gemessen, ein Klassenraum-Auftrag (`salon-01`, Seed 7, ohne Hilfe, 5 Sterne, Niveau E):**

| Größe | vorher | nachher | Beleg |
|---|---|---|---|
| Lohn / Ruf | 0 / 0 | **+33 € / +1 Ruf** | `abnahme.js:91,94` |
| `st.erledigt` | 0 | **1** (`{id:"salon-01", sterne:5, hilfe:0, quelle:"klassenraum", kunde:"salon"}`) | `abnahme.js:150` |
| Wochenziel „5 Aufträge ohne Hilfe" | 0 | **ist: 1** | `woche.js:10` |
| Kundensterne `salon` | `[]` | **`[5]`**, Kundenampel `"gruen"` | `abnahme.js:152-154` |
| Karriere-Statistik `aktiv` | 0 | 0 (kopflicher Lauf ohne Oberfläche — der Zähler hängt am Bus-Ereignis, `karriere.js:103`) | nicht im Browser gemessen |
| Abzeichen erhalten | 0 | 0 (ein Lauf reicht nicht) | — |

**Zweimal dasselbe:** zwei Läufe desselben Codes → **66 €, 2 Ruf, 2 `erledigt`-Einträge** (§ 4.3). Ein
Klassensatz mit 20 Azubis, die denselben Code abtippen, erzeugt also 20 × (Lohn + Ruf + Fortschritt +
Kundenampel) in 20 Spielständen — für einen Lehrerbetrieb ist das ein **Fehler, nicht Kosmetik**, und es
ist derselbe Mechanismus wie beim Training, nur ohne dessen Umleitung.

**Die Lösung ist keine Geschmacksfrage, sondern eine Entscheidung des Leads:**

* **(a) Symmetrisch zum Trainingsweg** — eine Zeile vor jedem Nebeneffekt in `Spiel.abschliessen`
  (neben `:118`): `if (inst.quelle === "klassenraum" && Spiel.klassenraum) return Spiel.klassenraum.abnehmen(inst, abnahme);`
  Dann gilt für den Klassenraum wörtlich dasselbe wie für das Training: kein Geld, kein Ruf, kein
  Karrierefortschritt, keine Wochenwertung — und der Auftrag ist trotzdem gelöst und wird gelernt
  (`Spiel.lernenNachAbnahme` muss der Klassenraum-Zweig selbst aufrufen, wie `Spiel.training.abnehmen`
  es tut, `training.js:230`).
* **(b) Eigene Auswertung** — der Auftrag **soll** bewertet werden (Sterne, Note), aber ohne Karriere:
  das ist mehr Arbeit (eine eigene Ergebnisform plus die Filter an allen elf Stellen oben) und bringt
  gegenüber (a) nichts, was der Lehrer im Unterricht sieht — der Ergebnis-Code trägt ohnehin nur
  Sitzung/Platz/Sterne/Versuche/Dauer.

**Empfehlung: (a).** Sie kostet eine Zeile in einer Fremddatei (Freigabe des Leads, wie bei der
L4-Verschärfung), hält die Zusage „Training und Klassenraum zahlen nichts" symmetrisch, und der Lernwert
bleibt vollständig erhalten. Ohne (a) oder (b) darf der Klassenraum **nicht** in eine Klasse.

### 4.6 Was die vier Änderungen insgesamt bedeuten

| Änderung | bricht die Spezifikation? | ergänzt sie? | Entscheidung |
|---|---|---|---|
| v:3 + Trainingsweg (Postfach-Filter) | **nein** — die Sichtbarkeits-Zusage gilt heute noch | ja, erzwingt aber E1 | E1: filtern oder tragen |
| Stufen (`STUFEN_WANN`, `darf`/`wann`) | **nein** — der Auftrag bleibt stufenunabhängig | ja, erzwingt E3 | E3: Stufe nicht überstimmen |
| Hilfe je Fertigkeit/Ticket (`hilfe({skill})`, `hilfeAbzuege`) | **ja, an einer Stelle**: der Vorrat ist heute implizit immer azubi-6 | ja | E4 (Ticket-Stufe) |
| Flow-Regler ohne `ohneFlow` (§ 4.4) | **ja** — „alle bekommen denselben Auftrag" fällt, und der Abdruck merkt es nicht | — | `ohneFlow` fest verdrahten, Test Nr. 41 |
| Karriere-Weg ohne Quellfilter (§ 4.5) | **ja** — Lohn, Ruf, Wochenziel, Abzeichen, Kundenampel zählen voll mit, beliebig oft | — | E2: symmetrisch zum Training umleiten (a) |

---

## 5 · Veraltete Zahlen und Verweise der Spezifikation

| Spezifikation sagt | Heute gemessen | Folge |
|---|---|---|
| `node tests/run.js` **251/251**, 35 Testdateien, 76 Module (§ 0, § 5.2) | Hausstand **461/461**, 53 Testdateien, 83 Module (am Ende dieser Arbeit selbst gelaufen) | Sollzahl nach dem Einbau **461 + 41 ≈ 502** — 40 Fälle der Spezifikation **plus** Nr. 41 für die `ohneFlow`-Falle (§ 4.4), nicht 291 |
| `node tests/run.js --klassenraum` 0/0 → 40/40 | Filter existiert ✓ | bleibt |
| `python tools/ethos.py` 21 Dateien, 1938 Zeilen, „Dateizahl 21 → 22 erlaubt" | **26 Dateien, 2069 Zeilen** (selbst gemessen) | 26 → 27 |
| `python tools/klassen.py` 0 | **0** ✓ | bleibt |
| `sh tools/test.sh --rauch` **36/36** | Hausstand **39/39** (12 Ansichten × 3 Breiten, mit „Training") | Sollzahl 39 |
| `tools/menueprobe.py` 5 Profile/49 Kriterien (Android 1.2.3) | unverändert, aber die Android-Fassung kennt die Hilfestellung nicht | Aussage „unverändert" nur mit diesem Hinweis |
| „21 Tokens in `basis.css`" (B § 2.4) | **55** `--`-Deklarationen in `src/stil/basis.css` (gemessen) | Tokenliste neu ziehen |
| `src/spiel/postfach.js:124` (sichtbar) / `:152` (regulär) | **`:127`** (Filter) / **`:155`** (`regulaer`) | Zitate nachziehen |
| `src/ui/app.js:11,59-61` | REIHE **`:23`**, `registrieren` **`:59`** | Zitate nachziehen |
| `src/kern/basis.js:41-56` (Zufall) | **`:42`** | Zitate nachziehen |
| `src/daten/basis.js:107-178` + `generator.js:126` | `ticketGueltig` **`daten/basis.js:169`**, Aufruf **`generator.js:126`** ✓ | halb aktuell |
| `inst.klassenraum` in § 2.6 | überlebt die Migration (gemessen) | bleibt gültig |
| L3: „der gebaute Entwurf benutzt noch `sitzung`/`platz`/`sterne`/`dauerS`" | **bestätigt**: `tools/klassenraum/src/lager.rs:21-23`, `:49-56` | beim Einbau umstellen + HTTP-Probe erneut |

---

## 6 · Aufwand in Sitzungen (jede Zahl begründet)

| Stufe | Spezifikation | Meine Schätzung | Begründung |
|---|---|---|---|
| **A · Verteilen** | ≈ 1 | **2–3** | 4 neue Dateien (`spiel/klassenraum.js`, `ui/klassenraum.js`, `stil/klassenraum.css`, `tests/klassenraum.test.js`), 12 API-Funktionen mit 10 Fehlerklassen und der Auflage „wirft nie" (17 Unsinnsfälle in den Tests), der Codec mit zwei Prüfsummen + Kanonisierung, **zwei eingefrorene Tabellen** (58 + 27 Einträge, die Element für Element geprüft werden — Test 40), **zwei vollständige Ansichten** mit wörtlichen Texten (B § 3) und der Auflage, dass **jede** neue Klasse eine CSS-Regel hat (`tools/klassen.py`) und der Rauchtest nicht bricht (39 Fälle über 12 Ansichten), dazu die Startseiten-Zeile. Vergleich im eigenen Haus: mein Baustein D (1 Engine-Datei, 1 Ansicht, 1 CSS, 27 Tests) war **ein langer Block plus ein zweiter Integrationsdurchgang** (Postfach-Filter, Abnahme-Umleitung). A ist deutlich größer. |
| **B · Einsammeln** | 1–2 | **2** | Ergebnis-Code-Strecke, Lehrer-Eingabe (Block, Doppelte, fremde Sitzung, 5 Fehlerklassen), Ampel mit Median, Export/Import über die Plattform-APIs — plus die Frage, **wo** der Ergebnis-Code erscheint (`src/ui/spiel.js` ist eine Fremddatei, s. § 2) und die Tests dafür. |
| **C1 · Server in der `.exe`** | 1 | **1–1,5** | Kopie/Anpassung des Probe-Crates nach `shell/src-tauri/src/klassenraum.rs`, drei Stellen in `main.rs`, Einstellungs-Schalter, Capability-Beweis, plus die L3-Umstellung des Formats (§ 4.3) und `cargo tauri build`/`q-echt.py`. |
| **C2 · eigenes Binary** | ½ | **½–1** | Der Server **ist gebaut** (10/10 von mir gemessen) — die Arbeit ist die **L3-Umstellung** (`lager.rs:21-23` → nur `auftrag`+`code`) und die erneute HTTP-Probe (Sollwert 20/20). |
| **D · QR** | ½ | **½–1** | Der Encoder ist gebaut und getestet (5/5) — es fehlt die **Strecke**: Encoder in Server/Hülle verfügbar machen, SVG-Data-URI an die Ansicht, Anzeige auf dem Beamer, Abbruch bei zu langem Inhalt, nur Desktop. |
| **E · Nachziehen (in der Spezifikation nicht vorgesehen)** | — | **1,5–2** | Die **vier** Änderungen aus § 4 (E1–E4) samt der Karriere-Regel (§ 4.5, eine Zeile in `abnahme.js` **mit** Freigabe und eigener Messung „zahlt nichts mehr"), der neue Test Nr. 41 für die `ohneFlow`-Falle (§ 4.4), die veralteten Sollzahlen (§ 5), `docs/Architektur.md` § 12 + § 7.4, CHANGELOG, Stand-Tabellen und ein erneuter Durchlauf **aller** Abnahmebefehle. Nach der Gegenprüfung (task-30) von 1 auf 1,5–2 erhöht. |
| **F · Übergabe und Fassung (in der Spezifikation nicht vorgesehen)** | — | **0,5–1** | Bericht nach der Vorlage (D § 7), Fassung ziehen (`tools/fassung-ziehen.py --neu 1.2.4` mit Trockenlauf, `VERSION_CODE` von Hand), Doku-Bau (`docs/doku`), Nachweise ablegen, Vorführfotos, und die Übergabe an den Lead zum Commit. Diese Sitzung steht in **keiner** Sitzungsliste der Spezifikation. |
| **Summe** | **4,5–5,5** | **8–11,5** | |

**Wo die Spezifikation zu optimistisch ist — der wichtigste Absatz dieses Dokuments:**

> **Stufe A ist mit „≈ 1 Sitzung" veranschlagt und braucht 2–3.** Sie umfasst vier neue Dateien, zwei
> vollständige Ansichten mit wörtlich vorgeschriebenen Texten, einen Codec mit zwei Prüfsummen, zwei
> eingefrorene Tabellen und 40 Testfälle — das ist mehr als jeder Baustein, der in diesem Projekt
> bisher in *einem* Block entstanden ist (mein Vergleichsstück hatte ein Viertel davon und brauchte
> einen zweiten Durchgang). Zweitens fehlt in der Planung **jede** Sitzung für das Nachziehen der
> Änderungen seit dem 07.10.2026: die Sichtbarkeitsfrage (E1), die Karriere-Verschärfung (E2), die
> Ticket-Stufe (E4), die `ohneFlow`-Falle (§ 4.4) und die veralteten Sollzahlen sind keine Fußnoten,
> sondern Arbeit an fremden Dateien mit eigenen Tests und einer erneuten Abnahme. Drittens ist die
> Vorführung (§ 5.3) mit „fünf Schritten in drei Edge-Profilen" beschrieben — das ist selbst mit
> lauffähigem Edge ein halber Block, kein Anhängsel. Viertens fehlt die **Übergabe** (Fassung ziehen,
> Doku-Bau, Nachweise, Bericht) in jeder Sitzungsliste. **Die Gegenprüfung `task-30` hat diese Rechnung
> bestätigt und meine erste Fassung (7–9,5) um rund eine Sitzung nach oben korrigiert — zu Recht:** sie
> enthielt die Karriere-Regel (§ 4.5) und die Übergabe nicht.

---

## 7 · Vorschlag: Reihenfolge

1. **Erst entscheiden (E1–E4 und E8, § 8)** — jede dieser Antworten ändert Dateien, die nicht auf der
   Erlaubnisliste stehen. Ohne sie wird A zweimal gebaut.
2. **Die Karriere-Regel zuerst bauen (§ 4.5)** — eine Zeile in `Spiel.abschliessen` plus ein Test
   „Klassenraum zahlt nichts". Sie ist billig und sie ist die Bedingung dafür, dass der Klassenraum
   überhaupt in eine Klasse darf; sie hängt an keiner anderen Stufe.
3. **A mit dem kleinsten spielbaren Kern**: `Spiel.klassenraum` (Codec, Kanonisierung, Tabellen, die
   acht Auftragsfunktionen) + **eine** Ansicht (`mitarbeit`, der Schülerweg) + Startseiten-Zeile +
   die 40 Testfälle + Test Nr. 41 (`ohneFlow` weggelassen → verschiedener Auftrag, § 4.4). Das ist die
   Stufe, die den Unterricht schon trägt („ein Code, alle bauen denselben Auftrag"), noch ohne
   Einsammeln.
4. **B**: Ergebnis-Code, Lehrer-Ansicht, Ampel, Export/Import. Hier fällt die Entscheidung über den
   Ort des Ergebnis-Codes (Fremddatei oder Bus).
5. **E**: Nachziehen (Architektur § 12, CHANGELOG, Sollzahlen, Abnahme) — **vor** dem Commit, wie es
   die Projektregel „Kein Commit ohne Stand" verlangt.
6. **C1/C2/D** zuletzt und einzeln: der Server ist eine Zugabe („ohne Server alles grün"), QR ist eine
   Zugabe zur Zugabe. Beide können ohne Schaden für den Rest verschoben werden.
7. **F**: Übergabe (Fassung, Doku-Bau, Nachweise, Bericht) — die Sitzung, die in der Spezifikation fehlt.

---

## 8 · Offene Entscheidungen für den Lead (mit Empfehlung)

| # | Frage | Empfehlung |
|---|---|---|
| **E1** | Ist der Klassenraum-Auftrag im Postfach **sichtbar** (wie spezifiziert) oder **herausgefiltert** (wie `training`)? | **herausfiltern** — eine Zeile in `postfach.js`; die zwei gemessenen Nebenwirkungen (blockierte `ticketId`, Offen-Zähler) entfallen |
| **E2** | Karriere-Wirkung: Hauptweg (zulassen) oder Umleitung? | **(a) symmetrisch zum Training** — eine Zeile neben `abnahme.js:118`; gemessen zählt der Auftrag sonst Lohn, Ruf, Wochenziel, Kundenampel und ist beliebig oft wiederholbar (66 € für zwei Läufe). Variante (b) „eigene Auswertung ohne Karriere" ist mehr Arbeit und bringt im Unterricht nichts |
| **E8** | Beweist der Netzkennwert „alle haben denselben Auftrag"? | **nein** — gemessen bleiben Geräte und Kabel beim Flow-Umbau gleich, nur `def.id`/Ziele ändern sich (§ 4.4). DoD und Testplan um einen Vergleich von `def.id` **und** einen Test Nr. 41 erweitern |
| **E3** | Darf die Lehreransage den Bildungsstand überstimmen? | **nein** (Vertrag § 1: Bildungsstand = Voreinstellung des Menschen); die Stufe höchstens **anzeigen** |
| **E4** | Wessen Vorrat gilt für ein Klassenraum-Ticket? | **Ticket-Stufe ausdrücklich setzen** (`inst.stufe = "azubi"`, heute schon der stille Rückfall) — nie die Stufe des Menschen, sonst ist derselbe Code je Gerät verschieden teuer |
| **E5** | Soll der Lehrer sehen, **wie viel Hilfe** nötig war? | **nein für 1.3** — der Ergebnis-Code trägt kein Hilfe-Feld (A § 6); das wäre ein Formatbruch. Später über die Export-Datei oder den Server, nicht über den Code |
| **E6** | C1, C2, D jetzt oder später? | **später** — A und B tragen den Unterricht ohne Netz; Server und QR bleiben Zugaben |
| **E7** | Neue Sollzahlen für § 5.2 | **461 + 41 ≈ 502**, rauch **39/39**, ethos **26 → 27 Dateien**, klassen **0**, sim-stand unverändert |

---

## 9 · Was ich nicht geprüft habe (ehrlich)

* **Kein Browser, keine Vorführung, keine Fotos, kein Rauchtest, keine Menüprobe.** Die Zahlen aus der
  AGENTS.md-Tabelle (rauch 39/39, menueprobe 5/49) sind **übernommen, nicht von mir nachgemessen**.
* **`cargo tauri build` und `python tools/q-echt.py` habe ich nicht ausgeführt** — C1 ist Anleitung,
  kein Nachweis. Ich habe nur die zwei eigenständigen Rust-Projekte getestet (`cargo test --release`
  in `tools/klassenraum` und `C-qr-rust`).
* **Die HTTP-Probe `C-http-probe.ps1` (Sollwert 20/20) ist in dieser Umgebung NICHT durchgelaufen.**
  Gemessen: der Server startet („Ablage … 0 Ergebnis(se) geladen", Port 47119), die ersten Aufrufe
  antworten wie erwartet (idempotenter POST 200, OPTIONS 204, fremde Sitzung 409, falscher
  Content-Type 415, Rumpf > 4096 → 413, 404, 405, Liste 200/400), aber **schon der erste neue
  Ergebnis-POST antwortet 507 statt 201** — mit `-Lebensdauer 180` ebenso wie mit 16 (der
  Lebensdauer-Verdacht war falsch). Nach dem Lauf fehlt die Ablagedatei im Arbeitsordner, der
  Server-stderr ist leer, im Speicher standen 2 Ergebnisse. Der Pfad im Server ist
  `lager.rs:84` (`self.sichern()?` → `Err` → `main.rs:467-472` → 507): **der Server konnte seine
  eigene Ablagedatei nicht schreiben**; die Ursache habe ich hier nicht abschließend gefunden
  (Verdacht: Schreibrecht des Kindprozesses auf `%TEMP%` in dieser Werkzeug-Sandbox — die Probe
  selbst durfte dort schreiben, der Server nicht). Es ist **kein Nachweis eines Serverfehlers**;
  auf dem Referenzrechner lief die Probe laut Spezifikation 20/20.
  Nebenbei gemessen und für C2 notiert: der Eintrag liegt nach dem Fehlschlag trotzdem im Lager
  (Speicher vor `sichern()`), ein zweiter POST desselben Codes antwortet 200 „idempotent" — der
  Client kann also „507, aber gespeichert" nicht von einem echten Fehlschlag unterscheiden. Nach
  dem Lauf: **keine `klassenraum`-Prozesse mehr, Ports 47119 und 47131 frei** (selbst geprüft).
* **Was der Lead tun kann:** die Probe außerhalb dieser Werkzeug-Sandbox bzw. in einer Sitzung mit
  Schreibrecht für Kindprozesse erneut laufen lassen; erst dann ist der Sollwert 20/20 belegt.
* **Die Spezifikation selbst habe ich nicht Element für Element nachgerechnet** (ihre Codec-Zahlen,
  Kanonisierungs-Quoten, QR-Differentialtests). Nachgemessen habe ich: die Länge der Eingaben
  (58/27/24), die zwei Rust-Testsuiten, die vier fehlenden Dateien, die Postfach-/Vorrats-/Karriere-
  Wirkung und die veralteten Verweise.
* **Keine Aussage über den Unterrichtserfolg.** Ob ein 10-Zeichen-Code im Klassenzimmer praktikabel
  ist, kann nur eine echte Stunde zeigen.
* **Die Karriere-Wirkung habe ich kopflich gemessen, nicht im Browser.** Lohn, Ruf, `st.erledigt`,
  Wochenziel, Kundensterne und Kundenampel habe ich mit eigenen Sonden nachgestellt (§ 4.5); die
  **Karriere-Statistik** (`karriere.js:103`) und die **Aufstiegsprüfung** hängen am Bus-Ereignis
  `ticket-geloest` und blieben im kopflosen Lauf bei 0 — im laufenden Programm ist genau dieser Weg
  aktiv. Ob 20 Klassenraum-Aufträge wirklich ein Abzeichen oder einen Aufstieg auslösen, habe ich
  **nicht** gemessen; die Quelltexte (`abzeichen.js:13`, `karriere.js:103`) nehmen `klassenraum`
  jedenfalls nicht aus.
* Die beiden Funde der Gegenprüfung `task-30` (§ 4.4 `ohneFlow`, § 4.5 Karriere) habe ich **selbst
  nachgemessen**, nicht übernommen — die Zahlen in diesem Dokument stammen aus meinen eigenen Sonden.
* **Android** ist nicht Teil dieses Auftrags; `android/bauen.py` wurde nicht angefasst oder gebaut.
