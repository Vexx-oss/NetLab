---
tags: [FISI, Lernspiel, Netzwerk, Redesign, Bento, Übergabe, Kontext]
erstellt: 2026-10-30
status: Arbeitsfassung — verbindlicher Gestaltungsvertrag für den Umbau „Bento 2.5"; Bereichsteams arbeiten danach.
---

# Entwurf – Bento 2.5 „Arbeitsplatz" (Gestaltungsvertrag, 30.10.2026)

**Auftrag des Nutzers (wörtlich, sinngemäß zusammengefasst).** Das Netzwerk-Labor sieht „noch
ziemlich shitty" aus. Das **Postfach** ist „lieblos und unpersönlich". Der **Kundenbereich** wirkt
„zu kindlich und weniger wie in einer Job-Simulation mit Kundenprofil", verlangt ist eine
„ansprechende Bento-Ästhetik". Am **Dashboard** liegen Ziele, Sitzungen und Klassenraum so, dass
es „wie ein einzelnes unordentliches Objekt" aussieht. Das **Training** ist „zu sehr altes Design,
kindlich und unprofessionell" und „nur eine unübersichtliche Kaskade an Einheiten" — es soll „nach
den Bento-Styleregeln" neu gebaut werden. Die **minimierte Fassung zum Nebenbei-Arbeiten** wird
„komplett überarbeitet": neues Design, „viel interaktiver, bessere und innovativere Inhalte".
Dazu kommt der **Auftrag aus dem ersten Screenshot**: der Hilfeleiter-/Diagnoseblock im Labor
(großer grüner Slogan, „Senior fragen frei") wirkt ebenfalls nicht professionell und wird
mitgezogen.

**Zielbild.** Eine ruhige, dichte **Arbeitsoberfläche eines IT-Dienstleisters**: Bento-Kacheln mit
klaren Kanten, echte Hierarchie, glaubwürdige Kundendaten, wenig Farbe, keine Emoji-Deko, keine
Riesen-Slogans in Funktionsflächen. Der Spieler soll das Gefühl haben, in einem Werkzeug zu
arbeiten — mit Charakter, nicht in einer Kinder-Lern-App.

## 1 · Was bleibt (nicht verhandelbar)

1. **Bedienlogik und Datenwege bleiben.** Kein neues Feature, das einen neuen Spielzustand
   braucht; keine Änderung an `src/sim/`, `src/modell/`, `src/kern/`, `src/cli/`. Die Ansichten
   rufen weiter dieselben `Spiel.*`-Funktionen, dieselben Bus-Ereignisse, dieselben Handler.
2. **Test-Haken bleiben.** Bestehende Klassen, die Tests prüfen, bleiben im DOM und in ihrer
   Bedeutung: `.sp-postfach`, `.sp-pf-liste`, `.sp-leser`, `.sp-mail`, `.sp-brief`, `.sp-knoepfe`,
   `.sp-blatt`, `.sp-hilfe`, `.sp-leiter`; `.hb-seite`; `.kr-seite/.kr-kopf/.kr-raster/.kr-kunde`,
   `.ka-block`; `.tr-seite`, `.tr-liste`, `.tr-karte` (je Szenario genau eine), `.tr-geruest`,
   `.tr-quelle`, `.tr-ergebnis`, `.tr-offen`, `.tr-grund`, `.tr-lernen`, `.tr-fehler*`;
   `.lk-zeile` mit **genau** den Kindern `lk-griff, lk-ampeln, lk-werte, lk-mini-wartet,
   lk-hilfe-knopf, lk-oeffnen`, `.lk-auf`, `.lk-mini`, `.lk-mini-hilfe`, `.leiste-karte`,
   `.lk-mini-wartet` (Text „Mini"), `.lk-hilfe-knopf` (aria-label „Denkhilfe und Lernanker öffnen").
3. **Zustände bleiben erreichbar:** Hover, Tastaturfokus (`:focus-visible`), „Bewegung aus",
   fünf Themes (Nordlicht, Messing, Papier, Pulsar, Keramik), Hell/Dunkel. Neue Flächen nutzen
   **ausschließlich Tokens** aus `basis.css` (kein Farb-/Maß-Literal), damit die Themes tragen.
4. **Keine Emoji in UI-Chrome** (`tests/ui-symbole.test.js`, Ziel 0). Bestehende `UI.symbol`-Glyphen
   nutzen; Emoji aus `DATEN` (z. B. `k.symbol`) wird in den umgebauten Kundenflächen durch
   Monogramme ersetzt, nicht neu eingebaut.
5. **Keine erfundenen Zahlen.** Anzeigen nur Werte, die aus `Spiel.*`/`DATEN` kommen. Keine
   „SLA 99,9 %", keine „Reaktionszeit 4 min", keine Fake-Balken. Was nicht gemessen/gespeichert
   ist, wird nicht behauptet.
6. **Sprache:** Deutsch, professionell, ruhig, kurze Sätze. Keine Ausrufezeichen-Ketten, keine
   Werbeslogans („Die Simulation zeigt jede Etappe …"), keine Verniedlichung. Kundenstimmen dürfen
   warm und persönlich sein (die vorhandenen `DATEN.kunden`-Sätze und `briefing`-Texte tragen das).
7. **Bedienregeln:** Klickziele ≥ 44 px Höhe (bestehender Projektstandard), kein horizontaler
   Überlauf bei 1366/960/720, keine abgeschnittenen Texte, `prefers-reduced-motion` respektiert.

## 2 · Gestaltungssprache „Bento 2.5"

### 2.1 Raster und Fläche
- **12-Spalten-Raster**, Abstand **12 px** (kompakt) bzw. **16 px** (große Flächen). Jede Kachel
  hat `1px solid var(--line)`, `border-radius: var(--radius)`, `background: var(--panel)`,
  Innenabstand **16 px** (große Kacheln 24 px).
- **Keine randlosen „schwebenden" Textblöcke mehr.** Jede Information sitzt in einer sichtbaren
  Kachel oder ist eindeutig Teil einer Kachel (Kopfzeile/Liste darin). Das ist die Antwort auf
  „ein einzelnes unordentliches Objekt": getrennte Flächen, gleiche Kanten, gleiche Abstände.
- **Bento heißt ungleiche Größen, gleiche Kanten:** eine Hauptkachel (Auftrag/Profil) groß, daneben
  kleinere Datenkacheln; keine sieben gleich aussehenden Karten. Maximal **eine** farblich
  hervorgehobene Kachel je Ansicht (`.bn-k.akzent`), alles andere bleibt neutral.
- **Kopf jeder Ansicht:** Mikrolabel (Mono, 11 px, Großbuchstaben, `--faint`) + Titel (Display,
  `--fs-6` = 28 px, 700) + ein Satz Kontext (`--fs-3`, `--muted`). Kein Riesen-Slogan (≥ 34 px)
  in einer Funktionsansicht.

### 2.2 Typografie (Skala bleibt die des Projekts)
- Mikrolabel: `var(--fs-1)` (11 px), Mono, `letter-spacing:.08em`, uppercase, `--faint`.
- Fließtext: `var(--fs-3)` (14 px), `--muted`; Meta: `var(--fs-2)` (12,5 px), `--faint`.
- Kartentitel: `var(--fs-4)` (16 px), Display 600/700; Seiten-Titel `var(--fs-6)` (28 px).
- Werte: Display 700, `font-variant-numeric: tabular-nums`; Euro/Ruf/Zeiten zusätzlich Mono, wenn
  es eine Messgröße ist.
- **Nie** px-Literale in `font-size`/`font` — nur `var(--fs-1…6)` (Test `ui-typografie`).

### 2.3 Farbe
- Grund/Panel/Text: ausschließlich Tokens (`--bg`, `--panel`, `--panel-2`, `--ink`, `--muted`,
  `--faint`, `--line`, `--line-2`).
- Semantik nur für Zustand: `--ok`, `--warn`, `--bad`, `--info`, `--geld`, `--ruf` (Chips, Ampeln,
  kleine Punkte). **Nicht** als Flächenbemalung.
- Kundenfarbe (`k.farbe`, z. B. `--vlan-5`) nur als **leiser Akzent**: 14 % Tint im Monogramm,
  1 px Rand, ein 2 px-Rail. Kein Regenbogen über die ganze Karte.
- Ein Primärknopf je Kachel (`knopf primaer`), alles andere `geist`/`klein`.

### 2.4 Bausteine (neu, von der Leitung bereitgestellt)
- `src/stil/bento.css`: `.bn-raster`, `.bn-k` (Kachel, Varianten `flach|akzent|iris|geld`),
  `.bn-kopf`, `.bn-kicker`, `.bn-titel`, `.bn-lead`, `.bn-meta`, `.bn-fuss`, `.bn-zeile`,
  `.bn-wert`, `.bn-chips`, `.bn-chip` (+ `ok|warn|bad|iris|geld`), `.bn-marke` (Monogramm),
  `.bn-trenner`, `.bn-leer`, Spalten `.bn-s3…s12`.
- `src/ui/bento.js`: `UI.bento.monogramm(name, {farbe, gross, klein})`, `initialen(name)`,
  `kachel(klasse, ...kinder)`, `kopf(kicker, titel, ...rechts)`.
- Bereichsdateien dürfen eigene Klassen mit ihrem Präfix weiterverwenden; neue Klassen brauchen
  eine CSS-Regel (`tools/klassen.py`: 0 Klassen ohne Regel).

### 2.5 Bewegung und Interaktion
- Hover: `border-color: var(--line-2)` plus optional `transform:translateY(-1px)`,
  Übergang `var(--dauer)`. Kein Glow, kein Pulsieren außer vorhandenen Live-Signalen (Ampel,
  Anruf) — und die nur, wenn es dafür schon eine Regel gibt.
- Eine Kachel = eine Hauptaktion; die ganze Kachel nur klickbar, wenn sie wirklich eine Aktion
  hat (dann `button`/Rolle, Fokusring der Basis).

## 3 · Die fünf Bereiche — Zielbild, Aufbau, Inhalt

### 3.1 Postfach + Hilfeleiter (Dateien: `src/ui/spiel.js`, `src/stil/spiel.css`)
**Problem heute:** flache Briefliste mit abgeschnittenen Absendern („SALON LOCKENWE…"),
Datenkacheln im Leser ohne Inhalt (leere hohe Kästen), kein Gesicht, kein Ton; Hilfeleiter mit
44-px-Grünslogan mitten im Labor.

**Zielbild Postfach:** „Posteingang eines Dienstleisters".
- Kopf: Mikrolabel `POSTFACH · AUFTRAGSEINGANG`, Titel `Postfach`, ein Kontextsatz; rechts eine
  Zeile echter Kennzahlen als flache Bento-Chips/Kacheln: offene Aufträge, ungelesen,
  Bereitschaft fällig, Stufe. Die vorhandenen Aktionen (`UI.tag.karte`, „Freies Labor") bleiben,
  aber als ruhige Knopfzeile, nicht als Riesenleiste.
- Zweispaltiges Hauptbento (Desktop): **Liste 400–440 px** (`.sp-pf-liste`), **Leser** (`.sp-leser`).
  Liste: je Auftrag eine Mailzeile mit Monogramm (`UI.bento.monogramm`), Kunde + Ansprechpartner,
  Betreff, **eine** Vorschauzeile aus `def.briefing` (nicht 110 Zeichen mitten im Wort — sauber
  kürzen mit Ellipse), Meta-Zeile: Form-Chip, „~min", Lohn, Status (neu/angerissen/eilig/klingelt).
  Kein Abschneiden von Namen; bei Platzmangel umbrechen, nicht wegschneiden.
- Leser: **echter Brief** — Absenderblock mit Monogramm, Firma, Ansprechpartner + Rolle; Betreff als
  `h2` (`--fs-5`); Brieftext aus `def.briefing` (`absaetze`), der schon persönlich schreibt;
  darunter **Datenkacheln** (Kunde, Form, Dauer, Lohn) als kompakte 4er-Reihe mit echtem Inhalt
  (nicht leere hohe Kästen), Ziele als eigener Block mit Haken; Primärknopf
  „Auftrag annehmen ▸"/„Weiterarbeiten ▸" (Labels behalten), sekundär „Später".
- Nachrichten (`.sp-post`, Senior/Lob) bekommen dieselbe ruhige Zeilenform; „Ablegen" bleibt.
- Schmal (< 900 px): Liste full width, Zeile öffnet das vorhandene Blatt von unten (`.sp-blatt`,
  `.sp-blatt-griff`); Verhalten unverändert.
- Leerzustand als ruhige Kachel mit ehrlichem Satz und einer Aktion.

**Zielbild Hilfeleiter:** „Diagnose-Assistent", kein Werbeplakat.
- Panel-Kopf: `HILFELEITER` (Mikrolabel) + Stufenleiste 1–6 als kompakte Schritte (Buttons bleiben,
  Zustände frei/gesperrt/an bleiben sichtbar); keine 44-px-Display-Zeile in Grün.
- Inhalt als Bento-Inseln: „Nächste Diagnose" (`.sp-naechste` bleibt) als **eine** hervorgehobene
  Zeile/Kachel mit echtem Text, Werkzeuge als Chips, Simulationshinweis als leise Meta-Zeile.
  Stufe 3 (Senior) als Zitatkarte, Stufe 4/5/6 entsprechend vorhandener Inhalte; `sp-check`,
  `sp-demo`-Darstellung ruhiger (Liste, Nummern, keine riesigen Zeilen).
- Fuß: „Senior fragen · frei" als `knopf primaer` (Label und Funktion behalten), „Schließen" als
  `knopf geist`. Hilfe kostet weiter Sterne, wo sie es heute tut.

**Dateigrenzen:** nur `src/ui/spiel.js` (Postfach-Funktionen und `hilfePanel`/`hilfeInhalt`, keine
Labor-Engine-Funktionen) + `src/stil/spiel.css` (Abschnitte Hilfeleiter und Postfach). Die
`.sp-brief`-Klassen werden auch vom Ergebnis/Willkommen genutzt — nicht umbenennen, nur ergänzen.

### 3.2 Kunden + Kundenakte (Dateien: `src/ui/karriere.js`, `src/stil/karriere.css`)
**Problem heute:** sechs Regenbogenkarten mit Emoji-Platten, Herzchenreihen, „Akte ▸"-Knopf;
kein Profil, keine Branche, kein Vertragswert auf einen Blick; wirkt wie ein Kinderquartett.

**Zielbild Kundenliste:** „Kundenportfolio eines Systemhauses".
- Kopf: `KUNDEN · BESTAND`, Titel, Kontextzeile (Stufe · Ruf · Verträge · €/h passiv).
- Bento-Raster (3 Spalten @1440, 2 @960, 1 @720) mit **Profilkacheln**:
  - links Monogramm 40/56 px in Kundenfarbe, daneben Name (`--fs-4`, Display) + Branche
    (`--fs-2`, muted); Ansprechpartner mit Rolle als eigene Zeile (kleines Monogramm oder Icon).
  - Kennzahlenzeile: Vertragsstatus (Ampel-Chip mit €/h) **oder** „ohne Vertrag" + Stufen-Chip;
    gelöste Aufträge + Ø-Sterne (aus `Spiel.karriere.sterneBei`), Vertrauen als **Segmentleiste**
    (5 Segmente, keine Herzen), Empfehlungs-Chip wenn vorhanden.
  - Fuß: eine Hauptaktion (`Akte öffnen` = bisher „Akte ▸"; Label darf „Akte" bleiben) und
    ggf. „Wartungsvertrag anbieten · Preis" als sekundärer kleiner Knopf (bestehende Funktion
    `kaufen`, Zustände kaufbar/gesperrt bleiben).
  - Gesperrte Kunden: ruhige, abgedunkelte Kachel mit Schloss und klarem Satz „Ab Stufe X und Y Ruf".
    Keine Emoji-Symbole mehr; Monogramm aus Firmenname.
- Keine Kundenfarbe als Vollfläche; nur Rail/Tint.

**Zielbild Kundenakte (Profil):** „Kundendossier als Bento".
- Kopfkachel: großes Monogramm, Name, Branche, Ansprechpartner, Vertrauens-Segmente + Fortschritt
  bis zur nächsten Schwelle; Aktionen bleiben (Vertrag, Geschichten, Atlas).
- Datenkacheln (3–4): Vertrag (€/h, Ampel, Zustand), Leistung (Aufträge, Ø-Sterne, zuletzt),
  Empfehlung (von wem / offen), Baustellen (Anzahl offener Provisorien).
- Große Kacheln: Netz-Atlas (bestehende `UI.netzplan.zeichnung` unverändert einhängen), Geschichten
  (Kapitel, gelesen/frei/gesperrt, „neu"), „Zuletzt" (Verlauf), Belohnungen des Vertrauens.
- `.ka-block` & Co. bleiben als Haken erhalten; Inhalte nur umsortieren/aufwerten, keine neuen
  Spielzustände.

**Dateigrenzen:** `src/ui/karriere.js` **nur** die Abschnitte „Kunden" und „Kundenakte" (Zeilen
~11–101), `src/stil/karriere.css` + `src/stil/kundenakte.css`. Andere Abschnitte in karriere.js
(Shop, Lernstand, Wiki, Einstellungen, Leisten-Mini) sind tabu — dort arbeitet niemand sonst, aber
sie bleiben unverändert, damit der Umbau nicht streut.

### 3.3 Dashboard „Heute" (Dateien: `src/ui/hub.js`, `src/stil/hub.css`)
**Problem heute:** Hero, Kennzahlen, Tagesziel, Letzte Sitzung und Klassenraum stehen mit
unterschiedlichen Einzügen/ohne Kanten in einem Raster; die drei Bereiche „Ziele, Sitzungen,
Klassenraum" wirken wie ein einziger unordentlicher Block; darunter hängt das Lagerbild; das
Signal zeigt erfundene Werte („PAKETE/S 3").

**Zielbild:** „Arbeitsplatz am Morgen" als klares Bento.
- **Zeile 1:** große Auftragskachel (Spalten 1–8, `.hb-hero` bleibt) mit Mikrolabel, Kunde,
  Titel (`--fs-6`, max. 28 px), einem Lead-Satz, Meta-Zeile und genau **einem** Primärknopf
  („Annehmen ▸"/„Weiterarbeiten ▸"/„Rangehen ▸" wie heute), Sekundäraktion klein.
  Rechts daneben (Spalten 9–12) **Kennzahlenkachel** mit Konto/Ruf/Serie als drei gestapelte
  Zeilen mit Wert + kleinem Verlauf; jede Zahl klickbar nur, wenn sie heute schon führt.
- **Zeile 2:** drei **gleich hohe** Kacheln: Tagesziel (Ring + Zeilen Aufwärmen/Tagesrätsel/
  Fehlerdex), Letzte Sitzung (Zeilen HEUTE/SERIE/POST), Klassenraum (Status + 2 Aktionen).
  Alle drei mit denselben Kanten, gleicher Innenabstand, gleicher Titelzeile — das ist die
  eigentliche Reparatur des „unordentlichen Objekts".
- **Zeile 3:** Lagebild (Spalten 1–8, echte Mini-Topologie behalten) + eine **echte** Kachel
  rechts: Wochenziel (bestehende `wocheZeile`) und/oder „Heute dran" (Serie, Tickets heute) —
  nur Daten aus `Spiel.hub.stand()`. Die erfundene Signal-Kachel (PAKETE/S) entfällt oder wird
  durch echte Werte ersetzt.
- Fußzeile: nur noch die Wochenziel-Zeile (kein loser Klassenraum-Code mehr — der gehört in die
  Klassenraum-Kachel und bleibt über `UI.klassenraum.startEinhaengen` bzw. den Knopf erreichbar).
- Keine neuen Spielzustände; alle bestehenden Funktionen (`aufwaermen`, `raetsel`, `wocheWaehlen`,
  `dexOeffnen`) bleiben erreichbar. `.hb-seite` bleibt Wurzel.

**Dateigrenzen:** `src/ui/hub.js`, `src/stil/hub.css`. Theme-Dateien werden **nicht** angefasst;
die vorhandenen Theme-Regeln auf `.hb-*` bleiben gültig, weil die Klassennamen bleiben.

### 3.4 Training (Dateien: `src/ui/training.js`, `src/stil/training.css`)
**Problem heute:** 52 Szenarien als endlose Kaskade gleich aussehender, textschwerer Karten in
3 Spalten; keine Filter, keine Lernpfade, keine Priorität; wirkt wie eine alte Liste.

**Zielbild:** „Trainingsarena" als Bento mit Hierarchie.
- Kopf: Mikrolabel `TRAINING · LERNBEREICH`, Titel, Kontextsatz (kein Lohn/Ruf/Postfach).
  Rechts drei Kennzahlen-Kacheln: bestanden x/y mit Fortschrittsring (bestehendes `.hb-ring`-Muster
  ist nur im Hub; hier eigenes `conic-gradient` im erlaubten Token-Rahmen), Durchgänge, Bildungsstand.
- **Filterleiste** (funktional, Zustand nur im UI-Modul): Alle · Basis · Störung · Prüfung ·
  „Empfohlen" · „Noch offen". Filter dürfen nur die Sichtbarkeit ändern (CSS-Klasse/`hidden`), nie
  Daten. Standard „Alle" zeigt alle 52 Karten (Tests zählen `.tr-karte`).
- **Weiterlernen-Kachel** (wenn ein Durchgang läuft): Titel, Fortschritt, „Fortsetzen"/„Abnehmen"
  (Labels behalten).
- **Lernpfade statt Kaskade:** Karten nach Thema/Fertigkeit gruppieren (z. B. „Adressierung",
  „VLAN & Switching", „Routing & NAT", „Dienste", „Sicherheit", „Betrieb"), jede Gruppe als
  Bento-Abschnitt mit Kopfzeile (Name, x von y bestanden) und darin **kompakte** Szenariokarten
  (`.tr-karte`, ca. 3 Spalten @1440): Art-Chip, Titel (`--fs-4`), ein Meta-Satz
  (Fertigkeit · min · Gerät), Stand (Sterne/durchgeführt), ein Primärknopf, Gerüst als
  `details` (bestehende `tr-geruest/tr-schritte/tr-leiter`), Quelle klein. Weniger Fließtext:
  Beschreibung auf 1–2 Zeilen kürzen (Text bleibt im DOM/title, falls Tests Text prüfen).
- Ergebnis-/Fehlerkarte (`tr-ergebnis`) bleibt in Aufbau und Klassen, nur ruhiger gestaltet.
- Bei 960/720: zwei bzw. eine Spalte, Filter als umbrechende Chipzeile.

**Dateigrenzen:** `src/ui/training.js`, `src/stil/training.css`. `src/daten/trainings.js`,
`src/spiel/training.js` und Tests bleiben unverändert (keine Inhalts-/Verhaltensänderung).

### 3.5 Minimierte Leiste (Dateien: `src/ui/leiste.js`, `src/stil/leiste.css`)
**Problem heute:** 300 × 56 zeigt nur Ampeln, €/h, Ruf, Zahl, „Mini" und ein Fragezeichen;
aufgeklappt eine enge Spalte mit Mini-Ticket; kaum Interaktion, kaum Inhalt.

**Zielbild:** „Nebenbei-Cockpit" — klein, aber lebendig, nur Maus.
- **Zugeklappt 300 × 56:** Griff, Live-Ampeln (max. 6), €/h, Ruf, offene Tickets, „Mini"-Signal,
  Hilfe, „öffnen" — Reihenfolge und Klassen exakt wie heute (Test). Zusätzlich: feiner
  Fortschrittspunkt/„Heute"-Marke, wo Platz ist; Deckkraft/Hover/5-s-Zuklappen unverändert.
- **Aufgeklappt 320 × 300:** oben dieselbe Statuszeile; darunter ein **interaktives Bento** mit
  2–3 Modulen, die ohne Tastatur bedienbar sind:
  1. **Jetzt dran** — nächster offener Auftrag/aktives Ticket: Kunde, Titel, Lohn/Zeit, Knopf
     „Fortsetzen"/„Öffnen" (ruft `UI.spiel.oeffnen` / `UI.app.ansicht("postfach")`).
  2. **Mini-Ticket** — der vorhandene interaktive Mini-Bereich (`lk-mini` + `lk-mini-hilfe`),
     Antworten/Denkhilfe/Lernanker bleiben; Darstellung kompakt und lesbar.
  3. **Status & Verträge** — Ampelzeilen je Vertrag (Name · Zustand), €/h passiv, Serie/offene
     Tickets; wenn nichts da ist, ehrlicher Leerzustand.
  Plus eine Leiste mit Schnellaktionen: `Postfach` (mit Zähler), `Labor`, `Pause` (nur wenn ein
  echter Weg existiert — sonst weglassen). Keine erfundenen Kennzahlen.
- Interaktion: Hover/Klick-Zustände, Übergänge `var(--dauer)`, keine Fokusfallen; alle Knöpfe
  `tabindex="-1"` (nur Maus, kein Fokusklau). `UI.leiste.status(...)`-Signatur und
  `miniBereich`/`miniHilfe`-Getter bleiben; `UI.modus("leiste")` bleibt.
- Der vorhandene Mini-Zeichner (`UI.karriere.miniZeichnen`, Daten aus `Spiel.mini`) bleibt die
  Quelle für Frage/Antwort; die Leiste gestaltet Container und Drumherum. Wenn für Modul 1/3
  zusätzliche Zeilen nötig sind: nur aus `Spiel.*` lesen.

**Dateigrenzen:** `src/ui/leiste.js`, `src/stil/leiste.css`. `src/ui/karriere.js` wird **nicht**
angefasst (Mini-HTML kommt von dort); neue `.mk-*`-Gestaltung gehört in `leiste.css`, das schon
dem Baustein Leiste gehört.

## 4 · Schreibrechte (ein Schreiber je Datei)

| Bereich | Schreiber | Dateien |
|---|---|---|
| Postfach + Hilfeleiter | Postfach-Team | `src/ui/spiel.js`, `src/stil/spiel.css` |
| Kunden + Kundenakte | Kunden-Team | `src/ui/karriere.js`, `src/stil/karriere.css`, `src/stil/kundenakte.css` |
| Dashboard | Dashboard-Team | `src/ui/hub.js`, `src/stil/hub.css` |
| Training | Training-Team | `src/ui/training.js`, `src/stil/training.css` |
| Leiste | Leisten-Team | `src/ui/leiste.js`, `src/stil/leiste.css` |
| Grundlage/Integration | Leitung | `src/stil/bento.css`, `src/ui/bento.js`, `docs/Architektur.md`, `docs/entwicklung/*`, `tools/vorschau.py`, Nachweise |

Verboten für alle Bereichsteams: `src/stil/basis.css`, `src/stil/zz*.css` (Themes/Lagebild),
`src/ui/app.js`, `src/ui/dom.js`, `src/ui/geraetebilder.js`, `src/ui/hub.js|karriere.js|spiel.js|
training.js|leiste.js` außer der eigenen Datei, `src/sim/**`, `src/modell/**`, `src/kern/**`,
`src/cli/**`, `tools/**`, `tests/**`, `bauen.py`, `README.md`, `docs/**`, Git-Befehle.
Braucht ein Team etwas davon: Meldung an die Leitung, nicht selbst ändern.

## 5 · Abnahme (je Bereich)

1. `python tools/vorschau.py --name <bereich>` baut eine private Fassung, danach
   `python Nachweise/bento/foto.py --html vorschau-<bereich>.html --marke <bereich>
   --nur <ansichten>` liefert Bilder 1440/960 (zusätzlich 720 für die eigene Ansicht).
2. Sichtprüfung der Bilder: keine abgeschnittenen Texte, keine Überläufe, klare Kachelkanten,
   eine Hauptaktion, keine Emoji, keine erfundenen Zahlen. Mindestens zwei Iterationen.
3. `node tests/run.js` (bzw. `sh tools/test.sh`) muss grün bleiben; `python tools/klassen.py`
   0; `python tools/ethos.py` GRÜN; `python tools/umlaute.py` GRÜN. Keine Teständerung ohne
   Rücksprache mit der Leitung; Verbesserungen der Stilzahlen sind erwünscht, Verschlechterungen
   nicht (R4/R9/R10 dürfen nicht steigen).
4. Kurzer Bericht an die Leitung: Dateien, was gebaut, Bilderpfad, Testzahlen, offene Punkte und
   „nicht geprüft".

## 6 · Was bewusst nicht Teil dieses Umbaus ist
- Keine neuen Ansichten, keine Änderung an Simulation/Netz/Codec/Spielstand-Format.
- Keine Änderung an Themes (die fünf Theme-Dateien bleiben unangetastet; Tokens tragen weiter).
- Keine Fassungserhöhung, kein Push, kein Release; Commits macht die Leitung.
- Android-Bau, Doku-Neubau, README-Bilder: Leitung am Ende.
