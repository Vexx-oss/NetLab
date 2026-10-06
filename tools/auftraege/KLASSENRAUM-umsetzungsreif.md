DEIN BAUSTEIN: der **Klassenraum** — die Lehrer-/Schüler-Instanz als Hobby-Fassung („Novelty-Ebene").
Diese Fassung ersetzt `KLASSENRAUM.md` als Arbeitsgrundlage: derselbe Auftrag, aber jede offene Frage ist
entschieden und jede Zahl belegt. Es gilt zusätzlich `COMMON.md` (Regeln, Schichtordnung, Namensraum, Tests,
Bericht) und `AGENTS.md` (Verbote, Befehle, Zeilenenden).

**Die verbindliche Spezifikation:** [`docs/entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md`](../../docs/entwicklung/Klassenraum%20%E2%80%93%20Umsetzungsreife%20Spezifikation.md).
Dort stehen Vertrag, Zahlen und Belege; die vier Teil-Dokumente daneben (`A – Codec …`, `B – Oberfläche …`,
`C – Rust …`, `D – Prüfung …`) enthalten die Details und Messprotokolle. Lies die Endfassung **vollständig**,
bevor du die erste Zeile schreibst.

ZIEL IN EINEM SATZ: Eine Lehrkraft sagt einen 10 Zeichen kurzen Code an — und auf jedem Gerät entsteht
**derselbe** Auftrag, ohne Konto, ohne Server, ohne Netz. Danach sammelt sie die Ergebnis-Codes ein und sieht
eine Ampel.

WARUM DAS GEHT (nicht neu bauen): Aufträge sind deterministisch aus einem Seed gebaut
(`def.fuerSeed(seed)`, `Spiel.startNetz(def, seed)`, Selbstprüfung `Spiel.ticketGueltig`). Gemessen: derselbe
Code in zwei getrennten Prozessen ⇒ 12/12 identische Aufträge. Ein Code transportiert deshalb nur
**Sitzung + Auftrag + Variante + Prüfsumme**.

ABGRENZUNG: Hobby-Ebene heißt Vorführung, nicht Geschäft. Ausdrücklich NICHT: Konten, Anmeldung,
Passwörter, Serverpflicht, Bezahlung, Lizenzverwaltung, Mandantenfähigkeit, Marktplatz, Datenschutzkonzept,
Autorenwerkzeug, Fortschritts-Dashboards. Wer das will, liest
`docs/entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md` (Stufen 1–4).

## DATEIEN

**Neu (bauen.py nimmt neue Dateien im Schichtordner automatisch mit):**
- `src/spiel/klassenraum.js` — Codec, Prüfsumme, Kanonisierung, Sitzung, Ergebnis-Codes, Export/Import,
  Netzkennwert, eingefrorene Tabellen. Reine Rechnung, **kein DOM**, wirft nie.
- `src/ui/klassenraum.js` — zwei Ansichten (`klassenraum` = Lehrkraft, `mitarbeit` = Schülerin),
  Startseiten-Zeile, Ergebnis-Code nach der Abnahme, Server-Schalter.
- `src/stil/klassenraum.css` — Stil, Klassenpräfix `kl-`, **nur** Tokens aus `basis.css`.
- `tests/klassenraum.test.js` — die **40** Fälle aus `D – Prüfung, Abnahme und Reihenfolge.md` § 1.2.

**Additiv erlaubt:** `src/ui/app.js` (Ansicht registrieren) · `src/ui/start.js` · `src/spiel/zustand.js`
(nur der Store-Schlüssel `klassenraum`).
**Nur mit Freigabe des Nutzers:** vier Zeilen früher Ausstieg in `src/spiel/abnahme.js` — dann zählt ein
Klassenraum-Auftrag **nicht** als erledigt und zahlt keinen Lohn (Spezifikation § 7, L4). Ohne diese Freigabe
gilt der Ist-Zustand (Auftrag wird verbucht) und das wird im Bericht genannt.
**Sonst keine fremde Datei ändern.** Vorschläge für `docs/Architektur.md`/`docs/CHANGELOG.md` gehören in den
Bericht, nicht in die Dateien.

## VERTRAG (Kurzfassung — maßgeblich ist die Spezifikation)

```
Auftragscode  NL-XXXX-XX    immer 10 Zeichen
  20 Bit Nutzlast: sitzung 5 | art 1 (0=hand, 1=generiert) | index 6 | variante 8
  2 Prüfzeichen:   C1 = (1v₀+2v₁+3v₂+4v₃) mod 31 · C2 = (1v₀+3v₁+5v₂+7v₃) mod 32
Ergebnis-Code E-XXXX-XXX    immer 10 Zeichen
  25 Bit: sitzung 5 | platz 5 | sterne 4 (halbe Sterne) | versuche 2 | dauer 9 (10-s-Einheiten)
Alphabet      ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (kein I, O, 0, 1) · Groß/Klein und Striche egal
Seed          Startseed = variante + 1 (1..256); Kanonisierungsfenster 64; Rückfall auf die feste
              Fassung ist erlaubt und auf allen Geräten gleich
Tabellen      eingefroren als Literal: 58 Aufträge in Spiel.ticketReihe()-Reihenfolge,
              27 Fertigkeiten in DATEN.skills-Reihenfolge (24 tauglich) — nur anhängen
Speicher      store "klassenraum" (nicht der Spielstand!), Feld fassung: 1, Export
              {format:"netzwerk-labor/klassenraum", fassung, programm, zeit, sitzung}
Öffnen        Spiel.klassenraum.ausCode(code) → Spiel.instanzErstellen({ticketId|gen, seed,
              quelle:"klassenraum", ohneFlow:true}) → inst.klassenraum={sitzung,platz,code}
              → UI.spiel.oeffnen(inst.iid).  ohneFlow ist PFLICHT, Spiel.generiere ohne opts.stufe.
Abdruck       6 Zeichen, FNV-1a über kanonisch sortierte JSON-Abbildung von {v, geraete, kabel}
              (ohne netz.zustand) — in beiden Ansichten sichtbar, aus dem GELADENEN Netz
```

Die acht Funktionen aus `KLASSENRAUM.md` (Zeilen 26-35) bleiben **genau so**; dazu vier Zusatzfunktionen
(`netzkennwert`, `tauglicheFertigkeiten`, `platz`/`platzSetzen`, `plaetze`/`plaetzeSetzen`). Keine Funktion
wirft; Fehler kommen als `{fehler, grund}` (Klassen: `länge · zeichen · prüfziffer · bereich · auftrag ·
fassung · sitzung · abnahme · wahl · format`), `null` heißt „nichts eingetippt".

## STUFEN (jede einzeln vorführbar; A zuerst fertigstellen und melden)

**A · Verteilen.** Lehrkraft: Auftrag wählen (aus `DATEN.tickets` oder über Fertigkeit+Stufe), Sitzung
anlegen, Code groß und aus drei Metern lesbar zeigen (`font: 800 clamp(28px, 5vw, 118px)/1.05 var(--mono)`),
Kopierknopf. Schülerin: Eingabefeld „Auftragscode" auf der Startseite (Ansicht `heute`, **eine
untergeordnete Zeile**, kein zweiter Hauptknopf, kein `input[type=search]`) **und** in der Ansicht
`mitarbeit`, mit Tippfehler-Rückmeldung. Danach öffnet sich der Auftrag wie aus dem Postfach, Titel
„Klassenraum-Auftrag".

