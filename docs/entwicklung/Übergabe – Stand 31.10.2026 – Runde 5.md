---
tags: [FISI, Lernspiel, Netzwerk, Runde5, Übergabe, Kontext, Leiste]
erstellt: 2026-10-31
status: Fassung 2.7.0 gebaut, getestet und veröffentlicht; Abnahme in § 3/§ 6.
---

# Übergabe — Stand 31.10.2026 (Runde 5 „Leiste & Auftragsmappe")

## 1 · Auftrag und Vorgehen

Der Nutzer hat nach der 2.6.0-Abnahme drei Bildschirmfotos aus dem laufenden Programm geschickt und
dazu geschrieben: „unordentlich überlappende Elemente", „manche Elemente sind nicht richtig
ausgerichtet", die Minileiste „vermittelt visuell nicht ihren Nutzen, sondern overwhelmed den Nutzer",
„das Zusammenfallen muss schöner animiert werden von der Leiste" und „die Aufträge zu simulieren im
Minimodus funktioniert nicht richtig, da viel zu wenig Kontext herrscht … das Konzept muss umgedacht
werden". Ausdrücklich: **Full Skill Usage und Agenten-Schwärme**.

Umgesetzt mit dem Projekt-Prozess `netzwerk-labor-redesign` (Vertrag → Welle → Abnahme →
Doku/Stand/Fassung), dem Skill `workflows` (Schwarm) und `computer-use` (Abnahme am echten
Fenster). Drei Schreib-Owner (ein Schreiber je Datei), zwei unabhängige Prüfungen, Leitung
integriert. Vertrag: [Entwurf – Runde 5](<Entwurf – Runde 5 (Leiste & Auftragsmappe).md>),
[Architektur § 24](../Architektur.md), [Design § 41](<Design – Spielspaß 2.0.md>).

**Vorher gemessen (Audit, CDP, Prüfbau 2.6.0):** Mappe 560×515 px mit Leisten-Überlappung und
326 px leerer Zielliste; Inspektor-Kopf 135 px, gequetschte 4-Spalten-Portzeilen (62–73 px Felder),
scrollH 615 / clientH 429 mit angeschnittener Zeile; Leiste 300×56 bei 55 % Deckkraft, Werte
zweizeilig, harte 160-ms-Animation; Karte mit 9 überlappenden Label-Paaren. Belege:
`Nachweise/runde5/audit/`.

## 2 · Was jetzt da ist

