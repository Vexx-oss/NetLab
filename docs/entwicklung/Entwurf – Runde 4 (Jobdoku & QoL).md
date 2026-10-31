---
tags: [FISI, Lernspiel, Netzwerk, Redesign, Runde4, Gestaltungsvertrag, Übergabe]
erstellt: 2026-10-31
status: Arbeitsfassung — verbindlicher Gestaltungsvertrag für Runde 4 (Fassung 2.6.0); Bereichsteams arbeiten danach.
---

# Entwurf – Runde 4 „Jobdoku & QoL" (Gestaltungsvertrag, 31.10.2026)

**Auftrag (Nutzer, sinngemäß).** Die noch alten Flächen des Netzwerk-Labors — Verdacht/Akte,
Lernstand, Simulator/Inspektor, Shop, Fenster und die Interaktion allgemein — sollen auf eine
eigenständige, originelle Bento-2.5-Designsprache kommen und zu einer glaubwürdigen
**Job-Simulation mit didaktischer Hilfe** professionalisiert werden. Sie sind vor Bento 2.5
entstanden; sie werden nicht „poliert", sondern **kreativ neu gedacht und umgezogen** — und das
Ergebnis wird als **Fassung 2.6.0** veröffentlicht (Push, Tag, Release, Live-Seite, lokale .exe).

**Messstand am Anfang dieser Sitzung** (gemessen, 31.10.2026): Zweig `ausbau-1.2`, HEAD `02a8bf3`,
Fassung **2.5.1**, Live-Seite SHA256 `9DA8261C…CE57E77A`, Tests **878/878**, Rauchtest **45/45**,
`klassen.py` 0, `ethos.py` GRÜN, `umlaute.py` GRÜN, Simulation unverändert,
`seite.py --pruefen` GRÜN (56 Dokumente). Vorher-Bilder aller betroffenen Flächen liegen unter
`Nachweise/bento/vorher4/` (1440 + 960): `lernstand`, `shop`, `akte`, `inspektor`, `simulator`.

## 1 · Was bleibt (nicht verhandelbar)

1. **Bedienlogik und Datenwege bleiben** — außer dort, wo dieser Vertrag ausdrücklich eine
   additiv erweiterte Datenform nennt. Keine Änderung an `src/sim/`, `src/modell/`, `src/kern/`,
   `src/cli/`. Ansichten rufen weiter dieselben `Spiel.*`-Funktionen, Bus-Ereignisse und Handler.
2. **Test-Haken bleiben** (Klassen und Bedeutung; wer sie umbenennt, liefert nicht ab):
   `.ak-*` (Akte/Verdacht), `.lh-*` (Lernstand-Hilfe), `.kk-*` (Kompetenzkarte),
   `.kr-*` (Lernstand/Shop/Kunden-Gerüst), `.si-*` (Simulations-Panel), `.pdu-*` (PDU-Inspektor),
   `.in-*` (Inspektor), `.lb-dock*` (Dock), `.lk-*` (Leiste), `.bn-*` (Bento-Bausteine),
   `.sp-*` (Dialoge/Postfach), `.hb-*` (Heute), `.tr-*` (Training), `.wpal-*` (Palette),
   `[data-ansicht]`.
3. **Zustände bleiben erreichbar:** Hover, Tastaturfokus (`:focus-visible`), „Bewegung aus",
   fünf Themes (Nordlicht, Messing, Papier, Pulsar, Keramik), Hell/Dunkel. Neue Flächen nutzen
   **ausschließlich Tokens** aus `basis.css`; keine Farb-/Maß-Literale, Schrift nur `var(--fs-*)`,
   Abstände nur {0,4,8,12,16,24,32} px, Radius nur Tokens, kein `!important` außerhalb `basis.css`.
4. **Keine Emoji in UI-Chrome** (`tests/ui-symbole.test.js`, Ziel 0). `UI.symbol`-Glyphen oder
   erlaubte eigene Inline-SVGs; keine fremden Icon-Pakete. Kunden-Emoji aus `DATEN` wird durch
   Monogramme ersetzt, nicht neu eingebaut.
5. **Keine erfundenen Zahlen.** Anzeigen nur Werte aus `Spiel.*`/`DATEN`. Keine Fake-SLAs,
   keine erfundenen Balken. Was nicht gemessen/gespeichert ist, wird nicht behauptet.
