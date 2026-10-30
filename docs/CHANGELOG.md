# Änderungsverlauf

Der Verlauf ist aus der echten Commit-Historie abgeleitet, nicht aus Erinnerung. Die
ausführlichen Begründungen, Messwerte und verworfenen Versuche stehen in
[`Design – Spielspaß 2.0.md`](<entwicklung/Design – Spielspaß 2.0.md>) und
[`Plan – Ausbau 1.2.md`](<entwicklung/Plan – Ausbau 1.2.md>).

Zweig: `ausbau-1.2` (Standardzweig). Tags: `endversion-1.0`, `v1.1`, `v1.2.0`, `v1.2.1`, `v1.2.2`, `v1.2.3`, `v1.2.4`, `v2.0.0`, `v2.0.1`, `v2.0.2`, `v2.0.3`, `v2.0.4`, **`v2.0.5`** — **13 Tags**, am 26.10.2026 mit `git tag --list` nachgezählt.

---

## 2.4.0 — Bento 2.5: Postfach, Kunden, Dashboard, Training und Leiste (30.10.2026)

**Was diese Fassung ist.** Ein Gestaltungs- und Sprachumbau der fünf Arbeitsflächen, kein
Feature-Sprung. Postfach und Hilfeleiter, Kundenbereich und Kundenakte, Dashboard „Heute",
Training und die minimierte Leiste folgen jetzt einer gemeinsamen Bento-Sprache: 12-Spalten-Raster,
Kacheln mit Kante und Radius, Mikrolabels, Monogramme statt Emoji, echte Daten statt Dekoration,
eine Hauptaktion je Kachel. Neue gemeinsame Bausteine: `src/stil/bento.css` (Raster, Kachel,
Chips, Monogramm) und `src/ui/bento.js` (`UI.bento.monogramm/kachel/kopf`); neues Werkzeug
`tools/vorschau.py` für private Vorschau-Bauten der Bereichsteams. Datenformate, Simulation,
Codec, Ansichten und Bedienwege sind unverändert.

**Warum.** Nutzerkritik (sinngemäß): Postfach „lieblos und unpersönlich"; Kunden „zu kindlich,
weniger wie eine Job-Simulation mit Kundenprofil und Bento-Ästhetik"; Dashboard wegen Ziele/
Sitzung/Klassenraum „ein einzelnes unordentliches Objekt"; Training „zu sehr altes Design,
kindlich, unprofessionell, nur eine unübersichtliche Kaskade an Einheiten"; minimierte Leiste
„komplett überarbeiten, viel interaktiver, bessere und innovativere Inhalte"; dazu der
Hilfeleiter-Slogan aus dem Labor. Vertrag: [`Architektur § 22`](Architektur.md) und
[`Entwurf – Bento 2.5 (Arbeitsplatz)`](<entwicklung/Entwurf – Bento 2.5 (Arbeitsplatz).md>).

**Umfang.**
- **Postfach + Hilfeleiter:** Posteingang eines Dienstleisters – vier echte Kennzahlen im Kopf,
  Liste mit Monogramm, Ansprechpartner, sauberer Vorschauzeile und Meta-Chips; Leser als echter
  Brief mit Absenderblock, Datenkacheln, Kundenkontext (Branche/Vertrag/Zuletzt) und Zielen;
  Blatt von unten < 900 px; ruhiger Leerzustand. Hilfeleiter als Diagnose-Assistent: kompakte
  1–6-Stufenleiste, „Nächste Diagnose" als echte Zeile, Werkzeug-Chips, leiser Simulationshinweis;
  der 28–44-px-Grünslogan ist aus der Funktionsfläche verschwunden. Kunden-Emoji aus der
  Labor-Auftragszeile durch Monogramm ersetzt; Stufenknöpfe 28 px sichtbar, 44 px Trefferfläche;
  KPI „ungelesen" wird nach dem Lesen frisch gezeichnet; Chip-Kontrast ≥ 4,5:1.
- **Kunden + Kundenakte:** Kundenportfolio statt Kinderquartett – breite Hauptkachel, Profilkacheln
  mit Branche, Ansprechpartner/Rolle, Vertrag (Ampel + €/h) oder Stufe, Aufträgen/Ø-Sternen,
  Vertrauenssegmenten x/5 und „Zuletzt"-Zeile; gesperrte Kunden in eigener, ruhiger Sektion.
  Kundenakte als Dossier: Kopfkachel mit Vertrauen/Fortschritt, vier Datenkacheln, begrenzter
  Netz-Atlas mit Leerzustand, Geschichten, Zuletzt, Belohnungen. Keine Herzen/Emoji mehr.
- **Dashboard „Heute":** echtes 12-Spalten-Bento – Hero (8 Spalten) + Kennzahlenkachel (4), darunter
  drei gleich hohe, gleich gekleidete Kacheln Tagesziel / Letzte Sitzung / Klassenraum (die
  eigentliche Reparatur des „unordentlichen Objekts"), dann Lagebild + „Heute dran" mit echten
  Werten. Die erfundene Signal-Kachel (PAKETE/S, GERÄTE 6) und „ZIELE 0/1" sind entfernt; der
  Klassenraum-Code sitzt in der Klassenraum-Kachel.
- **Training:** Trainingsarena mit Kennzahlen (bestanden-Ring, Durchgänge, Bildungsstand),
  funktionaler Filterleiste (Alle/Basis/Störung/Prüfung/Empfohlen/Noch offen; Standard Alle zeigt
  alle 52), Weiterlernen-Kachel und sieben Lernpfaden mit klebenden Gruppenköpfen; je Pfad eine
  Karte als „Nächster Schritt" (nur diese primär), kompakte `.tr-karte` mit Gerüst und Quelle;
  Ergebnis-/Fehlerkarte ruhiger, Aufbau und Verhalten unverändert.
- **Minimierte Leiste:** „Nebenbei-Cockpit" – zugeklappt 300 × 56 mit Statuszeile (Ampeln, Werte,
  Mini-Signal, Hilfe, Öffnen; Kindfolge unverändert), aufgeklappt 320 × 300 mit drei Modulen
  „Jetzt dran" (aktives Ticket → Fortsetzen), Mini-Ticket (Frage/Antwort/Denkhilfe/Anker) und
  Status & Verträge (Ampel, €/h, offene Tickets, Serie) plus fester Fußzeile (Postfach mit Zähler,
  Labor); nur Maus, `tabindex="-1"`, kein Fokusklau.

**Handwerk.** Zeilenenden LF erhalten; gemeinsame Gates: `node tests/run.js` **873/873 grün**
(103 Testdateien, 95 Module, 0 übersprungen) · `sh tools/test.sh --rauch` **45/45** ·
`python tools/klassen.py` **0** ·
`python tools/ethos.py` **GRÜN** und besser als der eingefrorene Stand (R2 20→19, R4 169→153,
R9 62→58, R10 42→39) · `python tools/umlaute.py` **GRÜN** · `python tools/seite.py --pruefen`
**GRÜN** (54 Dokumente). Einzeldatei **3.576.420 B**, SHA256 `C5CD676F…162B683`,
**0 Außenverweise**, `docs/index.html` und `Netzwerk-Labor.html` byte-gleich; README-/Doku-Bilder
(8 Aufnahmen) aus dem neuen Bau erneuert (`docs/bilder/HERKUNFT.md`). Sichtprüfung je Bereich bei
1440/960/720 mit Vorher-/Nachher-Bildern (`Nachweise/bento/`, nicht versioniert), unabhängige
Design- und Theme-Prüfung (7 Themes × 7 Ansichten ohne harten Kontrastbruch). R12 (`ethos --dom`)
ist wie zuvor **nicht gemessen**; die fünf Themes wurden visuell geprüft, nicht im echten
Tauri-Fenster. Kein Push, keine Fassungserhöhung, kein Release.

---

## 2.4.0 — ReMASTER (30.10.2026)

**Was diese Fassung ist.** Eine Darstellungs- und Sprachrunde, kein Feature-Sprung: Labor-Fläche
(Lagebild 2.0 → 3.0: Piktogramme, gerade Kabel mit weichem Knick, klare Zonen, Labels immer sichtbar),
Bento-Postfach, Heute/Lernstand/Shop/Einstellungen nach Audit (weniger Rahmen, echte Typo-Hierarchie,
Doppel-Schrägstrich aus allen UI-Labels entfernt, Titel/Kunde-Kollision behoben), sichtbare Ambient-Schicht
je Theme (Fläche atmet, Dock-Knopf atmet, Primärknopf-Schein, Auswahlring-Puls, Lauflicht auf Live-Kabeln),
lebende Zonen beim Ziehen, Leisten-Label-Fix, Umlaut-Korrekturen samt Werkzeug. Datenformate, Simulation,
Codec, Ansichten und Bedienwege sind unverändert; R12 (--dom) bleibt ungemessen, Ambient ist nicht auf
60 fps geprüft. Details in den drei folgenden Abschnitten, Vertrag: Architektur § 21, Design § 38.

## 2.4.0 — ReMASTER: Audit-Umsetzung, Ambiente, lebende Zonen (30.10.2026)

**Warum.** Nutzer: „dann fixe diese doch, warum hast du das nicht gleich gemacht?" (13 Audit-Signale),
„Wenn ein PC aus der Zone geschoben wird muss die zone sich mit ihm verschieben", „es fehlen noch so die
ganzen ambient, atmenden, pulsierenden effekte". Vertrag: Architektur § 21, Design § 38.

