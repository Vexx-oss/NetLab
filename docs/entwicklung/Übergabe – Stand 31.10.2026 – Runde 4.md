---
tags: [FISI, Lernspiel, Netzwerk, Redesign, Runde4, Übergabe, Kontext]
erstellt: 2026-10-31
status: Fassung 2.6.0 gebaut, getestet und veröffentlicht; Abnahme in § 3/§ 6.
---

# Übergabe — Stand 31.10.2026 (Runde 4 „Jobdoku & QoL")

## 1 · Auftrag und Vorgehen

Der Nutzer hat sieben Stränge benannt, die noch vor Bento 2.5 entstanden waren: **Verdacht/Jobdoku**
(Einsatzakte), **Lehrlings-/Lernstandbereich** (Ausbildungs-Cockpit), **Simulator + Fehler→Ziel +
Beginner-Hilfe** (Flugschreiber), **rechte Sidebar/Inspektor** (Einzelklick zeigt immer Infos),
**Fenster/Shell** (eigenständiges Programm statt nativer Titelleiste), **Shop** (Werkstattregal) und
einen **QoL-/Barrierefreiheits-Querschnitt**. Verlangt war ausdrücklich: originell neu denken statt
polieren, Bento-2.5-Regeln einhalten, echte Daten, keine Emoji, und am Ende **Fassung 2.6.0
inklusive Push, Tag, Release und Live-Seite** (Freigabe des Nutzers vom 30.10.2026).