6. **Sprache:** Deutsch, professionell, ruhig, kurze Sätze. Keine Werbeslogans, keine
   Ausrufezeichen-Ketten, keine Verniedlichung. Ein Primärknopf je Kachel/Ansicht.
7. **Bedienregeln:** Klickziele ≥ 44 px Höhe; kein horizontaler Überlauf bei 1440/960/720;
   Esc schließt, Enter bestätigt; sichtbarer Fokus; `prefers-reduced-motion` respektiert;
   Farbe nie allein als Information.
8. **Parallele Sitzung, tabu:** `tools/kiosk.py`, `tools/kiosk/`,
   `docs/entwicklung/Vorführfassung – Kiosk-Demo*.md`, `Programm/LIESMICH-Demo.txt` und die
   `.gitignore`-Änderung gehören **nicht** zu diesem Auftrag: nicht ändern, nicht löschen, nie
   `git add -A`. Vor jedem Commit `git status` und `git log -3` prüfen, nur explizite
   Pfade stagen.

## 2 · Gestaltungssprache (Bento 2.5, verbindlich)

- **12-Spalten-Raster**, Abstand 12/16 px; Kachel `.bn-k`: `1px solid var(--line)`,
  `var(--radius)`, `var(--panel)`, 16/24 px Innenabstand. Keine randlosen Textblöcke.
- **Ungleiche Größen, gleiche Kanten:** eine Hauptkachel, daneben kleinere; höchstens **eine**
  farblich hervorgehobene Kachel je Ansicht (`.bn-k.akzent`). Keine sieben gleich aussehenden Karten.
- **Kopf je Ansicht:** Mikrolabel (Mono, `--fs-1`, uppercase, `--faint`) · Titel (Display,
  `--fs-6` = 28 px) · ein Satz Kontext (`--fs-3`, `--muted`). Kein Riesen-Slogan ≥ 34 px.
- **Bausteine der Leitung:** `src/stil/bento.css` (`.bn-raster`, `.bn-k`, `.bn-kopf`,
  `.bn-kicker`, `.bn-titel`, `.bn-lead`, `.bn-meta`, `.bn-fuss`, `.bn-zeile`,
  `.bn-wert`, `.bn-chips`, `.bn-chip`, `.bn-marke`, `.bn-trenner`, `.bn-leer`,
  `.bn-s3…s12`) und `src/ui/bento.js` (`UI.bento.monogramm/initialen/kachel/kopf`).
  Wer sie erweitert, meldet es der Leitung — `bento.css`/`bento.js` gehören der Leitung.
- **Bewegung:** Hover `--line-2` + optional 1 px Hub, `var(--dauer)`; kein Glow, kein Dauerpuls
  außer vorhandenen Live-Signalen; bei „Bewegung aus" Standbild.
- **Farbe:** Semantik nur für Zustand (`--ok`, `--warn`, `--bad`, `--info`, `--geld`,
  `--ruf`), nie als Flächenbemalung. Kundenfarbe nur als Tint/Rail.

## 3 · Die sieben Stränge — Zielbilder, Konzepte, Dateien, Haken

### Strang A · Verdacht + Jobdoku — „Einsatzakte" (Schreib-Owner A)
**Problem heute** (gesehen): Verdacht ist ein Formular aus drei Schritten, die Beweise sind eine
schlichte Liste; beides belegt im Dock einen Reiter, der erst nach dem ersten Ping erscheint; die
Kette beobachten → messen → eingrenzen → Hypothese → handeln → dokumentieren ist nicht sichtbar;
Beweiskarten führen nirgendwohin.

**Zielbild „Einsatzakte/Dossier".**
- **Aktenkopf** (Mikrolabel `EINSATZAKTE · <Kunde>`, Vorgangsnummer aus dem Auftrag, Niveau-Chip,
  Beginn aus echten Daten) und **Schichtentreppe 1→2→3→4→7** als Register: je Schicht ein Feld mit
  Zahl der stützenden Beweise; Klick filtert die Karten (nur Sichtbarkeit).
- **Beweistimeline:** Karten mit Zeit, Quelle, Befund, Schicht-Rail; ★-Markierung bleibt.
  **Evidenzkarten klickbar zum Fundort** (Gerät/Port/Frame) über den zentralen Resolver aus Strang C
  (`UI.fehlerziel.springen`); Karten ohne Fundort bleiben ruhig ohne Aktion.
