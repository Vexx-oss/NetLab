---
tags: [FISI, Lernspiel, Netzwerk, Redesign, Bento, Übergabe, Kontext]
erstellt: 2026-10-30
status: Fassung 2.5.0 gebaut, getestet und (mit Freigabe) veröffentlicht; Abnahme in § 3/§ 6.
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
  `7F4F94B9…010F3F4`, **0 Außenverweise**, beide byte-gleich; README-/Doku-Bilder (8 Aufnahmen)
  aus dem **2.5.0-Bau** erneuert (`docs/bilder/HERKUNFT.md`).
- **Programm gebaut (Fassung 2.5.0):** `Programm/Netzwerk-Labor.exe`, Release-Bau
  **13.905.408 B**, ProductVersion **2.5.0**, SHA256 `9B4E2379…C40726B`, Integritätsstufe
  „Mittel"; `python tools/q-echt.py` auf diesem Bau **0 Fehler** (erster Auftrag mit echter Maus
  gelöst, **5 ★**, Fernwartungs-Schild sichtbar, 5 Bildschirmfotos). Alter Bau gesichert unter
  `Programm/Netzwerk-Labor-vor-2.5.0.exe` (davor `…-vor-Reset.exe` und `…-vor-Bento.exe`).
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

## 6 · Veröffentlichung 2.5.0

1. Fassung **2.5.0** gezogen (`tools/fassung-ziehen.py --neu 2.5.0 --setzen`), `VERSION_CODE`
   in `android/bauen.py` auf **20501**; alle Erzeugnisse neu gebaut (web, Einzeldatei, `.exe`,
   README-Bilder).
2. `tools/stand.py` und `tools/seite.py` neu gelaufen; `stand.py --pruefen`,
   `seite.py --pruefen`, `fassung-ziehen.py --pruefen` grün.
3. Commit auf `ausbau-1.2`, **Push des Zweigs**, Tag **`v2.5.0`**, Push des Tags — mit der
   ausdrücklichen Freigabe des Nutzers vom 30.10.2026. Die Abläufe „Prüfen", „Seite" und
   „Release anlegen" laufen danach auf GitHub; das Release trägt `Netzwerk-Labor.html`,
   das Browser-ZIP und die Windows-`.exe`.
4. Nachmessen: Live-Seite gegen `docs/index.html` hashen, Release-Anhänge und
   `Content-Disposition` prüfen (Schritt 8 der [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md)).
5. Android-APK bleibt offen (Android-SDK fehlt auf diesem Rechner); R12 bleibt beim Nutzer.

## 7 · Release-Nachweis (30.10.2026, selbst gemessen)

- **Release:** [`v2.5.0 — Netzwerk-Labor 2.5.0`](https://github.com/Vexx-oss/NetLab/releases/tag/v2.5.0),
  veröffentlicht 2026-10-30 22:39:59 UTC, kein Vorab-Release.
- **Anhänge (3):** `Netzwerk-Labor.html` **3.581.197 B** · `Netzwerk-Labor-2.5.0-Browser.zip`
  **1.997.992 B** · `Netzwerk-Labor.exe` **8.873.472 B**, ProductVersion **2.5.0**
  (SHA256 `97C3BC83…40E387`). Alle drei antworten mit `Content-Disposition: attachment`.
- **Live-Seite:** <https://vexx-oss.github.io/NetLab/index.html> — SHA256
  `7F4F94B9729281D99912E8CF5B4626CCCCB484E51D753DB75395E3595010F3F4`, **byte-gleich** mit
  `docs/index.html` und dem Release-HTML.
- **GitHub-Abläufe auf `934e7fc`:** „Prüfen" **success**, „Spiel veröffentlichen" **success**,
  „Release anlegen" **success**; im Release-Lauf sind die Jobs „Release bauen und anlegen",
  „Android-APK bauen und anhaengen" und „Windows-Programm bauen und anhaengen" erfolgreich.
  Die **APK wurde übersprungen** (die Android-Schlüssel-Secrets sind nicht gesetzt; der Ablauf
  meldet das als Warnung) — das Release trägt deshalb drei Anhänge, keine APK.
- **Browser-ZIP geprüft:** enthält `START-HIER.md`, `LIESMICH.txt`, `Netzwerk-Labor.html`,
  `LIZENZEN/` und die komplette `doku/`; entpackt ohne Fehler.
- **Nicht geprüft:** die CI-gebaute `.exe` wurde nicht gestartet (nur ihre Fassung 2.5.0
  ausgelesen); die lokal gebaute `.exe` ist mit `tools/q-echt.py` abgenommen. Android-APK
  nicht gebaut.

## 8 · Patch 2.5.1 — Leiste klappt nach 1 s zusammen (31.10.2026)

**Auftrag.** Nutzer: „das mini fenster klappt zu langsam zusammen, lass es nach einer sekunde
zusammenfallen wenn der cursor es verlässt."

**Umsetzung.** `src/ui/leiste.js`: Der Zuklapp-Timer nach `pointerleave` steht auf **1000 ms**
(vorher 5000 ms); Aufklapp-Verzug (280 ms), Maße 300 × 56 / 320 × 300, Statuszeile und
Testhaken unverändert. Kommentar in der Datei und CHANGELOG nachgezogen.

**Gemessen (Edge headless, `web/index.html` 2.5.1, Leiste im Browser-Modus):** pointerleave →
nach **600 ms** Karte noch offen, nach **1,1 s** geschlossen (`auf`-Klasse weg), 0 JS-Fehler.
**Gates:** `node tests/run.js` **878/878 grün**, Rauchtest **45/45**, `klassen.py` 0,
`ethos.py` GRÜN, `umlaute.py` GRÜN, Simulation unverändert, `seite.py --pruefen` und
`stand.py --pruefen` grün.

**Erzeugnisse 2.5.1:** Einzeldatei **3.581.472 B**, SHA256
`9DA8261C…CE57E77A`, 0 Außenverweise, `docs/index.html` und `Netzwerk-Labor.html`
byte-gleich; Windows-`.exe` **13.905.408 B**, ProductVersion **2.5.1**, SHA256
`B5DBBF93…F59F0E9`, `tools/q-echt.py` **0 Fehler**. Fassung und Release werden mit
ausdrücklicher Nutzerfreigabe als Patch `v2.5.1` veröffentlicht.