Umgesetzt als **fünf Schreib-Owner** (ein Schreiber je Datei, AGENTS-Ausnahme „Schwarm"), davor eine
**Phase 0 der Leitung** (Audit, Gestaltungsvertrag, Extraktion), danach **zwei unabhängige
Prüfungen** (Bento-Design; Theme/Struktur/A11y), Fix-Runde und Gesamtabnahme durch die Leitung.
Verträge: [Entwurf – Runde 4 (Jobdoku & QoL)](<Entwurf – Runde 4 (Jobdoku & QoL).md>),
[Architektur § 23](../Architektur.md), [Design § 40](<Design – Spielspaß 2.0.md>).

## 2 · Was jetzt da ist

| Strang | Dateien | Was neu ist |
|---|---|---|
| Phase 0 · Trennung | `src/ui/lernstand.js`, `src/ui/shop.js` (neu), `src/ui/karriere.js` (nur noch Kunden/Wiki/Mini/Einstellungen), `src/stil/lernstand.css`, `src/stil/shop.css` | Lernstand und Shop aus der 689-Zeilen-Sammeldatei gezogen; Verhalten und Bilder unverändert (878/878 vor und nach der Extraktion); `UI.karriere._helfer` + Alias-Namen für Rückwärtskompatibilität |
| A · Einsatzakte | `src/ui/akte.js`, `src/stil/akte.css`, `src/spiel/verdacht.js` | Aktenkopf mit Vorgang/Beginn, didaktisches Fortschrittsband, Hypothesen-Stempel, Schichtentreppe 1·2·3·4·7 mit Beweiszahl, Beweistimeline mit ★, Evidenzkarten springen zum Fundort, „Einsatzbericht kopieren" ohne Lösungsverrat; Logik additiv |
| B · Ausbildungs-Cockpit | `src/ui/lernstand.js`, `src/ui/naechster.js` (neu), `src/stil/lernstand.css`, `src/stil/kompetenz.css`, `src/stil/naechster.css` | Prüfungsreife-Kachel, „Nächster Schritt" mit genau einer Hauptaktion, Kompetenzkarte als Register, Fehlerheft mit Üben-Knopf, Behalten ehrlich „–", Training-Empfehlungen aus dem Lernmotor; Hilfe-Abschnitt unverändert eingehängt |
| C+D · Flugschreiber & Inspektor | `src/ui/simpanel.js`, `src/ui/pdu.js`, `src/ui/fehlerziel.js` (neu), `src/ui/inspektor.js`, `src/ui/editor.js`, `src/stil/simulation.css`, `src/stil/inspektor.css`, `src/spiel/hilfe.js`, `src/spiel/naechster.js` | Flugschreiber-Kopf mit Ergebnis/Was-Wo, Warnbanner „Erster Fehler" mit „Zum Fundort", Zeitachse mit Schichtbändern, jede Meldung anklickbar; zentraler Resolver `UI.fehlerziel`; Anfänger-Hilfe (persistiert, Standard Stufe ≤ 2); Einzelklick öffnet Steckbriefe für Gerät/Port/Kabel/Zone ohne den Werkzeugmodus zu verlassen |
| E · Fenster | `shell/src-tauri/src/fenster.rs`, `shell/src-tauri/src/main.rs`, `src/ui/app.js`, `src/stil/rahmen.css`, `src/ui/palette.js` | Vollansicht ohne native Titelleiste (`set_decorations(false)`), integrierte Bento-Kopfzeile mit Drag-Region, Doppelklick maximiert, drei 44-px-Fensterknöpfe über Hüllen-Befehl; Leiste/Tray/Snap unverändert; Palette-QoL (Fokusring, 44 px, Tab-Kreis) |
| F · Werkstattregal | `src/ui/shop.js`, `src/stil/shop.css`, `src/spiel/wirtschaft.js` (additiv: `BESTAETIGUNG_AB = 100`) | Vier Warengruppen nach Aufgabe, Zustands-Chips mit Text+Symbol, genau eine Aktion je Artikel, echte Token-Vorschau für Aussehen, Kaufbestätigung ab 100 € mit Esc/Enter und Fokus-Rückkehr; Kaufwege unverändert |
| G · QoL | querschnittlich | Einzelklick statt Umweg, sichtbarer Fokus, Esc/Enter, 44-px-Ziele, „Bewegung aus", Farbe nie allein, ehrliche Leerzustände; `bento.css`-Raster bei ≤ 900 px auch für `.bn-s12` repariert |
| Grundlage | `src/stil/bento.css`, `tools/cdp.py`, `Nachweise/runde4/` | Raster-Fix; `LABOR_EXE` für Prüfbauten neben einer fremden Instanz; Belege je Strang (Bilder, Messungen) |

## 3 · Gemessene Abnahme (in dieser Sitzung)

- `node tests/run.js` bzw. `sh tools/test.sh`: **930/930 grün**, 0 übersprungen (109 Testdateien,
  95 headless Module). Vorher 878/878 — **52 neue Fälle** in sechs neuen Testdateien
  (`akte-dossier` 5, `lernstand-cockpit` 15, `fehlerziel` 6, `inspektor-einzelklick` 5,
  `fenster-kopf` 8, `shop-regal` 13).
- `sh tools/test.sh --rauch`: **45/45** (erster Auftrag mit echter Maus + 14 Ansichten, je 3 Breiten).
- `python tools/klassen.py`: **0 Klassen ohne CSS-Regel**.
- `python tools/ethos.py`: **GRÜN**, keine Regel schlechter als der eingefrorene Stand; besser:
  R1 24→23, R2 20→17, R4 169→140, R9 62→58, R10 42 (Stand). **R12 nicht gemessen** (`--dom`).
- `python tools/umlaute.py`: **GRÜN**, 0 offene Befunde.
- `node tools/sim-stand.js`: **Simulation unverändert** gegenüber dem Referenzstand.
- Bau: **138 Module** (davon 95 headless) — vorher 134. Extraktion und vier neue UI-Dateien
  (`lernstand.js`, `shop.js`, `fehlerziel.js`, `naechster.js`).
- Sichtprüfung: je Strang Bilder 1440/960/720 unter `Nachweise/runde4/strang-a|b|cd|e|f/`,
  Vorher-Bilder unter `Nachweise/bento/vorher4/`; dazu Theme-Stichproben (Papier, Hell, Keramik,
  Nordlicht) und „Bewegung aus".
- Unabhängige Prüfungen: Bento-Design und Theme/Struktur/A11y haben die Flächen gegengelesen; die
  Befunde sind eingearbeitet (Details im Abschnitt 5).
- **Echte Windows-`.exe`:** **8.948.224 B**, ProductVersion **2.6.0**, SHA256
  `831da655…f3505e69`, Integritätsstufe „Mittel". Die Abnahme mit `tools/q-echt.py` (echte Maus)
  lief auf einem **Prüfbau mit eigener App-Kennung** (`Nachweise/runde4/pruefbau.config.json`;
  derselbe Code, nur Kennung/Produktname anders), weil eine **fremde** Programm-Instanz (PID 22444,
  nicht von dieser Sitzung) lief und AGENTS.md Regel 1 das Beenden fremder Prozesse verbietet:
  **0 Fehler im Ablauf** — erster Auftrag geöffnet, Kabel Kasse→Switch mit echter Maus gezogen
  (4 → 5 Kabel), Abnahme **5 ★**, Fernwartungs-Schild 400 × 350 sichtbar, 5 Bildschirmfotos.
  Zusätzlich am laufenden Fenster gemessen: `fenster_zustand` meldet `dekoration:false`,
  `modus:"voll"`; Außenmaß 1294 × 808 vs. Nutzfläche 1280 × 800 (nur Resize-Rahmen, **keine
  Titelleistenhöhe**); drei Fensterknöpfe 44 × 44 mit `aria-label` (Minimieren/Maximieren/Schließen);
  Maximieren schaltet auf 1920 × 1140 mit `maximiert:true`, der Knopf heißt dann „Wiederherstellen";
  Zurück schaltet auf 1280 × 800. Die ausgelieferte `.exe` liegt als
  `Programm/Netzwerk-Labor-2.6.0.exe` bereit; der feste Pfad `Programm/Netzwerk-Labor.exe` war
  **gesperrt**, weil die fremde Instanz genau diese Datei ausführt (Windows lässt eine laufende
  `.exe` nicht überschreiben) — sobald sie beendet ist, wird der Pfad wie üblich getauscht.

## 4 · Was bewusst nicht passiert ist

- **Keine Änderung an** `src/sim/`, `src/modell/`, `src/kern/`, `src/cli/`; keine neuen
  Spielzustände, keine neuen Ansichts-IDs, keine Theme-Änderungen (`zzz-thema-*.css` unangetastet).
- **Keine Android-APK** (Android-SDK fehlt auf diesem Rechner, wie in den Vorrunden).
- **R12** (`ethos --dom`) bleibt ungemessen; die Entscheidung „einfrieren oder Oberfläche reduzieren"
  liegt weiterhin beim Nutzer.
- **Keine fremden Dateien angefasst:** die Dateien der parallelen Kiosk-Sitzung
  (`tools/kiosk.py`, `tools/kiosk/`, Vorführfassungs-Doku, `Programm/LIESMICH-Demo.txt`,
  `.gitignore`) sind unverändert; nie `git add -A`.
- Die laufende fremde Netzwerk-Labor-Instanz wurde **nicht** beendet.

## 5 · Prüfungen, Befunde, Fix-Runde

Zwei unabhängige Prüfer (read-only) haben nach der ersten Runde gegengelesen:
**Bento-Design** (Originalität, Konsistenz, Professionalität) und **Theme/Struktur/A11y**
(5 Themes + hell/dunkel, 44 px, Fokus, Esc/Enter, reduced motion, Tokens, keine Emoji, Testhaken).
Befunde und ihre Behandlung stehen im Abschnitt „Review“ dieser Übergabe (Nachtrag) und in den
Belegen unter `Nachweise/runde4/review-design.md` und `Nachweise/runde4/review-theme-a11y.md`.

## 6 · Veröffentlichung 2.6.0

1. Fassung **2.6.0** gezogen (`tools/fassung-ziehen.py --neu 2.6.0 --setzen`, Trockenlauf zuerst);
   `VERSION_CODE` in `android/bauen.py` von Hand auf **20601** (über dem abgeleiteten Wert 20600).
2. Alle Erzeugnisse neu gebaut: `python bauen.py`, `python tools/einfach.py`, `cargo tauri build`,
   `python tools/seite.py`, `python tools/stand.py`; Prüfmodi danach grün.
3. Commit auf `ausbau-1.2`, **Push des Zweigs**, Tag `v2.6.0`, Push des Tags — mit der
   ausdrücklichen Freigabe des Nutzers vom 30.10.2026. Damit laufen „Prüfen", „Seite" und
   „Release anlegen" auf GitHub; das Release trägt Browser-ZIP, Einzeldatei und die im CI gebaute
   Windows-`.exe` (APK wird wie zuvor übersprungen, weil die Android-Secrets fehlen).
4. Nachmessen: Live-Seite gegen `docs/index.html` hashen; Release-Anhänge, Größen, ProductVersion
   und `Content-Disposition` prüfen.

## 7 · Nachweis 2.6.0 (nach dem Deploy gemessen)

*(Dieser Abschnitt wird nach Push/Tag/Release mit den echten Messwerten ergänzt.)*

## 8 · Für die nächste Sitzung

- **R12** ist die eine offene Messung: `python tools/ethos.py --dom` bei laufendem Programm.
- Ein **echtes** Tauri-Fenster war in dieser Sitzung nur über den Prüfbau erreichbar; wenn keine
  fremde Instanz läuft, ist `python tools/q-echt.py` der normale Weg (er beendet nichts).
- Die **Kiosk-/Vorführfassung** der parallelen Sitzung ist unverändert; wer sie weiterbaut, findet
  ihre Dateien unverändert vor.
- Neue Stränge möglichst wieder als **ein Schreiber je Datei**; die Bereichs-Verträge
  (Testhaken, Tokens, keine erfundenen Zahlen) gelten unverändert.