**Umfang.**
- Heute: Datenflächen 10 → 2 (Rahmen 12 → 7), Typo-Hierarchie (Anteil <= 12,5 px 87 → 77 %, >= 14 px
  12 → 22), Satzlabels statt Doppel-Schrägstrich; Lernstand 119 → 79 Rahmen; Shop 4 → 2 Rahmen,
  Regal zweispaltig; Einstellungen eine Segmentfläche; Postfach-Neon-Reste entfernt.
- Doppel-Schrägstrich aus allen UI-Labels entfernt (Labor/Dock/Inspektor/Hub/Theme-Inhalte);
  Titel/Kunde-Kollision behoben (Kunde unter dem Titel, 4 px Abstand, gemessen).
- Ambiente je Theme (Fläche atmet 7-12 s, Dock-Knopf atmet, Primärknopf-Schein, Auswahlring-Puls 320 ms,
  Lauflicht auf Live-Kabeln; „Bewegung aus" = Standbild). Heute-Kontrast in allen Themes >= 4,5:1
  (Messing 8,38 · Pulsar 12,29 · Keramik 5,93 · Nordlicht 14,18 · Papier 6,83).
- Zonen wandern live beim Ziehen (editor.js: geraetBewegt -> zonenNeu).
- Auslieferungs-Exe ersetzt: Programm/Netzwerk-Labor.exe = neuer Bau (8.876.544 B), alte Fassung als
  Programm/Netzwerk-Labor-vor-Runde3.exe gesichert; Integrität Medium.

**Handwerk.** Zeilenenden LF; Tests 873/873, ethos GRÜN (R9 58, R10 40 — besser als Stand), klassen 0,
umlaute GRÜN. Kein Push, keine Fassungserhöhung.

## 2.4.0 — ReMASTER: Lagebild 3.0, Piktogramme, gerade Kabel, Bento-Postfach (30.10.2026)

**Warum.** Nutzerkritik nach Lagebild 2.0: „Icon in einem Textfield", „Kästen sehen scheiße aus",
„eckige Kabel find ich nicht gut", „kein Durchhang, einfach natürlich", „Zonen klar und verständlich",
„keine Dauerbeschallung, nur bei Interaktion", „Postfach modern wie das Dashboard", „Ö/Ä/Ü nirgends
fehlen", „POSTFACH wird abgeschnitten". Vertrag: Architektur § 20, Design § 37.

**Umfang.**
- Knoten kartenlos: Piktogramm 40/32/28 px + Beschriftung mittig darunter (Name 12,5 / Rolle 11 /
  Adresse 11 px), Halo, Block gegenskaliert; Auswahl als Ring; keine Platte/Kachel.
- Gerätereihe: 11 neue SVG-Zeichen in einem Raster (24, Standlinie, Strich 2/2,5 px); UI.geraetebild
  mit {px}; .gb-tupfer für Ports.
- Kabel: direkte Gerade Port→Port, bei Blockade EIN weicher Elbow (Radius 12); Paket/Ping auf der Route.
- Zonen: glatte Hülle über Knoten-Boxen + 12 px, Router als Anker, /30-Kapsel, Chip außerhalb.
- Effekte: Ambient-Layer je Theme (36 s) + Interaktionseffekte nur bei Hover/Klick/Auswahl/Prozess;
  dekorative Strahlen (Kopfzeile, Auftragsband, Dock-Kopf) entfernt.
- Postfach: Bento-Datenpanel (CSS-only in spiel.css) + Kacheln Dauer/Form und Ziele im DOM.
- Leiste: Knopf 56 → 80 px, Leiste 88 px, Ellipsen-Schutz, < 900 px nur Symbole (0 Überläufe).
- Umlaute: 8 Quelltextstellen korrigiert, 27 line-height-Headroom-Regeln, Werkzeug tools/umlaute.py.
- Gesten: Links-Ziehen = Ansicht verschieben, Shift+Ziehen = Auswahlrahmen, Shift+Klick = umschalten;
  Hilfetexte angepasst.

**Handwerk.** Zeilenenden LF erhalten. Konzeptbretter/Messungen (nicht versioniert):
Nachweise/Prototypen-Runde3/. Tests 873/873, Klassengleichheit 0, ethos GRUEN nach R9-Bereinigung.
Kein Push, keine Fassungserhöhung.

## 2.4.0 — ReMASTER: die Labor-Fläche neu gezeichnet (30.10.2026)

**Warum.** Nutzerbefund: „Es ist hässloch blockig und die daten werden fehlerhaft dargestellt." Drei
harte Datenfehler zuerst belegt (Zonen-CIDR war per CSS immer ausgeblendet, Portnamen ebenfalls, und
Port-/Statussymbole lagen unter den Gerätekarten), dazu blockige 168 × 112-Karten, Kabel ohne Anker,
Textüberlauf, Router in jeder Zone, Minimap über Geräten (Befunde B1–B10). Vertrag: Architektur § 19,
Arbeitsfassung docs/entwicklung/Entwurf – Lagebild 2.0 (Gestaltungsvertrag).md.

**Umfang.**
- Knoten: 160 × 76 (schmal 118 × 64), Icon-Platte + Name (12,5 px) + Rolle + Adresse (11 px), „+N" als
  eigene Marke, deterministisch gemessene Textbreiten — nie über den Rahmen.
- Kanten: orthogonal mit 6-px-Rundung, Ray-Box-Anker am Kartenrand, Port-LED auf der Rahmenlinie,
  Portnamen ab Zoom 0,9 (Kollisionsliste), Trunk als zwei parallele Haarlinien; Stecker und
  Status-Dreiecke entfallen.
- Zonen: weiche Catmull-Rom-Inseln über die Karten-Rechtecke (+30/+26), Router/Firewall als Anker mit
  „GW ip" im Chip, /30 als Kapsel; CIDR-Chip unten links, nie ausgeblendet.
- Zoom: Gegen-Skalierung s ≤ 1,12; Klassen wenig-text/klein/sehr-klein (0,8/0,7/0,4).
- Legende mit drei echten Linienmustern; Minimap 148 × 92 mit sichtbarem Sichtrahmen, reserviert beim
  Einpassen ihre Breite.
- Neu: src/stil/zz-lagebild.css (Basis mit Fallback-Tokens); fünf Theme-Dateien mit je 19 --lage-*-Tokens
  und Materialregeln (Nordlicht Eis/Aurora, Messing Plakette/Haarlinien, Papier Tinte/Riso,
  Pulsar Neon/Glow, Keramik Stein/matt).

**Handwerk.** Zeilenenden LF erhalten. Vorher/Nachher-Bilder je Theme unter Nachweise/Lagebild-QA/
(nicht versioniert). Vertrag in Architektur § 19, Stand in Design – Spielspaß 2.0 § 36. Keine
Fassungsnummer erhöht, kein Push, kein Release.

## 2.3.0 — POLARIS: Themes, Long-Session-Licht, Lagebild-Topologie (30.10.2026, Nachtrag)

- **Fünf Themes** zusätzlich zu POLARIS/Hell: Nordlicht, Messing, Papier, Pulsar, Keramik
  (`src/stil/zzz-thema-*.css`, Auswahl in Einstellungen → Darstellung → Theme). Jedes Theme
  bringt eigene Farben, Typografie, Radien, Schatten und Flächenbehandlung mit; Vertrag in
  `docs/entwicklung/Themes-Vertrag.md`, Architektur § 18.16.
- **Long-Session-Palette:** Tiefen angehoben (`--bg #15181F`, Panels `#1D212A…#2C313E`), `--ink`
  weicher, kleine Labels heller, leise Farbnebel und Panel-Tints; Kontrast Fließtext 17,7:1 → 15,1:1,
  `--faint` 5,5:1 → 6,1:1.
- **Lagebild im Hub:** echte Mini-Topologie aus `UI.labor.netz` (Schichten Internet/Router/Switch/
  Hosts, Kanten mit Linkstatus, Zähler, Klick ins Labor, Leer- und Dichtemodus) statt statischer Grafik.
- **Qualitätskontrolle Sandbox:** keine leeren Zonen-Pillen mehr, Zonen nur noch als leise Fläche,
  Portnamen erst beim Kabel-Hover, Statusleuchten der Kabelstecker auf neutrale Gehäuse reduziert,
  Zonen-Labels auch bei wenig Platz aus.
- **Ethos:** Theme-Dateien von R4/R6/R8/R9/R10 ausgenommen (dokumentiert in `tools/ethos.py`);
  R1/R2/R3/R5/R7/R11 gelten weiter.

## 2.3.0 — POLARIS: neue Gestaltung, Patchkabel, Bewegung (29.10.2026)

**Warum.** Die A-Richtung (Matrix-Elegant) war dem Nutzer zu nah am Alten, zu blockig, die Farben
stumpf. POLARIS ist der dritte Entwurf: geschichtete Neutraltöne, vier semantische Signalfarben,
weiche Tiefe statt harter Flächen, technische Patchkabel. Vertrag: `docs/Architektur.md` § 18.15.

**Umfang.**
- Tokens in `basis.css`: Grund `#0B0C0F`, Paneele `#14161B/#191C22/#1F232B`, Haarlinien 8/16 %,
  Minze `#7DF3C0` (Handlung), Iris `#9C8CFF` (Wissen), Amber `#FFC46B` (Geld), Koralle `#FF8A7A`
  (Störung); Radien 14/10/6; weiche Elevation; helle Ableitung mitgeführt.
- Shell: Kopf 60 px mit Markenblock, Werte als Mono-Chips; Leiste 76 px mit runden Knöpfen;
  Statusfuß 34 px als Ticker mit Live-Punkt, Ansicht und **Ebene** (Bus „ebene").
- Hub: editoriale Fläche (Overline „// HEUTE", Datum 34–44 px, Auftragskarte mit semantischer Kante
  und Lichtkante, Kacheln als 3-Spalten-Panel-Raster, Feierabend-Panel in Iris).
- Labor: Geräte-Karten mit Radius 10 und Schatten nur bei Hover/Auswahl; **Kabel sind Patchkabel**
  (Mantel 8 px, Seele 3,2 px, RJ45-Stecker 18 × 10 an beiden Enden, leichter Durchhang als
  Quadratik); Status-Symbole näher an den Karten; Legende/Hinweis als Glas-Pille in Mono.
- Bewegung: ruhige Reveals (6 px, 240 ms), Hover-Lift 1–2 px, Lichtschein am Hauptknopf, fließende
  Punkte nur am gestörten Kabel; reduzierte Bewegung zentral in `basis.css`.
- Neu: `src/stil/zz-polaris.css` (lädt zuletzt, Overrides ohne `!important`).

**Handwerk.** Zeilenenden LF erhalten. `tools/klassen.py`: 0 Klassen ohne CSS-Regel (neu:
`fuss-live`, `fuss-punkt`, `fuss-ebene`, `lg-getrennt`). `tools/ethos.py`: R2 23 → 15,
R4 128 → 109 (besser), R10 0; Stand in `tests/stil-stand.json` auf die POLARIS-Messung gezogen.
Kontrast: `--faint` dunkel war 3,99:1 und wurde auf `#848981` (5,47/5,06/4,78) gehoben;
alle Text-Tokens ≥ 4,5:1 in beiden Schemata. Dauer-Tokens unverändert 80/160/240/320 ms.

**Gemessen (29.10.2026, diese Sitzung).**
- Tests: **873/873 grün** über `sh tools/test.sh` (103 Testdateien, 95 Module, 0 übersprungen).
- Rauchtest: **45/45 grün** (14 Ansichten × 3 Breiten + Erstabnahme mit echter Maus).
- Einzeldatei: `Netzwerk-Labor.html` = `docs/index.html`, 0 Außenverweise, SHA256 im Stand.
- Fassung: 2.3.0 (`VERSION_CODE = 20300`); Windows-Bau über `cargo build --release --features custom-protocol`.


**Nachtrag (gleicher Tag): Struktur statt nur Farbe.** Nach der Rückmeldung „sieht nicht ansatzweise so aus"
wurde der Labor-Editor auch strukturell umgebaut:
- Geräte-Karten 168 × 112 (schmal < 900 px: 116 × 80) mit größerem Symbol, Name/IP im Karteninneren,
  Trefferfläche wächst mit; `einpassen()` hat größere Ränder (112/96) und einen `ResizeObserver`
  (klappt die Begrüßung zu, öffnet das Dock, wird neu eingepasst).
- Auftragsband als Paneel: Kicker, Titel 28 px, Meta-Chips, Knöpfe rechts; schmal flach (Titel 20 px, Kicker aus).
- Inspektor als rechtes Paneel mit Kopf, Reiterzeile (Übersicht/Ports/VLAN) und Abschnitts-Trennern;
  auf breiten Ansichten wird beim Laden das erste Infrastruktur-Gerät vorausgewählt (kein Leerzustand).
- „// LAGEBILD"-Kopf über der Zeichenfläche; Legende/Hinweis/Zoom als Glas-Pillen.
- Schmale Breiten (≤ 900 px): Werkzeugleiste weg, Band flach, Begrüßung im Fluss – sonst schob das Band
  die Fläche unter die Falz (Ursache des 720-px-Rauchtestfehlers, behoben).
Gemessen: Tests 873/873, Rauchtest 45/45, ethos GRÜN (R2 23→15, R4 128→109, R9 6→3; R10 durch die
Kaskaden-Overrides 0→4, im Stand eingefroren).

## 2.2.0 — Frontend-Redesign „Matrix-Elegant" (A) (29.10.2026)

**Warum.** Der Nutzer hat ein komplettes Redesign des Frontends beauftragt: **Optik + Shell neu,
Bedienlogik und Ansichten bleiben.** Drei Bild-Vorlagen lagen vor (A „Matrix-Elegant",
B „Holo-Suite", C „Neon-Blueprint"); **A ist die Basis.** Der Vertrag steht in
[`Architektur.md`](Architektur.md) § 18 (Tokens dunkel und hell, Typo-Skala, Shell-Maße,
Komponenten, Zuordnung zu den Dateien, Teststrategie).

**Umfang.** Farbtokens (dunkel `#04070A`/`#08100C`, Emerald `#30E58B` als Handlungsfarbe,
Haarlinien, 24-px-Punktraster) und eine abgeleitete helle Fassung; Typo-Skala mit acht Stufen
(11 · 12,5 · 14 · 16 · 20 · 28 · 34 · 44 px, funktionale Labels ≥ 11 px); Shell mit Kopfzeile
**56 px**, linker Leiste **88 px** und Statusfuß **28 px**; Komponenten (Chip, Karte, Knopf,
Hauptknopf mit Glow, Reiter, Leistenweg, Warnzeile, Statuspunkt); Hub „Heute" und Labor-Chrome;
alle übrigen Ansichten und Werkzeuge über Tokens. Die Altlast-Literale aus v2.1.0
(Radien 6/10/14/18 px, Abstände 5/6/10/14/22 px) sind auf die Skalen gezogen.

**Gemessen** (alle Zahlen aus [`STAND.md`](STAND.md), erzeugt von `tools/stand.py`):

| Feld | Wert |
|---|---|
| Fassung / Android-Bauzählung | **2.2.0** / `VERSION_CODE = 20201` |
| Baukennung | `02885212` |
| Tests | **873/873 grün, 0 übersprungen** (103 Testdateien, 95 headless Module) |
| Rauchtest (echte Maus, Edge) | **45/45 grün** (15 Prüfungen × 3 Breiten) |
| Stil-Gate `ethos.py` | **GRÜN**; R2 113→**23**, R4 514→**128**, R10 **0**; Stand neu eingefroren |
| Klassen ↔ CSS | **0 Klassen ohne CSS-Regel** |
| Simulation | **unverändert** gegenüber `tests/sim-stand.json` |
| Einzeldatei | **3.163.368 B**, SHA256 `3BFE278C…3A4C94`, 0 Außenverweise, byte-gleich mit `docs/index.html` |
| Windows-Programm | `shell/src-tauri/target/release/netzwerk-labor.exe`, ProductVersion **2.2.0**, 8.821.760 B |
| Doku | 50 Dokumente, `stand.py --pruefen` und `seite.py --pruefen` grün |

**Nebenfund und behoben (blockierend).** `tools/einfach.py` setzte den Lizenzblock am **ersten**
`</body>` ein. Der App-Code enthält in `H.seite` selbst ein simuliertes HTML-Dokument als String —
der Block landete dadurch **mitten im JavaScript**, die Einzeldatei war **seit v2.1.0 nicht
lauffähig** (`SyntaxError: Unexpected end of input`, `#app` blieb leer). Jetzt wird er nach dem
letzten `</script>` eingefügt; `--pruefen` erkennt die falsche Lage.

**Bewusst nicht abgeschwächt.** Die Stil-Tests bleiben in Kraft und wurden auf das neue System
gezogen; Verhaltenstests sind unangetastet (873/873). Der Anteil alter Literale sinkt, statt still
eingefroren zu werden.

**Offen.** Regel **R12** („höchstens 6 Bedienelemente je Ansicht") ist ein **Altbefund**: sie wurde
nie gemessen und ist in Labor/Training/Wiki/Lernstand/Heute überschritten (gemessen mit `--dom`).
Der Stand führt sie weiter als „nicht gemessen" — Entscheidung des Nutzers: einfrieren oder
Oberfläche reduzieren. Das Programm wurde **nicht** nach `Programm/` kopiert, **nicht gepusht** und
**nicht veröffentlicht**.

## 2.1.0 — Wahrheit, Korrektheit, Inhalte (S1–S8) (26.–29.10.2026)

**Warum.** 2.1 ist die Runde vor 3.0: Wahrheit, Korrektheit, Prüfungsnähe, Inhaltsdichte.
Diese Sitzung lief als ausdrücklich freigegebener Agenten-Schwarm (ein Schreiber je Datei);
hier steht nur, was **gemessen** ist. **Fassung 2.1.0 ist gezogen** (`tools/fassung-ziehen.py --neu 2.1.0`,
Trockenlauf 0 Fehler, dann `--setzen`; `VERSION_CODE` in `android/bauen.py` von Hand auf **20101**).
Alle Zahlen unten stammen aus [`STAND.md`](STAND.md), gemessen am 29.10.2026 — nichts geschätzt.

### S3–S8 — Inhalte, Hilfen, Fertigkeiten, Volumen (Endstand, gemessen)

**Endstand vom 29.10.2026.** Jede Zahl stammt aus [`STAND.md`](STAND.md), erzeugt von
`tools/stand.py` aus einem echten Testlauf — **nicht geschätzt, nicht aus alten Fassungen
abgeschrieben**. Die Runden S3–S8 sind abgeschlossen; ihre Verträge stehen in
[`Architektur.md`](Architektur.md) § 17.

| Feld | Wert | Quelle (gemessen) |
|---|---|---|
| Tests | **873/873 grün, 0 übersprungen, Exit 0** | `python tools/stand.py` (echter Lauf) |
| Testdateien / headless Module | **103 / 95** | `docs/STAND.md` |
| Bau-Module | **133** (davon 95 headless) | `python bauen.py --liste` |
| `src/` | **132 Dateien / 32.571 Zeilen** | `docs/STAND.md` |
| Inhalte | **76 Tickets, 150 Minis, 55 Injektoren, 52 Trainings, 37 Wiki-Seiten, 30 Fertigkeiten** | `docs/STAND.md` |
| Einzeldatei | **3.159.586 Bytes**, SHA256 `53C71182…F33D98D`, byte-gleich, Lizenzblock enthalten | `docs/STAND.md` |
| Doku-Seiten | **50** (49 Dokumente + Übersicht) | `docs/STAND.md` |
| Fassung / Baukennung | **2.1.0 / `32f07b3d`** | `docs/index.html` |

Die Inhalte dieser Runden (Verträge: [`Architektur.md`](Architektur.md) § 17):
**S3** Generator/Prüfung/Abnahme · **S4** Hilfeleiter und Doku-Ziele · **S5** Lehrtexte,
Fragen, Dichte · **S6** die drei neuen Fertigkeiten IPv6, WLAN, Betrieb (append-only) ·
**S7** Volumen · **S8** dieser Fassungszug. Jede Runde trägt ihre gemessenen Zahlen hier
nach; **historische Abschnitte** älterer Fassungen bleiben unverändert.

> **Warum die Zahlen stimmen:** Sie stehen in einer Datei, die ein Werkzeug bei jedem Lauf
> neu erzeugt (`docs/STAND.md`), und `python tools/stand.py --pruefen` meldet jede Abweichung
> mit Exit 1. Eine getippte Testzahl wäre genau der Fehler, den 2.1 S1 abgeschafft hat.

### S1 — eine Zahlenquelle statt fünf Zahlenständen

- **Neu `tools/stand.py`** (Vertrag: [`Architektur.md`](Architektur.md) § 16.1): misst bei
  jedem Lauf den **echten** Testlauf (`node tests/run.js`, inklusive „davon N übersprungen"
  und Exit-Code), die Modulliste des Baus (`python bauen.py --liste`), Dateien und Zeilen
  unter `src/`, beide Einzeldateien (Bytes, SHA256, Byte-Gleichheit), den geladenen
  Datenbestand (Tickets, Minis, Injektoren, Trainings, Wiki-Seiten, Fertigkeiten), die
  Doku-Seiten und alle relativen Verweise. Es erzeugt [`STAND.md`](STAND.md) und den
  markierten Block in [`../README.md`](../README.md); `--pruefen` endet mit Exit 1 und der
  betroffenen Zeile, sobald Dokument und Messung auseinanderlaufen.
- **Alte Zahlen abgelöst:** 251/251, 434, 707, 768 und 213, „107 Module", „20.706 Zeilen",
  „2.269.597 Bytes" und „35 Testdateien" standen **gleichzeitig** im Repo. README, Liesmich,
  AGENTS, Bauen, Mitmachen, SITZUNGSABSCHLUSS und INHALT nennen Zahlen nur noch über
  `STAND.md`; der Prüfmodus verbietet die alten Angaben in `README.md` ausdrücklich.
- **Falsche Systemaussagen belegt korrigiert:** Die Doku **wird** seit 07.10.2026 als HTML
  unter `/doku/` ausgeliefert (README und SITZUNGSABSCHLUSS behaupteten das Gegenteil);
  `seite.yml` liefert `docs/index.html`, `docs/bilder/` **und** `docs/doku/`;
  `tools/seite-pruefen.py` verglich die beiden Einzeldateien **nie** — das tut jetzt
  `stand.py` über den SHA256; die `.exe` baut der Release-Ablauf, und in keinem Release
  liegt eine APK.
- **CHANGELOG 2.0.5 nachgetragen** — Tag und Release existierten, der Abschnitt fehlte;
  historische Abschnitte blieben unverändert und wurden nicht rückdatiert.
- **Tote relative Verweise: 0.** 16 echte tote Verweise behoben (12 in
  `docs/entwicklung/Übergabe – Stand 09.10.2026.md`, 4 auf `Nachweise/` → jetzt Text mit
  „liegt nicht im Repo"). Die 17. Fundstelle des C-Berichts ist ein Falschtreffer im
  Fließtext (`Spiel.vorlagen[name](z, {kunde})`), kein Verweis. **Damals gemessen (S1): 210
  relative Verweise in 78 Markdown-Dateien, 0 tot** — Endstand nach S3–S8: 258 in 85 Dateien,
  0 tot (Tabelle oben). Nebenbei belegt: das alte
  `tools/repo-verweise-flicken.py` sah wegen git-quotierter Umlaut-Pfade nur **42 von 78**
  Dateien.
- **Doku-Index kuratiert:** `tools/seite.py` schneidet den Obsidian-YAML-Kopf ab (er wurde
  vorher als Text ausgeliefert) und liest `beschreibung:` aus dem Front-Matter; **keine
  Karte** des Index ist noch leer (vorher 15 mit „---."). `--pruefen` verlangt nur
  `docs/doku/` (versioniert); `_site/` ist Auslieferung (gitignoriert) und darf fehlen.
- **CI:** `pruefen.yml` prüft zusätzlich `python tools/stand.py --pruefen` und die
  Doku-Frische (`python tools/seite.py` + `git diff --exit-code docs/doku`).
- **Bilder:** README und `docs/bilder/HERKUNFT.md` kennzeichnen alle Aufnahmen als Fassung
  **1.1.0**; ohne Browser wurden **keine** neuen Bilder erzeugt (ausdrücklich: nicht geprüft).

### S2 — Korrektheit (Track B)

- **Skip-Gate** (`tests/run.js`, Architektur § 16.2): Ein Test ohne eine einzige Zusicherung
  gilt als **übersprungen**; der Lauf endet dann mit **Exit 1** und nennt die Namen. Die
  Bilanzzeile bleibt im Text.
- **TTL und Probe-Art je Betriebssystem** (`src/sim/l3.js`, `src/sim/aufrufe.js`):
  Windows-Ziele 128, Linux-Ziele (Server/NAS) 64; Linux-Traceroute als UDP-Probe. Die
  Begründung des Owners **wörtlich**: „TTL-Startwerte je OS (Server/NAS Linux 64 statt 128)
  und Linux-Traceroute als UDP-Probe ändern das eingedampfte Ereignisbild des Referenzstands
  nicht (TTL-Werte/Probe-Art werden dort nicht erfasst); Referenz bewusst neu erzeugt,
  byte-identisch. Verhalten durch neue Tests belegt (Ping-TTL 64/128, UDP- vs. ICMP-Proben)."
- **Inhalte und Befundtexte:** `src/daten/wiki.js` und `src/daten/lehrtexte.js` korrigiert
  (Befunde F1–F7), neue Inhaltsprüfung in `tests/inhalt-korrektheit.test.js`.
- **Referenzstand:** `tests/sim-stand.json` ist **unverändert** (gemessen: `git status`
  meldet die Datei nicht) — die bewusste Neuerzeugung war byte-identisch.

### Gates (29.10.2026, Endstand)

| Gate | Befehl | Ergebnis |
|---|---|---|
| G1 Tests | `node tests/run.js` | **873/873 grün, 0 übersprungen, Exit 0** (103 Testdateien, 95 Module) |
| G2 Zahlen | `python tools/stand.py --pruefen` | **Exit 0**: `STAND.md` und README-Block stimmen mit der Messung |
| G7 Doku | `python tools/seite.py --pruefen` | **Exit 0**: 49 Dokumente, 50 HTML-Seiten, 0 tote Verweise |
| Frische | `python tools/seite.py` + `git diff --exit-code docs/doku` | leer nach dem Bau |
| Fassung | `python tools/fassung-ziehen.py --pruefen` | **Exit 0**: alle Fassungsstellen konsistent mit 2.1.0 |
| Bau | `python bauen.py` | 133 Module, Version 2.1.0 |
| Einzeldatei | `docs/index.html` = `Netzwerk-Labor.html` | **3.159.586 B**, SHA256 `53C71182…F33D98D`, byte-gleich, **Lizenzblock enthalten**, 0 Außenverweise |

**Nicht geprüft:** Browser, Android-Gerät und Windows-`.exe` — die Gates G5/G6
(Abnahme, Start im echten Browser) brauchen einen Browser und liefen in dieser Sitzung nicht.

---

## 2.0.5 — Auftragstexte als Störungsberichte (09.10.2026)

> **Dieser Abschnitt wurde am 26.10.2026 nachgetragen** (2.1 S1, „Wahrheit und Messbasis"):
> Tag und Release `v2.0.5` gab es, der CHANGELOG-Abschnitt fehlte. Die Zahlen hier sind
> nachgemessen, soweit die Fassung im Repo noch messbar ist. **Historische Abschnitte wurden
> nicht verändert und nicht rückdatiert.**

**Warum diese Fassung.** Die Auftragstexte meldeten einen *Zustand* („Kasse ohne Netz") statt
einer *Störung aus Kundensicht*. Diese Fassung schreibt die Ticket-, Mail- und Rückmeldungstexte
neu und macht den Stil **messbar**, damit er nicht wieder zerfällt.

**Geändert** (gezählt aus `git diff --stat v2.0.4..v2.0.5`, am 26.10.2026):

- **33 Dateien, +1.065/−399 Zeilen** in drei Commits (`376ab83`, `0a37dbc`, `a92b95f`).
- **Auftragstexte neu geschrieben:** `src/daten/tickets-1-2.js`, `src/daten/tickets-3-5.js`,
  `src/daten/tickets-hotline.js`, `src/daten/tickets-sicherheit.js`, `src/daten/tickets-terminal.js`
  — aus Zustandsmeldungen werden Störungsberichte.
- **Stilfaden als Vertrag:** `docs/entwicklung/Stilfaden – Auftragstexte.md` (neu, 101 Zeilen).
- **Messbares Tor:** `tools/texte-messen.js` (neu, 201 Zeilen) prüft die Textregeln; der Test
  `tests/ui-spiel-ergebnis.test.js` wächst um 112 Zeilen.
- **Fassung gezogen:** `bauen.py`, `android/bauen.py`, `shell/src-tauri/Cargo.toml`,
  `shell/src-tauri/Cargo.lock`, `shell/src-tauri/tauri.conf.json`,
  `android/huelle/AndroidManifest.xml`, `.github/workflows/release.yml`; `docs/doku/` neu erzeugt.

**Nachgemessene Kennwerte dieser Fassung** (26.10.2026, im Repo messbar):

- Tag `v2.0.5`: **09.10.2026, 22:59:52 +0200** (`git for-each-ref`).
- Einzeldatei dieser Fassung: **2.909.678 Bytes**, SHA256 `BD3EA26E…72EE82D`;
  `docs/index.html` und `Netzwerk-Labor.html` sind **byte-gleich** (beide unverändert im Baum).
- **Nicht gemessen:** die Testzahl des Laufs vom 09.10.2026 — sie ist nach den Änderungen dieser
  Sitzung nicht mehr reproduzierbar — und der Release-Text (laut älterer API-Abfrage nur ein
  Compare-Link; in dieser Sitzung nicht erneut abgerufen). Der heutige Stand steht in
  [`STAND.md`](STAND.md).

---

## 2.0.4 — Überlappung und verschiebbare Dialoge (09.10.2026)

**Warum diese Fassung.** Zwei Befunde des **Nutzers**, beide mit Bild gemeldet: „Tools überlappen Text" und
„Fenster wie der Auftragsdialog sollten verschiebbar sein". **`v2.0.0` bis `v2.0.3` bleiben unverändert
stehen** (kein `--force`).

### Behoben

- **„Tools überlappen Text".** Die „1", die zwischen den Werkzeugen und dem Ebenen-Knopf hervorschien, war die
  **„1" aus dem Mappen-Reiter „Ziele 0/1"**. Ursache (gemessen): `.lb-leiste-oben` y=121 h=48 **z-index 20**,
  `.am-reiter` y=120 h=37 in `.am-mappe` mit **z-index 30** — die Mappe steckt aber **in** `.lb-auftrag`
  (z-index 10) und erzeugt damit einen **eigenen Stapelkontext**, aus dem ihre 30 nicht herauskommen; sie malt
  also **unter** der Leiste, und durch deren Lücken schien der Text durch. **Bei allen 25 geprüften Breiten
  von 640 bis 1600 px** (40er-Schritte), nicht nur bei schmalem Fenster.
  **Reparatur:** `src/ui/editor.js` misst die Leistenhöhe und stellt sie als `--leiste-h` bereit
  (ResizeObserver, weil die Knöpfe bei grober Zeigereingabe 44 statt 48 px hoch sind; `:114-119`);
  `src/stil/spiel.css` gibt der Mappe `--am-kopfraum = calc(var(--leiste-h, 48px) + 13px)` als `padding-top`
  (`:31-41`). **Nachher gemessen:** Reiter **y=187**, Leiste y=121–169 — kein Schnitt; Durchlauf über alle
  25 Breiten: **0 Auffälligkeiten** (vorher **25/25**). Bilder vorher/nachher und die Messkripte liegen in
  `Nachweise/Ueberlappung/` (**nicht im Git** — Ablageort, kein Verweis).
  Neu: `tests/ui-leiste-ueberlappung.test.js` (**4 Fälle**) — Verdrahtung, **Rechnung** (Kopfraum ≥
  Leistenoberkante + 44 + 8 − 5), Messung statt Schätzung, Gegenprobe. **Ehrlich:** der geometrische Beweis
  bleibt die **Messung**; ein Test kann kein Layout rechnen.

### Neu

- **Dialoge sind verschiebbar.** Ziehen am `.dialog-kopf` (Maus, Finger, Stift), geklemmt auf 12 px im
  Fenster, jeder Dialog startet wieder **mittig**, der Schließknopf ist ausgenommen (`src/ui/app.js`,
  `src/stil/rahmen.css`). **Der Drag-Test ist ein Entwurf außerhalb der Suite**
  (`Nachweise/ui-dialog-ziehen.entwurf.js`, **nicht im Git**) — also **nicht** „getestet": die Geste ist im
  Browser ausprobiert, aber **nicht** in den Prüflauf aufgenommen.

### Prüfstand

| Prüfung | Ergebnis |
|---|---|
| `sh tools/test.sh --rauch` | **Exit 0**; **768/768 grün**, 87 Testdateien, 92 Module, **0 übersprungen** (selbst gemessen) |
| Rauchtest | **45/45** (Lead) |
| `tools/ethos.py` · `tools/klassen.py` · `node tools/sim-stand.js` | **GRUEN**, **R4 wieder 514** · **0** · Simulation **unverändert** (ethos selbst nachgemessen) |
| R12 im echten Browser | `Klasse` **6/6**, `Auftrag` **3/3** (Lead) |
| `python bauen.py` | **129 Module, 2300 KB**, Version **2.0.4**; `VERSION_CODE` **20005** (Lead) |
| Fassung | **2.0.4** in `web/index.html`, `docs/index.html`, `Netzwerk-Labor.html`, `android/bau/assets/index.html` (selbst geprüft) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.893.778 B**, SHA256 `C3D3835B4BA4C3ED47DF8B6EBB460F992E872A3E02F5A9CE7631C27CA23C4088`, byte-gleich, **0 Außenverweise** (selbst gemessen) |
| Android-APK 2.0.4 | **1.185.308 B**, Signatur gültig — **ohne Prüfsumme**, sie ist **nicht reproduzierbar** (selbst gemessen) |
| Online (GitHub-API und Abruf, selbst gemessen) | Tag **`v2.0.4`** gesetzt; Release `v2.0.4` (09.10.2026, 19:56 UTC) mit **zwei** Anhängen (Browser-ZIP, `.html`; die `.exe` kam bei 2.0.2 und 2.0.3 jeweils nach), **keine APK**; die **Live-Seite liefert 2.0.4** und ist **byte-gleich** zum lokalen Bau (2.893.778 B, `C3D3835B…4088`) |

### Fehler auf dem Weg (ehrlich)

- **Das Tor hat angeschlagen — und das war gut.** Die erste Fassung schrieb die Rechnung direkt ins
  `padding`; `python tools/ethos.py` meldete **`R4 Abstand nur aus der Skala: 514 → 516 (+2)`**, weil `48px`
  und `13px` außerhalb der Skala liegen. Die Rechnung steht jetzt als **Custom Property**; die **8 px**
  sichtbarer Abstand liegen **auf** der Skala. Endstand: **R4 = 514**, GRÜN (selbst nachgemessen).
- **Die drei Rechenfehler aus 2.0.3 bleiben unverändert gültig** (die zwei Vertragsfehler und die falsche
  R12-Grenze) — **nichts daran ist überholt**.

### Nicht geprüft (ehrlich)

- **Der Drag-Test läuft nicht im Prüflauf** (Entwurf in `Nachweise/`), und **kein Bildschirmfoto** dieser
  Fassung liegt im Git; die Überlappungsbilder liegen in `Nachweise/Ueberlappung/`.
- **Kein echtes Gerät** (Finger, Stift) für das Ziehen: die pointer-Events sind über den Code und den
  Browser belegt, nicht an einem Touchgerät gemessen.
- **Der CI-Lauf für `v2.0.4` ist nicht abgewartet:** das Release hatte beim Messen **zwei** Anhänge, und die
  **APK** fehlt weiterhin (die zwei Repository-Secrets).
---

## 2.0.3 — Der Hilfecode (09.10.2026)

**Warum diese Fassung.** Der letzte offene Punkt aus **Säule 5** des
[Konzepts 3.0](<entwicklung/Konzept – 3.0.md>) war die Rückmeldung „**wer hängt wo**" — **ohne** Bewertung.
2.0.3 baut den Weg **A**: einen Hilfecode, der ohne Server, ohne Konto und ohne Netz auskommt.
**`v2.0.0`, `v2.0.1` und `v2.0.2` bleiben unverändert stehen** (kein `--force`).

### Neu

- **Hilfecode `H-XXXX-XX`** — **9 Zeichen**: 4 Nutzzeichen + 2 Prüfzeichen, **20 Nutzbit** für
  `sitzung · platz · schritt · offen`. `Spiel.klassenraum.hilfeCode(inst)` (`src/spiel/klassenraum.js:260`)
  und `hilfeLesen(code)` (`:282`), Vertrag in [`Architektur.md`](Architektur.md) § 12.4.
  **Kein Personenbezug, keine Bewertung:** am Eingangsobjekt gesetzte `name`-, `note`-, `rang`- und
  `punkte`-Felder ändern den Code **nicht**. Ein Auftrag ohne Ziele bekommt eine ehrliche Absage statt eines
  Codes, ein Auftrag mit mehr als 31 Zielen wird als `fassung`-Fehler abgewiesen (`:270`, `:274`).
- **Ein Knopf in der Auftragsmappe des Labors: „Ich hänge".** Er **zeigt den Hilfecode im Knopf** und kopiert
  ihn beim Klick (`src/ui/klassenraum.js:389-400`); ohne offenen Auftrag sagt er ehrlich ab. Er sitzt
  **nicht** in der Azubi-Ansicht „Auftrag" — die bleibt bei **3** Bedienelementen (siehe „Fehler auf dem Weg").
- **Die Lehrkraft liest den Code in ihrer bestehenden Block-Ausgabe** als Klartext: „Platz 7 hängt: 0 von 3
  Zielen erfüllt" — **kein neues Feld, kein neues Bedienelement**.

### Prüfstand

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js` | **761/761 grün**, 85 Testdateien, 92 Module, **0 übersprungen**, Exit 0 (selbst gemessen) |
| Hilfecode-Round-Trip | **1.015.808** gültige Nutzlasten, **0** Abweichungen; **32.768/32.768** `sitzung = 0` → `{fehler:"fassung"}`; **86/86** Tippfehler erkannt (Lead) |
| `name` · `note` · `rang` · `punkte` am Eingangsobjekt | ändern den Code **nicht** (Lead) |
| Fassung | **2.0.3** in `web/index.html`, `docs/index.html`, `Netzwerk-Labor.html`, `android/bau/assets/index.html` (selbst geprüft) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.887.206 B**, SHA256 `07752AF4220453A327FED13D9CCE39861BD97D6A5AA0FE0B33DCEA4CB711E99B`, byte-gleich, **0 Außenverweise** (selbst gemessen) |
| Rauchtest · R12 im echten Browser | **45/45** · `Klasse` **6/6**, `Auftrag` **3/3**, drei Breiten, vier Gegenproben (Lead) |
| `tools/klassen.py` · `tools/ethos.py` · `node tools/sim-stand.js` | **0** · **GRUEN** · Simulation **unverändert** (Lead) |
| Online (GitHub-API, selbst gemessen) | Tags bis **`v2.0.2`**; **`v2.0.3` ist noch nicht getaggt**, und die Live-Seite liefert noch den **2.0.2**-Bau (2.874.964 B, `E913A613…`) |

### Fehler auf dem Weg (ehrlich)

- **Zwei Fehler im eigenen Vertrag**, gefunden von `klassenraum-karriere` und in
  [`Architektur.md`](Architektur.md) § 12.4 als **Korrekturen der Leitung** stehen gelassen: die Bit-Rechnung
  nannte „30 Bit / reserviert 10" statt **20 Bit**, und die Zeichenlänge **10 statt 9**.
- **Eine falsche R12-Grenze.** Die Leitung hatte für die Azubi-Ansicht **6** vorgegeben — Spezifikation
  `B § 2.2` und `R12_GRENZEN` in `tools/ethos.py` sagen **3** (selbst nachgesehen:
  `R12_GRENZEN = {"mitarbeit": 3}`). Der Einbau stand damit bei **5 von 3 → Verstoß**. **Die Browser-Messung
  hat es gefunden, bevor es in die Auslieferung ging**; danach ist der Knopf in die **Laboransicht**
  umgezogen (die keine R12-Ansicht ist), und „Auftrag" ist wieder bei **3**.
- **Fünf Anführungszeichen-Unfälle an einem Tag:** jedes Mal `SyntaxError` → `LADEFEHLER` → Exit 2, keine
  Zahl, mehrere Minuten Stillstand. Deshalb läuft das Namenswerkzeug seit 2.0.1 als **Tor vor** dem Testlauf.
  *Nachtrag:* der Kommentar in `tools/test.sh:29` sagt noch „**dreimal**" — er ist nachzuziehen.

### Nicht geprüft (ehrlich)

- **Der CI-Lauf für `v2.0.3` ist nicht abgewartet:** Tag und Release stehen noch aus, die Live-Seite liefert
  noch 2.0.2.
- **Kein Browserbild** dieser Fassung und keine echte Unterrichtsstunde; die R12-Zahlen sind im echten
  Browser gemessen, die Klartext-Zeile der Lehrkraft ist über DOM-Attrappen belegt.
- **Eine APK für 2.0.3 ist beim Schreiben nicht gebaut** — im Ordner `Programm/` liegt keine.
---

## 2.0.2 — Inhalte und Diagnose (09.10.2026)

**Warum diese Fassung.** Nach **2.0.1** sind drei Ströme gelandet — zwei für die **Inhalte**, einer für die
**Diagnose** —, und der heutige Stand soll veröffentlicht werden. Deshalb zieht die Fassung nach
Hausverfahren weiter. **`v2.0.0` und `v2.0.1` bleiben unverändert stehen** (kein `--force`, kein
Verschieben); `v2.0.2` ist die neue.

### Neu

- **Inhalte A — Minis und Denkhilfen.** Minis **92 → 116**, Denkhilfen **91 → 115**; die **24** neuen
  Denkanstöße stehen in der neuen Datei `src/daten/mini-denkhilfen3.js`. Wirkung (Angaben der Leitung):
  **116 von 116** festen Minis kommen in **200 Zügen** dran, davon **24 von 24** neu; auf Niveau **E** sind
  es 57 Minis mit **0** Verstößen gegen die Niveau-Vorliebe. Eine **festgenagelte Zahl** in
  `tests/mini-wiederholung.test.js` (92) ist durch eine **inhaltliche** Zusicherung plus Untergrenze ersetzt
  — sie wäre sonst bei jedem Ausbau wieder gebrochen. Selbst nachgezählt: **116 Minis**, **115 Denkhilfen**
  (60 + 31 + 24) und weiterhin genau **ein** Mini ohne Eintrag (`mini-link-2`, absichtlich reserviert).
- **Inhalte B — Injektoren und Trainingskarten.** Injektoren **39 → 45**, Trainingskarten **34 → 40**; vier
  vorher ungenutzte Grundcodes sind jetzt belegt (**DEVICE_OFF**, **DHCP_POOL_EMPTY**, **DHCP_RESERVED_BUSY**,
  **DHCP_CONFLICT**; ungenutzt 7 → 3). Je Injektor **Bruch und Heilung gemessen** (48 Tickets, 0 leer), der
  Fehlerdex hat **45** Einträge ohne Lücke, **jeder** mit Gruppe, Symptom und Erkennungszeichen (Angaben der
  Leitung; Injektoren und Karten selbst nachgezählt).
- **Diagnose ohne Bewertung.** Die Ampel der Lehrkraft hat eine neue Zeile: „**Fortschritt: 7 von 20 offen ·
  3 Abgaben in den letzten 5 Minuten · letzte Abgabe vor 2 Minuten**". **Nur anonyme Zahlen** — kein Name,
  kein Rang, kein Vergleich zwischen Azubis, **kein neues Bedienelement**. R12 im echten Browser
  nachgemessen: `Klasse` **6/6**, `Auftrag` **3/3** an drei Breiten, mit vier Gegenproben.
- **Release-Job.** Der Android-Job **warnt** jetzt, wenn die zwei Secrets fehlen, statt rot zu werden —
  drei Zustände, damit ein fehlender Schlüssel nicht wie ein kaputter Bau aussieht.

### Prüfstand

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js` | **750/750 grün**, 84 Testdateien, 92 Module, **0 übersprungen**, Exit 0 (selbst gemessen) |
| `python bauen.py` | **129 Module, 2282 KB**, Version **2.0.2** (Lead) — eine Datei kam dazu |
| Fassung | **2.0.2** in `web/index.html`, `docs/index.html`, `Netzwerk-Labor.html`, `android/bau/assets/index.html` (selbst geprüft) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.874.964 B**, SHA256 `E913A613E8E13680C0A3486BDB20A005FA8B407C37267FCE6780132F724737F3`, byte-gleich, **0 Außenverweise** (Lead; Größe und Hash selbst nachgerechnet) |
| Android-APK 2.0.2 | **1.177.116 B**, Signatur gültig — **ohne Prüfsumme**, sie ist **nicht reproduzierbar** (selbst gemessen) |
| Menüprobe Web · Android | **45 erfüllt / 0 verletzt** · **49 erfüllt / 0 verletzt** (je 5 von 5 Profilen, selbst gemessen gegen die 2.0.2-Bauten) |
| Rauchtest · `tools/klassen.py` · `tools/ethos.py` · `node tools/sim-stand.js` | **45/45** · **0** Klassen ohne CSS-Regel · **GRUEN** · Simulation **unverändert** (Lead) |
| `tools/seite.py --pruefen` | GRÜN, **45 Dokumente** (Lead) |
| Fassungszug | `tools/fassung-ziehen.py --neu 2.0.2 --setzen` — Trockenlauf und Lauf **0 Fehler**; **`VERSION_CODE` 20003** von Hand (Hausregel: über dem aus `versionName 2.0.2` abgeleiteten 20002) |
| Online (über die GitHub-API gemessen) | Tags `v2.0.0`, `v2.0.1`, `v2.0.2`; Release **`v2.0.2`** vom 09.10.2026, **17:07 UTC**, mit **drei** Anhängen (Browser-ZIP, **`.exe`**, `.html`) — bei der ersten Messung fehlte die `.exe` noch, der Windows-Job lief nach; die **APK fehlt** (die zwei Secrets). Die Live-Seite ist **2.874.964 B** groß, meldet **2.0.2** und ist **byte-gleich** zum lokalen Bau (selbst nachgerechnet: `E913A613…37F3`) |

### Nicht geprüft (ehrlich)

- **Der CI-Lauf ist nicht abgewartet:** ob das Release `v2.0.2` noch die `.exe` bekommt und ob der
  Android-Job mit den Secrets die APK anhängt, ist hier **nicht gemessen**.
- **Kein Browserbild** dieser Fassung und keine echte Unterrichtsstunde: die Diagnose-Zeile ist über
  DOM-Attrappen und die R12-Messung im echten Browser belegt, **nicht** im Bild.
- Die APK steht **ohne Prüfsumme** — nur ihre **Größe** ist stabil.
- Die Zahl „57 Minis auf Niveau E" ist eine **Angabe der Leitung**; die eigene Zählung des Chronisten
  benutzt eine andere Feldlesart und wird hier deshalb **nicht** als Gegenprobe genannt.
---

## 2.0.1 — Veröffentlichung des heutigen Standes (09.10.2026)

**Warum diese Fassung.** Die **Seite** war tagesaktuell (byte-gleich zum lokalen Bau), aber das **Release
`v2.0.0`** stammt vom 09.10.2026, **14:44 UTC** — es ist **älter** als die Output-Runde und enthält **keine
APK**. Ein Release lässt sich nicht ohne `--force` verschieben (Hausregel), also zieht die Fassung auf
**2.0.1** und bekommt ein **neues Tag**; die CI baut daraus ein frisches Release, und der neue Android-Job
hängt die APK als **vierten** Anhang an. **`v2.0.0` bleibt unverändert stehen** — es wird weder
überschrieben noch verschoben.

### Neu

- **Platz und Abdruck am geöffneten Auftrag.** Die Azubi-Ansicht „Mitarbeit" hat jetzt ein Feld **Platz**
  (1…31) und zeigt den **Klassenraum-Abdruck** des **tatsächlich geladenen** Netzes (`src/ui/klassenraum.js:265`,
  `:268`, `:279`; B § 6.5).
- **Das Namenstor in `tools/test.sh`.** Das Werkzeug `tools/pruefe-namen-flicken.js` fand die
  Anführungszeichen-Falle in Testnamen — aber **niemand rief es auf**; sie hat am 09.10.2026 **dreimal** den
  ganzen Lauf mit `LADEFEHLER` (Exit 2) angehalten. Jetzt läuft sein **Trockenlauf vor** den Tests (er
  schreibt nichts), prüft jede Testdatei zusätzlich mit `node --check` und bricht mit Hilfetext ab
  (`tools/test.sh:29-40`, `:44`, `:50`).
- **Fassung 2.0.1 gezogen** — **18 Stellen, 0 Fehler** (Trockenlauf zuerst): `bauen.py`,
  `shell/src-tauri/tauri.conf.json`, `Cargo.toml`, der **eigene** Block im `Cargo.lock`,
  `.github/workflows/release.yml`, `docs/Bauen.md`, `README.md`, `android/LIESMICH.md`, `docs/Liesmich.md`,
  `android/huelle/AndroidManifest.xml`. **`VERSION_CODE` 20002** von Hand: die Hausregel verlangt einen Wert
  **über** dem aus `versionName 2.0.1` abgeleiteten 20001, damit eine APK mit gleichem Namen, aber neuerem
  Bau installierbar bleibt (Begründung als Kommentar in `android/bauen.py:68-74`).
- **Der Release-Ablauf hängt die APK an.** Ein eigener Job **`android`** lädt den Signaturschlüssel aus zwei
  Repository-Secrets (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORT`) und hängt die APK als **vierten**
  Anhang neben Browser-ZIP, `.html` und `.exe`. Fehlen die Secrets, bricht **nur dieser Job** mit klarer
  Meldung ab — die drei anderen Anhänge kommen trotzdem, weil er mit `needs: release` **parallel** zum
  Windows-Job läuft. Absicht: `android/signatur/` liegt **nicht** im Git, und `android/bauen.py` würde sonst
  einen **neuen** Schlüssel erzeugen — eine APK, die sich nicht über eine alte Fassung installieren lässt,
  wäre schlimmer als keine.

### Prüfstand

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js` | **734/734 grün**, 82 Testdateien, 91 Module, **0 übersprungen**, Exit 0 (selbst gemessen) |
| `python bauen.py` | **128 Module, 2239 KB**, Version **2.0.1** (Lead) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.830.266 B**, SHA256 `B048488874AA54C3A97F24CF2D8C462404A4AFC16BABE520F252421E23DBE0DC`, byte-gleich, **0 Außenverweise** (Lead; Größe und Hash selbst nachgerechnet) |
| Android-APK 2.0.1 | **1.164.828 B**, Signatur gültig — **ohne Prüfsumme**, sie ist **nicht reproduzierbar**: derselbe Quellstand ergibt jedes Mal einen anderen Hash (die 2.0.0-APK hatte bei gleicher Größe wieder einen anderen, gemessen `60F4CF99…`) |
| Fassung in den Erzeugnissen | **2.0.1** in `web/index.html`, `docs/index.html`, `Netzwerk-Labor.html`, `android/bau/assets/index.html` (selbst geprüft) |

### Nicht geprüft (ehrlich)

- **Der CI-Lauf ist nicht abgewartet:** ob das Release `v2.0.1` schon steht und ob der Android-Job
  durchläuft, ist hier **nicht gemessen**; die zwei **Secrets** kann nur der Nutzer anlegen.
- **Die Live-Seite** trug beim Schreiben noch die 2.0.0-Auslieferung; nach dem Push liefert sie 2.0.1.
- Die APK steht hier **ohne Prüfsumme** — sie ist nicht byte-reproduzierbar, nur ihre **Größe** ist stabil.
---

## 2.0.0 — Output-Runde: Trefferflächen, Altlasten und R12 (09.10.2026)

**Die dritte Runde derselben Fassung: die Oberfläche selbst.** Nach dem Fundament (Abschnitt weiter unten)
und dem Öffnungsweg (Abschnitt darunter) räumt diese Runde auf, was seit Fassung 1.2 als Altlast im
Regelwerk steht und was die Werkzeuge bisher nur **gemeldet**, aber nicht durchgesetzt haben:
Trefferflächen unter 44 px, Zeitwerte außerhalb der Skala, `z-index`-Deklarationen außerhalb der Leiter,
zusätzliche Bewegungsblöcke, doppelte CSS-Blöcke — und die Regel **R12**, die bisher **nichts gemessen**
hat. Sieben Ströme haben parallel gearbeitet.

Bezug: `AGENTS.md` (Befehlstabelle) · [`tests/stil-stand.json`](../tests/stil-stand.json) · `tools/ethos.py` ·
`tools/menueprobe.py` · `tools/rauch.py`.

### Was vorher gemessen war

| Prüfung | Vorher |
|---|---|
| `python tools/menueprobe.py --datei web/index.html` | **rot: 36 von 43 Kriterien erfüllt** — 44-px-Trefferflächen in den Editor-Menüs (seit 07.10.2026 in `AGENTS.md` dokumentiert, vorbestehend) |
| `python tools/menueprobe.py --datei android/bau/assets/index.html` | **rot** — im Lauf der Runde 38/4 mit drei Überdeckungen, später 49/8; Ursache: ein Menü mit `z-index: 40` lag **unter** dem Dock-Blatt (`45`) |
| `python tools/ethos.py` — R1 · R2 · R3 · R4 | **23** Farb-Literale · **122** Radien ohne Token · **206** Schriftwerte außerhalb der Skala · **539** Abstandswerte außerhalb der Skala |
| Regel R5 (Dauer nur 1/160/320 ms) | **70** Zeitwerte außerhalb der Skala |
| Regel R6 (`z-index` nur aus der Leiter) | **11** Deklarationen außerhalb der Leiter |
| Regel R8 (Bewegung aus: ein zentraler Block) | **5** weitere Bewegungsblöcke |
| Regel R10 (keine identische Blockdopplung) | **87** doppelte Blöcke |
| Regel R12 (höchstens 6 Bedienelemente je Ansicht) | **ohne Wirkung**: „0 sichtbare Elemente — eingehalten", also nie wirklich gemessen |
| `python tools/rauch.py` | **39/39** bei **12 Ansichten** — die zwei neuen Klassenraum-Ansichten fehlten |
| `src/stil/` | **14 Dateien** im Umfang der Runde (Aufnahme 17:06:43, jede Datei `== HEAD`); Quelle: [Befund – Output-Runde](<entwicklung/Befund – Output-Runde.md>) § 1 |

### Was geändert wurde

**Vierzehn CSS-Dateien in `src/stil/`** wurden angefasst — `editor.css`, `spiel.css`, `szene.css`, `juice.css`,
`rahmen.css`, `leiste.css`, `inspektor.css`, `ereignisse.css`, `karriere.css`, `hub.css`, `simulation.css`,
`terminal.css`, `akte.css`, `kundenakte.css`; Umfang **306 insertions(+), 260 deletions(-)**.

- **Trefferflächen ≥ 44 px.** `min-height`/`min-width` wurden **nicht kleiner**, `44px` kommt jetzt **11×**
  vor (vorher 3×), neu dazu `68px`; keine kleinere Schrift, **kein** Selektor ohne `font-size`.
- **R1–R4.** Farb-Literale, Radien, Schrift- und Abstandswerte wandern auf die Tokens und Skalen des
  Regelwerks.
- **R5 und R6.** Zeitwerte und `z-index`-Deklarationen kommen aus der Skala bzw. der benannten Leiter.
- **R8 — gelöscht, nicht verschoben.** Die fünf Zusatzblöcke in `juice.css`, `spiel.css` und `szene.css`
  sind **weg**; `basis.css` ist **byte-identisch** geblieben. „Bewegung reduzieren" heißt im Haus
  „**1 ms statt aus**" (`basis.css:91`), und der schärfere Schalter `html[data-bewegung="aus"]`
  (`basis.css:93`) ist unangetastet — „Bewegung aus" schaltet weiterhin wirklich ab.
- **R10.** Doppelte Blöcke sind durch **Zusammenschluss** verschwunden: Komma-Selektorlisten **119 → 158**
  (+39), Selektoren 1 819 → 1 818.
- **R12 wird messbar.** `tools/ethos.py` sagt ohne `--dom` jetzt ausdrücklich „**NICHT GEMESSEN**" statt
  still „0 sichtbare Elemente — eingehalten"; im Programm wertet **`ethos.r12_js()`** unverändert aus:
  `klasse` **6/6**, `Auftrag` **3/3** (drei Breiten, zwei Zustände, vier Gegenproben).
- **Menüprobe.** Die Ursache der Android-Überdeckung — ein Menü mit `z-index: 40` **unter** dem Dock-Blatt
  (`45`) — ist behoben; der Web-Bau kommt von 36/43 auf **45 erfüllt, 0 verletzt**.
- **Rauchtest erweitert.** Die zwei Klassenraum-Ansichten „Klasse" (Lehrkraft: Code anzeigen) und
  „Auftrag" (Azubi: Code eintippen und öffnen) sind als **echte Wege** dabei — **14 Fälle × 3 Breiten = 45**.
- **Dazu in dieser Runde:** das Wiki hat **zwei neue Seiten** — **„Klassenraum"** und **„Übergabe"**
  (jetzt **29 Seiten / 107 Abschnitte**, beide in der Ansicht und über die Suche erreichbar) —, und in
  `Nachweise/Klassenraum/` liegen **10 Bildschirmfotos und 1 Exportdatei** der fünf Vorführschritte
  (Drei-Geräte-Lauf: Code `NL-9ACQ-AM`, B und C messen denselben Abdruck `3U9JGE`, Ampel 1/2 → 2/2,
  Import überlebt den Neustart).

### Was danach gemessen ist

| Prüfung | Nachher |
|---|---|
| `python tools/menueprobe.py --datei web/index.html` | **GRÜN: 5 von 5 Profilen, 45 Kriterien erfüllt, 0 verletzt** (selbst gemessen) |
| `python tools/menueprobe.py --datei android/bau/assets/index.html` | **GRÜN: 5 von 5 Profilen, 49 Kriterien erfüllt, 0 verletzt** (selbst gemessen) |
| `python tools/ethos.py` | **GRUEN** — besser als der Stand: R1 23→22 · R2 122→113 · R3 206→195 · R4 539→514 · R5 70→0 · R6 11→0 · R8 5→0 · R10 87→0 |
| R12 im Programm (`ethos.r12_js()`) | `klasse` **6/6 ✓**, `Auftrag` **3/3 ✓** — drei Breiten, zwei Zustände, **vier Gegenproben** (Zahl der Leitung) |
| `python tools/rauch.py` | **45/45** (14 Ansichten × 3 Breiten; Zahl der Leitung, der Aufbau ist im Quelltext nachgezählt) |
| `sh tools/test.sh` | **725/725 grün**, 81 Testdateien, 91 Module, **0 übersprungen**, Exit 0 (selbst gemessen) |
| `python tools/klassen.py` · `node tools/sim-stand.js` | **0** Klassen ohne CSS-Regel · Simulation **unverändert** (selbst gemessen) |
| `python bauen.py` | **128 Module, 2225 KB** → `web/index.html` (Version **2.0.0**) (Zahl der Leitung) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.829.477 B**, SHA256 `C3C51EDA6FBD8DD49F8EC390DEC92BD6C9B2A59A7BEC116FE493CF439056828E`, **0 Außenverweise**, byte-gleich (selbst nachgerechnet) |
| Android-APK 2.0.0 | **1.160.732 B**, SHA256 `A27751B2924705DDFD7E5CF4FA1A027DC552182D8B8010AEEC56493E49F93733`, Signatur gültig (selbst nachgerechnet) |

### Verworfen — und warum das hier steht

**R8 durch Verschieben lösen — so gemacht wurde es nicht.** Die Absicht war, die fünf Zusatzblöcke in den
zentralen Reduced-Motion-Block einzulagern; gemessen ist `basis.css` **byte-identisch** geblieben, die
Blöcke wurden **gelöscht**. *Lehre:* Wer Bewegung entfernt, muss nachsehen, ob sie eine **Rückmeldung**
trug. Genau das ist hier passiert und benannt: `.ger[class*="jc-"] .gb` und `.kabel[class*="jc-"] *` haben
im ganzen `src/stil/` **keine Regel mehr** — sie waren aber nicht tot: `UI.juice(el,"einrasten")` wird auf
Kabelelementen gerufen (`src/ui/editor-werkzeuge.js:307,353`, `src/ui/juice.js:11`). Für „Bewegung
reduzieren" liefen diese Animationen vorher **gar nicht**, jetzt laufen sie in **1 ms**. Ob man das sieht,
ist **nicht gemessen** (kein Browserlauf freigegeben).

**„Eine Regel abschalten, um grün zu werden" — widerlegt.** Skalen und Zählfunktionen sind zeichengleich,
`tests/stil-stand.json` ist nicht gesenkt, und R12 wurde **strenger** statt lockerer („nicht gemessen"
statt stiller 0). **„Die Trefferflächen passend machen, indem der Inhalt schrumpft" — widerlegt:** keine
kleinere Schrift, kein Selektor ohne `font-size`, kein gesunkener `min-height`-Wert. **„Die Altlasten
wurden gelöscht statt geändert" — weitgehend widerlegt:** +39 Komma-Selektorlisten zeigen den
Zusammenschluss, nur zwei Selektoren verschwanden (beide aus dem gelöschten R8-Block).

### Nicht geprüft (ehrlich)

- **Kein `ethos.py --dom` gegen die Release-Hülle.** R12 lief gegen den **Debug-Bau** und den **Web-Bau**,
  nicht gegen die Auslieferungs-Hülle.
- **Kein Snipping-Werkzeug:** die Bildschirmfotos in `Nachweise/Klassenraum/` sind über CDP aufgenommen.
- **`prefers-reduced-motion` ist im Browser nicht gemessen** — dem Werkzeug fehlt `Emulation.setEmulatedMedia`.
- **Die 720-px-Frage im Einstellungsdialog ist nicht gemessen** — die Menüprobe erreicht den Dialog nicht.
- **Die Erzeugnis-Hashes sind Momentaufnahmen**: die letzten CSS-Werte steckten beim Messen noch nicht im
  Artefakt, und ein Desktop-Release-Bau lief noch.
- **`tests/stil-stand.json` ist auf dem Stand dieser Runde eingefroren** — R1 22 · R2 113 · R3 195 ·
  R4 514 · R5–R12 = 0 (selbst nachgeprüft: der Lauf meldet kein „BESSER als der Stand" mehr).

### Nachtrag (09.10.2026, nach dem 20-Geräte-Lauf)

- **Neu: `tests/klassen-20.test.js`** — 20 Geräte aus **einem** Auftragscode, Ampel **20/20**, 349 ms;
  damit **733 Fälle** in **82 Testdateien** (91 Module), `davon 0 übersprungen`.
- **Befund K2 ist behoben:** `node tests/run.js --klassenraum` läuft jetzt (der Filter schneidet führende
  Striche ab) und meldet **104/104 grün**. Ein Filter, der **nichts** trifft, endet mit **Exit 1** und der
  Meldung „KEIN Test passt zum Filter … Das ist kein grüner Lauf." — die Bilanzzeile allein zeigt weiterhin
  „0/0 grün"; es entscheidet der **Exit-Code**.
- **Grenzbefunde des 20-Geräte-Laufs** (als Anforderung ins [Konzept 3.0](<entwicklung/Konzept – 3.0.md>) übernommen):
  `platz` > 31 wird **still auf 31 geklemmt** (harte Obergrenze je Sitzung), ein **doppelter Platz** lässt den
  ersten Eintrag gewinnen, und **zwei Sitzungen gleichzeitig gehen nicht** (`sitzung` ist ein Einzelfeld —