---
tags: [FISI, Lernspiel, Netzwerk, Redesign, Bento, Übergabe, Kontext]
erstellt: 2026-10-30
status: Umbau gebaut, Gates gemessen, lokal zu committen; Push/Release/Tauri-Bau offen (Nutzerentscheidung).
---

# Übergabe — Stand 30.10.2026 (Bento 2.5 „Arbeitsplatz")

## 1 · Auftrag und Vorgehen

Der Nutzer hat fünf Bereiche zur Neugestaltung benannt (wörtlich/sinngemäß): **Postfach** „lieblos und
unpersönlich"; **Kunden** „zu kindlich, weniger wie in einer Job-Simulation mit Kundenprofil und
ansprechender Bento-Ästhetik"; **Dashboard** wirkt wegen Ziele/Sitzung/Klassenraum „wie ein
einzelnes unordentliches Objekt"; **Training** „zu sehr altes Design, kindlich, unprofessionell, nur
eine unübersichtliche Kaskade an Einheiten"; die **minimierte Leiste** „komplett überarbeitet, viel
interaktiver, bessere und innovativere Inhalte". Dazu der Hilfeleiter-Slogan aus dem ersten
Screenshot. Ausdrücklich verlangt: **pro Bereich ein Expertenteam**.

Umgesetzt wurde das als **fünf parallele Bereichsteams** (je ein Schreiber, ein Schreiber je Datei),
mit einem **gemeinsamen Gestaltungsvertrag** und gemeinsamen Bausteinen der Leitung, danach zwei
**unabhängigen Prüfungen** (Design und Theme/Struktur). Das ist die in `AGENTS.md` erlaubte
Agenten-Ausnahme (Schreib-Owner begrenzt, ein Schreiber je Datei, Leitung integriert und prüft).

## 2 · Was jetzt da ist

| Bereich | Dateien | Was neu ist |
|---|---|---|
| Postfach + Hilfeleiter | `src/ui/spiel.js`, `src/stil/spiel.css` | Posteingang mit vier echten Kennzahlen, Monogrammen, sauberem Brief, Kundenkontext und Zielen; Blatt < 900 px; KPI „ungelesen" frisch; Hilfeleiter als Diagnose-Assistent mit 1–6-Leiste, „Nächste Diagnose", Werkzeug-Chips, 44-px-Trefferflächen; Kunden-Emoji aus der Labor-Auftragszeile durch Monogramm ersetzt |
| Kunden + Kundenakte | `src/ui/karriere.js` (nur Kunden-/Akte-Teil), `src/stil/karriere.css`, `src/stil/kundenakte.css` | Portfolio mit begründeter Hauptkachel, gleich hohen Profilkacheln (Branche, Kontakt, Vertrag/€/h, Aufträge/Ø-Sterne, Vertrauenssegmente), eigener Sektion für gesperrte Kunden; Akte als Dossier mit Datenkacheln, begrenztem Atlas + Leerzustand, Geschichten, Zuletzt, Belohnungen |
| Dashboard „Heute" | `src/ui/hub.js`, `src/stil/hub.css` | 12-Spalten-Bento: Hero + Kennzahlen; drei gleich hohe, gleich gekleidete Kacheln Tagesziel/Letzte Sitzung/Klassenraum; Lagebild + „Heute dran" mit echten Werten (Wiederholungen, Bereitschaft, Übungen, Wochenziel); erfundene Signal-Werte entfernt; Klassenraum-Code in der Kachel |
| Training | `src/ui/training.js`, `src/stil/training.css` | Trainingsarena mit Kennzahlen (Ring, Durchgänge, Bildungsstand), funktionaler Filterleiste, Weiterlernen-Kachel, sieben Lernpfaden mit klebenden Köpfen; je Pfad eine Karte „Nächster Schritt" (nur die primär); Quelle zweizeilig, Ergebnis-/Fehlerkarte ruhiger |
| Minimierte Leiste | `src/ui/leiste.js`, `src/stil/leiste.css` | „Nebenbei-Cockpit": zugeklappt unveränderte 300 × 56-Statuszeile mit €/h, Ruf, offenen Tickets, Mini-Signal, Hilfe, Öffnen; aufgeklappt 320 × 300 mit „Jetzt dran", vollständig bedienbarem Mini-Ticket und Status & Verträgen plus Fußzeile (Postfach-Zähler, Labor) |
| Eigener Spielstand | `src/ui/uebergabe.js`, `tests/ui-uebergabe.test.js` | Neuer Abschnitt „Neu anfangen" in den Einstellungen: setzt nach Bestätigung den Spielstand dieses Rechners auf 0 zurück (Geld, Ruf, Stufe, Kunden, Aufträge, Fehlerdex, Trainings- und Lernstand), Einstellungen bleiben; Sichern als Datei und Abbrechen im Dialog; im Tauri-Programm wird die Oberfläche im laufenden Prozess neu aufgebaut, weil ein Seiten-Reload die beim Start eingelesenen Altdaten zurückbrächte (gemessen) |
| Grundlage/Integration | `src/stil/bento.css`, `src/ui/bento.js`, `tools/vorschau.py`, `docs/Architektur.md` § 22, `docs/entwicklung/Entwurf – Bento 2.5 (Arbeitsplatz).md` | 12-Spalten-Raster, Kachel, Chips, Monogramm; private Vorschau-Bauten für parallele Teams; Gestaltungsvertrag |

## 3 · Gemessene Abnahme (in dieser Sitzung)

