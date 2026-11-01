# Plan 3.1.0 — Variante B: Onboarding, Analyse-Begleiter, Labor-UX, Layout, Quality Control

Status: freigegeben durch Nutzer („entwickle B bis zum deploy", 2026-11-01). Ziel: implementieren, testen,
dokumentieren, fassungsziehen 3.1.0, committen, taggen, deployen (Release). Ohne Android-Keystore-Secrets
bleibt der APK-Anhang/SHA256SUMS wie bei 3.0.0 rot — ehrlich ausweisen.

## Entscheidungen
- Prozessmodell = vollständige Handlung (IHK): klären → Lage/Schichten → Hypothese → Messen → Eingreifen →
  Verifizieren → Dokumentieren → Reflektieren, verdichtet auf 6 Leitfaden-Schritte.
- Engine erkennt Fortschritt NUR aus echten Spielzuständen (keine Zeit/Klick-Zählung), liefert Impulse,
  keine Lösungen; Prüfungsmodus reduziert auf neutralen Status; Prozesshilfe kostet keine Sterne.
- Onboarding: 4 Schritte, überspringbar, einmalig, wiederholbar über Einstellungen; kein R12-Einfluss (Overlay).
- Labor: rechte Leiste bekommt sichtbare Kernaktionen (Prüfen/Messen/Konfigurieren/Dokumentieren/Abnahme),
  ⋯-Menü behält Selten-Aktionen. Keine neuen Dauer-Bedienelemente in R12-Ansichten (Messung prüfen!).
- Layout: Inspektorbreite per Ziehen änderbar, persistiert, Doppelklick = Standard, Tastatur über
  Alt+←/→ (kein fokussierbares Handle → R12-Zahl bleibt), Min/Max/Reset.

## Dateien
Neu: src/daten/leitfaden.js (Phasen + Onboarding-Texte) · src/spiel/leitfaden.js (Erkennung) ·
src/ui/leitfaden.js (Panel) · src/ui/onboarding.js (Tour) · src/stil/leitfaden.css (Panel/Onboarding/Trenner).
Geändert: src/ui/inspektor.js (Aktionsleiste, Trenner) · src/ui/app.js (Shortcuts, Einstellungen: Tour wiederholen,
Breite zurücksetzen) · src/ui/dom.js (Panel-Mount) · src/stil/inspektor.css/editor.css (Layout) ·
src/kern/basis.js (Defaults einst.layout/tour) · Tests: tests/leitfaden-engine.test.js, tests/onboarding-tour.test.js,
tests/labor-aktionen.test.js, tests/layout-breite.test.js; Anpassungen an ui-/kern-Tests.

## Aufgaben (TDD, je Task roter Test zuerst)
1. Daten + Texte: LEITFADEN (6 Schritte, je 2–3 Impulse, kein Lösungsleck), TOUR (4 Schritte, je Ziel+Text).
2. Engine: Spiel.leitfaden.{stand,phase,fortschritt,naechsterSchritt,pruefungAktiv,zuruecksetzen}.
   Erkennung: ticket geladen · Gerät/Lage angesehen · Hypothese gesetzt · min. 1 Messung · Eingriff gemacht ·
   Verifikation nach Eingriff · Dokumentation/Abnahme. Nur lesend, keine neuen Spielstände.
3. Panel: UI.leitfaden zeichnet im Inspektor (oben) Status je Schritt, aktueller Schritt + „nächster Schritt",
   Fortschrittsring; in Prüfung nur neutraler Hinweis; Toggle über bestehende Kopfzeile (kein 7. Knopf in R12-Ansicht).
4. Onboarding: UI.onboarding.tour() beim ersten Start nach Spiel.laden (nur wenn kein Ticket offen), 4 Schritte,
   Buttons [Überspringen][Weiter][Los geht’s]; store einst.tour.gesehen; Einstellungen: „Einführung wiederholen".
5. Aktionsleiste: Inspektor-Kopf/Kontextzeile mit sichtbaren Kernaktionen (aus vorhandenen UI.labor-/Akte-Funktionen);
   ⋯ nur Seltenes; Discoverability-Test: Kernaktionen ohne ⋯ sichtbar und klickbar.
6. Layout: ziehbarer Trenner Fläche↔Inspektor (pointer), Breite 280–560, Default 360/320, store einst.layout.inspBreite,
   Doppelklick Reset, Alt+←/→ global; R12-Messung vor/nach unverändert.
7. Tests/Gates: Engine-Erkennung (echte Aktionen), Kein-Leck-Gate (keine Adressen/Lösungen in Impulsen),
   Tour einmalig/replay/skip, Prüfungsmodus, Aktionssichtbarkeit, Breiten-Persistenz/Reset, R12/44px, volle Suite.
8. Sicht: vision vorher/nachher (Onboarding, Panel mit Fortschritt/Prüfungsmodus, Aktionsleiste, Resizer; 1440/960/720,
   hell+dunkel + 2 Themes), r-design-Abnahme, r-didaktik-Abnahme (Phasenmodell, kein Leck, Prüfungsnähe).
9. Doku/Fassung: CHANGELOG 3.1.0, Design §46, Übergabe 3.1.0, README/FAQ, INHALT; fassung-ziehen --neu 3.1.0
   + VERSION_CODE 30101; Builds (HTML/EXE/ZIP/APK lokal); Stand/Seite; Gate-Kette; Commit; Tag v3.1.0; Push;
   Release prüfen; ehrlicher Bericht APK/SHA256SUMS-Lücke.

## Abnahmekriterien
- Frischer Spielstand: Tour erscheint einmal, überspringbar; zweiter Start ohne Tour; Wiederholen über Einstellungen.
- Leitfaden zeigt Phasen aus echten Aktionen, aktualisiert live, kein Lösungsleck, in Prüfung gesperrt; kein Sternabzug.
- Kernaktionen im Labor sichtbar (≤1 Klick), ⋯ nur selten; Nutzer muss Bedienpfad nicht raten.
- Inspektorbreite ziehbar/persistiert/Reset; Tastatur; keine R12-Zunahme (gemessen).
- Volle Suite grün, rauch 64/64, menueprobe 5/5/0, R12-Ratsche 0 Verstöße, stand/seite/doku-claims/fassung grün,
  abnahme-3.0 --schnell grün, vision/R-design/R-didaktik 0 P0/P1.
- Release v3.1.0 veröffentlicht (HTML/EXE/Browser-ZIP); APK/SHA256SUMS-Lücke benannt.
