---
tags: [FISI, Lernspiel, Netzwerk, Klassenraum]
erstellt: 2026-10-06
aktualisiert: 2026-10-06
status: Entwurf zur Abnahme (Bereich B)
---

# B · Oberfläche und Ablauf (Bereich B des Auftrags „Klassenraum")

Stand: 2026-10-06, Zweig `ausbau-1.2`, nichts committet, nichts gepusht.
Grundlage: [`tools/auftraege/KLASSENRAUM.md`](../../../tools/auftraege/KLASSENRAUM.md) (der Auftrag),
[`tools/auftraege/COMMON.md`](../../../tools/auftraege/COMMON.md), [`AGENTS.md`](../../../AGENTS.md),
[`A – Codec und Determinismus.md`](A%20%E2%80%93%20Codec%20und%20Determinismus.md) (Bereich A),
[`D – Prüfung, Abnahme und Reihenfolge.md`](D%20%E2%80%93%20Pr%C3%BCfung,%20Abnahme%20und%20Reihenfolge.md).

**Was hier steht:** die verbindliche Festlegung für Ansichten, DOM, Klassennamen, Texte, Startseiten-Eingabe,
Beamer-Lesbarkeit, Ablauf des Klassenraum-Auftrags, Ergebnis-Code, Lehrer-Eingabe, Ampel, Export/Import und
den Server-Schalter – jede Festlegung mit `Datei:Zeile`-Beleg.

**Belege:** [`Nachweise/Klassenraum/B-ui.md`](../../../Nachweise/Klassenraum/B-ui.md) (Klassenliste, Tokens,
Rauchtest-Analyse, Lesbarkeitsrechnung, Textliste, Belegverzeichnis).
**Entwürfe und Gegenprüfungen:** `Nachweise/Klassenraum/B-ansichten.md`, `B-texte-ablauf.md`,
`B-ampel-eingabe.md`, `B-gegenpruefung.md`, `B-gegenpruefung-dom-css-tokens.md`,
`B-gegenpruefung-ampel-export.md`.

**Dieses Dokument legt fest, es baut nicht.** Änderungen an `src/**`, `tests/**`, `tools/*.py` und
`bauen.py` sind in dieser Sitzung nicht gemacht worden (Regel aus `Liesmich.md:29-30`).
**Bezugsstand von Bereich A:** `A – Codec und Determinismus.md`, 51.843 Bytes, 822 Zeilen,
geändert 06.10.2026 23:53:41 – alle A-Belege wurden darauf nachgezogen.

## 0 · Die drei Entscheidungen, die alles andere bestimmen

| # | Entscheidung | Warum | Beleg |
|---|---|---|---|
| E1 | **Zwei Ansichten**, nicht ein Umschalter: `klassenraum` (Lehrkraft) und `mitarbeit` (Schülerin) | Die beiden Rollen teilen keine Daten: die Schüleransicht darf keine fremden Ergebnisse im DOM haben. Der Auftrag nennt ohnehin „zwei Ansichten" (`KLASSENRAUM.md:19`). Nebenwirkung: zwei Andock-Knöpfe (Abschnitt 1.3) | `KLASSENRAUM.md:19` |
| E2 | Der **Klassenraum-Auftrag zählt nicht zur Karriere** (kein `st.erledigt`, kein Lohn, kein Ruf) | Ein Schulrechner hat einen fremden oder gar keinen Spielstand; ein Auftrag, der Lohn und Karriere verschiebt, wäre auf jedem Gerät ein anderer Eingriff. Der Auftrag verlangt „kein Unterschied im Spielgefühl" (`KLASSENRAUM.md:43`), nicht „keine Wirkung im Spielstand" – die Wirkung wird hier ausdrücklich ausgeschlossen | `KLASSENRAUM.md:43`; Ist-Wirkung in `src/spiel/abnahme.js:117`, `:132` |
| E3 | Der **Klassenraum-Abdruck** (Netzkennwert, 6 Zeichen) steht in **beiden** Ansichten, berechnet aus dem **tatsächlich geladenen Netz** | Nur so beweist die Vorführung „gleiche Geräte, gleiche Adressen, gleiche Fehlerstelle" (`KLASSENRAUM.md:54`). Aus dem Code gerechnet wäre der Vergleich wertlos (er zeigte nur, dass zweimal derselbe Code gelesen wurde) | Kennwert-Algorithmus: `A – Codec und Determinismus.md:395-438`; geladenes Netz: `UI.labor.laden` (`src/ui/editor.js:783`) ← `Spiel.oeffnen` (`src/spiel/ticket.js:41-58`) |

E2 ist die einzige Festlegung, die **fremden Code berührt** (Vorschlag, keine Änderung, siehe Abschnitt 6.4).

---

## 1 · Registrierung der Ansichten

### 1.1 Die echte Signatur

```js
/* src/ui/app.js:3 */
UI.app.registrieren(name, {titel, symbol, zeigen(container), wieder?(container), verlassen?(), zaehler?()})
```

Der Rumpf (`src/ui/app.js:57-63`) füllt fehlende Felder mit `{name, titel: name, symbol: "info"}`
(`src/ui/app.js:60`) und hängt die Ansicht in die Karte `ansichten`; ein zweiter Aufruf mit demselben Namen
ersetzt die alte Ansicht und baut sie neu auf (`src/ui/app.js:61`).

* `titel` – Beschriftung im Andock-Knopf und in der Befehlspalette (`src/ui/app.js:106-107`).
* `symbol` – **Name** aus der Symbol-Liste in `src/ui/geraetebilder.js:67-116`; ein unbekannter Name fällt
  still auf `info` zurück (`src/ui/geraetebilder.js:120`).
* `zeigen(container)` – baut das DOM der Ansicht; der Rahmen legt es in `div.ansicht` mit
  `data-ansicht="<name>"` (`src/ui/app.js:95`).
* `wieder(container)` – wird nur gerufen, wenn der Knoten schon existiert (`src/ui/app.js:98`).
* `verlassen()` – wird vor dem Ansichtswechsel gerufen (`src/ui/app.js:88`), ebenso beim Abbau der
  Vollansicht (`src/ui/app.js:235`).
* `zaehler()` – Zahl am Andock-Knopf, in `try/catch` gelesen (`src/ui/app.js:117-118`).

### 1.2 Anmeldung und Reihenfolge

Beide Ansichten melden sich in **einem** Start-Haken an – dasselbe Muster wie `Heute`
(`src/ui/hub.js:170-173`), `Postfach` (`src/ui/spiel.js:842-845`) und die Karriere-Ansichten
(`src/ui/karriere.js:475-479`):

```js
/* src/ui/klassenraum.js (neu), am Dateiende */
(UI.startHaken ||= []).push(() => {
  UI.app.registrieren("klassenraum", {titel: "Klasse", symbol: "kunden", zeigen: lehrerZeigen, wieder: lehrerWieder});
  UI.app.registrieren("mitarbeit",   {titel: "Auftrag", symbol: "akte",   zeigen: schuelerZeigen, wieder: schuelerWieder});
  UI.app.einstellungAbschnitt("Klassenraum", klassenraumAbschnitt);   /* Abschnitt 11 */
  Spiel.klassenraum.tauglicheFertigkeiten?.();                        /* nur, wenn A die Zusatzfunktion liefert */
});
```

* **Dateiname** `src/ui/klassenraum.js` (Auftrag `KLASSENRAUM.md:19`). Der Bau lädt in einem Ordner erst die
  Kopfdatei, dann alphabetisch, und hängt nur `app.js`/`start.js` ans Ende (`COMMON.md:7`,
  `bauen.py:60-61`); `klassenraum.js` liegt damit zwischen `karriere.js` und `klang.js` und **vor** `spiel.js`.
  Für den Testlauf gilt dasselbe (`tests/run.js:32-34`): **alle** `.js` des Ordners werden geladen, `SCHICHTEN`
  bestimmt nur Kopf- und Schlussdateien (`tests/run.js:25`). Eine Ergänzung von `tests/run.js` ist **nicht**
  nötig – die entgegenstehende Vermutung aus `B-ansichten.md` ist in `B-gegenpruefung.md` widerlegt.
* **Reihenfolge im Haken:** `klassenraum` zuerst, dann `mitarbeit`. Der Rahmen ruft die Haken in
  Eintragsreihenfolge (`src/ui/start.js:49`), und `UI.modus("voll")` kommt erst danach (`src/ui/start.js:58`) –
  beim ersten `dockZeichnen()` (`src/ui/app.js:227`) stehen beide Knöpfe also schon.
* **Symbolnamen** (beide existieren, keine Erfindung): `kunden` = `src/ui/geraetebilder.js:71`,
  `akte` = `src/ui/geraetebilder.js:115`. `labor` (`:70`), `heute` (`:69`), `postfach` (`:68`),
  `wiki` (`:72`), `lernstand` (`:73`), `shop` (`:74`) sind besetzt; `klassenraum` und `mitarbeit` sind
  **keine** Symbolnamen.

### 1.3 Wo sie in der Andock-Leiste stehen – und warum dort

`REIHE` (`src/ui/app.js:21`) bleibt **unangetastet**:

```js
const REIHE = ["heute", "postfach", "labor", "kunden", "wiki", "lernstand", "shop"];
```

`liste()` liefert zuerst die Namen aus `REIHE`, die es gibt, **dann alle übrigen in Anmeldeordnung**
(`src/ui/app.js:79-82`). Ergebnis:

```
heute · postfach · labor · kunden · wiki · lernstand · shop · klasse · auftrag
```

**Warum hinten?** Der Klassenraum ist Vorführ-Ebene, nicht Alltagsweg: der Auftrag nennt ihn ausdrücklich
„Novelty-Ebene" (`KLASSENRAUM.md:1`) und „die Vorführung, nicht das Geschäft" (`KLASSENRAUM.md:7`). Eine
Schülerin arbeitet über die Startseiten-Eingabezeile (Abschnitt 4) oder über die Palette; beide Ansichten
sind über `Strg+K` erreichbar, weil die Palette ihre Einträge aus `UI.app.liste()` baut
(`src/ui/palette.js:47`).

**Andock-Platz gerechnet:** Der Andock-Streifen rollt selbst (`overflow-y:auto`, `src/stil/rahmen.css:40`),
ein Knopf ist mindestens 58 px hoch, der Abstand 4 px, das Polster oben und unten 10 px
(`src/stil/rahmen.css:40-41`).

| Einträge | Bedarf | verfügbar bei 768 px Höhe | verfügbar bei 640 px Höhe |
|---|---|---|---|
| 7 (heute) | 7·58 + 6·4 + 20 = **450 px** | 768 − 54 (`--kopf-h`, `src/stil/basis.css:42`) = 714 px | 640 − 54 = 586 px |
| 9 (+2) | 9·58 + 8·4 + 20 = **574 px** | 714 px → passt | 586 px → passt mit 12 px Reserve |

Bei 600 px Fensterhöhe (546 px verfügbar) rollt der Streifen – das ist der bestehende Zustand des
Andock-Streifens, keine neue Last. Der Rauchtest prüft bei 1366/768, 960/700 und 720/640
(`tools/rauch.py:45`); bei 700 bzw. 640 px Höhe bleibt es bei 574 gegen 646 bzw. 586 px.

### 1.4 Kein Zähler

`zaehler` wird **nicht** gesetzt. Ein Zähler müsste den Spielstand lesen (`Spiel.ungelesen()`,
`src/ui/spiel.js:844`) und würde die Klassenraum-Ansicht an die Karriere koppeln – die Sitzung liegt aber in
`store "klassenraum"` (`KLASSENRAUM.md:40`, Datenschema `A – Codec und Determinismus.md:671-688`).

---

## 2 · DOM-Struktur, Klassennamen, Tokens

Gebaut wird ausschließlich mit `h()`/`$(…)` aus `src/ui/dom.js`: `class` setzt `el.className`, `onclick` wird
zu `addEventListener("click", …)`, Kinder werden flach angehängt, `null`/`false` fällt weg
(`src/ui/dom.js:7-20`). Haus-Form ist „ein Wurzelknoten, der die Fläche füllt" (`src/ui/hub.js:24-26`,
`:63-66`).

**Präfix `kl-`** für alles Neue. Begründung: `kl-` ist frei (im Bestand gibt es nur `.klein`, `.klickbar`,
`.klingelt` – Einzelwörter **ohne** Bindestrich), der Dateiname `klassenraum.css` passt dazu, und `klassen.py`
akzeptiert genau Wörter der Form `[a-z][a-z0-9]*(-[a-z0-9]+)+` (`tools/klassen.py:47`).

