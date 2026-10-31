---
tags: [FISI, Lernspiel, Netzwerk, Runde8, Übergabe, Subnetting, VLAN, Kontext]
erstellt: 2026-10-31
status: Arbeitsstand — Fassung 2.9.0 in Arbeit; Abnahme und Veröffentlichung werden in § 3–§ 7 nachgetragen.
---

# Übergabe — Stand 31.10.2026 (Runde 8 „Abteilung Subnetting")

## 1 · Auftrag und Vorgehen

Der Nutzer schrieb (wörtlich): „NetLab braucht ein Subnetting abteil wo das intensiv beigebracht,
gelehrt mit visuellen Hilfselementen und Übungsaufgaben und tools / spielchen sind nur zum lernen von
subnetting und vLAN. Analysiere mit einem Experten Team zum coden und designen wie das am besten in
die bestehenden themes integriert wird und auch wo, ich denke ein eigenes abteil wird dem gerecht.
Generell sollen alle Aufgaben Inhaltlich und vom Lernschwierigkeitsgrad optimiert werden. Mache das
vollständig fertig und melde dich wenn der build und deploy fertig ist."

Umgesetzt mit dem Projekt-Prozess `netzwerk-labor-redesign` (Vertrag → Umsetzung → Abnahme →
Doku/Stand/Fassung), dem Skill `workflows` und einem Agenten-Team aus vier Schreib-Ownern
(W1 Rechenkern, W2 Lehrplan/Inhalte, W3 Oberfläche, W4 Werkzeuge/Spiele), zwei unabhängigen
Lesungen (Design/Theme/A11y und Didaktik/Code), Leitung integriert und veröffentlicht.
Vertrag: [`Entwurf – Runde 8 (Abteilung Subnetting)`](<Entwurf – Runde 8 (Abteilung Subnetting).md>),
[`Architektur`](../Architektur.md) § 26, [`Design – Spielspaß 2.0`](<Design – Spielspaß 2.0.md>) § 43,
Lernstufen: [`Subnetting – Lernstufen-Matrix`](<Subnetting – Lernstufen-Matrix.md>).

