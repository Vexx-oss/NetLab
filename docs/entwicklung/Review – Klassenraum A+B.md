# 🔬 Review – Klassenraum A+B (task-35, unabhängige Gegenprüfung)

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Vertrag: [[Architektur]] § 12 · Spezifikation:
[[A – Codec und Determinismus]] · [[B – Oberfläche und Ablauf]] · Vorherige Prüfung: [[Review – 2.0-Fundament]]

> **Auftrag.** Wieder der WIDERSPRUCH: Codec, eingefrorene Tabellen, Determinismus, „Wirkung vor Grün",
> E1, Oberflächen-Regeln, Zeilenenden und der Abnahmebefehl — jede Aussage mit **eigenem** Befehl oder
> Experiment. Geändert wurde nichts außer dieser Datei.
>
> **Kernaussage in einem Satz.** Der Codec hält **jedes** dokumentierte Beispiel ein, mit **eigener**
> Arithmetik nachgerechnet (auch das ungültige `NL-4F7K-2Q`) · die eingefrorenen Tabellen stimmen
> **zeichengleich** mit `Spiel.ticketReihe()` und dem Beleg, und die Umsetzung fährt **27** Fertigkeiten,
> nicht 24 · E1 gilt (nicht im Postfach, aber spielbar), die Abnahme zahlt **0 €/0 Ruf/0 Einträge** ·
> alle **16** Schnittstellennamen haben einen Aufrufer — aber **zwei Kommentare und Dokument D sind
> veraltet**, und der dort genannte Abnahmebefehl liefert **0 Fälle** statt 40.

**Stand der Messung:** 09.10.2026, 16:31–16:5x · Arbeitsbaum nur gelesen · kein Produktivcode, keine fremden
Tests, kein schreibender git-Befehl, kein Prozess beendet · **Schreibrecht nur diese Datei** (so der Lead:
eigene Datei statt Nachtrag — die 2.0-Prüfung ist abgeschlossen und wird nicht mehr angerührt).

---

## 1 · Verfahren

Alle Laufzeitmessungen laufen in einem eigenen `vm`-Bereich mit **derselben Modulladung wie `tests/run.js`**
(90 Module, Schicht- und Alphabetreihenfolge). Es wurde **keine** Prüfdatei angelegt; die Programme wurden per
`node -e` übergeben. Für die Aufrufer- und Zeilenendenprüfung: `Select-String`, `git ls-files --eol`,
Byte-Vergleich, Index-Arithmetik (Verfahren aus [[SITZUNGSABSCHLUSS]] Schritt 6, in [[Review – 2.0-Fundament]] § 10.3 belegt).

---

## 2 · Der Codec gegen Dokument A — bestätigt, mit eigener Arithmetik