**Gerüst statt Neuaufbau:** `zeigen` baut das Gerüst **einmal**, `wieder` füllt nur die veränderlichen
Behälter. Ein `c.replaceChildren(…)` über die ganze Ansicht (Haus-Form, `src/ui/hub.js:63`) würde die
Eingabefelder wegwerfen, die man gerade benutzt.

### 2.1 Lehrer-Ansicht `klassenraum` (Dock-Beschriftung „Klasse", `h2` „Klassenraum")

```
div.kl-lehrer                          ← zeigen-Container (scrollt selbst, .ansicht hat overflow:auto)
└ div.kl-spalte                        ← zentrierte Spalte, width:min(660px,100%)
  ├ header.kl-kopf  → h2 "Klassenraum" · p.kl-klein "..."
  ├ div.kl-werkzeug                    ← GERÜST, bleibt stehen
  │ ├ span.kl-etikett "Auftrag"
  │ ├ select.kl-feld                   ← (1) Auftrag aus Spiel.ticketReihe()
  │ └ button.knopf.knopf-haupt "Code anzeigen"        ← (2)
  ├ div.kl-karte                       ← Behälter A, bei jeder Sitzungsänderung neu gefüllt
  │ ├ span.kl-etikett "Auftragscode für die Klasse"
  │ ├ div.kl-gross → span.kl-code "NL-4F7K-2Q"        ← die einzige vergrößerte Schrift
  │ ├ div.kl-block → span.kl-detail · button.knopf.kl-knopf "Code kopieren"   ← (3)
  │ ├ div.kl-block → span.kl-detail "Klassenraum-Abdruck" + span.kl-code      ← Abschnitt 6.5
  │ └ div.kl-block → span.kl-hinweis   ← Leer-/Fehler-/Erfolgszeile
  ├ div.kl-ampel                       ← Behälter B
  │ ├ div.kl-summe → span.kl-lampe.kl-rot|kl-gelb|kl-gruen · span.kl-detail
  │ └ div.kl-tafel → div.kl-zeile × n → span.kl-platz · Text · Text
  └ div.kl-form                        ← Werkzeugzeile unten
    ├ span.kl-etikett "Ergebnis-Codes"
    ├ textarea.kl-feld                 ← (4) Block oder einzelne Codes
    └ span.kl-knoepfe → button.knopf.kl-knopf "Eintragen" (5) · "Datei…" (6)
```