- **Hypothesen-Stempel:** Schicht → Ursache → Gerät als ruhige Auswahlzeilen (Chips/Liste, kein
  `select` für Schritt 3, Trefferfläche ≥ 44 px), Ergebnis als Stempel („Volltreffer",
  „Ursache stimmt", „Schicht stimmt", „daneben") — dieselbe Bewertung wie heute.
- **Dokumentationsfeld:** aufklappbarer Block „Dokumentation" aus echten Vorgangsdaten (Beweise,
  Hypothese, Treffer, geänderte Geräte aus `Spiel.geaenderteGeraete`), **„Einsatzbericht
  kopieren"** über `UI.kopieren`. **Keine Lösung verraten** (R1 bleibt: Grund/Schicht nur im
  Einstieg, AP-Niveau nur Werkzeugbefund).
- **Didaktische Leiter als Fortschrittsband** (beobachten · messen · eingrenzen · Hypothese ·
  handeln · dokumentieren) mit Haken aus echten Daten.
- Leerzustand: ruhige Kachel mit ehrlichem Satz und einem Weg (Ping/Kabeltest/Plan).

**Dateien:** `src/ui/akte.js`, `src/stil/akte.css`, `src/spiel/verdacht.js` (Logik nur
**additiv**, z. B. `Spiel.akte.schichten(i)`). **Haken:** `.ak-*` erhalten; neue Klassen mit
`ak-`-Präfix. `tests/spiel-akte.test.js` bleibt grün. **Test neu:**
`tests/akte-dossier.test.js` (Schichtensummen = Kartenzahl, Bewertung unverändert, Berichtstext
verrät vor dem Abschluss keine Lösung).

### Strang B · Lehrlings-/Lernstand — „Ausbildungs-Cockpit" (Schreib-Owner B)
**Problem heute** (gesehen): Liste aus Karriere-Balken, Kompetenzkarte mit viel „?", Prüfungsblock,
Fehlerheft als Stichpunkte, Abzeichen-Raster — sachlich, aber ohne Hierarchie, ohne „was jetzt?";
auf 1440 wirkt die Seite halb leer.

**Zielbild „Ausbildungs-Cockpit"** (sachlich, nicht gamifiziert):
- **Kopf:** Mikrolabel `AUSBILDUNG · ÜBERBLICK`, Titel „Lernstand", Kontextzeile mit Stufe,
  Serie, heutigen Übungen; rechts **Prüfungsreife-Kachel** (aus echten Werten: Ruf/Können/Prüfung),
  „Auswertung kopieren" bleibt als Geist-Knopf.
- **Kompetenzfelder** (Kompetenzkarte bleibt Baustein): 6 Regionen als Aktenregister mit
  Zustandslegende; Zustand als Text + Form, nicht nur Farbe; Nebel bleibt Nebel.
- **„Nächster Schritt"** prominent (fällige Fertigkeit, offenes Ziel, Prüfung möglich) mit genau
  einer Hauptaktion — die Antwort auf „was jetzt?".
- **Fehlerheft als Register:** je Fehler Zeile mit Fertigkeit, echtem Fehlertext, Datum und
  direktem Üben-Knopf (bestehender Weg `Spiel.karriere.training`), leerer Zustand ehrlich.
- **Behalten** (Trefferquote) als ruhige Messkachel mit ehrlichen „–" bei fehlender Messung.
- **Training-Empfehlungen** aus fälligen/schwachen Fertigkeiten (`L.istFaellig`/`L.behalten`),
  je Zeile ein Üben-Knopf — keine erfundenen Empfehlungen, keine doppelten Wege.
- **Prüfungsreife** als Kachel: Voraussetzungen aus `Spiel.stufeInfo()`/`Spiel.pruefung` mit
  Haken/offen, keine Prognose-Zahlen.
- Der Abschnitt von `lernstand-hilfe.js` (`.lh-*`) klinkt sich unverändert ein; der bestehende
  Hilfetext-/Vorrats-Vertrag bleibt (`spiel-lernstand-hilfe`, `hilfe-*` grün).

**Dateien:** `src/ui/lernstand.js` (nach Extraktion), `src/ui/lernstand-hilfe.js`,
`src/ui/naechster.js`, `src/stil/lernstand.css`, `src/stil/kompetenz.css`,
`src/stil/naechster.css`; lesen, nicht ändern: `src/spiel/karriere.js`,
`src/spiel/stufensystem.js`, `src/spiel/lernen.js`.
**Haken:** `.kr-seite/.kr-kopf`, `.lh-*`, `.kk-*`, `.nst-*`, `[data-ansicht="lernstand"]`.
**Test neu:** `tests/lernstand-cockpit.test.js` (DOM-Emulation): Kopf, Nächster Schritt,
Fehlerheft-Zeile, Behalten-„–", keine erfundenen Zahlen.

