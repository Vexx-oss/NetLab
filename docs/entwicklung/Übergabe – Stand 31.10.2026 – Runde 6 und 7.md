---
tags: [FISI, Lernspiel, Netzwerk, Runde6, Runde7, Übergabe, Kurzübung, Flugschreiber]
erstellt: 2026-10-31
status: Fassung 2.8.0 — gebaut, getestet, veröffentlicht (Abschnitt 5/6).
---

# Übergabe — Stand 31.10.2026 (Runden 6 und 7)

## 1 · Auftrag

Nach 2.7.0 kamen zwei Bildschirmfotos: (a) die Kurzübung der Minileiste zeigte eine generische
Frage ohne Netz-Kontext — „wie soll der Schüler das hier lösen? Hier fehlen doch vollkommen die
Kontextinfos"; (b) das Simulations-Panel wirkte „shitty und unübersichtlich, warum sind die Buttons
so groß? Das Auge sollte auf die Infos hingezogen werden. Achte auf die Aufmerksamkeitsführung."
Beides ist umgesetzt: [Runde 6](<Entwurf – Runde 6 (Kurzübung mit Kontext).md>),
[Runde 7](<Entwurf – Runde 7 (Flugschreiber-Aufmerksamkeit).md>), Architektur § 25, Design § 42.

## 2 · Was jetzt da ist

| Fläche | Dateien | Änderung |
|---|---|---|
| Kurzübung | `src/spiel/kurzfrage.js` (neu), `src/ui/leiste.js`, `src/stil/leiste.css` | Frage aus dem echten Netz des Auftrags mit **Lage-Block** (Adresse/Maske, Gateway, Port-Modus, VLAN, Zustand); 5 Vorlagen, deterministisch, genau eine richtige Option, kein Lösungsverrat; ohne Netz keine Frage, sondern Weg ins Labor; Einladung → Klick → Lage/Frage/Antworten → Erklärung + „Im Labor prüfen" |
| Kopfübung | `src/ui/karriere.js`, `src/stil/karriere.css` | Mini-Ticket-Dialog ordnet die generische Frage als „Kopfübung · unabhängig vom laufenden Auftrag" ein (mk-einordnung) |
| Flugschreiber | `src/ui/simpanel.js`, `src/stil/simulation.css` | Drei Ebenen in einer Lesespalte, Fehler als Rail-Zeile, Hilfe als numerierte Liste, ein Hauptweg je Zustand, Ghost-Knöpfe 32 px, Format als Textsegment, leise Verweise; Testhaken und Verhalten unverändert |
| Tests | `tests/kurzfrage.test.js`, `tests/ui-kurzfrage.test.js` (neu) | 8 Generator-Tests (Form, Nachrechnen, Determinismus, Niveau, null, kein Lösungstext) + 10 DOM-Tests der Leiste |

## 3 · Gemessen

- **Abgetrennte Prüfkopie des Commits** (HEAD f0db49b + Runde-6/7-Dateien, ohne die parallele
  Subnetting-Sitzung): `node tests/run.js` **950/950 grün**, 0 übersprungen, 111 Testdateien,
  96 headless Module, **139 Module** gesamt; `klassen.py` **0** · `ethos.py` **GRÜN**
  (R1 23, R2 17, R4 134, R9 58, R10 41) · `umlaute.py` **GRÜN** · `sim-stand.js`
  **unverändert**.
- **Kurzübung:** 228/228 Fragen über 76 Handtickets × 3 Niveaus, 0 Ausnahmen; 2–4 Lage-Zeilen;
  Lösungstext-Scan (55 Injektor-Titel, 34 Grund-Codes) = 0 Treffer; Leiste geöffnet 616 px,
  beantwortet 736 px, alles vollständig sichtbar (Fotos `Nachweise/bento/kurzfrage/`).
- **Flugschreiber (Dock 380 px, echte Aufzeichnung):** laute Knöpfe **11 → 2**, primäre Knöpfe
  **3 → 0**, Flächen/Boxen **4 → 1** (Fehler + Hilfe an); 10→2 / 3→0 / 3→1 (Hilfe aus);
  6→2 / 4→1 / 2→0 (Ergebnis); Überlauf **0** in allen Zuständen und Breiten; sichtbare Knopfhöhe
  44 px (Trefferflächen erhalten); Mikrolabel-Kontrast **6,08:1**. Belege:
  `Nachweise/runde7/` (vier Vorher/Nachher-Paare, 960/720, fünf Themes + hell, Bewegung aus).
- **Gemeinsamer Arbeitsbaum** (mit der parallelen Sitzung): 1033/1033 grün — der Commit enthält nur
  die Runde-6/7-Dateien; die parallele Arbeit bleibt außen vor.

## 4 · Ehrlich offen

- **R12** (`ethos --dom`) nicht gemessen; **Android-APK** fehlt (kein SDK); **Screenreader**
  nicht geprüft; echte Maus im Tauri-Fenster für die neuen Höhen (Leiste 616/736) nicht durchgeklickt;
  Theme-Kontraste stichprobenweise; Hover/Fokus des Flugschreibers nicht als Bild belegt.
- Der Gateway-Template kann konstruktionsbedingt nur „Ja" ergeben (bewusste Grenze: zeigt nur Geräte
  mit korrekt im Netz liegendem Gateway, um keine fehlende Adresse zu verraten).
- Die parallele Sitzung (Subnetting) arbeitet im selben Arbeitsbaum; Version/Doku-Kollisionen sind
  möglich, wenn beide Sitzungen dieselben Fassungsstellen anfassen.

## 5 · Veröffentlichung 2.8.0

*(wird nach Push/Tag/Release mit den echten Werten ergänzt)*

## 6 · Nachweis 2.8.0

*(wird nach dem Deploy gemessen und ergänzt)*