**B · Einsammeln.** Nach bestandener Abnahme zeigt das Spiel den Ergebnis-Code (dezent, kopierbar). Lehrkraft:
Eingabefeld für mehrere Codes (einzeln oder Block), Liste mit Platz, Sternen, Dauer, Fehlversuchen, oben die
**Ampel** (fertig / offen / Median-Dauer), Export/Import als Datei. Doppelte Codes zählen einmal. Die
Platzzahl (`plaetze`, 1..31) stellt die Lehrkraft ein — ohne sie zeigt die Ampel „Plätze nicht eingestellt".

**C · Live (optional).** C1: Server in der `.exe` (`shell/src-tauri/src/klassenraum.rs`, genau drei Stellen in
`main.rs`, **keine** Capability-Änderung nötig). C2: eigenständiges Binary `tools/klassenraum/` (gebaut und
gemessen: 322.560 B, `cargo test` 10/10, HTTP-Probe 20/20). Beide: **zwei** Wege
`GET /liste?auftrag=<Auftragscode>` und `POST /ergebnis` mit **genau** `{auftrag, code}` — der Server deutet
nichts, er transportiert nur Codes (Entscheidung des Leiters; der C2-Entwurf ist beim Einbau darauf
umzustellen). Port 47112 (Scan bis 47121), Bind `0.0.0.0`, Rumpf ≤ 4096 B, 5 s je Verbindung, 16 gleichzeitig,
Lager 4096, CORS `*` + Preflight + `Allow-Private-Network`. Standard **aus**, ehrlicher Firewall-Hinweis,
ohne Server **keine** Fehlermeldung.

**D · QR auf dem Beamer (in Rust).** Eigener, abhängigkeitsfreier Encoder (alphanumerisch, Version 1,
Stufe H), Rückgabe als SVG-Data-URI; Inhalt = **genau der Auftragscode**. Nur die Desktop-Fassung. Die Kiste
`qrcode` ist derzeit nicht holbar (`cargo fetch` scheitert) und wird nicht gebraucht.

## PRÜFEN (alles belegen, nichts behaupten)

| Befehl | Sollwert nach dem Einbau |
|---|---|
| `node tests/run.js` | **291/291 grün (36 Testdateien, 77 Module)** |
| `node tests/run.js --klassenraum` | **40/40** |
| `python tools/ethos.py` | GRUEN (Dateizahl 21 → 22 erlaubt) |
| `python tools/klassen.py` | **0** Klassen ohne CSS-Regel |
| `node tools/sim-stand.js` | unverändert |
| `python bauen.py` · `python tools/einfach.py` | 0 Außenverweise; `docs/index.html` = `Netzwerk-Labor.html` byte-gleich |
| `sh tools/test.sh --rauch` | **36/36** — die neue Startseiten-Zeile darf keinen Fall treffen |
| `python tools/menueprobe.py --datei android/bau/assets/index.html --lauf` | 5 Profile, 49 Kriterien, 0 verletzt |
| `python android/bauen.py` | 7 Schritte, GRUEN |

Dazu: die **fünf Vorführschritte** wirklich durchspielen (Einzeldatei `Netzwerk-Labor.html` per `file://`,
drei getrennte Edge-Profile, Netzkennwerte beider Schülerseiten wörtlich in den Bericht, Fotos nach
`Nachweise/Klassenraum/`). Telefon-Eingabe prüfen: `NL-…` und `nl…` ergeben denselben Auftrag. Sollte ein
Befehl in der Umgebung nicht laufen (Sandbox: `sh`/Edge), den Ersatzweg nennen und das offen als
„nicht gemessen" kennzeichnen — nie als bestanden ausgeben.

## BERICHT (wie COMMON.md)

Gebaute Dateien · tatsächliche öffentliche API · Code-Format mit Beispiel · was geprüft wurde (wie, mit
welchem Ergebnis) · die fünf Vorführschritte mit Netzkennwerten · bewusste Vereinfachungen · offene Punkte ·
Vorschläge für `Architektur.md`/`CHANGELOG.md` · **nicht Gemessenes**.