### Strang C · Simulator + Fehler→Ziel + Beginner-Hilfe — „Flugschreiber" (Schreib-Owner C)
**Problem heute** (geprüft): Ereigniskette mit Filterchips und Wiedergabe; Fehler-/Warnmeldungen
sind Text ohne Weg ins Ziel; der Dock-Reiter erscheint erst nach der ersten Aufzeichnung; Beginner
finden weder Werkzeug noch Stelle.

**Zielbild „Flugschreiber".**
- **Kopf:** Mikrolabel `FLUGSCHREIBER · <Kunde>`, Ergebnis (✓/✗) groß, eine Zeile Was/Wo,
  Transport (Play/Pause, Schritt, Tempo, alles ≥ 44 px), Format-Umschalter Ergebnis /
  Schritt-für-Schritt.
- **Warnbanner:** erster echter Fehler (Grund aus der Trace, nie erfunden) mit **„Zum Fundort"**.
- **Zeitachse mit Schichtbändern:** Ereignisse in Reihenfolge, je Eintrag Zeit, Gerät, Art,
  Kurztext; **jede Fehler-/Warnmeldung ist anklickbar** und springt ins Ziel.
- **Zentraler Resolver** `src/ui/fehlerziel.js`: `UI.fehlerziel.springen(ziel)` mit
  `{art:"geraet"|"port"|"kabel"|"frame"|"ebene", geraet, port, kabel:{a,b}, frame, ebene, werkzeug}`;
  Aktionen: Labor öffnen (falls nötig), Gerät/Port/Kabel auswählen, Inspektor zeigen, Ebenen wechseln,
  zentrieren/hervorheben, pulsierendes Highlight, **kein Fokusklau**, reduced motion respektiert.
  Ein Ort für alle: Strand A und D rufen denselben Resolver.
- **Beginner-Hilfe-Toggle** (persistiert in `store "einst"` als `anfaengerHilfe: bool`;
  Standard an bei Stufe 1–2, sonst aus, umschaltbar im Panel-Kopf und in den Einstellungen):
  an = Hinweise, Highlight des benötigten Werkzeugs/Interaktionselements, Schritt-für-Schritt aus
  `Spiel.naechsteDiagnose`/`Spiel.hilfe`; aus = ruhige Profi-Sicht. Keine neuen Bezahlwege.
- `src/spiel/hilfe.js` und `src/spiel/naechster.js`: nur **additive** Anzeigehilfen, keine
  Änderung bestehender Signaturen/Schwellen (`hilfe-*`, `naechster-schritt` bleiben grün).

**Dateien:** `src/ui/simpanel.js`, `src/ui/pdu.js`, `src/ui/fehlerziel.js` (neu),
`src/spiel/hilfe.js`, `src/spiel/naechster.js`, `src/stil/simulation.css`.

### Strang D · Rechte Sidebar/Inspektor — Einzelklick zeigt immer Infos (Schreib-Owner C)
**Problem heute:** Ist ein Werkzeug aktiv (Kabel, Ping, Verschieben …), verbraucht der Klick seine
Bedeutung; der Inspektor bleibt zu oder zeigt den letzten Stand.
- **Inspektor als Steckbrief:** Identität (Name, Typ, Rolle, Monogramm/Icon), Live-Teile (Strom,
  Ports mit Link-Status, IPs, VLAN, Zustand), Konfiguration, Aktionen; Tabs Übersicht/Ports/VLAN/…
  bleiben (≥ 44 px, `role="tab"`).
- **Einzelklick** auf Gerät, Port, Kabel, Zone oder Label öffnet unabhängig vom aktiven Werkzeug die
  passenden Infos in der rechten Sidebar, **ohne den Werkzeugmodus zu verlassen**; Auswahl sichtbar
  (Rahmen + Rail, nicht nur Farbe), Live-Werte aktualisieren.
- Klickpfad: `editor.js` — `pointerup` ohne Drag ruft `UI.labor.auswaehlen(...)` und öffnet
  den Inspektor-Reiter; Werkzeugmodus bleibt; Ports/Kabel haben eigene Trefferflächen.