| Behauptung (Dokument A) | Wie geprüft | Ergebnis |
|---|---|---|
| Alphabet: 32 Zeichen, kein `I`, `O`, `0`, `1` | `KlassenraumCodec.ALPHABET` gelesen | `"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"`, Länge **32**, **eindeutig**, **keines** der vier Zeichen enthalten · `BASIS = 32` |
| Prüfsummen: `C1` Gewichte 1,2,3,… **mod 31**; `C2` Gewichte 1,3,5,… **mod 32** | eigene Rechnung neben `pruefsummen()` | s. u. — **stimmt in allen Fällen** |
| `NL-HC3L-CS` gültig | `auftragLesen` + eigene Rechnung | Werte `[7,2,25,10]` → C1 = 126 mod 31 = **2** → `C`; C2 = 208 mod 32 = **16** → `S`. Codec liefert `CS`. **gleich** ✓ |
| `NL-WTQJ-EF` gültig | dito | Werte `[20,17,14,8]` → C1 = 128 mod 31 = **4** → `E`; C2 = 197 mod 32 = **5** → `F` ✓ |
| `E-KFWS-HZM` = Sitzung 9, Platz 5, 5 Sterne, 1 Fehlversuch, 70 s | `ergebnisLesen` **und** `ergebnisBauen({sitzung:9, platz:5, sterne:5, versuche:1, dauerS:70})` | gelesen: `{sitzung:9, platz:5, sterne:5, versuche:1, dauerS:70}`; gebaut: **`E-KFWS-HZM`** — **Zeichen für Zeichen gleich** ✓ |
| Nutzzeichen des Ergebniscodes `KFWSH`, Prüfzeichen `ZM` | eigene Rechnung | Werte `[9,5,20,16,7]` → C1 = 178 mod 31 = **23** → `Z`; C2 = 299 mod 32 = **11** → `M`. **gleich** ✓ |
| **`NL-4F7K-2Q` ist ungültig** | `auftragLesen("NL-4F7K-2Q")` | `{ok:false, fehler:"prüfziffer", grund:"Die Prüfziffer passt nicht – hast du dich vertippt?"}` — **abgewiesen** ✓ |
| richtig wäre `NL-4F7K-E3` | `auftragLesen("NL-4F7K-E3")` | `ok:true`, Sitzung 26, Index 23, Variante 169 ✓ |
| Rundlauf Auftragscode | `auftragLesen("NL-HC3L-CS")` → `{7, 11, 42, art:"hand"}`, damit `auftragBauen(...)` | ergibt **`NL-HC3L-CS`** ✓ |

**Zwei Fehlversuche auf meiner Seite, ausdrücklich genannt** (sie gehören zur Wahrheit dieser Prüfung):

1. `auftragBauen({sitzung:7, index:11, variante:42})` lieferte **`null`** — ich hielt das kurz für eine
   Asymmetrie. Der Blick in den Quelltext zeigt: `art` ist ein **Pflichtfeld** (`klassenraum-codec.js:99-100`,
   `f.art === "hand" ? 0 : f.art === "generiert" ? 1 : ganz(f.art, 1)`). Mit `art` ist der Rundlauf grün.
2. `ergebnisBauen({sitzung:9, platz:5, sterne:5, **fehlversuche**:1, **sekunden**:70})` lieferte
   `E-KFWA-AT6` — für einen Moment sah das nach „Dokument und Code widersprechen sich" aus. Die Feldnamen
   heißen aber `versuche` und `dauerS` (`:174-175`). Mit den richtigen Namen kommt **genau das dokumentierte**
   `E-KFWS-HZM` heraus. **Kein Befund** — mein Fehler, und ich hätte ihn fast als Befund gemeldet.

---

## 3 · Die eingefrorenen Tabellen — zeichengleich, und die Umsetzung fährt 27

| Behauptung | Wie geprüft | Ergebnis |
|---|---|---|
| 58 Auftrags-IDs in `Spiel.ticketReihe()`-Reihenfolge | `JSON.stringify(Spiel.ticketReihe().map(id))` gegen `Nachweise/Klassenraum/A-tabelle.json` → `auftraege[].id` | **zeichengleich** ✓ (58 = 58) |
| `TABELLE_AUFTRAEGE_LAENGE` | Quelltext `klassenraum-codec.js:50` | **58** ✓ |
| 27 Fertigkeiten, Reihenfolge wie `DATEN.skills` | `tabellen({ticketIds, skillIds})` gegen den Beleg | **zeichengleich** ✓ (27 = 27) · `TABELLE_SKILLS_LAENGE = 27` ✓ |
| Beleg trägt 24 `tauglich: true`, 3 `false` | `A-tabelle.json` → `skills` | **bestätigt**: 27 Einträge, **24 tauglich** (Stand vor task-5) |
| Die Leitung hat **27** entschieden | `tauglicheFertigkeiten()` mit den echten Listen | **27**, `nichtTauglich: []` — die Umsetzung fährt die Entscheidung ✓ |
| Die Abweichung ist dokumentiert | `docs/Architektur.md:878` | **belegt**, wörtlich: „**L2** | `plaetze` … " bzw. die Zeile zur Tauglichkeit; und `tests/klassenraum-codec.test.js:257-260` sagt ausdrücklich: „A § 3.3 nennt ‚24 von 27' — das ist ÜBERHOLT: seit task-5 … gehören deshalb alle auf true", mit `erwarte.gleich(T.tauglicheFertigkeiten().length, 27, …)` |