**Vorher gemessen (read-only Bestandsaufnahme, Belege `Nachweise/runde7/befund.md`):**
`lab.subnetz` hatte zwei Trainings (beide nur „falsche Maske reparieren"), sechs Mini-Tickets, eine
Fragen-Vorlage auf E-Niveau und ein Wiki-Rezept, das nur im letzten Oktett funktioniert; VLSM,
Bit-Sicht, Blockgröße und Adressplan-Übungen fehlten; VLAN/Trunk hatten keine Planungs- und
Tagging-Übungen und keine Native-VLAN-Sicht. Sieben Bestandsaufgaben mit schiefer Stufe oder
fehlendem Kontext sind in § 2.3 belegt und behoben.

## 2 · Was jetzt da ist

### 2.1 Die Abteilung (neue Ansicht `subnetz`)

Eigene Ansicht „Subnetting" im Dock direkt nach „Labor" (Dock-Kurzform „Subnetz", voller Titel
„Subnetting"), automatisch in der Befehlspalette und mit sechs Palettenbefehlen „Subnetting:
Werkzeug …". Vier Register:

| Register | Inhalt |
|---|---|
| **Lehrpfad** | 8 Modulkarten in 3 Stufen (Bits · Maske · Blockgröße · Netz-ID/Broadcast/Hosts · Netze schneiden · VLSM · VLAN · Prüfungsfälle) mit Status, Dauer und „nächster Schritt"; Klick öffnet die Lektion mit Kern, genau einem Merksatz, visueller Hilfe, geführtem Beispiel (Schritt für Schritt aufdeckbar), Übungs- und Prüfrunde („sicher" nur nach bestandener Prüfrunde) und Verweisen zu Wiki/Labor/Training/Werkzeug |
| **Werkzeuge** | 6 interaktive Werkzeuge: 32-Bit-Labor (Bits klickbar, Maske überlagert Netz-/Hostbits), Masken-Schieber (0–32, Maske/Maske binär/Blockgröße/Hosts), Blocklineal (Adressleiste, Blockgrenzen, Einrasten), Rechenweg-Assistent (schrittweise, Selbstrechnen), Adressplaner (VLSM mit Reserve), VLAN-Werkzeug (8 Ports, Access/Trunk, Frames mit Tag, Erreichbarkeitsmatrix) — jedes mit Lernziel, Ergebnisanzeige und „Aufgabe dazu" |
| **Üben & Spielen** | Generator (Thema × Stufe × 4/6/8 Aufgaben) mit Lage-Block, Eingabe, Prüfen, Rückmeldung mit Rechenweg und Erklärung, Punkten und Auswertung; 3 Lernspiele: Präfix-Blitz (60 s, Präfix↔Maske↔Hosts), Netz-Sortierer (Adressen in Netze), VLAN-Patcher (Ports konfigurieren, Differenz anzeigen) |
| **Formelsammlung** | 5 Merkblätter: Präfix-/Masken-/Host-Tabelle, Rechenweg in fünf Schritten, Blockgrößen, VLAN/Trunk/802.1Q, typische Fehlerfallen |

### 2.2 Rechenkern und Aufgabengenerator

`Spiel.subnetz` (headless, `src/spiel/subnetz.js`, ~1.430 Zeilen): `rechnen`, `maskeZuPraefix`,
`praefixZuMaske`, `gleichesNetz`, `plan` (VLSM), `zusammenfassen`, `aufgabe`, `satz`, `pruefen`,
`antwort`, `fortschritt`, `modulSetzen`, `zuruecksetzen`; 11 Aufgabentypen, 23 art×Stufe-Kombinationen,
deterministisch (eigener gesäter Generator, kein `Math.random`/keine Uhr), Rechenweg oktettweise
(keine 32-Bit-Dezimalzahlen), genau eine richtige Antwort, plausible typische Denkfehler.
Fortschritt in `store "subnetz"` v:1 (Module neu < gelesen < geuebt < sicher; Fehler senkt nie unter
„gelesen"); Lernverbuchung ausschließlich über `L.ueben`/`L.fehler`, Werkzeug-Lösungen mit
`{hilfe:true}`. Kein Geld, kein Ruf, kein Feld im Spielstand (v:3 bleibt unverändert).

### 2.3 Inhaltlich und in der Lernschwierigkeit optimierte Bestandsaufgaben

| Aufgabe | vorher | jetzt (belegt, Tests grün) |
|---|---|---|
| `vlan-netzgroesse` (AP2) | „/24 auf n VLANs ⇒ welche Maske" (falsches Planungsmodell) | Hosts je VLAN ⇒ Präfix (VLSM-Denken), `GEGEN`-Rechnung im Test nachgezogen |
| `mini-sub-1` (E) / `mini-sub-3` (AP2) | Schwierigkeit invertiert (Netzadresse /26 als E, Hosts /28 als AP2) | Stufen getauscht: Netzadresse /26 = AP2, Hosts /28 = E; Stufen-Multiset unverändert |
| `mini-trunk-5` (AP2) | „Im Native VLAN" vs. „Immer in VLAN 1" ohne Native-Angabe doppeldeutig | Schnappschuss nennt Native VLAN 20; genau eine Option richtig |
| Denkhilfen | fehlten für `mini-vlan-6`, `mini-trunk-5`, `mini-rostick-4` | ergänzt (eigener Text statt Fertigkeitssatz) |
| `tr-trunk-erlauben`/`tr-trunk-allowed`, `tr-netz-maske`/`tr-netz-nachbar` | gleicher Titel/kein Unterschied | unterscheidbar gemacht, keine vorgetäuschte Progression |
| `tr-subnetz-plan` (E-Format, AP1-Inhalt) | verlangte vier /26 in einem Durchgang | Teiltabelle vorgegeben, Beschreibung auf E-Niveau gestützt (Formatregel `niveau = f(art)` bleibt) |

Nicht geändert (begründet in der Lernstufen-Matrix): keine neuen `DATEN.skills` (30 — Codec- und
Dichte-Tests eingefroren), keine neuen Tickets, keine Änderung an Injektoren, Mini-Mechanik oder
Lernmotor.

### 2.4 Einfügung in die Themes und die Navigation

Nur Tokens aus `basis.css` und Bento-Bausteine (`.bn-*`); eigene Klassen `sn-*` (Abteilung),
`sw-*` (Werkzeuge), `sg-*` (Spiele). Keine Farb-/Radius-/Schrift-/Abstands-/Dauer-Literale,
kein `!important`, kein eigener Reduced-Motion-Block, Fokusring nicht überschrieben,
44-px-Ziele gescopt. Geprüft in 5 Zusatz-Themes + hell/dunkel + „Bewegung aus" bei 1440/960/720.
Navigation: Dock-Eintrag, Befehlspalette, Querverweis am Ende der Trainingsliste („Zur Abteilung Subnetting"),
interne Verweise zu Wiki/Labor/Training; ein Fall im Rauchtest öffnet die Ansicht mit echter Maus.

## 3 · Gemessene Abnahme

| Prüfung | Ergebnis |
|---|---|
| Tests (headless) | **1049/1049 grün**, 0 übersprungen (118 Testdateien, 98 Module, Exit 0) |
| Rauchtest (echte Maus, Edge) | **48/48** (15 Fälle + Erstabnahme, je drei Breiten: 1440/960/720) |
| Klassen ↔ CSS / Umlaute | `klassen.py` **0** · `umlaute.py` **GRÜN** |
| Regelwerk | `ethos.py` **GRÜN** (R1 23, R2 17, R3 4, R4 134, R5 0, R6 7, R7 0, R8 0, R9 58, R10 41, R11 0; R12 nicht gemessen) |
| Simulation | **unverändert** |
| Bau | **143 Module** (98 headless) |
| Einzeldatei | **4.080.274 B** · SHA256 `49FC2FA5746A23334DE6F41FC954D687AB4607D555ACF4B61EE96A9E9E56D89E` · beide byte-gleich · 0 Außenverweise |
| Doku / Stand | 65 Dokumente erzeugt, 0 tote Verweise, `seite.py --pruefen` GRÜN · `stand.py --pruefen` 0 Abweichung |
| Sichtprüfung | 39 Zustandsmessungen in 1440/960/720: 0 seitlich scrollende Seiten, 0 JS-Fehler, 3 abgeschnittene Textknoten nur in der VLSM-Balkenbeschriftung kleiner Blöcke (die Legende nennt den vollen Namen); Kontrast 14 Textpaare × 7 Theme-Zustände = 0 Verstöße; „Bewegung aus" = 0 Animationen; 56 Rohziele unter 44 px sind ausschließlich die Bit-Zellen (begründete Ausnahme) |
| Echte `.exe` | Die ausgelieferte `.exe` baut der Release-Ablauf aus dem Tag (Windows-Läufer). Ein lokaler Bau mit ProductVersion 2.9.0 wurde geprüft; auf `Programm/Netzwerk-Labor.exe` konnte er nicht gelegt werden, weil dort eine fremde, laufende 2.7.0-Instanz lag (Prozess nicht angefasst — AGENTS.md Regel 1). |
| Android-APK | **nicht gebaut** (kein Android-SDK auf diesem Rechner) |

Belege: `Nachweise/runde7/abnahme/` (39 Zustandsmessungen + Bilder je Theme), `Nachweise/runde7/review-design.md`,
`Nachweise/runde7/review-didaktik.md`, `Nachweise/runde7/w3-messung-*.json`.

## 4 · Was bewusst nicht passiert ist / offene Punkte

- **Kein Hub-Umbau**: Das „Heute"-Raster hat eine feste 12-Spalten-Belegung (Zeilen 1–3 vollständig);
  eine zusätzliche Kachel hätte die gemessene Bento-Ordnung gebrochen. Die Auffindbarkeit leisten
  Dock, Befehlspalette und der Querverweis am Ende der Trainingsliste. (Im Vertrag § 2.5 als „nur wenn
  messbar Platz frei" vorgesehen.)
- **R12** (max. 6 sichtbare Bedienelemente) ist ohne `--dom` nicht gemessen; die Abteilung ist
  bewusst ruhig (Register + Kopf), die Werkzeugflächen haben je Werkzeug mehrere Bedienelemente.
- **Keine Änderung an** `src/sim/`, `src/modell/`, `src/kern/`, `src/cli/`, an `spiel/injektoren.js`,
  an der Mini-Mechanik, am Lernmotor, an den fünf Theme-Dateien `zzz-thema-*.css`, an der
  Parallel-Sitzung (Kurzübung/Flugschreiber).
- **Nicht geprüft**: Screenreader, echte Maus im ausgelieferten Tauri-Fenster (nur Prüfbau),
  Android-APK (kein SDK), Verhalten auf echten Schülergeräten.

## 5 · Prüfungen

Zwei unabhängige Lesungen (read-only) haben gegengelesen; Berichte:
`Nachweise/runde7/review-design.md` (Design/Theme/Barrierefreiheit; Befunde B1–B3, S1–S12) und
`Nachweise/runde7/review-didaktik.md` (Fachlichkeit/Didaktik/Code; Blockierend 1–5).

**Eingearbeitet (blockierend):** Lektion/visuelle Hilfe bei 960 px (volle Breite, Bit-Reihe bricht
containerabhängig um statt 2-px-Zellen); Tastaturfokus nach jedem Neuzeichnen (Fokusziel je Aktion,
`NodeList.find`-Fehler behoben); Netz-Sortierer tastaturbedienbar; `/31` ohne Netz-ID/Broadcast
(RFC 3021) in Generator und Werkzeugen; VLSM-Reserve rechnet über die API (144 frei statt
„überbucht"); Trunk-Optionen semantisch eindeutig; Prüfrunde setzt „sicher" nur ohne Hilfe;
Zusammenfassen-Erklärung dynamisch korrekt; Schrittzahl der Stufenmatrix als additives Feld
`loesungsschritte` (E 1, AP1 2–3, AP2 3–5; der angezeigte Rechenweg bleibt 3–6).

**Eingearbeitet (sollte):** doppelter Kartenrahmen, sichtbare Meldung bei leerer Eingabe,
Tab-ARIA/Fokus, 44-px-Ziele (Bit-Zellen: begründete Ausnahme, dichtes Direktmanipulations-Raster),
Werkzeug-Ergebnisraster, Blocklineal über volle Breite, aria-live für Rechenweg, Präfix-Blitz mit
„Weiter" und stehender Erklärung, Presets aus Lektion/Formelsammlung, Filiale-Szenario,
`color-scheme` der beiden hellen Wege, Lernstand-Text im Spielabschluss, Lehrplan-Korrekturen
(Modul 6/8, /31-Ausnahmen, Formelsammlung).

**Bewusst offen (mit Begründung):** `--faint` auf `--panel-3` liegt bei 4,45:1 (dunkel) bzw.
4,38:1 (hell) — das ist ein Alt-Token der fünf Theme-Dateien, die diese Runde nicht anfasst; im
Kontext (VLSM-Reserve-Label) ist der Text zusätzlich durch Position und Balken getragen. R12
(`--dom`) nicht gemessen, Android-APK fehlt (kein SDK), Screenreader nicht geprüft.

## 6 · Veröffentlichung 2.9.0

Fassung **2.9.0**, `VERSION_CODE` 20901, Commit auf `ausbau-1.2`, Tag
`v2.9.0` — stehende Nutzerfreigabe für Push/Tag/Release (30.10.2026) gilt weiter. Die Fassung
2.8.0 der Parallel-Sitzung (Kurzübung/Flugschreiber) ist als eigener Commit davor; diese Runde zählt
nur die Abteilung Subnetting. Der Nachweis nach dem Deploy (Live-SHA256, Release-Anhänge, CI-Läufe)
steht in § 7.

## 7 · Nachweis (nach dem Deploy gemessen)

Platzhalter — Live-URL, Release-URL, Prüfsummen, Anhänge, CI-Ergebnisse und die ehrliche Liste
„nicht geprüft" werden hier nach der Veröffentlichung eingetragen.

## 8 · Für die nächste Sitzung

- R12 mit `python tools/ethos.py --dom` bei laufendem Programm messen (Subnetting-Ansicht).
- Die Abteilung im Tauri-Fenster und mit echten Schülern erproben (Verständlichkeit der
  Blockgrößen-Module, Tempo der Prüfungsfälle).
- `tools/rauch.py` hat seit dieser Runde eine Messhygiene (Auftragsbogen/Toasts vor der
  Hauptaktions-Prüfung schließen); die sieben 720-px-Fälle waren auf HEAD 2.7.0 identisch rot
  (38/45), sind also vorbestehend und keine Runde-8-Regression.