**Sichtbare Bedienelemente: 6** (`select`, „Code anzeigen", „Code kopieren", `textarea`, „Eintragen",
„Datei…") – genau die Grenze von R12 (`tools/ethos.py:304-316`). Lampen, Tafel, Beschriftungen sind
`span`/`div` und zählen nicht. **Diese Zahl ist der Engpass der ganzen Ansicht:** kommt ein siebtes
Bedienelement dazu (z. B. ein eigener „Einfügen"-Knopf), wird `python tools/ethos.py --dom` rot. Deshalb
liegen Export **und** Import auf einem Knopf „Datei…", der einen Dialog öffnet (`UI.app.dialogOeffnen`,
`src/ui/app.js:241-260`).

### 2.2 Schüler-Ansicht `mitarbeit` (Titel „Auftrag")

```
div.kl-schueler
└ div.kl-spalte
  ├ header.kl-kopf → h2 "Mitarbeit" · p.kl-klein "..."
  ├ form.kl-form                       ← GERÜST
  │ ├ span.kl-etikett "Auftragscode"
  │ ├ input.kl-feld                     ← (1) placeholder "NL-4F7K-2Q", type="text"
  │ ├ input.kl-feld (Platzkennung)      ← (2) type="text", inputmode="numeric", maxlength 2
  │ └ button.knopf.knopf-haupt "Auftrag öffnen"   ← (3)
  └ div.kl-karte                       ← Behälter B: Zustandszeile, Fehler, angenommener Auftrag
    ├ span.kl-etikett "Stand"
    ├ span.kl-hinweis
    └ div.kl-block → span.kl-detail "Klassenraum-Abdruck" + span.kl-code   ← Abschnitt 6.5
```

**Sichtbare Bedienelemente: 3.** Nach dem Öffnen wechselt die Fläche ins Labor
(`src/ui/spiel.js:56`); die Ansicht bleibt im Andock stehen und zeigt beim Zurückkommen den Zustand neu
(`wieder`).

### 2.3 Tabelle „Klasse → CSS-Regel"

**30 neue Klassen, 30 Regelblöcke in `src/stil/klassenraum.css` – eine Regel je Klasse, keine Regel ohne
Klasse** (gezählt wie `tools/klassen.py:30-49` es zählt: jedes Wort in `class:`/`classList`/`className`/
`closest`/`querySelector`/`$(…)`, das auf `[a-z][a-z0-9]*(-[a-z0-9]+)+` passt, braucht eine Regel in
`src/stil/*.css`).

| # | Klasse | Regel (Selektor) | Zweck |
|---|---|---|---|
| 1 | `kl-lehrer` | `.kl-lehrer{…}` | Wurzel der Lehrer-Ansicht: Grid, Polster, `overflow:auto`, `height:100%` |
| 2 | `kl-schueler` | `.kl-schueler{…}` | Wurzel der Schüler-Ansicht |
| 3 | `kl-spalte` | `.kl-spalte{…}` | zentrierte Inhaltsspalte, `width:min(660px,100%)` (Haus-Maß `src/stil/hub.css:3`) |
| 4 | `kl-kopf` | `.kl-kopf h2{…}` | Überschrift der Ansicht (Muster `src/stil/hub.css:4`) |
| 5 | `kl-klein` | `.kl-klein{…}` | Unterzeile unter der Überschrift |
| 6 | `kl-werkzeug` | `.kl-werkzeug{…}` | Werkzeugzeile oben (Auftrag wählen + Code anzeigen) |
| 7 | `kl-form` | `.kl-form{…}` | Eingabezeile(n) – in beiden Ansichten dieselbe Form |
| 8 | `kl-feld` | `.kl-feld{…}` | `select`, `input`, `textarea`: Höhe, Polster, `--radius`, `--line-2`, `--panel`, `--ink`, `var(--mono)` |
| 9 | `kl-etikett` | `.kl-etikett{…}` | kleine Überschrift über einem Feld |
| 10 | `kl-karte` | `.kl-karte{…}` | Karte für Code/Stand |
| 11 | `kl-gross` | `.kl-gross{…}` | **Beamer-Zeile** (Abschnitt 5) |
| 12 | `kl-code` | `.kl-code{…}` | der Code selbst: `letter-spacing`, `white-space:nowrap`, `user-select:all`, `--mono`, `--accent` |
| 13 | `kl-block` | `.kl-block{…}` | Zeile für Detail/Hinweis, `flex-wrap:wrap` |
| 14 | `kl-hinweis` | `.kl-hinweis{…}` | Leer-, Fehler- und Erfolgszeile |
| 15 | `kl-detail` | `.kl-detail{…}` | Nebentext in Ampel, Karte und Abdruck-Zeile |
| 16 | `kl-ampel` | `.kl-ampel{…}` | Block der Ampel |
| 17 | `kl-summe` | `.kl-summe{…}` | Zeile aus Lampen und Summentext |
| 18 | `kl-lampe` | `.kl-lampe{…}` | eine Lampe (Grundform) |
| 19 | `kl-gruen` | `.kl-lampe.kl-gruen{…}` | Lampe in `--ok` (alles eingetragen) |
| 20 | `kl-gelb` | `.kl-lampe.kl-gelb{…}` | Lampe in `--warn` (es fehlen noch Ergebnisse) |
| 21 | `kl-rot` | `.kl-lampe.kl-rot{…}` | Lampe in `--bad` – **reserviert** für echte Fehler (z. B. `importieren` scheitert), im Normalbetrieb aus |
| 22 | `kl-tafel` | `.kl-tafel{…}` | Ergebnistafel (Platz · Sterne · Dauer · Fehlversuche) |
| 23 | `kl-zeile` | `.kl-zeile{…}` | eine Tabellenzeile, `display:flex` |
| 24 | `kl-platz` | `.kl-platz{…}` | Platzkennung in der Zeile, `var(--mono)` |
| 25 | `kl-dauer` | `.kl-dauer{…}` | Dauer in der Zeile, `var(--mono)`, rechtsbündig |
| 26 | `kl-sterne` | `.kl-sterne{…}` | Sterne in der Zeile, `--geld` |
| 27 | `kl-fehl` | `.kl-fehl{…}` | Fehlversuchszahl, `--muted` |
| 28 | `kl-knopf` | `.kl-knopf{…}` | Zusatz zu `.knopf` (Code-Knöpfe, `--mono`) |
| 29 | `kl-knoepfe` | `.kl-knoepfe{…}` | Zeile aus mehreren Knöpfen |
| 30 | `kl-breit` | `.kl-breit{…}` | **bricht die 660-px-Spalte** für Code- und Abdruckzeile (100 % der Fläche) – Abschnitt 5 |

Neue Klassen der **Startseiten-Eingabezeile** (Abschnitt 4, drei weitere, ebenfalls in
`src/stil/klassenraum.css`): `kl-start`, `kl-start-etikett`, `kl-start-feld`, `kl-start-knopf` – damit
**34 Klassen / 34 Regelblöcke**.

**Gegenprobe:** `python tools/klassen.py` muss nach dem Bau `0 Klassen ohne CSS-Regel` melden – der
Ist-Stand ist heute 0 (in dieser Sitzung gemessen, siehe `B-ui.md`). Jede Klasse oben ist **neu**; kollidiert
eine mit einer bestehenden Regel aus `src/stil/*.css`, meldet `klassen.py` sie nicht, aber `ethos.py`
möglicherweise als Dopplung (R10, `tools/ethos.py:269-283`) – deshalb steht jede Regel genau einmal.

### 2.4 Tokens – ausschließlich aus `src/stil/basis.css`

Kein neues Farb- oder Größensystem (`KLASSENRAUM.md:20`), keine Farb-Literale (ethos R1,
`tools/ethos.py:151-159`), kein `!important` außerhalb von `basis.css` (R7, `tools/ethos.py:235-241`).

| Token | Zeile in `basis.css` | wofür |
|---|---|---|
| `--bg` | `:6` | Fläche hinter der Ansicht |
| `--panel` | `:8` | Karten, Werkzeugzeilen, Ampelblock |
| `--panel-2` | `:9` | Eingabefelder, Hinweiszeile |
| `--line` | `:11` | Rahmen, Trennlinien der Tafel |
| `--line-2` | `:12` | Rahmen der Eingabefelder |
| `--ink` | `:13` | Text |
| `--muted` | `:14` | Nebentext |
| `--faint` | `:15` | Etiketten, dunkle Lampe |
| `--accent` | `:16` | Code, linke Kante der Karte, Hauptknopf |
| `--accent-soft` | `:18` | Hinterlegung des Etiketts/Ampelblocks |
| `--ok` | `:19` | grüne Lampe, Erfolgszeile |
| `--warn` | `:20` | gelbe Lampe, Fehlerzeile je Zeile |
| `--bad` | `:21` | rote Lampe (reserviert) |
| `--bad-soft` | `:21` | Ring der roten Lampe |
| `--geld` | `:23` | Sterne in der Tafel |
| `--radius` | `:32` | Karten, Knöpfe, Felder |
| `--radius-s` | `:32` | Hinweiszeile |
| `--schatten` | `:31` | Karte |
| `--display` | `:33` | Überschriften |
| `--mono` | `:35` | Code, Platzkennung, Dauer, Abdruck |
| `--dauer` | `:36` | Übergänge |

**Nicht benutzt** (absichtlich): `--radius-xs` (`:32`, nur für `code`/`kbd` in `basis.css:86-87`),
`--accent-ink` (`:17`), `--glas` (`:40`), `--leiste-bg` (`:41`), `--kopf-h`/`--dock-b` (`:42`, liest nur
`rahmen.css:4`). Es gibt **kein** Token `--akzent-*` – die Schreibweise in einem früheren Entwurf war falsch.

**Die ethos-Falle (R3):** `font-size` wird nur geprüft, wenn der Wert mit Zahl + `px`/`em`/`rem`/`%`
**beginnt** (`tools/ethos.py:184-185`, `:192-194`); die sechs erlaubten Werte sind
`{11, 12, 13, 15, 20, 28}` px (`tools/ethos.py:42`). Ein `clamp(…)` am Anfang wird **übersprungen** – die
Beamer-Schrift (Abschnitt 5) rutscht dadurch durch die Prüfung, obwohl sie größer ist als jeder Wert der
Skala. Das ist der bewusste, offen benannte Kompromiss: die Alternative wäre ein neuer Skalenwert in
`tests/stil-stand.json` (den darf nur die Leitung ändern). Alle **anderen** Schriftgrößen der neuen Regeln
bleiben in der Skala (11, 13, 15, 28).

**R4 (Abstand):** nur `{0, 4, 8, 12, 16, 24, 32}` px (`tools/ethos.py:43`, `:199-208`). Ein Wert wie
`28px` als Polster wäre sofort rot. **R11 (Einheit):** Längenzahlen brauchen eine Einheit, `0` und
`calc/min/max/clamp` sind ausgenommen (`tools/ethos.py:286-297`) – `height:120px` ist in Ordnung,
`height:100` nicht.

### 2.5 Leer- und Fehlerzustände

| Lage | Lehrer-Ansicht | Schüler-Ansicht |
|---|---|---|
| keine Sitzung | Code-Zeile zeigt „— — — — —", `kl-hinweis` = „Noch keine Sitzung – wähle oben einen Auftrag und zeige den Code." Ampel grau (`.kl-lampe` ohne Farbkennung), Summe „noch keine Ergebnisse" | „Kein Auftrag offen – tippe den Code ein, den deine Lehrkraft ansagt." |
| Sitzung da, kein Ergebnis | Ampel gelb, Summe „fertig 0 · offen N · Median –" | Zustand „Auftrag angenommen: <Titel> · Platz N · Abdruck XXXXXX" |
| Fehler aus `ausCode` | – | `kl-hinweis` zeigt `grund` aus A wörtlich (Abschnitt 3.2) |
| Kopieren gescheitert | Toast „Kopieren ging nicht – markier den Text und kopier ihn selbst." (`src/ui/hub.js:124`) | derselbe Satz |
| Ansicht-Aufbau wirft | Der Rahmen fängt es und schreibt „Diese Ansicht konnte nicht aufgebaut werden: …" (`src/ui/app.js:97`) | derselbe Weg |

### 2.6 Ohne Karriere-Spielstand (Leiter-Hinweis 2)

**Befund am Code:** `Spiel.st` ist ein Getter, der beim ersten Zugriff `Spiel.laden()` ruft
(`src/spiel/zustand.js:82-86`, Getter in `:84`). `Spiel.laden()` legt einen leeren Stand an, wenn keiner da
ist (`:138-140`), füllt das Postfach (`:148`) und speichert (`:149`). Ein frischer Schulrechner hat also
**sofort** einen gültigen Stand: `stufe: 1`, `euro: 0`, `postfach: []` → nach `postfachAuffuellen` 2–3
Tickets (Ziel aus `Spiel.postfachZiel()`, `src/spiel/postfach.js:14`).

**Was daraus folgt (Festlegung):**

1. Die Klassenraum-Ansicht **darf nicht** `Spiel._st` als Sperre benutzen (so macht es der Hub,
   `src/ui/hub.js:26`). Sie liest die Sitzung aus `store "klassenraum"` und braucht den Spielstand nicht.
2. **Vor dem Öffnen eines Auftrags** muss `if (!Spiel._st) Spiel.laden();` stehen. Grund:
   `Spiel.instanzErstellen` liest `const st = Spiel.st` (`src/spiel/postfach.js:63`) und legt die Instanz in
   `st.postfach` ab (`:98`) – auch wenn der Getter selbst laden würde, ist der ausdrückliche Ruf die
   ehrliche Variante (Muster: `src/spiel/post.js:40`, `src/spiel/ticket.js:194`).
3. **Auftrag über der Karriere-Stufe ist kein Problem:** Das Niveau kommt nicht aus `st.stufe`, sondern aus
   `Spiel.niveauFuer(def)` (`src/spiel/lernen.js:19-26`): bei `Spiel.einst.wahl === "auto"` aus dem
   Lernstand, sonst aus der Wahl der Spielerin, **nie unter** `def.stufe` (`:24-25`). Der Klassenraum-Auftrag
   läuft auf einem fremden Rechner also mit dessen eigenem Niveau – das ist gewollt („kein Unterschied im
   Spielgefühl", `KLASSENRAUM.md:43`). Wer für die ganze Klasse dasselbe Niveau will, setzt `wahl` in den
   Einstellungen (`Spiel.einst.wahl`, `src/spiel/lernen.js:20-21`) – ein Klassenraum-Auftrag über der Stufe
   des Geräts ist damit kein Fehler, sondern läuft auf dem Niveau dieses Geräts.

---

## 3 · Alle Texte wörtlich

Anrede durchgehend „du" (`COMMON.md:9`). Herkunft je Text in Klammern: **[Auftrag]** = wörtlich aus
`KLASSENRAUM.md`, **[A]** = Text aus `A – Codec und Determinismus.md` (dort gemessen, also der Text, den der
Code wirklich liefert), **[B]** = hier festgelegt (der Auftrag verlangt den Inhalt, gibt aber keinen
Wortlaut).

### 3.1 Startseite (Abschnitt 4)

| Text | wo | Herkunft |
|---|---|---|
| „Klassenraum-Code" | Etikett über dem Feld | [B] |
| „NL-4F7K-2Q" | `placeholder` des Feldes | [Auftrag] (`KLASSENRAUM.md:37`) |
| „Öffnen" | Knopf (untergeordnet, `.hb-oder-zeile`) | [B] |
| „Kein Auftrag gefunden – frag deine Lehrkraft nach dem Code." | Fehlerzeile (kein Toast) | [B] |

### 3.2 Schüler-Ansicht `mitarbeit`

| Text | wo | Herkunft |
|---|---|---|
| „Mitarbeit" | `h2` | [B] |
| „Auftragscode eintippen – der Auftrag öffnet sich wie aus dem Postfach." | Unterzeile | [Auftrag] sinngemäß (`KLASSENRAUM.md:43`) |
| „Auftragscode" | Etikett + `aria-label` des Feldes | [Auftrag] (`KLASSENRAUM.md:43`) |
| „NL-4F7K-2Q" | `placeholder` | [Auftrag] (`KLASSENRAUM.md:37`) |
| „Platz" | Etikett der Platzkennung | [A] (`A – Codec und Determinismus.md:572-575`; die Zahl 0..31 in `:590`) |
| „Auftrag öffnen" | Hauptknopf | [Auftrag] („Auftrag öffnen") |
| „Kein Auftrag offen – tippe den Code ein, den deine Lehrkraft ansagt." | Leerzustand | [B] |
| „Auftrag angenommen: «Titel» · Platz N" | Erfolgszeile | [B] |
| „Klassenraum-Abdruck XXXXXX – vergleich ihn mit deinem Nachbarn." | Abdruckzeile | [B] | 
| „Dieser Auftrag ist schon offen. Weiterarbeiten?" | zweiter Klick auf denselben Code | [B] |

**Fehlertexte kommen aus A und werden nicht neu erfunden** (`{fehler, grund}`,
`A – Codec und Determinismus.md:156-186`). Der Code von Bereich A liefert wörtlich:

| Lage | Text |
|---|---|
| Länge falsch | „Der Code hat 5 Zeichen – er braucht 6 (gedruckt z. B. NL-4F7K-2Q)." |
| sieht wie ein Ergebniscode aus | Zusatz: „Das sieht nach einem Ergebnis-Code aus (E-…). Hier gehört der Auftragscode hin (NL-…)." |
| Fremdzeichen | „Im Code kommt kein I, kein O, keine 0 und keine 1 vor – hast du 0 statt O oder 1 statt I getippt?" |
| Prüfziffer | „Die Prüfziffer passt nicht – hast du dich vertippt?" |
| fremde Fassung/Index | „Auftragsindex 61 liegt hinter dem Ende der Auftragstabelle (58 Einträge)." |
| Auftrag fehlt | „Den Auftrag Nr. 12 (buero-03) gibt es in dieser Fassung nicht." |
| nichts eingetippt | **keine Meldung** (`ausCode("")` → `null`) |

> **Achtung, Abweichung vom Auftrag (offen):** Der Auftrag nennt als Beispiel wörtlich
> „Prüfziffer stimmt nicht — hast du ein O statt 0 getippt?" (`KLASSENRAUM.md:43`) und legt damit zwei
> Fehlerarten in **einen** Satz. A hat daraus zwei Klassen gemacht und zwei eigene Sätze formuliert
> (Zeile „Fremdzeichen" und „Prüfziffer" oben). Die Oberfläche zeigt **A's Text** – eine zweite Wahrheit im
> UI wäre schlimmer als die Abweichung. Der Satz des Auftrags bleibt hier wörtlich stehen, damit die
> Leitung entscheiden kann (Abschnitt 12, offener Punkt O3).

### 3.3 Lehrer-Ansicht `klassenraum`

| Text | wo | Herkunft |
|---|---|---|
| „Klassenraum" | `h2` | [Auftrag] (`KLASSENRAUM.md:19`) |
| „Auftrag ansagen – jedes Gerät baut denselben Auftrag." | Unterzeile | [Auftrag] sinngemäß (`KLASSENRAUM.md:3`) |
| „Auftrag" | Etikett der Auftragsauswahl | [B] |
| „Code anzeigen" | Knopf | [B] |
| „Auftragscode für die Klasse" | Etikett über dem großen Code | [Auftrag] |
| „Code kopieren" | Knopf | [Auftrag] (`KLASSENRAUM.md:43`) |
| „Auftragscode kopiert – einfach an die Klasse weitergeben." | Toast nach dem Kopieren | [B], Muster `src/ui/hub.js:119` |
| „Noch keine Sitzung – wähle oben einen Auftrag und zeige den Code." | Leerzustand | [B] |
| „Klassenraum-Abdruck XXXXXX – auf beiden Geräten muss er gleich sein." | Abdruckzeile | [B] (Auftrag: „Netzkennwert beider Seiten vergleichen", `KLASSENRAUM.md:54`) |
| „Ergebnis-Codes" | Etikett über dem Eingabefeld | [Auftrag] (`KLASSENRAUM.md:44`) |
| „Einen Code je Zeile oder alles auf einmal einfügen." | Platzhalter/`aria-describedby` | [B] |
| „Eintragen" | Knopf | [B] |
| „Datei…" | Knopf (Export **und** Import) | [B] |
| „Ampel: fertig N · offen N · Median M:SS" | Summenzeile | [Auftrag] („wie viele fertig / wie viele offen / Median-Dauer", `KLASSENRAUM.md:44`) |
| „Platz N · ★★★★½ · M:SS · 1 Fehlversuch" | Tabellenzeile | [Auftrag] (`KLASSENRAUM.md:44`) |
| „noch keine Ergebnisse" | Summenzeile bei 0 Codes | [B] |
| „Plätze nicht eingestellt" | Summenzeile, wenn keine Platzzahl bekannt ist | [B] siehe O1 |

### 3.4 Erfolgs- und Fehlermeldungen der Lehrer-Eingabe

| Lage | Text | Herkunft |
|---|---|---|
| Ergebnis eingetragen | „Platz 5 eingetragen: 4,5 ★ · 1:50." | [B] |
| derselbe Code noch einmal | „Schon eingetragen – zählt einmal." (A: `grund:"doppelt"`) | [A] `A – Codec und Determinismus.md:559`, `:622` |
| anderer Code für denselben Platz | „Platz 5 hat schon ein Ergebnis – das zuerst eingetragene gilt." (A: `grund:"platz-schon-da"`) | [A] `:561`, `:623` |
| Doppelt **im Block** | „Zeile 4: doppelt – steht schon in Zeile 2." | [B] |
| fremde Sitzung | A's Satz: „Dieser Ergebnis-Code gehört zu Sitzung 7 – hier läuft Sitzung 6." – A liefert dazu `art: "fremd"` bzw. `art: "keine"`, damit die Oberfläche beide Fälle unterscheiden kann | [A] `:624`, `:167`, `:174-175` |
| keine Sitzung | „Es läuft keine Sitzung – erst einen Auftrag erzeugen." | [A] `:625` |
| Tippfehler | „Die Prüfziffer passt nicht – hast du dich vertippt?" | [A] `:164`, `:191` |
| Teil-Erfolg | „18 eingetragen · 2 doppelt · 1 fremde Sitzung · 1 unlesbar" | [B] |
| Auftrag ohne Klassenraum-Code | **kein Toast** – A liefert `{fehler:"auftrag", grund:"Dieser Auftrag kam nicht über einen Klassenraum-Code."}`, die Sitzung ist dann nicht zuständig | [A] `:545` |
| Import: fremdes JSON | Toast „Das ist keine Klassenraum-Datei." | [A] `:714` |
| Import: neuere Fassung | Toast mit Titel „Zu neues Format" (so heißt der Fall hier; das Hausmuster für einen zu neuen Stand heißt „Zu neuer Spielstand", `src/ui/karriere.js:412`), `dauer: 14000`: „Die Datei stammt aus einer neueren Fassung (Stand 2); dieses Programm kennt nur 1." | [A] `:704`, `:721` |
| Import: abgebrochen | **keine Meldung** (Rückgabe `null`, `src/plattform/plattform-browser.js:55`) | [B] |