**Dateien:** `src/ui/editor.js` (Klickpfad), `src/ui/inspektor.js`, `src/stil/inspektor.css`.
**Haken:** `.in-*`, `.lb-dock*`, `[data-reiter]`; `ui-editor-flaeche` und
`ui-trefferflaechen` bleiben grün. **Test neu:** `tests/inspektor-einzelklick.test.js`
(Klick mit aktivem Kabelwerkzeug öffnet Inspektor, `UI.labor.werkzeug()` unverändert).

### Strang E · Fenster/Shell — eigenständiges Programm (Schreib-Owner D)
**Problem heute:** Vollansicht trägt die **native Windows-Titelleiste** („amateurhafter
Fensterstrich"); die Bento-Kopfzeile sitzt darunter.
- **Vollansicht:** `decorations(false)` (in `fenster.rs` beim Modus „voll"), **integrierte
  Kopfzeile** im Bento-Stil: App-Monogramm + „NETZWERK-LABOR" + Fassung, Kennzahlen, Aktionen wie
  heute — in der Kopfzeile.
- **Eigene Drag-Region** (`data-tauri-drag-region` bzw. `startDragging` über `window.__TAURI__`),
  **Doppelklick maximiert/wiederherstellt**, **Fensterknöpfe** Minimieren/Maximieren/Schließen
  (44 px, `aria-label`, Tastatur, Fokusring). Kein Doppelklick-Konflikt mit Kopfzeilenknöpfen.
- **Leiste/Tray-Modus und Snap/Resize müssen weiter funktionieren** (Leiste 300×56 / 320×300, tray,
  immer oben, Ruhe). `src/ui/app.js` + `src/stil/rahmen.css` liefern Kopfzeile und
  Fensterknöpfe nur im Tauri-Modus (`Plattform.kann("tauri")`).
- **Abnahme:** `pwsh -File shell/entwickeln.ps1 -NurBauen`, `cargo tauri build --no-bundle`,
  `python tools/q-echt.py` (echte Maus, 0 Fehler), Fensterknöpfe im echten Fenster bedient.

**Dateien:** `shell/src-tauri/src/main.rs`, `shell/src-tauri/src/fenster.rs`,
`shell/src-tauri/tauri.conf.json`, `src/ui/app.js`, `src/stil/rahmen.css`; QoL-Teil:
`src/ui/palette.js`.

### Strang F · Shop — „Werkstattregal" (Schreib-Owner E)
**Problem heute** (gesehen): zwei Spalten, viel Leerraum, Werkzeuge als nackte Preiszeilen,
Automatisierung als Klappliste, Aussehen versteckt; kein Regal, keine Zustände auf einen Blick.
- **Bento-Shop** mit Warengruppen nach Aufgabe: **Werkzeuge** (Lerninhalt), **Automatisierung**
  (Playbooks + Slots), **Aussehen** (Theme/Akzent/Leistenstil mit Vorschau), **Verträge** als
  Verweis in die Kundenakte (kein zweiter Kaufweg).
- Je Artikel: Name, ein Satz Nutzen, Preis, **Zustand** (kaufbar/zu teuer/gekauft/aktiv/gesperrt)
  als Chip mit Text + Form, genau eine Aktion, ehrliche Empfehlung nur aus echten Daten.
- **Vorschau** für Aussehen: echte Token-Probe (Akzentfarbe/Leistenstil als Mini-Skizze), keine
  Fake-Bilder.
- **Kaufbestätigung** für teure Artikel (`preis >= 100 €`) als ruhiger Dialog mit Esc/Enter;
  bestehende Kaufwege `Spiel.shop.kaufen` und `tests/spiel-wirtschaft.test.js` unverändert.
- Keine Fake-Statistiken, keine Ramsch-Optik, eine Hauptaktion je Karte.

**Dateien:** `src/ui/shop.js` (nach Extraktion), `src/stil/shop.css`, `src/stil/karriere.css`
(Shop-Abschnitt, nur falls nach Extraktion noch Regeln dort stehen), `src/spiel/wirtschaft.js`,
`src/spiel/karriere.js` (Shop-Abschnitt, nur lesen/ergänzen).
**Haken:** `[data-ansicht="shop"]`, `.kr-*`-Gerüst; `tests/spiel-wirtschaft.test.js` bleibt grün.
**Test neu:** `tests/shop-regal.test.js` (DOM-Emulation): Gruppen, Zustands-Chip, genau eine
Aktion je kaufbarem Artikel, Bestätigung ab 100 €, Esc schließt.

### Strang G · QoL/Barrierefreiheit/Interaktion (Querschnitt, alle Owner)
**Top-Befunde, die jeder Strang behebt:**
1. Einzelklick statt Umweg (Inspektor, Akte, Simulator-Pfad) — Stränge A/C/D.
2. Sichtbarer Fokus in allen neuen Flächen (`:focus-visible`, Basis-Ring; kein `outline:none`).
3. Esc schließt, Enter bestätigt (Dialoge, Kaufbestätigung); Fokus kehrt zum Auslöser zurück.
4. Ziele ≥ 44 px in neuen Leisten/Knöpfen; keine 44-px-Riesenzeilen in Funktionsflächen.
5. `prefers-reduced-motion`/`UI.bewegung()` in jeder neuen Animation.
6. Farbe nie allein: Zustand zusätzlich als Text/Symbol/Form.
7. Lade-/Leerzustände ehrlich (kein leerer Kasten), Toasts mit Aktion nur wo eine Aktion existiert.
8. Kein Fokusklau (Simulator-Highlight, Leiste).
**Messung am Ende:** `tools/menueprobe.py`, `tests/ui-trefferflaechen.test.js`,
`tests/ui-kontrast.test.js`, `tests/ui-escape.test.js`, `tests/ui-typografie.test.js`,
`tests/ui-symbole.test.js`, `tools/ethos.py`, `tools/klassen.py`.

## 4 · Phase 0 (Leitung, vor dem Schwarm) — erledigt am 31.10.2026

1. **Audit** (Screenshots 1440/960 aller alten Flächen: `Nachweise/bento/vorher4/`; Befunde oben).
2. **Vorbereitende Extraktion ohne Feature:**
   - `src/ui/karriere.js` → `src/ui/lernstand.js` + `src/ui/shop.js`; gemeinsame Helfer
     (`overlay`, `training`, `kaufen`) bleiben als dokumentierte Helfer in `karriere.js` und
     werden über `UI.karriere._helfer` bereitgestellt; `UI.karriere.lernstandAnsicht` /
     `.shopAnsicht` bleiben als Alias erhalten (Rückwärtskompatibilität der Tests).
   - CSS: `src/stil/lernstand.css` + `src/stil/shop.css`; `karriere.css` behält nur die
     gemeinsamen Regeln (Kunden, Wiki, Mini, Einstellungen, `.kr-seite`/`.kr-kopf`/`.kr-raster`).
   - **Abnahme der Extraktion:** `node tests/run.js` unverändert grün (Zahl vorher/nachher),
     `klassen.py` 0, `ethos.py` GRÜN, keine sichtbare Änderung, Registrierungen/Exporte unverändert.
3. **Exporte/Registrierungen unverändert** heißt: Die Ansichten heißen weiter `lernstand`/`shop`,
   `UI.startHaken` meldet beide an, `UI.karriere` trägt weiter alle bisherigen Funktionen.

**Gemessenes Ergebnis der Extraktion (31.10.2026, selbst gemessen):**

| Prüfung | Vorher | Nachher |
|---|---|---|
| `node tests/run.js` | 878/878 grün | **878/878 grün**, 0 übersprungen |
| `python tools/klassen.py` | 0 | **0** |
| `python tools/ethos.py` | GRÜN (R2 19, R4 153, R9 58, R10 39) | **GRÜN**, gleiche Zahlen |
| `python tools/umlaute.py` | GRÜN | **GRÜN**, 0 offene Befunde |
| Bau | 134 Module | **136 Module** (lernstand.js, shop.js) |
| Lernstand-Bild 1440 | — | **byte-gleich** zur Vorher-Aufnahme (SHA256 identisch) |
| Shop-Bild 1440 | — | gleiche Fläche, gleiche Werte (nur Spielstand-Zähler „Tickets" unterscheidet sich wie bei jedem Lauf) |

Angepasst wurden ausschließlich drei **Test-Innenleben** ohne Semantikänderung (die ausgelagerten
Symbole werden in `lernstand.js` gesucht; der Escape-Test und der Lernstand-Hilfe-Test laden
`lernstand.js` mit, weil die Registrierung dort liegt): `tests/ui-symbole.test.js`,
`tests/ui-escape.test.js`, `tests/spiel-lernstand-hilfe.test.js`. Die Zahl der Tests (103 Dateien,
878 Fälle) ist unverändert. Neue Dokumentseite in `docs/doku/` erzeugt (57 HTML-Dateien).

## 5 · Team, Schreibrechte, Staging

| Owner | Dateien (Schreibrecht) |
|---|---|
| **A · Verdacht/Jobdoku** | `src/ui/akte.js`, `src/stil/akte.css`, `src/spiel/verdacht.js` |
| **B · Lernstand** | `src/ui/lernstand.js`, `src/ui/lernstand-hilfe.js`, `src/ui/naechster.js`, `src/stil/lernstand.css`, `src/stil/kompetenz.css`, `src/stil/naechster.css` |
| **C · Simulator/Inspektor/Fehlerziele** | `src/ui/simpanel.js`, `src/ui/pdu.js`, `src/ui/inspektor.js`, `src/ui/editor.js`, `src/ui/fehlerziel.js` (neu), `src/stil/simulation.css`, `src/stil/inspektor.css`, `src/spiel/hilfe.js`, `src/spiel/naechster.js` |
| **D · Shell/Fenster/QoL** | `shell/src-tauri/**`, `src/ui/app.js`, `src/stil/rahmen.css`, `src/ui/palette.js` |
| **E · Shop** | `src/ui/shop.js`, `src/stil/shop.css`, `src/stil/karriere.css` (nur Shop-Abschnitt), `src/spiel/wirtschaft.js`, `src/spiel/karriere.js` (nur Shop-Abschnitt) |
| **Leitung/Integration** | `src/stil/bento.css`, `src/ui/bento.js`, `src/stil/basis.css` (nur wenn zwingend), `docs/**`, `tools/**`, `tests/**`, `bauen.py`, Version, Build, Commit, Release |
| **Prüfer 1 (Bento-Design)** | read-only: Originalität, Konsistenz, Professionalität, Sichtprüfung |
| **Prüfer 2 (Theme/A11y/Struktur)** | read-only: 5 Themes + hell/dunkel, 44 px, Fokus, Haken, reduced motion |

**Regeln für alle:** ein Schreiber je Datei; **kein** Commit/Push durch Writer; **kein**
`git add -A`; keine Prozesse nach Namen beenden; keine Software installieren; nichts außerhalb
des Projektordners ändern; keine fremden Dateien anfassen (auch nicht die Kiosk-Dateien).
Eigene Tests nur **neu** anlegen (`tests/<strang>-*.test.js`), bestehende Tests nicht ändern —
wer eine Änderung braucht, meldet sie der Leitung. Private Vorschau mit
`python tools/vorschau.py --name <bereich>` + `python Nachweise/bento/foto.py --html vorschau-<bereich>.html --marke <bereich> --nur <ansichten>`;
**niemals** `python bauen.py` parallel. Finalbau nur Leitung.

**Bericht je Owner (an die Leitung, knapp):** Dateien · was gebaut · Bildpfad · Testzahlen
(vorher/nachher) · offene Punkte · „nicht geprüft".

## 6 · Abnahme (jeder Strang + Gesamt)

Sichtprüfung bei **1440/960/720** und in **allen 5 Themes + Hell/Dunkel**; je Zustand: keine
abgeschnittenen Texte, kein horizontaler Überlauf, klare Kachelkanten, eine Hauptaktion, keine Emoji,
keine erfundenen Zahlen, Fokus sichtbar, 44-px-Ziele, Bewegung-aus-Standbild.

**Gates je Strang:** `node tests/run.js` grün, `tools/klassen.py` 0, `tools/ethos.py`
GRÜN (R4/R9/R10 dürfen nicht steigen), `tools/umlaute.py` GRÜN, `node tools/sim-stand.js`
unverändert, `tools/seite.py --pruefen` GRÜN (nach Doku-Zug der Leitung).

**Zwei unabhängige Lesungen** (read-only): ① Bento-Design, ② Theme/Struktur/A11y. Befunde sammeln,
Fix-Runde je Strang, Lead-Abnahme; bei Bedarf zweite Lesung.

**Gesamt-Abnahme (Leitung):** `sh tools/test.sh --rauch`, `python tools/abnahme.py`,
`python bauen.py`, `python tools/einfach.py`, `python tools/stand.py`,
`python tools/seite.py`, `cargo tauri build --no-bundle`,
`pwsh -File shell/entwickeln.ps1 -NurBauen`, `python tools/q-echt.py` (echte Maus),
Screenshots final.

## 7 · Entscheidungen der Leitung (autonom, begründet)

1. **Phase-0-Extraktion wird durchgeführt**, weil die Stränge B/F sonst in einer 689-Zeilen-Sammeldatei
   arbeiten müssten und „ein Schreiber je Datei" sonst nicht einhaltbar ist.
2. **Gemeinsame Helfer** bleiben in `karriere.js` (`_helfer`) statt in ein neues Modul — kleinster
   Eingriff, keine Änderung der Lade-/Registrierungswege, Tests bleiben unverändert grün.
3. **Beginner-Hilfe** als `einst.anfaengerHilfe` (bool); Standard an bei Karrierestufe 1–2.
   Kein neuer Spielzustand, kein Kaufweg.
4. **Ein Resolver** (`UI.fehlerziel`) für alle Sprünge (Akte, Simulator, Inspektor, Fehlerbanner).
5. **Fensterknöpfe** nur im Tauri-Modus; im Browser bleibt die Kopfzeile ohne Knöpfe —
   `Plattform.kann("tauri")` entscheidet.
6. **Fassung 2.6.0**: erst wenn alle Gates grün sind, `tools/fassung-ziehen.py --neu 2.6.0`
   (Trockenlauf zuerst), `VERSION_CODE` in `android/bauen.py` von Hand auf **20601**, danach
   Build/Doku/Stand, Commit, Push `ausbau-1.2`, Tag `v2.6.0`, Release mit drei Anhängen,
   Live-Seite hashen. Push/Tag/Release sind durch den Nutzer ausdrücklich freigegeben (30.10.2026).
7. **Kein neues Feature am Spielstand-Format**; alle Anzeigen kommen aus vorhandenen Daten.
8. **R12** (`ethos --dom`) bleibt ungemessen — wie in den Vorrunden; die Entscheidung steht beim Nutzer.

## 8 · Abgrenzung

Nicht Teil dieses Auftrags: Android-APK (kein SDK), Kiosk-Demo-Dateien der parallelen Sitzung,
Themes (`zzz-thema-*.css`) anfassen, `src/sim/`-Verhalten ändern, neue Spielzustände,
R12-Einfrierung, Cloud/Server. Doku-Neubau, README-Bilder und Stand zieht die Leitung am Ende nach.


## 9 · Ergebnis (31.10.2026, gemessen) — alle Gates grün

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js` | **930/930 grün**, 0 übersprungen (109 Testdateien, 95 headless Module; +52 Fälle in 6 neuen Testdateien) |
| `sh tools/test.sh --rauch` | **45/45** (erster Auftrag mit echter Maus + 14 Ansichten × 3 Breiten) |
| `python tools/klassen.py` | **0 Klassen ohne CSS-Regel** |
| `python tools/ethos.py` | **GRÜN**, besser als der eingefrorene Stand (R1 24→23, R2 20→17, R4 169→140, R9 62→58, R10 42 = Stand); R12 nicht gemessen |
| `python tools/umlaute.py` | **GRÜN**, 0 offene Befunde |
| `node tools/sim-stand.js` | **Simulation unverändert** |
| Bau | **138 Module** (davon 95 headless) |
| Einzeldatei | **3.714.938 B**, SHA256 `b3c58ede…8506d2e`, 0 Außenverweise, `docs/index.html` byte-gleich |
| Windows-`.exe` | **8.948.224 B**, ProductVersion **2.6.0**, SHA256 `831da655…f3505e69` |
| Echte-Maus-Abnahme | Prüfbau mit eigener Kennung: **0 Fehler**, 5 ★, Fenster ohne Titelleiste (`dekoration:false`), Knöpfe 44 × 44, Maximieren/Wiederherstellen gemessen |
| Unabhängige Prüfungen | Bento-Design: A/B/D/E/F annehmbar, C+D nachgebessert (2 Punkte, erledigt). Theme/A11y: kein Release-Blocker, 6 mittlere Befunde (Fokusringe, 44 px, Hell-Kontrast, 720-Listenhöhe) **alle behoben**; R12 offen |

**Nicht gemessen:** R12 (`ethos --dom`), Android-APK (kein SDK), alle fünf Themes in jedem
Einzelstrang (Token-Prüfung + Stichproben), Screenreader, echte Maus außerhalb des Prüfbaus.
Die Veröffentlichung (Push, Tag `v2.6.0`, Release, Live-Seite) ist belegt in der
[Übergabe](<Übergabe – Stand 31.10.2026 – Runde 4.md>) § 7.
