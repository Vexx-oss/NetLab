# Review – Lernwirkung: Führt die Hilfestellung zum Lernen oder nur zum Durchkommen?

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Vertrag: [[Hilfestellung – Stufen und Schnittstellen]] · Auftrag: task-13 (R1)

> **Auftrag.** Fachliche Prüfung der Hilfestellung (Stufen, Vorrat, Terminal-Streifen, Mini-Denkhilfe,
> Anker, Trainingsbereich) auf ihre Lernwirkung. Jeder Befund mit **Behauptung · Beleg (Datei:Zeile) ·
> Wirkung auf den Lernenden · Vorschlag · Priorität**.
>
> **Stand.** Commit `c341c2d` („Hilfestellung: Hilfe dahin, wo der Azubi steht").
> **Methode.** Quelltext gelesen; alle Zahlen aus **eigenen Messungen** mit dem geladenen Spiel in einem
> `vm`-Bereich (dieselbe Ladereihenfolge wie `tests/run.js`), Sonden nur über stdin, **keine Datei angefasst**
> außer diesem Review. Gemessen wurde an `salon-01` (E-Ticket), an einem frischen Lernmotor-Zustand und an
> `DATEN.mini`/`DATEN.wiki`. Was nur aus dem Quelltext folgt, steht als „gelesen" dabei, was gemessen wurde,
> als „gemessen" mit Zahl.
>
> **Prioritäten.** **P1** = bremst das Lernen · **P2** = verschenkt Potenzial · **P3** = Feinschliff.

---

## 0. Kurzurteil

**Die Hilfestellung lernt sich nicht kaputt — aber sie bezahlt Hilfe mit genau den Mitteln, die den
Anfänger treffen, und sie verbucht Hilfe nicht dort, wo gelernt wird.**

Gut gelöst (und das ist mehr, als der Auftrag erwarten ließ):

* **Der Lernmotor fälscht keine Beherrschung.** Eine Hilfe ab Sprosse 4 hebt den Leitner-Kasten **nicht**
  an und plant die Wiederholung für morgen — gemessen: ohne Hilfe `box 0 → 1`, mit Hilfe `box 0 → 0`
  (`fremd/lernmotor.js:57-60`). Das ist lernpsychologisch richtig: „mit Lösung" ist kein Können.
* **Hilfe führt zu Stütze, nicht zu Strafe.** Sie geht **je Fertigkeit** in den Flow-Regler: `hilfe >= 4`
  zählt dort als Fehlschlag (`src/spiel/flow.js:25-27`), zwei davon in Folge bauen den nächsten Auftrag
  dieser Fertigkeit **mit Gerüst** (`flow.js:36-37`). Wer Hilfe braucht, bekommt beim nächsten Mal mehr
  Führung — genau die richtige Richtung.
* **Jede Mini-Antwort geht durch den Lernmotor**, jede falsche zusätzlich ins Fehlerheft
  (`src/spiel/mini.js:101-102`; gemessen: 8 falsche Antworten → 8 Fehlerheft-Einträge, alle `labor-mini`).
  Eine falsche Antwort setzt die Einheit auf „heute fällig" und einen Kasten > 1 auf 1 zurück
  (`lernmotor.js:63`); eine richtige ohne Hilfe hebt den Kasten und schiebt das Intervall
  (gemessen: Kasten 2 → 3, fällig +7 Tage).
* **Die Mini-Auswahl ist echte Wiederholung nach Plan, kein Zufall** (Messung in § 3): fällige Fertigkeiten
  zuerst, dann häufige Fehler, dann die schwächsten — Zufall nur als Rest. 
* **Minis kosten nichts.** Lohn gibt es nur für richtige Antworten (`mini.js:104`); Hilfe und Fehlversuch
  kosten dort keinen Stern. Und: **Training zahlt nichts** und läuft trotzdem durch den Lernmotor und das
  Fehlerheft (`src/spiel/training.js:230` → `src/spiel/lernen.js:56,68`).

Alle Befunde stehen in § 6 priorisiert zusammen — **2× P1, 5× P2, 4× P3**. Die zwei wichtigsten in einem Satz:

1. **Der Vorrat bezahlt nichts.** Er sinkt sichtbar (6 → 0), aber der Sternabzug wird davon **nicht**
   berührt: Der Azubi verliert für seine sechs angeblich freien Hilfen 2 Sterne und 20 % Lohn. **(P1)**
2. **Hilfe wird nirgends je Sprosse und je Fertigkeit verbucht.** `inst.hilfen` trägt keine Fertigkeit,
   und die freien Sprossen 1–3 (Leiter, Werkzeug, Senior-Frage) sind für den Lernmotor **unsichtbar**:
   Eine Aufgabe, die mit der OSI-Checkliste gelöst wurde, steigt im Wiederholungsplan wie eine ohne. **(P1)**

---

## 1. Wird Hilfe bestraft?

**Behauptung.** Ja — und zwar genau dort, wo der Vertrag sie schützen wollte: Der Vorrat aus § 2.1
(6 freie Hilfen für `azubi`) ist eine **Anzeige ohne Zahlkraft**. Der Sternabzug richtet sich allein nach
`inst.hilfeStufe`.

**Beleg.**

* Vorrats-Rechnung: `src/spiel/stufensystem.js:94` (`gesamt` = `Spiel.HILFE_KONTO[azubi]` = 6) und
  `:96-100` (`frei` = `gesamt − inst.hilfen.length`).
* Sternabzug: `src/spiel/abnahme.js:51-54` — `h >= 4` → −0,5 · `h >= 5` → −0,5 · `h >= 6` → −1;
  `:61` — `Math.max(1, 5 − summe)`.
* Lohn: `src/spiel/abnahme.js:67` — `grund = lohn.euro × (0,5 + 0,1 × sterne)`; `:69` — Tempo-Bonus nur
  bei `hilfeStufe < 6`; `:70` — Ruf voll erst ab 3 Sternen.
* Wochenziel: `src/spiel/woche.js:9-10` („5 Aufträge **ohne Hilfe**" zählt `!e.hilfe`) mit
  `src/spiel/abnahme.js:117` (`hilfe: inst.hilfeStufe || 0` in `st.erledigt`).
* **Der Vorrat wird im Sternabzug nirgends gelesen**: `hilfenFrei` kommt im ganzen `src/` nur in
  `stufensystem.js:98` und `:174` vor, nicht in `abnahme.js`.

**Messung** (E-Ticket `salon-01`, Karrierestufe 1, sechs Hilfen gezogen):

| Sprosse gezogen | Konto danach | `inst.hilfen` | `hilfeStufe` |
|---|---|---|---|
| 1 | 5/6 | 1 | 1 |
| 3 | 3/6 | 3 | 3 |
| 4 | 2/6 | 4 | 4 |
| 6 | **0/6** | 6 | 6 |

Ergebnis am Ende: **3 Sterne** (Abzüge: „−0,5 Hilfe: Bereich markiert", „−0,5 Hilfe: konkreter Hinweis",
„−1 Hilfe: Lösung vorgeführt"), Lohn **24 €** statt **30 €** bei 5 Sternen (−20 %), Tempo-Bonus 0.
Ruf bleibt 1 (3 Sterne genügen), Wochenziel „ohne Hilfe": **0/5** — schon **eine** gezogene Sprosse nimmt
das Ticket aus der Wertung (gemessen: Hilfen 0 → 1/5, Hilfen 1 → 0/5, Hilfen 6 → 0/5).

**Wirkung auf den Lernenden.** Ein Azubi im 1. Lehrjahr ist der Einzige, der den Sechs-Vorrat bekommt —
und der Einzige, der die Sprossen 4–6 überhaupt braucht. Er zahlt für seinen kompletten Hilfeweg
2 Sterne, 6 € Lohn, den Tempo-Bonus und das Wochenziel; der Meister, dem gar keine Hilfe angeboten wird,
zahlt nie. Das ist eine **progressive Bestrafung der Hilfebedürftigen**: Wer am meisten Hilfe braucht, verliert
am meisten. Die absehbare Folge ist Meidung — und damit ist der Auftrag („Hilfe dorthin, wo er steht")
verfehlt. Nach Vertrag § 2.1 wäre die Rechnung: sechs Sprossen, alle vom Vorrat gedeckt → **5 Sterne**;
der Code liefert 3.

**Vorschlag.**
1. Den Vorrat als Währung behandeln: `Spiel.hilfe` (`src/spiel/hilfe.js:112-123`) ruft beim Freischalten
   `Spiel.stufe.hilfeZiehen(inst)`; die Funktion existiert bereits und markiert den Eintrag
   (`stufensystem.js:177-187`: `{stufe, frei: true, t}`).
2. `Spiel.sterneBerechnen` (`abnahme.js:49-61`) zieht nur für **nicht** gedeckte Sprossen ab — also
   `inst.hilfen.filter(h => !h.frei)` zählen statt `inst.hilfeStufe`.
3. Sichtbar machen, was passiert: Im Streifen steht bereits „noch 6 von 6 Hilfen" (`src/ui/hilfe.js:29`);
   beim letzten Freistück gehört dort „ab jetzt kostet es Sterne" — der Vertrag verlangt diesen Text
   ausdrücklich (§ 2.1: „Ein leerer Vorrat ändert nur den Text").
4. Das Wochenziel auf **bezahlte** Hilfe beziehen (`hilfe >= 4`) oder in „ohne Sternenkosten" umbenennen.
   Sonst bestraft es die kostenlose, ausdrücklich erwünschte Checkliste (§ 4, Befund P2-2).

**Priorität: P1.**

---

## 2. Der fehlende Zusammenhang: Hilfe → Fertigkeit → Wiederholung

**Behauptung.** Zwischen einer gezogenen Hilfe und der Fertigkeit, die geübt werden müsste, besteht
**kein durchgehender Datenweg**. Festgehalten wird die Hilfe nur am Ticket
(`inst.hilfen.push({stufe, t})`, `src/spiel/hilfe.js:116` — **ohne** `skill`); ausgewertet wird sie
später nur als **eine grobe Zahl** `inst.hilfeStufe ≥ 4`. Die einzelnen Sprossen — und damit die
kostenlosen, erwünschten Sprossen 1–3 — erreichen den Lernmotor nie.

**Beleg (die vollständige Kette).**

| Glied | Stelle | Was passiert |
|---|---|---|
| Hilfe ziehen | `src/ui/spiel.js:316` → `src/spiel/hilfe.js:112-123` | `hilfeStufe++`, `inst.hilfen.push({stufe, t})` — **kein** Fertigkeitsbezug |
| Vorrat | `src/spiel/stufensystem.js:96-100` | `frei = gesamt − inst.hilfen.length` (Anzeige) |
| Abnahme | `src/spiel/abnahme.js:51-54` | Sterne aus `hilfeStufe` (kein Fertigkeitsbezug) |
| Lernmotor (bestanden) | `src/spiel/lernen.js:54-56` | `hilfe = hilfeStufe >= 4` → `L.ueben(id, true, {hilfe})` — **binär**, je Ticket, für **alle** Fertigkeiten des Tickets gleich |
| Lernmotor (Sprosse 6) | `src/spiel/hilfe.js:161-164` | `L.ueben(id, false, {hilfe: true})` für alle Fertigkeiten — **binär** |
| Flow (je Fertigkeit) | `src/spiel/flow.js:25-27` | `hilfe >= 4` → „f"; zwei in Folge → Gerüst beim nächsten Auftrag |
| Wochenziel | `src/spiel/woche.js:9-10` | `!e.hilfe` — jede Sprosse zählt als Hilfe |

**Messung.** `L.ueben(id, true, {hilfe:true})` auf frischem Lernstand: Kasten **0 → 0**, fällig morgen;
mit `{hilfe:false}`: Kasten **0 → 1**, fällig morgen. Es gibt also genau **einen** Hebel — und er kennt
nur „≥ 4 ja/nein".

**Wirkung auf den Lernenden.**
* Wer die **kostenlose** Leiter (Sprosse 1, OSI-Checkliste) benutzt, wird im Wiederholungsplan wie ein
  Selbstlöser behandelt: Kasten +1, Intervall 1 → 3 → 7 Tage. Der Plan überschätzt damit genau bei den
  Anfängern die Beherrschung — die Wiederholung kommt zu spät, das Vergessen ist vorprogrammiert.
* Umgekehrt bekommt der Azubi für dieselbe Handlung am Ticket die volle Rechnung (Sterne, Lohn,
  Wochenziel, § 1) — **die Kosten sind fein, die Lernverbuchung ist grob.** Das ist die ungünstigste
  Kombination.
* Weil `inst.hilfen` keine Fertigkeit trägt, kann keine Auswertung später sagen: „Bei `lab.trunk` hast du
  dreimal die Bereichsmarkierung gebraucht." Diese Information ist heute nicht rekonstruierbar.

**Vorschlag (kleinster sinnvoller Schritt).**
1. `Spiel.hilfe(inst, {skill})` um den optionalen Fertigkeitsbezug erweitern und den Eintrag als
   `{stufe, skill: def.skills[0], frei, t}` schreiben (die Aufrufer kennen die Instanz, also auch `def`).
2. In `Spiel.lernenNachAbnahme` (`lernen.js:48-76`) **je Fertigkeit** entscheiden: `{hilfe: true}`, wenn zu
   dieser Fertigkeit eine Sprosse ≥ 4 gezogen wurde **oder** der Leitner-Kasten noch 0 ist und überhaupt
   eine Sprosse benutzt wurde. Die Sprossen 1–3 dürfen gern als „leichter Hinweis" gelten: Kasten nicht
   anheben, Wiederholung auf morgen — das ist die ehrliche Rückmeldung.
3. Optional die Hilfe als **Datenquelle für den nächsten Auftrag** nutzen: `Spiel.flow` hat den Kanal
   bereits (`flow.js:24-29`); statt „nur ≥ 4" könnte er die Sprossen Staffeln (1–3 → „n", 4–5 → „f",
   6 → „f" mit Gerüst).

**Priorität: P1** (Punkt 2 ist der Kern des Auftrags; Punkt 1 ist die Voraussetzung dafür).

---

## 3. Mini-Mails: Spaced Repetition oder Zufall?

**Behauptung.** Es **ist** Spaced Repetition — mit klarer Rangfolge und messbarer Herkunft. Der Zufall
spielt nur zwei Nebenrollen. Nach einer falschen Antwort ist die Wiederholung **garantiert**, aber nicht
immer die **nächste** Frage.

**Beleg.** `src/spiel/mini.js:44-67` (`naechstes`), Reihenfolge der Kandidaten `:52-57`:
Unterrichtsthema → `L.faelligeIds(...)` → `L.haeufigeFehler(14)` → freigegebene Fertigkeiten nach
schwächstem Kasten (`:56`) — dann `:58-62` die erste Fertigkeit mit einem noch nicht gezeigten Mini;
`:63-64` der Rest zufällig. „Nicht gezeigt" = die letzten 6 (`:61`, Fenster `s.zuletzt`).
`Spiel.mini.fuerSkill` (`:34-41`) wählt innerhalb der Fertigkeit bevorzugt ein frisches Mini, sonst
zufällig, aber deterministisch (`Zufall(skill + ":" + richtig + ":" + falsch + ":" + heute())`, `:40`).

**Messung** (je 12 Züge, `aktuell`/`zuletzt` geleert, echter Lernmotor):

| Fall | Ergebnis (12 Züge) |
|---|---|
| B1 drei fällige Fertigkeiten, kein Unterricht, keine Fehler | **12× fällig (SR)** |
| B2 Unterrichtsthema `lab.netz` (nicht fällig) | **12× Unterricht** |
| B3 nichts fällig, keine Fehler | **12× schwächste Fertigkeit** |
| B4 nichts fällig, häufige Fehler `lab.dhcp` (2×) und `lab.vlan` (1×) | **12× `lab.dhcp`** (häufigster Fehler zuerst) |
| B5 alle Kandidaten-Minis gesperrt | Rest-Zufall (`mini.js:63-64`) |

Der Anteil ist also **kein gemischtes Verhältnis, sondern 100 % der jeweils höchsten nicht-leeren
Klasse**. Der Zufall wirkt nur (a) bei der Restauswahl (B5) und (b) bei der Wahl *welches* Mini einer
Fertigkeit — nicht bei der Wahl der Fertigkeit.

**Nach einer falschen Antwort** (gemessen mit echtem Lernmotor, `_trocken = false`):

* Die Fertigkeit wird **heute fällig** (`u.due = heute`, `fremd/lernmotor.js:64`) und ein Kasten > 1 fällt
  auf 1 zurück (`:63`). Gemessen: `lab.dns` Kasten 2 → 1, `due = 2026-10-09` (= heute).
* Sie kommt zurück, sobald ihre Minis nicht mehr im Sechs-Fenster stehen: bei drei Minis also **nach
  frühestens 6 weiteren Zügen**; gemessen (nur `lab.dns` fällig): Züge 1–3 `lab.dns`, Zug 4–5 `lab.link`
  (Sperrfenster), dann wieder `lab.dns`.
* Bei **mehreren** gleichzeitig fälligen Fertigkeiten sortiert die Überfälligkeit: gemessen
  `dns, link, ip, dns, dns, link, link, dns` (2 von 7 Wechseln dieselbe Fertigkeit direkt danach).
* Jede falsche Antwort landet im Fehlerheft (`mini.js:102`): gemessen **8 von 8**.

**Wirkung auf den Lernenden.** Der Kern ist gut: fällige Fertigkeiten kommen zuerst, Fehler häufen sich,
und nichts wird zufällig verschenkt. Zwei Reibungen bleiben: (a) Wer sechs Züge lang dieselbe Fertigkeit
falsch hatte, sieht sie erst nach dem Sperrfenster wieder — für einen Anfänger ist das eine lange Lücke;
(b) die Restauswahl (`mini.js:63-64`) prüft `passtNiveau` **nicht** (anders als `fuerSkill`, `:38`), ein
E-Spieler kann dort ein AP2-Mini bekommen.

**Vorschlag.** Sperrfenster für **falsch** beantwortete Minis verkürzen (z. B. 3 statt 6) und die
Restauswahl auf `passtNiveau` filtern. Beides je eine Zeile in `mini.js`.

**Priorität: P3** (Feinschliff — die Auswahl selbst ist solide).

---

## 4. Der Anker: zeigt er auf die richtige Stelle?

**Behauptung.** Der Anker öffnet die **richtige Wiki-Seite** (je Fertigkeit), aber nicht den **Abschnitt**
und nicht die **Antwort auf die Frage**. Die Seite erklärt die Regel, nicht den Code, nach dem gefragt wurde.

**Beleg.** `src/spiel/mini.js:241-246` — `wiki = m.skill`, `titel = w.titel`, `text` = Merksatz der
Fertigkeitsseite; `src/ui/karriere.js:316` (`wikiOeffnen(skill)`) → `:297` (`wahl = K.wikiWahl` → diese
Seite wird angezeigt). Der Wiki-Datensatz hat die Felder `titel, kurz, abschnitte, merksatz, pruefungstipp,
quelle, belege, siehe` (`src/daten/wiki.js`).

**Messung an vier Minis:**

| Mini | Frage | Wiki-Seite | Kernbegriff der Frage/Erklärung auf der Seite? |
|---|---|---|---|
| `mini-link-1` | „Netzwerkkabel nicht angeschlossen" – was zuerst? | `lab.link` „Link und Kabel prüfen" | „Schicht 1" **ja** |
| `mini-ping-3` | Router-Ping zeigt „U.U.U" – was ist los? | `lab.ping` „Ping und Fehlermeldungen lesen" | „U.U.U" **NEIN** |
| `mini-ip-2` | Windows meldet Adresskonflikt – was passiert? | `lab.ip` „IP-Adresse und Maske setzen" | „Konflikt" **NEIN** (Merksatz: „Jede Adresse nur einmal vergeben …" — inhaltlich nah) |
| `mini-netz-1` | Liegen A und B im selben Netz? | `lab.netz` „Gleiches Netz? (Maske anwenden)" | „Netz" ja, „Oktett" **NEIN** (Merksatz trifft die Regel) |

**Wirkung auf den Lernenden.** Der Weg ist richtig (ein Klick von der Frage zur Erklärung der
dahinterliegenden Regel, mit belegter Quelle) — für `mini-ping-3` sucht der Azubi auf der Seite aber
vergeblich nach „U.U.U". Der Erklärtext zum Code steht im Bestand: `DATEN.lehrtexte.NO_ROUTE.AP2` nennt
„IOS ping: U.U.U" (`src/daten/lehrtexte.js:103`). Er wird nur nicht gezeigt.

**Vorschlag.** `Spiel.mini.anker` um einen Abschnitts-/Suchhinweis erweitern (`abschnitt` aus
`w.abschnitte`, Stichwort = Kernbegriff der Frage) und `UI.wiki.oeffnen(skill, {abschnitt})` diesen
Abschnitt aufklappen lassen. Wo der Code fehlt (`U.U.U`), gehört er in die Wiki-Seite — die Quelle
(`lehrtexte.NO_ROUTE`) hat ihn bereits.

**Priorität: P2.**

---

## 5. Trainingsbereich: Rückmeldung über „bestanden" hinaus?

**Behauptung.** Ja, aber die Erklärung fehlt — genau die, die es im normalen Auftrag gibt. Das ist ein
Befund an **meiner eigenen** Datei aus task-4.

**Beleg.** `src/ui/training.js:76-90` (`ergebnisKarte`): Bei einem Fehlversuch listet sie die offenen Ziele
mit `Spiel.grundTitel(e.grund)` (`:84`) — **Kurztitel**, keine Erklärung; bei Bestehen zeigt sie den
Lernstand je Fertigkeit (`:85-86`, aus `r.lernen`). Der Lernweg ist vollständig: `src/spiel/training.js:230`
ruft `Spiel.lernenNachAbnahme`, damit laufen `L.ueben` (`src/spiel/lernen.js:56`) und bei Fehlschlägen das
Fehlerheft (`lernen.js:68-73`) — gemessen in `tests/spiel-training.test.js`.
**Ungenutzt daneben:** `UI.erklaeren(code, niveau)` (`src/ui/erklaeren.js:7-23`) — der Erklär-Weg, den das
normale Ergebnis nutzt (`src/ui/spiel.js:455`) — und `Spiel.fehlschlaege(abnahme)` (`abnahme.js:79-90`),
das Gründe **je Fertigkeit** liefert.

**Wirkung auf den Lernenden.** Training ist der Ort, an dem man ohne Kunden und ohne Geldfolgen üben darf
— und dort bekommt der Azubi auf einen Fehlversuch nur „Ziel X – Grundtitel" zu sehen. Die ausführliche
Erklärung (Stufe für Stufe, mit Quelle) ist zwei Funktionsaufrufe entfernt. Das Training ist damit
**weniger lehrreich als ein fehlgeschlagener Kundenauftrag**, obwohl es keine Nachteile hat.

**Vorschlag.** In `ergebnisKarte` (a) je offenem Ziel `UI.erklaeren(e.grund, r.abnahme.niveau)` einhängen
(aufklappbar, wie im Ergebnisbildschirm) und (b) die Gründe über `Spiel.fehlschlaege(r.abnahme)` **je
Fertigkeit** gruppieren, statt sie einzeln aufzuzählen. Beides ändert nur die Ansicht, kein Modell.

**Priorität: P2.**

---

## 6. Befunde priorisiert

| # | Prio | Behauptung | Beleg | Vorschlag |
|---|---|---|---|---|
| P1-1 | **P1** | Der Vorrat bezahlt keine Sterne: 6 „freie" Hilfen kosten 2 Sterne, 20 % Lohn, Tempo-Bonus und Wochenziel | `stufensystem.js:94-100` vs. `abnahme.js:51-54,61,69`; `woche.js:9-10`; Messung § 1 | `Spiel.hilfe` ruft `stufe.hilfeZiehen`; `sterneBerechnen` zählt nur ungedeckte Sprossen; Text „ab jetzt kostet es Sterne" |
| P1-2 | **P1** | Hilfe wird nicht je Fertigkeit/Sprosse verbucht; Sprossen 1–3 sind für den Lernmotor unsichtbar, `inst.hilfen` trägt kein `skill` | `hilfe.js:116`; `lernen.js:54-56`; `flow.js:25-27`; Messung § 2 | `{stufe, skill, frei, t}` schreiben; `{hilfe:true}` je Fertigkeit entscheiden |
| P2-1 | **P2** | Die Mini-Denkhilfe ist fertigkeitsweit, nicht fragespezifisch: 6 `lab.ping`-Minis → derselbe Satz; Sprosse 2 wiederholt die Frage | `mini.js:192-196,198-204`; Messung § 3/§ 7 | Fragebezogenen Denkanstoß je Mini (Feld `denkhilfe`/`denkanstoss`) oder Sprosse 1 aus `m.erklaerung`-Bausteinen bauen |
| P2-2 | **P2** | Das Wochenziel „ohne Hilfe" zählt schon die **kostenlose** Checkliste mit | `woche.js:9-10`; `abnahme.js:117`; Messung § 1 | auf `hilfe >= 4` beziehen oder umbenennen („ohne Sternenkosten") |
| P2-3 | **P2** | Der Plan-Vergleich zieht automatisch Sprosse 4 und kostet still 0,5 Sterne | `ui/netzplan.js:128`; `abnahme.js:51-54` | Kosten vorher ansagen oder Sprosse 4 für dieses Werkzeug nicht werten |
| P2-4 | **P2** | Der Anker öffnet die Fertigkeitsseite, nicht den Abschnitt; Codes wie „U.U.U" fehlen dort | `mini.js:241-246`; `karriere.js:297,316`; Messung § 4 | Abschnitt/Stichwort mitgeben; fehlende Codes aus `lehrtexte` in die Wiki-Seite |
| P2-5 | **P2** | Das Trainingsergebnis zeigt keine Erklärung, obwohl `UI.erklaeren` und `Spiel.fehlschlaege` bereitliegen | `ui/training.js:84`; `ui/erklaeren.js:7`; `spiel.js:455` | Erklärung je offenem Ziel, Gründe je Fertigkeit |
| P3-1 | **P3** | `Spiel.stufe.hilfeZiehen` hat keinen Aufrufer im Programm; `ui/hilfe.js:25` behauptet das Gegenteil | `stufensystem.js:177`; nur Tests rufen es | aufrufen (siehe P1-1) oder entfernen und den Kommentar richtigstellen |
| P3-2 | **P3** | `Spiel.grundText` hat keinen Aufrufer; die Oberfläche nutzt `UI.erklaeren` | `lernen.js:101-107` | löschen oder in `UI.erklaeren` zusammenführen |
| P3-3 | **P3** | Sperrfenster 6 für falsch beantwortete Minis; Restauswahl ohne `passtNiveau` | `mini.js:61,63-64` | Fenster 3 für Fehler; Rest filtern |
| P3-4 | **P3** | Jedes Ticket bekommt den Azubi-Vorrat (6), unabhängig von Ticket- und Menschenstufe | `stufensystem.js:91-94` | bewusst so lassen, aber im Vertrag § 2.1 klarstellen |

---

## 7. Gegenprüfung der beiden Befunde des Leads

**Befund A — „Die Mini-Denkhilfe ist je Fertigkeit formuliert, nicht je Frage."**
**Bestätigt**, mit einer Präzisierung.

* Beleg: `src/spiel/mini.js:192-196` liest ausschließlich `m.skill` (`SENIOR_FRAGEN[m.skill]`,
  `WERKZEUGE[m.skill]`), nie `m.id` oder `m.frage`.
* Zahlen **unabhängig nachgemessen**: 92 Mini-Tickets, 27 Fertigkeiten, Minis je Fertigkeit 1/3/6
  (min/median/max); **26 von 27** Fertigkeiten haben mehrere Minis; nur `lab.storage` hat genau eines.
  Quelle der Denkhilfe: `SENIOR_FRAGEN` **13×**, `WERKZEUGE` **14×**, Rückfall **0×**. Alle Zahlen des
  Befunds stimmen.
* `lab.ping` hat **6** Minis; `SENIOR_FRAGEN[lab.ping]` ist leer, `WERKZEUGE[lab.ping]` liefert den
  Ping-Satz — gemessen bekommen alle sechs dieselbe Sprosse 1.
* **Präzisierung (mein Zusatz):** Es gibt eine **zweite** Sprosse, und die ist fragespezifisch
  (`miniAusschnitt`, `mini.js:198-204`: Schnappschuss oder erster Satz der Frage). Gemessen bei
  `mini-ping-1…4` lautet sie jeweils nur die Frage selbst („Der Router-Ping zeigt „U.U.U"."), bei
  `mini-cli-ping-2` ist es der Bildschirmausschnitt. Sie **erklärt** nichts, sie zitiert. Für `azubi`
  (zwei Sprossen, `mini.js:11,216`) heißt das: Hilfe 1 = fertigkeitsweiter Satz, Hilfe 2 = die Frage.
  Für `azubi-plus`/`geselle` (eine Sprosse) bleibt nur der fertigkeitsweite Satz.
* Wirkung: Wie vom Lead vermutet — bei `mini-ping-3` erklärt die Hilfe nicht „U.U.U", sondern wie man
  pingt. Der Lerneffekt kommt dann erst aus der **Erklärung nach der Antwort** (`mini.js:107`), die
  fragespezifisch ist. Deshalb bewerte ich den Befund als **P2**, nicht P1: die Frage bleibt lernbar, aber
  die Hilfe selbst hilft nicht.

**Befund B — „Der Vorrat ist eine reine Kostenbremse ohne Lernverbuchung."**
**Im Kern bestätigt, in zwei Punkten korrigiert.**

* Bestätigt: `sterneBerechnen` zieht −0,5 / −0,5 / −1 (`abnahme.js:51-54`) und deckelt bei 1 (`:61`);
  bei sechs Hilfen sind es genau `5 − 2 = 3` Sterne, der Deckel greift nicht (gemessen). Der Tempo-Bonus
  fällt bei `hilfeStufe ≥ 6` weg (`abnahme.js:69`, gelesen; im Messfall war `zeitMs = 0`, der Bonus wäre
  also ohnehin 0 gewesen — die Zeile ist der Beleg, nicht die Messung). Der Vorrat wird im Sternabzug
  **nicht** gelesen (`hilfenFrei` nur in `stufensystem.js:98,174`).
* **Korrektur 1:** „nur als `{hilfe:true}` beim Bestanden-Fall" — es gibt **zwei** Stellen:
  `lernen.js:56` (Abnahme, `hilfeStufe ≥ 4`) **und** `hilfe.js:161-164` (Sprosse 6 → `L.ueben(id, false,
  {hilfe:true})` für alle Fertigkeiten des Tickets). Beide sind binär und ohne Bezug auf einzelne
  `inst.hilfen`-Einträge — der Befund bleibt, die Zahl der Stellen ist zwei.
* **Korrektur 2 (Selbstkorrektur, siehe § 8):** Der Vorrat ist **kein toter Code in der Wirkung** — er
  sinkt sichtbar, weil `frei()` ihn aus `inst.hilfen.length` ableitet (`stufensystem.js:96-100`); gemessen
  6 → 0. Toter Code ist nur die *Funktion* `hilfeZiehen` (P3-1). Die treffende Formulierung lautet:
  **Der Vorrat ist eine Anzeige, keine Währung — er sinkt, aber er bezahlt nichts.**

---

## 8. Was ich zuerst falsch hatte (und wie ich es bemerkt habe)

1. **„Der Vorrat wird nie verbraucht."** Aus dem Quelltext geschlossen (kein Aufrufer von `hilfeZiehen`),
   dann **gemessen** — und die Messung zeigte 6 → 5 → … → 0. Ursache meines Fehlschlusses:
   `frei()` leitet den Verbrauch aus `inst.hilfen.length` ab (`stufensystem.js:96-100`); die Funktion
   `hilfeZiehen` ist nur ein zweiter, ungenutzter Weg. Ohne die Messung hätte ich einen P1-Befund
   gemeldet, den es nicht gibt.
2. **Erste Sonden brachen ab** (ein ASCII-Anführungszeichen im Probe-String, einmal ein `W` außerhalb des
   `vm`-Bereichs). Beides waren Fehler in meinen Sonden, nicht im Programm.
3. **Die erste Messung der Mini-Wiederholung war wertlos**: Ich hatte `Spiel._trocken = true` gesetzt,
   damit lief `L.ueben` gar nicht — die Spalte „L.due" zeigte unveränderte Startwerte. Nachgemessen mit
   `_trocken = false`; erst diese Zahlen stehen in § 3.

---

## 9. Grenzen dieser Prüfung

* **Kein Test mit Menschen.** Alle Aussagen sind Quelltext + deterministische Sonden; ob ein Azubi die
  Hilfe tatsächlich meidet, ist eine begründete Erwartung, keine Messung.
* **Kein Bildschirm.** Die Oberflächen-Aussagen stammen aus dem Quelltext (`ui/hilfe.js`, `ui/training.js`,
  `ui/netzplan.js`), nicht aus einem Browserlauf; in dieser Umgebung gibt es keinen Browser und kein CDP.
* **Ein Spielstand, ein Ticket, ein Tag.** Die Kostenmessung lief an `salon-01` (E-Ticket, 30 €) und das
  Verhältnis „−20 % Lohn" gilt für diesen Lohn; die Sterne-Rechnung ist lohnunabhängig.
* **Nicht geprüft:** Playbooks/Unterrichtsmodus als Lernweg, die Szenen nach der Abnahme, die
  Android-Fassung, und ob die Wiki-Seiten inhaltlich richtig sind (nur, ob sie die Begriffe der Frage
  enthalten).