- `node tests/run.js` bzw. `sh tools/test.sh`: **878/878 grün**, 0 übersprungen.
- `sh tools/test.sh --rauch`: **45/45 grün** (der erste Lauf war 44/45; einziger Befund
  „Postfach, 960 px: `.sp-leser` scrollt seitlich (+8 px)" — behoben, danach wiederholt, siehe § 5).
- `python tools/klassen.py`: **0 Klassen ohne CSS-Regel**.
- `python tools/ethos.py`: **GRÜN**, besser als der eingefrorene Stand (R2 20→19, R4 169→153,
  R9 62→58, R10 42→39). **R12 nicht gemessen** (ohne `--dom`, wie zuvor).
- `python tools/umlaute.py`: **GRÜN**, 0 offene Befunde.
- `node tools/sim-stand.js`: **Simulation unverändert** gegenüber dem Referenzstand.
- `python tools/seite.py --pruefen`: **GRÜN**, 54 Dokumente, 0 tote Verweise.
- `python tools/einfach.py` / `--ziel Netzwerk-Labor.html`: **3.581.197 B**, SHA256
  `09647D34…94572`, **0 Außenverweise**, beide byte-gleich; README-/Doku-Bilder (8 Aufnahmen)
  aus dem neuen Bau erneuert (`docs/bilder/HERKUNFT.md`).
- **Programm gebaut und gestartet:** `Programm/Netzwerk-Labor.exe`, Release-Bau
  **13.905.408 B**, ProductVersion **2.4.0**, SHA256 `0AF8B38C…FEB1B7`, Integritätsstufe
  „Mittel"; `python tools/q-echt.py` auf diesem Bau **0 Fehler** (erster Auftrag mit echter Maus
  gelöst, **5 ★**, Fernwartungs-Schild sichtbar, 5 Bildschirmfotos); das Programm läuft aktuell
  mit dem echten Spielstand. Alter Bau gesichert unter `Programm/Netzwerk-Labor-vor-Reset.exe`
  (und `…-vor-Bento.exe`).
- **„Von 0 anfangen" im echten Programm nachgemessen:** Der E2E-Lauf über CDP auf einer Kopie
  des echten Spielstands drückte „Neu anfangen" → danach im Speicher **Stufe 1, 0 €, 0 Ruf,
  Postfach 2, 0 erledigte Tickets, Lernstand 0**, Ansicht „Heute"; die Datei
  `spielstand.json` schrumpfte von 359 KB auf 99 KB (frischer Stand). Der echte Spielstand
  unter `%APPDATA%\de.fisi.netzwerklabor` wurde dabei **nicht** angefasst (nur kopiert).
- Sichtprüfung: `Nachweise/bento/final/` (nicht versioniert) mit je 1440/960/720 für Heute,
  Postfach, Kunden, Kundenakte, Training, Hilfe und Leiste (zugeklappt/aufgeklappt), dazu
  Vorher-Bilder unter `Nachweise/bento/vorher/`.
- Unabhängige Prüfungen: Design-Review über alle fünf Bereiche (Befunde eingearbeitet) und
  Theme-/Struktur-Prüfung **7 Zustände × 7 Ansichten** ohne harten Kontrastbruch, 0 Emoji in
  `src/ui/**` und `src/stil/**`, 0 JS-Fehler, 52 `.tr-karte` mit intakten Testhaken.
- Zeilenenden der bearbeiteten Dateien unverändert; keine Änderung an `src/sim/`, `src/modell/`,
  `src/kern/`, `src/cli/`, an Themes oder an Tests.

## 4 · Was bewusst nicht passiert ist

- **Kein `git push`, kein Tag, kein Release, keine Fassungserhöhung** — nur lokale Commits.
- **Keine Android-APK gebaut** (Android-SDK fehlt auf diesem Rechner, siehe 29.10.). Die Optik ist
  in Edge headless bei 1440/960/720 und in sieben Theme-Zuständen geprüft; der **Release-Bau der
  `.exe`** ist gebaut, mit `tools/q-echt.py` echt bedient und gestartet (siehe § 3).
- **R12** (`ethos --dom`, „max. 6 Bedienelemente je Ansicht") bleibt ungemessen; das neue Training
  hat designgemäß mehr Bedienelemente (7 Filter + Kartenknöpfe). Die Entscheidung „einfrieren oder
  Oberfläche reduzieren" steht weiterhin beim Nutzer.
- **README-/Doku-Bilder** wurden in dieser Sitzung erneuert (8 Aufnahmen, `docs/bilder/HERKUNFT.md`);
  sie zeigen den Bento-2.5-Bau.
- Hover-/Tastaturzustände und „Bewegung aus" wurden nicht flächendeckend durchgeklickt.

## 5 · Der eine Rauch-Befund und seine Behebung

`sh tools/test.sh --rauch` meldete im ersten Lauf:

```
✗ 960 px  Postfach  „Auftrag annehmen ▸“  ← div.sp-leser scrollt seitlich (+8 px)
```

Ursache und Reparatur sind im Bericht des Postfach-Teams belegt (horizontale Überbreite im
960er-Leser, behoben in `src/stil/spiel.css`); der Lauf wurde danach wiederholt.
**Ehrlich:** der erste Rauchlauf war rot; die Wiederholung nach dem Fix ist die Abnahme.

## 6 · Nächster Schritt

1. Diesen Stand lokal committen (auf `ausbau-1.2`, kein Push).
2. Nutzer entscheidet über: Fassung (Vorschlag 2.5.0), Push/Tag/Release, Android-APK,
   R12 einfrieren oder Oberfläche reduzieren.
3. Danach ggf. README-Bilder erneut ziehen, sobald die Fassung steht
   (`python tools/bilder.py` + Cache-Buster in `README.md`).