### 3.5 Server und Firewall (Abschnitt 11)

| Text | wo | Herkunft |
|---|---|---|
| „Klassenraum-Server (nur Desktop)" | Titel der Schalterzeile | [Auftrag] (`KLASSENRAUM.md:46`) |
| „Nur das Desktop-Programm kann das. Beim ersten Einschalten fragt Windows, ob das Programm in Netzwerken erreichbar sein darf – das ist die Firewall-Abfrage. Erlaube sie nur für private Netzwerke, nicht für öffentliche. Lehnt die Firewall ab, geht nichts kaputt: die Klasse tippt die Ergebnis-Codes dann einfach ab, und alles andere bleibt gleich." | Hinweistext unter dem Titel, **wörtlich so** | [B] – Inhalt vom Auftrag verlangt (`KLASSENRAUM.md:46`, „ehrlicher Hinweis auf die Windows-Firewall-Abfrage beim ersten Start") |
| „Nur das Desktop-Programm kann das." | Ersatztext, wenn `Plattform.name !== "tauri"` | [B], Muster `src/ui/app.js:326` |
| **kein** Server erreichbar | **keine Meldung** – „keine Fehlermeldung, wenn nicht" | [Auftrag] (`KLASSENRAUM.md:48`) |

### 3.6 Ergebnis-Code im Spiel (Abschnitt 7)

| Text | wo | Herkunft |
|---|---|---|
| „Ergebnis-Code: E-CBUD-RX5" | Zeile im Ergebnis-Toast | [B] |
| „Ergebnis-Code kopiert – gib ihn deiner Lehrkraft." | Kopier-Rückmeldung | [B], Muster `src/ui/hub.js:119`, `:165` |
| „Kopieren ging nicht – markier den Text und kopier ihn selbst." | Kopieren gescheitert (wörtlich aus dem Haus) | `src/ui/hub.js:124` |

Es gibt **keine** Texte für den Fall „Ergebnis-Code nötig, aber Klassenraum-Auftrag nicht erkannt" – A
liefert dafür `{fehler:"auftrag", grund:"Dieser Auftrag kam nicht über einen Klassenraum-Code."}`
(`A – Codec und Determinismus.md:545`); in diesem Fall wird **kein** Toast gezeigt (der Auftrag war dann
kein Klassenraum-Auftrag).

---

## 4 · Startseite: die Code-Eingabezeile

### 4.1 Wo die „Startseite" wirklich ist