### Befund **K1 — zwei lebende Kommentare sagen weiter „24 von 27"**

* `src/spiel/klassenraum-codec.js:297`: „§ 3.3: nur die Fertigkeiten mit Injektor dürfen angeboten werden (**24 von 27**)."
* `src/spiel/klassenraum.js:32`: „… dort **24 von 27**)."

Beide Stellen stehen **im Produktivcode**, nicht in einer Protokollnotiz. Die Zahl ist seit task-5 falsch
(gemessen: 27). Der Lead hatte genau danach gefragt („wenn irgendwo noch 24 steht, ist das ein Befund").
**Restzweifel:** In den **Dokumenten** (A § 3.3, § 8, § 9) steht 24 weiterhin — das sind Protokolle des
damaligen Standes und laut Projektregel nicht nachzuziehen; ich werte sie **nicht** als Befund.

---

## 4 · Determinismus über den echten Weg — bestätigt

Nachgestellt wie die Oberfläche es tut (`src/ui/klassenraum.js:312-315`): `ausCode` → `instanzErstellen`
mit `{ticketId|skill, seed, quelle:"klassenraum", ohneFlow:true}`.

| Messung | Ergebnis |
|---|---|
| `ausCode("NL-HC3L-CS")` | `{sitzung:7, ticketId:"baeckerei-hotline", seed:43, code:"NL-HC3L-CS"}` — der Code kommt **kanonisch** zurück |
| zwei „Geräte": frischer Stand vs. Stand mit `st.flow["lab.vlan"].stand = "verwicklung"` | `def.id` **beide Male `baeckerei-hotline`** → **derselbe Auftrag** ✓ |
| Code auf beiden Geräten | **identisch** ✓ |

Verglichen wurde `def.id` — nicht der Netzkennwert, wie von E8 verlangt. **Restzweifel:** zwei Zustände sind
kein Beweis für alle; ich habe genau die zwei Stellen variiert, die laut Fahrplan § 2.4 den Unterschied
machten (Flow-Stand), nicht die Sitzungs-/Platzwerte.

---

## 5 · „Wirkung vor Grün": **alle 16** Namen haben einen Aufrufer

Die Schnittstelle hat **16** Namen, nicht elf — `docs/Architektur.md:885-886` erklärt das selbst („die **elf**
Funktionen der Vertragstabelle § 12 + `plaetze`/`plaetzeSetzen` nach L6 + das vorhandene `abnehmen` + die
Prüffläche `tabellen()` — zusammen **16 Namen**"). Meine Messung von `Object.keys(Spiel.klassenraum)` ergibt
**genau diese 16**.

| Name | Aufrufer in `src/` (ohne Definition) |
|---|---|
| `erzeugen`, `ausCode`, `ergebnisCode`, `ergebnisEintragen`, `netzkennwert`, `platzSetzen`, `plaetze`, `plaetzeSetzen` | **`src/ui/klassenraum.js`** (über `ruf("…")`, z. B. `:93`, `:164`, `:187`, `:217`, `:295`, `:302`, `:356`) |
| `exportieren`, `importieren` | `src/ui/klassenraum.js` **und** `src/ui/karriere.js` |
| `tauglicheFertigkeiten`, `platz`, `tabellen`, `ausCode` | zusätzlich `src/spiel/klassenraum.js` |
| `ergebnisLesen` | `src/spiel/klassenraum.js` |
| `abnehmen` | `src/spiel/abnahme.js`, `src/ui/klassenraum.js`, `src/ui/training.js` |

**Zwei Fallen, die ich selbst getreten bin — und die ein oberflächlicher Prüfer übersieht:**

1. Mein **erster** Aufruferscan suchte nur `\.name` und meldete für `erzeugen`, `ergebnisCode`,
   `ergebnisEintragen`, `netzkennwert`, `platzSetzen`, `plaetzeSetzen` **„kein Aufrufer"**. Das war
   **falsch**: die Oberfläche ruft die API über einen Namensverteiler (`ruf("…")`), die Namen stehen als
   **Zeichenketten**. Der zweite Scan (auch `"name"` und `'name'`) findet für **jeden** der 16 einen Aufrufer.
2. Ein Aufrufer **in einer Testdatei** zählt nicht. Ich habe `src/` und `tests/` getrennt gezählt; alle
   16 haben mindestens einen `src/`-Aufrufer.

**Was ich damit _nicht_ belegt habe:** dass der Weg im Browser auch **anklickbar** ist (kein Browser, § 12).

---

## 6 · E1 gilt — gemessen, nicht zitiert

Frischer Stand, Klassenraum-Auftrag über den echten Weg (`ausCode` → `instanzErstellen` → `inst.klassenraum`):

| Frage (E1) | Messung |
|---|---|
| im Postfach? | **nein** — `postfach().some(x => x.iid === inst.iid) === false` |
| im Offen-Zähler? | **nein** — `Spiel.offen() === 0` |
| trotzdem spielbar? | **ja** — `Spiel.instanz(iid)` vorhanden, `Spiel.oeffnen(iid)` ohne Wurf, `Spiel.aktiveInstanz() === iid` |

**Restzweifel, ehrlich:** mein frischer Stand hatte ein **leeres** Postfach (`postfachLaenge: 0`), weil
`Spiel.leererStand()` es nicht füllt. Der Beweis „nicht im Postfach" ruht daher auf dem **iid-Vergleich**,
nicht auf der Länge. Die Kachel „Heute" und der **Ereignistakt** habe ich **nicht** gemessen — die gehören in
Phase 2 (die Taktprüfung braucht virtuelle Zeit über `Spiel.ereignisse`).

---

## 7 · Keine Bewertung — bestätigt

Klassenraum-Auftrag gelöst und abgeschlossen (`Spiel.loesung` → `Spiel.arbeitszieleErfuellen` →
`Spiel.abnahme` → `Spiel.abschliessen`):

```
bestanden: true   ΔEuro: 0   ΔRuf: 0   Δst.erledigt: 0   note: null
```

Kein Geld, kein Ruf, kein Karriere-Eintrag, keine Note. **Restzweifel:** „kein Hilfe-Feld" im
Ergebnis-Code habe ich nicht einzeln geprüft; der Feldkatalog des Codes ist nach Dokument A § 6.1
`{sitzung, platz, sterne, versuche, dauerS}` plus Prüfzeichen — gemessen über `ergebnisLesen`
(Felder u. a. `nutzzeichen`, `prüfzeichen`, `C1`, `C2`), **kein** Namens- oder Hilfefeld.

---

## 8 · Die Sitzung: 15 Felder — die 14 plus `plaetze`, kein Namensfeld

`Spiel.klassenraum.erzeugen({ticketId:"salon-01"})` → Sitzung mit **15** Feldern, gemessen:

```
id · titel · art · ticketId · skill · index · variante · seed · eigene · schritte ·
code · dauerMin · plaetze · erstellt · ergebnisse
```

* **`plaetze` ist dabei** (Wert `0` = „nicht eingestellt", § L6) — die 14 dokumentierten plus die Ergänzung.
* **Kein Namensfeld**: `Object.keys(...).filter(k => /name|schueler|azubi/i.test(k))` ergibt **`[]`** ✓ (DoD 11).
* Die Ergänzung ist **im Code** begründet (`src/spiel/klassenraum.js:34-35`: „Leitungsentscheidung L6, bewusst
  gegen A § 7.1, das ‚genau diese 14 Felder' sagt") und **im Vertrag** (`docs/Architektur.md:878`: „**`plaetze`
  kommt dazu** … Die Ampel der Lehrkraft braucht den Nenner"). **Beides belegt.**

**Restzweifel:** Die 14 Dokumentfelder habe ich **nicht** Namen für Namen gegen A § 7.1 aufgelistet
(die Tabelle liegt um `:696-702`); ich habe gezählt (15 − `plaetze` = 14) und die Namensliste auf
Vollständigkeit der naheliegenden Felder geprüft. Ein einzelnes fehlendes Dokumentfeld wäre mir dabei
entgangen.

---

## 9 · Oberfläche, CSS, Testrahmen

| Prüfung | Befehl | Ergebnis |
|---|---|---|
| jede neue `kl-`Klasse hat eine CSS-Regel | `python tools/klassen.py` | **0 Klassen ohne CSS-Regel** ✓ |
| Zeitwerte nur 1/160/320 ms | `python tools/ethos.py` | **GRÜN** (29 CSS-Dateien, keine Regel schlechter als der Stand) ✓ |
| kein zweites `toUpperCase` im UI | `Select-String src\ui\*.js` | **genau ein** Treffer: `src/ui/inspektor.js:393` — **vorbestehend**, **nicht** in `src/ui/klassenraum.js` ✓ |
| `erwarte.wirftNicht` existiert nicht | Suche in `tests/*.js` | **0 Treffer** ✓ |
| **keine Zusicherung im Gruppenrumpf** (Exit-2-Falle) | **alle** Testdateien in einem Bereich geladen, `testsAusfuehren()` **nicht** gerufen | **kein LADEFEHLER** — alle Gruppenrümpfe laufen durch ✓ · **661** Testfälle registriert |
| ≤ 6 bzw. ≤ 3 sichtbare Bedienelemente (R12) | **nicht gemessen** | steht unter § 12 |
| Escape schließt jeden Dialog | **nicht gemessen** | steht unter § 12 |

---

## 10 · Der Abnahmebefehl — Dokument D irrt, die Zahl ist **67**

| Behauptung (Dokument D) | Wie geprüft | Ergebnis |
|---|---|---|
| `node tests/run.js --klassenraum` → 40/40 | Testnamen im geladenen Bereich gezählt (Filter wirkt in `tests/run.js:60` auf `e.name.toLowerCase()`) | **0 Fälle** — die führenden Striche treffen keinen Namen. `0/0 grün`. **bestätigt: der Befehl ist unbrauchbar** |
| der richtige Befehl und die echte Fallzahl | dito | **`node tests/run.js klassenraum`** → **67 Fälle** (Groß-/Kleinschreibung egal, `run.js` vergleicht klein) |
| Gesamtumfang | dito | **661** registrierte Testfälle — deckt sich mit der Leitungsangabe „657/661" |

**Befund K2:** In Dokument D steht ein Befehl, der **null** Fälle prüft, und eine Zahl (40), die **nicht** die
Fallzahl dieses Filters ist. Wer ihn benutzt, sieht `0/0 grün` und hält das für Erfolg — dieselbe Bauart wie
der DHCP-Pool-Modus: grün, aber ohne Wirkung.

---

## 11 · Zeilenenden

`git ls-files --eol` führt nur die **verfolgten** Dateien; die fünf neuen sind noch `??` und erscheinen dort
nicht. Gemessen:

| Datei | `git ls-files --eol` | Urteil |
|---|---|---|
| `src/spiel/klassenraum.js` | `i/lf w/lf attr/text=auto eol=lf` | **LF** ✓ |
| `src/spiel/zustand.js` (geändert, +1 Zeile) | `i/lf **w/crlf**` | Verdacht — **entlastet**: `zustand.js` stand schon in der CRLF-Liste der ersten Messung um 15:20, **vor** der Änderung |
| `src/spiel/klassenraum-codec.js`, `src/ui/klassenraum.js`, `src/stil/klassenraum.css` (+ die vier Testdateien) | untracked | **alle LF, 0 CRLF** ✓ — Byte-Zählung unten |

**Byte-Zählung der neuen Dateien (0 CRLF in jeder):**

| Datei | Zeilen | Bytes |
|---|---|---|
| `src/spiel/klassenraum.js` | 392 | 26 295 |
| `src/spiel/klassenraum-codec.js` | 311 | 18 692 |
| `src/ui/klassenraum.js` | 400 | 25 550 |
| `src/stil/klassenraum.css` | 59 | 4 401 |
| `tests/klassenraum-codec.test.js` | 352 | 26 792 |
| `tests/klassenraum.test.js` | 285 | 20 326 |
| `tests/ui-klassenraum.test.js` | 405 | 25 735 |
| `tests/klassenraum-abnahme.test.js` | 331 | 23 034 |

**Index-Arithmetik für `src/spiel/zustand.js`:** HEAD **12 032 B** + **215** Zeilen = **12 247** = Index-Statistik
**12 247** → die Datei war **schon vor** der Änderung CRLF (dieselbe Rechnung wie in
[[Review – 2.0-Fundament]] § 10.3). **Ergebnis: kein Zeilenenden-Bruch in dieser Runde.**

**Restzweifel:** Der Byte-Vergleich belegt den **jetzigen** Zustand; für die fünf untracked Dateien gibt es
keinen HEAD-Vergleich. Für `zustand.js` ist die Index-Statistik ein Indizienbeweis (Zustand beim letzten
Git-Zugriff), kein lückenloser Verlauf.

---

## 12 · Nicht gemessen (Pflichtabschnitt)

* **Kein Browser, kein Bildschirmfoto, kein echtes Edge-Profil.** Kein `python bauen.py`, kein `tools/rauch.py`,
  kein `menueprobe.py`, kein `seite-pruefen.py`. Aussagen über die **sichtbare** Oberfläche (Knöpfe, Dialoge,
  Escape, ≤ 6/≤ 3 Bedienelemente) beruhen **nicht** auf meiner Messung.
* **Die Kachel „Heute" und der Ereignistakt** für einen Klassenraum-Auftrag (§ 6).
* **Die 14 Dokumentfelder** Name für Name gegen A § 7.1 (§ 8).
* **Der volle Testlauf** nach dieser Runde — die 661/657-Zahl der Leitung habe ich über die **registrierten**
  Namen bestätigt, nicht über einen eigenen Vollschnitt.
* **Die vier Testdateien der beiden laufenden Bausteine** — `determinismus` und `uebergabe-ui` waren zum
  Messzeitpunkt noch nicht fertig gemeldet; ihre Zahlen sind **nicht** nachgezählt.
* **Byte-Vergleich/Index-Arithmetik** der neuen Dateien (§ 11).

---

## 13 · Befunde an den Lead (kurz)

| Nr. | Befund | Ort | Schwere |
|---|---|---|---|
| **K1** | zwei **lebende** Kommentare sagen „24 von 27", gemessen sind es **27** | `src/spiel/klassenraum-codec.js:297`, `src/spiel/klassenraum.js:32` | klein (Text), aber irreführend |
| **K2** | Abnahmebefehl in Dokument D prüft **0** Fälle; richtig ist `node tests/run.js klassenraum` → **67** | Dokument D | mittel — „grün ohne Wirkung" |
| – | Codec, Tabellen, Determinismus, E1, keine Bewertung, 16 Aufrufer, `klassen.py`, `ethos.py`, Testrahmen | – | **bestätigt** |