| Fläche | Dateien | Was neu ist |
|---|---|---|
| Auftragsbogen + Karte | `src/ui/spiel.js`, `src/stil/spiel.css`, `src/ui/editor.js`, `src/stil/editor.css` | Mappe als Blatt mit Kopf (AUFTRAG · Kunde, Titel, Ziele/Niveau, Reiter, X, Fuß mit „Ziele ansehen" + einer Hauptaktion); Klasse `mappe-an` lässt Werkzeugleiste/Flächentitel ruhen, Auftragsbereich auf z-index 30; Höhe folgt Inhalt (315 px bei einem Ziel, 426 px bei drei, max. `min(70vh,560px)`), ≤900 px Blatt von unten; Fokus rein/raus, Esc; Karte: 15-px-Labelzeilen, IP nur bei Hover/Auswahl/≥85 % Zoom, Decluttering für IP |
| Inspektor | `src/ui/inspektor.js`, `src/stil/inspektor.css` | Kopf 135→102 px mit einer Kennzahlenzeile; Ports als 2-zeiliger Block (Name + Link- + Modus-Chip; Modus/VLAN-Felder 44 px, 141/136 px breit, je eine Beschriftung); eigene scrollende Portliste mit ganzem Zeilenraster (keine angeschnittene Zeile, sichtbarer Scrollbalken); SVI-Karte im VLAN-Reiter |
| Mini-Leiste | `src/ui/leiste.js`, `src/stil/leiste.css`, `src/ui/app.js` (Deckkraft) | Konzept „Begleiter": löst keine Aufträge mehr; zugeklappt Stufe·Rolle + drei Werte in einer Zeile, Deckkraft 0,92 (Regler 60–100 %); aufgeklappt „Jetzt dran" mit nächstem Schritt (echte Daten) + „Im Labor fortsetzen"/„Auftrag lesen", „Kurzübung (freiwillig)" mit Kontextzeile, „Lage", Schnellaktionen; Animation 320 ms mit gestaffeltem Inhalt, Zuklappen Inhalt→Karte→Fenster; „Bewegung aus" sofort; Maße 300×56/320×300 und `.lk-*`-Haken unverändert |
| Grundlage | `tests/ui-leiste-ueberlappung.test.js`, `src/stil/spiel.css` (Fokusregel „Auftrag lesen") | Test auf die neue Mechanik umgestellt (6 statt 4 Fälle); der offene Zustand von „Auftrag lesen" bleibt auch gegen Theme-Regeln sichtbar |

## 3 · Gemessene Abnahme (in dieser Sitzung)

- `node tests/run.js` bzw. `sh tools/test.sh`: **932/932 grün**, 0 übersprungen (109 Testdateien,
  95 headless Module) — +2 Fälle durch den umgestellten Überlappungstest.
- `sh tools/test.sh --rauch`: **45/45**.
- `python tools/klassen.py`: **0** · `python tools/ethos.py`: **GRÜN** (R1 23, R2 17, R3 4,
  R4 169→**135**, R9 62→58, R10 42 = Stand; R12 nicht gemessen) · `python tools/umlaute.py`:
  **GRÜN** · `node tools/sim-stand.js`: **Simulation unverändert**.
- Bau: **138 Module** (95 headless) — unverändert, der Umbau blieb in den vorhandenen Dateien.
- Messungen nach dem Umbau: Mappe 315 px bei einem Ziel (Leerraum 16 px, vorher ~300), keine
  sichtbare Werkzeugleiste/Flächentitel bei offener Mappe, Karte **0** überlappende Label-Paare
  (1440/960/720, fit/100 %/25 %, 7 Themes), Inspektor-Kopf 102 px und 141/136-px-Portfelder ohne
  angeschnittene Zeile, Leiste 300×56 / 320×300 ohne Überlauf, Werte einzeilig, Animation 320 ms
  `cubic-bezier(.22,1,.36,1)`, Zuklapp-Reihenfolge Inhalt→Karte→Fenster belegt, „Bewegung aus"
  ohne Animation, Kontrast der Leistenwerte ≥4,5:1 in allen Themes (min. 4,71 im Hell-Schema).
- Sichtprüfung: je Fläche 1440/960/720 + Themes/Hell/Bewegung aus; Belege unter
  `Nachweise/runde5/{auftragsbogen,w2,leiste}/` und `Nachweise/bento/w2/`.
- **Echte Windows-`.exe`:** **8.956.928 B**, ProductVersion **2.7.0**, SHA256
  `593597c7…e7c5c0e2`, Integritätsstufe „Mittel", liegt als `Programm/Netzwerk-Labor.exe`
  (Sicherung `Programm/Netzwerk-Labor-vor-2.7.0.exe`). Die Abnahme mit `tools/q-echt.py`
  (echte Maus, erster Auftrag, Kabel-Ziehen, Funktionsprobe) lief **auf der ausgelieferten Datei
  selbst**: **0 Fehler**, Kabel Kasse→Switch 4 → 5, Abnahme **5 ★**, Fernwartungs-Schild 400 × 350,
  5 Bildschirmfotos. Die Nachher-Messung (Mappe/Inspektor/Leiste) lief auf einem Prüfbau mit eigener
  App-Kennung (dort sind Fenstergrößen messbar); es ist derselbe Code.

## 4 · Was bewusst nicht passiert ist / offene Punkte

- **Keine Änderung an** `src/sim/`, `src/modell/`, `src/kern/`, `src/cli/`; keine neuen
  Spielzustände oder Datenformen; Themes (`zzz-thema-*.css`) unangetastet; Kiosk-Dateien der
  parallelen Sitzung unberührt; kein `git add -A`.
- **SVI im VLAN-Reiter** statt im Ports-Reiter (fachlich richtig und Platzgewinn; Rückbau auf Zuruf
  klein).
- **Leisten-Kapselknöpfe** sind 44 px hoch, aber 40 px breit (300-px-Vertrag, rein mausbedient,
  `tabindex="-1"`) — bewusste Verdichtung.
- **Theme-Regeln schlucken** an Inspektor-Feldern den globalen Fokusring (`outline:none` in
  einzelnen Theme-Dateien) — gemeldet, nicht in dieser Runde geändert (Lead-Dateien).
- **R12** (`ethos --dom`) bleibt ungemessen; **Android-APK** fehlt (kein SDK); **Screenreader**
  nicht geprüft; 720 px mit Anfänger-Hilfe zeigt die Zeitachse kleiner (Hilfe abschaltbar).

## 5 · Prüfungen und Fix-Runde

Zwei unabhängige Prüfer (read-only) haben nach der Umsetzung gegengelesen: **Bento-Design**
(Originalität, Klarheit, Professionalität, Animation) und **Theme/Struktur/A11y** (5 Themes +
hell/dunkel, Fokus, 44 px, reduced motion, Tokens, Haken). Berichte:
`Nachweise/runde5/review-design.md`, `Nachweise/runde5/review-theme-a11y.md`.

**Design-Urteile:** W1 Auftragsbogen/Karte „nachbessern", W2 Inspektor „annehmbar", W3 Leiste
„nachbessern". Eingearbeitet:
- **blockierend (W1):** Bei 960/720 lag der Auftragsbogen unter dem offenen Inspektor-Dock
  (z-index 45), X und „Zurück ins Labor" waren verdeckt. Fix: `.labor.mappe-an .lb-auftrag` steigt
  von 30 auf **50**; der Test prüft die Sprosse jetzt gegen den gemessenen Dock-z-index (nicht mehr
  gegen eine feste 30).
- **W3:** Antwort-Zustand der Kurzübung war abgeschnitten (Karte wächst jetzt auf 320×480, feste
  Aktionszeile außerhalb des Scrollbereichs), Dichte gesenkt (Kurzübung startet als einzeilige
  Einladung, öffnet auf Klick, Karte 320→420; drei Antworten à 32 px sichtbar).
- **W2:** doppeltes „Inspektor" (Theme-Pseudotitel + Kicker) → Kicker heißt jetzt „GERÄT · <Typ>".
- **kann:** Mappen-Oberkante von 4 px auf 2 px (Bento-Rail); Portzahl-Dopplung und Access-Portliste
  als bekannte Punkte dokumentiert.

**A11y-Urteile:** kein Release-Blocker; ein mittlerer Befund und fünf niedrige. Eingearbeitet:
- **mittel (B1):** Papier-Theme schluckte den Fokusring am Feld (`outline:none`) — entfernt, der
  zentrale `:focus-visible`-Ring steht jetzt auch dort (2 px Akzent, Offset 2 px).
- **niedrig:** Plan-Reiter-Bedienelemente der Mappe ≥ 44 px (über die vorhandene 44-px-Regel);
  „Mini"-Badge und Postfach-Zähler im Hell-Schema von `--accent` auf `--ink` (Kontrast ≥ 4,5:1);
  der scrollbare Mini-Bereich ist per `tabindex="-1"` nicht mehr in der Tab-Reihenfolge;
  Vertragstext auf die gemessenen 320 ms (Token `--dauer-lang`) korrigiert.
- **nicht geändert:** übrige Inspektor-Felder 30–34 px (Altstand), Leisten-Kapselknöpfe 40 px breit
  (300-px-Vertrag, rein mausbedient), alle Themes in jedem Einzelstrang.

## 6 · Veröffentlichung 2.7.0

1. Fassung **2.7.0** gezogen (`tools/fassung-ziehen.py --neu 2.7.0 --setzen`), `VERSION_CODE` in
   `android/bauen.py` von Hand auf **20701**.
2. Erzeugnisse gebaut: `python bauen.py`, `python tools/einfach.py` (beide Ziele byte-gleich),
   `cargo tauri build --no-bundle`, `python tools/seite.py`, `python tools/stand.py`; Prüfmodi grün.
3. Commit auf `ausbau-1.2`, Push des Zweigs, Tag `v2.7.0`, Push des Tags — stehende Freigabe des
   Nutzers für Push, Tag und Release (30.10.2026). Danach messen: Live-Seite gegen
   `docs/index.html` hashen, Release-Anhänge, Größen, ProductVersion und `Content-Disposition`
   prüfen (Abschnitt 7).

## 7 · Nachweis 2.7.0 (nach dem Deploy gemessen)

*(wird ergänzt)*

## 8 · Für die nächste Sitzung

- **R12** ist die offene Messung (`python tools/ethos.py --dom` bei laufendem Programm).
- Ein echtes Tauri-Fenster ohne fremde Instanz: `python tools/q-echt.py` ist der normale Weg.
- Die Prozess-/Skill-Nutzung (netzwerk-labor-redesign, workflows, computer-use) hat sich bewährt:
  Vertrag vor Code, ein Schreiber je Datei, zwei unabhängige Lesungen, Gates vor dem Release.