Die sichtbare Startseite ist die Ansicht **`heute`** – der Hub (`src/ui/hub.js:2`, „die ruhige
Startseite"). Wer neu ist, landet zuerst im Labor (`src/ui/spiel.js:855`), mit Fortschritt in `heute`
(`src/ui/spiel.js:856`); angemeldet wird `heute` in `src/ui/hub.js:170-174`.

Der Auftrag nennt `src/ui/start.js` (`KLASSENRAUM.md:22`). Dort steht die Startseite aber **nicht**:
`start.js` ist der Startvorgang (`UI.starten`, `src/ui/start.js:44-107`) und die Sandbox
(`src/ui/start.js:6-42`). Der Ortsname im Auftrag ist an dieser Stelle ungenau.

**Festlegung:** Die Zeile wird in **`src/ui/hub.js`** ergänzt – als **ein** zusätzliches Kind in
`c.replaceChildren(h("div", {class:"hb-seite"}, kopf, feier, karte, KLASSE, kacheln, ziel))`
(`src/ui/hub.js:63-66`) und damit sichtbar **unter** der Auftragskarte und **über** den Kacheln. Das ist
eine additive Änderung an einer fremden Datei und braucht die Freigabe der Leitung (Abschnitt 12, O2);
alternativ kann die Zeile aus `src/ui/klassenraum.js` kommen, wenn `hub.js` den Hub über einen Bus-Kanal
anbietet – den gibt es heute nicht.

```js
/* src/ui/hub.js, zwischen `karte` und `kacheln` (Zeile 65) */
klassenraumZeile(),   /* liefert null, wenn Spiel.klassenraum fehlt – dann ändert sich nichts */
```

### 4.2 Aussehen und Verhalten

```js
/* neue Funktion in src/ui/klassenraum.js; Klassen kl-start* (Abschnitt 2.3) */
function klassenraumZeile(){
  if (typeof Spiel.klassenraum === "undefined") return null;        /* Bereich A fehlt → kein DOM */
  const feld = h("input", {type: "text", class: "kl-start-feld", placeholder: "NL-4F7K-2Q",
    spellcheck: "false", autocomplete: "off", autocapitalize: "characters", "aria-label": "Klassenraum-Code"});
  const los = () => { const r = Spiel.klassenraum.ausCode(feld.value); ... };   /* Abschnitt 6 */
  return h("div", {class: "kl-start"},
    h("label", {class: "kl-start-etikett", for: ...}, "Klassenraum-Code"),
    feld,
    h("button", {type: "button", class: "hb-oder-zeile kl-start-knopf", onclick: los}, "Öffnen"));
}
```

| Eigenschaft | Festlegung | Beleg/Grund |
|---|---|---|
| Position | unter der Auftragskarte, über den Kacheln, innerhalb `.hb-seite` | `src/ui/hub.js:63-66` (`hb-auftrag` → `hb-kacheln`) |
| Breite | `.hb-seite > *{width:min(660px,100%)}` (`src/stil/hub.css:3`) | Haus-Maß, kein Sonderweg |
| Beschriftung | „Klassenraum-Code" (Etikett), Platzhalter „NL-4F7K-2Q" | `KLASSENRAUM.md:37` |
| Knopf | **`.hb-oder-zeile`** – die vorhandene, untergeordnete Zeilen-Klasse (`src/stil/hub.css:63-64`) | **kein** zweiter Hauptknopf (`KLASSENRAUM.md:72`); nur eine neue Klasse `.kl-start-knopf` als Zusatz |
| Enter | löst dasselbe aus wie der Knopf (Muster: `src/ui/spiel.js:244`) | ein Weg, zwei Auslöser |
| Groß/Klein | egal – A normalisiert (`toUpperCase`, alles außer `[0-9A-Z]` weg, `A – Codec und Determinismus.md:49-54`) | `nl4f7k2q` und `NL-4F7K-2Q` ergeben dieselbe Normalform (`:54-59`) |
| Trennstriche/Punkte/Leerzeichen | egal – A entfernt sie (`:50`) | gemessen an fünf Schreibweisen (`:54-55`) |
| Fehler | Zeile **unter** dem Feld (`.kl-hinweis`), kein Toast, kein Sprung | der Hub bleibt ruhig; Toasts sind für das Spiel reserviert |
| Erfolg | Auftrag öffnet sich, Ansicht wechselt ins Labor (`src/ui/spiel.js:56`) | wie ein Postfach-Auftrag (`KLASSENRAUM.md:43`) |

### 4.3 Beleg, dass der Rauchtest nicht bricht

`tools/rauch.py` klickt mit **echten Mausereignissen** und misst zusätzlich Lage, Überlauf und leere
Flächen (`tools/rauch.py:1-24`). Die Fallzahl ist **36** – nachgezählt: `BREITEN` hat 3 Einträge
(`tools/rauch.py:45`), je Breite läuft 1 Fall „erster Auftrag" (`:415`) plus 11 Fälle aus `FAELLE`
(`:176-186`) in der Schleife `:421`; die Summe druckt `:437`. 3 × 12 = 36.

| Stelle | was der Rauchtest auf der Startseite tut | berührt die neue Zeile ihn? |
|---|---|---|
| `tools/rauch.py:176` | Fall „Heute": `__rauch.ansicht('heute')`, Hauptaktion `.hb-annehmen` **oder** `.hb .primaer` | **Ja, potenziell.** `haupt()` nimmt den **ersten** sichtbaren Treffer (`:85-99`). Deshalb: die neue Zeile enthält **weder** `.hb-annehmen` **noch** `.primaer` – der Knopf trägt `.hb-oder-zeile`. Dann greift weiter `.hb-annehmen` (`src/ui/hub.js:41`) |
| `tools/rauch.py:85-100` | `haupt(sels)` – Treffer muss ganz im Fenster liegen **und** `elementFromPoint` muss ihn treffen | **Ja:** der Knopf muss vollständig sichtbar und frei liegen (keine Überlagerung). Die Zeile steht im normalen Fluss, kein `position:fixed`, kein Overlay |
| `tools/rauch.py:184` | Fall „Wiki" sucht `input[type=search]` | **Nein**, wenn das neue Feld `type="text"` ist. **Verboten:** `type="search"` |
| `tools/rauch.py:151-170` (`leer()`) | leere sichtbare Flächen (Hintergrund/Rahmen/Schatten, ab 24×12 px) und Elemente, die trotz `hidden` sichtbar sind | **Nein für `input`/`textarea`/`select`** – `:157` nimmt genau diese Tags aus. **Verboten:** ein leerer `span`/`div` **mit** Hintergrund oder Rahmen als Eingabe-Attrappe |
| `tools/rauch.py:105-132` (`ueberlauf()`) | Seite scrollt nicht seitlich; sichtbare Elemente ragen nicht rechts heraus; Bereiche, die ohne Absicht seitlich scrollen | **Nein**, solange die Zeile umbricht (`flex-wrap:wrap`) und die Spaltenbreite `min(660px,100%)` hält. Bei 720 px Fenster bleiben nach Dock 76 px und Polster 2×24 px 596 px – die Zeile braucht weniger |
| `tools/rauch.py:135-147` (`geraeteFrei()`) | in der Mitte jedes Geräts liegt das Gerät | **Nein** – die Zeile liegt im Hub, nicht über der Zeichenfläche |
| `tools/rauch.py:103` (`ABSICHT`) | Liste der Bereiche, die absichtlich seitlich scrollen dürfen | **Nein** – die Zeile wird **nicht** in `ABSICHT` eingetragen. Sollte der große Code scrollen müssen, ist das Abschnitt 5, nicht die Startseite |
| `tools/rauch.py:63` (`ansicht(n)`) | `basis()` + `UI.app.ansicht(n)` – kein Klick auf die Startseite selbst | **Nein** |
| `tools/rauch.py:276-333` (erster Auftrag) | `Spiel.neu()`, neu laden, Kabel Kasse→Switch ziehen, `.sp-abnahme` klicken | **Nein** – läuft im Labor. **Aber:** die neue Zeile muss **fehlerfrei** laden (JS-Fehler machen aus 36/36 ein 35/36, `:433-436`), und sie darf beim Spielstand-Reset (`Spiel.neu()`) nicht stehen bleiben, ohne neu gezeichnet zu werden |
| `tools/rauch.py:433-436` | JS-Fehler zählen als rot | **Ja:** das DOM darf nur gebaut werden, wenn `Spiel.klassenraum` existiert (Abschnitt 4.2, erste Zeile) |

**Verboten, damit 36/36 bleibt (Kurzliste):**

1. Keine Klasse `primaer` und keine Klasse `hb-annehmen` in der neuen Zeile.
2. Kein `input[type=search]`.
3. Keine leere Fläche als Eingabe-Attrappe (nur echte `input`/`textarea` – `tools/rauch.py:157`).
4. Kein Overlay, kein `position:fixed`, nichts über der Zeichenfläche.
5. Kein seitliches Scrollen, keine feste Breite über `min(660px,100%)` hinaus.
6. Keine JS-Ausnahme (die Zeile prüft `typeof Spiel.klassenraum`).
7. `ABSICHT` in `tools/rauch.py:103` **nicht** erweitern (das wäre das Werkzeug an die Oberfläche anpassen).

> **Ehrlich:** Der Rauchtest ist in dieser Sitzung **nicht gelaufen**. Edge bricht in der Werkzeug-Sandbox
> in seiner eigenen Prozess-Sandbox ab (`Nachweise/Klassenraum/D-messung.md:105-133`). Die Aussage oben ist
> deshalb eine **Analyse des echten Skripts**, keine Messung. Die 36 ist hergeleitet und nachgezählt
> (Abschnitt 4.3, erster Absatz), der Ist-Stand 36/36 stammt aus `AGENTS.md`.

---

## 5 · Beamer-Lesbarkeit – Rechnung und Schriftgrößen

### 5.1 Rechnung

Annahmen, alle offen benannt:

* Betrachtungsabstand **3 m** (Zielvorgabe des Auftrags, `KLASSENRAUM.md:43`).
* Sehwinkel: **20 Bogenminuten** sind die untere Grenze für sicheres Erkennen einzelner Zeichen, **25**
  die bequeme (`A – Codec und Determinismus.md` nennt keine Werte; die Werte sind Setzung, siehe „nicht
  geprüft"). 1 Bogenminute bei 3 m = `tan(1/60°) · 3000 mm` = **0,8727 mm**.
* Zeichenhöhe: gemeint ist die **Versalhöhe** (Großbuchstaben – der Code ist durchgehend groß). Für die
  Haus-Monospace (`--mono`, `src/stil/basis.css:35`) wird sie mit **0,70 em** angenommen.
* Zeichenbreite Monospace: **0,60 em** (typisch für JetBrains Mono/Consolas).

| Ziel | Versalhöhe bei 3 m | nötige `font-size` (96 dpi) |
|---|---|---|
| 20 Bogenminuten | 20 · 0,8727 = **17,45 mm** | 17,45 / 0,70 = 24,93 mm = **94 px** |
| 25 Bogenminuten | 25 · 0,8727 = **21,82 mm** | 21,82 / 0,70 = 31,17 mm = **118 px** |

**Zeichenzahl des Auftragscodes: 10** – `NL-XXXX-XX` ist „immer genau 10 Zeichen (inkl. Trennstriche)"
(`A – Codec und Determinismus.md:42-47`, über alle 2²⁰ Nutzlasten gemessen). Der **Ergebnis-Code ist
ebenfalls 10 Zeichen** (`E-XXXX-XXX`, `:513`). Die frühere Annahme „12 Zeichen" war falsch.

Breite des Codes: `10 · 0,60 em = 6,0 em` – bei 94 px sind das **564 px**.

### 5.2 Schriftgröße je Fensterbreite

Der Code soll **nicht** umbrechen (er ist ein Stück Papier, kein Fließtext), also gilt:
`font-size ≤ verfügbare Breite / 6,0`.

| Fensterbreite | verfügbare Innenbreite (Fenster − Dock 76 px − 2×32 px Polster) | `5vw` | Code-Breite bei `5vw` | Ergebnis |
|---|---|---|---|---|
| 1366 px | 1226 px | 68,3 px | 410 px | passt mit 816 px Reserve |
| 960 px | 820 px | 48,0 px | 288 px | passt mit 532 px Reserve |
| 720 px | 580 px | 36,0 px | 216 px | passt mit 364 px Reserve |
| 1920 px | 1780 px | 96 px | 576 px | passt; Deckel 118 px greift hier noch nicht |
| 2360 px | 2220 px | 118 px (Deckel) | 708 px | passt mit 1512 px Reserve |

**Festlegung (die Regel für `.kl-gross` bzw. `.kl-code`):**

```css
.kl-gross{
  /* die EINZIGE Schrift außerhalb der ethos-Skala – über clamp(), siehe 2.4 */
  font: 800 clamp(28px, 5vw, 118px)/1.05 var(--mono);
  display: grid; place-items: center; overflow: visible;
}
.kl-code{ letter-spacing: .08em; white-space: nowrap; }
```

`clamp(28px, 5vw, 118px)` ergibt bei 1366 px **68,3 px**, bei 960 px **48,0 px**, bei 720 px **36,0 px**
und am Deckel **118 px**. Das ist die Schreibweise, die `tools/ethos.py:184-194` überspringt (Abschnitt 2.4).

### 5.3 Was das aus drei Metern wirklich heißt

Die Versalhöhe hängt an der **Projektionsgröße**, nicht an der Fensterbreite. Ein typischer
Klassenraumprojektor zeigt bei 1920 px nativer Breite etwa **2,0 m** Bildbreite – das sind **1,042 mm je
px**. Damit:

| Fensterbreite | Schrift | Versalhöhe auf 2,0 m Bild | Sehwinkel bei 3 m | aus 3 m lesbar? |
|---|---|---|---|---|
| 1366 px | 68,3 px | 68,3 · 1,042 · 0,70 = **49,8 mm** | 57′ | mühelos |
| 960 px | 48,0 px | 48,0 · 1,042 · 0,70 = **35,0 mm** | 40′ | mühelos |
| 720 px | 36,0 px | 36,0 · 1,042 · 0,70 = **26,3 mm** | 30′ | gut |
| ohne Projektor, 1:1 | 68,3 px | 68,3 · 0,2646 · 0,70 = **12,6 mm** | 14,4′ | **nein** – dafür braucht es 94 px, also ein 1920-px-Fenster mit 96 px |
| Deckel, 1920 px | 118 px | 118 · 1,042 · 0,70 = **86,0 mm** | 98′ | jede Sitzreihe |

**Ehrliche Schlüsse:**

* Aus drei Metern ist der Code über einen Projektor in **jeder** geprüften Fensterbreite lesbar – auch bei
  720 px (30 Bogenminuten).
* **Ohne** Projektor (Bildschirm 1:1, 96 dpi) sind selbst 68 px nur 14,4 Bogenminuten – drei Meter sind am
  nackten Monitor nicht zu schaffen. Wer das will, braucht 94 px Schrift bei einem Fenster ab 1920 px
  (das ist im Deckel enthalten) oder muss näher heran.
* Die Rechnung ist eine **Rechnung**, keine Messung am Beamer (Abschnitt 12).

---

## 6 · Ablauf „Klassenraum-Auftrag"

### 6.1 Die Aufrufkette (so, und nur so)

```js
/* src/ui/klassenraum.js – der Öffnungsweg des Auftrags; Vorlage: A – Codec und Determinismus.md:591-594 */
const c = Spiel.klassenraum.ausCode(eingabe);          // Abschnitt 1: 0,4 ms, reine Rechnung, keine Ausnahme
if (!c) return;                                        // nichts eingetippt
if (c.fehler) return hinweis(c.grund);                 // Tippfehler, fremde Fassung, Länge …
if (!Spiel._st) Spiel.laden();                         // frischer Schulrechner (Abschnitt 2.6)
const inst = c.skill
  ? Spiel.instanzErstellen({gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true})
  : Spiel.instanzErstellen({ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
inst.klassenraum = {sitzung: c.sitzung, platz: Spiel.klassenraum.platz() ?? 0, code: c.code};
UI.spiel.oeffnen(inst.iid);                            // NICHT Spiel.oeffnen allein
```

Reihenfolge und Wirkung, jede Zeile belegt:

| Schritt | Datei:Zeile | Wirkung |
|---|---|---|
| `Spiel.instanzErstellen({ticketId, seed, quelle, ohneFlow})` | `src/spiel/postfach.js:62` | Rumpf; die Instanz entsteht und wandert in `st.postfach` (`:98`) |
| `ohneFlow: true` | `src/spiel/postfach.js:79` | Der Flow-Regler wird **nicht** angewandt. Ohne das passt `Spiel.flow` den Auftrag dem Fortschritt des Geräts an: gemessen liefert `gen-lab.link-5` dann `gen-lab.link-5-verwicklung` mit **anderem Netz** (`A – Codec und Determinismus.md:451-459`) |
| `seed: c.seed` | `src/spiel/postfach.js:81` | Der Seed kommt aus dem Code, nicht aus `Spiel.neuerSeed` |
| `def.fuerSeed(seed)` | `src/spiel/postfach.js:86-89` | Handaufträge bekommen die **Seed-Fassung** ihres Netzes (`vielfalt = true`), sonst die feste Fassung. Die Selbstprüfung `Spiel.ticketGueltig` entscheidet, welche spielbar ist (`src/daten/basis.js:159-176`) → gleicher `(id, seed)` ⇒ gleiches Netz auf jedem Gerät |
| `quelle: "klassenraum"` | `src/spiel/postfach.js:94` | reines Kennzeichen der Instanz; wird gespeichert und mitgeschrieben |
| `Spiel.oeffnen(iid)` **innerhalb** `UI.spiel.oeffnen(iid)` | `src/ui/spiel.js:42` → `src/spiel/ticket.js:41` | aktiv setzen, gelesen markieren, Laufzeit anlegen, `Spiel.niveauAktualisieren()` (`src/spiel/ticket.js:46-56`) |
| Labor laden | `src/ui/spiel.js:51-55` | `UI.labor.laden(r.netz, {titel: r.def.titel, …})` – **hier** steht der Titel |
| Ansicht wechseln | `src/ui/spiel.js:56` | `UI.app.ansicht("labor")` (`src/ui/app.js:83-101`) |
| Panels/Coach | `src/ui/spiel.js:57-69` | Live-Panel, Senior-Timer, Mappe (bei `quelle: "klassenraum"` klappt die Mappe auf, weil `quelle !== "pruefung"`) |

**Kein** Postfach-Umweg, **kein** `Spiel.postfachAuffuellen`, **kein** zweiter Speicher.

### 6.2 Was im Postfach und im Hub sichtbar wird

| Ort | Verhalten | Beleg |
|---|---|---|
| `Spiel.postfach()` (die Postfach-Ansicht) | **sichtbar** – der Filter lässt nur `pruefung` und `raetsel` weg | `src/spiel/postfach.js:124` |
| `Spiel.postfachAuffuellen()` – „reguläre" Tickets | **zählt nicht mit**: `regulaer()` zählt nur `postfach` und `generiert` | `src/spiel/postfach.js:152` |
| `Spiel.postfachZiel()` | **unberührt**: 2 vor dem ersten Auftrag, sonst 3 (+1 ab Stufe 2) | `src/spiel/postfach.js:14`, `:10-11` |
| Hub „Heute" (`Spiel.hub.naechster()`) | kann den Klassenraum-Auftrag als **nächsten** anzeigen, wenn er der oberste im Postfach ist | `src/spiel/hub.js:50-61` |
| Titel im Hub und in der Auftragszeile | **„Klassenraum-Auftrag"** – über die Anzeige-Regel in 6.3, nicht über `def.titel` | `src/spiel/hub.js:57`, `src/ui/spiel.js:113` |
| `st.angebot` | wächst um die Auftrags-ID (wie jeder neue Handauftrag) | `src/spiel/postfach.js:99` |
| `st.erledigt` beim **Öffnen** | unverändert | – |

### 6.3 Der Titel „Klassenraum-Auftrag"

`def.titel` kommt aus dem Bauplan (`src/daten/basis.js:145`, Feld `titel` in der festen Fassung) und ist
über `Object.defineProperty` als **Getter** angelegt (`src/daten/basis.js:148-151`) – ein
`Object.assign` würde ihn auswerten und den Titel verlieren. Ein zusätzliches Feld am Bauplan gibt es
nicht; `spec.titel` ist die einzige Quelle.

**Festlegung:** Der Titel wird **in der Anzeige** überschrieben, an genau zwei Stellen, und zwar über einen
**additiven Haken auf `Spiel.defVon`** – dieselbe Technik, mit der `Spiel.ergaenzer` den Spielstand erweitert
(`src/spiel/zustand.js:11`, `:142-144`):

```js
/* src/spiel/klassenraum.js, ganz am Ende der Datei – NICHT auf oberster Ebene (Ladereihenfolge, COMMON.md:7) */
function titelHaken(){
  if (Spiel.defVon.klassenraumHaken) return;               /* idempotent */
  const alt = Spiel.defVon;
  const neu = function(id, inst){
    const d = alt(id, inst);
    if (!d) return d;                                       /* null bleibt null */
    if (!inst || inst.quelle !== "klassenraum") return d;
    if (inst.krDef && inst.krDef.ticketId === d.id) return inst.krDef.def;
    const kopie = Object.create(d);                         /* Getter bleiben Getter */
    Object.defineProperty(kopie, "titel", {value: "Klassenraum-Auftrag", enumerable: true, configurable: true});
    inst.krDef = {ticketId: d.id, def: kopie};
    return kopie;
  };
  Object.defineProperty(neu, "klassenraumHaken", {value: true});
  Spiel.defVon = neu;
}
(UI.startHaken ||= []).push(() => { titelHaken(); /* … die registrieren-Aufrufe aus 1.2 */ });
```

Warum so und nicht anders (jede Alternative mit ihrem Preis):

| Alternative | Preis |
|---|---|
| `def.titel` am Bauplan ändern | `spec.titel` ist eine Konstante; ein zweiter Klassenraum-Auftrag mit demselben Auftrag bekäme den Titel auch im Normalbetrieb |
| `def.titel = …` nach `instanzErstellen` | unmöglich: `titel` ist ein Getter ohne Setter (`src/daten/basis.js:148-151`) |
| Drei Anzeigestellen einzeln patchen (`src/spiel/hub.js:57`, `src/ui/spiel.js:113`, `src/ui/spiel.js:51`) | drei fremde Dateien statt einer neuen; jede neue Anzeigestelle müsste man nachtragen |
| Der **Haken** oben | **eine** neue Datei, idempotent, wirkt überall, wo `Spiel.defVon` benutzt wird – und **nur** für Instanzen mit `quelle === "klassenraum"` |

**Nebenbedingung:** `Spiel.defVon` wird an vielen Stellen gerufen (`src/spiel/postfach.js:116`). Der Haken
liefert die Kopie **je Instanz gemerkt** (`inst.krDef`), ist also stabil; ohne `inst` (z. B.
`Spiel.ticketDef(o.ticketId)` in `src/spiel/postfach.js:75`) verhält er sich wie vorher. Ob
Identitätsvergleiche auf `defVon`-Ergebnisse existieren, ist **nicht geprüft** (Abschnitt 12).

### 6.4 Was NICHT passieren darf (Leiter-Hinweis 1)

Der Auftrag soll die Karriere **nicht** anfassen (Entscheidung E2). Der Ist-Zustand am Code:

| Wirkung | Datei:Zeile | heute |
|---|---|---|
| Eintrag in `st.erledigt` („gelöst") | `src/spiel/abnahme.js:117` | passiert |
| Gutschrift Lohn und Ruf | `src/spiel/abnahme.js:132` | passiert |
| Instanz aus dem Postfach entfernen | `src/spiel/abnahme.js:124` → `src/spiel/postfach.js:215-220` | passiert |
| `Spiel.postfachAuffuellen()` | `src/spiel/abnahme.js:133` | füllt sofort nach (unberührt vom Klassenraum, `:152`) |
| Meldung `ticket-geloest` | `src/spiel/abnahme.js:148` | passiert (Treffer für den Ergebnis-Code, Abschnitt 7) |
| `st.angebot` | `src/spiel/postfach.js:99` | passiert |

`Spiel.abschliessen` hat **einen** frühen Ausstieg für den nicht bestandenen Fall
(`src/spiel/abnahme.js:92-95`); er ist die natürliche Stelle für einen zweiten:

```js
/* VORSCHLAG an die Leitung – src/spiel/abnahme.js, direkt nach der Abnahme (Zeile 91/92):
   Der Klassenraum-Auftrag wird abgenommen, aber nicht verbucht. */
if (inst.quelle === "klassenraum") {
  Spiel.sofortSpeichern();
  return {bestanden: abnahme.bestanden, abnahme, lernen: null, def, inst, klassenraum: true,
          sterne: abnahme.bestanden ? abnahme.sterne : 0};
}
```

Der Eingriff ist **vier Zeilen** in einer fremden Datei und ändert für alle anderen Quellen nichts. Er ist
in dieser Sitzung **nicht** gemacht (Regel `Liesmich.md:29-30`); ohne ihn gilt der Ist-Zustand: der
Klassenraum-Auftrag zählt als erledigt, gibt Lohn und Sterne, und `Spiel.istErledigt(id)`
(`src/spiel/postfach.js:52`) kann ihn der Karriere „wegnehmen", weil er nur die Ticket-ID kennt
(`src/spiel/postfach.js:154`). **Das ist die wichtigste offene Entscheidung des Bereichs B** (O4).

### 6.5 Der Klassenraum-Abdruck (Leiter-Hinweis 3)

**Definition:** der **Netzkennwert** aus Bereich A – 6 Zeichen aus dem Code-Alphabet, gebildet über eine
kanonische Abbildung des Netzes (Geräte, Kabel, Konfiguration; **ohne** Laufzeitzustand und ohne
Reihenfolgen) per FNV-1a (`A – Codec und Determinismus.md:395-438`, Funktion `netzkennwert` in
`:359-364`). Gemessen: gleiches Netz → gleicher Kennwert (`YYBR4E`), eine geänderte IP → anderer Kennwert.

**Festlegung:**

* **Quelle ist das geladene Netz, nicht der Code:** `Spiel.klassenraum.netzkennwert(inst.netz)` –
  `inst.netz` ist das Netz der laufenden Instanz (`src/spiel/postfach.js:90`, `:92`). Aus dem Code
  gerechnet wäre der Vergleich zirkulär (beide Geräte zeigten nur, dass sie denselben Code gelesen haben).
* **Wo:** in **beiden** Ansichten, je **eine** Zeile, kopierbar:
  * Lehrkraft: in `kl-karte`, unter der Abdruck-Beschriftung „Klassenraum-Abdruck XXXXXX – auf beiden
    Geräten muss er gleich sein."
  * Schülerin: in `kl-karte` als Teil der Zustandszeile, „Klassenraum-Abdruck XXXXXX – vergleich ihn mit
    deinem Nachbarn."
* **Form:** `span.kl-detail` (Beschriftung) + `span.kl-code` (Wert). Der Wert ist markierbar
  (`user-select:all`, wie `.hb-teilen` in `src/stil/hub.css:31`) und über den Kopierknopf holbar.
* **Wann er steht:** sobald ein Auftrag geöffnet ist. **Vor** dem Öffnen gibt es kein Netz, also keinen
  Abdruck – dann steht „— — — — —" mit dem Hinweis „Abdruck erscheint, sobald der Auftrag offen ist."
* **Was er nicht ist:** kein Prüfmittel gegen Manipulation, nur ein Vergleichsabdruck
  (`A – Codec und Determinismus.md:429`). Er gehört **nicht** in die Ergebnis-Codes (die tragen nur
  Sitzung, Platz, Sterne, Fehlversuche, Dauer, `A – Codec und Determinismus.md:584-594`).

---

## 7 · Ergebnis-Code im Spiel

### 7.1 Wo er erscheint

Der Abnahmepfad der Oberfläche ist **eine** Funktion: `abnahmeAnfordern()`
(`src/ui/spiel.js:380-411`). Sie ruft `Spiel.abnahme(inst)` (`:382`), dann `Spiel.abschliessen(inst, ab)`
(`:387`), spielt die Funktionsprobe (`:405`) und zeigt am Ende `ergebnisZeigen(erg)` (`:409`) – das
Ergebnisfenster (`src/ui/spiel.js:444-526`, Wurzel `sp-ergebnis` in `:495`, Knopfzeile `sp-knoepfe` in
`591`, Toasts dort nicht).

`Spiel.abschliessen` schreibt `inst.zeitMs` ein letztes Mal fort (`src/spiel/abnahme.js:90`) und meldet
`ticket-geloest` (`src/spiel/abnahme.js:148`) – **das ist der Haken für den Ergebnis-Code**, denn
`Spiel.klassenraum.ergebnisCode(inst, abnahme)` muss **nach** `abschliessen` laufen
(`A – Codec und Determinismus.md:541-554`).

**Festlegung: kein Eingriff in `src/ui/spiel.js`.** Der Code hängt sich additiv an den Bus:

```js
/* src/ui/klassenraum.js */
Bus.an("ticket-geloest", d => {
  const inst = d && d.inst;
  if (!inst || inst.quelle !== "klassenraum" || !inst.klassenraum) return;   /* kein Klassenraum-Auftrag */
  const ab = inst.letzteAbnahme;                                            /* siehe unten */
  const code = Spiel.klassenraum.ergebnisCode(inst, ab);
  if (code && code.fehler) return;                                          /* still: kein Auftrag → kein Code */
  const text = `Ergebnis-Code: ${code}`;
  UI.toast(text, "ok", {id: "klassenraum-code", titel: "Für die Lehrkraft", dauer: 20000,
    aktion: {text: "Kopieren", fn: () => UI.hub.kopieren(code, "Ergebnis-Code kopiert – gib ihn deiner Lehrkraft.")}});
});
```

`UI.toast(text, art, {aktion:{text, fn}, dauer, titel, id})` – echte Signatur mit Aktionsknopf
(`src/ui/toast.js:3`, `:50-53`); mit Aktion bleibt der Toast länger stehen (`:58`) und die Aktionsknöpfe
zählen **nicht** als sichtbare Bedienelemente der Klassenraum-Ansicht (R12 zählt dokumentweit,
`tools/ethos.py:304`). Die Kopier-Rückmeldung kommt aus `UI.hub.kopieren(text, ok)`
(`src/ui/hub.js:122-126`).

**Damit `abnahme` verfügbar ist**, merkt sich der Bus-Hörer die letzte Abnahme: `Bus.an("ticket-geloest")`
liefert sie nicht mit (`src/spiel/abnahme.js:148`). Zwei Wege, beide ohne fremde Datei:

1. **Empfohlen:** den Aufruf `Spiel.abnahme` ebenfalls additiv umhängen (`abnahmeHaken()`, Muster wie
   `titelHaken()` in 6.3) und `inst.letzteAbnahme = abnahme` merken. `Spiel.abnahme` gibt das Objekt
   zurück (`src/spiel/abnahme.js:40-44`), der Haken ist drei Zeilen.
2. Ohne Haken: `Spiel.klassenraum.ergebnisCode(inst, {bestanden: true, sterne: <aus st.erledigt>})` – nicht
   empfohlen, weil die Sterne dann aus einer zweiten Quelle kämen.

### 7.2 Dezent beim zweiten Ansehen

* Der Toast hat die **id** `klassenraum-code` – ein zweiter Toast mit derselben id **ersetzt** den ersten
  (`src/ui/toast.js:39`), es stapeln sich also keine Codes.
* Es gibt **keine** dauerhafte Zeile im Labor und **keine** Änderung an `sp-ergebnis`: der Code
  verschwindet mit dem Toast (Standarddauer 20 s, mit Aktion 8 s Grunddauer + Halten bei Mauszeiger,
  `src/ui/toast.js:58-61`).
* Wer ihn später braucht: `Spiel.klassenraum.sitzung()` liefert die Sitzung samt Ergebnissen
  (`A – Codec und Determinismus.md:480`) – die Lehrkraft sieht ihn in ihrer Tafel, die Schülerin kann ihn
  nicht erneut anzeigen. Das ist Absicht (Datensparsamkeit, `KLASSENRAUM.md:39`).

---

## 8 · Lehrer-Eingabe: mehrere Codes

### 8.1 Ein Feld, Block oder einzeln

**Festlegung:** **ein** `textarea` (6 Zeilen), abgeschickt mit dem Knopf „Eintragen" **oder** `Strg+Enter`;
`Enter` macht einen Zeilenumbruch.

Begründung: (a) Der Auftrag nennt „mehrere Codes nacheinander **oder als Block**"
(`KLASSENRAUM.md:44`) – der Block ist der häufigere Fall (28 Ergebnisse in einem Zug). (b) Die
**Zeilennummer** ist die natürliche Fehleradresse („Zeile 4: …"), und die gibt es nur, wenn die
Zeilenstruktur im `textarea` erhalten bleibt. (c) `Enter` muss zum Vorbereiten und Korrigieren frei
bleiben. (d) Ein `textarea` zählt für R12 wie ein `input` (`tools/ethos.py:304`) – die Zahl der
Bedienelemente ändert sich nicht.

### 8.2 Zerlegung, Prüfung, Doppelte

```js
/* Zerlegung eines Blocks – Muster: src/ui/konsole.js:176-179, src/ui/inspektor.js:216-217 */
const zeilen = String(block).replace(/\r/g, "").split("\n");         // Zeilennummer = Index + 1
for (let i = 0; i < zeilen.length; i++) {
  const stuecke = zeilen[i].split(/[\s,;]+/).filter(Boolean);        // Leerzeichen, Komma, Semikolon
  for (const stueck of stuecke) { /* ein Ergebnis-Code je Stück */ }
}
```

* **Bindestriche sind keine Trenner** – sie gehören zum gedruckten Code (A normalisiert sie weg,
  `A – Codec und Determinismus.md:52`).
* **Normalisierung ist Aufgabe von A** (`toUpperCase`, alles außer `[0-9A-Z]` entfernen, `:47-52`). Die
  Oberfläche reicht jedes Stück wörtlich an `Spiel.klassenraum.ergebnisLesen(stueck)` bzw.
  `ergebnisEintragen(stueck)` weiter – **kein zweites `toUpperCase` im UI** (eine Wahrheit).
* **Ergebnis je Zeile** (keine Toasts je Zeile, keine Dialoge):

| Befund | Anzeige |
|---|---|
| eingetragen | „Zeile 2 · Platz 5 · 4,5 ★ · 1:50 · eingetragen" |
| doppelt (gleicher Code) | „Zeile 4 · E-CBUD-RX5 · doppelt – steht schon in Zeile 2" (A: `grund:"doppelt"`, `A – Codec und Determinismus.md:559`) |
| Platz schon belegt | „Zeile 5 · Platz 5 hat schon ein Ergebnis – das zuerst eingetragene gilt." (A: `platz-schon-da`, `:491`) |
| fremde Sitzung | A's `grund` wörtlich (`625`) |
| Tippfehler | A's `grund` wörtlich (`625`) |
| leer | Zeile wird übersprungen, nicht gemeldet |

* **Teilweiser Erfolg ist Erfolg:** jede Zeile wird einzeln eingetragen; gültige landen in der Sitzung, auch
  wenn andere Zeilen scheitern. `ergebnisEintragen` ist idempotent („derselbe Code zweimal ändert nichts",
  `KLASSENRAUM.md:32`, gemessen byte-identisch `A – Codec und Determinismus.md:560-561`), ein zweiter
  Durchgang ist also gefahrlos. Darüber steht die Summenzeile „18 eingetragen · 2 doppelt · 1 fremde
  Sitzung · 1 unlesbar".
* **Doppelte werden erkannt, nicht gezählt:** der Schlüssel ist der **Platz**; „erster Eintrag gewinnt"
  (`A – Codec und Determinismus.md:557-569`). Die Ampel zählt Ergebnisse, nicht Eingaben.

---

## 9 · Die Ampel

### 9.1 Definition

| Größe | Definition | Beleg |
|---|---|---|
| **fertig** | Anzahl der Plätze mit einem Eintrag in `sitzung.ergebnisse` (Schlüssel = Platz) | Datenschema `A – Codec und Determinismus.md:655-656`, `:682` |
| **offen** | `plaetze − fertig`, wenn die Platzzahl eingestellt ist; sonst „Plätze nicht eingestellt" | **neu** – A's Schema hat kein Feld dafür (O1) |
| **ausgefallen** | Ergebnisse mit `platz === 0` („ohne Platz") oder `platz > plaetze` | `A – Codec und Determinismus.md:572-575`, `:590` (0 = ohne Platz) |
| **Median-Dauer** | oberer Median der **gültigen** Dauern (siehe 9.2) | – |
| **Fehlversuche** | je Zeile aus dem Ergebnis-Code, 0–3, ab 3 als „3+" (A: 2 Bit) | `A – Codec und Determinismus.md:592` |
| **Sterne** | je Zeile, halbe Sterne möglich (0–10) | `A – Codec und Determinismus.md:591` |

**Doppelte zählen einmal** – die Ampel zählt Plätze, nicht Eingaben (Abschnitt 8.2).

### 9.2 Median-Dauer: gerade Anzahl, fehlende Dauern, Rundung

* **Grundmenge:** nur **gültige** Dauern – `typeof d === "number" && isFinite(d) && d > 0`. Eine fehlende
  oder 0-Dauer zählt für „fertig", **nicht** für den Median. Grund: `inst.zeitMs` startet bei `0`
  (`src/spiel/postfach.js:96`); ein Lauf, der sofort abgebrochen wurde, würde den Median sonst nach unten
  ziehen. Die Dauer entsteht erst beim Abschluss (`src/spiel/abnahme.js:90`) und wird von A in
  10-s-Schritten kodiert (`A – Codec und Determinismus.md:593`).
* **Welche Einheit?** Die Rohquelle `inst.zeitMs` ist **Millisekunden** (`src/spiel/postfach.js:96`,
  Zuwachs in `src/spiel/abnahme.js:90`, Grenze 2 min in `src/spiel/ticket.js:9`) und wird **nirgends
  zentral** umgerechnet – jede Anzeigestelle teilt selbst: `Math.round((inst.zeitMs || 0) / 1000)`
  (`src/spiel/tagebuch.js:36`, `src/spiel/tagesraetsel.js:74`). Der Ergebnis-Code liefert deshalb
  **`dauerS` in Sekunden** (`A – Codec und Determinismus.md:551`): die Ampel arbeitet durchgehend in
  Sekunden und teilt **nicht** noch einmal. Haus-Vorlage für `M:SS`:
  `` `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` `` (`src/spiel/tagebuch.js:52`).
* **Regel bei gerader Anzahl:** **oberer Median** – der Wert an der 0-basierten Stelle `floor(n/2)` der
  aufsteigend sortierten Liste. Bei `n = 4` ist das der **dritte** Wert (Index 2), bei `n = 5` der dritte
  (Index 2), bei `n = 6` der vierte.
* **Rundung:** auf ganze **Sekunden**, kaufmännisch (`Math.round`). Anzeige als `M:SS` (Beispiel: „1:50").
  Keine Minutenrundung – die Dauer einer Übung ist kurz.
* **Warum oberer Median und nicht der Mittelwert der beiden mittleren?** (a) Er ist **immer ein wirklich
  vorgekommener Wert**: A liefert 10-s-Stufen, ein Mittel aus 4:10 und 4:20 wäre 4:15 – eine Zeit, die in
  keiner Zeile steht und die die Lehrkraft nicht nachzählen kann. (b) Er braucht keine „×,5"-Sonderregel.
  (c) Er sagt den Satz, den die Lehrkraft braucht: „nach 4:20 war mindestens die Hälfte fertig."
  **Preis, ehrlich:** bei gerader Anzahl liegt er um bis zu eine Rangstufe über dem „echten" Median.
  **Achtung, es gibt bereits eine andere Regel im Haus:** `Spiel.tagebuch.auswertung` rechnet bei gerader
  Anzahl den **Mittelwert der beiden mittleren** und zeigt in Minuten
  (`src/spiel/tagebuch.js:53`, `54`) – die Ampel folgt ihr bewusst **nicht** (Begründung a–c), und das
  ist eine Festlegung, keine Ableitung (offener Punkt O9).
* **Kein gültiger Wert:** Anzeige „Median –".

**Beispiele (nachgerechnet):**

| Dauern | sortiert | n | oberer Median |
|---|---|---|---|
| 250, 260 | 4:10, 4:20 | 2 | 4:20 |
| 300 | 5:00 | 1 | 5:00 |
| 200, 250, 250, 260, 300, 310 | 3:20, 4:10, 4:10, 4:20, 5:00, 5:10 | 6 | 4:20 |
| 110, 0 (fehlt) | 1:50 | 1 (gültig) | 1:50 |

### 9.3 Farben und Schwellen

| Lage | Lampe | Token | Beleg |
|---|---|---|---|
| 0 Ergebnisse | Lampe **dunkel**, Summe „noch keine Ergebnisse" | `.kl-lampe` ohne Farbkennung (Grundfarbe `--faint`, `src/stil/basis.css:15`) | – |
| `1 ≤ fertig < plaetze`, `ausgefallen = 0` | **gelb** | `--warn` (`src/stil/basis.css:20`) | – |
| `fertig = plaetze ≥ 1`, `ausgefallen = 0` | **grün** | `--ok` (`src/stil/basis.css:19`) | – |
| Platzzahl unbekannt (`plaetze = 0`), aber Ergebnisse da | **gelb**, Summe „N Ergebnisse · Plätze nicht eingestellt" | `--warn` | O1 |
| `ausgefallen > 0` | **gelb**, Zusatz „2 Ergebnisse ohne gültigen Platz" | `--warn` | – |
| Import gescheitert | **rot** | `--bad` (`src/stil/basis.css:21`) | – |

**Rot (`--bad`) ist im Normalbetrieb aus.** Der Auftrag schließt Zeit- und Sperrlogik aus
(`KLASSENRAUM.md:66`); rot hat im Haus einen Frist-Auslöser. Eine rote Lampe ohne Anlass wäre ein Urteil
ohne Grund – deshalb greift `.kl-lampe.kl-rot` **nur** beim fehlgeschlagenen Import. Farbe trägt nie allein
die Aussage (die Summenzeile steht als Text daneben).

### 9.4 Plattzahl – was fehlt (O1)

A's Sitzung kennt **keine** Platzzahl (`A – Codec und Determinismus.md:671-688`: genau 14 Felder, kein
`plaetze`). Ohne sie kann die Ampel „offen" nicht rechnen und **nie** grün werden. **Vorschlag an A:**

```js
/* Sitzung erweitern: */ plaetze: 0        // 0 = nicht eingestellt; 1..31
/* und in erzeugen({…, plaetze}) mit aufnehmen; Obergrenze 31, weil platz 5 Bit hat
   (A – Codec und Determinismus.md:551-553) */
```

Die Oberfläche liest `sitzung.plaetze || 0`; ist es 0, zeigt sie gelb und „Plätze nicht eingestellt"
statt einer erfundenen Zahl. Die Lehrkraft stellt die Platzzahl dort ein, wo sie den Auftrag erzeugt
(ein `select` 1..31, Standard = leer) – **ohne** neues Bedienelement in der Ampel (R12).

---

## 10 · Export und Import als Datei

### 10.1 Die echten APIs

```js
Plattform.datei.exportieren(name, text)   /* → Promise<boolean> (Browser) | Promise (Tauri) */
Plattform.datei.importieren()             /* → Promise<string|null>  null = abgebrochen */
```

* Verteiler: `src/plattform/plattform.js:28-31` (Objekt `datei` mit beiden Funktionen).
* Browser: `exportieren` baut einen `Blob` und klickt einen `<a download>` (`src/plattform/plattform-browser.js:45-51`);
  `importieren` erzeugt ein verstecktes `input[type=file]` mit `accept=".json,application/json"` und liest
  per `FileReader` (`:52-58`). **Abbruch ⇒ `null`** (`:55`).
* Desktop: `invoke("exportieren", {name, inhalt})` bzw. `invoke("importieren")`
  (`src/plattform/plattform-tauri.js:73-74`).
* **`Plattform.kann("datei")` ist keine Fähigkeitsprüfung:** der Schlüssel fehlt in der NEIN-Liste des
  Browsers (`src/plattform/plattform-browser.js:8-15`) und antwortet dort deshalb `{ja:true}`
  (`:60`); Tauri antwortet für unbekannte Schlüssel ebenfalls `{ja:true}`
  (`src/plattform/plattform-tauri.js:77`). Der Dateiweg wird also **nicht** abgefragt, sondern mit
  `try/catch` und `.catch` abgesichert.

### 10.2 Dateiname und Inhalt

* **Name:** `klassenraum-<JJJJ-MM-TT>.json` – Datum aus `heute()` (Haus-Form `YYYY-MM-DD`,
  `src/kern/basis.js:18`), Muster wie beim Spielstand-Export (`src/ui/karriere.js:405`).
* **Inhalt:** `Spiel.klassenraum.exportieren()` liefert den JSON-String
  (`A – Codec und Determinismus.md:480`, Format `:692-700`: `{format:"netzwerk-labor/klassenraum", fassung,
  programm, zeit, sitzung}`).
* **Vorher `store.sofort()`** – das Hausmuster vor einem Export (`src/kern/basis.js:85-86`,
  `src/ui/karriere.js:403`); hier **nicht** nötig, weil die Sitzung in `store "klassenraum"` liegt und
  `exportieren()` sie selbst liest. Schadet aber nicht.
* **Ohne Sitzung:** `{fehler:"sitzung", grund:"Es läuft keine Sitzung – nichts zu exportieren."}`
  (`A – Codec und Determinismus.md:624`) → Toast „Es läuft keine Sitzung – nichts zu exportieren."

### 10.3 Fehlerfälle

| Fall | Verhalten | Beleg |
|---|---|---|
| Dialog abgebrochen (Browser und Desktop) | **keine Meldung** (`null` zurück) | `src/plattform/plattform-browser.js:55` |
| Datei leer | Toast: „Die Datei ist leer." | `A – Codec und Determinismus.md:705` |
| kein JSON | Toast: „Das ist keine JSON-Datei." | `:636` |
| fremdes Format | Toast: „Das ist keine Klassenraum-Datei (format fehlt)." | `720` |
| neuere Fassung | Toast mit Titel „Zu neues Format" (`dauer: 14000`; Hausmuster „Zu neuer Spielstand", `src/ui/karriere.js:412`) | `710` |
| Sitzung fehlt/unbrauchbar | Toast mit A's `grund` | `:640-642` |
| Import gelingt | Toast „Datei eingelesen." + **8 s** „Rückgängig" (`aktion`), das die alte Sitzung zurückschreibt | `src/ui/toast.js:50-53`, `:58` |

### 10.4 Ablage

Die Sitzung liegt in **`store "klassenraum"`** (`KLASSENRAUM.md:40`), **nicht** in `store "labor"` –
`Spiel.st` ist der Spielstand (`src/spiel/zustand.js:157`) und bleibt unberührt. Schlüssel im Speicher:
`klassenraum` mit den Feldern `fassung, programm, sitzung, platz, letzte, zuletzt, zaehler`
(`A – Codec und Determinismus.md:634-662`).

`store.get/set` sind Haus-Bordmittel (`src/kern/basis.js:74-75`) und liefern bzw. speichern **tiefe
Kopien** – die Sitzung kann also nicht versehentlich von außen verändert werden. Muster für einen eigenen
Schlüssel: `store.set("sandbox", {v: 1, netz})` (`src/ui/start.js:38`).

---

## 11 · Einstellungen: Schalter „Klassenraum-Server"

### 11.1 Die echten Signaturen

```js
UI.app.einstellungAbschnitt(titel, fn)         /* src/ui/app.js:267-270; fn(container) zeichnet den Abschnitt */
UI.app.einstellungen()                          /* src/ui/app.js:339-348; eigene + fremde Abschnitte */
/* Bausteine im Modul (nicht exportiert): */
zeile(titel, text, steuer, kann)                /* src/ui/app.js:281-286 */
schalter(an, fn, titel)                         /* src/ui/app.js:287-291; role="switch", aria-checked */
```

`einstellungAbschnitt` und `einstellungen` liegen im Rückgabeobjekt von `UI.app`
(`src/ui/app.js:401-403`) – `zeile` und `schalter` **nicht**. Ein neuer Abschnitt muss deshalb entweder in
`src/ui/app.js` liegen (verboten) oder seine Zeile selbst bauen. **Festlegung:** der Abschnitt baut seine
Zeile mit demselben DOM wie `zeile()` (`div.einst-zeile` > `div.einst-text` > `strong`+`span`) und seinen
Schalter mit demselben DOM wie `schalter()` (`button.schalter` mit `span`) – **Klassen aus
`src/stil/rahmen.css`**, keine neuen (`.einst-zeile` `:159`, `.einst-text` `:160`, `.schalter` `:172-175`).
Damit sieht der Abschnitt aus wie die vorhandenen und `klassen.py` bleibt unberührt.

Anmeldung im selben Start-Haken wie die Ansichten (Abschnitt 1.2), Muster `src/ui/hub.js:170-173`:

```js
UI.app.einstellungAbschnitt("Klassenraum", klassenraumAbschnitt);
```

Der Abschnitt erscheint **nach** den eigenen Abschnitten (Darstellung, Erklärtiefe, Leiste,
`src/ui/app.js:341`) und nach „Spieltagebuch" (`src/ui/hub.js:172`).

### 11.2 Der Schalter und sein Wert

* **Titel:** „Klassenraum-Server (nur Desktop)", **Standard: aus**.
* **Wert:** `klassenraumServer` im **vorhandenen** `store "einst"` (denselben Speicher benutzen Thema,
  Bewegung, Ton, Ereignisse, Anpassung – `src/ui/app.js:302-314`; gelesen über `einst()`,
  `src/ui/app.js:35`). **„Aus" ist gratis:** `einst()` mischt keine Vorgaben, ein fehlender Schlüssel ist
  `undefined` und damit falsch – **keine Migration nötig**.
* **Schreiben:** `einstSetzen` ist **privat** (`src/ui/app.js:38`, nicht im Rückgabeobjekt
  `:401-403`). Der Abschnitt schreibt deshalb direkt:
  `const e = store.get("einst", {}) || {}; e.klassenraumServer = an; store.set("einst", e);`
  – dasselbe Muster wie die Leisten-Einstellungen (`src/ui/app.js:320`) und wie
  `Spiel.einstSetzen` (`src/spiel/zustand.js:184`).
* **Nur Desktop:** `Plattform.name === "tauri"` entscheidet (`src/plattform/plattform-tauri.js:47`,
  `src/plattform/plattform-browser.js:18`); das Hausmuster dafür steht in `src/ui/app.js:326` und `:346`.
  Im Browser wird die Zeile **gesperrt** dargestellt (`.einst-zeile.gesperrt`, `src/stil/rahmen.css:164`)
  mit dem Text „Nur das Desktop-Programm kann das." – genau wie der Autostart-Schalter
  (`src/ui/app.js:332-335`).
* **Firewall-Hinweis:** wörtlich als `text`-Argument unter dem Titel (Abschnitt 3.5). **Genau eine
  Stelle**, kein zweiter Hinweis, kein Toast beim Einschalten.
* **Ohne erreichbaren Server:** keine Meldung (`KLASSENRAUM.md:48`). Der Schalter zeigt die Einstellung,
  nicht die Wirklichkeit – eine Statusabfrage gibt es heute nicht (Abschnitt 12).

---

## 12 · Offene Punkte und was nicht geprüft wurde

### 12.1 Offene Punkte (Entscheidung nötig)

| Nr | Punkt | Wer | Was passiert, wenn nichts entschieden wird |
|---|---|---|---|
| **O1** | **Platzzahl in der Sitzung** – A's Schema hat kein `plaetze` (`A – Codec und Determinismus.md:671-688`). Ohne sie kann die Ampel „offen" nicht rechnen und nie grün werden | Bereich A / Leitung | Ampel bleibt gelb, Summe „Plätze nicht eingestellt" |
| **O2** | **`src/ui/hub.js` additiv freigeben?** Die Startseiten-Zeile braucht **ein** zusätzliches Kind in `src/ui/hub.js:65`. Der Auftrag nennt `src/ui/start.js:22`; dort ist die Startseite nicht (`src/ui/start.js:44-107`) | Leitung | keine Startseiten-Eingabe; der Schülerweg läuft nur über die Klassenraum-Ansicht |
| **O3** | **Tippfehler-Satz**: Auftrag „Prüfziffer stimmt nicht — hast du ein O statt 0 getippt?" (`KLASSENRAUM.md:43`) gegen A's zwei Sätze (Abschnitt 3.2) | Leitung | die Oberfläche zeigt A's Sätze; der Satz des Auftrags steht nirgends |
| **O4** | **Karriere-Wirkung** (E2): ohne die vier Zeilen in `src/spiel/abnahme.js` zählt der Klassenraum-Auftrag als erledigt, gibt Lohn und Sterne und kann der Karriere ein Ticket „wegnehmen" (`src/spiel/postfach.js:52`, `:154`) | Leitung | Ist-Zustand bleibt: Lohn, Ruf, `st.erledigt`, Abzeichen, Tagesziel zählen mit |
| **O5** | **Titel-Haken auf `Spiel.defVon`** (Abschnitt 6.3) – additiver Eingriff in die Spielschicht; Nebenwirkungen nicht geprüft | Leitung | kein Titel „Klassenraum-Auftrag"; der Auftrag heißt wie sein Kunde |
| **O6** | **Zwei Andock-Knöpfe** oder ein Umschalter (E1) | Leitung | zwei Knöpfe, Andock bei 600 px Fensterhöhe mit Rollleiste (Abschnitt 1.3) |
| **O7** | **R12 mit `--dom`**: die Lehrer-Ansicht liegt mit **6** Bedienelementen genau an der Grenze (`tools/ethos.py:315`); der Messzustand von `--dom` ist undefiniert | Bereich D | jede spätere Ergänzung (ein Knopf) macht `ethos.py --dom` rot |
| **O8** | **Server-Status**: der Schalter zeigt die Einstellung, nicht die Wirklichkeit. Ein Befehl `klassenraum_status` existiert nicht (Bereich C) | Bereich C | die Lehrkraft sieht nicht, ob der Server läuft |
| **O9** | **Median-Regel**: die Ampel nimmt den oberen Median, `Spiel.tagebuch.auswertung` nimmt den Mittelwert (`src/spiel/tagebuch.js:53`) | Leitung | zwei Median-Regeln im Haus – die Ampel ist dokumentiert, aber nicht die Haus-Regel |

### 12.2 Was in dieser Sitzung **nicht** geprüft wurde (ehrlich)

| Nicht geprüft | Grund |
|---|---|
| **`python tools/rauch.py`** – die 36/36 sind **nicht** von mir gemessen | Edge bricht in der Werkzeug-Sandbox ab (Mojo-Kanal/`Zugriff verweigert`), siehe `Nachweise/Klassenraum/D-messung.md:105-133`. Meine Aussage ist eine Analyse des echten Skripts (Abschnitt 4.3); die Fallzahl 36 ist aus `tools/rauch.py:45`, `:176-186`, `:415`, `:421` nachgezählt |
| `python tools/ethos.py --dom` (R12 im laufenden Programm) | dasselbe Edge-Problem; die Zahlen 6 und 3 sind am DOM gezählt, nicht gemessen |
| Das **Aussehen** der neuen CSS-Regeln | `src/stil/klassenraum.css` existiert noch nicht; ich habe kein CSS geschrieben (Schreibbereich) |
| `python tools/klassen.py` **mit** den neuen Klassen | die Dateien gibt es nicht; gemessen ist nur der Ist-Stand 0 |
| Beamer-Darstellung von `clamp()` und `letter-spacing` | kein Beamer, keine Messung – die Tabelle in 5.3 ist eine Rechnung mit Setzungen (Bildbreite 2,0 m, Versalhöhe 0,70 em, Zeichenbreite 0,60 em) |
| Nebenwirkungen des `defVon`-Hakens (O5) | nicht ausgeführt; ich habe in `src/` keine Identitätsvergleiche auf `defVon`-Ergebnisse gefunden, `tests/` aber nicht danach durchsucht |
| `Spiel.klassenraum` selbst | existiert noch nicht (A liefert die Festlegung, nicht die Datei) – alle A-Zitate sind aus `docs/entwicklung/Klassenraum/A – Codec und Determinismus.md` |
| `Plattform.datei.importieren()` auf einem **Desktop** | nur der Browser-Weg ist im Code lesbar (`src/plattform/plattform-browser.js:52-58`); die Rust-Seite (`invoke("importieren")`) habe ich nicht gelesen |
| Speicherverhalten der Sitzung über einen Neustart | die Sitzung liegt in `store "klassenraum"` und wird über `Plattform.speichern` geschrieben (`src/ui/start.js:47`); ob die Sitzung nach `Spiel.neu()` überlebt, ist plausibel (anderer Schlüssel), aber **nicht gemessen** |

---

## 13 · Anhang: Belege in einem Blick

| Thema | wichtigste Belegstellen |
|---|---|
| Registrierung | `src/ui/app.js:3`, `:21`, `:57-63`, `:79-82`, `:95-98`, `:117`; `src/ui/hub.js:170-173`; `src/ui/spiel.js:842-845`; `src/ui/karriere.js:475-479`; `src/ui/start.js:49`, `:58`; `src/ui/palette.js:47` |
| Symbole | `src/ui/geraetebilder.js:67-116`, `:120` |
| DOM/CSS | `src/ui/dom.js:7-20`; `src/stil/hub.css:2-3`, `:11`, `:31`, `:63-64`; `src/stil/rahmen.css:40-41`, `:53`, `:62`, `:66`; `src/stil/konsole.css:61` |
| Klassen | `tools/klassen.py:19`, `:30-49`, `:47`, `:55-58` |
| Tokens | `src/stil/basis.css:6-42` (Zeilen 6, 8, 9, 11-23, 31-36, 42) |
| ethos | `tools/ethos.py:42`, `:43`, `:151-159`, `:184-194`, `:199-208`, `:235-241`, `:269-283`, `:286-297`, `:304-316` |
| Rauchtest | `tools/rauch.py:45`, `:53-70`, `:85-100`, `:103`, `:105-132`, `:135-147`, `:151-170`, `:176`, `:184`, `:276-333`, `:411`, `:415`, `:421`, `:433-437` |
| Ablauf | `src/spiel/postfach.js:14`, `:62`, `:79`, `:81`, `:86-90`, `:94`, `:98`, `:116`, `:124`, `:152`, `:215-220`; `src/spiel/ticket.js:41-58`; `src/ui/spiel.js:40-71`, `:56`; `src/daten/basis.js:145`, `:148-151`, `:159-176` |
| Abnahme | `src/spiel/abnahme.js:13`, `:38`, `:86`, `:90`, `:92-95`, `:117`, `:124`, `:132`, `:133`, `:148`; `src/ui/spiel.js:380-411`, `:444-526` |
| Zustand/Store | `src/spiel/zustand.js:11`, `:23-38`, `:82-86`, `:126-134`, `:136-152`, `:157`, `:184`; `src/kern/basis.js:18`, `:74-75`, `:85-86` |
| Plattform | `src/plattform/plattform.js:28-32`; `plattform-browser.js:8-15`, `:45-58`, `:60`; `plattform-tauri.js:47`, `:73-74`, `:77` |
| Texte/Toast | `src/ui/toast.js:3`, `:39`, `:50-53`, `:58-61`; `src/ui/hub.js:119`, `:122-126`, `:165`; `src/ui/dom.js:36-43` |
| Bereich A | `A – Codec und Determinismus.md:42-54`, `:142-153`, `:156-197`, `:395-438`, `:451-459`, `:515-530`, `:541-569`, `:584-594`, `:634-662`, `:671-689`, `:693-726` |
| Auftrag | `tools/auftraege/KLASSENRAUM.md:3`, `:7`, `:19`, `:22`, `:37`, `:40`, `:43`, `:44`, `:46`, `:48`, `:54`, `:57`, `:66`, `:72` |
